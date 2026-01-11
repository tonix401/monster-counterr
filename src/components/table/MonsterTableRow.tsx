import React from 'react'
import type { Monster } from '@/types/Monster'
import type { Settings } from '@/types/Settings'
import NameTableData from '@/components/table/NameTableData'
import StatusTableData from '@/components/table/StatusTableData'
import HpTableData from '@/components/table/HpTableData'
import ChangeHpTableData from '@/components/table/ChangeHpTableData'
import ConditionsTableData from '@/components/table/ConditionsTableData'
import QuickActionsTableData from '@/components/table/QuickActionsTableData'

interface MonsterTableRowProps {
  monster: Monster
  settings: Settings
}

const MonsterTableRow: React.FC<MonsterTableRowProps> = ({ monster, settings }) => {
  return (
    <tr>
      {settings.showQuickActions && <QuickActionsTableData monsterId={monster.id} />}
      <NameTableData monster={monster} />
      {settings.showConditions && <ConditionsTableData monster={monster} />}
      {settings.showStatus && <StatusTableData monster={monster} />}
      {settings.showHealth && <HpTableData monster={monster} />}
      {settings.showChangeHp && <ChangeHpTableData monster={monster} />}
    </tr>
  )
}

export default MonsterTableRow
