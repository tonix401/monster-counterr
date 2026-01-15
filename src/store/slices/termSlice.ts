import type { Term } from "@/types/Term"
import { TERMS } from "@/constants/terms"

export type TermSlice = {
  terms: {
    [key: string]: Term
  },
  language: keyof Term,
  getTerm: (key: string) => Term | undefined,
  setLanguage: (language: keyof Term) => void,
}

export const createTermSlice = (get: any, set: any): TermSlice => ({
    terms: TERMS,
    language: 'en',
    getTerm: (key: string) => {
      const terms = get().terms
      const term = terms[key]
      if (!term) {
        throw new Error(`Term with key "${key}" not found.`)
      }
      return term
    },
    setLanguage: (language: keyof Term) => {
      set((state: TermSlice) => ({
        ...state,
        language,
      }))
    }
})