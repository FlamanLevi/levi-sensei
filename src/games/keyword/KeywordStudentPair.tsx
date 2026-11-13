import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { useLanguage } from '@/context/LanguageContext';
import { useAudio } from '@/context/AudioContext';
import { soundEffects } from '@/services/soundEffects';
import {
  BODY_POSES,
  PairSide,
  KeywordGamePhase,
  getReactionTier,
  FoulPenaltyMode,
} from './types';
import { useKeywordRoom, formatDeskPairId } from './useKeywordRoom';
import { getSavedStudentProfile, fetchClassBoundNumbers } from '@/services/studentProfile';
import { useClassroom } from '@/context/ClassroomContext';
import {
  Wifi,
  WifiOff,
  Zap,
  AlertTriangle,
  Trophy,
  Play,
  Users,
  Flame,
  RotateCcw,
  UserCheck,
  UserPlus,
  Edit3,
  X,
} from 'lucide-react';

interface KeywordStudentPairProps {
  initialRoomCode?: string;
  initialDeskNumber?: number;
  seatLeft?: number;
  nameLeft?: string;
  seatRight?: number;
  nameRight?: string;
  onExit?: () => void;
}

interface ShockwaveRipple {
  id: number;
  side: PairSide;
  x: number;
  y: number;
}

const OFFLINE_WORD_POOL = [
  { id: 'kw_apple', english: 'apple', ja: 'りんご' },
  { id: 'kw_banana', english: 'banana', ja: 'バナナ' },
  { id: 'kw_orange', english: 'orange', ja: 'オレンジ' },
  { id: 'kw_melon', english: 'melon', ja: 'メロン' },
  { id: 'kw_peach', english: 'peach', ja: 'もも' },
  { id: 'kw_strawberry', english: 'strawberry', ja: 'いちご' },
  { id: 'kw_dog', english: 'dog', ja: 'いぬ' },
  { id: 'kw_cat', english: 'cat', ja: 'ねこ' },
];

export const KeywordStudentPair: React.FC<KeywordStudentPairProps> = ({
  initialRoomCode = '',
  initialDeskNumber = 1,
  seatLeft,
  nameLeft,
  seatRight,
  nameRight,
  onExit,
}) => {
  const { t, language } = useLanguage();
  const { playWordAudio, playPop } = useAudio();
  const { activeSchool, activeClassId } = useClassroom();

  const savedProfile = useMemo(() => {
    return typeof window !== 'undefined' ? getSavedStudentProfile() : null;
  }, []);

  const [classRoster, setClassRoster] = useState<
    Record<number, { nickname: string; avatar: string }>
  >({});
  const [isPartnerPickerOpen, setIsPartnerPickerOpen] = useState<boolean>(false);

  const [deskNumber, setDeskNumber] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search).get('desk');
      if (p && !isNaN(Number(p))) return Number(p);
    }
    if (savedProfile?.attendanceNumber) {
      return Math.ceil(savedProfile.attendanceNumber / 2);
    }
    return initialDeskNumber;
  });

  const [partnerSeat, setPartnerSeat] = useState<number | null>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search).get('p2');
      if (p && !isNaN(Number(p))) return Number(p);
      const saved = sessionStorage.getItem('kw_partner_seat');
      if (saved && !isNaN(Number(saved))) return Number(saved);
    }
    return seatRight || null;
  });

  // Fetch full class roster so partner names and avatars appear instantly
  useEffect(() => {
    let isMounted = true;
    fetchClassBoundNumbers(activeSchool, activeClassId)
      .then((roster) => {
        if (isMounted && roster) {
          setClassRoster(roster);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [activeSchool, activeClassId]);

  const [roomInput, setRoomInput] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const r = new URLSearchParams(window.location.search).get('room');
      if (r) return r.toUpperCase();
    }
    return initialRoomCode;
  });

  const [isOfflineAutonomous, setIsOfflineAutonomous] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const r = new URLSearchParams(window.location.search).get('room');
      if (r) return false;
    }
    return !initialRoomCode;
  });

  const {
    roomCode,
    roomState,
    pairsMap,
    isConnected,
    joinDeskPair,
    recordSlap,
    recordFoul,
  } = useKeywordRoom({
    roomCode: initialRoomCode,
    isHost: false,
  });

  // --- Offline Standalone State (Pillar 6: Zero-Friction Standalone Autonomy) ---
  const [localPhase, setLocalPhase] = useState<KeywordGamePhase>('SELECTING');
  const [localKeyword, setLocalKeyword] = useState(OFFLINE_WORD_POOL[0]);
  const [localCurrentCard, setLocalCurrentCard] = useState(OFFLINE_WORD_POOL[0]);
  const [localPoseId, setLocalPoseId] = useState<string>('head');
  const [localIsKeywordActive, setLocalIsKeywordActive] = useState<boolean>(false);
  const localCycleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // --- Sub-Millisecond Local Slap Arbitration State (Pillar 1) ---
  const keywordTriggerPerfRef = useRef<number | null>(null);
  const touchLeftPerfRef = useRef<number | null>(null);
  const touchRightPerfRef = useRef<number | null>(null);
  const arbitrationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [roundLockedWinner, setRoundLockedWinner] = useState<PairSide | null>(null);
  const [roundReactionMs, setRoundReactionMs] = useState<number | null>(null);
  const [roundDeltaMs, setRoundDeltaMs] = useState<number | null>(null);
  const [isTieBreakerWin, setIsTieBreakerWin] = useState<boolean>(false);

  // --- Shockwave Ripple & Micro-Shake VFX State (Pillar 1) ---
  const [ripples, setRipples] = useState<ShockwaveRipple[]>([]);
  const [shakingSide, setShakingSide] = useState<PairSide | null>(null);

  // --- Foul Referee Whistle & Yellow/Red Card State (Pillar 2) ---
  const [lockoutLeftUntil, setLockoutLeftUntil] = useState<number>(0);
  const [lockoutRightUntil, setLockoutRightUntil] = useState<number>(0);
  const [foulFlashSide, setFoulFlashSide] = useState<PairSide | null>(null);
  const [foulDecoyWord, setFoulDecoyWord] = useState<string>('');
  const [foulAwardedToOpponent, setFoulAwardedToOpponent] = useState<PairSide | null>(
    null
  );
  const [nowTick, setNowTick] = useState<number>(Date.now());

  const pairId = formatDeskPairId(deskNumber);
  const currentPair = pairsMap[pairId];

  const activePhase: KeywordGamePhase =
    !isOfflineAutonomous && roomState ? roomState.phase : localPhase;
  const activeKeywordEnglish =
    !isOfflineAutonomous && roomState
      ? roomState.keywordEnglish
      : localKeyword.english;
  const activeKeywordJa =
    !isOfflineAutonomous && roomState ? roomState.keywordJa : localKeyword.ja;
  const activeCurrentWordEnglish =
    !isOfflineAutonomous && roomState
      ? roomState.currentCardEnglish
      : localCurrentCard.english;
  const activePoseId =
    !isOfflineAutonomous && roomState ? roomState.currentPoseId : localPoseId;
  const isKeywordHitNow =
    !isOfflineAutonomous && roomState
      ? Boolean(roomState.isKeywordActive || roomState.phase === 'GRAB')
      : Boolean(localIsKeywordActive || localPhase === 'GRAB');

  const foulPenaltyMode: FoulPenaltyMode =
    roomState?.foulPenaltyMode || 'AWARD_OPPONENT';
  const showReactionTiers = roomState?.showReactionTiers !== false;

  const activePose =
    BODY_POSES.find((p) => p.id === activePoseId) || BODY_POSES[0];

  // Fast 100ms ticker for foul lockout countdowns
  useEffect(() => {
    if (lockoutLeftUntil <= Date.now() && lockoutRightUntil <= Date.now()) return;
    const interval = setInterval(() => {
      setNowTick(Date.now());
    }, 100);
    return () => clearInterval(interval);
  }, [lockoutLeftUntil, lockoutRightUntil]);

  // Reset local round slap arbitration whenever phase enters READY or SELECTING
  useEffect(() => {
    if (activePhase === 'SELECTING' || activePhase === 'READY') {
      keywordTriggerPerfRef.current = null;
      touchLeftPerfRef.current = null;
      touchRightPerfRef.current = null;
      setRoundLockedWinner(null);
      setRoundReactionMs(null);
      setRoundDeltaMs(null);
      setIsTieBreakerWin(false);
      setFoulFlashSide(null);
      setFoulDecoyWord('');
      setFoulAwardedToOpponent(null);
    }
  }, [activePhase]);

  // Capture high-resolution local performance.now() timestamp the exact frame the keyword activates
  useEffect(() => {
    if (isKeywordHitNow && keywordTriggerPerfRef.current === null) {
      keywordTriggerPerfRef.current = performance.now();
    }
  }, [isKeywordHitNow]);

  // Auto-join if roomInput was populated via URL parameter
  useEffect(() => {
    if (roomInput.trim() && !isConnected && !isOfflineAutonomous) {
      joinDeskPair(roomInput.trim(), deskNumber);
    }
  }, [roomInput, isConnected, isOfflineAutonomous, deskNumber, joinDeskPair]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (localCycleTimerRef.current) clearInterval(localCycleTimerRef.current);
      if (arbitrationTimeoutRef.current) clearTimeout(arbitrationTimeoutRef.current);
    };
  }, []);

  // Spawn expanding shockwave ripple at touch coordinates + 180ms tactile micro-shake
  const triggerTouchVfx = useCallback(
    (side: PairSide, e: React.PointerEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const id = Date.now() + Math.random();

      setRipples((prev) => [...prev.slice(-4), { id, side, x, y }]);
      setShakingSide(side);

      setTimeout(() => {
        setShakingSide((prev) => (prev === side ? null : prev));
      }, 180);

      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== id));
      }, 650);
    },
    []
  );

  // --- Offline Autonomous Rally Starter (Pillar 6) ---
  const startOfflineRally = useCallback(() => {
    if (localCycleTimerRef.current) clearInterval(localCycleTimerRef.current);
    const chosenKeyword =
      OFFLINE_WORD_POOL[Math.floor(Math.random() * OFFLINE_WORD_POOL.length)];
    const chosenPose =
      BODY_POSES[Math.floor(Math.random() * BODY_POSES.length)];

    setLocalKeyword(chosenKeyword);
    setLocalPoseId(chosenPose.id);
    setLocalPhase('READY');
    setLocalIsKeywordActive(false);
    soundEffects.playChime();

    setTimeout(() => {
      setLocalPhase('CYCLING');
      const decoys = OFFLINE_WORD_POOL.filter((w) => w.id !== chosenKeyword.id);
      const count = Math.floor(Math.random() * 4) + 3; // 3-6 decoys
      const sequence: typeof OFFLINE_WORD_POOL = [];
      for (let i = 0; i < count; i++) {
        sequence.push(decoys[Math.floor(Math.random() * decoys.length)]);
      }
      sequence.push(chosenKeyword);

      let idx = 0;
      setLocalCurrentCard(sequence[0]);
      playWordAudio(undefined, sequence[0].english);

      localCycleTimerRef.current = setInterval(() => {
        idx += 1;
        if (idx < sequence.length) {
          const item = sequence[idx];
          setLocalCurrentCard(item);
          playWordAudio(undefined, item.english);
          if (item.id === chosenKeyword.id) {
            if (localCycleTimerRef.current)
              clearInterval(localCycleTimerRef.current);
            setLocalIsKeywordActive(true);
            setLocalPhase('GRAB');
            keywordTriggerPerfRef.current = performance.now();
          }
        }
      }, 1450);
    }, 2400);
  }, [playWordAudio]);

  // --- Sub-Millisecond Slap & Referee False-Start Handler (Pillars 1 & 2) ---
  const handleZoneSlap = useCallback(
    (side: PairSide, e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();

      const tapPerf = performance.now();
      const nowMs = Date.now();

      // Trigger visual shockwave ripple & micro-shake on every slap
      triggerTouchVfx(side, e);

      // Ignore if round already won
      if (roundLockedWinner !== null) return;

      // Check if player is currently under a 2s false-start lockout
      if (side === 'LEFT' && nowMs < lockoutLeftUntil) {
        soundEffects.playIncorrect();
        return;
      }
      if (side === 'RIGHT' && nowMs < lockoutRightUntil) {
        soundEffects.playIncorrect();
        return;
      }

      // CASE 1: FALSE START REFEREE TRAP (Slapped during READY or CYCLING before Keyword!)
      if (!isKeywordHitNow && (activePhase === 'READY' || activePhase === 'CYCLING')) {
        soundEffects.playWhistle(0.55);
        soundEffects.playIncorrect();
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([120, 60, 120]);
        }

        const decoyThatFooled =
          activePhase === 'CYCLING' && activeCurrentWordEnglish
            ? activeCurrentWordEnglish
            : 'Ready Pose';

        setFoulFlashSide(side);
        setFoulDecoyWord(decoyThatFooled);

        if (side === 'LEFT') {
          setLockoutLeftUntil(nowMs + 2200);
        } else {
          setLockoutRightUntil(nowMs + 2200);
        }

        const opponentSide: PairSide = side === 'LEFT' ? 'RIGHT' : 'LEFT';
        if (foulPenaltyMode === 'AWARD_OPPONENT') {
          setFoulAwardedToOpponent(opponentSide);
          confetti({
            particleCount: 45,
            spread: 55,
            origin: { x: opponentSide === 'LEFT' ? 0.25 : 0.75, y: 0.6 },
          });
        }

        recordFoul(deskNumber, side, decoyThatFooled, foulPenaltyMode);

        setTimeout(() => {
          setFoulFlashSide((prev) => (prev === side ? null : prev));
          setFoulAwardedToOpponent(null);
        }, 2200);
        return;
      }

      // CASE 2: VALID KEYWORD GRAB! (45ms Touch Arbitration Window)
      if (isKeywordHitNow) {
        const triggerPerf = keywordTriggerPerfRef.current ?? tapPerf - 180;
        const reactionMs = Math.max(1, tapPerf - triggerPerf);

        if (side === 'LEFT' && touchLeftPerfRef.current === null) {
          touchLeftPerfRef.current = reactionMs;
        } else if (side === 'RIGHT' && touchRightPerfRef.current === null) {
          touchRightPerfRef.current = reactionMs;
        }

        // 45ms Touch Arbitration Window (Invariant 2)
        if (!arbitrationTimeoutRef.current) {
          arbitrationTimeoutRef.current = setTimeout(() => {
            arbitrationTimeoutRef.current = null;
            const leftMs = touchLeftPerfRef.current;
            const rightMs = touchRightPerfRef.current;

            let winningSide: PairSide = side;
            let winReaction = reactionMs;
            let delta: number | null = null;
            let tieBreaker = false;

            if (leftMs !== null && rightMs !== null) {
              const absDiff = Math.abs(leftMs - rightMs);
              tieBreaker = absDiff < 45;
              if (leftMs <= rightMs) {
                winningSide = 'LEFT';
                winReaction = leftMs;
                delta = Math.max(1, Math.round(rightMs - leftMs));
              } else {
                winningSide = 'RIGHT';
                winReaction = rightMs;
                delta = Math.max(1, Math.round(leftMs - rightMs));
              }
            } else if (leftMs !== null) {
              winningSide = 'LEFT';
              winReaction = leftMs;
            } else if (rightMs !== null) {
              winningSide = 'RIGHT';
              winReaction = rightMs;
            }

            setRoundLockedWinner(winningSide);
            setRoundReactionMs(Math.round(winReaction));
            setRoundDeltaMs(delta);
            setIsTieBreakerWin(tieBreaker);

            soundEffects.playFanfare();
            confetti({
              particleCount: 95,
              spread: 75,
              origin: { x: winningSide === 'LEFT' ? 0.25 : 0.75, y: 0.6 },
            });

            recordSlap(deskNumber, winningSide, winReaction, delta, tieBreaker);
          }, 45);
        }
      }
    },
    [
      triggerTouchVfx,
      roundLockedWinner,
      lockoutLeftUntil,
      lockoutRightUntil,
      isKeywordHitNow,
      activePhase,
      activeCurrentWordEnglish,
      foulPenaltyMode,
      deskNumber,
      recordFoul,
      recordSlap,
    ]
  );

  const handleSelectPartner = useCallback(
    (num: number) => {
      setPartnerSeat(num);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('kw_partner_seat', String(num));
      }
      setIsPartnerPickerOpen(false);
      soundEffects.playPopcornPop();

      const p1Seat =
        savedProfile?.attendanceNumber ||
        currentPair?.seatLeft ||
        seatLeft ||
        (deskNumber - 1) * 2 + 1;
      const p1Name =
        savedProfile?.nickname || currentPair?.nameLeft || nameLeft || `Seat #${p1Seat}`;
      const p1Avatar =
        savedProfile?.avatar || currentPair?.avatarLeft || '🦁';

      const p2Roster = classRoster[num];
      const p2Name = p2Roster?.nickname || `Seat #${num}`;
      const p2Avatar = p2Roster?.avatar || '🐰';

      if (roomCode) {
        joinDeskPair(
          roomCode,
          deskNumber,
          p1Seat,
          p1Name,
          num,
          p2Name,
          p1Avatar,
          p2Avatar
        );
      }
    },
    [
      savedProfile,
      currentPair,
      seatLeft,
      deskNumber,
      nameLeft,
      classRoster,
      roomCode,
      joinDeskPair,
    ]
  );

  const isLeftLockedOut = nowTick < lockoutLeftUntil;
  const isRightLockedOut = nowTick < lockoutRightUntil;

  const displaySeatLeft =
    savedProfile?.attendanceNumber ||
    currentPair?.seatLeft ||
    seatLeft ||
    (deskNumber - 1) * 2 + 1;
  const displayAvatarLeft =
    savedProfile?.avatar || currentPair?.avatarLeft || '🦁';
  const displayNameLeft =
    savedProfile?.nickname ||
    currentPair?.nameLeft ||
    nameLeft ||
    `Seat #${displaySeatLeft}`;

  const partnerRosterEntry = partnerSeat ? classRoster[partnerSeat] : null;

  const displaySeatRight =
    partnerSeat ||
    currentPair?.seatRight ||
    seatRight ||
    (displaySeatLeft % 2 === 1 ? displaySeatLeft + 1 : Math.max(1, displaySeatLeft - 1));
  const displayAvatarRight =
    partnerRosterEntry?.avatar || currentPair?.avatarRight || '🐰';
  const displayNameRight =
    partnerRosterEntry?.nickname ||
    currentPair?.nameRight ||
    nameRight ||
    (partnerSeat ? `Seat #${partnerSeat}` : null);
  const scoreLeft = currentPair?.scoreLeft || 0;
  const scoreRight = currentPair?.scoreRight || 0;
  const streakLeft = currentPair?.streakLeft || 0;
  const streakRight = currentPair?.streakRight || 0;

  const reactionTierInfo =
    roundReactionMs !== null ? getReactionTier(roundReactionMs) : null;

  return (
    <div className="w-full h-full min-h-0 flex-1 flex flex-col justify-between bg-slate-950 text-white select-none overflow-hidden p-2 sm:p-3 font-['UD_Digi_Kyokasho_NP-R','UD_Digi_Kyokasho_NK-R','BIZ_UDPGothic','Zen_Maru_Gothic',sans-serif]">
      {/* ====================================================================
          1. TOP STATUS & DESK BINDING BAR (Pinned height for Zero Layout Shift)
         ==================================================================== */}
      <div className="bg-slate-900 border-2 border-slate-800 rounded-2xl px-3 py-1.5 flex flex-nowrap items-center justify-between gap-2 shrink-0 h-12 overflow-x-auto no-scrollbar whitespace-nowrap z-20">
        {/* Left: Desk Selector & Connection Status */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-700 h-8 shrink-0">
            <Users size={14} className="text-amber-400 shrink-0" />
            <span className="text-xs font-black text-amber-300 shrink-0">
              {t('Desk:', <><ruby>机<rt>つくえ</rt></ruby>:</>)}
            </span>
            <select
              value={deskNumber}
              onChange={(e) => {
                const nextDesk = Number(e.target.value);
                setDeskNumber(nextDesk);
                if (roomCode) {
                  joinDeskPair(roomCode, nextDesk);
                }
              }}
              className="bg-slate-950 text-white font-black text-xs px-2 py-0.5 rounded-lg border border-slate-700 cursor-pointer shrink-0"
            >
              {Array.from({ length: 18 }, (_, i) => i + 1).map((d) => {
                const sL = (d - 1) * 2 + 1;
                const sR = Math.min(35, sL + 1);
                return (
                  <option key={d} value={d}>
                    Desk #{d} (Seats {sL} & {sR})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Room Join Input or Status Pill */}
          <div className="flex items-center gap-1 shrink-0">
            <input
              type="text"
              value={roomInput}
              onChange={(e) => setRoomInput(e.target.value.toUpperCase())}
              placeholder="KW-123"
              className="w-20 h-8 bg-slate-950 border border-slate-700 rounded-xl px-2 text-xs font-mono font-black text-amber-300 uppercase shrink-0"
            />
            <button
              onClick={() => {
                playPop();
                if (roomInput.trim()) {
                  setIsOfflineAutonomous(false);
                  joinDeskPair(roomInput.trim(), deskNumber);
                } else {
                  setIsOfflineAutonomous(true);
                }
              }}
              className="h-8 px-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black transition active:scale-95 cursor-pointer flex items-center shrink-0 whitespace-nowrap"
            >
              {isConnected && !isOfflineAutonomous ? (
                <span className="flex items-center gap-1">
                  <Wifi size={12} className="text-emerald-300" />
                  <span>{t('Synced', '接続中')}</span>
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <WifiOff size={12} className="text-amber-300" />
                  <span>{t('Link TV', 'TV接続')}</span>
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Center: Target Keyword & Pose Banner */}
        <div className="flex items-center gap-3 bg-slate-950/90 px-3 py-1 rounded-xl border border-amber-500/40 h-8 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-black text-amber-400 uppercase whitespace-nowrap">
              🎯 {t('Keyword:', <><ruby>合言葉<rt>あいことば</rt></ruby>:</>)}
            </span>
            <span className="text-sm sm:text-base font-black text-white tracking-wide whitespace-nowrap">
              {activeKeywordEnglish || '---'}
            </span>
            {activeKeywordJa && (
              <span className="text-xs font-bold text-amber-300 whitespace-nowrap">
                ({activeKeywordJa})
              </span>
            )}
          </div>
          <span className="text-slate-700">|</span>
          <div className="flex items-center gap-1 shrink-0 whitespace-nowrap">
            <span className="text-base">{activePose.emoji}</span>
            <span className="text-xs font-black text-sky-300">
              {language === 'ja' ? activePose.jaRuby : activePose.en}
            </span>
          </div>
        </div>

        {/* Right: Offline Practice Trigger / Rematch / Exit */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={startOfflineRally}
            className="h-8 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1 shadow transition active:scale-95 cursor-pointer shrink-0 whitespace-nowrap"
          >
            <Play size={13} className="fill-slate-950" />
            <span>
              {t('Solo Pair Deal', <><ruby>ペア練習<rt>れんしゅう</rt></ruby></>)}
            </span>
          </button>
          {onExit && (
            <button
              onClick={onExit}
              className="h-8 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer shrink-0 whitespace-nowrap"
            >
              {t('Exit', '終了')}
            </button>
          )}
        </div>
      </div>

      {/* ====================================================================
          2. SPLIT-SCREEN TABLETOP DUAL SLAM PADS (LEFT RED vs RIGHT BLUE)
         ==================================================================== */}
      <div className="flex-1 min-h-0 grid grid-cols-2 gap-3 sm:gap-4 my-2 relative">
        {/* ==================== LEFT HALF: PLAYER 1 (RED ZONE) ==================== */}
        <div
          onPointerDown={(e) => handleZoneSlap('LEFT', e)}
          style={{
            touchAction: 'none',
            transform:
              shakingSide === 'LEFT'
                ? 'translate3d(-4px, 3px, 0) scale(0.985)'
                : undefined,
          }}
          className={`relative h-full min-h-[260px] rounded-3xl border-4 sm:border-6 p-4 flex flex-col items-center justify-between transition-all duration-100 cursor-pointer overflow-hidden select-none ${
            roundLockedWinner === 'LEFT'
              ? 'bg-gradient-to-b from-rose-500 via-red-600 to-amber-500 border-yellow-300 ring-4 ring-yellow-300 shadow-2xl'
              : isLeftLockedOut || foulFlashSide === 'LEFT'
              ? 'bg-slate-900 border-amber-500 opacity-90'
              : isKeywordHitNow
              ? 'bg-gradient-to-br from-rose-600 to-red-700 border-yellow-300 shadow-2xl animate-pulse'
              : 'bg-gradient-to-br from-rose-950/90 to-slate-900 border-rose-500/70 hover:border-rose-400'
          }`}
        >
          {/* Shockwave Ripple VFX Overlay (Pillar 1) */}
          {ripples
            .filter((r) => r.side === 'LEFT')
            .map((r) => (
              <span
                key={r.id}
                style={{ left: r.x, top: r.y }}
                className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full border-4 border-yellow-300 bg-white/25 animate-ping opacity-75"
              />
            ))}

          {/* Player 1 Header Badge */}
          <div className="w-full flex items-center justify-between bg-black/30 px-3.5 py-2 rounded-2xl border border-white/15 z-10">
            <div className="flex items-center gap-2">
              <span className="text-xl">{displayAvatarLeft || '🔴'}</span>
              <div className="text-left">
                <span className="text-xs font-bold text-rose-200 block leading-none">
                  {t(`Seat #${displaySeatLeft}`, <>出席番号 {displaySeatLeft}番</>)}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-base sm:text-lg font-black text-white">
                    {displayNameLeft}
                  </span>
                  {streakLeft >= 3 && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black flex items-center gap-0.5 animate-bounce">
                      <Flame size={11} />
                      <span>x{streakLeft}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-rose-200 uppercase block">
                {t('Points', <><ruby>得点<rt>とくてん</rt></ruby></>)}
              </span>
              <span className="text-2xl sm:text-3xl font-black text-white leading-none">
                {scoreLeft}
              </span>
            </div>
          </div>

          {/* Center Interactive Status Surface */}
          <div className="flex-1 flex flex-col items-center justify-center text-center px-2 z-10">
            {isLeftLockedOut || foulFlashSide === 'LEFT' ? (
              /* Pillar 2: Theatrical Referee Yellow Card Stamp */
              <div className="space-y-2 animate-bounce">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-2xl bg-amber-400 text-slate-950 font-black text-lg sm:text-2xl shadow-xl border-2 border-white">
                  <span>🟨</span>
                  <span>
                    {t(
                      'FALSE START! / FOUL!',
                      <>
                        おてつき！<ruby>反則<rt>はんそく</rt></ruby>！
                      </>
                    )}
                  </span>
                </div>
                {foulDecoyWord && (
                  <div className="text-xs sm:text-sm font-black text-amber-200 bg-black/50 px-3 py-1 rounded-xl border border-amber-400/40">
                    {t(
                      `Fooled by "${foulDecoyWord}"! Keyword is "${activeKeywordEnglish}"!`,
                      `「${foulDecoyWord}」でおてつき！合言葉は「${activeKeywordEnglish}」だよ！`
                    )}
                  </div>
                )}
                {foulPenaltyMode === 'AWARD_OPPONENT' && (
                  <div className="text-xs font-black text-rose-300">
                    {t(
                      '👉 +1 Point awarded to Blue Player!',
                      '👉 青プレイヤーに +1ポイント！'
                    )}
                  </div>
                )}
                <div className="text-[11px] font-bold text-slate-300">
                  {t(
                    `Locked for ${Math.max(0.1, (lockoutLeftUntil - nowTick) / 1000).toFixed(1)}s! Hands on ${activePose.en}!`,
                    <>あと {Math.max(0.1, (lockoutLeftUntil - nowTick) / 1000).toFixed(1)}秒 ロック中！手を戻そう！</>
                  )}
                </div>
              </div>
            ) : foulAwardedToOpponent === 'LEFT' ? (
              <div className="space-y-2 animate-bounce">
                <Trophy size={54} className="text-yellow-300 mx-auto" />
                <div className="text-2xl sm:text-4xl font-black text-emerald-300">
                  {t('+1 PT! (Opponent Foul)', '+1点！（相手の反則）')}
                </div>
              </div>
            ) : roundLockedWinner === 'LEFT' ? (
              /* Pillar 1: Winner Celebration + Reaction Speed Tier Badge + Delta */
              <div className="space-y-2 animate-bounce">
                <Trophy size={58} className="text-yellow-300 mx-auto drop-shadow-lg" />
                <div className="text-3xl sm:text-5xl font-black text-white drop-shadow-md">
                  {t('RED WINS!', <>赤の<ruby>勝<rt>か</rt></ruby>ち！</>)}
                </div>

                {showReactionTiers && reactionTierInfo && (
                  <div
                    className={`inline-flex items-center gap-1.5 px-4 py-1 rounded-full border-2 font-black text-xs sm:text-sm shadow-lg ${reactionTierInfo.badgeBg} ${reactionTierInfo.badgeBorder} ${reactionTierInfo.textColor}`}
                  >
                    <span>{reactionTierInfo.icon}</span>
                    <span>
                      {language === 'ja'
                        ? reactionTierInfo.labelJaRuby
                        : reactionTierInfo.labelEn}
                    </span>
                  </div>
                )}

                <div className="flex flex-nowrap items-center justify-center gap-2 whitespace-nowrap">
                  <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-black/45 border border-yellow-300 text-yellow-200 font-mono font-black text-sm sm:text-base">
                    <Zap size={15} />
                    <span>{roundReactionMs}ms</span>
                  </div>
                  {roundDeltaMs !== null && (
                    <span className="px-3 py-1 rounded-full bg-emerald-500 text-slate-950 font-mono font-black text-xs sm:text-sm shadow">
                      {isTieBreakerWin
                        ? `⚡ TIE BREAKER (+${roundDeltaMs}ms!)`
                        : `+${roundDeltaMs}ms FASTER!`}
                    </span>
                  )}
                </div>
              </div>
            ) : roundLockedWinner === 'RIGHT' ? (
              <div className="space-y-1 opacity-80">
                <span className="text-4xl">👏</span>
                <div className="text-lg sm:text-xl font-black text-rose-200">
                  {t('Blue was faster!', '青が早かった！')}
                </div>
                {roundDeltaMs !== null && (
                  <span className="text-xs font-mono font-bold text-rose-300">
                    (-{roundDeltaMs}ms)
                  </span>
                )}
              </div>
            ) : isKeywordHitNow ? (
              <div className="space-y-2">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-yellow-400 text-slate-950 flex items-center justify-center text-5xl font-black shadow-2xl mx-auto animate-bounce">
                  🖐️
                </div>
                <div className="text-3xl sm:text-5xl font-black text-white tracking-wider uppercase drop-shadow-lg">
                  {t('GRAB NOW!!', <>今すぐタップ！！</>)}
                </div>
                <div className="text-lg sm:text-2xl font-black text-yellow-200">
                  {activeKeywordEnglish}
                </div>
              </div>
            ) : activePhase === 'CYCLING' ? (
              <div className="space-y-2">
                <div className="text-5xl sm:text-6xl animate-pulse">👂</div>
                <div className="text-xl sm:text-2xl font-black text-rose-200">
                  {t('LISTEN... (Do Not Touch!)', <>よく<ruby>聞<rt>き</rt></ruby>いて！（まだ触っちゃダメ）</>)}
                </div>
                {activeCurrentWordEnglish && (
                  <div className="px-4 py-1 rounded-full bg-black/40 text-slate-300 font-black text-sm">
                    🔊 {activeCurrentWordEnglish}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-6xl sm:text-7xl animate-bounce">
                  {activePose.emoji}
                </div>
                <div className="text-xl sm:text-3xl font-black text-white">
                  {language === 'ja' ? activePose.actionJa : activePose.actionEn}
                </div>
                <p className="text-xs sm:text-sm font-bold text-rose-300">
                  {t('Keep hands off the iPad until the keyword!', '合言葉が出るまで画面から手を離してね！')}
                </p>
              </div>
            )}
          </div>

          {/* Bottom Touch Zone Footer */}
          <div className="w-full text-center py-1.5 rounded-xl bg-black/25 text-xs font-black text-rose-200 tracking-wider uppercase z-10">
            🔴 {t('PLAYER 1 TOUCH ZONE', 'プレイヤー1 タッチゾーン')}
          </div>
        </div>

        {/* ==================== RIGHT HALF: PLAYER 2 (BLUE ZONE) ==================== */}
        <div
          onPointerDown={(e) => handleZoneSlap('RIGHT', e)}
          style={{
            touchAction: 'none',
            transform:
              shakingSide === 'RIGHT'
                ? 'translate3d(4px, 3px, 0) scale(0.985)'
                : undefined,
          }}
          className={`relative h-full min-h-[260px] rounded-3xl border-4 sm:border-6 p-4 flex flex-col items-center justify-between transition-all duration-100 cursor-pointer overflow-hidden select-none ${
            roundLockedWinner === 'RIGHT'
              ? 'bg-gradient-to-b from-sky-500 via-blue-600 to-amber-500 border-yellow-300 ring-4 ring-yellow-300 shadow-2xl'
              : isRightLockedOut || foulFlashSide === 'RIGHT'
              ? 'bg-slate-900 border-amber-500 opacity-90'
              : isKeywordHitNow
              ? 'bg-gradient-to-br from-sky-600 to-blue-700 border-yellow-300 shadow-2xl animate-pulse'
              : 'bg-gradient-to-br from-blue-950/90 to-slate-900 border-sky-500/70 hover:border-sky-400'
          }`}
        >
          {/* Shockwave Ripple VFX Overlay (Pillar 1) */}
          {ripples
            .filter((r) => r.side === 'RIGHT')
            .map((r) => (
              <span
                key={r.id}
                style={{ left: r.x, top: r.y }}
                className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full border-4 border-yellow-300 bg-white/25 animate-ping opacity-75"
              />
            ))}

          {/* Player 2 Header Badge */}
          <div className="w-full flex items-center justify-between bg-black/30 px-3.5 py-2 rounded-2xl border border-white/15 z-10">
            <div className="flex items-center gap-2">
              <span className="text-xl">{displayAvatarRight || '🔵'}</span>
              <div className="text-left">
                <span className="text-xs font-bold text-sky-200 block leading-none">
                  {partnerSeat
                    ? t(`Seat #${partnerSeat}`, <>出席番号 {partnerSeat}番</>)
                    : t('Partner / 相手', '対戦相手')}
                </span>
                <div className="flex items-center gap-1.5">
                  {displayNameRight ? (
                    <>
                      <span className="text-base sm:text-lg font-black text-white">
                        {displayNameRight}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsPartnerPickerOpen(true);
                        }}
                        className="px-1.5 py-0.5 rounded-lg bg-sky-500/30 hover:bg-sky-500/50 text-sky-200 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                        title={t('Change Partner', '相手を変更')}
                      >
                        <Edit3 size={11} />
                        <span>{t('Change', '変更')}</span>
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsPartnerPickerOpen(true);
                      }}
                      className="px-2.5 py-1 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-black flex items-center gap-1 shadow-md transition active:scale-95 cursor-pointer animate-pulse"
                    >
                      <UserPlus size={13} />
                      <span>{t('Pick Partner', 'あいてをえらぶ')}</span>
                    </button>
                  )}
                  {streakRight >= 3 && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black flex items-center gap-0.5 animate-bounce">
                      <Flame size={11} />
                      <span>x{streakRight}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-sky-200 uppercase block">
                {t('Points', <><ruby>得点<rt>とくてん</rt></ruby></>)}
              </span>
              <span className="text-2xl sm:text-3xl font-black text-white leading-none">
                {scoreRight}
              </span>
            </div>
          </div>

          {/* Center Interactive Status Surface */}
          <div className="flex-1 flex flex-col items-center justify-center text-center px-2 z-10">
            {isRightLockedOut || foulFlashSide === 'RIGHT' ? (
              /* Pillar 2: Theatrical Referee Yellow Card Stamp */
              <div className="space-y-2 animate-bounce">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-2xl bg-amber-400 text-slate-950 font-black text-lg sm:text-2xl shadow-xl border-2 border-white">
                  <span>🟨</span>
                  <span>
                    {t(
                      'FALSE START! / FOUL!',
                      <>
                        おてつき！<ruby>反則<rt>はんそく</rt></ruby>！
                      </>
                    )}
                  </span>
                </div>
                {foulDecoyWord && (
                  <div className="text-xs sm:text-sm font-black text-amber-200 bg-black/50 px-3 py-1 rounded-xl border border-amber-400/40">
                    {t(
                      `Fooled by "${foulDecoyWord}"! Keyword is "${activeKeywordEnglish}"!`,
                      `「${foulDecoyWord}」でおてつき！合言葉は「${activeKeywordEnglish}」だよ！`
                    )}
                  </div>
                )}
                {foulPenaltyMode === 'AWARD_OPPONENT' && (
                  <div className="text-xs font-black text-sky-300">
                    {t(
                      '👈 +1 Point awarded to Red Player!',
                      '👈 赤プレイヤーに +1ポイント！'
                    )}
                  </div>
                )}
                <div className="text-[11px] font-bold text-slate-300">
                  {t(
                    `Locked for ${Math.max(0.1, (lockoutRightUntil - nowTick) / 1000).toFixed(1)}s! Hands on ${activePose.en}!`,
                    <>あと {Math.max(0.1, (lockoutRightUntil - nowTick) / 1000).toFixed(1)}秒 ロック中！手を戻そう！</>
                  )}
                </div>
              </div>
            ) : foulAwardedToOpponent === 'RIGHT' ? (
              <div className="space-y-2 animate-bounce">
                <Trophy size={54} className="text-yellow-300 mx-auto" />
                <div className="text-2xl sm:text-4xl font-black text-emerald-300">
                  {t('+1 PT! (Opponent Foul)', '+1点！（相手の反則）')}
                </div>
              </div>
            ) : roundLockedWinner === 'RIGHT' ? (
              /* Pillar 1: Winner Celebration + Reaction Speed Tier Badge + Delta */
              <div className="space-y-2 animate-bounce">
                <Trophy size={58} className="text-yellow-300 mx-auto drop-shadow-lg" />
                <div className="text-3xl sm:text-5xl font-black text-white drop-shadow-md">
                  {t('BLUE WINS!', <>青の<ruby>勝<rt>か</rt></ruby>ち！</>)}
                </div>

                {showReactionTiers && reactionTierInfo && (
                  <div
                    className={`inline-flex items-center gap-1.5 px-4 py-1 rounded-full border-2 font-black text-xs sm:text-sm shadow-lg ${reactionTierInfo.badgeBg} ${reactionTierInfo.badgeBorder} ${reactionTierInfo.textColor}`}
                  >
                    <span>{reactionTierInfo.icon}</span>
                    <span>
                      {language === 'ja'
                        ? reactionTierInfo.labelJaRuby
                        : reactionTierInfo.labelEn}
                    </span>
                  </div>
                )}

                <div className="flex flex-nowrap items-center justify-center gap-2 whitespace-nowrap">
                  <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-black/45 border border-yellow-300 text-yellow-200 font-mono font-black text-sm sm:text-base">
                    <Zap size={15} />
                    <span>{roundReactionMs}ms</span>
                  </div>
                  {roundDeltaMs !== null && (
                    <span className="px-3 py-1 rounded-full bg-emerald-500 text-slate-950 font-mono font-black text-xs sm:text-sm shadow">
                      {isTieBreakerWin
                        ? `⚡ TIE BREAKER (+${roundDeltaMs}ms!)`
                        : `+${roundDeltaMs}ms FASTER!`}
                    </span>
                  )}
                </div>
              </div>
            ) : roundLockedWinner === 'LEFT' ? (
              <div className="space-y-1 opacity-80">
                <span className="text-4xl">👏</span>
                <div className="text-lg sm:text-xl font-black text-sky-200">
                  {t('Red was faster!', '赤が早かった！')}
                </div>
                {roundDeltaMs !== null && (
                  <span className="text-xs font-mono font-bold text-sky-300">
                    (-{roundDeltaMs}ms)
                  </span>
                )}
              </div>
            ) : isKeywordHitNow ? (
              <div className="space-y-2">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-yellow-400 text-slate-950 flex items-center justify-center text-5xl font-black shadow-2xl mx-auto animate-bounce">
                  🖐️
                </div>
                <div className="text-3xl sm:text-5xl font-black text-white tracking-wider uppercase drop-shadow-lg">
                  {t('GRAB NOW!!', <>今すぐタップ！！</>)}
                </div>
                <div className="text-lg sm:text-2xl font-black text-yellow-200">
                  {activeKeywordEnglish}
                </div>
              </div>
            ) : activePhase === 'CYCLING' ? (
              <div className="space-y-2">
                <div className="text-5xl sm:text-6xl animate-pulse">👂</div>
                <div className="text-xl sm:text-2xl font-black text-sky-200">
                  {t('LISTEN... (Do Not Touch!)', <>よく<ruby>聞<rt>き</rt></ruby>いて！（まだ触っちゃダメ）</>)}
                </div>
                {activeCurrentWordEnglish && (
                  <div className="px-4 py-1 rounded-full bg-black/40 text-slate-300 font-black text-sm">
                    🔊 {activeCurrentWordEnglish}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-6xl sm:text-7xl animate-bounce">
                  {activePose.emoji}
                </div>
                <div className="text-xl sm:text-3xl font-black text-white">
                  {language === 'ja' ? activePose.actionJa : activePose.actionEn}
                </div>
                <p className="text-xs sm:text-sm font-bold text-sky-300">
                  {t('Keep hands off the iPad until the keyword!', '合言葉が出るまで画面から手を離してね！')}
                </p>
              </div>
            )}
          </div>

          {/* Bottom Touch Zone Footer */}
          <div className="w-full text-center py-1.5 rounded-xl bg-black/25 text-xs font-black text-sky-200 tracking-wider uppercase z-10">
            🔵 {t('PLAYER 2 TOUCH ZONE', 'プレイヤー2 タッチゾーン')}
          </div>
        </div>
      </div>

      {/* 1-Tap Classroom Partner Picker Modal */}
      {isPartnerPickerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-xs select-none"
          onClick={() => setIsPartnerPickerOpen(false)}
        >
          <div
            className="w-full max-w-2xl bg-slate-900 border-4 border-sky-400 text-white rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col max-h-[90dvh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">👥</span>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white">
                    {t('Who is your partner?', 'だれとペア？ (相手の番号をタップ)')}
                  </h3>
                  <p className="text-xs text-sky-300">
                    {t(
                      `Playing with ${displayNameLeft} (Seat #${displaySeatLeft})`,
                      `${displayNameLeft} (${displaySeatLeft}番) と対戦する相手をえらぼう！`
                    )}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPartnerPickerOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* 6-Column Roster Grid (Invariant Rule 13) */}
            <div className="flex-1 min-h-0 overflow-y-auto pr-1 grid grid-cols-4 sm:grid-cols-6 gap-2">
              {Array.from({ length: 35 }, (_, i) => i + 1).map((seatNum) => {
                const rosterInfo = classRoster[seatNum];
                const isMe = seatNum === displaySeatLeft;
                const isSelectedPartner = seatNum === partnerSeat;

                return (
                  <button
                    key={seatNum}
                    type="button"
                    disabled={isMe}
                    onClick={() => handleSelectPartner(seatNum)}
                    className={`p-2 rounded-2xl border-2 flex flex-col items-center justify-between gap-1 transition-all text-center cursor-pointer ${
                      isMe
                        ? 'opacity-40 border-slate-700 bg-slate-950 cursor-not-allowed'
                        : isSelectedPartner
                        ? 'bg-sky-500 text-slate-950 border-white ring-2 ring-sky-300 shadow-lg scale-105'
                        : 'bg-slate-800/90 hover:bg-slate-700 border-slate-700 hover:border-sky-400 active:scale-95'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full text-[10px] font-black text-slate-400">
                      <span>#{seatNum}</span>
                      {isMe && <span className="text-amber-400 font-bold">(You)</span>}
                    </div>
                    <span className="text-2xl">
                      {rosterInfo?.avatar || (isMe ? displayAvatarLeft : '👤')}
                    </span>
                    <span className="text-xs font-black truncate w-full">
                      {rosterInfo?.nickname || `Seat #${seatNum}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};