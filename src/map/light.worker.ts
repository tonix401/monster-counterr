import { lightMask, lightShape, type LightRequest, type LightSource } from './light'
import { renderPlayerImage } from './render'
import type { Analysis, FogStyle, WallSegment } from './types'

export type LightWorkerRequest =
  /**
   * What each source lights, as flat polygons. The walls come only when `wallsId` is new to this
   * worker, and a source that has not moved or changed reach since the last time costs nothing.
   */
  | {
      kind: 'shapes'
      id: number
      wallsId: number
      walls?: WallSegment[]
      sources: LightSource[]
    }
  /** The map the next renders are made from: the room of every pixel, and the picture */
  | { kind: 'scene'; own?: Int32Array; W: number; H: number; rooms: number; base?: ImageBitmap }
  /** The picture one audience gets, with its fogged rooms and light, and the lit pixels */
  | {
      kind: 'render'
      id: number
      req: LightRequest
      fog: number[]
      style: FogStyle
      grid: { on: boolean; cell: number } | null
    }

export type LightWorkerReply =
  | { id: number; shapes: Float32Array[] }
  | { id: number; mask: Uint8Array | null; blob: Blob | null }

const scene: {
  own: Int32Array | null
  W: number
  H: number
  rooms: number
  base: ImageBitmap | null
} = { own: null, W: 0, H: 0, rooms: 0, base: null }

/** The walls the last request brought, and what each source made of them */
const known = { id: -1, walls: [] as WallSegment[], shapes: new Map<string, Float32Array>() }

const reply = (msg: LightWorkerReply, transfer: Transferable[] = []): void =>
  (self as unknown as Worker).postMessage(msg, transfer)

self.onmessage = async (e: MessageEvent<LightWorkerRequest>) => {
  const msg = e.data
  if (msg.kind === 'scene') {
    if (msg.own) scene.own = msg.own
    if (msg.base) scene.base = msg.base
    Object.assign(scene, { W: msg.W, H: msg.H, rooms: msg.rooms })
  } else if (msg.kind === 'shapes') {
    if (msg.walls && msg.wallsId !== known.id) {
      known.id = msg.wallsId
      known.walls = msg.walls
      known.shapes.clear()
    }
    if (known.shapes.size > 64) known.shapes.clear()
    const shapes = msg.sources
      .filter((s) => s.r > 0)
      .map((s) => {
        const key = `${s.id}|${s.x}|${s.y}|${s.r}`
        let shape = known.shapes.get(key)
        if (!shape) known.shapes.set(key, (shape = lightShape(s, known.walls)))
        return shape
      })
    reply({ id: msg.id, shapes })
  } else {
    const mask = lightMask(msg.req)
    let blob: Blob | null = null
    if (scene.own && scene.base) {
      const a = { W: scene.W, H: scene.H, own: scene.own, rooms: new Array(scene.rooms).fill(null) }
      blob = await renderPlayerImage(
        scene.base,
        a as Analysis,
        new Set(msg.fog),
        msg.style,
        mask,
        msg.grid
      )
    }
    reply({ id: msg.id, mask, blob }, mask ? [mask.buffer] : [])
  }
}
