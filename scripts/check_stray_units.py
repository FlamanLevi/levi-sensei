import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open("public/data/master_vocabulary.json", "r", encoding="utf-8") as f:
    vocab = json.load(f)

words = ["bus stop", "no", "please", "down", "up"]

for item in vocab:
    eng = item.get("english", "").lower()
    if eng in words:
        print(f"=== '{item.get('english')}' (id={item.get('id')}) ===")
        mbg = item.get("media_by_grade", {})
        for g, d in mbg.items():
            print(f"  {g}: unit='{d.get('unit')}', page='{d.get('page')}'")
