import type { Graph, MapEdge, MapNode, WallSegment } from './types'

/** Two points closer than this (pixels) count as the same place */
const SAME = 0.75

export const emptyGraph = (): Graph => ({ nodes: [], edges: [], next: 1 })

const nodeMap = (g: Graph): Map<number, MapNode> => new Map(g.nodes.map((n) => [n.id, n]))

const pairKey = (a: number, b: number): string => (a < b ? `${a}:${b}` : `${b}:${a}`)

/** Every wall as plain coordinates, for drawing, hit testing and finding rooms */
export function edgeSegments(g: Graph): WallSegment[] {
  const at = nodeMap(g)
  const out: WallSegment[] = []
  for (const e of g.edges) {
    const p = at.get(e.a)
    const q = at.get(e.b)
    if (p && q) out.push({ x1: p.x, y1: p.y, x2: q.x, y2: q.y })
  }
  return out
}

/** The ends of one edge, or null when it is not in the graph */
export function edgeEnds(g: Graph, id: number): WallSegment | null {
  const e = g.edges.find((o) => o.id === id)
  const at = nodeMap(g)
  const p = e && at.get(e.a)
  const q = e && at.get(e.b)
  return p && q ? { x1: p.x, y1: p.y, x2: q.x, y2: q.y } : null
}

export function distToSegment(x: number, y: number, s: WallSegment): number {
  const c = closestOnSegment(x, y, s)
  return Math.hypot(c[0] - x, c[1] - y)
}

/** The point of the segment nearest to (x, y) */
export function closestOnSegment(x: number, y: number, s: WallSegment): [number, number] {
  const dx = s.x2 - s.x1
  const dy = s.y2 - s.y1
  const len = dx * dx + dy * dy
  const t = len ? Math.max(0, Math.min(1, ((x - s.x1) * dx + (y - s.y1) * dy) / len)) : 0
  return [s.x1 + t * dx, s.y1 + t * dy]
}

/** The edge joining two nodes, if any */
export const edgeBetween = (g: Graph, a: number, b: number): MapEdge | undefined =>
  g.edges.find((e) => (e.a === a && e.b === b) || (e.a === b && e.b === a))

/** Adds a wall between two existing nodes; does nothing for the same node or a pair already joined */
export function addEdge(g: Graph, a: number, b: number): Graph {
  if (a === b || edgeBetween(g, a, b)) return g
  return { ...g, edges: [...g.edges, { id: g.next, a, b }], next: g.next + 1 }
}

/** Nodes that no wall touches are dropped */
function dropOrphans(g: Graph): Graph {
  const used = new Set<number>()
  for (const e of g.edges) {
    used.add(e.a)
    used.add(e.b)
  }
  return g.nodes.every((n) => used.has(n.id))
    ? g
    : { ...g, nodes: g.nodes.filter((n) => used.has(n.id)) }
}

export function removeEdge(g: Graph, id: number): Graph {
  return dropOrphans({ ...g, edges: g.edges.filter((e) => e.id !== id) })
}

/**
 * A node joining exactly two walls disappears and the walls become one; any other node is
 * removed together with its walls.
 */
export function removeNode(g: Graph, id: number): Graph {
  const mine = g.edges.filter((e) => e.a === id || e.b === id)
  const rest = g.edges.filter((e) => e.a !== id && e.b !== id)
  const nodes = g.nodes.filter((n) => n.id !== id)
  if (mine.length === 2) {
    const a = mine[0].a === id ? mine[0].b : mine[0].a
    const b = mine[1].a === id ? mine[1].b : mine[1].a
    if (a !== b && !rest.some((e) => pairKey(e.a, e.b) === pairKey(a, b))) {
      return { nodes, edges: [...rest, { id: g.next, a, b }], next: g.next + 1 }
    }
  }
  return dropOrphans({ ...g, nodes, edges: rest })
}

/** What a point on the map lines up with */
export type Snap =
  | { kind: 'node'; node: MapNode; x: number; y: number }
  | { kind: 'edge'; edge: MapEdge; x: number; y: number }
  | { kind: 'free'; x: number; y: number }

/** The nearest node within `r`, else the nearest spot on a wall within `r`, else the point itself */
export function snapPoint(g: Graph, x: number, y: number, r: number): Snap {
  let node: MapNode | null = null
  let best = r
  for (const n of g.nodes) {
    const d = Math.hypot(n.x - x, n.y - y)
    if (d <= best) {
      best = d
      node = n
    }
  }
  if (node) return { kind: 'node', node, x: node.x, y: node.y }
  const at = nodeMap(g)
  let edge: MapEdge | null = null
  let spot: [number, number] = [x, y]
  best = r
  for (const e of g.edges) {
    const p = at.get(e.a)
    const q = at.get(e.b)
    if (!p || !q) continue
    const c = closestOnSegment(x, y, { x1: p.x, y1: p.y, x2: q.x, y2: q.y })
    const d = Math.hypot(c[0] - x, c[1] - y)
    if (d <= best) {
      best = d
      edge = e
      spot = c
    }
  }
  return edge ? { kind: 'edge', edge, x: spot[0], y: spot[1] } : { kind: 'free', x, y }
}

/** Puts a new node on a wall, which then runs through it as two walls */
export function splitEdge(
  g: Graph,
  edgeId: number,
  x: number,
  y: number
): { g: Graph; id: number } {
  const e = g.edges.find((o) => o.id === edgeId)
  if (!e) return { g, id: -1 }
  const id = g.next
  return {
    id,
    g: {
      nodes: [...g.nodes, { id, x, y }],
      edges: [
        ...g.edges.filter((o) => o !== e),
        { id: id + 1, a: e.a, b: id },
        { id: id + 2, a: id, b: e.b },
      ],
      next: id + 3,
    },
  }
}

/** The node at a point, made by splitting the wall under it or adding a new one if there is none */
function placeNode(g: Graph, x: number, y: number): { g: Graph; id: number; joined: boolean } {
  const s = snapPoint(g, x, y, SAME)
  if (s.kind === 'node') return { g, id: s.node.id, joined: true }
  if (s.kind === 'edge') return { ...splitEdge(g, s.edge.id, s.x, s.y), joined: true }
  return {
    g: { ...g, nodes: [...g.nodes, { id: g.next, x, y }], next: g.next + 1 },
    id: g.next,
    joined: false,
  }
}

/** Walls along the points, joined to the nodes and walls already at those spots */
export function addPolyline(
  g: Graph,
  pts: [number, number][],
  closed = false,
  tidyReach = 0
): Graph {
  let out = g
  let first = -1
  let prev = -1
  const joined: number[] = []
  for (const p of pts) {
    const placed = placeNode(out, p[0], p[1])
    out = placed.g
    if (placed.joined) joined.push(placed.id)
    if (prev !== -1) out = addEdge(out, prev, placed.id)
    else first = placed.id
    prev = placed.id
  }
  if (closed && pts.length > 2) out = addEdge(out, prev, first)
  return tidy(out, tidyReach, joined)
}

/** The points moved onto nodes and walls within `r` (this is what the pointer snaps to) */
const snapAll = (g: Graph, pts: [number, number][], r: number): [number, number][] =>
  pts.map((p) => {
    const s = snapPoint(g, p[0], p[1], r)
    return [s.x, s.y]
  })

export function addRect(
  g: Graph,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  r: number
): Graph {
  const pts: [number, number][] = [
    [x1, y1],
    [x2, y1],
    [x2, y2],
    [x1, y2],
  ]
  return addPolyline(g, snapAll(g, pts, r), true, r)
}

/** How many corners a ring around the box gets: a smooth look, but few enough to edit by hand */
export const ellipseSteps = (w: number, h: number, M: number): number => {
  const a = Math.abs(w) / 2
  const b = Math.abs(h) / 2
  const perimeter = Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)))
  return Math.max(12, Math.min(40, Math.round(perimeter / (M * 0.02))))
}

/** The corners of the ring that stands for an ellipse in the box */
export function ellipsePoints(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  M: number
): [number, number][] {
  const n = ellipseSteps(x2 - x1, y2 - y1, M)
  return Array.from({ length: n }, (_, i): [number, number] => {
    const a = (i / n) * Math.PI * 2
    return [
      (x1 + x2) / 2 + (Math.cos(a) * (x2 - x1)) / 2,
      (y1 + y2) / 2 + (Math.sin(a) * (y2 - y1)) / 2,
    ]
  })
}

/** An ellipse in the box as a ring of nodes */
export function addEllipse(
  g: Graph,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  M: number,
  r: number
): Graph {
  return addPolyline(g, snapAll(g, ellipsePoints(x1, y1, x2, y2, M), r), true, r)
}

/** Moves a node; every wall on it follows. */
export function moveNode(g: Graph, id: number, x: number, y: number): Graph {
  return { ...g, nodes: g.nodes.map((n) => (n.id === id ? { ...n, x, y } : n)) }
}

/** `from` joins `into`: its walls now end there, and walls that become a point or a repeat vanish */
export function mergeNodes(g: Graph, from: number, into: number): Graph {
  if (from === into) return g
  const seen = new Set<string>()
  const edges: MapEdge[] = []
  for (const e of g.edges) {
    const a = e.a === from ? into : e.a
    const b = e.b === from ? into : e.b
    if (a === b || seen.has(pairKey(a, b))) continue
    seen.add(pairKey(a, b))
    edges.push(a === e.a && b === e.b ? e : { ...e, a, b })
  }
  return { ...g, nodes: g.nodes.filter((n) => n.id !== from), edges }
}

/** The node another node would join if let go here: the nearest one within `r` */
export function mergeTarget(g: Graph, id: number, r: number): MapNode | null {
  const me = g.nodes.find((n) => n.id === id)
  if (!me) return null
  let target: MapNode | null = null
  let best = r
  for (const n of g.nodes) {
    if (n.id === id) continue
    const d = Math.hypot(n.x - me.x, n.y - me.y)
    if (d <= best) {
      best = d
      target = n
    }
  }
  return target
}

const degreeOf = (g: Graph): Map<number, number> => {
  const d = new Map<number, number>()
  for (const e of g.edges) {
    d.set(e.a, (d.get(e.a) ?? 0) + 1)
    d.set(e.b, (d.get(e.b) ?? 0) + 1)
  }
  return d
}

/** Smallest angle between two directions, in degrees (0..90 when taken between lines) */
const lineAngle = (dx1: number, dy1: number, dx2: number, dy2: number): number => {
  const a = Math.abs(Math.atan2(dy1, dx1) - Math.atan2(dy2, dx2)) * (180 / Math.PI)
  const m = a % 180
  return Math.min(m, 180 - m)
}

/**
 * Cleans up where walls were just joined, so slips of the hand do not stay as flaws: tiny stubs
 * sticking out past a junction are removed, a wall shorter than `r` collapses into one node, a
 * node that two nearly straight walls meet in is moved onto the straight line, and a loose end
 * that is almost horizontal or vertical is made so. `ids` are the nodes that were touched (their
 * neighbours are looked at too); without it the whole graph is tidied. `r` is the reach in pixels.
 */
export function tidy(g: Graph, r: number, ids?: Iterable<number>): Graph {
  if (r <= 0) return g
  let out = g
  const touched = ids ? new Set(ids) : null
  for (let pass = 0; pass < 300; pass++) {
    const before = out
    const at = nodeMap(out)
    const deg = degreeOf(out)
    const near = (id: number): boolean => {
      if (!touched) return true
      if (touched.has(id)) return true
      return out.edges.some(
        (e) => (e.a === id && touched.has(e.b)) || (e.b === id && touched.has(e.a))
      )
    }

    // a stub: a loose end hanging off a junction, shorter than the reach
    for (const e of out.edges) {
      const p = at.get(e.a)
      const q = at.get(e.b)
      if (!p || !q || Math.hypot(p.x - q.x, p.y - q.y) > r * 1.5) continue
      const [leaf, hub] = deg.get(e.a) === 1 ? [p, q] : deg.get(e.b) === 1 ? [q, p] : [null, null]
      if (!leaf || (deg.get(hub.id) ?? 0) < 3 || !(near(leaf.id) || near(hub.id))) continue
      out = removeEdge(out, e.id)
      break
    }
    if (out !== before) continue

    // a wall so short it is only a kink: its two nodes become one
    for (const e of out.edges) {
      const p = at.get(e.a)
      const q = at.get(e.b)
      if (!p || !q || Math.hypot(p.x - q.x, p.y - q.y) >= r * 0.6 || !(near(p.id) || near(q.id)))
        continue
      const mid = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 }
      out = mergeNodes(moveNode(out, p.id, mid.x, mid.y), q.id, p.id)
      break
    }
    if (out !== before) continue

    // a node between two almost straight walls goes onto the straight line
    for (const n of out.nodes) {
      if (deg.get(n.id) !== 2 || !near(n.id)) continue
      const ends = out.edges
        .filter((e) => e.a === n.id || e.b === n.id)
        .map((e) => at.get(e.a === n.id ? e.b : e.a)!)
      const [a, b] = ends
      if (!a || !b || a.id === b.id) continue
      const bend = lineAngle(n.x - a.x, n.y - a.y, b.x - n.x, b.y - n.y)
      if (bend === 0 || bend > 8) continue
      const c = closestOnSegment(n.x, n.y, { x1: a.x, y1: a.y, x2: b.x, y2: b.y })
      if (Math.hypot(c[0] - n.x, c[1] - n.y) > r * 2) continue
      out = moveNode(out, n.id, c[0], c[1])
      break
    }
    if (out !== before) continue

    // a loose end of a touched wall that is almost level or plumb is made so
    for (const e of out.edges) {
      const p = at.get(e.a)
      const q = at.get(e.b)
      if (!p || !q) continue
      const [hub, leaf] = deg.get(e.b) === 1 ? [p, q] : deg.get(e.a) === 1 ? [q, p] : [null, null]
      if (!hub || !leaf || !(near(hub.id) || near(leaf.id))) continue
      const dx = leaf.x - hub.x
      const dy = leaf.y - hub.y
      if (!dx && !dy) continue
      if (lineAngle(dx, dy, 1, 0) < 4 && dy !== 0) out = moveNode(out, leaf.id, leaf.x, hub.y)
      else if (lineAngle(dx, dy, 0, 1) < 4 && dx !== 0) out = moveNode(out, leaf.id, hub.x, leaf.y)
      if (out !== before) break
    }
    if (out === before) break
  }
  return out
}

/** Lets go of a dragged node: it joins a node close to it, if there is one. Returns the node left. */
export function dropNode(g: Graph, id: number, r: number, tidyReach = 0): { g: Graph; id: number } {
  const t = mergeTarget(g, id, r)
  const joined = t ? mergeNodes(g, id, t.id) : g
  const at = t ? t.id : id
  return { g: tidy(joined, tidyReach, [at]), id: at }
}

/** The wall nearest to the point within `tol`, ignoring nodes */
export function hitEdge(g: Graph, x: number, y: number, tol: number): MapEdge | null {
  const at = nodeMap(g)
  let best = tol
  let hit: MapEdge | null = null
  for (const e of g.edges) {
    const p = at.get(e.a)
    const q = at.get(e.b)
    if (!p || !q) continue
    const d = distToSegment(x, y, { x1: p.x, y1: p.y, x2: q.x, y2: q.y })
    if (d <= best) {
      best = d
      hit = e
    }
  }
  return hit
}

export type GraphHit = { kind: 'node'; node: MapNode } | { kind: 'edge'; edge: MapEdge }

/** The node (preferred) or wall within `tol` of the point */
export function hitTest(g: Graph, x: number, y: number, tol: number): GraphHit | null {
  const s = snapPoint(g, x, y, tol)
  if (s.kind === 'node') return { kind: 'node', node: s.node }
  if (s.kind === 'edge') return { kind: 'edge', edge: s.edge }
  return null
}

/**
 * Turns loose detected lines into a graph. A line end that stops near another line splits that
 * line there, and ends that lie close together become one node, so the walls of a room meet
 * at shared corners instead of overlapping or leaving small gaps.
 */
export function graphFromSegments(segs: WallSegment[], M: number): Graph {
  const tol = M * 0.012

  // walls that another wall's end touches in its middle are cut there
  const pieces: WallSegment[] = []
  for (const s of segs) {
    const dx = s.x2 - s.x1
    const dy = s.y2 - s.y1
    const len = Math.hypot(dx, dy)
    const cuts: number[] = []
    if (len > tol * 2) {
      for (const o of segs) {
        if (o === s) continue
        for (const [px, py] of [
          [o.x1, o.y1],
          [o.x2, o.y2],
        ]) {
          const t = ((px - s.x1) * dx + (py - s.y1) * dy) / (len * len)
          if (t * len <= tol || (1 - t) * len <= tol) continue // near an end: joins that node instead
          if (Math.hypot(s.x1 + t * dx - px, s.y1 + t * dy - py) <= tol) cuts.push(t)
        }
      }
    }
    cuts.sort((a, b) => a - b)
    const ts = [0, ...cuts, 1]
    for (let i = 0; i + 1 < ts.length; i++) {
      pieces.push({
        x1: s.x1 + dx * ts[i],
        y1: s.y1 + dy * ts[i],
        x2: s.x1 + dx * ts[i + 1],
        y2: s.y1 + dy * ts[i + 1],
      })
    }
  }

  // each end goes to the nearest corner within reach, or starts a new one
  const corners: { x: number; y: number; n: number }[] = []
  const cornerFor = (x: number, y: number): number => {
    let at = -1
    let best = tol
    corners.forEach((c, i) => {
      const d = Math.hypot(c.x - x, c.y - y)
      if (d <= best) {
        best = d
        at = i
      }
    })
    if (at === -1) {
      corners.push({ x, y, n: 1 })
      return corners.length - 1
    }
    const c = corners[at]
    c.x = (c.x * c.n + x) / (c.n + 1)
    c.y = (c.y * c.n + y) / (c.n + 1)
    c.n++
    return at
  }
  const ends = pieces.map((p) => [cornerFor(p.x1, p.y1), cornerFor(p.x2, p.y2)])

  const seen = new Set<string>()
  const edges: MapEdge[] = []
  let next = corners.length + 1
  for (const [a, b] of ends) {
    if (a === b || seen.has(pairKey(a, b))) continue
    seen.add(pairKey(a, b))
    edges.push({ id: next++, a: a + 1, b: b + 1 })
  }
  const nodes = corners.map((c, i) => ({ id: i + 1, x: c.x, y: c.y }))
  return tidy(dropOrphans({ nodes, edges, next }), tol)
}

/** The walls as a list of points and a list of point-index pairs, the way a file keeps them */
export function graphLists(g: Graph): { nodes: [number, number][]; edges: [number, number][] } {
  const index = new Map(g.nodes.map((n, i) => [n.id, i]))
  const r1 = (v: number): number => Math.round(v * 10) / 10
  return {
    nodes: g.nodes.map((n) => [r1(n.x), r1(n.y)]),
    edges: g.edges.map((e) => [index.get(e.a)!, index.get(e.b)!]),
  }
}

/** The graph for such lists; pairs that name a missing point, join a point to itself or repeat are skipped, and so are points no pair uses */
export function graphFromLists(points: [number, number][], pairs: [number, number][]): Graph {
  let g: Graph = {
    nodes: points.map((p, i) => ({ id: i + 1, x: p[0], y: p[1] })),
    edges: [],
    next: points.length + 1,
  }
  for (const [i, j] of pairs) {
    if (points[i] && points[j]) g = addEdge(g, i + 1, j + 1)
  }
  return dropOrphans(g)
}
