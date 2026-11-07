import React from 'react'
import Popup from '@/components/popups/Popup'
import { useParams } from 'react-router'
import { useGo } from '@/hooks/useGo'
import './MonsterInfoPopup.css'

const MonsterInfoPopup: React.FC = () => {
  const navigate = useGo()
  const monsterId = useParams().monsterId

  return (
    <Popup onClose={() => navigate('/')} width={1100}>
      <iframe id="monster-info-iframe" src={`https://5e.tools/bestiary/${monsterId}.html`}></iframe>
      <a
        id="monster-info-link"
        href={`https://5e.tools/bestiary/${monsterId}.html`}
        target="_blank"
        rel="noopener noreferrer"
      >
        {monsterId}@<strong>5e.tools</strong>
      </a>
    </Popup>
  )
}

export default MonsterInfoPopup
