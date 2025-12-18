import React, { useState, useRef, useEffect } from 'react';
import { useMonsterStore } from '../store';

interface MonsterSuggestionInputProps {
  onHpChange: (hp: number) => void;
  value: string;
  onChange: (value: string) => void;
}

const MonsterSuggestionInput: React.FC<MonsterSuggestionInputProps> = ({
  onHpChange,
  value,
  onChange
}) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const getMonsterNames = useMonsterStore((state) => state.getMonsterNames);
  const getMonsterIdByName = useMonsterStore((state) => state.getMonsterIdByName);
  const isMonsterDetailsAvailable = useMonsterStore((state) => state.isMonsterDetailsAvailable);
  const addMonsterDetails = useMonsterStore((state) => state.addMonsterDetails);
  const getMonsterDetails = useMonsterStore((state) => state.getMonsterDetails);

  const monsterNames = getMonsterNames();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    onChange(query);

    if (query === '') {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const filteredOptions = monsterNames.filter((option) =>
      option.toLowerCase().includes(query.toLowerCase())
    );

    setSuggestions(filteredOptions);
    setShowSuggestions(filteredOptions.length > 0);
    setHighlightedIndex(-1);
  };

  const handleMonsterSelect = async (monsterName: string) => {
    const id = getMonsterIdByName(monsterName);
    if (!id) return;

    if (!isMonsterDetailsAvailable(id)) {
      await addMonsterDetails(id);
    }
    const details = getMonsterDetails(id);
    if (details) {
      onHpChange(details.hit_points);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion);
    setShowSuggestions(false);
    handleMonsterSelect(suggestion);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && highlightedIndex >= 0) {
      e.preventDefault();
      handleSuggestionClick(suggestions[highlightedIndex]);
    }
  };

  useEffect(() => {
    if (value && monsterNames.includes(value)) {
      handleMonsterSelect(value);
    }
  }, [value]);

  return (
    <div className="suggestion-input-container">
      <input
        ref={inputRef}
        id="monster-suggestion-input"
        placeholder="Name"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
      />
      {showSuggestions && (
        <div className="suggestions-container" style={{ display: 'block' }}>
          {suggestions.map((suggestion, index) => (
            <div
              key={suggestion}
              className={`suggestion-item ${index === highlightedIndex ? 'highlighted' : ''}`}
              onClick={() => handleSuggestionClick(suggestion)}
            >
              {suggestion}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MonsterSuggestionInput;
