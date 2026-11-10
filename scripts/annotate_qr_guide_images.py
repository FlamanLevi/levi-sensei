import os
import sys
from PIL import Image, ImageDraw, ImageFont
import numpy as np

BASE_DIR = r"C:\Users\levif\.gemini\antigravity\brain\4fefbcd7-03db-4557-a070-0e3c5c0169af\qr_guide_images"
FONT_PATH_BOLD = r"C:\Windows\Fonts\UDDigiKyokashoN-B.ttc"
FONT_PATH_REG = r"C:\Windows\Fonts\UDDigiKyokashoN-R.ttc"

if not os.path.exists(FONT_PATH_BOLD):
    FONT_PATH_BOLD = r"C:\Windows\Fonts\meiryob.ttc"
if not os.path.exists(FONT_PATH_REG):
    FONT_PATH_REG = r"C:\Windows\Fonts\meiryo.ttc"

def get_font(size, bold=True):
    path = FONT_PATH_BOLD if bold else FONT_PATH_REG
    return ImageFont.truetype(path, size)

def draw_top_classroom_banner(draw, img_w, step_num, title, subtitle, badge_color="#F59E0B", banner_y=16):
    banner_w = img_w - 48
    banner_h = 115
    bx1 = 24
    by1 = banner_y
    bx2 = bx1 + banner_w
    by2 = by1 + banner_h

    # Shadow
    draw.rounded_rectangle([bx1 + 6, by1 + 6, bx2 + 6, by2 + 6], radius=24, fill=(0, 0, 0, 90))
    # Surface
    draw.rounded_rectangle([bx1, by1, bx2, by2], radius=24, fill="#FFFFFF", outline=badge_color, width=5)

    # Step Pill Badge
    pill_w = 210
    pill_h = 75
    px1 = bx1 + 24
    py1 = by1 + (banner_h - pill_h) // 2
    px2 = px1 + pill_w
    py2 = py1 + pill_h

    draw.rounded_rectangle([px1, py1, px2, py2], radius=18, fill=badge_color)
    f_pill = get_font(32, bold=True)
    draw.text((px1 + 22, py1 + 14), f"ステップ {step_num}", font=f_pill, fill="#FFFFFF")

    # Title & Subtitle text
    f_title = get_font(34, bold=True)
    f_sub = get_font(21, bold=False)

    tx = px2 + 28
    draw.text((tx, by1 + 18), title, font=f_title, fill="#0F172A")
    draw.text((tx, by1 + 68), subtitle, font=f_sub, fill="#475569")

def draw_bottom_classroom_banner(draw, img_w, img_h, step_num, title, subtitle, badge_color="#F59E0B"):
    banner_w = img_w - 48
    banner_h = 120
    bx1 = 24
    by1 = img_h - banner_h - 20
    bx2 = bx1 + banner_w
    by2 = by1 + banner_h

    draw.rounded_rectangle([bx1 + 6, by1 + 6, bx2 + 6, by2 + 6], radius=24, fill=(0, 0, 0, 90))
    draw.rounded_rectangle([bx1, by1, bx2, by2], radius=24, fill="#FFFFFF", outline=badge_color, width=5)

    pill_w = 210
    pill_h = 75
    px1 = bx1 + 24
    py1 = by1 + (banner_h - pill_h) // 2
    px2 = px1 + pill_w
    py2 = py1 + pill_h

    draw.rounded_rectangle([px1, py1, px2, py2], radius=18, fill=badge_color)
    f_pill = get_font(32, bold=True)
    draw.text((px1 + 22, py1 + 14), f"ステップ {step_num}", font=f_pill, fill="#FFFFFF")

    f_title = get_font(34, bold=True)
    f_sub = get_font(21, bold=False)

    tx = px2 + 28
    draw.text((tx, by1 + 20), title, font=f_title, fill="#0F172A")
    draw.text((tx, by1 + 70), subtitle, font=f_sub, fill="#475569")

def draw_highlight_box(draw, coords, color="#F59E0B", line_width=6, radius=20):
    x1, y1, x2, y2 = coords
    draw.rounded_rectangle([x1, y1, x2, y2], radius=radius, outline=color, width=line_width)

def draw_label_badge(draw, x, y, text, bg_color="#F59E0B", text_color="#FFFFFF", font_size=24, radius=14):
    f = get_font(font_size, bold=True)
    bbox = f.getbbox(text)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    pad_x = 18
    pad_y = 10
    x2 = x + tw + pad_x * 2
    y2 = y + th + pad_y * 2
    # Shadow
    draw.rounded_rectangle([x + 3, y + 3, x2 + 3, y2 + 3], radius=radius, fill=(0, 0, 0, 80))
    # Badge
    draw.rounded_rectangle([x, y, x2, y2], radius=radius, fill=bg_color)
    draw.text((x + pad_x, y + pad_y - 2), text, font=f, fill=text_color)
    return (x, y, x2, y2)

def draw_curved_arrow_down(draw, start_pt, end_pt, color="#F59E0B", width=6):
    sx, sy = start_pt
    ex, ey = end_pt
    draw.line([sx, sy, ex, ey], fill=color, width=width)
    arrow_size = 20
    draw.polygon([
        (ex, ey),
        (ex - arrow_size * 0.7, ey - arrow_size),
        (ex + arrow_size * 0.7, ey - arrow_size)
    ], fill=color)

def draw_curved_arrow_up(draw, start_pt, end_pt, color="#F59E0B", width=6):
    sx, sy = start_pt
    ex, ey = end_pt
    draw.line([sx, sy, ex, ey], fill=color, width=width)
    arrow_size = 20
    draw.polygon([
        (ex, ey),
        (ex - arrow_size * 0.7, ey + arrow_size),
        (ex + arrow_size * 0.7, ey + arrow_size)
    ], fill=color)

def annotate_step1(raw_path, out_path):
    im = Image.open(raw_path).convert("RGBA")
    w, h = im.size
    draw = ImageDraw.Draw(im)

    # Step 1: Front TV Quiz Lobby
    # Giant QR Code is located on the left side: approx x: 180-570, y: 220-720
    qr_box = [190, 240, 560, 680]
    draw_highlight_box(draw, qr_box, color="#F59E0B", line_width=8, radius=28)
    draw_label_badge(draw, 190, 185, "★ iPadのカメラをここに向けてね！", bg_color="#F59E0B", text_color="#FFFFFF", font_size=24)

    # Room code badge on right
    draw_label_badge(draw, 620, 240, "4桁の番号（合言葉）: 2048", bg_color="#3B82F6", text_color="#FFFFFF", font_size=22)

    draw_top_classroom_banner(
        draw, w, 1,
        "【テレビ画面】 前のテレビのQRコードを見よう！",
        "先生がクイズを開くと、テレビに大きなQRコードと4桁の番号が表示されます。",
        badge_color="#3B82F6",
        banner_y=16
    )

    im.convert("RGB").save(out_path, quality=95)
    print(f"Annotated Step 1 saved: {out_path}")

def annotate_step2(raw_path, out_path):
    im = Image.open(raw_path).convert("RGBA")
    w, h = im.size
    draw = ImageDraw.Draw(im)

    # Step 2: iPad Camera Viewfinder scanning QR
    # Top yellow notification banner: approx x: 500-1200, y: 15-95 (scaled to 1728) or centered
    # Let's highlight the yellow Safari banner
    banner_box = [w // 2 - 380, 25, w // 2 + 380, 115]
    draw_highlight_box(draw, banner_box, color="#10B981", line_width=7, radius=24)
    draw_label_badge(draw, w // 2 - 250, 125, "★ この黄色いリンクを1回タップ！", bg_color="#10B981", text_color="#FFFFFF", font_size=26)

    # Target reticle center
    draw_label_badge(draw, w // 2 - 240, h // 2 + 180, "QRコードを枠の中におさめてね", bg_color="#0F172A", text_color="#F59E0B", font_size=22)

    draw_bottom_classroom_banner(
        draw, w, h, 2,
        "iPadのカメラをテレビのQRコードに向けよう！",
        "カメラを向けると画面の上に「Safariで開く」案内が出ます。タップすると一瞬で参加画面へ！",
        badge_color="#10B981"
    )

    im.convert("RGB").save(out_path, quality=95)
    print(f"Annotated Step 2 saved: {out_path}")

def annotate_step3(raw_path, out_path):
    im = Image.open(raw_path).convert("RGBA")
    w, h = im.size
    draw = ImageDraw.Draw(im)

    # Step 3: Quick Join Screen
    # PIN is already entered in input.
    # Highlight Attendance tab in the 3-tab group
    draw_top_classroom_banner(
        draw, w, 3,
        "へやの番号は自動入力！「しゅっせき番号」をタップ！",
        "QRコードから開くと部屋番号はすでに入っています。なまえの「しゅっせき番号」を押そう！",
        badge_color="#8B5CF6",
        banner_y=16
    )

    im.convert("RGB").save(out_path, quality=95)
    print(f"Annotated Step 3 saved: {out_path}")

def annotate_step4(raw_path, out_path):
    im = Image.open(raw_path).convert("RGBA")
    w, h = im.size
    draw = ImageDraw.Draw(im)

    # Step 4: Number 14 Selected and Join button
    draw_top_classroom_banner(
        draw, w, 4,
        "じぶんの番号（例: 14番）を押して「参加する」！",
        "iPadケースのシールと同じ出席番号を1回タップして、下の紫のボタンを押そう！",
        badge_color="#EC4899",
        banner_y=16
    )

    im.convert("RGB").save(out_path, quality=95)
    print(f"Annotated Step 4 saved: {out_path}")

def annotate_step5(raw_path, out_path):
    im = Image.open(raw_path).convert("RGBA")
    w, h = im.size
    draw = ImageDraw.Draw(im)

    # Step 5: Active Quiz Gameplay
    draw_top_classroom_banner(
        draw, w, 5,
        "もんだいが出たら、正しいカードをすばやくタップ！",
        "テレビやiPadに出る英語（例: apple）を見て、4つのカードから正解を選ぼう！",
        badge_color="#F59E0B",
        banner_y=16
    )

    im.convert("RGB").save(out_path, quality=95)
    print(f"Annotated Step 5 saved: {out_path}")

def annotate_step6(raw_path, out_path):
    im = Image.open(raw_path).convert("RGBA")
    w, h = im.size
    draw = ImageDraw.Draw(im)

    # Step 6: Game Over Celebration & Save Score to this iPad
    draw_top_classroom_banner(
        draw, w, 6,
        "ゲーム終了！ iPadケースの出席番号を押してセーブ！",
        "スコアが出たら、下の「スコアをこのiPadに保存しよう！」でじぶんの番号を押して連携完了！",
        badge_color="#10B981",
        banner_y=16
    )

    im.convert("RGB").save(out_path, quality=95)
    print(f"Annotated Step 6 saved: {out_path}")

def annotate_step7(raw_path, out_path):
    im = Image.open(raw_path).convert("RGBA")
    w, h = im.size
    draw = ImageDraw.Draw(im)

    # Step 7: Tailor Profile (Nickname, Avatar, Charm)
    draw_top_classroom_banner(
        draw, w, 7,
        "じぶんだけのニックネーム・アイコン・秘密マークを決定！",
        "クイズの後はマイページでプロフィールを自由に変更！次回のクイズもこの設定で遊べるよ！",
        badge_color="#6366F1",
        banner_y=16
    )

    im.convert("RGB").save(out_path, quality=95)
    print(f"Annotated Step 7 saved: {out_path}")

def main():
    os.makedirs(BASE_DIR, exist_ok=True)
    steps = [
        (1, annotate_step1),
        (2, annotate_step2),
        (3, annotate_step3),
        (4, annotate_step4),
        (5, annotate_step5),
        (6, annotate_step6),
        (7, annotate_step7),
    ]

    for step_num, annot_fn in steps:
        raw_p = os.path.join(BASE_DIR, f"step{step_num}_raw.png")
        out_p = os.path.join(BASE_DIR, f"step{step_num}_annotated.png")
        if os.path.exists(raw_p):
            try:
                annot_fn(raw_p, out_p)
            except Exception as e:
                print(f"Error annotating step {step_num}: {e}")
        else:
            print(f"Waiting for {raw_p}...")

if __name__ == "__main__":
    main()
