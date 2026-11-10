import os
import sys
import csv

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

def consolidate():
    e_music_csv = "reports/bgm_e_music_dual_stage.csv"
    yakuza_csv = "reports/bgm_yakuza_analysis.csv"
    master_csv = "reports/bgm_master_analysis.csv"

    if not os.path.exists(e_music_csv):
        print(f"Error: {e_music_csv} does not exist yet.")
        return

    all_tracks = []

    PODIUM_WORDS = ["result", "clear results", "ranking", "view the ranking", "winner", "victory", "勝利", "all clear", "fanfare", "the race is over"]

    # Read E:\Music dataset
    with open(e_music_csv, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for r in reader:
            r["franchise"] = "Initial D" if "Initial D" in r.get("album", "") or "Initial D" in r.get("file_path", "") else (
                "Persona 5" if "Persona 5" in r.get("album", "") or "Persona 5" in r.get("file_path", "") else (
                    "Wangan Midnight" if "Wangan" in r.get("album", "") or "Wangan" in r.get("file_path", "") else "Miscellaneous"
                )
            )
            t_lower = r.get("title", "").lower()
            if any(pw in t_lower for pw in PODIUM_WORDS) and float(r.get("score", 0)) >= 50:
                r["category"] = "🏆 Victory Podium & Awards"
                # Boost score to account for lower BPM in cool-down celebration tracks
                r["score"] = str(min(94, int(float(r.get("score", 50)) + 30)))
            all_tracks.append(r)

    # Read Yakuza dataset if present
    if os.path.exists(yakuza_csv):
        with open(yakuza_csv, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for r in reader:
                r["franchise"] = "Yakuza / Like a Dragon"
                t_lower = r.get("title", "").lower()
                old_cat = r.get("category", "")
                bpm_val = float(r.get("bpm", 120))

                if any(pw in t_lower for pw in PODIUM_WORDS) and float(r.get("score", 0)) >= 50:
                    r["category"] = "🏆 Victory Podium & Awards"
                    r["score"] = str(min(94, int(float(r.get("score", 50)) + 30)))
                elif "Standard Quiz" in old_cat:
                    r["category"] = "🎷 Tactical Groove (MCQ / Volleyball)"
                elif "Sprint Race" in old_cat:
                    if bpm_val >= 150:
                        r["category"] = "🔥 Boss Battle / Raid"
                    else:
                        r["category"] = "🏎️ High-Speed Rush (Instrumental)"
                elif "Focus / Warm-up" in old_cat:
                    r["category"] = "☕ Lobby & Waiting Room"
                elif "Needs Trim" in old_cat:
                    r["category"] = "⚠️ Needs Trim / Slow Intro"

                # Map missing clap fields
                for k in [
                    "clap_valence", "clap_arousal", "clap_inst_bias",
                    "clap_quiz_sim", "clap_blitz_sim", "clap_boss_sim", 
                    "clap_rush_sim", "clap_menu_sim", "clap_podium_sim"
                ]:
                    if k not in r:
                        r[k] = ""
                all_tracks.append(r)

    # Convert score and bpm for sorting
    for t in all_tracks:
        try:
            t["score_val"] = float(t.get("score", 0))
            t["bpm_val"] = float(t.get("bpm", 0))
        except Exception:
            t["score_val"] = 0
            t["bpm_val"] = 0

    all_tracks.sort(key=lambda x: (x["score_val"], x["bpm_val"]), reverse=True)

    fieldnames = [
        "title", "franchise", "album", "score", "category", "bpm", "intro_punch", 
        "duration", "duration_sec", "perc_ratio", "flatness", 
        "loudness_db", "tail_silence", "breakdown_sec", "lulls",
        "clap_valence", "clap_arousal", "clap_inst_bias",
        "clap_quiz_sim", "clap_blitz_sim", "clap_boss_sim", "clap_rush_sim", "clap_menu_sim", "clap_podium_sim",
        "file_path"
    ]

    with open(master_csv, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        for t in all_tracks:
            writer.writerow(t)

    print(f"✅ Consolidated Master Scorecard saved to: {master_csv}")
    print(f"Total tracks in master dataset: {len(all_tracks)}")

    # Distribution by Franchise
    franchises = {}
    for t in all_tracks:
        f = t["franchise"]
        franchises[f] = franchises.get(f, 0) + 1
    for f, c in franchises.items():
        print(f" • {f}: {c} tracks")

if __name__ == "__main__":
    consolidate()
