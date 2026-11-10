import json
import sys
from collections import defaultdict

sys.stdout.reconfigure(encoding='utf-8')

with open('scripts/g6_cards_manifest.json', 'r', encoding='utf-8') as f:
    g6_cards = json.load(f)

with open('scripts/pipeline/hwg6_323_winner_manifest.json', 'r', encoding='utf-8') as f:
    winner_manifest = json.load(f)

winner_by_unit = defaultdict(list)
for c in winner_manifest['cards']:
    winner_by_unit[c['unit']].append(c)

print(f"{'Unit in G6 Manifest':<22} | {'G6 Manifest':<12} | {'Winner Folder':<25} | {'Winner Count':<12}")
print('-' * 80)

unit_map = {
    '01_1   国': 'u01',
    '02_2   得意なことなど': 'u02',
    '03_3   季節': 'u03',
    '04_4   月、日にち': 'u04',
    '05_5   季節の行事': 'u05',
    '06_6   動作など': 'u06',
    '07_7   いつ、どのくらい': 'u07',
    '08_8   1日の生活': 'u08',
    '09_9   町': 'u09',
    '10_10   自然': 'u10',
    '11_11   生き物': 'u11',
    '12_12   体': 'u12',
    '13_13   部活動': 'u13',
    '14_14   教科': 'u14',
    '15_15   職業': 'u15',
    '16_16   学校行事': 'u16',
    '18_17   様子など': 'u17',
    '19_18   感想など': 'u18',
}

for wfld, ukey in unit_map.items():
    g6_cnt = len(g6_cards.get(ukey, []))
    w_cnt = len(winner_by_unit[wfld])
    diff = '' if g6_cnt == w_cnt else f'*** DIFF ({g6_cnt} vs {w_cnt}) ***'
    print(f"{ukey:<22} | {g6_cnt:<12} | {wfld:<25} | {w_cnt:<12} {diff}")

if 'u19' in g6_cards:
    print(f"{'u19 (Numbers)':<22} | {len(g6_cards['u19']):<12} | {'Not in winner manifest':<25} | 0")
