import os, re

SVG_SOURCE_DIR = r"E:\Levi-Sensei Images\Let's Try (Grade 3 & 4)\Let's Try (New)\grade3_4_vector_svg"
CROP_DIR = r"E:\Levi-Sensei Images\Let's Try (Grade 3 & 4)\Let's Try (Cropped)"

samples = ['dic_3_card_a_2068_1_c.svg', 'dic_3_card_b_2069_1_c.svg', 'dic_3_card_c_2070_1_c.svg', 'dic_4_card_a_2551_1_c.svg', 'dic_4_card_g_2557_1_c.svg']
for f in samples:
    p = os.path.join(SVG_SOURCE_DIR, f)
    if not os.path.exists(p):
        print('Not found:', p)
        continue
    with open(p, 'r', encoding='utf-8') as fp:
        content = fp.read()
    fills = set(re.findall(r'fill="([^"]+)"', content))
    print(f, 'fills:', fills)
