import React, { useEffect, useState, useSyncExternalStore } from 'react'
import { useTerm } from '@/store/useMonsterStore'
import { useGo } from '@/hooks/useGo'
import { useMapStore, type MapParams } from '@/map/mapStore'
import { getPublishedMap, subscribePublishedMap } from '@/map/mapSync'
import type { MapMode, MapView } from '@/map/types'
import MapCanvas from './MapCanvas'
import {
  BlueprintIcon,
  CircleIcon,
  PolygonIcon,
  CloseIcon,
  EraserIcon,
  FitIcon,
  DarkIcon,
  FogAllIcon,
  FogIcon,
  IconButton,
  LibraryIcon,
  LinesIcon,
  MapIcon,
  OpenIcon,
  PanIcon,
  PlayerIcon,
  RectIcon,
  RefreshIcon,
  RevealAllIcon,
  SaveIcon,
  SelectIcon,
  SidebarIcon,
  SlidersIcon,
  TrashIcon,
  UndoIcon,
  WallIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from './MapIcons'
import './MapTab.css'

interface Tool {
  mode: MapMode
  label: string
  key: string
  icon: React.ReactNode
}
/** Tool palette, in groups separated by a divider */
const TOOL_GROUPS: Tool[][] = [
  [
    {
      mode: 'select',
      label: 'mapModeSelect',
      key: 'v',
      icon: <SelectIcon />,
    },
    { mode: 'fog', label: 'mapModeFog', key: 'f', icon: <FogIcon /> },
    { mode: 'pan', label: 'mapModePan', key: 'h', icon: <PanIcon /> },
  ],
  [
    { mode: 'wall', label: 'mapModeWall', key: 'w', icon: <WallIcon /> },
    { mode: 'rect', label: 'mapModeRect', key: 'r', icon: <RectIcon /> },
    {
      mode: 'circle',
      label: 'mapModeCircle',
      key: 'c',
      icon: <CircleIcon />,
    },
    { mode: 'poly', label: 'mapModePoly', key: 'g', icon: <PolygonIcon /> },
  ],
  [{ mode: 'erase', label: 'mapModeErase', key: 'e', icon: <EraserIcon /> }],
]
const MODES = TOOL_GROUPS.flat()
const zoom = (factor: number): boolean =>
  window.dispatchEvent(new CustomEvent('map-zoom', { detail: factor }))
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

/** The picture players have been sent, or the notice they get while no map is shared */
const PlayerPreview: React.FC = () => {
  const t = useTerm()
  const shown = useSyncExternalStore(subscribePublishedMap, getPublishedMap)
  return shown ? (
    <img className="map-preview-img" src={shown.url} alt={shown.name} draggable={false} />
  ) : (
    <p className="map-preview-empty">{t('mapNotShared')}</p>
  )
}

const MapTab: React.FC = () => {
  const t = useTerm()
  const go = useGo()
  const s = useMapStore()
  const [preview, setPreview] = useState(() => window.innerWidth >= 900)
  const [drag, setDrag] = useState(false)
  const [panel, setPanel] = useState(false)
  // the detection panel shows the walls its settings would find
  useEffect(() => useMapStore.getState().showPreview(panel), [panel])

  useEffect(() => {
    void useMapStore.getState().restore()
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const el = e.target as HTMLElement | null
      const typing = !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))
      const st = useMapStore.getState()
      if (!typing && st.loaded && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const m = MODES.find((x) => x.key === e.key.toLowerCase())
        if (m) st.setMode(m.mode)
        else if (e.key.toLowerCase() === 'l') st.setMode('wall')
        else if (e.key.toLowerCase() === 'p' && st.analysis) setPreview((on) => !on)
        else if (e.key === '0') zoom(0)
        else if ((e.key === 'Delete' || e.key === 'Backspace') && st.selected !== null) {
          e.preventDefault()
          st.deleteSelected()
        } else if (e.key === 'Escape') st.select(null)
      }
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key.toLowerCase() === 'z' &&
        !typing &&
        useMapStore.getState().history.length
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

  if (!s.loaded)
    return (
      <div className={`map-empty ${drag ? 'map-drag' : ''}`} {...dropProps}>
        <h3>{t('mapDropHint')}</h3>
        {fileButton}
        <button type="button" className="map-link-button" onClick={() => go('/maps')}>
          <LibraryIcon /> {t('mapLibrary')}
          {s.library.length > 0 && ` (${s.library.length})`}
        </button>
        {s.error && <p className="map-error">{t(s.error)}</p>}
      </div>
    )

  const hasEdits = s.history.length > 0

  return (
    <div className={`map-tab ${preview ? 'with-preview' : ''}`}>
      <div className="map-main">
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
            <IconButton
              label={t('mapLibrary')}
              icon={<LibraryIcon />}
              onClick={() => go('/maps')}
            />
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
              icon={<PlayerIcon />}
              active={s.shared}
              pressed={s.shared}
              onClick={() => s.setShared(!s.shared)}
            />
            <IconButton
              label={t('mapPlayerView')}
              shortcut="P"
              icon={<SidebarIcon />}
              active={preview}
              pressed={preview}
              disabled={!s.analysis}
              onClick={() => setPreview(!preview)}
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
            {TOOL_GROUPS.map((group, gi) => (
              <React.Fragment key={gi}>
                {gi > 0 && <span className="map-divider" />}
                {group.map((m) => (
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
              </React.Fragment>
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
            <label className="map-check">
              <input
                type="checkbox"
                checked={s.autoDetect}
                onChange={(e) => s.setAutoDetect(e.target.checked)}
              />
              {t('mapAutoDetect')}
            </label>
            <button
              type="button"
              className="map-panel-action"
              onClick={() => void s.applyDetection()}
              disabled={s.busy}
            >
              <RefreshIcon /> {t('mapRedetect')}
            </button>
          </section>
        )}

        <div className="map-bottom">
          <div className="map-bottom-row">
            <div className="map-group" role="group" aria-label={t('mapGroupFog')}>
              <IconButton
                label={t('mapStyleFog')}
                icon={<FogIcon />}
                tip="above"
                active={s.fogStyle === 'fog'}
                pressed={s.fogStyle === 'fog'}
                onClick={() => s.setFogStyle('fog')}
              />
              <IconButton
                label={t('mapStyleDark')}
                icon={<DarkIcon />}
                tip="above"
                active={s.fogStyle === 'dark'}
                pressed={s.fogStyle === 'dark'}
                onClick={() => s.setFogStyle('dark')}
              />
              <span className="map-divider" />
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
                label={t('mapDelete')}
                shortcut="Del"
                icon={<TrashIcon />}
                tip="above"
                danger
                disabled={s.selected === null}
                onClick={s.deleteSelected}
              />
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
                icon={<RefreshIcon />}
                tip="above"
                danger
                disabled={!hasEdits}
                onClick={s.clearEdits}
              />
            </div>
            {(s.busy || !s.analysis || s.error) && (
              <p className="map-status" role="status">
                {(s.busy || !s.analysis) && t('mapFindingWalls')}
                {s.error && <span className="map-error"> {t(s.error)}</span>}
              </p>
            )}
          </div>
        </div>

        <div className="map-group map-zoom" role="group" aria-label={t('mapGroupZoom')}>
          <IconButton
            label={t('mapZoomIn')}
            icon={<ZoomInIcon />}
            tip="left"
            onClick={() => zoom(1.5)}
          />
          <IconButton
            label={t('mapZoomOut')}
            icon={<ZoomOutIcon />}
            tip="left"
            onClick={() => zoom(1 / 1.5)}
          />
          <IconButton
            label={t('mapZoomFit')}
            shortcut="0"
            icon={<FitIcon />}
            tip="left"
            onClick={() => zoom(0)}
          />
        </div>
      </div>

      {preview && (
        <aside className="map-preview" aria-label={t('mapPlayerView')}>
          <h4>{t('mapPlayerView')}</h4>
          <div className="map-preview-stage">
            <PlayerPreview />
          </div>
        </aside>
      )}
    </div>
  )
}

export default MapTab
