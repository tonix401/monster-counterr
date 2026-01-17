# Language Packs

This directory contains JSON language pack files for the Monster Counter application.

## Structure

Each language pack is a JSON file with the following structure:

```json
{
  "lang": "en",
  "terms": {
    "termKey": "Translated term"
  }
}
```

### Fields:

- **lang**: The language code (e.g., "en", "de", "es", "fr")
- **terms**: An object containing all term keys and their translations

## Adding a New Language

1. Create a new JSON file in this directory named `{language-code}.json`
2. Follow the structure above
3. Copy all term keys from `en.json` and provide translations
4. The language pack will be loaded at runtime when the user selects the language

## Example

```json
{
  "lang": "es",
  "terms": {
    "showQuickActions": "Mostrar acciones rápidas"
  }
}
```

## Usage in Code

To use translations in components:

```tsx
import { useTerm } from '@/hooks/useTerm'

const MyComponent = () => {
  const showQuickActionsLabel = useTerm('showQuickActions')

  return <div>{showQuickActionsLabel}</div>
}
```

The hook automatically subscribes to language changes, so components will re-render when the language is switched.

## Switching Languages

```tsx
import { useSetLanguage } from '@/store'

const LanguageSwitcher = () => {
  const setLanguage = useSetLanguage()

  const handleChange = async () => {
    await setLanguage('de')
  }

  return <button onClick={handleChange}>Switch to German</button>
}
```

## Missing Translations

If a term key is not found in the current language pack:

- A warning will be logged to the console
- The term key itself will be displayed as fallback text
