import React from 'react';
import type { Monster } from '../types/Monster';
import { useMonsterStore } from '../store';
import MonsterTableRow from './MonsterTableRow';
import TableHeaderRow from './TableHeaderRow';
import TableColgroup from './TableColgroup';

interface MonsterTableProps {
  monsters: Monster[];
}

const MonsterTable: React.FC<MonsterTableProps> = ({ monsters }) => {
  const settings = useMonsterStore((state) => state.settings);

  if (monsters.length === 0) {
    return null;
  }

  return (
    <table>
      <TableColgroup settings={settings} />
      <thead>
        <TableHeaderRow settings={settings} />
      </thead>
      <tbody>
        {monsters.map((monster) => (
          <MonsterTableRow
            key={monster.id}
            monster={monster}
            settings={settings}
          />
        ))}
      </tbody>
    </table>
  );
};

export default MonsterTable;
