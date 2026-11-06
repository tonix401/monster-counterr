import React, { useEffect, useRef, useState } from 'react'
import { useMapStore } from '@/map/mapStore'
import { makeCanvas, paintBlueprint, paintFog, paintHover, paintLines } from '@/map/render'
import {
  handles,
  hitTest,
  isDrawn,
  moveHandle,
  opSegments,
  squareTo,
  translateOp,
  type DrawnOp,
} from '@/map/shapes'
import type { ShapeKind, WallSegment } from '@/map/types'

interface Layers {
  fog: HTMLCanvasElement
  hover: HTMLCanvasElement
  lines: HTMLCanvasElement
  blueprint: HTMLCanvasElement
}

interface View {
  scale: number
  x: number
  y: number
}
export const MIN_ZOOM = 1
export const MAX_ZOOM = 12

/** A shape or line being dragged out, before it becomes part of the map */
type Draft = { op: DrawnOp; sx: number; sy: number }
type Drag =
  | { kind: 'move'; id: number; sx: number; sy: number; orig: DrawnOp }
  | { kind: 'handle'; id: number; index: number; orig: DrawnOp }
  | { kind: 'erase' }
  | { kind: 'pan'; cx: number; cy: number; view: View }

const SHAPES: ShapeKind[] = ['rect', 'tri', 'circle']

/** The map with its fog. In `player` mode it shows exactly what connected players see. */
const MapCanvas: React.FC<{ player: boolean }> = ({ player }) => {
  const ref = useRef<HTMLCanvasElement>(null)
  const box = useRef<HTMLDivElement>(null)
  const layers = useRef<Layers | null>(null)
  const draft = useRef<Draft | null>(null)
  const drag = useRef<Drag | null>(null)
  const painting = useRef<boolean | null>(null)
  const lastPainted = useRef(0)
  const hover = useRef(0)
  const hoverItem = useRef<WallSegment[] | null>(null)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const pinch = useRef<{ dist: number; view: View } | null>(null)
  const space = useRef(false)
  const [view, setView] = useState<View>({ scale: 1, x: 0, y: 0 })
  const viewRef = useRef(view)
  viewRef.current = view

  const width = useMapStore((s) => s.width)
  const height = useMapStore((s) => s.height)
  const analysis = useMapStore((s) => s.analysis)
  const fog = useMapStore((s) => s.fog)
  const mapView = useMapStore((s) => s.view)
  const mode = useMapStore((s) => s.mode)
  const ops = useMapStore((s) => s.ops)
  const selected = useMapStore((s) => s.selected)

  /** Canvas pixels per CSS pixel on screen, so overlay strokes keep their size at any zoom */
  const unit = (): number => {
    const cv = ref.current
    return cv ? cv.width / Math.max(1, cv.getBoundingClientRect().width) : 1
  }

  const draw = (): void => {
    const cv = ref.current
    const s = useMapStore.getState()
    if (!cv || !s.base) return
    const ctx = cv.getContext('2d')!
    const L = layers.current
    const editing = s.mode !== 'fog' && s.mode !== 'pan' && !player
    const v = player ? 'map' : s.view
    ctx.clearRect(0, 0, cv.width, cv.height)
    ctx.drawImage(v === 'blueprint' && L ? L.blueprint : s.base, 0, 0)
    if (!L) return
    if (v === 'lines' || (editing && v === 'map')) ctx.drawImage(L.lines, 0, 0)
    ctx.drawImage(L.fog, 0, 0)
    if (player) return
    ctx.drawImage(L.hover, 0, 0)
    const k = unit()
    ctx.save()
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    const trace = (segs: WallSegment[]): void => {
      ctx.beginPath()
      for (const g of segs) {
        ctx.moveTo(g.x1, g.y1)
        ctx.lineTo(g.x2, g.y2)
      }
      ctx.stroke()
    }
    if (hoverItem.current) {
      ctx.strokeStyle = s.mode === 'erase' ? 'rgba(255,70,70,.9)' : 'rgba(80,170,255,.7)'
      ctx.lineWidth = 4 * k
      trace(hoverItem.current)
    }
    const sel = s.mode === 'select' ? s.ops.find((o) => o.id === s.selected) : undefined
    if (sel && isDrawn(sel)) {
      ctx.strokeStyle = '#3aa0ff'
      ctx.lineWidth = 2 * k
      ctx.setLineDash([6 * k, 4 * k])
      trace(opSegments(sel))
      ctx.setLineDash([])
      ctx.fillStyle = '#fff'
      const hs = 4.5 * k
      for (const [x, y] of handles(sel)) {
        ctx.beginPath()
        ctx.rect(x - hs, y - hs, hs * 2, hs * 2)
        ctx.fill()
        ctx.stroke()
      }
    }
    const cur = draft.current
    if (cur) {
      ctx.strokeStyle = '#ff9a3c'
      ctx.lineWidth = 2.5 * k + 1
      trace(opSegments(cur.op))
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
    hoverItem.current = null
    draw()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fog, player, mapView, mode, width, height, ops, selected, view.scale])

  // a new map starts unzoomed
  useEffect(() => setView({ scale: 1, x: 0, y: 0 }), [width, height])

  useEffect(() => {
    const down = (e: KeyboardEvent): void => {
      if (
        e.code === 'Space' &&
        !/^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test((e.target as Element).tagName)
      )
        space.current = true
    }
    const up = (e: KeyboardEvent): void => {
      if (e.code === 'Space') space.current = false
    }
    document.addEventListener('keydown', down)
    document.addEventListener('keyup', up)
    return () => {
      document.removeEventListener('keydown', down)
      document.removeEventListener('keyup', up)
    }
  }, [])

  const clamp = (v: View): View => {
    const b = box.current
    const scale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, v.scale))
    if (!b || scale === 1) return { scale, x: 0, y: 0 }
    // keep at least part of the map on screen
    const mx = (b.clientWidth * scale) / 2
    const my = (b.clientHeight * scale) / 2
    return {
      scale,
      x: Math.max(-mx, Math.min(mx, v.x)),
      y: Math.max(-my, Math.min(my, v.y)),
    }
  }

  /** Zooms keeping the point under (cx, cy), in client coordinates, where it is */
  const zoomAt = (factor: number, cx: number, cy: number, from = viewRef.current): void => {
    const b = box.current
    if (!b) return
    const r = b.getBoundingClientRect()
    const dx = cx - (r.left + r.width / 2)
    const dy = cy - (r.top + r.height / 2)
    const scale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, from.scale * factor))
    const f = scale / from.scale
    setView(clamp({ scale, x: dx - (dx - from.x) * f, y: dy - (dy - from.y) * f }))
  }

  useEffect(() => {
    const b = box.current
    if (!b) return
    const onWheel = (e: WheelEvent): void => {
      e.preventDefault()
      zoomAt(Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0018)), e.clientX, e.clientY)
    }
    b.addEventListener('wheel', onWheel, { passive: false })
    return () => b.removeEventListener('wheel', onWheel)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // the zoom buttons talk to the canvas through events so the state stays in here
  useEffect(() => {
    const on = (e: Event): void => {
      const b = box.current
      if (!b || player) return
      const r = b.getBoundingClientRect()
      const f = (e as CustomEvent<number>).detail
      if (f === 0) setView({ scale: 1, x: 0, y: 0 })
      else zoomAt(f, r.left + r.width / 2, r.top + r.height / 2)
    }
    window.addEventListener('map-zoom', on)
    return () => window.removeEventListener('map-zoom', on)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player])

  const toWork = (e: { clientX: number; clientY: number }): [number, number] => {
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

  const tol = (): number => 10 * unit()

  const pick = (x: number, y: number) => {
    const s = useMapStore.getState()
    return hitTest(x, y, tol(), s.ops, s.analysis?.auto ?? [])
  }

  const updateHoverItem = (x: number, y: number): void => {
    const h = pick(x, y)
    const next = h ? (h.src === 'op' ? opSegments(h.op) : [h.seg]) : null
    const key = (g: WallSegment[] | null): string =>
      g ? `${g.length}:${g[0].x1},${g[0].y1},${g[0].x2},${g[0].y2}` : ''
    const same = key(next) === key(hoverItem.current)
    hoverItem.current = next
    if (!same) draw()
  }

  const eraseAt = (x: number, y: number): void => {
    const h = pick(x, y)
    if (!h) return
    const s = useMapStore.getState()
    if (h.src === 'op') s.removeOp(h.op.id as number)
    else s.cutAuto(h.seg)
    hoverItem.current = null
  }

  const handleAt = (x: number, y: number): { id: number; index: number; orig: DrawnOp } | null => {
    const s = useMapStore.getState()
    const sel = s.ops.find((o) => o.id === s.selected)
    if (!sel || !isDrawn(sel)) return null
    const r = 9 * unit()
    const i = handles(sel).findIndex(([hx, hy]) => Math.hypot(hx - x, hy - y) <= r)
    return i < 0 ? null : { id: sel.id as number, index: i, orig: sel }
  }

  const startPan = (e: React.PointerEvent): void => {
    drag.current = { kind: 'pan', cx: e.clientX, cy: e.clientY, view: viewRef.current }
  }

  const cancelGesture = (): void => {
    draft.current = null
    drag.current = null
    painting.current = null
    useMapStore.getState().endGesture()
  }

  const onPointerDown = (e: React.PointerEvent): void => {
    if (!analysis) return
    e.currentTarget.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size === 2) {
      // two fingers: pinch and pan, abandoning whatever the first one started
      cancelGesture()
      const [a, b] = [...pointers.current.values()]
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), view: viewRef.current }
      return
    }
    const s = useMapStore.getState()
    if (e.button === 1 || e.button === 2 || space.current || s.mode === 'pan') {
      e.preventDefault()
      return startPan(e)
    }
    if (e.button > 0) return
    const [x, y] = toWork(e)
    if (s.mode === 'fog' || player) {
      const id = roomAt(x, y)
      if (!id) return
      painting.current = !s.fog.has(id)
      lastPainted.current = id
      toggleRoom(id, painting.current)
    } else if (s.mode === 'select') {
      const hd = handleAt(x, y)
      if (hd) {
        s.beginGesture()
        drag.current = { kind: 'handle', ...hd }
        return
      }
      const h = pick(x, y)
      if (!h) return s.select(null)
      s.beginGesture()
      let op = h.src === 'op' ? h.op : null
      if (h.src === 'auto') {
        const id = s.adoptAuto(h.seg)
        op = useMapStore.getState().ops.find((o) => o.id === id) as DrawnOp
      }
      s.select(op!.id as number)
      drag.current = { kind: 'move', id: op!.id as number, sx: x, sy: y, orig: op! }
    } else if (s.mode === 'erase') {
      s.beginGesture()
      drag.current = { kind: 'erase' }
      eraseAt(x, y)
    } else {
      draft.current = {
        op: shapeFor(s.mode, x, y, x, y, e.shiftKey, s.width, s.height),
        sx: x,
        sy: y,
      }
      draw()
    }
  }

  const onPointerMove = (e: React.PointerEvent): void => {
    if (pointers.current.has(e.pointerId))
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const pc = pinch.current
    if (pc && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()]
      const d = Math.hypot(a.x - b.x, a.y - b.y)
      zoomAt(d / pc.dist, (a.x + b.x) / 2, (a.y + b.y) / 2, pc.view)
      return
    }
    const dg = drag.current
    if (dg?.kind === 'pan') {
      setView(
        clamp({
          scale: dg.view.scale,
          x: dg.view.x + e.clientX - dg.cx,
          y: dg.view.y + e.clientY - dg.cy,
        })
      )
      return
    }
    if (!analysis) return
    const [x, y] = toWork(e)
    const s = useMapStore.getState()
    const cur = draft.current
    if (cur) {
      draft.current = {
        ...cur,
        op: shapeFor(s.mode, cur.sx, cur.sy, x, y, e.shiftKey, s.width, s.height),
      }
      draw()
      return
    }
    if (dg?.kind === 'move') s.updateOp(dg.id, translateOp(dg.orig, x - dg.sx, y - dg.sy))
    else if (dg?.kind === 'handle') s.updateOp(dg.id, moveHandle(dg.orig, dg.index, x, y))
    else if (dg?.kind === 'erase') {
      eraseAt(x, y)
      updateHoverItem(x, y)
    } else if (painting.current !== null) {
      const id = roomAt(x, y)
      if (id && id !== lastPainted.current) toggleRoom(id, painting.current)
    } else if (mode === 'erase' || mode === 'select') updateHoverItem(x, y)
    else if (mode === 'fog' && !player) setHover(roomAt(x, y))
  }

  const endPointer = (e: React.PointerEvent): void => {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size < 2) pinch.current = null
    if (pointers.current.size > 0) return
    painting.current = null
    lastPainted.current = 0
    const dg = drag.current
    drag.current = null
    if (dg && dg.kind !== 'pan') useMapStore.getState().endGesture()
    const c = draft.current
    if (!c) return
    draft.current = null
    const big = Math.max(Math.abs(c.op.x2 - c.op.x1), Math.abs(c.op.y2 - c.op.y1))
    if (big < 6) return draw()
    useMapStore.getState().addOp(c.op)
  }

  const cursor =
    mode === 'pan' || space.current
      ? 'grab'
      : mode === 'fog' || player
        ? 'pointer'
        : mode === 'select'
          ? 'default'
          : 'crosshair'

  return (
    <div ref={box} className="map-viewport">
      <canvas
        ref={ref}
        className="map-canvas"
        style={{
          cursor,
          transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
        }}
        width={width}
        height={height}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onContextMenu={(e) => e.preventDefault()}
        onPointerLeave={() => {
          if (drag.current || draft.current || painting.current !== null) return
          setHover(0)
          if (hoverItem.current) {
            hoverItem.current = null
            draw()
          }
        }}
      />
    </div>
  )
}

function nearestOnWalls(x: number, y: number, r: number): [number, number] | null {
  const s = useMapStore.getState()
  const walls = (s.analysis?.auto ?? []).concat(...s.ops.filter(isDrawn).map((o) => opSegments(o)))
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

/**
 * The item being dragged out. Lines snap straight and to nearby walls; Shift turns that off for lines
 * and makes shapes square.
 */
function shapeFor(
  mode: string,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  shift: boolean,
  w: number,
  h: number
): DrawnOp {
  if ((SHAPES as string[]).includes(mode)) {
    if (shift) [x2, y2] = squareTo(x1, y1, x2, y2)
    return { type: 'shape', kind: mode as ShapeKind, x1, y1, x2, y2 }
  }
  const r = Math.max(8, Math.max(w, h) * 0.012)
  if (!shift) {
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
