import React from 'react'
import './Popup.css'

interface PopupProps {
  onClose: () => void
  title?: string
  width?: number
  children: React.ReactNode
}

const Popup: React.FC<PopupProps> = ({ onClose, title, width = 400, children }) => {
  return (
    <>
      <div className="popup-after" onClick={onClose}></div>
      <div className="popup-window" style={{ width: `${width}px` }}>
        {title && <h3>{title}</h3>}
        {children}
      </div>
    </>
  )
}

export default Popup
