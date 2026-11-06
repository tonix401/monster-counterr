import type { EraseOp, MapOp, ShapeKind, ShapeOp, WallOp, WallSegment } from './types'

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
  const pts = op.rot
    ? poly.map((p) => turn(p[0], p[1], (x1 + x2) / 2, (y1 + y2) / 2, op.rot!))
    : poly
  return pts.map((p, i) => {
    const q = pts[(i + 1) % pts.length]
    return { x1: p[0], y1: p[1], x2: q[0], y2: q[1] }
  })
}

/** The point turned by `a` radians about (cx, cy) */
function turn(x: number, y: number, cx: number, cy: number, a: number): [number, number] {
  const c = Math.cos(a)
  const s = Math.sin(a)
  return [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c]
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
  const corners: [number, number][] = [
    [x1, y1],
    [x2, y1],
    [x2, y2],
    [x1, y2],
  ]
  return op.rot
    ? corners.map((c) => turn(c[0], c[1], (x1 + x2) / 2, (y1 + y2) / 2, op.rot!))
    : corners
}

/** Where the rotate handle of a shape sits: `off` beyond the middle of its top side */
export function rotateHandle(op: ShapeOp, off: number): [number, number] {
  const cx = (op.x1 + op.x2) / 2
  const cy = (op.y1 + op.y2) / 2
  const top = Math.min(op.y1, op.y2)
  return turn(cx, top - off, cx, cy, op.rot ?? 0)
}

/** Turns a shape so its rotate handle points at (x, y); `step` (radians) snaps the angle. */
export function rotateTo<T extends ShapeOp>(op: T, x: number, y: number, step = 0): T {
  const cx = (op.x1 + op.x2) / 2
  const cy = (op.y1 + op.y2) / 2
  let a = Math.atan2(y - cy, x - cx) + Math.PI / 2
  if (step) a = Math.round(a / step) * step
  return { ...op, rot: a }
}

/** Drags one handle to a new position; the opposite corner of a shape stays put. */
export function moveHandle<T extends DrawnOp>(op: T, index: number, x: number, y: number): T {
  if (op.type === 'wall') return index === 0 ? { ...op, x1: x, y1: y } : { ...op, x2: x, y2: y }
  const [ox, oy] = handles(op)[(index + 2) % 4]
  if (!op.rot)
    return {
      ...op,
      x1: Math.min(x, ox),
      y1: Math.min(y, oy),
      x2: Math.max(x, ox),
      y2: Math.max(y, oy),
    }
  // the opposite corner stays put: the new centre is halfway, and the box is measured turned back
  const cx = (x + ox) / 2
  const cy = (y + oy) / 2
  const [tx, ty] = turn(x, y, cx, cy, -op.rot)
  const hw = Math.abs(tx - cx)
  const hh = Math.abs(ty - cy)
  return { ...op, x1: cx - hw, y1: cy - hh, x2: cx + hw, y2: cy + hh }
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

function distToPolyline(x: number, y: number, pts: [number, number][]): number {
  if (pts.length === 1) return Math.hypot(x - pts[0][0], y - pts[0][1])
  let d = Infinity
  for (let i = 1; i < pts.length; i++)
    d = Math.min(
      d,
      distToSegment(x, y, { x1: pts[i - 1][0], y1: pts[i - 1][1], x2: pts[i][0], y2: pts[i][1] })
    )
  return d
}

/** The parts of a segment outside a round brush stroke. */
function clipSegment(s: WallSegment, pts: [number, number][], r: number): WallSegment[] {
  const len = Math.hypot(s.x2 - s.x1, s.y2 - s.y1)
  const steps = Math.max(1, Math.ceil(len))
  const out: WallSegment[] = []
  let from = -1
  const at = (i: number): [number, number] => [
    s.x1 + ((s.x2 - s.x1) * i) / steps,
    s.y1 + ((s.y2 - s.y1) * i) / steps,
  ]
  const close = (to: number): void => {
    if (from >= 0 && to - from >= 2) {
      const [x1, y1] = at(from)
      const [x2, y2] = at(to)
      out.push({ x1, y1, x2, y2 })
    }
    from = -1
  }
  for (let i = 0; i <= steps; i++) {
    const [x, y] = at(i)
    if (distToPolyline(x, y, pts) > r) {
      if (from < 0) from = i
    } else close(i - 1)
  }
  close(steps)
  return out
}

/**
 * Older files hold pixel-brush erases. This cuts the brushed parts out of the walls before them,
 * so everything is a plain vector afterwards.
 */
export function bakeErasures(ops: MapOp[]): Exclude<MapOp, EraseOp>[] {
  let out: Exclude<MapOp, EraseOp>[] = []
  for (const op of ops) {
    if (op.type !== 'erase') {
      out.push(op)
      continue
    }
    const r = op.w / 2
    const xs = op.pts.map((p) => p[0])
    const ys = op.pts.map((p) => p[1])
    const box = [Math.min(...xs) - r, Math.min(...ys) - r, Math.max(...xs) + r, Math.max(...ys) + r]
    const next: Exclude<MapOp, EraseOp>[] = []
    for (const o of out) {
      if (!isDrawn(o)) {
        next.push(o)
        continue
      }
      const segs = opSegments(o).filter(
        (g) =>
          Math.max(g.x1, g.x2) >= box[0] &&
          Math.min(g.x1, g.x2) <= box[2] &&
          Math.max(g.y1, g.y2) >= box[1] &&
          Math.min(g.y1, g.y2) <= box[3]
      )
      if (!segs.length) {
        next.push(o)
        continue
      }
      for (const g of opSegments(o))
        for (const piece of clipSegment(g, op.pts, r)) next.push({ type: 'wall', ...piece })
    }
    out = next
  }
  return out
}
