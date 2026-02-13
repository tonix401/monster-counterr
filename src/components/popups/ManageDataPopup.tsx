import React from 'react'
import Popup from './Popup'
import { useNavigate } from 'react-router'
import { useTerm } from '@/store/useMonsterStore'

import ExportFileButton from '../ui/ExportFileButton'
import ImportFileButton from '../ui/ImportFileButton'
import BinarySettingsRow from '@/components/ui/BinarySettingsRow'
import { useMonsterStore } from '@/store/useMonsterStore'
import { SAVE_FILE } from '@/constants'

const ManageDataPopup: React.FC = () => {
  const navigate = useNavigate()
  const t = useTerm()

  // Get statistics from store
  const monsters = useMonsterStore((state) => state.monsters)
  const settings = useMonsterStore((state) => state.settings)
  const xp = useMonsterStore((state) => state.xp)

  // Use export settings from store
  const exportSettings = useMonsterStore((state) => state.exportSettings)
  const setExportSetting = useMonsterStore((state) => state.setExportSetting)

  // Estimate save file size (minimized JSON, same as export)
  const saveData = {
    schemaVersion: SAVE_FILE.SCHEMA_VERSION,
    ...(exportSettings.includeSettings ? { settings } : {}),
    ...(exportSettings.includeCurrentXp ? { currentXp: xp } : {}),
    ...(exportSettings.includeMonsters ? { monsters } : {}),
  }
  const saveJson = exportSettings.minimizeJson
    ? JSON.stringify(saveData)
    : JSON.stringify(saveData, null, 2)
  const saveSize = new Blob([saveJson]).size

  return (
    <Popup onClose={() => navigate('/menu')} title={t('manageData')} width={520}>
      <div>
        <BinarySettingsRow
          settingKey="includeMonsters"
          label={`Include your current ${monsters.length} Monsters in the list`}
          value={exportSettings.includeMonsters}
          onChange={(_, checked) => setExportSetting('includeMonsters', checked)}
        />
        <BinarySettingsRow
          settingKey="includeSettings"
          label={t('includeSettings')}
          value={exportSettings.includeSettings}
          onChange={(_, checked) => setExportSetting('includeSettings', checked)}
        />
        <BinarySettingsRow
          settingKey="includeCurrentXp"
          label={t('includeCurrentXp')}
          value={exportSettings.includeCurrentXp}
          onChange={(_, checked) => setExportSetting('includeCurrentXp', checked)}
        />
        <BinarySettingsRow
          settingKey="minimizeJson"
          label={t('minimizeJson')}
          value={exportSettings.minimizeJson}
          onChange={(_, checked) => setExportSetting('minimizeJson', checked)}
        />
        <div style={{ margin: '1.5em', fontSize: '0.93em', color: '#888', textAlign: 'center' }}>
          {t('fileSize')} <b>{saveSize.toLocaleString('en', { maximumFractionDigits: 0 })} bytes</b>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'row', gap: '1rem', alignItems: 'center' }}>
        <ExportFileButton />
        <ImportFileButton />
      </div>
    </Popup>
  )
}

export default ManageDataPopup
