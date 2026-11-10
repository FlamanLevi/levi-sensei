import os, re

NEW_ASSETS_DIR = os.path.join("new_assets", "letstry_images")

uppers = [f'dic_3_card_{chr(c)}_{2068 + (c - 97)}_1_c.svg' for c in range(97, 123)]
lowers = [f'dic_4_card_{chr(c)}_{2551 + (c - 97)}_1_c.svg' for c in range(97, 123)]

def check_card(fname, is_g3):
    p = os.path.join(NEW_ASSETS_DIR, fname)
    with open(p, 'r', encoding='utf-8') as fp:
        c = fp.read()
    
    # Find all paths with cyan/blue baseline colors
    paths = re.findall(r'<path[^>]+>', c)
    baseline_paths = []
    for pt in paths:
        fill_m = re.search(r'fill="([^"]+)"', pt)
        if not fill_m:
            continue
        color = fill_m.group(1).strip('#')
        if len(color) == 6:
            r = int(color[0:2], 16)
            g = int(color[2:4], 16)
            b = int(color[4:6], 16)
            # Cyan baseline: high blue, high green, moderate red
            if b > 175 and g > 140 and r < 200:
                trans = re.search(r'transform="translate\(([^,]+),\s*([^)]+)\)"', pt)
                d_str = re.search(r'd="([^"]+)"', pt).group(1)
                baseline_paths.append((pt, trans, d_str))
    
    expected_w = 690 if is_g3 else 603
    status = "OK"
    if not baseline_paths:
        status = "NO BASELINE PATH"
    else:
        # Check if any path covers the full width
        full_width_found = False
        for pt, trans, d_str in baseline_paths:
            if trans:
                tx = float(trans.group(1))
                ty = float(trans.group(2))
            else:
                tx, ty = 0, 0
            
            # Find max X coordinate in path d
            nums = [float(n) for n in re.findall(r'[-+]?\d*\.?\d+', d_str)]
            # If path was injected: d has expected_w (690 or 603)
            # or if VTracer traced it: tx is small (<50) and width is > 550
            if f"{expected_w}" in d_str or (tx < 50 and any(n > (expected_w - 50) for n in nums)):
                full_width_found = True
                break
        if not full_width_found:
            status = f"FRAGMENTED (tx={tx}, ty={ty})"
            
    print(f"{fname} -> {status}")
    return status

print("=== GRADE 3 UPPERCASE ===")
g3_results = {f: check_card(f, True) for f in uppers}
print("\n=== GRADE 4 LOWERCASE ===")
g4_results = {f: check_card(f, False) for f in lowers}

g3_bad = [f for f, s in g3_results.items() if s != "OK"]
g4_bad = [f for f, s in g4_results.items() if s != "OK"]
print(f"\nProblematic G3 cards ({len(g3_bad)}): {g3_bad}")
print(f"Problematic G4 cards ({len(g4_bad)}): {g4_bad}")
