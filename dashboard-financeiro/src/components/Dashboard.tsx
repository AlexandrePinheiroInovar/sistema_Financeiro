import React, { useState, useMemo, useEffect } from 'react';
import { FileUpload } from './FileUpload';
import { KPICards } from './Cards/KPICards';
import { DRE } from './DRE';
import { DREPivot } from './DREPivot';
import { CustomPieChart } from './Charts/PieChart';
import { CustomLineChart } from './Charts/LineChart';
import { CustomBarChart } from './Charts/BarChart';
import { GaugeChart } from './Charts/GaugeChart';
import { DataTable } from './Table/DataTable';
import { Filters } from './Filters';
import { useAuth } from '../contexts/AuthContext';
import { FinancialRecord, PeriodFilter } from '../types';
import { DataService } from '../services/dataService';

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<FinancialRecord[]>([]);
  const [darkMode, setDarkMode] = useState(true);
  const [disableDevAutoload, setDisableDevAutoload] = useState(false);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>({ 
    type: 'monthly', 
    period: 'all' 
  });

  // Apply period filter to the already filtered records
  const finalFilteredRecords = useMemo(() => {
    // Debug: let's temporarily return just filteredRecords to test
    if (periodFilter.period === 'all') {
      return filteredRecords;
    }
    return DataService.filterByPeriod(filteredRecords, periodFilter.period, periodFilter.type);
  }, [filteredRecords, periodFilter]);

  const chartData = useMemo(() => {
    return {
      categoryData: DataService.getCategoryData(finalFilteredRecords),
      evolutionData: DataService.getEvolutionData(filteredRecords),
      comparisonData: DataService.getComparisonData(finalFilteredRecords),
      marginData: DataService.calculateDRE(finalFilteredRecords).margemLiquida
    };
  }, [finalFilteredRecords, filteredRecords]);

  const availablePeriods = useMemo(() => {
    const periods = new Set<string>();
    
    records.forEach(record => {
      const date = new Date(record.dataEfetiva);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return;
      }
      
      switch (periodFilter.type) {
        case 'monthly':
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          periods.add(monthKey);
          break;
        case 'quarterly':
          const quarter = Math.ceil((date.getMonth() + 1) / 3);
          const quarterKey = `${date.getFullYear()}-Q${quarter}`;
          periods.add(quarterKey);
          break;
        case 'annual':
          periods.add(date.getFullYear().toString());
          break;
      }
    });
    
    return Array.from(periods).sort();
  }, [records, periodFilter.type]);

  const handleDataLoaded = (data: FinancialRecord[]) => {
    setRecords(data);
    setFilteredRecords(data);
    setPeriodFilter({ type: 'monthly', period: 'all' });
  };

  // DEV: auto-carrega um CSV de exemplo para visualização imediata
  useEffect(() => {
    const autoLoadSample = async () => {
      try {
        const res = await fetch('/sample-data.csv');
        if (!res.ok) return; // sem arquivo de exemplo
        const blob = await res.blob();
        const file = new File([blob], 'sample-data.csv', { type: 'text/csv' });
        const data = await DataService.parseFile(file);
        setRecords(data);
        setFilteredRecords(data);
        setPeriodFilter({ type: 'monthly', period: 'all' });
      } catch (e) {
        console.error('Falha ao auto-carregar sample-data.csv:', e);
      }
    };

    if ((import.meta as any).env?.DEV && records.length === 0 && !disableDevAutoload) {
      autoLoadSample();
    }
  }, [records.length, disableDevAutoload]);

  const handleFilterChange = (filtered: FinancialRecord[]) => {
    setFilteredRecords(filtered);
  };

  const toggleTheme = () => {
    setDarkMode(!darkMode);
  };

  const formatPeriodLabel = (period: string, type: string) => {
    if (period === 'all') return 'Todos os períodos';
    
    switch (type) {
      case 'monthly':
        const [year, month] = period.split('-');
        const monthNames = [
          'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
          'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];
        return `${monthNames[parseInt(month) - 1]} ${year}`;
      case 'quarterly':
        return period.replace('Q', 'º Trimestre ').replace('-', ' ');
      case 'annual':
        return period;
      default:
        return period;
    }
  };

  const getUserInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <div className={darkMode ? '' : 'light'}>
      <div className="container">
        <header className="header">
          <h1><span className="dre-loc-text">DRE LOC</span><span className="agora-text">AGORA</span></h1>
          <div className="header-controls">
            {records.length > 0 && (
              <div className="filters">
                <select
                  value={periodFilter.type}
                  onChange={(e) => setPeriodFilter({ 
                    type: e.target.value as 'monthly' | 'quarterly' | 'annual',
                    period: 'all'
                  })}
                  className="filter-select"
                >
                  <option value="monthly">Mensal</option>
                  <option value="quarterly">Trimestral</option>
                  <option value="annual">Anual</option>
                </select>
                
                <select
                  value={periodFilter.period}
                  onChange={(e) => setPeriodFilter(prev => ({ 
                    ...prev, 
                    period: e.target.value 
                  }))}
                  className="filter-select"
                >
                  <option value="all">Todos os períodos</option>
                  {availablePeriods.map(period => (
                    <option key={period} value={period}>
                      {formatPeriodLabel(period, periodFilter.type)}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            <div className="user-menu">
              <div className="user-info">
                <div className="user-avatar">
                  {getUserInitials(user?.name || 'U')}
                </div>
                <span>{user?.name}</span>
              </div>
              <button onClick={logout} className="logout-button">
                Sair
              </button>
            </div>
            
            <button onClick={toggleTheme} className="theme-toggle">
              {darkMode ? '☀️' : '🌙'}
            </button>
          </div>
        </header>

        {records.length === 0 ? (
          <FileUpload onDataLoaded={handleDataLoaded} />
        ) : (
          <>
            <div className="dashboard-summary">
              <p>
                Exibindo <strong>{finalFilteredRecords.length}</strong> registros de{' '}
                <strong>{records.length}</strong> total
                {periodFilter.period !== 'all' && (
                  <span> • {formatPeriodLabel(periodFilter.period, periodFilter.type)}</span>
                )}
              </p>
              <button
                onClick={() => {
                  // Apaga todos os dados atuais e impede o autoload em dev
                  setRecords([]);
                  setFilteredRecords([]);
                  setPeriodFilter({ type: 'monthly', period: 'all' });
                  setDisableDevAutoload(true);
                }}
                className="upload-button"
                style={{ marginLeft: 'auto' }}
                title="Limpa os dados carregados para subir uma nova planilha"
              >
                Apagar Tudo
              </button>
            </div>

            <Filters records={records} onFilterChange={handleFilterChange} />

            <KPICards records={filteredRecords} />
            
            <DRE records={finalFilteredRecords} />

            <div className="charts-section">
              <CustomPieChart 
                data={chartData.categoryData}
                title="Distribuição por Categoria"
              />
              <GaugeChart 
                value={chartData.marginData}
                title="Margem Líquida"
              />
            </div>

            <div className="charts-section">
              <CustomLineChart 
                data={chartData.evolutionData}
                title="Evolução Mensal"
              />
              <CustomBarChart 
                data={chartData.comparisonData}
                title="Comparativo Geral"
              />
            </div>

            <DataTable records={finalFilteredRecords} />

            <DREPivot records={finalFilteredRecords} />
          </>
        )}
      </div>
    </div>
  );
};
