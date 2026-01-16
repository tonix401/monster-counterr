import React from 'react'
import { useMonsterStore } from '@/store'
import skullSvg from '@/assets/skull.svg'
import binSvg from '@/assets/bin.svg'

interface QuickActionsTableDataProps {
  monsterId: string
}

const QuickActionsTableData: React.FC<QuickActionsTableDataProps> = ({ monsterId }) => {
  const killMonster = useMonsterStore((state) => state.killMonster)
  const removeMonster = useMonsterStore((state) => state.removeMonster)

  const handleKill = () => {
    killMonster(monsterId)
  }

  const handleRemove = () => {
    removeMonster(monsterId)
  }

  return (
    <td>
      <div className="quick-actions-container">
        <button className="red-button icon-button" title="Kill Monster" onClick={handleKill}>
          <img src={skullSvg} alt="Kill Monster" />
        </button>
        <button className="red-button icon-button" title="Remove Monster" onClick={handleRemove}>
          <img src={binSvg} alt="Remove Monster" />
        </button>
      </div>
    </td>
  )
}

export default QuickActionsTableData
