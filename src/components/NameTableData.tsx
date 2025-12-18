import React, { useState } from 'react';
import type { Monster } from '../types/Monster';
import { useMonsterStore } from '../store';
import MonsterInfoPopup from './MonsterInfoPopup';

interface NameTableDataProps {
  monster: Monster;
}

const NameTableData: React.FC<NameTableDataProps> = ({ monster }) => {
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  
  const isMonsterDetailsAvailable = useMonsterStore((state) => state.isMonsterDetailsAvailable);
  const getMonsterDetails = useMonsterStore((state) => state.getMonsterDetails);
  
  const hasDetails = isMonsterDetailsAvailable(monster.detailIndex);
  const monsterDetails = hasDetails ? getMonsterDetails(monster.detailIndex) : null;

  const handleClick = () => {
    if (hasDetails) {
      setIsPopupOpen(true);
    }
  };

  return (
    <>
      <td
        className="name-cell"
        style={{ color: monster.hp > 0 ? 'inherit' : 'gray' }}
        title={`Monster Sheet: ${monster.name}`}
      >
        <span className={hasDetails ? 'clickable' : ''} onClick={handleClick}>
          {monster.hp > 0 ? '' : '💀  '}
          {monster.name}
        </span>
      </td>
      <MonsterInfoPopup
        isOpen={isPopupOpen}
        onClose={() => setIsPopupOpen(false)}
        monsterDetails={monsterDetails}
      />
    </>
  );
};

export default NameTableData;
