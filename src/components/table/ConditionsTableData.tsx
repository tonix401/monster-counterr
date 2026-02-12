import React from 'react'
import type { Monster } from '@/types/Monster'
import { useMonsterStore } from '@/store/MonsterStore'
import { useTerm } from '@/store/MonsterStore'
import { CONDITIONS } from '@/constants'
import { DropdownInput } from '@/components/ui/DropdownInput'
import './ConditionsTableData.css'

interface ConditionsTableDataProps {
  monster: Monster
}

const ConditionsTableData: React.FC<ConditionsTableDataProps> = ({ monster }) => {
  const [hoveredCondition, setHoveredCondition] = React.useState<string | null>(null)

  const addMonsterCondition = useMonsterStore((state) => state.addMonsterCondition)
  const removeMonsterCondition = useMonsterStore((state) => state.removeMonsterCondition)
  const t = useTerm()

  const handleRemoveCondition = (condition: string) => {
    removeMonsterCondition(monster.id, condition)
  }

  const remainingConditions = ([...CONDITIONS] as string[])
    .sort()
    .filter((c: string) => !monster.conditions.includes(c))

  return (
    <td>
      <div className="conditions-container">
        {monster.conditions.map((condition) => (
          <button
            key={condition}
            className="condition-tag red-button"
            onClick={() => handleRemoveCondition(condition)}
            onMouseEnter={() => setHoveredCondition(condition)}
            onMouseLeave={() => setHoveredCondition(null)}
          >
            {hoveredCondition === condition ? t('remove') : t(condition)}
          </button>
        ))}
        {remainingConditions.length > 0 && (
          <DropdownInput
            id={`conditions-dropdown-${monster.id}`}
            options={remainingConditions.map((condition) => ({
              value: condition,
              label: t(condition),
            }))}
            onChange={(selectedCondition) => {
              if (selectedCondition) {
                addMonsterCondition(monster.id, selectedCondition)
              }
            }}
            showValueOnSelection={false}
            maxEntries={Math.min(15, remainingConditions.length)}
            placeholder={t('addCondition')}
          />
        )}
      </div>
    </td>
  )
}

export default ConditionsTableData
