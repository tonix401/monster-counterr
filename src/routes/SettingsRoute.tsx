import { useNavigate } from 'react-router'
import SettingsPopup from '@/components/popups/settingsPopup/SettingsPopup'

export default function SettingsRoute() {
  const navigate = useNavigate()

  const handleClose = () => {
    navigate('/')
  }

  return <SettingsPopup isOpen={true} onClose={handleClose} />
}
