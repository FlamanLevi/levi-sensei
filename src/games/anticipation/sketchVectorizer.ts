import { VocabularyItem } from '@data/types';
import { resolveCuratedNesStrokes } from './nesVectorBank';

export interface SketchPoint {
  x: number; // Normalized 0..1
  y: number; // Normalized 0..1
}

export interface SketchVectorData {
  key: string;
  strokes: SketchPoint[][];
  dots: SketchPoint[];
  source: 'NES_CURATED' | 'IMAGE_SILHOUETTE' | 'FALLBACK_VECTOR';
  pointCount: number;
}

const MAX_CACHE_ENTRIES = 80;
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

/**
 * Encodes normalized strokes into a compact anonymous string (0..99 int coords)
 * so Host RTDB rounds can broadcast exact NES silhouette geometry to student iPads
 * without leaking plaintext English words.
 */
export function encodeCompactStrokes(strokes: SketchPoint[][]): string {
  return strokes
    .filter((s) => s.length >= 2)
    .map((s) =>
      s
        .map((p) => `${Math.round(p.x * 99)},${Math.round(p.y * 99)}`)
        .join(';')
    )
    .join('|');
}

export function decodeCompactStrokes(encoded?: string | null): SketchPoint[][] | null {
  if (!encoded || !encoded.trim()) return null;
  try {
    const strokes: SketchPoint[][] = encoded
      .split('|')
      .map((seg) =>
        seg
          .split(';')
          .map((pair) => {
            const [xs, ys] = pair.split(',');
            const x = Number(xs) / 99;
            const y = Number(ys) / 99;
            return {
              x: Math.max(0.05, Math.min(0.95, Number.isFinite(x) ? x : 0.5)),
              y: Math.max(0.05, Math.min(0.95, Number.isFinite(y) ? y : 0.5)),
            };
          })
          .filter((_, idx, arr) => arr.length >= 2)
      )
      .filter((s) => s.length >= 2);
    return strokes.length > 0 ? strokes : null;
  } catch {
    return null;
  }
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

/**
 * Extracts clean guide dots directly along the polygonal vertices of each stroke
 * (preserving sequential corner order like NES Anticipation pearl dots in image.png / image_2.png,
 * deduplicating near-overlapping endpoints so dots stay readable).
 */
function extractDotsFromStrokes(strokes: SketchPoint[][], maxDots = 24): SketchPoint[] {
  const dots: SketchPoint[] = [];
  const minSpacing = 0.046;

  for (const stroke of strokes) {
    for (let i = 0; i < stroke.length; i++) {
      if (dots.length >= maxDots) break;
      const pt = stroke[i];
      const tooClose = dots.some((d) => Math.hypot(d.x - pt.x, d.y - pt.y) < minSpacing);
      if (!tooClose) {
        dots.push(pt);
      }
    }
    if (dots.length >= maxDots) break;
  }

  return dots;
}

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function makeCircleStroke(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  steps = 10,
  startAngle = 0,
  endAngle = Math.PI * 2
): SketchPoint[] {
  const pts: SketchPoint[] = [];
  for (let i = 0; i <= steps; i++) {
    const a = startAngle + ((endAngle - startAngle) * i) / steps;
    pts.push({
      x: Math.max(0.08, Math.min(0.92, cx + Math.cos(a) * rx)),
      y: Math.max(0.08, Math.min(0.92, cy + Math.sin(a) * ry)),
    });
  }
  return pts;
}

function makePolyStroke(coords: [number, number][]): SketchPoint[] {
  return coords.map(([x, y]) => ({
    x: Math.max(0.08, Math.min(0.92, x)),
    y: Math.max(0.08, Math.min(0.92, y)),
  }));
}

/**
 * Low-vertex geometric NES fallback vector for abstract/unlisted vocabulary when offline
 * or when image CORS/fetch fails.
 */
export function buildFallbackSketchVector(
  word: Partial<VocabularyItem> & { english: string }
): SketchVectorData {
  const en = (word.english || 'english').trim().toLowerCase();
  const curated = resolveCuratedNesStrokes(word.english);
  if (curated && curated.length > 0) {
    return {
      key: `nes:${en}`,
      strokes: curated,
      dots: extractDotsFromStrokes(curated),
      source: 'NES_CURATED',
      pointCount: curated.reduce((acc, s) => acc + s.length, 0),
    };
  }

  const cat = (word.category || 'misc').toLowerCase();
  const strokes: SketchPoint[][] = [];

  if (cat.includes('food')) {
    strokes.push(makePolyStroke([[0.22, 0.34], [0.78, 0.34], [0.50, 0.84], [0.22, 0.34]]));
    strokes.push(makePolyStroke([[0.22, 0.34], [0.34, 0.24], [0.66, 0.24], [0.78, 0.34]]));
  } else if (cat.includes('animal')) {
    strokes.push(makeCircleStroke(0.50, 0.54, 0.24, 0.22, 10));
    strokes.push(makePolyStroke([[0.28, 0.40], [0.26, 0.18], [0.42, 0.32]]));
    strokes.push(makePolyStroke([[0.72, 0.40], [0.74, 0.18], [0.58, 0.32]]));
    strokes.push(makePolyStroke([[0.46, 0.58], [0.54, 0.58], [0.50, 0.64], [0.46, 0.58]]));
  } else if (cat.includes('school')) {
    strokes.push(makePolyStroke([[0.20, 0.28], [0.50, 0.34], [0.80, 0.28], [0.80, 0.74], [0.50, 0.80], [0.20, 0.74], [0.20, 0.28]]));
    strokes.push(makePolyStroke([[0.50, 0.34], [0.50, 0.80]]));
  } else if (cat.includes('sport') || cat.includes('action')) {
    strokes.push(makeCircleStroke(0.50, 0.50, 0.26, 0.26, 12));
    strokes.push(makePolyStroke([[0.24, 0.50], [0.76, 0.50]]));
    strokes.push(makePolyStroke([[0.50, 0.24], [0.50, 0.76]]));
  } else if (cat.includes('calendar') || cat.includes('time')) {
    strokes.push(makeCircleStroke(0.50, 0.50, 0.26, 0.26, 12));
    strokes.push(makePolyStroke([[0.50, 0.50], [0.50, 0.30]]));
    strokes.push(makePolyStroke([[0.50, 0.50], [0.66, 0.56]]));
  } else if (cat.includes('facility') || cat.includes('place')) {
    strokes.push(makePolyStroke([[0.20, 0.46], [0.50, 0.20], [0.80, 0.46], [0.20, 0.46]]));
    strokes.push(makePolyStroke([[0.26, 0.46], [0.26, 0.80], [0.74, 0.80], [0.74, 0.46]]));
    strokes.push(makePolyStroke([[0.44, 0.80], [0.44, 0.58], [0.56, 0.58], [0.56, 0.80]]));
  } else {
    // Low-vertex geometric crest fallback
    const seed = hashSeed(`${en}:${word.id || ''}`);
    const sides = 5 + (seed % 3);
    const rotOffset = ((seed >> 4) % 360) * (Math.PI / 180);
    const outerPts: [number, number][] = [];
    for (let i = 0; i <= sides; i++) {
      const a = rotOffset + (Math.PI * 2 * i) / sides;
      outerPts.push([0.5 + Math.cos(a) * 0.28, 0.5 + Math.sin(a) * 0.28]);
    }
    strokes.push(makePolyStroke(outerPts));
    strokes.push(makeCircleStroke(0.5, 0.5, 0.12, 0.12, 6));
  }

  return {
    key: `fallback:${en}`,
    strokes,
    dots: extractDotsFromStrokes(strokes),
    source: 'FALLBACK_VECTOR',
    pointCount: strokes.reduce((acc, s) => acc + s.length, 0),
  };
}

// 8-connectivity directions in clockwise order for Moore neighbor boundary tracing
const MOORE_DX = [1, 1, 0, -1, -1, -1, 0, 1];
const MOORE_DY = [0, 1, 1, 1, 0, -1, -1, -1];

/**
 * 64x64 Corner Flood-Fill Outer-Silhouette Extractor (< 256x256 CPU budget per GEMINI.md §5).
 * Deliberately ignores internal anime eyes, shading, and thin cartoon details — producing
 * bold 8-to-28-vertex 1988 NES-style silhouette outlines for unlisted image assets.
 */
function extractOuterSilhouetteFromImage(img: HTMLImageElement): SketchVectorData | null {
  const GRID = 64;
  const natW = img.naturalWidth || img.width || 64;
  const natH = img.naturalHeight || img.height || 64;
  const scale = Math.min((GRID - 4) / Math.max(1, natW), (GRID - 4) / Math.max(1, natH));
  const drawW = Math.max(16, Math.round(natW * scale));
  const drawH = Math.max(16, Math.round(natH * scale));
  const dx = Math.floor((GRID - drawW) / 2);
  const dy = Math.floor((GRID - drawH) / 2);

  const canvas = document.createElement('canvas');
  canvas.width = GRID;
  canvas.height = GRID;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  ctx.clearRect(0, 0, GRID, GRID);
  ctx.drawImage(img, dx, dy, drawW, drawH);

  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, GRID, GRID).data;
  } catch {
    return null;
  }

  const total = GRID * GRID;
  // Determine corner paper background color (avg of 4 corners if opaque)
  const bgR = data[0];
  const bgG = data[1];
  const bgB = data[2];

  const isBgCandidate = (idx: number): boolean => {
    const p = idx * 4;
    const a = data[p + 3];
    if (a < 45) return true;
    const dist =
      Math.abs(data[p] - bgR) +
      Math.abs(data[p + 1] - bgG) +
      Math.abs(data[p + 2] - bgB);
    return dist < 44;
  };

  // BFS Flood fill from all 4 outer borders
  const isBackground = new Uint8Array(total);
  const queue = new Int32Array(total);
  let qHead = 0;
  let qTail = 0;

  const pushIfBg = (x: number, y: number) => {
    const idx = y * GRID + x;
    if (isBackground[idx]) return;
    if (isBgCandidate(idx)) {
      isBackground[idx] = 1;
      queue[qTail++] = idx;
    }
  };

  for (let x = 0; x < GRID; x++) {
    pushIfBg(x, 0);
    pushIfBg(x, GRID - 1);
  }
  for (let y = 1; y < GRID - 1; y++) {
    pushIfBg(0, y);
    pushIfBg(GRID - 1, y);
  }

  while (qHead < qTail) {
    const curr = queue[qHead++];
    const cx = curr % GRID;
    const cy = Math.floor(curr / GRID);
    if (cx > 0) pushIfBg(cx - 1, cy);
    if (cx < GRID - 1) pushIfBg(cx + 1, cy);
    if (cy > 0) pushIfBg(cx, cy - 1);
    if (cy < GRID - 1) pushIfBg(cx, cy + 1);
  }

  // Foreground mask + single 3x3 majority despeckle pass
  const fgRaw = new Uint8Array(total);
  for (let i = 0; i < total; i++) {
    fgRaw[i] = isBackground[i] ? 0 : 1;
  }

  const fg = new Uint8Array(total);
  let fgCount = 0;
  for (let y = 1; y < GRID - 1; y++) {
    for (let x = 1; x < GRID - 1; x++) {
      const idx = y * GRID + x;
      let sum = 0;
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          sum += fgRaw[(y + oy) * GRID + (x + ox)];
        }
      }
      if (fgRaw[idx] === 1 && sum >= 3) {
        fg[idx] = 1;
        fgCount++;
      } else if (fgRaw[idx] === 0 && sum >= 6) {
        fg[idx] = 1;
        fgCount++;
      }
    }
  }

  if (fgCount < 28) return null;

  // Trace outer boundary pixels (foreground pixels that touch background 4-neighbors)
  const boundaryVisited = new Uint8Array(total);
  const rawContours: { x: number; y: number }[][] = [];

  for (let y = 1; y < GRID - 1; y++) {
    for (let x = 1; x < GRID - 1; x++) {
      const idx = y * GRID + x;
      if (!fg[idx] || boundaryVisited[idx]) continue;
      const touchesBg = !fg[idx - 1] || !fg[idx + 1] || !fg[idx - GRID] || !fg[idx + GRID];
      if (!touchesBg) continue;

      const chain: { x: number; y: number }[] = [];
      let cx = x;
      let cy = y;
      let prevDir = 0;

      for (let step = 0; step < 300; step++) {
        const cIdx = cy * GRID + cx;
        boundaryVisited[cIdx] = 1;
        chain.push({ x: cx, y: cy });

        let bestNext = -1;
        // Scan 8 neighbors in CCW preference to walk outer contour cleanly
        for (let k = 0; k < 8; k++) {
          const dir = (prevDir + 6 + k) % 8;
          const nx = cx + MOORE_DX[dir];
          const ny = cy + MOORE_DY[dir];
          if (nx <= 0 || nx >= GRID - 1 || ny <= 0 || ny >= GRID - 1) continue;
          const nIdx = ny * GRID + nx;
          if (!fg[nIdx] || boundaryVisited[nIdx]) continue;
          const nTouchesBg = !fg[nIdx - 1] || !fg[nIdx + 1] || !fg[nIdx - GRID] || !fg[nIdx + GRID];
          if (nTouchesBg) {
            bestNext = dir;
            break;
          }
        }

        if (bestNext === -1) break;
        cx += MOORE_DX[bestNext];
        cy += MOORE_DY[bestNext];
        prevDir = bestNext;
      }

      if (chain.length >= 10) {
        rawContours.push(chain);
      }
    }
  }

  if (rawContours.length === 0) return null;

  // Find bounding box across top contours to rescale tightly into [0.10, 0.90] square
  rawContours.sort((a, b) => b.length - a.length);
  const keptRaw = rawContours.slice(0, 2);

  let minX = GRID;
  let maxX = 0;
  let minY = GRID;
  let maxY = 0;
  for (const cont of keptRaw) {
    for (const p of cont) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
  }

  const span = Math.max(8, maxX - minX, maxY - minY);
  const scaleNorm = 0.78 / span;
  const offX = 0.5 - ((minX + maxX) * 0.5) * scaleNorm;
  const offY = 0.5 - ((minY + maxY) * 0.5) * scaleNorm;

  let epsilon = 0.044;
  let strokes: SketchPoint[][] = [];

  for (let pass = 0; pass < 3; pass++) {
    strokes = keptRaw
      .map((cont) => {
        const normalized: SketchPoint[] = cont.map((p) => ({
          x: Math.max(0.06, Math.min(0.94, +(offX + p.x * scaleNorm).toFixed(3))),
          y: Math.max(0.06, Math.min(0.94, +(offY + p.y * scaleNorm).toFixed(3))),
        }));
        // Close loop if ends are reasonably close so outer silhouettes complete cleanly
        const first = normalized[0];
        const last = normalized[normalized.length - 1];
        if (Math.hypot(last.x - first.x, last.y - first.y) < 0.14) {
          normalized.push({ ...first });
        }
        return simplifyPolyline(normalized, epsilon);
      })
      .filter((s) => s.length >= 3);

    const totalPts = strokes.reduce((acc, s) => acc + s.length, 0);
    if (totalPts <= 28) break;
    epsilon += 0.014;
  }

  if (strokes.length === 0) return null;

  const dots = extractDotsFromStrokes(strokes);
  const pointCount = strokes.reduce((acc, s) => acc + s.length, 0);
  return {
    key: 'silhouette',
    strokes,
    dots,
    source: 'IMAGE_SILHOUETTE',
    pointCount,
  };
}

export async function generateSketchVector(
  word: Partial<VocabularyItem> & { english: string },
  imageUrl: string | null | undefined,
  precomputedEncoded?: string | null
): Promise<SketchVectorData> {
  const cleanUrl = (imageUrl || '').trim();
  const cacheKey = `${precomputedEncoded ? 'vec' : cleanUrl || 'none'}::${word.english.toLowerCase()}`;

  const cached = vectorCache.get(cacheKey);
  if (cached) return cached;

  // Priority 0: Precomputed vector broadcast from Host RTDB (guarantees Host <-> iPad parity without leaking answers)
  if (precomputedEncoded) {
    const decoded = decodeCompactStrokes(precomputedEncoded);
    if (decoded && decoded.length > 0) {
      const vec: SketchVectorData = {
        key: cacheKey,
        strokes: decoded,
        dots: extractDotsFromStrokes(decoded),
        source: 'NES_CURATED',
        pointCount: decoded.reduce((acc, s) => acc + s.length, 0),
      };
      setCachedVector(cacheKey, vec);
      return vec;
    }
  }

  // Priority 1: Curated 1988 NES-style minimalist polygonal vector (0ms instant, unmistakable silhouette)
  const curated = resolveCuratedNesStrokes(word.english);
  if (curated && curated.length > 0) {
    const vec: SketchVectorData = {
      key: cacheKey,
      strokes: curated,
      dots: extractDotsFromStrokes(curated),
      source: 'NES_CURATED',
      pointCount: curated.reduce((acc, s) => acc + s.length, 0),
    };
    setCachedVector(cacheKey, vec);
    return vec;
  }

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
    }, 2200);

    const img = new Image();
    if (!cleanUrl.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => {
      clearTimeout(timeout);
      try {
        const extracted = extractOuterSilhouetteFromImage(img);
        if (extracted && extracted.strokes.length >= 1) {
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
