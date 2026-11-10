import os, re

NEW_ASSETS_DIR = os.path.join("new_assets", "letstry_images")

uppers = [f'dic_3_card_{chr(c)}_{2068 + (c - 97)}_1_c.svg' for c in range(97, 123)]
lowers = [f'dic_4_card_{chr(c)}_{2551 + (c - 97)}_1_c.svg' for c in range(97, 123)]

def check_fills(fnames):
    letter_colors = set()
    for fname in fnames:
        p = os.path.join(NEW_ASSETS_DIR, fname)
        with open(p, 'r', encoding='utf-8') as fp:
            c = fp.read()
        paths = re.findall(r'<path[^>]+>', c)
        for pt in paths:
            fill_m = re.search(r'fill="([^"]+)"', pt)
            if fill_m:
                col = fill_m.group(1).upper()
                if col not in ['#FFFFFF', '#FEFEFE', '#FDFDFD']:
                    letter_colors.add(col)
    return letter_colors

print("G3 colors:", sorted(check_fills(uppers)))
print("G4 colors:", sorted(check_fills(lowers)))
