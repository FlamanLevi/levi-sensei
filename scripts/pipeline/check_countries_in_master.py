import json

with open("master_vocabulary_data/master_vocabulary.json", "r", encoding="utf-8") as f:
    master = json.load(f)

countries = ["australia", "russia", "india", "korea", "canada", "peru", "thailand", "china", "egypt", "italy", "japan", "spain", "france", "germany", "brazil", "america"]

for c in countries:
    found = [w for w in master if w["english"].lower() == c]
    if found:
        print(f"Country {c}: found {found[0]['id']}, sound='{found[0]['sound_file']}', img='{found[0]['card_image']}'")
    else:
        print(f"Country {c}: NOT FOUND IN MASTER!")
