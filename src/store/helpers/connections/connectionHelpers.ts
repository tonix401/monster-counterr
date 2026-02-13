import type { DataConnection } from 'peerjs'
import type { Monster } from '@/types/Monster'
import type { ClientConnection } from '@/store/types'
import { CONNECTION } from '@/constants'

/**
 * Connection validation helpers
 */

export interface PingMessage {
  type: 'ping'
}

export interface PongMessage {
  type: 'pong'
}

export interface ClientNameMessage {
  type: 'client-name'
  name: string
}

export interface AttackMessage {
  type: 'attack'
  monsterId: string
}

export type IncomingMessage = PingMessage | ClientNameMessage | AttackMessage
export type OutgoingMessage = PongMessage

/**
 * Validate incoming message structure and content
 */
export function validateIncomingMessage(data: unknown): data is IncomingMessage {
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

/**
 * Check if message size is within limits
 */
export function checkMessageSize(data: unknown): boolean {
  try {
    const size = JSON.stringify(data).length
    return size <= CONNECTION.MAX_MESSAGE_SIZE
  } catch {
    return false
  }
}

/**
 * Check rate limit for a connection
 */
export function checkRateLimit(connection: ClientConnection): boolean {
  const now = Date.now()
  // Reset counter every second
  if (now - connection.lastMessageReset >= 1000) {
    connection.messageCount = 0
    connection.lastMessageReset = now
  }

  connection.messageCount++
  return connection.messageCount <= CONNECTION.MAX_MESSAGES_PER_SECOND
}

/**
 * Send message to a DataConnection
 */
export function sendToConnection(conn: DataConnection, message: OutgoingMessage): boolean {
  if (!conn.open) return false

  try {
    conn.send(message)
    return true
  } catch (error) {
    console.error('Error sending message to client:', error)
    return false
  }
}

/**
 * Filter out inactive connections based on timeout
 */
export function filterActiveConnections(
  connections: ClientConnection[],
  timeoutMs: number = CONNECTION.CONNECTION_TIMEOUT_MS
): ClientConnection[] {
  const now = Date.now()
  const activeConnections: ClientConnection[] = []

  connections.forEach((conn) => {
    const isAlive = now - conn.lastActivity < timeoutMs
    if (!isAlive) {
      console.log('Removing inactive connection:', conn.name)
      conn.conn.close()
    } else {
      activeConnections.push(conn)
    }
  })

  return activeConnections
}

/**
 * Build broadcast payload from monsters
 */
export function buildBroadcastPayload(monsters: Monster[]) {
  return {
    enemies: monsters
      .filter((m) => !m.isHidden)
      .map((m) => {
        let status: 'healthy' | 'injured' | 'badly-injured' | 'down'
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
}

/**
 * Broadcast payload to all active connections
 */
export function broadcastToConnections(connections: ClientConnection[], payload: unknown): void {
  connections.forEach(({ conn }) => {
    if (conn.open) {
      try {
        conn.send(payload)
      } catch (error) {
        console.error('Error broadcasting to connection:', error)
      }
    }
  })
}
