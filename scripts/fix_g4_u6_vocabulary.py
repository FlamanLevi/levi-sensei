import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

paths = [
    "public/data/master_vocabulary.json",
    "master_vocabulary_data/master_vocabulary.json"
]

for p in paths:
    with open(p, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    cleaned_u6_title = 0
    fixed_strays = 0
    
    for item in data:
        w_id = item.get("id")
        eng = item.get("english", "")
        mbg = item.get("media_by_grade", {})
        
        # 1. Clean the 26 lowercase letters unit title
        if item.get("category") == "16_alphabet" and "ES_G4" in mbg:
            if mbg["ES_G4"].get("unit") == "Unit 6: Alphabet (お気に入りの場所を案内しよう)":
                mbg["ES_G4"]["unit"] = "Unit 6: Alphabet"
                cleaned_u6_title += 1
                
        # 2. Fix the 5 stray words
        if eng == "bus stop" and "ES_G4" in mbg:
            mbg["ES_G4"]["unit"] = "Unit 8: This is my favorite place. (校内を案内しよう)"
            fixed_strays += 1
        elif eng in ["down", "up"] and "ES_G4" in mbg:
            mbg["ES_G4"]["unit"] = "Unit 8: This is my favorite place. (校内を案内しよう)"
            fixed_strays += 1
        elif eng in ["no", "please"] and "ES_G4" in mbg:
            # Remove ES_G4 assignment or remove unit so it doesn't pollute G4 U6
            del mbg["ES_G4"]
            if "ES_G4" in item.get("grades", []):
                item["grades"] = [g for g in item["grades"] if g != "ES_G4"]
            fixed_strays += 1
            
    with open(p, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        
    print(f"Updated {p}: cleaned {cleaned_u6_title} letter unit titles, fixed {fixed_strays} stray words.")
