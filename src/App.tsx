import { useState, useEffect } from 'react';
import './App.css';
import MonsterTable from './components/MonsterTable';
import AddMonsterPopup from './components/AddMonsterPopup';
import SettingsPopup from './components/SettingsPopup';
import Header from './components/Header';
import { useMonsterStore, useMonsters, useXp, useIsLoading } from './store';
import { useXpAnimation } from './hooks/useXpAnimation';
import { ANIMATION_DURATION } from './constants';

function App() {
  const [isAddPopupOpen, setIsAddPopupOpen] = useState(false);
  const [isSettingsPopupOpen, setIsSettingsPopupOpen] = useState(false);

  // Optimized selectors
  const monsters = useMonsters();
  const xp = useXp();
  const isLoading = useIsLoading();
  
  const resetXp = useMonsterStore((state) => state.resetXp);
  const initialize = useMonsterStore((state) => state.initialize);

  const { displayXp, animateXpCounter } = useXpAnimation(xp);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const handleResetXp = () => {
    animateXpCounter(displayXp, 0, ANIMATION_DURATION.XP_RESET);
    resetXp();
  };

  if (isLoading) {
    return (
      <div className="app">
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <h2>Loading Monster Counter...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <Header
        xpDisplay={displayXp}
        onResetXp={handleResetXp}
        onOpenSettings={() => setIsSettingsPopupOpen(true)}
        onOpenAddMonster={() => setIsAddPopupOpen(true)}
      />
      <div id="monsterList">
        <MonsterTable monsters={monsters} />
      </div>

      {/* Popups */}
      <AddMonsterPopup
        isOpen={isAddPopupOpen}
        onClose={() => setIsAddPopupOpen(false)}
      />

      <SettingsPopup
        isOpen={isSettingsPopupOpen}
        onClose={() => setIsSettingsPopupOpen(false)}
      />
    </div>
  );
}

export default App;
