import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Play,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { useClassroom } from '@/context/ClassroomContext';
import { soundEffects } from '@/services/soundEffects';

interface KeywordInstructionsModalProps {
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
  // STEP 1: Hands on posture & memorize secret keyword
  {
    step: 1,
    theme: {
      border: 'border-sky-400 dark:border-sky-500',
      pillBg: 'bg-sky-500 text-white',
      graphicBg:
        'bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800/60',
      accentText: 'text-sky-600 dark:text-sky-400',
    },
    graphicIcons: (
      <>
        <span>🙆</span>
        <span>🤷</span>
        <span>🦵</span>
        <span>🎯</span>
      </>
    ),
    badgeJa: '🙌 ポーズでスタンバイ',
    badgeEn: '🙌 Ready Posture',
    titleJa: (
      <>
        <ruby>
          画面<rt className="text-[10px] sm:text-xs font-bold text-slate-400">がめん</rt>
        </ruby>
        のポーズをして、「
        <ruby>
          合言葉<rt className="text-[10px] sm:text-xs font-bold text-slate-400">あいことば</rt>
        </ruby>
        」を
        <ruby>
          覚<rt className="text-[10px] sm:text-xs font-bold text-slate-400">おぼ</rt>
        </ruby>
        えよう！
      </>
    ),
    titleEn: 'Take the Body Pose & Memorize the Secret Keyword!',
    instructionJa: (
      <>
        2
        <ruby>
          人<rt className="text-[10px] sm:text-xs font-bold text-slate-400">にん</rt>
        </ruby>
        ペアの
        <ruby>
          真<rt className="text-[10px] sm:text-xs font-bold text-slate-400">ま</rt>
        </ruby>
        ん
        <ruby>
          中<rt className="text-[10px] sm:text-xs font-bold text-slate-400">なか</rt>
        </ruby>
        にiPad（または
        <ruby>
          消<rt className="text-[10px] sm:text-xs font-bold text-slate-400">け</rt>
        </ruby>
        しゴム）を
        <ruby>
          置<rt className="text-[10px] sm:text-xs font-bold text-slate-400">お</rt>
        </ruby>
        き、
        <ruby>
          両手<rt className="text-[10px] sm:text-xs font-bold text-slate-400">りょうて</rt>
        </ruby>
        を
        <ruby>
          頭<rt className="text-[10px] sm:text-xs font-bold text-slate-400">あたま</rt>
        </ruby>
        ・
        <ruby>
          肩<rt className="text-[10px] sm:text-xs font-bold text-slate-400">かた</rt>
        </ruby>
        ・ひざにのせてスタンバイしよう！
      </>
    ),
    instructionEn:
      'Place the iPad (or eraser) flat between your desks, put both hands on your head/shoulders/knees, and memorize the target keyword!',
    tipJa: <>💡 合言葉が出るまで、手はしっかりポーズの位置をキープ！</>,
    tipEn: '💡 Keep both hands locked on your body pose until the keyword hits!',
  },

  // STEP 2: Listen closely & chant every English card aloud
  {
    step: 2,
    theme: {
      border: 'border-emerald-400 dark:border-emerald-500',
      pillBg: 'bg-emerald-500 text-white',
      graphicBg:
        'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60',
      accentText: 'text-emerald-600 dark:text-emerald-400',
    },
    graphicIcons: (
      <>
        <span>👂</span>
        <span>🗣️</span>
        <span>🎵</span>
        <span>👏</span>
      </>
    ),
    badgeJa: '📢 聞いてリピート！',
    badgeEn: '📢 Listen & Repeat!',
    titleJa: (
      <>
        カードの
        <ruby>
          英語<rt className="text-[10px] sm:text-xs font-bold text-slate-400">えいご</rt>
        </ruby>
        をよく
        <ruby>
          聞<rt className="text-[10px] sm:text-xs font-bold text-slate-400">き</rt>
        </ruby>
        いて、みんなで
        <ruby>
          元気<rt className="text-[10px] sm:text-xs font-bold text-slate-400">げんき</rt>
        </ruby>
        にリピート！
      </>
    ),
    titleEn: 'Listen to the English Cards & Chant Aloud Together!',
    instructionJa: (
      <>
        テレビに
        <ruby>
          次々<rt className="text-[10px] sm:text-xs font-bold text-slate-400">つぎつぎ</rt>
        </ruby>
        と
        <ruby>
          出<rt className="text-[10px] sm:text-xs font-bold text-slate-400">で</rt>
        </ruby>
        るカードの
        <ruby>
          英語<rt className="text-[10px] sm:text-xs font-bold text-slate-400">えいご</rt>
        </ruby>
        を
        <ruby>
          聞<rt className="text-[10px] sm:text-xs font-bold text-slate-400">き</rt>
        </ruby>
        いて、クラス
        <ruby>
          全員<rt className="text-[10px] sm:text-xs font-bold text-slate-400">ぜんいん</rt>
        </ruby>
        で
        <ruby>
          声<rt className="text-[10px] sm:text-xs font-bold text-slate-400">こえ</rt>
        </ruby>
        に
        <ruby>
          出<rt className="text-[10px] sm:text-xs font-bold text-slate-400">だ</rt>
        </ruby>
        して
        <ruby>
          発音<rt className="text-[10px] sm:text-xs font-bold text-slate-400">はつおん</rt>
        </ruby>
        しよう！
      </>
    ),
    instructionEn:
      'As decoy flashcards cycle on the TV, listen carefully and repeat every English word aloud with energy!',
    tipJa: <>💡 声に出してリピートしながら、耳で合言葉を待ちかまえよう！</>,
    tipEn: '💡 Chant in rhythm while keeping your ears sharp for the keyword!',
  },

  // STEP 3: Slap when Keyword triggers (Shockwave & Speed Rankings)
  {
    step: 3,
    theme: {
      border: 'border-rose-400 dark:border-rose-500',
      pillBg: 'bg-rose-500 text-white',
      graphicBg:
        'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60',
      accentText: 'text-rose-600 dark:text-rose-400',
    },
    graphicIcons: (
      <>
        <span>⚡</span>
        <span>🖐️</span>
        <span>🏎️</span>
        <span>🏆</span>
      </>
    ),
    badgeJa: '⚡ 神速タップ＆キャッチ！',
    badgeEn: '⚡ Lightning Slap!',
    titleJa: (
      <>
        「
        <ruby>
          合言葉<rt className="text-[10px] sm:text-xs font-bold text-slate-400">あいことば</rt>
        </ruby>
        」が
        <ruby>
          出<rt className="text-[10px] sm:text-xs font-bold text-slate-400">で</rt>
        </ruby>
        た
        <ruby>
          瞬間<rt className="text-[10px] sm:text-xs font-bold text-slate-400">しゅんかん</rt>
        </ruby>
        にすばやくタップ（キャッチ）！
      </>
    ),
    titleEn: 'Slap Your Zone the Instant the Keyword Triggers!',
    instructionJa: (
      <>
        「
        <ruby>
          合言葉<rt className="text-[10px] sm:text-xs font-bold text-slate-400">あいことば</rt>
        </ruby>
        」が
        <ruby>
          出<rt className="text-[10px] sm:text-xs font-bold text-slate-400">で</rt>
        </ruby>
        たら、
        <ruby>
          自分<rt className="text-[10px] sm:text-xs font-bold text-slate-400">じぶん</rt>
        </ruby>
        のカラーゾーン（🔴
        <ruby>
          赤<rt className="text-[10px] sm:text-xs font-bold text-slate-400">あか</rt>
        </ruby>
        ／🔵
        <ruby>
          青<rt className="text-[10px] sm:text-xs font-bold text-slate-400">あお</rt>
        </ruby>
        ）をすばやくタップ！0.001
        <ruby>
          秒<rt className="text-[10px] sm:text-xs font-bold text-slate-400">びょう</rt>
        </ruby>
        <ruby>
          単位<rt className="text-[10px] sm:text-xs font-bold text-slate-400">たんい</rt>
        </ruby>
        でスピード
        <ruby>
          判定<rt className="text-[10px] sm:text-xs font-bold text-slate-400">はんてい</rt>
        </ruby>
        されるよ！
      </>
    ),
    instructionEn:
      'Slap your side of the iPad (or grab the eraser) the millisecond the keyword appears! Earn ⚡ GODLIKE or 🏎️ LIGHTNING speed badges!',
    tipJa: <>💡 クラス最速トップ3に入ると前のテレビの表彰台にのるよ！</>,
    tipEn: '💡 The Top 3 fastest reflexes in class are crowned on the Front TV Podium!',
  },

  // STEP 4: Watch out for False Starts (Referee Whistle & Yellow Card)
  {
    step: 4,
    theme: {
      border: 'border-amber-500 dark:border-amber-600',
      pillBg: 'bg-amber-600 text-white',
      graphicBg:
        'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800/60',
      accentText: 'text-amber-700 dark:text-amber-300',
    },
    graphicIcons: (
      <>
        <span>🟨</span>
        <span>🚫</span>
        <span className="text-amber-600 font-black text-xl sm:text-2xl md:text-3xl">
          🖐️ ➔ 🙆
        </span>
      </>
    ),
    badgeJa: '🟨 おてつき・反則注意！',
    badgeEn: '🟨 Watch for False Starts!',
    titleJa: (
      <>
        <ruby>
          違<rt className="text-[10px] sm:text-xs font-bold text-slate-400">ちが</rt>
        </ruby>
        う
        <ruby>
          言葉<rt className="text-[10px] sm:text-xs font-bold text-slate-400">ことば</rt>
        </ruby>
        でタップすると「おてつき」！
        <ruby>
          相手<rt className="text-[10px] sm:text-xs font-bold text-slate-400">あいて</rt>
        </ruby>
        にポイント！
      </>
    ),
    titleEn: 'False Starts Trigger the Referee Whistle & Award Opponent!',
    instructionJa: (
      <>
        「
        <ruby>
          合言葉<rt className="text-[10px] sm:text-xs font-bold text-slate-400">あいことば</rt>
        </ruby>
        」ではないカードでさわると、ホイッスルが
        <ruby>
          鳴<rt className="text-[10px] sm:text-xs font-bold text-slate-400">な</rt>
        </ruby>
        ってイエローカード！
        <ruby>
          相手<rt className="text-[10px] sm:text-xs font-bold text-slate-400">あいて</rt>
        </ruby>
        に＋1ポイントが
        <ruby>
          入<rt className="text-[10px] sm:text-xs font-bold text-slate-400">はい</rt>
        </ruby>
        っちゃうよ！
      </>
    ),
    instructionEn:
      'If you slap on a decoy word before the keyword, the referee whistle blows, you get a Yellow Card lockout, and your partner gets +1 point!',
    tipJa: <>💡 なかよく安全第一！最後までよく音を聞き分けて楽しくバトルしよう！</>,
    tipEn: '💡 Listen until the full word is spoken—safe sportsmanship comes first!',
  },
];

export const KeywordInstructionsModal: React.FC<KeywordInstructionsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { theme, toggleTheme } = useClassroom();
  const [lang, setLang] = useState<'ja' | 'en'>('ja');
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const totalSlides = TUTORIAL_SLIDES.length;
  const currentSlide = TUTORIAL_SLIDES[currentSlideIndex];
  const isJa = lang === 'ja';

  // Monitor fullscreen status
  useEffect(() => {
    const handleFsChange = () => {
      const doc = document as Document & { webkitFullscreenElement?: Element };
      setIsFullscreen(!!(doc.fullscreenElement || doc.webkitFullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
    };
  }, []);

  const toggleFullscreen = useCallback(() => {
    const doc = document as Document & {
      webkitFullscreenElement?: Element;
      webkitExitFullscreen?: () => Promise<void>;
    };
    const isFs = !!(doc.fullscreenElement || doc.webkitFullscreenElement);
    if (!isFs) {
      const el = document.documentElement as HTMLElement & {
        webkitRequestFullscreen?: () => Promise<void>;
      };
      if (el.requestFullscreen) {
        el.requestFullscreen().catch(() => {});
      } else if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if (doc.webkitExitFullscreen) {
        doc.webkitExitFullscreen();
      }
    }
  }, []);

  const handlePrev = useCallback(() => {
    setCurrentSlideIndex((prev) => {
      if (prev > 0) {
        soundEffects.playCardFlip();
        return prev - 1;
      }
      return prev;
    });
  }, []);

  const handleNext = useCallback(() => {
    setCurrentSlideIndex((prev) => {
      if (prev < totalSlides - 1) {
        soundEffects.playCardFlip();
        return prev + 1;
      } else {
        soundEffects.playCorrect();
        onClose();
        return prev;
      }
    });
  }, [totalSlides, onClose]);

  const handleJumpToSlide = useCallback(
    (index: number) => {
      if (index >= 0 && index < totalSlides) {
        soundEffects.playCardFlip();
        setCurrentSlideIndex(index);
      }
    },
    [totalSlides]
  );

  // Keyboard navigation: Arrow keys, Space, Enter, Escape, 1-4 numbers
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        handlePrev();
      } else if (
        e.key === 'ArrowRight' ||
        e.key === 'ArrowDown' ||
        e.key === ' ' ||
        e.key === 'Enter'
      ) {
        e.preventDefault();
        handleNext();
      } else if (e.key >= '1' && e.key <= '4') {
        const targetIndex = parseInt(e.key, 10) - 1;
        handleJumpToSlide(targetIndex);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handlePrev, handleNext, handleJumpToSlide]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 select-none animate-in fade-in duration-150 font-['UD_Digi_Kyokasho_NP-R','UD_Digi_Kyokasho_NK-R','BIZ_UDPGothic','Zen_Maru_Gothic',sans-serif]"
      onClick={onClose}
    >
      <div
        className="w-[98vw] max-w-[1800px] h-[95vh] max-h-[980px] flex flex-col bg-white dark:bg-slate-900 border-4 sm:border-6 border-amber-400 dark:border-amber-500 rounded-3xl shadow-2xl overflow-hidden transition-all duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER BAR */}
        <div className="flex items-center justify-between px-3.5 sm:px-6 py-2 sm:py-2.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-slate-950 shrink-0 min-h-[46px] sm:min-h-[50px]">
          <div className="min-w-0 flex-1 flex items-center gap-2">
            <span className="text-base sm:text-xl shrink-0">📖</span>
            <h1 className="text-xs sm:text-base md:text-lg font-black tracking-wide text-slate-950 truncate">
              {isJa ? (
                <>
                  キーワードグラブの
                  <ruby>
                    遊<rt className="text-[8px] sm:text-[9px] font-bold">あそ</rt>
                  </ruby>
                  び
                  <ruby>
                    方<rt className="text-[8px] sm:text-[9px] font-bold">かた</rt>
                  </ruby>
                  ・ルール
                </>
              ) : (
                'Keyword Grab · How to Play & Rules'
              )}
            </h1>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-nowrap">
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-1 sm:p-1.5 rounded-xl bg-slate-950/20 hover:bg-slate-950/30 text-slate-950 transition-all cursor-pointer"
              title={
                isJa
                  ? isFullscreen
                    ? '全画面を解除 (Esc)'
                    : '全画面にする (F11)'
                  : isFullscreen
                  ? 'Exit Fullscreen'
                  : 'Enter Fullscreen'
              }
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>

            <div className="flex bg-slate-950/25 p-0.5 rounded-xl text-xs sm:text-sm font-black">
              <button
                type="button"
                onClick={() => setLang('ja')}
                className={`px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg transition-all cursor-pointer ${
                  isJa
                    ? 'bg-white text-slate-950 shadow-sm'
                    : 'text-slate-900 hover:text-white'
                }`}
              >
                日
              </button>
              <button
                type="button"
                onClick={() => setLang('en')}
                className={`px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg transition-all cursor-pointer ${
                  !isJa
                    ? 'bg-white text-slate-950 shadow-sm'
                    : 'text-slate-900 hover:text-white'
                }`}
              >
                EN
              </button>
            </div>

            <button
              type="button"
              onClick={toggleTheme}
              className="p-1 sm:p-1.5 rounded-xl bg-slate-950/20 hover:bg-slate-950/30 text-slate-950 transition-all cursor-pointer"
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1 sm:p-1.5 rounded-xl bg-slate-950/20 hover:bg-slate-950/40 text-slate-950 transition-all cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* MAIN STAGE */}
        <div className="flex-1 min-h-0 p-3 sm:p-5 md:p-6 flex flex-col justify-center items-center overflow-hidden">
          <div
            className={`w-full h-full rounded-2xl sm:rounded-3xl border-4 ${currentSlide.theme.border} bg-white dark:bg-slate-900 p-3 sm:p-5 md:p-6 shadow-xl flex flex-col items-center justify-between text-center relative transition-all duration-200 overflow-y-auto`}
          >
            <div
              className={`w-auto min-w-[200px] max-w-fit px-8 sm:px-12 py-2 sm:py-3 rounded-2xl sm:rounded-3xl border-3 ${currentSlide.theme.border} ${currentSlide.theme.graphicBg} flex flex-col items-center justify-center shrink-0 shadow-inner mt-0`}
            >
              <div className="flex items-center justify-center gap-4 sm:gap-6 text-3xl sm:text-4xl md:text-5xl leading-none">
                {currentSlide.graphicIcons}
              </div>
              <span className="text-xs sm:text-sm md:text-base font-black tracking-wide bg-white/95 dark:bg-slate-900/95 px-5 sm:px-7 py-1 rounded-full border border-slate-200 dark:border-slate-700 shadow-xs mt-2 leading-none">
                {isJa ? currentSlide.badgeJa : currentSlide.badgeEn}
              </span>
            </div>

            <div className="flex-1 min-h-0 w-full max-w-5xl xl:max-w-6xl flex flex-col items-center justify-center my-auto px-4 py-2 sm:py-3 gap-2.5 sm:gap-4 overflow-hidden">
              <h2
                className={`font-black text-slate-900 dark:text-white tracking-tight text-center text-balance ${
                  isJa
                    ? 'text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-[52px] leading-snug'
                    : 'text-xl sm:text-2xl md:text-3xl lg:text-[38px] xl:text-[42px] leading-tight max-w-4xl'
                }`}
              >
                {isJa ? currentSlide.titleJa : currentSlide.titleEn}
              </h2>

              <p
                className={`font-bold text-slate-700 dark:text-slate-200 leading-relaxed text-center text-balance ${
                  isJa
                    ? 'text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-[32px] max-w-4xl xl:max-w-5xl'
                    : 'text-sm sm:text-base md:text-lg lg:text-xl xl:text-[23px] max-w-3xl xl:max-w-4xl'
                }`}
              >
                {isJa ? currentSlide.instructionJa : currentSlide.instructionEn}
              </p>
            </div>

            <div className="w-full max-w-3xl xl:max-w-4xl shrink-0 mt-auto pb-1">
              <div
                className={`bg-amber-100/90 dark:bg-amber-950/60 border-2 border-amber-300 dark:border-amber-700/70 rounded-2xl px-6 sm:px-10 py-2 sm:py-2.5 font-black text-amber-950 dark:text-amber-100 shadow-xs text-center leading-snug text-balance ${
                  isJa
                    ? 'text-sm sm:text-base md:text-lg lg:text-xl'
                    : 'text-xs sm:text-sm md:text-base lg:text-lg'
                }`}
              >
                {isJa ? currentSlide.tipJa : currentSlide.tipEn}
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER CONTROLS */}
        <div className="px-3 sm:px-6 py-2.5 sm:py-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-center shrink-0 gap-2.5 sm:gap-4 flex-wrap">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentSlideIndex <= 0}
            className="px-3.5 sm:px-5 py-1.5 sm:py-2.5 rounded-2xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 disabled:opacity-25 disabled:cursor-not-allowed text-slate-800 dark:text-slate-200 font-bold text-xs sm:text-sm md:text-base flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
          >
            <ChevronLeft size={18} />
            <span>{isJa ? 'まえへ' : 'Back'}</span>
          </button>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {TUTORIAL_SLIDES.map((slide, idx) => {
              const isActive = idx === currentSlideIndex;
              return (
                <button
                  key={slide.step}
                  type="button"
                  onClick={() => handleJumpToSlide(idx)}
                  className={`w-8 h-8 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-full font-black text-xs sm:text-sm md:text-base flex items-center justify-center transition-all cursor-pointer ${
                    isActive
                      ? `${slide.theme.pillBg} shadow-md scale-110 ring-2 ring-amber-400`
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700'
                  }`}
                >
                  {slide.step}
                </button>
              );
            })}
          </div>

          {currentSlideIndex < totalSlides - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-4 sm:px-6 py-1.5 sm:py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-black text-xs sm:text-sm md:text-base shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>{isJa ? 'つぎへ' : 'Next'}</span>
              <ChevronRight size={18} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                soundEffects.playCorrect();
                onClose();
              }}
              className="px-5 sm:px-8 py-1.5 sm:py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-xs sm:text-sm md:text-base shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-2 animate-pulse"
            >
              <Play size={16} className="fill-slate-950" />
              <span>{isJa ? 'ゲームをはじめる！' : "Let's Play!"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};