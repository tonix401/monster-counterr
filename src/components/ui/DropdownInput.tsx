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
  const [isOpen, setIsOpen] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(0) // Absolute index in allFilteredOptions
  const [scrollOffset, setScrollOffset] = useState(0) // Start index of visible window
  const [portalStyle, setPortalStyle] = useState<React.CSSProperties | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const t = useTerm()

  const updatePortalStyle = () => {
    const rect = inputRef.current?.getBoundingClientRect()
    setPortalStyle(rect ? { top: rect.bottom + 3, left: rect.left, width: rect.width } : null)
  }

  useLayoutEffect(() => {
    if (!isOpen) return
    updatePortalStyle()
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    updatePortalStyle()
    window.addEventListener('resize', updatePortalStyle)
    return () => window.removeEventListener('resize', updatePortalStyle)
  }, [isOpen])

  // Get all filtered and sorted options
  const allFilteredOptions = fuzzySort(options, inputValue)

  // Calculate visible window
  const visibleOptions = allFilteredOptions.slice(scrollOffset, scrollOffset + maxEntries)
  const hiddenBelow = Math.max(0, allFilteredOptions.length - scrollOffset - maxEntries)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInputValue(value)
    setIsOpen(value.length > 0)
    setHighlightedIndex(0)
    setScrollOffset(0)
    onChange(value)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || allFilteredOptions.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const nextIndex = Math.min(highlightedIndex + 1, allFilteredOptions.length - 1)
      setHighlightedIndex(nextIndex)

      // Scroll down if needed
      if (nextIndex >= scrollOffset + maxEntries) {
        setScrollOffset(nextIndex - maxEntries + 1)
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const prevIndex = Math.max(highlightedIndex - 1, 0)
      setHighlightedIndex(prevIndex)

      // Scroll up if needed
      if (prevIndex < scrollOffset) {
        setScrollOffset(prevIndex)
      }
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const selected = allFilteredOptions[highlightedIndex]
      if (selected) {
        setInputValue(selected.label)
        setIsOpen(false)
        onChange(selected.label)
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setIsOpen(false)
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

  return (
    <div className="dropdown-input-container" id={id}>
      <input
        id="dropdown-input"
        type="text"
        value={inputValue}
        required={required}
        onKeyDown={handleKeyDown}
        onChange={handleInputChange}
        onFocus={() => {
          setIsOpen(true)
          handleClearValue()
          setIsFocused(true)
          setHighlightedIndex(0)
          setScrollOffset(0)
        }}
        onBlur={() => {
          setIsFocused(false)
          setIsOpen(false)
          setHighlightedIndex(0)
          setScrollOffset(0)
        }}
        ref={inputRef}
        autoComplete="off"
        placeholder={isFocused ? t('startTypingToSearch') : placeholder}
        style={isOpen ? { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 } : {}}
      />
      {isOpen &&
        portalStyle &&
        createPortal(
          <>
            {allFilteredOptions.length > 0 ? (
              <div className="dropdown-options-container" style={portalStyle}>
                {visibleOptions.map((option, relativeIndex) => {
                  const _absoluteIndex = scrollOffset + relativeIndex
                  return (
                    <div
                      key={option.value}
                      className={
                        'dropdown-option' +
                        (_absoluteIndex === highlightedIndex ? ' highlighted' : '')
                      }
                      onMouseDown={() => handleOptionClick(option)}
                      onMouseEnter={() => setHighlightedIndex(_absoluteIndex)}
                      title={option.label}
                    >
                      {option.label}
                    </div>
                  )
                })}
                {hiddenBelow > 0 && (
                  <div
                    key="__bottom_more_results__"
                    className="dropdown-option no-option"
                    onMouseEnter={() => setHighlightedIndex(-1)}
                  >
                    {t('moreResults', { results: hiddenBelow })}
                  </div>
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
}
