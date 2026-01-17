export const CONDITIONS = [
  'Blinded',
  'Charmed',
  'Deafened',
  'Frightened',
  'Grappled',
  'Incapacitated',
  'Invisible',
  'Paralyzed',
  'Petrified',
  'Poisoned',
  'Prone',
  'Restrained',
  'Stunned',
  'Unconscious',
] as const

export type Condition = (typeof CONDITIONS)[number]

export const API_URL = 'https://www.dnd5eapi.co' as const
export const ASSETS_URL = '/app/' as const

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
