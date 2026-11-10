import json
from master_lexicon import LEXICON

with open("master_vocabulary_data/master_vocabulary.json", "r", encoding="utf-8") as f:
    master = json.load(f)

print("=== ALL WORDS NOT IN MASTER_LEXICON.PY ===")
for w in master:
    en = w["english"]
    norm = w["normalized_english"]
    if en not in LEXICON and norm not in LEXICON:
        print(f"  {w['id']}: '{en}' (cat: {w['category']}, pos: {w['part_of_speech']}) -> {w['ja_kanji']} ({w['ja_hiragana']})")
