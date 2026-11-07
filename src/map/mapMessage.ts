import { CONNECTION } from '@/constants'
import type { PlayerToken } from './tokens'

export type ParsedMapMessage =
  | { type: 'map'; name: string; image: ArrayBuffer | Uint8Array }
  | { type: 'map-clear' }

/** Checks a host message that claims to carry a map; anything malformed or oversized is rejected. */
export function parseMapMessage(data: unknown): ParsedMapMessage | null {
  if (!data || typeof data !== 'object') return null
  const msg = data as Record<string, unknown>
  if (msg.type === 'map-clear') return { type: 'map-clear' }
  if (msg.type !== 'map') return null
  const image = msg.image
  const size =
    image instanceof ArrayBuffer
      ? image.byteLength
      : image instanceof Uint8Array
        ? image.byteLength
        : 0
  if (typeof msg.name !== 'string' || msg.name.length > 200) return null
  if (size === 0 || size > CONNECTION.MAX_MAP_BYTES) return null
  return { type: 'map', name: msg.name, image: image as ArrayBuffer | Uint8Array }
}

/** The monsters players may see on the map, in the pixels of the picture they were sent */
export interface TokensMessage {
  type: 'map-tokens'
  width: number
  height: number
  tokens: PlayerToken[]
}

const MAX_TOKENS = 200
const STATUSES = ['player', 'healthy', 'injured', 'badly-injured', 'down']

/** Checks a host message that claims to carry tokens; malformed entries are dropped, not trusted. */
export function parseTokensMessage(data: unknown): TokensMessage | null {
  if (!data || typeof data !== 'object') return null
  const msg = data as Record<string, unknown>
  if (msg.type !== 'map-tokens') return null
  const width = Number(msg.width)
  const height = Number(msg.height)
  if (!(width > 0) || !(height > 0) || !Array.isArray(msg.tokens)) return null
  const tokens = msg.tokens
    .slice(0, MAX_TOKENS)
    .filter((t): t is PlayerToken => {
      if (!t || typeof t !== 'object') return false
      const o = t as Record<string, unknown>
      return (
        Number.isFinite(o.x) &&
        Number.isFinite(o.y) &&
        typeof o.initials === 'string' &&
        o.initials.length > 0 &&
        o.initials.length <= 8 &&
        STATUSES.includes(o.status as string)
      )
    })
    .map((t) => ({ x: t.x, y: t.y, initials: t.initials, status: t.status }))
  return { type: 'map-tokens', width, height, tokens }
}
