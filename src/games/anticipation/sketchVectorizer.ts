import { VocabularyItem } from '@data/types';

export interface SketchPoint {
  x: number; // Normalized 0..1
  y: number; // Normalized 0..1
}

export interface SketchVectorData {
  key: string;
  strokes: SketchPoint[][];
  dots: SketchPoint[];
  source: 'IMAGE_EDGE' | 'FALLBACK_VECTOR';
  pointCount: number;
}

const MAX_CACHE_ENTRIES = 60;
const vectorCache = new Map<string, SketchVectorData>();
const inflightRequests = new Map<string, Promise<SketchVectorData>>();

function setCachedVector(key: string, data: SketchVectorData) {
  if (vectorCache.size >= MAX_CACHE_ENTRIES) {
    const oldest = vectorCache.keys().next().value;
    if (oldest !== undefined) {
      vectorCache.delete(oldest);
    }
  }
  vectorCache.set(key, data);
}

// Perpendicular distance for Douglas-Peucker polyline simplification
function perpDistance(p: SketchPoint, a: SketchPoint, b: SketchPoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-8) {
    return Math.hypot(p.x - a.x, p.y - a.y);
  }
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

function simplifyPolyline(points: SketchPoint[], epsilon: number): SketchPoint[] {
  if (points.length <= 2) return points;
  let maxDist = 0;
  let maxIdx = 0;
  const first = points[0];
  const last = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const d = perpDistance(points[i], first, last);
    if (d > maxDist) {
      maxDist = d;
      maxIdx = i;
    }
  }

  if (maxDist > epsilon) {
    const left = simplifyPolyline(points.slice(0, maxIdx + 1), epsilon);
    const right = simplifyPolyline(points.slice(maxIdx), epsilon);
    return [...left.slice(0, -1), ...right];
  }
  return [first, last];
}

function extractDotsFromStrokes(strokes: SketchPoint[][], minCount = 12, maxCount = 20): SketchPoint[] {
  const candidates: SketchPoint[] = [];
  const allPoints: { pt: SketchPoint; strokeIdx: number; ptIdx: number }[] = [];

  for (let s = 0; s < strokes.length; s++) {
    const stroke = strokes[s];
    for (let i = 0; i < stroke.length; i++) {
      allPoints.push({ pt: stroke[i], strokeIdx: s, ptIdx: i });
    }
  }

  if (allPoints.length === 0) return [];

  // Prefer endpoints and high-curvature corners first
  const scored: { pt: SketchPoint; priority: number }[] = [];
  for (let s = 0; s < strokes.length; s++) {
    const stroke = strokes[s];
    const strokeWeight = Math.max(0.2, 1.0 - s * 0.08);
    for (let i = 0; i < stroke.length; i++) {
      const pt = stroke[i];
      if (i === 0 || i === stroke.length - 1) {
        scored.push({ pt, priority: 2.0 * strokeWeight });
      } else {
        const prev = stroke[i - 1];
        const next = stroke[i + 1];
        const v1x = pt.x - prev.x;
        const v1y = pt.y - prev.y;
        const v2x = next.x - pt.x;
        const v2y = next.y - pt.y;
        const n1 = Math.hypot(v1x, v1y) || 1e-5;
        const n2 = Math.hypot(v2x, v2y) || 1e-5;
        const dot = Math.max(-1, Math.min(1, (v1x * v2x + v1y * v2y) / (n1 * n2)));
        const cornerAngle = Math.acos(dot); // 0 = straight, PI = hairline turn
        scored.push({ pt, priority: (0.4 + cornerAngle) * strokeWeight });
      }
    }
  }

  scored.sort((a, b) => b.priority - a.priority);

  const tryPickWithSpacing = (minDist: number) => {
    const chosen: SketchPoint[] = [];
    for (const item of scored) {
      if (chosen.length >= maxCount) break;
      const tooClose = chosen.some((c) => Math.hypot(c.x - item.pt.x, c.y - item.pt.y) < minDist);
      if (!tooClose) {
        chosen.push(item.pt);
      }
    }
    return chosen;
  };

  let picked = tryPickWithSpacing(0.085);
  if (picked.length < minCount) {
    picked = tryPickWithSpacing(0.055);
  }
  if (picked.length < minCount) {
    picked = tryPickWithSpacing(0.032);
  }

  // Order dots using greedy nearest-neighbor loop starting from top-leftmost point
  if (picked.length <= 2) return picked;
  const remaining = [...picked];
  remaining.sort((a, b) => (a.y + a.x * 0.5) - (b.y + b.x * 0.5));
  const ordered: SketchPoint[] = [remaining.shift()!];

  while (remaining.length > 0) {
    const last = ordered[ordered.length - 1];
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = Math.hypot(remaining[i].x - last.x, remaining[i].y - last.y);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    ordered.push(remaining.splice(bestIdx, 1)[0]);
  }

  candidates.push(...ordered);
  return candidates;
}

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function makeCircleStroke(cx: number, cy: number, rx: number, ry: number, steps = 20, startAngle = 0, endAngle = Math.PI * 2): SketchPoint[] {
  const pts: SketchPoint[] = [];
  for (let i = 0; i <= steps; i++) {
    const a = startAngle + ((endAngle - startAngle) * i) / steps;
    pts.push({
      x: Math.max(0.06, Math.min(0.94, cx + Math.cos(a) * rx)),
      y: Math.max(0.06, Math.min(0.94, cy + Math.sin(a) * ry)),
    });
  }
  return pts;
}

function makePolyStroke(coords: [number, number][]): SketchPoint[] {
  return coords.map(([x, y]) => ({
    x: Math.max(0.06, Math.min(0.94, x)),
    y: Math.max(0.06, Math.min(0.94, y)),
  }));
}

/**
 * Rich, recognizable symbolic fallback artwork for any vocabulary item when offline/missing local PNGs
 * or during bare-clone remote tests. Keeps Anticipation crisp and engaging on every device.
 */
export function buildFallbackSketchVector(word: Partial<VocabularyItem> & { english: string }): SketchVectorData {
  const en = (word.english || 'english').trim().toLowerCase();
  const cat = (word.category || 'misc').toLowerCase();
  const strokes: SketchPoint[][] = [];

  // 1. Recognizable iconic motif matching common elementary vocabulary or MEXT CategoryKey prefixes
  if (/\b(apple|fruit|peach|orange|strawberry|tomato|cherry|lemon|melon)\b/.test(en) || cat.includes('food')) {
    if (en.includes('banana')) {
      strokes.push(makePolyStroke([[0.25, 0.72], [0.35, 0.78], [0.54, 0.75], [0.72, 0.58], [0.80, 0.34], [0.74, 0.22]]));
      strokes.push(makePolyStroke([[0.74, 0.22], [0.64, 0.42], [0.48, 0.58], [0.30, 0.64], [0.25, 0.72]]));
      strokes.push(makePolyStroke([[0.74, 0.22], [0.79, 0.16]]));
    } else if (en.includes('ice') || en.includes('cake') || en.includes('pudding')) {
      strokes.push(makeCircleStroke(0.5, 0.36, 0.18, 0.16, 16, Math.PI, Math.PI * 2));
      strokes.push(makePolyStroke([[0.32, 0.38], [0.68, 0.38], [0.50, 0.85], [0.32, 0.38]]));
      strokes.push(makePolyStroke([[0.40, 0.54], [0.60, 0.54]]));
      strokes.push(makePolyStroke([[0.44, 0.68], [0.56, 0.68]]));
    } else if (en.includes('pizza') || en.includes('sandwich')) {
      strokes.push(makePolyStroke([[0.22, 0.32], [0.78, 0.32], [0.50, 0.84], [0.22, 0.32]]));
      strokes.push(makePolyStroke([[0.22, 0.32], [0.34, 0.24], [0.66, 0.24], [0.78, 0.32]]));
      strokes.push(makeCircleStroke(0.45, 0.46, 0.05, 0.05, 10));
      strokes.push(makeCircleStroke(0.57, 0.50, 0.05, 0.05, 10));
      strokes.push(makeCircleStroke(0.50, 0.64, 0.045, 0.045, 10));
    } else {
      // Crisp apple / fruit silhouette
      strokes.push(makeCircleStroke(0.50, 0.56, 0.25, 0.24, 22));
      strokes.push(makePolyStroke([[0.50, 0.32], [0.52, 0.20], [0.56, 0.16]]));
      strokes.push(makePolyStroke([[0.52, 0.23], [0.66, 0.18], [0.70, 0.26], [0.58, 0.28], [0.52, 0.23]]));
      strokes.push(makeCircleStroke(0.40, 0.48, 0.04, 0.07, 8, -0.5, 1.4));
    }
  } else if (cat.includes('animal') || /\b(cat|dog|bear|rabbit|bird|fish|frog|panda|lion|elephant|monkey|penguin)\b/.test(en)) {
    if (en.includes('fish') || en.includes('shark') || en.includes('whale') || en.includes('dolphin')) {
      strokes.push(makePolyStroke([[0.18, 0.50], [0.38, 0.32], [0.66, 0.38], [0.84, 0.26], [0.78, 0.50], [0.84, 0.74], [0.66, 0.62], [0.38, 0.68], [0.18, 0.50]]));
      strokes.push(makeCircleStroke(0.32, 0.46, 0.035, 0.035, 10));
      strokes.push(makePolyStroke([[0.48, 0.34], [0.56, 0.22], [0.60, 0.36]]));
    } else if (en.includes('bird') || en.includes('eagle') || en.includes('owl') || en.includes('chicken') || en.includes('duck')) {
      strokes.push(makeCircleStroke(0.52, 0.56, 0.22, 0.18, 18));
      strokes.push(makeCircleStroke(0.38, 0.34, 0.12, 0.12, 14));
      strokes.push(makePolyStroke([[0.26, 0.34], [0.16, 0.38], [0.27, 0.42]]));
      strokes.push(makePolyStroke([[0.72, 0.50], [0.86, 0.42], [0.74, 0.62]]));
      strokes.push(makePolyStroke([[0.46, 0.74], [0.46, 0.86], [0.40, 0.88]]));
      strokes.push(makePolyStroke([[0.58, 0.74], [0.58, 0.86], [0.64, 0.88]]));
    } else {
      // Friendly animal portrait (ears, face, eyes, snout)
      strokes.push(makeCircleStroke(0.50, 0.54, 0.24, 0.22, 22));
      strokes.push(makePolyStroke([[0.28, 0.40], [0.26, 0.18], [0.42, 0.32]]));
      strokes.push(makePolyStroke([[0.72, 0.40], [0.74, 0.18], [0.58, 0.32]]));
      strokes.push(makeCircleStroke(0.41, 0.48, 0.03, 0.03, 10));
      strokes.push(makeCircleStroke(0.59, 0.48, 0.03, 0.03, 10));
      strokes.push(makePolyStroke([[0.46, 0.58], [0.54, 0.58], [0.50, 0.63], [0.46, 0.58]]));
      strokes.push(makePolyStroke([[0.42, 0.66], [0.50, 0.70], [0.58, 0.66]]));
    }
  } else if (cat.includes('stationery') || cat.includes('school') || /\b(pencil|pen|book|ruler|eraser|bag|scissors|notebook|desk|chair)\b/.test(en)) {
    if (en.includes('book') || en.includes('notebook') || en.includes('dictionary')) {
      strokes.push(makePolyStroke([[0.20, 0.26], [0.48, 0.30], [0.50, 0.76], [0.20, 0.72], [0.20, 0.26]]));
      strokes.push(makePolyStroke([[0.80, 0.26], [0.52, 0.30], [0.50, 0.76], [0.80, 0.72], [0.80, 0.26]]));
      strokes.push(makePolyStroke([[0.27, 0.40], [0.42, 0.42]]));
      strokes.push(makePolyStroke([[0.27, 0.52], [0.42, 0.54]]));
      strokes.push(makePolyStroke([[0.58, 0.42], [0.73, 0.40]]));
      strokes.push(makePolyStroke([[0.58, 0.54], [0.73, 0.52]]));
    } else {
      // Diagonal classic pencil
      strokes.push(makePolyStroke([[0.22, 0.78], [0.28, 0.60], [0.68, 0.20], [0.80, 0.32], [0.40, 0.72], [0.22, 0.78]]));
      strokes.push(makePolyStroke([[0.28, 0.60], [0.40, 0.72]]));
      strokes.push(makePolyStroke([[0.62, 0.26], [0.74, 0.38]]));
      strokes.push(makePolyStroke([[0.34, 0.66], [0.68, 0.32]]));
    }
  } else if (cat.includes('weather') || cat.includes('nature') || /\b(sun|sunny|rain|rainy|cloud|cloudy|snow|snowy|flower|tree|star|moon|mountain)\b/.test(en)) {
    if (en.includes('sun')) {
      strokes.push(makeCircleStroke(0.50, 0.50, 0.17, 0.17, 20));
      for (let i = 0; i < 8; i++) {
        const a = (Math.PI * 2 * i) / 8;
        strokes.push(makePolyStroke([
          [0.50 + Math.cos(a) * 0.23, 0.50 + Math.sin(a) * 0.23],
          [0.50 + Math.cos(a) * 0.34, 0.50 + Math.sin(a) * 0.34],
        ]));
      }
    } else if (en.includes('cloud') || en.includes('rain') || en.includes('snow')) {
      strokes.push(makeCircleStroke(0.36, 0.46, 0.14, 0.12, 14, Math.PI * 0.6, Math.PI * 1.9));
      strokes.push(makeCircleStroke(0.52, 0.38, 0.16, 0.15, 14, Math.PI * 0.9, Math.PI * 2.1));
      strokes.push(makeCircleStroke(0.67, 0.48, 0.13, 0.11, 12, -Math.PI * 0.4, Math.PI * 0.5));
      strokes.push(makePolyStroke([[0.24, 0.58], [0.76, 0.58]]));
      if (en.includes('rain')) {
        strokes.push(makePolyStroke([[0.36, 0.66], [0.32, 0.78]]));
        strokes.push(makePolyStroke([[0.50, 0.66], [0.46, 0.78]]));
        strokes.push(makePolyStroke([[0.64, 0.66], [0.60, 0.78]]));
      }
    } else if (en.includes('flower')) {
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI * 2 * i) / 6;
        strokes.push(makeCircleStroke(0.50 + Math.cos(a) * 0.16, 0.42 + Math.sin(a) * 0.16, 0.09, 0.09, 12));
      }
      strokes.push(makeCircleStroke(0.50, 0.42, 0.07, 0.07, 12));
      strokes.push(makePolyStroke([[0.50, 0.58], [0.50, 0.86]]));
      strokes.push(makePolyStroke([[0.50, 0.72], [0.66, 0.64], [0.62, 0.76], [0.50, 0.72]]));
    } else {
      // Mountain & sun
      strokes.push(makePolyStroke([[0.14, 0.76], [0.40, 0.30], [0.66, 0.76], [0.14, 0.76]]));
      strokes.push(makePolyStroke([[0.48, 0.76], [0.68, 0.42], [0.86, 0.76], [0.48, 0.76]]));
      strokes.push(makeCircleStroke(0.76, 0.24, 0.08, 0.08, 12));
    }
  } else if (/\b(hot|cold|warm|cool|happy|sad|angry|sleepy|tired|hungry|thirsty|fine|good|great)\b/.test(en) || cat.includes('state')) {
    if (/\b(hot|warm|sunny)\b/.test(en)) {
      strokes.push(makeCircleStroke(0.50, 0.50, 0.16, 0.16, 20));
      for (let i = 0; i < 8; i++) {
        const a = (Math.PI * 2 * i) / 8;
        strokes.push(makePolyStroke([
          [0.50 + Math.cos(a) * 0.22, 0.50 + Math.sin(a) * 0.22],
          [0.50 + Math.cos(a) * 0.34, 0.50 + Math.sin(a) * 0.34],
        ]));
      }
      strokes.push(makePolyStroke([[0.36, 0.80], [0.44, 0.75], [0.52, 0.80], [0.60, 0.75], [0.68, 0.80]]));
    } else if (/\b(cold|snow|freezing)\b/.test(en)) {
      for (let i = 0; i < 3; i++) {
        const a = (Math.PI * i) / 3;
        strokes.push(makePolyStroke([
          [0.50 - Math.cos(a) * 0.28, 0.50 - Math.sin(a) * 0.28],
          [0.50 + Math.cos(a) * 0.28, 0.50 + Math.sin(a) * 0.28],
        ]));
      }
      strokes.push(makeCircleStroke(0.50, 0.50, 0.10, 0.10, 14));
    } else {
      // Expressive face portrait matching emotion state
      strokes.push(makeCircleStroke(0.50, 0.52, 0.26, 0.26, 24));
      strokes.push(makeCircleStroke(0.41, 0.46, 0.03, 0.03, 10));
      strokes.push(makeCircleStroke(0.59, 0.46, 0.03, 0.03, 10));
      if (en.includes('angry')) {
        strokes.push(makePolyStroke([[0.34, 0.38], [0.46, 0.42]]));
        strokes.push(makePolyStroke([[0.66, 0.38], [0.54, 0.42]]));
        strokes.push(makePolyStroke([[0.40, 0.66], [0.50, 0.58], [0.60, 0.66]]));
      } else if (/\b(sad|hungry|tired|sleepy)\b/.test(en)) {
        strokes.push(makePolyStroke([[0.40, 0.66], [0.50, 0.60], [0.60, 0.66]]));
      } else {
        strokes.push(makeCircleStroke(0.50, 0.52, 0.14, 0.12, 14, 0.25, Math.PI - 0.25));
      }
    }
  } else if (/\b(balloon|cake|gift|present|party|star|tree|christmas|halloween)\b/.test(en) || cat.includes('festal')) {
    if (en.includes('balloon')) {
      strokes.push(makeCircleStroke(0.50, 0.38, 0.20, 0.24, 22));
      strokes.push(makePolyStroke([[0.47, 0.62], [0.53, 0.62], [0.50, 0.66], [0.47, 0.62]]));
      strokes.push(makePolyStroke([[0.50, 0.66], [0.45, 0.74], [0.54, 0.81], [0.48, 0.89]]));
    } else {
      strokes.push(makePolyStroke([[0.24, 0.46], [0.76, 0.46], [0.76, 0.80], [0.24, 0.80], [0.24, 0.46]]));
      strokes.push(makePolyStroke([[0.50, 0.46], [0.50, 0.80]]));
      strokes.push(makePolyStroke([[0.24, 0.62], [0.76, 0.62]]));
      strokes.push(makeCircleStroke(0.42, 0.38, 0.08, 0.08, 12));
      strokes.push(makeCircleStroke(0.58, 0.38, 0.08, 0.08, 12));
    }
  } else if (cat.includes('sport') || /\b(soccer|basketball|baseball|tennis|ball|swim|run|music|piano|guitar)\b/.test(en)) {
    if (/\b(music|piano|guitar|sing)\b/.test(en)) {
      strokes.push(makeCircleStroke(0.38, 0.68, 0.10, 0.08, 14));
      strokes.push(makeCircleStroke(0.66, 0.62, 0.10, 0.08, 14));
      strokes.push(makePolyStroke([[0.46, 0.66], [0.46, 0.28], [0.74, 0.22], [0.74, 0.60]]));
      strokes.push(makePolyStroke([[0.46, 0.36], [0.74, 0.30]]));
    } else {
      strokes.push(makeCircleStroke(0.50, 0.50, 0.28, 0.28, 24));
      strokes.push(makePolyStroke([[0.50, 0.22], [0.50, 0.78]]));
      strokes.push(makePolyStroke([[0.22, 0.50], [0.78, 0.50]]));
      strokes.push(makeCircleStroke(0.50, 0.50, 0.13, 0.26, 14, -Math.PI * 0.45, Math.PI * 0.45));
      strokes.push(makeCircleStroke(0.50, 0.50, 0.13, 0.26, 14, Math.PI * 0.55, Math.PI * 1.45));
    }
  } else if (cat.includes('facility') || cat.includes('place') || cat.includes('building') || cat.includes('vehicle') || /\b(school|park|hospital|station|library|house|car|bus|train|bike|plane|rocket|ship)\b/.test(en)) {
    if (/\b(car|bus|train|bike)\b/.test(en)) {
      strokes.push(makePolyStroke([[0.18, 0.60], [0.22, 0.42], [0.36, 0.30], [0.64, 0.30], [0.76, 0.44], [0.84, 0.48], [0.84, 0.62], [0.18, 0.62], [0.18, 0.60]]));
      strokes.push(makeCircleStroke(0.32, 0.66, 0.09, 0.09, 14));
      strokes.push(makeCircleStroke(0.68, 0.66, 0.09, 0.09, 14));
      strokes.push(makePolyStroke([[0.38, 0.34], [0.62, 0.34], [0.68, 0.44], [0.32, 0.44], [0.38, 0.34]]));
    } else {
      // Town building / house
      strokes.push(makePolyStroke([[0.22, 0.46], [0.50, 0.20], [0.78, 0.46], [0.22, 0.46]]));
      strokes.push(makePolyStroke([[0.26, 0.46], [0.26, 0.80], [0.74, 0.80], [0.74, 0.46]]));
      strokes.push(makePolyStroke([[0.44, 0.80], [0.44, 0.56], [0.56, 0.56], [0.56, 0.80]]));
      strokes.push(makePolyStroke([[0.32, 0.56], [0.40, 0.56], [0.40, 0.64], [0.32, 0.64], [0.32, 0.56]]));
      strokes.push(makePolyStroke([[0.60, 0.56], [0.68, 0.56], [0.68, 0.64], [0.60, 0.64], [0.60, 0.56]]));
    }
  } else if (cat.includes('calendar') || /\b(time|clock|o'clock|hour|watch|morning|night)\b/.test(en)) {
    strokes.push(makeCircleStroke(0.50, 0.50, 0.28, 0.28, 24));
    strokes.push(makePolyStroke([[0.50, 0.50], [0.50, 0.30]]));
    strokes.push(makePolyStroke([[0.50, 0.50], [0.66, 0.56]]));
    for (let i = 0; i < 4; i++) {
      const a = (Math.PI * 2 * i) / 4;
      strokes.push(makePolyStroke([
        [0.50 + Math.cos(a) * 0.22, 0.50 + Math.sin(a) * 0.22],
        [0.50 + Math.cos(a) * 0.26, 0.50 + Math.sin(a) * 0.26],
      ]));
    }
  } else {
    // Procedural geometric emblem + sparkle frame seeded cleanly by the word
    const seed = hashSeed(`${en}:${word.id || ''}`);
    const sides = 5 + (seed % 3);
    const rotOffset = ((seed >> 4) % 360) * (Math.PI / 180);
    const outerPts: [number, number][] = [];
    for (let i = 0; i <= sides; i++) {
      const a = rotOffset + (Math.PI * 2 * i) / sides;
      outerPts.push([0.5 + Math.cos(a) * 0.28, 0.5 + Math.sin(a) * 0.28]);
    }
    strokes.push(makePolyStroke(outerPts));
    const innerPts: [number, number][] = [];
    for (let i = 0; i <= sides; i++) {
      const a = rotOffset + Math.PI / sides + (Math.PI * 2 * i) / sides;
      innerPts.push([0.5 + Math.cos(a) * 0.16, 0.5 + Math.sin(a) * 0.16]);
    }
    strokes.push(makePolyStroke(innerPts));
    strokes.push(makeCircleStroke(0.5, 0.5, 0.08, 0.08, 12));
    // Connect outer corners inward so drawing progresses symmetrically
    for (let i = 0; i < Math.min(4, sides); i++) {
      const a = rotOffset + (Math.PI * 2 * i) / sides;
      strokes.push(makePolyStroke([
        [0.5 + Math.cos(a) * 0.28, 0.5 + Math.sin(a) * 0.28],
        [0.5 + Math.cos(a) * 0.11, 0.5 + Math.sin(a) * 0.11],
      ]));
    }
  }

  const dots = extractDotsFromStrokes(strokes, 10, 18);
  const pointCount = strokes.reduce((acc, s) => acc + s.length, 0);
  return {
    key: `fallback:${en}`,
    strokes,
    dots,
    source: 'FALLBACK_VECTOR',
    pointCount,
  };
}

const NEIGHBOR_DX = [1, 1, 0, -1, -1, -1, 0, 1];
const NEIGHBOR_DY = [0, 1, 1, 1, 0, -1, -1, -1];

function extractEdgeStrokesFromImage(img: HTMLImageElement): SketchVectorData | null {
  const MAX_DIM = 144; // Strictly within <=256x256 CPU pixel budget in GEMINI.md §5
  const natW = img.naturalWidth || img.width || 128;
  const natH = img.naturalHeight || img.height || 128;
  const scale = Math.min(MAX_DIM / Math.max(1, natW), MAX_DIM / Math.max(1, natH));
  const w = Math.max(48, Math.round(natW * scale));
  const h = Math.max(48, Math.round(natH * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);

  let pixels: Uint8ClampedArray;
  try {
    pixels = ctx.getImageData(0, 0, w, h).data;
  } catch {
    return null;
  }

  const total = w * h;
  const luma = new Float32Array(total);
  const alpha = new Float32Array(total);

  for (let i = 0; i < total; i++) {
    const idx = i * 4;
    const a = pixels[idx + 3] / 255;
    alpha[i] = a;
    // Composite over white canvas so transparent silhouettes have clean luminance contrast
    const r = pixels[idx] * a + 255 * (1 - a);
    const g = pixels[idx + 1] * a + 255 * (1 - a);
    const b = pixels[idx + 2] * a + 255 * (1 - a);
    luma[i] = 0.299 * r + 0.587 * g + 0.114 * b;
  }

  // Sobel gradient magnitude + direction
  const gradMag = new Float32Array(total);
  const gradGx = new Float32Array(total);
  const gradGy = new Float32Array(total);
  let maxGrad = 0;

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const p = y * w + x;
      const tl = luma[p - w - 1];
      const tc = luma[p - w];
      const tr = luma[p - w + 1];
      const ml = luma[p - 1];
      const mr = luma[p + 1];
      const bl = luma[p + w - 1];
      const bc = luma[p + w];
      const br = luma[p + w + 1];

      const gx = -tl + tr - 2 * ml + 2 * mr - bl + br;
      const gy = -tl - 2 * tc - tr + bl + 2 * bc + br;
      const mag = Math.hypot(gx, gy);
      gradGx[p] = gx;
      gradGy[p] = gy;
      gradMag[p] = mag;
      if (mag > maxGrad) maxGrad = mag;
    }
  }

  if (maxGrad < 18) return null;

  // Edge thinning (Non-maximum suppression) + adaptive threshold
  const threshold = Math.max(38, maxGrad * 0.14);
  const edgeMap = new Uint8Array(total);
  let edgeCount = 0;

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const p = y * w + x;
      const mag = gradMag[p];
      if (mag < threshold) continue;

      const angle = (Math.atan2(gradGy[p], gradGx[p]) * 180) / Math.PI;
      const normAngle = angle < 0 ? angle + 180 : angle;

      let n1 = 0;
      let n2 = 0;
      if ((normAngle >= 0 && normAngle < 22.5) || (normAngle >= 157.5 && normAngle <= 180)) {
        n1 = gradMag[p - 1];
        n2 = gradMag[p + 1];
      } else if (normAngle >= 22.5 && normAngle < 67.5) {
        n1 = gradMag[p - w + 1];
        n2 = gradMag[p + w - 1];
      } else if (normAngle >= 67.5 && normAngle < 112.5) {
        n1 = gradMag[p - w];
        n2 = gradMag[p + w];
      } else {
        n1 = gradMag[p - w - 1];
        n2 = gradMag[p + w + 1];
      }

      if (mag >= n1 && mag >= n2) {
        edgeMap[p] = 1;
        edgeCount++;
      }
    }
  }

  if (edgeCount < 24) return null;

  // Trace directional contours into normalized polylines inside [0.06, 0.94] padded box
  const visited = new Uint8Array(total);
  const rawStrokes: SketchPoint[][] = [];
  const scaleNorm = 0.86 / Math.max(w, h);
  const offsetX = (1 - w * scaleNorm) / 2;
  const offsetY = (1 - h * scaleNorm) / 2;

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const startP = y * w + x;
      if (!edgeMap[startP] || visited[startP]) continue;

      const chain: SketchPoint[] = [];
      let cx = x;
      let cy = y;
      let prevDir = -1;

      while (true) {
        const cp = cy * w + cx;
        visited[cp] = 1;
        chain.push({
          x: offsetX + cx * scaleNorm,
          y: offsetY + cy * scaleNorm,
        });

        let bestNextDir = -1;
        let bestScore = -1;
        for (let d = 0; d < 8; d++) {
          const nx = cx + NEIGHBOR_DX[d];
          const ny = cy + NEIGHBOR_DY[d];
          if (nx <= 0 || nx >= w - 1 || ny <= 0 || ny >= h - 1) continue;
          const np = ny * w + nx;
          if (!edgeMap[np] || visited[np]) continue;

          // Prefer smooth continuation of previous heading
          const dirPenalty = prevDir === -1 ? 0 : Math.min(Math.abs(d - prevDir), 8 - Math.abs(d - prevDir));
          const score = 100 - dirPenalty * 18 + gradMag[np] * 0.04;
          if (score > bestScore) {
            bestScore = score;
            bestNextDir = d;
          }
        }

        if (bestNextDir === -1) break;
        cx += NEIGHBOR_DX[bestNextDir];
        cy += NEIGHBOR_DY[bestNextDir];
        prevDir = bestNextDir;
        if (chain.length >= 220) break;
      }

      if (chain.length >= 4) {
        const simplified = simplifyPolyline(chain, 0.011);
        if (simplified.length >= 2) {
          rawStrokes.push(simplified);
        }
      }
    }
  }

  if (rawStrokes.length < 2) return null;

  // Sort longer structural strokes first, cap point count for crisp 60fps mobile drawing
  const strokeLengths = rawStrokes.map((s) => {
    let len = 0;
    for (let i = 1; i < s.length; i++) {
      len += Math.hypot(s[i].x - s[i - 1].x, s[i].y - s[i - 1].y);
    }
    return { s, len };
  });
  strokeLengths.sort((a, b) => b.len - a.len);

  const strokes: SketchPoint[][] = [];
  let pointCount = 0;
  for (const item of strokeLengths) {
    if (strokes.length >= 42 || pointCount >= 620) break;
    strokes.push(item.s);
    pointCount += item.s.length;
  }

  const dots = extractDotsFromStrokes(strokes, 12, 20);
  return {
    key: 'edge',
    strokes,
    dots,
    source: 'IMAGE_EDGE',
    pointCount,
  };
}

export async function generateSketchVector(
  word: Partial<VocabularyItem> & { english: string },
  imageUrl: string | null | undefined
): Promise<SketchVectorData> {
  const cleanUrl = (imageUrl || '').trim();
  const cacheKey = `${cleanUrl || 'none'}::${word.english.toLowerCase()}`;

  const cached = vectorCache.get(cacheKey);
  if (cached) return cached;

  const existingPromise = inflightRequests.get(cacheKey);
  if (existingPromise) return existingPromise;

  const task = new Promise<SketchVectorData>((resolve) => {
    if (!cleanUrl || typeof window === 'undefined' || typeof Image === 'undefined') {
      const fb = buildFallbackSketchVector(word);
      setCachedVector(cacheKey, fb);
      resolve(fb);
      return;
    }

    let settled = false;
    const finish = (data: SketchVectorData) => {
      if (settled) return;
      settled = true;
      inflightRequests.delete(cacheKey);
      setCachedVector(cacheKey, data);
      resolve(data);
    };

    const timeout = setTimeout(() => {
      finish(buildFallbackSketchVector(word));
    }, 3200);

    const img = new Image();
    if (!cleanUrl.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => {
      clearTimeout(timeout);
      try {
        const extracted = extractEdgeStrokesFromImage(img);
        if (extracted && extracted.strokes.length >= 2) {
          finish({ ...extracted, key: cacheKey });
          return;
        }
      } catch {
        // Fallback smoothly on CORS / Canvas errors
      }
      finish(buildFallbackSketchVector(word));
    };
    img.onerror = () => {
      clearTimeout(timeout);
      finish(buildFallbackSketchVector(word));
    };
    img.src = cleanUrl;
  });

  inflightRequests.set(cacheKey, task);
  return task;
}
