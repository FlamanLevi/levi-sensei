import React from 'react';
import { DialoguePreset, DialoguePresetId, RubySegment } from './types';

export const DIALOGUE_PRESETS: Record<DialoguePresetId, DialoguePreset> = {
  how_many: {
    id: 'how_many',
    unitTag: "Let's Try! 1 • Unit 3",
    badgeEn: 'Unit 3: How many?',
    badgeJa: 'Unit 3: いくつ？',
    speakerA: '"Hello! Rock, scissors, paper! 1, 2, 3!"',
    speakerB: '"Yay! / One more time! / Oh, no!"',
    chantEn: '"Rock, scissors, paper! 1, 2, 3!"',
    endPromptEn: '"How many?"',
    endAnswerEn: '"____!"',
    hintJaHiragana: 'じゃんけんをして、かった かずを 「How many?」 で かぞえよう！',
    hintJaRubySegments: [
      { text: 'じゃんけんをして、' },
      { text: '勝', ruby: 'か' },
      { text: 'った ' },
      { text: '数', ruby: 'かず' },
      { text: 'を 「How many?」 で ' },
      { text: '数', ruby: 'かぞ' },
      { text: 'えよう！' }
    ]
  },
  hello: {
    id: 'hello',
    unitTag: "Let's Try! 1 • Unit 1",
    badgeEn: 'Unit 1: Hello!',
    badgeJa: 'Unit 1: あいさつ（Hello!）',
    speakerA: '"Hello! I\'m ______."',
    speakerB: '"Hello! I\'m ______. Nice to meet you!"',
    chantEn: '"Rock, scissors, paper! 1, 2, 3!"',
    endPromptEn: '"Thank you!"',
    endAnswerEn: '"See you!"',
    hintJaHiragana: 'えいごで あいさつをしてから じゃんけんしよう！',
    hintJaRubySegments: [
      { text: '英語', ruby: 'えいご' },
      { text: 'で あいさつをしてから じゃんけんしよう！' }
    ]
  },
  how_are_you: {
    id: 'how_are_you',
    unitTag: "Let's Try! 1 • Unit 2",
    badgeEn: 'Unit 2: How are you?',
    badgeJa: 'Unit 2: ごきげんいかが？',
    speakerA: '"Hello! How are you?"',
    speakerB: '"I\'m (happy / fine / great / sleepy / hungry)!"',
    chantEn: '"Rock, scissors, paper! 1, 2, 3!"',
    endPromptEn: '"Thank you!"',
    endAnswerEn: '"See you!"',
    hintJaHiragana: 'きもちを えいごで つたえてから じゃんけんしよう！',
    hintJaRubySegments: [
      { text: '気持', ruby: 'きも' },
      { text: 'ちを ' },
      { text: '英語', ruby: 'えいご' },
      { text: 'で ' },
      { text: '伝', ruby: 'つた' },
      { text: 'えてから じゃんけんしよう！' }
    ]
  },
  do_you_like: {
    id: 'do_you_like',
    unitTag: "Let's Try! 1 • Unit 5",
    badgeEn: 'Unit 5: Do you like...?',
    badgeJa: 'Unit 5: 何が好き？',
    speakerA: '"Do you like ______?"',
    speakerB: '"Yes, I do. / No, I don\'t."',
    chantEn: '"Rock, scissors, paper! 1, 2, 3!"',
    endPromptEn: '"Nice!"',
    endAnswerEn: '"See you!"',
    hintJaHiragana: 'すきなものを きいてから じゃんけんしよう！',
    hintJaRubySegments: [
      { text: '好', ruby: 'す' },
      { text: 'きなものを ' },
      { text: '聞', ruby: 'き' },
      { text: 'いてから じゃんけんしよう！' }
    ]
  },
  janken_only: {
    id: 'janken_only',
    unitTag: 'Warm-Up • All Grades',
    badgeEn: 'Janken Chant Only',
    badgeJa: 'シンプル（かけごえのみ）',
    speakerA: '"Rock, scissors, paper! 1, 2, 3!"',
    speakerB: '"I win! / Tie! / Oh, no!"',
    chantEn: '"Rock, scissors, paper! 1, 2, 3!"',
    hintJaHiragana: 'えいごの かけごえで じゃんけんしよう！',
    hintJaRubySegments: [
      { text: '英語', ruby: 'えいご' },
      { text: 'のかけごえで じゃんけんしよう！' }
    ]
  },
  custom: {
    id: 'custom',
    unitTag: 'Teacher Custom',
    badgeEn: 'Custom Dialogue',
    badgeJa: '自由入力（カスタム対話）',
    speakerA: '"What sport do you like?"',
    speakerB: '"I like soccer!"',
    chantEn: '"Rock, scissors, paper! 1, 2, 3!"',
    hintJaHiragana: 'ともだちと えいごで はなしてから じゃんけんしよう！',
    hintJaRubySegments: [
      { text: '友', ruby: 'とも' },
      { text: 'だちと ' },
      { text: '英語', ruby: 'えいご' },
      { text: 'で ' },
      { text: '話', ruby: 'はな' },
      { text: 'してから じゃんけんしよう！' }
    ]
  }
};

export const DIALOGUE_PRESET_ORDER: DialoguePresetId[] = [
  'how_many',
  'hello',
  'how_are_you',
  'do_you_like',
  'janken_only',
  'custom'
];

export function renderRubySegments(segments: RubySegment[]): React.ReactNode {
  return segments.map((seg, idx) =>
    seg.ruby ? (
      <ruby key={idx}>
        {seg.text}
        <rt className="font-normal">{seg.ruby}</rt>
      </ruby>
    ) : (
      <React.Fragment key={idx}>{seg.text}</React.Fragment>
    )
  );
}
