import os
from PIL import Image

for letter, num in [('g', 2557), ('p', 2566), ('q', 2567), ('y', 2575), ('j', 2560)]:
    png_path = os.path.join("letstry2", "resources", "app", "app", "__media", "dictionary", "dic_card_data_image", f"dic_4_card_{letter}_{num}_1_c.png")
    im = Image.open(png_path).convert("RGBA")
    bbox = im.getbbox()
    # find cyan rows
    w, h = im.size
    cyan_rows = [y for y in range(h) if sum(1 for x in range(w) if im.getpixel((x, y))[2] > 160 and im.getpixel((x, y))[1] > 130 and im.getpixel((x, y))[0] < 100) > 100]
    baseline_uncropped = cyan_rows[0] if cyan_rows else None
    baseline_cropped = (baseline_uncropped - bbox[1]) if (baseline_uncropped and bbox) else None
    print(f"{letter}: bbox={bbox} (w={bbox[2]-bbox[0]}, h={bbox[3]-bbox[1]}) baseline_uncropped={baseline_uncropped} => baseline_cropped_Y={baseline_cropped}")
