import React, { useState, useEffect, useCallback } from 'react';
import { X, Play, Sun, Moon, ChevronLeft, ChevronRight, Maximize2, Minimize2 } from 'lucide-react';
import { useClassroom } from '@/context/ClassroomContext';
import { useAudio } from '@/context/AudioContext';
import { soundEffects } from '@/services/soundEffects';

interface DreamTownInstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TutorialSlide {
  step: number;
  theme: {
    border: string;
    pillBg: string;
    graphicBg: string;
    accentText: string;
  };
  graphicIcons: React.ReactNode;
  badgeJa: string;
  badgeEn: string;
  titleJa: React.ReactNode;
  titleEn: string;
  instructionJa: React.ReactNode;
  instructionEn: string;
  tipJa: React.ReactNode;
  tipEn: string;
}

const TUTORIAL_SLIDES: TutorialSlide[] = [
  // Slide 1: Welcome
  {
    step: 1,
    theme: {
      border: 'border-emerald-400 dark:border-emerald-500',
      pillBg: 'bg-emerald-500 text-slate-950',
      graphicBg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60',
      accentText: 'text-emerald-600 dark:text-emerald-400'
    },
    graphicIcons: (
      <>
        <span className="text-3xl sm:text-4xl md:text-5xl">🏛️</span>
        <span className="text-3xl sm:text-4xl md:text-5xl">🍞</span>
        <span className="text-3xl sm:text-4xl md:text-5xl">🌉</span>
        <span className="text-3xl sm:text-4xl md:text-5xl">🌸</span>
        <span className="text-3xl sm:text-4xl md:text-5xl">🐬</span>
      </>
    ),
    badgeJa: '🏘️ ドリームタウンへようこそ',
    badgeEn: '🏘️ Welcome to Dream Town',
    titleJa: (
      <>
        ペアで<ruby>話<rt className="text-[10px] sm:text-xs font-bold text-slate-400">はな</rt></ruby>して、<ruby>理想<rt className="text-[10px] sm:text-xs font-bold text-slate-400">りそう</rt></ruby>の<ruby>街<rt className="text-[10px] sm:text-xs font-bold text-slate-400">まち</rt></ruby>をつくろう！
      </>
    ),
    titleEn: 'Talk in Pairs and Build Your Dream Kingdom Together!',
    instructionJa: (
      <>
        「ドリームタウン・アーキテクト」は、<ruby>英語<rt className="text-[10px] sm:text-xs font-bold text-slate-400">えいご</rt></ruby>の<ruby>道案内<rt className="text-[10px] sm:text-xs font-bold text-slate-400">みちあんない</rt></ruby>や<ruby>位置<rt className="text-[10px] sm:text-xs font-bold text-slate-400">いち</rt></ruby>の<ruby>表現<rt className="text-[10px] sm:text-xs font-bold text-slate-400">ひょうげん</rt></ruby>（「next to」「between」など）を<ruby>使<rt className="text-[10px] sm:text-xs font-bold text-slate-400">つか</rt></ruby>って、2<ruby>人<rt className="text-[10px] sm:text-xs font-bold text-slate-400">にん</rt></ruby>で<ruby>協力<rt className="text-[10px] sm:text-xs font-bold text-slate-400">きょうりょく</rt></ruby>して<ruby>街<rt className="text-[10px] sm:text-xs font-bold text-slate-400">まち</rt></ruby>を<ruby>完成<rt className="text-[10px] sm:text-xs font-bold text-slate-400">かんせい</rt></ruby>させるゲームです。
      </>
    ),
    instructionEn: 'Dream Town Architects is an interactive pair-work game where partners use English directions and prepositions (next to, between, across from) to complete and explore a living 3D town.',
    tipJa: (
      <>
        💡 <strong><ruby>先生<rt className="text-[9px]">せんせい</rt></ruby>・ALTへのヒント：</strong>お<ruby>互<rt className="text-[9px]">たが</rt></ruby>いの<ruby>画面<rt className="text-[9px]">がめん</rt></ruby>を<ruby>見<rt className="text-[9px]">み</rt></ruby>ずに「<ruby>英語<rt className="text-[9px]">えいご</rt></ruby>の<ruby>声<rt className="text-[9px]">こえ</rt></ruby>」だけでやりとりするのが<ruby>一番<rt className="text-[9px]">いちばん</rt></ruby>のポイントです！
      </>
    ),
    tipEn: '💡 Teacher Tip: Keep screens angled away from each other so students rely purely on speaking and listening English!'
  },

  // Slide 2: Mode 1 - Missing Blueprint Info Gap
  {
    step: 2,
    theme: {
      border: 'border-rose-400 dark:border-rose-500',
      pillBg: 'bg-rose-500 text-white',
      graphicBg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60',
      accentText: 'text-rose-600 dark:text-rose-400'
    },
    graphicIcons: (
      <>
        <span className="text-3xl sm:text-4xl md:text-5xl">📱</span>
        <span className="text-xl sm:text-2xl font-black text-rose-500">❓ ➔ 🍞</span>
        <span className="text-3xl sm:text-4xl md:text-5xl">📱</span>
      </>
    ),
    badgeJa: '🗺️ モード1：建物あて（情報ギャップ）',
    badgeEn: '🗺️ Mode 1: The Missing Blueprint (Info-Gap)',
    titleJa: (
      <>
        「Where is the ~?」と<ruby>聞<rt className="text-[10px] sm:text-xs font-bold text-slate-400">き</rt></ruby>いて、<ruby>正<rt className="text-[10px] sm:text-xs font-bold text-slate-400">ただ</rt></ruby>しい<ruby>場所<rt className="text-[10px] sm:text-xs font-bold text-slate-400">ばしょ</rt></ruby>に<ruby>建<rt className="text-[10px] sm:text-xs font-bold text-slate-400">た</rt></ruby>てよう！
      </>
    ),
    titleEn: 'Ask "Where is the ~?" and Place Buildings with Your Partner!',
    instructionJa: (
      <>
        <strong>アーキテクトA</strong>は「Where is the bakery?」と<ruby>質問<rt className="text-[10px] sm:text-xs font-bold text-slate-400">しつもん</rt></ruby>！<br />
        <strong>アーキテクトB</strong>は<ruby>設計図<rt className="text-[10px] sm:text-xs font-bold text-slate-400">せっけいず</rt></ruby>を<ruby>見<rt className="text-[10px] sm:text-xs font-bold text-slate-400">み</rt></ruby>て「It is next to the library!」とヒントを<ruby>答<rt className="text-[10px] sm:text-xs font-bold text-slate-400">こた</rt></ruby>えよう。<ruby>正解<rt className="text-[10px] sm:text-xs font-bold text-slate-400">せいかい</rt></ruby>のマスをタップすると、<ruby>煙突<rt className="text-[10px] sm:text-xs font-bold text-slate-400">えんとつ</rt></ruby>から<ruby>煙<rt className="text-[10px] sm:text-xs font-bold text-slate-400">けむり</rt></ruby>が<ruby>出<rt className="text-[10px] sm:text-xs font-bold text-slate-400">で</rt></ruby>て<ruby>建物<rt className="text-[10px] sm:text-xs font-bold text-slate-400">たてもの</rt></ruby>が<ruby>現<rt className="text-[10px] sm:text-xs font-bold text-slate-400">あらわ</rt></ruby>れるよ！
      </>
    ),
    instructionEn: 'Architect A asks "Where is the bakery?". Architect B checks their blueprint and explains "It is next to the library!". When placed correctly, smoke puffs from the chimney and the building springs to life!',
    tipJa: (
      <>
        💡 <strong><ruby>使<rt className="text-[9px]">つか</rt></ruby>うことば：</strong>「next to（となり）」「between（あいだ）」「across from（むかいがわ）」「by the ~（そば）」
      </>
    ),
    tipEn: '💡 Target Vocabulary: "next to", "between", "across from", "by the river", "in front of".'
  },

  // Slide 3: Mode 2 - Town Navigator
  {
    step: 3,
    theme: {
      border: 'border-amber-400 dark:border-amber-500',
      pillBg: 'bg-amber-500 text-slate-950',
      graphicBg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60',
      accentText: 'text-amber-600 dark:text-amber-400'
    },
    graphicIcons: (
      <>
        <span className="text-3xl sm:text-4xl md:text-5xl">🚶</span>
        <span className="text-2xl font-black text-amber-500">⬆️ ➡️ 🛑</span>
        <span className="text-3xl sm:text-4xl md:text-5xl">💎</span>
      </>
    ),
    badgeJa: '🧭 モード2：道案内（ナビゲーター）',
    badgeEn: '🧭 Mode 2: Town Navigator (Turn-by-Turn)',
    titleJa: (
      <>
        「Go straight / Turn left」で<ruby>案内<rt className="text-[10px] sm:text-xs font-bold text-slate-400">あんない</rt></ruby>して、<ruby>宝物<rt className="text-[10px] sm:text-xs font-bold text-slate-400">たからもの</rt></ruby>へ<ruby>導<rt className="text-[10px] sm:text-xs font-bold text-slate-400">みちび</rt></ruby>こう！
      </>
    ),
    titleEn: 'Guide the Traveler with "Go straight / Turn left" to Find Treasure!',
    instructionJa: (
      <>
        <strong>ガイド</strong>には<ruby>宝物<rt className="text-[10px] sm:text-xs font-bold text-slate-400">たからもの</rt></ruby>（または<ruby>目的地<rt className="text-[10px] sm:text-xs font-bold text-slate-400">もくてきち</rt></ruby>）が<ruby>見<rt className="text-[10px] sm:text-xs font-bold text-slate-400">み</rt></ruby>えています。<br />
        <strong>トラベラー</strong>に「Go straight two blocks!」「Turn left at the fountain!」「Stop!」と<ruby>英語<rt className="text-[10px] sm:text-xs font-bold text-slate-400">えいご</rt></ruby>で<ruby>指示<rt className="text-[10px] sm:text-xs font-bold text-slate-400">しじ</rt></ruby>を<ruby>出<rt className="text-[10px] sm:text-xs font-bold text-slate-400">だ</rt></ruby>してゴールまで<ruby>案内<rt className="text-[10px] sm:text-xs font-bold text-slate-400">あんない</rt></ruby>しよう！
      </>
    ),
    instructionEn: 'The Guide sees where the treasure is hidden. The Traveler controls the walker. Guide them step-by-step using "Go straight", "Turn left at the fountain", and "Stop!" to reach the goal!',
    tipJa: (
      <>
        💡 <strong><ruby>交差点<rt className="text-[9px]">こうさてん</rt></ruby>の<ruby>目印<rt className="text-[9px]">めじるし</rt></ruby>：</strong>「Turn right at the bridge（<ruby>橋<rt className="text-[9px]">はし</rt></ruby>で<ruby>右<rt className="text-[9px]">みぎ</rt></ruby>）」のように<ruby>建物<rt className="text-[9px]">たてもの</rt></ruby>を<ruby>言<rt className="text-[9px]">い</rt></ruby>うとスムーズ！
      </>
    ),
    tipEn: '💡 Landmark Clues: Combine landmarks with turns: "Turn right at the bakery", "Cross the stone bridge"!'
  },

  // Slide 4: Mode 3 - Creative Co-Op Builder & Showcase
  {
    step: 4,
    theme: {
      border: 'border-cyan-400 dark:border-cyan-500',
      pillBg: 'bg-cyan-500 text-slate-950',
      graphicBg: 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-800/60',
      accentText: 'text-cyan-600 dark:text-cyan-400'
    },
    graphicIcons: (
      <>
        <span className="text-3xl sm:text-4xl md:text-5xl">🎨</span>
        <span className="text-3xl sm:text-4xl md:text-5xl">♨️</span>
        <span className="text-3xl sm:text-4xl md:text-5xl">🏰</span>
        <span className="text-3xl sm:text-4xl md:text-5xl">📸</span>
        <span className="text-3xl sm:text-4xl md:text-5xl">📺</span>
      </>
    ),
    badgeJa: '🎨 モード3：自由制作＆発表（プレゼンテーション）',
    badgeEn: '🎨 Mode 3: Co-Op Town Builder & Presentation',
    titleJa: (
      <>
        256<ruby>種類<rt className="text-[10px] sm:text-xs font-bold text-slate-400">しゅるい</rt></ruby>のパーツで<ruby>自由<rt className="text-[10px] sm:text-xs font-bold text-slate-400">じゆう</rt></ruby>に<ruby>街<rt className="text-[10px] sm:text-xs font-bold text-slate-400">まち</rt></ruby>をつくり、みんなに<ruby>発表<rt className="text-[10px] sm:text-xs font-bold text-slate-400">はっぴょう</rt></ruby>しよう！
      </>
    ),
    titleEn: 'Create Your Kingdom with 256 Tiles and Present to the Class!',
    instructionJa: (
      <>
        <ruby>温泉<rt className="text-[10px] sm:text-xs font-bold text-slate-400">おんせん</rt></ruby>、お<ruby>寺<rt className="text-[10px] sm:text-xs font-bold text-slate-400">てら</rt></ruby>、イルカ、<ruby>火山<rt className="text-[10px] sm:text-xs font-bold text-slate-400">かざん</rt></ruby>など、<ruby>好<rt className="text-[10px] sm:text-xs font-bold text-slate-400">す</rt></ruby>きなタイルを<ruby>配置<rt className="text-[10px] sm:text-xs font-bold text-slate-400">はいち</rt></ruby>して<ruby>世界<rt className="text-[10px] sm:text-xs font-bold text-slate-400">せかい</rt></ruby>に1つだけの<ruby>街<rt className="text-[10px] sm:text-xs font-bold text-slate-400">まち</rt></ruby>をつくろう。<br />
        <ruby>完成<rt className="text-[10px] sm:text-xs font-bold text-slate-400">かんせい</rt></ruby>したら「📸 スナップショット」で<ruby>画像<rt className="text-[10px] sm:text-xs font-bold text-slate-400">がぞう</rt></ruby>を<ruby>保存<rt className="text-[10px] sm:text-xs font-bold text-slate-400">ほぞん</rt></ruby>！「Welcome to our town! We have ~」と<ruby>英語<rt className="text-[10px] sm:text-xs font-bold text-slate-400">えいご</rt></ruby>で<ruby>発表<rt className="text-[10px] sm:text-xs font-bold text-slate-400">はっぴょう</rt></ruby>しよう！
      </>
    ),
    instructionEn: 'Build whatever you imagine with 256 animated tiles: castles, hot springs, dolphins, and volcanoes! Save high-res PNG snapshots and present your town using "Welcome to our town! We have a bakery and a hot spring!".',
    tipJa: (
      <>
        💡 <strong><ruby>発表<rt className="text-[9px]">はっぴょう</rt></ruby>のフレーズ：</strong>「You can see dolphins in the sea!」「You can eat delicious bread!」
      </>
    ),
    tipEn: '💡 Presentation Phrases: "You can see dolphins!", "You can eat delicious apples!", "We have a big castle!".'
  },

  // Slide 5: Controls & Speech Dock
  {
    step: 5,
    theme: {
      border: 'border-indigo-400 dark:border-indigo-500',
      pillBg: 'bg-indigo-600 text-white',
      graphicBg: 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/60',
      accentText: 'text-indigo-600 dark:text-indigo-400'
    },
    graphicIcons: (
      <>
        <span className="text-3xl sm:text-4xl md:text-5xl">👆</span>
        <span className="text-3xl sm:text-4xl md:text-5xl">🔍</span>
        <span className="text-3xl sm:text-4xl md:text-5xl">🔊</span>
        <span className="text-3xl sm:text-4xl md:text-5xl">⭐</span>
      </>
    ),
    badgeJa: '🎮 かんたん操作と音声サポート',
    badgeEn: '🎮 Touch Controls & Audio Assist',
    titleJa: (
      <>
        タップで<ruby>配置<rt className="text-[10px] sm:text-xs font-bold text-slate-400">はいち</rt></ruby>、スワイプで<ruby>移動<rt className="text-[10px] sm:text-xs font-bold text-slate-400">いどう</rt></ruby>！<ruby>困<rt className="text-[10px] sm:text-xs font-bold text-slate-400">こま</rt></ruby>ったら「🔊」を<ruby>押<rt className="text-[10px] sm:text-xs font-bold text-slate-400">お</rt></ruby>そう！
      </>
    ),
    titleEn: 'Tap to Place, Drag to Pan! Tap [🔊] for Voice Assistance!',
    instructionJa: (
      <>
        <strong>・タップ：</strong>マスを<ruby>選<rt className="text-[10px] sm:text-xs font-bold text-slate-400">えら</rt></ruby>んで<ruby>建物<rt className="text-[10px] sm:text-xs font-bold text-slate-400">たてもの</rt></ruby>を<ruby>配置<rt className="text-[10px] sm:text-xs font-bold text-slate-400">はいち</rt></ruby><br />
        <strong>・ドラッグ：</strong><ruby>画面<rt className="text-[10px] sm:text-xs font-bold text-slate-400">がめん</rt></ruby>を<ruby>自由<rt className="text-[10px] sm:text-xs font-bold text-slate-400">じゆう</rt></ruby>にスクロール<br />
        <strong>・ピンチ／ホイール：</strong>ズームイン・ズームアウト<br />
        <strong>・上部アシストバー：</strong>「🔊」をタップするとネイティブの<ruby>英語音声<rt className="text-[10px] sm:text-xs font-bold text-slate-400">えいごおんせい</rt></ruby>が<ruby>流<rt className="text-[10px] sm:text-xs font-bold text-slate-400">なが</rt></ruby>れるので、<ruby>言<rt className="text-[10px] sm:text-xs font-bold text-slate-400">い</rt></ruby>い<ruby>方<rt className="text-[10px] sm:text-xs font-bold text-slate-400">かた</rt></ruby>を<ruby>確認<rt className="text-[10px] sm:text-xs font-bold text-slate-400">かくにん</rt></ruby>できます！
      </>
    ),
    instructionEn: 'Tap any grid cell to place buildings, drag to pan the map, and pinch/scroll to zoom. Tap the [🔊] button on the speech dock to hear clear native audio pronunciation at any time!',
    tipJa: (
      <>
        💡 <strong><ruby>準備<rt className="text-[9px]">じゅんび</rt></ruby>はOK？</strong>右下の「スタート！」を<ruby>押<rt className="text-[9px]">お</rt></ruby>して、さっそくドリームタウンの<ruby>建築<rt className="text-[9px]">けんちく</rt></ruby>をはじめよう！
      </>
    ),
    tipEn: '💡 Ready to play? Tap "START GAME" below to begin building your town!'
  }
];

export const DreamTownInstructionsModal: React.FC<DreamTownInstructionsModalProps> = ({ isOpen, onClose }) => {
  const { toggleTheme, theme } = useClassroom();
  const { isMuted } = useAudio();
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [localLang, setLocalLang] = useState<'ja' | 'en'>('ja');

  const currentSlide = TUTORIAL_SLIDES[currentSlideIndex];
  const isFirstSlide = currentSlideIndex === 0;
  const isLastSlide = currentSlideIndex === TUTORIAL_SLIDES.length - 1;

  const handleNext = useCallback(() => {
    if (isLastSlide) {
      if (!isMuted) soundEffects.playCardFlip();
      onClose();
    } else {
      if (!isMuted) soundEffects.playCardFlip();
      setCurrentSlideIndex(prev => Math.min(prev + 1, TUTORIAL_SLIDES.length - 1));
    }
  }, [isLastSlide, isMuted, onClose]);

  const handlePrev = useCallback(() => {
    if (!isFirstSlide) {
      if (!isMuted) soundEffects.playCardFlip();
      setCurrentSlideIndex(prev => Math.max(prev - 1, 0));
    }
  }, [isFirstSlide, isMuted]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        handlePrev();
      } else if (e.key >= '1' && e.key <= '5') {
        const stepNum = parseInt(e.key, 10);
        if (stepNum >= 1 && stepNum <= TUTORIAL_SLIDES.length) {
          setCurrentSlideIndex(stepNum - 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleNext, handlePrev, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-[98vw] max-w-[1800px] h-[95vh] max-h-[980px] bg-white dark:bg-slate-900 border-4 sm:border-6 border-emerald-400 dark:border-emerald-500 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-2.5 sm:py-3 border-b-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 min-h-[50px] shrink-0">
          <div className="flex items-center gap-2 min-w-0 flex-1 truncate">
            <span className="text-xl sm:text-2xl">🏘️</span>
            <span className="font-black text-sm sm:text-base text-slate-800 dark:text-slate-100 truncate">
              {localLang === 'ja' ? 'ドリームタウンのあそび方' : 'Dream Town Tutorial'}
            </span>
            <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300">
              MEXT PAIR-WORK
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 flex-nowrap">
            {/* Language toggle */}
            <button
              type="button"
              onClick={() => setLocalLang(prev => (prev === 'ja' ? 'en' : 'ja'))}
              className="px-2.5 py-1 rounded-xl text-xs font-black bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-300 transition-colors"
            >
              {localLang === 'ja' ? 'EN' : '日'}
            </button>

            {/* Theme toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300 transition-colors"
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            {/* Fullscreen */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="hidden sm:flex p-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300 transition-colors"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 hover:bg-rose-200 transition-colors"
              title="Close"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 p-3 sm:p-5 md:p-6 overflow-hidden flex flex-col">
          <div className={`w-full h-full rounded-2xl sm:rounded-3xl border-4 ${currentSlide.theme.border} bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-xl flex flex-col items-center justify-between text-center overflow-y-auto`}>
            {/* Top Illustration Box */}
            <div className={`w-auto min-w-[220px] max-w-fit px-8 sm:px-12 py-2 sm:py-3 rounded-2xl sm:rounded-3xl border-3 ${currentSlide.theme.border} ${currentSlide.theme.graphicBg} shadow-inner flex flex-col items-center gap-1.5 shrink-0`}>
              <div className="flex items-center gap-3">{currentSlide.graphicIcons}</div>
              <span className={`px-3 py-0.5 rounded-full text-xs sm:text-sm font-black ${currentSlide.theme.pillBg}`}>
                {localLang === 'ja' ? currentSlide.badgeJa : currentSlide.badgeEn}
              </span>
            </div>

            {/* Center Typography */}
            <div className="my-auto py-3 max-w-4xl flex flex-col gap-2.5">
              <h2 className="text-xl sm:text-3xl md:text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-tight text-balance">
                {localLang === 'ja' ? currentSlide.titleJa : currentSlide.titleEn}
              </h2>
              <p className="text-sm sm:text-lg md:text-xl text-slate-700 dark:text-slate-300 leading-relaxed font-bold text-balance">
                {localLang === 'ja' ? currentSlide.instructionJa : currentSlide.instructionEn}
              </p>
            </div>

            {/* Bottom Tip Pill */}
            <div className="w-full max-w-3xl px-4 py-2 sm:py-2.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700/60 text-xs sm:text-sm md:text-base text-amber-900 dark:text-amber-200 font-bold shrink-0">
              {localLang === 'ja' ? currentSlide.tipJa : currentSlide.tipEn}
            </div>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-2.5 sm:py-3 border-t-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 shrink-0">
          <button
            type="button"
            onClick={handlePrev}
            disabled={isFirstSlide}
            className={`flex items-center gap-1 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-black ${
              isFirstSlide
                ? 'opacity-30 cursor-not-allowed bg-slate-200 dark:bg-slate-800 text-slate-500'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-300 active:scale-95'
            } transition-all`}
          >
            <ChevronLeft size={16} />
            <span className="hidden sm:inline">もどる</span>
          </button>

          {/* Numeric step pills */}
          <div className="flex items-center gap-1.5">
            {TUTORIAL_SLIDES.map((slide, idx) => (
              <button
                key={slide.step}
                type="button"
                onClick={() => {
                  if (!isMuted) soundEffects.playCardFlip();
                  setCurrentSlideIndex(idx);
                }}
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full text-xs font-black transition-all ${
                  idx === currentSlideIndex
                    ? `${slide.theme.pillBg} scale-110 shadow-md ring-2 ring-emerald-400`
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-300'
                }`}
              >
                {slide.step}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleNext}
            className="flex items-center gap-1.5 px-4 sm:px-6 py-2 rounded-xl text-xs sm:text-sm font-black bg-emerald-500 text-slate-950 hover:bg-emerald-400 active:scale-95 shadow-md transition-all"
          >
            <span>{isLastSlide ? (localLang === 'ja' ? 'スタート！' : 'START') : localLang === 'ja' ? 'つぎへ' : 'NEXT'}</span>
            {isLastSlide ? <Play size={15} fill="currentColor" /> : <ChevronRight size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
};
