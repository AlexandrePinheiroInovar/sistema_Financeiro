import React, { useMemo } from 'react';
import { FinancialRecord, MonthKey, MonthlyPivotRow } from '../types';
import { DataService } from '../services/dataService';

interface DREPivotProps {
  records: FinancialRecord[];
}

const monthOrder: MonthKey[] = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];

export const DREPivot: React.FC<DREPivotProps> = ({ records }) => {
  const rows = useMemo<MonthlyPivotRow[]>(() => {
    if (!records || records.length === 0) return [];
    return DataService.getMonthlyDRE(records);
  }, [records]);

  if (rows.length === 0) return null;

  const getValueColor = (group: string, value: number) => {
    switch (group) {
      case 'Receita':
        return { color: '#4CAF50', fontWeight: '600' }; // Verde para receitas
      case 'Custo':
        return { color: '#1976d2', fontWeight: '600' }; // Azul para custos
      case 'Despesa':
        return { color: '#FF9800', fontWeight: '600' }; // Laranja para despesas
      case 'LucroBruto':
      case 'LucroLiquido':
        return { 
          color: value >= 0 ? '#4CAF50' : '#F44336',
          fontWeight: '700' 
        }; // Verde positivo, vermelho negativo
      case 'MargemLiquida':
        return { 
          color: value >= 0 ? '#4CAF50' : '#F44336',
          fontWeight: '600'
        }; // Verde positivo, vermelho negativo
      default:
        return { color: value >= 0 ? '#4CAF50' : '#F44336', fontWeight: '600' };
    }
  };

  const formatValue = (value: number, group: string) => {
    if (group === 'MargemLiquida') {
      return DataService.formatPercentage(value);
    }
    return DataService.formatCurrency(value);
  };

  return (
    <div className="table-container dre-clean-table">
      <div className="table-header">
        <h3>DEMONSTRATIVO DE RESULTADO DO EXERCÍCIO (DRE) - MENSAL</h3>
      </div>

      <div className="table-wrapper">
        <table className="table dre-table-clean">
          <thead>
            <tr>
              <th className="dre-category-header">CATEGORIA</th>
              {monthOrder.map((m) => (
                <th key={m} className="dre-month-header">{m.toUpperCase()}</th>
              ))}
              <th className="dre-total-header">TOTAL ANUAL</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx} className="dre-row-clean">
                <td className="dre-category-cell">
                  {row.name}
                </td>
                {monthOrder.map((m) => (
                  <td key={m} className="dre-value-cell">
                    <span style={getValueColor(row.group, row.months[m])}>
                      {formatValue(row.months[m], row.group)}
                    </span>
                  </td>
                ))}
                <td className="dre-total-cell">
                  <span style={getValueColor(row.group, row.total)}>
                    {formatValue(row.total, row.group)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

