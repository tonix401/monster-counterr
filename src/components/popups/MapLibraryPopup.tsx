import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import Popup from './Popup'
import { useGo } from '@/hooks/useGo'
import { useTerm } from '@/store/useMonsterStore'
import { useMapStore } from '@/map/mapStore'
import { CopyIcon, TrashIcon } from '@/components/map/MapIcons'
import './MapLibraryPopup.css'

/** The maps kept in this browser: click one to open it, click its name again to rename, duplicate or delete it, or import another */
const MapLibraryPopup: React.FC = () => {
  const t = useTerm()
  const go = useGo()
  const navigate = useNavigate()
  const library = useMapStore((s) => s.library)
  const openId = useMapStore((s) => s.mapId)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    void useMapStore.getState().refreshLibrary()
  }, [])

  const open = async (id: string): Promise<void> => {
    await useMapStore.getState().openFromLibrary(id)
    navigate('/map')
  }

  const commitRename = (id: string): void => {
    // Escape and Enter both leave through here once, so a finished rename is not saved twice
    if (renaming !== id) return
    const name = draft.trim()
    if (name && name !== library.find((m) => m.id === id)?.name) {
      void useMapStore.getState().renameMap(id, name)
    }
    setRenaming(null)
  }

  return (
    <Popup onClose={() => go('/')} title={t('mapLibrary')} width={560}>
      <p className="map-lib-hint">{t('mapLibraryHint')}</p>
      {library.length === 0 ? (
        <p className="map-lib-empty">{t('mapLibraryEmpty')}</p>
      ) : (
        <ul className="map-lib-list">
          {library.map((m) => (
            <li
              key={m.id}
              className={`map-lib-row ${m.id === openId ? 'map-lib-open' : ''} ${m.id === selected ? 'map-lib-selected' : ''}`}
            >
              <button
                type="button"
                className="map-lib-thumb"
                title={t('mapOpenThis')}
                aria-label={`${t('mapOpenThis')}: ${m.name}`}
                onClick={() => void open(m.id)}
              >
                {m.thumb ? <img src={m.thumb} alt="" /> : null}
              </button>
              <div className="map-lib-main">
                {renaming === m.id ? (
                  <input
                    autoFocus
                    className="map-lib-rename"
                    value={draft}
                    aria-label={t('mapRename')}
                    onFocus={(e) => e.currentTarget.select()}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={() => commitRename(m.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.currentTarget.blur()
                      if (e.key === 'Escape') {
                        setRenaming(null)
                      }
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    className="map-lib-name"
                    title={t('mapRename')}
                    onClick={() => {
                      // like a file manager: the first click selects, the second renames
                      if (selected === m.id) {
                        setDraft(m.name)
                        setRenaming(m.id)
                      } else setSelected(m.id)
                    }}
                  >
                    {m.name}
                  </button>
                )}
                <span className="map-lib-meta">
                  {m.width}×{m.height} · {new Date(m.updatedAt).toLocaleString()}
                </span>
              </div>
              {deleting === m.id ? (
                <div className="map-lib-confirm" role="alert">
                  <span>{t('mapDeleteConfirm', { name: m.name })}</span>
                  <button
                    type="button"
                    className="map-lib-btn map-lib-danger"
                    onClick={() => {
                      setDeleting(null)
                      void useMapStore.getState().deleteMap(m.id)
                    }}
                  >
                    {t('mapConfirm')}
                  </button>
                  <button type="button" className="map-lib-btn" onClick={() => setDeleting(null)}>
                    {t('mapCancel')}
                  </button>
                </div>
              ) : (
                <div className="map-lib-actions">
                  <button
                    type="button"
                    className="map-lib-icon"
                    title={t('mapDuplicate')}
                    aria-label={`${t('mapDuplicate')}: ${m.name}`}
                    onClick={() => void useMapStore.getState().duplicateMap(m.id)}
                  >
                    <CopyIcon />
                  </button>
                  <button
                    type="button"
                    className="map-lib-icon map-lib-danger"
                    title={t('mapDelete')}
                    aria-label={`${t('mapDelete')}: ${m.name}`}
                    onClick={() => setDeleting(m.id)}
                  >
                    <TrashIcon />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <label className="green-button map-lib-import">
        {t('mapImport')}
        <input
          type="file"
          accept="image/*,.fog_map,.json"
          onChange={async (e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (!file) return
            await useMapStore.getState().openFile(file)
            if (useMapStore.getState().loaded) navigate('/map')
          }}
        />
      </label>
    </Popup>
  )
}

export default MapLibraryPopup
