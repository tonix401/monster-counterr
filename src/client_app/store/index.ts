import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Term } from '@/types/Term'
import { BASE_URL } from '@/constants'

type ClientStoreState = {
  terms: Term
  language: string
  availableLanguages: { key: string; name: string }[]
  isLoading: boolean

  // Actions
  getTerm: (key: string) => string
  setLanguage: (language: string) => Promise<void>
  loadLanguagePack: (language: string) => Promise<void>
  loadAvailableLanguages: () => Promise<void>
  initialize: () => Promise<void>
}

export const useClientStore = create<ClientStoreState>()(
  persist(
    (set, get) => ({
      // Initial State
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

      initialize: async (): Promise<void> => {
        set({ isLoading: true })
        await get().loadAvailableLanguages()
        await get().loadLanguagePack(get().language)
        set({ isLoading: false })
      },
    }),
    {
      name: 'monster-counter-client',
      partialize: (state) => ({
        language: state.language,
      }),
    }
  )
)

// Selectors
export const useClientLanguage = (): string => useClientStore((state) => state.language)
export const useClientSetLanguage = (): ((language: string) => Promise<void>) =>
  useClientStore((state) => state.setLanguage)
export const useClientAvailableLanguages = (): { key: string; name: string }[] =>
  useClientStore((state) => state.availableLanguages)
export const useClientIsLoading = (): boolean => useClientStore((state) => state.isLoading)

export const useClientTerm = (): ((key: string) => string) => {
  useClientStore((state) => state.language) // for rerenders on language change
  return useClientStore((state) => state.getTerm)
}
