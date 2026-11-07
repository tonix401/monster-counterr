import React from 'react'
import { NavLink, type To } from 'react-router'
import './TabBar.css'

export type TabIcon = 'encounter' | 'map' | 'settings'

export interface Tab {
  to: To
  label: string
  icon?: TabIcon
  /** Match only the exact path, so a parent tab isn't active on its children */
  end?: boolean
}

const svgProps = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: false,
}

const Icon: React.FC<{ icon: TabIcon }> = ({ icon }) =>
  icon === 'map' ? (
    <svg {...svgProps} className="tab-icon">
      <path d="M9 4 3 6.5v13L9 17l6 3 6-2.5v-13L15 7z" />
      <path d="M9 4v13M15 7v13" />
    </svg>
  ) : icon === 'settings' ? (
    <svg {...svgProps} className="tab-icon">
      <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="8" cy="17" r="2" />
    </svg>
  ) : (
    <svg {...svgProps} className="tab-icon">
      <path d="M14.5 17.5 3 6V3h3l11.5 11.5" />
      <path d="m13 19 6-6M16 16l4 4M19 21l2-2" />
      <path d="m14.5 6.5 3-3.5h3v3l-3.5 3" />
      <path d="m5 14 4 4M7 17l-3 3M3 19l2 2" />
    </svg>
  )

/** `bottom` makes it a phone style menu: icon above label, spread over the full width */
const TabBar: React.FC<{ tabs: Tab[]; bottom?: boolean }> = ({ tabs, bottom }) => (
  <nav className={`tab-bar ${bottom ? 'tab-bar-bottom' : ''}`} aria-label="Views">
    {tabs.map((tab, i) => (
      <NavLink key={i} to={tab.to} end={tab.end} replace className="tab-link">
        {tab.icon && <Icon icon={tab.icon} />}
        <span className="tab-label">{tab.label}</span>
      </NavLink>
    ))}
  </nav>
)

export default TabBar
