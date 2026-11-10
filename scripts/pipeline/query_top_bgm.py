import csv
import sys
from tabulate import tabulate

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

with open('reports/bgm_master_analysis.csv', encoding='utf-8') as f:
    rows = list(csv.DictReader(f))

categories = [
    ('🔥 Boss Battle / Raid', 'Classroom Raid Boss (140-160 BPM)'),
    ('🏎️ High-Speed Rush', 'F1 Sprint Race & Baton Relay (138-165 BPM)'),
    ('⚡ Blitz & Tension', 'Timed Blitz 1-5 Min & Bomb Defusal (130-148 BPM)'),
    ('🎷 Tactical Groove', 'MCQ Arena, Volleyball & Gold Rush (118-132 BPM | Instrumental)'),
    ('☕ Lobby & Waiting Room', 'Classroom Lobby, iPad Linking & Menu (100-136 BPM)'),
    ('🏆 Victory Podium', 'Podium Awards & Ceremony')
]

for cat_prefix, desc in categories:
    matches = [r for r in rows if r['category'].startswith(cat_prefix) and float(r['score']) >= 80]
    print(f"=== {cat_prefix}: {desc} ({len(matches)} tracks score >= 80) ===")
    table = [
        [r['title'][:32], r['franchise'][:18], r['bpm'], f"{float(r['intro_punch']):.2f}s", r['duration'], f"{r['score']}/100"]
        for r in matches[:8]
    ]
    print(tabulate(table, headers=['Title', 'Franchise', 'BPM', 'Intro', 'Dur', 'Score'], tablefmt='github'))
    print()

print("=== TOP YAKUZA TRACKS IN CONSOLIDATED DATASET ===")
yakuza_top = [r for r in rows if r['franchise'] == 'Yakuza / Like a Dragon' and float(r['score']) >= 85][:10]
y_table = [
    [r['title'][:32], r['category'][:24], r['bpm'], f"{float(r['intro_punch']):.2f}s", r['duration'], f"{r['score']}/100"]
    for r in yakuza_top
]
print(tabulate(y_table, headers=['Title', 'Category', 'BPM', 'Intro', 'Dur', 'Score'], tablefmt='github'))
print()

print("=== TOP PODIUM & AWARD TRACKS ACROSS ALL FRANCHISES ===")
podium_tracks = [r for r in rows if r['category'].startswith('🏆')]
print(f"Total podium tracks found: {len(podium_tracks)}")
p_table = [
    [r['title'][:32], r['franchise'][:18], r['bpm'], f"{float(r['intro_punch']):.2f}s", r['duration'], f"{r['score']}/100"]
    for r in sorted(podium_tracks, key=lambda x: float(x['score']), reverse=True)[:10]
]
print(tabulate(p_table, headers=['Title', 'Franchise', 'BPM', 'Intro', 'Dur', 'Score'], tablefmt='github'))
