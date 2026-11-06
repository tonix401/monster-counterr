import { create } from 'zustand'
import { createAnalyzerClient, type AnalyzerClient } from './analyzerClient'
import { parseFogMap, serializeFogMap, type FogMapFile } from './fogMapFile'
import { loadMapText, saveMapText } from './mapStorage'
import {
  edgeSegments,
  emptyGraph,
  graphFromLists,
  graphFromSegments,
  graphLists,
  removeEdge,
  removeNode,
} from './graph'
import { makeCanvas } from './render'
import {
  MAP_MAX_DIM,
  type Analysis,
  type FogStyle,
  type Graph,
  type MapMode,
  type MapView,
  type Selection,
  type WallSegment,
} from './types'

export interface MapParams {
  /** Percent, 0 to 100 */
  sens: number
  /** Percent of the map's longer side */
  minLen: number
  gap: number
  minRoom: number
}

/** The parameters that decide which walls detection finds; the smallest room only filters rooms */
const DETECT_KEYS: (keyof MapParams)[] = ['sens', 'minLen', 'gap']

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
  /** How players see the fogged rooms */
  fogStyle: FogStyle
  /** The walls: nodes, and lines between them */
  graph: Graph
  /** The walls before each edit, newest last */
  history: Graph[]
  /** The walls a map was opened with; "clear edits" returns to them */
  baseline: Graph
  selected: Selection | null
  params: MapParams
  /** Whether the walls found with the current settings are being shown (the detection panel is open) */
  previewing: boolean
  /** Walls found with the current settings, not yet part of the map */
  preview: WallSegment[] | null
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
  showPreview: (on: boolean) => void
  /** Replaces the walls with the ones found in the picture */
  applyDetection: () => Promise<void>
  setView: (view: MapView) => void
  setMode: (mode: MapMode) => void
  setShared: (on: boolean) => void
  /** Edits between begin and end (a drag) become one undo step */
  beginGesture: () => void
  endGesture: () => void
  /** Replaces the walls; `live` is for drags, which redo the rooms while they go on */
  setGraph: (graph: Graph, live?: boolean) => void
  select: (selection: Selection | null) => void
  deleteSelected: () => void
  undoEdit: () => void
  clearEdits: () => void
  setFog: (id: number, on: boolean) => boolean
  setFogStyle: (style: FogStyle) => void
  fogAll: () => void
  revealAll: () => void
}

export const DEFAULT_PARAMS: MapParams = { sens: 70, minLen: 6, gap: 6.5, minRoom: 0.2 }
const detectParams = (p: MapParams) => ({
  sensitivity: 40 - p.sens * 0.32,
  minLen: p.minLen / 100,
  gap: p.gap / 100,
})

let client: AnalyzerClient | null = null
let seq = 0
let timer: ReturnType<typeof setTimeout> | undefined
let previewSeq = 0
let previewBusy = false
let previewAgain = false
let saveTimer: ReturnType<typeof setTimeout> | undefined
/** Fog from a loaded file, applied once the first analysis exists */
let pendingFog: number[] = []
let gesture = false
let gestureFresh = false
let pending = false
let inflight = false
let dirty = false

export const useMapStore = create<MapState>()((set, get) => {
  const analyzer = (): AnalyzerClient => (client ??= createAnalyzerClient())

  function scheduleSave(): void {
    clearTimeout(saveTimer)
    saveTimer = setTimeout(() => void saveMapText(get().toText()), 800)
  }

  /** `throttle` is for drags: keep one run going and queue another instead of restarting the timer */
  function analyze(delay: number, throttle = false): void {
    if (throttle && (pending || inflight)) {
      dirty = true
      return
    }
    clearTimeout(timer)
    set({ busy: true })
    pending = true
    timer = setTimeout(async () => {
      pending = false
      inflight = true
      const mine = ++seq
      const s = get()
      const res = await analyzer().run({
        segments: edgeSegments(s.graph),
        minRoom: s.params.minRoom,
      })
      inflight = false
      if (dirty) {
        dirty = false
        analyze(0, true)
      }
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
      img.onload = async () => {
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
        pendingFog = (saved?.fog ?? [])
          .map(([x, y]) => Math.round(y * fy) * W + Math.round(x * fx))
          .filter((i) => i >= 0 && i < W * H)

        analyzer().load(gray, W, H)
        const graph = saved
          ? graphFromLists(
              saved.nodes.map((p) => [p[0] * fx, p[1] * fy]),
              saved.edges
            )
          : graphFromSegments(await analyzer().detect(detectParams(get().params)), Math.max(W, H))
        previewSeq++
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
          fogStyle: saved?.fogStyle ?? 'fog',
          graph,
          history: [],
          baseline: graph,
          selected: null,
          preview: null,
          view: saved ? saved.view : get().view,
          error: null,
        })
        analyze(40)
        resolve()
      }
      img.src = url
    })
  }

  function edit(graph: Graph, live = false): void {
    const s = get()
    const history = gesture && !gestureFresh ? s.history : [...s.history, s.graph]
    gestureFresh = false
    const sel = s.selected
    const kept =
      !sel || (sel.kind === 'node' ? graph.nodes : graph.edges).some((o) => o.id === sel.id)
    set({ graph, history, selected: kept ? sel : null })
    if (live) analyze(30, true)
    else rebuild()
  }

  function rebuild(): void {
    analyze(20)
    scheduleSave()
  }

  /**
   * Shows the walls the current settings would find. Runs at once, and while a run is going on
   * only the latest settings wait, so a slider drag updates as fast as detection allows.
   */
  async function previewWalls(): Promise<void> {
    if (previewBusy) {
      previewAgain = true
      return
    }
    previewBusy = true
    do {
      previewAgain = false
      const mine = previewSeq
      const segs = await analyzer().detect(detectParams(get().params))
      if (mine === previewSeq && get().previewing) set({ preview: segs })
    } while (previewAgain)
    previewBusy = false
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
    fogStyle: 'fog',
    graph: emptyGraph(),
    history: [],
    baseline: emptyGraph(),
    selected: null,
    params: DEFAULT_PARAMS,
    previewing: false,
    preview: null,
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
      previewSeq++
      set({
        loaded: false,
        base: null,
        analysis: null,
        fog: new Set(),
        graph: emptyGraph(),
        history: [],
        baseline: emptyGraph(),
        selected: null,
        previewing: false,
        preview: null,
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
      return serializeFogMap({
        name: s.name,
        width: s.width,
        height: s.height,
        view: s.view,
        ...graphLists(s.graph),
        fogStyle: s.fogStyle,
        fog: [...s.fog]
          .map((id) => rooms[id]?.sample)
          .filter((v): v is number => v !== undefined)
          .map((i) => [i % s.width, Math.floor(i / s.width)] as [number, number]),
        image: s.image,
      })
    },

    setParam: (key, value) => {
      set({ params: { ...get().params, [key]: value } })
      if (key === 'minRoom') analyze(150)
      else if (DETECT_KEYS.includes(key) && get().previewing) void previewWalls()
    },
    showPreview: (previewing) => {
      previewSeq++
      set({ previewing, preview: null })
      if (previewing) void previewWalls()
    },
    applyDetection: async () => {
      const s = get()
      const segs = s.preview ?? (await analyzer().detect(detectParams(s.params)))
      previewSeq++
      set({ preview: null, selected: null })
      edit(graphFromSegments(segs, Math.max(s.width, s.height)))
    },
    setView: (view) => {
      set({ view })
      scheduleSave()
    },
    setMode: (mode) => set({ mode }),
    setShared: (shared) => set({ shared }),

    beginGesture: () => {
      gesture = true
      gestureFresh = true
    },
    endGesture: () => {
      gesture = false
    },
    setGraph: (graph, live) => edit(graph, live),
    select: (selected) => set({ selected }),
    deleteSelected: () => {
      const { graph, selected } = get()
      if (!selected) return
      edit(
        selected.kind === 'node' ? removeNode(graph, selected.id) : removeEdge(graph, selected.id)
      )
    },
    undoEdit: () => {
      const { history } = get()
      if (!history.length) return
      set({ graph: history[history.length - 1], history: history.slice(0, -1), selected: null })
      rebuild()
    },
    clearEdits: () => {
      set({ graph: get().baseline, history: [], selected: null })
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
    setFogStyle: (fogStyle) => {
      set({ fogStyle })
      scheduleSave()
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
