import os
import cv2
import numpy as np
import json
import re

with open(r'D:\Users\levif\Downloads\vocabulary.json', 'r', encoding='utf-8') as f:
    hwg_data = json.load(f)

from slice_manabi_v2 import (
    detect_bg_color,
    extract_row_bands,
    extract_cells_for_row_band,
    smart_split_card,
    G5_POSTER_MAP,
    G6_POSTER_MAP
)
from test_numbers_extract import extract_numbers_poster
from test_daily_life import extract_daily_life
from test_who_extract import extract_when_how_often
from test_g5_u11 import extract_g5_months_days
from test_g5_u21 import extract_g5_directions
from test_g5_u22 import extract_g5_operations
from test_g6_u12 import extract_g6_body

def extract_standard_poster(p_path):
    im = cv2.imread(p_path)
    if im is None:
        return []
    bg_col = detect_bg_color(im)
    bands = extract_row_bands(im, bg_col)
    cells = []
    for r_idx, (y1, y2) in enumerate(bands):
        cols = extract_cells_for_row_band(im, y1, y2, bg_col)
        # Check ruling line consensus for this band
        # First gather ruling candidates
        band_ruling_cands = []
        for x1, x2 in cols:
            card = im[y1+2:y2-1, x1+2:x2-1]
            ch, cw = card.shape[:2]
            is_nw = np.any(card < 235, axis=2)
            rc = np.sum(is_nw, axis=1)
            for y in range(int(ch * 0.55), int(ch * 0.85)):
                if rc[y] > 0.40 * cw and rc[max(0, y-3)] < 0.35 * cw:
                    if any(rc[yb] > 0.40 * cw for yb in range(y+6, min(ch, y+24))):
                        band_ruling_cands.append(y)
                        break
        row_rule_y = int(np.median(band_ruling_cands)) if band_ruling_cands else None
        
        for x1, x2 in cols:
            # 2px inset past border to guarantee pure white canvas
            card = im[y1+2:y2-1, x1+2:x2-1]
            illust, text = smart_split_card(card, row_ruling_y=row_rule_y)
            cells.append({
                "full": card,
                "illust": illust,
                "text": text
            })
    return cells

def get_cells_for_unit(grade, u_idx):
    if grade == 5:
        if u_idx == 11:
            return extract_g5_months_days("manabi_assets/posters/eigo5/u11_p11_1.png", "manabi_assets/posters/eigo5/u11_p11_2.png")
        elif u_idx == 21:
            return extract_g5_directions("manabi_assets/posters/eigo5/u11_p21.png")
        elif u_idx == 22:
            return extract_g5_operations("manabi_assets/posters/eigo5/u11_p22.png")
        elif u_idx == 25:
            return extract_numbers_poster("manabi_assets/posters/eigo5/u11_p25_1.png", "manabi_assets/posters/eigo5/u11_p25_2.png")
        else:
            pfiles = G5_POSTER_MAP.get(u_idx, [])
            cells = []
            for pf in pfiles:
                cells.extend(extract_standard_poster(os.path.join("manabi_assets/posters/eigo5", pf)))
            return cells
    else: # Grade 6
        if u_idx == 4:
            # Months: all 12 are on p4_1
            return extract_standard_poster("manabi_assets/posters/eigo6/u11_p4_1.png")
        elif u_idx == 5:
            # Seasonal events: all 12 on p5_1
            return extract_standard_poster("manabi_assets/posters/eigo6/u11_p5_1.png")
        elif u_idx == 7:
            return extract_when_how_often("manabi_assets/posters/eigo6/u11_p7_1.png", "manabi_assets/posters/eigo6/u11_p7_2.png", "manabi_assets/posters/eigo6/u11_p7_4.png")
        elif u_idx == 8:
            return extract_daily_life("manabi_assets/posters/eigo6/u11_p8_1.png", "manabi_assets/posters/eigo6/u11_p8_2.png")
        elif u_idx == 12:
            return extract_g6_body("manabi_assets/posters/eigo6/u11_p12.png")
        elif u_idx == 19:
            return extract_numbers_poster("manabi_assets/posters/eigo6/u11_p20_1.png", "manabi_assets/posters/eigo6/u11_p20_2.png")
        else:
            pfiles = G6_POSTER_MAP.get(u_idx, [])
            cells = []
            for pf in pfiles:
                cells.extend(extract_standard_poster(os.path.join("manabi_assets/posters/eigo6", pf)))
            return cells

if __name__ == '__main__':
    print("=== VERIFYING ALL UNITS COVERAGE ===")
    total_words = 0
    total_cells = 0
    failures = []

    for grade in [5, 6]:
        g_key = f"grade{grade}"
        units = hwg_data[g_key]
        for u_idx, (u_name, words) in enumerate(units.items(), start=1):
            cells = get_cells_for_unit(grade, u_idx)
            n_words = len(words)
            n_cells = len(cells)
            total_words += n_words
            total_cells += min(n_words, n_cells)
            status = "OK" if n_cells >= n_words else "INSUFFICIENT"
            if status != "OK":
                failures.append((grade, u_idx, u_name, n_words, n_cells))
            print(f"G{grade} U{u_idx:02d} [{u_name[:25]}]: {n_words} words, {n_cells} cells -> {status}")

    print("\n" + "=" * 60)
    print(f"Total Words in vocabulary.json: {total_words}")
    print(f"Total Matched Cells: {total_cells} / {total_words} ({total_cells/total_words*100:.1f}%)")
    if failures:
        print(f"FAILURES ({len(failures)}):")
        for f in failures:
            print(f"  G{f[0]} U{f[1]:02d} {f[2]}: needed {f[3]}, got {f[4]}")
    else:
        print("ALL 44 UNITS HAVE 100% COVERAGE (0 SHORTFALLS)!")
    print("=" * 60)

