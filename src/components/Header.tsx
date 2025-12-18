import React from 'react';
import { useMonsterStore, useCanUndo, useCanRedo } from '../store';
import { useUndoRedoShortcuts } from '../hooks/useKeyboardShortcut';

interface HeaderProps {
  xpDisplay: number;
  onResetXp: () => void;
  onOpenSettings: () => void;
  onOpenAddMonster: () => void;
}

const Header: React.FC<HeaderProps> = ({
  xpDisplay,
  onResetXp,
  onOpenSettings,
  onOpenAddMonster,
}) => {
  const settings = useMonsterStore((state) => state.settings);
  const clearMonsters = useMonsterStore((state) => state.clearMonsters);
  const killAllMonsters = useMonsterStore((state) => state.killAllMonsters);
  const removeDead = useMonsterStore((state) => state.removeDead);
  const undo = useMonsterStore((state) => state.undo);
  const redo = useMonsterStore((state) => state.redo);
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();

  // Enable keyboard shortcuts
  useUndoRedoShortcuts(undo, redo);

  return (
    <header>
      <div>
        <button
          className="green-button"
          onClick={onOpenSettings}
          title="Open Settings"
        >
          Settings
        </button>
        <button
          className="green-button"
          onClick={undo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          style={{ opacity: canUndo ? 1 : 0.5 }}
        >
          ↶ Undo
        </button>
        <button
          className="green-button"
          onClick={redo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
          style={{ opacity: canRedo ? 1 : 0.5 }}
        >
          ↷ Redo
        </button>
        {settings.showXpCounter && (
          <button
            id="xp-counter"
            className="red-button transparent-button"
            title="Reset XP Counter"
            onClick={onResetXp}
          >
            {xpDisplay} XP
          </button>
        )}
      </div>
      <h2>Monster Counter</h2>
      <div>
        <button
          className="red-button"
          onClick={clearMonsters}
          title="Clear all Monsters without applying XP"
        >
          Clear
        </button>
        <button
          className="red-button"
          onClick={killAllMonsters}
          title="Kill all Monsters and apply XP"
        >
          Kill All
        </button>
        <button
          className="red-button"
          onClick={removeDead}
          title="Remove all dead Monsters"
        >
          Remove Dead
        </button>
        <button
          className="green-button"
          onClick={onOpenAddMonster}
          title="Add new Monsters"
        >
          Add
        </button>
      </div>
    </header>
  );
};

export default Header;
