import os
import asyncio
import shutil
import edge_tts

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(CURRENT_DIR) if os.path.basename(CURRENT_DIR) == "scripts" else CURRENT_DIR
OUTPUT_DIR = os.path.join(PROJECT_ROOT, "trimmed_assets", "sound_suite", "common")
PUBLIC_DIR = os.path.join(PROJECT_ROOT, "public", "media", "sound_suite", "common")

os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(PUBLIC_DIR, exist_ok=True)

async def main():
    dest_path = os.path.join(OUTPUT_DIR, "janakute_nanami.mp3")
    public_dest = os.path.join(PUBLIC_DIR, "janakute_nanami.mp3")
    phrase = "じゃなくて？"
    communicate = edge_tts.Communicate(phrase, "ja-JP-NanamiNeural", rate="-2%", pitch="+1Hz")
    await communicate.save(dest_path)
    shutil.copy2(dest_path, public_dest)
    print(f"Created: {dest_path} ({os.path.getsize(dest_path)} bytes)")
    print(f"Synced to: {public_dest}")

if __name__ == "__main__":
    asyncio.run(main())