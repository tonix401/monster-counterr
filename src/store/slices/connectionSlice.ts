import type { StateCreator } from 'zustand'
import Peer, { type DataConnection } from 'peerjs'
import type { MonsterStatus } from '@/types/Monster'
import { CONNECTION } from '@/constants'
import type { MonsterSlice } from './monsterSlice'
import type { NotificationSlice } from './notificationSlice'

// Message types
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

export type ConnectionSlice = {
  peer: Peer | null
  peerId: string | null
  connections: ClientConnection[]
  isConnecting: boolean
  healthCheckInterval: number | null
  pingIntervalId: number | null
  initializeHost: () => void
  broadcastMonsters: () => void
  disconnectAll: () => void
}

type ConnectionDeps = Pick<MonsterSlice, 'monsters' | 'highlightMonster'> &
  Pick<NotificationSlice, 'notify'>

export const createConnectionSlice: StateCreator<
  ConnectionSlice & ConnectionDeps,
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

  const startHealthCheck = (): void => {
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
