/**
 * Authoritative Curriculum & Unit Aims Guide for Levi-Sensei English Platform
 * 
 * Source: Ministry of Education, Culture, Sports, Science and Technology (MEXT)
 * Let's Try! 1 & 2 Teacher's Guides (Elementary School Foreign Language Activities)
 */

export interface CurriculumActivity {
  id: string;
  nameEn: string;
  nameJa: string;
  descriptionEn: string;
  descriptionJa: string;
  targetItems?: string[];
  script?: {
    speaker: string;
    textEn: string;
    textJa: string;
  }[];
}

export interface UnitCurriculumGuide {
  unitKey: string;             // e.g. "ES_G4_U6"
  grade: 'ES_G1' | 'ES_G2' | 'ES_G3' | 'ES_G4' | 'ES_G5' | 'ES_G6' | 'JHS_G1' | 'JHS_G2' | 'JHS_G3';
  unitNumber: number;
  unitString: string;          // Must match master_vocabulary.json unit string, e.g. "Unit 6: Alphabet"
  textbookAlignment?: Record<string, string>;
  titleEn: string;
  titleJa: string;
  subtitleEn: string;
  subtitleJa: string;
  totalClasses: number;
  aims: {
    en: string[];
    ja: string[];
  };
  targetExpressions: {
    phraseEn: string;
    phraseJa: string;
    speechText?: string;
  }[];
  targetVocabulary: {
    category: string;
    words: string[];
  }[];
  activities: CurriculumActivity[];
  teacherExpressions: {
    phraseEn: string;
    phraseJa: string;
  }[];
  letterBifurcation?: {
    firstHalf: {
      range: [string, string];
      labelEn: string;
      labelJa: string;
      page: number;
      letters: string[];
    };
    secondHalf: {
      range: [string, string];
      labelEn: string;
      labelJa: string;
      page: number;
      letters: string[];
    };
  };
}

export const CURRICULUM_GUIDES: Record<string, UnitCurriculumGuide> = {
  // =========================================================================
  // GRADE 4 - UNIT 6: ALPHABET
  // =========================================================================
  'ES_G4_U6': {
    unitKey: 'ES_G4_U6',
    grade: 'ES_G4',
    unitNumber: 6,
    unitString: 'Unit 6: Alphabet',
    titleEn: 'Alphabet',
    titleJa: 'アルファベット',
    subtitleEn: "Let's play with the alphabet",
    subtitleJa: 'アルファベットとなかよし',
    totalClasses: 4,
    aims: {
      en: [
        'Students learn there are a lot of words written in block letters around them, and practice how to read lower-case letters.',
        'Students quiz each other about the alphabet around them.',
        'Students try talking about the letters of the alphabet while also considering their friends.'
      ],
      ja: [
        '身の回りにある看板や標識などの小文字（ブロック体）に親しみ、読めるようになろう。',
        '身の回りのアルファベットについて、友だちとクイズを出し合おう。',
        '相手に配慮しながら、アルファベットの文字について伝え合おう。'
      ]
    },
    targetExpressions: [
      {
        phraseEn: "Look. What's this? / Hint, please.",
        phraseJa: 'これ見て。何かな？／ヒントをください。',
        speechText: "Look! What's this? Hint, please."
      },
      {
        phraseEn: 'How many letters? / I have (six).',
        phraseJa: '何文字ある？／6文字あるよ。',
        speechText: 'How many letters? I have six.'
      },
      {
        phraseEn: 'Do you have (a "b")? / Yes, I do. / No, I don\'t.',
        phraseJa: '「b」はある？／うん、あるよ。／ううん、ないよ。',
        speechText: 'Do you have a "b"? Yes, I do. No, I don\'t.'
      },
      {
        phraseEn: "That's right. / Sorry. Try again.",
        phraseJa: '正解！／ざんねん、もう1回！',
        speechText: "That's right! Sorry. Try again."
      }
    ],
    targetVocabulary: [
      {
        category: 'Lower-case Alphabet (小文字)',
        words: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z']
      },
      {
        category: 'Textbook Signs & Real-World Words (街のかんばん)',
        words: ['bookstore', 'taxi', 'station', 'news', 'bus stop', 'supermarket', 'school', 'hospital', 'library', 'juice', 'police station']
      },
      {
        category: 'Quiz Colors (Activity 2: クイズ用の色)',
        words: ['red', 'blue', 'pink', 'green', 'brown', 'black', 'white', 'orange', 'purple', 'yellow']
      }
    ],
    letterBifurcation: {
      firstHalf: {
        range: ['a', 'm'],
        labelEn: 'A - M (First Half)',
        labelJa: 'a - m（前半 13文字）',
        page: 24,
        letters: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm']
      },
      secondHalf: {
        range: ['n', 'z'],
        labelEn: 'N - Z (Second Half)',
        labelJa: 'n - z（後半 13文字）',
        page: 25,
        letters: ['n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z']
      }
    },
    activities: [
      {
        id: 'lets_play_1',
        nameEn: 'Let’s Play 1: Look for the Alphabet in Town',
        nameJa: 'Let’s Play 1: 街のアルファベットさがし',
        descriptionEn: 'Students find the lower-case letters of the alphabet on billboards and signs in the textbook city illustration (P-O-L-I-C-E, B-O-O-K-S-T-O-R-E, T-A-X-I, P-parking, B-U-S S-T-O-P).',
        descriptionJa: '架空の街のイラスト（教科書24-25ページ）の看板や標識から小文字を探し、みんなの前で発表します。',
        targetItems: ['police', 'bookstore', 'taxi', 'bus stop', 'news', 'station', 'telephone', 'supermarket', 'juice', 'school', 'hospital', 'library']
      },
      {
        id: 'lets_play_2',
        nameEn: 'Let’s Play 2: Marble Game (おはじきゲーム)',
        nameJa: 'Let’s Play 2: おはじきゲーム（文字コール）',
        descriptionEn: 'Students place marbles or markers on alphabet letters on their textbook page. The teacher calls letters randomly one by one. Students pick up markers on called letters; first to collect all markers wins!',
        descriptionJa: '教科書のアルファベットの上におはじきを置き、先生がランダムに読み上げた文字のおはじきを取っていきます。すべて取れたら勝ち！',
        targetItems: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z']
      },
      {
        id: 'activity_1',
        nameEn: 'Activity 1: Sign Guessing Pair Quiz',
        nameJa: 'Activity 1: 街の看板当てペアクイズ',
        descriptionEn: 'Pair work: One student chooses a sign (e.g. NEWS). The partner asks "Do you have an S?" to guess which sign it is.',
        descriptionJa: 'ペアになり、看板を1つ選んで「Do you have an S?」と質問しながら何の看板か推理します。',
        script: [
          { speaker: 'Ayame', textEn: 'What is my sign?', textJa: '私の看板は何でしょう？' },
          { speaker: 'Ren', textEn: 'Do you have an "S"?', textJa: '「S」はある？' },
          { speaker: 'Ayame', textEn: 'Yes, I do. I have an "S".', textJa: 'うん、あるよ。「S」があるよ。' },
          { speaker: 'Ren', textEn: 'Do you have a "C"?', textJa: '「C」はある？' },
          { speaker: 'Ayame', textEn: 'No, I don\'t. I don\'t have a "C".', textJa: 'ううん、ないよ。「C」はないよ。' },
          { speaker: 'Ren', textEn: 'Do you have an "N"?', textJa: '「N」はある？' },
          { speaker: 'Ayame', textEn: 'Yes, I do. I have an "N".', textJa: 'うん、あるよ。「N」があるよ。' },
          { speaker: 'Ren', textEn: 'I got it! It\'s "NEWS".', textJa: 'わかった！「NEWS」だ！' },
          { speaker: 'Ayame', textEn: 'That\'s right! My sign is "NEWS".', textJa: '正解！私の看板は「NEWS」です。' }
        ]
      },
      {
        id: 'activity_2',
        nameEn: 'Activity 2: Favorite Color Guessing Pair Quiz',
        nameJa: 'Activity 2: 好きな色当てペアクイズ',
        descriptionEn: 'Pair work: One student chooses a favorite color. The partner asks "Do you have a \'b\'?" to guess the color.',
        descriptionJa: '好きな色を1つ選び、「Do you have a \'b\'?」など文字を聞きながらどの色かを当て合います。',
        script: [
          { speaker: 'Ayame', textEn: 'What\'s my favorite color? Please guess.', textJa: '私の好きな色は何でしょう？当ててみて。' },
          { speaker: 'Ren', textEn: 'OK. Do you have a "w"?', textJa: '「w」はある？' },
          { speaker: 'Ayame', textEn: 'No, I don\'t. I don\'t have a "w".', textJa: 'ううん、ないよ。' },
          { speaker: 'Ren', textEn: 'Do you have a "b"?', textJa: '「b」はある？' },
          { speaker: 'Ayame', textEn: 'Yes, I do. I have a "b".', textJa: 'うん、あるよ。' },
          { speaker: 'Ren', textEn: 'Do you have an "e"?', textJa: '「e」はある？' },
          { speaker: 'Ayame', textEn: 'Yes, I do. I have an "e".', textJa: 'うん、あるよ。' },
          { speaker: 'Ren', textEn: 'I got it! "Blue"!', textJa: 'わかった！「Blue（青）」だ！' },
          { speaker: 'Ayame', textEn: 'That\'s right. I like blue.', textJa: '正解！私は青が好きです。' }
        ]
      }
    ],
    teacherExpressions: [
      { phraseEn: 'Open your textbook to pages 24 and 25.', phraseJa: 'テキストの24、25ページを開けてください。' },
      { phraseEn: 'Very good.', phraseJa: 'とてもよいです。' },
      { phraseEn: 'Guess.', phraseJa: '推測して。／考えてごらん。' },
      { phraseEn: 'Good question.', phraseJa: 'いい質問です。' },
      { phraseEn: 'Write the numbers in the squares.', phraseJa: '四角の中に数を書きなさい。' },
      { phraseEn: 'Do you have a partner?', phraseJa: 'ペアはできましたか？' }
    ]
  },

  // =========================================================================
  // GRADE 3 - UNIT 6: ALPHABET (Uppercase)
  // =========================================================================
  'ES_G3_U6': {
    unitKey: 'ES_G3_U6',
    grade: 'ES_G3',
    unitNumber: 6,
    unitString: 'Unit 6: ALPHABET (アルファベットとなかよし)',
    titleEn: 'ALPHABET',
    titleJa: 'アルファベットとなかよし',
    subtitleEn: "Let's be friends with the alphabet",
    subtitleJa: 'アルファベットとなかよし',
    totalClasses: 3,
    aims: {
      en: [
        'Students become aware of and familiar with the shapes and sounds of uppercase letters.',
        'Students find uppercase alphabet letters hidden around them in school and daily life.',
        'Students introduce the first letters of their names with confidence.'
      ],
      ja: [
        '大文字のアルファベットの形や音声に慣れ親しもう。',
        '学校や身の回りにある大文字のアルファベットを見つけよう。',
        '自分の名前の最初の文字（頭文字）を自信を持って紹介しよう。'
      ]
    },
    targetExpressions: [
      {
        phraseEn: 'What\'s this? / It\'s an "A".',
        phraseJa: 'これなあに？／「A」だよ。',
        speechText: "What's this? It's an A."
      },
      {
        phraseEn: 'I like (blue). / (The "A" card), please.',
        phraseJa: '（青）が好きです。／（「A」のカード）をください。',
        speechText: 'The "A" card, please.'
      }
    ],
    targetVocabulary: [
      {
        category: 'Upper-case Alphabet (大文字)',
        words: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z']
      }
    ],
    letterBifurcation: {
      firstHalf: {
        range: ['A', 'M'],
        labelEn: 'A - M (First Half)',
        labelJa: 'A - M（前半 13文字）',
        page: 22,
        letters: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M']
      },
      secondHalf: {
        range: ['N', 'Z'],
        labelEn: 'N - Z (Second Half)',
        labelJa: 'N - Z（後半 13文字）',
        page: 23,
        letters: ['N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z']
      }
    },
    activities: [
      {
        id: 'g3_alphabet_search',
        nameEn: 'Alphabet Hunt: Hidden Letters',
        nameJa: 'かくれアルファベットをさがそう',
        descriptionEn: 'Students find uppercase letters hidden in real objects around school (gym ladders, bicycle racks, clocks).',
        descriptionJa: '校内にあるさまざまな物の中から大文字のアルファベットの形を見つけ出します。'
      }
    ],
    teacherExpressions: [
      { phraseEn: 'Look carefully.', phraseJa: 'よく見てごらん。' },
      { phraseEn: 'What letter is this?', phraseJa: 'この文字は何かな？' }
    ]
  },

  // =========================================================================
  // GRADE 3 - REMAINING UNITS (Let's Try! 1)
  // =========================================================================
  'ES_G3_U1': {
    unitKey: 'ES_G3_U1',
    grade: 'ES_G3',
    unitNumber: 1,
    unitString: 'Unit 1: Hello! (あいさつをして友だちになろう)',
    titleEn: 'Hello!',
    titleJa: 'あいさつをして友だちになろう',
    subtitleEn: "Let's greet friends around the world",
    subtitleJa: '世界のあいさつに親しもう',
    totalClasses: 4,
    aims: {
      en: [
        'Students become familiar with greetings from different countries and notice differences in gestures and sounds.',
        'Students greet teachers and friends cheerfully and introduce themselves using "Hello, I\'m ~."'
      ],
      ja: [
        'いろいろな国のあいさつに親しみ、ジェスチャーや音の違いに気づこう。',
        '「Hello, I\'m ~.」を使って、先生や友だちに元気よくあいさつしよう。'
      ]
    },
    targetExpressions: [
      { phraseEn: "Hello! / Hi! I'm (Ken).", phraseJa: 'こんにちは！／やあ！（ケン）です。', speechText: "Hello! I'm Ken." },
      { phraseEn: 'Nice to meet you. / Nice to meet you, too.', phraseJa: 'はじめまして。／こちらこそ、はじめまして。', speechText: 'Nice to meet you. Nice to meet you, too.' },
      { phraseEn: 'Goodbye! / See you!', phraseJa: 'さようなら！／またね！', speechText: 'Goodbye! See you!' }
    ],
    targetVocabulary: [{ category: 'Greetings (あいさつ)', words: ['hello', 'hi', 'goodbye', 'see you'] }],
    activities: [{ id: 'g3_u1_meishi', nameEn: 'Name Card Exchange', nameJa: '名刺交換ゲーム', descriptionEn: 'Students walk around, greet classmates in English, and exchange self-introduction cards.', descriptionJa: '教室を歩き回り、友だちと英語であいさつして名刺カードを交換します。' }],
    teacherExpressions: [
      { phraseEn: 'Let\'s say hello!', phraseJa: '元気にあいさつしよう！' },
      { phraseEn: 'Look at your friend\'s eyes.', phraseJa: '友だちの目を見て話そう。' }
    ]
  },
  'ES_G3_U2': {
    unitKey: 'ES_G3_U2',
    grade: 'ES_G3',
    unitNumber: 2,
    unitString: 'Unit 2: How are you? (ごきげんいかが？)',
    titleEn: 'How are you?',
    titleJa: 'ごきげんいかが？',
    subtitleEn: "Let's ask and express our feelings",
    subtitleJa: '今のきもちを伝え合おう',
    totalClasses: 4,
    aims: {
      en: [
        'Students ask how their friends are feeling and express their own feelings using gestures and facial expressions.',
        'Students become familiar with feeling adjectives such as happy, fine, great, hungry, sleepy, and tired.'
      ],
      ja: [
        'ジェスチャーや表情をつけながら、今の気持ちや調子をたずね合おう。',
        'happy, fine, hungry, sleepy などの気持ちを表す言葉に慣れ親しもう。'
      ]
    },
    targetExpressions: [
      { phraseEn: 'How are you? / I\'m (happy).', phraseJa: '元気ですか？／（うれしい）です。', speechText: "How are you? I'm happy." },
      { phraseEn: 'I\'m fine, thank you. And you?', phraseJa: '元気です、ありがとう。あなたは？', speechText: "I'm fine, thank you. And you?" }
    ],
    targetVocabulary: [{ category: 'Feelings (きもち)', words: ['happy', 'fine', 'great', 'good', 'hungry', 'sleepy', 'tired', 'sad', 'angry'] }],
    activities: [{ id: 'g3_u2_gesture', nameEn: 'Feelings Gesture Game', nameJa: 'きもちジェスチャーゲーム', descriptionEn: 'One student acts out a feeling while classmates guess by asking "How are you?".', descriptionJa: 'ジェスチャーを見て「How are you?」とたずね、気持ちを当てます。' }],
    teacherExpressions: [
      { phraseEn: 'Show me with a big gesture!', phraseJa: '大きなジェスチャーで表してみよう！' },
      { phraseEn: 'How are you today?', phraseJa: '今日はどんな気持ちかな？' }
    ]
  },
  'ES_G3_U3': {
    unitKey: 'ES_G3_U3',
    grade: 'ES_G3',
    unitNumber: 3,
    unitString: 'Unit 3: How many? (数えてあそぼう)',
    titleEn: 'How many?',
    titleJa: '数えてあそぼう',
    subtitleEn: "Let's count from 1 to 20",
    subtitleJa: '1から20まで数えてみよう',
    totalClasses: 4,
    aims: {
      en: [
        'Students become familiar with counting numbers from 1 to 20 in English.',
        'Students ask and answer "How many ~?" about familiar items and animals.'
      ],
      ja: [
        '1から20までの英語の数の言い方に慣れ親しもう。',
        '「How many ~?」を使って、身の回りのものの数をたずね合おう。'
      ]
    },
    targetExpressions: [
      { phraseEn: 'How many (apples)? / (Ten) (apples).', phraseJa: '（りんご）はいくつ？／（10）こです。', speechText: 'How many apples? Ten apples.' },
      { phraseEn: 'Yes. / No.', phraseJa: 'はい。／いいえ。', speechText: 'Yes. No.' }
    ],
    targetVocabulary: [{ category: 'Numbers 1-20 (数)', words: ['one', 'two', 'three', 'four', 'five', 'ten', 'fifteen', 'twenty'] }],
    activities: [{ id: 'g3_u3_count', nameEn: 'Counting Race', nameJa: 'いくつあるかな？ゲーム', descriptionEn: 'Students count classroom objects or picture cards and answer "How many?" quickly.', descriptionJa: '絵カードや教室のものの数を数えて「How many?」に答えます。' }],
    teacherExpressions: [
      { phraseEn: 'Let\'s count together!', phraseJa: 'いっしょに数えよう！' },
      { phraseEn: 'How many did you find?', phraseJa: 'いくつ見つかったかな？' }
    ]
  },
  'ES_G3_U4': {
    unitKey: 'ES_G3_U4',
    grade: 'ES_G3',
    unitNumber: 4,
    unitString: 'Unit 4: I like blue. (すきなものをつたえよう)',
    titleEn: 'I like blue.',
    titleJa: 'すきなものをつたえよう',
    subtitleEn: "Let's talk about colors and favorites",
    subtitleJa: '好きな色やものを伝え合おう',
    totalClasses: 4,
    aims: {
      en: [
        'Students become familiar with color names and rainbow colors in English.',
        'Students express what they like and don\'t like using "I like ~." and "I don\'t like ~."'
      ],
      ja: [
        'いろいろな色の英語の言い方に慣れ親しもう。',
        '「I like ~.」「I don\'t like ~.」を使って、好きなものを伝え合おう。'
      ]
    },
    targetExpressions: [
      { phraseEn: 'I like (blue). / I don\'t like (green).', phraseJa: '（青）が好きです。／（緑）は好きではありません。', speechText: "I like blue. I don't like green." },
      { phraseEn: 'Do you like (red)? / Yes, I do. / No, I don\'t.', phraseJa: '（赤）が好きですか？／はい。／いいえ。', speechText: 'Do you like red? Yes, I do.' }
    ],
    targetVocabulary: [{ category: 'Colors (色)', words: ['red', 'blue', 'yellow', 'green', 'pink', 'purple', 'orange', 'black', 'white', 'brown', 'rainbow'] }],
    activities: [{ id: 'g3_u4_rainbow', nameEn: 'My Rainbow Poster', nameJa: 'オリジナル虹ポスター', descriptionEn: 'Students color and present their favorite colors and items to classmates.', descriptionJa: '好きな色やものを選んで友だちに紹介します。' }],
    teacherExpressions: [
      { phraseEn: 'What color is this?', phraseJa: 'これは何色かな？' },
      { phraseEn: 'Me, too!', phraseJa: 'わたしも！' }
    ]
  },
  'ES_G3_U5': {
    unitKey: 'ES_G3_U5',
    grade: 'ES_G3',
    unitNumber: 5,
    unitString: 'Unit 5: What do you like? (何がすき？)',
    titleEn: 'What do you like?',
    titleJa: '何がすき？',
    subtitleEn: "Let's interview friends about favorites",
    subtitleJa: '好きな食べ物やスポーツをたずね合おう',
    totalClasses: 4,
    aims: {
      en: [
        'Students ask friends about their favorite foods, fruits, vegetables, and sports.',
        'Students become familiar with "What ~ do you like?" and "Do you like ~?"'
      ],
      ja: [
        '友だちに好きな食べ物、くだもの、野菜、スポーツをたずねよう。',
        '「What ~ do you like?」「Do you like ~?」の表現に慣れ親しもう。'
      ]
    },
    targetExpressions: [
      { phraseEn: 'What (sport) do you like? / I like (soccer).', phraseJa: '何の（スポーツ）が好きですか？／（サッカー）が好きです。', speechText: 'What sport do you like? I like soccer.' },
      { phraseEn: 'Do you like (apples)? / Yes, I do. / No, I don\'t.', phraseJa: '（りんご）が好きですか？／はい。／いいえ。', speechText: 'Do you like apples? Yes, I do.' }
    ],
    targetVocabulary: [{ category: 'Foods & Sports (食べ物・スポーツ)', words: ['apple', 'strawberry', 'tomato', 'carrot', 'milk', 'ice cream', 'baseball', 'soccer', 'basketball', 'swimming'] }],
    activities: [{ id: 'g3_u5_interview', nameEn: 'Favorites Survey', nameJa: 'すきなものインタビュー', descriptionEn: 'Students interview 3 classmates about their favorite fruit, vegetable, and sport.', descriptionJa: '友だち3人に好きな食べ物やスポーツをインタビューします。' }],
    teacherExpressions: [
      { phraseEn: 'Ask three friends!', phraseJa: '3人の友だちに聞いてみよう！' },
      { phraseEn: 'I see. Thank you.', phraseJa: 'なるほど、ありがとう。' }
    ]
  },
  'ES_G3_U7': {
    unitKey: 'ES_G3_U7',
    grade: 'ES_G3',
    unitNumber: 7,
    unitString: 'Unit 7: This is for you. (カードをおくろう)',
    titleEn: 'This is for you.',
    titleJa: 'カードをおくろう',
    subtitleEn: "Let's make and give a greeting card",
    subtitleJa: '形を組み合わせてカードをおくろう',
    totalClasses: 4,
    aims: {
      en: [
        'Students become familiar with shapes and sizes (big/small) in English.',
        'Students ask for shape cards politely and give a handmade card saying "This is for you."'
      ],
      ja: [
        '英語で形や大きさ（big/small）の言い方に慣れ親しもう。',
        'ほしい形のカードをお願いして作り、「This is for you.」とカードをおくろう。'
      ]
    },
    targetExpressions: [
      { phraseEn: 'What do you want? / A (big) (star), please.', phraseJa: '何がほしいですか？／（大きな）（星）をください。', speechText: 'What do you want? A big star, please.' },
      { phraseEn: 'Here you are. / Thank you. / You\'re welcome.', phraseJa: 'どうぞ。／ありがとう。／どういたしまして。', speechText: "Here you are. Thank you. You're welcome." },
      { phraseEn: 'This is for you.', phraseJa: 'これはあなたへのプレゼントです。', speechText: 'This is for you.' }
    ],
    targetVocabulary: [{ category: 'Shapes & Sizes (形・大きさ)', words: ['circle', 'triangle', 'square', 'rectangle', 'heart', 'diamond', 'star', 'big', 'small'] }],
    activities: [{ id: 'g3_u7_cardshop', nameEn: 'Shape Card Shop', nameJa: '形カード屋さんごっこ', descriptionEn: 'Students request colored shapes politely to assemble a greeting card for someone special.', descriptionJa: 'お店の人に欲しい色や形をお願いして、オリジナルカードを作ります。' }],
    teacherExpressions: [
      { phraseEn: 'How many stars do you want?', phraseJa: '星はいくつほしいですか？' },
      { phraseEn: 'Don\'t forget to say "Thank you!"', phraseJa: '「Thank you!」をわすれずにね！' }
    ]
  },
  'ES_G3_U8': {
    unitKey: 'ES_G3_U8',
    grade: 'ES_G3',
    unitNumber: 8,
    unitString: "Unit 8: What's this? (これなあに？)",
    titleEn: "What's this?",
    titleJa: 'これなあに？',
    subtitleEn: "Let's enjoy 3-hint quizzes",
    subtitleJa: 'スリーヒントクイズをしよう',
    totalClasses: 4,
    aims: {
      en: [
        'Students ask and answer "What\'s this?" and "It\'s a ~." using animal and nature vocabulary.',
        'Students give simple hints and enjoy guessing in 3-Hint Quizzes.'
      ],
      ja: [
        '動物などの言葉を使って、「What\'s this?」「It\'s a ~.」でたずね合おう。',
        'かんたんなヒントを出して、スリーヒントクイズを楽しもう。'
      ]
    },
    targetExpressions: [
      { phraseEn: "What's this? / Hint, please.", phraseJa: 'これなあに？／ヒントをください。', speechText: "What's this? Hint, please." },
      { phraseEn: "It's a (cat).", phraseJa: '（ねこ）だよ。', speechText: "It's a cat." }
    ],
    targetVocabulary: [{ category: 'Animals & Nature (動物・自然)', words: ['cat', 'dog', 'panda', 'bear', 'elephant', 'mouse', 'rabbit', 'monkey', 'tiger', 'tree'] }],
    activities: [{ id: 'g3_u8_3hint', nameEn: 'Animal 3-Hint Quiz', nameJa: '動物スリーヒントクイズ', descriptionEn: 'Students give 3 clues (category, color/size, sound) for classmates to guess the animal.', descriptionJa: '3つのヒントを出して、友だちがどの動物か当てるクイズをします。' }],
    teacherExpressions: [
      { phraseEn: 'One more hint, please!', phraseJa: 'もうひとつヒントをちょうだい！' },
      { phraseEn: 'Are you ready to guess?', phraseJa: '答えがわかったかな？' }
    ]
  },
  'ES_G3_U9': {
    unitKey: 'ES_G3_U9',
    grade: 'ES_G3',
    unitNumber: 9,
    unitString: 'Unit 9: Who are you? (きみはだれ？)',
    titleEn: 'Who are you?',
    titleJa: 'きみはだれ？',
    subtitleEn: "Let's read and act out a story",
    subtitleJa: '動物のお話を聞いたり演じたりしよう',
    totalClasses: 4,
    aims: {
      en: [
        'Students become familiar with body parts and descriptive adjectives (big, small, long, short, scary, furry, round, shiny).',
        'Students listen to and act out the story "Who are you?" using clues about animal features.'
      ],
      ja: [
        '体の部分や様子を表すことば（big, long, furry など）に慣れ親しもう。',
        '動物の特徴をヒントにして、「Who are you?」のお話を楽しもう。'
      ]
    },
    targetExpressions: [
      { phraseEn: 'Who are you? / Are you a (mouse)?', phraseJa: 'あなたはだれ？／（ねずみ）ですか？', speechText: 'Who are you? Are you a mouse?' },
      { phraseEn: 'I have (long) (ears).', phraseJa: 'わたしは（長い）（耳）を持っています。', speechText: 'I have long ears.' }
    ],
    targetVocabulary: [{ category: 'Body Parts & Features (体・特徴)', words: ['head', 'shoulders', 'knees', 'toes', 'eyes', 'ears', 'mouth', 'nose', 'long', 'short', 'furry', 'scary', 'round', 'shiny'] }],
    activities: [{ id: 'g3_u9_story', nameEn: 'Who Are You? Skit', nameJa: '動物なりきり劇', descriptionEn: 'Students describe their secret animal features and let friends guess who they are.', descriptionJa: '動物の特徴を英語でヒントにして、だれになりきっているか当て合います。' }],
    teacherExpressions: [
      { phraseEn: 'Touch your head and shoulders!', phraseJa: '頭と肩にさわってみよう！' },
      { phraseEn: 'Listen to the story carefully.', phraseJa: 'お話をよく聞いてみよう。' }
    ]
  },

  // =========================================================================
  // GRADE 4 - REMAINING UNITS (Let's Try! 2)
  // =========================================================================
  'ES_G4_U1': {
    unitKey: 'ES_G4_U1',
    grade: 'ES_G4',
    unitNumber: 1,
    unitString: 'Unit 1: Hello, world! (世界のいろいろなことばであいさつをしよう)',
    titleEn: 'Hello, world!',
    titleJa: '世界のいろいろなことばであいさつをしよう',
    subtitleEn: "Let's greet people around the world",
    subtitleJa: '世界の時間やあいさつに親しもう',
    totalClasses: 4,
    aims: {
      en: [
        'Students become familiar with time-of-day greetings (Good morning, Good afternoon, Good night) and greetings from various countries.',
        'Students ask friends what games or activities they like using "Let\'s ~."'
      ],
      ja: [
        '時間帯によるあいさつ（Good morning など）や世界のあいさつに慣れ親しもう。',
        'あいさつを交わしたあと、友だちと好きな遊びをたずね合おう。'
      ]
    },
    targetExpressions: [
      { phraseEn: 'Good morning! / Good afternoon! / Good night!', phraseJa: 'おはようございます！／こんにちは！／おやすみなさい！', speechText: 'Good morning! Good afternoon! Good night!' },
      { phraseEn: 'Hello, world! / Goodbye! / See you!', phraseJa: '世界中の人たち、こんにちは！／さようなら！／またね！', speechText: 'Hello, world! Goodbye! See you!' }
    ],
    targetVocabulary: [{ category: 'Time Greetings (あいさつ)', words: ['hello', 'good morning', 'good afternoon', 'good night', 'goodbye', 'see you', 'morning', 'afternoon', 'night', 'world'] }],
    activities: [{ id: 'g4_u1_world', nameEn: 'World Greetings Relay', nameJa: '世界のあいさつリレー', descriptionEn: 'Students greet classmates with time-of-day and international greetings.', descriptionJa: '時間帯や国に合わせたあいさつを友だちと交わします。' }],
    teacherExpressions: [
      { phraseEn: 'What time is it in London?', phraseJa: 'ロンドンは今何時かな？' },
      { phraseEn: 'Let\'s greet with a big smile!', phraseJa: '笑顔であいさつしよう！' }
    ]
  },
  'ES_G4_U2': {
    unitKey: 'ES_G4_U2',
    grade: 'ES_G4',
    unitNumber: 2,
    unitString: "Unit 2: Let's play cards. (すきな遊びをつたえよう)",
    titleEn: "Let's play cards.",
    titleJa: 'すきな遊びをつたえよう',
    subtitleEn: "Let's talk about weather, clothes, and play",
    subtitleJa: '天気や服装に合わせて遊びにさそおう',
    totalClasses: 4,
    aims: {
      en: [
        'Students ask and answer about the weather ("How\'s the weather? It\'s sunny.") and clothing.',
        'Students invite friends to play using "Let\'s play cards / dodgeball / tag!"'
      ],
      ja: [
        '天気のたずね方・答え方（How\'s the weather?）や衣服の英語に慣れ親しもう。',
        '天気に合わせて「Let\'s play cards!」のように遊びに誘い合おう。'
      ]
    },
    targetExpressions: [
      { phraseEn: "How's the weather? / It's (sunny).", phraseJa: '天気はどうですか？／（晴れ）です。', speechText: "How's the weather? It's sunny." },
      { phraseEn: "Let's (play cards)! / Put on your (jacket).", phraseJa: '（トランプをしよう）！／（ジャケット）を着よう。', speechText: "Let's play cards! Put on your jacket." }
    ],
    targetVocabulary: [{ category: 'Weather, Clothes & Play (天気・服・遊び)', words: ['sunny', 'cloudy', 'rainy', 'snowy', 'hot', 'cold', 'cap', 'jacket', 'shirt', 'shorts', 'pants', 'boots', 'play cards', 'play dodgeball', 'play tag', 'make a snowman'] }],
    activities: [{ id: 'g4_u2_tpr', nameEn: 'Weather & Gesture Simon Says', nameJa: '天気とジェスチャーゲーム', descriptionEn: 'Students react to weather prompts and TPR commands (stand up, sit down, jump, run, turn around).', descriptionJa: '天気や動きの指示に合わせて体を動かしながら英語に親しみます。' }],
    teacherExpressions: [
      { phraseEn: "How's the weather today?", phraseJa: '今日の天気はどうかな？' },
      { phraseEn: "Let's play together!", phraseJa: 'いっしょに遊ぼう！' }
    ]
  },
  'ES_G4_U3': {
    unitKey: 'ES_G4_U3',
    grade: 'ES_G4',
    unitNumber: 3,
    unitString: 'Unit 3: I like Mondays. (好きな曜日を伝え合おう)',
    titleEn: 'I like Mondays.',
    titleJa: '好きな曜日を伝え合おう',
    subtitleEn: "Let's talk about days of the week",
    subtitleJa: '曜日の言い方に慣れ親しもう',
    totalClasses: 4,
    aims: {
      en: [
        'Students become familiar with the seven days of the week in English.',
        'Students talk about their favorite day of the week and why they like it.'
      ],
      ja: [
        '日曜日から土曜日までの英語の言い方に慣れ親しもう。',
        '自分の好きな曜日を友だちと伝え合おう。'
      ]
    },
    targetExpressions: [
      { phraseEn: 'What day is it? / It\'s (Monday).', phraseJa: '何曜日ですか？／（月曜日）です。', speechText: "What day is it? It's Monday." },
      { phraseEn: 'I like (Mondays). / Do you like (Fridays)?', phraseJa: '（月曜日）が好きです。／（金曜日）が好きですか？', speechText: 'I like Mondays.' }
    ],
    targetVocabulary: [{ category: 'Days of the Week (曜日)', words: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] }],
    activities: [{ id: 'g4_u3_days', nameEn: 'Days of the Week Chant & Bingo', nameJa: '曜日チャンツ＆ビンゴ', descriptionEn: 'Students chant the 7 days and interview classmates about their favorite day.', descriptionJa: '曜日のチャンツを歌い、好きな曜日をビンゴ形式で聞き合います。' }],
    teacherExpressions: [
      { phraseEn: 'What day is it today?', phraseJa: '今日は何曜日かな？' },
      { phraseEn: 'Why do you like Fridays?', phraseJa: 'どうして金曜日が好きなの？' }
    ]
  },
  'ES_G4_U4': {
    unitKey: 'ES_G4_U4',
    grade: 'ES_G4',
    unitNumber: 4,
    unitString: 'Unit 4: What time is it? (今、何時？)',
    titleEn: 'What time is it?',
    titleJa: '今、何時？',
    subtitleEn: "Let's ask and tell the time",
    subtitleJa: '世界の時間や自分の時刻を伝え合おう',
    totalClasses: 4,
    aims: {
      en: [
        'Students become familiar with numbers 1–60 for telling time.',
        'Students ask "What time is it?" and respond with "It\'s (7:30). It\'s (breakfast) time."'
      ],
      ja: [
        '時刻を表す1から60までの数字に慣れ親しもう。',
        '「What time is it?」「It\'s ~. It\'s ~ time.」を使って時刻を伝え合おう。'
      ]
    },
    targetExpressions: [
      { phraseEn: 'What time is it? / It\'s (8:15).', phraseJa: '今、何時ですか？／（8時15分）です。', speechText: "What time is it? It's eight fifteen." },
      { phraseEn: "It's (TV time)!", phraseJa: '（テレビの時間）だよ！', speechText: "It's TV time!" }
    ],
    targetVocabulary: [{ category: 'Time & Numbers (時刻・数字)', words: ['one', 'ten', 'eleven', 'twelve', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'TV time'] }],
    activities: [{ id: 'g4_u4_clock', nameEn: 'What Time Is It, Mr. Wolf?', nameJa: 'おおかみさん今何時？', descriptionEn: 'Students ask the time and step forward until "It\'s lunch time!"', descriptionJa: '時刻をたずねながら進み、おおかみの合図で逃げます。' }],
    teacherExpressions: [
      { phraseEn: 'Look at the clock!', phraseJa: '時計を見てみよう！' },
      { phraseEn: 'What time is your favorite time?', phraseJa: '1日の中で何時が一番好き？' }
    ]
  },
  'ES_G4_U5': {
    unitKey: 'ES_G4_U5',
    grade: 'ES_G4',
    unitNumber: 5,
    unitString: 'Unit 5: Do you have a pen? (おすすめ文房具セットを作ろう)',
    titleEn: 'Do you have a pen?',
    titleJa: 'おすすめ文房具セットを作ろう',
    subtitleEn: "Let's ask about stationery items",
    subtitleJa: '文房具を持っているかたずね合おう',
    totalClasses: 4,
    aims: {
      en: [
        'Students become familiar with stationery vocabulary in singular and plural forms.',
        'Students ask "Do you have a ~?" and recommend a stationery set to a friend.'
      ],
      ja: [
        '文房具の単数形・複数形の言い方に慣れ親しもう。',
        '「Do you have a ~?」を使って、友だちにおすすめの文房具セットを作ろう。'
      ]
    },
    targetExpressions: [
      { phraseEn: 'Do you have a (pen)? / Yes, I do. / No, I don\'t.', phraseJa: '（ペン）を持っていますか？／はい、持っています。／いいえ。', speechText: 'Do you have a pen? Yes, I do.' },
      { phraseEn: 'I have (two pens) and (a ruler).', phraseJa: 'わたしは（ペン2本）と（じょうぎ1本）を持っています。', speechText: 'I have two pens and a ruler.' }
    ],
    targetVocabulary: [{ category: 'Stationery (文房具)', words: ['pen', 'pens', 'pencil', 'pencils', 'eraser', 'erasers', 'ruler', 'rulers', 'notebook', 'notebooks', 'pencil case', 'stapler', 'scissors', 'calendar'] }],
    activities: [{ id: 'g4_u5_set', nameEn: 'Dream Stationery Set', nameJa: 'おすすめ文房具セット紹介', descriptionEn: 'Students collect stationery cards by asking classmates "Do you have ~?" and present their set.', descriptionJa: '友だちと文房具カードを交換し、おすすめセットを紹介します。' }],
    teacherExpressions: [
      { phraseEn: 'How many pencils do you have?', phraseJa: 'えんぴつは何本持っているかな？' },
      { phraseEn: 'Check your pencil case!', phraseJa: 'ふでばこの中を見てみよう！' }
    ]
  },
  'ES_G4_U7': {
    unitKey: 'ES_G4_U7',
    grade: 'ES_G4',
    unitNumber: 7,
    unitString: 'Unit 7: What do you want? (ほしいものをたずねよう)',
    titleEn: 'What do you want?',
    titleJa: 'ほしいものをたずねよう',
    subtitleEn: "Let's make an original parfait or pizza",
    subtitleJa: 'パフェやピザの材料をお願いしよう',
    totalClasses: 4,
    aims: {
      en: [
        'Students become familiar with fruit and vegetable names in plural forms.',
        'Students politely ask for ingredients using "What do you want?" and "I want ~, please."'
      ],
      ja: [
        'くだものや野菜の複数形の言い方に慣れ親しもう。',
        '「What do you want?」「I want ~, please.」を使ってオリジナル料理を作ろう。'
      ]
    },
    targetExpressions: [
      { phraseEn: 'What do you want? / I want (strawberries), please.', phraseJa: '何がほしいですか？／（いちご）をください。', speechText: 'What do you want? I want strawberries, please.' },
      { phraseEn: 'How many? / (Three), please. / Here you are.', phraseJa: 'いくつですか？／（3つ）ください。／どうぞ。', speechText: 'How many? Three, please.' }
    ],
    targetVocabulary: [{ category: 'Fruits & Vegetables (くだもの・野菜)', words: ['apples', 'bananas', 'cherries', 'grapes', 'kiwis', 'melons', 'oranges', 'peaches', 'pineapples', 'strawberries', 'tomatoes', 'potatoes', 'onions', 'corn'] }],
    activities: [{ id: 'g4_u7_parfait', nameEn: 'Original Parfait Shop', nameJa: 'オリジナルパフェ屋さん', descriptionEn: 'Students order toppings politely from classmates to design a custom parfait.', descriptionJa: 'お店の人と客に分かれて、好きなフルーツを注文しパフェを完成させます。' }],
    teacherExpressions: [
      { phraseEn: 'What fruits do you want?', phraseJa: 'どのフルーツがほしいかな？' },
      { phraseEn: 'It looks delicious!', phraseJa: 'とってもおいしそうだね！' }
    ]
  },
  'ES_G4_U8': {
    unitKey: 'ES_G4_U8',
    grade: 'ES_G4',
    unitNumber: 8,
    unitString: 'Unit 8: This is my favorite place. (お気に入りの場所をしょうかいしよう)',
    titleEn: 'This is my favorite place.',
    titleJa: 'お気に入りの場所をしょうかいしよう',
    subtitleEn: "Let's give directions around school",
    subtitleJa: '校内の道案内をしよう',
    totalClasses: 4,
    aims: {
      en: [
        'Students become familiar with school room names and direction phrases (Go straight, Turn right, Turn left).',
        'Students guide visitors to their favorite room in the school.'
      ],
      ja: [
        '学校の教室名や道案内の表現（Go straight, Turn right/left）に慣れ親しもう。',
        '校内のお気に入りの場所まで、英語で道案内しよう。'
      ]
    },
    targetExpressions: [
      { phraseEn: 'Where is the (music room)? / Go straight. Turn (right).', phraseJa: '（音楽室）はどこですか？／まっすぐ行って、（右）に曲がってね。', speechText: 'Where is the music room? Go straight. Turn right.' },
      { phraseEn: 'This is my favorite place. / I like (reading books) here.', phraseJa: 'ここがわたしのお気に入りの場所です。', speechText: 'This is my favorite place.' }
    ],
    targetVocabulary: [{ category: 'School Rooms & Directions (教室・道案内)', words: ['classroom', 'library', 'music room', 'science room', 'gym', 'playground', 'restroom', 'entrance', 'go straight', 'turn left', 'turn right'] }],
    activities: [{ id: 'g4_u8_guide', nameEn: 'School Tour Guide', nameJa: '学校案内ガイド', descriptionEn: 'Students give step-by-step directions on a school map to reach their favorite room.', descriptionJa: '学校の地図を使って、お気に入りの教室までの道順を英語で案内します。' }],
    teacherExpressions: [
      { phraseEn: 'Follow my directions!', phraseJa: '道案内の通りに動いてみよう！' },
      { phraseEn: 'Where are we now?', phraseJa: '今どこに着いたかな？' }
    ]
  },
  'ES_G4_U9': {
    unitKey: 'ES_G4_U9',
    grade: 'ES_G4',
    unitNumber: 9,
    unitString: 'Unit 9: This is my day. (ぼくの一日、わたしの一日)',
    titleEn: 'This is my day.',
    titleJa: 'ぼくの一日、わたしの一日',
    subtitleEn: "Let's present our daily routine",
    subtitleJa: '1日の生活を紹介しよう',
    totalClasses: 4,
    aims: {
      en: [
        'Students become familiar with daily routine expressions (wake up, have breakfast, go to school, do my homework, go to bed).',
        'Students present their daily schedule and compare routines with friends.'
      ],
      ja: [
        '1日の生活を表す表現（wake up, go to school など）に慣れ親しもう。',
        '自分の1日の生活リズムについて、友だちと紹介し合おう。'
      ]
    },
    targetExpressions: [
      { phraseEn: 'I (wake up) at (7:00). / What time do you (go to bed)?', phraseJa: 'わたしは（7時）に（起きます）。／何時に（寝ます）か？', speechText: 'I wake up at seven.' },
      { phraseEn: 'It\'s time to (go to school).', phraseJa: '（学校へ行く）時間です。', speechText: "It's time to go to school." }
    ],
    targetVocabulary: [{ category: 'Daily Routine (1日の生活)', words: ['wake up', 'get up', 'have breakfast', 'brush my teeth', 'go to school', 'go home', 'do my homework', 'take a bath', 'go to bed'] }],
    activities: [{ id: 'g4_u9_day', nameEn: 'My Daily Schedule Poster', nameJa: 'ぼく・わたしの1日紹介', descriptionEn: 'Students draw a 1-day clock chart and present their routine to classmates.', descriptionJa: '1日の時計シートを作って、自分の生活を英語で発表します。' }],
    teacherExpressions: [
      { phraseEn: 'What time do you get up?', phraseJa: '朝は何時に起きるのかな？' },
      { phraseEn: 'Great presentation!', phraseJa: 'すばらしい発表だったね！' }
    ]
  },

  // =========================================================================
  // JHS GRADE 1 - BORDERLINK DOC 10 (6-PUBLISHER MEXT ALIGNMENT) & DOC 13
  // =========================================================================
  'JHS_G1_U1': {
    unitKey: 'JHS_G1_U1',
    grade: 'JHS_G1',
    unitNumber: 1,
    unitString: 'Unit 1: Self-Intro & Be-Verb (L1-L9)',
    textbookAlignment: { NC: 'L1, L3', NH: 'U1, U2', HG: 'U1-U4', OW: 'L1-L3', BS: 'U1, U2', SU: 'P1-P4' },
    titleEn: 'Self-Intro & Be-Verb',
    titleJa: '自己紹介とbe動詞・疑問詞（L1〜L9）',
    subtitleEn: 'I am / Are you / He is / This is',
    subtitleJa: '自分や家族・身の回りのものを紹介しよう',
    totalClasses: 9,
    aims: {
      en: ['Master affirmative, negative, and question forms of the be-verb (am/are/is) and demonstratives (this/that).'],
      ja: ['be動詞（am, are, is）の肯定文・否定文・疑問文と this/that を使って自己紹介や他己紹介をしよう。']
    },
    targetExpressions: [
      { phraseEn: 'I am (Ken). / Are you in the (tennis) club?', phraseJa: 'わたしは（ケン）です。／（テニス）部に入っていますか？' },
      { phraseEn: 'Who is he? / He is my (classmate).', phraseJa: '彼はだれですか？／わたしの（クラスメイト）です。' },
      { phraseEn: 'What is this? / This is my (hamster).', phraseJa: 'これは何ですか？／わたしの（ハムスター）です。' }
    ],
    targetVocabulary: [{ category: 'People & Introduction', words: ['classmate', 'pretty', 'handsome', 'basketball player', "o'clock"] }],
    activities: [{ id: 'jhs1_u1_bingo', nameEn: 'Nice To Meet You Bingo & Interview', nameJa: '自己紹介インタビュー＆ビンゴ', descriptionEn: 'Students interview classmates using be-verb and wh-questions.', descriptionJa: 'be動詞と疑問詞（Who/What）を使ってクラスメイトにインタビューします。' }],
    teacherExpressions: [{ phraseEn: 'Introduce your partner to the class!', phraseJa: 'ペアの友だちをみんなに紹介しよう！' }]
  },
  'JHS_G1_U2': {
    unitKey: 'JHS_G1_U2',
    grade: 'JHS_G1',
    unitNumber: 2,
    unitString: 'Unit 2: Likes, Sports & Japanese Culture (L10-L18)',
    textbookAlignment: { NC: 'L1, L2', NH: 'U1-U3', HG: 'U1-U3', OW: 'L1, L2', BS: 'U3, U4', SU: 'P1-P3, P7' },
    titleEn: 'Likes, Sports & Japanese Culture',
    titleJa: '一般動詞（like / play / have）と疑問詞（L10〜L18）',
    subtitleEn: 'Do you like ~? / What sport do you play? / How many ~?',
    subtitleJa: '好きな食べ物やスポーツ・持ち物の数をたずね合おう',
    totalClasses: 9,
    aims: {
      en: ['Ask and answer about preferences, sports, and quantities using general verbs and How many ~?'],
      ja: ['一般動詞（like, play, have）の疑問文・否定文や How many ~? を使って好みや数を伝え合おう。']
    },
    targetExpressions: [
      { phraseEn: 'Do you like (natto)? / Yes, I do. / No, I don\'t.', phraseJa: '（納豆）は好きですか？／はい。／いいえ。' },
      { phraseEn: 'What sport do you play? / I play (ping-pong).', phraseJa: '何のスポーツをしますか？／（卓球）をします。' },
      { phraseEn: 'How many (pens) do you have?', phraseJa: '（ペン）を何本持っていますか？' }
    ],
    targetVocabulary: [{ category: 'Culture, Food & Games', words: ['natto', 'yakisoba', 'takoyaki', 'chicken soup', 'ping-pong', 'handball', 'golf', 'video games', 'board games', 'shogi', 'chess', 'anime'] }],
    activities: [{ id: 'jhs1_u2_combo', nameEn: 'Like / Play Interview & Combo Sentences', nameJa: '好き・スポーツ質問ゲーム', descriptionEn: 'Students ask and answer what foods, games, and sports classmates enjoy.', descriptionJa: '好きな和食やスポーツ、ゲームについて英語で質問し合います。' }],
    teacherExpressions: [{ phraseEn: 'Ask a follow-up question!', phraseJa: 'もうひとつ質問を続けてみよう！' }]
  },
  'JHS_G1_U3': {
    unitKey: 'JHS_G1_U3',
    grade: 'JHS_G1',
    unitNumber: 3,
    unitString: 'Unit 3: Can & World Languages (L19-L26)',
    textbookAlignment: { NC: 'L2', NH: 'U1, U3, U4', HG: 'U1, U2, U5', OW: 'L1, L2', BS: 'U4, U5, U7', SU: 'P1-P3, P5' },
    titleEn: 'Can & World Languages',
    titleJa: '助動詞 can と時刻・When（L19〜L26）',
    subtitleEn: 'Can you speak ~? / What time ~? / When do you ~?',
    subtitleJa: 'できることや世界の時間・習慣をたずね合おう',
    totalClasses: 8,
    aims: {
      en: ['Express abilities with can/can\'t and ask about schedules using What time and When.'],
      ja: ['助動詞 can を使ってできることを伝え合い、What time / When で生活時間をたずね合おう。']
    },
    targetExpressions: [
      { phraseEn: 'Can you speak (Spanish)? / Yes, I can. / No, I can\'t.', phraseJa: '（スペイン語）を話せますか？／はい。／いいえ。' },
      { phraseEn: 'When do you eat special foods?', phraseJa: 'いつ特別な料理を食べますか？' }
    ],
    targetVocabulary: [{ category: 'Languages, Instruments & Weather', words: ['Spanish', 'French', 'Italian', 'saxophone', 'windy', 'stormy'] }],
    activities: [{ id: 'jhs1_u3_lie', nameEn: 'Can You? Guess the Lie', nameJa: 'できることクイズ（本当？ウソ？）', descriptionEn: 'Students state 3 things they can do (including 1 lie) and classmates ask questions to guess.', descriptionJa: '「できること」を3つ言い、どれがウソか質問して見破ります。' }],
    teacherExpressions: [{ phraseEn: 'Can you show us?', phraseJa: '実際にやって見せてくれるかな？' }]
  },
  'JHS_G1_U4': {
    unitKey: 'JHS_G1_U4',
    grade: 'JHS_G1',
    unitNumber: 4,
    unitString: 'Unit 4: Third-Person Singular -s (L27-L30)',
    textbookAlignment: { NC: 'L4', NH: 'U6', HG: 'U5', OW: 'L3', BS: 'U6', SU: 'P5' },
    titleEn: 'Third-Person Singular -s',
    titleJa: '三人称単数現在形（does / -s）（L27〜L30）',
    subtitleEn: 'He plays ~ / Does she like ~?',
    subtitleJa: '家族や友だちの普段の様子を紹介しよう',
    totalClasses: 4,
    aims: {
      en: ['Use 3rd-person singular present verbs (-s/-es/-ies) and does/doesn\'t to introduce family and friends.'],
      ja: ['三人称単数現在形（plays, likes, studies）と Does he/she ~? を使って身近な人を紹介しよう。']
    },
    targetExpressions: [
      { phraseEn: 'He (plays) the piano after school.', phraseJa: '彼は放課後ピアノを（弾きます）。' },
      { phraseEn: 'Does she (like) anime? / Yes, she does.', phraseJa: '彼女はアニメが（好き）ですか？／はい、好きです。' }
    ],
    targetVocabulary: [{ category: '3rd-Person Verbs (-s)', words: ['plays', 'likes', 'studies', 'makes', 'gives'] }],
    activities: [{ id: 'jhs1_u4_jeopardy', nameEn: 'Everybody Likes Jeopardy', nameJa: '友だち紹介クイズ', descriptionEn: 'Students quiz each other about family members and classmates using Does he/she ~?', descriptionJa: '家族や友だちの習慣について三人称単数の文でクイズを出し合います。' }],
    teacherExpressions: [{ phraseEn: 'Don\'t forget the "-s" for he and she!', phraseJa: '主語が He / She のときの s を忘れずに！' }]
  },
  'JHS_G1_U5': {
    unitKey: 'JHS_G1_U5',
    grade: 'JHS_G1',
    unitNumber: 5,
    unitString: 'Unit 5: Simple Past Tense (L31-L34)',
    textbookAlignment: { NC: 'L6', NH: 'U10, U11', HG: 'U7', OW: 'L4', BS: 'U9', SU: 'P9' },
    titleEn: 'Simple Past Tense',
    titleJa: '一般動詞の過去形と Did you ~?（L31〜L34）',
    subtitleEn: 'I visited ~ / Did you do your homework?',
    subtitleJa: '昨日したことや休みの思い出を伝え合おう',
    totalClasses: 4,
    aims: {
      en: ['Talk about past events and vacation memories using regular (-ed) and irregular past verbs and Did you ~?'],
      ja: ['過去形（-ed・不規則動詞）と Did you ~? を使って、昨日したことや思い出を話そう。']
    },
    targetExpressions: [
      { phraseEn: 'I (visited) Kyoto yesterday.', phraseJa: 'わたしは昨日、京都を（訪れました）。' },
      { phraseEn: 'Did you (study) last night? / Yes, I did.', phraseJa: '昨夜（勉強しました）か？／はい、しました。' }
    ],
    targetVocabulary: [{ category: 'Past Actions', words: ['yesterday', 'studied', 'helped', 'washed'] }],
    activities: [{ id: 'jhs1_u5_past', nameEn: 'What Did You Do Yesterday? Interview', nameJa: 'きのう何した？インタビュー', descriptionEn: 'Students interview classmates about their weekend and yesterday activities.', descriptionJa: '昨日や週末にしたことを Did you ~? でインタビューし合います。' }],
    teacherExpressions: [{ phraseEn: 'How was your weekend?', phraseJa: '週末はどうだった？' }]
  },
  'JHS_G1_U6': {
    unitKey: 'JHS_G1_U6',
    grade: 'JHS_G1',
    unitNumber: 6,
    unitString: 'Unit 6: Present Progressive -ing (L35-L40)',
    textbookAlignment: { NC: 'L5', NH: 'U4, U8', HG: 'U5, U7, U8', OW: 'L5, L7', BS: 'U3, U10', SU: 'P8' },
    titleEn: 'Present Progressive -ing',
    titleJa: '現在進行形・命令文・感嘆文（L35〜L40）',
    subtitleEn: 'What are you doing? / He is playing ~',
    subtitleJa: '今していることを実況しよう',
    totalClasses: 6,
    aims: {
      en: ['Describe actions happening right now using be + ~ing, imperatives, and exclamations.'],
      ja: ['現在進行形（be動詞 + ~ing）を使って、今まさにしていることをたずね合おう。']
    },
    targetExpressions: [
      { phraseEn: 'What are you doing? / I am (writing) a (letter).', phraseJa: '今何をしていますか？／（手紙）を（書いています）。' },
      { phraseEn: 'How interesting! / What a big dog!', phraseJa: 'なんておもしろいんだろう！／なんて大きな犬なんだろう！' }
    ],
    targetVocabulary: [{ category: 'Progressive Actions (-ing)', words: ['eating', 'writing', 'making', 'watching movies', 'letter'] }],
    activities: [{ id: 'jhs1_u6_park', nameEn: 'What Are You Doing? Live Report', nameJa: '今なにしている？実況ゲーム', descriptionEn: 'Students act out or spot actions in a picture scene and describe them in present progressive.', descriptionJa: '絵の中の人物や友だちのジェスチャーを見て現在進行形で実況します。' }],
    teacherExpressions: [{ phraseEn: 'What is happening right now?', phraseJa: '今まさに何が起きているかな？' }]
  },
  'JHS_G1_U7': {
    unitKey: 'JHS_G1_U7',
    grade: 'JHS_G1',
    unitNumber: 7,
    unitString: 'Unit 7: Opinion & Reason Debate (Doc 13 G1)',
    textbookAlignment: { NC: 'L1-L6', NH: 'U1-U10', HG: 'U1-U8', OW: 'L1-L5', BS: 'U1-U10', SU: 'P1-P9' },
    titleEn: 'Opinion & Reason Debate (JHS G1)',
    titleJa: '理由を添えて自分の意見を伝えよう（中1ディベート）',
    subtitleEn: 'What ~ do you like? Why? / Because ~',
    subtitleJa: '理由と詳しい説明をつけて自分の考えを発表しよう',
    totalClasses: 5,
    aims: {
      en: ['State a clear preference and support it with reasons and detailed explanations using can/cannot.'],
      ja: ['好きな季節・修学旅行先・キャラクターについて、理由と詳しい説明（detailed explanation）を添えて発表しよう。']
    },
    targetExpressions: [
      { phraseEn: 'Who is your (favorite character)? Why?', phraseJa: 'あなたの（お気に入りのキャラクター）はだれですか？なぜですか？' },
      { phraseEn: 'Because it is very (useful) and fun!', phraseJa: 'なぜなら、とても（役に立って）楽しいからです！' }
    ],
    targetVocabulary: [{ category: 'Opinion & Debate (G1)', words: ['favorite character', 'detailed', 'useful'] }],
    activities: [{ id: 'jhs1_u7_debate', nameEn: '1-Minute Opinion & Reason Pitch', nameJa: '1分間オピニオン発表', descriptionEn: 'Students present their opinion + reason + supporting detail on familiar school topics.', descriptionJa: '身近なテーマについて「意見＋理由＋具体例」の3ステップで発表します。' }],
    teacherExpressions: [{ phraseEn: 'Tell us "Why?" with a concrete example!', phraseJa: '具体的な例をあげて「なぜ？」を伝えてみよう！' }]
  },

  // =========================================================================
  // JHS GRADE 2 - BORDERLINK DOC 11 (6-PUBLISHER MEXT ALIGNMENT) & DOC 13
  // =========================================================================
  'JHS_G2_U1': {
    unitKey: 'JHS_G2_U1',
    grade: 'JHS_G2',
    unitNumber: 1,
    unitString: 'Unit 1: Past Stories & Irregular Past (L1-L4)',
    textbookAlignment: { NC: 'G1 L6, L7', NH: 'G2 U0, U1', HG: 'U1, G1 U7', OW: 'G1 L4, L5', BS: 'U1, G1 U8', SU: 'G1 P9, P10' },
    titleEn: 'Past Stories & Irregular Past',
    titleJa: '不規則動詞の過去形と過去進行形（L1〜L4）',
    subtitleEn: 'was / were / What were you doing?',
    subtitleJa: '週末の出来事やその時していたことを話そう',
    totalClasses: 4,
    aims: {
      en: ['Narrate past experiences using irregular past verbs, was/were, and past progressive (was/were ~ing).'],
      ja: ['不規則動詞の過去形や過去進行形（was/were ~ing）を使って出来事を詳しく伝えよう。']
    },
    targetExpressions: [
      { phraseEn: 'What were you doing at 8:00? / I was reading.', phraseJa: '8時に何をしていましたか？／本を読んでいました。' },
      { phraseEn: 'I (found) a traditional (village) and (took) pictures.', phraseJa: '伝統的な（村）を（見つけて）写真を（撮りました）。' }
    ],
    targetVocabulary: [{ category: 'Irregular Past & Stories', words: ['found', 'took', 'forgot', 'told', 'said', 'heard', 'village', 'traditional'] }],
    activities: [{ id: 'jhs2_u1_alibi', nameEn: 'Past Progressive Alibi Game', nameJa: 'アリバイ探しゲーム（過去進行形）', descriptionEn: 'Students ask "What were you doing at ~?" to test alibis.', descriptionJa: '「その時刻に何をしていたか」を過去進行形で質問し合います。' }],
    teacherExpressions: [{ phraseEn: 'Use irregular past verbs accurately!', phraseJa: '不規則動詞の過去形をしっかり使ってみよう！' }]
  },
  'JHS_G2_U2': {
    unitKey: 'JHS_G2_U2',
    grade: 'JHS_G2',
    unitNumber: 2,
    unitString: 'Unit 2: Future Plans & Phone Calls (L5-L8)',
    textbookAlignment: { NC: 'G1 L8, G2 L4', NH: 'G2 U1', HG: 'U3', OW: 'G1 L8', BS: 'U2, LT4', SU: 'P1' },
    titleEn: 'Future Plans & Phone Calls',
    titleJa: '未来表現（be going to / will）と電話の依頼（L5〜L8）',
    subtitleEn: 'I am going to ~ / It will be ~ / Will you ~?',
    subtitleJa: 'これからの予定や予想・電話での伝言を伝えよう',
    totalClasses: 4,
    aims: {
      en: ['Talk about future plans and predictions with be going to and will, and make polite phone requests.'],
      ja: ['be going to と will を使って予定や予想を伝え、電話での丁寧な依頼（Will you ~?）をしよう。']
    },
    targetExpressions: [
      { phraseEn: 'We are going to have a (meeting) at (noon).', phraseJa: '（正午）に（ミーティング）をする予定です。' },
      { phraseEn: 'Will you take a (message), please? / Sure, please (hold on).', phraseJa: '（伝言）をお願いできますか？／はい、（少々お待ちください）。' }
    ],
    targetVocabulary: [{ category: 'Plans & Phone Calls', words: ['message', 'meeting', 'hold on', 'noon', 'perhaps'] }],
    activities: [{ id: 'jhs2_u2_phone', nameEn: 'Phone Call & Tomorrow Plan Bingo', nameJa: '電話ロールプレイ＆明日なにしようビンゴ', descriptionEn: 'Students role-play leaving phone messages and polling future plans.', descriptionJa: '電話での伝言ロールプレイや未来の予定インタビューを行います。' }],
    teacherExpressions: [{ phraseEn: 'What is your prediction for tomorrow?', phraseJa: '明日はどうなると思う？予想してみよう！' }]
  },
  'JHS_G2_U3': {
    unitKey: 'JHS_G2_U3',
    grade: 'JHS_G2',
    unitNumber: 3,
    unitString: 'Unit 3: Rules, Modals & Charity (L9-L12)',
    textbookAlignment: { NC: 'GET Plus 3, 4', NH: 'U4', HG: 'U5', OW: 'G1 L7', BS: 'U2, LT2', SU: 'P2' },
    titleEn: 'Rules, Modals & Charity',
    titleJa: '助動詞（must / have to / should）（L9〜L12）',
    subtitleEn: 'must / have to / don\'t have to / should',
    subtitleJa: 'ルールやアドバイス・社会貢献について話そう',
    totalClasses: 4,
    aims: {
      en: ['Express obligation, prohibition, and advice using must, have to, don\'t have to, and should.'],
      ja: ['must, have to, don\'t have to, should を使い分けてルールやアドバイスを伝えよう。']
    },
    targetExpressions: [
      { phraseEn: 'We (should) not (throw away) food.', phraseJa: '食べ物を（捨てる）（べきではありません）。' },
      { phraseEn: 'It is (important) to help people in need through (charity).', phraseJa: '（チャリティー）を通じて困っている人を助けることは（大切です）。' }
    ],
    targetVocabulary: [{ category: 'Obligation & Social Contribution', words: ['charity', 'hunger', 'distance', 'should', 'throw away', 'important'] }],
    activities: [{ id: 'jhs2_u3_rules', nameEn: 'Setting Our Dream School & Homestay Rules', nameJa: 'オリジナル校則・ホームステイルール作り', descriptionEn: 'Groups design rules using must, have to, don\'t have to, and should.', descriptionJa: '助動詞を使って理想のルールやアドバイスを発表します。' }],
    teacherExpressions: [{ phraseEn: 'What rules should our school have?', phraseJa: '学校にどんなルールがあるといいかな？' }]
  },
  'JHS_G2_U4': {
    unitKey: 'JHS_G2_U4',
    grade: 'JHS_G2',
    unitNumber: 4,
    unitString: 'Unit 4: Conjunctions when, if, that (L13-L16)',
    textbookAlignment: { NC: 'L1, L4', NH: 'U2', HG: 'U1-U3', OW: 'L1, L2', BS: 'U1, U3', SU: 'P1, P2' },
    titleEn: 'Conjunctions when, if, that',
    titleJa: '接続詞（when / if / that）（L13〜L16）',
    subtitleEn: 'When I ~ / If it rains ~ / I think that ~',
    subtitleJa: '条件や時・自分の考えを論理的に伝えよう',
    totalClasses: 4,
    aims: {
      en: ['Connect clauses smoothly using when, if, because, and that-clauses (I think that ~).'],
      ja: ['接続詞 when, if, that を使って、時や条件、自分の意見と理由を詳しく伝えよう。']
    },
    targetExpressions: [
      { phraseEn: '(If) it is sunny tomorrow, we will go to the festival.', phraseJa: '（もし）明日晴れたら、お祭りに行きます。' },
      { phraseEn: 'I think that her (explanation) and (reason) are clear.', phraseJa: '彼女の（説明）と（理由）はわかりやすいと思います。' }
    ],
    targetVocabulary: [{ category: 'Conjunctions & Logic', words: ['if', 'reason', 'explanation', 'costume', 'century', 'decision', 'mistake', 'sure'] }],
    activities: [{ id: 'jhs2_u4_ifchain', nameEn: 'If-Clause Chain & Opinion Match', nameJa: 'Ifリレー＆I think that意見ゲーム', descriptionEn: 'Students chain conditional sentences ("If ~, I will ~") across teams.', descriptionJa: 'Ifを使った条件文をリレー形式でつなげていきます。' }],
    teacherExpressions: [{ phraseEn: 'What will you do if it rains?', phraseJa: 'もし雨が降ったらどうする？' }]
  },
  'JHS_G2_U5': {
    unitKey: 'JHS_G2_U5',
    grade: 'JHS_G2',
    unitNumber: 5,
    unitString: 'Unit 5: Infinitives, Gerunds & Sense Verbs (L17-L24)',
    textbookAlignment: { NC: 'L2-L4', NH: 'U1, U3, U4', HG: 'U2, U4, U6', OW: 'L1, L3, L4', BS: 'U4-U6', SU: 'P3, P5' },
    titleEn: 'Infinitives, Gerunds & Sense Verbs',
    titleJa: '不定詞3用法・動名詞・五感の動詞（L17〜L24）',
    subtitleEn: 'want to ~ / something to drink / ~ing / It tastes good!',
    subtitleJa: '将来の夢や趣味・五感の感想を伝えよう',
    totalClasses: 8,
    aims: {
      en: ['Use to-infinitives (noun/adjective/adverbial), gerunds (~ing), sense verbs, and SVOO patterns.'],
      ja: ['不定詞（to + 動詞の原形）、動名詞（~ing）、五感の動詞（look/taste/smell/sound/feel）を使いこなそう。']
    },
    targetExpressions: [
      { phraseEn: 'My (hobby) is taking pictures. / I want to (join) the band.', phraseJa: 'わたしの（趣味）は写真を撮ることです。／バンドに（参加）したいです。' },
      { phraseEn: 'It (tastes) delicious and (smells) great!', phraseJa: 'とてもおいしい（味がして）、いい（においがします）！' }
    ],
    targetVocabulary: [{ category: 'Sense Verbs & Hobbies', words: ['hobby', 'taste', 'smell', 'sound', 'feel', 'clerk', 'bring', 'join'] }],
    activities: [{ id: 'jhs2_u5_senses', nameEn: 'Five Senses Mystery Box Quiz', nameJa: '五感ミステリークイズ', descriptionEn: 'Students give clues using look, sound, smell, taste, and feel.', descriptionJa: '五感の動詞（look, sound, smell, taste, feel）でヒントを出して当てるクイズです。' }],
    teacherExpressions: [{ phraseEn: 'How does it sound or feel?', phraseJa: 'どんな音がする？どんな感じがする？' }]
  },
  'JHS_G2_U6': {
    unitKey: 'JHS_G2_U6',
    grade: 'JHS_G2',
    unitNumber: 6,
    unitString: 'Unit 6: Comparatives & Superlatives (L25-L32)',
    textbookAlignment: { NC: 'L5', NH: 'U6', HG: 'U7', OW: 'L6', BS: 'U7', SU: 'P4' },
    titleEn: 'Comparatives & Superlatives',
    titleJa: '比較級・最上級・原級比較（L25〜L32）',
    subtitleEn: '-er than / the -est / more ~ / the most ~ / as ~ as',
    subtitleJa: '世界の記録や2つ以上のものを比べて討論しよう',
    totalClasses: 8,
    aims: {
      en: ['Compare items and express opinions using -er/more, the -est/most, as ~ as, and irregular forms (better/best).'],
      ja: ['比較級・最上級・as ~ as・不規則変化（better/best, worse/worst）を使って比較し意見交換しよう。']
    },
    targetExpressions: [
      { phraseEn: 'A cheetah is the (fastest) animal in the world.', phraseJa: 'チーターは世界で（最も速い）動物です。' },
      { phraseEn: 'Which is (better), summer or winter? / What is the (best) meal?', phraseJa: '夏と冬ではどちらが（より良い）ですか？／（最高の）食事は何ですか？' }
    ],
    targetVocabulary: [{ category: 'Comparatives & Superlatives', words: ['faster', 'fastest', 'busiest', 'better', 'best', 'worse', 'worst'] }],
    activities: [{ id: 'jhs2_u6_jeopardy', nameEn: 'Superlative World Record Jeopardy', nameJa: '世界一・日本一クイズ＆比較ディベート', descriptionEn: 'Teams compete on world records and debate which option is better/best.', descriptionJa: '最上級を使った世界一クイズや比較ディベートを行います。' }],
    teacherExpressions: [{ phraseEn: 'Which do you think is better, and why?', phraseJa: 'どちらがより良いと思う？理由は？' }]
  },
  'JHS_G2_U7': {
    unitKey: 'JHS_G2_U7',
    grade: 'JHS_G2',
    unitNumber: 7,
    unitString: 'Unit 7: There is/are, Intro Passive & Counter-Arguments (L33-L41)',
    textbookAlignment: { NC: 'L3, G3 L2', NH: 'U5, U7', HG: 'U4, U6, U8', OW: 'L1, L7', BS: 'U1, U8', SU: 'P6' },
    titleEn: 'There is/are, Intro Passive & Counter-Arguments',
    titleJa: 'There is/are・受動態導入・反対意見への反論（L33〜L41・中2ディベート）',
    subtitleEn: 'There is ~ / was built by ~ / Why? Why not?',
    subtitleJa: '観光案内や両面の視点からのディベートに挑戦しよう',
    totalClasses: 9,
    aims: {
      en: ['Describe locations with There is/are, introduce history with passive voice, and argue against the opposing side in debates.'],
      ja: ['There is/are や受動態で名所を紹介し、ディベートでは相手側の意見に対する反論（against）も考えよう。']
    },
    targetExpressions: [
      { phraseEn: 'Which are better, paper or (electronic dictionaries)?', phraseJa: '紙の辞書と（電子辞書）ではどちらがより良いですか？' },
      { phraseEn: 'I am (against) using a (plastic bag) because of the environment.', phraseJa: '環境のために（レジ袋）を使うことには（反対）です。' }
    ],
    targetVocabulary: [{ category: 'Debate & Environment (G2)', words: ['electronic dictionary', 'plastic bag', 'against'] }],
    activities: [{ id: 'jhs2_u7_debate', nameEn: 'Pro vs. Con Counter-Argument Debate', nameJa: '賛成・反対の両面ディベート（Why / Why not?）', descriptionEn: 'Students argue both for their choice and against the alternative (paper vs. plastic bags, paper vs. electronic dictionaries).', descriptionJa: '自分の立場だけでなく相手側の弱点（Why not?）も挙げて議論します。' }],
    teacherExpressions: [{ phraseEn: 'Think about the other side\'s point of view!', phraseJa: '反対側の立場の意見も予想してみよう！' }]
  },

  // =========================================================================
  // JHS GRADE 3 - BORDERLINK DOC 12 (6-PUBLISHER MEXT ALIGNMENT) & DOC 13
  // =========================================================================
  'JHS_G3_U1': {
    unitKey: 'JHS_G3_U1',
    grade: 'JHS_G3',
    unitNumber: 1,
    unitString: 'Unit 1: Passive Voice & Past Participles (L1, L22-L23)',
    textbookAlignment: { NC: 'L2, L3', NH: 'U0, U4', HG: 'U3', OW: 'G2 L7, L3', BS: 'G2 U8, U6', SU: 'G2 P6, P4' },
    titleEn: 'Passive Voice & Past Participles',
    titleJa: '受動態と分詞の後置修飾（L1, L22〜L23）',
    subtitleEn: 'be + past participle / noun + ~ing / noun + p.p.',
    subtitleJa: '受け身の文や分詞を使って日本の文化や人物を紹介しよう',
    totalClasses: 5,
    aims: {
      en: ['Master irregular past participles in passive sentences and post-nominal participial modifiers.'],
      ja: ['過去分詞をマスターし、受動態（be + 過去分詞）と現在分詞・過去分詞の後置修飾で詳しく説明しよう。']
    },
    targetExpressions: [
      { phraseEn: 'Baseball is (played) by many people. / English is (spoken) worldwide.', phraseJa: '野球は多くの人に（プレーされています）。／英語は世界中で（話されています）。' },
      { phraseEn: 'Kurikinton is a food (eaten) on New Year\'s Day.', phraseJa: '栗きんとんはお正月に（食べられる）料理です。' }
    ],
    targetVocabulary: [{ category: 'Past Participles (p.p.)', words: ['eaten', 'seen', 'sung', 'written', 'spoken', 'ridden', 'built', 'known', 'taught'] }],
    activities: [{ id: 'jhs3_u1_passive', nameEn: 'Passive Tense Puzzle Race', nameJa: '受動態パズルレース', descriptionEn: 'Groups race to assemble passive and participial sentences describing famous cultural items.', descriptionJa: '過去分詞を使って受動態や後置修飾の文を組み立てるレースです。' }],
    teacherExpressions: [{ phraseEn: 'Check the past participle form carefully!', phraseJa: '過去分詞の形（eaten, written, spoken）を確認しよう！' }]
  },
  'JHS_G3_U2': {
    unitKey: 'JHS_G3_U2',
    grade: 'JHS_G3',
    unitNumber: 2,
    unitString: 'Unit 2: Present Perfect & Health Clinic (L2-L8, L44)',
    textbookAlignment: { NC: 'L1, G2 L6, L7', NH: 'U1, U2', HG: 'U2, U3', OW: 'L1, L2', BS: 'U1-U3', SU: 'P7, P8' },
    titleEn: 'Present Perfect & Health Clinic',
    titleJa: '現在完了形（継続・完了・経験）・現在完了進行形・体調（L2〜L8, L44）',
    subtitleEn: 'have + p.p. (for/since, just/already/yet, ever/never) / have been ~ing',
    subtitleJa: 'これまでの経験や継続していること・体調を伝えよう',
    totalClasses: 8,
    aims: {
      en: ['Use Present Perfect for duration (for/since), completion (already/yet), experience (once/twice), and Present Perfect Progressive.'],
      ja: ['現在完了形の3用法と現在完了進行形（have been ~ing）、体調を伝える表現を使いこなそう。']
    },
    targetExpressions: [
      { phraseEn: 'How long have you lived here? / I have lived here (since) 2020.', phraseJa: 'どのくらいここに住んでいますか？／2020年（以来）ずっと住んでいます。' },
      { phraseEn: 'Have you (done) your homework (yet)? / Yes, I have (already) finished.', phraseJa: '（もう）宿題は（終えました）か？／はい、（すでに）終えました。' },
      { phraseEn: 'What\'s wrong? / I have a (headache) and a (fever).', phraseJa: 'どうしましたか？／（頭痛）と（熱）があります。' }
    ],
    targetVocabulary: [{ category: 'Present Perfect & Health', words: ['been', 'done', 'since', 'already', 'yet', 'once', 'twice', 'headache', 'stomachache', 'fever', 'sore throat'] }],
    activities: [{ id: 'jhs3_u2_truthlie', nameEn: 'Have You Ever? Truth or Lie', nameJa: '現在完了「経験・継続」本当？ウソ？ゲーム', descriptionEn: 'Students share 3 Present Perfect statements and classmates interview them to spot the lie.', descriptionJa: '現在完了形で経験や継続していることを発表し、質問でウソを見破ります。' }],
    teacherExpressions: [{ phraseEn: 'How long have you been doing that?', phraseJa: 'それをどのくらい続けているの？' }]
  },
  'JHS_G3_U3': {
    unitKey: 'JHS_G3_U3',
    grade: 'JHS_G3',
    unitNumber: 3,
    unitString: 'Unit 3: SVOC, Emotions & Infinitive Structures (L9-L16, L43)',
    textbookAlignment: { NC: 'L3, L7', NH: 'U1, U3', HG: 'U1, U3, U7', OW: 'G2 L5, L9', BS: 'U3, U4', SU: 'P1, P3' },
    titleEn: 'SVOC, Emotions & Infinitive Structures',
    titleJa: 'SVOC・It is ~ for O to V・疑問詞+to・原形不定詞（L9〜L16, L43）',
    subtitleEn: 'make O C / want O to V / It is ~ to V / how to V / Let me ~',
    subtitleJa: '豊かな感情や「〜にとって…すること」を表現しよう',
    totalClasses: 9,
    aims: {
      en: ['Express nuanced emotions and complex infinitive structures (SVOC, want O to V, It is ~ for O to V, wh- + to V, Let/Make/Help).'],
      ja: ['第5文型（call/make O C）や want O to V、It is ~ for O to V、疑問詞 + to 不定詞を使いこなそう。']
    },
    targetExpressions: [
      { phraseEn: 'English makes me happy. / We were (proud) to win the game.', phraseJa: '英語はわたしを幸せにします。／試合に勝てて（誇らしかった）です。' },
      { phraseEn: 'It is (difficult) for me to speak in front of many people, so I felt (embarrassed).', phraseJa: '大勢の前で話すのは（難しく）、（恥ずかしく）感じました。' }
    ],
    targetVocabulary: [{ category: 'Nuanced Emotions & Evaluation', words: ['embarrassed', 'worried', 'hopeful', 'proud', 'frustrated', 'difficult', 'easy', 'boring', 'cell phone', 'lend'] }],
    activities: [{ id: 'jhs3_u3_svoc', nameEn: 'What Makes You Happy? & How-To Bingo', nameJa: '感情＆疑問詞＋toインタビュービンゴ', descriptionEn: 'Students interview classmates using "What makes you ~?" and "Do you know how to ~?"', descriptionJa: '「何があなたを〜な気持ちにするか」「〜のやり方を知っているか」を聞き合います。' }],
    teacherExpressions: [{ phraseEn: 'What makes you feel proud or hopeful?', phraseJa: 'どんなときに誇らしい気持ちや希望を感じる？' }]
  },
  'JHS_G3_U4': {
    unitKey: 'JHS_G3_U4',
    grade: 'JHS_G3',
    unitNumber: 4,
    unitString: 'Unit 4: Relative Pronouns & 3-Hint Clauses (L17-L25)',
    textbookAlignment: { NC: 'L4, L5, L7', NH: 'U4, U5', HG: 'U3-U5', OW: 'L4, G2 L8', BS: 'U3, U5', SU: 'P2, P5, P6' },
    titleEn: 'Relative Pronouns & 3-Hint Clauses',
    titleJa: '関係代名詞（that / who / which / 省略）と間接疑問文（L17〜L25）',
    subtitleEn: 'a book that ~ / a person who ~ / a city which ~ / Do you know what ~?',
    subtitleJa: '関係代名詞でスリーヒントクイズを作ろう！',
    totalClasses: 7,
    aims: {
      en: ['Build descriptive clauses with relative pronouns (who, which, that, and contact clauses) and indirect questions.'],
      ja: ['関係代名詞（who, which, that と目的格の省略）や間接疑問文を使って人や場所・ものを詳しく説明しよう。']
    },
    targetExpressions: [
      { phraseEn: 'She is a famous (musician) who plays the guitar.', phraseJa: '彼女はギターを弾く有名な（音楽家）です。' },
      { phraseEn: 'Do you know what we should do in an (earthquake)?', phraseJa: '（地震）のときに何をすべきか知っていますか？' }
    ],
    targetVocabulary: [{ category: 'Relative Clauses & Safety', words: ['earthquake', 'musician'] }],
    activities: [{ id: 'jhs3_u4_3hint', nameEn: 'Relative Pronoun 3-Hint Guessing Game (L17)', nameJa: '関係代名詞スリーヒントクイズ', descriptionEn: 'Students craft 3-Hint Quizzes using "It is a person who ~ / a place which ~ / a thing that ~".', descriptionJa: '関係代名詞を使って高度なスリーヒントクイズを出し合います。' }],
    teacherExpressions: [{ phraseEn: 'Give a hint using "who", "which", or "that"!', phraseJa: '関係代名詞 who / which / that を使ってヒントを出そう！' }]
  },
  'JHS_G3_U5': {
    unitKey: 'JHS_G3_U5',
    grade: 'JHS_G3',
    unitNumber: 5,
    unitString: 'Unit 5: Complex Clauses, Subjunctive & Debate (L26-L34, L41)',
    textbookAlignment: { NC: 'L6', NH: 'U6', HG: 'U4, U7', OW: 'L5, L6', BS: 'U6, FS1', SU: 'P7' },
    titleEn: 'Complex Clauses, Subjunctive & Debate',
    titleJa: 'so ~ that / too ~ to / 付加疑問文・仮定法・本格ディベート（L26〜L34, L41）',
    subtitleEn: 'If I were you ~ / I agree / Strong evidence & rebuttals',
    subtitleJa: '根拠と反論を使って本格英語ディベートを行おう',
    totalClasses: 10,
    aims: {
      en: ['Use subjunctive mood (If I were / I wish), tag questions, so ~ that / too ~ to, and conduct formal debates with evidence and rebuttals.'],
      ja: ['仮定法や so ~ that / too ~ to を使いこなし、根拠（evidence）と反論（rebuttal）を備えた本格ディベートを行おう。']
    },
    targetExpressions: [
      { phraseEn: 'I (agree) / (disagree) that students should wear a (school uniform).', phraseJa: '生徒が（制服）を着るべきだという意見に（賛成）／（反対）です。' },
      { phraseEn: 'We have strong (evidence), and here is our (rebuttal).', phraseJa: 'わたしたちには確かな（根拠）があり、こちらがわたしたちの（反論）です。' }
    ],
    targetVocabulary: [{ category: 'Formal Debate (G3)', words: ['agree', 'disagree', 'evidence', 'rebuttal', 'school uniform'] }],
    activities: [{ id: 'jhs3_u5_debate', nameEn: 'Formal Classroom Debate (School Uniforms / AI & Robots)', nameJa: '中3本格ディベート（制服・AIとロボット）', descriptionEn: 'Affirmative and Negative teams debate real social motions with supporting evidence, rebuttals, and judging.', descriptionJa: '肯定側・否定側に分かれ、立論・反論・ジャッジを行う本格ディベートです。' }],
    teacherExpressions: [{ phraseEn: 'Support your reason with clear evidence!', phraseJa: 'はっきりとした根拠（データや事実）で理由を支えよう！' }]
  },
  'JHS_G3_U6': {
    unitKey: 'JHS_G3_U6',
    grade: 'JHS_G3',
    unitNumber: 6,
    unitString: 'Unit 6: Announcements, Travel & Graduation (L35-L40)',
    textbookAlignment: { NC: 'L7', NH: 'U8', HG: 'U8, Daily Life 5', OW: 'T1, T21', BS: 'FS2', SU: 'G2 OP6' },
    titleEn: 'Announcements, Travel & Graduation',
    titleJa: '駅・空港のアナウンス・海外旅行・卒業メッセージ（L35〜L40）',
    subtitleEn: 'Station & Airport Announcements / Graduation Messages',
    subtitleJa: '実践的なリスニングと卒業メッセージを英語で発信しよう',
    totalClasses: 6,
    aims: {
      en: ['Catch key details in station/airport announcements, role-play air travel, and write heartfelt graduation messages.'],
      ja: ['駅や空港のアナウンスから必要な情報を聞き取り、卒業に向けた英語のメッセージを贈ろう。']
    },
    targetExpressions: [
      { phraseEn: 'Attention all (passengers): the train is (delayed). Please check the (information desk).', phraseJa: '（乗客）の皆様にお知らせします。電車が（遅れています）。（案内所）でご確認ください。' },
      { phraseEn: 'Please (fasten) your seatbelt before we (take off). / (Congratulations) on your graduation!', phraseJa: '（離陸）前にシートベルトを（お締め）ください。／ご卒業（おめでとうございます）！' }
    ],
    targetVocabulary: [{ category: 'Travel, Announcements & Graduation', words: ['passenger', 'delayed', 'emergency', 'information desk', 'lost-and-found booth', 'take off', 'fasten', 'congratulations'] }],
    activities: [{ id: 'jhs3_u6_announce', nameEn: 'Airport & Station Announcement Catching', nameJa: '空港・駅アナウンス聞き取り＆卒業ポスター', descriptionEn: 'Students listen to realistic transit announcements and create graduation message posters.', descriptionJa: '実践的なアナウンス聞き取りと卒業メッセージポスター作りを行います。' }],
    teacherExpressions: [{ phraseEn: 'Congratulations on completing Junior High English!', phraseJa: '中学英語の集大成、おめでとう！' }]
  }
};

/**
 * Find Curriculum Guide for a given grade & unit string
 */
export function getCurriculumGuide(grade: string, unitString: string): UnitCurriculumGuide | null {
  for (const guide of Object.values(CURRICULUM_GUIDES)) {
    if (guide.grade === grade && (guide.unitString === unitString || unitString.startsWith(`Unit ${guide.unitNumber}:`))) {
      return guide;
    }
  }
  return null;
}
