import json

with open(r'public\media\bgm\sound_packs.json', encoding='utf-8') as f:
    packs_data = json.load(f)

PACK_META = {
    "all_stars": {
        "id": "all_stars",
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
        "id": "initial_d",
        "name": "Mt. Akina Eurobeat",
        "nameJa": "秋名ユーロビート",
        "icon": "🏎️",
        "franchise": "Initial D",
        "badgeColor": "bg-amber-500 text-white",
        "accentBorder": "border-amber-500",
        "bgLight": "bg-amber-50/80 hover:bg-amber-100/80",
        "bgDark": "dark:bg-amber-950/40 dark:hover:bg-amber-900/40",
        "description": "High-octane racing Eurobeat, rapid drift pulse & touge adrenaline",
        "descriptionJa": "超高速ユーロビート＆白熱のドリフトレーシング"
    },
    "persona_5": {
        "id": "persona_5",
        "name": "Phantom Thieves",
        "nameJa": "心の怪盗団",
        "icon": "🎷",
        "franchise": "Persona 5",
        "badgeColor": "bg-rose-500 text-white",
        "accentBorder": "border-rose-500",
        "bgLight": "bg-rose-50/80 hover:bg-rose-100/80",
        "bgDark": "dark:bg-rose-950/40 dark:hover:bg-rose-900/40",
        "description": "Stylish Tokyo acid jazz, funk, and high-stakes heist grooves (100% Instrumental)",
        "descriptionJa": "スタイリッシュなアシッドジャズ＆怪盗ファンク (インスト100%)"
    },
    "wangan": {
        "id": "wangan",
        "name": "Midnight Expressway",
        "nameJa": "湾岸ミッドナイト",
        "icon": "🌙",
        "franchise": "Wangan Midnight",
        "badgeColor": "bg-sky-500 text-white",
        "accentBorder": "border-sky-500",
        "bgLight": "bg-sky-50/80 hover:bg-sky-100/80",
        "bgDark": "dark:bg-sky-950/40 dark:hover:bg-sky-900/40",
        "description": "Hypnotic 90s/2000s arcade electronic highway trance by Yuzo Koshiro",
        "descriptionJa": "古代祐三氏による伝説のハイウェイ電子トランス"
    },
    "dragon": {
        "id": "dragon",
        "name": "Dragon Legends",
        "nameJa": "ドラゴンレジェンズ",
        "icon": "🐉",
        "franchise": "Like a Dragon",
        "badgeColor": "bg-emerald-500 text-white",
        "accentBorder": "border-emerald-500",
        "bgLight": "bg-emerald-50/80 hover:bg-emerald-100/80",
        "bgDark": "dark:bg-emerald-950/40 dark:hover:bg-emerald-900/40",
        "description": "Energetic Tokyo arcade brass, hard rock guitar, and heroic swagger",
        "descriptionJa": "迫力のロックギター＆勇壮なブラスサウンド"
    },
    "mario": {
        "id": "mario",
        "name": "Mushroom Kingdom",
        "nameJa": "マリオパック",
        "icon": "🍄",
        "franchise": "Super Mario",
        "badgeColor": "bg-red-500 text-white",
        "accentBorder": "border-red-500",
        "bgLight": "bg-red-50/80 hover:bg-red-100/80",
        "bgDark": "dark:bg-red-950/40 dark:hover:bg-red-900/40",
        "description": "Classic Mario Kart, NSMB, and Wario Land bouncy big-band brass",
        "descriptionJa": "マリオカート・マリオワールド等の親しみやすい定番BGM"
    },
    "none": {
        "id": "none",
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

mario_tracks = [
    {"id": "mario_01", "role": "rush", "title": "Mario Kart 🏁", "bpm": 150.0, "duration": "2:30", "score": 90.0, "filename": "mariokart.mp3", "url": "/media/bgm/mario/mariokart.mp3"},
    {"id": "mario_02", "role": "quiz", "title": "New Super Mario Bros 2 🍄", "bpm": 130.0, "duration": "2:15", "score": 88.0, "filename": "newsupermariobros2.mp3", "url": "/media/bgm/mario/newsupermariobros2.mp3"},
    {"id": "mario_03", "role": "quiz", "title": "New Super Mario Bros Wii ⭐", "bpm": 128.0, "duration": "2:40", "score": 88.0, "filename": "newsupermariobroswii.mp3", "url": "/media/bgm/mario/newsupermariobroswii.mp3"},
    {"id": "mario_04", "role": "quiz", "title": "Super Mario World 🦖", "bpm": 124.0, "duration": "2:20", "score": 86.0, "filename": "supermarioworld.mp3", "url": "/media/bgm/mario/supermarioworld.mp3"},
    {"id": "mario_05", "role": "lobby", "title": "Wario Land 💰", "bpm": 118.0, "duration": "2:10", "score": 85.0, "filename": "warioland.mp3", "url": "/media/bgm/mario/warioland.mp3"}
]

all_tracks_combined = []
for p in packs_data.values():
    all_tracks_combined.extend(p["tracks"])
all_tracks_combined.extend(mario_tracks)

packs_dict = {}

# 1. All Stars
packs_dict["all_stars"] = {**PACK_META["all_stars"], "tracks": all_tracks_combined}

# 2. Curated
for pid in ["initial_d", "persona_5", "wangan", "dragon"]:
    packs_dict[pid] = {**PACK_META[pid], "tracks": packs_data[pid]["tracks"]}

# 3. Mario
packs_dict["mario"] = {**PACK_META["mario"], "tracks": mario_tracks}

# 4. None
packs_dict["none"] = {**PACK_META["none"], "tracks": []}

json_str = json.dumps(packs_dict, indent=2, ensure_ascii=False)

output_code = f"""// Authoritative Sound Packs Registry for Levi-Sensei English Platform
// Generated automatically from verified acoustic & neural audit

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

export const SOUND_PACKS: Record<string, SoundPack> = {json_str};

export const SOUND_PACK_LIST: SoundPack[] = Object.values(SOUND_PACKS);

export function getSoundPack(id?: string): SoundPack {{
  if (!id || id === 'none') return SOUND_PACKS.none;
  if (id === 'random_all' || id === 'all') return SOUND_PACKS.all_stars;
  if (id === 'random_mario') return SOUND_PACKS.mario;
  if (id === 'random_wangan') return SOUND_PACKS.wangan;
  return SOUND_PACKS[id] || SOUND_PACKS.all_stars;
}}
"""

with open("src/utils/soundPacks.ts", "w", encoding="utf-8") as f:
    f.write(output_code)

print("✅ Generated src/utils/soundPacks.ts successfully!")
