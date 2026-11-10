import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open("public/data/master_vocabulary.json", "r", encoding="utf-8") as f:
    vocab = json.load(f)

# Find all items that show up in Grade 4 Unit 6
g4_u6_items = []
for item in vocab:
    grades = item.get("grades", [])
    # Check media_by_grade or tags or lesson plans
    mbg = item.get("media_by_grade", {})
    g4_data = mbg.get("ES_G4") or mbg.get("4")
    # Check if item is tagged with Unit 6
    is_u6 = False
    if g4_data:
        unit = g4_data.get("unit")
        if unit == 6 or unit == "6" or unit == "U6":
            is_u6 = True
    
    # Also check tags or themes
    tags = item.get("tags", [])
    if any("U6" in str(t) or "Unit 6" in str(t) or "unit_6" in str(t) for t in tags):
        if "ES_G4" in grades:
            is_u6 = True
            
    if is_u6:
        g4_u6_items.append(item)

print(f"Total items matched in G4 U6: {len(g4_u6_items)}")
for item in g4_u6_items:
    eng = item.get("english")
    card = item.get("card_image")
    mbg = item.get("media_by_grade", {}).get("ES_G4", {})
    print(f"  {eng:15} | ID: {item.get('id'):10} | Unit: {mbg.get('unit')} | Card: {card} | Category: {item.get('category')}")
