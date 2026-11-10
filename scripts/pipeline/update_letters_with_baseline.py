"""
Update Let's Try Letter Cards Pipeline
======================================
1. Replaces all 52 alphabet letter cards (Grade 3 A-Z uppercase, Grade 4 a-z lowercase)
   with AnimeSharpV4_Lanc (Lanczos 1080p, Quality=92 WebP).
   This ensures the official textbook blue baseline is 100% preserved across all letters,
   including descender alignment (p, q, g, j, y).
2. Cleans up any legacy .svg files for those 52 letters in new_assets/letstry_images/.
3. Re-deploys any geometric shapes (like diamond_2120, triangle_2102, square_2096) as VTracer SVGs.
4. Updates master_vocabulary.json to reference the .webp extension for the 52 letters.
"""

import os
import sys
import re
import json
import shutil
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
NEW_ASSETS_DIR = os.path.join(ROOT_DIR, "new_assets", "letstry_images")

SOURCE_BASE = r"E:\Levi-Sensei Images\Let's Try (Grade 3 & 4)\Let's Try (New)"
DIR_ANIMESHARP_LANC = os.path.join(SOURCE_BASE, "grade3_4_animesharp_v4_lanczos_part_ALL_of_2")
DIR_VECTOR_SVG = os.path.join(SOURCE_BASE, "grade3_4_vector_svg")

VOCAB_PATHS = [
    os.path.join(ROOT_DIR, "public", "data", "master_vocabulary.json"),
    os.path.join(ROOT_DIR, "master_vocabulary_data", "master_vocabulary.json")
]

LETTER_PATTERN = re.compile(r'^dic_[34]_card_[a-z]_\d+_1_c$')

# Geometric shapes that should be pure vectors
VECTOR_SHAPES = [
    'dic_3_card_diamond_2120_1_c',
    'dic_3_card_rectangle_2118_1_c',
    'dic_3_card_square_2096_1_c',
    'dic_3_card_star_2107_1_c',
    'dic_3_card_triangle_2102_1_c',
]

def main():
    print("=" * 80)
    print("🚀 PRESERVING OFFICIAL TEXTBOOK BLUE BASELINE ON ALL 52 ALPHABET LETTERS")
    print("=" * 80)
    
    # 1. Identify all 52 letters
    all_files = os.listdir(DIR_ANIMESHARP_LANC)
    letter_cards = sorted([os.path.splitext(f)[0] for f in all_files if LETTER_PATTERN.match(os.path.splitext(f)[0])])
    print(f"📋 Found {len(letter_cards)} letter cards in AnimeSharpV4_Lanc.")
    assert len(letter_cards) == 52, f"Expected 52 letter cards, got {len(letter_cards)}"
    
    # 2. Process and downscale each letter to 1080p Quality=92 WebP
    processed_letters = 0
    for card in letter_cards:
        src_webp = os.path.join(DIR_ANIMESHARP_LANC, card + ".webp")
        dst_webp = os.path.join(NEW_ASSETS_DIR, card + ".webp")
        old_svg = os.path.join(NEW_ASSETS_DIR, card + ".svg")
        
        # Remove old SVG if present
        if os.path.exists(old_svg):
            os.remove(old_svg)
            
        with Image.open(src_webp) as im:
            orig_w, orig_h = im.size
            if orig_w > 1920 or orig_h > 1080:
                im.thumbnail((1920, 1080), Image.Resampling.LANCZOS)
            im.save(dst_webp, format="WEBP", quality=92, method=6)
            
        processed_letters += 1

    print(f"✅ Successfully deployed {processed_letters} letter cards with blue baseline to new_assets/letstry_images/*.webp")
    
    # 3. Ensure geometric shapes are pure vector SVGs
    print("\n📐 VERIFYING GEOMETRIC SHAPES AS VECTOR SVGs")
    for s in VECTOR_SHAPES:
        src_svg = os.path.join(DIR_VECTOR_SVG, s + ".svg")
        dst_svg = os.path.join(NEW_ASSETS_DIR, s + ".svg")
        old_webp = os.path.join(NEW_ASSETS_DIR, s + ".webp")
        
        if os.path.exists(src_svg):
            shutil.copy2(src_svg, dst_svg)
            if os.path.exists(old_webp):
                os.remove(old_webp)
            print(f"  • {s}: restored as pure vector SVG ({os.path.getsize(dst_svg)} bytes)")
        else:
            print(f"  ⚠️ Warning: {src_svg} not found!")

    # 4. Update master_vocabulary.json
    print("\n📝 UPDATING MASTER VOCABULARY JSON FILES")
    for vp in VOCAB_PATHS:
        if not os.path.exists(vp):
            print(f"  ⚠️ Path not found: {vp}")
            continue
        with open(vp, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        updated_count = 0
        for item in data:
            card_img = item.get("card_image", "")
            base = os.path.splitext(card_img)[0]
            if LETTER_PATTERN.match(base):
                new_img = base + ".webp"
                if card_img != new_img:
                    item["card_image"] = new_img
                    updated_count += 1
            elif base in VECTOR_SHAPES:
                new_img = base + ".svg"
                if card_img != new_img:
                    item["card_image"] = new_img
                    updated_count += 1
                    
        with open(vp, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"  ✅ {os.path.basename(vp)}: updated {updated_count} entries to match exact file types.")

    print("\n" + "=" * 80)
    print("🎉 ALL 52 LETTERS UPDATED WITH PERFECT BASELINES + SHAPES RESTORED AS VECTORS!")
    print("=" * 80)

if __name__ == "__main__":
    main()
