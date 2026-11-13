import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useVocabulary } from '@/context/VocabularyContext';
import { useClassroom } from '@/context/ClassroomContext';
import { useAudio } from '@/context/AudioContext';
import { useLanguage } from '@/context/LanguageContext';
import { useClassroomClicker } from '@/hooks/useClassroomClicker';
import { ClassroomBlackoutShutter } from '@/components/common/ClassroomBlackoutShutter';
import { speechService } from '@/services/speechService';
import { soundEffects } from '@/services/soundEffects';
import { VocabularyItem } from '@data/types';
import { shuffleArray } from '@/utils/cardUtils';
import { BreakerTempo, BeatStep } from './types';
import { rhythmSynthesizer } from './rhythmSynthesizer';
import { KatakanaBreakerStage } from './KatakanaBreakerStage';
import {
  Play,
  Pause,
  RotateCcw,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';

interface KatakanaBreakerGameProps {
  onExit?: () => void;
}

export const KatakanaBreakerGame: React.FC<KatakanaBreakerGameProps> = () => {
  const { scopedWords, filteredWords, gradeWords, allWords } = useVocabulary();
  const { activeGrade } = useClassroom();
  const { isMuted } = useAudio();
  const { t } = useLanguage();

  // Settings
  const [tempo, setTempo] = useState<BreakerTempo>(104); // 104 BPM standard video tempo
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [voiceIndex, setVoiceIndex] = useState<number>(0); // 0=Jenny, 1=Andrew, 2=Ana
  const [isBlackout, setIsBlackout] = useState<boolean>(false);

  useEffect(() => {
    rhythmSynthesizer.setMuted(isMuted);
  }, [isMuted]);

  // Filter Katakana-biased words from pool
  const rawPool = scopedWords.length >= 4
    ? scopedWords
    : (filteredWords.length >= 4 ? filteredWords : (gradeWords.length >= 4 ? gradeWords : allWords));
  const fallbackPool = gradeWords.length >= 4 ? gradeWords : allWords;

  const katakanaWords = useMemo(() => {
    const list = rawPool.filter((w) => Boolean(w.en_katakana && w.en_katakana.trim().length > 0));
    return list.length >= 4 ? list : rawPool;
  }, [rawPool]);

  // Playlist queue
  const [queue, setQueue] = useState<VocabularyItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [currentStep, setCurrentStep] = useState<BeatStep>('M1_B0_JAPANESE');

  const resetPlaylist = useCallback(() => {
    const shuffled = shuffleArray(katakanaWords.length > 0 ? katakanaWords : fallbackPool);
    setQueue(shuffled);
    setCurrentIndex(0);
    setCurrentStep('M1_B0_JAPANESE');
    setIsPlaying(false);
  }, [katakanaWords, fallbackPool]);

  useEffect(() => {
    resetPlaylist();
  }, [resetPlaylist]);

  const currentCard = queue[currentIndex] || queue[0];
  const englishVoices = ['jenny', 'andrew', 'ana'];
  const activeVoiceKey = englishVoices[voiceIndex % englishVoices.length];

  // Audio Playback Helpers
  const playAudioUrl = useCallback((pathOrFilename?: string) => {
    if (!pathOrFilename || isMuted) return;
    const url = pathOrFilename.startsWith('http') || pathOrFilename.startsWith('/')
      ? pathOrFilename
      : `/media/sound/${pathOrFilename}`;
    const audio = new Audio(url);
    audio.play().catch(() => {});
  }, [isMuted]);

  const playJapaneseWord = useCallback(() => {
    if (!currentCard) return;
    const jaClip = currentCard.audio_suite?.ja || currentCard.sound_file;
    if (jaClip) {
      playAudioUrl(jaClip);
    } else {
      speechService.speak(currentCard.ja_hiragana || currentCard.ja_kanji || currentCard.en_katakana || '', { lang: 'ja', rate: 0.96, pitch: 1.02 });
    }
  }, [currentCard, playAudioUrl]);

  const playJanakutePrompt = useCallback(() => {
    if (isMuted) return;
    const audio = new Audio('/media/sound_suite/common/janakute_nanami.mp3');
    audio.play().catch(() => {
      speechService.speak('じゃなくて？', { lang: 'ja', rate: 0.96, pitch: 1.05 });
    });
  }, [isMuted]);

  const playEnglishWord = useCallback(() => {
    if (!currentCard) return;
    const enClip = currentCard.audio_suite?.[activeVoiceKey] || currentCard.primary_audio || currentCard.sound_file;
    if (enClip) {
      playAudioUrl(enClip);
    } else {
      speechService.speak(currentCard.english, { lang: 'en', rate: 0.94, pitch: 1.04 });
    }
  }, [currentCard, activeVoiceKey, playAudioUrl]);

  // =========================================================================
  // The 16-Beat (4-Measure) Modular Web Audio Scheduler
  // =========================================================================
  const beatIndexRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);

  const triggerBeatEvent = useCallback((beat: number) => {
    const steps: BeatStep[] = [
      'M1_B0_JAPANESE',
      'M1_B1_JAPANESE_HOLD',
      'M1_B2_JANAKUTE',
      'M1_B3_JANAKUTE_HOLD',
      'M2_B4_ENGLISH',
      'M2_B5_ENGLISH_HOLD',
      'M2_B6_PREPARE',
      'M2_B7_INHALE',
      'M3_B8_CHORAL',
      'M3_B9_CHORAL_HOLD',
      'M3_B10_PRAISE',
      'M3_B11_RINGOUT',
      'M4_B12_GROOVE1',
      'M4_B13_GROOVE2',
      'M4_B14_PICKUP1',
      'M4_B15_PICKUP2'
    ];
    const step = steps[beat];
    setCurrentStep(step);

    // --- MEASURE 1: THE CALL ("バナナ じゃなくて？") ---
    if (beat === 0) {
      // Bar 1, Beat 1: Japanese Word ("バナナ") begins
      rhythmSynthesizer.playKick();
      rhythmSynthesizer.playHiHat();
      playJapaneseWord();
    } else if (beat === 1) {
      // Bar 1, Beat 2: Japanese word sustains / groove continues
      rhythmSynthesizer.playSnare();
      rhythmSynthesizer.playHiHat();
    } else if (beat === 2) {
      // Bar 1, Beat 3: "じゃなくて？" (Nanami connector) begins
      rhythmSynthesizer.playKick();
      rhythmSynthesizer.playHiHat();
      playJanakutePrompt();
    } else if (beat === 3) {
      // Bar 1, Beat 4: "じゃなくて？" sustains into Measure 2
      rhythmSynthesizer.playSnare();
      rhythmSynthesizer.playHiHat();
    }

    // --- MEASURE 2: THE ENGLISH MODEL & PREPARATION ---
    else if (beat === 4) {
      // Bar 2, Beat 1: English Model ("banana") begins
      rhythmSynthesizer.playKick();
      rhythmSynthesizer.playHiHat();
      playEnglishWord();
    } else if (beat === 5) {
      // Bar 2, Beat 2: English word sustains & listen
      rhythmSynthesizer.playSnare();
      rhythmSynthesizer.playHiHat();
    } else if (beat === 6) {
      // Bar 2, Beat 3: Absorb & prepare
      rhythmSynthesizer.playKick();
      rhythmSynthesizer.playHiHat();
    } else if (beat === 7) {
      // Bar 2, Beat 4: INHALE! (Snare pickup roll + class breathes in)
      rhythmSynthesizer.playSnare();
      rhythmSynthesizer.playHiHat();
    }

    // --- MEASURE 3: THE CHORAL SHOUT & PRAISE ---
    else if (beat === 8) {
      // Bar 3, Beat 1: CHORAL ECHO! Downbeat explosion (Open hat crash + whole class shouts "banana!")
      rhythmSynthesizer.playKick();
      rhythmSynthesizer.playHiHat(undefined, true);
      soundEffects.playFanfare();
    } else if (beat === 9) {
      // Bar 3, Beat 2: Ringout
      rhythmSynthesizer.playSnare();
      rhythmSynthesizer.playHiHat();
    } else if (beat === 10) {
      // Bar 3, Beat 3: Praise / combo
      rhythmSynthesizer.playKick();
      rhythmSynthesizer.playHiHat();
    } else if (beat === 11) {
      // Bar 3, Beat 4: Measure 3 resolution
      rhythmSynthesizer.playSnare();
      rhythmSynthesizer.playHiHat();
    }

    // --- MEASURE 4: GROOVE BRIDGE & PICKUP ---
    else if (beat === 12) {
      // Bar 4, Beat 1: Groove breakdown
      rhythmSynthesizer.playKick();
      rhythmSynthesizer.playHiHat();
    } else if (beat === 13) {
      // Bar 4, Beat 2: Bouncing banana pickup 1
      rhythmSynthesizer.playSnare();
      rhythmSynthesizer.playBouncePop(720);
    } else if (beat === 14) {
      // Bar 4, Beat 3: Bouncing banana pickup 2
      rhythmSynthesizer.playKick();
      rhythmSynthesizer.playBouncePop(820);
    } else if (beat === 15) {
      // Bar 4, Beat 4: Final pickup beat -> Advance to next word on downbeat!
      rhythmSynthesizer.playSnare();
      rhythmSynthesizer.playBouncePop(920);

      setCurrentIndex((prev) => (prev + 1) % queue.length);
      setVoiceIndex((v) => v + 1); // Alternate voice timbre
    }
  }, [playJapaneseWord, playJanakutePrompt, playEnglishWord, queue.length]);

  // Master Clock Loop
  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      return;
    }

    const msPerBeat = (60 / tempo) * 1000;
    beatIndexRef.current = 0;
    triggerBeatEvent(0);

    timerRef.current = window.setInterval(() => {
      beatIndexRef.current = (beatIndexRef.current + 1) % 16;
      triggerBeatEvent(beatIndexRef.current);
    }, msPerBeat);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, tempo, triggerBeatEvent]);

  // Presenter Clicker shortcuts
  useClassroomClicker({
    onNext: () => {
      setIsPlaying((p) => !p);
    },
    onReplayAudio: () => {
      playJapaneseWord();
    },
    onBlankScreen: () => setIsBlackout((b) => !b)
  });

  return (
    <div className="w-full flex-1 flex flex-col justify-between p-2 sm:p-4 select-none relative font-['UD_Digi_Kyokasho_NP-R','Zen_Maru_Gothic',sans-serif]">
      {/* 1. Header Toolbar */}
      <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-2.5 sm:p-3.5 shadow-md flex flex-nowrap items-center justify-between gap-3 mb-2 shrink-0 overflow-x-auto no-scrollbar whitespace-nowrap">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-orange-500 text-white flex items-center justify-center text-2xl shadow-md shrink-0">
            🍌
          </div>
          <div className="min-w-0">
            <h2 className="text-base sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2 whitespace-nowrap">
              <span>{t('Katakana Breaker Chant', <>バナナじゃなくて <span className="text-amber-500">banana</span></>)}</span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 shrink-0">
                104 BPM Groove
              </span>
            </h2>
          </div>
        </div>

        {/* Controls: Tempo & Reset */}
        <div className="flex flex-nowrap items-center gap-2 shrink-0">
          {/* Tempo Selector */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700">
            <span className="text-slate-600 dark:text-slate-300 px-1.5">{t('Tempo:', 'テンポ:')}</span>
            {[88, 104, 118].map((bpm) => (
              <button
                key={bpm}
                type="button"
                onClick={() => setTempo(bpm as BreakerTempo)}
                className={`px-2 py-0.5 rounded-lg font-black transition-all cursor-pointer ${
                  tempo === bpm ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-500'
                }`}
              >
                {bpm === 104 ? `${bpm} (標準)` : bpm}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={resetPlaylist}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 transition cursor-pointer shrink-0"
            title="Reset Playlist"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </div>

      {/* 2. Main Stage Display */}
      {currentCard && (
        <KatakanaBreakerStage
          card={currentCard}
          grade={activeGrade}
          step={currentStep}
          englishVoiceName={activeVoiceKey.toUpperCase()}
          onPlayJapaneseAudio={playJapaneseWord}
          onPlayEnglishAudio={playEnglishWord}
        />
      )}

      {/* 3. Bottom Transport Bar */}
      <div className="mt-2.5 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-lg flex flex-nowrap items-center justify-between gap-3 shrink-0 overflow-x-auto no-scrollbar whitespace-nowrap">
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              setCurrentIndex((prev) => (prev - 1 + queue.length) % queue.length);
            }}
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition active:scale-95 cursor-pointer"
            title="Previous Word"
          >
            <ChevronLeft size={20} />
          </button>

          <button
            type="button"
            onClick={() => setIsPlaying((p) => !p)}
            className={`px-6 py-2.5 sm:px-8 sm:py-3 rounded-2xl font-black text-sm sm:text-base text-white shadow-xl transition-all flex items-center gap-2 cursor-pointer active:scale-95 ${
              isPlaying
                ? 'bg-rose-500 hover:bg-rose-600'
                : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-emerald-500/25'
            }`}
          >
            {isPlaying ? <Pause size={18} fill="white" /> : <Play size={18} fill="white" />}
            <span>{isPlaying ? t('PAUSE (Space)', 'ストップ [Space]') : t('START CHANT! (Space)', <><ruby>チャンツ開始<rt>かいし</rt></ruby>！ [Space]</>)}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setCurrentIndex((prev) => (prev + 1) % queue.length);
            }}
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition active:scale-95 cursor-pointer"
            title="Next Word"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Word Counter */}
        <div className="text-right shrink-0">
          <span className="text-xs font-black text-slate-500 dark:text-slate-400 font-mono">
            {currentIndex + 1} / {queue.length}
          </span>
          <span className="text-[10px] text-slate-600 dark:text-slate-300 block font-bold">
            {t('Presenter: Spacebar to toggle rhythm', <>クリック<ruby>操作<rt>そうさ</rt></ruby>: スペースキーで<ruby>開始<rt>かいし</rt></ruby>/<ruby>停止<rt>ていし</rt></ruby></>)}
          </span>
        </div>
      </div>

      {/* Emergency Blackout Shutter */}
      <ClassroomBlackoutShutter isOpen={isBlackout} onToggle={() => setIsBlackout((b) => !b)} />
    </div>
  );
};
