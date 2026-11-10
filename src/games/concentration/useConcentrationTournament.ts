import { useState, useEffect, useCallback, useMemo } from 'react';
import { safeSet, safeUpdate, safeSubscribe, getServerTime } from '@/services/rtdbSafe';
import {
  MatchMode,
  GridSize,
  ConcentrationDeskPairState,
  TournamentRoomMeta,
  TournamentRoomStats,
  TournamentRoomState,
} from './types';

interface UseConcentrationTournamentOptions {
  roomCode?: string;
  schoolId?: string;
  classId?: string;
  grade?: string;
  unit?: string;
  matchMode?: MatchMode;
  pairCount?: GridSize;
}

export function formatConcentrationDeskId(deskNumber: number): string {
  return `desk_${String(deskNumber).padStart(2, '0')}`;
}

export function buildDefault18ConcentrationDesks(
  defaultPairCount: GridSize = 6
): Record<string, ConcentrationDeskPairState> {
  const desks: Record<string, ConcentrationDeskPairState> = {};
  const now = getServerTime();

  for (let d = 1; d <= 18; d++) {
    const deskId = formatConcentrationDeskId(d);
    const seatA = (d - 1) * 2 + 1;
    const seatB = Math.min(35, seatA + 1);
    desks[deskId] = {
      deskId,
      deskNumber: d,
      seatA,
      nameA: `#${seatA}`,
      scoreA: 0,
      seatB,
      nameB: seatB === seatA ? 'Partner' : `#${seatB}`,
      scoreB: 0,
      pairsCompleted: 0,
      totalPairs: defaultPairCount,
      isFinished: false,
      finishedAt: null,
      rematchCount: 0,
      currentTurn: 'A',
      updatedAt: now,
    };
  }
  return desks;
}

export function useConcentrationTournament({
  roomCode: initialRoomCode = '',
  schoolId = 'toyogaoka',
  classId = '4-1',
  grade = 'ES_G4',
  unit = 'ALL',
  matchMode = 'pic_word',
  pairCount = 6,
}: UseConcentrationTournamentOptions) {
  const [roomCode, setRoomCode] = useState<string>(initialRoomCode);
  const [roomMeta, setRoomMeta] = useState<TournamentRoomMeta | null>(null);
  const [desksMap, setDesksMap] = useState<
    Record<string, ConcentrationDeskPairState>
  >(() => buildDefault18ConcentrationDesks(pairCount));
  const [isConnected, setIsConnected] = useState<boolean>(false);

  // Clean RTDB subscription with unmount teardown
  useEffect(() => {
    if (!roomCode) {
      setIsConnected(false);
      return;
    }

    const path = `/concentration_rooms/${roomCode}`;
    const unsubscribe = safeSubscribe<TournamentRoomState>(
      path,
      (data) => {
        setIsConnected(true);
        if (!data) return;
        if (data.meta) setRoomMeta(data.meta);
        if (data.pairs) {
          setDesksMap((prev) => ({
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
    };
  }, [roomCode]);

  // Live aggregated tournament stats across all 18 classroom desks
  const stats: TournamentRoomStats = useMemo(() => {
    const list = Object.values(desksMap);
    let totalClassPairsMatched = 0;
    let targetClassPairs = 0;
    let completedDesksCount = 0;

    list.forEach((d) => {
      totalClassPairsMatched += d.pairsCompleted || 0;
      targetClassPairs += d.totalPairs || pairCount;
      if (d.isFinished) {
        completedDesksCount += 1;
      }
    });

    return {
      totalClassPairsMatched,
      targetClassPairs: targetClassPairs || 18 * pairCount,
      completedDesksCount,
    };
  }, [desksMap, pairCount]);

  // Create or reset a classroom tournament room
  const createTournamentRoom = useCallback(
    async (
      customCode?: string,
      selectedMode: MatchMode = matchMode,
      selectedPairs: GridSize = pairCount
    ) => {
      const generatedCode =
        customCode || `MM-${Math.floor(100 + Math.random() * 900)}`;
      const now = getServerTime();

      const meta: TournamentRoomMeta = {
        roomCode: generatedCode,
        schoolId,
        classId,
        grade,
        unit,
        matchMode: selectedMode,
        pairCount: selectedPairs,
        createdAt: now,
        hostActive: true,
      };

      const initialDesks = buildDefault18ConcentrationDesks(selectedPairs);
      const initialStats: TournamentRoomStats = {
        totalClassPairsMatched: 0,
        targetClassPairs: 18 * selectedPairs,
        completedDesksCount: 0,
      };

      setRoomCode(generatedCode);
      setRoomMeta(meta);
      setDesksMap(initialDesks);

      await safeSet(`/concentration_rooms/${generatedCode}`, {
        meta,
        pairs: initialDesks,
        stats: initialStats,
      });

      return generatedCode;
    },
    [schoolId, classId, grade, unit, matchMode, pairCount]
  );

  // Student iPad pair reports progress (works locally even if offline)
  const reportPairProgress = useCallback(
    async (
      deskNumber: number,
      updates: {
        scoreA: number;
        scoreB: number;
        pairsCompleted: number;
        totalPairs: number;
        isFinished: boolean;
        currentTurn: 'A' | 'B';
        rematchCount?: number;
        nameA?: string;
        nameB?: string;
      }
    ) => {
      const deskId = formatConcentrationDeskId(deskNumber);
      const now = getServerTime();
      const seatA = (deskNumber - 1) * 2 + 1;
      const seatB = Math.min(35, seatA + 1);

      const existing = desksMap[deskId];
      const nextDeskState: ConcentrationDeskPairState = {
        deskId,
        deskNumber,
        seatA,
        nameA: updates.nameA || existing?.nameA || `#${seatA}`,
        scoreA: updates.scoreA,
        seatB,
        nameB: updates.nameB || existing?.nameB || `#${seatB}`,
        scoreB: updates.scoreB,
        pairsCompleted: updates.pairsCompleted,
        totalPairs: updates.totalPairs,
        isFinished: updates.isFinished,
        finishedAt: updates.isFinished
          ? existing?.finishedAt || now
          : null,
        rematchCount: updates.rematchCount ?? existing?.rematchCount ?? 0,
        currentTurn: updates.currentTurn,
        updatedAt: now,
      };

      setDesksMap((prev) => ({
        ...prev,
        [deskId]: nextDeskState,
      }));

      if (roomCode) {
        await safeUpdate(
          `/concentration_rooms/${roomCode}/pairs/${deskId}`,
          nextDeskState
        );
      }

      return nextDeskState;
    },
    [desksMap, roomCode]
  );

  return {
    roomCode,
    setRoomCode,
    roomMeta,
    desksMap,
    stats,
    isConnected,
    createTournamentRoom,
    reportPairProgress,
  };
}