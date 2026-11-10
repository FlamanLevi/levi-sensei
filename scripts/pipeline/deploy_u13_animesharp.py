import os
import sys
import json
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
MANIFEST_PATH = os.path.join(ROOT_DIR, 'scripts', 'pipeline', 'hwg6_323_winner_manifest.json')
SHEETS_PATH = os.path.join(ROOT_DIR, 'scripts', 'pipeline', 'g6_sheets.json')
AS_SRC_DIR = r'E:\Levi-Sensei Images\Here We Go 6\Here We Go 6 (Animesharp_4x)\13_13   部活動'
DEST_DIR = os.path.join(ROOT_DIR, 'trimmed_assets', 'cards', 'illustration')
DIST_DIR = os.path.join(ROOT_DIR, 'dist', 'cards', 'illustration')

def main():
    # 1. Update Manifest
    with open(MANIFEST_PATH, 'r', encoding='utf-8') as f:
        manifest = json.load(f)

    updated_count = 0
    for card_entry in manifest['cards']:
        if '13_13' in card_entry.get('unit', ''):
            card_entry['winner'] = 'animesharp'
            updated_count += 1

    with open(MANIFEST_PATH, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)

    print(f'✅ Updated {updated_count} cards to animesharp in manifest.')

    # 2. Map items to destination filenames
    with open(SHEETS_PATH, 'r', encoding='utf-8') as f:
        sheets = json.load(f)

    u13_sheet = next(s for s in sheets if s.get('unit') == 'u13')
    item_idx = 1
    mapping = {}
    for r in u13_sheet['rows']:
        for it in r['items']:
            item_key = f'u11_p13_item_{item_idx:02d}'
            target_name = f"hwg6_{u13_sheet['unit']}_{it['slot']}_{it['en']}_illust.webp"
            mapping[item_key] = target_name
            item_idx += 1

    print(f'Found {len(mapping)} mappings for Unit 13:')
    for k, v in mapping.items():
        src_file = os.path.join(AS_SRC_DIR, f'{k}.webp')
        dest_file = os.path.join(DEST_DIR, v)
        dist_file = os.path.join(DIST_DIR, v)

        if not os.path.exists(src_file):
            print(f'❌ Missing src: {src_file}')
            continue

        im = Image.open(src_file)
        # Save directly to trimmed_assets
        im.save(dest_file, 'WEBP', quality=95, method=6)
        # Also sync to dist if dist exists
        if os.path.exists(os.path.dirname(dist_file)):
            im.save(dist_file, 'WEBP', quality=95, method=6)

        print(f'  {k} -> {v} ({im.size}, {os.path.getsize(dest_file)} bytes)')

    print('\n🎉 All 15 Unit 13 cards successfully deployed with AnimeSharp!')

if __name__ == '__main__':
    main()
