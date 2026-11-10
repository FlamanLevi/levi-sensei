import json
import sys

sys.stdout.reconfigure(encoding='utf-8')
with open('public/data/master_vocabulary.json', 'r', encoding='utf-8') as f:
    vocab = json.load(f)

for w in vocab:
    if w['english'] in ['April', 'Friday', 'English', 'summer']:
        print(f"Word: {w['english']}")
        print('   ES_G5:', w.get('media_by_grade', {}).get('ES_G5'))
        print('   ES_G6:', w.get('media_by_grade', {}).get('ES_G6'))
