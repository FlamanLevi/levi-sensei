"""
Deploy New Let's Try Assets Pipeline
====================================
Processes the 631 curated Let's Try (Grade 3 & 4) textbook card images from Google AI Studio / Colab:
- Reads selections_to_review.csv (or choice override)
- For VTracer_SVG: Deploys mathematical vector SVG files directly (<10 KB each)
- For raster upscalers (AnimeSharp v4, UltraSharp v2, IllustrationJaNai, Real-CUGAN, etc.):
  - Downsamples 4x native dimensions to fit within (1920, 1080) maintaining aspect ratio
  - Uses Pillow's high-order 3-lobe Lanczos anti-aliasing sinc filter
  - Encodes to WebP at quality=92, method=6
- Deploys cleanly to new_assets/letstry_images without touching legacy trimmed_assets
"""

import os
import sys
import csv
import time
import shutil
from concurrent.futures import ProcessPoolExecutor, as_completed
from PIL import Image

# Ensure UTF-8 output in Windows PowerShell
sys.stdout.reconfigure(encoding='utf-8')

SOURCE_BASE = r"E:\Levi-Sensei Images\Let's Try (Grade 3 & 4)\Let's Try (New)"
CSV_FILE = os.path.join(SOURCE_BASE, "selections_to_review.csv")
TARGET_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "new_assets", "letstry_images"))

ENGINE_DIRS = {
    'AnimeSharpV4_Lanc': 'grade3_4_animesharp_v4_lanczos_part_ALL_of_2',
    'UltraSharpV2_Lite': 'grade3_4_ultrasharp_v2_part_ALL_of_2',
    'VTracer_SVG': 'grade3_4_vector_svg',
    'IllustrationJaNai': 'grade3_4_illustrationjanai_v3_part_ALL_of_2',
    'AnimeSharpV4_AI': 'grade3_4_animesharp_v4_ai_part_ALL_of_2',
    'AnimeSharp_V1_4x': 'grade3_4_animesharp_part_ALL_of_2',
    'RealCUGAN_4x': 'grade3_4_realcugan_part_ALL_of_2',
}

def process_single_card(item):
    card_name, engine, choice_num = item
    dir_name = ENGINE_DIRS.get(engine)
    if not dir_name:
        return {'status': 'error', 'card': card_name, 'msg': f'Unknown engine {engine}'}
    
    is_svg = (engine == 'VTracer_SVG')
    ext = '.svg' if is_svg else '.webp'
    src_path = os.path.join(SOURCE_BASE, dir_name, card_name + ext)
    dst_path = os.path.join(TARGET_DIR, card_name + ext)
    
    if not os.path.exists(src_path):
        return {'status': 'error', 'card': card_name, 'msg': f'Source file not found: {src_path}'}
    
    src_size = os.path.getsize(src_path)
    
    if is_svg:
        shutil.copy2(src_path, dst_path)
        dst_size = os.path.getsize(dst_path)
        return {
            'status': 'ok',
            'type': 'svg',
            'card': card_name,
            'engine': engine,
            'orig_size': src_size,
            'new_size': dst_size,
            'orig_dim': 'Vector',
            'new_dim': 'Vector'
        }
    else:
        try:
            with Image.open(src_path) as im:
                orig_dim = im.size
                orig_w, orig_h = orig_dim
                
                # Check if downsampling needed (if width > 1920 or height > 1080)
                if orig_w > 1920 or orig_h > 1080:
                    im.thumbnail((1920, 1080), Image.Resampling.LANCZOS)
                
                new_dim = im.size
                im.save(dst_path, format='WEBP', quality=92, method=6)
            
            dst_size = os.path.getsize(dst_path)
            return {
                'status': 'ok',
                'type': 'webp',
                'card': card_name,
                'engine': engine,
                'orig_size': src_size,
                'new_size': dst_size,
                'orig_dim': orig_dim,
                'new_dim': new_dim
            }
        except Exception as e:
            return {'status': 'error', 'card': card_name, 'msg': str(e)}

def main():
    print("=" * 80)
    print("🚀 LEVI-SENSEI: LET'S TRY NEW ASSET DEPLOYMENT (LANCZOS 1080p + Q=92 WEBP)")
    print("=" * 80)
    
    if not os.path.exists(CSV_FILE):
        print(f"❌ Error: CSV file not found at {CSV_FILE}")
        sys.exit(1)
        
    os.makedirs(TARGET_DIR, exist_ok=True)
    print(f"📁 Destination folder: {TARGET_DIR}")
    
    # Read CSV
    cards_to_process = []
    with open(CSV_FILE, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            choice = row.get('Choice', '1').strip()
            if choice == '2':
                chosen_engine = row['Silver_2']
            elif choice == '3':
                chosen_engine = row['Bronze_3']
            else:
                chosen_engine = row['Gold_1']
            
            cards_to_process.append((row['Card_Name'].strip(), chosen_engine.strip(), choice))
    
    total = len(cards_to_process)
    print(f"📊 Loaded {total} cards from selections_to_review.csv")
    print(f"⚡ Starting multi-core processing with 3-lobe Lanczos anti-aliasing...")
    
    start_time = time.time()
    results = []
    svg_count = 0
    webp_count = 0
    total_src_bytes = 0
    total_dst_bytes = 0
    errors = []
    
    # Use ProcessPoolExecutor for maximum speed across all CPU cores
    max_workers = min(os.cpu_count() or 4, 8)
    with ProcessPoolExecutor(max_workers=max_workers) as executor:
        futures = {executor.submit(process_single_card, item): item for item in cards_to_process}
        for future in as_completed(futures):
            res = future.result()
            results.append(res)
            if res['status'] == 'ok':
                total_src_bytes += res['orig_size']
                total_dst_bytes += res['new_size']
                if res['type'] == 'svg':
                    svg_count += 1
                else:
                    webp_count += 1
            else:
                errors.append(res)
            
            done = len(results)
            if done % 50 == 0 or done == total:
                pct = (done / total) * 100
                print(f"  • Progress: {done}/{total} ({pct:.1f}%) | {svg_count} SVGs | {webp_count} WebPs...")
    
    elapsed = time.time() - start_time
    
    print("\n" + "=" * 80)
    print("🎉 DEPLOYMENT SUMMARY")
    print("=" * 80)
    print(f"⏱️ Total Time Elapsed: {elapsed:.2f} seconds")
    print(f"✅ Successfully Processed: {svg_count + webp_count}/{total} files")
    print(f"   • Vector SVGs (mathematical lineart): {svg_count} files")
    print(f"   • Raster WebPs (Lanczos downscaled):  {webp_count} files")
    print(f"📉 Total Disk Size Before: {total_src_bytes / (1024 * 1024):.2f} MB")
    print(f"📉 Total Disk Size After:  {total_dst_bytes / (1024 * 1024):.2f} MB")
    savings = (1 - (total_dst_bytes / total_src_bytes)) * 100 if total_src_bytes > 0 else 0
    print(f"✨ Storage / Network Bandwidth Reduction: {savings:.1f}%")
    
    if errors:
        print(f"\n⚠️ Encountered {len(errors)} errors:")
        for err in errors[:10]:
            print(f"   • {err['card']}: {err['msg']}")
    else:
        print(f"\n💯 Zero errors! All {total} cards deployed perfectly.")

if __name__ == "__main__":
    main()
