import React, { useState, useEffect, useCallback, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { CinemaStageLayout } from '@/components/common/CinemaStageLayout';
import { useLanguage } from '@/context/LanguageContext';
import { useAudio } from '@/context/AudioContext';
import { speechService } from '@/services/speechService';
import { soundEffects } from '@/services/soundEffects';
import { RubyText } from '@/components/common/RubyText';
import {
  GrammarToggles,
  PresetLevel,
  StationeryItem,
  ColorOption
} from './types';
import {
  STATIONERY_ITEMS,
  COLOR_OPTIONS,
  resolveItemImageSrc
} from './constants';
import { MysteryPencilCaseSettingsModal } from './MysteryPencilCaseSettingsModal';
import { MysteryPencilCaseInstructionsModal } from './MysteryPencilCaseInstructionsModal';
import {
  Volume2,
  Shuffle,
  RotateCw,
  Check,
  CheckCircle2,
  X,
  XCircle,
  HelpCircle,
  Settings,
  Sparkles,
  ArrowDown,
  ChevronRight,
  Plus,
  RotateCcw
} from 'lucide-react';

interface MysteryPencilCaseGameProps {
  onExit?: () => void;
}

function getIndefiniteArticle(word: string): 'a' | 'an' {
  const w = word.trim().toLowerCase();
  if (w.startsWith('a') || w.startsWith('e') || w.startsWith('i') || w.startsWith('o') || w.startsWith('u')) {
    return 'an';
  }
  return 'a';
}

function formatItemPhraseEn(
  item: StationeryItem,
  quantity: number,
  color: ColorOption,
  hasQuantity: boolean,
  hasColor: boolean
): string {
  if (hasQuantity) {
    const qty = quantity >= 2 ? quantity : 2;
    if (hasColor) {
      return `${qty} ${color.en} ${item.pluralEnglish}`;
    }
    return `${qty} ${item.pluralEnglish}`;
  } else {
    // Singular
    if (hasColor) {
      const art = getIndefiniteArticle(color.en);
      return `${art} ${color.en} ${item.english}`;
    }
    return `${item.article} ${item.english}`;
  }
}

function formatItemPhraseJa(
  item: StationeryItem,
  quantity: number,
  color: ColorOption,
  hasQuantity: boolean,
  hasColor: boolean
): string {
  const noun = item.jaKanji || item.jaHiragana;
  if (hasQuantity) {
    const qty = quantity >= 2 ? quantity : 2;
    if (hasColor) {
      return `${color.jaModifier}${noun}を${qty}${item.counter}`;
    }
    return `${noun}を${qty}${item.counter}`;
  } else {
    // Singular
    if (hasColor) {
      return `${color.jaModifier}${noun}`;
    }
    return noun;
  }
}

export const MysteryPencilCaseGame: React.FC<MysteryPencilCaseGameProps> = ({ onExit }) => {
  const { t } = useLanguage();
  const { isMuted } = useAudio();

  // Modals state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(false);

  // Modular Grammar Toggles
  const [toggles, setToggles] = useState<GrammarToggles>({
    hasQuantity: false,
    hasColor: false,
    hasAnd: true,
    hasBut: true
  });

  // Active preset tracking
  const activePreset = useMemo<PresetLevel>(() => {
    const { hasQuantity, hasColor, hasAnd, hasBut } = toggles;
    if (!hasQuantity && !hasColor && !hasAnd && !hasBut) return 'LEVEL_1_BASIC';
    if (!hasQuantity && !hasColor && hasAnd && hasBut) return 'LEVEL_2_AND_BUT';
    if (hasQuantity && !hasColor && hasAnd && hasBut) return 'LEVEL_3_QUANTITY';
    if (hasQuantity && hasColor && hasAnd && hasBut) return 'LEVEL_4_MASTER';
    return 'CUSTOM';
  }, [toggles]);

  const applyPreset = useCallback((preset: PresetLevel) => {
    if (preset === 'LEVEL_1_BASIC') {
      setToggles({ hasQuantity: false, hasColor: false, hasAnd: false, hasBut: false });
    } else if (preset === 'LEVEL_2_AND_BUT') {
      setToggles({ hasQuantity: false, hasColor: false, hasAnd: true, hasBut: true });
    } else if (preset === 'LEVEL_3_QUANTITY') {
      setToggles({ hasQuantity: true, hasColor: false, hasAnd: true, hasBut: true });
    } else if (preset === 'LEVEL_4_MASTER') {
      setToggles({ hasQuantity: true, hasColor: true, hasAnd: true, hasBut: true });
    }
    soundEffects.playWheelClick();
  }, []);

  // Audio / Speech settings
  const [speechRate, setSpeechRate] = useState<number>(0.86);
  const [autoSpeak, setAutoSpeak] = useState<boolean>(false);
  const [maxQuantity, setMaxQuantity] = useState<number>(4);
  const [activeItemIds, setActiveItemIds] = useState<string[]>(() =>
    STATIONERY_ITEMS.map(item => item.id)
  );

  // Guided Choral Mode vs Freeform
  const [isGuidedMode, setIsGuidedMode] = useState<boolean>(true);
  const [guidedStepIndex, setGuidedStepIndex] = useState<number>(0); 
  // 0: Q1 (Ask Yes) -> 1: YES Answer -> 2: Q2 (Ask No) -> 3: NO Answer

  // Round Items State
  const [targetItem, setTargetItem] = useState<StationeryItem>(STATIONERY_ITEMS[0]);
  const [targetQuantity, setTargetQuantity] = useState<number>(2);
  const [targetColor, setTargetColor] = useState<ColorOption>(COLOR_OPTIONS[0]);

  const [andItem, setAndItem] = useState<StationeryItem>(STATIONERY_ITEMS[2]);
  const [andQuantity, setAndQuantity] = useState<number>(2);
  const [andColor, setAndColor] = useState<ColorOption>(COLOR_OPTIONS[1]);

  const [butItem, setButItem] = useState<StationeryItem>(STATIONERY_ITEMS[3]);
  const [butQuantity, setButQuantity] = useState<number>(1);
  const [butColor, setButColor] = useState<ColorOption>(COLOR_OPTIONS[2]);

  // Flipping State (Individual card flipped state: true = Japanese, false = English)
  const [isQuestionFlipped, setIsQuestionFlipped] = useState<boolean>(false);
  const [isYesFlipped, setIsYesFlipped] = useState<boolean>(false);
  const [isNoFlipped, setIsNoFlipped] = useState<boolean>(false);
  const [isBranchFlipped, setIsBranchFlipped] = useState<boolean>(false); // false = YES/NO, true = ある/なし

  // Active word pool
  const activeItems = useMemo(() => {
    const filtered = STATIONERY_ITEMS.filter(it => activeItemIds.includes(it.id));
    return filtered.length > 0 ? filtered : STATIONERY_ITEMS;
  }, [activeItemIds]);

  // Generate a new round
  const generateNewRound = useCallback(() => {
    const pool = activeItems;
    // Pick 3 distinct items
    const shuffledPool = [...pool].sort(() => Math.random() - 0.5);
    const nextTarget = shuffledPool[0];
    const nextAnd = shuffledPool.length > 1 ? shuffledPool[1] : shuffledPool[0];
    const nextBut = shuffledPool.length > 2 ? shuffledPool[2] : (shuffledPool.length > 1 ? shuffledPool[1] : shuffledPool[0]);

    // Pick quantities (2..maxQuantity)
    const nextTargetQty = Math.floor(Math.random() * (maxQuantity - 1)) + 2;
    const nextAndQty = Math.floor(Math.random() * (maxQuantity - 1)) + 2;
    const nextButQty = Math.floor(Math.random() * (maxQuantity - 1)) + 2;

    // Pick distinct colors
    const shuffledColors = [...COLOR_OPTIONS].sort(() => Math.random() - 0.5);
    const nextTargetColor = shuffledColors[0];
    const nextAndColor = shuffledColors[1];
    const nextButColor = shuffledColors[2];

    setTargetItem(nextTarget);
    setTargetQuantity(nextTargetQty);
    setTargetColor(nextTargetColor);

    setAndItem(nextAnd);
    setAndQuantity(nextAndQty);
    setAndColor(nextAndColor);

    setButItem(nextBut);
    setButQuantity(nextButQty);
    setButColor(nextButColor);

    setGuidedStepIndex(0);
    soundEffects.playCardFlip();
  }, [activeItems, maxQuantity]);

  // Initialize on mount
  useEffect(() => {
    generateNewRound();
  }, []);

  // Text builders for English
  const questionEn = useMemo(() => {
    // If color toggle is on, prompt with color
    const phrase = formatItemPhraseEn(targetItem, 1, targetColor, false, toggles.hasColor);
    return `Do you have ${phrase}?`;
  }, [targetItem, targetColor, toggles.hasColor]);

  const yesAnswerEn = useMemo(() => {
    const basePhrase = formatItemPhraseEn(targetItem, targetQuantity, targetColor, toggles.hasQuantity, toggles.hasColor);
    let str = `Yes, I do. I have ${basePhrase}.`;
    if (toggles.hasAnd) {
      const andPhrase = formatItemPhraseEn(andItem, andQuantity, andColor, toggles.hasQuantity, toggles.hasColor);
      str += ` And I have ${andPhrase}!`;
    }
    return str;
  }, [targetItem, targetQuantity, targetColor, andItem, andQuantity, andColor, toggles]);

  const noAnswerEn = useMemo(() => {
    let str = '';
    if (toggles.hasQuantity) {
      const colorPrefix = toggles.hasColor ? `${targetColor.en} ` : '';
      str = `No, I don't. I don't have any ${colorPrefix}${targetItem.pluralEnglish}.`;
    } else {
      const phrase = formatItemPhraseEn(targetItem, 1, targetColor, false, toggles.hasColor);
      str = `No, I don't. I don't have ${phrase}.`;
    }

    if (toggles.hasBut) {
      const butPhrase = formatItemPhraseEn(butItem, butQuantity, butColor, toggles.hasQuantity, toggles.hasColor);
      str += ` But I have ${butPhrase}!`;
    }
    return str;
  }, [targetItem, targetColor, butItem, butQuantity, butColor, toggles]);

  // Japanese sentences for back of cards
  const questionJaText = useMemo(() => {
    const noun = targetItem.jaKanji || targetItem.jaHiragana;
    if (toggles.hasColor) {
      return `${targetColor.jaModifier}${noun}を持っていますか？`;
    }
    return `${noun}を持っていますか？`;
  }, [targetItem, targetColor, toggles.hasColor]);

  const yesAnswerJaText = useMemo(() => {
    const basePhrase = formatItemPhraseJa(targetItem, targetQuantity, targetColor, toggles.hasQuantity, toggles.hasColor);
    let str = `はい、持っています。${basePhrase}を持っています。`;
    if (toggles.hasAnd) {
      const andPhrase = formatItemPhraseJa(andItem, andQuantity, andColor, toggles.hasQuantity, toggles.hasColor);
      str += ` そして、${andPhrase}も持っています！`;
    }
    return str;
  }, [targetItem, targetQuantity, targetColor, andItem, andQuantity, andColor, toggles]);

  const noAnswerJaText = useMemo(() => {
    const noun = targetItem.jaKanji || targetItem.jaHiragana;
    let str = '';
    if (toggles.hasQuantity) {
      str = `いいえ、持っていません。1${targetItem.counter}も持っていません。`;
    } else {
      const colorPrefix = toggles.hasColor ? targetColor.jaModifier : '';
      str = `いいえ、持っていません。${colorPrefix}${noun}は持っていません。`;
    }

    if (toggles.hasBut) {
      const butPhrase = formatItemPhraseJa(butItem, butQuantity, butColor, toggles.hasQuantity, toggles.hasColor);
      str += ` でも、${butPhrase}を持っています！`;
    }
    return str;
  }, [targetItem, targetColor, butItem, butQuantity, butColor, toggles]);

  // Speech helper
  const speakText = useCallback(
    (text: string, isJapanese: boolean = false) => {
      if (isMuted) return;
      speechService.speak(text, {
        lang: isJapanese ? 'ja-JP' : 'en-US',
        rate: isJapanese ? 0.9 : speechRate
      });
    },
    [isMuted, speechRate]
  );

  // Master Flip
  const handleToggleFlipAll = useCallback(() => {
    const nextFlipped = !isQuestionFlipped;
    setIsQuestionFlipped(nextFlipped);
    setIsYesFlipped(nextFlipped);
    setIsNoFlipped(nextFlipped);
    setIsBranchFlipped(nextFlipped);
    soundEffects.playCardFlip();
  }, [isQuestionFlipped]);

  // Guided Choral advance
  const handleAdvanceGuidedStep = useCallback(() => {
    if (!isGuidedMode) {
      generateNewRound();
      return;
    }

    if (guidedStepIndex === 0) {
      // Q1 -> Yes
      setGuidedStepIndex(1);
      soundEffects.playWheelClick();
      if (autoSpeak) speakText(isYesFlipped ? yesAnswerJaText : yesAnswerEn, isYesFlipped);
    } else if (guidedStepIndex === 1) {
      // Yes -> Q2
      setGuidedStepIndex(2);
      soundEffects.playWheelClick();
      if (autoSpeak) speakText(isQuestionFlipped ? questionJaText : questionEn, isQuestionFlipped);
    } else if (guidedStepIndex === 2) {
      // Q2 -> No
      setGuidedStepIndex(3);
      soundEffects.playWheelClick();
      if (autoSpeak) speakText(isNoFlipped ? noAnswerJaText : noAnswerEn, isNoFlipped);
    } else {
      // Finished both -> Next item
      confetti({ particleCount: 30, spread: 50, origin: { y: 0.6 } });
      generateNewRound();
    }
  }, [
    isGuidedMode,
    guidedStepIndex,
    autoSpeak,
    speakText,
    isQuestionFlipped,
    questionJaText,
    questionEn,
    isYesFlipped,
    yesAnswerJaText,
    yesAnswerEn,
    isNoFlipped,
    noAnswerJaText,
    noAnswerEn,
    generateNewRound
  ]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isSettingsOpen || isInstructionsOpen) return;

      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        handleAdvanceGuidedStep();
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        handleToggleFlipAll();
      } else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        generateNewRound();
      } else if (e.key === '1') {
        e.preventDefault();
        applyPreset('LEVEL_1_BASIC');
      } else if (e.key === '2') {
        e.preventDefault();
        applyPreset('LEVEL_2_AND_BUT');
      } else if (e.key === '3') {
        e.preventDefault();
        applyPreset('LEVEL_3_QUANTITY');
      } else if (e.key === '4') {
        e.preventDefault();
        applyPreset('LEVEL_4_MASTER');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isSettingsOpen,
    isInstructionsOpen,
    handleAdvanceGuidedStep,
    handleToggleFlipAll,
    generateNewRound,
    applyPreset
  ]);

  // Focus helper classes
  const isQuestionFocused = isGuidedMode && (guidedStepIndex === 0 || guidedStepIndex === 2);
  const isYesFocused = isGuidedMode && guidedStepIndex === 1;
  const isNoFocused = isGuidedMode && guidedStepIndex === 3;

  // Left Sidebar Content
  const sidebarContent = (
    <div className="flex flex-col justify-between h-full gap-3 text-slate-100">
      <div className="space-y-3">
        {/* Presets */}
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-300 block mb-1.5">
            {t('Preset Challenge Levels', <>チャレンジ<ruby>難易度<rt>なんいど</rt></ruby></>)}
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { id: 'LEVEL_1_BASIC', label: '1. Basic', sub: 'Yes / No only' },
              { id: 'LEVEL_2_AND_BUT', label: '2. +And / +But', sub: 'Adds 2nd item' },
              { id: 'LEVEL_3_QUANTITY', label: '3. +Quantity', sub: 'Numbers & -s' },
              { id: 'LEVEL_4_MASTER', label: '4. Master', sub: 'Color + Qty + All' },
            ].map(p => (
              <button
                key={p.id}
                onClick={() => applyPreset(p.id as PresetLevel)}
                className={`p-2 rounded-xl border text-left transition cursor-pointer ${
                  activePreset === p.id
                    ? 'bg-blue-600/35 border-blue-400 text-white font-black shadow-xs ring-1 ring-blue-400'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="text-xs font-bold truncate">{p.label}</div>
                <div className="text-[9px] text-slate-300 truncate">{p.sub}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 4 Modular Feature Toggles */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-2.5">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-300 block mb-2">
            {t('Grammar Feature Toggles', <>文法<ruby>要素<rt>ようそ</rt></ruby>トグル</>)}
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            {/* Quantity Toggle */}
            <button
              onClick={() => {
                setToggles(p => ({ ...p, hasQuantity: !p.hasQuantity }));
                soundEffects.playWheelClick();
              }}
              className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center justify-between ${
                toggles.hasQuantity
                  ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-black'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              <span>🔢 {t('Quantity', '個数')}</span>
              <span className={`w-2 h-2 rounded-full ${toggles.hasQuantity ? 'bg-amber-400 animate-pulse' : 'bg-slate-600'}`} />
            </button>

            {/* Color Toggle */}
            <button
              onClick={() => {
                setToggles(p => ({ ...p, hasColor: !p.hasColor }));
                soundEffects.playWheelClick();
              }}
              className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center justify-between ${
                toggles.hasColor
                  ? 'bg-rose-500/20 border-rose-500 text-rose-300 font-black'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              <span>🎨 {t('Color', '色')}</span>
              <span className={`w-2 h-2 rounded-full ${toggles.hasColor ? 'bg-rose-400 animate-pulse' : 'bg-slate-600'}`} />
            </button>

            {/* And Toggle */}
            <button
              onClick={() => {
                setToggles(p => ({ ...p, hasAnd: !p.hasAnd }));
                soundEffects.playWheelClick();
              }}
              className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center justify-between ${
                toggles.hasAnd
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-black'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              <span>➕ {t('And...', 'And 追加')}</span>
              <span className={`w-2 h-2 rounded-full ${toggles.hasAnd ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
            </button>

            {/* But Toggle */}
            <button
              onClick={() => {
                setToggles(p => ({ ...p, hasBut: !p.hasBut }));
                soundEffects.playWheelClick();
              }}
              className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center justify-between ${
                toggles.hasBut
                  ? 'bg-purple-500/20 border-purple-500 text-purple-300 font-black'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              <span>🔄 {t('But...', 'But 代案')}</span>
              <span className={`w-2 h-2 rounded-full ${toggles.hasBut ? 'bg-purple-400 animate-pulse' : 'bg-slate-600'}`} />
            </button>
          </div>
        </div>

        {/* Master Flip Toggle */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-2.5">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-300 block mb-1.5">
            {t('Language Flip (Front / Back)', '日英ウラ表の切替')}
          </span>
          <button
            onClick={handleToggleFlipAll}
            className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-black shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCw size={14} />
            <span>{isQuestionFlipped ? t('Flip All to English (F)', 'すべて英語に戻す (F)') : t('Flip All to 日本語 (F)', 'すべて日本語にする (F)')}</span>
          </button>
        </div>

        {/* Branch Label Flip (YES/NO vs ある/なし) */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-2.5 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300">
            {t('Branch Labels', '分岐の文字')}
          </span>
          <button
            onClick={() => {
              setIsBranchFlipped(p => !p);
              soundEffects.playCardFlip();
            }}
            className="px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs font-black transition cursor-pointer"
          >
            {isBranchFlipped ? 'ある / なし' : 'YES / NO'}
          </button>
        </div>
      </div>

      {/* Bottom Shortcuts */}
      <div className="space-y-2 pt-2 border-t border-slate-800">
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => setIsInstructionsOpen(true)}
            className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <HelpCircle size={14} className="text-amber-400" />
            <span>{t('Tutorial', '遊び方')}</span>
          </button>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Settings size={14} className="text-blue-400" />
            <span>{t('Settings', '設定')}</span>
          </button>
        </div>

        <div className="px-2.5 py-1.5 rounded-xl bg-slate-950/40 border border-slate-800/80 text-[10px] text-slate-300 flex items-center justify-between">
          <span><kbd className="font-mono text-slate-200">Space</kbd>: {isGuidedMode ? t('Next Step', '次のステップ') : t('Next Card', '次のカード')}</span>
          <span><kbd className="font-mono text-slate-200">F</kbd>: {t('Flip All', '裏表')}</span>
        </div>
      </div>
    </div>
  );

  // Bottom Stage Action Bar
  const stageActionBar = (
    <div className="w-full flex items-center justify-between gap-2 sm:gap-3 p-2 bg-slate-900/90 dark:bg-slate-900/95 border border-slate-800 rounded-2xl shadow-xl backdrop-blur-md">
      {/* Flip All Button */}
      <button
        onClick={handleToggleFlipAll}
        className="px-3.5 sm:px-4 py-2.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-400 font-bold text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 transition cursor-pointer shrink-0"
        title="Flip all cards between English and Japanese (F)"
      >
        <RotateCw size={16} />
        <span className="hidden sm:inline">{isQuestionFlipped ? 'English' : '日本語'}</span>
        <span className="text-[10px] opacity-70 hidden md:inline">(F)</span>
      </button>

      {/* Primary Action Button */}
      <button
        onClick={handleAdvanceGuidedStep}
        className="flex-1 py-3 px-4 sm:px-6 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:brightness-110 text-white font-black text-sm sm:text-base md:text-lg shadow-lg flex items-center justify-center gap-2 transform active:scale-98 transition cursor-pointer"
      >
        {isGuidedMode ? (
          <>
            <ChevronRight size={20} strokeWidth={2.5} />
            <span>
              {guidedStepIndex === 0 && t('1. PRACTICE YES BRANCH (Space)', '① YESの練習へ (Space)')}
              {guidedStepIndex === 1 && t('2. ASK QUESTION AGAIN (Space)', '② もう一度質問へ (Space)')}
              {guidedStepIndex === 2 && t('3. PRACTICE NO BRANCH (Space)', '③ NOの練習へ (Space)')}
              {guidedStepIndex === 3 && t('4. NEXT ITEM (Space)', '④ つぎの文房具へ (Space)')}
            </span>
          </>
        ) : (
          <>
            <Shuffle size={20} strokeWidth={2.5} />
            <span>{t('NEXT STATIONERY ITEM (Space)', <>つぎの<ruby>文房具<rt>ぶんぼうぐ</rt></ruby>へ (Space)</>)}</span>
          </>
        )}
      </button>

      {/* Shuffle Button */}
      <button
        onClick={generateNewRound}
        className="px-3.5 sm:px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs sm:text-sm flex items-center gap-1.5 transition cursor-pointer shrink-0"
        title="Pick new item randomly (N)"
      >
        <Shuffle size={16} />
        <span className="hidden sm:inline">{t('Random', 'シャッフル')}</span>
      </button>
    </div>
  );

  return (
    <>
      <CinemaStageLayout
        sidebarWidth="compact"
        onExit={onExit}
        title={t('Dialogue Flowchart (Do you have a...?)', <><ruby>質問<rt>しつもん</rt></ruby>フローチャート (Unit 5)</>)}
        badge={
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-500 text-white uppercase tracking-wider">
            FLOWCHART
          </span>
        }
        onOpenSettings={() => setIsSettingsOpen(true)}
        sidebar={sidebarContent}
        stageAction={stageActionBar}
      >
        <div className="w-full h-full flex flex-col justify-between gap-1.5 sm:gap-2 p-1 sm:p-2 overflow-y-auto custom-scrollbar select-none">
          
          {/* Quick Header Toggle Bar */}
          <div className="flex items-center justify-between px-3 py-1.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm shrink-0 flex-nowrap overflow-x-auto no-scrollbar whitespace-nowrap gap-2">
            <div className="flex items-center gap-1.5 flex-nowrap shrink-0">
              <span className="text-[11px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider hidden sm:inline shrink-0">
                {t('Modifiers:', '構文トグル:')}
              </span>
              
              {/* Pill 1: Quantity */}
              <button
                onClick={() => setToggles(p => ({ ...p, hasQuantity: !p.hasQuantity }))}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 shrink-0 ${
                  toggles.hasQuantity
                    ? 'bg-amber-400 text-slate-950 font-black shadow-xs ring-1 ring-amber-400'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>🔢</span>
                <span>{t('Quantity', '個数')}</span>
              </button>

              {/* Pill 2: Color */}
              <button
                onClick={() => setToggles(p => ({ ...p, hasColor: !p.hasColor }))}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 shrink-0 ${
                  toggles.hasColor
                    ? 'bg-rose-500 text-white font-black shadow-xs ring-1 ring-rose-400'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>🎨</span>
                <span>{t('Color', '色')}</span>
              </button>

              {/* Pill 3: And */}
              <button
                onClick={() => setToggles(p => ({ ...p, hasAnd: !p.hasAnd }))}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 shrink-0 ${
                  toggles.hasAnd
                    ? 'bg-emerald-500 text-white font-black shadow-xs ring-1 ring-emerald-400'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>➕</span>
                <span>{t('And...', 'And 追加')}</span>
              </button>

              {/* Pill 4: But */}
              <button
                onClick={() => setToggles(p => ({ ...p, hasBut: !p.hasBut }))}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 shrink-0 ${
                  toggles.hasBut
                    ? 'bg-purple-500 text-white font-black shadow-xs ring-1 ring-purple-400'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>🔄</span>
                <span>{t('But...', 'But 代案')}</span>
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300 shrink-0">
              <span className="px-2 py-0.5 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-mono shrink-0">
                {activePreset}
              </span>
            </div>
          </div>

          {/* =====================================================================
              ROOT NODE: THE QUESTION (BPMN DECISION DIAMOND / QUESTION BOX)
             ===================================================================== */}
          <div className="w-full flex justify-center">
            <div
              onClick={() => {
                setIsQuestionFlipped(p => !p);
                soundEffects.playCardFlip();
              }}
              className={`w-full max-w-2xl rounded-3xl border-3 transition-all duration-300 p-3 sm:p-4 bg-white dark:bg-slate-900 shadow-xl relative cursor-pointer group flex flex-col items-center justify-between text-center ${
                isQuestionFocused
                  ? 'border-blue-500 ring-4 ring-blue-400/40 shadow-blue-500/20 scale-102'
                  : 'border-blue-300 dark:border-blue-800 hover:border-blue-400'
              }`}
            >
              {/* Top Banner */}
              <div className="w-full flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-md bg-blue-500 text-white flex items-center justify-center transform rotate-45 text-[10px] font-black shadow-xs">
                    <span className="transform -rotate-45">◆</span>
                  </span>
                  <span className="text-xs sm:text-sm font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                    {t('QUESTION (みんなでたずねる)', '◆ 質問')}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      speakText(isQuestionFlipped ? questionJaText : questionEn, isQuestionFlipped);
                    }}
                    className="p-1 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-600 dark:text-blue-400 transition"
                    title="Speak"
                  >
                    <Volume2 size={16} />
                  </button>

                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:bg-blue-100 dark:group-hover:bg-blue-950 transition flex items-center gap-1">
                    <RotateCw size={10} />
                    <span>{isQuestionFlipped ? 'EN' : '日本語'}</span>
                  </span>
                </div>
              </div>

              {/* Card Center: Artwork + Sentence */}
              <div className="flex flex-row items-center justify-center gap-3 sm:gap-6 my-1 w-full">
                {/* Visual Card Image */}
                <div className="w-20 sm:w-28 md:w-32 h-20 sm:h-28 md:h-32 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 p-2 shadow-inner flex items-center justify-center shrink-0">
                  <img
                    src={resolveItemImageSrc(targetItem.singularImg)}
                    alt={targetItem.english}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>

                {/* Sentence Display (Front: English, Back: Japanese) */}
                <div className="text-left flex-1 min-w-0">
                  {!isQuestionFlipped ? (
                    <div>
                      <h2 className="text-xl sm:text-2xl md:text-3xl xl:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-snug">
                        <span>Do you have </span>
                        {toggles.hasColor ? (
                          <>
                            <span className="px-1.5 py-0.5 rounded-lg bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300 font-black">
                              {getIndefiniteArticle(targetColor.en)}
                            </span>{' '}
                            <span className={`px-2 py-0.5 rounded-lg font-black ${targetColor.badgeBg}`}>
                              {targetColor.en}
                            </span>{' '}
                            <span className="text-blue-600 dark:text-blue-400 underline decoration-blue-400 decoration-3">
                              {targetItem.english}
                            </span>
                          </>
                        ) : (
                          <>
                            {targetItem.article === 'an' ? (
                              <span className="px-2 py-0.5 rounded-lg bg-amber-400 text-slate-950 font-black shadow-xs ring-2 ring-amber-300">
                                an
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded-lg bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300 font-black">
                                a
                              </span>
                            )}{' '}
                            <span className="text-blue-600 dark:text-blue-400 underline decoration-blue-400 decoration-3">
                              {targetItem.english}
                            </span>
                          </>
                        )}
                        <span>?</span>
                      </h2>
                      <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                        Tap card to flip to Japanese
                      </p>
                    </div>
                  ) : (
                    <div>
                      <h2 className="text-xl sm:text-2xl md:text-3xl xl:text-4xl font-black text-blue-700 dark:text-blue-300 tracking-tight leading-snug">
                        {toggles.hasColor && (
                          <span className="mr-1">{targetColor.jaModifier}</span>
                        )}
                        <RubyText ruby={targetItem.ruby} kanji={targetItem.jaKanji} hiragana={targetItem.jaHiragana} />
                        <span>を持っていますか？</span>
                      </h2>
                      <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                        タップして英語に戻す
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* =====================================================================
              BRANCHING CONNECTOR (FLOWCHART SVG LINES & DECISION BADGES)
             ===================================================================== */}
          <div className="w-full flex items-center justify-center relative my-0.5">
            <div className="w-full max-w-3xl grid grid-cols-2 gap-4 sm:gap-8 px-4">
              
              {/* Left Branch (YES) */}
              <div className="flex flex-col items-center">
                <div className="w-0.5 h-2.5 bg-emerald-400 dark:bg-emerald-600" />
                <button
                  onClick={() => {
                    setIsBranchFlipped(p => !p);
                    soundEffects.playCardFlip();
                  }}
                  className={`px-4 sm:px-6 py-1 rounded-full border-2 font-black text-xs sm:text-sm tracking-wider uppercase shadow-md transition transform hover:scale-105 cursor-pointer flex items-center gap-1.5 ${
                    isYesFocused
                      ? 'bg-emerald-500 text-white border-emerald-400 ring-4 ring-emerald-400/40 animate-bounce'
                      : 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-500 text-emerald-700 dark:text-emerald-300'
                  }`}
                >
                  <CheckCircle2 size={15} />
                  <span>{isBranchFlipped ? 'ある' : 'YES'}</span>
                </button>
                <div className="w-0.5 h-2.5 bg-emerald-400 dark:bg-emerald-600" />
                <ArrowDown size={14} className="text-emerald-500 -mt-1" />
              </div>

              {/* Right Branch (NO) */}
              <div className="flex flex-col items-center">
                <div className="w-0.5 h-2.5 bg-rose-400 dark:bg-rose-600" />
                <button
                  onClick={() => {
                    setIsBranchFlipped(p => !p);
                    soundEffects.playCardFlip();
                  }}
                  className={`px-4 sm:px-6 py-1 rounded-full border-2 font-black text-xs sm:text-sm tracking-wider uppercase shadow-md transition transform hover:scale-105 cursor-pointer flex items-center gap-1.5 ${
                    isNoFocused
                      ? 'bg-rose-500 text-white border-rose-400 ring-4 ring-rose-400/40 animate-bounce'
                      : 'bg-rose-50 dark:bg-rose-950/80 border-rose-500 text-rose-700 dark:text-rose-300'
                  }`}
                >
                  <XCircle size={15} />
                  <span>{isBranchFlipped ? 'なし' : 'NO'}</span>
                </button>
                <div className="w-0.5 h-2.5 bg-rose-400 dark:bg-rose-600" />
                <ArrowDown size={14} className="text-rose-500 -mt-1" />
              </div>

            </div>
          </div>

          {/* =====================================================================
              DESTINATION NODES (AFFIRMATIVE & NEGATIVE ANSWER CARDS)
             ===================================================================== */}
          <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 flex-1 min-h-[220px]">
            
            {/* -------------------------------------------------------------------
                LEFT ANSWER CARD: AFFIRMATIVE (YES PATH)
               ------------------------------------------------------------------- */}
            <div
              onClick={() => {
                setIsYesFlipped(p => !p);
                soundEffects.playCardFlip();
              }}
              className={`rounded-3xl border-3 transition-all duration-300 p-3 sm:p-5 bg-white dark:bg-slate-900 shadow-xl relative cursor-pointer group flex flex-col justify-between items-center text-center ${
                isYesFocused
                  ? 'border-emerald-500 ring-4 ring-emerald-400/40 shadow-emerald-500/20 scale-102'
                  : 'border-emerald-300 dark:border-emerald-800 hover:border-emerald-400'
              }`}
            >
              {/* Header Badge */}
              <div className="w-full flex items-center justify-between mb-1 shrink-0">
                <span className="px-3 py-0.5 rounded-full text-xs font-black bg-emerald-500 text-white flex items-center gap-1 shadow-sm">
                  <Check size={12} strokeWidth={3} />
                  <span>{isBranchFlipped ? 'ある (持っている)' : 'YES, I DO.'}</span>
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      speakText(isYesFlipped ? yesAnswerJaText : yesAnswerEn, isYesFlipped);
                    }}
                    className="p-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-600 dark:text-emerald-400 transition"
                    title="Speak"
                  >
                    <Volume2 size={16} />
                  </button>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-950 transition flex items-center gap-1">
                    <RotateCw size={10} />
                    <span>{isYesFlipped ? 'EN' : '日本語'}</span>
                  </span>
                </div>
              </div>

              {/* Visual Items in Yes Card: Target Item + Optional And Item */}
              <div className="my-auto py-1 flex items-center justify-center gap-2 sm:gap-4 flex-nowrap overflow-x-auto no-scrollbar">
                {/* Target Item Graphic */}
                <div className="flex flex-col items-center">
                  <div className={`w-16 sm:w-20 md:w-24 h-16 sm:h-20 md:h-24 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border-2 p-1.5 shadow-sm flex items-center justify-center relative ${
                    toggles.hasColor ? targetColor.borderClass : 'border-emerald-300 dark:border-emerald-700/60'
                  }`}>
                    <img
                      src={resolveItemImageSrc(toggles.hasQuantity ? targetItem.pluralImg : targetItem.singularImg)}
                      alt={targetItem.english}
                      className="max-h-full max-w-full object-contain"
                    />
                    {toggles.hasQuantity && (
                      <span className="absolute -top-1.5 -left-1.5 px-1.5 py-0.2 rounded-md bg-amber-400 text-slate-950 text-[10px] font-black shadow-xs">
                        {targetQuantity}
                      </span>
                    )}
                    {toggles.hasColor && (
                      <span className={`absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full border-2 border-white shadow-xs ${targetColor.bgClass}`} />
                    )}
                  </div>
                  <span className="text-[10px] font-black text-slate-500 mt-0.5">{targetItem.english}</span>
                </div>

                {/* Optional Plus Graphic for And... */}
                {toggles.hasAnd && (
                  <>
                    <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 font-black flex items-center justify-center text-xs">
                      <Plus size={14} strokeWidth={3} />
                    </div>

                    {/* And Item Graphic */}
                    <div className="flex flex-col items-center">
                      <div className={`w-16 sm:w-20 md:w-24 h-16 sm:h-20 md:h-24 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border-2 p-1.5 shadow-sm flex items-center justify-center relative ${
                        toggles.hasColor ? andColor.borderClass : 'border-emerald-300 dark:border-emerald-700/60'
                      }`}>
                        <img
                          src={resolveItemImageSrc(toggles.hasQuantity ? andItem.pluralImg : andItem.singularImg)}
                          alt={andItem.english}
                          className="max-h-full max-w-full object-contain"
                        />
                        {toggles.hasQuantity && (
                          <span className="absolute -top-1.5 -left-1.5 px-1.5 py-0.2 rounded-md bg-amber-400 text-slate-950 text-[10px] font-black shadow-xs">
                            {andQuantity}
                          </span>
                        )}
                        {toggles.hasColor && (
                          <span className={`absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full border-2 border-white shadow-xs ${andColor.bgClass}`} />
                        )}
                      </div>
                      <span className="text-[10px] font-black text-slate-500 mt-0.5">{andItem.english}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Text Area */}
              <div className="w-full shrink-0">
                {!isYesFlipped ? (
                  <div>
                    <h3 className="text-base sm:text-lg md:text-xl xl:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-snug">
                      <span>Yes, I do. </span>
                      <span>
                        I have{' '}
                        {toggles.hasQuantity && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 font-black mr-1">
                            {targetQuantity}
                          </span>
                        )}
                        {toggles.hasColor && (
                          <span className={`px-1.5 py-0.2 rounded font-black mr-1 ${targetColor.badgeBg}`}>
                            {targetColor.en}
                          </span>
                        )}
                        <span className="text-emerald-600 dark:text-emerald-400 font-black">
                          {toggles.hasQuantity ? targetItem.pluralEnglish : targetItem.english}
                        </span>
                        .
                      </span>

                      {/* And extension sentence */}
                      {toggles.hasAnd && (
                        <span className="text-emerald-700 dark:text-emerald-300 font-black ml-1.5 inline-block">
                          And I have{' '}
                          {toggles.hasQuantity && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 font-black mr-1">
                              {andQuantity}
                            </span>
                          )}
                          {toggles.hasColor && (
                            <span className={`px-1.5 py-0.2 rounded font-black mr-1 ${andColor.badgeBg}`}>
                              {andColor.en}
                            </span>
                          )}
                          <span className="underline decoration-emerald-400">
                            {toggles.hasQuantity ? andItem.pluralEnglish : andItem.english}
                          </span>
                          !
                        </span>
                      )}
                    </h3>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-sm sm:text-base md:text-lg font-black text-emerald-700 dark:text-emerald-300 tracking-tight leading-snug">
                      {yesAnswerJaText}
                    </h3>
                  </div>
                )}
              </div>
            </div>

            {/* -------------------------------------------------------------------
                RIGHT ANSWER CARD: NEGATIVE (NO PATH)
               ------------------------------------------------------------------- */}
            <div
              onClick={() => {
                setIsNoFlipped(p => !p);
                soundEffects.playCardFlip();
              }}
              className={`rounded-3xl border-3 transition-all duration-300 p-3 sm:p-5 bg-white dark:bg-slate-900 shadow-xl relative cursor-pointer group flex flex-col justify-between items-center text-center ${
                isNoFocused
                  ? 'border-rose-500 ring-4 ring-rose-400/40 shadow-rose-500/20 scale-102'
                  : 'border-rose-300 dark:border-rose-800 hover:border-rose-400'
              }`}
            >
              {/* Header Badge */}
              <div className="w-full flex items-center justify-between mb-1 shrink-0">
                <span className="px-3 py-0.5 rounded-full text-xs font-black bg-rose-500 text-white flex items-center gap-1 shadow-sm">
                  <X size={12} strokeWidth={3} />
                  <span>{isBranchFlipped ? 'なし (持っていない)' : "NO, I DON'T."}</span>
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      speakText(isNoFlipped ? noAnswerJaText : noAnswerEn, isNoFlipped);
                    }}
                    className="p-1 rounded-xl bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-600 dark:text-rose-400 transition"
                    title="Speak"
                  >
                    <Volume2 size={16} />
                  </button>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:bg-rose-100 dark:group-hover:bg-rose-950 transition flex items-center gap-1">
                    <RotateCw size={10} />
                    <span>{isNoFlipped ? 'EN' : '日本語'}</span>
                  </span>
                </div>
              </div>

              {/* Visual in No Card */}
              <div className="my-auto py-1 flex items-center justify-center">
                {toggles.hasBut ? (
                  /* Counter Offer Visual */
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-black uppercase text-purple-600 dark:text-purple-400 mb-1">
                      {t('Alternative Offer (代案)', '代わりの文房具')}
                    </span>
                    <div className={`w-16 sm:w-20 md:w-24 h-16 sm:h-20 md:h-24 rounded-2xl bg-white dark:bg-slate-800 border-2 p-1.5 shadow-sm flex items-center justify-center relative ${
                      toggles.hasColor ? butColor.borderClass : 'border-purple-300 dark:border-purple-700/60'
                    }`}>
                      <img
                        src={resolveItemImageSrc(toggles.hasQuantity ? butItem.pluralImg : butItem.singularImg)}
                        alt={butItem.english}
                        className="max-h-full max-w-full object-contain"
                      />
                      {toggles.hasQuantity && (
                        <span className="absolute -top-1.5 -left-1.5 px-1.5 py-0.2 rounded-md bg-amber-400 text-slate-950 text-[10px] font-black shadow-xs">
                          {butQuantity}
                        </span>
                      )}
                      {toggles.hasColor && (
                        <span className={`absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full border-2 border-white shadow-xs ${butColor.bgClass}`} />
                      )}
                    </div>
                    <span className="text-[10px] font-black text-slate-500 mt-0.5">{butItem.english}</span>
                  </div>
                ) : (
                  /* Standard Empty Graphic */
                  <div className="w-16 sm:w-20 md:w-24 h-16 sm:h-20 md:h-24 rounded-2xl bg-rose-50/80 dark:bg-rose-950/30 border-2 border-dashed border-rose-300 dark:border-rose-800 flex flex-col items-center justify-center text-rose-500">
                    <span className="text-3xl sm:text-4xl">🕸️</span>
                    <span className="text-[10px] font-black uppercase mt-1">Empty (なし)</span>
                  </div>
                )}
              </div>

              {/* Text Area */}
              <div className="w-full shrink-0">
                {!isNoFlipped ? (
                  <div>
                    <h3 className="text-base sm:text-lg md:text-xl xl:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-snug">
                      <span>No, I don't. </span>
                      <span>
                        I don't have{' '}
                        {toggles.hasQuantity ? (
                          <>any {toggles.hasColor && <span className={`px-1.5 py-0.2 rounded font-black mr-1 ${targetColor.badgeBg}`}>{targetColor.en}</span>}<span className="text-rose-600 dark:text-rose-400 font-black">{targetItem.pluralEnglish}</span>.</>
                        ) : (
                          <>{toggles.hasColor ? <span className={`px-1.5 py-0.2 rounded font-black mr-1 ${targetColor.badgeBg}`}>{targetColor.en}</span> : `${targetItem.article} `}<span className="text-rose-600 dark:text-rose-400 font-black">{targetItem.english}</span>.</>
                        )}
                      </span>

                      {/* But counter-offer extension */}
                      {toggles.hasBut && (
                        <div className="text-purple-600 dark:text-purple-400 font-black text-sm sm:text-base md:text-lg xl:text-xl mt-1">
                          But I have{' '}
                          {toggles.hasQuantity && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 font-black mr-1">
                              {butQuantity}
                            </span>
                          )}
                          {toggles.hasColor && (
                            <span className={`px-1.5 py-0.2 rounded font-black mr-1 ${butColor.badgeBg}`}>
                              {butColor.en}
                            </span>
                          )}
                          <span className="underline decoration-purple-400">
                            {toggles.hasQuantity ? butItem.pluralEnglish : butItem.english}
                          </span>
                          !
                        </div>
                      )}
                    </h3>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-sm sm:text-base md:text-lg font-black text-rose-700 dark:text-rose-300 tracking-tight leading-snug">
                      {noAnswerJaText}
                    </h3>
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>
      </CinemaStageLayout>

      {/* Settings Modal */}
      <MysteryPencilCaseSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        toggles={toggles}
        setToggles={setToggles}
        speechRate={speechRate}
        setSpeechRate={setSpeechRate}
        autoSpeak={autoSpeak}
        setAutoSpeak={setAutoSpeak}
        maxQuantity={maxQuantity}
        setMaxQuantity={setMaxQuantity}
        activeItemIds={activeItemIds}
        toggleItemId={(id) => {
          setActiveItemIds(prev => prev.includes(id) ? (prev.length > 1 ? prev.filter(x => x !== id) : prev) : [...prev, id]);
        }}
        selectAllItems={() => setActiveItemIds(STATIONERY_ITEMS.map(it => it.id))}
      />

      {/* Instructions Modal */}
      <MysteryPencilCaseInstructionsModal
        isOpen={isInstructionsOpen}
        onClose={() => setIsInstructionsOpen(false)}
        onStartGame={() => {
          setIsInstructionsOpen(false);
          generateNewRound();
        }}
      />
    </>
  );
};
