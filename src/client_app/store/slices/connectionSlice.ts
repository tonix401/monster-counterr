import type { StateCreator } from 'zustand'
import type { ClientStore } from '../ClientStore'
import { Peer, type DataConnection } from 'peerjs'
import type { MonsterStatus } from '@/types/Monster'
import { CONNECTION } from '@/constants'

export interface Enemy {
  id: string
  name: string
  status: MonsterStatus
  conditions: string[]
}

export interface EncounterData {
  enemies: Enemy[]
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error' | 'name-entry'

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

type OutgoingMessage = PingMessage | PongMessage | ClientNameMessage | AttackMessage

export type ConnectionSlice = {
  peer: Peer | null
  peerId: string | null
  connection: DataConnection | null
  connectionStatus: ConnectionStatus
  error: string | null
  data: EncounterData | null
  clientName: string
  hostId: string | null
  setClientName: (name: string) => void
  setHostId: (hostId: string | null) => void
  connectToHost: () => void
  disconnect: () => void
  sendAttack: (monsterId: string) => void
}

export const createConnectionSlice: StateCreator<ClientStore, [], [], ConnectionSlice> = (
  set,
  get,
  _api
) => {
  // Track cleanup state to prevent memory leaks and race conditions
  const cleanupState = {
    pingIntervalId: null as number | null,
    healthCheckIntervalId: null as number | null,
    reconnectTimeoutId: null as number | null,
    lastPongTime: Date.now(),
    reconnectAttempts: 0,
    messageCount: 0,
    lastMessageReset: Date.now(),
    isReconnecting: false,
  }

  const clearPingInterval = (): void => {
    if (cleanupState.pingIntervalId) {
      window.clearInterval(cleanupState.pingIntervalId)
      cleanupState.pingIntervalId = null
    }
  }

  const clearHealthCheckInterval = (): void => {
    if (cleanupState.healthCheckIntervalId) {
      window.clearInterval(cleanupState.healthCheckIntervalId)
      cleanupState.healthCheckIntervalId = null
    }
  }

  const clearReconnectTimeout = (): void => {
    if (cleanupState.reconnectTimeoutId) {
      window.clearTimeout(cleanupState.reconnectTimeoutId)
      cleanupState.reconnectTimeoutId = null
    }
  }

  const cleanupConnection = (): void => {
    clearPingInterval()
    clearHealthCheckInterval()
    clearReconnectTimeout()

    const currentConnection = get().connection
    if (currentConnection) {
      try {
        currentConnection.close()
      } catch (error) {
        console.error('Error closing connection:', error)
      }
    }

    const currentPeer = get().peer
    if (currentPeer) {
      try {
        currentPeer.destroy()
      } catch (error) {
        console.error('Error destroying peer:', error)
      }
    }

    set({
      peer: null,
      peerId: null,
      connection: null,
    })
  }

  const validateEncounterData = (data: unknown): data is EncounterData => {
    if (!data || typeof data !== 'object') return false
    const obj = data as Record<string, unknown>

    if (!Array.isArray(obj.enemies)) return false

    return obj.enemies.every((enemy: unknown) => {
      if (!enemy || typeof enemy !== 'object') return false
      const e = enemy as Record<string, unknown>
      return (
        typeof e.id === 'string' &&
        typeof e.name === 'string' &&
        typeof e.status === 'string' &&
        Array.isArray(e.conditions) &&
        e.conditions.every((c: unknown) => typeof c === 'string')
      )
    })
  }

  const checkMessageSize = (message: OutgoingMessage): boolean => {
    try {
      const size = JSON.stringify(message).length
      return size <= CONNECTION.MAX_MESSAGE_SIZE
    } catch {
      return false
    }
  }

  const checkRateLimit = (): boolean => {
    const now = Date.now()

    // Reset counter every second
    if (now - cleanupState.lastMessageReset >= 1000) {
      cleanupState.messageCount = 0
      cleanupState.lastMessageReset = now
    }

    cleanupState.messageCount++
    return cleanupState.messageCount <= CONNECTION.MAX_MESSAGES_PER_SECOND
  }

  const sendMessage = (message: OutgoingMessage): boolean => {
    const connection = get().connection
    if (!connection?.open || get().connectionStatus !== 'connected') {
      return false
    }

    if (!checkMessageSize(message)) {
      console.error('Message too large to send')
      return false
    }

    if (!checkRateLimit()) {
      console.warn('Rate limit exceeded, message dropped')
      return false
    }

    try {
      connection.send(message)
      return true
    } catch (error) {
      console.error('Error sending message:', error)
      return false
    }
  }

  const startHealthMonitoring = (): void => {
    clearPingInterval()
    clearHealthCheckInterval()
    cleanupState.lastPongTime = Date.now()

    // Send periodic pings
    cleanupState.pingIntervalId = window.setInterval(() => {
      if (get().connectionStatus === 'connected') {
        sendMessage({ type: 'ping' })
      }
    }, CONNECTION.PING_INTERVAL_MS)

    // Check connection health
    cleanupState.healthCheckIntervalId = window.setInterval(() => {
      // Only check health when connected
      if (get().connectionStatus !== 'connected') {
        return
      }

      const now = Date.now()
      const timeSinceLastPong = now - cleanupState.lastPongTime

      if (timeSinceLastPong > CONNECTION.PONG_TIMEOUT_MS) {
        console.log('Connection timeout - no pong received')
        handleConnectionLost('Connection timeout')
      }
    }, CONNECTION.HEALTH_CHECK_INTERVAL_MS)
  }

  const handleConnectionLost = (reason: string): void => {
    console.log('Connection lost:', reason)
    clearPingInterval()
    clearHealthCheckInterval()
    set({ connectionStatus: 'disconnected' })
    scheduleReconnect()
  }

  const scheduleReconnect = (): void => {
    const { clientName, hostId, connectionStatus } = get()

    // Don't reconnect if user manually disconnected or in error state
    if (connectionStatus === 'name-entry' || connectionStatus === 'error') {
      return
    }

    if (!clientName.trim() || !hostId) {
      return
    }

    // Prevent duplicate reconnect scheduling
    if (cleanupState.isReconnecting) {
      return
    }

    // Check max attempts
    if (cleanupState.reconnectAttempts >= CONNECTION.MAX_RECONNECT_ATTEMPTS) {
      console.error('Max reconnection attempts reached')
      cleanupConnection()
      cleanupState.isReconnecting = false
      set({
        connectionStatus: 'error',
        error: get().getTerm('maxReconnectAttemptsReached') || 'Max reconnection attempts reached',
      })
      return
    }

    cleanupConnection()
    cleanupState.isReconnecting = true

    cleanupState.reconnectAttempts += 1
    const delay = Math.min(
      CONNECTION.MIN_RECONNECT_DELAY_MS * 2 ** (cleanupState.reconnectAttempts - 1),
      CONNECTION.MAX_RECONNECT_DELAY_MS
    )

    console.log(`Scheduling reconnect attempt ${cleanupState.reconnectAttempts} in ${delay}ms`)

    clearReconnectTimeout()
    cleanupState.reconnectTimeoutId = window.setTimeout(() => {
      cleanupState.isReconnecting = false
      connectToHost()
    }, delay)
  }

  const connectToHost = (): void => {
    const { clientName, hostId } = get()

    // Validate preconditions
    if (!clientName.trim()) {
      set({
        error: get().getTerm('enterYourName'),
        connectionStatus: 'name-entry',
      })
      return
    }

    if (!hostId) {
      set({
        error: get().getTerm('noHostIdProvided'),
        connectionStatus: 'error',
      })
      return
    }

    // Prevent duplicate connection attempts
    if (get().peer) {
      console.warn('Connection attempt already in progress')
      return
    }

    console.log('Initiating connection to host:', hostId)
    set({ connectionStatus: 'connecting', error: null })

    // Step 1: Create peer
    const peer = new Peer()
    set({ peer })

    // Step 2: Wait for peer to open
    peer.on('open', (id) => {
      console.log('Peer opened with ID:', id)
      set({ peerId: id })

      // Step 3: Connect to host
      const connection = peer.connect(hostId)
      set({ connection })

      // Step 4: Wait for connection to open
      connection.on('open', () => {
        console.log('Connection established to host:', hostId)

        // Step 5: Set connected status first
        set({ connectionStatus: 'connected' })

        // Step 6: Authenticate with client name
        if (!sendMessage({ type: 'client-name', name: clientName })) {
          handleConnectionLost('Failed to authenticate')
          return
        }

        // Step 7: Reset reconnect counter and start monitoring
        cleanupState.reconnectAttempts = 0
        startHealthMonitoring()
      })

      // Handle incoming data
      connection.on('data', (receivedData) => {
        // Handle pong responses
        if (receivedData && typeof receivedData === 'object' && 'type' in receivedData) {
          if (receivedData.type === 'pong') {
            cleanupState.lastPongTime = Date.now()
            return
          }
        }

        // Validate and update encounter data
        if (validateEncounterData(receivedData)) {
          set({ data: receivedData })
        } else {
          console.error('Received invalid encounter data')
        }
      })

      // Handle connection close
      connection.on('close', () => {
        console.log('Connection closed by peer')
        handleConnectionLost('Connection closed')
      })

      // Handle connection errors
      connection.on('error', (err) => {
        console.error('Connection error:', err)
        handleConnectionLost(get().getTerm('connectionError') || 'Connection error')
      })
    })

    // Handle peer errors
    peer.on('error', (err) => {
      console.error('Peer error:', err)
      cleanupConnection()
      set({
        error: err.message,
        connectionStatus: 'disconnected',
      })
      scheduleReconnect()
    })
  }

  return {
    peer: null,
    peerId: null,
    connection: null,
    connectionStatus: 'name-entry',
    error: null,
    data: null,
    clientName: '',
    hostId: null,

    setClientName: (name: string) => {
      set({ clientName: name })
    },

    setHostId: (hostId: string | null) => {
      if (!hostId) {
        set({
          hostId: null,
          error: null,
          connectionStatus: 'name-entry',
        })
        return
      }

      set({ hostId, error: null })
    },

    connectToHost,

    disconnect: () => {
      console.log('Manual disconnect requested')
      cleanupState.reconnectAttempts = 0
      cleanupState.isReconnecting = false
      cleanupConnection()
      const nameEntered = Boolean(get().clientName.trim())
      set({ connectionStatus: nameEntered ? 'disconnected' : 'name-entry', error: null })
    },

    sendAttack: (monsterId: string) => {
      if (!sendMessage({ type: 'attack', monsterId })) {
        console.error('Failed to send attack message')
      }
    },
  }
}
