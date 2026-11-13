import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { X, Play, Volume2, VolumeX, Sparkles, Trash2, RotateCw, Speech, Crown, Plus, Hand, Star, Sun, Moon } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useClassroom } from '@/context/ClassroomContext';
import { useLanguage } from '@/context/LanguageContext';
import { useAudio } from '@/context/AudioContext';
import { soundEffects } from '@/services/soundEffects';
import { speechService } from '@/services/speechService';
import { ThreeDiceStage } from './ThreeDiceStage';

export type DieType = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20';
export type MathMode = 'sum' | 'multiply' | 'highest';

interface CelebrationInfo {
  title: string;
  subtitle: string;
  badge: string;
  bgGradient: string;
}

const NUMBER_WORDS: Record<number, string> = {
  0: 'zero', 1: 'one', 2: 'two', 3: 'three', 4: 'four', 5: 'five',
  6: 'six', 7: 'seven', 8: 'eight', 9: 'nine', 10: 'ten',
  11: 'eleven', 12: 'twelve', 13: 'thirteen', 14: 'fourteen', 15: 'fifteen',
  16: 'sixteen', 17: 'seventeen', 18: 'eighteen', 19: 'nineteen', 20: 'twenty',
};


interface DieConfig {
  type: DieType;
  sides: number;
  label: string;
  shapeName: string;
  badge: string;
  bgGrad: string;
  borderColor: string;
  textColor: string;
}

const DICE_CONFIGS: Record<DieType, DieConfig> = {
  d4: {
    type: 'd4',
    sides: 4,
    label: 'd4',
    shapeName: '四面体 (1–4)',
    badge: '△',
    bgGrad: 'from-amber-500 to-amber-600',
    borderColor: 'border-amber-400',
    textColor: 'text-amber-400',
  },
  d6: {
    type: 'd6',
    sides: 6,
    label: 'd6',
    shapeName: '立方体 (1–6)',
    badge: '⚅',
    bgGrad: 'from-blue-600 to-indigo-600',
    borderColor: 'border-blue-400',
    textColor: 'text-blue-400',
  },
  d8: {
    type: 'd8',
    sides: 8,
    label: 'd8',
    shapeName: '八面体 (1–8)',
    badge: '◇',
    bgGrad: 'from-emerald-600 to-teal-600',
    borderColor: 'border-emerald-400',
    textColor: 'text-emerald-400',
  },
  d10: {
    type: 'd10',
    sides: 10,
    label: 'd10',
    shapeName: '十面体 (1–10)',
    badge: '⬡',
    bgGrad: 'from-purple-600 to-violet-600',
    borderColor: 'border-purple-400',
    textColor: 'text-purple-400',
  },
  d12: {
    type: 'd12',
    sides: 12,
    label: 'd12',
    shapeName: '十二面体 (1–12)',
    badge: '⬢',
    bgGrad: 'from-cyan-600 to-sky-600',
    borderColor: 'border-cyan-400',
    textColor: 'text-cyan-400',
  },
  d20: {
    type: 'd20',
    sides: 20,
    label: 'd20',
    shapeName: '二十面体 (1–20)',
    badge: '★',
    bgGrad: 'from-rose-600 to-pink-600',
    borderColor: 'border-rose-400',
    textColor: 'text-rose-400',
  },
};

interface TrayDie {
  id: string;
  type: DieType;
  value: number;
}

export const DiceModal: React.FC = () => {
  const { isDiceModalOpen, closeDiceModal, theme, toggleTheme } = useClassroom();
  const { language } = useLanguage();
  const { isMuted, toggleMute, playPop } = useAudio();

  // Active dice in tray (default 1 x d6)
  const [trayDice, setTrayDice] = useState<TrayDie[]>([
    { id: 'd6-init-1', type: 'd6', value: 6 },
  ]);

  // Independent translation toggles for text and voice
  const [textLang, setTextLang] = useState<'en' | 'ja'>(language);
  const [voiceLang, setVoiceLang] = useState<'en' | 'ja'>('en');

  // Sync text language if parent page language changes
  useEffect(() => {
    setTextLang(language);
  }, [language]);

  // Local translator respecting modal text language toggle
  const t = useCallback((en: string, ja: string) => {
    return textLang === 'ja' ? ja : en;
  }, [textLang]);

  const [isAnyRolling, setIsAnyRolling] = useState<boolean>(false);
  const [rollHistory, setRollHistory] = useState<{ total: number; breakdown: string } | null>(null);
  const [mathMode, setMathMode] = useState<MathMode>('sum');
  const [isVoiceEnabled, setIsVoiceEnabled] = useState<boolean>(true);
  const [celebration, setCelebration] = useState<CelebrationInfo | null>(null);

  // Close on Escape, Space to roll
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isDiceModalOpen) return;
      if (e.key === 'Escape' && !isAnyRolling) {
        closeDiceModal();
      } else if ((e.key === ' ' || e.key === 'Enter') && !isAnyRolling) {
        e.preventDefault();
        handleRollAll();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDiceModalOpen, isAnyRolling, closeDiceModal]);

  // Add die to tray (max 8 dice)
  const addDie = (type: DieType) => {
    if (trayDice.length >= 8 || isAnyRolling) return;
    playPop();
    const initialVal = Math.floor(Math.random() * DICE_CONFIGS[type].sides) + 1;
    const newDie: TrayDie = {
      id: `${type}-${Date.now()}-${Math.random()}`,
      type,
      value: initialVal,
    };
    setTrayDice(prev => [...prev, newDie]);
  };

  // Remove individual die
  const removeDie = (id: string) => {
    if (isAnyRolling) return;
    playPop();
    setTrayDice(prev => prev.filter(d => d.id !== id));
  };

  // Presets
  const setPreset1d6 = () => {
    if (isAnyRolling) return;
    playPop();
    const newDice: TrayDie[] = [
      { id: `d6-${Date.now()}`, type: 'd6', value: 6 },
    ];
    setTrayDice(newDice);
    executeRoll(newDice);
  };

  const setPreset2d6 = () => {
    if (isAnyRolling) return;
    playPop();
    const newDice: TrayDie[] = [
      { id: `d6-1-${Date.now()}`, type: 'd6', value: 3 },
      { id: `d6-2-${Date.now()}`, type: 'd6', value: 4 },
    ];
    setTrayDice(newDice);
    executeRoll(newDice);
  };

  const setPreset1d20 = () => {
    if (isAnyRolling) return;
    playPop();
    const newDice: TrayDie[] = [
      { id: `d20-${Date.now()}`, type: 'd20', value: 20 },
    ];
    setTrayDice(newDice);
    executeRoll(newDice);
  };

  const setPresetFullSet = () => {
    if (isAnyRolling) return;
    playPop();
    const types: DieType[] = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'];
    const newDice: TrayDie[] = types.map((type, idx) => ({
      id: `${type}-${Date.now()}-${idx}`,
      type,
      value: Math.floor(Math.random() * DICE_CONFIGS[type].sides) + 1,
    }));
    setTrayDice(newDice);
    executeRoll(newDice);
  };

  const clearTray = () => {
    if (isAnyRolling) return;
    playPop();
    setTrayDice([]);
    setRollHistory(null);
    setCelebration(null);
  };

  // Execute roll on a subset of dice or all dice
  const executeRoll = useCallback((targetDice: TrayDie[], targetId?: string) => {
    if (targetDice.length === 0 || isAnyRolling) return;

    setIsAnyRolling(true);
    setCelebration(null);
    soundEffects.playDiceRattle();

    const duration = 950; // 950ms snappy roll duration

    // Determine final values for the rolling dice
    const rollResults = targetDice.map(die => {
      const isTarget = !targetId || die.id === targetId;
      if (!isTarget) return die;
      return {
        ...die,
        value: Math.floor(Math.random() * DICE_CONFIGS[die.type].sides) + 1,
      };
    });

    setTrayDice(rollResults);

    setTimeout(() => {
      setIsAnyRolling(false);
      soundEffects.playDiceLand();

      const settled = rollResults.map(d => d.value);

      // 1. Math Calculation History
      let historyTotal = 0;
      let historyFormula = '';
      if (mathMode === 'multiply') {
        historyTotal = settled.reduce((a, b) => a * b, 1);
        historyFormula = settled.join(' × ');
      } else if (mathMode === 'highest') {
        historyTotal = Math.max(...settled);
        historyFormula = `Max: ${historyTotal}`;
      } else {
        historyTotal = settled.reduce((a, b) => a + b, 0);
        historyFormula = settled.join(' + ');
      }
      setRollHistory({ total: historyTotal, breakdown: historyFormula });

      // 2. Celebrations (Natural 20, Jackpot, Doubles, Max 6)
      const hasD20 = rollResults.some(d => d.type === 'd20' && d.value === 20);
      const isAllMax = rollResults.every(d => d.value === DICE_CONFIGS[d.type].sides);
      const isDoubles = settled.length >= 2 && settled.every(v => v === settled[0]);
      const isSingleD6Max = rollResults.length === 1 && rollResults[0].type === 'd6' && rollResults[0].value === 6;

      if (hasD20) {
        soundEffects.playFanfare();
        confetti({
          particleCount: 110,
          spread: 90,
          origin: { y: 0.55 },
          colors: ['#ffd700', '#f43f5e', '#ffffff', '#38bdf8'],
          zIndex: 9999,
        });
        setCelebration({
          title: textLang === 'ja' ? '大成功！クリティカルヒット！' : 'NATURAL 20! CRITICAL HIT!',
          subtitle: textLang === 'ja' ? 'NATURAL 20! CRITICAL HIT!' : '🌟 大成功！クリティカルヒット！',
          badge: '⭐ 20',
          bgGradient: 'from-rose-600 via-amber-500 to-rose-600',
        });
      } else if (isAllMax && rollResults.length >= 2) {
        soundEffects.playFanfare();
        confetti({
          particleCount: 100,
          spread: 85,
          origin: { y: 0.55 },
          colors: ['#ffd700', '#10b981', '#3b82f6'],
          zIndex: 9999,
        });
        setCelebration({
          title: textLang === 'ja' ? '大当たり！全ダイス最高値！' : 'JACKPOT! ALL MAXIMUM!',
          subtitle: textLang === 'ja' ? 'JACKPOT! ALL MAXIMUM!' : '💎 全ダイス最高値！大当たり！',
          badge: '🎉 MAX',
          bgGradient: 'from-amber-500 via-emerald-500 to-cyan-500',
        });
      } else if (isDoubles) {
        soundEffects.playCorrect();
        confetti({
          particleCount: 85,
          spread: 80,
          origin: { y: 0.58 },
          colors: ['#6366f1', '#ec4899', '#f59e0b'],
          zIndex: 9999,
        });
        const numWord = settled[0];
        setCelebration({
          title: textLang === 'ja' ? `ゾロ目！(${numWord} & ${numWord})` : `DOUBLES! (${numWord} & ${numWord})`,
          subtitle: textLang === 'ja' ? 'DOUBLES! BONUS ROLL!' : '🎲 ゾロ目！ボーナスロール！',
          badge: `✨ ${numWord}`,
          bgGradient: 'from-indigo-600 via-purple-600 to-pink-600',
        });
      } else if (isSingleD6Max) {
        soundEffects.playCorrect();
        confetti({
          particleCount: 65,
          spread: 70,
          origin: { y: 0.58 },
          zIndex: 9999,
        });
        setCelebration({
          title: textLang === 'ja' ? '最高値 6！大当り！' : 'MAXIMUM 6! LUCKY!',
          subtitle: textLang === 'ja' ? 'MAXIMUM 6! LUCKY!' : '🎲 最高値 6！大当り！',
          badge: '✨ 6',
          bgGradient: 'from-blue-600 via-indigo-600 to-blue-600',
        });
      } else {
        setCelebration(null);
      }

      // 3. Spoken Voice Synthesis Announcer (EN or JA)
      if (isVoiceEnabled && !isMuted) {
        let voiceText = '';

        if (voiceLang === 'ja') {
          // Native Japanese Voice Announcements
          if (mathMode === 'multiply') {
            if (settled.length === 2) {
              voiceText = `${settled[0]} かける ${settled[1]} は、${settled[0] * settled[1]}！`;
            } else {
              const prod = settled.reduce((a, b) => a * b, 1);
              voiceText = `かけ算の答えは、${prod}！`;
            }
          } else if (mathMode === 'highest') {
            const maxVal = Math.max(...settled);
            voiceText = `最大値は、${maxVal}！`;
          } else {
            // 'sum' mode
            if (settled.length === 1) {
              const v = settled[0];
              const isD20 = rollResults[0].type === 'd20';
              if (isD20 && v === 20) {
                voiceText = 'クリティカルヒット！２０！';
              } else if (v === DICE_CONFIGS[rollResults[0].type].sides) {
                voiceText = `${v}！最大値！`;
              } else {
                voiceText = `${v}！`;
              }
            } else if (settled.length === 2) {
              if (settled[0] === settled[1]) {
                voiceText = `ゾロ目の ${settled[0]}！合計は ${settled[0] + settled[1]}！`;
              } else {
                voiceText = `${settled[0]} と ${settled[1]}！合計は ${settled[0] + settled[1]}！`;
              }
            } else {
              const total = settled.reduce((a, b) => a + b, 0);
              voiceText = `合計は、${total}！`;
            }
          }
        } else {
          // Native English Voice Announcements
          if (mathMode === 'multiply') {
            if (settled.length === 2) {
              const w0 = NUMBER_WORDS[settled[0]] || String(settled[0]);
              const w1 = NUMBER_WORDS[settled[1]] || String(settled[1]);
              voiceText = `${w0} times ${w1} is ${settled[0] * settled[1]}!`;
            } else {
              const prod = settled.reduce((a, b) => a * b, 1);
              voiceText = `Product is ${prod}!`;
            }
          } else if (mathMode === 'highest') {
            const maxVal = Math.max(...settled);
            const w = NUMBER_WORDS[maxVal] || String(maxVal);
            voiceText = `Highest roll is ${w}!`;
          } else {
            // 'sum' mode
            if (settled.length === 1) {
              const v = settled[0];
              const isD20 = rollResults[0].type === 'd20';
              if (isD20 && v === 20) {
                voiceText = 'Natural twenty! Critical hit!';
              } else if (v === DICE_CONFIGS[rollResults[0].type].sides) {
                voiceText = `${NUMBER_WORDS[v] || v}! Maximum roll!`;
              } else {
                voiceText = `${NUMBER_WORDS[v] || v}!`;
              }
            } else if (settled.length === 2) {
              const w0 = NUMBER_WORDS[settled[0]] || String(settled[0]);
              const w1 = NUMBER_WORDS[settled[1]] || String(settled[1]);
              if (settled[0] === settled[1]) {
                voiceText = `Double ${w0}! Total is ${settled[0] + settled[1]}!`;
              } else {
                voiceText = `${w0} and ${w1}! Total is ${settled[0] + settled[1]}!`;
              }
            } else {
              const total = settled.reduce((a, b) => a + b, 0);
              voiceText = `Total is ${total}!`;
            }
          }
        }

        if (voiceText) {
          setTimeout(() => {
            speechService.speak(voiceText, {
              lang: voiceLang === 'ja' ? 'ja-JP' : 'en-US',
              rate: voiceLang === 'ja' ? 0.96 : 0.94,
              pitch: voiceLang === 'ja' ? 1.02 : 1.04,
            });
          }, 140);
        }
      }
    }, duration);
  }, [isAnyRolling, mathMode, isVoiceEnabled, isMuted, voiceLang, textLang]);

  const handleRollAll = () => {
    if (trayDice.length === 0) {
      setPreset1d6();
    } else {
      executeRoll(trayDice);
    }
  };

  // Roll single die when tapped on tray
  const handleRollSingle = (dieId: string) => {
    if (isAnyRolling) return;
    executeRoll(trayDice, dieId);
  };

  // Calculate live value according to active mathMode
  const mathResult = useMemo(() => {
    if (trayDice.length === 0) return { val: 0, label: '0', formula: '' };
    const values = trayDice.map(d => d.value);
    if (mathMode === 'multiply') {
      const prod = values.reduce((a, b) => a * b, 1);
      return {
        val: prod,
        label: String(prod),
        formula: values.join(' × '),
      };
    }
    if (mathMode === 'highest') {
      const maxVal = Math.max(...values);
      return {
        val: maxVal,
        label: String(maxVal),
        formula: `Max: ${maxVal}`,
      };
    }
    const total = values.reduce((a, b) => a + b, 0);
    return {
      val: total,
      label: String(total),
      formula: values.join(' + '),
    };
  }, [trayDice, mathMode]);



  if (!isDiceModalOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-200"
      onClick={() => {
        if (!isAnyRolling) closeDiceModal();
      }}
    >
      <div
        className="bg-white dark:bg-slate-900 border-3 sm:border-4 border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl w-[98vw] sm:w-[95vw] max-w-5xl h-[95dvh] sm:h-[94dvh] max-h-[960px] p-3 sm:p-5 shadow-2xl flex flex-col justify-between relative select-none my-auto overflow-y-auto sm:overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2 mb-2 min-h-[44px]">
          <div className="flex items-center gap-2 min-w-0 flex-1 pr-1">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-sm shrink-0">
              <span className="text-xl">🎲</span>
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight leading-tight truncate">
                <span>{t('3D Dice Roller', '教室の3Dダイス')}</span>
              </h2>
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 leading-tight truncate hidden xs:block">
                {t('Physical rolling for games & drills', 'ゲームや授業用 リアル3Dダイス')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 flex-nowrap">
            {/* 1. Independent Text Language Toggle */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200/80 dark:border-slate-700/80 text-[10px]">
              <span className="text-[10px] text-slate-400 px-1 font-bold select-none" title="Text Language (表示言語)">文</span>
              <button
                onClick={() => { playPop(); setTextLang('en'); }}
                className={`px-1.5 py-0.5 rounded-md font-black transition-all cursor-pointer ${
                  textLang === 'en'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                title="Text: English (表示: 英語)"
              >
                EN
              </button>
              <button
                onClick={() => { playPop(); setTextLang('ja'); }}
                className={`px-1.5 py-0.5 rounded-md font-black transition-all cursor-pointer ${
                  textLang === 'ja'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                title="Text: 日本語 (表示: 日本語)"
              >
                日
              </button>
            </div>

            {/* 2. Independent Voice Announcer Language & Power Toggle */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200/80 dark:border-slate-700/80 text-[10px]">
              <span className="text-slate-400 pl-1 pr-0.5 select-none" title="Spoken Voice Announcer (音声読み上げ)"><Speech size={11} /></span>
              <button
                onClick={() => { playPop(); setIsVoiceEnabled(true); setVoiceLang('en'); }}
                className={`px-1.5 py-0.5 rounded-md font-black transition-all cursor-pointer ${
                  isVoiceEnabled && voiceLang === 'en'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                title="Voice: English (音声: 英語)"
              >
                EN
              </button>
              <button
                onClick={() => { playPop(); setIsVoiceEnabled(true); setVoiceLang('ja'); }}
                className={`px-1.5 py-0.5 rounded-md font-black transition-all cursor-pointer ${
                  isVoiceEnabled && voiceLang === 'ja'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                title="Voice: 日本語 (音声: 日本語)"
              >
                日
              </button>
              <button
                onClick={() => { playPop(); setIsVoiceEnabled(false); }}
                className={`px-1 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                  !isVoiceEnabled
                    ? 'bg-slate-300 dark:bg-slate-600 text-slate-800 dark:text-slate-100 shadow-xs'
                    : 'text-slate-400 hover:text-rose-500'
                }`}
                title="Voice: Muted / OFF (音声オフ)"
              >
                OFF
              </button>
            </div>

            {/* 3. Sound Effects Mute Toggle */}
            <button
              onClick={toggleMute}
              className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center cursor-pointer"
              title={isMuted ? 'Unmute Sound Effects' : 'Mute Sound Effects'}
            >
              {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>

            {/* 4. Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center cursor-pointer transition-colors"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Sun size={14} className="text-amber-400" /> : <Moon size={14} className="text-indigo-400" />}
            </button>

            {/* 5. Close Modal */}
            <button
              onClick={() => { playPop(); closeDiceModal(); }}
              disabled={isAnyRolling}
              className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center disabled:opacity-50 cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Quick Presets & Math Mode Unified Bar (Guaranteed Zero-Shift 2-Row Grid) */}
        <div className="mb-2 bg-slate-100 dark:bg-slate-800/60 p-1.5 sm:p-2 rounded-xl sm:rounded-2xl space-y-1.5 text-xs">
          {/* Row 1: Presets & Clear Tray */}
          <div className="h-7 sm:h-8 flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-1 min-w-0 overflow-x-auto no-scrollbar py-0.5">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 shrink-0 select-none mr-0.5">
                {t('Presets', 'プリセット')}:
              </span>
              <button
                onClick={setPreset1d6}
                disabled={isAnyRolling}
                className="h-6 sm:h-7 px-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-[11px] text-slate-800 dark:text-slate-200 hover:border-blue-500 active:scale-95 transition-all shadow-xs cursor-pointer shrink-0 flex items-center justify-center"
              >
                1 × d6
              </button>
              <button
                onClick={setPreset2d6}
                disabled={isAnyRolling}
                className="h-6 sm:h-7 px-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-[11px] text-slate-800 dark:text-slate-200 hover:border-blue-500 active:scale-95 transition-all shadow-xs cursor-pointer shrink-0 flex items-center justify-center"
              >
                2 × d6
              </button>
              <button
                onClick={setPreset1d20}
                disabled={isAnyRolling}
                className="h-6 sm:h-7 px-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-[11px] text-slate-800 dark:text-slate-200 hover:border-amber-500 active:scale-95 transition-all shadow-xs cursor-pointer shrink-0 flex items-center justify-center"
              >
                1 × d20
              </button>
              <button
                onClick={setPresetFullSet}
                disabled={isAnyRolling}
                className="h-6 sm:h-7 px-2 rounded-lg bg-gradient-to-r from-amber-500/15 via-emerald-500/15 to-purple-500/15 dark:from-amber-500/25 dark:via-emerald-500/25 dark:to-purple-500/25 border border-amber-300 dark:border-amber-600/50 font-bold text-[11px] text-slate-800 dark:text-slate-200 hover:border-amber-400 active:scale-95 transition-all shadow-xs cursor-pointer flex items-center gap-1 shrink-0 justify-center"
              >
                <span>🌈</span>
                <span>{t('Full Set', '全種セット')}</span>
              </button>
            </div>

            {trayDice.length > 0 && (
              <button
                onClick={clearTray}
                disabled={isAnyRolling}
                className="w-7 h-6 sm:h-7 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 hover:bg-rose-200 dark:hover:bg-rose-900/60 flex items-center justify-center transition-all cursor-pointer shrink-0"
                title={t('Clear dice tray', 'トレイを空にする')}
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>

          {/* Row 2: Math Mode (Segmented 3-Equal-Width Tabs) */}
          <div className="h-7 sm:h-8 flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 shrink-0 select-none mr-0.5">
              {t('Math', '計算')}:
            </span>
            <div className="flex-1 grid grid-cols-3 gap-1 bg-slate-200/80 dark:bg-slate-800 p-0.5 rounded-lg">
              <button
                onClick={() => { playPop(); setMathMode('sum'); }}
                className={`h-6 sm:h-7 rounded-md text-[10px] sm:text-[11px] font-black transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  mathMode === 'sum'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title={t('Sum', '合計')}
              >
                <Plus size={11} className="shrink-0" />
                <span className="truncate">{t('Sum', '合計')}</span>
              </button>
              <button
                onClick={() => { playPop(); setMathMode('multiply'); }}
                className={`h-6 sm:h-7 rounded-md text-[10px] sm:text-[11px] font-black transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  mathMode === 'multiply'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title={t('Multiply', 'かけ算')}
              >
                <span className="shrink-0 font-bold">×</span>
                <span className="truncate">{t('Mult', 'かけ算')}</span>
              </button>
              <button
                onClick={() => { playPop(); setMathMode('highest'); }}
                className={`h-6 sm:h-7 rounded-md text-[10px] sm:text-[11px] font-black transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  mathMode === 'highest'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title={t('Highest', '最大値')}
              >
                <Crown size={11} className="shrink-0" />
                <span className="truncate">{t('Max', '最大')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* The Dice Rack (Palette of 6 Polyhedral Dice) */}
        <div className="mb-2">
          <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1 flex items-center justify-between">
            <span>{t('Dice Rack (Tap to add)', 'ダイスラック（タップして追加）')}</span>
            <span className="font-mono text-slate-500 font-bold">{trayDice.length} / 8</span>
          </div>
          <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
            {(Object.keys(DICE_CONFIGS) as DieType[]).map(type => {
              const cfg = DICE_CONFIGS[type];
              return (
                <button
                  key={type}
                  onClick={() => addDie(type)}
                  disabled={isAnyRolling || trayDice.length >= 8}
                  className="group relative flex flex-col items-center py-1.5 sm:py-2 px-1 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-slate-200 dark:border-slate-700 hover:border-blue-400 transition-all active:scale-95 disabled:opacity-40 cursor-pointer shadow-xs"
                  title={`${cfg.label} - ${cfg.shapeName}`}
                >
                  <span className={`text-base sm:text-2xl font-black ${cfg.textColor} group-hover:scale-110 transition-transform leading-none mb-1`}>
                    {cfg.badge}
                  </span>
                  <span className="text-[11px] sm:text-xs font-black text-slate-800 dark:text-slate-200 font-mono leading-none">
                    {cfg.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* The Dice Tray Stage (Green Casino Felt / Studio Mat) */}
        <div className="relative flex-1 min-h-[240px] sm:min-h-[340px] md:min-h-[420px] bg-[#0a3622] rounded-2xl sm:rounded-3xl border-3 sm:border-4 border-[#14532d] p-2 sm:p-4 flex flex-col items-center justify-between overflow-hidden shadow-2xl ring-1 ring-emerald-500/20 my-1 sm:my-2">
          {trayDice.length > 0 ? (
            <div className="relative z-10 w-full flex-1 flex flex-col items-center justify-between">
              {/* Celebratory Banner (Natural 20, Jackpot, Doubles, Max 6) */}
              {celebration && (
                <div className={`mb-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r ${celebration.bgGradient} text-white shadow-xl flex items-center justify-between gap-2.5 animate-in zoom-in-95 duration-200 w-full max-w-sm`}>
                  <div className="flex items-center gap-1.5">
                    <span className="text-base sm:text-xl">🌟</span>
                    <div>
                      <div className="text-xs sm:text-sm font-black tracking-wide uppercase drop-shadow-xs leading-tight">
                        {celebration.title}
                      </div>
                      <div className="text-[10px] sm:text-xs font-bold opacity-90 leading-tight">
                        {celebration.subtitle}
                      </div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-white/25 text-xs font-black backdrop-blur-xs">
                    {celebration.badge}
                  </span>
                </div>
              )}

              {/* Three.js 3D WebGL Felt Table with Flick-to-Toss Gesture */}
              <div className="w-full flex-1 flex items-center justify-center min-h-[180px] sm:min-h-[260px]">
                <ThreeDiceStage
                  dice={trayDice}
                  isRolling={isAnyRolling}
                  onDieClick={handleRollSingle}
                  onFlickRoll={handleRollAll}
                />
              </div>

              {/* Bottom cluster inside felt: Dice Tags + Calculated Math Result */}
              <div className="w-full flex flex-col items-center gap-1.5 mt-1 z-20">
                {/* Quick Dice Tags Bar */}
                <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-2xl px-1">
                  {trayDice.map(d => {
                    const cfg = DICE_CONFIGS[d.type];
                    return (
                      <div
                        key={d.id}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900/90 border border-slate-700/80 text-xs font-bold text-slate-300 shadow-md backdrop-blur-xs"
                      >
                        <span className={`${cfg.textColor} text-sm font-black`}>{cfg.badge}</span>
                        <span className="font-mono text-white font-black text-sm">{d.value}</span>
                        <button
                          onClick={() => removeDie(d.id)}
                          disabled={isAnyRolling}
                          className="hover:text-rose-400 p-0.5 rounded text-slate-400 disabled:opacity-40 cursor-pointer"
                          title={t('Remove die', 'ダイスを削除')}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Calculated Math Result Display */}
                <div className="h-9 sm:h-11 flex items-center gap-2.5 bg-slate-900/95 border-2 border-slate-700/90 px-4 sm:px-6 rounded-full shadow-2xl animate-in zoom-in-95 duration-150 backdrop-blur-md">
                  <span className="text-xs sm:text-sm font-bold text-slate-400 shrink-0">
                    {mathMode === 'multiply'
                      ? t('PRODUCT', 'かけ算')
                      : mathMode === 'highest'
                      ? t('MAX', '最大値')
                      : t('TOTAL', '合計')}:
                  </span>
                  <span className="text-2xl sm:text-3xl font-black text-amber-400 font-mono tracking-tight leading-none shrink-0">
                    {mathResult.label}
                  </span>
                  {trayDice.length > 1 && (
                    <span className="text-xs sm:text-sm text-slate-400 font-mono hidden xs:inline border-l border-slate-700 pl-2.5 ml-1 leading-none truncate max-w-[260px]">
                      {mathResult.formula}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Empty Tray Prompt */
            <div className="relative z-10 flex flex-col items-center text-center p-4 flex-1 justify-center">
              <span className="text-5xl sm:text-6xl mb-2 opacity-50 animate-bounce">🎲</span>
              <p className="text-xs sm:text-sm font-bold text-slate-400 mb-3">
                {t('The tray is empty. Tap any die above to add!', 'トレイが空です。上のダイスをタップして追加してください。')}
              </p>
              <button
                onClick={setPreset1d6}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-sm transition-all shadow-md active:scale-95 cursor-pointer"
              >
                {t('Add 1 × d6', '1 × d6 を追加')}
              </button>
            </div>
          )}
        </div>

        {/* Master Roll Button */}
        <div className="mt-1 sm:mt-2 space-y-1.5">
          <button
            onClick={handleRollAll}
            disabled={isAnyRolling}
            className="w-full h-12 sm:h-14 rounded-xl sm:rounded-2xl font-black text-sm sm:text-lg text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-98 transition-all shadow-xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Play size={20} className={isAnyRolling ? 'animate-spin shrink-0' : 'shrink-0'} />
            <span className="truncate whitespace-nowrap">
              {isAnyRolling
                ? t('Rolling in 3D...', '回転中...')
                : trayDice.length === 0
                ? t('Roll 1 × d6', '1 × d6 を振る')
                : t(`ROLL ${trayDice.length} ${trayDice.length === 1 ? 'DIE' : 'DICE'}! (Space)`, `ダイスを振る！(${trayDice.length}個) [スペースキー]`)}
            </span>
          </button>

          {/* Bottom Hint */}
          <div className="h-5 flex items-center justify-between text-[10px] sm:text-xs text-slate-400 font-medium px-1 overflow-hidden">
            <span className="flex items-center gap-1.5 min-w-0 truncate">
              <Hand size={13} className="text-blue-400 animate-pulse shrink-0" />
              <span className="truncate">
                {t('Flick felt to roll • Tap die to reroll', 'スワイプで投げる • タップで個別振り直し')}
              </span>
            </span>
            {rollHistory && (
              <span className="font-mono text-slate-500 shrink-0 pl-1 text-[11px] sm:text-xs">
                {t('Last', '直前')}: {rollHistory.breakdown} = {rollHistory.total}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
