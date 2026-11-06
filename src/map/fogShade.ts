/** Soft, cloudy fog edges: pure array maths so it needs no canvas and can be tested. */

/** Colour of the darkness players see where a room has no light */
export const DARK_SOLID = [10, 10, 14] as const

/** Average colour of the fog; the clouds vary around it */
const FOG_GREY = 104

function hash(x: number, y: number, seed: number): number {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(seed, 1274126177)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

const smooth = (t: number): number => t * t * (3 - 2 * t)

/** Smooth noise in 0..1 with features about `cell` pixels wide */
function valueNoise(W: number, H: number, cell: number, seed: number): Float32Array {
  const out = new Float32Array(W * H)
  for (let y = 0; y < H; y++) {
    const gy = y / cell
    const y0 = Math.floor(gy)
    const fy = smooth(gy - y0)
    for (let x = 0; x < W; x++) {
      const gx = x / cell
      const x0 = Math.floor(gx)
      const fx = smooth(gx - x0)
      const top = hash(x0, y0, seed) * (1 - fx) + hash(x0 + 1, y0, seed) * fx
      const bot = hash(x0, y0 + 1, seed) * (1 - fx) + hash(x0 + 1, y0 + 1, seed) * fx
      out[y * W + x] = top * (1 - fy) + bot * fy
    }
  }
  return out
}

let noiseKey = ''
let noiseCache: Float32Array | null = null

/** Billowy noise around 0.5; the same for the same size, so a picture does not flicker when redrawn */
export function cloudNoise(W: number, H: number): Float32Array {
  const key = `${W}x${H}`
  if (noiseCache && key === noiseKey) return noiseCache
  const M = Math.max(W, H)
  const big = valueNoise(W, H, Math.max(8, M / 28), 1)
  const small = valueNoise(W, H, Math.max(4, M / 80), 2)
  const out = new Float32Array(W * H)
  for (let i = 0; i < out.length; i++) out[i] = 0.5 + (big[i] * 0.65 + small[i] * 0.35 - 0.5) * 2.2
  noiseKey = key
  noiseCache = out
  return out
}

/** One running-sum box blur along rows (or columns), edges repeated */
function blurLine(
  src: Float32Array,
  dst: Float32Array,
  start: number,
  step: number,
  len: number,
  r: number
): void {
  const at = (i: number): number => src[start + Math.min(len - 1, Math.max(0, i)) * step]
  let sum = 0
  for (let i = -r; i <= r; i++) sum += at(i)
  const n = 2 * r + 1
  for (let i = 0; i < len; i++) {
    dst[start + i * step] = sum / n
    sum += at(i + r + 1) - at(i - r)
  }
}

function boxBlur(a: Float32Array, W: number, H: number, r: number): Float32Array {
  let src: Float32Array = a
  let dst: Float32Array = new Float32Array(a.length)
  for (let pass = 0; pass < 3; pass++) {
    for (let y = 0; y < H; y++) blurLine(src, dst, y * W, 1, W, r)
    ;[src, dst] = [dst, src]
    for (let x = 0; x < W; x++) blurLine(src, dst, x, W, H, r)
    ;[src, dst] = [dst, src]
  }
  return src
}

/**
 * Turns the pixels of fogged rooms into cloud: fully covered inside, with a ragged edge that
 * drifts a little way outward. Returns an opacity and a grey level for every pixel.
 */
export function cloudFog(
  mask: Uint8Array,
  W: number,
  H: number,
  r: number
): { alpha: Uint8Array; grey: Uint8Array } {
  const m = new Float32Array(mask.length)
  for (let i = 0; i < m.length; i++) m[i] = mask[i] ? 1 : 0
  const blur = boxBlur(m, W, H, r)
  const noise = cloudNoise(W, H)
  const alpha = new Uint8Array(mask.length)
  const grey = new Uint8Array(mask.length)
  for (let i = 0; i < alpha.length; i++) {
    const b = blur[i]
    if (b < 0.004 && !mask[i]) continue
    // 0.5 is the room's border: it stays (nearly) opaque and thins out further away from the room
    let a = b * 2.2 + 0.25 + (noise[i] - 0.5) * 1.3
    if (mask[i]) a = Math.max(a, 0.92)
    alpha[i] = Math.round(Math.min(1, Math.max(0, a)) * 255)
    grey[i] = Math.round(FOG_GREY + (noise[i] - 0.5) * 36)
  }
  return { alpha, grey }
}
