import React from 'react'
import { useMonsterStore } from '@/store/MonsterStore'
import { useTerm } from '@/store/MonsterStore'
import { ASSETS } from '@/constants'
import './QuickActionsTableData.css'

interface QuickActionsTableDataProps {
  monsterId: string
  isHidden?: boolean
}

const QuickActionsTableData: React.FC<QuickActionsTableDataProps> = ({ monsterId, isHidden }) => {
  const killMonster = useMonsterStore((state) => state.killMonster)
  const removeMonster = useMonsterStore((state) => state.removeMonster)
  const toggleHideMonster = useMonsterStore((state) => state.toggleHideMonster)
  const t = useTerm()

  const handleKill = () => {
    killMonster(monsterId)
  }

  const handleRemove = () => {
    removeMonster(monsterId)
  }

  const handleHide = () => {
    toggleHideMonster(monsterId)
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
        <button
          className={'green-button icon-button' + (isHidden ? ' monster-hidden-button' : '')}
          title={isHidden ? t('showMonster') : t('hideMonster')}
          onClick={handleHide}
        >
          {isHidden ? (
            <img src={ASSETS.HIDE_ICON} alt={t('showMonster')} />
          ) : (
            <img src={ASSETS.SHOW_ICON} alt={t('hideMonster')} />
          )}
        </button>
      </div>
    </td>
  )
}

export default QuickActionsTableData
