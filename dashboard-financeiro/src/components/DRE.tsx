import React from 'react';
import { FinancialRecord } from '../types';
import { DataService } from '../services/dataService';

interface DREProps {
  records: FinancialRecord[];
}

export const DRE: React.FC<DREProps> = ({ records }) => {
  const dre = DataService.calculateDRE(records);

  const formatCurrency = (value: number) => DataService.formatCurrency(value);
  
  const getValueClass = (value: number) => {
    if (value > 0) return 'positive';
    if (value < 0) return 'negative';
    return '';
  };

  return (
    <div className="dre-container">
      <h2 className="dre-title">Demonstrativo de Resultados (DRE)</h2>
      
      <div className="dre-content">
        <div className="dre-item">
          <span className="dre-label">Receita Bruta</span>
          <span className={`dre-value ${getValueClass(dre.receitaBruta)}`}>
            {formatCurrency(dre.receitaBruta)}
          </span>
        </div>

        <div className="dre-item">
          <span className="dre-label">(-) Despesas Operacionais (2.1.x)</span>
          <span className={`dre-value ${getValueClass(-dre.custos)}`}>
            ({formatCurrency(dre.custos)})
          </span>
        </div>

        <div className="dre-item">
          <span className="dre-label">(=) Lucro Bruto</span>
          <span className={`dre-value ${getValueClass(dre.lucroBruto)}`}>
            {formatCurrency(dre.lucroBruto)}
          </span>
        </div>

        <div className="dre-item">
          <span className="dre-label">(-) Despesas Administrativas (2.2.x + 2.3.x)</span>
          <span className={`dre-value ${getValueClass(-dre.despesas)}`}>
            ({formatCurrency(dre.despesas)})
          </span>
        </div>

        <div className="dre-item">
          <span className="dre-label">(=) Lucro Líquido</span>
          <span className={`dre-value ${getValueClass(dre.lucroLiquido)}`}>
            {formatCurrency(dre.lucroLiquido)}
          </span>
        </div>

        <div className="dre-item">
          <span className="dre-label">Margem Líquida</span>
          <span className={`dre-value ${getValueClass(dre.margemLiquida)}`}>
            {DataService.formatPercentage(dre.margemLiquida)}
          </span>
        </div>
      </div>

        <div className="dre-summary">
          <div className="summary-item">
            <span>Total de Entradas:</span>
            <span className="positive">{formatCurrency(dre.receitaBruta)}</span>
          </div>
          <div className="summary-item">
            <span>Total de Saídas:</span>
            <span className="negative">{formatCurrency(dre.saidasTotais ?? (dre.custos + dre.despesas))}</span>
          </div>
        <div className="summary-item final-result">
          <span>Resultado Final:</span>
          <span className={getValueClass(dre.lucroLiquido)}>
            {formatCurrency(dre.lucroLiquido)}
          </span>
        </div>
      </div>
    </div>
  );
};
