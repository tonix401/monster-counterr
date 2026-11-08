import { cloudFog, DARK_SOLID } from './fogShade'
import type { Analysis, FogStyle } from './types'

export function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

/** A canvas in a page or in a worker */
export type AnyCanvas = HTMLCanvasElement | OffscreenCanvas
type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D

export const makeAnyCanvas = (w: number, h: number): AnyCanvas =>
  typeof document === 'undefined' ? new OffscreenCanvas(w, h) : makeCanvas(w, h)

const ctx2d = (c: AnyCanvas): Ctx2D => c.getContext('2d') as Ctx2D

/**
 * Cuts the lit polygons (flat x, y pairs) out of a layer: what light reaches is clear of the fog
 * on it. The edges are smoothed, and it costs a canvas fill rather than a loop over every pixel.
 */
export function cutLight(g: Ctx2D, polygons: Float32Array[]): void {
  g.save()
  g.globalCompositeOperation = 'destination-out'
  g.fillStyle = '#000'
  for (const p of polygons) {
    g.beginPath()
    g.moveTo(p[0], p[1])
    for (let i = 2; i < p.length; i += 2) g.lineTo(p[i], p[i + 1])
    g.closePath()
    g.fill()
  }
  g.restore()
}

/** The DM's fog of every fogged room, with the light as polygons cut out of it; the base is built by `paintFog` */
export function paintFogLit(
  canvas: HTMLCanvasElement,
  fogBase: HTMLCanvasElement,
  polygons: Float32Array[] | null
): void {
  const g = canvas.getContext('2d')!
  g.clearRect(0, 0, canvas.width, canvas.height)
  g.drawImage(fogBase, 0, 0)
  if (polygons?.length) cutLight(g, polygons)
}

/** A small JPEG of the map for the library list */
export function makeThumb(base: HTMLCanvasElement, width = 160): string {
  const h = Math.max(1, Math.round((base.height / base.width) * width))
  const c = makeCanvas(width, h)
  c.getContext('2d')!.drawImage(base, 0, 0, width, h)
  return c.toDataURL('image/jpeg', 0.7)
}

/**
 * `solid` is what players see: cloudy grey fog, or solid darkness. The DM's own fog is
 * translucent and hatched, in a deeper shade for darkness.
 */
export function paintFog(
  canvas: AnyCanvas,
  a: Analysis,
  fog: Set<number>,
  style: FogStyle,
  solid: boolean,
  /** Pixels that light reaches: fogged rooms are clear there (players' picture only) */
  lit: Uint8Array | null = null
): void {
  const { W, H, own } = a
  const g = ctx2d(canvas)
  g.clearRect(0, 0, W, H)
  if (!fog.size) return
  const flag = new Uint8Array(a.rooms.length)
  for (const id of fog) flag[id] = 1
  const im = g.createImageData(W, H)
  const d = im.data
  const dark = style === 'dark'

  if (solid && !dark) {
    const mist = new Uint8Array(own.length)
    for (let i = 0; i < own.length; i++) mist[i] = flag[own[i]] && !lit?.[i] ? 1 : 0
    const cloud = cloudFog(mist, W, H, Math.max(2, Math.round(Math.max(W, H) * 0.005)))
    for (let i = 0, p = 0; i < own.length; i++, p += 4) {
      if (!cloud.alpha[i]) continue
      const v = cloud.grey[i]
      d[p] = v
      d[p + 1] = v + 2
      d[p + 2] = v + 6
      d[p + 3] = cloud.alpha[i]
    }
  } else {
    // one 32-bit write per pixel; the stripe is a diagonal counter, not a division per pixel
    const px = new Uint32Array(d.buffer)
    const [stripe, plain] = solid
      ? [
          rgba(DARK_SOLID[0], DARK_SOLID[1], DARK_SOLID[2], 255),
          rgba(DARK_SOLID[0], DARK_SOLID[1], DARK_SOLID[2], 255),
        ]
      : dark
        ? [rgba(14, 14, 20, 245), rgba(30, 30, 38, 215)]
        : [rgba(80, 82, 86, 235), rgba(112, 114, 118, 195)]
    for (let y = 0, i = 0; y < H; y++) {
      let phase = y % 14
      for (let x = 0; x < W; x++, i++, phase = phase === 13 ? 0 : phase + 1) {
        if (flag[own[i]] && !lit?.[i]) px[i] = phase < 2 ? stripe : plain
      }
    }
  }
  g.putImageData(im, 0, 0)
}

/** A pixel as the 32-bit word a canvas stores it in (little-endian, the byte order of every browser machine) */
const rgba = (r: number, g: number, b: number, a: number): number =>
  ((a << 24) | (b << 16) | (g << 8) | r) >>> 0

export function paintHover(canvas: HTMLCanvasElement, a: Analysis, id: number): void {
  const { W, H, own } = a
  const g = canvas.getContext('2d')!
  g.clearRect(0, 0, W, H)
  const R = a.rooms[id]
  if (!id || !R) return
  const w = R.bx1 - R.bx0 + 1
  const h = R.by1 - R.by0 + 1
  if (w <= 0 || h <= 0) return
  const im = g.createImageData(w, h)
  const d = im.data
  const c = R.ext ? [255, 170, 60] : [60, 160, 255]
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (own[(y + R.by0) * W + x + R.bx0] === id) {
        const p = (y * w + x) * 4
        d[p] = c[0]
        d[p + 1] = c[1]
        d[p + 2] = c[2]
        d[p + 3] = 70
      }
  g.putImageData(im, R.bx0, R.by0)
}

/** Square lines every `cell` pixels, light on dark so they read on any map */
export function drawGrid(g: Ctx2D, W: number, H: number, cell: number): void {
  if (!(cell >= 4)) return
  g.save()
  g.lineWidth = 1
  for (const [color, off] of [
    ['rgba(0,0,0,.4)', 0.5],
    ['rgba(255,255,255,.3)', 1.5],
  ] as const) {
    g.strokeStyle = color
    g.beginPath()
    for (let x = cell; x < W; x += cell) {
      g.moveTo(Math.round(x) + off, 0)
      g.lineTo(Math.round(x) + off, H)
    }
    for (let y = cell; y < H; y += cell) {
      g.moveTo(0, Math.round(y) + off)
      g.lineTo(W, Math.round(y) + off)
    }
    g.stroke()
  }
  g.restore()
}

/**
 * The picture players get: the map with every fogged room painted over, so hidden rooms never
 * leave the DM's browser. Light clears the fog where it reaches; the grid lies under the fog.
 */
export async function renderPlayerImage(
  base: CanvasImageSource,
  a: Analysis,
  fog: Set<number>,
  style: FogStyle,
  lit: Uint8Array | null = null,
  grid: { on: boolean; cell: number } | null = null
): Promise<Blob | null> {
  const out = makeAnyCanvas(a.W, a.H)
  const g = ctx2d(out)
  g.drawImage(base, 0, 0)
  if (grid?.on) drawGrid(g, a.W, a.H, grid.cell)
  const fogLayer = makeAnyCanvas(a.W, a.H)
  paintFog(fogLayer, a, fog, style, true, lit)
  g.drawImage(fogLayer, 0, 0)
  if ('convertToBlob' in out) return out.convertToBlob({ type: 'image/jpeg', quality: 0.8 })
  return new Promise((resolve) => out.toBlob(resolve, 'image/jpeg', 0.8))
}
