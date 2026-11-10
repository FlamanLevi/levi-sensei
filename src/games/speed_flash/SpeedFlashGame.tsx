import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useVocabulary } from '@/context/VocabularyContext';
import { useClassroom } from '@/context/ClassroomContext';
import { useAudio } from '@/context/AudioContext';
import { useLanguage } from '@/context/LanguageContext';
import { soundEffects } from '@/services/soundEffects';
import { VocabularyItem } from '@data/types';
import { FlashMode, DisplayTier } from './types';
import { prepareCardQueue } from './utils';
import { FlashcardStage } from './FlashcardStage';
import { SpeedFlashSettingsModal } from './SpeedFlashSettingsModal';
import { RubyText } from '@/components/common/RubyText';
import {
  Zap,
  Volume2,
  ChevronLeft,
  RotateCcw,
  Play,
  Pause,
  Clock,
  Flame,
  Settings
} from 'lucide-react';

interface SpeedFlashGameProps {
  onExit?: () => void;
}

type LightningState = 'READY' | 'FLASHING' | 'GUESSED' | 'REVEALED';

export const SpeedFlashGame: React.FC<SpeedFlashGameProps> = ({ onExit }) => {
  const { scopedWords, filteredWords, gradeWords, allWords, availableUnits } = useVocabulary();
  const { activeGrade, activeUnit, setActiveUnit } = useClassroom();
  const { playWordAudio, playPop } = useAudio();
  const { t } = useLanguage();

  const isYoungerGrade =
    activeGrade === 'KD_3yo' ||
    activeGrade === 'KD_4yo' ||
    activeGrade === 'KD_5yo' ||
    activeGrade === 'ES_G1' ||
    activeGrade === 'ES_G2';

  // --- Game Settings ---
  const [mode, setMode] = useState<FlashMode>('LIGHTNING');
  const [tier, setTier] = useState<DisplayTier>(isYoungerGrade ? 'picture_only' : 'picture_word');
  const [lightningSpeed, setLightningSpeed] = useState<number>(250); // 100, 250, 500, 1000 ms
  const [rhythmTempo, setRhythmTempo] = useState<number>(1200); // 800, 1000, 1200, 1500 ms
  const [autoPlayAudio, setAutoPlayAudio] = useState<boolean>(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // --- Game State ---
  const [cardQueue, setCardQueue] = useState<VocabularyItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [lightningState, setLightningState] = useState<LightningState>('READY');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [acceleratingSpeed, setAcceleratingSpeed] = useState<number>(1400);
  const [streakCount, setStreakCount] = useState<number>(0);

  // Timers refs
  const flashTimerRef = useRef<NodeJS.Timeout | null>(null);
  const loopTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentIndexRef = useRef<number>(currentIndex);
  currentIndexRef.current = currentIndex;

  const playCardAudio = useCallback((card: VocabularyItem) => {
    playWordAudio(card.sound_file || card.primary_audio, card.english);
  }, [playWordAudio]);

  // 1. Initialize Queue
  const setupQueue = useCallback(() => {
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    if (loopTimerRef.current) clearTimeout(loopTimerRef.current);

    setLightningState('READY');
    setIsRunning(false);
    setCurrentIndex(0);
    setStreakCount(0);
    setAcceleratingSpeed(1400);

    const primaryPool = scopedWords.length > 0 ? scopedWords : (filteredWords.length > 0 ? filteredWords : (gradeWords.length > 0 ? gradeWords : allWords));
    const fallbackPool = gradeWords.length > 0 ? gradeWords : allWords;
    const queue = prepareCardQueue(primaryPool, fallbackPool);
    setCardQueue(queue);
  }, [scopedWords, filteredWords, gradeWords, allWords]);

  useEffect(() => {
    setupQueue();
  }, [setupQueue]);

  useEffect(() => {
    return () => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      if (loopTimerRef.current) clearTimeout(loopTimerRef.current);
    };
  }, []);

  const currentCard = cardQueue[currentIndex] || null;

  // 2. Trigger Lightning Flash (100ms - 1000ms)
  const triggerLightningFlash = useCallback((durationMs = lightningSpeed) => {
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);

    soundEffects.playCardFlip();
    setLightningState('FLASHING');

    flashTimerRef.current = setTimeout(() => {
      setLightningState('GUESSED');
    }, durationMs);
  }, [lightningSpeed]);

  // 3. Trigger Slow Replay (1.2s peek)
  const triggerSlowReplay = useCallback(() => {
    triggerLightningFlash(1200);
  }, [triggerLightningFlash]);

  // 4. Reveal & Confirm
  const triggerReveal = useCallback(() => {
    setLightningState('REVEALED');
    soundEffects.playCorrect();

    if (autoPlayAudio && currentCard) {
      setTimeout(() => {
        playCardAudio(currentCard);
      }, 150);
    }
  }, [autoPlayAudio, currentCard, playCardAudio]);

  // 5. Next Card
  const advanceToNextCard = useCallback(() => {
    if (cardQueue.length === 0) return;

    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    setLightningState('READY');

    setCurrentIndex(prev => (prev + 1) % cardQueue.length);
    setStreakCount(s => s + 1);
  }, [cardQueue.length]);

  // 6. Continuous Modes Loop (ACCELERATING / RHYTHMIC)
  useEffect(() => {
    if (!isRunning || (mode !== 'ACCELERATING' && mode !== 'RHYTHMIC')) {
      if (loopTimerRef.current) clearTimeout(loopTimerRef.current);
      return;
    }

    const interval = mode === 'ACCELERATING' ? acceleratingSpeed : rhythmTempo;

    loopTimerRef.current = setTimeout(() => {
      soundEffects.playTick();
      const next = (currentIndexRef.current + 1) % cardQueue.length;
      setCurrentIndex(next);

      if (autoPlayAudio && cardQueue[next]) {
        playCardAudio(cardQueue[next]);
      }
      setStreakCount(s => s + 1);

      // Accelerate speed if in ACCELERATING mode
      if (mode === 'ACCELERATING') {
        if (acceleratingSpeed > 450) {
          soundEffects.playOvertake();
        }
        setAcceleratingSpeed(prevSpeed => {
          if (prevSpeed > 450) {
            return Math.max(400, prevSpeed - 100);
          }
          return prevSpeed;
        });
      }
    }, interval);

    return () => {
      if (loopTimerRef.current) clearTimeout(loopTimerRef.current);
    };
  }, [isRunning, mode, acceleratingSpeed, rhythmTempo, cardQueue, autoPlayAudio, playCardAudio]);

  // 7. Master Spacebar / Clicker Action
  const handlePrimaryClickerAction = useCallback(() => {
    if (mode === 'LIGHTNING') {
      if (lightningState === 'READY') {
        triggerLightningFlash();
      } else if (lightningState === 'FLASHING') {
        if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
        setLightningState('GUESSED');
      } else if (lightningState === 'GUESSED') {
        triggerReveal();
      } else if (lightningState === 'REVEALED') {
        advanceToNextCard();
      }
    } else if (mode === 'MANUAL') {
      advanceToNextCard();
      if (autoPlayAudio && cardQueue[(currentIndex + 1) % cardQueue.length]) {
        playCardAudio(cardQueue[(currentIndex + 1) % cardQueue.length]);
      }
    } else if (mode === 'ACCELERATING' || mode === 'RHYTHMIC') {
      setIsRunning(r => !r);
    }
  }, [
    mode,
    lightningState,
    triggerLightningFlash,
    triggerReveal,
    advanceToNextCard,
    autoPlayAudio,
    cardQueue,
    currentIndex,
    playCardAudio
  ]);

  // 8. Keyboard & Wireless Presentation Clicker Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA') return;

      if (
        ['Space', 'Enter', 'PageDown', 'ArrowRight', 'ArrowDown'].includes(e.code) ||
        [' ', 'Enter', 'PageDown', 'ArrowRight', 'ArrowDown'].includes(e.key)
      ) {
        e.preventDefault();
        handlePrimaryClickerAction();
        return;
      }

      if (
        ['KeyR', 'PageUp', 'ArrowLeft', 'ArrowUp'].includes(e.code) ||
        ['r', 'R', 'PageUp', 'ArrowLeft', 'ArrowUp'].includes(e.key)
      ) {
        e.preventDefault();
        if (currentCard) {
          playCardAudio(currentCard);
        }
        return;
      }

      if (e.code === 'KeyF' || e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        if (mode === 'LIGHTNING') {
          triggerLightningFlash();
        }
        return;
      }

      if (e.code === 'KeyS' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        if (mode === 'LIGHTNING') {
          triggerSlowReplay();
        }
        return;
      }

      if (e.key === ',' || e.key === 'o' || e.key === 'O') {
        e.preventDefault();
        setIsSettingsOpen(prev => !prev);
        return;
      }

      if (mode === 'LIGHTNING') {
        if (['Digit1', 'Numpad1'].includes(e.code) || e.key === '1') setLightningSpeed(100);
        if (['Digit2', 'Numpad2'].includes(e.code) || e.key === '2') setLightningSpeed(250);
        if (['Digit3', 'Numpad3'].includes(e.code) || e.key === '3') setLightningSpeed(500);
        if (['Digit4', 'Numpad4'].includes(e.code) || e.key === '4') setLightningSpeed(1000);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrimaryClickerAction, currentCard, triggerLightningFlash, triggerSlowReplay, mode, playCardAudio]);

  if (!currentCard) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-white text-center">
        <p className="text-xl font-bold">{t("Loading card queue...", "カードデータを読み込み中...")}</p>
      </div>
    );
  }

  const isFlashing = lightningState === 'FLASHING';
  const isRevealed = lightningState === 'REVEALED';
  const isWordConcealed = mode === 'LIGHTNING' && !isRevealed;

  // Dynamic font sizing for English word in vocabulary tower
  const getEnglishSizeClass = (text: string) => {
    const clean = text.trim();
    const len = clean.length;
    const tokens = clean.split(/\s+/);
    const maxTokenLen = Math.max(...tokens.map(t => t.length));

    // Long phrases or words with unbroken 12+ char tokens (e.g. "school principal's office", "take out the garbage", "weightlifting")
    if (maxTokenLen >= 12 || len >= 21) {
      return 'text-2xl sm:text-3xl lg:text-4xl leading-tight';
    }
    // Medium-long phrases (e.g. "leave my house", "fireworks festival")
    if (maxTokenLen >= 9 || len >= 15) {
      return 'text-3xl sm:text-4xl lg:text-5xl leading-tight';
    }
    // Medium phrases / compound words (e.g. "walk the dog", "basketball")
    if (maxTokenLen >= 7 || len >= 9) {
      return 'text-4xl sm:text-5xl lg:text-6xl leading-tight';
    }
    // Short words (6–8 chars: "banana", "summer", "orange")
    if (len >= 6) {
      return 'text-5xl sm:text-6xl lg:text-7xl leading-none';
    }
    // Ultra-short words (1–5 chars: "have", "dog", "sheep", "apple", "red") - Maximum TV visibility!
    return 'text-6xl sm:text-7xl lg:text-8xl leading-none';
  };

  // Dynamic font sizing for Katakana pronunciation badge
  const getKatakanaSizeClass = (kanaText: string) => {
    const len = kanaText.length;
    if (len >= 14) return 'text-[11px] sm:text-xs font-black tracking-tighter';
    if (len >= 10) return 'text-xs sm:text-sm font-black tracking-tight';
    if (len >= 6) return 'text-sm sm:text-base font-black';
    return 'text-base sm:text-lg font-black';
  };

  // Dynamic font & ruby sizing for Japanese translation
  const getJapaneseClasses = (card: VocabularyItem) => {
    const text = (card.ja_kanji || card.ja_hiragana || '').trim();
    const len = text.length;

    // 10+ chars (e.g. "テレビゲームをすること", "ランドセルを確かめる")
    if (len >= 10) {
      return {
        base: 'text-xl sm:text-2xl md:text-3xl font-black text-slate-800 dark:text-slate-100',
        rt: 'text-[9px] sm:text-[10px] font-bold text-sky-600 dark:text-sky-300 select-none'
      };
    }
    // 7–9 chars (e.g. "犬の散歩をする", "スーパーマーケット")
    if (len >= 7) {
      return {
        base: 'text-2xl sm:text-3xl md:text-4xl font-black text-slate-800 dark:text-slate-100',
        rt: 'text-[10px] sm:text-xs font-bold text-sky-600 dark:text-sky-300 select-none'
      };
    }
    // 4–6 chars (e.g. "持っている", "ごみを出す", "家を出る")
    if (len >= 4) {
      return {
        base: 'text-3xl sm:text-4xl md:text-5xl font-black text-slate-800 dark:text-slate-100',
        rt: 'text-xs sm:text-sm font-bold text-sky-600 dark:text-sky-300 select-none'
      };
    }
    // 1–3 chars (e.g. "犬", "本", "赤", "車", "走る") - Ultra prominent
    return {
      base: 'text-4xl sm:text-5xl md:text-6xl font-black text-slate-800 dark:text-slate-100',
      rt: 'text-xs sm:text-base font-bold text-sky-600 dark:text-sky-300 select-none'
    };
  };

  return (
    <div className="w-full h-full flex-1 min-h-0 flex flex-col md:flex-row items-stretch justify-between gap-3 p-1 sm:p-2 select-none relative overflow-hidden">
      {/* =========================================================================
          LEFT ZONE: CONTROL & VOCABULARY TOWER (Teacher Stand Position)
          Placed on the left side where the teacher stands in the classroom!
         ========================================================================= */}
      <div className="w-full md:w-[360px] lg:w-[420px] xl:w-[460px] shrink-0 h-full flex flex-col justify-between gap-2.5 order-2 md:order-1">
        {/* --- 1. TOP HEADER STRIP: Title, Counter & Settings --- */}
        <div className="bg-white dark:bg-slate-900/95 p-2.5 sm:p-3 rounded-2xl border border-rose-200 dark:border-slate-800 shadow-md flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {onExit && (
              <button
                onClick={onExit}
                className="px-2 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 text-slate-600 dark:text-slate-300 font-bold text-xs flex items-center gap-1 transition cursor-pointer shrink-0"
              >
                <ChevronLeft size={14} />
                <span>{t("Back", "もどる")}</span>
              </button>
            )}
            <div className="flex items-center gap-1.5 min-w-0">
              <h2 className="text-sm sm:text-base font-black text-rose-900 dark:text-rose-300 tracking-wide flex items-center gap-1.5 truncate">
                <span>⚡ {t("Speed Flash", <>スピードフラッシュ</>)}</span>
              </h2>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 shrink-0">
                {currentIndex + 1} / {cardQueue.length}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => { playPop(); setupQueue(); }}
              className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 transition cursor-pointer"
              title={t("Shuffle and restart queue", "シャッフルして最初から")}
            >
              <RotateCcw size={14} />
            </button>
            <button
              onClick={() => { playPop(); setIsSettingsOpen(true); }}
              className="px-2 py-1 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-700 dark:text-rose-300 border border-rose-400/40 font-black text-xs flex items-center gap-1 transition cursor-pointer active:scale-95 shadow-xs"
              title={t("Game Settings", "設定")}
            >
              <Settings size={13} />
              <span className="hidden xs:inline">{t("Settings", <><ruby>設定<rt className="text-[7px]">せってい</rt></ruby></>)}</span>
            </button>
          </div>
        </div>

        {/* --- 2. VOCABULARY & CHORAL REPETITION CARD --- */}
        <div className="flex-1 min-h-0 bg-slate-50/95 dark:bg-slate-900/95 border-2 border-rose-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl flex flex-col justify-between">
          {/* Top of Card: Choral Repetition Callout & Audio Button */}
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 dark:border-slate-800 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-2xl animate-bounce">🗣️</span>
              <div>
                <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 block leading-tight">
                  {t("Choral Speaking", "みんなでリピート！")}
                </span>
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  {t("Repeat after teacher!", "大きな声で言ってみよう！")}
                </span>
              </div>
            </div>

            <button
              onClick={() => playCardAudio(currentCard)}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500 text-white flex items-center justify-center shadow-lg transition-transform active:scale-90 cursor-pointer shrink-0"
              title={t("Listen to pronunciation (R)", "発音を聞く (R)")}
            >
              <Volume2 size={20} />
            </button>
          </div>

          {/* Center of Card: English Word & Katakana */}
          <div className="my-auto py-3 sm:py-5 flex flex-col items-center justify-center text-center space-y-2">
            {isWordConcealed ? (
              <div className="flex flex-col items-center gap-2 py-4">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-amber-400 text-amber-950 flex items-center justify-center font-black text-3xl shadow-lg animate-bounce">
                  ?
                </div>
                <span className="text-base sm:text-lg font-black text-amber-600 dark:text-amber-400">
                  {tier === 'word_only'
                    ? t("What word did you see?", <>なんの単語が見えた？</>)
                    : t("What did you see?", <>なにが見えた？</>)}
                </span>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  {t("Shout it out in English!", <>えいごで言ってみよう！</>)}
                </span>
              </div>
            ) : (
              <>
                <h2 className={`${getEnglishSizeClass(currentCard.english)} font-black text-slate-900 dark:text-white tracking-tight break-words max-w-full drop-shadow-xs`}>
                  {currentCard.english}
                </h2>

                {currentCard.en_katakana && (
                  <span className={`${getKatakanaSizeClass(currentCard.en_katakana)} px-3 py-1 rounded-xl bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-700/80 text-amber-900 dark:text-amber-300 shadow-xs`}>
                    【{currentCard.en_katakana}】
                  </span>
                )}
              </>
            )}
          </div>

          {/* Bottom of Card: Japanese Meaning with High-Contrast Furigana */}
          <div className="pt-2.5 border-t border-slate-200 dark:border-slate-800 text-center shrink-0 min-h-[52px] sm:min-h-[60px] flex items-center justify-center">
            {isWordConcealed ? (
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500">
                {t("Reveal to see translation", "答えをオープンして確認")}
              </span>
            ) : (() => {
              const jp = getJapaneseClasses(currentCard);
              return (
                <RubyText
                  ruby={currentCard.ruby}
                  kanji={currentCard.ja_kanji}
                  hiragana={currentCard.ja_hiragana}
                  className={jp.base}
                  rtClassName={jp.rt}
                />
              );
            })()}
          </div>
        </div>

        {/* --- 3. BOTTOM ACTION CONTROLS & SHORTCUT GUIDE --- */}
        <div className="bg-white dark:bg-slate-900/95 p-3 rounded-2xl border border-rose-200 dark:border-slate-800 shadow-md space-y-2 shrink-0">
          {/* Status Message */}
          <div className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5 truncate">
              <span className={`w-2 h-2 rounded-full shrink-0 ${isFlashing ? 'bg-amber-400 animate-ping' : isRevealed ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`} />
              <span>
                {mode === 'LIGHTNING'
                  ? lightningState === 'READY'
                    ? t("Press [Space] to Flash!", "フラッシュしよう！")
                    : lightningState === 'GUESSED'
                    ? t("Press [Space] to Reveal!", "答えをオープン！")
                    : t("Press [Space] for Next Card →", "次のカードへ！")
                  : mode === 'ACCELERATING'
                  ? t(`Speed: ${acceleratingSpeed}ms`, `速度: ${acceleratingSpeed}ms`)
                  : mode === 'RHYTHMIC'
                  ? t(`Tempo: ${rhythmTempo}ms`, `テンポ: ${rhythmTempo}ms`)
                  : t("Teacher Clicker", "先生操作")}
              </span>
            </span>
          </div>

          {/* Secondary Action Buttons (Flash Again / Slow Peek) in Lightning Mode */}
          {mode === 'LIGHTNING' && (
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => triggerLightningFlash()}
                className="py-1.5 px-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-black text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center gap-1"
                title={t("Flash again (F)", "もう一度フラッシュ (F)")}
              >
                <span>⚡ {t("Flash Again", "もう一度")}</span>
                <kbd className="px-1 py-0.2 rounded bg-black/30 text-[9px] font-mono text-rose-200">F</kbd>
              </button>

              <button
                onClick={triggerSlowReplay}
                className="py-1.5 px-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 font-black text-xs rounded-xl active:scale-95 transition cursor-pointer flex items-center justify-center gap-1"
                title={t("Slow peek 1.2s (S)", "ゆっくり見る 1.2秒 (S)")}
              >
                <span>🐢 {t("Slow Peek", "ゆっくり")}</span>
                <kbd className="px-1 py-0.2 rounded bg-black/20 dark:bg-black/40 text-[9px] font-mono text-slate-500 dark:text-slate-300">S</kbd>
              </button>
            </div>
          )}

          {/* Master Primary Sequence Action Button */}
          {mode === 'LIGHTNING' && (
            <button
              onClick={handlePrimaryClickerAction}
              className={`w-full py-2.5 sm:py-3 active:scale-95 text-white font-black text-sm rounded-xl shadow-lg transition cursor-pointer flex items-center justify-center gap-2 ${
                lightningState === 'READY'
                  ? 'bg-gradient-to-r from-rose-500 to-pink-600 hover:brightness-110'
                  : lightningState === 'GUESSED'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:brightness-110 animate-pulse ring-2 ring-amber-400/50'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:brightness-110'
              }`}
            >
              <span>
                {lightningState === 'READY'
                  ? t("⚡ Flash! (Space)", "⚡ フラッシュ！ (Space)")
                  : lightningState === 'GUESSED'
                  ? t("👁️ Reveal Answer (Space)", "👁️ 答えをオープン (Space)")
                  : t("👉 Next Card → (Space)", "👉 次のカードへ (Space)")}
              </span>
            </button>
          )}

          {(mode === 'ACCELERATING' || mode === 'RHYTHMIC') && (
            <button
              onClick={() => setIsRunning(r => !r)}
              className={`w-full py-2.5 sm:py-3 rounded-xl text-sm font-black shadow-lg active:scale-95 flex items-center justify-center gap-2 transition cursor-pointer ${
                isRunning
                  ? 'bg-amber-500 hover:bg-amber-600 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {isRunning ? <Pause size={16} /> : <Play size={16} />}
              <span>
                {isRunning
                  ? t("Pause (Space)", "一時停止 (Space)")
                  : t("Start! (Space)", "スタート！ (Space)")}
              </span>
            </button>
          )}

          {mode === 'MANUAL' && (
            <button
              onClick={() => advanceToNextCard()}
              className="w-full py-2.5 sm:py-3 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-black text-sm rounded-xl shadow-lg transition cursor-pointer flex items-center justify-center"
            >
              <span>{t("Next Card → (Space)", "次のカードへ (Space)")}</span>
            </button>
          )}

          {/* Shortcut Legend */}
          <div className="text-[10px] text-slate-400 dark:text-slate-500 text-center pt-0.5 font-mono">
            Space: Next • R: Voice • F: Flash • S: Slow
          </div>
        </div>
      </div>

      {/* =========================================================================
          RIGHT ZONE: FULL-HEIGHT GAME STAGE (Student Visibility Center/Right)
          Facing the students across the classroom!
         ========================================================================= */}
      <div className="flex-1 min-h-0 h-full flex flex-col order-1 md:order-2">
        <FlashcardStage
          card={currentCard}
          tier={tier}
          grade={activeGrade}
          isFlashing={isFlashing}
          isRevealed={isRevealed}
          mode={mode}
          onTriggerFlash={() => triggerLightningFlash()}
        />
      </div>

      {/* Settings Modal Applet */}
      <SpeedFlashSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        mode={mode}
        setMode={setMode}
        tier={tier}
        setTier={setTier}
        lightningSpeed={lightningSpeed}
        setLightningSpeed={setLightningSpeed}
        rhythmTempo={rhythmTempo}
        setRhythmTempo={setRhythmTempo}
        autoPlayAudio={autoPlayAudio}
        setAutoPlayAudio={setAutoPlayAudio}
        activeUnit={activeUnit}
        setActiveUnit={setActiveUnit}
        availableUnits={availableUnits}
        activeGrade={activeGrade}
        onResetQueue={setupQueue}
      />
    </div>
  );
};
