from __future__ import annotations
from pathlib import Path
import zipfile
import xml.etree.ElementTree as ET
from typing import List, Dict, Any

BASE = Path(__file__).resolve().parent.parent / 'dashboard-financeiro' / 'Teste.xlsx'

def read_shared_strings(z: zipfile.ZipFile) -> List[str]:
    try:
        with z.open('xl/sharedStrings.xml') as f:
            tree = ET.parse(f)
        root = tree.getroot()
        ns = {'s': root.tag.split('}')[0].strip('{')}
        strings = []
        for si in root.findall('s:si', ns):
            t = si.find('s:t', ns)
            if t is not None and t.text is not None:
                strings.append(t.text)
            else:
                parts = []
                for run in si.findall('s:r', ns):
                    tt = run.find('s:t', ns)
                    if tt is not None and tt.text is not None:
                        parts.append(tt.text)
                strings.append(''.join(parts))
        return strings
    except KeyError:
        return []

def col_to_index(col_ref: str) -> int:
    col = ''.join([c for c in col_ref if c.isalpha()])
    idx = 0
    for ch in col:
        idx = idx * 26 + (ord(ch.upper()) - ord('A') + 1)
    return idx - 1

def list_sheets_with_paths(z: zipfile.ZipFile) -> List[tuple[str,str]]:
    with z.open('xl/workbook.xml') as f:
        wb = ET.parse(f)
    wb_ns = {'w': wb.getroot().tag.split('}')[0].strip('{')}
    sheets = []
    for sheet in wb.getroot().findall('w:sheets/w:sheet', wb_ns):
        name = sheet.attrib.get('name') or sheet.attrib.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')
        rid = sheet.attrib.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')
        sheets.append((name, rid))
    with z.open('xl/_rels/workbook.xml.rels') as f:
        rels = ET.parse(f)
    rns = {'r': rels.getroot().tag.split('}')[0].strip('{')}
    id_to_target = {}
    for rel in rels.getroot().findall('r:Relationship', rns):
        id_to_target[rel.attrib.get('Id')] = rel.attrib.get('Target')
    result = []
    for name, rid in sheets:
        target = id_to_target.get(rid, '')
        if target and not target.startswith('xl/'):
            target = 'xl/' + target
        result.append((name, target or 'xl/worksheets/sheet1.xml'))
    return result

def read_sheet_objects(z: zipfile.ZipFile, sheet_path: str, shared: List[str]) -> tuple[int, List[Dict[str,Any]]]:
    with z.open(sheet_path) as f:
        ws = ET.parse(f)
    root = ws.getroot()
    ns = {'x': root.tag.split('}')[0].strip('{')}
    rows = []
    for row in root.findall('x:sheetData/x:row', ns):
        cells: List[Any] = []
        for c in row.findall('x:c', ns):
            r = c.attrib.get('r', 'A1')
            idx = col_to_index(r)
            while len(cells) <= idx:
                cells.append('')
            t = c.attrib.get('t')
            v = c.find('x:v', ns)
            val = ''
            if v is not None and v.text is not None:
                if t == 's':
                    try:
                        val = shared[int(v.text)]
                    except Exception:
                        val = ''
                else:
                    try:
                        val = float(v.text)
                    except Exception:
                        val = v.text
            cells[idx] = val
        rows.append(cells)
    if not rows or len(rows) < 2:
        return (len(rows), [])
    headers = [str(h or '').strip() for h in rows[0]]
    objs: List[Dict[str,Any]] = []
    for r in rows[1:]:
        if not any(x not in (None, '', 0) for x in r):
            continue
        o = {}
        for i,h in enumerate(headers):
            if h:
                o[h] = r[i] if i < len(r) else ''
        objs.append(o)
    return (len(rows), objs)

def main():
    z = zipfile.ZipFile(BASE, 'r')
    shared = read_shared_strings(z)
    sheets = list_sheets_with_paths(z)
    print('Arquivo:', BASE)
    print('Abas encontradas:', [name for name,_ in sheets])
    total_objs = 0
    for name, path in sheets:
        raw_count, objs = read_sheet_objects(z, path, shared)
        total_objs += len(objs)
        print(f"Aba {name}: linhas brutas={raw_count}, objetos={len(objs)}")
    print('TOTAL objetos (todas as abas):', total_objs)

if __name__ == '__main__':
    main()

