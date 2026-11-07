import React from 'react'

const Svg: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    {children}
  </svg>
)

const icon = (children: React.ReactNode): React.FC => {
  const Icon: React.FC = () => <Svg>{children}</Svg>
  return Icon
}

export const FogIcon = icon(
  <>
    <path d="M7 17a4 4 0 0 1-.5-7.97A5.5 5.5 0 0 1 17 8.5a3.75 3.75 0 0 1 .5 7.5H7z" />
    <path d="M4 21h16" />
  </>
)
export const DarkIcon = icon(
  <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z" fill="currentColor" fillOpacity="0.35" />
)
export const WallIcon = icon(
  <>
    <path d="M4 20 20 4" />
    <circle cx="4" cy="20" r="1.5" />
    <circle cx="20" cy="4" r="1.5" />
  </>
)
export const EraserIcon = icon(
  <>
    <path d="m7 21-4.3-4.3a1 1 0 0 1 0-1.4l9.6-9.6a1 1 0 0 1 1.4 0l5.6 5.6a1 1 0 0 1 0 1.4L13 21" />
    <path d="M22 21H7" />
    <path d="m5 11 9 9" />
  </>
)
export const SelectIcon = icon(<path d="m5 3 14 7-6 2-2 6z" />)
export const RectIcon = icon(<rect x="4" y="5" width="16" height="14" rx="1" />)
export const PolygonIcon = icon(<path d="M7 4h10l4 8-5 8H8l-5-7z" />)
export const CircleIcon = icon(<circle cx="12" cy="12" r="8" />)
export const PanIcon = icon(
  <>
    <path d="M12 3v18M3 12h18" />
    <path d="m9 6 3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3" />
  </>
)
export const ZoomInIcon = icon(
  <>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3M11 8v6M8 11h6" />
  </>
)
export const ZoomOutIcon = icon(
  <>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3M8 11h6" />
  </>
)
export const FitIcon = icon(<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />)
export const OpenIcon = icon(
  <>
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
  </>
)
export const LibraryIcon = icon(
  <>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </>
)
export const SaveIcon = icon(
  <>
    <path d="M12 3v12m0 0-4-4m4 4 4-4" />
    <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
  </>
)
export const CloseIcon = icon(<path d="M18 6 6 18M6 6l12 12" />)
export const SidebarIcon = icon(
  <>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M15 4v16" />
  </>
)
export const PlayerIcon = icon(
  <>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </>
)
export const HiddenIcon = icon(
  <>
    <path d="M10.7 5.1A10.4 10.4 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-2.6 3.5M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a10 10 0 0 0 4.4-1" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    <path d="m3 3 18 18" />
  </>
)
export const SlidersIcon = icon(
  <>
    <path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h12M20 18h0" />
    <circle cx="16" cy="6" r="2" />
    <circle cx="8" cy="12" r="2" />
    <circle cx="18" cy="18" r="2" />
  </>
)
export const FogAllIcon = icon(
  <>
    <rect x="3" y="3" width="18" height="18" rx="2" fill="currentColor" fillOpacity="0.35" />
    <path d="M8 12h8" />
  </>
)
export const RevealAllIcon = icon(
  <>
    <rect x="3" y="3" width="18" height="18" rx="2" strokeDasharray="3 3" />
    <path d="M12 8v8M8 12h8" />
  </>
)
export const UndoIcon = icon(
  <>
    <path d="M9 14 4 9l5-5" />
    <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
  </>
)
export const RedoIcon = icon(
  <>
    <path d="m15 14 5-5-5-5" />
    <path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13" />
  </>
)
export const TrashIcon = icon(
  <>
    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
    <path d="M10 11v6M14 11v6" />
  </>
)
export const CopyIcon = icon(
  <>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V6a2 2 0 0 1 2-2h8" />
  </>
)
export const RefreshIcon = icon(
  <>
    <path d="M21 12a9 9 0 0 1-15.5 6.2L3 16" />
    <path d="M3 21v-5h5" />
    <path d="M3 12A9 9 0 0 1 18.5 5.8L21 8" />
    <path d="M21 3v5h-5" />
  </>
)

export const PeopleIcon = icon(
  <>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
    <path d="M16 4.7a3.5 3.5 0 0 1 0 6.6M18 14a6.5 6.5 0 0 1 3.5 6" />
  </>
)
export const SkullIcon = icon(
  <>
    <path d="M12 3a8 8 0 0 0-8 8c0 2.6 1.3 4.2 3 5.3V20h10v-3.7c1.7-1.1 3-2.7 3-5.3a8 8 0 0 0-8-8z" />
    <circle cx="9" cy="11.5" r="1.4" />
    <circle cx="15" cy="11.5" r="1.4" />
    <path d="M10.5 20v-2.5M13.5 20v-2.5" />
  </>
)
export const WindowIcon = icon(
  <>
    <rect x="4" y="3" width="16" height="18" rx="1" strokeDasharray="3 2" />
    <path d="M12 3v18M4 12h16" />
  </>
)
export const FireIcon = icon(
  <path d="M12 2c1 3.5 5 5.5 5 10.2A5 5 0 0 1 12 17.5a5 5 0 0 1-5-5.3c0-2 1-3.4 2.2-4.6.2 1.4.9 2.3 1.8 2.6C10.7 7.5 11 4.5 12 2z M9 21h6" />
)
export const GridIcon = icon(
  <>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
  </>
)

interface IconButtonProps {
  label: string
  shortcut?: string
  icon: React.ReactNode
  active?: boolean
  pressed?: boolean
  danger?: boolean
  disabled?: boolean
  onClick?: () => void
  /** Makes the button draggable; called with the drag event to fill the data transfer */
  onDragStart?: (e: React.DragEvent) => void
  /** Side the tooltip opens towards */
  tip?: 'right' | 'left' | 'below' | 'above'
}

/** Square icon button with a tooltip (label plus keyboard shortcut) and an aria-label */
export const IconButton: React.FC<IconButtonProps> = ({
  label,
  shortcut,
  icon: glyph,
  active,
  pressed,
  danger,
  disabled,
  onClick,
  onDragStart,
  tip = 'below',
}) => (
  <button
    type="button"
    className={`map-icon-btn ${active ? 'active' : ''} ${danger ? 'danger' : ''}`}
    aria-label={shortcut ? `${label} (${shortcut})` : label}
    aria-pressed={pressed}
    data-tip={shortcut ? `${label}  ${shortcut}` : label}
    data-tip-side={tip}
    disabled={disabled}
    onClick={onClick}
    draggable={onDragStart ? true : undefined}
    onDragStart={onDragStart}
  >
    {glyph}
  </button>
)
