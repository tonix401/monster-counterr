/**
 * Peer-to-peer wire protocol shared by the host and client sides.
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

/** Messages a client sends to the host. */
export type ClientToHostMessage = PingMessage | ClientNameMessage | AttackMessage

/** Messages the host sends to a client. */
export type HostToClientMessage = PongMessage

/** Maximum accepted length of a client name in a `client-name` message. */
export const MAX_CLIENT_NAME_LENGTH = 50
