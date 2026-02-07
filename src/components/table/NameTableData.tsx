import React from 'react'
import { useNavigate } from 'react-router'
import type { Monster } from '@/types/Monster'

interface NameTableDataProps {
  monster: Monster
}

const NameTableData: React.FC<NameTableDataProps> = ({ monster }) => {
  const navigate = useNavigate()

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
        <span>{monster.number ? ` ${monster.number}` : ''}</span>
      </div>
    </td>
  )
}

export default NameTableData
