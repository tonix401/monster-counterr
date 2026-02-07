import React from 'react'
import type { Monster } from '@/types/Monster'
import type { Settings } from '@/types/Settings'
import NameTableData from '@/components/table/NameTableData'
import StatusTableData from '@/components/table/StatusTableData'
import HpTableData from '@/components/table/HpTableData'
import ChangeHpTableData from '@/components/table/ChangeHpTableData'
import ConditionsTableData from '@/components/table/ConditionsTableData'
import QuickActionsTableData from '@/components/table/QuickActionsTableData'
import { useMonsterStore } from '@/store'

interface MonsterTableRowProps {
  monster: Monster
  settings: Settings
}

const MonsterTableRow: React.FC<MonsterTableRowProps> = ({ monster, settings }) => {
  const highlightedMonsterId = useMonsterStore((state) => state.highlightedMonsterId)

  return (
    <tr className={highlightedMonsterId === monster.id ? 'highlighted-row' : ''}>
      {settings.showQuickActions && <QuickActionsTableData isHidden={monster.isHidden} monsterId={monster.id} />}
      <NameTableData monster={monster} />
      {settings.showConditions && <ConditionsTableData monster={monster} />}
      {settings.showStatus && <StatusTableData monster={monster} />}
      {settings.showHealth && <HpTableData monster={monster} />}
      {settings.showChangeHp && <ChangeHpTableData monster={monster} />}
    </tr>
  )
}

export default MonsterTableRow
