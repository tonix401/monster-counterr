import React from 'react'
import { useMonsterStore } from '@/store'
import { useTerm } from '@/store/index'
import { ASSETS } from '@/constants'
import './QuickActionsTableData.css'

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
          <img src={ASSETS.SKULL_ICON} alt={t('killMonster')} />
        </button>
        <button
          className="red-button icon-button"
          title={t('removeMonster')}
          onClick={handleRemove}
        >
          <img src={ASSETS.BIN_ICON} alt={t('removeMonster')} />
        </button>
      </div>
    </td>
  )
}

export default QuickActionsTableData
