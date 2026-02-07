import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router'
import './index.css'
import App from '@/App.tsx'
import AddMonsterPopup from '@/components/popups/AddMonsterPopup'
import SettingsPopup from '@/components/popups/SettingsPopup'
import MenuPopup from '@/components/popups/MenuPopup'
import CustomMonstersPopup from '@/components/popups/CustomMonstersPopup'
import ManageDataPopup from '@/components/popups/ManageDataPopup'
import ConnectionsPopup from '@/components/popups/ConnectionsPopup'
import MonsterInfoPopup from './components/popups/MonsterInfoPopup'
import ClientView from './components/ClientView'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename="/monster-counterr">
      <Routes>
        <Route path="/" element={<App />}>
          <Route path="add" element={<AddMonsterPopup />} />
          <Route path="settings" element={<SettingsPopup />} />
          <Route path="monsters/:monsterId" element={<MonsterInfoPopup />} />
          <Route path="menu" element={<MenuPopup />} />
          <Route path="connections" element={<ConnectionsPopup />} />
          <Route path="custom-monsters" element={<CustomMonstersPopup />} />
          <Route path="manage-data" element={<ManageDataPopup />} />
        </Route>
        <Route path="/client" element={<ClientView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
)
