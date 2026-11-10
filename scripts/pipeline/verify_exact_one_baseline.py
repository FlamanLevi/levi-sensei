import os, sys, re

sys.stdout.reconfigure(encoding='utf-8')
NEW_ASSETS_DIR = os.path.join("new_assets", "letstry_images")

uppers = [f'dic_3_card_{chr(c)}_{2068 + (c - 97)}_1_c.svg' for c in range(97, 123)]
lowers = [f'dic_4_card_{chr(c)}_{2551 + (c - 97)}_1_c.svg' for c in range(97, 123)]

all_ok = True
for fname in uppers + lowers:
    p = os.path.join(NEW_ASSETS_DIR, fname)
    with open(p, 'r', encoding='utf-8') as fp:
        c = fp.read()
    cyans = [pt for pt in re.findall(r'<path[^>]+>', c) if ('#43BAE2' in pt or '#42BAE2' in pt)]
    if len(cyans) != 1:
        print(f"ANOMALY: {fname} has {len(cyans)} baseline paths!")
        all_ok = False

if all_ok:
    print("SUCCESS: Every single one of the 52 letter SVGs contains EXACTLY ONE clean baseline path!")
