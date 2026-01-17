import React from 'react'
import type { Settings } from '@/types/Settings'
import { useTerm } from '@/hooks/useTerm'

interface TableHeaderRowProps {
  settings: Settings
}

const TableHeaderRow: React.FC<TableHeaderRowProps> = ({ settings }) => {
  const t_actions = useTerm('actions')
  const t_name = useTerm('name')
  const t_conditions = useTerm('conditions')
  const t_status = useTerm('status')
  const t_hp = useTerm('hp')
  const t_changeHp = useTerm('changeHp')

  const headers: { key: string; label: string }[] = []

  if (settings.showQuickActions) headers.push({ key: 'actions', label: t_actions })
  headers.push({ key: 'name', label: t_name })
  if (settings.showConditions) headers.push({ key: 'conditions', label: t_conditions })
  if (settings.showStatus) headers.push({ key: 'status', label: t_status })
  if (settings.showHealth) headers.push({ key: 'hp', label: t_hp })
  if (settings.showChangeHp) headers.push({ key: 'change-hp', label: t_changeHp })

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
