import * as THREE from 'three';
import { PlacedBuilding } from './townGenerator';

export const ROAD_COORDS = [-63, -33, 0, 33, 63];

export interface Point2D {
  x: number;
  z: number;
}

export function snapToRoadCoord(val: number): number {
  let best = 0;
  let minD = Infinity;
  for (const r of ROAD_COORDS) {
    const d = Math.abs(val - r);
    if (d < minD) {
      minD = d;
      best = r;
    }
  }
  return best;
}

/**
 * Projects any world point (player or building entrance) onto the nearest road centerline.
 */
export function projectPointToRoad(x: number, z: number): Point2D {
  const nearestRx = snapToRoadCoord(x);
  const nearestRz = snapToRoadCoord(z);
  const dx = Math.abs(x - nearestRx);
  const dz = Math.abs(z - nearestRz);
  if (dx <= dz) {
    return { x: nearestRx, z: THREE.MathUtils.clamp(z, -63, 63) };
  }
  return { x: THREE.MathUtils.clamp(x, -63, 63), z: nearestRz };
}

/**
 * Computes the exact road centerline point directly fronting a PlacedBuilding's entrance.
 */
export function getBuildingRoadAccessPoint(b: PlacedBuilding): Point2D {
  const fSin = Math.round(Math.sin(b.rotationY));
  const fCos = Math.round(Math.cos(b.rotationY));
  const roadDist = b.depthMeters / 2 + 3.0;
  const rx = b.worldPos[0] + fSin * roadDist;
  const rz = b.worldPos[2] + fCos * roadDist;
  return projectPointToRoad(rx, rz);
}

/**
 * Computes the shortest Manhattan road path from (startX, startZ) to the road fronting targetBuilding,
 * returning simplified waypoints [startRoadPt, ...intersections, targetRoadPt, entrancePt].
 */
export function computeManhattanRoadPath(startX: number, startZ: number, target: PlacedBuilding): Point2D[] {
  const S = projectPointToRoad(startX, startZ);
  const T = getBuildingRoadAccessPoint(target);
  const E: Point2D = { x: target.entrancePos[0], z: target.entrancePos[2] };

  // If start is already right in front of the target, return direct entrance path
  if (Math.hypot(S.x - T.x, S.z - T.z) < 1.0) {
    return [S, E];
  }

  // 25 canonical intersection grid nodes (5x5 grid)
  const numGridNodes = ROAD_COORDS.length * ROAD_COORDS.length;
  const nodes: Point2D[] = [];
  for (const rx of ROAD_COORDS) {
    for (const rz of ROAD_COORDS) {
      nodes.push({ x: rx, z: rz });
    }
  }

  // Add S and T to the graph
  const sIdx = nodes.length;
  nodes.push(S);
  const tIdx = nodes.length;
  nodes.push(T);

  const n = nodes.length;
  const adj: Array<Array<{ to: number; cost: number }>> = Array(n).fill(0).map(() => []);

  const addEdge = (u: number, v: number) => {
    const d = Math.hypot(nodes[u].x - nodes[v].x, nodes[u].z - nodes[v].z);
    adj[u].push({ to: v, cost: d });
    adj[v].push({ to: u, cost: d });
  };

  // Connect intersection nodes along horizontal and vertical road avenues
  for (let i = 0; i < numGridNodes; i++) {
    for (let j = i + 1; j < numGridNodes; j++) {
      const isSameX = Math.abs(nodes[i].x - nodes[j].x) < 0.1;
      const isSameZ = Math.abs(nodes[i].z - nodes[j].z) < 0.1;
      if (isSameX || isSameZ) {
        const d = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].z - nodes[j].z);
        if (d <= 35.0) {
          addEdge(i, j);
        }
      }
    }
  }

  // Connect arbitrary road points (S and T) to their bounding or collinear road nodes
  [sIdx, tIdx].forEach((ptIdx) => {
    const pt = nodes[ptIdx];
    for (let i = 0; i < numGridNodes; i++) {
      const node = nodes[i];
      const sameX = Math.abs(pt.x - node.x) < 0.1;
      const sameZ = Math.abs(pt.z - node.z) < 0.1;
      if (sameX && Math.abs(pt.z - node.z) <= 35.0) {
        addEdge(ptIdx, i);
      } else if (sameZ && Math.abs(pt.x - node.x) <= 35.0) {
        addEdge(ptIdx, i);
      }
    }
  });

  // Direct edge between S and T if they lie on the exact same road line
  if (
    (Math.abs(S.x - T.x) < 0.1 && Math.abs(S.z - T.z) <= 35.0) ||
    (Math.abs(S.z - T.z) < 0.1 && Math.abs(S.x - T.x) <= 35.0)
  ) {
    addEdge(sIdx, tIdx);
  }

  // Dijkstra shortest path from sIdx to tIdx
  const dists = new Array(n).fill(Infinity);
  const prev = new Array(n).fill(-1);
  const visited = new Array(n).fill(false);
  dists[sIdx] = 0;

  for (let step = 0; step < n; step++) {
    let u = -1;
    let bestD = Infinity;
    for (let i = 0; i < n; i++) {
      if (!visited[i] && dists[i] < bestD) {
        bestD = dists[i];
        u = i;
      }
    }
    if (u === -1 || u === tIdx) break;
    visited[u] = true;
    for (const edge of adj[u]) {
      if (dists[u] + edge.cost < dists[edge.to]) {
        dists[edge.to] = dists[u] + edge.cost;
        prev[edge.to] = u;
      }
    }
  }

  const rawPath: Point2D[] = [];
  let cur = tIdx;
  while (cur !== -1) {
    rawPath.unshift(nodes[cur]);
    cur = prev[cur];
  }

  // Simplify collinear segments so we only keep true corner turns
  const simplified: Point2D[] = [];
  for (const pt of rawPath) {
    if (simplified.length > 0) {
      const last = simplified[simplified.length - 1];
      if (Math.hypot(pt.x - last.x, pt.z - last.z) < 0.5) continue;
    }
    if (simplified.length >= 2) {
      const p1 = simplified[simplified.length - 2];
      const p2 = simplified[simplified.length - 1];
      const cross = (p2.x - p1.x) * (pt.z - p2.z) - (p2.z - p1.z) * (pt.x - p2.x);
      const dot = (p2.x - p1.x) * (pt.x - p2.x) + (p2.z - p1.z) * (pt.z - p2.z);
      if (Math.abs(cross) < 1.0 && dot >= 0) {
        simplified[simplified.length - 1] = pt;
        continue;
      }
    }
    simplified.push(pt);
  }

  simplified.push(E);
  return simplified;
}

export interface NavigationStep {
  stepIndex: number;
  type: 'STRAIGHT' | 'TURN' | 'ARRIVE';
  instructionEn: string;
  instructionJa: string;
  action: 'straight' | 'turn_left' | 'turn_right';
  blocks?: 1 | 2;
  landmark?: string;
  side?: 'left' | 'right';
}

/**
 * Converts a road path and initial heading into MEXT elementary English step-by-step instructions.
 */
export function buildMextStepByStepScript(
  path: Point2D[],
  initialHeading: number,
  target: PlacedBuilding
): { stepsEn: string[]; stepsJa: string[]; stepsDetailed: NavigationStep[] } {
  if (path.length < 2) {
    return {
      stepsEn: [`Look around! The destination is right here.`],
      stepsJa: [`まわりを見てみよう！目的地はすぐそこだよ。`],
      stepsDetailed: [
        {
          stepIndex: 1,
          type: 'ARRIVE',
          instructionEn: 'Look around! The destination is right here.',
          instructionJa: 'まわりを見てみよう！目的地はすぐそこだよ。',
          action: 'straight',
        },
      ],
    };
  }

  const stepsEn: string[] = [];
  const stepsJa: string[] = [];
  const stepsDetailed: NavigationStep[] = [];
  let curHeading = initialHeading;

  // Iterate over road legs (all segments except the final short step from road center to sidewalk entrance)
  const roadPointCount = path.length - 1;
  let stepCounter = 1;

  for (let i = 0; i < roadPointCount - 1; i++) {
    const a = path[i];
    const b = path[i + 1];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const segLen = Math.hypot(dx, dz);
    if (segLen < 2.0) continue;

    const segAngle = Math.atan2(dx, dz);
    let diff = segAngle - curHeading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;

    const blocks = Math.max(1, Math.round(segLen / 28)) as 1 | 2;
    const blocksEn = blocks >= 2 ? 'two blocks' : 'one block';
    const blocksJa = blocks >= 2 ? '2ブロック' : '1ブロック';

    if (i === 0) {
      if (Math.abs(diff) > 2.35) {
        const textEn = `Turn around and go straight for ${blocksEn}.`;
        const textJa = `後ろを向いて、${blocksJa}まっすぐ進もう。`;
        stepsEn.push(textEn);
        stepsJa.push(textJa);
        stepsDetailed.push({
          stepIndex: stepCounter++,
          type: 'STRAIGHT',
          instructionEn: textEn,
          instructionJa: textJa,
          action: 'straight',
          blocks,
        });
      } else if (diff > 0.55) {
        const textEn = `Turn left and go straight for ${blocksEn}.`;
        const textJa = `左を向いて、${blocksJa}まっすぐ進もう。`;
        stepsEn.push(textEn);
        stepsJa.push(textJa);
        stepsDetailed.push({
          stepIndex: stepCounter++,
          type: 'STRAIGHT',
          instructionEn: textEn,
          instructionJa: textJa,
          action: 'turn_left',
          blocks,
        });
      } else if (diff < -0.55) {
        const textEn = `Turn right and go straight for ${blocksEn}.`;
        const textJa = `右を向いて、${blocksJa}まっすぐ進もう。`;
        stepsEn.push(textEn);
        stepsJa.push(textJa);
        stepsDetailed.push({
          stepIndex: stepCounter++,
          type: 'STRAIGHT',
          instructionEn: textEn,
          instructionJa: textJa,
          action: 'turn_right',
          blocks,
        });
      } else {
        const textEn = `Go straight for ${blocksEn}.`;
        const textJa = `${blocksJa}まっすぐ進もう。`;
        stepsEn.push(textEn);
        stepsJa.push(textJa);
        stepsDetailed.push({
          stepIndex: stepCounter++,
          type: 'STRAIGHT',
          instructionEn: textEn,
          instructionJa: textJa,
          action: 'straight',
          blocks,
        });
      }
    } else {
      const turnEn = diff > 0 ? 'left' : 'right';
      const turnJa = diff > 0 ? '左' : '右';
      const turnAction = diff > 0 ? 'turn_left' : 'turn_right';

      if (i === roadPointCount - 2 && segLen < 16) {
        const textEn = `Turn ${turnEn} at the corner.`;
        const textJa = `角を${turnJa}に曲がろう。`;
        stepsEn.push(textEn);
        stepsJa.push(textJa);
        stepsDetailed.push({
          stepIndex: stepCounter++,
          type: 'TURN',
          instructionEn: textEn,
          instructionJa: textJa,
          action: turnAction,
          landmark: 'corner',
        });
      } else {
        const textEn = `Turn ${turnEn} at the corner and go straight for ${blocksEn}.`;
        const textJa = `角を${turnJa}に曲がって、${blocksJa}まっすぐ進もう。`;
        stepsEn.push(textEn);
        stepsJa.push(textJa);
        stepsDetailed.push({
          stepIndex: stepCounter++,
          type: 'TURN',
          instructionEn: textEn,
          instructionJa: textJa,
          action: turnAction,
          blocks,
          landmark: 'corner',
        });
      }
    }

    curHeading = segAngle;
  }

  // Final side cue (is the building entrance on our left or right from our final road heading?)
  const lastRoadPt = path[path.length - 2];
  const entrancePt = path[path.length - 1];
  const toEntAngle = Math.atan2(entrancePt.x - lastRoadPt.x, entrancePt.z - lastRoadPt.z);
  let entDiff = toEntAngle - curHeading;
  while (entDiff > Math.PI) entDiff -= Math.PI * 2;
  while (entDiff < -Math.PI) entDiff += Math.PI * 2;

  const sideEn = entDiff >= 0 ? 'left' : 'right';
  const sideJa = entDiff >= 0 ? '左' : '右';
  const cornerNoteEn = target.isOnCorner ? 'on the corner, ' : '';
  const cornerNoteJa = target.isOnCorner ? '角の' : '';

  const textEn = `You can see it ${cornerNoteEn}on your ${sideEn}.`;
  const textJa = `${cornerNoteJa}${sideJa}側に見えてくるよ。`;
  stepsEn.push(textEn);
  stepsJa.push(textJa);
  stepsDetailed.push({
    stepIndex: stepCounter,
    type: 'ARRIVE',
    instructionEn: textEn,
    instructionJa: textJa,
    action: 'straight',
    side: sideEn as 'left' | 'right',
  });

  return { stepsEn, stepsJa, stepsDetailed };
}
