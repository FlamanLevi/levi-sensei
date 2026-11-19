import { useState, useEffect, useRef, useCallback } from 'react';
import { ensureAnonymousAuth } from '@/services/firebase';
import {
  getServerTime,
  safeConfigureOnDisconnectUpdate,
  safeGet,
  safeRemove,
  safeSet,
  safeSubscribe,
  safeUpdate,
} from '@/services/rtdbSafe';
import type { QuizRoomState, QuizPlayer } from '../../quiz/types';
import type { SchoolId } from '@/types/roster';
import { generateTownLayout, TownLayout } from '../townGenerator';
import {
  buildRaceRoundPlan,
  CHECK_IN_RADIUS_METERS,
  computeDistanceToBuilding,
  computeRoundScore,
  isPhotoFinish,
  PODIUM_BONUSES,
  sortRoundScores,
} from './roundBuilder';
import {
  DEFAULT_TOWN_SETTINGS,
  HostSecretRoundPlan,
  TownGameSettings,
  TownPlayerTelemetry,
  TownPodiumEntry,
  TownReplayFrame,
  TownReplayRecording,
  TownRoomState,
  TownRoundScoreEntry,
  TownRoundState,
} from './types';

export const AVATAR_PALETTE = [
  '#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4',
  '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#14b8a6',
];

export function getPlayerColor(playerId: string, attendanceNumber?: number): string {
  if (attendanceNumber != null) {
    return AVATAR_PALETTE[Math.abs(attendanceNumber) % AVATAR_PALETTE.length];
  }
  let hash = 0;
  for (let i = 0; i < playerId.length; i++) {
    hash = (hash * 31 + playerId.charCodeAt(i)) | 0;
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

function generateRoomCode(): string {
  return Math.floor(1000 + Math.random() * 6000).toString();
}

export interface UseTownRoomOptions {
  role: 'HOST' | 'STUDENT';
  roomCode?: string | null;
  playerId?: string | null;
  schoolId?: SchoolId;
  classId?: string;
}

export function useTownRoom({
  role,
  roomCode: initialRoomCode = null,
  playerId = null,
  schoolId = 'futakotamagawa',
  classId,
}: UseTownRoomOptions) {
  const [roomCode, setRoomCode] = useState<string | null>(initialRoomCode);
  const [room, setRoom] = useState<QuizRoomState | null>(null);
  const [townState, setTownState] = useState<TownRoomState | null>(null);
  const [players, setPlayers] = useState<Record<string, QuizPlayer>>({});
  const [telemetry, setTelemetry] = useState<Record<string, TownPlayerTelemetry>>({});
  const [layout, setLayout] = useState<TownLayout | null>(null);
  const [replayRecording, setReplayRecording] = useState<TownReplayRecording | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Host-only refs (secret target + RAM replay recorder + bot simulator)
  const secretPlanRef = useRef<HostSecretRoundPlan | null>(null);
  const usedTargetsRef = useRef<Set<string>>(new Set());
  const tracksMapRef = useRef<Map<string, TownReplayFrame[]>>(new Map());
  const podiumRef = useRef<TownPodiumEntry[]>([]);
  const graceTimerStartedRef = useRef(false);
  const finishingRoundRef = useRef(false);
  const lastTelemetryPushRef = useRef(0);
  const botIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (initialRoomCode && initialRoomCode !== roomCode) {
      setRoomCode(initialRoomCode);
    }
  }, [initialRoomCode, roomCode]);

  useEffect(() => {
    if (!townState?.townSeed) return;
    const nextLayout = generateTownLayout(townState.townSeed, { schoolId });
    setLayout(nextLayout);
  }, [townState?.townSeed, schoolId]);

  // Subscribe to rooms/{code}, roomPlayers/{code}, and roomResponses/{code}
  useEffect(() => {
    if (!roomCode) return;

    const unsubRoom = safeSubscribe<QuizRoomState & { townState?: TownRoomState }>(
      `rooms/${roomCode}`,
      (val) => {
        if (!val) {
          setRoom(null);
          setTownState(null);
          return;
        }
        setRoom(val);
        if (val.townState) {
          setTownState(val.townState);
        }
      }
    );

    const unsubPlayers = safeSubscribe<Record<string, QuizPlayer>>(
      `roomPlayers/${roomCode}`,
      (val) => setPlayers(val ?? {})
    );

    const unsubResponses = safeSubscribe<Record<string, TownPlayerTelemetry>>(
      `roomResponses/${roomCode}`,
      (val) => setTelemetry(val ?? {})
    );

    return () => {
      unsubRoom();
      unsubPlayers();
      unsubResponses();
    };
  }, [roomCode]);

  // HOST: Create a new Stream B Town Navigator room
  const createRoom = useCallback(
    async (settings: TownGameSettings = DEFAULT_TOWN_SETTINGS) => {
      setIsCreating(true);
      try {
        const hostId = await ensureAnonymousAuth();
        const code = generateRoomCode();
        const now = getServerTime();
        const townSeed = Math.floor(Math.random() * 900000) + 100000;

        const initialTownState: TownRoomState = {
          townSeed,
          phase: 'BRIEFING',
          roundIndex: 0,
          totalRounds: settings.totalRounds,
          settings,
          updatedAt: now,
        };

        const roomData: Record<string, unknown> = {
          code,
          roomCode: code,
          hostId,
          status: 'LOBBY',
          gamePlayType: 'TOWN_NAVIGATOR',
          subject: 'ENGLISH',
          schoolId,
          classId: classId || null,
          createdAt: now,
          updatedAt: now,
          townState: initialTownState,
          settings: {
            gamePlayType: 'TOWN_NAVIGATOR',
            gameMode: 'INDIVIDUAL',
            questionCount: settings.totalRounds,
          },
        };

        await safeSet(`rooms/${code}`, roomData);
        await safeConfigureOnDisconnectUpdate(`rooms/${code}`, { status: 'CLOSED' });

        // Publish active classroom room pointer for Zero-PIN Auto-SSO (non-blocking)
        if (schoolId && classId) {
          const pointer = {
            pin: code,
            roomCode: code,
            gamePlayType: 'TOWN_NAVIGATOR',
            hostId,
            updatedAt: now,
          };
          await Promise.all([
            safeSet(`schools/${schoolId}/classes/${classId}/analyticsSummary/teacherRoom`, pointer).catch(() => {}),
            safeSet(`schools/${schoolId}/classes/${classId}/analyticsSummary/activeRoom`, pointer).catch(() => {}),
          ]);
        }

        usedTargetsRef.current.clear();
        setRoomCode(code);
        return code;
      } finally {
        setIsCreating(false);
      }
    },
    [schoolId, classId]
  );

  // HOST: Update TownGameSettings in Lobby or Live
  const updateSettings = useCallback(
    async (partial: Partial<TownGameSettings>) => {
      if (!roomCode || !townState) return;
      const next: TownGameSettings = { ...townState.settings, ...partial };
      await safeUpdate(`rooms/${roomCode}/townState`, {
        settings: next,
        totalRounds: next.totalRounds,
        updatedAt: getServerTime(),
      });
    },
    [roomCode, townState]
  );

  // HOST: Start a specific round (BRIEFING -> ACTIVE)
  const startRound = useCallback(
    async (roundIndex: number) => {
      if (!roomCode || !townState || !layout) return;
      const plan = buildRaceRoundPlan(
        layout.buildingsList,
        roundIndex,
        townState.settings.difficulty,
        usedTargetsRef.current,
        townState.townSeed
      );
      usedTargetsRef.current.add(plan.targetBuildingId);
      secretPlanRef.current = plan;
      tracksMapRef.current.clear();
      podiumRef.current = [];
      graceTimerStartedRef.current = false;
      finishingRoundRef.current = false;
      setReplayRecording(null);

      await safeRemove(`roomResponses/${roomCode}`);

      const now = getServerTime();
      const briefingMs = townState.settings.briefingSec * 1000;
      const raceMs = townState.settings.roundDurationSec * 1000;

      const publicRound: TownRoundState = {
        roundIndex,
        startBuildingId: plan.startBuildingId,
        startNameEn: plan.startNameEn,
        startNameJa: plan.startNameJa,
        spawnPos: plan.spawnPos,
        spawnHeading: plan.spawnHeading,
        stepsEn: plan.stepsEn,
        stepsJa: plan.stepsJa,
        briefingEndsAt: now + briefingMs,
        raceStartedAt: now + briefingMs,
        raceEndsAt: now + briefingMs + raceMs,
        podium: [],
      };

      await safeUpdate(`rooms/${roomCode}`, {
        status: 'TOWN_NAVIGATOR',
        updatedAt: now,
        'townState/phase': 'BRIEFING',
        'townState/roundIndex': roundIndex,
        'townState/currentRound': publicRound,
        'townState/updatedAt': now,
      });
    },
    [roomCode, townState, layout]
  );

  // HOST: Transition BRIEFING -> ACTIVE when countdown finishes
  const beginActiveRace = useCallback(async () => {
    if (!roomCode || !townState || townState.phase !== 'BRIEFING') return;
    const now = getServerTime();
    await safeUpdate(`rooms/${roomCode}/townState`, {
      phase: 'ACTIVE',
      updatedAt: now,
    });
  }, [roomCode, townState]);

  // HOST: Finish active round -> compute scores, freeze All-Player Replay, enter ROUND_REVEAL
  const finishRound = useCallback(async () => {
    if (!roomCode || !townState?.currentRound || !secretPlanRef.current || finishingRoundRef.current) return;
    finishingRoundRef.current = true;

    const plan = secretPlanRef.current;
    const now = getServerTime();
    const podium = [...podiumRef.current];
    const podiumByPlayer = new Map<string, TownPodiumEntry>();
    podium.forEach((p) => podiumByPlayer.set(p.playerId, p));

    const scoreEntries: TownRoundScoreEntry[] = [];
    const playerScoreUpdates: Record<string, unknown> = {};

    Object.entries(players).forEach(([pid, p], idx) => {
      const tel = telemetry[pid];
      const pod = podiumByPlayer.get(pid);
      const px = tel ? tel.x : plan.spawnPos[0];
      const pz = tel ? tel.z : plan.spawnPos[1];
      const dist = computeDistanceToBuilding(px, pz, plan.targetEntrancePos);
      const { distancePts, bonusPts, roundPts, effectiveDistance } = computeRoundScore(
        dist,
        pod?.place
      );
      const prevTotal = p.score || 0;
      const newTotal = prevTotal + roundPts;
      playerScoreUpdates[`${pid}/score`] = newTotal;

      scoreEntries.push({
        playerId: pid,
        nickname: p.nickname || `Player ${idx + 1}`,
        attendanceNumber: p.attendanceNumber,
        avatarColor: getPlayerColor(pid, p.attendanceNumber),
        distanceMeters: effectiveDistance,
        distancePts,
        podiumPlace: pod?.place,
        bonusPts,
        roundPts,
        totalPts: newTotal,
        finishMs: pod?.finishMs,
      });
    });

    const sortedScores = sortRoundScores(scoreEntries);

    const goldEntry = podium.find((p) => p.place === 1);
    const silverEntry = podium.find((p) => p.place === 2);
    const raceElapsedMs = Math.max(2000, now - townState.currentRound.raceStartedAt);
    const tracks = Object.entries(players).map(([pid, p], idx) => {
      const frames = tracksMapRef.current.get(pid) ?? [
        [plan.spawnPos[0], plan.spawnPos[1], plan.spawnHeading, 0],
      ];
      return {
        playerId: pid,
        nickname: p.nickname || `Player ${idx + 1}`,
        color: getPlayerColor(pid, p.attendanceNumber),
        attendanceNumber: p.attendanceNumber,
        podiumPlace: podiumByPlayer.get(pid)?.place,
        frames: [...frames],
      };
    });

    setReplayRecording({
      roundIndex: plan.roundIndex,
      durationMs: raceElapsedMs,
      goldPlayerId: goldEntry?.playerId ?? sortedScores[0]?.playerId,
      goldFinishMs: goldEntry?.finishMs,
      silverFinishMs: silverEntry?.finishMs,
      isPhotoFinish: isPhotoFinish(podium),
      tracks,
    });

    if (Object.keys(playerScoreUpdates).length > 0) {
      await safeUpdate(`roomPlayers/${roomCode}`, playerScoreUpdates);
    }

    await safeUpdate(`rooms/${roomCode}/townState`, {
      phase: 'ROUND_REVEAL',
      updatedAt: now,
      'currentRound/podium': podium,
      'currentRound/revealedTarget': {
        id: plan.targetBuildingId,
        nameEn: plan.targetNameEn,
        nameJa: plan.targetNameJa,
        worldPos: plan.targetWorldPos,
        entrancePos: plan.targetEntrancePos,
        optimalPath: plan.optimalPath,
      },
      'currentRound/roundScores': sortedScores,
    });
  }, [roomCode, townState, players, telemetry]);

  // HOST: Advance to next round or GAME_OVER
  const nextRoundOrFinish = useCallback(async () => {
    if (!roomCode || !townState) return;
    const nextIdx = townState.roundIndex + 1;
    if (nextIdx >= townState.totalRounds) {
      const now = getServerTime();
      await safeUpdate(`rooms/${roomCode}`, {
        status: 'GAME_OVER',
        updatedAt: now,
        'townState/phase': 'GAME_OVER',
        'townState/updatedAt': now,
      });
    } else {
      await startRound(nextIdx);
    }
  }, [roomCode, townState, startRound]);

  // HOST: Phase timer (BRIEFING -> ACTIVE, ACTIVE -> ROUND_REVEAL)
  useEffect(() => {
    if (role !== 'HOST' || !townState?.currentRound) return;
    if (townState.phase !== 'BRIEFING' && townState.phase !== 'ACTIVE') return;

    const timer = window.setInterval(() => {
      const now = getServerTime();
      const cr = townState.currentRound!;
      if (townState.phase === 'BRIEFING' && now >= cr.briefingEndsAt) {
        beginActiveRace();
      } else if (townState.phase === 'ACTIVE') {
        const deadline = cr.graceEndsAt ? Math.min(cr.raceEndsAt, cr.graceEndsAt) : cr.raceEndsAt;
        if (now >= deadline) {
          finishRound();
        }
      }
    }, 250);

    return () => window.clearInterval(timer);
  }, [role, townState, beginActiveRace, finishRound]);

  // HOST: Record 5 Hz all-player telemetry in RAM + validate explicit "I'm here!" check-ins
  useEffect(() => {
    if (role !== 'HOST' || !roomCode || townState?.phase !== 'ACTIVE' || !townState.currentRound || !secretPlanRef.current) {
      return;
    }

    const plan = secretPlanRef.current;
    const raceStartedAt = townState.currentRound.raceStartedAt;
    const now = getServerTime();
    const elapsedMs = Math.max(0, now - raceStartedAt);

    let podiumChanged = false;

    Object.entries(telemetry).forEach(([pid, tel]) => {
      let track = tracksMapRef.current.get(pid);
      if (!track) {
        track = [[plan.spawnPos[0], plan.spawnPos[1], plan.spawnHeading, 0]];
        tracksMapRef.current.set(pid, track);
      }
      const last = track[track.length - 1];
      if (!last || elapsedMs - last[3] >= 120) {
        track.push([tel.x, tel.z, tel.yaw, elapsedMs]);
      }

      if (
        tel.checkInBuildingId === plan.targetBuildingId &&
        podiumRef.current.length < 3 &&
        !podiumRef.current.some((p) => p.playerId === pid)
      ) {
        const dist = computeDistanceToBuilding(tel.x, tel.z, plan.targetEntrancePos);
        if (dist <= CHECK_IN_RADIUS_METERS + 4.0) {
          const place = (podiumRef.current.length + 1) as 1 | 2 | 3;
          const pInfo = players[pid];
          podiumRef.current.push({
            place,
            playerId: pid,
            nickname: pInfo?.nickname || 'Student',
            attendanceNumber: pInfo?.attendanceNumber,
            avatarColor: getPlayerColor(pid, pInfo?.attendanceNumber),
            finishMs: elapsedMs,
            bonusPts: PODIUM_BONUSES[place],
          });
          podiumChanged = true;
        }
      }
    });

    if (podiumChanged) {
      const updates: Record<string, unknown> = {
        'currentRound/podium': [...podiumRef.current],
        updatedAt: now,
      };
      if (podiumRef.current.length >= 3 && !graceTimerStartedRef.current) {
        graceTimerStartedRef.current = true;
        updates['currentRound/graceEndsAt'] = now + townState.settings.graceDurationSec * 1000;
      }
      safeUpdate(`rooms/${roomCode}/townState`, updates);
    }
  }, [role, roomCode, townState, telemetry, players]);

  // HOST: Bot Simulator for testing mayhem races on a single laptop
  const spawnBots = useCallback(
    async (count: number = 8) => {
      if (!roomCode) return;
      const updates: Record<string, unknown> = {};
      const botNames = ['Haruto', 'Yui', 'Sota', 'Hina', 'Ren', 'Mei', 'Kaito', 'Sakura', 'Riku', 'Aoi', 'Yuto', 'Mio'];
      for (let i = 0; i < count; i++) {
        const id = `bot_${i + 1}`;
        updates[id] = {
          id,
          nickname: botNames[i % botNames.length],
          attendanceNumber: i + 1,
          score: 0,
          streak: 0,
          isBot: true,
          joinedAt: getServerTime(),
        };
      }
      await safeUpdate(`roomPlayers/${roomCode}`, updates);
    },
    [roomCode]
  );

  // HOST: Drive bots along the road network during ACTIVE race
  useEffect(() => {
    if (role !== 'HOST' || !roomCode || townState?.phase !== 'ACTIVE' || !secretPlanRef.current) {
      if (botIntervalRef.current) {
        window.clearInterval(botIntervalRef.current);
        botIntervalRef.current = null;
      }
      return;
    }

    const botIds = Object.keys(players).filter((id) => id.startsWith('bot_'));
    if (botIds.length === 0) return;

    const plan = secretPlanRef.current;
    const path = plan.optimalPath;

    const botState = botIds.map((id, idx) => ({
      id,
      segIdx: 0,
      t: 0,
      speed: 7.5 + ((idx * 1.37) % 4.5),
      reactionDelayMs: 400 + ((idx * 317) % 1800),
      isLostBot: idx % 4 === 3,
      checkedIn: false,
      x: plan.spawnPos[0],
      z: plan.spawnPos[1],
      yaw: plan.spawnHeading,
    }));

    const startTime = performance.now();

    botIntervalRef.current = window.setInterval(() => {
      const elapsed = performance.now() - startTime;
      const now = getServerTime();
      const batch: Record<string, unknown> = {};

      for (const b of botState) {
        if (elapsed < b.reactionDelayMs) continue;

        if (b.isLostBot) {
          b.x = Math.max(-63, Math.min(63, b.x + Math.sin(b.yaw) * b.speed * 0.25));
          b.z = Math.max(-63, Math.min(63, b.z + Math.cos(b.yaw) * b.speed * 0.25));
          if (Math.abs(b.x) > 60 || Math.abs(b.z) > 60) b.yaw += Math.PI / 2;
        } else if (!b.checkedIn && b.segIdx < path.length - 1) {
          const p0 = path[b.segIdx];
          const p1 = path[b.segIdx + 1];
          const dx = p1.x - p0.x;
          const dz = p1.z - p0.z;
          const segLen = Math.max(0.5, Math.hypot(dx, dz));
          b.yaw = Math.atan2(dx, dz);
          b.t += (b.speed * 0.25) / segLen;
          if (b.t >= 1) {
            b.segIdx++;
            b.t = 0;
          }
          const cur0 = path[Math.min(b.segIdx, path.length - 1)];
          const cur1 = path[Math.min(b.segIdx + 1, path.length - 1)];
          b.x = cur0.x + (cur1.x - cur0.x) * b.t;
          b.z = cur0.z + (cur1.z - cur0.z) * b.t;

          if (b.segIdx >= path.length - 1) {
            b.checkedIn = true;
          }
        }

        batch[b.id] = {
          x: Math.round(b.x * 10) / 10,
          z: Math.round(b.z * 10) / 10,
          yaw: Math.round(b.yaw * 100) / 100,
          updatedAt: now,
          ...(b.checkedIn ? { checkInBuildingId: plan.targetBuildingId, checkInAt: now } : {}),
        };
      }

      if (Object.keys(batch).length > 0) {
        safeUpdate(`roomResponses/${roomCode}`, batch);
      }
    }, 250);

    return () => {
      if (botIntervalRef.current) {
        window.clearInterval(botIntervalRef.current);
        botIntervalRef.current = null;
      }
    };
  }, [role, roomCode, townState?.phase, players]);

  // STUDENT: Push 5 Hz throttled position telemetry
  const pushTelemetry = useCallback(
    (x: number, z: number, yaw: number) => {
      if (role !== 'STUDENT' || !roomCode || !playerId) return;
      const now = performance.now();
      if (now - lastTelemetryPushRef.current < 200) return;
      lastTelemetryPushRef.current = now;

      safeUpdate(`roomResponses/${roomCode}/${playerId}`, {
        x: Math.round(x * 10) / 10,
        z: Math.round(z * 10) / 10,
        yaw: Math.round(yaw * 100) / 100,
        updatedAt: getServerTime(),
      });
    },
    [role, roomCode, playerId]
  );

  // STUDENT: Explicit "I'm here!" check-in submission
  const submitCheckIn = useCallback(
    async (buildingId: string, x: number, z: number, yaw: number) => {
      if (role !== 'STUDENT' || !roomCode || !playerId) return;
      const now = getServerTime();
      await safeUpdate(`roomResponses/${roomCode}/${playerId}`, {
        x: Math.round(x * 10) / 10,
        z: Math.round(z * 10) / 10,
        yaw: Math.round(yaw * 100) / 100,
        checkInBuildingId: buildingId,
        checkInAt: now,
        updatedAt: now,
      });
    },
    [role, roomCode, playerId]
  );

  // HOST: Close room cleanly
  const closeRoom = useCallback(async () => {
    if (!roomCode) return;
    await safeUpdate(`rooms/${roomCode}`, {
      status: 'CLOSED',
      updatedAt: getServerTime(),
    });
    if (schoolId && classId) {
      await Promise.all([
        safeRemove(`schools/${schoolId}/classes/${classId}/analyticsSummary/teacherRoom`).catch(() => {}),
        safeRemove(`schools/${schoolId}/classes/${classId}/analyticsSummary/activeRoom`).catch(() => {}),
      ]);
    }
  }, [roomCode, schoolId, classId]);

  const refreshRoom = useCallback(async () => {
    if (!roomCode) return null;
    return safeGet<QuizRoomState>(`rooms/${roomCode}`);
  }, [roomCode]);

  return {
    roomCode,
    room,
    townState,
    players,
    telemetry,
    layout,
    replayRecording,
    isCreating,
    createRoom,
    updateSettings,
    startRound,
    beginActiveRace,
    finishRound,
    nextRoundOrFinish,
    spawnBots,
    pushTelemetry,
    submitCheckIn,
    closeRoom,
    refreshRoom,
  };
}
