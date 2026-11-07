import React from 'react'
import type { Monster } from '@/types/Monster'
import MonsterAvatar from '@/components/MonsterAvatar'

/** The monster's token: its letters inside a ring that shows roughly how healthy it is */
const TokenTableData: React.FC<{ monster: Monster }> = ({ monster }) => (
  <td className="token-cell">
    <MonsterAvatar monster={monster} size={32} faint={monster.isHidden} />
  </td>
)

export default TokenTableData
