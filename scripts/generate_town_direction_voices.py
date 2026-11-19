#!/usr/bin/env python3
"""
Generates Azure Neural TTS MP3 phrase packs for 3D Town Navigator (Stream A & Stream B)
across all available US (en-US) and Canadian (en-CA) Neural voices using edge-tts.

Output:
  public/media/town_directions/{voiceId}/{phraseKey}.mp3
  public/media/town_directions/manifest.json
"""

import asyncio
import json
import os
from pathlib import Path
import edge_tts

OUT_DIR = Path("public/media/town_directions")

# Every Tier 1, 2, 3 named facility in 3D Town Navigator
BUILDINGS = {
    "CONVENIENCE_STORE": "Convenience Store",
    "POST_OFFICE": "Post Office",
    "BOOKSTORE": "Bookstore",
    "FLOWER_SHOP": "Flower Shop",
    "RESTAURANT": "Restaurant",
    "BUS_STOP": "Bus Stop",
    "POLICE_BOX": "Police Box",
    "SCHOOL": "Elementary School",
    "JUNIOR_HIGH_SCHOOL": "Junior High School",
    "DEPARTMENT_STORE": "Department Store",
    "SWIMMING_POOL": "Swimming Pool",
    "HOSPITAL": "Hospital",
    "FIRE_STATION": "Fire Station",
    "POLICE_STATION": "Police Station",
    "STATION": "Train Station",
    "SUPERMARKET": "Supermarket",
    "CITY_HALL": "City Hall",
    "LIBRARY": "Library",
    "PARK": "Park",
    "GYM": "Gym",
    "MUSEUM": "Museum",
    "TEMPLE": "Temple",
    "SHRINE": "Shrine",
    "GARDEN": "Japanese Garden",
    "STADIUM": "Stadium",
    "CASTLE": "Castle",
    "AMUSEMENT_PARK": "Amusement Park",
    "AQUARIUM": "Aquarium",
    "ZOO": "Zoo",
}

BLOCKS = {
    1: "one block",
    2: "two blocks",
    3: "three blocks",
    4: "four blocks",
}


def build_phrase_map() -> dict[str, str]:
    phrases: dict[str, str] = {}

    for bid, name in BUILDINGS.items():
        phrases[f"start_{bid}"] = f"Start at the {name}."

    for n, word in BLOCKS.items():
        phrases[f"straight_{n}"] = f"Go straight for {word}."
        phrases[f"turn_around_straight_{n}"] = f"Turn around and go straight for {word}."
        phrases[f"turn_left_straight_{n}"] = f"Turn left and go straight for {word}."
        phrases[f"turn_right_straight_{n}"] = f"Turn right and go straight for {word}."
        phrases[f"corner_left_straight_{n}"] = f"Turn left at the corner and go straight for {word}."
        phrases[f"corner_right_straight_{n}"] = f"Turn right at the corner and go straight for {word}."

    phrases["corner_left"] = "Turn left at the corner."
    phrases["corner_right"] = "Turn right at the corner."
    phrases["arrive_left"] = "You can see it on your left."
    phrases["arrive_right"] = "You can see it on your right."
    phrases["arrive_corner_left"] = "You can see it on the corner, on your left."
    phrases["arrive_corner_right"] = "You can see it on the corner, on your right."
    phrases["arrive_here"] = "Look around! The destination is right here."

    return phrases


async def generate_one(sem: asyncio.Semaphore, voice: str, key: str, text: str, out_path: Path) -> bool:
    if out_path.exists() and out_path.stat().st_size > 200:
        return True
    async with sem:
        for attempt in range(3):
            try:
                comm = edge_tts.Communicate(text, voice, rate="-6%")
                await comm.save(str(out_path))
                if out_path.exists() and out_path.stat().st_size > 200:
                    return True
            except Exception as exc:
                if attempt == 2:
                    print(f"  [warn] {voice}/{key} failed: {exc}")
                await asyncio.sleep(0.5 * (attempt + 1))
    return False


async def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    phrases = build_phrase_map()

    all_voices = await edge_tts.list_voices()
    target_voices = sorted(
        v["ShortName"]
        for v in all_voices
        if v.get("Locale") in ("en-US", "en-CA")
        and "Multilingual" not in v.get("ShortName", "")
    )

    print(f"Found {len(target_voices)} US/CA Azure Neural voices x {len(phrases)} phrases")
    sem = asyncio.Semaphore(8)
    completed_voices: list[str] = []

    for voice in target_voices:
        vdir = OUT_DIR / voice
        vdir.mkdir(parents=True, exist_ok=True)
        tasks = [
            generate_one(sem, voice, key, text, vdir / f"{key}.mp3")
            for key, text in phrases.items()
        ]
        results = await asyncio.gather(*tasks)
        ok_count = sum(1 for r in results if r)
        print(f"  {voice}: {ok_count}/{len(phrases)} clips ready")
        if ok_count == len(phrases):
            completed_voices.append(voice)

    manifest = {
        "voices": completed_voices,
        "phraseCount": len(phrases),
    }
    (OUT_DIR / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"Done! Wrote manifest.json with {len(completed_voices)} complete voices.")


if __name__ == "__main__":
    asyncio.run(main())
