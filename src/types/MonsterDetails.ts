export interface MonsterDetails {
  name: string
  source: string
  page?: number
  srd?: boolean
  srd52?: boolean
  basicRules?: boolean
  basicRules2024?: boolean
  otherSources?: { source: string; page?: number }[]
  size: string[]
  type: string | { type: string; tags?: string[] }
  alignment?: string[]
  alignmentPrefix?: string
  ac: (number | { ac: number; from?: string[]; condition?: string })[]
  hp: { average: number; formula: string }
  speed: Record<string, number | string>
  initiative?: { proficiency?: number }
  str: number
  dex: number
  con: number
  int: number
  wis: number
  cha: number
  save?: Record<string, string>
  skill?: Record<string, string>
  senses?: string[]
  passive: number
  immune?: string[]
  resist?: string[]
  vulnerable?: string[]
  conditionImmune?: (string | { name: string })[]
  languages?: string | string[]
  cr: string | number | { cr: string; xpLair?: number }
  spellcasting?: {
    name: string
    type: string
    headerEntries?: string[]
    will?: string[]
    daily?: Record<string, string[]>
    spells?: Record<string, { slots?: number; spells: string[] }>
    ability?: string
    displayAs?: string
  }[]
  trait?: { name: string; entries: string[] }[]
  action?: { name: string; entries: string[] }[]
  bonus?: { name: string; entries: string[] }[]
  reaction?: { name: string; entries: string[] }[]
  legendary?: { name: string; entries: string[] }[]
  legendaryActionsLair?: number
  legendaryGroup?: { name: string; source: string }
  environment?: string[]
  treasure?: string[]
  soundClip?: { type: string; path: string }
  group?: string[]
  dragonAge?: string
  traitTags?: string[]
  senseTags?: string[]
  actionTags?: string[]
  languageTags?: string[]
  damageTags?: string[]
  damageTagsSpell?: string[]
  spellcastingTags?: string[]
  miscTags?: string[]
  conditionInflict?: string[]
  conditionInflictSpell?: string[]
  savingThrowForced?: string[]
  savingThrowForcedLegendary?: string[]
  savingThrowForcedSpell?: string[]
  attachedItems?: string[]
  hasToken?: boolean
  hasFluff?: boolean
  hasFluffImages?: boolean
  fluff?: {
    name: string
    source: string
    entries?: unknown[]
    images?: { type: string; href: { type: string; path: string }; credit?: string }[]
    _copy?: { name: string; source: string }
  }
  reprintedAs?: string[]
}
