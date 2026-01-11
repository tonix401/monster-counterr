import { useMonsterStore } from '@/store'

const ExportFileButton: React.FC = () => {
  const exportData = useMonsterStore((state) => state.exportData)
  return (
    <button className="green-button" onClick={exportData}>
      Export Save File
    </button>
  )
}

export default ExportFileButton
