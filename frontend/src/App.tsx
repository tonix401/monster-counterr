import { useEffect, useState } from 'react'
import './App.css'
import MonsterTable from '@/components/table/MonsterTable'
import AddMonsterPopup from '@/components/popups/AddMonsterPopup'
import SettingsPopup from '@/components/popups/settingsPopup/SettingsPopup'
import Header from '@/components/Header'
import { useMonsterStore, useMonsters, useXp, useIsLoading } from '@/store'

function App() {
  const [isAddPopupOpen, setIsAddPopupOpen] = useState(false)
  const [isSettingsPopupOpen, setIsSettingsPopupOpen] = useState(false)

  const initialize = useMonsterStore((state) => state.initialize)

  useEffect(() => {
    initialize()
  }, [initialize])

  const xp = useXp()
  const monsters = useMonsters()
  const isLoading = useIsLoading()

  const resetXp = useMonsterStore((state) => state.resetXp)

  if (isLoading) {
    return (
      <div className="app">
        <div className="skeleton-header">
          <div className="skeleton-header-left">
            <div className="skeleton skeleton-header-button"></div>
            <div className="skeleton skeleton-header-button"></div>
          </div>
          <div className="skeleton skeleton-header-title"></div>
          <div className="skeleton-header-left">
            <div className="skeleton skeleton-header-button"></div>
            <div className="skeleton skeleton-header-button"></div>
          </div>
        </div>
        <div className="skeleton-table">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="skeleton-table-row">
              <div className="skeleton skeleton-table-cell"></div>
              <div className="skeleton skeleton-table-cell small"></div>
              <div className="skeleton skeleton-table-cell small"></div>
              <div className="skeleton skeleton-table-cell small"></div>
              <div className="skeleton skeleton-table-cell"></div>
              <div className="skeleton skeleton-table-cell small"></div>
            </div>
          ))}
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
