import React from 'react'
import { useMonsterStore, useCanUndo, useCanRedo } from '@/store'
import { useUndoRedoShortcuts } from '@/hooks/useKeyboardShortcut'
import { useTerm } from '@/hooks/useTerm'

import undoSvg from '@/assets/undo.svg'
import redoSvg from '@/assets/redo.svg'

interface HeaderProps {
  xpDisplay: number
  onResetXp: () => void
  onOpenSettings: () => void
  onOpenAddMonster: () => void
}

const Header: React.FC<HeaderProps> = ({
  xpDisplay,
  onResetXp,
  onOpenSettings,
  onOpenAddMonster,
}) => {
  const settings = useMonsterStore((state) => state.settings)
  const clearMonsters = useMonsterStore((state) => state.clearMonsters)
  const killAllMonsters = useMonsterStore((state) => state.killAllMonsters)
  const removeDead = useMonsterStore((state) => state.removeDead)
  const undo = useMonsterStore((state) => state.undo)
  const redo = useMonsterStore((state) => state.redo)
  const canUndo = useCanUndo()
  const canRedo = useCanRedo()

  // Translations
  const t_settings = useTerm('settings')
  const t_openSettings = useTerm('openSettings')
  const t_undo = useTerm('undo')
  const t_undoShortcut = useTerm('undoShortcut')
  const t_redo = useTerm('redo')
  const t_redoShortcut = useTerm('redoShortcut')
  const t_resetXpCounter = useTerm('resetXpCounter')
  const t_xp = useTerm('xp')
  const t_monsterCounter = useTerm('monsterCounter')
  const t_clear = useTerm('clear')
  const t_clearTooltip = useTerm('clearTooltip')
  const t_killAll = useTerm('killAll')
  const t_killAllTooltip = useTerm('killAllTooltip')
  const t_removeDead = useTerm('removeDead')
  const t_removeDeadTooltip = useTerm('removeDeadTooltip')
  const t_add = useTerm('add')
  const t_addNewMonsters = useTerm('addNewMonsters')

  // Enable keyboard shortcuts
  useUndoRedoShortcuts(undo, redo)

  return (
    <header>
      <div>
        <button className="green-button" onClick={onOpenSettings} title={t_openSettings}>
          {t_settings}
        </button>
        <button
          className="green-button"
          onClick={undo}
          disabled={!canUndo}
          title={t_undoShortcut}
          style={{
            opacity: canUndo ? 1 : 0.6,
            cursor: canUndo ? 'pointer' : 'not-allowed',
          }}
        >
          <img src={undoSvg} alt={t_undo} style={{ width: '16px', height: '16px' }} />
        </button>
        <button
          className="green-button"
          onClick={redo}
          disabled={!canRedo}
          title={t_redoShortcut}
          style={{
            opacity: canRedo ? 1 : 0.6,
            cursor: canRedo ? 'pointer' : 'not-allowed',
          }}
        >
          <img src={redoSvg} alt={t_redo} style={{ width: '16px', height: '16px' }} />
        </button>
        {settings.showXpCounter && (
          <button
            id="xp-counter"
            className="red-button transparent-button"
            title={t_resetXpCounter}
            onClick={onResetXp}
          >
            {xpDisplay} {t_xp}
          </button>
        )}
      </div>
      <h2>{t_monsterCounter}</h2>
      <div>
        <button className="red-button" onClick={clearMonsters} title={t_clearTooltip}>
          {t_clear}
        </button>
        <button className="red-button" onClick={killAllMonsters} title={t_killAllTooltip}>
          {t_killAll}
        </button>
        <button className="red-button" onClick={removeDead} title={t_removeDeadTooltip}>
          {t_removeDead}
        </button>
        <button className="green-button" onClick={onOpenAddMonster} title={t_addNewMonsters}>
          {t_add}
        </button>
      </div>
    </header>
  )
}

export default Header
