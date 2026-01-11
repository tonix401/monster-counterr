export type XpSlice = {
  xp: number;
  updateXp: (amount: number) => void;
  resetXp: () => void;
}

export const createXpSlice = (set: any): XpSlice => ({
  xp: 0,

  updateXp: (amount: number) => {
    set((state: any) => ({ xp: state.xp + amount }));
  },

  resetXp: () => {
    set({ xp: 0 });
  },
});
