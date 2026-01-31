import { readdirSync, readFileSync, writeFile } from 'node:fs'

// Api key
process.loadEnvFile('.env')

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY

if (!GOOGLE_API_KEY) {
  console.error('Error: GOOGLE_API_KEY environment variable not set.')
  process.exit(1)
}

// get languages
const languages = readdirSync('src/public/locales')
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

// find missing terms
function findMissingTerms() {
  const enTerms = JSON.parse(readFileSync('src/public/locales/en.json')).terms

  const missingTerms = []

  languages.forEach((lang) => {
    const langTerms = JSON.parse(readFileSync(`src/public/locales/${lang}.json`)).terms

    for (const key in enTerms) {
      if (!(key in langTerms)) {
        missingTerms.push(key)
      }
    }
  })

  return missingTerms.filter((v, i, a) => a.indexOf(v) === i) // unique
}

function addTermToLanguages(key, term) {
  languages.forEach(async (lang) => {
    const langFilePath = `src/public/locales/${lang}.json`
    const langData = JSON.parse(readFileSync(langFilePath))

    const translatedTerm = await translate(term, lang)

    langData.terms[key] = translatedTerm

    // write back to file
    writeFile(langFilePath, JSON.stringify(langData, null, 2), 'utf-8', (err) => {
      if (err) {
        console.error(`Error writing file ${langFilePath}:`, err)
      } else {
        console.log(`Added term ${key} as "${translatedTerm}" to ${lang}`)
      }
    })
  })
}

findMissingTerms().forEach((key) => {
  const enData = JSON.parse(readFileSync('src/public/locales/en.json'))
  const term = enData.terms[key]
  addTermToLanguages(key, term)
})


// Remove keys that are not in en.json
languages.forEach((lang) => {
  const langFilePath = `src/public/locales/${lang}.json`;
  const langData = JSON.parse(readFileSync(langFilePath));
  const enTerms = JSON.parse(readFileSync('src/public/locales/en.json')).terms;

  langData.terms.forEach((key) => {
    if (!(key in enTerms)) {
      delete langData.terms[key];
      console.log(`Removed obsolete term ${key} from ${lang}`);
    }
  });

  // write back to file
  writeFile(langFilePath, JSON.stringify(langData, null, 2), 'utf-8', (err) => {
    if (err) {
      console.error(`Error writing file ${langFilePath}:`, err);
    }
  });
});
