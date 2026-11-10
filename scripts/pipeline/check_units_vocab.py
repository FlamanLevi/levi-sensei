import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('public/data/master_vocabulary.json', 'r', encoding='utf-8') as f:
    vocab = json.load(f)

for u_name in ['Unit 5', 'Unit 7', 'Unit 12']:
    print(f"=== {u_name} in master_vocabulary.json ===")
    matches = [w for w in vocab if 'ES_G6' in w.get('media_by_grade', {}) and u_name.lower() in w.get('media_by_grade', {}).get('ES_G6', {}).get('unit', '').lower()]
    for m in matches:
        mbg = m['media_by_grade']['ES_G6']
        print(f"   {m['english']}: card_image={mbg.get('card_image')}")
