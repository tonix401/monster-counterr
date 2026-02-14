import React from 'react'
import './DragHandleTableData.css'

interface DragHandleTableDataProps {
  isDragging: boolean
  onDragStart: () => void
  onDragEnd: () => void
}

const DragHandleTableData: React.FC<DragHandleTableDataProps> = ({
  isDragging,
  onDragStart,
  onDragEnd,
}) => {
  return (
    <td>
      <div
        className={`drag-handle ${isDragging ? 'dragging' : ''}`}
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="9" cy="5" r="1" />
          <circle cx="9" cy="12" r="1" />
          <circle cx="9" cy="19" r="1" />
          <circle cx="16" cy="5" r="1" />
          <circle cx="16" cy="12" r="1" />
          <circle cx="16" cy="19" r="1" />
        </svg>
      </div>
    </td>
  )
}

export default DragHandleTableData
