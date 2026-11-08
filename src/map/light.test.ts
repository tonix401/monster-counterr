import { describe, expect, it } from 'vitest'
import { addPolyline, emptyGraph } from './graph'
import { lightPolygons, lightSources, visibilityPolygon, type Point } from './light'
import type { WallKind, WallSegment } from './types'

const inside = (poly: Point[], x: number, y: number): boolean => {
  let c = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]
    const [xj, yj] = poly[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c
  }
  return c
}

const wall = (x1: number, y1: number, x2: number, y2: number): WallSegment => ({ x1, y1, x2, y2 })

describe('visibilityPolygon', () => {
  it('is the whole circle in the open', () => {
    const p = visibilityPolygon(50, 50, 20, [])
    expect(inside(p, 60, 50)).toBe(true)
    expect(inside(p, 50, 69)).toBe(true)
    expect(inside(p, 72, 50)).toBe(false)
  })

  it('stops at a wall and leaves the far side dark', () => {
    const p = visibilityPolygon(50, 50, 30, [wall(60, 0, 60, 100)])
    expect(inside(p, 55, 50)).toBe(true)
    expect(inside(p, 65, 50)).toBe(false)
    expect(inside(p, 65, 60)).toBe(false)
  })

  it('shines through a gap in a wall, and only along the gap', () => {
    const wallsWithDoor = [wall(60, 0, 60, 45), wall(60, 55, 60, 100)]
    const p = visibilityPolygon(40, 50, 40, wallsWithDoor)
    expect(inside(p, 70, 50)).toBe(true)
    expect(inside(p, 70, 20)).toBe(false)
  })

  it('walks round the light once, whatever side the walls are on', () => {
    // walls above and to the left have negative angles from atan2; they must not jump the order
    const walls = [wall(20, 40, 30, 40), wall(10, 45, 10, 70), wall(60, 20, 90, 30)]
    const p = visibilityPolygon(50, 50, 45, walls)
    const turns = p.map(([x, y]) => (Math.atan2(y - 50, x - 50) + 2 * Math.PI) % (2 * Math.PI))
    for (let i = 1; i < turns.length; i++)
      expect(turns[i]).toBeGreaterThanOrEqual(turns[i - 1] - 1e-6)
    expect(inside(p, 75, 50)).toBe(true) // open ground to the right stays lit
  })

  it('ignores walls out of reach', () => {
    const p = visibilityPolygon(50, 50, 10, [wall(200, 0, 200, 100)])
    expect(inside(p, 58, 50)).toBe(true)
  })
})

describe('lightPolygons', () => {
  const wallAt = (kind: WallKind) =>
    addPolyline(
      emptyGraph(),
      [
        [60, 0],
        [60, 100],
      ],
      false,
      0,
      kind
    )

  it('is stopped by a solid wall and goes through a translucent one', () => {
    const src = [{ id: 'light:a', x: 50, y: 50, r: 30 }]
    expect(inside(lightPolygons(src, wallAt('solid'))[0], 70, 50)).toBe(false)
    expect(inside(lightPolygons(src, wallAt('clear'))[0], 70, 50)).toBe(true)
    expect(inside(lightPolygons(src, wallAt('furniture'))[0], 70, 50)).toBe(false)
  })
})

describe('lightSources', () => {
  it('measures reach in feet against the grid: 5 ft is one square', () => {
    const tokens = { 'light:a': { x: 1, y: 2 }, 'player:p': { x: 3, y: 4 }, goblin: { x: 5, y: 6 } }
    const s = lightSources(tokens, { 'light:a': 10 }, 40)
    expect(s).toEqual([
      { id: 'light:a', x: 1, y: 2, r: 80 },
      { id: 'player:p', x: 3, y: 4, r: 240 }, // 30 ft of sight by default
    ])
  })

  it('applies a drag in progress', () => {
    const s = lightSources({ 'light:a': { x: 1, y: 2 } }, {}, 10, { id: 'light:a', x: 9, ft: 15 })
    expect(s).toEqual([{ id: 'light:a', x: 9, y: 2, r: 30 }])
  })
})

describe('visibilityPolygon against plain line of sight', () => {
  const crosses = (ax: number, ay: number, bx: number, by: number, s: WallSegment): boolean => {
    const d1x = bx - ax
    const d1y = by - ay
    const d2x = s.x2 - s.x1
    const d2y = s.y2 - s.y1
    const den = d1x * d2y - d1y * d2x
    if (Math.abs(den) < 1e-12) return false
    const t = ((s.x1 - ax) * d2y - (s.y1 - ay) * d2x) / den
    const u = ((s.x1 - ax) * d1y - (s.y1 - ay) * d1x) / den
    return t > 0 && t < 1 && u >= 0 && u <= 1
  }

  it('lights exactly the points the light can see, walls crossing or not', () => {
    let seed = 7
    const rnd = (): number => (seed = (seed * 16807) % 2147483647) / 2147483647
    let wrong = 0
    let total = 0
    for (let trial = 0; trial < 120; trial++) {
      const walls: WallSegment[] = Array.from({ length: 12 }, () => ({
        x1: rnd() * 200,
        y1: rnd() * 200,
        x2: rnd() * 200,
        y2: rnd() * 200,
      }))
      const cx = rnd() * 200
      const cy = rnd() * 200
      const poly = visibilityPolygon(cx, cy, 150, walls)
      for (let k = 0; k < 100; k++) {
        const x = rnd() * 200
        const y = rnd() * 200
        if (Math.hypot(x - cx, y - cy) > 145) continue
        total++
        if (!walls.some((s) => crosses(cx, cy, x, y, s)) !== inside(poly, x, y)) wrong++
      }
    }
    // a point a hair from a wall's end may fall either way; anything beyond that is a bug
    expect(wrong / total).toBeLessThan(0.001)
  })
})
