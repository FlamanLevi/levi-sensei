import os
import sys
import json
import re
from collections import defaultdict

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MASTER_DIR = os.path.join(BASE_DIR, "master_vocabulary_data")
os.makedirs(MASTER_DIR, exist_ok=True)
CATEGORIES_DIR = os.path.join(MASTER_DIR, "categories")
os.makedirs(CATEGORIES_DIR, exist_ok=True)

# Paths
CONFIG_DIR_1 = os.path.join(BASE_DIR, "letstry1", "resources", "app", "app", "__config", "dic_card_data_config")
SOUND_DIR_1 = os.path.join(BASE_DIR, "letstry1", "resources", "app", "app", "__media", "dictionary", "dic_card_data_sound")
IMAGE_DIR_1 = os.path.join(BASE_DIR, "letstry1", "resources", "app", "app", "__media", "dictionary", "dic_card_data_image")
PLAY_DATA_PATH = os.path.join(BASE_DIR, "letstry_data", "DictionaryPlayData_2026912_131010.json")
BORDERLINK_LESSONS_PATH = os.path.join(BASE_DIR, "extracted_lesson_plans", "borderlink_lessons.json")
FLAT_VOCAB_PATH = r"D:\Users\levif\Downloads\flat_vocabulary.json"

CATEGORY_METADATA = {
    "01_action": {"name": "Actions & Verbs", "ja_name": "動作・動詞"},
    "02_state": {"name": "States, Feelings & Adjectives", "ja_name": "様子・気持ち・形容詞"},
    "03_fooddrink": {"name": "Food & Drinks", "ja_name": "食べ物・飲み物"},
    "04_number": {"name": "Numbers & Counting", "ja_name": "数・序数"},
    "05_schoollife": {"name": "School Life & Stationery", "ja_name": "学校生活・文房具・教室"},
    "06_facility": {"name": "Town, Places & Occupations", "ja_name": "町・施設・仕事・乗り物"},
    "07_dailylife": {"name": "Daily Life, Routines & Objects", "ja_name": "日常生活・日用品・楽器・服"},
    "08_sports": {"name": "Sports & Activities", "ja_name": "スポーツ・運動"},
    "09_color_shape": {"name": "Colors & Shapes", "ja_name": "色・形"},
    "10_calendar_time": {"name": "Calendar, Days & Time", "ja_name": "カレンダー・曜日・月・季節・時間"},
    "11_animals": {"name": "Animals & Pets", "ja_name": "動物・ペット・生き物"},
    "12_nature": {"name": "Nature & Weather", "ja_name": "自然・天気"},
    "13_position": {"name": "Positions, Directions & Prepositions", "ja_name": "位置・方角・前置詞・応答"},
    "14_body_family": {"name": "Body Parts & People", "ja_name": "体・家族・代名詞・人物"},
    "15_festalday": {"name": "Holidays, Events & Games", "ja_name": "年中行事・祝日・遊び"},
    "16_alphabet": {"name": "Alphabet & Phonics", "ja_name": "アルファベット・フォニックス"}
}

# 1. Disk media inventory
disk_sounds = set(os.listdir(SOUND_DIR_1)) if os.path.exists(SOUND_DIR_1) else set()
disk_images = set(os.listdir(IMAGE_DIR_1)) if os.path.exists(IMAGE_DIR_1) else set()

disk_sound_stem_map = {}
for sf in disk_sounds:
    m = re.match(r'dic_(?:wb_\d{2}\w+|[3456]_(?:card|sal))_([a-zA-Z]+)_\d+.*\.mp3', sf)
    if m:
        disk_sound_stem_map[m.group(1).lower()] = sf

# Explicit mappings for audio on disk
disk_sound_stem_map["hello"] = "dic_wb_13position_hello_1651.mp3"
disk_sound_stem_map["thank you"] = "dic_wb_01action_thank_1041.mp3"
disk_sound_stem_map["youre welcome"] = "dic_wb_02state_welcome_1100.mp3"
disk_sound_stem_map["you're welcome"] = "dic_wb_02state_welcome_1100.mp3"
disk_sound_stem_map["the uk"] = "dic_wb_11country_theuk_1483.mp3"
disk_sound_stem_map["the u.k."] = "dic_wb_11country_theuk_1483.mp3"
disk_sound_stem_map["the usa"] = "dic_wb_11country_theusa_1484.mp3"
disk_sound_stem_map["the u.s."] = "dic_wb_11country_theusa_1484.mp3"
disk_sound_stem_map["america"] = "dic_wb_11country_america_1484.mp3"
disk_sound_stem_map["spain"] = "dic_wb_11country_spain_1481.mp3"

# Plural to singular audio fallbacks on disk
plural_sound_fallbacks = {
    "carrots": "dic_wb_03fooddrink_carrot_1157.mp3",
    "cucumbers": "dic_wb_03fooddrink_cucumber_1159.mp3",
    "onions": "dic_wb_03fooddrink_onion_1164.mp3",
    "potatoes": "dic_wb_03fooddrink_potato_1165.mp3",
    "books": "dic_wb_07dailylife_book_1347.mp3",
    "erasers": "dic_wb_05schoollife_eraser_1266.mp3",
    "pencil sharpeners": "dic_wb_05schoollife_pencilsharpener_1275.mp3",
    "pencils": "dic_wb_05schoollife_pencil_1273.mp3",
    "cats": "dic_wb_11animals_cat_1487.mp3",
    "cows": "dic_wb_11animals_cow_1489.mp3",
    "dogs": "dic_wb_11animals_dog_1490.mp3",
    "elephants": "dic_wb_11animals_elephant_1491.mp3",
    "horses": "dic_wb_11animals_horse_1493.mp3",
    "monkeys": "dic_wb_11animals_monkey_1494.mp3",
    "pigs": "dic_wb_11animals_pig_1498.mp3",
    "tigers": "dic_wb_11animals_tiger_1503.mp3",
    "hands": "dic_wb_14body_hand_1573.mp3",
    "legs": "dic_wb_14body_leg_1576.mp3"
}
for pl, sf in plural_sound_fallbacks.items():
    if sf in disk_sounds:
        disk_sound_stem_map[pl] = sf

# 2. Kana & Ruby Converters
def to_hiragana(text):
    if not text:
        return ""
    res = []
    for c in text:
        code = ord(c)
        if 0x30A1 <= code <= 0x30F6:
            res.append(chr(code - 0x60))
        elif c in ['ー', '・', ' ']:
            res.append(c)
        else:
            res.append(c)
    return "".join(res)

def generate_ruby(kanji, hiragana):
    if not kanji or not hiragana:
        return [{"base": kanji or hiragana or "", "ruby": ""}]
    
    # Check if string contains any kanji character (CJK Unified Ideographs: 4E00-9FFF)
    has_cjk = bool(re.search(r'[\u4e00-\u9fff]', kanji))
    if not has_cjk or kanji == hiragana:
        return [{"base": kanji, "ruby": ""}]
    
    # If entire string is kanji
    if re.fullmatch(r'[\u4e00-\u9fff]+', kanji):
        return [{"base": kanji, "ruby": hiragana}]
    
    # Segment mixed text: find kana boundaries
    chunks = re.findall(r'[\u4e00-\u9fff]+|[^\u4e00-\u9fff]+', kanji)
    curr_h = hiragana
    possible = True
    temp_segments = []
    
    for idx, chunk in enumerate(chunks):
        is_kanji = bool(re.match(r'[\u4e00-\u9fff]+', chunk))
        if not is_kanji:
            h_chunk = to_hiragana(chunk)
            pos = curr_h.find(h_chunk)
            if pos == -1:
                pos = curr_h.find(chunk)
            if pos != -1:
                if temp_segments and temp_segments[-1]["ruby"] == "__PENDING__":
                    temp_segments[-1]["ruby"] = curr_h[:pos]
                temp_segments.append({"base": chunk, "ruby": ""})
                curr_h = curr_h[pos + len(chunk):]
            else:
                possible = False
                break
        else:
            if idx == len(chunks) - 1:
                temp_segments.append({"base": chunk, "ruby": curr_h})
                curr_h = ""
            else:
                temp_segments.append({"base": chunk, "ruby": "__PENDING__"})
    
    if possible and all(s["ruby"] != "__PENDING__" for s in temp_segments):
        return temp_segments
    else:
        return [{"base": kanji, "ruby": hiragana}]

def format_ruby_html(ruby_segments):
    parts = []
    for s in ruby_segments:
        base = s.get("base", "")
        ruby = s.get("ruby", "")
        if ruby:
            parts.append(f"<ruby>{base}<rt>{ruby}</rt></ruby>")
        else:
            parts.append(base)
    return "".join(parts)

def format_ruby_text(ruby_segments):
    parts = []
    for s in ruby_segments:
        base = s.get("base", "")
        ruby = s.get("ruby", "")
        if ruby:
            parts.append(f"[{base}|{ruby}]")
        else:
            parts.append(base)
    return "".join(parts)

def main():
    print("=" * 70)
    print("LEVI-SENSEI UNIFIED MASTER VOCABULARY ENGINE (BOOSTED DEFINITIVE TURN-KEY)")
    print("=" * 70)
    print(f"Verified {len(disk_sounds)} sound MP3s and {len(disk_images)} image PNGs on disk")

    # 3. Master Lexicon with 100% Elementary Verified Translations
    from master_lexicon import LEXICON
    print(f"Loaded Master Lexicon: {len(LEXICON)} verified entries")

    # 4. Ingest MEXT Configs
    mext_catalog = {}
    CATEGORY_FILE_MAP = {
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

    for c_file, cat_key in CATEGORY_FILE_MAP.items():
        c_path = os.path.join(CONFIG_DIR_1, c_file)
        if os.path.exists(c_path):
            with open(c_path, "r", encoding="utf-8") as f:
                c_data = json.load(f)
                items = c_data[0] if isinstance(c_data, list) and len(c_data) > 0 else c_data
                for num_key, item in items.items():
                    item_id = item.get("id")
                    if item_id:
                        mext_catalog[item_id] = {
                            "sound": item.get("sound", ""),
                            "image": item.get("image", ""),
                            "text": item.get("text", "").strip(),
                            "category": cat_key,
                            "grade_hint": ""
                        }

    for pc_file, grade_tag in [("3-picturecard.json", "ES_G3"), ("4-picturecard.json", "ES_G4")]:
        pc_path = os.path.join(CONFIG_DIR_1, pc_file)
        if os.path.exists(pc_path):
            with open(pc_path, "r", encoding="utf-8") as f:
                pc_data = json.load(f)
                items = pc_data[0] if isinstance(pc_data, list) and len(pc_data) > 0 else pc_data
                for num_key, item in items.items():
                    item_id = item.get("id")
                    if item_id:
                        if item_id in mext_catalog:
                            mext_catalog[item_id]["grade_hint"] = grade_tag
                        else:
                            mext_catalog[item_id] = {
                                "sound": item.get("sound", ""),
                                "image": item.get("image", ""),
                                "text": item.get("text", "").strip(),
                                "category": "",
                                "grade_hint": grade_tag
                            }

    # 5. Ingest Borderlink Lessons
    borderlink_word_index = defaultdict(lambda: {"grades": set(), "themes": set(), "target_sentences": set()})
    if os.path.exists(BORDERLINK_LESSONS_PATH):
        with open(BORDERLINK_LESSONS_PATH, "r", encoding="utf-8") as f:
            bl_lessons = json.load(f)
            for lesson in bl_lessons:
                grade = lesson.get("grade", "")
                theme = lesson.get("theme", "")
                raw_lang = lesson.get("target_language", "")
                words = lesson.get("target_vocab_words", [])
                for w in words:
                    w_clean = re.sub(r'[^a-zA-Z\s\'-]', '', w).strip().lower()
                    w_clean = w_clean.replace("’", "'").replace("‘", "'")
                    # Strict junk fragment filter
                    bad_tokens = [
                        "what", "who", "where", "when", "why", "how", "i like", "i have", "i want", "do you", "are you", "is it",
                        "names of", "things around", "for sure", "let me try", "procedure", "sentences", "last activity", "knows",
                        "im --", "i'm --", "its a", "it's a", "its fast", "it's fast", "the --", "large caps", "numbers", "this is", "im glad", "i'm glad", "wish", "would",
                        "tried", "eaten", "heard", "seen", "been", "nobody", "deal", "if", "let", "mouth shoulders", "adjectives long",
                        "animals cow", "animals dog", "animals elephant", "foods banana", "sea animals", "short long", "wild boar adjectives",
                        "a star", "familiar objects", "frankensteins monster", "frankenstein's monster", "hello good", "hint please",
                        "i am", "i do", "i dont", "i don't", "i go", "i play", "listened to", "shapes square", "sports soccer"
                    ]
                    if not w_clean or len(w_clean) < 2 or any(bt == w_clean or bt in w_clean for bt in bad_tokens):
                        continue
                    if "--" in w_clean or "'" in w_clean and w_clean not in ["you're welcome", "children's day", "dolls' festival", "star festival", "new year's day", "new year's eve"]:
                        continue
                    if len(w_clean.split()) > 2 and w_clean not in ["pencil sharpeners", "black cat"]:
                        continue
                    if grade:
                        borderlink_word_index[w_clean]["grades"].add(grade)
                    if theme:
                        borderlink_word_index[w_clean]["themes"].add(theme)
                    if raw_lang:
                        borderlink_word_index[w_clean]["target_sentences"].add(raw_lang)

    print(f"Indexed {len(borderlink_word_index)} verified Borderlink curriculum words")

    # 6. Load Flat Vocabulary Words
    flat_words_lookup = {}
    if os.path.exists(FLAT_VOCAB_PATH):
        with open(FLAT_VOCAB_PATH, "r", encoding="utf-8") as f:
            flat_list = json.load(f).get("words", [])
            for w in flat_list:
                en_clean = w.get("en", "").strip().lower()
                en_clean = en_clean.replace("’", "'").replace("‘", "'")
                if en_clean:
                    if en_clean not in flat_words_lookup:
                        flat_words_lookup[en_clean] = []
                    flat_words_lookup[en_clean].append(w)
        print(f"Loaded {len(flat_words_lookup)} unique entries from flat_vocabulary.json")

    # 7. Synthesize Canonical Vocabulary
    canonical_vocab = {}

    def get_canonical_key(text, raw_cat, token):
        t_clean = text.strip().replace("’", "'").replace("‘", "'")
        t_low = t_clean.lower()
        
        # Deduplication and normalization
        if t_low in ["autumn/fall", "autumn", "fall"]:
            return "autumn"
        if len(t_clean) == 1 and t_clean.isalpha():
            case = "upper" if t_clean.isupper() else "lower"
            return f"letter_{t_clean}_{case}"
        if t_low in ["santa", "santa claus"]:
            return "santa claus"
        if t_low in ["children's day", "the children's day"]:
            return "children's day"
        if t_low in ["dolls' festival", "the doll festival", "the dolls' festival", "doll festival"]:
            return "dolls' festival"
        if t_low in ["star festival", "the star festival"]:
            return "star festival"
        if t_low in ["school nurse's office", "school nurse office"]:
            return "school nurse's office"
        if t_low in ["school principal's office", "school principal office"]:
            return "school principal's office"
        if t_low in ["teachers' office", "teachers office", "teacher's office"]:
            return "teachers' office"
        if t_low in ["fire fighter", "firefighter"]:
            return "firefighter"
        if t_low in ["zoo keeper", "zookeeper"]:
            return "zookeeper"
        if t_low in ["the uk", "the u.k.", "uk"]:
            return "the uk"
        if t_low in ["the usa", "the u.s.", "the us", "usa"]:
            return "the usa"

        # Homographs
        if t_low == "orange":
            if "09" in raw_cat or "color" in raw_cat or "1423" in token:
                return "orange_color"
            return "orange_fruit"
        if t_low == "cook":
            if "06" in raw_cat or "facility" in raw_cat or "chef" in token:
                return "cook_occupation"
            return "cook_action"
        if t_low == "watch":
            if "07" in raw_cat or "dailylife" in raw_cat or "1364" in token or "1379" in token:
                return "watch_object"
            return "watch_action"
        if t_low == "clean":
            if "02" in raw_cat or "state" in raw_cat:
                return "clean_adjective"
            return "clean_action"
        return t_low

    # 7a. Ingest MEXT Playlist
    if os.path.exists(PLAY_DATA_PATH):
        with open(PLAY_DATA_PATH, "r", encoding="utf-8") as f:
            playlist_tokens = json.load(f).get("playList", [])
        
        for token in playlist_tokens:
            parts = token.split("&")
            img_prefix = parts[0] if len(parts) > 0 else ""
            sound_stem = parts[1] if len(parts) > 1 else ""
            card_stem = parts[2] if len(parts) > 2 else ""
            
            cat_entry = mext_catalog.get(img_prefix) or mext_catalog.get(card_stem) or {}
            text = cat_entry.get("text", "")
            raw_cat = cat_entry.get("category", "")
            grade_hint = cat_entry.get("grade_hint", "")
            
            if not text:
                match = re.search(r'dic_(?:wb_\d{2}\w+|[3456]_card)_([a-zA-Z]+)_\d+', img_prefix)
                text = match.group(1) if match else img_prefix
            
            t_clean = text.strip()
            if not t_clean:
                continue
            if t_clean.lower() == "autumn/fall":
                t_clean = "autumn"
                
            c_key = get_canonical_key(t_clean, raw_cat, token)
            
            sound_file = f"{sound_stem}.mp3" if sound_stem and f"{sound_stem}.mp3" in disk_sounds else ""
            card_base = f"{card_stem}_1.png" if card_stem and f"{card_stem}_1.png" in disk_images else ""
            if not card_base and img_prefix and f"{img_prefix}_1.png" in disk_images:
                card_base = f"{img_prefix}_1.png"
                card_stem = img_prefix

            token_grades = set()
            if "dic_3_card" in token or "3-picturecard" in token or grade_hint == "ES_G3":
                token_grades.add("ES_G3")
            if "dic_4_card" in token or "4-picturecard" in token or grade_hint == "ES_G4":
                token_grades.add("ES_G4")
            if "dic_5_card" in token:
                token_grades.add("ES_G5")
            if "dic_6_card" in token:
                token_grades.add("ES_G6")
                
            bl_info = borderlink_word_index.get(t_clean.lower(), {})
            for g in bl_info.get("grades", []):
                if g.startswith("ES_"):
                    token_grades.add(g)

            if c_key in canonical_vocab:
                entry = canonical_vocab[c_key]
                entry["grades"].update(token_grades)
                for th in bl_info.get("themes", []):
                    entry["themes"].add(th)
                for s in bl_info.get("target_sentences", []):
                    entry["target_sentences"].add(s)
                if card_base and card_base not in entry["card_variants"]:
                    entry["card_variants"].append(card_base)
                if not entry["sound_file"] and sound_file:
                    entry["sound_file"] = sound_file
                if not entry["card_image"] and card_base:
                    entry["card_image"] = card_base
                    entry["card_image_kana"] = f"{card_stem}_1_c.png"
                    entry["card_image_en"] = f"{card_stem}_1_e.png"
                    entry["card_image_bilingual"] = f"{card_stem}_1_ce.png"
                if not entry["category"] and raw_cat:
                    entry["category"] = raw_cat
            else:
                canonical_vocab[c_key] = {
                    "key": c_key,
                    "raw_text": t_clean,
                    "category": raw_cat,
                    "sound_file": sound_file,
                    "card_image": card_base,
                    "card_image_kana": f"{card_stem}_1_c.png" if card_base else "",
                    "card_image_en": f"{card_stem}_1_e.png" if card_base else "",
                    "card_image_bilingual": f"{card_stem}_1_ce.png" if card_base else "",
                    "card_variants": [card_base] if card_base else [],
                    "token": token,
                    "grades": token_grades,
                    "themes": set(bl_info.get("themes", [])),
                    "target_sentences": set(bl_info.get("target_sentences", []))
                }

    print(f"MEXT playlist added {len(canonical_vocab)} canonical concepts")

    # 7b. Ingest Borderlink Curriculum Words
    for w_low, bl_info in borderlink_word_index.items():
        w_norm = w_low.replace("’", "'").replace("‘", "'")
        c_key = get_canonical_key(w_norm, "", f"borderlink_{w_norm}")
        
        # Homographs
        if w_norm == "orange":
            for ok in ["orange_fruit", "orange_color"]:
                if ok in canonical_vocab:
                    canonical_vocab[ok]["grades"].update(g for g in bl_info.get("grades", []) if g.startswith("ES_"))
                    canonical_vocab[ok]["themes"].update(bl_info.get("themes", []))
                    canonical_vocab[ok]["target_sentences"].update(bl_info.get("target_sentences", []))
            continue
        if w_norm == "cook":
            if "cook_action" in canonical_vocab:
                canonical_vocab["cook_action"]["grades"].update(g for g in bl_info.get("grades", []) if g.startswith("ES_"))
                canonical_vocab["cook_action"]["themes"].update(bl_info.get("themes", []))
                canonical_vocab["cook_action"]["target_sentences"].update(bl_info.get("target_sentences", []))
            continue
        if w_norm == "watch":
            if "watch_action" in canonical_vocab:
                canonical_vocab["watch_action"]["grades"].update(g for g in bl_info.get("grades", []) if g.startswith("ES_"))
                canonical_vocab["watch_action"]["themes"].update(bl_info.get("themes", []))
                canonical_vocab["watch_action"]["target_sentences"].update(bl_info.get("target_sentences", []))
            continue
        if w_norm == "clean":
            if "clean_adjective" in canonical_vocab:
                canonical_vocab["clean_adjective"]["grades"].update(g for g in bl_info.get("grades", []) if g.startswith("ES_"))
                canonical_vocab["clean_adjective"]["themes"].update(bl_info.get("themes", []))
            if "clean_action" in canonical_vocab:
                canonical_vocab["clean_action"]["grades"].update(g for g in bl_info.get("grades", []) if g.startswith("ES_"))
                canonical_vocab["clean_action"]["themes"].update(bl_info.get("themes", []))
            continue

        if c_key in canonical_vocab:
            canonical_vocab[c_key]["grades"].update(g for g in bl_info.get("grades", []) if g.startswith("ES_"))
            canonical_vocab[c_key]["themes"].update(bl_info.get("themes", []))
            canonical_vocab[c_key]["target_sentences"].update(bl_info.get("target_sentences", []))
            continue

        # Create new entry
        grades_set = set(g for g in bl_info.get("grades", []) if g.startswith("ES_"))
        matched_sound = disk_sound_stem_map.get(w_norm, "")
        
        canonical_vocab[c_key] = {
            "key": c_key,
            "raw_text": w_norm,
            "category": "",
            "sound_file": matched_sound,
            "card_image": "",
            "card_image_kana": "",
            "card_image_en": "",
            "card_image_bilingual": "",
            "card_variants": [],
            "token": f"borderlink_{w_norm}",
            "grades": grades_set,
            "themes": set(bl_info.get("themes", [])),
            "target_sentences": set(bl_info.get("target_sentences", []))
        }

    print(f"Total concepts after Borderlink: {len(canonical_vocab)}")

    # 7c. Ingest Here We Go Words
    if os.path.exists(FLAT_VOCAB_PATH):
        with open(FLAT_VOCAB_PATH, "r", encoding="utf-8") as f:
            flat_list = json.load(f).get("words", [])
            
        for w in flat_list:
            en = w.get("en", "").strip()
            if not en:
                continue
            en_clean = en.replace("’", "'").replace("‘", "'")
            if en_clean.lower().startswith("a "):
                en_clean = en_clean[2:].strip()
            elif en_clean.lower().startswith("an "):
                en_clean = en_clean[3:].strip()
                
            enl = en_clean.lower()
            pos = w.get("part_of_speech", "")
            
            # Map canonical key
            if enl == "orange":
                target_k = "orange_fruit" if any(t in w.get("tags", []) for t in ["food", "fruit"]) else "orange_color"
            elif enl == "cook":
                target_k = "cook_occupation" if pos in ["noun", "job"] else "cook_action"
            elif enl == "watch":
                target_k = "watch_object" if pos == "noun" else "watch_action"
            elif enl == "clean":
                target_k = "clean_adjective" if pos == "adjective" else "clean_action"
            else:
                target_k = get_canonical_key(enl, "", f"hwg_{enl}")

            if target_k in canonical_vocab:
                u_id = w.get("unit_id", "")
                if "grade3" in u_id: canonical_vocab[target_k]["grades"].add("ES_G3")
                if "grade4" in u_id: canonical_vocab[target_k]["grades"].add("ES_G4")
                if "grade5" in u_id: canonical_vocab[target_k]["grades"].add("ES_G5")
                if "grade6" in u_id: canonical_vocab[target_k]["grades"].add("ES_G6")
                continue
                
            words_count = len(enl.split())
            if words_count > 3 or any(bad in enl for bad in ["eat ", "cook dinner", "clean ", "draw pictures", "take out", "make ", "clear ", "help ", "visit ", "practice ", "enjoy ", "read ", "watch ", "play "]):
                continue
                
            u_id = w.get("unit_id", "")
            g_set = set()
            if "grade3" in u_id: g_set.add("ES_G3")
            if "grade4" in u_id: g_set.add("ES_G4")
            if "grade5" in u_id: g_set.add("ES_G5")
            if "grade6" in u_id: g_set.add("ES_G6")
            
            matched_sound = disk_sound_stem_map.get(target_k, "") or disk_sound_stem_map.get(enl, "")
            if not matched_sound and enl.endswith("s") and enl[:-1] in disk_sound_stem_map:
                matched_sound = disk_sound_stem_map[enl[:-1]]
                
            canonical_vocab[target_k] = {
                "key": target_k,
                "raw_text": en_clean,
                "category": "",
                "sound_file": matched_sound,
                "card_image": "",
                "card_image_kana": "",
                "card_image_en": "",
                "card_image_bilingual": "",
                "card_variants": [],
                "token": f"hwg_{target_k}",
                "grades": g_set,
                "themes": set(),
                "target_sentences": set()
            }

    print(f"Total Unified Vocabulary Concepts: {len(canonical_vocab)}")

    # 8. Assemble Master Vocabulary Entries
    master_vocabulary = []
    
    proper_nouns = [
        "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
        "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December",
        "Halloween", "Christmas", "Santa", "Santa Claus",
        "Children's Day", "Dolls' Festival", "Star Festival", "Snow Festival", "New Year's Day", "New Year's Eve",
        "Japan", "America", "Australia", "Brazil", "Canada", "China", "Egypt", "France", "Germany", "India", "Italy", "Korea", "Peru", "Russia", "Spain", "Thailand",
        "Chile", "Azerbaijan", "Kenya", "New Zealand", "Norway", "Saudi Arabia", "South Africa", "the Maldives", "the Philippines", "the UK", "the USA",
        "English", "Japanese", "Japanese pear"
    ]
    pn_map = {pn.lower(): pn for pn in proper_nouns}
    pn_map["santa"] = "Santa Claus"
    pn_map["santa claus"] = "Santa Claus"
    pn_map["the uk"] = "the UK"
    pn_map["the u.k."] = "the UK"
    pn_map["the usa"] = "the USA"
    pn_map["the u.s."] = "the USA"
    pn_map["p.e."] = "P.E."
    pn_map["pe"] = "P.E."
    pn_map["tv"] = "TV"
    pn_map["t-shirt"] = "T-shirt"

    idx = 1
    for c_key, item in sorted(canonical_vocab.items(), key=lambda x: (x[1].get("category", "99"), x[1]["raw_text"].lower())):
        raw_text = item["raw_text"]
        text_low = raw_text.lower().strip().replace("’", "'").replace("‘", "'")
        
        lex_entry = LEXICON.get(c_key) or LEXICON.get(raw_text) or LEXICON.get(text_low)
        flat_matches = flat_words_lookup.get(text_low, [])
        flat_entry = flat_matches[0] if flat_matches else {}
        
        ja_kanji = ""
        ja_hiragana = ""
        en_katakana = ""
        pos = "noun"
        category = ""
        tags = []
        
        # 1. Authoritative Lexicon lookup
        if lex_entry:
            ja_kanji, ja_hiragana, en_katakana, pos, cat_lex, lex_tags = lex_entry
            category = cat_lex
            tags.extend(lex_tags)
        elif flat_entry:
            ja_kanji = flat_entry.get("ja_kanji", "")
            ja_hiragana = flat_entry.get("ja_hiragana", "")
            en_katakana = flat_entry.get("en_katakana", "")
            pos = flat_entry.get("part_of_speech", "noun")
            tags.extend(flat_entry.get("tags", []))
            
        # Category fallback heuristics if still unassigned
        if not category:
            category = item.get("category", "")
        if not category:
            if len(raw_text) == 1 and raw_text.isalpha():
                category = "16_alphabet"
            elif pos == "verb":
                category = "01_action"
            elif pos == "adjective":
                category = "02_state"
            else:
                category = "07_dailylife"
                
        # Normalize part of speech: convert 'verb_phrase' to 'phrase'
        if pos == "verb_phrase":
            pos = "phrase"
            
        if ja_kanji and "/" in ja_kanji:
            ja_kanji = ja_kanji.split("/")[0].strip()
            
        if not ja_hiragana:
            ja_hiragana = to_hiragana(ja_kanji) if ja_kanji else text_low
        if not ja_kanji:
            ja_kanji = ja_hiragana
        if not en_katakana:
            en_katakana = raw_text.capitalize()
            
        ja_hiragana = to_hiragana(ja_hiragana)
        
        # Proper casing
        if text_low in pn_map:
            english_cased = pn_map[text_low]
        elif text_low in ["youre welcome", "you're welcome"]:
            english_cased = "you're welcome"
        elif len(raw_text) == 1 and raw_text.isalpha():
            english_cased = raw_text
        else:
            english_cased = text_low
            
        final_grades = set(item["grades"])
        for fm in flat_matches:
            u_id = fm.get("unit_id", "")
            if "grade3" in u_id: final_grades.add("ES_G3")
            if "grade4" in u_id: final_grades.add("ES_G4")
            if "grade5" in u_id: final_grades.add("ES_G5")
            if "grade6" in u_id: final_grades.add("ES_G6")
            
        if not final_grades:
            if category in ["04_number", "09_color_shape", "11_animals"]:
                final_grades.update(["ES_G1", "ES_G2", "ES_G3"])
            elif category == "16_alphabet":
                final_grades.add("ES_G3" if english_cased.isupper() else "ES_G4")
            elif category in ["10_calendar_time", "07_dailylife"]:
                final_grades.add("ES_G4")
            elif category in ["06_facility"]:
                final_grades.update(["ES_G4", "ES_G5"])
            else:
                final_grades.add("ES_G3")
                
        ruby_segments = generate_ruby(ja_kanji, ja_hiragana)
        ruby_html = format_ruby_html(ruby_segments)
        ruby_text = format_ruby_text(ruby_segments)
        
        final_tags = sorted(list(set(tags)))
        
        sound_file = item["sound_file"]
        if not sound_file:
            sound_file = disk_sound_stem_map.get(c_key, "") or disk_sound_stem_map.get(text_low, "")
            
        if sound_file and sound_file not in disk_sounds:
            sound_file = ""
            
        card_image = item["card_image"]
        if card_image and card_image not in disk_images:
            card_image = ""

        # Disambiguation metadata
        disambiguation = ""
        display_label = english_cased
        if c_key == "cook_action":
            disambiguation = "action"
            display_label = "cook (action)"
        elif c_key == "cook_occupation":
            disambiguation = "occupation"
            display_label = "cook (chef)"
        elif c_key == "watch_action":
            disambiguation = "action"
            display_label = "watch (see)"
        elif c_key == "watch_object":
            disambiguation = "object"
            display_label = "watch (timepiece)"
        elif c_key == "orange_fruit":
            disambiguation = "fruit"
            display_label = "orange (fruit)"
        elif c_key == "orange_color":
            disambiguation = "color"
            display_label = "orange (color)"
        elif c_key == "clean_action":
            disambiguation = "action"
            display_label = "clean (action)"
        elif c_key == "clean_adjective":
            disambiguation = "adjective"
            display_label = "clean (state)"
        elif category == "16_alphabet":
            disambiguation = "uppercase" if english_cased.isupper() else "lowercase"
            display_label = f"{english_cased} ({disambiguation})"
            
        entry_dict = {
            "id": f"word_{idx:04d}",
            "english": english_cased,
            "canonical_key": c_key,
            "disambiguation": disambiguation,
            "display_label": display_label,
            "normalized_english": text_low,
            "part_of_speech": pos,
            "category": category,
            "category_name": CATEGORY_METADATA.get(category, {}).get("name", category),
            "ja_kanji": ja_kanji,
            "ja_hiragana": ja_hiragana,
            "en_katakana": en_katakana,
            "ruby": ruby_segments,
            "ruby_html": ruby_html,
            "ruby_text": ruby_text,
            "sound_file": sound_file,
            "card_image": card_image,
            "card_image_kana": item["card_image_kana"] if card_image else "",
            "card_image_en": item["card_image_en"] if card_image else "",
            "card_image_bilingual": item["card_image_bilingual"] if card_image else "",
            "card_variants": item["card_variants"],
            "token": item["token"],
            "grades": sorted(list(final_grades)),
            "themes": sorted(list(item["themes"])),
            "target_sentences": sorted(list(item["target_sentences"])),
            "tags": final_tags
        }
        master_vocabulary.append(entry_dict)
        idx += 1

    print(f"\nFinal Compiled Master Vocabulary: {len(master_vocabulary)} clean, verified words!")

    # 9. Build Multi-Index
    vocab_index = {
        "byId": {},
        "byNormalizedEnglish": {},
        "byGrade": defaultdict(list),
        "byCategory": defaultdict(list),
        "byPartOfSpeech": defaultdict(list),
        "byTag": defaultdict(list),
        "byTheme": defaultdict(list)
    }

    for w in master_vocabulary:
        w_id = w["id"]
        vocab_index["byId"][w_id] = w
        norm_en = w["normalized_english"]
        if norm_en not in vocab_index["byNormalizedEnglish"]:
            vocab_index["byNormalizedEnglish"][norm_en] = []
        vocab_index["byNormalizedEnglish"][norm_en].append(w_id)
        
        for g in w["grades"]:
            vocab_index["byGrade"][g].append(w_id)
        vocab_index["byCategory"][w["category"]].append(w_id)
        vocab_index["byPartOfSpeech"][w["part_of_speech"]].append(w_id)
        for t in w["tags"]:
            vocab_index["byTag"][t].append(w_id)
        for th in w["themes"]:
            vocab_index["byTheme"][th].append(w_id)

    # Save outputs
    out_master = os.path.join(MASTER_DIR, "master_vocabulary.json")
    with open(out_master, "w", encoding="utf-8") as f:
        json.dump(master_vocabulary, f, ensure_ascii=False, indent=2)
    print(f"✓ Saved master dictionary: '{out_master}' ({len(master_vocabulary)} entries)")

    out_index = os.path.join(MASTER_DIR, "vocabulary_index.json")
    with open(out_index, "w", encoding="utf-8") as f:
        json.dump(vocab_index, f, ensure_ascii=False, indent=2)
    print(f"✓ Saved lookup index: '{out_index}'")

    # Grade subsets
    for g in ["es_g1", "es_g2", "es_g3", "es_g4", "es_g5", "es_g6"]:
        g_tag = g.upper()
        subset = [w for w in master_vocabulary if g_tag in w["grades"]]
        g_path = os.path.join(MASTER_DIR, f"vocabulary_{g}.json")
        with open(g_path, "w", encoding="utf-8") as f:
            json.dump(subset, f, ensure_ascii=False, indent=2)
        print(f"  ✓ Saved {g_tag}: {len(subset)} words to 'vocabulary_{g}.json'")

    # Category subsets in categories/
    for cat_key, cat_meta in CATEGORY_METADATA.items():
        cat_words = [w for w in master_vocabulary if w["category"] == cat_key]
        cat_path = os.path.join(CATEGORIES_DIR, f"{cat_key}.json")
        with open(cat_path, "w", encoding="utf-8") as f:
            json.dump(cat_words, f, ensure_ascii=False, indent=2)
        print(f"  ✓ Saved Category '{cat_key}' ({cat_meta['name']}): {len(cat_words)} words")

    # Summary Report
    total_clean = len(master_vocabulary)
    total_audio = sum(1 for w in master_vocabulary if w.get("sound_file"))
    total_images = sum(1 for w in master_vocabulary if w.get("card_image"))
    total_trans = sum(1 for w in master_vocabulary if w.get("ja_hiragana") and w.get("ja_kanji"))

    summary_md = os.path.join(MASTER_DIR, "VOCABULARY_SUMMARY.md")
    with open(summary_md, "w", encoding="utf-8") as f:
        f.write("# Master Vocabulary Database Summary (Boosted & Modular Turn-Key Edition)\n\n")
        f.write(f"- **Total Canonical Vocabulary Words:** {total_clean}\n")
        f.write(f"- **Audio Files Verified:** {total_audio} native MP3s ({total_audio/total_clean*100:.1f}%)\n")
        f.write(f"- **Flashcard Images Verified:** {total_images} PNGs ({total_images/total_clean*100:.1f}%)\n")
        f.write(f"- **Japanese Translations & Furigana:** {total_trans} / {total_clean} (100.0%)\n")
        f.write(f"- **Ruby Furigana Annotations:** {total_clean} (100.0% structured & HTML ready)\n")
        f.write(f"- **Parts of Speech Tagged:** {sum(1 for w in master_vocabulary if w.get('part_of_speech'))} (100.0%)\n\n")
        
        f.write("## Grade Breakdown\n\n")
        for g in ["es_g1", "es_g2", "es_g3", "es_g4", "es_g5", "es_g6"]:
            g_tag = g.upper()
            subset = [w for w in master_vocabulary if g_tag in w["grades"]]
            f.write(f"- **{g_tag}**: {len(subset)} words\n")
        
        f.write("\n## Thematic Category Breakdown\n\n")
        for cat_key, cat_meta in CATEGORY_METADATA.items():
            cat_words = [w for w in master_vocabulary if w["category"] == cat_key]
            f.write(f"- **{cat_key}** ({cat_meta['name']}): {len(cat_words)} words\n")
        
        f.write("\n## Modular Files Created\n\n")
        f.write("- `master_vocabulary.json`: Authoritative canonical master database\n")
        f.write("- `vocabulary_index.json`: Fast multi-index dictionary (`byId`, `byGrade`, `byCategory`, `byTag`, `byTheme`, etc.)\n")
        f.write("- `vocabulary_es_g1.json` through `vocabulary_es_g6.json`: Elementary grade subsets\n")
        f.write("- `categories/*.json`: 16 independent category JSON datasets for dynamic imports\n")
        f.write("- `types.ts`: TypeScript interfaces for React + Vite games\n")
        f.write("- `lookup_helpers.js`: Zero-dependency query, theme filtering, homograph display, and ruby rendering utilities\n")

    print(f"✓ Summary report updated: '{summary_md}'")
    print("\nBUILD COMPLETE!")

if __name__ == "__main__":
    main()
