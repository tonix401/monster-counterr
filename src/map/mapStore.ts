import { create } from 'zustand'
import { analyzeGraph } from './rooms'
import { createAnalyzerClient, type AnalyzerClient } from './analyzerClient'
import { parseFogMap, serializeFogMap, type FogMapFile } from './fogMapFile'
import {
  getCurrentId,
  listMaps,
  loadMap,
  removeMap,
  saveMap,
  saveMeta,
  setCurrentId,
  takeLegacyMap,
} from './mapStorage'
import { newMapId, uniqueName, type MapMeta, type SavedMap } from './mapLibrary'
import {
  emptyGraph,
  ensureBorder,
  graphFromLists,
  graphFromSegments,
  graphLists,
  removeEdge,
  removeNode,
} from './graph'
import { makeCanvas, makeThumb } from './render'
import type { Token, Tokens } from './tokens'
import {
  MAP_MAX_DIM,
  type Analysis,
  type FogStyle,
  type Graph,
  type MapMode,
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
  /** The id the open map has in the library, null while no map is open */
  mapId: string | null
  /** The maps kept in this browser, newest first */
  library: MapMeta[]
  /** Whether a newly imported picture gets its walls found at once; off, they are found on request */
  autoDetect: boolean
  /** The map as a data URL at working resolution; this is what gets saved */
  image: string
  width: number
  height: number
  base: HTMLCanvasElement | null
  analysis: Analysis | null
  fog: Set<number>
  /** Monsters placed on this map, by monster id */
  tokens: Tokens
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
  mode: MapMode
  busy: boolean
  /** Whether players connected over PeerJS get to see the map */
  shared: boolean
  error: MapError

  openFile: (file: File) => Promise<void>
  restore: () => Promise<void>
  closeMap: () => void
  setAutoDetect: (on: boolean) => void
  refreshLibrary: () => Promise<void>
  openFromLibrary: (id: string) => Promise<void>
  renameMap: (id: string, name: string) => Promise<void>
  duplicateMap: (id: string) => Promise<void>
  /** Every map in the library with its file text, the open one as it is right now */
  exportMaps: () => Promise<SavedMap[]>
  /** Adds maps from a save file; one whose id is taken comes in as a copy under a new name */
  importMaps: (maps: SavedMap[]) => Promise<void>
  deleteMap: (id: string) => Promise<void>
  toText: () => string | null
  setParam: <K extends keyof MapParams>(key: K, value: number) => void
  showPreview: (on: boolean) => void
  /** Replaces the walls with the ones found in the picture */
  applyDetection: () => Promise<void>
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
  /** Puts a monster on the map, or moves it; saved with the map */
  placeToken: (monsterId: string, at: Token) => void
  removeToken: (monsterId: string) => void
  /** Drops the tokens of monsters that left the encounter */
  setTokens: (tokens: Tokens) => void
}

export const DEFAULT_PARAMS: MapParams = { sens: 70, minLen: 6, gap: 6.5, minRoom: 0.2 }
const detectParams = (p: MapParams) => ({
  sensitivity: 40 - p.sens * 0.32,
  minLen: p.minLen / 100,
  gap: p.gap / 100,
})

let client: AnalyzerClient | null = null
let timer: ReturnType<typeof setTimeout> | undefined
let previewSeq = 0
let previewBusy = false
let previewAgain = false
let saveTimer: ReturnType<typeof setTimeout> | undefined
/** Fog from a loaded file, applied once the first analysis exists */
let pendingFog: number[] = []
const AUTO_DETECT_KEY = 'monster-counterr-map-auto-detect'
const readAutoDetect = (): boolean => {
  try {
    return localStorage.getItem(AUTO_DETECT_KEY) === '1'
  } catch {
    return false
  }
}
/** The open map's picture for the library list, made when it is opened */
let thumb = ''
let gesture = false
let gestureFresh = false
let pending = false

export const useMapStore = create<MapState>()((set, get) => {
  const analyzer = (): AnalyzerClient => (client ??= createAnalyzerClient())

  function scheduleSave(): void {
    clearTimeout(saveTimer)
    saveTimer = setTimeout(() => void saveNow(), 800)
  }

  /** Writes the open map to the library now; the text is made before anything is awaited */
  async function saveNow(): Promise<void> {
    clearTimeout(saveTimer)
    const s = get()
    const text = s.toText()
    if (!s.mapId || !text) return
    const meta: MapMeta = {
      id: s.mapId,
      name: s.name,
      updatedAt: Date.now(),
      width: s.width,
      height: s.height,
      thumb,
    }
    if (await saveMap(meta, text)) await get().refreshLibrary()
  }

  /** Finds the rooms between the walls. `throttle` is for drags: an update already waiting is enough. */
  function analyze(delay: number, throttle = false): void {
    if (throttle && pending) return
    clearTimeout(timer)
    pending = true
    timer = setTimeout(() => {
      pending = false
      const s = get()
      if (!s.loaded) return
      const res = analyzeGraph(s.graph, s.width, s.height, s.params.minRoom)

      // carry the fog over to whichever rooms now cover the same spots
      const keep = [...s.fog]
        .map((id) => s.analysis?.rooms[id]?.sample)
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

  /** `id` and `savedThumb` are those of a map from the library; a new map gets a new id */
  function openImage(
    url: string,
    name: string,
    saved: FogMapFile | null,
    id: string | null = null,
    savedThumb: string | null = null
  ): Promise<void> {
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
        // walls come from the file, from detection when that is automatic, or not at all
        const found = saved
          ? graphFromLists(
              saved.nodes.map((p) => [p[0] * fx, p[1] * fy]),
              saved.edges
            )
          : get().autoDetect
            ? graphFromSegments(await analyzer().detect(detectParams(get().params)), Math.max(W, H))
            : emptyGraph()
        const graph = ensureBorder(found, W, H)
        previewSeq++
        const mapId = id ?? newMapId()
        thumb = savedThumb ?? makeThumb(base)
        void setCurrentId(mapId)
        set({
          loaded: true,
          mapId,
          name,
          // a fresh image is stored at working resolution so saves stay small
          image: saved ? url : base.toDataURL('image/jpeg', 0.88),
          width: W,
          height: H,
          base,
          analysis: null,
          fog: new Set(),
          tokens: saved?.tokens
            ? Object.fromEntries(
                Object.entries(saved.tokens).map(([k, t]) => [
                  k,
                  { x: Math.min(W - 1, t.x * fx), y: Math.min(H - 1, t.y * fy) },
                ])
              )
            : {},
          fogStyle: saved?.fogStyle ?? 'fog',
          graph,
          history: [],
          baseline: graph,
          selected: null,
          preview: null,
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
    if (graph === s.graph) return // nothing changed, so there is nothing to undo
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
    mapId: null,
    library: [],
    autoDetect: readAutoDetect(),
    image: '',
    width: 0,
    height: 0,
    base: null,
    analysis: null,
    fog: new Set(),
    tokens: {},
    fogStyle: 'fog',
    graph: emptyGraph(),
    history: [],
    baseline: emptyGraph(),
    selected: null,
    params: DEFAULT_PARAMS,
    previewing: false,
    preview: null,
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
              uniqueName(
                file.name.replace(/\.[^.]+$/, ''),
                get().library.map((m) => m.name)
              ),
              null
            ).then(resolve)
          const saved = parseFogMap(reader.result as string)
          if (!saved) {
            set({ error: 'mapInvalidFile' })
            return resolve()
          }
          void openImage(
            saved.image,
            uniqueName(
              saved.name,
              get().library.map((m) => m.name)
            ),
            saved
          ).then(resolve)
        }
        if (isFog) reader.readAsText(file)
        else reader.readAsDataURL(file)
      }),

    restore: async () => {
      if (get().restored) return
      set({ restored: true })
      await get().refreshLibrary()
      const id = await getCurrentId()
      const meta = id ? get().library.find((m) => m.id === id) : undefined
      const text = meta ? await loadMap(meta.id) : null
      const saved = text ? parseFogMap(text) : null
      if (meta && saved && !get().loaded)
        return openImage(saved.image, meta.name, saved, meta.id, meta.thumb)
      // a map kept by an older version, in a single slot, joins the library
      const old = await takeLegacyMap()
      const legacy = old ? parseFogMap(old) : null
      if (legacy && !get().loaded) await openImage(legacy.image, legacy.name, legacy)
    },

    closeMap: () => {
      void saveNow() // the map stays in the library; only the open one is let go
      clearTimeout(timer)
      pendingFog = []
      previewSeq++
      set({
        loaded: false,
        base: null,
        analysis: null,
        fog: new Set(),
        tokens: {},
        mapId: null,
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
      void setCurrentId(null)
    },

    setAutoDetect: (autoDetect) => {
      set({ autoDetect })
      try {
        localStorage.setItem(AUTO_DETECT_KEY, autoDetect ? '1' : '0')
      } catch {
        // a browser that refuses storage just forgets the choice
      }
    },

    refreshLibrary: async () => set({ library: await listMaps() }),

    openFromLibrary: async (id) => {
      if (id === get().mapId) return
      await saveNow()
      const meta = get().library.find((m) => m.id === id)
      const text = meta ? await loadMap(id) : null
      const saved = text ? parseFogMap(text) : null
      if (!meta || !saved) return set({ error: 'mapLoadFailed' })
      await openImage(saved.image, meta.name, saved, id, meta.thumb)
    },

    renameMap: async (id, name) => {
      const meta = get().library.find((m) => m.id === id)
      const next = name.trim()
      if (!meta || !next || next === meta.name) return
      const taken = get()
        .library.filter((m) => m.id !== id)
        .map((m) => m.name)
      const unique = uniqueName(next, taken)
      if (id === get().mapId) {
        set({ name: unique })
        await saveNow()
      } else await saveMeta({ ...meta, name: unique })
      await get().refreshLibrary()
    },

    duplicateMap: async (id) => {
      if (id === get().mapId) await saveNow()
      const meta = get().library.find((m) => m.id === id)
      const text = meta ? await loadMap(id) : null
      if (!meta || !text) return
      const name = uniqueName(
        meta.name,
        get().library.map((m) => m.name)
      )
      await saveMap({ ...meta, id: newMapId(), name, updatedAt: Date.now() }, text)
      await get().refreshLibrary()
    },

    exportMaps: async () => {
      await saveNow() // so the open map is in the library as it is now
      await get().refreshLibrary()
      const out: SavedMap[] = []
      for (const meta of get().library) {
        const data = await loadMap(meta.id)
        if (data) out.push({ ...meta, data })
      }
      return out
    },

    importMaps: async (maps) => {
      await get().refreshLibrary()
      const ids = new Set(get().library.map((m) => m.id))
      const names = get().library.map((m) => m.name)
      for (const m of maps) {
        if (!parseFogMap(m.data)) continue
        const taken = ids.has(m.id)
        const name = taken ? uniqueName(m.name, names) : m.name
        const id = taken ? newMapId() : m.id
        const { data, ...meta } = m
        if (await saveMap({ ...meta, id, name }, data)) {
          ids.add(id)
          names.push(name)
        }
      }
      await get().refreshLibrary()
    },

    deleteMap: async (id) => {
      if (id === get().mapId) {
        set({ mapId: null }) // so closing does not write the map back after deleting it
        clearTimeout(saveTimer)
        get().closeMap()
      }
      await removeMap(id)
      await get().refreshLibrary()
    },

    toText: () => {
      const s = get()
      if (!s.loaded || !s.analysis) return null
      const rooms = s.analysis.rooms
      return serializeFogMap({
        name: s.name,
        width: s.width,
        height: s.height,
        ...graphLists(s.graph),
        fogStyle: s.fogStyle,
        ...(Object.keys(s.tokens).length ? { tokens: s.tokens } : {}),
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
      edit(ensureBorder(graphFromSegments(segs, Math.max(s.width, s.height)), s.width, s.height))
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
    placeToken: (monsterId, at) => {
      const { width, height } = get()
      const x = Math.max(0, Math.min(width - 1, at.x))
      const y = Math.max(0, Math.min(height - 1, at.y))
      set({ tokens: { ...get().tokens, [monsterId]: { x, y } } })
      scheduleSave()
    },

    removeToken: (monsterId) => {
      if (!(monsterId in get().tokens)) return
      set({
        tokens: Object.fromEntries(Object.entries(get().tokens).filter(([id]) => id !== monsterId)),
      })
      scheduleSave()
    },

    setTokens: (tokens) => {
      if (tokens === get().tokens) return
      set({ tokens })
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
