import type { Monster, MonsterStatus } from '@/types/Monster'
import { getMonsterStatus } from '@/store/helpers/monsters/monsterHelpers'
import type { Analysis } from './types'

/** Where a monster stands on the map, in map pixels */
export interface Token {
  x: number
  y: number
}

/** Placed monsters by monster id */
export type Tokens = Record<string, Token>

/** A monster's health step, or `player` for a connected player (a full ring in its own colour) */
export type TokenStatus = MonsterStatus | 'player'

/** Player tokens live in the same record as monsters, under `player:<name>` */
const PLAYER_PREFIX = 'player:'
export const playerTokenId = (name: string): string => PLAYER_PREFIX + name
export const isPlayerTokenId = (id: string): boolean => id.startsWith(PLAYER_PREFIX)

/** Fires are tokens too, under `light:<uid>`; they light a circle but are never sent to players */
const LIGHT_PREFIX = 'light:'
export const NEW_LIGHT = LIGHT_PREFIX + 'new'
export const newLightId = (): string => LIGHT_PREFIX + crypto.randomUUID().slice(0, 8)
export const isLightTokenId = (id: string): boolean => id.startsWith(LIGHT_PREFIX)
/** A fire is drawn and picked at this fraction of a monster token's size */
export const LIGHT_TOKEN_SCALE = 0.7

/** One grid square is this many feet, and everything that reaches out (light, sight) is measured in feet */
export const FT_PER_CELL = 5
export const DEFAULT_VISION_FT = 30
export const DEFAULT_LIGHT_FT = 20
/** How far a token reaches, in feet: its own setting, else the default for what it is */
export const rangeFt = (ranges: Record<string, number>, id: string): number =>
  ranges[id] ?? (isLightTokenId(id) ? DEFAULT_LIGHT_FT : DEFAULT_VISION_FT)
export const ftToPx = (ft: number, cell: number): number => (ft / FT_PER_CELL) * cell

/** The flame drawn for a fire, in a 24 x 24 box (the toolbar icon and the map use the same path) */
export const FLAME_PATH =
  'M12 2c1 3.5 5 5.5 5 10.2A5 5 0 0 1 12 17.5a5 5 0 0 1-5-5.3c0-2 1-3.4 2.2-4.6.2 1.4.9 2.3 1.8 2.6C10.7 7.5 11 4.5 12 2z'

/** Players by id: their last known name (the id of a token whose player was never named) */
export type PlayerNames = Record<string, string>
export const playerNameOf = (id: string, names: PlayerNames): string =>
  names[id.slice(PLAYER_PREFIX.length)] ?? '?'

/** The same four colours the stylesheet calls --heal, --injured, --damage and --down, and one for players */
export const STATUS_COLOR: Record<TokenStatus, string> = {
  player: '#4aa3ff',
  healthy: '#1db954',
  injured: '#f39c12',
  'badly-injured': '#e84a5f',
  down: '#7f8c8d',
}

/** How much of the ring is filled: the same rough 100/50/25/0 steps the players' list shows */
export const RING_FRACTION: Record<TokenStatus, number> = {
  player: 1,
  healthy: 1,
  injured: 0.5,
  'badly-injured': 0.25,
  down: 0,
}

export const monsterStatus = getMonsterStatus

/** The name shown for a monster; numbered when it was added as a group. */
export const monsterLabel = (m: Pick<Monster, 'name' | 'number'>): string =>
  m.number > 0 ? `${m.name} ${m.number}` : m.name

/** The letters inside a token: the first letter of each word of the name (at most three), then the group number */
export function monsterInitials(m: Pick<Monster, 'name' | 'number'>): string {
  return nameInitials(m.name) + (m.number > 0 ? String(m.number) : '')
}

/** The first letter of each word of a name, at most three */
export function nameInitials(name: string): string {
  return name
    .split(/[\s\-_/]+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((w) => [...w][0].toUpperCase())
    .join('')
}

/** How wide the ring is and how big the letters are, as fractions of the token's radius */
export const RING_WIDTH = 0.2
export const letterSize = (initials: string): number => (initials.length > 2 ? 0.62 : 0.85)

/** Token radius for a map of this size */
export const tokenRadius = (w: number, h: number): number => Math.max(14, Math.max(w, h) * 0.02)

/** The id of the topmost token under the point, or null; later placed tokens win. */
export function hitToken(tokens: Tokens, x: number, y: number, r: number): string | null {
  let hit: string | null = null
  for (const [id, t] of Object.entries(tokens)) {
    if (Math.hypot(t.x - x, t.y - y) <= (isLightTokenId(id) ? r * LIGHT_TOKEN_SCALE : r)) hit = id
  }
  return hit
}

/**
 * Keeps only the tokens whose monster is still in the encounter; the same object if nothing goes.
 * Players keep their place while they are away, so they can rejoin where they stood.
 */
export function pruneTokens(tokens: Tokens, monsterIds: Set<string>): Tokens {
  const keep = (id: string): boolean =>
    isPlayerTokenId(id) || isLightTokenId(id) || monsterIds.has(id)
  if (Object.keys(tokens).every(keep)) return tokens
  return Object.fromEntries(Object.entries(tokens).filter(([id]) => keep(id)))
}

/** Players see a token only for a revealed monster standing in a room that is not fogged, or in the light. */
export function visibleToPlayers(
  token: Token,
  monster: Pick<Monster, 'isHidden'>,
  analysis: Analysis,
  fog: Set<number>,
  lit: Uint8Array | null = null
): boolean {
  if (monster.isHidden) return false
  const x = Math.round(token.x)
  const y = Math.round(token.y)
  if (x < 0 || y < 0 || x >= analysis.W || y >= analysis.H) return false
  return !fog.has(analysis.own[y * analysis.W + x]) || !!lit?.[y * analysis.W + x]
}

/** What players are sent for one token: a place, letters and a rough health step; never a name */
export interface PlayerToken {
  x: number
  y: number
  initials: string
  status: TokenStatus
}

/** The tokens players get to see; no names, only a face and a rough health ring. */
export function playerTokens(
  tokens: Tokens,
  monsters: Monster[],
  analysis: Analysis,
  fog: Set<number>,
  names: PlayerNames = {},
  lit: Uint8Array | null = null
): PlayerToken[] {
  const out: PlayerToken[] = []
  for (const m of monsters) {
    const t = tokens[m.id]
    if (t && visibleToPlayers(t, m, analysis, fog, lit))
      out.push({ x: t.x, y: t.y, initials: monsterInitials(m), status: getMonsterStatus(m) })
  }
  for (const [id, t] of Object.entries(tokens)) {
    if (isPlayerTokenId(id) && visibleToPlayers(t, { isHidden: false }, analysis, fog, lit))
      out.push({
        x: t.x,
        y: t.y,
        initials: nameInitials(playerNameOf(id, names)),
        status: 'player',
      })
  }
  return out
}

/** Changes whenever something a placed token shows changes: face, health step, visibility or place. */
export function tokenSignature(tokens: Tokens, monsters: Monster[]): string {
  return monsters
    .filter((m) => tokens[m.id])
    .map((m) => {
      const t = tokens[m.id]
      return `${m.id}:${monsterLabel(m)}:${getMonsterStatus(m)}:${m.isHidden ? 1 : 0}:${t.x},${t.y}`
    })
    .join('|')
}
