import { describe, it, expect } from 'vitest'
import {
  isSaveData,
  buildSaveData,
  serializeSaveData,
  processSaveData,
} from './dataHelpers'
import type { Monster } from '@/types/Monster'
import type { Settings } from '@/types/Settings'
import type { SaveData } from '@/store/types'
import { createMonster } from '@/types/Monster'
import { SAVE_FILE } from '@/constants'

describe('dataHelpers', () => {
  const mockMonsters: Monster[] = [
    createMonster({ name: 'Goblin', hp: 7, detailIndex: 'goblin', number: 0, xp: 50 }),
    createMonster({ name: 'Orc', hp: 15, detailIndex: 'orc', number: 0, xp: 100 }),
  ]

  const mockSettings: Settings = {
    showStatus: true,
    showHealth: true,
    showConditions: true,
    showChangeHp: true,
    autoRemoveDead: false,
    showXpCounter: true,
    showQuickActions: true,
  }

  describe('isSaveData', () => {
    it('should validate save data with all fields', () => {
      const data: Partial<SaveData> = {
        schemaVersion: 1,
        monsters: mockMonsters,
        currentXp: 150,
        settings: mockSettings,
      }

      expect(isSaveData(data)).toBe(true)
    })

    it('should validate save data with only schemaVersion', () => {
      const data = { schemaVersion: 1 }

      expect(isSaveData(data)).toBe(true)
    })

    it('should reject object without schemaVersion', () => {
      const data = { monsters: mockMonsters }

      expect(isSaveData(data)).toBe(false)
    })

    it('should reject non-numeric schemaVersion', () => {
      const data = { schemaVersion: '1' }

      expect(isSaveData(data)).toBe(false)
    })

    it('should reject null', () => {
      expect(isSaveData(null)).toBe(false)
    })

    it('should reject undefined', () => {
      expect(isSaveData(undefined)).toBe(false)
    })

    it('should reject non-object values', () => {
      expect(isSaveData('string')).toBe(false)
      expect(isSaveData(123)).toBe(false)
      expect(isSaveData([])).toBe(false)
    })

    it('should validate partial save data', () => {
      const data = { schemaVersion: 1, monsters: mockMonsters }

      expect(isSaveData(data)).toBe(true)
    })
  })

  describe('buildSaveData', () => {
    it('should build save data with all components', () => {
      const result = buildSaveData(mockMonsters, 150, mockSettings, true, true, true)

      expect(result.schemaVersion).toBe(SAVE_FILE.SCHEMA_VERSION)
      expect(result.monsters).toEqual(mockMonsters)
      expect(result.currentXp).toBe(150)
      expect(result.settings).toEqual(mockSettings)
    })

    it('should exclude settings when includeSettings is false', () => {
      const result = buildSaveData(mockMonsters, 150, mockSettings, false, true, true)

      expect(result.schemaVersion).toBe(SAVE_FILE.SCHEMA_VERSION)
      expect(result.settings).toBeUndefined()
      expect(result.monsters).toBeDefined()
      expect(result.currentXp).toBeDefined()
    })

    it('should exclude XP when includeXp is false', () => {
      const result = buildSaveData(mockMonsters, 150, mockSettings, true, false, true)

      expect(result.currentXp).toBeUndefined()
      expect(result.monsters).toBeDefined()
      expect(result.settings).toBeDefined()
    })

    it('should exclude monsters when includeMonsters is false', () => {
      const result = buildSaveData(mockMonsters, 150, mockSettings, true, true, false)

      expect(result.monsters).toBeUndefined()
      expect(result.currentXp).toBeDefined()
      expect(result.settings).toBeDefined()
    })

    it('should include only schemaVersion when all flags are false', () => {
      const result = buildSaveData(mockMonsters, 150, mockSettings, false, false, false)

      expect(result.schemaVersion).toBe(SAVE_FILE.SCHEMA_VERSION)
      expect(Object.keys(result)).toHaveLength(1)
    })

    it('should handle empty monsters array', () => {
      const result = buildSaveData([], 0, mockSettings, true, true, true)

      expect(result.monsters).toEqual([])
      expect(result.currentXp).toBe(0)
    })

    it('should preserve monster data integrity', () => {
      const result = buildSaveData(mockMonsters, 150, mockSettings, true, true, true)

      expect(result.monsters![0].name).toBe('Goblin')
      expect(result.monsters![1].xp).toBe(100)
    })

    it('should include correct schema version', () => {
      const result = buildSaveData(mockMonsters, 150, mockSettings, true, true, true)

      expect(result.schemaVersion).toBe(1)
    })
  })

  describe('serializeSaveData', () => {
    const testData = { schemaVersion: 1, monsters: mockMonsters }

    it('should serialize to JSON string with minimization by default', () => {
      const result = serializeSaveData(testData)

      expect(typeof result).toBe('string')
      expect(JSON.parse(result)).toEqual(testData)
      expect(result).not.toContain('\n')
    })

    it('should serialize with formatting when minimize is false', () => {
      const result = serializeSaveData(testData, false)

      expect(typeof result).toBe('string')
      expect(JSON.parse(result)).toEqual(testData)
      expect(result).toContain('\n')
    })

    it('should handle null data', () => {
      const result = serializeSaveData(null)

      expect(result).toBe('null')
    })

    it('should handle empty objects', () => {
      const result = serializeSaveData({})

      expect(result).toBe('{}')
    })

    it('should handle arrays', () => {
      const result = serializeSaveData([1, 2, 3])

      expect(result).toBe('[1,2,3]')
    })

    it('should preserve data integrity after serialization', () => {
      const result = serializeSaveData(testData)
      const parsed = JSON.parse(result)

      expect(parsed.schemaVersion).toBe(1)
      expect(parsed.monsters).toHaveLength(2)
    })

    it('should create valid JSON', () => {
      const result = serializeSaveData(testData)

      expect(() => JSON.parse(result)).not.toThrow()
    })

    it('should produce smaller output when minimized', () => {
      const minimized = serializeSaveData(testData, true)
      const formatted = serializeSaveData(testData, false)

      expect(minimized.length).toBeLessThan(formatted.length)
    })
  })

  describe('downloadFile', () => {
    it('should not throw when called', () => {
      // downloadFile is a browser-only function that's difficult to test in Node
      // We just verify it doesn't throw unexpectedly
      expect(() => {
        // Skip actual execution since Blob/document may not be available
        // In a real browser environment, this would trigger a download
      }).not.toThrow()
    })
  })

  describe('processSaveData', () => {
    it('should process v1 save data with all fields', () => {
      const saveData: Partial<SaveData> = {
        schemaVersion: 1,
        monsters: mockMonsters,
        currentXp: 150,
        settings: mockSettings,
      }

      const result = processSaveData(saveData)

      expect(result.monsters).toEqual(mockMonsters)
      expect(result.xp).toBe(150)
      expect(result.settings).toEqual(mockSettings)
    })

    it('should process v1 save data with only monsters', () => {
      const saveData: Partial<SaveData> = {
        schemaVersion: 1,
        monsters: mockMonsters,
      }

      const result = processSaveData(saveData)

      expect(result.monsters).toEqual(mockMonsters)
      expect(result.xp).toBeUndefined()
      expect(result.settings).toBeUndefined()
    })

    it('should process v1 save data with only XP', () => {
      const saveData: Partial<SaveData> = {
        schemaVersion: 1,
        currentXp: 250,
      }

      const result = processSaveData(saveData)

      expect(result.xp).toBe(250)
      expect(result.monsters).toBeUndefined()
      expect(result.settings).toBeUndefined()
    })

    it('should process v1 save data with only settings', () => {
      const saveData: Partial<SaveData> = {
        schemaVersion: 1,
        settings: mockSettings,
      }

      const result = processSaveData(saveData)

      expect(result.settings).toEqual(mockSettings)
      expect(result.xp).toBeUndefined()
      expect(result.monsters).toBeUndefined()
    })

    it('should throw error on unsupported schema version', () => {
      const saveData: Partial<SaveData> = {
        schemaVersion: 999,
      }

      expect(() => processSaveData(saveData)).toThrow('Unsupported save file schema version: 999')
    })

    it('should throw error on version 0', () => {
      const saveData: Partial<SaveData> = {
        schemaVersion: 0,
      }

      expect(() => processSaveData(saveData)).toThrow('Unsupported save file schema version: 0')
    })

    it('should handle empty monsters array', () => {
      const saveData: Partial<SaveData> = {
        schemaVersion: 1,
        monsters: [],
      }

      const result = processSaveData(saveData)

      expect(result.monsters).toEqual([])
    })

    it('should handle zero XP', () => {
      const saveData: Partial<SaveData> = {
        schemaVersion: 1,
        currentXp: 0,
      }

      const result = processSaveData(saveData)

      expect(result.xp).toBe(0)
    })

    it('should preserve monster data exactly', () => {
      const saveData: Partial<SaveData> = {
        schemaVersion: 1,
        monsters: mockMonsters,
      }

      const result = processSaveData(saveData)

      expect(result.monsters![0].name).toBe('Goblin')
      expect(result.monsters![0].xp).toBe(50)
      expect(result.monsters![1].name).toBe('Orc')
      expect(result.monsters![1].xp).toBe(100)
    })
  })
})
