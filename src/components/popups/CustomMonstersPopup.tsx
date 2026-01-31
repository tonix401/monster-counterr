import React from 'react'
import Popup from './Popup'
import { useNavigate } from 'react-router'
import { useTerm } from '@/store/index'

const CustomMonstersPopup: React.FC = () => {
  const navigate = useNavigate()
  const t_customMonsters = useTerm('customMonsters')

  return (
    <Popup onClose={() => navigate('/menu')} title={t_customMonsters}>
      tbd
    </Popup>
  )
}

export default CustomMonstersPopup
