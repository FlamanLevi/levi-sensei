export type ClockDisplayType = 'ANALOG' | 'DIGITAL' | 'SPLIT';
export type DigitalStyle = 'RETRO_LCD' | 'MODERN_LED';
export type TimeResolution = 60 | 30 | 15 | 10 | 5 | 1; // minutes step
export type ClockGameMode = 'SANDBOX' | 'READ_QUIZ' | 'SET_TIME' | 'DAILY_ROUTINE';

export interface RoutineActivity {
  id: string;
  timeHour: number;
  timeMinute: number;
  period: 'a.m.' | 'p.m.';
  enTitle: string;
  jaTitle: string;
  jaRuby: { base: string; ruby: string }[];
  /** First sentence: time. Second sentence: activity. Kept separate for TTS pacing. */
  phraseTime: string;
  phraseActivity: string;
  /** Legacy combined phrase for backwards compatibility */
  phrase: string;
  icon: string;
  color: string;
}

export const DAILY_ROUTINES: RoutineActivity[] = [
  {
    id: 'wake_up',
    timeHour: 6,
    timeMinute: 0,
    period: 'a.m.',
    enTitle: 'Wake-up Time',
    jaTitle: '起きる時間',
    jaRuby: [{ base: '起', ruby: 'お' }, { base: 'きる時間', ruby: 'じかん' }],
    phraseTime: "It's 6:00 a.m.",
    phraseActivity: "It's wake-up time!",
    phrase: "It's 6:00 a.m. It's wake-up time!",
    icon: '⏰',
    color: 'from-amber-400 to-orange-500'
  },
  {
    id: 'breakfast',
    timeHour: 7,
    timeMinute: 0,
    period: 'a.m.',
    enTitle: 'Breakfast Time',
    jaTitle: '朝ごはん',
    jaRuby: [{ base: '朝', ruby: 'あさ' }, { base: 'ごはん', ruby: '' }],
    phraseTime: "It's 7:00 a.m.",
    phraseActivity: "It's breakfast time!",
    phrase: "It's 7:00 a.m. It's breakfast time!",
    icon: '🍳',
    color: 'from-yellow-400 to-amber-500'
  },
  {
    id: 'study',
    timeHour: 10,
    timeMinute: 0,
    period: 'a.m.',
    enTitle: 'Study Time',
    jaTitle: '勉強の時間',
    jaRuby: [{ base: '勉強', ruby: 'べんきょう' }, { base: 'の時間', ruby: 'じかん' }],
    phraseTime: "It's 10:00 a.m.",
    phraseActivity: "It's study time!",
    phrase: "It's 10:00 a.m. It's study time!",
    icon: '📚',
    color: 'from-blue-400 to-indigo-500'
  },
  {
    id: 'lunch',
    timeHour: 12,
    timeMinute: 0,
    period: 'p.m.',
    enTitle: 'Lunch Time',
    jaTitle: 'お昼ごはん',
    jaRuby: [{ base: 'お昼', ruby: 'おひる' }, { base: 'ごはん', ruby: '' }],
    phraseTime: "It's 12:00 p.m.",
    phraseActivity: "It's lunch time!",
    phrase: "It's 12:00 p.m. It's lunch time!",
    icon: '🍱',
    color: 'from-emerald-400 to-teal-500'
  },
  {
    id: 'snack',
    timeHour: 3,
    timeMinute: 0,
    period: 'p.m.',
    enTitle: 'Snack Time',
    jaTitle: 'おやつ',
    jaRuby: [{ base: 'おやつ', ruby: '' }],
    phraseTime: "It's 3:00 p.m.",
    phraseActivity: "It's snack time!",
    phrase: "It's 3:00 p.m. It's snack time!",
    icon: '🍪',
    color: 'from-pink-400 to-rose-500'
  },
  {
    id: 'homework',
    timeHour: 5,
    timeMinute: 0,
    period: 'p.m.',
    enTitle: 'Homework Time',
    jaTitle: '宿題の時間',
    jaRuby: [{ base: '宿題', ruby: 'しゅくだい' }, { base: 'の時間', ruby: 'じかん' }],
    phraseTime: "It's 5:00 p.m.",
    phraseActivity: "It's homework time!",
    phrase: "It's 5:00 p.m. It's homework time!",
    icon: '✏️',
    color: 'from-violet-400 to-purple-500'
  },
  {
    id: 'dinner',
    timeHour: 7,
    timeMinute: 0,
    period: 'p.m.',
    enTitle: 'Dinner Time',
    jaTitle: '夕ごはん',
    jaRuby: [{ base: '夕', ruby: 'ゆう' }, { base: 'ごはん', ruby: '' }],
    phraseTime: "It's 7:00 p.m.",
    phraseActivity: "It's dinner time!",
    phrase: "It's 7:00 p.m. It's dinner time!",
    icon: '🍜',
    color: 'from-orange-400 to-red-500'
  },
  {
    id: 'bath',
    timeHour: 8,
    timeMinute: 0,
    period: 'p.m.',
    enTitle: 'Bath Time',
    jaTitle: 'お風呂',
    jaRuby: [{ base: 'お', ruby: '' }, { base: '風呂', ruby: 'ふろ' }],
    phraseTime: "It's 8:00 p.m.",
    phraseActivity: "It's bath time!",
    phrase: "It's 8:00 p.m. It's bath time!",
    icon: '🛁',
    color: 'from-cyan-400 to-blue-500'
  },
  {
    id: 'bedtime',
    timeHour: 9,
    timeMinute: 0,
    period: 'p.m.',
    enTitle: 'Bed Time',
    jaTitle: 'ねる時間',
    jaRuby: [{ base: 'ねる時間', ruby: 'じかん' }],
    phraseTime: "It's 9:00 p.m.",
    phraseActivity: "It's bed time!",
    phrase: "It's 9:00 p.m. It's bed time!",
    icon: '🌙',
    color: 'from-indigo-500 to-purple-600'
  },
  {
    id: 'dream',
    timeHour: 3,
    timeMinute: 0,
    period: 'a.m.',
    enTitle: 'Dream Time',
    jaTitle: '夢の時間',
    jaRuby: [{ base: '夢', ruby: 'ゆめ' }, { base: 'の時間', ruby: 'じかん' }],
    phraseTime: "It's 3:00 a.m.",
    phraseActivity: "It's dream time!",
    phrase: "It's 3:00 a.m. It's dream time!",
    icon: '💤',
    color: 'from-slate-500 to-indigo-700'
  }
];