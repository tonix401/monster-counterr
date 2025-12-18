import React from 'react';
import { useMonsterStore } from '../store';

interface QuickActionsTableDataProps {
  monsterId: string;
}

const QuickActionsTableData: React.FC<QuickActionsTableDataProps> = ({ monsterId }) => {
  const killMonster = useMonsterStore((state) => state.killMonster);
  const removeMonster = useMonsterStore((state) => state.removeMonster);

  const handleKill = () => {
    killMonster(monsterId);
  };

  const handleRemove = () => {
    removeMonster(monsterId);
  };

  return (
    <td>
      <div className="quick-actions-container">
        <button className="red-button icon-button" title="Kill Monster" onClick={handleKill}>
          <img src="/skull.svg" alt="Kill Monster" />
        </button>
        <button className="red-button icon-button" title="Remove Monster" onClick={handleRemove}>
          <img src="/bin.svg" alt="Remove Monster" />
        </button>
      </div>
    </td>
  );
};

export default QuickActionsTableData;
