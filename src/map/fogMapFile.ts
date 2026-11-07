import type { FogStyle, MapView } from './types'

/** The `.fog_map` file: the picture, the walls as nodes and the lines between them, and the fog. */
export interface FogMapFile {
  format: 'fog_map'
  version: 2
  app: 'Map Fog'
  name: string
  width: number
  height: number
  view: MapView
  /** Corners and ends of walls, as [x, y] */
  nodes: [number, number][]
  /** Walls, as pairs of indices into `nodes` */
  edges: [number, number][]
  fog: [number, number][]
  fogStyle?: FogStyle
  image: string
}

const VIEWS: MapView[] = ['map', 'lines', 'blueprint']
const isPair = (p: unknown): p is [number, number] =>
  Array.isArray(p) && p.length >= 2 && Number.isFinite(p[0]) && Number.isFinite(p[1])

export function serializeFogMap(f: Omit<FogMapFile, 'format' | 'version' | 'app'>): string {
  return JSON.stringify({ format: 'fog_map', version: 2, app: 'Map Fog', ...f })
}

/** Returns null for anything that isn't a usable `.fog_map`; individual bad nodes and walls are dropped. */
export function parseFogMap(text: string): FogMapFile | null {
  let data: Record<string, unknown>
  try {
    data = JSON.parse(text)
  } catch {
    return null
  }
  if (!data || data.format !== 'fog_map' || data.version !== 2 || typeof data.image !== 'string')
    return null

  // a bad node keeps its place in the list, so the walls that name later nodes still fit
  const raw = Array.isArray(data.nodes) ? data.nodes : []
  const nodes = raw.map((p): [number, number] => (isPair(p) ? [p[0], p[1]] : [NaN, NaN]))
  const edges = (Array.isArray(data.edges) ? data.edges : [])
    .filter(
      (e: unknown): e is [number, number] =>
        isPair(e) && Number.isInteger(e[0]) && Number.isInteger(e[1]) && e[0] !== e[1]
    )
    .filter(([i, j]) => isPair(nodes[i]) && isPair(nodes[j]))
    .map(([i, j]): [number, number] => [i, j])
  const fog = (Array.isArray(data.fog) ? data.fog : [])
    .filter(isPair)
    .map((p): [number, number] => [p[0], p[1]])

  return {
    format: 'fog_map',
    version: 2,
    app: 'Map Fog',
    name: typeof data.name === 'string' ? data.name : 'map',
    width: Number(data.width) || 0,
    height: Number(data.height) || 0,
    view: VIEWS.includes(data.view as MapView) ? (data.view as MapView) : 'lines',
    nodes,
    edges,
    fog,
    ...(data.fogStyle === 'dark' ? { fogStyle: 'dark' as const } : {}),
    image: data.image,
  }
}
