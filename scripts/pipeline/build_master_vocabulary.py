import os
import sys
import json
import re

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

print("=" * 60)
print("BUILDING UNIFIED MASTER VOCABULARY DATABASE")
print("=" * 60)

# 1. Paths
PLAY_DATA_PATH = os.path.join(BASE_DIR, "letstry_data", "DictionaryPlayData_2026912_131010.json")
CONFIG_DIR_1 = os.path.join(BASE_DIR, "letstry1", "resources", "app", "app", "__config", "dic_card_data_config")
SOUND_DIR_1 = os.path.join(BASE_DIR, "letstry1", "resources", "app", "app", "__media", "dictionary", "dic_card_data_sound")
IMAGE_DIR_1 = os.path.join(BASE_DIR, "letstry1", "resources", "app", "app", "__media", "dictionary", "dic_card_data_image")

DOWNLOADS_DIR = r"D:\Users\levif\Downloads"
HWG_VOCAB_PATH_1 = os.path.join(DOWNLOADS_DIR, "vocabulary.json")
HWG_FLAT_PATH = os.path.join(DOWNLOADS_DIR, "flat_vocabulary.json")
REACT_HUB_VOCAB = r"D:\Users\levif\Documents\react-hub\src\data\vocabulary.json"

BORDERLINK_LESSONS_PATH = os.path.join(BASE_DIR, "extracted_lesson_plans", "borderlink_lessons.json")
BORDERLINK_VOCAB_PATH = os.path.join(BASE_DIR, "extracted_lesson_plans", "borderlink_vocab_by_grade.json")

# 2. Build Translation & Metadata Lookup from HWG & React-Hub
translations = {}

def ingest_vocab_dict(data):
    if not isinstance(data, dict):
        return
    for g_key, g_val in data.items():
        if isinstance(g_val, dict):
            # Could be units dict or directly unit names
            units_dict = g_val.get("units", g_val)
            for u_key, u_val in units_dict.items():
                word_list = []
                if isinstance(u_val, dict) and "words" in u_val:
                    word_list = u_val["words"]
                elif isinstance(u_val, list):
                    word_list = u_val
                
                for w in word_list:
                    if isinstance(w, dict) and "en" in w:
                        en_clean = w["en"].strip().lower()
                        if en_clean:
                            if en_clean not in translations:
                                translations[en_clean] = {
                                    "ja_kanji": w.get("ja_kanji", ""),
                                    "ja_hiragana": w.get("ja_hiragana", ""),
                                    "en_katakana": w.get("en_katakana", ""),
                                    "part_of_speech": w.get("part_of_speech", ""),
                                    "tags": w.get("tags", [])
                                }
                            else:
                                # Supplement missing fields
                                for f in ["ja_kanji", "ja_hiragana", "en_katakana", "part_of_speech"]:
                                    if not translations[en_clean][f] and w.get(f):
                                        translations[en_clean][f] = w[f]
                                if w.get("tags"):
                                    for t in w["tags"]:
                                        if t not in translations[en_clean]["tags"]:
                                            translations[en_clean]["tags"].append(t)

# Load HWG vocabulary.json
if os.path.exists(HWG_VOCAB_PATH_1):
    try:
        with open(HWG_VOCAB_PATH_1, "r", encoding="utf-8") as f:
            ingest_vocab_dict(json.load(f))
        print(f"Loaded translations from Downloads/vocabulary.json ({len(translations)} words)")
    except Exception as e:
        print(f"Error loading {HWG_VOCAB_PATH_1}: {e}")

# Load React-Hub vocabulary.json
if os.path.exists(REACT_HUB_VOCAB):
    try:
        with open(REACT_HUB_VOCAB, "r", encoding="utf-8") as f:
            ingest_vocab_dict(json.load(f))
        print(f"Supplemented translations from React-Hub ({len(translations)} words)")
    except Exception as e:
        print(f"Error loading {REACT_HUB_VOCAB}: {e}")

# 3. Load Borderlink Curriculum Lessons & Grade Vocabulary
borderlink_word_index = {} # word_lower -> { grades: set(), themes: set(), lessons: list(), sample_sentences: set() }

if os.path.exists(BORDERLINK_LESSONS_PATH):
    with open(BORDERLINK_LESSONS_PATH, "r", encoding="utf-8") as f:
        bl_lessons = json.load(f)
        for lesson in bl_lessons:
            grade = lesson.get("grade", "")
            theme = lesson.get("theme", "")
            l_num = lesson.get("lesson_number")
            raw_vocab = lesson.get("target_vocab_raw", "")
            raw_lang = lesson.get("target_language", "")
            words = lesson.get("target_vocab_words", [])
            
            for w in words:
                w_clean = re.sub(r'[^a-zA-Z\s-]', '', w).strip().lower()
                if not w_clean or len(w_clean) < 2 or w_clean in ["hello", "good", "great", "procedure"]:
                    continue
                
                if w_clean not in borderlink_word_index:
                    borderlink_word_index[w_clean] = {
                        "grades": set(),
                        "themes": set(),
                        "lessons": [],
                        "target_sentences": set()
                    }
                if grade:
                    borderlink_word_index[w_clean]["grades"].add(grade)
                if theme:
                    borderlink_word_index[w_clean]["themes"].add(theme)
                if l_num:
                    borderlink_word_index[w_clean]["lessons"].append(f"{grade}_L{l_num:02d}")
                if raw_lang:
                    borderlink_word_index[w_clean]["target_sentences"].add(raw_lang)

    print(f"Indexed {len(borderlink_word_index)} vocabulary words from Borderlink curriculum")

# 4. Load MEXT Let's Try Config Categories & Picture Cards
mext_catalog = {} # id -> { sound, image, text, category }

if os.path.exists(CONFIG_DIR_1):
    CATEGORY_NAMES = {
        "category-1.json": "01_action",
        "category-2.json": "02_state",
        "category-3.json": "03_fooddrink",
        "category-4.json": "04_number",
        "category-5.json": "05_schoollife",
        "category-6.json": "06_facility",
        "category-7.json": "07_dailylife",
        "category-8.json": "08_sports",
        "category-9.json": "09_color_shape",
        "category-10.json": "10_calendar_time",
        "category-11.json": "11_animals",
        "category-12.json": "12_nature",
        "category-13.json": "13_position",
        "category-14.json": "14_body_family",
        "category-15.json": "15_festalday"
    }
    
    for c_file, cat_name in CATEGORY_NAMES.items():
        c_path = os.path.join(CONFIG_DIR_1, c_file)
        if os.path.exists(c_path):
            with open(c_path, "r", encoding="utf-8") as f:
                c_data = json.load(f)
                items_dict = c_data[0] if isinstance(c_data, list) and len(c_data) > 0 else c_data
                for num_key, item in items_dict.items():
                    item_id = item.get("id")
                    if item_id:
                        mext_catalog[item_id] = {
                            "sound": item.get("sound", ""),
                            "image": item.get("image", ""),
                            "text": item.get("text", "").strip(),
                            "category": cat_name
                        }

    # Also load 3-picturecard and 4-picturecard for grade-specific card mappings
    for pc_file, grade_tag in [("3-picturecard.json", "ES_G3"), ("4-picturecard.json", "ES_G4")]:
        pc_path = os.path.join(CONFIG_DIR_1, pc_file)
        if os.path.exists(pc_path):
            with open(pc_path, "r", encoding="utf-8") as f:
                pc_data = json.load(f)
                items_dict = pc_data[0] if isinstance(pc_data, list) and len(pc_data) > 0 else pc_data
                for num_key, item in items_dict.items():
                    item_id = item.get("id")
                    if item_id:
                        mext_catalog[item_id] = {
                            "sound": item.get("sound", ""),
                            "image": item.get("image", ""),
                            "text": item.get("text", "").strip(),
                            "category": f"letstry_{grade_tag.lower()}"
                        }
                        
    print(f"Loaded {len(mext_catalog)} MEXT catalog item mappings from config JSONs")

# 5. Load Master Rosetta Stone: DictionaryPlayData_2026912_131010.json
master_vocabulary = []
seen_words = set()

if os.path.exists(PLAY_DATA_PATH):
    with open(PLAY_DATA_PATH, "r", encoding="utf-8") as f:
        play_data = json.load(f)
        playlist = play_data.get("playList", [])
        print(f"Master playlist contains {len(playlist)} total word tokens")
        
        for i, token in enumerate(playlist):
            parts = token.split("&")
            img_prefix = parts[0] if len(parts) > 0 else ""
            sound_stem = parts[1] if len(parts) > 1 else ""
            card_stem = parts[2] if len(parts) > 2 else ""
            
            # Lookup in mext catalog or parse text from token
            cat_entry = mext_catalog.get(img_prefix) or mext_catalog.get(card_stem) or {}
            word_text = cat_entry.get("text", "")
            category = cat_entry.get("category", "")
            
            if not word_text:
                # Try inferring from stem: e.g. dic_wb_03fooddrink_apple_1144 -> apple
                match = re.search(r'dic_(?:wb_\d{2}\w+|[3456]_card)_([a-zA-Z]+)_\d+', img_prefix)
                if match:
                    word_text = match.group(1)
                else:
                    word_text = img_prefix
                    
            w_lower = word_text.strip().lower()
            
            # Check physical file presence
            sound_rel = f"{sound_stem}.mp3"
            sound_exists = os.path.exists(os.path.join(SOUND_DIR_1, sound_rel))
            
            card_base = f"{card_stem}_1.png"
            card_exists = os.path.exists(os.path.join(IMAGE_DIR_1, card_base))
            
            # Translation lookup
            trans = translations.get(w_lower, {})
            
            # Borderlink curriculum lookup
            bl_info = borderlink_word_index.get(w_lower, {})
            bl_grades = sorted(list(bl_info.get("grades", [])))
            bl_themes = sorted(list(bl_info.get("themes", [])))
            bl_sentences = sorted(list(bl_info.get("target_sentences", [])))
            
            # Inferred elementary grade presence from card stem
            detected_grades = set(bl_grades)
            if "dic_3_card" in card_stem or "3-picturecard" in category:
                detected_grades.add("ES_G3")
            if "dic_4_card" in card_stem or "4-picturecard" in category:
                detected_grades.add("ES_G4")
            if "dic_5_card" in card_stem:
                detected_grades.add("ES_G5")
            if "dic_6_card" in card_stem:
                detected_grades.add("ES_G6")
                
            entry = {
                "id": f"word_{i:04d}",
                "token": token,
                "english": word_text,
                "category": category,
                "ja_kanji": trans.get("ja_kanji", ""),
                "ja_hiragana": trans.get("ja_hiragana", ""),
                "en_katakana": trans.get("en_katakana", ""),
                "sound_file": sound_rel if sound_exists else "",
                "card_image": card_base if card_exists else "",
                "card_image_kana": f"{card_stem}_1_c.png" if card_exists else "",
                "card_image_en": f"{card_stem}_1_e.png" if card_exists else "",
                "card_image_bilingual": f"{card_stem}_1_ce.png" if card_exists else "",
                "grades": sorted(list(detected_grades)),
                "themes": bl_themes,
                "target_sentences": bl_sentences
            }
            master_vocabulary.append(entry)
            seen_words.add(w_lower)

print(f"Generated {len(master_vocabulary)} master vocabulary entries from MEXT PlayData")

# 6. Supplement words from Borderlink G1 & G2 that might not be in MEXT dictionary
extra_bl_words = 0
for w_lower, bl_info in borderlink_word_index.items():
    if w_lower not in seen_words:
        trans = translations.get(w_lower, {})
        master_vocabulary.append({
            "id": f"word_bl_{extra_bl_words:04d}",
            "token": f"borderlink_{w_lower}",
            "english": w_lower.capitalize(),
            "category": "borderlink_original",
            "ja_kanji": trans.get("ja_kanji", ""),
            "ja_hiragana": trans.get("ja_hiragana", ""),
            "en_katakana": trans.get("en_katakana", ""),
            "sound_file": "", # will use Web Speech API or synthesized audio
            "card_image": "",
            "card_image_kana": "",
            "card_image_en": "",
            "card_image_bilingual": "",
            "grades": sorted(list(bl_info.get("grades", []))),
            "themes": sorted(list(bl_info.get("themes", []))),
            "target_sentences": sorted(list(bl_info.get("target_sentences", [])))
        })
        extra_bl_words += 1
        seen_words.add(w_lower)

print(f"Added {extra_bl_words} unique Borderlink G1/G2 words not present in MEXT dictionary")
print(f"Total Combined Master Vocabulary: {len(master_vocabulary)} entries")

# 7. Save outputs
OUT_DIR = os.path.join(BASE_DIR, "master_vocabulary_data")
os.makedirs(OUT_DIR, exist_ok=True)

out_master_json = os.path.join(OUT_DIR, "master_vocabulary.json")
with open(out_master_json, "w", encoding="utf-8") as f:
    json.dump(master_vocabulary, f, ensure_ascii=False, indent=2)
print(f"✓ Saved master dictionary to '{out_master_json}'")

# Grade-specific subsets for games
for g in ["ES_G1", "ES_G2", "ES_G3", "ES_G4", "ES_G5", "ES_G6"]:
    g_words = [w for w in master_vocabulary if g in w.get("grades", [])]
    g_out_path = os.path.join(OUT_DIR, f"vocabulary_{g.lower()}.json")
    with open(g_out_path, "w", encoding="utf-8") as f:
        json.dump(g_words, f, ensure_ascii=False, indent=2)
    print(f"  ✓ Saved {g}: {len(g_words)} words to 'vocabulary_{g.lower()}.json'")

# Generate summary
summary_md = os.path.join(OUT_DIR, "VOCABULARY_SUMMARY.md")
with open(summary_md, "w", encoding="utf-8") as f:
    f.write("# Master Vocabulary Database Summary\n\n")
    f.write(f"- **Total Words:** {len(master_vocabulary)}\n")
    f.write(f"- **Audio Files Verified:** {sum(1 for w in master_vocabulary if w['sound_file'])} native MP3s\n")
    f.write(f"- **Flashcard Images Verified:** {sum(1 for w in master_vocabulary if w['card_image'])} PNGs\n")
    f.write(f"- **Words with Japanese Translations:** {sum(1 for w in master_vocabulary if w['ja_hiragana'] or w['ja_kanji'])}\n\n")
    f.write("## Grade Breakdown\n\n")
    for g in ["ES_G1", "ES_G2", "ES_G3", "ES_G4", "ES_G5", "ES_G6"]:
        g_words = [w for w in master_vocabulary if g in w.get("grades", [])]
        f.write(f"- **{g}**: {len(g_words)} words\n")

print(f"✓ Saved summary report to '{summary_md}'")
print("\nMaster Vocabulary Build Complete!")
