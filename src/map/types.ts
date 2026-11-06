export interface WallSegment {
  x1: number
  y1: number
  x2: number
  y2: number
}

export type WallOp = { type: 'wall' } & WallSegment
export type EraseOp = { type: 'erase'; w: number; pts: [number, number][] }
export type MapOp = WallOp | EraseOp

export type MapView = 'map' | 'lines' | 'blueprint'
export type MapMode = 'fog' | 'wall' | 'erase'

export interface DetectParams {
  sensitivity: number
  minLen: number
  gap: number
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
