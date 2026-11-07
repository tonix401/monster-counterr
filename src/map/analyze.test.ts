import { describe, expect, it } from 'vitest'
import { Analyzer } from './analyze'
import type { WallSegment } from './types'

const W = 400
const H = 300

/** A house outline with one dividing wall: two rooms side by side, 40px of outside around them */
const house: WallSegment[] = [
  { x1: 40, y1: 40, x2: 360, y2: 40 },
  { x1: 40, y1: 260, x2: 360, y2: 260 },
  { x1: 40, y1: 40, x2: 40, y2: 260 },
  { x1: 360, y1: 40, x2: 360, y2: 260 },
  { x1: 200, y1: 40, x2: 200, y2: 260 },
]

describe('Analyzer', () => {
  /** Dark floor with the house drawn as bright 5px bands, the way a battle map shows walls */
  function drawHouse(): Float32Array {
    const g = new Float32Array(W * H).fill(60)
    for (const s of house)
      for (let y = Math.min(s.y1, s.y2) - 2; y <= Math.max(s.y1, s.y2) + 2; y++)
        for (let x = Math.min(s.x1, s.x2) - 2; x <= Math.max(s.x1, s.x2) + 2; x++)
          g[y * W + x] = 230
    return g
  }

  it('detects straight walls in an image', () => {
    const a = new Analyzer()
    a.load(drawHouse(), W, H)
    const found = a.detect({ sensitivity: 40 - 70 * 0.32, minLen: 0.06, gap: 0.065 })
    expect(found.length).toBeGreaterThanOrEqual(5)
  })
})
