import cv2
import numpy as np
import os

p = 'E:/Levi-Sensei Images/Here We Go 6/Here We Go 6 (Originals)/05_5   季節の行事/u11_p5_2.png'
im = cv2.imdecode(np.fromfile(p, dtype=np.uint8), cv2.IMREAD_UNCHANGED)

# Save the 4 cards to temporary PNGs so we can check their sizes and contents
os.makedirs('scripts/pipeline/temp_p5_2', exist_ok=True)
for i in range(4):
    card = im[:, i*280:(i+1)*280]
    out_p = f'scripts/pipeline/temp_p5_2/card_{i+1}.png'
    cv2.imwrite(out_p, card)
    print(f'Card {i+1} saved: shape={card.shape}')
