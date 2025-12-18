export interface Monster {
  id: string;
  name: string;
  detailIndex: string;
  hp: number;
  maxhp: number;
  hasDiedAlready: boolean;
  conditions: string[];
}

export class MonsterClass implements Monster {
  id: string;
  name: string;
  detailIndex: string;
  hp: number;
  maxhp: number;
  hasDiedAlready: boolean;
  conditions: string[];

  constructor(name: string, hp: number, detailIndex: string) {
    this.id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    this.name = name;
    this.detailIndex = detailIndex;
    this.hp = hp;
    this.maxhp = hp;
    this.hasDiedAlready = false;
    this.conditions = [];
  }
}
