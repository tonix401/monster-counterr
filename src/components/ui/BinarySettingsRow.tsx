interface BinarySettingsRowProps<T extends string> {
  settingKey: T
  label: string
  value: boolean
  onChange: (key: T, value: boolean) => void
}

const BinarySettingsRow = <T extends string>({
  settingKey,
  label,
  value,
  onChange,
}: BinarySettingsRowProps<T>) => {
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
