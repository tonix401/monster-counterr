import { readdirSync, readFileSync } from 'fs'
import { writeFileSync } from 'fs'

const monsterData = readdirSync('src/public/monsters')
  .filter((file) => file.endsWith('.json') && file !== 'index.json')
  .map((file) => {
    const data = JSON.parse(readFileSync(`src/public/monsters/${file}`, 'utf-8'))
    return {
      index: file.replace('.json', ''),
      name: data.name,
      source: data.source,
    }
  })

writeFileSync(
  'src/public/monsters/index.json',
  JSON.stringify(monsterData, null, 2),
  'utf-8'
)

console.log('Monster index generated with', monsterData.length, 'monsters.')