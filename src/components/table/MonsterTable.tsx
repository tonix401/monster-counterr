import React, { useState } from 'react'
import { useMonsters, useSettings } from '@/store/useMonsterStore'
import { useMonsterStore } from '@/store/useMonsterStore'
import MonsterTableRow from '@/components/table/MonsterTableRow'
import TableHeaderRow from '@/components/table/TableHeaderRow'
import TableColgroup from '@/components/table/TableColgroup'
import './MonsterTable.css'
import { AddMonsterRow } from './AddMonsterRow'

const MonsterTable: React.FC = () => {
  const monsters = useMonsters()
  const settings = useSettings()
  const reorderMonsters = useMonsterStore((state) => state.reorderMonsters)
  const [draggedMonsterId, setDraggedMonsterId] = useState<string | null>(null)
  const [draggedFromIndex, setDraggedFromIndex] = useState<number | null>(null)
  const [dropZoneIndex, setDropZoneIndex] = useState<number | null>(null)
  const [isAnimationDisabled, setIsAnimationDisabled] = useState(false)

  // Calculate the actual number of columns
  let colCount = 1 // drag-handle
  if (settings.showQuickActions) colCount++
  colCount++ // name
  if (settings.showConditions) colCount++
  if (settings.showStatus) colCount++
  if (settings.showHealth) colCount++
  if (settings.showChangeHp) colCount++

  const handleDragStart = (index: number) => {
    setDraggedMonsterId(monsters[index].id)
    setDraggedFromIndex(index)
  }

  const handleDragOverMonster = (e: React.DragEvent<HTMLTableRowElement>, targetIndex: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (draggedMonsterId === null || draggedFromIndex === null) return

    // Get the bounding rectangle of the current target element
    const rect = e.currentTarget.getBoundingClientRect()
    const midpoint = rect.top + rect.height / 2

    // If cursor is above the midpoint, target the drop zone above
    // If cursor is below the midpoint, target the drop zone below
    const dropZone = e.clientY < midpoint ? targetIndex - 1 : targetIndex

    // Calculate where the monster would actually end up
    let finalTargetIndex = dropZone
    if (draggedFromIndex < dropZone) {
      finalTargetIndex = dropZone - 1
    }

    // Only allow targeting drop zones that would actually change the order
    if (draggedFromIndex !== finalTargetIndex) {
      dropZone !== dropZoneIndex && setDropZoneIndex(dropZone)
    } else {
      setDropZoneIndex(null)
    }
  }

  const handleDragOverDropZone = (e: React.DragEvent<HTMLTableRowElement>, dropIndex: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (draggedMonsterId === null || draggedFromIndex === null) return

    // Don't allow targeting drop zones directly above or below the dragged row
    if (dropIndex === draggedFromIndex || dropIndex === draggedFromIndex + 1) {
      return
    }

    setDropZoneIndex(dropIndex)
  }

  const handleDragLeave = () => {
    setDropZoneIndex(null)
  }

  const handleDrop = (e: React.DragEvent<HTMLTableRowElement>) => {
    e.preventDefault()
    if (draggedFromIndex === null || dropZoneIndex === null) return

    // Disable animations during reorder so other rows don't animate
    setIsAnimationDisabled(true)

    // dropZoneIndex represents the insertion point (0 = before all, length = after all)
    let targetIndex = dropZoneIndex
    if (draggedFromIndex < dropZoneIndex) {
      targetIndex = dropZoneIndex - 1
    }

    if (draggedFromIndex !== targetIndex) {
      reorderMonsters(draggedFromIndex, targetIndex)
    }

    setDropZoneIndex(null)
    setDraggedFromIndex(null)

    // Re-enable animations and clear dragged state so the row can animate back to normal
    setTimeout(() => {
      setIsAnimationDisabled(false)
      setDraggedMonsterId(null)
    }, 50)
  }

  const handleDragEnd = () => {
    setDraggedMonsterId(null)
    setDraggedFromIndex(null)
    setDropZoneIndex(null)
  }

  const rows = []

  rows.push(
    <tr
      key="drop-zone-0"
      className={dropZoneIndex === 0 ? 'drop-zone active-drop-zone' : 'drop-zone'}
      onDragOver={(e) => handleDragOverDropZone(e, 0)}
      onDrop={handleDrop}
    >
      <td colSpan={colCount}></td>
    </tr>
  )

  monsters.forEach((monster, index) => {
    // Monster row
    rows.push(
      <MonsterTableRow
        key={monster.id}
        monster={monster}
        isDragging={draggedMonsterId === monster.id}
        onDragStart={() => handleDragStart(index)}
        onDragOver={(e) => handleDragOverMonster(e, index + 1)}
        onDrop={handleDrop}
        onDragEnd={handleDragEnd}
      />
    )

    // Drop zone after this monster
    rows.push(
      <tr
        key={`drop-zone-${index + 1}`}
        className={dropZoneIndex === index + 1 ? 'drop-zone active-drop-zone' : 'drop-zone'}
        onDragOver={(e) => handleDragOverDropZone(e, index + 1)}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <td colSpan={colCount}></td>
      </tr>
    )
  })

  return (
    <table className={isAnimationDisabled ? 'animation-disabled' : ''} onDragLeave={handleDragLeave}>
      <TableColgroup />
      <thead>
        <TableHeaderRow />
      </thead>
      <tbody>
        {rows}
        <AddMonsterRow />
      </tbody>
    </table>
  )
}

export default MonsterTable
