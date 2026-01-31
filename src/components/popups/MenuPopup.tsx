import React from 'react'
import { useNavigate } from 'react-router'
import Popup from './Popup'
import { useTerm } from '@/store/index'

const MenuPopup: React.FC = () => {
  const navigate = useNavigate()
  const t_settings = useTerm('settings')
  const t_manageData = useTerm('manageData')
  const t_customMonsters = useTerm('customMonsters')

  return (
    <Popup onClose={() => navigate('/')} title="Menu" width={520}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: 220 }}>
        <button className="green-button" onClick={() => navigate('/settings')}>
          {t_settings}
        </button>
        <button className="green-button" onClick={() => navigate('/manage-data')}>
          {t_manageData}
        </button>
        <button className="green-button" onClick={() => navigate('/custom-monsters')}>
          {t_customMonsters}
        </button>
      </div>
    </Popup>
  )
}

export default MenuPopup
