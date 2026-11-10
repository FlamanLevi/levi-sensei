import os, re

NEW_ASSETS_DIR = os.path.join("new_assets", "letstry_images")

for name in ['dic_3_card_c_2070_1_c.svg', 'dic_4_card_c_2553_1_c.svg', 'dic_3_card_g_2074_1_c.svg', 'dic_3_card_p_2083_1_c.svg']:
    p = os.path.join(NEW_ASSETS_DIR, name)
    with open(p, 'r', encoding='utf-8') as fp:
        c = fp.read()
    print(f"=== {name} ===")
    paths = re.findall(r'<path[^>]+>', c)
    for p_tag in paths:
        fill_m = re.search(r'fill="([^"]+)"', p_tag)
        fill = fill_m.group(1) if fill_m else "none"
        trans_m = re.search(r'transform="([^"]+)"', p_tag)
        trans = trans_m.group(1) if trans_m else "none"
        d_len = len(re.search(r'd="([^"]+)"', p_tag).group(1))
        print(f"  path fill={fill} transform={trans} d_len={d_len}")
