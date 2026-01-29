import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router'
import MonsterInfoPopup from '@/components/popups/MonsterInfoPopup'
import { useMonsterStore } from '@/store'

export default function MonsterInfoPopupRoute() {
  const { monsterId } = useParams<{ monsterId: string }>()
  const navigate = useNavigate()
  const getMonsterDetails = useMonsterStore((state) => state.getMonsterDetails)
  const isMonsterDetailsAvailable = useMonsterStore((state) => state.isMonsterDetailsAvailable)
  const addMonsterDetails = useMonsterStore((state) => state.addMonsterDetails)

  useEffect(() => {
    if (monsterId && !isMonsterDetailsAvailable(monsterId)) {
      addMonsterDetails(monsterId)
    }
  }, [monsterId, isMonsterDetailsAvailable, addMonsterDetails])

  const details = monsterId ? getMonsterDetails(monsterId) : null

  return <MonsterInfoPopup isOpen={true} onClose={() => navigate(-1)} monsterDetails={details} />
}
