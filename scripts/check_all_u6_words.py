import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open("public/data/master_vocabulary.json", "r", encoding="utf-8") as f:
    vocab = json.load(f)

u6_words = []
for item in vocab:
    mbg = item.get("media_by_grade", {})
    if "ES_G4" in mbg and mbg["ES_G4"].get("unit") == "Unit 6: Alphabet (お気に入りの場所を案内しよう)":
        u6_words.append((item.get("id"), item.get("english"), item.get("category")))

print(f"Total words with this unit in ES_G4: {len(u6_words)}")
for w in u6_words:
    print(f"  {w[0]:10} | {w[1]:15} | Category: {w[2]}")
