import React from 'react'
import { useNavigate } from 'react-router'
import { useMonsterStore, useCanUndo, useCanRedo, useXp } from '@/store/MonsterStore'
import { useUndoRedoShortcuts } from '@/hooks/useKeyboardShortcut'
import { useTerm } from '@/store/MonsterStore'
import { ASSETS } from '@/constants'
import './Header.css'

const Header: React.FC = () => {
  const navigate = useNavigate()
  const settings = useMonsterStore((state) => state.settings)
  const clearMonsters = useMonsterStore((state) => state.clearMonsters)
  const killAllMonsters = useMonsterStore((state) => state.killAllMonsters)
  const removeDead = useMonsterStore((state) => state.removeDead)
  const undo = useMonsterStore((state) => state.undo)
  const redo = useMonsterStore((state) => state.redo)
  const canUndo = useCanUndo()
  const canRedo = useCanRedo()
  const t = useTerm()
  const xp = useXp()
  const resetXp = useMonsterStore((state) => state.resetXp)

  // Enable keyboard shortcuts
  useUndoRedoShortcuts(undo, redo)

  return (
    <header>
      <div>
        <button className="green-button" onClick={() => navigate('menu')} title={t('openMenu')}>
          {t('menu')}
        </button>
        <button
          className="green-button"
          onClick={undo}
          disabled={!canUndo}
          title={t('undoShortcut')}
          style={{
            opacity: canUndo ? 1 : 0.6,
            cursor: canUndo ? 'pointer' : 'not-allowed',
          }}
        >
          <img src={ASSETS.UNDO_ICON} alt={t('undo')} style={{ width: '16px', height: '16px' }} />
        </button>
        <button
          className="green-button"
          onClick={redo}
          disabled={!canRedo}
          title={t('redoShortcut')}
          style={{
            opacity: canRedo ? 1 : 0.6,
            cursor: canRedo ? 'pointer' : 'not-allowed',
          }}
        >
          <img src={ASSETS.REDO_ICON} alt={t('redo')} style={{ width: '16px', height: '16px' }} />
        </button>
        {settings.showXpCounter && (
          <button
            id="xp-counter"
            className="red-button transparent-button"
            title={t('resetXpCounter')}
            onClick={resetXp}
          >
            {xp} {t('xp')}
          </button>
        )}
      </div>
      <h2>{t('monsterCounter')}</h2>
      <div>
        <button className="red-button" onClick={clearMonsters} title={t('clearTooltip')}>
          {t('clear')}
        </button>
        <button className="red-button" onClick={killAllMonsters} title={t('killAllTooltip')}>
          {t('killAll')}
        </button>
        <button className="red-button" onClick={removeDead} title={t('removeDeadTooltip')}>
          {t('removeDead')}
        </button>
      </div>
    </header>
  )
}

export default Header
