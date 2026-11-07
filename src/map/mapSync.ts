import { useMonsterStore } from '@/store/useMonsterStore'
import { useMapStore } from './mapStore'
import { renderPlayerImage } from './render'
import type { TokensMessage } from './mapMessage'
import { litForViewer } from './light'
import {
  isLightTokenId,
  isPlayerTokenId,
  playerTokenId,
  playerTokens,
  pruneTokens,
  tokenSignature,
} from './tokens'

const givesLight = (tokens: Record<string, unknown>): boolean =>
  Object.keys(tokens).some((id) => isLightTokenId(id) || isPlayerTokenId(id))

/** What players receive. `image` is a JPEG with the fogged rooms already painted over. */
export type MapMessage = { type: 'map'; name: string; image: ArrayBuffer } | { type: 'map-clear' }

/** What the DM's preview shows: the picture everybody shares, without any player's own sight. */
export interface PublishedMap {
  name: string
  url: string
}
let published: PublishedMap | null = null
let publishedTokens: TokensMessage | null = null
const listeners = new Set<() => void>()

export const getPublishedMap = (): PublishedMap | null => published
/** The tokens everybody sees on that picture */
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

/**
 * What one audience gets: the pixels lit for it, the picture drawn with them, and the tokens it
 * may see. Everybody shares the global view (fires and open rooms); a player standing on the map
 * also has a view of their own that adds only their own sight.
 */
interface View {
  lit: Uint8Array | null
  image: ArrayBuffer | null
  tokens: TokensMessage | null
}
const emptyView = (): View => ({ lit: null, image: null, tokens: null })

const DEBOUNCE_MS = 300
const TOKEN_DEBOUNCE_MS = 80
let timer: ReturnType<typeof setTimeout> | undefined
let tokenTimer: ReturnType<typeof setTimeout> | undefined
let globalView: View = emptyView()
/** By player id; players without a token on the map just get the global view */
let playerViews = new Map<string, View>()
let sharedName: string | null = null
/** Numbers each publish, so a slow one that a newer one overtook drops its result */
let publishSeq = 0
let started = false
/** Connections that already got the current picture, and the current tokens */
const served = new WeakSet<object>()
const servedTokens = new WeakSet<object>()

type Conn = {
  playerId: string
  conn: { open: boolean; send: (m: unknown) => void }
}

function sendTo(conns: Conn[]): void {
  for (const { conn, playerId } of conns) {
    if (!conn.open) continue
    const view = playerViews.get(playerId) ?? globalView
    try {
      if (!served.has(conn)) {
        if (sharedName === null) conn.send({ type: 'map-clear' } satisfies MapMessage)
        else if (view.image)
          conn.send({ type: 'map', name: sharedName, image: view.image } satisfies MapMessage)
        else continue // still being drawn
        served.add(conn)
      }
      // the tokens belong to a picture: players with none yet get none
      if (sharedName !== null && view.tokens && !servedTokens.has(conn)) {
        conn.send(view.tokens)
        servedTokens.add(conn)
      }
    } catch (error) {
      console.error('Error sending map to client:', error)
    }
  }
}

/** Sends each audience the monsters and players it may see: those in open rooms or in its light */
function publishTokens(): void {
  const m = useMapStore.getState()
  const conns = useMonsterStore.getState().connections
  if (m.shared && m.base && m.analysis) {
    const { W, H } = m.analysis
    const monsters = useMonsterStore.getState().monsters
    const tokensFor = (v: View): TokensMessage => ({
      type: 'map-tokens',
      width: W,
      height: H,
      tokens: playerTokens(m.tokens, monsters, m.analysis!, m.fog, m.players, v.lit),
    })
    globalView.tokens = tokensFor(globalView)
    for (const v of playerViews.values()) v.tokens = tokensFor(v)
  } else {
    globalView.tokens = null
    for (const v of playerViews.values()) v.tokens = null
  }
  setPublishedTokens(globalView.tokens)
  for (const c of conns) servedTokens.delete(c.conn)
  sendTo(conns)
}

async function publish(): Promise<void> {
  const mine = ++publishSeq
  const m = useMapStore.getState()
  if (m.shared && m.base && m.analysis) {
    const draw = async (
      lit: Uint8Array | null
    ): Promise<{ blob: Blob; image: ArrayBuffer } | null> => {
      const blob = await renderPlayerImage(m.base!, m.analysis!, m.fog, m.fogStyle, lit, m.grid)
      return blob ? { blob, image: await blob.arrayBuffer() } : null
    }
    const globalLit = litForViewer(m, null)
    const shared = await draw(globalLit)
    if (!shared || mine !== publishSeq) return
    const next = new Map<string, View>()
    // a player standing on the map sees their own sight on top of what everybody sees
    const standing = new Set(
      useMonsterStore
        .getState()
        .connections.map((c) => c.playerId)
        .filter((id) => playerTokenId(id) in m.tokens)
    )
    for (const id of standing) {
      const lit = litForViewer(m, id)
      const own = await draw(lit)
      if (!own || mine !== publishSeq) return
      next.set(id, { lit, image: own.image, tokens: null })
    }
    globalView = { lit: globalLit, image: shared.image, tokens: null }
    playerViews = next
    sharedName = m.name
    setPublished({ name: m.name, url: URL.createObjectURL(shared.blob) })
  } else {
    globalView = emptyView()
    playerViews = new Map()
    sharedName = null
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

  const rememberNames = (): void => {
    // remember each player's name, so a placed token keeps its letters when they leave or rename
    for (const c of useMonsterStore.getState().connections)
      useMapStore.getState().setPlayerName(c.playerId, c.name)
  }

  // a monster that left the encounter leaves the map
  const dropGone = (): void => {
    const m = useMapStore.getState()
    const ids = new Set(useMonsterStore.getState().monsters.map((x) => x.id))
    m.setTokens(pruneTokens(m.tokens, ids))
  }

  useMapStore.subscribe((s, prev) => {
    if (s.loaded && !prev.loaded) rememberNames()
    if (s.tokens !== prev.tokens || s.loaded !== prev.loaded) dropGone()
    if (
      s.shared !== prev.shared ||
      s.fog !== prev.fog ||
      s.fogStyle !== prev.fogStyle ||
      s.analysis !== prev.analysis ||
      s.name !== prev.name ||
      s.ranges !== prev.ranges ||
      s.grid !== prev.grid ||
      (s.tokens !== prev.tokens && (givesLight(s.tokens) || givesLight(prev.tokens)))
    ) {
      republishImage()
      republishTokens()
    } else if (s.tokens !== prev.tokens || s.players !== prev.players) republishTokens()
  })

  // health, visibility or names of placed monsters change what the players' tokens show
  useMonsterStore.subscribe((s, prev) => {
    if (s.monsters !== prev.monsters) {
      dropGone()
      const tokens = useMapStore.getState().tokens
      if (tokenSignature(tokens, s.monsters) !== tokenSignature(tokens, prev.monsters))
        republishTokens()
    }
    // players who join later get the current picture straight away, and one standing on the map
    // gets a picture with their own sight drawn in
    if (s.connections !== prev.connections) {
      rememberNames()
      sendTo(s.connections)
      const ids = (c: typeof s.connections): string =>
        c
          .map((x) => x.playerId)
          .sort()
          .join('|')
      if (ids(s.connections) !== ids(prev.connections)) republishImage()
    }
  })
}
