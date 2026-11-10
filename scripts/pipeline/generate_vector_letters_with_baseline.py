"""
Generate Pure Vector Letters with Authentic Textbook Blue Baseline
===================================================================
1. Restores all 52 Alphabet Letters (Grade 3 A-Z uppercase, Grade 4 a-z lowercase)
   as 100% pure mathematical vector SVGs (<8 KB each).
2. For the 35 SVGs that already have the VTracer blue baseline, preserves them perfectly.
3. For the 17 SVGs where VTracer dropped the baseline, integrates the exact mathematical
   vector baseline at authentic textbook coordinates matching the other 35 cards.
4. Cleans up any raster .webp letter files from new_assets/letstry_images.
5. Updates master_vocabulary.json to reference .svg for all 52 letters.
"""

import os
import sys
import re
import json
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
NEW_ASSETS_DIR = os.path.join(ROOT_DIR, "new_assets", "letstry_images")
SVG_SOURCE_DIR = r"E:\Levi-Sensei Images\Let's Try (Grade 3 & 4)\Let's Try (New)\grade3_4_vector_svg"
CROP_DIR = r"E:\Levi-Sensei Images\Let's Try (Grade 3 & 4)\Let's Try (Cropped)"

VOCAB_PATHS = [
    os.path.join(ROOT_DIR, "public", "data", "master_vocabulary.json"),
    os.path.join(ROOT_DIR, "master_vocabulary_data", "master_vocabulary.json")
]

LETTER_RE = re.compile(r'^dic_[34]_card_([a-z])_\d+_1_c$')

def has_baseline_in_svg(svg_content):
    fills = re.findall(r'fill="([^"]+)"', svg_content)
    for c in fills:
        c_clean = c.strip('#')
        if len(c_clean) == 6:
            r = int(c_clean[0:2], 16)
            g = int(c_clean[2:4], 16)
            b = int(c_clean[4:6], 16)
            # Pure light cyan baseline: high blue, high green, moderate red
            if b > 180 and g > 150 and r < 200:
                return True
    return False

def get_baseline_coords(card_name, is_grade_3):
    png_path = os.path.join(CROP_DIR, card_name + ".png")
    im = Image.open(png_path)
    w, h = im.size
    
    # Textbook baseline is strictly 3px high
    line_h = 3
    if is_grade_3:
        # Grade 3 cards have width 745 and baseline width 690-691 from x=27
        line_w = 690
        x = 27
        # Y position depends on image height: 601px height has y=571; 605px height has y=575
        y = 571 if h <= 602 else 575
        color = "#43BAE2"
    else:
        # Grade 4 cards have width 651 and baseline width 603 from x=24
        line_w = 603
        x = 24
        # Lowercase x has h=357 and y=330; f/h have h~530 and y~504
        if card_name.endswith("_x_2574_1_c"):
            y = 330
        elif card_name.endswith("_f_2556_1_c"):
            y = 506
        elif card_name.endswith("_h_2558_1_c"):
            y = 502
        else:
            y = h - 28
        color = "#42BAE2"
        
    return x, y, line_w, line_h, color

def inject_baseline(svg_text, x, y, w, h, color):
    # Formulate vector path identical to VTracer's native baseline paths:
    # <path d="M0 0 C... w ... h ... Z" fill="#..." transform="translate(x, y)"/>
    c1 = round(w * 0.33, 2)
    c2 = round(w * 0.66, 2)
    c3 = round(w * 0.67, 2)
    c4 = round(w * 0.34, 2)
    path_d = f"M0 0 C{c1} 0 {c2} 0 {w} 0 C{w} 1 {w} 2 {w} {h} C{c3} {h} {c4} {h} 0 {h} C0 2 0 1 0 0 Z "
    baseline_tag = f'<path d="{path_d}" fill="{color}" transform="translate({x},{y})"/>\n'
    
    if "</svg>" in svg_text:
        return svg_text.replace("</svg>", f"{baseline_tag}</svg>")
    return svg_text + "\n" + baseline_tag

def main():
    print("=" * 80)
    print("🎨 GENERATING PURE VECTOR LETTERS WITH AUTHENTIC BLUE BASELINE")
    print("=" * 80)
    
    all_svgs = sorted([f for f in os.listdir(SVG_SOURCE_DIR) if LETTER_RE.match(os.path.splitext(f)[0])])
    print(f"📁 Found {len(all_svgs)} letter SVGs in source directory.")
    assert len(all_svgs) == 52, f"Expected 52 letter cards, got {len(all_svgs)}"
    
    already_had_baseline = 0
    injected_baseline = 0
    
    for f in all_svgs:
        card_name = os.path.splitext(f)[0]
        is_grade_3 = card_name.startswith("dic_3_")
        
        src_svg_p = os.path.join(SVG_SOURCE_DIR, f)
        dst_svg_p = os.path.join(NEW_ASSETS_DIR, f)
        old_webp = os.path.join(NEW_ASSETS_DIR, card_name + ".webp")
        
        # Remove old raster webp
        if os.path.exists(old_webp):
            os.remove(old_webp)
            
        with open(src_svg_p, "r", encoding="utf-8") as fp:
            svg_content = fp.read()
            
        if has_baseline_in_svg(svg_content):
            # Already has native VTracer baseline!
            with open(dst_svg_p, "w", encoding="utf-8") as out_fp:
                out_fp.write(svg_content)
            already_had_baseline += 1
        else:
            # Measure exact coordinates from authentic textbook scan
            x, y, w, h, color = get_baseline_coords(card_name, is_grade_3)
            enhanced_svg = inject_baseline(svg_content, x, y, w, h, color)
            with open(dst_svg_p, "w", encoding="utf-8") as out_fp:
                out_fp.write(enhanced_svg)
            injected_baseline += 1
            print(f"  • {card_name}: injected vector baseline at ({x}, {y}) [w={w}, h={h}, {color}]")
            
    print(f"\n✅ All 52 Letters Deployed as Pure Vector SVGs:")
    print(f"   • Native VTracer baseline: {already_had_baseline} cards")
    print(f"   • Textbook-aligned baseline: {injected_baseline} cards")
    
    # Update master vocabulary files
    print("\n📝 UPDATING MASTER VOCABULARY JSON FILES TO .SVG")
    for vp in VOCAB_PATHS:
        if not os.path.exists(vp):
            continue
        with open(vp, "r", encoding="utf-8") as fp:
            data = json.load(fp)
            
        count = 0
        for item in data:
            card_img = item.get("card_image", "")
            base = os.path.splitext(card_img)[0]
            if LETTER_RE.match(base):
                new_img = base + ".svg"
                if card_img != new_img:
                    item["card_image"] = new_img
                    count += 1
                    
        with open(vp, "w", encoding="utf-8") as fp:
            json.dump(data, fp, ensure_ascii=False, indent=2)
        print(f"  ✅ {os.path.basename(vp)}: updated {count} letters to .svg")
        
    print("\n" + "=" * 80)
    print("🎉 SUCCESS: ALL 52 LETTERS ARE NOW 100% PURE VECTOR SVGs WITH BLUE BASELINE!")
    print("=" * 80)

if __name__ == "__main__":
    main()
