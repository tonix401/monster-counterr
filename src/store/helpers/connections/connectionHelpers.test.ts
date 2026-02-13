import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import type { DataConnection } from 'peerjs'
import {
  validateIncomingMessage,
  checkMessageSize,
  checkRateLimit,
  sendToConnection,
  filterActiveConnections,
  buildBroadcastPayload,
  broadcastToConnections,
  type PingMessage,
  type PongMessage,
  type ClientNameMessage,
  type AttackMessage,
} from './connectionHelpers'
import type { Monster } from '@/types/Monster'
import type { ClientConnection } from '@/store/types'
import { CONNECTION } from '@/constants'

describe('connectionHelpers', () => {
  describe('validateIncomingMessage', () => {
    it('should validate ping message', () => {
      const message: PingMessage = { type: 'ping' }
      expect(validateIncomingMessage(message)).toBe(true)
    })

    it('should validate client-name message with valid name', () => {
      const message: ClientNameMessage = { type: 'client-name', name: 'Alice' }
      expect(validateIncomingMessage(message)).toBe(true)
    })

    it('should validate client-name message with max length name', () => {
      const message: ClientNameMessage = {
        type: 'client-name',
        name: 'a'.repeat(50),
      }
      expect(validateIncomingMessage(message)).toBe(true)
    })

    it('should reject client-name message with name exceeding 50 chars', () => {
      const message = { type: 'client-name', name: 'a'.repeat(51) }
      expect(validateIncomingMessage(message)).toBe(false)
    })

    it('should validate attack message with monsterId', () => {
      const message: AttackMessage = {
        type: 'attack',
        monsterId: 'monster-123',
      }
      expect(validateIncomingMessage(message)).toBe(true)
    })

    it('should reject message with missing type', () => {
      const message = { name: 'Alice' }
      expect(validateIncomingMessage(message)).toBe(false)
    })

    it('should reject message with non-string type', () => {
      const message = { type: 123 }
      expect(validateIncomingMessage(message)).toBe(false)
    })

    it('should reject unknown message type', () => {
      const message = { type: 'unknown' }
      expect(validateIncomingMessage(message)).toBe(false)
    })

    it('should reject null', () => {
      expect(validateIncomingMessage(null)).toBe(false)
    })

    it('should reject undefined', () => {
      expect(validateIncomingMessage(undefined)).toBe(false)
    })

    it('should reject non-object values', () => {
      expect(validateIncomingMessage('string')).toBe(false)
      expect(validateIncomingMessage(123)).toBe(false)
      expect(validateIncomingMessage([])).toBe(false)
    })

    it('should reject client-name without name property', () => {
      const message = { type: 'client-name' }
      expect(validateIncomingMessage(message)).toBe(false)
    })

    it('should reject client-name with non-string name', () => {
      const message = { type: 'client-name', name: 123 }
      expect(validateIncomingMessage(message)).toBe(false)
    })

    it('should reject attack without monsterId property', () => {
      const message = { type: 'attack' }
      expect(validateIncomingMessage(message)).toBe(false)
    })

    it('should reject attack with non-string monsterId', () => {
      const message = { type: 'attack', monsterId: 123 }
      expect(validateIncomingMessage(message)).toBe(false)
    })
  })

  describe('checkMessageSize', () => {
    it('should accept small messages', () => {
      const smallMessage = { type: 'ping' }
      expect(checkMessageSize(smallMessage)).toBe(true)
    })

    it('should accept messages within size limit', () => {
      const message = {
        type: 'client-name',
        name: 'SomeUser',
      }
      expect(checkMessageSize(message)).toBe(true)
    })

    it('should reject messages exceeding size limit', () => {
      const largeMessage = {
        data: 'x'.repeat(CONNECTION.MAX_MESSAGE_SIZE + 1),
      }
      expect(checkMessageSize(largeMessage)).toBe(false)
    })

    it('should accept messages at exact size limit', () => {
      // Create a message that's exactly at the limit
      const message = { type: 'ping' }
      const jsonString = JSON.stringify(message)
      // We need a message that serializes to exactly MAX_MESSAGE_SIZE bytes
      const padding = 'x'.repeat(CONNECTION.MAX_MESSAGE_SIZE - jsonString.length - 20)
      const atLimitMessage = { ...message, padding }
      const size = JSON.stringify(atLimitMessage).length
      if (size === CONNECTION.MAX_MESSAGE_SIZE) {
        expect(checkMessageSize(atLimitMessage)).toBe(true)
      }
    })

    it('should handle circular reference gracefully', () => {
      const circular: any = { type: 'ping' }
      circular.self = circular
      expect(checkMessageSize(circular)).toBe(false)
    })

    it('should accept null', () => {
      expect(checkMessageSize(null)).toBe(true)
    })

    it('should reject undefined in try/catch', () => {
      // JSON.stringify(undefined) throws an error in strict mode
      expect(checkMessageSize(undefined)).toBe(false)
    })

    it('should accept primitives', () => {
      expect(checkMessageSize('string')).toBe(true)
      expect(checkMessageSize(123)).toBe(true)
      expect(checkMessageSize(true)).toBe(true)
    })
  })

  describe('checkRateLimit', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should allow messages within rate limit', () => {
      const connection: ClientConnection = {
        conn: {} as DataConnection,
        name: 'Player1',
        messageCount: 0,
        lastMessageReset: Date.now(),
        lastActivity: Date.now(),
      }

      for (let i = 0; i < CONNECTION.MAX_MESSAGES_PER_SECOND; i++) {
        expect(checkRateLimit(connection)).toBe(true)
      }
    })

    it('should reject messages exceeding rate limit', () => {
      const connection: ClientConnection = {
        conn: {} as DataConnection,
        name: 'Player1',
        messageCount: 0,
        lastMessageReset: Date.now(),
        lastActivity: Date.now(),
      }

      // Max out the message count
      for (let i = 0; i < CONNECTION.MAX_MESSAGES_PER_SECOND; i++) {
        checkRateLimit(connection)
      }

      // Next message should be rejected
      expect(checkRateLimit(connection)).toBe(false)
    })

    it('should reset counter after 1 second', () => {
      const connection: ClientConnection = {
        conn: {} as DataConnection,
        name: 'Player1',
        messageCount: 0,
        lastMessageReset: Date.now(),
        lastActivity: Date.now(),
      }

      // Max out messages
      for (let i = 0; i < CONNECTION.MAX_MESSAGES_PER_SECOND; i++) {
        checkRateLimit(connection)
      }
      expect(checkRateLimit(connection)).toBe(false)

      // Advance time by 1 second
      vi.advanceTimersByTime(1000)

      // Should allow messages again
      expect(checkRateLimit(connection)).toBe(true)
    })

    it('should track message count correctly', () => {
      const connection: ClientConnection = {
        conn: {} as DataConnection,
        name: 'Player1',
        messageCount: 0,
        lastMessageReset: Date.now(),
        lastActivity: Date.now(),
      }

      expect(connection.messageCount).toBe(0)
      checkRateLimit(connection)
      expect(connection.messageCount).toBe(1)
      checkRateLimit(connection)
      expect(connection.messageCount).toBe(2)
    })
  })

  describe('sendToConnection', () => {
    it('should send message to open connection', () => {
      const mockConn = {
        open: true,
        send: vi.fn(),
      } as any as DataConnection

      const message: PongMessage = { type: 'pong' }
      const result = sendToConnection(mockConn, message)

      expect(result).toBe(true)
      expect(mockConn.send).toHaveBeenCalledWith(message)
    })

    it('should not send to closed connection', () => {
      const mockConn = {
        open: false,
        send: vi.fn(),
      } as any as DataConnection

      const message: PongMessage = { type: 'pong' }
      const result = sendToConnection(mockConn, message)

      expect(result).toBe(false)
      expect(mockConn.send).not.toHaveBeenCalled()
    })

    it('should handle send errors gracefully', () => {
      const mockConn = {
        open: true,
        send: vi.fn().mockImplementation(() => {
          throw new Error('Send failed')
        }),
      } as any as DataConnection

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const message: PongMessage = { type: 'pong' }
      const result = sendToConnection(mockConn, message)

      expect(result).toBe(false)
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })
  })

  describe('filterActiveConnections', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should keep active connections', () => {
      const mockConn1 = { close: vi.fn() } as any as DataConnection
      const mockConn2 = { close: vi.fn() } as any as DataConnection

      const connections: ClientConnection[] = [
        {
          conn: mockConn1,
          name: 'Player1',
          messageCount: 0,
          lastMessageReset: Date.now(),
          lastActivity: Date.now(),
        },
        {
          conn: mockConn2,
          name: 'Player2',
          messageCount: 0,
          lastMessageReset: Date.now(),
          lastActivity: Date.now(),
        },
      ]

      const result = filterActiveConnections(connections)

      expect(result).toHaveLength(2)
      expect(mockConn1.close).not.toHaveBeenCalled()
      expect(mockConn2.close).not.toHaveBeenCalled()
    })

    it('should remove inactive connections', () => {
      const mockConn1 = { close: vi.fn() } as any as DataConnection
      const mockConn2 = { close: vi.fn() } as any as DataConnection

      const now = Date.now()

      const connections: ClientConnection[] = [
        {
          conn: mockConn1,
          name: 'Player1',
          messageCount: 0,
          lastMessageReset: now,
          lastActivity: now - CONNECTION.CONNECTION_TIMEOUT_MS - 1000, // Timed out
        },
        {
          conn: mockConn2,
          name: 'Player2',
          messageCount: 0,
          lastMessageReset: now,
          lastActivity: now, // Active
        },
      ]

      const result = filterActiveConnections(connections)

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Player2')
      expect(mockConn1.close).toHaveBeenCalled()
      expect(mockConn2.close).not.toHaveBeenCalled()
    })

    it('should use custom timeout', () => {
      const mockConn = { close: vi.fn() } as any as DataConnection
      const customTimeout = 5000
      const now = Date.now()

      const connections: ClientConnection[] = [
        {
          conn: mockConn,
          name: 'Player1',
          messageCount: 0,
          lastMessageReset: now,
          lastActivity: now - customTimeout - 1000,
        },
      ]

      const result = filterActiveConnections(connections, customTimeout)

      expect(result).toHaveLength(0)
      expect(mockConn.close).toHaveBeenCalled()
    })

    it('should handle empty connections list', () => {
      const result = filterActiveConnections([])
      expect(result).toHaveLength(0)
    })
  })

  describe('buildBroadcastPayload', () => {
    it('should build payload with visible monsters', () => {
      const monsters = [
        {
          id: '1',
          name: 'Goblin',
          hp: 7,
          maxhp: 7,
          isHidden: false,
          conditions: [] as string[],
          number: 0,
        } as Monster,
      ]

      const payload = buildBroadcastPayload(monsters)

      expect(payload.enemies).toHaveLength(1)
      expect(payload.enemies[0]).toEqual({
        id: '1',
        name: 'Goblin',
        status: 'healthy',
        conditions: [],
      })
    })

    it('should exclude hidden monsters', () => {
      const monsters = [
        {
          id: '1',
          name: 'Goblin',
          hp: 7,
          maxhp: 7,
          isHidden: true,
          conditions: [] as string[],
          number: 0,
        } as Monster,
        {
          id: '2',
          name: 'Orc',
          hp: 15,
          maxhp: 15,
          isHidden: false,
          conditions: [] as string[],
          number: 0,
        } as Monster,
      ]

      const payload = buildBroadcastPayload(monsters)

      expect(payload.enemies).toHaveLength(1)
      expect(payload.enemies[0].name).toBe('Orc')
    })

    it('should include monster number in name', () => {
      const monsters = [
        {
          id: '1',
          name: 'Goblin',
          hp: 7,
          maxhp: 7,
          isHidden: false,
          conditions: [] as string[],
          number: 2,
        } as Monster,
      ]

      const payload = buildBroadcastPayload(monsters)

      expect(payload.enemies[0].name).toBe('Goblin 2')
    })

    it('should skip monster number when number is 0', () => {
      const monsters = [
        {
          id: '1',
          name: 'Goblin',
          hp: 7,
          maxhp: 7,
          isHidden: false,
          conditions: [] as string[],
          number: 0,
        } as Monster,
      ]

      const payload = buildBroadcastPayload(monsters)

      expect(payload.enemies[0].name).toBe('Goblin')
    })

    it('should calculate healthy status', () => {
      const monsters = [
        {
          id: '1',
          name: 'Goblin',
          hp: 7,
          maxhp: 10,
          isHidden: false,
          conditions: [] as string[],
          number: 0,
        } as Monster,
      ]

      const payload = buildBroadcastPayload(monsters)

      expect(payload.enemies[0].status).toBe('healthy')
    })

    it('should calculate injured status', () => {
      const monsters = [
        {
          id: '1',
          name: 'Goblin',
          hp: 5,
          maxhp: 10,
          isHidden: false,
          conditions: [] as string[],
          number: 0,
        } as Monster,
      ]

      const payload = buildBroadcastPayload(monsters)

      expect(payload.enemies[0].status).toBe('injured')
    })

    it('should calculate badly-injured status', () => {
      const monsters = [
        {
          id: '1',
          name: 'Goblin',
          hp: 2,
          maxhp: 10,
          isHidden: false,
          conditions: [] as string[],
          number: 0,
        } as Monster,
      ]

      const payload = buildBroadcastPayload(monsters)

      expect(payload.enemies[0].status).toBe('badly-injured')
    })

    it('should calculate down status', () => {
      const monsters = [
        {
          id: '1',
          name: 'Goblin',
          hp: 0,
          maxhp: 10,
          isHidden: false,
          conditions: [] as string[],
          number: 0,
        } as Monster,
      ]

      const payload = buildBroadcastPayload(monsters)

      expect(payload.enemies[0].status).toBe('down')
    })

    it('should include conditions in payload', () => {
      const monsters = [
        {
          id: '1',
          name: 'Goblin',
          hp: 7,
          maxhp: 10,
          isHidden: false,
          conditions: ['frightened', 'stunned'],
          number: 0,
        } as Monster,
      ]

      const payload = buildBroadcastPayload(monsters)

      expect(payload.enemies[0].conditions).toEqual(['frightened', 'stunned'])
    })

    it('should handle empty monsters list', () => {
      const payload = buildBroadcastPayload([])

      expect(payload.enemies).toHaveLength(0)
    })

    it('should handle multiple monsters', () => {
      const monsters = [
        {
          id: '1',
          detailIndex: 'goblin',
          maxhp: 10,
          hasDiedAlready: false,
          number: 1,
          name: 'Goblin',
          hp: 7,
          xp: 10,
          isHidden: false,
          conditions: [],
        } as Monster,
        {
          id: '2',
          detailIndex: 'orc',
          maxhp: 15,
          hasDiedAlready: false,
          number: 0,
          name: 'Orc',
          hp: 7,
          xp: 10,
          isHidden: false,
          conditions: [],
        } as Monster,
      ]

      const payload = buildBroadcastPayload(monsters)

      expect(payload.enemies).toHaveLength(2)
      expect(payload.enemies[0].name).toBe('Goblin 1')
      expect(payload.enemies[1].name).toBe('Orc')
    })
  })

  describe('broadcastToConnections', () => {
    it('should broadcast to all open connections', () => {
      const mockConn1 = { open: true, send: vi.fn() } as any as DataConnection
      const mockConn2 = { open: true, send: vi.fn() } as any as DataConnection

      const connections: ClientConnection[] = [
        {
          conn: mockConn1,
          name: 'Player1',
          messageCount: 0,
          lastMessageReset: Date.now(),
          lastActivity: Date.now(),
        },
        {
          conn: mockConn2,
          name: 'Player2',
          messageCount: 0,
          lastMessageReset: Date.now(),
          lastActivity: Date.now(),
        },
      ]

      const payload = { enemies: [] }
      broadcastToConnections(connections, payload)

      expect(mockConn1.send).toHaveBeenCalledWith(payload)
      expect(mockConn2.send).toHaveBeenCalledWith(payload)
    })

    it('should skip closed connections', () => {
      const mockConn1 = { open: true, send: vi.fn() } as any as DataConnection
      const mockConn2 = { open: false, send: vi.fn() } as any as DataConnection

      const connections: ClientConnection[] = [
        {
          conn: mockConn1,
          name: 'Player1',
          messageCount: 0,
          lastMessageReset: Date.now(),
          lastActivity: Date.now(),
        },
        {
          conn: mockConn2,
          name: 'Player2',
          messageCount: 0,
          lastMessageReset: Date.now(),
          lastActivity: Date.now(),
        },
      ]

      const payload = { enemies: [] }
      broadcastToConnections(connections, payload)

      expect(mockConn1.send).toHaveBeenCalledWith(payload)
      expect(mockConn2.send).not.toHaveBeenCalled()
    })

    it('should handle send errors gracefully', () => {
      const mockConn1 = { open: true, send: vi.fn() } as any as DataConnection
      const mockConn2 = {
        open: true,
        send: vi.fn().mockImplementation(() => {
          throw new Error('Send failed')
        }),
      } as any as DataConnection

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const connections: ClientConnection[] = [
        {
          conn: mockConn1,
          name: 'Player1',
          messageCount: 0,
          lastMessageReset: Date.now(),
          lastActivity: Date.now(),
        },
        {
          conn: mockConn2,
          name: 'Player2',
          messageCount: 0,
          lastMessageReset: Date.now(),
          lastActivity: Date.now(),
        },
      ]

      const payload = { enemies: [] }
      broadcastToConnections(connections, payload)

      expect(mockConn1.send).toHaveBeenCalledWith(payload)
      expect(mockConn2.send).toHaveBeenCalled()
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })

    it('should handle empty connections list', () => {
      const payload = { enemies: [] }
      expect(() => broadcastToConnections([], payload)).not.toThrow()
    })

    it('should broadcast to each connection independently', () => {
      const mockConn1 = { open: true, send: vi.fn() } as any as DataConnection
      const mockConn2 = { open: true, send: vi.fn() } as any as DataConnection
      const mockConn3 = { open: true, send: vi.fn() } as any as DataConnection

      const connections: ClientConnection[] = [
        {
          conn: mockConn1,
          name: 'Player1',
          messageCount: 0,
          lastMessageReset: Date.now(),
          lastActivity: Date.now(),
        },
        {
          conn: mockConn2,
          name: 'Player2',
          messageCount: 0,
          lastMessageReset: Date.now(),
          lastActivity: Date.now(),
        },
        {
          conn: mockConn3,
          name: 'Player3',
          messageCount: 0,
          lastMessageReset: Date.now(),
          lastActivity: Date.now(),
        },
      ]

      const payload = { type: 'broadcast', data: 'test' }
      broadcastToConnections(connections, payload)

      expect(mockConn1.send).toHaveBeenCalledTimes(1)
      expect(mockConn2.send).toHaveBeenCalledTimes(1)
      expect(mockConn3.send).toHaveBeenCalledTimes(1)
    })
  })
})
