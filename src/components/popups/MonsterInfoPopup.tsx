// @ts-nocheck
import React, { useEffect, useState } from 'react'
import Popup from '@/components/popups/Popup'
import { useTerm } from '@/store/index'
import type { MonsterDetails } from '@/types/MonsterDetails'
import { useNavigate, useParams } from 'react-router'
import { BASE_URL } from '@/constants'
import './MonsterInfoPopup.css'

const MonsterInfoPopup: React.FC = () => {
  const navigate = useNavigate()
  const monsterId = useParams().monsterId
  const t = useTerm()

  const [monsterDetails, setMonsterDetails] = useState<null | MonsterDetails>(null)

  useEffect(() => {
    fetch(`${BASE_URL}/monsters/${monsterId}.json`).then((data) =>
      data.json().then((data) => {
        setMonsterDetails(data)
        console.log(data)
      })
    )
  }, [monsterId])

  if (!monsterDetails) {
    return (
      <Popup onClose={() => navigate('/')} width={1100} title={t('monsterDetailsNotFound')}>
        <p>{t('monsterDetailsCouldNotBeLoaded')}</p>
      </Popup>
    )
  }

  const getModifier = (score: number): string => {
    const mod = Math.floor((score - 10) / 2)
    return mod >= 0 ? `+${mod}` : `${mod}`
  }

  const formatType = () => {
    const sizeStr = monsterDetails.size?.join(', ')
    const typeStr =
      typeof monsterDetails.type === 'string'
        ? monsterDetails?.type
        : `${monsterDetails?.type}${monsterDetails.type?.tags ? ` (${monsterDetails.type?.tags?.join(', ')})` : ''}`
    const alignmentStr = monsterDetails.alignment?.join(', ') || 'Unaligned'
    return `${sizeStr} ${typeStr}, ${monsterDetails.alignmentPrefix || ''}${alignmentStr}`
  }

  const formatAC = () => {
    return monsterDetails.ac
      ?.map((ac) => {
        if (typeof ac === 'number') return ac
        const fromStr = ac.from ? ` (${ac.from?.join(', ')})` : ''
        const condStr = ac.condition ? ` ${ac.condition}` : ''
        return `${ac.ac}${fromStr}${condStr}`
      })
      .join(', ')
  }

  const formatSpeed = () => {
    return Object.entries(monsterDetails.speed || {})
      .map(([key, value]) => `${key} ${value}${typeof value === 'number' ? ' ft.' : ''}`)
      .join(', ')
  }

  const getCR = () => {
    if (typeof monsterDetails.cr === 'object') return monsterDetails.cr?.cr
    return monsterDetails.cr
  }

  const formatLanguages = () => {
    if (!monsterDetails.languages) return '—'
    if (Array.isArray(monsterDetails.languages)) return monsterDetails.languages.join(', ')
    return monsterDetails.languages
  }

  const renderAbilityBlock = (name: string, entries: string[]) => {
    return (
      <div className="ability-block" key={name}>
        <strong>{name}.</strong>{' '}
        {entries.map((entry, i) => (
          <span
            key={i}
            dangerouslySetInnerHTML={{ __html: entry.replace(/{@\w+ ([^}]+)}/g, '$1') }}
          />
        ))}
      </div>
    )
  }

  return (
    <Popup onClose={() => navigate('/')} width={1100} title={monsterDetails.name}>
      <div className="monster-details">
        <div className="stat-block">
          <div className="creature-heading">
            <h1>{monsterDetails.name}</h1>
            <h2>{formatType()}</h2>
          </div>

          <div className="top-stats">
            <div className="property-line">
              <strong>Armor Class:</strong> {formatAC()}
            </div>
            <div className="property-line">
              <strong>Hit Points:</strong> {monsterDetails.hp?.average} (
              {monsterDetails.hp?.formula})
            </div>
            <div className="property-line">
              <strong>Speed:</strong> {formatSpeed()}
            </div>
          </div>

          <div className="abilities">
            <div className="ability-score">
              <strong>STR</strong>
              <span>
                {monsterDetails.str} ({getModifier(monsterDetails.str)})
              </span>
            </div>
            <div className="ability-score">
              <strong>DEX</strong>
              <span>
                {monsterDetails.dex} ({getModifier(monsterDetails.dex)})
              </span>
            </div>
            <div className="ability-score">
              <strong>CON</strong>
              <span>
                {monsterDetails.con} ({getModifier(monsterDetails.con)})
              </span>
            </div>
            <div className="ability-score">
              <strong>INT</strong>
              <span>
                {monsterDetails.int} ({getModifier(monsterDetails.int)})
              </span>
            </div>
            <div className="ability-score">
              <strong>WIS</strong>
              <span>
                {monsterDetails.wis} ({getModifier(monsterDetails.wis)})
              </span>
            </div>
            <div className="ability-score">
              <strong>CHA</strong>
              <span>
                {monsterDetails.cha} ({getModifier(monsterDetails.cha)})
              </span>
            </div>
          </div>

          {monsterDetails.save && (
            <div className="property-line">
              <strong>Saving Throws:</strong>{' '}
              {Object.entries(monsterDetails.save)
                .map(([key, val]) => `${key.toUpperCase()} ${val}`)
                .join(', ')}
            </div>
          )}

          {monsterDetails.skill && (
            <div className="property-line">
              <strong>Skills:</strong>{' '}
              {Object.entries(monsterDetails.skill)
                .map(([key, val]) => `${key.charAt(0).toUpperCase() + key.slice(1)} ${val}`)
                .join(', ')}
            </div>
          )}

          {monsterDetails.vulnerable && monsterDetails.vulnerable.length > 0 && (
            <div className="property-line">
              <strong>Damage Vulnerabilities:</strong> {monsterDetails.vulnerable.join(', ')}
            </div>
          )}

          {monsterDetails.resist && monsterDetails.resist.length > 0 && (
            <div className="property-line">
              <strong>Damage Resistances:</strong> {monsterDetails.resist.join(', ')}
            </div>
          )}

          {monsterDetails.immune && monsterDetails.immune.length > 0 && (
            <div className="property-line">
              <strong>Damage Immunities:</strong> {monsterDetails.immune.join(', ')}
            </div>
          )}

          {monsterDetails.conditionImmune && monsterDetails.conditionImmune.length > 0 && (
            <div className="property-line">
              <strong>Condition Immunities:</strong>{' '}
              {monsterDetails.conditionImmune
                .map((c) => (typeof c === 'string' ? c : c.name))
                .join(', ')}
            </div>
          )}

          {monsterDetails.senses && (
            <div className="property-line">
              <strong>Senses:</strong> {monsterDetails.senses.join(', ')}, passive Perception{' '}
              {monsterDetails.passive}
            </div>
          )}

          <div className="property-line">
            <strong>Languages:</strong> {formatLanguages()}
          </div>

          <div className="property-line">
            <strong>Challenge:</strong> {getCR()}
          </div>

          {monsterDetails.spellcasting && monsterDetails.spellcasting.length > 0 && (
            <div className="section">
              {monsterDetails.spellcasting.map((spell, i) => (
                <div key={i} className="ability-block">
                  <strong>{spell.name}.</strong> {spell.headerEntries?.join(' ')}
                  {spell.will && (
                    <div>
                      <em>At will:</em>{' '}
                      {spell.will.join(', ').replace(/{@spell ([^}|]+)(\|[^}]+)?}/g, '$1')}
                    </div>
                  )}
                  {spell.daily &&
                    Object.entries(spell.daily).map(([uses, spells]) => (
                      <div key={uses}>
                        <em>{uses.replace('e', '/day each')}:</em>{' '}
                        {spells.join(', ').replace(/{@spell ([^}|]+)(\|[^}]+)?}/g, '$1')}
                      </div>
                    ))}
                  {spell.spells &&
                    Object.entries(spell.spells).map(([level, data]) => (
                      <div key={level}>
                        <em>
                          {level === '0'
                            ? 'Cantrips (at will)'
                            : `${level}${level === '1' ? 'st' : level === '2' ? 'nd' : level === '3' ? 'rd' : 'th'} level`}
                          {data.slots ? ` (${data.slots} slots)` : ''}:
                        </em>{' '}
                        {data.spells.join(', ').replace(/{@spell ([^}|]+)(\|[^}]+)?}/g, '$1')}
                      </div>
                    ))}
                </div>
              ))}
            </div>
          )}

          {monsterDetails.trait && monsterDetails.trait.length > 0 && (
            <div className="section">
              {monsterDetails.trait.map((t) => renderAbilityBlock(t.name, t.entries))}
            </div>
          )}

          {monsterDetails.action && monsterDetails.action.length > 0 && (
            <div className="section">
              <h3>Actions</h3>
              {monsterDetails.action.map((a) => renderAbilityBlock(a.name, a.entries))}
            </div>
          )}

          {monsterDetails.bonus && monsterDetails.bonus.length > 0 && (
            <div className="section">
              <h3>Bonus Actions</h3>
              {monsterDetails.bonus.map((b) => renderAbilityBlock(b.name, b.entries))}
            </div>
          )}

          {monsterDetails.reaction && monsterDetails.reaction.length > 0 && (
            <div className="section">
              <h3>Reactions</h3>
              {monsterDetails.reaction.map((r) => renderAbilityBlock(r.name, r.entries))}
            </div>
          )}

          {monsterDetails.legendary && monsterDetails.legendary.length > 0 && (
            <div className="section">
              <h3>Legendary Actions</h3>
              {monsterDetails.legendaryActionsLair && (
                <p>
                  The {monsterDetails.name.toLowerCase()} can take{' '}
                  {monsterDetails.legendaryActionsLair} legendary actions, choosing from the options
                  below. Only one legendary action option can be used at a time and only at the end
                  of another creature's turn. The {monsterDetails.name.toLowerCase()} regains spent
                  legendary actions at the start of its turn.
                </p>
              )}
              {monsterDetails.legendary.map((l) => renderAbilityBlock(l.name, l.entries))}
            </div>
          )}
        </div>
      </div>
    </Popup>
  )
}

export default MonsterInfoPopup
