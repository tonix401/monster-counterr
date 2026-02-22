import type { Monster } from '@/types/Monster'
import type { Settings } from '@/types/Settings'
import { createMonster } from '@/types/Monster'
import type { MonsterIndexEntry } from '@/store/types'

/**
 * Monster state update helpers - Pure functions for testability
 */

/**
 * Generate a detail index for 5e.tools monster info pages
 * Transforms monster name and source into the URL-friendly format used by 5e.tools
 */
export function getDetailIndex(name: string, source: string | undefined): string {
  const nm = name
    .toLowerCase()
    .replace(/-+/g, '')
    .replaceAll("'", '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
  const src = source?.toLowerCase().replace(/[^a-z0-9]+/g, '')
  return `${nm}-${src}`
}

/**
 * Create multiple monsters with sequential numbering
 */
export function createMonsters(
  name: string,
  detailIndex: string | undefined,
  hp: number,
  xp: number,
  amount: number = 1
): Monster[] {
  const newMonsters: Monster[] = []

  if (amount === 1) {
    newMonsters.push(createMonster({ name, hp, detailIndex, number: 0, xp }))
  } else {
    for (let i = 0; i < amount; i++) {
      newMonsters.push(createMonster({ name, hp, detailIndex, number: i + 1, xp }))
    }
  }

  return newMonsters
}

/**
 * Filter out dead monsters
 */
export function filterOutDead(monsters: Monster[]): Monster[] {
  return monsters.filter((monster) => monster.hp > 0)
}

/**
 * Update health for a monster and handle death
 * Returns { updatedMonsters, gainedXp, monsterDied }
 */
export function updateMonsterHealth(
  monsters: Monster[],
  monsterId: string,
  amount: number,
  settings: Settings
): { monsters: Monster[]; gainedXp: number; monsterDied: boolean } {
  let gainedXp = 0
  let monsterDied = false
  const shouldAutoRemove = settings.autoRemoveDead

  const updatedMonsters = monsters
    .map((monster) => {
      if (monster.id === monsterId) {
        const newHp = Math.max(0, monster.hp + amount)
        const updatedMonster = { ...monster, hp: newHp }

        // Handle death
        if (newHp === 0 && !monster.hasDiedAlready) {
          updatedMonster.hasDiedAlready = true
          gainedXp = monster.xp ?? 0
          monsterDied = true
        }

        return updatedMonster
      }
      return monster
    })
    .filter((m): m is Monster => {
      // Auto-remove dead if setting enabled
      if (m.hp <= 0 && shouldAutoRemove && m.hasDiedAlready) {
        return false
      }
      return true
    })

  return { monsters: updatedMonsters, gainedXp, monsterDied }
}

/**
 * Add a condition to a monster
 */
export function addConditionToMonster(monster: Monster, condition: string): Monster {
  if (monster.conditions.includes(condition)) {
    return monster
  }
  return {
    ...monster,
    conditions: [...monster.conditions, condition],
  }
}

/**
 * Remove a condition from a monster
 */
export function removeConditionFromMonster(monster: Monster, condition: string): Monster {
  return {
    ...monster,
    conditions: monster.conditions.filter((c) => c !== condition),
  }
}

/**
 * Toggle hide status on a monster
 */
export function toggleMonsterHidden(monster: Monster): Monster {
  return {
    ...monster,
    isHidden: !monster.isHidden,
  }
}

/**
 * Calculate status based on HP
 */
export function getMonsterStatus(
  monster: Monster
): 'healthy' | 'injured' | 'badly-injured' | 'down' {
  if (monster.hp <= 0) {
    return 'down'
  } else if (monster.hp <= monster.maxhp / 4) {
    return 'badly-injured'
  } else if (monster.hp <= monster.maxhp / 2) {
    return 'injured'
  }
  return 'healthy'
}

/**
 * Fetch monster index from API
 */
export async function fetchMonsterIndex(
  baseUrl: string
): Promise<Record<string, MonsterIndexEntry>> {
  try {
    const response = await fetch(`${baseUrl}/monster_index.json`)
    if (!response.ok) {
      console.error(`Failed to fetch monster index: ${response.status}`)
      return {}
    }
    return await response.json()
  } catch (error) {
    console.error('Failed to fetch monster index:', error)
    return {}
  }
}
