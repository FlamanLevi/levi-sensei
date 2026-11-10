import os, re

NEW_ASSETS_DIR = os.path.join("new_assets", "letstry_images")
lowers = [f'dic_4_card_{chr(c)}_{2551 + (c - 97)}_1_c.svg' for c in range(97, 123)]

print("Letter | SVG WxH | ViewBox | Existing Cyan Path Coordinates")
print("-" * 65)

for f in lowers:
    p = os.path.join(NEW_ASSETS_DIR, f)
    with open(p, 'r', encoding='utf-8') as fp:
        c = fp.read()
    
    char = f.split('_')[3]
    w_m = re.search(r'width="([^"]+)"', c)
    h_m = re.search(r'height="([^"]+)"', c)
    vb = re.search(r'viewBox="([^"]+)"', c)
    
    paths = re.findall(r'<path[^>]+>', c)
    cyan_info = []
    for pt in paths:
        fill_m = re.search(r'fill="([^"]+)"', pt)
        if not fill_m: continue
        color = fill_m.group(1).strip('#')
        if len(color) == 6:
            r = int(color[0:2], 16)
            g = int(color[2:4], 16)
            b = int(color[4:6], 16)
            if b > 175 and g > 140 and r < 200:
                trans = re.search(r'transform="translate\(([^,]+),\s*([^)]+)\)"', pt)
                d_str = re.search(r'd="([^"]+)"', pt).group(1)
                tx = trans.group(1) if trans else "0"
                ty = trans.group(2) if trans else "0"
                cyan_info.append(f"color={fill_m.group(1)}, tx={tx}, ty={ty}, len={len(d_str)}")
    
    print(f"{char:>3}    | {w_m.group(1) if w_m else '?'}x{h_m.group(1) if h_m else '?'} | {vb.group(1) if vb else '?'} | {'; '.join(cyan_info)}")
