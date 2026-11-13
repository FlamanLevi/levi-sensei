import React, { useState, useEffect } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Play,
  Sun,
  Moon,
  Sparkles,
  RotateCw,
  GitFork,
  Layers,
  HelpCircle
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useClassroom } from '@/context/ClassroomContext';

interface MysteryPencilCaseInstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartGame?: () => void;
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

export const MysteryPencilCaseInstructionsModal: React.FC<MysteryPencilCaseInstructionsModalProps> = ({
  isOpen,
  onClose,
  onStartGame
}) => {
  const { language, toggleLanguage } = useLanguage();
  const { theme, toggleTheme } = useClassroom();
  const [currentStep, setCurrentStep] = useState(0);

  const isJa = language === 'ja';

  const slides: TutorialSlide[] = [
    {
      step: 1,
      theme: {
        border: 'border-blue-400 dark:border-blue-500',
        pillBg: 'bg-blue-500 text-white',
        graphicBg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800',
        accentText: 'text-blue-600 dark:text-blue-400'
      },
      graphicIcons: (
        <div className="flex items-center gap-3">
          <span className="text-4xl sm:text-5xl">◆</span>
          <span className="text-2xl sm:text-3xl text-blue-500">➜</span>
          <span className="text-4xl sm:text-5xl">🖊️</span>
        </div>
      ),
      badgeJa: 'ステップ 1: 質問 (Question)',
      badgeEn: 'STEP 1: QUESTION NODE',
      titleJa: <>みんなで<ruby>質問<rt>しつもん</rt></ruby>しよう！</>,
      titleEn: 'Start with the Question Node!',
      instructionJa: (
        <>
          テレビの<ruby>一番上<rt>いちばんうえ</rt></ruby>にあるカードを<ruby>見<rt>み</rt></ruby>て、
          <br className="hidden sm:inline" />
          <span className="font-black text-blue-600 dark:text-blue-400">「Do you have a (文房具)?」</span>と元気にたずねよう！
          <br />
          <span className="text-xs sm:text-sm text-slate-500">※「eraser」のときは「an eraser」と表示されるよ！</span>
        </>
      ),
      instructionEn: 'Look at the top question box and chant "Do you have a/an _____?" with energy! Watch out for "an eraser"!',
      tipJa: <>先生やクラスの半分がたずねる係になろう！</>,
      tipEn: 'Half the class asks, or the teacher leads the question chant.'
    },
    {
      step: 2,
      theme: {
        border: 'border-indigo-400 dark:border-indigo-500',
        pillBg: 'bg-indigo-500 text-white',
        graphicBg: 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800',
        accentText: 'text-indigo-600 dark:text-indigo-400'
      },
      graphicIcons: (
        <div className="flex items-center gap-3">
          <span className="text-3xl font-black text-emerald-500">🟢 YES</span>
          <span className="text-2xl text-slate-400">／</span>
          <span className="text-3xl font-black text-rose-500">🔴 NO</span>
        </div>
      ),
      badgeJa: 'ステップ 2: 2つの分岐 (Branches)',
      badgeEn: 'STEP 2: TWO PATHS (YES & NO)',
      titleJa: <>YES と NO の両方を練習！</>,
      titleEn: 'Practice Both Paths in Sequence!',
      instructionJa: (
        <>
          質問の後は、フローチャートの2つの道を順番に声に出そう！
          <br />
          ① <span className="font-black text-emerald-600 dark:text-emerald-400">「Yes, I do. I have a pen.」</span>（ある場合）
          <br />
          ② もう一度質問して ➜ <span className="font-black text-rose-600 dark:text-rose-400">「No, I don't. I don't have a pen.」</span>（ない場合）
          <br />
          <span className="text-xs sm:text-sm text-slate-500"><kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-mono text-xs">Space</kbd>キーで①〜④の順番にフォーカスが動くよ！</span>
        </>
      ),
      instructionEn: 'Chant both paths before moving on: First "Yes, I do. I have a pen." Then ask again and answer "No, I don\'t. I don\'t have a pen." Press Space to guide the focus!',
      tipJa: <>肯定文と否定文をセットで練習することで、リズムと構文がしっかり定着します！</>,
      tipEn: 'Practicing both affirmative and negative together reinforces language patterns.'
    },
    {
      step: 3,
      theme: {
        border: 'border-amber-400 dark:border-amber-500',
        pillBg: 'bg-amber-500 text-slate-950',
        graphicBg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800',
        accentText: 'text-amber-600 dark:text-amber-400'
      },
      graphicIcons: (
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-xl bg-blue-500 text-white font-black text-xs sm:text-sm">English</span>
          <RotateCw size={18} className="text-amber-500" />
          <span className="px-3 py-1 rounded-xl bg-emerald-500 text-white font-black text-xs sm:text-sm">日本語</span>
        </div>
      ),
      badgeJa: 'ステップ 3: カードの裏表 (Card Flip)',
      badgeEn: 'STEP 3: BILINGUAL FLIP (EN ⇄ JA)',
      titleJa: <>タップで日本語と英語を切り替え！</>,
      titleEn: 'Tap Any Card to Flip to Japanese!',
      instructionJa: (
        <>
          カードをクリックするか、<kbd className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-mono text-xs">F</kbd>キーを<ruby>押<rt>お</rt></ruby>すと、
          <br className="hidden sm:inline" />
          カードがクルッとひっくり返って<span className="font-bold text-amber-600 dark:text-amber-400">ふりがな付き日本語</span>になるよ！
          <br />
          分岐ボタンも「YES / NO」と「ある / なし」を自由に切り替えられます。
        </>
      ),
      instructionEn: 'Click any card or press "F" to flip between English and Japanese with furigana! The branch labels also toggle between YES/NO and ある/なし.',
      tipJa: <>「日本語でなんて言うかな？」と問いかけてからひっくり返すと盛り上がります！</>,
      tipEn: 'Ask students what it means in Japanese before flipping to confirm!'
    },
    {
      step: 4,
      theme: {
        border: 'border-rose-400 dark:border-rose-500',
        pillBg: 'bg-rose-500 text-white',
        graphicBg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800',
        accentText: 'text-rose-600 dark:text-rose-400'
      },
      graphicIcons: (
        <div className="flex items-center gap-2">
          <span className="text-2xl sm:text-3xl font-black text-amber-500">Stage 2 & 3</span>
          <span className="text-2xl">➔</span>
          <span className="w-6 h-6 rounded-full bg-blue-500" />
          <span className="text-2xl">🖍️</span>
        </div>
      ),
      badgeJa: 'ステップ 4: 個数・色・代案 (Level Up)',
      badgeEn: 'STEP 4: QUANTITIES & COLORS',
      titleJa: <>個数と色、代案にも挑戦！</>,
      titleEn: 'Level Up to Quantities & Colors!',
      instructionJa: (
        <>
          <span className="font-bold text-blue-500">Stage 2</span>：個数を数えて「I have 3 pens!」と複数形「-s」をつけよう！
          <br />
          <span className="font-bold text-rose-500">Stage 3</span>：色を入れて「I have two blue pens!」や、
          <br />
          持っていない時に<span className="font-bold text-purple-600 dark:text-purple-400">「No, I don't. But I have a red marker!」</span>と代案を伝えよう！
        </>
      ),
      instructionEn: 'Stage 2 practices quantities & plurals ("3 pens!"). Stage 3 adds colors ("two blue pens!") and counter-offers ("No, I don\'t. But I have a red marker!").',
      tipJa: <>教科書21ページの「文房具セットを作ろう」カード交換アクティビティに直結します！</>,
      tipEn: 'Directly prepares students for the Let\'s Try 2 page 21 card trading activity.'
    }
  ];

  const currentSlide = slides[currentStep];

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (currentStep < slides.length - 1) {
          setCurrentStep(prev => prev + 1);
        } else {
          onStartGame?.();
          onClose();
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (currentStep > 0) {
          setCurrentStep(prev => prev - 1);
        }
      } else if (e.key >= '1' && e.key <= String(slides.length)) {
        e.preventDefault();
        setCurrentStep(parseInt(e.key, 10) - 1);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStep, slides.length, onClose, onStartGame]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-[98vw] max-w-[1800px] h-[95dvh] max-h-[980px] bg-white dark:bg-slate-900 border-4 sm:border-6 border-amber-400 dark:border-amber-500 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-800 dark:text-slate-100">
        {/* Header Controls */}
        <div className="flex items-center justify-between gap-2 px-4 sm:px-6 py-2.5 sm:py-3 border-b-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-black bg-blue-500 text-white uppercase tracking-wider shrink-0 whitespace-nowrap">
              FLOWCHART TUTORIAL
            </span>
            <span className="font-black text-sm sm:text-base text-slate-700 dark:text-slate-200 truncate">
              {isJa ? 'フローチャートの使い方' : 'How to Use the Flowchart'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-nowrap">
            <button
              onClick={toggleLanguage}
              className="px-2.5 py-1 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-black whitespace-nowrap transition cursor-pointer"
            >
              {isJa ? 'EN' : '日'}
            </button>
            <button
              onClick={toggleTheme}
              className="p-1.5 sm:p-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Main Stage Content */}
        <div className="flex-1 p-3 sm:p-5 md:p-6 overflow-hidden flex flex-col justify-between items-center">
          <div
            className={`w-full h-full rounded-2xl sm:rounded-3xl border-4 ${currentSlide.theme.border} bg-white dark:bg-slate-900 p-4 sm:p-6 md:p-8 shadow-xl flex flex-col items-center justify-between text-center overflow-y-auto`}
          >
            {/* Top Illustration Box */}
            <div
              className={`w-auto min-w-[220px] max-w-fit px-8 sm:px-12 py-3 rounded-2xl sm:rounded-3xl border-3 ${currentSlide.theme.border} ${currentSlide.theme.graphicBg} shadow-inner flex flex-col items-center justify-center gap-1.5 shrink-0`}
            >
              {currentSlide.graphicIcons}
              <span
                className={`px-3 py-0.5 rounded-full text-xs sm:text-sm font-black ${currentSlide.theme.pillBg} shadow-xs whitespace-nowrap`}
              >
                {isJa ? currentSlide.badgeJa : currentSlide.badgeEn}
              </span>
            </div>

            {/* Slide Title */}
            <div className="my-auto py-2">
              <h2
                className={`font-black tracking-tight text-balance leading-tight ${
                  isJa ? 'text-2xl sm:text-4xl xl:text-5xl' : 'text-xl sm:text-3xl xl:text-4xl'
                } ${currentSlide.theme.accentText}`}
              >
                {isJa ? currentSlide.titleJa : currentSlide.titleEn}
              </h2>

              <p
                className={`mt-4 sm:mt-6 text-slate-700 dark:text-slate-200 font-bold leading-relaxed max-w-4xl mx-auto ${
                  isJa ? 'text-base sm:text-xl md:text-2xl' : 'text-sm sm:text-lg md:text-xl'
                }`}
              >
                {isJa ? currentSlide.instructionJa : currentSlide.instructionEn}
              </p>
            </div>

            {/* Tip Banner */}
            <div className="w-full max-w-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 rounded-2xl p-2.5 sm:p-3 text-xs sm:text-sm font-medium text-amber-900 dark:text-amber-200 flex items-center justify-center gap-2 shrink-0">
              <Sparkles size={16} className="text-amber-500 shrink-0" />
              <span>
                <strong className="font-bold">{isJa ? '指導のヒント: ' : 'Classroom Tip: '}</strong>
                {isJa ? currentSlide.tipJa : currentSlide.tipEn}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="px-4 sm:px-6 py-3 border-t-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex flex-nowrap items-center justify-between shrink-0 gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
            disabled={currentStep === 0}
            className={`px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0 whitespace-nowrap ${
              currentStep === 0
                ? 'opacity-30 cursor-not-allowed bg-slate-200 dark:bg-slate-800 text-slate-400'
                : 'bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-200'
            }`}
          >
            <ChevronLeft size={16} />
            <span>{isJa ? '前へ' : 'Back'}</span>
          </button>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0 flex-nowrap">
            {slides.map((s, idx) => (
              <button
                key={s.step}
                onClick={() => setCurrentStep(idx)}
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full text-xs font-black transition cursor-pointer flex items-center justify-center shrink-0 ${
                  currentStep === idx
                    ? 'bg-blue-600 text-white scale-110 shadow-md ring-2 ring-blue-400'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-500 hover:bg-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                {s.step}
              </button>
            ))}
          </div>

          {currentStep < slides.length - 1 ? (
            <button
              onClick={() => setCurrentStep(prev => prev + 1)}
              className="px-5 sm:px-6 py-2 rounded-xl text-xs sm:text-sm font-black bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 shadow-md transition cursor-pointer shrink-0 whitespace-nowrap"
            >
              <span>{isJa ? '次へ' : 'Next'}</span>
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={() => {
                onStartGame?.();
                onClose();
              }}
              className="px-5 sm:px-7 py-2 rounded-xl text-xs sm:text-sm font-black bg-emerald-500 hover:bg-emerald-600 text-white flex items-center gap-1.5 shadow-lg animate-pulse transition cursor-pointer shrink-0 whitespace-nowrap"
            >
              <Play size={16} fill="currentColor" />
              <span>{isJa ? 'スタート！' : 'Start Flowchart!'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
