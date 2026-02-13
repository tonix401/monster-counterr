import React from 'react'
import { useMonsters } from '@/store/useMonsterStore'
import MonsterTableRow from '@/components/table/MonsterTableRow'
import TableHeaderRow from '@/components/table/TableHeaderRow'
import TableColgroup from '@/components/table/TableColgroup'
import './MonsterTable.css'
import { AddMonsterRow } from './AddMonsterRow'

const MonsterTable: React.FC = () => {
  const monsters = useMonsters()

  return (
    <table>
      <TableColgroup />
      <thead>
        <TableHeaderRow />
      </thead>
      <tbody>
        {monsters.map((monster) => (
          <MonsterTableRow key={monster.id} monster={monster} />
        ))}
        <AddMonsterRow />
      </tbody>
    </table>
  )
}

export default MonsterTable
