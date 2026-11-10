import os
import sys
import cv2
import numpy as np
import re

sys.stdout.reconfigure(encoding='utf-8')

BASE_E = "E:/Levi-Sensei Images/Let's Try (Grade 3 & 4)"
ORIG_DIR = os.path.join(BASE_E, "Let's Try (Originals)")
CROP_DIR = os.path.join(BASE_E, "Let's Try (Cropped)")
CUG_DIR = os.path.join(BASE_E, "Let's Try (Realcugan_4x)")
VEC_DIR = os.path.join(BASE_E, "Let's Try (Vector)")

print("=" * 100)
print("🔍 DIAGNOSING ALPHABET ANOMALIES (Line disappearance, I/Y borders, and x shading)")
print("=" * 100)

# Check 1: Capital I and Capital Y in Originals vs CUGAN vs Vector
print("\n--- 1. AUDITING CAPITAL I AND CAPITAL Y ---")
for f in ["dic_3_card_i_2076_1_c", "dic_3_card_y_2092_1_c", "dic_3_card_a_2068_1_c"]:
    print(f"\n👉 {f}:")
    
    # Original image inspect
    orig_im = cv2.imread(os.path.join(ORIG_DIR, f + ".png"))
    if orig_im is not None:
        print(f"  • Original scan shape: {orig_im.shape}")
        # Crop center of letter
        gray = cv2.cvtColor(orig_im, cv2.COLOR_BGR2GRAY)
        ink_borders = np.where(gray < 80)
        print(f"  • Original has dark black ink outline (<80): {len(ink_borders[0]) > 50} (count={len(ink_borders[0])})")
        # Check colors present in original
        unique_colors = len(np.unique(orig_im.reshape(-1, 3), axis=0))
        print(f"  • Original unique colors: {unique_colors}")

    # Check SVG content
    svg_p = os.path.join(VEC_DIR, f + ".svg")
    if os.path.exists(svg_p):
        with open(svg_p, 'r', encoding='utf-8') as fp:
            svg_txt = fp.read()
        paths = re.findall(r'<path[^>]+>', svg_txt)
        fills = re.findall(r'fill="([^"]+)"', svg_txt)
        print(f"  • SVG path count: {len(paths)} | fills: {list(set(fills))}")

# Check 2: Lowercase x (dic_4_card_x_2574_1_c or dic_3_card_x_2091_1_c)
print("\n--- 2. AUDITING LOWERCASE x SHADING ---")
for f in ["dic_4_card_x_2574_1_c", "dic_3_card_x_2091_1_c"]:
    print(f"\n👉 {f}:")
    crop_im = cv2.imread(os.path.join(CROP_DIR, f + ".png"))
    cug_im = cv2.imread(os.path.join(CUG_DIR, f + ".webp"))
    svg_p = os.path.join(VEC_DIR, f + ".svg")
    
    if crop_im is not None:
        # Check colors in crop
        unique_c = np.unique(crop_im.reshape(-1, 3), axis=0)
        print(f"  • Cropped shape: {crop_im.shape} | Unique colors: {len(unique_c)}")
    
    if svg_p and os.path.exists(svg_p):
        with open(svg_p, 'r', encoding='utf-8') as fp:
            svg_txt = fp.read()
        paths = re.findall(r'<path[^>]+>', svg_txt)
        fills = re.findall(r'fill="([^"]+)"', svg_txt)
        print(f"  • SVG path count: {len(paths)}")
        print(f"  • SVG fills: {list(set(fills))}")
        for p_tag in paths:
            if any(c in p_tag.lower() for c in ['#d', '#e', '#b', '#c', '#a', '#9', '#8']):
                print(f"    Path: {p_tag[:120]}...")

# Check 3: The baseline / underline across uppercase vs lowercase
print("\n--- 3. AUDITING UNDERLINE PRESENCE ACROSS A-Z ---")
# Grade 3 is uppercase (dic_3_card_[a-z]_...), Grade 4 is lowercase (dic_4_card_[a-z]_...)
letters = 'abcdefghijklmnopqrstuvwxyz'
g3_lines = {}
g4_lines = {}

for letter in letters:
    # Find filename in ORIG_DIR
    for f in os.listdir(ORIG_DIR):
        if f.startswith(f"dic_3_card_{letter}_") and f.endswith(".png"):
            # check original and cropped and svg
            im_orig = cv2.imread(os.path.join(ORIG_DIR, f))
            im_crop = cv2.imread(os.path.join(CROP_DIR, f))
            svg_p = os.path.join(VEC_DIR, f.replace(".png", ".svg"))
            
            # Check if blue line exists in orig vs crop vs svg
            has_orig_line = False
            has_crop_line = False
            has_svg_line = False
            
            if im_orig is not None:
                # blue line is cyan/light blue
                h, w = im_orig.shape[:2]
                bot = im_orig[int(h*0.5):, :]
                blue_px = np.where((bot[:, :, 0] > 180) & (bot[:, :, 2] < 120))
                has_orig_line = len(blue_px[0]) > 30
                
            if im_crop is not None:
                h, w = im_crop.shape[:2]
                bot = im_crop[int(h*0.5):, :]
                blue_px = np.where((bot[:, :, 0] > 180) & (bot[:, :, 2] < 120))
                has_crop_line = len(blue_px[0]) > 30
                
            if os.path.exists(svg_p):
                with open(svg_p, 'r', encoding='utf-8') as fp:
                    stxt = fp.read()
                # blue line fill or stroke
                has_svg_line = bool(re.search(r'fill="#[0-9a-fA-F]{2}[0-9a-fA-F]{2}[eE-fF][0-9a-fA-F]"', stxt) or 'blue' in stxt.lower() or '#5' in stxt or '#6' in stxt or '#7' in stxt or '#8' in stxt or '#9' in stxt or '#a' in stxt or '#b' in stxt or '#c' in stxt or '#4' in stxt)
                # Let's count paths
                paths = re.findall(r'<path[^>]+>', stxt)
                fills = re.findall(r'fill="([^"]+)"', stxt)
                # If there are 2 or more distinct colored fills (one for letter, one for line)
                unique_fills = [c for c in set(fills) if c.lower() not in ['#ffffff', '#fff']]
                has_svg_line = len(unique_fills) > 1

            g3_lines[letter.upper()] = (has_orig_line, has_crop_line, has_svg_line)

print("Uppercase (Grade 3) Underline Status (Original -> Cropped -> SVG):")
for l, (o, c, s) in g3_lines.items():
    status = "OK" if o == c == s else f"MISMATCH (Orig={o}, Crop={c}, SVG={s})"
    print(f"  Letter {l}: {status}")

print("=" * 100)
