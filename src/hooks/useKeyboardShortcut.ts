import { useEffect } from 'react'

interface KeyboardShortcut {
  key: string
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  handler: () => void
  preventDefault?: boolean
}

export const useKeyboardShortcut = (shortcut: KeyboardShortcut) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const {
        key,
        ctrl = false,
        shift = false,
        alt = false,
        handler,
        preventDefault = true,
      } = shortcut

      const ctrlMatch = ctrl ? e.ctrlKey || e.metaKey : !e.ctrlKey && !e.metaKey
      const shiftMatch = shift ? e.shiftKey : !e.shiftKey
      const altMatch = alt ? e.altKey : !e.altKey

      if (e.key === key && ctrlMatch && shiftMatch && altMatch) {
        if (preventDefault) {
          e.preventDefault()
        }
        handler()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [shortcut])
}

export const useUndoRedoShortcuts = (undo: () => void, redo: () => void) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Z or Cmd+Z for undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      }
      // Ctrl+Y or Ctrl+Shift+Z or Cmd+Shift+Z for redo
      else if (
        ((e.ctrlKey || e.metaKey) && e.key === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z')
      ) {
        e.preventDefault()
        redo()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo])
}
