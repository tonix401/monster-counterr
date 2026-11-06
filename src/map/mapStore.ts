import { create } from 'zustand'
import { createAnalyzerClient, type AnalyzerClient } from './analyzerClient'
import { parseFogMap, serializeFogMap, type FogMapFile } from './fogMapFile'
import { loadMapText, saveMapText } from './mapStorage'
import { makeCanvas } from './render'
import { MAP_MAX_DIM, type Analysis, type MapMode, type MapOp, type MapView } from './types'

export interface MapParams {
  /** Percent, 0 to 100 */
  sens: number
  /** Percent of the map's longer side */
  minLen: number
  gap: number
  minRoom: number
}

export type MapError = 'mapInvalidFile' | 'mapLoadFailed' | null

interface MapState {
  loaded: boolean
  restored: boolean
  name: string
  /** The map as a data URL at working resolution; this is what gets saved */
  image: string
  width: number
  height: number
  base: HTMLCanvasElement | null
  analysis: Analysis | null
  fog: Set<number>
  /** Walls and erasing that came from a saved file; not undoable */
  baseOps: MapOp[]
  edits: MapOp[]
  auto: boolean
  params: MapParams
  view: MapView
  mode: MapMode
  busy: boolean
  /** Whether players connected over PeerJS get to see the map */
  shared: boolean
  error: MapError

  openFile: (file: File) => Promise<void>
  restore: () => Promise<void>
  closeMap: () => void
  toText: () => string | null
  setParam: <K extends keyof MapParams>(key: K, value: number) => void
  setAuto: (on: boolean) => void
  setView: (view: MapView) => void
  setMode: (mode: MapMode) => void
  setShared: (on: boolean) => void
  addEdit: (op: MapOp) => void
  undoEdit: () => void
  clearEdits: () => void
  setFog: (id: number, on: boolean) => boolean
  fogAll: () => void
  revealAll: () => void
}

export const DEFAULT_PARAMS: MapParams = { sens: 70, minLen: 6, gap: 6.5, minRoom: 0.2 }

let client: AnalyzerClient | null = null
let seq = 0
let timer: ReturnType<typeof setTimeout> | undefined
let needDetect = false
let saveTimer: ReturnType<typeof setTimeout> | undefined
/** Fog from a loaded file, applied once the first analysis exists */
let pendingFog: number[] = []

export const useMapStore = create<MapState>()((set, get) => {
  const analyzer = (): AnalyzerClient => (client ??= createAnalyzerClient())

  function scheduleSave(): void {
    clearTimeout(saveTimer)
    saveTimer = setTimeout(() => void saveMapText(get().toText()), 800)
  }

  function analyze(detect: boolean, delay: number): void {
    needDetect ||= detect
    clearTimeout(timer)
    set({ busy: true })
    timer = setTimeout(async () => {
      const mine = ++seq
      const s = get()
      const doDetect = needDetect
      needDetect = false
      const res = await analyzer().run({
        detect: !s.auto
          ? null
          : doDetect
            ? {
                sensitivity: 40 - s.params.sens * 0.32,
                minLen: s.params.minLen / 100,
                gap: s.params.gap / 100,
              }
            : undefined,
        ops: s.baseOps.concat(s.edits),
        minRoom: s.params.minRoom,
      })
      if (mine !== seq) return

      // carry the fog over to whichever rooms now cover the same spots
      const old = get()
      const keep = [...old.fog]
        .map((id) => old.analysis?.rooms[id]?.sample)
        .filter((v): v is number => v !== undefined)
        .concat(pendingFog)
      pendingFog = []
      const fog = new Set<number>()
      for (const sample of keep) {
        const r = res.own[sample]
        if (r > 0) fog.add(r)
      }
      set({ analysis: res, fog, busy: false })
      scheduleSave()
    }, delay)
  }

  function openImage(url: string, name: string, saved: FogMapFile | null): Promise<void> {
    return new Promise((resolve) => {
      const img = new Image()
      img.onerror = () => {
        set({ error: 'mapLoadFailed' })
        resolve()
      }
      img.onload = () => {
        const sc = Math.min(1, MAP_MAX_DIM / Math.max(img.naturalWidth, img.naturalHeight))
        const W = Math.max(1, Math.round(img.naturalWidth * sc))
        const H = Math.max(1, Math.round(img.naturalHeight * sc))
        const base = makeCanvas(W, H)
        const b = base.getContext('2d')!
        b.fillStyle = '#000'
        b.fillRect(0, 0, W, H)
        b.imageSmoothingQuality = 'high'
        b.drawImage(img, 0, 0, W, H)
        const d = b.getImageData(0, 0, W, H).data
        const gray = new Float32Array(W * H)
        for (let i = 0, p = 0; i < gray.length; i++, p += 4)
          gray[i] = d[p] * 0.299 + d[p + 1] * 0.587 + d[p + 2] * 0.114

        const fx = saved?.width ? W / saved.width : 1
        const fy = saved?.height ? H / saved.height : 1
        const baseOps: MapOp[] = (saved?.walls ?? []).map((op) =>
          op.type === 'erase'
            ? { type: 'erase', w: op.w * fx, pts: op.pts.map(([x, y]) => [x * fx, y * fy]) }
            : { type: 'wall', x1: op.x1 * fx, y1: op.y1 * fy, x2: op.x2 * fx, y2: op.y2 * fy }
        )
        pendingFog = (saved?.fog ?? [])
          .map(([x, y]) => Math.round(y * fy) * W + Math.round(x * fx))
          .filter((i) => i >= 0 && i < W * H)

        analyzer().load(gray, W, H)
        needDetect = false
        set({
          loaded: true,
          name,
          // a fresh image is stored at working resolution so saves stay small
          image: saved ? url : base.toDataURL('image/jpeg', 0.88),
          width: W,
          height: H,
          base,
          analysis: null,
          fog: new Set(),
          baseOps,
          edits: [],
          auto: saved ? false : get().auto,
          view: saved ? saved.view : get().view,
          error: null,
        })
        analyze(!saved, 40)
        resolve()
      }
      img.src = url
    })
  }

  const rebuild = (): void => {
    analyze(false, 20)
    scheduleSave()
  }

  return {
    loaded: false,
    restored: false,
    name: 'map',
    image: '',
    width: 0,
    height: 0,
    base: null,
    analysis: null,
    fog: new Set(),
    baseOps: [],
    edits: [],
    auto: true,
    params: DEFAULT_PARAMS,
    view: 'lines',
    mode: 'fog',
    busy: false,
    shared: false,
    error: null,

    openFile: (file) =>
      new Promise((resolve) => {
        const isFog = /\.(fog_map|json)$/i.test(file.name)
        if (!isFog && !file.type.startsWith('image/')) {
          set({ error: 'mapInvalidFile' })
          return resolve()
        }
        const reader = new FileReader()
        reader.onerror = () => {
          set({ error: 'mapLoadFailed' })
          resolve()
        }
        reader.onload = () => {
          if (!isFog)
            return void openImage(
              reader.result as string,
              file.name.replace(/\.[^.]+$/, ''),
              null
            ).then(resolve)
          const saved = parseFogMap(reader.result as string)
          if (!saved) {
            set({ error: 'mapInvalidFile' })
            return resolve()
          }
          void openImage(saved.image, saved.name, saved).then(resolve)
        }
        if (isFog) reader.readAsText(file)
        else reader.readAsDataURL(file)
      }),

    restore: async () => {
      if (get().restored) return
      set({ restored: true })
      const text = await loadMapText()
      const saved = text ? parseFogMap(text) : null
      if (saved && !get().loaded) await openImage(saved.image, saved.name, saved)
    },

    closeMap: () => {
      clearTimeout(timer)
      seq++
      pendingFog = []
      set({
        loaded: false,
        base: null,
        analysis: null,
        fog: new Set(),
        baseOps: [],
        edits: [],
        busy: false,
        shared: false,
        image: '',
      })
      void saveMapText(null)
    },

    toText: () => {
      const s = get()
      if (!s.loaded || !s.analysis) return null
      const rooms = s.analysis.rooms
      const auto: MapOp[] = s.analysis.auto.map((w) => ({ type: 'wall', ...w }))
      return serializeFogMap({
        name: s.name,
        width: s.width,
        height: s.height,
        view: s.view,
        walls: auto.concat(s.baseOps, s.edits),
        fog: [...s.fog]
          .map((id) => rooms[id]?.sample)
          .filter((v): v is number => v !== undefined)
          .map((i) => [i % s.width, Math.floor(i / s.width)] as [number, number]),
        image: s.image,
      })
    },

    setParam: (key, value) => {
      set({ params: { ...get().params, [key]: value } })
      analyze(key !== 'minRoom', key === 'minRoom' ? 150 : 200)
    },
    setAuto: (on) => {
      set({ auto: on })
      analyze(true, 20)
    },
    setView: (view) => {
      set({ view })
      scheduleSave()
    },
    setMode: (mode) => set({ mode }),
    setShared: (shared) => set({ shared }),

    addEdit: (op) => {
      set({ edits: [...get().edits, op] })
      rebuild()
    },
    undoEdit: () => {
      set({ edits: get().edits.slice(0, -1) })
      rebuild()
    },
    clearEdits: () => {
      set({ edits: [] })
      rebuild()
    },

    setFog: (id, on) => {
      const { fog, analysis } = get()
      if (!id || !analysis?.rooms[id] || fog.has(id) === on) return false
      const next = new Set(fog)
      if (on) next.add(id)
      else next.delete(id)
      set({ fog: next })
      scheduleSave()
      return true
    },
    fogAll: () => {
      const { analysis } = get()
      if (!analysis) return
      set({
        fog: new Set(analysis.rooms.filter((r) => r && r.alive && !r.ext).map((r) => r!.id)),
      })
      scheduleSave()
    },
    revealAll: () => {
      set({ fog: new Set() })
      scheduleSave()
    },
  }
})

export function roomCount(a: Analysis | null): number {
  return a ? a.rooms.filter((r) => r && r.alive && !r.ext).length : 0
}

export function foggedCount(a: Analysis | null, fog: Set<number>): number {
  return a ? [...fog].filter((id) => a.rooms[id] && !a.rooms[id]!.ext).length : 0
}
