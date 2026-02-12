import React, { useState } from 'react'
import type { Monster } from '@/types/Monster'
import { useMonsterStore } from '@/store/MonsterStore'
import './ChangeHpTableData.css'
import { ASSETS } from '@/constants'

interface ChangeHpTableDataProps {
  monster: Monster
}

const ChangeHpTableData: React.FC<ChangeHpTableDataProps> = ({ monster }) => {
  const [value, setValue] = useState('')
  const updateMonsterHealth = useMonsterStore((state) => state.updateMonsterHealth)

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      const amount = parseInt(value, 10)
      if (!isNaN(amount)) {
        updateMonsterHealth(monster.id, event.shiftKey ? amount : -amount)
        setValue('')
      }
    }
  }

  const handleDamage = () => {
    const amount = parseInt(value, 10)
    if (!isNaN(amount)) {
      updateMonsterHealth(monster.id, -amount)
      setValue('')
    } else if (value === '') {
      updateMonsterHealth(monster.id, -1)
    }
  }

  const handleHeal = () => {
    const amount = parseInt(value, 10)
    if (!isNaN(amount)) {
      updateMonsterHealth(monster.id, amount)
      setValue('')
    } else if (value === '') {
      updateMonsterHealth(monster.id, 1)
    }
  }

  return (
    <td>
      <div className="damage-cell">
        <button className="icon-button green-button" onClick={handleHeal}>
          <img src={ASSETS.UP_ICON} alt="Heal" />
        </button>
        <input
          type="number"
          min="0"
          placeholder="Amount"
          title="Enter to damage; Shift + Enter to heal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button className="icon-button red-button" onClick={handleDamage}>
          <img src={ASSETS.DOWN_ICON} alt="Damage" />
        </button>
      </div>
    </td>
  )
}

export default ChangeHpTableData
