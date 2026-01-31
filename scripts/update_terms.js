import { readdirSync, readFileSync, writeFileSync } from 'node:fs'

// Api key
process.loadEnvFile('.env.local')

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY

if (!GOOGLE_API_KEY) {
  console.error('Error: GOOGLE_API_KEY environment variable not set.')
  process.exit(1)
}

// get languages
const languages = readdirSync('src/public/locales')
  .filter((f) => f.endsWith('.json') && !f.startsWith('locales'))
  .map((f) => f.replace('.json', ''))
  .filter((l) => l !== 'en')

// translate
async function translate(text, target) {
  const url = `https://translation.googleapis.com/language/translate/v2?key=${GOOGLE_API_KEY}`
  const body = {
    q: text,
    target,
    format: 'text',
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    throw new Error(`Translation API error: ${res.statusText}`)
  }
  const data = await res.json()
  return data.data.translations[0].translatedText
}

function getLangData(lang) {
  const langFilePath = `src/public/locales/${lang}.json`
  return JSON.parse(readFileSync(langFilePath))
}

// find missing terms
function findMissingTerms() {
  const enTerms = getLangData('en').terms

  const missingTerms = []

  languages.forEach((lang) => {
    const langTerms = getLangData(lang).terms

    for (const key in enTerms) {
      if (!(key in langTerms)) {
        missingTerms.push(key)
      }
    }
  })

  return missingTerms.filter((v, i, a) => a.indexOf(v) === i) // unique
}

// add term to all languages
async function addTermToLanguages(key, term) {
  for (const lang of languages) {
    const langFilePath = `src/public/locales/${lang}.json`
    const langData = getLangData(lang)
    const translatedTerm = await translate(term, lang)

    langData.terms[key] = translatedTerm

    // write back to file
    writeFileSync(langFilePath, JSON.stringify(langData, null, 2), 'utf-8')
    console.log(`Added term ${key} as "${translatedTerm}" to ${lang}`)
  }
}

// Add missing terms
findMissingTerms().forEach(async (key) => {
  const enData = getLangData('en')
  const term = enData.terms[key]
  await addTermToLanguages(key, term)
})

// Remove keys that are not in en.json
languages.forEach((lang) => {
  const langFilePath = `src/public/locales/${lang}.json`
  const langData = getLangData(lang)
  const enTerms = getLangData('en').terms

  Object.keys(langData.terms).forEach((key) => {
    if (!(key in enTerms)) {
      delete langData.terms[key]
      console.log(`Removed obsolete term ${key} from ${lang}`)
    }
  })

  // write back to file
  writeFileSync(langFilePath, JSON.stringify(langData, null, 2), 'utf-8')
})

// Update the locales index file
const localesIndex = await Promise.all(languages.map(async (lang) => {
  const langData = await getLangData(lang)
  return {
    key: lang,
    name: langData.terms.__thisLanguage,
  }
}))

writeFileSync(
  'src/public/locales/locales.json',
  JSON.stringify(localesIndex, null, 2),
  'utf-8'
)
console.log('Updated locales index file.')
