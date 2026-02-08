import type { StateCreator } from 'zustand'
import Peer, { type DataConnection } from 'peerjs'
import type { MonsterSlice } from './monsterSlice'
import type { MonsterStatus } from '@/types/Monster'
import { CONNECTION } from '@/constants'

// Message validation types
interface PingMessage {
  type: 'ping'
}

interface PongMessage {
  type: 'pong'
}

interface ClientNameMessage {
  type: 'client-name'
  name: string
}

interface AttackMessage {
  type: 'attack'
  monsterId: string
}

type IncomingMessage = PingMessage | ClientNameMessage | AttackMessage
type OutgoingMessage = PongMessage

export type ClientConnection = {
  conn: DataConnection
  name: string
  lastActivity: number
  messageCount: number
  lastMessageReset: number
}

export type ConnectionSliceState = {
  peer: Peer | null
  peerId: string | null
  connections: ClientConnection[]
  isConnecting: boolean
  healthCheckInterval: number | null
  pingIntervalId: number | null
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
> = (set, get) => {
  const validateIncomingMessage = (data: unknown): data is IncomingMessage => {
    if (!data || typeof data !== 'object') return false
    const msg = data as Record<string, unknown>

    if (typeof msg.type !== 'string') return false

    switch (msg.type) {
      case 'ping':
        return true
      case 'client-name':
        return typeof msg.name === 'string' && msg.name.length <= 50
      case 'attack':
        return typeof msg.monsterId === 'string'
      default:
        return false
    }
  }

  const checkMessageSize = (data: unknown): boolean => {
    try {
      const size = JSON.stringify(data).length
      return size <= CONNECTION.MAX_MESSAGE_SIZE
    } catch {
      return false
    }
  }

  const checkRateLimit = (connection: ClientConnection): boolean => {
    const now = Date.now()
    // Reset counter every second
    if (now - connection.lastMessageReset >= 1000) {
      connection.messageCount = 0
      connection.lastMessageReset = now
    }

    connection.messageCount++
    return connection.messageCount <= CONNECTION.MAX_MESSAGES_PER_SECOND
  }

  const sendToConnection = (conn: DataConnection, message: OutgoingMessage): boolean => {
    if (!conn.open) return false

    try {
      conn.send(message)
      return true
    } catch (error) {
      console.error('Error sending message to client:', error)
      return false
    }
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

  return {
    peer: null,
    peerId: null,
    connections: [],
    isConnecting: false,
    healthCheckInterval: null,
    pingIntervalId: null,

    initializeHost: () => {
      if (get().peer) return

      set({ isConnecting: true })

      // Try to reconnect with stored peerId if available
      const storedPeerId = get().peerId
      const peer = storedPeerId ? new Peer(storedPeerId) : new Peer()

      peer.on('open', (id) => {
        set({ peerId: id, isConnecting: false })

        // Start bidirectional health checks
        startPingInterval()

        // Start health check interval after peer is ready
        const healthInterval = window.setInterval(() => {
          const now = Date.now()
          set((state) => ({
            connections: state.connections.filter((c) => {
              const isAlive = now - c.lastActivity < CONNECTION.CONNECTION_TIMEOUT_MS
              if (!isAlive) {
                console.log('Removing inactive connection:', c.name)
                c.conn.close()
              }
              return isAlive
            }),
          }))
        }, CONNECTION.HEALTH_CHECK_INTERVAL_MS)

        set({ healthCheckInterval: healthInterval })
      })

      peer.on('connection', (conn) => {
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
          } else {
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
              // Handle attack from client - highlight the monster
              const monsterSlice = get() as unknown as MonsterSlice
              if (monsterSlice.highlightMonster && data.monsterId) {
                monsterSlice.highlightMonster(data.monsterId)
              }
            } else if (data.type === 'ping') {
              // Respond to ping with pong
              sendToConnection(conn, { type: 'pong' })
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

        // If the stored ID is unavailable, try again with a new ID
        if (err.type === 'unavailable-id') {
          console.log('Stored peer ID unavailable, requesting new ID')
          peer.destroy()
          set({ peer: null, peerId: null })

          // Retry with a new ID
          const newPeer = new Peer()

          newPeer.on('open', (id) => {
            set({ peerId: id, isConnecting: false })
            startPingInterval()

            const healthInterval = window.setInterval(() => {
              const now = Date.now()
              set((state) => ({
                connections: state.connections.filter((c) => {
                  const isAlive = now - c.lastActivity < CONNECTION.CONNECTION_TIMEOUT_MS
                  if (!isAlive) {
                    console.log('Removing inactive connection:', c.name)
                    c.conn.close()
                  }
                  return isAlive
                }),
              }))
            }, CONNECTION.HEALTH_CHECK_INTERVAL_MS)

            set({ healthCheckInterval: healthInterval })
          })

          // Copy connection handler to new peer
          newPeer.on('connection', peer.listeners('connection')[0] as any)
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
        peerId: null, // Clear stored peerId on manual disconnect
        connections: [],
        healthCheckInterval: null,
        pingIntervalId: null,
      })
    },
  }
}
