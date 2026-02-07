import React from 'react'
import { useMonsterStore } from '@/store'
import { useTerm } from '@/store/index'
import './QuickActionsTableData.css'

const skullSvg = '/monster-counterr/skull.svg'
const binSvg = '/monster-counterr/bin.svg'

interface QuickActionsTableDataProps {
  monsterId: string
}

const QuickActionsTableData: React.FC<QuickActionsTableDataProps> = ({ monsterId }) => {
  const killMonster = useMonsterStore((state) => state.killMonster)
  const removeMonster = useMonsterStore((state) => state.removeMonster)
  const t = useTerm()

  const handleKill = () => {
    killMonster(monsterId)
  }

  const handleRemove = () => {
    removeMonster(monsterId)
  }

  return (
    <td>
      <div className="quick-actions-container">
        <button className="red-button icon-button" title={t('killMonster')} onClick={handleKill}>
          <img src={skullSvg} alt={t('killMonster')} />
        </button>
        <button
          className="red-button icon-button"
          title={t('removeMonster')}
          onClick={handleRemove}
        >
          <img src={binSvg} alt={t('removeMonster')} />
        </button>
      </div>
    </td>
  )
}

export default QuickActionsTableData
