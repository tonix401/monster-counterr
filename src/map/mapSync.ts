import { useMonsterStore } from '@/store/useMonsterStore'
import { useMapStore } from './mapStore'
import { renderPlayerImage } from './render'
import type { TokensMessage } from './mapMessage'
import { playerTokens, pruneTokens, tokenSignature } from './tokens'

/** What players receive. `image` is a JPEG with the fogged rooms already painted over. */
export type MapMessage = { type: 'map'; name: string; image: ArrayBuffer } | { type: 'map-clear' }

/** What players see right now: null while no map is shared. The DM's preview shows this very picture. */
export interface PublishedMap {
  name: string
  url: string
}
let published: PublishedMap | null = null
let publishedTokens: TokensMessage | null = null
const listeners = new Set<() => void>()

export const getPublishedMap = (): PublishedMap | null => published
/** The tokens players see on that picture, as sent to them */
export const getPublishedTokens = (): TokensMessage | null => publishedTokens
export function subscribePublishedMap(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function setPublished(next: PublishedMap | null): void {
  if (published) URL.revokeObjectURL(published.url)
  published = next
  listeners.forEach((l) => l())
}

function setPublishedTokens(next: TokensMessage | null): void {
  publishedTokens = next
  listeners.forEach((l) => l())
}

const DEBOUNCE_MS = 300
const TOKEN_DEBOUNCE_MS = 80
let timer: ReturnType<typeof setTimeout> | undefined
let tokenTimer: ReturnType<typeof setTimeout> | undefined
let last: MapMessage = { type: 'map-clear' }
let lastTokens: TokensMessage | null = null
let started = false
/** Connections that already got the current picture, and the current tokens */
const served = new WeakSet<object>()
const servedTokens = new WeakSet<object>()

type Conn = { conn: { open: boolean; send: (m: unknown) => void } }

function sendTo(conns: Conn[]): void {
  for (const { conn } of conns) {
    if (!conn.open) continue
    try {
      if (!served.has(conn)) {
        conn.send(last)
        served.add(conn)
      }
      // the tokens belong to a picture: players with none yet get none
      if (last.type === 'map' && lastTokens && !servedTokens.has(conn)) {
        conn.send(lastTokens)
        servedTokens.add(conn)
      }
    } catch (error) {
      console.error('Error sending map to client:', error)
    }
  }
}

/** Sends the monsters players may see: revealed ones standing in rooms that are not fogged */
function publishTokens(): void {
  const m = useMapStore.getState()
  const shown = m.shared && m.base && m.analysis
  lastTokens = shown
    ? {
        type: 'map-tokens',
        width: m.analysis!.W,
        height: m.analysis!.H,
        tokens: playerTokens(m.tokens, useMonsterStore.getState().monsters, m.analysis!, m.fog),
      }
    : null
  setPublishedTokens(lastTokens)
  const conns = useMonsterStore.getState().connections
  for (const c of conns) servedTokens.delete(c.conn)
  sendTo(conns)
}

async function publish(): Promise<void> {
  const m = useMapStore.getState()
  if (m.shared && m.base && m.analysis) {
    const blob = await renderPlayerImage(m.base, m.analysis, m.fog, m.fogStyle)
    // the DM may have changed things while the image was encoding
    if (
      !blob ||
      useMapStore.getState().fog !== m.fog ||
      useMapStore.getState().fogStyle !== m.fogStyle ||
      !useMapStore.getState().shared
    )
      return
    last = { type: 'map', name: m.name, image: await blob.arrayBuffer() }
    setPublished({ name: m.name, url: URL.createObjectURL(blob) })
  } else {
    last = { type: 'map-clear' }
    setPublished(null)
  }

  const conns = useMonsterStore.getState().connections
  for (const c of conns) served.delete(c.conn)
  // the picture and the tokens go out together, so a fogged room never shows a token
  publishTokens()
}

/** Keeps connected players' map in step with the DM's. Call once at startup. */
export function startMapSync(): void {
  if (started) return
  started = true

  const republishImage = (): void => {
    clearTimeout(timer)
    timer = setTimeout(() => void publish(), DEBOUNCE_MS)
  }
  const republishTokens = (): void => {
    clearTimeout(tokenTimer)
    tokenTimer = setTimeout(publishTokens, TOKEN_DEBOUNCE_MS)
  }

  // a monster that left the encounter leaves the map
  const dropGone = (): void => {
    const m = useMapStore.getState()
    const ids = new Set(useMonsterStore.getState().monsters.map((x) => x.id))
    m.setTokens(pruneTokens(m.tokens, ids))
  }

  useMapStore.subscribe((s, prev) => {
    if (s.tokens !== prev.tokens || s.loaded !== prev.loaded) dropGone()
    if (
      s.shared !== prev.shared ||
      s.fog !== prev.fog ||
      s.fogStyle !== prev.fogStyle ||
      s.analysis !== prev.analysis ||
      s.name !== prev.name
    )
      republishImage()
    else if (s.tokens !== prev.tokens) republishTokens()
  })

  // health, visibility or names of placed monsters change what the players' tokens show
  useMonsterStore.subscribe((s, prev) => {
    if (s.monsters !== prev.monsters) {
      dropGone()
      const tokens = useMapStore.getState().tokens
      if (tokenSignature(tokens, s.monsters) !== tokenSignature(tokens, prev.monsters))
        republishTokens()
    }
    // players who join later get the current picture straight away
    if (s.connections !== prev.connections && last.type === 'map') sendTo(s.connections)
  })
}
