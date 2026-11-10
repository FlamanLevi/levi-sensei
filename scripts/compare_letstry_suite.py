import os
import sys
import cv2
import numpy as np
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = r"E:\Levi-Sensei Images\Let's Try (Grade 3 & 4)"
CURRENT_DIR = r"c:\Antigravity\levi-sensei (new)\trimmed_assets\letstry_images"

ENGINES = {
    "current": CURRENT_DIR,
    "cropped": os.path.join(BASE_DIR, "Let's Try (Cropped)"),
    "ultrasharp": os.path.join(BASE_DIR, "Let's Try (Ultrasharp_4x)"),
    "realcugan": os.path.join(BASE_DIR, "Let's Try (Realcugan_4x)"),
    "animesharp": os.path.join(BASE_DIR, "Let's Try (Animesharp_4x)"),
    "lanczos": os.path.join(BASE_DIR, "Let's Try (Lanczos_4x)"),
}

# Diverse sample set across all distinct art types
SAMPLE_SET = [
    # 1. Shapes (Pure flat geometric shapes)
    "dic_3_card_circle_2094_1_c",
    "dic_3_card_star_2097_1_c",
    "dic_3_card_heart_2098_1_c",
    # 2. Alphabet Letters (Graphic typography)
    "dic_3_card_a_2068_1_c",
    "dic_3_card_b_2069_1_c",
    "dic_3_card_s_2086_1_c",
    # 3. Numbers (Numeral graphics)
    "dic_3_card_five_2005_1_c",
    "dic_3_card_eight_2008_1_c",
    "dic_3_card_twenty_2020_1_c",
    # 4. Cartoon Characters & Animals (Ink line art + color fills)
    "dic_3_card_baseball_2034_1_c",
    "dic_3_card_dragon_2132_1_c",
    "dic_3_card_monkey_2135_1_c",
    "dic_3_card_cat_2128_1_c",
    # 5. Food & Objects (Textbook illustrations)
    "dic_3_card_melon_2054_1_c",
    "dic_4_card_pizza_2046_1_c",
    "dic_4_card_icecream_2048_1_c",
    # 6. Action Scenes (Detailed line drawings from Wordbook)
    "dic_wb_01action_run_1029_1_c",
    "dic_wb_01action_eat_1010_1_c",
    "dic_wb_01action_jump_1016_1_c"
]

def load_img(engine_key, base_name):
    folder = ENGINES[engine_key]
    # Check webp, png, svg
    for ext in ['.webp', '.png', '.svg', '.jpg']:
        path = os.path.join(folder, base_name + ext)
        if os.path.exists(path):
            if ext == '.svg':
                return None, ext, os.path.getsize(path)
            im = cv2.imread(path)
            return im, ext, os.path.getsize(path)
    return None, None, 0

print("=" * 75)
print("🔍 AUDITING LET'S TRY SUITE: CURRENT vs NEW 4x ENGINES")
print("=" * 75)

results = []

for sample in SAMPLE_SET:
    print(f"\n👉 Analyzing: {sample}")
    sample_data = {"name": sample}
    
    for eng in ["current", "ultrasharp", "realcugan", "animesharp", "lanczos"]:
        im, ext, size_bytes = load_img(eng, sample)
        if im is None:
            continue
        h, w = im.shape[:2]
        gray = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY)
        
        # Metrics:
        # 1. Laplacian variance (Sharpness of edges)
        lap_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        
        # 2. Background purity: percentage of pixels close to pure white (>= 250)
        white_pct = (np.mean(gray >= 250)) * 100
        
        # 3. Near-white halo noise: pixels between 235 and 249 (halftones, compression ringing)
        halo_noise_pct = (np.mean((gray >= 235) & (gray < 250))) * 100
        
        # 4. Black line contrast: mean intensity of darkest 5% of pixels
        sorted_pixels = np.sort(gray.flatten())
        darkest_5pct = np.mean(sorted_pixels[:max(1, int(len(sorted_pixels) * 0.05))])

        print(f"  • {eng.upper():11} | {w}x{h:4} | {size_bytes/1024:6.1f}KB | Sharpness: {lap_var:7.1f} | WhiteBg: {white_pct:4.1f}% | HaloNoise: {halo_noise_pct:4.2f}% | DarkInk: {darkest_5pct:4.1f}")

print("\n" + "=" * 75)
print("✅ Metrics Extraction Complete.")
print("=" * 75)
