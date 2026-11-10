import os
import sys
import cv2
import numpy as np

sys.stdout.reconfigure(encoding='utf-8')

BASE_E = "E:/Levi-Sensei Images/Here We Go 5"
ENGINES = {
    "cropped": os.path.join(BASE_E, "Here We Go 5 (Cropped_pre_upscale)"),
    "lanczos": os.path.join(BASE_E, "Here We Go 5 (Lanczos_4x)"),
    "realcugan": os.path.join(BASE_E, "Here We Go 5 (Realcugan_4x)"),
    "animesharp": os.path.join(BASE_E, "Here We Go 5 (Animesharp_4x)"),
    "ultrasharp": os.path.join(BASE_E, "Here We Go 5 (Ultrasharp_4x)"),
    "vector": os.path.join(BASE_E, "Here We Go 5 (Vector)"),
}

TEST_SUITE = {
    "1. Feelings & Faces (Soft Shading & Expressions)": [
        ("01_1   気持ちなど", "u11_p1_item_01"),
        ("01_1   気持ちなど", "u11_p1_item_02"),
        ("01_1   気持ちなど", "u11_p1_item_05"),
    ],
    "2. Weather & Graphic Symbols (Clouds & Gradients)": [
        ("02_2   天気", "u11_p2_item_01"),
        ("02_2   天気", "u11_p2_item_02"),
        ("02_2   天気", "u11_p2_item_03"),
    ],
    "3. Colors & Shapes (Flat Swatches & Geometry)": [
        ("03_3   色、形", "u11_p3_1_item_01"),
        ("03_3   色、形", "u11_p3_1_item_05"),
        ("03_3   色、形", "u11_p3_2_item_03"),
    ],
    "4. Sports & Actions (Dynamic Human Figures)": [
        ("04_4   スポーツ", "u11_p4_item_01"),
        ("04_4   スポーツ", "u11_p4_item_03"),
        ("15_15   できること、できないこと", "u11_p15_1_item_01"),
    ],
    "5. Animals (Fur & Organic Gradients)": [
        ("05_5   動物", "u11_p5_item_01"),
        ("05_5   動物", "u11_p5_item_02"),
        ("05_5   動物", "u11_p5_item_04"),
    ],
    "6. Foods & Dishes (Painterly Textures & Plates)": [
        ("08_8   食べ物", "u11_p8_1_item_01"),
        ("08_8   食べ物", "u11_p8_1_item_03"),
        ("06_6   果物、野菜", "u11_p6_1_item_01"),
    ],
    "7. Everyday Objects (Hard-Surface Props)": [
        ("12_12   身の回りのもの", "u11_p12_1_item_01"),
        ("12_12   身の回りのもの", "u11_p12_1_item_05"),
        ("12_12   身の回りのもの", "u11_p12_1_item_10"),
    ],
    "8. Occupations (Detailed Portraits & Uniforms)": [
        ("17_17   職業", "u11_p17_1_item_01"),
        ("17_17   職業", "u11_p17_1_item_03"),
        ("17_17   職業", "u11_p17_1_item_07"),
    ],
    "9. Town & Buildings (Architectural Lines)": [
        ("19_19   町", "u11_p19_1_item_01"),
        ("19_19   町", "u11_p19_1_item_03"),
        ("19_19   町", "u11_p19_1_item_06"),
    ],
    "10. Nature & Scenery (Full-Bleed Landscapes)": [
        ("20_20   自然", "u11_p20_1_item_01"),
        ("20_20   自然", "u11_p20_1_item_03"),
        ("20_20   自然", "u11_p20_1_item_05"),
    ],
}

AI_ENGINES = ["lanczos", "realcugan", "animesharp", "ultrasharp"]


def load_img_safe(engine_key, folder_name, item_name):
    """Loads image safely with Unicode path support and returns (bgr, alpha_mask, ext, size_bytes)."""
    base_folder = ENGINES[engine_key]
    sub_path = os.path.join(base_folder, folder_name)
    for ext in ['.webp', '.png', '.svg', '.jpg']:
        p = os.path.join(sub_path, item_name + ext)
        if os.path.exists(p):
            sz = os.path.getsize(p)
            if ext == '.svg':
                return None, None, ext, sz
            raw_bytes = np.fromfile(p, dtype=np.uint8)
            im = cv2.imdecode(raw_bytes, cv2.IMREAD_UNCHANGED)
            if im is None:
                continue
            alpha_fg = None
            if im.ndim == 3 and im.shape[2] == 4:
                alpha_channel = im[:, :, 3]
                if np.any(alpha_channel < 250):
                    alpha_fg = alpha_channel > 15  # True foreground from PNG/WebP transparency
                alpha = alpha_channel[:, :, None].astype(np.float32) / 255.0
                bgr = im[:, :, :3].astype(np.float32)
                im = (bgr * alpha + 255.0 * (1.0 - alpha)).astype(np.uint8)
            elif im.ndim == 2:
                im = cv2.cvtColor(im, cv2.COLOR_GRAY2BGR)
            return im, alpha_fg, ext, sz
    return None, None, None, 0


def align_masks_to_engine(im, ref, pad=24):
    """Aligns 4x reference masks to the target engine canvas (handles 1-4px post-upscale auto-trim differences)."""
    h, w = im.shape[:2]
    lanc_pad = ref["lanc_pad"]
    if h <= lanc_pad.shape[0] and w <= lanc_pad.shape[1]:
        res = cv2.matchTemplate(lanc_pad, im, cv2.TM_CCOEFF_NORMED)
        _, _, _, max_loc = cv2.minMaxLoc(res)
        x0, y0 = max_loc
        return {
            "fg_mask": ref["fg_mask_pad"][y0:y0+h, x0:x0+w],
            "edge_mask": ref["edge_mask_pad"][y0:y0+h, x0:x0+w],
            "gentle_grad_mask": ref["gentle_grad_mask_pad"][y0:y0+h, x0:x0+w],
            "halo_zone_mask": ref["halo_zone_mask_pad"][y0:y0+h, x0:x0+w],
        }
    return {
        "fg_mask": cv2.resize(ref["fg_mask"].astype(np.uint8), (w, h), interpolation=cv2.INTER_NEAREST) > 0,
        "edge_mask": cv2.resize(ref["edge_mask"].astype(np.uint8), (w, h), interpolation=cv2.INTER_NEAREST) > 0,
        "gentle_grad_mask": cv2.resize(ref["gentle_grad_mask"].astype(np.uint8), (w, h), interpolation=cv2.INTER_NEAREST) > 0,
        "halo_zone_mask": cv2.resize(ref["halo_zone_mask"].astype(np.uint8), (w, h), interpolation=cv2.INTER_NEAREST) > 0,
    }


def compute_aligned_cycle_psnr(im, crop_bgr):
    """Downscales 4x output by 0.25x and aligns inside 1x padded crop_bgr to measure true 1x cycle PSNR."""
    h1, w1 = max(1, int(round(im.shape[0] / 4.0))), max(1, int(round(im.shape[1] / 4.0)))
    downscaled_1x = cv2.resize(im, (w1, h1), interpolation=cv2.INTER_AREA)
    pad1 = 32
    crop_pad = cv2.copyMakeBorder(crop_bgr, pad1, pad1, pad1, pad1, cv2.BORDER_CONSTANT, value=(255, 255, 255))
    if h1 <= crop_pad.shape[0] and w1 <= crop_pad.shape[1]:
        res = cv2.matchTemplate(crop_pad, downscaled_1x, cv2.TM_CCOEFF_NORMED)
        _, _, _, max_loc = cv2.minMaxLoc(res)
        x0, y0 = max_loc
        matched_crop = crop_pad[y0:y0+h1, x0:x0+w1]
        return float(cv2.PSNR(downscaled_1x, matched_crop))
    resized_1x = cv2.resize(im, (crop_bgr.shape[1], crop_bgr.shape[0]), interpolation=cv2.INTER_AREA)
    return float(cv2.PSNR(resized_1x, crop_bgr))


def build_hwg5_reference(crop_im, crop_alpha, lanc_im):
    """Builds spatial masks that respect internal white objects (clouds, plates, coats)."""
    h4, w4 = lanc_im.shape[:2]
    gray_lanc = cv2.cvtColor(lanc_im, cv2.COLOR_BGR2GRAY)

    # 1. Determine true background vs foreground
    if crop_alpha is not None:
        fg_mask = cv2.resize(crop_alpha.astype(np.uint8), (w4, h4), interpolation=cv2.INTER_NEAREST) > 0
        bg_mask = ~fg_mask
    else:
        # Flood-fill from outer border pixels >= 250 so internal white clouds/plates stay foreground
        near_white = (gray_lanc >= 250).astype(np.uint8)
        num_labels, labels = cv2.connectedComponents(near_white)
        border_labels = np.unique(np.concatenate([
            labels[0, :], labels[-1, :], labels[:, 0], labels[:, -1]
        ]))
        border_labels = border_labels[border_labels != 0]
        bg_mask = np.isin(labels, border_labels)
        fg_mask = ~bg_mask

    # Fallback if full-bleed landscape has no white border
    if np.mean(fg_mask) < 0.02:
        fg_mask = np.ones_like(gray_lanc, dtype=bool)
        bg_mask = np.zeros_like(gray_lanc, dtype=bool)

    # 2. Gradient map on Lanczos 4x reference
    gx = cv2.Sobel(gray_lanc, cv2.CV_64F, 1, 0, ksize=3)
    gy = cv2.Sobel(gray_lanc, cv2.CV_64F, 0, 1, ksize=3)
    grad_ref = np.hypot(gx, gy)

    # True structural edges (top 10% steepest gradients inside foreground)
    edge_thresh = np.percentile(grad_ref[fg_mask], 90) if np.any(fg_mask) else 20.0
    edge_mask = fg_mask & (grad_ref >= max(15.0, edge_thresh))
    ref_edge_sharp = float(np.percentile(grad_ref[edge_mask], 90)) if np.any(edge_mask) else 1.0

    # Gentle shading / gradient zone (smooth transitions inside artwork, e.g., cheeks, fur, skies)
    gentle_grad_mask = fg_mask & (grad_ref >= 2.0) & (grad_ref < max(15.0, edge_thresh * 0.6))

    # Outer 8px Halo Zone (only in border-connected background adjacent to artwork)
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (17, 17))
    dilated_fg = cv2.dilate(fg_mask.astype(np.uint8), kernel) > 0
    halo_zone_mask = dilated_fg & bg_mask & (gray_lanc >= 252)

    # Reference darkest 5% foreground tone from 1x cropped source (aligned to active foreground)
    h1, w1 = max(1, int(round(h4 / 4.0))), max(1, int(round(w4 / 4.0)))
    down_lanc = cv2.resize(lanc_im, (w1, h1), interpolation=cv2.INTER_AREA)
    pad1 = 32
    crop_pad = cv2.copyMakeBorder(crop_im, pad1, pad1, pad1, pad1, cv2.BORDER_CONSTANT, value=(255, 255, 255))
    res = cv2.matchTemplate(crop_pad, down_lanc, cv2.TM_CCOEFF_NORMED)
    _, _, _, max_loc = cv2.minMaxLoc(res)
    cx0, cy0 = max_loc
    crop_aligned = crop_pad[cy0:cy0+h1, cx0:cx0+w1]
    gray_crop = cv2.cvtColor(crop_aligned, cv2.COLOR_BGR2GRAY)
    fg_crop = cv2.resize(fg_mask.astype(np.uint8), (w1, h1), interpolation=cv2.INTER_NEAREST) > 0
    crop_fg_pixels = np.sort(gray_crop[fg_crop]) if np.any(fg_crop) else np.sort(gray_crop.flatten())
    ref_dark_tone = float(np.mean(crop_fg_pixels[:max(1, int(len(crop_fg_pixels) * 0.05))]))

    # Padded 4x reference and masks for sub-canvas alignment across AI engines
    pad4 = 24
    lanc_pad = cv2.copyMakeBorder(lanc_im, pad4, pad4, pad4, pad4, cv2.BORDER_CONSTANT, value=(255, 255, 255))
    fg_mask_pad = cv2.copyMakeBorder(fg_mask.astype(np.uint8), pad4, pad4, pad4, pad4, cv2.BORDER_CONSTANT, value=0) > 0
    edge_mask_pad = cv2.copyMakeBorder(edge_mask.astype(np.uint8), pad4, pad4, pad4, pad4, cv2.BORDER_CONSTANT, value=0) > 0
    gentle_grad_mask_pad = cv2.copyMakeBorder(gentle_grad_mask.astype(np.uint8), pad4, pad4, pad4, pad4, cv2.BORDER_CONSTANT, value=0) > 0
    halo_zone_mask_pad = cv2.copyMakeBorder(halo_zone_mask.astype(np.uint8), pad4, pad4, pad4, pad4, cv2.BORDER_CONSTANT, value=0) > 0

    return {
        "crop_bgr": crop_im,
        "lanc_bgr": lanc_im,
        "lanc_pad": lanc_pad,
        "fg_mask": fg_mask,
        "edge_mask": edge_mask,
        "gentle_grad_mask": gentle_grad_mask,
        "halo_zone_mask": halo_zone_mask,
        "fg_mask_pad": fg_mask_pad,
        "edge_mask_pad": edge_mask_pad,
        "gentle_grad_mask_pad": gentle_grad_mask_pad,
        "halo_zone_mask_pad": halo_zone_mask_pad,
        "ref_edge_sharp": ref_edge_sharp,
        "ref_dark_tone": ref_dark_tone,
    }


def evaluate_engine(im, ref):
    masks = align_masks_to_engine(im, ref)
    fg_mask = masks["fg_mask"]
    edge_mask = masks["edge_mask"]
    g_mask = masks["gentle_grad_mask"]
    h_mask = masks["halo_zone_mask"]

    gray = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY)
    gx = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
    gy = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
    grad_mag = np.hypot(gx, gy)

    # 1. EdgeGain: Sharpness multiplier over Lanczos 4x along true edges (1.15x - 1.45x is ideal)
    if np.any(edge_mask):
        ai_edge = float(np.percentile(grad_mag[edge_mask], 90))
        edge_gain = ai_edge / max(1.0, ref["ref_edge_sharp"])
    else:
        edge_gain = 1.0

    # 2. GradKeep (%): How much soft shading survives without being posterized/flattened (< 1.5 grad)
    if np.sum(g_mask) > 50:
        surviving_shading = np.mean(grad_mag[g_mask] >= 1.2) * 100.0
        grad_keep = float(surviving_shading)
    else:
        grad_keep = 100.0

    # 3. Micro-Chatter / Ringing Grit inside foreground
    smoothed = cv2.medianBlur(im, 3)
    diff = np.abs(im.astype(np.float32) - smoothed.astype(np.float32)).mean(axis=2)
    chatter = float(np.mean(diff[fg_mask])) if np.any(fg_mask) else 0.0

    # 4. ToneDrift: How far dark lines/shadows shifted from original 1x source (Lower = more natural)
    fg_pix = np.sort(gray[fg_mask])
    ai_dark = float(np.mean(fg_pix[:max(1, int(len(fg_pix) * 0.05))])) if len(fg_pix) > 10 else 0.0
    tone_drift = abs(ai_dark - ref["ref_dark_tone"])

    # 5. BorderHalo (%): True outer background dirtied near edges
    halo_pct = float(np.mean(gray[h_mask] < 250) * 100.0) if np.sum(h_mask) > 20 else 0.0

    # 6. CyclePSNR (dB): Downscale 4x AI output back to 1x and compare to aligned Cropped PNG
    cycle_psnr = compute_aligned_cycle_psnr(im, ref["crop_bgr"])

    return {
        "edge_gain": edge_gain,
        "grad_keep": grad_keep,
        "chatter": chatter,
        "tone_drift": tone_drift,
        "halo_pct": halo_pct,
        "cycle_psnr": cycle_psnr,
    }


print("=" * 120)
print("🎨 AUDITING HERE WE GO! 5: PAINTERLY & ILLUSTRATION-ADAPTED IQA SUITE")
print("=" * 120)

summary = {cat: {eng: [] for eng in AI_ENGINES} for cat in TEST_SUITE}

for cat_name, items in TEST_SUITE.items():
    print(f"\n📂 {cat_name}")
    print("-" * 120)
    for fld, it_name in items:
        crop_im, crop_alpha, _, crop_sz = load_img_safe("cropped", fld, it_name)
        lanc_im, _, _, _ = load_img_safe("lanczos", fld, it_name)
        if crop_im is None or lanc_im is None:
            continue

        ref = build_hwg5_reference(crop_im, crop_alpha, lanc_im)
        ch, cw = crop_im.shape[:2]
        print(f"👉 [{fld.strip()}] {it_name} (1x Source: {cw}x{ch}, {crop_sz/1024:.1f} KB)")

        _, _, _, v_sz = load_img_safe("vector", fld, it_name)
        if v_sz > 0:
            v_kb = v_sz / 1024.0
            v_tag = "Clean Vector" if v_kb < 50 else "⚠️ Heavy Auto-Trace (Likely posterized gradients)"
            print(f"  • {'VECTOR':10} | [SVG]     | {v_kb:6.1f} KB | {v_tag}")

        for eng in AI_ENGINES:
            im, _, ext, sz = load_img_safe(eng, fld, it_name)
            if im is None:
                continue
            h, w = im.shape[:2]
            m = evaluate_engine(im, ref)
            summary[cat_name][eng].append(m)

            print(
                f"  • {eng.upper():10} | {w:4}x{h:<4} | {sz/1024:6.1f} KB | "
                f"EdgeGain: {m['edge_gain']:4.2f}x | GradKeep: {m['grad_keep']:5.1f}% | "
                f"Chatter: {m['chatter']:4.2f} | ToneDrift: {m['tone_drift']:4.1f} | "
                f"Halo: {m['halo_pct']:4.2f}% | 1xPSNR: {m['cycle_psnr']:5.1f}dB"
            )

print("\n" + "=" * 120)
print("🏆 CATEGORY SUMMARY & RECOMMENDED ENGINE PER ART STYLE")
print("=" * 120)

for cat_name, eng_dict in summary.items():
    print(f"\n📊 {cat_name}")
    best_eng = None
    best_score = -1e9

    for eng in AI_ENGINES:
        rows = eng_dict[eng]
        if not rows:
            continue
        eg = np.mean([r["edge_gain"] for r in rows])
        gk = np.mean([r["grad_keep"] for r in rows])
        ch = np.mean([r["chatter"] for r in rows])
        td = np.mean([r["tone_drift"] for r in rows])
        hl = np.mean([r["halo_pct"] for r in rows])
        cp = np.mean([r["cycle_psnr"] for r in rows])

        # Balanced composite score for Here We Go! 5 illustrations:
        # Rewards crisp edges (up to 1.45x), high gradient retention, and 1x cycle fidelity;
        # penalizes texture chatter, dark-tone crushing, and border halos.
        capped_gain = min(eg, 1.45) - (max(0.0, eg - 1.45) * 0.5)
        score = (capped_gain * 25.0) + (gk * 0.35) + (cp * 0.8) - (ch * 8.0) - (td * 1.2) - (hl * 3.0)

        if eng != "lanczos" and score > best_score:
            best_score = score
            best_eng = eng.upper()

        print(
            f"  • {eng.upper():10} -> EdgeGain: {eg:4.2f}x | GradKeep: {gk:5.1f}% | "
            f"Chatter: {ch:4.2f} | ToneDrift: {td:4.1f} | Halo: {hl:4.2f}% | "
            f"1xPSNR: {cp:5.1f}dB | Score: {score:5.1f}"
        )
    if best_eng:
        print(f"  🌟 WINNER: {best_eng}")
