import React from 'react'
import './Popup.css'

interface PopupProps {
  onClose: () => void
  title?: string
  width?: number
  children: React.ReactNode
  style?: React.CSSProperties
}

const Popup: React.FC<PopupProps> = ({ onClose, title, width = 400, children, style }) => {
  return (
    <>
      <div className="popup-after" onClick={onClose}></div>
      <div className="popup-window" style={{ width: `${width}px`, ...style }}>
        {title && <h1 className='popup-title'>{title}</h1>}
        {children}
      </div>
    </>
  )
}

export default Popup
