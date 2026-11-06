import { Analyzer, type AnalyzeRequest } from './analyze'
import type { WorkerRequest } from './analysis.worker'
import type { Analysis, DetectParams, WallSegment } from './types'

/**
 * Runs wall detection and room building off the main thread. Falls back to running inline where
 * Workers don't exist (tests).
 */
export interface AnalyzerClient {
  load(gray: Float32Array, W: number, H: number): void
  run(req: AnalyzeRequest): Promise<Analysis>
  detect(params: DetectParams): Promise<WallSegment[]>
}

export function createAnalyzerClient(): AnalyzerClient {
  if (typeof Worker === 'undefined') {
    const inline = new Analyzer()
    return {
      load: (gray, W, H) => inline.load(gray, W, H),
      run: async (req) => inline.run(req),
      detect: async (params) => inline.detect(params),
    }
  }

  const worker = new Worker(new URL('./analysis.worker.ts', import.meta.url), { type: 'module' })
  const waiting = new Map<number, (res: never) => void>()
  let nextId = 1
  worker.onmessage = (e: MessageEvent<{ id: number; res: never }>) => {
    waiting.get(e.data.id)?.(e.data.res)
    waiting.delete(e.data.id)
  }
  const post = (msg: WorkerRequest, transfer: Transferable[] = []): void =>
    worker.postMessage(msg, transfer)
  const ask = <T>(make: (id: number) => WorkerRequest): Promise<T> =>
    new Promise((resolve) => {
      const id = nextId++
      waiting.set(id, resolve as (res: never) => void)
      post(make(id))
    })

  return {
    load: (gray, W, H) => post({ kind: 'load', gray, W, H }, [gray.buffer]),
    run: (req) => ask<Analysis>((id) => ({ kind: 'run', id, req })),
    detect: (params) => ask<WallSegment[]>((id) => ({ kind: 'detect', id, params })),
  }
}
