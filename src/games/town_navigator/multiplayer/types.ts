export type TownPhase = 'BRIEFING' | 'ACTIVE' | 'ROUND_REVEAL' | 'GAME_OVER';

export type TownDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

export type TownCameraMode = 'OVERVIEW' | 'MYSTERY_SKY' | 'FOLLOW_LEADER';

export interface TownGameSettings {
  totalRounds: number;
  briefingSec: number;
  roundDurationSec: number;
  graceDurationSec: number;
  difficulty: TownDifficulty;
  showJapaneseHints: boolean;
  showStepChecklist: boolean;
  tvRenderMode: '3D' | '2D';
  defaultStudentMode: '3D' | '2D';
  tvCameraMode: TownCameraMode;
}

export const DEFAULT_TOWN_SETTINGS: TownGameSettings = {
  totalRounds: 5,
  briefingSec: 8,
  roundDurationSec: 45,
  graceDurationSec: 10,
  difficulty: 'MEDIUM',
  showJapaneseHints: true,
  showStepChecklist: true,
  tvRenderMode: '3D',
  defaultStudentMode: '3D',
  tvCameraMode: 'OVERVIEW',
};

export interface TownPodiumEntry {
  place: 1 | 2 | 3;
  playerId: string;
  nickname: string;
  attendanceNumber?: number;
  avatarColor: string;
  finishMs: number;
  bonusPts: number;
}

export interface TownRoundScoreEntry {
  playerId: string;
  nickname: string;
  attendanceNumber?: number;
  avatarColor: string;
  distanceMeters: number;
  distancePts: number;
  podiumPlace?: 1 | 2 | 3;
  bonusPts: number;
  roundPts: number;
  totalPts: number;
  finishMs?: number;
}

export interface TownRevealedTarget {
  id: string;
  nameEn: string;
  nameJa: string;
  worldPos: [number, number, number];
  entrancePos: [number, number, number];
  optimalPath: Array<{ x: number; z: number }>;
}

/**
 * Synced to `rooms/{code}/townState/currentRound`.
 * Target building identity & coordinates are intentionally omitted during BRIEFING and ACTIVE
 * to prevent client-side inspection cheating, and populated only on ROUND_REVEAL.
 */
export interface TownRoundState {
  roundIndex: number;
  startBuildingId: string;
  startNameEn: string;
  startNameJa: string;
  spawnPos: [number, number];
  spawnHeading: number;
  stepsEn: string[];
  stepsJa: string[];
  briefingEndsAt: number;
  raceStartedAt: number;
  raceEndsAt: number;
  graceEndsAt?: number;
  podium: TownPodiumEntry[];
  revealedTarget?: TownRevealedTarget;
  roundScores?: TownRoundScoreEntry[];
}

export interface TownRoomState {
  townSeed: number;
  phase: TownPhase;
  roundIndex: number;
  totalRounds: number;
  settings: TownGameSettings;
  currentRound?: TownRoundState;
  updatedAt: number;
}

/**
 * Student telemetry written at 5 Hz to `roomResponses/{code}/{playerId}`.
 */
export interface TownPlayerTelemetry {
  x: number;
  z: number;
  yaw: number;
  updatedAt: number;
  /** Set when the student taps the explicit "I'm here!" check-in button */
  checkInBuildingId?: string;
  checkInAt?: number;
}

/** Compact tuple: [x, z, yaw, elapsedMs] */
export type TownReplayFrame = [number, number, number, number];

export interface TownReplayTrack {
  playerId: string;
  nickname: string;
  color: string;
  attendanceNumber?: number;
  podiumPlace?: 1 | 2 | 3;
  frames: TownReplayFrame[];
}

/**
 * Host-local RAM recording of all players in a round (zero extra RTDB writes).
 */
export interface TownReplayRecording {
  roundIndex: number;
  durationMs: number;
  goldPlayerId?: string;
  goldFinishMs?: number;
  silverFinishMs?: number;
  /** True only when 2nd place finishes within 1.5s of 1st place */
  isPhotoFinish: boolean;
  tracks: TownReplayTrack[];
}

/**
 * Host-only secret round plan (never written to RTDB until ROUND_REVEAL).
 */
export interface HostSecretRoundPlan {
  roundIndex: number;
  startBuildingId: string;
  startNameEn: string;
  startNameJa: string;
  targetBuildingId: string;
  targetNameEn: string;
  targetNameJa: string;
  targetWorldPos: [number, number, number];
  targetEntrancePos: [number, number, number];
  spawnPos: [number, number];
  spawnHeading: number;
  optimalPath: Array<{ x: number; z: number }>;
  stepsEn: string[];
  stepsJa: string[];
  turnCount: number;
  totalPathMeters: number;
}
