import { polygonWalls, triangleWalls } from './shapes'
import type { FogStyle, MapOp, MapView } from './types'

/** The `.fog_map` file written by the standalone Map Fog tool; kept compatible with it. */
export interface FogMapFile {
  format: 'fog_map'
  version: 1
  app: 'Map Fog'
  name: string
  width: number
  height: number
  view: MapView
  walls: MapOp[]
  fog: [number, number][]
  /** How players see fogged rooms; absent in files from the standalone tool */
  fogStyle?: FogStyle
  image: string
}

const VIEWS: MapView[] = ['map', 'lines', 'blueprint']
const r1 = (v: number): number => Math.round(v * 10) / 10

export function serializeFogMap(f: Omit<FogMapFile, 'format' | 'version' | 'app'>): string {
  const walls = f.walls
    .filter((op) => op.type !== 'cut')
    .map((op) =>
      op.type === 'wall'
        ? { type: 'wall', x1: r1(op.x1), y1: r1(op.y1), x2: r1(op.x2), y2: r1(op.y2) }
        : op.type === 'shape'
          ? {
              type: 'shape',
              kind: op.kind,
              x1: r1(op.x1),
              y1: r1(op.y1),
              x2: r1(op.x2),
              y2: r1(op.y2),
              ...(op.rot ? { rot: Math.round(op.rot * 1000) / 1000 } : {}),
            }
          : op.type === 'erase'
            ? { type: 'erase', w: r1(op.w), pts: op.pts.map((p) => [r1(p[0]), r1(p[1])]) }
            : op
    )
  return JSON.stringify({ format: 'fog_map', version: 1, app: 'Map Fog', ...f, walls })
}

/** Returns null for anything that isn't a usable `.fog_map`; individual bad walls are dropped. */
export function parseFogMap(text: string): FogMapFile | null {
  let data: Record<string, unknown>
  try {
    data = JSON.parse(text)
  } catch {
    return null
  }
  if (!data || data.format !== 'fog_map' || typeof data.image !== 'string') return null

  const walls: MapOp[] = []
  for (const raw of Array.isArray(data.walls) ? data.walls : []) {
    if (!raw || typeof raw !== 'object') continue
    const op = raw as Record<string, unknown>
    if (op.type === 'erase' && Array.isArray(op.pts) && op.pts.length) {
      walls.push({
        type: 'erase',
        w: Number(op.w) || 10,
        pts: (op.pts as unknown[]).map((p) => [
          Number((p as number[])[0]),
          Number((p as number[])[1]),
        ]),
      })
    } else if (
      op.type === 'poly' &&
      Array.isArray(op.pts) &&
      op.pts.length >= 3 &&
      op.pts.every(
        (p) => Array.isArray(p) && p.length >= 2 && p.slice(0, 2).every((v) => Number.isFinite(v))
      )
    ) {
      // polygons are drawn as independent lines now; earlier files kept them whole
      walls.push(
        ...polygonWalls((op.pts as number[][]).map((p) => [p[0], p[1]] as [number, number]))
      )
    } else if (
      op.type === 'shape' &&
      op.kind === 'tri' &&
      [op.x1, op.y1, op.x2, op.y2].every((v) => typeof v === 'number' && isFinite(v))
    ) {
      // the triangle tool is gone; a saved triangle becomes its three lines
      const rot = typeof op.rot === 'number' && isFinite(op.rot) ? op.rot : 0
      walls.push(
        ...triangleWalls(
          { x1: op.x1 as number, y1: op.y1 as number, x2: op.x2 as number, y2: op.y2 as number },
          rot
        )
      )
    } else if (
      op.type === 'shape' &&
      (op.kind === 'rect' || op.kind === 'circle') &&
      [op.x1, op.y1, op.x2, op.y2].every((v) => typeof v === 'number' && isFinite(v))
    ) {
      walls.push({
        type: 'shape',
        kind: op.kind,
        x1: op.x1 as number,
        y1: op.y1 as number,
        x2: op.x2 as number,
        y2: op.y2 as number,
        ...(typeof op.rot === 'number' && isFinite(op.rot) && op.rot ? { rot: op.rot } : {}),
      })
    } else if ([op.x1, op.y1, op.x2, op.y2].every((v) => typeof v === 'number' && isFinite(v))) {
      walls.push({
        type: 'wall',
        x1: op.x1 as number,
        y1: op.y1 as number,
        x2: op.x2 as number,
        y2: op.y2 as number,
      })
    }
  }
  const fog: [number, number][] = (Array.isArray(data.fog) ? data.fog : [])
    .filter((p: unknown) => Array.isArray(p) && isFinite(p[0]) && isFinite(p[1]))
    .map((p: number[]) => [p[0], p[1]])

  return {
    format: 'fog_map',
    version: 1,
    app: 'Map Fog',
    name: typeof data.name === 'string' ? data.name : 'map',
    width: Number(data.width) || 0,
    height: Number(data.height) || 0,
    view: VIEWS.includes(data.view as MapView) ? (data.view as MapView) : 'lines',
    walls,
    fog,
    ...(data.fogStyle === 'dark' ? { fogStyle: 'dark' as const } : {}),
    image: data.image,
  }
}
