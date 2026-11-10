import os
import sys
import json

sys.stdout.reconfigure(encoding='utf-8')

VOCAB_PATH = r"D:\Users\levif\Documents\Google Antigravity\levi-sensei (new)\master_vocabulary_data\master_vocabulary.json"

with open(VOCAB_PATH, "r", encoding="utf-8") as f:
    words = json.load(f)

missing = []
for w in words:
    if not w.get("ja_hiragana") and not w.get("ja_kanji"):
        missing.append(w["english"].strip())

# Unique words
unique_missing = sorted(list(set(missing)), key=lambda x: x.lower())
print(f"Total entries missing translations: {len(missing)}")
print(f"Unique words missing translations: {len(unique_missing)}")
print("\nFirst 30 missing words:")
print(unique_missing[:30])

# Save list to file
with open("missing_words.json", "w", encoding="utf-8") as f:
    json.dump(unique_missing, f, ensure_ascii=False, indent=2)
