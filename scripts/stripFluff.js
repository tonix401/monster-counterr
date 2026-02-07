import { readdirSync, readFileSync } from 'fs'
import { writeFileSync } from 'fs'

const monsterData = readdirSync('src/public/monsters')
  .filter((file) => file.endsWith('.json') && file !== 'index.json')
  .map((file) => {
    const data = JSON.parse(readFileSync(`src/public/monsters/${file}`, 'utf-8'))
    delete data.fluff
    delete data.hasFluff
    delete data.hasFluffImages
    delete data.miscTags
    
    writeFileSync(`src/public/monsters/${file}`, JSON.stringify(data))
  })

writeFileSync('src/public/monsters/index.json', JSON.stringify(monsterData, null, 2), 'utf-8')
