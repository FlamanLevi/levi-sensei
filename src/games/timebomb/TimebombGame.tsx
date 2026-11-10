import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import confetti from 'canvas-confetti';
import { useVocabulary } from '@/context/VocabularyContext';
import { useClassroom } from '@/context/ClassroomContext';
import { useAudio } from '@/context/AudioContext';
import { useLanguage } from '@/context/LanguageContext';
import { soundEffects } from '@/services/soundEffects';
import { VocabularyItem } from '@data/types';
import { resolveCardImage, shuffleArray } from '@/games/speed_flash/utils';
import { TimebombManualModal } from './TimebombManualModal';
import { TimebombSettingsModal } from './TimebombSettingsModal';
import { TimebombInstructionsModal } from './TimebombInstructionsModal';
import { CinemaStageLayout } from '@/components/common/CinemaStageLayout';
import {
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Volume2,
  VolumeX,
  Shuffle,
  ChevronRight,
  Flame,
  Users,
  Timer,
  Hash,
  Layers,
  Smile,
  Heart,
  BookOpen,
  Settings
} from 'lucide-react';

interface TimebombGameProps {
  onExit?: () => void;
}

export type VisualTheme = 'POTATO' | 'BALLOON' | 'POPCORN';
export type GameMode = 'WORD_FLASH' | 'NUMBER_COUNT' | 'CATEGORY_RALLY';
export type TimerDurationMode = 
  | 'MYSTERY_FAST' 
  | 'MYSTERY_NORMAL' 
  | 'MYSTERY_LONG' 
  | 'MYSTERY_MARATHON' 
  | 'FIXED_30' 
  | 'FIXED_45' 
  | 'FIXED_60' 
  | 'FIXED_90';
type GameStatus = 'IDLE' | 'TICKING' | 'PAUSED' | 'EXPLODED';

interface FunMission {
  id: string;
  en: string;
  ja: React.ReactNode;
  icon: string;
  category: 'feelings' | 'body' | 'numbers' | 'fun' | 'animals' | 'communication';
}

const FUN_MISSIONS: FunMission[] = [
  // --- Feelings & Faces ---
  {
    id: 'happy_face',
    en: 'Show your happiest face! 😄',
    ja: <><ruby>最高<rt className="text-[7px]">さいこう</rt></ruby>の<ruby>笑顔<rt className="text-[7px]">えがお</rt></ruby>を<ruby>見<rt className="text-[7px]">み</rt></ruby>せて！</>,
    icon: '😄',
    category: 'feelings'
  },
  {
    id: 'angry_face',
    en: 'Make a super angry face! 😡',
    ja: <>ものすごく<ruby>怒<rt className="text-[7px]">おこ</rt></ruby>った<ruby>顔<rt className="text-[7px]">かお</rt></ruby>をしてみて！</>,
    icon: '😡',
    category: 'feelings'
  },
  {
    id: 'sleepy_face',
    en: 'Pretend to be very sleepy! 😴',
    ja: <>ねむた〜いポーズをしてみて！</>,
    icon: '😴',
    category: 'feelings'
  },
  {
    id: 'surprised_face',
    en: 'Make a super surprised face! 😲',
    ja: <>びっくりした<ruby>顔<rt className="text-[7px]">かお</rt></ruby>をしてみて！</>,
    icon: '😲',
    category: 'feelings'
  },
  {
    id: 'cool_pose',
    en: 'Strike your coolest model pose! 😎',
    ja: <>かっこいいポーズをキメよう！</>,
    icon: '😎',
    category: 'feelings'
  },
  {
    id: 'silly_face',
    en: 'Make a funny silly face! 🤪',
    ja: <>へんてこなおもしろい<ruby>顔<rt className="text-[7px]">かお</rt></ruby>をして！</>,
    icon: '🤪',
    category: 'feelings'
  },

  // --- Body Movements & Actions ---
  {
    id: 'touch_ears',
    en: 'Touch your ears 3 times! 👂',
    ja: <><ruby>耳<rt className="text-[7px]">みみ</rt></ruby>を3<ruby>回<rt className="text-[7px]">かい</rt></ruby>タッチしよう！</>,
    icon: '👂',
    category: 'body'
  },
  {
    id: 'touch_nose',
    en: 'Touch your nose and jump! 👃',
    ja: <><ruby>鼻<rt className="text-[7px]">はな</rt></ruby>をさわりながら1<ruby>回<rt className="text-[7px]">かい</rt></ruby>ジャンプ！</>,
    icon: '👃',
    category: 'body'
  },
  {
    id: 'touch_head',
    en: 'Hands on your head for 3 seconds! 🙆',
    ja: <><ruby>頭<rt className="text-[7px]">あたま</rt></ruby>に<ruby>手<rt className="text-[7px]">て</rt></ruby>を<ruby>置<rt className="text-[7px]">お</rt></ruby>いて3<ruby>秒<rt className="text-[7px]">びょう</rt></ruby>キープ！</>,
    icon: '🙆',
    category: 'body'
  },
  {
    id: 'touch_knees',
    en: 'Touch your knees 3 times! 🦵',
    ja: <><ruby>膝<rt className="text-[7px]">ひざ</rt></ruby>を3<ruby>回<rt className="text-[7px]">かい</rt></ruby>タッチしよう！</>,
    icon: '🦵',
    category: 'body'
  },
  {
    id: 'star_jump',
    en: 'Do 2 big star jumps! ⭐',
    ja: <><ruby>元気<rt className="text-[7px]">げんき</rt></ruby>にスタージャンプを2<ruby>回<rt className="text-[7px]">かい</rt></ruby>！</>,
    icon: '⭐',
    category: 'body'
  },
  {
    id: 'spin_around',
    en: 'Spin around once carefully! 🌀',
    ja: <>その<ruby>場<rt className="text-[7px]">ば</rt></ruby>でくるっと1<ruby>回転<rt className="text-[7px]">かいてん</rt></ruby>！</>,
    icon: '🌀',
    category: 'body'
  },
  {
    id: 'one_foot_balance',
    en: 'Stand on one foot for 3 seconds! 🦩',
    ja: <><ruby>片足<rt className="text-[7px]">かたあし</rt></ruby>で3<ruby>秒<rt className="text-[7px]">びょう</rt></ruby>バランス！</>,
    icon: '🦩',
    category: 'body'
  },
  {
    id: 'robot_dance',
    en: 'Do the robot dance for 3 seconds! 🤖',
    ja: <>ロボットダンスをしてみて！</>,
    icon: '🤖',
    category: 'body'
  },
  {
    id: 'superhero_pose',
    en: 'Strike a superhero pose! 🦸',
    ja: <>スーパーヒーローのポーズ！</>,
    icon: '🦸',
    category: 'body'
  },
  {
    id: 'clap_five',
    en: 'Clap your hands 5 times! 👏',
    ja: <><ruby>手<rt className="text-[7px]">て</rt></ruby>を5<ruby>回<rt className="text-[7px]">かい</rt></ruby>たたこう！</>,
    icon: '👏',
    category: 'body'
  },
  {
    id: 'wave_both',
    en: 'Wave both hands at everyone! 👋',
    ja: <><ruby>両手<rt className="text-[7px]">りょうて</rt></ruby>をみんなにふろう！</>,
    icon: '👋',
    category: 'body'
  },

  // --- Peer & Classroom Communication ---
  {
    id: 'high_five',
    en: 'Give your neighbor a high-five! ✋',
    ja: <>となりの<ruby>友達<rt className="text-[7px]">ともだち</rt></ruby>とハイタッチ！</>,
    icon: '✋',
    category: 'communication'
  },
  {
    id: 'fist_bump',
    en: 'Give your neighbor a gentle fist bump! 👊',
    ja: <>となりの<ruby>友達<rt className="text-[7px]">ともだち</rt></ruby>とグータッチ！</>,
    icon: '👊',
    category: 'communication'
  },
  {
    id: 'peace_signs',
    en: 'Double peace signs with a big smile! ✌️',
    ja: <><ruby>両手<rt className="text-[7px]">りょうて</rt></ruby>でダブルピース！</>,
    icon: '✌️',
    category: 'communication'
  },
  {
    id: 'janken',
    en: 'Play Janken with your neighbor! ✊✌️✋',
    ja: <>となりの<ruby>友達<rt className="text-[7px]">ともだち</rt></ruby>とじゃんけん！</>,
    icon: '✊',
    category: 'communication'
  },
  {
    id: 'two_thumbs_up',
    en: 'Give two big thumbs up! 👍👍',
    ja: <><ruby>両手<rt className="text-[7px]">りょうて</rt></ruby>でグッドサイン！</>,
    icon: '👍',
    category: 'communication'
  },
  {
    id: 'polite_bow',
    en: 'Bow and say "Nice to meet you!" 🙇',
    ja: <>ぺこりとおじぎをして「Nice to meet you!」</>,
    icon: '🙇',
    category: 'communication'
  },

  // --- English Voice & Speaking ---
  {
    id: 'loud_hello',
    en: 'Say "HELLO!" in your best English! 🗣️',
    ja: <>「Hello!」と<ruby>元気<rt className="text-[7px]">げんき</rt></ruby>に<ruby>大<rt className="text-[7px]">おお</rt></ruby>きな<ruby>声<rt className="text-[7px]">こえ</rt></ruby>で！</>,
    icon: '🗣️',
    category: 'fun'
  },
  {
    id: 'whisper_hello',
    en: 'Whisper "Good morning" like a secret! 🤫',
    ja: <>ひそひそ<ruby>声<rt className="text-[7px]">こえ</rt></ruby>で「Good morning」！</>,
    icon: '🤫',
    category: 'fun'
  },
  {
    id: 'count_five',
    en: 'Count: 1, 2, 3, 4, 5 in English! 🔢',
    ja: <><ruby>英語<rt className="text-[7px]">えいご</rt></ruby>で1〜5まで<ruby>元気<rt className="text-[7px]">げんき</rt></ruby>に<ruby>言<rt className="text-[7px]">い</rt></ruby>おう！</>,
    icon: '🔢',
    category: 'numbers'
  },
  {
    id: 'count_down',
    en: 'Count backwards: 5, 4, 3, 2, 1, BLAST OFF! 🚀',
    ja: <><ruby>英語<rt className="text-[7px]">えいご</rt></ruby>で5からカウントダウン！</>,
    icon: '🚀',
    category: 'numbers'
  },
  {
    id: 'say_color',
    en: 'Say your favorite color in English! 🎨',
    ja: <>すきな<ruby>色<rt className="text-[7px]">いろ</rt></ruby>を<ruby>英語<rt className="text-[7px]">えいご</rt></ruby>で<ruby>言<rt className="text-[7px]">い</rt></ruby>おう！</>,
    icon: '🎨',
    category: 'fun'
  },
  {
    id: 'say_animal',
    en: 'Say your favorite animal in English! 🐾',
    ja: <>すきな<ruby>動物<rt className="text-[7px]">どうぶつ</rt></ruby>を<ruby>英語<rt className="text-[7px]">えいご</rt></ruby>で<ruby>言<rt className="text-[7px]">い</rt></ruby>おう！</>,
    icon: '🐾',
    category: 'animals'
  },
  {
    id: 'say_food',
    en: 'Say your favorite food in English! 🍕',
    ja: <>すきな<ruby>食<rt className="text-[7px]">た</rt></ruby>べものを<ruby>英語<rt className="text-[7px]">えいご</rt></ruby>で<ruby>言<rt className="text-[7px]">い</rt></ruby>おう！</>,
    icon: '🍕',
    category: 'fun'
  },
  {
    id: 'say_thank_you',
    en: 'Say "Thank you very much!" 🤝',
    ja: <>「Thank you very much!」と<ruby>言<rt className="text-[7px]">い</rt></ruby>おう！</>,
    icon: '🤝',
    category: 'fun'
  },
  {
    id: 'shout_yeah',
    en: 'Raise your hands and shout "YEAH!" 🙌',
    ja: <><ruby>両手<rt className="text-[7px]">りょうて</rt></ruby>をあげて「YEAH!」！</>,
    icon: '🙌',
    category: 'fun'
  },

  // --- Animals & Imitations ---
  {
    id: 'animal_lion',
    en: 'Roar like a mighty lion! 🦁',
    ja: <>ライオンのガオーポーズ！</>,
    icon: '🦁',
    category: 'animals'
  },
  {
    id: 'animal_cat',
    en: 'Paws up and say "Meow!" 🐱',
    ja: <>ねこちゃんの手で「ニャー」！</>,
    icon: '🐱',
    category: 'animals'
  },
  {
    id: 'animal_rabbit',
    en: 'Bunny ears and hop twice! 🐰',
    ja: <>うさぎの耳でぴょんぴょん！</>,
    icon: '🐰',
    category: 'animals'
  },
  {
    id: 'animal_monkey',
    en: 'Sound like a playful monkey! 🐵',
    ja: <>おさるさんのポーズ！</>,
    icon: '🐵',
    category: 'animals'
  },
  {
    id: 'animal_bird',
    en: 'Flap your wings like a bird! 🐦',
    ja: <><ruby>鳥<rt className="text-[7px]">とり</rt></ruby>のようにパタパタ羽ばたこう！</>,
    icon: '🐦',
    category: 'animals'
  },
  {
    id: 'animal_penguin',
    en: 'Waddle like a cute penguin! 🐧',
    ja: <>ペンギンみたいによちよち<ruby>歩<rt className="text-[7px]">ある</rt></ruby>き！</>,
    icon: '🐧',
    category: 'animals'
  }
];

const NUMBER_WORDS: Record<number, string> = {
  1: 'one', 2: 'two', 3: 'three', 4: 'four', 5: 'five',
  6: 'six', 7: 'seven', 8: 'eight', 9: 'nine', 10: 'ten',
  11: 'eleven', 12: 'twelve', 13: 'thirteen', 14: 'fourteen', 15: 'fifteen',
  16: 'sixteen', 17: 'seventeen', 18: 'eighteen', 19: 'nineteen', 20: 'twenty',
  21: 'twenty-one', 22: 'twenty-two', 23: 'twenty-three', 24: 'twenty-four', 25: 'twenty-five',
  26: 'twenty-six', 27: 'twenty-seven', 28: 'twenty-eight', 29: 'twenty-nine', 30: 'thirty'
};

const CATEGORIES_LIST = [
  { id: 'feelings', name: 'Feelings & States', ja: 'きもち・きぶん', icon: '😊', examples: ['happy', 'sad', 'angry', 'hungry', 'sleepy', 'tired', 'great'] },
  { id: 'colors', name: 'Colors', ja: 'いろ', icon: '🎨', examples: ['red', 'blue', 'yellow', 'green', 'pink', 'orange', 'purple', 'black'] },
  { id: 'body', name: 'Body Parts', ja: 'からだ', icon: '👃', examples: ['head', 'eyes', 'ears', 'mouth', 'nose', 'hands', 'feet', 'arms'] },
  { id: 'animals', name: 'Animals', ja: 'どうぶつ', icon: '🦁', examples: ['dog', 'cat', 'lion', 'elephant', 'bear', 'rabbit', 'monkey', 'cow'] },
  { id: 'food', name: 'Food & Drinks', ja: 'たべもの・のみもの', icon: '🍎', examples: ['apple', 'banana', 'pizza', 'curry', 'water', 'milk', 'cake'] },
  { id: 'classroom', name: 'Classroom Objects', ja: 'きょうしつのもの', icon: '✏️', examples: ['pencil', 'eraser', 'ruler', 'book', 'desk', 'chair'] },
  { id: 'shapes', name: 'Shapes', ja: 'かたち', icon: '⭐', examples: ['circle', 'triangle', 'square', 'heart', 'star', 'diamond'] },
];

export const TimebombGame: React.FC<TimebombGameProps> = ({ onExit }) => {
  const { scopedWords, filteredWords, gradeWords, allWords } = useVocabulary();
  const { activeGrade } = useClassroom();
  const { playWordAudio, speakText } = useAudio();
  const { t, language } = useLanguage();

  // 3-in-1 Theme Switcher
  const [theme, setTheme] = useState<VisualTheme>('POTATO');

  // Mode & configuration
  const [gameMode, setGameMode] = useState<GameMode>('WORD_FLASH');
  const [timerMode, setTimerMode] = useState<TimerDurationMode>('MYSTERY_NORMAL');
  const [hideTimerDisplay, setHideTimerDisplay] = useState<boolean>(true);
  const [autoPronounce, setAutoPronounce] = useState<boolean>(true);
  const [numberMax, setNumberMax] = useState<number>(activeGrade === 'ES_G1' ? 10 : 20);

  // Active word pool
  const rawPool = scopedWords.length >= 3
    ? scopedWords
    : (filteredWords.length >= 3 ? filteredWords : (gradeWords.length >= 3 ? gradeWords : allWords));

  const wordPool: VocabularyItem[] = useMemo(() => {
    return rawPool.filter((w: VocabularyItem) => {
      const img = resolveCardImage(w, 'picture_only', activeGrade);
      return Boolean(img && img.trim() !== '');
    });
  }, [rawPool, activeGrade]);

  // Card queue
  const [shuffledQueue, setShuffledQueue] = useState<VocabularyItem[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState<number>(0);

  // Counting Relay state
  const [currentNumber, setCurrentNumber] = useState<number>(1);

  // Category Rally state
  const [activeCategoryIndex, setActiveCategoryIndex] = useState<number>(0);

  // Gameplay state
  const [status, setStatus] = useState<GameStatus>('IDLE');
  const [totalDurationMs, setTotalDurationMs] = useState<number>(30000);
  const [remainingMs, setRemainingMs] = useState<number>(30000);
  const [passCount, setPassCount] = useState<number>(0);
  const [roundNumber, setRoundNumber] = useState<number>(1);
  const [activeMission, setActiveMission] = useState<FunMission | null>(null);
  const [showManualModal, setShowManualModal] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isInstructionsOpen, setIsInstructionsOpen] = useState<boolean>(false);

  // 4-Team Tracker
  const [teamMode, setTeamMode] = useState<boolean>(false);
  const [teamCaught, setTeamCaught] = useState({ red: 0, blue: 0, yellow: 0, green: 0 });

  // Refs for timers
  const intervalRef = useRef<number | null>(null);
  const remainingMsRef = useRef<number>(remainingMs);
  remainingMsRef.current = remainingMs;
  const explosionLockTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Lockout state to prevent accidental Space/Enter skip immediately after explosion
  const [isExplosionLocked, setIsExplosionLocked] = useState<boolean>(false);

  // Shuffled Mission Deck Ref (Guarantees no repeats across rounds)
  const missionDeckRef = useRef<FunMission[]>([]);
  const lastMissionIdRef = useRef<string | null>(null);

  const pullNextMission = useCallback((): FunMission => {
    // If deck has 0 or 1 card left, replenish & Fisher-Yates shuffle
    if (missionDeckRef.current.length <= 1) {
      const freshDeck = [...FUN_MISSIONS];
      for (let i = freshDeck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [freshDeck[i], freshDeck[j]] = [freshDeck[j], freshDeck[i]];
      }
      // Ensure the top card doesn't match the last played mission
      if (freshDeck[freshDeck.length - 1].id === lastMissionIdRef.current && freshDeck.length > 1) {
        const swapIdx = Math.floor(Math.random() * (freshDeck.length - 1));
        [freshDeck[freshDeck.length - 1], freshDeck[swapIdx]] = [freshDeck[swapIdx], freshDeck[freshDeck.length - 1]];
      }
      missionDeckRef.current = freshDeck;
    }

    // Pop next mission from top of deck
    let nextMission = missionDeckRef.current.pop()!;
    // Extra defense: if it matches lastMissionIdRef and deck has more, swap with the next card
    if (nextMission.id === lastMissionIdRef.current && missionDeckRef.current.length > 0) {
      const alt = missionDeckRef.current.pop()!;
      missionDeckRef.current.push(nextMission);
      nextMission = alt;
    }

    lastMissionIdRef.current = nextMission.id;
    return nextMission;
  }, []);

  // Prepare cards
  const replenishQueue = useCallback(() => {
    if (wordPool.length === 0) return [];
    const shuffled = shuffleArray([...wordPool]);
    setShuffledQueue(shuffled);
    setCurrentWordIndex(0);
    return shuffled;
  }, [wordPool]);

  useEffect(() => {
    if (wordPool.length > 0) {
      replenishQueue();
    }
  }, [wordPool, replenishQueue]);

  const currentWord: VocabularyItem | null = useMemo(() => {
    if (shuffledQueue.length === 0) return null;
    return shuffledQueue[currentWordIndex % shuffledQueue.length];
  }, [shuffledQueue, currentWordIndex]);

  // Calculate duration based on mode (Bumped up durations + Marathon mode + 90s)
  const getNextDurationMs = useCallback((): number => {
    switch (timerMode) {
      case 'MYSTERY_FAST':
        return Math.floor(18000 + Math.random() * 10000); // 18s - 28s
      case 'MYSTERY_NORMAL':
        return Math.floor(30000 + Math.random() * 20000); // 30s - 50s
      case 'MYSTERY_LONG':
        return Math.floor(48000 + Math.random() * 27000); // 48s - 75s
      case 'MYSTERY_MARATHON':
        return Math.floor(70000 + Math.random() * 40000); // 70s - 110s (~1.2 - 1.8 min)
      case 'FIXED_30':
        return 30000;
      case 'FIXED_45':
        return 45000;
      case 'FIXED_60':
        return 60000;
      case 'FIXED_90':
        return 90000;
      default:
        return 35000;
    }
  }, [timerMode]);

  // Deterministic Audio Helpers (Fixed Stale Closure Bug)
  const speakSpecificWord = useCallback((item: VocabularyItem | null) => {
    if (!item) return;
    if (item.sound_file) {
      playWordAudio(item.sound_file, item.english);
    } else {
      speakText(item.english);
    }
  }, [playWordAudio, speakText]);

  const speakSpecificNumber = useCallback((num: number) => {
    const word = NUMBER_WORDS[num] || String(num);
    speakText(word);
  }, [speakText]);

  // Start round
  const startRound = useCallback((isNextRound: boolean = false) => {
    setIsExplosionLocked(false);
    if (explosionLockTimerRef.current) {
      clearTimeout(explosionLockTimerRef.current);
      explosionLockTimerRef.current = null;
    }

    const dur = getNextDurationMs();
    setTotalDurationMs(dur);
    setRemainingMs(dur);
    setPassCount(0);
    setStatus('TICKING');
    setActiveMission(null);

    soundEffects.playPassSwoosh();

    if (gameMode === 'WORD_FLASH') {
      let q = shuffledQueue;
      if (q.length === 0) {
        q = replenishQueue();
      }

      // If starting the next round after an explosion, advance to the next card in queue
      let targetIdx = currentWordIndex;
      if (isNextRound || status === 'EXPLODED') {
        targetIdx = currentWordIndex + 1;
        if (targetIdx >= q.length) {
          // Deck exhausted: reshuffle for fresh variety
          q = shuffleArray([...wordPool]);
          setShuffledQueue(q);
          targetIdx = 0;
        }
        setCurrentWordIndex(targetIdx);
      }

      const targetWord = q[targetIdx % q.length] || null;
      if (autoPronounce && targetWord) {
        speakSpecificWord(targetWord);
      }
    } else if (gameMode === 'NUMBER_COUNT') {
      setCurrentNumber(1);
      if (autoPronounce) {
        speakSpecificNumber(1);
      }
    }
  }, [
    getNextDurationMs,
    gameMode,
    shuffledQueue,
    replenishQueue,
    currentWordIndex,
    status,
    wordPool,
    autoPronounce,
    speakSpecificWord,
    speakSpecificNumber
  ]);

  // Pass helper (Immediately pronounces the NEXT card/number)
  const handlePass = useCallback(() => {
    if (status !== 'TICKING') return;

    soundEffects.playPassSwoosh();
    setPassCount(prev => prev + 1);

    if (gameMode === 'WORD_FLASH') {
      if (shuffledQueue.length === 0) return;
      const nextIdx = (currentWordIndex + 1) % shuffledQueue.length;
      setCurrentWordIndex(nextIdx);
      const nextWord = shuffledQueue[nextIdx];
      if (autoPronounce && nextWord) {
        speakSpecificWord(nextWord);
      }
    } else if (gameMode === 'NUMBER_COUNT') {
      const nextNum = currentNumber >= numberMax ? 1 : currentNumber + 1;
      setCurrentNumber(nextNum);
      if (autoPronounce) {
        speakSpecificNumber(nextNum);
      }
    }
  }, [status, gameMode, currentWordIndex, shuffledQueue, currentNumber, numberMax, autoPronounce, speakSpecificWord, speakSpecificNumber]);

  // Trigger round end (Too hot / Pop / Corn pop)
  const triggerEndEvent = useCallback(() => {
    setStatus('EXPLODED');
    setIsExplosionLocked(true);
    if (explosionLockTimerRef.current) clearTimeout(explosionLockTimerRef.current);
    explosionLockTimerRef.current = setTimeout(() => {
      setIsExplosionLocked(false);
    }, 1800);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (theme === 'POTATO') {
      soundEffects.playSizzle();
      confetti({
        particleCount: 80,
        spread: 85,
        origin: { y: 0.55 },
        colors: ['#f59e0b', '#fbbf24', '#fef08a', '#ef4444']
      });
    } else if (theme === 'BALLOON') {
      soundEffects.playBalloonPop();
      confetti({
        particleCount: 100,
        spread: 100,
        origin: { y: 0.55 },
        colors: ['#38bdf8', '#ec4899', '#a855f7', '#fbbf24', '#10b981']
      });
    } else {
      soundEffects.playPopcornPop();
      soundEffects.playChime();
      confetti({
        particleCount: 85,
        spread: 90,
        origin: { y: 0.55 },
        colors: ['#ffffff', '#fef08a', '#facc15', '#fde047']
      });
    }

    const nextMission = pullNextMission();
    setActiveMission(nextMission);
  }, [theme, pullNextMission]);

  // Main countdown loop & audio ticking
  useEffect(() => {
    if (status !== 'TICKING') {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const intervalTime = 200;
    let lastTickAudio = Date.now();
    let currentRemaining = remainingMsRef.current;

    intervalRef.current = window.setInterval(() => {
      currentRemaining = Math.max(0, currentRemaining - intervalTime);
      remainingMsRef.current = currentRemaining;
      setRemainingMs(currentRemaining);

      if (currentRemaining <= 0) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        triggerEndEvent();
        return;
      }

      const pct = currentRemaining / totalDurationMs;
      const now = Date.now();

      let tickGap = 850;
      if (pct < 0.15) {
        tickGap = 160;
      } else if (pct < 0.35) {
        tickGap = 300;
      } else if (pct < 0.60) {
        tickGap = 520;
      }

      if (now - lastTickAudio >= tickGap) {
        lastTickAudio = now;
        if (pct < 0.25) {
          soundEffects.playUrgencyTick();
        } else {
          soundEffects.playTick();
        }

        if (theme === 'POTATO' && Math.random() < 0.25) {
          soundEffects.playFuseCrackle();
        } else if (theme === 'POPCORN' && Math.random() < 0.2) {
          soundEffects.playPopcornPop();
        }
      }
    }, intervalTime);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [status, totalDurationMs, triggerEndEvent, theme]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (isInstructionsOpen || showManualModal || isSettingsOpen) return;

      if (e.key === '?' || e.key === '/' || e.code === 'KeyH') {
        e.preventDefault();
        setIsInstructionsOpen(true);
        soundEffects.playCardFlip();
        return;
      }

      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        if (status === 'IDLE') {
          startRound();
        } else if (status === 'TICKING') {
          handlePass();
        } else if (status === 'EXPLODED') {
          // Guard lockout: Swallow Space/Enter for 1.8s so rapid passing taps never skip the fun mission!
          if (isExplosionLocked) return;
          setRoundNumber(r => r + 1);
          startRound(true);
        }
      } else if (e.code === 'KeyP') {
        e.preventDefault();
        if (status === 'TICKING') setStatus('PAUSED');
        else if (status === 'PAUSED') setStatus('TICKING');
      } else if (e.code === 'KeyR') {
        e.preventDefault();
        setStatus('IDLE');
        setPassCount(0);
        setRoundNumber(1);
        setCurrentWordIndex(0);
        replenishQueue();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status, startRound, handlePass, isExplosionLocked, isInstructionsOpen, showManualModal, isSettingsOpen]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (explosionLockTimerRef.current) {
        clearTimeout(explosionLockTimerRef.current);
      }
    };
  }, []);

  // Calculated percentage
  const progressPct = Math.max(0, Math.min(100, (remainingMs / totalDurationMs) * 100));
  const isPanic = progressPct < 25 && status === 'TICKING';
  const isNervous = progressPct < 60 && !isPanic && status === 'TICKING';

  // Balloon scale factor: grows from 0.9 to 1.35
  const balloonScale = 0.9 + ((100 - progressPct) / 100) * 0.45;

  // Current Card Image
  const cardImage = useMemo(() => {
    if (!currentWord) return null;
    return resolveCardImage(currentWord, 'picture_only', activeGrade);
  }, [currentWord, activeGrade]);

  const activeCategory = CATEGORIES_LIST[activeCategoryIndex % CATEGORIES_LIST.length];

  const stageActionBar = status !== 'EXPLODED' ? (
    <div className="w-full shrink-0 flex flex-col items-center gap-1">
      {status === 'IDLE' ? (
        <button
          onClick={() => startRound(false)}
          className={`w-full py-3 md:py-3.5 text-white text-xl md:text-2xl font-black rounded-2xl shadow-xl transition-all transform active:scale-95 flex items-center justify-center gap-2.5 border-2 cursor-pointer ${
            theme === 'POTATO'
              ? 'bg-gradient-to-r from-amber-600 via-orange-500 to-amber-700 hover:from-amber-500 hover:to-orange-500 border-amber-300 shadow-amber-500/40'
              : theme === 'BALLOON'
              ? 'bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-600 hover:from-sky-400 hover:to-blue-400 border-sky-300 shadow-blue-500/40'
              : 'bg-gradient-to-r from-yellow-500 via-amber-500 to-orange-500 hover:from-yellow-400 hover:to-amber-400 border-yellow-200 text-slate-950 shadow-yellow-500/40 font-black'
          }`}
        >
          <Play size={24} className={theme === 'POPCORN' ? 'fill-slate-950' : 'fill-white'} />
          <span>
            {theme === 'POTATO'
              ? t('START POTATO', 'スタート！')
              : theme === 'BALLOON'
              ? t('START BALLOON', 'スタート！')
              : t('START POPPER', 'スタート！')}
          </span>
        </button>
      ) : (
        <button
          onClick={handlePass}
          disabled={status === 'PAUSED'}
          className="w-full py-3 md:py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white text-xl md:text-3xl font-black rounded-2xl shadow-xl hover:shadow-emerald-500/40 transition-all transform active:scale-95 flex items-center justify-center gap-3 border-2 border-emerald-300 cursor-pointer"
        >
          <span>{t('PASS NEXT!', 'パス！')}</span>
          <ChevronRight size={30} />
        </button>
      )}

      <div className="text-[11px] text-slate-400 font-mono">
        {t('Keyboard: Space or Enter to Pass', 'キーボード操作: Space または Enter でパス')}
      </div>
    </div>
  ) : undefined;

  const sidebarContent = (
    <>
      {/* Top: 3-in-1 Theme Switcher (Compact 3-Pill Grid) */}
        <div>
          <div className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span>{t('Theme', 'テーマ')}</span>
            <span className="text-amber-400 font-bold">3-in-1</span>
          </div>
          <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => { setTheme('POTATO'); soundEffects.playCardFlip(); }}
              className={`py-1 px-1 rounded-lg text-xs font-black flex items-center justify-center gap-1 transition-all ${
                theme === 'POTATO'
                  ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-xs border border-amber-400/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <span className="text-sm">🥔</span>
              <span className="truncate">{t('Potato', 'ポテト')}</span>
            </button>

            <button
              onClick={() => { setTheme('BALLOON'); soundEffects.playCardFlip(); }}
              className={`py-1 px-1 rounded-lg text-xs font-black flex items-center justify-center gap-1 transition-all ${
                theme === 'BALLOON'
                  ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-xs border border-sky-400/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <span className="text-sm">🎈</span>
              <span className="truncate">{t('Balloon', '風船')}</span>
            </button>

            <button
              onClick={() => { setTheme('POPCORN'); soundEffects.playCardFlip(); }}
              className={`py-1 px-1 rounded-lg text-xs font-black flex items-center justify-center gap-1 transition-all ${
                theme === 'POPCORN'
                  ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-slate-950 shadow-xs border border-yellow-300/40 font-black'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <span className="text-sm">🍿</span>
              <span className="truncate">{t('Popcorn', 'ポップ')}</span>
            </button>
          </div>
        </div>

        {/* Center: The Animated Suspense Character & Heat/Timer Gauge */}
        <div className="flex-1 flex flex-col items-center justify-center py-1.5 px-2 relative overflow-hidden bg-slate-950/70 rounded-2xl border border-slate-800/80 min-h-[120px] max-h-[190px]">
          {/* THEME 1: 🥔 POTATO */}
          {theme === 'POTATO' && (
            <div className="relative flex flex-col items-center">
              {/* Wavy Steam */}
              <div className="h-5 sm:h-6 flex justify-center items-end">
                <div className={`flex items-end gap-1.5 text-slate-300 transition-all ${status === 'TICKING' ? (isPanic ? 'animate-pulse scale-110' : 'animate-bounce') : 'opacity-30'}`}>
                  <span className="text-sm">♨️</span>
                  <span className="text-xs">♨️</span>
                  <span className="text-sm">♨️</span>
                </div>
              </div>
              {/* Potato Body */}
              <div
                className={`relative w-24 h-18 sm:w-28 sm:h-20 rounded-[45%_55%_50%_50%/50%_45%_55%_50%] bg-gradient-to-br from-amber-600 via-amber-700 to-amber-950 shadow-xl flex flex-col items-center justify-center border-3 transition-all ${
                  isPanic
                    ? 'border-red-500 shadow-[0_0_24px_rgba(239,68,68,0.7)] animate-bounce'
                    : isNervous
                    ? 'border-amber-400 shadow-[0_0_16px_rgba(251,191,36,0.5)]'
                    : 'border-amber-800'
                }`}
                style={{ animationDuration: isPanic ? '180ms' : undefined }}
              >
                {/* Melting Butter */}
                <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-8 h-3 bg-gradient-to-r from-yellow-200 to-amber-300 rounded shadow border border-yellow-400 rotate-6" />
                {/* Eyes */}
                <div className="flex items-center gap-3 mb-0.5">
                  <div className={`bg-white rounded-full flex items-center justify-center ${isPanic ? 'w-4 h-5 border border-red-500' : 'w-3.5 h-4'}`}>
                    <div className={`bg-black rounded-full ${isPanic ? 'w-2 h-2.5 animate-pulse' : 'w-1.5 h-1.5'}`} />
                  </div>
                  <div className={`bg-white rounded-full flex items-center justify-center ${isPanic ? 'w-4 h-5 border border-red-500' : 'w-3.5 h-4'}`}>
                    <div className={`bg-black rounded-full ${isPanic ? 'w-2 h-2.5 animate-pulse' : 'w-1.5 h-1.5'}`} />
                  </div>
                </div>
                {/* Mouth */}
                {isPanic ? (
                  <div className="w-4 h-3 border border-white rounded-full bg-red-600" />
                ) : (
                  <div className="w-3.5 h-1.5 border-b-2 border-white rounded-b-full" />
                )}
              </div>
            </div>
          )}

          {/* THEME 2: 🎈 BALLOON */}
          {theme === 'BALLOON' && (
            <div className="relative flex flex-col items-center">
              <div
                className="transition-transform duration-200 ease-linear flex flex-col items-center"
                style={{ transform: status === 'TICKING' ? `scale(${balloonScale})` : 'scale(0.9)' }}
              >
                <div
                  className={`relative w-22 h-26 sm:w-24 sm:h-28 rounded-[50%_50%_50%_50%/45%_45%_55%_55%] bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 shadow-xl flex flex-col items-center justify-center border-3 ${
                    isPanic
                      ? 'border-red-400 shadow-[0_0_24px_rgba(244,63,94,0.8)] animate-pulse'
                      : isNervous
                      ? 'border-yellow-300 shadow-[0_0_15px_rgba(56,189,248,0.6)]'
                      : 'border-sky-300'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-0.5">
                    <div className="bg-white rounded-full w-3.5 h-4 flex items-center justify-center">
                      <div className="bg-black rounded-full w-1.5 h-1.5" />
                    </div>
                    <div className="bg-white rounded-full w-3.5 h-4 flex items-center justify-center">
                      <div className="bg-black rounded-full w-1.5 h-1.5" />
                    </div>
                  </div>
                  {isPanic ? (
                    <div className="w-5 h-3.5 border border-white rounded-full bg-rose-500" />
                  ) : (
                    <div className="w-3.5 h-1.5 border-b-2 border-white rounded-b-full" />
                  )}
                </div>
                <div className="w-2.5 h-1.5 bg-blue-700 rounded-b-md -mt-0.5" />
                <div className="w-0.5 h-3 bg-slate-400" />
              </div>
            </div>
          )}

          {/* THEME 3: 🍿 POPCORN */}
          {theme === 'POPCORN' && (
            <div className="relative flex flex-col items-center">
              <div className="text-[9px] text-amber-500 font-bold mb-0.5">
                {t('🔥 HEATING 🔥', <>🔥 <ruby>加熱中<rt className="text-[7px]">かねつちゅう</rt></ruby> 🔥</>)}
              </div>
              <div
                className={`relative w-22 h-22 sm:w-24 sm:h-24 rounded-[50%_50%_45%_45%/60%_60%_40%_40%] bg-gradient-to-br from-yellow-300 via-amber-400 to-amber-600 shadow-xl flex flex-col items-center justify-center border-3 transition-all ${
                  isPanic
                    ? 'border-yellow-200 shadow-[0_0_24px_rgba(250,204,21,0.9)] animate-bounce'
                    : 'border-amber-500'
                }`}
                style={{ animationDuration: isPanic ? '140ms' : undefined }}
              >
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 text-base">👨‍🍳</div>
                <div className="flex items-center gap-3 mb-0.5 mt-0.5">
                  <div className="bg-white rounded-full w-3.5 h-4 flex items-center justify-center">
                    <div className="bg-slate-900 rounded-full w-1.5 h-1.5" />
                  </div>
                  <div className="bg-white rounded-full w-3.5 h-4 flex items-center justify-center">
                    <div className="bg-slate-900 rounded-full w-1.5 h-1.5" />
                  </div>
                </div>
                {isPanic ? (
                  <div className="w-4 h-3 border border-slate-900 rounded-full bg-amber-300" />
                ) : (
                  <div className="w-3.5 h-1.5 border-b-2 border-slate-900 rounded-b-full" />
                )}
              </div>
              <div className="w-28 sm:w-32 h-2 bg-slate-800 rounded-full border border-slate-700 mt-1" />
            </div>
          )}

          {/* Gauge / Timer Tag */}
          <div className="mt-1 flex items-center gap-2">
            <span className="text-xs font-black px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-amber-400 font-mono">
              {status === 'IDLE'
                ? t('READY', '準備完了')
                : hideTimerDisplay
                ? (theme === 'POTATO' ? t('HOT 🔥', 'アツアツ 🔥') : theme === 'BALLOON' ? t('AIR 💨', '空気 💨') : t('POP? 🍿', 'ポンッ? 🍿'))
                : `${(remainingMs / 1000).toFixed(1)}s`}
            </span>
          </div>

          {/* Round & Pass Stat Badges */}
          <div className="w-full flex items-center justify-around mt-1.5 pt-1 border-t border-slate-800/80 text-xs">
            <div className="text-center">
              <span className="text-slate-400 block text-[9px] font-bold">{t('Round', 'ラウンド')}</span>
              <span className="text-amber-400 font-black text-xs sm:text-sm">#{roundNumber}</span>
            </div>
            <div className="w-px h-5 bg-slate-800" />
            <div className="text-center">
              <span className="text-slate-400 block text-[9px] font-bold">{t('Passes', 'パス')}</span>
              <span className="text-emerald-400 font-black text-xs sm:text-sm">{passCount}</span>
            </div>
          </div>
        </div>

        {/* Middle: Educational Modes (Vertical Tabs) */}
        <div>
          <div className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1">
            {t('Mode', 'モード')}
          </div>
          <div className="flex flex-col gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => { setGameMode('WORD_FLASH'); if (status !== 'IDLE') setStatus('IDLE'); }}
              className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
                gameMode === 'WORD_FLASH'
                  ? 'bg-slate-800 text-white shadow border border-slate-700 font-black'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
              }`}
            >
              <Layers size={14} className="text-rose-400 shrink-0" />
              <span className="truncate">{t('Word Cards', '単語カード')}</span>
            </button>

            <button
              onClick={() => { setGameMode('NUMBER_COUNT'); if (status !== 'IDLE') setStatus('IDLE'); }}
              className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center justify-between gap-2 transition-all ${
                gameMode === 'NUMBER_COUNT'
                  ? 'bg-slate-800 text-cyan-300 shadow border border-slate-700 font-black'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
              }`}
            >
              <div className="flex items-center gap-1.5 truncate">
                <Hash size={14} className="text-cyan-400 shrink-0" />
                <span className="truncate">{t(`Numbers (1-${numberMax})`, `数字 (1-${numberMax})`)}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {[10, 20].map(val => (
                  <span
                    key={val}
                    onClick={(e) => { e.stopPropagation(); setNumberMax(val); }}
                    className={`text-[9px] px-1.5 py-0.5 rounded cursor-pointer ${numberMax === val ? 'bg-cyan-600 text-white font-black' : 'bg-slate-900 text-slate-400'}`}
                  >
                    {val}
                  </span>
                ))}
              </div>
            </button>

            <button
              onClick={() => { setGameMode('CATEGORY_RALLY'); if (status !== 'IDLE') setStatus('IDLE'); }}
              className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center justify-between gap-2 transition-all ${
                gameMode === 'CATEGORY_RALLY'
                  ? 'bg-slate-800 text-emerald-300 shadow border border-slate-700 font-black'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
              }`}
            >
              <div className="flex items-center gap-1.5 truncate">
                <Sparkles size={14} className="text-emerald-400 shrink-0" />
                <span className="truncate">{t('Category Rally', '連想ラリー')}</span>
              </div>
              {gameMode === 'CATEGORY_RALLY' && (
                <span
                  onClick={(e) => { e.stopPropagation(); setActiveCategoryIndex(i => i + 1); }}
                  className="p-1 rounded bg-slate-900 hover:bg-slate-700 text-emerald-300 cursor-pointer"
                  title="Next Category"
                >
                  <Shuffle size={11} />
                </span>
              )}
            </button>
          </div>
        </div>

      {/* Bottom Control Bar: Pause/Resume + Reset + Settings Modal Trigger */}
      <div className="flex items-center justify-between gap-1.5 pt-1.5 border-t border-slate-800/80 shrink-0">
        {status === 'TICKING' && (
          <button
            onClick={() => setStatus('PAUSED')}
            className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
            title={t('Pause', '一時停止')}
          >
            <Pause size={14} />
            <span>{t('Pause', '一時停止')}</span>
          </button>
        )}
        {status === 'PAUSED' && (
          <button
            onClick={() => setStatus('TICKING')}
            className="flex-1 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
            title={t('Resume', '再開')}
          >
            <Play size={14} />
            <span>{t('Resume', '再開')}</span>
          </button>
        )}

        <button
          onClick={() => {
            setStatus('IDLE');
            setPassCount(0);
            setRoundNumber(1);
            setCurrentWordIndex(0);
            replenishQueue();
            soundEffects.playCardFlip();
          }}
          className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl border border-slate-700 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
          title={t('Reset', 'リセット')}
        >
          <RotateCcw size={14} />
          <span>{t('Reset', 'リセット')}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setIsInstructionsOpen(true);
            soundEffects.playCardFlip();
          }}
          className="p-1.5 bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/40 rounded-xl text-xs font-bold flex items-center justify-center cursor-pointer transition-all active:scale-95 shrink-0"
          title={t('How to Play', 'あそび方・ルール (? / H)')}
        >
          <BookOpen size={15} />
        </button>

        <button
          type="button"
          onClick={() => {
            setIsSettingsOpen(true);
            soundEffects.playCardFlip();
          }}
          className="p-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold flex items-center justify-center cursor-pointer transition-all active:scale-95 shrink-0"
          title={t('Game Settings', 'ゲーム設定')}
        >
          <Settings size={15} />
        </button>
      </div>
    </>
  );

  return (
    <>
      <CinemaStageLayout
        sidebarWidth="compact"
        onExit={onExit}
        title={t('Hot Potato', <><ruby>爆弾<rt className="text-[7px]">ばくだん</rt></ruby>ゲーム</>)}
        badge={
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-slate-950">
            STREAM A
          </span>
        }
        onOpenSettings={() => {
          setIsSettingsOpen(true);
          soundEffects.playCardFlip();
        }}
        sidebar={sidebarContent}
        stageAction={stageActionBar}
      >
        {/* ROUND FINISHED / POP SCREEN */}
        {status === 'EXPLODED' && (
          <div className="w-full flex-1 flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-300 py-4">
            <div className="text-7xl md:text-9xl animate-bounce filter drop-shadow-[0_0_35px_rgba(245,158,11,0.7)] mb-2">
              {theme === 'POTATO' ? '🔥🥔🔥' : theme === 'BALLOON' ? '🎈💥' : '🍿✨'}
            </div>

            <h2 className="text-3xl md:text-5xl font-black text-amber-400 mb-1 tracking-tight">
              {theme === 'POTATO'
                ? t('HOT! HOT! (TOO HOT!)', 'HOT! HOT! (アツアツ！)')
                : theme === 'BALLOON'
                ? t('POP!! (BALLOON POPPED!)', 'POP!! (パチン！)')
                : t('POPPED!! (FRESH POPCORN!)', 'POPPED!! (できたてポップコーン！)')}
            </h2>
            <p className="text-slate-300 text-base md:text-lg font-bold mb-4">
              {t('Total Safe Passes:', 'セーフ回数:')} <span className="text-emerald-400 font-black text-2xl mx-1">{passCount}{t(' passes', '回')}</span>
            </p>

            {/* Fun Mini Mission Card */}
            {activeMission && (
              <div className="w-full max-w-xl bg-gradient-to-br from-amber-500/20 via-slate-900 to-purple-950 border-2 border-amber-400/60 rounded-3xl p-5 shadow-2xl mb-5 relative overflow-hidden">
                <div className="absolute top-2 right-3 flex items-center gap-1 text-xs text-amber-400/80 font-black">
                  <Sparkles size={14} />
                  <span>{t('FUN MISSION', <><ruby>楽<rt className="text-[7px]">たの</rt></ruby>しいミッション</>)}</span>
                </div>
                <div className="text-5xl mb-2">{activeMission.icon}</div>
                <div className="text-2xl md:text-3xl font-black text-white mb-1.5 leading-snug">
                  {language === 'en' ? activeMission.en : activeMission.ja}
                </div>
                <div className="text-base md:text-lg font-bold text-amber-300">
                  {language === 'en' ? activeMission.ja : activeMission.en}
                </div>
                <button
                  onClick={() => {
                    const nextM = pullNextMission();
                    setActiveMission(nextM);
                    soundEffects.playCardFlip();
                  }}
                  className="mt-3 px-3 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-full text-xs font-bold transition-all border border-slate-700"
                >
                  {t('Roll Another Mission 🎲', <><ruby>別<rt className="text-[7px]">べつ</rt></ruby>のミッション 🎲</>)}
                </button>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-4">
              <button
                onClick={() => {
                  if (isExplosionLocked) return;
                  setRoundNumber(r => r + 1);
                  startRound(true);
                }}
                disabled={isExplosionLocked}
                className={`px-8 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white text-xl md:text-2xl font-black rounded-2xl shadow-xl hover:shadow-emerald-500/30 transition-all transform active:scale-95 flex items-center gap-3 border-2 border-emerald-300 ${
                  isExplosionLocked ? 'opacity-60 cursor-not-allowed' : ''
                }`}
              >
                <RotateCcw size={24} />
                <span>{t('Next Round', '次のラウンド')}</span>
              </button>

              <button
                onClick={() => {
                  setStatus('IDLE');
                  if (shuffledQueue.length > 0) {
                    const nextIdx = (currentWordIndex + 1) % shuffledQueue.length;
                    setCurrentWordIndex(nextIdx);
                  }
                }}
                className="px-6 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm md:text-base font-bold rounded-2xl border border-slate-700 transition-all"
              >
                {t('Back to Ready', '待機画面に戻る')}
              </button>
            </div>
          </div>
        )}

        {/* ACTIVE STAGE DISPLAY: UNIFIED CARD (NO NESTED BOXES!) */}
        {status !== 'EXPLODED' && (
          <div className="w-full flex-1 flex flex-col items-center justify-between min-h-0">
            {/* MODE 1: WORD FLASH (Unified Textbook Card) */}
            {gameMode === 'WORD_FLASH' && (
              <div className="w-full flex-1 flex flex-col items-center justify-between bg-white dark:bg-slate-900 border-4 border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-4 md:p-6 min-h-0 relative">
                {/* The Illustration fills the majority of the card */}
                <div className="flex-1 w-full flex items-center justify-center min-h-0 overflow-hidden">
                  {cardImage ? (
                    <img
                      src={cardImage}
                      alt={currentWord?.english || 'Card'}
                      className="w-full h-full max-h-[min(56vh,540px)] object-contain filter drop-shadow-md transition-all"
                    />
                  ) : (
                    <div className="text-slate-400 font-bold text-lg">
                      {t('No Image Available', '画像なし')}
                    </div>
                  )}
                </div>

                {/* English Word & Japanese Ruby directly on the card */}
                <div className="w-full flex flex-col items-center justify-center pt-2 md:pt-3 border-t border-slate-100 dark:border-slate-800/80 shrink-0">
                  <div className="flex items-center gap-3">
                    <h3 className="text-4xl md:text-6xl lg:text-7xl font-black text-slate-900 dark:text-white tracking-wide">
                      {currentWord?.english || '...'}
                    </h3>
                    <button
                      onClick={() => speakSpecificWord(currentWord)}
                      className="p-2 md:p-2.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-amber-500 dark:text-amber-400 transition-all border border-slate-200 dark:border-slate-700 shadow-sm"
                    >
                      <Volume2 size={24} />
                    </button>
                  </div>
                  <p className="text-xl md:text-2xl lg:text-3xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                    {currentWord?.ja_hiragana || currentWord?.ja_kanji || ''}
                  </p>
                </div>
              </div>
            )}

            {/* MODE 2: NUMBER COUNT (Colossal Widescreen Numeral) */}
            {gameMode === 'NUMBER_COUNT' && (
              <div className="w-full flex-1 flex flex-col items-center justify-center bg-white dark:bg-slate-900 border-4 border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 min-h-0 text-center">
                <div className="text-8xl md:text-[160px] lg:text-[200px] leading-none font-black bg-gradient-to-tr from-cyan-400 via-blue-500 to-indigo-600 bg-clip-text text-transparent drop-shadow-xl mb-3">
                  {currentNumber}
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-3xl md:text-6xl lg:text-7xl font-black text-amber-500 dark:text-amber-400 capitalize">
                    {NUMBER_WORDS[currentNumber] || currentNumber}
                  </div>
                  <button
                    onClick={() => speakSpecificNumber(currentNumber)}
                    className="p-3 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-cyan-500 transition-all border border-slate-200 dark:border-slate-700 shadow-sm"
                  >
                    <Volume2 size={26} />
                  </button>
                </div>
                <p className="text-sm md:text-base font-bold text-slate-400 mt-3">
                  {t(`Say "${NUMBER_WORDS[currentNumber] || currentNumber}" and pass!`, `「${NUMBER_WORDS[currentNumber] || currentNumber}」と言ってパス！`)}
                </p>
              </div>
            )}

            {/* MODE 3: CATEGORY RALLY (Spacious Theme Showcase) */}
            {gameMode === 'CATEGORY_RALLY' && (
              <div className="w-full flex-1 flex flex-col items-center justify-center bg-white dark:bg-slate-900 border-4 border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 min-h-0 text-center">
                <div className="text-7xl md:text-9xl mb-3">{activeCategory.icon}</div>
                <h3 className="text-4xl md:text-6xl lg:text-7xl font-black text-emerald-500 dark:text-emerald-400 mb-2">
                  {language === 'en' ? activeCategory.name : activeCategory.ja}
                </h3>
                <p className="text-xl md:text-2xl lg:text-3xl font-bold text-slate-600 dark:text-slate-300 mb-6">
                  {t(`Name any ${activeCategory.name} word and pass!`, `${activeCategory.ja}の単語を言ってパス！`)}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3 max-w-4xl">
                  {activeCategory.examples.map((ex, idx) => (
                    <span
                      key={idx}
                      className="px-4 md:px-5 py-2 md:py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm md:text-xl font-black text-slate-700 dark:text-slate-200 shadow-sm"
                    >
                      {ex}
                    </span>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

        {/* 4-Team Overlay Bar if active */}
        {teamMode && (
          <div className="w-full grid grid-cols-4 gap-2 mt-2 pt-2 border-t border-slate-800/80">
            {(['red', 'blue', 'yellow', 'green'] as const).map(team => {
              const colors = {
                red: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
                blue: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
                yellow: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
                green: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
              };
              return (
                <div
                  key={team}
                  className={`flex items-center justify-between px-3 py-1.5 rounded-xl border ${colors[team]}`}
                >
                  <span className="text-xs font-black capitalize">{team}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black">{teamCaught[team]}</span>
                    <button
                      onClick={() => setTeamCaught(prev => ({ ...prev, [team]: prev[team] + 1 }))}
                      className="text-xs hover:scale-125 transition-transform"
                      title="Add caught"
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CinemaStageLayout>

      {/* Settings Modal Applet */}
      <TimebombSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        timerMode={timerMode}
        setTimerMode={setTimerMode}
        hideTimerDisplay={hideTimerDisplay}
        setHideTimerDisplay={setHideTimerDisplay}
        autoPronounce={autoPronounce}
        setAutoPronounce={setAutoPronounce}
        teamMode={teamMode}
        setTeamMode={setTeamMode}
        onOpenTeacherGuide={() => setShowManualModal(true)}
        onOpenInstructions={() => setIsInstructionsOpen(true)}
        gameMode={gameMode}
        setGameMode={setGameMode}
        numberMax={numberMax}
        setNumberMax={setNumberMax}
      />

      {/* Instructions / How to Play Modal */}
      <TimebombInstructionsModal
        isOpen={isInstructionsOpen}
        onClose={() => setIsInstructionsOpen(false)}
      />

      {/* Teacher Instruction Manual & Printable Modal */}
      {showManualModal && (
        <TimebombManualModal onClose={() => setShowManualModal(false)} />
      )}
    </>
  );
};
