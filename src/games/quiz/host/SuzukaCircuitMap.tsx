import React, { useRef, useEffect, useState, useMemo } from 'react';
import { QuizPlayer, TEAM_PRESETS } from '../types';
import { useLanguage } from '@/context/LanguageContext';
import { Trophy, Flame, Zap } from 'lucide-react';

interface SuzukaCircuitMapProps {
  sortedRacers: QuizPlayer[];
  totalQuestions: number;
  isTimeTrial: boolean;
  totalRacers: number;
  finishedRacers: QuizPlayer[];
  raceFinishGraceStartTime?: number;
  graceRemainingSeconds?: number;
}

interface LUTPoint {
  x: number;
  y: number;
  nx: number;
  ny: number;
  angle: number;
  curvature: number;
}

interface AnimatedRacerPos {
  racer: QuizPlayer;
  index: number;
  x: number;
  y: number;
  nx: number;
  ny: number;
  angle: number;
  isFinished: boolean;
  isMoving: boolean;
  hasStreak: boolean;
  isOnOverpass: boolean;
  currentCircuitLap: number;
  laneSpread: number;
}

interface RacerPhysicsState {
  currentDist: number;
  targetDist: number;
  velocity: number;
}

// Official FIA Suzuka International Racing Course Centerline Spline
// Starts at Checkered Start/Finish Line (x=-28.87, y=911.44) moving west along the Main Straight ->
// Turn 1 & 2 -> S-Curves -> Dunlop Curve -> Degner 1 & 2 -> Underpass ->
// Hairpin (180° loop) -> 200R -> Spoon Curve -> Back Straight (Overpass Bridge) ->
// 130R -> Casio Chicane -> Turn 18 -> Start/Finish.
const SUZUKA_PATH_D = `M -28.87,911.44 c -45.79,6.76 -91.39,14.78 -137.16,21.66 c -32.90,4.94 -65.86,10.03 -98.86,13.81 c -6.23,0.71 -12.61,0.30 -18.83,-0.31 c -5.49,-0.54 -11.14,-1.33 -16.32,-3.14 c -5.91,-2.06 -11.86,-4.83 -16.95,-8.47 c -7.04,-5.04 -13.71,-11.07 -19.46,-17.58 c -5.34,-6.05 -10.36,-12.92 -13.81,-20.09 c -1.99,-4.13 -2.51,-9.20 -2.51,-13.81 c 0.00,-5.22 0.56,-10.93 2.51,-15.69 c 1.82,-4.44 5.36,-8.44 8.79,-11.93 c 3.37,-3.42 7.37,-6.59 11.61,-8.79 c 4.02,-2.09 8.66,-3.41 13.18,-4.08 c 7.41,-1.10 15.06,-0.99 22.60,-1.26 c 30.44,-1.09 61.06,-0.89 91.33,-2.82 c 4.14,-0.26 8.26,-1.89 11.93,-3.77 c 4.70,-2.41 9.38,-5.46 13.18,-9.10 c 3.62,-3.47 6.48,-7.90 9.10,-12.24 c 3.45,-5.71 5.30,-12.50 9.10,-17.89 c 2.69,-3.82 6.43,-7.21 10.36,-9.73 c 4.55,-2.92 9.85,-5.23 15.07,-6.59 c 3.99,-1.04 8.38,-0.78 12.55,-0.63 c 4.72,0.17 9.53,0.47 14.12,1.57 c 13.71,3.29 27.09,8.22 40.80,11.61 c 5.75,1.42 11.75,2.93 17.58,2.82 c 5.26,-0.10 10.75,-1.54 15.69,-3.45 c 5.31,-2.06 10.52,-5.04 15.07,-8.47 c 3.62,-2.74 6.75,-6.33 9.42,-10.04 c 6.86,-9.57 12.14,-20.38 19.15,-29.82 c 3.25,-4.37 7.24,-8.42 11.61,-11.61 c 4.52,-3.30 9.84,-5.77 15.07,-7.85 c 4.50,-1.79 9.33,-3.08 14.12,-3.77 c 5.46,-0.78 11.23,-1.36 16.63,-0.63 c 4.64,0.63 9.25,2.64 13.50,4.71 c 3.29,1.60 6.46,3.75 9.10,6.28 c 4.57,4.38 8.53,9.49 12.55,14.44 c 5.08,6.25 9.58,12.98 14.75,19.15 c 4.66,5.55 9.04,11.75 14.75,16.01 c 5.38,4.01 12.12,6.59 18.52,8.79 c 4.27,1.47 8.94,2.06 13.31,2.20 c 5.19,0.17 10.54,0.28 15.13,-1.26 c 6.11,-2.13 11.63,-5.86 16.46,-9.73 c 5.82,-5.02 10.92,-10.60 14.85,-16.95 c 3.31,-6.00 5.47,-12.97 6.99,-20.09 c 0.88,-5.02 0.93,-10.61 0.59,-16.32 c -0.61,-7.16 -1.59,-14.54 -3.82,-22.28 c -1.87,-6.17 -5.30,-12.91 -8.47,-19.46 c -3.31,-6.74 -7.03,-13.57 -11.17,-20.40 c -4.35,-7.19 -9.11,-14.47 -14.45,-21.66 c -6.04,-8.20 -12.49,-16.53 -19.81,-24.48 c -9.17,-10.15 -19.86,-19.93 -29.50,-29.82 c -24.08,-26.52 -47.16,-52.74 -62.85,-79.41 c -1.85,-3.68 -1.58,-8.04 -0.64,-11.61 c 10.47,-28.54 27.41,-57.29 50.25,-84.74 c 2.67,-2.89 7.14,-5.00 11.31,-6.28 c 4.08,-1.24 9.09,-2.22 13.48,-1.26 c 101.13,20.38 212.10,41.37 314.00,65.28 c 10.09,2.56 18.46,8.61 26.02,14.12 c 22.08,17.19 38.96,37.56 56.22,53.98 c 2.80,2.93 7.87,4.02 11.64,4.08 c 3.16,0.05 7.17,-1.57 9.42,-3.77 c 2.46,-2.40 4.27,-6.57 4.71,-10.04 c 0.40,-3.22 -0.70,-7.00 -2.20,-10.04 c -4.14,-8.45 -9.81,-15.84 -14.08,-23.34 c -5.88,-10.33 -11.16,-19.70 -15.46,-28.57 c -3.19,-6.69 -6.40,-12.74 -7.55,-19.05 c -0.86,-5.50 -0.40,-11.21 1.38,-16.64 c 1.34,-3.74 4.47,-7.59 7.79,-11.17 c 2.84,-2.99 6.53,-5.86 10.74,-8.49 c 6.98,-4.36 14.32,-8.70 22.83,-12.43 c 9.80,-4.52 21.01,-8.43 31.92,-12.63 c 7.25,-3.07 15.00,-5.90 22.92,-8.59 c 12.75,-4.99 25.43,-10.47 38.24,-15.86 c 11.56,-5.83 23.22,-12.04 34.98,-17.64 c 10.89,-6.15 22.14,-12.06 33.08,-17.46 c 8.76,-5.01 17.80,-9.02 26.44,-13.06 c 7.09,-3.74 14.18,-7.51 20.96,-9.90 c 26.43,-12.10 51.03,-23.03 75.54,-38.91 c 4.28,-2.65 9.02,-7.82 12.66,-13.59 c 4.19,-6.48 8.23,-14.64 10.79,-23.20 c 3.49,-11.09 5.95,-23.51 7.51,-35.51 c 1.87,-12.53 3.04,-25.57 2.88,-37.93 c 0.03,-8.56 -0.74,-17.84 -3.67,-25.48 c -3.13,-8.31 -8.72,-16.34 -14.43,-22.23 c -3.58,-3.62 -9.01,-5.52 -13.87,-7.01 c -5.70,-1.75 -11.94,-3.04 -17.89,-2.82 c -8.38,0.31 -16.97,2.06 -25.11,4.39 c -12.68,3.63 -24.99,8.75 -37.35,13.50 c -13.80,5.30 -27.59,10.69 -41.12,16.63 c -12.42,5.46 -24.71,11.27 -36.72,17.58 c -16.66,8.76 -33.47,17.45 -49.28,27.62 c -18.82,12.11 -36.88,25.55 -54.61,39.23 c -18.46,14.25 -35.93,29.78 -53.98,44.57 c -20.76,17.01 -41.83,33.67 -62.46,50.84 c -21.22,17.66 -42.27,35.53 -63.09,53.67 c -31.29,27.27 -63.05,54.26 -93.22,82.54 c -3.31,3.11 -5.92,7.30 -7.22,11.61 c -4.14,13.78 -7.26,28.31 -9.10,42.68 c -1.61,12.62 -2.67,25.66 -1.26,38.29 c 2.98,26.50 8.80,52.91 14.44,79.09 c 4.93,22.88 13.37,45.16 17.26,68.11 c 2.07,12.20 1.52,25.26 0.63,37.35 c -0.15,2.03 -1.89,4.27 -3.77,5.02 c -7.75,3.12 -17.64,3.08 -25.11,6.59 c -2.78,1.31 -5.53,4.84 -5.65,7.85 c -0.30,7.25 2.27,15.20 2.89,22.91 c 0.74,9.13 0.94,18.63 -0.31,27.62 c -0.73,5.24 -1.97,10.18 -4.15,15.07 c -2.11,4.74 -4.37,9.49 -7.22,13.81 c -3.64,5.52 -7.56,11.07 -12.24,15.69 c -4.32,4.27 -9.48,7.89 -14.75,10.99 c -11.67,6.85 -23.73,13.33 -36.09,18.83 c -7.62,3.39 -15.79,5.66 -23.85,7.85 c -7.00,1.90 -14.16,3.34 -21.34,4.39 c -70.34,10.35 -140.89,19.42 -211.23,29.82 z`;

// Master 16:9 Rotation Angle: +22° aligns Suzuka's long axis (Turn 1 to Spoon) diagonally across 16:9 widescreen
const ROT_ANGLE = 22.0;
const ROT_CX = 265;
const ROT_CY = 522;

const LUT_SIZE = 2000;

export const SuzukaCircuitMap: React.FC<SuzukaCircuitMapProps> = ({
  sortedRacers,
  totalQuestions,
  isTimeTrial,
  totalRacers,
  finishedRacers,
  raceFinishGraceStartTime,
  graceRemainingSeconds
}) => {
  const { t } = useLanguage();
  const pathRef = useRef<SVGPathElement | null>(null);

  // Pre-computed Track Lookup Table (LUT) with curvature and normals
  const lutRef = useRef<LUTPoint[]>([]);
  const [lutReady, setLutReady] = useState<boolean>(false);
  const [pathLength, setPathLength] = useState<number>(4010.31);
  const [computedViewBox, setComputedViewBox] = useState<string>('-473 156 1484 835');

  // Solved Figure-8 Bridge Overpass Segment & Crossover Parameter
  const [bridgePathD, setBridgePathD] = useState<string>('');
  const [overpassT, setOverpassT] = useState<number>(0.78);

  // Multi-Lap Circuit Configuration
  const totalCircuitLaps = isTimeTrial ? 1 : (totalQuestions >= 60 ? 3 : (totalQuestions >= 30 ? 2 : 1));

  // Physics simulation state per racer
  const physicsStatesRef = useRef<Record<string, RacerPhysicsState>>({});
  const [racerPositions, setRacerPositions] = useState<AnimatedRacerPos[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  // Build the 2,000-Point LUT, solve Figure-8 crossover, and calibrate exact 16:9 ViewBox
  useEffect(() => {
    // Create detached path element for instant measurement
    const svgNS = 'http://www.w3.org/2000/svg';
    const testPath = document.createElementNS(svgNS, 'path');
    testPath.setAttribute('d', SUZUKA_PATH_D);

    const totalLen = testPath.getTotalLength();
    if (totalLen <= 0) return;
    setPathLength(totalLen);

    const step = totalLen / LUT_SIZE;
    const lut: LUTPoint[] = [];

    // Pass 1: Sample equidistant coordinates, normals, and tangent angles
    for (let i = 0; i < LUT_SIZE; i++) {
      const dist = i * step;
      const pt = testPath.getPointAtLength(dist);
      const ptPrev = testPath.getPointAtLength((dist - 4 + totalLen) % totalLen);
      const ptNext = testPath.getPointAtLength((dist + 4) % totalLen);

      const dx = ptNext.x - ptPrev.x;
      const dy = ptNext.y - ptPrev.y;
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;

      lut.push({
        x: pt.x,
        y: pt.y,
        nx,
        ny,
        angle,
        curvature: 0
      });
    }

    // Pass 2: Calculate discrete angular curvature (normalized 0.0 to 1.0)
    for (let i = 0; i < LUT_SIZE; i++) {
      const prevAngle = lut[(i - 12 + LUT_SIZE) % LUT_SIZE].angle;
      const nextAngle = lut[(i + 12) % LUT_SIZE].angle;
      let diff = Math.abs(nextAngle - prevAngle);
      if (diff > 180) diff = 360 - diff;
      lut[i].curvature = Math.min(1.0, diff / 40.0);
    }
    lutRef.current = lut;

    // Pass 3: Automatic Figure-8 Bridge Intersection Solver
    // Sector 1->2 underpass is in [0.20, 0.48], Sector 3 overpass is in [0.65, 0.92]
    let bestDistSq = Infinity;
    let underIdx = Math.floor(0.33 * LUT_SIZE);
    let overIdx = Math.floor(0.78 * LUT_SIZE);

    for (let i = Math.floor(0.20 * LUT_SIZE); i <= Math.floor(0.48 * LUT_SIZE); i += 2) {
      for (let j = Math.floor(0.65 * LUT_SIZE); j <= Math.floor(0.92 * LUT_SIZE); j += 2) {
        const dx = lut[i].x - lut[j].x;
        const dy = lut[i].y - lut[j].y;
        const d2 = dx * dx + dy * dy;
        if (d2 < bestDistSq) {
          bestDistSq = d2;
          underIdx = i;
          overIdx = j;
        }
      }
    }

    setOverpassT(overIdx / LUT_SIZE);

    // Slice overpass deck polyline [overIdx - 48 ... overIdx + 48]
    const sliceStart = Math.max(0, overIdx - 48);
    const sliceEnd = Math.min(LUT_SIZE - 1, overIdx + 48);
    const bridgeSlice = lut.slice(sliceStart, sliceEnd + 1);
    const bridgeD = bridgeSlice
      .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`)
      .join(' ');
    setBridgePathD(bridgeD);

    // Pass 4: Dynamic 16:9 Widescreen Bounding Box Calibration
    const rad = (ROT_ANGLE * Math.PI) / 180;
    const cosA = Math.cos(rad);
    const sinA = Math.sin(rad);

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const pt of lut) {
      const rx = ROT_CX + (pt.x - ROT_CX) * cosA - (pt.y - ROT_CY) * sinA;
      const ry = ROT_CY + (pt.x - ROT_CX) * sinA + (pt.y - ROT_CY) * cosA;
      if (rx < minX) minX = rx;
      if (rx > maxX) maxX = rx;
      if (ry < minY) minY = ry;
      if (ry > maxY) maxY = ry;
    }

    const roadPad = 32; // roadHalfWidth + curbs + safety margin
    let boxW = (maxX - minX) + roadPad * 2;
    let boxH = (maxY - minY) + roadPad * 2;
    let boxX = minX - roadPad;
    let boxY = minY - roadPad;

    // Force strict 16:9 aspect ratio so stage is filled 100% with zero dead margins
    const targetRatio = 16 / 9;
    const curRatio = boxW / boxH;
    if (curRatio < targetRatio) {
      const expandedW = boxH * targetRatio;
      boxX -= (expandedW - boxW) / 2;
      boxW = expandedW;
    } else if (curRatio > targetRatio) {
      const expandedH = boxW / targetRatio;
      boxY -= (expandedH - boxH) / 2;
      boxH = expandedH;
    }

    setComputedViewBox(`${boxX.toFixed(1)} ${boxY.toFixed(1)} ${boxW.toFixed(1)} ${boxH.toFixed(1)}`);
    setLutReady(true);
  }, []);

  // 60 FPS Peloton Physics Engine with 5-Lane Honeycomb Anti-Stacking
  useEffect(() => {
    if (!lutReady || lutRef.current.length === 0 || pathLength <= 0) return;
    const lut = lutRef.current;
    let isMounted = true;

    // Critically damped spring constants (k=18, c=8.5 -> silky smooth 0.7s glides)
    const SPRING_K = 18.0;
    const SPRING_C = 8.5;

    // 5 Staggered Racing Line Offsets (inside to outside)
    const LANES = [-10.5, -5.25, 0.0, 5.25, 10.5];

    const tick = (timestamp: number) => {
      if (!isMounted) return;

      if (lastTimeRef.current === null) {
        lastTimeRef.current = timestamp;
      }
      const rawDt = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;
      const dt = Math.max(0.005, Math.min(0.04, rawDt));

      let hasMotion = false;
      const nextPositions: AnimatedRacerPos[] = [];

      // Group racers by current question score for honeycomb peloton dispersal
      const progressCounts: Record<number, number> = {};
      sortedRacers.forEach(r => {
        const p = isTimeTrial ? (r.correctCount || 0) : (r.sprintProgress || 0);
        progressCounts[p] = (progressCounts[p] || 0) + 1;
      });

      const assignedInGroup: Record<number, number> = {};
      const racerSlotInGroup: Record<string, number> = {};
      const racerGroupSize: Record<string, number> = {};

      sortedRacers.forEach(r => {
        const p = isTimeTrial ? (r.correctCount || 0) : (r.sprintProgress || 0);
        const slot = assignedInGroup[p] || 0;
        racerSlotInGroup[r.id] = slot;
        racerGroupSize[r.id] = progressCounts[p] || 1;
        assignedInGroup[p] = slot + 1;
      });

      sortedRacers.forEach((racer, index) => {
        const progress = isTimeTrial
          ? Math.min(1, (racer.correctCount || 0) / Math.max(1, totalQuestions))
          : Math.min(1, (racer.sprintProgress || 0) / Math.max(1, totalQuestions));

        const p = isTimeTrial ? (racer.correctCount || 0) : (racer.sprintProgress || 0);
        const groupSize = racerGroupSize[racer.id] || 1;
        const slot = racerSlotInGroup[racer.id] || 0;

        let targetDist = 0;
        let laneIndex = 2; // Center default
        let distOffset = 0;

        if (racer.isFinished) {
          // Finished: lined up past finish line along main straight in rank order
          targetDist = totalCircuitLaps * pathLength + Math.max(20, 160 - index * 14);
          laneIndex = index % 2 === 0 ? 1 : 3;
        } else if (p === 0) {
          // Starting Grid: 2-wide staggered pole formation behind start/finish line
          targetDist = -(16 + index * 12);
          laneIndex = index % 2 === 0 ? 1 : 3;
        } else {
          // In-Race: Honeycomb 5-lane distribution with longitudinal micro-stagger
          const baseDist = Math.max(0, Math.min(totalCircuitLaps * pathLength, progress * totalCircuitLaps * pathLength));
          
          if (groupSize > 1) {
            // Honeycomb lane interleaving (0, 2, 4, 1, 3)
            const honeycombLanes = [0, 2, 4, 1, 3];
            laneIndex = honeycombLanes[slot % 5];
            // Longitudinal offset: spread pack ±8.5px apart
            distOffset = (slot - (groupSize - 1) / 2) * 8.5;
            targetDist = Math.max(0, Math.min(totalCircuitLaps * pathLength, baseDist + distOffset));
          } else {
            targetDist = baseDist;
            laneIndex = (index % 3) + 1;
          }
        }

        // Initialize or update spring physics state
        let state = physicsStatesRef.current[racer.id];
        if (!state) {
          state = {
            currentDist: targetDist,
            targetDist,
            velocity: 0
          };
          physicsStatesRef.current[racer.id] = state;
        } else {
          state.targetDist = targetDist;
        }

        // Physics integration
        const displacement = state.currentDist - state.targetDist;
        const force = -SPRING_K * displacement - SPRING_C * state.velocity;
        state.velocity += force * dt;

        const MAX_VEL = 650.0;
        if (Math.abs(state.velocity) > MAX_VEL) {
          state.velocity = Math.sign(state.velocity) * MAX_VEL;
        }
        state.currentDist += state.velocity * dt;

        if (Math.abs(displacement) < 0.15 && Math.abs(state.velocity) < 0.15) {
          state.currentDist = state.targetDist;
          state.velocity = 0;
        } else {
          hasMotion = true;
        }

        const isMoving = Math.abs(state.velocity) > 12.0;

        // O(1) LUT lookup by closed-loop distance
        const currentTrackDist = ((state.currentDist % pathLength) + pathLength) % pathLength;
        const normalizedT = currentTrackDist / pathLength;
        const lutIdx = Math.min(LUT_SIZE - 1, Math.max(0, Math.floor((currentTrackDist / pathLength) * LUT_SIZE)));
        const lutPt = lut[lutIdx] || lut[0];

        // Corner Apex Squeeze: compress lane spread in sharp bends so cars hug the apex line
        const apexSqueeze = Math.max(0.50, Math.min(1.0, 1.0 - 0.45 * (lutPt.curvature || 0)));
        const effectiveLaneOffset = (LANES[laneIndex] || 0) * apexSqueeze;

        const posX = lutPt.x + lutPt.nx * effectiveLaneOffset;
        const posY = lutPt.y + lutPt.ny * effectiveLaneOffset;

        const currentCircuitLap = Math.min(
          totalCircuitLaps,
          Math.max(1, Math.floor((state.currentDist / pathLength) || 0) + 1)
        );

        // Overpass detection: within ±3.5% of solved bridge crossover point
        const isOnOverpass = Math.abs(normalizedT - overpassT) < 0.035;

        nextPositions.push({
          racer,
          index,
          x: posX,
          y: posY,
          nx: lutPt.nx,
          ny: lutPt.ny,
          angle: lutPt.angle,
          isFinished: !!racer.isFinished,
          isMoving,
          hasStreak: (racer.currentStreak || 0) >= 3,
          isOnOverpass,
          currentCircuitLap,
          laneSpread: effectiveLaneOffset
        });
      });

      setRacerPositions(nextPositions);

      if (hasMotion) {
        animFrameRef.current = requestAnimationFrame(tick);
      } else {
        animFrameRef.current = null;
        lastTimeRef.current = null;
      }
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      isMounted = false;
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [sortedRacers, lutReady, pathLength, totalQuestions, isTimeTrial, totalCircuitLaps, overpassT]);

  // Leaders / Active Overtakers for Fastest Sector Callout
  const fastestRacer = useMemo(() => {
    const withStreak = sortedRacers.filter(r => (r.currentStreak || 0) >= 4);
    if (withStreak.length > 0) return withStreak[0];
    const finishedWithTime = sortedRacers.filter(r => r.fastestTimeMs && r.fastestTimeMs < 3000);
    return finishedWithTime[0] || null;
  }, [sortedRacers]);

  // Separate cars into Underpass and Overpass layers for true 3D Figure-8 z-ordering
  const underpassCars = racerPositions.filter(p => !p.isOnOverpass);
  const overpassCars = racerPositions.filter(p => p.isOnOverpass);

  // Helper to render an individual Formula 1 car and its telemetry tag
  const renderCar = ({ racer, index, x, y, nx, ny, angle, isFinished, isMoving, hasStreak, currentCircuitLap }: AnimatedRacerPos) => {
    let kartFill = '#6366f1';
    if (racer.teamId && TEAM_PRESETS[racer.teamId]) {
      const p = TEAM_PRESETS[racer.teamId];
      kartFill = p.color === 'red' ? '#ef4444' : p.color === 'blue' ? '#3b82f6' : p.color === 'green' ? '#10b981' : p.color === 'yellow' ? '#f59e0b' : '#8b5cf6';
    }

    const isPodium = index < 3;
    const isLeader = index === 0;
    const isLap2Plus = !isFinished && totalCircuitLaps > 1 && currentCircuitLap >= 2;

    // Leader / Top-3 tags are offset OUTSIDE the track by 28px along normal (nx, ny)
    // Mid-pack cars use a compact 16px circular badge counter-rotated upright on the car
    const tagOffsetX = nx * 28;
    const tagOffsetY = ny * 28;

    return (
      <g key={racer.id} transform={`translate(${x.toFixed(1)}, ${y.toFixed(1)})`}>
        {/* 1. Rotated Formula 1 Chassis Body */}
        <g transform={`rotate(${angle.toFixed(1)})`}>
          {/* Flame Exhaust / DRS Streak */}
          {(hasStreak || isMoving) && !isFinished && (
            <g transform="translate(-18, 0)">
              <circle cx="-4" cy="0" r={isMoving ? 6 : 4} fill="#f59e0b" opacity="0.85" className="animate-ping" />
              <path d="M 0 -4 L -13 0 L 0 4 Z" fill="#ef4444" />
              <path d="M 0 -2 L -9 0 L 0 2 Z" fill="#fde047" />
            </g>
          )}

          {/* Rear Wing */}
          <rect x="-13" y="-8" width="4" height="16" rx="1.5" fill="#0f172a" stroke="#ffffff" strokeWidth="0.8" />
          {/* Rear Wheels */}
          <rect x="-10" y="-10" width="7" height="4" rx="1" fill="#000000" />
          <rect x="-10" y="6" width="7" height="4" rx="1" fill="#000000" />
          {/* Front Wheels */}
          <rect x="7" y="-9" width="6" height="3.5" rx="1" fill="#000000" />
          <rect x="7" y="5.5" width="6" height="3.5" rx="1" fill="#000000" />
          {/* Main Chassis Body */}
          <rect x="-11" y="-5.5" width="22" height="11" rx="4" fill={kartFill} stroke="#ffffff" strokeWidth="1.2" />
          {/* Cockpit Helmet */}
          <circle cx="0" cy="0" r="3.5" fill="#ffffff" stroke="#0f172a" strokeWidth="1" />
          {/* Front Nosecone */}
          <polygon points="11,-6 16,0 11,6" fill={kartFill} />
          <rect x="13" y="-7" width="2.5" height="14" rx="1" fill="#0f172a" stroke="#ffffff" strokeWidth="0.5" />
        </g>

        {/* 2. Micro F1 Telemetry Badges (Unobstructed Asphalt Racing Surface) */}
        {isPodium ? (
          // TOP 3 LEADERS: Pushed 28px OUTWARD into the grass with subtle leader line
          <g>
            {/* 1px Leader Line connecting car to the outside grass badge */}
            <line
              x1="0"
              y1="0"
              x2={tagOffsetX.toFixed(1)}
              y2={tagOffsetY.toFixed(1)}
              stroke="rgba(255, 255, 255, 0.4)"
              strokeWidth="1"
              strokeDasharray="2 2"
            />
            {/* Outside Grass Badge: counter-rotated so text is 100% horizontal */}
            <g transform={`translate(${tagOffsetX.toFixed(1)}, ${tagOffsetY.toFixed(1)}) rotate(${-ROT_ANGLE})`}>
              <rect
                x={-(racer.nickname.length * 4.2 + 16)}
                y="-9"
                width={racer.nickname.length * 8.4 + 32}
                height="18"
                rx="9"
                fill="#0f172a"
                stroke={isLeader ? '#fbbf24' : '#94a3b8'}
                strokeWidth={isLeader ? 1.8 : 1.2}
                className="filter drop-shadow-md"
              />
              <text
                x={-(racer.nickname.length * 4.2 + 7)}
                y="3.5"
                textAnchor="middle"
                fontSize="9"
                fontWeight="900"
                fill={isLeader ? '#fbbf24' : '#ffffff'}
                fontFamily="monospace"
              >
                {isFinished ? '🏁' : index === 0 ? '1' : index === 1 ? '2' : '3'}
              </text>
              <text
                x="4"
                y="3.5"
                textAnchor="middle"
                fontSize="9.5"
                fontWeight="800"
                fill="#ffffff"
                fontFamily="sans-serif"
              >
                {racer.nickname}
              </text>
            </g>
          </g>
        ) : (
          // MID-PACK (P4–P35): Crisp 16px Circular F1 Position Dot (Counter-rotated upright on cockpit)
          <g transform={`rotate(${-ROT_ANGLE})`}>
            <circle
              cx="0"
              cy="0"
              r="7.5"
              fill={isLap2Plus ? '#78350f' : '#090d16'}
              stroke={kartFill}
              strokeWidth="1.5"
              className="filter drop-shadow"
            />
            <text
              x="0"
              y="2.5"
              textAnchor="middle"
              fontSize="8"
              fontWeight="900"
              fill="#ffffff"
              fontFamily="monospace"
            >
              {isFinished ? '🏁' : `${index + 1}`}
            </text>
          </g>
        )}
      </g>
    );
  };

  return (
    <div className="w-full h-full relative overflow-hidden bg-[#090d16] select-none">
      {/* 1. Main Official Suzuka Interactive SVG Canvas (Full-Bleed 16:9) */}
      <svg
        viewBox={computedViewBox}
        className="w-full h-full object-contain filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.85)]"
      >
        <defs>
          {/* Start/Finish Checkered Pattern */}
          <pattern id="checkered-pattern" width="12" height="12" patternUnits="userSpaceOnUse">
            <rect width="6" height="6" fill="#ffffff" />
            <rect x="6" width="6" height="6" fill="#000000" />
            <rect y="6" width="6" height="6" fill="#000000" />
            <rect x="6" y="6" width="6" height="6" fill="#ffffff" />
          </pattern>

          {/* Asphalt Texture Gradient */}
          <linearGradient id="asphalt-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="50%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>

          {/* Bridge Overpass Drop Shadow Filter */}
          <filter id="bridge-shadow-blur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" />
          </filter>
        </defs>

        {/* Master Rotated Circuit Group: -17° clockwise flattens the back straight horizontally */}
        <g transform={`rotate(${ROT_ANGLE}, ${ROT_CX}, ${ROT_CY})`}>
          {/* LAYER 1: Master Roadway Surface (Continuous closed loop) */}
          {/* Outer Kerb Rumble Strips (Red/White Edges) */}
          <path
            d={SUZUKA_PATH_D}
            fill="none"
            stroke="#ef4444"
            strokeWidth="44"
            strokeLinejoin="round"
          />
          <path
            d={SUZUKA_PATH_D}
            fill="none"
            stroke="#ffffff"
            strokeWidth="44"
            strokeDasharray="14 14"
            strokeLinejoin="round"
          />

          {/* Main Asphalt Roadbed */}
          <path
            d={SUZUKA_PATH_D}
            fill="none"
            stroke="url(#asphalt-grad)"
            strokeWidth="34"
            strokeLinejoin="round"
          />

          {/* Centerline Guideline (Dashed White) */}
          <path
            ref={pathRef}
            d={SUZUKA_PATH_D}
            fill="none"
            stroke="rgba(255, 255, 255, 0.25)"
            strokeWidth="2"
            strokeDasharray="8 12"
            strokeLinejoin="round"
          />

          {/* Start / Finish Gantry (Checkered Banner spanning Main Straight at x=-28.87, y=911.44) */}
          <g transform="translate(-28.87, 888)">
            <rect x="-7" y="0" width="14" height="46" fill="url(#checkered-pattern)" stroke="#ffffff" strokeWidth="1.5" rx="2" />
            <text x="0" y="-8" fill="#fbbf24" fontSize="13" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">
              START / FINISH 🏁
            </text>
          </g>

          {/* LAYER 2: UNDERPASS CARS (Drive underneath the bridge) */}
          {[...underpassCars].reverse().map(renderCar)}

          {/* LAYER 3: FIGURE-8 BRIDGE OVERPASS (Shadow & Deck Structure) */}
          {bridgePathD && (
            <g id="figure-8-overpass">
              {/* Cast Shadow onto Underpass Below */}
              <path
                d={bridgePathD}
                fill="none"
                stroke="rgba(0,0,0,0.85)"
                strokeWidth="56"
                strokeLinecap="butt"
                filter="url(#bridge-shadow-blur)"
              />
              {/* Concrete Parapets & Guardrails */}
              <path
                d={bridgePathD}
                fill="none"
                stroke="#94a3b8"
                strokeWidth="48"
                strokeLinecap="butt"
              />
              {/* Red / White Bridge Kerbs */}
              <path
                d={bridgePathD}
                fill="none"
                stroke="#ef4444"
                strokeWidth="42"
                strokeLinecap="butt"
              />
              <path
                d={bridgePathD}
                fill="none"
                stroke="#ffffff"
                strokeWidth="42"
                strokeDasharray="14 14"
                strokeLinecap="butt"
              />
              {/* Overpass Asphalt Deck */}
              <path
                d={bridgePathD}
                fill="none"
                stroke="#1e293b"
                strokeWidth="34"
                strokeLinecap="butt"
              />
              {/* Overpass Centerline Dashes */}
              <path
                d={bridgePathD}
                fill="none"
                stroke="rgba(255, 255, 255, 0.35)"
                strokeWidth="2"
                strokeDasharray="8 12"
              />
            </g>
          )}

          {/* LAYER 4: OVERPASS CARS (Drive on top of the bridge deck) */}
          {[...overpassCars].reverse().map(renderCar)}
        </g>
      </svg>

      {/* 2. Floating Broadcast Telemetry HUD (Timing Tower in Open Top-Left Corner) */}
      <div className="absolute top-3 left-3 bg-slate-950/85 backdrop-blur-md rounded-2xl p-2.5 sm:p-3 border border-white/10 shadow-2xl max-w-[210px] pointer-events-none z-20">
        <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 mb-1.5">
          <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider flex items-center gap-1">
            <Trophy size={11} />
            <span>{t('TOP 12 RACERS', 'トップ12名')}</span>
          </span>
          <span className="text-[9px] font-mono text-emerald-400 font-bold animate-pulse">
            ● LIVE
          </span>
        </div>

        <div className="space-y-1">
          {sortedRacers.slice(0, 12).map((r, i) => (
            <div key={r.id} className="flex items-center justify-between text-[10px] font-bold">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className={`font-mono font-black w-4 text-center ${i === 0 ? 'text-amber-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-600' : 'text-slate-400'}`}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `P${i + 1}`}
                </span>
                <span className="truncate max-w-[85px] text-white">
                  {r.nickname}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0 font-mono text-[10px]">
                {!r.isFinished && totalCircuitLaps > 1 && (
                  <span className={`px-1 rounded font-black ${
                    (r.sprintProgress || 0) >= (totalQuestions * (totalCircuitLaps - 1) / totalCircuitLaps)
                      ? 'bg-rose-950/80 text-rose-300 border border-rose-700/80 animate-pulse'
                      : (r.sprintProgress || 0) >= (totalQuestions / totalCircuitLaps)
                        ? 'bg-amber-950/80 text-amber-300 border border-amber-700/80'
                        : 'bg-slate-800 text-slate-400'
                  }`}>
                    {`L${Math.min(totalCircuitLaps, Math.floor(((r.sprintProgress || 0) / (totalQuestions / totalCircuitLaps))) + 1)}`}
                  </span>
                )}
                <span className="text-emerald-400 font-black">
                  {r.isFinished ? 'FIN' : `${r.sprintProgress || 0}/${totalQuestions}`}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Checkered Flag Final Sprint Countdown Banner */}
      {raceFinishGraceStartTime && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-5 py-2 rounded-2xl bg-amber-500 text-slate-950 font-black text-xs sm:text-sm shadow-2xl border-2 border-amber-300 animate-bounce">
          <span className="text-base">🏁</span>
          <span>
            {t(
              `FINAL SPRINT COUNTDOWN: ${graceRemainingSeconds || 20}s`,
              `ラストスパート残り ${graceRemainingSeconds || 20}秒！`
            )}
          </span>
        </div>
      )}

      {/* 4. Fastest Answer / Hot Streak Purple Banner */}
      {fastestRacer && (fastestRacer.currentStreak || 0) >= 4 && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-1.5 rounded-xl bg-purple-900/90 text-purple-200 border border-purple-500 text-[11px] font-black shadow-xl animate-in fade-in slide-in-from-top-1 duration-200">
          <Zap size={13} className="text-purple-300 animate-pulse" />
          <span>
            {t('🟪 HOT STREAK:', '🟪 連続正解:')} {fastestRacer.nickname} 🔥 x{fastestRacer.currentStreak}
          </span>
        </div>
      )}
    </div>
  );
};
