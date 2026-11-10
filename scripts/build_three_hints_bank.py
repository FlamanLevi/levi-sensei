import json
import os
import re

INPUT_VOCAB = "public/data/master_vocabulary.json"
OUTPUT_BANK = "public/data/banks/three_hints_bank.json"

# Curated kid-friendly descriptive clues (Hint 2 & Hint 3) for popular elementary words
CURATED_FEATURES = {
    "apple": [
        {"en": "It is round and usually red or green.", "ja": "丸くて、ふつうは赤や緑色をしています。"},
        {"en": "It is crunchy, sweet, and white on the inside.", "ja": "かじるとシャキッとしていて、中は白色です。"},
        {"en": "Aomori Prefecture in Japan is very famous for it!", "ja": "日本では青森県（あおもりけん）がとっても有名です！"}
    ],
    "banana": [
        {"en": "It is long, curved, and yellow.", "ja": "長くて曲がっていて、黄色をしています。"},
        {"en": "Monkeys love to peel and eat it!", "ja": "さるが皮をむいて食べるのが大好きです！"},
        {"en": "It is soft and sweet on the inside.", "ja": "中はやわらかくて、あまいくだものです。"}
    ],
    "strawberry": [
        {"en": "It is small, red, and has tiny seeds on the outside.", "ja": "小さくて赤く、外側に小さなつぶつぶがあります。"},
        {"en": "You often see it on top of a Japanese birthday cake!", "ja": "ショートケーキや誕生日ケーキの上によくのっています！"}
    ],
    "watermelon": [
        {"en": "It is big and green with black stripes on the outside.", "ja": "大きくて、外側は緑と黒のしま模様（もよう）です。"},
        {"en": "It is bright red and juicy inside. People eat it in summer!", "ja": "中は真っ赤でみずみずしく、夏によく食べます！"}
    ],
    "balloon": [
        {"en": "It is light, colorful, and floats in the air.", "ja": "軽くてカラフルで、空中にふわふわ浮かびます。"},
        {"en": "You blow air into it to make it big and round!", "ja": "息（いき）をふきこむと、大きく丸くふくらみます！"}
    ],
    "angry": [
        {"en": "Your face turns red and your eyebrows go down!", "ja": "顔が赤くなって、まゆ毛がつり上がります！"},
        {"en": "It is the opposite of calm and happy.", "ja": "おだやかな気持ちや、うれしい気持ちの反対です。"}
    ],
    "actor": [
        {"en": "This person performs in movies, TV shows, and plays.", "ja": "映画やテレビドラマ、舞台（ぶたい）で演じる人です。"},
        {"en": "They can pretend to be a hero, a detective, or a king!", "ja": "ヒーローや探偵（たんてい）、王様になりきることができます！"}
    ],
    "bath time": [
        {"en": "You use warm water, soap, and shampoo at this time.", "ja": "お湯や石けん、シャンプーを使って体をあらう時間です。"},
        {"en": "In Japan, people relax in a warm tub in the evening!", "ja": "夜、湯ぶねにつかってぽかぽか温まる時間です！"}
    ]
}

CATEGORY_TEMPLATES = {
    "01_action": [
        {"en": "It is an action or movement you can do.", "ja": "体を動かすアクション（動き・行動）です。"},
        {"en": "It is a verb (an action word).", "ja": "「〜する」を表すことば（動詞）です。"}
    ],
    "past_verb": [
        {"en": "It is an action you ALREADY did in the past!", "ja": "過去（かこ）に「〜した」という動きを表すことばです！"},
        {"en": "You use this word when talking about weekend or summer memories.", "ja": "週末や夏休みの思い出を話すときに使うことばです。"}
    ],
    "02_state": [
        {"en": "It is a feeling, emotion, or how something looks.", "ja": "気持ちや、ものの様子（ようす）を表すことばです。"},
        {"en": "You can use it to answer 'How are you?' or describe things.", "ja": "気分や状態（じょうたい）を伝えるときに使います。"}
    ],
    "03_food": [
        {"en": "It is something delicious you can eat or drink!", "ja": "食べたり飲んだりできる、おいしいものです！"},
        {"en": "You can find it at a supermarket, restaurant, or school lunch.", "ja": "スーパーやレストラン、給食（きゅうしょく）で見かけます。"}
    ],
    "03_fooddrink": [
        {"en": "It is something delicious you can eat or drink!", "ja": "食べたり飲んだりできる、おいしいものです！"},
        {"en": "You can find it at a supermarket, restaurant, or school lunch.", "ja": "スーパーやレストラン、給食（きゅうしょく）で見かけます。"}
    ],
    "04_number": [
        {"en": "It is a number used for counting or math!", "ja": "数をかぞえたり、算数で使ったりする数字です！"}
    ],
    "05_school": [
        {"en": "It is something you see or do at elementary school!", "ja": "小学校の生活や授業に関係（かんけい）するものです！"},
        {"en": "Students and teachers use or do this at school.", "ja": "学校で児童や先生が使ったり行ったりするものです。"}
    ],
    "05_schoollife": [
        {"en": "It is something you see or do at elementary school!", "ja": "小学校の生活や授業に関係（かんけい）するものです！"},
        {"en": "Students and teachers use or do this at school.", "ja": "学校で児童や先生が使ったり行ったりするものです。"}
    ],
    "job": [
        {"en": "It is a dream job or occupation for the future!", "ja": "将来（しょうらい）なりたい職業（お仕事）です！"},
        {"en": "You say 'I want to be a/an ___' with this word.", "ja": "「将来〜になりたい」と話すときに使うお仕事です。"}
    ],
    "building": [
        {"en": "It is a building or place in a town!", "ja": "町（まち）の中にある建物や場所です！"},
        {"en": "You can walk there or give directions to this place on a map.", "ja": "地図で道案内（みちあんない）をするときに出てくる場所です。"}
    ],
    "06_facility": [
        {"en": "It is a building or place in a town!", "ja": "町（まち）の中にある建物や場所です！"},
        {"en": "You can walk there or give directions to this place on a map.", "ja": "地図で道案内（みちあんない）をするときに出てくる場所です。"}
    ],
    "07_dailylife": [
        {"en": "It is part of your everyday life at home!", "ja": "毎日のくらしや、お家の中にあるものです！"}
    ],
    "08_sport": [
        {"en": "It is a sport, game, or fun hobby!", "ja": "体を動かすスポーツや、楽しい遊びです！"},
        {"en": "Many students play or watch this in P.E. or club activities.", "ja": "体育の授業やクラブ活動でも人気のスポーツです。"}
    ],
    "08_sports": [
        {"en": "It is a sport, game, or fun hobby!", "ja": "体を動かすスポーツや、楽しい遊びです！"},
        {"en": "Many students play or watch this in P.E. or club activities.", "ja": "体育の授業やクラブ活動でも人気のスポーツです。"}
    ],
    "09_colorshape": [
        {"en": "It is a color or a shape!", "ja": "「色（いろ）」または「形（かたち）」の名前です！"}
    ],
    "09_color_shape": [
        {"en": "It is a color or a shape!", "ja": "「色（いろ）」または「形（かたち）」の名前です！"}
    ],
    "10_calendar_time": [
        {"en": "It is related to the clock, calendar, or daily schedule.", "ja": "時計やカレンダー、1日のスケジュールに関係することばです。"}
    ],
    "11_animal": [
        {"en": "It is a living creature or animal!", "ja": "生き物（動物・鳥・虫・海の生き物）です！"},
        {"en": "You might see it at a zoo, aquarium, farm, or in nature.", "ja": "動物園や水族館、自然の中で見ることができます。"}
    ],
    "11_animals": [
        {"en": "It is a living creature or animal!", "ja": "生き物（動物・鳥・虫・海の生き物）です！"},
        {"en": "You might see it at a zoo, aquarium, farm, or in nature.", "ja": "動物園や水族館、自然の中で見ることができます。"}
    ],
    "12_nature": [
        {"en": "It is part of nature, weather, or the sky!", "ja": "自然（しぜん）や天気、地球に関係するものです！"}
    ],
    "13_position": [
        {"en": "It tells you WHERE something is or which way to go!", "ja": "場所（どこにあるか）や方向を表すことばです！"}
    ],
    "14_body": [
        {"en": "It is a part of your body or face!", "ja": "人間の「体（からだ）」や「顔（かお）」の部分です！"}
    ],
    "14_body_family": [
        {"en": "It is a part of your body or face!", "ja": "人間の「体（からだ）」や「顔（かお）」の部分です！"}
    ],
    "holiday": [
        {"en": "It is a special holiday, festival, or yearly event!", "ja": "1年の中にある特別な行事（ぎょうじ）やイベントです！"}
    ],
    "party_item": [
        {"en": "It is a fun party item, gift, or decoration!", "ja": "パーティーやプレゼントで使う楽しいアイテムです！"}
    ],
    "15_festalday": [
        {"en": "It is a special holiday, festival, or yearly event!", "ja": "1年の中にある特別な行事（ぎょうじ）やイベントです！"}
    ],
    "16_alphabet": [
        {"en": "It is one of the 26 letters of the English alphabet!", "ja": "英語のアルファベット26文字のうちの1つです！"}
    ]
}

def mask_target_word(sentence: str, word: str) -> str:
    pattern = re.compile(re.escape(word), re.IGNORECASE)
    return pattern.sub(" [ ? ] ", sentence)

def build_bank():
    with open(INPUT_VOCAB, "r", encoding="utf-8") as f:
        vocab = json.load(f)

    bank = {}

    for item in vocab:
        w_id = item["id"]
        en = item.get("english", "").strip()
        en_lower = en.lower()
        cat = item.get("category", "")
        tags = set(item.get("tags", []))
        syllables = item.get("syllable_count", 1)
        alpha_only = re.sub(r"[^a-zA-Z]", "", en)
        letter_count = len(alpha_only) if alpha_only else len(en)
        first_char = alpha_only[0].upper() if alpha_only else en[:1].upper()
        last_char = alpha_only[-1].upper() if len(alpha_only) > 1 else ""

        # Determine effective sub-category
        sub_cat = cat
        if "past_verb" in tags:
            sub_cat = "past_verb"
        elif "job" in tags or "occupation" in tags:
            sub_cat = "job"
        elif cat in ("06_facility", "facility"):
            sub_cat = "building"
        elif cat in ("15_festalday", "festalday"):
            sub_cat = "party_item" if ("item" in tags or "toy" in tags) else "holiday"

        # --- POOL 1: Broad Category & Context Clues ---
        hint1_pool = list(CATEGORY_TEMPLATES.get(sub_cat, CATEGORY_TEMPLATES.get(cat, [
            {"en": "It is an important English word from your textbook!", "ja": "教科書に出てくる大切な英語のことばです！"}
        ])))

        # Add dialogue question as a contextual Hint 1 option if available
        dialogues = item.get("target_dialogues", [])
        if dialogues and isinstance(dialogues, list) and len(dialogues) > 0 and dialogues[0].get("question"):
            q_text = mask_target_word(dialogues[0]["question"], en)
            if "Can you ate" not in q_text and "on balloon" not in q_text:
                hint1_pool.append({
                    "en": f"You hear this when someone asks: \"{q_text}\"",
                    "ja": f"「{q_text}」と質問されたときに使うことばだよ。"
                })

        # --- POOL 2: Feature, Rhythm, Length & Blanked-Sentence Clues (NO Japanese Spoilers!) ---
        hint2_pool = []
        if en_lower in CURATED_FEATURES:
            hint2_pool.extend(CURATED_FEATURES[en_lower])

        # Add masked answer sentence clue
        if dialogues and isinstance(dialogues, list) and len(dialogues) > 0 and dialogues[0].get("answer"):
            ans_text = dialogues[0]["answer"]
            if "can ate" not in ans_text and "celebrate balloon" not in ans_text:
                masked_ans = mask_target_word(ans_text, en)
                hint2_pool.append({
                    "en": f"In a conversation, you can say: \"{masked_ans}\"",
                    "ja": f"英語のやり取りで「{masked_ans}」のように言えるよ！"
                })

        # Add syllable & letter structure clues
        clap_icons = "👏" * max(1, min(5, syllables))
        hint2_pool.append({
            "en": f"It has {syllables} syllable{'s' if syllables != 1 else ''} ({clap_icons}) and {letter_count} letter{'s' if letter_count != 1 else ''}.",
            "ja": f"手をたたいて言うと {syllables}回（{clap_icons}）のリズムで、アルファベット {letter_count}文字 だよ。"
        })

        # --- POOL 3: Clincher, Phonics & Letter Clues ---
        hint3_pool = [
            {
                "en": f"It starts with the letter '{first_char}'!",
                "ja": f"最初のアルファベットは『 {first_char} 』だよ！"
            }
        ]
        if last_char and letter_count >= 3:
            middle_blanks = " _ " * max(1, min(6, letter_count - 2))
            hint3_pool.append({
                "en": f"It starts with '{first_char}' and ends with '{last_char}' ({first_char}{middle_blanks}{last_char})!",
                "ja": f"最初が『 {first_char} 』で、最後が『 {last_char} 』のことばだよ（{first_char}{middle_blanks}{last_char}）！"
            })

        # Katakana first-sound hint
        katakana = item.get("en_katakana", "")
        if len(katakana) >= 2:
            first_kana = katakana[0] + ("ー" if katakana[1] == "ー" else "")
            hint3_pool.append({
                "en": f"Starts with '{first_char}' — and the English sound begins like '{first_kana}...'!",
                "ja": f"『 {first_char} 』からはじまり、発音の最初は「{first_kana}…」と聞こえるよ！"
            })

        bank[w_id] = {
            "id": w_id,
            "english": en,
            "hint1_pool": hint1_pool,
            "hint2_pool": hint2_pool,
            "hint3_pool": hint3_pool
        }

    os.makedirs(os.path.dirname(OUTPUT_BANK), exist_ok=True)
    with open(OUTPUT_BANK, "w", encoding="utf-8") as f:
        json.dump(bank, f, ensure_ascii=False, indent=2)

    print(f"[OK] Generated {OUTPUT_BANK} with multi-hint pools for {len(bank)} words!")

if __name__ == "__main__":
    build_bank()
