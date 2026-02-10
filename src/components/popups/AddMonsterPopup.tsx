import React, { useMemo, useState } from 'react'
import Popup from '@/components/popups/Popup'
import { useMonsterStore } from '@/store/MonsterStore'
import { useTerm } from '@/store/MonsterStore'
import { useNavigate } from 'react-router'
import './AddMonsterPopup.css'
import type { MonsterIndexEntryHp } from '@/store/slices/monsterSlice'
import { DropdownInput } from '../ui/DropdownInput'

const AddMonsterPopup: React.FC = () => {
  const monsterIndex = useMonsterStore((state) => state.monsterIndex)
  const source = useMonsterStore((state) => state.source)
  const setSource = useMonsterStore((state) => state.setSource)
  const addMonster = useMonsterStore((state) => state.addMonster)
  const navigate = useNavigate()
  const t = useTerm()

  const [templateName, setTemplateName] = useState('')
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
    const trimmedName = templateName.trim()
    const hpValue = parseInt(hp) || 1
    const amountValue = parseInt(amount) || 1
    addMonster(
      trimmedName,
      isCustom ? undefined : `${nameToIndex(trimmedName)}-${source?.toLowerCase()}`,
      hpValue,
      amountValue
    )
    setTemplateName('')
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
    setTemplateName(value)
    const matchedEntry = Object.values(monsterIndex).find(
      (entry) => entry.name.toLowerCase() === value.toLowerCase().trim()
    )
    if (matchedEntry) {
      setIsCustom(false)
      setHPFromindexEntry(matchedEntry.hp)
      setXp(matchedEntry.xp?.toString() || '')
      setName(matchedEntry.name)
    } else {
      setIsCustom(true)
    }
  }

  const handleTemplateNameChange = (value: string) => {
    if (name.trim() === '') {
      setName(value)
    }
    suggestionInputOnChange(value)
  }

  return (
    <Popup
      onClose={() => {
        setAmount('')
        setHp('')
        setTemplateName('')
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
        <div id="monster-template-inputs">
          <DropdownInput
            id="add-monster-template-source-input"
            onChange={(value) => setSource(value === '' ? 'all' : value)}
            placeholder={t('source')}
            options={sources.map((entry) => ({
              value: entry,
              label: entry,
            }))}
            maxEntries={10}
          />
          <DropdownInput
            id="add-monster-template-name-input"
            onChange={handleTemplateNameChange}
            placeholder={t('templateName')}
            options={Object.values(monsterIndex)
              .filter((entry) => (source === 'all' ? true : entry.source === source))
              .map((entry) => ({
                value: entry.name,
                label: entry.name,
              }))}
            required
            maxEntries={10}
          />
        </div>
        <input
          id="amount-input"
          type="number"
          placeholder={t('amount')}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <details>
          <summary>{t('customizeMonster')}</summary>
          <input
            id="add-monster-name-input"
            value={name}
            required
            onChange={(e) => setName(e.target.value)}
            placeholder={t('name')}
            autoComplete="off"
          />
          <input
            id="hp-input"
            required
            type="number"
            placeholder={t('hp')}
            value={hp}
            onChange={(e) => setHp(e.target.value)}
            autoComplete="off"
          />
          <input
            id="xp-input"
            type="number"
            placeholder={t('xp')}
            value={xp}
            onChange={(e) => setXp(e.target.value)}
            autoComplete="off"
          />
        </details>
        <button type="submit" className="green-button">
          {t('addMonster')}
        </button>
      </form>
    </Popup>
  )
}

export default AddMonsterPopup
