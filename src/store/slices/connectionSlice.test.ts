import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { create } from 'zustand'
import { DataConnection } from 'peerjs'
import { createConnectionSlice, type ConnectionSlice } from './connectionSlice'
import { createMonsterSlice, type MonsterSlice } from './monsterSlice'
import type { Settings } from '@/types/Settings'
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
    peer = `peer-${Math.random()}`
    send = vi.fn()
    close = vi.fn()
  }

  class MockPeer extends EventEmitter {
    id: string | null = null
    destroy = vi.fn()
  }

  return {
    default: MockPeer,
    Peer: MockPeer,
    DataConnection: MockConnection,
  }
})

type TestStore = ConnectionSlice &
  MonsterSlice & {
    settings: Settings
    notify: (notification: { message: string; type: string }) => void
  }

const createTestStore = () => {
  return create<TestStore>()((set, get, api) => {
    const monsterSlice = createMonsterSlice(set, get, api)

    return {
      notify: vi.fn(),
      settings: {
        showQuickActions: true,
        showStatus: true,
        showHealth: true,
        showConditions: true,
        showChangeHp: true,
        autoRemoveDead: false,
        showXpCounter: true,
      },
      ...createConnectionSlice(set, get, api),
      ...monsterSlice,
      // Override getMonsterIndex to avoid async issues in tests
      getMonsterIndex: async () => {
        set({
          monsterIndex: {
            goblin: {
              name: 'Goblin',
              source: 'test',
              hp: { average: 10, formula: '2d6' },
              xp: 50,
            },
            orc: {
              name: 'Orc',
              source: 'test',
              hp: { average: 15, formula: '2d8+6' },
              xp: 100,
            },
          },
        })
      },
    }
  })
}

describe('Host ConnectionSlice', () => {
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
      expect(state.connections).toEqual([])
      expect(state.isConnecting).toBe(false)
      expect(state.healthCheckInterval).toBeNull()
      expect(state.pingIntervalId).toBeNull()
    })
  })

  describe('initializeHost', () => {
    it('should initialize peer and set connecting state', () => {
      store.getState().initializeHost()

      expect(store.getState().isConnecting).toBe(true)
      expect(store.getState().peer).toBeTruthy()
    })

    it('should not reinitialize if peer already exists', () => {
      store.getState().initializeHost()
      const firstPeer = store.getState().peer

      store.getState().initializeHost()
      const secondPeer = store.getState().peer

      expect(firstPeer).toBe(secondPeer)
    })

    it('should set peerId and start intervals when peer opens', () => {
      store.getState().initializeHost()
      const peer = store.getState().peer as any

      peer.emit('open', 'host-peer-123')

      expect(store.getState().peerId).toBe('host-peer-123')
      expect(store.getState().isConnecting).toBe(false)
      expect(store.getState().healthCheckInterval).toBeTruthy()
      expect(store.getState().pingIntervalId).toBeTruthy()
    })

    it('should handle peer error gracefully', () => {
      store.getState().initializeHost()
      const peer = store.getState().peer as any

      peer.emit('error', new Error('Peer initialization failed'))

      expect(store.getState().isConnecting).toBe(false)
    })
  })

  describe('Connection Management', () => {
    beforeEach(() => {
      store.getState().initializeHost()
      const peer = store.getState().peer as any
      peer.emit('open', 'host-peer-123')
    })

    it('should accept incoming connections', () => {
      const peer = store.getState().peer as any
      const mockConnection = new (vi.mocked(DataConnection) as any)()

      peer.emit('connection', mockConnection)
      mockConnection.emit('open')

      // Connection should be waiting for client-name message
      expect(store.getState().connections.length).toBe(0)

      // Send client-name
      mockConnection.emit('data', { type: 'client-name', name: 'TestClient' })

      expect(store.getState().connections.length).toBe(1)
      expect(store.getState().connections[0].name).toBe('TestClient')
    })

    it('should reject connections when limit is reached', () => {
      const peer = store.getState().peer as any

      // Add 25 connections (the limit)
      for (let i = 0; i < 25; i++) {
        const mockConnection = new (vi.mocked(DataConnection) as any)()
        mockConnection.peer = `peer-${i}`
        peer.emit('connection', mockConnection)
        mockConnection.emit('open')
        mockConnection.emit('data', { type: 'client-name', name: `Client${i}` })
      }

      expect(store.getState().connections.length).toBe(25)

      // Try to add 26th connection
      const extraConnection = new (vi.mocked(DataConnection) as any)()
      extraConnection.peer = 'peer-26'
      peer.emit('connection', extraConnection)

      expect(extraConnection.close).toHaveBeenCalled()
      expect(store.getState().connections.length).toBe(25)
    })

    it('should not add duplicate connections', () => {
      const peer = store.getState().peer as any
      const mockConnection = new (vi.mocked(DataConnection) as any)()
      mockConnection.peer = 'same-peer-id'

      peer.emit('connection', mockConnection)
      mockConnection.emit('open')
      mockConnection.emit('data', { type: 'client-name', name: 'TestClient' })

      expect(store.getState().connections.length).toBe(1)

      // Send client-name again
      mockConnection.emit('data', { type: 'client-name', name: 'TestClient' })

      expect(store.getState().connections.length).toBe(1)
    })

    it('should remove connection on close', () => {
      const peer = store.getState().peer as any
      const mockConnection = new (vi.mocked(DataConnection) as any)()

      peer.emit('connection', mockConnection)
      mockConnection.emit('open')
      mockConnection.emit('data', { type: 'client-name', name: 'TestClient' })

      expect(store.getState().connections.length).toBe(1)

      mockConnection.emit('close')

      expect(store.getState().connections.length).toBe(0)
    })

    it('should remove connection on error', () => {
      const peer = store.getState().peer as any
      const mockConnection = new (vi.mocked(DataConnection) as any)()

      peer.emit('connection', mockConnection)
      mockConnection.emit('open')
      mockConnection.emit('data', { type: 'client-name', name: 'TestClient' })

      expect(store.getState().connections.length).toBe(1)

      mockConnection.emit('error', new Error('Connection error'))

      expect(store.getState().connections.length).toBe(0)
    })
  })

  describe('Message Validation', () => {
    let mockConnection: any

    beforeEach(() => {
      store.getState().initializeHost()
      const peer = store.getState().peer as any
      peer.emit('open', 'host-peer-123')

      mockConnection = new (vi.mocked(DataConnection) as any)()
      peer.emit('connection', mockConnection)
      mockConnection.emit('open')
      mockConnection.emit('data', { type: 'client-name', name: 'TestClient' })
    })

    it('should reject messages that are too large', () => {
      const largeMessage = {
        type: 'attack',
        monsterId: 'x'.repeat(200000), // > 100KB
      }

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockConnection.emit('data', largeMessage)

      expect(consoleSpy).toHaveBeenCalledWith('Message too large from client:', expect.any(String))
      consoleSpy.mockRestore()
    })

    it('should reject messages with invalid structure', () => {
      const invalidMessage = {
        type: 'invalid-type',
        data: 'something',
      }

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockConnection.emit('data', invalidMessage)

      expect(consoleSpy).toHaveBeenCalledWith('Invalid message from client:', expect.any(String))
      consoleSpy.mockRestore()
    })

    it('should validate client-name length', () => {
      const peer = store.getState().peer as any
      const newConnection = new (vi.mocked(DataConnection) as any)()
      newConnection.peer = 'new-peer'

      peer.emit('connection', newConnection)
      newConnection.emit('open')

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // Try to send a name that's too long (> 50 chars)
      newConnection.emit('data', {
        type: 'client-name',
        name: 'x'.repeat(51),
      })

      expect(consoleSpy).toHaveBeenCalled()
      expect(store.getState().connections.length).toBe(1) // Only original connection
      consoleSpy.mockRestore()
    })

    it('should accept valid ping messages', () => {
      const initialActivity = store.getState().connections[0].lastActivity

      vi.advanceTimersByTime(1000)

      mockConnection.emit('data', { type: 'ping' })

      const updatedActivity = store.getState().connections[0].lastActivity
      expect(updatedActivity).toBeGreaterThan(initialActivity)
    })

    it('should accept valid attack messages', () => {
      const initialActivity = store.getState().connections[0].lastActivity

      vi.advanceTimersByTime(1000)

      mockConnection.emit('data', { type: 'attack', monsterId: 'monster-1' })

      const updatedActivity = store.getState().connections[0].lastActivity
      expect(updatedActivity).toBeGreaterThan(initialActivity)
    })
  })

  describe('Rate Limiting', () => {
    let mockConnection: any

    beforeEach(() => {
      store.getState().initializeHost()
      const peer = store.getState().peer as any
      peer.emit('open', 'host-peer-123')

      mockConnection = new (vi.mocked(DataConnection) as any)()
      peer.emit('connection', mockConnection)
      mockConnection.emit('open')
      mockConnection.emit('data', { type: 'client-name', name: 'TestClient' })
    })

    it('should enforce rate limit of 10 messages per second', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      // Send 10 messages - should all succeed
      for (let i = 0; i < 10; i++) {
        mockConnection.emit('data', { type: 'ping' })
      }

      expect(consoleSpy).not.toHaveBeenCalled()

      // 11th message should be rate limited
      mockConnection.emit('data', { type: 'ping' })

      expect(consoleSpy).toHaveBeenCalledWith('Rate limit exceeded for client:', 'TestClient')

      consoleSpy.mockRestore()
    })

    it('should reset rate limit counter after 1 second', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      // Send 10 messages
      for (let i = 0; i < 10; i++) {
        mockConnection.emit('data', { type: 'ping' })
      }

      // Wait 1 second
      vi.advanceTimersByTime(1000)

      // Should be able to send 10 more
      for (let i = 0; i < 10; i++) {
        mockConnection.emit('data', { type: 'ping' })
      }

      expect(consoleSpy).not.toHaveBeenCalled()

      consoleSpy.mockRestore()
    })
  })

  describe('Health Monitoring', () => {
    beforeEach(() => {
      store.getState().initializeHost()
      const peer = store.getState().peer as any
      peer.emit('open', 'host-peer-123')
    })

    it('should send pings periodically to all connections', () => {
      const peer = store.getState().peer as any

      // Add two connections
      const conn1 = new (vi.mocked(DataConnection) as any)()
      const conn2 = new (vi.mocked(DataConnection) as any)()
      conn1.peer = 'peer-1'
      conn2.peer = 'peer-2'

      peer.emit('connection', conn1)
      conn1.emit('open')
      conn1.emit('data', { type: 'client-name', name: 'Client1' })

      peer.emit('connection', conn2)
      conn2.emit('open')
      conn2.emit('data', { type: 'client-name', name: 'Client2' })

      vi.mocked(conn1.send).mockClear()
      vi.mocked(conn2.send).mockClear()

      // Advance time to trigger ping
      vi.advanceTimersByTime(CONNECTION.PING_INTERVAL_MS)

      expect(conn1.send).toHaveBeenCalledWith({ type: 'pong' })
      expect(conn2.send).toHaveBeenCalledWith({ type: 'pong' })
    })

    it('should remove inactive connections after timeout', () => {
      const peer = store.getState().peer as any
      const mockConnection = new (vi.mocked(DataConnection) as any)()

      peer.emit('connection', mockConnection)
      mockConnection.emit('open')
      mockConnection.emit('data', { type: 'client-name', name: 'TestClient' })

      expect(store.getState().connections.length).toBe(1)

      // Don't send any activity past timeout
      vi.advanceTimersByTime(CONNECTION.CONNECTION_TIMEOUT_MS + 7000)

      expect(store.getState().connections.length).toBe(0)
      expect(mockConnection.close).toHaveBeenCalled()
    })

    it('should keep connection alive when receiving messages', () => {
      const peer = store.getState().peer as any
      const mockConnection = new (vi.mocked(DataConnection) as any)()

      peer.emit('connection', mockConnection)
      mockConnection.emit('open')
      mockConnection.emit('data', { type: 'client-name', name: 'TestClient' })

      expect(store.getState().connections.length).toBe(1)

      // Send activity regularly
      for (let i = 0; i < 5; i++) {
        vi.advanceTimersByTime(CONNECTION.PING_INTERVAL_MS)
        mockConnection.emit('data', { type: 'ping' })
      }

      // After multiple pings with activity, connection should still be alive
      expect(store.getState().connections.length).toBe(1)
    })
  })

  describe('Attack Messages', () => {
    let mockConnection: any

    beforeEach(async () => {
      store.getState().initializeHost()
      const peer = store.getState().peer as any
      peer.emit('open', 'host-peer-123')

      mockConnection = new (vi.mocked(DataConnection) as any)()
      peer.emit('connection', mockConnection)
      mockConnection.emit('open')
      mockConnection.emit('data', { type: 'client-name', name: 'TestClient' })

      // Initialize monster index and add a test monster
      await store.getState().getMonsterIndex()
      store.getState().addMonster('Goblin', undefined, 10, 1)
    })

    it('should handle attack messages and highlight monster', () => {
      const monster = store.getState().monsters[0]
      const highlightSpy = vi.spyOn(store.getState(), 'highlightMonster')

      mockConnection.emit('data', { type: 'attack', monsterId: monster.id })

      expect(highlightSpy).toHaveBeenCalledWith(monster.id)
    })

    it('should respond to ping with pong', () => {
      vi.mocked(mockConnection.send).mockClear()

      mockConnection.emit('data', { type: 'ping' })

      expect(mockConnection.send).toHaveBeenCalledWith({ type: 'pong' })
    })
  })

  describe('broadcastMonsters', () => {
    beforeEach(async () => {
      store.getState().initializeHost()
      const peer = store.getState().peer as any
      peer.emit('open', 'host-peer-123')

      // Initialize monster index
      await store.getState().getMonsterIndex()
    })

    it('should not broadcast when no connections', () => {
      store.getState().addMonster('Goblin', undefined, 10, 1)

      // Should not throw
      expect(() => store.getState().broadcastMonsters()).not.toThrow()
    })

    it('should broadcast monster data to all connections', () => {
      const peer = store.getState().peer as any

      // Add monsters FIRST
      store.getState().addMonster('Goblin', undefined, 10, 2)

      // Verify monsters were added and unhide them
      const monsters = store.getState().monsters
      expect(monsters.length).toBe(2)
      monsters.forEach((m) => store.getState().toggleHideMonster(m.id))

      // Then add connections
      const conn1 = new (vi.mocked(DataConnection) as any)()
      const conn2 = new (vi.mocked(DataConnection) as any)()
      conn1.peer = 'peer-1'
      conn2.peer = 'peer-2'

      peer.emit('connection', conn1)
      conn1.emit('open')

      vi.mocked(conn1.send).mockClear()
      conn1.emit('data', { type: 'client-name', name: 'Client1' })

      // Check what was actually sent
      const sentData = vi.mocked(conn1.send).mock.calls[0][0] as any
      expect(sentData.enemies.length).toBeGreaterThan(0)

      // broadcastMonsters is automatically called after client-name
      expect(conn1.send).toHaveBeenCalledWith(
        expect.objectContaining({
          enemies: expect.arrayContaining([
            expect.objectContaining({
              name: expect.stringContaining('Goblin'),
              status: 'healthy',
            }),
          ]),
        })
      )

      peer.emit('connection', conn2)
      conn2.emit('open')
      vi.mocked(conn2.send).mockClear()
      conn2.emit('data', { type: 'client-name', name: 'Client2' })

      expect(conn2.send).toHaveBeenCalledWith(
        expect.objectContaining({
          enemies: expect.any(Array),
        })
      )
    })

    it('should not broadcast hidden monsters', () => {
      const peer = store.getState().peer as any

      // Add monsters first
      store.getState().addMonster('Goblin', undefined, 10, 1)
      store.getState().addMonster('Orc', undefined, 15, 1)

      const monsters = store.getState().monsters

      // Goblin is already hidden by default, unhide Orc
      store.getState().toggleHideMonster(monsters[1].id)

      // Now connect
      const conn = new (vi.mocked(DataConnection) as any)()
      peer.emit('connection', conn)
      conn.emit('open')

      vi.mocked(conn.send).mockClear()
      conn.emit('data', { type: 'client-name', name: 'Client1' })

      const sentData = vi.mocked(conn.send).mock.calls[0][0] as any
      expect(sentData.enemies.length).toBe(1)
      expect(sentData.enemies[0].name).toContain('Orc')
    })

    it('should include correct monster status in broadcast', () => {
      // Add monster with 20 HP first
      store.getState().addMonster('Goblin', undefined, 20, 1)
      const monster = store.getState().monsters[0]
      // Unhide the monster
      store.getState().toggleHideMonster(monster.id)

      const peer = store.getState().peer as any
      const conn = new (vi.mocked(DataConnection) as any)()

      peer.emit('connection', conn)
      conn.emit('open')
      conn.emit('data', { type: 'client-name', name: 'Client1' })

      vi.mocked(conn.send).mockClear()

      // Healthy (20 HP)
      store.getState().broadcastMonsters()
      let sentData = vi.mocked(conn.send).mock.calls[0][0] as any
      expect(sentData.enemies[0].status).toBe('healthy')

      // Injured (10 HP = 50%)
      store.getState().updateMonsterHealth(monster.id, -10)
      store.getState().broadcastMonsters()
      sentData = vi.mocked(conn.send).mock.calls[1][0] as any
      expect(sentData.enemies[0].status).toBe('injured')

      // Badly injured (4 HP = 20%)
      store.getState().updateMonsterHealth(monster.id, -6)
      store.getState().broadcastMonsters()
      sentData = vi.mocked(conn.send).mock.calls[2][0] as any
      expect(sentData.enemies[0].status).toBe('badly-injured')

      // Down (0 HP)
      store.getState().updateMonsterHealth(monster.id, -4)
      store.getState().broadcastMonsters()
      sentData = vi.mocked(conn.send).mock.calls[3][0] as any
      expect(sentData.enemies[0].status).toBe('down')
    })

    it('should include monster conditions in broadcast', () => {
      // Add monster and conditions first
      store.getState().addMonster('Goblin', undefined, 10, 1)
      const monster = store.getState().monsters[0]
      // Unhide the monster
      store.getState().toggleHideMonster(monster.id)

      store.getState().addMonsterCondition(monster.id, 'poisoned')
      store.getState().addMonsterCondition(monster.id, 'stunned')

      const peer = store.getState().peer as any
      const conn = new (vi.mocked(DataConnection) as any)()

      peer.emit('connection', conn)
      conn.emit('open')

      vi.mocked(conn.send).mockClear()
      conn.emit('data', { type: 'client-name', name: 'Client1' })

      const sentData = vi.mocked(conn.send).mock.calls[0][0] as any
      expect(sentData.enemies[0].conditions).toEqual(['poisoned', 'stunned'])
    })

    it('should not send to closed connections', () => {
      const peer = store.getState().peer as any
      const conn = new (vi.mocked(DataConnection) as any)()
      conn.open = false

      peer.emit('connection', conn)
      conn.emit('open')
      conn.emit('data', { type: 'client-name', name: 'Client1' })

      store.getState().addMonster('Goblin', undefined, 10, 1)

      vi.mocked(conn.send).mockClear()
      store.getState().broadcastMonsters()

      expect(conn.send).not.toHaveBeenCalled()
    })
  })

  describe('disconnectAll', () => {
    beforeEach(() => {
      store.getState().initializeHost()
      const peer = store.getState().peer as any
      peer.emit('open', 'host-peer-123')
    })

    it('should close all connections', () => {
      const peer = store.getState().peer as any

      // Add multiple connections
      const connections = []
      for (let i = 0; i < 3; i++) {
        const conn = new (vi.mocked(DataConnection) as any)()
        conn.peer = `peer-${i}`
        connections.push(conn)
        peer.emit('connection', conn)
        conn.emit('open')
        conn.emit('data', { type: 'client-name', name: `Client${i}` })
      }

      expect(store.getState().connections.length).toBe(3)

      store.getState().disconnectAll()

      connections.forEach((conn) => {
        expect(conn.close).toHaveBeenCalled()
      })
      expect(store.getState().connections.length).toBe(0)
    })

    it('should destroy peer', () => {
      const peer = store.getState().peer

      store.getState().disconnectAll()

      expect(peer?.destroy).toHaveBeenCalled()
      expect(store.getState().peer).toBeNull()
    })

    it('should clear all intervals', () => {
      const healthCheckInterval = store.getState().healthCheckInterval
      const pingIntervalId = store.getState().pingIntervalId

      expect(healthCheckInterval).not.toBeNull()
      expect(pingIntervalId).not.toBeNull()

      const clearIntervalSpy = vi.spyOn(window, 'clearInterval')

      store.getState().disconnectAll()

      expect(clearIntervalSpy).toHaveBeenCalledWith(healthCheckInterval!)
      expect(clearIntervalSpy).toHaveBeenCalledWith(pingIntervalId!)
      expect(store.getState().healthCheckInterval).toBeNull()
      expect(store.getState().pingIntervalId).toBeNull()
    })

    it('should reset all state', () => {
      const peer = store.getState().peer as any
      const conn = new (vi.mocked(DataConnection) as any)()

      peer.emit('connection', conn)
      conn.emit('open')
      conn.emit('data', { type: 'client-name', name: 'Client1' })

      store.getState().disconnectAll()

      const state = store.getState()
      expect(state.peer).toBeNull()
      expect(state.peerId).toBeNull()
      expect(state.connections).toEqual([])
      expect(state.healthCheckInterval).toBeNull()
      expect(state.pingIntervalId).toBeNull()
    })
  })
})
