import React from 'react'
import { useSettings } from '@/store/useMonsterStore'

const TableColgroup: React.FC = () => {
  const settings = useSettings()

  const cols: string[] = []

  cols.push('drag-handle')
  if (settings.showQuickActions) cols.push('actions')
  cols.push('name')
  if (settings.showConditions) cols.push('conditions')
  if (settings.showStatus) cols.push('status')
  if (settings.showHealth) cols.push('hp')
  if (settings.showChangeHp) cols.push('change-hp')

  return (
    <colgroup>
      {cols.map((col) => (
        <col key={col} id={`col-${col}`} />
      ))}
    </colgroup>
  )
}

export default TableColgroup
