import os
import sys
import json
import shutil
import time
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DEST_DIR = os.path.join(ROOT_DIR, "trimmed_assets", "cards", "illustration")
BACKUP_DIR = os.path.join(ROOT_DIR, "trimmed_assets", "cards", "illustration_legacy_png")
MASTER_VOCAB_PATH = os.path.join(ROOT_DIR, "public", "data", "master_vocabulary.json")
MANIFEST_PATH = os.path.join(os.path.dirname(__file__), "hwg6_323_winner_manifest.json")
SHEETS_PATH = os.path.join(os.path.dirname(__file__), "g6_sheets.json")

BASE_E = "E:/Levi-Sensei Images/Here We Go 6"
ENGINE_FOLDERS = {
    "realcugan": os.path.join(BASE_E, "Here We Go 6 (RealCUGAN_4x)"),
    "animesharp": os.path.join(BASE_E, "Here We Go 6 (Animesharp_4x)"),
}


def main():
    print("=" * 100)
    print("🚀 DEPLOYING HERE WE GO GRADE 6 PER-CARD HYBRID AI-UPSCALED ILLUSTRATIONS")
    print("   Quality=92, Method=6 WebP Optimization + Full Grade Isolation")
    print("=" * 100)

    os.makedirs(DEST_DIR, exist_ok=True)
    os.makedirs(BACKUP_DIR, exist_ok=True)

    with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
        manifest = json.load(f)
    winner_cards = manifest["cards"]
    card_winner_map = {c["card"]: c for c in winner_cards}

    with open(SHEETS_PATH, "r", encoding="utf-8") as f:
        sheets = json.load(f)

    # Build mapping from sheet item key -> target filename
    sheet_item_map = {}
    for s in sheets:
        base_file = s["file"].replace(".png", "")
        item_idx = 1
        if "rows" in s:
            for r in s["rows"]:
                for it in r["items"]:
                    item_key = f"{base_file}_item_{item_idx:02d}"
                    sheet_item_map[item_key] = {
                        "unit": s["unit"],
                        "slot": it["slot"],
                        "en": it["en"],
                        "target_webp": f"hwg6_{s['unit']}_{it['slot']}_{it['en']}_illust.webp",
                        "legacy_png": f"hwg6_{s['unit']}_{it['slot']}_{it['en']}_illust.png",
                    }
                    item_idx += 1
        elif "items" in s and s["unit"] != "u19":
            for it in s["items"]:
                item_key = f"{base_file}_item_{item_idx:02d}"
                sheet_item_map[item_key] = {
                    "unit": s["unit"],
                    "slot": it["slot"],
                    "en": it["en"],
                    "target_webp": f"hwg6_{s['unit']}_{it['slot']}_{it['en']}_illust.webp",
                    "legacy_png": f"hwg6_{s['unit']}_{it['slot']}_{it['en']}_illust.png",
                }
                item_idx += 1

    # 1. Back up legacy Grade 6 PNGs
    print("\n📦 Step 1: Backing up existing legacy Grade 6 PNGs to illustration_legacy_png/...")
    backed_up = 0
    for f in os.listdir(DEST_DIR):
        if f.startswith("hwg6_") and f.endswith("_illust.png"):
            src = os.path.join(DEST_DIR, f)
            dst = os.path.join(BACKUP_DIR, f)
            shutil.copy2(src, dst)
            backed_up += 1
    print(f"  -> Successfully backed up {backed_up} legacy Grade 6 PNGs.")

    # 2. Deploy 323 winning cards directly with Quality=92 re-encoding
    print("\n🎨 Step 2: Deploying & re-encoding 323 winning 4x WebP cards to trimmed_assets/cards/illustration/...")
    deployed = []
    rc_count = 0
    as_count = 0
    orig_total_bytes = 0
    new_total_bytes = 0
    start_time = time.time()

    for idx, c in enumerate(winner_cards, 1):
        card_key = c["card"]
        winner = c["winner"]
        unit_fld = c["unit"]

        src_dir = ENGINE_FOLDERS[winner]
        src_path = os.path.join(src_dir, unit_fld, f"{card_key}.webp")

        if not os.path.exists(src_path):
            print(f"❌ Source missing: {src_path}")
            continue

        orig_sz = os.path.getsize(src_path)
        orig_total_bytes += orig_sz

        # Determine target name
        if card_key in sheet_item_map:
            target_name = sheet_item_map[card_key]["target_webp"]
        else:
            # Supplementary card on u11_p5_2
            supp_suffix = card_key.replace("u11_p5_2_", "")
            target_name = f"hwg6_u05_supp_{supp_suffix}_illust.webp"

        dest_path = os.path.join(DEST_DIR, target_name)

        # Re-encode directly with PIL Image at quality=92, method=6
        im = Image.open(src_path)
        temp_dest = dest_path + ".tmp.webp"
        im.save(temp_dest, "WEBP", quality=92, method=6)
        new_sz = os.path.getsize(temp_dest)
        os.replace(temp_dest, dest_path)

        new_total_bytes += new_sz

        if winner == "realcugan":
            rc_count += 1
        else:
            as_count += 1

        deployed.append({
            "card_key": card_key,
            "target_name": target_name,
            "winner": winner,
            "orig_kb": orig_sz / 1024.0,
            "new_kb": new_sz / 1024.0,
        })

        if idx % 50 == 0 or idx == len(winner_cards):
            elapsed = time.time() - start_time
            print(f"  [{idx:3d}/{len(winner_cards)}] Deployed & re-encoded ({elapsed:.1f}s) -> "
                  f"Raw: {orig_total_bytes / (1024*1024):.2f} MB -> Optimized: {new_total_bytes / (1024*1024):.2f} MB "
                  f"({(new_total_bytes - orig_total_bytes) / orig_total_bytes * 100.0:+.1f}%)")

    savings_mb = (orig_total_bytes - new_total_bytes) / (1024 * 1024)
    savings_pct = (orig_total_bytes - new_total_bytes) / orig_total_bytes * 100.0
    print(f"\n  -> Deployed {len(deployed)} cards: {rc_count} Real-CUGAN + {as_count} AnimeSharp.")
    print(f"  -> Total WebP payload: {new_total_bytes / (1024 * 1024):.2f} MB (Avg {new_total_bytes / len(deployed) / 1024:.1f} KB/card).")
    print(f"  -> Re-encoding savings: -{savings_mb:.2f} MB ({savings_pct:.1f}% reduction from {orig_total_bytes / (1024*1024):.2f} MB)!")

    # 3. Clean up legacy PNGs now that WebPs are active
    print("\n🧹 Step 3: Removing legacy Grade 6 PNG duplicates from illustration/...")
    removed_png = 0
    for f in os.listdir(DEST_DIR):
        if f.startswith("hwg6_") and f.endswith("_illust.png"):
            os.remove(os.path.join(DEST_DIR, f))
            removed_png += 1
    print(f"  -> Removed {removed_png} legacy PNGs from active illustration folder.")

    # 4. Update master_vocabulary.json
    print("\n📝 Step 4: Updating public/data/master_vocabulary.json to .webp and ensuring Grade 6 isolation...")
    with open(MASTER_VOCAB_PATH, "r", encoding="utf-8") as f:
        master = json.load(f)

    # Build reverse lookup for newly deployed cards: english word -> webp relative path
    word_to_webp = {}
    for item_key, s_info in sheet_item_map.items():
        w_en = s_info["en"].lower().replace("_", " ")
        word_to_webp[w_en] = f"cards/illustration/{s_info['target_webp']}"
        # Also map raw en
        word_to_webp[s_info["en"].lower()] = f"cards/illustration/{s_info['target_webp']}"

    updated_fields = 0
    native_g6_relinked = 0

    for w in master:
        en_clean = w.get("english", "").lower().strip()
        mbg = w.get("media_by_grade", {})

        if "ES_G6" in mbg and isinstance(mbg["ES_G6"], dict):
            ci = mbg["ES_G6"].get("card_image", "")

            # 4a. Update hwg6_ PNG to WebP
            if ci and "hwg6_" in ci and ci.endswith("_illust.png"):
                mbg["ES_G6"]["card_image"] = ci[:-4] + ".webp"
                updated_fields += 1
            # 4b. If previously borrowed from hwg5_, check if native G6 card exists
            elif ci and "hwg5_" in ci and en_clean in word_to_webp:
                native_path = word_to_webp[en_clean]
                mbg["ES_G6"]["card_image"] = native_path
                native_g6_relinked += 1
                updated_fields += 1

        # Check hwg_card_illust on word root
        hci = w.get("hwg_card_illust", "")
        if hci and "hwg6_" in hci and hci.endswith("_illust.png"):
            w["hwg_card_illust"] = hci[:-4] + ".webp"
            updated_fields += 1

    with open(MASTER_VOCAB_PATH, "w", encoding="utf-8") as f:
        json.dump(master, f, indent=2, ensure_ascii=False)

    print(f"  -> Updated {updated_fields} image references in master_vocabulary.json.")
    print(f"  -> Re-linked {native_g6_relinked} Grade 6 words previously borrowed from Grade 5 to native Grade 6 cards!")

    # 5. Verification audit
    print("\n🔍 Step 5: Verification audit...")
    webp_in_dest = [f for f in os.listdir(DEST_DIR) if f.startswith("hwg6_") and f.endswith("_illust.webp")]
    png_in_dest = [f for f in os.listdir(DEST_DIR) if f.startswith("hwg6_") and f.endswith("_illust.png")]
    print(f"  • Deployed Grade 6 WebP cards present: {len(webp_in_dest)} / {len(deployed)}")
    print(f"  • Legacy Grade 6 PNGs remaining in active folder: {len(png_in_dest)}")
    print(f"  • Legacy PNGs safely archived in backup: {len(os.listdir(BACKUP_DIR))}")

    # Inspect 5 sample cards
    print("\n🖼️ Sample Deployed Grade 6 Cards:")
    for sample in webp_in_dest[:5]:
        p = os.path.join(DEST_DIR, sample)
        sz_kb = os.path.getsize(p) / 1024.0
        im = Image.open(p)
        print(f"  • {sample:45s} | {im.size[0]}x{im.size[1]} | {sz_kb:.1f} KB")

    print("\n" + "=" * 100)
    print("🎉 GRADE 6 HYBRID DEPLOYMENT & RE-ENCODING COMPLETE!")
    print("=" * 100)


if __name__ == "__main__":
    main()
