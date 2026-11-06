import { useEffect } from 'react'
import { Outlet, useMatch } from 'react-router'
import './App.css'
import MonsterTable from '@/components/table/MonsterTable'
import Header from '@/components/Header'
import TabBar from '@/components/ui/TabBar'
import MapTab from '@/components/map/MapTab'
import { useMonsterStore, useIsLoading, useTerm } from '@/store/useMonsterStore'
import { NotificationContainer } from './components/ui/NotificationsContainer'
import ErrorBoundary from './components/ErrorBoundary'
import { ASSETS } from './constants'

function App() {
  const initialize = useMonsterStore((state) => state.initialize)

  useEffect(() => {
    initialize()
  }, [initialize])

  const t = useTerm()
  const onMapTab = useMatch('/map') !== null

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
    <div className={`app ${onMapTab ? 'app-wide' : ''}`}>
      <Header />
      <TabBar
        tabs={[
          { to: '/', label: t('encounter'), icon: 'encounter', end: true },
          { to: '/map', label: t('map'), icon: 'map' },
        ]}
      />
      {onMapTab ? (
        <ErrorBoundary>
          <MapTab />
        </ErrorBoundary>
      ) : (
        <div id="monsterList">
          <ErrorBoundary>
            <MonsterTable />
          </ErrorBoundary>
        </div>
      )}
      <Outlet />
      <NotificationContainer />
      <a href="https://buymeacoffee.com/tonix401" className="coffee-link" target="_blank">
        <img src={ASSETS.COFFEE} alt="Buy me a coffee" />
        {t('buyCoffee')}
      </a>
    </div>
  )
}

export default App
