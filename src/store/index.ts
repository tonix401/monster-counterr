import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Monster } from '@/types/Monster'
import { createMonsterSlice, type MonsterSlice } from '@/store/slices/monsterSlice'
import { createSettingsSlice, type SettingsSlice } from '@/store/slices/settingsSlice'
import { createInfoSlice, type InfoSlice } from '@/store/slices/infoSlice'
import { createXpSlice, type XpSlice } from '@/store/slices/xpSlice'
import {
  createDataManagementSlice,
  type DataManagementSlice,
} from '@/store/slices/dataManagementSlice'
import { temporal, type TemporalState, type TemporalActions } from '@/store/middleware/temporal'
import { STORAGE_KEYS, ANIMATION_DURATION, ASSETS_URL } from '@/constants'
import { createConditionsSlice, type ConditionsSlice } from './slices/conditionsSlice'
import { createTermSlice, type TermSlice } from './slices/termSlice'

type MonsterCounterCoreState = MonsterSlice &
  SettingsSlice &
  InfoSlice &
  XpSlice &
  DataManagementSlice &
  ConditionsSlice &
  TermSlice & {
    isLoading: boolean

    // Complex Actions
    killMonster: (monsterId: string) => void
    killAllMonsters: () => void
    getOnDeathCallback: () => (monster: Monster) => void

    // Initialization
    initialize: () => Promise<void>
    setLoading: (loading: boolean) => void
    loadLanguagePack: (language: string) => Promise<void>
  }

type MonsterCounterState = MonsterCounterCoreState & TemporalState<any> & TemporalActions

export const useMonsterStore = create<MonsterCounterState>()(
  persist(
    temporal(
      (set, get) =>
        ({
          // Initial State
          isLoading: false,

          // Slices
          ...createMonsterSlice(set, get),
          ...createSettingsSlice(set, get),
          ...createInfoSlice(set, get),
          ...createXpSlice(set),
          ...createDataManagementSlice(set, get),
          ...createConditionsSlice(set),
          ...createTermSlice(set, get),

          // Complex Actions (combine multiple slices)
          killMonster: (monsterId: string) => {
            const state = get()
            const monster = state.monsters.find((m: Monster) => m.id === monsterId)
            if (!monster) return

            const onDeath = (deadMonster: Monster) => {
              const details = state.monsterDetails[deadMonster.detailIndex]
              if (details) {
                state.updateXp(details.xp)
              }
            }

            state.updateMonsterHealth(monsterId, -monster.hp, onDeath)
          },

          getOnDeathCallback: () => {
            const state = get()
            return (deadMonster: Monster) => {
              const details = state.monsterDetails[deadMonster.detailIndex]
              if (details) {
                state.updateXp(details.xp)
              }
            }
          },

          killAllMonsters: () => {
            const state = get()
            const monsters = state.monsters
            const killMonster = state.killMonster
            const length = monsters.length

            monsters.forEach((monster: Monster, index: number): void => {
              const delay: number =
                length > 5 ? Math.round((index * ANIMATION_DURATION.KILL_ALL_DELAY) / length) : 0
              setTimeout((): void => {
                killMonster(monster.id)
              }, delay)
            })
          },

          // Initialization
          initialize: async () => {
            set({ isLoading: true })
            await get().loadAvailableLanguages()
            await get().loadLanguagePack(get().language)
            set({ isLoading: false })
            get().updateMonsterIndex()
          },

          loadLanguagePack: async (language: string) => {
            try {
              const response = await fetch(`${ASSETS_URL}/locales/${language}.json`)

              if (!response.ok) {
                throw new Error(
                  `Failed to load language pack for "${language}", ${response.status} ${response.statusText}`
                )
              }

              const languagePack = await response.json()

              set((state: any) => ({
                ...state,
                terms: languagePack.terms,
                language: languagePack.lang,
              }))
            } catch (error) {
              console.error(`Error loading language pack for "${language}":`, error)
              console.warn(`Falling back to term keys for display.`)
            }
          },
          loadAvailableLanguages: async () => {
            try {
              const response = await fetch(`${ASSETS_URL}/locales/locales.json`)

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
                availableLanguages: ['en'],
              }))
            }
          }
        }) as any,
      {
        limit: 50,
        partialize: (state: any) => ({
          monsters: state.monsters,
          settings: state.settings,
          xp: state.xp,
        }),
      }
    ),
    {
      name: STORAGE_KEYS.MONSTER_COUNTER,
      partialize: (state) => ({
        monsters: state.monsters,
        monsterDetails: state.monsterDetails,
        monsterIndex: state.monsterIndex,
        settings: state.settings,
        language: state.language,
        xp: state.xp,
      }),
    }
  )
)

// Selectors for optimized subscriptions
export const useMonsters = () => useMonsterStore((state) => state.monsters)
export const useSettings = () => useMonsterStore((state) => state.settings)
export const useXp = () => useMonsterStore((state) => state.xp)
export const useIsLoading = () => useMonsterStore((state) => state.isLoading)
export const useCanUndo = () => useMonsterStore((state) => state.canUndo())
export const useCanRedo = () => useMonsterStore((state) => state.canRedo())
export const useConditions = () => useMonsterStore((state) => state.conditions)
export const useLanguage = () => useMonsterStore((state) => state.language)
export const useSetLanguage = () => useMonsterStore((state) => state.setLanguage)
export const useLoadLanguagePack = () => useMonsterStore((state) => state.loadLanguagePack)
export const useAvailableLanguages = () => useMonsterStore((state) => state.availableLanguages)
