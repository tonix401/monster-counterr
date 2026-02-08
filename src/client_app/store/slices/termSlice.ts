import type { StateCreator } from 'zustand'
import type { Term } from '@/types/Term'
import { BASE_URL } from '@/constants'
import type { ClientStore } from '../ClientStore'

export type TermSlice = {
  terms: Term
  language: string
  availableLanguages: { key: string; name: string }[]
  getTerm: (key: string) => string
  setLanguage: (language: string) => Promise<void>
  loadLanguagePack: (language: string) => Promise<void>
  loadAvailableLanguages: () => Promise<void>
}

export const createTermSlice: StateCreator<ClientStore, [], [], TermSlice> = (set, get) => ({
  terms: {},
  language: 'en',
  availableLanguages: [{ key: 'en', name: 'English' }],
  isLoading: false,

  // Actions
  getTerm: (key: string): string => {
    const state = get()
    const term = state.terms[key]

    if (!term && !state.isLoading) {
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

  loadLanguagePack: async (language: string): Promise<void> => {
    try {
      const response = await fetch(`${BASE_URL}/locales/${language}.json`)

      if (!response.ok) {
        throw new Error(
          `Failed to load language pack for "${language}", ${response.status} ${response.statusText}`
        )
      }

      const languagePack = await response.json()

      set(() => ({
        terms: languagePack.terms,
        language: languagePack.lang,
      }))
    } catch (error) {
      console.error(`Error loading language pack for "${language}":`, error)
      console.warn(`Falling back to term keys for display.`)
    }
  },

  loadAvailableLanguages: async (): Promise<void> => {
    try {
      const response = await fetch(`${BASE_URL}/locales/locales.json`)

      if (!response.ok) {
        throw new Error(
          `Failed to load available languages, ${response.status} ${response.statusText}`
        )
      }

      const availableLanguages = await response.json()

      set(() => ({
        availableLanguages,
      }))
    } catch (error) {
      console.error('Error loading available languages:', error)
      set(() => ({
        availableLanguages: [{ key: 'en', name: 'English' }],
      }))
    }
  },
})
