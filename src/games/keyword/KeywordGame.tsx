import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import confetti from 'canvas-confetti';
import { useVocabulary } from '@/context/VocabularyContext';
import { useClassroom } from '@/context/ClassroomContext';
import { useAudio } from '@/context/AudioContext';
import { useLanguage } from '@/context/LanguageContext';
import { soundEffects } from '@/services/soundEffects';
import { VocabularyItem } from '@data/types';
import { resolveCardImage, shuffleArray } from '@/utils/cardUtils';
import {
  Play,
  RotateCcw,
  Trophy,
  Settings,
  BookOpen,
  Wifi,
  Users,
  Smartphone,
  Flame,
  Bot,
  Pause,
  Zap,
  QrCode,
  X,
} from 'lucide-react';
import QRCode from 'qrcode';
import { CinemaStageLayout } from '@/components/common/CinemaStageLayout';
import { KeywordSettingsModal } from './KeywordSettingsModal';
import { KeywordInstructionsModal } from './KeywordInstructionsModal';
import { KeywordStudentPair } from './KeywordStudentPair';
import {
  SpeedLevel,
  KeywordLengthMode,
  KeywordDisplayTier,
  ScoreboardMode,
  FoulPenaltyMode,
  AutopilotConfig,
  SPEED_MAP,
  BodyPose,
  BODY_POSES,
  TEAMS_2,
  TEAMS_4,
  TEAMS_6,
  KeywordPairState,
  REACTION_TIERS,
} from './types';
import { useKeywordRoom, formatDeskPairId } from './useKeywordRoom';

// Re-export types so KeywordSettingsModal.tsx imports continue to work seamlessly
export type {
  SpeedLevel,
  KeywordLengthMode,
  KeywordDisplayTier,
  ScoreboardMode,
  FoulPenaltyMode,
  AutopilotConfig,
};

interface KeywordGameProps {
  onExit?: () => void;
}

export const KeywordGame: React.FC<KeywordGameProps> = ({ onExit }) => {
  const { scopedWords, filteredWords, gradeWords, allWords } = useVocabulary();
  const { activeGrade, activeUnit, userRole, isTeacherUnlocked } = useClassroom();
  const { playWordAudio } = useAudio();
  const { t, language } = useLanguage();

  // Switch between Front TV Host and Student 2-Player iPad Pad
  const [viewMode, setViewMode] = useState<'HOST_TV' | 'STUDENT_PAIR'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (
        params.get('mode') === 'student' ||
        params.get('mode') === 'pair' ||
        params.get('desk') !== null ||
        params.get('pair') === '1'
      ) {
        return 'STUDENT_PAIR';
      }
    }
    if (userRole === 'STUDENT' && !isTeacherUnlocked) {
      return 'STUDENT_PAIR';
    }
    return 'HOST_TV';
  });

  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  // Active word pool: strictly filter out words that do not have valid illustration assets
  const rawPool =
    scopedWords.length >= 3
      ? scopedWords
      : filteredWords.length >= 3
      ? filteredWords
      : gradeWords.length >= 3
      ? gradeWords
      : allWords;

  const wordPool: VocabularyItem[] = useMemo(() => {
    return rawPool.filter((w: VocabularyItem) => {
      const img = resolveCardImage(w, 'picture_only', activeGrade);
      return Boolean(img && img.trim() !== '');
    });
  }, [rawPool, activeGrade]);

  // Game configuration
  const [speed, setSpeed] = useState<SpeedLevel>('normal');
  const [lengthMode, setLengthMode] = useState<KeywordLengthMode>('medium');
  const [displayTier, setDisplayTier] = useState<KeywordDisplayTier>('PICTURE_WORD');
  const [scoreboardMode, setScoreboardMode] = useState<ScoreboardMode>('LIVE_DESKS');
  const [foulPenaltyMode, setFoulPenaltyMode] = useState<FoulPenaltyMode>('AWARD_OPPONENT');
  const [showReactionTiers, setShowReactionTiers] = useState<boolean>(true);
  const [selectedPoseMode, setSelectedPoseMode] = useState<string>('random');
  const [currentRoundPose, setCurrentRoundPose] = useState<BodyPose>(BODY_POSES[0]);
  const [playAudioOnCycle, setPlayAudioOnCycle] = useState<boolean>(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isInstructionsOpen, setIsInstructionsOpen] = useState<boolean>(false);

  // Pillar 4: Hands-Free Autopilot Configuration & Countdown State
  const [autopilotConfig, setAutopilotConfig] = useState<AutopilotConfig>({
    enabled: false,
    poseDelayMs: 3000,
    autoNextRound: false,
    autoNextRoundDelayMs: 5500,
  });
  const [autopilotCountdownSec, setAutopilotCountdownSec] = useState<number | null>(null);

  // Core gameplay states
  const [gameState, setGameState] = useState<'SELECTING' | 'READY' | 'CYCLING' | 'GRAB'>('SELECTING');
  const [keywordItem, setKeywordItem] = useState<VocabularyItem | null>(null);
  const [currentDisplayItem, setCurrentDisplayItem] = useState<VocabularyItem | null>(null);
  const [roundCount, setRoundCount] = useState<number>(0);

  // Flexible Classroom Team Scores
  const [teamScores, setTeamScores] = useState<Record<string, number>>({});

  // RTDB Multiplayer Room Synchronization Hook
  const {
    roomCode,
    pairsMap,
    top3FastestDesks,
    isConnected,
    createRoom,
    setKeyword: syncKeywordToRoom,
    updateRoomConfig,
    setReadyPose: syncReadyPoseToRoom,
    startCycle: syncStartCycleToRoom,
    updateCycleCard: syncCycleCardToRoom,
    triggerKeywordGrab: syncGrabToRoom,
    resetRound: syncResetRoundToRoom,
    resetAllDeskScores,
  } = useKeywordRoom({
    isHost: true,
    grade: activeGrade,
    unit: activeUnit,
  });

  // Cycle interval & Autopilot timer refs
  const cycleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const grabTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autopilotTimerRef = useRef<NodeJS.Timeout | null>(null);
  const cardSequenceRef = useRef<VocabularyItem[]>([]);
  const sequenceIndexRef = useRef<number>(0);

  // Dynamic Adaptive Typography Engine
  const getAdaptiveEnglishClass = (text: string) => {
    const len = text.trim().length;
    if (len >= 22) return 'text-2xl sm:text-4xl md:text-5xl lg:text-6xl leading-tight font-black';
    if (len >= 16) return 'text-3xl sm:text-5xl md:text-6xl lg:text-7xl leading-tight font-black';
    if (len >= 10) return 'text-4xl sm:text-6xl md:text-7xl lg:text-8xl leading-snug font-black';
    return 'text-5xl sm:text-7xl md:text-8xl lg:text-9xl leading-none font-black';
  };

  const getAdaptiveJapaneseClass = (text: string) => {
    const len = text.trim().length;
    if (len >= 12) return 'text-base sm:text-lg md:text-xl font-bold';
    if (len >= 8) return 'text-lg sm:text-2xl md:text-3xl font-bold';
    return 'text-xl sm:text-3xl md:text-4xl font-bold';
  };

  // Initialize room on mount
  useEffect(() => {
    if (!roomCode && wordPool.length > 0) {
      const initialWord = wordPool[Math.floor(Math.random() * wordPool.length)];
      setKeywordItem(initialWord);
      createRoom(undefined, initialWord);
    }
  }, [roomCode, wordPool, createRoom]);

  // Generate QR code for 1-tap iPad camera joining
  useEffect(() => {
    if (!roomCode) return;
    const origin =
      typeof window !== 'undefined'
        ? window.location.origin
        : 'https://levi-sensei.web.app';
    const joinUrl = `${origin}/?game=keyword_game&mode=pair&room=${roomCode}`;
    QRCode.toDataURL(joinUrl, { width: 360, margin: 2 }, (err, url) => {
      if (!err && url) setQrDataUrl(url);
    });
  }, [roomCode]);

  // Sync settings changes to room
  useEffect(() => {
    if (roomCode) {
      updateRoomConfig({
        foulPenaltyMode,
        showReactionTiers,
        displayTier,
        speedMs: SPEED_MAP[speed].ms,
      });
    }
  }, [roomCode, foulPenaltyMode, showReactionTiers, displayTier, speed, updateRoomConfig]);

  // Pick random keyword
  const pickRandomKeyword = useCallback(() => {
    if (wordPool.length === 0) return null;
    const randomItem = wordPool[Math.floor(Math.random() * wordPool.length)];
    setKeywordItem(randomItem);
    soundEffects.playCardFlip();
    syncKeywordToRoom(randomItem, displayTier);
    return randomItem;
  }, [wordPool, syncKeywordToRoom, displayTier]);

  useEffect(() => {
    if (!keywordItem && wordPool.length > 0) {
      pickRandomKeyword();
    }
  }, [wordPool, keywordItem, pickRandomKeyword]);

  // Stop all timers helper
  const clearAllTimers = useCallback(() => {
    if (cycleTimerRef.current) {
      clearInterval(cycleTimerRef.current);
      cycleTimerRef.current = null;
    }
    if (grabTimerRef.current) {
      clearTimeout(grabTimerRef.current);
      grabTimerRef.current = null;
    }
    if (autopilotTimerRef.current) {
      clearInterval(autopilotTimerRef.current);
      autopilotTimerRef.current = null;
    }
    setAutopilotCountdownSec(null);
  }, []);

  useEffect(() => {
    return () => clearAllTimers();
  }, [clearAllTimers]);

  // Trigger the actual card cycling
  const startCycling = useCallback(
    (overrideKeyword?: VocabularyItem) => {
      const targetKeyword = overrideKeyword || keywordItem;
      if (!targetKeyword || wordPool.length === 0) return;

      clearAllTimers();

      const otherWords = wordPool.filter((w) => w.id !== targetKeyword.id);
      const shuffledOthers = shuffleArray(otherWords);

      let targetCount = 5;
      if (lengthMode === 'short') {
        targetCount = Math.floor(Math.random() * 3) + 2; // 2–4 cards
      } else if (lengthMode === 'medium') {
        targetCount = Math.floor(Math.random() * 4) + 4; // 4–7 cards
      } else if (lengthMode === 'long') {
        targetCount = Math.floor(Math.random() * 6) + 7; // 7–12 cards
      }

      const chosenFillers: VocabularyItem[] = [];
      if (shuffledOthers.length > 0) {
        for (let i = 0; i < targetCount; i++) {
          chosenFillers.push(shuffledOthers[i % shuffledOthers.length]);
        }
      }

      const sequence = [...chosenFillers, targetKeyword];
      cardSequenceRef.current = sequence;
      sequenceIndexRef.current = 0;

      setGameState('CYCLING');
      soundEffects.playRaceCountdownBeep(true);

      const intervalMs = SPEED_MAP[speed].ms;

      // Show first card immediately
      const firstItem = sequence[0];
      setCurrentDisplayItem(firstItem);
      syncStartCycleToRoom(firstItem, intervalMs, displayTier);

      if (playAudioOnCycle) {
        playWordAudio(firstItem.sound_file || firstItem.primary_audio, firstItem.english);
      } else {
        soundEffects.playTick();
      }

      cycleTimerRef.current = setInterval(() => {
        sequenceIndexRef.current += 1;
        const nextIndex = sequenceIndexRef.current;

        if (nextIndex < sequence.length) {
          const item = sequence[nextIndex];
          setCurrentDisplayItem(item);

          const isKeyword = item.id === targetKeyword.id;
          syncCycleCardToRoom(item, nextIndex, isKeyword);

          if (isKeyword) {
            if (cycleTimerRef.current) {
              clearInterval(cycleTimerRef.current);
              cycleTimerRef.current = null;
            }
            if (playAudioOnCycle) {
              playWordAudio(item.sound_file || item.primary_audio, item.english);
            } else {
              soundEffects.playTick();
            }

            grabTimerRef.current = setTimeout(() => {
              const nextRound = roundCount + 1;
              setGameState('GRAB');
              setRoundCount(nextRound);
              syncGrabToRoom(item, nextRound);
              soundEffects.playFanfare();
              confetti({
                particleCount: 160,
                spread: 100,
                origin: { y: 0.55 },
              });
            }, 1900);
          } else {
            if (playAudioOnCycle) {
              playWordAudio(item.sound_file || item.primary_audio, item.english);
            } else {
              soundEffects.playTick();
            }
          }
        } else {
          if (cycleTimerRef.current) {
            clearInterval(cycleTimerRef.current);
            cycleTimerRef.current = null;
          }
        }
      }, intervalMs);
    },
    [
      keywordItem,
      wordPool,
      clearAllTimers,
      lengthMode,
      speed,
      displayTier,
      playAudioOnCycle,
      playWordAudio,
      roundCount,
      syncStartCycleToRoom,
      syncCycleCardToRoom,
      syncGrabToRoom,
    ]
  );

  // Start "Hands on..." ready phase (with optional Hands-Free Autopilot countdown)
  const handleReadyPhase = useCallback(
    (forceAutopilot?: boolean, overrideKeyword?: VocabularyItem) => {
      const activeKw = overrideKeyword || keywordItem;
      if (!activeKw) return;
      clearAllTimers();

      let chosenPose = BODY_POSES[0];
      if (selectedPoseMode === 'random') {
        chosenPose = BODY_POSES[Math.floor(Math.random() * BODY_POSES.length)];
        setCurrentRoundPose(chosenPose);
      } else {
        chosenPose = BODY_POSES.find((p) => p.id === selectedPoseMode) || BODY_POSES[0];
        setCurrentRoundPose(chosenPose);
      }

      setGameState('READY');
      setCurrentDisplayItem(null);
      soundEffects.playChime();
      syncReadyPoseToRoom(chosenPose.id, roundCount + 1);

      const shouldAutoRun = forceAutopilot ?? autopilotConfig.enabled;
      if (shouldAutoRun) {
        const totalSec = Math.max(2, Math.round(autopilotConfig.poseDelayMs / 1000));
        setAutopilotCountdownSec(totalSec);
        let remaining = totalSec;

        autopilotTimerRef.current = setInterval(() => {
          remaining -= 1;
          if (remaining > 0) {
            setAutopilotCountdownSec(remaining);
            soundEffects.playRaceCountdownBeep(false);
          } else {
            if (autopilotTimerRef.current) {
              clearInterval(autopilotTimerRef.current);
              autopilotTimerRef.current = null;
            }
            setAutopilotCountdownSec(null);
            startCycling(activeKw);
          }
        }, 1000);
      }
    },
    [
      keywordItem,
      clearAllTimers,
      selectedPoseMode,
      syncReadyPoseToRoom,
      roundCount,
      autopilotConfig.enabled,
      autopilotConfig.poseDelayMs,
      startCycling,
    ]
  );

  // Pillar 4: Auto-chain next round if autopilotConfig.autoNextRound is enabled
  useEffect(() => {
    if (
      gameState === 'GRAB' &&
      autopilotConfig.enabled &&
      autopilotConfig.autoNextRound
    ) {
      const timer = setTimeout(() => {
        const nextKw = pickRandomKeyword();
        if (nextKw) {
          handleReadyPhase(true, nextKw);
        }
      }, autopilotConfig.autoNextRoundDelayMs);
      return () => clearTimeout(timer);
    }
  }, [
    gameState,
    autopilotConfig.enabled,
    autopilotConfig.autoNextRound,
    autopilotConfig.autoNextRoundDelayMs,
    pickRandomKeyword,
    handleReadyPhase,
  ]);

  // Pillar 4: Presentation Clicker & Keyboard Hotkeys (Space, Enter, ArrowRight/PageDown, ArrowLeft/PageUp, 1-6, A, Escape)
  useEffect(() => {
    if (viewMode !== 'HOST_TV' || isSettingsOpen || isInstructionsOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'SELECT' ||
        target.tagName === 'TEXTAREA'
      ) {
        return;
      }

      // Space / Enter / ArrowRight / PageDown: Advance Phase
      if (
        ['Space', 'Enter', 'ArrowRight', 'PageDown'].includes(e.code) ||
        [' ', 'Enter', 'ArrowRight', 'PageDown'].includes(e.key)
      ) {
        e.preventDefault();
        if (gameState === 'SELECTING') {
          handleReadyPhase();
        } else if (gameState === 'READY') {
          startCycling();
        } else if (gameState === 'GRAB') {
          pickRandomKeyword();
          setGameState('SELECTING');
        }
        return;
      }

      // ArrowLeft / PageUp / R: Replay Audio or Return to Pose
      if (
        ['ArrowLeft', 'PageUp', 'KeyR'].includes(e.code) ||
        ['ArrowLeft', 'PageUp', 'r', 'R'].includes(e.key)
      ) {
        e.preventDefault();
        const activeWord = currentDisplayItem || keywordItem;
        if (activeWord) {
          playWordAudio(activeWord.sound_file || activeWord.primary_audio, activeWord.english);
        }
        return;
      }

      // A: Toggle Hands-Free Autopilot
      if (e.code === 'KeyA' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        setAutopilotConfig((prev) => {
          const nextEnabled = !prev.enabled;
          soundEffects.playChime();
          return { ...prev, enabled: nextEnabled };
        });
        return;
      }

      // 1-6: Select Body Pose 1-6 directly
      if (e.key >= '1' && e.key <= '6' && gameState !== 'CYCLING') {
        const poseIdx = parseInt(e.key, 10) - 1;
        const chosenPose = BODY_POSES[poseIdx];
        if (chosenPose) {
          setSelectedPoseMode(chosenPose.id);
          setCurrentRoundPose(chosenPose);
          soundEffects.playCardFlip();
          if (gameState === 'READY') {
            syncReadyPoseToRoom(chosenPose.id, roundCount + 1);
          }
        }
        return;
      }

      // Escape: Pause / Cancel Round
      if (e.key === 'Escape') {
        if (gameState !== 'SELECTING') {
          clearAllTimers();
          setGameState('SELECTING');
          syncResetRoundToRoom(keywordItem);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    viewMode,
    isSettingsOpen,
    isInstructionsOpen,
    gameState,
    handleReadyPhase,
    startCycling,
    pickRandomKeyword,
    currentDisplayItem,
    keywordItem,
    playWordAudio,
    clearAllTimers,
    syncResetRoundToRoom,
    syncReadyPoseToRoom,
    roundCount,
  ]);

  // Score management
  const addTeamPoint = (teamId: string) => {
    setTeamScores((prev) => ({ ...prev, [teamId]: (prev[teamId] || 0) + 1 }));
    soundEffects.playCorrect();
  };

  const resetScores = () => {
    setTeamScores({});
    resetAllDeskScores();
    soundEffects.playChime();
  };

  const currentTeams = useMemo(() => {
    if (scoreboardMode === '2_TEAMS') return TEAMS_2;
    if (scoreboardMode === '4_TEAMS') return TEAMS_4;
    if (scoreboardMode === '6_TEAMS') return TEAMS_6;
    return [];
  }, [scoreboardMode]);

  // Live 18-Desk Classroom Duel Heat Map Aggregation
  const deskList: KeywordPairState[] = useMemo(() => {
    return Array.from({ length: 18 }, (_, i) => {
      const id = formatDeskPairId(i + 1);
      return pairsMap[id];
    }).filter(Boolean);
  }, [pairsMap]);

  const heatMapSummary = useMemo(() => {
    let redWins = 0;
    let blueWins = 0;
    let fouls = 0;
    deskList.forEach((d) => {
      redWins += d.scoreLeft || 0;
      blueWins += d.scoreRight || 0;
      fouls += (d.foulCountLeft || 0) + (d.foulCountRight || 0);
    });
    return { redWins, blueWins, fouls };
  }, [deskList]);

  // If teacher or student switched to the 1-iPad-per-Pair Controller view
  if (viewMode === 'STUDENT_PAIR') {
    return (
      <KeywordStudentPair
        initialRoomCode={roomCode}
        initialDeskNumber={1}
        onExit={() => {
          if (userRole === 'STUDENT' && !isTeacherUnlocked && onExit) {
            onExit();
          } else {
            setViewMode('HOST_TV');
          }
        }}
      />
    );
  }

  const sidebarContent = (
    <div className="flex flex-col gap-2 h-full justify-between">
      {/* 0. Top Action Row: Room PIN, Pair Pad Switch & Autopilot Toggle */}
      <div className="flex flex-col gap-1.5 shrink-0">
        <div className="flex items-center justify-between bg-slate-950/90 px-2.5 py-1.5 rounded-xl border border-indigo-500/40 h-8">
          <div className="flex items-center gap-1.5">
            <Wifi size={13} className={isConnected ? 'text-emerald-400' : 'text-amber-400'} />
            <span className="text-[10px] font-black text-slate-400 uppercase">PIN:</span>
            <span className="text-xs font-mono font-black text-amber-300 tracking-wider">
              {roomCode || 'KW-LIVE'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                soundEffects.playCardFlip();
                setIsQrModalOpen(true);
              }}
              className="px-1.5 py-0.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10px] font-black flex items-center gap-0.5 cursor-pointer transition active:scale-95"
              title={t('Show QR Code for iPad cameras', 'iPadカメラ用QRコードを表示')}
            >
              <QrCode size={11} />
              <span>QR</span>
            </button>
            <button
              type="button"
              onClick={() => {
                soundEffects.playCardFlip();
                setViewMode('STUDENT_PAIR');
              }}
              className="px-2 py-0.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black flex items-center gap-1 cursor-pointer transition active:scale-95"
              title={t('Open 2-Player iPad Pad', 'ペアiPad画面を開く')}
            >
              <Smartphone size={11} />
              <span>{t('Pair Pad', 'ペア画面')}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => {
              setIsInstructionsOpen(true);
              soundEffects.playCardFlip();
            }}
            className="h-8 px-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-black text-[11px] flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
          >
            <BookOpen size={13} className="text-amber-400 shrink-0" />
            <span className="truncate">
              {t('Rules', <><ruby>遊<rt className="text-[7px]">あそ</rt></ruby>び<ruby>方<rt className="text-[7px]">かた</rt></ruby></>)}
            </span>
          </button>

          {/* Hands-Free Autopilot Toggle */}
          <button
            type="button"
            onClick={() => {
              soundEffects.playChime();
              setAutopilotConfig((prev) => ({ ...prev, enabled: !prev.enabled }));
            }}
            className={`h-8 px-2 rounded-xl font-black text-[11px] flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer border ${
              autopilotConfig.enabled
                ? 'bg-emerald-500 text-slate-950 border-emerald-300 shadow-md ring-1 ring-emerald-300'
                : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
            }`}
            title={t('Toggle Hands-Free Autopilot (Key A)', 'ハンズフリー自動進行 (Aキー)')}
          >
            <Bot size={13} />
            <span className="truncate">
              {autopilotConfig.enabled
                ? t('Autopilot ON', '自動 ON')
                : t('Autopilot OFF', '自動 OFF')}
            </span>
          </button>
        </div>
      </div>

      {/* 1. Target Keyword Preview Card */}
      <div className="bg-slate-950/70 rounded-2xl border border-slate-800/80 p-2 flex flex-col gap-1.5 shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
            🎯 {t('Target Keyword', <><ruby>合言葉<rt className="text-[7px]">あいことば</rt></ruby></>)}
          </span>
          {gameState === 'SELECTING' && (
            <button
              onClick={pickRandomKeyword}
              className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 transition cursor-pointer"
            >
              🎲 {t('Random', 'ランダム')}
            </button>
          )}
        </div>

        {keywordItem ? (
          <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-xl border border-slate-800">
            {resolveCardImage(keywordItem, 'picture_only', activeGrade) && (
              <img
                src={resolveCardImage(keywordItem, 'picture_only', activeGrade) || ''}
                alt={keywordItem.english}
                className="w-10 h-10 object-contain bg-white rounded-lg p-0.5 shrink-0"
              />
            )}
            <div className="min-w-0 flex-1">
              <span className="text-xs sm:text-sm font-black text-white truncate block">
                {keywordItem.english}
              </span>
              <span className="text-[11px] font-bold text-amber-400 truncate block">
                {keywordItem.ja_kanji || keywordItem.ja_hiragana}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-xs text-slate-400 italic py-1.5 text-center">
            {t('No keyword chosen', 'キーワード未選択')}
          </div>
        )}
      </div>

      {/* 2. Ready Stance / Pose Card */}
      <div className="bg-slate-950/70 rounded-2xl border border-slate-800/80 p-2 flex flex-col gap-1.5 shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-sky-400 flex items-center gap-1">
            <span>🙆</span>
            <span>
              {t('Ready Pose', <><ruby>体<rt className="text-[7px]">からだ</rt></ruby>のポーズ</>)}
            </span>
          </span>
          <button
            onClick={() => {
              setSelectedPoseMode('random');
              const randomPose = BODY_POSES[Math.floor(Math.random() * BODY_POSES.length)];
              setCurrentRoundPose(randomPose);
              soundEffects.playCardFlip();
            }}
            disabled={gameState === 'CYCLING'}
            className={`text-[10px] font-black px-2 py-0.5 rounded-lg border transition cursor-pointer disabled:opacity-40 ${
              selectedPoseMode === 'random'
                ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-xs'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
            }`}
          >
            🎲 {t('Random', 'ランダム')}
          </button>
        </div>

        {/* 6-Pose Clicker Grid */}
        <div className="grid grid-cols-3 gap-1">
          {BODY_POSES.map((pose, idx) => (
            <button
              key={pose.id}
              onClick={() => {
                setSelectedPoseMode(pose.id);
                setCurrentRoundPose(pose);
                soundEffects.playCardFlip();
              }}
              disabled={gameState === 'CYCLING'}
              className={`py-1 px-1 rounded-xl text-xs font-black border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                selectedPoseMode === pose.id
                  ? 'bg-sky-600 border-sky-400 text-white shadow-xs ring-1 ring-sky-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-850'
              }`}
              title={`${language === 'ja' ? pose.ja : pose.en} (Key ${idx + 1})`}
            >
              <span className="text-xs">{pose.emoji}</span>
              <span className="text-[10px] truncate">
                {language === 'ja' ? pose.jaRuby : pose.en.replace('!', '')}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 3. Live 18-Desk Classroom Pair Duel Heat Map (or Team Scoreboard) */}
      {scoreboardMode !== 'OFF' && scoreboardMode !== 'LIVE_DESKS' ? (
        <div className="flex-1 min-h-0 bg-slate-950/70 rounded-2xl border border-slate-800/80 p-2 flex flex-col justify-between overflow-hidden">
          <div className="flex items-center justify-between mb-1 shrink-0">
            <div className="flex items-center gap-1.5">
              <Trophy size={13} className="text-amber-400" />
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">
                {t('Scoreboard', <><ruby>得点板<rt className="text-[7px]">とくてんばん</rt></ruby></>)}
              </span>
            </div>
            <button
              onClick={resetScores}
              className="text-[10px] text-slate-400 hover:text-rose-400 font-bold flex items-center gap-0.5 cursor-pointer"
            >
              <RotateCcw size={10} /> {t('Reset', 'リセット')}
            </button>
          </div>

          <div
            className={`grid gap-1.5 overflow-y-auto max-h-[200px] custom-scrollbar ${
              scoreboardMode === '2_TEAMS' ? 'grid-cols-1' : 'grid-cols-2'
            }`}
          >
            {currentTeams.map((team) => {
              const score = teamScores[team.id] || 0;
              return (
                <div
                  key={team.id}
                  className={`flex items-center justify-between p-1.5 rounded-xl border ${team.colorBg} ${team.colorBorder}`}
                >
                  <div className="min-w-0 pr-1">
                    <span className={`text-[11px] font-black truncate block ${team.colorText}`}>
                      {language === 'ja' ? team.nameJa : team.nameEn}
                    </span>
                    <span className="text-base font-black text-white leading-none">{score}</span>
                  </div>
                  <button
                    onClick={() => addTeamPoint(team.id)}
                    className={`px-2 py-1 rounded-lg text-white font-black text-xs shadow-xs transition-all active:scale-95 cursor-pointer shrink-0 ${team.btnBg} ${team.btnHover}`}
                  >
                    +1
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Pillar 3: Live 18-Desk Classroom Pair Duel Heat Map with Win Streak Flames */
        <div className="flex-1 min-h-0 bg-slate-950/70 rounded-2xl border border-slate-800/80 p-2 flex flex-col justify-between overflow-hidden">
          <div className="flex items-center justify-between shrink-0 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1">
              <Users size={12} />
              <span>
                {t('18-Desk Duel Heat Map', <>18<ruby>机<rt className="text-[7px]">つくえ</rt></ruby>リアルタイム対戦</>)}
              </span>
            </span>
            <button
              onClick={resetScores}
              className="text-[9px] text-slate-400 hover:text-rose-400 font-bold flex items-center gap-0.5 cursor-pointer"
            >
              <RotateCcw size={9} /> {t('Reset', 'リセット')}
            </button>
          </div>

          {/* 3x6 Compact Bird's-Eye Desk Grid */}
          <div className="grid grid-cols-3 gap-1 flex-1 min-h-0 overflow-y-auto pr-0.5">
            {deskList.map((desk) => {
              const res = desk?.lastResult;
              const isLeftWin = res?.winner === 'LEFT';
              const isRightWin = res?.winner === 'RIGHT';
              const isFoul =
                res?.winner === 'FOUL_LEFT' || res?.winner === 'FOUL_RIGHT';
              const isGodlike = res?.reactionTier === 'GODLIKE';
              const hasStreak = (desk?.streakCount || 0) >= 3;

              return (
                <div
                  key={desk.pairId}
                  className={`rounded-lg px-1.5 py-1 border text-[9px] flex flex-col justify-between transition-all ${
                    isGodlike
                      ? 'bg-amber-500/30 border-yellow-300 text-yellow-100 ring-1 ring-yellow-300 shadow-md'
                      : isLeftWin
                      ? 'bg-rose-600/30 border-rose-400 text-rose-200 shadow-xs'
                      : isRightWin
                      ? 'bg-sky-600/30 border-sky-400 text-sky-200 shadow-xs'
                      : isFoul
                      ? 'bg-amber-500/30 border-amber-400 text-amber-200 animate-pulse'
                      : 'bg-slate-900/80 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between font-black">
                    <span className="flex items-center gap-0.5">
                      <span>D{desk.deskNumber}</span>
                      {hasStreak && (
                        <span
                          className="text-amber-300 flex items-center"
                          title={`${desk.streakCount} Win Streak!`}
                        >
                          🔥{desk.streakCount}
                        </span>
                      )}
                    </span>
                    <span className="text-[8px] font-mono">
                      🔴{desk.scoreLeft}-🔵{desk.scoreRight}
                    </span>
                  </div>
                  <div className="truncate font-mono text-[8px] text-center">
                    {isFoul ? (
                      <span className="text-amber-300 font-black">🟨 FOUL</span>
                    ) : res?.reactionTimeMs ? (
                      <span className="text-white font-black truncate block">
                        {isLeftWin ? '🔴' : '🔵'} {res.reactionTimeMs}ms
                      </span>
                    ) : (
                      <span className="opacity-75 text-[7px] truncate block">
                        {desk.avatarLeft || '🔴'}{desk.nameLeft} vs {desk.avatarRight || '🔵'}{desk.nameRight}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary Tally Bar */}
          <div className="mt-1 pt-1 border-t border-slate-800/80 flex items-center justify-between text-[9px] font-black shrink-0">
            <span className="text-rose-400">🔴 RED: {heatMapSummary.redWins}</span>
            <span className="text-sky-400">🔵 BLUE: {heatMapSummary.blueWins}</span>
            <span className="text-amber-400">🟨 {heatMapSummary.fouls}</span>
          </div>
        </div>
      )}

      {/* 4. Bottom Controls */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-800 shrink-0">
        <span className="text-xs font-bold text-slate-400">
          {t(`Round ${roundCount}`, `第 ${roundCount} 回`)}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setIsInstructionsOpen(true);
              soundEffects.playCardFlip();
            }}
            className="p-1.5 bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/40 rounded-xl text-xs font-bold flex items-center justify-center cursor-pointer transition-all active:scale-95 shrink-0"
            title={t('How to Play', 'あそび方・ルール')}
          >
            <BookOpen size={15} />
          </button>
          <button
            type="button"
            onClick={() => {
              setIsSettingsOpen(true);
              soundEffects.playCardFlip();
            }}
            className="p-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold flex items-center justify-center cursor-pointer transition-all active:scale-95 shrink-0"
            title={t('Game Settings', 'ゲーム設定')}
          >
            <Settings size={15} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <CinemaStageLayout
        sidebarWidth="standard"
        onExit={onExit}
        title={t(
          'Keyword Grab',
          <>
            <ruby>
              合言葉<rt className="text-[7px]">あいことば</rt>
            </ruby>
            ゲーム
          </>
        )}
        badge={
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-slate-950">
            SUPERSTAR A + B
          </span>
        }
        onOpenSettings={() => {
          setIsSettingsOpen(true);
          soundEffects.playCardFlip();
        }}
        sidebar={sidebarContent}
      >
        <div
          className={`relative w-full flex-1 min-h-0 rounded-3xl border-4 sm:border-8 shadow-2xl flex flex-col items-center justify-between p-3 sm:p-5 select-none transition-all duration-300 overflow-hidden ${
            gameState === 'GRAB'
              ? 'bg-gradient-to-b from-rose-500 via-amber-500 to-yellow-400 border-yellow-300 animate-pulse'
              : gameState === 'READY'
              ? 'bg-gradient-to-b from-sky-600 via-blue-700 to-indigo-900 border-sky-400 text-white'
              : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800'
          }`}
        >
          {/* STATE 1: SELECTING KEYWORD */}
          {gameState === 'SELECTING' && (
            <div className="flex flex-col items-center justify-between text-center w-full h-full py-1">
              {keywordItem && (
                <div className="flex-1 w-full flex items-center justify-center p-2 sm:p-4 min-h-0 bg-slate-50 dark:bg-slate-850/80 rounded-2xl border-2 border-amber-200 dark:border-slate-700/60 shadow-inner mb-2 overflow-hidden">
                  {displayTier === 'WORD_ONLY' ? (
                    <div className="flex flex-col items-center justify-center p-4">
                      <span
                        className={`${getAdaptiveEnglishClass(
                          keywordItem.english
                        )} text-slate-900 dark:text-white drop-shadow-md text-center break-words max-w-3xl`}
                      >
                        {keywordItem.english}
                      </span>
                      {(keywordItem.ja_kanji || keywordItem.ja_hiragana) && (
                        <span
                          className={`${getAdaptiveJapaneseClass(
                            keywordItem.ja_kanji || keywordItem.ja_hiragana
                          )} text-amber-600 dark:text-amber-400 mt-3 drop-shadow-sm`}
                        >
                          {keywordItem.ja_kanji || keywordItem.ja_hiragana}
                        </span>
                      )}
                    </div>
                  ) : displayTier === 'PICTURE_WORD' ? (
                    <div className="w-full h-full flex flex-col items-center justify-between min-h-0 p-1">
                      <div className="flex-1 w-full flex items-center justify-center min-h-0 overflow-hidden">
                        <img
                          src={resolveCardImage(keywordItem, 'picture_only', activeGrade) || ''}
                          alt={keywordItem.english}
                          className="max-h-full max-w-full object-contain filter drop-shadow-xl transition-all"
                        />
                      </div>
                      <div className="w-full text-center shrink-0 pt-2 border-t border-amber-200 dark:border-slate-700/60 mt-1">
                        <span
                          className={`${getAdaptiveEnglishClass(
                            keywordItem.english
                          )} text-slate-900 dark:text-white drop-shadow-md text-center block`}
                        >
                          {keywordItem.english}
                        </span>
                        {(keywordItem.ja_kanji || keywordItem.ja_hiragana) && (
                          <span className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400 block mt-0.5">
                            {keywordItem.ja_kanji || keywordItem.ja_hiragana}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <img
                      src={resolveCardImage(keywordItem, 'picture_only', activeGrade) || ''}
                      alt={keywordItem.english}
                      className="max-h-full max-w-full object-contain filter drop-shadow-xl transition-all"
                    />
                  )}
                </div>
              )}

              <div className="w-full text-center shrink-0">
                <p className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 mb-2">
                  {t(
                    `Target keyword set! Take your ready pose or start Hands-Free Autopilot:`,
                    <>
                      合言葉を
                      <ruby>
                        確認<rt className="text-[7px]">かくにん</rt>
                      </ruby>
                      したらポーズをとってスタートしよう！
                    </>
                  )}
                </p>

                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    onClick={() => handleReadyPhase(false)}
                    className="px-8 sm:px-10 py-3 sm:py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-lg sm:text-xl shadow-xl hover:shadow-2xl transition-all cursor-pointer flex items-center justify-center gap-2.5"
                  >
                    <Play size={22} className="fill-slate-950" />
                    <span>
                      {t(
                        'READY! (Take Pose)',
                        <>
                          <ruby>
                            ポーズ<rt className="text-[7px]">ぽーず</rt>
                          </ruby>
                          へ
                          <ruby>
                            進<rt className="text-[7px]">すす</rt>
                          </ruby>
                          む！
                        </>
                      )}
                    </span>
                    <span className="text-xl">{currentRoundPose.emoji}</span>
                  </button>

                  {/* Pillar 4: 1-Click Hands-Free Autopilot Launch */}
                  <button
                    onClick={() => {
                      setAutopilotConfig((prev) => ({ ...prev, enabled: true }));
                      handleReadyPhase(true);
                    }}
                    className="px-6 sm:px-8 py-3 sm:py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-95 text-slate-950 font-black text-base sm:text-lg shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2 border-2 border-emerald-200"
                    title={t(
                      'Automatically counts down pose and cycles cards hands-free!',
                      'ポーズのカウントダウンからカードめくりまで自動で進行します！'
                    )}
                  >
                    <Bot size={22} />
                    <span>
                      {t(
                        'Autopilot START',
                        <>
                          ハンズフリー<ruby>自動開始<rt className="text-[7px]">じどうかいし</rt></ruby>
                        </>
                      )}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STATE 2: READY (Hands on head/knees/shoulders!) */}
          {gameState === 'READY' && (
            <div className="flex flex-col items-center justify-center text-center text-white my-auto space-y-3 sm:space-y-5">
              <div className="text-7xl sm:text-8xl md:text-[120px] animate-bounce">
                {currentRoundPose.emoji}
              </div>
              <div className="space-y-2">
                <h2 className="text-5xl sm:text-7xl md:text-8xl font-black tracking-wider text-yellow-300 drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)] uppercase">
                  {currentRoundPose.en}
                </h2>
                <div className="text-2xl sm:text-4xl md:text-5xl font-black text-white drop-shadow-md">
                  {language === 'ja' ? currentRoundPose.actionJa : currentRoundPose.actionEn}
                </div>
                <p className="text-sm sm:text-xl font-bold text-sky-200 animate-pulse pt-1">
                  👀{' '}
                  {t(
                    'Hands in position! Listen carefully for the keyword...',
                    'ポーズをとって！合言葉を聞き逃すな！'
                  )}
                </p>
              </div>

              {autopilotCountdownSec !== null ? (
                <div className="flex flex-col items-center gap-2 pt-2">
                  <div className="px-8 py-3 rounded-3xl bg-emerald-400 text-slate-950 font-black text-2xl sm:text-3xl shadow-2xl flex items-center gap-3 animate-pulse">
                    <Bot size={28} />
                    <span>
                      {t(
                        `Autopilot Starting in ${autopilotCountdownSec}s...`,
                        `あと ${autopilotCountdownSec}秒 で自動スタート！`
                      )}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      clearAllTimers();
                      startCycling();
                    }}
                    className="text-xs font-bold text-sky-200 underline cursor-pointer"
                  >
                    {t('Skip countdown & Start Now (Space)', '今すぐスタート (Space)')}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => startCycling()}
                  className="mt-2 px-12 sm:px-16 py-3.5 sm:py-5 rounded-3xl bg-yellow-400 hover:bg-yellow-300 active:scale-95 text-slate-950 font-black text-2xl sm:text-4xl shadow-2xl hover:scale-105 transition-all flex items-center gap-3 cursor-pointer mx-auto"
                >
                  <Play size={34} className="fill-slate-950" />
                  <span>START!</span>
                </button>
              )}
            </div>
          )}

          {/* STATE 3: CYCLING (Cards flashing with Adaptive Sizing) */}
          {gameState === 'CYCLING' && currentDisplayItem && (
            <div className="flex flex-col items-center justify-between text-center w-full h-full animate-fade-in py-1">
              <div className="flex-1 w-full flex items-center justify-center p-2 sm:p-4 min-h-0 bg-slate-50 dark:bg-slate-900/80 rounded-2xl border-2 border-slate-200 dark:border-slate-700/60 shadow-inner mb-2 overflow-hidden">
                {displayTier === 'WORD_ONLY' ? (
                  <div className="w-full h-full flex flex-col items-center justify-center p-4">
                    <span
                      className={`${getAdaptiveEnglishClass(
                        currentDisplayItem.english
                      )} text-slate-900 dark:text-white drop-shadow-md text-center break-words max-w-4xl`}
                    >
                      {currentDisplayItem.english}
                    </span>
                    {(currentDisplayItem.ja_kanji || currentDisplayItem.ja_hiragana) && (
                      <span
                        className={`${getAdaptiveJapaneseClass(
                          currentDisplayItem.ja_kanji || currentDisplayItem.ja_hiragana
                        )} text-amber-500 dark:text-amber-400 mt-3 drop-shadow-sm`}
                      >
                        {currentDisplayItem.ja_kanji || currentDisplayItem.ja_hiragana}
                      </span>
                    )}
                  </div>
                ) : displayTier === 'PICTURE_WORD' ? (
                  <div className="w-full h-full flex flex-col items-center justify-between min-h-0 p-1">
                    <div className="flex-1 w-full flex items-center justify-center min-h-0 overflow-hidden">
                      <img
                        src={
                          resolveCardImage(currentDisplayItem, 'picture_only', activeGrade) || ''
                        }
                        alt={currentDisplayItem.english}
                        className="max-h-full max-w-full object-contain filter drop-shadow-2xl transition-all"
                      />
                    </div>
                    <div className="w-full text-center shrink-0 pt-2 border-t border-slate-200 dark:border-slate-700/60 mt-1">
                      <span
                        className={`${getAdaptiveEnglishClass(
                          currentDisplayItem.english
                        )} text-slate-900 dark:text-white drop-shadow-sm leading-tight block truncate`}
                      >
                        {currentDisplayItem.english}
                      </span>
                      {(currentDisplayItem.ja_kanji || currentDisplayItem.ja_hiragana) && (
                        <span className="text-xl sm:text-2xl font-bold text-amber-500 block truncate mt-0.5">
                          {currentDisplayItem.ja_kanji || currentDisplayItem.ja_hiragana}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <img
                    src={resolveCardImage(currentDisplayItem, 'picture_only', activeGrade) || ''}
                    alt={currentDisplayItem.english}
                    className="max-h-full max-w-full object-contain filter drop-shadow-2xl transition-all"
                  />
                )}
              </div>

              <div className="w-full flex items-center justify-between px-2 shrink-0">
                <span className="text-xs font-bold text-slate-400">
                  {currentRoundPose.emoji}{' '}
                  {t(
                    'Keep hands in pose! False start = Opponent Point!',
                    'ポーズをキープ！おてつきは相手にポイント！'
                  )}
                </span>
                <p className="text-xs sm:text-sm font-black text-amber-500 animate-pulse">
                  👀{' '}
                  {t(
                    "Watch & listen carefully! Don't grab yet!",
                    'よく見て・よく聞いて！ まだ取っちゃダメ！'
                  )}
                </p>
                <button
                  onClick={() => {
                    clearAllTimers();
                    setGameState('SELECTING');
                  }}
                  className="text-xs font-bold text-slate-400 hover:text-rose-400 flex items-center gap-1 cursor-pointer"
                >
                  <Pause size={12} />
                  <span>{t('Stop (Esc)', '停止')}</span>
                </button>
              </div>
            </div>
          )}

          {/* STATE 4: GRAB! (Keyword blast + Pillar 3 Top 3 Fastest Reflexes Podium) */}
          {gameState === 'GRAB' && keywordItem && (
            <div className="flex flex-col items-center justify-between text-center text-white w-full h-full z-10 py-1">
              <div className="text-lg sm:text-xl font-black bg-slate-950 text-yellow-300 px-6 py-1 rounded-full uppercase tracking-widest shadow-2xl animate-bounce shrink-0 border border-yellow-400/40">
                {language === 'ja' ? (
                  <>
                    💥{' '}
                    <ruby>
                      合言葉<rt className="text-[9px]">あいことば</rt>
                    </ruby>
                    が
                    <ruby>
                      出<rt className="text-[9px]">で</rt>
                    </ruby>
                    た！ 💥
                  </>
                ) : (
                  <>💥 KEYWORD DETECTED! 💥</>
                )}
              </div>

              {/* Center Stage: Keyword Artwork + Top 3 Fastest Reflexes Podium */}
              <div className="flex-1 w-full flex flex-col lg:flex-row items-center justify-center gap-4 p-1 min-h-0 overflow-hidden">
                {/* Keyword Visual */}
                <div className="flex-1 h-full flex flex-col items-center justify-center min-h-0 overflow-hidden">
                  {displayTier !== 'WORD_ONLY' && (
                    <img
                      src={resolveCardImage(keywordItem, 'picture_only', activeGrade) || ''}
                      alt={keywordItem.english}
                      className="max-h-[55%] max-w-full object-contain filter drop-shadow-[0_15px_30px_rgba(0,0,0,0.6)]"
                    />
                  )}
                  <h2 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-wider text-white drop-shadow-[0_4px_20px_rgba(0,0,0,0.9)] leading-none uppercase mt-1">
                    {language === 'ja' ? (
                      <>
                        <ruby>
                          取<rt className="text-[11px]">と</rt>
                        </ruby>
                        って！！
                      </>
                    ) : (
                      <>GRAB!!</>
                    )}
                  </h2>
                  <span className="text-3xl sm:text-5xl md:text-6xl font-black text-yellow-200 drop-shadow-[0_4px_20px_rgba(0,0,0,0.9)] tracking-wide uppercase leading-tight mt-1">
                    {keywordItem.english}
                  </span>
                </div>

                {/* Pillar 3: Top 3 Fastest Reflexes in Class Podium */}
                {top3FastestDesks.length > 0 && (
                  <div className="w-full lg:w-80 bg-slate-950/90 border-2 border-yellow-300 rounded-3xl p-3 shadow-2xl shrink-0 text-left space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                      <span className="text-xs font-black text-yellow-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Zap size={14} />
                        <span>
                          {t(
                            'Top 3 Fastest Reflexes!',
                            <>
                              クラス<ruby>最速<rt className="text-[7px]">さいそく</rt></ruby>トップ3！
                            </>
                          )}
                        </span>
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {top3FastestDesks.map((entry, idx) => {
                        const medals = ['🥇', '🥈', '🥉'];
                        const tierMeta = REACTION_TIERS[entry.reactionTier];
                        return (
                          <div
                            key={entry.pairId}
                            className="flex items-center justify-between bg-slate-900 px-3 py-1.5 rounded-2xl border border-slate-800"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-lg">{medals[idx]}</span>
                              <div className="min-w-0">
                                <span className="text-xs font-black text-white block truncate">
                                  Desk #{entry.deskNumber}{' '}
                                  {entry.playerAvatar || (entry.winnerSide === 'LEFT' ? '🔴' : '🔵')}{' '}
                                  {entry.playerName} (#{entry.seatNumber})
                                  {entry.partnerName && (
                                    <span className="text-slate-400 font-normal ml-1">
                                      vs {entry.partnerAvatar || ''} {entry.partnerName}
                                    </span>
                                  )}
                                </span>
                                <span className="text-[10px] font-bold text-amber-300 flex items-center gap-1">
                                  <span>{tierMeta.icon}</span>
                                  <span>
                                    {language === 'ja'
                                      ? tierMeta.labelJa
                                      : tierMeta.labelEn}
                                  </span>
                                </span>
                              </div>
                            </div>
                            <span className="font-mono font-black text-sm text-emerald-300 shrink-0">
                              {entry.reactionTimeMs}ms
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Round Actions */}
              <div className="w-full text-center shrink-0">
                <div className="flex items-center justify-center gap-3 mt-1">
                  <button
                    onClick={() => handleReadyPhase()}
                    className="px-6 sm:px-8 py-2.5 sm:py-3 rounded-2xl bg-white hover:bg-slate-100 active:scale-95 text-slate-900 font-black text-sm sm:text-base shadow-xl transition-all cursor-pointer flex items-center gap-2"
                  >
                    <span>🔄</span>
                    <span>
                      {t(
                        'Same Word Again',
                        <>
                          <ruby>
                            同<rt className="text-[7px]">おな</rt>
                          </ruby>
                          じ言葉でもう1回
                        </>
                      )}
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      pickRandomKeyword();
                      setGameState('SELECTING');
                    }}
                    className="px-6 sm:px-8 py-2.5 sm:py-3 rounded-2xl bg-slate-950 hover:bg-slate-900 active:scale-95 text-yellow-300 border-2 border-yellow-300 font-black text-sm sm:text-base shadow-xl transition-all cursor-pointer flex items-center gap-2"
                  >
                    <span>🎲</span>
                    <span>
                      {t(
                        'Next Keyword (Space)',
                        <>
                          <ruby>
                            次<rt className="text-[7px]">つぎ</rt>
                          </ruby>
                          の言葉 (Space)
                        </>
                      )}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </CinemaStageLayout>

      {/* Settings Modal */}
      <KeywordSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        displayTier={displayTier}
        setDisplayTier={setDisplayTier}
        lengthMode={lengthMode}
        setLengthMode={setLengthMode}
        scoreboardMode={scoreboardMode}
        setScoreboardMode={setScoreboardMode}
        speed={speed}
        setSpeed={setSpeed}
        playAudioOnCycle={playAudioOnCycle}
        setPlayAudioOnCycle={setPlayAudioOnCycle}
        foulPenaltyMode={foulPenaltyMode}
        setFoulPenaltyMode={setFoulPenaltyMode}
        showReactionTiers={showReactionTiers}
        setShowReactionTiers={setShowReactionTiers}
        autopilotConfig={autopilotConfig}
        setAutopilotConfig={setAutopilotConfig}
        onResetScores={resetScores}
      />

      {/* Instructions / How to Play Modal */}
      <KeywordInstructionsModal
        isOpen={isInstructionsOpen}
        onClose={() => setIsInstructionsOpen(false)}
      />

      {/* 1-Tap QR Code Modal for Classroom Projector */}
      {isQrModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xs select-none"
          onClick={() => setIsQrModalOpen(false)}
        >
          <div
            className="w-full max-w-sm bg-slate-900 border-4 border-amber-400 text-white rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-sm font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <QrCode size={16} />
                <span>{t('Scan with iPad Camera', 'iPadのカメラでスキャン')}</span>
              </span>
              <button
                onClick={() => setIsQrModalOpen(false)}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {qrDataUrl ? (
              <div className="bg-white p-3 rounded-2xl shadow-xl">
                <img
                  src={qrDataUrl}
                  alt="Room QR Code"
                  className="w-56 h-56 object-contain"
                />
              </div>
            ) : (
              <div className="w-56 h-56 bg-slate-800 rounded-2xl flex items-center justify-center animate-pulse">
                <span>Generating QR...</span>
              </div>
            )}

            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400 block uppercase">
                {t('Classroom Room PIN', 'ルームPINコード')}
              </span>
              <span className="text-3xl font-mono font-black text-amber-300 tracking-widest block">
                {roomCode}
              </span>
              <p className="text-xs font-bold text-slate-300 pt-1">
                {t(
                  'Students scan to automatically join this live duel!',
                  'カメラを向けるだけで自動でペア画面に対戦接続！'
                )}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};