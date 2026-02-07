import type { StateCreator } from 'zustand'

export type XpSlice = {
  xp: number
  updateXp: (amount: number) => void
  resetXp: () => void
}

export const createXpSlice: StateCreator<XpSlice, [], [], XpSlice> = (set) => ({
  xp: 0,

  updateXp: (amount: number): void => {
    set((state) => ({ xp: state.xp + amount }))
  },

  resetXp: (): void => {
    set({ xp: 0 })
  },
})
