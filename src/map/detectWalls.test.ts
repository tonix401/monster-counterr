import { describe, expect, it } from 'vitest'
import { detectWalls } from './detectWalls'
import { dropSlivers, mergeDoubles, rejectStacks, type Line } from './wallFilters'

const W = 800
const H = 600
const params = { sensitivity: 40 - 70 * 0.32, minLen: 0.06, gap: 0.065 }

function canvas(): Float32Array {
  return new Float32Array(W * H).fill(50)
}

function rect(g: Float32Array, x0: number, y0: number, x1: number, y1: number, v: number): void {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) g[y * W + x] = v
}

describe('detectWalls', () => {
  it('collapses a thick wall drawn as two bright edges into one centerline', () => {
    const g = canvas()
    // wall from x=100..800 at y 300..316 with a 2px bright outline on both long edges
    rect(g, 100, 300, 700, 301, 230)
    rect(g, 100, 315, 700, 316, 230)
    rect(g, 100, 302, 700, 314, 110)
    const segs = detectWalls(g, W, H, params).filter((s) => s.y1 === s.y2)
    expect(segs).toHaveLength(1)
    expect(Math.abs(segs[0].y1 - 308)).toBeLessThanOrEqual(4)
    expect(segs[0].x2 - segs[0].x1).toBeGreaterThan(500)
  })

  it('reports both edges when the merge is switched off (guards the test above)', () => {
    const g = canvas()
    rect(g, 100, 300, 700, 301, 230)
    rect(g, 100, 315, 700, 316, 230)
    rect(g, 100, 302, 700, 314, 110)
    const segs = detectWalls(g, W, H, { ...params, thickness: 0 }).filter((s) => s.y1 === s.y2)
    expect(segs.length).toBeGreaterThan(1)
  })

  it('does not report a staircase (a stack of short parallel treads) as walls', () => {
    const g = canvas()
    for (let i = 0; i < 8; i++) rect(g, 300, 200 + i * 14, 440, 202 + i * 14, 220)
    expect(detectWalls(g, W, H, params)).toHaveLength(0)
  })
})

describe('wall filters', () => {
  const line = (pos: number, a: number, b: number): Line => [pos, a, b, 1, 1, 100]

  it('merges close parallel edges and keeps distant walls apart', () => {
    const out = mergeDoubles([line(100, 0, 400), line(112, 0, 400), line(300, 0, 400)], 20)
    expect(out.map((l) => l[0]).sort((a, b) => a - b)).toEqual([106, 300])
  })

  it('rejects stacks of four or more short parallel lines but keeps long ones', () => {
    const treads = [0, 1, 2, 3].map((i) => line(100 + i * 12, 50, 200))
    expect(rejectStacks(treads, 30, 500)).toHaveLength(0)
    expect(rejectStacks([...treads, line(160, 0, 900)], 30, 500)).toHaveLength(1)
  })

  it('drops a short line running right beside a longer one', () => {
    const out = dropSlivers([line(100, 0, 400), line(130, 50, 250)], 50)
    expect(out).toHaveLength(1)
    expect(out[0][0]).toBe(100)
  })
})
