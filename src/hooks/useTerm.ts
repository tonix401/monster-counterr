import { useMonsterStore } from '@/store'

/**
 * Hook to get a translated term based on the current language.
 * Returns the translated string and automatically updates when language changes.
 *
 * @param key - The term key to translate
 * @returns The translated term string, or the key itself if translation is missing
 *
 * @example
 * const translated = useTerm('showQuickActions')
 * // Returns: "Show Quick Actions" (in English)
 */
export const useTerm = (key: string): string => {
  return useMonsterStore((state) => state.getTerm(key))
}
