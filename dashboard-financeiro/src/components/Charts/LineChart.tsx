import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartData } from '../../types';
import { DataService } from '../../services/dataService';

interface LineChartProps {
  data: ChartData[];
  title: string;
}

export const CustomLineChart: React.FC<LineChartProps> = ({ data, title }) => {

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="tooltip">
          <p className="tooltip-label">{`Período: ${label}`}</p>
          {payload.map((item: any, index: number) => (
            <p key={index} className="tooltip-value" style={{ color: item.color }}>
              {`${item.dataKey}: ${DataService.formatCurrency(item.value)}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
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
      <ResponsiveContainer width="100%" height={300}>
        <LineChart 
          data={data}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="name" 
            tick={{ 
              fontSize: 12,
              className: 'chart-tick'
            }}
            tickFormatter={(value) => {
              const [year, month] = value.split('-');
              const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 
                                 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
              return `${monthNames[parseInt(month) - 1]}/${year.slice(-2)}`;
            }}
          />
          <YAxis 
            tick={{ 
              fontSize: 12,
              className: 'chart-tick'
            }}
            tickFormatter={(value) => DataService.formatCurrency(value)}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="receita" 
            stroke="#16A34A" 
            strokeWidth={2}
            name="Receita"
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line 
            type="monotone" 
            dataKey="lucro" 
            stroke="#2563EB" 
            strokeWidth={2}
            name="Lucro"
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};