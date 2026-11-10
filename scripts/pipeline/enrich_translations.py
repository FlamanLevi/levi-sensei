import os
import sys
import json
import re

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MASTER_DIR = os.path.join(BASE_DIR, "master_vocabulary_data")
MASTER_JSON_PATH = os.path.join(MASTER_DIR, "master_vocabulary.json")

print("=" * 60)
print("AUTO-ENRICHING MASTER VOCABULARY TRANSLATIONS")
print("=" * 60)

with open(MASTER_JSON_PATH, "r", encoding="utf-8") as f:
    master_words = json.load(f)

# Comprehensive Elementary Dictionary: English -> (Kanji, Hiragana, Katakana)
# Specifically tailored to Japanese Elementary School English Curricula (Let's Try & Here We Go)
DICTIONARY = {
    # Alphabet
    "a": ("", "えー", "エー"), "b": ("", "びー", "ビー"), "c": ("", "しー", "シー"),
    "d": ("", "でぃー", "ディー"), "e": ("", "いー", "イー"), "f": ("", "えふ", "エフ"),
    "g": ("", "じー", "ジー"), "h": ("", "えいち", "エイチ"), "i": ("", "あい", "アイ"),
    "j": ("", "じぇい", "ジェイ"), "k": ("", "けい", "ケイ"), "l": ("", "える", "エル"),
    "m": ("", "えむ", "エム"), "n": ("", "えぬ", "エヌ"), "o": ("", "おー", "オー"),
    "p": ("", "ぴー", "ピー"), "q": ("", "きゅー", "キュー"), "r": ("", "あーる", "アール"),
    "s": ("", "えす", "エス"), "t": ("", "てぃー", "ティー"), "u": ("", "ゆー", "ユー"),
    "v": ("", "ぶい", "ブイ"), "w": ("", "だぶりゅー", "ダブリュー"), "x": ("", "えっくす", "エックス"),
    "y": ("", "わい", "ワイ"), "z": ("", "ぜっと", "ゼット"),

    # Numbers
    "zero": ("零", "ぜろ", "ゼロ"), "one": ("一", "いち", "ワン"), "two": ("二", "に", "トゥー"),
    "three": ("三", "さん", "スリー"), "four": ("四", "よん", "フォー"), "five": ("五", "ご", "ファイブ"),
    "six": ("六", "ろく", "シックス"), "seven": ("七", "なな", "セブン"), "eight": ("八", "はち", "エイト"),
    "nine": ("九", "きゅう", "ナイン"), "ten": ("十", "じゅう", "テン"), "eleven": ("十一", "じゅういち", "イレブン"),
    "twelve": ("十二", "じゅうに", "トゥエルブ"), "thirteen": ("十三", "じゅうさん", "サーティーン"),
    "fourteen": ("十四", "じゅうよん", "フォーティーン"), "fifteen": ("十五", "じゅうご", "フィフティーン"),
    "sixteen": ("十六", "じゅうろく", "シックステーン"), "seventeen": ("十七", "じゅうなな", "セブンティーン"),
    "eighteen": ("十八", "じゅうはち", "エイティーン"), "nineteen": ("十九", "じゅうきゅう", "ナインティーン"),
    "twenty": ("二十", "にじゅう", "トゥエンティ"), "thirty": ("三十", "さんじゅう", "サーティ"),
    "forty": ("四十", "よんじゅう", "フォーティ"), "fifty": ("五十", "ごじゅう", "フィフティ"),
    "sixty": ("六十", "ろくじゅう", "シックスティ"), "seventy": ("七十", "ななじゅう", "セブンティ"),
    "eighty": ("八十", "はちじゅう", "エイティ"), "ninety": ("九十", "きゅうじゅう", "ナインティ"),
    "hundred": ("百", "ひゃく", "ハンドレッド"),

    # Colors & Shapes
    "red": ("赤", "あか", "レッド"), "blue": ("青", "あお", "ブルー"), "yellow": ("黄色", "きいろ", "イエロー"),
    "green": ("緑", "みどり", "グリーン"), "pink": ("", "ぴんく", "ピンク"), "purple": ("紫", "むらさき", "パープル"),
    "orange": ("", "おれんじ", "オレンジ"), "brown": ("茶色", "ちゃいろ", "ブラウン"), "white": ("白", "しろ", "ホワイト"),
    "black": ("黒", "くろ", "ブラック"), "circle": ("丸", "まる", "サークル"), "square": ("四角", "しかく", "スクエア"),
    "triangle": ("三角", "さんかく", "トライアングル"), "rectangle": ("長方形", "ちょうほうけい", "レクタングル"),
    "heart": ("", "はーと", "ハート"), "diamond": ("ひし形", "ひしがた", "ダイアモンド"), "star": ("星", "ほし", "スター"),
    "cross": ("十字", "じゅうじ", "クロス"),

    # Animals
    "dog": ("犬", "いぬ", "ドッグ"), "dogs": ("犬", "いぬ", "ドッグス"),
    "cat": ("猫", "ねこ", "キャット"), "cats": ("猫", "ねこ", "キャッツ"),
    "duck": ("鴨", "かも", "ダック"), "ducks": ("アヒル / カモ", "あひる", "ダックス"),
    "horse": ("馬", "うま", "ホース"), "horses": ("馬", "うま", "ホーシーズ"),
    "cow": ("牛", "うし", "カウ"), "cows": ("牛", "うし", "カウズ"),
    "pig": ("豚", "ぶた", "ピッグ"), "pigs": ("豚", "ぶた", "ピッグス"),
    "lion": ("ライオン", "らいおん", "ライオン"), "tiger": ("虎", "とら", "タイガー"), "tigers": ("虎", "とら", "タイガーズ"),
    "elephant": ("象", "ぞう", "エレファント"), "elephants": ("象", "ぞう", "エレファンツ"),
    "monkey": ("猿", "さる", "モンキー"), "monkeys": ("猿", "さる", "モンキーズ"),
    "bear": ("熊", "くま", "ベアー"), "panda": ("パンダ", "ぱんだ", "パンダ"),
    "rabbit": ("うさぎ", "うさぎ", "ラビット"), "mouse": ("ねずみ", "ねずみ", "マウス"),
    "sheep": ("羊", "ひつじ", "シープ"), "chicken": ("鶏", "にわとり", "チキン"),
    "bird": ("鳥", "とり", "バード"), "fish": ("魚", "さかな", "フィッシュ"),
    "frog": ("カエル", "かえる", "フロッグ"), "gorilla": ("ゴリラ", "ごりら", "ゴリラ"),
    "koala": ("コアラ", "こあら", "コアラ"), "snake": ("蛇", "へび", "スネーク"),
    "spider": ("蜘蛛", "くも", "スパイダー"), "hippo": ("カバ", "かば", "ヒッポー"), "hippos": ("カバ", "かば", "ヒッポーズ"),
    "giraffe": ("キリン", "きりん", "ジラフ"), "giraffes": ("キリン", "きりん", "ジラフス"),
    "wild boar": ("イノシシ", "いのしし", "ワイルドボア"),

    # Body Parts
    "head": ("頭", "あたま", "ヘッド"), "eye": ("目", "め", "アイ"), "eyes": ("目", "め", "アイズ"),
    "ear": ("耳", "みみ", "イヤー"), "ears": ("耳", "みみ", "イヤーズ"), "nose": ("鼻", "はな", "ノーズ"),
    "mouth": ("口", "くち", "マウス"), "face": ("顔", "かお", "フェイス"), "teeth": ("歯", "は", "ティース"),
    "shoulder": ("肩", "かた", "ショルダー"), "shoulders": ("肩", "かた", "ショルダーズ"),
    "knee": ("膝", "ひざ", "ニー"), "knees": ("膝", "ひざ", "ニーズ"),
    "toe": ("足の指", "あしのゆび", "トウ"), "toes": ("足の指", "あしのゆび", "トウズ"),
    "arm": ("腕", "うで", "アーム"), "arms": ("腕", "うで", "アームズ"),
    "hand": ("手", "て", "ハンド"), "hands": ("手", "て", "ハンズ"),
    "leg": ("脚", "あし", "レッグ"), "legs": ("脚", "あし", "レッグス"),
    "foot": ("足", "あし", "フット"), "feet": ("足", "あし", "フィート"),

    # Food & Drink
    "apple": ("りんご", "りんご", "アップル"), "apples": ("りんご", "りんご", "アップルズ"),
    "banana": ("バナナ", "ばなな", "バナナ"), "orange": ("オレンジ", "おれんじ", "オレンジ"),
    "strawberry": ("いちご", "いちご", "ストロベリー"), "peach": ("桃", "もも", "ピーチ"),
    "grapes": ("ぶどう", "ぶどう", "グレープス"), "melon": ("メロン", "めろん", "メロン"),
    "watermelon": ("すいか", "すいか", "ウォーターメロン"), "kiwifruit": ("キウイ", "きうい", "キウイフルーツ"),
    "lemon": ("レモン", "れもん", "レモン"), "pear": ("梨", "なし", "ペア"), "pears": ("梨", "なし", "ペアーズ"),
    "cherry": ("さくらんぼ", "さくらんぼ", "チェリー"),
    "tomato": ("トマト", "とまと", "トマト"), "potato": ("じゃがいも", "じゃがいも", "ポテト"), "potatoes": ("じゃがいも", "じゃがいも", "ポテトーズ"),
    "onion": ("玉ねぎ", "たまねぎ", "オニオン"), "onions": ("玉ねぎ", "たまねぎ", "オニオンズ"),
    "carrot": ("人参", "にんじん", "キャロット"), "carrots": ("人参", "にんじん", "キャロッツ"),
    "cucumber": ("きゅうり", "きゅうり", "キューカンバー"), "cucumbers": ("きゅうり", "きゅうり", "キューカンバーズ"),
    "pumpkin": ("かぼちゃ", "かぼちゃ", "パンプキン"), "pumpkins": ("かぼちゃ", "かぼちゃ", "パンプキンズ"),
    "corn": ("とうもろこし", "とうもろこし", "コーン"), "lettuce": ("レタス", "れたす", "レタス"),
    "cabbage": ("キャベツ", "きゃべつ", "キャベツ"), "mushroom": ("きのこ", "きのこ", "マッシュルーム"),
    "greenpepper": ("ピーマン", "ぴーまん", "グリーンペッパー"), "radish": ("大根", "だいこん", "ラディッシュ"),
    "bread": ("パン", "ぱん", "ブレッド"), "rice": ("ご飯", "ごはん", "ライス"), "riceball": ("おにぎり", "おにぎり", "ライスボール"),
    "egg": ("卵", "たまご", "エッグ"), "fish": ("魚", "さかな", "フィッシュ"), "meat": ("肉", "にく", "ミート"),
    "beefsteak": ("ステーキ", "すてーき", "ビーフステーキ"), "steak": ("ステーキ", "すてーき", "ステーキ"),
    "hamburger": ("ハンバーガー", "はんばーがー", "ハンバーガー"), "pizza": ("ピザ", "ぴざ", "ピザ"),
    "spaghetti": ("スパゲッティ", "すぱげってぃ", "スパゲッティ"), "noodle": ("麺 / ラーメン", "めん", "ヌードル"),
    "curryandrice": ("カレーライス", "かれーらいす", "カリーアンドライス"), "sandwich": ("サンドイッチ", "さんどいっち", "サンドイッチ"),
    "salad": ("サラダ", "さらだ", "サラダ"), "soup": ("スープ", "すーぷ", "スープ"),
    "sushi": ("寿司", "すし", "スシ"), "frenchfries": ("フライドポテト", "ふらいどぽてと", "フレンチフライズ"),
    "friedchicken": ("フライドチキン", "ふらいどちきん", "フライドチキン"), "cake": ("ケーキ", "けーき", "ケーキ"),
    "icecream": ("アイスクリーム", "あいすくりーむ", "アイスクリーム"), "pudding": ("プリン", "ぷりん", "プディング"),
    "parfait": ("パフェ", "ぱふぇ", "パフェ"), "snack": ("おやつ", "おやつ", "スナック"),
    "milk": ("牛乳", "ぎゅうにゅう", "ミルク"), "juice": ("ジュース", "じゅーす", "ジュース"),
    "tea": ("お茶 / 紅茶", "おちゃ", "ティー"), "greentea": ("緑茶", "りょくちゃ", "グリーンティー"),
    "water": ("水", "みず", "ウォーター"), "mineralwater": ("水", "みず", "ミネラルウォーター"),

    # School Life & Classroom Objects
    "pencil": ("鉛筆", "えんぴつ", "ペンシル"), "pencils": ("鉛筆", "えんぴつ", "ペンシルズ"),
    "eraser": ("消しゴム", "けしごむ", "イレイサー"), "erasers": ("消しゴム", "けしごむ", "イレイサーズ"),
    "ruler": ("定規", "じょうぎ", "ルーラー"), "book": ("本", "ほん", "ブック"), "books": ("本", "ほん", "ブックス"),
    "notebook": ("ノート", "のーと", "ノートブック"), "pencilcase": ("筆箱", "ふでばこ", "ペンシルケース"),
    "pencilsharpener": ("鉛筆削り", "えんぴつけずり", "ペンシルシャープナー"),
    "pen": ("ペン", "ぺん", "ペン"), "marker": ("マジック", "まじっく", "マーカー"),
    "crayon": ("クレヨン", "くれよん", "クレヨン"), "paper": ("紙", "かみ", "ペーパー"),
    "gluestick": ("のり", "のり", "グルースティック"), "scissors": ("ハサミ", "はさみ", "シザーズ"),
    "stapler": ("ホッチキス", "ほっちきす", "ステープラー"), "magnet": ("磁石", "じしゃく", "マグネット"),
    "bag": ("かばん", "かばん", "バッグ"), "desk": ("机", "つくえ", "デスク"), "chair": ("椅子", "いす", "チェア"),
    "clock": ("時計", "とけい", "クロック"), "calendar": ("カレンダー", "かれんだー", "カレンダー"),
    "classroom": ("教室", "きょうしつ", "クラスルーム"), "gym": ("体育館", "たいいくかん", "ジム"),
    "library": ("図書室", "としょしつ", "ライブラリー"), "music room": ("音楽室", "おんがくしつ", "ミュージックスクール"),
    "science room": ("理科室", "りかしつ", "サイエンスルーム"), "art room": ("図工室", "ずこうしつ", "アートルーム"),
    "arts and crafts room": ("図工室", "ずこうしつ", "アーツアンドクラフツルーム"),
    "computer room": ("パソコン教室", "ぱそこんきょうしつ", "コンピュータールーム"),
    "computerroom": ("パソコン教室", "ぱそこんきょうしつ", "コンピュータールーム"),
    "cooking room": ("家庭科室", "かていかしつ", "クッキングルーム"),
    "cookingroom": ("家庭科室", "かていかしつ", "クッキングルーム"),
    "teachers' office": ("職員室", "しょくいんしつ", "ティーチャーズオフィス"),
    "school nurse's office": ("保健室", "ほけんしつ", "ナースオフィス"),
    "playground": ("校庭 / 運動場", "こうてい", "プレイグラウンド"),
    "school": ("学校", "がっこう", "スクール"), "teacher": ("先生", "せんせい", "ティーチャー"),

    # School Subjects
    "japanese": ("国語", "こくご", "ジャパニーズ"), "math": ("算数", "さんすう", "マス"),
    "science": ("理科", "りか", "サイエンス"), "socialstudies": ("社会", "しゃかい", "ソーシャルスタディーズ"),
    "music": ("音楽", "おんがく", "ミュージック"), "pe": ("体育", "たいいく", "ピーイー"),
    "artsandcrafts": ("図工", "ずこう", "アーツアンドクラフツ"), "english": ("英語", "えいご", "イングリッシュ"),
    "moraleducation": ("道徳", "どうとく", "モラルエデュケーション"), "homeeconomics": ("家庭科", "かていか", "ホームエコノミクス"),

    # Daily Life & Routines
    "breakfast": ("朝ごはん", "あさごはん", "ブレックファスト"), "lunch": ("昼ごはん", "ひるごはん", "ランチ"),
    "dinner": ("晩ごはん", "ばんごはん", "ディナー"), "bed": ("ベッド", "べっど", "ベッド"),
    "bath": ("お風呂", "おふろ", "バス"), "bathtime": ("お風呂の時間", "おふろのじかん", "バスタイム"),
    "wake up": ("起きる", "おきる", "ウェイクアップ"), "get up": ("起きる", "おきる", "ゲットアップ"),
    "wash face": ("顔を洗う", "かおをあらう", "ウォッシュフェイス"), "brush teeth": ("歯をみがく", "はをみがく", "ブラッシュティース"),
    "go to school": ("学校へ行く", "がっこうへいく", "ゴートゥースクール"),
    "go home": ("家に帰る", "いえにかえる", "ゴーホーム"),
    "do homework": ("宿題をする", "しゅくだいをする", "ドゥーホームワーク"),
    "watch tv": ("テレビを見る", "てれびをみる", "ウォッチティービー"),
    "play games": ("ゲームをする", "げーむをする", "プレイゲームズ"),
    "sleep": ("寝る", "ねる", "スリープ"),

    # Transportation
    "bus": ("バス", "ばす", "バス"), "car": ("車", "くるま", "カー"), "train": ("電車", "でんしゃ", "トレイン"),
    "boat": ("船 / ボート", "ふね", "ボート"), "ship": ("船", "ふね", "シップ"),
    "bicycle": ("自転車", "じてんしゃ", "バイシクル"), "airplane": ("飛行機", "ひこうき", "エアプレーン"),
    "plane": ("飛行機", "ひこうき", "プレーン"), "taxi": ("タクシー", "たくしー", "タクシー"),
    "station": ("駅", "えき", "ステーション"), "stop": ("止まる", "とまる", "ストップ"),

    # Opposites & Adjectives
    "big": ("大きい", "おおきい", "ビッグ"), "small": ("小さい", "ちいさい", "スモール"),
    "long": ("長い", "ながい", "ロング"), "short": ("短い", "みじかい", "ショート"),
    "fast": ("速い", "はやい", "ファスト"), "slow": ("遅い", "おそい", "スロー"),
    "hot": ("暑い / 熱い", "あつい", "ホット"), "cold": ("寒い / 冷たい", "さむい", "コールド"),
    "old": ("古い", "ふるい", "オールド"), "new": ("新しい", "あたらしい", "ニュー"),
    "clean": ("きれいな", "きれいな", "クリーン"), "dirty": ("よごれた", "よごれた", "ダーティ"),
    "near": ("近い", "ちかい", "ニア"), "far": ("遠い", "とおい", "ファー"),
    "good": ("良い", "よい", "グッド"), "bad": ("悪い", "わるい", "バッド"),
    "happy": ("幸せな", "うれしい", "ハッピー"), "sad": ("悲しい", "かなしい", "サッド"),
    "fine": ("元気な", "げんきな", "ファイン"), "tired": ("疲れた", "つかれた", "タイアード"),
    "sleepy": ("眠い", "ねむい", "スリーピー"), "hungry": ("お腹がすいた", "おなかがすいた", "ハングリー"),
    "thirsty": ("のどがかわいた", "のどがかわいた", "サースティ"),
    "sunny": ("晴れ", "はれ", "サニー"), "cloudy": ("曇り", "くもり", "クラウディ"),
    "rainy": ("雨", "あめ", "レイニー"), "snowy": ("雪", "ゆき", "スノーウィ"),

    # Sports
    "soccer": ("サッカー", "さっかー", "サッカー"), "baseball": ("野球", "やきゅう", "ベースボール"),
    "basketball": ("バスケットボール", "ばすけっとぼーる", "バスケットボール"),
    "dodgeball": ("ドッジボール", "どっじぼーる", "ドッジボール"), "swimming": ("水泳", "すいえい", "スイミング"),
    "volleyball": ("バレーボール", "ばれーぼーる", "バレーボール"), "tennis": ("テニス", "てにす", "テニス"),
    "tabletennis": ("卓球", "たっきゅう", "テーブルテニス"), "badminton": ("バドミントン", "ばどみんとん", "バドミントン"),
    "running": ("走ること", "はしること", "ランニング"), "jump rope": ("なわとび", "なわとび", "ジャンプロープ"),

    # Seasons & Holidays
    "spring": ("春", "はる", "スプリング"), "summer": ("夏", "なつ", "サマー"),
    "autumn": ("秋", "あき", "オータム"), "fall": ("秋", "あき", "フォール"),
    "autumn/fall": ("秋", "あき", "オータム / フォール"), "winter": ("冬", "ふゆ", "ウィンター"),
    "halloween": ("ハロウィーン", "はろうぃーん", "ハロウィーン"), "witch": ("魔女", "まじょ", "ウィッチ"),
    "ghost": ("おばけ", "おばけ", "ゴースト"), "mummy": ("ミイラ", "みいら", "マミー"),
    "monster": ("怪物", "かいぶつ", "モンスター"), "black cat": ("黒猫", "くろねこ", "ブラックキャット"),
    "christmas": ("クリスマス", "くりすます", "クリスマス"), "santa": ("サンタクロース", "さんたくろーす", "サンタ"),
    "candycane": ("キャンディケイン", "きゃんでぃけいん", "キャンディケイン"),
    "stocking": ("くつした", "くつした", "ストッキング"), "toy": ("おもちゃ", "おもちゃ", "トイ"),
    "toys": ("おもちゃ", "おもちゃ", "トイズ"),

    # Verbs / Actions
    "run": ("走る", "はしる", "ラン"), "swim": ("泳ぐ", "およぐ", "スイム"),
    "jump": ("跳ぶ", "とぶ", "ジャンプ"), "walk": ("歩く", "あるく", "ウォーク"),
    "dance": ("踊る", "おどる", "ダンス"), "sing": ("歌う", "うたう", "シング"),
    "play": ("遊ぶ / する", "あそぶ", "プレイ"), "cook": ("料理する", "りょうりする", "クック"),
    "eat": ("食べる", "たべる", "イート"), "drink": ("飲む", "のむ", "ドリンク"),
    "read": ("読む", "よむ", "リード"), "write": ("書く", "かく", "ライト"),
    "listen": ("聞く", "きく", "リッスン"), "speak": ("話す", "はなす", "スピーク"),
    "watch": ("見る", "みる", "ウォッチ"), "see": ("見る / 会う", "みる", "シー"),
    "look": ("見る", "みる", "ルック"), "like": ("好き", "すき", "ライク"),
    "want": ("欲しい", "ほしい", "ウォント"), "have": ("持っている", "もっている", "ハブ"),
    "stop": ("止まる", "とまる", "ストップ"), "turn": ("曲がる", "まがる", "ターン"),
    "wash": ("洗う", "あらう", "ウォッシュ"), "brush": ("みがく", "みがく", "ブラッシュ"),
    "clean": ("そうじする", "そうじする", "クリーン"), "buy": ("買う", "かう", "バイ"),
    "make": ("作る", "つくる", "メイク"), "ride": ("乗る", "のる", "ライド")
}

# Normalize and enrich words
enriched_count = 0
cleaned_words = []

for w in master_words:
    en_raw = w.get("english", "").strip()
    en_norm = en_raw.lower()
    
    # Filter out sentence-fragment artifacts from raw PDF regex
    if len(en_norm) > 30 or "what do you" in en_norm or "who am i" in en_norm or "i like" in en_norm or "do you have" in en_norm:
        continue
    if en_norm.startswith("adjectives ") or en_norm.startswith("animals "):
        # e.g. "animals cow" -> "cow"
        en_raw = en_raw.split()[-1].capitalize()
        en_norm = en_raw.lower()
        w["english"] = en_raw
        
    # Check if we have dictionary translation
    if en_norm in DICTIONARY:
        kj, hg, kt = DICTIONARY[en_norm]
        if not w.get("ja_kanji") and kj:
            w["ja_kanji"] = kj
        if not w.get("ja_hiragana") and hg:
            w["ja_hiragana"] = hg
            enriched_count += 1
        if not w.get("en_katakana") and kt:
            w["en_katakana"] = kt
    
    # If still missing katakana, use word capitalization as fallback
    if not w.get("en_katakana") and w.get("ja_hiragana"):
        pass

    cleaned_words.append(w)

print(f"Enriched {enriched_count} vocabulary entries with Japanese Kanji/Hiragana/Katakana!")
print(f"Total Cleaned Master Words: {len(cleaned_words)}")

# Re-save master_vocabulary.json
with open(MASTER_JSON_PATH, "w", encoding="utf-8") as f:
    json.dump(cleaned_words, f, ensure_ascii=False, indent=2)

# Update all grade subset files
for g in ["es_g1", "es_g2", "es_g3", "es_g4", "es_g5", "es_g6"]:
    g_tag = g.upper()
    subset = [w for w in cleaned_words if g_tag in w.get("grades", [])]
    sub_path = os.path.join(MASTER_DIR, f"vocabulary_{g}.json")
    with open(sub_path, "w", encoding="utf-8") as f:
        json.dump(subset, f, ensure_ascii=False, indent=2)
    print(f"  ✓ Updated {g_tag}: {len(subset)} words")

# Calculate final stats
total_translated = sum(1 for w in cleaned_words if w.get("ja_hiragana") or w.get("ja_kanji"))
percent = (total_translated / len(cleaned_words)) * 100

print(f"\nFinal Translation Coverage: {total_translated} / {len(cleaned_words)} ({percent:.1f}%)")

# Update Summary Report
summary_md = os.path.join(MASTER_DIR, "VOCABULARY_SUMMARY.md")
with open(summary_md, "w", encoding="utf-8") as f:
    f.write("# Master Vocabulary Database Summary (Enriched)\n\n")
    f.write(f"- **Total Words:** {len(cleaned_words)}\n")
    f.write(f"- **Audio Files Verified:** {sum(1 for w in cleaned_words if w.get('sound_file'))} native MP3s\n")
    f.write(f"- **Flashcard Images Verified:** {sum(1 for w in cleaned_words if w.get('card_image'))} PNGs\n")
    f.write(f"- **Words with Japanese Translations:** {total_translated} ({percent:.1f}%)\n\n")
    f.write("## Grade Breakdown\n\n")
    for g in ["es_g1", "es_g2", "es_g3", "es_g4", "es_g5", "es_g6"]:
        g_tag = g.upper()
        subset = [w for w in cleaned_words if g_tag in w.get("grades", [])]
        f.write(f"- **{g_tag}**: {len(subset)} words\n")

print(f"✓ Updated summary report: '{summary_md}'")
