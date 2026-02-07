import { useMonsterStore, useNotify } from '@/store'
import { useTerm } from '@/store/index'

const ImportFileButton = () => {
  const importData = useMonsterStore((state) => state.importData)
  const t = useTerm()

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
        const notify = useNotify()
        notify({
          type: 'error',
          message: t('failedToLoadSaveFile'),
        })
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
        {t('importSaveFile')}
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
