import os, re

for fname in ['dic_3_card_a_2068_1_c.svg', 'dic_4_card_a_2551_1_c.svg', 'dic_4_card_g_2557_1_c.svg', 'dic_4_card_x_2574_1_c.svg']:
    p = os.path.join("new_assets", "letstry_images", fname)
    with open(p, 'r', encoding='utf-8') as fp:
        c = fp.read()
    print(f"=== {fname} ===")
    vb = re.search(r'viewBox="([^"]+)"', c)
    print("viewBox:", vb.group(1) if vb else "none")
    paths = re.findall(r'<path[^>]+>', c)
    for pt in paths:
        fill = re.search(r'fill="([^"]+)"', pt).group(1)
        if any(h in fill.upper() for h in ['43BAE2', '42BAE2', '43B9E1', '31ACDB']):
            trans = re.search(r'transform="([^"]+)"', pt)
            print("  Baseline path tag:", pt[:120], "...", pt[-40:])
