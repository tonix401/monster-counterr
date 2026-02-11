import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { fuzzySort } from './DropdownInputHelper'
import './DropdownInput.css'
import { useTerm } from '@/store/MonsterStore'

type DropdownOption = {
  value: string
  label: string
}

type DropdownInputProps = {
  options: DropdownOption[]
  placeholder?: string
  required?: boolean
  id?: string
  maxEntries?: number
  onChange: (value: string) => void
}

export const DropdownInput: React.FC<DropdownInputProps> = ({
  options,
  placeholder,
  required,
  id,
  maxEntries = 5,
  onChange,
}) => {
  // #region State & Refs
  const [isOpen, setIsOpen] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [isMouseOver, setIsMouseOver] = useState(false)
  const [currArrayIndex, setHighlightedIndex] = useState(0) // Absolute index in allFilteredOptions
  const [scrollOffset, setScrollOffset] = useState(0) // Start index of visible window
  const [portalStyle, setPortalStyle] = useState<React.CSSProperties | null>(null)
  const [containerHeight, setContainerHeight] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const t = useTerm()

  const updatePortalStyle = () => {
    const rect = inputRef.current?.getBoundingClientRect()
    setPortalStyle(rect ? { top: rect.bottom + 3, left: rect.left, width: rect.width } : null)
  }

  useLayoutEffect(() => {
    updatePortalStyle()
    if (!isOpen) return
    if (containerRef.current) {
      setContainerHeight(containerRef.current.offsetHeight)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    updatePortalStyle()
    window.addEventListener('resize', updatePortalStyle)
    return () => window.removeEventListener('resize', updatePortalStyle)
  }, [isOpen])

  const allSortedOptions = fuzzySort(options, inputValue)
  const visibleOptions = allSortedOptions.slice(scrollOffset, scrollOffset + maxEntries)

  // #endregion State & Refs
  // #region Handlers

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInputValue(value)
    setIsOpen(value.length > 0)
    setHighlightedIndex(0)
    setScrollOffset(0)
    onChange(value)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || allSortedOptions.length === 0) return

    if (e.key === 'ArrowDown' && !isMouseOver) {
      e.preventDefault()
      const nextIndex = Math.min(currArrayIndex + 1, allSortedOptions.length - 1)
      setHighlightedIndex(nextIndex)

      // Scroll down if needed
      if (nextIndex >= scrollOffset + maxEntries) {
        setScrollOffset((o) => o + 1)
      }
    } else if (e.key === 'ArrowUp' && !isMouseOver) {
      e.preventDefault()
      const prevIndex = Math.max(currArrayIndex - 1, 0)
      setHighlightedIndex(prevIndex)

      // Scroll up if needed
      if (prevIndex < scrollOffset) {
        setScrollOffset(prevIndex)
      }
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const selected = allSortedOptions[currArrayIndex]
      if (selected) {
        setInputValue(selected.label)
        setIsOpen(false)
        onChange(selected.label)
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
      e.stopPropagation()
    }
  }

  const handleOptionClick = (option: DropdownOption) => {
    setInputValue(option.label)
    setIsOpen(false)
    onChange(option.label)
  }

  const handleClearValue = () => {
    setInputValue('')
    onChange('')
  }

  const handleFocus = () => {
    setIsOpen(true)
    handleClearValue()
    setIsFocused(true)
    setHighlightedIndex(0)
    setScrollOffset(0)
  }

  const handleBlur = () => {
    setIsFocused(false)
    setIsOpen(false)
    setHighlightedIndex(0)
    setScrollOffset(0)
  }

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.stopPropagation()
    const delta = e.deltaY > 0 ? 1 : -1
    const newScrollOffset = Math.max(
      0,
      Math.min(scrollOffset + delta, allSortedOptions.length - maxEntries)
    )
    setScrollOffset(newScrollOffset)
  }

  const handleMouseEnter = () => setIsMouseOver(true)
  const handleMouseLeave = () => setIsMouseOver(false)

  // #endregion Handlers
  // #region Component

  return (
    <div className="dropdown-input-container" id={id}>
      <input
        className="dropdown-input"
        type="text"
        value={inputValue}
        required={required}
        onKeyDown={handleKeyDown}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        ref={inputRef}
        autoComplete="off"
        placeholder={isFocused ? t('startTypingToSearch') : placeholder}
      />
      {isOpen &&
        portalStyle &&
        createPortal(
          <>
            {allSortedOptions.length > 0 ? (
              <div
                className={`dropdown-options-container ${
                  allSortedOptions.length > maxEntries ? 'has-progress' : ''
                }`.trim()}
                style={portalStyle}
                onWheel={handleWheel}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                ref={containerRef}
              >
                <div className="dropdown-options-inner">
                  {visibleOptions.map((option, relativeIndex) => {
                    const _currArrayIndex = scrollOffset + relativeIndex
                    return (
                      <div
                        key={option.value}
                        className={
                          'dropdown-option' +
                          (_currArrayIndex === currArrayIndex ? ' highlighted' : '')
                        }
                        onMouseDown={() => handleOptionClick(option)}
                        onMouseEnter={() => setHighlightedIndex(_currArrayIndex)}
                        title={option.label}
                      >
                        {option.label}
                      </div>
                    )
                  })}
                </div>
                {allSortedOptions.length > maxEntries && (
                  <div
                    className="scroll-progress-div"
                    style={
                      {
                        '--progress': scrollOffset / (allSortedOptions.length - maxEntries),
                        '--container-height': `${containerHeight}px`,
                        '--indicator-height': `${Math.max(
                          8,
                          (containerHeight * maxEntries) / allSortedOptions.length
                        )}px`,
                      } as React.CSSProperties
                    }
                  />
                )}
              </div>
            ) : (
              <div className="dropdown-options-container" style={portalStyle}>
                <div
                  key="__no_option__"
                  className="dropdown-option no-option"
                  onMouseEnter={() => setHighlightedIndex(-1)}
                >
                  {t('noResults')}
                </div>
              </div>
            )}
          </>,
          document.body
        )}
    </div>
  )
  // #endregion Component
}
