import React, { useEffect, useRef } from 'react'
import { useMapStore } from '@/map/mapStore'
import { makeCanvas, paintBlueprint, paintFog, paintHover, paintLines } from '@/map/render'
import type { MapOp } from '@/map/types'

interface Layers {
  fog: HTMLCanvasElement
  hover: HTMLCanvasElement
  lines: HTMLCanvasElement
  blueprint: HTMLCanvasElement
}

type Pending = (MapOp & { sx?: number; sy?: number }) | null

/** The map with its fog. In `player` mode it shows exactly what connected players see. */
const MapCanvas: React.FC<{ player: boolean }> = ({ player }) => {
  const ref = useRef<HTMLCanvasElement>(null)
  const layers = useRef<Layers | null>(null)
  const pending = useRef<Pending>(null)
  const painting = useRef<boolean | null>(null)
  const lastPainted = useRef(0)
  const hover = useRef(0)

  const width = useMapStore((s) => s.width)
  const height = useMapStore((s) => s.height)
  const analysis = useMapStore((s) => s.analysis)
  const fog = useMapStore((s) => s.fog)
  const view = useMapStore((s) => s.view)
  const mode = useMapStore((s) => s.mode)

  const draw = (): void => {
    const cv = ref.current
    const s = useMapStore.getState()
    if (!cv || !s.base) return
    const ctx = cv.getContext('2d')!
    const L = layers.current
    const editing = s.mode !== 'fog' && !player
    const v = player ? 'map' : s.view
    ctx.clearRect(0, 0, cv.width, cv.height)
    ctx.drawImage(v === 'blueprint' && L ? L.blueprint : s.base, 0, 0)
    if (!L) return
    if (v === 'lines' || (editing && v === 'map')) ctx.drawImage(L.lines, 0, 0)
    ctx.drawImage(L.fog, 0, 0)
    if (player) return
    ctx.drawImage(L.hover, 0, 0)
    const cur = pending.current
    if (!cur) return
    const lw = lineWidth(s.width, s.height)
    ctx.save()
    if (cur.type === 'wall') {
      ctx.strokeStyle = '#ff9a3c'
      ctx.lineWidth = lw + 1
      ctx.lineCap = 'square'
      ctx.beginPath()
      ctx.moveTo(cur.x1, cur.y1)
      ctx.lineTo(cur.x2, cur.y2)
      ctx.stroke()
      ctx.fillStyle = '#ff9a3c'
      for (const [x, y] of [
        [cur.x1, cur.y1],
        [cur.x2, cur.y2],
      ]) {
        ctx.beginPath()
        ctx.arc(x, y, lw * 1.6, 0, 7)
        ctx.fill()
      }
    } else {
      ctx.strokeStyle = 'rgba(255,90,160,.55)'
      ctx.lineWidth = cur.w
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      ctx.moveTo(cur.pts[0][0], cur.pts[0][1])
      for (const p of cur.pts) ctx.lineTo(p[0], p[1])
      ctx.stroke()
    }
    ctx.restore()
  }

  // the wall layers only change when the walls do
  useEffect(() => {
    if (!analysis) {
      layers.current = null
      draw()
      return
    }
    const { W, H } = analysis
    const L: Layers = {
      fog: makeCanvas(W, H),
      hover: makeCanvas(W, H),
      lines: makeCanvas(W, H),
      blueprint: makeCanvas(W, H),
    }
    paintLines(L.lines, analysis)
    paintBlueprint(L.blueprint, analysis)
    layers.current = L
    hover.current = 0
    paintFog(L.fog, analysis, useMapStore.getState().fog, player)
    draw()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysis])

  useEffect(() => {
    if (analysis && layers.current) paintFog(layers.current.fog, analysis, fog, player)
    draw()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fog, player, view, mode, width, height])

  const toWork = (e: React.PointerEvent): [number, number] => {
    const cv = ref.current!
    const r = cv.getBoundingClientRect()
    const x = ((e.clientX - r.left) * cv.width) / r.width
    const y = ((e.clientY - r.top) * cv.height) / r.height
    return [Math.max(0, Math.min(cv.width - 1, x)), Math.max(0, Math.min(cv.height - 1, y))]
  }
  const roomAt = (x: number, y: number): number =>
    analysis ? analysis.own[(y | 0) * analysis.W + (x | 0)] : 0

  const toggleRoom = (id: number, on: boolean): void => {
    if (useMapStore.getState().setFog(id, on)) lastPainted.current = id
  }

  const setHover = (id: number): void => {
    if (!analysis || !layers.current || id === hover.current) return
    hover.current = id
    paintHover(layers.current.hover, analysis, id)
    draw()
  }

  const onPointerDown = (e: React.PointerEvent): void => {
    if (!analysis || e.button > 0) return
    const [x, y] = toWork(e)
    e.currentTarget.setPointerCapture(e.pointerId)
    const s = useMapStore.getState()
    if (s.mode === 'fog' || player) {
      const id = roomAt(x, y)
      if (!id) return
      painting.current = !s.fog.has(id)
      lastPainted.current = id
      toggleRoom(id, painting.current)
    } else if (s.mode === 'wall') {
      pending.current = shapeWall(x, y, x, y, e.shiftKey, s.width, s.height)
      pending.current.sx = x
      pending.current.sy = y
      draw()
    } else {
      pending.current = {
        type: 'erase',
        w: Math.max(10, Math.round(Math.max(s.width, s.height) / 90)),
        pts: [[x, y]],
      }
      draw()
    }
  }

  const onPointerMove = (e: React.PointerEvent): void => {
    if (!analysis) return
    const [x, y] = toWork(e)
    const cur = pending.current
    if (cur) {
      if (cur.type === 'wall') {
        const { sx = x, sy = y } = cur
        const s = useMapStore.getState()
        pending.current = shapeWall(sx, sy, x, y, e.shiftKey, s.width, s.height)
        pending.current.sx = sx
        pending.current.sy = sy
      } else cur.pts.push([x, y])
      draw()
      return
    }
    const id = roomAt(x, y)
    if (painting.current !== null) {
      if (id && id !== lastPainted.current) toggleRoom(id, painting.current)
      return
    }
    if (mode === 'fog' && !player) setHover(id)
  }

  const endPointer = (): void => {
    painting.current = null
    lastPainted.current = 0
    const c = pending.current
    if (!c) return
    pending.current = null
    if (c.type === 'wall') {
      if (Math.hypot(c.x2 - c.x1, c.y2 - c.y1) < 6) return draw()
      delete c.sx
      delete c.sy
    }
    useMapStore.getState().addEdit(c)
  }

  return (
    <canvas
      ref={ref}
      className={`map-canvas ${mode === 'fog' || player ? 'map-canvas-fog' : 'map-canvas-draw'}`}
      width={width}
      height={height}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
      onPointerLeave={() => !pending.current && painting.current === null && setHover(0)}
    />
  )
}

const lineWidth = (w: number, h: number): number => Math.max(3, Math.round(Math.max(w, h) / 450))

function nearestOnWalls(x: number, y: number, r: number): [number, number] | null {
  const s = useMapStore.getState()
  const walls = (s.analysis?.auto ?? []).concat(
    ...[s.baseOps, s.edits].map((ops) => ops.filter((o) => o.type === 'wall'))
  )
  let best: [number, number] | null = null
  let bd = r * r
  for (const w of walls) {
    const dx = w.x2 - w.x1
    const dy = w.y2 - w.y1
    const len = dx * dx + dy * dy
    const t = len ? Math.max(0, Math.min(1, ((x - w.x1) * dx + (y - w.y1) * dy) / len)) : 0
    const px = w.x1 + t * dx
    const py = w.y1 + t * dy
    const d = (px - x) ** 2 + (py - y) ** 2
    if (d < bd) {
      bd = d
      best = [px, py]
    }
  }
  return best
}

/** Snaps a dragged wall to the horizontal or vertical and to nearby walls; `free` (Shift) turns that off. */
function shapeWall(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  free: boolean,
  w: number,
  h: number
): Extract<MapOp, { type: 'wall' }> & { sx?: number; sy?: number } {
  const r = Math.max(8, Math.max(w, h) * 0.012)
  if (!free) {
    const s = nearestOnWalls(x1, y1, r)
    if (s) [x1, y1] = s
    const ang = Math.abs((Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI)
    const lock = ang < 12 || ang > 168 ? 'h' : Math.abs(ang - 90) < 12 ? 'v' : null
    if (lock === 'h') y2 = y1
    if (lock === 'v') x2 = x1
    const e = nearestOnWalls(x2, y2, r)
    if (e) {
      ;[x2, y2] = e
      if (lock === 'h') y2 = y1
      if (lock === 'v') x2 = x1
    }
  }
  return { type: 'wall', x1, y1, x2, y2 }
}

export default MapCanvas
