import io
import os
import sys
import cv2
import numpy as np
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = "E:/Levi-Sensei Images/Let's Try (Grade 3 & 4)/Let's Try (Realcugan_4x)"
OUT_DIR = "c:/Antigravity/levi-sensei (new)/scripts/pipeline/webp_granular_output"
SAVE_FILES_TO_DISK = False  # Set True only if you want to visually inspect the 160 output files

if SAVE_FILES_TO_DISK:
    os.makedirs(OUT_DIR, exist_ok=True)

SAMPLE_10 = [
    "dic_4_card_up_2604_1_c",            # 7446.4 KB (Max master)
    "dic_4_card_down_2605_1_c",          # 7420.4 KB (Massive scene)
    "dic_3_card_dragon_2132_1_c",        # 3034.4 KB (High detail cartoon)
    "dic_5_foods_watermelon_0154_1_c",   # 2414.3 KB (Food illustration)
    "dic_4_card_breakfasttime_2525_1_c", # 2297.1 KB (Multi-character scene)
    "dic_5_card_hospital_0279_1_c",      # 1632.6 KB (Building/place)
    "dic_3_card_baseball_2034_1_c",      # 1541.4 KB (Sports/character)
    "dic_wb_11animals_cat_1487_1_c",     # 1430.4 KB (Animal cartoon line art)
    "dic_wb_01action_run_1029_1_c",      # 1022.2 KB (Action scene line art)
    "dic_wb_07dailylife_table_1362_1_c", #  639.4 KB (Simple furniture item)
]


def load_master(src_path):
    """Loads master safely, composites RGBA onto white if needed, and builds active ROI masks."""
    size_kb = os.path.getsize(src_path) / 1024.0
    raw_bytes = np.fromfile(src_path, dtype=np.uint8)
    im = cv2.imdecode(raw_bytes, cv2.IMREAD_UNCHANGED)

    if im.ndim == 3 and im.shape[2] == 4:
        alpha = im[:, :, 3:4].astype(np.float32) / 255.0
        bgr = im[:, :, :3].astype(np.float32)
        im = (bgr * alpha + 255.0 * (1.0 - alpha)).astype(np.uint8)

    gray = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY)

    # Active Foreground Mask: any non-white pixel (< 252) dilated by 8px to include the halo zone
    fg_raw = (gray < 252).astype(np.uint8)
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (17, 17))
    active_mask = cv2.dilate(fg_raw, kernel) > 0

    # Halo Ringing Zone: pure white background pixels (>= 254) that sit within 8px of foreground ink
    halo_zone_mask = active_mask & (gray >= 254)

    pil_im = Image.fromarray(cv2.cvtColor(im, cv2.COLOR_BGR2RGB))
    return {
        "bgr": im,
        "pil": pil_im,
        "size_kb": size_kb,
        "active_mask": active_mask,
        "halo_zone_mask": halo_zone_mask,
    }


def compute_full_ref_metrics(im_enc, master):
    """Measures full-reference compression degradation specifically in active illustration regions."""
    im_ref = master["bgr"]
    active_mask = master["active_mask"]
    halo_mask = master["halo_zone_mask"]

    # 1. Global PSNR (for standard reference)
    psnr = float(cv2.PSNR(im_enc, im_ref))

    # 2. Foreground-Masked 3-Channel SSIM (prevents white background from inflating SSIM)
    c1, c2 = (0.01 * 255) ** 2, (0.03 * 255) ** 2
    f_enc = im_enc.astype(np.float64)
    f_ref = im_ref.astype(np.float64)

    mu1 = cv2.GaussianBlur(f_enc, (11, 11), 1.5)
    mu2 = cv2.GaussianBlur(f_ref, (11, 11), 1.5)
    mu1_sq, mu2_sq, mu1_mu2 = mu1 ** 2, mu2 ** 2, mu1 * mu2

    sigma1_sq = cv2.GaussianBlur(f_enc ** 2, (11, 11), 1.5) - mu1_sq
    sigma2_sq = cv2.GaussianBlur(f_ref ** 2, (11, 11), 1.5) - mu2_sq
    sigma12 = cv2.GaussianBlur(f_enc * f_ref, (11, 11), 1.5) - mu1_mu2

    ssim_map = ((2 * mu1_mu2 + c1) * (2 * sigma12 + c2)) / (
        (mu1_sq + mu2_sq + c1) * (sigma1_sq + sigma2_sq + c2)
    )
    ssim_2d = np.mean(ssim_map, axis=2)  # Mean across B, G, R channels
    fg_ssim = float(np.mean(ssim_2d[active_mask])) if np.any(active_mask) else float(np.mean(ssim_2d))

    # 3. P99 Active Pixel Error (0-255 scale): worst 1% localized artifact on edges/fills
    abs_diff = np.max(np.abs(im_enc.astype(np.int16) - im_ref.astype(np.int16)), axis=2)
    p99_err = float(np.percentile(abs_diff[active_mask], 99)) if np.any(active_mask) else 0.0

    # 4. Mosquito Ringing Bleed (% of pure white pixels near ink edges that drop below 252)
    if np.any(halo_mask):
        gray_enc = cv2.cvtColor(im_enc, cv2.COLOR_BGR2GRAY)
        ring_bleed_pct = float(np.mean(gray_enc[halo_mask] < 252) * 100.0)
    else:
        ring_bleed_pct = 0.0

    return psnr, fg_ssim, p99_err, ring_bleed_pct


print("=" * 125)
print("🔬 GRANULAR WEBP QUALITY SWEEP AT NATIVE 4x RESOLUTION (FOREGROUND-MASKED FULL-REFERENCE IQA)")
print("=" * 125)

originals = {}
for s in SAMPLE_10:
    src = os.path.join(BASE_DIR, s + ".webp")
    originals[s] = load_master(src)

master_sizes = [originals[s]["size_kb"] for s in SAMPLE_10]
master_avg = float(np.mean(master_sizes))

print(
    f"{'Quality':<8} | {'Avg Size':<10} | {'Med Size':<10} | {'Max Size':<10} | {'% Master':<9} "
    f"| {'PSNR':<9} | {'FG-SSIM':<9} | {'P99 Err':<8} | {'RingBleed':<9} | {'Step Delta':<11} | {'Efficiency'}"
)
print("-" * 125)
print(
    f"{'MASTER':<8} | {master_avg:7.1f} KB | {np.median(master_sizes):7.1f} KB | "
    f"{np.max(master_sizes):7.1f} KB | {'100.0%':<9} | {'  INF  ':<9} | {'1.00000':<9} | "
    f"{'  0.00':<8} | {'  0.00%':<9} | {'   ---     '} | Baseline"
)
print("-" * 125)

qualities = list(range(95, 79, -1))
prev_avg = master_avg
prev_ssim = 1.0
sweep_log = []

for q in qualities:
    sizes, psnrs, fg_ssims, p99_errs, ring_bleeds = [], [], [], [], []

    for s in SAMPLE_10:
        master = originals[s]
        buf = io.BytesIO()
        master["pil"].save(buf, "WEBP", quality=q, method=6)
        raw_webp = buf.getvalue()
        sz_kb = len(raw_webp) / 1024.0
        sizes.append(sz_kb)

        if SAVE_FILES_TO_DISK:
            with open(os.path.join(OUT_DIR, f"{s}_native_q{q}.webp"), "wb") as f:
                f.write(raw_webp)

        im_enc = cv2.imdecode(np.frombuffer(raw_webp, dtype=np.uint8), cv2.IMREAD_COLOR)
        p, fg_ss, p99, rb = compute_full_ref_metrics(im_enc, master)
        psnrs.append(p)
        fg_ssims.append(fg_ss)
        p99_errs.append(p99)
        ring_bleeds.append(rb)

    avg_sz = float(np.mean(sizes))
    med_sz = float(np.median(sizes))
    max_sz = float(np.max(sizes))
    pct_master = (avg_sz / master_avg) * 100.0
    avg_p = float(np.mean(psnrs))
    avg_ss = float(np.mean(fg_ssims))
    avg_p99 = float(np.mean(p99_errs))
    avg_rb = float(np.mean(ring_bleeds))

    kb_saved = prev_avg - avg_sz
    ssim_drop = max(1e-6, (prev_ssim - avg_ss) * 1000.0)  # Drop per 0.001 FG-SSIM
    kb_per_ssim_drop = kb_saved / ssim_drop if q < 95 else 0.0

    sweep_log.append({
        "q": q, "avg_sz": avg_sz, "fg_ssim": avg_ss,
        "p99": avg_p99, "rb": avg_rb, "kb_saved": kb_saved,
        "eff": kb_per_ssim_drop
    })

    eff_str = f"{kb_per_ssim_drop:5.1f} KB/mSSIM" if q < 95 else "Initial Drop"
    print(
        f"Q={q:<6} | {avg_sz:7.1f} KB | {med_sz:7.1f} KB | {max_sz:7.1f} KB | "
        f"{pct_master:7.1f}%  | {avg_p:6.2f} dB | {avg_ss:8.5f}  | "
        f"{avg_p99:6.2f}   | {avg_rb:7.2f}%  | -{kb_saved:6.1f} KB  | {eff_str}"
    )

    prev_avg = avg_sz
    prev_ssim = avg_ss

print("=" * 125)

# Automatically identify the Knee / Sweet Spot:
# Visual transparency rules for 2D flashcards: P99_Err <= 6.0 and RingBleed <= 2.5%
candidates = [r for r in sweep_log if r["p99"] <= 6.0 and r["rb"] <= 2.5]
if candidates:
    best = candidates[-1]  # Lowest Q that still passes strict visual artifact thresholds
    print(
        f"🎯 RECOMMENDED SWEET SPOT: Q={best['q']} "
        f"(Avg Size: {best['avg_sz']:.1f} KB | FG-SSIM: {best['fg_ssim']:.5f} | "
        f"P99 Error: {best['p99']:.2f} | Halo Ringing: {best['rb']:.2f}%)"
    )
