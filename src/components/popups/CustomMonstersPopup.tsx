import React from 'react'
import Popup from './Popup'
import { useGo } from '@/hooks/useGo'
import { useTerm } from '@/store/useMonsterStore'

const CustomMonstersPopup: React.FC = () => {
  const navigate = useGo()
  const t = useTerm()

  return (
    <Popup onClose={() => navigate('/menu')} title={t('customMonsters')}>
      tbd
    </Popup>
  )
}

export default CustomMonstersPopup
