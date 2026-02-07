import { readdirSync, readFileSync, writeFileSync } from 'node:fs'

// -----------------------------------------------------------------------------
// Env
// -----------------------------------------------------------------------------

process.loadEnvFile('.env.local')

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY
if (!GOOGLE_API_KEY) {
  console.error('Error: GOOGLE_API_KEY environment variable not set.')
  process.exit(1)
}

const LOCALES_DIR = 'src/public/locales'
const EN_LANG = 'en'

// ANSI colors
const RED = '\x1b[31m'
const GREEN = '\x1b[32m'
const RESET = '\x1b[0m'

// -----------------------------------------------------------------------------
// File helpers
// -----------------------------------------------------------------------------

function getLangData(lang) {
  const filePath = `${LOCALES_DIR}/${lang}.json`
  return JSON.parse(readFileSync(filePath, 'utf-8'))
}

function writeLangData(lang, data) {
  const filePath = `${LOCALES_DIR}/${lang}.json`
  writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

function getLanguages() {
  return readdirSync(LOCALES_DIR)
    .filter((f) => f.endsWith('.json') && f !== 'locales.json')
    .map((f) => f.replace('.json', ''))
    .filter((l) => l !== EN_LANG)
}

// -----------------------------------------------------------------------------
// Diff-style logger (colored)
// -----------------------------------------------------------------------------

function logDiff(lang, key, type, oldValue, newValue) {
  console.log(`diff --locale ${lang}`)

  if (type === 'add') {
    console.log(`${GREEN}+ ${key}: "${newValue}"${RESET}\n`)
  }

  if (type === 'remove') {
    console.log(`${RED}- ${key}: "${oldValue}"${RESET}\n`)
  }

  if (type === 'change') {
    console.log(
      `${RED}- ${key}: "${oldValue}"${RESET}\n` + `${GREEN}+ ${key}: "${newValue}"${RESET}\n`
    )
  }
}

// -----------------------------------------------------------------------------
// Google Translate
// -----------------------------------------------------------------------------

async function translate(text, target) {
  const url = `https://translation.googleapis.com/language/translate/v2?key=${GOOGLE_API_KEY}`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      q: text,
      target,
      format: 'text',
    }),
  })

  if (!res.ok) {
    throw new Error(`Translation API error: ${res.status} ${res.statusText}`)
  }

  const data = await res.json()
  return data.data.translations[0].translatedText
}

// -----------------------------------------------------------------------------
// Core logic
// -----------------------------------------------------------------------------

function findMissingTerms(languages) {
  const enTerms = getLangData(EN_LANG).terms
  const missing = new Set()

  for (const lang of languages) {
    const langTerms = getLangData(lang).terms
    for (const key of Object.keys(enTerms)) {
      if (!(key in langTerms)) {
        missing.add(key)
      }
    }
  }

  return [...missing]
}

async function addMissingTerms(languages) {
  const enTerms = getLangData(EN_LANG).terms
  const missingTerms = findMissingTerms(languages)

  for (const key of missingTerms) {
    const sourceText = enTerms[key]

    for (const lang of languages) {
      const langData = getLangData(lang)

      if (key in langData.terms) continue

      const translated = await translate(sourceText, lang)
      langData.terms[key] = translated

      writeLangData(lang, langData)
      logDiff(lang, key, 'add', null, translated)
    }
  }
}

function removeObsoleteTerms(languages) {
  const enTerms = getLangData(EN_LANG).terms

  for (const lang of languages) {
    const langData = getLangData(lang)

    for (const key of Object.keys(langData.terms)) {
      if (!(key in enTerms)) {
        const oldValue = langData.terms[key]
        delete langData.terms[key]

        logDiff(lang, key, 'remove', oldValue)
      }
    }

    writeLangData(lang, langData)
  }
}

function updateLocalesIndex(languages) {
  const allLangs = [...languages, EN_LANG].sort()

  const index = allLangs.map((lang) => {
    const langData = getLangData(lang)
    return {
      key: lang,
      name: langData.terms.__thisLanguage,
    }
  })

  writeFileSync(`${LOCALES_DIR}/locales.json`, JSON.stringify(index, null, 2), 'utf-8')
}

// -----------------------------------------------------------------------------
// Run
// -----------------------------------------------------------------------------

async function run() {
  const languages = getLanguages()
  await addMissingTerms(languages)
  removeObsoleteTerms(languages)
  updateLocalesIndex(languages)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
