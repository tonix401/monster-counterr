import { describe, expect, it } from 'vitest'
import { cloudFog } from './fogShade'

const W = 120
const H = 80

function room(x0: number, x1: number): Uint8Array {
  const m = new Uint8Array(W * H)
  for (let y = 20; y < 60; y++) for (let x = x0; x < x1; x++) m[y * W + x] = 1
  return m
}

describe('cloudFog', () => {
  const mask = room(40, 80)
  const { alpha, grey } = cloudFog(mask, W, H, 3)

  it('covers the whole room', () => {
    for (let i = 0; i < mask.length; i++) if (mask[i]) expect(alpha[i]).toBeGreaterThan(220)
  })

  it('leaves faraway places clear and drifts a little past the border', () => {
    expect(alpha[40 * W + 5]).toBe(0)
    expect(alpha[40 * W + 115]).toBe(0)
    let outside = 0
    for (let y = 20; y < 60; y++)
      for (let x = 30; x < 40; x++) outside += alpha[y * W + x] > 0 ? 1 : 0
    expect(outside).toBeGreaterThan(0)
    // nothing creeps further than a few blur radii
    for (let y = 0; y < H; y++) expect(alpha[y * W + 20]).toBe(0)
  })

  it('has ragged, not straight, edges and is repeatable', () => {
    const reach = (a: Uint8Array): number[] =>
      Array.from({ length: 40 }, (_, k) => {
        let x = 39
        while (x > 20 && a[(20 + k) * W + x - 1] > 0) x--
        return x
      })
    expect(new Set(reach(alpha)).size).toBeGreaterThan(1)
    expect(Array.from(cloudFog(mask, W, H, 3).alpha)).toEqual(Array.from(alpha))
    expect(new Set(grey).size).toBeGreaterThan(5)
  })
})
