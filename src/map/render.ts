import { cloudFog, DARK_SOLID } from './fogShade'
import type { Analysis, FogStyle } from './types'

export function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
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
  canvas: HTMLCanvasElement,
  a: Analysis,
  fog: Set<number>,
  style: FogStyle,
  solid: boolean,
  /** Pixels that light reaches: fogged rooms are clear there (players' picture only) */
  lit: Uint8Array | null = null
): void {
  const { W, H, own } = a
  const g = canvas.getContext('2d')!
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
    for (let i = 0, p = 0; i < own.length; i++, p += 4) {
      if (!flag[own[i]] || lit?.[i]) continue
      const x = i % W
      const y = (i - x) / W
      const s = (x + y) % 14 < 2
      if (solid) {
        d[p] = DARK_SOLID[0]
        d[p + 1] = DARK_SOLID[1]
        d[p + 2] = DARK_SOLID[2]
        d[p + 3] = 255
      } else if (dark) {
        d[p] = s ? 14 : 30
        d[p + 1] = s ? 14 : 30
        d[p + 2] = s ? 20 : 38
        d[p + 3] = s ? 245 : 215
      } else {
        d[p] = s ? 80 : 112
        d[p + 1] = s ? 82 : 114
        d[p + 2] = s ? 86 : 118
        d[p + 3] = s ? 235 : 195
      }
    }
  }
  g.putImageData(im, 0, 0)
}

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
export function drawGrid(g: CanvasRenderingContext2D, W: number, H: number, cell: number): void {
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
  base: HTMLCanvasElement,
  a: Analysis,
  fog: Set<number>,
  style: FogStyle,
  lit: Uint8Array | null = null,
  grid: { on: boolean; cell: number } | null = null
): Promise<Blob | null> {
  const out = makeCanvas(a.W, a.H)
  const g = out.getContext('2d')!
  g.drawImage(base, 0, 0)
  if (grid?.on) drawGrid(g, a.W, a.H, grid.cell)
  const fogLayer = makeCanvas(a.W, a.H)
  paintFog(fogLayer, a, fog, style, true, lit)
  g.drawImage(fogLayer, 0, 0)
  return new Promise((resolve) => out.toBlob(resolve, 'image/jpeg', 0.8))
}
