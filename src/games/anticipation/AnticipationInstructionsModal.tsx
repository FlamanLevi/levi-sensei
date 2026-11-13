import React, { useState, useEffect, useCallback } from 'react';
import { X, Play, Sun, Moon, ChevronLeft, ChevronRight, Maximize2, Minimize2 } from 'lucide-react';
import { useClassroom } from '@/context/ClassroomContext';
import { useLanguage } from '@/context/LanguageContext';
import { soundEffects } from '@/services/soundEffects';

interface AnticipationInstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SlideItem {
  step: number;
  border: string;
  pillBg: string;
  graphicBg: string;
  icons: React.ReactNode;
  badgeEn: string;
  badgeJa: React.ReactNode;
  titleEn: string;
  titleJa: React.ReactNode;
  descEn: string;
  descJa: React.ReactNode;
  tipEn: string;
  tipJa: React.ReactNode;
}

const SLIDES: SlideItem[] = [
  {
    step: 1,
    border: 'border-amber-400 dark:border-amber-500',
    pillBg: 'bg-amber-500 text-slate-950',
    graphicBg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60',
    icons: (
      <>
        <span>✒️</span>
        <span className="text-amber-500 font-black text-xl sm:text-2xl">➔</span>
        <span>🍎</span>
        <span>❓</span>
      </>
    ),
    badgeEn: 'Step 1 · Watch the Retro Sketch',
    badgeJa: <>ステップ 1 · スケッチを<ruby>見<rt>み</rt></ruby>よう</>,
    titleEn: 'Watch the Pencil Draw Every Clue to 100%!',
    titleJa: (
      <>
        えんぴつが<ruby>描<rt>えが</rt></ruby>くシルエットを<ruby>見<rt>み</rt></ruby>て、<ruby>早<rt>はや</rt></ruby>く<ruby>予想<rt>よそう</rt></ruby>しよう！
      </>
    ),
    descEn:
      'Clean bold lines and gleaming pearl Connect-the-Dots trace each word cleanly—never cutting off before finishing! Use the category title and progressive letter mask to guess as early as possible.',
    descJa: (
      <>
        くっきりした<ruby>線<rt>せん</rt></ruby>や<ruby>光<rt>ひか</rt></ruby>る<ruby>点<rt>てん</rt></ruby>つなぎで<ruby>絵<rt>え</rt></ruby>が<ruby>最後<rt>さいご</rt></ruby>まで<ruby>完成<rt>かんせい</rt></ruby>します！カテゴリーと文字ヒントを見て、できるだけ<ruby>早<rt>はや</rt></ruby>く<ruby>英語<rt>えいご</rt></ruby>を<ruby>当<rt>あ</rt></ruby>てよう！
      </>
    ),
    tipEn: '💡 Faster guesses earn up to 1,100 bonus points & more board steps!',
    tipJa: (
      <>
        💡 <ruby>早<rt>はや</rt></ruby>く<ruby>正解<rt>せいかい</rt></ruby>するほど高スコア＆たくさん<ruby>進<rt>すす</rt></ruby>めるよ！
      </>
    ),
  },
  {
    step: 2,
    border: 'border-indigo-400 dark:border-indigo-500',
    pillBg: 'bg-indigo-600 text-white',
    graphicBg: 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/60',
    icons: (
      <>
        <span>▲</span>
        <span>◆</span>
        <span>●</span>
        <span>■</span>
        <span className="text-slate-400">|</span>
        <span>🔤</span>
      </>
    ),
    badgeEn: 'Step 2 · Answer on Your iPad',
    badgeJa: <>ステップ 2 · iPadで<ruby>解答<rt>かいとう</rt></ruby></>,
    titleEn: 'Tap 4-Choice Cards or Build the English Spelling!',
    titleJa: (
      <>
        4<ruby>択<rt>たく</rt></ruby>カードまたは文字タイルで<ruby>英語<rt>えいご</rt></ruby>を<ruby>答<rt>こた</rt></ruby>えよう！
      </>
    ),
    descEn:
      'Grades 1–4 pick from 4 word cards (▲◆●■) while Grades 5–6 can assemble letter tiles or switch to 4-choice anytime! Be careful—wrong guesses lock your pad for 2.5 seconds.',
    descJa: (
      <>
        <ruby>中学年<rt>ちゅうがくねん</rt></ruby>は▲◆●■の4<ruby>択<rt>たく</rt></ruby>、<ruby>高学年<rt>こうがくねん</rt></ruby>はアルファベットタイル並べにも<ruby>挑戦<rt>ちょうせん</rt></ruby>！<ruby>間違<rt>まちが</rt></ruby>えると2.5<ruby>秒<rt>びょう</rt></ruby>ストップするのでよく<ruby>見<rt>み</rt></ruby>てね。
      </>
    ),
    tipEn: '💡 Think before tapping—no random guessing!',
    tipJa: (
      <>
        💡 おてつき2.5<ruby>秒<rt>びょう</rt></ruby>ロックに<ruby>気<rt>き</rt></ruby>をつけて、<ruby>確実<rt>かくじつ</rt></ruby>に<ruby>狙<rt>ねら</rt></ruby>おう！
      </>
    ),
  },
  {
    step: 3,
    border: 'border-emerald-400 dark:border-emerald-500',
    pillBg: 'bg-emerald-600 text-white',
    graphicBg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60',
    icons: (
      <>
        <span>👟</span>
        <span>🎺</span>
        <span>🧸</span>
        <span>🍦</span>
        <span>👑</span>
      </>
    ),
    badgeEn: 'Step 3 · 4-Level Spiral Board',
    badgeJa: <>ステップ 3 · 4<ruby>層<rt>そう</rt></ruby>スパイラル</>,
    titleEn: 'Race to the Center & Collect Puzzle Pieces!',
    titleJa: (
      <>
        4<ruby>層<rt>そう</rt></ruby>ボードを<ruby>進<rt>すす</rt></ruby>んで<ruby>中央<rt>ちゅうおう</rt></ruby>ゴールを<ruby>目指<rt>めざ</rt></ruby>せ！
      </>
    ),
    descEn:
      'In Spiral Board mode, fast answers advance tokens 1 to 3 spaces inward! Hit Star ★ spaces for Connect-the-Dots bonuses, Warp 🚀 arrows to jump rings, and collect 4 puzzle pieces.',
    descJa: (
      <>
        スパイラルモードでは<ruby>正解<rt>せいかい</rt></ruby>スピードで1〜3マス<ruby>前進<rt>ぜんしん</rt></ruby>！★マスで<ruby>点<rt>てん</rt></ruby>つなぎボーナス、🚀ワープで<ruby>内側<rt>うちがわ</rt></ruby>リングへジャンプ、4つのパズルも<ruby>集<rt>あつ</rt></ruby>めよう！
      </>
    ),
    tipEn: '💡 Prefer fast warm-ups? Switch to Quick Rounds mode anytime!',
    tipJa: (
      <>
        💡 <ruby>短時間<rt>たんじかん</rt></ruby>のウォームアップには「クイック・スケッチ」モードがおすすめ！
      </>
    ),
  },
  {
    step: 4,
    border: 'border-sky-400 dark:border-sky-500',
    pillBg: 'bg-sky-600 text-white',
    graphicBg: 'bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800/60',
    icons: (
      <>
        <span>🔊</span>
        <span>🗣️</span>
        <span>✨</span>
      </>
    ),
    badgeEn: 'Step 4 · Listen & Say Together',
    badgeJa: <>ステップ 4 · <ruby>発音<rt>はつおん</rt></ruby>＆<ruby>確認<rt>かくにん</rt></ruby></>,
    titleEn: 'Say the Word Aloud on Every Color Card Reveal!',
    titleJa: (
      <>
        カラー<ruby>絵<rt>え</rt></ruby>カードが<ruby>開<rt>ひら</rt></ruby>いたら、ネイティブ<ruby>音声<rt>おんせい</rt></ruby>に<ruby>続<rt>つづ</rt></ruby>いて<ruby>発音<rt>はつおん</rt></ruby>！
      </>
    ),
    descEn:
      'After students lock in guesses, the official textbook color artwork and native English audio play on screen. Repeat clearly together before the next sketch begins!',
    descJa: (
      <>
        タイムアップまたは<ruby>全員<rt>ぜんいん</rt></ruby><ruby>解答<rt>かいとう</rt></ruby>で、おなじみの<ruby>教科書<rt>きょうかしょ</rt></ruby>イラストと<ruby>英語音声<rt>えいごおんせい</rt></ruby>が登場！みんなで<ruby>元気<rt>げんき</rt></ruby>よくリピートしよう！
      </>
    ),
    tipEn: '💡 Every round saves Trouble Words & XP/Gold to student passports.',
    tipJa: (
      <>
        💡 プレイすると<ruby>苦手単語<rt>にがてたんご</rt></ruby>チェックやXP・ゴールドもどんどんたまるよ！
      </>
    ),
  },
];

export const AnticipationInstructionsModal: React.FC<AnticipationInstructionsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { theme, toggleTheme } = useClassroom();
  const { language } = useLanguage();
  const [textLang, setTextLang] = useState<'en' | 'ja'>(language);
  const [slideIdx, setSlideIdx] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    setTextLang(language);
  }, [language]);

  useEffect(() => {
    if (isOpen) setSlideIdx(0);
  }, [isOpen]);

  const isJa = textLang === 'ja';
  const slide = SLIDES[slideIdx] || SLIDES[0];

  const handleNext = useCallback(() => {
    soundEffects.playTick();
    setSlideIdx((prev) => Math.min(SLIDES.length - 1, prev + 1));
  }, []);

  const handlePrev = useCallback(() => {
    soundEffects.playTick();
    setSlideIdx((prev) => Math.max(0, prev - 1));
  }, []);

  const toggleFullscreen = () => {
    const doc = document as Document & { webkitFullscreenElement?: Element; webkitExitFullscreen?: () => Promise<void> };
    if (!doc.fullscreenElement && !doc.webkitFullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'Enter' && slideIdx === SLIDES.length - 1) {
        onClose();
      } else if (/^[1-4]$/.test(e.key)) {
        setSlideIdx(parseInt(e.key, 10) - 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, slideIdx, onClose, handleNext, handlePrev]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl h-[92dvh] max-h-[680px] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border-3 border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Modal Header */}
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0 flex-nowrap">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="text-xl shrink-0">✏️</span>
            <h2 className="text-sm sm:text-lg font-black text-slate-900 dark:text-white truncate">
              {isJa ? (
                <>アンティシペーション（お<ruby>絵<rt>え</rt></ruby>かき<ruby>推測<rt>すいそく</rt></ruby>）のあそびかた</>
              ) : (
                'How to Play Anticipation Sketch & Board'
              )}
            </h2>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 flex-nowrap">
            <button
              type="button"
              onClick={() => setTextLang((l) => (l === 'ja' ? 'en' : 'ja'))}
              className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-black text-xs text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              {isJa ? 'EN' : '日'}
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
              title="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
              title="Fullscreen"
            >
              {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900 cursor-pointer"
              title="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Center Slide Stage (Landscape Two-Zone Friendly Card) */}
        <div className="flex-1 min-h-0 p-3 sm:p-5 flex items-center justify-center">
          <div
            className={`w-full h-full rounded-3xl border-3 ${slide.border} bg-white dark:bg-slate-900 p-4 sm:p-6 flex flex-col justify-between gap-3`}
          >
            <div className="flex items-center justify-between gap-3 flex-wrap shrink-0">
              <div className={`flex items-center gap-3 px-4 py-2 rounded-2xl border ${slide.graphicBg} text-2xl sm:text-3xl`}>
                {slide.icons}
              </div>
              <span className={`px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-black shadow-xs ${slide.pillBg}`}>
                {isJa ? slide.badgeJa : slide.badgeEn}
              </span>
            </div>

            <div className="flex-1 min-h-0 flex flex-col items-center justify-center text-center px-2 sm:px-6 gap-3">
              <h3 className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight text-balance">
                {isJa ? slide.titleJa : slide.titleEn}
              </h3>
              <p className="text-sm sm:text-lg font-bold text-slate-700 dark:text-slate-200 leading-relaxed max-w-3xl text-balance">
                {isJa ? slide.descJa : slide.descEn}
              </p>
            </div>

            <div className="w-full max-w-2xl mx-auto px-4 py-2.5 rounded-2xl bg-amber-100/90 dark:bg-amber-950/50 border-2 border-amber-300 dark:border-amber-700/70 text-center text-xs sm:text-base font-black text-amber-950 dark:text-amber-100 shrink-0">
              {isJa ? slide.tipJa : slide.tipEn}
            </div>
          </div>
        </div>

        {/* Footer Controls */}
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-center gap-3 shrink-0 flex-nowrap">
          <button
            type="button"
            onClick={handlePrev}
            disabled={slideIdx <= 0}
            className="px-4 py-2 rounded-2xl bg-slate-200 dark:bg-slate-800 disabled:opacity-30 font-black text-xs sm:text-sm text-slate-800 dark:text-slate-200 flex items-center gap-1 cursor-pointer"
          >
            <ChevronLeft size={16} />
            <span>{isJa ? 'まえへ' : 'Back'}</span>
          </button>

          <div className="flex items-center gap-1.5">
            {SLIDES.map((s, idx) => (
              <button
                key={s.step}
                type="button"
                onClick={() => {
                  soundEffects.playTick();
                  setSlideIdx(idx);
                }}
                className={`w-9 h-9 rounded-full font-black text-xs sm:text-sm flex items-center justify-center cursor-pointer transition-all ${
                  idx === slideIdx
                    ? `${s.pillBg} scale-110 shadow-md ring-2 ring-amber-400`
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {s.step}
              </button>
            ))}
          </div>

          {slideIdx < SLIDES.length - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-5 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs sm:text-sm flex items-center gap-1 cursor-pointer shadow-md"
            >
              <span>{isJa ? 'つぎへ' : 'Next'}</span>
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                soundEffects.playCorrect();
                onClose();
              }}
              className="px-6 py-2 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <Play size={14} className="fill-slate-950" />
              <span>{isJa ? 'あそぶ！' : "Let's Play!"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
