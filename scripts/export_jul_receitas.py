from pathlib import Path
import csv
from analyze_dre import read_first_sheet_as_rows, rows_to_objects, map_to_financial_records, to_month_key

BASE = Path(__file__).resolve().parent.parent / 'dashboard-financeiro' / 'Teste.xlsx'
OUT = Path(__file__).resolve().parent / 'out_jul_receitas.csv'

def main():
    rows = read_first_sheet_as_rows(BASE)
    objs = rows_to_objects(rows)
    recs = map_to_financial_records(objs)
    # Somente receitas 1.x em julho (qualquer status, já removemos filtro na lib)
    jul_lines = [r for r in recs if (r.get('categoria','').startswith('1.') and to_month_key(r['dataEfetiva'])=='jul')]
    with OUT.open('w', newline='', encoding='utf-8') as f:
        w = csv.writer(f)
        w.writerow(['dataEfetiva','categoria','valorEfetivo','descricao'])
        for r in jul_lines:
            w.writerow([r['dataEfetiva'], r['categoria'], r['valorEfetivo'], r.get('descricao','')])
    print('Exportado:', OUT)

if __name__ == '__main__':
    main()

