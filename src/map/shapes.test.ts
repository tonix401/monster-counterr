import { describe, expect, it } from 'vitest'
import { Analyzer, rasterizeWalls } from './analyze'
import { handles, hitTest, moveHandle, opSegments, translateOp } from './shapes'
import type { ShapeOp, WallOp } from './types'

const rect: ShapeOp = { type: 'shape', kind: 'rect', id: 1, x1: 10, y1: 10, x2: 50, y2: 30 }

describe('shapes', () => {
  it('outlines each kind', () => {
    expect(opSegments(rect)).toHaveLength(4)
    expect(opSegments({ ...rect, kind: 'tri' })).toHaveLength(3)
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
