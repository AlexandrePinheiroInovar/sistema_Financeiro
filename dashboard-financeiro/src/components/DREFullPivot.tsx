import React, { useMemo } from 'react';
import { FinancialRecord, MonthKey, MonthlyPivotRow } from '../types';
import { DataService } from '../services/dataService';

interface DREFullPivotProps {
  records: FinancialRecord[];
}

const monthOrder: MonthKey[] = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];

export const DREFullPivot: React.FC<DREFullPivotProps> = ({ records }) => {
  const rows = useMemo<MonthlyPivotRow[]>(() => {
    if (!records || records.length === 0) return [];
    return DataService.getMonthlyByCategory(records);
  }, [records]);

  if (rows.length === 0) return null;

  // Sem filtros: exibir sempre os 12 meses

  const getRowStyle = (name: string, group: string) => {
    if (name === 'Despesa' || name === 'Receita') {
      return { fontWeight: 700, background: 'rgba(255,255,255,0.04)' } as React.CSSProperties;
    }
    if (name === 'Total Geral') {
      return { fontWeight: 800, borderTop: '2px solid rgba(255,255,255,0.2)' } as React.CSSProperties;
    }
    return {} as React.CSSProperties;
  };

  const getValueColor = (value: number) => ({
    color: value >= 0 ? '#4CAF50' : '#F44336',
    fontWeight: 600
  });

  const formatValue = (value: number) => DataService.formatCurrency(value);

  return (
    <div className="table-container dre-clean-table" style={{ marginTop: 24 }}>
      <div className="table-header">
        <h3>DESPESAS X RECEITAS — DRE DETALHADO (por Categoria)</h3>
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
              <tr key={idx} className="dre-row-clean" style={getRowStyle(row.name, (row as any).group)}>
                <td className="dre-category-cell">{row.name}</td>
                {monthOrder.map((m) => (
                  <td key={m} className="dre-value-cell">
                    <span style={getValueColor(row.months[m])}>
                      {formatValue(row.months[m])}
                    </span>
                  </td>
                ))}
                <td className="dre-total-cell">
                  <span style={getValueColor(row.total)}>
                    {formatValue(row.total)}
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
