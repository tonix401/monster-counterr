import React, { useState } from 'react'
import Popup from '@/components/popups/Popup'
import MonsterSuggestionInput from '@/components/ui/MonsterSuggestionInput'
import { useMonsterStore } from '@/store'

interface AddMonsterPopupProps {
  isOpen: boolean
  onClose: () => void
}

const AddMonsterPopup: React.FC<AddMonsterPopupProps> = ({ isOpen, onClose }) => {
  const [name, setName] = useState('')
  const [hp, setHp] = useState('')
  const [amount, setAmount] = useState('')

  const addMonster = useMonsterStore((state) => state.addMonster)

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
      title="Add Monster"
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
          value={name}
          onChange={setName}
        />
        <input
          id="hp-input"
          required
          type="number"
          placeholder="HP"
          value={hp}
          onChange={(e) => setHp(e.target.value)}
        />
        <input
          id="amount-input"
          type="number"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <button type="submit" className="green-button">
          Add Monster
        </button>
      </form>
    </Popup>
  )
}

export default AddMonsterPopup
