import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import Peer, { type DataConnection } from 'peerjs'
import type { Monster } from '@/types/Monster'
import type { Settings } from '@/types/Settings'
import { SETTING_SCHEMA } from '@/types/Settings'
import { CONDITIONS } from '@/constants'
import type { Notification, ClientConnection } from '@/store/types'
import type { MonsterCounterStore } from '@/store/types'
import { temporal, type TemporalState, type TemporalActions } from '@/store/middleware/temporal'
import { STORAGE_KEYS, ANIMATION_DURATION, BASE_URL, CONNECTION } from '@/constants'
import * as monsterHelpers from '@/store/helpers/monsters/monsterHelpers'
import * as connectionHelpers from '@/store/helpers/connections/connectionHelpers'
import * as dataHelpers from '@/store/helpers/data/dataHelpers'
import * as localizationHelpers from '@/store/helpers/localization/localizationHelpers'

type StoreWithTemporal = MonsterCounterStore & TemporalState<MonsterCounterStore> & TemporalActions

/**
 * Main Monster Counter Store
 * Consolidated state and actions for tight, consistent typing
 */
export const useMonsterStore = create<StoreWithTemporal>()(
  persist(
    temporal(
      (set, get, api) => {
        // ==================== CONNECTION HANDLERS ====================

        const validateIncomingMessage = (data: unknown): data is connectionHelpers.IncomingMessage => {
          return connectionHelpers.validateIncomingMessage(data)
        }

        const checkMessageSize = (data: unknown): boolean => {
          return connectionHelpers.checkMessageSize(data)
        }

        const checkRateLimit = (connection: ClientConnection): boolean => {
          return connectionHelpers.checkRateLimit(connection)
        }

        const sendToConnection = (conn: DataConnection, message: connectionHelpers.OutgoingMessage): boolean => {
          return connectionHelpers.sendToConnection(conn, message)
        }

        const startPingInterval = (): void => {
          const state = get()
          if (state.pingIntervalId) {
            window.clearInterval(state.pingIntervalId)
          }

          const intervalId = window.setInterval(() => {
            const connections = get().connections
            connections.forEach(({ conn }) => {
              sendToConnection(conn, { type: 'pong' })
            })
          }, CONNECTION.PING_INTERVAL_MS)

          set({ pingIntervalId: intervalId })
        }

        const startHealthCheck = (): void => {
          const healthInterval = window.setInterval(() => {
            set((state) => ({
              connections: connectionHelpers.filterActiveConnections(state.connections),
            }))
          }, CONNECTION.HEALTH_CHECK_INTERVAL_MS)

          set({ healthCheckInterval: healthInterval })
        }

        const removeConnection = (peerId: string): void => {
          set((state) => ({
            connections: state.connections.filter((c) => c.conn.peer !== peerId),
          }))
        }

        const handlePeerOpen = (id: string): void => {
          set({ peerId: id, isConnecting: false })
          startPingInterval()
          startHealthCheck()
        }

        const handleConnection = (conn: DataConnection): void => {
          // Check connection limit
          if (get().connections.length >= CONNECTION.MAX_CONNECTIONS) {
            console.warn('Connection limit reached, rejecting connection')
            conn.close()
            return
          }

          conn.on('open', () => {
            console.log('Client connected:', conn.peer)
          })

          conn.on('data', (data: unknown) => {
            const now = Date.now()

            // Validate message size
            if (!checkMessageSize(data)) {
              console.error('Message too large from client:', conn.peer)
              return
            }

            // Validate message structure
            if (!validateIncomingMessage(data)) {
              console.error('Invalid message from client:', conn.peer)
              return
            }

            if (data.type === 'client-name') {
              // Check if connection already exists
              const existingConn = get().connections.find((c) => c.conn.peer === conn.peer)
              if (!existingConn) {
                get().notify({
                  type: 'info',
                  message: data.name || 'Unknown Client',
                })
                set((state) => ({
                  connections: [
                    ...state.connections,
                    {
                      conn,
                      name: data.name || 'Unknown Client',
                      lastActivity: now,
                      messageCount: 0,
                      lastMessageReset: now,
                    },
                  ],
                }))
                // Send initial state
                get().broadcastMonsters()
              }
              return
            }

            // Find and check rate limit for this connection
            const connection = get().connections.find((c) => c.conn.peer === conn.peer)
            if (!connection) return

            if (!checkRateLimit(connection)) {
              console.warn('Rate limit exceeded for client:', connection.name)
              return
            }

            // Update lastActivity
            set((state) => ({
              connections: state.connections.map((c) =>
                c.conn.peer === conn.peer ? { ...c, lastActivity: now } : c
              ),
            }))

            if (data.type === 'attack') {
              get().highlightMonster(data.monsterId)
            } else if (data.type === 'ping') {
              sendToConnection(conn, { type: 'pong' })
            }
          })

          conn.on('close', () => removeConnection(conn.peer))
          conn.on('error', () => removeConnection(conn.peer))
        }

        // ==================== STORE DEFINITION ====================

        return {
          // ========== INITIAL STATE ==========

          // Loading state
          isLoading: false,

          // Monster management
          monsters: [],
          monsterIndex: {},
          source: 'all',
          highlightedMonsterId: null,

          // Settings
          settings: {
            showStatus: SETTING_SCHEMA.showStatus.default,
            showHealth: SETTING_SCHEMA.showHealth.default,
            showConditions: SETTING_SCHEMA.showConditions.default,
            showChangeHp: SETTING_SCHEMA.showChangeHp.default,
            autoRemoveDead: SETTING_SCHEMA.autoRemoveDead.default,
            showXpCounter: SETTING_SCHEMA.showXpCounter.default,
            showQuickActions: SETTING_SCHEMA.showQuickActions.default,
          },

          // XP tracking
          xp: 0,

          // Conditions
          conditions: [...CONDITIONS],

          // Localization
          terms: {},
          language: 'en',
          availableLanguages: [{ key: 'en', name: 'English' }],

          // Notifications
          queue: [],

          // Data management
          exportSettings: {
            includeIndex: true,
            includeDetails: true,
            includeMonsters: true,
            includeSettings: true,
            includeCurrentXp: true,
            minimizeJson: true,
          },

          // Connections
          peer: null,
          peerId: null,
          connections: [],
          isConnecting: false,
          healthCheckInterval: null,
          pingIntervalId: null,

          // ========== INITIALIZATION & LOADING ==========

          initialize: async () => {
            set({ isLoading: true })
            await get().loadAvailableLanguages()
            await get().loadLanguagePack(get().language)
            set({ isLoading: false })
            await get().getMonsterIndex()
          },

          setLoading: (loading: boolean) => {
            set({ isLoading: loading })
          },

          loadLanguagePack: async (language: string) => {
            const languagePack = await localizationHelpers.fetchLanguagePack(language)
            if (languagePack) {
              set(() => ({
                terms: languagePack.terms,
                language: languagePack.lang,
              }))
            }
          },

          loadAvailableLanguages: async () => {
            const availableLanguages = await localizationHelpers.fetchAvailableLanguages()
            set(() => ({
              availableLanguages,
            }))
          },

          getMonsterIndex: async () => {
            const monsterIndex = await monsterHelpers.fetchMonsterIndex(BASE_URL)
            set({ monsterIndex })
          },

          // ========== MONSTER CRUD OPERATIONS ==========

          addMonster: (
            name: string,
            index: string | undefined,
            hp: number,
            xp: number,
            amount: number = 1
          ): Monster[] => {
            const newMonsters = monsterHelpers.createMonsters(name, index, hp, xp, amount)

            set((state) => ({
              monsters: [...state.monsters, ...newMonsters],
            }))
            return newMonsters
          },

          removeMonster: (monsterId: string) => {
            set((state) => ({
              monsters: state.monsters.filter((monster) => monster.id !== monsterId),
            }))
          },

          removeDead: () => {
            set((state) => ({
              monsters: monsterHelpers.filterOutDead(state.monsters),
            }))
          },

          clearMonsters: () => {
            set({ monsters: [] })
          },

          updateMonsterHealth: (monsterId: string, amount: number) => {
            set((state) => {
              const { monsters, gainedXp } = monsterHelpers.updateMonsterHealth(
                state.monsters,
                monsterId,
                amount,
                state.settings
              )
              return { monsters, xp: state.xp + gainedXp }
            })
          },

          // ========== MONSTER CONDITIONS ==========

          addMonsterCondition: (monsterId: string, condition: string) => {
            set((state) => ({
              monsters: state.monsters.map((monster) =>
                monster.id === monsterId
                  ? monsterHelpers.addConditionToMonster(monster, condition)
                  : monster
              ),
            }))
          },

          removeMonsterCondition: (monsterId: string, condition: string) => {
            set((state) => ({
              monsters: state.monsters.map((monster) =>
                monster.id === monsterId
                  ? monsterHelpers.removeConditionFromMonster(monster, condition)
                  : monster
              ),
            }))
          },

          // ========== MONSTER UI INTERACTIONS ==========

          highlightMonster: (monsterId: string) => {
            set({ highlightedMonsterId: monsterId })
            setTimeout(() => set({ highlightedMonsterId: null }), 2000)
          },

          toggleHideMonster: (monsterId: string, message?: string) => {
            const monster = get().monsters.find((m) => m.id === monsterId)
            if (!monster) return
            if (message) {
              get().notify({ type: 'info', message })
            }
            set((state) => ({
              monsters: state.monsters.map((monster) =>
                monster.id === monsterId
                  ? monsterHelpers.toggleMonsterHidden(monster)
                  : monster
              ),
            }))
          },

          setSource: (source: string | 'all') => {
            set({ source })
          },

          // ========== SETTINGS MANAGEMENT ==========

          getSetting: (key: keyof Settings): boolean | string | null => {
            return get().settings[key]
          },

          getSettingName: (key: keyof Settings): string => {
            if (!(key in SETTING_SCHEMA)) {
              throw new Error(`Setting "${key}" does not exist.`)
            }
            return SETTING_SCHEMA[key].name
          },

          setSetting: (key: keyof Settings, value: boolean | string | null) => {
            set((state) => ({
              settings: { ...state.settings, [key]: value },
            }))
          },

          // ========== XP MANAGEMENT ==========

          updateXp: (amount: number) => {
            set((state) => ({ xp: state.xp + amount }))
          },

          resetXp: () => {
            set({ xp: 0 })
          },

          // ========== CONDITIONS (GLOBAL LIST) ==========

          addCondition: (condition: string) => {
            set((state) => ({ conditions: [...state.conditions, condition] }))
          },

          removeCondition: (condition: string) => {
            set((state) => ({
              conditions: state.conditions.filter((c) => c !== condition),
            }))
          },

          resetConditions: () => {
            set({ conditions: [...CONDITIONS] })
          },

          // ========== LOCALIZATION ==========

          getTerm: (key: string, params?: Record<string, string | number>): string => {
            return localizationHelpers.resolveTerm(key, get().terms, params)
          },

          setLanguage: async (language: string) => {
            const state = get()
            if (state.language === language) {
              return
            }
            await get().loadLanguagePack(language)
          },

          // ========== NOTIFICATIONS ==========

          notify: (notification: Notification) => {
            notification.id = crypto.randomUUID()
            set((state) => ({
              queue: [...state.queue, notification],
            }))
          },

          removeNotification: (id: string) => {
            set((state) => ({
              queue: state.queue.filter((n) => n.id !== id),
            }))
          },

          // ========== DATA MANAGEMENT ==========

          setExportSetting: (key, value: boolean) => {
            set((state) => ({
              exportSettings: {
                ...state.exportSettings,
                [key]: value,
              },
            }))
          },

          exportData: () => {
            const { monsters, xp, settings, exportSettings } = get()
            const data = dataHelpers.buildSaveData(
              monsters,
              xp,
              settings,
              exportSettings.includeSettings,
              exportSettings.includeCurrentXp,
              exportSettings.includeMonsters
            )
            const dataJson = dataHelpers.serializeSaveData(data, exportSettings.minimizeJson)
            dataHelpers.downloadFile(dataJson)
          },

          importData: (data: unknown): boolean => {
            if (!dataHelpers.isSaveData(data)) {
              console.error('Invalid save data format')
              return false
            }

            try {
              const result = dataHelpers.processSaveData(data)
              const newState: Partial<MonsterCounterStore> = {}
              if (result.monsters !== undefined) newState.monsters = result.monsters
              if (result.xp !== undefined) newState.xp = result.xp
              if (result.settings !== undefined) newState.settings = result.settings
              set(newState)
              return true
            } catch (error) {
              console.error('Failed to load save file:', error)
              get().notify({
                message: error instanceof Error ? error.message : 'Unknown error',
                type: 'error',
              })
              return false
            }
          },

          // ========== CONNECTIONS (P2P NETWORKING) ==========

          initializeHost: () => {
            if (get().peer) return

            set({ isConnecting: true })

            // Try to reconnect with stored peerId if available
            const storedPeerId = get().peerId
            const peer = storedPeerId ? new Peer(storedPeerId) : new Peer()

            peer.on('open', handlePeerOpen)
            peer.on('connection', handleConnection)

            peer.on('error', (err) => {
              console.error('PeerJS error:', err)

              // If the stored ID is unavailable, try again with a new ID
              if (err.type === 'unavailable-id') {
                console.log('Stored peer ID unavailable, requesting new ID')
                peer.destroy()
                set({ peer: null, peerId: null })

                const newPeer = new Peer()
                newPeer.on('open', handlePeerOpen)
                newPeer.on('connection', handleConnection)
                newPeer.on('error', (newErr) => {
                  console.error('PeerJS error:', newErr)
                  set({ isConnecting: false })
                })

                set({ peer: newPeer })
              } else {
                set({ isConnecting: false })
              }
            })

            set({ peer })
          },

          broadcastMonsters: () => {
            const { monsters, connections } = get()
            if (connections.length === 0) return

            const payload = connectionHelpers.buildBroadcastPayload(monsters)
            connectionHelpers.broadcastToConnections(connections, payload)
          },

          disconnectAll: () => {
            const { peer, connections, healthCheckInterval, pingIntervalId } = get()
            connections.forEach(({ conn }) => conn.close())
            peer?.destroy()
            if (healthCheckInterval) {
              window.clearInterval(healthCheckInterval)
            }
            if (pingIntervalId) {
              window.clearInterval(pingIntervalId)
            }
            set({
              peer: null,
              peerId: null,
              connections: [],
              healthCheckInterval: null,
              pingIntervalId: null,
            })
          },

          // ========== COMPLEX ACTIONS ==========

          killMonster: (monsterId: string) => {
            const state = get()
            const monster = state.monsters.find((m: Monster) => m.id === monsterId)
            if (!monster) return
            state.updateMonsterHealth(monsterId, -monster.hp)
          },

          killAllMonsters: () => {
            const state = get()
            const monsters = state.monsters
            const killMonster = state.killMonster
            const length = monsters.length

            monsters.forEach((monster: Monster, index: number) => {
              const delay: number =
                length > 5 ? Math.round((index * ANIMATION_DURATION.KILL_ALL_DELAY) / length) : 0
              setTimeout(() => {
                killMonster(monster.id)
              }, delay)
            })
          },

          getOnDeathCallback: () => {
            return (monster: Monster) => {
              const state = get()
              state.updateXp(monster.maxhp)
            }
          },
        }
      },
      {
        limit: 50,
        partialize: (state) => ({
          monsters: state.monsters,
          settings: state.settings,
          language: state.language,
          xp: state.xp,
        }),
      }
    ),
    {
      name: STORAGE_KEYS.MONSTER_COUNTER,
      partialize: (state) => ({
        monsters: state.monsters,
        settings: state.settings,
        language: state.language,
        source: state.source,
        xp: state.xp,
        peerId: state.peerId,
      }),
    }
  )
)

// ==================== AUTO-BROADCAST ON MONSTER CHANGES ====================

useMonsterStore.subscribe((state, prevState) => {
  if (state.monsters !== prevState.monsters && state.broadcastMonsters) {
    state.broadcastMonsters()
  }
})

// ==================== OPTIMIZED SELECTORS ====================

export const useMonsters = (): Monster[] => useMonsterStore((state) => state.monsters)
export const useSettings = (): Settings =>
  useMonsterStore((state) => state.settings)
export const useXp = (): number => useMonsterStore((state) => state.xp)
export const useIsLoading = (): boolean => useMonsterStore((state) => state.isLoading)
export const useCanUndo = (): boolean => useMonsterStore((state) => state.canUndo())
export const useCanRedo = (): boolean => useMonsterStore((state) => state.canRedo())
export const useConditions = (): string[] => useMonsterStore((state) => state.conditions)
export const useLanguage = (): string => useMonsterStore((state) => state.language)
export const useSetLanguage = (): ((language: string) => Promise<void>) =>
  useMonsterStore((state) => state.setLanguage)
export const useLoadLanguagePack = (): ((language: string) => Promise<void>) =>
  useMonsterStore((state) => state.loadLanguagePack)
export const useAvailableLanguages = (): { key: string; name: string }[] =>
  useMonsterStore((state) => state.availableLanguages)
export const useTerm = (): ((key: string, params?: Record<string, string | number>) => string) => {
  useMonsterStore((state) => state.language) // for rerenders on language change
  return useMonsterStore((state) => state.getTerm)
}
export const useSource = (): string | 'all' => useMonsterStore((state) => state.source)
export const useSetSource = (): ((src: string) => void) =>
  useMonsterStore((state) => state.setSource)
export const useNotifications = (): Notification[] =>
  useMonsterStore((state) => state.queue)
export const useNotify = () => useMonsterStore((state) => state.notify)
export const useRemoveNotification = () => useMonsterStore((state) => state.removeNotification)
export const usePeerId = (): string | null => useMonsterStore((state) => state.peerId)
export const useConnections = (): ClientConnection[] =>
  useMonsterStore((state) => state.connections)
export const useInitializeHost = (): (() => void) =>
  useMonsterStore((state) => state.initializeHost)
export const useIsConnecting = (): boolean => useMonsterStore((state) => state.isConnecting)
