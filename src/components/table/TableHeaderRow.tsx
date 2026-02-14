import React from 'react'
import { useSettings, useTerm } from '@/store/useMonsterStore'

const TableHeaderRow: React.FC = () => {
  const t = useTerm()
  const settings = useSettings()

  const headers: { key: string; label: string }[] = [{ key: 'drag-handle', label: '' }]

  if (settings.showQuickActions) headers.push({ key: 'actions', label: t('actions') })
  headers.push({ key: 'name', label: t('name') })
  if (settings.showConditions) headers.push({ key: 'conditions', label: t('conditions') })
  if (settings.showStatus) headers.push({ key: 'status', label: t('status') })
  if (settings.showHealth) headers.push({ key: 'hp', label: t('hp') })
  if (settings.showChangeHp) headers.push({ key: 'change-hp', label: t('changeHp') })

  const handleDragOver = (e: React.DragEvent<HTMLTableRowElement>) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  return (
    <tr onDragOver={handleDragOver}>
      {headers.map((header) => (
        <th key={header.key} id={`header-row-${header.key}`}>
          <span>{header.label}</span>
        </th>
      ))}
    </tr>
  )
}

export default TableHeaderRow
