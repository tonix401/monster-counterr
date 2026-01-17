import React from 'react'

interface LanguageSelectionsRowProps {
  settingTerm: string
  label: string
  value: string
  onChange: (key: string, value: string) => void
}

const MultiSettingsRow: React.FC<LanguageSelectionsRowProps> = ({
  settingTerm,
  label,
  value,
  onChange,
}) => {
  return (
    <div className="settings-row">
      <label htmlFor={settingTerm}>{label}</label>
      <input type="text" value={value} onChange={(e) => onChange(settingTerm, e.target.value)} />
    </div>
  )
}

export default MultiSettingsRow
