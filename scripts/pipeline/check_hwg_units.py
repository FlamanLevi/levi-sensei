import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open(r'D:\Users\levif\Downloads\vocabulary.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

for g in ['grade5', 'grade6']:
    if g in data:
        print(f'=== {g} ===')
        for u_name, words in data[g].items():
            sample = [w['en'] for w in words[:4]]
            print(f'  {u_name}: {len(words)} words -> {sample}')
