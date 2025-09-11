import React from 'react';
import { FinancialRecord } from '../types';

interface FiltersProps {
  records: FinancialRecord[];
  onFilterChange: (filteredRecords: FinancialRecord[]) => void;
}

interface FilterState {
  dateFrom: string;
  dateTo: string;
  status: string;
  categoria: string;
  searchText: string;
}

export const Filters: React.FC<FiltersProps> = ({ records, onFilterChange }) => {
  const [filters, setFilters] = React.useState<FilterState>({
    dateFrom: '',
    dateTo: '',
    status: '',
    categoria: '',
    searchText: ''
  });

  const categories = React.useMemo(() => {
    const uniqueCategories = [...new Set(records.map(r => r.categoria).filter(Boolean))];
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

    // Filter by status
    if (newFilters.status) {
      filtered = filtered.filter(record => record.status === newFilters.status);
    }

    // Filter by categoria
    if (newFilters.categoria) {
      filtered = filtered.filter(record => record.categoria === newFilters.categoria);
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

  const clearFilters = () => {
    const emptyFilters: FilterState = {
      dateFrom: '',
      dateTo: '',
      status: '',
      categoria: '',
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
          <label htmlFor="status">Status:</label>
          <select
            id="status"
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="filter-select"
          >
            <option value="">Todos</option>
            {statusOptions.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="categoria">Categoria:</label>
          <select
            id="categoria"
            value={filters.categoria}
            onChange={(e) => handleFilterChange('categoria', e.target.value)}
            className="filter-select"
          >
            <option value="">Todas</option>
            {categories.map(categoria => (
              <option key={categoria} value={categoria}>{categoria}</option>
            ))}
          </select>
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