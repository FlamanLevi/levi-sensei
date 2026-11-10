import os
import sys
import shutil
import re
import json
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')

BASE_E = "E:/Levi-Sensei Images/Let's Try (Grade 3 & 4)"
VEC_DIR = os.path.join(BASE_E, "Let's Try (Vector)")
CUG_DIR = os.path.join(BASE_E, "Let's Try (Realcugan_4x)")

REPO_ROOT = "c:/Antigravity/levi-sensei (new)"
DEPLOY_DIR = os.path.join(REPO_ROOT, "trimmed_assets/letstry_images")
BACKUP_DIR = os.path.join(REPO_ROOT, "trimmed_assets/letstry_images_legacy_png")
VOCAB_JSON = os.path.join(REPO_ROOT, "public/data/master_vocabulary.json")

print("=" * 95)
print("🚀 DEPLOYING LET'S TRY HYBRID PIPELINE: VECTOR (SVG) + REAL-CUGAN 4x (WEBP Q=92)")
print("=" * 95)

# Verify source directories
if not os.path.exists(VEC_DIR) or not os.path.exists(CUG_DIR):
    print("❌ Source directories on drive E: not found!")
    sys.exit(1)

# Helper to identify vector items
def is_vector_target(name):
    # Alphabet single letters: dic_3_card_[a-z]_ or dic_4_card_[a-z]_
    if re.search(r'dic_[34]_card_[a-z]_\d+_1_c', name):
        return True
    # Numbers: one to thirty, or numerals
    num_words = [
        'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
        'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty',
        'twentyone', 'twentytwo', 'twentythree', 'twentyfour', 'twentyfive', 'twentysix', 'twentyseven', 'twentyeight', 'twentynine', 'thirty'
    ]
    for nw in num_words:
        if f'_{nw}_' in name:
            return True
    # Shapes: circle, star, heart, triangle, square, rectangle, diamond, oval, cross
    shapes = ['circle', 'star', 'heart', 'triangle', 'square', 'rectangle', 'diamond', 'oval', 'cross']
    for s in shapes:
        if f'_{s}_' in name:
            return True
    return False

# Step 1: Safety Backup of legacy PNGs
print("\n📦 STEP 1: BACKING UP LEGACY PNG ASSETS")
os.makedirs(BACKUP_DIR, exist_ok=True)
legacy_pngs = [f for f in os.listdir(DEPLOY_DIR) if f.endswith('.png')]
print(f"  • Backing up {len(legacy_pngs)} legacy PNGs to: {BACKUP_DIR}")
for f in legacy_pngs:
    src_f = os.path.join(DEPLOY_DIR, f)
    dst_f = os.path.join(BACKUP_DIR, f)
    if not os.path.exists(dst_f):
        shutil.copy2(src_f, dst_f)
print("  ✅ Backup complete!")

# Step 2: Classify all 631 items
all_master_files = sorted([f.replace('.webp', '') for f in os.listdir(CUG_DIR) if f.endswith('.webp')])
print(f"\n🔍 STEP 2: CLASSIFYING {len(all_master_files)} MASTER ASSETS")

vector_names = [name for name in all_master_files if is_vector_target(name)]
raster_names = [name for name in all_master_files if not is_vector_target(name)]

print(f"  • Vector SVG targets : {len(vector_names)} files (Shapes, Alphabet, Numbers)")
print(f"  • Raster WebP targets: {len(raster_names)} files (Characters, Animals, Food, Actions)")
assert len(vector_names) + len(raster_names) == len(all_master_files) == 631, "File count mismatch!"

# Step 3: Deploy Vector SVGs
print("\n🎨 STEP 3: DEPLOYING VECTOR SVGs (<10 KB each)")
svg_deployed = 0
svg_total_bytes = 0
for name in vector_names:
    src_svg = os.path.join(VEC_DIR, name + ".svg")
    dst_svg = os.path.join(DEPLOY_DIR, name + ".svg")
    if not os.path.exists(src_svg):
        print(f"  ⚠️ Warning: SVG not found: {src_svg}")
        continue
    shutil.copy2(src_svg, dst_svg)
    svg_deployed += 1
    svg_total_bytes += os.path.getsize(dst_svg)

print(f"  ✅ Deployed {svg_deployed} SVGs ({svg_total_bytes / 1024:.1f} KB total, avg {svg_total_bytes / svg_deployed / 1024:.1f} KB/card)")

# Step 4: Encode and Deploy Rasters at Q=92 method=6
print("\n🖼️ STEP 4: ENCODING RASTERS TO WEBP (Quality=92, Method=6, Native 4x Resolution)")
raster_deployed = 0
raster_total_bytes = 0

for i, name in enumerate(raster_names):
    src_webp = os.path.join(CUG_DIR, name + ".webp")
    dst_webp = os.path.join(DEPLOY_DIR, name + ".webp")
    
    # Load from master Real-CUGAN and encode with PIL quality=92, method=6
    with Image.open(src_webp) as im:
        im.save(dst_webp, "WEBP", quality=92, method=6)
    
    sz = os.path.getsize(dst_webp)
    raster_deployed += 1
    raster_total_bytes += sz
    
    if (i + 1) % 100 == 0 or (i + 1) == len(raster_names):
        print(f"  • Processed [{i+1}/{len(raster_names)}] cards... ({raster_total_bytes / (1024*1024):.1f} MB encoded so far)")

print(f"  ✅ Deployed {raster_deployed} WebP illustrations ({raster_total_bytes / (1024*1024):.1f} MB total, avg {raster_total_bytes / raster_deployed / 1024:.1f} KB/card)")

# Step 5: Clean up old PNGs from letstry_images (now that backup exists and new assets are in place)
print("\n🧹 STEP 5: CLEANING UP LEGACY PNGs FROM DEPLOYED FOLDER")
png_removed = 0
for f in legacy_pngs:
    p = os.path.join(DEPLOY_DIR, f)
    if os.path.exists(p):
        os.remove(p)
        png_removed += 1
print(f"  ✅ Removed {png_removed} legacy PNG files (preserved safely in backup folder)")

# Step 6: Update public/data/master_vocabulary.json
print("\n📚 STEP 6: UPDATING MASTER VOCABULARY JSON")
with open(VOCAB_JSON, 'r', encoding='utf-8') as f:
    vocab = json.load(f)

updated_vocab_count = 0
for item in vocab:
    for field in ['card_image', 'primary_image', 'card_image_bilingual']:
        val = item.get(field)
        if not val or not isinstance(val, str):
            continue
        base_match = re.match(r'^(dic_[34]_card_[^.]+|dic_wb_[^.]+)\.png$', val)
        if base_match:
            base_name = base_match.group(1)
            new_ext = ".svg" if is_vector_target(base_name) else ".webp"
            item[field] = base_name + new_ext
            updated_vocab_count += 1
    
    # Also check media_by_grade
    mbg = item.get('media_by_grade')
    if isinstance(mbg, dict):
        for g_key, g_media in mbg.items():
            if isinstance(g_media, dict):
                for f_key in ['card_image', 'card_full']:
                    g_val = g_media.get(f_key)
                    if g_val and isinstance(g_val, str):
                        base_match = re.match(r'^(dic_[34]_card_[^.]+|dic_wb_[^.]+)\.png$', g_val)
                        if base_match:
                            base_name = base_match.group(1)
                            new_ext = ".svg" if is_vector_target(base_name) else ".webp"
                            g_media[f_key] = base_name + new_ext
                            updated_vocab_count += 1

with open(VOCAB_JSON, 'w', encoding='utf-8') as f:
    json.dump(vocab, f, ensure_ascii=False, indent=2)

print(f"  ✅ Updated {updated_vocab_count} image references in master_vocabulary.json")

# Summary
total_deployed_bytes = svg_total_bytes + raster_total_bytes
print("\n" + "=" * 95)
print("🎉 LET'S TRY HYBRID DEPLOYMENT COMPLETE!")
print(f"  • Total Deployed Cards : {svg_deployed + raster_deployed} / 631")
print(f"  • Total Vector SVGs    : {svg_deployed} cards ({svg_total_bytes/1024:.1f} KB)")
print(f"  • Total WebP (Q=92)    : {raster_deployed} cards ({raster_total_bytes/(1024*1024):.1f} MB)")
print(f"  • Total Suite Weight   : {total_deployed_bytes / (1024*1024):.1f} MB (Down from 957 MB raw master!)")
print(f"  • Average Card Weight  : {total_deployed_bytes / 631 / 1024:.1f} KB/card")
print("=" * 95)
