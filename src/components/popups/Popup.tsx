import React from 'react';

interface PopupProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  width?: number;
  children: React.ReactNode;
}

const Popup: React.FC<PopupProps> = ({ isOpen, onClose, title, width = 400, children }) => {
  if (!isOpen) return null;

  return (
    <>
      <div className="popup-after" onClick={onClose}></div>
      <div className="popup-window" style={{ width: `${width}px` }}>
        {title && <h3>{title}</h3>}
        {children}
      </div>
    </>
  );
};

export default Popup;
