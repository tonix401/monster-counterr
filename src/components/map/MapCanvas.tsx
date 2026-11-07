import React, { useEffect, useRef, useState } from 'react'
import {
  addEllipse,
  addPolyline,
  addRect,
  dropNode,
  edgeEnds,
  edgeSegments,
  ellipsePoints,
  hitEdge,
  hitTest,
  mergeTarget,
  moveNode,
  removeEdge,
  snapPoint,
  type Snap,
} from '@/map/graph'
import { useMapStore } from '@/map/mapStore'
import { makeCanvas, paintBlueprint, paintFog, paintHover } from '@/map/render'
import type { Graph, MapMode, WallSegment } from '@/map/types'

interface Layers {
  fog: HTMLCanvasElement
  hover: HTMLCanvasElement
  blueprint: HTMLCanvasElement
}

interface View {
  scale: number
  x: number
  y: number
}
export const MIN_ZOOM = 1
export const MAX_ZOOM = 12

/** A line, rectangle or circle being dragged out, before it becomes part of the map */
type Draft = { mode: MapMode; sx: number; sy: number; box: WallSegment }
type Drag =
  | { kind: 'node'; id: number; sx: number; sy: number; moved: boolean; g0: Graph }
  | {
      kind: 'edge'
      id: number
      sx: number
      sy: number
      moved: boolean
      g0: Graph
      ends: WallSegment
    }
  | { kind: 'erase' }
  | { kind: 'pan'; cx: number; cy: number; view: View }

/** The map with its fog. In `player` mode it shows exactly what connected players see. */
const MapCanvas: React.FC<{ player: boolean }> = ({ player }) => {
  const ref = useRef<HTMLCanvasElement>(null)
  const box = useRef<HTMLDivElement>(null)
  const vec = useRef<HTMLCanvasElement>(null)
  const layers = useRef<Layers | null>(null)
  const draft = useRef<Draft | null>(null)
  /** Corners placed so far of the polygon being drawn, and where the pointer is now */
  const poly = useRef<[number, number][]>([])
  const polyAt = useRef<[number, number] | null>(null)
  const drag = useRef<Drag | null>(null)
  /** A line started with a click: it follows the pointer until the next click */
  const pending = useRef(false)
  /** Where the next mode change starts a line (a double click on a node in select mode) */
  const startAt = useRef<[number, number] | null>(null)
  const painting = useRef<boolean | null>(null)
  const lastPainted = useRef(0)
  const hover = useRef(0)
  /** What the pointer is over: a wall to outline, or a node to ring */
  const hoverItem = useRef<{ segs?: WallSegment[]; node?: [number, number] } | null>(null)
  /** Where a new line would attach, shown while drawing */
  const snapHint = useRef<Snap | null>(null)
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
  const fogStyle = useMapStore((s) => s.fogStyle)
  const mapView = useMapStore((s) => s.view)
  const mode = useMapStore((s) => s.mode)
  const graph = useMapStore((s) => s.graph)
  const preview = useMapStore((s) => s.preview)
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
    const v = player ? 'map' : s.view
    ctx.clearRect(0, 0, cv.width, cv.height)
    ctx.drawImage(v === 'blueprint' && L ? L.blueprint : s.base, 0, 0)
    if (!L) return
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
    const hv = hoverItem.current
    if (hv?.segs) {
      ctx.strokeStyle = s.mode === 'erase' ? 'rgba(255,70,70,.9)' : 'rgba(80,170,255,.7)'
      ctx.lineWidth = 4 * k
      trace(hv.segs)
    }
    if (hv?.node) {
      ctx.strokeStyle = 'rgba(80,170,255,.9)'
      ctx.lineWidth = 2 * k
      ctx.beginPath()
      ctx.arc(hv.node[0], hv.node[1], 7 * k, 0, Math.PI * 2)
      ctx.stroke()
    }
    const sel = s.mode === 'select' ? s.selected : null
    if (sel) {
      ctx.strokeStyle = '#3aa0ff'
      ctx.lineWidth = 2 * k
      if (sel.kind === 'edge') {
        const e = edgeEnds(s.graph, sel.id)
        ctx.setLineDash([6 * k, 4 * k])
        if (e) trace([e])
        ctx.setLineDash([])
      } else {
        const n = s.graph.nodes.find((o) => o.id === sel.id)
        if (n) {
          ctx.fillStyle = '#fff'
          ctx.beginPath()
          ctx.arc(n.x, n.y, 6 * k, 0, Math.PI * 2)
          ctx.fill()
          ctx.stroke()
        }
      }
    }
    const hint = snapHint.current
    if (hint && hint.kind !== 'free') {
      ctx.strokeStyle = '#ff9a3c'
      ctx.lineWidth = 2 * k
      ctx.beginPath()
      ctx.arc(hint.x, hint.y, (hint.kind === 'node' ? 7 : 4) * k, 0, Math.PI * 2)
      ctx.stroke()
    }
    const cur = draft.current
    if (cur) {
      ctx.strokeStyle = '#ff9a3c'
      ctx.lineWidth = 2.5 * k + 1
      const pts = draftPoints(cur.mode, cur.box, Math.max(s.width, s.height))
      trace(
        pts
          .map((p, i) => {
            const q = pts[(i + 1) % pts.length]
            return { x1: p[0], y1: p[1], x2: q[0], y2: q[1] }
          })
          .slice(0, cur.mode === 'wall' ? 1 : pts.length)
      )
    }
    const pts = poly.current
    if (pts.length) {
      ctx.strokeStyle = '#ff9a3c'
      ctx.lineWidth = 2.5 * k + 1
      ctx.beginPath()
      ctx.moveTo(pts[0][0], pts[0][1])
      for (const [x, y] of pts.slice(1)) ctx.lineTo(x, y)
      if (polyAt.current) ctx.lineTo(polyAt.current[0], polyAt.current[1])
      ctx.stroke()
      ctx.fillStyle = '#ff9a3c'
      pts.forEach(([x, y], i) => {
        ctx.beginPath()
        // the first corner is bigger: clicking it closes the polygon
        ctx.arc(x, y, (i === 0 ? 5.5 : 3.5) * k, 0, Math.PI * 2)
        ctx.fill()
      })
    }
    ctx.restore()
  }

  /**
   * Walls are drawn as strokes on a canvas the size of the screen, so they stay sharp and the same
   * width at any zoom. The map's own canvas only holds the picture, the fog and the room highlight.
   */
  const drawVectors = (): void => {
    const v = vec.current
    const cv = ref.current
    const b = box.current
    if (!v || !cv || !b) return
    const dpr = window.devicePixelRatio || 1
    const w = Math.round(b.clientWidth * dpr)
    const h = Math.round(b.clientHeight * dpr)
    if (v.width !== w || v.height !== h) {
      v.width = w
      v.height = h
    }
    const g = v.getContext('2d')!
    g.setTransform(1, 0, 0, 1, 0, 0)
    g.clearRect(0, 0, w, h)
    const s = useMapStore.getState()
    const editing = s.mode !== 'fog' && s.mode !== 'pan'
    const show = !player && s.analysis && (s.view !== 'map' || editing)
    if (!show) return
    const br = b.getBoundingClientRect()
    const cr = cv.getBoundingClientRect()
    const sc = (cr.width / cv.width) * dpr
    g.setTransform(sc, 0, 0, sc, (cr.left - br.left) * dpr, (cr.top - br.top) * dpr)
    g.lineWidth = (s.view === 'blueprint' ? 2 : 3) * (dpr / sc)
    g.lineCap = 'square'
    g.strokeStyle = s.view === 'blueprint' ? '#e8f4ff' : '#28beff'
    // while the detection preview is open the current walls step back and the preview stands out
    g.save()
    if (s.preview) g.globalAlpha = 0.35
    g.beginPath()
    for (const m of edgeSegments(s.graph, false)) {
      g.moveTo(m.x1, m.y1)
      g.lineTo(m.x2, m.y2)
    }
    g.stroke()
    g.restore()
    if (s.preview) {
      // walls the detection panel would put on the map
      g.save()
      g.strokeStyle = '#ffb347'
      g.lineWidth = 3.5 * (dpr / sc)
      g.setLineDash([8 * (dpr / sc), 5 * (dpr / sc)])
      g.beginPath()
      for (const m of s.preview) {
        g.moveTo(m.x1, m.y1)
        g.lineTo(m.x2, m.y2)
      }
      g.stroke()
      g.restore()
    }
    if (editing) {
      // the nodes the walls hang on: where new lines attach and what can be dragged
      const rr = 3.5 * (dpr / sc)
      if (s.preview) g.globalAlpha = 0.35
      g.fillStyle = s.view === 'blueprint' ? '#28beff' : '#fff'
      g.strokeStyle = s.view === 'blueprint' ? '#e8f4ff' : '#0a6e99'
      g.lineWidth = 1.5 * (dpr / sc)
      // the border itself is invisible: only the nodes walls hang on show
      const hung = new Set(s.graph.edges.filter((e) => !e.border).flatMap((e) => [e.a, e.b]))
      for (const n of s.graph.nodes) {
        if (n.border && !hung.has(n.id)) continue
        g.beginPath()
        g.arc(n.x, n.y, rr, 0, Math.PI * 2)
        g.fill()
        g.stroke()
      }
    }
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
      blueprint: makeCanvas(W, H),
    }
    paintBlueprint(L.blueprint, analysis)
    layers.current = L
    hover.current = 0
    paintFog(L.fog, analysis, useMapStore.getState().fog, useMapStore.getState().fogStyle, player)
    draw()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysis])

  useEffect(() => {
    if (analysis && layers.current) paintFog(layers.current.fog, analysis, fog, fogStyle, player)
    hoverItem.current = null
    draw()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fog, fogStyle, player, mapView, mode, width, height, graph, selected, view.scale])

  useEffect(() => {
    drawVectors()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysis, graph, preview, mapView, mode, player, view, width, height])

  useEffect(() => {
    const b = box.current
    if (!b) return
    const ro = new ResizeObserver(() => drawVectors())
    ro.observe(b)
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // a half-drawn polygon is dropped when the tool changes; Enter finishes it, Escape drops it,
  // Backspace takes back the last corner
  useEffect(() => {
    cancelPoly()
    draft.current = null
    pending.current = false
    snapHint.current = null
    const from = startAt.current
    startAt.current = null
    if (mode === 'wall' && from) {
      draft.current = {
        mode: 'wall',
        sx: from[0],
        sy: from[1],
        box: { x1: from[0], y1: from[1], x2: from[0], y2: from[1] },
      }
      pending.current = true
      draw()
    }
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && pending.current) {
        draft.current = null
        pending.current = false
        draw()
        e.preventDefault()
        return e.stopImmediatePropagation()
      }
      if (useMapStore.getState().mode !== 'poly' || !poly.current.length) return
      if (e.key === 'Enter') finishPoly(false)
      else if (e.key === 'Escape') cancelPoly()
      else if (e.key === 'Backspace') {
        poly.current = poly.current.slice(0, -1)
        polyAt.current = null
        draw()
      } else return
      e.preventDefault()
      e.stopImmediatePropagation()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

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

  const hoverAt = (x: number, y: number, edgesOnly: boolean): void => {
    const g = useMapStore.getState().graph
    const t = tol()
    let next: { segs?: WallSegment[]; node?: [number, number] } | null = null
    const hit = edgesOnly ? null : hitTest(g, x, y, t)
    if (hit?.kind === 'node') next = { node: [hit.node.x, hit.node.y] }
    else {
      const e = hit?.kind === 'edge' ? hit.edge : hitEdge(g, x, y, t)
      const ends = e && edgeEnds(g, e.id)
      if (ends) next = { segs: [ends] }
    }
    const key = (h: typeof next): string =>
      h
        ? h.node
          ? `n${h.node}`
          : `e${h.segs![0].x1},${h.segs![0].y1},${h.segs![0].x2},${h.segs![0].y2}`
        : ''
    const same = key(next) === key(hoverItem.current)
    hoverItem.current = next
    if (!same) draw()
  }

  const updateHoverItem = (x: number, y: number): void =>
    hoverAt(x, y, useMapStore.getState().mode === 'erase')

  const eraseAt = (x: number, y: number): void => {
    const s = useMapStore.getState()
    const e = hitEdge(s.graph, x, y, tol())
    if (!e) return
    s.setGraph(removeEdge(s.graph, e.id))
    hoverItem.current = null
  }

  /** Where a point lands when the pointer is over it: on a node or wall nearby unless Shift is held */
  const snapTo = (x: number, y: number, shift: boolean, g = useMapStore.getState().graph): Snap =>
    shift ? { kind: 'free', x, y } : snapPoint(g, x, y, tol())

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
    if (e.button === 2 && ['wall', 'rect', 'circle', 'poly'].includes(s.mode) && !space.current) {
      // while drawing, the right button moves a node
      const pos = { sx: toWork(e)[0], sy: toWork(e)[1] }
      const hit = hitTest(s.graph, pos.sx, pos.sy, tol())
      if (hit?.kind === 'node' && !hit.node.border) {
        e.preventDefault()
        s.beginGesture()
        drag.current = {
          kind: 'node',
          id: hit.node.id,
          ...pos,
          moved: false,
          g0: s.graph,
        }
        return
      }
    }
    if (e.button === 1 || e.button === 2 || space.current || s.mode === 'pan') {
      e.preventDefault()
      return startPan(e)
    }
    if (e.button > 0) return
    const [x, y] = toWork(e)
    if (pending.current && draft.current && s.mode === 'wall') {
      // the second click of a line: it ends here
      const c = draft.current
      commitDraft({
        ...c,
        box: boxFor(c.mode, c.sx, c.sy, x, y, e.shiftKey, s.graph, tol()),
      })
      draft.current = null
      pending.current = false
      snapHint.current = null
      return draw()
    }
    if (s.mode === 'fog' || player) {
      const id = roomAt(x, y)
      if (!id) return
      painting.current = !s.fog.has(id)
      lastPainted.current = id
      toggleRoom(id, painting.current)
    } else if (s.mode === 'select') {
      const hit = hitTest(s.graph, x, y, tol())
      if (!hit) return s.select(null)
      s.beginGesture()
      if (hit.kind === 'node') {
        s.select({ kind: 'node', id: hit.node.id })
        // border nodes are fixed
        if (!hit.node.border)
          drag.current = { kind: 'node', id: hit.node.id, sx: x, sy: y, moved: false, g0: s.graph }
      } else {
        const ends = edgeEnds(s.graph, hit.edge.id)!
        s.select({ kind: 'edge', id: hit.edge.id })
        const fixed = s.graph.nodes.some(
          (n) => n.border && (n.id === hit.edge.a || n.id === hit.edge.b)
        )
        if (!fixed)
          drag.current = {
            kind: 'edge',
            id: hit.edge.id,
            sx: x,
            sy: y,
            moved: false,
            g0: s.graph,
            ends,
          }
      }
      if (!drag.current) s.endGesture() // a fixed border node or wall: nothing to drag
    } else if (s.mode === 'erase') {
      s.beginGesture()
      drag.current = { kind: 'erase' }
      eraseAt(x, y)
    } else if (s.mode === 'poly') {
      const pts = poly.current
      if (pts.length >= 3 && Math.hypot(x - pts[0][0], y - pts[0][1]) <= tol())
        return finishPoly(true)
      const near = snapTo(x, y, e.shiftKey)
      const last = pts[pts.length - 1]
      // the second click of a double click lands on the same spot
      if (last && Math.hypot(near.x - last[0], near.y - last[1]) < 3 * unit()) return
      pts.push([near.x, near.y])
      polyAt.current = [near.x, near.y]
      draw()
    } else {
      const start = s.mode === 'wall' ? snapTo(x, y, e.shiftKey) : { x, y }
      draft.current = {
        mode: s.mode,
        sx: start.x,
        sy: start.y,
        box: boxFor(s.mode, start.x, start.y, x, y, e.shiftKey, s.graph, tol()),
      }
      draw()
    }
  }

  /** Only a click on the first corner closes the shape; otherwise the lines stay open */
  const finishPoly = (closed: boolean): void => {
    const pts = poly.current
    poly.current = []
    polyAt.current = null
    if (pts.length >= 2) {
      const s = useMapStore.getState()
      s.setGraph(addPolyline(s.graph, pts, closed, tol()))
    }
    draw()
  }

  const cancelPoly = (): void => {
    poly.current = []
    polyAt.current = null
    draw()
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
    const drawing = !dg && ['wall', 'rect', 'circle', 'poly'].includes(s.mode)
    if (drawing) {
      const h = snapTo(x, y, e.shiftKey)
      const had = snapHint.current
      snapHint.current = h
      if (s.mode === 'poly' && poly.current.length) polyAt.current = [h.x, h.y]
      if (s.mode === 'poly' || (!draft.current && (had?.kind !== h.kind || had.x !== h.x))) draw()
      if (s.mode === 'poly') return
    }
    const cur = draft.current
    if (cur && !dg) {
      const box = boxFor(cur.mode, cur.sx, cur.sy, x, y, e.shiftKey, s.graph, tol())
      draft.current = { ...cur, box }
      // the ring shows what the end of the line lands on
      if (cur.mode === 'wall') snapHint.current = snapPoint(s.graph, box.x2, box.y2, 0.75)
      draw()
      return
    }
    if ((dg?.kind === 'node' || dg?.kind === 'edge') && !dg.moved) {
      // a click or a shaky hand is not a move: nothing changes and no undo step is made
      if (Math.hypot(x - dg.sx, y - dg.sy) < 4 * unit()) return
      dg.moved = true
    }
    if (dg?.kind === 'node') {
      // joins a node close by (Shift: stays free); the lines on it follow
      const t = e.shiftKey ? null : nearestOther(dg.g0, dg.id, x, y, tol())
      s.setGraph(moveNode(dg.g0, dg.id, t ? t.x : x, t ? t.y : y), true)
    } else if (dg?.kind === 'edge') {
      const dx = x - dg.sx
      const dy = y - dg.sy
      const a = dg.g0.edges.find((o) => o.id === dg.id)!
      s.setGraph(
        moveNode(
          moveNode(dg.g0, a.a, dg.ends.x1 + dx, dg.ends.y1 + dy),
          a.b,
          dg.ends.x2 + dx,
          dg.ends.y2 + dy
        ),
        true
      )
    } else if (dg?.kind === 'erase') {
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
    const s = useMapStore.getState()
    if (dg && (dg.kind === 'node' || dg.kind === 'edge') && dg.moved) {
      // a moved node that was let go on another one joins it, within the same undo step
      const ids =
        dg.kind === 'node'
          ? [dg.id]
          : s.graph.edges.filter((o) => o.id === dg.id).flatMap((o) => [o.a, o.b])
      let g = s.graph
      let sel = s.selected
      for (const id of ids) {
        if (!mergeTarget(g, id, 1)) continue
        const out = dropNode(g, id, 1, tol())
        g = out.g
        if (dg.kind === 'node') sel = { kind: 'node', id: out.id }
      }
      if (g !== s.graph) {
        s.setGraph(g)
        s.select(sel)
      }
    }
    if (dg && dg.kind !== 'pan') s.endGesture()
    const c = draft.current
    if (!c || pending.current) return
    const b = c.box
    if (c.mode === 'wall' && Math.max(Math.abs(b.x2 - b.x1), Math.abs(b.y2 - b.y1)) < 6) {
      // a click rather than a drag: the line goes on until the next click
      pending.current = true
      return draw()
    }
    draft.current = null
    commitDraft(c)
  }

  /** Puts a finished line, rectangle or circle on the map */
  const commitDraft = (c: Draft): void => {
    const s = useMapStore.getState()
    const b = c.box
    if (Math.max(Math.abs(b.x2 - b.x1), Math.abs(b.y2 - b.y1)) < 6) return draw()
    const M = Math.max(s.width, s.height)
    const r = tol()
    if (c.mode === 'wall')
      s.setGraph(
        addPolyline(
          s.graph,
          [
            [b.x1, b.y1],
            [b.x2, b.y2],
          ],
          false,
          r
        )
      )
    else if (c.mode === 'rect') s.setGraph(addRect(s.graph, b.x1, b.y1, b.x2, b.y2, r))
    else s.setGraph(addEllipse(s.graph, b.x1, b.y1, b.x2, b.y2, M, r))
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
        onDoubleClick={(e) => {
          if (mode === 'poly') return finishPoly(false)
          if (mode !== 'select') return
          // a double click on a node starts a line there
          const s = useMapStore.getState()
          const hit = hitTest(s.graph, ...toWork(e), tol())
          if (hit?.kind !== 'node') return
          startAt.current = [hit.node.x, hit.node.y]
          s.setMode('wall')
        }}
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
      <canvas ref={vec} className="map-vector" aria-hidden="true" />
    </div>
  )
}

/** The node, other than `id`, nearest to the point within `r` */
function nearestOther(g: Graph, id: number, x: number, y: number, r: number) {
  let best = r
  let hit: { x: number; y: number } | null = null
  for (const n of g.nodes) {
    const d = Math.hypot(n.x - x, n.y - y)
    if (n.id !== id && d <= best) {
      best = d
      hit = n
    }
  }
  return hit
}

/** A square box with the same first corner as the one dragged, for Shift */
function squareTo(x1: number, y1: number, x2: number, y2: number): [number, number] {
  const d = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1))
  return [x1 + Math.sign(x2 - x1 || 1) * d, y1 + Math.sign(y2 - y1 || 1) * d]
}

/**
 * The box being dragged out. A line snaps to nearby nodes and walls and, unless Shift is held, to
 * straight; Shift makes a rectangle square. A circle grows out from where the drag began.
 */
function boxFor(
  mode: MapMode,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  shift: boolean,
  g: Graph,
  r: number
): WallSegment {
  if (mode === 'circle') {
    const rad = Math.hypot(x2 - x1, y2 - y1)
    return { x1: x1 - rad, y1: y1 - rad, x2: x1 + rad, y2: y1 + rad }
  }
  if (mode === 'rect') {
    if (shift) [x2, y2] = squareTo(x1, y1, x2, y2)
    return { x1, y1, x2, y2 }
  }
  if (!shift) {
    // a node or wall in reach wins, and the end lands exactly on it (a wall gets split there)
    let e = snapPoint(g, x2, y2, r)
    if (e.kind === 'free') {
      const ang = Math.abs((Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI)
      if (ang < 12 || ang > 168) y2 = y1
      else if (Math.abs(ang - 90) < 12) x2 = x1
      e = snapPoint(g, x2, y2, r)
    }
    if (e.kind !== 'free') [x2, y2] = [e.x, e.y]
  }
  return { x1, y1, x2, y2 }
}

/** The corners of the outline for a box: the two ends of a line, four corners, or the circle's ring */
function draftPoints(mode: MapMode, b: WallSegment, M: number): [number, number][] {
  if (mode === 'wall')
    return [
      [b.x1, b.y1],
      [b.x2, b.y2],
    ]
  if (mode === 'rect')
    return [
      [b.x1, b.y1],
      [b.x2, b.y1],
      [b.x2, b.y2],
      [b.x1, b.y2],
    ]
  return ellipsePoints(b.x1, b.y1, b.x2, b.y2, M)
}

export default MapCanvas
