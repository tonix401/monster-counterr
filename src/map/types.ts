export interface WallSegment {
  x1: number
  y1: number
  x2: number
  y2: number
}

export type ShapeKind = 'rect' | 'tri' | 'circle'

/** A drawn line; `id` is assigned by the store so the item can be selected, moved and erased */
export type WallOp = { type: 'wall'; id?: number } & WallSegment
/** A rectangle, triangle or ellipse; x1,y1 and x2,y2 are opposite corners of its bounding box */
export type ShapeOp = { type: 'shape'; kind: ShapeKind; id?: number } & WallSegment
/** Hides one automatically detected wall, so erasing and moving such walls survives re-rendering */
export type CutOp = { type: 'cut'; id?: number } & WallSegment
/** Pixel brush from older files; no longer created */
export type EraseOp = { type: 'erase'; id?: number; w: number; pts: [number, number][] }
export type MapOp = WallOp | ShapeOp | CutOp | EraseOp

export type MapView = 'map' | 'lines' | 'blueprint'
export type MapMode = 'fog' | 'select' | 'wall' | ShapeKind | 'erase' | 'pan'

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
  wall: Uint8Array
  /** Room id per pixel, 0 for none */
  own: Int32Array
  rooms: (Room | null)[]
  auto: WallSegment[]
}

export const MAP_MAX_DIM = 1600
