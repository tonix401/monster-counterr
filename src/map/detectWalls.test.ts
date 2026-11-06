import { describe, expect, it } from 'vitest'
import { DetectCache, detectWalls, splitAtJunctions } from './detectWalls'
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

describe('slanted buildings', () => {
  it('finds the four walls of a square turned by 35 degrees', () => {
    const g = canvas()
    const t = (35 * Math.PI) / 180
    const c = { x: 400, y: 300 }
    const h = 130
    const corner = (sx: number, sy: number): [number, number] => [
      c.x + sx * h * Math.cos(t) - sy * h * Math.sin(t),
      c.y + sx * h * Math.sin(t) + sy * h * Math.cos(t),
    ]
    const pts = [corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1)]
    const dist = (x: number, y: number): number =>
      Math.min(
        ...pts.map(([ax, ay], i) => {
          const [bx, by] = pts[(i + 1) % 4]
          const u = Math.max(
            0,
            Math.min(
              1,
              ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2)
            )
          )
          return Math.hypot(x - (ax + u * (bx - ax)), y - (ay + u * (by - ay)))
        })
      )
    for (let y = 100; y < 520; y++)
      for (let x = 190; x < 620; x++) {
        const k = Math.max(0, Math.min(1, 3.5 - dist(x, y)))
        g[y * W + x] = 50 + 180 * k
      }
    const segs = detectWalls(g, W, H, params)
    const slanted = segs.filter((s) => {
      const dx = Math.abs(s.x2 - s.x1)
      const dy = Math.abs(s.y2 - s.y1)
      return Math.min(dx, dy) > 0.3 * Math.max(dx, dy)
    })
    expect(slanted.length).toBeGreaterThanOrEqual(3)
    // every slanted segment lies on the drawn outline (within a few pixels at both ends)
    for (const s of slanted) {
      for (const [x, y] of [
        [s.x1, s.y1],
        [s.x2, s.y2],
      ]) {
        const near = Math.min(
          ...pts.map(([ax, ay], i) => {
            const [bx, by] = pts[(i + 1) % 4]
            const u = Math.max(
              0,
              Math.min(
                1,
                ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2)
              )
            )
            return Math.hypot(x - (ax + u * (bx - ax)), y - (ay + u * (by - ay)))
          })
        )
        expect(near).toBeLessThan(8)
      }
    }
  })

  it('leaves axis-aligned maps without slanted walls', () => {
    const g = canvas()
    rect(g, 100, 100, 600, 103, 230)
    rect(g, 100, 400, 600, 403, 230)
    rect(g, 100, 100, 103, 403, 230)
    rect(g, 600, 100, 603, 403, 230)
    for (const s of detectWalls(g, W, H, params)) expect(s.x1 === s.x2 || s.y1 === s.y2).toBe(true)
  })
})

describe('DetectCache', () => {
  it('gives the same walls as a fresh run, for every setting it is reused with', () => {
    const g = canvas()
    rect(g, 100, 100, 500, 104, 230)
    rect(g, 100, 300, 500, 304, 230)
    rect(g, 100, 100, 104, 304, 230)
    rect(g, 496, 100, 500, 304, 230)
    // a building turned by 35 degrees
    const t = (35 * Math.PI) / 180
    for (let s = -120; s <= 120; s++)
      for (const [u, v] of [
        [s, -120],
        [s, 120],
        [-120, s],
        [120, s],
      ])
        for (let d = 0; d < 4; d++)
          g[
            Math.round(300 + u * Math.sin(t) + v * Math.cos(t) + d) * W +
              Math.round(560 + u * Math.cos(t) - v * Math.sin(t))
          ] = 230
    const cache = new DetectCache()
    for (const sensitivity of [params.sensitivity, 12, 25]) {
      const p = { ...params, sensitivity }
      expect(detectWalls(g, W, H, p, cache)).toEqual(detectWalls(g, W, H, p))
    }
    expect(cache.turned.size).toBeGreaterThan(0)
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

describe('splitAtJunctions', () => {
  it('cuts a wall where another wall crosses or ends on it', () => {
    const out = splitAtJunctions(
      [
        { x1: 0, y1: 100, x2: 400, y2: 100 },
        { x1: 100, y1: 0, x2: 100, y2: 100 }, // ends on it (T)
        { x1: 300, y1: 50, x2: 300, y2: 200 }, // crosses it
      ],
      800
    )
    const horiz = out.filter((s) => s.y1 === s.y2)
    expect(horiz.map((s) => [s.x1, s.x2])).toEqual([
      [0, 100],
      [100, 300],
      [300, 400],
    ])
    expect(out.filter((s) => s.x1 === s.x2)).toHaveLength(3) // the crossing wall is cut too
  })

  it('trims a short stub poking out past a wall that runs on', () => {
    const out = splitAtJunctions(
      [
        { x1: 0, y1: 100, x2: 400, y2: 100 },
        { x1: 200, y1: 20, x2: 200, y2: 106 }, // 6px overhang, under the minimum piece length
      ],
      800
    )
    const vert = out.filter((s) => s.x1 === s.x2)
    expect(vert).toHaveLength(1)
    expect(vert[0].y2).toBeCloseTo(100)
  })

  it('leaves parallel and free-standing walls whole', () => {
    const segs = [
      { x1: 0, y1: 100, x2: 400, y2: 100 },
      { x1: 0, y1: 160, x2: 400, y2: 160 },
    ]
    expect(splitAtJunctions(segs, 800)).toEqual(segs)
  })
})
