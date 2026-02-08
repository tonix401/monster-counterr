import React, { useMemo, useState } from 'react'
import Popup from '@/components/popups/Popup'
import { useMonsterStore } from '@/store/MonsterStore'
import { useTerm } from '@/store/MonsterStore'
import { useNavigate } from 'react-router'
import './AddMonsterPopup.css'
import type { MonsterIndexEntryHp } from '@/store/slices/monsterSlice'

const AddMonsterPopup: React.FC = () => {
  const monsterIndex = useMonsterStore((state) => state.monsterIndex)
  const source = useMonsterStore((state) => state.source)
  const setSource = useMonsterStore((state) => state.setSource)
  const addMonster = useMonsterStore((state) => state.addMonster)
  const navigate = useNavigate()
  const t = useTerm()

  const [name, setName] = useState('')
  const [hp, setHp] = useState('')
  const [amount, setAmount] = useState('')
  const [xp, setXp] = useState('')
  const [isCustom, setIsCustom] = useState(true)

  const sources = useMemo(
    () =>
      Object.values(monsterIndex)
        .map((entry) => entry.source)
        .filter((v, i, a) => a.indexOf(v) === i)
        .sort(),
    [monsterIndex, source]
  )

  const nameToIndex = (name: string) =>
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')

  const handleAdd = () => {
    const trimmedName = name.trim()
    const hpValue = parseInt(hp) || 1
    const amountValue = parseInt(amount) || 1
    addMonster(
      trimmedName,
      isCustom ? undefined : `${nameToIndex(trimmedName)}-${source?.toLowerCase()}`,
      hpValue,
      amountValue
    )
    setName('')
    setHp('')
    setAmount('')
    navigate('/')
  }

  const setHPFromindexEntry = (hp: MonsterIndexEntryHp) => {
    if ('average' in hp) {
      setHp(hp.average.toString())
      return
    }
    if ('special' in hp && hp.special.trim() !== '') {
      setHp(hp.special)
      return
    }
    setHp('')
  }

  const suggestionInputOnChange = (value: string) => {
    setName(value)
    const matchedEntry = Object.values(monsterIndex).find(
      (entry) => entry.name.toLowerCase() === value.toLowerCase().trim()
    )
    if (matchedEntry) {
      setIsCustom(false)
      setHPFromindexEntry(matchedEntry.hp)
      setXp(matchedEntry.xp?.toString() || '')
    } else {
      setIsCustom(true)
    }
  }

  return (
    <Popup
      onClose={() => {
        setAmount('')
        setHp('')
        setName('')
        navigate('/')
      }}
      title={t('addMonster')}
      width={500}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleAdd()
        }}
        id="add-monster-form"
      >
        <input
          id="add-monster-source-input"
          type="text"
          placeholder={t('source')}
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
          id="add-monster-name-input"
          placeholder={t('name')}
          required
          value={name}
          onChange={(e) => suggestionInputOnChange(e.target.value)}
          list="monster-names-datalist"
        />
        <datalist id="monster-names-datalist">
          {Object.values(monsterIndex)
            .filter((entry) => (source ? entry.source === source : true))
            .map((entry) => (
              <option key={entry.name} value={entry.name} />
            ))}
        </datalist>
        <input
          id="hp-input"
          required
          type="number"
          placeholder={t('hp')}
          value={hp}
          onChange={(e) => setHp(e.target.value)}
        />
        <input
          id="xp-input"
          type="number"
          placeholder={t('xp')}
          value={xp}
          onChange={(e) => setXp(e.target.value)}
        />
        <input
          id="amount-input"
          type="number"
          placeholder={t('amount')}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <button type="submit" className="green-button">
          {t('addMonster')}
        </button>
      </form>
    </Popup>
  )
}

export default AddMonsterPopup
