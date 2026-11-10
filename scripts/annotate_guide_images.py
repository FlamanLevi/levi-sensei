import os
from PIL import Image, ImageDraw, ImageFont

BASE_DIR = r"C:\Users\levif\.gemini\antigravity\brain\4fefbcd7-03db-4557-a070-0e3c5c0169af\guide_images"
FONT_PATH_BOLD = r"C:\Windows\Fonts\UDDigiKyokashoN-B.ttc"
FONT_PATH_REG = r"C:\Windows\Fonts\UDDigiKyokashoN-R.ttc"

if not os.path.exists(FONT_PATH_BOLD):
    FONT_PATH_BOLD = r"C:\Windows\Fonts\meiryob.ttc"
if not os.path.exists(FONT_PATH_REG):
    FONT_PATH_REG = r"C:\Windows\Fonts\meiryo.ttc"

def get_font(size, bold=True):
    path = FONT_PATH_BOLD if bold else FONT_PATH_REG
    return ImageFont.truetype(path, size)

def draw_classroom_banner(draw, img_w, step_num, title, subtitle, badge_color="#F59E0B", banner_y=550):
    banner_w = 1460
    banner_h = 135
    bx1 = (img_w - banner_w) // 2
    by1 = banner_y
    bx2 = bx1 + banner_w
    by2 = by1 + banner_h

    # Soft dark drop shadow
    shadow_offset = 8
    draw.rounded_rectangle(
        [bx1 + shadow_offset, by1 + shadow_offset, bx2 + shadow_offset, by2 + shadow_offset],
        radius=26,
        fill=(0, 0, 0, 75)
    )

    # Banner surface
    draw.rounded_rectangle(
        [bx1, by1, bx2, by2],
        radius=26,
        fill="#FFFFFF",
        outline=badge_color,
        width=5
    )

    # Step Pill Badge
    pill_w = 230
    pill_h = 75
    px1 = bx1 + 30
    py1 = by1 + (banner_h - pill_h) // 2
    px2 = px1 + pill_w
    py2 = py1 + pill_h

    draw.rounded_rectangle([px1, py1, px2, py2], radius=20, fill=badge_color)
    f_pill = get_font(34, bold=True)
    draw.text((px1 + 25, py1 + 14), f"ステップ {step_num}", font=f_pill, fill="#FFFFFF")

    # Title & Subtitle text
    f_title = get_font(36, bold=True)
    f_sub = get_font(22, bold=False)

    tx = px2 + 35
    draw.text((tx, by1 + 24), title, font=f_title, fill="#0F172A")
    draw.text((tx, by1 + 78), subtitle, font=f_sub, fill="#475569")

def draw_compact_top_banner(draw, img_w, step_num, title, subtitle, badge_color="#F59E0B"):
    bx1 = 30
    by1 = 12
    bx2 = img_w - 30
    by2 = by1 + 100

    draw.rounded_rectangle([bx1 + 5, by1 + 5, bx2 + 5, by2 + 5], radius=22, fill=(0, 0, 0, 90))
    draw.rounded_rectangle([bx1, by1, bx2, by2], radius=22, fill="#FFFFFF", outline=badge_color, width=4)

    pill_w = 200
    pill_h = 64
    px1 = bx1 + 20
    py1 = by1 + (100 - pill_h) // 2
    px2 = px1 + pill_w
    py2 = py1 + pill_h

    draw.rounded_rectangle([px1, py1, px2, py2], radius=16, fill=badge_color)
    f_pill = get_font(30, bold=True)
    draw.text((px1 + 22, py1 + 12), f"ステップ {step_num}", font=f_pill, fill="#FFFFFF")

    f_title = get_font(32, bold=True)
    f_sub = get_font(19, bold=False)

    tx = px2 + 30
    draw.text((tx, by1 + 14), title, font=f_title, fill="#0F172A")
    draw.text((tx, by1 + 58), subtitle, font=f_sub, fill="#475569")

def draw_highlight_box(draw, coords, color="#EF4444", width=6, radius=18, label=None, label_side="top"):
    x1, y1, x2, y2 = coords
    for w_exp, alpha in [(4, 40), (2, 80)]:
        draw.rounded_rectangle(
            [x1 - w_exp, y1 - w_exp, x2 + w_exp, y2 + w_exp],
            radius=radius + w_exp,
            outline=color,
            width=2
        )
    draw.rounded_rectangle([x1, y1, x2, y2], radius=radius, outline=color, width=width)

    if label:
        f_lbl = get_font(22, bold=True)
        bbox = f_lbl.getbbox(label)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
        lw = tw + 28
        lh = th + 16

        if label_side == "top":
            lx = x1 + 14
            ly = max(10, y1 - lh - 4)
        else: # bottom
            lx = x1 + 14
            ly = y2 + 6

        draw.rounded_rectangle([lx + 3, ly + 3, lx + lw + 3, ly + lh + 3], radius=10, fill=(0, 0, 0, 70))
        draw.rounded_rectangle([lx, ly, lx + lw, ly + lh], radius=10, fill=color)
        draw.text((lx + 14, ly + 6), label, font=f_lbl, fill="#FFFFFF")

def draw_pointer(draw, target_pt, text, dir="bottom", color="#EF4444"):
    f_text = get_font(24, bold=True)
    bbox = f_text.getbbox(text)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    bw = tw + 40
    bh = th + 26

    tx, ty = target_pt

    if dir == "bottom":
        bx1 = tx - bw // 2
        by1 = ty + 18
        bx2 = bx1 + bw
        by2 = by1 + bh
        tri = [(tx, ty + 4), (tx - 16, by1 + 2), (tx + 16, by1 + 2)]
    elif dir == "top":
        bx1 = tx - bw // 2
        by1 = ty - bh - 18
        bx2 = bx1 + bw
        by2 = by1 + bh
        tri = [(tx, ty - 4), (tx - 16, by2 - 2), (tx + 16, by2 - 2)]
    elif dir == "left":
        bx1 = tx - bw - 18
        by1 = ty - bh // 2
        bx2 = bx1 + bw
        by2 = by1 + bh
        tri = [(tx - 4, ty), (bx2 - 2, ty - 16), (bx2 - 2, ty + 16)]
    else:  # right
        bx1 = tx + 18
        by1 = ty - bh // 2
        bx2 = bx1 + bw
        by2 = by1 + bh
        tri = [(tx + 4, ty), (bx1 + 2, ty - 16), (bx1 + 2, ty + 16)]

    # Draw shadow
    draw.polygon([(x + 4, y + 4) for x, y in tri], fill=(0, 0, 0, 70))
    draw.rounded_rectangle([bx1 + 4, by1 + 4, bx2 + 4, by2 + 4], radius=16, fill=(0, 0, 0, 70))

    # Draw pointer body
    draw.polygon(tri, fill=color)
    draw.rounded_rectangle([bx1, by1, bx2, by2], radius=16, fill=color, outline="#FFFFFF", width=3)
    draw.text((bx1 + 20, by1 + 11), text, font=f_text, fill="#FFFFFF")


# =========================================================================
# Step 1: School Secret Word Screen
# =========================================================================
def process_step1():
    im = Image.open(os.path.join(BASE_DIR, "step1_raw.png")).convert("RGBA")
    overlay = Image.new("RGBA", im.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    coords_input = [556, 278, 1172, 392]
    draw_highlight_box(draw, coords_input, color="#2563EB", width=7, radius=22, label="① ここをタップ！", label_side="top")
    draw_pointer(draw, (864, 392), "キーボードで 「ftk」 または 「ふたこ」 と入れよう！", dir="bottom", color="#2563EB")

    draw_classroom_banner(
        draw, im.width,
        step_num="1",
        title="がっこうの「あいことば」を いれよう！",
        subtitle="先生（リヴァイ先生）から教えてもらった合言葉（ftk または ふたこ）を入れよう",
        badge_color="#2563EB",
        banner_y=600
    )

    out = Image.alpha_composite(im, overlay).convert("RGB")
    out.save(os.path.join(BASE_DIR, "step1_annotated.png"), quality=95)
    print("Generated step1_annotated.png")


# =========================================================================
# Step 2: Entering Secret Word
# =========================================================================
def process_step2():
    im = Image.open(os.path.join(BASE_DIR, "step2_raw.png")).convert("RGBA")
    overlay = Image.new("RGBA", im.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    coords_input = [556, 278, 1172, 392]
    draw_highlight_box(draw, coords_input, color="#3B82F6", width=5, radius=22, label="【OK】あいことば入力かんりょう！", label_side="top")

    coords_btn = [556, 408, 1172, 502]
    draw_highlight_box(draw, coords_btn, color="#10B981", width=7, radius=22, label="② ここを押す！", label_side="bottom")
    draw_pointer(draw, (864, 502), "みどりになった「クラスをえらぶ」を タップ！", dir="bottom", color="#059669")

    draw_classroom_banner(
        draw, im.width,
        step_num="2",
        title="「クラスをえらぶ」を押して クラスへ進もう！",
        subtitle="合言葉が合っているとボタンがみどり色に変わるよ。タップして次へ進もう！",
        badge_color="#10B981",
        banner_y=670
    )

    out = Image.alpha_composite(im, overlay).convert("RGB")
    out.save(os.path.join(BASE_DIR, "step2_annotated.png"), quality=95)
    print("Generated step2_annotated.png")


# =========================================================================
# Step 3: Class Selection Grid
# =========================================================================
def process_step3():
    im = Image.open(os.path.join(BASE_DIR, "step3_raw.png")).convert("RGBA")
    overlay = Image.new("RGBA", im.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    # Highlight Grade 2 (2年): x: 306 to 572, y: 190 to 538
    coords_g2 = [306, 190, 572, 538]
    draw_highlight_box(draw, coords_g2, color="#F59E0B", width=7, radius=24, label="★ 2年生はこちら！", label_side="top")

    # Highlight Grade 3 & 4: x: 588 to 1148, y: 190 to 538
    coords_g3_g4 = [588, 190, 1148, 538]
    draw_highlight_box(draw, coords_g3_g4, color="#10B981", width=4, radius=24, label="3年生 & 4年生はこちら！", label_side="top")

    draw_pointer(draw, (440, 538), "じぶんの組（例：2-1 や 2-2）をタップ！", dir="bottom", color="#D97706")

    draw_classroom_banner(
        draw, im.width,
        step_num="3",
        title="じぶんの「学年」と「クラス」を えらぼう！",
        subtitle="2年生はきいろの列（2-1, 2-2, 2-3）、3・4年生はみどりの列をタップしてね",
        badge_color="#F59E0B",
        banner_y=680
    )

    out = Image.alpha_composite(im, overlay).convert("RGB")
    out.save(os.path.join(BASE_DIR, "step3_annotated.png"), quality=95)
    print("Generated step3_annotated.png")


# =========================================================================
# Step 4: Attendance Number Grid
# =========================================================================
def process_step4():
    im = Image.open(os.path.join(BASE_DIR, "step4_raw.png")).convert("RGBA")
    overlay = Image.new("RGBA", im.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    # Seat 2 (Claimed): x: 358 to 600, y: 390 to 480
    coords_seat2 = [358, 390, 600, 480]
    draw_highlight_box(draw, coords_seat2, color="#EF4444", width=5, radius=18, label="【ちゅうい】友だちの登録ずみ", label_side="top")

    # Seat 13 (Unclaimed): x: 105 to 345, y: 600 to 690
    coords_seat13 = [105, 600, 345, 690]
    draw_highlight_box(draw, coords_seat13, color="#8B5CF6", width=6, radius=18, label="★ じぶんの席をタップ！", label_side="top")
    draw_pointer(draw, (225, 690), "例：「13番 空き」をタップ！", dir="bottom", color="#7C3AED")

    draw_classroom_banner(
        draw, im.width,
        step_num="4",
        title="じぶんの「出席番号（空いている席）」を タップ！",
        subtitle="白い「空き」カードが選べる席だよ。すでに友だちの名前がある席は押さないでね",
        badge_color="#8B5CF6",
        banner_y=870
    )

    out = Image.alpha_composite(im, overlay).convert("RGB")
    out.save(os.path.join(BASE_DIR, "step4_annotated.png"), quality=95)
    print("Generated step4_annotated.png")


# =========================================================================
# Step 5: Profile Registration Modal Opened
# =========================================================================
def process_step5():
    im = Image.open(os.path.join(BASE_DIR, "step5_raw.png")).convert("RGBA")
    overlay = Image.new("RGBA", im.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    # 1. Nickname input box on left: x: 105 to 710, y: 330 to 430
    draw_highlight_box(draw, [105, 330, 710, 430], color="#2563EB", width=5, radius=18, label="① なまえ（ニックネーム）", label_side="top")
    draw_pointer(draw, (407, 430), "ひらがな・カタカナ・ローマ字で名前を入れよう！", dir="bottom", color="#2563EB")

    # 2. Avatar categories & grid on top right: x: 745 to 1620, y: 430 to 700
    draw_highlight_box(draw, [745, 430, 1620, 700], color="#F59E0B", width=5, radius=22, label="② すきなアイコンをえらぶ", label_side="top")

    # 3. Secret Charm section on bottom right: x: 745 to 1620, y: 920 to 1184
    draw_highlight_box(draw, [745, 920, 1620, 1184], color="#8B5CF6", width=5, radius=22, label="③ ひみつの合言葉マーク（お守り）", label_side="top")
    draw_pointer(draw, (1180, 920), "自分だけの秘密マーク！忘れないものを1つ選んでね", dir="top", color="#7C3AED")

    draw_compact_top_banner(
        draw, im.width,
        step_num="5",
        title="登録画面が開いたよ！ 3つのステップを順番に設定しよう",
        subtitle="①名前を入力 ➔ ②好きなアイコンを選ぶ ➔ ③自分だけの合言葉マークを選ぶ",
        badge_color="#EC4899"
    )

    out = Image.alpha_composite(im, overlay).convert("RGB")
    out.save(os.path.join(BASE_DIR, "step5_annotated.png"), quality=95)
    print("Generated step5_annotated.png")


# =========================================================================
# Step 6: Registration Modal Fully Configured
# =========================================================================
def process_step6():
    im = Image.open(os.path.join(BASE_DIR, "step6_raw.png")).convert("RGBA")
    overlay = Image.new("RGBA", im.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    # 1. Nickname filled with 'Ken': [105, 330, 710, 430]
    draw_highlight_box(draw, [105, 330, 710, 430], color="#2563EB", width=5, radius=18, label="【OK】名前入力完了（例：Ken）", label_side="top")

    # 2. Chosen avatar 🚀 [1085, 620, 1195, 698]
    draw_highlight_box(draw, [1085, 620, 1195, 698], color="#F59E0B", width=6, radius=16, label="【OK】ロケット選択！", label_side="top")

    # 3. Chosen secret charm 🎮 [754, 1066, 888, 1184]
    draw_highlight_box(draw, [754, 1066, 888, 1184], color="#8B5CF6", width=6, radius=16, label="【OK】ゲーム選択！", label_side="top")

    # 4. Big Green Start button [105, 975, 710, 1115]
    draw_highlight_box(draw, [105, 975, 710, 1115], color="#10B981", width=7, radius=24, label="★ 最後にここをタップ！", label_side="top")
    draw_pointer(draw, (407, 975), "「13番でスタート！」を タップ！", dir="top", color="#059669")

    draw_compact_top_banner(
        draw, im.width,
        step_num="6",
        title="ぜんぶ選べたら「スタート！」ボタンをタップ！",
        subtitle="名前・アイコン・ひみつのマークを確認したら、大きな緑のボタンを押そう",
        badge_color="#10B981"
    )

    out = Image.alpha_composite(im, overlay).convert("RGB")
    out.save(os.path.join(BASE_DIR, "step6_annotated.png"), quality=95)
    print("Generated step6_annotated.png")


# =========================================================================
# Step 7: Completed & Linked Dashboard
# =========================================================================
def process_step7():
    im = Image.open(os.path.join(BASE_DIR, "step7_raw.png")).convert("RGBA")
    overlay = Image.new("RGBA", im.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    # 1. Profile Greeting: [30, 135, 760, 310]
    draw_highlight_box(draw, [30, 135, 760, 310], color="#F59E0B", width=6, radius=22, label="★ じぶんの番号と名前を確認！", label_side="top")

    # 2. Stream B TV Game Card: [30, 382, 560, 738]
    draw_highlight_box(draw, [30, 382, 560, 738], color="#2563EB", width=6, radius=24, label="① テレビのクイズに参加！", label_side="top")
    draw_pointer(draw, (295, 738), "先生のテレビに4桁番号が出たらここを押すよ！", dir="bottom", color="#2563EB")

    # 3. Stamp Card at bottom: [30, 780, 1690, 1120]
    draw_highlight_box(draw, [30, 780, 1690, 1120], color="#10B981", width=5, radius=22, label="② 毎回の英語スタンプカード！", label_side="top")

    draw_compact_top_banner(
        draw, im.width,
        step_num="7",
        title="とうろく完了！ リヴァイ先生の英語ルームへようこそ！",
        subtitle="自分の出席番号がつながったよ！ 次からは自動でこの画面が開きます",
        badge_color="#F59E0B"
    )

    out = Image.alpha_composite(im, overlay).convert("RGB")
    out.save(os.path.join(BASE_DIR, "step7_annotated.png"), quality=95)
    print("Generated step7_annotated.png")

if __name__ == "__main__":
    process_step1()
    process_step2()
    process_step3()
    process_step4()
    process_step5()
    process_step6()
    process_step7()
    print("All 7 steps calibrated and generated successfully!")
