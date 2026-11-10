import os, re

NEW_ASSETS_DIR = os.path.join("new_assets", "letstry_images")

uppers = [(chr(c).upper(), chr(c), f'dic_3_card_{chr(c)}_{2068 + (c - 97)}_1_c.svg') for c in range(97, 123)]
lowers = [(chr(c), chr(c), f'dic_4_card_{chr(c)}_{2551 + (c - 97)}_1_c.svg') for c in range(97, 123)]

def inspect_set(cards, is_g3):
    print(f"\n{'='*30} {'GRADE 3' if is_g3 else 'GRADE 4'} {'='*30}")
    for letter, lchar, fname in cards:
        p = os.path.join(NEW_ASSETS_DIR, fname)
        if not os.path.exists(p):
            print(f"{letter}: FILE NOT FOUND ({fname})")
            continue
        with open(p, 'r', encoding='utf-8') as fp:
            content = fp.read()
        
        vb_m = re.search(r'viewBox="([^"]+)"', content)
        vb = vb_m.group(1) if vb_m else "no-vb"
        w_m = re.search(r'<svg[^>]+width="([^"]+)"', content)
        h_m = re.search(r'<svg[^>]+height="([^"]+)"', content)
        svg_w = w_m.group(1) if w_m else "no-w"
        svg_h = h_m.group(1) if h_m else "no-h"
        
        paths = re.findall(r'<path[^>]+>', content)
        cyans = []
        for i, pt in enumerate(paths):
            fill_m = re.search(r'fill="([^"]+)"', pt)
            fill = fill_m.group(1) if fill_m else ""
            color = fill.strip('#')
            if len(color) == 6:
                try:
                    r = int(color[0:2], 16)
                    g = int(color[2:4], 16)
                    b = int(color[4:6], 16)
                    if b > 160 and g > 130 and r < 210:
                        trans_m = re.search(r'transform="([^"]+)"', pt)
                        trans = trans_m.group(1) if trans_m else "none"
                        d_m = re.search(r'd="([^"]+)"', pt)
                        d_str = d_m.group(1) if d_m else ""
                        cyans.append((i, fill, trans, len(d_str), d_str[:60]))
                except:
                    pass
        
        print(f"{letter} ({fname}): size={svg_w}x{svg_h} vb=[{vb}] total_paths={len(paths)} cyan_paths={len(cyans)}")
        for i, fill, trans, dlen, d_snippet in cyans:
            print(f"    cyan #{i}: fill={fill} trans={trans} len={dlen} :: {d_snippet}")

inspect_set(uppers, True)
inspect_set(lowers, False)
