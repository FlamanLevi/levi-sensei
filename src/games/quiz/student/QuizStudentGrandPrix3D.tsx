import React, { useState, useEffect, useRef, useMemo } from 'react';
import { QuizQuestion, QuizPlayer, TeamId, SprintSettings, SprintCumulativeStats } from '../types';
import { Suzuka3DStage, RacerState, RacerTelemetry, CameraViewMode, LANE_DRIVING, LANE_PASSING } from '@/games/suzuka_grand_prix/Suzuka3DStage';
import { SuzukaStudentDeck } from '@/games/suzuka_grand_prix/SuzukaStudentDeck';
import { getSuzukaCornerSpeedLimit, SUZUKA_CIRCUIT_LENGTH_METERS } from '@/games/suzuka_grand_prix/engine/Suzuka3DEngine';
import {
  shouldBroadcastTelemetryDelta,
  TelemetrySyncSnapshot,
  RELAXED_GP3D_TELEMETRY_OPTIONS,
  VICTORY_CRUISE_TELEMETRY_OPTIONS,
} from '@/games/suzuka_grand_prix/engine/suzukaPhysics';
import { getKartTheme, getSavedKartTheme, resolveRacerNumber } from '@/games/suzuka_grand_prix/kartPresets';
import { suzukaAudio } from '@/games/suzuka_grand_prix/services/suzukaAudio';
import { soundEffects } from '@/services/soundEffects';
import { getServerTime } from '@/services/rtdbSafe';
import { useLanguage } from '@/context/LanguageContext';
import { Flag, Clock, Trophy, LogOut, Flame, Sparkles, AlertTriangle } from 'lucide-react';

const TEAM_HEX_MAP: Record<TeamId, number> = {
  team_red: 0xef4444,
  team_white: 0xf8fafc,
  team_blue: 0x3b82f6,
  team_green: 0x10b981,
  team_yellow: 0xfacc15,
  team_orange: 0xf97316,
  team_purple: 0x9333ea,
  team_indigo: 0x6366f1,
  team_violet: 0x8b5cf6,
};

interface QuizStudentGrandPrix3DProps {
  player: QuizPlayer;
  allPlayers: Record<string, QuizPlayer>;
  questions: QuizQuestion[];
  sprintSettings?: SprintSettings;
  raceStartTime: number;
  raceFinishGraceStartTime?: number;
  isLobby?: boolean;
  onAnswer: (
    questionIndex: number,
    optionId: string,
    isCorrect: boolean,
    timeTakenMs: number,
    pointsEarned: number,
    nextIndex?: number,
    isFinished?: boolean,
    finishTimeMs?: number,
    cumulativeStats?: SprintCumulativeStats,
    incorrectAttempts?: number
  ) => void;
  onLeave: () => void;
}

export const QuizStudentGrandPrix3D: React.FC<QuizStudentGrandPrix3DProps> = ({
  player,
  allPlayers,
  questions,
  sprintSettings,
  raceStartTime,
  raceFinishGraceStartTime,
  isLobby = false,
  onAnswer,
  onLeave,
}) => {
  const { t } = useLanguage();
  const isTimeTrial = sprintSettings?.sprintMode === 'TIME_TRIAL';
  const targetLaps = sprintSettings?.targetLaps3D || 1;
  const graceSeconds = sprintSettings?.graceCountdownSeconds || 15;
  const wrongSpeedLossRatio = sprintSettings?.wrongSpeedLossRatio ?? 0.33;
  // ==========================================================================
  // [ANTIGRAVITY REFACTOR]: Enforced >= 2.5s Pit Stop Lockout Floor (GEMINI.md §7)
  // WHAT CHANGED: Clamped `wrongLockoutSeconds` with `Math.max(2.5, ...)`.
  // WHY: Prevents legacy room settings (`0.5` or `1.0`) from bypassing the
  // mandatory 2.5s anti-spam lockout in 3D Suzuka Grand Prix.
  // ==========================================================================
  const wrongLockoutSeconds = Math.max(2.5, sprintSettings?.wrongLockoutSeconds ?? 2.5);

  const greenFlagTime = raceStartTime + 2400;
  const [nowTime, setNowTime] = useState<number>(() => getServerTime());

  // Local authoritative stats
  const [localScore, setLocalScore] = useState<number>(() => player.score || 0);
  const [localStreak, setLocalStreak] = useState<number>(() => player.currentStreak || 0);
  const [localMaxStreak, setLocalMaxStreak] = useState<number>(() => player.maxStreak || 0);
  const [localCorrectCount, setLocalCorrectCount] = useState<number>(() => player.correctCount || 0);
  const [localTotalAnswered, setLocalTotalAnswered] = useState<number>(() => player.totalAnswered || 0);
  const [localFastestTimeMs, setLocalFastestTimeMs] = useState<number>(() => player.fastestTimeMs || 999999);
  const [localIsFinished, setLocalIsFinished] = useState<boolean>(() => !!player.isFinished);
  const [localFinishTimeMs, setLocalFinishTimeMs] = useState<number | undefined>(() => player.finishTimeMs);
  const [questionIdx, setQuestionIdx] = useState<number>(() => (player.correctCount || 0) % Math.max(1, questions.length));

  const [studentSpeed, setStudentSpeed] = useState<number>(() => player.speedKmh || 0);
  const [studentBoosting, setStudentBoosting] = useState<boolean>(false);
  const [studentInPitStop, setStudentInPitStop] = useState<boolean>(false);
  const [liveTelemetry, setLiveTelemetry] = useState<RacerTelemetry[]>([]);

  // Victory Cruise Director Camera State (Unlocked upon crossing finish line)
  type VictoryCameraSelection = 'COCKPIT' | 'FIRST_PERSON' | 'ORBIT' | 'DIRECTOR' | 'BATTLE' | 'AUTO';
  const [victoryCamSelection, setVictoryCamSelection] = useState<VictoryCameraSelection>('AUTO');
  const [autoCamIndex, setAutoCamIndex] = useState<number>(0);

  const AUTO_CYCLE_MODES = useMemo<CameraViewMode[]>(
    () => ['ORBIT', 'FIRST_PERSON', 'DIRECTOR', 'BATTLE', 'COCKPIT'],
    []
  );

  useEffect(() => {
    if (!localIsFinished || victoryCamSelection !== 'AUTO') return;
    const interval = setInterval(() => {
      setAutoCamIndex((prev) => (prev + 1) % AUTO_CYCLE_MODES.length);
    }, 6500);
    return () => clearInterval(interval);
  }, [localIsFinished, victoryCamSelection, AUTO_CYCLE_MODES]);

  const activeCameraMode: CameraViewMode = isLobby
    ? 'ORBIT'
    : !localIsFinished
    ? 'COCKPIT'
    : victoryCamSelection === 'AUTO'
    ? AUTO_CYCLE_MODES[autoCamIndex]
    : victoryCamSelection;

  const studentProgressRef = useRef<number>(0);
  const studentDistanceRef = useRef<number>(player.distanceMeters || 0);
  const studentDistanceAtMsRef = useRef<number>(0);
  const studentSpeedRef = useRef<number>(player.speedKmh || 0);
  const studentMomentumRef = useRef<number>(player.speedKmh || 0);
  const studentInPitStopRef = useRef<boolean>(false);
  const lastSentTelemetryRef = useRef<TelemetrySyncSnapshot | null>(null);
  const lastSyncEvalAtMsRef = useRef<number>(0);
  const questionStartTimeRef = useRef<number>(Date.now());
  const prevLapRef = useRef<number>(1);
  const hasSubmittedFinishRef = useRef<boolean>(!!player.isFinished);
  const pitStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevRaceStartRef = useRef<number>(raceStartTime);
  // Track wrong attempts per question index so retries preserve mistake diagnostics
  const questionMissCountsRef = useRef<Record<number, number>>({});

  const elapsedSinceStart = Math.max(0, nowTime - raceStartTime);
  const lightsCount = isLobby ? 0 : (elapsedSinceStart >= 2400 ? 6 : Math.max(0, Math.floor(elapsedSinceStart / 400)));
  const raceActive = !isLobby && elapsedSinceStart >= 2400;
  const raceActiveRef = useRef<boolean>(raceActive);
  raceActiveRef.current = raceActive;

  useEffect(() => {
    const intervalMs = raceActive ? 500 : 100;
    const timer = setInterval(() => setNowTime(getServerTime()), intervalMs);
    return () => clearInterval(timer);
  }, [raceActive]);

  useEffect(() => {
    return () => {
      suzukaAudio.stopAll();
      if (pitStopTimerRef.current) {
        clearTimeout(pitStopTimerRef.current);
        pitStopTimerRef.current = null;
      }
    };
  }, []);

  const prevLightsRef = useRef<number>(lightsCount);
  useEffect(() => {
    if (!isLobby && lightsCount > prevLightsRef.current) {
      if (lightsCount <= 5 && lightsCount > 0) {
        suzukaAudio.playF1CountdownBeep(false);
      } else if (lightsCount === 6) {
        suzukaAudio.playF1CountdownBeep(true);
        suzukaAudio.startEngine();
        questionStartTimeRef.current = Date.now();
      }
    }
    prevLightsRef.current = lightsCount;
  }, [lightsCount, isLobby]);

  // Reset per-race refs/local state cleanly when a new raceStartTime arrives
  useEffect(() => {
    if (raceStartTime !== prevRaceStartRef.current) {
      prevRaceStartRef.current = raceStartTime;
      if (!isLobby && !player.isFinished) {
        hasSubmittedFinishRef.current = false;
        prevLapRef.current = 1;
        prevLightsRef.current = 0;
        studentProgressRef.current = 0;
        studentDistanceRef.current = 0;
        studentDistanceAtMsRef.current = 0;
        studentSpeedRef.current = 0;
        studentMomentumRef.current = 0;
        studentInPitStopRef.current = false;
        lastSentTelemetryRef.current = null;
        lastSyncEvalAtMsRef.current = 0;
        questionMissCountsRef.current = {};
        if (pitStopTimerRef.current) {
          clearTimeout(pitStopTimerRef.current);
          pitStopTimerRef.current = null;
        }
        setLocalIsFinished(false);
        setLocalFinishTimeMs(undefined);
        setStudentInPitStop(false);
        setStudentBoosting(false);
        setStudentSpeed(0);
      }
    }
  }, [raceStartTime, isLobby, player.isFinished]);

  const latestStateRef = useRef({
    questionIdx,
    localScore,
    localStreak,
    localMaxStreak,
    localCorrectCount,
    localTotalAnswered,
    localFastestTimeMs,
    localIsFinished,
    localFinishTimeMs,
    studentSpeed,
    studentBoosting,
    studentInPitStop,
  });
  latestStateRef.current = {
    questionIdx,
    localScore,
    localStreak,
    localMaxStreak,
    localCorrectCount,
    localTotalAnswered,
    localFastestTimeMs,
    localIsFinished,
    localFinishTimeMs,
    studentSpeed,
    studentBoosting,
    studentInPitStop,
  };

  // 20 Hz Local Physics & Red Speed-Zone Braking Loop
  useEffect(() => {
    if (!raceActive) return;

    let lastTick = performance.now();
    const physicsInterval = setInterval(() => {
      const now = performance.now();
      const dt = Math.min(0.1, (now - lastTick) / 1000);
      lastTick = now;
      const st = latestStateRef.current;

      setStudentSpeed((prevSpeed) => {
        const lapFrac = ((studentProgressRef.current % 1) + 1) % 1;
        const cornerCap = getSuzukaCornerSpeedLimit(lapFrac);

        if (st.localIsFinished) {
          // Finished: Enter automatic high-speed Victory Lap cruise control (respects corner speed limits)
          const victoryTarget = Math.min(175, cornerCap);
          let nextSpeed = prevSpeed;
          if (nextSpeed < victoryTarget) {
            nextSpeed = Math.min(victoryTarget, nextSpeed + 65 * dt);
          } else if (nextSpeed > victoryTarget) {
            const decel = Math.max(25 * dt, (nextSpeed - victoryTarget) * 6.0 * dt);
            nextSpeed = Math.max(victoryTarget, nextSpeed - decel);
          }
          studentMomentumRef.current = nextSpeed;

          const inCornerZone = cornerCap < 155;
          const onKerbApex =
            (lapFrac >= 0.19 && lapFrac <= 0.23) ||
            (lapFrac >= 0.38 && lapFrac <= 0.41) ||
            (lapFrac >= 0.50 && lapFrac <= 0.52) ||
            (lapFrac >= 0.94 && lapFrac <= 0.97);

          suzukaAudio.updateEngineTelemetry(nextSpeed, nextSpeed >= 145, {
            isDrifting: nextSpeed > 65 && inCornerZone,
            onCurb: nextSpeed > 55 && onKerbApex,
          });
          const rounded = Math.round(nextSpeed * 10) / 10;
          studentSpeedRef.current = rounded;
          return rounded;
        }

        if (prevSpeed <= 0 && studentMomentumRef.current <= 0) {
          studentSpeedRef.current = 0;
          return 0;
        }

        const momDecay = (4.2 + 0.018 * studentMomentumRef.current) * dt;
        studentMomentumRef.current = Math.max(0, studentMomentumRef.current - momDecay);

        let nextSpeed = prevSpeed;
        if (prevSpeed > cornerCap) {
          const brakeDecel = Math.max(22 * dt, (prevSpeed - cornerCap) * 6.0 * dt);
          nextSpeed = Math.max(cornerCap, prevSpeed - brakeDecel);
        } else if (studentMomentumRef.current > prevSpeed + 0.5 && prevSpeed < cornerCap) {
          const targetExitSpeed = Math.min(cornerCap, studentMomentumRef.current);
          nextSpeed = Math.min(targetExitSpeed, prevSpeed + 90 * dt);
        } else {
          const decay = (4.2 + 0.018 * prevSpeed) * dt;
          nextSpeed = Math.max(0, prevSpeed - decay);
          studentMomentumRef.current = nextSpeed;
        }

        if (nextSpeed < 145 && st.studentBoosting && st.localStreak < 3) {
          setStudentBoosting(false);
        }

        const inCornerZone = cornerCap < 155;
        const onKerbApex =
          (lapFrac >= 0.19 && lapFrac <= 0.23) ||
          (lapFrac >= 0.38 && lapFrac <= 0.41) ||
          (lapFrac >= 0.50 && lapFrac <= 0.52) ||
          (lapFrac >= 0.94 && lapFrac <= 0.97);

        suzukaAudio.updateEngineTelemetry(nextSpeed, nextSpeed >= 145 || st.studentBoosting, {
          isDrifting: nextSpeed > 65 && inCornerZone,
          onCurb: nextSpeed > 55 && onKerbApex,
        });
        const rounded = Math.round(nextSpeed * 10) / 10;
        studentSpeedRef.current = rounded;
        return rounded;
      });
    }, 50);

    return () => clearInterval(physicsInterval);
  }, [raceActive]);

  const onAnswerRef = useRef(onAnswer);
  onAnswerRef.current = onAnswer;

  const getEstimatedDistanceMeters = (nowMs: number): number => {
    const baseDist = studentDistanceRef.current;
    const measuredAt = studentDistanceAtMsRef.current;
    if (measuredAt <= 0) return Math.round(baseDist * 10) / 10;
    const ageSec = Math.min(0.6, Math.max(0, (nowMs - measuredAt) / 1000));
    const lapFrac = ((studentProgressRef.current % 1) + 1) % 1;
    const effectiveSpeedKmh = Math.min(
      Math.max(0, studentSpeedRef.current),
      getSuzukaCornerSpeedLimit(lapFrac)
    );
    return Math.round((baseDist + (effectiveSpeedKmh / 3.6) * ageSec) * 10) / 10;
  };

  const maybeSyncTelemetry = (distanceMeters: number, nowMs: number) => {
    if (!raceActiveRef.current) return;
    lastSyncEvalAtMsRef.current = nowMs;

    const st = latestStateRef.current;
    const isFinishedNow = st.localIsFinished || hasSubmittedFinishRef.current;
    const roundedDist = Math.round(distanceMeters * 10) / 10;
    const snapshot: TelemetrySyncSnapshot = {
      speedKmh: studentSpeedRef.current,
      distanceMeters: roundedDist,
      inPitStop: studentInPitStopRef.current,
      isFinished: isFinishedNow,
      timestampMs: nowMs,
    };
    const options = isFinishedNow
      ? VICTORY_CRUISE_TELEMETRY_OPTIONS
      : RELAXED_GP3D_TELEMETRY_OPTIONS;
    const lastSent = lastSentTelemetryRef.current;

    if (!shouldBroadcastTelemetryDelta(lastSent, snapshot, options)) {
      return;
    }

    const pitChanged = !lastSent || lastSent.inPitStop !== snapshot.inPitStop;
    lastSentTelemetryRef.current = snapshot;

    // Slim telemetry heartbeat: only send changed kinematic fields so classmates/Host do not
    // re-download unchanged cumulative score/streak/progress metadata on every tick.
    onAnswerRef.current(
      st.questionIdx,
      '',
      true,
      0,
      0,
      undefined,
      false,
      undefined,
      {
        speedKmh: snapshot.speedKmh,
        distanceMeters: snapshot.distanceMeters,
        ...(pitChanged ? { inPitStop: snapshot.inPitStop } : {}),
      }
    );
  };

  const syncHelperRef = useRef({
    getEstimatedDistanceMeters,
    maybeSyncTelemetry,
  });
  syncHelperRef.current.getEstimatedDistanceMeters = getEstimatedDistanceMeters;
  syncHelperRef.current.maybeSyncTelemetry = maybeSyncTelemetry;

  useEffect(() => {
    if (!raceActive) return;
    const syncBackupTimer = setInterval(() => {
      const nowMs = Date.now();
      // Primary delta evaluation runs cleanly in handleTelemetryUpdate with exact stage distance;
      // only evaluate here if telemetry callbacks stalled (e.g., backgrounded tab throttling).
      if (nowMs - lastSyncEvalAtMsRef.current < 1200) return;
      const estDist = syncHelperRef.current.getEstimatedDistanceMeters(nowMs);
      syncHelperRef.current.maybeSyncTelemetry(estDist, nowMs);
    }, 1200);
    return () => clearInterval(syncBackupTimer);
  }, [raceActive]);

  // Compile all racers (this student + all classmates/bots in room) for the 3D Cockpit stage
  const allRacers3D: RacerState[] = useMemo(() => {
    const mergedMap: Record<string, QuizPlayer> = {
      ...allPlayers,
      [player.id]: { ...(allPlayers[player.id] || player), ...player },
    };
    const list = Object.values(mergedMap);
    return list.map((p, idx) => {
      const isMe = p.id === player.id;
      const themeId = isMe
        ? (player.kartTheme || p.kartTheme || getSavedKartTheme())
        : p.kartTheme;
      const theme = getKartTheme(themeId);

      const colorHex = p.teamId && TEAM_HEX_MAP[p.teamId]
        ? TEAM_HEX_MAP[p.teamId]
        : theme.colorHex;

      const streak = isMe ? localStreak : (p.currentStreak || 0);
      const fallbackSpeed = p.isFinished
        ? 80
        : (p.totalAnswered || 0) === 0
        ? 0
        : Math.min(175, 75 + streak * 25);
      const speed = isMe ? studentSpeed : (p.speedKmh !== undefined ? p.speedKmh : fallbackSpeed);

      return {
        id: p.id,
        name: p.nickname,
        number: resolveRacerNumber(isMe ? player : p, idx),
        teamId: p.teamId,
        colorHex,
        stripeHex: theme.stripeHex,
        rimHex: theme.rimHex,
        suitHex: theme.suitHex,
        helmetHex: theme.helmetHex,
        visorHex: theme.visorHex,
        speedKmh: speed,
        targetSpeedKmh: speed,
        streak,
        isFinished: isMe ? localIsFinished : !!p.isFinished,
        inPitStop: isMe ? studentInPitStop : !!p.inPitStop,
        laneOffset: idx % 2 === 0 ? LANE_DRIVING : LANE_PASSING,
        isBoosting: isMe ? studentBoosting : (speed >= 145 || streak >= 3),
        authoritativeDistanceMeters: isMe ? undefined : p.distanceMeters,
      };
    });
  }, [allPlayers, player, localStreak, studentSpeed, localIsFinished, studentInPitStop, studentBoosting]);

  const handleTelemetryUpdate = (telemetry: RacerTelemetry[]) => {
    setLiveTelemetry(telemetry);
    const myTelem = telemetry.find((r) => r.id === player.id);
    if (myTelem) {
      const nowMs = Date.now();
      studentProgressRef.current = myTelem.progress;
      studentDistanceRef.current = myTelem.distanceMeters;
      studentDistanceAtMsRef.current = nowMs;

      const currentLap = Math.floor(myTelem.progress) + 1;
      if (currentLap > prevLapRef.current) {
        suzukaAudio.playLapChime();
        prevLapRef.current = currentLap;
      }

      // Check Lap Race finish condition when crossing finish line after targetLaps
      const targetDist = targetLaps * SUZUKA_CIRCUIT_LENGTH_METERS;
      const isLapFinished = myTelem.progress >= targetLaps || myTelem.distanceMeters >= targetDist;
      if (!isTimeTrial && isLapFinished && !hasSubmittedFinishRef.current) {
        hasSubmittedFinishRef.current = true;
        studentInPitStopRef.current = false;
        // Sub-frame photo-finish interpolation: subtract time spent traveling past targetDist
        const overshootMeters = Math.max(0, myTelem.distanceMeters - targetDist);
        const speedMs = Math.max(2.0, (myTelem.speedKmh || studentSpeedRef.current || 80) / 3.6);
        const overshootMs = Math.min(600, Math.round((overshootMeters / speedMs) * 1000));
        const finMs = Math.max(1000, getServerTime() - overshootMs - greenFlagTime);
        setLocalIsFinished(true);
        setLocalFinishTimeMs(finMs);
        setStudentInPitStop(false);
        soundEffects.playCheckeredFlag();

        const st = latestStateRef.current;
        const roundedDist = Math.round(myTelem.distanceMeters * 10) / 10;
        const currentSpd = studentSpeedRef.current;
        lastSentTelemetryRef.current = {
          speedKmh: currentSpd,
          distanceMeters: roundedDist,
          inPitStop: false,
          isFinished: true,
          timestampMs: nowMs,
        };
        lastSyncEvalAtMsRef.current = nowMs;

        onAnswer(
          st.questionIdx,
          '',
          true,
          0,
          0,
          st.localCorrectCount,
          true,
          finMs,
          {
            score: st.localScore,
            currentStreak: st.localStreak,
            maxStreak: st.localMaxStreak,
            correctCount: st.localCorrectCount,
            totalAnswered: st.localTotalAnswered,
            fastestTimeMs: st.localFastestTimeMs,
            speedKmh: currentSpd,
            distanceMeters: roundedDist,
            inPitStop: false,
          }
        );
        return;
      }

      syncHelperRef.current.maybeSyncTelemetry(myTelem.distanceMeters, nowMs);
    }
  };

  // Compute live rank among all racers
  const studentRank = useMemo(() => {
    if (liveTelemetry.length === 0) return 1;
    const sorted = [...liveTelemetry].sort((a, b) => b.distanceMeters - a.distanceMeters);
    return Math.max(1, sorted.findIndex((r) => r.id === player.id) + 1);
  }, [liveTelemetry, player.id]);

  const currentLapDisplay = Math.min(
    targetLaps,
    Math.max(1, Math.floor(studentProgressRef.current) + 1)
  );

  const handleStudentAnswer = (isCorrect: boolean, optionId: string) => {
    const nowMs = Date.now();
    const timeTakenMs = Math.max(100, nowMs - questionStartTimeRef.current);
    questionStartTimeRef.current = nowMs;
    const estDist = getEstimatedDistanceMeters(nowMs);
    const isFinishedNow = localIsFinished || hasSubmittedFinishRef.current;

    if (isCorrect) {
      const missesForQ = questionMissCountsRef.current[questionIdx] || 0;
      delete questionMissCountsRef.current[questionIdx];

      const nextStreak = localStreak + 1;
      const nextMaxStreak = Math.max(localMaxStreak, nextStreak);
      const nextCorrect = localCorrectCount + 1;
      const nextTotal = localTotalAnswered + 1;
      const nextFastest = Math.min(localFastestTimeMs, timeTakenMs);
      const pointsEarned = 100 + Math.min(200, nextStreak * 25);
      const nextScore = localScore + pointsEarned;

      setLocalStreak(nextStreak);
      setLocalMaxStreak(nextMaxStreak);
      setLocalCorrectCount(nextCorrect);
      setLocalTotalAnswered(nextTotal);
      setLocalFastestTimeMs(nextFastest);
      setLocalScore(nextScore);

      const throttleBoost = nextStreak === 1 ? 48 : nextStreak === 2 ? 54 : 60;
      if (nextStreak >= 2) {
        suzukaAudio.playBoostSputter(1.0);
      }

      const lapFrac = ((studentProgressRef.current % 1) + 1) % 1;
      const cornerCap = getSuzukaCornerSpeedLimit(lapFrac);
      const nextMomentum = Math.min(180, Math.max(studentSpeedRef.current, studentMomentumRef.current) + throttleBoost);
      studentMomentumRef.current = nextMomentum;
      const nextSpd = Math.round(Math.min(cornerCap, nextMomentum) * 10) / 10;
      const isBoost = nextMomentum >= 145 || nextStreak >= 3;

      studentSpeedRef.current = nextSpd;
      setStudentSpeed(nextSpd);
      setStudentBoosting(isBoost);
      if (studentInPitStopRef.current) {
        studentInPitStopRef.current = false;
        setStudentInPitStop(false);
      }
      suzukaAudio.updateEngineTelemetry(nextSpd, isBoost);

      const nextQIdx = (questionIdx + 1) % Math.max(1, questions.length);
      setQuestionIdx(nextQIdx);

      lastSentTelemetryRef.current = {
        speedKmh: nextSpd,
        distanceMeters: estDist,
        inPitStop: false,
        isFinished: isFinishedNow,
        timestampMs: nowMs,
      };
      lastSyncEvalAtMsRef.current = nowMs;

      onAnswer(
        questionIdx,
        optionId,
        true,
        timeTakenMs,
        pointsEarned,
        nextCorrect,
        isFinishedNow,
        localFinishTimeMs,
        {
          score: nextScore,
          currentStreak: nextStreak,
          maxStreak: nextMaxStreak,
          correctCount: nextCorrect,
          totalAnswered: nextTotal,
          fastestTimeMs: nextFastest,
          speedKmh: nextSpd,
          distanceMeters: estDist,
          inPitStop: false,
        },
        missesForQ
      );
    } else {
      questionMissCountsRef.current[questionIdx] = (questionMissCountsRef.current[questionIdx] || 0) + 1;
      const currentMisses = questionMissCountsRef.current[questionIdx];

      const nextTotal = localTotalAnswered + 1;
      setLocalStreak(0);
      setLocalTotalAnswered(nextTotal);
      setStudentBoosting(false);
      suzukaAudio.playRailImpact(0.75);

      const retainedRatio = Math.max(0, 1 - wrongSpeedLossRatio);
      const reducedSpd = Math.round(studentSpeedRef.current * retainedRatio * 10) / 10;
      studentMomentumRef.current = Math.round(studentMomentumRef.current * retainedRatio * 10) / 10;
      studentSpeedRef.current = reducedSpd;
      setStudentSpeed(reducedSpd);
      suzukaAudio.updateEngineTelemetry(reducedSpd, false);

      const enteredPitStop = wrongLockoutSeconds > 0;
      if (enteredPitStop) {
        studentInPitStopRef.current = true;
        setStudentInPitStop(true);
        if (pitStopTimerRef.current) clearTimeout(pitStopTimerRef.current);
        pitStopTimerRef.current = setTimeout(() => {
          pitStopTimerRef.current = null;
          studentInPitStopRef.current = false;
          setStudentInPitStop(false);
          if (!raceActiveRef.current) return;
          const st = latestStateRef.current;
          const finishNow = st.localIsFinished || hasSubmittedFinishRef.current;
          const clearNowMs = Date.now();
          const clearDist = syncHelperRef.current.getEstimatedDistanceMeters(clearNowMs);
          const clearSnapshot: TelemetrySyncSnapshot = {
            speedKmh: studentSpeedRef.current,
            distanceMeters: clearDist,
            inPitStop: false,
            isFinished: finishNow,
            timestampMs: clearNowMs,
          };
          lastSentTelemetryRef.current = clearSnapshot;
          lastSyncEvalAtMsRef.current = clearNowMs;
          onAnswerRef.current(
            st.questionIdx,
            '',
            true,
            0,
            0,
            undefined,
            false,
            undefined,
            {
              speedKmh: clearSnapshot.speedKmh,
              distanceMeters: clearSnapshot.distanceMeters,
              inPitStop: false,
            }
          );
        }, wrongLockoutSeconds * 1000);
      }

      lastSentTelemetryRef.current = {
        speedKmh: reducedSpd,
        distanceMeters: estDist,
        inPitStop: enteredPitStop ? true : studentInPitStopRef.current,
        isFinished: isFinishedNow,
        timestampMs: nowMs,
      };
      lastSyncEvalAtMsRef.current = nowMs;

      onAnswer(
        questionIdx,
        optionId,
        false,
        timeTakenMs,
        0,
        localCorrectCount,
        isFinishedNow,
        localFinishTimeMs,
        {
          score: localScore,
          currentStreak: 0,
          maxStreak: localMaxStreak,
          correctCount: localCorrectCount,
          totalAnswered: nextTotal,
          fastestTimeMs: localFastestTimeMs,
          speedKmh: reducedSpd,
          distanceMeters: estDist,
          inPitStop: enteredPitStop,
        },
        currentMisses
      );
    }
  };

  const currentQuestion = questions[questionIdx] || questions[0];
  const graceElapsedMs = raceFinishGraceStartTime ? Math.max(0, nowTime - raceFinishGraceStartTime) : 0;
  const graceRemainingSeconds = raceFinishGraceStartTime
    ? Math.max(0, Math.ceil((graceSeconds * 1000 - graceElapsedMs) / 1000))
    : graceSeconds;

  // Auto-finish student client when grace period expires even if they haven't completed all laps
  useEffect(() => {
    if (raceFinishGraceStartTime && graceRemainingSeconds <= 0 && !hasSubmittedFinishRef.current) {
      hasSubmittedFinishRef.current = true;
      studentInPitStopRef.current = false;
      const nowMs = Date.now();
      const estDist = syncHelperRef.current.getEstimatedDistanceMeters(nowMs);
      const finMs = Math.max(1000, getServerTime() - greenFlagTime);
      setLocalIsFinished(true);
      setLocalFinishTimeMs(finMs);
      setStudentInPitStop(false);
      soundEffects.playCheckeredFlag();

      const st = latestStateRef.current;
      studentSpeedRef.current = 0;
      lastSentTelemetryRef.current = {
        speedKmh: 0,
        distanceMeters: estDist,
        inPitStop: false,
        isFinished: true,
        timestampMs: nowMs,
      };
      lastSyncEvalAtMsRef.current = nowMs;

      onAnswerRef.current(
        st.questionIdx,
        '',
        false,
        0,
        0,
        st.localCorrectCount,
        true,
        finMs,
        {
          score: st.localScore,
          currentStreak: st.localStreak,
          maxStreak: st.localMaxStreak,
          correctCount: st.localCorrectCount,
          totalAnswered: st.localTotalAnswered,
          fastestTimeMs: st.localFastestTimeMs,
          speedKmh: 0,
          distanceMeters: estDist,
          inPitStop: false,
        }
      );
    }
  }, [raceFinishGraceStartTime, graceRemainingSeconds, greenFlagTime]);

  const currentCornerSpeedLimit =
    liveTelemetry.find((r) => r.id === player.id)?.cornerSpeedLimit ??
    getSuzukaCornerSpeedLimit(studentProgressRef.current);
  const isCornerLimited = currentCornerSpeedLimit < 170;
  const isPassingLane = liveTelemetry.find((r) => r.id === player.id)?.isPassingLane ?? false;

  const throttlePct = Math.min(100, Math.max(0, (studentSpeed / 180) * 100));
  const cornerCapPct = Math.min(100, Math.max(0, (currentCornerSpeedLimit / 180) * 100));

  let throttleGradient = 'from-amber-600 to-amber-400';
  if (localIsFinished) {
    throttleGradient = 'from-emerald-400 via-teal-300 to-cyan-400 animate-pulse shadow-[0_0_12px_#10b981]';
  } else if (studentSpeed >= 150) {
    throttleGradient = 'from-pink-500 via-rose-500 to-amber-400 animate-pulse shadow-[0_0_12px_#f43f5e]';
  } else if (studentSpeed >= 110) {
    throttleGradient = 'from-cyan-500 to-blue-500';
  } else if (studentSpeed >= 55) {
    throttleGradient = 'from-emerald-500 to-teal-400';
  }

  return (
    <div
      className={`fixed inset-0 w-screen h-dvh flex flex-col bg-slate-950 text-white overflow-hidden select-none ${
        isLobby ? 'pointer-events-none z-0' : 'z-40'
      }`}
    >
      {/* 1. 3D Third-Person Cockpit Stage (Top widescreen pane - 60-62% of viewport height) */}
      <div
        className={`relative ${
          isLobby
            ? 'w-full h-full'
            : 'w-full flex-1 min-h-[180px]'
        } overflow-hidden shrink-0 bg-slate-950`}
      >
        {/* Top-Right Exit Button */}
        {!isLobby && (
          <div className="absolute top-2.5 right-3 z-30 pointer-events-auto">
            <button
              type="button"
              onClick={onLeave}
              className="p-1.5 rounded-full bg-slate-950/85 backdrop-blur-md border border-slate-700 text-slate-400 hover:text-rose-400 cursor-pointer shadow-lg"
              title={t('Leave Race', '退出')}
            >
              <LogOut size={14} />
            </button>
          </div>
        )}

        {/* Top Student Race Metrics HUD: Position, Lap, and Points clustered together under Landmark! */}
        {!isLobby && (
          <div className="absolute top-11 sm:top-12 left-3 z-30 flex flex-nowrap items-center gap-1.5 sm:gap-2 pointer-events-none whitespace-nowrap">
            <div className="px-3 py-1 rounded-full bg-slate-950/85 backdrop-blur-md border border-slate-700 text-white font-black text-xs flex items-center gap-1.5 shadow-lg pointer-events-auto shrink-0">
              <span className="text-amber-400">POS:</span>
              <span className="font-mono text-sm text-emerald-400">P{studentRank}</span>
              <span className="text-slate-400 text-[10px]">/ {allRacers3D.length}</span>
            </div>

            {!isTimeTrial && (
              <div className="px-3 py-1 rounded-full bg-slate-950/85 backdrop-blur-md border border-slate-700 text-cyan-400 font-mono font-black text-xs shadow-lg flex items-center gap-1 pointer-events-auto shrink-0">
                <Flag size={11} />
                <span>LAP {currentLapDisplay} / {targetLaps}</span>
              </div>
            )}

            {/* Points counter unified right next to Position & Lap */}
            <div className="px-3 py-1 rounded-full bg-slate-950/85 backdrop-blur-md border border-slate-700 text-emerald-400 font-mono font-black text-xs shadow-lg pointer-events-auto shrink-0">
              {localScore.toLocaleString()} PTS
            </div>

            {raceFinishGraceStartTime && !isTimeTrial && (
              <div className="px-3 py-1 rounded-full bg-rose-600 text-white font-black text-xs flex items-center gap-1 animate-pulse shadow-lg pointer-events-auto shrink-0">
                <Clock size={11} />
                <span>{graceRemainingSeconds}s</span>
              </div>
            )}
          </div>
        )}

        {/* 3D Cockpit Stage with all classmates on track */}
        <Suzuka3DStage
          mode="STUDENT_COCKPIT"
          cameraMode={activeCameraMode}
          activeRacerId={player.id}
          racers={allRacers3D}
          lightsCount={lightsCount}
          trackTheme={sprintSettings?.trackTheme}
          timeOfDay={sprintSettings?.timeOfDay}
          cloudCover={sprintSettings?.cloudCover}
          precipitation={sprintSettings?.precipitation}
          targetLaps={targetLaps}
          timeTrialLimitSeconds={isTimeTrial ? (sprintSettings?.timeLimitSeconds || 60) : undefined}
          performanceProfile="MOBILE"
          onTelemetryUpdate={handleTelemetryUpdate}
          className="w-full h-full"
          hideSectorBadge={isLobby}
        />

        {/* Floating Glassmorphic Telemetry HUD over bottom edge of 3D Track (Fixed height, no wrapping shifts) */}
        {!isLobby && (
          <div className="absolute bottom-2 sm:bottom-2.5 left-3 right-3 z-30 pointer-events-none flex justify-center">
            <div className="w-full max-w-2xl bg-slate-950/85 backdrop-blur-md border border-white/20 rounded-2xl px-3 py-1.5 shadow-2xl flex flex-col gap-1 pointer-events-auto h-[58px] justify-center">
              {/* Row 1: Race Telemetry & Nitro Streak (Fixed single row, never wraps) */}
              <div className="flex items-center justify-between gap-2 flex-nowrap shrink-0">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-nowrap min-w-0">
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-600/90 text-white font-black text-[11px] sm:text-xs flex items-center gap-1 shadow-xs shrink-0">
                    <Flag size={11} />
                    <span>Q {questionIdx + 1}</span>
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-900 border border-cyan-400/40 text-cyan-300 font-mono font-black text-[11px] sm:text-xs shadow-xs shrink-0 min-w-[84px] text-center tabular-nums">
                    ⚡ {Math.round(studentSpeed)} KM/H
                  </span>
                  {isCornerLimited && (
                    <span className="px-2 py-0.5 rounded-full bg-rose-950/90 border border-rose-500/80 text-rose-200 font-mono font-black text-[10px] sm:text-[11px] flex items-center gap-1 shrink-0">
                      <AlertTriangle size={10} className="text-rose-400" />
                      <span>{t(`RED ZONE MAX ${currentCornerSpeedLimit} KM/H`, `減速帯 上限 ${currentCornerSpeedLimit} KM/H`)}</span>
                    </span>
                  )}
                </div>
                {localIsFinished ? (
                  <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 border border-emerald-400/60 font-black text-[11px] sm:text-xs animate-pulse shrink-0 shadow-[0_0_12px_rgba(16,185,129,0.4)]">
                    <span>🏁 {t('VICTORY CRUISE!', 'ウィニングラン!')}</span>
                  </span>
                ) : localStreak > 0 ? (
                  <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/25 text-amber-300 border border-amber-500/50 font-black text-[11px] sm:text-xs animate-pulse shrink-0">
                    <Flame size={12} className="text-amber-400" />
                    <span>x{localStreak} {t('NITRO!', 'かそく!')}</span>
                  </span>
                ) : (
                  <span className="text-[10px] sm:text-[11px] font-mono text-slate-500 shrink-0">
                    {t('Ready', '準備完了')}
                  </span>
                )}
              </div>

              {/* Row 2: Throttle & Momentum Progress Bar */}
              <div className="w-full flex flex-col gap-0.5 shrink-0">
                <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-mono font-bold text-slate-300 px-0.5 leading-none">
                  <span className="flex items-center gap-1 truncate">
                    <span className="text-amber-400 font-black">{t('THROTTLE:', 'スロットル:')}</span>
                    <span className="font-mono tabular-nums">{Math.round(studentSpeed)} / {currentCornerSpeedLimit} KM/H</span>
                  </span>
                  {localIsFinished ? (
                    <span className="text-emerald-400 font-black flex items-center gap-1 shrink-0 animate-pulse">
                      <span>✨ {t('Victory Lap! Watching remaining racers!', 'ウィニングラン周回中！')}</span>
                    </span>
                  ) : isCornerLimited && studentSpeed >= currentCornerSpeedLimit - 4 ? (
                    <span className="text-rose-400 font-bold flex items-center gap-1 shrink-0">
                      <AlertTriangle size={10} />
                      <span>{t(`Red Zone Cap (${currentCornerSpeedLimit})`, `減速帯上限 (${currentCornerSpeedLimit})`)}</span>
                    </span>
                  ) : studentSpeed > 0 && studentSpeed < 50 ? (
                    <span className="text-amber-400 animate-pulse font-bold flex items-center gap-1 shrink-0">
                      <AlertTriangle size={10} />
                      <span>{t('Coasting! Answer!', '減速中！正解して加速！')}</span>
                    </span>
                  ) : studentSpeed === 0 ? (
                    <span className="text-slate-400 font-bold shrink-0">
                      {t('Answer to launch!', '正解してスタート！')}
                    </span>
                  ) : studentSpeed >= 150 ? (
                    <span className="text-rose-400 font-black animate-bounce flex items-center gap-1 shrink-0">
                      <Flame size={10} />
                      <span>{t('MAX NITRO!', '最高速ニトロ!')}</span>
                    </span>
                  ) : (
                    <span className="text-slate-400 font-medium shrink-0">
                      {t('Answer to hold speed', '連続正解でスピード維持')}
                    </span>
                  )}
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-950/70 border border-white/20 p-0.5 relative overflow-hidden flex items-center">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${throttleGradient} transition-all duration-100 ease-out`}
                    style={{ width: `${throttlePct}%` }}
                  />
                  {isCornerLimited && (
                    <div
                      className="absolute top-0 bottom-0 w-1 bg-amber-400 shadow-[0_0_6px_#f59e0b] z-10 pointer-events-none"
                      style={{ left: `${cornerCapPct}%` }}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Cockpit Answering Console (Dedicated bottom dashboard - fills 100% of remaining viewport) */}
      {!isLobby && (
        <div className="w-full shrink-0 border-t-2 border-amber-400/30 bg-gradient-to-b from-slate-900 to-slate-950 shadow-[0_-12px_32px_rgba(0,0,0,0.8)] z-20 flex flex-col overflow-hidden touch-manipulation overscroll-none">
          {localIsFinished && !isTimeTrial ? (
            <div className="w-full max-w-4xl mx-auto px-2 sm:px-4 py-2 sm:py-2.5 flex flex-col gap-1.5 shadow-2xl justify-center">
              {/* Row 1: Race Goal Celebration & Auto Status Banner */}
              <div className="flex items-center justify-between w-full flex-nowrap gap-2">
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <span className="px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-md shrink-0">
                    <Trophy size={14} className="text-slate-950 shrink-0" />
                    <span>P{studentRank} {t('GOAL!', 'ゴール！')}</span>
                  </span>
                  {localFinishTimeMs !== undefined && localFinishTimeMs > 0 && (
                    <span className="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-slate-900 border border-emerald-400/50 text-emerald-300 font-mono font-black text-xs shrink-0">
                      ⏱️ {(localFinishTimeMs / 1000).toFixed(1)}s
                    </span>
                  )}
                  <span className="text-[11px] sm:text-xs md:text-sm font-bold text-slate-200 truncate">
                    {t(
                      'Victory Cruise! Switch cameras to enjoy the race:',
                      'ウィニングラン周回中！カメラを切り替えて楽しもう！'
                    )}
                  </span>
                </div>
                {victoryCamSelection === 'AUTO' && (
                  <span className="px-2 py-0.5 rounded-full bg-cyan-950/90 border border-cyan-400/60 text-cyan-300 font-mono text-[10px] sm:text-[11px] font-bold shrink-0 animate-pulse flex items-center gap-1 shadow-xs">
                    <Sparkles size={11} className="text-cyan-300" />
                    <span className="tabular-nums">
                      {t(`Auto: ${activeCameraMode}`, `自動中継: ${activeCameraMode}`)}
                    </span>
                  </span>
                )}
              </div>

              {/* Row 2: 6 Touch Camera Director Pills (Fixed height, no layout shifts) */}
              <div className="grid grid-cols-6 gap-1.5 sm:gap-2 w-full">
                {[
                  {
                    id: 'COCKPIT' as const,
                    icon: '🏎️',
                    ja: 'マイカート',
                    en: 'Chase',
                  },
                  {
                    id: 'FIRST_PERSON' as const,
                    icon: '🚀',
                    ja: 'バンパー',
                    en: 'Bumper',
                  },
                  {
                    id: 'ORBIT' as const,
                    icon: '🚁',
                    ja: '360°回転',
                    en: '360° Orbit',
                  },
                  {
                    id: 'DIRECTOR' as const,
                    icon: '📺',
                    ja: 'クラス中継',
                    en: 'TV Director',
                  },
                  {
                    id: 'BATTLE' as const,
                    icon: '⚔️',
                    ja: 'バトル注目',
                    en: 'Battle Cam',
                  },
                  {
                    id: 'AUTO' as const,
                    icon: '🎬',
                    ja: 'オート切替',
                    en: 'Auto Replay',
                  },
                ].map((item) => {
                  const isSelected = victoryCamSelection === item.id;
                  const isPlayingInAuto = victoryCamSelection === 'AUTO' && activeCameraMode === item.id;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        soundEffects.playTick();
                        setVictoryCamSelection(item.id);
                      }}
                      className={`h-11 sm:h-12 rounded-xl flex flex-col items-center justify-center px-1 border transition-all duration-150 select-none touch-manipulation cursor-pointer ${
                        isSelected
                          ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 border-amber-300 font-black shadow-[0_0_15px_rgba(245,158,11,0.5)] scale-[1.02]'
                          : isPlayingInAuto
                          ? 'bg-cyan-950/70 border-cyan-400 text-cyan-200 font-bold shadow-[0_0_10px_rgba(34,211,238,0.3)]'
                          : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border-white/15 font-bold hover:border-white/30'
                      }`}
                    >
                      <span className="text-base sm:text-lg leading-none">{item.icon}</span>
                      <span className="text-[10px] sm:text-[11px] leading-tight truncate w-full text-center mt-0.5">
                        {t(item.en, item.ja)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            currentQuestion && (
              <div className="w-full px-2 sm:px-4 py-1 sm:py-1.5 flex flex-col">
                <SuzukaStudentDeck
                  question={currentQuestion}
                  questionNumber={questionIdx + 1}
                  totalQuestions={questions.length}
                  currentStreak={localStreak}
                  speedKmh={studentSpeed}
                  cornerSpeedLimit={currentCornerSpeedLimit}
                  isPassingLane={isPassingLane}
                  wrongLockoutSeconds={wrongLockoutSeconds}
                  wrongSpeedLossRatio={wrongSpeedLossRatio}
                  onAnswer={handleStudentAnswer}
                  disabled={!raceActive}
                  hideTelemetryHeader={true}
                />
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
};
