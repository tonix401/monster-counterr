import React from 'react';
import Popup from './Popup';
import type { MonsterDetails } from '../types/MonsterDetails';

interface MonsterInfoPopupProps {
  isOpen: boolean;
  onClose: () => void;
  monsterDetails: MonsterDetails | null;
}

const MonsterInfoPopup: React.FC<MonsterInfoPopupProps> = ({ isOpen, onClose, monsterDetails }) => {
  if (!monsterDetails) {
    return (
      <Popup isOpen={isOpen} onClose={onClose} title="Monster details not found" width={400}>
        <p>Monster details could not be loaded.</p>
      </Popup>
    );
  }

  const createAttributeRow = (attrName: string, attrValue: any, column: boolean = false) => {
    if (attrValue !== 0 && !attrValue) return null;
    return (
      <div className={`attribute-row ${column ? 'attribute-column' : ''}`} key={attrName}>
        <strong>{attrName}</strong>
        <span>{attrValue}</span>
      </div>
    );
  };

  return (
    <Popup isOpen={isOpen} onClose={onClose} width={1100}>
      {/* Name and Picture Area */}
      <div className="monster-name-picture-area">
        <div className="monster-name-area">
          <h2>{monsterDetails.name}</h2>
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
        {createAttributeRow('Armor Class:', monsterDetails.armor_class[0].value)}
        {createAttributeRow('Hit Points:', monsterDetails.hit_points)}
        {createAttributeRow(
          'Speed:',
          Object.entries(monsterDetails.speed)
            .map(([type, val]) => `${type}: ${val}`)
            .join(', ')
        )}
      </div>
      <hr />

      {/* Attributes */}
      <div className="attribute-area">
        {['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'].map((attr, index) => {
          const key = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'][index];
          const attrValue = (monsterDetails as any)[key];
          const modifier = Math.floor((attrValue - 10) / 2);
          return (
            <div key={attr}>
              {createAttributeRow(attr, `${attrValue} (${modifier >= 0 ? '+' : ''}${modifier})`, true)}
            </div>
          );
        })}
      </div>
      <hr />

      {/* More Info */}
      {monsterDetails.proficiencies.length > 0 &&
        createAttributeRow(
          'Proficiencies: ',
          monsterDetails.proficiencies.map((prof) => `${prof.proficiency.name}: +${prof.value}`).join(', ')
        )}
      {monsterDetails.damage_vulnerabilities.length > 0 &&
        createAttributeRow('Damage Vulnerabilities: ', monsterDetails.damage_vulnerabilities.join(', '))}
      {monsterDetails.damage_resistances.length > 0 &&
        createAttributeRow('Damage Resistances: ', monsterDetails.damage_resistances.join(', '))}
      {monsterDetails.damage_immunities.length > 0 &&
        createAttributeRow('Damage Immunities: ', monsterDetails.damage_immunities.join(', '))}
      {monsterDetails.condition_immunities.length > 0 &&
        createAttributeRow(
          'Condition Immunities: ',
          monsterDetails.condition_immunities.map((ci) => ci.name).join(', ')
        )}
      {createAttributeRow(
        'Senses: ',
        Object.entries(monsterDetails.senses)
          .map(([sense, val]) => `${sense.replace(/_/g, ' ')}: ${val}`)
          .join(', ')
      )}
      {createAttributeRow('Languages: ', monsterDetails.languages)}
      {createAttributeRow(
        'Challenge Rating: ',
        `${monsterDetails.challenge_rating} (${monsterDetails.xp} XP)`
      )}

      {/* Special Abilities */}
      {monsterDetails.special_abilities.length > 0 && (
        <>
          <hr />
          <h3>Special Abilities</h3>
          {monsterDetails.special_abilities.map((ability) =>
            createAttributeRow(ability.name, ability.desc)
          )}
        </>
      )}

      {/* Actions */}
      {monsterDetails.actions.length > 0 && (
        <>
          <hr />
          <h3>Actions</h3>
          {monsterDetails.actions.map((action) => createAttributeRow(action.name, action.desc))}
        </>
      )}

      {/* Legendary Actions */}
      {monsterDetails.legendary_actions.length > 0 && (
        <>
          <hr />
          <h3>Legendary Actions</h3>
          {monsterDetails.legendary_actions.map((action) =>
            createAttributeRow(action.name, action.desc)
          )}
        </>
      )}
    </Popup>
  );
};

export default MonsterInfoPopup;
