import { describe, it, expect, beforeEach, vi } from 'vitest'
import { resolveTerm, fetchLanguagePack, fetchAvailableLanguages } from './localizationHelpers'
import type { Term, LanguagePack } from '@/types/Term'
import { BASE_URL } from '@/constants'

describe('localizationHelpers', () => {
  describe('resolveTerm', () => {
    const mockTerms: Term = {
      hello: 'Hello',
      welcome: 'Welcome to Monster Counter',
      damage: 'Damage: {amount}',
      levelUp: '{name} reached level {level}',
    }

    it('should return term value for existing key', () => {
      const result = resolveTerm('hello', mockTerms)

      expect(result).toBe('Hello')
    })

    it('should return term key if not found', () => {
      const result = resolveTerm('nonexistent', mockTerms)

      expect(result).toBe('nonexistent')
    })

    it('should substitute single parameter', () => {
      const result = resolveTerm('damage', mockTerms, { amount: 5 })

      expect(result).toBe('Damage: 5')
    })

    it('should substitute multiple parameters', () => {
      const result = resolveTerm('levelUp', mockTerms, { name: 'Gandalf', level: 20 })

      expect(result).toBe('Gandalf reached level 20')
    })

    it('should convert numeric parameters to string', () => {
      const result = resolveTerm('damage', mockTerms, { amount: 42 })

      expect(result).toBe('Damage: 42')
    })

    it('should handle missing parameters gracefully', () => {
      const result = resolveTerm('damage', mockTerms, { wrongKey: 100 })

      expect(result).toBe('Damage: {amount}')
    })

    it('should handle partial parameter substitution', () => {
      const result = resolveTerm('levelUp', mockTerms, { name: 'Wizard' })

      expect(result).toBe('Wizard reached level {level}')
    })

    it('should handle empty params object', () => {
      const result = resolveTerm('hello', mockTerms, {})

      expect(result).toBe('Hello')
    })

    it('should not substitute if no params provided', () => {
      const result = resolveTerm('damage', mockTerms)

      expect(result).toBe('Damage: {amount}')
    })

    it('should handle term with no parameters', () => {
      const result = resolveTerm('hello', mockTerms, { unused: 'value' })

      expect(result).toBe('Hello')
    })

    it('should be case-sensitive', () => {
      const result = resolveTerm('Hello', mockTerms)

      expect(result).toBe('Hello')
    })

    it('should handle empty terms object', () => {
      const result = resolveTerm('anything', {})

      expect(result).toBe('anything')
    })

    it('should preserve parameter placeholder format', () => {
      const customTerms: Term = {
        template: 'Value is {value}',
      }
      const result = resolveTerm('template', customTerms, {})

      expect(result).toBe('Value is {value}')
    })

    it('should handle parameter with special characters', () => {
      const result = resolveTerm('damage', mockTerms, { amount: 'a lot' })

      expect(result).toBe('Damage: a lot')
    })
  })

  describe('fetchLanguagePack', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('should fetch language pack successfully', async () => {
      const mockLanguagePack: LanguagePack = {
        lang: 'en',
        terms: {
          hello: 'Hello',
          goodbye: 'Goodbye',
        },
      }

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockLanguagePack),
      } as any)

      const result = await fetchLanguagePack('en')

      expect(result).toEqual(mockLanguagePack)
      expect(global.fetch).toHaveBeenCalledWith(`${BASE_URL}/locales/en.json`)
    })

    it('should return null on fetch failure', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as any)

      const result = await fetchLanguagePack('invalid')

      expect(result).toBeNull()
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })

    it('should handle network error', async () => {
      const consolidateSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      const result = await fetchLanguagePack('en')

      expect(result).toBeNull()
      expect(consolidateSpy).toHaveBeenCalled()

      consolidateSpy.mockRestore()
    })

    it('should fetch German language pack', async () => {
      const mockLanguagePack: LanguagePack = {
        lang: 'de',
        terms: { hello: 'Hallo' },
      }

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockLanguagePack),
      } as any)

      await fetchLanguagePack('de')

      expect(global.fetch).toHaveBeenCalledWith(`${BASE_URL}/locales/de.json`)
    })

    it('should fetch Spanish language pack', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({}),
      } as any)

      await fetchLanguagePack('es')

      expect(global.fetch).toHaveBeenCalledWith(`${BASE_URL}/locales/es.json`)
    })

    it('should warn on error', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as any)

      await fetchLanguagePack('en')

      expect(consoleSpy).toHaveBeenCalledWith('Falling back to term keys for display.')

      consoleSpy.mockRestore()
    })
  })

  describe('fetchAvailableLanguages', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('should fetch available languages successfully', async () => {
      const mockLanguages = [
        { key: 'en', name: 'English' },
        { key: 'de', name: 'German' },
        { key: 'es', name: 'Spanish' },
      ]

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockLanguages),
      } as any)

      const result = await fetchAvailableLanguages()

      expect(result).toEqual(mockLanguages)
      expect(global.fetch).toHaveBeenCalledWith(`${BASE_URL}/locales/locales.json`)
    })

    it('should return default English on failure', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as any)

      const result = await fetchAvailableLanguages()

      expect(result).toEqual([{ key: 'en', name: 'English' }])
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })

    it('should handle network error and return default', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      const result = await fetchAvailableLanguages()

      expect(result).toEqual([{ key: 'en', name: 'English' }])
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })

    it('should return array of language objects', async () => {
      const mockLanguages = [
        { key: 'en', name: 'English' },
        { key: 'fr', name: 'Français' },
      ]

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockLanguages),
      } as any)

      const result = await fetchAvailableLanguages()

      expect(Array.isArray(result)).toBe(true)
      expect(result[0]).toHaveProperty('key')
      expect(result[0]).toHaveProperty('name')
    })

    it('should handle 500 error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as any)

      const result = await fetchAvailableLanguages()

      expect(result).toEqual([{ key: 'en', name: 'English' }])

      consoleSpy.mockRestore()
    })
  })
})
