import csv
import sys
from tabulate import tabulate

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

with open('reports/bgm_master_analysis.csv', encoding='utf-8') as f:
    rows = list(csv.DictReader(f))

# Define target quotas per sound pack
quotas = {
    'Initial D': [
        ('☕ Lobby (1-2)', '☕', 2),
        ('⚡ Quiz & Blitz (3-5)', '⚡', 4),
        ('🏎️ Sprint Race (3-5)', '🏎️', 5),
        ('🔥 Raid Boss (3-5)', '🔥', 5),
        ('🏆 Podium & Awards (1-2)', '🏆', 2)
    ],
    'Persona 5': [
        ('☕ Lobby (1-2)', '☕', 2),
        ('🎷 Quiz & Groove (3-5)', '🎷', 5),
        ('🏎️ Sprint Race (3-5)', '🏎️', 4),
        ('🔥 Raid Boss (3-5)', '🔥', 4),
        ('🏆 Podium & Awards (1-2)', '🏆', 2)
    ],
    'Wangan Midnight': [
        ('☕ Lobby (1-2)', '☕', 2),
        ('⚡ Quiz & Blitz (3-5)', '⚡', 5),
        ('🏎️ Sprint Race (3-5)', '🏎️', 5),
        ('🔥 Raid Boss (3-5)', '🔥', 3),
        ('🏆 Podium & Awards (1-2)', '🏆', 2)
    ],
    'Yakuza / Like a Dragon': [
        ('☕ Lobby (1-2)', '☕', 2),
        ('🎷 Quiz & Groove (3-5)', '🎷', 5),
        ('🏎️ Sprint Race (3-5)', '🏎️', 5),
        ('🔥 Raid Boss (3-5)', '🔥', 5),
        ('🏆 Podium & Awards (1-2)', '🏆', 2)
    ]
}

total_roster = 0
for franchise, slots in quotas.items():
    print("=" * 95)
    print(f"🎵 SOUND PACK: {franchise.upper()}")
    print("=" * 95)
    f_rows = [r for r in rows if r['franchise'] == franchise and float(r['score']) >= 75]
    pack_count = 0
    for slot_name, prefix, limit in slots:
        matches = [r for r in f_rows if r['category'].startswith(prefix)]
        top = matches[:limit]
        pack_count += len(top)
        total_roster += len(top)
        print(f"\n▶ {slot_name} ({len(top)}/{limit} tracks):")
        table = [
            [t['title'][:34], f"{t['bpm']} BPM", t['duration'], f"{t['intro_punch']}s", f"{t['score']}/100"]
            for t in top
        ]
        print(tabulate(table, headers=['Title', 'BPM', 'Duration', 'Intro', 'Score'], tablefmt='github'))
    print(f"\n📦 Subtotal for {franchise}: {pack_count} tracks\n")

print("=" * 95)
print(f"🎉 GRAND TOTAL ROSTER ACROSS ALL 4 PACKS: {total_roster} CURATED TRACKS")
print("=" * 95)
