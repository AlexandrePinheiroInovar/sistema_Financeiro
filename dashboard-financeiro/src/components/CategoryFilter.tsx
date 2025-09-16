import React from 'react';

interface CategoryFilterProps {
  options: string[];
  selected: string[];
  onChange: (values: string[]) => void;
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  options,
  selected,
  onChange
}) => {
  const handleToggleAll = () => {
    if (selected.length === options.length) {
      // Se todas estão selecionadas, desmarcar todas
      onChange([]);
    } else {
      // Se nem todas estão selecionadas, selecionar todas
      onChange([...options]);
    }
  };

  const handleToggleCategory = (category: string) => {
    if (selected.includes(category)) {
      // Se está selecionada, remover
      onChange(selected.filter(item => item !== category));
    } else {
      // Se não está selecionada, adicionar
      onChange([...selected, category]);
    }
  };

  const isAllSelected = selected.length === options.length;
  const isIndeterminate = selected.length > 0 && selected.length < options.length;

  return (
    <div className="category-filter">
      <div className="category-filter-header">
        <label className="category-item category-item-all">
          <input
            type="checkbox"
            checked={isAllSelected}
            ref={(el) => {
              if (el) el.indeterminate = isIndeterminate;
            }}
            onChange={handleToggleAll}
            className="category-checkbox"
          />
          <span className="category-label">Todas</span>
        </label>
      </div>
      
      <div className="category-filter-list">
        {options.map((category) => (
          <label key={category} className="category-item">
            <input
              type="checkbox"
              checked={selected.includes(category)}
              onChange={() => handleToggleCategory(category)}
              className="category-checkbox"
            />
            <span className="category-label">{category}</span>
          </label>
        ))}
      </div>
    </div>
  );
};