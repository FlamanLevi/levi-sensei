import os
import json
import asyncio
import edge_tts

VOCAB_JSON_PATH = "public/data/master_vocabulary.json"
BASE_SOUND_DIR = "trimmed_assets/sound_suite"

VOICES = {
    "jenny":  {"voice": "en-US-JennyNeural",             "rate": "-8%", "pitch": "+0Hz"},
    "andrew": {"voice": "en-US-AndrewMultilingualNeural", "rate": "-8%", "pitch": "+0Hz"},
    "ana":    {"voice": "en-US-AnaNeural",                "rate": "-6%", "pitch": "+2Hz"},
    "nanami": {"voice": "ja-JP-NanamiNeural",             "rate": "-4%", "pitch": "+0Hz"}
}

async def synthesize_with_retry(text: str, voice_cfg: dict, output_path: str, max_retries: int = 3):
    clean_text = text.replace("-", " ").replace("_", " ").replace("/", " ").strip()
    
    for attempt in range(1, max_retries + 1):
        try:
            # If a 0-byte ghost file exists, remove it first
            if os.path.exists(output_path) and os.path.getsize(output_path) == 0:
                os.remove(output_path)

            communicate = edge_tts.Communicate(
                clean_text, 
                voice_cfg["voice"], 
                rate=voice_cfg["rate"], 
                pitch=voice_cfg["pitch"]
            )
            await communicate.save(output_path)

            # Confirm file has actual audio content
            if os.path.exists(output_path) and os.path.getsize(output_path) > 1000:
                return True
        except Exception as e:
            if attempt == max_retries:
                print(f"  ❌ Permanently failed: '{text}' ({voice_cfg['voice']}) -> {e}")
                return False
            await asyncio.sleep(1.5 * attempt)

def is_valid_audio_file(path: str) -> bool:
    # A real spoken word MP3 is always larger than 1.5 KB (1500 bytes)
    return os.path.exists(path) and os.path.getsize(path) > 1500

async def main():
    if not os.path.exists(VOCAB_JSON_PATH):
        print(f"Error: {VOCAB_JSON_PATH} not found.")
        return

    with open(VOCAB_JSON_PATH, "r", encoding="utf-8-sig") as f:
        vocab = json.load(f)

    missing_tasks = []
    total_expected = 0
    zero_byte_count = 0

    print("Auditing audio library for missing or 0-byte ghost files...")

    for item in vocab:
        word_id = item.get("id", "word")
        english = item.get("english", "").strip()
        ja_text = item.get("ja_kanji") or item.get("ja_hiragana") or ""

        if not english:
            continue

        grades = item.get("grades", [])
        is_upper = any(g in ["ES_G5", "ES_G6", "JHS_G1"] for g in grades)
        grade_folder = "hwg" if is_upper else "letstry"
        word_dir = os.path.join(BASE_SOUND_DIR, grade_folder, word_id)
        os.makedirs(word_dir, exist_ok=True)

        safe_en = "".join(c for c in english.lower().replace(" ", "_") if c.isalnum() or c == "_")

        # Check 3 English voices
        for v_key in ["jenny", "andrew", "ana"]:
            total_expected += 1
            filename = f"{grade_folder}_{word_id}_{safe_en}_{v_key}.mp3"
            dest_path = os.path.join(word_dir, filename)

            if not is_valid_audio_file(dest_path):
                if os.path.exists(dest_path):
                    zero_byte_count += 1
                missing_tasks.append((english, VOICES[v_key], dest_path, v_key))

        # Check Japanese voice
        if ja_text:
            total_expected += 1
            ja_filename = f"{grade_folder}_{word_id}_{safe_en}_nanami.mp3"
            ja_dest_path = os.path.join(word_dir, ja_filename)

            if not is_valid_audio_file(ja_dest_path):
                if os.path.exists(ja_dest_path):
                    zero_byte_count += 1
                missing_tasks.append((ja_text, VOICES["nanami"], ja_dest_path, "nanami"))

    missing_count = len(missing_tasks)
    healthy_files = total_expected - missing_count

    print(f"  Total expected files: {total_expected}")
    print(f"  Healthy audio files:  {healthy_files}")
    print(f"  Empty (0-byte) files: {zero_byte_count}")
    print(f"  Total to repair:      {missing_count}\n")

    if missing_count == 0:
        print("🎉 All 3,428 files are 100% healthy and verified!")
        return

    # Gentle 2-connection limit with automatic retries
    semaphore = asyncio.Semaphore(2)
    repaired = 0

    async def worker(task_item):
        nonlocal repaired
        text, cfg, path, voice_name = task_item
        async with semaphore:
            success = await synthesize_with_retry(text, cfg, path)
            if success:
                repaired += 1
                print(f"  ✓ Fixed ({repaired}/{missing_count}): [{voice_name}] '{text}' ({os.path.getsize(path)} bytes)")

    await asyncio.gather(*(worker(t) for t in missing_tasks))

    print(f"\nRepair complete! Successfully verified and saved {repaired}/{missing_count} clips.")

if __name__ == "__main__":
    asyncio.run(main())