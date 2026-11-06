import { describe, expect, it } from 'vitest'
import { Analyzer, rasterizeWalls } from './analyze'
import {
  bakeErasures,
  handles,
  hitTest,
  moveHandle,
  opSegments,
  rotateHandle,
  rotateTo,
  translateOp,
  polygonWalls,
  triangleWalls,
} from './shapes'
import type { ShapeOp, WallOp } from './types'

const rect: ShapeOp = { type: 'shape', kind: 'rect', id: 1, x1: 10, y1: 10, x2: 50, y2: 30 }

describe('shapes', () => {
  it('outlines each kind', () => {
    expect(opSegments(rect)).toHaveLength(4)
    expect(opSegments({ ...rect, kind: 'circle' }).length).toBeGreaterThan(16)
  })

  it('hit-tests the nearest item and prefers drawn items over detected walls', () => {
    const wall: WallOp = { type: 'wall', id: 2, x1: 0, y1: 100, x2: 80, y2: 100 }
    const auto = [{ x1: 0, y1: 100, x2: 80, y2: 100 }]
    expect(hitTest(30, 11, 4, [rect, wall], auto)).toMatchObject({ src: 'op', op: { id: 1 } })
    expect(hitTest(30, 101, 4, [rect, wall], auto)).toMatchObject({ src: 'op', op: { id: 2 } })
    expect(hitTest(30, 101, 4, [rect], auto)).toMatchObject({ src: 'auto' })
    expect(hitTest(30, 20, 4, [rect], [])).toBeNull()
  })

  it('moves and resizes', () => {
    expect(translateOp(rect, 5, -5)).toMatchObject({ x1: 15, y1: 5, x2: 55, y2: 25 })
    // dragging the top-left corner past the opposite one flips the box instead of inverting it
    expect(moveHandle(rect, 0, 70, 40)).toMatchObject({ x1: 50, y1: 30, x2: 70, y2: 40 })
    expect(handles(rect)).toHaveLength(4)
    expect(moveHandle({ type: 'wall', x1: 0, y1: 0, x2: 5, y2: 5 }, 1, 9, 9)).toMatchObject({
      x2: 9,
    })
  })

  it('converts a saved triangle to its three lines', () => {
    expect(triangleWalls({ x1: 50, y1: 30, x2: 10, y2: 10 })).toEqual([
      { type: 'wall', x1: 30, y1: 10, x2: 50, y2: 30 },
      { type: 'wall', x1: 50, y1: 30, x2: 10, y2: 30 },
      { type: 'wall', x1: 10, y1: 30, x2: 30, y2: 10 },
    ])
    const turned = triangleWalls({ x1: 0, y1: 0, x2: 20, y2: 20 }, Math.PI)
    expect(turned[0].x1).toBeCloseTo(10)
    expect(turned[0].y1).toBeCloseTo(20)
  })

  it('rotates a shape about its centre', () => {
    const turned = { ...rect, rot: Math.PI / 2 } // 40 x 20 box centred on (30, 20)
    const xs = opSegments(turned).flatMap((s) => [s.x1, s.x2])
    const ys = opSegments(turned).flatMap((s) => [s.y1, s.y2])
    expect(Math.min(...xs)).toBeCloseTo(20)
    expect(Math.max(...xs)).toBeCloseTo(40)
    expect(Math.min(...ys)).toBeCloseTo(0)
    expect(Math.max(...ys)).toBeCloseTo(40)
    // the rotate handle follows the top side round to the right
    const [rx, ry] = rotateHandle(turned, 10)
    expect(rx).toBeCloseTo(50)
    expect(ry).toBeCloseTo(20)
    // dragging it straight above gives no rotation, and a small turn snaps to 15 degrees
    expect(rotateTo(rect, 30, -50).rot).toBeCloseTo(0)
    expect(
      rotateTo(rect, 30 + 10 * Math.sin(0.2), 20 - 10 * Math.cos(0.2), Math.PI / 12).rot
    ).toBeCloseTo(Math.PI / 12)
  })

  it('resizes a turned shape from one corner while the opposite corner stays put', () => {
    const turned = { ...rect, rot: Math.PI / 6 }
    const h = handles(turned)
    const moved = moveHandle(turned, 2, h[2][0] + 8, h[2][1] + 3)
    const nh = handles(moved)
    expect(nh[0][0]).toBeCloseTo(h[0][0])
    expect(nh[0][1]).toBeCloseTo(h[0][1])
    expect(nh[2][0]).toBeCloseTo(h[2][0] + 8)
    expect(nh[2][1]).toBeCloseTo(h[2][1] + 3)
  })

  it('leaves a polyline open unless it is closed', () => {
    const pts: [number, number][] = [
      [0, 0],
      [40, 0],
      [40, 30],
    ]
    expect(polygonWalls(pts, false)).toHaveLength(2)
    expect(polygonWalls(pts)).toHaveLength(3)
    expect(polygonWalls([[0, 0]], false)).toEqual([])
  })

  it('splits a polygon into one independent line per side', () => {
    const walls = polygonWalls([
      [0, 0],
      [40, 0],
      [40, 30],
      [10, 50],
    ])
    expect(walls).toHaveLength(4)
    expect(walls[3]).toEqual({ type: 'wall', x1: 10, y1: 50, x2: 0, y2: 0 })
    // each side can be picked, moved and resized without touching the others
    const sides = walls.map((w, i) => ({ ...w, id: i + 1 }))
    expect(hitTest(20, 1, 3, sides, [])).toMatchObject({ src: 'op', op: { id: 1 } })
    expect(moveHandle(sides[1], 1, 60, 60)).toMatchObject({ x2: 60, y2: 60 })
    expect(sides[2]).toMatchObject({ x1: 40, y1: 30 })
  })

  it('rasterizes shapes as walls and hides cut detected walls', () => {
    const w = rasterizeWalls(100, 100, [], [rect])
    expect(w[20 * 100 + 10]).toBe(1)
    expect(w[20 * 100 + 30]).toBe(0)
    const a = new Analyzer()
    a.load(new Float32Array(100 * 100).fill(255), 100, 100)
    const seg = { x1: 5, y1: 50, x2: 95, y2: 50 }
    ;(a as unknown as { auto: unknown }).auto = [seg]
    expect(a.run({ detect: undefined, ops: [], minRoom: 0.2 }).auto).toHaveLength(1)
    expect(
      a.run({ detect: undefined, ops: [{ type: 'cut', id: 3, ...seg }], minRoom: 0.2 }).auto
    ).toHaveLength(0)
  })
})

describe('bakeErasures', () => {
  it('cuts the brushed part out of a wall and keeps shapes the brush misses', () => {
    const wall: WallOp = { type: 'wall', x1: 0, y1: 10, x2: 100, y2: 10 }
    const out = bakeErasures([wall, rect, { type: 'erase', w: 20, pts: [[70, 10]] }])
    const walls = out.filter((o) => o.type === 'wall')
    expect(walls).toHaveLength(2)
    expect(walls[0]).toMatchObject({ x1: 0 })
    expect(walls[0].x2 as number).toBeLessThan(61)
    expect(walls[1]).toMatchObject({ x2: 100 })
    expect(out).toContain(rect)
  })
})
