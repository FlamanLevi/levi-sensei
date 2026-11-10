import json
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('scripts/pipeline/g6_sheets.json', 'r', encoding='utf-8') as f:
    sheets = json.load(f)

existing_illust = set(os.listdir('trimmed_assets/cards/illustration'))

mapped_targets = {}
for s in sheets:
    base_file = s['file'].replace('.png', '')
    item_idx = 1
    if 'rows' in s:
        for r in s['rows']:
            for it in r['items']:
                item_key = f"{base_file}_item_{item_idx:02d}"
                target_name = f"hwg6_{s['unit']}_{it['slot']}_{it['en']}_illust.webp"
                png_name = f"hwg6_{s['unit']}_{it['slot']}_{it['en']}_illust.png"
                mapped_targets[item_key] = {
                    'unit': s['unit'],
                    'slot': it['slot'],
                    'en': it['en'],
                    'target_webp': target_name,
                    'exists_png': png_name in existing_illust,
                    'file': s['file']
                }
                item_idx += 1
    elif 'items' in s and s['unit'] != 'u19':
        for it in s['items']:
            item_key = f"{base_file}_item_{item_idx:02d}"
            target_name = f"hwg6_{s['unit']}_{it['slot']}_{it['en']}_illust.webp"
            png_name = f"hwg6_{s['unit']}_{it['slot']}_{it['en']}_illust.png"
            mapped_targets[item_key] = {
                'unit': s['unit'],
                'slot': it['slot'],
                'en': it['en'],
                'target_webp': target_name,
                'exists_png': png_name in existing_illust,
                'file': s['file']
            }
            item_idx += 1

print('Total mapped targets from sheets (excluding numbers):', len(mapped_targets))
with open('scripts/pipeline/hwg6_323_winner_manifest.json', 'r', encoding='utf-8') as f:
    winner_manifest = json.load(f)

matched = []
unmatched = []
for c in winner_manifest['cards']:
    ckey = c['card']
    if ckey in mapped_targets:
        matched.append((c, mapped_targets[ckey]))
    else:
        unmatched.append(c)

print(f"Matched: {len(matched)} / 323")
print(f"Unmatched: {len(unmatched)}")
if unmatched:
    for u in unmatched:
        print(f"  Unmatched: {u['unit']} {u['card']}")
