import { useTerm } from '@/hooks/useTerm'
import { useAvailableLanguages, useMonsterStore } from '@/store'
import React from 'react'

const LanguageSelectionRow: React.FC = () => {
  const availableLanguages = useAvailableLanguages()

  const language = useMonsterStore((state) => state.language)
  const setLanguage = useMonsterStore((state) => state.setLanguage)

  const t_language = useTerm('language')

  return (
    <div className="language-selection-row">
      <label htmlFor="language">{t_language}</label>
      <select id="language" value={language} onChange={(e) => setLanguage(e.target.value)}>
        {availableLanguages.map((lang) => (
          <option key={lang.key} value={lang.key}>
            {lang.name}
          </option>
        ))}
      </select>
    </div>
  )
}

export default LanguageSelectionRow
