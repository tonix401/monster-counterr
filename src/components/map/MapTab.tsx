import React, { useEffect, useState, useSyncExternalStore } from 'react'
import { useTerm } from '@/store/useMonsterStore'
import { useNavigate } from 'react-router'
import { useGo } from '@/hooks/useGo'
import { useMapStore, type MapLayers, type MapParams } from '@/map/mapStore'
import { getPublishedMap, getPublishedTokens, subscribePublishedMap } from '@/map/mapSync'
import { TokenLayer } from '@/components/TokenMark'
import type { MapMode, WallKind } from '@/map/types'
import MapCanvas, { MONSTER_DRAG } from './MapCanvas'
import MonsterAvatar from '@/components/MonsterAvatar'
import { useMonsters, useMonsterStore } from '@/store/useMonsterStore'
import PlayerAvatar from '@/components/PlayerAvatar'
import { nextWallKind, setEdgeKind, wallKind, WALL_KINDS } from '@/map/graph'
import { FT_PER_CELL, NEW_LIGHT, isPlayerTokenId, monsterLabel, playerTokenId } from '@/map/tokens'
import {
  CircleIcon,
  PolygonIcon,
  CloseIcon,
  EraserIcon,
  FitIcon,
  HiddenIcon,
  DarkIcon,
  FogAllIcon,
  FogIcon,
  IconButton,
  LibraryIcon,
  OpenIcon,
  PanIcon,
  PlayerIcon,
  RectIcon,
  RefreshIcon,
  RevealAllIcon,
  SaveIcon,
  SelectIcon,
  SidebarIcon,
  FireIcon,
  PeopleIcon,
  SkullIcon,
  WindowIcon,
  GridIcon,
  SlidersIcon,
  TrashIcon,
  RedoIcon,
  UndoIcon,
  WallIcon,
  SolidWallIcon,
  FurnitureIcon,
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
/** The kinds of wall the palette and the bottom bar offer */
const WALL_LABEL: Record<WallKind, string> = {
  solid: 'mapWallSolid',
  clear: 'mapWallClear',
  furniture: 'mapWallFurniture',
}
const WALL_ICON: Record<WallKind, React.ReactNode> = {
  solid: <SolidWallIcon />,
  clear: <WindowIcon />,
  furniture: <FurnitureIcon />,
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
/** What the DM can hide on the map; pressed means shown */
const LAYERS: { key: keyof MapLayers; label: string; icon: React.ReactNode }[] = [
  { key: 'lights', label: 'mapLayerLights', icon: <FireIcon /> },
  { key: 'players', label: 'mapLayerPlayers', icon: <PeopleIcon /> },
  { key: 'monsters', label: 'mapLayerMonsters', icon: <SkullIcon /> },
  { key: 'walls', label: 'mapLayerWalls', icon: <WallIcon /> },
]
const zoom = (factor: number): boolean =>
  window.dispatchEvent(new CustomEvent('map-zoom', { detail: factor }))
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
  const tokens = useSyncExternalStore(subscribePublishedMap, getPublishedTokens)
  return shown ? (
    <div className="map-preview-layer">
      <img className="map-preview-img" src={shown.url} alt={shown.name} draggable={false} />
      {tokens && <TokenLayer width={tokens.width} height={tokens.height} tokens={tokens.tokens} />}
    </div>
  ) : (
    <p className="map-preview-empty">{t('mapNotShared')}</p>
  )
}

/** The encounter's monsters: drag one onto the map to place it, or back here to take it off */
const MonsterList: React.FC = () => {
  const t = useTerm()
  const navigate = useNavigate()
  const monsters = useMonsters()
  const tokens = useMapStore((s) => s.tokens)
  const toggleHide = useMonsterStore((s) => s.toggleHideMonster)
  const highlight = useMonsterStore((s) => s.highlightMonster)
  return (
    <section className="map-monsters" aria-label={t('mapMonsters')}>
      <h4>{t('mapMonsters')}</h4>
      {monsters.length === 0 ? (
        <p className="map-monsters-empty">{t('mapMonstersEmpty')}</p>
      ) : (
        <ul>
          {monsters.map((m) => (
            <li
              key={m.id}
              className={tokens[m.id] ? 'map-monster-placed' : ''}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData(MONSTER_DRAG, m.id)
                e.dataTransfer.effectAllowed = 'copy'
              }}
              title={t('mapMonsterDrag')}
              onClick={() => {
                // a click opens the encounter list with this monster highlighted
                highlight(m.id)
                navigate('/')
              }}
            >
              <MonsterAvatar monster={m} size={32} faint={m.isHidden} />
              <span className="map-monster-name">{monsterLabel(m)}</span>
              <span onClick={(e) => e.stopPropagation()} draggable={false}>
                <IconButton
                  label={m.isHidden ? t('showMonster') : t('hideMonster')}
                  icon={m.isHidden ? <HiddenIcon /> : <PlayerIcon />}
                  active={!m.isHidden}
                  tip="left"
                  onClick={() => toggleHide(m.id)}
                />
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/** The connected players, and any who were placed and have left: drag them like the monsters */
const PlayerList: React.FC = () => {
  const t = useTerm()
  const connections = useMonsterStore((s) => s.connections)
  const tokens = useMapStore((s) => s.tokens)
  const names = useMapStore((s) => s.players)
  const online = new Map(connections.map((c) => [c.playerId, c.name]))
  const ids = [
    ...new Set([
      ...online.keys(),
      ...Object.keys(tokens)
        .filter(isPlayerTokenId)
        .map((id) => id.slice('player:'.length)),
    ]),
  ]
  return (
    <section className="map-monsters map-players" aria-label={t('mapPlayers')}>
      <h4>{t('mapPlayers')}</h4>
      {ids.length === 0 ? (
        <p className="map-monsters-empty">{t('mapPlayersEmpty')}</p>
      ) : (
        <ul>
          {ids.map((id) => {
            const name = online.get(id) ?? names[id] ?? '?'
            return (
              <li
                key={id}
                className={tokens[playerTokenId(id)] ? 'map-monster-placed' : ''}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData(MONSTER_DRAG, playerTokenId(id))
                  e.dataTransfer.effectAllowed = 'copy'
                }}
                title={t('mapMonsterDrag')}
              >
                <PlayerAvatar name={name} size={32} faint={!online.has(id)} />
                <span className="map-monster-name">{name}</span>
                {!online.has(id) && (
                  <span onClick={(e) => e.stopPropagation()} draggable={false}>
                    <IconButton
                      label={t('mapForgetPlayer')}
                      icon={<TrashIcon />}
                      danger
                      tip="left"
                      onClick={() => useMapStore.getState().forgetPlayer(id)}
                    />
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
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
      const key = e.key.toLowerCase()
      if ((e.ctrlKey || e.metaKey) && !typing) {
        const m = useMapStore.getState()
        if (key === 'z' && !e.shiftKey && m.history.length) {
          e.preventDefault()
          m.undoEdit()
        } else if ((key === 'y' || (key === 'z' && e.shiftKey)) && m.future.length) {
          e.preventDefault()
          m.redoEdit()
        }
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

  const hasEdits = s.graph !== s.baseline
  const selectedWall =
    s.selected?.kind === 'edge' ? s.graph.edges.find((e) => e.id === s.selected!.id) : undefined

  return (
    <div className={`map-tab ${preview ? 'with-preview' : ''}`}>
      <div className="map-main">
        <div className={`map-stage ${drag ? 'map-drag' : ''}`} {...dropProps}>
          <MapCanvas player={false} />
        </div>

        <div className="map-topbar">
          <div className="map-right">
            <div className="map-group map-files" role="group" aria-label={t('mapGroupFile')}>
              <label
                className="map-icon-btn"
                aria-label={t('mapOpen')}
                data-tip={t('mapOpen')}
                data-tip-side="left"
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
                tip="left"
                onClick={() => go('/maps')}
              />
              <IconButton label={t('mapSave')} icon={<SaveIcon />} tip="left" onClick={save} />
              <IconButton
                label={t('mapClose')}
                icon={<CloseIcon />}
                danger
                tip="left"
                onClick={s.closeMap}
              />
            </div>
            <div className="map-group map-layers" role="group" aria-label={t('mapGroupLayers')}>
              {LAYERS.map((l) => (
                <IconButton
                  key={l.key}
                  label={t(l.label)}
                  icon={l.icon}
                  tip="left"
                  active={s.layers[l.key]}
                  pressed={s.layers[l.key]}
                  onClick={() => s.setLayer(l.key, !s.layers[l.key])}
                />
              ))}
            </div>
          </div>

          <div className="map-group map-group-end">
            <IconButton
              label={t('mapPlayerView')}
              shortcut="P"
              icon={<SidebarIcon />}
              active={preview}
              pressed={preview}
              disabled={!s.analysis}
              onClick={() => setPreview(!preview)}
            />
          </div>
          <div className="map-left">
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
              <span className="map-divider" />
              {WALL_KINDS.map((k) => (
                <IconButton
                  key={k}
                  label={t(WALL_LABEL[k])}
                  icon={WALL_ICON[k]}
                  tip="right"
                  active={s.drawKind === k}
                  pressed={s.drawKind === k}
                  onClick={() => s.setDrawKind(k)}
                />
              ))}
            </div>
            <div className="map-group map-light" role="group" aria-label={t('mapGroupLight')}>
              <IconButton
                label={t('mapLightFire')}
                icon={<FireIcon />}
                tip="right"
                onDragStart={(e) => {
                  e.dataTransfer.setData(MONSTER_DRAG, NEW_LIGHT)
                  e.dataTransfer.effectAllowed = 'copy'
                }}
                onClick={() => s.addLight({ x: s.width / 2, y: s.height / 2 })}
              />
              <IconButton
                label={t('mapGrid')}
                icon={<GridIcon />}
                tip="right"
                active={s.grid.on}
                pressed={s.grid.on}
                onClick={() => s.setGrid({ on: !s.grid.on })}
              />
              {s.grid.on && (
                <label className="map-grid-size">
                  <span>
                    {t('mapGridSize')} <output>{FT_PER_CELL} ft</output>
                  </span>
                  <input
                    type="range"
                    min={8}
                    max={Math.max(8, Math.round(Math.max(s.width, s.height) / 4))}
                    step={1}
                    value={s.grid.cell}
                    onChange={(e) => s.setGrid({ cell: +e.target.value })}
                  />
                </label>
              )}
            </div>
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
              <IconButton
                label={t('mapWallDetection')}
                icon={<SlidersIcon />}
                tip="above"
                active={panel}
                pressed={panel}
                onClick={() => setPanel(!panel)}
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
                label={t('mapCycleWallKind')}
                icon={WALL_ICON[selectedWall ? wallKind(selectedWall) : 'solid']}
                tip="above"
                disabled={!selectedWall || selectedWall.border}
                active={!!selectedWall?.kind}
                onClick={() =>
                  selectedWall &&
                  s.setGraph(
                    setEdgeKind(s.graph, selectedWall.id, nextWallKind(wallKind(selectedWall)))
                  )
                }
              />
              <IconButton
                label={t('mapUndoEdit')}
                shortcut="Ctrl+Z"
                icon={<UndoIcon />}
                tip="above"
                disabled={s.history.length === 0}
                onClick={s.undoEdit}
              />
              <IconButton
                label={t('mapRedoEdit')}
                shortcut="Ctrl+Y"
                icon={<RedoIcon />}
                tip="above"
                disabled={s.future.length === 0}
                onClick={s.redoEdit}
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
          <div
            className="map-group map-preview-controls"
            role="group"
            aria-label={t('mapPlayerView')}
          >
            <IconButton
              label={t('mapShare')}
              icon={<PlayerIcon />}
              tip="above"
              active={s.shared}
              pressed={s.shared}
              onClick={() => s.setShared(!s.shared)}
            />
            <span className="map-divider" />
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
          </div>
          <MonsterList />
          <PlayerList />
        </aside>
      )}
    </div>
  )
}

export default MapTab
