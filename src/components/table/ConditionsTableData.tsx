import React from 'react'
import type { Monster } from '@/types/Monster'
import { useMonsterStore } from '@/store'
import { useTerm } from '@/hooks/useTerm'
import { CONDITIONS } from '@/constants'

interface ConditionsTableDataProps {
  monster: Monster
}

const ConditionsTableData: React.FC<ConditionsTableDataProps> = ({ monster }) => {
  const [hoveredCondition, setHoveredCondition] = React.useState<string | null>(null)

  const addMonsterCondition = useMonsterStore((state) => state.addMonsterCondition)
  const removeMonsterCondition = useMonsterStore((state) => state.removeMonsterCondition)

  const t_addCondition = useTerm('addCondition')
  const t_remove = useTerm('remove')

  const handleRemoveCondition = (condition: string) => {
    removeMonsterCondition(monster.id, condition)
  }

  const handleAddCondition = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value) {
      addMonsterCondition(monster.id, e.target.value)
      e.target.value = ''
    }
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
            {hoveredCondition === condition ? t_remove : condition}
          </button>
        ))}
        {remainingConditions.length > 0 && (
          <>
            <input
              className="add-condition-tag"
              list={`conditions-datalist-${monster.id}`}
              onChange={(e) => {
                const value = e.target.value
                if (remainingConditions.includes(value)) {
                  handleAddCondition({
                    target: { value },
                  } as React.ChangeEvent<HTMLSelectElement>)
                  e.target.value = ''
                }
              }}
              placeholder={t_addCondition}
            />
            <datalist id={`conditions-datalist-${monster.id}`}>
              {remainingConditions.map((condition: string) => (
                <option key={condition} value={condition}>
                  {condition}
                </option>
              ))}
            </datalist>
          </>
        )}
      </div>
    </td>
  )
}

export default ConditionsTableData
