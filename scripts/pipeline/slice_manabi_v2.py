import os
import sys
import json
import re
import cv2
import numpy as np

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
POSTERS_DIR = os.path.join(BASE_DIR, "manabi_assets", "posters")
CARDS_DIR = os.path.join(BASE_DIR, "manabi_assets", "cards")
FULL_CARDS_DIR = os.path.join(CARDS_DIR, "full")
ILLUST_CARDS_DIR = os.path.join(CARDS_DIR, "illustration")
TEXT_CARDS_DIR = os.path.join(CARDS_DIR, "text")

os.makedirs(FULL_CARDS_DIR, exist_ok=True)
os.makedirs(ILLUST_CARDS_DIR, exist_ok=True)
os.makedirs(TEXT_CARDS_DIR, exist_ok=True)

with open(r'D:\Users\levif\Downloads\vocabulary.json', 'r', encoding='utf-8') as f:
    hwg_data = json.load(f)

# Poster mapping for Grade 5 and Grade 6
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
    4: ["u11_p4_1.png"],
    5: ["u11_p5_1.png"],
    6: ["u11_p6_1.png", "u11_p6_2.png", "u11_p6_3.png", "u11_p6_4.png"],
    7: ["u11_p7_1.png", "u11_p7_2.png", "u11_p7_4.png"],
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

def detect_bg_color(img):
    h, w = img.shape[:2]
    edge_pixels = np.concatenate([
        img[0:3, :].reshape(-1, 3),
        img[-3:, :].reshape(-1, 3),
        img[:, 0:3].reshape(-1, 3),
        img[:, -3:].reshape(-1, 3)
    ])
    non_white = edge_pixels[np.any(edge_pixels < 240, axis=1)]
    if len(non_white) > 100:
        return np.median(non_white, axis=0)
    return np.array([255, 255, 255])

def extract_row_bands(img, bg_col):
    h, w = img.shape[:2]
    dist = np.max(np.abs(img.astype(np.float32) - bg_col), axis=2)
    is_bg = dist < 28
    row_bg = np.mean(is_bg, axis=1)
    
    divs = []
    in_div = False
    st = 0
    for y in range(h):
        if row_bg[y] > 0.35:
            if not in_div:
                in_div = True
                st = y
        else:
            if in_div:
                in_div = False
                if (y - st) >= 3:
                    divs.append((st, y - 1))
    if in_div and (h - st) >= 3:
        divs.append((st, h - 1))
        
    if not divs or divs[0][0] > 10:
        divs.insert(0, (0, 0))
    if divs[-1][1] < h - 10:
        divs.append((h - 1, h - 1))
        
    merged = []
    for d in divs:
        if not merged:
            merged.append(d)
        else:
            if d[0] - merged[-1][1] <= 6:
                merged[-1] = (merged[-1][0], d[1])
            else:
                merged.append(d)
                
    filtered = [merged[0]]
    for d in merged[1:]:
        if d[0] - filtered[-1][1] < 60:
            continue
        filtered.append(d)
        
    bands = []
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    ink_by_row = np.sum(gray < 220, axis=1)
    
    for i in range(len(filtered) - 1):
        y1 = int(filtered[i][1] + 1)
        y2 = int(filtered[i+1][0] - 1)
        band_h = y2 - y1 + 1
        if band_h >= 50:
            if band_h > 320:
                # Likely 2 rows combined! Find gap with minimum ink around midpoint
                mid = (y1 + y2) // 2
                search_st = max(y1 + 50, mid - 40)
                search_en = min(y2 - 50, mid + 40)
                min_y = search_st + int(np.argmin(ink_by_row[search_st:search_en]))
                bands.append((y1, min_y - 2))
                bands.append((min_y + 2, y2))
            else:
                bands.append((y1, y2))
            
    return bands

def extract_cells_for_row_band(img, y1, y2, bg_col):
    h, w = img.shape[:2]
    band = img[y1:y2+1, :]
    dist = np.max(np.abs(band.astype(np.float32) - bg_col), axis=2)
    is_bg = dist < 28
    col_bg = np.mean(is_bg, axis=0)
    
    divs = []
    in_div = False
    st = 0
    for x in range(w):
        if col_bg[x] > 0.35:
            if not in_div:
                in_div = True
                st = x
        else:
            if in_div:
                in_div = False
                if (x - st) >= 2:
                    divs.append((st, x - 1))
    if in_div and (w - st) >= 2:
        divs.append((st, w - 1))
        
    if not divs or divs[0][0] > 10:
        divs.insert(0, (0, 0))
    if divs[-1][1] < w - 10:
        divs.append((w - 1, w - 1))
        
    merged = []
    for d in divs:
        if not merged:
            merged.append(d)
        else:
            if d[0] - merged[-1][1] <= 6:
                merged[-1] = (merged[-1][0], d[1])
            else:
                merged.append(d)
                
    filtered = [merged[0]]
    for d in merged[1:]:
        if d[0] - filtered[-1][1] < 80:
            continue
        filtered.append(d)
        
    cols = []
    for i in range(len(filtered) - 1):
        x1 = int(filtered[i][1] + 1)
        x2 = int(filtered[i+1][0] - 1)
        if x2 - x1 >= 80:
            cols.append((x1, x2))
            
    return cols

def smart_split_card(card, row_ruling_y=None):
    card_h, card_w = card.shape[:2]
    # Check if horizontal card (e.g. Daily Life)
    if card_w / max(1, card_h) > 2.5:
        gray = cv2.cvtColor(card, cv2.COLOR_BGR2GRAY)
        ink = np.sum(gray < 220, axis=0)
        st_x = int(card_w * 0.20)
        en_x = int(card_w * 0.50)
        best_gap_x = int(card_w * 0.32)
        min_ink = 999999
        for x in range(st_x, en_x):
            window_ink = np.sum(ink[max(0, x-2):min(card_w, x+3)])
            if window_ink < min_ink:
                min_ink = window_ink
                best_gap_x = x
        illust = card[:, :best_gap_x]
        text_strip = card[:, best_gap_x:]
        return illust, text_strip

    # Standard vertical card: illustration on top, text on bottom
    is_nw = np.any(card < 235, axis=2)
    row_counts = np.sum(is_nw, axis=1)
    
    if row_ruling_y is not None and int(card_h * 0.50) <= row_ruling_y <= int(card_h * 0.85):
        top_rule_y = row_ruling_y
    else:
        top_rule_y = None
        for y in range(int(card_h * 0.55), int(card_h * 0.85)):
            if row_counts[y] > 0.40 * card_w and row_counts[max(0, y-3)] < 0.35 * card_w:
                if any(row_counts[yb] > 0.40 * card_w for yb in range(y+6, min(card_h, y+24))):
                    top_rule_y = y
                    break
        if top_rule_y is None:
            top_rule_y = int(card_h * 0.70)
            
    art_bot = 0
    for y in range(top_rule_y - 1, 0, -1):
        if row_counts[y] >= 3:
            art_bot = y
            break
            
    if art_bot < top_rule_y - 2:
        split_y = max(art_bot + 2, top_rule_y - 2)
    else:
        split_y = max(1, top_rule_y - 1)
        
    split_y = max(int(card_h * 0.45), min(split_y, int(card_h * 0.85)))
    illust = card[:split_y, :]
    text_strip = card[split_y:, :]
    return illust, text_strip

