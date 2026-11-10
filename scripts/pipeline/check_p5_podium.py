import csv
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

with open('reports/bgm_master_analysis.csv', encoding='utf-8') as f:
    for r in csv.DictReader(f):
        if r['franchise'] == 'Persona 5':
            t = r['title'].lower()
            if any(k in t for k in ['vic', 'tri', 'clear', 'end', 'result', 'win', 'fanfare']):
                print(r['title'], '|', r['score'], '|', r['bpm'], '|', r['duration'], '|', r['category'])
