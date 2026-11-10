import json
import os
from PIL import Image

with open('public/data/master_vocabulary.json', 'r', encoding='utf-8') as f:
    vocab = json.load(f)

wb_images = set()
for w in vocab:
    for g, m in (w.get('media_by_grade') or {}).items():
        img = m.get('card_image')
        if img and 'dic_wb_' in img:
            wb_images.add(img)

print(f"Total referenced dic_wb images: {len(wb_images)}")
dark = []
for img_name in sorted(wb_images):
    p = os.path.join('dist', 'media', 'images', img_name)
    if os.path.exists(p):
        try:
            im = Image.open(p).convert('RGB')
            w, h = im.size
            corners = [im.getpixel((5, 5)), im.getpixel((w-6, 5)), im.getpixel((5, h-6)), im.getpixel((w-6, h-6))]
            avg_br = sum(sum(c)/3 for c in corners) / 4
            if avg_br < 220:
                dark.append((img_name, round(avg_br), corners[0]))
        except Exception as e:
            pass

print(f"Dark corner images count: {len(dark)}")
for item in dark:
    print(item)
