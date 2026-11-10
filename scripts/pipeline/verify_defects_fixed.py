import os
import cv2
import numpy as np

CARDS_DIR = "manabi_assets/cards"
FULL_DIR = os.path.join(CARDS_DIR, "full")
ILLUST_DIR = os.path.join(CARDS_DIR, "illustration")
TEXT_DIR = os.path.join(CARDS_DIR, "text")


cards_to_check = [
    # Original target defect cards
    ("hwg5_u04_00_baseball", "Baseball (U4 Sports)"),
    ("hwg5_u04_01_basketball", "Basketball (U4 Sports)"),
    ("hwg5_u04_02_dodgeball", "Dodgeball (U4 Sports)"),
    ("hwg5_u01_00_fine", "Fine (U1 Feelings)"),
    ("hwg5_u03_13_cross", "Cross (U3 Colors & Shapes)"),
    # G5 U11 Calendar days
    ("hwg5_u11_12_Sunday", "Sunday (G5 U11 Days)"),
    ("hwg5_u11_13_Monday", "Monday (G5 U11 Days)"),
    ("hwg5_u11_15_Wednesday", "Wednesday (G5 U11 Days)"),
    ("hwg5_u11_18_Saturday", "Saturday (G5 U11 Days)"),
    # G5 U19 Horizontal cards
    ("hwg5_u19_24_convenience_store", "Convenience Store (G5 U19 Town)"),
    ("hwg5_u19_25_amusement_park", "Amusement Park (G5 U19 Town)"),
    # G5 U22 Compound operations
    ("hwg5_u22_00_enjoy_swimming", "Enjoy Swimming (G5 U22 Operations)"),
    ("hwg5_u22_01_enjoy_sports", "Enjoy Sports (G5 U22 Operations)"),
    ("hwg5_u22_02_see_beautiful_flowers", "See Beautiful Flowers (G5 U22 Operations)"),
    ("hwg5_u22_04_eat_delicious_udon", "Eat Delicious Udon (G5 U22 Operations)"),
    ("hwg5_u22_06_visit_an_old_temple", "Visit An Old Temple (G5 U22 Operations)"),
    # Numbers (0 - 200)
    ("hwg5_u25_00_zero", "Zero (G5 U25 Numbers)"),
    ("hwg5_u25_01_one", "One (G5 U25 Numbers)"),
    ("hwg5_u25_21_twenty-one", "Twenty-one (G5 U25 Numbers)"),
    ("hwg5_u25_39_two_hundred", "Two Hundred (G5 U25 Numbers)"),
    # G6 U7 Days & Adverbs
    ("hwg6_u07_04_Sunday", "Sunday (G6 U07 Days)"),
    ("hwg6_u07_11_always", "Always (G6 U07 Adverbs)"),
    # G6 U8 Daily life
    ("hwg6_u08_00_get_up", "Get Up (G6 U08 Daily Life)"),
    ("hwg6_u08_01_eat_breakfast", "Eat Breakfast (G6 U08 Daily Life)"),
    ("hwg6_u08_20_go_to_bed", "Go To Bed (G6 U08 Daily Life)"),
    # G6 U12 Body
    ("hwg6_u12_00_head", "Head (G6 U12 Body)"),
    ("hwg6_u12_01_neck", "Neck (G6 U12 Body)"),
    ("hwg6_u12_10_fur", "Fur (G6 U12 Body)"),
    # G6 U19 Numbers
    ("hwg6_u19_00_zero", "Zero (G6 U19 Numbers)")
]

print("=" * 70)
print("DEEP VERIFICATION OF TARGET PROBLEM CARDS (V2 BOOST AUDIT)")
print("=" * 70)

all_passed = True

for prefix, label in cards_to_check:
    full_path = os.path.join(FULL_DIR, f"{prefix}_full.png")
    illust_path = os.path.join(ILLUST_DIR, f"{prefix}_illust.png")
    text_path = os.path.join(TEXT_DIR, f"{prefix}_text.png")
    
    if not os.path.exists(full_path) or not os.path.exists(illust_path) or not os.path.exists(text_path):
        print(f"\n[FAIL] Missing file for {prefix} ({label})")
        all_passed = False
        continue
    
    full = cv2.imread(full_path)
    illust = cv2.imread(illust_path)
    text = cv2.imread(text_path)
    
    fh, fw = full.shape[:2]
    ih, iw = illust.shape[:2]
    th, tw = text.shape[:2]
    
    # Check minimum dimensions (no collapsed 1px cards)
    if fh < 30 or fw < 50 or ih < 25 or iw < 25 or th < 20 or tw < 40:
        print(f"\n[FAIL] Card collapsed! {prefix} - full:{fw}x{fh}, illust:{iw}x{ih}, text:{tw}x{th}")
        all_passed = False
        continue

    def check_borders(img):
        edges = np.concatenate([img[0, :], img[-1, :], img[:, 0], img[:, -1]])
        is_colored = np.max(np.abs(edges.astype(int) - np.mean(edges, axis=1, keepdims=True)), axis=1) > 15
        colored_cnt = np.sum(is_colored)
        mean_edge_brightness = np.mean(edges)
        return colored_cnt, mean_edge_brightness
        
    full_colored, full_bright = check_borders(full)
    illust_colored, illust_bright = check_borders(illust)
    
    # Check that illust and text contain actual ink (not blank)
    illust_ink = np.sum(np.any(illust < 235, axis=2))
    text_ink = np.sum(np.any(text < 235, axis=2))
    
    status = "PERFECT"
    if illust_ink < 50 or text_ink < 50:
        status = "FAIL (low ink)"
        all_passed = False
    elif full_colored > 0 or illust_colored > 0:
        status = "WARN (edge color)"
        
    print(f"\n[{prefix}] - {label}")
    print(f"  Full Size: {fw}x{fh} | Illust Size: {iw}x{ih} | Text Size: {tw}x{th}")
    print(f"  Colored Edge Pixels (full): {full_colored} (brightness: {full_bright:.1f}/255)")
    print(f"  Colored Edge Pixels (illust): {illust_colored} (brightness: {illust_bright:.1f}/255)")
    print(f"  Illust Ink: {illust_ink} px | Text Ink: {text_ink} px")
    print(f"  Status: {status}")

print("\n" + "=" * 70)
print(f"OVERALL STATUS: {'ALL CHECKS PASSED' if all_passed else 'SOME CHECKS FAILED'}")
print("=" * 70)

