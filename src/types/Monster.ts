export type MonsterStatus = 'healthy' | 'injured' | 'badly-injured' | 'down'

export interface Monster {
  id: string
  name: string
  detailIndex: string | undefined
  hp: number
  maxhp: number
  hasDiedAlready: boolean
  conditions: string[]
  number: number
  isHidden: boolean
  xp: number
}

export type ClientMonster = {
  id: string
  name: string
  status: MonsterStatus
}

export function createMonster(params: {
  name: string
  hp: number
  detailIndex: string | undefined
  number: number
  xp: number
}): Monster {
  return {
    id: crypto.randomUUID(),
    name: params.name,
    detailIndex: params.detailIndex,
    hp: params.hp,
    maxhp: params.hp,
    hasDiedAlready: false,
    conditions: [],
    number: params.number,
    isHidden: true,
    xp: params.xp,
  }
}
