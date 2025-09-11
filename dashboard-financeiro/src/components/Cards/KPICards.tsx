import React, { useMemo } from 'react';
import { KPICard } from './KPICard';
import { FinancialRecord, KPICard as KPICardType } from '../../types';
import { DataService } from '../../services/dataService';

interface KPICardsProps {
  records: FinancialRecord[];
}

export const KPICards: React.FC<KPICardsProps> = ({ records }) => {
  const cards = useMemo<KPICardType[]>(() => {
    console.log('KPICards received records:', records.length);
    
    if (records.length === 0) {
      console.log('No records received, returning empty cards');
      return [];
    }

    // Calculate DRE for all filtered records passed from Dashboard
    const currentDRE = DataService.calculateDRE(records);
    console.log('KPICards DRE calculation:', currentDRE);
    
    // For comparison, get the previous period based on the data we have
    const sortedRecords = [...records].sort((a, b) => 
      new Date(a.dataEfetiva).getTime() - new Date(b.dataEfetiva).getTime()
    );
    
    // Get the median date to split into two periods for comparison
    const medianIndex = Math.floor(sortedRecords.length / 2);
    const firstHalfRecords = sortedRecords.slice(0, medianIndex);
    const secondHalfRecords = sortedRecords.slice(medianIndex);
    
    const previousDRE = DataService.calculateDRE(firstHalfRecords);
    const latestDRE = DataService.calculateDRE(secondHalfRecords);
    
    console.log('Previous period DRE:', previousDRE);
    console.log('Latest period DRE:', latestDRE);
    
    const calculatePercentChange = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / Math.abs(previous)) * 100;
    };

    return [
      {
        title: 'Receita Bruta',
        value: currentDRE.receitaBruta,
        percentage: calculatePercentChange(latestDRE.receitaBruta, previousDRE.receitaBruta),
        color: '#10b981',
        icon: '💰',
        type: 'positive'
      },
      {
        title: 'Custos',
        value: currentDRE.custos,
        percentage: calculatePercentChange(latestDRE.custos, previousDRE.custos),
        color: '#ef4444',
        icon: '📦',
        type: 'negative'
      },
      {
        title: 'Despesas',
        value: currentDRE.despesas,
        percentage: calculatePercentChange(latestDRE.despesas, previousDRE.despesas),
        color: '#f59e0b',
        icon: '💳',
        type: 'negative'
      },
      {
        title: 'Lucro Bruto',
        value: currentDRE.lucroBruto,
        percentage: calculatePercentChange(latestDRE.lucroBruto, previousDRE.lucroBruto),
        color: '#10b981',
        icon: '📈',
        type: 'positive'
      },
      {
        title: 'Lucro Líquido',
        value: currentDRE.lucroLiquido,
        percentage: calculatePercentChange(latestDRE.lucroLiquido, previousDRE.lucroLiquido),
        color: currentDRE.lucroLiquido >= 0 ? '#10b981' : '#ef4444',
        icon: '🎯',
        type: currentDRE.lucroLiquido >= 0 ? 'positive' : 'negative'
      },
      {
        title: 'Margem Líquida',
        value: currentDRE.margemLiquida,
        percentage: calculatePercentChange(latestDRE.margemLiquida, previousDRE.margemLiquida),
        color: '#6366f1',
        icon: '📊',
        type: 'neutral'
      }
    ];
  }, [records]);

  return (
    <div className="cards-grid">
      {cards.map((card, index) => (
        <KPICard key={index} card={card} />
      ))}
    </div>
  );
};