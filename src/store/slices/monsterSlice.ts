import type { StateCreator } from 'zustand'
import { BASE_URL } from '@/constants'
import type { Monster } from '@/types/Monster'
import { createMonster } from '@/types/Monster'
import type { Settings } from '@/types/Settings'

export type MonsterIndexEntryHp =
  | {
      average: number
      formula: string
    }
  | {
      special: string
    }

export type MonsterIndexEntry = {
  name: string
  source: string | "all"
  hp: MonsterIndexEntryHp
  xp: number
}

export type MonsterSliceState = {
  monsters: Monster[]
  monsterIndex: Record<string, MonsterIndexEntry>
  source: string | "all"
  highlightedMonsterId: string | null
}

export type MonsterSliceActions = {
  addMonster: (name: string, index: string | undefined, hp: number, amount?: number) => Monster[]
  removeMonster: (monsterId: string) => void
  removeDead: () => void
  clearMonsters: () => void
  updateMonsterHealth: (monsterId: string, amount: number) => void
  addMonsterCondition: (monsterId: string, condition: string) => void
  removeMonsterCondition: (monsterId: string, condition: string) => void
  getMonsterIndex: () => Promise<void>
  setSource: (source: string | "all") => void
  highlightMonster: (monsterId: string) => void
  toggleHideMonster: (monsterId: string) => void
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
  source: "all",
  highlightedMonsterId: null,

  addMonster: (
    name: string,
    index: string | undefined,
    hp: number,
    amount: number = 1
  ): Monster[] => {
    const newMonsters: Monster[] = []

    if (amount === 1) {
      newMonsters.push(createMonster(name, hp, index, 0))
    } else {
      for (let i = 0; i < amount; i++) {
        newMonsters.push(createMonster(name, hp, index, i + 1))
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
      const response = await fetch(`${BASE_URL}/monster_index.json`)
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

  toggleHideMonster: (monsterId: string): void => {
    set((state) => ({
      monsters: state.monsters.map((monster) =>
        monster.id === monsterId ? { ...monster, isHidden: !monster.isHidden } : monster
      ),
    }))
  },

  setSource: (source: string | "all"): void => {
    set({ source })
  },

  highlightMonster: (monsterId: string): void => {
    set({ highlightedMonsterId: monsterId })
    setTimeout(() => set({ highlightedMonsterId: null }), 2000)
  },
})
