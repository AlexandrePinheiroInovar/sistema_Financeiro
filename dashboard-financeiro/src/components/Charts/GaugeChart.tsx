import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { DataService } from '../../services/dataService';

interface GaugeChartProps {
  value: number;
  title: string;
  maxValue?: number;
}

export const GaugeChart: React.FC<GaugeChartProps> = ({ 
  value, 
  title, 
  maxValue = 100 
}) => {
  const normalizedValue = Math.max(0, Math.min(value, maxValue));
  const percentage = (normalizedValue / maxValue) * 100;
  
  const data = [
    { name: 'Progress', value: percentage },
    { name: 'Remaining', value: 100 - percentage }
  ];

  const getColor = (value: number) => {
    if (value < 0) return '#ef4444';
    if (value < 10) return '#f59e0b';
    if (value < 25) return '#eab308';
    return '#10b981';
  };

  const color = getColor(value);

  return (
    <div className="chart-container">
      <h3 className="chart-title">{title}</h3>
      <div className="gauge-container">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              startAngle={180}
              endAngle={0}
              innerRadius={60}
              outerRadius={80}
              paddingAngle={0}
              dataKey="value"
            >
              <Cell fill={color} />
              <Cell fill="#374151" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        
        <div className="gauge-value">
          <div className="gauge-number" style={{ color }}>
            {DataService.formatPercentage(value)}
          </div>
          <div className="gauge-label">Margem Líquida</div>
        </div>

        <div className="gauge-indicators">
          <div className="gauge-indicator">
            <span className="indicator-color" style={{ backgroundColor: '#ef4444' }}></span>
            <span>Negativo</span>
          </div>
          <div className="gauge-indicator">
            <span className="indicator-color" style={{ backgroundColor: '#f59e0b' }}></span>
            <span>Baixo (0-10%)</span>
          </div>
          <div className="gauge-indicator">
            <span className="indicator-color" style={{ backgroundColor: '#eab308' }}></span>
            <span>Médio (10-25%)</span>
          </div>
          <div className="gauge-indicator">
            <span className="indicator-color" style={{ backgroundColor: '#10b981' }}></span>
            <span>Alto (+25%)</span>
          </div>
        </div>
      </div>
    </div>
  );
};