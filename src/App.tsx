import { useEffect } from 'react'
import { Outlet } from 'react-router'
import './App.css'
import MonsterTable from '@/components/table/MonsterTable'
import Header from '@/components/Header'
import { useMonsterStore, useIsLoading } from '@/store/MonsterStore'
import { NotificationContainer } from './components/ui/NotificationsContainer'

function App() {
  const initialize = useMonsterStore((state) => state.initialize)

  useEffect(() => {
    initialize()
  }, [initialize])

  const isLoading = useIsLoading()

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
      <Header />
      <div id="monsterList">
        <MonsterTable />
      </div>
      <Outlet />
      <NotificationContainer />
    </div>
  )
}

export default App
