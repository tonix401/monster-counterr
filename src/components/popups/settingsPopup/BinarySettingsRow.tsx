import React from 'react'
import type { Settings } from '@/types/Settings'

interface BinarySettingsRowProps {
  settingKey: keyof Settings | string
  label: string
  value: boolean
  onChange: (key: keyof Settings | string, value: boolean) => void
}

const BinarySettingsRow: React.FC<BinarySettingsRowProps> = ({ settingKey, label, value, onChange }) => {
  return (
    <div className="settings-row">
      <label htmlFor={settingKey}>{label}</label>
      <input
        type="checkbox"
        id={settingKey}
        checked={value}
        onChange={(e) => onChange(settingKey, e.target.checked)}
      />
    </div>
  )
}

export default BinarySettingsRow
