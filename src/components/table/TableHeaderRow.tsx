import React from 'react'
import type { Settings } from '@/types/Settings'
import { useTerm } from '@/store/index'

interface TableHeaderRowProps {
  settings: Settings
}

const TableHeaderRow: React.FC<TableHeaderRowProps> = ({ settings }) => {
  const t = useTerm()

  const headers: { key: string; label: string }[] = []

  if (settings.showQuickActions) headers.push({ key: 'actions', label: t('actions') })
  headers.push({ key: 'name', label: t('name') })
  if (settings.showConditions) headers.push({ key: 'conditions', label: t('conditions') })
  if (settings.showStatus) headers.push({ key: 'status', label: t('status') })
  if (settings.showHealth) headers.push({ key: 'hp', label: t('hp') })
  if (settings.showChangeHp) headers.push({ key: 'change-hp', label: t('changeHp') })

  return (
    <tr>
      {headers.map((header) => (
        <th key={header.key} id={`header-row-${header.key}`}>
          {header.label}
        </th>
      ))}
    </tr>
  )
}

export default TableHeaderRow
