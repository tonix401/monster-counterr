import React, { useEffect, useState } from 'react'
import { useTerm } from '@/store/useMonsterStore'
import { foggedCount, roomCount, useMapStore, type MapParams } from '@/map/mapStore'
import type { MapMode, MapView } from '@/map/types'
import MapCanvas from './MapCanvas'
import './MapTab.css'

const MODES: { mode: MapMode; label: string; hint: string }[] = [
  { mode: 'fog', label: 'mapModeFog', hint: 'mapHintFog' },
  { mode: 'wall', label: 'mapModeWall', hint: 'mapHintWall' },
  { mode: 'erase', label: 'mapModeErase', hint: 'mapHintErase' },
]
const VIEWS: { view: MapView; label: string }[] = [
  { view: 'map', label: 'mapViewMap' },
  { view: 'lines', label: 'mapViewLines' },
  { view: 'blueprint', label: 'mapViewBlueprint' },
]
const SLIDERS: { key: keyof MapParams; label: string; min: number; max: number; step: number }[] = [
  { key: 'sens', label: 'mapSensitivity', min: 0, max: 100, step: 1 },
  { key: 'minLen', label: 'mapShortestWall', min: 3, max: 15, step: 0.5 },
  { key: 'gap', label: 'mapBridgeDoorways', min: 0, max: 12, step: 0.5 },
  { key: 'minRoom', label: 'mapSmallestRoom', min: 0.05, max: 2, step: 0.05 },
]

const MapTab: React.FC = () => {
  const t = useTerm()
  const s = useMapStore()
  const [player, setPlayer] = useState(false)
  const [drag, setDrag] = useState(false)

  useEffect(() => {
    void useMapStore.getState().restore()
  }, [])

  useEffect(() => {
    if (!player) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setPlayer(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [player])

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key.toLowerCase() === 'z' &&
        useMapStore.getState().edits.length
      ) {
        e.preventDefault()
        useMapStore.getState().undoEdit()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const open = (file: File | undefined): void => void (file && s.openFile(file))

  const save = (): void => {
    const text = s.toText()
    if (!text) return
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([text], { type: 'application/octet-stream' }))
    a.download = `${s.name.replace(/[\\/:*?"<>|]+/g, '').trim() || 'map'}.fog_map`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(a.href), 4000)
  }

  const fileButton = (
    <label className="green-button map-file-button">
      {t('mapOpen')}
      <input
        type="file"
        accept="image/*,.fog_map,.json"
        onChange={(e) => {
          open(e.target.files?.[0])
          e.target.value = ''
        }}
      />
    </label>
  )

  const dropProps = {
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault()
      setDrag(true)
    },
    onDragLeave: () => setDrag(false),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault()
      setDrag(false)
      open(e.dataTransfer.files[0])
    },
  }

  if (player)
    return (
      <div className="map-player-view">
        <MapCanvas player />
        <button className="red-button map-exit-player" onClick={() => setPlayer(false)}>
          {t('mapExitPlayerView')}
        </button>
      </div>
    )

  if (!s.loaded)
    return (
      <div className={`map-empty ${drag ? 'map-drag' : ''}`} {...dropProps}>
        <h3>{t('mapDropHint')}</h3>
        {fileButton}
        {s.error && <p className="map-error">{t(s.error)}</p>}
      </div>
    )

  const rooms = roomCount(s.analysis)
  const fogged = foggedCount(s.analysis, s.fog)
  const mode = MODES.find((m) => m.mode === s.mode)!

  return (
    <div className="map-tab">
      <aside className="map-controls">
        <section>
          <div className="map-row">
            {fileButton}
            <button className="green-button" onClick={save}>
              {t('mapSave')}
            </button>
            <button className="red-button" onClick={s.closeMap}>
              {t('mapClose')}
            </button>
          </div>
          <p className="map-status">
            {s.busy || !s.analysis
              ? t('mapFindingWalls')
              : `${rooms} ${t('mapRooms')} · ${fogged} ${t('mapFogged')}`}
          </p>
          {s.error && <p className="map-error">{t(s.error)}</p>}
          <label className="map-check">
            <input type="checkbox" checked={s.auto} onChange={(e) => s.setAuto(e.target.checked)} />
            {t('mapFindWalls')}
          </label>
        </section>

        <section>
          <div className="map-seg">
            {MODES.map((m) => (
              <button
                key={m.mode}
                className={s.mode === m.mode ? 'active' : ''}
                aria-pressed={s.mode === m.mode}
                onClick={() => s.setMode(m.mode)}
              >
                {t(m.label)}
              </button>
            ))}
          </div>
          <p className="map-hint">{t(mode.hint)}</p>
          <div className="map-row">
            <button className="green-button" onClick={s.undoEdit} disabled={!s.edits.length}>
              {t('mapUndoEdit')}
            </button>
            <button className="red-button" onClick={s.clearEdits} disabled={!s.edits.length}>
              {t('mapClearEdits')}
            </button>
          </div>
        </section>

        <section>
          <div className="map-seg">
            {VIEWS.map((v) => (
              <button
                key={v.view}
                className={s.view === v.view ? 'active' : ''}
                aria-pressed={s.view === v.view}
                onClick={() => s.setView(v.view)}
              >
                {t(v.label)}
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="map-row">
            <button className="green-button" onClick={s.fogAll} disabled={!s.analysis}>
              {t('mapFogAll')}
            </button>
            <button className="green-button" onClick={s.revealAll} disabled={!s.analysis}>
              {t('mapRevealAll')}
            </button>
          </div>
          <label className="map-check">
            <input
              type="checkbox"
              checked={s.shared}
              onChange={(e) => s.setShared(e.target.checked)}
            />
            {t('mapShare')}
          </label>
          <p className="map-hint">{t('mapShareHint')}</p>
          <button className="purple-button" onClick={() => setPlayer(true)} disabled={!s.analysis}>
            {t('mapPlayerView')}
          </button>
        </section>

        <details>
          <summary>{t('mapWallDetection')}</summary>
          {SLIDERS.map((sl) => (
            <label key={sl.key} className="map-slider">
              <span>
                {t(sl.label)} <output>{s.params[sl.key]}</output>
              </span>
              <input
                type="range"
                min={sl.min}
                max={sl.max}
                step={sl.step}
                value={s.params[sl.key]}
                onChange={(e) => s.setParam(sl.key, +e.target.value)}
              />
            </label>
          ))}
          <p className="map-hint">{t('mapDetectionHint')}</p>
        </details>
      </aside>

      <div className={`map-stage ${drag ? 'map-drag' : ''}`} {...dropProps}>
        <MapCanvas player={false} />
      </div>
    </div>
  )
}

export default MapTab
