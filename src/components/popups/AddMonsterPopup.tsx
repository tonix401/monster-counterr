import React, { useState } from 'react'
import Popup from '@/components/popups/Popup'
import MonsterSuggestionInput from '@/components/ui/MonsterSuggestionInput'
import { useMonsterStore } from '@/store'
import { useTerm } from '@/store/index'
import { useNavigate } from 'react-router'

const AddMonsterPopup: React.FC = () => {
  const [name, setName] = useState('')
  const [hp, setHp] = useState('')
  const [amount, setAmount] = useState('')
  const [xp, setXp] = useState('')

  const addMonster = useMonsterStore((state) => state.addMonster)
  const navigate = useNavigate()
  const t = useTerm()
  
  const handleAdd = () => {
    const trimmedName = name.trim()
    const hpValue = parseInt(hp) || 1
    const amountValue = parseInt(amount) || 1
    addMonster(trimmedName, hpValue, amountValue)
    setName('')
    setHp('')
    setAmount('')
    navigate('/')
  }

  const suggestionInputOnChange = (value: string) => {
    setName(value)
    console.log('Selected monster name:', value)
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
      width={300}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleAdd()
        }}
      >
        <MonsterSuggestionInput value={name} onChange={suggestionInputOnChange} />
        <input
          id="hp-input"
          required
          type="number"
          placeholder={t('hp')}
          value={hp}
          onChange={(e) => setHp(e.target.value)}
        />
        <input
          id="amount-input"
          type="number"
          placeholder={t('amount')}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <input
          id="xp-input"
          type="number"
          placeholder={t('xp')}
          value={xp}
          onChange={(e) => setXp(e.target.value)}
        />
        <button type="submit" className="green-button">
          {t('addMonster')}
        </button>
      </form>
    </Popup>
  )
}

export default AddMonsterPopup
