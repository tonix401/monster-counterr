import React, { useMemo } from 'react'
import { useMonsterStore, useTerm } from '@/store/index'
import type { MonsterIndexEntry } from '@/store/slices/monsterSlice'

interface MonsterSuggestionInputProps {
  value: string
  onChange: (value: string) => void
  filterCallBack?: (entry: MonsterIndexEntry) => boolean
}

const MonsterSuggestionInput: React.FC<MonsterSuggestionInputProps> = ({ value, onChange }) => {
  const monsterIndex = useMonsterStore((state) => state.monsterIndex)
  const source = useMonsterStore((state) => state.source)
  const setSource = useMonsterStore((state) => state.setSource)
  const t_name = useTerm('name')
  const t_source = useTerm('source')

  const sources = useMemo(
    () =>
      Object.values(monsterIndex)
        .map((entry) => entry.source)
        .filter((v, i, a) => a.indexOf(v) === i)
        .sort(),
    [monsterIndex, source]
  )

  return (
    <div className="suggestion-input-container">
      <input
        type="text"
        placeholder={t_source}
        value={source ?? ''}
        onChange={(e) => setSource(e.target.value)}
        list="monster-sources-datalist"
        onFocus={() => setSource(null)}
      />
      <datalist id="monster-sources-datalist">
        {sources.map((entry) => (
          <option key={entry} value={entry} />
        ))}
      </datalist>
      <input
        id="monster-suggestion-input"
        placeholder={t_name}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        list="monster-names-datalist"
      />
      <datalist id="monster-names-datalist">
        {Object.values(monsterIndex)
          .filter((entry) => (source ? entry.source === source : true))
          .map((entry) => (
            <option key={entry.index} value={entry.name} />
          ))}
      </datalist>
    </div>
  )
}

export default MonsterSuggestionInput
