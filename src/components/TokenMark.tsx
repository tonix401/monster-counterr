import React from 'react'
import type { MonsterStatus } from '@/types/Monster'
import {
  letterSize,
  RING_FRACTION,
  RING_WIDTH,
  STATUS_COLOR,
  tokenRadius,
  type PlayerToken,
} from '@/map/tokens'

interface TokenMarkProps {
  cx: number
  cy: number
  r: number
  initials: string
  status: MonsterStatus
  /** Dimmed, for monsters the players can't see */
  faint?: boolean
}

/** One token as SVG, in the units of the svg it sits in: letters on a disc inside a health ring */
export const TokenMark: React.FC<TokenMarkProps> = ({ cx, cy, r, initials, status, faint }) => {
  const ring = Math.max(2, r * RING_WIDTH)
  const mid = r - ring / 2
  const circumference = 2 * Math.PI * mid
  const fraction = RING_FRACTION[status]
  return (
    <g opacity={faint ? 0.55 : 1}>
      <circle cx={cx} cy={cy} r={r} fill="#1c1f2b" />
      <text
        x={cx}
        y={cy + r * 0.03}
        textAnchor="middle"
        dominantBaseline="central"
        fill="#f4f6fb"
        fontWeight={600}
        fontFamily="system-ui, sans-serif"
        fontSize={(r - ring) * letterSize(initials)}
      >
        {initials}
      </text>
      <circle
        cx={cx}
        cy={cy}
        r={mid}
        fill="none"
        stroke="rgba(255,255,255,.25)"
        strokeWidth={ring}
      />
      {fraction > 0 && (
        <circle
          cx={cx}
          cy={cy}
          r={mid}
          fill="none"
          stroke={STATUS_COLOR[status]}
          strokeWidth={ring}
          strokeDasharray={`${circumference * fraction} ${circumference}`}
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      )}
    </g>
  )
}

/** Where the picture sits in a frame that zooms and pans it (screen pixels) */
export interface TokenView {
  frameWidth: number
  frameHeight: number
  scale: number
  x: number
  y: number
}

/**
 * The tokens players see, laid over their map picture. Without `view` it fills the same box the
 * picture fits (contain). With `view` the frame is zoomed and panned: the svg is then as big as the
 * frame and the zoom is applied inside it as an svg transform, so the browser draws the tokens
 * again at the real size instead of stretching a bitmap, and they stay sharp at any zoom.
 */
export const TokenLayer: React.FC<{
  width: number
  height: number
  tokens: PlayerToken[]
  view?: TokenView
}> = ({ width, height, tokens, view }) => {
  const r = tokenRadius(width, height)
  const marks = tokens.map((t, i) => (
    <TokenMark key={i} cx={t.x} cy={t.y} r={r} initials={t.initials} status={t.status} />
  ))
  if (!view)
    return (
      <svg
        className="token-layer"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
      >
        {marks}
      </svg>
    )
  // the picture is fitted into the frame (contain), then zoomed and moved by the view
  const fit = Math.min(view.frameWidth / width, view.frameHeight / height)
  const ox = (view.frameWidth - width * fit) / 2
  const oy = (view.frameHeight - height * fit) / 2
  return (
    <svg
      className="token-layer"
      viewBox={`0 0 ${view.frameWidth} ${view.frameHeight}`}
      aria-hidden="true"
    >
      <g
        transform={`translate(${view.x} ${view.y}) scale(${view.scale}) translate(${ox} ${oy}) scale(${fit})`}
      >
        {marks}
      </g>
    </svg>
  )
}
