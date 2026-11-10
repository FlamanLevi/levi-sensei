import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Suzuka3DStage,
  RacerState,
  RacerTelemetry,
  CameraViewMode,
  LANE_DRIVING,
  LANE_PASSING,
} from './Suzuka3DStage';
import { getSuzukaCornerSpeedLimit, SUZUKA_CIRCUIT_LENGTH_METERS } from './engine/Suzuka3DEngine';
import {
  stepKartLongitudinalPhysics,
  computeCorrectAnswerBoost,
  selectNextQuestionIndexWithSrs,
  shouldBroadcastTelemetryDelta,
  TelemetrySyncSnapshot,
} from './engine/suzukaPhysics';
import { SuzukaStudentDeck } from './SuzukaStudentDeck';
import { CURRICULUM_UNITS } from './curriculumData';
import {
  KART_THEME_LIST,
  KartThemeId,
  getKartTheme,
  getSavedKartTheme,
  saveSavedKartTheme,
} from './kartPresets';
import { useLanguage } from '@/context/LanguageContext';
import { useClassroom } from '@/context/ClassroomContext';
import { soundEffects } from '@/services/soundEffects';
import { bandwidthGovernor } from '@/services/rtdbSafe';
import { suzukaAudio } from './services/suzukaAudio';
import {
  Trophy,
  Flame,
  Volume2,
  VolumeX,
  RotateCcw,
  Users,
  Flag,
  Tv,
  Tablet,
  Columns,
  Sparkles,
  SlidersHorizontal,
  AlertTriangle,
  Palette,
  BookOpen,
  Wifi,
  Pause,
  Play,
  Award,
} from 'lucide-react';

const BOT_PRESETS: { name: string; number: number; colorHex: number; teamId: string }[] = [
  { name: 'Sato', number: 1, colorHex: 0xef4444, teamId: 'team_red' },
  { name: 'Tanaka', number: 5, colorHex: 0x3b82f6, teamId: 'team_blue' },
  { name: 'Ken', number: 9, colorHex: 0x10b981, teamId: 'team_green' },
  { name: 'Yui', number: 12, colorHex: 0xf59e0b, teamId: 'team_yellow' },
  { name: 'Ren', number: 16, colorHex: 0x8b5cf6, teamId: 'team_purple' },
  { name: 'Hina', number: 21, colorHex: 0xec4899, teamId: 'team_red' },
  { name: 'Daiki', number: 24, colorHex: 0x06b6d4, teamId: 'team_blue' },
  { name: 'Mei', number: 28, colorHex: 0x84cc16, teamId: 'team_green' },
  { name: 'Kaito', number: 31, colorHex: 0xf97316, teamId: 'team_orange' },
  { name: 'Aoi', number: 35, colorHex: 0x6366f1, teamId: 'team_indigo' },
];

export const SuzukaGrandPrixContainer: React.FC = () => {
  const { t } = useLanguage();
  const { exitToHub } = useClassroom();

  const [isMuted, setIsMuted] = useState<boolean>(() => soundEffects.isMuted());
  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    soundEffects.setMuted(next);
    suzukaAudio.setMuted(next);
  };

  // Mode: TV Broadcast | Student Cockpit | Split Screen Preview
  const [prototypeView, setPrototypeView] = useState<'BROADCAST' | 'COCKPIT' | 'SPLIT'>(() => {
    try {
      const v = new URLSearchParams(window.location.search).get('stageView')?.toUpperCase();
      if (v === 'COCKPIT' || v === 'BROADCAST' || v === 'SPLIT') return v;
    } catch {}
    return 'COCKPIT';
  });
  const [cameraMode, setCameraMode] = useState<CameraViewMode>('DIRECTOR');

  // Curriculum Unit & Kart Theme Customization
  const [selectedUnitId, setSelectedUnitId] = useState<string>(CURRICULUM_UNITS[0].id);
  const activeUnit = useMemo(
    () => CURRICULUM_UNITS.find((u) => u.id === selectedUnitId) || CURRICULUM_UNITS[0],
    [selectedUnitId]
  );
  const activeQuestions = activeUnit.questions;

  const [selectedKartThemeId, setSelectedKartThemeId] = useState<KartThemeId>(() =>
    getSavedKartTheme()
  );
  const studentTheme = useMemo(() => getKartTheme(selectedKartThemeId), [selectedKartThemeId]);

  const handleSelectKartTheme = (themeId: KartThemeId) => {
    setSelectedKartThemeId(themeId);
    saveSavedKartTheme(themeId);
  };

  // Configurable Classroom & Mistake Penalty Settings
  const [wrongSpeedLossRatio, setWrongSpeedLossRatio] = useState<number>(0.33);
  const [wrongLockoutSeconds, setWrongLockoutSeconds] = useState<number>(1.0);
  const [scaffoldingLevel, setScaffoldingLevel] = useState<'FULL' | 'PHONICS' | 'CHALLENGE'>('FULL');
  const [networkProfile, setNetworkProfile] = useState<
    'OPTIMAL_LAN' | 'SCHOOL_WIFI_SAVER' | 'THROTTLED_LOW_BW'
  >('SCHOOL_WIFI_SAVER');
  const [activePopover, setActivePopover] = useState<'NONE' | 'GARAGE' | 'SETTINGS'>('NONE');

  // Pause & Podium Victory Modal State
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isVictoryModalOpen, setIsVictoryModalOpen] = useState<boolean>(false);

  // Race Progress & Timer
  const [raceStartTime, setRaceStartTime] = useState<number>(() => Date.now());
  const [lightsCount, setLightsCount] = useState<number>(0);
  const [raceActive, setRaceActive] = useState<boolean>(false);

  // Student State
  const STUDENT_ID = 'player_student';
  const [studentQuestionIdx, setStudentQuestionIdx] = useState<number>(0);
  const [isDrsReviewQuestion, setIsDrsReviewQuestion] = useState<boolean>(false);
  const [studentStreak, setStudentStreak] = useState<number>(0);
  const [studentScore, setStudentScore] = useState<number>(0);
  const [studentSpeed, setStudentSpeed] = useState<number>(0);
  const [studentBoosting, setStudentBoosting] = useState<boolean>(false);
  const [studentInPitStop, setStudentInPitStop] = useState<boolean>(false);
  const [masteredWordIds, setMasteredWordIds] = useState<string[]>([]);
  const [totalAnswered, setTotalAnswered] = useState<number>(0);
  const [correctAnswered, setCorrectAnswered] = useState<number>(0);
  const [liveTelemetry, setLiveTelemetry] = useState<RacerTelemetry[]>([]);

  const studentProgressRef = useRef<number>(0);
  const studentDistanceRef = useRef<number>(0);
  const studentMomentumRef = useRef<number>(0);
  const srsDueQueueRef = useRef<number[]>([]);
  const lastSyncSnapRef = useRef<TelemetrySyncSnapshot | null>(null);

  // Active Racers (Student + Simulated Bots starting from 0 km/h)
  const [botRacers, setBotRacers] = useState<RacerState[]>(() =>
    BOT_PRESETS.slice(0, 5).map((bot, idx) => ({
      id: `bot_${bot.number}`,
      name: bot.name,
      number: bot.number,
      teamId: bot.teamId,
      colorHex: bot.colorHex,
      speedKmh: 0,
      targetSpeedKmh: 0,
      streak: 0,
      isFinished: false,
      inPitStop: false,
      laneOffset: (idx + 1) % 2 === 0 ? LANE_DRIVING : LANE_PASSING,
      isBoosting: false,
    }))
  );

  // Sync body dataset state for Ultra Mode verification
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.dataset.state = isVictoryModalOpen
        ? 'gameover'
        : isPaused
        ? 'paused'
        : 'playing';
    }
  }, [isPaused, isVictoryModalOpen]);

  // Keyboard Escape / P to toggle pause
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        if (isVictoryModalOpen) return;
        setIsPaused((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isVictoryModalOpen]);

  useEffect(() => {
    suzukaAudio.setMuted(isMuted || isPaused);
  }, [isMuted, isPaused]);

  useEffect(() => {
    return () => {
      suzukaAudio.stopAll();
    };
  }, []);

  // Fast 2.4s Start Procedure (5 Red Lights -> All Green at 2.4s)
  const prevLightsRef = useRef<number>(0);
  useEffect(() => {
    prevLightsRef.current = 0;
    const timer = setInterval(() => {
      if (isPaused) return;
      const elapsed = Date.now() - raceStartTime;
      if (elapsed < 2400) {
        const count = Math.max(0, Math.floor(elapsed / 400));
        if (count > prevLightsRef.current && count >= 1 && count <= 5) {
          suzukaAudio.playF1CountdownBeep(false);
          prevLightsRef.current = count;
        }
        setLightsCount(count);
      } else {
        if (prevLightsRef.current < 6) {
          suzukaAudio.playF1CountdownBeep(true);
          prevLightsRef.current = 6;
        }
        setLightsCount(6);
        setRaceActive(true);
        suzukaAudio.startEngine();
      }
    }, 100);

    return () => clearInterval(timer);
  }, [raceStartTime, isPaused]);

  // 20 Hz Continuous Physics, Corner Speed Caps & Drag Decay Loop
  useEffect(() => {
    if (!raceActive || isPaused || isVictoryModalOpen) return;

    let lastTick = performance.now();
    const physicsInterval = setInterval(() => {
      const now = performance.now();
      const dt = Math.min(0.1, (now - lastTick) / 1000);
      lastTick = now;

      setStudentSpeed((prevSpeed) => {
        const lapFrac = ((studentProgressRef.current % 1) + 1) % 1;
        const cornerCap = getSuzukaCornerSpeedLimit(lapFrac);

        const stepped = stepKartLongitudinalPhysics({
          currentSpeedKmh: prevSpeed,
          currentMomentumKmh: studentMomentumRef.current,
          cornerCapKmh: cornerCap,
          dtSeconds: dt,
        });

        studentMomentumRef.current = stepped.nextMomentumKmh;
        const nextSpeed = stepped.nextSpeedKmh;

        if (nextSpeed < 145 && studentBoosting && studentStreak < 3) {
          setStudentBoosting(false);
        }

        const inCornerZone = cornerCap < 155;
        const onKerbApex =
          (lapFrac >= 0.19 && lapFrac <= 0.23) ||
          (lapFrac >= 0.38 && lapFrac <= 0.41) ||
          (lapFrac >= 0.5 && lapFrac <= 0.52) ||
          (lapFrac >= 0.94 && lapFrac <= 0.97);

        suzukaAudio.updateEngineTelemetry(nextSpeed, nextSpeed >= 145 || studentBoosting, {
          isDrifting: nextSpeed > 65 && inCornerZone,
          onCurb: nextSpeed > 55 && onKerbApex,
        });

        // Record classroom bandwidth delta governor telemetry
        const snap: TelemetrySyncSnapshot = {
          speedKmh: nextSpeed,
          distanceMeters: studentDistanceRef.current,
          inPitStop: studentInPitStop,
          isFinished: false,
          timestampMs: Date.now(),
        };
        if (shouldBroadcastTelemetryDelta(lastSyncSnapRef.current, snap)) {
          lastSyncSnapRef.current = snap;
          bandwidthGovernor.recordPacketSent();
        } else {
          bandwidthGovernor.recordPacketSuppressed();
        }

        return nextSpeed;
      });

      setBotRacers((prevBots) =>
        prevBots.map((bot) => {
          if (bot.speedKmh <= 0) return bot;
          const decay = (4.2 + 0.018 * bot.speedKmh) * dt;
          const nextSpeed = Math.max(0, bot.speedKmh - decay);
          return {
            ...bot,
            speedKmh: Math.round(nextSpeed * 10) / 10,
            isBoosting: nextSpeed >= 145 || (bot.streak || 0) >= 3,
          };
        })
      );
    }, 50);

    return () => clearInterval(physicsInterval);
  }, [raceActive, isPaused, isVictoryModalOpen, studentBoosting, studentStreak, studentInPitStop]);

  // Bot AI Simulation
  useEffect(() => {
    if (!raceActive || isPaused || isVictoryModalOpen) return;

    const botInterval = setInterval(() => {
      setBotRacers((prev) =>
        prev.map((bot, idx) => {
          if (bot.isFinished || bot.inPitStop) return bot;
          const isCorrect = Math.random() < 0.82;

          if (isCorrect) {
            const nextStreak = (bot.streak || 0) + 1;
            const boost = nextStreak === 1 ? 44 : nextStreak === 2 ? 50 : 56;
            const targetSpeed = Math.min(165, bot.speedKmh + boost + (idx % 2 === 0 ? 4 : -4));
            const isBoost = targetSpeed >= 145 || nextStreak >= 3;

            return {
              ...bot,
              speedKmh: targetSpeed,
              streak: nextStreak,
              isBoosting: isBoost,
            };
          } else {
            const retained = Math.max(0, 1 - wrongSpeedLossRatio);
            return {
              ...bot,
              speedKmh: Math.round(bot.speedKmh * retained),
              streak: 0,
              isBoosting: false,
              inPitStop: wrongLockoutSeconds > 0,
            };
          }
        })
      );
    }, 2800);

    const pitClearInterval = setInterval(() => {
      setBotRacers((prev) =>
        prev.map((bot) => (bot.inPitStop ? { ...bot, inPitStop: false } : bot))
      );
    }, Math.max(500, wrongLockoutSeconds * 1000));

    return () => {
      clearInterval(botInterval);
      clearInterval(pitClearInterval);
    };
  }, [raceActive, isPaused, isVictoryModalOpen, wrongSpeedLossRatio, wrongLockoutSeconds]);

  const allRacers: RacerState[] = useMemo(() => {
    const studentRacer: RacerState = {
      id: STUDENT_ID,
      name: t('YOU (iPad)', 'あなた (iPad)'),
      number: 7,
      teamId: 'team_red',
      colorHex: studentTheme.colorHex,
      stripeHex: studentTheme.stripeHex,
      rimHex: studentTheme.rimHex,
      suitHex: studentTheme.suitHex,
      helmetHex: studentTheme.helmetHex,
      visorHex: studentTheme.visorHex,
      speedKmh: isPaused ? 0 : studentSpeed,
      targetSpeedKmh: isPaused ? 0 : studentSpeed,
      streak: studentStreak,
      isFinished: isVictoryModalOpen,
      inPitStop: studentInPitStop,
      laneOffset: 0.0,
      isBoosting: studentBoosting,
    };

    const activeBots = isPaused
      ? botRacers.map((b) => ({ ...b, speedKmh: 0, targetSpeedKmh: 0 }))
      : botRacers;

    return [studentRacer, ...activeBots];
  }, [
    studentSpeed,
    studentStreak,
    studentInPitStop,
    studentBoosting,
    studentTheme,
    botRacers,
    isPaused,
    isVictoryModalOpen,
    t,
  ]);

  const sortedRacers = useMemo(() => {
    if (liveTelemetry.length === 0) {
      return allRacers.map((r, i) => ({
        id: r.id,
        name: r.name,
        number: r.number,
        colorHex: r.colorHex,
        progress: 0,
        speedKmh: r.speedKmh,
        lap: 1,
        distanceMeters: -i * 6.5,
        laneOffset: r.laneOffset,
        isPassingLane: false,
      }));
    }
    return [...liveTelemetry].sort((a, b) => b.distanceMeters - a.distanceMeters);
  }, [liveTelemetry, allRacers]);

  const studentRank = Math.max(1, sortedRacers.findIndex((r) => r.id === STUDENT_ID) + 1);

  const prevLapRef = useRef<number>(1);
  const handleTelemetryUpdate = (telemetry: RacerTelemetry[]) => {
    setLiveTelemetry(telemetry);
    const student = telemetry.find((r) => r.id === STUDENT_ID);
    if (student) {
      studentProgressRef.current = student.progress;
      studentDistanceRef.current = student.distanceMeters;
      const currentLap = Math.floor(student.progress) + 1;
      if (currentLap > prevLapRef.current) {
        suzukaAudio.playLapChime();
        prevLapRef.current = currentLap;
      }
    }
  };

  // Handle Student Quiz Answering with Spaced Repetition (SRS) & DRS Revenge Boost
  const handleStudentAnswer = (isCorrect: boolean, _optionId: string) => {
    setTotalAnswered((prev) => prev + 1);
    const curQ = activeQuestions[studentQuestionIdx % activeQuestions.length];

    if (isCorrect) {
      setCorrectAnswered((prev) => prev + 1);
      if (curQ && !masteredWordIds.includes(curQ.targetWordId)) {
        setMasteredWordIds((prev) => [...prev, curQ.targetWordId]);
      }

      const nextStreak = studentStreak + 1;
      setStudentStreak(nextStreak);

      const lapFrac = ((studentProgressRef.current % 1) + 1) % 1;
      const cornerCap = getSuzukaCornerSpeedLimit(lapFrac);

      const boostRes = computeCorrectAnswerBoost({
        currentSpeedKmh: studentSpeed,
        currentMomentumKmh: studentMomentumRef.current,
        nextStreak,
        cornerCapKmh: cornerCap,
        isDrsReviewWord: isDrsReviewQuestion,
      });

      studentMomentumRef.current = boostRes.nextMomentumKmh;
      setStudentScore((s) => s + boostRes.pointsEarned);
      setStudentSpeed(boostRes.nextSpeedKmh);
      setStudentBoosting(boostRes.isBoosting);

      if (nextStreak >= 2 || isDrsReviewQuestion) {
        suzukaAudio.playBoostSputter(isDrsReviewQuestion ? 1.25 : 1.0);
      }
      suzukaAudio.updateEngineTelemetry(boostRes.nextSpeedKmh, boostRes.isBoosting);

      const srsNext = selectNextQuestionIndexWithSrs({
        currentQuestionIdx: studentQuestionIdx,
        totalQuestions: activeQuestions.length,
        dueReviewIndices: srsDueQueueRef.current,
      });
      srsDueQueueRef.current = srsNext.remainingReviewIndices;
      setStudentQuestionIdx(srsNext.nextIndex);
      setIsDrsReviewQuestion(srsNext.isDrsReview);
    } else {
      // Queue into SRS review queue
      if (!srsDueQueueRef.current.includes(studentQuestionIdx)) {
        srsDueQueueRef.current.push(studentQuestionIdx);
      }

      setStudentStreak(0);
      setStudentBoosting(false);
      suzukaAudio.playRailImpact(0.75);

      const retainedRatio = Math.max(0, 1 - wrongSpeedLossRatio);
      setStudentSpeed((prev) => {
        const reduced = Math.round(prev * retainedRatio * 10) / 10;
        studentMomentumRef.current = Math.round(studentMomentumRef.current * retainedRatio * 10) / 10;
        suzukaAudio.updateEngineTelemetry(reduced, false);
        return reduced;
      });

      if (wrongLockoutSeconds > 0) {
        setStudentInPitStop(true);
        setTimeout(() => {
          setStudentInPitStop(false);
        }, wrongLockoutSeconds * 1000);
      }
    }
  };

  const handleResetRace = () => {
    suzukaAudio.stopAll();
    setIsPaused(false);
    setIsVictoryModalOpen(false);
    setRaceStartTime(Date.now());
    setLightsCount(0);
    prevLapRef.current = 1;
    studentProgressRef.current = 0;
    studentDistanceRef.current = 0;
    studentMomentumRef.current = 0;
    srsDueQueueRef.current = [];
    setRaceActive(false);
    setStudentStreak(0);
    setStudentScore(0);
    setStudentQuestionIdx(0);
    setIsDrsReviewQuestion(false);
    setStudentSpeed(0);
    setStudentBoosting(false);
    setStudentInPitStop(false);

    setBotRacers((prev) =>
      prev.map((b) => ({
        ...b,
        speedKmh: 0,
        targetSpeedKmh: 0,
        streak: 0,
        isBoosting: false,
        inPitStop: false,
      }))
    );
  };

  const handleAddBots = (count: number) => {
    const existingCount = botRacers.length;
    const additional = BOT_PRESETS.slice(existingCount, existingCount + count).map((bot, idx) => ({
      id: `bot_${bot.number}_${Date.now()}`,
      name: bot.name,
      number: bot.number,
      teamId: bot.teamId,
      colorHex: bot.colorHex,
      speedKmh: 0,
      targetSpeedKmh: 0,
      streak: 0,
      isFinished: false,
      inPitStop: false,
      laneOffset: (existingCount + idx + 1) % 2 === 0 ? LANE_DRIVING : LANE_PASSING,
      isBoosting: false,
    }));
    setBotRacers((prev) => [...prev, ...additional]);
  };

  const handleFinishRaceToPodium = () => {
    soundEffects.playCheckeredFlag();
    setIsVictoryModalOpen(true);
  };

  const rawCurrentQuestion = activeQuestions[studentQuestionIdx % activeQuestions.length];
  const currentQuestion = useMemo(
    () => ({
      ...rawCurrentQuestion,
      isDrsReview: isDrsReviewQuestion,
    }),
    [rawCurrentQuestion, isDrsReviewQuestion]
  );

  const bwStats = bandwidthGovernor.getStats();
  const bwSavingPct =
    bwStats.packetsSent + bwStats.packetsSuppressedByDelta > 0
      ? Math.round(
          (bwStats.packetsSuppressedByDelta /
            (bwStats.packetsSent + bwStats.packetsSuppressedByDelta)) *
            100
        )
      : 78;

  const accuracyPct =
    totalAnswered > 0 ? Math.round((correctAnswered / totalAnswered) * 100) : 100;

  return (
    <div className="fixed inset-0 w-screen h-dvh flex flex-col bg-slate-950 text-white overflow-hidden select-none z-40">
      {/* 1. Compact Classroom Simulation Toolbar */}
      <header className="h-13 bg-slate-900 border-b border-slate-800 px-3 sm:px-4 flex items-center justify-between shrink-0 z-30 relative">
        {/* Left: Game Identity & Active Unit */}
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-xl font-display font-bold tracking-tight text-white whitespace-nowrap">
            SUZUKA GP 3D
          </span>
          <span className="text-slate-600 hidden sm:inline">·</span>
          <span className="text-xs font-bold text-amber-400 truncate hidden sm:inline">
            {activeUnit.gradeLabelJa} — {activeUnit.titleEn}
          </span>
        </div>

        {/* Center: View Mode Segmented Switcher */}
        <div className="flex items-center p-0.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold shrink-0">
          <button
            type="button"
            onClick={() => setPrototypeView('COCKPIT')}
            className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              prototypeView === 'COCKPIT'
                ? 'bg-amber-500 text-slate-950 font-black'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Student iPad (3D Cockpit + ESL Quiz Deck)"
          >
            <Tablet size={13} />
            <span className="hidden md:inline">{t('Student iPad', '生徒iPad')}</span>
          </button>

          <button
            type="button"
            onClick={() => setPrototypeView('BROADCAST')}
            className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              prototypeView === 'BROADCAST'
                ? 'bg-amber-500 text-slate-950 font-black'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Teacher Dynabook / Front TV Broadcast"
          >
            <Tv size={13} />
            <span className="hidden md:inline">{t('Teacher TV', '先生TV画面')}</span>
          </button>

          <button
            type="button"
            onClick={() => setPrototypeView('SPLIT')}
            className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              prototypeView === 'SPLIT'
                ? 'bg-amber-500 text-slate-950 font-black'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Side-by-side Teacher TV + Student iPad Preview"
          >
            <Columns size={13} />
            <span className="hidden md:inline">{t('Split View', '2画面同時')}</span>
          </button>
        </div>

        {/* Right: Pit Garage, Curriculum & Penalty Settings, Bots, Pause, Podium, Exit */}
        <div className="flex items-center gap-1.5 shrink-0 relative">
          {/* Pit Garage & ESL Unit Drawer Toggle */}
          <button
            type="button"
            onClick={() => setActivePopover((p) => (p === 'GARAGE' ? 'NONE' : 'GARAGE'))}
            className={`px-2.5 py-1.5 rounded-xl border font-bold text-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activePopover === 'GARAGE'
                ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
            }`}
          >
            <Palette size={13} />
            <span className="hidden lg:inline">
              {studentTheme.emoji} {t('Kart & Unit', 'カート＆単元')}
            </span>
          </button>

          {/* Classroom Network & Mistake Penalty Settings Toggle */}
          <button
            type="button"
            onClick={() => setActivePopover((p) => (p === 'SETTINGS' ? 'NONE' : 'SETTINGS'))}
            className={`px-2.5 py-1.5 rounded-xl border font-bold text-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activePopover === 'SETTINGS'
                ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
            }`}
            title="School Wi-Fi Bandwidth Governor & Penalty Settings"
          >
            <SlidersHorizontal size={13} />
            <span className="hidden xl:inline">
              {t(`Wi-Fi -${bwSavingPct}%`, `通信 -${bwSavingPct}%`)}
            </span>
          </button>

          {botRacers.length < BOT_PRESETS.length && (
            <button
              type="button"
              onClick={() => handleAddBots(5)}
              className="px-2.5 py-1.5 rounded-xl bg-indigo-950 hover:bg-indigo-900 border border-indigo-700 text-indigo-300 font-bold text-xs flex items-center gap-1 cursor-pointer whitespace-nowrap"
              title="Add 5 Bot Racers"
            >
              <Users size={13} />
              <span className="hidden sm:inline">+5 Bots</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleFinishRaceToPodium}
            className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1 cursor-pointer whitespace-nowrap"
            title="Finish Race & View Podium"
          >
            <Trophy size={13} />
            <span className="hidden sm:inline">{t('Podium', '表彰台')}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsPaused((p) => !p)}
            aria-label={isPaused ? 'Resume Race' : 'Pause Race'}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 cursor-pointer"
            title="Pause [P]"
          >
            {isPaused ? <Play size={15} /> : <Pause size={15} />}
          </button>

          <button
            type="button"
            onClick={handleResetRace}
            aria-label="Restart Race"
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 cursor-pointer"
            title="Restart Race"
          >
            <RotateCcw size={15} />
          </button>

          <button
            type="button"
            onClick={toggleMute}
            aria-label={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 cursor-pointer"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>

          <button
            type="button"
            onClick={exitToHub}
            className="px-2.5 py-1.5 rounded-xl bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-300 font-black text-xs cursor-pointer whitespace-nowrap"
          >
            {t('Title', 'タイトル')}
          </button>

          {/* Popover 1: Pit Garage & MEXT ESL Curriculum Unit Picker */}
          {activePopover === 'GARAGE' && (
            <div className="absolute right-0 top-12 w-96 max-w-[92vw] bg-slate-900 border-2 border-slate-700 rounded-2xl p-4 shadow-2xl z-50 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                  <BookOpen size={14} />
                  <span>{t('MEXT ESL Curriculum & Pit Garage', '英語カリキュラム単元＆ピットガレージ')}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setActivePopover('NONE')}
                  className="text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Curriculum Unit Selector */}
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1.5">
                  {t('Select Elementary English Unit', '小学校英語 学習ユニット選択')}
                </label>
                <div className="space-y-1.5">
                  {CURRICULUM_UNITS.map((unit) => (
                    <button
                      key={unit.id}
                      type="button"
                      onClick={() => {
                        setSelectedUnitId(unit.id);
                        setStudentQuestionIdx(0);
                        srsDueQueueRef.current = [];
                      }}
                      className={`w-full text-left p-2.5 rounded-xl border transition-colors cursor-pointer ${
                        selectedUnitId === unit.id
                          ? 'bg-amber-500/15 border-amber-400 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-black">
                        <span className="text-amber-400">{unit.gradeLabelJa}</span>
                        <span className="font-mono-tabular text-[10px] text-slate-400">
                          {unit.questions.length} Words
                        </span>
                      </div>
                      <div className="text-xs font-bold text-white mt-0.5">{unit.titleEn}</div>
                      <div className="text-[11px] text-slate-400">{unit.titleJa}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 15 Kart Livery Swatches */}
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1.5">
                  {t('1-Tap Kart Livery Customization', 'マイカート塗装プリセット (15種)')}
                </label>
                <div className="grid grid-cols-3 gap-1.5 max-h-48 overflow-y-auto pr-1">
                  {KART_THEME_LIST.map((theme) => (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => handleSelectKartTheme(theme.id)}
                      className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-1.5 ${
                        selectedKartThemeId === theme.id
                          ? 'bg-slate-800 border-amber-400 text-white font-black'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <span className="text-sm shrink-0">{theme.emoji}</span>
                      <span className="text-[11px] font-bold truncate">{theme.nameEn}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Popover 2: School Wi-Fi Bandwidth Governor & Penalty Settings */}
          {activePopover === 'SETTINGS' && (
            <div className="absolute right-0 top-12 w-88 max-w-[92vw] bg-slate-900 border-2 border-slate-700 rounded-2xl p-4 shadow-2xl z-50 space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-black text-amber-400 uppercase tracking-wider">
                  {t('Classroom Bandwidth & Race Settings', '校内Wi-Fi通信＆ペナルティ設定')}
                </span>
                <button
                  type="button"
                  onClick={() => setActivePopover('NONE')}
                  className="text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* School Wi-Fi Bandwidth Governor */}
              <div>
                <label className="text-[11px] font-bold text-slate-300 flex items-center justify-between mb-1.5">
                  <span className="flex items-center gap-1">
                    <Wifi size={12} className="text-cyan-400" />
                    <span>{t('GIGA School Wi-Fi Sync Profile', '校内ネットワーク同期モード')}</span>
                  </span>
                  <span className="font-mono-tabular text-emerald-400">
                    -{bwSavingPct}% Traffic
                  </span>
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    [
                      { id: 'OPTIMAL_LAN', label: 'Fast LAN (0.8s)' },
                      { id: 'SCHOOL_WIFI_SAVER', label: 'School Wi-Fi (1.5s)' },
                      { id: 'THROTTLED_LOW_BW', label: 'Ultra Saver (2.4s)' },
                    ] as const
                  ).map((prof) => (
                    <button
                      key={prof.id}
                      type="button"
                      onClick={() => {
                        setNetworkProfile(prof.id);
                        bandwidthGovernor.setProfile(prof.id);
                      }}
                      className={`py-1.5 px-2 rounded-lg text-[10px] font-black border cursor-pointer ${
                        networkProfile === prof.id
                          ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                      }`}
                    >
                      {prof.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Wrong Answer Speed Reduction */}
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1.5">
                  {t('Wrong Answer Speed Reduction', '誤答時のスピード減少率')}
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { ratio: 0, label: '0% (None)' },
                    { ratio: 0.25, label: '-25% (1/4)' },
                    { ratio: 0.33, label: '-33% (1/3)' },
                    { ratio: 0.5, label: '-50% (1/2)' },
                    { ratio: 0.75, label: '-75% (3/4)' },
                    { ratio: 1.0, label: '-100% (Stop)' },
                  ].map((opt) => (
                    <button
                      key={opt.ratio}
                      type="button"
                      onClick={() => setWrongSpeedLossRatio(opt.ratio)}
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-black border cursor-pointer ${
                        Math.abs(wrongSpeedLossRatio - opt.ratio) < 0.02
                          ? 'bg-amber-500 text-slate-950 border-amber-400'
                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Answer Lockout Duration */}
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1.5">
                  {t('Pit-Stop Coaching Duration', '誤答時の解説・ロック時間')}
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {[0, 0.5, 1.0, 1.5, 2.0].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => setWrongLockoutSeconds(sec)}
                      className={`py-1.5 rounded-lg text-[11px] font-black border cursor-pointer ${
                        wrongLockoutSeconds === sec
                          ? 'bg-amber-500 text-slate-950 border-amber-400'
                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                      }`}
                    >
                      {sec}s
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* 2. Main Stage Work Area */}
      <main className="flex-1 w-full h-full min-h-0 flex relative overflow-hidden">
        {/* ========================================================================= */}
        {/* A. FRONT TV BROADCAST VIEW */}
        {/* ========================================================================= */}
        {(prototypeView === 'BROADCAST' || prototypeView === 'SPLIT') && (
          <div
            className={`relative h-full flex flex-col min-h-0 overflow-hidden ${
              prototypeView === 'SPLIT' ? 'w-1/2 border-r-2 border-slate-800' : 'w-full'
            }`}
          >
            {/* TV Broadcast Camera Bar */}
            <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none">
              <div className="flex items-center flex-wrap gap-1 p-1 rounded-xl bg-slate-950/92 border border-slate-800 pointer-events-auto shadow-xl text-xs font-black">
                <span className="text-amber-400 px-2 flex items-center gap-1 shrink-0">
                  <Tv size={12} />
                  <span>TV CAM:</span>
                </span>
                {(
                  [
                    { mode: 'DIRECTOR', label: '🎬 AI Director' },
                    { mode: 'BATTLE', label: '⚔️ Battle Cam' },
                    { mode: 'LEADER', label: '🏎️ Leader' },
                    { mode: 'DRONE', label: '🚁 Pack Heli' },
                    { mode: 'ISOMETRIC', label: '🗺️ Overhead' },
                  ] as { mode: CameraViewMode; label: string }[]
                ).map(({ mode, label }) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setCameraMode(mode)}
                    className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                      cameraMode === mode
                        ? 'bg-amber-500 text-slate-950 font-black'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {label}
                  </button>
                ))}

                <div className="h-4 w-px bg-slate-800 mx-0.5" />

                <select
                  value={
                    [
                      'MAIN_STRAIGHT',
                      'S_CURVES',
                      'DEGNER',
                      'HAIRPIN',
                      'SPOON',
                      'BRIDGE',
                      '130R',
                      'CHICANE',
                    ].includes(cameraMode)
                      ? cameraMode
                      : ''
                  }
                  onChange={(e) => {
                    if (e.target.value) setCameraMode(e.target.value as CameraViewMode);
                  }}
                  aria-label="Fixed Landmark Camera"
                  className={`px-2.5 py-1 rounded-lg text-xs font-black cursor-pointer outline-none border ${
                    [
                      'MAIN_STRAIGHT',
                      'S_CURVES',
                      'DEGNER',
                      'HAIRPIN',
                      'SPOON',
                      'BRIDGE',
                      '130R',
                      'CHICANE',
                    ].includes(cameraMode)
                      ? 'bg-amber-500 text-slate-950 border-amber-400'
                      : 'bg-slate-900 text-slate-300 border-slate-700 hover:text-white'
                  }`}
                >
                  <option value="" disabled className="bg-slate-900 text-slate-400">
                    📹 Landmark Cams...
                  </option>
                  <option value="MAIN_STRAIGHT" className="bg-slate-900 text-white">
                    🏁 Main Straight & Grandstand
                  </option>
                  <option value="S_CURVES" className="bg-slate-900 text-white">
                    🐍 S-Curves (Esses)
                  </option>
                  <option value="DEGNER" className="bg-slate-900 text-white">
                    🌉 Degner Underpass
                  </option>
                  <option value="HAIRPIN" className="bg-slate-900 text-white">
                    🔄 180° Hairpin
                  </option>
                  <option value="SPOON" className="bg-slate-900 text-white">
                    🥄 Spoon Curve
                  </option>
                  <option value="BRIDGE" className="bg-slate-900 text-white">
                    🌉 Overpass Bridge
                  </option>
                  <option value="130R" className="bg-slate-900 text-white">
                    💨 130R High-Speed
                  </option>
                  <option value="CHICANE" className="bg-slate-900 text-white">
                    🎡 Casio Chicane & Ferris Wheel
                  </option>
                </select>
              </div>

              {/* Race Lights Status */}
              <div className="px-3 py-1.5 rounded-xl bg-slate-950/92 border border-slate-800 shadow-xl flex items-center gap-2 pointer-events-auto">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((idx) => (
                    <div
                      key={idx}
                      className={`w-3 h-3 rounded-full border ${
                        lightsCount === 6
                          ? 'bg-emerald-500 border-emerald-300'
                          : lightsCount >= idx
                          ? 'bg-rose-600 border-rose-400'
                          : 'bg-slate-900 border-slate-800'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs font-black text-white whitespace-nowrap">
                  {lightsCount === 6 ? 'GREEN FLAG' : 'START PROCEDURE'}
                </span>
              </div>
            </div>

            <Suzuka3DStage
              mode="BROADCAST"
              cameraMode={cameraMode}
              activeRacerId={STUDENT_ID}
              racers={allRacers}
              lightsCount={lightsCount}
              performanceProfile="DESKTOP_HD"
              onTelemetryUpdate={handleTelemetryUpdate}
              className="flex-1 w-full h-full min-h-0"
            />

            {/* Live Broadcast Leaderboard Ticker (Bottom-Left) */}
            <div className="absolute bottom-3 left-3 z-20 max-w-xs w-64 bg-slate-950/92 border border-slate-800 rounded-2xl p-2.5 shadow-2xl pointer-events-none">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 mb-1.5 text-[11px] font-black">
                <span className="text-amber-400 flex items-center gap-1">
                  <Trophy size={12} />
                  <span>SUZUKA STANDINGS</span>
                </span>
                <span className="text-slate-400 font-mono-tabular">
                  {allRacers.length} Racers
                </span>
              </div>

              <div className="space-y-1">
                {sortedRacers.slice(0, 6).map((racer, rank) => {
                  const isUser = racer.id === STUDENT_ID;
                  return (
                    <div
                      key={racer.id}
                      className={`flex items-center justify-between px-2 py-1 rounded-lg text-xs font-bold ${
                        isUser
                          ? 'bg-amber-500/20 border border-amber-400 text-amber-300 font-black'
                          : 'bg-slate-900/80 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="font-mono-tabular text-[10px] text-slate-400">
                          P{rank + 1}
                        </span>
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{
                            backgroundColor: `#${racer.colorHex.toString(16).padStart(6, '0')}`,
                          }}
                        />
                        <span className="truncate">
                          #{racer.number} {racer.name}
                        </span>
                      </div>
                      <span className="font-mono-tabular text-[11px] text-cyan-400 shrink-0">
                        {racer.speedKmh} km/h
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* B. STUDENT TABLET COCKPIT & QUIZ DECK */}
        {/* ========================================================================= */}
        {(prototypeView === 'COCKPIT' || prototypeView === 'SPLIT') && (
          <div
            className={`h-full flex flex-col min-h-0 overflow-hidden bg-slate-950 ${
              prototypeView === 'SPLIT' ? 'w-1/2' : 'w-full'
            }`}
          >
            <div className="relative flex-1 min-h-0 overflow-hidden">
              {/* Tablet Top HUD */}
              <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
                <div className="px-3 py-1 rounded-xl bg-slate-950/92 border border-slate-700 text-white font-black text-xs flex items-center gap-2 shadow-lg">
                  <span className="text-amber-400">POS</span>
                  <span className="font-mono-tabular text-sm text-emerald-400">
                    P{studentRank}
                  </span>
                  <span className="text-slate-400 text-[10px]">/ {allRacers.length}</span>
                  <span className="text-slate-600">·</span>
                  <span className="text-cyan-300 font-mono-tabular flex items-center gap-1">
                    <Award size={12} className="text-amber-400" />
                    <span>
                      {masteredWordIds.length}/{activeQuestions.length} Words
                    </span>
                  </span>
                </div>

                <div className="px-3 py-1 rounded-xl bg-slate-950/92 border border-slate-700 text-emerald-400 font-mono-tabular font-black text-xs shadow-lg">
                  {studentScore.toLocaleString()} PTS
                </div>
              </div>

              <Suzuka3DStage
                mode="STUDENT_COCKPIT"
                cameraMode="COCKPIT"
                activeRacerId={STUDENT_ID}
                racers={allRacers}
                lightsCount={lightsCount}
                performanceProfile="MOBILE"
                onTelemetryUpdate={handleTelemetryUpdate}
                className="w-full h-full"
              />

              {/* Bottom Cockpit Telemetry HUD Overlay */}
              {(() => {
                const cornerSpeedLimit =
                  liveTelemetry.find((r) => r.id === STUDENT_ID)?.cornerSpeedLimit ??
                  getSuzukaCornerSpeedLimit(studentProgressRef.current);
                const isCornerLimited = cornerSpeedLimit < 170;
                const isPassingLane =
                  liveTelemetry.find((r) => r.id === STUDENT_ID)?.isPassingLane ?? false;
                const throttlePct = Math.min(100, Math.max(0, (studentSpeed / 180) * 100));
                const cornerCapPct = Math.min(100, Math.max(0, (cornerSpeedLimit / 180) * 100));

                let throttleGradient = 'from-amber-600 to-amber-400';
                if (studentSpeed >= 150) {
                  throttleGradient =
                    'from-pink-500 via-rose-500 to-amber-400 shadow-[0_0_12px_#f43f5e]';
                } else if (studentSpeed >= 110) {
                  throttleGradient = 'from-cyan-500 to-blue-500';
                } else if (studentSpeed >= 55) {
                  throttleGradient = 'from-emerald-500 to-teal-400';
                }

                return (
                  <div className="absolute bottom-1.5 left-2 right-2 sm:bottom-2 sm:left-4 sm:right-4 z-20 pointer-events-none">
                    <div className="w-full bg-slate-950/92 border border-slate-700/90 rounded-xl p-1.5 sm:p-2 shadow-lg flex flex-col gap-1">
                      <div className="flex items-center justify-between gap-1.5 flex-wrap text-xs font-bold px-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-rose-400 font-black flex items-center gap-1">
                            <Flag size={11} />
                            <span>
                              Q {(studentQuestionIdx % activeQuestions.length) + 1} /{' '}
                              {activeQuestions.length}
                            </span>
                          </span>

                          <span className="text-slate-600">·</span>

                          <span className="text-cyan-300 font-mono-tabular font-black">
                            ⚡ {Math.round(studentSpeed)} KM/H
                          </span>

                          {isCornerLimited && (
                            <>
                              <span className="text-slate-600">·</span>
                              <span className="text-rose-300 font-mono-tabular font-black text-[11px] flex items-center gap-1">
                                <AlertTriangle size={11} className="text-rose-400" />
                                <span>
                                  {t(
                                    `RED ZONE MAX ${cornerSpeedLimit} KM/H`,
                                    `減速帯 上限 ${cornerSpeedLimit} KM/H`
                                  )}
                                </span>
                              </span>
                            </>
                          )}

                          <span className="text-slate-600">·</span>

                          {isPassingLane ? (
                            <span className="text-cyan-300 font-mono-tabular font-black text-[11px] flex items-center gap-1">
                              <Sparkles size={11} className="text-cyan-400" />
                              <span>{t('PASSING LANE', 'おいこし (追越)')}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono-tabular font-bold text-[11px]">
                              {t('DRIVING LANE', 'そうこう (走行)')}
                            </span>
                          )}
                        </div>

                        {studentStreak > 0 && (
                          <span className="flex items-center gap-1 text-amber-300 font-black text-xs">
                            <Flame size={12} className="text-amber-400" />
                            <span>
                              x{studentStreak} {t('NITRO!', 'かそく!')}
                            </span>
                          </span>
                        )}
                      </div>

                      <div className="w-full flex flex-col gap-0.5 px-1">
                        <div className="flex items-center justify-between text-[10px] font-mono-tabular font-bold text-slate-300">
                          <span className="flex items-center gap-1">
                            <span className="text-amber-400 font-black">
                              {t('THROTTLE:', 'スロットル:')}
                            </span>
                            <span>
                              {Math.round(studentSpeed)} / {cornerSpeedLimit} KM/H
                            </span>
                          </span>
                          {isCornerLimited && studentSpeed >= cornerSpeedLimit - 4 ? (
                            <span className="text-rose-400 font-bold flex items-center gap-1">
                              <AlertTriangle size={10} />
                              <span>
                                {t(
                                  `Red Zone Speed Cap (${cornerSpeedLimit} km/h)`,
                                  `赤舗装・カーブ減速帯 (${cornerSpeedLimit} km/h)`
                                )}
                              </span>
                            </span>
                          ) : studentSpeed > 0 && studentSpeed < 50 ? (
                            <span className="text-amber-400 font-bold flex items-center gap-1">
                              <AlertTriangle size={10} />
                              <span>
                                {t('Coasting! Answer to accelerate!', '減速中！正解して加速！')}
                              </span>
                            </span>
                          ) : studentSpeed === 0 ? (
                            <span className="text-slate-400 font-bold">
                              {t('Answer to launch!', '正解してスタート！')}
                            </span>
                          ) : studentSpeed >= 150 ? (
                            <span className="text-rose-400 font-black flex items-center gap-1">
                              <Flame size={10} />
                              <span>MAX NITRO ZONE!</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 font-medium">
                              {t('Keep answering to hold speed', '連続正解でスピード維持')}
                            </span>
                          )}
                        </div>

                        <div className="h-1.5 sm:h-2 w-full rounded-full bg-slate-900 border border-slate-700 p-0.5 relative overflow-hidden flex items-center">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${throttleGradient} transition-all duration-100 ease-out`}
                            style={{ width: `${throttlePct}%` }}
                          />
                          {isCornerLimited && (
                            <div
                              className="absolute top-0 bottom-0 w-1 bg-amber-400 z-10 pointer-events-none"
                              style={{ left: `${cornerCapPct}%` }}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Lower Quiz Answering Deck */}
            <SuzukaStudentDeck
              question={currentQuestion}
              questionNumber={(studentQuestionIdx % activeQuestions.length) + 1}
              totalQuestions={activeQuestions.length}
              currentStreak={studentStreak}
              speedKmh={studentSpeed}
              cornerSpeedLimit={
                liveTelemetry.find((r) => r.id === STUDENT_ID)?.cornerSpeedLimit ??
                getSuzukaCornerSpeedLimit(studentProgressRef.current)
              }
              isPassingLane={liveTelemetry.find((r) => r.id === STUDENT_ID)?.isPassingLane}
              wrongLockoutSeconds={wrongLockoutSeconds}
              wrongSpeedLossRatio={wrongSpeedLossRatio}
              scaffoldingLevel={scaffoldingLevel}
              onChangeScaffoldingLevel={setScaffoldingLevel}
              onAnswer={handleStudentAnswer}
              disabled={!raceActive || isPaused || isVictoryModalOpen}
              hideTelemetryHeader={true}
            />
          </div>
        )}

        {/* Pause Modal */}
        {isPaused && !isVictoryModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/90 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-slate-900 border-2 border-slate-700 rounded-3xl p-6 shadow-2xl text-center space-y-5">
              <div className="space-y-1">
                <h2 className="text-2xl font-display font-bold text-white">
                  {t('RACE PAUSED', '一時停止中')}
                </h2>
                <p className="text-xs text-slate-400">
                  {activeUnit.titleEn} · {activeUnit.titleJa}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                  <div className="text-[10px] font-bold text-slate-400">POSITION</div>
                  <div className="text-xl font-mono-tabular font-black text-emerald-400">
                    P{studentRank}
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                  <div className="text-[10px] font-bold text-slate-400">SCORE</div>
                  <div className="text-xl font-mono-tabular font-black text-amber-400">
                    {studentScore}
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                  <div className="text-[10px] font-bold text-slate-400">WORDS MASTERED</div>
                  <div className="text-xl font-mono-tabular font-black text-cyan-400">
                    {masteredWordIds.length}/{activeQuestions.length}
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsPaused(false)}
                  className="flex-1 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm cursor-pointer"
                >
                  {t('Resume Race', 'レース再開')}
                </button>
                <button
                  type="button"
                  onClick={handleResetRace}
                  className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm cursor-pointer"
                >
                  {t('Restart', '最初から')}
                </button>
                <button
                  type="button"
                  onClick={exitToHub}
                  className="py-3 px-4 rounded-xl bg-rose-950 hover:bg-rose-900 text-rose-300 font-bold text-sm cursor-pointer"
                >
                  {t('Title', 'タイトル')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Victory / Podium & Vocabulary Mastery Modal */}
        {isVictoryModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/92 flex items-center justify-center p-4 overflow-y-auto">
            <div className="max-w-lg w-full bg-slate-900 border-2 border-amber-400/80 rounded-3xl p-6 shadow-2xl space-y-5">
              <div className="text-center space-y-1">
                <div className="text-xs font-black text-amber-400 uppercase tracking-widest">
                  🏁 SUZUKA GRAND PRIX PODIUM & ESL REPORT
                </div>
                <h2 className="text-2xl sm:text-3xl font-display font-bold text-white">
                  {t('Checkered Flag! Race Complete!', 'チェッカーフラッグ！完走おめでとう！')}
                </h2>
              </div>

              {/* Top 3 Podium Standings */}
              <div className="grid grid-cols-3 gap-2.5">
                {sortedRacers.slice(0, 3).map((r, idx) => (
                  <div
                    key={r.id}
                    className={`p-3 rounded-2xl border text-center ${
                      idx === 0
                        ? 'bg-amber-500/15 border-amber-400 text-amber-300'
                        : 'bg-slate-950 border-slate-800 text-slate-200'
                    }`}
                  >
                    <div className="text-lg font-black">
                      {idx === 0 ? '🥇 P1' : idx === 1 ? '🥈 P2' : '🥉 P3'}
                    </div>
                    <div className="text-xs font-bold truncate mt-0.5">
                      #{r.number} {r.name}
                    </div>
                    <div className="text-[11px] font-mono-tabular text-slate-400 mt-0.5">
                      {Math.round(Math.max(0, r.distanceMeters))}m
                    </div>
                  </div>
                ))}
              </div>

              {/* Mastery Metrics */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                  <div className="text-[10px] font-bold text-slate-400">FINAL SCORE</div>
                  <div className="text-xl font-mono-tabular font-black text-emerald-400">
                    {studentScore.toLocaleString()}
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                  <div className="text-[10px] font-bold text-slate-400">ACCURACY</div>
                  <div className="text-xl font-mono-tabular font-black text-cyan-400">
                    {accuracyPct}%
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                  <div className="text-[10px] font-bold text-slate-400">WORDS MASTERED</div>
                  <div className="text-xl font-mono-tabular font-black text-amber-400">
                    {masteredWordIds.length}/{activeQuestions.length}
                  </div>
                </div>
              </div>

              {/* Vocabulary Words Practiced List */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 space-y-1.5">
                <div className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
                  {t('Unit Vocabulary & Phonics Summary', '今回の学習英単語＆フォニックス')}
                </div>
                <div className="grid grid-cols-2 gap-1.5 max-h-32 overflow-y-auto pr-1">
                  {activeQuestions.map((q) => {
                    const isMastered = masteredWordIds.includes(q.targetWordId);
                    return (
                      <div
                        key={q.targetWordId}
                        className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-900 text-xs"
                      >
                        <span className="font-black text-white">{q.targetWordEnglish}</span>
                        <span className="text-slate-400 text-[11px]">
                          {q.targetWordJa} {isMastered ? '✅' : ''}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  data-start="true"
                  onClick={handleResetRace}
                  className="flex-1 py-3 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm cursor-pointer shadow-lg"
                >
                  {t('Race Again 🏁', 'もう一度レースする 🏁')}
                </button>
                <button
                  type="button"
                  onClick={exitToHub}
                  className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm cursor-pointer"
                >
                  {t('Title Screen', 'タイトルへ')}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export const DeskGrandPrixContainer = SuzukaGrandPrixContainer;
