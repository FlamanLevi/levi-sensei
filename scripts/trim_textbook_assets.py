import os
import sys
import glob
import cv2
import numpy as np

sys.stdout.reconfigure(encoding='utf-8')

def trim_image(src_path, dest_path, padding_percent=0.08, min_pad=32):
    try:
        img = cv2.imread(src_path, cv2.IMREAD_UNCHANGED)
        if img is None:
            return False

        ih, iw = img.shape[:2]

        # Support both 3-channel (BGR) and 4-channel (BGRA) images
        if len(img.shape) == 3 and img.shape[2] == 4:
            alpha = img[:, :, 3]
            rgb = img[:, :, :3]
            non_bg = (alpha > 15) & ((rgb[:, :, 0] < 254) | (rgb[:, :, 1] < 254) | (rgb[:, :, 2] < 254))
        elif len(img.shape) == 3:
            non_bg = (img[:, :, 0] < 254) | (img[:, :, 1] < 254) | (img[:, :, 2] < 254)
        else:
            non_bg = img < 254

        # Filter out isolated tiny scanner artifacts / dust speckles (< 20px)
        num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(non_bg.astype(np.uint8), connectivity=8)
        valid_mask = np.zeros_like(non_bg, dtype=bool)
        for i in range(1, num_labels):
            if stats[i, cv2.CC_STAT_AREA] >= 20:
                valid_mask |= (labels == i)

        coords = cv2.findNonZero(valid_mask.astype(np.uint8))
        if coords is None:
            # Fallback to unfiltered if mask is empty
            coords = cv2.findNonZero(non_bg.astype(np.uint8))
            if coords is None:
                # Entire image is pure white
                cv2.imwrite(dest_path, img)
                return True

        x, y, w, h = cv2.boundingRect(coords)

        # Generous breathing margins so artwork never touches borders or gets choked
        pad_x = max(min_pad, int(w * padding_percent))
        pad_y = max(min_pad, int(h * padding_percent))

        x1 = max(0, x - pad_x)
        y1 = max(0, y - pad_y)
        x2 = min(iw, x + w + pad_x)
        y2 = min(ih, y + h + pad_y)

        cropped = img[y1:y2, x1:x2]
        os.makedirs(os.path.dirname(dest_path), exist_ok=True)
        cv2.imwrite(dest_path, cropped)
        return True
    except Exception as e:
        print(f"Error trimming {src_path}: {e}")
        return False

def main():
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    
    # Target 1: Let's Try 1 & 2 (_1_c.png)
    dest_letstry = os.path.join(root_dir, 'trimmed_assets', 'letstry_images')
    os.makedirs(dest_letstry, exist_ok=True)

    lt_sources = [
        os.path.join(root_dir, 'letstry1', 'resources', 'app', 'app', '__media', 'dictionary', 'dic_card_data_image'),
        os.path.join(root_dir, 'letstry2', 'resources', 'app', 'app', '__media', 'dictionary', 'dic_card_data_image')
    ]

    lt_processed = 0
    seen_lt_files = set()

    print("=== Trimming Let's Try 1 & 2 Artwork (_1_c.png) ===")
    for src_dir in lt_sources:
        if not os.path.exists(src_dir):
            continue
        for fn in os.listdir(src_dir):
            if fn.endswith('_1_c.png') and fn not in seen_lt_files:
                seen_lt_files.add(fn)
                src_path = os.path.join(src_dir, fn)
                dest_path = os.path.join(dest_letstry, fn)
                if trim_image(src_path, dest_path):
                    lt_processed += 1

    print(f"-> Successfully cropped {lt_processed} Let's Try illustration cards into trimmed_assets/letstry_images/")

    # Target 2: Here We Go (Grades 5 & 6) illustration cards
    dest_hwg = os.path.join(root_dir, 'trimmed_assets', 'cards', 'illustration')
    os.makedirs(dest_hwg, exist_ok=True)
    hwg_source = os.path.join(root_dir, 'manabi_assets', 'cards', 'illustration')

    hwg_processed = 0
    if os.path.exists(hwg_source):
        print("\n=== Trimming Here We Go 5 & 6 Artwork (*_illust.png) ===")
        for fn in os.listdir(hwg_source):
            if fn.endswith('.png'):
                src_path = os.path.join(hwg_source, fn)
                dest_path = os.path.join(dest_hwg, fn)
                if trim_image(src_path, dest_path):
                    hwg_processed += 1
        print(f"-> Successfully cropped {hwg_processed} Here We Go illustration cards into trimmed_assets/cards/illustration/")

    print(f"\nALL DONE! Total {lt_processed + hwg_processed} cards non-destructively cropped.")
    print("Original textbook media in letstry1, letstry2, and manabi_assets remain 100% untouched.")

if __name__ == '__main__':
    main()
