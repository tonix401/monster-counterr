import type { MonsterStatus } from '@/types/Monster'
import { letterSize, RING_FRACTION, RING_WIDTH, STATUS_COLOR } from './tokens'

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
  status: MonsterStatus,
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
