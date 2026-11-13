import React, { useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { useVocabulary } from '@/context/VocabularyContext';
import { useClassroom } from '@/context/ClassroomContext';
import { useAudio } from '@/context/AudioContext';
import { soundEffects } from '@/services/soundEffects';
import { useLanguage } from '@/context/LanguageContext';
import { useClassroomClicker } from '@/hooks/useClassroomClicker';
import { ClassroomBlackoutShutter } from '@/components/common/ClassroomBlackoutShutter';
import { sampleCards, shuffleArray } from '@/utils/cardUtils';
import { VocabularyItem } from '@data/types';
import { SprintDuration, MicSensitivity, GamePhase } from './types';
import { useVoiceEnergyMeter } from './useVoiceEnergyMeter';
import { VoiceEnergyMeter } from './VoiceEnergyMeter';
import { SprintStage } from './SprintStage';
import {
  Timer,
  Play,
  RotateCcw,
  CheckCircle2
} from 'lucide-react';

interface Challenge60sGameProps {
  onExit?: () => void;
}

export const Challenge60sGame: React.FC<Challenge60sGameProps> = () => {
  const { scopedWords, filteredWords, gradeWords, allWords } = useVocabulary();
  const { activeGrade } = useClassroom();
  const { playWordAudio } = useAudio();
  const { t } = useLanguage();

  // Settings
  const [durationSec, setDurationSec] = useState<SprintDuration>(60);
  const [micSensitivity, setMicSensitivity] = useState<MicSensitivity>('APARTMENT');
  const [useMic] = useState<boolean>(true);

  const SENSITIVITIES: MicSensitivity[] = ['APARTMENT', 'HIGH', 'NORMAL', 'CLASSROOM_LOUD'];
  const handleCycleSensitivity = useCallback(() => {
    setMicSensitivity((prev) => {
      const idx = SENSITIVITIES.indexOf(prev);
      return SENSITIVITIES[(idx + 1) % SENSITIVITIES.length];
    });
  }, []);

  // Microphone Hook
  const { energy, isLoud, isMicActive, startMic, stopMic } = useVoiceEnergyMeter(micSensitivity, useMic);

  // Game States
  const [phase, setPhase] = useState<GamePhase>('READY');
  const [timeLeftMs, setTimeLeftMs] = useState<number>(60 * 1000);
  const [cardQueue, setCardQueue] = useState<VocabularyItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [wordsCleared, setWordsCleared] = useState<number>(0);
  const [combo, setCombo] = useState<number>(0);
  const [maxCombo, setMaxCombo] = useState<number>(0);
  const [loudBonuses, setLoudBonuses] = useState<number>(0);
  const [isBlackout, setIsBlackout] = useState<boolean>(false);

  // Vocabulary Pool
  const rawPool = scopedWords.length >= 4
    ? scopedWords
    : (filteredWords.length >= 4 ? filteredWords : (gradeWords.length >= 4 ? gradeWords : allWords));
  const fallbackPool = gradeWords.length >= 4 ? gradeWords : allWords;

  // Replenish Queue
  const replenishQueue = useCallback(() => {
    const sampled = sampleCards(rawPool, 30, fallbackPool);
    setCardQueue(shuffleArray(sampled));
    setCurrentIndex(0);
  }, [rawPool, fallbackPool]);

  // Setup / Reset
  const handleReset = useCallback(() => {
    replenishQueue();
    setTimeLeftMs(durationSec * 1000);
    setWordsCleared(0);
    setCombo(0);
    setMaxCombo(0);
    setLoudBonuses(0);
    setPhase('READY');
  }, [durationSec, replenishQueue]);

  useEffect(() => {
    handleReset();
  }, [handleReset]);

  // Start Sprint
  const handleStartSprint = async () => {
    if (useMic && !isMicActive) {
      await startMic();
    }
    soundEffects.playRaceCountdownBeep(true);
    setTimeLeftMs(durationSec * 1000);
    setPhase('RUNNING');
  };

  // Clicker / Teacher Spacebar Approval (0ms latency next card)
  const handleApproveWord = useCallback(() => {
    if (phase !== 'RUNNING') return;

    soundEffects.playCorrect();
    const newCleared = wordsCleared + 1;
    const newCombo = combo + 1;
    setWordsCleared(newCleared);
    setCombo(newCombo);
    if (newCombo > maxCombo) setMaxCombo(newCombo);

    // If microphone detected loud choral chanting at the moment of approval: Bonus!
    if (isLoud) {
      setLoudBonuses((b) => b + 1);
      soundEffects.playOvertake();
    }

    // Advance to next card
    if (currentIndex + 1 >= cardQueue.length) {
      // Loop or re-shuffle
      const moreCards = sampleCards(rawPool, 20, fallbackPool);
      setCardQueue((prev) => [...prev, ...shuffleArray(moreCards)]);
    }
    setCurrentIndex((i) => i + 1);
  }, [phase, wordsCleared, combo, maxCombo, isLoud, currentIndex, cardQueue.length, rawPool, fallbackPool]);

  // Timer Tick
  useEffect(() => {
    if (phase !== 'RUNNING') return;

    const interval = 100;
    const timer = setInterval(() => {
      setTimeLeftMs((prev) => {
        if (prev <= 100) {
          clearInterval(timer);
          setPhase('COMPLETED');
          soundEffects.playFanfare();
          confetti({ particleCount: 140, spread: 90 });
          return 0;
        }
        if (prev <= 5000 && prev % 1000 < 100) {
          soundEffects.playUrgencyTick();
        }
        return prev - 100;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [phase]);

  const currentCard = cardQueue[currentIndex] || cardQueue[0];

  const handlePlayAudio = () => {
    if (currentCard) {
      playWordAudio(currentCard.sound_file || currentCard.primary_audio, currentCard.english);
    }
  };

  // Clicker Integration
  useClassroomClicker({
    onNext: () => {
      if (phase === 'READY') handleStartSprint();
      else if (phase === 'RUNNING') handleApproveWord();
      else if (phase === 'COMPLETED') handleReset();
    },
    onReplayAudio: handlePlayAudio,
    onTogglePause: () => {
      if (phase === 'RUNNING') setPhase('PAUSED');
      else if (phase === 'PAUSED') setPhase('RUNNING');
    },
    onBlankScreen: () => setIsBlackout((b) => !b)
  });

  const secondsLeft = Math.ceil(timeLeftMs / 1000);
  const totalScore = wordsCleared * 100 + loudBonuses * 50 + maxCombo * 20;

  return (
    <div className="w-full flex-1 flex flex-col justify-between p-2 sm:p-4 select-none relative font-['UD_Digi_Kyokasho_NP-R','Zen_Maru_Gothic',sans-serif]">
      {/* 1. Header Bar */}
      <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-2.5 sm:p-3.5 shadow-md flex flex-nowrap items-center justify-between gap-2.5 mb-2 shrink-0 overflow-x-auto no-scrollbar whitespace-nowrap">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-500 text-white flex items-center justify-center text-xl shadow-md shrink-0">
            ⚡
          </div>
          <div className="min-w-0">
            <h2 className="text-base sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2 whitespace-nowrap">
              <span>{t('60-Second Class Sprint', <>60<ruby>秒<rt>びょう</rt></ruby>クラスチャレンジ</>)}</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 shrink-0">
                Stream 🅰️ TV
              </span>
            </h2>
          </div>
        </div>

        {/* Center: Live Stopwatch LCD */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className={`px-4 py-1.5 rounded-2xl font-mono font-black text-xl sm:text-2xl shadow-inner border flex items-center gap-2 ${
            secondsLeft <= 10 && phase === 'RUNNING'
              ? 'bg-rose-600 text-white border-rose-400 animate-pulse'
              : 'bg-slate-900 text-emerald-400 border-slate-800'
          }`}>
            <Timer size={18} />
            <span>{(timeLeftMs / 1000).toFixed(1)}s</span>
          </div>

          <span className="text-xs font-black font-mono px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            {wordsCleared} {t('Cleared', <><ruby>語<rt>ご</rt></ruby><ruby>突破<rt>とっぱ</rt></ruby></>)}
          </span>
        </div>

        {/* Right Controls: Duration & Reset */}
        <div className="flex items-center gap-2 shrink-0">
          {phase === 'READY' && (
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700">
              {[30, 45, 60, 90].map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => setDurationSec(sec as SprintDuration)}
                  className={`px-2 py-0.5 rounded-lg font-black transition-all cursor-pointer ${
                    durationSec === sec ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-500'
                  }`}
                >
                  {sec}s
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={handleReset}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 transition cursor-pointer shrink-0"
            title="Reset"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </div>

      {/* 2. Main Sprint Display */}
      <div className="flex-1 flex flex-col justify-between my-1 min-h-0">
        {phase === 'COMPLETED' ? (
          /* Results Celebration Screen (2-Column Landscape) */
          <div className="flex-1 bg-white dark:bg-slate-900 border-4 border-amber-400 dark:border-amber-500 rounded-3xl p-5 sm:p-8 shadow-2xl grid grid-cols-1 md:grid-cols-12 gap-6 items-center animate-in zoom-in-95 duration-200">
            <div className="md:col-span-6 flex flex-col items-center md:items-start text-center md:text-left">
              <span className="text-6xl sm:text-7xl mb-2 animate-bounce">🏆</span>
              <span className="text-xs font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">
                TIME UP! • SPRINT COMPLETE
              </span>
              <h3 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white my-1.5">
                {wordsCleared} {t('Words Mastered!', <><ruby>単語<rt>たんご</rt></ruby>クリア！</>)}
              </h3>
              <p className="text-sm sm:text-base font-bold text-slate-600 dark:text-slate-300">
                {t('Outstanding team fluency and energetic chanting!', 'クラス全員で大きな声を出して記録を達成しました！')}
              </p>
            </div>

            <div className="md:col-span-6 flex flex-col justify-center gap-4">
              <div className="grid grid-cols-3 gap-3 w-full text-center">
                <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block">{t('MAX COMBO', '最大連鎖')}</span>
                  <span className="text-2xl sm:text-3xl font-black text-amber-500 font-mono">x{maxCombo}</span>
                </div>
                <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block">{t('VOICE BOOSTS', '大声ボーナス')}</span>
                  <span className="text-2xl sm:text-3xl font-black text-rose-500 font-mono">{loudBonuses}</span>
                </div>
                <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block">{t('TOTAL SCORE', '合計得点')}</span>
                  <span className="text-2xl sm:text-3xl font-black text-emerald-500 font-mono">{totalScore}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleReset}
                className="w-full px-8 py-4 rounded-2xl bg-gradient-to-r from-rose-500 to-amber-500 text-white font-black text-base shadow-xl hover:scale-[1.02] active:scale-95 transition cursor-pointer"
              >
                🔄 {t('Challenge Again! (Space)', <>もう<ruby>一度<rt>いちど</rt></ruby>チャレンジ！ [Space]</>)}
              </button>
            </div>
          </div>
        ) : phase === 'READY' ? (
          /* Ready Screen (2-Column Landscape) */
          <div className="flex-1 bg-white dark:bg-slate-900 border-4 border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-8 shadow-2xl grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            <div className="md:col-span-7 flex flex-col items-center md:items-start text-center md:text-left">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-rose-500 to-amber-500 text-white flex items-center justify-center text-4xl shadow-xl animate-pulse mb-3">
                ⚡
              </div>
              <h3 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white mb-2">
                {t('Ready for the 60-Second Sprint?', <>60<ruby>秒<rt>びょう</rt></ruby>スプリントに<ruby>挑戦<rt>ちょうせん</rt></ruby>！</>)}
              </h3>
              <p className="text-sm sm:text-base font-bold text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
                {t(
                  'Cards flash rapidly. The entire class shouts the English word together! The teacher presses Spacebar to approve and advance!',
                  <>カードが<ruby>次々<rt>つぎつぎ</rt></ruby>と<ruby>現<rt>あらわ</rt></ruby>れます！クラス<ruby>全員<rt>ぜんいん</rt></ruby>で<ruby>元気に<rt>げんきに</rt></ruby><ruby>英語<rt>えいご</rt></ruby>を<ruby>発音<rt>はつおん</rt></ruby>しよう！</>
                )}
              </p>
            </div>

            <div className="md:col-span-5 flex flex-col items-stretch gap-4 bg-slate-50 dark:bg-slate-800/70 rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between text-xs font-black text-slate-600 dark:text-slate-300">
                <span>⏱️ {t('Sprint Duration', <>チャレンジ<ruby>時間<rt>じかん</rt></ruby></>)}</span>
                <span className="font-mono text-rose-600 dark:text-rose-400">{durationSec}s</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[30, 45, 60, 90].map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setDurationSec(sec as SprintDuration)}
                    className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                      durationSec === sec
                        ? 'bg-rose-600 text-white border-rose-500 shadow-sm'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {sec}s
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={handleStartSprint}
                className="w-full px-8 py-4 rounded-2xl bg-gradient-to-r from-rose-500 via-orange-500 to-amber-500 hover:brightness-110 text-white font-black text-xl shadow-xl hover:scale-[1.02] active:scale-95 transition flex items-center justify-center gap-3 cursor-pointer"
              >
                <Play size={24} fill="currentColor" />
                <span>{t('START SPRINT! (Space)', <>スタート！ [Space]</>)}</span>
              </button>
            </div>
          </div>
        ) : (
          /* Active Flashcard Stage */
          currentCard && (
            <SprintStage
              card={currentCard}
              grade={activeGrade}
              combo={combo}
              isVoiceBoostActive={isLoud}
              onPlayAudio={handlePlayAudio}
            />
          )
        )}
      </div>

      {/* 3. Bottom Control & Voice Power Gauge */}
      <div className="mt-2 grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-3 items-center">
        {/* Left: Arcade Voltage Gauge (8 cols) */}
        <div className="sm:col-span-8">
          <VoiceEnergyMeter
            energy={energy}
            isLoud={isLoud}
            isMicActive={isMicActive}
            sensitivity={micSensitivity}
            onToggleMic={isMicActive ? stopMic : startMic}
            onCycleSensitivity={handleCycleSensitivity}
          />
        </div>

        {/* Right: Master Spacebar Approval Trigger (4 cols) */}
        <div className="sm:col-span-4">
          <button
            type="button"
            disabled={phase !== 'RUNNING'}
            onClick={handleApproveWord}
            className={`w-full py-3 sm:py-3.5 rounded-2xl font-black text-sm sm:text-base text-white shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 ${
              phase === 'RUNNING'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-emerald-500/30 ring-2 ring-emerald-300'
                : 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <CheckCircle2 size={18} />
            <span>{t('NEXT CARD! [Space]', <>できた！<ruby>次<rt>つぎ</rt></ruby>へ [Space]</>)}</span>
          </button>
        </div>
      </div>

      {/* Emergency Blackout Shutter */}
      <ClassroomBlackoutShutter isOpen={isBlackout} onToggle={() => setIsBlackout((b) => !b)} />
    </div>
  );
};
