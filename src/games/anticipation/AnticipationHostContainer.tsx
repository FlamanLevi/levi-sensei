import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  SlidersHorizontal,
  HelpCircle,
  Play,
  SkipForward,
  Eye,
  Trophy,
  Volume2,
  VolumeX,
  CheckCircle2,
  Clock,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { useClassroom } from '@/context/ClassroomContext';
import { useVocabulary } from '@/context/VocabularyContext';
import { useAudio } from '@/context/AudioContext';
import { useLanguage } from '@/context/LanguageContext';
import { useBGM } from '@/hooks/useBGM';
import { getServerTime } from '@/services/rtdbSafe';
import { soundEffects } from '@/services/soundEffects';
import { SCHOOL_CONFIGS } from '@/types/roster';
import { generateUniqueRoomPin } from '@/games/quiz/useQuizRoom';
import { TEAM_PRESETS, TeamId } from '@/games/quiz/types';
import { QuizHostLobby } from '@/games/quiz/host/QuizHostLobby';
import { QuizHostGameOver } from '@/games/quiz/host/QuizHostGameOver';
import { SketchCanvas } from './SketchCanvas';
import { SpiralBoard } from './SpiralBoard';
import { AnticipationInstructionsModal } from './AnticipationInstructionsModal';
import { AnticipationSettingsModal } from './AnticipationSettingsModal';
import { buildAnticipationRounds } from './roundBuilder';
import { useAnticipationRoom } from './useAnticipationRoom';
import {
  AnticipationHostRound,
  AnticipationRoomState,
  AnticipationSettings,
  DEFAULT_ANTICIPATION_SETTINGS,
  PIECE_PRESETS,
  SPIRAL_GOAL_INDEX,
  SPIRAL_NODES,
} from './types';

export type AnticipationHostStep = 'SETUP' | 'LOBBY' | 'PLAYING' | 'GAME_OVER';

interface AnticipationHostContainerProps {
  onExit: () => void;
  onRegisterExit?: (fn: (() => void) | null) => void;
  onStepChange?: (step: AnticipationHostStep) => void;
  isStudentHost?: boolean;
}

export const AnticipationHostContainer: React.FC<AnticipationHostContainerProps> = ({
  onExit,
  onRegisterExit,
  onStepChange,
  isStudentHost = false,
}) => {
  const {
    activeGrade,
    activeUnit,
    activeSchool,
    activeClassId,
    setActiveClassId,
  } = useClassroom();
  const {
    filteredWords,
    scopedWords,
    gradeWords,
    allWords,
    ensureCluesLoaded,
  } = useVocabulary();
  const { isMuted: isAudioMuted, playWordAudio } = useAudio();
  const { t, language } = useLanguage();

  const [step, setStep] = useState<AnticipationHostStep>('SETUP');
  const [isEditingLobby, setIsEditingLobby] = useState<boolean>(false);
  const [isLaunching, setIsLaunching] = useState<boolean>(false);

  const gradeDigit = activeGrade.replace(/\D/g, '') || '5';
  const [classGradeTab, setClassGradeTab] = useState<string>(gradeDigit);
  const [selectedClassId, setSelectedClassId] = useState<string>(() =>
    isStudentHost ? 'TEST' : activeClassId || '5-1'
  );
  const [settings, setSettings] = useState<AnticipationSettings>(() => ({
    ...DEFAULT_ANTICIPATION_SETTINGS,
    schoolId: activeSchool,
    classId: isStudentHost ? 'TEST' : activeClassId || '5-1',
    isStudentHost,
    isTestGame: isStudentHost,
    recordRoster: !isStudentHost,
  }));

  const [hostRounds, setHostRounds] = useState<AnticipationHostRound[]>([]);
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isInstructionsOpen, setIsInstructionsOpen] = useState<boolean>(false);

  const {
    roomCode,
    room,
    error,
    botCount,
    createRoom,
    startGame,
    startRound,
    revealRound,
    endGame,
    resetRoomForNewRound,
    closeRoom,
    kickPlayer,
    changePlayerTeam,
    toggleEyesUp,
    addBots,
    clearBots,
  } = useAnticipationRoom();

  const isDarkHost =
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  void isDarkHost;

  useEffect(() => {
    ensureCluesLoaded();
  }, [ensureCluesLoaded]);

  useEffect(() => {
    onStepChange?.(step);
  }, [step, onStepChange]);

  useEffect(() => {
    setClassGradeTab(gradeDigit);
  }, [gradeDigit]);

  const availableClassesForGrade = useMemo(() => {
    const schoolCfg = SCHOOL_CONFIGS[activeSchool];
    const allClasses = schoolCfg?.classes || ['5-1', '5-2', '6-1', '6-2'];
    const filtered = allClasses.filter((c) => c.startsWith(`${classGradeTab}-`));
    return filtered.length > 0 ? filtered : allClasses.slice(0, 4);
  }, [activeSchool, classGradeTab]);

  // Primary & fallback word pools from active textbook selection
  const primaryPool = useMemo(() => {
    if (filteredWords.length > 0) return filteredWords;
    if (scopedWords.length > 0) return scopedWords;
    return gradeWords;
  }, [filteredWords, scopedWords, gradeWords]);

  const fallbackPool = useMemo(() => {
    return gradeWords.length > 0 ? gradeWords : allWords;
  }, [gradeWords, allWords]);

  // Sync container step with RTDB room status unless teacher clicked Edit Settings from Lobby
  useEffect(() => {
    if (!room || isEditingLobby) return;
    if (room.status === 'LOBBY') setStep('LOBBY');
    else if (room.status === 'ANTICIPATION') setStep('PLAYING');
    else if (room.status === 'GAME_OVER') setStep('GAME_OVER');
  }, [room?.status, isEditingLobby]);

  // Close open room gracefully if teacher exits to hub
  const handleExit = useCallback(async () => {
    if (roomCode) {
      await closeRoom();
    }
    onExit();
  }, [roomCode, closeRoom, onExit]);

  useEffect(() => {
    onRegisterExit?.(handleExit);
    return () => onRegisterExit?.(null);
  }, [handleExit, onRegisterExit]);

  const buildCurrentSettings = useCallback((): AnticipationSettings => {
    const isTest = Boolean(
      isStudentHost || selectedClassId === 'TEST' || !settings.recordRoster
    );
    return {
      ...settings,
      schoolId: activeSchool,
      classId: isTest && !isStudentHost ? 'TEST' : selectedClassId,
      isStudentHost,
      isTestGame: !isStudentHost && isTest,
      recordRoster: !isStudentHost && !isTest,
    };
  }, [settings, activeSchool, selectedClassId, isStudentHost]);

  const handleLaunchOrSave = async () => {
    if (isLaunching) return;
    setIsLaunching(true);
    soundEffects.playTick();
    try {
      const resolvedSettings = buildCurrentSettings();
      const freshRounds = buildAnticipationRounds(
        primaryPool,
        fallbackPool,
        resolvedSettings,
        activeGrade
      );
      setHostRounds(freshRounds);

      if (isEditingLobby && roomCode) {
        const ok = await resetRoomForNewRound(resolvedSettings, freshRounds);
        if (ok) {
          setIsEditingLobby(false);
          setStep('LOBBY');
        }
      } else {
        const pin = await generateUniqueRoomPin({
          isStudentHost,
          isTestGame: resolvedSettings.isTestGame,
          grade: activeGrade,
          classId: resolvedSettings.classId,
        });
        const ok = await createRoom(
          pin,
          activeGrade,
          activeUnit || 'ALL',
          resolvedSettings,
          freshRounds
        );
        if (ok) {
          setIsEditingLobby(false);
          setStep('LOBBY');
        }
      }
    } finally {
      setIsLaunching(false);
    }
  };

  // Music hook while actively sketching
  const {
    isMuted: bgmMuted,
    toggleMute: toggleBgmMute,
    duckBGM,
    currentTrackTitle,
    hasTrack,
  } = useBGM(settings.bgm, step === 'PLAYING' && settings.bgm !== 'none' && !isAudioMuted);

  const antState = (room as (typeof room & { anticipationState?: AnticipationRoomState }) | null)
    ?.anticipationState;
  const currentRound = antState?.currentRound || null;
  const activeHostRound =
    typeof currentRound?.roundIndex === 'number'
      ? hostRounds[currentRound.roundIndex]
      : undefined;

  // Live countdown & auto-reveal when timer finishes OR every connected player answered
  useEffect(() => {
    if (step !== 'PLAYING' || !currentRound || currentRound.phase !== 'DRAWING') {
      return;
    }

    const playersCount = Object.keys(room?.players || {}).length;
    const tick = () => {
      const start = currentRound.roundStartTime || getServerTime();
      const el = Math.max(0, getServerTime() - start);
      setElapsedMs(el);

      const responsesCount = Object.keys(room?.responses || {}).length;
      if (el >= currentRound.drawDurationMs || (playersCount > 0 && responsesCount >= playersCount)) {
        revealRound();
      }
    };

    tick();
    const timer = setInterval(tick, 140);
    return () => clearInterval(timer);
  }, [
    step,
    currentRound?.roundIndex,
    currentRound?.phase,
    currentRound?.roundStartTime,
    currentRound?.drawDurationMs,
    room?.players,
    room?.responses,
    revealRound,
  ]);

  // Play native English pronunciation automatically once when transitioning into ROUND_REVEAL
  const lastSpokenRevealRef = useRef<number>(-1);
  useEffect(() => {
    if (step !== 'PLAYING' || !currentRound) {
      lastSpokenRevealRef.current = -1;
      return;
    }
    if (
      currentRound.phase === 'ROUND_REVEAL' &&
      currentRound.revealedCard &&
      lastSpokenRevealRef.current !== currentRound.roundIndex
    ) {
      lastSpokenRevealRef.current = currentRound.roundIndex;
      duckBGM(true);
      playWordAudio(currentRound.revealedCard.soundFile, currentRound.revealedCard.english);
      const tId = setTimeout(() => duckBGM(false), 2200);
      return () => clearTimeout(tId);
    }
  }, [step, currentRound?.phase, currentRound?.roundIndex, currentRound?.revealedCard, duckBGM, playWordAudio]);

  const handlePlayAgainSame = async () => {
    const resolvedSettings = buildCurrentSettings();
    const freshRounds = buildAnticipationRounds(
      primaryPool,
      fallbackPool,
      resolvedSettings,
      activeGrade
    );
    setHostRounds(freshRounds);
    const ok = await resetRoomForNewRound(resolvedSettings, freshRounds);
    if (ok) {
      setStep('LOBBY');
    }
  };

  // ============================================================================
  // STEP 1: SETUP VIEW (Landscape 2-Column Single-Viewport Card)
  // ============================================================================
  if (step === 'SETUP') {
    const poolPreview = primaryPool.slice(0, 5);
    const schoolLabel =
      activeSchool === 'toyogaoka'
        ? language === 'ja'
          ? '豊ヶ丘小学校'
          : 'Toyogaoka Elem.'
        : language === 'ja'
        ? '二子玉川小学校'
        : 'Futakotamagawa Elem.';

    return (
      <div className="w-full max-w-6xl mx-auto px-3 sm:px-5 py-2 sm:py-3 flex flex-col gap-3 text-slate-900 dark:text-white">
        {/* Top Setup Action Strip */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-200 dark:border-slate-800 px-4 py-3 shadow-sm flex items-center justify-between gap-3 flex-nowrap">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-indigo-600 text-white flex items-center justify-center text-2xl shadow-md shrink-0">
              ✏️
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-nowrap">
                <h1 className="text-base sm:text-xl font-black tracking-tight truncate">
                  {language === 'ja' ? (
                    <>
                      お<ruby>絵<rt>え</rt></ruby>かき<ruby>推測<rt>すいそく</rt></ruby>＆ボード
                    </>
                  ) : (
                    'Anticipation Sketch & Board'
                  )}
                </h1>
                <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 shrink-0 whitespace-nowrap">
                  {activeGrade} · {activeUnit !== 'ALL' ? activeUnit : t('All Units', '全単元')} ({primaryPool.length})
                </span>
              </div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 truncate">
                {t(
                  'Live progressive sketch & numbered dot reveal for front TV + synced student iPads',
                  '線のスケッチと点つなぎで単語を予想！テレビと生徒iPadがリアルタイム連動！'
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-nowrap">
            {isStudentHost && (
              <button
                type="button"
                onClick={handleExit}
                className="px-3 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-black text-xs flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <X size={15} />
                <span>{t('Back', 'もどる')}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsInstructionsOpen(true)}
              className="px-3 py-2 rounded-2xl bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 font-black text-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <HelpCircle size={15} />
              <span className="hidden sm:inline">{t('How to Play', 'あそびかた')}</span>
            </button>
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="px-3 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-black text-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <SlidersHorizontal size={15} />
              <span className="hidden sm:inline">{t('More Options', '詳細設定')}</span>
            </button>
            <button
              type="button"
              disabled={isLaunching || fallbackPool.length === 0}
              onClick={handleLaunchOrSave}
              className="px-4 sm:px-6 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-indigo-600 hover:brightness-105 active:scale-95 text-white font-black text-xs sm:text-sm shadow-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap"
            >
              <Play size={16} fill="white" />
              <span>
                {isLaunching
                  ? t('Preparing...', '準備中...')
                  : isEditingLobby
                  ? t('Save & Return to Lobby', '変更してロビーへ')
                  : t('Create Classroom Room', 'ルームを作る！')}
              </span>
            </button>
          </div>
        </div>

        {error && (
          <div className="px-4 py-2.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-200 text-xs font-black">
            ⚠️ {error}
          </div>
        )}

        {/* Main 2-Column Setup Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-stretch">
          {/* LEFT WING (7 cols): Target Class Roster + Loop Mode + Player Teams */}
          <div className="lg:col-span-7 flex flex-col gap-3">
            {/* Classroom Roster Selector */}
            {!isStudentHost && (
              <div className="p-3.5 rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 text-xs font-black">
                    <span className="text-lg">
                      {selectedClassId === 'TEST' || !settings.recordRoster ? '🧪' : '🏫'}
                    </span>
                    <span>{schoolLabel}</span>
                    <span className="text-slate-400">·</span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-white font-black text-[11px] ${
                        selectedClassId === 'TEST' || !settings.recordRoster
                          ? 'bg-purple-600'
                          : 'bg-indigo-600'
                      }`}
                    >
                      {selectedClassId === 'TEST' || !settings.recordRoster
                        ? t('🧪 Test (9xxx)', '🧪 お試しテスト (9xxx)')
                        : selectedClassId}
                    </span>
                  </div>

                  <label className="flex items-center gap-1.5 text-xs font-black text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={settings.recordRoster && selectedClassId !== 'TEST'}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setSettings((s) => ({ ...s, recordRoster: checked }));
                        if (checked && selectedClassId === 'TEST') {
                          setSelectedClassId(availableClassesForGrade[0] || activeClassId || '5-1');
                        }
                      }}
                      className="w-4 h-4 rounded text-indigo-600"
                    />
                    <span>{t('Save Attendance & XP', '出席番号・XPを記録')}</span>
                  </label>
                </div>

                {/* Grade Tabs + Class Buttons */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
                  {['1', '2', '3', '4', '5', '6'].map((gNum) => (
                    <button
                      key={gNum}
                      type="button"
                      onClick={() => setClassGradeTab(gNum)}
                      className={`h-7 px-2.5 rounded-lg text-xs font-black cursor-pointer ${
                        classGradeTab === gNum
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {gNum}
                      {language === 'ja' ? '年' : 'G'}
                    </button>
                  ))}
                  <span className="text-slate-300 dark:text-slate-700 mx-1">|</span>
                  {availableClassesForGrade.map((cId) => {
                    const active = selectedClassId === cId && settings.recordRoster;
                    return (
                      <button
                        key={cId}
                        type="button"
                        onClick={() => {
                          setSelectedClassId(cId);
                          setSettings((s) => ({ ...s, recordRoster: true }));
                          if (cId.startsWith(`${gradeDigit}-`)) {
                            setActiveClassId(cId);
                          }
                        }}
                        className={`h-7 px-2.5 rounded-lg text-xs font-black cursor-pointer ${
                          active
                            ? 'bg-indigo-600 text-white ring-2 ring-indigo-300'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {cId}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedClassId('TEST');
                      setSettings((s) => ({ ...s, recordRoster: false }));
                    }}
                    className={`h-7 px-2.5 rounded-lg text-xs font-black cursor-pointer ${
                      selectedClassId === 'TEST' || !settings.recordRoster
                        ? 'bg-purple-600 text-white ring-2 ring-purple-300'
                        : 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                    }`}
                  >
                    🧪 {t('Test (9xxx)', 'テスト (9xxx)')}
                  </button>
                </div>
              </div>
            )}

            {/* Loop Mode Selector */}
            <div className="p-3.5 rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {t('1. Game Loop Style', '1. ゲームの進行スタイル')}
                </span>
                <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                  {t('Switchable anytime before launch', 'どちらも選択可能')}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setSettings((s) => ({ ...s, loopMode: 'SPIRAL_BOARD' }))}
                  className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-start gap-3 ${
                    settings.loopMode === 'SPIRAL_BOARD'
                      ? 'border-amber-500 bg-amber-50/80 dark:bg-amber-950/40 shadow-sm'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60'
                  }`}
                >
                  <span className="text-2xl shrink-0">🌀</span>
                  <div className="min-w-0">
                    <div className="font-black text-sm text-slate-900 dark:text-white">
                      {language === 'ja' ? (
                        <>4<ruby>層<rt>そう</rt></ruby>スパイラル・ボード</>
                      ) : (
                        '4-Level Spiral Board'
                      )}
                    </div>
                    <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300 mt-0.5 leading-snug">
                      {t(
                        'Fast solvers advance tokens inward (1–3 spaces), hit 🚀 Warps & ★ Dot rounds!',
                        '速い正解でコマが1〜3マス前進！ワープ🚀や点つなぎ★で中央ゴールを目指す！'
                      )}
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSettings((s) => ({ ...s, loopMode: 'QUICK_ROUNDS' }))}
                  className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-start gap-3 ${
                    settings.loopMode === 'QUICK_ROUNDS'
                      ? 'border-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/40 shadow-sm'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60'
                  }`}
                >
                  <span className="text-2xl shrink-0">⚡</span>
                  <div className="min-w-0">
                    <div className="font-black text-sm text-slate-900 dark:text-white">
                      {t('Quick Sketch Rounds', 'クイック・スケッチ勝負')}
                    </div>
                    <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300 mt-0.5 leading-snug">
                      {t(
                        'Fast 5-minute sprint! Pure live standings, speed streaks & instant color reveals.',
                        '短時間ウォームアップ向け！純粋なスコア＆スピード順位でテンポよく対戦！'
                      )}
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Teams vs Individual */}
            <div className="p-3.5 rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                {t('2. Teams & Board Pieces', '2. チーム対戦 / 個人戦')}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSettings((s) => ({ ...s, gameMode: 'TEAM' }))}
                  className={`px-3.5 py-2 rounded-xl border-2 font-black text-xs cursor-pointer flex items-center gap-1.5 ${
                    settings.gameMode === 'TEAM'
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'
                  }`}
                >
                  <Users size={14} />
                  <span>{t('Team Tokens (👟🎺🧸🍦)', 'チーム対抗コマ (👟🎺🧸🍦)')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSettings((s) => ({ ...s, gameMode: 'INDIVIDUAL' }))}
                  className={`px-3.5 py-2 rounded-xl border-2 font-black text-xs cursor-pointer ${
                    settings.gameMode === 'INDIVIDUAL'
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/50 text-purple-800 dark:text-purple-200'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'
                  }`}
                >
                  👤 {t('Individual Battle', '個人スコア戦')}
                </button>

                {settings.gameMode === 'TEAM' && (
                  <div className="flex items-center gap-1 ml-auto">
                    {[2, 3, 4].map((cnt) => (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => setSettings((s) => ({ ...s, teamCount: cnt }))}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-black cursor-pointer ${
                          settings.teamCount === cnt
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {cnt}
                        {t('T', '組')}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT WING (5 cols): Sketch Style, Input Mechanic, Timing & Deck Preview */}
          <div className="lg:col-span-5 flex flex-col gap-3">
            <div className="p-3.5 rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              {/* Drawing Style */}
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                  {t('3. Sketch Animation Style', '3. 描き方スタイル')}
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    [
                      { id: 'MIXED', label: t('✨ Mixed', '✨ ミックス') },
                      { id: 'INK_SKETCH', label: t('✒️ Ink Lines', '✒️ スケッチ') },
                      { id: 'CONNECT_DOTS', label: t('🔢 Dots 1–N', '🔢 点つなぎ') },
                    ] as const
                  ).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSettings((s) => ({ ...s, drawStyle: item.id }))}
                      className={`py-2 px-2 rounded-xl border-2 text-xs font-black cursor-pointer ${
                        settings.drawStyle === item.id
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-200'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Guessing Mode */}
              <div>
                <span className="text-xs font-black tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                  {t('4. Student iPad Input', '4. 児童iPadの解答方式')}
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    [
                      { id: 'AUTO_GRADE', label: t('🎓 Auto Grade', '🎓 学年自動') },
                      { id: 'CHOICE_4', label: t('▲ 4-Choice', '▲ 4択カード') },
                      { id: 'SPELLING_TILES', label: t('🔤 Spelling', '🔤 スペル') },
                    ] as const
                  ).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSettings((s) => ({ ...s, inputMode: item.id }))}
                      className={`py-2 px-2 rounded-xl border-2 text-xs font-black cursor-pointer ${
                        settings.inputMode === item.id
                          ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-1">
                  {t(
                    'Auto Grade: G1–G4 use ▲◆●■ 4-Choice; G5–G6 default to Letter Tiles (+ 2.5s wrong lockout).',
                    '学年自動: 小1〜4は▲◆●■4択、小5〜6は文字並べスペル（誤答時2.5秒おてつきロック付）'
                  )}
                </p>
              </div>

              {/* Speed & Rounds */}
              <div className="grid grid-cols-2 gap-2.5 pt-1 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 block mb-1">
                    {t('Sketch Time', '描画秒数')}
                  </span>
                  <div className="grid grid-cols-3 gap-1">
                    {[12, 18, 25].map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => setSettings((s) => ({ ...s, drawDurationSeconds: sec }))}
                        className={`py-1.5 rounded-xl border-2 font-mono text-xs font-black cursor-pointer ${
                          settings.drawDurationSeconds === sec
                            ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200'
                            : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'
                        }`}
                      >
                        {sec}s
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 block mb-1">
                    {t('Rounds', '出題数')}
                  </span>
                  <div className="grid grid-cols-4 gap-1">
                    {[6, 8, 10, 14].map((cnt) => (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => setSettings((s) => ({ ...s, roundCount: cnt }))}
                        className={`py-1.5 rounded-xl border-2 font-mono text-xs font-black cursor-pointer ${
                          settings.roundCount === cnt
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-200'
                            : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'
                        }`}
                      >
                        {cnt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Active Word Pool Preview Card */}
            <div className="p-3.5 rounded-3xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between gap-2 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-700 dark:text-slate-200">
                  📚 {t('Curriculum Word Deck', '出題単語プール')}
                </span>
                <span className="text-xs font-black px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                  {primaryPool.length} {t('words', '語')}
                </span>
              </div>
              {primaryPool.length < 4 && (
                <p className="text-[11px] font-bold text-amber-700 dark:text-amber-300">
                  {t(
                    'Small unit detected — missing distractors mix cleanly from grade vocabulary.',
                    '選択単元の単語数が少ないため、同学年カードから4択のダミーを自動補充します。'
                  )}
                </p>
              )}
              <div className="flex flex-wrap gap-1.5">
                {poolPreview.map((w) => (
                  <span
                    key={w.id}
                    className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-800 dark:text-slate-200"
                  >
                    {w.english}
                  </span>
                ))}
                {primaryPool.length > 5 && (
                  <span className="px-2.5 py-1 rounded-xl bg-slate-200 dark:bg-slate-800 text-xs font-black text-slate-600 dark:text-slate-400">
                    +{primaryPool.length - 5} {t('more', '語')}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <AnticipationInstructionsModal
          isOpen={isInstructionsOpen}
          onClose={() => setIsInstructionsOpen(false)}
        />
        <AnticipationSettingsModal
          isOpen={isSettingsOpen}
          settings={settings}
          onChange={setSettings}
          onClose={() => setIsSettingsOpen(false)}
          showHostOptions={true}
        />
      </div>
    );
  }

  // ============================================================================
  // STEP 2: LOBBY VIEW (Reusing Classroom-Standard QR + Roster + Bot Test Bar)
  // ============================================================================
  if (step === 'LOBBY' && roomCode) {
    return (
      <div className="w-full h-full min-h-0 flex flex-col">
        <QuizHostLobby
          roomCode={roomCode}
          grade={activeGrade}
          unit={activeUnit || 'ALL'}
          schoolId={room?.schoolId || activeSchool}
          classId={room?.classId || selectedClassId}
          gameMode={settings.gameMode}
          gamePlayType="ANTICIPATION"
          teamCount={settings.teamCount}
          activeTeams={room?.activeTeams}
          totalQuestions={settings.roundCount}
          players={room?.players || {}}
          botCount={botCount}
          onAddBots={addBots}
          onClearBots={clearBots}
          onStart={startGame}
          onEditSettings={() => {
            setIsEditingLobby(true);
            setStep('SETUP');
          }}
          onKickPlayer={kickPlayer}
          onChangePlayerTeam={changePlayerTeam}
          eyesUp={room?.eyesUp}
          onToggleEyesUp={toggleEyesUp}
          isStudentHost={isStudentHost}
          onCancel={handleExit}
        />
      </div>
    );
  }

  // ============================================================================
  // STEP 4: GAME OVER PODIUM & DEBRIEF
  // ============================================================================
  if (step === 'GAME_OVER') {
    return (
      <div className="w-full h-full min-h-0 flex flex-col">
        <QuizHostGameOver
          players={room?.players || {}}
          awards={room?.awardedBadges || []}
          troubleWords={room?.troubleWords || {}}
          questions={room?.questions || []}
          schoolId={room?.schoolId || activeSchool}
          classId={room?.classId || selectedClassId}
          gameMode={room?.mode || settings.gameMode}
          teamScores={room?.teamScores}
          boundStudents={room?.boundStudents}
          gamePlayType="ANTICIPATION"
          onPlayAgainSame={handlePlayAgainSame}
          onPlayAgainChange={() => {
            setIsEditingLobby(true);
            setStep('SETUP');
          }}
          onExit={handleExit}
          onDuckBGM={duckBGM}
          analytics={room?.analytics}
        />
      </div>
    );
  }

  // ============================================================================
  // STEP 3: LIVE CLASSROOM STAGE (TV Twin-Pane Layout)
  // ============================================================================
  const playersMap = room?.players || {};
  const playerList = Object.values(playersMap);
  const responsesMap = room?.responses || {};
  const answeredCount = Object.keys(responsesMap).length;
  const roundIdx = currentRound?.roundIndex ?? 0;
  const totalRounds = currentRound?.totalRounds || hostRounds.length || settings.roundCount;
  const drawDurationMs = currentRound?.drawDurationMs || settings.drawDurationSeconds * 1000;
  const isRevealed = currentRound?.phase === 'ROUND_REVEAL';
  const remainingSec = isRevealed
    ? 0
    : Math.max(0, Math.ceil((drawDurationMs - elapsedMs) / 1000));
  const hasMoreRounds = roundIdx + 1 < totalRounds && roundIdx + 1 < hostRounds.length;
  const anyTokenReachedGoal = Object.values(antState?.tokens || {}).some(
    (tk) => (tk.spaceIndex || 0) >= SPIRAL_GOAL_INDEX
  );

  const rankedTeams = (room?.activeTeams || ['team_red', 'team_white', 'team_blue', 'team_green'])
    .slice(0, settings.teamCount || 4)
    .map((tId) => ({
      teamId: tId as TeamId,
      preset: TEAM_PRESETS[tId as TeamId],
      data: room?.teamScores?.[tId as TeamId],
    }))
    .sort((a, b) => (b.data?.score || 0) - (a.data?.score || 0));

  const rankedPlayers = [...playerList].sort((a, b) => (b.score || 0) - (a.score || 0));

  return (
    <div className="w-full h-full min-h-0 max-w-7xl mx-auto flex flex-col gap-2.5 p-2 sm:p-3 text-slate-900 dark:text-white select-none overflow-hidden">
      {/* Top Broadcast Status & Teacher Controls Bar */}
      <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl px-3 py-2 shadow-sm flex items-center justify-between gap-2 shrink-0 flex-nowrap overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2 min-w-0 flex-nowrap">
          {roomCode && (
            <span className="px-2.5 py-1 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-mono font-black text-xs tracking-wider shrink-0">
              PIN {roomCode}
            </span>
          )}
          <span className="px-2.5 py-1 rounded-xl bg-indigo-100 dark:bg-indigo-950/70 text-indigo-800 dark:text-indigo-200 font-black text-xs shrink-0 whitespace-nowrap">
            {t(`Round ${roundIdx + 1} / ${totalRounds}`, `第 ${roundIdx + 1} / ${totalRounds} 問`)}
          </span>
          <span
            className={`px-2.5 py-1 rounded-xl font-mono font-black text-xs flex items-center gap-1 shrink-0 whitespace-nowrap ${
              isRevealed
                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                : remainingSec <= 5
                ? 'bg-rose-500 text-white animate-pulse'
                : 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300'
            }`}
          >
            <Clock size={13} />
            <span>{isRevealed ? t('REVEAL', '答え合わせ') : `${remainingSec}s`}</span>
          </span>
          <span className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 font-black text-xs text-slate-700 dark:text-slate-200 flex items-center gap-1 shrink-0 whitespace-nowrap">
            <CheckCircle2 size={13} className="text-emerald-500" />
            <span>
              {answeredCount} / {playerList.length} {language === 'ja' ? '人回答' : 'replies'}
            </span>
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 flex-nowrap">
          {hasTrack && (
            <button
              type="button"
              onClick={toggleBgmMute}
              title={currentTrackTitle || 'BGM'}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              {bgmMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
            </button>
          )}
          <button
            type="button"
            onClick={() => toggleEyesUp()}
            className={`px-2.5 py-1.5 rounded-xl font-black text-xs border cursor-pointer whitespace-nowrap ${
              room?.eyesUp
                ? 'bg-amber-400 text-slate-950 border-amber-500'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
            }`}
          >
            👀 {room?.eyesUp ? t('Eyes Up ON', '注目中') : t('Eyes Up', '全員注目')}
          </button>
          <button
            type="button"
            onClick={() => setIsInstructionsOpen(true)}
            className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 cursor-pointer"
            title={t('How to Play', 'あそびかた')}
          >
            <HelpCircle size={15} />
          </button>

          {!isRevealed ? (
            <button
              type="button"
              onClick={revealRound}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1 cursor-pointer shadow-sm whitespace-nowrap"
            >
              <Eye size={15} />
              <span>{t('Reveal Answer', '答えを開く')}</span>
            </button>
          ) : hasMoreRounds && !anyTokenReachedGoal ? (
            <button
              type="button"
              onClick={() => startRound(roundIdx + 1)}
              className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs flex items-center gap-1 cursor-pointer shadow-md whitespace-nowrap"
            >
              <span>{t('Next Sketch', 'つぎの絵へ')}</span>
              <SkipForward size={15} />
            </button>
          ) : (
            <button
              type="button"
              onClick={endGame}
              className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1 cursor-pointer shadow-md whitespace-nowrap"
            >
              <Trophy size={15} />
              <span>{t('Finish & Podium', '表彰式へ！')}</span>
            </button>
          )}

          {hasMoreRounds && isRevealed && (
            <button
              type="button"
              onClick={endGame}
              className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-amber-100 text-slate-700 dark:text-slate-200 font-black text-xs cursor-pointer whitespace-nowrap"
            >
              🏁 {t('End Early', '終了')}
            </button>
          )}
          {isStudentHost && (
            <button
              type="button"
              onClick={handleExit}
              className="px-2.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 font-black text-xs flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              <X size={14} />
              <span>{t('Exit', '終了')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main 16:9 Stage: Left Sketch Canvas + Right Board or Standings */}
      {currentRound ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1 min-h-0 overflow-hidden">
          <div className="lg:col-span-7 xl:col-span-8 min-h-0 flex flex-col gap-2">
            <div className="flex-1 min-h-0">
              <SketchCanvas
                wordId={currentRound.wordId}
                wordHintEnglish={
                  currentRound.revealedCard?.english ||
                  activeHostRound?.targetWord.english ||
                  currentRound.wordId
                }
                categoryKey={currentRound.categoryKey}
                categoryNameEn={currentRound.categoryNameEn}
                categoryNameJa={currentRound.categoryNameJa}
                imageUrl={currentRound.imageUrl}
                drawStyle={currentRound.drawStyle}
                roundStartTime={currentRound.roundStartTime}
                drawDurationMs={currentRound.drawDurationMs}
                isRevealed={isRevealed}
                revealedCard={currentRound.revealedCard}
                wordMask={currentRound.wordMask}
                englishLength={currentRound.englishLength}
                isFeatureDots={currentRound.isFeatureDots}
                onPlayAudio={playWordAudio}
              />
            </div>

            {isRevealed && currentRound.firstSolverName && (
              <div className="px-4 py-2 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-between gap-2 shrink-0 shadow-md">
                <span className="flex items-center gap-1.5">
                  <Sparkles size={16} />
                  <span>
                    {t('Fastest Solver:', '最速正解:')} {currentRound.firstSolverName}
                  </span>
                </span>
                <span>
                  {currentRound.solvedCount} / {playerList.length} {language === 'ja' ? '人正解' : 'solved'}
                </span>
              </div>
            )}
          </div>

          <div className="lg:col-span-5 xl:col-span-4 min-h-0">
            {antState?.loopMode === 'SPIRAL_BOARD' ? (
              <SpiralBoard
                tokens={antState.tokens || {}}
                lastDiceEvent={antState.lastDiceEvent}
                highlightTokenId={antState.lastDiceEvent?.pieceId}
              />
            ) : (
              /* Quick Rounds Live Standings Panel */
              <div className="w-full h-full flex flex-col bg-white dark:bg-slate-900 rounded-3xl border-3 border-slate-200 dark:border-slate-800 shadow-lg p-3 overflow-hidden">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800 shrink-0">
                  <span className="font-black text-sm flex items-center gap-1.5">
                    <span>⚡</span>
                    <span>{t('Live Class Standings', 'リアルタイム順位')}</span>
                  </span>
                  <span className="text-xs font-mono font-black text-indigo-600 dark:text-indigo-400">
                    {answeredCount}/{playerList.length}
                  </span>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto space-y-2 py-2">
                  {settings.gameMode === 'TEAM' ? (
                    rankedTeams.map((item, idx) => (
                      <div
                        key={item.teamId}
                        className="p-3 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-mono font-black text-sm w-6 text-slate-500">
                            #{idx + 1}
                          </span>
                          <span className="text-xl">{PIECE_PRESETS[Object.values(antState?.tokens || {}).find((tk) => tk.teamId === item.teamId)?.pieceId || 'shoes']?.emoji || item.preset?.emoji}</span>
                          <span className="font-black text-sm truncate">
                            {language === 'ja' ? item.preset?.jaName : item.preset?.name}
                          </span>
                        </div>
                        <span className="font-mono font-black text-base text-amber-600 dark:text-amber-400 shrink-0">
                          {(item.data?.score || 0).toLocaleString()}
                        </span>
                      </div>
                    ))
                  ) : rankedPlayers.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs font-bold text-slate-400">
                      {t('Waiting for responses...', '回答を待っています...')}
                    </div>
                  ) : (
                    rankedPlayers.slice(0, 8).map((p, idx) => {
                      const hasAnswered = Boolean((responsesMap as any)[p.id]);
                      return (
                        <div
                          key={p.id}
                          className={`px-3 py-2 rounded-2xl border flex items-center justify-between gap-2 ${
                            hasAnswered
                              ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700'
                              : 'bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-mono font-black text-xs w-5 text-slate-500">
                              #{idx + 1}
                            </span>
                            <span className="text-base">{p.avatar || '✏️'}</span>
                            <span className="font-black text-xs sm:text-sm truncate">
                              {p.nickname}
                            </span>
                            {p.currentStreak >= 2 && (
                              <span className="text-[10px] font-black text-orange-500 shrink-0">
                                🔥{p.currentStreak}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {hasAnswered && !isRevealed && (
                              <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-500 text-white">
                                ✓
                              </span>
                            )}
                            <span className="font-mono font-black text-sm text-indigo-600 dark:text-indigo-400">
                              {p.score.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Spiral space preview legend (reused node helper guard so SPIRAL_NODES ref clean) */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center justify-between shrink-0">
                  <span>{t('Speed + Streak = Bonus Pts', 'スピード＋連続正解でボーナス！')}</span>
                  <span>
                    {SPIRAL_NODES.length > 0 ? t('Quick Mode', 'クイック') : ''}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 text-center">
            <div className="text-4xl mb-2 animate-bounce">✏️</div>
            <p className="font-black text-base">{t('Starting sketch round...', 'スケッチを準備中...')}</p>
          </div>
        </div>
      )}

      <AnticipationInstructionsModal
        isOpen={isInstructionsOpen}
        onClose={() => setIsInstructionsOpen(false)}
      />
    </div>
  );
};
