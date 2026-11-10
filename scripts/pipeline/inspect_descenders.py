import os, re

for fname in ['dic_4_card_p_2566_1_c.svg', 'dic_4_card_q_2567_1_c.svg', 'dic_4_card_y_2575_1_c.svg', 'dic_4_card_j_2560_1_c.svg']:
    p = os.path.join("new_assets", "letstry_images", fname)
    with open(p, 'r', encoding='utf-8') as fp:
        c = fp.read()
    vb = re.search(r'viewBox="([^"]+)"', c).group(1)
    print(f"=== {fname} vb={vb} ===")
    for pt in re.findall(r'<path[^>]+>', c):
        if any(h in pt for h in ['fill="#3', 'fill="#4', 'fill="#2']):
            trans = re.search(r'transform="([^"]+)"', pt)
            fill = re.search(r'fill="([^"]+)"', pt)
            print(f"  fill={fill.group(1) if fill else None} trans={trans.group(1) if trans else None} snippet={pt[:100]}")
