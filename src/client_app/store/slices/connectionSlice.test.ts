import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { create } from 'zustand'
import { DataConnection } from 'peerjs'
import { createConnectionSlice, type ConnectionSlice } from './connectionSlice'
import type { TermSlice } from './termSlice'
import { CONNECTION } from '@/constants'

// Mock PeerJS
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

describe('ConnectionSlice', () => {
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

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = store.getState()
      expect(state.peer).toBeNull()
      expect(state.peerId).toBeNull()
      expect(state.connection).toBeNull()
      expect(state.connectionStatus).toBe('name-entry')
      expect(state.error).toBeNull()
      expect(state.data).toBeNull()
      expect(state.clientName).toBe('')
      expect(state.hostId).toBeNull()
    })
  })

  describe('setClientName', () => {
    it('should update client name', () => {
      store.getState().setClientName('TestUser')
      expect(store.getState().clientName).toBe('TestUser')
    })

    it('should allow empty name', () => {
      store.getState().setClientName('TestUser')
      store.getState().setClientName('')
      expect(store.getState().clientName).toBe('')
    })
  })

  describe('setHostId', () => {
    it('should update host ID when valid', () => {
      store.getState().setHostId('host-123')
      expect(store.getState().hostId).toBe('host-123')
      expect(store.getState().error).toBeNull()
    })

    it('should set name-entry status when host ID is null', () => {
      store.getState().setHostId(null)
      expect(store.getState().hostId).toBeNull()
      expect(store.getState().connectionStatus).toBe('name-entry')
      expect(store.getState().error).toBeNull()
    })
  })

  describe('connectToHost', () => {
    it('should require client name', () => {
      store.getState().setHostId('host-123')
      store.getState().connectToHost()

      expect(store.getState().connectionStatus).toBe('name-entry')
      expect(store.getState().error).toBe('enterYourName')
    })

    it('should require host ID', () => {
      store.getState().setClientName('TestUser')
      store.getState().connectToHost()

      expect(store.getState().connectionStatus).toBe('error')
      expect(store.getState().error).toBe('noHostIdProvided')
    })

    it('should prevent duplicate connection attempts', () => {
      store.getState().setClientName('TestUser')
      store.getState().setHostId('host-123')

      store.getState().connectToHost()
      const firstPeer = store.getState().peer

      store.getState().connectToHost()
      const secondPeer = store.getState().peer

      // Should be the same peer instance
      expect(firstPeer).toBe(secondPeer)
    })

    it('should set connecting status', () => {
      store.getState().setClientName('TestUser')
      store.getState().setHostId('host-123')
      store.getState().connectToHost()

      expect(store.getState().connectionStatus).toBe('connecting')
      expect(store.getState().error).toBeNull()
    })

    it('should create a new peer', () => {
      store.getState().setClientName('TestUser')
      store.getState().setHostId('host-123')
      store.getState().connectToHost()

      expect(store.getState().peer).toBeTruthy()
    })
  })

  describe('disconnect', () => {
    it('should cleanup and set disconnected when name was entered', () => {
      store.getState().setClientName('TestUser')
      store.getState().setHostId('host-123')
      store.getState().connectToHost()

      store.getState().disconnect()

      expect(store.getState().connectionStatus).toBe('disconnected')
      expect(store.getState().peer).toBeNull()
      expect(store.getState().connection).toBeNull()
      expect(store.getState().error).toBeNull()
    })

    it('should set name-entry when no name was entered', () => {
      store.getState().disconnect()

      expect(store.getState().connectionStatus).toBe('name-entry')
    })
  })

  describe('sendAttack', () => {
    it('should not send when disconnected', () => {
      store.getState().sendAttack('monster-1')
      // Should not throw, just silently fail
      expect(store.getState().connection).toBeNull()
    })

    it('should send attack when connected', () => {
      const mockConnection = {
        on: vi.fn(),
        send: vi.fn(),
        close: vi.fn(),
        open: true,
      }

      store.setState({
        connectionStatus: 'connected',
        connection: mockConnection as unknown as DataConnection,
      })

      store.getState().sendAttack('monster-1')

      expect(mockConnection.send).toHaveBeenCalledWith({
        type: 'attack',
        monsterId: 'monster-1',
      })
    })

    it('should not send when connection is closed', () => {
      const mockConnection = {
        on: vi.fn(),
        send: vi.fn(),
        close: vi.fn(),
        open: false,
      }

      store.setState({
        connectionStatus: 'connected',
        connection: mockConnection as unknown as DataConnection,
      })

      store.getState().sendAttack('monster-1')

      expect(mockConnection.send).not.toHaveBeenCalled()
    })
  })

  describe('Connection Lifecycle', () => {
    it('should handle peer open event', () => {
      store.getState().setClientName('TestUser')
      store.getState().setHostId('host-123')
      store.getState().connectToHost()

      const peer = store.getState().peer as any

      // Simulate peer open
      peer.emit('open', 'peer-id-123')

      expect(store.getState().peerId).toBe('peer-id-123')
      expect(peer.connect).toHaveBeenCalledWith('host-123')
    })

    it('should handle connection open event', () => {
      store.getState().setClientName('TestUser')
      store.getState().setHostId('host-123')
      store.getState().connectToHost()

      const peer = store.getState().peer as any
      peer.emit('open', 'peer-id-123')

      const connection = store.getState().connection as any

      // Simulate connection open
      connection.emit('open')

      expect(store.getState().connectionStatus).toBe('connected')
      expect(connection.send).toHaveBeenCalledWith({
        type: 'client-name',
        name: 'TestUser',
      })
    })

    it('should handle incoming data', () => {
      store.getState().setClientName('TestUser')
      store.getState().setHostId('host-123')
      store.getState().connectToHost()

      const peer = store.getState().peer as any
      peer.emit('open', 'peer-id-123')

      const connection = store.getState().connection as any

      const encounterData = {
        enemies: [{ id: '1', name: 'Goblin', status: 'healthy', conditions: [] }],
      }

      connection.emit('data', encounterData)

      expect(store.getState().data).toEqual(encounterData)
    })

    it('should handle pong messages separately', () => {
      store.getState().setClientName('TestUser')
      store.getState().setHostId('host-123')
      store.getState().connectToHost()

      const peer = store.getState().peer as any
      peer.emit('open', 'peer-id-123')

      const connection = store.getState().connection as any

      connection.emit('data', { type: 'pong' })

      // Should not update data state
      expect(store.getState().data).toBeNull()
    })
  })

  describe('Reconnection Logic', () => {
    it('should schedule reconnect on connection close', () => {
      store.getState().setClientName('TestUser')
      store.getState().setHostId('host-123')
      store.getState().connectToHost()

      const peer = store.getState().peer as any
      peer.emit('open', 'peer-id-123')

      const connection = store.getState().connection as any
      connection.emit('open')

      // Simulate connection close
      connection.emit('close')

      expect(store.getState().connectionStatus).toBe('disconnected')

      // Should schedule reconnect (timer is set)
      vi.advanceTimersByTime(1000)

      // Should be attempting to connect (new peer created)
      expect(store.getState().connectionStatus).toBe('connecting')
    })

    it('should use exponential backoff for reconnection', () => {
      store.getState().setClientName('TestUser')
      store.getState().setHostId('host-123')

      // First connection attempt
      store.getState().connectToHost()

      const simulateFailure = () => {
        const peer = store.getState().peer as any
        peer.emit('error', { type: 'peer-unavailable' })
      }

      simulateFailure()
      vi.advanceTimersByTime(1000) // First retry at 1s
      expect(store.getState().connectionStatus).toBe('connecting')

      simulateFailure()
      vi.advanceTimersByTime(2000) // Second retry at 2s
      expect(store.getState().connectionStatus).toBe('connecting')

      simulateFailure()
      vi.advanceTimersByTime(4000) // Third retry at 4s
      expect(store.getState().connectionStatus).toBe('connecting')
    })

    it('should stop reconnecting after max attempts', () => {
      store.getState().setClientName('TestUser')
      store.getState().setHostId('host-123')

      // Make 6 consecutive failed connection attempts
      for (let i = 0; i <= 5; i++) {
        store.getState().connectToHost()
        const peer = store.getState().peer as any
        if (peer) {
          peer.emit('error', { type: 'peer-unavailable', message: 'unavailable' })
        }
        // Advance timer to allow next reconnect attempt
        vi.advanceTimersByTime(15000)
      }

      // After MAX_RECONNECT_ATTEMPTS (5), should be in error state
      expect(store.getState().connectionStatus).toBe('error')
    })

    it('should not reconnect from name-entry state', () => {
      store.getState().disconnect()

      vi.advanceTimersByTime(10000)

      expect(store.getState().connectionStatus).toBe('name-entry')
    })
  })

  describe('Health Monitoring', () => {
    it('should send pings periodically when connected', () => {
      store.getState().setClientName('TestUser')
      store.getState().setHostId('host-123')
      store.getState().connectToHost()

      const peer = store.getState().peer as any
      peer.emit('open', 'peer-id-123')

      const connection = store.getState().connection as any
      connection.emit('open')

      vi.mocked(connection.send).mockClear()

      // Advance time to trigger ping
      vi.advanceTimersByTime(CONNECTION.PING_INTERVAL_MS)

      expect(connection.send).toHaveBeenCalledWith({ type: 'ping' })
    })

    it('should detect connection timeout', () => {
      store.getState().setClientName('TestUser')
      store.getState().setHostId('host-123')
      store.getState().connectToHost()

      const peer = store.getState().peer as any
      peer.emit('open', 'peer-id-123')

      const connection = store.getState().connection as any
      connection.emit('open')

      // Don't send any pong responses
      // Advance time past timeout
      vi.advanceTimersByTime(CONNECTION.CONNECTION_TIMEOUT_MS + 2000)

      expect(store.getState().connectionStatus).toBe('disconnected')
    })
  })
})
