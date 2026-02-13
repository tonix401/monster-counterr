import { BASE_URL } from '@/constants'
import type { Term, LanguagePack } from '@/types/Term'

/**
 * Localization helpers - Pure functions for testability
 */

/**
 * Resolve a term with optional parameter substitution
 */
export function resolveTerm(
  termKey: string,
  terms: Term,
  params?: Record<string, string | number>
): string {
  const term = terms[termKey]

  if (!term) {
    return termKey
  }

  if (params) {
    return Object.keys(params).reduce((acc, paramKey) => {
      const paramValue = params[paramKey]
      return acc.replace(`{${paramKey}}`, String(paramValue))
    }, term)
  }

  return term
}

/**
 * Fetch language pack from server
 */
export async function fetchLanguagePack(language: string): Promise<LanguagePack | null> {
  try {
    const response = await fetch(`${BASE_URL}/locales/${language}.json`)

    if (!response.ok) {
      throw new Error(
        `Failed to load language pack for "${language}", ${response.status} ${response.statusText}`
      )
    }

    const languagePack = await response.json()
    return languagePack as LanguagePack
  } catch (error) {
    console.error(`Error loading language pack for "${language}":`, error)
    console.warn(`Falling back to term keys for display.`)
    return null
  }
}

/**
 * Fetch available languages list
 */
export async function fetchAvailableLanguages(): Promise<{ key: string; name: string }[]> {
  try {
    const response = await fetch(`${BASE_URL}/locales/locales.json`)

    if (!response.ok) {
      throw new Error(
        `Failed to load available languages, ${response.status} ${response.statusText}`
      )
    }

    const availableLanguages = await response.json()
    return availableLanguages as { key: string; name: string }[]
  } catch (error) {
    console.error('Error loading available languages:', error)
    return [{ key: 'en', name: 'English' }]
  }
}
