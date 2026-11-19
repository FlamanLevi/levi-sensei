import type { PlacedBuilding } from '../townGenerator';
import {
  computeManhattanRoadPath,
  getBuildingRoadAccessPoint,
  buildMextStepByStepScript,
  snapToRoadCoord,
} from '../navigationLogic';
import type {
  HostSecretRoundPlan,
  TownDifficulty,
  TownPodiumEntry,
  TownRoundScoreEntry,
} from './types';

export const PODIUM_BONUSES: Record<1 | 2 | 3, number> = {
  1: 500,
  2: 300,
  3: 150,
};

/** Max distance from a building entrance (or center fallback) for explicit "I'm here!" check-in */
export const CHECK_IN_RADIUS_METERS = 10.5;

/** Max distance (meters) at which distance points drop to 0 */
export const MAX_DISTANCE_SCORE_RANGE = 95;

/** Photo-finish threshold: Silver within 1.5s of Gold */
export const PHOTO_FINISH_GAP_MS = 1500;

/**
 * Computes distance points (0–1,000 pts).
 * Finishers at 0m receive the full 1,000 pts; non-finishers decay linearly to 0 pts at MAX_DISTANCE_SCORE_RANGE.
 */
export function computeDistancePoints(
  distanceMeters: number,
  maxRangeMeters: number = MAX_DISTANCE_SCORE_RANGE
): number {
  if (!Number.isFinite(distanceMeters) || distanceMeters <= 0) return 1000;
  const clamped = Math.min(maxRangeMeters, Math.max(0, distanceMeters));
  const ratio = 1 - clamped / maxRangeMeters;
  return Math.round(ratio * 1000);
}

/**
 * Computes a student's total round score: distance points + podium speed bonus.
 * Podium finishers always receive 0m distance (1,000 distance pts) + Gold/Silver/Bronze bonus.
 */
export function computeRoundScore(
  distanceMeters: number,
  podiumPlace?: 1 | 2 | 3
): { distancePts: number; bonusPts: number; roundPts: number; effectiveDistance: number } {
  const effectiveDistance = podiumPlace ? 0 : Math.max(0, Math.round(distanceMeters * 10) / 10);
  const distancePts = computeDistancePoints(effectiveDistance);
  const bonusPts = podiumPlace ? PODIUM_BONUSES[podiumPlace] : 0;
  return {
    distancePts,
    bonusPts,
    roundPts: distancePts + bonusPts,
    effectiveDistance,
  };
}

/**
 * Returns true only when 2nd place finishes within 1.5s of 1st place (genuine photo finish).
 */
export function isPhotoFinish(podium: TownPodiumEntry[]): boolean {
  const gold = podium.find((p) => p.place === 1);
  const silver = podium.find((p) => p.place === 2);
  if (!gold || !silver) return false;
  const gap = silver.finishMs - gold.finishMs;
  return gap >= 0 && gap <= PHOTO_FINISH_GAP_MS;
}

/**
 * Finds the nearest named (tier > 0) building within `maxDist` meters of `(x, z)` for
 * explicit "I'm here!" check-in validation.
 */
export function findNearestNamedBuilding(
  x: number,
  z: number,
  buildings: PlacedBuilding[],
  maxDist: number = CHECK_IN_RADIUS_METERS
): { building: PlacedBuilding; dist: number } | null {
  let best: PlacedBuilding | null = null;
  let bestDist = Infinity;

  for (const b of buildings) {
    if (b.tier <= 0) continue;
    const entDist = Math.hypot(x - b.entrancePos[0], z - b.entrancePos[2]);
    // Also allow standing near the road-facing perimeter of large Tier 2/3 landmarks
    const centerRadius = Math.max(b.widthMeters, b.depthMeters) * 0.5 + 3.5;
    const centerDist = Math.hypot(x - b.worldPos[0], z - b.worldPos[2]);
    const effectiveDist = centerDist <= centerRadius ? Math.min(entDist, 4.0) : entDist;

    if (effectiveDist <= maxDist && effectiveDist < bestDist) {
      bestDist = effectiveDist;
      best = b;
    }
  }

  return best ? { building: best, dist: bestDist } : null;
}

/**
 * Computes the straight-line distance from `(x, z)` to a target building's entrance.
 */
export function computeDistanceToBuilding(
  x: number,
  z: number,
  entrancePos: [number, number, number]
): number {
  return Math.hypot(x - entrancePos[0], z - entrancePos[2]);
}

function seededRandom(seed: number): () => number {
  let s = Math.abs(Math.floor(seed)) % 2147483647;
  if (s <= 0) s = 12345;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function getDifficultyBounds(difficulty: TownDifficulty): {
  minMeters: number;
  maxMeters: number;
  minTurns: number;
  maxTurns: number;
} {
  switch (difficulty) {
    case 'EASY':
      return { minMeters: 30, maxMeters: 95, minTurns: 0, maxTurns: 1 };
    case 'HARD':
      return { minMeters: 85, maxMeters: 210, minTurns: 2, maxTurns: 4 };
    case 'MEDIUM':
    default:
      return { minMeters: 55, maxMeters: 150, minTurns: 1, maxTurns: 2 };
  }
}

/**
 * Generates a deterministic, road-aligned directions race round from a named starting building
 * to a mystery target building, with guaranteed forward-aligned spawn heading.
 */
export function buildRaceRoundPlan(
  buildings: PlacedBuilding[],
  roundIndex: number,
  difficulty: TownDifficulty,
  usedTargetIds: Set<string>,
  seed: number
): HostSecretRoundPlan {
  const named = buildings.filter((b) => b.tier > 0);
  if (named.length < 2) {
    throw new Error('Town requires at least 2 named buildings to build a race round.');
  }

  const rng = seededRandom(seed + (roundIndex + 1) * 7919);
  const bounds = getDifficultyBounds(difficulty);

  // Build candidate (start, target) pairs
  const preferredTargets = named.filter((b) => !usedTargetIds.has(b.id));
  const targetPool = preferredTargets.length > 0 ? preferredTargets : named;

  interface CandidateRoute {
    start: PlacedBuilding;
    target: PlacedBuilding;
    spawnPos: [number, number];
    spawnHeading: number;
    path: Array<{ x: number; z: number }>;
    turnCount: number;
    totalMeters: number;
  }

  const exactMatches: CandidateRoute[] = [];
  const fallbackMatches: CandidateRoute[] = [];

  // Sample up to 60 pairs deterministically for speed (<1ms)
  const shuffledStarts = [...named].sort(() => rng() - 0.5).slice(0, 12);
  const shuffledTargets = [...targetPool].sort(() => rng() - 0.5).slice(0, 12);

  for (const start of shuffledStarts) {
    const rawStartRoad = getBuildingRoadAccessPoint(start);
    // Snap spawn to the exact intersection nearest the starting building so
    // "Go straight for 2 blocks" unambiguously means turning at the 2nd intersection!
    const startRoad = {
      x: snapToRoadCoord(rawStartRoad.x),
      z: snapToRoadCoord(rawStartRoad.z),
    };
    for (const target of shuffledTargets) {
      if (start.id === target.id) continue;
      const path = computeManhattanRoadPath(startRoad.x, startRoad.z, target);
      if (path.length < 3) continue; // Need at least 1 road segment + entrance

      let totalMeters = 0;
      const roadPts = path.slice(0, -1); // exclude final sidewalk entrance step
      for (let i = 0; i < roadPts.length - 1; i++) {
        totalMeters += Math.hypot(roadPts[i + 1].x - roadPts[i].x, roadPts[i + 1].z - roadPts[i].z);
      }
      if (totalMeters < 22) continue;

      const turnCount = Math.max(0, roadPts.length - 2);
      const firstDx = path[1].x - path[0].x;
      const firstDz = path[1].z - path[0].z;
      const spawnHeading = Math.atan2(firstDx, firstDz);

      const cand: CandidateRoute = {
        start,
        target,
        spawnPos: [startRoad.x, startRoad.z],
        spawnHeading,
        path,
        turnCount,
        totalMeters,
      };

      if (
        totalMeters >= bounds.minMeters &&
        totalMeters <= bounds.maxMeters &&
        turnCount >= bounds.minTurns &&
        turnCount <= bounds.maxTurns
      ) {
        exactMatches.push(cand);
      } else {
        fallbackMatches.push(cand);
      }
    }
  }

  const chosen =
    exactMatches.length > 0
      ? exactMatches[Math.floor(rng() * exactMatches.length)]
      : fallbackMatches.length > 0
      ? fallbackMatches[Math.floor(rng() * fallbackMatches.length)]
      : (() => {
          const start = named[0];
          const target = named[1];
          const startRoad = getBuildingRoadAccessPoint(start);
          const path = computeManhattanRoadPath(startRoad.x, startRoad.z, target);
          const firstDx = (path[1]?.x ?? startRoad.x) - startRoad.x;
          const firstDz = (path[1]?.z ?? startRoad.z + 1) - startRoad.z;
          return {
            start,
            target,
            spawnPos: [startRoad.x, startRoad.z] as [number, number],
            spawnHeading: Math.atan2(firstDx, firstDz),
            path,
            turnCount: Math.max(0, path.length - 3),
            totalMeters: 45,
          };
        })();

  const script = buildMextStepByStepScript(chosen.path, chosen.spawnHeading, chosen.target);

  return {
    roundIndex,
    startBuildingId: chosen.start.id,
    startNameEn: chosen.start.nameEn,
    startNameJa: chosen.start.nameJa,
    targetBuildingId: chosen.target.id,
    targetNameEn: chosen.target.nameEn,
    targetNameJa: chosen.target.nameJa,
    targetWorldPos: chosen.target.worldPos,
    targetEntrancePos: chosen.target.entrancePos,
    spawnPos: chosen.spawnPos,
    spawnHeading: chosen.spawnHeading,
    optimalPath: chosen.path,
    stepsEn: script.stepsEn,
    stepsJa: script.stepsJa,
    turnCount: chosen.turnCount,
    totalPathMeters: Math.round(chosen.totalMeters),
  };
}

/**
 * Sorts round scores for the leaderboard (highest roundPts first, then fastest finishMs, then totalPts).
 */
export function sortRoundScores(entries: TownRoundScoreEntry[]): TownRoundScoreEntry[] {
  return [...entries].sort((a, b) => {
    if (b.roundPts !== a.roundPts) return b.roundPts - a.roundPts;
    if (a.finishMs != null && b.finishMs != null) return a.finishMs - b.finishMs;
    if (a.finishMs != null) return -1;
    if (b.finishMs != null) return 1;
    return b.totalPts - a.totalPts;
  });
}
