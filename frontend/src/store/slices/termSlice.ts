import type { Term } from '@/types/Term'

export type TermSlice = {
  terms: Term
  language: string
  availableLanguages: string[]
  getTerm: (key: string) => string
  setLanguage: (language: string) => Promise<void>
  addLanguage: (language: string) => void
}

export const createTermSlice = (set: any, get: any): TermSlice => ({
  terms: {},
  language: 'en',
  availableLanguages: ['en'],

  getTerm: (key: string) => {
    const state = get()
    const isLoading = state.isLoading
    const term = state.terms[key]

    if (!term && !isLoading) {
      console.warn(
        `Term with key "${key}" not found in language "${state.language}". Displaying key instead.`
      )
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
  addLanguage: (language: string) => {
    const state = get()
    if (!state.availableLanguages.includes(language)) {
      set({
        availableLanguages: [...state.availableLanguages, language],
      })
    }
  }
})
