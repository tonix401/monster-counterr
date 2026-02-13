import type { Monster } from '@/types/Monster'
import type { Settings } from '@/types/Settings'
import type { SaveData } from '@/store/types'
import { SAVE_FILE } from '@/constants'

/**
 * Data import/export helpers - Pure functions for testability
 */

/**
 * Type guard for SaveData
 */
export function isSaveData(data: unknown): data is Partial<SaveData> {
  if (typeof data !== 'object' || data === null) return false
  const d = data as Partial<SaveData>
  // Only require schemaVersion for partial import
  return typeof d.schemaVersion === 'number'
}

/**
 * Build save data object based on export settings
 */
export function buildSaveData(
  monsters: Monster[],
  xp: number,
  settings: Settings,
  includeSettings: boolean,
  includeXp: boolean,
  includeMonsters: boolean
): Partial<SaveData> {
  const data: Partial<SaveData> = {
    schemaVersion: SAVE_FILE.SCHEMA_VERSION,
    ...(includeSettings ? { settings } : {}),
    ...(includeXp ? { currentXp: xp } : {}),
    ...(includeMonsters ? { monsters } : {}),
  }
  return data
}

/**
 * Convert save data to JSON string
 */
export function serializeSaveData(data: unknown, minimize: boolean = true): string {
  return minimize ? JSON.stringify(data) : JSON.stringify(data, null, 2)
}

/**
 * Trigger file download
 */
export function downloadFile(content: string, filename: string = SAVE_FILE.FILENAME): void {
  const blob = new Blob([content], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

/**
 * Process imported save data based on schema version
 */
export function processSaveData(data: Partial<SaveData>): {
  monsters?: Monster[]
  xp?: number
  settings?: Settings
} {
  const result: { monsters?: Monster[]; xp?: number; settings?: Settings } = {}

  switch (data.schemaVersion) {
    case 1: {
      if ('monsters' in data) result.monsters = data.monsters
      if ('currentXp' in data) result.xp = data.currentXp
      if ('settings' in data) result.settings = data.settings
      break
    }
    default:
      throw new Error(`Unsupported save file schema version: ${data.schemaVersion}`)
  }

  return result
}
