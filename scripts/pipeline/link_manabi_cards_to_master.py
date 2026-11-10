import os
import sys
import json
import re

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MASTER_DIR = os.path.join(BASE_DIR, "master_vocabulary_data")
MASTER_JSON_PATH = os.path.join(MASTER_DIR, "master_vocabulary.json")
CATALOG_PATH = os.path.join(BASE_DIR, "manabi_assets", "sliced_card_catalog.json")

print("=" * 60)
print("LINKING HERE WE GO SLICED CARDS TO MASTER VOCABULARY")
print("=" * 60)

with open(MASTER_JSON_PATH, "r", encoding="utf-8") as f:
    master_words = json.load(f)

with open(CATALOG_PATH, "r", encoding="utf-8") as f:
    card_catalog = json.load(f)

# Index catalog by normalized english
catalog_by_word = {}
for card_id, c_data in card_catalog.items():
    w_norm = re.sub(r'[^a-zA-Z0-9]', '', c_data["english"]).lower()
    if w_norm not in catalog_by_word:
        catalog_by_word[w_norm] = []
    catalog_by_word[w_norm].append(c_data)

linked_count = 0
new_visual_count = 0

for w in master_words:
    w_norm = re.sub(r'[^a-zA-Z0-9]', '', w.get("english", "")).lower()
    matches = catalog_by_word.get(w_norm, [])
    
    if matches:
        # Pick the best match (e.g. matching grade if possible)
        best_match = matches[0]
        for m in matches:
            if m["grade"] in w.get("grades", []):
                best_match = m
                break
                
        w["hwg_card_full"] = best_match["card_full"]
        w["hwg_card_illust"] = best_match["card_illust"]
        w["hwg_card_text"] = best_match["card_text"]
        
        # If the word previously had no card image, use the Here We Go sliced card!
        if not w.get("card_image"):
            w["card_image"] = best_match["card_full"]
            w["card_image_kana"] = best_match["card_full"]
            w["card_image_en"] = best_match["card_full"]
            w["card_image_bilingual"] = best_match["card_full"]
            new_visual_count += 1
            
        linked_count += 1

print(f"Successfully linked Here We Go cards to {linked_count} master vocabulary words!")
print(f"Added brand new flashcard artwork to {new_visual_count} words that previously lacked images!")

# Save updated master
with open(MASTER_JSON_PATH, "w", encoding="utf-8") as f:
    json.dump(master_words, f, ensure_ascii=False, indent=2)

# Rebuild vocabulary_index.json with updated links
with open(os.path.join(MASTER_DIR, "vocabulary_index.json"), "r", encoding="utf-8") as f:
    vocab_index = json.load(f)

for w in master_words:
    if w["id"] in vocab_index["byId"]:
        vocab_index["byId"][w["id"]] = w

with open(os.path.join(MASTER_DIR, "vocabulary_index.json"), "w", encoding="utf-8") as f:
    json.dump(vocab_index, f, ensure_ascii=False, indent=2)

# Update grade subsets and category files
for g in ["es_g1", "es_g2", "es_g3", "es_g4", "es_g5", "es_g6"]:
    g_tag = g.upper()
    subset = [w for w in master_words if g_tag in w.get("grades", [])]
    with open(os.path.join(MASTER_DIR, f"vocabulary_{g}.json"), "w", encoding="utf-8") as f:
        json.dump(subset, f, ensure_ascii=False, indent=2)

CATEGORIES_DIR = os.path.join(MASTER_DIR, "categories")
for c_file in os.listdir(CATEGORIES_DIR):
    if c_file.endswith(".json"):
        cat_key = os.path.splitext(c_file)[0]
        c_words = [w for w in master_words if w.get("category") == cat_key]
        with open(os.path.join(CATEGORIES_DIR, c_file), "w", encoding="utf-8") as f:
            json.dump(c_words, f, ensure_ascii=False, indent=2)

print("✓ Updated master, index, grade subsets, and category files!")
