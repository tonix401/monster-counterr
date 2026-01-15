import React from 'react'
import type { Monster } from '@/types/Monster'

interface StatusTableDataProps {
  monster: Monster
}

const StatusTableData: React.FC<StatusTableDataProps> = ({ monster }) => {
  let status = ''
  let color = ''

  if (monster.hp <= 0) {
    status = 'Down'
    color = 'var(--down)'
  } else if (monster.hp <= monster.maxhp / 4) {
    status = 'Badly Injured'
    color = 'var(--damage)'
  } else if (monster.hp <= monster.maxhp / 2) {
    status = 'Injured'
    color = 'var(--injured)'
  } else {
    status = 'Healthy'
    color = 'var(--heal)'
  }

  return <td style={{ color }}>{status}</td>
}

export default StatusTableData