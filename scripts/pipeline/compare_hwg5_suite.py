import os
import sys
import cv2
import numpy as np
import re

sys.stdout.reconfigure(encoding='utf-8')

BASE_E = "E:/Levi-Sensei Images/Here We Go 5"
ENGINES = {
    "realcugan": os.path.join(BASE_E, "Here We Go 5 (Realcugan_4x)"),
    "animesharp": os.path.join(BASE_E, "Here We Go 5 (Animesharp_4x)"),
    "ultrasharp": os.path.join(BASE_E, "Here We Go 5 (Ultrasharp_4x)"),
    "lanczos": os.path.join(BASE_E, "Here We Go 5 (Lanczos_4x)"),
    "vector": os.path.join(BASE_E, "Here We Go 5 (Vector)"),
    "cropped": os.path.join(BASE_E, "Here We Go 5 (Cropped_pre_upscale)"),
}

# 10 Representative Test Suites across the 24 thematic units
TEST_SUITE = {
    "1. Feelings & Faces (Line Art & Fills)": [
        ("01_1   気持ちなど", "u11_p1_item_01"), # fine / happy
        ("01_1   気持ちなど", "u11_p1_item_02"),
        ("01_1   気持ちなど", "u11_p1_item_05"), # sleepy
    ],
    "2. Weather & Graphic Symbols": [
        ("02_2   天気", "u11_p2_item_01"), # sunny
        ("02_2   天気", "u11_p2_item_02"), # cloudy
        ("02_2   天気", "u11_p2_item_03"), # rainy
    ],
    "3. Colors & Shapes (Geometry)": [
        ("03_3   色、形", "u11_p3_1_item_01"),
        ("03_3   色、形", "u11_p3_1_item_05"),
        ("03_3   色、形", "u11_p3_2_item_03") if os.path.exists(os.path.join(ENGINES['realcugan'], "03_3   色、形", "u11_p3_2_item_03.webp")) else ("03_3   色、形", "u11_p3_1_item_02"),
    ],
    "4. Sports & Actions (Human Figures)": [
        ("04_4   スポーツ", "u11_p4_item_01"), # baseball/soccer
        ("04_4   スポーツ", "u11_p4_item_03"),
        ("15_15   できること、できないこと", "u11_p15_1_item_01"), # swim/run
    ],
    "5. Animals (Fur & Organic Detail)": [
        ("05_5   動物", "u11_p5_item_01"), # dog
        ("05_5   動物", "u11_p5_item_02"), # cat
        ("05_5   動物", "u11_p5_item_04"), # bear/rabbit
    ],
    "6. Foods & Dishes (Organic Colors)": [
        ("08_8   食べ物", "u11_p8_1_item_01"), # curry/steak
        ("08_8   食べ物", "u11_p8_1_item_03"),
        ("06_6   果物、野菜", "u11_p6_1_item_01"), # apple
    ],
    "7. Everyday Objects (Hard-Surface)": [
        ("12_12   身の回りのもの", "u11_p12_1_item_01"),
        ("12_12   身の回りのもの", "u11_p12_1_item_05"),
        ("12_12   身の回りのもの", "u11_p12_1_item_10"),
    ],
    "8. Occupations (Detailed Portraits)": [
        ("17_17   職業", "u11_p17_1_item_01"), # teacher/doctor
        ("17_17   職業", "u11_p17_1_item_03"),
        ("17_17   職業", "u11_p17_1_item_07"),
    ],
    "9. Town & Buildings (Architecture)": [
        ("19_19   町", "u11_p19_1_item_01"), # hospital/station
        ("19_19   町", "u11_p19_1_item_03"),
        ("19_19   町", "u11_p19_1_item_06"),
    ],
    "10. Nature & Scenery (Landscapes)": [
        ("20_20   自然", "u11_p20_1_item_01"), # mountain/sea
        ("20_20   自然", "u11_p20_1_item_03"),
        ("20_20   自然", "u11_p20_1_item_05"),
    ]
}

def load_img_safe(engine_key, folder_name, item_name):
    base_folder = ENGINES[engine_key]
    sub_path = os.path.join(base_folder, folder_name)
    for ext in ['.webp', '.png', '.svg', '.jpg']:
        p = os.path.join(sub_path, item_name + ext)
        if os.path.exists(p):
            sz = os.path.getsize(p)
            if ext == '.svg':
                return None, ext, sz
            raw_bytes = np.fromfile(p, dtype=np.uint8)
            im = cv2.imdecode(raw_bytes, cv2.IMREAD_UNCHANGED)
            if im is None:
                continue
            if im.ndim == 3 and im.shape[2] == 4:
                alpha = im[:, :, 3:4].astype(np.float32) / 255.0
                bgr = im[:, :, :3].astype(np.float32)
                im = (bgr * alpha + 255.0 * (1.0 - alpha)).astype(np.uint8)
            elif im.ndim == 2:
                im = cv2.cvtColor(im, cv2.COLOR_GRAY2BGR)
            return im, ext, sz
    return None, None, 0

def compute_metrics(im, ref_lanczos=None):
    gray = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY)
    
    # 1. Edge Acutance (99th percentile Sobel gradient magnitude)
    gx = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
    gy = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
    grad_mag = np.hypot(gx, gy)
    edge_sharp = float(np.percentile(grad_mag, 99))
    
    # 2. Flat-fill chatter / micro-noise
    non_edge = grad_mag < np.percentile(grad_mag, 85)
    smoothed = cv2.medianBlur(im, 3)
    diff = np.abs(im.astype(np.float32) - smoothed.astype(np.float32)).mean(axis=2)
    fill_noise = float(np.mean(diff[non_edge])) if np.any(non_edge) else 0.0
    
    # 3. Background purity (% >= 250)
    white_pct = float(np.mean(gray >= 250) * 100.0)
    
    # 4. Halo ringing noise (235..249)
    halo_pct = float(np.mean((gray >= 235) & (gray < 250)) * 100.0)
    
    # 5. Deepest dark ink
    fg = gray[gray < 240]
    if len(fg) > 20:
        sorted_fg = np.sort(fg)
        dark_ink = float(np.mean(sorted_fg[:max(1, int(len(sorted_fg) * 0.05))]))
    else:
        dark_ink = float(np.percentile(gray, 1))
        
    # 6. PSNR vs Lanczos
    psnr = 0.0
    if ref_lanczos is not None and im.shape == ref_lanczos.shape:
        psnr = float(cv2.PSNR(im, ref_lanczos))
        
    return {
        "edge_sharp": edge_sharp,
        "fill_noise": fill_noise,
        "white_bg": white_pct,
        "halo_noise": halo_pct,
        "dark_ink": dark_ink,
        "psnr_lanczos": psnr
    }

print("=" * 115)
print("🔬 AUDITING HERE WE GO 5: COMPREHENSIVE IQA SUITE ACROSS ALL ENGINES")
print("=" * 115)

category_summary = {cat: {eng: [] for eng in ["lanczos", "ultrasharp", "realcugan", "animesharp"]} for cat in TEST_SUITE}

for cat_name, items in TEST_SUITE.items():
    print(f"\n📂 CATEGORY: {cat_name}")
    print("-" * 115)
    for fld, it_name in items:
        lanc_im, _, _ = load_img_safe("lanczos", fld, it_name)
        if lanc_im is None:
            continue
            
        print(f"👉 [{fld}] {it_name}")
        
        # Check Vector SVG size
        _, _, v_sz = load_img_safe("vector", fld, it_name)
        if v_sz > 0:
            print(f"  • VECTOR     | [SVG] | {v_sz/1024:6.1f} KB | Infinite Resolution Math Curves")
            
        for eng in ["lanczos", "ultrasharp", "realcugan", "animesharp"]:
            im, ext, sz = load_img_safe(eng, fld, it_name)
            if im is None:
                continue
            h, w = im.shape[:2]
            m = compute_metrics(im, ref_lanczos=lanc_im if eng != "lanczos" else None)
            category_summary[cat_name][eng].append(m)
            
            psnr_str = f"{m['psnr_lanczos']:5.1f} dB" if m['psnr_lanczos'] > 0 else "   REF   "
            print(
                f"  • {eng.upper():10} | {w:4}x{h:<4} | {sz/1024:6.1f} KB | "
                f"EdgeSharp: {m['edge_sharp']:6.1f} | FillNoise: {m['fill_noise']:4.2f} | "
                f"Halo: {m['halo_noise']:4.2f}% | Ink: {m['dark_ink']:4.1f} | vsLanczos: {psnr_str}"
            )

print("\n" + "=" * 115)
print("🏆 CATEGORY AGGREGATES (HIGHER EdgeSharp/vsLanczos IS BETTER | LOWER FillNoise/Halo/Ink IS BETTER)")
print("=" * 115)

for cat_name, eng_dict in category_summary.items():
    print(f"\n📊 {cat_name}")
    for eng in ["lanczos", "ultrasharp", "realcugan", "animesharp"]:
        rows = eng_dict[eng]
        if not rows:
            continue
        avg_edge = np.mean([r["edge_sharp"] for r in rows])
        avg_fill = np.mean([r["fill_noise"] for r in rows])
        avg_halo = np.mean([r["halo_noise"] for r in rows])
        avg_ink  = np.mean([r["dark_ink"] for r in rows])
        avg_p    = np.mean([r["psnr_lanczos"] for r in rows])
        p_str    = f"{avg_p:5.1f} dB" if eng != "lanczos" else "   REF   "
        
        print(
            f"  • {eng.upper():10} -> EdgeSharp: {avg_edge:6.1f} | FillNoise: {avg_fill:4.2f} | "
            f"HaloNoise: {avg_halo:4.2f}% | DarkInk: {avg_ink:4.1f} | Fidelity: {p_str}"
        )

print("=" * 115)
