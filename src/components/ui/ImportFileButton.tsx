import { useMonsterStore } from '@/store'

const ImportFileButton = () => {
  const importData = useMonsterStore((state) => state.importData)
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
        alert('Failed to load save file')
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
        Import Save File
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
