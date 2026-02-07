import type { StateCreator } from 'zustand'
import Peer, { type DataConnection } from 'peerjs'
import type { MonsterSlice } from './monsterSlice'
import type { MonsterStatus } from '@/types/Monster'

export type ClientConnection = {
  conn: DataConnection
  name: string
  lastActivity: number
}

export type ConnectionSliceState = {
  peer: Peer | null
  peerId: string | null
  connections: ClientConnection[]
  isConnecting: boolean
  healthCheckInterval: number | null
}

export type ConnectionSliceActions = {
  initializeHost: () => void
  broadcastMonsters: () => void
  disconnectAll: () => void
}

export type ConnectionSlice = ConnectionSliceState & ConnectionSliceActions

export const createConnectionSlice: StateCreator<
  ConnectionSlice & MonsterSlice,
  [],
  [],
  ConnectionSlice
> = (set, get) => ({
  peer: null,
  peerId: null,
  connections: [],
  isConnecting: false,
  healthCheckInterval: null,

  initializeHost: () => {
    if (get().peer) return

    set({ isConnecting: true })
    const peer = new Peer()

    peer.on('open', (id) => {
      set({ peerId: id, isConnecting: false })

      // Start health check interval after peer is ready
      const healthInterval = window.setInterval(() => {
        const now = Date.now()
        const timeout = 35000 // 35 seconds (ping interval is 20s)
        set((state) => ({
          connections: state.connections.filter((c) => {
            const isAlive = now - c.lastActivity < timeout
            if (!isAlive) {
              console.log('Removing dead connection:', c.name)
              c.conn.close()
            }
            return isAlive
          }),
        }))
      }, 10000) // Check every 10 seconds

      set({ healthCheckInterval: healthInterval })
    })

    peer.on('connection', (conn) => {
      conn.on('open', () => {
        console.log('Client connected:', conn.peer)
      })

      conn.on('data', (data: any) => {
        const now = Date.now()

        if (data.type === 'client-name') {
          // Check if connection already exists
          const existingConn = get().connections.find((c) => c.conn.peer === conn.peer)
          if (!existingConn) {
            set((state) => ({
              connections: [
                ...state.connections,
                { conn, name: data.name || 'Unknown Client', lastActivity: now },
              ],
            }))
            // Send initial state
            get().broadcastMonsters()
          }
        } else {
          // Update lastActivity for any other message type
          set((state) => ({
            connections: state.connections.map((c) =>
              c.conn.peer === conn.peer ? { ...c, lastActivity: now } : c
            ),
          }))

          if (data.type === 'attack') {
            // Handle attack from client - highlight the monster
            const highlightMonster = (get() as any).highlightMonster
            if (highlightMonster && data.monsterId) {
              highlightMonster(data.monsterId)
            }
          } else if (data.type === 'ping') {
            // Respond to ping with pong
            if (conn.open) {
              conn.send({ type: 'pong' })
            }
          }
        }
      })

      conn.on('close', () => {
        set((state) => ({
          connections: state.connections.filter((c) => c.conn.peer !== conn.peer),
        }))
      })

      conn.on('error', () => {
        set((state) => ({
          connections: state.connections.filter((c) => c.conn.peer !== conn.peer),
        }))
      })
    })

    peer.on('error', (err) => {
      console.error('PeerJS error:', err)
      set({ isConnecting: false })
    })

    set({ peer })
  },

  broadcastMonsters: () => {
    const { monsters, connections } = get()
    if (connections.length === 0) return

    const data = {
      enemies: monsters
        .filter((m) => !m.isHidden)
        .map((m) => {
          let status: MonsterStatus
          if (m.hp <= 0) {
            status = 'down'
          } else if (m.hp <= m.maxhp / 4) {
            status = 'badly-injured'
          } else if (m.hp <= m.maxhp / 2) {
            status = 'injured'
          } else {
            status = 'healthy'
          }
          return {
            id: m.id,
            name: m.name + (m.number > 0 ? ` ${m.number}` : ''),
            status: status,
            conditions: m.conditions,
          }
        }),
    }

    connections.forEach(({ conn }) => {
      if (conn.open) {
        conn.send(data)
      }
    })
  },

  disconnectAll: () => {
    const { peer, connections, healthCheckInterval } = get()
    connections.forEach(({ conn }) => conn.close())
    peer?.destroy()
    if (healthCheckInterval) {
      window.clearInterval(healthCheckInterval)
    }
    set({ peer: null, peerId: null, connections: [], healthCheckInterval: null })
  },
})
