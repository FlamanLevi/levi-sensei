import os
import sys
import csv
import shutil
import json
import re

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

JP_MAP = {
    "プロゴルファー猿田彦": "sarudahiko_coffee",
    "王と王妃と奴隷": "king_and_queen",
    "緊迫": "kinpaku_tension",
    "勝利": "shori_victory",
    "優美に燃ゆ": "yuubi_ni_moyu",
    "カラクリビト": "karakuribito"
}

def sanitize_filename(title: str) -> str:
    # Transliterate known Japanese titles
    for jp, en in JP_MAP.items():
        if jp in title:
            title = title.replace(jp, en)
    # Remove special chars, Japanese, and spaces -> snake_case
    clean = re.sub(r'[^\w\s-]', '', title).strip().lower()
    clean = re.sub(r'[-\s]+', '_', clean)
    return clean[:36]

def main():
    master_csv = "reports/bgm_master_analysis.csv"
    if not os.path.exists(master_csv):
        print(f"Error: {master_csv} not found.")
        return

    with open(master_csv, mode="r", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    base_dest = r"public\media\bgm"
    os.makedirs(base_dest, exist_ok=True)

    packs_config = {
        "initial_d": {
            "name": "Mt. Akina Eurobeat",
            "franchise": "Initial D",
            "description": "High-octane Eurobeat adrenaline & touge racing hype",
            "slots": [
                ("lobby", "☕", 2),
                ("quiz", "⚡", 4),
                ("rush", "🏎️", 5),
                ("boss", "🔥", 5),
                ("podium", "🏆", 2)
            ]
        },
        "persona_5": {
            "name": "Phantom Thieves",
            "franchise": "Persona 5",
            "description": "Stylish Tokyo acid jazz, funk, and high-stakes heist grooves",
            "slots": [
                ("lobby", "☕", 2),
                ("quiz", "🎷", 5),
                ("rush", "🏎️", 4),
                ("boss", "🔥", 4),
                ("podium", "🏆", 1)
            ]
        },
        "wangan": {
            "name": "Midnight Expressway",
            "franchise": "Wangan Midnight",
            "description": "90s/2000s arcade electronic highway trance by Yuzo Koshiro",
            "slots": [
                ("lobby", "☕", 2),
                ("quiz", "⚡", 5),
                ("rush", "🏎️", 5),
                ("boss", "🔥", 3),
                ("podium", "🏆", 2)
            ]
        },
        "yakuza": {
            "name": "Kamurocho Legends",
            "franchise": "Yakuza / Like a Dragon",
            "description": "Hard-hitting Tokyo street brawler rock, brass, and swagger",
            "slots": [
                ("lobby", "☕", 2),
                ("quiz", "🎷", 5),
                ("rush", "🏎️", 5),
                ("boss", "🔥", 5),
                ("podium", "🏆", 2)
            ]
        }
    }

    manifest_output = {}
    total_copied = 0
    total_bytes = 0

    for pack_key, pack_info in packs_config.items():
        pack_folder = os.path.join(base_dest, pack_key)
        os.makedirs(pack_folder, exist_ok=True)
        print(f"\n📂 Processing Sound Pack: {pack_info['name']} -> {pack_folder}")

        manifest_output[pack_key] = {
            "id": pack_key,
            "name": pack_info["name"],
            "franchise": pack_info["franchise"],
            "description": pack_info["description"],
            "tracks": []
        }

        # Filter tracks for this franchise, score >= 75, and valid MP3
        franchise_name = pack_info["franchise"]
        f_rows = [
            r for r in rows 
            if r["franchise"] == franchise_name and float(r["score"]) >= 75 and r["file_path"].lower().endswith(".mp3")
        ]

        # In Persona 5, if special tracks like 勝利 are tagged
        for role, prefix, limit in pack_info["slots"]:
            matches = [r for r in f_rows if r["category"].startswith(prefix)][:limit]
            
            for idx, item in enumerate(matches, 1):
                src = item["file_path"]
                if not os.path.exists(src):
                    print(f"  ❌ Missing: {src}")
                    continue

                raw_title = item["title"]
                safe_slug = sanitize_filename(raw_title)
                dst_filename = f"{role}_{idx:02d}_{safe_slug}.mp3"
                dst_path = os.path.join(pack_folder, dst_filename)

                # Copy file
                shutil.copy2(src, dst_path)
                file_size = os.path.getsize(dst_path)
                total_bytes += file_size
                total_copied += 1

                rel_url = f"/media/bgm/{pack_key}/{dst_filename}".replace("\\", "/")
                print(f"  ✅ Copied [{role.upper():6}] {raw_title[:32]} -> {dst_filename} ({file_size / (1024*1024):.2f} MB)")

                manifest_output[pack_key]["tracks"].append({
                    "id": f"{pack_key}_{role}_{idx:02d}",
                    "role": role,
                    "title": raw_title,
                    "bpm": float(item["bpm"]),
                    "duration": item["duration"],
                    "score": float(item["score"]),
                    "filename": dst_filename,
                    "url": rel_url
                })

    # Save sound_packs.json manifest
    manifest_path = os.path.join(base_dest, "sound_packs.json")
    with open(manifest_path, mode="w", encoding="utf-8") as f:
        json.dump(manifest_output, f, indent=2, ensure_ascii=False)

    print("\n" + "=" * 80)
    print(f"🎉 Successfully copied and organized {total_copied} tracks into {base_dest}!")
    print(f"📦 Total size: {total_bytes / (1024*1024):.2f} MB")
    print(f"📄 Generated master manifest: {manifest_path}")
    print("=" * 80)

if __name__ == "__main__":
    main()
