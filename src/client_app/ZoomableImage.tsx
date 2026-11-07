import { useCallback, useEffect, useRef, useState } from 'react'
import { TokenLayer } from '@/components/TokenMark'
import type { TokensMessage } from '@/map/mapMessage'

const MAX_ZOOM = 8

interface View {
  scale: number
  x: number
  y: number
}

/** Keeps the picture covering the frame: never zoomed out past the fit, never panned past an edge */
function clamp(v: View, w: number, h: number): View {
  const scale = Math.max(1, Math.min(MAX_ZOOM, v.scale))
  return {
    scale,
    x: Math.min(0, Math.max(w * (1 - scale), v.x)),
    y: Math.min(0, Math.max(h * (1 - scale), v.y)),
  }
}

/** A picture players can zoom (wheel, pinch, double click) and drag around */
export default function ZoomableImage({
  src,
  alt,
  tokens,
}: {
  src: string
  alt: string
  /** Monsters to show on the picture, as the DM sent them */
  tokens?: TokensMessage | null
}) {
  const frame = useRef<HTMLDivElement>(null)
  /** The frame's size, so the tokens can be drawn at the real zoom */
  const [frameSize, setFrameSize] = useState({ w: 0, h: 0 })
  const [view, setView] = useState<View>({ scale: 1, x: 0, y: 0 })
  const viewRef = useRef(view)
  viewRef.current = view
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const gesture = useRef<{ dist: number; view: View; cx: number; cy: number } | null>(null)

  const size = (): { w: number; h: number } => {
    const r = frame.current!.getBoundingClientRect()
    return { w: r.width, h: r.height }
  }

  /** Zooms by `factor`, keeping the point (px, py) of the frame where it is */
  const zoomAt = useCallback((factor: number, px: number, py: number, from = viewRef.current) => {
    const { w, h } = size()
    const scale = Math.max(1, Math.min(MAX_ZOOM, from.scale * factor))
    const k = scale / from.scale
    setView(clamp({ scale, x: px - (px - from.x) * k, y: py - (py - from.y) * k }, w, h))
  }, [])

  useEffect(() => {
    const el = frame.current
    if (!el) return
    const measure = (): void => setFrameSize({ w: el.clientWidth, h: el.clientHeight })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const el = frame.current
    if (!el) return
    const onWheel = (e: WheelEvent): void => {
      e.preventDefault()
      const r = el.getBoundingClientRect()
      zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [zoomAt])

  // a different map starts fitted; the same map keeps its zoom when the picture is refreshed
  useEffect(() => setView({ scale: 1, x: 0, y: 0 }), [alt])

  const onDown = (e: React.PointerEvent): void => {
    e.currentTarget.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      const r = frame.current!.getBoundingClientRect()
      gesture.current = {
        dist: Math.hypot(a.x - b.x, a.y - b.y),
        view: viewRef.current,
        cx: (a.x + b.x) / 2 - r.left,
        cy: (a.y + b.y) / 2 - r.top,
      }
    }
  }

  const onMove = (e: React.PointerEvent): void => {
    const p = pointers.current.get(e.pointerId)
    if (!p) return
    const g = gesture.current
    if (pointers.current.size === 2 && g) {
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
      const [a, b] = [...pointers.current.values()]
      zoomAt(Math.hypot(a.x - b.x, a.y - b.y) / g.dist, g.cx, g.cy, g.view)
      return
    }
    const { w, h } = size()
    const v = viewRef.current
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (v.scale > 1)
      setView(clamp({ ...v, x: v.x + e.clientX - p.x, y: v.y + e.clientY - p.y }, w, h))
  }

  const onUp = (e: React.PointerEvent): void => {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size < 2) gesture.current = null
  }

  return (
    <div
      ref={frame}
      className="client-map-frame"
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onDoubleClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect()
        if (view.scale > 1) setView({ scale: 1, x: 0, y: 0 })
        else zoomAt(3, e.clientX - r.left, e.clientY - r.top)
      }}
      style={{ cursor: view.scale > 1 ? 'grab' : 'zoom-in' }}
    >
      <div
        className="client-map-layer"
        style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}
      >
        <img className="client-map" src={src} alt={alt} draggable={false} />
      </div>
      {tokens && frameSize.w > 0 && (
        <TokenLayer
          width={tokens.width}
          height={tokens.height}
          tokens={tokens.tokens}
          view={{ frameWidth: frameSize.w, frameHeight: frameSize.h, ...view }}
        />
      )}
    </div>
  )
}
