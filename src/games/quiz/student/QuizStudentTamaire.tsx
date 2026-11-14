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
 *      on every 6th streak / 2nd consecutive 3-step cycle) in a high 3D arc that drops cleanly through the 3D
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
  isEnglishPromptType,
  resolveLockoutPenaltySeconds,
  resolveOptionPresentation,
  advanceTamaireThrowStep,
  TamaireThrowActionStep,
  TamaireStepOutcome,
  buildTamaireSuspenseSchedule,
  TamaireSuspenseFrame,
} from '../core/quizEngine';
import { OPTION_STYLES } from '../types';
import {
  Tamaire3DStage,
  VolleyballAnswerEvent,
  TamaireStudentRosterItem,
} from '../host/Tamaire3DStage';
import { Flame, Volume2, XCircle } from 'lucide-react';
import { getServerTime } from '@/services/rtdbSafe';
import { soundEffects } from '@/services/soundEffects';
import { useLanguage } from '@/context/LanguageContext';
import { useAudio } from '@/context/AudioContext';
import { RubyText } from '@/components/common/RubyText';

export interface TamaireSettings {
  timeLimitSeconds: number;
  gameStyle: 'COOP_RALLY' | 'TEAM_VS';
  targetRallies?: number;
  missLockoutSeconds?: number;
  hideScoreUntilEnd?: boolean;
}

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
  const { t, language } = useLanguage();
  const { playWordAudio, isMuted } = useAudio();
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
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const answeringTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
      if (answeringTimerRef.current) clearTimeout(answeringTimerRef.current);
    };
  }, []);

  const elapsedSinceStart = Math.max(0, nowTime - matchStartTime);
  const timeRemainingSeconds = Math.max(
    0,
    Math.ceil((timeLimitSeconds * 1000 - elapsedSinceStart) / 1000)
  );
  const isMatchFinished = timeRemainingSeconds <= 0 || Boolean(volleyballFinished);
  const isGoldenShotArmed = actionStep === 2 && (localStreak + 1) % 6 === 0;

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
  const minCounted = ceremonyFrame ? Math.min(ceremonyFrame.countedRed, ceremonyFrame.countedWhite) : 0;
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

  const isLockoutActive = penaltySecondsLeft > 0;
  useEffect(() => {
    if (!isLockoutActive) return;
    const interval = setInterval(() => {
      const remainingMs = penaltyEndTimeRef.current - Date.now();
      const remainingSec = Math.max(0, remainingMs / 1000);
      setPenaltySecondsLeft(parseFloat(remainingSec.toFixed(1)));
      if (remainingMs <= 0) {
        clearInterval(interval);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [isLockoutActive]);

  const lastAutoPlayedQuestionKeyRef = useRef<string>('');

  useEffect(() => {
    questionStartTimeRef.current = Date.now();
    if (answeringTimerRef.current) {
      clearTimeout(answeringTimerRef.current);
      answeringTimerRef.current = null;
    }
    setIsAnswering(false);
    setEliminatedOptionIds(new Set());
    setMistakeCountOnQuestion(0);
    setPenaltySecondsLeft(0);
    const audioKey = `${currentIndex}:${currentQuestion?.targetWordId || ''}`;
    if (
      !isMatchFinished &&
      currentQuestion?.promptType === 'AUDIO_ONLY' &&
      !isMuted &&
      lastAutoPlayedQuestionKeyRef.current !== audioKey
    ) {
      lastAutoPlayedQuestionKeyRef.current = audioKey;
      playWordAudio(currentQuestion.promptSound, currentQuestion.targetWordEnglish);
    }
  }, [currentIndex, isMatchFinished, currentQuestion?.promptType, currentQuestion?.promptSound, currentQuestion?.targetWordEnglish, currentQuestion?.targetWordId, isMuted, playWordAudio]);

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

      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = setTimeout(() => {
        advanceTimerRef.current = null;
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

      if (answeringTimerRef.current) clearTimeout(answeringTimerRef.current);
      answeringTimerRef.current = setTimeout(() => {
        answeringTimerRef.current = null;
        setIsAnswering(false);
      }, 320);
    }
  };

  if (!currentQuestion) {
    return null;
  }

  const isEnPrompt = isEnglishPromptType(currentQuestion.promptType);
  const seatTag =
    typeof player.attendanceNumber === 'number'
      ? ` (#${player.attendanceNumber === 0 ? '00' : String(player.attendanceNumber).padStart(2, '0')})`
      : '';
  const hasPromptImg = Boolean(currentQuestion.promptImage);
  const showPromptSubtext =
    Boolean(currentQuestion.promptSubtext) &&
    !(currentQuestion.promptType === 'JA_MEANING' && currentQuestion.targetWordRuby && currentQuestion.targetWordRuby.length > 0);

  return (
    <div className="relative w-full h-full flex flex-col bg-slate-900 text-white rounded-3xl border-2 border-slate-700 overflow-hidden select-none p-2.5">
      {/* 1. Top Sports Day Hachimaki Headband & Bean Bag Counter */}
      <div className="flex flex-nowrap items-center justify-between gap-2 pb-1.5 shrink-0 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1.5 flex-nowrap shrink-0">
          {isRed ? (
            <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-600 text-white font-black text-[11px] shadow border border-white/70 whitespace-nowrap shrink-0">
              <span>🔴</span>
              {language === 'ja' ? (
                <span>
                  <ruby>赤組<rt>あかぐみ</rt></ruby>
                </span>
              ) : (
                <span>Red Team</span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white text-slate-900 font-black text-[11px] shadow border border-slate-300 whitespace-nowrap shrink-0">
              <span>⚪</span>
              {language === 'ja' ? (
                <span>
                  <ruby>白組<rt>しろぐみ</rt></ruby>
                </span>
              ) : (
                <span>White Team</span>
              )}
            </div>
          )}

          <div
            data-testid="student-bags-thrown"
            className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-black text-[11px] whitespace-nowrap shrink-0"
          >
            <span>🫘</span>
            <span>
              {localBagsThrown} {t('in!', '個イン！')}
            </span>
          </div>

          {localStreak >= 2 && !isMatchFinished && (
            <div className="flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-rose-500/30 text-rose-300 font-black text-[11px] whitespace-nowrap shrink-0">
              <Flame size={11} />
              <span>x{localStreak}</span>
            </div>
          )}
        </div>

        <div
          className={`font-mono text-[11px] font-black px-2 py-0.5 rounded-lg border whitespace-nowrap shrink-0 ${
            isMatchFinished
              ? 'bg-amber-400 text-slate-950 border-white'
              : timeRemainingSeconds <= 10
                ? 'bg-rose-600 text-white border-amber-300 animate-pulse'
                : 'bg-slate-800 text-amber-300 border-slate-700'
          }`}
        >
          {isMatchFinished ? (
            <>📢 {language === 'ja' ? <><ruby>玉<rt>たま</rt></ruby>かぞえ<ruby>中<rt>ちゅう</rt></ruby></> : 'Counting!'}</>
          ) : (
            `⏱️ ${timeRemainingSeconds}s`
          )}
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
          <div className="px-2 py-0.5 rounded-md bg-slate-950/80 backdrop-blur-sm border border-white/20 text-[10px] font-black text-white flex items-center gap-1 pointer-events-none leading-normal">
            <span
              className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                isMatchFinished ? 'bg-amber-400' : 'bg-emerald-400'
              }`}
            />
            <span>
              {isMatchFinished ? (
                <>
                  {language === 'ja' ? (
                    <>
                      <ruby>体育座<rt>たいいくずわ</rt></ruby>り<ruby>視点<rt>してん</rt></ruby>
                    </>
                  ) : (
                    'Seating View'
                  )}
                  {' • '}
                  {player.nickname || t('YOU', 'あなた')}
                  {seatTag}
                </>
              ) : (
                <>
                  {language === 'ja' ? (
                    <>
                      <ruby>追跡<rt>ついせき</rt></ruby>カメラ
                    </>
                  ) : (
                    '3D CHASE'
                  )}
                  {' • '}
                  {player.nickname || t('YOU', 'あなた')}
                  {seatTag}
                </>
              )}
            </span>
          </div>

          <button
            type="button"
            data-testid="student-perspective-toggle"
            onClick={() =>
              setViewPerspective((v) => (v === 'THIRD_PERSON' ? 'FIRST_PERSON' : 'THIRD_PERSON'))
            }
            className="px-2 py-0.5 rounded-md bg-slate-950/85 hover:bg-slate-900 border border-amber-400/50 text-[10px] font-black text-amber-300 cursor-pointer transition shadow leading-normal"
          >
            {viewPerspective === 'THIRD_PERSON' ? (
              <>
                🎥{' '}
                {language === 'ja' ? (
                  <>
                    3<ruby>人称<rt>にんしょう</rt></ruby> (<ruby>背後<rt>はいご</rt></ruby>)
                  </>
                ) : (
                  '3rd Person'
                )}
              </>
            ) : (
              <>
                🎥{' '}
                {language === 'ja' ? (
                  <>
                    1<ruby>人称<rt>にんしょう</rt></ruby> (<ruby>主観<rt>しゅかん</rt></ruby>)
                  </>
                ) : (
                  '1st Person'
                )}
              </>
            )}
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
            <div className="text-[11px] leading-normal">
              {language === 'ja'
                ? shotCallout.outcome === 'SCOOPED_BAG'
                  ? <>✋ ① お<ruby>手玉<rt>てだま</rt></ruby>を<ruby>拾<rt>ひろ</rt></ruby>った！ (1/3 OK!)</>
                  : shotCallout.outcome === 'LOCKED_AIM'
                    ? <>🎯 ② カゴに<ruby>照準<rt>しょうじゅん</rt></ruby>ロックオン！ (2/3 OK!)</>
                    : shotCallout.outcome === 'GOLDEN_SWISH'
                      ? <>🔥 ③ <ruby>金<rt>きん</rt></ruby>のお<ruby>手玉<rt>てだま</rt></ruby> 2<ruby>個<rt>こ</rt></ruby>ナイスイン！ (+2)</>
                      : shotCallout.outcome === 'SWISH'
                        ? <>🎯 ③ スポッ！ナイスイン！ (+1)</>
                        : shotCallout.outcome === 'FUMBLED_SAND'
                          ? <>💦 <ruby>砂<rt>すな</rt></ruby>で<ruby>手<rt>て</rt></ruby>が<ruby>滑<rt>すべ</rt></ruby>って<ruby>拾<rt>ひろ</rt></ruby>えなかった！</>
                          : shotCallout.outcome === 'DROPPED_BAG'
                            ? <>💦 あっ！お<ruby>手玉<rt>てだま</rt></ruby>を<ruby>落<rt>お</rt></ruby>とした！ (①へ<ruby>戻<rt>もど</rt></ruby>る)</>
                            : <>💥 ガンッ！カゴのフチに<ruby>弾<rt>はじ</rt></ruby>かれた！ (①へ<ruby>戻<rt>もど</rt></ruby>る)</>
                : shotCallout.labelEn}
            </div>
          </div>
        )}

        {/* Golden 2x Ready Indicator */}
        {!isMatchFinished && isGoldenShotArmed && (
          <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 font-black text-[10px] shadow animate-bounce pointer-events-none z-20 leading-normal">
            ✨{' '}
            {language === 'ja' ? (
              <>
                <ruby>次<rt>つぎ</rt></ruby>は2<ruby>倍<rt>ばい</rt></ruby>ゴールデン<ruby>玉<rt>だま</rt></ruby>！
              </>
            ) : (
              'NEXT = 2x GOLDEN BAG!'
            )}
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
                labelJa: (
                  <>
                    ① <ruby>玉<rt>たま</rt></ruby>を<ruby>拾<rt>ひろ</rt></ruby>う
                  </>
                ),
                labelEn: '1. Scoop Bag',
              },
              {
                step: 1 as const,
                icon: '👀',
                labelJa: (
                  <>
                    ② カゴを<ruby>狙<rt>ねら</rt></ruby>う
                  </>
                ),
                labelEn: '2. Lock Aim',
              },
              {
                step: 2 as const,
                icon: '🎯',
                labelJa: (
                  <>
                    ③ <ruby>投<rt>な</rt></ruby>げる！
                  </>
                ),
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
                  <div className="leading-normal text-left">
                    <div className="text-[10px] font-black">
                      {language === 'ja' ? item.labelJa : item.labelEn}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 3B. Target Vocabulary Prompt Card (Supports all 9 PromptTypes + IMAGE_ONLY + AUDIO_ONLY + Furigana) */}
          <div className="bg-slate-950 rounded-2xl px-3 py-1.5 border-2 border-slate-800 flex items-center justify-center gap-3 relative min-h-[60px] mb-1.5 shrink-0">
            {hasPromptImg && (
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-white p-1 border border-white/20 shrink-0 flex items-center justify-center overflow-hidden shadow-xs">
                <img
                  src={currentQuestion.promptImage}
                  alt={currentQuestion.promptText || 'Question illustration'}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain pointer-events-none select-none"
                />
              </div>
            )}

            <div className="flex-1 min-w-0 flex flex-col items-center justify-center text-center">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 truncate max-w-full leading-normal">
                {actionStep === 0 ? (
                  language === 'ja' ? (
                    <>
                      STEP 1/3: <ruby>正解<rt>せいかい</rt></ruby>して<ruby>足元<rt>あしもと</rt></ruby>のお<ruby>手玉<rt>てだま</rt></ruby>を<ruby>拾<rt>ひろ</rt></ruby>おう！
                    </>
                  ) : (
                    'STEP 1/3: ANSWER TO SCOOP BAG FROM SAND'
                  )
                ) : actionStep === 1 ? (
                  language === 'ja' ? (
                    <>
                      STEP 2/3: <ruby>正解<rt>せいかい</rt></ruby>して<ruby>落<rt>お</rt></ruby>とさずにカゴへ<ruby>狙<rt>ねら</rt></ruby>いを<ruby>定<rt>さだ</rt></ruby>めよう！
                    </>
                  ) : (
                    'STEP 2/3: ANSWER TO LOCK AIM ON BASKET'
                  )
                ) : isGoldenShotArmed ? (
                  language === 'ja' ? (
                    <>
                      STEP 3/3: <ruby>正解<rt>せいかい</rt></ruby>で<ruby>金<rt>きん</rt></ruby>のお<ruby>手玉<rt>てだま</rt></ruby> 2<ruby>個<rt>こ</rt></ruby>スウィッシュ！！
                    </>
                  ) : (
                    'STEP 3/3: ANSWER TO SINK 2x GOLDEN SHOT!'
                  )
                ) : language === 'ja' ? (
                  <>
                    STEP 3/3: <ruby>照準<rt>しょうじゅん</rt></ruby>ロック<ruby>完了<rt>かんりょう</rt></ruby>！<ruby>正解<rt>せいかい</rt></ruby>してカゴへ<ruby>投<rt>な</rt></ruby>げ<ruby>込<rt>こ</rt></ruby>もう！
                  </>
                ) : (
                  'STEP 3/3: LOCKED ON! ANSWER TO SINK THE SHOT!'
                )}
              </span>

              <h3 className="text-lg sm:text-xl font-black text-white text-center leading-tight mt-0.5 max-w-full truncate">
                {currentQuestion.isMath ? (
                  currentQuestion.promptText
                ) : isEnPrompt ? (
                  currentQuestion.targetWordEnglish
                ) : currentQuestion.promptType === 'JA_MEANING' ? (
                  <RubyText
                    ruby={currentQuestion.targetWordRuby}
                    kanji={currentQuestion.targetWordJa || currentQuestion.promptText}
                    hiragana={currentQuestion.targetWordHiragana}
                    className="text-lg sm:text-xl font-black text-white"
                    rtClassName="text-cyan-300 font-semibold select-none"
                  />
                ) : (
                  currentQuestion.promptText
                )}
              </h3>

              {currentQuestion.threeHints && currentQuestion.threeHints.length > 0 && (
                <span className="text-[10px] font-bold text-amber-200 truncate max-w-full">
                  💡{' '}
                  {currentQuestion.threeHints
                    .slice(0, 2)
                    .map((h) => (typeof h === 'string' ? h : language === 'ja' ? h.ja : h.en))
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              )}

              {showPromptSubtext && (
                <span className="text-[10px] font-bold text-slate-400 truncate max-w-full">
                  {currentQuestion.promptSubtext}
                </span>
              )}
            </div>

            {currentQuestion.promptType === 'AUDIO_ONLY' && (
              <button
                type="button"
                onClick={() => playWordAudio(currentQuestion.promptSound, currentQuestion.targetWordEnglish)}
                aria-label={t('Listen to prompt audio', '英語の音声を聞く')}
                className="px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1 text-xs font-black active:scale-95 transition-transform cursor-pointer shrink-0 shadow"
              >
                <Volume2 size={14} />
                <span>{language === 'ja' ? <><ruby>聞<rt>き</rt></ruby>く</> : 'Listen'}</span>
              </button>
            )}

            {/* Mandatory >= 2.5s Fumbled Bean Bag Lockout Overlay */}
            {penaltySecondsLeft > 0 && (
              <div
                data-testid="tamaire-lockout-overlay"
                className="absolute inset-0 bg-rose-950/95 rounded-2xl z-30 flex items-center justify-between px-3.5 py-2 border-2 border-rose-500"
              >
                <div className="text-left min-w-0">
                  <div className="text-xs sm:text-sm font-black text-rose-200 truncate leading-normal">
                    {lastFumbleReason === 'FUMBLED_SAND' ? (
                      language === 'ja' ? (
                        <>
                          💦 <ruby>砂<rt>すな</rt></ruby>で<ruby>手<rt>て</rt></ruby>が<ruby>滑<rt>すべ</rt></ruby>ってお<ruby>手玉<rt>てだま</rt></ruby>を<ruby>拾<rt>ひろ</rt></ruby>えなかった！
                        </>
                      ) : (
                        'Fumbled in the sand!'
                      )
                    ) : lastFumbleReason === 'DROPPED_BAG' ? (
                      language === 'ja' ? (
                        <>
                          💦 あっ！お<ruby>手玉<rt>てだま</rt></ruby>を<ruby>落<rt>お</rt></ruby>とした！（①<ruby>玉<rt>たま</rt></ruby>を<ruby>拾<rt>ひろ</rt></ruby>うからやり<ruby>直<rt>なお</rt></ruby>し）
                        </>
                      ) : (
                        'Dropped the bag! Reset to Scoop.'
                      )
                    ) : language === 'ja' ? (
                      <>
                        💥 カゴのフチに<ruby>弾<rt>はじ</rt></ruby>かれた！（①<ruby>玉<rt>たま</rt></ruby>を<ruby>拾<rt>ひろ</rt></ruby>うからやり<ruby>直<rt>なお</rt></ruby>し）
                      </>
                    ) : (
                      'Rim Doink! Reset to Scoop.'
                    )}
                  </div>
                  <p className="text-[10px] font-bold text-rose-300 truncate leading-normal">
                    {lastFumbleReason === 'FUMBLED_SAND' ? (
                      language === 'ja' ? (
                        <>
                          <ruby>少<rt>すこ</rt></ruby>し<ruby>待<rt>ま</rt></ruby>って<ruby>再挑戦<rt>さいちょうせん</rt></ruby>しよう · まちがえた<ruby>選択肢<rt>せんたくし</rt></ruby>は<ruby>消去<rt>しょうきょ</rt></ruby>
                        </>
                      ) : (
                        'Wait for recovery · Wrong choice eliminated'
                      )
                    ) : language === 'ja' ? (
                      <>
                        ステップ1（<ruby>拾<rt>ひろ</rt></ruby>う）にもどって<ruby>再挑戦<rt>さいちょうせん</rt></ruby>！
                      </>
                    ) : (
                      'Reset to Step 1 (Scoop) · Recovery pause'
                    )}
                  </p>
                </div>
                <div className="px-2.5 py-1 rounded-full bg-rose-900 border border-rose-400 font-mono text-xs font-black text-amber-300 shrink-0 ml-2">
                  {penaltySecondsLeft.toFixed(1)}s
                </div>
              </div>
            )}
          </div>

          {/* 4. Four-Choice Answer Grid (▲◆●■) with !isEnPrompt, Furigana & Yellow Dark Ink */}
          <div className="flex-1 grid grid-cols-2 gap-2 min-h-[124px]">
            {currentQuestion.options.map((option, idx) => {
              const style = OPTION_STYLES[idx % OPTION_STYLES.length];
              const isEliminated = eliminatedOptionIds.has(option.id);
              const pres = resolveOptionPresentation(currentQuestion, option);
              const isYellow = style.color === 'yellow' && !isEliminated;
              const textColor = isYellow ? 'text-slate-950' : 'text-white';
              const badgeClass = isYellow ? 'bg-black/15 text-slate-950' : 'bg-black/25 text-white';

              return (
                <button
                  key={option.id}
                  type="button"
                  disabled={isAnswering || penaltySecondsLeft > 0 || isEliminated || isMatchFinished}
                  onClick={() => handleSelect(option.id)}
                  className={`relative rounded-2xl p-2.5 flex flex-col justify-between text-left border-2 transition-all active:scale-95 cursor-pointer ${
                    isEliminated
                      ? 'opacity-25 grayscale bg-slate-800 border-slate-700 text-white pointer-events-none'
                      : `${style.bg} ${style.hoverBg} ${style.border} ${textColor} shadow-md`
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[11px] font-black ${badgeClass}`}>
                      {style.shapeName}
                    </span>
                    {isEliminated && <XCircle size={14} className="text-rose-300" />}
                  </div>

                  <div className="my-auto text-center w-full">
                    <span className="text-sm sm:text-base font-black block leading-snug">
                      {pres.isEnPrompt && option.ruby && option.ruby.length > 0 ? (
                        <RubyText ruby={option.ruby} kanji={option.ja_kanji} hiragana={option.ja_hiragana} />
                      ) : (
                        pres.displayText
                      )}
                    </span>
                    {pres.subText && (
                      <span className={`text-[10px] font-bold block ${isYellow ? 'text-slate-800' : 'opacity-90'}`}>
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
          <div className="flex flex-nowrap items-center justify-between gap-2 overflow-x-auto no-scrollbar">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] uppercase tracking-wider shadow whitespace-nowrap shrink-0 leading-normal">
              📢{' '}
              {language === 'ja' ? (
                <>
                  <ruby>玉<rt>たま</rt></ruby>かぞえセレモニー
                </>
              ) : (
                'COUNTING CEREMONY!'
              )}
            </span>
            <span className="text-[10px] font-bold text-amber-300 whitespace-nowrap shrink-0 leading-normal">
              👀{' '}
              {language === 'ja' ? (
                <>
                  メイン<ruby>画面<rt>がめん</rt></ruby>と<ruby>上<rt>うえ</rt></ruby>の3Dカゴを<ruby>見<rt>み</rt></ruby>よう！
                </>
              ) : (
                'Eyes up & watch the baskets!'
              )}
            </span>
          </div>

          <div className="my-auto py-1 space-y-1">
            <h3 className="text-lg sm:text-2xl font-black text-white leading-tight">
              {ceremonyFrame?.stage === 'CLIFFHANGER_RATTLE' ? (
                language === 'ja' ? (
                  <>
                    🥁 <ruby>同点<rt>どうてん</rt></ruby> {ceremonyFrame.stepIndex}
                    <ruby>個<rt>こ</rt></ruby>！まだ<ruby>入<rt>はい</rt></ruby>っているか…！？
                  </>
                ) : (
                  `🥁 Tied at ${ceremonyFrame.stepIndex}! Any bags left...?!`
                )
              ) : ceremonyFrame?.stage === 'VICTORY_FANFARE' ? (
                `🏆 ${language === 'ja' ? ceremonyFrame.headlineJa : ceremonyFrame.headlineEn}`
              ) : ceremonyFrame?.callout ? (
                `「${ceremonyFrame.callout.reading}」 (${ceremonyFrame.callout.romaji})`
              ) : language === 'ja' ? (
                <>
                  📢 ピーッ！<ruby>終了<rt>しゅうりょう</rt></ruby>！みんなで<ruby>数<rt>かず</rt></ruby>を<ruby>数<rt>かぞ</rt></ruby>えよう！
                </>
              ) : (
                "📢 Time's Up! Let's count the bags together!"
              )}
            </h3>
            <p className="text-[11px] font-bold text-amber-300 leading-normal">
              {ceremonyFrame ? (
                language === 'ja' ? (
                  ceremonyFrame.headlineJa
                ) : (
                  ceremonyFrame.headlineEn
                )
              ) : language === 'ja' ? (
                <>
                  カゴから<ruby>玉<rt>たま</rt></ruby>が1つずつ<ruby>飛<rt>と</rt></ruby>び<ruby>出<rt>だ</rt></ruby>すのを<ruby>一緒<rt>いっしょ</rt></ruby>に<ruby>数<rt>かぞ</rt></ruby>えよう！
                </>
              ) : (
                'Watch the 3D bean bags pop out of the baskets one by one!'
              )}
            </p>
          </div>

          {/* Side-by-Side Visual Bean Bag Tally Racks on Student iPad */}
          {ceremonyFrame && (
            <div className="grid grid-cols-2 gap-2 my-1">
              <div className="bg-rose-950/80 border border-rose-500 rounded-xl p-2 text-left">
                <div className="flex items-center justify-between text-xs font-black text-rose-200 mb-1">
                  <span>
                    🔴 {language === 'ja' ? <ruby>赤組<rt>あかぐみ</rt></ruby> : 'Red Team'}
                  </span>
                  <span className="text-sm text-white font-mono">
                    {ceremonyFrame.countedRed}
                    {language === 'ja' ? '個' : ''}
                  </span>
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
                  <span>
                    ⚪ {language === 'ja' ? <ruby>白組<rt>しろぐみ</rt></ruby> : 'White Team'}
                  </span>
                  <span className="text-sm text-white font-mono">
                    {ceremonyFrame.countedWhite}
                    {language === 'ja' ? '個' : ''}
                  </span>
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
            <span>
              {language === 'ja' ? (
                <>
                  あなたの<ruby>貢献<rt>こうけん</rt></ruby>:
                </>
              ) : (
                'Your Swishes:'
              )}
            </span>
            <span className="text-amber-300 font-black">
              🫘 {localBagsThrown} {t('bag(s) in!', '個イン！')}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export const QuizStudentVolleyball = QuizStudentTamaire;
export default QuizStudentTamaire;
