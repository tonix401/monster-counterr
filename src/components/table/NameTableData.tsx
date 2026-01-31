import React from 'react'
import { useNavigate } from 'react-router'
import type { Monster } from '@/types/Monster'
import { useMonsterStore } from '@/store'

interface NameTableDataProps {
  monster: Monster
}

const NameTableData: React.FC<NameTableDataProps> = ({ monster }) => {
  const navigate = useNavigate()
  const isMonsterDetailsAvailable = useMonsterStore((state) => state.isMonsterDetailsAvailable)

  const hasDetails = isMonsterDetailsAvailable(monster.detailIndex)

  const handleClick = () => {
    if (hasDetails) {
      navigate(`/monsters/${monster.detailIndex}`)
    }
  }

  return (
    <td className="name-cell">
      <div
        onClick={handleClick}
        style={{
          color: monster.hp > 0 ? 'inherit' : 'gray',
          display: 'flex',
          justifyContent: 'center',
        }}
        className={hasDetails ? 'clickable' : ''}
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
