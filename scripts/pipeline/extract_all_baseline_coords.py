import os, re

NEW_ASSETS_DIR = os.path.join("new_assets", "letstry_images")

uppers = [(chr(c).upper(), f'dic_3_card_{chr(c)}_{2068 + (c - 97)}_1_c.svg') for c in range(97, 123)]
lowers = [(chr(c), f'dic_4_card_{chr(c)}_{2551 + (c - 97)}_1_c.svg') for c in range(97, 123)]

def analyze(cards, is_g3):
    print(f"\n{'='*20} {'GRADE 3 (UPPERCASE)' if is_g3 else 'GRADE 4 (LOWERCASE)'} {'='*20}")
    for letter, fname in cards:
        p = os.path.join(NEW_ASSETS_DIR, fname)
        with open(p, 'r', encoding='utf-8') as fp:
            content = fp.read()
        vb_m = re.search(r'viewBox="([^"]+)"', content)
        vb = [float(x) for x in vb_m.group(1).split()] if vb_m else []
        
        # Find cyan paths
        paths = re.findall(r'<path[^>]+>', content)
        cyan_y = []
        for pt in paths:
            fill_m = re.search(r'fill="([^"]+)"', pt)
            if not fill_m: continue
            col = fill_m.group(1).strip('#')
            if len(col) == 6:
                try:
                    r, g, b = int(col[0:2], 16), int(col[2:4], 16), int(col[4:6], 16)
                    if b > 160 and g > 130 and r < 210:
                        trans_m = re.search(r'transform="translate\(([^,]+),\s*([^)]+)\)"', pt)
                        if trans_m:
                            cyan_y.append((float(trans_m.group(1)), float(trans_m.group(2))))
                except:
                    pass
        print(f"{letter}: vb={vb} cyan_transforms={cyan_y}")

analyze(uppers, True)
analyze(lowers, False)
