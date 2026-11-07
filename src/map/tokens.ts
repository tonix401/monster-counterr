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

/** The same four colours the stylesheet calls --heal, --injured, --damage and --down */
export const STATUS_COLOR: Record<MonsterStatus, string> = {
  healthy: '#1db954',
  injured: '#f39c12',
  'badly-injured': '#e84a5f',
  down: '#7f8c8d',
}

/** How much of the ring is filled: the same rough 100/50/25/0 steps the players' list shows */
export const RING_FRACTION: Record<MonsterStatus, number> = {
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
  const letters = m.name
    .split(/[\s\-_/]+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((w) => [...w][0].toUpperCase())
    .join('')
  return letters + (m.number > 0 ? String(m.number) : '')
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
    if (Math.hypot(t.x - x, t.y - y) <= r) hit = id
  }
  return hit
}

/** Keeps only the tokens whose monster is still in the encounter; the same object if nothing goes. */
export function pruneTokens(tokens: Tokens, monsterIds: Set<string>): Tokens {
  const ids = Object.keys(tokens)
  if (ids.every((id) => monsterIds.has(id))) return tokens
  return Object.fromEntries(Object.entries(tokens).filter(([id]) => monsterIds.has(id)))
}

/** Players see a token only for a revealed monster standing in a room that is not fogged. */
export function visibleToPlayers(
  token: Token,
  monster: Pick<Monster, 'isHidden'>,
  analysis: Analysis,
  fog: Set<number>
): boolean {
  if (monster.isHidden) return false
  const x = Math.round(token.x)
  const y = Math.round(token.y)
  if (x < 0 || y < 0 || x >= analysis.W || y >= analysis.H) return false
  return !fog.has(analysis.own[y * analysis.W + x])
}

/** What players are sent for one token: a place, letters and a rough health step; never a name */
export interface PlayerToken {
  x: number
  y: number
  initials: string
  status: MonsterStatus
}

/** The tokens players get to see; no names, only a face and a rough health ring. */
export function playerTokens(
  tokens: Tokens,
  monsters: Monster[],
  analysis: Analysis,
  fog: Set<number>
): PlayerToken[] {
  const out: PlayerToken[] = []
  for (const m of monsters) {
    const t = tokens[m.id]
    if (t && visibleToPlayers(t, m, analysis, fog))
      out.push({ x: t.x, y: t.y, initials: monsterInitials(m), status: getMonsterStatus(m) })
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
