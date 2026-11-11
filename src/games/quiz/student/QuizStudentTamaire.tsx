/**
 * ============================================================================
 * [ANTIGRAVITY REFACTOR MODULE: QuizStudentVolleyball.tsx / QuizStudentTamaire.tsx]
 * ============================================================================
 * WHAT CHANGED:
 * 1. Replaced the turn-locked Volleyball student controller (`touchLockedIn` /
 *    "WAITING FOR NEXT TOUCH...") with a continuous rapid-fire **Undōkai Bean
 *    Bag Toss (Tamaire / 玉入れ)** controller.
 * 2. Unified **Shared 3D World Architecture (3D Suzuka Circuit Style)**:
 *    - Instead of a separate 2D cartoon widget, each student's iPad mounts the
 *      **exact same 3D Three.js `Tamaire3DStage` engine** as the front-of-room
 *      TV screen, configured in `cameraMode="STUDENT_CHASE"` (`focusPlayer`).
 *    - The 3D PerspectiveCamera locks right behind/over-the-shoulder of the
 *      student's own 3D Mii-style avatar (`#01` back *Zekken* bib, *Kōhaku-bō*
 *      cap / *hachimaki*) standing on the *Masado* sand throwing circle,
 *      surrounded by their 3D teammates and looking up at their team's 4.3m
 *      bamboo pole, 3D wire-mesh basket, *Honbu* tents, and 3-story Japanese
 *      elementary school building.
 *    - **Correct Answer (`SWISH` / `GOLDEN_SWISH`)**: The student's 3D avatar
 *      jumps and hurls 1 stitched 3D bean bag (or 2 glowing golden 3D bean bags
 *      on every 3rd streak) in a high 3D arc that drops cleanly through the 3D
 *      hoop mouth, swishes inside the 3D wire-mesh net, bulges the net, and
 *      visibly adds to the 3D mound of bags inside the basket!
 *    - **Incorrect Answer (`RIM_DOINK`)**: The student's 3D avatar throws an
 *      off-target 3D bean bag (`isMiss: true`) that clanks hard off the front
 *      steel lip of the 3D basket rim, sparking 3D impact particles, violently
 *      rattling the 4.3m bamboo pole, and ricocheting down onto the 3D sand!
 * 3. Upgraded the mistake lockout penalty from 2.0s to the mandatory **2.5s
 *    minimum floor** (`resolveLockoutPenaltySeconds`, "Fumbled Bean Bag! /
 *    お手玉を落とした！ +2.5s") per GEMINI.md §7.
 * 4. Added `<ruby>` furigana rendering and `resolveOptionPresentation`
 *    (`!isEnPrompt` option image guard + `WITH_KATAKANA` reading aids) per
 *    GEMINI.md §3 & §7.
 * ============================================================================
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  QuizQuestion,
  QuizPlayer,
  evaluateOptionMatch,
  resolveLockoutPenaltySeconds,
  resolveOptionPresentation,
  advanceTamaireThrowStep,
  TamaireThrowActionStep,
  TamaireStepOutcome,
  buildTamaireSuspenseSchedule,
  TamaireSuspenseFrame,
} from '../core/quizEngine';
import {
  Tamaire3DStage,
  VolleyballAnswerEvent,
  TamaireStudentRosterItem,
} from '../host/Tamaire3DStage';
import { Flame, XCircle } from 'lucide-react';
import { getServerTime } from '@/services/rtdbSafe';
import { soundEffects } from '@/services/soundEffects';

export interface TamaireSettings {
  timeLimitSeconds: number;
  gameStyle: 'COOP_RALLY' | 'TEAM_VS';
  targetRallies?: number;
  missLockoutSeconds?: number;
  hideScoreUntilEnd?: boolean;
}

const OPTION_STYLES = [
  { symbol: 'triangle' as const, shapeName: '▲', bg: 'bg-rose-500', hoverBg: 'hover:bg-rose-600', border: 'border-rose-700' },
  { symbol: 'diamond' as const, shapeName: '◆', bg: 'bg-blue-500', hoverBg: 'hover:bg-blue-600', border: 'border-blue-700' },
  { symbol: 'circle' as const, shapeName: '●', bg: 'bg-amber-400', hoverBg: 'hover:bg-amber-500', border: 'border-amber-600' },
  { symbol: 'square' as const, shapeName: '■', bg: 'bg-emerald-500', hoverBg: 'hover:bg-emerald-600', border: 'border-emerald-700' },
];

class StudentThrowAudioEngine {
  private ctx: AudioContext | null = null;

  private getGainScale(): number {
    if (soundEffects.isMuted()) return 0;
    return soundEffects.isQuietClassroomMode() ? 0.22 : 1.0;
  }

  public dispose() {
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public playScoop() {
    const scale = this.getGainScale();
    if (scale <= 0) return;
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(340, now);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.11);
    gain.gain.setValueAtTime(0.11 * scale, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  public playAimLock() {
    const scale = this.getGainScale();
    if (scale <= 0) return;
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [523.25, 659.25].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.045);
      gain.gain.setValueAtTime(0.11 * scale, now + idx * 0.045);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.045 + 0.11);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.045);
      osc.stop(now + idx * 0.045 + 0.12);
    });
  }

  public playSwish(isGolden: boolean) {
    const scale = this.getGainScale();
    if (scale <= 0) return;
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Woven-net swish noise ("シュッ…スポッ！") + rising confirmation chime
    const bufferSize = Math.floor(ctx.sampleRate * 0.18);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const env = Math.sin((i / bufferSize) * Math.PI);
      data[i] = (Math.random() * 2 - 1) * env * 0.22;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, now);
    filter.frequency.exponentialRampToValueAtTime(2800, now + 0.16);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.18 * scale, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);

    const notes = isGolden ? [587.33, 880, 1174.66] : [523.25, 783.99];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.055);
      oscGain.gain.setValueAtTime(0.12 * scale, now + idx * 0.055);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.055 + 0.18);
      osc.connect(oscGain);
      oscGain.connect(ctx.destination);
      osc.start(now + idx * 0.055);
      osc.stop(now + idx * 0.055 + 0.19);
    });
  }

  public playRimDoink() {
    const scale = this.getGainScale();
    if (scale <= 0) return;
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Metallic rim clang ("ガンッ！ / カーン！")
    const clang = ctx.createOscillator();
    const clangGain = ctx.createGain();
    clang.type = 'square';
    clang.frequency.setValueAtTime(420, now);
    clang.frequency.exponentialRampToValueAtTime(155, now + 0.24);
    clangGain.gain.setValueAtTime(0.18 * scale, now);
    clangGain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
    clang.connect(clangGain);
    clangGain.connect(ctx.destination);
    clang.start(now);
    clang.stop(now + 0.27);
  }
}

export interface QuizStudentTamaireProps {
  player: QuizPlayer;
  questions: QuizQuestion[];
  raceStartTime: number;
  volleyballSettings?: TamaireSettings;
  volleyballFinished?: boolean;
  volleyballLiveState?: any;
  redScore?: number;
  whiteScore?: number;
  studentRoster?: TamaireStudentRosterItem[];
  answerEvents?: VolleyballAnswerEvent[];
  onTimeExpired?: () => void;
  onAnswer: (
    questionIndex: number,
    optionId: string,
    isCorrect: boolean,
    timeTakenMs: number,
    pointsEarned: number,
    nextIndex: number,
    isFinished?: boolean,
    finishTimeMs?: number,
    cumulativeStats?: {
      score: number;
      currentStreak: number;
      maxStreak: number;
      correctCount: number;
      totalAnswered: number;
      fastestTimeMs?: number;
    },
    incorrectAttempts?: number,
    bagsThrown?: 0 | 1 | 2,
    stepAction?: VolleyballAnswerEvent['stepAction']
  ) => void;
  onLeave?: () => void;
}

export const QuizStudentTamaire: React.FC<QuizStudentTamaireProps> = ({
  player,
  questions,
  raceStartTime,
  volleyballSettings,
  volleyballFinished = false,
  volleyballLiveState,
  redScore = 0,
  whiteScore = 0,
  studentRoster,
  answerEvents,
  onTimeExpired,
  onAnswer,
}) => {
  const timeLimitSeconds = volleyballSettings?.timeLimitSeconds || 60;
  const matchStartTime = raceStartTime + 1500;

  const [localScore, setLocalScore] = useState<number>(() => player.score || 0);
  const [localStreak, setLocalStreak] = useState<number>(() => player.currentStreak || 0);
  const [localMaxStreak, setLocalMaxStreak] = useState<number>(() => player.maxStreak || 0);
  const [localBagsThrown, setLocalBagsThrown] = useState<number>(() => player.correctCount || 0);
  const [localTotalAnswered, setLocalTotalAnswered] = useState<number>(() => player.totalAnswered || 0);
  const [localFastestTimeMs, setLocalFastestTimeMs] = useState<number>(() => player.fastestTimeMs || 999999);

  // 3-Step Physical Bean Bag Toss Cycle: 0 = ① 玉を拾う (Scoop), 1 = ② カゴを狙う (Aim), 2 = ③ カゴへ投げる (Throw!)
  const [actionStep, setActionStep] = useState<TamaireThrowActionStep>(0);
  // Student iPad Camera Perspective (3rd-Person Behind You vs. 1st-Person Eyes-Up POV — kept during Counting too!)
  const [viewPerspective, setViewPerspective] = useState<'THIRD_PERSON' | 'FIRST_PERSON'>('THIRD_PERSON');

  const [currentIndex, setCurrentIndex] = useState<number>(() => {
    const answeredKeys = Object.keys(player.answers || {}).length;
    return Math.max(player.sprintProgress || 0, answeredKeys);
  });

  // Sync if authoritative player state hydrates after mount on reconnect
  useEffect(() => {
    const answeredKeys = Object.keys(player.answers || {}).length;
    const authoritativeNext = Math.max(player.sprintProgress || 0, answeredKeys);
    if (authoritativeNext > currentIndex) {
      setCurrentIndex(authoritativeNext);
    }
  }, [player.sprintProgress, player.answers, currentIndex]);

  const currentQuestion = questions[currentIndex % Math.max(1, questions.length)];

  const [shotCallout, setShotCallout] = useState<{
    id: number;
    outcome: TamaireStepOutcome;
    labelJa: string;
    labelEn: string;
  } | null>(null);

  const [local3DEvents, setLocal3DEvents] = useState<VolleyballAnswerEvent[]>([]);
  const localEvtCounterRef = useRef<number>(10000);
  const audioRef = useRef<StudentThrowAudioEngine | null>(null);

  const [isAnswering, setIsAnswering] = useState<boolean>(false);
  const [eliminatedOptionIds, setEliminatedOptionIds] = useState<Set<string>>(new Set());
  const [mistakeCountOnQuestion, setMistakeCountOnQuestion] = useState<number>(0);

  // 2.5s Fumbled Bean Bag Lockout Penalty State
  const [penaltySecondsLeft, setPenaltySecondsLeft] = useState<number>(0);
  const penaltyEndTimeRef = useRef<number>(0);
  const questionStartTimeRef = useRef<number>(Date.now());
  const [lastFumbleReason, setLastFumbleReason] = useState<TamaireStepOutcome>('FUMBLED_SAND');

  const isRed = player.teamId !== 'team_white';
  const focusTeam: 'red' | 'white' = isRed ? 'red' : 'white';

  const [nowTime, setNowTime] = useState<number>(() => getServerTime());
  useEffect(() => {
    const timer = setInterval(() => setNowTime(getServerTime()), 200);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    return () => {
      audioRef.current?.dispose();
      audioRef.current = null;
    };
  }, []);

  const elapsedSinceStart = Math.max(0, nowTime - matchStartTime);
  const timeRemainingSeconds = Math.max(
    0,
    Math.ceil((timeLimitSeconds * 1000 - elapsedSinceStart) / 1000)
  );
  const isMatchFinished = timeRemainingSeconds <= 0 || Boolean(volleyballFinished);

  const expiredNotifiedRef = useRef<boolean>(false);
  useEffect(() => {
    if (timeRemainingSeconds <= 0 && !expiredNotifiedRef.current) {
      expiredNotifiedRef.current = true;
      onTimeExpired?.();
    } else if (timeRemainingSeconds > 0) {
      expiredNotifiedRef.current = false;
    }
  }, [timeRemainingSeconds, onTimeExpired]);

  const effectiveRedScore = redScore || volleyballLiveState?.redScore || 0;
  const effectiveWhiteScore = whiteScore || volleyballLiveState?.whiteScore || 0;

  const latestScoresRef = useRef({ red: effectiveRedScore, white: effectiveWhiteScore });
  latestScoresRef.current = {
    red: isRed ? Math.max(effectiveRedScore, localBagsThrown) : effectiveRedScore,
    white: !isRed ? Math.max(effectiveWhiteScore, localBagsThrown) : effectiveWhiteScore,
  };

  // Synchronized Student iPad "Look Up at the Big Screen!" Suspense Frame
  // Snapshots scores when isMatchFinished transitions to true so the ceremony never resets mid-count!
  const [ceremonyFrame, setCeremonyFrame] = useState<TamaireSuspenseFrame | null>(null);
  useEffect(() => {
    if (!isMatchFinished) {
      setCeremonyFrame(null);
      return;
    }
    const snapRed = latestScoresRef.current.red;
    const snapWhite = latestScoresRef.current.white;
    const schedule = buildTamaireSuspenseSchedule(snapRed, snapWhite);
    let cancelled = false;
    let timeoutId: number | null = null;

    const runStep = (idx: number) => {
      if (cancelled || idx >= schedule.length) return;
      const frame = schedule[idx];
      setCeremonyFrame(frame);
      if (frame.stage !== 'VICTORY_FANFARE' && frame.delayMs > 0) {
        timeoutId = window.setTimeout(() => runStep(idx + 1), frame.delayMs);
      }
    };
    runStep(0);
    return () => {
      cancelled = true;
      if (timeoutId !== null) window.clearTimeout(timeoutId);
    };
  }, [isMatchFinished]);

  useEffect(() => {
    if (penaltySecondsLeft <= 0) return;
    const interval = setInterval(() => {
      const remainingMs = penaltyEndTimeRef.current - Date.now();
      const remainingSec = Math.max(0, remainingMs / 1000);
      setPenaltySecondsLeft(parseFloat(remainingSec.toFixed(1)));
      if (remainingMs <= 0) {
        clearInterval(interval);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [penaltySecondsLeft]);

  useEffect(() => {
    questionStartTimeRef.current = Date.now();
    setIsAnswering(false);
    setEliminatedOptionIds(new Set());
    setMistakeCountOnQuestion(0);
    setPenaltySecondsLeft(0);
  }, [currentIndex]);

  // Merge room-wide 3D classmate throws with immediate local student 3D throw events!
  const active3DEvents = useMemo(() => {
    const combined = [...(answerEvents || []), ...local3DEvents];
    if (combined.length === 0) return [];
    combined.sort((a, b) => a.timestamp - b.timestamp);
    return [combined[combined.length - 1]];
  }, [local3DEvents, answerEvents]);

  const triggerStudent3DAction = (outcome: TamaireStepOutcome) => {
    const id = localEvtCounterRef.current++;
    const isGoldenDouble = outcome === 'GOLDEN_SWISH';
    const isMiss =
      outcome === 'RIM_DOINK' || outcome === 'FUMBLED_SAND' || outcome === 'DROPPED_BAG';

    const stepAction: VolleyballAnswerEvent['stepAction'] =
      outcome === 'SCOOPED_BAG'
        ? 'SCOOP'
        : outcome === 'LOCKED_AIM'
          ? 'AIM'
          : outcome;

    setLocal3DEvents([
      {
        id,
        playerId: player.id || 'ipad_student_1',
        playerName: player.nickname || 'YOU',
        team: focusTeam,
        timestamp: Date.now(),
        isGoldenDouble,
        isMiss,
        stepAction,
      },
    ]);

    if (!audioRef.current) audioRef.current = new StudentThrowAudioEngine();

    if (outcome === 'SCOOPED_BAG') {
      audioRef.current.playScoop();
      setShotCallout({
        id,
        outcome,
        labelJa: '✋ ① お手玉を拾った！ (1/3 OK!)',
        labelEn: 'SCOOPED BAG FROM SAND! NEXT: AIM AT NET!',
      });
    } else if (outcome === 'LOCKED_AIM') {
      audioRef.current.playAimLock();
      setShotCallout({
        id,
        outcome,
        labelJa: '🎯 ② カゴに照準ロックオン！ (2/3 OK!)',
        labelEn: 'LOCKED ON TARGET! NEXT: SINK THE SHOT!',
      });
    } else if (outcome === 'GOLDEN_SWISH') {
      audioRef.current.playSwish(true);
      setShotCallout({
        id,
        outcome,
        labelJa: '🔥 ③ 金のお手玉 2個ナイスイン！ (+2個)',
        labelEn: 'GOLDEN 2x 3D SWISH THROUGH THE NET!!',
      });
    } else if (outcome === 'SWISH') {
      audioRef.current.playSwish(false);
      setShotCallout({
        id,
        outcome,
        labelJa: '🎯 ③ スポッ！ナイスイン！ (+1個)',
        labelEn: '3D SWISH THROUGH THE NET!! (+1 BAG)',
      });
    } else if (outcome === 'FUMBLED_SAND') {
      audioRef.current.playRimDoink();
      setShotCallout({
        id,
        outcome,
        labelJa: '💦 砂で手が滑って拾えなかった！',
        labelEn: 'FUMBLED IN THE SAND! TRY SCOOPING AGAIN!',
      });
    } else if (outcome === 'DROPPED_BAG') {
      audioRef.current.playRimDoink();
      setShotCallout({
        id,
        outcome,
        labelJa: '💦 あっ！お手玉を落とした！ (①へ戻る)',
        labelEn: 'DROPPED THE BAG! PICK IT UP AGAIN!',
      });
    } else {
      audioRef.current.playRimDoink();
      setShotCallout({
        id,
        outcome,
        labelJa: '💥 ガンッ！カゴのフチに弾かれた！ (①へ戻る)',
        labelEn: '3D RIM DOINK!! PICK UP ANOTHER BAG!',
      });
    }
  };

  const handleSelect = (optionId: string) => {
    if (
      isMatchFinished ||
      isAnswering ||
      penaltySecondsLeft > 0 ||
      eliminatedOptionIds.has(optionId) ||
      !currentQuestion
    ) {
      return;
    }

    setIsAnswering(true);
    const elapsed = Date.now() - questionStartTimeRef.current;
    const timeTakenMs = Math.max(150, isNaN(elapsed) ? 1500 : elapsed);
    const isCorrect = evaluateOptionMatch(currentQuestion, optionId);

    const stepResult = advanceTamaireThrowStep({
      currentStep: actionStep,
      isCorrect,
      previousStreak: localStreak,
      timeTakenMs,
    });

    setActionStep(stepResult.nextStep);
    triggerStudent3DAction(stepResult.outcome);

    if (isCorrect) {
      const newMaxStreak = Math.max(localMaxStreak, stepResult.newStreak);
      const newScore = localScore + stepResult.pointsEarned;
      const newBagsCount = localBagsThrown + stepResult.bagsThrown;
      const newTotalAnswered = localTotalAnswered + 1;
      const nextIndex = currentIndex + 1;
      const newFastestTimeMs = Math.min(localFastestTimeMs, timeTakenMs);

      setLocalScore(newScore);
      setLocalStreak(stepResult.newStreak);
      setLocalMaxStreak(newMaxStreak);
      setLocalBagsThrown(newBagsCount);
      setLocalTotalAnswered(newTotalAnswered);
      setLocalFastestTimeMs(newFastestTimeMs);

      const cumulative = {
        score: newScore,
        currentStreak: stepResult.newStreak,
        maxStreak: newMaxStreak,
        correctCount: newBagsCount,
        totalAnswered: newTotalAnswered,
        fastestTimeMs: newFastestTimeMs,
      };

      const stepActionForHost: VolleyballAnswerEvent['stepAction'] =
        stepResult.outcome === 'SCOOPED_BAG'
          ? 'SCOOP'
          : stepResult.outcome === 'LOCKED_AIM'
            ? 'AIM'
            : stepResult.outcome === 'GOLDEN_SWISH'
              ? 'GOLDEN_SWISH'
              : 'SWISH';

      onAnswer(
        currentIndex,
        optionId,
        true,
        timeTakenMs,
        stepResult.pointsEarned,
        nextIndex,
        false,
        undefined,
        cumulative,
        mistakeCountOnQuestion,
        stepResult.bagsThrown,
        stepActionForHost
      );

      setTimeout(() => {
        setCurrentIndex(nextIndex);
      }, 220);
    } else {
      setLastFumbleReason(stepResult.outcome);

      // [ANTIGRAVITY REFACTOR]: Enforces >= 2.5s Fumbled Bean Bag lockout floor
      const nextMistakes = mistakeCountOnQuestion + 1;
      setMistakeCountOnQuestion(nextMistakes);
      setEliminatedOptionIds((prev) => new Set(prev).add(optionId));

      const lockoutInfo = resolveLockoutPenaltySeconds({
        mode: 'VOLLEYBALL',
        mistakeCountOnQuestion: nextMistakes,
        configuredLockoutSeconds: volleyballSettings?.missLockoutSeconds,
      });

      const penaltyEnd = Date.now() + Math.round(lockoutInfo.penaltySeconds * 1000);
      penaltyEndTimeRef.current = penaltyEnd;
      setPenaltySecondsLeft(lockoutInfo.penaltySeconds);

      const newTotalAnswered = localTotalAnswered + 1;
      setLocalStreak(0);
      setLocalTotalAnswered(newTotalAnswered);

      const cumulative = {
        score: localScore,
        currentStreak: 0,
        maxStreak: localMaxStreak,
        correctCount: localBagsThrown,
        totalAnswered: newTotalAnswered,
        fastestTimeMs: localFastestTimeMs < 999999 ? localFastestTimeMs : undefined,
      };

      const missStepAction: VolleyballAnswerEvent['stepAction'] =
        stepResult.outcome === 'FUMBLED_SAND'
          ? 'FUMBLED_SAND'
          : stepResult.outcome === 'DROPPED_BAG'
            ? 'DROPPED_BAG'
            : 'RIM_DOINK';

      onAnswer(
        currentIndex,
        optionId,
        false,
        timeTakenMs,
        0,
        currentIndex,
        false,
        undefined,
        cumulative,
        nextMistakes,
        0,
        missStepAction
      );

      setTimeout(() => {
        setIsAnswering(false);
      }, 320);
    }
  };

  if (!currentQuestion) {
    return null;
  }

  const isEnPrompt =
    currentQuestion.promptType === 'EN_TO_JA' || currentQuestion.promptType === 'EN_WORD';
  const minCounted = Math.min(
    ceremonyFrame?.countedRed ?? 0,
    ceremonyFrame?.countedWhite ?? 0
  );
  const isGoldenShotArmed =
    actionStep === 2 && (localStreak + 1) >= 6 && (localStreak + 1) % 6 === 0 && penaltySecondsLeft <= 0;

  return (
    <div className="relative w-full h-full flex flex-col bg-slate-900 text-white rounded-3xl border-2 border-slate-700 overflow-hidden select-none p-2.5">
      {/* 1. Top Sports Day Hachimaki Headband & Bean Bag Counter */}
      <div className="flex items-center justify-between pb-1.5 shrink-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          {isRed ? (
            <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-600 text-white font-black text-[11px] shadow border border-white/70">
              <span>🔴</span>
              <span>
                <ruby>赤組<rt className="text-[7px]">あかぐみ</rt></ruby> (RED)
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white text-slate-900 font-black text-[11px] shadow border border-slate-300">
              <span>⚪</span>
              <span>
                <ruby>白組<rt className="text-[7px]">しろぐみ</rt></ruby> (WHITE)
              </span>
            </div>
          )}

          <div
            data-testid="student-bags-thrown"
            className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-black text-[11px]"
          >
            <span>🫘</span>
            <span>{localBagsThrown} 個イン！ (SWISHES)</span>
          </div>

          {localStreak >= 2 && !isMatchFinished && (
            <div className="flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-rose-500/30 text-rose-300 font-black text-[11px]">
              <Flame size={11} />
              <span>x{localStreak}</span>
            </div>
          )}
        </div>

        <div
          className={`font-mono text-[11px] font-black px-2 py-0.5 rounded-lg border ${
            isMatchFinished
              ? 'bg-amber-400 text-slate-950 border-white'
              : timeRemainingSeconds <= 10
                ? 'bg-rose-600 text-white border-amber-300 animate-pulse'
                : 'bg-slate-800 text-amber-300 border-slate-700'
          }`}
        >
          {isMatchFinished ? '📢 玉かぞえ中' : `⏱️ ${timeRemainingSeconds}s`}
        </div>
      </div>

      {/* 2. Real 3D Three.js Personal Student Camera (Keeps 3rd-Person or 1st-Person POV even during 3D Bag Tallying!) */}
      <div
        data-testid="student-tamaire-throw-canvas"
        className={`relative w-full shrink-0 rounded-2xl overflow-hidden border-2 shadow-inner mb-1.5 bg-sky-900 transition-all duration-300 ${
          isMatchFinished
            ? 'h-[218px] sm:h-[232px] border-amber-400'
            : 'h-[178px] sm:h-[188px] border-slate-700'
        }`}
      >
        <Tamaire3DStage
          cameraMode="STUDENT_CHASE"
          focusPlayer={{
            id: player.id || 'ipad_student_1',
            nickname: player.nickname || 'YOU',
            team: focusTeam,
          }}
          redScore={isRed ? Math.max(effectiveRedScore, localBagsThrown) : effectiveRedScore}
          whiteScore={!isRed ? Math.max(effectiveWhiteScore, localBagsThrown) : effectiveWhiteScore}
          matchEnded={isMatchFinished}
          winner={null}
          redPlayersCount={6}
          whitePlayersCount={6}
          studentRoster={studentRoster}
          answerEvents={active3DEvents}
          isGoldenNext={isGoldenShotArmed}
          studentActionStep={actionStep}
          studentViewPerspective={viewPerspective}
        />

        {/* Top-Left Personal 3D Camera Badge + 3rd-Person / 1st-Person Toggle */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5 z-20">
          <div className="px-2 py-0.5 rounded-md bg-slate-950/80 backdrop-blur-sm border border-white/20 text-[10px] font-black text-white flex items-center gap-1 pointer-events-none">
            <span
              className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                isMatchFinished ? 'bg-amber-400' : 'bg-emerald-400'
              }`}
            />
            <span>
              {isMatchFinished
                ? `体育座り視点 • ${player.nickname || 'YOU'} (#01)`
                : `3D CHASE CAM • ${player.nickname || 'YOU'} (#01)`}
            </span>
          </div>

          <button
            type="button"
            data-testid="student-perspective-toggle"
            onClick={() =>
              setViewPerspective((v) => (v === 'THIRD_PERSON' ? 'FIRST_PERSON' : 'THIRD_PERSON'))
            }
            className="px-2 py-0.5 rounded-md bg-slate-950/85 hover:bg-slate-900 border border-amber-400/50 text-[10px] font-black text-amber-300 cursor-pointer transition shadow"
          >
            {viewPerspective === 'THIRD_PERSON' ? '🎥 3人称 (背後)' : '🎥 1人称 (主観)'}
          </button>
        </div>

        {/* Shot / Step Outcome Callout Pill in Top-Right (Active Play Only) */}
        {!isMatchFinished && shotCallout && (
          <div
            key={shotCallout.id}
            data-testid="student-shot-callout"
            data-shot-outcome={shotCallout.outcome}
            className={`absolute top-2 right-2 px-2.5 py-1 rounded-xl font-black text-right shadow-lg border pointer-events-none whitespace-nowrap transition-all z-20 ${
              shotCallout.outcome === 'GOLDEN_SWISH'
                ? 'bg-amber-400 text-slate-950 border-white'
                : shotCallout.outcome === 'SWISH'
                  ? 'bg-emerald-600/95 text-white border-emerald-300'
                  : shotCallout.outcome === 'SCOOPED_BAG' || shotCallout.outcome === 'LOCKED_AIM'
                    ? 'bg-indigo-600/95 text-white border-amber-300'
                    : 'bg-rose-600/95 text-white border-amber-300'
            }`}
          >
            <div className="text-[11px] leading-tight">{shotCallout.labelJa}</div>
            <div className="text-[8px] uppercase tracking-wider opacity-90">
              {shotCallout.labelEn}
            </div>
          </div>
        )}

        {/* Golden 2x Ready Indicator */}
        {!isMatchFinished && isGoldenShotArmed && (
          <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 font-black text-[10px] shadow animate-bounce pointer-events-none z-20">
            ✨ NEXT = 2x GOLDEN BAG!
          </div>
        )}
      </div>

      {/* 3 & 4. Either Active 3-Step Question/Options OR Synchronized Live Bean Bag Tally Board (玉かぞえライブボード) */}
      {!isMatchFinished ? (
        <>
          {/* 3A. 3-Step Physical Bean Bag Action Bar (① 玉を拾う Scoop -> ② カゴを狙う Aim -> ③ カゴへ投げる Throw!) */}
          <div
            data-testid="student-3step-progress"
            data-current-step={actionStep}
            className="grid grid-cols-3 gap-1.5 mb-1.5 shrink-0"
          >
            {[
              {
                step: 0 as const,
                icon: '✋',
                labelJa: '① 玉を拾う',
                labelEn: '1. Scoop Bag',
              },
              {
                step: 1 as const,
                icon: '👀',
                labelJa: '② カゴを狙う',
                labelEn: '2. Lock Aim',
              },
              {
                step: 2 as const,
                icon: '🎯',
                labelJa: '③ 投げる！',
                labelEn: '3. Sink Shot!',
              },
            ].map((item) => {
              const isCurrent = actionStep === item.step;
              const isDone = actionStep > item.step;
              return (
                <div
                  key={item.step}
                  className={`px-2 py-1 rounded-xl border text-center transition-all flex items-center justify-center gap-1 ${
                    isCurrent
                      ? 'bg-amber-400 text-slate-950 border-white font-black shadow-md scale-[1.02]'
                      : isDone
                        ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/60 font-black'
                        : 'bg-slate-950/70 text-slate-400 border-slate-800 font-bold'
                  }`}
                >
                  <span className="text-xs">{isDone ? '✅' : item.icon}</span>
                  <div className="leading-none text-left">
                    <div className="text-[10px] font-black">{item.labelJa}</div>
                    <div className="text-[8px] opacity-80">{item.labelEn}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 3B. Target Vocabulary Prompt Card */}
          <div className="bg-slate-950 rounded-2xl px-3 py-1.5 border-2 border-slate-800 flex flex-col items-center justify-center relative min-h-[58px] mb-1.5 shrink-0">
            <span className="text-[9px] font-black uppercase tracking-widest text-amber-400">
              {actionStep === 0
                ? '✋ STEP 1/3: 正解して足元のお手玉を拾おう！ (ANSWER TO SCOOP BAG FROM SAND)'
                : actionStep === 1
                  ? '👀 STEP 2/3: 正解して落とさずにカゴへ狙いを定めよう！ (ANSWER TO LOCK AIM ON NET)'
                  : isGoldenShotArmed
                    ? '🔥 STEP 3/3: 正解で金のお手玉 2個スウィッシュ！！ (ANSWER TO SINK 2x GOLDEN SHOT!)'
                    : '🎯 STEP 3/3: 照準ロック完了！正解してカゴへ投げ込もう！ (ANSWER TO SINK THE SHOT!)'}
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-white text-center leading-tight mt-0.5">
              {currentQuestion.isMath
                ? currentQuestion.promptText
                : isEnPrompt
                ? currentQuestion.targetWordEnglish
                : currentQuestion.targetWordJa}
            </h3>
            {currentQuestion.promptSubtext && (
              <span className="text-[10px] font-bold text-slate-400">
                {currentQuestion.promptSubtext}
              </span>
            )}

            {/* Mandatory 2.5s Fumbled Bean Bag Lockout Overlay */}
            {penaltySecondsLeft > 0 && (
              <div
                data-testid="tamaire-lockout-overlay"
                className="absolute inset-0 bg-rose-950/95 rounded-2xl z-30 flex items-center justify-between px-3.5 py-2 border-2 border-rose-500"
              >
                <div className="text-left">
                  <div className="text-xs sm:text-sm font-black text-rose-200">
                    {lastFumbleReason === 'FUMBLED_SAND'
                      ? '💦 砂で手が滑ってお手玉を拾えなかった！'
                      : lastFumbleReason === 'DROPPED_BAG'
                        ? '💦 あっ！お手玉を落とした！ (①玉を拾うからやり直し)'
                        : '💥 カゴのフチに弾かれた！ (①玉を拾うからやり直し)'}
                  </div>
                  <p className="text-[10px] font-bold text-rose-300">
                    {lastFumbleReason === 'FUMBLED_SAND'
                      ? 'Fumbled in sand! ≥2.5s Recovery • Wrong option eliminated'
                      : lastFumbleReason === 'DROPPED_BAG'
                        ? 'Dropped bag! Reset to Step 1 (Scoop) • ≥2.5s Recovery'
                        : 'Rim Doink! Reset to Step 1 (Scoop) • ≥2.5s Recovery'}
                  </p>
                </div>
                <div className="px-2.5 py-1 rounded-full bg-rose-900 border border-rose-400 font-mono text-xs font-black text-amber-300 shrink-0">
                  {penaltySecondsLeft.toFixed(1)}s
                </div>
              </div>
            )}
          </div>

          {/* 4. Four-Choice Answer Grid (▲◆●■) with !isEnPrompt & Furigana */}
          <div className="flex-1 grid grid-cols-2 gap-2 min-h-[124px]">
            {currentQuestion.options.map((option, idx) => {
              const style = OPTION_STYLES[idx % OPTION_STYLES.length];
              const isEliminated = eliminatedOptionIds.has(option.id);
              const pres = resolveOptionPresentation(currentQuestion, option);

              return (
                <button
                  key={option.id}
                  type="button"
                  disabled={isAnswering || penaltySecondsLeft > 0 || isEliminated || isMatchFinished}
                  onClick={() => handleSelect(option.id)}
                  className={`relative rounded-2xl p-2.5 flex flex-col justify-between text-left border-2 transition-all active:scale-95 cursor-pointer ${
                    isEliminated
                      ? 'opacity-25 grayscale bg-slate-800 border-slate-700 pointer-events-none'
                      : `${style.bg} ${style.hoverBg} ${style.border} text-white shadow-md`
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="w-5 h-5 rounded-md bg-black/25 flex items-center justify-center text-[11px] font-black">
                      {style.shapeName}
                    </span>
                    {isEliminated && <XCircle size={14} className="text-rose-300" />}
                  </div>

                  <div className="my-auto text-center w-full">
                    <span className="text-sm sm:text-base font-black block leading-snug">
                      {pres.isEnPrompt && option.ruby && option.ruby.length > 0 ? (
                        <span>
                          {option.ruby.map((seg, rIdx) =>
                            seg.ruby ? (
                              <ruby key={rIdx}>
                                {seg.base}
                                <rt className="text-[8px] font-bold">{seg.ruby}</rt>
                              </ruby>
                            ) : (
                              <span key={rIdx}>{seg.base}</span>
                            )
                          )}
                        </span>
                      ) : (
                        pres.displayText
                      )}
                    </span>
                    {pres.subText && (
                      <span className="text-[10px] font-bold opacity-90 block">
                        {pres.subText}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </>
      ) : (
        /* 5. Post-Whistle Live Bean Bag Tally Board (Below the Live 3D Tally Cam!) */
        <div
          data-testid="student-eyes-up-overlay"
          className="flex-1 bg-slate-950/95 rounded-2xl border-2 border-amber-400 p-3 flex flex-col justify-between text-center shadow-xl"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] uppercase tracking-wider shadow">
              📢 玉かぞえセレモニー • TALLYING BAGS!
            </span>
            <span className="text-[10px] font-bold text-amber-300">
              👀 メイン画面と上の3Dカゴを見よう！
            </span>
          </div>

          <div className="my-auto py-1 space-y-1">
            <h3 className="text-lg sm:text-2xl font-black text-white leading-tight">
              {ceremonyFrame?.stage === 'CLIFFHANGER_RATTLE'
                ? `🥁 同点 ${ceremonyFrame.stepIndex}個！まだ入っているか…！？`
                : ceremonyFrame?.stage === 'VICTORY_FANFARE'
                  ? `🏆 ${ceremonyFrame.headlineJa}`
                  : ceremonyFrame?.callout
                    ? `「${ceremonyFrame.callout.reading}」 (${ceremonyFrame.callout.romaji})`
                    : '📢 ピーッ！終了！みんなで数を数えよう！'}
            </h3>
            <p className="text-[11px] font-bold text-amber-300">
              {ceremonyFrame?.headlineEn ||
                'Watch the 3D bean bags pop out of the baskets one by one!'}
            </p>
          </div>

          {/* Side-by-Side Visual Bean Bag Tally Racks on Student iPad */}
          {ceremonyFrame && (
            <div className="grid grid-cols-2 gap-2 my-1">
              <div className="bg-rose-950/80 border border-rose-500 rounded-xl p-2 text-left">
                <div className="flex items-center justify-between text-xs font-black text-rose-200 mb-1">
                  <span>🔴 赤組</span>
                  <span className="text-sm text-white font-mono">{ceremonyFrame.countedRed}個</span>
                </div>
                <div className="flex flex-wrap gap-1 min-h-[22px] items-center">
                  {Array.from({ length: Math.min(20, ceremonyFrame.countedRed) }).map((_, idx) => (
                    <span
                      key={idx}
                      className={`inline-block w-2.5 h-2 rounded-full border ${
                        idx >= minCounted && ceremonyFrame.countedRed > ceremonyFrame.countedWhite
                          ? 'bg-amber-400 border-white animate-bounce'
                          : 'bg-rose-500 border-rose-200'
                      }`}
                    />
                  ))}
                  {ceremonyFrame.countedRed > 20 && (
                    <span className="text-[10px] font-black text-amber-300">
                      +{ceremonyFrame.countedRed - 20}
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-400 rounded-xl p-2 text-left">
                <div className="flex items-center justify-between text-xs font-black text-slate-200 mb-1">
                  <span>⚪ 白組</span>
                  <span className="text-sm text-white font-mono">{ceremonyFrame.countedWhite}個</span>
                </div>
                <div className="flex flex-wrap gap-1 min-h-[22px] items-center">
                  {Array.from({ length: Math.min(20, ceremonyFrame.countedWhite) }).map((_, idx) => (
                    <span
                      key={idx}
                      className={`inline-block w-2.5 h-2 rounded-full border ${
                        idx >= minCounted && ceremonyFrame.countedWhite > ceremonyFrame.countedRed
                          ? 'bg-amber-400 border-white animate-bounce'
                          : 'bg-white border-slate-400'
                      }`}
                    />
                  ))}
                  {ceremonyFrame.countedWhite > 20 && (
                    <span className="text-[10px] font-black text-amber-300">
                      +{ceremonyFrame.countedWhite - 20}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="w-full py-1.5 px-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-bold text-slate-300 flex items-center justify-between">
            <span>あなたの貢献 (Your Swishes):</span>
            <span className="text-amber-300 font-black">🫘 {localBagsThrown} 個イン！</span>
          </div>
        </div>
      )}
    </div>
  );
};

export const QuizStudentVolleyball = QuizStudentTamaire;
export default QuizStudentTamaire;
