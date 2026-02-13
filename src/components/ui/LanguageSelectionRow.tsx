import { useTerm } from '@/store/useMonsterStore'
import { useAvailableLanguages, useMonsterStore } from '@/store/useMonsterStore'
import React from 'react'
import { DropdownInput } from './DropdownInput'
import './LanguageSelectionRow.css'

const LanguageSelectionRow: React.FC = () => {
  const availableLanguages = useAvailableLanguages()

  const language = useMonsterStore((state) => state.language)
  const setLanguage = useMonsterStore((state) => state.setLanguage)
  const t = useTerm()

  const dropdownOptions = availableLanguages.map((lang) => ({
    value: lang.key,
    label: lang.name,
  }))

  return (
    <div className="language-selection-row">
      <label htmlFor="language">{t('language')}</label>
      <DropdownInput
        id="language"
        value={language}
        options={dropdownOptions}
        onChange={setLanguage}
        maxEntries={8}
      />
    </div>
  )
}

export default LanguageSelectionRow
