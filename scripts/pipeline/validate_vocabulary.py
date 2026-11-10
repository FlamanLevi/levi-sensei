import os
import sys
import json
import re

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MASTER_DIR = os.path.join(BASE_DIR, "master_vocabulary_data")
SOUND_DIR_1 = os.path.join(BASE_DIR, "letstry1", "resources", "app", "app", "__media", "dictionary", "dic_card_data_sound")
IMAGE_DIR_1 = os.path.join(BASE_DIR, "letstry1", "resources", "app", "app", "__media", "dictionary", "dic_card_data_image")

print("=" * 70)
print("RUNNING AUTOMATED VOCABULARY INTEGRITY & ACCURACY AUDIT (DEEP BOOST)")
print("=" * 70)

errors = []
warnings = []

# 1. Check file existence
master_path = os.path.join(MASTER_DIR, "master_vocabulary.json")
index_path = os.path.join(MASTER_DIR, "vocabulary_index.json")

if not os.path.exists(master_path):
    print(f"FATAL: Master file missing: {master_path}")
    sys.exit(1)

with open(master_path, "r", encoding="utf-8") as f:
    master_words = json.load(f)

print(f"Loaded master vocabulary: {len(master_words)} items")

with open(index_path, "r", encoding="utf-8") as f:
    vocab_index = json.load(f)

print("Loaded vocabulary index")

# 2. Disk media inventory
disk_sounds = set(os.listdir(SOUND_DIR_1)) if os.path.exists(SOUND_DIR_1) else set()
disk_images = set(os.listdir(IMAGE_DIR_1)) if os.path.exists(IMAGE_DIR_1) else set()
print(f"Available on disk: {len(disk_sounds)} sound MP3s, {len(disk_images)} image PNGs")

# 3. Comprehensive Item Validation
seen_ids = set()
seen_english_by_category = {}
VALID_GRADES = {"ES_G1", "ES_G2", "ES_G3", "ES_G4", "ES_G5", "ES_G6", "KD_3yo", "KD_4yo", "KD_5yo", "JHS_G1", "JHS_G2", "JHS_G3"}
VALID_POS = {"noun", "verb", "adjective", "adverb", "preposition", "interjection", "phrase", "pronoun", "alphabet"}
VALID_CATEGORIES = {f"{i:02d}_{name}" for i, name in [
    (1, "action"), (2, "state"), (3, "fooddrink"), (4, "number"),
    (5, "schoollife"), (6, "facility"), (7, "dailylife"), (8, "sports"),
    (9, "color_shape"), (10, "calendar_time"), (11, "animals"), (12, "nature"),
    (13, "position"), (14, "body_family"), (15, "festalday"), (16, "alphabet")
]}

MUST_BE_CAPITALIZED = {
    "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday",
    "january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december",
    "halloween", "christmas", "santa claus",
    "children's day", "dolls' festival", "star festival", "snow festival", "new year's day", "new year's eve",
    "japan", "america", "australia", "brazil", "canada", "china", "egypt", "france", "germany", "india", "italy", "korea", "peru", "russia", "spain", "thailand",
    "chile", "azerbaijan", "kenya", "new zealand", "norway", "saudi arabia", "south africa", "the maldives", "the philippines", "the uk", "the usa",
    "english", "japanese", "japanese pear", "p.e.", "tv", "t-shirt"
}

NUMBERS_SET = {"twenty-one", "twenty-two", "twenty-three", "twenty-four", "twenty-five", "twenty-six", "twenty-seven", "twenty-eight", "twenty-nine", "one hundred", "two hundred"}
ANIMALS_SET = {"penguin", "zebra", "polar bear", "red panda", "sea turtle", "seal", "shark", "whale", "kangaroo", "owl", "orangutan", "grasshopper", "jellyfish", "bird", "giraffe", "hippo"}
NATURE_SET = {"autumn leaves", "cherry blossoms", "desert", "forest", "grass", "island", "leaves", "pond", "rain forest", "savanna", "sky", "stars", "sunrise", "sunset", "waterfall", "sun"}
FOOD_SET = {"fruits", "nuts", "candy"}
BODY_SET = {"arm", "neck", "tail", "wing", "feather", "fur", "horn", "me"}

sound_count = 0
image_count = 0
translated_count = 0
ruby_count = 0

for idx, w in enumerate(master_words):
    w_id = w.get("id")
    en = w.get("english", "")
    en_low = en.lower().strip()
    
    # ID check
    expected_id = f"word_{idx + 1:04d}"
    if not w_id:
        errors.append(f"Word at index {idx} has no ID")
    elif w_id != expected_id:
        errors.append(f"Word at index {idx} has ID '{w_id}' but expected sequential ID '{expected_id}'")
    elif w_id in seen_ids:
        errors.append(f"Duplicate ID found: {w_id} ({en})")
    seen_ids.add(w_id)
    
    # English formatting & quotation audit
    if not en or not en.strip():
        errors.append(f"Word {w_id} has empty english term")
    if en != en.strip():
        errors.append(f"Word {w_id} ('{en}') has leading/trailing whitespace")
    if "  " in en:
        errors.append(f"Word {w_id} ('{en}') has double spaces")
    if "’" in en or "‘" in en:
        errors.append(f"Word {w_id} ('{en}') contains non-standard curly apostrophe")

    # Proper noun capitalization audit
    if en_low in MUST_BE_CAPITALIZED:
        if en not in ["the UK", "the USA", "the Maldives", "the Philippines"] and en[0].islower():
            errors.append(f"Word {w_id} ('{en}') must be capitalized (proper noun/acronym)")
        
    # Category validation
    cat = w.get("category")
    if cat not in VALID_CATEGORIES:
        errors.append(f"Word {w_id} ({en}) has invalid category: '{cat}'")
        
    # Taxonomy checks (no misclassified numbers/animals/nature in dailylife/facility)
    if en_low in NUMBERS_SET and cat != "04_number":
        errors.append(f"Taxonomy Error: Number '{en}' in {cat} instead of 04_number")
    if en_low in ANIMALS_SET and cat != "11_animals":
        errors.append(f"Taxonomy Error: Animal '{en}' in {cat} instead of 11_animals")
    if en_low in NATURE_SET and cat != "12_nature":
        errors.append(f"Taxonomy Error: Nature word '{en}' in {cat} instead of 12_nature")
    if en_low in FOOD_SET and cat != "03_fooddrink":
        errors.append(f"Taxonomy Error: Food word '{en}' in {cat} instead of 03_fooddrink")
    if en_low in BODY_SET and cat != "14_body_family":
        errors.append(f"Taxonomy Error: Body word '{en}' in {cat} instead of 14_body_family")

    # Duplicate concept check within category
    seen_english_by_category.setdefault(cat, set())
    if en in seen_english_by_category[cat]:
        errors.append(f"Duplicate word within category {cat}: '{en}' ({w_id})")
    seen_english_by_category[cat].add(en)

    # Homograph disambiguation metadata check
    ck = w.get("canonical_key", "")
    if ck in ["cook_action", "cook_occupation", "watch_action", "watch_object", "orange_fruit", "orange_color", "clean_action", "clean_adjective"]:
        if not w.get("disambiguation"):
            errors.append(f"Homograph {w_id} ('{en}') missing disambiguation metadata")
        if not w.get("display_label"):
            errors.append(f"Homograph {w_id} ('{en}') missing display_label metadata")
        
    # Part of speech validation
    pos = w.get("part_of_speech")
    if pos not in VALID_POS:
        errors.append(f"Word {w_id} ({en}) has invalid part_of_speech: '{pos}'")
        
    # Japanese translations
    kj = w.get("ja_kanji", "")
    hg = w.get("ja_hiragana", "")
    kt = w.get("en_katakana", "")
    
    if not kj:
        errors.append(f"Word {w_id} ({en}) is missing ja_kanji")
    if not hg:
        errors.append(f"Word {w_id} ({en}) is missing ja_hiragana")
    else:
        # Check that hiragana contains only Hiragana, long vowel mark, or space/symbols
        non_hg = re.sub(r'[\u3040-\u309F\s・/～〜ー-]', '', hg)
        if non_hg:
            errors.append(f"Word {w_id} ({en}) has non-hiragana characters in ja_hiragana: '{hg}' (bad: '{non_hg}')")
    if not kt:
        errors.append(f"Word {w_id} ({en}) is missing en_katakana")
        
    if kj and hg and kt:
        translated_count += 1
        
    # Ruby furigana
    ruby = w.get("ruby")
    ruby_html = w.get("ruby_html")
    ruby_text = w.get("ruby_text")
    if not isinstance(ruby, list) or len(ruby) == 0:
        errors.append(f"Word {w_id} ({en}) has invalid or empty ruby list")
    elif not ruby_html:
        errors.append(f"Word {w_id} ({en}) is missing ruby_html")
    elif not ruby_text:
        errors.append(f"Word {w_id} ({en}) is missing ruby_text")
    else:
        # Check ruby bases match kanji exactly
        joined_base = "".join(s.get("base", "") for s in ruby)
        if joined_base != kj:
            errors.append(f"Word {w_id} ({en}) ruby base mismatch: '{kj}' vs joined '{joined_base}'")
        ruby_count += 1
        
    # Sound file check
    sf = w.get("sound_file")
    if sf:
        if sf not in disk_sounds:
            errors.append(f"Word {w_id} ({en}) references non-existent sound file: '{sf}'")
        else:
            sound_count += 1
    elif en_low in ["the uk", "the usa"]:
        errors.append(f"Word {w_id} ('{en}') has empty sound_file but native audio exists on disk!")
            
    # Image file check
    # Image checks (supports both MEXT dic_card_data_image and Here We Go manabi_assets)
    def img_exists_on_disk(img_ref):
        if not img_ref:
            return False
        if img_ref in disk_images:
            return True
        if os.path.exists(os.path.join(BASE_DIR, "manabi_assets", img_ref)):
            return True
        return False

    img = w.get("card_image")
    if img:
        if not img_exists_on_disk(img):
            errors.append(f"Word {w_id} ({en}) references non-existent card image: '{img}'")
        else:
            image_count += 1

    # Card variants and kana/en/bilingual image check
    for v in w.get("card_variants", []):
        if v and not img_exists_on_disk(v):
            errors.append(f"Word {w_id} ({en}) references non-existent card variant image: '{v}'")
    for field in ["card_image_kana", "card_image_en", "card_image_bilingual"]:
        img_f = w.get(field)
        if img_f and not img_exists_on_disk(img_f):
            errors.append(f"Word {w_id} ({en}) references non-existent {field}: '{img_f}'")
            
    # Grades check
    grades = w.get("grades", [])
    if not isinstance(grades, list) or len(grades) == 0:
        errors.append(f"Word {w_id} ({en}) has empty grades array")
    else:
        for g in grades:
            if g not in VALID_GRADES:
                errors.append(f"Word {w_id} ({en}) has invalid grade: '{g}'")

    # --- Option 2: Pedagogical & Game Engine Integrity ---
    if not w.get("lemma"):
        errors.append(f"Word {w_id} ({en}) missing lemma")
    if not isinstance(w.get("is_plural"), bool):
        errors.append(f"Word {w_id} ({en}) invalid is_plural boolean")
    if not isinstance(w.get("letter_count"), int) or w.get("letter_count", 0) <= 0:
        errors.append(f"Word {w_id} ({en}) invalid letter_count: {w.get('letter_count')}")
    if not isinstance(w.get("syllable_count"), int) or w.get("syllable_count", 0) <= 0:
        errors.append(f"Word {w_id} ({en}) invalid syllable_count: {w.get('syllable_count')}")
    if w.get("difficulty_tier") not in [1, 2, 3]:
        errors.append(f"Word {w_id} ({en}) invalid difficulty_tier: {w.get('difficulty_tier')}")
    if not w.get("first_letter") or len(w.get("first_letter")) != 1 or not w.get("first_letter").isupper():
        errors.append(f"Word {w_id} ({en}) invalid first_letter: {w.get('first_letter')}")
    if not isinstance(w.get("is_compound"), bool):
        errors.append(f"Word {w_id} ({en}) invalid is_compound boolean")

    # Three-Hint Quiz Clues
    th = w.get("three_hints")
    if not isinstance(th, dict):
        errors.append(f"Word {w_id} ({en}) missing three_hints object")
    else:
        for k in ["category_hint", "feature_hint", "letter_hint"]:
            if not th.get(k):
                errors.append(f"Word {w_id} ({en}) missing {k} in three_hints")

    # Target Dialogues & Sentences
    td = w.get("target_dialogues")
    if not isinstance(td, list) or len(td) == 0:
        errors.append(f"Word {w_id} ({en}) missing target_dialogues list")
    else:
        for d in td:
            if not d.get("question") or not d.get("answer"):
                errors.append(f"Word {w_id} ({en}) invalid question/answer in target_dialogues")

    ts = w.get("target_sentences")
    if not isinstance(ts, list) or len(ts) == 0 or not ts[0]:
        errors.append(f"Word {w_id} ({en}) missing or empty target_sentences")

    # Primary media validation
    p_img = w.get("primary_image")
    if p_img and not img_exists_on_disk(p_img):
        errors.append(f"Word {w_id} ({en}) invalid primary_image path: '{p_img}'")

    p_aud = w.get("primary_audio")
    if p_aud and p_aud not in disk_sounds:
        errors.append(f"Word {w_id} ({en}) invalid primary_audio file: '{p_aud}'")

    # Grade-Context-Aware Media Mapping Validation
    mbg = w.get("media_by_grade")
    if mbg is not None:
        if not isinstance(mbg, dict):
            errors.append(f"Word {w_id} ({en}) media_by_grade is not a dictionary")
        else:
            for g_key, g_media in mbg.items():
                if g_media.get("card_image") and not img_exists_on_disk(g_media["card_image"]):
                    errors.append(f"Word {w_id} ({en}) invalid card_image in media_by_grade[{g_key}]: '{g_media['card_image']}'")
                if g_media.get("card_full") and not img_exists_on_disk(g_media["card_full"]):
                    errors.append(f"Word {w_id} ({en}) invalid card_full in media_by_grade[{g_key}]: '{g_media['card_full']}'")
                if g_media.get("sound_file") and g_media["sound_file"] not in disk_sounds:
                    errors.append(f"Word {w_id} ({en}) invalid sound_file in media_by_grade[{g_key}]: '{g_media['sound_file']}'")



# 4. Check Grade Subsets & Category Subsets
print("\nValidating Grade Subset Files...")
for g in ["es_g1", "es_g2", "es_g3", "es_g4", "es_g5", "es_g6"]:
    g_file = os.path.join(MASTER_DIR, f"vocabulary_{g}.json")
    if not os.path.exists(g_file):
        errors.append(f"Grade subset file missing: {g_file}")
    else:
        with open(g_file, "r", encoding="utf-8") as gf:
            g_data = json.load(gf)
            g_tag = g.upper()
            expected_count = sum(1 for w in master_words if g_tag in w["grades"])
            if len(g_data) != expected_count:
                errors.append(f"Grade subset count mismatch for {g_tag}: file has {len(g_data)} vs {expected_count} in master")
            else:
                print(f"  ✓ {g.upper()}: {len(g_data)} words verified (matches master)")

print("\nValidating Modular Category Files...")
categories_dir = os.path.join(MASTER_DIR, "categories")
for cat_key in VALID_CATEGORIES:
    cat_file = os.path.join(categories_dir, f"{cat_key}.json")
    if not os.path.exists(cat_file):
        errors.append(f"Category file missing: {cat_file}")
    else:
        with open(cat_file, "r", encoding="utf-8") as cf:
            cat_data = json.load(cf)
            expected_count = sum(1 for w in master_words if w["category"] == cat_key)
            if len(cat_data) != expected_count:
                errors.append(f"Category count mismatch for {cat_key}: file has {len(cat_data)} vs {expected_count} in master")
            if len(cat_data) == 0:
                warnings.append(f"Category '{cat_key}' is empty")

# 5. Check Index Integrity
print("\nValidating vocabulary_index.json...")
if len(vocab_index.get("byId", {})) != len(master_words):
    errors.append(f"Index byId count mismatch: {len(vocab_index.get('byId', {}))} vs {len(master_words)} in master")

for g_tag in ["ES_G1", "ES_G2", "ES_G3", "ES_G4", "ES_G5", "ES_G6"]:
    idx_count = len(vocab_index.get("byGrade", {}).get(g_tag, []))
    expected_count = sum(1 for w in master_words if g_tag in w["grades"])
    if idx_count != expected_count:
        errors.append(f"Index byGrade mismatch for {g_tag}: {idx_count} vs {expected_count}")

for cat_key in VALID_CATEGORIES:
    idx_count = len(vocab_index.get("byCategory", {}).get(cat_key, []))
    expected_count = sum(1 for w in master_words if w["category"] == cat_key)
    if idx_count != expected_count:
        errors.append(f"Index byCategory mismatch for {cat_key}: {idx_count} vs {expected_count}")

if len(vocab_index.get("byTheme", {})) == 0:
    warnings.append("byTheme index is empty")
else:
    print(f"  ✓ byTheme index verified: {len(vocab_index.get('byTheme', {}))} themes indexed")

# Check byDifficultyTier and byFirstLetter
for tier in [1, 2, 3]:
    tier_key = str(tier)
    idx_count = len(vocab_index.get("byDifficultyTier", {}).get(tier_key, []))
    expected_count = sum(1 for w in master_words if w["difficulty_tier"] == tier)
    if idx_count != expected_count:
        errors.append(f"Index byDifficultyTier mismatch for Tier {tier}: {idx_count} vs {expected_count}")
    else:
        print(f"  ✓ byDifficultyTier index verified for Tier {tier}: {idx_count} words")

fl_indexed = len(vocab_index.get("byFirstLetter", {}))
if fl_indexed == 0:
    errors.append("byFirstLetter index is empty")
else:
    print(f"  ✓ byFirstLetter index verified: {fl_indexed} unique letters indexed")


# 6. Results Report
print("\n" + "=" * 70)
print("AUDIT RESULTS SUMMARY")
print("=" * 70)
print(f"Total Master Vocabulary Words: {len(master_words)}")
print(f"Words with 100% Japanese Translations: {translated_count} / {len(master_words)} ({translated_count/len(master_words)*100:.1f}%)")
print(f"Words with Ruby Furigana Annotations: {ruby_count} / {len(master_words)} ({ruby_count/len(master_words)*100:.1f}%)")
print(f"Native Sound MP3 Files Verified: {sound_count} on disk")
print(f"Flashcard PNG Images Verified: {image_count} on disk")
print(f"Integrity Errors Found: {len(errors)}")
print(f"Warnings Found: {len(warnings)}")

if warnings:
    print("\nWarnings:")
    for w in warnings:
        print(f"  [WARN] {w}")

if errors:
    print("\nErrors:")
    for e in errors[:20]:
        print(f"  [FAIL] {e}")
    if len(errors) > 20:
        print(f"  ... and {len(errors) - 20} more errors")
    sys.exit(1)
else:
    print("\n✓ ALL INTEGRITY CHECKS PASSED (0 ERRORS)! DATASET IS 100% CLEAN AND PRODUCTION READY.")
    sys.exit(0)
