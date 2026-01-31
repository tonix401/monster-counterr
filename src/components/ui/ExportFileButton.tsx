import { useMonsterStore } from '@/store'
import { useTerm } from '@/store/index'

const ExportFileButton: React.FC = () => {
  const exportData = useMonsterStore((state) => state.exportData)
  const t_exportSaveFile = useTerm('exportSaveFile')

  return (
    <button className="green-button" onClick={exportData}>
      {t_exportSaveFile}
    </button>
  )
}

export default ExportFileButton
