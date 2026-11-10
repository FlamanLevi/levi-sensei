import os
import sys
import json
import shutil
import cv2
import numpy as np

sys.stdout.reconfigure(encoding='utf-8')

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DEST_DIR = os.path.join(ROOT_DIR, "trimmed_assets", "cards", "illustration")
BACKUP_DIR = os.path.join(ROOT_DIR, "trimmed_assets", "cards", "illustration_legacy_png")
MASTER_VOCAB_PATH = os.path.join(ROOT_DIR, "public", "data", "master_vocabulary.json")
MANIFEST_PATH = os.path.join(os.path.dirname(__file__), "hwg5_334_winner_manifest.json")
SHEETS_PATH = os.path.join(os.path.dirname(__file__), "g5_sheets.json")

BASE_E = "E:/Levi-Sensei Images/Here We Go 5"
ENGINE_FOLDERS = {
    "REALCUGAN": os.path.join(BASE_E, "Here We Go 5 (Realcugan_4x)"),
    "ANIMESHARP": os.path.join(BASE_E, "Here We Go 5 (Animesharp_4x)"),
}

def main():
    print("=" * 100)
    print("🚀 DEPLOYING HERE WE GO GRADE 5 PER-CARD HYBRID AI-UPSCALED ILLUSTRATIONS")
    print("=" * 100)

    os.makedirs(DEST_DIR, exist_ok=True)
    os.makedirs(BACKUP_DIR, exist_ok=True)

    with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
        manifest = json.load(f)
    manifest_map = {c["item"]: c for c in manifest["cards"]}

    with open(SHEETS_PATH, "r", encoding="utf-8") as f:
        sheets = json.load(f)

    # 1. Back up legacy PNGs
    print("\n📦 Step 1: Backing up legacy PNGs to illustration_legacy_png/...")
    backed_up = 0
    for f in os.listdir(DEST_DIR):
        if f.startswith("hwg5_") and f.endswith("_illust.png"):
            src = os.path.join(DEST_DIR, f)
            dst = os.path.join(BACKUP_DIR, f)
            shutil.copy2(src, dst)
            backed_up += 1
    print(f"  -> Successfully backed up {backed_up} legacy Grade 5 PNGs.")

    # 2. Deploy 332 winning WebP files
    print("\n🎨 Step 2: Deploying 332 winning 4x WebP cards to trimmed_assets/cards/illustration/...")
    deployed = []
    rc_count = 0
    as_count = 0
    total_bytes = 0

    for s in sheets:
        base_file = s["file"].replace(".png", "")
        if base_file == "u11_p11_2":
            base_file = "u11_p13"
        item_idx = 1
        for r in s["rows"]:
            for it in r["items"]:
                if it and it.get("en"):
                    item_key = f"{base_file}_item_{item_idx:02d}"
                    info = manifest_map.get(item_key)
                    if not info:
                        print(f"❌ Error: {item_key} not in manifest!")
                        item_idx += 1
                        continue

                    winner = info["winner"]
                    unit_fld = info["unit"]
                    src_dir = ENGINE_FOLDERS[winner]
                    src_path = os.path.join(src_dir, unit_fld, f"{item_key}.webp")

                    dest_name = f"hwg5_{s['unit']}_{it['slot']}_{it['en']}_illust.webp"
                    dest_path = os.path.join(DEST_DIR, dest_name)

                    if not os.path.exists(src_path):
                        print(f"❌ Source missing: {src_path}")
                        item_idx += 1
                        continue

                    shutil.copy2(src_path, dest_path)
                    sz = os.path.getsize(dest_path)
                    total_bytes += sz

                    if winner == "REALCUGAN":
                        rc_count += 1
                    else:
                        as_count += 1

                    deployed.append({
                        "item_key": item_key,
                        "dest_name": dest_name,
                        "winner": winner,
                        "size_kb": sz / 1024.0,
                    })
                    item_idx += 1

    print(f"  -> Deployed {len(deployed)} cards: {rc_count} Real-CUGAN + {as_count} AnimeSharp.")
    print(f"  -> Total WebP payload: {total_bytes / (1024 * 1024):.2f} MB (Avg {total_bytes / len(deployed) / 1024:.1f} KB/card).")

    # 3. Clean up legacy PNGs now that WebPs are deployed
    print("\n🧹 Step 3: Removing legacy PNG duplicates from illustration/...")
    removed_png = 0
    for f in os.listdir(DEST_DIR):
        if f.startswith("hwg5_") and f.endswith("_illust.png"):
            os.remove(os.path.join(DEST_DIR, f))
            removed_png += 1
    print(f"  -> Removed {removed_png} legacy PNGs from active illustration folder.")

    # 4. Update master_vocabulary.json
    print("\n📝 Step 4: Updating public/data/master_vocabulary.json to .webp...")
    with open(MASTER_VOCAB_PATH, "r", encoding="utf-8") as f:
        master = json.load(f)

    updated_fields = 0
    for w in master:
        # Check media_by_grade
        mbg = w.get("media_by_grade", {})
        for g in ["ES_G5", "ES_G6"]:
            if g in mbg and isinstance(mbg[g], dict):
                ci = mbg[g].get("card_image", "")
                if ci and "hwg5_" in ci and ci.endswith("_illust.png"):
                    mbg[g]["card_image"] = ci[:-4] + ".webp"
                    updated_fields += 1
        # Check hwg_card_illust
        hci = w.get("hwg_card_illust", "")
        if hci and "hwg5_" in hci and hci.endswith("_illust.png"):
            w["hwg_card_illust"] = hci[:-4] + ".webp"
            updated_fields += 1

    with open(MASTER_VOCAB_PATH, "w", encoding="utf-8") as f:
        json.dump(master, f, indent=2, ensure_ascii=False)
    print(f"  -> Updated {updated_fields} image references to .webp in master_vocabulary.json.")

    # 5. Verification
    print("\n🔍 Step 5: Verification audit...")
    webp_in_dest = [f for f in os.listdir(DEST_DIR) if f.startswith("hwg5_") and f.endswith("_illust.webp")]
    png_in_dest = [f for f in os.listdir(DEST_DIR) if f.startswith("hwg5_") and f.endswith("_illust.png")]
    print(f"  • Deployed WebP cards present: {len(webp_in_dest)} / 332")
    print(f"  • Legacy PNGs remaining in active folder: {len(png_in_dest)}")
    print(f"  • Legacy PNGs safely archived in backup: {len(os.listdir(BACKUP_DIR))}")

    # Inspect first 3 sample cards for dimensions
    print("\n🖼️ Sample Card Verification:")
    for sample in webp_in_dest[:5]:
        p = os.path.join(DEST_DIR, sample)
        raw_b = np.fromfile(p, dtype=np.uint8)
        im = cv2.imdecode(raw_b, cv2.IMREAD_UNCHANGED)
        h, w = im.shape[:2]
        sz_kb = os.path.getsize(p) / 1024.0
        print(f"  • {sample:40}: {w}x{h} ({sz_kb:5.1f} KB)")

    print("\n" + "=" * 100)
    print("✅ GRADE 5 PER-CARD HYBRID DEPLOYMENT COMPLETE!")
    print("=" * 100)

if __name__ == '__main__':
    main()
