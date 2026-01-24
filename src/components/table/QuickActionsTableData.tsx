import React from 'react'
import { useMonsterStore } from '@/store'
import { useTerm } from '@/hooks/useTerm'
import skullSvg from '@/public/skull.svg'
import binSvg from '@/public/bin.svg'

interface QuickActionsTableDataProps {
  monsterId: string
}

const QuickActionsTableData: React.FC<QuickActionsTableDataProps> = ({ monsterId }) => {
  const killMonster = useMonsterStore((state) => state.killMonster)
  const removeMonster = useMonsterStore((state) => state.removeMonster)

  const t_killMonster = useTerm('killMonster')
  const t_removeMonster = useTerm('removeMonster')

  const handleKill = () => {
    killMonster(monsterId)
  }

  const handleRemove = () => {
    removeMonster(monsterId)
  }

  return (
    <td>
      <div className="quick-actions-container">
        <button className="red-button icon-button" title={t_killMonster} onClick={handleKill}>
          <img src={skullSvg} alt={t_killMonster} />
        </button>
        <button className="red-button icon-button" title={t_removeMonster} onClick={handleRemove}>
          <img src={binSvg} alt={t_removeMonster} />
        </button>
      </div>
    </td>
  )
}

export default QuickActionsTableData
