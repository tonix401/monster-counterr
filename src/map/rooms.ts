import type { Analysis, Graph, Room } from './types'

/** Points closer to a wall than this (pixels) count as lying on it */
const ON_WALL = 0.5

type Pt = [number, number]
type Seg = [number, number]

/**
 * The walls as a plain planar drawing: walls are cut where they cross each other or where a node
 * lies on another wall, so every meeting of walls is a shared point.
 */
function planarize(g: Graph): { pts: Pt[]; segs: Seg[] } {
  const pts: Pt[] = []
  const at = new Map<number, number>()
  for (const n of g.nodes) {
    at.set(n.id, pts.length)
    pts.push([n.x, n.y])
  }
  const base: Seg[] = []
  for (const e of g.edges) {
    const a = at.get(e.a)
    const b = at.get(e.b)
    if (a !== undefined && b !== undefined && a !== b) base.push([a, b])
  }
  const nodeCount = pts.length
  const cuts: { t: number; p: number }[][] = base.map(() => [])

  for (let i = 0; i < base.length; i++) {
    const [a, b] = base[i]
    const [ax, ay] = pts[a]
    const [bx, by] = pts[b]
    const dx = bx - ax
    const dy = by - ay
    const len = Math.hypot(dx, dy)
    const minX = Math.min(ax, bx) - ON_WALL
    const maxX = Math.max(ax, bx) + ON_WALL
    const minY = Math.min(ay, by) - ON_WALL
    const maxY = Math.max(ay, by) + ON_WALL

    // a node that lies on this wall splits it
    for (let p = 0; p < nodeCount; p++) {
      if (p === a || p === b) continue
      const [x, y] = pts[p]
      if (x < minX || x > maxX || y < minY || y > maxY) continue
      const t = ((x - ax) * dx + (y - ay) * dy) / (len * len)
      if (t * len <= ON_WALL || (1 - t) * len <= ON_WALL) continue
      if (Math.abs((x - ax) * dy - (y - ay) * dx) / len <= ON_WALL) cuts[i].push({ t, p })
    }

    // another wall that crosses it splits both
    for (let j = i + 1; j < base.length; j++) {
      const [c, d] = base[j]
      if (c === a || c === b || d === a || d === b) continue
      const [cx, cy] = pts[c]
      const [ex, ey] = pts[d]
      if (Math.max(cx, ex) < minX || Math.min(cx, ex) > maxX) continue
      if (Math.max(cy, ey) < minY || Math.min(cy, ey) > maxY) continue
      const sx = ex - cx
      const sy = ey - cy
      const den = dx * sy - dy * sx
      if (Math.abs(den) < 1e-9) continue
      const t = ((cx - ax) * sy - (cy - ay) * sx) / den
      const u = ((cx - ax) * dy - (cy - ay) * dx) / den
      const lenJ = Math.hypot(sx, sy)
      if (t * len <= ON_WALL || (1 - t) * len <= ON_WALL) continue
      if (u * lenJ <= ON_WALL || (1 - u) * lenJ <= ON_WALL) continue
      const p = pts.length
      pts.push([ax + t * dx, ay + t * dy])
      cuts[i].push({ t, p })
      cuts[j].push({ t: u, p })
    }
  }

  const segs: Seg[] = []
  const seen = new Set<string>()
  base.forEach(([a, b], i) => {
    const chain = [a, ...cuts[i].sort((m, n) => m.t - n.t).map((c) => c.p), b]
    for (let k = 0; k + 1 < chain.length; k++) {
      const p = chain[k]
      const q = chain[k + 1]
      const key = p < q ? `${p}:${q}` : `${q}:${p}`
      if (p === q || seen.has(key)) continue
      seen.add(key)
      segs.push([p, q])
    }
  })
  return { pts, segs }
}

interface Cycle {
  /** Points around the cycle, in order */
  ring: Pt[]
  /** Positive for a room's inside, negative (or zero) for the outside of a group of walls */
  area: number
  comp: number
}

interface Face {
  rings: Pt[][]
  area: number
  x0: number
  y0: number
  x1: number
  y1: number
}

function inside(ring: Pt[], x: number, y: number): boolean {
  let on = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) on = !on
  }
  return on
}

/** Fills the pixels inside the rings (even-odd); reports the pixels it set */
function fillRings(
  own: Uint8Array | Int32Array,
  W: number,
  H: number,
  rings: Pt[][],
  id: number
): { area: number; bx0: number; by0: number; bx1: number; by1: number; sx: number; sy: number } {
  let top = Infinity
  let bottom = -Infinity
  for (const r of rings)
    for (const p of r) {
      if (p[1] < top) top = p[1]
      if (p[1] > bottom) bottom = p[1]
    }
  const y0 = Math.max(0, Math.ceil(top - 0.5))
  const y1 = Math.min(H - 1, Math.ceil(bottom - 0.5) - 1)
  const out = { area: 0, bx0: W, by0: H, bx1: -1, by1: -1, sx: -1, sy: -1 }
  if (y1 < y0) return out
  const rows: number[][] = Array.from({ length: y1 - y0 + 1 }, () => [])
  for (const r of rings)
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      const [xa, ya] = r[j]
      const [xb, yb] = r[i]
      if (ya === yb) continue
      const [lx, ly, hx, hy] = ya < yb ? [xa, ya, xb, yb] : [xb, yb, xa, ya]
      const from = Math.max(y0, Math.ceil(ly - 0.5))
      const to = Math.min(y1, Math.ceil(hy - 0.5) - 1)
      for (let y = from; y <= to; y++)
        rows[y - y0].push(lx + ((y + 0.5 - ly) * (hx - lx)) / (hy - ly))
    }
  let widest = 0
  for (let k = 0; k < rows.length; k++) {
    const xs = rows[k].sort((a, b) => a - b)
    const y = y0 + k
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const a = Math.max(0, Math.ceil(xs[i] - 0.5))
      const b = Math.min(W, Math.ceil(xs[i + 1] - 0.5))
      if (b <= a) continue
      own.fill(id, y * W + a, y * W + b)
      out.area += b - a
      if (a < out.bx0) out.bx0 = a
      if (b - 1 > out.bx1) out.bx1 = b - 1
      if (y < out.by0) out.by0 = y
      if (y > out.by1) out.by1 = y
      if (b - a > widest) {
        widest = b - a
        out.sx = (a + b) >> 1
        out.sy = y
      }
    }
  }
  return out
}

/**
 * Rooms straight from the walls: the faces of the drawing. Walls need no thickness, nothing is
 * traced pixel by pixel, and a room is only painted into the per-pixel map in a single pass.
 * Pockets smaller than `minRoomPercent` of the map and islands inside one room are folded into
 * the room around them.
 */
export function analyzeGraph(g: Graph, W: number, H: number, minRoomPercent: number): Analysis {
  const M = Math.max(W, H)
  const { pts, segs } = planarize(g)

  // every wall twice, once per direction; at each node the walls are ordered by angle
  const from = (h: number): number => segs[h >> 1][h & 1]
  const to = (h: number): number => segs[h >> 1][(h & 1) ^ 1]
  const around: number[][] = pts.map(() => [])
  for (let h = 0; h < segs.length * 2; h++) around[from(h)].push(h)
  const slot = new Int32Array(segs.length * 2)
  const angle = (h: number): number =>
    Math.atan2(pts[to(h)][1] - pts[from(h)][1], pts[to(h)][0] - pts[from(h)][0])
  for (const list of around) {
    list.sort((a, b) => angle(a) - angle(b))
    list.forEach((h, i) => (slot[h] = i))
  }

  // which group of connected walls each node belongs to
  const parent = pts.map((_, i) => i)
  const root = (i: number): number => {
    while (parent[i] !== i) i = parent[i] = parent[parent[i]]
    return i
  }
  for (const [a, b] of segs) parent[root(a)] = root(b)

  // walk the faces: each wall direction belongs to exactly one cycle
  const cycleOf = new Int32Array(segs.length * 2).fill(-1)
  const cycles: Cycle[] = []
  for (let start = 0; start < segs.length * 2; start++) {
    if (cycleOf[start] !== -1) continue
    const ring: Pt[] = []
    let area = 0
    let h = start
    do {
      cycleOf[h] = cycles.length
      const p = pts[from(h)]
      const q = pts[to(h)]
      ring.push(p)
      area += (p[0] * q[1] - q[0] * p[1]) / 2
      const twin = h ^ 1
      const list = around[from(twin)]
      h = list[(slot[twin] - 1 + list.length) % list.length]
    } while (h !== start)
    cycles.push({ ring, area, comp: root(from(start)) })
  }

  // the room a group of walls stands in: the smallest room around its outline, or the outside
  const bounded = cycles.map((c, i) => (c.area > 1e-6 ? i : -1)).filter((i) => i >= 0)
  const outer = new Map<number, number>()
  for (let i = 0; i < cycles.length; i++) {
    const c = cycles[i]
    if (c.area > 1e-6) continue
    const best = outer.get(c.comp)
    if (best === undefined || c.area < cycles[best].area) outer.set(c.comp, i)
  }
  const faceOfCycle = new Int32Array(cycles.length).fill(0) // 0 is the outside
  const faces: Face[] = [{ rings: [], area: 0, x0: 0, y0: 0, x1: W, y1: H }]
  for (const i of bounded) {
    faceOfCycle[i] = faces.length
    const ring = cycles[i].ring
    let x0 = Infinity
    let y0 = Infinity
    let x1 = -Infinity
    let y1 = -Infinity
    for (const [x, y] of ring) {
      x0 = Math.min(x0, x)
      y0 = Math.min(y0, y)
      x1 = Math.max(x1, x)
      y1 = Math.max(y1, y)
    }
    faces.push({ rings: [ring], area: cycles[i].area, x0, y0, x1, y1 })
  }
  // every other cycle belongs to the room its group of walls stands in
  const holder = new Map<number, number>()
  for (const [comp, i] of outer) {
    const c = cycles[i]
    const [px, py] = c.ring[0]
    let owner = 0
    let size = Infinity
    for (const b of bounded) {
      if (cycles[b].comp === comp || cycles[b].area >= size) continue
      if (inside(cycles[b].ring, px, py)) {
        owner = faceOfCycle[b]
        size = cycles[b].area
      }
    }
    holder.set(comp, owner)
    if (owner && c.area < -1e-6) {
      faces[owner].rings.push(c.ring) // the group's outline is a hole in that room
      faces[owner].area += c.area
    }
  }
  for (let i = 0; i < cycles.length; i++)
    if (cycles[i].area <= 1e-6) faceOfCycle[i] = holder.get(cycles[i].comp) ?? 0

  // how much wall each pair of rooms shares
  const contacts = new Map<number, Map<number, number>>()
  const touch = (a: number, b: number, len: number): void => {
    let m = contacts.get(a)
    if (!m) contacts.set(a, (m = new Map()))
    m.set(b, (m.get(b) ?? 0) + len)
  }
  segs.forEach(([a, b], k) => {
    const fa = faceOfCycle[cycleOf[2 * k]]
    const fb = faceOfCycle[cycleOf[2 * k + 1]]
    if (fa === fb) return
    const len = Math.hypot(pts[a][0] - pts[b][0], pts[a][1] - pts[b][1])
    touch(fa, fb, len)
    touch(fb, fa, len)
  })

  // pockets go to the room they share the most wall with; islands fold into the room around them
  const into = faces.map((_, i) => i)
  const top = (i: number): number => {
    while (into[i] !== i) i = into[i] = into[into[i]]
    return i
  }
  const minA = Math.max(30, (M * M * minRoomPercent) / 100)
  const order = faces
    .map((_, i) => i)
    .filter((i) => i > 0)
    .sort((a, b) => faces[a].area - faces[b].area)
  for (const i of order) {
    if (faces[i].area >= minA) continue
    let best = -1
    let most = 0
    for (const [n, len] of contacts.get(i) ?? [])
      if (len > most && top(n) !== i) [best, most] = [n, len]
    if (best >= 0) {
      into[i] = top(best)
      faces[into[i]].area += faces[i].area
    }
  }
  for (const i of order) {
    if (top(i) !== i) continue
    const near = new Set<number>()
    for (const n of contacts.get(i)?.keys() ?? []) if (top(n) !== i) near.add(top(n))
    if (near.size !== 1) continue
    const t = [...near][0]
    const R = faces[i]
    const T = faces[t]
    if (t === 0 || T.area < R.area) continue
    if (R.x0 >= T.x0 && R.x1 <= T.x1 && R.y0 >= T.y0 && R.y1 <= T.y1) into[i] = t
  }

  // paint every room into the per-pixel map; the outside is what is left
  const own = new Int32Array(W * H)
  const OUT = 1
  own.fill(OUT)
  const rooms: (Room | null)[] = [
    null,
    {
      id: OUT,
      area: 0,
      x0: 0,
      y0: 0,
      x1: W - 1,
      y1: H - 1,
      sample: 0,
      ext: true,
      alive: true,
      bx0: 0,
      by0: 0,
      bx1: W - 1,
      by1: H - 1,
    },
  ]
  const idOf = new Int32Array(faces.length) // room id per face (the outside is id 1)
  idOf[0] = OUT
  for (let i = 1; i < faces.length; i++) idOf[i] = rooms.length + i - 1
  rooms.length = faces.length + 1
  for (let i = 1; i < faces.length; i++) {
    const F = faces[i]
    const id = idOf[i]
    const filled = fillRings(own, W, H, F.rings, id)
    rooms[id] = {
      id,
      area: filled.area,
      x0: Math.floor(F.x0),
      y0: Math.floor(F.y0),
      x1: Math.ceil(F.x1),
      y1: Math.ceil(F.y1),
      sample: filled.sx < 0 ? 0 : filled.sy * W + filled.sx,
      ext: false,
      alive: top(i) === i,
      bx0: filled.bx0,
      by0: filled.by0,
      bx1: filled.bx1,
      by1: filled.by1,
    }
  }
  // folded rooms give their pixels, size and outline to the room that took them in
  for (let i = 1; i < faces.length; i++) {
    const t = top(i)
    if (t === i) continue
    const a = rooms[idOf[i]]!
    const b = rooms[idOf[t]]!
    b.area += a.area
    b.bx0 = Math.min(b.bx0, a.bx0)
    b.by0 = Math.min(b.by0, a.by0)
    b.bx1 = Math.max(b.bx1, a.bx1)
    b.by1 = Math.max(b.by1, a.by1)
  }
  const remap = new Int32Array(rooms.length)
  for (let i = 0; i < remap.length; i++) remap[i] = i
  for (let i = 1; i < faces.length; i++) remap[idOf[i]] = idOf[top(i)]
  for (let p = 0; p < own.length; p++) own[p] = remap[own[p]]

  // the outside: its size, and a pixel that really is outside
  let outside = 0
  let sample = -1
  for (let p = 0; p < own.length; p++)
    if (own[p] === OUT) {
      outside++
      if (sample < 0) sample = p
    }
  rooms[OUT]!.area = outside
  rooms[OUT]!.sample = Math.max(0, sample)
  return { W, H, own, rooms }
}
