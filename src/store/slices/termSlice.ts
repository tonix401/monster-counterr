import type { StateCreator } from 'zustand'
import type { Term } from '@/types/Term'

export type TermSlice = {
  terms: Term
  language: string
  availableLanguages: { key: string; name: string }[]
  getTerm: (key: string) => string
  setLanguage: (language: string) => Promise<void>
  loadLanguagePack: (language: string) => Promise<void>
  loadAvailableLanguages: () => Promise<void>
}

export const createTermSlice: StateCreator<
  TermSlice & { isLoading: boolean },
  [],
  [],
  TermSlice
> = (_set, get) => ({
  terms: {},
  language: 'en',
  availableLanguages: [{ key: 'en', name: 'English' }],

  getTerm: (key: string): string => {
    const state = get()
    const isLoading = state.isLoading
    const term = state.terms[key]

    if (!term && !isLoading) {
      return key
    }

    return term
  },

  setLanguage: async (language: string): Promise<void> => {
    const state = get()

    if (state.language === language) {
      return
    }

    await get().loadLanguagePack(language)
  },

  loadLanguagePack: async (_language: string): Promise<void> => {
    // Implementation provided by store/index.ts
  },

  loadAvailableLanguages: async (): Promise<void> => {
    // Implementation provided by store/index.ts
  },
})
