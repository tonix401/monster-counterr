import { Analyzer, type AnalyzeRequest } from './analyze'

export type WorkerRequest =
  | { kind: 'load'; gray: Float32Array; W: number; H: number }
  | { kind: 'run'; id: number; req: AnalyzeRequest }

const analyzer = new Analyzer()

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const msg = e.data
  if (msg.kind === 'load') {
    analyzer.load(msg.gray, msg.W, msg.H)
    return
  }
  const res = analyzer.run(msg.req)
  self.postMessage({ id: msg.id, res }, { transfer: [res.wall.buffer, res.own.buffer] })
}
