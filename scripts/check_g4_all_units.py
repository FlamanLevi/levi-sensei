import json
import sys
from collections import Counter

sys.stdout.reconfigure(encoding='utf-8')

with open("public/data/master_vocabulary.json", "r", encoding="utf-8") as f:
    vocab = json.load(f)

g4_units = Counter()
for item in vocab:
    mbg = item.get("media_by_grade", {})
    if "ES_G4" in mbg and mbg["ES_G4"].get("unit"):
        g4_units[mbg["ES_G4"]["unit"]] += 1

print("All ES_G4 units in master_vocabulary.json:")
for u, c in sorted(g4_units.items()):
    print(f"  {u:55}: {c} words")
