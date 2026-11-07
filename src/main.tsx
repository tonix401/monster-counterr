import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Routes, Route, Navigate } from 'react-router'
import './index.css'
import App from '@/App'
import AddMonsterPopup from '@/components/popups/AddMonsterPopup'
import SettingsPopup from '@/components/popups/SettingsPopup'
import MenuPopup from '@/components/popups/MenuPopup'
import CustomMonstersPopup from '@/components/popups/CustomMonstersPopup'
import ManageDataPopup from '@/components/popups/ManageDataPopup'
import MapLibraryPopup from '@/components/popups/MapLibraryPopup'
import ConnectionsPopup from '@/components/popups/ConnectionsPopup'
import MonsterInfoPopup from '@/components/popups/MonsterInfoPopup'
import ClientView from '@/client_app/ClientView'
import { startMapSync } from '@/map/mapSync'

startMapSync()

const popupRoutes = [
  <Route key="add" path="add" element={<AddMonsterPopup />} />,
  <Route key="settings" path="settings" element={<SettingsPopup />} />,
  <Route key="monsters" path="monsters/:monsterId" element={<MonsterInfoPopup />} />,
  <Route key="menu" path="menu" element={<MenuPopup />} />,
  <Route key="connections" path="connections" element={<ConnectionsPopup />} />,
  <Route key="custom-monsters" path="custom-monsters" element={<CustomMonstersPopup />} />,
  <Route key="maps" path="maps" element={<MapLibraryPopup />} />,
  <Route key="manage-data" path="manage-data" element={<ManageDataPopup />} />,
]

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<App />}>
          {popupRoutes}
          {/* The map tab is drawn by App itself; its popups sit under /map so it stays behind them */}
          <Route path="map" element={null}>
            {popupRoutes}
          </Route>
        </Route>
        <Route path="client" element={<ClientView />}>
          <Route path="map" element={null} />
          <Route path="settings" element={null} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  </StrictMode>
)
