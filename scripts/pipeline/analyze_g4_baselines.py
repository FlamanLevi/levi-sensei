import os, re
from PIL import Image

NEW_ASSETS_DIR = os.path.join("new_assets", "letstry_images")
CROP_DIR = r"E:\Levi-Sensei Images\Let's Try (Grade 3 & 4)\Let's Try (Cropped)"

lowers = [(chr(c), f'dic_4_card_{chr(c)}_{2551 + (c - 97)}_1_c') for c in range(97, 123)]

print(f"{'Letter':<6} {'SVG VB':<18} {'SVG Size':<12} {'Cyan trans':<35}")
for letter, base in lowers:
    svg_p = os.path.join(NEW_ASSETS_DIR, base + ".svg")
    with open(svg_p, 'r', encoding='utf-8') as fp:
        c = fp.read()
    vb_m = re.search(r'viewBox="([^"]+)"', c)
    vb = vb_m.group(1) if vb_m else ""
    
    paths = re.findall(r'<path[^>]+>', c)
    cyan_trans = []
    for pt in paths:
        fill_m = re.search(r'fill="([^"]+)"', pt)
        if fill_m:
            col = fill_m.group(1).strip('#')
            if len(col) == 6:
                try:
                    r, g, b = int(col[0:2], 16), int(col[2:4], 16), int(col[4:6], 16)
                    if b > 160 and g > 130 and r < 210:
                        trans_m = re.search(r'transform="([^"]+)"', pt)
                        cyan_trans.append(trans_m.group(1) if trans_m else "no-trans")
                except:
                    pass
    print(f"{letter:<6} {vb:<18} {len(paths)} paths    {', '.join(cyan_trans)}")
