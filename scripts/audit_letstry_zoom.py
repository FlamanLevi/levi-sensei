import os
import sys
import cv2
import numpy as np

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = r"E:\Levi-Sensei Images\Let's Try (Grade 3 & 4)"
CURRENT_DIR = r"c:\Antigravity\levi-sensei (new)\trimmed_assets\letstry_images"

def audit_detail(name, x_pct=0.5, y_pct=0.5, size=200):
    print(f"\n==========================================")
    print(f"🔬 ZOOM AUDIT: {name}")
    print(f"==========================================")
    
    engines = {
        "Current (1050px)": os.path.join(CURRENT_DIR, name + ".png"),
        "Ultrasharp_4x": os.path.join(BASE_DIR, "Let's Try (Ultrasharp_4x)", name + ".webp"),
        "Realcugan_4x": os.path.join(BASE_DIR, "Let's Try (Realcugan_4x)", name + ".webp"),
        "Animesharp_4x": os.path.join(BASE_DIR, "Let's Try (Animesharp_4x)", name + ".webp"),
        "Lanczos_4x": os.path.join(BASE_DIR, "Let's Try (Lanczos_4x)", name + ".webp")
    }

    for eng, p in engines.items():
        if not os.path.exists(p):
            continue
        im = cv2.imread(p)
        h, w = im.shape[:2]
        
        # Crop center patch proportional to image size
        cx, cy = int(w * x_pct), int(h * y_pct)
        half = int(size * (w / 1000.0) / 2)
        x1, x2 = max(0, cx - half), min(w, cx + half)
        y1, y2 = max(0, cy - half), min(h, cy + half)
        patch = im[y1:y2, x1:x2]
        
        # Measure local edge sharpness on patch
        gray_patch = cv2.cvtColor(patch, cv2.COLOR_BGR2GRAY)
        lap = cv2.Laplacian(gray_patch, cv2.CV_64F).var()
        
        # Check color banding / unique colors in patch
        unique_colors = len(np.unique(patch.reshape(-1, 3), axis=0))
        
        # Color variance in near-white background pixels
        bg_mask = gray_patch > 240
        bg_std = np.std(patch[bg_mask]) if np.any(bg_mask) else 0.0

        print(f"  {eng:18} | Patch {patch.shape[1]}x{patch.shape[0]} | Sharpness: {lap:7.1f} | UniqueColors: {unique_colors:6d} | BgNoise(std): {bg_std:4.2f}")

audit_detail("dic_3_card_baseball_2034_1_c", 0.5, 0.45)
audit_detail("dic_3_card_dragon_2132_1_c", 0.45, 0.5)
audit_detail("dic_3_card_star_2097_1_c", 0.5, 0.5)
audit_detail("dic_3_card_circle_2094_1_c", 0.5, 0.5)
audit_detail("dic_wb_01action_run_1029_1_c", 0.5, 0.5)
