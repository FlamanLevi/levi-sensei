import os
import sys
import json
import time
import cv2
import numpy as np

sys.stdout.reconfigure(encoding='utf-8')

BASE_E = "E:/Levi-Sensei Images/Here We Go 6"
ENGINES = {
    "lanczos": os.path.join(BASE_E, "Here We Go 6 (Lanczos_4x)"),
    "realcugan": os.path.join(BASE_E, "Here We Go 6 (RealCUGAN_4x)"),
    "animesharp": os.path.join(BASE_E, "Here We Go 6 (Animesharp_4x)"),
    "ultrasharp": os.path.join(BASE_E, "Here We Go 6 (Ultrasharp_4x)"),
    "vector": os.path.join(BASE_E, "Here We Go 6 (Vector)"),
}

AI_ENGINES = ["realcugan", "animesharp", "ultrasharp"]


def load_img_safe(engine_key, folder_name, item_name):
    """Loads image safely with Unicode path support and returns (bgr, ext, size_bytes)."""
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
                alpha_channel = im[:, :, 3]
                alpha = alpha_channel[:, :, None].astype(np.float32) / 255.0
                bgr = im[:, :, :3].astype(np.float32)
                im = (bgr * alpha + 255.0 * (1.0 - alpha)).astype(np.uint8)
            elif im.ndim == 2:
                im = cv2.cvtColor(im, cv2.COLOR_GRAY2BGR)
            return im, ext, sz
    return None, None, 0


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


def compute_aligned_1x_metrics(im, ref_1x_bgr):
    """Downscales 4x output by 0.25x and aligns inside 1x padded reference to measure cycle PSNR and LAB chroma drift."""
    h1, w1 = max(1, int(round(im.shape[0] / 4.0))), max(1, int(round(im.shape[1] / 4.0)))
    downscaled_1x = cv2.resize(im, (w1, h1), interpolation=cv2.INTER_AREA)
    pad1 = 16
    ref_pad = cv2.copyMakeBorder(ref_1x_bgr, pad1, pad1, pad1, pad1, cv2.BORDER_CONSTANT, value=(255, 255, 255))
    if h1 <= ref_pad.shape[0] and w1 <= ref_pad.shape[1]:
        res = cv2.matchTemplate(ref_pad, downscaled_1x, cv2.TM_CCOEFF_NORMED)
        _, _, _, max_loc = cv2.minMaxLoc(res)
        x0, y0 = max_loc
        matched_crop = ref_pad[y0:y0+h1, x0:x0+w1]
        cycle_psnr = float(cv2.PSNR(downscaled_1x, matched_crop))

        lab_1x = cv2.cvtColor(downscaled_1x, cv2.COLOR_BGR2Lab).astype(np.float32)
        lab_ref = cv2.cvtColor(matched_crop, cv2.COLOR_BGR2Lab).astype(np.float32)
        chroma_drift = float(np.mean(np.hypot(lab_1x[:, :, 1] - lab_ref[:, :, 1],
                                              lab_1x[:, :, 2] - lab_ref[:, :, 2])))
        return cycle_psnr, chroma_drift

    resized_1x = cv2.resize(im, (ref_1x_bgr.shape[1], ref_1x_bgr.shape[0]), interpolation=cv2.INTER_AREA)
    cycle_psnr = float(cv2.PSNR(resized_1x, ref_1x_bgr))
    lab_1x = cv2.cvtColor(resized_1x, cv2.COLOR_BGR2Lab).astype(np.float32)
    lab_ref = cv2.cvtColor(ref_1x_bgr, cv2.COLOR_BGR2Lab).astype(np.float32)
    chroma_drift = float(np.mean(np.hypot(lab_1x[:, :, 1] - lab_ref[:, :, 1],
                                          lab_1x[:, :, 2] - lab_ref[:, :, 2])))
    return cycle_psnr, chroma_drift


def build_hwg6_reference(lanc_im):
    """Builds spatial masks and 1x reference ground truth from Lanczos 4x."""
    h4, w4 = lanc_im.shape[:2]
    gray_lanc = cv2.cvtColor(lanc_im, cv2.COLOR_BGR2GRAY)

    # 1. Background vs Foreground (Flood-fill from borders >= 250 so internal white objects stay foreground)
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

    # 2. Gradient map on Lanczos 4x reference
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

    # 3. Reference 1x Ground Truth
    w1 = max(1, int(round(w4 / 4.0)))
    h1 = max(1, int(round(h4 / 4.0)))
    ref_1x_bgr = cv2.resize(lanc_im, (w1, h1), interpolation=cv2.INTER_AREA)

    gray_1x = cv2.cvtColor(ref_1x_bgr, cv2.COLOR_BGR2GRAY)
    fg_1x = cv2.resize(fg_mask.astype(np.uint8), (w1, h1), interpolation=cv2.INTER_NEAREST) > 0
    fg_pixels = np.sort(gray_1x[fg_1x]) if np.any(fg_1x) else np.sort(gray_1x.flatten())
    ref_dark_tone = float(np.mean(fg_pixels[:max(1, int(len(fg_pixels) * 0.05))]))

    pad4 = 24
    lanc_pad = cv2.copyMakeBorder(lanc_im, pad4, pad4, pad4, pad4, cv2.BORDER_CONSTANT, value=(255, 255, 255))
    fg_mask_pad = cv2.copyMakeBorder(fg_mask.astype(np.uint8), pad4, pad4, pad4, pad4, cv2.BORDER_CONSTANT, value=0) > 0
    edge_mask_pad = cv2.copyMakeBorder(edge_mask.astype(np.uint8), pad4, pad4, pad4, pad4, cv2.BORDER_CONSTANT, value=0) > 0
    gentle_grad_mask_pad = cv2.copyMakeBorder(gentle_grad_mask.astype(np.uint8), pad4, pad4, pad4, pad4, cv2.BORDER_CONSTANT, value=0) > 0
    halo_zone_mask_pad = cv2.copyMakeBorder(halo_zone_mask.astype(np.uint8), pad4, pad4, pad4, pad4, cv2.BORDER_CONSTANT, value=0) > 0

    # Also compute Lanczos micro-chatter as baseline
    smoothed_lanc = cv2.medianBlur(lanc_im, 3)
    diff_lanc = np.abs(lanc_im.astype(np.float32) - smoothed_lanc.astype(np.float32)).mean(axis=2)
    lanc_chatter = float(np.mean(diff_lanc[fg_mask])) if np.any(fg_mask) else 0.0

    return {
        "lanc_bgr": lanc_im,
        "ref_1x_bgr": ref_1x_bgr,
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
        "lanc_chatter": lanc_chatter,
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

    # 6. Aligned 1x CyclePSNR & LAB Chroma Drift
    cycle_psnr, chroma_drift = compute_aligned_1x_metrics(im, ref["ref_1x_bgr"])

    return {
        "edge_gain": edge_gain,
        "grad_keep": grad_keep,
        "chatter": chatter,
        "tone_drift": tone_drift,
        "halo_pct": halo_pct,
        "cycle_psnr": cycle_psnr,
        "chroma_drift": chroma_drift,
    }


def compute_card_score(m, lanc_chatter):
    eg = m["edge_gain"]
    gk = m["grad_keep"]
    cp = m["cycle_psnr"]
    ch = m["chatter"]
    td = m["tone_drift"]
    hl = m["halo_pct"]
    cd = m["chroma_drift"]

    excess_chatter = max(0.0, ch - (lanc_chatter * 1.35))
    capped_gain = min(eg, 2.10) - (max(0.0, eg - 2.10) * 0.5)

    score = (
        (capped_gain * 20.0)
        + (gk * 0.40)
        + (cp * 1.00)
        - (excess_chatter * 12.0)
        - (td * 1.50)
        - (hl * 5.00)
        - (cd * 2.00)
    )
    return score, {
        "excess_chatter": excess_chatter,
        "capped_gain": capped_gain,
    }


def main():
    start_time = time.time()
    print("=" * 120)
    print("🎨 EVALUATING ALL 323 HERE WE GO! 6 CARDS: REALCUGAN VS ANIMESHARP (+ ULTRASHARP AUDIT)")
    print("   Metrics: EdgeGain (cap 2.10) | GradKeep | ExcessChatter (1.35x Lanczos) | ToneDrift | Halo | 1xPSNR | LAB ChromaDrift")
    print("=" * 120)

    lanczos_dir = ENGINES["lanczos"]
    unit_folders = sorted([d for d in os.listdir(lanczos_dir) if os.path.isdir(os.path.join(lanczos_dir, d))])

    all_card_results = []
    unit_stats = {}
    total_cards = 0
    total_rc_wins = 0
    total_as_wins = 0

    global_rc_metrics = []
    global_as_metrics = []
    global_us_metrics = []

    for u_idx, fld in enumerate(unit_folders, 1):
        sub = os.path.join(lanczos_dir, fld)
        card_names = sorted([os.path.splitext(f)[0] for f in os.listdir(sub) if f.endswith('.webp')])
        unit_rc_wins = 0
        unit_as_wins = 0

        unit_rc_scores = []
        unit_as_scores = []

        for c_name in card_names:
            lanc_im, _, _ = load_img_safe("lanczos", fld, c_name)
            if lanc_im is None:
                continue

            ref = build_hwg6_reference(lanc_im)

            rc_im, _, rc_sz = load_img_safe("realcugan", fld, c_name)
            as_im, _, as_sz = load_img_safe("animesharp", fld, c_name)
            us_im, _, us_sz = load_img_safe("ultrasharp", fld, c_name)
            _, _, vec_sz = load_img_safe("vector", fld, c_name)

            if rc_im is None or as_im is None:
                continue

            total_cards += 1

            # Evaluate RealCUGAN
            m_rc = evaluate_engine(rc_im, ref)
            score_rc, aux_rc = compute_card_score(m_rc, ref["lanc_chatter"])
            m_rc.update(aux_rc)
            m_rc["score"] = score_rc
            m_rc["size_kb"] = rc_sz / 1024.0

            # Evaluate AnimeSharp
            m_as = evaluate_engine(as_im, ref)
            score_as, aux_as = compute_card_score(m_as, ref["lanc_chatter"])
            m_as.update(aux_as)
            m_as["score"] = score_as
            m_as["size_kb"] = as_sz / 1024.0

            # Evaluate UltraSharp
            if us_im is not None:
                m_us = evaluate_engine(us_im, ref)
                score_us, aux_us = compute_card_score(m_us, ref["lanc_chatter"])
                m_us.update(aux_us)
                m_us["score"] = score_us
                m_us["size_kb"] = us_sz / 1024.0
                global_us_metrics.append(m_us)

            global_rc_metrics.append(m_rc)
            global_as_metrics.append(m_as)

            unit_rc_scores.append(score_rc)
            unit_as_scores.append(score_as)

            winner = "realcugan" if score_rc >= score_as else "animesharp"
            margin = abs(score_rc - score_as)

            if winner == "realcugan":
                total_rc_wins += 1
                unit_rc_wins += 1
            else:
                total_as_wins += 1
                unit_as_wins += 1

            all_card_results.append({
                "unit": fld,
                "card": c_name,
                "winner": winner,
                "margin": margin,
                "realcugan": m_rc,
                "animesharp": m_as,
                "vector_kb": vec_sz / 1024.0 if vec_sz > 0 else 0.0,
            })

        unit_stats[fld] = {
            "total": len(unit_rc_scores),
            "rc_wins": unit_rc_wins,
            "as_wins": unit_as_wins,
            "rc_mean_score": float(np.mean(unit_rc_scores)) if unit_rc_scores else 0,
            "as_mean_score": float(np.mean(unit_as_scores)) if unit_as_scores else 0,
        }

        # Print unit progress row
        print(f"[{u_idx:02d}/18] {fld:32s} | Cards: {len(unit_rc_scores):2d} | "
              f"RealCUGAN: {unit_rc_wins:2d} ({np.mean(unit_rc_scores):5.1f}) | "
              f"AnimeSharp: {unit_as_wins:2d} ({np.mean(unit_as_scores):5.1f})")

    elapsed = time.time() - start_time
    print("=" * 120)
    print(f"🏁 EVALUATION COMPLETE IN {elapsed:.1f}s | TOTAL CARDS: {total_cards}")
    print(f"🏆 OVERALL TALLY: RealCUGAN = {total_rc_wins} wins ({total_rc_wins/total_cards*100:.1f}%) | "
          f"AnimeSharp = {total_as_wins} wins ({total_as_wins/total_cards*100:.1f}%)")
    print("=" * 120)

    # Global Metric Averages
    def avg(lst, key):
        return float(np.mean([x[key] for x in lst]))

    print(f"\n{'ENGINE':<12} | {'EdgeGain':<8} | {'GradKeep':<8} | {'ExChatter':<9} | {'ToneDrift':<9} | {'Halo%':<6} | {'1xPSNR':<7} | {'ChromaDrift':<11} | {'Avg Score':<9} | {'Avg KB':<7}")
    print("-" * 105)
    print(f"{'RealCUGAN':<12} | {avg(global_rc_metrics, 'edge_gain'):<8.2f} | {avg(global_rc_metrics, 'grad_keep'):<7.1f}% | {avg(global_rc_metrics, 'excess_chatter'):<9.3f} | {avg(global_rc_metrics, 'tone_drift'):<9.2f} | {avg(global_rc_metrics, 'halo_pct'):<5.2f}% | {avg(global_rc_metrics, 'cycle_psnr'):<7.2f} | {avg(global_rc_metrics, 'chroma_drift'):<11.3f} | {avg(global_rc_metrics, 'score'):<9.1f} | {avg(global_rc_metrics, 'size_kb'):<7.1f}")
    print(f"{'AnimeSharp':<12} | {avg(global_as_metrics, 'edge_gain'):<8.2f} | {avg(global_as_metrics, 'grad_keep'):<7.1f}% | {avg(global_as_metrics, 'excess_chatter'):<9.3f} | {avg(global_as_metrics, 'tone_drift'):<9.2f} | {avg(global_as_metrics, 'halo_pct'):<5.2f}% | {avg(global_as_metrics, 'cycle_psnr'):<7.2f} | {avg(global_as_metrics, 'chroma_drift'):<11.3f} | {avg(global_as_metrics, 'score'):<9.1f} | {avg(global_as_metrics, 'size_kb'):<7.1f}")
    if global_us_metrics:
        print(f"{'UltraSharp':<12} | {avg(global_us_metrics, 'edge_gain'):<8.2f} | {avg(global_us_metrics, 'grad_keep'):<7.1f}% | {avg(global_us_metrics, 'excess_chatter'):<9.3f} | {avg(global_us_metrics, 'tone_drift'):<9.2f} | {avg(global_us_metrics, 'halo_pct'):<5.2f}% | {avg(global_us_metrics, 'cycle_psnr'):<7.2f} | {avg(global_us_metrics, 'chroma_drift'):<11.3f} | {avg(global_us_metrics, 'score'):<9.1f} | {avg(global_us_metrics, 'size_kb'):<7.1f}")

    # Save complete results manifest
    out_manifest = "scripts/pipeline/hwg6_323_winner_manifest.json"
    with open(out_manifest, "w", encoding="utf-8") as f:
        json.dump({
            "total_cards": total_cards,
            "realcugan_wins": total_rc_wins,
            "animesharp_wins": total_as_wins,
            "unit_stats": unit_stats,
            "cards": all_card_results,
        }, f, indent=2, ensure_ascii=False)
    print(f"\n💾 Saved full 323-card evaluation manifest to: {out_manifest}")


if __name__ == "__main__":
    main()
