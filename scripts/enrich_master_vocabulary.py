import json
import re
import os

INPUT_PATH = "public/data/master_vocabulary.json"
OUTPUT_PATH = "public/data/master_vocabulary.json"

# Uncountable / no-article nouns common in MEXT elementary curriculum
UNCOUNTABLE_NOUNS = {
    "water", "milk", "juice", "tea", "green tea", "coffee", "soda", "soup",
    "rice", "bread", "toast", "curry", "curry and rice", "spaghetti", "pasta",
    "ramen", "udon", "soba", "cheese", "butter", "jam", "salad", "meat", "fish",
    "pork", "beef", "chicken", "ice cream", "shaved ice", "popcorn", "chocolate",
    "homework", "music", "english", "japanese", "math", "science", "art", "pe",
    "social studies", "calligraphy", "moral education", "lunch", "breakfast", "dinner"
}

DAYS_OF_WEEK = {"monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"}
MONTHS = {"january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"}
SEASONS = {"spring", "summer", "autumn", "fall", "winter"}
HOLIDAYS = {"new year's day", "valentine's day", "doll's festival", "children's day", "star festival", "halloween", "christmas", "birthday"}

def compute_article(word: str, pos: str, is_plural: bool) -> str:
    w = word.strip().lower()
    if pos != "noun" or is_plural or w in UNCOUNTABLE_NOUNS or w in DAYS_OF_WEEK or w in MONTHS or w in SEASONS:
        return ""
    if w[0:1] in {"a", "e", "i", "o", "u"}:
        return "an"
    return "a"

def compute_sub_category(item: dict) -> str:
    w = item.get("english", "").strip().lower()
    cat = item.get("category", "")
    tags = set(item.get("tags", []))
    pos = item.get("part_of_speech", "")

    if "job" in tags or "occupation" in tags:
        return "job"
    if cat in ("06_facility", "facility"):
        return "building"
    if "past_verb" in tags:
        return "past_verb"
    if pos == "verb" or cat in ("01_action", "action"):
        return "present_verb"
    if w in DAYS_OF_WEEK:
        return "day_of_week"
    if w in MONTHS:
        return "month"
    if w in SEASONS:
        return "season"
    if cat in ("15_festalday", "festalday"):
        return "holiday" if w in HOLIDAYS else "party_item"
    return cat

def enrich():
    with open(INPUT_PATH, "r", encoding="utf-8") as f:
        vocab = json.load(f)

    fixed_past_verbs = 0
    fixed_party_items = 0

    for item in vocab:
        en = item.get("english", "").strip()
        en_lower = en.lower()
        pos = item.get("part_of_speech", "")
        tags = item.get("tags", [])
        is_plural = bool(item.get("is_plural", False))

        # 1. Add missing types.ts fields
        alpha_only = re.sub(r"[^a-zA-Z]", "", en)
        item["letter_count"] = len(alpha_only) if alpha_only else len(en)
        item["first_letter"] = alpha_only[0].upper() if alpha_only else en[:1].upper()
        item["normalized_english"] = en_lower
        item["canonical_key"] = re.sub(r"[^a-z0-9]+", "_", en_lower).strip("_")

        # 2. Add article & sub_category for smart grammar and distractors
        article = compute_article(en, pos, is_plural)
        item["article"] = article
        item["sub_category"] = compute_sub_category(item)

        # 3. Fix "Can you ate?" past-tense verb bug
        if "past_verb" in tags:
            sents = item.get("target_sentences", [])
            if any("Can you " in s for s in sents):
                item["target_sentences"] = [f"Q: What did you do? / A: I {en_lower}."]
                item["target_dialogues"] = [{
                    "question": "What did you do?",
                    "answer": f"I {en_lower}.",
                    "context": "Talking about past events and memories"
                }]
                fixed_past_verbs += 1

        # 4. Fix "celebrate balloon" Category 15 party-item bug
        if item["sub_category"] == "party_item":
            np = f"{article} {en_lower}".strip()
            item["target_sentences"] = [f"Q: What do you want? / A: I want {np}."]
            item["target_dialogues"] = [{
                "question": "What do you want?",
                "answer": f"I want {np}.",
                "context": "Asking for party items and gifts"
            }]
            if "three_hints" in item and isinstance(item["three_hints"], dict):
                item["three_hints"]["category_hint"] = "It is a party item, gift, or decoration."
            fixed_party_items += 1

        # 5. Strip redundant duplicate keys to shrink file size
        item.pop("primary_image", None)
        item.pop("primary_audio", None)

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(vocab, f, ensure_ascii=False, indent=2)

    print(f"[OK] Enriched {len(vocab)} words! Fixed {fixed_past_verbs} past-tense verbs and {fixed_party_items} party items.")

if __name__ == "__main__":
    enrich()
