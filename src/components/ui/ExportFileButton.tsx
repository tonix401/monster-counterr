import { useMonsterStore } from '@/store/useMonsterStore'
import { useTerm } from '@/store/useMonsterStore'

const ExportFileButton: React.FC = () => {
  const exportData = useMonsterStore((state) => state.exportData)
  const t = useTerm()

  return (
    <button className="green-button" onClick={exportData}>
      {t('exportSaveFile')}
    </button>
  )
}

export default ExportFileButton
