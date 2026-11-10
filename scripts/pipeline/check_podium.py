import csv
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

print("=== YAKUZA PODIUM CANDIDATES ===")
with open('reports/bgm_yakuza_analysis.csv', encoding='utf-8') as f:
    for r in csv.DictReader(f):
        t = r['title'].lower()
        if any(k in t for k in ['result', 'win', 'clear', 'ending', 'fanfare', 'ceremony', 'triumph', 'finish']):
            print(f"{r['title']} | Score: {r['score']} | BPM: {r['bpm']} | Intro: {r['intro_punch']}")
