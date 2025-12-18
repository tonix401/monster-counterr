export interface MonsterDetails {
  index: string;
  name: string;
  size: string;
  type: string;
  alignment: string;
  armor_class: { type: string; value: number }[];
  hit_points: number;
  speed: Record<string, string>;
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
  proficiencies: { proficiency: { name: string }; value: number }[];
  damage_vulnerabilities: string[];
  damage_resistances: string[];
  damage_immunities: string[];
  condition_immunities: { name: string }[];
  senses: Record<string, string>;
  languages: string;
  challenge_rating: number;
  xp: number;
  special_abilities: { name: string; desc: string }[];
  actions: { name: string; desc: string }[];
  legendary_actions: { name: string; desc: string }[];
  image: string;
}

export interface MonsterIndex {
  index: string;
  name: string;
  url: string;
}
