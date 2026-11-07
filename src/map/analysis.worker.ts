import { Analyzer } from './analyze'
import type { DetectParams } from './types'

export type WorkerRequest =
  | { kind: 'load'; gray: Float32Array; W: number; H: number }
  | { kind: 'detect'; id: number; params: DetectParams }

const analyzer = new Analyzer()

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const msg = e.data
  if (msg.kind === 'load') {
    analyzer.load(msg.gray, msg.W, msg.H)
  } else {
    self.postMessage({ id: msg.id, res: analyzer.detect(msg.params) })
  }
}
