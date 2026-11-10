import { useState, useEffect, useCallback, useMemo } from 'react';
import { VocabularyItem, GradeLevel } from '@data/types';
import { safeSet, safeUpdate, safeSubscribe, getServerTime } from '@/services/rtdbSafe';
import { resolveCardImage, shuffleArray } from './utils';
import {
  GamePhase,
  CardCount,
  MissingCount,
  DisplayTier,
  MissingCandidateChoice,
  MissingRoomMeta,
  MissingRoomState,
  MissingStudentAnswer,
  MissingRoomStats,
  MissingRoomData,
} from './types';

interface UseWhatsMissingRoomOptions {
  roomCode?: string;
  isHost?: boolean;
  schoolId?: string;
  classId?: string;
  grade?: string;
  unit?: string;
  targetClassSize?: number;
}

export function buildCandidateChoices(
  missingCards: VocabularyItem[],
  trayCards: VocabularyItem[],
  poolCards: VocabularyItem[],
  activeGrade: string,
  targetChoiceCount = 4
): MissingCandidateChoice[] {
  const missingSet = new Set(missingCards.map((c) => c.id));
  const distractorsPool = [
    ...trayCards.filter((c) => !missingSet.has(c.id)),
    ...poolCards.filter((c) => !missingSet.has(c.id)),
  ];

  const uniqueDistractors: VocabularyItem[] = [];
  const seenIds = new Set<string>(missingSet);

  for (const item of shuffleArray(distractorsPool)) {
    if (!seenIds.has(item.id)) {
      seenIds.add(item.id);
      uniqueDistractors.push(item);
    }
    if (missingCards.length + uniqueDistractors.length >= targetChoiceCount) {
      break;
    }
  }

  const combined = shuffleArray([...missingCards, ...uniqueDistractors]);
  return combined.map((c) => ({
    id: c.id,
    english: c.english,
    ja: c.ja_kanji || c.ja_hiragana || '',
    jaKanji: c.ja_kanji,
    jaHiragana: c.ja_hiragana,
    ruby: c.ruby,
    imageUrl: resolveCardImage(c, 'picture_only', activeGrade as GradeLevel),
    soundFile: c.sound_file || c.primary_audio,
  }));
}

export function useWhatsMissingRoom({
  roomCode: initialRoomCode = '',
  isHost = false,
  schoolId = 'toyogaoka',
  classId = '4-1',
  grade = 'ES_G4',
  unit = 'ALL',
  targetClassSize = 35,
}: UseWhatsMissingRoomOptions) {
  const [roomCode, setRoomCode] = useState<string>(initialRoomCode);
  const [roomMeta, setRoomMeta] = useState<MissingRoomMeta | null>(null);
  const [roomState, setRoomState] = useState<MissingRoomState | null>(null);
  const [answersMap, setAnswersMap] = useState<Record<string, MissingStudentAnswer>>({});
  const [isConnected, setIsConnected] = useState<boolean>(false);

  // Subscribe to RTDB room with clean unmount detachment
  useEffect(() => {
    if (!roomCode) {
      setIsConnected(false);
      return;
    }

    const path = `/missing_rooms/${roomCode}`;
    const unsubscribe = safeSubscribe<MissingRoomData>(
      path,
      (data) => {
        setIsConnected(true);
        if (!data) return;
        if (data.meta) setRoomMeta(data.meta);
        if (data.state) setRoomState(data.state);
        setAnswersMap(data.answers || {});
      },
      () => {
        setIsConnected(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [roomCode]);

  // Real-time local aggregation of student answers & fastest responder
  const aggregatedStats: MissingRoomStats = useMemo(() => {
    const entries = Object.values(answersMap);
    const choiceCounts: Record<string, number> = {};
    let correctCount = 0;
    let fastestSeat: number | null = null;
    let fastestNickname: string | null = null;
    let fastestTimeMs: number | null = null;

    entries.forEach((ans) => {
      const selectedList =
        ans.selectedWordIds && ans.selectedWordIds.length > 0
          ? ans.selectedWordIds
          : ans.selectedWordId
          ? [ans.selectedWordId]
          : [];

      selectedList.forEach((id) => {
        choiceCounts[id] = (choiceCounts[id] || 0) + 1;
      });

      if (ans.isCorrect) {
        correctCount += 1;
        if (fastestTimeMs === null || ans.responseTimeMs < fastestTimeMs) {
          fastestTimeMs = ans.responseTimeMs;
          fastestSeat = ans.seat;
          fastestNickname = ans.nickname;
        }
      }
    });

    return {
      totalSubmissions: entries.length,
      correctCount,
      choiceCounts,
      fastestSeat,
      fastestNickname,
      fastestTimeMs,
    };
  }, [answersMap]);

  // --- HOST METHODS ---
  const createRoom = useCallback(
    async (
      customCode?: string,
      cardCount: CardCount = 4,
      missingCount: MissingCount = 1,
      displayTier: DisplayTier = 'picture_only'
    ) => {
      const generatedCode =
        customCode || `WM-${Math.floor(100 + Math.random() * 900)}`;
      const now = getServerTime();

      const meta: MissingRoomMeta = {
        roomCode: generatedCode,
        schoolId,
        classId,
        grade,
        unit,
        createdAt: now,
        hostActive: true,
      };

      const state: MissingRoomState = {
        phase: 'STUDY',
        roundNumber: 1,
        cardCount,
        missingCount,
        displayTier,
        missingWordIds: [],
        revealedMissingIds: [],
        candidateChoices: [],
        guessingStartTimestamp: null,
        isRevealed: false,
        updatedAt: now,
      };

      setRoomCode(generatedCode);
      setRoomMeta(meta);
      setRoomState(state);
      setAnswersMap({});

      await safeSet(`/missing_rooms/${generatedCode}`, {
        meta,
        state,
        answers: {},
      });

      return generatedCode;
    },
    [schoolId, classId, grade, unit]
  );

  const closeCurtains = useCallback(async () => {
    if (!roomCode) return;
    const now = getServerTime();
    await safeUpdate(`/missing_rooms/${roomCode}/state`, {
      phase: 'CURTAIN_CLOSED',
      isRevealed: false,
      updatedAt: now,
    });
  }, [roomCode]);

  const openCurtains = useCallback(
    async (
      missingCards: VocabularyItem[],
      candidateChoices: MissingCandidateChoice[],
      cardCount: CardCount,
      missingCount: MissingCount,
      displayTier: DisplayTier
    ) => {
      if (!roomCode) return;
      const now = getServerTime();
      const missingWordIds = missingCards.map((c) => c.id);

      setAnswersMap({});
      await safeUpdate(`/missing_rooms/${roomCode}`, {
        answers: {},
        'state/phase': 'GUESSING',
        'state/cardCount': cardCount,
        'state/missingCount': missingCount,
        'state/displayTier': displayTier,
        'state/missingWordIds': missingWordIds,
        'state/revealedMissingIds': [],
        'state/candidateChoices': candidateChoices,
        'state/guessingStartTimestamp': now,
        'state/isRevealed': false,
        'state/updatedAt': now,
      });
    },
    [roomCode]
  );

  const revealCard = useCallback(
    async (revealedIds: string[], allRevealed: boolean) => {
      if (!roomCode) return;
      const now = getServerTime();
      await safeUpdate(`/missing_rooms/${roomCode}/state`, {
        phase: allRevealed ? 'REVEALED' : 'GUESSING',
        revealedMissingIds: revealedIds,
        isRevealed: allRevealed,
        updatedAt: now,
      });
    },
    [roomCode]
  );

  const nextRound = useCallback(
    async (
      nextRoundNumber: number,
      cardCount: CardCount,
      missingCount: MissingCount,
      displayTier: DisplayTier
    ) => {
      if (!roomCode) return;
      const now = getServerTime();
      setAnswersMap({});
      await safeUpdate(`/missing_rooms/${roomCode}`, {
        answers: {},
        'state/phase': 'STUDY',
        'state/roundNumber': nextRoundNumber,
        'state/cardCount': cardCount,
        'state/missingCount': missingCount,
        'state/displayTier': displayTier,
        'state/missingWordIds': [],
        'state/revealedMissingIds': [],
        'state/candidateChoices': [],
        'state/guessingStartTimestamp': null,
        'state/isRevealed': false,
        'state/updatedAt': now,
      });
    },
    [roomCode]
  );

  // --- STUDENT AUDIENCE METHODS ---
  const joinRoom = useCallback((targetCode: string) => {
    setRoomCode(targetCode.trim().toUpperCase());
  }, []);

  const submitAnswer = useCallback(
    async (
      seat: number,
      nickname: string,
      chosenWordIds: string[],
      responseTimeMs: number
    ) => {
      if (!roomCode || chosenWordIds.length === 0) return null;
      const now = getServerTime();
      const targetMissingIds = roomState?.missingWordIds || [];
      const missingSet = new Set(targetMissingIds);

      // In 1-card mode, check if chosenWordIds[0] matches; in 2-card mode, check if all missing cards were found
      const isCorrect =
        targetMissingIds.length > 0 &&
        chosenWordIds.length === targetMissingIds.length &&
        chosenWordIds.every((id) => missingSet.has(id));

      const payload: MissingStudentAnswer = {
        seat,
        nickname: nickname || `Seat #${seat}`,
        selectedWordIds: chosenWordIds,
        selectedWordId: chosenWordIds[0],
        isCorrect,
        responseTimeMs: Math.max(100, Math.round(responseTimeMs)),
        submittedAt: now,
      };

      setAnswersMap((prev) => ({ ...prev, [String(seat)]: payload }));
      await safeSet(`/missing_rooms/${roomCode}/answers/${seat}`, payload);
      return payload;
    },
    [roomCode, roomState?.missingWordIds]
  );

  return {
    roomCode,
    setRoomCode,
    roomMeta,
    roomState,
    answersMap,
    aggregatedStats,
    targetClassSize,
    isConnected,
    // Host actions
    createRoom,
    closeCurtains,
    openCurtains,
    revealCard,
    nextRound,
    // Student actions
    joinRoom,
    submitAnswer,
  };
}
