import React, { useEffect, useState } from 'react'
import { useTerm } from '@/store/useMonsterStore'
import { foggedCount, roomCount, useMapStore, type MapParams } from '@/map/mapStore'
import type { MapMode, MapView } from '@/map/types'
import MapCanvas from './MapCanvas'
import {
  BlueprintIcon,
  CloseIcon,
  EraserIcon,
  FogAllIcon,
  FogIcon,
  IconButton,
  LinesIcon,
  MapIcon,
  OpenIcon,
  PlayerIcon,
  RefreshIcon,
  RevealAllIcon,
  SaveIcon,
  ShareIcon,
  SlidersIcon,
  TrashIcon,
  UndoIcon,
  WallIcon,
} from './MapIcons'
import './MapTab.css'

const MODES: { mode: MapMode; label: string; hint: string; key: string; icon: React.ReactNode }[] =
  [
    { mode: 'fog', label: 'mapModeFog', hint: 'mapHintFog', key: 'f', icon: <FogIcon /> },
    { mode: 'wall', label: 'mapModeWall', hint: 'mapHintWall', key: 'w', icon: <WallIcon /> },
    { mode: 'erase', label: 'mapModeErase', hint: 'mapHintErase', key: 'e', icon: <EraserIcon /> },
  ]
const VIEWS: { view: MapView; label: string; icon: React.ReactNode }[] = [
  { view: 'map', label: 'mapViewMap', icon: <MapIcon /> },
  { view: 'lines', label: 'mapViewLines', icon: <LinesIcon /> },
  { view: 'blueprint', label: 'mapViewBlueprint', icon: <BlueprintIcon /> },
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
  const [panel, setPanel] = useState(false)

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
      const el = e.target as HTMLElement | null
      const typing = !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))
      const st = useMapStore.getState()
      if (!typing && st.loaded && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const m = MODES.find((x) => x.key === e.key.toLowerCase())
        if (m) st.setMode(m.mode)
        else if (e.key.toLowerCase() === 'p' && st.analysis) setPlayer(true)
      }
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
  const hasEdits = s.edits.length > 0

  return (
    <div className="map-tab">
      <div className={`map-stage ${drag ? 'map-drag' : ''}`} {...dropProps}>
        <MapCanvas player={false} />
      </div>

      <div className="map-topbar">
        <div className="map-group" role="group" aria-label={t('mapGroupFile')}>
          <label
            className="map-icon-btn"
            aria-label={t('mapOpen')}
            data-tip={t('mapOpen')}
            data-tip-side="below"
          >
            <OpenIcon />
            <input
              type="file"
              accept="image/*,.fog_map,.json"
              onChange={(e) => {
                open(e.target.files?.[0])
                e.target.value = ''
              }}
            />
          </label>
          <IconButton label={t('mapSave')} icon={<SaveIcon />} onClick={save} />
          <IconButton label={t('mapClose')} icon={<CloseIcon />} danger onClick={s.closeMap} />
        </div>

        <div className="map-group" role="group" aria-label={t('mapGroupView')}>
          {VIEWS.map((v) => (
            <IconButton
              key={v.view}
              label={t(v.label)}
              icon={v.icon}
              active={s.view === v.view}
              pressed={s.view === v.view}
              onClick={() => s.setView(v.view)}
            />
          ))}
        </div>

        <div className="map-group map-group-end">
          <IconButton
            label={t('mapShare')}
            icon={<ShareIcon />}
            active={s.shared}
            pressed={s.shared}
            onClick={() => s.setShared(!s.shared)}
          />
          <IconButton
            label={t('mapPlayerView')}
            shortcut="P"
            icon={<PlayerIcon />}
            disabled={!s.analysis}
            onClick={() => setPlayer(true)}
          />
          <span className="map-divider" />
          <IconButton
            label={t('mapWallDetection')}
            icon={<SlidersIcon />}
            active={panel}
            pressed={panel}
            onClick={() => setPanel(!panel)}
          />
        </div>
        <div className="map-group map-tools" role="group" aria-label={t('mapGroupTools')}>
          {MODES.map((m) => (
            <IconButton
              key={m.mode}
              label={t(m.label)}
              shortcut={m.key.toUpperCase()}
              icon={m.icon}
              active={s.mode === m.mode}
              pressed={s.mode === m.mode}
              tip="right"
              onClick={() => s.setMode(m.mode)}
            />
          ))}
        </div>
      </div>

      {panel && (
        <section className="map-panel" aria-label={t('mapWallDetection')}>
          <div className="map-panel-head">
            <h4>{t('mapWallDetection')}</h4>
            <IconButton
              label={t('mapPanelClose')}
              icon={<CloseIcon />}
              tip="below"
              onClick={() => setPanel(false)}
            />
          </div>
          <label className="map-check">
            <input type="checkbox" checked={s.auto} onChange={(e) => s.setAuto(e.target.checked)} />
            {t('mapFindWalls')}
          </label>
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
          <button
            type="button"
            className="map-panel-action"
            onClick={() => s.setAuto(s.auto)}
            disabled={s.busy}
          >
            <RefreshIcon /> {t('mapRedetect')}
          </button>
        </section>
      )}

      <div className="map-bottom">
        <p className="map-toast" role="status">
          <strong>{t(mode.label)}</strong> {t(mode.hint)}
        </p>
        <div className="map-bottom-row">
          <div className="map-group" role="group" aria-label={t('mapGroupFog')}>
            <IconButton
              label={t('mapFogAll')}
              icon={<FogAllIcon />}
              tip="above"
              disabled={!s.analysis}
              onClick={s.fogAll}
            />
            <IconButton
              label={t('mapRevealAll')}
              icon={<RevealAllIcon />}
              tip="above"
              disabled={!s.analysis}
              onClick={s.revealAll}
            />
            <span className="map-divider" />
            <IconButton
              label={t('mapUndoEdit')}
              shortcut="Ctrl+Z"
              icon={<UndoIcon />}
              tip="above"
              disabled={!hasEdits}
              onClick={s.undoEdit}
            />
            <IconButton
              label={t('mapClearEdits')}
              icon={<TrashIcon />}
              tip="above"
              danger
              disabled={!hasEdits}
              onClick={s.clearEdits}
            />
          </div>
          <p className="map-status" role="status">
            {s.busy || !s.analysis
              ? t('mapFindingWalls')
              : `${rooms} ${t('mapRooms')} · ${fogged} ${t('mapFogged')}`}
            {s.error && <span className="map-error"> {t(s.error)}</span>}
          </p>
        </div>
      </div>
    </div>
  )
}

export default MapTab
