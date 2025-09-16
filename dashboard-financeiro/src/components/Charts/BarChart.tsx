import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { ChartData } from '../../types';
import { DataService } from '../../services/dataService';

interface BarChartProps {
  data: ChartData[];
  title: string;
  layout?: 'vertical' | 'horizontal';
}

export const CustomBarChart: React.FC<BarChartProps> = ({ data, title, layout = 'horizontal' }) => {

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

  // Função para renderizar labels personalizados usando classes CSS
  const renderCustomLabel = (props: any) => {
    const { x, y, width, height, value } = props;
    
    if (layout === 'vertical') {
      return (
        <text 
          x={x + width + 8} 
          y={y + height / 2} 
          className="chart-label"
          textAnchor="start" 
          fontSize="11" 
          fontWeight="600"
          dominantBaseline="middle"
        >
          {DataService.formatCurrency(value)}
        </text>
      );
    } else {
      return (
        <text 
          x={x + width / 2} 
          y={y - 5} 
          className="chart-label"
          textAnchor="middle" 
          fontSize="12" 
          fontWeight="bold"
        >
          {DataService.formatCurrency(value)}
        </text>
      );
    }
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
      <ResponsiveContainer width="100%" height={layout === 'vertical' ? 450 : 380}>
        <BarChart 
          data={data} 
          layout={layout}
          margin={layout === 'vertical' 
            ? { top: 10, right: 100, left: 100, bottom: 10 } 
            : { top: 40, right: 40, left: 90, bottom: 30 }
          }
          barCategoryGap={layout === 'vertical' ? '15%' : '30%'}
          barSize={layout === 'vertical' ? 30 : undefined}
        >
          {layout === 'vertical' ? (
            <>
              <XAxis 
                type="number"
                tick={{ 
                  fontSize: 12,
                  className: 'chart-tick'
                }}
                tickFormatter={(value) => DataService.formatCurrency(value)}
              />
              <YAxis 
                type="category"
                dataKey="name" 
                tick={{ 
                  fontSize: 11,
                  className: 'chart-tick'
                }}
                width={90}
                interval={0}
              />
            </>
          ) : (
            <>
              <XAxis 
                dataKey="name" 
                tick={{ 
                  fontSize: 12,
                  className: 'chart-tick'
                }} 
              />
              <YAxis 
                tick={{ 
                  fontSize: 12,
                  className: 'chart-tick'
                }}
                tickFormatter={(value) => DataService.formatCurrency(value)}
                width={80}
              />
            </>
          )}
          <Tooltip content={<CustomTooltip />} />
          <Bar 
            dataKey="value" 
            radius={layout === 'vertical' ? [0, 4, 4, 0] : [4, 4, 0, 0]}
            fill={layout === 'vertical' ? '#16A34A' : undefined}
          >
            {layout !== 'vertical' && data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color || '#3b82f6'} />
            ))}
            <LabelList content={renderCustomLabel} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};