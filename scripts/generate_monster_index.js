import { readdirSync, readFileSync } from 'fs'
import { writeFileSync } from 'fs'

const nameToSlug = (name) => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const crToXp = (rc) => {
  const crXpMap = {
    0: 10,
    '1/8': 25,
    '1/4': 50,
    '1/2': 100,
    1: 200,
    2: 450,
    3: 700,
    4: 1100,
    5: 1800,
    6: 2300,
    7: 2900,
    8: 3900,
    9: 5000,
    10: 5900,
    11: 7200,
    12: 8400,
    13: 10000,
    14: 11500,
    15: 13000,
    16: 15000,
    17: 18000,
    18: 20000,
    19: 22000,
    20: 25000,
    21: 33000,
    22: 41000,
    23: 50000,
    24: 62000,
    25: 75000,
    26: 90000,
    27: 105000,
    28: 120000,
    29: 142000,
    30: 155000,
  }
  if (typeof rc === 'string') return crXpMap[rc] || null
  if (typeof rc === 'number') return crXpMap[rc.toString()] || null
  if (rc && typeof rc === 'object' && 'cr' in rc) return crToXp(rc.cr)
  return null
}

const monsterData = readdirSync('src/public/monsters')
  .filter((file) => file.endsWith('.json') && file !== 'index.json')
  .map((file) => {
    let data = JSON.parse(readFileSync(`src/public/monsters/${file}`, 'utf-8'))

    if (data._copy) {
      const copyData = JSON.parse(
        readFileSync(`src/public/monsters/${nameToSlug(data._copy.name)}.json`, 'utf-8')
      )
      data = { ...copyData, ...data }
    }

    if (!data.source) {
      console.warn(`Monster ${data.name} is missing a source. Skipping.`)
    }

    return {
      name: data.name,
      source: data.source,
      hp: data.hp,
      xp: crToXp(data.cr),
    }
  })

writeFileSync('./monster_index.json', JSON.stringify(monsterData, null, 2), 'utf-8')

console.log('Monster index generated with', monsterData.length, 'monsters.')
