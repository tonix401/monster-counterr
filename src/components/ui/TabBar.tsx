import React from 'react'
import { NavLink, type To } from 'react-router'
import './TabBar.css'

export interface Tab {
  to: To
  label: string
  /** Match only the exact path, so a parent tab isn't active on its children */
  end?: boolean
}

const TabBar: React.FC<{ tabs: Tab[] }> = ({ tabs }) => (
  <nav className="tab-bar">
    {tabs.map((tab) => (
      <NavLink key={tab.label} to={tab.to} end={tab.end} replace className="tab-link">
        {tab.label}
      </NavLink>
    ))}
  </nav>
)

export default TabBar
