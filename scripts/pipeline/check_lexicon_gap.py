import json
from master_lexicon import LEXICON

with open("master_vocabulary_data/master_vocabulary.json", "r", encoding="utf-8") as f:
    master = json.load(f)

not_in_lex = []
for w in master:
    en = w["english"]
    norm = w["normalized_english"]
    tok = w["token"]
    if en not in LEXICON and norm not in LEXICON:
        not_in_lex.append(w)

print(f"Total words in master: {len(master)}")
print(f"Words NOT in LEXICON: {len(not_in_lex)}")
for w in not_in_lex[:50]:
    print(f"  {w['id']}: '{w['english']}' (cat: {w['category']}, pos: {w['part_of_speech']}) -> {w['ja_kanji']}")
