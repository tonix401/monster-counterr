import type { StateCreator } from 'zustand'
import { CONDITIONS } from '@/constants'

export type ConditionsSlice = {
  conditions: string[]
  addCondition: (condition: string) => void
  removeCondition: (condition: string) => void
  resetConditions: () => void
}

export const createConditionsSlice: StateCreator<ConditionsSlice, [], [], ConditionsSlice> = (
  set
) => ({
  conditions: [...CONDITIONS],

  addCondition: (condition: string): void => {
    set((state) => ({ conditions: [...state.conditions, condition] }))
  },

  removeCondition: (condition: string): void => {
    set((state) => ({
      conditions: state.conditions.filter((c) => c !== condition),
    }))
  },

  resetConditions: (): void => {
    set({ conditions: [...CONDITIONS] })
  },
})
