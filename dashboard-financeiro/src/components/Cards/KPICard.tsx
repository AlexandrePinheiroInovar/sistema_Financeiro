import React from 'react';
import { KPICard as KPICardType } from '../../types';
import { DataService } from '../../services/dataService';

interface KPICardProps {
  card: KPICardType;
}

export const KPICard: React.FC<KPICardProps> = ({ card }) => {
  console.log('KPICard rendering:', card.title, 'value:', card.value, 'percentage:', card.percentage);
  
  const formatValue = (value: number) => {
    if (isNaN(value) || value === undefined || value === null) {
      return 'R$ 0,00';
    }
    
    if (card.title.includes('Margem')) {
      return DataService.formatPercentage(value);
    }
    return DataService.formatCurrency(value);
  };

  const getChangeIcon = () => {
    if (card.percentage > 0) return '↗️';
    if (card.percentage < 0) return '↘️';
    return '➡️';
  };

  const getChangeClass = () => {
    if (card.percentage > 0) return 'positive';
    if (card.percentage < 0) return 'negative';
    return '';
  };

  return (
    <div className={`kpi-card ${card.type}`}>
      <div className="kpi-header">
        <div className="kpi-title">{card.title}</div>
        <div 
          className="kpi-icon"
          style={{ backgroundColor: card.color, color: 'white' }}
        >
          {card.icon}
        </div>
      </div>
      
      <div className="kpi-value" style={{ color: card.color }}>
        {formatValue(card.value)}
      </div>
      
      <div className={`kpi-change ${getChangeClass()}`}>
        <span>{getChangeIcon()}</span>
        <span>{Math.abs(card.percentage).toFixed(1)}%</span>
        <span className="change-label">vs mês anterior</span>
      </div>
    </div>
  );
};