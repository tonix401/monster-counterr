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
} as const

export const SAVE_FILE = {
  SCHEMA_VERSION: 1,
  FILENAME: 'monster-counter-save-file.json',
} as const
