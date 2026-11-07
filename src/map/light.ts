import { makeCanvas } from './render'
import { opaqueSegments } from './graph'
import {
  ftToPx,
  isLightTokenId,
  isPlayerTokenId,
  playerTokenId,
  rangeFt,
  type Tokens,
} from './tokens'
import type { Graph, WallSegment } from './types'

export type Point = [number, number]

/** A place that gives light: a fire, or a player who can see this far. `r` is in map pixels. */
export interface LightSource {
  id: string
  x: number
  y: number
  r: number
}

/** Where light comes from: every fire and every player standing on the map */
export function lightSources(
  tokens: Tokens,
  ranges: Record<string, number>,
  cell: number,
  override?: { id: string; x?: number; y?: number; ft?: number } | null,
  /** a monster whose sight counts too: the DM's view while that monster is selected */
  include?: string | null
): LightSource[] {
  const out: LightSource[] = []
  for (const [id, t] of Object.entries(tokens)) {
    if (!isLightTokenId(id) && !isPlayerTokenId(id) && id !== include) continue
    const o = override?.id === id ? override : null
    out.push({
      id,
      x: o?.x ?? t.x,
      y: o?.y ?? t.y,
      r: ftToPx(o?.ft ?? rangeFt(ranges, id), cell),
    })
  }
  return out
}

/** An angle in 0..2π, so wall ends and the circle samples sort along the same turn */
const turn = (a: number): number => ((a % TAU) + TAU) % TAU
const TAU = Math.PI * 2
const ARC_STEPS = 96
const EPS = 1e-4

/** Distance along the ray (dx, dy) from (ox, oy) to the segment, or Infinity */
function rayHit(ox: number, oy: number, dx: number, dy: number, s: WallSegment): number {
  const ex = s.x2 - s.x1
  const ey = s.y2 - s.y1
  const den = dx * ey - dy * ex
  if (Math.abs(den) < 1e-12) return Infinity
  const qx = s.x1 - ox
  const qy = s.y1 - oy
  const t = (qx * ey - qy * ex) / den
  const u = (qx * dy - qy * dx) / den
  return t >= 0 && u >= -1e-9 && u <= 1 + 1e-9 ? t : Infinity
}

/**
 * What a light at (cx, cy) reaches within r: a polygon whose corners are the nearest wall (or
 * the circle) along rays to every wall end and around the circle. Walls block it completely.
 */
export function visibilityPolygon(
  cx: number,
  cy: number,
  r: number,
  walls: WallSegment[]
): Point[] {
  const near = walls.filter((s) => {
    const dx = s.x2 - s.x1
    const dy = s.y2 - s.y1
    const len2 = dx * dx + dy * dy
    const k = len2 ? Math.max(0, Math.min(1, ((cx - s.x1) * dx + (cy - s.y1) * dy) / len2)) : 0
    return Math.hypot(s.x1 + k * dx - cx, s.y1 + k * dy - cy) <= r
  })
  const angles: number[] = []
  for (let i = 0; i < ARC_STEPS; i++) angles.push((i / ARC_STEPS) * Math.PI * 2)
  for (const s of near) {
    for (const [x, y] of [
      [s.x1, s.y1],
      [s.x2, s.y2],
    ]) {
      const a = Math.atan2(y - cy, x - cx)
      angles.push(turn(a - EPS), turn(a), turn(a + EPS))
    }
  }
  angles.sort((a, b) => a - b)
  const out: Point[] = []
  for (const a of angles) {
    const dx = Math.cos(a)
    const dy = Math.sin(a)
    let d = r
    for (const s of near) d = Math.min(d, rayHit(cx, cy, dx, dy, s))
    out.push([cx + dx * d, cy + dy * d])
  }
  return out
}

/** The lit pixels of a map as it stands, or with one source's place or reach changed (a drag in progress) */
export function litFor(
  m: {
    analysis: { W: number; H: number } | null
    graph: Graph
    tokens: Tokens
    ranges: Record<string, number>
    grid: { cell: number }
  },
  override?: { id: string; x?: number; y?: number; ft?: number } | null,
  include?: string | null
): Uint8Array | null {
  if (!m.analysis) return null
  const sources = lightSources(m.tokens, m.ranges, m.grid.cell, override, include)
  return litMask(m.analysis.W, m.analysis.H, lightPolygons(sources, m.graph))
}

/**
 * What one audience sees lit: every fire, and the sight of that one player (none for `null`, the
 * view everybody shares). Other players' eyes light nothing for them.
 */
export function litForViewer(
  m: Parameters<typeof litFor>[0],
  playerId: string | null
): Uint8Array | null {
  const mine = playerId === null ? null : playerTokenId(playerId)
  const tokens = Object.fromEntries(
    Object.entries(m.tokens).filter(([id]) => isLightTokenId(id) || id === mine)
  )
  return litFor({ ...m, tokens })
}

/** The polygons for several sources, against the solid walls of the graph (the map border included) */
export function lightPolygons(sources: LightSource[], graph: Graph): Point[][] {
  const walls = opaqueSegments(graph)
  return sources.filter((s) => s.r > 0).map((s) => visibilityPolygon(s.x, s.y, s.r, walls))
}

/** One byte per pixel, 1 where any of the polygons covers it; null when nothing is lit */
export function litMask(W: number, H: number, polygons: Point[][]): Uint8Array | null {
  if (!polygons.length) return null
  const c = makeCanvas(W, H)
  const g = c.getContext('2d')!
  g.fillStyle = '#fff'
  for (const poly of polygons) {
    g.beginPath()
    poly.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)))
    g.closePath()
    g.fill()
  }
  const d = g.getImageData(0, 0, W, H).data
  const mask = new Uint8Array(W * H)
  for (let i = 0, p = 3; i < mask.length; i++, p += 4) mask[i] = d[p] > 127 ? 1 : 0
  return mask
}
