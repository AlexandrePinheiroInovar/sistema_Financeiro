import React from 'react';
import { FinancialRecord } from '../types';
import { MultiSelectDropdown } from './MultiSelectDropdown';

interface FiltersProps {
  records: FinancialRecord[];
  onFilterChange: (filteredRecords: FinancialRecord[]) => void;
}

interface FilterState {
  dateFrom: string;
  dateTo: string;
  selectedStatus: string[];
  selectedCategories: string[];
  searchText: string;
}

export const Filters: React.FC<FiltersProps> = ({ records, onFilterChange }) => {
  const [filters, setFilters] = React.useState<FilterState>({
    dateFrom: '',
    dateTo: '',
    selectedStatus: [],
    selectedCategories: [],
    searchText: ''
  });

  const categories = React.useMemo(() => {
    const uniqueCategories = Array.from(new Set(records.map(r => r.categoria).filter(Boolean)));
    return uniqueCategories.sort();
  }, [records]);

  const statusOptions = ['Pago', 'Pendente', 'Atrasado'];

  const applyFilters = React.useCallback((newFilters: FilterState) => {
    let filtered = [...records];

    // Filter by date range
    if (newFilters.dateFrom) {
      filtered = filtered.filter(record => {
        const recordDate = new Date(record.dataEfetiva);
        const fromDate = new Date(newFilters.dateFrom);
        // Check if dates are valid
        if (isNaN(recordDate.getTime()) || isNaN(fromDate.getTime())) {
          return false;
        }
        return recordDate >= fromDate;
      });
    }

    if (newFilters.dateTo) {
      filtered = filtered.filter(record => {
        const recordDate = new Date(record.dataEfetiva);
        const toDate = new Date(newFilters.dateTo);
        // Check if dates are valid
        if (isNaN(recordDate.getTime()) || isNaN(toDate.getTime())) {
          return false;
        }
        toDate.setHours(23, 59, 59, 999); // Include the entire day
        return recordDate <= toDate;
      });
    }

    // Filter by selected status
    if (newFilters.selectedStatus.length > 0) {
      filtered = filtered.filter(record => 
        newFilters.selectedStatus.includes(record.status)
      );
    }

    // Filter by selected categories
    if (newFilters.selectedCategories.length > 0) {
      filtered = filtered.filter(record => 
        newFilters.selectedCategories.includes(record.categoria)
      );
    }

    // Filter by search text (description, contact, razaoSocial)
    if (newFilters.searchText) {
      const searchLower = newFilters.searchText.toLowerCase();
      filtered = filtered.filter(record => 
        (record.descricao || '').toLowerCase().includes(searchLower) ||
        (record.contato || '').toLowerCase().includes(searchLower) ||
        (record.razaoSocial || '').toLowerCase().includes(searchLower)
      );
    }

    onFilterChange(filtered);
  }, [records, onFilterChange]);

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    applyFilters(newFilters);
  };

  const handleCategoryChange = (selectedCategories: string[]) => {
    const newFilters = { ...filters, selectedCategories };
    setFilters(newFilters);
    applyFilters(newFilters);
  };

  const handleStatusChange = (selectedStatus: string[]) => {
    const newFilters = { ...filters, selectedStatus };
    setFilters(newFilters);
    applyFilters(newFilters);
  };

  const clearFilters = () => {
    const emptyFilters: FilterState = {
      dateFrom: '',
      dateTo: '',
      selectedStatus: [],
      selectedCategories: [],
      searchText: ''
    };
    setFilters(emptyFilters);
    applyFilters(emptyFilters);
  };

  return (
    <div className="filters-container">
      <div className="filters-header">
        <h3>Filtros</h3>
        <button onClick={clearFilters} className="clear-filters-btn">
          Limpar Filtros
        </button>
      </div>
      
      <div className="filters-grid">
        <div className="filter-group">
          <label htmlFor="dateFrom">De:</label>
          <input
            id="dateFrom"
            type="date"
            value={filters.dateFrom}
            onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
            className="filter-input"
          />
        </div>

        <div className="filter-group">
          <label htmlFor="dateTo">Até:</label>
          <input
            id="dateTo"
            type="date"
            value={filters.dateTo}
            onChange={(e) => handleFilterChange('dateTo', e.target.value)}
            className="filter-input"
          />
        </div>

        <div className="filter-group">
          <label>Status:</label>
          <MultiSelectDropdown
            label="Status"
            options={statusOptions}
            selected={filters.selectedStatus}
            onChange={handleStatusChange}
          />
        </div>

        <div className="filter-group">
          <label>Categoria:</label>
          <MultiSelectDropdown
            label="Categoria"
            options={categories}
            selected={filters.selectedCategories}
            onChange={handleCategoryChange}
          />
        </div>

        <div className="filter-group filter-group-wide">
          <label htmlFor="searchText">Buscar:</label>
          <input
            id="searchText"
            type="text"
            placeholder="Descrição, Contato ou Razão Social..."
            value={filters.searchText}
            onChange={(e) => handleFilterChange('searchText', e.target.value)}
            className="filter-input"
          />
        </div>
      </div>
    </div>
  );
};