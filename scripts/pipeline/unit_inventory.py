import json
import os

with open(r'D:\Users\levif\Downloads\vocabulary.json', 'r', encoding='utf-8') as f:
    hwg_data = json.load(f)

with open('slice_and_catalog_manabi.py', 'r', encoding='utf-8') as f:
    code = f.read()

# Let's extract G5_POSTER_MAP and G6_POSTER_MAP directly
g5_map_str = code[code.index("G5_POSTER_MAP = {"):code.index("G6_POSTER_MAP = {")]
g6_map_str = code[code.index("G6_POSTER_MAP = {"):code.index("def slice_poster_grid")]

exec(g5_map_str)
exec(g6_map_str)

print("=== GRADE 5 UNIT INVENTORY ===")
for u_idx, (u_name, words) in enumerate(hwg_data["grade5"].items(), start=1):
    posters = G5_POSTER_MAP.get(u_idx, [])
    print(f"U{u_idx:02d}: {len(words):2d} words | Posters: {posters} | {u_name}")

print("\n=== GRADE 6 UNIT INVENTORY ===")
for u_idx, (u_name, words) in enumerate(hwg_data["grade6"].items(), start=1):
    posters = G6_POSTER_MAP.get(u_idx, [])
    print(f"U{u_idx:02d}: {len(words):2d} words | Posters: {posters} | {u_name}")
