import React from 'react'
import { useGo } from '@/hooks/useGo'
import type { Monster } from '@/types/Monster'

interface NameTableDataProps {
  monster: Monster
}

const NameTableData: React.FC<NameTableDataProps> = ({ monster }) => {
  const navigate = useGo()

  return (
    <td className="name-cell">
      <div
        onClick={() => navigate(`/monsters/${monster.detailIndex}`)}
        style={{
          color: monster.hp > 0 ? 'inherit' : 'gray',
          display: 'flex',
          justifyContent: 'center',
        }}
        className="clickable"
      >
        <span
          style={{
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
          }}
        >
          {monster.name}
        </span>
        <span>{monster.number ? `\u00A0${monster.number}` : ''}</span>
      </div>
    </td>
  )
}

export default NameTableData
