import type { Term } from '@/types/Term'

export type TermSlice = {
  terms: Term
  language: string
  availableLanguages: { key: string; name: string }[]
  getTerm: (key: string) => string
  setLanguage: (language: string) => Promise<void>
}

export const createTermSlice = (_set: any, get: any): TermSlice => ({
  terms: {},
  language: 'en',
  availableLanguages: [{ key: 'en', name: 'English' }],

  getTerm: (key: string) => {
    const state = get()
    const isLoading = state.isLoading
    const term = state.terms[key]

    if (!term && !isLoading) {
      return key
    }

    return term
  },

  setLanguage: async (language: string) => {
    const state = get()

    if (state.language === language) {
      return
    }

    await get().loadLanguagePack(language)
  },
})
