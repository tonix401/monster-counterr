import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Monster } from '@/types/Monster'
import { createMonsterSlice, type MonsterSlice } from '@/store/slices/monsterSlice'
import { createSettingsSlice, type SettingsSlice } from '@/store/slices/settingsSlice'
import { createXpSlice, type XpSlice } from '@/store/slices/xpSlice'
import {
  createDataManagementSlice,
  type DataManagementSlice,
} from '@/store/slices/dataManagementSlice'
import { temporal, type TemporalState, type TemporalActions } from '@/store/middleware/temporal'
import { STORAGE_KEYS, ANIMATION_DURATION, BASE_URL } from '@/constants'
import { createConditionsSlice, type ConditionsSlice } from './slices/conditionsSlice'
import { createTermSlice, type TermSlice } from './slices/termSlice'
import { createNotificationSlice, type NotificationSlice } from './slices/notificationSlice'
import { createConnectionSlice, type ConnectionSlice } from './slices/connectionSlice'

type MonsterCounterCoreState = MonsterSlice &
  SettingsSlice &
  XpSlice &
  DataManagementSlice &
  ConditionsSlice &
  NotificationSlice &
  TermSlice &
  ConnectionSlice & {
    isLoading: boolean

    // Complex Actions
    killMonster: (monsterId: string) => void
    killAllMonsters: () => void
    getOnDeathCallback: () => (monster: Monster) => void

    // Initialization
    initialize: () => Promise<void>
    setLoading: (loading: boolean) => void
    loadLanguagePack: (language: string) => Promise<void>
    loadAvailableLanguages: () => Promise<void>
  }

type MonsterCounterState = MonsterCounterCoreState &
  TemporalState<MonsterCounterCoreState> &
  TemporalActions

export const useMonsterStore = create<MonsterCounterState>()(
  persist(
    temporal(
      (set, get, api) =>
        ({
          // Initial State
          isLoading: false,

          // Slices
          ...createMonsterSlice(set, get, api),
          ...createSettingsSlice(set, get, api),
          ...createXpSlice(set, get, api),
          ...createDataManagementSlice(set, get, api),
          ...createConditionsSlice(set, get, api),
          ...createTermSlice(set, get, api),
          ...createNotificationSlice(set, get, api),
          ...createConnectionSlice(set, get, api),

          // Complex Actions (combine multiple slices)
          killMonster: (monsterId: string): void => {
            const state = get()
            const monster = state.monsters.find((m: Monster) => m.id === monsterId)
            if (!monster) return
            state.updateMonsterHealth(monsterId, -monster.hp)
          },

          killAllMonsters: (): void => {
            const state = get()
            const monsters = state.monsters
            const killMonster = state.killMonster
            const length = monsters.length

            monsters.forEach((monster: Monster, index: number): void => {
              const delay: number =
                length > 5 ? Math.round((index * ANIMATION_DURATION.KILL_ALL_DELAY) / length) : 0
              setTimeout((): void => {
                killMonster(monster.id)
              }, delay)
            })
          },

          getOnDeathCallback: () => {
            return (monster: Monster): void => {
              const state = get()
              state.updateXp(monster.maxhp)
            }
          },

          // Initialization
          initialize: async (): Promise<void> => {
            set({ isLoading: true })
            await get().loadAvailableLanguages()
            await get().loadLanguagePack(get().language)
            set({ isLoading: false })
            get().getMonsterIndex()

            // Auto-broadcast monsters state to connections
            api.subscribe((state, prevState) => {
              if (state.monsters !== prevState.monsters && state.broadcastMonsters) {
                state.broadcastMonsters()
              }
            })
          },

          setLoading: (loading: boolean): void => {
            set({ isLoading: loading })
          },

          loadLanguagePack: async (language: string): Promise<void> => {
            try {
              const response = await fetch(`${BASE_URL}/locales/${language}.json`)

              if (!response.ok) {
                throw new Error(
                  `Failed to load language pack for "${language}", ${response.status} ${response.statusText}`
                )
              }

              const languagePack = await response.json()

              set(() => ({
                terms: languagePack.terms,
                language: languagePack.lang,
              }))
            } catch (error) {
              console.error(`Error loading language pack for "${language}":`, error)
              console.warn(`Falling back to term keys for display.`)
            }
          },

          loadAvailableLanguages: async (): Promise<void> => {
            try {
              const response = await fetch(`${BASE_URL}/locales/locales.json`)

              if (!response.ok) {
                throw new Error(
                  `Failed to load available languages, ${response.status} ${response.statusText}`
                )
              }

              const availableLanguages = await response.json()

              set(() => ({
                availableLanguages,
              }))
            } catch (error) {
              console.error('Error loading available languages:', error)
              set(() => ({
                availableLanguages: [{ key: 'en', name: 'English' }],
              }))
            }
          },
        }) as MonsterCounterCoreState,
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
      }),
    }
  )
)

// Selectors for optimized subscriptions
export const useMonsters = (): Monster[] => useMonsterStore((state) => state.monsters)
export const useSettings = (): SettingsSlice['settings'] =>
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

export const useTerm = (): ((key: string) => string) => {
  useMonsterStore((state) => state.language) // for rerenders on language change
  return useMonsterStore((state) => state.getTerm)
}

export const useSource = (): string | null => useMonsterStore((state) => state.source)
export const useSetSource = (): ((src: string | null) => void) =>
  useMonsterStore((state) => state.setSource)

export const useNotifications = (): NotificationSlice['queue'] =>
  useMonsterStore((state) => state.queue)
export const useNotify = (): NotificationSlice['notify'] => useMonsterStore((state) => state.notify)
export const useRemoveNotification = (): NotificationSlice['removeNotification'] =>
  useMonsterStore((state) => state.removeNotification)

export const usePeerId = (): string | null => useMonsterStore((state) => state.peerId)
export const useConnections = (): ConnectionSlice['connections'] =>
  useMonsterStore((state) => state.connections)
export const useInitializeHost = (): (() => void) =>
  useMonsterStore((state) => state.initializeHost)
export const useIsConnecting = (): boolean => useMonsterStore((state) => state.isConnecting)
