import {
  cleanLines,
  dropDim,
  dropLoose,
  bridgeJogs,
  typicalBrightness,
  type Line,
} from './wallFilters'
import type { DetectParams, WallSegment } from './types'

type Raw = [number, number, number]
interface Cluster {
  a: number
  b: number
  last: number
  sum: number
  n: number
}

/** Horizontal and vertical wall lines of one image, [position, start, end, ...] as in `Line` */
interface AxisWalls {
  hs: Line[]
  vs: Line[]
}

/** `M` is the size the length thresholds scale with (the original map, also for rotated copies) */
function axisWalls(
  g: Float32Array,
  W: number,
  H: number,
  p: DetectParams,
  M: number,
  oblique = false
): AxisWalls {
  const N = W * H
  const k = M / 1600
  const T = p.sensitivity
  const L = Math.round(M * p.minLen)
  const G = Math.round(M * p.gap)
  const D = Math.round(M * 0.04)
  const ts = [4, 6, 9, 13].map((t) => Math.max(2, Math.round(t * Math.max(k, 0.5))))

  function box(src: Float32Array, r: number, horiz: boolean): Float32Array {
    const out = new Float32Array(N)
    const n = horiz ? W : H
    const m = horiz ? H : W
    const step = horiz ? 1 : W
    const lstep = horiz ? W : 1
    const inv = 1 / (2 * r + 1)
    for (let l = 0; l < m; l++) {
      const base = l * lstep
      let s = 0
      for (let j = -r; j <= r; j++) {
        const c = j < 0 ? 0 : j >= n ? n - 1 : j
        s += src[base + c * step]
      }
      for (let i = 0; i < n; i++) {
        out[base + i * step] = s * inv
        const a = i + r + 1
        const b = i - r
        s += src[base + (a >= n ? n - 1 : a) * step] - src[base + (b < 0 ? 0 : b) * step]
      }
    }
    return out
  }

  function barResp(horizWall: boolean): Float32Array {
    // horizWall: bands running along x, thin in y
    const R = new Float32Array(N).fill(-1e9)
    for (const t of ts) {
      const across = box(g, Math.max(1, t >> 1), !horizWall) // thickness t across the band
      const S = box(across, Math.max(2, t), horizWall) // smooth along band
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const i = y * W + x
          let a: number
          let b: number
          if (horizWall) {
            const y1 = y - t < 0 ? 0 : y - t
            const y2 = y + t >= H ? H - 1 : y + t
            a = S[y1 * W + x]
            b = S[y2 * W + x]
          } else {
            const x1 = x - t < 0 ? 0 : x - t
            const x2 = x + t >= W ? W - 1 : x + t
            a = S[y * W + x1]
            b = S[y * W + x2]
          }
          const mx = a > b ? a : b
          const v = ((S[i] - mx) / (mx + 25)) * 100
          if (v > R[i]) R[i] = v
        }
      }
    }
    return R
  }

  function lines(R: Float32Array, horizWall: boolean): Line[] {
    const n = horizWall ? W : H
    const m = horizWall ? H : W
    const minRun = Math.max(4, Math.round(L * 0.4))
    const raw: Raw[] = []
    for (let l = 0; l < m; l++) {
      let s = -1
      let last = -10
      for (let i = 0; i < n; i++) {
        const v = horizWall ? R[l * W + i] : R[i * W + l]
        if (v > T) {
          if (s < 0 || i - last > 3) {
            if (s >= 0 && last - s >= minRun) raw.push([l, s, last])
            s = i
          }
          last = i
        }
      }
      if (s >= 0 && last - s >= minRun) raw.push([l, s, last])
    }
    // cluster adjacent rows
    const cl: Cluster[] = []
    const active: Cluster[] = []
    for (const [l, a, b] of raw) {
      let hit: Cluster | null = null
      for (let j = active.length - 1; j >= 0; j--) {
        const c = active[j]
        if (l - c.last > 2) {
          active.splice(j, 1)
          continue
        }
        if (Math.min(b, c.b) - Math.max(a, c.a) > 0) {
          hit = c
          break
        }
      }
      if (hit) {
        hit.a = Math.min(hit.a, a)
        hit.b = Math.max(hit.b, b)
        hit.last = l
        hit.sum += l
        hit.n++
      } else {
        const c = { a, b, last: l, sum: l, n: 1 }
        cl.push(c)
        active.push(c)
      }
    }
    const ls: Line[] = cl
      .map((c) => [c.sum / c.n, c.a, c.b, 0, 1, 0] as Line)
      .sort((p, q) => p[1] - q[1])
    let merged = ls
    let prev = -1
    while (merged.length !== prev) {
      prev = merged.length
      const src = merged.sort((p, q) => p[1] - q[1])
      merged = []
      for (const [c, a, b] of src) {
        let hit: Line | null = null
        for (const mm of merged) {
          const gg = Math.min(G * 2.5, Math.max(G, Math.min(b - a, mm[2] - mm[1])))
          if (Math.abs(mm[0] - c) <= 5 && a <= mm[2] + gg && b >= mm[1] - gg) {
            hit = mm
            break
          }
        }
        if (hit) {
          hit[0] = (hit[0] * (hit[2] - hit[1]) + c * (b - a)) / (hit[2] - hit[1] + (b - a) || 1)
          hit[1] = Math.min(hit[1], a)
          hit[2] = Math.max(hit[2], b)
        } else merged.push([c, a, b, 0, 1, 0])
      }
    }
    const out = merged.filter((mm) => mm[2] - mm[1] >= L)
    // trim ends much dimmer than the rest of the line (a chain or fence running on past the wall)
    const win = Math.max(6, Math.round(M * 0.015))
    for (const l of oblique ? [] : out) {
      const a0 = Math.round(l[1])
      const b0 = Math.round(l[2])
      const c0 = Math.round(l[0])
      const br = new Float32Array(b0 - a0 + 1)
      for (let i = a0; i <= b0; i++) {
        let bb = 0
        for (let d = -2; d <= 2; d++) {
          const cc = c0 + d
          if (cc < 0 || cc >= m || i < 0 || i >= n) continue
          const gv = horizWall ? g[cc * W + i] : g[i * W + cc]
          if (gv > bb) bb = gv
        }
        br[i - a0] = bb
      }
      const sorted = [...br].sort((p, q) => p - q)
      const ref = sorted[Math.floor(sorted.length * 0.6)]
      const share = (from: number, dir: number): number => {
        let s = 0
        for (let k = 0; k < win; k++) s += br[Math.min(br.length - 1, Math.max(0, from + dir * k))]
        return s / win
      }
      let a = 0
      while (a < br.length - win && share(a, 1) < 0.72 * ref) a += win >> 1
      let b = br.length - 1
      while (b > a + win && share(b, -1) < 0.72 * ref) b -= win >> 1
      l[1] = a0 + a
      l[2] = a0 + b
    }
    for (let i = out.length - 1; i >= 0; i--) if (out[i][2] - out[i][1] < L) out.splice(i, 1)
    for (const l of out) {
      // share of the line that really carries a ridge response (gaps are bridged by the merge above)
      let hit = 0
      let bright = 0
      const c = Math.round(l[0])
      for (let i = Math.round(l[1]); i <= l[2]; i++) {
        let best = -1e9
        let bb = 0
        for (let d = -2; d <= 2; d++) {
          const cc = c + d
          if (cc < 0 || cc >= m) continue
          const v = horizWall ? R[cc * W + i] : R[i * W + cc]
          const gv = horizWall ? g[cc * W + i] : g[i * W + cc]
          if (gv > bb) bb = gv
          if (v > best) best = v
        }
        if (best > T) hit++
        bright += bb
      }
      l[3] = hit / (l[2] - l[1] + 1)
      l[5] = bright / (l[2] - l[1] + 1)
    }
    return out
  }

  const maxThick = Math.round(M * (p.thickness ?? 0.016))
  const stairGap = Math.round(M * 0.035)
  const Rh = barResp(true)
  const Rv = barResp(false)
  const hs = cleanLines(lines(Rh, true), maxThick, stairGap, Math.round(M * 0.28))
  const vs = cleanLines(lines(Rv, false), maxThick, stairGap, Math.round(M * 0.28))

  // a slanted pass sees the dark outbuildings too, so brightness is no yardstick there
  if (!oblique) dropDim([hs, vs], 0.75)

  function snap(A: Line[], B: Line[]): void {
    for (const s of A) {
      const [c, a, b] = s
      let lo: number | null = null
      let hi: number | null = null
      for (const [x, c2, d2] of B) {
        if (c < c2 - D || c > d2 + D) continue
        if (x >= a - D && x < a && (lo === null || x < lo)) lo = x
        if (x > b && x <= b + D && (hi === null || x > hi)) hi = x
      }
      if (lo !== null) s[1] = lo
      if (hi !== null) s[2] = hi
    }
  }
  for (let r = 0; r < 2; r++) {
    snap(hs, vs)
    snap(vs, hs)
  }

  const dimBelow = oblique ? 0 : typicalBrightness([hs, vs]) * 0.85
  const shortLen = Math.round(M * 0.09)
  const mediumLen = Math.round(M * 0.17)
  const tol = Math.round(M * 0.012)
  /** Staircase edges: a long line with a run of short parallel ridges (the steps) beside it */
  function stepsBeside(l: Line, horizWall: boolean, cross: Float32Array): number {
    const reach = Math.round(M * 0.03)
    const inner = Math.max(3, Math.round(M * 0.004))
    let best = 0
    for (const side of [-1, 1]) {
      let runs = 0
      let prev = false
      let gapLen = 99
      for (let i = Math.round(l[1]); i <= l[2]; i++) {
        let hit = 0
        for (let d = inner; d < inner + reach; d++) {
          const c = Math.round(l[0]) + side * d
          if (c < 0 || c >= (horizWall ? H : W)) continue
          if ((horizWall ? cross[c * W + i] : cross[i * W + c]) > T) hit++
        }
        const on = hit >= reach * 0.6
        if (on && !prev && gapLen >= 3) runs++
        gapLen = on ? 0 : gapLen + 1
        prev = on
      }
      best = Math.max(best, runs)
    }
    return best
  }
  const steps = Math.max(8, Math.round(M * 0.0065))
  const typical = typicalBrightness([hs, vs])
  // a stringer is dimmer than a real wall; a wall that merely borders a staircase stays
  const stringer = (l: Line, horiz: boolean): boolean =>
    !oblique && l[5] < typical * 0.9 && stepsBeside(l, horiz, horiz ? Rv : Rh) >= steps
  for (let i = hs.length - 1; i >= 0; i--) if (stringer(hs[i], true)) hs.splice(i, 1)
  for (let i = vs.length - 1; i >= 0; i--) if (stringer(vs[i], false)) vs.splice(i, 1)
  const step = Math.round(M * 0.08)
  const shift = Math.round(M * 0.02)
  const jogV = bridgeJogs(hs, vs, step, shift, tol)
  const jogH = bridgeJogs(vs, hs, step, shift, tol)
  vs.push(...jogV)
  hs.push(...jogH)

  dropLoose(hs, vs, shortLen, mediumLen, tol, dimBelow)
  dropLoose(vs, hs, shortLen, mediumLen, tol, dimBelow)

  return { hs, vs }
}

function toSegments(w: AxisWalls, back: (x: number, y: number) => [number, number]): WallSegment[] {
  const out: WallSegment[] = []
  for (const [y, a, b] of w.hs) {
    const [x1, y1] = back(a, y)
    const [x2, y2] = back(b, y)
    out.push({ x1, y1, x2, y2 })
  }
  for (const [x, a, b] of w.vs) {
    const [x1, y1] = back(x, a)
    const [x2, y2] = back(x, b)
    out.push({ x1, y1, x2, y2 })
  }
  return out
}

/**
 * Angles (degrees, 9..81) at which many edges line up within a part of the image, apart from
 * the horizontal/vertical ones. A building drawn at a slant is a strong peak in the gradient
 * orientation histogram of the tiles it covers, even if it is small next to the rest of the map.
 */
export function dominantAngles(g: Float32Array, W: number, H: number): number[] {
  const tile = Math.max(64, Math.round(Math.max(W, H) / 8))
  const votes = new Float64Array(90)
  for (let ty = 0; ty < H; ty += tile)
    for (let tx = 0; tx < W; tx += tile) {
      const bins = new Float64Array(90)
      let mass = 0
      const y1 = Math.min(H - 1, ty + tile)
      const x1 = Math.min(W - 1, tx + tile)
      for (let y = Math.max(1, ty); y < y1; y++)
        for (let x = Math.max(1, tx); x < x1; x++) {
          const i = y * W + x
          const m = Math.hypot(g[i + 1] - g[i - 1], g[i + W] - g[i - W])
          if (m < 20) continue
          let a = ((Math.atan2(g[i + W] - g[i - W], g[i + 1] - g[i - 1]) * 180) / Math.PI) % 90
          if (a < 0) a += 90
          bins[Math.floor(a) % 90] += m
          mass += m
        }
      if (mass < tile * tile * 0.5) continue
      const sm = new Float64Array(90)
      for (let i = 0; i < 90; i++)
        for (let d = -2; d <= 2; d++) sm[i] += bins[(i + d + 90) % 90] * (3 - Math.abs(d))
      const median = [...sm].sort((p, q) => p - q)[45]
      for (let i = 9; i <= 81; i++) {
        let top = true
        for (let d = -5; d <= 5; d++) if (sm[(i + d + 90) % 90] > sm[i]) top = false
        if (top && sm[i] > median * 2.2) votes[i] += sm[i] / median
      }
    }
  // merge nearby votes, strongest first
  const peaks: number[] = []
  const order = [...votes.keys()].filter((i) => votes[i] > 0).sort((p, q) => votes[q] - votes[p])
  for (const i of order)
    if (peaks.every((q) => Math.min(Math.abs(q - i), 90 - Math.abs(q - i)) > 6)) peaks.push(i)
  return peaks.slice(0, 3)
}

/** The image as seen turned by `deg` degrees; returns it with the map from its coordinates back. */
function rotated(
  g: Float32Array,
  W: number,
  H: number,
  deg: number
): { img: Float32Array; w: number; h: number; back: (x: number, y: number) => [number, number] } {
  const t = (deg * Math.PI) / 180
  const c = Math.cos(t)
  const s = Math.sin(t)
  const w = Math.ceil(Math.abs(W * c) + Math.abs(H * s))
  const h = Math.ceil(Math.abs(W * s) + Math.abs(H * c))
  const img = new Float32Array(w * h)
  const cx = W / 2
  const cy = H / 2
  const cu = w / 2
  const cv = h / 2
  for (let v = 0; v < h; v++)
    for (let u = 0; u < w; u++) {
      const du = u - cu
      const dv = v - cv
      let x = cx + du * c - dv * s
      let y = cy + du * s + dv * c
      x = x < 0 ? 0 : x > W - 1.001 ? W - 1.001 : x
      y = y < 0 ? 0 : y > H - 1.001 ? H - 1.001 : y
      const x0 = Math.floor(x)
      const y0 = Math.floor(y)
      const fx = x - x0
      const fy = y - y0
      const i = y0 * W + x0
      img[v * w + u] =
        g[i] * (1 - fx) * (1 - fy) +
        g[i + 1] * fx * (1 - fy) +
        g[i + W] * (1 - fx) * fy +
        g[i + W + 1] * fx * fy
    }
  return {
    img,
    w,
    h,
    back: (u, v) => {
      const du = u - cu
      const dv = v - cv
      return [cx + du * c - dv * s, cy + du * s + dv * c]
    },
  }
}

/**
 * Wall detection: finds long, bright, thin straight bands (beams/walls) in a grayscale image.
 * Horizontal and vertical walls come first; buildings drawn at a slant are found by turning the
 * image to each dominant angle and running the same detector. Coordinates are image pixels.
 */
export function detectWalls(g: Float32Array, W: number, H: number, p: DetectParams): WallSegment[] {
  const M = Math.max(W, H)
  const out = toSegments(axisWalls(g, W, H, p, M), (x, y) => [x, y])
  if (p.oblique === false) return splitAtJunctions(out, M)
  for (const deg of dominantAngles(g, W, H)) {
    const r = rotated(g, W, H, deg)
    const found = toSegments(axisWalls(r.img, r.w, r.h, p, M, true), r.back)
    // a wrong angle gives ghosts of walls already found; keep only what is new
    const reach = M * 0.045
    out.push(
      ...found.filter(
        (f) =>
          !out.some(
            (o) => distToSegment(f.x1, f.y1, o) < reach && distToSegment(f.x2, f.y2, o) < reach
          )
      )
    )
  }
  return splitAtJunctions(out, M)
}

/**
 * Cuts every wall where another wall meets or crosses it, so a room's side can be removed
 * without taking the rest of the building's line with it. Ends that stop just short of a wall
 * (within `tol`) count as meeting it. Pieces never get shorter than `minPiece`.
 */
export function splitAtJunctions(segs: WallSegment[], M: number): WallSegment[] {
  const tol = M * 0.012
  const minPiece = M * 0.01
  const overhang = M * 0.025
  const out: WallSegment[] = []
  for (const a of segs) {
    const dx = a.x2 - a.x1
    const dy = a.y2 - a.y1
    const len = Math.hypot(dx, dy)
    if (len < minPiece * 2) {
      out.push(a)
      continue
    }
    const ux = dx / len
    const uy = dy / len
    const cuts: { t: number; through: boolean }[] = []
    for (const b of segs) {
      if (b === a) continue
      const ex = b.x2 - b.x1
      const ey = b.y2 - b.y1
      const blen = Math.hypot(ex, ey)
      if (blen === 0) continue
      const vx = ex / blen
      const vy = ey / blen
      const det = ux * vy - uy * vx
      if (Math.abs(det) < 0.2) continue // parallel walls never meet
      // a.p1 + t*u = b.p1 + s*v
      const rx = b.x1 - a.x1
      const ry = b.y1 - a.y1
      const t = (rx * vy - ry * vx) / det
      const sb = (rx * uy - ry * ux) / det
      if (sb < -tol || sb > blen + tol) continue
      if (t > minPiece && t < len - minPiece) cuts.push({ t, through: sb > tol && sb < blen - tol })
    }
    cuts.sort((p, q) => p.t - q.t)
    const at: number[] = [0]
    for (const c of cuts) if (c.t - at[at.length - 1] >= minPiece) at.push(c.t)
    if (len - at[at.length - 1] < minPiece && at.length > 1) at.pop()
    at.push(len)
    // a stub poking out past a wall that runs on through is an overhang, not a wall
    const through = (t: number): boolean => cuts.some((c) => c.through && Math.abs(c.t - t) < 1e-6)
    if (at.length > 2 && at[1] < overhang && through(at[1])) at.shift()
    const last = at.length - 2
    if (last > 0 && len - at[last] < overhang && through(at[last])) at.pop()
    for (let i = 0; i + 1 < at.length; i++)
      out.push({
        x1: a.x1 + ux * at[i],
        y1: a.y1 + uy * at[i],
        x2: a.x1 + ux * at[i + 1],
        y2: a.y1 + uy * at[i + 1],
      })
  }
  return out
}

function distToSegment(x: number, y: number, s: WallSegment): number {
  const dx = s.x2 - s.x1
  const dy = s.y2 - s.y1
  const len2 = dx * dx + dy * dy
  const u = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((x - s.x1) * dx + (y - s.y1) * dy) / len2))
  return Math.hypot(x - (s.x1 + u * dx), y - (s.y1 + u * dy))
}
