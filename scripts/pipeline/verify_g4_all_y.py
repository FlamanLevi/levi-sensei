import os, re

NEW_ASSETS_DIR = os.path.join("new_assets", "letstry_images")

lowers = [(chr(c), f'dic_4_card_{chr(c)}_{2551 + (c - 97)}_1_c.svg') for c in range(97, 123)]

# For each letter, let's see:
# If it has an existing clean full-width baseline, what is its Y?
# If it has a fragmented baseline, what was the actual baseline Y?
for char, fname in lowers:
    p = os.path.join(NEW_ASSETS_DIR, fname)
    with open(p, 'r', encoding='utf-8') as fp:
        c = fp.read()
    vb = [float(x) for x in re.search(r'viewBox="([^"]+)"', c).group(1).split()]
    paths = re.findall(r'<path[^>]+>', c)
    cyan_info = []
    for pt in paths:
        fill_m = re.search(r'fill="([^"]+)"', pt)
        if not fill_m: continue
        col = fill_m.group(1).strip('#')
        if len(col) == 6:
            try:
                r, g, b = int(col[0:2], 16), int(col[2:4], 16), int(col[4:6], 16)
                if b > 160 and g > 130 and r < 210:
                    trans_m = re.search(r'transform="translate\(([^,]+),\s*([^)]+)\)"', pt)
                    d_m = re.search(r'd="([^"]+)"', pt)
                    if trans_m and d_m:
                        tx, ty = float(trans_m.group(1)), float(trans_m.group(2))
                        d_str = d_m.group(1)
                        cyan_info.append((tx, ty, d_str[:50]))
            except:
                pass
    print(f"{char}: vb={vb} -> cyan: {cyan_info}")
