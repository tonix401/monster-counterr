import {
  FLAME_PATH,
  letterSize,
  RING_FRACTION,
  RING_WIDTH,
  STATUS_COLOR,
  type TokenStatus,
} from './tokens'

/**
 * Draws one token on a canvas: a dark disc with the monster's letters, ringed by a grey track and
 * a coloured arc that shows how healthy it is. `faint` is for monsters the players can't see.
 * `TokenMark` draws the same thing as SVG for the list, the encounter table and the players.
 */
export function drawToken(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  initials: string,
  status: TokenStatus,
  faint = false
): void {
  const ring = Math.max(2, r * RING_WIDTH)
  g.save()
  g.globalAlpha = faint ? 0.55 : 1

  g.beginPath()
  g.arc(x, y, r, 0, Math.PI * 2)
  g.fillStyle = '#1c1f2b'
  g.fill()

  g.fillStyle = '#f4f6fb'
  g.font = `600 ${(r - ring) * letterSize(initials)}px system-ui, sans-serif`
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText(initials, x, y + r * 0.03)

  g.lineWidth = ring
  g.lineCap = 'butt'
  g.strokeStyle = 'rgba(255,255,255,.25)'
  g.beginPath()
  g.arc(x, y, r - ring / 2, 0, Math.PI * 2)
  g.stroke()

  const f = RING_FRACTION[status]
  if (f > 0) {
    g.strokeStyle = STATUS_COLOR[status]
    g.beginPath()
    g.arc(x, y, r - ring / 2, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * f)
    g.stroke()
  }
  g.restore()
}

/** A fire on a canvas: the flame on a dark disc, the size of a token */
export function drawFire(g: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  g.save()
  g.beginPath()
  g.arc(x, y, r, 0, Math.PI * 2)
  g.fillStyle = '#1c1f2b'
  g.fill()
  g.lineWidth = Math.max(2, r * 0.12)
  g.strokeStyle = '#ff9d2e'
  g.stroke()
  // the flame spans about x 7..17 and y 2..17.5 of its 24 box, so its middle is (12, 9.75)
  const k = (r * 1.5) / 24
  g.translate(x - 12 * k, y - 9.75 * k)
  g.scale(k, k)
  const flame = new Path2D(FLAME_PATH)
  g.fillStyle = '#ffb347'
  g.fill(flame)
  g.restore()
}
