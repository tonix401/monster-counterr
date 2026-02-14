import type { Monster } from '@/types/Monster'
import type { Settings } from '@/types/Settings'
import type { Term } from '@/types/Term'
import type { DataConnection } from 'peerjs'
import Peer from 'peerjs'

/**
 * Monster-related types and indices
 */
export type MonsterIndexEntryHp =
  | {
      average: number
      formula: string
    }
  | {
      special: string
    }

export type MonsterIndexEntry = {
  name: string
  source: string | 'all'
  hp: MonsterIndexEntryHp
  xp: number
}

export enum NotificationType {
  INFO = 'info',
  SUCCESS = 'success',
  ERROR = 'error',
  WARNING = 'warning',
}

/**
 * Notification system types
 */
export type Notification = {
  id?: string
  message: string
  type: NotificationType
  duration?: number
}

/**
 * Data export/import types
 */
export interface SaveData {
  schemaVersion: number
  monsters: Monster[]
  currentXp: number
  settings: Settings
}

export interface SaveFileExportSettings {
  includeIndex: boolean
  includeDetails: boolean
  includeMonsters: boolean
  includeSettings: boolean
  includeCurrentXp: boolean
  minimizeJson: boolean
}

/**
 * Connection/networking types
 */
export type ClientConnection = {
  conn: DataConnection
  name: string
  lastActivity: number
  messageCount: number
  lastMessageReset: number
}

/**
 * Main Store State - All state in one place
 */
export interface MonsterCounterState {
  // Loading state
  isLoading: boolean

  // Monster management
  monsters: Monster[]
  monsterIndex: Record<string, MonsterIndexEntry>
  source: string | 'all'
  highlightedMonsterId: string | null

  // Settings
  settings: Settings

  // XP tracking
  xp: number

  // Conditions
  conditions: string[]

  // Localization
  terms: Term
  language: string
  availableLanguages: { key: string; name: string }[]

  // Notifications
  queue: Notification[]

  // Data management
  exportSettings: SaveFileExportSettings

  // Connections (P2P networking)
  peer: Peer | null
  peerId: string | null
  connections: ClientConnection[]
  isConnecting: boolean
  healthCheckInterval: number | null
  pingIntervalId: number | null
}

/**
 * Main Store Actions - All actions clearly typed
 */
export interface MonsterCounterActions {
  // Initialization & Loading
  initialize: () => Promise<void>
  setLoading: (loading: boolean) => void
  loadLanguagePack: (language: string) => Promise<void>
  loadAvailableLanguages: () => Promise<void>
  getMonsterIndex: () => Promise<void>

  // Monster CRUD operations
  addMonster: (
    name: string,
    index: string | undefined,
    hp: number,
    xp: number,
    amount?: number
  ) => Monster[]
  removeMonster: (monsterId: string) => void
  removeDead: () => void
  clearMonsters: () => void
  updateMonsterHealth: (monsterId: string, amount: number) => void
  reorderMonsters: (fromIndex: number, toIndex: number) => void

  // Monster conditions (on individual monsters)
  addMonsterCondition: (monsterId: string, condition: string) => void
  removeMonsterCondition: (monsterId: string, condition: string) => void

  // Monster UI interactions
  highlightMonster: (monsterId: string) => void
  toggleHideMonster: (monsterId: string, message?: string) => void

  // Monster source filtering
  setSource: (source: string | 'all') => void

  // Settings management
  getSetting: (key: keyof Settings) => boolean | string | null
  getSettingName: (key: keyof Settings) => string
  setSetting: (key: keyof Settings, value: boolean | string | null) => void

  // XP management
  updateXp: (amount: number) => void
  resetXp: () => void

  // Conditions (global condition list)
  addCondition: (condition: string) => void
  removeCondition: (condition: string) => void
  resetConditions: () => void

  // Localization
  getTerm: (key: string, params?: Record<string, string | number>) => string
  setLanguage: (language: string) => Promise<void>

  // Notifications
  notify: (notification: Notification) => void
  removeNotification: (id: string) => void

  // Data management (export/import)
  setExportSetting: (key: keyof SaveFileExportSettings, value: boolean) => void
  exportData: () => void
  importData: (data: unknown) => boolean

  // Connections (P2P networking)
  initializeHost: () => void
  broadcastMonsters: () => void
  disconnectAll: () => void

  // Complex actions combining multiple features
  killMonster: (monsterId: string) => void
  killAllMonsters: () => void
  getOnDeathCallback: () => (monster: Monster) => void
}

/**
 * Complete Store Type
 */
export type MonsterCounterStore = MonsterCounterState & MonsterCounterActions
