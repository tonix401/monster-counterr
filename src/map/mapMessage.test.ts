import { describe, expect, it } from 'vitest'
import { CONNECTION } from '@/constants'
import { parseMapMessage } from './mapMessage'

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
