import os, re

p = os.path.join("new_assets", "letstry_images", "dic_4_card_g_2557_1_c.svg")
with open(p, 'r', encoding='utf-8') as fp:
    content = fp.read()

paths = re.findall(r'<path[^>]+>', content)
print(f"Total paths in g: {len(paths)}")
for i, pt in enumerate(paths):
    fill_m = re.search(r'fill="([^"]+)"', pt)
    trans_m = re.search(r'transform="([^"]+)"', pt)
    print(f"Path {i}: fill={fill_m.group(1) if fill_m else None} trans={trans_m.group(1) if trans_m else None}")
    print("   ", pt[:150])
