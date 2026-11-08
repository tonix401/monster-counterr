import type { FogStyle } from './types'
import type { Tokens } from './tokens'

/** The `.fog_map` file: the picture, the walls as nodes and the lines between them, and the fog. */
export interface FogMapFile {
  format: 'fog_map'
  version: 2
  app: 'Map Fog'
  name: string
  width: number
  height: number
  /** Corners and ends of walls, as [x, y] */
  nodes: [number, number][]
  /** Walls, as pairs of indices into `nodes`; a third 1 marks a translucent wall, a 2 furniture */
  edges: ([number, number] | [number, number, 1 | 2])[]
  fog: [number, number][]
  fogStyle?: FogStyle
  /** Placed monsters by monster id, in map pixels; missing in files made before tokens existed */
  tokens?: Tokens
  /** The last name of each player who has a token, by player id */
  players?: Record<string, string>
  /** How far each fire and player reaches, in feet, by token id; missing ones use the defaults */
  ranges?: Record<string, number>
  /** The square grid: shown or not, and the side of one square (5 ft) in map pixels */
  grid?: { on: boolean; cell: number }
  image: string
}

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
    .map((e): [number, number] | [number, number, 1 | 2] => {
      const k = (e as number[])[2]
      return k === 1 || k === 2 ? [e[0], e[1], k] : [e[0], e[1]]
    })
  const fog = (Array.isArray(data.fog) ? data.fog : [])
    .filter(isPair)
    .map((p): [number, number] => [p[0], p[1]])

  const tokens: Tokens = {}
  if (data.tokens && typeof data.tokens === 'object' && !Array.isArray(data.tokens)) {
    for (const [id, t] of Object.entries(data.tokens)) {
      const p = t as { x?: unknown; y?: unknown } | null
      if (p && Number.isFinite(p.x) && Number.isFinite(p.y))
        tokens[id] = { x: p.x as number, y: p.y as number }
    }
  }

  const players: Record<string, string> = {}
  if (data.players && typeof data.players === 'object' && !Array.isArray(data.players)) {
    for (const [id, n] of Object.entries(data.players))
      if (typeof n === 'string' && n.length <= 50) players[id] = n
  }

  const ranges: Record<string, number> = {}
  if (data.ranges && typeof data.ranges === 'object' && !Array.isArray(data.ranges)) {
    for (const [id, ft] of Object.entries(data.ranges))
      if (typeof ft === 'number' && ft > 0 && ft <= 1000) ranges[id] = ft
  }
  const g = data.grid as { on?: unknown; cell?: unknown } | undefined
  const grid =
    g && typeof g === 'object' && Number.isFinite(g.cell) && (g.cell as number) >= 4
      ? { on: g.on === true, cell: g.cell as number }
      : undefined

  return {
    format: 'fog_map',
    version: 2,
    app: 'Map Fog',
    name: typeof data.name === 'string' ? data.name : 'map',
    width: Number(data.width) || 0,
    height: Number(data.height) || 0,
    nodes,
    edges,
    fog,
    ...(data.fogStyle === 'dark' ? { fogStyle: 'dark' as const } : {}),
    ...(Object.keys(tokens).length ? { tokens } : {}),
    ...(Object.keys(players).length ? { players } : {}),
    ...(Object.keys(ranges).length ? { ranges } : {}),
    ...(grid ? { grid } : {}),
    image: data.image,
  }
}
