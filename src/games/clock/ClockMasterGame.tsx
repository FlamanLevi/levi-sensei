import React, { useState, useEffect, useCallback, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { useClassroom } from '@/context/ClassroomContext';
import { useLanguage } from '@/context/LanguageContext';
import { useAudio } from '@/context/AudioContext';
import { soundEffects } from '@/services/soundEffects';
import { speechService } from '@/services/speechService';
import { AnalogClock } from './AnalogClock';
import { DigitalClock } from './DigitalClock';
import {
  ClockDisplayType,
  DigitalStyle,
  TimeResolution,
  ClockGameMode,
  DAILY_ROUTINES,
  RoutineActivity
} from './types';
import {
  Volume2,
  RotateCcw,
  Sparkles,
  ChevronRight,
  Sun,
  Moon,
  CheckCircle2,
  HelpCircle,
  Clock,
  Play,
  Tv,
  Smartphone,
  Eye,
  Sliders
} from 'lucide-react';

interface ClockMasterGameProps {
  onExit?: () => void;
}

export const ClockMasterGame: React.FC<ClockMasterGameProps> = ({ onExit }) => {
  const { theme, toggleTheme } = useClassroom();
  const { language } = useLanguage();
  const { playPop } = useAudio();

  // Local Dual-Language State (§10 Invariant)
  const [textLang, setTextLang] = useState<'en' | 'ja'>(language);
  const [voiceLang, setVoiceLang] = useState<'en' | 'ja'>('en');
  const [isVoiceEnabled, setIsVoiceEnabled] = useState<boolean>(true);

  // Clock Display & Theme Configuration
  const [displayType, setDisplayType] = useState<ClockDisplayType>('SPLIT');
  const [digitalStyle, setDigitalStyle] = useState<DigitalStyle>('RETRO_LCD');
  const [resolution, setResolution] = useState<TimeResolution>(5); // 60, 30, 15, 5, 1
  const [gameMode, setGameMode] = useState<ClockGameMode>('DAILY_ROUTINE');

  // Clock Values
  const [hour, setHour] = useState<number>(7);
  const [minute, setMinute] = useState<number>(0);
  const [period, setPeriod] = useState<'a.m.' | 'p.m.'>('a.m.');

  // Quiz / Practice State
  const [targetRoutine, setTargetRoutine] = useState<RoutineActivity>(DAILY_ROUTINES[1]); // Breakfast 7:00
  const [score, setScore] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [feedback, setFeedback] = useState<'CORRECT' | 'WRONG' | null>(null);

  // Helper for Furigana Translation
  const t = useCallback((en: React.ReactNode, ja: React.ReactNode) => {
    return textLang === 'ja' ? ja : en;
  }, [textLang]);

  // Read Time Aloud using Speech Synthesis
  const speakTime = useCallback((h: number, m: number, p: 'a.m.' | 'p.m.') => {
    if (!isVoiceEnabled) return;

    let text = '';
    if (voiceLang === 'ja') {
      const pJa = p === 'a.m.' ? '午前' : '午後';
      text = `${pJa} ${h}時 ${m === 0 ? 'ちょうど' : `${m}分`} です。`;
    } else {
      if (m === 0) {
        text = `It's ${h} o'clock ${p === 'a.m.' ? 'A M' : 'P M'}.`;
      } else if (m === 15) {
        text = `It's a quarter past ${h} ${p === 'a.m.' ? 'A M' : 'P M'}.`;
      } else if (m === 30) {
        text = `It's half past ${h}.`;
      } else if (m === 45) {
        text = `It's a quarter to ${h === 12 ? 1 : h + 1}.`;
      } else {
        const mStr = m < 10 ? `oh ${m}` : `${m}`;
        text = `It's ${h} ${mStr} ${p === 'a.m.' ? 'A M' : 'P M'}.`;
      }
    }

    speechService.speak(text, {
      lang: voiceLang === 'ja' ? 'ja-JP' : 'en-US',
      rate: 0.88,
      pitch: 1.02
    });
  }, [isVoiceEnabled, voiceLang]);

  // Randomize Time according to resolution
  const rollRandomTime = useCallback(() => {
    playPop();
    const newHour = Math.floor(Math.random() * 12) + 1;
    let allowedMinutes: number[] = [];
    if (resolution === 60) allowedMinutes = [0];
    else if (resolution === 30) allowedMinutes = [0, 30];
    else if (resolution === 15) allowedMinutes = [0, 15, 30, 45];
    else if (resolution === 10) allowedMinutes = [0, 10, 20, 30, 40, 50];
    else if (resolution === 5) allowedMinutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
    else allowedMinutes = Array.from({ length: 60 }, (_, i) => i);

    const newMin = allowedMinutes[Math.floor(Math.random() * allowedMinutes.length)];
    const newPeriod = Math.random() > 0.5 ? 'a.m.' : 'p.m.';

    setHour(newHour);
    setMinute(newMin);
    setPeriod(newPeriod);
    setFeedback(null);
    speakTime(newHour, newMin, newPeriod);
  }, [resolution, speakTime, playPop]);

  // Select a Routine Card
  const handleSelectRoutine = (routine: RoutineActivity) => {
    playPop();
    setTargetRoutine(routine);
    setHour(routine.timeHour);
    setMinute(routine.timeMinute);
    setPeriod(routine.period);
    setFeedback(null);

    if (isVoiceEnabled) {
      // Speak two sentences with a natural 350ms breath-pause between them.
      // speechService.speak() returns a Promise that resolves when the utterance ends,
      // so chaining gives a clean, paced delivery: "It's 7:00 a.m." … pause … "It's breakfast time!"
      const opts = { lang: 'en-US' as const, rate: 0.84 };
      speechService.speak(routine.phraseTime ?? routine.phrase, opts).then(() => {
        return new Promise<void>(res => setTimeout(res, 100));
      }).then(() => {
        if (routine.phraseActivity) {
          speechService.speak(routine.phraseActivity, opts);
        }
      });
    }
  };


  // Check Answer in SET_TIME mode
  const handleCheckAnswer = () => {
    const isCorrect =
      hour === targetRoutine.timeHour &&
      minute === targetRoutine.timeMinute &&
      period === targetRoutine.period;

    if (isCorrect) {
      soundEffects.playCorrect();
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      setFeedback('CORRECT');
      setScore(s => s + 100);
      setStreak(st => st + 1);
      speakTime(hour, minute, period);
    } else {
      soundEffects.playIncorrect();
      setFeedback('WRONG');
      setStreak(0);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto flex-1 flex flex-col justify-between p-2 sm:p-4 select-none">
      {/* =========================================================================
          1. TOP CONTROL BAR (Language, Theme, Mute, Mode Tabs)
         ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-3 shadow-md flex flex-nowrap items-center justify-between gap-3 mb-3 overflow-x-auto no-scrollbar whitespace-nowrap">
        {/* Left: Brand & Activity Title */}
        <div className="flex items-center gap-2 min-w-0 shrink-0">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-orange-500 text-white flex items-center justify-center text-xl shadow-md shrink-0">
            🕰️
          </div>
          <div className="min-w-0">
            <h2 className="text-base sm:text-xl font-black text-slate-900 dark:text-white truncate">
              {t(
                'What Time Is It? Clock Master',
                <>
                  <ruby>今<rt>いま</rt></ruby>
                  <ruby>何時<rt>なんじ</rt></ruby>？
                  <ruby>時計<rt>とけい</rt></ruby>マスター
                </>
              )}
            </h2>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
              Grade 4 • Let's Try 2 (Unit 4)
            </span>
          </div>
        </div>

        {/* Center: Activity Mode Segmented Tabs */}
        <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-black shrink-0">
          <button
            onClick={() => { playPop(); setGameMode('DAILY_ROUTINE'); }}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              gameMode === 'DAILY_ROUTINE'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {t('Daily Routine', <>1<ruby>日<rt>にち</rt></ruby>の<ruby>生活<rt>せいかつ</rt></ruby></>)}
          </button>
          <button
            onClick={() => { playPop(); setGameMode('SANDBOX'); }}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              gameMode === 'SANDBOX'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {t('Interactive Sandbox', <><ruby>自由<rt>じゆう</rt></ruby><ruby>操作<rt>そうさ</rt></ruby>・<ruby>教具<rt>きょうぐ</rt></ruby></>)}
          </button>
          <button
            onClick={() => { playPop(); setGameMode('SET_TIME'); }}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              gameMode === 'SET_TIME'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {t('Set the Clock Challenge', <><ruby>時計<rt>とけい</rt></ruby><ruby>合<rt>あ</rt></ruby>わせクイズ</>)}
          </button>
        </div>

        {/* Right Control Cluster (§10 Zero-Layout-Shift Invariant) */}
        <div className="flex items-center gap-1.5 shrink-0 flex-nowrap">
          {/* Text Language Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[10px]">
            <span className="text-slate-500 dark:text-slate-400 px-1 font-bold">文</span>
            <button
              onClick={() => { playPop(); setTextLang('en'); }}
              className={`px-1.5 py-0.5 rounded font-black cursor-pointer ${textLang === 'en' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-xs' : 'text-slate-500'}`}
            >
              EN
            </button>
            <button
              onClick={() => { playPop(); setTextLang('ja'); }}
              className={`px-1.5 py-0.5 rounded font-black cursor-pointer ${textLang === 'ja' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-xs' : 'text-slate-500'}`}
            >
              日
            </button>
          </div>

          {/* Voice Language Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[10px]">
            <span className="text-slate-500 dark:text-slate-400 pl-1 pr-0.5">🗣️</span>
            <button
              onClick={() => { playPop(); setIsVoiceEnabled(true); setVoiceLang('en'); }}
              className={`px-1.5 py-0.5 rounded font-black cursor-pointer ${isVoiceEnabled && voiceLang === 'en' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500'}`}
            >
              EN
            </button>
            <button
              onClick={() => { playPop(); setIsVoiceEnabled(true); setVoiceLang('ja'); }}
              className={`px-1.5 py-0.5 rounded font-black cursor-pointer ${isVoiceEnabled && voiceLang === 'ja' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500'}`}
            >
              日
            </button>
            <button
              onClick={() => { playPop(); setIsVoiceEnabled(false); }}
              className={`px-1 py-0.5 rounded font-bold cursor-pointer ${!isVoiceEnabled ? 'bg-slate-300 dark:bg-slate-600 text-slate-800' : 'text-slate-500'}`}
            >
              OFF
            </button>
          </div>

          {/* Theme Toggle (§7 Invariant) */}
          <button
            onClick={() => { playPop(); toggleTheme(); }}
            className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            {theme === 'dark' ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} className="text-indigo-500" />}
          </button>

          {/* Repeat Spoken Time Button */}
          <button
            onClick={() => speakTime(hour, minute, period)}
            className="w-8 h-8 rounded-lg bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-md active:scale-95 transition-all cursor-pointer"
            title="Pronounce Time"
          >
            <Volume2 size={16} />
          </button>
        </div>
      </div>

      {/* =========================================================================
          2. SECONDARY CONTROLS (Display Toggle, Resolution, Style Toggles)
         ========================================================================= */}
      <div className="bg-slate-100 dark:bg-slate-800/80 p-2 sm:p-3 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-nowrap items-center justify-between gap-3 text-xs mb-3 overflow-x-auto no-scrollbar whitespace-nowrap">
        {/* Clock View Switcher (Analog / Digital / Split) */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="font-bold text-slate-600 dark:text-slate-300">{t('Display:', <><ruby>表示<rt>ひょうじ</rt></ruby>:</>)}</span>
          <div className="flex bg-white dark:bg-slate-900 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => { playPop(); setDisplayType('ANALOG'); }}
              className={`px-2.5 py-1 rounded-lg font-black transition-all cursor-pointer ${displayType === 'ANALOG' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-500'}`}
            >
              {t('Analog Only', <><ruby>針<rt>はり</rt></ruby><ruby>時計<rt>とけい</rt></ruby>のみ</>)}
            </button>
            <button
              onClick={() => { playPop(); setDisplayType('SPLIT'); }}
              className={`px-2.5 py-1 rounded-lg font-black transition-all cursor-pointer ${displayType === 'SPLIT' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-500'}`}
            >
              {t('Split (Both)', <><ruby>両方<rt>りょうほう</rt></ruby><ruby>表示<rt>ひょうじ</rt></ruby></>)}
            </button>
            <button
              onClick={() => { playPop(); setDisplayType('DIGITAL'); }}
              className={`px-2.5 py-1 rounded-lg font-black transition-all cursor-pointer ${displayType === 'DIGITAL' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-500'}`}
            >
              {t('Digital Only', 'デジタルのみ')}
            </button>
          </div>
        </div>

        {/* Digital Style Toggle: Retro 7-Segment LCD vs Modern LED */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="font-bold text-slate-600 dark:text-slate-300">{t('Digital Style:', <><ruby>時計<rt>とけい</rt></ruby>デザイン:</>)}</span>
          <div className="flex bg-white dark:bg-slate-900 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => { playPop(); setDigitalStyle('RETRO_LCD'); }}
              className={`px-2.5 py-1 rounded-lg font-black transition-all cursor-pointer ${digitalStyle === 'RETRO_LCD' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-500'}`}
            >
              📟 {t('Retro 7-Segment LCD', 'レトロLCD')}
            </button>
            <button
              onClick={() => { playPop(); setDigitalStyle('MODERN_LED'); }}
              className={`px-2.5 py-1 rounded-lg font-black transition-all cursor-pointer ${digitalStyle === 'MODERN_LED' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500'}`}
            >
              ✨ {t('Modern Studio', 'モダンLED')}
            </button>
          </div>
        </div>

        {/* Step / Resolution Ladder (:00, :30, :15, :05, 1m) */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="font-bold text-slate-600 dark:text-slate-300">{t('Steps:', <><ruby>目盛<rt>めも</rt></ruby>り<ruby>刻<rt>きざ</rt></ruby>み:</>)}</span>
          <div className="flex bg-white dark:bg-slate-900 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
            {[60, 30, 15, 5, 1].map((res) => (
              <button
                key={res}
                onClick={() => { playPop(); setResolution(res as TimeResolution); }}
                className={`px-2 py-1 rounded-lg font-mono font-black text-xs cursor-pointer ${resolution === res ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-500'}`}
              >
                {res === 60 ? ':00' : res === 1 ? '1m' : `:${res.toString().padStart(2, '0')}`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* =========================================================================
          3. MAIN STAGE (Analog Dial, Digital Readout, or Split Presentation)
         ========================================================================= */}
      <div className="flex-1 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl flex flex-col items-center justify-center my-1 relative overflow-hidden">
        {/* Daily Routine Hero Card (if in Routine mode) */}
        {gameMode === 'DAILY_ROUTINE' && (
          <div className={`w-full max-w-2xl mb-4 p-3 sm:p-4 rounded-2xl bg-gradient-to-r ${targetRoutine.color} text-white shadow-lg flex items-center justify-between gap-3`}>
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-3xl sm:text-4xl shrink-0">{targetRoutine.icon}</span>
              <div className="min-w-0">
                <span className="text-xs font-black uppercase tracking-wider opacity-90">
                  {targetRoutine.enTitle}
                </span>
                <h3 className="text-xl sm:text-2xl font-black leading-tight">
                  <span className="block">{targetRoutine.phraseTime ?? targetRoutine.phrase}</span>
                  {targetRoutine.phraseActivity && (
                    <span className="block">{targetRoutine.phraseActivity}</span>
                  )}
                </h3>
              </div>
            </div>
            <button
              onClick={() => {
                const nextIdx = (DAILY_ROUTINES.findIndex(r => r.id === targetRoutine.id) + 1) % DAILY_ROUTINES.length;
                handleSelectRoutine(DAILY_ROUTINES[nextIdx]);
              }}
              className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-black text-xs transition-all active:scale-95 flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <span>{t('Next Activity', <><ruby>次<rt>つぎ</rt></ruby>の<ruby>生活<rt>せいかつ</rt></ruby></>)}</span>
              <ChevronRight size={14} />
            </button>
          </div>
        )}

        {/* Central Clock Area (Responsive Split Grid) */}
        <div className="w-full flex flex-col md:flex-row items-center justify-around gap-6 my-auto">
          {/* Left/Center: Analog Clock */}
          {(displayType === 'ANALOG' || displayType === 'SPLIT') && (
            <div className="flex flex-col items-center">
              <AnalogClock
                hour={hour}
                minute={minute}
                interactive={true}
                onTimeChange={(h, m) => {
                  setHour(h);
                  setMinute(m);
                  setFeedback(null);
                }}
                resolution={resolution}
                size={420}
              />
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 mt-2">
                {t('👆 Drag hands to set time', <>👆 <ruby>針<rt>はり</rt></ruby>をドラッグして<ruby>動<rt>うご</rt></ruby>かせるよ</>)}
              </span>
            </div>
          )}

          {/* Right/Center: Digital Readout (Retro LCD or Modern LED) */}
          {(displayType === 'DIGITAL' || displayType === 'SPLIT') && (
            <div className="flex flex-col items-center justify-center w-full max-w-md">
              <DigitalClock
                hour={hour}
                minute={minute}
                period={period}
                styleType={digitalStyle}
                className="w-full"
              />

              {/* AM / PM and Quick Stepper Buttons */}
              <div className="w-full mt-4 flex items-center justify-between gap-2">
                {/* AM / PM Toggle */}
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                  <button
                    onClick={() => { playPop(); setPeriod('a.m.'); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black cursor-pointer ${period === 'a.m.' ? 'bg-amber-400 text-slate-950 shadow-xs' : 'text-slate-500'}`}
                  >
                    {t('A.M.', <><ruby>午前<rt>ごぜん</rt></ruby></>)}
                  </button>
                  <button
                    onClick={() => { playPop(); setPeriod('p.m.'); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black cursor-pointer ${period === 'p.m.' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500'}`}
                  >
                    {t('P.M.', <><ruby>午後<rt>ごご</rt></ruby></>)}
                  </button>
                </div>

                {/* Minute Step Buttons (-5m, +5m, -1h, +1h) */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      playPop();
                      setMinute(m => ((m - resolution) % 60 + 60) % 60);
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 font-mono font-bold text-xs hover:bg-slate-200 cursor-pointer"
                  >
                    -{resolution}m
                  </button>
                  <button
                    onClick={() => {
                      playPop();
                      setMinute(m => (m + resolution) % 60);
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 font-mono font-bold text-xs hover:bg-slate-200 cursor-pointer"
                  >
                    +{resolution}m
                  </button>
                  <button
                    onClick={() => {
                      playPop();
                      setHour(h => (h % 12) + 1);
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-300 font-bold text-xs cursor-pointer"
                  >
                    +1h
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Feedback Alert Banner */}
        {feedback === 'CORRECT' && (
          <div className="absolute bottom-4 px-6 py-2.5 rounded-2xl bg-emerald-500 text-white font-black text-sm flex items-center gap-2 shadow-xl animate-in zoom-in-95">
            <CheckCircle2 size={18} />
            <span>{t('Correct! Wonderful job!', <><ruby>正解<rt>せいかい</rt></ruby>！そのとおり！</>)}</span>
          </div>
        )}
        {feedback === 'WRONG' && (
          <div className="absolute bottom-4 px-6 py-2.5 rounded-2xl bg-rose-500 text-white font-black text-sm flex items-center gap-2 shadow-xl animate-in zoom-in-95">
            <span>❌</span>
            <span>{t('Try again! Look closely at the hands.', <>もう<ruby>一度<rt>いちど</rt></ruby>！<ruby>針<rt>はり</rt></ruby>の<ruby>位置<rt>いち</rt></ruby>をよく<ruby>見<rt>み</rt></ruby>てね。</>)}</span>
          </div>
        )}
      </div>

      {/* =========================================================================
          4. BOTTOM BAR: Routine Tray or Action Buttons
         ========================================================================= */}
      <div className="bg-slate-100 dark:bg-slate-800/80 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3">
        {gameMode === 'DAILY_ROUTINE' ? (
          /* 7 Daily Routine Action Cards */
          <div className="w-full flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            {DAILY_ROUTINES.map((r) => {
              const isActive = targetRoutine.id === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => handleSelectRoutine(r)}
                  className={`px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 shrink-0 border cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white border-blue-500 shadow-md scale-102 ring-2 ring-blue-300'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-base">{r.icon}</span>
                  <div className="text-left leading-none">
                    <span className="block mb-0.5">
                      {t(
                        r.enTitle,
                        <>
                          {r.jaRuby.map((item, idx) =>
                            item.ruby ? (
                              <ruby key={idx}>
                                {item.base}
                                <rt>{item.ruby}</rt>
                              </ruby>
                            ) : (
                              <span key={idx}>{item.base}</span>
                            )
                          )}
                        </>
                      )}
                    </span>
                    <span className="text-[10px] opacity-75 font-mono">
                      {`${r.timeHour}:${r.timeMinute.toString().padStart(2, '0')} ${r.period}`}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : gameMode === 'SET_TIME' ? (
          /* Check Answer Button & Score */
          <div className="w-full flex flex-nowrap items-center justify-between gap-3 overflow-x-auto no-scrollbar whitespace-nowrap">
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-sm font-black text-slate-900 dark:text-white">
                {t('Goal:', <><ruby>目標<rt>もくひょう</rt></ruby>:</>)} <strong className="text-blue-600 dark:text-blue-400 font-mono text-base">{targetRoutine.phrase}</strong>
              </span>
              <span className="text-xs font-mono font-bold text-amber-500">
                Score: {score} pts (Streak: {streak})
              </span>
            </div>
            <button
              onClick={handleCheckAnswer}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm shadow-md transition-all active:scale-95 flex items-center gap-2 shrink-0 cursor-pointer"
            >
              <span>{t('Check Time!', <><ruby>時間<rt>じかん</rt></ruby>をたしかめる！</>)}</span>
              <ChevronRight size={16} />
            </button>
          </div>
        ) : (
          /* Sandbox Actions: Random Roll & Speak */
          <div className="w-full flex flex-nowrap items-center justify-between gap-3 overflow-x-auto no-scrollbar whitespace-nowrap">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 shrink-0">
              {t(
                'Teacher Manipulative Sandbox: Drag hands or roll random time.',
                <><ruby>自由<rt>じゆう</rt></ruby>に<ruby>時計<rt>とけい</rt></ruby>を<ruby>動<rt>うご</rt></ruby>かして「What time is it?」と<ruby>質問<rt>しつもん</rt></ruby>してみよう。</>
              )}
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={rollRandomTime}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <span>🎲</span>
                <span>{t('Random Time', <>ランダム<ruby>出題<rt>しゅつだい</rt></ruby></>)}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};