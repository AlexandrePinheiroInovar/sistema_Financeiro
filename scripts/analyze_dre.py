"""
Script de diagnóstico para entender divergências do DRE a partir do arquivo XLSX (sem dependências externas).

Etapas:
- Lê Teste.xlsx via zipfile (xl/worksheets/sheet1.xml + xl/sharedStrings.xml)
- Converte a primeira aba em lista de objetos (header + linhas)
- Aplica mesmos critérios do app (Status = 'Conciliado'; categorias 1.x, 2.1.x, 2.2.x/2.3.x)
- Compara método ABS (soma por absoluto) x método com SINAL (respeitando o sinal), mês a mês
- Lista categorias 2.x com valores positivos (estornos/cashback/reembolso) que explicam diferenças
"""

from __future__ import annotations
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import List, Dict, Any

FILE = Path(__file__).resolve().parent.parent / 'dashboard-financeiro' / 'Teste.xlsx'

MONTH_KEYS = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']

def to_month_key(iso_date: str) -> str:
    from datetime import datetime
    try:
        d = datetime.fromisoformat(iso_date.replace('Z',''))
    except Exception:
        d = datetime.now()
    return MONTH_KEYS[d.month - 1]

def excel_num_to_iso(value: float) -> str:
    # Excel: dias desde 1900-01-01, com bug do ano bissexto (offset -2)
    from datetime import datetime, timedelta
    base = datetime(1900,1,1)
    try:
        dt = base + timedelta(days=float(value) - 2)
        return dt.isoformat()
    except Exception:
        return datetime.now().isoformat()

def parse_number(v: Any) -> float:
    if isinstance(v, (int, float)):
        return float(v)
    s = str(v).strip().replace('R$','').replace(' ','').replace('.','').replace(',', '.')
    try:
        return float(s)
    except Exception:
        return 0.0

def validate_tipo(tipo: Any) -> str:
    t = str(tipo).lower()
    if 'receita' in t:
        return 'Receita'
    if 'despesa' in t:
        return 'Despesa'
    if 'custo' in t:
        return 'Despesa'
    raise ValueError(f"Tipo inválido: {tipo}")

def read_shared_strings(z: zipfile.ZipFile) -> List[str]:
    try:
        with z.open('xl/sharedStrings.xml') as f:
            tree = ET.parse(f)
        root = tree.getroot()
        ns = {'s': root.tag.split('}')[0].strip('{')}
        strings = []
        for si in root.findall('s:si', ns):
            # pega texto concatenando possíveis t/r
            text_parts = []
            t = si.find('s:t', ns)
            if t is not None and t.text is not None:
                text_parts.append(t.text)
            else:
                for run in si.findall('s:r', ns):
                    tt = run.find('s:t', ns)
                    if tt is not None and tt.text is not None:
                        text_parts.append(tt.text)
            strings.append(''.join(text_parts))
        return strings
    except KeyError:
        return []

def col_to_index(col_ref: str) -> int:
    # Converte referência de coluna em índice zero-based (A=0, B=1, ...)
    col = ''.join([c for c in col_ref if c.isalpha()])
    idx = 0
    for ch in col:
        idx = idx * 26 + (ord(ch.upper()) - ord('A') + 1)
    return idx - 1

def read_first_sheet_as_rows(xlsx_path: Path) -> List[List[Any]]:
    with zipfile.ZipFile(xlsx_path, 'r') as z:
        # Localiza a primeira planilha
        with z.open('xl/workbook.xml') as f:
            wb = ET.parse(f)
        wb_ns = {'w': wb.getroot().tag.split('}')[0].strip('{')}
        sheet = wb.getroot().find('w:sheets/w:sheet', wb_ns)
        sheet_id = sheet.attrib.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')
        # Mapa de rels para descobrir o arquivo físico da aba
        with z.open('xl/_rels/workbook.xml.rels') as f:
            rels = ET.parse(f)
        rns = {'r': rels.getroot().tag.split('}')[0].strip('{')}
        target = None
        for rel in rels.getroot().findall('r:Relationship', rns):
            if rel.attrib.get('Id') == sheet_id:
                target = rel.attrib.get('Target')
                break
        if not target:
            target = 'worksheets/sheet1.xml'
        sheet_path = 'xl/' + target if not target.startswith('xl/') else target

        shared = read_shared_strings(z)
        with z.open(sheet_path) as f:
            ws = ET.parse(f)
        root = ws.getroot()
        ns = {'x': root.tag.split('}')[0].strip('{')}

        rows: List[List[Any]] = []
        for row in root.findall('x:sheetData/x:row', ns):
            cells = []
            for c in row.findall('x:c', ns):
                r = c.attrib.get('r', 'A1')
                idx = col_to_index(r)
                while len(cells) <= idx:
                    cells.append('')
                t = c.attrib.get('t')  # 's' => shared string
                v = c.find('x:v', ns)
                val: Any = ''
                if v is not None and v.text is not None:
                    if t == 's':
                        # índice na shared strings
                        try:
                            val = shared[int(v.text)]
                        except Exception:
                            val = ''
                    else:
                        # número ou string direta
                        try:
                            val = float(v.text)
                        except Exception:
                            val = v.text
                cells[idx] = val
            rows.append(cells)
        return rows

def rows_to_objects(rows: List[List[Any]]) -> List[Dict[str, Any]]:
    if not rows or len(rows) < 2:
        return []
    headers = [str(h or '').strip() for h in rows[0]]
    objs = []
    for r in rows[1:]:
        if not any(x not in (None, '', 0) for x in r):
            continue
        obj = {}
        for i, h in enumerate(headers):
            if h:
                obj[h] = r[i] if i < len(r) else ''
        objs.append(obj)
    return objs

def map_to_financial_records(data: List[Dict[str, Any]]):
    # remove metadados/linhas inválidas
    cleaned = []
    for row in data:
        if not isinstance(row, dict):
            continue
        keys = list(row.keys())
        invalid = any(
            (('locagora' in k.lower()) or ('rótulos' in k.lower()) or ('labels' in k.lower()) or ('total' in k.lower()) or ('soma' in k.lower()) or ('subtotal' in k.lower()))
            for k in keys
        )
        if invalid:
            continue
        cleaned.append(row)

    # somente Status = Conciliado (igual ao app)
    conc = [r for r in cleaned if str(r.get('Status') or r.get('status') or '').strip() == 'Conciliado']

    recs = []
    for row in conc:
        keys = list(row.keys())
        tipo_key = next((k for k in keys if 'tipo' in k.lower()), None)
        valor_key = next((k for k in keys if ('valor' in k.lower() and 'efet' in k.lower())), None)
        data_key = next((k for k in keys if ('data' in k.lower() and 'efet' in k.lower())), None)

        tipo = validate_tipo(row.get(tipo_key) if tipo_key else (row.get('Tipo') or row.get('TIPO') or ''))
        valor_raw = row.get(valor_key) if valor_key else (row.get('Valor efetivo') or row.get('VALOR EFETIVO') or row.get('Valor Efetivo'))
        data_raw = row.get(data_key) if data_key else (row.get('Data efetiva') or row.get('DATA EFETIVA') or row.get('Data Efetiva'))

        valor = parse_number(valor_raw)
        if isinstance(data_raw, (int, float)):
            data_iso = excel_num_to_iso(data_raw)
        else:
            # tentativa ingênua: se vier como string dd/mm/yyyy
            import re, datetime
            s = str(data_raw)
            m1 = re.search(r"(\d{1,2})/(\d{1,2})/(\d{4})", s)
            m2 = re.search(r"(\d{4})-(\d{1,2})-(\d{1,2})", s)
            if m1:
                d, M, y = map(int, m1.groups())
                data_iso = datetime.datetime(y, M, d).isoformat()
            elif m2:
                y, M, d = map(int, m2.groups())
                data_iso = datetime.datetime(y, M, d).isoformat()
            else:
                try:
                    from datetime import datetime
                    data_iso = datetime.fromisoformat(s).isoformat()
                except Exception:
                    from datetime import datetime
                    data_iso = datetime.now().isoformat()

        rec = {
            'tipo': tipo,
            'dataEfetiva': data_iso,
            'valorEfetivo': valor,
            'categoria': str(row.get('Categoria') or row.get('categoria') or ''),
            'descricao': str(row.get('Descrição') or row.get('descricao') or ''),
        }
        if valor and valor != 0:
            recs.append(rec)
    return recs

def map_to_records_all_status(data: List[Dict[str, Any]]):
    """Mapeia registros sem filtrar por Status (usa todos)."""
    cleaned = []
    for row in data:
        if not isinstance(row, dict):
            continue
        keys = list(row.keys())
        invalid = any(
            (('locagora' in k.lower()) or ('rótulos' in k.lower()) or ('labels' in k.lower()) or ('total' in k.lower()) or ('soma' in k.lower()) or ('subtotal' in k.lower()))
            for k in keys
        )
        if invalid:
            continue
        cleaned.append(row)

    recs = []
    for row in cleaned:
        keys = list(row.keys())
        tipo_key = next((k for k in keys if 'tipo' in k.lower()), None)
        valor_key = next((k for k in keys if ('valor' in k.lower() and 'efet' in k.lower())), None)
        data_key = next((k for k in keys if ('data' in k.lower() and 'efet' in k.lower())), None)

        try:
            tipo = validate_tipo(row.get(tipo_key) if tipo_key else (row.get('Tipo') or row.get('TIPO') or ''))
        except Exception:
            continue
        valor_raw = row.get(valor_key) if valor_key else (row.get('Valor efetivo') or row.get('VALOR EFETIVO') or row.get('Valor Efetivo'))
        data_raw = row.get(data_key) if data_key else (row.get('Data efetiva') or row.get('DATA EFETIVA') or row.get('Data Efetiva'))

        valor = parse_number(valor_raw)
        if isinstance(data_raw, (int, float)):
            data_iso = excel_num_to_iso(data_raw)
        else:
            # tentativa simples
            import re, datetime
            s = str(data_raw)
            m1 = re.search(r"(\d{1,2})/(\d{1,2})/(\d{4})", s)
            m2 = re.search(r"(\d{4})-(\d{1,2})-(\d{1,2})", s)
            if m1:
                d, M, y = map(int, m1.groups())
                data_iso = datetime.datetime(y, M, d).isoformat()
            elif m2:
                y, M, d = map(int, m2.groups())
                data_iso = datetime.datetime(y, M, d).isoformat()
            else:
                try:
                    from datetime import datetime
                    data_iso = datetime.fromisoformat(s).isoformat()
                except Exception:
                    from datetime import datetime
                    data_iso = datetime.now().isoformat()

        rec = {
            'tipo': tipo,
            'dataEfetiva': data_iso,
            'valorEfetivo': valor,
            'categoria': str(row.get('Categoria') or row.get('categoria') or ''),
            'descricao': str(row.get('Descrição') or row.get('descricao') or ''),
        }
        if valor and valor != 0:
            recs.append(rec)
    return recs

def aggregate_monthly(records):
    monthly = {m: { 'receita':0.0, 'custos_abs':0.0, 'despesas_abs':0.0, 'custos_sinal':0.0, 'despesas_sinal':0.0 } for m in MONTH_KEYS}
    for r in records:
        m = to_month_key(r['dataEfetiva'])
        cat = r.get('categoria','')
        v = float(r['valorEfetivo'])
        if cat.startswith('1.'):
            monthly[m]['receita'] += abs(v)
        elif cat.startswith('2.1.'):
            monthly[m]['custos_abs'] += abs(v)
            monthly[m]['custos_sinal'] += v
        elif cat.startswith('2.2.') or cat.startswith('2.3.'):
            monthly[m]['despesas_abs'] += abs(v)
            monthly[m]['despesas_sinal'] += v
    return monthly

def aggregate_by_creation(records):
    monthly = {m: { 'receita':0.0, 'custos_sinal':0.0, 'despesas_sinal':0.0 } for m in MONTH_KEYS}
    def to_month_from_creation(r):
        from datetime import datetime
        s = r.get('dataCriacao') or r.get('dataEfetiva')
        try:
            d = datetime.fromisoformat(str(s).replace('Z',''))
        except Exception:
            d = datetime.now()
        return MONTH_KEYS[d.month-1]
    for r in records:
        mk = to_month_from_creation(r)
        cat = r.get('categoria','')
        v = float(r['valorEfetivo'])
        if cat.startswith('1.'):
            monthly[mk]['receita'] += abs(v)
        elif cat.startswith('2.1.'):
            monthly[mk]['custos_sinal'] += v
        elif cat.startswith('2.2.') or cat.startswith('2.3.'):
            monthly[mk]['despesas_sinal'] += v
    return monthly

def brl(n: float) -> str:
    return f"R$ {n:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.')

def main():
    rows = read_first_sheet_as_rows(FILE)
    objs = rows_to_objects(rows)

    # Estatística de Status antes do filtro
    status_counts = {}
    for o in objs:
        st = str(o.get('Status') or o.get('status') or '').strip() or '(vazio)'
        status_counts[st] = status_counts.get(st, 0) + 1

    recs = map_to_financial_records(objs)
    recs_all = map_to_records_all_status(objs)
    m = aggregate_monthly(recs)

    print(f"Registros totais na aba: {len(objs)}")
    print("Distribuição de Status (antes do filtro):", status_counts)
    print(f"Registros usados (Status=Conciliado, valor!=0): {len(recs)}")
    print(f"Registros usados SEM filtro de status (valor!=0): {len(recs_all)}")

    # Checar inconsistências: Categoria 1.x (receita) com Tipo diferente de 'Receita', e vice-versa
    mismatches = {'cat1_tipo_nao_receita': 0, 'cat2_tipo_receita': 0}
    for o in objs:
        cat = str(o.get('Categoria') or '')
        tipo = str(o.get('Tipo') or '').lower()
        if cat.startswith('1.') and ('receita' not in tipo):
            mismatches['cat1_tipo_nao_receita'] += 1
        if (cat.startswith('2.')) and ('receita' in tipo):
            mismatches['cat2_tipo_receita'] += 1
    print("Inconsistências Tipo x Categoria:", mismatches)
    print("\nResumo por mês (ABS vs SINAL):")
    print('MÊS; Receita; Custos(ABS); Despesas(ABS); Lucro(ABS); Custos(sinal); Despesas(sinal); Lucro(sinal); Diferença')
    for k in MONTH_KEYS:
        d = m[k]
        lucro_abs = d['receita'] - d['custos_abs'] - d['despesas_abs']
        lucro_sign = d['receita'] + d['custos_sinal'] + d['despesas_sinal']
        diff = lucro_abs - lucro_sign
        print('; '.join([
            k.upper(), brl(d['receita']), brl(-d['custos_abs']), brl(-d['despesas_abs']), brl(lucro_abs),
            brl(-d['custos_sinal']), brl(-d['despesas_sinal']), brl(lucro_sign), brl(diff)
        ]))

    # Categorias 2.x com valores positivos
    by_cat: Dict[str, Dict[str, float]] = {}
    for r in recs:
        cat = r.get('categoria','')
        if cat.startswith('2.'):
            by_cat.setdefault(cat, {'pos':0.0,'neg':0.0})
            if r['valorEfetivo'] > 0:
                by_cat[cat]['pos'] += r['valorEfetivo']
            else:
                by_cat[cat]['neg'] += r['valorEfetivo']
    cats_with_pos = sorted([(k,v) for k,v in by_cat.items() if v['pos']>0], key=lambda x: -x[1]['pos'])
    print("\nCategorias 2.x com valores POSITIVOS (podem causar divergência):")
    for k,(posneg) in zip([c[0] for c in cats_with_pos], [c[1] for c in cats_with_pos]):
        print(f"{k}: positivos={brl(posneg['pos'])} | negativos={brl(posneg['neg'])}")

    suspeitas = ['2.3.17', '2.3.18', '2.3.19', '2.3.20', '2.3.21', '2.3.22', '2.3.23', '2.3.24', '2.2.3.8']
    soma_suspeitas = 0.0
    for r in recs:
        if any(r.get('categoria','').startswith(s) for s in suspeitas):
            soma_suspeitas += r['valorEfetivo']
    print("\nSoma (com sinal) de categorias potencialmente não operacionais (2.3.17–2.3.24, 2.2.3.8):", brl(soma_suspeitas))

    # Diagnóstico: saldo de movimentações entre contas (1.2.4 e 2.3.24) por mês
    mv = {k: 0.0 for k in MONTH_KEYS}
    for r in recs:
        cat = r.get('categoria','')
        if cat.startswith('1.2.4') or cat.startswith('2.3.24'):
            mv[to_month_key(r['dataEfetiva'])] += r['valorEfetivo']
    print("\nMovimentações entre contas (1.2.4 + 2.3.24) — saldo por mês (com sinal):")
    for k in MONTH_KEYS:
        print(k.upper()+':', brl(mv[k]))

    # Diagnóstico: reembolsos/estornos (2.3.20) por mês
    reemb = {k: 0.0 for k in MONTH_KEYS}
    for r in recs:
        cat = r.get('categoria','')
        if cat.startswith('2.3.20'):
            reemb[to_month_key(r['dataEfetiva'])] += r['valorEfetivo']
    print("\nReembolsos/Devoluções/Cashback/Estornos (2.3.20) — saldo por mês:")
    for k in MONTH_KEYS:
        print(k.upper()+':', brl(reemb[k]))

    # Diagnóstico: categorias fora de 1.x, 2.1.x, 2.2.x, 2.3.x
    outros = {k: 0.0 for k in MONTH_KEYS}
    cats_outros = {}
    for r in recs:
        cat = r.get('categoria','')
        if not (cat.startswith('1.') or cat.startswith('2.1.') or cat.startswith('2.2.') or cat.startswith('2.3.')):
            mk = to_month_key(r['dataEfetiva'])
            outros[mk] += r['valorEfetivo']
            cats_outros.setdefault(cat or '(vazio)', 0.0)
            cats_outros[cat or '(vazio)'] += r['valorEfetivo']
    print("\nCategorias FORA do escopo (1.x,2.1.x,2.2.x,2.3.x) — saldo por mês:")
    for k in MONTH_KEYS:
        print(k.upper()+':', brl(outros[k]))
    if cats_outros:
        print("\nTop categorias fora do escopo:")
        for cat, val in sorted(cats_outros.items(), key=lambda x: -abs(x[1]))[:20]:
            print(f"{cat}: {brl(val)}")

    # Comparativo: usando data de criação ao invés de data efetiva
    m_cre = aggregate_by_creation(recs)
    print("\nComparativo usando DATA DE CRIAÇÃO (receita + custos + despesas com sinal):")
    print('MÊS; Receita; Custos(sinal); Despesas(sinal); Resultado')
    for k in MONTH_KEYS:
        d = m_cre[k]
        res = d['receita'] + d['custos_sinal'] + d['despesas_sinal']
        print('; '.join([k.upper(), brl(d['receita']), brl(-d['custos_sinal']), brl(-d['despesas_sinal']), brl(res)]))

    # Comparativo: resultado mensal SEM filtro de status
    m_all = aggregate_monthly(recs_all)
    print("\nResultado mensal SEM filtro de Status (data efetiva):")
    print('MÊS; Receita; Custos(sinal); Despesas(sinal); Resultado')
    for k in MONTH_KEYS:
        d = m_all[k]
        res = d['receita'] + d['custos_sinal'] + d['despesas_sinal']
        print('; '.join([k.upper(), brl(d['receita']), brl(-d['custos_sinal']), brl(-d['despesas_sinal']), brl(res)]))

    # Quebra de Receita por subgrupo 1.1 / 1.2 / 1.3 para o mês de JUL
    sums = {'1.1': 0.0, '1.2': 0.0, '1.3': 0.0}
    for r in recs:
      if r.get('categoria','').startswith('1.') and to_month_key(r['dataEfetiva']) == 'jul':
        v = abs(float(r['valorEfetivo']))
        if r['categoria'].startswith('1.1'):
          sums['1.1'] += v
        elif r['categoria'].startswith('1.2'):
          sums['1.2'] += v
        elif r['categoria'].startswith('1.3'):
          sums['1.3'] += v
    print("\nReceita de JUL por subgrupo:")
    print("1.1.x:", brl(sums['1.1']))
    print("1.2.x:", brl(sums['1.2']))
    print("1.3.x:", brl(sums['1.3']))
    
    # Amostra de registros JUL em 1.1.8 (para checar se existem na planilha)
    try:
        print("\nAmostra JUL — 1.1.8 Taxa de Intermediação (status, valor):")
        count = 0
        for o in objs:
            cat = str(o.get('Categoria') or '')
            status = str(o.get('Status') or o.get('status') or '').strip()
            data_raw = o.get('Data efetiva') or o.get('DATA EFETIVA') or o.get('Data Efetiva')
            mflag = False
            if isinstance(data_raw, (int, float)):
                iso = excel_num_to_iso(data_raw)
                mflag = to_month_key(iso) == 'jul'
            else:
                iso = str(data_raw)
                mflag = to_month_key(iso) == 'jul'
            if cat.startswith('1.1.8') and mflag:
                v = parse_number(o.get('Valor efetivo') or o.get('VALOR EFETIVO') or o.get('Valor Efetivo'))
                print(status or '(sem status)', brl(v))
                count += 1
        if count == 0:
            print('(nenhum registro encontrado na planilha para 1.1.8 em JUL)')
    except Exception as e:
        print('Falha ao listar amostra 1.1.8:', e)

    # Listar 1.3.x em JUL
    try:
        print("\nAmostra JUL — 1.3.x Outras Receitas (categoria, status, valor):")
        s13 = 0.0
        count13 = 0
        for o in objs:
            cat = str(o.get('Categoria') or '')
            if not cat.startswith('1.3'):
                continue
            status = str(o.get('Status') or o.get('status') or '').strip()
            data_raw = o.get('Data efetiva') or o.get('DATA EFETIVA') or o.get('Data Efetiva')
            mflag = False
            if isinstance(data_raw, (int, float)):
                iso = excel_num_to_iso(data_raw)
                mflag = to_month_key(iso) == 'jul'
            else:
                iso = str(data_raw)
                mflag = to_month_key(iso) == 'jul'
            if mflag:
                v = parse_number(o.get('Valor efetivo') or o.get('VALOR EFETIVO') or o.get('Valor Efetivo'))
                print(cat, status or '(sem status)', brl(v))
                s13 += abs(v)
                count13 += 1
        print('Total 1.3.x (abs) JUL:', brl(s13), '— linhas:', count13)
    except Exception as e:
        print('Falha ao listar 1.3.x:', e)

    # Top Receitas JUL por categoria 1.x (para conciliação manual)
    top = {}
    for r in recs:
        cat = r.get('categoria','')
        if cat.startswith('1.') and to_month_key(r['dataEfetiva']) == 'jul':
            top[cat] = top.get(cat, 0.0) + abs(float(r['valorEfetivo']))
    print("\nRECEITAS JUL por categoria (1.x) — base do dashboard:")
    for k, v in sorted(top.items(), key=lambda x: -x[1]):
        print(f"{k}: {brl(v)}")

if __name__ == '__main__':
    main()
