import { SAVE_FILE } from '@/constants'
import type { Monster } from '@/types/Monster'
import type { Settings } from '@/types/Settings'
import type { MonsterIndex } from '@/types/MonsterDetails'

export interface SaveData {
  schemaVersion: number
  monsters: Monster[]
  currentXp: number
  settings: Settings
  monsterIndex: Record<string, MonsterIndex>
}

export interface SaveFileExportSettings {
  includeIndex: boolean
  includeDetails: boolean
  includeMonsters: boolean
  includeSettings: boolean
  includeCurrentXp: boolean
  minimizeJson: boolean
}

export type DataManagementSlice = {
  exportSettings: SaveFileExportSettings
  setExportSetting: (key: keyof SaveFileExportSettings, value: boolean) => void
  exportData: () => void
  importData: (data: unknown) => boolean
}

const isSaveData = (data: unknown): data is Partial<SaveData> => {
  if (typeof data !== 'object' || data === null) return false
  const d = data as Partial<SaveData>
  // Only require schemaVersion for partial import
  return typeof d.schemaVersion === 'number'
}

export const createDataManagementSlice = (set: any, get: any): DataManagementSlice => ({
  exportSettings: {
    includeIndex: true,
    includeDetails: true,
    includeMonsters: true,
    includeSettings: true,
    includeCurrentXp: true,
    minimizeJson: true,
  },
  setExportSetting: (key, value) =>
    set((state: any) => ({
      exportSettings: {
        ...state.exportSettings,
        [key]: value,
      },
    })),
  exportData: () => {
    const { monsters, xp, settings, exportSettings } = get()
    const data: Partial<SaveData> = {
      schemaVersion: SAVE_FILE.SCHEMA_VERSION,
      ...(exportSettings.includeSettings ? { settings } : {}),
      ...(exportSettings.includeCurrentXp ? { currentXp: xp } : {}),
      ...(exportSettings.includeMonsters ? { monsters } : {}),
    }
    const dataJson = exportSettings.minimizeJson
      ? JSON.stringify(data)
      : JSON.stringify(data, null, 2)
    const blob = new Blob([dataJson], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = SAVE_FILE.FILENAME
    link.click()
    URL.revokeObjectURL(url)
  },

  importData: (data: unknown): boolean => {


    if (!isSaveData(data)) {
      console.error('Invalid save data format')
      return false
    }

    try {
      switch (data.schemaVersion) {
        case 1: {
          const newState: any = {}
          if ('monsters' in data) newState.monsters = data.monsters
          if ('currentXp' in data) newState.xp = data.currentXp
          if ('settings' in data) newState.settings = data.settings
          set(newState)
          return true
        }
        default:
          get().notify(`Unsupported save file schema version: ${data.schemaVersion}`)
          return false
      }
    } catch (error) {
      console.error('Failed to load save file:', error)
      return false
    }
  },
})
