import { CONNECTION } from '@/constants'

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
