import type { Analysis } from './types'

export function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

export const FOG_SOLID = [96, 98, 102] as const

export function paintLines(canvas: HTMLCanvasElement, a: Analysis): void {
  const { W, H, wall } = a
  const g = canvas.getContext('2d')!
  const im = g.createImageData(W, H)
  const d = im.data
  for (let i = 0, p = 0; i < wall.length; i++, p += 4)
    if (wall[i]) {
      d[p] = 40
      d[p + 1] = 190
      d[p + 2] = 255
      d[p + 3] = 255
    }
  g.putImageData(im, 0, 0)
}

export function paintBlueprint(canvas: HTMLCanvasElement, a: Analysis): void {
  const { W, H, wall, own, rooms } = a
  const M = Math.max(W, H)
  const g = canvas.getContext('2d')!
  g.fillStyle = '#123a63'
  g.fillRect(0, 0, W, H)
  const step = Math.max(16, Math.round(M / 50))
  g.lineWidth = 1
  for (let k = 0; k * step <= M; k++) {
    g.strokeStyle = k % 5 === 0 ? 'rgba(170,210,255,.22)' : 'rgba(170,210,255,.09)'
    const v = k * step + 0.5
    g.beginPath()
    g.moveTo(v, 0)
    g.lineTo(v, H)
    g.moveTo(0, v)
    g.lineTo(W, v)
    g.stroke()
  }
  // faint room fills so the layout reads at a glance
  const layer = makeCanvas(W, H)
  const lg = layer.getContext('2d')!
  const im = lg.createImageData(W, H)
  const b = im.data
  for (let i = 0, p = 0; i < wall.length; i++, p += 4) {
    if (wall[i]) {
      b[p] = 232
      b[p + 1] = 244
      b[p + 2] = 255
      b[p + 3] = 255
    } else {
      const R = rooms[own[i]]
      if (R && !R.ext) {
        b[p] = 150
        b[p + 1] = 200
        b[p + 2] = 255
        b[p + 3] = 22
      }
    }
  }
  lg.putImageData(im, 0, 0)
  g.drawImage(layer, 0, 0)
}

/** `solid` is the opaque fog players see; the DM's own fog is translucent and hatched. */
export function paintFog(
  canvas: HTMLCanvasElement,
  a: Analysis,
  fog: Set<number>,
  solid: boolean
): void {
  const { W, H, own } = a
  const g = canvas.getContext('2d')!
  g.clearRect(0, 0, W, H)
  if (!fog.size) return
  const flag = new Uint8Array(a.rooms.length)
  for (const id of fog) flag[id] = 1
  const im = g.createImageData(W, H)
  const d = im.data
  for (let i = 0, p = 0; i < own.length; i++, p += 4) {
    if (!flag[own[i]]) continue
    if (solid) {
      d[p] = FOG_SOLID[0]
      d[p + 1] = FOG_SOLID[1]
      d[p + 2] = FOG_SOLID[2]
      d[p + 3] = 255
    } else {
      const x = i % W
      const y = (i - x) / W
      const s = (x + y) % 14 < 2
      d[p] = s ? 80 : 112
      d[p + 1] = s ? 82 : 114
      d[p + 2] = s ? 86 : 118
      d[p + 3] = s ? 235 : 195
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

/** The picture players get: the map with every fogged room painted over, so hidden rooms never leave the DM's browser. */
export async function renderPlayerImage(
  base: HTMLCanvasElement,
  a: Analysis,
  fog: Set<number>
): Promise<Blob | null> {
  const out = makeCanvas(a.W, a.H)
  const g = out.getContext('2d')!
  g.drawImage(base, 0, 0)
  const fogLayer = makeCanvas(a.W, a.H)
  paintFog(fogLayer, a, fog, true)
  g.drawImage(fogLayer, 0, 0)
  return new Promise((resolve) => out.toBlob(resolve, 'image/jpeg', 0.8))
}
