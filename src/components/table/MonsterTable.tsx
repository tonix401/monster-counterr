import React from 'react'
import type { Monster } from '@/types/Monster'
import { useMonsterStore } from '@/store'
import MonsterTableRow from '@/components/table/MonsterTableRow'
import TableHeaderRow from '@/components/table/TableHeaderRow'
import TableColgroup from '@/components/table/TableColgroup'

interface MonsterTableProps {
  monsters: Monster[]
}

const MonsterTable: React.FC<MonsterTableProps> = ({ monsters }) => {
  const settings = useMonsterStore((state) => state.settings)
  return (
    <table>
      <TableColgroup settings={settings} />
      <thead>
        <TableHeaderRow settings={settings} />
      </thead>
      <tbody>
        {monsters.map((monster) => (
          <MonsterTableRow key={monster.id} monster={monster} settings={settings} />
        ))}
      </tbody>
    </table>
  )
}

export default MonsterTable
