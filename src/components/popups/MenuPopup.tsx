import React from 'react'
import { useNavigate } from 'react-router'
import Popup from './Popup'
import { useTerm } from '@/store/useMonsterStore'
import { ASSETS } from '@/constants'
import './MenuPopup.css'

const MenuPopup: React.FC = () => {
  const navigate = useNavigate()
  const t = useTerm()

  return (
    <Popup onClose={() => navigate('/')} title={t('menu')} width={520}>
      <div className="menu-popup-content">
        <button className="icon-button purple-button" onClick={() => navigate('/settings')}>
          <img src={ASSETS.SETTINGS_ICON} alt={t('settings')} />
          {t('settings')}
        </button>
        <button className="icon-button purple-button" onClick={() => navigate('/manage-data')}>
          <img src={ASSETS.DATA_ICON} alt={t('manageData')} />
          {t('manageData')}
        </button>
        <button className="icon-button purple-button" onClick={() => navigate('/connections')}>
          <img src={ASSETS.RADIO_ICON} alt={t('connections')} />
          {t('connections')}
        </button>
        <button className="icon-button purple-button" onClick={() => navigate('/custom-monsters')}>
          <img src={ASSETS.ADD_ICON} alt={t('customMonsters')} />
          {t('customMonsters')}
        </button>
      </div>
    </Popup>
  )
}

export default MenuPopup
