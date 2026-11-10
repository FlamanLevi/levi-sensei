import json
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

with open(r'public\media\bgm\sound_packs.json', encoding='utf-8') as f:
    packs = json.load(f)

import re

sensitive_words = [
    'yakuza', 'massacre', 'slave', '奴隷', 'lust', 'chaos', 'casino', 'devil', 'teufel', 
    'villain', 'stab', 'gun', 'kill', 'killer', 'blood', 'crime', 'corrupt', 'drunk', 'death', 'die', 'murder', 'war'
]

flagged = []
for pack_id, pack in packs.items():
    print(f"=== Sound Pack: {pack_id} ({pack['name']}) ===")
    for t in pack['tracks']:
        text = f"{pack_id} {t['title']} {t['filename']} {t['url']}".lower()
        matched = []
        for w in sensitive_words:
            if re.search(r'(?<![a-zA-Z])' + re.escape(w) + r'(?![a-zA-Z])', text):
                matched.append(w)
        if matched:
            print(f"  ⚠️ FLAGGED [{', '.join(matched)}]: {t['id']} | Title: '{t['title']}' | File: '{t['filename']}'")
            flagged.append((pack_id, t['id'], t['title'], t['filename'], matched))

print(f"\n✅ Total true sensitive items flagged: {len(flagged)}")
