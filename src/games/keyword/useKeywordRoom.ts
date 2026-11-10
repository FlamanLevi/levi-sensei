import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { VocabularyItem } from '@data/types';
import { safeSet, safeUpdate, safeSubscribe, getServerTime } from '@/services/rtdbSafe';
import {
  KeywordRoomMeta,
  KeywordRoomState,
  KeywordPairState,
  KeywordRoomData,
  KeywordDisplayTier,
  PairSide,
  KeywordRoundResult,
  FoulPenaltyMode,
  TopReflexEntry,
  getReactionTier,
} from './types';

interface UseKeywordRoomOptions {
  roomCode?: string;
  isHost?: boolean;
  schoolId?: string;
  classId?: string;
  grade?: string;
  unit?: string;
}

const THROTTLE_MS = 120; // Strict 120ms RTDB write throttling (Invariant 5)

export function formatDeskPairId(deskNumber: number): string {
  return `desk_${String(deskNumber).padStart(2, '0')}`;
}

export function generateDefault18Desks(): Record<string, KeywordPairState> {
  const pairs: Record<string, KeywordPairState> = {};
  const now = getServerTime();
  for (let desk = 1; desk <= 18; desk++) {
    const pairId = formatDeskPairId(desk);
    const seatLeft = (desk - 1) * 2 + 1;
    const seatRight = Math.min(35, seatLeft + 1);
    pairs[pairId] = {
      pairId,
      deskNumber: desk,
      seatLeft,
      nameLeft: `#${seatLeft}`,
      scoreLeft: 0,
      foulCountLeft: 0,
      streakLeft: 0,
      seatRight,
      nameRight: seatRight === seatLeft ? 'Partner' : `#${seatRight}`,
      scoreRight: 0,
      foulCountRight: 0,
      streakRight: 0,
      streakSide: null,
      streakCount: 0,
      bestReactionMs: null,
      lastResult: null,
      connected: false,
      updatedAt: now,
    };
  }
  return pairs;
}

export function useKeywordRoom({
  roomCode: initialRoomCode = '',
  isHost = false,
  schoolId = 'toyogaoka',
  classId = '4-1',
  grade = 'ES_G4',
  unit = 'ALL',
}: UseKeywordRoomOptions) {
  const [roomCode, setRoomCode] = useState<string>(initialRoomCode);
  const [roomMeta, setRoomMeta] = useState<KeywordRoomMeta | null>(null);
  const [roomState, setRoomState] = useState<KeywordRoomState | null>(null);
  const [pairsMap, setPairsMap] = useState<Record<string, KeywordPairState>>(() =>
    generateDefault18Desks()
  );
  const [isConnected, setIsConnected] = useState<boolean>(false);

  const lastWriteTimeRef = useRef<number>(0);
  const pendingStateRef = useRef<Partial<KeywordRoomState> | null>(null);
  const throttleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Subscribe to RTDB room changes with clean unmount teardown
  useEffect(() => {
    if (!roomCode) {
      setIsConnected(false);
      return;
    }

    const path = `/keyword_rooms/${roomCode}`;
    const unsubscribe = safeSubscribe<KeywordRoomData>(
      path,
      (data) => {
        setIsConnected(true);
        if (!data) return;
        if (data.meta) setRoomMeta(data.meta);
        if (data.state) setRoomState(data.state);
        if (data.pairs) {
          setPairsMap((prev) => ({
            ...prev,
            ...data.pairs,
          }));
        }
      },
      () => {
        setIsConnected(false);
      }
    );

    return () => {
      unsubscribe();
      if (throttleTimerRef.current) {
        clearTimeout(throttleTimerRef.current);
        throttleTimerRef.current = null;
      }
    };
  }, [roomCode]);

  // Compute Top 3 Fastest Reflexes in Class (for Podium & Live Arena)
  const top3FastestDesks: TopReflexEntry[] = useMemo(() => {
    const validEntries: TopReflexEntry[] = [];

    Object.values(pairsMap).forEach((desk) => {
      const res = desk?.lastResult;
      if (
        res &&
        (res.winner === 'LEFT' || res.winner === 'RIGHT') &&
        typeof res.reactionTimeMs === 'number' &&
        res.reactionTimeMs > 0
      ) {
        const winnerSide: PairSide = res.winner;
        const tierInfo = getReactionTier(res.reactionTimeMs);
        const isLeftWinner = winnerSide === 'LEFT';
        validEntries.push({
          pairId: desk.pairId,
          deskNumber: desk.deskNumber,
          winnerSide,
          playerName: isLeftWinner ? desk.nameLeft : desk.nameRight,
          playerAvatar: isLeftWinner ? desk.avatarLeft : desk.avatarRight,
          partnerName: isLeftWinner ? desk.nameRight : desk.nameLeft,
          partnerAvatar: isLeftWinner ? desk.avatarRight : desk.avatarLeft,
          seatNumber: isLeftWinner ? desk.seatLeft : desk.seatRight,
          reactionTimeMs: res.reactionTimeMs,
          reactionTier: res.reactionTier || tierInfo.tier,
          streakCount: desk.streakCount || 1,
        });
      }
    });

    return validEntries
      .sort((a, b) => a.reactionTimeMs - b.reactionTimeMs)
      .slice(0, 3);
  }, [pairsMap]);

  // Throttled state updater for Host (120ms minimum interval)
  const pushStateUpdate = useCallback(
    async (partialState: Partial<KeywordRoomState>, immediate = false) => {
      if (!roomCode) return false;
      const now = Date.now();
      const elapsed = now - lastWriteTimeRef.current;

      if (immediate || elapsed >= THROTTLE_MS) {
        if (throttleTimerRef.current) {
          clearTimeout(throttleTimerRef.current);
          throttleTimerRef.current = null;
        }
        lastWriteTimeRef.current = now;
        const payload = {
          ...(pendingStateRef.current || {}),
          ...partialState,
          updatedAt: getServerTime(),
        };
        pendingStateRef.current = null;
        await safeUpdate(`/keyword_rooms/${roomCode}/state`, payload);
        return true;
      } else {
        pendingStateRef.current = {
          ...(pendingStateRef.current || {}),
          ...partialState,
        };
        if (!throttleTimerRef.current) {
          throttleTimerRef.current = setTimeout(() => {
            throttleTimerRef.current = null;
            if (pendingStateRef.current && roomCode) {
              lastWriteTimeRef.current = Date.now();
              const payload = {
                ...pendingStateRef.current,
                updatedAt: getServerTime(),
              };
              pendingStateRef.current = null;
              safeUpdate(`/keyword_rooms/${roomCode}/state`, payload);
            }
          }, THROTTLE_MS - elapsed);
        }
        return true;
      }
    },
    [roomCode]
  );

  // --- HOST METHODS ---
  const createRoom = useCallback(
    async (customCode?: string, initialKeyword?: VocabularyItem | null) => {
      const generatedCode =
        customCode || `KW-${Math.floor(100 + Math.random() * 900)}`;
      const now = getServerTime();

      const meta: KeywordRoomMeta = {
        roomCode: generatedCode,
        schoolId,
        classId,
        grade,
        unit,
        createdAt: now,
        hostActive: true,
      };

      const state: KeywordRoomState = {
        phase: 'SELECTING',
        round: 1,
        keywordId: initialKeyword?.id || '',
        keywordEnglish: initialKeyword?.english || '',
        keywordJa: initialKeyword?.ja_kanji || initialKeyword?.ja_hiragana || '',
        currentPoseId: 'head',
        cycleIndex: 0,
        currentCardId: '',
        currentCardEnglish: '',
        currentCardJa: '',
        displayTier: 'PICTURE_WORD',
        speedMs: 1450,
        foulPenaltyMode: 'AWARD_OPPONENT',
        showReactionTiers: true,
        keywordTriggerTimestamp: null,
        isKeywordActive: false,
        updatedAt: now,
      };

      const defaultPairs = generateDefault18Desks();
      setRoomCode(generatedCode);
      setRoomMeta(meta);
      setRoomState(state);
      setPairsMap(defaultPairs);

      await safeSet(`/keyword_rooms/${generatedCode}`, {
        meta,
        state,
        pairs: defaultPairs,
      });

      return generatedCode;
    },
    [schoolId, classId, grade, unit]
  );

  const setKeyword = useCallback(
    async (word: VocabularyItem, displayTier?: KeywordDisplayTier) => {
      return pushStateUpdate(
        {
          keywordId: word.id,
          keywordEnglish: word.english,
          keywordJa: word.ja_kanji || word.ja_hiragana || '',
          ...(displayTier ? { displayTier } : {}),
          isKeywordActive: false,
          keywordTriggerTimestamp: null,
        },
        true
      );
    },
    [pushStateUpdate]
  );

  const updateRoomConfig = useCallback(
    async (config: {
      foulPenaltyMode?: FoulPenaltyMode;
      showReactionTiers?: boolean;
      displayTier?: KeywordDisplayTier;
      speedMs?: number;
    }) => {
      return pushStateUpdate(config, true);
    },
    [pushStateUpdate]
  );

  const setReadyPose = useCallback(
    async (poseId: string, roundNumber: number) => {
      if (!roomCode) return;
      const now = getServerTime();

      // Clear previous round results across desks while preserving scores & streaks
      const pairResetUpdates: Record<string, any> = {};
      Object.keys(pairsMap).forEach((pairId) => {
        pairResetUpdates[`pairs/${pairId}/lastResult`] = null;
      });

      await safeUpdate(`/keyword_rooms/${roomCode}`, {
        ...pairResetUpdates,
        'state/phase': 'READY',
        'state/currentPoseId': poseId,
        'state/round': roundNumber,
        'state/cycleIndex': 0,
        'state/currentCardId': '',
        'state/currentCardEnglish': '',
        'state/currentCardJa': '',
        'state/isKeywordActive': false,
        'state/keywordTriggerTimestamp': null,
        'state/updatedAt': now,
      });
    },
    [roomCode, pairsMap]
  );

  const startCycle = useCallback(
    async (
      firstCard: VocabularyItem,
      speedMs: number,
      displayTier: KeywordDisplayTier
    ) => {
      return pushStateUpdate(
        {
          phase: 'CYCLING',
          cycleIndex: 0,
          currentCardId: firstCard.id,
          currentCardEnglish: firstCard.english,
          currentCardJa: firstCard.ja_kanji || firstCard.ja_hiragana || '',
          speedMs,
          displayTier,
          isKeywordActive: false,
          keywordTriggerTimestamp: null,
        },
        true
      );
    },
    [pushStateUpdate]
  );

  const updateCycleCard = useCallback(
    async (card: VocabularyItem, cycleIndex: number, isKeywordHit: boolean) => {
      const now = getServerTime();
      return pushStateUpdate(
        {
          cycleIndex,
          currentCardId: card.id,
          currentCardEnglish: card.english,
          currentCardJa: card.ja_kanji || card.ja_hiragana || '',
          isKeywordActive: isKeywordHit,
          keywordTriggerTimestamp: isKeywordHit ? now : null,
        },
        isKeywordHit
      );
    },
    [pushStateUpdate]
  );

  const triggerKeywordGrab = useCallback(
    async (keywordCard: VocabularyItem, roundNumber: number) => {
      const now = getServerTime();
      return pushStateUpdate(
        {
          phase: 'GRAB',
          round: roundNumber,
          currentCardId: keywordCard.id,
          currentCardEnglish: keywordCard.english,
          currentCardJa:
            keywordCard.ja_kanji || keywordCard.ja_hiragana || '',
          isKeywordActive: true,
          keywordTriggerTimestamp:
            roomState?.keywordTriggerTimestamp || now,
        },
        true
      );
    },
    [pushStateUpdate, roomState?.keywordTriggerTimestamp]
  );

  const resetRound = useCallback(
    async (nextKeyword?: VocabularyItem | null) => {
      return pushStateUpdate(
        {
          phase: 'SELECTING',
          cycleIndex: 0,
          currentCardId: '',
          currentCardEnglish: '',
          currentCardJa: '',
          isKeywordActive: false,
          keywordTriggerTimestamp: null,
          ...(nextKeyword
            ? {
                keywordId: nextKeyword.id,
                keywordEnglish: nextKeyword.english,
                keywordJa:
                  nextKeyword.ja_kanji || nextKeyword.ja_hiragana || '',
              }
            : {}),
        },
        true
      );
    },
    [pushStateUpdate]
  );

  const resetAllDeskScores = useCallback(async () => {
    const freshDesks = generateDefault18Desks();
    setPairsMap(freshDesks);
    if (!roomCode) return;
    await safeSet(`/keyword_rooms/${roomCode}/pairs`, freshDesks);
  }, [roomCode]);

  // --- STUDENT PAIR METHODS ---
  const joinDeskPair = useCallback(
    async (
      targetRoomCode: string,
      deskNumber: number,
      seatLeft?: number,
      nameLeft?: string,
      seatRight?: number,
      nameRight?: string,
      avatarLeft?: string,
      avatarRight?: string
    ) => {
      setRoomCode(targetRoomCode);
      const pairId = formatDeskPairId(deskNumber);
      const defaultSeatL = seatLeft ?? (deskNumber - 1) * 2 + 1;
      const defaultSeatR = seatRight ?? Math.min(35, defaultSeatL + 1);
      const now = getServerTime();

      const existing = pairsMap[pairId];
      const pairPayload: KeywordPairState = {
        pairId,
        deskNumber,
        seatLeft: defaultSeatL,
        nameLeft: nameLeft || existing?.nameLeft || `Seat #${defaultSeatL}`,
        avatarLeft: avatarLeft || existing?.avatarLeft,
        scoreLeft: existing?.scoreLeft || 0,
        foulCountLeft: existing?.foulCountLeft || 0,
        streakLeft: existing?.streakLeft || 0,
        seatRight: defaultSeatR,
        nameRight: nameRight || existing?.nameRight || `Seat #${defaultSeatR}`,
        avatarRight: avatarRight || existing?.avatarRight,
        scoreRight: existing?.scoreRight || 0,
        foulCountRight: existing?.foulCountRight || 0,
        streakRight: existing?.streakRight || 0,
        streakSide: existing?.streakSide || null,
        streakCount: existing?.streakCount || 0,
        bestReactionMs: existing?.bestReactionMs || null,
        lastResult: existing?.lastResult || null,
        connected: true,
        updatedAt: now,
      };

      setPairsMap((prev) => ({ ...prev, [pairId]: pairPayload }));
      await safeUpdate(
        `/keyword_rooms/${targetRoomCode}/pairs/${pairId}`,
        pairPayload
      );
      return pairPayload;
    },
    [pairsMap]
  );

  const recordSlap = useCallback(
    async (
      deskNumber: number,
      side: PairSide,
      reactionTimeMs: number,
      deltaMs: number | null = null,
      isTieBreaker = false
    ) => {
      const pairId = formatDeskPairId(deskNumber);
      const currentPair = pairsMap[pairId] || generateDefault18Desks()[pairId];
      const now = getServerTime();
      const round = roomState?.round || 1;
      const cleanReactionMs = Math.max(1, Math.round(reactionTimeMs));
      const tierInfo = getReactionTier(cleanReactionMs);

      const lastResult: KeywordRoundResult = {
        winner: side,
        reactionTimeMs: cleanReactionMs,
        reactionTier: tierInfo.tier,
        deltaMs: deltaMs !== null ? Math.round(deltaMs) : null,
        isTieBreaker,
        round,
        timestamp: now,
      };

      const nextScoreLeft =
        side === 'LEFT' ? (currentPair.scoreLeft || 0) + 1 : currentPair.scoreLeft || 0;
      const nextScoreRight =
        side === 'RIGHT'
          ? (currentPair.scoreRight || 0) + 1
          : currentPair.scoreRight || 0;

      const nextStreakLeft =
        side === 'LEFT' ? (currentPair.streakLeft || 0) + 1 : 0;
      const nextStreakRight =
        side === 'RIGHT' ? (currentPair.streakRight || 0) + 1 : 0;
      const nextStreakCount =
        side === 'LEFT' ? nextStreakLeft : nextStreakRight;

      const nextBestReactionMs =
        currentPair.bestReactionMs === null ||
        cleanReactionMs < currentPair.bestReactionMs
          ? cleanReactionMs
          : currentPair.bestReactionMs;

      const updatedPair: KeywordPairState = {
        ...currentPair,
        scoreLeft: nextScoreLeft,
        scoreRight: nextScoreRight,
        streakLeft: nextStreakLeft,
        streakRight: nextStreakRight,
        streakSide: side,
        streakCount: nextStreakCount,
        bestReactionMs: nextBestReactionMs,
        lastResult,
        connected: true,
        updatedAt: now,
      };

      setPairsMap((prev) => ({ ...prev, [pairId]: updatedPair }));

      if (roomCode) {
        await safeUpdate(`/keyword_rooms/${roomCode}/pairs/${pairId}`, {
          scoreLeft: nextScoreLeft,
          scoreRight: nextScoreRight,
          streakLeft: nextStreakLeft,
          streakRight: nextStreakRight,
          streakSide: side,
          streakCount: nextStreakCount,
          bestReactionMs: nextBestReactionMs,
          lastResult,
          connected: true,
          updatedAt: now,
        });
      }

      return updatedPair;
    },
    [pairsMap, roomState?.round, roomCode]
  );

  const recordFoul = useCallback(
    async (
      deskNumber: number,
      offendingSide: PairSide,
      foulWordEnglish?: string,
      penaltyMode: FoulPenaltyMode = 'AWARD_OPPONENT'
    ) => {
      const pairId = formatDeskPairId(deskNumber);
      const currentPair = pairsMap[pairId] || generateDefault18Desks()[pairId];
      const now = getServerTime();
      const round = roomState?.round || 1;
      const opponentSide: PairSide = offendingSide === 'LEFT' ? 'RIGHT' : 'LEFT';

      const lastResult: KeywordRoundResult = {
        winner: offendingSide === 'LEFT' ? 'FOUL_LEFT' : 'FOUL_RIGHT',
        reactionTimeMs: null,
        reactionTier: null,
        foulWordEnglish: foulWordEnglish || roomState?.currentCardEnglish || '',
        round,
        timestamp: now,
      };

      // Pillar 2: Automatically award point to opponent on false start (or deduct 1 point in lockout mode)
      let nextScoreLeft = currentPair.scoreLeft || 0;
      let nextScoreRight = currentPair.scoreRight || 0;
      let nextStreakLeft = currentPair.streakLeft || 0;
      let nextStreakRight = currentPair.streakRight || 0;

      if (penaltyMode === 'AWARD_OPPONENT') {
        if (offendingSide === 'LEFT') {
          nextScoreRight += 1;
          nextStreakLeft = 0;
          nextStreakRight += 1;
        } else {
          nextScoreLeft += 1;
          nextStreakRight = 0;
          nextStreakLeft += 1;
        }
      } else {
        if (offendingSide === 'LEFT') {
          nextScoreLeft = Math.max(0, nextScoreLeft - 1);
          nextStreakLeft = 0;
        } else {
          nextScoreRight = Math.max(0, nextScoreRight - 1);
          nextStreakRight = 0;
        }
      }

      const nextFoulLeft =
        offendingSide === 'LEFT'
          ? (currentPair.foulCountLeft || 0) + 1
          : currentPair.foulCountLeft || 0;
      const nextFoulRight =
        offendingSide === 'RIGHT'
          ? (currentPair.foulCountRight || 0) + 1
          : currentPair.foulCountRight || 0;

      const nextStreakSide: PairSide | null =
        nextStreakLeft > 0 ? 'LEFT' : nextStreakRight > 0 ? 'RIGHT' : null;
      const nextStreakCount = Math.max(nextStreakLeft, nextStreakRight);

      const updatedPair: KeywordPairState = {
        ...currentPair,
        scoreLeft: nextScoreLeft,
        scoreRight: nextScoreRight,
        foulCountLeft: nextFoulLeft,
        foulCountRight: nextFoulRight,
        streakLeft: nextStreakLeft,
        streakRight: nextStreakRight,
        streakSide: nextStreakSide,
        streakCount: nextStreakCount,
        lastResult,
        connected: true,
        updatedAt: now,
      };

      setPairsMap((prev) => ({ ...prev, [pairId]: updatedPair }));

      if (roomCode) {
        await safeUpdate(`/keyword_rooms/${roomCode}/pairs/${pairId}`, {
          scoreLeft: nextScoreLeft,
          scoreRight: nextScoreRight,
          foulCountLeft: nextFoulLeft,
          foulCountRight: nextFoulRight,
          streakLeft: nextStreakLeft,
          streakRight: nextStreakRight,
          streakSide: nextStreakSide,
          streakCount: nextStreakCount,
          lastResult,
          connected: true,
          updatedAt: now,
        });
      }

      return { updatedPair, awardedSide: opponentSide };
    },
    [pairsMap, roomState?.round, roomState?.currentCardEnglish, roomCode]
  );

  return {
    roomCode,
    setRoomCode,
    roomMeta,
    roomState,
    pairsMap,
    top3FastestDesks,
    isConnected,
    // Host actions
    createRoom,
    setKeyword,
    updateRoomConfig,
    setReadyPose,
    startCycle,
    updateCycleCard,
    triggerKeywordGrab,
    resetRound,
    resetAllDeskScores,
    // Student Pair actions
    joinDeskPair,
    recordSlap,
    recordFoul,
  };
}