import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { ChartData } from '../../types';
import { DataService } from '../../services/dataService';

interface BarChartProps {
  data: ChartData[];
  title: string;
}

export const CustomBarChart: React.FC<BarChartProps> = ({ data, title }) => {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="tooltip">
          <p className="tooltip-label">{`${label}`}</p>
          <p className="tooltip-value" style={{ color: payload[0].color }}>
            {DataService.formatCurrency(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  // Função para renderizar labels personalizados
  const renderCustomLabel = (props: any) => {
    const { x, y, width, value } = props;
    return (
      <text 
        x={x + width / 2} 
        y={y - 5} 
        fill="#ffffff" 
        textAnchor="middle" 
        fontSize="12" 
        fontWeight="bold"
        stroke="#000000"
        strokeWidth="0.5"
      >
        {DataService.formatCurrency(value)}
      </text>
    );
  };

  if (!data || data.length === 0) {
    return (
      <div className="chart-container">
        <h3 className="chart-title">{title}</h3>
        <div className="no-data">
          <p>Nenhum dado disponível</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chart-container">
      <h3 className="chart-title">{title}</h3>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={data} margin={{ top: 40, right: 30, left: 20, bottom: 5 }}>
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis 
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => DataService.formatCurrency(value)}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar 
            dataKey="value" 
            radius={[4, 4, 0, 0]}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color || '#3b82f6'} />
            ))}
            <LabelList content={renderCustomLabel} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};