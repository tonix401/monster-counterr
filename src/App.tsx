import { useState, useEffect } from 'react'
import './App.css'
import MonsterTable from '@/components/table/MonsterTable'
import AddMonsterPopup from '@/components/popups/AddMonsterPopup'
import SettingsPopup from '@/components/popups/SettingsPopup'
import Header from '@/components/Header'
import { useMonsterStore, useMonsters, useXp, useIsLoading } from '@/store'

function App() {
  const [isAddPopupOpen, setIsAddPopupOpen] = useState(false)
  const [isSettingsPopupOpen, setIsSettingsPopupOpen] = useState(false)

  // Optimized selectors
  const monsters = useMonsters()
  const xp = useXp()
  const isLoading = useIsLoading()

  const resetXp = useMonsterStore((state) => state.resetXp)
  const initialize = useMonsterStore((state) => state.initialize)

  useEffect(() => {
    initialize()
  }, [initialize])

  if (isLoading) {
    return (
      <div className="app">
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <h2>Loading Monster Counter...</h2>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <Header
        xpDisplay={xp}
        onResetXp={resetXp}
        onOpenSettings={() => setIsSettingsPopupOpen(true)}
        onOpenAddMonster={() => setIsAddPopupOpen(true)}
      />
      <div id="monsterList">
        <MonsterTable monsters={monsters} />
      </div>
      <AddMonsterPopup isOpen={isAddPopupOpen} onClose={() => setIsAddPopupOpen(false)} />
      <SettingsPopup isOpen={isSettingsPopupOpen} onClose={() => setIsSettingsPopupOpen(false)} />
    </div>
  )
}

export default App
