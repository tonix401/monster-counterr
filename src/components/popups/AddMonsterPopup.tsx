import React, { useState } from 'react'
import Popup from '@/components/popups/Popup'
import MonsterSuggestionInput from '@/components/ui/MonsterSuggestionInput'
import { useMonsterStore } from '@/store'
import { useTerm } from '@/hooks/useTerm'

interface AddMonsterPopupProps {
  isOpen: boolean
  onClose: () => void
}

const AddMonsterPopup: React.FC<AddMonsterPopupProps> = ({ isOpen, onClose }) => {
  const [name, setName] = useState('')
  const [hp, setHp] = useState('')
  const [amount, setAmount] = useState('')
  const [xp, setXp] = useState('')

  const addMonster = useMonsterStore((state) => state.addMonster)

  const t_addMonster = useTerm('addMonster')
  const t_hp = useTerm('hp')
  const t_amount = useTerm('amount')
  const t_xp = useTerm('xp')

  const handleAdd = () => {
    const trimmedName = name.trim()
    const hpValue = parseInt(hp) || 1
    const amountValue = parseInt(amount) || 1
    addMonster(trimmedName, hpValue, amountValue)
    setName('')
    setHp('')
    setAmount('')
    onClose()
  }

  return (
    <Popup
      isOpen={isOpen}
      onClose={() => {
        setAmount('')
        setHp('')
        setName('')
        onClose()
      }}
      title={t_addMonster}
      width={300}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleAdd()
        }}
      >
        <MonsterSuggestionInput
          onHpChange={(newHp) => setHp(newHp.toString())}
          onXpChange={(newXp) => setXp(newXp.toString())}
          value={name}
          onChange={setName}
        />
        <input
          id="hp-input"
          required
          type="number"
          placeholder={t_hp}
          value={hp}
          onChange={(e) => setHp(e.target.value)}
        />
        <input
          id="amount-input"
          type="number"
          placeholder={t_amount}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <input
          id="xp-input"
          type="number"
          placeholder={t_xp}
          value={xp}
          onChange={(e) => setXp(e.target.value)}
        />
        <button type="submit" className="green-button">
          {t_addMonster}
        </button>
      </form>
    </Popup>
  )
}

export default AddMonsterPopup
