import { detectWalls } from './detectWalls'
import { opSegments, sameSegment } from './shapes'
import type { Analysis, DetectParams, MapOp, Room, WallSegment } from './types'

export function lineWidth(M: number): number {
  return Math.max(3, Math.round(M / 450))
}

/** Square-capped line of the given width, stamped along the segment. */
function stampLine(wall: Uint8Array, W: number, H: number, s: WallSegment, lw: number): void {
  const half = lw / 2
  const len = Math.hypot(s.x2 - s.x1, s.y2 - s.y1)
  const steps = Math.max(1, Math.ceil(len))
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const cx = s.x1 + (s.x2 - s.x1) * t
    const cy = s.y1 + (s.y2 - s.y1) * t
    const x0 = Math.max(0, Math.round(cx - half))
    const y0 = Math.max(0, Math.round(cy - half))
    const x1 = Math.min(W - 1, Math.round(cx - half) + lw - 1)
    const y1 = Math.min(H - 1, Math.round(cy - half) + lw - 1)
    for (let y = y0; y <= y1; y++) wall.fill(1, y * W + x0, y * W + x1 + 1)
  }
}

/** Round brush that clears walls along a polyline. */
function stampErase(
  wall: Uint8Array,
  W: number,
  H: number,
  pts: [number, number][],
  width: number
): void {
  const r = width / 2
  const r2 = r * r
  const stamp = (cx: number, cy: number): void => {
    const y0 = Math.max(0, Math.floor(cy - r))
    const y1 = Math.min(H - 1, Math.ceil(cy + r))
    const x0 = Math.max(0, Math.floor(cx - r))
    const x1 = Math.min(W - 1, Math.ceil(cx + r))
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) if ((x - cx) ** 2 + (y - cy) ** 2 <= r2) wall[y * W + x] = 0
  }
  if (!pts.length) return
  stamp(pts[0][0], pts[0][1])
  const stride = Math.max(1, r / 2)
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1]
    const [bx, by] = pts[i]
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / stride))
    for (let k = 1; k <= n; k++) stamp(ax + ((bx - ax) * k) / n, ay + ((by - ay) * k) / n)
  }
}

/** Walls first, then the user's wall and erase operations in order. */
export function rasterizeWalls(
  W: number,
  H: number,
  auto: WallSegment[],
  ops: MapOp[]
): Uint8Array {
  const wall = new Uint8Array(W * H)
  const lw = lineWidth(Math.max(W, H))
  for (const s of auto) stampLine(wall, W, H, s, lw)
  for (const op of ops) {
    if (op.type === 'wall') stampLine(wall, W, H, op, lw)
    else if (op.type === 'shape') for (const s of opSegments(op)) stampLine(wall, W, H, s, lw)
    else if (op.type === 'erase') stampErase(wall, W, H, op.pts, op.w)
  }
  return wall
}

/** Labels the open areas between walls and merges tiny pockets and islands into their surroundings. */
export function buildRooms(
  wall: Uint8Array,
  W: number,
  H: number,
  minRoomPercent: number
): { own: Int32Array; rooms: (Room | null)[] } {
  const N = W * H
  const M = Math.max(W, H)
  const lab = new Int32Array(N)
  const q = new Int32Array(N)
  const regs: (Room | null)[] = [null]
  let id = 1
  for (let i = 0; i < N; i++) {
    if (wall[i] || lab[i]) continue
    let qh = 0
    let qt = 0
    q[qt++] = i
    lab[i] = id
    let x0 = W
    let y0 = H
    let x1 = 0
    let y1 = 0
    while (qh < qt) {
      const p = q[qh++]
      const x = p % W
      const y = (p - x) / W
      if (x < x0) x0 = x
      if (x > x1) x1 = x
      if (y < y0) y0 = y
      if (y > y1) y1 = y
      if (x > 0 && !wall[p - 1] && !lab[p - 1]) {
        lab[p - 1] = id
        q[qt++] = p - 1
      }
      if (x < W - 1 && !wall[p + 1] && !lab[p + 1]) {
        lab[p + 1] = id
        q[qt++] = p + 1
      }
      if (y > 0 && !wall[p - W] && !lab[p - W]) {
        lab[p - W] = id
        q[qt++] = p - W
      }
      if (y < H - 1 && !wall[p + W] && !lab[p + W]) {
        lab[p + W] = id
        q[qt++] = p + W
      }
    }
    regs.push({
      id,
      area: qt,
      x0,
      y0,
      x1,
      y1,
      sample: q[qt >> 1],
      ext: x0 === 0 || y0 === 0 || x1 === W - 1 || y1 === H - 1,
      alive: true,
      bx0: 0,
      by0: 0,
      bx1: 0,
      by1: 0,
    })
    id++
  }
  const rooms = regs as Room[] // index 0 is the only null and is never dereferenced below
  const minA = Math.max(30, (M * M * minRoomPercent) / 100)

  // grow real regions over walls and tiny pockets
  const own = new Int32Array(N)
  let qh = 0
  let qt = 0
  for (let i = 0; i < N; i++) {
    const l = lab[i]
    if (l > 0 && (rooms[l].area >= minA || rooms[l].ext)) {
      own[i] = l
      q[qt++] = i
    }
  }
  for (let r = 1; r < rooms.length; r++)
    if (rooms[r].area < minA && !rooms[r].ext) rooms[r].alive = false
  while (qh < qt) {
    const p = q[qh++]
    const x = p % W
    const o = own[p]
    if (x > 0 && !own[p - 1]) {
      own[p - 1] = o
      q[qt++] = p - 1
    }
    if (x < W - 1 && !own[p + 1]) {
      own[p + 1] = o
      q[qt++] = p + 1
    }
    if (p >= W && !own[p - W]) {
      own[p - W] = o
      q[qt++] = p - W
    }
    if (p < N - W && !own[p + W]) {
      own[p + W] = o
      q[qt++] = p + W
    }
  }

  // fold islands (e.g. a table outline) into the room around them
  const nb = new Map<number, Set<number>>()
  const addN = (a: number, b: number): void => {
    if (!nb.has(a)) nb.set(a, new Set())
    nb.get(a)!.add(b)
  }
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x
      const a = own[i]
      if (x < W - 1) {
        const b = own[i + 1]
        if (a !== b && a && b) {
          addN(a, b)
          addN(b, a)
        }
      }
      if (y < H - 1) {
        const b = own[i + W]
        if (a !== b && a && b) {
          addN(a, b)
          addN(b, a)
        }
      }
    }
  const remap = new Int32Array(rooms.length)
  for (let r = 0; r < rooms.length; r++) remap[r] = r
  for (let r = 1; r < rooms.length; r++) {
    const R = rooms[r]
    if (!R.alive || R.ext) continue
    const ns = nb.get(r)
    if (!ns || ns.size !== 1) continue
    const t = [...ns][0]
    const T = rooms[t]
    if (T.ext || T.area < R.area) continue
    if (R.x0 >= T.x0 && R.x1 <= T.x1 && R.y0 >= T.y0 && R.y1 <= T.y1) {
      remap[r] = t
      R.alive = false
    }
  }
  for (let r = 1; r < rooms.length; r++) {
    let t = remap[r]
    while (remap[t] !== t) t = remap[t]
    remap[r] = t
  }
  for (let i = 0; i < N; i++) own[i] = remap[own[i]]

  // final bounding boxes from ownership
  for (let r = 1; r < rooms.length; r++) {
    rooms[r].bx0 = W
    rooms[r].by0 = H
    rooms[r].bx1 = 0
    rooms[r].by1 = 0
  }
  for (let i = 0; i < N; i++) {
    const R = regs[own[i]]
    if (!R) continue
    const x = i % W
    const y = (i - x) / W
    if (x < R.bx0) R.bx0 = x
    if (x > R.bx1) R.bx1 = x
    if (y < R.by0) R.by0 = y
    if (y > R.by1) R.by1 = y
  }
  return { own, rooms: regs }
}

export interface AnalyzeRequest {
  /** New detection parameters, `null` to switch automatic walls off, `undefined` to keep the last result */
  detect: DetectParams | null | undefined
  ops: MapOp[]
  minRoom: number
}

/** Holds one map's grayscale pixels and the last automatic detection so edits only redo the room step. */
export class Analyzer {
  private gray: Float32Array = new Float32Array(0)
  private W = 0
  private H = 0
  private auto: WallSegment[] = []

  load(gray: Float32Array, W: number, H: number): void {
    this.gray = gray
    this.W = W
    this.H = H
    this.auto = []
  }

  run(req: AnalyzeRequest): Analysis {
    const { W, H } = this
    if (req.detect === null) this.auto = []
    else if (req.detect) this.auto = detectWalls(this.gray, W, H, req.detect)
    const cuts = req.ops.filter((o) => o.type === 'cut')
    const auto = cuts.length
      ? this.auto.filter((s) => !cuts.some((c) => sameSegment(c, s)))
      : this.auto
    const wall = rasterizeWalls(W, H, auto, req.ops)
    const { own, rooms } = buildRooms(wall, W, H, req.minRoom)
    return { W, H, wall, own, rooms, auto }
  }
}
