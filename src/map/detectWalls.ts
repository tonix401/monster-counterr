import type { DetectParams, WallSegment } from './types'

type Line = [number, number, number] // [position across, start along, end along]
type Raw = [number, number, number]
interface Cluster {
  a: number
  b: number
  last: number
  sum: number
  n: number
}

/**
 * Straight-wall detection: finds long, bright, thin horizontal/vertical bands (beams/walls)
 * in a grayscale image. Coordinates are in image pixels.
 */
export function detectWalls(g: Float32Array, W: number, H: number, p: DetectParams): WallSegment[] {
  const M = Math.max(W, H)
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
    const ls: Line[] = cl.map((c) => [c.sum / c.n, c.a, c.b] as Line).sort((p, q) => p[1] - q[1])
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
        } else merged.push([c, a, b])
      }
    }
    return merged.filter((mm) => mm[2] - mm[1] >= L)
  }

  const hs = lines(barResp(true), true)
  const vs = lines(barResp(false), false)

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

  const out: WallSegment[] = []
  for (const [y, a, b] of hs) out.push({ x1: a, y1: y, x2: b, y2: y })
  for (const [x, a, b] of vs) out.push({ x1: x, y1: a, x2: x, y2: b })
  return out
}
