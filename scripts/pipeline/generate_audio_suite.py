import os
import json
import asyncio
import edge_tts

VOCAB_JSON_PATH = "public/data/master_vocabulary.json"

# Base directory for the new multi-voice suite
BASE_SOUND_DIR = "trimmed_assets/sound_suite"

# The 3:1 Voice Archetypes
VOICES = {
    "jenny":  {"voice": "en-US-JennyNeural",               "rate": "-8%", "pitch": "+0Hz"},
    "andrew": {"voice": "en-US-AndrewMultilingualNeural",   "rate": "-8%", "pitch": "+0Hz"},
    "ana":    {"voice": "en-US-AnaNeural",                  "rate": "-6%", "pitch": "+2Hz"},
    "nanami": {"voice": "ja-JP-NanamiNeural",               "rate": "-4%", "pitch": "+0Hz"}
}

async def synthesize_clip(text: str, voice_cfg: dict, output_path: str):
    # Strip hyphens, underscores, slashes so TTS never says "hyphen" or pauses awkwardly
    clean_text = text.replace("-", " ").replace("_", " ").replace("/", " ").strip()
    communicate = edge_tts.Communicate(
        clean_text, 
        voice_cfg["voice"], 
        rate=voice_cfg["rate"], 
        pitch=voice_cfg["pitch"]
    )
    await communicate.save(output_path)

async def process_word(item: dict, semaphore: asyncio.Semaphore, stats: dict):
    word_id = item.get("id", "word")
    english = item.get("english", "").strip()
    ja_text = item.get("ja_kanji") or item.get("ja_hiragana") or ""

    if not english:
        return

    grades = item.get("grades", [])
    is_upper = any(g in ["ES_G5", "ES_G6", "JHS_G1"] for g in grades)
    grade_folder = "hwg" if is_upper else "letstry"
    word_dir = os.path.join(BASE_SOUND_DIR, grade_folder, word_id)
    os.makedirs(word_dir, exist_ok=True)

    # Clean safe name for filenames
    safe_en = "".join(c for c in english.lower().replace(" ", "_") if c.isalnum() or c == "_")

    # Initialize audio_suite structure if not present
    if "audio_suite" not in item:
        item["audio_suite"] = {}

    tasks = []

    # 1. English Voices: Jenny, Andrew, Ana
    for v_key in ["jenny", "andrew", "ana"]:
        filename = f"{grade_folder}_{word_id}_{safe_en}_{v_key}.mp3"
        dest_path = os.path.join(word_dir, filename)
        rel_path = f"sound_suite/{grade_folder}/{word_id}/{filename}"
        item["audio_suite"][v_key] = rel_path

        if not os.path.exists(dest_path):
            async def run_en(tk=english, cfg=VOICES[v_key], dp=dest_path):
                async with semaphore:
                    try:
                        await synthesize_clip(tk, cfg, dp)
                        stats["generated"] += 1
                    except Exception as e:
                        print(f"Error on {v_key} for '{tk}': {e}")
            tasks.append(run_en())

    # 2. Japanese Voice: Nanami (NHK clean mora)
    if ja_text:
        ja_filename = f"{grade_folder}_{word_id}_{safe_en}_nanami.mp3"
        ja_dest_path = os.path.join(word_dir, ja_filename)
        ja_rel_path = f"sound_suite/{grade_folder}/{word_id}/{ja_filename}"
        item["audio_suite"]["ja"] = ja_rel_path

        if not os.path.exists(ja_dest_path):
            async def run_ja(tk=ja_text, cfg=VOICES["nanami"], dp=ja_dest_path):
                async with semaphore:
                    try:
                        await synthesize_clip(tk, cfg, dp)
                        stats["generated"] += 1
                    except Exception as e:
                        print(f"Error on Nanami for '{tk}': {e}")
            tasks.append(run_ja())

    # Maintain backward compatibility with existing single-audio fields
    item["primary_audio"] = item["audio_suite"]["jenny"]
    item["sound_file"] = item["audio_suite"]["jenny"]

    if tasks:
        await asyncio.gather(*tasks)

async def main():
    if not os.path.exists(VOCAB_JSON_PATH):
        print(f"Error: {VOCAB_JSON_PATH} not found.")
        return

    with open(VOCAB_JSON_PATH, "r", encoding="utf-8-sig") as f:
        vocab = json.load(f)

    total_words = len(vocab)
    print(f"Loaded {total_words} vocabulary words.")
    print("Synthesizing 3:1 Audio Suite: [Jenny, Andrew, Ana] + [Nanami]...\n")

    # Limit to 8 concurrent network requests to avoid throttling
    semaphore = asyncio.Semaphore(8)
    stats = {"generated": 0}

    # Batch process
    batch_size = 25
    for i in range(0, total_words, batch_size):
        batch = vocab[i:i + batch_size]
        await asyncio.gather(*(process_word(item, semaphore, stats) for item in batch))
        pct = round(min(100, ((i + batch_size) / total_words) * 100))
        print(f"  Processed {min(i + batch_size, total_words)}/{total_words} words ({pct}%) | New clips: {stats['generated']}")

    # Save enriched master JSON
    with open(VOCAB_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(vocab, f, ensure_ascii=False, indent=2)

    print(f"\nDone! Synthesized {stats['generated']} studio-quality MP3 clips.")
    print(f"Master vocabulary data saved to {VOCAB_JSON_PATH}.")

if __name__ == "__main__":
    asyncio.run(main())