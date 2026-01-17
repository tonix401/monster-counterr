import React from 'react'
import Popup from '@/components/popups/Popup'
import SettingsRow from '@/components/SettingsRow'
import ImportFileButton from '@/components/ui/ImportFileButton'
import type { Settings } from '@/types/Settings'
import { useMonsterStore } from '@/store'
import { useTerm } from '@/hooks/useTerm'
import ExportFileButton from '../ui/ExportFileButton'

interface SettingsPopupProps {
  isOpen: boolean
  onClose: () => void
}

const SettingsPopup: React.FC<SettingsPopupProps> = ({ isOpen, onClose }) => {
  const t_showQuickActions = useTerm('showQuickActions')
  const t_showConditions = useTerm('showConditions')
  const t_showStatus = useTerm('showStatus')
  const t_showHealth = useTerm('showHealth')
  const t_showChangeHp = useTerm('showChangeHp')
  const t_showXpCounter = useTerm('showXpCounter')
  const t_autoRemoveDead = useTerm('autoRemoveDead')
  const t_visualSettings = useTerm('visualSettings')
  const t_behaviouralSettings = useTerm('behaviouralSettings')
  const t_manageSaveFiles = useTerm('manageSaveFiles')

  const settings = useMonsterStore((state) => state.settings)
  const setSetting = useMonsterStore((state) => state.setSetting)
  const handleSettingChange = (key: keyof Settings, value: boolean) => {
    setSetting(key, value)
  }

  return (
    <Popup isOpen={isOpen} onClose={onClose} width={500}>
      <div style={{ marginBottom: '20px', textAlign: 'center' }}>
        <strong>{t_visualSettings}</strong>
      </div>
      <SettingsRow
        settingKey="showQuickActions"
        label={t_showQuickActions}
        value={settings.showQuickActions}
        onChange={handleSettingChange}
      />
      <SettingsRow
        settingKey="showConditions"
        label={t_showConditions}
        value={settings.showConditions}
        onChange={handleSettingChange}
      />
      <SettingsRow
        settingKey="showStatus"
        label={t_showStatus}
        value={settings.showStatus}
        onChange={handleSettingChange}
      />
      <SettingsRow
        settingKey="showHealth"
        label={t_showHealth}
        value={settings.showHealth}
        onChange={handleSettingChange}
      />
      <SettingsRow
        settingKey="showChangeHp"
        label={t_showChangeHp}
        value={settings.showChangeHp}
        onChange={handleSettingChange}
      />
      <SettingsRow
        settingKey="showXpCounter"
        label={t_showXpCounter}
        value={settings.showXpCounter}
        onChange={handleSettingChange}
      />
      <hr style={{ margin: '24px 0' }} />
      <div style={{ marginBottom: '20px', textAlign: 'center' }}>
        <strong>{t_behaviouralSettings}</strong>
      </div>
      <SettingsRow
        settingKey="autoRemoveDead"
        label={t_autoRemoveDead}
        value={settings.autoRemoveDead}
        onChange={handleSettingChange}
      />
      <hr style={{ margin: '24px 0' }} />
      <div style={{ marginBottom: '20px', textAlign: 'center' }}>
        <strong>{t_manageSaveFiles}</strong>
      </div>
      <div
        style={{
          display: 'flex',
          gap: '10px',
          justifyContent: 'center',
        }}
      >
        <ImportFileButton />
        <ExportFileButton />
      </div>
    </Popup>
  )
}

export default SettingsPopup
