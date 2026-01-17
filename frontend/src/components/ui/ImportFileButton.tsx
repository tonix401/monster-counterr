import { useMonsterStore } from '@/store'
import { useTerm } from '@/hooks/useTerm'

const ImportFileButton = () => {
  const importData = useMonsterStore((state) => state.importData)
  const t_importSaveFile = useTerm('importSaveFile')
  const t_failedToLoadSaveFile = useTerm('failedToLoadSaveFile')

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string)
        importData(data)
      } catch (error) {
        console.error('Failed to load save file:', error)
        alert(t_failedToLoadSaveFile)
      }
    }
    reader.readAsText(file)
  }

  return (
    <>
      <button
        type="button"
        className="green-button"
        onClick={() => document.getElementById('upload-input')?.click()}
      >
        {t_importSaveFile}
      </button>
      <input
        id="upload-input"
        type="file"
        accept="application/json"
        onChange={handleFileUpload}
        style={{ display: 'none' }}
      />
    </>
  )
}

export default ImportFileButton
