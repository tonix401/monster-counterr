import type { StateCreator } from 'zustand'
import { BASE_URL } from '@/constants'
import type { Monster } from '@/types/Monster'
import { createMonster } from '@/types/Monster'
import type { Settings } from '@/types/Settings'
import type { MonsterDetails } from '@/types/MonsterDetails'

export type MonsterIndexEntry = { index: string; name: string; source: string }

export type MonsterSliceState = {
  monsters: Monster[]
  monsterIndex: Record<string, MonsterIndexEntry>
  source: string | null
}

export type MonsterSliceActions = {
  addMonster: (name: string, hp: number, amount?: number) => Monster[]
  removeMonster: (monsterId: string) => void
  removeDead: () => void
  clearMonsters: () => void
  updateMonsterHealth: (monsterId: string, amount: number) => void
  addMonsterCondition: (monsterId: string, condition: string) => void
  removeMonsterCondition: (monsterId: string, condition: string) => void
  getMonsterIndex: () => Promise<void>
  getMonsterDetails: (detailIndex: string) => Promise<MonsterDetails | null>
  setSource: (source: string | null) => void
}

export type MonsterSlice = MonsterSliceState & MonsterSliceActions

export const createMonsterSlice: StateCreator<
  MonsterSlice & { settings: Settings },
  [],
  [],
  MonsterSlice
> = (set) => ({
  monsters: [],
  monsterIndex: {},
  source: null,

  addMonster: (name: string, hp: number, amount: number = 1): Monster[] => {
    const newMonsters: Monster[] = []
    const detailIndex = name.toLowerCase().trim().replace(/\s+/g, '-')

    if (amount === 1) {
      newMonsters.push(createMonster(name, hp, detailIndex, 0))
    } else {
      for (let i = 0; i < amount; i++) {
        newMonsters.push(createMonster(name, hp, detailIndex, i + 1))
      }
    }

    set((state) => ({
      monsters: [...state.monsters, ...newMonsters],
    }))
    return newMonsters
  },

  removeMonster: (monsterId: string): void => {
    set((state) => ({
      monsters: state.monsters.filter((monster) => monster.id !== monsterId),
    }))
  },

  removeDead: (): void => {
    set((state) => ({
      monsters: state.monsters.filter((monster) => monster.hp > 0),
    }))
  },

  clearMonsters: (): void => {
    set({ monsters: [] })
  },

  updateMonsterHealth: (monsterId: string, amount: number): void => {
    set((state) => {
      const monsters = state.monsters
        .map((monster) => {
          if (monster.id === monsterId) {
            const newHp = Math.max(0, monster.hp + amount)
            const updatedMonster = { ...monster, hp: newHp }

            // Handle death
            if (newHp === 0 && !monster.hasDiedAlready) {
              updatedMonster.hasDiedAlready = true

              // Auto remove if setting is enabled
              if (state.settings?.autoRemoveDead) {
                return null
              }
            }

            return updatedMonster
          }
          return monster
        })
        .filter(Boolean) as Monster[]

      return { monsters }
    })
  },

  addMonsterCondition: (monsterId: string, condition: string): void => {
    set((state) => ({
      monsters: state.monsters.map((monster) =>
        monster.id === monsterId && !monster.conditions.includes(condition)
          ? {
              ...monster,
              conditions: [...monster.conditions, condition],
            }
          : monster
      ),
    }))
  },

  removeMonsterCondition: (monsterId: string, condition: string): void => {
    set((state) => ({
      monsters: state.monsters.map((monster) =>
        monster.id === monsterId
          ? {
              ...monster,
              conditions: monster.conditions.filter((c) => c !== condition),
            }
          : monster
      ),
    }))
  },

  getMonsterIndex: async (): Promise<void> => {
    try {
      const response = await fetch(`${BASE_URL}/monsters/index.json`)
      if (!response.ok) {
        return
      }
      const data = await response.json()
      set({ monsterIndex: data })
    } catch (error) {
      console.error('Failed to fetch monster index:', error)
      set({ monsterIndex: {} })
    }
  },

  getMonsterDetails: async (detailIndex: string): Promise<MonsterDetails | null> => {
    try {
      const response = await fetch(`${BASE_URL}/monsters/${detailIndex}.json`)
      if (!response.ok) {
        return null
      }
      const data = await response.json()
      return data
    } catch (error) {
      console.error('Failed to fetch monster details:', error)
      return null
    }
  },

  setSource: (source: string | null): void => {
    set({ source })
  },
})
