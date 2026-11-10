import os
import sys
import cv2
import numpy as np
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')

SRC_PATH = "E:/Levi-Sensei Images/Let's Try (Grade 3 & 4)/Let's Try (Realcugan_4x)/dic_4_card_up_2604_1_c.webp"
OUT_DIR = "c:/Antigravity/levi-sensei (new)/scripts/pipeline/webp_test_output"
os.makedirs(OUT_DIR, exist_ok=True)

# Load master original
orig_raw = cv2.imread(SRC_PATH)
h_orig, w_orig = orig_raw.shape[:2]
orig_size_kb = os.path.getsize(SRC_PATH) / 1024.0

print("=" * 110)
print(f"🔬 WEBP QUALITY SWEEP AUDIT: dic_4_card_up_2604_1_c")
print(f"Master Image: {w_orig}x{h_orig} | Master Size: {orig_size_kb:.1f} KB ({orig_size_kb/1024:.2f} MB)")
print("=" * 110)

def compute_metrics(im_test, im_ref):
    gray_test = cv2.cvtColor(im_test, cv2.COLOR_BGR2GRAY)
    
    # 1. Edge sharpness (99th percentile Sobel)
    gx = cv2.Sobel(gray_test, cv2.CV_64F, 1, 0, ksize=3)
    gy = cv2.Sobel(gray_test, cv2.CV_64F, 0, 1, ksize=3)
    grad_mag = np.hypot(gx, gy)
    edge_sharp = float(np.percentile(grad_mag, 99))
    
    # 2. Fill Noise (Micro chatter in non-edge regions)
    non_edge = grad_mag < np.percentile(grad_mag, 85)
    smoothed = cv2.medianBlur(im_test, 3)
    diff = np.abs(im_test.astype(np.float32) - smoothed.astype(np.float32)).mean(axis=2)
    fill_noise = float(np.mean(diff[non_edge])) if np.any(non_edge) else 0.0
    
    # 3. Halo noise
    halo_pct = float(np.mean((gray_test >= 235) & (gray_test < 250)) * 100.0)
    
    # 4. PSNR vs ref
    psnr = float(cv2.PSNR(im_test, im_ref))
    
    # 5. Approximate SSIM
    # cv2 doesn't have built-in SSIM, but we can compute standard SSIM
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
    
    return edge_sharp, fill_noise, halo_pct, psnr, ssim

pil_orig = Image.open(SRC_PATH)

# Part 1: Full Resolution (2649x2611) at different qualities
print(f"\n--- PART 1: NATIVE FULL RESOLUTION ({w_orig}x{h_orig}) ---")
print(f"{'Quality':<10} | {'File Size':<12} | {'Reduction':<10} | {'PSNR (dB)':<10} | {'SSIM':<8} | {'EdgeSharp':<10} | {'FillNoise':<10} | {'HaloNoise':<10}")
print("-" * 105)

qualities = [100, 95, 90, 85, 80, 75, 70, 65, 60]

for q in qualities:
    out_file = os.path.join(OUT_DIR, f"up_native_q{q}.webp")
    pil_orig.save(out_file, "WEBP", quality=q, method=6)
    sz_kb = os.path.getsize(out_file) / 1024.0
    reduc = (1.0 - sz_kb / orig_size_kb) * 100.0
    
    im_encoded = cv2.imread(out_file)
    edge, fill, halo, psnr, ssim = compute_metrics(im_encoded, orig_raw)
    
    print(f"Q={q:<7} | {sz_kb:7.1f} KB   | {reduc:6.1f}%    | {psnr:6.2f} dB   | {ssim:6.4f} | {edge:8.1f}   | {fill:6.2f}     | {halo:5.2f}%")

# Part 2: 1600px Envelope
scale = 1600.0 / max(w_orig, h_orig)
target_w, target_h = int(w_orig * scale), int(h_orig * scale)
pil_1600 = pil_orig.resize((target_w, target_h), Image.Resampling.LANCZOS)
ref_1600 = cv2.imread(SRC_PATH)
ref_1600 = cv2.resize(ref_1600, (target_w, target_h), interpolation=cv2.INTER_LANCZOS4)

print(f"\n--- PART 2: 1600px RESOLUTION ({target_w}x{target_h}) ---")
print(f"{'Quality':<10} | {'File Size':<12} | {'Reduction':<10} | {'PSNR (dB)':<10} | {'SSIM':<8} | {'EdgeSharp':<10} | {'FillNoise':<10} | {'HaloNoise':<10}")
print("-" * 105)

for q in qualities:
    out_file = os.path.join(OUT_DIR, f"up_1600_q{q}.webp")
    pil_1600.save(out_file, "WEBP", quality=q, method=6)
    sz_kb = os.path.getsize(out_file) / 1024.0
    reduc = (1.0 - sz_kb / orig_size_kb) * 100.0
    
    im_encoded = cv2.imread(out_file)
    edge, fill, halo, psnr, ssim = compute_metrics(im_encoded, ref_1600)
    
    print(f"Q={q:<7} | {sz_kb:7.1f} KB   | {reduc:6.1f}%    | {psnr:6.2f} dB   | {ssim:6.4f} | {edge:8.1f}   | {fill:6.2f}     | {halo:5.2f}%")

print("\n" + "=" * 110)
