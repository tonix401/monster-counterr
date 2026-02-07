import { useMonsterStore } from '@/store'
import { useTerm } from '@/store/index'

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
