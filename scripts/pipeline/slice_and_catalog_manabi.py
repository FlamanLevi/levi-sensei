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
CATALOG_PATH = os.path.join(BASE_DIR, "manabi_assets", "sliced_card_catalog.json")
VOCAB_PATH = r'D:\Users\levif\Downloads\vocabulary.json'

with open(VOCAB_PATH, 'r', encoding='utf-8') as f:
    hwg_data = json.load(f)

os.makedirs(FULL_CARDS_DIR, exist_ok=True)
os.makedirs(ILLUST_CARDS_DIR, exist_ok=True)
os.makedirs(TEXT_CARDS_DIR, exist_ok=True)

# Mapping Unit numbers to poster files for Grade 5 and Grade 6
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
    """Samples poster perimeter to detect background divider color."""
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
    """Detects horizontal row bands using background dividers and projection."""
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
                mid = (y1 + y2) // 2
                search_st = max(y1 + 50, mid - 40)
                search_en = min(y2 - 50, mid + 40)
                min_y = search_st + int(np.argmin(ink_by_row[search_st:search_en]))
                bands.append((y1, min_y - 2))
                bands.append((min_y + 2, y2))
            else:
                bands.append((y1, y2))
            
    return bands

def extract_cells_for_row_band(img, y1, y2, bg_col, thresh=0.35):
    """Finds cell column intervals within a row band with calibrated color-distance divider detection."""
    band = img[y1:y2+1, :]
    w = band.shape[1]
    dist = np.max(np.abs(band.astype(np.float32) - bg_col), axis=2)
    is_bg = dist < 18
    col_bg = np.mean(is_bg, axis=0)
    
    div_mask = col_bg > thresh
    divs = []
    in_div = False
    st = 0
    for x in range(w):
        if div_mask[x]:
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
        if d[0] - filtered[-1][1] < 175:
            continue
        filtered.append(d)
        
    cols = []
    for i in range(len(filtered) - 1):
        x1 = int(filtered[i][1] + 1)
        x2 = int(filtered[i+1][0] - 1)
        if x2 - x1 >= 175:
            cols.append((x1, x2))
            
    return cols

def clean_card_borders(card, bg_col=None):
    """
    Enforces strict zero colored border policy.
    Strips colored grid dividers, anti-aliasing fringes, and margins to guarantee
    a pure white perimeter canvas with 0px border bleed without cutting artwork.
    Safely bypassed on pure white canvases.
    """
    if card is None:
        return None
    h, w = card.shape[:2]
    if h < 20 or w < 20:
        return card
    if bg_col is None or np.all(bg_col >= 235):
        return card
        
    top = 0
    bot = h - 1
    left = 0
    right = w - 1
    
    max_crop_y = int(h * 0.15)
    max_crop_x = int(w * 0.15)

    def is_border_row(r):
        inner = r[3:-3] if len(r) > 10 else r
        diff = np.max(np.abs(inner.astype(float) - bg_col), axis=1)
        is_bg = (diff < 35)
        chroma = np.max(inner, axis=1) - np.min(inner, axis=1)
        is_col = (chroma > 15) & (np.min(inner, axis=1) < 240)
        return np.mean(is_bg | is_col) > 0.25

    def is_border_col(c):
        inner = c[3:-3] if len(c) > 10 else c
        diff = np.max(np.abs(inner.astype(float) - bg_col), axis=1)
        is_bg = (diff < 35)
        chroma = np.max(inner, axis=1) - np.min(inner, axis=1)
        is_col = (chroma > 15) & (np.min(inner, axis=1) < 240)
        return np.mean(is_bg | is_col) > 0.25

    while top < max_crop_y and is_border_row(card[top, left:right+1]):
        top += 1
    while (h - 1 - bot) < max_crop_y and is_border_row(card[bot, left:right+1]):
        bot -= 1
    while left < max_crop_x and is_border_col(card[top:bot+1, left]):
        left += 1
    while (w - 1 - right) < max_crop_x and is_border_col(card[top:bot+1, right]):
        right -= 1

    # Inset by 1px to be safely inside the pure white card canvas
    top = min(top + 1, bot)
    bot = max(bot - 1, top)
    left = min(left + 1, right)
    right = max(right - 1, left)
    
    return card[top:bot+1, left:right+1]

def split_horizontal_card(card):
    """
    Splits wide horizontal cards (w/h > 2.2) along the vertical column gap:
    Illustration on the left, 4-line handwriting guide / text on the right.
    """
    card_h, card_w = card.shape[:2]
    is_nw = np.any(card < 235, axis=2)
    col_ink = np.sum(is_nw, axis=0)
    
    search_st = int(card_w * 0.20)
    search_en = int(card_w * 0.55)
    split_x = search_st + int(np.argmin(col_ink[search_st:search_en]))
    
    # Inset slightly past any trailing ink if col_ink is 0
    if col_ink[split_x] == 0:
        zero_cols = np.where(col_ink[search_st:search_en] == 0)[0] + search_st
        if len(zero_cols) > 0:
            split_x = int(np.median(zero_cols))
            
    illust = card[:, :split_x]
    text = card[:, split_x:]
    return illust, text

def smart_split_card(card, row_ruling_y=None):
    """
    Splits card cleanly into illustration and handwriting guide / text areas.
    Detects the 4-line ruling guide to guarantee 0 ruling line pixels in the illustration
    and full artwork preservation.
    """
    card_h, card_w = card.shape[:2]
    
    is_nw = np.any(card < 235, axis=2)
    rc = np.sum(is_nw, axis=1)
    
    top_rule_y = None
    min_search_y = int(card_h * 0.50)
    max_search_y = int(card_h * 0.85)
    
    # 1. Search for ruling line spanning > 65% of card width
    for y in range(min_search_y, max_search_y):
        if rc[y] > 0.65 * card_w and rc[max(0, y-3)] < 0.50 * card_w:
            if any(rc[yb] > 0.65 * card_w for yb in range(y+6, min(card_h, y+22))):
                top_rule_y = y
                break

    # 2. Use row ruling consensus if individual detection was ambiguous
    if top_rule_y is None and row_ruling_y is not None:
        if min_search_y <= row_ruling_y <= max_search_y:
            top_rule_y = row_ruling_y

    # 3. Fallback: looser ruling search
    if top_rule_y is None:
        for y in range(min_search_y, max_search_y):
            if rc[y] > 0.60 * card_w and rc[max(0, y-3)] < 0.50 * card_w:
                top_rule_y = y
                break

    if top_rule_y is None:
        top_rule_y = int(card_h * 0.70)
        
    split_y = max(1, top_rule_y - 1)
    split_y = max(int(card_h * 0.45), min(split_y, int(card_h * 0.85)))
    illust = card[:split_y, :]
    text_strip = card[split_y:, :]
    if np.sum(np.any(illust < 230, axis=2)) < 200:
        illust = card.copy()
    return illust, text_strip

def split_card(card, row_ruling_y=None):
    """Routes to horizontal or stacked card splitter based on aspect ratio."""
    card_h, card_w = card.shape[:2]
    aspect = card_w / max(1, card_h)
    if aspect > 2.2:
        return split_horizontal_card(card)
    return smart_split_card(card, row_ruling_y=row_ruling_y)

def extract_standard_poster(p_path):
    im = cv2.imread(p_path)
    if im is None:
        return []
    bg_col = detect_bg_color(im)
    bands = extract_row_bands(im, bg_col)
    
    cells = []
    for y1, y2 in bands:
        cols = extract_cells_for_row_band(im, y1, y2, bg_col)
        
        # Detect row ruling consensus across cards in this band
        band_ruling_cands = []
        for x1, x2 in cols:
            card_raw = im[y1:y2+1, x1:x2+1]
            ch, cw = card_raw.shape[:2]
            is_nw = np.any(card_raw < 235, axis=2)
            rc = np.sum(is_nw, axis=1)
            for y in range(int(ch * 0.50), int(ch * 0.85)):
                if rc[y] > 0.65 * cw and rc[max(0, y-3)] < 0.50 * cw:
                    if any(rc[yb] > 0.65 * cw for yb in range(y+6, min(ch, y+22))):
                        band_ruling_cands.append(y)
                        break
        row_rule_y = int(np.median(band_ruling_cands)) if band_ruling_cands else None
        
        for x1, x2 in cols:
            card_raw = im[y1:y2+1, x1:x2+1]
            card = clean_card_borders(card_raw, bg_col)
            
            # Filter out blank / empty cells on poster canvas
            ink_count = np.sum(np.any(card < 230, axis=2))
            if ink_count < 1000:
                continue
                
            illust, text = split_card(card, row_ruling_y=row_rule_y)
            cells.append({
                "full": card,
                "illust": illust,
                "text": text
            })
    return cells

def extract_numbers_poster(p1_path, p2_path):
    cells = []
    for p_idx, path in enumerate([p1_path, p2_path]):
        im = cv2.imread(path)
        if im is None:
            continue
        h, w = im.shape[:2]
        bg = np.median(np.concatenate([im[:10, :].reshape(-1, 3), im[-10:, :].reshape(-1, 3)]), axis=0)
        diff = np.max(np.abs(im.astype(float) - bg), axis=2)
        content = (diff > 25).astype(np.uint8) * 255
        kernel = np.ones((5, 5), np.uint8)
        closed = cv2.morphologyEx(content, cv2.MORPH_CLOSE, kernel)
        cnts, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        boxes = [cv2.boundingRect(c) for c in cnts if cv2.boundingRect(c)[2] > 60 and cv2.boundingRect(c)[3] > 40]
        boxes = [b for b in boxes if not (b[2] > 500 and b[3] > 150)]
        
        if p_idx == 0:
            def sort_p1(b):
                x, y, bw, bh = b
                if y < 80: row = 0
                elif y < 160: row = 1
                elif y < 245: row = 2
                elif y < 330: row = 3
                elif y < 415: row = 4
                else: row = 5
                return (row, x)
            boxes.sort(key=sort_p1)
        else:
            def sort_p2(b):
                x, y, bw, bh = b
                if y < 80: row = 0
                elif y < 160: row = 1
                elif y < 240: row = 2
                elif y < 330: row = 3
                elif y < 415: row = 4
                elif y < 510: row = 5
                else: row = 6
                return (row, x)
            boxes.sort(key=sort_p2)
            
        for x, y, bw, bh in boxes:
            card_raw = im[y:y+bh, x:x+bw]
            diff_bg = np.max(np.abs(card_raw.astype(float) - bg), axis=2)
            card_clean = card_raw.copy()
            card_clean[diff_bg < 35] = [255, 255, 255]
            
            # Find the badge: colored region on left (x < 65)
            chroma = np.max(card_clean, axis=2) - np.min(card_clean, axis=2)
            badge_mask = (chroma > 20)
            badge_mask[:, 65:] = False
            
            bcnts, _ = cv2.findContours(badge_mask.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            if bcnts:
                bx, by, bbw, bbh = cv2.boundingRect(max(bcnts, key=cv2.contourArea))
                badge_crop = card_clean[max(0, by-1):min(bh, by+bbh+1), max(0, bx-1):min(bw, bx+bbw+1)]
                text_st = min(bw, bx + bbw + 1)
                text_crop = card_clean[:, text_st:]
            else:
                badge_crop = card_clean[:, :50]
                text_crop = card_clean[:, 50:]
                
            card_clean = cv2.copyMakeBorder(card_clean, 4, 4, 4, 4, cv2.BORDER_CONSTANT, value=[255, 255, 255])
            badge_crop = cv2.copyMakeBorder(badge_crop, 4, 4, 4, 4, cv2.BORDER_CONSTANT, value=[255, 255, 255])
                
            cells.append({
                "full": card_clean,
                "illust": badge_crop,
                "text": text_crop
            })
            
    return cells

def extract_daily_life(p1_path, p2_path):
    cells = []
    im1 = cv2.imread(p1_path)
    rows1 = [(37, 128), (144, 245), (252, 353), (360, 461), (469, 560), (578, 668)]
    cols = [(20, 540), (560, 1080)]
    
    for r_idx, (y1, y2) in enumerate(rows1):
        for c_idx, (x1, x2) in enumerate(cols):
            if r_idx == 5 and c_idx == 1:
                continue
            card_raw = im1[y1:y2+1, x1:x2+1]
            illust, text = split_horizontal_card(card_raw)
            cells.append({"full": card_raw, "illust": illust, "text": text})
            
    im2 = cv2.imread(p2_path)
    rows2 = [(37, 128), (145, 236), (253, 344), (361, 453), (469, 561)]
    for y1, y2 in rows2:
        for x1, x2 in cols:
            card_raw = im2[y1:y2+1, x1:x2+1]
            illust, text = split_horizontal_card(card_raw)
            cells.append({"full": card_raw, "illust": illust, "text": text})
            
    return cells

def extract_when_how_often(p1, p2, p4):
    cells = []
    # 1. Standard cards from p1 (morning, afternoon, evening, night)
    cells.extend(extract_standard_poster(p1))
    
    # 2. Days of week from p2 (Sunday through Saturday: 3 in row 0, 3 in row 1, 1 in row 2)
    im2 = cv2.imread(p2)
    day_boxes = [
        # Row 0: Sunday, Monday, Tuesday
        (15, 105, 15, 390), (15, 105, 400, 745), (15, 105, 750, 1095),
        # Row 1: Wednesday, Thursday, Friday
        (105, 195, 15, 390), (105, 195, 400, 745), (105, 195, 750, 1095),
        # Row 2: Saturday
        (195, 285, 15, 390)
    ]
    for y1, y2, x1, x2 in day_boxes:
        card = im2[y1:y2, x1:x2]
        h, w = card.shape[:2]
        is_nw = np.any(card < 235, axis=2)
        col_ink = np.sum(is_nw, axis=0)
        min_x = 115 + int(np.argmin(col_ink[115:150]))
        cells.append({
            "full": card,
            "illust": card[:, :min_x],
            "text": card[:, min_x:]
        })
        
    # 3. Adverbs from p4 (always, usually, sometimes, never: 4 horizontal strip cards)
    im4 = cv2.imread(p4)
    adverb_rows = [(65, 138), (143, 215), (220, 293), (297, 370)]
    for y1, y2 in adverb_rows:
        card = im4[y1:y2, 20:1080]
        text = card[:, :170]
        illust = card[:, 170:]
        cells.append({
            "full": card,
            "illust": illust,
            "text": text
        })
        
    return cells

def extract_g5_months_days(p1, p2):
    cells = []
    # 1. 12 months from p1
    cells.extend(extract_standard_poster(p1))
    
    # 2. 7 days from p2
    im2 = cv2.imread(p2)
    day_cols = [(16, 169), (173, 322), (325, 474), (477, 626), (629, 778), (781, 930), (933, 1095)]
    for x1, x2 in day_cols:
        card = im2[74:114, x1+1:x2]
        cells.append({"full": card, "illust": card, "text": card})
        
    return cells

def extract_g5_directions(p):
    im = cv2.imread(p)
    bg = detect_bg_color(im)
    cells = []
    # Row 0: 4 columns (on, in, under, by)
    r0_cols = [(6, 276), (280, 553), (558, 831), (835, 1114)]
    for x1, x2 in r0_cols:
        card = clean_card_borders(im[6:197, x1:x2], bg)
        illust, text = split_card(card)
        cells.append({"full": card, "illust": illust, "text": text})
        
    # Row 1: 4 columns (go straight, turn right, turn left, stop)
    r1_cols = [(6, 276), (280, 553), (558, 831), (835, 1114)]
    for x1, x2 in r1_cols:
        card = clean_card_borders(im[204:395, x1:x2], bg)
        illust, text = split_card(card)
        cells.append({"full": card, "illust": illust, "text": text})
        
    # Row 2: 2 columns (corner, block)
    r2_cols = [(6, 276), (280, 553)]
    for x1, x2 in r2_cols:
        card = clean_card_borders(im[402:593, x1:x2], bg)
        illust, text = split_card(card)
        cells.append({"full": card, "illust": illust, "text": text})
        
    return cells

def extract_g5_operations(p):
    im = cv2.imread(p)
    cells = []
    rows = [(7, 146), (155, 293), (302, 441), (450, 588)]
    for y1, y2 in rows:
        r_img = im[y1:y2, 6:1114]
        illust = r_img[:, 6:165]
        verb = r_img[35:110, 165:310]
        p1 = r_img[10:75, 330:720]
        p2 = r_img[75:138, 330:720]
        
        for p_strip in [p1, p2]:
            ih, iw = illust.shape[:2]
            vh, vw = verb.shape[:2]
            ph, pw = p_strip.shape[:2]
            
            cw = iw + vw + pw + 20
            ch = max(ih, vh, ph)
            card_full = np.full((ch, cw, 3), 255, dtype=np.uint8)
            card_full[:ih, :iw] = illust
            vy = (ch - vh) // 2
            card_full[vy:vy+vh, iw:iw+vw] = verb
            py = (ch - ph) // 2
            card_full[py:py+ph, iw+vw:iw+vw+pw] = p_strip
            
            tw = vw + pw + 10
            th = max(vh, ph)
            card_text = np.full((th, tw, 3), 255, dtype=np.uint8)
            card_text[:vh, :vw] = verb
            card_text[:ph, vw+10:vw+10+pw] = p_strip
            
            cells.append({
                "full": card_full,
                "illust": illust,
                "text": card_text
            })
            
    return cells

def extract_g6_body(p):
    im = cv2.imread(p)
    # 15 body parts matching exact vocabulary.json order:
    # ['head', 'neck', 'shoulder', 'hand', 'leg', 'ear', 'eye', 'nose', 'mouth', 'tail', 'fur', 'wing', 'feather', 'shell', 'horn']
    body_definitions = [
        ("head", (180, 40, 480, 130), (362, 69, 108, 30)),
        ("neck", (40, 95, 300, 160), (48, 111, 105, 30)),
        ("shoulder", (200, 115, 515, 185), (341, 137, 165, 30)),
        ("hand", (240, 190, 455, 290), (335, 251, 108, 30)),
        ("leg", (40, 190, 260, 320), (48, 247, 83, 39)),
        ("ear", (740, 20, 930, 110), (828, 39, 87, 20)),
        ("eye", (610, 80, 780, 160), (624, 113, 87, 29)),
        ("nose", (580, 150, 750, 245), (598, 214, 106, 20)),
        ("mouth", (590, 220, 770, 320), (603, 280, 132, 30)),
        ("tail", (850, 40, 1085, 135), (993, 83, 82, 30)),
        ("fur", (750, 110, 1085, 210), (993, 159, 82, 30)),
        ("wing", (70, 350, 385, 460), (261, 419, 112, 29)),
        ("feather", (120, 420, 420, 520), (261, 477, 149, 30)),
        ("shell", (450, 370, 795, 525), (682, 411, 103, 30)),
        ("horn", (840, 350, 1045, 525), (931, 366, 105, 30))
    ]
    cells = []
    for name, (x1, y1, x2, y2), (lx, ly, lw, lh) in body_definitions:
        full_card = im[y1:y2, x1:x2]
        text_card = im[ly-2:ly+lh+2, lx-2:lx+lw+2]
        illust_card = full_card.copy()
        cells.append({
            "full": full_card,
            "illust": illust_card,
            "text": text_card
        })
    return cells

def get_cells_for_unit(grade, u_idx):
    if grade == 5:
        if u_idx == 11:
            return extract_g5_months_days(
                os.path.join(POSTERS_DIR, "eigo5", "u11_p11_1.png"),
                os.path.join(POSTERS_DIR, "eigo5", "u11_p11_2.png")
            )
        elif u_idx == 21:
            return extract_g5_directions(os.path.join(POSTERS_DIR, "eigo5", "u11_p21.png"))
        elif u_idx == 22:
            return extract_g5_operations(os.path.join(POSTERS_DIR, "eigo5", "u11_p22.png"))
        elif u_idx == 25:
            return extract_numbers_poster(
                os.path.join(POSTERS_DIR, "eigo5", "u11_p25_1.png"),
                os.path.join(POSTERS_DIR, "eigo5", "u11_p25_2.png")
            )
        else:
            pfiles = G5_POSTER_MAP.get(u_idx, [])
            cells = []
            for pf in pfiles:
                cells.extend(extract_standard_poster(os.path.join(POSTERS_DIR, "eigo5", pf)))
            return cells
    else:
        if u_idx == 4:
            return extract_standard_poster(os.path.join(POSTERS_DIR, "eigo6", "u11_p4_1.png"))
        elif u_idx == 5:
            return extract_standard_poster(os.path.join(POSTERS_DIR, "eigo6", "u11_p5_1.png"))
        elif u_idx == 7:
            return extract_when_how_often(
                os.path.join(POSTERS_DIR, "eigo6", "u11_p7_1.png"),
                os.path.join(POSTERS_DIR, "eigo6", "u11_p7_2.png"),
                os.path.join(POSTERS_DIR, "eigo6", "u11_p7_4.png")
            )
        elif u_idx == 8:
            return extract_daily_life(
                os.path.join(POSTERS_DIR, "eigo6", "u11_p8_1.png"),
                os.path.join(POSTERS_DIR, "eigo6", "u11_p8_2.png")
            )
        elif u_idx == 12:
            return extract_g6_body(os.path.join(POSTERS_DIR, "eigo6", "u11_p12.png"))
        elif u_idx == 19:
            return extract_numbers_poster(
                os.path.join(POSTERS_DIR, "eigo6", "u11_p20_1.png"),
                os.path.join(POSTERS_DIR, "eigo6", "u11_p20_2.png")
            )
        else:
            pfiles = G6_POSTER_MAP.get(u_idx, [])
            cells = []
            for pf in pfiles:
                cells.extend(extract_standard_poster(os.path.join(POSTERS_DIR, "eigo6", pf)))
            return cells

def run_slicing_pipeline():
    print("=" * 70)
    print("RUNNING HERE WE GO FLASHCARD SLICING PIPELINE (VISION BOOST V2)")
    print("=" * 70)

    sliced_card_catalog = {}
    total_sliced = 0

    for grade in [5, 6]:
        g_tag = f"ES_G{grade}"
        g_key = f"grade{grade}"
        units = hwg_data.get(g_key, {})
        print(f"\n[{grade-4}/2] Slicing Grade {grade} Posters...")
        
        for u_idx, (u_name, word_list) in enumerate(units.items(), start=1):
            cells = get_cells_for_unit(grade, u_idx)
            unit_sliced = 0
            
            for w_idx, w_obj in enumerate(word_list):
                w_en = w_obj["en"].strip()
                w_id = re.sub(r'[^a-zA-Z0-9_-]', '_', w_obj.get("id", w_en.lower()))
                card_id = f"hwg{grade}_u{u_idx:02d}_{w_idx:02d}_{w_id}"
                
                if w_idx < len(cells):
                    cell = cells[w_idx]
                    full_fn = f"{card_id}_full.png"
                    illust_fn = f"{card_id}_illust.png"
                    text_fn = f"{card_id}_text.png"
                    
                    cv2.imwrite(os.path.join(FULL_CARDS_DIR, full_fn), cell["full"])
                    cv2.imwrite(os.path.join(ILLUST_CARDS_DIR, illust_fn), cell["illust"])
                    cv2.imwrite(os.path.join(TEXT_CARDS_DIR, text_fn), cell["text"])
                    
                    sliced_card_catalog[card_id] = {
                        "grade": g_tag,
                        "unit": u_name,
                        "unit_num": u_idx,
                        "english": w_en,
                        "card_full": f"cards/full/{full_fn}",
                        "card_illust": f"cards/illustration/{illust_fn}",
                        "card_text": f"cards/text/{text_fn}"
                    }
                    total_sliced += 1
                    unit_sliced += 1
                else:
                    print(f"  [ERROR] Missing cell for {card_id} in {u_name}!")
                    
            print(f"  ✓ G{grade} Unit {u_idx:02d} [{u_name[:28]}]: {unit_sliced}/{len(word_list)} cards sliced")

    with open(CATALOG_PATH, "w", encoding="utf-8") as f:
        json.dump(sliced_card_catalog, f, ensure_ascii=False, indent=2)

    print("\n" + "=" * 70)
    print("SLICING COMPLETE!")
    print(f"Total Flashcards Generated: {total_sliced} / 756")
    print(f"Cards Saved in: 'manabi_assets/cards/' (full, illustration, and text)")
    print(f"Catalog saved to: '{CATALOG_PATH}'")
    print("=" * 70)
    return total_sliced

if __name__ == '__main__':
    run_slicing_pipeline()
