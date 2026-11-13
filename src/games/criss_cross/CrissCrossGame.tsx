import React, { useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { useVocabulary } from '@/context/VocabularyContext';
import { useClassroom } from '@/context/ClassroomContext';
import { useAudio } from '@/context/AudioContext';
import { soundEffects } from '@/services/soundEffects';
import { useLanguage } from '@/context/LanguageContext';
import { useClassroomClicker } from '@/hooks/useClassroomClicker';
import { ClassroomBlackoutShutter } from '@/components/common/ClassroomBlackoutShutter';
import { VocabularyItem } from '@data/types';
import {
  DeskState,
  ClearRule,
  CrissCrossConfig,
  CrissCrossPhase,
  AisleLayout
} from './types';
import {
  initializeDeskGrid,
  pickAvailableSweep,
  sampleVocabularyPrompt
} from './utils';
import { ClassroomDeskGrid } from './ClassroomDeskGrid';
import { CrissCrossPromptModal } from './CrissCrossPromptModal';
import {
  Crosshair,
  RotateCcw
} from 'lucide-react';

interface CrissCrossGameProps {
  onExit?: () => void;
}

export const CrissCrossGame: React.FC<CrissCrossGameProps> = () => {
  const { scopedWords, filteredWords, gradeWords, allWords } = useVocabulary();
  const { activeGrade } = useClassroom();
  const { playPop, playWordAudio } = useAudio();
  const { t } = useLanguage();

  // Configuration
  const [rows, setRows] = useState<number>(6);
  const [cols, setCols] = useState<number>(6);
  const [aisleLayout, setAisleLayout] = useState<AisleLayout>('PAIRED');
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [axisMode, setAxisMode] = useState<CrissCrossConfig['axisMode']>('RANDOM_MIX');
  const [clearRule] = useState<ClearRule>('LINE_CLEARS');

  // State
  const [desks, setDesks] = useState<DeskState[]>(() => initializeDeskGrid(6, 6));
  const [phase, setPhase] = useState<CrissCrossPhase>('IDLE_GRID');
  const [targetedDeskIds, setTargetedDeskIds] = useState<string[]>([]);
  const [activePrompt, setActivePrompt] = useState<VocabularyItem | null>(null);
  const [targetDescription, setTargetDescription] = useState<string>('');
  const [isBlackout, setIsBlackout] = useState<boolean>(false);
  const [roundCounter, setRoundCounter] = useState<number>(0);

  // Vocabulary Pool
  const rawPool = scopedWords.length >= 4
    ? scopedWords
    : (filteredWords.length >= 4 ? filteredWords : (gradeWords.length >= 4 ? gradeWords : allWords));
  const fallbackPool = gradeWords.length >= 4 ? gradeWords : allWords;

  // Initialize or reset game
  const resetGame = useCallback(() => {
    const freshDesks = initializeDeskGrid(rows, cols);
    setDesks(freshDesks);
    setTargetedDeskIds([]);
    setActivePrompt(null);
    setPhase('IDLE_GRID');
    setRoundCounter(0);
    soundEffects.playChime();
  }, [rows, cols]);

  useEffect(() => {
    resetGame();
  }, [resetGame]);

  // Standing / Seated / Empty stats
  const standingCount = desks.filter(d => d.status === 'STANDING').length;
  const seatedCount = desks.filter(d => d.status === 'SEATED').length;
  const emptyCount = desks.filter(d => d.status === 'EMPTY').length;

  // Sweep and pick next line
  const handleTriggerSweep = useCallback(() => {
    if (phase !== 'IDLE_GRID') return;
    const config: CrissCrossConfig = { rows, cols, axisMode, clearRule };
    const sweep = pickAvailableSweep(desks, config);

    if (!sweep) {
      setPhase('ALL_CLEARED');
      soundEffects.playFanfare();
      confetti({ particleCount: 150, spread: 100 });
      return;
    }

    setPhase('SWEEPING');
    soundEffects.playCardFlip();

    // 4 quick audio wheel clicks for sweep sensation
    let tickCount = 0;
    const sweepInterval = setInterval(() => {
      soundEffects.playWheelClick(600 + tickCount * 80);
      tickCount++;
      if (tickCount >= 5) {
        clearInterval(sweepInterval);
        setTargetedDeskIds(sweep.targetedDeskIds);
        setTargetDescription(sweep.descriptionJa);

        // Pick vocabulary prompt
        const promptWord = sampleVocabularyPrompt(rawPool, fallbackPool);
        setActivePrompt(promptWord);
        setPhase('QUESTION_ACTIVE');
        soundEffects.playChime();
      }
    }, 110);
  }, [phase, desks, rows, cols, axisMode, clearRule, rawPool, fallbackPool]);

  // Answer approved: Line or single sits down
  const handleApproveAnswer = useCallback(() => {
    if (phase !== 'QUESTION_ACTIVE' || targetedDeskIds.length === 0) return;

    soundEffects.playCorrect();
    soundEffects.playFanfare();
    confetti({ particleCount: 75, spread: 70 });

    // Update desk state
    const newlySeatedIds = new Set(targetedDeskIds);
    setDesks(prev =>
      prev.map(d => (newlySeatedIds.has(d.id) ? { ...d, status: 'SEATED' } : d))
    );

    setActivePrompt(null);
    setTargetedDeskIds([]);
    setRoundCounter(c => c + 1);

    // Check if whole room is now seated
    const remainingStanding = desks.filter(d => !newlySeatedIds.has(d.id) && d.status === 'STANDING').length;
    if (remainingStanding === 0) {
      setPhase('ALL_CLEARED');
    } else {
      setPhase('IDLE_GRID');
    }
  }, [phase, targetedDeskIds, desks]);

  // Pass line
  const handlePassLine = useCallback(() => {
    setActivePrompt(null);
    setTargetedDeskIds([]);
    setPhase('IDLE_GRID');
    soundEffects.playCardFlip();
  }, []);

  // Manual desk toggle (tap any individual desk to toggle standing/seated, or empty in edit mode)
  const handleManualDeskToggle = useCallback((desk: DeskState) => {
    playPop();
    if (isEditMode) {
      setDesks(prev =>
        prev.map(d =>
          d.id === desk.id
            ? { ...d, status: d.status === 'EMPTY' ? 'STANDING' : 'EMPTY' }
            : d
        )
      );
    } else {
      if (desk.status === 'EMPTY') {
        // Bring back to standing
        setDesks(prev =>
          prev.map(d => (d.id === desk.id ? { ...d, status: 'STANDING' } : d))
        );
      } else {
        setDesks(prev =>
          prev.map(d =>
            d.id === desk.id
              ? { ...d, status: d.status === 'STANDING' ? 'SEATED' : 'STANDING' }
              : d
          )
        );
      }
    }
  }, [isEditMode, playPop]);

  // Replay Audio
  const handlePlayPromptAudio = () => {
    if (activePrompt) {
      playWordAudio(activePrompt.sound_file || activePrompt.primary_audio, activePrompt.english);
    }
  };

  // Clicker support
  useClassroomClicker({
    onNext: () => {
      if (phase === 'IDLE_GRID') handleTriggerSweep();
      else if (phase === 'QUESTION_ACTIVE') handleApproveAnswer();
      else if (phase === 'ALL_CLEARED') resetGame();
    },
    onReplayAudio: handlePlayPromptAudio,
    onBlankScreen: () => setIsBlackout(b => !b)
  });

  return (
    <div className="w-full flex-1 flex flex-col justify-between p-2 sm:p-4 select-none relative font-['UD_Digi_Kyokasho_NP-R','Zen_Maru_Gothic',sans-serif]">
      {/* 1. Header Toolbar */}
      <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-2.5 sm:p-3.5 shadow-md flex flex-nowrap items-center justify-between gap-2.5 mb-2.5 overflow-x-auto no-scrollbar whitespace-nowrap">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-600 text-white flex items-center justify-center text-xl shadow-md shrink-0">
            🎯
          </div>
          <div className="min-w-0">
            <h2 className="text-base sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2 whitespace-nowrap">
              <span>{t("Criss-Cross Q&A", <>クリスクロス・<ruby>全員<rt>ぜんいん</rt></ruby><ruby>着席<rt>ちゃくせき</rt></ruby>ゲーム</>)}</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 shrink-0">
                Stream 🅰️ TV
              </span>
            </h2>
          </div>
        </div>

        {/* Configuration Controls */}
        <div className="flex flex-nowrap items-center gap-1.5 shrink-0 whitespace-nowrap">
          {/* Rows */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 shrink-0">
            <span className="text-slate-600 dark:text-slate-300 px-1">{t("Rows:", <><ruby>行<rt>ぎょう</rt></ruby>:</>)}</span>
            {[4, 5, 6, 7].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRows(r)}
                className={`px-2 py-0.5 rounded-lg font-black transition-all cursor-pointer ${
                  rows === r ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Columns */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 shrink-0">
            <span className="text-slate-600 dark:text-slate-300 px-1">{t("Cols:", <><ruby>列<rt>れつ</rt></ruby>:</>)}</span>
            {[4, 5, 6, 7].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCols(c)}
                className={`px-2 py-0.5 rounded-lg font-black transition-all cursor-pointer ${
                  cols === c ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Walkway Aisle Layout (Paired vs Single) */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 shrink-0">
            <button
              type="button"
              onClick={() => setAisleLayout('PAIRED')}
              className={`px-2 py-0.5 rounded-lg font-black transition-all cursor-pointer ${
                aisleLayout === 'PAIRED' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title={t("Paired columns with walkways in between", "2列ペア＋通路")}
            >
              🚶🚶 {t("Paired", <>2列ペア</>)}
            </button>
            <button
              type="button"
              onClick={() => setAisleLayout('SINGLE')}
              className={`px-2 py-0.5 rounded-lg font-black transition-all cursor-pointer ${
                aisleLayout === 'SINGLE' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title={t("Walkway between every column", "各列通路")}
            >
              🚶 {t("Single", <>各列通路</>)}
            </button>
          </div>

          {/* Edit Empty Desks Toggle */}
          <button
            type="button"
            onClick={() => setIsEditMode((prev) => !prev)}
            className={`px-2.5 py-1 rounded-xl text-xs font-black transition-all cursor-pointer border flex items-center gap-1.5 shrink-0 ${
              isEditMode
                ? 'bg-rose-500 text-white border-rose-400 shadow-md animate-pulse ring-2 ring-rose-300'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
            }`}
          >
            <span>{isEditMode ? '✅' : '✏️'}</span>
            <span>{isEditMode ? t("Done Editing", <>設定完了</>) : t("Set Empty Desks", <><ruby>空席<rt>くうせき</rt></ruby>・<ruby>欠席<rt>けっせき</rt></ruby><ruby>設定<rt>せってい</rt></ruby></>)}</span>
          </button>

          {/* Sweep Mode (Random Mix vs Row vs Col vs Diag) */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 shrink-0">
            <button
              type="button"
              onClick={() => setAxisMode('RANDOM_MIX')}
              className={`px-2 py-0.5 rounded-lg font-black transition-all cursor-pointer ${
                axisMode === 'RANDOM_MIX' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              🎲 {t("Mix", <><ruby>全種<rt>ぜんしゅ</rt></ruby></>)}
            </button>
            <button
              type="button"
              onClick={() => setAxisMode('ROW_ONLY')}
              className={`px-2 py-0.5 rounded-lg font-black transition-all cursor-pointer ${
                axisMode === 'ROW_ONLY' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              ↔️ {t("Row", <><ruby>横列<rt>よこれつ</rt></ruby></>)}
            </button>
            <button
              type="button"
              onClick={() => setAxisMode('COL_ONLY')}
              className={`px-2 py-0.5 rounded-lg font-black transition-all cursor-pointer ${
                axisMode === 'COL_ONLY' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              ↕️ {t("Column", <><ruby>縦班<rt>たてはん</rt></ruby></>)}
            </button>
            <button
              type="button"
              onClick={() => setAxisMode('CRISS_CROSS_ONLY')}
              className={`px-2 py-0.5 rounded-lg font-black transition-all cursor-pointer ${
                axisMode === 'CRISS_CROSS_ONLY' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              ✖️ {t("Diagonal", <><ruby>斜<rt>なな</rt></ruby>め</>)}
            </button>
          </div>

          {/* Reset */}
          <button
            type="button"
            onClick={resetGame}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 transition cursor-pointer shrink-0"
            title="Reset Game"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </div>

      {/* Edit Mode Instruction Banner */}
      {isEditMode && (
        <div className="w-full bg-rose-500/15 border-2 border-rose-500/50 rounded-2xl p-2.5 mb-2 flex flex-nowrap items-center justify-between gap-2 text-xs font-bold text-rose-200 animate-in fade-in">
          <div className="flex items-center gap-2 min-w-0 flex-1 overflow-x-auto no-scrollbar whitespace-nowrap">
            <span className="text-base shrink-0">✏️</span>
            <span>
              {t(
                "Edit Mode: Tap any desk to mark it as Empty / Absent. Tapping again restores it.",
                <>【<ruby>空席<rt>くうせき</rt></ruby><ruby>設定<rt>せってい</rt></ruby>モード】机をタップして「<ruby>空席<rt>くうせき</rt></ruby>・<ruby>欠席<rt>けっせき</rt></ruby>」にできます。<ruby>完了<rt>かんりょう</rt></ruby>したら「<ruby>設定完了<rt>せっていかんりょう</rt></ruby>」を押してください。</>
              )}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsEditMode(false)}
            className="px-3 py-1 rounded-lg bg-rose-600 text-white font-black cursor-pointer shadow-xs shrink-0"
          >
            {t("Done", "完了")}
          </button>
        </div>
      )}

      {/* 2. Main Desk Matrix Stage */}
      <div className="flex-1 bg-slate-900/90 rounded-3xl p-3 sm:p-5 border-4 border-slate-800 shadow-2xl flex flex-col items-center justify-between my-1 relative overflow-hidden">
        {phase === 'ALL_CLEARED' ? (
          /* Victory All Seated Screen */
          <div className="flex flex-col items-center justify-center p-6 text-center animate-in zoom-in-95 duration-300 my-auto">
            <span className="text-7xl sm:text-8xl mb-3 animate-bounce">🪑</span>
            <span className="text-sm font-black uppercase tracking-widest text-emerald-400 mb-1">
              ALL CLEARED • 全員着席完了！
            </span>
            <h3 className="text-3xl sm:text-5xl font-black text-white mb-2">
              {t("Awesome Job! Everyone is Seated!", <><ruby>素晴<rt>すばら</rt></ruby>しい！全員着席クリア！</>)}
            </h3>
            <p className="text-sm sm:text-base font-bold text-slate-300 mb-6">
              {t(`Cleared in ${roundCounter} questions!`, <>{roundCounter} <ruby>問<rt>もん</rt></ruby>で<ruby>全員座<rt>ぜんいんすわ</rt></ruby>れました！</>)}
            </p>
            <button
              type="button"
              onClick={resetGame}
              className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-base shadow-xl hover:scale-105 active:scale-95 transition cursor-pointer"
            >
              🔄 {t("Play Again (All Stand)", <>もう<ruby>一度<rt>いちど</rt></ruby>あそぶ！(<ruby>全員起立<rt>ぜんいんきりつ</rt></ruby>)</>)}
            </button>
          </div>
        ) : (
          /* Classroom Grid View */
          <div className="w-full flex-1 flex flex-col items-center justify-center">
            <ClassroomDeskGrid
              desks={desks}
              rows={rows}
              cols={cols}
              targetedDeskIds={targetedDeskIds}
              isSweeping={phase === 'SWEEPING'}
              aisleLayout={aisleLayout}
              isEditMode={isEditMode}
              onDeskClick={handleManualDeskToggle}
            />
          </div>
        )}

        {/* Master Bottom Action Button */}
        {phase !== 'ALL_CLEARED' && (
          <div className="w-full max-w-xl mx-auto mt-2">
            <button
              type="button"
              onClick={handleTriggerSweep}
              disabled={phase === 'SWEEPING' || standingCount === 0}
              className="w-full py-3.5 sm:py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-base sm:text-lg shadow-xl active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Crosshair size={22} className="animate-spin-slow" />
              <span>
                {t("SPIN / PICK NEXT LINE (Space)", <><ruby>次<rt>つぎ</rt></ruby>の<ruby>列<rt>れつ</rt></ruby>をルーレット！ [Space]</>)}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* 3. Bottom Status Bar */}
      <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl p-2.5 sm:p-3 shadow-md flex flex-nowrap items-center justify-between gap-3 text-xs font-black mt-2 overflow-x-auto no-scrollbar whitespace-nowrap">
        <div className="flex items-center gap-3 shrink-0">
          <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
            <span>🧍</span>
            <span>{t("Standing:", <><ruby>立<rt>た</rt></ruby>っている<ruby>児童<rt>じどう</rt></ruby>:</>)} {standingCount}人</span>
          </span>

          <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
            <span>🪑</span>
            <span>{t("Seated:", <><ruby>着席済<rt>ちゃくせきず</rt></ruby>み:</>)} {seatedCount}人</span>
          </span>

          {emptyCount > 0 && (
            <span className="flex items-center gap-1.5 text-rose-500 dark:text-rose-400">
              <span>🈳</span>
              <span>{t("Empty Desks:", <><ruby>空席<rt>くうせき</rt></ruby>:</>)} {emptyCount}席</span>
            </span>
          )}
        </div>

        <div className="text-[11px] text-slate-600 dark:text-slate-300 font-bold hidden sm:inline shrink-0">
          {isEditMode
            ? t("Edit Mode Active: Click any desk to toggle empty/absent", "空席設定中: 机をクリックして空席・欠席を切替")
            : t("Tap any desk to manually toggle standing/seated", <><ruby>座席<rt>ざせき</rt></ruby>を<ruby>直接<rt>ちょくせつ</rt></ruby>タップして<ruby>個別<rt>こべつ</rt></ruby>に<ruby>着席<rt>ちゃくせき</rt></ruby>/<ruby>起立<rt>きりつ</rt></ruby>を<ruby>変更<rt>へんこう</rt></ruby>できます</>)}
        </div>
      </div>

      {/* 4. Prompt Modal */}
      {phase === 'QUESTION_ACTIVE' && activePrompt && (
        <CrissCrossPromptModal
          card={activePrompt}
          targetDescription={targetDescription}
          grade={activeGrade}
          clearRule={clearRule}
          onApprove={handleApproveAnswer}
          onPass={handlePassLine}
          onPlayAudio={handlePlayPromptAudio}
        />
      )}

      {/* Emergency Blackout Shutter */}
      <ClassroomBlackoutShutter isOpen={isBlackout} onToggle={() => setIsBlackout(b => !b)} />
    </div>
  );
};
