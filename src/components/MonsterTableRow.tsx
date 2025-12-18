import React from 'react';
import type { Monster } from '../types/Monster';
import type { Settings } from '../types/Settings';
import NameTableData from './NameTableData';
import StatusTableData from './StatusTableData';
import HpTableData from './HpTableData';
import ChangeHpTableData from './ChangeHpTableData';
import ConditionsTableData from './ConditionsTableData';
import QuickActionsTableData from './QuickActionsTableData';

interface MonsterTableRowProps {
  monster: Monster;
  settings: Settings;
}

const MonsterTableRow: React.FC<MonsterTableRowProps> = ({
  monster,
  settings,
}) => {
  return (
    <tr>
      {settings.showQuickActions && (
        <QuickActionsTableData
          monsterId={monster.id}
        />
      )}
      <NameTableData monster={monster} />
      {settings.showConditions && (
        <ConditionsTableData
          monster={monster}
        />
      )}
      {settings.showStatus && <StatusTableData monster={monster} />}
      {settings.showHealth && <HpTableData monster={monster} />}
      {settings.showChangeHp && (
        <ChangeHpTableData
          monster={monster}
        />
      )}
    </tr>
  );
};

export default MonsterTableRow;
