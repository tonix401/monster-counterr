import { describe, expect, it } from 'vitest'
import type { Monster } from '@/types/Monster'
import type { Analysis } from './types'
import {
  hitToken,
  monsterInitials,
  monsterLabel,
  playerTokenId,
  playerTokens,
  pruneTokens,
  RING_FRACTION,
  tokenSignature,
  visibleToPlayers,
} from './tokens'

const monster = (over: Partial<Monster> = {}): Monster => ({
  id: 'a',
  name: 'Goblin',
  detailIndex: undefined,
  hp: 10,
  maxhp: 10,
  hasDiedAlready: false,
  conditions: [],
  number: 0,
  isHidden: false,
  xp: 0,
  ...over,
})

/** A 10 x 10 map; the left half is room 1, the right half room 2 */
const analysis = (): Analysis => {
  const own = new Int32Array(100)
  for (let i = 0; i < 100; i++) own[i] = i % 10 < 5 ? 1 : 2
  return { W: 10, H: 10, own, rooms: [] }
}

describe('player tokens', () => {
  it('keep their place when away, and show to players only in unfogged rooms, by letters', () => {
    const tokens = {
      [playerTokenId('a1')]: { x: 1, y: 1 },
      [playerTokenId('b2')]: { x: 7, y: 1 },
    }
    expect(pruneTokens(tokens, new Set())).toBe(tokens)
    const out = playerTokens(tokens, [], analysis(), new Set([2]), { a1: 'Ana Maria', b2: 'Bo' })
    expect(out).toEqual([{ x: 1, y: 1, initials: 'AM', status: 'player' }])
  })
})

describe('light tokens', () => {
  it('are picked at 70% of a monster token', () => {
    const tokens = { 'light:a': { x: 10, y: 10 } }
    expect(hitToken(tokens, 10 + 6, 10, 10)).toBe('light:a')
    expect(hitToken(tokens, 10 + 8, 10, 10)).toBeNull()
  })

  it('stay on the map, and light a fogged room for the monsters standing in it', () => {
    const tokens = { 'light:a': { x: 1, y: 1 } }
    expect(pruneTokens(tokens, new Set())).toBe(tokens)
    const lit = new Uint8Array(100)
    lit[1 * 10 + 7] = 1
    const fogged = new Set([2])
    expect(visibleToPlayers({ x: 7, y: 1 }, { isHidden: false }, analysis(), fogged)).toBe(false)
    expect(visibleToPlayers({ x: 7, y: 1 }, { isHidden: false }, analysis(), fogged, lit)).toBe(
      true
    )
    expect(visibleToPlayers({ x: 7, y: 1 }, { isHidden: true }, analysis(), fogged, lit)).toBe(
      false
    )
  })
})

describe('token helpers', () => {
  it('fills the ring in rough steps', () => {
    expect(RING_FRACTION).toEqual({
      player: 1,
      healthy: 1,
      injured: 0.5,
      'badly-injured': 0.25,
      down: 0,
    })
  })

  it('numbers the label of grouped monsters', () => {
    expect(monsterLabel(monster())).toBe('Goblin')
    expect(monsterLabel(monster({ number: 2 }))).toBe('Goblin 2')
  })

  it('puts the first letter of each word, then the group number, in the token', () => {
    expect(monsterInitials(monster({ name: 'Goblin' }))).toBe('G')
    expect(monsterInitials(monster({ name: 'ancient red dragon', number: 2 }))).toBe('ARD2')
    expect(monsterInitials(monster({ name: 'Giant Fire-Beetle Queen of Bugs' }))).toBe('GFB')
  })

  it('finds the token under a point, the last placed one on top', () => {
    const tokens = { a: { x: 10, y: 10 }, b: { x: 12, y: 10 } }
    expect(hitToken(tokens, 11, 10, 5)).toBe('b')
    expect(hitToken(tokens, 10, 40, 5)).toBeNull()
  })

  it('drops tokens of monsters that are gone, keeping the object when nothing goes', () => {
    const tokens = { a: { x: 1, y: 1 }, b: { x: 2, y: 2 } }
    expect(pruneTokens(tokens, new Set(['a', 'b']))).toBe(tokens)
    expect(pruneTokens(tokens, new Set(['b']))).toEqual({ b: { x: 2, y: 2 } })
  })

  it('shows players only revealed monsters in rooms that are not fogged', () => {
    const a = analysis()
    const fog = new Set([2])
    expect(visibleToPlayers({ x: 1, y: 1 }, monster(), a, fog)).toBe(true)
    expect(visibleToPlayers({ x: 8, y: 1 }, monster(), a, fog)).toBe(false)
    expect(visibleToPlayers({ x: 1, y: 1 }, monster({ isHidden: true }), a, fog)).toBe(false)
    expect(visibleToPlayers({ x: 99, y: 1 }, monster(), a, fog)).toBe(false)
  })

  it('lists player tokens without names, with the health step', () => {
    const list = playerTokens({ a: { x: 1, y: 1 } }, [monster({ hp: 2 })], analysis(), new Set())
    expect(list).toEqual([{ x: 1, y: 1, initials: 'G', status: 'badly-injured' }])
  })

  it('changes the signature when health step, visibility or place changes, not on small hp changes', () => {
    const tokens = { a: { x: 1, y: 1 } }
    const sig = tokenSignature(tokens, [monster({ hp: 10 })])
    expect(tokenSignature(tokens, [monster({ hp: 9 })])).toBe(sig)
    expect(tokenSignature(tokens, [monster({ hp: 4 })])).not.toBe(sig)
    expect(tokenSignature(tokens, [monster({ isHidden: true })])).not.toBe(sig)
    expect(tokenSignature({ a: { x: 2, y: 1 } }, [monster()])).not.toBe(sig)
  })
})
