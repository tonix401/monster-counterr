// @ts-nocheck
import React, { useEffect, useState } from 'react'
import Popup from '@/components/popups/Popup'
import { useTerm } from '@/hooks/useTerm'
import type { MonsterDetails } from '@/types/MonsterDetails'
import { useNavigate, useParams } from 'react-router'
import { ASSETS_URL } from '@/constants'

const MonsterInfoPopup: React.FC = () => {
  const navigate = useNavigate()
  const monsterId = useParams().monsterId

  const t_monsterDetailsNotFound = useTerm('monsterDetailsNotFound')
  const t_monsterDetailsCouldNotBeLoaded = useTerm('monsterDetailsCouldNotBeLoaded')
  const t_armorClass = useTerm('armorClass')
  const t_hitPoints = useTerm('hitPoints')
  const t_speed = useTerm('speed')
  const t_proficiencies = useTerm('proficiencies')
  const t_damageVulnerabilities = useTerm('damageVulnerabilities')
  const t_damageResistances = useTerm('damageResistances')
  const t_damageImmunities = useTerm('damageImmunities')
  const t_conditionImmunities = useTerm('conditionImmunities')
  const t_senses = useTerm('senses')
  const t_languages = useTerm('languages')
  const t_challengeRating = useTerm('challengeRating')
  const t_specialAbilities = useTerm('specialAbilities')
  const t_actions = useTerm('actions')
  const t_legendaryActions = useTerm('legendaryActions')
  const t_xp = useTerm('xp')

  const [monsterDetails, setMonsterDetails] = useState<null | MonsterDetails>(null)

  useEffect(() => {
    fetch(`${ASSETS_URL}/monsters/${monsterId}.json`).then((data) =>
      data.json().then((data) => {
        setMonsterDetails(data)
        console.log(data)
      })
    )
  }, [monsterId])

  if (!monsterDetails) {
    return (
      <Popup onClose={() => navigate('/')} title={t_monsterDetailsNotFound} width={400}>
        <p>{t_monsterDetailsCouldNotBeLoaded}</p>
      </Popup>
    )
  }

  return <Popup onClose={() => navigate('/')} width={1100} title={monsterDetails.name}></Popup>
}

export default MonsterInfoPopup
