import os
import math
from PIL import Image, ImageFilter

def extract_sprite(png_path):
    im = Image.open(png_path)
    rgba = im.convert('RGBA')
    # In Let's Try assets, palette index 0 is white background
    mask = im.point(lambda p: 255 if p != 0 else 0, mode='1')
    rgba.putalpha(mask)
    bbox = rgba.getbbox()
    return rgba.crop(bbox)

def create_drop_shadow(sprite, opacity=70, blur_radius=8, offset=(6, 8)):
    # Create black mask
    shadow = Image.new('RGBA', sprite.size, (0, 0, 0, 0))
    alpha = sprite.split()[3]
    shadow_fill = Image.new('RGBA', sprite.size, (0, 0, 0, opacity))
    shadow.paste(shadow_fill, mask=alpha)
    
    # Expand canvas for blur & offset
    pad = blur_radius * 2 + max(abs(offset[0]), abs(offset[1])) + 10
    expanded = Image.new('RGBA', (sprite.width + pad * 2, sprite.height + pad * 2), (0, 0, 0, 0))
    expanded.paste(shadow, (pad + offset[0], pad + offset[1]), shadow)
    blurred = expanded.filter(ImageFilter.GaussianBlur(blur_radius))
    return blurred, pad

def composite_items(sprite, config):
    canvas_w, canvas_h = 2400, 2000
    canvas = Image.new('RGBA', (canvas_w, canvas_h), (0, 0, 0, 0))
    center_x, center_y = canvas_w // 2, canvas_h // 2
    
    items = config.get('items', [])
    for it in items:
        angle = it.get('angle', 0)
        scale = it.get('scale', 1.0)
        ox = it.get('ox', 0)
        oy = it.get('oy', 0)
        has_shadow = it.get('shadow', True)
        
        # Transform sprite
        cur = sprite
        if scale != 1.0:
            nw = max(10, int(cur.width * scale))
            nh = max(10, int(cur.height * scale))
            cur = cur.resize((nw, nh), Image.LANCZOS)
        if angle != 0:
            cur = cur.rotate(angle, resample=Image.BICUBIC, expand=True)
            
        pos_x = center_x + ox - cur.width // 2
        pos_y = center_y + oy - cur.height // 2
        
        # Apply shadow underneath if requested
        if has_shadow:
            shadow, pad = create_drop_shadow(cur, opacity=it.get('shadow_opacity', 65), blur_radius=it.get('shadow_blur', 8), offset=it.get('shadow_offset', (6, 8)))
            canvas.paste(shadow, (pos_x - pad, pos_y - pad), shadow)
            
        canvas.paste(cur, (pos_x, pos_y), cur)
        
    # Crop to content with padding
    bbox = canvas.getbbox()
    if not bbox:
        bbox = (0, 0, canvas_w, canvas_h)
    
    bw = bbox[2] - bbox[0]
    bh = bbox[3] - bbox[1]
    pad_x = max(24, int(bw * 0.04))
    pad_y = max(24, int(bh * 0.04))
    
    crop_box = (
        max(0, bbox[0] - pad_x),
        max(0, bbox[1] - pad_y),
        min(canvas_w, bbox[2] + pad_x),
        min(canvas_h, bbox[3] + pad_y)
    )
    cropped = canvas.crop(crop_box)
    
    # Final white background RGB
    final_img = Image.new('RGB', cropped.size, (255, 255, 255))
    final_img.paste(cropped, (0, 0), cropped)
    return final_img

# Configuration for the 11 stationery items
configs = {
    'pencil': {
        'source': 'dic_wb_05schoollife_pencil_1273_1_c.png',
        'target_stem': 'dic_wb_05schoollife_pencil_1273_plural_c',
        'items': [
            {'angle': -14, 'scale': 0.96, 'ox': -140, 'oy': 25, 'shadow': True},
            {'angle': 0, 'scale': 1.0, 'ox': 0, 'oy': -20, 'shadow': True},
            {'angle': 14, 'scale': 0.96, 'ox': 140, 'oy': 25, 'shadow': True}
        ]
    },
    'pen': {
        'source': 'dic_4_card_pen_2544_1_c.png',
        'target_stem': 'dic_4_card_pen_2544_plural_c',
        'items': [
            {'angle': -14, 'scale': 0.96, 'ox': -140, 'oy': 20, 'shadow': True},
            {'angle': 0, 'scale': 1.0, 'ox': 0, 'oy': -20, 'shadow': True},
            {'angle': 14, 'scale': 0.96, 'ox': 140, 'oy': 20, 'shadow': True}
        ]
    },
    'marker': {
        'source': 'dic_wb_05schoollife_marker_1270_1_c.png',
        'target_stem': 'dic_wb_05schoollife_marker_1270_plural_c',
        'items': [
            {'angle': -13, 'scale': 0.96, 'ox': -130, 'oy': 20, 'shadow': True},
            {'angle': 0, 'scale': 1.0, 'ox': 0, 'oy': -20, 'shadow': True},
            {'angle': 13, 'scale': 0.96, 'ox': 130, 'oy': 20, 'shadow': True}
        ]
    },
    'eraser': {
        'source': 'dic_wb_05schoollife_eraser_1266_1_c.png',
        'target_stem': 'dic_wb_05schoollife_eraser_1266_plural_c',
        'items': [
            {'angle': 0, 'scale': 0.95, 'ox': -110, 'oy': -60, 'shadow': True},
            {'angle': 0, 'scale': 1.0, 'ox': 80, 'oy': 50, 'shadow': True}
        ]
    },
    'ruler': {
        'source': 'dic_wb_05schoollife_ruler_1276_1_c.png',
        'target_stem': 'dic_wb_05schoollife_ruler_1276_plural_c',
        'items': [
            {'angle': 0, 'scale': 0.96, 'ox': -90, 'oy': -80, 'shadow': True},
            {'angle': 0, 'scale': 1.0, 'ox': 80, 'oy': 70, 'shadow': True}
        ]
    },
    'notebook': {
        'source': 'dic_wb_05schoollife_notebook_1271_1_c.png',
        'target_stem': 'dic_wb_05schoollife_notebook_1271_plural_c',
        'items': [
            {'angle': -4, 'scale': 0.95, 'ox': -10, 'oy': -70, 'shadow': True, 'shadow_opacity': 75},
            {'angle': 3, 'scale': 0.98, 'ox': 15, 'oy': 0, 'shadow': True, 'shadow_opacity': 75},
            {'angle': 0, 'scale': 1.0, 'ox': -5, 'oy': 70, 'shadow': True, 'shadow_opacity': 75}
        ]
    },
    'gluestick': {
        'source': 'dic_wb_05schoollife_gluestick_1267_1_c.png',
        'target_stem': 'dic_wb_05schoollife_gluestick_1267_plural_c',
        'items': [
            {'angle': 0, 'scale': 0.94, 'ox': -110, 'oy': -50, 'shadow': True},
            {'angle': 0, 'scale': 1.0, 'ox': 90, 'oy': 40, 'shadow': True}
        ]
    },
    'stapler': {
        'source': 'dic_4_card_stapler_2548_1_c.png',
        'target_stem': 'dic_4_card_stapler_2548_plural_c',
        'items': [
            {'angle': 0, 'scale': 0.94, 'ox': -120, 'oy': -60, 'shadow': True},
            {'angle': 0, 'scale': 1.0, 'ox': 100, 'oy': 50, 'shadow': True}
        ]
    },
    'pencilcase': {
        'source': 'dic_wb_05schoollife_pencilcase_1274_1_c.png',
        'target_stem': 'dic_wb_05schoollife_pencilcase_1274_plural_c',
        'items': [
            {'angle': 0, 'scale': 0.94, 'ox': -110, 'oy': -60, 'shadow': True},
            {'angle': 0, 'scale': 1.0, 'ox': 90, 'oy': 50, 'shadow': True}
        ]
    },
    'pencilsharpener': {
        'source': 'dic_wb_05schoollife_pencilsharpener_1275_1_c.png',
        'target_stem': 'dic_wb_05schoollife_pencilsharpener_1275_plural_c',
        'items': [
            {'angle': 0, 'scale': 0.94, 'ox': -110, 'oy': -50, 'shadow': True},
            {'angle': 0, 'scale': 1.0, 'ox': 90, 'oy': 40, 'shadow': True}
        ]
    },
    'magnet': {
        'source': 'dic_wb_07dailylife_magnet_1360_1_c.png',
        'target_stem': 'dic_wb_07dailylife_magnet_1360_plural_c',
        'items': [
            {'angle': 0, 'scale': 0.95, 'ox': -110, 'oy': -50, 'shadow': True},
            {'angle': 0, 'scale': 1.0, 'ox': 90, 'oy': 40, 'shadow': True}
        ]
    }
}

src_dir = 'letstry2/resources/app/app/__media/dictionary/dic_card_data_image'
out_dir = 'trimmed_assets/letstry_images'
os.makedirs(out_dir, exist_ok=True)

print(f"Generating 11 plural stationery images into {out_dir}...")
results = []
for key, conf in configs.items():
    src_path = os.path.join(src_dir, conf['source'])
    sprite = extract_sprite(src_path)
    final_img = composite_items(sprite, conf)
    
    stem = conf['target_stem']
    webp_path = os.path.join(out_dir, f"{stem}.webp")
    png_path = os.path.join(out_dir, f"{stem}.png")
    
    final_img.save(webp_path, 'WEBP', quality=92)
    final_img.save(png_path, 'PNG', optimize=True)
    
    results.append({
        'key': key,
        'webp': webp_path,
        'png': png_path,
        'size': final_img.size
    })
    print(f"  [OK] {key:16} -> {stem}.webp {final_img.size}")

print("\nAll 11 plural images generated successfully!")
