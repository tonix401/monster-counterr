import React from 'react'
import Popup from './Popup'
import { useNavigate } from 'react-router'
import { useTerm } from '@/store/index'

const CustomMonstersPopup: React.FC = () => {
  const navigate = useNavigate()
  const t = useTerm()

  return (
    <Popup onClose={() => navigate('/menu')} title={t('customMonsters')}>
      tbd
    </Popup>
  )
}

export default CustomMonstersPopup
