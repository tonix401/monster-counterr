import { useMonsterStore } from '@/store/useMonsterStore'
import { useMapStore } from './mapStore'
import { renderPlayerImage } from './render'

/** What players receive. `image` is a JPEG with the fogged rooms already painted over. */
export type MapMessage = { type: 'map'; name: string; image: ArrayBuffer } | { type: 'map-clear' }

const DEBOUNCE_MS = 300
let timer: ReturnType<typeof setTimeout> | undefined
let last: MapMessage = { type: 'map-clear' }
let started = false
/** Connections that already got the current picture */
const served = new WeakSet<object>()

function sendTo(conns: { conn: { open: boolean; send: (m: unknown) => void } }[]): void {
  for (const { conn } of conns) {
    if (!conn.open || served.has(conn)) continue
    try {
      conn.send(last)
      served.add(conn)
    } catch (error) {
      console.error('Error sending map to client:', error)
    }
  }
}

async function publish(): Promise<void> {
  const m = useMapStore.getState()
  if (m.shared && m.base && m.analysis) {
    const blob = await renderPlayerImage(m.base, m.analysis, m.fog)
    // the DM may have changed things while the image was encoding
    if (!blob || useMapStore.getState().fog !== m.fog || !useMapStore.getState().shared) return
    last = { type: 'map', name: m.name, image: await blob.arrayBuffer() }
  } else last = { type: 'map-clear' }

  const conns = useMonsterStore.getState().connections
  for (const c of conns) served.delete(c.conn)
  sendTo(conns)
}

/** Keeps connected players' map in step with the DM's. Call once at startup. */
export function startMapSync(): void {
  if (started) return
  started = true

  useMapStore.subscribe((s, prev) => {
    if (
      s.shared === prev.shared &&
      s.fog === prev.fog &&
      s.analysis === prev.analysis &&
      s.name === prev.name
    )
      return
    clearTimeout(timer)
    timer = setTimeout(() => void publish(), DEBOUNCE_MS)
  })

  // players who join later get the current picture straight away
  useMonsterStore.subscribe((s, prev) => {
    if (s.connections !== prev.connections && last.type === 'map') sendTo(s.connections)
  })
}
