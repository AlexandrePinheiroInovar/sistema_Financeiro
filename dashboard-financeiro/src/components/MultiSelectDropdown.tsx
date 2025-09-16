import React, { useState, useRef, useEffect } from 'react';

interface MultiSelectDropdownProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}

export const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  label,
  options,
  selected,
  onChange,
  placeholder = `Selecione ${label.toLowerCase()}`
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Filter options based on search term
  const filteredOptions = options.filter(option =>
    option.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggleAll = () => {
    if (selected.length === options.length) {
      // Se todas estão selecionadas, desmarcar todas
      onChange([]);
    } else {
      // Se nem todas estão selecionadas, selecionar todas
      onChange([...options]);
    }
  };

  const handleToggleOption = (option: string) => {
    if (selected.includes(option)) {
      // Se está selecionada, remover
      onChange(selected.filter(item => item !== option));
    } else {
      // Se não está selecionada, adicionar
      onChange([...selected, option]);
    }
  };

  const getDisplayText = () => {
    if (selected.length === 0) {
      return placeholder;
    } else if (selected.length === 1) {
      return selected[0];
    } else if (selected.length === options.length) {
      return 'Todas as opções';
    } else {
      return `${selected.length} opções selecionadas`;
    }
  };

  const isAllSelected = selected.length === options.length;
  const isIndeterminate = selected.length > 0 && selected.length < options.length;

  return (
    <div className="multi-select-container" ref={dropdownRef}>
      <div 
        className="multi-select-trigger"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) {
            setSearchTerm('');
          }
        }}
      >
        <span className="multi-select-text">
          {getDisplayText()}
        </span>
        <span className={`multi-select-arrow ${isOpen ? 'open' : ''}`}>
          ▼
        </span>
      </div>

      {isOpen && (
        <div className="multi-select-dropdown">
          {/* Search Field */}
          <div className="multi-select-search">
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar..."
              className="multi-select-search-input"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* "Todas" option */}
          <div className="multi-select-header">
            <label className="multi-select-option multi-select-all">
              <input
                type="checkbox"
                checked={isAllSelected}
                ref={(el) => {
                  if (el) el.indeterminate = isIndeterminate;
                }}
                onChange={handleToggleAll}
                className="multi-select-checkbox"
              />
              <span className="multi-select-label">Todas</span>
            </label>
          </div>
          
          {/* Filtered options list */}
          <div className="multi-select-list">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <label key={option} className="multi-select-option">
                  <input
                    type="checkbox"
                    checked={selected.includes(option)}
                    onChange={() => handleToggleOption(option)}
                    className="multi-select-checkbox"
                  />
                  <span className="multi-select-label">{option}</span>
                </label>
              ))
            ) : (
              <div className="multi-select-no-results">
                Nenhuma opção encontrada
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};