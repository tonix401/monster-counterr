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

export class MonsterClass implements Monster {
  id: string
  name: string
  detailIndex: string
  hp: number
  maxhp: number
  hasDiedAlready: boolean
  conditions: string[]
  number: number

  constructor(name: string, hp: number, detailIndex: string, number: number) {
    this.id = Date.now().toString() + Math.random().toString(36).slice(2, 11)
    this.name = name
    this.detailIndex = detailIndex
    this.hp = hp
    this.maxhp = hp
    this.hasDiedAlready = false
    this.conditions = []
    this.number = number
  }
}
