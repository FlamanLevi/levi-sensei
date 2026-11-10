import json
import os

with open(r'D:\Users\levif\Downloads\vocabulary.json', 'r', encoding='utf-8') as f:
    hwg_data = json.load(f)

with open('manabi_assets/sliced_card_catalog.json', 'r', encoding='utf-8') as f:
    catalog = json.load(f)

def inspect_unit(grade, u_idx):
    g_key = f"grade{grade}"
    u_list = list(hwg_data[g_key].items())[u_idx - 1]
    u_name, words = u_list
    print(f"\n=== Grade {grade} Unit {u_idx}: {u_name} ({len(words)} words) ===")
    for w_idx, w in enumerate(words):
        card_id = f"hwg{grade}_u{u_idx:02d}_{w_idx:02d}_{w['id']}"
        cat_entry = catalog.get(card_id)
        print(f"  {w_idx:02d}: {w['en']:<20} -> {card_id} in catalog: {cat_entry is not None}")

inspect_unit(6, 7)
inspect_unit(6, 12)
inspect_unit(5, 21)
inspect_unit(5, 25)
