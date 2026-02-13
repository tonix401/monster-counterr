import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  createMonsters,
  filterOutDead,
  updateMonsterHealth,
  addConditionToMonster,
  removeConditionFromMonster,
  toggleMonsterHidden,
  getMonsterStatus,
  fetchMonsterIndex,
} from './monsterHelpers'
import type { Settings } from '@/types/Settings'
import { createMonster } from '@/types/Monster'

describe('monsterHelpers', () => {
  describe('createMonsters', () => {
    it('should create single monster with number 0', () => {
      const monsters = createMonsters('Goblin', 'goblin', 7, 50)

      expect(monsters).toHaveLength(1)
      expect(monsters[0].name).toBe('Goblin')
      expect(monsters[0].hp).toBe(7)
      expect(monsters[0].maxhp).toBe(7)
      expect(monsters[0].xp).toBe(50)
      expect(monsters[0].number).toBe(0)
    })

    it('should create multiple monsters with sequential numbering', () => {
      const monsters = createMonsters('Goblin', 'goblin', 7, 50, 3)

      expect(monsters).toHaveLength(3)
      expect(monsters[0].number).toBe(1)
      expect(monsters[1].number).toBe(2)
      expect(monsters[2].number).toBe(3)
      expect(monsters[0].name).toBe('Goblin')
      expect(monsters[1].name).toBe('Goblin')
      expect(monsters[2].name).toBe('Goblin')
    })

    it('should use detailIndex property', () => {
      const monsters = createMonsters('Orc', 'orc', 15, 100, 1)

      expect(monsters[0].detailIndex).toBe('orc')
    })

    it('should handle undefined detailIndex', () => {
      const monsters = createMonsters('Custom', undefined, 20, 75, 1)

      expect(monsters[0].detailIndex).toBeUndefined()
    })

    it('should create monsters with distinct IDs', () => {
      const monsters = createMonsters('Goblin', 'goblin', 7, 50, 3)

      const ids = monsters.map((m) => m.id)
      expect(new Set(ids).size).toBe(3)
    })

    it('should initialize with empty conditions', () => {
      const monsters = createMonsters('Goblin', 'goblin', 7, 50, 1)

      expect(monsters[0].conditions).toEqual([])
    })

    it('should initialize with isHidden as true', () => {
      const monsters = createMonsters('Goblin', 'goblin', 7, 50, 1)

      expect(monsters[0].isHidden).toBe(true)
    })

    it('should initialize with hasDiedAlready as false', () => {
      const monsters = createMonsters('Goblin', 'goblin', 7, 50, 1)

      expect(monsters[0].hasDiedAlready).toBe(false)
    })

    it('should handle zero amount', () => {
      const monsters = createMonsters('Goblin', 'goblin', 7, 50, 0)

      expect(monsters).toHaveLength(0)
    })
  })

  describe('filterOutDead', () => {
    it('should keep alive monsters', () => {
      const monsters = [
        createMonster({ name: 'Goblin', hp: 7, detailIndex: 'goblin', number: 0, xp: 50 }),
        createMonster({ name: 'Orc', hp: 15, detailIndex: 'orc', number: 0, xp: 100 }),
      ]

      const result = filterOutDead(monsters)

      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('Goblin')
      expect(result[1].name).toBe('Orc')
    })

    it('should filter out dead monsters', () => {
      const alive = createMonster({
        name: 'Goblin',
        hp: 7,
        detailIndex: 'goblin',
        number: 0,
        xp: 50,
      })
      const dead = createMonster({ name: 'Orc', hp: 0, detailIndex: 'orc', number: 0, xp: 100 })

      const result = filterOutDead([alive, dead])

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Goblin')
    })

    it('should handle empty list', () => {
      const result = filterOutDead([])

      expect(result).toHaveLength(0)
    })

    it('should handle all dead monsters', () => {
      const dead1 = createMonster({
        name: 'Goblin',
        hp: 0,
        detailIndex: 'goblin',
        number: 0,
        xp: 50,
      })
      const dead2 = createMonster({ name: 'Orc', hp: 0, detailIndex: 'orc', number: 0, xp: 100 })

      const result = filterOutDead([dead1, dead2])

      expect(result).toHaveLength(0)
    })

    it('should not filter monsters with hp > 0', () => {
      const monster = createMonster({
        name: 'Goblin',
        hp: 1,
        detailIndex: 'goblin',
        number: 0,
        xp: 50,
      })

      const result = filterOutDead([monster])

      expect(result).toHaveLength(1)
    })
  })

  describe('updateMonsterHealth', () => {
    const mockSettings: Settings = {
      showStatus: true,
      showHealth: true,
      showConditions: true,
      showChangeHp: true,
      autoRemoveDead: false,
      showXpCounter: true,
      showQuickActions: true,
    }

    it('should increase monster health', () => {
      const monster = createMonster({
        name: 'Goblin',
        hp: 5,
        detailIndex: 'goblin',
        number: 0,
        xp: 50,
      })

      const result = updateMonsterHealth([monster], monster.id, 2, mockSettings)

      expect(result.monsters[0].hp).toBe(7)
      expect(result.gainedXp).toBe(0)
      expect(result.monsterDied).toBe(false)
    })

    it('should decrease monster health', () => {
      const monster = createMonster({
        name: 'Goblin',
        hp: 7,
        detailIndex: 'goblin',
        number: 0,
        xp: 50,
      })

      const result = updateMonsterHealth([monster], monster.id, -3, mockSettings)

      expect(result.monsters[0].hp).toBe(4)
      expect(result.monsterDied).toBe(false)
    })

    it('should not allow health below 0', () => {
      const monster = createMonster({
        name: 'Goblin',
        hp: 5,
        detailIndex: 'goblin',
        number: 0,
        xp: 50,
      })

      const result = updateMonsterHealth([monster], monster.id, -10, mockSettings)

      expect(result.monsters[0].hp).toBe(0)
    })

    it('should detect death and set hasDiedAlready', () => {
      const monster = createMonster({
        name: 'Goblin',
        hp: 5,
        detailIndex: 'goblin',
        number: 0,
        xp: 50,
      })

      const result = updateMonsterHealth([monster], monster.id, -5, mockSettings)

      expect(result.monsters[0].hp).toBe(0)
      expect(result.monsters[0].hasDiedAlready).toBe(true)
      expect(result.monsterDied).toBe(true)
      expect(result.gainedXp).toBe(50)
    })

    it('should not grant XP if already dead', () => {
      const monster = createMonster({
        name: 'Goblin',
        hp: 0,
        detailIndex: 'goblin',
        number: 0,
        xp: 50,
      })
      monster.hasDiedAlready = true

      const result = updateMonsterHealth([monster], monster.id, -5, mockSettings)

      expect(result.gainedXp).toBe(0)
      expect(result.monsterDied).toBe(false)
    })

    it('should auto-remove dead monsters when setting enabled', () => {
      const monster = createMonster({
        name: 'Goblin',
        hp: 5,
        detailIndex: 'goblin',
        number: 0,
        xp: 50,
      })
      const settingsWithAutoRemove = { ...mockSettings, autoRemoveDead: true }

      const result = updateMonsterHealth([monster], monster.id, -5, settingsWithAutoRemove)

      expect(result.monsters).toHaveLength(0)
    })

    it('should not auto-remove when setting is disabled', () => {
      const monster = createMonster({
        name: 'Goblin',
        hp: 5,
        detailIndex: 'goblin',
        number: 0,
        xp: 50,
      })
      const settingsWithoutAutoRemove = { ...mockSettings, autoRemoveDead: false }

      const result = updateMonsterHealth([monster], monster.id, -5, settingsWithoutAutoRemove)

      expect(result.monsters).toHaveLength(1)
      expect(result.monsters[0].hp).toBe(0)
    })

    it('should handle multiple monsters and only update target', () => {
      const monster1 = createMonster({
        name: 'Goblin',
        hp: 5,
        detailIndex: 'goblin',
        number: 0,
        xp: 50,
      })
      const monster2 = createMonster({
        name: 'Orc',
        hp: 15,
        detailIndex: 'orc',
        number: 0,
        xp: 100,
      })

      const result = updateMonsterHealth([monster1, monster2], monster1.id, -2, mockSettings)

      expect(result.monsters).toHaveLength(2)
      expect(result.monsters[0].hp).toBe(3)
      expect(result.monsters[1].hp).toBe(15)
    })
  })

  describe('addConditionToMonster', () => {
    it('should add condition to monster', () => {
      const monster = createMonster({
        name: 'Goblin',
        hp: 7,
        detailIndex: 'goblin',
        number: 0,
        xp: 50,
      })

      const result = addConditionToMonster(monster, 'frightened')

      expect(result.conditions).toContain('frightened')
      expect(result.conditions).toHaveLength(1)
    })

    it('should not add duplicate conditions', () => {
      const monster = createMonster({
        name: 'Goblin',
        hp: 7,
        detailIndex: 'goblin',
        number: 0,
        xp: 50,
      })
      monster.conditions = ['frightened']

      const result = addConditionToMonster(monster, 'frightened')

      expect(result.conditions).toHaveLength(1)
    })

    it('should add multiple different conditions', () => {
      const monster = createMonster({
        name: 'Goblin',
        hp: 7,
        detailIndex: 'goblin',
        number: 0,
        xp: 50,
      })

      let result = addConditionToMonster(monster, 'frightened')
      result = addConditionToMonster(result, 'stunned')

      expect(result.conditions).toHaveLength(2)
      expect(result.conditions).toContain('frightened')
      expect(result.conditions).toContain('stunned')
    })

    it('should not mutate original monster', () => {
      const monster = createMonster({
        name: 'Goblin',
        hp: 7,
        detailIndex: 'goblin',
        number: 0,
        xp: 50,
      })

      addConditionToMonster(monster, 'frightened')

      expect(monster.conditions).toHaveLength(0)
    })
  })

  describe('removeConditionFromMonster', () => {
    it('should remove condition from monster', () => {
      const monster = createMonster({
        name: 'Goblin',
        hp: 7,
        detailIndex: 'goblin',
        number: 0,
        xp: 50,
      })
      monster.conditions = ['frightened', 'stunned']

      const result = removeConditionFromMonster(monster, 'frightened')

      expect(result.conditions).toContain('stunned')
      expect(result.conditions).not.toContain('frightened')
      expect(result.conditions).toHaveLength(1)
    })

    it('should handle removing non-existent condition', () => {
      const monster = createMonster({
        name: 'Goblin',
        hp: 7,
        detailIndex: 'goblin',
        number: 0,
        xp: 50,
      })
      monster.conditions = ['frightened']

      const result = removeConditionFromMonster(monster, 'stunned')

      expect(result.conditions).toHaveLength(1)
      expect(result.conditions).toContain('frightened')
    })

    it('should handle empty conditions', () => {
      const monster = createMonster({
        name: 'Goblin',
        hp: 7,
        detailIndex: 'goblin',
        number: 0,
        xp: 50,
      })

      const result = removeConditionFromMonster(monster, 'frightened')

      expect(result.conditions).toHaveLength(0)
    })

    it('should not mutate original monster', () => {
      const monster = createMonster({
        name: 'Goblin',
        hp: 7,
        detailIndex: 'goblin',
        number: 0,
        xp: 50,
      })
      monster.conditions = ['frightened', 'stunned']

      removeConditionFromMonster(monster, 'frightened')

      expect(monster.conditions).toHaveLength(2)
      expect(monster.conditions).toContain('frightened')
    })
  })

  describe('toggleMonsterHidden', () => {
    it('should toggle hidden from true to false', () => {
      const monster = createMonster({
        name: 'Goblin',
        hp: 7,
        detailIndex: 'goblin',
        number: 0,
        xp: 50,
      })

      const result = toggleMonsterHidden(monster)

      expect(result.isHidden).toBe(false)
    })

    it('should toggle hidden from false to true', () => {
      const monster = createMonster({
        name: 'Goblin',
        hp: 7,
        detailIndex: 'goblin',
        number: 0,
        xp: 50,
      })
      monster.isHidden = false

      const result = toggleMonsterHidden(monster)

      expect(result.isHidden).toBe(true)
    })

    it('should not mutate original monster', () => {
      const monster = createMonster({
        name: 'Goblin',
        hp: 7,
        detailIndex: 'goblin',
        number: 0,
        xp: 50,
      })
      const originalHidden = monster.isHidden

      toggleMonsterHidden(monster)

      expect(monster.isHidden).toBe(originalHidden)
    })
  })

  describe('getMonsterStatus', () => {
    it('should return healthy status when above half health', () => {
      const monster = createMonster({
        name: 'Goblin',
        hp: 8,
        detailIndex: 'goblin',
        number: 0,
        xp: 50,
      })

      const status = getMonsterStatus(monster)

      expect(status).toBe('healthy')
    })

    it('should return injured status when between quarter and half health', () => {
      const monster = createMonster({
        name: 'Goblin',
        hp: 10,
        detailIndex: 'goblin',
        number: 0,
        xp: 50,
      })
      monster.hp = 4 // Between quarter (2.5) and half (5) of 10

      const status = getMonsterStatus(monster)

      expect(status).toBe('injured')
    })

    it('should return badly-injured status when at or below quarter health', () => {
      const monster = createMonster({
        name: 'Goblin',
        hp: 10,
        detailIndex: 'goblin',
        number: 0,
        xp: 50,
      })
      monster.hp = 2 // Below quarter of 10

      const status = getMonsterStatus(monster)

      expect(status).toBe('badly-injured')
    })

    it('should return down status when at 0 health', () => {
      const monster = createMonster({
        name: 'Goblin',
        hp: 0,
        detailIndex: 'goblin',
        number: 0,
        xp: 50,
      })

      const status = getMonsterStatus(monster)

      expect(status).toBe('down')
    })

    it('should return down status when below 0 health', () => {
      const monster = createMonster({
        name: 'Goblin',
        hp: -5,
        detailIndex: 'goblin',
        number: 0,
        xp: 50,
      })

      const status = getMonsterStatus(monster)

      expect(status).toBe('down')
    })

    it('should handle exact quarter health threshold', () => {
      const monster = createMonster({
        name: 'Goblin',
        hp: 10,
        detailIndex: 'goblin',
        number: 0,
        xp: 50,
      })
      monster.hp = 2.5 // Quarter of 10

      const status = getMonsterStatus(monster)

      expect(status).toBe('badly-injured')
    })

    it('should handle exact half health threshold', () => {
      const monster = createMonster({
        name: 'Goblin',
        hp: 10,
        detailIndex: 'goblin',
        number: 0,
        xp: 50,
      })
      monster.hp = 5 // Half of 10

      const status = getMonsterStatus(monster)

      expect(status).toBe('injured')
    })

    it('should handle full health', () => {
      const monster = createMonster({
        name: 'Goblin',
        hp: 10,
        detailIndex: 'goblin',
        number: 0,
        xp: 50,
      })

      const status = getMonsterStatus(monster)

      expect(status).toBe('healthy')
    })
  })

  describe('fetchMonsterIndex', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('should fetch monster index successfully', async () => {
      const mockIndex = {
        goblin: { name: 'Goblin', source: 'all', hp: { average: 7 }, xp: 50 },
        orc: { name: 'Orc', source: 'all', hp: { average: 15 }, xp: 100 },
      }

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockIndex),
      } as any)

      const result = await fetchMonsterIndex('http://localhost:3000')

      expect(result).toEqual(mockIndex)
      expect(global.fetch).toHaveBeenCalledWith('http://localhost:3000/monster_index.json')
    })

    it('should return empty object on fetch failure', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      } as any)

      const result = await fetchMonsterIndex('http://localhost:3000')

      expect(result).toEqual({})
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })

    it('should handle network error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      const result = await fetchMonsterIndex('http://localhost:3000')

      expect(result).toEqual({})
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })

    it('should use provided base URL', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({}),
      } as any)

      await fetchMonsterIndex('https://api.example.com')

      expect(global.fetch).toHaveBeenCalledWith('https://api.example.com/monster_index.json')
    })
  })
})
