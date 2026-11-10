import os
import sys
import json
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
ACTIVE_DIR = os.path.join(ROOT_DIR, "trimmed_assets", "cards", "illustration")
BACKUP_DIR = os.path.join(ROOT_DIR, "trimmed_assets", "cards", "illustration_legacy_png")
MASTER_VOCAB_PATH = os.path.join(ROOT_DIR, "public", "data", "master_vocabulary.json")

def main():
    print("=" * 90)
    print("🔧 RESTORING & CONVERTING REMAINING GRADE 6 CARDS TO WEBP (Q=92)")
    print("=" * 90)

    # 1. Identify missing cards
    active_webps = set(os.listdir(ACTIVE_DIR))
    legacy_pngs = sorted([f for f in os.listdir(BACKUP_DIR) if f.startswith("hwg6_") and f.endswith("_illust.png")])

    converted = 0
    for png_name in legacy_pngs:
        base = png_name[:-4] # e.g. hwg6_u19_00_zero_illust
        webp_name = base + ".webp"
        webp_path = os.path.join(ACTIVE_DIR, webp_name)

        # Check if already present
        if webp_name in active_webps:
            continue

        # If not present, convert from legacy PNG
        src_png = os.path.join(BACKUP_DIR, png_name)
        im = Image.open(src_png)
        im.save(webp_path, "WEBP", quality=92, method=6)
        converted += 1
        print(f"  ✓ Converted: {png_name} -> {webp_name} ({os.path.getsize(webp_path)/1024:.1f} KB)")

    print(f"\n-> Successfully converted {converted} legacy Grade 6 cards to WebP!")

    # 2. Add aliases for punctuation differences (. vs _)
    alias_pairs = [
        ("hwg6_u01_24_the_U.K._illust.webp", "hwg6_u01_24_the_U_K__illust.webp"),
        ("hwg6_u01_25_the_U.S._illust.webp", "hwg6_u01_25_the_U_S__illust.webp"),
        ("hwg6_u14_06_P.E._illust.webp", "hwg6_u14_06_P_E__illust.webp"),
    ]
    for target, alias in alias_pairs:
        t_path = os.path.join(ACTIVE_DIR, target)
        a_path = os.path.join(ACTIVE_DIR, alias)
        if os.path.exists(t_path) and not os.path.exists(a_path):
            im = Image.open(t_path)
            im.save(a_path, "WEBP", quality=92, method=6)
            print(f"  ✓ Created alias: {alias} -> {target}")
        elif os.path.exists(a_path) and not os.path.exists(t_path):
            im = Image.open(a_path)
            im.save(t_path, "WEBP", quality=92, method=6)
            print(f"  ✓ Created alias: {target} -> {alias}")

    # 3. Update master_vocabulary.json
    print("\n📝 Updating master_vocabulary.json references...")
    with open(MASTER_VOCAB_PATH, "r", encoding="utf-8") as f:
        master = json.load(f)

    updated_count = 0
    for w in master:
        mbg = w.get("media_by_grade", {})
        if "ES_G6" in mbg and isinstance(mbg["ES_G6"], dict):
            ci = mbg["ES_G6"].get("card_image")
            if ci and ci.endswith(".png") and "hwg6_" in ci:
                mbg["ES_G6"]["card_image"] = ci[:-4] + ".webp"
                updated_count += 1

    with open(MASTER_VOCAB_PATH, "w", encoding="utf-8") as f:
        json.dump(master, f, indent=2, ensure_ascii=False)
    print(f"  -> Updated {updated_count} references to .webp in master_vocabulary.json.")

    # 4. Final tally
    final_webps = [f for f in os.listdir(ACTIVE_DIR) if f.startswith("hwg6_") and f.endswith("_illust.webp")]
    print(f"\n🎉 Total Grade 6 WebP illustrations in active library: {len(final_webps)}")

if __name__ == "__main__":
    main()
