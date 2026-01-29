import React from 'react'
import Popup from './Popup'
import { useNavigate } from 'react-router'
import { useTerm } from '@/hooks/useTerm'

const CustomMonstersPopup: React.FC = () => {
  const navigate = useNavigate()
  const t_customMonsters = useTerm('customMonsters')

  return (
    <Popup onClose={() => navigate(-1)}>
      <h2>{t_customMonsters}</h2>
      {/* Custom monsters management UI goes here */}
      <div style={{ marginTop: 16 }}>
        <p>Here you can manage your custom monsters. (UI TBD)</p>
      </div>
    </Popup>
  )
}

export default CustomMonstersPopup
