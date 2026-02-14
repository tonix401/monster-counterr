import React from 'react'
import type { Monster } from '@/types/Monster'
import NameTableData from '@/components/table/NameTableData'
import StatusTableData from '@/components/table/StatusTableData'
import HpTableData from '@/components/table/HpTableData'
import ChangeHpTableData from '@/components/table/ChangeHpTableData'
import ConditionsTableData from '@/components/table/ConditionsTableData'
import QuickActionsTableData from '@/components/table/QuickActionsTableData'
import DragHandleTableData from '@/components/table/DragHandleTableData'
import { useMonsterStore, useSettings } from '@/store/useMonsterStore'

interface MonsterTableRowProps {
  monster: Monster
  isDragging: boolean
  onDragStart: () => void
  onDragOver: (e: React.DragEvent<HTMLTableRowElement>) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent<HTMLTableRowElement>) => void
  onDragEnd: () => void
}

const MonsterTableRow: React.FC<MonsterTableRowProps> = ({
  monster,
  isDragging,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
}) => {
  const highlightedMonsterId = useMonsterStore((state) => state.highlightedMonsterId)
  const settings = useSettings()

  const rowClassName = [
    highlightedMonsterId === monster.id ? 'highlighted-row' : '',
    isDragging ? 'dragging-row' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <tr
      className={rowClassName}
      onDragOver={(e) => {
        e.preventDefault()
        onDragOver(e)
      }}
      onDragLeave={onDragLeave}
      onDrop={(e) => {
        e.preventDefault()
        onDrop(e)
      }}
    >
      <DragHandleTableData
        isDragging={isDragging}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      />
      {settings.showQuickActions && (
        <QuickActionsTableData isHidden={monster.isHidden} monsterId={monster.id} />
      )}
      <NameTableData monster={monster} />
      {settings.showConditions && <ConditionsTableData monster={monster} />}
      {settings.showStatus && <StatusTableData monster={monster} />}
      {settings.showHealth && <HpTableData monster={monster} />}
      {settings.showChangeHp && <ChangeHpTableData monster={monster} />}
    </tr>
  )
}

export default MonsterTableRow
