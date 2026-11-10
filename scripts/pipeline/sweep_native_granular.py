import os
import sys
import cv2
import numpy as np
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = "E:/Levi-Sensei Images/Let's Try (Grade 3 & 4)/Let's Try (Realcugan_4x)"
OUT_DIR = "c:/Antigravity/levi-sensei (new)/scripts/pipeline/webp_granular_output"
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

print("=" * 115)
print(f"🔬 GRANULAR QUALITY SWEEP AT NATIVE 4x RESOLUTION (Q=95 down to Q=80 in steps of 1)")
print(f"Sample Cards: {len(SAMPLE_10)} | Resolutions: Native ~2650x2650 (No downscaling)")
print("=" * 115)

def compute_metrics(im_test, im_ref):
    gray_test = cv2.cvtColor(im_test, cv2.COLOR_BGR2GRAY)
    
    # 1. Edge sharpness (99th percentile Sobel)
    gx = cv2.Sobel(gray_test, cv2.CV_64F, 1, 0, ksize=3)
    gy = cv2.Sobel(gray_test, cv2.CV_64F, 0, 1, ksize=3)
    grad_mag = np.hypot(gx, gy)
    edge_sharp = float(np.percentile(grad_mag, 99))
    
    # 2. Fill Noise
    non_edge = grad_mag < np.percentile(grad_mag, 85)
    smoothed = cv2.medianBlur(im_test, 3)
    diff = np.abs(im_test.astype(np.float32) - smoothed.astype(np.float32)).mean(axis=2)
    fill_noise = float(np.mean(diff[non_edge])) if np.any(non_edge) else 0.0
    
    # 3. PSNR
    psnr = float(cv2.PSNR(im_test, im_ref))
    
    # 4. SSIM
    c1, c2 = (0.01 * 255)**2, (0.03 * 255)**2
    gray_ref = cv2.cvtColor(im_ref, cv2.COLOR_BGR2GRAY)
    mu1 = cv2.GaussianBlur(gray_test.astype(np.float64), (11, 11), 1.5)
    mu2 = cv2.GaussianBlur(gray_ref.astype(np.float64), (11, 11), 1.5)
    mu1_sq, mu2_sq, mu1_mu2 = mu1**2, mu2**2, mu1 * mu2
    sigma1_sq = cv2.GaussianBlur(gray_test.astype(np.float64)**2, (11, 11), 1.5) - mu1_sq
    sigma2_sq = cv2.GaussianBlur(gray_ref.astype(np.float64)**2, (11, 11), 1.5) - mu2_sq
    sigma12 = cv2.GaussianBlur(gray_test.astype(np.float64) * gray_ref.astype(np.float64), (11, 11), 1.5) - mu1_mu2
    ssim_map = ((2 * mu1_mu2 + c1) * (2 * sigma12 + c2)) / ((mu1_sq + mu2_sq + c1) * (sigma1_sq + sigma2_sq + c2))
    ssim = float(np.mean(ssim_map))
    
    return edge_sharp, fill_noise, psnr, ssim

# Preload original images
originals = {}
for s in SAMPLE_10:
    src = os.path.join(BASE_DIR, s + ".webp")
    originals[s] = {
        "raw": cv2.imread(src),
        "pil": Image.open(src)
    }

qualities = list(range(95, 79, -1)) # 95 down to 80 inclusive

print(f"{'Quality':<8} | {'Avg Size':<12} | {'Median Size':<12} | {'Min Size':<10} | {'Max Size':<12} | {'PSNR (dB)':<10} | {'SSIM':<8} | {'EdgeSharp':<10} | {'FillNoise':<10} | {'Delta/Step'}")
print("-" * 115)

prev_avg = None

for q in qualities:
    sizes = []
    psnrs = []
    ssims = []
    edges = []
    fills = []
    
    for s in SAMPLE_10:
        pil_im = originals[s]["pil"]
        orig_raw = originals[s]["raw"]
        
        out_f = os.path.join(OUT_DIR, f"{s}_native_q{q}.webp")
        pil_im.save(out_f, "WEBP", quality=q, method=6)
        sz_kb = os.path.getsize(out_f) / 1024.0
        sizes.append(sz_kb)
        
        im_enc = cv2.imread(out_f)
        e, f, p, ss = compute_metrics(im_enc, orig_raw)
        psnrs.append(p)
        ssims.append(ss)
        edges.append(e)
        fills.append(f)
        
    avg_sz = np.mean(sizes)
    med_sz = np.median(sizes)
    min_sz = np.min(sizes)
    max_sz = np.max(sizes)
    avg_p = np.mean(psnrs)
    avg_ss = np.mean(ssims)
    avg_e = np.mean(edges)
    avg_f = np.mean(fills)
    
    delta_str = f"-{prev_avg - avg_sz:5.1f} KB" if prev_avg is not None else " Baseline "
    prev_avg = avg_sz
    
    print(
        f"Q={q:<5} | {avg_sz:7.1f} KB   | {med_sz:7.1f} KB   | "
        f"{min_sz:6.1f} KB | {max_sz:7.1f} KB   | {avg_p:6.2f} dB   | "
        f"{avg_ss:6.4f} | {avg_e:8.1f}   | {avg_f:6.2f}     | {delta_str}"
    )

print("=" * 115)
