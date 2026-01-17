import type { Monster } from '@/types/Monster'
import { MonsterClass } from '@/types/Monster'

export type MonsterSlice = {
  monsters: Monster[]
  addMonster: (name: string, hp: number, amount?: number) => Monster[]
  removeMonster: (monsterId: string) => void
  removeDead: () => void
  clearMonsters: () => void
  updateMonsterHealth: (
    monsterId: string,
    amount: number,
    onDeath?: (monster: Monster) => void
  ) => void
  addMonsterCondition: (monsterId: string, condition: string) => void
  removeMonsterCondition: (monsterId: string, condition: string) => void
}

export const createMonsterSlice = (set: any, get: any): MonsterSlice => ({
  monsters: [],

  addMonster: (name: string, hp: number, amount: number = 1) => {
    const newMonsters: Monster[] = []
    const detailIndex = name.toLowerCase().trim().replace(/\s+/g, '-')

    if (amount === 1) {
      newMonsters.push(new MonsterClass(name, hp, detailIndex, 0))
    } else {
      for (let i = 0; i < amount; i++) {
        newMonsters.push(new MonsterClass(name, hp, detailIndex, i + 1))
      }
    }

    set((state: any) => ({
      monsters: [...state.monsters, ...newMonsters],
    }))
    return newMonsters
  },

  removeMonster: (monsterId: string) => {
    set((state: any) => ({
      monsters: state.monsters.filter((monster: Monster) => monster.id !== monsterId),
    }))
  },

  removeDead: () => {
    set((state: any) => ({
      monsters: state.monsters.filter((monster: Monster) => monster.hp > 0),
    }))
  },

  clearMonsters: () => {
    set({ monsters: [] })
  },

  updateMonsterHealth: (
    monsterId: string,
    amount: number,
    onDeath?: (monster: Monster) => void
  ) => {
    const { settings } = get()
    set((state: any) => {
      const monsters = state.monsters
        .map((monster: Monster) => {
          if (monster.id === monsterId) {
            const newHp = Math.max(0, monster.hp + amount)
            const updatedMonster = { ...monster, hp: newHp }

            // Handle death
            if (newHp === 0 && !monster.hasDiedAlready) {
              updatedMonster.hasDiedAlready = true
              if (onDeath) {
                onDeath(updatedMonster)
              }

              // Auto remove if setting is enabled
              if (settings.autoRemoveDead) {
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

  addMonsterCondition: (monsterId: string, condition: string) => {
    set((state: any) => ({
      monsters: state.monsters.map((monster: Monster) =>
        monster.id === monsterId && !monster.conditions.includes(condition)
          ? {
              ...monster,
              conditions: [...monster.conditions, condition],
            }
          : monster
      ),
    }))
  },

  removeMonsterCondition: (monsterId: string, condition: string) => {
    set((state: any) => ({
      monsters: state.monsters.map((monster: Monster) =>
        monster.id === monsterId
          ? {
              ...monster,
              conditions: monster.conditions.filter((c) => c !== condition),
            }
          : monster
      ),
    }))
  },
})
