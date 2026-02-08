export const CONDITIONS = [
  'blinded',
  'charmed',
  'deafened',
  'frightened',
  'fatigued',
  'grappled',
  'incapacitated',
  'invisible',
  'paralyzed',
  'petrified',
  'poisoned',
  'prone',
  'restrained',
  'stunned',
  'unconscious',
] as const

export type Condition = (typeof CONDITIONS)[number]

export const BASE_URL = '/monster-counterr' as const

export const ANIMATION_DURATION = {
  XP_UPDATE: 1500,
  XP_RESET: 1000,
  KILL_ALL_DELAY: 1500,
} as const

export const STORAGE_KEYS = {
  MONSTER_COUNTER: 'monster-counter-storage',
  PLAYER: 'monster-counter-player-storage',
} as const

export const SAVE_FILE = {
  SCHEMA_VERSION: 1,
  FILENAME: 'monster-counter-save-file.json',
} as const

export const ASSETS = {
  UNDO_ICON: `${BASE_URL}/undo.svg`,
  REDO_ICON: `${BASE_URL}/redo.svg`,
  SKULL_ICON: `${BASE_URL}/skull.svg`,
  BIN_ICON: `${BASE_URL}/bin.svg`,
  KNIFE_ICON: `${BASE_URL}/knife.svg`,
  HIDE_ICON: `${BASE_URL}/hide.svg`,
} as const

export const CONNECTION = {
  // Host & Client - Health monitoring
  PING_INTERVAL_MS: 3000, // 3 seconds - send pings frequently
  HEALTH_CHECK_INTERVAL_MS: 2000, // 2 seconds - check connection health
  PONG_TIMEOUT_MS: 8000, // 8 seconds - disconnect if no pong (allows 2 missed pings)
  CONNECTION_TIMEOUT_MS: 8000, // 8 seconds - same as pong timeout

  // Client - Reconnection
  MAX_RECONNECT_ATTEMPTS: 5,
  MIN_RECONNECT_DELAY_MS: 1000,
  MAX_RECONNECT_DELAY_MS: 10000,

  // Host & Client - Rate limiting & security
  MAX_CONNECTIONS: 25,
  MAX_MESSAGE_SIZE: 102400, // 100KB
  MAX_MESSAGES_PER_SECOND: 10,
} as const
