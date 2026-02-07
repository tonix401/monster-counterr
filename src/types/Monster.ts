export type MonsterStatus = "healthy" | "injured" | "badly-injured" | "down"

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
}

export type ClientMonster = {
  id: string
  name: string
  status: MonsterStatus
}

export function createMonster(
  name: string,
  hp: number,
  detailIndex: string | undefined,
  number: number
): Monster {
  return {
    id: crypto.randomUUID(),
    name,
    detailIndex,
    hp,
    maxhp: hp,
    hasDiedAlready: false,
    conditions: [],
    number,
    isHidden: true,
  }
}
