import os
import cv2
import numpy as np
import json

with open(r'D:\Users\levif\Downloads\vocabulary.json', 'r', encoding='utf-8') as f:
    hwg_data = json.load(f)

# Let's inspect each poster mapped in G5 and G6
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

def analyze_all():
    print("=== ANALYZING ALL MAPPED POSTERS ===")
    for grade, pmap in [("eigo5", G5_POSTER_MAP), ("eigo6", G6_POSTER_MAP)]:
        g_key = "grade5" if grade == "eigo5" else "grade6"
        units = hwg_data[g_key]
        for u_idx, (u_name, words) in enumerate(units.items(), start=1):
            pfiles = pmap.get(u_idx, [])
            for pf in pfiles:
                ppath = os.path.join("manabi_assets/posters", grade, pf)
                im = cv2.imread(ppath)
                if im is None:
                    print(f"MISSING: {ppath}")
                    continue
                h, w = im.shape[:2]
                print(f"{grade} U{u_idx:02d} ({len(words)}w) {pf}: {w}x{h}")

analyze_all()
