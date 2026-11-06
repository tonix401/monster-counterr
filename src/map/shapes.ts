import type { MapOp, ShapeKind, ShapeOp, WallOp, WallSegment } from './types'

export type DrawnOp = WallOp | ShapeOp

export const isDrawn = (op: MapOp): op is DrawnOp => op.type === 'wall' || op.type === 'shape'

const ELLIPSE_STEPS = 48

/** The outline of a drawn item as straight segments. */
export function opSegments(op: DrawnOp): WallSegment[] {
  if (op.type === 'wall') return [op]
  const x1 = Math.min(op.x1, op.x2)
  const x2 = Math.max(op.x1, op.x2)
  const y1 = Math.min(op.y1, op.y2)
  const y2 = Math.max(op.y1, op.y2)
  const poly: [number, number][] =
    op.kind === 'rect'
      ? [
          [x1, y1],
          [x2, y1],
          [x2, y2],
          [x1, y2],
        ]
      : op.kind === 'tri'
        ? [
            [(x1 + x2) / 2, y1],
            [x2, y2],
            [x1, y2],
          ]
        : Array.from({ length: ELLIPSE_STEPS }, (_, i) => {
            const a = (i / ELLIPSE_STEPS) * Math.PI * 2
            return [
              (x1 + x2) / 2 + (Math.cos(a) * (x2 - x1)) / 2,
              (y1 + y2) / 2 + (Math.sin(a) * (y2 - y1)) / 2,
            ] as [number, number]
          })
  return poly.map((p, i) => {
    const q = poly[(i + 1) % poly.length]
    return { x1: p[0], y1: p[1], x2: q[0], y2: q[1] }
  })
}

export function distToSegment(x: number, y: number, s: WallSegment): number {
  const dx = s.x2 - s.x1
  const dy = s.y2 - s.y1
  const len = dx * dx + dy * dy
  const t = len ? Math.max(0, Math.min(1, ((x - s.x1) * dx + (y - s.y1) * dy) / len)) : 0
  return Math.hypot(s.x1 + t * dx - x, s.y1 + t * dy - y)
}

export type Hit = { src: 'op'; op: DrawnOp } | { src: 'auto'; seg: WallSegment }

/** The drawn item or detected wall closest to the point, within `tol`; drawn items win ties. */
export function hitTest(
  x: number,
  y: number,
  tol: number,
  ops: MapOp[],
  auto: WallSegment[]
): Hit | null {
  let best: Hit | null = null
  let bd = tol
  for (let i = ops.length - 1; i >= 0; i--) {
    const op = ops[i]
    if (!isDrawn(op)) continue
    for (const s of opSegments(op)) {
      const d = distToSegment(x, y, s)
      if (d <= bd) {
        bd = d - 1e-6
        best = { src: 'op', op }
      }
    }
  }
  for (const seg of auto) {
    const d = distToSegment(x, y, seg)
    if (d < bd) {
      bd = d
      best = { src: 'auto', seg }
    }
  }
  return best
}

export function translateOp<T extends DrawnOp>(op: T, dx: number, dy: number): T {
  return { ...op, x1: op.x1 + dx, y1: op.y1 + dy, x2: op.x2 + dx, y2: op.y2 + dy }
}

/** Handle positions: the two ends of a line, or the four corners of a shape's box. */
export function handles(op: DrawnOp): [number, number][] {
  if (op.type === 'wall')
    return [
      [op.x1, op.y1],
      [op.x2, op.y2],
    ]
  const x1 = Math.min(op.x1, op.x2)
  const x2 = Math.max(op.x1, op.x2)
  const y1 = Math.min(op.y1, op.y2)
  const y2 = Math.max(op.y1, op.y2)
  return [
    [x1, y1],
    [x2, y1],
    [x2, y2],
    [x1, y2],
  ]
}

/** Drags one handle to a new position; the opposite corner of a shape stays put. */
export function moveHandle<T extends DrawnOp>(op: T, index: number, x: number, y: number): T {
  if (op.type === 'wall') return index === 0 ? { ...op, x1: x, y1: y } : { ...op, x2: x, y2: y }
  const h = handles(op)
  const [ox, oy] = h[(index + 2) % 4]
  return {
    ...op,
    x1: Math.min(x, ox),
    y1: Math.min(y, oy),
    x2: Math.max(x, ox),
    y2: Math.max(y, oy),
  }
}

export const SHAPE_KINDS: ShapeKind[] = ['rect', 'tri', 'circle']

/** Forces a drag box to a square (Shift while drawing a shape). */
export function squareTo(x1: number, y1: number, x2: number, y2: number): [number, number] {
  const d = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1))
  return [x1 + Math.sign(x2 - x1 || 1) * d, y1 + Math.sign(y2 - y1 || 1) * d]
}

const near = (a: number, b: number): boolean => Math.abs(a - b) < 1.5

export const sameSegment = (a: WallSegment, b: WallSegment): boolean =>
  (near(a.x1, b.x1) && near(a.y1, b.y1) && near(a.x2, b.x2) && near(a.y2, b.y2)) ||
  (near(a.x1, b.x2) && near(a.y1, b.y2) && near(a.x2, b.x1) && near(a.y2, b.y1))
