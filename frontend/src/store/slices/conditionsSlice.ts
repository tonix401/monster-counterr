import { CONDITIONS } from '@/constants'

export type ConditionsSlice = {
  conditions: string[]
  addCondition: (condition: string) => void
  removeCondition: (condition: string) => void
  resetConditions: () => void
}

export const createConditionsSlice = (set: any): ConditionsSlice => ({
  conditions: [...CONDITIONS],
  addCondition: (condition: string) => {
    set((state: any) => ({ conditions: [...state.conditions, condition] }))
  },
  removeCondition: (condition: string) => {
    set((state: any) => ({
      conditions: state.conditions.filter((c: string) => c !== condition),
    }))
  },
  resetConditions: () => {
    set({ conditions: CONDITIONS })
  },
})
