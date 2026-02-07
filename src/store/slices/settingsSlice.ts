import type { StateCreator } from 'zustand'
import type { Settings } from '@/types/Settings'
import { SETTING_SCHEMA } from '@/types/Settings'

export type SettingsSlice = {
  settings: Settings
  getSetting: (key: keyof Settings) => boolean | string | null
  getSettingName: (key: keyof Settings) => string
  setSetting: (key: keyof Settings, value: boolean | string | null) => void
}

export const createSettingsSlice: StateCreator<SettingsSlice, [], [], SettingsSlice> = (
  set,
  get
) => ({
  settings: {
    showStatus: SETTING_SCHEMA.showStatus.default,
    showHealth: SETTING_SCHEMA.showHealth.default,
    showConditions: SETTING_SCHEMA.showConditions.default,
    showChangeHp: SETTING_SCHEMA.showChangeHp.default,
    autoRemoveDead: SETTING_SCHEMA.autoRemoveDead.default,
    showXpCounter: SETTING_SCHEMA.showXpCounter.default,
    showQuickActions: SETTING_SCHEMA.showQuickActions.default,
  },

  getSetting: (key: keyof Settings): boolean | string | null => {
    return get().settings[key]
  },

  getSettingName: (key: keyof Settings): string => {
    if (!(key in SETTING_SCHEMA)) {
      throw new Error(`Setting "${key}" does not exist.`)
    }
    return SETTING_SCHEMA[key].name
  },

  setSetting: (key: keyof Settings, value: boolean | string | null): void => {
    set((state) => ({
      settings: { ...state.settings, [key]: value },
    }))
  },
})
