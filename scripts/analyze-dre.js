/*
  Script de diagnóstico para entender divergências do DRE
  - Lê Teste.xlsx
  - Reproduz a lógica do DataService (parse + filtros + categorias)
  - Compara duas formas de cálculo:
      1) Método ABS (como no código: soma com Math.abs nas categorias)
      2) Método com SINAL (respeita o sinal do valor)
  - Mostra por mês: Receita, Custos, Despesas, Lucro Líquido pelos dois métodos e diferença
  - Lista categorias 2.x que têm valores positivos (potenciais reembolsos/estornos) que causam divergência
*/

const path = require('path');
const XLSX = require('xlsx');

const FILE = path.resolve(__dirname, '..', 'Teste.xlsx');

const monthKeys = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];

function toMonthKey(dateStr) {
  const d = new Date(dateStr);
  const idx = isNaN(d.getTime()) ? 0 : d.getMonth();
  return monthKeys[idx];
}

function parseDateExcel(value) {
  if (!value) return new Date().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'number' && value > 1000) {
    const excelEpoch = new Date(1900, 0, 1);
    const date = new Date(excelEpoch.getTime() + (value - 2) * 86400000);
    if (!isNaN(date.getTime())) return date.toISOString();
  }
  const s = String(value).trim();
  const fmts = [/(\d{1,2})\/(\d{1,2})\/(\d{4})/, /(\d{4})-(\d{1,2})-(\d{1,2})/, /(\d{1,2})-(\d{1,2})-(\d{4})/];
  for (const f of fmts) {
    const m = s.match(f);
    if (m) {
      let y, M, d;
      if (f.source.startsWith('(\\d{4})')) {
        [, y, M, d] = m;
      } else {
        [, d, M, y] = m;
      }
      const dt = new Date(parseInt(y), parseInt(M) - 1, parseInt(d));
      if (!isNaN(dt.getTime())) return dt.toISOString();
    }
  }
  const dt = new Date(value);
  return isNaN(dt.getTime()) ? new Date().toISOString() : dt.toISOString();
}

function parseNumber(v) {
  if (typeof v === 'number') return v;
  const s = String(v).trim().replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function validateTipo(tipo) {
  if (!tipo) throw new Error('Tipo não informado');
  const t = String(tipo).toLowerCase();
  if (t.includes('receita')) return 'Receita';
  if (t.includes('despesa')) return 'Despesa';
  if (t.includes('custo')) return 'Despesa';
  throw new Error('Tipo inválido: ' + tipo);
}

function sheetToObjects(ws) {
  // Converte primeira aba para objetos (como no DataService)
  let data;
  try {
    data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  } catch (e) {
    data = XLSX.utils.sheet_to_json(ws, { defval: '' });
  }
  if (!Array.isArray(data) || data.length < 2) throw new Error('Planilha sem dados');
  if (Array.isArray(data[0])) {
    const headers = data[0].map(h => String(h || '').trim());
    return data.slice(1).filter(r => r && r.some(c => c !== '' && c !== null && c !== undefined)).map(r => {
      const o = {};
      headers.forEach((h, i) => { if (h) o[h] = r[i]; });
      return o;
    });
  }
  return data.filter(r => r && Object.keys(r).length > 0);
}

function mapToFinancialRecords(rows) {
  const cleaned = rows.filter((row) => {
    if (!row || typeof row !== 'object') return false;
    const keys = Object.keys(row);
    const invalidPatterns = [/locagora/i, /rótulos/i, /labels/i, /total/i, /soma/i, /subtotal/i];
    const hasInvalid = keys.some(k => invalidPatterns.some(p => p.test(k)));
    if (hasInvalid) return false;
    return true;
  });

  // Filtro: apenas Status = Conciliado (igual ao DataService)
  const conc = cleaned.filter(r => String(r['Status'] || r['status'] || '').trim() === 'Conciliado');

  return conc.map((row, i) => {
    // tenta achar campos por múltiplas chaves
    const keys = Object.keys(row);
    const tipoKey = keys.find(k => k.toLowerCase().includes('tipo'));
    const valorKey = keys.find(k => k.toLowerCase().includes('valor') && k.toLowerCase().includes('efet'));
    const dataKey = keys.find(k => k.toLowerCase().includes('data') && k.toLowerCase().includes('efet'));

    const record = {
      tipo: validateTipo(tipoKey ? row[tipoKey] : (row['Tipo'] || row['TIPO'] || '')),
      status: 'Pago', // não é usado adiante
      dataEfetiva: parseDateExcel(dataKey ? row[dataKey] : (row['Data efetiva'] || row['DATA EFETIVA'] || row['Data Efetiva'])),
      valorEfetivo: parseNumber(valorKey ? row[valorKey] : (row['Valor efetivo'] || row['VALOR EFETIVO'] || row['Valor Efetivo'])),
      descricao: String(row['Descrição'] || row['descricao'] || ''),
      categoria: String(row['Categoria'] || row['categoria'] || ''),
      conta: String(row['Conta'] || ''),
      contato: String(row['Contato'] || ''),
      cpfCnpj: String(row['CPF/CNPJ'] || ''),
      razaoSocial: String(row['Razão social'] || ''),
      forma: String(row['Forma'] || ''),
      observacoes: String(row['Observações'] || ''),
      dataCriacao: new Date().toISOString(),
    };
    return record;
  }).filter(r => r.valorEfetivo && !isNaN(r.valorEfetivo) && r.valorEfetivo !== 0);
}

function load() {
  const wb = XLSX.readFile(FILE);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = sheetToObjects(ws);
  const records = mapToFinancialRecords(rows);
  return records;
}

function aggregate(records) {
  const monthly = {};
  monthKeys.forEach(m => monthly[m] = { receita: 0, custos_abs: 0, despesas_abs: 0, custos_sinal: 0, despesas_sinal: 0 });

  for (const r of records) {
    const m = toMonthKey(r.dataEfetiva);
    const cat = r.categoria || '';
    const v = r.valorEfetivo;
    if (cat.startsWith('1.')) {
      monthly[m].receita += Math.abs(v);
    } else if (cat.startsWith('2.1.')) {
      monthly[m].custos_abs += Math.abs(v);
      monthly[m].custos_sinal += v; // respeita o sinal
    } else if (cat.startsWith('2.2.') || cat.startsWith('2.3.')) {
      monthly[m].despesas_abs += Math.abs(v);
      monthly[m].despesas_sinal += v; // respeita o sinal
    }
  }
  return monthly;
}

function currency(n) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
}

function run() {
  const recs = load();
  console.log(`Registros (Status=Conciliado, valor!=0): ${recs.length}`);
  const m = aggregate(recs);

  const monthsToShow = monthKeys; // todos
  console.log('\nResumo por mês (ABS vs SINAL):');
  console.log('MÊS; Receita; Custos(ABS); Despesas(ABS); Lucro(ABS); Custos(sinal); Despesas(sinal); Lucro(sinal); Diferença');

  for (const k of monthsToShow) {
    const d = m[k];
    const lucroAbs = d.receita - d.custos_abs - d.despesas_abs;
    const lucroBySign = d.receita + d.custos_sinal + d.despesas_sinal; // soma com sinais originais
    const diff = lucroAbs - lucroBySign;
    console.log([
      k.toUpperCase(), currency(d.receita), currency(-d.custos_abs), currency(-d.despesas_abs), currency(lucroAbs),
      currency(-d.custos_sinal), currency(-d.despesas_sinal), currency(lucroBySign), currency(diff)
    ].join('; '));
  }

  // Checar categorias 2.x com valores POSITIVOS (potenciais reembolsos/estornos)
  const byCat = {};
  for (const r of recs) {
    const cat = r.categoria || '';
    if (cat.startsWith('2.')) {
      if (!byCat[cat]) byCat[cat] = { pos: 0, neg: 0 };
      if (r.valorEfetivo > 0) byCat[cat].pos += r.valorEfetivo; else byCat[cat].neg += r.valorEfetivo;
    }
  }
  const catsWithPos = Object.entries(byCat).filter(([, v]) => v.pos > 0).sort((a,b) => b[1].pos - a[1].pos);
  console.log('\nCategorias 2.x com valores POSITIVOS (reduzem despesa no método com sinal e podem causar divergência):');
  for (const [cat, v] of catsWithPos.slice(0, 40)) {
    console.log(`${cat}: positivos=${currency(v.pos)} | negativos=${currency(v.neg)}`);
  }

  // Itens potencialmente não operacionais que deveriam ser excluídos do DRE
  const suspeitas = ['2.3.17', '2.3.18', '2.3.19', '2.3.20', '2.3.21', '2.3.22', '2.3.23', '2.3.24', '2.2.3.8'];
  let somaSuspeitas = 0;
  for (const r of recs) {
    if (suspeitas.some(s => (r.categoria || '').startsWith(s))) {
      somaSuspeitas += r.valorEfetivo;
    }
  }
  console.log('\nSoma (com sinal) de categorias potencialmente não operacionais (2.3.17–2.3.24, 2.2.3.8):', currency(somaSuspeitas));
}

run();
