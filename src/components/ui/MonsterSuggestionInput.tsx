import React, { useEffect } from 'react'
import { useMonsterStore } from '@/store'
import { useTerm } from '@/hooks/useTerm'

interface MonsterSuggestionInputProps {
  onHpChange: (hp: number) => void
  onXpChange: (xp: number) => void
  value: string
  onChange: (value: string) => void
}

const MonsterSuggestionInput: React.FC<MonsterSuggestionInputProps> = ({
  onHpChange,
  onXpChange,
  value,
  onChange,
}) => {
  const getMonsterNames = useMonsterStore((state) => state.getMonsterNames)
  const getMonsterIdByName = useMonsterStore((state) => state.getMonsterIdByName)
  const isMonsterDetailsAvailable = useMonsterStore((state) => state.isMonsterDetailsAvailable)
  const addMonsterDetails = useMonsterStore((state) => state.addMonsterDetails)
  const getMonsterDetails = useMonsterStore((state) => state.getMonsterDetails)

  const t_name = useTerm('name')

  const monsterNames = getMonsterNames()

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value
    onChange(query)

    if (query && monsterNames.includes(query)) {
      const id = getMonsterIdByName(query)
      if (!id) return

      if (!isMonsterDetailsAvailable(id)) {
        await addMonsterDetails(id)
      }
      const details = getMonsterDetails(id)
      if (details) {
        onHpChange(details.hit_points)
        onXpChange(details.xp)
      }
    }
  }

  useEffect(() => {
    if (value && monsterNames.includes(value)) {
      ;(async () => {
        const id = getMonsterIdByName(value)
        if (!id) return

        if (!isMonsterDetailsAvailable(id)) {
          await addMonsterDetails(id)
        }
        const details = getMonsterDetails(id)
        if (details) {
          onHpChange(details.hit_points)
          onXpChange(details.xp)
        }
      })()
    }
  }, [value])

  return (
    <div className="suggestion-input-container">
      <input
        id="monster-suggestion-input"
        placeholder={t_name}
        required
        value={value}
        onChange={handleInputChange}
        list="monster-names-datalist"
      />
      <datalist id="monster-names-datalist">
        {monsterNames.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
    </div>
  )
}

export default MonsterSuggestionInput
