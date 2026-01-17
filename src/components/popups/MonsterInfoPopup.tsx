import React from 'react'
import Popup from '@/components/popups/Popup'
import { useTerm } from '@/hooks/useTerm'
import type { MonsterDetails } from '@/types/MonsterDetails'

interface MonsterInfoPopupProps {
  isOpen: boolean
  onClose: () => void
  monsterDetails: MonsterDetails | null
}

const MonsterInfoPopup: React.FC<MonsterInfoPopupProps> = ({ isOpen, onClose, monsterDetails }) => {
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

  if (!monsterDetails) {
    return (
      <Popup isOpen={isOpen} onClose={onClose} title={t_monsterDetailsNotFound} width={400}>
        <p>{t_monsterDetailsCouldNotBeLoaded}</p>
      </Popup>
    )
  }

  const createAttributeRow = (attrName: string, attrValue: any, column: boolean = false) => {
    if (attrValue !== 0 && !attrValue) return null
    return (
      <div className={`attribute-row ${column ? 'attribute-column' : ''}`} key={attrName}>
        <strong>
          <i>{attrName}</i>
        </strong>
        <span>{attrValue}</span>
      </div>
    )
  }

  return (
    <Popup isOpen={isOpen} onClose={onClose} width={1100}>
      <div className="monster-name-picture-area">
        <div className="monster-name-area">
          <h2 style={{ textAlign: 'left' }}>{monsterDetails.name}</h2>
          <span>
            {monsterDetails.size} {monsterDetails.type}, {monsterDetails.alignment}
          </span>
        </div>
        <img
          src={`https://dnd5eapi.co${monsterDetails.image}`}
          alt={monsterDetails.name}
          className="monster-image"
        />
      </div>
      <hr />

      {/* Main Info */}
      <div>
        {createAttributeRow(t_armorClass, monsterDetails.armor_class[0].value)}
        {createAttributeRow(t_hitPoints, monsterDetails.hit_points)}
        {createAttributeRow(
          t_speed,
          Object.entries(monsterDetails.speed)
            .map(([type, val]) => `${type}: ${val}`)
            .join(', ')
        )}
      </div>
      <hr />

      {/* Attributes */}
      <div className="attribute-area">
        {['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'].map((attr, index) => {
          const key = [
            'strength',
            'dexterity',
            'constitution',
            'intelligence',
            'wisdom',
            'charisma',
          ][index]
          const attrValue = (monsterDetails as any)[key]
          const modifier = Math.floor((attrValue - 10) / 2)
          return (
            <div key={attr}>
              {createAttributeRow(
                attr,
                `${attrValue} (${modifier >= 0 ? '+' : ''}${modifier})`,
                true
              )}
            </div>
          )
        })}
      </div>
      <hr />

      {/* More Info */}
      {monsterDetails.proficiencies.length > 0 &&
        createAttributeRow(
          t_proficiencies,
          monsterDetails.proficiencies
            .map((prof) => `${prof.proficiency.name}: +${prof.value}`)
            .join(', ')
        )}
      {monsterDetails.damage_vulnerabilities.length > 0 &&
        createAttributeRow(
          t_damageVulnerabilities,
          monsterDetails.damage_vulnerabilities.join(', ')
        )}
      {monsterDetails.damage_resistances.length > 0 &&
        createAttributeRow(t_damageResistances, monsterDetails.damage_resistances.join(', '))}
      {monsterDetails.damage_immunities.length > 0 &&
        createAttributeRow(t_damageImmunities, monsterDetails.damage_immunities.join(', '))}
      {monsterDetails.condition_immunities.length > 0 &&
        createAttributeRow(
          t_conditionImmunities,
          monsterDetails.condition_immunities.map((ci) => ci.name).join(', ')
        )}
      {createAttributeRow(
        t_senses,
        Object.entries(monsterDetails.senses)
          .map(([sense, val]) => `${sense.replace(/_/g, ' ')}: ${val}`)
          .join(', ')
      )}
      {createAttributeRow(t_languages, monsterDetails.languages)}
      {createAttributeRow(
        t_challengeRating,
        `${monsterDetails.challenge_rating} (${monsterDetails.xp} ${t_xp})`
      )}

      {/* Special Abilities */}
      {monsterDetails.special_abilities.length > 0 && (
        <>
          <hr />
          <h3>{t_specialAbilities}</h3>
          {monsterDetails.special_abilities.map((ability) =>
            createAttributeRow(ability.name, ability.desc)
          )}
        </>
      )}

      {/* Actions */}
      {monsterDetails.actions.length > 0 && (
        <>
          <hr />
          <h3>{t_actions}</h3>
          {monsterDetails.actions.map((action) => createAttributeRow(action.name, action.desc))}
        </>
      )}

      {/* Legendary Actions */}
      {monsterDetails.legendary_actions.length > 0 && (
        <>
          <hr />
          <h3>{t_legendaryActions}</h3>
          {monsterDetails.legendary_actions.map((action) =>
            createAttributeRow(action.name, action.desc)
          )}
        </>
      )}
    </Popup>
  )
}

export default MonsterInfoPopup
