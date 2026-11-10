import os
import json
import asyncio
import edge_tts

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(CURRENT_DIR) if os.path.basename(CURRENT_DIR) == "scripts" else CURRENT_DIR

VOCAB_JSON_PATH = os.path.join(PROJECT_ROOT, "public", "data", "master_vocabulary.json")
OUTPUT_DIR = os.path.join(PROJECT_ROOT, "trimmed_assets", "sound_suite", "janakute")

LOANWORDS_TXT_PATH = os.path.join(PROJECT_ROOT, "scripts", "loanwords.txt")
if not os.path.exists(LOANWORDS_TXT_PATH):
    LOANWORDS_TXT_PATH = os.path.join(PROJECT_ROOT, "loanwords.txt")

VOICE = "ja-JP-NanamiNeural"

os.makedirs(OUTPUT_DIR, exist_ok=True)

def load_loanwords_dictionary(filepath: str) -> dict[str, str]:
    if not os.path.exists(filepath):
        print(f"Error: Could not find loanwords.txt at {filepath}")
        return {}

    mapping = {}
    with open(filepath, "r", encoding="utf-8-sig") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if ":" in line:
                parts = line.split(":", 1)
                en = parts[0].strip().lower()
                ja = parts[1].strip()
                if en and ja:
                    mapping[en] = ja

    return mapping

async def synthesize_janakute_clip(katakana_text: str, output_path: str, max_retries: int = 3) -> bool:
    clean_text = katakana_text.replace("-", " ").replace("_", " ").strip()
    
    # 1. Single space gives a natural ~70ms mora transition boundary (not rushed, not dragging)
    # 2. NO punctuation at the end: Te-form naturally rises (じゃなくて⤴) without sentence-end hold
    # 3. rate="+0%": Natural, unhurried conversational cadence
    full_phrase = f"{clean_text} じゃなくて"

    for attempt in range(1, max_retries + 1):
        try:
            if os.path.exists(output_path):
                os.remove(output_path)

            communicate = edge_tts.Communicate(
                full_phrase,
                VOICE,
                rate="+0%",
                pitch="+0Hz"
            )
            await communicate.save(output_path)

            if os.path.exists(output_path) and os.path.getsize(output_path) > 1000:
                return True
        except Exception as e:
            if attempt == max_retries:
                print(f"  ❌ Failed on '{katakana_text}': {e}")
                return False
            await asyncio.sleep(1.0 * attempt)
    return False

async def main():
    print("=" * 70)
    print("CALIBRATING: NATURAL-CADENCE '〜 じゃなくて' CLIPS")
    print("=" * 70)

    loanwords_map = load_loanwords_dictionary(LOANWORDS_TXT_PATH)
    if not loanwords_map:
        return

    if not os.path.exists(VOCAB_JSON_PATH):
        print(f"Error: {VOCAB_JSON_PATH} not found.")
        return

    with open(VOCAB_JSON_PATH, "r", encoding="utf-8-sig") as f:
        vocab = json.load(f)

    matched_targets = []
    seen_ids = set()

    for item in vocab:
        word_id = item.get("id", "")
        english = item.get("english", "").strip().lower()

        if word_id in seen_ids or not english:
            continue

        if english in loanwords_map:
            seen_ids.add(word_id)
            katakana_word = loanwords_map[english]
            matched_targets.append((item, katakana_word))

    total_targets = len(matched_targets)
    print(f"Re-synthesizing {total_targets} clips with natural spacing ('{LOANWORDS_TXT_PATH}')...\n")

    semaphore = asyncio.Semaphore(2)
    count = 0

    async def worker(item, katakana_word):
        nonlocal count
        word_id = item.get("id", "word")
        english = item.get("english", "").strip()
        safe_name = "".join(c for c in english.lower().replace(" ", "_") if c.isalnum() or c == "_")
        filename = f"janakute_{word_id}_{safe_name}.mp3"
        dest_path = os.path.join(OUTPUT_DIR, filename)

        async with semaphore:
            success = await synthesize_janakute_clip(katakana_word, dest_path)
            if success:
                count += 1
                bytes_size = os.path.getsize(dest_path)
                print(f"  ✓ [{count}/{total_targets}] '{katakana_word} じゃなくて' -> {english} ({bytes_size} bytes)")

        if "audio_suite" not in item:
            item["audio_suite"] = {}
        item["audio_suite"]["janakute"] = f"sound_suite/janakute/{filename}"
        item["is_katakana_loanword"] = True

    # Cleaned up gathering loop
    await asyncio.gather(*(worker(item, kw) for item, kw in matched_targets))

    with open(VOCAB_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(vocab, f, ensure_ascii=False, indent=2)

    print("\n" + "=" * 70)
    print(f"DONE! Re-calibrated {count} natural-cadence audio clips.")
    print("=" * 70)

if __name__ == "__main__":
    asyncio.run(main())