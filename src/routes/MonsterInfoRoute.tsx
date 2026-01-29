import { useNavigate, useParams, Navigate } from 'react-router'
import MonsterInfoPopup from '@/components/popups/MonsterInfoPopup'
import { useMonsterStore } from '@/store'

export default function MonsterInfoRoute() {
  const navigate = useNavigate()
  const { monsterId } = useParams<{ monsterId: string }>()
  const getMonsterDetails = useMonsterStore((state) => state.getMonsterDetails)
  const isMonsterDetailsAvailable = useMonsterStore((state) => state.isMonsterDetailsAvailable)
  const addMonsterDetails = useMonsterStore((state) => state.addMonsterDetails)

  const handleClose = () => {
    navigate('/')
  }

  // If no monster ID, redirect to home
  if (!monsterId) {
    return <Navigate to="/" replace />
  }

  // Fetch monster details if not already available
  if (!isMonsterDetailsAvailable(monsterId)) {
    addMonsterDetails(monsterId)
  }

  const details = getMonsterDetails(monsterId)

  return <MonsterInfoPopup isOpen={true} onClose={handleClose} monsterDetails={details} />
}
