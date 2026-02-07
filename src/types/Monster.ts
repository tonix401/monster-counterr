export interface Monster {
  id: string
  name: string
  detailIndex: string
  hp: number
  maxhp: number
  hasDiedAlready: boolean
  conditions: string[]
  number: number
}

export function createMonster(
  name: string,
  hp: number,
  detailIndex: string,
  number: number
): Monster {
  return {
    id: Date.now().toString() + Math.random().toString(36).slice(2, 11),
    name,
    detailIndex,
    hp,
    maxhp: hp,
    hasDiedAlready: false,
    conditions: [],
    number,
  }
}
