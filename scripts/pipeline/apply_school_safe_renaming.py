import os
import sys
import json
import shutil

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# Wholesome, school-safe replacements
SAFE_RENAMES = {
    # 1. YAKUZA -> DRAGON / KAMUROCHO
    "yakuza": {
        "new_id": "dragon",
        "new_name": "Dragon Legends",
        "new_folder": "dragon",
        "new_description": "Energetic Tokyo arcade brass, hard rock, and heroic swagger",
        "track_edits": {
            "lobby_01_sub_comical_01.mp3": {
                "filename": "lobby_01_playful_stroll.mp3",
                "title": "Playful Stroll (Comical Groove)"
            },
            "lobby_02_5_casino.mp3": {
                "filename": "lobby_02_golden_lounge.mp3",
                "title": "Golden Lounge (Smooth Brass)"
            },
            "quiz_01_8_fish_on_ver2.mp3": {
                "filename": "quiz_01_fish_on_groove.mp3",
                "title": "Fish On! (Funky Bass)"
            },
            "quiz_02_26_yuubi_ni_moyu.mp3": {
                "filename": "quiz_02_burn_gracefully.mp3",
                "title": "優美に燃ゆ (Burn Gracefully)"
            },
            "quiz_03_18_for_will.mp3": {
                "filename": "quiz_03_for_will.mp3",
                "title": "For Will (Tactical Determination)"
            },
            "quiz_04_sound_0000003f.mp3": {
                "filename": "quiz_04_kamurocho_rhythm.mp3",
                "title": "Kamurocho Rhythm"
            },
            "quiz_05_sound_00000044.mp3": {
                "filename": "quiz_05_street_jazz_beat.mp3",
                "title": "Street Jazz Beat"
            },
            "rush_01_7_kingdom_of_massacre.mp3": {
                "filename": "rush_01_kingdom_of_glory.mp3",
                "title": "Kingdom of Glory (High-Speed Battle)"
            },
            "rush_02_sound_00000065.mp3": {
                "filename": "rush_02_sprint_dash.mp3",
                "title": "Sprint Dash"
            },
            "rush_03_25_teufel_mit_liebe.mp3": {
                "filename": "rush_03_rock_stride.mp3",
                "title": "Rock Stride (Guitar Energy)"
            },
            "rush_04_21_boxcelios_forever.mp3": {
                "filename": "rush_04_boxcelios_arcade.mp3",
                "title": "Boxcelios (Club SEGA Arcade)"
            },
            "rush_05_35_olivier.mp3": {
                "filename": "rush_05_olivier_stride.mp3",
                "title": "Olivier (Street Tempo)"
            },
            "boss_01_10_blaze.mp3": {
                "filename": "boss_01_blaze.mp3",
                "title": "Blaze (Epic Confrontation)"
            },
            "boss_02_20_long_battle_last.mp3": {
                "filename": "boss_02_grand_clash.mp3",
                "title": "Grand Clash (Final Challenge)"
            },
            "boss_03_as_you_like_instrumental.mp3": {
                "filename": "boss_03_as_you_like_inst.mp3",
                "title": "As You Like (High-Energy Instrumental)"
            },
            "boss_04_3_entrance_to_the_chaos.mp3": {
                "filename": "boss_04_entrance_to_the_clash.mp3",
                "title": "Entrance to the Clash"
            },
            "boss_05_14_karakuribito.mp3": {
                "filename": "boss_05_karakuribito.mp3",
                "title": "カラクリビト (Clockwork Warrior)"
            },
            "podium_01_31_for_the_victory.mp3": {
                "filename": "podium_01_triumphant_victory.mp3",
                "title": "For the Victory (Award Ceremony)"
            },
            "podium_02_8_victory_road.mp3": {
                "filename": "podium_02_victory_road.mp3",
                "title": "Victory Road (Grand Brass Fanfare)"
            }
        }
    },
    # 2. PERSONA 5 SAFETY REFINEMENTS
    "persona_5": {
        "new_id": "persona_5",
        "new_name": "Phantom Thieves",
        "new_folder": "persona_5",
        "new_description": "Stylish Tokyo acid jazz, funk, and high-stakes heist grooves",
        "track_edits": {
            "lobby_02_15_king_and_queen_another_version_.mp3": {
                "filename": "lobby_02_royal_waltz.mp3",
                "title": "Royal Palace Waltz (Another Version)"
            },
            "rush_03_1_04_daredevil.mp3": {
                "filename": "rush_03_phantom_dash.mp3",
                "title": "Phantom Dash (Strikers Rock)"
            },
            "boss_01_26_blooming_villain.mp3": {
                "filename": "boss_01_blooming_rival.mp3",
                "title": "Blooming Rival (Palace Boss)"
            }
        }
    }
}

def main():
    bgm_base = r"public\media\bgm"
    manifest_path = os.path.join(bgm_base, "sound_packs.json")

    with open(manifest_path, mode="r", encoding="utf-8") as f:
        manifest = json.load(f)

    # 1. Rename folder if needed (yakuza -> dragon)
    old_yakuza_dir = os.path.join(bgm_base, "yakuza")
    new_dragon_dir = os.path.join(bgm_base, "dragon")
    if os.path.exists(old_yakuza_dir) and not os.path.exists(new_dragon_dir):
        os.rename(old_yakuza_dir, new_dragon_dir)
        print("📁 Renamed directory: yakuza/ -> dragon/")

    new_manifest = {}

    for pack_id, pack_data in manifest.items():
        if pack_id in SAFE_RENAMES:
            rules = SAFE_RENAMES[pack_id]
            target_id = rules["new_id"]
            target_name = rules["new_name"]
            target_folder = rules["new_folder"]
            target_desc = rules["new_description"]
            folder_path = os.path.join(bgm_base, target_folder)

            print(f"\n🛡️ Applying School-Safe Naming to Pack: {target_name} ({target_folder}/)")

            updated_tracks = []
            for t in pack_data["tracks"]:
                old_fn = t["filename"]
                if old_fn in rules["track_edits"]:
                    edit = rules["track_edits"][old_fn]
                    new_fn = edit["filename"]
                    new_title = edit["title"]

                    old_path = os.path.join(folder_path, old_fn)
                    new_path = os.path.join(folder_path, new_fn)

                    if os.path.exists(old_path):
                        os.rename(old_path, new_path)
                        print(f"  ✏️ Renamed: {old_fn} -> {new_fn}")

                    t["filename"] = new_fn
                    t["title"] = new_title
                    t["url"] = f"/media/bgm/{target_folder}/{new_fn}"
                    t["id"] = t["id"].replace(pack_id, target_id)
                else:
                    # Update URL prefix if pack folder changed
                    t["url"] = f"/media/bgm/{target_folder}/{t['filename']}"
                    t["id"] = t["id"].replace(pack_id, target_id)

                updated_tracks.append(t)

            new_manifest[target_id] = {
                "id": target_id,
                "name": target_name,
                "franchise": "Dragon Legends" if target_id == "dragon" else pack_data["franchise"],
                "description": target_desc,
                "tracks": updated_tracks
            }
        else:
            new_manifest[pack_id] = pack_data

    # Save sanitized manifest
    with open(manifest_path, mode="w", encoding="utf-8") as f:
        json.dump(new_manifest, f, indent=2, ensure_ascii=False)

    print("\n✅ Manifest successfully updated with 100% Elementary School Safe metadata!")

if __name__ == "__main__":
    main()
