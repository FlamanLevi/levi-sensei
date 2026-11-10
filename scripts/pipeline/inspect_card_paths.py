import os, re

def inspect_file(fname):
    p = os.path.join("new_assets", "letstry_images", fname)
    if not os.path.exists(p):
        print("Not found:", p)
        return
    with open(p, 'r', encoding='utf-8') as fp:
        c = fp.read()
    vb = re.search(r'viewBox="([^"]+)"', c)
    print(f"=== {fname} (viewBox={vb.group(1) if vb else 'none'}) ===")
    paths = re.findall(r'<path[^>]+>', c)
    for i, pt in enumerate(paths):
        fill_m = re.search(r'fill="([^"]+)"', pt)
        fill = fill_m.group(1) if fill_m else "no-fill"
        trans_m = re.search(r'transform="([^"]+)"', pt)
        trans = trans_m.group(1) if trans_m else "no-trans"
        d_m = re.search(r'd="([^"]+)"', pt)
        d_str = d_m.group(1) if d_m else ""
        # Check if cyan/blue
        is_cyan = False
        color = fill.strip('#')
        if len(color) == 6:
            try:
                r = int(color[0:2], 16)
                g = int(color[2:4], 16)
                b = int(color[4:6], 16)
                if b > 160 and g > 130 and r < 210:
                    is_cyan = True
            except:
                pass
        if is_cyan:
            print(f"  [{i}] CYAN fill={fill} trans={trans} len(d)={len(d_str)} snippet: {pt[:100]}...")

inspect_file("dic_4_card_g_2557_1_c.svg")
inspect_file("dic_4_card_b_2552_1_c.svg")
inspect_file("dic_3_card_c_2070_1_c.svg")
inspect_file("dic_4_card_a_2551_1_c.svg")
