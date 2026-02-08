import React from 'react'
import Popup from '@/components/popups/Popup'
import BinarySettingsRow from '@/components/ui/BinarySettingsRow'
import type { Settings } from '@/types/Settings'
import { useMonsterStore } from '@/store/MonsterStore'
import { useTerm } from '@/store/MonsterStore'
import { useNavigate } from 'react-router'
import LanguageSelectionRow from '../ui/LanguageSelectionRow'

const SettingsPopup: React.FC = () => {
  const t = useTerm()

  const settings = useMonsterStore((state) => state.settings)
  const setSetting = useMonsterStore((state) => state.setSetting)
  const handleSettingChange = (key: keyof Settings, value: boolean) => {
    setSetting(key, value)
  }
  const navigate = useNavigate()

  return (
    <Popup onClose={() => navigate('/menu')} width={500}>
      <div style={{ marginBottom: '20px', textAlign: 'center' }}>
        <strong>{t('visualSettings')}</strong>
      </div>
      <BinarySettingsRow<keyof Settings>
        settingKey="showQuickActions"
        label={t('showQuickActions')}
        value={settings.showQuickActions}
        onChange={handleSettingChange}
      />
      <BinarySettingsRow<keyof Settings>
        settingKey="showConditions"
        label={t('showConditions')}
        value={settings.showConditions}
        onChange={handleSettingChange}
      />
      <BinarySettingsRow<keyof Settings>
        settingKey="showStatus"
        label={t('showStatus')}
        value={settings.showStatus}
        onChange={handleSettingChange}
      />
      <BinarySettingsRow<keyof Settings>
        settingKey="showHealth"
        label={t('showHealth')}
        value={settings.showHealth}
        onChange={handleSettingChange}
      />
      <BinarySettingsRow<keyof Settings>
        settingKey="showChangeHp"
        label={t('showChangeHp')}
        value={settings.showChangeHp}
        onChange={handleSettingChange}
      />
      <BinarySettingsRow<keyof Settings>
        settingKey="showXpCounter"
        label={t('showXpCounter')}
        value={settings.showXpCounter}
        onChange={handleSettingChange}
      />
      <hr style={{ margin: '24px 0' }} />
      <div style={{ marginBottom: '20px', textAlign: 'center' }}>
        <strong>{t('behaviouralSettings')}</strong>
      </div>
      <BinarySettingsRow<keyof Settings>
        settingKey="autoRemoveDead"
        label={t('autoRemoveDead')}
        value={settings.autoRemoveDead}
        onChange={handleSettingChange}
      />
      <LanguageSelectionRow />
    </Popup>
  )
}

export default SettingsPopup
