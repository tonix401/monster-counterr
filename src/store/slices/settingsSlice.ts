import type { Settings } from '@/types/Settings'
import { SETTING_SCHEMA } from '@/types/Settings'

export type SettingsSlice = {
  settings: Settings
  getSetting: (key: keyof Settings) => boolean
  getSettingName: (key: keyof Settings) => string
  setSetting: (key: keyof Settings, value: boolean) => void
}

export const createSettingsSlice = (set: any, get: any): SettingsSlice => ({
  settings: {
    showStatus: SETTING_SCHEMA.showStatus.default,
    showHealth: SETTING_SCHEMA.showHealth.default,
    showConditions: SETTING_SCHEMA.showConditions.default,
    showChangeHp: SETTING_SCHEMA.showChangeHp.default,
    autoRemoveDead: SETTING_SCHEMA.autoRemoveDead.default,
    showXpCounter: SETTING_SCHEMA.showXpCounter.default,
    showQuickActions: SETTING_SCHEMA.showQuickActions.default,
  },

  getSetting: (key: keyof Settings) => {
    return get().settings[key]
  },

  getSettingName: (key: keyof Settings) => {
    if (!(key in SETTING_SCHEMA)) {
      throw new Error(`Setting "${key}" does not exist.`)
    }
    return SETTING_SCHEMA[key].name
  },

  setSetting: (key: keyof Settings, value: boolean) => {
    set((state: any) => ({
      settings: { ...state.settings, [key]: value },
    }))
  },
})
