import React from 'react'
import { useNavigate } from 'react-router'
import Popup from './Popup'
import { useTerm } from '@/store/index'

const MenuPopup: React.FC = () => {
  const navigate = useNavigate()
  const t = useTerm()

  return (
    <Popup onClose={() => navigate('/')} title={t('menu')} width={520}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: 220 }}>
        <button className="green-button" onClick={() => navigate('/settings')}>
          {t('settings')}
        </button>
        <button className="green-button" onClick={() => navigate('/manage-data')}>
          {t('manageData')}
        </button>
        <button className="green-button" onClick={() => navigate('/connections')}>
          {t('connections')}
        </button>
        <button className="green-button" onClick={() => navigate('/custom-monsters')}>
          {t('customMonsters')}
        </button>
      </div>
    </Popup>
  )
}

export default MenuPopup
