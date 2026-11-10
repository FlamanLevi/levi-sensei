import os
import sys
import cv2
import numpy as np

sys.stdout.reconfigure(encoding='utf-8')

# Compare English
# G5: trimmed_assets/cards/illustration/hwg5_u14_01_English_illust.webp
p5 = 'trimmed_assets/cards/illustration/hwg5_u14_01_English_illust.webp'
# G6: E:/Levi-Sensei Images/Here We Go 6/Here We Go 6 (RealCUGAN_4x)/14_14   教科/u11_p14_item_01.webp
p6_rc = 'E:/Levi-Sensei Images/Here We Go 6/Here We Go 6 (RealCUGAN_4x)/14_14   教科/u11_p14_item_01.webp'
p6_as = 'E:/Levi-Sensei Images/Here We Go 6/Here We Go 6 (Animesharp_4x)/14_14   教科/u11_p14_item_01.webp'

if os.path.exists(p5) and os.path.exists(p6_rc):
    im5 = cv2.imdecode(np.fromfile(p5, dtype=np.uint8), cv2.IMREAD_UNCHANGED)
    im6_rc = cv2.imdecode(np.fromfile(p6_rc, dtype=np.uint8), cv2.IMREAD_UNCHANGED)
    im6_as = cv2.imdecode(np.fromfile(p6_as, dtype=np.uint8), cv2.IMREAD_UNCHANGED)
    print('English G5 shape:', im5.shape, 'Size:', os.path.getsize(p5))
    print('English G6 RC shape:', im6_rc.shape, 'Size:', os.path.getsize(p6_rc))
    print('English G6 AS shape:', im6_as.shape, 'Size:', os.path.getsize(p6_as))

# Compare April
p5_apr = 'trimmed_assets/cards/illustration/hwg5_u11_03_April_illust.webp'
p6_apr_rc = 'E:/Levi-Sensei Images/Here We Go 6/Here We Go 6 (RealCUGAN_4x)/04_4   月、日にち/u11_p4_1_item_03.webp'
p6_apr_as = 'E:/Levi-Sensei Images/Here We Go 6/Here We Go 6 (Animesharp_4x)/04_4   月、日にち/u11_p4_1_item_03.webp'

if os.path.exists(p5_apr) and os.path.exists(p6_apr_rc):
    im5 = cv2.imdecode(np.fromfile(p5_apr, dtype=np.uint8), cv2.IMREAD_UNCHANGED)
    im6_rc = cv2.imdecode(np.fromfile(p6_apr_rc, dtype=np.uint8), cv2.IMREAD_UNCHANGED)
    im6_as = cv2.imdecode(np.fromfile(p6_apr_as, dtype=np.uint8), cv2.IMREAD_UNCHANGED)
    print('\nApril G5 shape:', im5.shape, 'Size:', os.path.getsize(p5_apr))
    print('April G6 RC shape:', im6_rc.shape, 'Size:', os.path.getsize(p6_apr_rc))
    print('April G6 AS shape:', im6_as.shape, 'Size:', os.path.getsize(p6_apr_as))
