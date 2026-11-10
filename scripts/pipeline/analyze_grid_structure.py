import os
import cv2
import numpy as np
import json

with open(r'D:\Users\levif\Downloads\vocabulary.json', 'r', encoding='utf-8') as f:
    hwg_data = json.load(f)

# Poster maps
G5_POSTER_MAP = {
    1: ["u11_p1.png"],
    2: ["u11_p2.png"],
    3: ["u11_p3_1.png", "u11_p3_2.png"],
    4: ["u11_p4.png"],
    5: ["u11_p5.png"],
    6: ["u11_p6_1.png", "u11_p6_2.png"],
    7: ["u11_p7.png"],
    8: ["u11_p8_1.png", "u11_p8_2.png"],
    9: ["u11_p9.png"],
    10: ["u11_p10.png"],
    11: ["u11_p11_1.png", "u11_p11_2.png"],
    12: ["u11_p12_1.png", "u11_p12_2.png"],
    13: ["u11_p13.png"],
    14: ["u11_p14.png"],
    15: ["u11_p15_1.png", "u11_p15_2.png"],
    16: ["u11_p16.png"],
    17: ["u11_p17_1.png", "u11_p17_2.png"],
    18: ["u11_p18.png"],
    19: ["u11_p19_1.png", "u11_p19_2.png"],
    20: ["u11_p20_1.png", "u11_p20_2.png"],
    21: ["u11_p21.png"],
    22: ["u11_p22.png"],
    23: ["u11_p23.png"],
    24: ["u11_p24.png"],
    25: ["u11_p25_1.png", "u11_p25_2.png"]
}

G6_POSTER_MAP = {
    1: ["u11_p1_1.png", "u11_p1_2.png"],
    2: ["u11_p2_1.png", "u11_p2_2.png"],
    3: ["u11_p3.png"],
    4: ["u11_p4_1.png", "u11_p4_2.png"],
    5: ["u11_p5_1.png", "u11_p5_2.png"],
    6: ["u11_p6_1.png", "u11_p6_2.png", "u11_p6_3.png", "u11_p6_4.png"],
    7: ["u11_p7_1.png", "u11_p7_2.png", "u11_p7_3.png", "u11_p7_4.png"],
    8: ["u11_p8_1.png", "u11_p8_2.png"],
    9: ["u11_p9_1.png", "u11_p9_2.png"],
    10: ["u11_p10_1.png", "u11_p10_2.png"],
    11: ["u11_p11_1.png", "u11_p11_2.png", "u11_p11_3.png"],
    12: ["u11_p12.png"],
    13: ["u11_p13.png"],
    14: ["u11_p14.png"],
    15: ["u11_p15_1.png", "u11_p15_2.png"],
    16: ["u11_p16.png"],
    17: ["u11_p18.png"],
    18: ["u11_p19.png"],
    19: ["u11_p20_1.png", "u11_p20_2.png"]
}

def analyze_poster_grid(poster_path):
    img = cv2.imread(poster_path)
    if img is None:
        return None
    h, w = img.shape[:2]
    
    # What are the dividing lines?
    # Posters have border/grid lines of a distinct background color or dark color.
    # In some posters (like u11_p12 in eigo6), is the background white?
    # Let's check border colors
    top_row = img[0:5, :]
    bot_row = img[-5:, :]
    left_col = img[:, 0:5]
    right_col = img[:, -5:]
    
    border_pixels = np.concatenate([top_row.reshape(-1, 3), bot_row.reshape(-1, 3), left_col.reshape(-1, 3), right_col.reshape(-1, 3)])
    # Non-white border pixels:
    non_white_mask = np.any(border_pixels < 240, axis=1)
    if np.sum(non_white_mask) > 100:
        bg_col = np.median(border_pixels[non_white_mask], axis=0)
    else:
        bg_col = np.array([255, 255, 255])
        
    return {
        "file": os.path.basename(poster_path),
        "shape": (h, w),
        "bg_col": bg_col.astype(int).tolist(),
        "has_colored_bg": np.sum(non_white_mask) > 100
    }

# Let's inspect all posters
for grade, pmap in [("eigo5", G5_POSTER_MAP), ("eigo6", G6_POSTER_MAP)]:
    print(f"\n=================== {grade} ===================")
    for u_idx, pfiles in pmap.items():
        for pf in pfiles:
            p = os.path.join("manabi_assets/posters", grade, pf)
            res = analyze_poster_grid(p)
            print(f"U{u_idx:02d} {pf}: {res['shape']}, colored_bg={res['has_colored_bg']}, bg={res['bg_col']}")
