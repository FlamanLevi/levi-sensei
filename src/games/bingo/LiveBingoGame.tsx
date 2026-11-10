import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import confetti from 'canvas-confetti';
import { useVocabulary } from '@/context/VocabularyContext';
import { useClassroom } from '@/context/ClassroomContext';
import { useAudio } from '@/context/AudioContext';
import { useLanguage } from '@/context/LanguageContext';
import { soundEffects } from '@/services/soundEffects';
import { VocabularyItem } from '@data/types';
import { resolveCardImage, shuffleArray } from '@/games/speed_flash/utils';
import { BingoPrintModal } from './BingoPrintModal';
import { BingoSettingsModal } from './BingoSettingsModal';
import { CinemaStageLayout } from '@/components/common/CinemaStageLayout';
import {
  Printer,
  Sparkles,
  Volume2,
  VolumeX,
  RotateCcw,
  Play,
  Pause,
  Shuffle,
  Trophy,
  CheckCircle2,
  Clock,
  ChevronRight,
  Settings
} from 'lucide-react';

interface LiveBingoGameProps {
  onExit?: () => void;
}

export const LiveBingoGame: React.FC<LiveBingoGameProps> = ({ onExit }) => {
  const { scopedWords, filteredWords, gradeWords, allWords } = useVocabulary();
  const { activeGrade, activeUnit } = useClassroom();
  const { playWordAudio, speakText } = useAudio();
  const { t, language } = useLanguage();

  // Active word pool: strictly filter out words that do not have valid illustration assets
  const rawPool = scopedWords.length >= 4
    ? scopedWords
    : (filteredWords.length >= 4 ? filteredWords : (gradeWords.length >= 4 ? gradeWords : allWords));

  const wordPool: VocabularyItem[] = useMemo(() => {
    return rawPool.filter((w: VocabularyItem) => {
      const img = resolveCardImage(w, 'picture_only', activeGrade);
      return Boolean(img && img.trim() !== '');
    });
  }, [rawPool, activeGrade]);

  // Game state
  const [undrawnWords, setUndrawnWords] = useState<VocabularyItem[]>([]);
  const [drawnWords, setDrawnWords] = useState<VocabularyItem[]>([]);
  const [currentWord, setCurrentWord] = useState<VocabularyItem | null>(null);
  const [isRolling, setIsRolling] = useState<boolean>(false);

  // Auto-draw state
  const [autoDraw, setAutoDraw] = useState<boolean>(false);
  const [autoSpeedSec, setAutoSpeedSec] = useState<number>(7);
  const [autoCountdown, setAutoCountdown] = useState<number>(7);

  // Audio & Modals
  const [playAudio, setPlayAudio] = useState<boolean>(true);
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Auto-draw interval ref
  const autoTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Deterministic Audio Helper (No stale closures)
  const speakSpecificWord = useCallback((item: VocabularyItem | null) => {
    if (!item) return;
    if (item.sound_file) {
      playWordAudio(item.sound_file, item.english);
    } else {
      speakText(item.english);
    }
  }, [playWordAudio, speakText]);

  // Initialize pool
  const initializeGame = useCallback(() => {
    if (wordPool.length === 0) return;
    const shuffled = shuffleArray([...wordPool]);
    setUndrawnWords(shuffled);
    setDrawnWords([]);
    setCurrentWord(null);
    setIsRolling(false);
    setAutoDraw(false);
    setAutoCountdown(autoSpeedSec);
    soundEffects.playCardFlip();
  }, [wordPool, autoSpeedSec]);

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  // Ref for history list auto-scroll
  const historyListRef = useRef<HTMLDivElement>(null);

  // Auto-scroll called words rack to top on new draw
  useEffect(() => {
    if (historyListRef.current) {
      historyListRef.current.scrollTop = 0;
    }
  }, [drawnWords.length]);

  // Draw next word
  const drawNextWord = useCallback(() => {
    if (undrawnWords.length === 0 || isRolling) {
      setAutoDraw(false);
      return;
    }

    setIsRolling(true);
    soundEffects.playTick();

    const nextWord = undrawnWords[0];
    const remaining = undrawnWords.slice(1);

    // Preload the next image immediately
    const nextImgUrl = resolveCardImage(nextWord, 'picture_only', activeGrade);
    if (nextImgUrl) {
      const preloadImg = new Image();
      preloadImg.src = nextImgUrl;
    }

    // Step 1: Switch the word BEHIND the opaque curtain at 120ms (while curtain is fully opaque)
    setTimeout(() => {
      setCurrentWord(nextWord);
      setDrawnWords((prev) => [nextWord, ...prev]);
      setUndrawnWords(remaining);
    }, 120);

    // Step 2: Lift the curtain at 500ms when the new word is 100% mounted, decoded, and ready
    setTimeout(() => {
      setIsRolling(false);
      setAutoCountdown(autoSpeedSec);
      soundEffects.playReveal();

      if (playAudio) {
        speakSpecificWord(nextWord);
      }
    }, 500);
  }, [undrawnWords, isRolling, activeGrade, playAudio, autoSpeedSec, speakSpecificWord]);

  // Auto-draw interval countdown manager
  useEffect(() => {
    if (autoTimerRef.current) {
      clearInterval(autoTimerRef.current);
      autoTimerRef.current = null;
    }

    if (autoDraw && undrawnWords.length > 0) {
      autoTimerRef.current = setInterval(() => {
        setAutoCountdown((prev) => {
          if (prev <= 1) {
            drawNextWord();
            return autoSpeedSec;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (undrawnWords.length === 0) {
      setAutoDraw(false);
    }

    return () => {
      if (autoTimerRef.current) {
        clearInterval(autoTimerRef.current);
        autoTimerRef.current = null;
      }
    };
  }, [autoDraw, undrawnWords.length, autoSpeedSec, drawNextWord]);

  // Keyboard shortcut listener (Space or Enter to draw next word)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        const target = e.target as HTMLElement;
        if (target && ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(target.tagName)) {
          if (target.tagName === 'BUTTON') return;
          return;
        }
        e.preventDefault();
        if (undrawnWords.length > 0 && !isRolling) {
          drawNextWord();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undrawnWords.length, isRolling, drawNextWord]);

  // Trigger BINGO celebration
  const handleBingoCelebration = () => {
    soundEffects.playFanfare();
    confetti({
      particleCount: 160,
      spread: 110,
      origin: { y: 0.5 },
    });
  };

  // Current Card Image
  const cardImage = useMemo(() => {
    if (!currentWord) return null;
    return resolveCardImage(currentWord, 'picture_only', activeGrade);
  }, [currentWord, activeGrade]);

  const stageActionBar = (
    <div className="w-full shrink-0 flex flex-col items-center gap-1">
      <button
        onClick={drawNextWord}
        disabled={undrawnWords.length === 0 || isRolling}
        className={`w-full py-3.5 sm:py-4.5 text-white text-xl sm:text-2xl lg:text-3xl font-black rounded-2xl shadow-xl transition-all transform active:scale-95 flex items-center justify-center gap-2.5 sm:gap-3 border-2 cursor-pointer ${
          undrawnWords.length === 0
            ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
            : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:to-purple-500 border-indigo-400 shadow-indigo-500/40'
        }`}
      >
        <Shuffle size={26} />
        <span>
          {undrawnWords.length === 0
            ? t('ALL CARDS DRAWN (Finished)', '全カード終了')
            : t('DRAW NEXT WORD!', '次のカードを引く！')}
        </span>
        <ChevronRight size={28} />
      </button>

      <div className="text-[11px] text-slate-400 font-mono">
        {t('Keyboard: Space or Enter to Draw', 'キーボード操作: Space または Enter でカードを引く')}
      </div>
    </div>
  );

  const sidebarContent = (
    <div className="flex flex-col gap-2.5 h-full justify-between">
      {/* 1. Pool Progress & Stats */}
      <div className="bg-slate-950/80 p-2.5 rounded-2xl border border-slate-800 shrink-0">
        <div className="flex items-center justify-between text-[11px] font-black text-slate-400 mb-1">
          <span>{t('Pool Progress', 'カード進捗')}</span>
          <span className="text-indigo-400 font-mono text-xs">
            {drawnWords.length} / {wordPool.length}
          </span>
        </div>
        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mb-1.5">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
            style={{
              width: `${wordPool.length > 0 ? (drawnWords.length / wordPool.length) * 100 : 0}%`
            }}
          />
        </div>
        <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
          <span>
            {t('Remaining', '残り')}: <span className="text-amber-400 font-black">{undrawnWords.length}</span>
          </span>
          <span className="px-1.5 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800/60 font-black text-[9px]">
            {activeGrade}
          </span>
        </div>
      </div>

      {/* 2. Auto-Draw Engine (Streamlined) */}
      <div className="bg-slate-950/80 p-2.5 rounded-2xl border border-slate-800 flex flex-col gap-2 shrink-0">
        <div className="flex items-center justify-between text-[11px] font-black text-slate-400">
          <span>{t('Auto-Draw Caller', '自動ドロー')}</span>
          {autoDraw && (
            <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-bold animate-pulse">
              <Clock size={12} />
              <span>{autoCountdown}s</span>
            </span>
          )}
        </div>

        <button
          onClick={() => {
            if (undrawnWords.length === 0) return;
            setAutoDraw(!autoDraw);
            setAutoCountdown(autoSpeedSec);
            soundEffects.playCardFlip();
          }}
          disabled={undrawnWords.length === 0}
          className={`w-full py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            autoDraw
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md border border-emerald-400/40 animate-pulse'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
          }`}
        >
          {autoDraw ? <Pause size={15} /> : <Play size={15} />}
          <span>
            {autoDraw
              ? t(`Calling (${autoSpeedSec}s)`, `自動中 (${autoSpeedSec}秒)`)
              : t('Start Auto-Draw', '自動ドロー開始')}
          </span>
        </button>
      </div>

      {/* 3. Big BINGO Celebration Fanfare Shout Button */}
      <button
        onClick={handleBingoCelebration}
        className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-sm sm:text-base shadow-xl hover:shadow-amber-500/30 transition-all transform active:scale-95 flex items-center justify-center gap-2 border-2 border-yellow-200 cursor-pointer shrink-0"
      >
        <Trophy size={18} className="fill-slate-950" />
        <span>🎉 {t('BINGO!!', 'ビンゴ成立！')}</span>
      </button>

      {/* 4. Bottom Controls: Reset + Settings Trigger */}
      <div className="flex items-center justify-between gap-1.5 pt-1.5 border-t border-slate-800 shrink-0">
        <button
          onClick={initializeGame}
          className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl border border-slate-700 text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
          title={t('Reset Game', 'リセット')}
        >
          <RotateCcw size={13} />
          <span>{t('Reset', 'リセット')}</span>
        </button>

        <button
          onClick={() => {
            setIsSettingsOpen(true);
            soundEffects.playCardFlip();
          }}
          className="p-1.5 bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/40 rounded-xl text-xs font-bold flex items-center justify-center cursor-pointer transition-all active:scale-95 shrink-0"
          title={t('Game Settings & Print', '設定・印刷')}
        >
          <Settings size={15} />
        </button>
      </div>
    </div>
  );

  const historyRackContent = (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2 shrink-0">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <h3 className="font-black text-xs sm:text-sm uppercase tracking-wider text-slate-300">
            {t('Called Words', '出た言葉')}
          </h3>
        </div>
        <span className="px-2 py-0.5 rounded-full text-xs font-black bg-emerald-950/80 border border-emerald-700/60 text-emerald-400">
          {drawnWords.length}
        </span>
      </div>

      {/* Scrollable list with fixed scroll container */}
      <div ref={historyListRef} className="flex-1 overflow-y-auto space-y-1.5 pr-1 min-h-0 overscroll-contain custom-scrollbar">
        {drawnWords.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-center text-xs font-bold text-slate-500 space-y-1">
            <span className="text-2xl">📋</span>
            <span>{t('No cards drawn yet', 'まだ引かれたカードはありません')}</span>
          </div>
        ) : (
          drawnWords.map((item, idx) => {
            const isLatest = idx === 0;
            const imgUrl = resolveCardImage(item, 'picture_only', activeGrade);

            return (
              <div
                key={item.id + idx}
                onClick={() => speakSpecificWord(item)}
                className={`flex items-center gap-2.5 p-1.5 sm:p-2 rounded-2xl border transition-all cursor-pointer group ${
                  isLatest
                    ? 'bg-indigo-950/60 border-indigo-500 shadow-md shadow-indigo-500/20'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                }`}
                title={t('Click to hear pronunciation', 'クリックして発音を聞く')}
              >
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white dark:bg-slate-900 border border-slate-800 flex items-center justify-center p-1 overflow-hidden shrink-0">
                  {imgUrl ? (
                    <img
                      src={imgUrl}
                      alt={item.english}
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <span className="text-sm">🖼️</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-xs sm:text-sm text-white truncate group-hover:text-indigo-300 transition-colors">
                      {item.english}
                    </span>
                    {isLatest ? (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-indigo-500 text-white uppercase animate-pulse">
                        NEW
                      </span>
                    ) : (
                      <Volume2 size={12} className="text-slate-600 group-hover:text-slate-400 shrink-0" />
                    )}
                  </div>
                  {(item.ja_hiragana || item.ja_kanji) && (
                    <span className="text-[11px] text-slate-400 truncate block">
                      {item.ja_hiragana || item.ja_kanji}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <>
      <CinemaStageLayout
        sidebarWidth="compact"
        onExit={onExit}
        title={t('Classroom Bingo', <><ruby>英語<rt className="text-[7px]">えいご</rt></ruby>ビンゴ</>)}
        badge={
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-500 text-white">
            STREAM A
          </span>
        }
        onOpenSettings={() => {
          setIsSettingsOpen(true);
          soundEffects.playCardFlip();
        }}
        sidebar={sidebarContent}
        stageAction={stageActionBar}
        rightRail={historyRackContent}
        rightRailWidth="standard"
      >
        {/* Rolling Strobe Suspense Overlay - Fully Opaque so old word is 100% hidden */}
        {isRolling && (
          <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center z-30 animate-in fade-in duration-100">
            <div className="text-7xl md:text-9xl animate-bounce mb-3">🎲</div>
            <p className="text-2xl md:text-3xl font-black text-amber-400 tracking-wider animate-pulse">
              {t('Rolling...', 'カードを選んでいます...')}
            </p>
          </div>
        )}

        {/* CARD CANVAS */}
        {currentWord ? (
          <div className="w-full flex-1 flex flex-col items-center justify-between bg-white dark:bg-slate-900 border-4 border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-4 md:p-6 min-h-0 relative">
            {/* Illustration fills the majority of the card */}
            <div className="flex-1 w-full flex items-center justify-center min-h-0 overflow-hidden">
              {cardImage ? (
                <img
                  key={currentWord.id || currentWord.english}
                  src={cardImage}
                  alt={currentWord.english}
                  className="w-full h-full max-h-[min(54vh,520px)] object-contain filter drop-shadow-md transition-all duration-300"
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
                <h2 className="text-4xl sm:text-6xl lg:text-7xl font-black text-slate-900 dark:text-white tracking-wide">
                  {currentWord.english}
                </h2>
                <button
                  onClick={() => speakSpecificWord(currentWord)}
                  className="p-2 md:p-2.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-indigo-500 dark:text-indigo-400 transition-all border border-slate-200 dark:border-slate-700 shadow-sm cursor-pointer"
                  title={t('Hear Pronunciation', '発音を聞く')}
                >
                  <Volume2 size={26} />
                </button>
              </div>
              {(currentWord.ja_hiragana || currentWord.ja_kanji) && (
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                  {currentWord.ja_hiragana || currentWord.ja_kanji}
                </p>
              )}
            </div>
          </div>
        ) : (
          /* IDLE READY STATE */
          <div className="w-full flex-1 flex flex-col items-center justify-center bg-white dark:bg-slate-900 border-4 border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 min-h-0 text-center">
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-3xl bg-indigo-500/10 border-4 border-dashed border-indigo-400/40 flex items-center justify-center text-6xl md:text-7xl mb-4 shadow-inner">
              🎰
            </div>
            <h2 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white mb-2">
              {t('Ready for Bingo!', 'ビンゴ大会スタート！')}
            </h2>
            <p className="text-base md:text-xl font-bold text-slate-500 dark:text-slate-400 max-w-lg mb-6">
              {t('Click "DRAW NEXT WORD" or press Space to reveal the first card!', '下の「次のカードを引く」を押して、最初の言葉を引こう！')}
            </p>
            <div className="px-5 py-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 font-black text-sm">
              {wordPool.length} {t('cards in pool', '枚のカードがセットされています')}
            </div>
          </div>
        )}
      </CinemaStageLayout>

      {/* Bingo Settings & Tools Modal */}
      <BingoSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        autoSpeedSec={autoSpeedSec}
        setAutoSpeedSec={setAutoSpeedSec}
        playAudio={playAudio}
        setPlayAudio={setPlayAudio}
        onOpenPrintModal={() => setShowPrintModal(true)}
        onResetGame={initializeGame}
      />

      {/* 35/40-Card Print Modal */}
      {showPrintModal && (
        <BingoPrintModal
          words={wordPool}
          grade={activeGrade}
          unitName={activeUnit || undefined}
          onClose={() => setShowPrintModal(false)}
        />
      )}
    </>
  );
};
