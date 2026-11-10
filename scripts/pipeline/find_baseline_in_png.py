import os
from PIL import Image

png_path = os.path.join("letstry2", "resources", "app", "app", "__media", "dictionary", "dic_card_data_image", "dic_4_card_g_2557_1_c.png")
if not os.path.exists(png_path):
    print("Not found:", png_path)
    exit(1)

im = Image.open(png_path).convert("RGBA")
w, h = im.size
print(f"Original g PNG size: {w}x{h}")

# Search for cyan pixels (R < 100, G > 150, B > 180) across the image
cyan_rows = {}
for y in range(h):
    row_cyan_count = 0
    for x in range(w):
        r, g, b, a = im.getpixel((x, y))
        if a > 100 and b > 160 and g > 130 and r < 100:
            row_cyan_count += 1
    if row_cyan_count > 10:
        cyan_rows[y] = row_cyan_count

print("Cyan rows in g:", cyan_rows)

# Let's also check other descenders: p, q, y, j
for letter, num in [('p', 2566), ('q', 2567), ('y', 2575), ('j', 2560)]:
    p_path = os.path.join("letstry2", "resources", "app", "app", "__media", "dictionary", "dic_card_data_image", f"dic_4_card_{letter}_{num}_1_c.png")
    if os.path.exists(p_path):
        p_im = Image.open(p_path).convert("RGBA")
        pw, ph = p_im.size
        p_cyan = [y for y in range(ph) if sum(1 for x in range(pw) if p_im.getpixel((x, y))[3] > 100 and p_im.getpixel((x, y))[2] > 160 and p_im.getpixel((x, y))[1] > 130 and p_im.getpixel((x, y))[0] < 100) > 10]
        print(f"{letter} ({pw}x{ph}): cyan rows={p_cyan}")
