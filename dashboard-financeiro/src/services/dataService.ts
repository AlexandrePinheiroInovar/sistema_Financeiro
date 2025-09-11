import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { FinancialRecord, DREData, ChartData, MonthKey, MonthlyPivotRow } from '../types';

export class DataService {
  static async parseFile(file: File): Promise<FinancialRecord[]> {
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    if (fileExtension === 'csv') {
      return this.parseCSV(file);
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      return this.parseExcel(file);
    } else {
      throw new Error('Formato de arquivo não suportado. Use CSV ou XLSX.');
    }
  }

  private static parseCSV(file: File): Promise<FinancialRecord[]> {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          try {
            const records = this.mapToFinancialRecords(results.data);
            resolve(records);
          } catch (error) {
            reject(error);
          }
        },
        error: (error) => {
          reject(new Error(`Erro ao processar CSV: ${error.message}`));
        }
      });
    });
  }

  private static parseExcel(file: File): Promise<FinancialRecord[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          // Try sheet_to_json with header: 1 first, then try with defval
          let jsonData;
          try {
            jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
          } catch (err) {
            jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
          }
          
          console.log('Excel parsed data:', jsonData);
          
          if (jsonData.length < 2) {
            throw new Error('Planilha deve conter pelo menos uma linha de cabeçalho e uma linha de dados.');
          }

          // Check if it's already in object format or array format
          let objectData;
          if (Array.isArray(jsonData[0])) {
            // Array format - convert to objects
            const headers = jsonData[0] as string[];
            const rows = jsonData.slice(1) as any[][];
            
            objectData = rows
              .filter(row => row && row.length > 0 && row.some(cell => cell !== '' && cell !== null && cell !== undefined))
              .map(row => {
                const obj: any = {};
                headers.forEach((header, index) => {
                  if (header && header.trim() !== '') {
                    obj[header.trim()] = row[index];
                  }
                });
                return obj;
              });
          } else {
            // Already in object format
            objectData = jsonData.filter((row: any) => row && Object.keys(row).length > 0);
          }

          console.log('Converted object data:', objectData);

          if (objectData.length === 0) {
            throw new Error('Nenhum registro válido encontrado na planilha.');
          }

          const records = this.mapToFinancialRecords(objectData);
          resolve(records);
        } catch (error) {
          console.error('Excel parsing error:', error);
          reject(new Error(`Erro ao processar Excel: ${error.message}`));
        }
      };

      reader.onerror = () => {
        reject(new Error('Erro ao ler o arquivo'));
      };

      reader.readAsArrayBuffer(file);
    });
  }

  private static mapToFinancialRecords(data: any[]): FinancialRecord[] {
    // First, let's analyze the data structure and clean it
    console.log('Raw data received:', data);
    
    // Filter out invalid rows and find the actual data
    const cleanedData = data.filter((row, index) => {
      // Skip rows that don't look like financial records
      if (!row || typeof row !== 'object') return false;
      
      const keys = Object.keys(row);
      console.log(`Row ${index + 1} keys:`, keys);
      
      // Skip rows that look like headers or metadata
      const invalidPatterns = [
        /locagora/i,
        /rótulos/i,
        /labels/i,
        /total/i,
        /soma/i,
        /subtotal/i
      ];
      
      const hasInvalidPattern = keys.some(key => 
        invalidPatterns.some(pattern => pattern.test(key))
      );
      
      if (hasInvalidPattern) {
        console.log(`Skipping row ${index + 1} - appears to be metadata`);
        return false;
      }
      
      // Check if row has the basic required fields (flexible matching)
      const hasTipoField = keys.some(key => 
        key.toLowerCase().includes('tipo') || 
        key.toLowerCase().includes('type') ||
        ['Receita', 'Custo', 'Despesa'].includes(String(row[key]))
      );
      
      const hasValueField = keys.some(key => 
        key.toLowerCase().includes('valor') || 
        key.toLowerCase().includes('value') ||
        !isNaN(parseFloat(String(row[key])))
      );
      
      if (!hasTipoField && !hasValueField) {
        console.log(`Skipping row ${index + 1} - no tipo or value fields found`);
        return false;
      }
      
      return true;
    });
    
    console.log('Cleaned data:', cleanedData);
    
    if (cleanedData.length === 0) {
      throw new Error('Nenhum registro financeiro válido encontrado. Verifique se a planilha contém as colunas: Tipo, Valor efetivo, Status, Data efetiva, Descrição, Categoria.');
    }

    // Filtro inicial: considerar apenas registros com Status = Conciliado
    const conciliadoData = cleanedData.filter(row => {
      const statusField = String(row['Status'] || row['status'] || '').trim();
      return statusField === 'Conciliado';
    });
    
    console.log(`Filtered to ${conciliadoData.length} 'Conciliado' records from ${cleanedData.length} total`);
    
    return conciliadoData.map((row, index) => {
      try {
        console.log(`Processing cleaned row ${index + 1}:`, row);
        
        // Get the field value with multiple possible keys
        const getTipoField = () => {
          const possibleKeys = ['Tipo', 'tipo', 'TIPO', 'Type', 'type'];
          
          // First try direct key matching
          for (const key of possibleKeys) {
            if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
              return row[key];
            }
          }
          
          // Try to find any key that contains 'tipo'
          const keys = Object.keys(row);
          const tipoKey = keys.find(k => k.toLowerCase().includes('tipo'));
          if (tipoKey && row[tipoKey]) {
            return row[tipoKey];
          }
          
          // Check if any column name or value contains tipo keywords
          for (const key of keys) {
            const value = String(row[key]).toLowerCase();
            if (value.includes('receita') || value.includes('custo') || value.includes('despesa')) {
              return row[key];
            }
          }
          
          // Check if any key name itself contains tipo keywords
          for (const key of keys) {
            const keyLower = key.toLowerCase();
            if (keyLower.includes('receita')) return 'Receita';
            if (keyLower.includes('custo')) return 'Custo';
            if (keyLower.includes('despesa')) return 'Despesa';
          }
          
          return undefined;
        };

        const getStatusField = () => {
          const possibleKeys = ['Status', 'status', 'STATUS'];
          for (const key of possibleKeys) {
            if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
              return row[key];
            }
          }
          const keys = Object.keys(row);
          const statusKey = keys.find(k => k.toLowerCase().includes('status'));
          return statusKey ? row[statusKey] : 'Pendente';
        };

        const getDataEfetivaField = () => {
          const possibleKeys = ['Data efetiva', 'data efetiva', 'dataEfetiva', 'Data Efetiva', 'DATA EFETIVA'];
          for (const key of possibleKeys) {
            if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
              return row[key];
            }
          }
          const keys = Object.keys(row);
          const dataKey = keys.find(k => k.toLowerCase().includes('data') && k.toLowerCase().includes('efet'));
          return dataKey ? row[dataKey] : new Date().toISOString();
        };

        const getValorEfetivoField = () => {
          const possibleKeys = ['Valor efetivo', 'valor efetivo', 'valorEfetivo', 'Valor Efetivo', 'VALOR EFETIVO'];
          for (const key of possibleKeys) {
            if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
              return row[key];
            }
          }
          const keys = Object.keys(row);
          const valorKey = keys.find(k => k.toLowerCase().includes('valor') && k.toLowerCase().includes('efet'));
          return valorKey ? row[valorKey] : 0;
        };

        const record: FinancialRecord = {
          tipo: this.validateTipo(getTipoField()),
          status: this.validateStatus(getStatusField()),
          dataEfetiva: this.parseDate(getDataEfetivaField()),
          valorEfetivo: this.parseValue(getValorEfetivoField()),
          descricao: String(row['Descrição'] || row['descricao'] || row['Descricao'] || row['Description'] || row['description'] || ''),
          categoria: String(row['Categoria'] || row['categoria'] || row['Category'] || row['category'] || ''),
          conta: String(row['Conta'] || row['conta'] || row['Account'] || row['account'] || ''),
          contato: String(row['Contato'] || row['contato'] || row['Contact'] || row['contact'] || ''),
          cpfCnpj: String(row['CPF/CNPJ'] || row['cpfCnpj'] || row['cpf_cnpj'] || row['CPF CNPJ'] || ''),
          razaoSocial: String(row['Razão social'] || row['razaoSocial'] || row['razao_social'] || row['Razao Social'] || ''),
          forma: String(row['Forma'] || row['forma'] || row['Form'] || row['form'] || ''),
          observacoes: String(row['Observações'] || row['observacoes'] || row['Observacoes'] || row['Notes'] || row['notes'] || ''),
          dataCriacao: this.parseDate(row['Data de criação'] || row['dataCriacao'] || row['data_criacao'] || row['Data Criacao'] || new Date().toISOString())
        };

        return record;
      } catch (error) {
        console.error(`Error processing row ${index + 1}:`, error, 'Row data:', row);
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Erro na linha ${index + 1}: ${errorMessage}`);
      }
    }); // Removendo filtro que excluía registros com valor 0
  }

  private static validateTipo(tipo: string): 'Receita' | 'Custo' | 'Despesa' {
    if (!tipo || tipo === undefined || tipo === null) {
      throw new Error(`Tipo não informado. Use: Receita ou Despesa`);
    }
    
    const normalizedTipo = String(tipo).trim().toLowerCase();
    
    if (normalizedTipo === '' || normalizedTipo === 'undefined' || normalizedTipo === 'null') {
      throw new Error(`Tipo vazio ou inválido: "${tipo}". Use: Receita ou Despesa`);
    }
    
    if (normalizedTipo.includes('receita')) return 'Receita';
    if (normalizedTipo.includes('despesa')) return 'Despesa';
    
    // Manter compatibilidade com "Custo" caso apareça (mapeando para Despesa)
    if (normalizedTipo.includes('custo')) return 'Despesa';
    
    throw new Error(`Tipo inválido: "${tipo}". Use: Receita ou Despesa`);
  }

  private static validateStatus(status: string): 'Pago' | 'Pendente' | 'Atrasado' {
    const normalizedStatus = String(status).trim().toLowerCase();
    
    if (normalizedStatus.includes('pago')) return 'Pago';
    if (normalizedStatus.includes('pendente')) return 'Pendente';
    if (normalizedStatus.includes('atrasado')) return 'Atrasado';
    
    return 'Pendente';
  }

  private static parseDate(dateValue: any): string {
    if (!dateValue) return new Date().toISOString();
    
    if (dateValue instanceof Date) {
      return dateValue.toISOString();
    }
    
    // Handle Excel numeric dates (days since 1900-01-01)
    if (typeof dateValue === 'number' && dateValue > 1000) {
      // Excel date calculation: days since 1900-01-01 (with leap year bug)
      const excelEpoch = new Date(1900, 0, 1);
      const date = new Date(excelEpoch.getTime() + (dateValue - 2) * 24 * 60 * 60 * 1000);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    }
    
    const dateStr = String(dateValue).trim();
    
    const formats = [
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
      /(\d{4})-(\d{1,2})-(\d{1,2})/,
      /(\d{1,2})-(\d{1,2})-(\d{4})/
    ];
    
    for (const format of formats) {
      const match = dateStr.match(format);
      if (match) {
        let year, month, day;
        
        if (format.source.startsWith('(\\d{4})')) {
          [, year, month, day] = match;
        } else {
          [, day, month, year] = match;
        }
        
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        if (!isNaN(date.getTime())) {
          return date.toISOString();
        }
      }
    }
    
    const date = new Date(dateValue);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
    
    return new Date().toISOString();
  }

  private static parseValue(value: any): number {
    if (typeof value === 'number') {
      return value;
    }
    
    const valueStr = String(value).trim()
      .replace(/[R$\s]/g, '')
      .replace(/\./g, '')
      .replace(',', '.');
    
    const numValue = parseFloat(valueStr);
    
    if (isNaN(numValue)) {
      return 0;
    }
    
    return numValue;
  }

  static calculateDRE(records: FinancialRecord[]): DREData {
    console.log('=== DRE LOCAGORA - CÁLCULO DRE ===');
    console.log('Total de registros para cálculo:', records.length);
    
    // Filtro: Ignorar registros vazios ou nulos em Valor efetivo
    const validRecords = records.filter(r => r.valorEfetivo && !isNaN(r.valorEfetivo) && r.valorEfetivo !== 0);
    
    // RECEITA BRUTA = soma de todas as categorias iniciadas por 1.x
    const receitaBruta = validRecords
      .filter(r => (r.categoria || '').startsWith('1.'))
      .reduce((sum, r) => sum + Math.abs(r.valorEfetivo), 0); // Receita → sempre positivo
    
    // CUSTOS = soma das categorias 2.1.x
    const custos = validRecords
      .filter(r => (r.categoria || '').startsWith('2.1.'))
      .reduce((sum, r) => sum + Math.abs(r.valorEfetivo), 0);
    
    // LUCRO BRUTO = Receita Bruta – Custos
    const lucroBruto = receitaBruta - custos;
    
    // DESPESAS ADMINISTRATIVAS = soma das categorias 2.2.x + 2.3.x
    const despesas = validRecords
      .filter(r => (r.categoria || '').startsWith('2.2.') || (r.categoria || '').startsWith('2.3.'))
      .reduce((sum, r) => sum + Math.abs(r.valorEfetivo), 0); // Despesa → sempre negativo (mas usamos valor absoluto aqui)
    
    // LUCRO LÍQUIDO = Lucro Bruto – Despesas Administrativas  
    const lucroLiquido = lucroBruto - despesas;
    
    // MARGEM LÍQUIDA (%) = (Lucro Líquido ÷ Receita Bruta) × 100
    const margemLiquida = receitaBruta > 0 ? (lucroLiquido / receitaBruta) * 100 : 0;
    
    console.log(`\n💰 CÁLCULOS DRE:`);
    console.log(`🟢 Receita Bruta (1.x): ${this.formatCurrency(receitaBruta)}`);
    console.log(`🟡 Custos (2.1.x): ${this.formatCurrency(custos)}`);
    console.log(`🔵 Lucro Bruto: ${this.formatCurrency(lucroBruto)}`);
    console.log(`🔴 Despesas Adm (2.2.x + 2.3.x): ${this.formatCurrency(despesas)}`);
    console.log(`🎯 Lucro Líquido: ${this.formatCurrency(lucroLiquido)}`);
    console.log(`📊 Margem Líquida: ${margemLiquida.toFixed(2)}%`);
    
    return {
      receitaBruta,
      custos,
      despesas,
      lucroBruto,
      lucroLiquido,
      margemLiquida
    };
  }

  static getCategoryData(records: FinancialRecord[]): ChartData[] {
    const validRecords = records.filter(r => r.valorEfetivo && !isNaN(r.valorEfetivo) && r.valorEfetivo !== 0);
    
    // Distribuição por tipo baseado na estrutura de categorias DRE
    const custos = validRecords
      .filter(r => (r.categoria || '').startsWith('2.1.'))
      .reduce((sum, r) => sum + Math.abs(r.valorEfetivo), 0);
      
    const despesas = validRecords
      .filter(r => (r.categoria || '').startsWith('2.2.') || (r.categoria || '').startsWith('2.3.'))
      .reduce((sum, r) => sum + Math.abs(r.valorEfetivo), 0);

    return [
      { name: 'Custos (2.1.x)', value: custos, color: '#ef4444' },
      { name: 'Despesas (2.2.x + 2.3.x)', value: despesas, color: '#f59e0b' }
    ];
  }

  static getEvolutionData(records: FinancialRecord[]): ChartData[] {
    const validRecords = records.filter(r => r.valorEfetivo && !isNaN(r.valorEfetivo) && r.valorEfetivo !== 0);
    const monthlyData: { [key: string]: { receita: number; custos: number; despesas: number } } = {};
    
    validRecords.forEach(record => {
      const date = new Date(record.dataEfetiva);
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return;
      }
      
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { receita: 0, custos: 0, despesas: 0 };
      }
      
      // Usar estrutura de categorias DRE
      if ((record.categoria || '').startsWith('1.')) {
        // Receita → sempre positivo
        monthlyData[monthKey].receita += Math.abs(record.valorEfetivo);
      } else if ((record.categoria || '').startsWith('2.1.')) {
        // Custos
        monthlyData[monthKey].custos += Math.abs(record.valorEfetivo);
      } else if ((record.categoria || '').startsWith('2.2.') || (record.categoria || '').startsWith('2.3.')) {
        // Despesas Administrativas
        monthlyData[monthKey].despesas += Math.abs(record.valorEfetivo);
      }
    });

    return Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => {
        const lucro = data.receita - data.custos - data.despesas;
        
        return {
          name: month,
          receita: data.receita,
          lucro: lucro
        };
      });
  }

  static getComparisonData(records: FinancialRecord[]): ChartData[] {
    const validRecords = records.filter(r => r.valorEfetivo && !isNaN(r.valorEfetivo) && r.valorEfetivo !== 0);
    
    // Usar estrutura de categorias DRE
    const receita = validRecords
      .filter(r => (r.categoria || '').startsWith('1.'))
      .reduce((sum, r) => sum + Math.abs(r.valorEfetivo), 0);
    
    const custos = validRecords
      .filter(r => (r.categoria || '').startsWith('2.1.'))
      .reduce((sum, r) => sum + Math.abs(r.valorEfetivo), 0);
    
    const despesas = validRecords
      .filter(r => (r.categoria || '').startsWith('2.2.') || (r.categoria || '').startsWith('2.3.'))
      .reduce((sum, r) => sum + Math.abs(r.valorEfetivo), 0);

    return [
      { name: 'Receita Bruta', value: receita, color: '#4CAF50' },
      { name: 'Custos', value: custos, color: '#2196F3' },
      { name: 'Despesas', value: despesas, color: '#F44336' }
    ];
  }

  static filterByPeriod(records: FinancialRecord[], period: string, type: 'monthly' | 'quarterly' | 'annual'): FinancialRecord[] {
    if (!period || period === 'all') return records;

    return records.filter(record => {
      const date = new Date(record.dataEfetiva);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return false;
      }
      
      switch (type) {
        case 'monthly':
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          return monthKey === period;
          
        case 'quarterly':
          const quarter = Math.ceil((date.getMonth() + 1) / 3);
          const quarterKey = `${date.getFullYear()}-Q${quarter}`;
          return quarterKey === period;
          
        case 'annual':
          return date.getFullYear().toString() === period;
          
        default:
          return true;
      }
    });
  }

  static formatCurrency(value: number): string {
    if (isNaN(value) || value === undefined || value === null) {
      return 'R$ 0,00';
    }
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }

  static formatPercentage(value: number): string {
    if (isNaN(value) || value === undefined || value === null) {
      return '0,0%';
    }
    return new Intl.NumberFormat('pt-BR', {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }).format(value / 100);
  }

  // === DRE Dinâmico Mensal (estilo planilha) ===
  private static monthKeys: MonthKey[] = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];

  private static initMonths(): Record<MonthKey, number> {
    return {
      jan: 0, fev: 0, mar: 0, abr: 0, mai: 0, jun: 0,
      jul: 0, ago: 0, set: 0, out: 0, nov: 0, dez: 0
    };
  }

  private static toMonthKey(dateStr: string): MonthKey {
    const d = new Date(dateStr);
    const idx = isNaN(d.getTime()) ? 0 : d.getMonth(); // fallback jan
    return this.monthKeys[idx] as MonthKey;
  }

  static getMonthlyDRE(records: FinancialRecord[]): MonthlyPivotRow[] {
    const validRecords = records.filter(r => r.valorEfetivo && !isNaN(r.valorEfetivo) && r.valorEfetivo !== 0);
    
    // Initialize monthly data structure
    const monthlyData: { [key in MonthKey]: {
      receitaBruta: number;
      custos: number;
      despesas: number;
    }} = {} as any;
    
    this.monthKeys.forEach(month => {
      monthlyData[month] = { receitaBruta: 0, custos: 0, despesas: 0 };
    });

    // Process records by category
    for (const r of validRecords) {
      const categoria = r.categoria || '';
      const month = this.toMonthKey(r.dataEfetiva);
      const value = Math.abs(r.valorEfetivo);

      if (categoria.startsWith('1.')) {
        // Receita Bruta
        monthlyData[month].receitaBruta += value;
      } else if (categoria.startsWith('2.1.')) {
        // Custos
        monthlyData[month].custos += value;
      } else if (categoria.startsWith('2.2.') || categoria.startsWith('2.3.')) {
        // Despesas Administrativas
        monthlyData[month].despesas += value;
      }
    }

    // Create DRE structure rows
    const receitaBrutaRow: MonthlyPivotRow = { name: 'Receita Bruta', group: 'Receita', months: this.initMonths(), total: 0 };
    const custosRow: MonthlyPivotRow = { name: '(-) Custos das Vendas (Categorias 2.1.x)', group: 'Custo', months: this.initMonths(), total: 0 };
    const lucroBrutoRow: MonthlyPivotRow = { name: '(=) Lucro Bruto', group: 'LucroBruto', months: this.initMonths(), total: 0 };
    const despesasRow: MonthlyPivotRow = { name: '(-) Despesas Administrativas (Categorias 2.2.x + 2.3.x)', group: 'Despesa', months: this.initMonths(), total: 0 };
    const lucroLiquidoRow: MonthlyPivotRow = { name: '(=) Lucro Líquido', group: 'LucroLiquido', months: this.initMonths(), total: 0 };
    const margemLiquidaRow: MonthlyPivotRow = { name: 'Margem Líquida (%)', group: 'MargemLiquida', months: this.initMonths(), total: 0 };

    // Calculate values for each month
    for (const month of this.monthKeys) {
      const data = monthlyData[month];
      
      // Receita Bruta (positive)
      receitaBrutaRow.months[month] = data.receitaBruta;
      receitaBrutaRow.total += data.receitaBruta;
      
      // Custos (negative for display)
      custosRow.months[month] = -data.custos;
      custosRow.total += -data.custos;
      
      // Lucro Bruto = Receita - Custos
      const lucroBruto = data.receitaBruta - data.custos;
      lucroBrutoRow.months[month] = lucroBruto;
      lucroBrutoRow.total += lucroBruto;
      
      // Despesas (negative for display)
      despesasRow.months[month] = -data.despesas;
      despesasRow.total += -data.despesas;
      
      // Lucro Líquido = Lucro Bruto - Despesas
      const lucroLiquido = lucroBruto - data.despesas;
      lucroLiquidoRow.months[month] = lucroLiquido;
      lucroLiquidoRow.total += lucroLiquido;
      
      // Margem Líquida (%) = (Lucro Líquido / Receita Bruta) * 100
      const margemLiquida = data.receitaBruta > 0 ? (lucroLiquido / data.receitaBruta) * 100 : 0;
      margemLiquidaRow.months[month] = margemLiquida;
    }
    
    // Calculate total margin
    margemLiquidaRow.total = receitaBrutaRow.total > 0 ? (lucroLiquidoRow.total / receitaBrutaRow.total) * 100 : 0;

    return [
      receitaBrutaRow,
      custosRow,
      lucroBrutoRow,
      despesasRow,
      lucroLiquidoRow,
      margemLiquidaRow
    ];
  }
}
