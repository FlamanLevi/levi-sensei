import React, { useState, useEffect, useCallback } from 'react';
import { X, Play, Sun, Moon, ChevronLeft, ChevronRight, Maximize2, Minimize2 } from 'lucide-react';
import { useClassroom } from '@/context/ClassroomContext';
import { soundEffects } from '@/services/soundEffects';

interface TimebombInstructionsModalProps {
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
  // 1. Stand Up & Ready: Everyone stands up, player 1 holds ball
  {
    step: 1,
    theme: {
      border: 'border-amber-400 dark:border-amber-500',
      pillBg: 'bg-amber-500 text-slate-950',
      graphicBg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60',
      accentText: 'text-amber-600 dark:text-amber-400',
    },
    graphicIcons: (
      <>
        <span>🧍</span>
        <span>🧍</span>
        <span>🧍</span>
        <span className="text-amber-500 font-black text-xl sm:text-2xl md:text-3xl">⚽️</span>
        <span className="text-xl sm:text-2xl md:text-3xl">✨</span>
      </>
    ),
    badgeJa: '🧍 全員スタンバイ',
    badgeEn: '🧍 Everyone Stand Up',
    titleJa: (
      <>
        <ruby>全員<rt>ぜんいん</rt></ruby><ruby>席<rt>せき</rt></ruby>の<ruby>横<rt>よこ</rt></ruby>に<ruby>立<rt>た</rt></ruby>って、1<ruby>人目<rt>ひとりめ</rt></ruby>の<ruby>人<rt>ひと</rt></ruby>がボールを<ruby>持<rt>も</rt></ruby>とう！
      </>
    ),
    titleEn: 'Everyone Stand by Your Desks! Player 1 Holds the Ball!',
    instructionJa: (
      <>
        <ruby>全員<rt>ぜんいん</rt></ruby><ruby>席<rt>せき</rt></ruby>の<ruby>横<rt>よこ</rt></ruby>に<ruby>立<rt>た</rt></ruby>ってスタンバイしよう。1<ruby>人目<rt>ひとりめ</rt></ruby>の<ruby>人<rt>ひと</rt></ruby>がボールを<ruby>両手<rt>りょうて</rt></ruby>で<ruby>持<rt>も</rt></ruby>って、<ruby>音楽<rt>おんがく</rt></ruby>を<ruby>待<rt>ま</rt></ruby>とう。
      </>
    ),
    instructionEn: 'Everyone stands up by their desk. Player 1 holds the ball with two hands and waits for the music to begin!',
    tipJa: <>💡 音楽がスタートする前に、最初の人がボールをしっかり構えよう！</>,
    tipEn: '💡 Player 1 holds the ball ready with two hands before the music begins!',
  },

  // 2. Passing Formation: Interactive Dual Mode (Zigzag S-Curve vs Perimeter Circle)
  {
    step: 2,
    theme: {
      border: 'border-sky-400 dark:border-sky-500',
      pillBg: 'bg-sky-500 text-white',
      graphicBg: 'bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800/60',
      accentText: 'text-sky-600 dark:text-sky-400',
    },
    graphicIcons: (
      <>
        <span>🪑</span>
        <span className="text-sky-500 font-black text-xl sm:text-2xl md:text-3xl">➔</span>
        <span>🪑</span>
        <span className="text-sky-500 font-black text-xl sm:text-2xl md:text-3xl">➔</span>
        <span>🪑</span>
        <span className="text-xl sm:text-2xl md:text-3xl">🔄</span>
      </>
    ),
    badgeJa: '📍 パスの順番・隊形',
    badgeEn: '📍 Passing Formation',
    titleJa: (
      <>
        ボールを<ruby>回<rt>まわ</rt></ruby>す<ruby>順番<rt>じゅんばん</rt></ruby>を<ruby>確認<rt>かくにん</rt></ruby>しよう！
      </>
    ),
    titleEn: 'Check How to Pass the Ball Down the Room!',
    instructionJa: (
      <>
        みんな<ruby>席<rt>せき</rt></ruby>の<ruby>横<rt>よこ</rt></ruby>に<ruby>立<rt>た</rt></ruby>ったまま、1<ruby>列目<rt>れつめ</rt></ruby>から<ruby>次<rt>つぎ</rt></ruby>の<ruby>列<rt>れつ</rt></ruby>へジグザグに<ruby>渡<rt>わた</rt></ruby>していこう。
      </>
    ),
    instructionEn: 'Stand by your desks and pass the ball down each row in a zigzag line!',
    tipJa: <>💡 列の端まで行ったら、すぐ後ろの列へパスしよう！</>,
    tipEn: '💡 When you reach the end of a row, pass to the row behind you!',
  },

  // 3. Say Word on Screen & Pass Right Away!
  {
    step: 3,
    theme: {
      border: 'border-rose-400 dark:border-rose-500',
      pillBg: 'bg-rose-500 text-white',
      graphicBg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60',
      accentText: 'text-rose-600 dark:text-rose-400',
    },
    graphicIcons: (
      <>
        <span>📺</span>
        <span>🗣️</span>
        <span className="text-rose-500 font-black text-xl sm:text-2xl md:text-3xl">➔</span>
        <span>🤲</span>
        <span>🤝</span>
      </>
    ),
    badgeJa: '📢 発音してパス',
    badgeEn: '📢 Say Word & Pass',
    titleJa: (
      <>
        <ruby>画面<rt>がめん</rt></ruby>の<ruby>英語<rt>えいご</rt></ruby>を<ruby>言<rt>い</rt></ruby>って、すぐ<ruby>隣<rt>となり</rt></ruby>へパス！
      </>
    ),
    titleEn: 'Say the Word on Screen and Pass Right Away!',
    instructionJa: (
      <>
        <ruby>画面<rt>がめん</rt></ruby>にカードが<ruby>出<rt>で</rt></ruby>たら、ボールを<ruby>持<rt>も</rt></ruby>つ<ruby>人<rt>ひと</rt></ruby>が<ruby>英語<rt>えいご</rt></ruby>を<ruby>言<rt>い</rt></ruby>って、すぐに<ruby>隣<rt>となり</rt></ruby>へ<ruby>手渡<rt>てわた</rt></ruby>そう！
      </>
    ),
    instructionEn: 'Look at the screen! Say the English word aloud and pass the ball to the next person right away!',
    tipJa: <>💡 ポテトはアツアツ！持ったまま止まらずにすぐ渡そう！</>,
    tipEn: '💡 The potato is burning hot! Say the word and pass it quickly!',
  },

  // 4. Help Friends in Need (Chime in with hints)
  {
    step: 4,
    theme: {
      border: 'border-emerald-400 dark:border-emerald-500',
      pillBg: 'bg-emerald-500 text-white',
      graphicBg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60',
      accentText: 'text-emerald-600 dark:text-emerald-400',
    },
    graphicIcons: (
      <>
        <span>👂</span>
        <span>🤝</span>
        <span>💡</span>
        <span className="text-emerald-500 font-black text-xl sm:text-2xl md:text-3xl">💬</span>
        <span>👏</span>
      </>
    ),
    badgeJa: '🤝 困ったらアシスト',
    badgeEn: '🤝 Help Friends in Need',
    titleJa: (
      <>
        <ruby>困<rt>こま</rt></ruby>っている<ruby>友達<rt>ともだち</rt></ruby>がいたら、みんなでヒントを<ruby>出<rt>だ</rt></ruby>して<ruby>助<rt>たす</rt></ruby>けよう！
      </>
    ),
    titleEn: 'If Your Friend Gets Stuck, Chime In to Help!',
    instructionJa: (
      <>
        ボールを<ruby>持<rt>も</rt></ruby>つ<ruby>人<rt>ひと</rt></ruby>の<ruby>声<rt>こえ</rt></ruby>をよく<ruby>聞<rt>き</rt></ruby>こう！もし<ruby>言<rt>い</rt></ruby>えなくて<ruby>困<rt>こま</rt></ruby>っていたら、<ruby>周<rt>まわ</rt></ruby>りのみんながやさしくヒントを<ruby>教<rt>おし</rt></ruby>えてあげよう！
      </>
    ),
    instructionEn: 'Listen quietly while the runner speaks! If they need help, kindly chime in together with the answer.',
    tipJa: <>💡 あせらせず、笑顔でやさしく教えてあげよう！</>,
    tipEn: '💡 Be kind and encouraging—teamwork makes the game fun!',
  },

  // 5. Freeze / Pop / Time's Up
  {
    step: 5,
    theme: {
      border: 'border-orange-400 dark:border-orange-500',
      pillBg: 'bg-orange-500 text-slate-950',
      graphicBg: 'bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800/60',
      accentText: 'text-orange-600 dark:text-orange-400',
    },
    graphicIcons: (
      <>
        <span>🔥</span>
        <span>🥔</span>
        <span>🎈</span>
        <span>🍿</span>
        <span>💥</span>
      </>
    ),
    badgeJa: '⏱️ タイムアップ！',
    badgeEn: '⏱️ Time’s Up!',
    titleJa: (
      <>
        「ジュージュー！🔥」「パチン！🎈」と<ruby>鳴<rt>な</rt></ruby>ったらストップ！
      </>
    ),
    titleEn: 'When It Sizzles or Pops, Freeze in Place!',
    instructionJa: (
      <>
        タイマーの<ruby>音<rt>おと</rt></ruby>が<ruby>鳴<rt>な</rt></ruby>った<ruby>瞬間<rt>しゅんかん</rt></ruby>にボールを<ruby>持<rt>も</rt></ruby>っていた<ruby>人<rt>ひと</rt></ruby>が、このラウンドの「スター」！
      </>
    ),
    instructionEn: 'When the secret timer goes off, whoever is holding the ball is the star of the round!',
    tipJa: <>💡 ばつゲームはないよ！みんなで楽しく盛り上がろう！</>,
    tipEn: '💡 It’s a happy sizzle or pop—no outs and no penalties!',
  },

  // 6. Fun Mini-Mission
  {
    step: 6,
    theme: {
      border: 'border-purple-400 dark:border-purple-500',
      pillBg: 'bg-purple-600 text-white',
      graphicBg: 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800/60',
      accentText: 'text-purple-600 dark:text-purple-400',
    },
    graphicIcons: (
      <>
        <span>⭐</span>
        <span>🎭</span>
        <span>🕺</span>
        <span>👏</span>
        <span>💖</span>
      </>
    ),
    badgeJa: '🎉 ラッキーミッション',
    badgeEn: '🎉 Fun Mini-Mission',
    titleJa: (
      <>
        <ruby>画面<rt>がめん</rt></ruby>に<ruby>出<rt>で</rt></ruby>る<ruby>楽<rt>たの</rt></ruby>しいミニミッションをやってみよう！
      </>
    ),
    titleEn: 'Complete the Fun Mini-Mission on Screen!',
    instructionJa: (
      <>
        「<ruby>動物<rt>どうぶつ</rt></ruby>の<ruby>鳴<rt>な</rt></ruby>きまね」や「ポーズ」などのお<ruby>題<rt>だい</rt></ruby>にトライ！できたらみんなで<ruby>大拍手<rt>だいはくしゅ</rt></ruby>！
      </>
    ),
    instructionEn: 'Act out an animal sound, fun pose, or dance! Everyone cheers with a big "Good job!"',
    tipJa: <>💡 恥ずかしい時は、先生や友達といっしょにやってもOK！</>,
    tipEn: '💡 You can do the mission together with a teacher or friend!',
  },

  // 7. Safe Play & Manners: Stand steady, never throw or run
  {
    step: 7,
    theme: {
      border: 'border-teal-400 dark:border-teal-500',
      pillBg: 'bg-teal-600 text-white',
      graphicBg: 'bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800/60',
      accentText: 'text-teal-600 dark:text-teal-400',
    },
    graphicIcons: (
      <>
        <span>🤝</span>
        <span>🚫</span>
        <span>🏃</span>
        <span>🤲</span>
        <span className="text-xl sm:text-2xl md:text-3xl">✨</span>
      </>
    ),
    badgeJa: '🛡️ 安全第一・マナー',
    badgeEn: '🛡️ Safe Play & Manners',
    titleJa: (
      <>
        <ruby>立<rt>た</rt></ruby>ったまま<ruby>両手<rt>りょうて</rt></ruby>で<ruby>手渡<rt>てわた</rt></ruby>し！<ruby>絶対<rt>ぜったい</rt></ruby>に<ruby>投<rt>な</rt></ruby>げたり<ruby>走<rt>はし</rt></ruby>ったりしない！
      </>
    ),
    titleEn: 'Hand Over with Two Hands! Never Throw or Run!',
    instructionJa: (
      <>
        <ruby>自分<rt>じぶん</rt></ruby>の<ruby>場所<rt>ばしょ</rt></ruby>に<ruby>立<rt>た</rt></ruby>ったまま、となりの<ruby>人<rt>ひと</rt></ruby>へ<ruby>両手<rt>りょうて</rt></ruby>でやさしく<ruby>手渡<rt>てわた</rt></ruby>そう。<ruby>走<rt>はし</rt></ruby>ったり、ボールを<ruby>投<rt>な</rt></ruby>げたりするのは<ruby>絶対<rt>ぜったい</rt></ruby>にダメ！
      </>
    ),
    instructionEn: 'Stay in your standing spot and hand the ball over gently with two hands. Never throw the ball or run across the room!',
    tipJa: <>💡 あわてず安全第一！両手でやさしくパスしよう！</>,
    tipEn: '💡 Gentle hands and standing steady—safety always comes first!',
  },
];

export const TimebombInstructionsModal: React.FC<TimebombInstructionsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { theme, toggleTheme } = useClassroom();
  const [lang, setLang] = useState<'ja' | 'en'>('ja');
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [passingRouteMode, setPassingRouteMode] = useState<'zigzag' | 'circle'>('zigzag');

  const totalSlides = TUTORIAL_SLIDES.length;
  const currentSlide = TUTORIAL_SLIDES[currentSlideIndex];
  const isJa = lang === 'ja';

  // Dynamic contents for Slide 2 based on passingRouteMode toggle (both Zigzag and Big Circle)
  const activeGraphicIcons = currentSlide.step === 2
    ? (passingRouteMode === 'zigzag' ? (
        <>
          <span>🪑</span>
          <span className="text-sky-500 font-black text-xl sm:text-2xl md:text-3xl">➔</span>
          <span>🪑</span>
          <span className="text-sky-500 font-black text-xl sm:text-2xl md:text-3xl">➔</span>
          <span>🪑</span>
          <span className="text-xl sm:text-2xl md:text-3xl">🔄</span>
        </>
      ) : (
        <>
          <span className="text-2xl sm:text-3xl md:text-4xl">⭕️</span>
          <span className="text-sky-500 font-black text-xl sm:text-2xl md:text-3xl">➔</span>
          <span>🧍</span>
          <span className="text-sky-500 font-black text-xl sm:text-2xl md:text-3xl">➔</span>
          <span>🧍</span>
          <span className="text-xl sm:text-2xl md:text-3xl">✨</span>
        </>
      ))
    : currentSlide.graphicIcons;

  const activeBadgeJa = currentSlide.step === 2
    ? (passingRouteMode === 'zigzag' ? '📍 自席ジグザグ' : '📍 大きな円 (サークル)')
    : currentSlide.badgeJa;

  const activeBadgeEn = currentSlide.step === 2
    ? (passingRouteMode === 'zigzag' ? '📍 Zigzag Rows' : '📍 Big Circle')
    : currentSlide.badgeEn;

  const activeTitleJa = currentSlide.step === 2
    ? (passingRouteMode === 'zigzag' ? (
        <>
          <ruby>席<rt>せき</rt></ruby>の<ruby>横<rt>よこ</rt></ruby>に<ruby>立<rt>た</rt></ruby>って、ジグザグにボールを<ruby>回<rt>まわ</rt></ruby>そう！
        </>
      ) : (
        <>
          <ruby>教室<rt>きょうしつ</rt></ruby>の<ruby>壁<rt>かべ</rt></ruby>の<ruby>近<rt>ちか</rt></ruby>くで、みんなで<ruby>大<rt>おお</rt></ruby>きな<ruby>円<rt>えん</rt></ruby>を<ruby>作<rt>つく</rt></ruby>ろう！
        </>
      ))
    : currentSlide.titleJa;

  const activeTitleEn = currentSlide.step === 2
    ? (passingRouteMode === 'zigzag'
        ? 'Stand by Desks and Pass in a Zigzag Line!'
        : 'Make One Big Circle Around the Room!')
    : currentSlide.titleEn;

  const activeInstructionJa = currentSlide.step === 2
    ? (passingRouteMode === 'zigzag' ? (
        <>
          みんな<ruby>席<rt>せき</rt></ruby>の<ruby>横<rt>よこ</rt></ruby>に<ruby>立<rt>た</rt></ruby>ったまま、1<ruby>列目<rt>れつめ</rt></ruby>から<ruby>次<rt>つぎ</rt></ruby>の<ruby>列<rt>れつ</rt></ruby>へジグザグに<ruby>渡<rt>わた</rt></ruby>していこう。
        </>
      ) : (
        <>
          <ruby>壁<rt>かべ</rt></ruby>の<ruby>近<rt>ちか</rt></ruby>くに<ruby>並<rt>なら</rt></ruby>んで<ruby>大<rt>おお</rt></ruby>きな<ruby>円<rt>えん</rt></ruby>を<ruby>作<rt>つく</rt></ruby>り、となりへボールを<ruby>渡<rt>わた</rt></ruby>していこう。
        </>
      ))
    : currentSlide.instructionJa;

  const activeInstructionEn = currentSlide.step === 2
    ? (passingRouteMode === 'zigzag'
        ? 'Stand by your desks and pass the ball down each row in a zigzag line!'
        : 'Stand by the walls to make one big circle. Pass the ball to the next person!')
    : currentSlide.instructionEn;

  const activeTipJa = currentSlide.step === 2
    ? (passingRouteMode === 'zigzag'
        ? <>💡 列の端まで行ったら、すぐ後ろの列へパスしよう！</>
        : <>💡 友達と少し間をあけて、渡しやすい距離で立とう！</>)
    : currentSlide.tipJa;

  const activeTipEn = currentSlide.step === 2
    ? (passingRouteMode === 'zigzag'
        ? '💡 When you reach the end of a row, pass to the row behind you!'
        : '💡 Leave space between each other so it is easy to pass!')
    : currentSlide.tipEn;

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
      const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };
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
    setCurrentSlideIndex(prev => {
      if (prev > 0) {
        soundEffects.playCardFlip();
        return prev - 1;
      }
      return prev;
    });
  }, []);

  const handleNext = useCallback(() => {
    setCurrentSlideIndex(prev => {
      if (prev < totalSlides - 1) {
        soundEffects.playCardFlip();
        return prev + 1;
      } else {
        // Last slide: launch game
        soundEffects.playCorrect();
        onClose();
        return prev;
      }
    });
  }, [totalSlides, onClose]);

  const handleJumpToSlide = useCallback((index: number) => {
    if (index >= 0 && index < totalSlides) {
      soundEffects.playCardFlip();
      setCurrentSlideIndex(index);
    }
  }, [totalSlides]);

  // Keyboard navigation: Arrow keys, Space, Enter, Escape, 1-7 numbers
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        handleNext();
      } else if (e.key >= '1' && e.key <= '7') {
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
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 select-none animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-[98vw] max-w-[1800px] h-[95dvh] max-h-[980px] flex flex-col bg-white dark:bg-slate-900 border-4 sm:border-6 border-amber-400 dark:border-amber-500 rounded-3xl shadow-2xl overflow-hidden transition-all duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* ====================================================================
            HEADER BAR: Title, Fullscreen, Lang & Theme Toggles, Close
           ==================================================================== */}
        <div className="flex items-center justify-between gap-2 px-3.5 sm:px-6 py-2 sm:py-2.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-slate-950 shrink-0 min-h-[46px] sm:min-h-[50px]">
          {/* Left: Modal Title */}
          <div className="min-w-0 flex-1 flex items-center gap-2">
            <span className="text-base sm:text-xl shrink-0">🥔</span>
            <h1 className="text-xs sm:text-base md:text-lg font-black tracking-wide text-slate-950 truncate">
              {isJa ? (
                <>
                  ホットポテト＆ポップ・リレーの<ruby>遊<rt>あそ</rt></ruby>び<ruby>方<rt>かた</rt></ruby>・ルール
                </>
              ) : (
                'Hot Potato & Pop Relay · How to Play & Rules'
              )}
            </h1>
          </div>

          {/* Right Controls: Fullscreen, Language, Theme, Close */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-nowrap">
            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-1 sm:p-1.5 rounded-xl bg-slate-950/20 hover:bg-slate-950/30 text-slate-950 transition-all cursor-pointer"
              title={
                isJa
                  ? isFullscreen
                    ? '全画面を解除 (Esc / F11)'
                    : '全画面にする (F11)'
                  : isFullscreen
                  ? 'Exit Fullscreen (Esc / F11)'
                  : 'Enter Fullscreen (F11)'
              }
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>

            {/* Language Toggle */}
            <div className="flex bg-slate-950/25 p-0.5 rounded-xl text-xs sm:text-sm font-black shrink-0 flex-nowrap">
              <button
                type="button"
                onClick={() => setLang('ja')}
                className={`px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  isJa ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-900 hover:text-white'
                }`}
              >
                日
              </button>
              <button
                type="button"
                onClick={() => setLang('en')}
                className={`px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  !isJa ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-900 hover:text-white'
                }`}
              >
                EN
              </button>
            </div>

            {/* Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-1 sm:p-1.5 rounded-xl bg-slate-950/20 hover:bg-slate-950/30 text-slate-950 transition-all cursor-pointer"
              title={isJa ? 'テーマ切り替え' : 'Toggle theme'}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1 sm:p-1.5 rounded-xl bg-slate-950/20 hover:bg-slate-950/40 text-slate-950 transition-all cursor-pointer"
              title={isJa ? '閉じる (Esc)' : 'Close (Esc)'}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ====================================================================
            MAIN STAGE: GRAND FULLSCREEN PRESENTATION CARD
           ==================================================================== */}
        <div className="flex-1 min-h-0 p-3 sm:p-5 md:p-6 flex flex-col justify-center items-center overflow-hidden">
          {/* Main Card Surface */}
          <div
            className={`w-full h-full rounded-2xl sm:rounded-3xl border-4 ${currentSlide.theme.border} bg-white dark:bg-slate-900 p-3 sm:p-5 md:p-6 shadow-xl flex flex-col items-center justify-between text-center relative transition-all duration-200 overflow-y-auto`}
          >
            {/* 1. TOP ANCHOR: Visual Diagram & Card 2 Side-by-Side Dual-Mode Switcher */}
            <div className="shrink-0 flex flex-nowrap items-center justify-center gap-3 sm:gap-5 max-w-full overflow-x-auto no-scrollbar mt-0">
              {/* Illustration Box */}
              <div
                className={`w-auto min-w-[190px] max-w-fit px-6 sm:px-8 py-1.5 sm:py-2.5 rounded-2xl sm:rounded-3xl border-3 ${currentSlide.theme.border} ${currentSlide.theme.graphicBg} flex flex-col items-center justify-center shrink-0 shadow-inner`}
              >
                <div className="flex items-center justify-center gap-3 sm:gap-4 text-2xl sm:text-3xl md:text-4xl leading-none">
                  {activeGraphicIcons}
                </div>
                <span className="text-[11px] sm:text-xs md:text-sm font-black tracking-wide bg-white/95 dark:bg-slate-900/95 px-4 sm:px-5 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 shadow-xs mt-1.5 leading-none whitespace-nowrap">
                  {isJa ? activeBadgeJa : activeBadgeEn}
                </span>
              </div>

              {/* Card 2 Side-by-Side Dual-Mode Toggle */}
              {currentSlide.step === 2 && (
                <div className="flex flex-nowrap bg-slate-100 dark:bg-slate-800 p-1 sm:p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs shrink-0 gap-1 animate-in fade-in zoom-in-95 duration-150">
                  <button
                    type="button"
                    onClick={() => {
                      setPassingRouteMode('zigzag');
                      soundEffects.playCardFlip();
                    }}
                    className={`px-3 sm:px-4 py-1.5 rounded-xl font-black text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                      passingRouteMode === 'zigzag'
                        ? 'bg-sky-500 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <span>🪑</span>
                    <span>{isJa ? '自席ジグザグ' : 'Zigzag Rows'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPassingRouteMode('circle');
                      soundEffects.playCardFlip();
                    }}
                    className={`px-3 sm:px-4 py-1.5 rounded-xl font-black text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                      passingRouteMode === 'circle'
                        ? 'bg-sky-500 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <span>⭕️</span>
                    <span>{isJa ? '大きな円 (サークル)' : 'Big Circle'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* 2. MIDDLE ZONE: Language-Specific Calibrated Typography */}
            <div className="flex-1 min-h-0 w-full max-w-5xl xl:max-w-6xl flex flex-col items-center justify-center my-auto px-4 py-2 sm:py-3 gap-2 sm:gap-3.5 overflow-hidden">
              {/* Responsive Headline */}
              <h2
                className={`font-black text-slate-900 dark:text-white tracking-tight text-center text-balance ${
                  isJa
                    ? 'text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-[48px] leading-snug'
                    : 'text-xl sm:text-2xl md:text-3xl lg:text-[38px] xl:text-[42px] leading-tight max-w-4xl'
                }`}
              >
                {isJa ? activeTitleJa : activeTitleEn}
              </h2>

              {/* Action Instruction Sentence */}
              <p
                className={`font-bold text-slate-700 dark:text-slate-200 leading-relaxed text-center text-balance ${
                  isJa
                    ? 'text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-[30px] max-w-4xl xl:max-w-5xl'
                    : 'text-sm sm:text-base md:text-lg lg:text-xl xl:text-[23px] max-w-3xl xl:max-w-4xl'
                }`}
              >
                {isJa ? activeInstructionJa : activeInstructionEn}
              </p>
            </div>

            {/* 3. BOTTOM ANCHOR: Helpful Classroom Tip Callout */}
            <div className="w-full max-w-3xl xl:max-w-4xl shrink-0 mt-auto pb-1">
              <div
                className={`bg-amber-100/90 dark:bg-amber-950/60 border-2 border-amber-300 dark:border-amber-700/70 rounded-2xl px-6 sm:px-10 py-2 sm:py-2.5 font-black text-amber-950 dark:text-amber-100 shadow-xs text-center leading-snug text-balance ${
                  isJa ? 'text-sm sm:text-base md:text-lg lg:text-xl' : 'text-xs sm:text-sm md:text-base lg:text-lg'
                }`}
              >
                {isJa ? activeTipJa : activeTipEn}
              </div>
            </div>
          </div>
        </div>

        {/* ====================================================================
            FOOTER CONTROLS: [Back] [1] [2] [3] [4] [5] [6] [7] [Next / Let's Play]
           ==================================================================== */}
        <div className="px-3 sm:px-6 py-2.5 sm:py-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex flex-nowrap items-center justify-center shrink-0 gap-2.5 sm:gap-4 overflow-x-auto no-scrollbar">
          {/* Back Button */}
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentSlideIndex <= 0}
            className="px-3.5 sm:px-5 py-1.5 sm:py-2.5 rounded-2xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 disabled:opacity-25 disabled:cursor-not-allowed text-slate-800 dark:text-slate-200 font-bold text-xs sm:text-sm md:text-base flex items-center gap-1.5 transition-all cursor-pointer shadow-xs shrink-0 whitespace-nowrap"
            title={isJa ? '前のカード (←キー)' : 'Previous Card (← Arrow)'}
          >
            <ChevronLeft size={18} />
            <span>{isJa ? 'まえへ' : 'Back'}</span>
          </button>

          {/* 7 Interactive Step Indicator Dots / Number Pills */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-nowrap">
            {TUTORIAL_SLIDES.map((slide, idx) => {
              const isActive = idx === currentSlideIndex;
              return (
                <button
                  key={slide.step}
                  type="button"
                  onClick={() => handleJumpToSlide(idx)}
                  className={`w-8 h-8 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-full font-black text-xs sm:text-sm md:text-base flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                    isActive
                      ? `${slide.theme.pillBg} shadow-md scale-110 ring-2 ring-amber-400`
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700'
                  }`}
                  title={`${isJa ? 'ステップ' : 'Step'} ${slide.step}`}
                >
                  {slide.step}
                </button>
              );
            })}
          </div>

          {/* Next OR Start Game Button */}
          {currentSlideIndex < totalSlides - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-4 sm:px-6 py-1.5 sm:py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-black text-xs sm:text-sm md:text-base shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap"
              title={isJa ? '次のカード (→キー / スペース)' : 'Next Card (→ Arrow / Space)'}
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
              className="px-5 sm:px-8 py-1.5 sm:py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-xs sm:text-sm md:text-base shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-2 animate-pulse shrink-0 whitespace-nowrap"
              title={isJa ? 'ゲーム開始 (Enter)' : 'Start Game (Enter)'}
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
