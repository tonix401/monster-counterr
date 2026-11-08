import { lightMask, lightShapes, litRequestForViewer, type LightRequest } from './light'
import type { WallSegment } from './types'
import type { LightWorkerReply, LightWorkerRequest } from './light.worker'
import { renderPlayerImage } from './render'
import type { Analysis, FogStyle, Graph } from './types'
import type { Tokens } from './tokens'

/** `undefined` for a request that a newer one on the same channel replaced before it started */
type Shapes = Float32Array[] | undefined

/** The parts of the map a player's picture is made from */
export interface ViewSource {
  analysis: Analysis | null
  base: HTMLCanvasElement | null
  graph: Graph
  tokens: Tokens
  ranges: Record<string, number>
  grid: { on: boolean; cell: number }
  fog: Set<number>
  fogStyle: FogStyle
}

export interface RenderedView {
  /** Lit pixels, for placing tokens in light */
  mask: Uint8Array | null
  blob: Blob | null
}

/**
 * The light, off the main thread. `shapes` is what the DM's fog needs on every frame of a drag: a
 * `channel` keeps one request running and only the newest waiting, the ones it replaces resolve to
 * `undefined`. `renderView` makes a whole player picture, the slow part, in a worker of its own so
 * it never holds a drag up. Both run inline where Workers don't exist (tests).
 */
export interface LightClient {
  shapes(req: LightRequest | null, channel?: string): Promise<Shapes>
  renderView(m: ViewSource, playerId: string | null): Promise<RenderedView | null>
}

const newWorker = (): Worker =>
  new Worker(new URL('./light.worker.ts', import.meta.url), { type: 'module' })

function createLightClient(): LightClient {
  if (typeof Worker === 'undefined') {
    return {
      shapes: async (req) => (req ? lightShapes(req) : []),
      async renderView(m, playerId) {
        const req = litRequestForViewer(m, playerId)
        if (!req || !m.analysis || !m.base) return null
        const mask = lightMask(req)
        const blob = await renderPlayerImage(m.base, m.analysis, m.fog, m.fogStyle, mask, m.grid)
        return { mask, blob }
      },
    }
  }

  const fast = newWorker()
  const slow = newWorker()
  const waiting = new Map<number, (r: LightWorkerReply) => void>()
  let nextId = 1
  const onmessage = (e: MessageEvent<LightWorkerReply>): void => {
    waiting.get(e.data.id)?.(e.data)
    waiting.delete(e.data.id)
  }
  fast.onmessage = onmessage
  slow.onmessage = onmessage

  const send = (
    w: Worker,
    make: (id: number) => LightWorkerRequest,
    done: (r: never) => void
  ): void => {
    const id = nextId++
    waiting.set(id, done as (r: LightWorkerReply) => void)
    w.postMessage(make(id))
  }

  // the walls go to the fast worker once per change, not with every frame of a drag
  const ids = new WeakMap<WallSegment[], number>()
  let sentWalls: WallSegment[] | null = null
  const wallsId = (w: WallSegment[]): number => {
    let id = ids.get(w)
    if (id === undefined) ids.set(w, (id = nextId++))
    return id
  }

  /** Per channel: whether a request is running, and the newest one waiting for it */
  const lanes = new Map<
    string,
    { busy: boolean; next?: { req: LightRequest; done: (s: Shapes) => void } }
  >()

  // the slow worker's copy of the map: sent again only when the rooms or the picture are new
  let sceneAnalysis: Analysis | null = null
  let sceneBase: HTMLCanvasElement | null = null
  const syncScene = async (a: Analysis, base: HTMLCanvasElement): Promise<void> => {
    if (a !== sceneAnalysis) {
      sceneAnalysis = a
      slow.postMessage({
        kind: 'scene',
        own: a.own.slice(),
        W: a.W,
        H: a.H,
        rooms: a.rooms.length,
      } satisfies LightWorkerRequest)
    }
    if (base !== sceneBase) {
      sceneBase = base
      const bitmap = await createImageBitmap(base)
      slow.postMessage(
        {
          kind: 'scene',
          W: a.W,
          H: a.H,
          rooms: a.rooms.length,
          base: bitmap,
        } satisfies LightWorkerRequest,
        [bitmap]
      )
    }
  }

  return {
    shapes(req, channel) {
      if (!req) return Promise.resolve([])
      return new Promise((resolve) => {
        const run = (r: LightRequest, done: (s: Shapes) => void, after?: () => void): void =>
          send(
            fast,
            (id) => ({
              kind: 'shapes',
              id,
              wallsId: wallsId(r.walls),
              walls: sentWalls === r.walls ? undefined : ((sentWalls = r.walls), r.walls),
              sources: r.sources,
            }),
            (reply: { shapes: Float32Array[] }) => {
              done(reply.shapes)
              after?.()
            }
          )
        if (!channel) return run(req, resolve)
        const lane = lanes.get(channel) ?? { busy: false }
        lanes.set(channel, lane)
        const go = (r: LightRequest, done: (s: Shapes) => void): void => {
          lane.busy = true
          run(r, done, () => {
            lane.busy = false
            const n = lane.next
            lane.next = undefined
            if (n) go(n.req, n.done)
          })
        }
        if (!lane.busy) return go(req, resolve)
        lane.next?.done(undefined)
        lane.next = { req, done: resolve }
      })
    },
    async renderView(m, playerId) {
      const req = litRequestForViewer(m, playerId)
      if (!req || !m.analysis || !m.base) return null
      await syncScene(m.analysis, m.base)
      return new Promise((resolve) =>
        send(
          slow,
          (id) => ({ kind: 'render', id, req, fog: [...m.fog], style: m.fogStyle, grid: m.grid }),
          (reply: { mask: Uint8Array | null; blob: Blob | null }) => resolve(reply)
        )
      )
    },
  }
}

let client: LightClient | null = null
export const lightClient = (): LightClient => (client ??= createLightClient())
