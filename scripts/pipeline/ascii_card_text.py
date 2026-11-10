import cv2
import numpy as np

def ascii_render(im_crop, thresh=180, scale_x=2, scale_y=4):
    gray = cv2.cvtColor(im_crop, cv2.COLOR_BGR2GRAY)
    h, w = gray.shape
    new_w = w // scale_x
    new_h = h // scale_y
    resized = cv2.resize(gray, (new_w, new_h), interpolation=cv2.INTER_AREA)
    lines = []
    for row in resized:
        line = ''.join(['#' if p < thresh else ' ' for p in row])
        if '#' in line:
            lines.append(line)
    return '\n'.join(lines)

for i in range(1, 5):
    im = cv2.imread(f'scripts/pipeline/temp_p5_2/card_{i}.png')
    # Text region roughly y=160..235, x=20..260
    text_region = im[160:235, 10:270]
    print(f"=== CARD {i} TEXT ===")
    print(ascii_render(text_region, thresh=190, scale_x=2, scale_y=2))
