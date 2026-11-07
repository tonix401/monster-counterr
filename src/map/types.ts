export interface WallSegment {
  x1: number
  y1: number
  x2: number
  y2: number
}

/** A corner or end of walls; every line that meets here shares this one point */
export interface MapNode {
  id: number
  x: number
  y: number
}

/** A wall between two nodes (by id); never zero-length, and each pair is joined at most once */
export interface MapEdge {
  id: number
  a: number
  b: number
}

/** The walls drawn on the map; always replaced, never changed in place, so history can keep old ones */
export interface Graph {
  nodes: MapNode[]
  edges: MapEdge[]
  /** The next free id for a node or an edge */
  next: number
}

export type Selection = { kind: 'node' | 'edge'; id: number }

/** How a fogged room looks to players: grey fog, or no light at all */
export type FogStyle = 'fog' | 'dark'
export type MapView = 'map' | 'lines' | 'blueprint'
export type MapMode = 'fog' | 'select' | 'wall' | 'rect' | 'circle' | 'poly' | 'erase' | 'pan'

export interface DetectParams {
  sensitivity: number
  minLen: number
  gap: number
  /** Widest wall, as a fraction of the longer map side; parallel edges closer than this become one line */
  thickness?: number
  /** Also look for walls at other angles (default on) */
  oblique?: boolean
}

export interface Room {
  id: number
  area: number
  x0: number
  y0: number
  x1: number
  y1: number
  /** A pixel index inside the room, used to find the room again after the walls change */
  sample: number
  /** Touches the map edge, i.e. the outside rather than a room */
  ext: boolean
  alive: boolean
  bx0: number
  by0: number
  bx1: number
  by1: number
}

export interface Analysis {
  W: number
  H: number
  /** Room id per pixel, 0 for none */
  own: Int32Array
  rooms: (Room | null)[]
}

export const MAP_MAX_DIM = 1600
