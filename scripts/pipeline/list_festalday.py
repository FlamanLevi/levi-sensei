import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('public/data/master_vocabulary.json', 'r', encoding='utf-8') as f:
    vocab = json.load(f)

for w in vocab:
    if w.get('category') == '15_festalday':
        en = w.get('english', '')
        kanji = w.get('ja_kanji', '')
        grades = w.get('grades', [])
        mbg = w.get('media_by_grade', {})
        print(f"{en:25s} | {kanji:15s} | {grades} | G6={mbg.get('ES_G6', {}).get('card_image')}")
