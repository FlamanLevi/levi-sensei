import os
import sys
import cv2
import numpy as np
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = "E:/Levi-Sensei Images/Let's Try (Grade 3 & 4)/Let's Try (Realcugan_4x)"
OUT_DIR = "c:/Antigravity/levi-sensei (new)/scripts/pipeline/webp_9_sample_output"
os.makedirs(OUT_DIR, exist_ok=True)

SAMPLE_9 = [
    "dic_4_card_down_2605_1_c",          # ~7.4 MB (Counterpart to 'up', massive scene)
    "dic_3_card_dragon_2132_1_c",        # ~3.0 MB (High detail cartoon character)
    "dic_5_foods_watermelon_0154_1_c",   # ~2.4 MB (Food illustration)
    "dic_4_card_breakfasttime_2525_1_c", # ~2.3 MB (Multi-object scene)
    "dic_5_card_hospital_0279_1_c",      # ~1.6 MB (Building/place)
    "dic_3_card_baseball_2034_1_c",      # ~1.5 MB (Sports/objects)
    "dic_wb_11animals_cat_1487_1_c",     # ~1.4 MB (Animal cartoon line art)
    "dic_wb_01action_run_1029_1_c",      # ~1.0 MB (Action scene line art)
    "dic_wb_07dailylife_table_1362_1_c", # ~0.6 MB (Simple furniture item)
]

print("=" * 110)
print(f"🔬 RUNNING 9-CARD WEBP QUALITY SWEEP (Real-CUGAN 4x)")
print(f"Sample Cards: {len(SAMPLE_9)}")
for s in SAMPLE_9:
    p = os.path.join(BASE_DIR, s + ".webp")
    sz = os.path.getsize(p) / 1024.0
    print(f"  • {s:35} -> {sz:6.1f} KB ({sz/1024:.2f} MB)")
print("=" * 110)

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

qualities = [100, 95, 90, 85, 80, 75, 70]

# --- SWEEP 1: NATIVE 4x RESOLUTION ---
print("\n" + "=" * 110)
print("📊 [PART 1] NATIVE 4x RESOLUTION: 9-CARD AGGREGATE RESULTS")
print("=" * 110)
print(f"{'Quality':<8} | {'Avg Size':<12} | {'Median Size':<12} | {'Min Size':<10} | {'Max Size':<12} | {'PSNR (dB)':<10} | {'SSIM':<8} | {'EdgeSharp':<10} | {'FillNoise'}")
print("-" * 110)

for q in qualities:
    sizes = []
    psnrs = []
    ssims = []
    edges = []
    fills = []
    
    for s in SAMPLE_9:
        src = os.path.join(BASE_DIR, s + ".webp")
        orig_raw = cv2.imread(src)
        pil_im = Image.open(src)
        
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
        
    print(
        f"Q={q:<5} | {np.mean(sizes):7.1f} KB   | {np.median(sizes):7.1f} KB   | "
        f"{np.min(sizes):6.1f} KB | {np.max(sizes):7.1f} KB   | {np.mean(psnrs):6.2f} dB   | "
        f"{np.mean(ssims):6.4f} | {np.mean(edges):8.1f}   | {np.mean(fills):5.2f}"
    )

# --- SWEEP 2: 1600px ENVELOPE ---
print("\n" + "=" * 110)
print("📊 [PART 2] 1600px RESOLUTION: 9-CARD AGGREGATE RESULTS")
print("=" * 110)
print(f"{'Quality':<8} | {'Avg Size':<12} | {'Median Size':<12} | {'Min Size':<10} | {'Max Size':<12} | {'PSNR (dB)':<10} | {'SSIM':<8} | {'EdgeSharp':<10} | {'FillNoise'}")
print("-" * 110)

for q in qualities:
    sizes = []
    psnrs = []
    ssims = []
    edges = []
    fills = []
    
    for s in SAMPLE_9:
        src = os.path.join(BASE_DIR, s + ".webp")
        pil_im = Image.open(src)
        w_orig, h_orig = pil_im.size
        
        scale = 1600.0 / max(w_orig, h_orig)
        tw, th = int(w_orig * scale), int(h_orig * scale)
        pil_1600 = pil_im.resize((tw, th), Image.Resampling.LANCZOS)
        
        ref_1600 = cv2.imread(src)
        ref_1600 = cv2.resize(ref_1600, (tw, th), interpolation=cv2.INTER_LANCZOS4)
        
        out_f = os.path.join(OUT_DIR, f"{s}_1600_q{q}.webp")
        pil_1600.save(out_f, "WEBP", quality=q, method=6)
        sz_kb = os.path.getsize(out_f) / 1024.0
        sizes.append(sz_kb)
        
        im_enc = cv2.imread(out_f)
        e, f, p, ss = compute_metrics(im_enc, ref_1600)
        psnrs.append(p)
        ssims.append(ss)
        edges.append(e)
        fills.append(f)
        
    print(
        f"Q={q:<5} | {np.mean(sizes):7.1f} KB   | {np.median(sizes):7.1f} KB   | "
        f"{np.min(sizes):6.1f} KB | {np.max(sizes):7.1f} KB   | {np.mean(psnrs):6.2f} dB   | "
        f"{np.mean(ssims):6.4f} | {np.mean(edges):8.1f}   | {np.mean(fills):5.2f}"
    )

print("\n" + "=" * 110)
