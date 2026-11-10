import os
import sys
import json
import cv2
import numpy as np

sys.stdout.reconfigure(encoding='utf-8')

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
MASTER_VOCAB_PATH = os.path.join(ROOT_DIR, "public", "data", "master_vocabulary.json")

def resolve_file_on_disk(rel_path):
    if not rel_path:
        return None
    rel_clean = rel_path.lstrip("/").replace("\\", "/")

    # Candidates
    candidates = []
    if rel_clean.startswith("cards/"):
        sub = rel_clean[6:]
        candidates.append(os.path.join(ROOT_DIR, "trimmed_assets", "cards", sub))
        candidates.append(os.path.join(ROOT_DIR, "manabi_assets", "cards", sub))
    elif rel_clean.startswith("media/images/"):
        sub = rel_clean[13:]
        candidates.append(os.path.join(ROOT_DIR, "trimmed_assets", "letstry_images", sub))
    else:
        candidates.append(os.path.join(ROOT_DIR, "trimmed_assets", "cards", rel_clean))
        candidates.append(os.path.join(ROOT_DIR, "trimmed_assets", "letstry_images", rel_clean))
        candidates.append(os.path.join(ROOT_DIR, "public", rel_clean))

    for c in candidates:
        if os.path.exists(c):
            return c
        # Try alternate extensions (.webp, .png, .svg)
        base, _ = os.path.splitext(c)
        for ext in [".webp", ".png", ".svg", ".jpg"]:
            if os.path.exists(base + ext):
                return base + ext
    return None


def check_image_health(img_path):
    issues = []
    if not img_path or not os.path.exists(img_path):
        return ["FILE_NOT_FOUND"]

    if img_path.endswith(".svg"):
        sz = os.path.getsize(img_path)
        if sz < 100:
            issues.append(f"TINY_SVG_FILE ({sz} bytes)")
        return issues

    raw = np.fromfile(img_path, dtype=np.uint8)
    im = cv2.imdecode(raw, cv2.IMREAD_UNCHANGED)
    if im is None:
        return ["CORRUPTED_OR_UNREADABLE"]

    h, w = im.shape[:2]
    if h < 40 or w < 40:
        issues.append(f"TINY_DIMENSIONS ({w}x{h})")

    aspect = w / max(1.0, float(h))
    if aspect > 4.5 or aspect < 0.22:
        issues.append(f"EXTREME_ASPECT_RATIO ({aspect:.2f})")

    # Check for blank / near-blank image
    if im.ndim == 3 and im.shape[2] == 4:
        alpha = im[:, :, 3]
        if np.all(alpha == 0):
            issues.append("COMPLETELY_TRANSPARENT_IMAGE")
        bgr = im[:, :, :3]
    elif im.ndim == 3:
        bgr = im
    else:
        bgr = cv2.cvtColor(im, cv2.COLOR_GRAY2BGR)

    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    if np.all(gray >= 253):
        issues.append("COMPLETELY_BLANK_WHITE")
    elif np.all(gray <= 5):
        issues.append("COMPLETELY_BLACK")

    # Check for severe border line bleeding (e.g. outer single pixel row is dark line from adjacent card)
    top_dark = np.mean(gray[0, :] < 100) > 0.40
    bot_dark = np.mean(gray[-1, :] < 100) > 0.40
    left_dark = np.mean(gray[:, 0] < 100) > 0.40
    right_dark = np.mean(gray[:, -1] < 100) > 0.40
    if top_dark or bot_dark or left_dark or right_dark:
        issues.append(f"BORDER_BLEED_ARTIFACT (top={top_dark}, bot={bot_dark}, L={left_dark}, R={right_dark})")

    return issues


def main():
    print("=" * 90)
    print("🔍 AUDITING PICTURE DICTIONARY VOCABULARY ASSETS (GRADES 3 - 6)")
    print("=" * 90)

    with open(MASTER_VOCAB_PATH, "r", encoding="utf-8") as f:
        vocab = json.load(f)

    grades_to_check = ["ES_G6", "ES_G5", "ES_G4", "ES_G3"]
    results = {g: {"total": 0, "ok": 0, "missing": [], "anomalies": []} for g in grades_to_check}

    for item in vocab:
        en = item.get("english", "")
        mbg = item.get("media_by_grade", {})

        for g in grades_to_check:
            if g in mbg and isinstance(mbg[g], dict):
                gm = mbg[g]
                card_img = gm.get("card_image")
                results[g]["total"] += 1

                if not card_img:
                    results[g]["missing"].append({
                        "id": item.get("id"),
                        "english": en,
                        "reason": "NO_CARD_IMAGE_DEFINED"
                    })
                    continue

                disk_path = resolve_file_on_disk(card_img)
                if not disk_path:
                    results[g]["missing"].append({
                        "id": item.get("id"),
                        "english": en,
                        "card_image": card_img,
                        "reason": "FILE_NOT_FOUND_ON_DISK"
                    })
                    continue

                issues = check_image_health(disk_path)
                if issues:
                    results[g]["anomalies"].append({
                        "id": item.get("id"),
                        "english": en,
                        "card_image": card_img,
                        "disk_path": disk_path,
                        "issues": issues
                    })
                else:
                    results[g]["ok"] += 1

    print("\n📊 AUDIT SUMMARY:")
    for g in grades_to_check:
        r = results[g]
        print(f"\n[{g}] Total Words: {r['total']:3d} | OK: {r['ok']:3d} | Missing: {len(r['missing']):2d} | Anomalies: {len(r['anomalies']):2d}")
        if r["missing"]:
            print(f"  ❌ Missing Images ({len(r['missing'])}):")
            for m in r["missing"][:10]:
                print(f"     • {m['english']} ({m['id']}) -> {m.get('card_image', 'NONE')} [{m['reason']}]")
            if len(r["missing"]) > 10:
                print(f"     ... and {len(r['missing']) - 10} more.")

        if r["anomalies"]:
            print(f"  ⚠️ Anomalies & Strange Crops ({len(r['anomalies'])}):")
            for a in r["anomalies"][:10]:
                print(f"     • {a['english']} ({a['id']}) -> {a['issues']}")
            if len(r["anomalies"]) > 10:
                print(f"     ... and {len(r['anomalies']) - 10} more.")

    out_file = os.path.join(os.path.dirname(__file__), "dictionary_asset_audit_report.json")
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    print(f"\n💾 Full audit report written to: {out_file}")


if __name__ == "__main__":
    main()
