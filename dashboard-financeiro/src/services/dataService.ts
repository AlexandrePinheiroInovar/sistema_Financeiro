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
          const allSheets = workbook.SheetNames || [];
          console.log('📋 Abas encontradas no arquivo:', allSheets);

          const objectDataAll: any[] = [];
          let totalRawRows = 0;
          let totalFilteredRows = 0;

          for (const name of allSheets) {
            console.log(`\n🔍 Processando aba: "${name}"`);
            const ws = workbook.Sheets[name];
            if (!ws) {
              console.log(`❌ Aba ${name}: worksheet vazio`);
              continue;
            }
            
            let jsonDataSheet: any;
            try {
              jsonDataSheet = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
            } catch (err) {
              console.log(`⚠️ Fallback para método alternativo na aba ${name}:`, err);
              jsonDataSheet = XLSX.utils.sheet_to_json(ws, { defval: '' });
            }
            
            console.log(`📊 Aba ${name}: ${jsonDataSheet.length} linhas brutas`);
            totalRawRows += jsonDataSheet.length;
            
            if (!jsonDataSheet || jsonDataSheet.length < 2) {
              console.log(`❌ Aba ${name}: ignorada (menos de 2 linhas)`);
              continue;
            }

            let sheetObjects: any[] = [];
            if (Array.isArray(jsonDataSheet[0])) {
              const headers = (jsonDataSheet[0] as string[]).map(h => String(h || '').trim());
              console.log(`📋 Headers da aba ${name} (${headers.length} colunas):`, headers);
              
              const rows = jsonDataSheet.slice(1) as any[][];
              console.log(`📊 Aba ${name}: ${rows.length} linhas de dados (sem header)`);
              
              // Check for exactly your data structure: 13 columns, 7864 total rows
              if (headers.length === 13 && jsonDataSheet.length === 7865) { // 7864 data + 1 header
                console.log(`🎯 ENCONTROU ESTRUTURA ESPERADA: 13 colunas, ${jsonDataSheet.length - 1} linhas de dados`);
              }
              
              // More detailed filtering with counts
              let emptyRows = 0;
              let validRows = 0;
              
              const filteredRows = rows.filter(row => {
                if (!row || row.length === 0) {
                  emptyRows++;
                  return false;
                }
                
                const hasData = row.some(cell => cell !== '' && cell !== null && cell !== undefined);
                if (!hasData) {
                  emptyRows++;
                  return false;
                }
                
                validRows++;
                return true;
              });
              
              console.log(`✅ Aba ${name}: ${validRows} linhas válidas, ${emptyRows} linhas vazias/inválidas`);
              
              sheetObjects = filteredRows.map(row => {
                const obj: any = {};
                headers.forEach((header, index) => {
                  if (header && header.trim() !== '') {
                    obj[header.trim()] = row[index];
                  }
                });
                return obj;
              });
              
              // Show sample of first few objects
              if (sheetObjects.length > 0) {
                console.log(`🔍 Amostra da primeira linha processada (aba ${name}):`, sheetObjects[0]);
              }
            } else {
              sheetObjects = (jsonDataSheet as any[]).filter((row: any) => row && Object.keys(row).length > 0);
            }
            
            console.log(`✅ Aba ${name}: ${sheetObjects.length} objetos finais`);
            totalFilteredRows += sheetObjects.length;
            objectDataAll.push(...sheetObjects);
          }

          console.log(`\n📊 RESUMO EXCEL:`);
          console.log(`📋 Total de abas: ${allSheets.length}`);
          console.log(`📊 Total linhas brutas (todas as abas): ${totalRawRows}`);
          console.log(`✅ Total linhas filtradas (todas as abas): ${totalFilteredRows}`);
          console.log(`🎯 Total objetos combinados: ${objectDataAll.length}`);
          if (objectDataAll.length === 0) {
            throw new Error('Nenhum registro válido encontrado em nenhuma aba.');
          }

          const records = this.mapToFinancialRecords(objectDataAll);
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
    console.log('🔍 Raw data received - Total rows:', data.length);
    
    // Filter out invalid rows and find the actual data
    const cleanedData = data.filter((row, index) => {
      // Skip rows that don't look like financial records
      if (!row || typeof row !== 'object') {
        console.log(`❌ Row ${index + 1}: Invalid object`);
        return false;
      }
      
      const keys = Object.keys(row);
      if (keys.length === 0) {
        console.log(`❌ Row ${index + 1}: Empty object`);
        return false;
      }
      
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
        console.log(`❌ Row ${index + 1}: Metadata pattern detected`);
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
      
      // Be more permissive - if row has any meaningful data, keep it
      const hasAnyData = keys.some(key => {
        const value = row[key];
        return value !== null && value !== undefined && String(value).trim() !== '';
      });
      
      if (!hasAnyData) {
        console.log(`❌ Row ${index + 1}: No meaningful data`);
        return false;
      }
      
      // Only skip if we're very sure it's not financial data
      if (!hasTipoField && !hasValueField) {
        // Check if any value looks like a financial amount
        const hasFinancialAmount = keys.some(key => {
          const value = String(row[key]);
          return /^-?[\d.,]+$/.test(value.replace(/[R$\s]/g, ''));
        });
        
        if (!hasFinancialAmount) {
          console.log(`❌ Row ${index + 1}: No financial fields detected - Keys: ${keys.slice(0, 3).join(', ')}...`);
          return false;
        }
      }
      
      return true;
    });
    
    console.log('✅ Cleaned data - Valid rows:', cleanedData.length);
    console.log('❌ Filtered out rows:', data.length - cleanedData.length);
    
    if (cleanedData.length === 0) {
      throw new Error('Nenhum registro financeiro válido encontrado. Verifique se a planilha contém as colunas: Tipo, Valor efetivo, Status, Data efetiva, Descrição, Categoria.');
    }

    // Incluir TODOS os status (sem filtro) para somar tudo conforme solicitado
    const allStatusData = cleanedData;
    console.log(`📊 Using ${allStatusData.length} records (all status) from ${cleanedData.length} valid lines`);
    console.log(`📉 Total discarded: ${data.length - allStatusData.length} rows`);
    
    const processedRecords = allStatusData.map((row, index) => {
      try {
        // Reduced logging for performance - only log every 1000th record
        if (index % 1000 === 0) {
          console.log(`⚙️ Processing record ${index + 1}/${allStatusData.length}...`);
        }
        
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
    });
    
    console.log(`✅ FINAL RESULT: ${processedRecords.length} records processed successfully`);
    console.log(`📊 Summary: ${data.length} → ${cleanedData.length} → ${processedRecords.length}`);
    
    return processedRecords;
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
    const validRecords = records; // somar tudo, sem filtrar zeros/status
    
    // RECEITA BRUTA = soma de todas as categorias iniciadas por 1.x (sempre positiva)
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
    
    // SAÍDAS TOTAIS (2.x) COM O SINAL ORIGINAL (para bater com a pivot do Excel)
    const saidasComSinal = validRecords
      .filter(r => (r.categoria || '').startsWith('2.'))
      .reduce((sum, r) => sum + (Number(r.valorEfetivo) || 0), 0);
    
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
      margemLiquida,
      saidasTotais: Math.abs(saidasComSinal)
    };
  }

  static getCategoryData(records: FinancialRecord[]): ChartData[] {
    const validRecords = records; // somar tudo
    
    // Função para agrupar categorias DRE em grupos principais
    const groupCategory = (categoria: string): string => {
      if (!categoria) return 'Outros';
      
      const catLower = categoria.toLowerCase();
      
      // Agrupar receitas (1.x)
      if (categoria.startsWith('1.')) {
        return 'Receitas';
      }
      
      // Agrupar custos com veículos (2.1.1.x)
      if (categoria.startsWith('2.1.1.') || catLower.includes('locação') ||
          catLower.includes('locacao') || catLower.includes('manutenção') ||
          catLower.includes('manutencao') || catLower.includes('ipva') ||
          catLower.includes('licenciamento') || catLower.includes('dpvat')) {
        return 'Custos com Veículos';
      }
      
      // Agrupar sinistros (2.1.1.13 e similares)
      if (catLower.includes('sinistro') || categoria.includes('2.1.1.13')) {
        return 'Sinistros';
      }
      
      // Agrupar encargos trabalhistas (2.2.2.x)
      if (categoria.startsWith('2.2.2.') || catLower.includes('fgts') ||
          catLower.includes('multa fgts') || catLower.includes('inss') ||
          catLower.includes('encargo')) {
        return 'Encargos Trabalhistas';
      }
      
      // Agrupar salários (2.2.1.x)
      if (categoria.startsWith('2.2.1.') || catLower.includes('salário') || 
          catLower.includes('salario') || catLower.includes('ordenado')) {
        return 'Salários';
      }
      
      // Agrupar impostos e taxas (2.2.6.x)
      if (categoria.startsWith('2.2.6.') || catLower.includes('iptu') ||
          catLower.includes('imposto') || catLower.includes('taxa') ||
          catLower.includes('tributo') || catLower.includes('contribuição')) {
        return 'Impostos e Taxas';
      }
      
      // Agrupar combustível
      if (catLower.includes('combustível') || catLower.includes('combustivel') ||
          catLower.includes('gasolina') || catLower.includes('diesel')) {
        return 'Combustível';
      }
      
      // Agrupar seguros
      if (catLower.includes('seguro')) {
        return 'Seguros';
      }
      
      // Agrupar despesas administrativas (2.2.3.x, 2.2.4.x, 2.2.5.x)
      if (categoria.startsWith('2.2.3.') || categoria.startsWith('2.2.4.') ||
          categoria.startsWith('2.2.5.') || catLower.includes('administrativ') ||
          catLower.includes('escritório') || catLower.includes('escritorio') ||
          catLower.includes('telefone') || catLower.includes('internet') ||
          catLower.includes('energia') || catLower.includes('aluguel')) {
        return 'Despesas Administrativas';
      }
      
      // Agrupar despesas operacionais (2.3.x)
      if (categoria.startsWith('2.3.') || catLower.includes('marketing') ||
          catLower.includes('publicidade') || catLower.includes('intermediação') ||
          catLower.includes('intermediacao') || catLower.includes('operacional')) {
        return 'Despesas Operacionais';
      }
      
      // Se não se encaixa em nenhum grupo específico, verificar se é uma categoria DRE genérica
      if (categoria.match(/^\d+\./)) {
        return 'Outras Categorias DRE';
      }
      
      // Se não é categoria DRE, manter original
      return categoria;
    };
    
    // Agrupar dados por categoria
    const groupedData: { [key: string]: number } = {};
    
    validRecords.forEach(record => {
      const groupName = groupCategory(record.categoria);
      if (!groupedData[groupName]) {
        groupedData[groupName] = 0;
      }
      groupedData[groupName] += Math.abs(record.valorEfetivo);
    });
    
    // Paleta de cores harmoniosa com verde como destaque
    const colors: { [key: string]: string } = {
      'Receitas': '#16A34A',           // Verde principal (destaque)
      'Custos com Veículos': '#F97316', // Laranja
      'Sinistros': '#EF4444',          // Vermelho suave
      'Salários': '#3B82F6',           // Azul
      'Encargos Trabalhistas': '#6366F1', // Azul índigo
      'Impostos e Taxas': '#8B5CF6',   // Roxo
      'Combustível': '#F59E0B',        // Âmbar
      'Seguros': '#10B981',            // Verde esmeralda
      'Despesas Administrativas': '#F59E0B', // Âmbar
      'Despesas Operacionais': '#EC4899', // Rosa
      'Outras Categorias DRE': '#6B7280', // Cinza neutro
      'Outros': '#9CA3AF'             // Cinza claro
    };
    
    // Converter para formato do gráfico e ordenar por valor
    return Object.entries(groupedData)
      .filter(([_, value]) => value > 0)
      .sort(([, a], [, b]) => b - a)
      .map(([name, value], index) => ({
        name,
        value,
        color: colors[name] || `hsl(${index * 36}, 65%, 50%)`
      }));
  }


  static getEvolutionData(records: FinancialRecord[]): ChartData[] {
    const validRecords = records; // somar tudo
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
    const validRecords = records; // somar tudo
    
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
      { name: 'Receita Bruta', value: receita, color: '#16A34A' }, // Verde
      { name: 'Custos', value: custos, color: '#DC2626' },         // Vermelho
      { name: 'Despesas', value: despesas, color: '#F97316' }      // Laranja
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
    const validRecords = records; // somar tudo
    
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

  // === DRE Detalhado: Pivot mensal por categoria (todas as categorias 1.x e 2.x) ===
  static getMonthlyByCategory(records: FinancialRecord[]): MonthlyPivotRow[] {
    const validRecords = records.filter(r => r.valorEfetivo && !isNaN(r.valorEfetivo) && r.valorEfetivo !== 0);

    // Mapa por categoria
    type CatRow = { name: string; group: 'Despesa' | 'Receita' | 'Total'; months: Record<MonthKey, number>; total: number };
    const byCategory = new Map<string, CatRow>();

    const ensureRow = (categoria: string, group: 'Despesa' | 'Receita') => {
      if (!byCategory.has(categoria)) {
        byCategory.set(categoria, {
          name: categoria,
          group,
          months: this.initMonths(),
          total: 0
        });
      }
      return byCategory.get(categoria)!;
    };

    // Totais por grupo
    const totalDespesa: CatRow = { name: 'Despesa', group: 'Despesa', months: this.initMonths(), total: 0 };
    const totalReceita: CatRow = { name: 'Receita', group: 'Receita', months: this.initMonths(), total: 0 };

    // Percorre lançamentos e agrega por mês
    for (const r of validRecords) {
      const categoria = (r.categoria || '').trim();
      if (!categoria) continue;

      const month = this.toMonthKey(r.dataEfetiva);
      const valueAbs = Math.abs(r.valorEfetivo);

      if (categoria.startsWith('1.')) {
        const row = ensureRow(categoria, 'Receita');
        row.months[month] += valueAbs; // receitas positivas
        row.total += valueAbs;
        totalReceita.months[month] += valueAbs;
        totalReceita.total += valueAbs;
      } else if (categoria.startsWith('2.')) {
        const row = ensureRow(categoria, 'Despesa');
        row.months[month] -= valueAbs; // despesas negativas
        row.total -= valueAbs;
        totalDespesa.months[month] -= valueAbs;
        totalDespesa.total -= valueAbs;
      }
    }

    // Ordenar categorias por código (ordem natural)
    const categoryRows = Array.from(byCategory.values()).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { numeric: true }));

    // Linha de Total Geral (resultado)
    const totalGeral: CatRow = { name: 'Total Geral', group: 'Total', months: this.initMonths(), total: 0 };
    this.monthKeys.forEach((m) => {
      const val = (totalReceita.months[m] || 0) + (totalDespesa.months[m] || 0);
      totalGeral.months[m] = val;
      totalGeral.total += val;
    });

    // Retornar na ordem: cabeçalho Despesa, linhas 2.x, cabeçalho Receita, linhas 1.x, Total Geral
    const despesas = categoryRows.filter(r => r.group === 'Despesa');
    const receitas = categoryRows.filter(r => r.group === 'Receita');

    const rows: MonthlyPivotRow[] = [
      totalDespesa as MonthlyPivotRow,
      ...despesas as MonthlyPivotRow[],
      totalReceita as MonthlyPivotRow,
      ...receitas as MonthlyPivotRow[],
      totalGeral as MonthlyPivotRow,
    ];

    return rows;
  }
}
