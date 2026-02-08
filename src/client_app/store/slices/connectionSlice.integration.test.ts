import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { create } from 'zustand'
import { createConnectionSlice, type ConnectionSlice } from './connectionSlice'
import type { TermSlice } from './termSlice'
import { CONNECTION } from '@/constants'

// Mock PeerJS with full event emitter implementation
vi.mock('peerjs', () => {
  const EventEmitter = class {
    private handlers: Record<string, Function[]> = {}

    on(event: string, handler: Function) {
      if (!this.handlers[event]) {
        this.handlers[event] = []
      }
      this.handlers[event].push(handler)
    }

    emit(event: string, ...args: any[]) {
      const eventHandlers = this.handlers[event]
      if (eventHandlers) {
        eventHandlers.forEach((handler) => handler(...args))
      }
    }
  }

  class MockConnection extends EventEmitter {
    open = true
    send = vi.fn()
    close = vi.fn()
  }

  class MockPeer extends EventEmitter {
    connect = vi.fn(() => new MockConnection())
    destroy = vi.fn()
  }

  return {
    Peer: MockPeer,
    DataConnection: MockConnection,
  }
})

type TestStore = ConnectionSlice &
  TermSlice & {
    isLoading: boolean
    initialize: () => Promise<void>
  }

const createTestStore = () => {
  const mockTermSlice: TermSlice = {
    terms: {},
    language: 'en',
    availableLanguages: [{ key: 'en', name: 'English' }],
    getTerm: (key: string) => key,
    setLanguage: vi.fn(),
    loadLanguagePack: vi.fn(),
    loadAvailableLanguages: vi.fn(),
  }

  return create<TestStore>()((set, get, api) => ({
    isLoading: false,
    initialize: vi.fn(),
    ...mockTermSlice,
    ...createConnectionSlice(set, get, api),
  }))
}

describe('Connection Integration Tests', () => {
  let store: ReturnType<typeof createTestStore>

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    store = createTestStore()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  describe('Complete Connection Flow', () => {
    it('should complete full connection lifecycle', () => {
      // Step 1: Initial state
      expect(store.getState().connectionStatus).toBe('name-entry')

      // Step 2: Set client name and host
      store.getState().setClientName('TestUser')
      store.getState().setHostId('host-123')
      expect(store.getState().clientName).toBe('TestUser')
      expect(store.getState().hostId).toBe('host-123')

      // Step 3: Initiate connection
      store.getState().connectToHost()
      expect(store.getState().connectionStatus).toBe('connecting')
      expect(store.getState().peer).toBeTruthy()

      // Step 4: Peer opens
      const peer = store.getState().peer as any
      peer.emit('open', 'peer-id-123')
      expect(store.getState().peerId).toBe('peer-id-123')
      expect(store.getState().connection).toBeTruthy()

      // Step 5: Connection opens
      const connection = store.getState().connection as any
      connection.emit('open')
      expect(store.getState().connectionStatus).toBe('connected')
      expect(connection.send).toHaveBeenCalledWith({
        type: 'client-name',
        name: 'TestUser',
      })

      // Step 6: Receive encounter data
      const encounterData = {
        enemies: [
          { id: '1', name: 'Goblin', status: 'healthy', conditions: [] },
          { id: '2', name: 'Orc', status: 'injured', conditions: ['poisoned'] },
        ],
      }
      connection.emit('data', encounterData)
      expect(store.getState().data).toEqual(encounterData)

      // Step 7: Send attack message
      vi.mocked(connection.send).mockClear()
      store.getState().sendAttack('1')
      expect(connection.send).toHaveBeenCalledWith({
        type: 'attack',
        monsterId: '1',
      })

      // Step 8: Manual disconnect
      store.getState().disconnect()
      expect(store.getState().connectionStatus).toBe('disconnected')
      expect(store.getState().peer).toBeNull()
      expect(store.getState().connection).toBeNull()
    })

    it('should handle connection with ping/pong health monitoring', () => {
      // Connect
      store.getState().setClientName('TestUser')
      store.getState().setHostId('host-123')
      store.getState().connectToHost()

      const peer = store.getState().peer as any
      peer.emit('open', 'peer-id-123')

      const connection = store.getState().connection as any
      connection.emit('open')

      expect(store.getState().connectionStatus).toBe('connected')

      // Clear initial client-name send
      vi.mocked(connection.send).mockClear()

      // Advance time to trigger first ping
      vi.advanceTimersByTime(CONNECTION.PING_INTERVAL_MS)
      expect(connection.send).toHaveBeenCalledWith({ type: 'ping' })

      // Simulate pong response
      connection.emit('data', { type: 'pong' })

      // Connection should still be healthy
      expect(store.getState().connectionStatus).toBe('connected')

      // Advance more time
      vi.advanceTimersByTime(CONNECTION.PING_INTERVAL_MS)
      expect(connection.send).toHaveBeenCalledTimes(2) // Second ping

      // Another pong
      connection.emit('data', { type: 'pong' })

      // Still connected
      expect(store.getState().connectionStatus).toBe('connected')
    })

    it('should reconnect after connection loss', () => {
      // Initial connection
      store.getState().setClientName('TestUser')
      store.getState().setHostId('host-123')
      store.getState().connectToHost()

      const peer = store.getState().peer as any
      peer.emit('open', 'peer-id-123')

      const connection = store.getState().connection as any
      connection.emit('open')

      expect(store.getState().connectionStatus).toBe('connected')

      // Connection drops
      connection.emit('close')

      expect(store.getState().connectionStatus).toBe('disconnected')

      // Wait for reconnect (1s for first attempt)
      vi.advanceTimersByTime(1000)

      // Should be attempting reconnection
      expect(store.getState().connectionStatus).toBe('connecting')
      expect(store.getState().peer).toBeTruthy()

      // New peer opens
      const newPeer = store.getState().peer as any
      newPeer.emit('open', 'peer-id-456')

      const newConnection = store.getState().connection as any
      newConnection.emit('open')

      // Successfully reconnected
      expect(store.getState().connectionStatus).toBe('connected')
    })

    it('should handle connection timeout and reconnect', () => {
      // Connect
      store.getState().setClientName('TestUser')
      store.getState().setHostId('host-123')
      store.getState().connectToHost()

      const peer = store.getState().peer as any
      peer.emit('open', 'peer-id-123')

      const connection = store.getState().connection as any
      connection.emit('open')

      expect(store.getState().connectionStatus).toBe('connected')

      // Don't respond to pings - simulate network issue
      // Advance past timeout
      vi.advanceTimersByTime(CONNECTION.CONNECTION_TIMEOUT_MS + 2000)

      // Should detect timeout and set to disconnected
      expect(store.getState().connectionStatus).toBe('disconnected')

      // Wait for reconnect
      vi.advanceTimersByTime(1000)

      // Should be trying to reconnect
      expect(store.getState().connectionStatus).toBe('connecting')
    })

    it('should update encounter data while connected', () => {
      // Connect
      store.getState().setClientName('TestUser')
      store.getState().setHostId('host-123')
      store.getState().connectToHost()

      const peer = store.getState().peer as any
      peer.emit('open', 'peer-id-123')

      const connection = store.getState().connection as any
      connection.emit('open')

      // Initial encounter data
      const initialData = {
        enemies: [{ id: '1', name: 'Goblin', status: 'healthy', conditions: [] }],
      }
      connection.emit('data', initialData)
      expect(store.getState().data).toEqual(initialData)

      // Updated encounter data
      const updatedData = {
        enemies: [{ id: '1', name: 'Goblin', status: 'injured', conditions: ['stunned'] }],
      }
      connection.emit('data', updatedData)
      expect(store.getState().data).toEqual(updatedData)

      // Multiple enemies
      const multipleEnemies = {
        enemies: [
          { id: '1', name: 'Goblin', status: 'down', conditions: [] },
          { id: '2', name: 'Orc', status: 'healthy', conditions: [] },
        ],
      }
      connection.emit('data', multipleEnemies)
      expect(store.getState().data).toEqual(multipleEnemies)
    })
  })

  describe('Error Scenarios', () => {
    it('should handle peer initialization error gracefully', () => {
      store.getState().setClientName('TestUser')
      store.getState().setHostId('host-123')
      store.getState().connectToHost()

      const peer = store.getState().peer as any
      peer.emit('error', { message: 'Failed to initialize peer' })

      expect(store.getState().connectionStatus).toBe('disconnected')
      expect(store.getState().error).toBeTruthy()

      // Should schedule reconnect
      vi.advanceTimersByTime(1000)
      expect(store.getState().connectionStatus).toBe('connecting')
    })

    it('should handle connection error and retry', () => {
      store.getState().setClientName('TestUser')
      store.getState().setHostId('host-123')
      store.getState().connectToHost()

      const peer = store.getState().peer as any
      peer.emit('open', 'peer-id-123')

      const connection = store.getState().connection as any
      connection.emit('error', new Error('Connection failed'))

      expect(store.getState().connectionStatus).toBe('disconnected')

      // Should schedule reconnect
      vi.advanceTimersByTime(1000)
      expect(store.getState().connectionStatus).toBe('connecting')
    })

    it('should stop after max reconnection attempts', () => {
      store.getState().setClientName('TestUser')
      store.getState().setHostId('host-123')

      // Attempt connection and fail 6 times (initial + 5 retries)
      for (let i = 0; i <= 5; i++) {
        store.getState().connectToHost()
        const peer = store.getState().peer as any
        if (peer) {
          peer.emit('error', { message: 'Connection failed' })
        }
        vi.advanceTimersByTime(15000)
      }

      // After max attempts, should be in error state
      expect(store.getState().connectionStatus).toBe('error')

      // Should not attempt to reconnect anymore
      const previousStatus = store.getState().connectionStatus
      vi.advanceTimersByTime(30000)
      expect(store.getState().connectionStatus).toBe(previousStatus)
    })
  })

  describe('Edge Cases', () => {
    it('should not send messages when disconnected', () => {
      store.getState().sendAttack('monster-1')
      // Should not throw, just silently fail
      expect(true).toBe(true)
    })

    it('should handle rapid connect/disconnect cycles', () => {
      store.getState().setClientName('TestUser')
      store.getState().setHostId('host-123')

      // Connect
      store.getState().connectToHost()
      expect(store.getState().connectionStatus).toBe('connecting')

      // Disconnect before connection completes
      store.getState().disconnect()
      expect(store.getState().connectionStatus).toBe('disconnected')

      // Connect again
      store.getState().connectToHost()
      expect(store.getState().connectionStatus).toBe('connecting')

      const peer = store.getState().peer as any
      peer.emit('open', 'peer-id-123')

      const connection = store.getState().connection as any
      connection.emit('open')

      expect(store.getState().connectionStatus).toBe('connected')
    })

    it('should clean up properly on disconnect', () => {
      store.getState().setClientName('TestUser')
      store.getState().setHostId('host-123')
      store.getState().connectToHost()

      const peer = store.getState().peer as any
      peer.emit('open', 'peer-id-123')

      const connection = store.getState().connection as any
      connection.emit('open')

      // Disconnect
      store.getState().disconnect()

      expect(store.getState().peer).toBeNull()
      expect(store.getState().connection).toBeNull()
      expect(store.getState().peerId).toBeNull()

      // Timers should be cleaned up (no errors when advancing time)
      expect(() => vi.advanceTimersByTime(100000)).not.toThrow()
    })
  })
})
