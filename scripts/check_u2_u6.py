import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open("public/data/master_vocabulary.json", "r", encoding="utf-8") as f:
    vocab = json.load(f)

print("=== ES_G4 Unit 2 words ===")
u2 = [w.get("english") for w in vocab if w.get("media_by_grade", {}).get("ES_G4", {}).get("unit", "").startswith("Unit 2")]
print(u2)

print("\n=== ES_G4 Unit 6 words ===")
u6 = [w.get("english") for w in vocab if w.get("media_by_grade", {}).get("ES_G4", {}).get("unit", "").startswith("Unit 6")]
print(u6)
