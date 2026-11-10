import os, re

NEW_ASSETS_DIR = os.path.join("new_assets", "letstry_images")

uppers = [f'dic_3_card_{chr(c)}_{2068 + (c - 97)}_1_c.svg' for c in range(97, 123)]
lowers = [f'dic_4_card_{chr(c)}_{2551 + (c - 97)}_1_c.svg' for c in range(97, 123)]

for label, lst in [("Grade 3 Uppercase", uppers), ("Grade 4 Lowercase", lowers)]:
    print(f"\n=== {label} ===")
    for f in lst:
        p = os.path.join(NEW_ASSETS_DIR, f)
        if not os.path.exists(p):
            print(f"{f}: FILE MISSING")
            continue
        with open(p, 'r', encoding='utf-8') as fp:
            c = fp.read()
        
        # Check viewBox
        vb = re.search(r'viewBox="([^"]+)"', c)
        w_m = re.search(r'width="([^"]+)"', c)
        h_m = re.search(r'height="([^"]+)"', c)
        
        # Check all fill colors
        fills = set(re.findall(r'fill="([^"]+)"', c))
        # Find any blue or cyan fill
        blue_fills = []
        for color in fills:
            cl = color.strip('#')
            if len(cl) == 6:
                r = int(cl[0:2], 16)
                g = int(cl[2:4], 16)
                b = int(cl[4:6], 16)
                # Cyan baseline is roughly #42BAE2 (r~66, g~186, b~226)
                if b > 180 and g > 150:
                    blue_fills.append(color)
        
        print(f"{f} -> viewBox: {vb.group(1) if vb else (w_m.group(1) + 'x' + h_m.group(1))} | Cyan baseline fills: {blue_fills}")
