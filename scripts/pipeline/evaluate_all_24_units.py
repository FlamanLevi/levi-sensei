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
                    alpha_fg = alpha_channel > 15
                alpha = alpha_channel[:, :, None].astype(np.float32) / 255.0
                bgr = im[:, :, :3].astype(np.float32)
                im = (bgr * alpha + 255.0 * (1.0 - alpha)).astype(np.uint8)
            elif im.ndim == 2:
                im = cv2.cvtColor(im, cv2.COLOR_GRAY2BGR)
            return im, alpha_fg, ext, sz
    return None, None, None, 0


def align_masks_to_engine(im, ref):
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

    # 1. Background vs foreground
    if crop_alpha is not None:
        fg_mask = cv2.resize(crop_alpha.astype(np.uint8), (w4, h4), interpolation=cv2.INTER_NEAREST) > 0
        bg_mask = ~fg_mask
    else:
        near_white = (gray_lanc >= 250).astype(np.uint8)
        num_labels, labels = cv2.connectedComponents(near_white)
        border_labels = np.unique(np.concatenate([
            labels[0, :], labels[-1, :], labels[:, 0], labels[:, -1]
        ]))
        border_labels = border_labels[border_labels != 0]
        bg_mask = np.isin(labels, border_labels)
        fg_mask = ~bg_mask

    if np.mean(fg_mask) < 0.02:
        fg_mask = np.ones_like(gray_lanc, dtype=bool)
        bg_mask = np.zeros_like(gray_lanc, dtype=bool)

    # 2. Gradient map
    gx = cv2.Sobel(gray_lanc, cv2.CV_64F, 1, 0, ksize=3)
    gy = cv2.Sobel(gray_lanc, cv2.CV_64F, 0, 1, ksize=3)
    grad_ref = np.hypot(gx, gy)

    edge_thresh = np.percentile(grad_ref[fg_mask], 90) if np.any(fg_mask) else 20.0
    edge_mask = fg_mask & (grad_ref >= max(15.0, edge_thresh))
    ref_edge_sharp = float(np.percentile(grad_ref[edge_mask], 90)) if np.any(edge_mask) else 1.0

    gentle_grad_mask = fg_mask & (grad_ref >= 2.0) & (grad_ref < max(15.0, edge_thresh * 0.6))

    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (17, 17))
    dilated_fg = cv2.dilate(fg_mask.astype(np.uint8), kernel) > 0
    halo_zone_mask = dilated_fg & bg_mask & (gray_lanc >= 252)

    # Darkest 5% foreground tone reference
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

    # 1. EdgeGain
    if np.any(edge_mask):
        ai_edge = float(np.percentile(grad_mag[edge_mask], 90))
        edge_gain = ai_edge / max(1.0, ref["ref_edge_sharp"])
    else:
        edge_gain = 1.0

    # 2. GradKeep
    if np.sum(g_mask) > 50:
        surviving_shading = np.mean(grad_mag[g_mask] >= 1.2) * 100.0
        grad_keep = float(surviving_shading)
    else:
        grad_keep = 100.0

    # 3. Micro-Chatter
    smoothed = cv2.medianBlur(im, 3)
    diff = np.abs(im.astype(np.float32) - smoothed.astype(np.float32)).mean(axis=2)
    chatter = float(np.mean(diff[fg_mask])) if np.any(fg_mask) else 0.0

    # 4. ToneDrift
    fg_pix = np.sort(gray[fg_mask])
    ai_dark = float(np.mean(fg_pix[:max(1, int(len(fg_pix) * 0.05))])) if len(fg_pix) > 10 else 0.0
    tone_drift = abs(ai_dark - ref["ref_dark_tone"])

    # 5. BorderHalo
    halo_pct = float(np.mean(gray[h_mask] < 250) * 100.0) if np.sum(h_mask) > 20 else 0.0

    # 6. Aligned CyclePSNR
    cycle_psnr = compute_aligned_cycle_psnr(im, ref["crop_bgr"])

    return {
        "edge_gain": edge_gain,
        "grad_keep": grad_keep,
        "chatter": chatter,
        "tone_drift": tone_drift,
        "halo_pct": halo_pct,
        "cycle_psnr": cycle_psnr,
    }


def compute_composite_score(eg, gk, cp, ch, td, hl):
    capped_gain = min(eg, 1.45) - (max(0.0, eg - 1.45) * 0.5)
    return (capped_gain * 25.0) + (gk * 0.35) + (cp * 0.8) - (ch * 8.0) - (td * 1.2) - (hl * 3.0)


def sample_folder_items(folder_name, sample_size=4):
    """Picks evenly spaced cards across the folder (e.g. beginning, 1/3, 2/3, end)."""
    sub = os.path.join(ENGINES["lanczos"], folder_name)
    if not os.path.isdir(sub):
        return []
    files = sorted([os.path.splitext(f)[0] for f in os.listdir(sub) if f.endswith('.webp')])
    n = len(files)
    if n <= sample_size:
        return files
    indices = [int(round(i * (n - 1) / (sample_size - 1))) for i in range(sample_size)]
    return [files[i] for i in sorted(set(indices))]


def main():
    print("=" * 120)
    print("🎨 AUDITING ALL 24 UNIT FOLDERS: HERE WE GO! 5 BALANCED IQA EVALUATION")
    print("=" * 120)

    lanczos_dir = ENGINES["lanczos"]
    unit_folders = sorted([d for d in os.listdir(lanczos_dir) if os.path.isdir(os.path.join(lanczos_dir, d))])

    unit_results = {}
    global_engine_metrics = {eng: [] for eng in AI_ENGINES}
    winner_counts = {eng.upper(): 0 for eng in AI_ENGINES if eng != "lanczos"}

    total_sampled = 0
    for idx, fld in enumerate(unit_folders, 1):
        items = sample_folder_items(fld, sample_size=4)
        total_sampled += len(items)
        unit_summary = {eng: [] for eng in AI_ENGINES}

        for it_name in items:
            crop_im, crop_alpha, _, _ = load_img_safe("cropped", fld, it_name)
            lanc_im, _, _, _ = load_img_safe("lanczos", fld, it_name)
            if crop_im is None or lanc_im is None:
                continue

            ref = build_hwg5_reference(crop_im, crop_alpha, lanc_im)

            for eng in AI_ENGINES:
                im, _, _, _ = load_img_safe(eng, fld, it_name)
                if im is None:
                    continue
                m = evaluate_engine(im, ref)
                unit_summary[eng].append(m)
                global_engine_metrics[eng].append(m)

        # Compute averages for this unit
        scores = {}
        for eng in AI_ENGINES:
            rows = unit_summary[eng]
            if not rows:
                continue
            eg = np.mean([r["edge_gain"] for r in rows])
            gk = np.mean([r["grad_keep"] for r in rows])
            ch = np.mean([r["chatter"] for r in rows])
            td = np.mean([r["tone_drift"] for r in rows])
            hl = np.mean([r["halo_pct"] for r in rows])
            cp = np.mean([r["cycle_psnr"] for r in rows])
            sc = compute_composite_score(eg, gk, cp, ch, td, hl)
            scores[eng] = {
                "eg": eg, "gk": gk, "ch": ch, "td": td, "hl": hl, "cp": cp, "score": sc
            }

        # Pick winning AI engine (excluding lanczos reference)
        ai_scores = {k: v["score"] for k, v in scores.items() if k != "lanczos"}
        best_eng = max(ai_scores, key=ai_scores.get).upper() if ai_scores else "N/A"
        winner_counts[best_eng] = winner_counts.get(best_eng, 0) + 1

        unit_results[fld] = {
            "items_count": len(items),
            "scores": scores,
            "winner": best_eng
        }

        rc_sc = scores.get("realcugan", {}).get("score", 0.0)
        as_sc = scores.get("animesharp", {}).get("score", 0.0)
        us_sc = scores.get("ultrasharp", {}).get("score", 0.0)
        print(f"[{idx:02d}/24] {fld[:28]:28} ({len(items)} cards) -> 🥇 {best_eng:10} | RealCUGAN: {rc_sc:5.1f} | AnimeSharp: {as_sc:5.1f} | UltraSharp: {us_sc:5.1f}")

    print("\n" + "=" * 120)
    print(f"📊 SUMMARY ACROSS ALL 24 UNITS ({total_sampled} CARDS SAMPLED)")
    print("=" * 120)

    print("\n🏆 UNIT WINNERS TALLY:")
    for eng, count in sorted(winner_counts.items(), key=lambda x: -x[1]):
        pct = (count / len(unit_folders)) * 100.0
        print(f"  • {eng:12}: {count:2d} / {len(unit_folders)} units ({pct:4.1f}%)")

    print("\n🌐 OVERALL GLOBAL METRICS (All 96 Sampled Cards Combined):")
    for eng in AI_ENGINES:
        rows = global_engine_metrics[eng]
        if not rows:
            continue
        eg = np.mean([r["edge_gain"] for r in rows])
        gk = np.mean([r["grad_keep"] for r in rows])
        ch = np.mean([r["chatter"] for r in rows])
        td = np.mean([r["tone_drift"] for r in rows])
        hl = np.mean([r["halo_pct"] for r in rows])
        cp = np.mean([r["cycle_psnr"] for r in rows])
        sc = compute_composite_score(eg, gk, cp, ch, td, hl)
        print(
            f"  • {eng.upper():10} -> EdgeGain: {eg:4.2f}x | GradKeep: {gk:5.1f}% | "
            f"Chatter: {ch:4.2f} | ToneDrift: {td:4.1f} | Halo: {hl:4.2f}% | "
            f"1xPSNR: {cp:5.1f}dB | OVERALL SCORE: {sc:5.1f}"
        )


if __name__ == '__main__':
    main()
