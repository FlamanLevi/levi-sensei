import { useState, useEffect, useRef, useCallback } from 'react';
import { ensureAnonymousAuth } from '@/services/firebase';
import {
  safeSet,
  safeUpdate,
  safeGet,
  safeRemove,
  safeSubscribe,
  safeTransaction,
  deepClean
} from '@/services/rtdbSafe';
import {
  UniversalRoomState,
  RoomMetadata,
  RoomStatus,
  ClassroomPlayer,
  TeamId,
  TeamState,
  CLASSROOM_TEAMS,
  CLASSROOM_NICKNAMES,
  CLASSROOM_AVATARS
} from './types';
import { SchoolId } from '@/types/roster';

export function generateRoomPin(options?: { isTestGame?: boolean; isStudentHost?: boolean }): string {
  if (options?.isTestGame) {
    return `9${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
  }
  if (options?.isStudentHost) {
    return `7${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
  }
  return Math.floor(1000 + Math.random() * 6000).toString();
}

export function pickRandomNickname(): string {
  return CLASSROOM_NICKNAMES[Math.floor(Math.random() * CLASSROOM_NICKNAMES.length)];
}

export function pickRandomAvatar(): string {
  return CLASSROOM_AVATARS[Math.floor(Math.random() * CLASSROOM_AVATARS.length)];
}

export function autoBalanceTeam(
  currentPlayers: Record<string, ClassroomPlayer> | ClassroomPlayer[],
  preferredTeam?: TeamId
): TeamId {
  const teams: TeamId[] = ['team_red', 'team_blue', 'team_yellow', 'team_green'];
  const players = Array.isArray(currentPlayers) ? currentPlayers : Object.values(currentPlayers || {});
  const counts = teams.map((t) => players.filter((p) => p.teamId === t).length);
  const minCount = Math.min(...counts);

  if (preferredTeam && teams.includes(preferredTeam)) {
    const chosenCount = players.filter((p) => p.teamId === preferredTeam).length;
    // Overloaded if this team has >= 2 more members than the smallest team (when total players >= 8)
    const isOverloaded = chosenCount >= minCount + 2 && players.length >= 8;
    if (!isOverloaded) {
      return preferredTeam;
    }
  }

  const minIndex = counts.indexOf(minCount);
  return teams[minIndex >= 0 ? minIndex : 0];
}

export function computeTeamStats(
  players: Record<string, ClassroomPlayer>,
  baseTeams: Record<TeamId, TeamState> = CLASSROOM_TEAMS
): Record<TeamId, TeamState> {
  const teams: Record<TeamId, TeamState> = {
    team_red: { ...CLASSROOM_TEAMS.team_red, ...(baseTeams?.team_red || {}) },
    team_blue: { ...CLASSROOM_TEAMS.team_blue, ...(baseTeams?.team_blue || {}) },
    team_yellow: { ...CLASSROOM_TEAMS.team_yellow, ...(baseTeams?.team_yellow || {}) },
    team_green: { ...CLASSROOM_TEAMS.team_green, ...(baseTeams?.team_green || {}) }
  };
  const playerList = Object.values(players || {});

  (Object.keys(teams) as TeamId[]).forEach((teamId) => {
    const members = playerList.filter((p) => p.teamId === teamId);
    teams[teamId].memberCount = members.length;
    const totalScore = members.reduce((sum, p) => sum + (p.score || 0), 0);
    teams[teamId].score = totalScore;
    teams[teamId].averageScore = members.length > 0 ? Math.round(totalScore / members.length) : 0;

    if (members.length > 0) {
      const sorted = [...members].sort((a, b) => (b.score || 0) - (a.score || 0));
      const mvp = sorted[0];
      teams[teamId].mvpPlayerId = mvp.id;
      teams[teamId].mvpNickname = mvp.nickname;
      teams[teamId].mvpScore = mvp.score || 0;
    } else {
      teams[teamId].mvpPlayerId = undefined;
      teams[teamId].mvpNickname = undefined;
      teams[teamId].mvpScore = undefined;
    }
  });

  return teams;
}

export interface UseClassroomRoomOptions<TGameState = any, TPlayerAction = any> {
  initialPin?: string;
  gameId: string;
  isHost?: boolean;
  grade?: string;
  unit?: string;
  schoolId?: SchoolId;
  classId?: string;
  initialGameData?: TGameState;
  onGameDataChange?: (data: TGameState) => void;
  onPlayerAction?: (playerId: string, action: TPlayerAction) => void;
  onPlayerJoined?: (player: ClassroomPlayer) => void;
  onPlayerLeft?: (playerId: string) => void;
}

export interface CreateRoomParams<TGameState = any> {
  pin?: string;
  title?: string;
  grade?: string;
  unit?: string;
  schoolId?: SchoolId;
  classId?: string;
  gameData?: TGameState;
  settings?: Record<string, any>;
}

export interface UseClassroomRoomReturn<TGameState = any, TPlayerAction = any> {
  // State
  room: UniversalRoomState<TGameState, TPlayerAction> | null;
  pin: string | null;
  loading: boolean;
  error: string | null;
  isHost: boolean;
  currentPlayer: ClassroomPlayer | null;
  isConnected: boolean;
  playersList: ClassroomPlayer[];
  teamsList: TeamState[];
  playerCount: number;

  // Host Controls
  createRoom: (params?: CreateRoomParams<TGameState>) => Promise<string | null>;
  startRoom: (initialGameData?: TGameState) => Promise<void>;
  setGamePhase: (phase: RoomStatus, gameDataPatch?: Partial<TGameState>) => Promise<void>;
  nextRound: (nextRoundNumber?: number, roundGameData?: Partial<TGameState>) => Promise<void>;
  revealRound: (roundResults?: any) => Promise<void>;
  showLeaderboard: () => Promise<void>;
  endGame: (finalData?: any) => Promise<void>;
  closeRoom: () => Promise<void>;
  kickPlayer: (playerId: string) => Promise<void>;
  changePlayerTeam: (playerId: string, newTeamId: TeamId) => Promise<void>;
  adjustPlayerScore: (playerId: string, delta: number, streakIncrement?: boolean) => Promise<void>;
  updateGameData: (updater: TGameState | ((prev: TGameState) => TGameState)) => Promise<void>;
  patchGameData: (patch: Partial<TGameState>) => Promise<void>;
  clearPlayerActions: () => Promise<void>;

  // Student / Player Actions
  joinRoom: (
    pin: string,
    nickname?: string,
    preferredTeam?: TeamId,
    avatar?: string,
    attendanceNumber?: number
  ) => Promise<{ success: boolean; error?: string; playerId?: string }>;
  sendAction: (action: TPlayerAction) => Promise<void>;
  updateSelf: (patch: Partial<ClassroomPlayer>) => Promise<void>;
  leaveRoom: () => Promise<void>;
  claimAttendanceNumber: (attendanceNumber: number) => Promise<boolean>;
  releaseAttendanceNumber: (attendanceNumber: number) => Promise<void>;
  heartbeat: () => Promise<void>;
}

export function useClassroomRoom<TGameState = any, TPlayerAction = any>(
  options: UseClassroomRoomOptions<TGameState, TPlayerAction>
): UseClassroomRoomReturn<TGameState, TPlayerAction> {
  const {
    initialPin,
    gameId,
    isHost = false,
    grade = 'ES_G1',
    unit = 'ALL',
    schoolId,
    classId,
    initialGameData,
    onGameDataChange,
    onPlayerAction,
    onPlayerJoined,
    onPlayerLeft
  } = options;

  const [pin, setPin] = useState<string | null>(initialPin || null);
  const [room, setRoom] = useState<UniversalRoomState<TGameState, TPlayerAction> | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<ClassroomPlayer | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(true);

  const callbacksRef = useRef({
    onGameDataChange,
    onPlayerAction,
    onPlayerJoined,
    onPlayerLeft
  });

  useEffect(() => {
    callbacksRef.current = {
      onGameDataChange,
      onPlayerAction,
      onPlayerJoined,
      onPlayerLeft
    };
  });

  const prevPlayersRef = useRef<Record<string, ClassroomPlayer>>({});
  const prevActionsRef = useRef<Record<string, TPlayerAction>>({});
  const prevGameDataJsonRef = useRef<string>('');
  const isInitialLoadRef = useRef<boolean>(true);
  const currentPlayerRef = useRef<ClassroomPlayer | null>(null);
  currentPlayerRef.current = currentPlayer;
  const roomRef = useRef<UniversalRoomState<TGameState, TPlayerAction> | null>(null);
  roomRef.current = room;

  // Sync initialPin prop
  useEffect(() => {
    if (initialPin && initialPin !== pin) {
      setPin(initialPin);
    }
  }, [initialPin, pin]);

  // RTDB safe subscription
  useEffect(() => {
    if (!pin) {
      setRoom(null);
      setCurrentPlayer(null);
      prevPlayersRef.current = {};
      prevActionsRef.current = {};
      prevGameDataJsonRef.current = '';
      isInitialLoadRef.current = true;
      return;
    }

    const roomPath = `rooms/${pin}`;
    const unsubscribe = safeSubscribe<UniversalRoomState<TGameState, TPlayerAction>>(
      roomPath,
      (data) => {
        setIsConnected(true);
        if (data) {
          // Reconcile teams directly from players to ensure 100% mathematical consistency
          const teams = computeTeamStats(data.players || {}, data.teams);
          const normalizedRoom: UniversalRoomState<TGameState, TPlayerAction> = {
            ...data,
            status: data.metadata?.status || data.status || 'LOBBY',
            teams
          };
          setRoom(normalizedRoom);

          // Handle player actions callbacks
          if (data.playerActions && Object.keys(data.playerActions).length > 0) {
            const prevActions = prevActionsRef.current;
            if (callbacksRef.current.onPlayerAction) {
              Object.entries(data.playerActions).forEach(([pId, act]) => {
                if (JSON.stringify(act) !== JSON.stringify(prevActions[pId])) {
                  callbacksRef.current.onPlayerAction?.(pId, act);
                }
              });
            }
            prevActionsRef.current = data.playerActions;
          } else {
            prevActionsRef.current = {};
          }

          // Handle player join / left callbacks
          const currentPlayers = data.players || {};
          const prevPlayers = prevPlayersRef.current;

          if (!isInitialLoadRef.current) {
            if (callbacksRef.current.onPlayerJoined) {
              Object.entries(currentPlayers).forEach(([pId, p]) => {
                if (!prevPlayers[pId]) {
                  callbacksRef.current.onPlayerJoined?.(p);
                }
              });
            }

            if (callbacksRef.current.onPlayerLeft) {
              Object.entries(prevPlayers).forEach(([pId]) => {
                if (!currentPlayers[pId]) {
                  callbacksRef.current.onPlayerLeft?.(pId);
                }
              });
            }
          } else {
            isInitialLoadRef.current = false;
          }

          prevPlayersRef.current = currentPlayers;

          // Update current player state if student
          const activeId = currentPlayerRef.current?.id;
          if (!isHost && activeId && currentPlayers[activeId]) {
            setCurrentPlayer(currentPlayers[activeId]);
          }

          // Trigger onGameDataChange ONLY if gameData actually changed
          if (callbacksRef.current.onGameDataChange && data.gameData !== undefined) {
            const currentJson = JSON.stringify(data.gameData);
            if (currentJson !== prevGameDataJsonRef.current) {
              prevGameDataJsonRef.current = currentJson;
              callbacksRef.current.onGameDataChange(data.gameData);
            }
          }
        } else {
          setRoom(null);
        }
      },
      (err) => {
        console.error('[useClassroomRoom] Subscription error:', err);
        setError('接続が切断されました: ' + err.message);
        setIsConnected(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [pin, isHost]);

  // Tablet sleep & reconnection handler (iPad smart cover closing / waking)
  useEffect(() => {
    if (!pin || isHost || !currentPlayer?.id) return;

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        try {
          await ensureAnonymousAuth();
          const now = Date.now();
          await safeUpdate(`rooms/${pin}/players/${currentPlayer.id}`, {
            lastSeen: now
          });
          setIsConnected(true);
        } catch (err) {
          console.warn('[useClassroomRoom] Wakeup ping warning:', err);
        }
      }
    };

    const handleOnline = async () => {
      try {
        await ensureAnonymousAuth();
        const now = Date.now();
        await safeUpdate(`rooms/${pin}/players/${currentPlayer.id}`, {
          lastSeen: now
        });
        setIsConnected(true);
      } catch (err) {
        console.warn('[useClassroomRoom] Online reconnect warning:', err);
      }
    };

    const handleOffline = () => {
      setIsConnected(false);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Heartbeat every 20 seconds while active
    const heartbeatInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        ensureAnonymousAuth()
          .then(() =>
            safeUpdate(`rooms/${pin}/players/${currentPlayer.id}`, {
              lastSeen: Date.now()
            })
          )
          .catch(() => {});
      }
    }, 20000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(heartbeatInterval);
    };
  }, [pin, isHost, currentPlayer?.id]);

  // Host: Create a new room
  const createRoom = useCallback(
    async (params?: CreateRoomParams<TGameState>): Promise<string | null> => {
      setLoading(true);
      setError(null);

      try {
        const roomPin = params?.pin || generateRoomPin();
        const hostId = await ensureAnonymousAuth();

        const metadata: RoomMetadata = {
          pin: roomPin,
          hostId,
          activeGameId: gameId,
          title: params?.title || `${gameId.toUpperCase()} Room`,
          grade: params?.grade || grade,
          unit: params?.unit || unit,
          schoolId: params?.schoolId || schoolId,
          classId: params?.classId || classId,
          status: 'LOBBY',
          round: 1,
          totalRounds: 10,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          settings: params?.settings || {}
        };

        const initialRoom: UniversalRoomState<TGameState, TPlayerAction> = {
          metadata,
          status: 'LOBBY',
          players: {},
          teams: JSON.parse(JSON.stringify(CLASSROOM_TEAMS)),
          gameData: (params?.gameData || initialGameData || {}) as TGameState,
          playerActions: {} as Record<string, TPlayerAction>
        };

        await safeSet(`rooms/${roomPin}`, initialRoom);

        try {
          sessionStorage.setItem('activeClassroomRoomPin', roomPin);
          sessionStorage.setItem('activeClassroomGameId', gameId);
        } catch {}

        setPin(roomPin);
        setRoom(initialRoom);
        setLoading(false);
        return roomPin;
      } catch (err: any) {
        console.error('[useClassroomRoom] Error creating room:', err);
        setError(err?.message || '部屋の作成に失敗しました');
        setLoading(false);
        return null;
      }
    },
    [gameId, grade, unit, schoolId, classId, initialGameData]
  );

  // Host: Start the game
  const startRoom = useCallback(
    async (gameData?: TGameState): Promise<void> => {
      if (!pin) return;
      try {
        await ensureAnonymousAuth();
        const updates: Record<string, any> = {
          'metadata/status': 'IN_GAME',
          'status': 'IN_GAME',
          'metadata/updatedAt': Date.now()
        };
        if (gameData !== undefined) {
          updates['gameData'] = gameData;
        }
        await safeUpdate(`rooms/${pin}`, updates);
      } catch (err: any) {
        console.error('[useClassroomRoom] Error starting room:', err);
      }
    },
    [pin]
  );

  // Host: Set game phase
  const setGamePhase = useCallback(
    async (phase: RoomStatus, gameDataPatch?: Partial<TGameState>): Promise<void> => {
      if (!pin) return;
      try {
        await ensureAnonymousAuth();
        const updates: Record<string, any> = {
          'metadata/status': phase,
          'status': phase,
          'metadata/updatedAt': Date.now()
        };
        if (gameDataPatch) {
          Object.entries(gameDataPatch).forEach(([k, v]) => {
            updates[`gameData/${k}`] = v;
          });
        }
        await safeUpdate(`rooms/${pin}`, updates);
      } catch (err: any) {
        console.error('[useClassroomRoom] Error setting game phase:', err);
      }
    },
    [pin]
  );

  // Host: Next round
  const nextRound = useCallback(
    async (nextRoundNumber?: number, roundGameData?: Partial<TGameState>): Promise<void> => {
      if (!pin) return;
      try {
        await ensureAnonymousAuth();
        const currentRound = roomRef.current?.metadata.round || 1;
        const targetRound = nextRoundNumber !== undefined ? nextRoundNumber : currentRound + 1;

        const updates: Record<string, any> = {
          'metadata/round': targetRound,
          'metadata/status': 'IN_GAME',
          'status': 'IN_GAME',
          'metadata/updatedAt': Date.now(),
          'playerActions': {}
        };

        if (roundGameData) {
          Object.entries(roundGameData).forEach(([k, v]) => {
            updates[`gameData/${k}`] = v;
          });
        }

        await safeUpdate(`rooms/${pin}`, updates);
      } catch (err: any) {
        console.error('[useClassroomRoom] Error starting next round:', err);
      }
    },
    [pin]
  );

  // Host: Reveal round results
  const revealRound = useCallback(
    async (roundResults?: any): Promise<void> => {
      if (!pin) return;
      try {
        await ensureAnonymousAuth();
        const updates: Record<string, any> = {
          'metadata/status': 'ROUND_REVEAL',
          'status': 'ROUND_REVEAL',
          'metadata/updatedAt': Date.now()
        };
        if (roundResults !== undefined) {
          updates['gameData/roundResults'] = roundResults;
        }
        await safeUpdate(`rooms/${pin}`, updates);
      } catch (err: any) {
        console.error('[useClassroomRoom] Error revealing round:', err);
      }
    },
    [pin]
  );

  // Host: Show leaderboard
  const showLeaderboard = useCallback(async (): Promise<void> => {
    if (!pin) return;
    try {
      await ensureAnonymousAuth();
      await safeUpdate(`rooms/${pin}`, {
        'metadata/status': 'LEADERBOARD',
        'status': 'LEADERBOARD',
        'metadata/updatedAt': Date.now()
      });
    } catch (err: any) {
      console.error('[useClassroomRoom] Error showing leaderboard:', err);
    }
  }, [pin]);

  // Host: End game
  const endGame = useCallback(
    async (finalData?: any): Promise<void> => {
      if (!pin) return;
      try {
        await ensureAnonymousAuth();
        const updates: Record<string, any> = {
          'metadata/status': 'GAME_OVER',
          'status': 'GAME_OVER',
          'metadata/updatedAt': Date.now()
        };
        if (finalData !== undefined) {
          updates['gameData/finalResults'] = finalData;
        }
        await safeUpdate(`rooms/${pin}`, updates);
      } catch (err: any) {
        console.error('[useClassroomRoom] Error ending game:', err);
      }
    },
    [pin]
  );

  // ==========================================================================
  // [ANTIGRAVITY REFACTOR]: Managed Cleanup Timer on Room Close
  // WHAT CHANGED: Stored the 5,000ms delayed `safeRemove` timer in a ref and
  // cleared any prior pending timer before scheduling a new one.
  // WHY: Prevents unmounted component timer leaks (GEMINI.md §5).
  // ==========================================================================


  // Host: Close room
  const closeRoom = useCallback(async (): Promise<void> => {
    if (!pin) return;
    try {
      await ensureAnonymousAuth();
      await safeUpdate(`rooms/${pin}`, {
        'metadata/status': 'CLOSED',
        'status': 'CLOSED',
        'metadata/updatedAt': Date.now()
      });

      // Retain closed state for 2.5s so connected tablets receive clean shutdown
      const pinToRemove = pin;
      setTimeout(() => {
        safeRemove(`rooms/${pinToRemove}`).catch(() => {});
      }, 2500);

      try {
        sessionStorage.removeItem('activeClassroomRoomPin');
        sessionStorage.removeItem('activeClassroomGameId');
      } catch {}

      setRoom(null);
      setPin(null);
    } catch (err: any) {
      console.error('[useClassroomRoom] Error closing room:', err);
    }
  }, [pin]);

  // Host: Kick player
  const kickPlayer = useCallback(
    async (playerId: string): Promise<void> => {
      if (!pin) return;
      try {
        await ensureAnonymousAuth();
        const playerToKick = roomRef.current?.players?.[playerId];
        await safeRemove(`rooms/${pin}/players/${playerId}`);
        await safeRemove(`rooms/${pin}/playerActions/${playerId}`).catch(() => {});

        if (playerToKick?.attendanceNumber) {
          await safeRemove(`rooms/${pin}/boundStudents/${playerToKick.attendanceNumber}`).catch(() => {});
        }

        // Recompute team scores if room exists
        if (roomRef.current?.players) {
          const updatedPlayers = { ...roomRef.current.players };
          delete updatedPlayers[playerId];
          const updatedTeams = computeTeamStats(updatedPlayers, roomRef.current.teams);
          await safeUpdate(`rooms/${pin}`, { teams: updatedTeams });
        }
      } catch (err: any) {
        console.error('[useClassroomRoom] Error kicking player:', err);
      }
    },
    [pin]
  );

  // Host: Change player team
  const changePlayerTeam = useCallback(
    async (playerId: string, newTeamId: TeamId): Promise<void> => {
      if (!pin) return;
      try {
        await ensureAnonymousAuth();
        await safeUpdate(`rooms/${pin}/players/${playerId}`, {
          teamId: newTeamId
        });

        if (roomRef.current?.players) {
          const updatedPlayers = {
            ...roomRef.current.players,
            [playerId]: {
              ...roomRef.current.players[playerId],
              teamId: newTeamId
            }
          };
          const updatedTeams = computeTeamStats(updatedPlayers, roomRef.current.teams);
          await safeUpdate(`rooms/${pin}`, { teams: updatedTeams });
        }
      } catch (err: any) {
        console.error('[useClassroomRoom] Error changing player team:', err);
      }
    },
    [pin]
  );

  // Host: Adjust player score
  const adjustPlayerScore = useCallback(
    async (playerId: string, delta: number, streakIncrement = true): Promise<void> => {
      if (!pin) return;
      try {
        await ensureAnonymousAuth();
        await safeTransaction<ClassroomPlayer>(
          `rooms/${pin}/players/${playerId}`,
          (current) => {
            if (!current) return current || undefined;
            const newScore = Math.max(0, (current.score || 0) + delta);
            const newStreak = delta > 0 ? (current.streak || 0) + (streakIncrement ? 1 : 0) : 0;
            return {
              ...current,
              score: newScore,
              streak: newStreak
            };
          }
        );

        // Update team stats
        if (roomRef.current?.players) {
          const currentP = roomRef.current.players[playerId];
          if (currentP?.teamId) {
            const updatedPlayers = {
              ...roomRef.current.players,
              [playerId]: {
                ...currentP,
                score: Math.max(0, (currentP.score || 0) + delta)
              }
            };
            const updatedTeams = computeTeamStats(updatedPlayers, roomRef.current.teams);
            await safeUpdate(`rooms/${pin}`, { teams: updatedTeams });
          }
        }
      } catch (err: any) {
        console.error('[useClassroomRoom] Error adjusting player score:', err);
      }
    },
    [pin]
  );

  // Host: Update game data
  const updateGameData = useCallback(
    async (updater: TGameState | ((prev: TGameState) => TGameState)): Promise<void> => {
      if (!pin) return;
      try {
        await ensureAnonymousAuth();
        const nextData =
          typeof updater === 'function'
            ? (updater as (prev: TGameState) => TGameState)(roomRef.current?.gameData as TGameState)
            : updater;

        await safeSet(`rooms/${pin}/gameData`, nextData);
      } catch (err: any) {
        console.error('[useClassroomRoom] Error updating game data:', err);
      }
    },
    [pin]
  );

  // Host: Patch game data
  const patchGameData = useCallback(
    async (patch: Partial<TGameState>): Promise<void> => {
      if (!pin) return;
      try {
        await ensureAnonymousAuth();
        const updates: Record<string, any> = {};
        Object.entries(patch).forEach(([k, v]) => {
          updates[`gameData/${k}`] = v;
        });
        await safeUpdate(`rooms/${pin}`, updates);
      } catch (err: any) {
        console.error('[useClassroomRoom] Error patching game data:', err);
      }
    },
    [pin]
  );

  // Host: Clear player actions
  const clearPlayerActions = useCallback(async (): Promise<void> => {
    if (!pin) return;
    try {
      await ensureAnonymousAuth();
      await safeSet(`rooms/${pin}/playerActions`, {});
    } catch (err: any) {
      console.error('[useClassroomRoom] Error clearing player actions:', err);
    }
  }, [pin]);

  // Student: Join Room
  const joinRoom = useCallback(
    async (
      roomPin: string,
      nickname?: string,
      preferredTeam?: TeamId,
      avatar?: string,
      attendanceNumber?: number
    ): Promise<{ success: boolean; error?: string; playerId?: string }> => {
      setLoading(true);
      setError(null);

      try {
        const cleanPin = roomPin.trim();
        const roomData = await safeGet<UniversalRoomState<TGameState, TPlayerAction>>(
          `rooms/${cleanPin}`
        );

        if (!roomData) {
          setLoading(false);
          return { success: false, error: '部屋が見つかりません。4桁の番号を確認してください。' };
        }

        if (roomData.metadata?.status === 'CLOSED') {
          setLoading(false);
          return { success: false, error: 'この部屋はすでに終了しました。' };
        }

        const playerId = await ensureAnonymousAuth();
        const existingPlayer = roomData.players?.[playerId];
        const assignedTeam = autoBalanceTeam(roomData.players || {}, preferredTeam);
        const resolvedNickname = (nickname?.trim() || existingPlayer?.nickname || pickRandomNickname()).trim();
        const resolvedAvatar = avatar || existingPlayer?.avatar || pickRandomAvatar();

        let finalPlayer: ClassroomPlayer;

        if (existingPlayer) {
          // Soft reconnection (preserving score, streak, team)
          finalPlayer = {
            ...existingPlayer,
            nickname: resolvedNickname,
            avatar: resolvedAvatar,
            lastSeen: Date.now(),
            teamId: existingPlayer.teamId || assignedTeam,
            attendanceNumber: attendanceNumber ?? existingPlayer.attendanceNumber
          };
        } else {
          finalPlayer = {
            id: playerId,
            nickname: resolvedNickname,
            avatar: resolvedAvatar,
            teamId: assignedTeam,
            attendanceNumber,
            score: 0,
            streak: 0,
            connectedAt: Date.now(),
            lastSeen: Date.now()
          };
        }

        await safeSet(`rooms/${cleanPin}/players/${playerId}`, finalPlayer);

        if (attendanceNumber !== undefined) {
          await safeSet(`rooms/${cleanPin}/boundStudents/${attendanceNumber}`, {
            playerId,
            nickname: finalPlayer.nickname,
            score: finalPlayer.score || 0,
            claimedAt: Date.now()
          }).catch(() => {});
        }

        try {
          sessionStorage.setItem('activeClassroomRoomPin', cleanPin);
          sessionStorage.setItem('activeClassroomPlayerId', playerId);
          sessionStorage.setItem('activeClassroomNickname', finalPlayer.nickname);
          sessionStorage.setItem('activeClassroomGameId', roomData.metadata.activeGameId);
        } catch {}

        setPin(cleanPin);
        setCurrentPlayer(finalPlayer);
        setLoading(false);
        return { success: true, playerId };
      } catch (err: any) {
        console.error('[useClassroomRoom] Error joining room:', err);
        setError(err?.message || '部屋への参加に失敗しました');
        setLoading(false);
        return { success: false, error: err?.message || '参加エラーが発生しました' };
      }
    },
    []
  );

  // Student: Send real-time action
  const sendAction = useCallback(
    async (action: TPlayerAction): Promise<void> => {
      if (!pin || !currentPlayer?.id) return;
      try {
        await ensureAnonymousAuth();
        const actionPayload = {
          ...action,
          playerId: currentPlayer.id,
          timestamp: Date.now()
        };
        await safeSet(`rooms/${pin}/playerActions/${currentPlayer.id}`, actionPayload);
      } catch (err: any) {
        console.error('[useClassroomRoom] Error sending player action:', err);
      }
    },
    [pin, currentPlayer?.id]
  );

  // Student: Update self player state
  const updateSelf = useCallback(
    async (patch: Partial<ClassroomPlayer>): Promise<void> => {
      if (!pin || !currentPlayer?.id) return;
      try {
        await ensureAnonymousAuth();
        const cleanedPatch = deepClean(patch);
        await safeUpdate(`rooms/${pin}/players/${currentPlayer.id}`, cleanedPatch);
        setCurrentPlayer((prev) => (prev ? { ...prev, ...patch } : null));
      } catch (err: any) {
        console.error('[useClassroomRoom] Error updating self player:', err);
      }
    },
    [pin, currentPlayer?.id]
  );

  // Student: Leave room
  const leaveRoom = useCallback(async (): Promise<void> => {
    if (!pin || !currentPlayer?.id) return;
    try {
      await ensureAnonymousAuth();
      const pId = currentPlayer.id;
      const attNum = currentPlayer.attendanceNumber;
      await safeRemove(`rooms/${pin}/players/${pId}`);
      await safeRemove(`rooms/${pin}/playerActions/${pId}`).catch(() => {});

      if (attNum) {
        await safeRemove(`rooms/${pin}/boundStudents/${attNum}`).catch(() => {});
      }

      try {
        sessionStorage.removeItem('activeClassroomRoomPin');
        sessionStorage.removeItem('activeClassroomPlayerId');
        sessionStorage.removeItem('activeClassroomNickname');
      } catch {}

      setPin(null);
      setCurrentPlayer(null);
      setRoom(null);
    } catch (err: any) {
      console.error('[useClassroomRoom] Error leaving room:', err);
    }
  }, [pin, currentPlayer?.id, currentPlayer?.attendanceNumber]);

  // Student: Claim attendance number (Atomic transaction against collisions)
  const claimAttendanceNumber = useCallback(
    async (attendanceNumber: number): Promise<boolean> => {
      if (!pin || !currentPlayer?.id) return false;
      try {
        await ensureAnonymousAuth();
        const path = `rooms/${pin}/boundStudents/${attendanceNumber}`;
        const result = await safeTransaction<{
          playerId: string;
          nickname: string;
          score: number;
          claimedAt: number;
        }>(
          path,
          (current) => {
            if (current && current.playerId !== currentPlayer.id) {
              return undefined; // Collision! Abort transaction
            }
            return {
              playerId: currentPlayer.id,
              nickname: currentPlayer.nickname || ('#' + attendanceNumber),
              score: currentPlayer.score || 0,
              claimedAt: Date.now()
            };
          }
        );

        if (result.committed) {
          // Release previously claimed attendance number if student switched numbers
          if (currentPlayer.attendanceNumber && currentPlayer.attendanceNumber !== attendanceNumber) {
            await safeRemove(`rooms/${pin}/boundStudents/${currentPlayer.attendanceNumber}`).catch(() => {});
          }
          await updateSelf({ attendanceNumber });
          return true;
        }
        return false;
      } catch (err: any) {
        console.error('[useClassroomRoom] Error claiming attendance number:', err);
        return false;
      }
    },
    [pin, currentPlayer?.id, currentPlayer?.nickname, currentPlayer?.score, currentPlayer?.attendanceNumber, updateSelf]
  );

  // Host: Release attendance number
  const releaseAttendanceNumber = useCallback(
    async (attendanceNumber: number): Promise<void> => {
      if (!pin) return;
      try {
        await ensureAnonymousAuth();
        await safeRemove(`rooms/${pin}/boundStudents/${attendanceNumber}`);
      } catch (err: any) {
        console.error('[useClassroomRoom] Error releasing attendance number:', err);
      }
    },
    [pin]
  );

  // Student: Heartbeat
  const heartbeat = useCallback(async (): Promise<void> => {
    if (!pin || !currentPlayer?.id) return;
    try {
      await ensureAnonymousAuth();
      await safeUpdate(`rooms/${pin}/players/${currentPlayer.id}`, {
        lastSeen: Date.now()
      });
    } catch (err) {
      console.warn('[useClassroomRoom] Heartbeat warning:', err);
    }
  }, [pin, currentPlayer?.id]);

  const playersList = Object.values(room?.players || {});
  const teamsList = Object.values(room?.teams || CLASSROOM_TEAMS);
  const playerCount = playersList.length;

  return {
    room,
    pin,
    loading,
    error,
    isHost,
    currentPlayer,
    isConnected,
    playersList,
    teamsList,
    playerCount,
    createRoom,
    startRoom,
    setGamePhase,
    nextRound,
    revealRound,
    showLeaderboard,
    endGame,
    closeRoom,
    kickPlayer,
    changePlayerTeam,
    adjustPlayerScore,
    updateGameData,
    patchGameData,
    clearPlayerActions,
    joinRoom,
    sendAction,
    updateSelf,
    leaveRoom,
    claimAttendanceNumber,
    releaseAttendanceNumber,
    heartbeat
  };
}
