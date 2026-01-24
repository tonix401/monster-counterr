export interface Settings {
  showStatus: boolean
  showHealth: boolean
  showConditions: boolean
  showChangeHp: boolean
  autoRemoveDead: boolean
  showXpCounter: boolean
  showQuickActions: boolean
}

export interface SettingSchema {
  name: string
  type: string
  default: boolean
  value: boolean
}

export const SETTING_SCHEMA: Record<keyof Settings, SettingSchema> = {
  showStatus: {
    name: 'Show Status',
    type: 'boolean',
    default: true,
    value: true,
  },
  showHealth: {
    name: 'Show Health',
    type: 'boolean',
    default: true,
    value: true,
  },
  showConditions: {
    name: 'Show Conditions',
    type: 'boolean',
    default: true,
    value: true,
  },
  showChangeHp: {
    name: 'Show Change HP',
    type: 'boolean',
    default: true,
    value: true,
  },
  autoRemoveDead: {
    name: 'Auto Remove Dead Monsters',
    type: 'boolean',
    default: false,
    value: false,
  },
  showXpCounter: {
    name: 'Show XP Counter',
    type: 'boolean',
    default: true,
    value: true,
  },
  showQuickActions: {
    name: 'Show Quick Actions',
    type: 'boolean',
    default: true,
    value: true,
  },
}
