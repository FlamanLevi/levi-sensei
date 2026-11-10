import os
import sys
import time
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
TARGET_DIR = os.path.join(ROOT_DIR, "trimmed_assets", "cards", "illustration")

def main():
    print("=" * 90)
    print("⚡ RE-ENCODING HERE WE GO GRADE 5 ILLUSTRATIONS: QUALITY=92, METHOD=6")
    print("=" * 90)

    if not os.path.exists(TARGET_DIR):
        print(f"❌ Target directory not found: {TARGET_DIR}")
        return

    files = sorted([f for f in os.listdir(TARGET_DIR) if f.startswith("hwg5_") and f.endswith("_illust.webp")])
    total_files = len(files)
    print(f"Found {total_files} Grade 5 WebP illustrations to re-encode.\n")

    orig_total_bytes = 0
    new_total_bytes = 0
    start_time = time.time()

    for idx, fn in enumerate(files, 1):
        fpath = os.path.join(TARGET_DIR, fn)
        orig_sz = os.path.getsize(fpath)
        orig_total_bytes += orig_sz

        # Load and re-encode to temp file
        im = Image.open(fpath)
        temp_path = fpath + ".tmp.webp"
        im.save(temp_path, "WEBP", quality=92, method=6)
        new_sz = os.path.getsize(temp_path)

        # Replace file atomically
        os.replace(temp_path, fpath)
        new_total_bytes += new_sz

        if idx % 50 == 0 or idx == total_files:
            elapsed = time.time() - start_time
            print(f"  [{idx:3d}/{total_files}] Processed ({elapsed:.1f}s) -> "
                  f"Cumulative: {orig_total_bytes / (1024*1024):.2f} MB -> {new_total_bytes / (1024*1024):.2f} MB "
                  f"({(new_total_bytes - orig_total_bytes) / orig_total_bytes * 100.0:+.1f}%)")

    elapsed_total = time.time() - start_time
    savings_mb = (orig_total_bytes - new_total_bytes) / (1024 * 1024)
    savings_pct = (orig_total_bytes - new_total_bytes) / orig_total_bytes * 100.0

    print("\n" + "=" * 90)
    print("🎉 RE-ENCODING COMPLETE!")
    print("=" * 90)
    print(f"  • Files re-encoded : {total_files}")
    print(f"  • Original Payload : {orig_total_bytes / (1024*1024):.2f} MB ({orig_total_bytes / total_files / 1024:.1f} KB/card)")
    print(f"  • Final Payload    : {new_total_bytes / (1024*1024):.2f} MB ({new_total_bytes / total_files / 1024:.1f} KB/card)")
    print(f"  • Total Savings    : -{savings_mb:.2f} MB ({savings_pct:.1f}% reduction!)")
    print(f"  • Time Elapsed     : {elapsed_total:.2f} seconds")

if __name__ == '__main__':
    main()
