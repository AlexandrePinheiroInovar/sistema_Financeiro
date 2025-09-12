export interface FinancialRecord {
  tipo: 'Receita' | 'Custo' | 'Despesa';
  status: 'Pago' | 'Pendente' | 'Atrasado';
  dataEfetiva: string;
  valorEfetivo: number;
  descricao: string;
  categoria: string;
  conta: string;
  contato: string;
  cpfCnpj: string;
  razaoSocial: string;
  forma: string;
  observacoes: string;
  dataCriacao: string;
}

export interface KPICard {
  title: string;
  value: number;
  percentage: number;
  color: string;
  icon: string;
  type: 'positive' | 'negative' | 'neutral';
}

export interface DREData {
  receitaBruta: number;
  custos: number;
  despesas: number;
  lucroBruto: number;
  lucroLiquido: number;
  margemLiquida: number;
  saidasTotais?: number;
}

export interface ChartData {
  name: string;
  value?: number;
  receita?: number;
  lucro?: number;
  color?: string;
}

export interface PeriodFilter {
  type: 'monthly' | 'quarterly' | 'annual';
  period: string;
}

// Abreviações de meses em pt-BR para a dinâmica
export type MonthKey =
  | 'jan' | 'fev' | 'mar' | 'abr' | 'mai' | 'jun'
  | 'jul' | 'ago' | 'set' | 'out' | 'nov' | 'dez';

export interface MonthlyPivotRow {
  name: string; // Ex.: "2.1.1.12 Multa Veículo" ou "Receita"/"Despesa"
  group: 'Despesa' | 'Receita' | 'Total' | 'Custo' | 'LucroBruto' | 'LucroLiquido' | 'MargemLiquida';
  months: Record<MonthKey, number>;
  total: number; // Soma dos 12 meses
}
