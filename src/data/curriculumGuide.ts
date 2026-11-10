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
  grade: 'ES_G3' | 'ES_G4' | 'ES_G5' | 'ES_G6';
  unitNumber: number;
  unitString: string;          // Must match master_vocabulary.json unit string, e.g. "Unit 6: Alphabet"
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
