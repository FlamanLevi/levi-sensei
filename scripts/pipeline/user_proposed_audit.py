import os
import sys
import cv2
import numpy as np

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = r"E:\Levi-Sensei Images\Let's Try (Grade 3 & 4)"
CURRENT_DIR = r"c:\Antigravity\levi-sensei (new)\trimmed_assets\letstry_images"

ENGINES = {
    "current": CURRENT_DIR,
    "cropped": os.path.join(BASE_DIR, "Let's Try (Cropped)"),
    "lanczos": os.path.join(BASE_DIR, "Let's Try (Lanczos_4x)"),
    "ultrasharp": os.path.join(BASE_DIR, "Let's Try (Ultrasharp_4x)"),
    "realcugan": os.path.join(BASE_DIR, "Let's Try (Realcugan_4x)"),
    "animesharp": os.path.join(BASE_DIR, "Let's Try (Animesharp_4x)"),
}

# Grouped by category so we can aggregate winners per art style
CATEGORIES = {
    "1. Shapes (Flat Geometry)": [
        "dic_3_card_circle_2094_1_c",
        "dic_3_card_star_2097_1_c",
        "dic_3_card_heart_2098_1_c",
    ],
    "2. Alphabet (Typography)": [
        "dic_3_card_a_2068_1_c",
        "dic_3_card_b_2069_1_c",
        "dic_3_card_s_2086_1_c",
    ],
    "3. Numbers (Numerals)": [
        "dic_3_card_five_2005_1_c",
        "dic_3_card_eight_2008_1_c",
        "dic_3_card_twenty_2020_1_c",
    ],
    "4. Characters & Animals (Line Art + Fill)": [
        "dic_3_card_baseball_2034_1_c",
        "dic_3_card_dragon_2132_1_c",
        "dic_3_card_monkey_2135_1_c",
        "dic_3_card_cat_2128_1_c",
    ],
    "5. Food & Objects (Textbook Illustrations)": [
        "dic_3_card_melon_2054_1_c",
        "dic_4_card_pizza_2046_1_c",
        "dic_4_card_icecream_2048_1_c",
    ],
    "6. Action Scenes (Detailed Wordbook Art)": [
        "dic_wb_01action_run_1029_1_c",
        "dic_wb_01action_eat_1010_1_c",
        "dic_wb_01action_jump_1016_1_c",
    ],
}

EVAL_ENGINES = ["current", "lanczos", "ultrasharp", "realcugan", "animesharp"]


def load_img_safe(engine_key, base_name):
    """Loads image safely (handles Windows Unicode paths & composites RGBA onto white)."""
    folder = ENGINES[engine_key]
    for ext in ['.webp', '.png', '.svg', '.jpg']:
        path = os.path.join(folder, base_name + ext)
        if os.path.exists(path):
            size_bytes = os.path.getsize(path)
            if ext == '.svg':
                return None, ext, size_bytes
            
            # np.fromfile avoids OpenCV Windows path encoding bugs
            raw_bytes = np.fromfile(path, dtype=np.uint8)
            im = cv2.imdecode(raw_bytes, cv2.IMREAD_UNCHANGED)
            if im is None:
                continue

            # If RGBA, composite onto a pure white (255, 255, 255) background
            if im.ndim == 3 and im.shape[2] == 4:
                alpha = im[:, :, 3:4].astype(np.float32) / 255.0
                bgr = im[:, :, :3].astype(np.float32)
                white_bg = np.full_like(bgr, 255.0)
                im = (bgr * alpha + white_bg * (1.0 - alpha)).astype(np.uint8)
            elif im.ndim == 2:
                im = cv2.cvtColor(im, cv2.COLOR_GRAY2BGR)

            return im, ext, size_bytes
    return None, None, 0


def compute_metrics(im, ref_lanczos=None):
    """Computes illustration-specific quality metrics."""
    gray = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY)
    
    # 1. Edge Acutance (99th percentile Sobel gradient magnitude) -> Higher = crisper lines
    gx = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
    gy = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
    grad_mag = np.hypot(gx, gy)
    edge_sharpness = float(np.percentile(grad_mag, 99))

    # 2. Flat-Fill Chatter / Micro-Noise (High-frequency deviation in non-edge regions) -> Lower = cleaner fills
    non_edge_mask = grad_mag < np.percentile(grad_mag, 85)
    smoothed = cv2.medianBlur(im, 3)
    diff = np.abs(im.astype(np.float32) - smoothed.astype(np.float32)).mean(axis=2)
    fill_noise = float(np.mean(diff[non_edge_mask])) if np.any(non_edge_mask) else 0.0

    # 3. Background Purity (% of pixels >= 250) -> Higher = cleaner white background
    white_pct = float(np.mean(gray >= 250) * 100.0)

    # 4. Near-White Halo / Ringing Noise (% of pixels in 235..249) -> Lower = less ringing/paper dirt
    halo_noise_pct = float(np.mean((gray >= 235) & (gray < 250)) * 100.0)

    # 5. Ink Darkness (Darkest 5% of FOREGROUND pixels < 240, fallback to 1st percentile) -> Lower = deeper black ink
    fg_pixels = gray[gray < 240]
    if len(fg_pixels) > 20:
        sorted_fg = np.sort(fg_pixels)
        dark_ink = float(np.mean(sorted_fg[:max(1, int(len(sorted_fg) * 0.05))]))
    else:
        dark_ink = float(np.percentile(gray, 1))

    # 6. Structural Fidelity vs Lanczos 4x (PSNR in dB) -> Higher = less geometry warping/hallucination
    psnr_vs_lanczos = 0.0
    if ref_lanczos is not None and im.shape == ref_lanczos.shape:
        psnr_vs_lanczos = float(cv2.PSNR(im, ref_lanczos))

    return {
        "edge_sharp": edge_sharpness,
        "fill_noise": fill_noise,
        "white_bg": white_pct,
        "halo_noise": halo_noise_pct,
        "dark_ink": dark_ink,
        "psnr_lanczos": psnr_vs_lanczos,
    }


print("=" * 105)
print("🔍 AUDITING LET'S TRY SUITE: ILLUSTRATION-SPECIFIC IQA METRICS")
print("=" * 105)

category_summary = {cat: {eng: [] for eng in EVAL_ENGINES} for cat in CATEGORIES}

for cat_name, samples in CATEGORIES.items():
    print(f"\n📂 CATEGORY: {cat_name}")
    print("-" * 105)
    for sample in samples:
        print(f"👉 {sample}")
        lanczos_im, _, _ = load_img_safe("lanczos", sample)

        for eng in EVAL_ENGINES:
            im, ext, size_bytes = load_img_safe(eng, sample)
            if im is None:
                if ext == '.svg':
                    print(f"  • {eng.upper():10} | [VECTOR SVG] ({size_bytes/1024:5.1f}KB) - Infinite resolution")
                continue

            h, w = im.shape[:2]
            m = compute_metrics(im, ref_lanczos=lanczos_im if eng != "lanczos" else None)
            category_summary[cat_name][eng].append(m)

            psnr_str = f"{m['psnr_lanczos']:5.1f}dB" if m['psnr_lanczos'] > 0 else "  REF  "
            print(
                f"  • {eng.upper():10} | {w:4}x{h:<4} | {size_bytes/1024:6.1f}KB "
                f"| EdgeSharp: {m['edge_sharp']:6.1f} | FillNoise: {m['fill_noise']:4.2f} "
                f"| Halo: {m['halo_noise']:4.2f}% | Ink: {m['dark_ink']:4.1f} | vsLanczos: {psnr_str}"
            )

print("\n" + "=" * 105)
print("🏆 CATEGORY AVERAGES (4x AI ENGINES: HIGHER EdgeSharp/vsLanczos IS BETTER | LOWER FillNoise/Halo/Ink IS BETTER)")
print("=" * 105)

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
        avg_psnr = np.mean([r["psnr_lanczos"] for r in rows])
        psnr_disp = f"{avg_psnr:5.1f}dB" if eng != "lanczos" else "  REF  "

        print(
            f"  • {eng.upper():10} -> EdgeSharp: {avg_edge:6.1f} | FillNoise: {avg_fill:4.2f} "
            f"| HaloNoise: {avg_halo:4.2f}% | DarkInk: {avg_ink:4.1f} | Fidelity: {psnr_disp}"
        )
