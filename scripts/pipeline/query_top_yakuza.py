import sys
import csv

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

with open('reports/bgm_candidates_analysis.csv', encoding='utf-8') as f:
    rows = list(csv.DictReader(f))

keywords = ['receive', 'kuze', 'pledge', 'fly', 'faith', 'friday', 'disco', 'cinderella', 'reign', 'dragon', 'clash', 'speed', 'rush', 'beast', 'judgement', 'fever']

print("--- FAMOUS YAKUZA TRACKS IN YOUR LIBRARY ---")
seen = set()
count = 0
for r in rows:
    title_lower = r['title'].lower()
    if any(k in title_lower for k in keywords) and r['title'] not in seen:
        seen.add(r['title'])
        score = int(float(r['score']))
        bpm = float(r['bpm'])
        intro = float(r['intro_punch'])
        print(f"{r['title'][:34]:<34} | {r['album'][:20]:<20} | Score: {score:3d}/100 | BPM: {bpm:5.1f} | Intro: {intro:.2f}s | {r['category']}")
        count += 1
        if count >= 30:
            break
