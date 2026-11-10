import json
import shutil
import os

vocab_file = 'public/data/master_vocabulary.json'
backup_file = 'public/data/master_vocabulary.backup.json'

if not os.path.exists(backup_file):
    shutil.copyfile(vocab_file, backup_file)
    print(f"Created backup at {backup_file}")

with open(vocab_file, 'r', encoding='utf-8') as f:
    data = json.load(f)

print(f"Loaded {len(data)} items from {vocab_file}")

UNIT_STR = "Unit 5: Do you have a pen? (文房具セットを作ろう)"

# 1. Update existing 3 plural words
existing_updates = {
    'word_0097': { # erasers
        'primary_image': 'dic_wb_05schoollife_eraser_1266_plural_c.webp',
        'sound': 'sound_suite/letstry/word_0097/letstry_word_0097_erasers_jenny.mp3',
        'bw': 'dic_wb_05schoollife_eraser_1266_1.png'
    },
    'word_0232': { # pencil sharpeners
        'primary_image': 'dic_wb_05schoollife_pencilsharpener_1275_plural_c.webp',
        'sound': 'sound_suite/letstry/word_0232/letstry_word_0232_pencilsharpeners_jenny.mp3',
        'bw': 'dic_wb_05schoollife_pencilsharpener_1275_1.png'
    },
    'word_0233': { # pencils
        'primary_image': 'dic_wb_05schoollife_pencil_1273_plural_c.webp',
        'sound': 'sound_suite/letstry/word_0233/letstry_word_0233_pencils_jenny.mp3',
        'bw': 'dic_wb_05schoollife_pencil_1273_1.png'
    }
}

for item in data:
    wid = item.get('id')
    if wid in existing_updates:
        cfg = existing_updates[wid]
        if 'ES_G4' not in item.get('grades', []):
            item['grades'].append('ES_G4')
        item['primary_image'] = cfg['primary_image']
        item['card_image'] = cfg['primary_image']
        if 'media_by_grade' not in item:
            item['media_by_grade'] = {}
        item['media_by_grade']['ES_G4'] = {
            'card_image': cfg['primary_image'],
            'sound_file': cfg['sound'],
            'source': 'lets_try_2',
            'card_full': cfg['primary_image'],
            'card_bw': cfg['bw'],
            'unit': UNIT_STR
        }
        print(f"Updated existing {wid}: {item['english']}")

# 2. Add 8 new plural entries
new_entries = [
    {
        "id": "word_1086",
        "english": "pens",
        "disambiguation": "",
        "display_label": "pens",
        "part_of_speech": "noun",
        "category": "05_schoollife",
        "ja_kanji": "ペン",
        "ja_hiragana": "ぺん",
        "en_katakana": "ペンズ",
        "ruby": [{"base": "ペン", "ruby": ""}],
        "sound_file": "",
        "card_image": "dic_4_card_pen_2544_plural_c.webp",
        "grades": ["ES_G4"],
        "themes": ["Classroom Objects"],
        "target_sentences": ["Q: Do you have pens? / A: Yes, I do. Here you are."],
        "tags": ["plural", "stationery"],
        "lemma": "pen",
        "is_plural": True,
        "syllable_count": 1,
        "is_compound": False,
        "difficulty_tier": 1,
        "primary_image": "dic_4_card_pen_2544_plural_c.webp",
        "primary_audio": "",
        "three_hints": {
            "category_hint": "It is a classroom stationery item.",
            "feature_hint": "Writing tools in your pencil case or desk known as 'ペン'.",
            "letter_hint": "It starts with the letter P."
        },
        "target_dialogues": [{
            "question": "Do you have pens?",
            "answer": "Yes, I do. Here you are.",
            "context": "Borrowing and sharing stationery"
        }],
        "media_by_grade": {
            "ES_G4": {
                "card_image": "dic_4_card_pen_2544_plural_c.webp",
                "sound_file": "",
                "source": "lets_try_2",
                "card_full": "dic_4_card_pen_2544_plural_c.webp",
                "card_bw": "dic_4_card_pen_2544_1.png",
                "unit": UNIT_STR
            }
        }
    },
    {
        "id": "word_1087",
        "english": "markers",
        "disambiguation": "",
        "display_label": "markers",
        "part_of_speech": "noun",
        "category": "05_schoollife",
        "ja_kanji": "マーカー",
        "ja_hiragana": "まーかー",
        "en_katakana": "マーカーズ",
        "ruby": [{"base": "マーカー", "ruby": ""}],
        "sound_file": "",
        "card_image": "dic_wb_05schoollife_marker_1270_plural_c.webp",
        "grades": ["ES_G4"],
        "themes": ["Classroom Objects"],
        "target_sentences": ["Q: Do you have markers? / A: Yes, I do. Here you are."],
        "tags": ["plural", "stationery"],
        "lemma": "marker",
        "is_plural": True,
        "syllable_count": 2,
        "is_compound": False,
        "difficulty_tier": 1,
        "primary_image": "dic_wb_05schoollife_marker_1270_plural_c.webp",
        "primary_audio": "",
        "three_hints": {
            "category_hint": "It is a classroom stationery item.",
            "feature_hint": "Colorful drawing tools in your pencil case known as 'マーカー'.",
            "letter_hint": "It starts with the letter M."
        },
        "target_dialogues": [{
            "question": "Do you have markers?",
            "answer": "Yes, I do. Here you are.",
            "context": "Borrowing and sharing stationery"
        }],
        "media_by_grade": {
            "ES_G4": {
                "card_image": "dic_wb_05schoollife_marker_1270_plural_c.webp",
                "sound_file": "",
                "source": "lets_try_2",
                "card_full": "dic_wb_05schoollife_marker_1270_plural_c.webp",
                "card_bw": "dic_wb_05schoollife_marker_1270_1.png",
                "unit": UNIT_STR
            }
        }
    },
    {
        "id": "word_1088",
        "english": "rulers",
        "disambiguation": "",
        "display_label": "rulers",
        "part_of_speech": "noun",
        "category": "05_schoollife",
        "ja_kanji": "定規",
        "ja_hiragana": "じょうぎ",
        "en_katakana": "ルーラーズ",
        "ruby": [{"base": "定規", "ruby": "じょうぎ"}],
        "sound_file": "",
        "card_image": "dic_wb_05schoollife_ruler_1276_plural_c.webp",
        "grades": ["ES_G4"],
        "themes": ["Classroom Objects"],
        "target_sentences": ["Q: Do you have rulers? / A: Yes, I do. Here you are."],
        "tags": ["plural", "stationery"],
        "lemma": "ruler",
        "is_plural": True,
        "syllable_count": 2,
        "is_compound": False,
        "difficulty_tier": 1,
        "primary_image": "dic_wb_05schoollife_ruler_1276_plural_c.webp",
        "primary_audio": "",
        "three_hints": {
            "category_hint": "It is a classroom stationery item.",
            "feature_hint": "Used for measuring length and drawing straight lines, known as '定規' (じょうぎ).",
            "letter_hint": "It starts with the letter R."
        },
        "target_dialogues": [{
            "question": "Do you have rulers?",
            "answer": "Yes, I do. Here you are.",
            "context": "Borrowing and sharing stationery"
        }],
        "media_by_grade": {
            "ES_G4": {
                "card_image": "dic_wb_05schoollife_ruler_1276_plural_c.webp",
                "sound_file": "",
                "source": "lets_try_2",
                "card_full": "dic_wb_05schoollife_ruler_1276_plural_c.webp",
                "card_bw": "dic_wb_05schoollife_ruler_1276_1.png",
                "unit": UNIT_STR
            }
        }
    },
    {
        "id": "word_1089",
        "english": "notebooks",
        "disambiguation": "",
        "display_label": "notebooks",
        "part_of_speech": "noun",
        "category": "05_schoollife",
        "ja_kanji": "ノート",
        "ja_hiragana": "のーと",
        "en_katakana": "ノートブックス",
        "ruby": [{"base": "ノート", "ruby": ""}],
        "sound_file": "",
        "card_image": "dic_wb_05schoollife_notebook_1271_plural_c.webp",
        "grades": ["ES_G4"],
        "themes": ["Classroom Objects"],
        "target_sentences": ["Q: Do you have notebooks? / A: Yes, I do. Here you are."],
        "tags": ["plural", "stationery"],
        "lemma": "notebook",
        "is_plural": True,
        "syllable_count": 2,
        "is_compound": False,
        "difficulty_tier": 1,
        "primary_image": "dic_wb_05schoollife_notebook_1271_plural_c.webp",
        "primary_audio": "",
        "three_hints": {
            "category_hint": "It is a classroom stationery item.",
            "feature_hint": "Books with lined paper for writing notes, known as 'ノート'.",
            "letter_hint": "It starts with the letter N."
        },
        "target_dialogues": [{
            "question": "Do you have notebooks?",
            "answer": "Yes, I do. Here you are.",
            "context": "Borrowing and sharing stationery"
        }],
        "media_by_grade": {
            "ES_G4": {
                "card_image": "dic_wb_05schoollife_notebook_1271_plural_c.webp",
                "sound_file": "",
                "source": "lets_try_2",
                "card_full": "dic_wb_05schoollife_notebook_1271_plural_c.webp",
                "card_bw": "dic_wb_05schoollife_notebook_1271_1.png",
                "unit": UNIT_STR
            }
        }
    },
    {
        "id": "word_1090",
        "english": "glue sticks",
        "disambiguation": "",
        "display_label": "glue sticks",
        "part_of_speech": "noun",
        "category": "05_schoollife",
        "ja_kanji": "スティックのり",
        "ja_hiragana": "すてぃっくのり",
        "en_katakana": "グルースティックス",
        "ruby": [{"base": "スティックのり", "ruby": ""}],
        "sound_file": "",
        "card_image": "dic_wb_05schoollife_gluestick_1267_plural_c.webp",
        "grades": ["ES_G4"],
        "themes": ["Classroom Objects"],
        "target_sentences": ["Q: Do you have glue sticks? / A: Yes, I do. Here you are."],
        "tags": ["plural", "stationery"],
        "lemma": "glue stick",
        "is_plural": True,
        "syllable_count": 2,
        "is_compound": True,
        "difficulty_tier": 2,
        "primary_image": "dic_wb_05schoollife_gluestick_1267_plural_c.webp",
        "primary_audio": "",
        "three_hints": {
            "category_hint": "It is a classroom stationery item.",
            "feature_hint": "Adhesive stick used in arts and crafts, known as 'スティックのり'.",
            "letter_hint": "It starts with the letter G."
        },
        "target_dialogues": [{
            "question": "Do you have glue sticks?",
            "answer": "Yes, I do. Here you are.",
            "context": "Borrowing and sharing stationery"
        }],
        "media_by_grade": {
            "ES_G4": {
                "card_image": "dic_wb_05schoollife_gluestick_1267_plural_c.webp",
                "sound_file": "",
                "source": "lets_try_2",
                "card_full": "dic_wb_05schoollife_gluestick_1267_plural_c.webp",
                "card_bw": "dic_wb_05schoollife_gluestick_1267_1.png",
                "unit": UNIT_STR
            }
        }
    },
    {
        "id": "word_1091",
        "english": "staplers",
        "disambiguation": "",
        "display_label": "staplers",
        "part_of_speech": "noun",
        "category": "05_schoollife",
        "ja_kanji": "ホッチキス",
        "ja_hiragana": "ほっちきす",
        "en_katakana": "ステープラーズ",
        "ruby": [{"base": "ホッチキス", "ruby": ""}],
        "sound_file": "",
        "card_image": "dic_4_card_stapler_2548_plural_c.webp",
        "grades": ["ES_G4"],
        "themes": ["Classroom Objects"],
        "target_sentences": ["Q: Do you have staplers? / A: Yes, I do. Here you are."],
        "tags": ["plural", "stationery"],
        "lemma": "stapler",
        "is_plural": True,
        "syllable_count": 2,
        "is_compound": False,
        "difficulty_tier": 2,
        "primary_image": "dic_4_card_stapler_2548_plural_c.webp",
        "primary_audio": "",
        "three_hints": {
            "category_hint": "It is a classroom stationery item.",
            "feature_hint": "Fastens sheets of paper together with wire staples, known as 'ホッチキス'.",
            "letter_hint": "It starts with the letter S."
        },
        "target_dialogues": [{
            "question": "Do you have staplers?",
            "answer": "Yes, I do. Here you are.",
            "context": "Borrowing and sharing stationery"
        }],
        "media_by_grade": {
            "ES_G4": {
                "card_image": "dic_4_card_stapler_2548_plural_c.webp",
                "sound_file": "",
                "source": "lets_try_2",
                "card_full": "dic_4_card_stapler_2548_plural_c.webp",
                "card_bw": "dic_4_card_stapler_2548_1.png",
                "unit": UNIT_STR
            }
        }
    },
    {
        "id": "word_1092",
        "english": "pencil cases",
        "disambiguation": "",
        "display_label": "pencil cases",
        "part_of_speech": "noun",
        "category": "05_schoollife",
        "ja_kanji": "筆箱",
        "ja_hiragana": "ふでばこ",
        "en_katakana": "ペンシルケースズ",
        "ruby": [{"base": "筆箱", "ruby": "ふでばこ"}],
        "sound_file": "",
        "card_image": "dic_wb_05schoollife_pencilcase_1274_plural_c.webp",
        "grades": ["ES_G4"],
        "themes": ["Classroom Objects"],
        "target_sentences": ["Q: Do you have pencil cases? / A: Yes, I do. Here you are."],
        "tags": ["plural", "stationery"],
        "lemma": "pencil case",
        "is_plural": True,
        "syllable_count": 3,
        "is_compound": True,
        "difficulty_tier": 2,
        "primary_image": "dic_wb_05schoollife_pencilcase_1274_plural_c.webp",
        "primary_audio": "",
        "three_hints": {
            "category_hint": "It is a classroom stationery item.",
            "feature_hint": "A case for holding pens and pencils, known as '筆箱' (ふでばこ).",
            "letter_hint": "It starts with the letter P."
        },
        "target_dialogues": [{
            "question": "Do you have pencil cases?",
            "answer": "Yes, I do. Here you are.",
            "context": "Borrowing and sharing stationery"
        }],
        "media_by_grade": {
            "ES_G4": {
                "card_image": "dic_wb_05schoollife_pencilcase_1274_plural_c.webp",
                "sound_file": "",
                "source": "lets_try_2",
                "card_full": "dic_wb_05schoollife_pencilcase_1274_plural_c.webp",
                "card_bw": "dic_wb_05schoollife_pencilcase_1274_1.png",
                "unit": UNIT_STR
            }
        }
    },
    {
        "id": "word_1093",
        "english": "magnets",
        "disambiguation": "",
        "display_label": "magnets",
        "part_of_speech": "noun",
        "category": "05_schoollife",
        "ja_kanji": "磁石",
        "ja_hiragana": "じしゃく",
        "en_katakana": "マグネッツ",
        "ruby": [{"base": "磁石", "ruby": "じしゃく"}],
        "sound_file": "",
        "card_image": "dic_wb_07dailylife_magnet_1360_plural_c.webp",
        "grades": ["ES_G4"],
        "themes": ["Classroom Objects"],
        "target_sentences": ["Q: Do you have magnets? / A: Yes, I do. Here you are."],
        "tags": ["plural", "stationery"],
        "lemma": "magnet",
        "is_plural": True,
        "syllable_count": 2,
        "is_compound": False,
        "difficulty_tier": 1,
        "primary_image": "dic_wb_07dailylife_magnet_1360_plural_c.webp",
        "primary_audio": "",
        "three_hints": {
            "category_hint": "It is a classroom stationery item.",
            "feature_hint": "Sticks to metal boards or desks, known as '磁石' (じしゃく).",
            "letter_hint": "It starts with the letter M."
        },
        "target_dialogues": [{
            "question": "Do you have magnets?",
            "answer": "Yes, I do. Here you are.",
            "context": "Borrowing and sharing stationery"
        }],
        "media_by_grade": {
            "ES_G4": {
                "card_image": "dic_wb_07dailylife_magnet_1360_plural_c.webp",
                "sound_file": "",
                "source": "lets_try_2",
                "card_full": "dic_wb_07dailylife_magnet_1360_plural_c.webp",
                "card_bw": "dic_wb_07dailylife_magnet_1360_1.png",
                "unit": UNIT_STR
            }
        }
    }
]

# Ensure we don't duplicate if script is re-run
existing_ids = set(w['id'] for w in data)
for entry in new_entries:
    if entry['id'] not in existing_ids:
        data.append(entry)
        print(f"Appended new entry {entry['id']}: {entry['english']}")
    else:
        # Update existing
        for i, it in enumerate(data):
            if it['id'] == entry['id']:
                data[i] = entry
                print(f"Updated entry {entry['id']}: {entry['english']}")

with open(vocab_file, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"Successfully saved {len(data)} items to {vocab_file}")
