import os
import sys
import shutil
import json

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

ROOT = r"c:\Antigravity\levi-sensei (new)"
PUBLIC_BGM = os.path.join(ROOT, "public", "media", "bgm")

# 1. Sources for replacements
REPLACEMENTS = {
    os.path.join(PUBLIC_BGM, "wangan", "rush_04_drive_me_crazy.mp3"): (
        r"E:\Music\Wangan Midnight Maximum Tune\2 - WMMT5DX+\BGM 01 Drive Me Crazy.mp3",
        {"title": "Drive Me Crazy", "bpm": 136.0, "duration": "6:02", "score": 74.0}
    ),
    os.path.join(PUBLIC_BGM, "wangan", "podium_02_result_maxi2.mp3"): (
        r"E:\Music\Wangan Midnight Maximum Tune\6 - WMMT3\617 - Yuzo Koshiro - Result (Maxi2 Version).mp3",
        {"title": "Result (Maxi 2)", "bpm": 139.6, "duration": "2:13", "score": 84.0}
    ),
    os.path.join(PUBLIC_BGM, "initial_d", "podium_02_takumi_shouri.mp3"): (
        r"E:\Music\Initial D Soundtracks\Initial D - The Movie OST\Initial D The Movie OST - 14 - Takumi Shouri!.mp3",
        {"title": "Takumi Shouri", "bpm": 112.3, "duration": "4:06", "score": 68.0}
    ),
    os.path.join(PUBLIC_BGM, "persona_5", "boss_03_will_power.mp3"): (
        r"E:\Music\Persona 5 Original Soundtrack\Disc 1\14. Will Power.mp3",
        {"title": "Will Power", "bpm": 143.6, "duration": "2:45", "score": 70.0}
    )
}

# 2. Complete mapping for all 4 packs with clean filenames and clean titles
CLEAN_PACKS = {
    "initial_d": [
        ("lobby", "lobby_01_12_cardigans_the_love_fool_tees_club.mp3", "lobby_01_lovefool.mp3", "Lovefool", 83.4, "3:17", 91.0),
        ("lobby", "lobby_02_09_jet_fuel_hang_on_here_we_go_theme.mp3", "lobby_02_hang_on_here_we_go.mp3", "Hang On Here We Go", 117.5, "3:41", 90.0),
        ("quiz", "quiz_01_initial_d_extra_stage_ost_14_shouri.mp3", "quiz_01_shouri.mp3", "Shouri", 136.0, "1:00", 94.0),
        ("quiz", "quiz_02_03_never_mind.mp3", "quiz_02_never_mind.mp3", "Never Mind", 136.0, "3:25", 94.0),
        ("quiz", "quiz_03_initial_d_second_stage_sound_files_3.mp3", "quiz_03_counterattack.mp3", "Counterattack!", 136.0, "2:30", 94.0),
        ("quiz", "quiz_04_initial_d_theme_collection_11_jirenm.mp3", "quiz_04_jirenma.mp3", "Jirenma", 136.0, "4:26", 94.0),
        ("rush", "rush_01_initial_d_millenium_box_3_02_dave_ro.mp3", "rush_01_saturday_night_fever.mp3", "Saturday Night Fever", 155.0, "4:47", 95.0),
        ("rush", "rush_02_initial_d_valentina_i_like_you_like_.mp3", "rush_02_i_like_you_like_you_are.mp3", "I Like You Like You Are", 155.0, "4:29", 94.0),
        ("rush", "rush_03_initial_d_move_around_the_worlddave_.mp3", "rush_03_around_the_world.mp3", "Around the World", 154.0, "4:49", 93.0),
        ("rush", "rush_04_initial_d_robert_patton_big_in_japan.mp3", "rush_04_big_in_japan.mp3", "Big in Japan", 154.0, "4:44", 93.0),
        ("rush", "rush_05_initial_d_millenium_box_4_04_valenti.mp3", "rush_05_i_love_you_like_you_are.mp3", "I Love You Like You Are", 154.0, "4:11", 93.0),
        ("boss", "boss_01_25_dont_stand_so_close.mp3", "boss_01_dont_stand_so_close.mp3", "Don't Stand So Close", 158.0, "4:32", 95.0),
        ("boss", "boss_02_initial_d_d_non_stop_mega_mix_10_boo.mp3", "boss_02_boom_boom_japan.mp3", "Boom Boom Japan", 158.0, "2:34", 95.0),
        ("boss", "boss_03_initial_d_d_non_stop_mega_mix_04_dan.mp3", "boss_03_dancing.mp3", "Dancing", 156.0, "2:35", 94.0),
        ("boss", "boss_04_17_be_my_babe.mp3", "boss_04_be_my_babe.mp3", "Be My Babe", 156.0, "5:12", 94.0),
        ("boss", "boss_05_initial_d_d_non_stop_mega_mix_16_may.mp3", "boss_05_maybe_tonite.mp3", "Maybe Tonite", 155.0, "2:32", 93.0),
        ("podium", "podium_01_initial_d_special_stage_ost_02_the_r.mp3", "podium_01_the_race_is_over.mp3", "The Race is Over", 85.0, "2:14", 91.0),
        ("podium", None, "podium_02_takumi_shouri.mp3", "Takumi Shouri", 112.3, "4:06", 68.0)
    ],
    "persona_5": [
        ("lobby", "lobby_01_36_sarudahiko_coffee.mp3", "lobby_01_sarudahiko.mp3", "Sarudahiko", 98.0, "1:55", 90.0),
        ("lobby", "lobby_02_royal_waltz.mp3", "lobby_02_royal_palace_waltz.mp3", "Royal Palace Waltz", 95.0, "2:13", 89.0),
        ("quiz", "quiz_01_20_rivers_in_the_desert_instrumental.mp3", "quiz_01_rivers_in_the_desert.mp3", "Rivers in the Desert", 131.0, "5:15", 94.0),
        ("quiz", "quiz_02_12_kinpaku_tension.mp3", "quiz_02_kinpaku.mp3", "Kinpaku", 130.0, "1:33", 93.0),
        ("quiz", "quiz_03_23_layer_cake.mp3", "quiz_03_layer_cake.mp3", "Layer Cake", 130.0, "2:39", 93.0),
        ("quiz", "quiz_04_24_life_will_change_instrumental_ver.mp3", "quiz_04_life_will_change.mp3", "Life Will Change", 129.0, "2:30", 92.0),
        ("quiz", "quiz_05_19_wake_up_get_up_get_out_there_inst.mp3", "quiz_05_wake_up_get_up.mp3", "Wake Up, Get Up, Get Out There", 129.0, "2:52", 92.0),
        ("rush", "rush_01_29_beneath_the_mask.mp3", "rush_01_beneath_the_mask.mp3", "Beneath the Mask", 152.0, "4:37", 93.0),
        ("rush", "rush_02_01_beneath_the_mask_rain_instrumenta.mp3", "rush_02_beneath_the_mask_rain.mp3", "Beneath the Mask (Rain)", 144.0, "4:38", 93.0),
        ("rush", "rush_03_phantom_dash.mp3", "rush_03_phantom_dash.mp3", "Phantom Dash", 136.0, "4:55", 93.0),
        ("rush", "rush_04_15_high_pressure.mp3", "rush_04_high_pressure.mp3", "High Pressure", 135.0, "2:04", 93.0),
        ("boss", "boss_01_blooming_rival.mp3", "boss_01_blooming_rival.mp3", "Blooming Rival", 135.0, "4:00", 93.0),
        ("boss", "boss_02_27_new_beginning.mp3", "boss_02_new_beginning.mp3", "New Beginning", 134.0, "2:27", 92.0),
        ("boss", None, "boss_03_will_power.mp3", "Will Power", 143.6, "2:45", 70.0),
        ("boss", "boss_04_10_sunset_bridge.mp3", "boss_04_sunset_bridge.mp3", "Sunset Bridge", 133.0, "1:41", 91.0),
        ("podium", "podium_01_19_shori_victory.mp3", "podium_01_victory.mp3", "Victory", 120.0, "1:33", 90.0)
    ],
    "wangan": [
        ("lobby", "lobby_01_20_the_story_starts_here.mp3", "lobby_01_the_story_starts_here.mp3", "The Story Starts Here", 102.0, "3:07", 90.0),
        ("lobby", "lobby_02_08_love_and_gold.mp3", "lobby_02_love_and_gold.mp3", "Love and Gold", 110.0, "5:58", 89.0),
        ("quiz", "quiz_01_04_move_on.mp3", "quiz_01_move_on.mp3", "Move On", 134.0, "5:26", 93.0),
        ("quiz", "quiz_02_05_maximum_synergy.mp3", "quiz_02_maximum_synergy.mp3", "Maximum Synergy", 134.0, "6:07", 93.0),
        ("quiz", "quiz_03_bgm_03_i_will_follow_you.mp3", "quiz_03_i_will_follow_you.mp3", "I Will Follow You", 135.0, "6:48", 93.0),
        ("quiz", "quiz_04_bgm_04_high_speed_monster.mp3", "quiz_04_high_speed_monster.mp3", "High Speed Monster", 135.0, "6:52", 93.0),
        ("quiz", "quiz_05_26_midnight_wave.mp3", "quiz_05_midnight_wave.mp3", "Midnight Wave", 136.0, "6:50", 94.0),
        ("rush", "rush_01_15_beatific_smile.mp3", "rush_01_beatific_smile.mp3", "Beatific Smile", 140.0, "5:33", 94.0),
        ("rush", "rush_02_18_glare.mp3", "rush_02_glare.mp3", "Glare", 144.0, "5:44", 94.0),
        ("rush", "rush_03_204_yuzo_koshiro_driving_energy.mp3", "rush_03_driving_energy.mp3", "Driving Energy", 144.0, "4:44", 94.0),
        ("rush", None, "rush_04_drive_me_crazy.mp3", "Drive Me Crazy", 136.0, "6:02", 74.0),
        ("rush", "rush_05_311_yuzo_koshiro_feel_the_moment.mp3", "rush_05_feel_the_moment.mp3", "Feel the Moment", 144.0, "6:22", 94.0),
        ("boss", "boss_01_17_love_my_own_life.mp3", "boss_01_love_my_own_life.mp3", "Love My Own Life", 135.0, "6:20", 93.0),
        ("boss", "boss_02_19_dont_stop.mp3", "boss_02_dont_stop.mp3", "Don't Stop", 137.0, "5:04", 94.0),
        ("boss", "boss_03_28_happy_moment.mp3", "boss_03_happy_moment.mp3", "Happy Moment", 138.0, "4:20", 94.0),
        ("podium", "podium_01_607_yuzo_koshiro_result_maxi1_versio.mp3", "podium_01_result_maxi1.mp3", "Result (Maxi 1)", 92.0, "2:04", 90.0),
        ("podium", None, "podium_02_result_maxi2.mp3", "Result (Maxi 2)", 139.6, "2:13", 84.0)
    ],
    "dragon": [
        ("lobby", "lobby_01_playful_stroll.mp3", "lobby_01_playful_stroll.mp3", "Playful Stroll", 90.0, "2:08", 89.0),
        ("lobby", "lobby_02_golden_lounge.mp3", "lobby_02_golden_lounge.mp3", "Golden Lounge", 100.0, "2:30", 90.0),
        ("quiz", "quiz_01_fish_on_groove.mp3", "quiz_01_fish_on.mp3", "Fish On!", 128.0, "2:10", 92.0),
        ("quiz", "quiz_02_burn_gracefully.mp3", "quiz_02_burn_gracefully.mp3", "優美に燃ゆ", 132.0, "2:40", 93.0),
        ("quiz", "quiz_03_for_will.mp3", "quiz_03_for_will.mp3", "For Will", 134.0, "3:02", 93.0),
        ("quiz", "quiz_04_kamurocho_rhythm.mp3", "quiz_04_kamurocho_rhythm.mp3", "Kamurocho Rhythm", 130.0, "2:20", 92.0),
        ("quiz", "quiz_05_street_jazz_beat.mp3", "quiz_05_street_jazz_beat.mp3", "Street Jazz Beat", 131.0, "2:15", 92.0),
        ("rush", "rush_01_kingdom_of_glory.mp3", "rush_01_kingdom_of_glory.mp3", "Kingdom of Glory", 148.0, "3:10", 94.0),
        ("rush", "rush_02_sprint_dash.mp3", "rush_02_sprint_dash.mp3", "Sprint Dash", 145.0, "2:45", 94.0),
        ("rush", "rush_03_rock_stride.mp3", "rush_03_rock_stride.mp3", "Rock Stride", 142.0, "2:50", 94.0),
        ("rush", "rush_04_boxcelios_arcade.mp3", "rush_04_boxcelios.mp3", "Boxcelios", 140.0, "2:30", 93.0),
        ("rush", "rush_05_olivier_stride.mp3", "rush_05_olivier.mp3", "Olivier", 138.0, "2:40", 93.0),
        ("boss", "boss_01_blaze.mp3", "boss_01_blaze.mp3", "Blaze", 146.0, "3:30", 94.0),
        ("boss", "boss_02_grand_clash.mp3", "boss_02_grand_clash.mp3", "Grand Clash", 150.0, "3:15", 95.0),
        ("boss", "boss_03_as_you_like_inst.mp3", "boss_03_as_you_like.mp3", "As You Like", 144.0, "2:55", 94.0),
        ("boss", "boss_04_entrance_to_the_clash.mp3", "boss_04_entrance_to_the_clash.mp3", "Entrance to the Clash", 142.0, "3:05", 93.0),
        ("boss", "boss_05_karakuribito.mp3", "boss_05_karakuribito.mp3", "カラクリビト", 140.0, "2:50", 93.0),
        ("podium", "podium_01_triumphant_victory.mp3", "podium_01_for_the_victory.mp3", "For the Victory", 95.0, "2:20", 90.0),
        ("podium", "podium_02_victory_road.mp3", "podium_02_victory_road.mp3", "Victory Road", 100.0, "2:40", 91.0)
    ]
}

def main():
    print("--- 1. Copying replacement files ---")
    for dest, (src, meta) in REPLACEMENTS.items():
        if os.path.exists(src):
            print(f"Copying {src} -> {dest}")
            shutil.copy2(src, dest)
        else:
            print(f"ERROR: Source file not found: {src}")

    print("\n--- 2. Renaming files to clean names ---")
    # First rename to temporary names if needed to prevent collision, then to final names
    for pack_id, tracks in CLEAN_PACKS.items():
        pack_dir = os.path.join(PUBLIC_BGM, pack_id)
        for role, old_file, new_file, title, bpm, duration, score in tracks:
            if old_file and old_file != new_file:
                old_path = os.path.join(pack_dir, old_file)
                new_path = os.path.join(pack_dir, new_file)
                if os.path.exists(old_path):
                    if os.path.exists(new_path) and old_path != new_path:
                        temp_path = new_path + ".tmp"
                        os.rename(new_path, temp_path)
                    print(f"[{pack_id}] {old_file} -> {new_file}")
                    os.rename(old_path, new_path)

    # Clean up old duplicate files if any remain
    wangan_dup1 = os.path.join(PUBLIC_BGM, "wangan", "rush_04_204_yuzo_koshiro_driving_energy.mp3")
    wangan_dup2 = os.path.join(PUBLIC_BGM, "wangan", "podium_02_607_yuzo_koshiro_result_maxi1_versio.mp3")
    initial_d_dup = os.path.join(PUBLIC_BGM, "initial_d", "podium_02_initial_d_the_race_is_over.mp3")
    p5_old_boss3 = os.path.join(PUBLIC_BGM, "persona_5", "boss_03_09_beneath_the_mask_instrumental_ver.mp3")

    for old_dup in [wangan_dup1, wangan_dup2, initial_d_dup, p5_old_boss3]:
        if os.path.exists(old_dup):
            print(f"Removing replaced duplicate: {old_dup}")
            os.remove(old_dup)

    print("\n--- 3. Generating sound_packs.json and soundPacks.ts ---")
    sound_packs_data = {}

    PACK_METAS = {
        "all_stars": {
            "name": "Levi-Sensei All-Stars",
            "nameJa": "オールスター",
            "icon": "🎲",
            "franchise": "Curated Champions",
            "badgeColor": "bg-indigo-500 text-white",
            "accentBorder": "border-indigo-500",
            "bgLight": "bg-indigo-50/80 hover:bg-indigo-100/80",
            "bgDark": "dark:bg-indigo-950/40 dark:hover:bg-indigo-900/40",
            "description": "Cross-franchise champion mix handpicked for maximum classroom hype",
            "descriptionJa": "全フランチャイズから厳選されたベスト曲ミックス"
        },
        "initial_d": {
            "name": "Mt. Akina Eurobeat",
            "nameJa": "峠のユーロビート",
            "icon": "🏎️",
            "franchise": "Eurobeat",
            "badgeColor": "bg-amber-500 text-white",
            "accentBorder": "border-amber-500",
            "bgLight": "bg-amber-50/80 hover:bg-amber-100/80",
            "bgDark": "dark:bg-amber-950/40 dark:hover:bg-amber-900/40",
            "description": "High-RPM Super Eurobeat racing anthems for adrenaline and sprint races",
            "descriptionJa": "最高速のユーロビート！超高速レースや集中クイズに最適"
        },
        "persona_5": {
            "name": "Phantom Thieves",
            "nameJa": "怪盗団のジャズ",
            "icon": "🎷",
            "franchise": "Acid Jazz & Funk",
            "badgeColor": "bg-rose-500 text-white",
            "accentBorder": "border-rose-500",
            "bgLight": "bg-rose-50/80 hover:bg-rose-100/80",
            "bgDark": "dark:bg-rose-950/40 dark:hover:bg-rose-900/40",
            "description": "Stylish tactical funk, brass grooves and acid jazz",
            "descriptionJa": "スタイリッシュなアシッドジャズ＆ファンクサウンド"
        },
        "wangan": {
            "name": "Midnight Expressway",
            "nameJa": "湾岸ミッドナイト",
            "icon": "🌙",
            "franchise": "Trance & Dance",
            "badgeColor": "bg-cyan-500 text-white",
            "accentBorder": "border-cyan-500",
            "bgLight": "bg-cyan-50/80 hover:bg-cyan-100/80",
            "bgDark": "dark:bg-cyan-950/40 dark:hover:bg-cyan-900/40",
            "description": "Hypnotic high-speed highway trance and electronic energy",
            "descriptionJa": "疾走感あふれるハイウェイトランス＆エレクトロニック"
        },
        "dragon": {
            "name": "Dragon Legends",
            "nameJa": "龍の伝説",
            "icon": "🐉",
            "franchise": "Heroic Rock & Brass",
            "badgeColor": "bg-red-600 text-white",
            "accentBorder": "border-red-600",
            "bgLight": "bg-red-50/80 hover:bg-red-100/80",
            "bgDark": "dark:bg-red-950/40 dark:hover:bg-red-900/40",
            "description": "Heroic guitar riffs, brass fanfares, and fierce boss anthems",
            "descriptionJa": "熱血ギターリフと勇壮なブラス！大熱戦のバトルサウンド"
        },
        "mario": {
            "name": "Mushroom Kingdom",
            "nameJa": "キノコ王国",
            "icon": "🍄",
            "franchise": "Nintendo Classics",
            "badgeColor": "bg-emerald-500 text-white",
            "accentBorder": "border-emerald-500",
            "bgLight": "bg-emerald-50/80 hover:bg-emerald-100/80",
            "bgDark": "dark:bg-emerald-950/40 dark:hover:bg-emerald-900/40",
            "description": "Whimsical and cheerful classic video game tunes",
            "descriptionJa": "親しみやすい任天堂クラシックス！低学年にも大人気"
        },
        "none": {
            "name": "Silent (SFX Only)",
            "nameJa": "無音 (効果音のみ)",
            "icon": "🔇",
            "franchise": "Classroom Audio",
            "badgeColor": "bg-slate-500 text-white",
            "accentBorder": "border-slate-500",
            "bgLight": "bg-slate-100 hover:bg-slate-200",
            "bgDark": "dark:bg-slate-800 dark:hover:bg-slate-700",
            "description": "Background music muted; quiz sound effects and speech only",
            "descriptionJa": "BGMなし・効果音と音声のみ"
        }
    }

    all_tracks = []

    for pack_id in ["initial_d", "persona_5", "wangan", "dragon"]:
        meta = PACK_METAS[pack_id]
        pack_tracks = []
        for role, _, clean_file, clean_title, bpm, duration, score in CLEAN_PACKS[pack_id]:
            track_id = f"{pack_id}_{clean_file.replace('.mp3', '')}"
            track_obj = {
                "id": track_id,
                "role": role,
                "title": clean_title,
                "bpm": bpm,
                "duration": duration,
                "score": score,
                "filename": clean_file,
                "url": f"/media/bgm/{pack_id}/{clean_file}"
            }
            pack_tracks.append(track_obj)
            all_tracks.append(track_obj)

        sound_packs_data[pack_id] = {
            "id": pack_id,
            **meta,
            "tracks": pack_tracks
        }

    # Add Mario
    mario_tracks = [
        {"id": "mario_01", "role": "rush", "title": "Mario Kart 🏁", "bpm": 134.0, "duration": "2:30", "score": 90.0, "filename": "mariokart.mp3", "url": "/media/bgm/mario/mariokart.mp3"},
        {"id": "mario_02", "role": "quiz", "title": "New Super Mario Bros 2 🍄", "bpm": 130.0, "duration": "2:15", "score": 88.0, "filename": "newsupermariobros2.mp3", "url": "/media/bgm/mario/newsupermariobros2.mp3"},
        {"id": "mario_03", "role": "quiz", "title": "New Super Mario Bros Wii ⭐", "bpm": 128.0, "duration": "2:40", "score": 88.0, "filename": "newsupermariobroswii.mp3", "url": "/media/bgm/mario/newsupermariobroswii.mp3"},
        {"id": "mario_04", "role": "quiz", "title": "Super Mario World 🦖", "bpm": 124.0, "duration": "2:20", "score": 86.0, "filename": "supermarioworld.mp3", "url": "/media/bgm/mario/supermarioworld.mp3"},
        {"id": "mario_05", "role": "lobby", "title": "Wario Land 💰", "bpm": 118.0, "duration": "2:10", "score": 85.0, "filename": "warioland.mp3", "url": "/media/bgm/mario/warioland.mp3"}
    ]
    sound_packs_data["mario"] = {
        "id": "mario",
        **PACK_METAS["mario"],
        "tracks": mario_tracks
    }
    all_tracks.extend(mario_tracks)

    # All Stars
    all_stars_pack = {
        "id": "all_stars",
        **PACK_METAS["all_stars"],
        "tracks": all_tracks
    }

    # None
    none_pack = {
        "id": "none",
        **PACK_METAS["none"],
        "tracks": []
    }

    final_registry = {
        "all_stars": all_stars_pack,
        "initial_d": sound_packs_data["initial_d"],
        "persona_5": sound_packs_data["persona_5"],
        "wangan": sound_packs_data["wangan"],
        "dragon": sound_packs_data["dragon"],
        "mario": sound_packs_data["mario"],
        "none": none_pack
    }

    # Write JSON
    json_path = os.path.join(PUBLIC_BGM, "sound_packs.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(final_registry, f, ensure_ascii=False, indent=2)
    print(f"Wrote {json_path} successfully!")

    # Write TypeScript
    ts_path = os.path.join(ROOT, "src", "utils", "soundPacks.ts")
    ts_content = f"""// Authoritative Sound Packs Registry for Levi-Sensei English Platform
// Generated automatically with cleaned canonical titles and zero duplicate tracks

export interface SoundTrack {{
  id: string;
  role: 'lobby' | 'quiz' | 'rush' | 'boss' | 'podium';
  title: string;
  bpm: number;
  duration: string;
  score: number;
  filename: string;
  url: string;
}}

export interface SoundPack {{
  id: string;
  name: string;
  nameJa: string;
  franchise: string;
  icon: string;
  badgeColor: string;
  accentBorder: string;
  bgLight: string;
  bgDark: string;
  description: string;
  descriptionJa: string;
  tracks: SoundTrack[];
}}

export const SOUND_PACKS: Record<string, SoundPack> = {json.dumps(final_registry, ensure_ascii=False, indent=2)};

export const SOUND_PACK_LIST: SoundPack[] = Object.values(SOUND_PACKS);

export function getSoundPack(id?: string): SoundPack {{
  if (!id || id === 'none') return SOUND_PACKS.none;
  if (id === 'random_all' || id === 'all') return SOUND_PACKS.all_stars;
  if (id === 'random_mario') return SOUND_PACKS.mario;
  if (id === 'random_wangan') return SOUND_PACKS.wangan;
  return SOUND_PACKS[id] || SOUND_PACKS.all_stars;
}}
"""
    with open(ts_path, "w", encoding="utf-8") as f:
        f.write(ts_content)
    print(f"Wrote {ts_path} successfully!")

if __name__ == "__main__":
    main()
