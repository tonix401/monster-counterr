import { describe, expect, it } from 'vitest'
import { CONNECTION } from '@/constants'
import { parseMapMessage, parseTokensMessage } from './mapMessage'

describe('parseMapMessage', () => {
  it('accepts a map with an ArrayBuffer or Uint8Array picture', () => {
    expect(parseMapMessage({ type: 'map', name: 'Inn', image: new ArrayBuffer(10) })?.type).toBe(
      'map'
    )
    expect(parseMapMessage({ type: 'map', name: 'Inn', image: new Uint8Array(10) })?.type).toBe(
      'map'
    )
  })

  it('accepts a clear message', () => {
    expect(parseMapMessage({ type: 'map-clear' })).toEqual({ type: 'map-clear' })
  })

  it('rejects empty, oversized and wrongly typed pictures', () => {
    expect(parseMapMessage({ type: 'map', name: 'x', image: new ArrayBuffer(0) })).toBeNull()
    expect(
      parseMapMessage({
        type: 'map',
        name: 'x',
        image: new ArrayBuffer(CONNECTION.MAX_MAP_BYTES + 1),
      })
    ).toBeNull()
    expect(
      parseMapMessage({ type: 'map', name: 'x', image: 'data:image/png;base64,AA' })
    ).toBeNull()
    expect(parseMapMessage({ type: 'map', name: 5, image: new ArrayBuffer(4) })).toBeNull()
  })

  it('ignores encounter payloads and junk', () => {
    expect(parseMapMessage({ enemies: [] })).toBeNull()
    expect(parseMapMessage(null)).toBeNull()
    expect(parseMapMessage('map')).toBeNull()
  })
})

describe('parseTokensMessage', () => {
  const good = { x: 5, y: 6, initials: 'AR', status: 'injured' }

  it('accepts tokens and drops malformed entries', () => {
    const out = parseTokensMessage({
      type: 'map-tokens',
      width: 100,
      height: 80,
      tokens: [
        good,
        { x: 'a', y: 1, initials: 'X', status: 'healthy' },
        { ...good, status: 'dead' },
        null,
      ],
    })
    expect(out?.tokens).toEqual([good])
  })

  it('rejects other messages and missing sizes', () => {
    expect(parseTokensMessage({ type: 'map-clear' })).toBeNull()
    expect(parseTokensMessage({ type: 'map-tokens', width: 0, height: 5, tokens: [] })).toBeNull()
    expect(parseTokensMessage({ type: 'map-tokens', width: 5, height: 5 })).toBeNull()
  })
})
