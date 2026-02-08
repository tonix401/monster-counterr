import React from 'react'
import type { Monster, MonsterStatus } from '@/types/Monster'
import { useTerm } from '@/store/MonsterStore'

interface StatusTableDataProps {
  monster: Monster
}

const StatusTableData: React.FC<StatusTableDataProps> = ({ monster }) => {
  const t = useTerm()

  let status: MonsterStatus = 'healthy'
  let color = ''

  if (monster.hp <= 0) {
    status = 'down'
    color = 'var(--down)'
  } else if (monster.hp <= monster.maxhp / 4) {
    status = 'badly-injured'
    color = 'var(--damage)'
  } else if (monster.hp <= monster.maxhp / 2) {
    status = 'injured'
    color = 'var(--injured)'
  } else {
    status = 'healthy'
    color = 'var(--heal)'
  }

  return <td style={{ color }}>{t(status)}</td>
}

export default StatusTableData
