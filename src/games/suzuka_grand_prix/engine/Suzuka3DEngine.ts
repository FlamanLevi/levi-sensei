import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { SUZUKA_PATH_D, SUZUKA_SECTORS, SuzukaSector } from './SuzukaPathData';
import {
  SuzukaTrackThemeId,
  SuzukaTrackThemeConfig,
  EvaluatedSuzukaAtmosphere,
  getTrackTheme,
  DEFAULT_TRACK_THEME_ID,
} from '../trackThemes';

export interface SuzukaTrackSample {
  index: number;
  t: number; // 0.0 to 1.0 along circuit
  distanceMeters: number;
  position: THREE.Vector3;
  tangent: THREE.Vector3;
  normal: THREE.Vector3;
  right: THREE.Vector3;
  quaternion: THREE.Quaternion;
  elevation: number;
  sector: SuzukaSector;
}

export interface SuzukaTrackWorld {
  root: THREE.Group;
  roadMesh: THREE.Mesh;
  leftKerbMesh: THREE.Mesh;
  rightKerbMesh: THREE.Mesh;
  bridgeGroup: THREE.Group;
  gantryGroup: THREE.Group;
  sceneryGroup: THREE.Group;
  updateScenery?: (dt: number) => void;
  applyAtmosphere?: (atmo: EvaluatedSuzukaAtmosphere) => void;
  setStartLights: (count: number) => void;
  samples: SuzukaTrackSample[];
  totalLengthMeters: number;
  evaluate: (progress: number, laneOffset?: number) => SuzukaSampleResult;
}

/** Standard Suzuka 3D Circuit World Length in meters (4010.31 SVG units * 0.64 scale = 2,566.6m) */
export const SUZUKA_CIRCUIT_LENGTH_METERS = 2566.6;

export interface SuzukaSampleResult {
  position: THREE.Vector3;
  tangent: THREE.Vector3;
  normal: THREE.Vector3;
  right: THREE.Vector3;
  quaternion: THREE.Quaternion;
  sector: SuzukaSector;
}

const _bakePos = new THREE.Vector3();
const _bakeQuat = new THREE.Quaternion();
const _bakeEuler = new THREE.Euler();
const _bakeScale = new THREE.Vector3(1, 1, 1);
const _bakeColor = new THREE.Color();

function composeBakeMatrix(
  target: THREE.Matrix4,
  pos: THREE.Vector3 | readonly [number, number, number],
  quatOrRot?: THREE.Quaternion | readonly [number, number, number],
  scale?: THREE.Vector3 | readonly [number, number, number]
): THREE.Matrix4 {
  if (pos instanceof THREE.Vector3) {
    _bakePos.copy(pos);
  } else {
    _bakePos.set(pos[0], pos[1], pos[2]);
  }
  if (!quatOrRot) {
    _bakeQuat.identity();
  } else if (quatOrRot instanceof THREE.Quaternion) {
    _bakeQuat.copy(quatOrRot);
  } else {
    _bakeEuler.set(quatOrRot[0], quatOrRot[1], quatOrRot[2], 'XYZ');
    _bakeQuat.setFromEuler(_bakeEuler);
  }
  if (!scale) {
    _bakeScale.set(1, 1, 1);
  } else if (scale instanceof THREE.Vector3) {
    _bakeScale.copy(scale);
  } else {
    _bakeScale.set(scale[0], scale[1], scale[2]);
  }
  return target.compose(_bakePos, _bakeQuat, _bakeScale);
}

interface UvRect {
  u0: number;
  v0: number;
  u1: number;
  v1: number;
}

function bakeTransformedGeo(
  sourceGeo: THREE.BufferGeometry,
  matrix: THREE.Matrix4,
  options?: { colorHex?: number; keepUv?: boolean; uvRect?: UvRect }
): THREE.BufferGeometry {
  const g = sourceGeo.index ? sourceGeo.toNonIndexed() : sourceGeo.clone();
  g.applyMatrix4(matrix);
  if (!g.attributes.normal) {
    g.computeVertexNormals();
  }
  const keepUv = options?.keepUv || Boolean(options?.uvRect);
  if (!keepUv && g.attributes.uv) {
    g.deleteAttribute('uv');
  } else if (options?.uvRect && g.attributes.uv) {
    const { u0, v0, u1, v1 } = options.uvRect;
    const uvAttr = g.attributes.uv;
    const du = u1 - u0;
    const dv = v1 - v0;
    for (let i = 0; i < uvAttr.count; i++) {
      uvAttr.setXY(i, u0 + uvAttr.getX(i) * du, v0 + uvAttr.getY(i) * dv);
    }
    uvAttr.needsUpdate = true;
  }
  if (options?.colorHex !== undefined) {
    _bakeColor.setHex(options.colorHex);
    const count = g.attributes.position.count;
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      colors[i * 3] = _bakeColor.r;
      colors[i * 3 + 1] = _bakeColor.g;
      colors[i * 3 + 2] = _bakeColor.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  }
  return g;
}

function createVertexEmissiveMaterial(
  emissiveIntensity: number,
  roughness: number,
  metalness: number
): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness,
    metalness,
  });
  const uVColEmissive = { value: emissiveIntensity };
  mat.userData.uVColEmissive = uVColEmissive;
  mat.customProgramCacheKey = () => `suzuka-vcol-emissive`;
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uVColEmissive = uVColEmissive;
    shader.fragmentShader = `uniform float uVColEmissive;\n` + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      '#include <emissivemap_fragment>\n totalEmissiveRadiance += diffuseColor.rgb * uVColEmissive;'
    );
  };
  return mat;
}

function mergeStaticParts(parts: THREE.BufferGeometry[]): THREE.BufferGeometry | null {
  if (parts.length === 0) return null;
  const merged = mergeGeometries(parts, false);
  for (const p of parts) {
    p.dispose();
  }
  return merged ?? null;
}

/**
 * Lightweight BufferGeometry merger for multi-tiered instanced trees & clouds (zero extra draw calls).
 * Computes smooth vertex normals BEFORE converting to non-indexed and optionally bakes a
 * bottom-to-top ambient-occlusion & top-sunlight vertex color gradient for rich 3D volume.
 */
function mergeSimpleGeometries(
  geos: THREE.BufferGeometry[],
  verticalAoOptions?: { minY: number; maxY: number; bottomShade: number; topBoost: number }
): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];

  for (const g of geos) {
    // Compute smooth normals on the indexed mesh BEFORE un-indexing so foliage & clouds have soft shading
    g.computeVertexNormals();
    const nonIndexed = g.index ? g.toNonIndexed() : g;
    const posAttr = nonIndexed.getAttribute('position');
    const normAttr = nonIndexed.getAttribute('normal');
    for (let i = 0; i < posAttr.count; i++) {
      const px = posAttr.getX(i);
      const py = posAttr.getY(i);
      const pz = posAttr.getZ(i);
      positions.push(px, py, pz);

      let ny = 1;
      if (normAttr) {
        ny = normAttr.getY(i);
        normals.push(normAttr.getX(i), ny, normAttr.getZ(i));
      } else {
        normals.push(0, 1, 0);
      }

      if (verticalAoOptions) {
        const span = Math.max(0.1, verticalAoOptions.maxY - verticalAoOptions.minY);
        const hNorm = Math.max(0, Math.min(1, (py - verticalAoOptions.minY) / span));
        const hemiShade = 0.84 + 0.16 * Math.max(-1, Math.min(1, ny));
        const vShade =
          (verticalAoOptions.bottomShade +
            hNorm * (verticalAoOptions.topBoost - verticalAoOptions.bottomShade)) *
          hemiShade;
        colors.push(vShade, vShade, vShade);
      }
    }
    if (nonIndexed !== g) {
      nonIndexed.dispose();
    }
    g.dispose();
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  merged.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  if (verticalAoOptions) {
    merged.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  }
  return merged;
}

/**
 * Grounded + C2 Viaduct Elevation Profile:
 * Keeps all ground-level sectors flush at Y = 0.0m and ramps the Back Straight
 * Overpass Viaduct (t in [0.67, 0.89]) up to +9.2m over the Degner crossing (t = 0.78).
 */
function getSmoothElevation(tNorm: number): number {
  const t = ((tNorm % 1.0) + 1.0) % 1.0;
  const bridgeStart = 0.67;
  const bridgeEnd = 0.89;
  if (t > bridgeStart && t < bridgeEnd) {
    const u = (t - bridgeStart) / (bridgeEnd - bridgeStart);
    return 9.2 * 0.5 * (1 - Math.cos(2 * Math.PI * u));
  }
  return 0.0;
}

let cachedCornerSpeedLimits: Float32Array | null = null;

export function getSuzukaCornerSpeedLimit(progress: number): number {
  const t = ((progress % 1.0) + 1.0) % 1.0;
  if (cachedCornerSpeedLimits && cachedCornerSpeedLimits.length > 0) {
    const idx = Math.floor(t * cachedCornerSpeedLimits.length) % cachedCornerSpeedLimits.length;
    return cachedCornerSpeedLimits[idx];
  }
  return 180;
}

// Persistent texture caches (shared invariants + per-biome theme Maps)
const cachedStandardAsphaltTexs = new Map<SuzukaTrackThemeId, THREE.CanvasTexture>();
const cachedRedSpeedZoneTexs = new Map<SuzukaTrackThemeId, THREE.CanvasTexture>();
const cachedRunoffVergeTexs = new Map<SuzukaTrackThemeId, THREE.CanvasTexture>();
const cachedControlTowerWindowsTexs = new Map<SuzukaTrackThemeId, THREE.CanvasTexture>();
const cachedTurfTexs = new Map<SuzukaTrackThemeId, THREE.CanvasTexture>();
let cachedFiaKerbTex: THREE.CanvasTexture | null = null;
let cachedGrandstandSeatsTex: THREE.CanvasTexture | null = null;
let cachedCheeringCrowdAtlasTex: THREE.CanvasTexture | null = null;
let cachedHazardStripeTex: THREE.CanvasTexture | null = null;
let cachedCheckeredLineTex: THREE.CanvasTexture | null = null;
const cachedBillboardTexs = new Map<string, THREE.CanvasTexture>();

function createHighContrastAsphaltTexture(
  isRedSpeedZone: boolean = false,
  theme: SuzukaTrackThemeConfig = getTrackTheme(DEFAULT_TRACK_THEME_ID)
): THREE.CanvasTexture {
  const targetCache = isRedSpeedZone ? cachedRedSpeedZoneTexs : cachedStandardAsphaltTexs;
  const existing = targetCache.get(theme.id);
  if (existing) return existing;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    if (isRedSpeedZone) {
      ctx.fillStyle = theme.asphaltRedBgHex;
      ctx.fillRect(0, 0, 512, 512);

      // Subtle darker rubberized racing grooves in left & right lanes
      ctx.fillStyle = theme.asphaltRedGrooveRgba;
      ctx.fillRect(96, 0, 92, 512);
      ctx.fillRect(324, 0, 92, 512);

      for (let i = 0; i < 3600; i++) {
        const gx = (i * 73) % 512;
        const gy = (i * 197) % 512;
        ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.12)';
        ctx.fillRect(gx, gy, 2, 2);
      }

      // Corner Speed-Zone White Chevron Arrows in both lanes
      ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
      for (const laneCenterX of [142, 370]) {
        ctx.beginPath();
        ctx.moveTo(laneCenterX - 28, 320);
        ctx.lineTo(laneCenterX, 260);
        ctx.lineTo(laneCenterX + 28, 320);
        ctx.lineTo(laneCenterX + 18, 320);
        ctx.lineTo(laneCenterX, 282);
        ctx.lineTo(laneCenterX - 18, 320);
        ctx.closePath();
        ctx.fill();
      }
    } else {
      ctx.fillStyle = theme.asphaltBgHex;
      ctx.fillRect(0, 0, 512, 512);

      // Polished racing line rubber tracks in Driving & Passing lanes
      const leftLaneGrad = ctx.createLinearGradient(70, 0, 210, 0);
      leftLaneGrad.addColorStop(0, 'rgba(12, 15, 20, 0)');
      leftLaneGrad.addColorStop(0.5, theme.asphaltGrooveRgba);
      leftLaneGrad.addColorStop(1, 'rgba(12, 15, 20, 0)');
      ctx.fillStyle = leftLaneGrad;
      ctx.fillRect(70, 0, 140, 512);

      const rightLaneGrad = ctx.createLinearGradient(302, 0, 442, 0);
      rightLaneGrad.addColorStop(0, 'rgba(12, 15, 20, 0)');
      rightLaneGrad.addColorStop(0.5, theme.asphaltGrooveRgba);
      rightLaneGrad.addColorStop(1, 'rgba(12, 15, 20, 0)');
      ctx.fillStyle = rightLaneGrad;
      ctx.fillRect(302, 0, 140, 512);

      // Fine asphalt aggregate speckles
      for (let i = 0; i < 3800; i++) {
        const gx = (i * 79) % 512;
        const gy = (i * 193) % 512;
        ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 255, 255, 0.045)' : 'rgba(0, 0, 0, 0.14)';
        ctx.fillRect(gx, gy, 2, 2);
      }
    }

    // Outer asphalt shoulder darken
    ctx.fillStyle = 'rgba(8, 10, 15, 0.5)';
    ctx.fillRect(0, 0, 14, 512);
    ctx.fillRect(512 - 14, 0, 14, 512);

    // Bold solid white edge lines + golden yellow inner accent stripe
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(16, 0, 20, 512);
    ctx.fillRect(512 - 36, 0, 20, 512);

    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(40, 0, 5, 512);
    ctx.fillRect(512 - 45, 0, 5, 512);

    // Crisp dashed lane-divider centerline with reflective cat's-eye studs
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(244, 40, 24, 210);
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(250, 290, 12, 18);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 1);
  tex.anisotropy = 8;

  targetCache.set(theme.id, tex);
  return tex;
}

function createCheckeredStartLineTexture(): THREE.CanvasTexture {
  if (cachedCheckeredLineTex) return cachedCheckeredLineTex;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const cols = 16;
    const rows = 4;
    const cw = 512 / cols;
    const rh = 128 / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        ctx.fillStyle = (r + c) % 2 === 0 ? '#ffffff' : '#090d16';
        ctx.fillRect(c * cw, r * rh, cw, rh);
      }
    }
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(0, 0, 512, 6);
    ctx.fillRect(0, 122, 512, 6);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  cachedCheckeredLineTex = tex;
  return tex;
}

function createFiaKerbTexture(): THREE.CanvasTexture {
  if (cachedFiaKerbTex) return cachedFiaKerbTex;

  // High-detail single-block surface micro-texture (used per 3D kerb block with vertexColors: true)
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Base neutral white so vertexColors (Red / White) tint cleanly with full saturation
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 256, 256);

    // Subtle concrete aggregate grain
    for (let i = 0; i < 1600; i++) {
      const gx = (i * 67) % 256;
      const gy = (i * 157) % 256;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(0,0,0,0.045)' : 'rgba(255,255,255,0.08)';
      ctx.fillRect(gx, gy, 2, 2);
    }

    // Inner drainage lip highlight (U = 0..0.18)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.fillRect(28, 0, 18, 256);

    // 3 tactile rumble corrugation ribs across the block length (V direction)
    for (const ry of [56, 128, 198]) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.20)';
      ctx.fillRect(36, ry - 6, 190, 5);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.14)';
      ctx.fillRect(36, ry - 1, 190, 5);
    }

    // Crisp dark concrete expansion joint mortar line at block boundary (V = 0..14 & 242..256)
    ctx.fillStyle = 'rgba(15, 23, 42, 0.38)';
    ctx.fillRect(0, 0, 256, 10);
    ctx.fillRect(0, 246, 256, 10);

    // Outer edge bevel shadow (U = 0.88..1.0)
    ctx.fillStyle = 'rgba(15, 23, 42, 0.28)';
    ctx.fillRect(228, 0, 28, 256);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 1);
  tex.anisotropy = 8;
  cachedFiaKerbTex = tex;
  return tex;
}

function createRunoffVergeTexture(
  theme: SuzukaTrackThemeConfig = getTrackTheme(DEFAULT_TRACK_THEME_ID)
): THREE.CanvasTexture {
  const existing = cachedRunoffVergeTexs.get(theme.id);
  if (existing) return existing;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // FIA AstroTurf / Frost Fringe + Gravel Trap outer border
    ctx.fillStyle = theme.vergeTurfHex;
    ctx.fillRect(0, 0, 110, 256);
    ctx.fillStyle = theme.vergeLineHex;
    ctx.fillRect(110, 0, 10, 256);
    ctx.fillStyle = theme.vergeGravelBaseHex;
    ctx.fillRect(120, 0, 136, 256);

    for (let i = 0; i < 1200; i++) {
      const gx = 120 + ((i * 53) % 134);
      const gy = (i * 149) % 256;
      ctx.fillStyle = i % 2 === 0 ? theme.vergeGravelSpeckleA : theme.vergeGravelSpeckleB;
      ctx.fillRect(gx, gy, 3, 3);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  cachedRunoffVergeTexs.set(theme.id, tex);
  return tex;
}

function fillFittedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  initialFontPx: number,
  fontWeight = '900'
): void {
  const fontFamily = '"Plus Jakarta Sans", "Noto Sans JP", sans-serif';
  let fontPx = initialFontPx;
  ctx.font = `${fontWeight} ${fontPx}px ${fontFamily}`;
  while (ctx.measureText(text).width > maxWidth && fontPx > 20) {
    fontPx -= 2;
    ctx.font = `${fontWeight} ${fontPx}px ${fontFamily}`;
  }
  ctx.fillText(text, x, y, maxWidth);
}

interface QueuedBillboardSign {
  w: number;
  h: number;
  d: number;
  worldMatrix: THREE.Matrix4;
  title: string;
  sub: string;
  bg: string;
  textCol: string;
}

function drawBillboardCard(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  cellW: number,
  cellH: number,
  title: string,
  sub: string,
  bg: string,
  textCol: string
): void {
  ctx.save();
  ctx.translate(ox, oy);
  ctx.scale(cellW / 1024, cellH / 256);

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1024, 256);

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 10;
  ctx.strokeRect(10, 10, 1004, 236);

  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 3;
  ctx.strokeRect(24, 24, 976, 208);

  ctx.fillStyle = textCol;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  fillFittedText(ctx, title, 512, sub ? 94 : 128, 920, 74, '900');

  if (sub) {
    ctx.fillStyle = '#fde047';
    fillFittedText(ctx, sub, 512, 184, 920, 42, '800');
  }
  ctx.restore();
}

function createBillboardAtlasTexture(signs: QueuedBillboardSign[]): {
  tex: THREE.CanvasTexture;
  rects: UvRect[];
} {
  const cols = 2;
  const cellW = 512;
  const cellH = 128;
  const rows = Math.max(1, Math.ceil(signs.length / cols));
  const atlasW = cols * cellW;
  const atlasH = rows * cellH;
  const key = `atlas_v3_${rows}::` + signs.map((s) => `${s.title}|${s.sub}|${s.bg}|${s.textCol}`).join(';');

  const padU = 2 / atlasW;
  const padV = 2 / atlasH;
  const rects: UvRect[] = signs.map((_, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const u0 = (col * cellW) / atlasW + padU;
    const u1 = ((col + 1) * cellW) / atlasW - padU;
    const vTop = 1 - (row * cellH) / atlasH - padV;
    const vBottom = 1 - ((row + 1) * cellH) / atlasH + padV;
    return { u0, v0: vBottom, u1, v1: vTop };
  });

  const existing = cachedBillboardTexs.get(key);
  if (existing) {
    return { tex: existing, rects };
  }

  const canvas = document.createElement('canvas');
  canvas.width = atlasW;
  canvas.height = atlasH;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, atlasW, atlasH);
    signs.forEach((s, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      drawBillboardCard(ctx, col * cellW, row * cellH, cellW, cellH, s.title, s.sub, s.bg, s.textCol);
    });
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  cachedBillboardTexs.set(key, tex);
  return { tex, rects };
}

/**
 * Unified 3-column texture atlas for 50m / 100m / 150m trackside brake marker boards (1 draw call).
 */
function createBrakeMarkerAtlasTexture(labels: string[]): {
  tex: THREE.CanvasTexture;
  rects: UvRect[];
} {
  const cellW = 256;
  const cellH = 192;
  const atlasW = labels.length * cellW;
  const atlasH = cellH;
  const key = `brake_atlas_v3__${labels.join('_')}`;

  const padU = 2 / atlasW;
  const padV = 2 / atlasH;
  const rects: UvRect[] = labels.map((_, idx) => ({
    u0: (idx * cellW) / atlasW + padU,
    u1: ((idx + 1) * cellW) / atlasW - padU,
    v0: padV,
    v1: 1 - padV,
  }));

  const existing = cachedBillboardTexs.get(key);
  if (existing) return { tex: existing, rects };

  const canvas = document.createElement('canvas');
  canvas.width = atlasW;
  canvas.height = atlasH;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    labels.forEach((distanceLabel, idx) => {
      const ox = idx * cellW;
      ctx.save();
      ctx.translate(ox, 0);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, cellW, cellH);

      ctx.fillStyle = '#ef4444';
      ctx.fillRect(8, 8, 240, 38);

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 8;
      ctx.strokeRect(6, 6, 244, 180);

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      fillFittedText(ctx, 'BRAKE', 128, 28, 210, 22, '900');
      fillFittedText(ctx, distanceLabel, 128, 118, 220, 76, '900');
      ctx.restore();
    });
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  cachedBillboardTexs.set(key, tex);
  return { tex, rects };
}

function createGrandstandSeatsTexture(): THREE.CanvasTexture {
  if (cachedGrandstandSeatsTex) return cachedGrandstandSeatsTex;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Clean architectural concrete tier steps + stadium seat rails (no noisy pixel dots)
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, 0, 256, 256);

    const rowColors = ['#1e3a8a', '#1d4ed8', '#0f172a', '#b91c1c'];
    for (let r = 0; r < 8; r++) {
      const y = r * 32;
      // Concrete step riser shadow
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, y, 256, 6);
      // Concrete walkway highlight
      ctx.fillStyle = '#64748b';
      ctx.fillRect(0, y + 6, 256, 6);
      // Stadium seat bench backrest rail
      ctx.fillStyle = rowColors[r % rowColors.length];
      ctx.fillRect(0, y + 12, 256, 16);
      // Seat dividers
      ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
      for (let x = 0; x < 256; x += 16) {
        ctx.fillRect(x, y + 12, 3, 16);
      }
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 1);
  tex.anisotropy = 8;
  cachedGrandstandSeatsTex = tex;
  return tex;
}

function createControlTowerWindowsTexture(
  theme: SuzukaTrackThemeConfig = getTrackTheme(DEFAULT_TRACK_THEME_ID)
): THREE.CanvasTexture {
  const existing = cachedControlTowerWindowsTexs.get(theme.id);
  if (existing) return existing;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = theme.towerWindowBg;
    ctx.fillRect(0, 0, 256, 512);
    for (let r = 0; r < 14; r++) {
      const y = 16 + r * 35;
      ctx.fillStyle = r % 3 === 0 ? theme.towerWindowColorA : theme.towerWindowColorB;
      for (let c = 0; c < 6; c++) {
        ctx.fillRect(14 + c * 39, y, 30, 22);
      }
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  cachedControlTowerWindowsTexs.set(theme.id, tex);
  return tex;
}

function createHazardStripeTexture(): THREE.CanvasTexture {
  if (cachedHazardStripeTex) return cachedHazardStripeTex;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(0, 0, 256, 64);
    ctx.fillStyle = '#0f172a';
    for (let x = -64; x < 320; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 20, 0);
      ctx.lineTo(x - 8, 64);
      ctx.lineTo(x - 28, 64);
      ctx.closePath();
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 1);
  cachedHazardStripeTex = tex;
  return tex;
}

function createTurfTexture(
  theme: SuzukaTrackThemeConfig = getTrackTheme(DEFAULT_TRACK_THEME_ID)
): THREE.CanvasTexture {
  const existing = cachedTurfTexs.get(theme.id);
  if (existing) return existing;

  const grassCanvas = document.createElement('canvas');
  grassCanvas.width = 512;
  grassCanvas.height = 512;
  const gCtx = grassCanvas.getContext('2d');
  if (gCtx) {
    gCtx.fillStyle = theme.turfBgHex;
    gCtx.fillRect(0, 0, 512, 512);

    const stripeCount = 4;
    const stripeW = 512 / stripeCount;
    for (let i = 0; i < stripeCount; i++) {
      gCtx.fillStyle = i % 2 === 0 ? theme.turfStripeA : theme.turfStripeB;
      gCtx.fillRect(i * stripeW, 0, stripeW, 512);
    }

    for (let j = 0; j < stripeCount; j++) {
      gCtx.fillStyle = j % 2 === 0 ? 'rgba(255, 255, 255, 0.038)' : 'rgba(0, 20, 5, 0.038)';
      gCtx.fillRect(0, j * stripeW, 512, stripeW);
    }

    for (let i = 0; i < 4500; i++) {
      const gx = (i * 97) % 512;
      const gy = (i * 181) % 512;
      const shade = i % 3;
      gCtx.fillStyle = theme.turfSpeckles[shade];
      gCtx.fillRect(gx, gy, 2, 4);
    }
  }

  const grassTex = new THREE.CanvasTexture(grassCanvas);
  grassTex.colorSpace = THREE.SRGBColorSpace;
  grassTex.wrapS = THREE.RepeatWrapping;
  grassTex.wrapT = THREE.RepeatWrapping;
  grassTex.repeat.set(64, 64);
  grassTex.anisotropy = 8;
  cachedTurfTexs.set(theme.id, grassTex);
  return grassTex;
}

/**
 * Builds a 1024x1024 Retina transparent RGBA Texture Atlas (4 columns x 2 rows = 8 cells, 256x512 each)
 * containing 8 distinct cheering Japanese elementary school student / spectator clusters
 * waving checkered flags, Uchiwa cheering fans, pom-poms, and English cheering signs.
 */
function createCheeringCrowdAtlasTexture(): THREE.CanvasTexture {
  if (cachedCheeringCrowdAtlasTex) return cachedCheeringCrowdAtlasTex;

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.scale(2, 2);
    ctx.clearRect(0, 0, 512, 512);

    const cellConfigs = [
      {
        shirts: ['#ef4444', '#3b82f6', '#f59e0b'],
        caps: ['#dc2626', '#ffffff', '#facc15'],
        propType: 'FLAG',
        badgeText: 'GO!',
        badgeBg: '#ef4444',
      },
      {
        shirts: ['#06b6d4', '#ec4899', '#10b981'],
        caps: ['#0284c7', '#f43f5e', '#ffffff'],
        propType: 'UCHIWA',
        badgeText: 'P1 ★',
        badgeBg: '#2563eb',
      },
      {
        shirts: ['#8b5cf6', '#f97316', '#3b82f6'],
        caps: ['#facc15', '#ffffff', '#dc2626'],
        propType: 'BANNER',
        badgeText: 'FAST!',
        badgeBg: '#16a34a',
      },
      {
        shirts: ['#10b981', '#ef4444', '#eab308'],
        caps: ['#ffffff', '#dc2626', '#3b82f6'],
        propType: 'POMPOM',
        badgeText: 'WIN!',
        badgeBg: '#d97706',
      },
      {
        shirts: ['#f43f5e', '#38bdf8', '#a855f7'],
        caps: ['#dc2626', '#facc15', '#ffffff'],
        propType: 'FLAG',
        badgeText: 'FIGHT!',
        badgeBg: '#9333ea',
      },
      {
        shirts: ['#2563eb', '#f59e0b', '#14b8a6'],
        caps: ['#ffffff', '#dc2626', '#facc15'],
        propType: 'UCHIWA',
        badgeText: 'SUPER!',
        badgeBg: '#e11d48',
      },
      {
        shirts: ['#eab308', '#ef4444', '#06b6d4'],
        caps: ['#facc15', '#ffffff', '#0284c7'],
        propType: 'BANNER',
        badgeText: 'SPEED!',
        badgeBg: '#0284c7',
      },
      {
        shirts: ['#ec4899', '#10b981', '#6366f1'],
        caps: ['#ffffff', '#dc2626', '#facc15'],
        propType: 'POMPOM',
        badgeText: 'YAY!',
        badgeBg: '#dc2626',
      },
    ];

    const drawCheckeredMiniFlag = (fx: number, fy: number, dir: number) => {
      ctx.save();
      ctx.translate(fx, fy);
      ctx.rotate(dir * 0.28);
      // Flagpole
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, 28);
      ctx.lineTo(0, -34);
      ctx.stroke();
      // Checkered cloth (4x3 grid)
      const cw = 8;
      const ch = 7;
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 4; c++) {
          ctx.fillStyle = (r + c) % 2 === 0 ? '#ffffff' : '#0f172a';
          ctx.fillRect(2 + c * cw, -34 + r * ch, cw, ch);
        }
      }
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.strokeRect(2, -34, 32, 21);
      ctx.restore();
    };

    const drawStudentFigure = (
      cx: number,
      baseY: number,
      scale: number,
      shirtColor: string,
      capColor: string,
      armPose: number
    ) => {
      ctx.save();
      ctx.translate(cx, baseY);
      ctx.scale(scale, scale);

      // Raised Cheering Arms (behind torso)
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 13;
      ctx.lineCap = 'round';
      // Left arm raised
      ctx.beginPath();
      ctx.moveTo(-18, -56);
      ctx.lineTo(-32, -96 - armPose * 8);
      ctx.stroke();
      // Right arm raised
      ctx.beginPath();
      ctx.moveTo(18, -56);
      ctx.lineTo(32, -98 + armPose * 6);
      ctx.stroke();

      ctx.strokeStyle = shirtColor;
      ctx.lineWidth = 8.5;
      ctx.beginPath();
      ctx.moveTo(-18, -56);
      ctx.lineTo(-32, -96 - armPose * 8);
      ctx.moveTo(18, -56);
      ctx.lineTo(32, -98 + armPose * 6);
      ctx.stroke();

      // Hands
      ctx.fillStyle = '#fde68a';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2.5;
      for (const [hx, hy] of [
        [-32, -96 - armPose * 8],
        [32, -98 + armPose * 6],
      ]) {
        ctx.beginPath();
        ctx.arc(hx, hy, 6.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // Torso / Team Jersey
      ctx.fillStyle = shirtColor;
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.roundRect(-22, -68, 44, 64, 14);
      ctx.fill();
      ctx.stroke();

      // White Sport Collar & Stripe
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-10, -66, 20, 8);
      ctx.fillRect(-20, -34, 40, 7);

      // Head
      ctx.fillStyle = '#fde68a';
      ctx.beginPath();
      ctx.arc(0, -90, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Japanese Elementary Sports Cap (Akashiro-boshi)
      ctx.fillStyle = capColor;
      ctx.beginPath();
      ctx.arc(0, -94, 20.5, Math.PI, 0, false);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Cap Brim
      ctx.beginPath();
      ctx.ellipse(0, -94, 24, 5.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Happy Cheering Eyes & Smile
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(-7, -87, 3.2, Math.PI, 0, false);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(7, -87, 3.2, Math.PI, 0, false);
      ctx.stroke();

      // Open cheering mouth
      ctx.fillStyle = '#e11d48';
      ctx.beginPath();
      ctx.arc(0, -79, 4.5, 0, Math.PI, false);
      ctx.fill();

      ctx.restore();
    };

    for (let cellIdx = 0; cellIdx < 8; cellIdx++) {
      const col = cellIdx % 4;
      const row = Math.floor(cellIdx / 4);
      const x0 = col * 128;
      const y0 = row * 256;
      const cfg = cellConfigs[cellIdx];

      ctx.save();
      ctx.beginPath();
      ctx.rect(x0, y0, 128, 256);
      ctx.clip();

      // Back-left & back-right students in the cluster
      drawStudentFigure(x0 + 34, y0 + 244, 0.78, cfg.shirts[0], cfg.caps[0], -1);
      drawStudentFigure(x0 + 94, y0 + 244, 0.78, cfg.shirts[2], cfg.caps[2], 1);

      // Center foreground student
      drawStudentFigure(x0 + 64, y0 + 252, 0.88, cfg.shirts[1], cfg.caps[1], 0);

      // Cheering Props (Checkered Flag / Uchiwa Fan / English Cheer Sign / Pom-Poms)
      if (cfg.propType === 'FLAG') {
        drawCheckeredMiniFlag(x0 + 22, y0 + 132, -1);
        drawCheckeredMiniFlag(x0 + 102, y0 + 128, 1);
      } else if (cfg.propType === 'POMPOM') {
        for (const [px, py, pCol] of [
          [x0 + 20, y0 + 138, '#facc15'],
          [x0 + 108, y0 + 136, '#f43f5e'],
        ] as const) {
          ctx.fillStyle = pCol;
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(px, py, 14, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      }

      // High-Contrast English Cheer Sign / Uchiwa Banner held overhead
      ctx.fillStyle = cfg.badgeBg;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(x0 + 18, y0 + 36, 92, 38, 12);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 22px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(cfg.badgeText, x0 + 64, y0 + 56);

      ctx.restore();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.flipY = false;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  cachedCheeringCrowdAtlasTex = tex;
  return tex;
}

export interface CrowdSpritePlacement {
  x: number;
  y: number;
  z: number;
  atlasIndex: number;
  phase: number;
  scale: number;
}

export function prewarmSuzukaAssets(themeId?: SuzukaTrackThemeId): void {
  const theme = getTrackTheme(themeId);
  createHighContrastAsphaltTexture(false, theme);
  createHighContrastAsphaltTexture(true, theme);
  createCheckeredStartLineTexture();
  createFiaKerbTexture();
  createRunoffVergeTexture(theme);
  createTurfTexture(theme);
  createGrandstandSeatsTexture();
  createCheeringCrowdAtlasTexture();
  createControlTowerWindowsTexture(theme);
  createHazardStripeTexture();
  getSuzukaCornerSpeedLimit(0);
}

interface StaticSceneryBuckets {
  seatParts: THREE.BufferGeometry[];
  concreteParts: THREE.BufferGeometry[];
  steelParts: THREE.BufferGeometry[];
  glassParts: THREE.BufferGeometry[];
  paintedParts: THREE.BufferGeometry[];
  signs: QueuedBillboardSign[];
}

/**
 * Helper to construct a complete modular Grandstand Pavilion at any track sample anchor,
 * batching static architectural geometry + fascia sign specs into shared world-space buckets
 * and populating 3D crowd sprite tier coordinates.
 */
function appendSpectatorGrandstandParts(
  anchorSample: SuzukaTrackSample,
  sideSign: number,
  offsetMeters: number,
  lengthZ: number,
  tierCount: number,
  awningColorHex: number,
  bannerTitle: string,
  bannerSub: string,
  bannerBg: string,
  flagColors: number[],
  buckets: StaticSceneryBuckets,
  crowdPlacementsOut?: CrowdSpritePlacement[]
): void {
  const standPos = anchorSample.position.clone().addScaledVector(anchorSample.right, sideSign * offsetMeters);
  standPos.y = 0.0;
  const standQuat = anchorSample.quaternion;
  const standMatrix = composeBakeMatrix(new THREE.Matrix4(), standPos, standQuat);
  const localMat = new THREE.Matrix4();
  const worldMat = new THREE.Matrix4();

  const towardTrackX = -sideSign;
  const awayTrackX = sideSign;
  const localVec = new THREE.Vector3();

  for (let tier = 0; tier < tierCount; tier++) {
    const tierH = 1.0 + tier * 1.05;
    const tierX = towardTrackX * (3.8 - tier * 1.75);
    const tierGeo = new THREE.BoxGeometry(1.8, tierH, lengthZ);
    composeBakeMatrix(localMat, [tierX, tierH * 0.5, 0]);
    worldMat.multiplyMatrices(standMatrix, localMat);

    if (tier % 2 === 0) {
      buckets.seatParts.push(bakeTransformedGeo(tierGeo, worldMat, { keepUv: true }));
    } else {
      buckets.concreteParts.push(bakeTransformedGeo(tierGeo, worldMat, { keepUv: false }));
    }
    tierGeo.dispose();

    // Populate cheering student sprite placements along each seating tier
    if (crowdPlacementsOut) {
      const zMargin = lengthZ * 0.45;
      let slotIdx = 0;
      for (let zPos = -zMargin; zPos <= zMargin; zPos += 4.2) {
        slotIdx++;
        // Stagger odd/even tiers so every row has clear sightlines
        const zJitter = (tier % 2 === 0 ? 0.8 : -0.8) + Math.sin(slotIdx * 1.7 + tier) * 0.35;
        localVec.set(tierX + towardTrackX * 0.15, tierH, zPos + zJitter);
        localVec.applyQuaternion(standQuat).add(standPos);

        crowdPlacementsOut.push({
          x: localVec.x,
          y: localVec.y,
          z: localVec.z,
          atlasIndex: (slotIdx + tier * 3) % 8,
          phase: (slotIdx * 0.95 + tier * 1.4) % (Math.PI * 2),
          scale: 0.92 + ((slotIdx + tier) % 3) * 0.08,
        });
      }
    }
  }

  const maxTierH = 1.0 + tierCount * 1.05;
  const backX = awayTrackX * (tierCount * 1.75 - 3.6);
  const backWallGeo = new THREE.BoxGeometry(0.9, maxTierH + 1.4, lengthZ + 1.0);
  composeBakeMatrix(localMat, [backX, (maxTierH + 1.4) * 0.5, 0]);
  worldMat.multiplyMatrices(standMatrix, localMat);
  buckets.concreteParts.push(bakeTransformedGeo(backWallGeo, worldMat, { keepUv: false }));
  backWallGeo.dispose();

  const roofH = maxTierH + 3.4;
  const colGeo = new THREE.CylinderGeometry(0.32, 0.38, roofH, 8);
  const colStep = Math.max(10, Math.floor(lengthZ / 4));
  for (let zCol = -lengthZ * 0.44; zCol <= lengthZ * 0.44; zCol += colStep) {
    composeBakeMatrix(localMat, [backX, roofH * 0.5, zCol]);
    worldMat.multiplyMatrices(standMatrix, localMat);
    buckets.steelParts.push(bakeTransformedGeo(colGeo, worldMat, { keepUv: false }));
  }
  colGeo.dispose();

  const roofW = tierCount * 1.85 + 2.5;
  const roofGeo = new THREE.BoxGeometry(roofW, 0.5, lengthZ + 3.0);
  composeBakeMatrix(localMat, [0, roofH, 0], [0, 0, towardTrackX * -0.09]);
  worldMat.multiplyMatrices(standMatrix, localMat);
  buckets.paintedParts.push(
    bakeTransformedGeo(roofGeo, worldMat, { colorHex: awningColorHex, keepUv: false })
  );
  roofGeo.dispose();

  // Fascia Banner queued for unified Billboard Atlas + single mesh merge (~4.5:1 aspect ratio)
  const signWidth = Math.min(lengthZ * 0.48, 17.6);
  const signHeight = signWidth * 0.22;
  const frontRoofEdgeY = roofH - Math.abs(roofW * 0.44) * Math.sin(0.09);
  composeBakeMatrix(localMat, [towardTrackX * (roofW * 0.44), frontRoofEdgeY + signHeight * 0.5 + 0.28, 0]);
  buckets.signs.push({
    w: 0.32,
    h: signHeight,
    d: signWidth,
    worldMatrix: new THREE.Matrix4().multiplyMatrices(standMatrix, localMat),
    title: bannerTitle,
    sub: bannerSub,
    bg: bannerBg,
    textCol: '#ffffff',
  });

  // Rooftop Pennant Flags
  const flagPoleGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.4, 6);
  const flagClothGeo = new THREE.BoxGeometry(0.95, 0.6, 0.08);
  for (let fz = -lengthZ * 0.42; fz <= lengthZ * 0.42; fz += 7.5) {
    composeBakeMatrix(localMat, [backX, roofH + 1.2, fz]);
    worldMat.multiplyMatrices(standMatrix, localMat);
    buckets.steelParts.push(bakeTransformedGeo(flagPoleGeo, worldMat, { keepUv: false }));

    const fCol = flagColors[Math.abs(Math.round(fz)) % flagColors.length];
    composeBakeMatrix(localMat, [backX + towardTrackX * 0.48, roofH + 2.0, fz]);
    worldMat.multiplyMatrices(standMatrix, localMat);
    buckets.paintedParts.push(
      bakeTransformedGeo(flagClothGeo, worldMat, { colorHex: fCol, keepUv: false })
    );
  }
  flagPoleGeo.dispose();
  flagClothGeo.dispose();
}

/**
 * Builds the 3D Suzuka Circuit with InstancedMesh multi-tiered forest, secondary grandstands,
 * Suzuka Control Tower, trackside tire barriers, 360° mountain panorama, and volumetric clouds.
 */
export function buildSuzuka3DTrack(themeId?: SuzukaTrackThemeId): SuzukaTrackWorld {
  const theme = getTrackTheme(themeId);
  const signMaterials: THREE.MeshStandardMaterial[] = [];
  const makeSignMaterial = (tex: THREE.CanvasTexture, roughness = 0.35) => {
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      color: 0xffffff,
      roughness,
      emissive: 0xffffff,
      emissiveMap: tex,
      emissiveIntensity: theme.signEmissiveIntensity,
    });
    signMaterials.push(mat);
    return mat;
  };

  const root = new THREE.Group();
  root.name = 'Suzuka3DTrackRoot';

  const svgNS = 'http://www.w3.org/2000/svg';
  const path = document.createElementNS(svgNS, 'path');
  path.setAttribute('d', SUZUKA_PATH_D);
  const totalSvgLength = path.getTotalLength() || 4010.31;

  const N = 2000;
  const step = totalSvgLength / N;

  const CENTER_X = 265;
  const CENTER_Z = 522;
  const SCALE = 0.64;

  const samples: SuzukaTrackSample[] = [];
  const _up = new THREE.Vector3(0, 1, 0);

  let cumulativeMeters = 0;
  const rawPoints: THREE.Vector3[] = [];

  for (let i = 0; i < N; i++) {
    const dist = i * step;
    const pt = path.getPointAtLength(dist);
    const t = i / N;
    const elevation = getSmoothElevation(t);

    const x = (pt.x - CENTER_X) * SCALE;
    const z = (pt.y - CENTER_Z) * SCALE;
    rawPoints.push(new THREE.Vector3(x, elevation, z));
  }

  for (let i = 0; i < N; i++) {
    const t = i / N;
    const pPrev = rawPoints[(i - 1 + N) % N];
    const pCurr = rawPoints[i];
    const pNext = rawPoints[(i + 1) % N];

    const tangent = new THREE.Vector3().subVectors(pNext, pPrev).normalize();
    const right = new THREE.Vector3().crossVectors(tangent, _up).normalize();
    const normal = new THREE.Vector3().crossVectors(right, tangent).normalize();

    const rotMat = new THREE.Matrix4();
    rotMat.makeBasis(right, normal, tangent.clone().negate());
    const quaternion = new THREE.Quaternion().setFromRotationMatrix(rotMat);

    const sector =
      SUZUKA_SECTORS.find((s) => t >= s.startFraction && t < s.endFraction) ||
      SUZUKA_SECTORS[0];

    if (i > 0) {
      cumulativeMeters += pCurr.distanceTo(rawPoints[i - 1]);
    }

    samples.push({
      index: i,
      t,
      distanceMeters: cumulativeMeters,
      position: pCurr,
      tangent,
      normal,
      right,
      quaternion,
      elevation: pCurr.y,
      sector,
    });
  }

  const totalLengthMeters = cumulativeMeters;

  // Curvature-driven corner speed limits
  const rawTurnAngles = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const tPrev = samples[(i - 6 + N) % N].tangent;
    const tNext = samples[(i + 6) % N].tangent;
    rawTurnAngles[i] = tPrev.angleTo(tNext);
  }

  const smoothTurnAngles = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    let sum = 0;
    for (let k = -5; k <= 5; k++) {
      sum += rawTurnAngles[(i + k + N) % N];
    }
    smoothTurnAngles[i] = sum / 11;
  }

  const cornerSpeedCaps = new Float32Array(N);
  const turnThreshold = 0.11;
  for (let i = 0; i < N; i++) {
    const angle = smoothTurnAngles[i];
    if (angle >= turnThreshold) {
      const severity = Math.min(1.0, (angle - turnThreshold) / 0.17);
      cornerSpeedCaps[i] = Math.round(138 - severity * 26);
    } else {
      cornerSpeedCaps[i] = 180;
    }
  }

  for (let i = 0; i < N; i++) {
    if (cornerSpeedCaps[i] === 180) {
      let prevRedDist = -1;
      let nextRedDist = -1;
      for (let d = 1; d <= 5; d++) {
        if (prevRedDist === -1 && cornerSpeedCaps[(i - d + N) % N] < 180) prevRedDist = d;
        if (nextRedDist === -1 && cornerSpeedCaps[(i + d) % N] < 180) nextRedDist = d;
      }
      if (prevRedDist !== -1 && nextRedDist !== -1 && prevRedDist + nextRedDist <= 9) {
        cornerSpeedCaps[i] = 136;
      }
    }
  }

  cachedCornerSpeedLimits = cornerSpeedCaps;

  // -------------------------------------------------------------------------
  // 2. Build 3D Asphalt Road Mesh (8.4m wide), Red Speed-Zones, FIA Kerbs,
  //    and Outer AstroTurf/Gravel Verge Ribbons
  // -------------------------------------------------------------------------
  const roadHalfWidth = 4.2;
  const kerbWidth = 1.25;
  const vergeWidth = 2.4;

  const roadVerts: number[] = [];
  const roadUvs: number[] = [];
  const roadIndices: number[] = [];
  const redRoadIndices: number[] = [];

  const vergeVerts: number[] = [];
  const vergeUvs: number[] = [];
  const vergeIndices: number[] = [];

  const _pL = new THREE.Vector3();
  const _pR = new THREE.Vector3();
  const _kOutL = new THREE.Vector3();
  const _kOutR = new THREE.Vector3();
  const _vOutL = new THREE.Vector3();
  const _vOutR = new THREE.Vector3();

  for (let i = 0; i < N; i++) {
    const s = samples[i];
    const currentMeters = s.distanceMeters;

    _pL.copy(s.position).addScaledVector(s.right, -roadHalfWidth);
    _pR.copy(s.position).addScaledVector(s.right, roadHalfWidth);

    roadVerts.push(_pL.x, _pL.y, _pL.z);
    roadVerts.push(_pR.x, _pR.y, _pR.z);

    const vRoad = currentMeters / 6.0;
    roadUvs.push(0, vRoad);
    roadUvs.push(1, vRoad);

    _kOutL.copy(_pL).addScaledVector(s.right, -kerbWidth);
    _kOutR.copy(_pR).addScaledVector(s.right, kerbWidth);

    // Grounded AstroTurf + Gravel Verge Ribbon outside Kerbs (only on ground-level sectors)
    const isGround = s.elevation < 0.05;
    const vy = isGround ? -0.02 : s.elevation - 0.12;
    _vOutL.copy(_kOutL).addScaledVector(s.right, -vergeWidth);
    _vOutR.copy(_kOutR).addScaledVector(s.right, vergeWidth);

    // 4 vertices per sample i for left + right verge strips
    vergeVerts.push(
      _kOutL.x, vy, _kOutL.z,
      _vOutL.x, vy, _vOutL.z,
      _kOutR.x, vy, _kOutR.z,
      _vOutR.x, vy, _vOutR.z
    );
    const vVerge = currentMeters / 4.0;
    vergeUvs.push(0, vVerge, 1, vVerge, 0, vVerge, 1, vVerge);

    const i0 = i * 2;
    const i1 = i0 + 1;
    const i2 = ((i + 1) % N) * 2;
    const i3 = i2 + 1;

    if (cornerSpeedCaps[i] < 180) {
      redRoadIndices.push(i0, i1, i2);
      redRoadIndices.push(i1, i3, i2);
    } else {
      roadIndices.push(i0, i1, i2);
      roadIndices.push(i1, i3, i2);
    }

    if (isGround && samples[(i + 1) % N].elevation < 0.05) {
      const vi = i * 4;
      const vn = ((i + 1) % N) * 4;
      // Left verge quad
      vergeIndices.push(vi + 1, vi + 0, vn + 0);
      vergeIndices.push(vi + 1, vn + 0, vn + 1);
      // Right verge quad
      vergeIndices.push(vi + 2, vi + 3, vn + 2);
      vergeIndices.push(vi + 3, vn + 3, vn + 2);
    }
  }

  const roadPosAttr = new THREE.Float32BufferAttribute(roadVerts, 3);
  const roadUvAttr = new THREE.Float32BufferAttribute(roadUvs, 2);

  const roadGeo = new THREE.BufferGeometry();
  roadGeo.setAttribute('position', roadPosAttr);
  roadGeo.setAttribute('uv', roadUvAttr);
  roadGeo.setIndex(roadIndices);
  roadGeo.computeVertexNormals();

  const roadTex = createHighContrastAsphaltTexture(false, theme);
  const roadMat = new THREE.MeshStandardMaterial({
    map: roadTex,
    color: 0xffffff,
    roughness: 0.62,
    metalness: 0.12,
    side: THREE.DoubleSide,
    emissive: theme.roadEmissiveHex,
    emissiveMap: roadTex,
    emissiveIntensity: theme.roadEmissiveIntensity,
  });
  const roadMesh = new THREE.Mesh(roadGeo, roadMat);
  roadMesh.receiveShadow = true;
  root.add(roadMesh);

  const redRoadGeo = new THREE.BufferGeometry();
  redRoadGeo.setAttribute('position', roadPosAttr);
  redRoadGeo.setAttribute('uv', roadUvAttr);
  redRoadGeo.setIndex(redRoadIndices);
  redRoadGeo.computeVertexNormals();

  const redRoadTex = createHighContrastAsphaltTexture(true, theme);
  const redRoadMat = new THREE.MeshStandardMaterial({
    map: redRoadTex,
    color: 0xffffff,
    roughness: 0.66,
    metalness: 0.08,
    side: THREE.DoubleSide,
    emissive: theme.redRoadEmissiveHex,
    emissiveMap: redRoadTex,
    emissiveIntensity: theme.redRoadEmissiveIntensity,
  });
  const redRoadMesh = new THREE.Mesh(redRoadGeo, redRoadMat);
  redRoadMesh.receiveShadow = true;
  root.add(redRoadMesh);

  // Outer FIA AstroTurf + Gravel Verge Ribbon Mesh
  const vergeGeo = new THREE.BufferGeometry();
  vergeGeo.setAttribute('position', new THREE.Float32BufferAttribute(vergeVerts, 3));
  vergeGeo.setAttribute('uv', new THREE.Float32BufferAttribute(vergeUvs, 2));
  vergeGeo.setIndex(vergeIndices);
  vergeGeo.computeVertexNormals();
  const vergeMesh = new THREE.Mesh(
    vergeGeo,
    new THREE.MeshStandardMaterial({
      map: createRunoffVergeTexture(theme),
      color: 0xffffff,
      roughness: 0.85,
      metalness: 0.02,
      side: THREE.DoubleSide,
    })
  );
  vergeMesh.receiveShadow = true;
  root.add(vergeMesh);

  // Checkered Start/Finish Line Decal Strip on Main Straight (t = 0)
  const startSample = samples[0];
  const checkeredPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(8.2, 2.4),
    new THREE.MeshStandardMaterial({
      map: createCheckeredStartLineTexture(),
      color: 0xffffff,
      roughness: 0.4,
      metalness: 0.05,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    })
  );
  checkeredPlane.position.copy(startSample.position);
  checkeredPlane.position.y += 0.025;
  checkeredPlane.quaternion.copy(startSample.quaternion);
  checkeredPlane.rotateX(-Math.PI / 2);
  root.add(checkeredPlane);

  // Painted FIA Starting Grid Brackets on the Main Straight (8 grid slots -> 1 draw call)
  const gridBracketGeo = new THREE.PlaneGeometry(2.6, 0.35);
  const gridSideGeo = new THREE.PlaneGeometry(0.25, 1.8);
  const gridPaintMat = new THREE.MeshBasicMaterial({
    color: 0xf8fafc,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const gridParts: THREE.BufferGeometry[] = [];
  const rotXNegHalfPi = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
  const gridQuat = new THREE.Quaternion();
  const gridMat4 = new THREE.Matrix4();
  const gridPosVec = new THREE.Vector3();

  for (let g = 0; g < 8; g++) {
    const sampleIdx = (N - 4 - g * 5) % N;
    const gs = samples[sampleIdx];
    const laneX = g % 2 === 0 ? -2.1 : 2.1;
    const boxPos = gs.position.clone().addScaledVector(gs.right, laneX);

    gridQuat.copy(gs.quaternion).multiply(rotXNegHalfPi);
    gridPosVec.copy(boxPos);
    gridPosVec.y += 0.022;
    composeBakeMatrix(gridMat4, gridPosVec, gridQuat);
    gridParts.push(bakeTransformedGeo(gridBracketGeo, gridMat4, { keepUv: false }));

    for (const sx of [-1.2, 1.2]) {
      gridPosVec.copy(boxPos).addScaledVector(gs.right, sx).addScaledVector(gs.tangent, -0.8);
      gridPosVec.y += 0.022;
      composeBakeMatrix(gridMat4, gridPosVec, gridQuat);
      gridParts.push(bakeTransformedGeo(gridSideGeo, gridMat4, { keepUv: false }));
    }
  }
  gridBracketGeo.dispose();
  gridSideGeo.dispose();

  const mergedGridGeo = mergeStaticParts(gridParts);
  if (mergedGridGeo) {
    root.add(new THREE.Mesh(mergedGridGeo, gridPaintMat));
  }

  // -------------------------------------------------------------------------
  // 2B. High-Definition 3D Serrated FIA Kerb Segments (2 Draw Calls Total!)
  //     Each 1.28m spline segment is extruded as a 3D faceted concrete block
  //     with:
  //       (1) 45° Raised Inner Bevel Lip (catches sunlight & defines track edge)
  //       (2) Crowned Sawtooth Rumble Top Deck (+3.5cm serrated ramp per block)
  //       (3) Vertical Sawtooth Front Riser Step between blocks
  //       (4) Outer Vertical Curb Wall dropping to the verge
  //     Alternating Crimson Red & Pure White per-block vertex colors guarantee
  //     razor-sharp red-and-white contrast at all camera distances.
  // -------------------------------------------------------------------------
  function build3DSerratedKerbGeometry(sideSign: -1 | 1): THREE.BufferGeometry {
    const pos: number[] = [];
    const col: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    let vCount = 0;

    const pushQuad = (
      a: THREE.Vector3,
      b: THREE.Vector3,
      c: THREE.Vector3,
      d: THREE.Vector3,
      r: number,
      g: number,
      bl: number,
      u0: number,
      u1: number
    ) => {
      pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z, d.x, d.y, d.z);
      for (let k = 0; k < 4; k++) {
        col.push(r, g, bl);
      }
      uvs.push(u0, 0, u1, 0, u1, 1, u0, 1);
      // Winding order flipped for left vs right side so normals always point outward/upward
      if (sideSign === 1) {
        indices.push(vCount, vCount + 1, vCount + 2, vCount, vCount + 2, vCount + 3);
      } else {
        indices.push(vCount, vCount + 2, vCount + 1, vCount, vCount + 3, vCount + 2);
      }
      vCount += 4;
    };

    const p0_in = new THREE.Vector3();
    const p0_lip = new THREE.Vector3();
    const p0_top = new THREE.Vector3();
    const p0_out = new THREE.Vector3();

    const p1_in = new THREE.Vector3();
    const p1_lip = new THREE.Vector3();
    const p1_top = new THREE.Vector3();
    const p1_out = new THREE.Vector3();

    const p1_lip_low = new THREE.Vector3();
    const p1_top_low = new THREE.Vector3();
    const cKerbPrimary = new THREE.Color(theme.kerbPrimaryHex);
    const cKerbSecondary = new THREE.Color(theme.kerbSecondaryHex);

    for (let i = 0; i < N; i++) {
      const s0 = samples[i];
      const s1 = samples[(i + 1) % N];

      // Alternate primary & secondary FIA kerb blocks every step (vivid emphasis in corners)
      const isPrimaryBlock = i % 2 === 0;
      const isCornerZone = cornerSpeedCaps[i] < 180;
      const kerbCol = isPrimaryBlock ? cKerbPrimary : cKerbSecondary;
      const shadeMul = isPrimaryBlock && !isCornerZone ? 0.93 : 1.0;
      const rCol = kerbCol.r * shadeMul;
      const gCol = kerbCol.g * shadeMul;
      const bCol = kerbCol.b * shadeMul;

      // Sawtooth 3D height profile: front edge of block is lower, rear edge ramps up +3.5cm
      const lipH0 = isCornerZone ? 0.13 : 0.10;
      const lipH1 = isCornerZone ? 0.165 : 0.13;
      const topH0 = isCornerZone ? 0.18 : 0.14;
      const topH1 = isCornerZone ? 0.225 : 0.175;

      // Sample 0 cross-section points
      p0_in.copy(s0.position).addScaledVector(s0.right, sideSign * roadHalfWidth);
      p0_lip
        .copy(s0.position)
        .addScaledVector(s0.right, sideSign * (roadHalfWidth + 0.24))
        .addScaledVector(s0.normal, lipH0);
      p0_top
        .copy(s0.position)
        .addScaledVector(s0.right, sideSign * (roadHalfWidth + 1.15))
        .addScaledVector(s0.normal, topH0);
      p0_out
        .copy(s0.position)
        .addScaledVector(s0.right, sideSign * (roadHalfWidth + kerbWidth))
        .addScaledVector(s0.normal, -0.02);

      // Sample 1 cross-section points (elevated rear of sawtooth block)
      p1_in.copy(s1.position).addScaledVector(s1.right, sideSign * roadHalfWidth);
      p1_lip
        .copy(s1.position)
        .addScaledVector(s1.right, sideSign * (roadHalfWidth + 0.24))
        .addScaledVector(s1.normal, lipH1);
      p1_top
        .copy(s1.position)
        .addScaledVector(s1.right, sideSign * (roadHalfWidth + 1.15))
        .addScaledVector(s1.normal, topH1);
      p1_out
        .copy(s1.position)
        .addScaledVector(s1.right, sideSign * (roadHalfWidth + kerbWidth))
        .addScaledVector(s1.normal, -0.02);

      // 1) Inner 45° Bevel Lip (brightly catches sunlight along the asphalt boundary)
      pushQuad(p0_in, p0_lip, p1_lip, p1_in, rCol * 0.95, gCol * 0.95, bCol * 0.95, 0.0, 0.22);

      // 2) Crowned Sawtooth Rumble Top Deck
      pushQuad(p0_lip, p0_top, p1_top, p1_lip, rCol, gCol, bCol, 0.22, 0.88);

      // 3) Outer Vertical Curb Wall
      pushQuad(p0_top, p0_out, p1_out, p1_top, rCol * 0.78, gCol * 0.78, bCol * 0.78, 0.88, 1.0);

      // 4) Vertical Sawtooth Step Face at rear of block (gives physical 3D tooth depth)
      p1_lip_low
        .copy(s1.position)
        .addScaledVector(s1.right, sideSign * (roadHalfWidth + 0.24))
        .addScaledVector(s1.normal, lipH0);
      p1_top_low
        .copy(s1.position)
        .addScaledVector(s1.right, sideSign * (roadHalfWidth + 1.15))
        .addScaledVector(s1.normal, topH0);
      pushQuad(p1_lip_low, p1_top_low, p1_top, p1_lip, rCol * 0.72, gCol * 0.72, bCol * 0.72, 0.22, 0.88);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  const kerbTex = createFiaKerbTexture();
  const kerbMat = new THREE.MeshStandardMaterial({
    map: kerbTex,
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.42,
    metalness: 0.06,
    side: THREE.DoubleSide,
  });

  const leftKerbGeo = build3DSerratedKerbGeometry(-1);
  const leftKerbMesh = new THREE.Mesh(leftKerbGeo, kerbMat);
  leftKerbMesh.castShadow = true;
  leftKerbMesh.receiveShadow = true;
  root.add(leftKerbMesh);

  const rightKerbGeo = build3DSerratedKerbGeometry(1);
  const rightKerbMesh = new THREE.Mesh(rightKerbGeo, kerbMat);
  rightKerbMesh.castShadow = true;
  rightKerbMesh.receiveShadow = true;
  root.add(rightKerbMesh);

  // -------------------------------------------------------------------------
  // 3. Figure-8 Solid 3D Bridge Overpass & Viaduct Substructure
  // -------------------------------------------------------------------------
  const bridgeGroup = new THREE.Group();
  bridgeGroup.name = 'SuzukaOverpassBridge';

  const concreteMat = new THREE.MeshStandardMaterial({
    color: theme.concreteHex,
    roughness: 0.82,
    metalness: 0.1,
    side: THREE.DoubleSide,
  });

  const steelMat = new THREE.MeshStandardMaterial({
    color: theme.steelHex,
    roughness: 0.42,
    metalness: 0.32,
  });

  const hazardTex = createHazardStripeTexture();
  const hazardMat = new THREE.MeshStandardMaterial({
    map: hazardTex,
    color: 0xffffff,
    roughness: 0.5,
  });

  let minDistSq = Infinity;
  let crossUnderIdx = Math.floor(0.38 * N);
  let crossOverIdx = Math.floor(0.78 * N);

  for (let i = Math.floor(0.33 * N); i < Math.floor(0.45 * N); i++) {
    for (let j = Math.floor(0.73 * N); j < Math.floor(0.85 * N); j++) {
      const dx = samples[i].position.x - samples[j].position.x;
      const dz = samples[i].position.z - samples[j].position.z;
      const d2 = dx * dx + dz * dz;
      if (d2 < minDistSq) {
        minDistSq = d2;
        crossUnderIdx = i;
        crossOverIdx = j;
      }
    }
  }

  const bridgeDeckVerts: number[] = [];
  const bridgeDeckIndices: number[] = [];
  const bStart = Math.floor(0.672 * N);
  const bEnd = Math.floor(0.888 * N);
  const parapetInnerOffset = roadHalfWidth + kerbWidth;
  const parapetOuterOffset = parapetInnerOffset + 0.5;

  for (let j = bStart; j <= bEnd; j++) {
    const s = samples[((j % N) + N) % N];
    const pL_in = s.position.clone().addScaledVector(s.right, -parapetInnerOffset);
    const pR_in = s.position.clone().addScaledVector(s.right, parapetInnerOffset);
    const pL_out = s.position.clone().addScaledVector(s.right, -parapetOuterOffset);
    const pR_out = s.position.clone().addScaledVector(s.right, parapetOuterOffset);

    const underSlabY = Math.max(-0.08, s.position.y - 1.3);
    const uL = new THREE.Vector3(pL_out.x, underSlabY, pL_out.z);
    const uR = new THREE.Vector3(pR_out.x, underSlabY, pR_out.z);

    const tL_out = pL_out.clone().add(new THREE.Vector3(0, 1.1, 0));
    const tR_out = pR_out.clone().add(new THREE.Vector3(0, 1.1, 0));
    const tL_in = pL_in.clone().add(new THREE.Vector3(0, 1.1, 0));
    const tR_in = pR_in.clone().add(new THREE.Vector3(0, 1.1, 0));

    bridgeDeckVerts.push(
      uL.x, uL.y, uL.z,
      uR.x, uR.y, uR.z,
      pL_in.x, pL_in.y, pL_in.z,
      pR_in.x, pR_in.y, pR_in.z,
      tL_out.x, tL_out.y, tL_out.z,
      tR_out.x, tR_out.y, tR_out.z,
      tL_in.x, tL_in.y, tL_in.z,
      tR_in.x, tR_in.y, tR_in.z
    );

    if (j > bStart) {
      const stepIdx = j - bStart;
      const prev = (stepIdx - 1) * 8;
      const curr = stepIdx * 8;

      bridgeDeckIndices.push(prev + 1, prev + 0, curr + 0);
      bridgeDeckIndices.push(prev + 1, curr + 0, curr + 1);

      bridgeDeckIndices.push(prev + 0, curr + 0, curr + 4);
      bridgeDeckIndices.push(prev + 0, curr + 4, prev + 4);

      bridgeDeckIndices.push(curr + 1, prev + 1, prev + 5);
      bridgeDeckIndices.push(curr + 1, prev + 5, curr + 5);

      bridgeDeckIndices.push(prev + 4, curr + 4, curr + 6);
      bridgeDeckIndices.push(prev + 4, curr + 6, prev + 6);
      bridgeDeckIndices.push(prev + 6, curr + 6, curr + 2);
      bridgeDeckIndices.push(prev + 6, curr + 2, prev + 2);

      bridgeDeckIndices.push(curr + 5, prev + 5, prev + 7);
      bridgeDeckIndices.push(curr + 5, prev + 7, curr + 7);
      bridgeDeckIndices.push(curr + 7, prev + 7, prev + 3);
      bridgeDeckIndices.push(curr + 7, prev + 3, curr + 3);
    }
  }

  const bridgeDeckGeo = new THREE.BufferGeometry();
  bridgeDeckGeo.setAttribute('position', new THREE.Float32BufferAttribute(bridgeDeckVerts, 3));
  bridgeDeckGeo.setIndex(bridgeDeckIndices);
  bridgeDeckGeo.computeVertexNormals();

  const bridgeDeckMesh = new THREE.Mesh(bridgeDeckGeo, concreteMat);
  bridgeDeckMesh.castShadow = true;
  bridgeDeckMesh.receiveShadow = true;
  bridgeGroup.add(bridgeDeckMesh);

  function getDistToLowerRoad2D(x: number, z: number): number {
    let minSq = Infinity;
    for (let i = crossUnderIdx - 45; i <= crossUnderIdx + 45; i++) {
      const sp = samples[((i % N) + N) % N].position;
      const dx = x - sp.x;
      const dz = z - sp.z;
      const d2 = dx * dx + dz * dz;
      if (d2 < minSq) minSq = d2;
    }
    return Math.sqrt(minSq);
  }

  let jBefore = crossOverIdx - 10;
  for (let j = crossOverIdx - 1; j >= crossOverIdx - 28; j--) {
    const sU = samples[((j % N) + N) % N];
    const pL = sU.position.clone().addScaledVector(sU.right, -4.5);
    const pR = sU.position.clone().addScaledVector(sU.right, 4.5);
    if (getDistToLowerRoad2D(pL.x, pL.z) >= 7.4 && getDistToLowerRoad2D(pR.x, pR.z) >= 7.4) {
      jBefore = j;
      break;
    }
  }

  let jAfter = crossOverIdx + 10;
  for (let j = crossOverIdx + 1; j <= crossOverIdx + 28; j++) {
    const sU = samples[((j % N) + N) % N];
    const pL = sU.position.clone().addScaledVector(sU.right, -4.5);
    const pR = sU.position.clone().addScaledVector(sU.right, 4.5);
    if (getDistToLowerRoad2D(pL.x, pL.z) >= 7.4 && getDistToLowerRoad2D(pR.x, pR.z) >= 7.4) {
      jAfter = j;
      break;
    }
  }

  const bridgeConcreteParts: THREE.BufferGeometry[] = [];
  const bridgeHazardParts: THREE.BufferGeometry[] = [];
  const bridgeMat4 = new THREE.Matrix4();

  const sharedCapBeamGeo = new THREE.BoxGeometry(11.4, 0.95, 2.2);
  for (const jBent of [jBefore, jAfter]) {
    const sU = samples[((jBent % N) + N) % N];
    const colH = Math.max(2.0, sU.position.y - 1.05);
    const pLPos = sU.position.clone().addScaledVector(sU.right, -4.5);
    const pRPos = sU.position.clone().addScaledVector(sU.right, 4.5);

    const mainPierGeo = new THREE.CylinderGeometry(1.05, 1.25, colH, 14);
    composeBakeMatrix(bridgeMat4, [pLPos.x, colH * 0.5, pLPos.z]);
    bridgeConcreteParts.push(bakeTransformedGeo(mainPierGeo, bridgeMat4, { keepUv: false }));
    composeBakeMatrix(bridgeMat4, [pRPos.x, colH * 0.5, pRPos.z]);
    bridgeConcreteParts.push(bakeTransformedGeo(mainPierGeo, bridgeMat4, { keepUv: false }));
    mainPierGeo.dispose();

    composeBakeMatrix(bridgeMat4, [sU.position.x, sU.position.y - 1.2, sU.position.z], sU.quaternion);
    bridgeConcreteParts.push(bakeTransformedGeo(sharedCapBeamGeo, bridgeMat4, { keepUv: false }));
  }
  sharedCapBeamGeo.dispose();

  const sOver = samples[crossOverIdx];
  const sharedHazPlateGeo = new THREE.BoxGeometry(0.25, 0.65, 11.2);
  for (const sideSign of [-1, 1]) {
    const hazPos = sOver.position.clone().addScaledVector(sOver.right, sideSign * 5.92);
    hazPos.y = sOver.position.y - 0.85;
    composeBakeMatrix(bridgeMat4, hazPos, sOver.quaternion);
    bridgeHazardParts.push(bakeTransformedGeo(sharedHazPlateGeo, bridgeMat4, { keepUv: true }));
  }
  sharedHazPlateGeo.dispose();

  const sharedViaductCapGeo = new THREE.BoxGeometry(11.0, 0.8, 1.8);
  for (let j = bStart + 24; j <= bEnd - 24; j += 26) {
    if (j >= jBefore - 14 && j <= jAfter + 14) continue;
    const vSample = samples[((j % N) + N) % N];
    const vH = vSample.position.y - 1.15;
    if (vH < 1.2) continue;

    const pLPos = vSample.position.clone().addScaledVector(vSample.right, -4.5);
    const pRPos = vSample.position.clone().addScaledVector(vSample.right, 4.5);

    if (getDistToLowerRoad2D(pLPos.x, pLPos.z) < 9.0 || getDistToLowerRoad2D(pRPos.x, pRPos.z) < 9.0) {
      continue;
    }

    const vPierGeo = new THREE.CylinderGeometry(0.85, 1.05, vH, 12);
    composeBakeMatrix(bridgeMat4, [pLPos.x, vH * 0.5, pLPos.z]);
    bridgeConcreteParts.push(bakeTransformedGeo(vPierGeo, bridgeMat4, { keepUv: false }));
    composeBakeMatrix(bridgeMat4, [pRPos.x, vH * 0.5, pRPos.z]);
    bridgeConcreteParts.push(bakeTransformedGeo(vPierGeo, bridgeMat4, { keepUv: false }));
    vPierGeo.dispose();

    composeBakeMatrix(bridgeMat4, [vSample.position.x, vSample.position.y - 1.15, vSample.position.z], vSample.quaternion);
    bridgeConcreteParts.push(bakeTransformedGeo(sharedViaductCapGeo, bridgeMat4, { keepUv: false }));
  }
  sharedViaductCapGeo.dispose();

  const mergedBridgeSubGeo = mergeStaticParts(bridgeConcreteParts);
  if (mergedBridgeSubGeo) {
    const bridgeSubMesh = new THREE.Mesh(mergedBridgeSubGeo, concreteMat);
    bridgeSubMesh.receiveShadow = true;
    bridgeGroup.add(bridgeSubMesh);
  }
  const mergedBridgeHazardGeo = mergeStaticParts(bridgeHazardParts);
  if (mergedBridgeHazardGeo) {
    bridgeGroup.add(new THREE.Mesh(mergedBridgeHazardGeo, hazardMat));
  }

  root.add(bridgeGroup);

  // -------------------------------------------------------------------------
  // 4. Start / Finish Gantry (High Overhead at Y = +8.2m)
  // -------------------------------------------------------------------------
  const gantryGroup = new THREE.Group();
  gantryGroup.name = 'StartFinishGantry';

  const gantrySteelParts: THREE.BufferGeometry[] = [];
  const gantryBarGeo = new THREE.BoxGeometry(16.5, 0.9, 1.2);
  const gantryBarPos = startSample.position.clone().add(new THREE.Vector3(0, 8.2, 0));
  composeBakeMatrix(bridgeMat4, gantryBarPos, startSample.quaternion);
  gantrySteelParts.push(bakeTransformedGeo(gantryBarGeo, bridgeMat4, { keepUv: false }));
  gantryBarGeo.dispose();

  const towerGeo = new THREE.BoxGeometry(0.8, 8.2, 0.8);
  const towerLPos = startSample.position.clone().addScaledVector(startSample.right, -7.8).add(new THREE.Vector3(0, 4.1, 0));
  composeBakeMatrix(bridgeMat4, towerLPos);
  gantrySteelParts.push(bakeTransformedGeo(towerGeo, bridgeMat4, { keepUv: false }));
  const towerRPos = startSample.position.clone().addScaledVector(startSample.right, 7.8).add(new THREE.Vector3(0, 4.1, 0));
  composeBakeMatrix(bridgeMat4, towerRPos);
  gantrySteelParts.push(bakeTransformedGeo(towerGeo, bridgeMat4, { keepUv: false }));
  towerGeo.dispose();

  const sceneryBuckets: StaticSceneryBuckets = {
    seatParts: [],
    concreteParts: [],
    steelParts: [],
    glassParts: [],
    paintedParts: [],
    signs: [],
  };

  const mergedGantrySteelGeo = mergeStaticParts(gantrySteelParts);
  if (mergedGantrySteelGeo) {
    gantryGroup.add(new THREE.Mesh(mergedGantrySteelGeo, steelMat));
  }

  const gantryHeaderGroup = new THREE.Group();
  gantryHeaderGroup.position.copy(gantryBarPos);
  gantryHeaderGroup.quaternion.copy(startSample.quaternion);
  gantryGroup.add(gantryHeaderGroup);

  const startBannerWorldPos = new THREE.Vector3(0, 1.35, 0)
    .applyQuaternion(startSample.quaternion)
    .add(gantryBarPos);
  sceneryBuckets.signs.push({
    w: 11.5,
    h: 1.7,
    d: 0.35,
    worldMatrix: composeBakeMatrix(new THREE.Matrix4(), startBannerWorldPos, startSample.quaternion),
    title: 'SUZUKA GRAND PRIX',
    sub: theme.gantrySubText,
    bg: '#0f172a',
    textCol: '#f59e0b',
  });

  const lightLamps: THREE.Mesh[] = [];
  const sharedLampGeo = new THREE.SphereGeometry(0.32, 14, 14);
  for (let l = 0; l < 5; l++) {
    const lamp = new THREE.Mesh(
      sharedLampGeo,
      new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        emissive: 0x000000,
        emissiveIntensity: 0.0,
      })
    );
    lamp.position.set(-2.8 + l * 1.4, -0.1, 0.7);
    gantryHeaderGroup.add(lamp);
    lightLamps.push(lamp);
  }

  root.add(gantryGroup);

  function setStartLights(count: number) {
    for (let l = 0; l < 5; l++) {
      const mat = lightLamps[l].material as THREE.MeshStandardMaterial;
      if (count === 6) {
        mat.color.setHex(0x10b981);
        mat.emissive.setHex(0x10b981);
        mat.emissiveIntensity = 2.5;
      } else if (count > l) {
        mat.color.setHex(0xef4444);
        mat.emissive.setHex(0xef4444);
        mat.emissiveIntensity = 2.0;
      } else {
        mat.color.setHex(0x0f172a);
        mat.emissive.setHex(0x000000);
        mat.emissiveIntensity = 0.0;
      }
    }
  }

  // -------------------------------------------------------------------------
  // 5. Rich Trackside World: 5 Grandstands, Pit Complex, Control Tower,
  //    Tire Barriers, Nobori Flags, Floodlights, Motopia Park, 360° Mountains,
  //    Volumetric Sky Clouds, and 600+ Multi-Tiered Instanced Trees
  // -------------------------------------------------------------------------
  const sceneryGroup = new THREE.Group();
  sceneryGroup.name = 'SuzukaSceneryGroup';

  function getMinDistanceToTrack2D(x: number, z: number): number {
    let minSq = Infinity;
    for (let i = 0; i < N; i += 2) {
      const sp = samples[i].position;
      const dx = x - sp.x;
      const dz = z - sp.z;
      const dSq = dx * dx + dz * dz;
      if (dSq < minSq) minSq = dSq;
    }
    return Math.sqrt(minSq);
  }

  function isClearOfAllTrack(x: number, z: number, minClearanceMeters: number): boolean {
    const minSq = minClearanceMeters * minClearanceMeters;
    for (let i = 0; i < N; i += 2) {
      const sp = samples[i].position;
      const dx = x - sp.x;
      const dz = z - sp.z;
      if (dx * dx + dz * dz < minSq) return false;
    }
    return true;
  }

  const exclusionZones: { x: number; z: number; r: number }[] = [];

  const straightAnchor = samples[28];
  const probePlus = straightAnchor.position.clone().addScaledVector(straightAnchor.right, 45);
  const probeMinus = straightAnchor.position.clone().addScaledVector(straightAnchor.right, -45);
  const outfieldSign =
    getMinDistanceToTrack2D(probePlus.x, probePlus.z) > getMinDistanceToTrack2D(probeMinus.x, probeMinus.z) ? 1 : -1;
  const infieldSign = -outfieldSign;

  const grandstandSeatsTex = createGrandstandSeatsTexture();
  const grandstandSeatMat = new THREE.MeshStandardMaterial({
    map: grandstandSeatsTex,
    color: 0xffffff,
    roughness: 0.72,
  });
  const flagPalette = [0xef4444, 0xf59e0b, 0x3b82f6, 0x10b981, 0xec4899];
  const crowdSpritePlacements: CrowdSpritePlacement[] = [];
  const scLocalMat = new THREE.Matrix4();
  const scWorldMat = new THREE.Matrix4();

  // A. Main Grandstand on Start/Finish Straight
  appendSpectatorGrandstandParts(
    straightAnchor,
    outfieldSign,
    24.0,
    72,
    6,
    0xf8fafc,
    'SUZUKA CIRCUIT · 鈴鹿サーキット',
    'MEXT ELEMENTARY ENGLISH GRAND PRIX',
    '#0f172a',
    flagPalette,
    sceneryBuckets,
    crowdSpritePlacements
  );

  for (let zOff = -38; zOff <= 38; zOff += 12) {
    const p = straightAnchor.position
      .clone()
      .addScaledVector(straightAnchor.right, outfieldSign * 24.0)
      .addScaledVector(straightAnchor.tangent, zOff);
    exclusionZones.push({ x: p.x, z: p.z, r: 22 });
  }

  // B. 4 Additional Secondary Grandstands around the Circuit (Turn 1, S-Curves, Hairpin, Casio Chicane)
  const secondaryStands = [
    {
      frac: 0.068,
      offset: 24.0,
      len: 44,
      tiers: 5,
      awning: 0xdc2626,
      title: 'FIRST CURVE · 第1コーナー',
      sub: 'BRAKE & TURN RIGHT! · 右へ曲がろう！',
      bg: '#991b1b',
    },
    {
      frac: 0.205,
      offset: 23.0,
      len: 38,
      tiers: 4,
      awning: 0x0284c7,
      title: 'S-CURVES ARENA · S字コーナー',
      sub: 'RHYTHM LEFT & RIGHT! · リズムよく走ろう！',
      bg: '#1e3a8a',
    },
    {
      frac: 0.488,
      offset: 23.0,
      len: 40,
      tiers: 5,
      awning: 0xf59e0b,
      title: 'HAIRPIN STAND · ヘアピン席',
      sub: 'SLOW IN, FAST OUT! · しっかり減速！',
      bg: '#78350f',
    },
    {
      frac: 0.935,
      offset: 25.0,
      len: 42,
      tiers: 5,
      awning: 0x10b981,
      title: 'CASIO CHICANE · シケイン席',
      sub: 'FINAL SPRINT TO FINISH! · ゴールへ全力！',
      bg: '#064e3b',
    },
  ];

  for (const st of secondaryStands) {
    const sAnchor = samples[Math.floor(st.frac * N)];
    const pPlus = sAnchor.position.clone().addScaledVector(sAnchor.right, st.offset);
    const pMinus = sAnchor.position.clone().addScaledVector(sAnchor.right, -st.offset);
    const side = getMinDistanceToTrack2D(pPlus.x, pPlus.z) >= getMinDistanceToTrack2D(pMinus.x, pMinus.z) ? 1 : -1;
    const standPos = side === 1 ? pPlus : pMinus;

    if (isClearOfAllTrack(standPos.x, standPos.z, 17.5)) {
      appendSpectatorGrandstandParts(
        sAnchor,
        side,
        st.offset,
        st.len,
        st.tiers,
        st.awning,
        st.title,
        st.sub,
        st.bg,
        flagPalette,
        sceneryBuckets,
        crowdSpritePlacements
      );

      for (let zOff = -st.len * 0.5; zOff <= st.len * 0.5; zOff += 12) {
        const ep = standPos.clone().addScaledVector(sAnchor.tangent, zOff);
        exclusionZones.push({ x: ep.x, z: ep.z, r: 20 });
      }
    }
  }

  // B2. Single-Draw-Call Camera-Facing 2D Billboard Sprites for Cheering Students
  //     Uses a 512x512 transparent RGBA texture atlas (4x2 grid) and cylindrical
  //     billboarding in the vertex shader so all ~380 crowd clusters face the active
  //     camera and bounce/wave at 60 FPS with 0 CPU overhead.
  const crowdUniforms = {
    uAtlasTex: { value: createCheeringCrowdAtlasTexture() },
    uTime: { value: 0.0 },
    uCrowdBrightness: { value: theme.crowdBrightness },
  };

  if (crowdSpritePlacements.length > 0) {
    const billboardGeo = new THREE.PlaneGeometry(1.85, 2.25);
    // Shift quad upward so y = 0 sits flush on the grandstand bench tier
    billboardGeo.translate(0, 1.125, 0);

    const crowdMetaArray = new Float32Array(crowdSpritePlacements.length * 3);
    crowdSpritePlacements.forEach((cp, idx) => {
      crowdMetaArray[idx * 3 + 0] = cp.atlasIndex;
      crowdMetaArray[idx * 3 + 1] = cp.phase;
      crowdMetaArray[idx * 3 + 2] = cp.scale;
    });
    billboardGeo.setAttribute('aCrowdMeta', new THREE.InstancedBufferAttribute(crowdMetaArray, 3));

    const crowdBillboardMat = new THREE.ShaderMaterial({
      uniforms: crowdUniforms,
      transparent: true,
      depthWrite: true,
      side: THREE.DoubleSide,
      vertexShader: /* glsl */ `
        attribute vec3 aCrowdMeta;
        uniform float uTime;
        varying vec2 vAtlasUv;

        void main() {
          float cellIdx = aCrowdMeta.x;
          float phase = aCrowdMeta.y;
          float scale = aCrowdMeta.z;

          // Compute 4x2 Texture Atlas sub-cell UV (with 2% inner padding to prevent bleeding)
          float col = mod(cellIdx, 4.0);
          float row = floor(cellIdx / 4.0);
          // CanvasTexture has flipY=false so top of sprite (uv.y=1) maps to top of cell (y=0)
          float uCell = (uv.x * 0.94 + 0.03 + col) * 0.25;
          float vCell = ((1.0 - uv.y) * 0.94 + 0.03 + row) * 0.50;
          vAtlasUv = vec2(uCell, vCell);

          // Extract world-space anchor of this crowd sprite instance
          vec3 worldCenter = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;

          // Cylindrical Camera-Facing Billboarding around vertical Y axis
          vec3 toCam = cameraPosition - worldCenter;
          toCam.y = 0.0;
          float distXZ = length(toCam);
          vec3 forward = distXZ > 0.001 ? toCam / distXZ : vec3(0.0, 0.0, 1.0);
          vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), forward));
          vec3 up = vec3(0.0, 1.0, 0.0);

          // Rhythmic cheering bounce & upper-body wave animation
          float bounce = abs(sin(uTime * 5.2 + phase)) * 0.18;
          float sway = sin(uTime * 3.8 + phase * 1.3) * 0.09 * uv.y;

          vec3 localPos = position * scale;
          vec3 worldPos = worldCenter
            + right * (localPos.x + sway)
            + up * (localPos.y + bounce)
            + forward * localPos.z;

          gl_Position = projectionMatrix * viewMatrix * vec4(worldPos, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D uAtlasTex;
        uniform float uCrowdBrightness;
        varying vec2 vAtlasUv;

        void main() {
          vec4 texel = texture2D(uAtlasTex, vAtlasUv);
          if (texel.a < 0.35) discard;
          gl_FragColor = vec4(texel.rgb * uCrowdBrightness, texel.a);
        }
      `,
    });

    const crowdInstanced = new THREE.InstancedMesh(
      billboardGeo,
      crowdBillboardMat,
      crowdSpritePlacements.length
    );
    const crowdDummy = new THREE.Object3D();
    crowdSpritePlacements.forEach((cp, idx) => {
      crowdDummy.position.set(cp.x, cp.y, cp.z);
      crowdDummy.rotation.set(0, 0, 0);
      crowdDummy.scale.setScalar(1);
      crowdDummy.updateMatrix();
      crowdInstanced.setMatrixAt(idx, crowdDummy.matrix);
    });
    crowdInstanced.instanceMatrix.needsUpdate = true;
    crowdInstanced.computeBoundingSphere();
    crowdInstanced.frustumCulled = false;
    sceneryGroup.add(crowdInstanced);
  }

  // C. F1 Pit Building, Rooftop Billboards, Pit-Wall Engineer Perches & Control Tower
  const pitPos = straightAnchor.position.clone().addScaledVector(straightAnchor.right, infieldSign * 19.5);
  pitPos.y = 0.0;
  const pitQuat = straightAnchor.quaternion;
  const pitMatrix = composeBakeMatrix(new THREE.Matrix4(), pitPos, pitQuat);

  const pitTowardTrackX = -infieldSign;
  const pitLengthZ = 52;

  const pitBldgGeo = new THREE.BoxGeometry(7.2, 7.6, pitLengthZ);
  composeBakeMatrix(scLocalMat, [0, 3.8, 0]);
  scWorldMat.multiplyMatrices(pitMatrix, scLocalMat);
  sceneryBuckets.paintedParts.push(
    bakeTransformedGeo(pitBldgGeo, scWorldMat, { colorHex: theme.pitBuildingHex, keepUv: false })
  );
  pitBldgGeo.dispose();

  // Architectural second-floor sun-visor overhang
  const overhangGeo = new THREE.BoxGeometry(8.4, 0.45, pitLengthZ + 1.0);
  composeBakeMatrix(scLocalMat, [pitTowardTrackX * 0.4, 7.6, 0]);
  scWorldMat.multiplyMatrices(pitMatrix, scLocalMat);
  sceneryBuckets.steelParts.push(bakeTransformedGeo(overhangGeo, scWorldMat, { keepUv: false }));
  overhangGeo.dispose();

  // Rooftop Sponsor Billboard atop Pit Building (queued into unified billboard atlas)
  const pitRoofWorldPos = new THREE.Vector3(pitTowardTrackX * 2.8, 9.6, 0)
    .applyQuaternion(pitQuat)
    .add(pitPos);
  sceneryBuckets.signs.push({
    w: 0.4,
    h: 3.6,
    d: 16.5,
    worldMatrix: composeBakeMatrix(new THREE.Matrix4(), pitRoofWorldPos, pitQuat),
    title: 'TEAM GARAGE & PIT LANE',
    sub: 'KEEP UP YOUR ENGLISH STREAK!',
    bg: '#1e293b',
    textCol: '#38bdf8',
  });

  const teamHeaderColors = [0xdc2626, 0x2563eb, 0xf97316, 0x0d9488, 0x16a34a, 0x9333ea, 0xe11d48];
  const sharedDoorGeo = new THREE.BoxGeometry(0.18, 3.1, 5.0);
  const sharedHeaderGeo = new THREE.BoxGeometry(0.24, 0.6, 5.2);

  for (let g = 0; g < 7; g++) {
    const gz = -21.0 + g * 7.0;
    composeBakeMatrix(scLocalMat, [pitTowardTrackX * 3.62, 1.55, gz]);
    scWorldMat.multiplyMatrices(pitMatrix, scLocalMat);
    sceneryBuckets.paintedParts.push(
      bakeTransformedGeo(sharedDoorGeo, scWorldMat, { colorHex: 0x0f172a, keepUv: false })
    );

    composeBakeMatrix(scLocalMat, [pitTowardTrackX * 3.64, 3.4, gz]);
    scWorldMat.multiplyMatrices(pitMatrix, scLocalMat);
    sceneryBuckets.paintedParts.push(
      bakeTransformedGeo(sharedHeaderGeo, scWorldMat, {
        colorHex: teamHeaderColors[g % teamHeaderColors.length],
        keepUv: false,
      })
    );
  }
  sharedDoorGeo.dispose();
  sharedHeaderGeo.dispose();

  const glassMat = new THREE.MeshStandardMaterial({
    color: theme.glassHex,
    roughness: 0.1,
    metalness: 0.85,
    emissive: theme.glassHex,
    emissiveIntensity: theme.glassEmissiveIntensity,
  });
  const pitGlassGeo = new THREE.BoxGeometry(0.18, 2.3, pitLengthZ - 3);
  composeBakeMatrix(scLocalMat, [pitTowardTrackX * 3.64, 5.6, 0]);
  scWorldMat.multiplyMatrices(pitMatrix, scLocalMat);
  sceneryBuckets.glassParts.push(bakeTransformedGeo(pitGlassGeo, scWorldMat, { keepUv: false }));
  pitGlassGeo.dispose();

  const pitWallGeo = new THREE.BoxGeometry(0.45, 1.15, pitLengthZ - 4);
  composeBakeMatrix(scLocalMat, [pitTowardTrackX * 6.5, 0.58, 0]);
  scWorldMat.multiplyMatrices(pitMatrix, scLocalMat);
  sceneryBuckets.concreteParts.push(bakeTransformedGeo(pitWallGeo, scWorldMat, { keepUv: false }));
  pitWallGeo.dispose();

  // Pit-Wall Race Engineer Telemetry Perches
  const perchBoxGeo = new THREE.BoxGeometry(1.3, 2.1, 2.8);
  const perchRoofGeo = new THREE.BoxGeometry(1.7, 0.2, 3.2);
  for (let pz = -16; pz <= 16; pz += 16) {
    composeBakeMatrix(scLocalMat, [pitTowardTrackX * 6.1, 1.6, pz]);
    scWorldMat.multiplyMatrices(pitMatrix, scLocalMat);
    sceneryBuckets.steelParts.push(bakeTransformedGeo(perchBoxGeo, scWorldMat, { keepUv: false }));

    composeBakeMatrix(scLocalMat, [pitTowardTrackX * 6.1, 2.75, pz]);
    scWorldMat.multiplyMatrices(pitMatrix, scLocalMat);
    sceneryBuckets.paintedParts.push(
      bakeTransformedGeo(perchRoofGeo, scWorldMat, { colorHex: 0xdc2626, keepUv: false })
    );
  }
  perchBoxGeo.dispose();
  perchRoofGeo.dispose();

  // Iconic Suzuka Pagoda Race Control Tower at forward Turn-1 end of Pit Complex (z = -31.5)
  const towerMatrix = new THREE.Matrix4().multiplyMatrices(
    pitMatrix,
    composeBakeMatrix(scLocalMat, [-pitTowardTrackX * 2.2, 0, -31.5])
  );
  const towerBaseWorldPos = new THREE.Vector3(-pitTowardTrackX * 2.2, 0, -31.5)
    .applyQuaternion(pitQuat)
    .add(pitPos);

  const towerWinTex = createControlTowerWindowsTexture(theme);
  const towerWinMat = new THREE.MeshStandardMaterial({
    map: towerWinTex,
    color: 0xffffff,
    roughness: 0.25,
    metalness: 0.5,
    emissive: 0xffffff,
    emissiveMap: towerWinTex,
    emissiveIntensity: theme.towerWindowEmissiveIntensity,
  });
  const towerShaft = new THREE.Mesh(new THREE.BoxGeometry(7.6, 21.0, 7.6), towerWinMat);
  towerShaft.position.copy(towerBaseWorldPos).add(new THREE.Vector3(0, 10.5, 0));
  towerShaft.quaternion.copy(pitQuat);
  sceneryGroup.add(towerShaft);

  const obsDeckGeo = new THREE.CylinderGeometry(5.6, 4.8, 3.4, 12);
  composeBakeMatrix(scLocalMat, [0, 22.2, 0]);
  scWorldMat.multiplyMatrices(towerMatrix, scLocalMat);
  sceneryBuckets.glassParts.push(bakeTransformedGeo(obsDeckGeo, scWorldMat, { keepUv: false }));
  obsDeckGeo.dispose();

  const towerCapGeo = new THREE.CylinderGeometry(2.2, 5.8, 1.8, 12);
  composeBakeMatrix(scLocalMat, [0, 24.8, 0]);
  scWorldMat.multiplyMatrices(towerMatrix, scLocalMat);
  sceneryBuckets.paintedParts.push(
    bakeTransformedGeo(towerCapGeo, scWorldMat, { colorHex: theme.pitBuildingHex, keepUv: false })
  );
  towerCapGeo.dispose();

  const antennaMastGeo = new THREE.CylinderGeometry(0.15, 0.25, 6.5, 8);
  composeBakeMatrix(scLocalMat, [0, 28.5, 0]);
  scWorldMat.multiplyMatrices(towerMatrix, scLocalMat);
  sceneryBuckets.steelParts.push(bakeTransformedGeo(antennaMastGeo, scWorldMat, { keepUv: false }));
  antennaMastGeo.dispose();

  const mastBeacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.45, 10, 10),
    new THREE.MeshBasicMaterial({ color: 0xef4444 })
  );
  mastBeacon.position.copy(towerBaseWorldPos).add(new THREE.Vector3(0, 31.8, 0));
  sceneryGroup.add(mastBeacon);

  for (let zOff = -28; zOff <= 40; zOff += 12) {
    const p = straightAnchor.position
      .clone()
      .addScaledVector(straightAnchor.right, infieldSign * 19.5)
      .addScaledVector(straightAnchor.tangent, zOff);
    exclusionZones.push({ x: p.x, z: p.z, r: 19 });
  }

  // D. Diegetic ESL Sector Checkpoint Archways (Overhead English Phrase Gantries)
  const eslCheckpoints = [
    { frac: 0.09, title: 'FIRST CURVE · 第1コーナー', sub: 'TURN RIGHT! · 右へ曲がろう！', bg: '#0f172a' },
    { frac: 0.18, title: 'TURN LEFT & RIGHT!', sub: 'S-CURVES · 右・左に曲がろう！', bg: '#1e3a8a' },
    { frac: 0.34, title: 'DEGNER CURVE · デグナー', sub: 'SHARP CORNER! · 鋭いカーブ！', bg: '#0369a1' },
    { frac: 0.48, title: 'SLOW DOWN! 180°', sub: 'HAIRPIN TURN · 減速して回ろう！', bg: '#991b1b' },
    { frac: 0.62, title: 'SPEED UP! GO!', sub: 'SPOON CURVE · 加速しよう！', bg: '#065f46' },
    { frac: 0.86, title: 'GO STRAIGHT! FAST!', sub: '130R HIGH SPEED · まっすぐ全速力！', bg: '#581c87' },
  ];

  const archPillarGeo = new THREE.CylinderGeometry(0.32, 0.38, 7.6, 8);
  const archMatrix = new THREE.Matrix4();

  for (const cp of eslCheckpoints) {
    const s = samples[Math.floor(cp.frac * N)];
    composeBakeMatrix(archMatrix, s.position, s.quaternion);

    composeBakeMatrix(scLocalMat, [-7.1, 3.8, 0]);
    scWorldMat.multiplyMatrices(archMatrix, scLocalMat);
    sceneryBuckets.steelParts.push(bakeTransformedGeo(archPillarGeo, scWorldMat, { keepUv: false }));

    composeBakeMatrix(scLocalMat, [7.1, 3.8, 0]);
    scWorldMat.multiplyMatrices(archMatrix, scLocalMat);
    sceneryBuckets.steelParts.push(bakeTransformedGeo(archPillarGeo, scWorldMat, { keepUv: false }));

    sceneryBuckets.signs.push({
      w: 14.6,
      h: 1.55,
      d: 0.5,
      worldMatrix: composeBakeMatrix(
        new THREE.Matrix4(),
        [s.position.x, s.position.y + 7.4, s.position.z],
        s.quaternion
      ),
      title: cp.title,
      sub: cp.sub,
      bg: cp.bg,
      textCol: '#ffffff',
    });
  }
  archPillarGeo.dispose();

  // E. Corner Brake Distance Marker Boards (150m, 100m, 50m -> batched to 1 draw call via 3-cell atlas!)
  const brakeCorners = [0.065, 0.335, 0.475, 0.595, 0.935];
  const markerBoardGeo = new THREE.BoxGeometry(1.6, 1.1, 0.16);
  const markerPostGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.2, 6);
  const markerLabels = ['50m', '100m', '150m'];
  const brakeAtlas = createBrakeMarkerAtlasTexture(markerLabels);
  const brakeBoardParts: THREE.BufferGeometry[] = [];
  const markerMatrix = new THREE.Matrix4();

  for (const cFrac of brakeCorners) {
    for (let m = 0; m < 3; m++) {
      const mIdx = (Math.floor(cFrac * N) - (m + 1) * 14 + N) % N;
      const ms = samples[mIdx];
      if (ms.elevation > 0.2) continue;
      const mPos = ms.position.clone().addScaledVector(ms.right, outfieldSign * 7.4);
      if (!isClearOfAllTrack(mPos.x, mPos.z, 6.2)) continue;

      composeBakeMatrix(markerMatrix, [mPos.x, 0, mPos.z], ms.quaternion);

      composeBakeMatrix(scLocalMat, [0, 1.25, 0]);
      scWorldMat.multiplyMatrices(markerMatrix, scLocalMat);
      brakeBoardParts.push(bakeTransformedGeo(markerBoardGeo, scWorldMat, { uvRect: brakeAtlas.rects[m] }));

      composeBakeMatrix(scLocalMat, [0, 0.6, 0]);
      scWorldMat.multiplyMatrices(markerMatrix, scLocalMat);
      sceneryBuckets.steelParts.push(bakeTransformedGeo(markerPostGeo, scWorldMat, { keepUv: false }));
    }
  }
  markerBoardGeo.dispose();
  markerPostGeo.dispose();

  const mergedBrakeBoardsGeo = mergeStaticParts(brakeBoardParts);
  if (mergedBrakeBoardsGeo) {
    sceneryGroup.add(new THREE.Mesh(mergedBrakeBoardsGeo, makeSignMaterial(brakeAtlas.tex, 0.4)));
  }

  // F. Iconic Suzuka Ferris Wheel (観覧車) & Motopia Amusement Park Plaza outside Casio Chicane
  const sChicane = samples[Math.floor(0.95 * N)];
  const ferrisWheelRoot = new THREE.Group();
  const fwPos = sChicane.position.clone().addScaledVector(sChicane.right, outfieldSign * 56.0);
  ferrisWheelRoot.position.set(fwPos.x, 0.0, fwPos.z);
  exclusionZones.push({ x: fwPos.x, z: fwPos.z, r: 32 });
  const fwMatrix = composeBakeMatrix(new THREE.Matrix4(), [fwPos.x, 0.0, fwPos.z]);

  const plazaBaseGeo = new THREE.CylinderGeometry(18.5, 19.5, 0.6, 24);
  composeBakeMatrix(scLocalMat, [0, 0.3, 0]);
  scWorldMat.multiplyMatrices(fwMatrix, scLocalMat);
  sceneryBuckets.concreteParts.push(bakeTransformedGeo(plazaBaseGeo, scWorldMat, { keepUv: false }));
  plazaBaseGeo.dispose();

  // Colorful Motopia Festival Pavilions flanking the Ferris Wheel
  const tentConeGeo = new THREE.ConeGeometry(4.2, 3.2, 8);
  const tentBodyGeo = new THREE.CylinderGeometry(3.4, 3.4, 2.8, 8);
  const tentRoofColors = [0xef4444, 0x3b82f6, 0xf59e0b, 0x10b981];
  for (let tIdx = 0; tIdx < 4; tIdx++) {
    const tAngle = (tIdx / 4) * Math.PI * 2 + 0.4;
    const tx = Math.cos(tAngle) * 13.5;
    const tz = Math.sin(tAngle) * 13.5;

    composeBakeMatrix(scLocalMat, [tx, 1.7, tz]);
    scWorldMat.multiplyMatrices(fwMatrix, scLocalMat);
    sceneryBuckets.paintedParts.push(
      bakeTransformedGeo(tentBodyGeo, scWorldMat, { colorHex: 0xf8fafc, keepUv: false })
    );

    composeBakeMatrix(scLocalMat, [tx, 4.5, tz]);
    scWorldMat.multiplyMatrices(fwMatrix, scLocalMat);
    sceneryBuckets.paintedParts.push(
      bakeTransformedGeo(tentConeGeo, scWorldMat, { colorHex: tentRoofColors[tIdx], keepUv: false })
    );
  }
  tentBodyGeo.dispose();
  tentConeGeo.dispose();

  const legMat = new THREE.MeshStandardMaterial({ color: theme.ferrisRimHex, roughness: 0.3, metalness: 0.6 });
  const ferrisRimMat = new THREE.MeshStandardMaterial({
    color: theme.ferrisRimHex,
    roughness: 0.28,
    metalness: 0.5,
    emissive: theme.ferrisRimEmissiveHex,
    emissiveIntensity: theme.ferrisEmissiveIntensity,
  });

  const hubHeight = 34.0;
  const wheelRadius = 25.0;
  const pHubL = new THREE.Vector3(-2.0, hubHeight, 0);
  const pHubR = new THREE.Vector3(2.0, hubHeight, 0);

  const ferrisLegParts: THREE.BufferGeometry[] = [];
  const legMid = new THREE.Vector3();
  const legQuat = new THREE.Quaternion();
  const legUp = new THREE.Vector3(0, 1, 0);
  const bakeStrutPart = (p0: THREE.Vector3, p1: THREE.Vector3, r0: number, r1: number) => {
    const dir = new THREE.Vector3().subVectors(p1, p0);
    const len = dir.length();
    const strutGeo = new THREE.CylinderGeometry(r1, r0, len, 8);
    legMid.lerpVectors(p0, p1, 0.5);
    legQuat.setFromUnitVectors(legUp, dir.normalize());
    composeBakeMatrix(scLocalMat, legMid, legQuat);
    ferrisLegParts.push(bakeTransformedGeo(strutGeo, scLocalMat, { keepUv: false }));
    strutGeo.dispose();
  };

  bakeStrutPart(new THREE.Vector3(-5.5, 0.5, -12.5), pHubL, 0.65, 0.45);
  bakeStrutPart(new THREE.Vector3(-5.5, 0.5, 12.5), pHubL, 0.65, 0.45);
  bakeStrutPart(new THREE.Vector3(5.5, 0.5, -12.5), pHubR, 0.65, 0.45);
  bakeStrutPart(new THREE.Vector3(5.5, 0.5, 12.5), pHubR, 0.65, 0.45);

  const mergedLegsGeo = mergeStaticParts(ferrisLegParts);
  if (mergedLegsGeo) {
    ferrisWheelRoot.add(new THREE.Mesh(mergedLegsGeo, legMat));
  }

  const ferrisWheelRotating = new THREE.Group();
  ferrisWheelRotating.position.set(0, hubHeight, 0);

  const ferrisSteelParts: THREE.BufferGeometry[] = [];
  const hubGeo = new THREE.CylinderGeometry(2.0, 2.0, 4.6, 14);
  hubGeo.rotateZ(Math.PI / 2);
  composeBakeMatrix(scLocalMat, [0, 0, 0]);
  ferrisSteelParts.push(bakeTransformedGeo(hubGeo, scLocalMat, { keepUv: false }));
  hubGeo.dispose();

  const ferrisRimParts: THREE.BufferGeometry[] = [];
  const rimGeo = new THREE.TorusGeometry(wheelRadius, 0.38, 8, 28);
  composeBakeMatrix(scLocalMat, [-1.3, 0, 0], [0, Math.PI / 2, 0]);
  ferrisRimParts.push(bakeTransformedGeo(rimGeo, scLocalMat, { keepUv: false }));
  composeBakeMatrix(scLocalMat, [1.3, 0, 0], [0, Math.PI / 2, 0]);
  ferrisRimParts.push(bakeTransformedGeo(rimGeo, scLocalMat, { keepUv: false }));
  rimGeo.dispose();

  const mergedRimsGeo = mergeStaticParts(ferrisRimParts);
  if (mergedRimsGeo) {
    ferrisWheelRotating.add(new THREE.Mesh(mergedRimsGeo, ferrisRimMat));
  }

  const gondolaColors = [0xef4444, 0x3b82f6, 0xf59e0b, 0x10b981, 0x8b5cf6, 0xec4899];
  const spokeGeo = new THREE.CylinderGeometry(0.14, 0.14, wheelRadius, 6);
  spokeGeo.translate(0, wheelRadius * 0.5, 0);
  const sharedGondolaGeo = new THREE.BoxGeometry(1.9, 2.1, 1.7);

  const gondolaParts: THREE.BufferGeometry[] = [];
  for (let g = 0; g < 16; g++) {
    const angle = (g / 16) * Math.PI * 2;
    composeBakeMatrix(scLocalMat, [0, 0, 0], [angle, 0, 0]);
    ferrisSteelParts.push(bakeTransformedGeo(spokeGeo, scLocalMat, { keepUv: false }));

    composeBakeMatrix(scLocalMat, [0, Math.sin(angle) * wheelRadius, Math.cos(angle) * wheelRadius]);
    gondolaParts.push(
      bakeTransformedGeo(sharedGondolaGeo, scLocalMat, {
        colorHex: gondolaColors[g % gondolaColors.length],
        keepUv: false,
      })
    );
  }
  const ferrisGondolaMat = createVertexEmissiveMaterial(theme.ferrisEmissiveIntensity * 0.65, 0.4, 0.2);
  const mergedGondolasGeo = mergeStaticParts(gondolaParts);
  if (mergedGondolasGeo) {
    ferrisWheelRotating.add(new THREE.Mesh(mergedGondolasGeo, ferrisGondolaMat));
  }
  spokeGeo.dispose();
  sharedGondolaGeo.dispose();

  const mergedFerrisSteelGeo = mergeStaticParts(ferrisSteelParts);
  if (mergedFerrisSteelGeo) {
    ferrisWheelRotating.add(new THREE.Mesh(mergedFerrisSteelGeo, steelMat));
  }

  ferrisWheelRoot.add(ferrisWheelRotating);
  sceneryGroup.add(ferrisWheelRoot);

  // G. 360° Panoramic Suzuka Mountain Range, Mt. Fuji & Volumetric 3D Sky Clouds
  const mountainHorizonGroup = new THREE.Group();
  mountainHorizonGroup.name = 'Suzuka360MountainPanorama';

  // Mt. Fuji centerpiece (base cone + snow cap merged into 1 draw call)
  const fujiBaseGeo = new THREE.ConeGeometry(420, 215, 32, 1, true);
  const fujiCapGeo = new THREE.ConeGeometry(168, 86, 32);
  const mergedFujiGeo = mergeStaticParts([
    bakeTransformedGeo(fujiBaseGeo, composeBakeMatrix(scLocalMat, [0, 107, 0]), {
      colorHex: theme.fujiBaseHex,
      keepUv: false,
    }),
    bakeTransformedGeo(fujiCapGeo, composeBakeMatrix(scLocalMat, [0, 171, 0]), {
      colorHex: theme.fujiCapHex,
      keepUv: false,
    }),
  ]);
  fujiBaseGeo.dispose();
  fujiCapGeo.dispose();
  if (mergedFujiGeo) {
    const fujiMesh = new THREE.Mesh(
      mergedFujiGeo,
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0.05 })
    );
    fujiMesh.position.set(-120, -2.0, -920);
    mountainHorizonGroup.add(fujiMesh);
  }

  // 28 Overlapping Suzuka Foothills & Mountain Peaks encircling the entire horizon (1 InstancedMesh draw call!)
  const mtnPeakGeo = new THREE.ConeGeometry(1, 1, 16, 4);
  mtnPeakGeo.translate(0, 0.5, 0);
  const mtnPosAttr = mtnPeakGeo.getAttribute('position');
  const mtnColArray = new Float32Array(mtnPosAttr.count * 3);
  const cValleyMist = new THREE.Color(theme.mountainValleyHex);
  const cForestMid = new THREE.Color(theme.mountainMidHex);
  const cAlpineCrest = new THREE.Color(theme.mountainCrestHex);
  const cTemp = new THREE.Color();
  for (let i = 0; i < mtnPosAttr.count; i++) {
    const vy = Math.max(0, Math.min(1, mtnPosAttr.getY(i)));
    if (vy < 0.68) {
      cTemp.copy(cValleyMist).lerp(cForestMid, vy / 0.68);
    } else {
      cTemp.copy(cForestMid).lerp(cAlpineCrest, (vy - 0.68) / 0.32);
    }
    mtnColArray[i * 3 + 0] = cTemp.r;
    mtnColArray[i * 3 + 1] = cTemp.g;
    mtnColArray[i * 3 + 2] = cTemp.b;
  }
  mtnPeakGeo.setAttribute('color', new THREE.BufferAttribute(mtnColArray, 3));

  const mtnColors = theme.mountainColors;
  const mtnSharedMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.92,
    metalness: 0.02,
  });
  const mtnCount = 28;
  const mtnInstanced = new THREE.InstancedMesh(mtnPeakGeo, mtnSharedMat, mtnCount);
  const mtnDummy = new THREE.Object3D();
  const mtnTint = new THREE.Color();
  for (let m = 0; m < mtnCount; m++) {
    const angle = (m / mtnCount) * Math.PI * 2;
    const dist = 740 + ((m * 137) % 240);
    const mx = Math.cos(angle) * dist;
    const mz = Math.sin(angle) * dist - 80;
    const radiusW = 140 + ((m * 73) % 130);
    const heightY = 65 + ((m * 97) % 85);

    mtnDummy.position.set(mx, -2, mz);
    mtnDummy.rotation.set(0, m * 0.7, 0);
    mtnDummy.scale.set(radiusW, heightY, radiusW * 0.9);
    mtnDummy.updateMatrix();
    mtnInstanced.setMatrixAt(m, mtnDummy.matrix);
    mtnTint.setHex(mtnColors[m % mtnColors.length]);
    mtnInstanced.setColorAt(m, mtnTint);
  }
  mtnInstanced.instanceMatrix.needsUpdate = true;
  if (mtnInstanced.instanceColor) mtnInstanced.instanceColor.needsUpdate = true;
  mtnInstanced.computeBoundingSphere();
  mountainHorizonGroup.add(mtnInstanced);
  sceneryGroup.add(mountainHorizonGroup);

  // Volumetric 3D Fluffy Sky Clouds (InstancedMesh — 34 clouds in 1 draw call!)
  const cloudPuff1 = new THREE.DodecahedronGeometry(12, 1);
  const cloudPuff2 = new THREE.DodecahedronGeometry(9.5, 1);
  cloudPuff2.translate(10.5, -1.5, 2.0);
  const cloudPuff3 = new THREE.DodecahedronGeometry(8.8, 1);
  cloudPuff3.translate(-10.0, -2.0, -1.5);
  const cloudPuff4 = new THREE.DodecahedronGeometry(7.5, 1);
  cloudPuff4.translate(3.0, 5.2, -2.0);
  const mergedCloudGeo = mergeSimpleGeometries([cloudPuff1, cloudPuff2, cloudPuff3, cloudPuff4]);
  const cloudMat = new THREE.MeshStandardMaterial({
    color: theme.cloudMeshHex,
    roughness: 0.9,
    metalness: 0.0,
    emissive: theme.cloudMeshHex,
    emissiveIntensity: theme.cloudEmissiveIntensity,
  });
  const cloudCount = 34;
  const cloudInstanced = new THREE.InstancedMesh(mergedCloudGeo, cloudMat, cloudCount);
  const cloudDummy = new THREE.Object3D();
  for (let c = 0; c < cloudCount; c++) {
    const cAngle = (c / cloudCount) * Math.PI * 2 + (c % 3) * 0.18;
    const cDist = 240 + ((c * 173) % 520);
    const cx = Math.cos(cAngle) * cDist;
    const cz = Math.sin(cAngle) * cDist - 60;
    const cy = 88 + ((c * 43) % 68);
    const cScale = 0.85 + ((c * 29) % 100) / 100;

    cloudDummy.position.set(cx, cy, cz);
    cloudDummy.rotation.set(0, cAngle + Math.PI / 2, 0);
    cloudDummy.scale.set(cScale * 1.35, cScale * 0.72, cScale);
    cloudDummy.updateMatrix();
    cloudInstanced.setMatrixAt(c, cloudDummy.matrix);
  }
  cloudInstanced.instanceMatrix.needsUpdate = true;
  cloudInstanced.computeBoundingSphere();
  sceneryGroup.add(cloudInstanced);

  // 5 Animated Multi-Part Hot Air Balloons over the circuit
  const hotAirBalloons: { group: THREE.Object3D; baseY: number; phase: number }[] = [];
  const balloonSpecs = [
    { x: -75, y: 52, z: 45, color1: 0xef4444, color2: 0xf59e0b, phase: 0.0 },
    { x: 115, y: 58, z: -95, color1: 0x06b6d4, color2: 0x3b82f6, phase: 1.6 },
    { x: -165, y: 56, z: -185, color1: 0xec4899, color2: 0xa855f7, phase: 3.1 },
    { x: 85, y: 50, z: 125, color1: 0x10b981, color2: 0xfacc15, phase: 4.5 },
    { x: -35, y: 62, z: -260, color1: 0xf97316, color2: 0xef4444, phase: 5.4 },
  ];
  const balloonEnvGeo = new THREE.SphereGeometry(7.8, 16, 14);
  const balloonSkirtGeo = new THREE.CylinderGeometry(4.4, 2.1, 4.0, 12);
  const balloonBasketGeo = new THREE.BoxGeometry(2.5, 2.1, 2.5);
  const balloonVertexMat = createVertexEmissiveMaterial(theme.balloonEmissiveIntensity, 0.5, 0.08);

  for (const bs of balloonSpecs) {
    const bParts: THREE.BufferGeometry[] = [];
    composeBakeMatrix(scLocalMat, [0, 6.0, 0], undefined, [1, 1.18, 1]);
    bParts.push(bakeTransformedGeo(balloonEnvGeo, scLocalMat, { colorHex: bs.color1, keepUv: false }));
    composeBakeMatrix(scLocalMat, [0, 0.2, 0]);
    bParts.push(bakeTransformedGeo(balloonSkirtGeo, scLocalMat, { colorHex: bs.color2, keepUv: false }));
    composeBakeMatrix(scLocalMat, [0, -3.8, 0]);
    bParts.push(bakeTransformedGeo(balloonBasketGeo, scLocalMat, { colorHex: 0x92400e, keepUv: false }));

    const mergedBalloonGeo = mergeStaticParts(bParts);
    if (mergedBalloonGeo) {
      const bMesh = new THREE.Mesh(mergedBalloonGeo, balloonVertexMat);
      bMesh.position.set(bs.x, bs.y, bs.z);
      sceneryGroup.add(bMesh);
      hotAirBalloons.push({ group: bMesh, baseY: bs.y, phase: bs.phase });
    }
  }
  balloonEnvGeo.dispose();
  balloonSkirtGeo.dispose();
  balloonBasketGeo.dispose();

  // H. Grounded Trackside Sponsor & Vocabulary Billboards (queued into unified billboard atlas)
  const billboardData = [
    { frac: 0.04, title: 'WELCOME TO SUZUKA!', sub: 'SPEAK ENGLISH & RACE FAST!', bg: '#0f172a', text: '#38bdf8' },
    { frac: 0.12, title: 'APPLE · りんご', sub: 'I LIKE SWEET RED APPLES!', bg: '#dc2626', text: '#ffffff' },
    { frac: 0.23, title: 'BASEBALL · 野球', sub: 'LET’S PLAY BASEBALL!', bg: '#1d4ed8', text: '#ffffff' },
    { frac: 0.33, title: 'SUZUKA CIRCUIT', sub: 'MIE PREFECTURE JAPAN', bg: '#0284c7', text: '#ffffff' },
    { frac: 0.43, title: 'LIBRARY · 図書館', sub: 'WHERE IS THE LIBRARY?', bg: '#047857', text: '#ffffff' },
    { frac: 0.52, title: 'RABBIT · うさぎ', sub: 'THE RABBIT HOPS FAST!', bg: '#7c3aed', text: '#ffffff' },
    { frac: 0.62, title: 'CHAMPION · 優勝', sub: 'ENGLISH GRAND PRIX 2026', bg: '#f59e0b', text: '#0f172a' },
    { frac: 0.74, title: 'BREAKFAST · 朝食', sub: 'I EAT BREAKFAST AT SEVEN!', bg: '#be123c', text: '#ffffff' },
    { frac: 0.90, title: 'SUNDAY · 日曜日', sub: 'SEE YOU ON SUNDAY!', bg: '#4338ca', text: '#ffffff' },
  ];

  const sharedBbLegGeo = new THREE.BoxGeometry(0.3, 1.4, 0.3);
  const bbMatrix = new THREE.Matrix4();

  for (const b of billboardData) {
    const s = samples[Math.floor(b.frac * N)];
    const dist = 15.5;
    const pPlus = s.position.clone().addScaledVector(s.right, dist);
    const pMinus = s.position.clone().addScaledVector(s.right, -dist);
    const side = getMinDistanceToTrack2D(pPlus.x, pPlus.z) >= getMinDistanceToTrack2D(pMinus.x, pMinus.z) ? 1 : -1;
    const bPos = side === 1 ? pPlus : pMinus;

    const end1 = bPos.clone().addScaledVector(s.right, -5.0);
    const end2 = bPos.clone().addScaledVector(s.right, 5.0);
    if (!isClearOfAllTrack(end1.x, end1.z, 9.5) || !isClearOfAllTrack(end2.x, end2.z, 9.5)) continue;

    composeBakeMatrix(bbMatrix, [bPos.x, 2.8, bPos.z], s.quaternion);
    sceneryBuckets.signs.push({
      w: 10.0,
      h: 3.0,
      d: 0.35,
      worldMatrix: bbMatrix.clone(),
      title: b.title,
      sub: b.sub,
      bg: b.bg,
      textCol: b.text,
    });

    for (const lx of [-3.6, 3.6]) {
      composeBakeMatrix(scLocalMat, [lx, -2.1, 0]);
      scWorldMat.multiplyMatrices(bbMatrix, scLocalMat);
      sceneryBuckets.steelParts.push(bakeTransformedGeo(sharedBbLegGeo, scWorldMat, { keepUv: false }));
    }

    exclusionZones.push({ x: bPos.x, z: bPos.z, r: 9.5 });
  }
  sharedBbLegGeo.dispose();

  // Consolidate all static scenery buckets + unified billboard atlas into 6 batched world meshes!
  if (sceneryBuckets.signs.length > 0) {
    const signAtlas = createBillboardAtlasTexture(sceneryBuckets.signs);
    const unitSignGeo = new THREE.BoxGeometry(1, 1, 1);
    const signParts: THREE.BufferGeometry[] = [];
    sceneryBuckets.signs.forEach((sign, idx) => {
      composeBakeMatrix(scLocalMat, [0, 0, 0], undefined, [sign.w, sign.h, sign.d]);
      scWorldMat.multiplyMatrices(sign.worldMatrix, scLocalMat);
      signParts.push(bakeTransformedGeo(unitSignGeo, scWorldMat, { uvRect: signAtlas.rects[idx] }));
    });
    unitSignGeo.dispose();
    const mergedSignsGeo = mergeStaticParts(signParts);
    if (mergedSignsGeo) {
      sceneryGroup.add(new THREE.Mesh(mergedSignsGeo, makeSignMaterial(signAtlas.tex, 0.38)));
    }
  }

  const mergedSeatGeo = mergeStaticParts(sceneryBuckets.seatParts);
  if (mergedSeatGeo) {
    const seatMesh = new THREE.Mesh(mergedSeatGeo, grandstandSeatMat);
    seatMesh.castShadow = true;
    seatMesh.receiveShadow = true;
    sceneryGroup.add(seatMesh);
  } else {
    grandstandSeatMat.dispose();
  }

  const mergedConcreteGeo = mergeStaticParts(sceneryBuckets.concreteParts);
  if (mergedConcreteGeo) {
    const staticConcreteMesh = new THREE.Mesh(mergedConcreteGeo, concreteMat);
    staticConcreteMesh.receiveShadow = true;
    sceneryGroup.add(staticConcreteMesh);
  }

  const mergedSteelGeo = mergeStaticParts(sceneryBuckets.steelParts);
  if (mergedSteelGeo) {
    sceneryGroup.add(new THREE.Mesh(mergedSteelGeo, steelMat));
  }

  const mergedGlassGeo = mergeStaticParts(sceneryBuckets.glassParts);
  if (mergedGlassGeo) {
    sceneryGroup.add(new THREE.Mesh(mergedGlassGeo, glassMat));
  } else {
    glassMat.dispose();
  }

  const mergedPaintedGeo = mergeStaticParts(sceneryBuckets.paintedParts);
  if (mergedPaintedGeo) {
    const staticPaintedMesh = new THREE.Mesh(
      mergedPaintedGeo,
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.48, metalness: 0.15 })
    );
    staticPaintedMesh.castShadow = true;
    staticPaintedMesh.receiveShadow = true;
    sceneryGroup.add(staticPaintedMesh);
  }

  // I. Batched InstancedMesh Trackside Details:
  //    1) Blue & White FIA Tire Barrier Stacks on Curve Run-offs
  //    2) Japanese Nobori Racing Banner Flags along the Circuit
  //    3) Tall Stadium Floodlight Towers
  const dummyObj = new THREE.Object3D();

  // 1) FIA Tire Barrier Stacks (2 stacked torus/cylinders per instance)
  const tireStackLower = new THREE.CylinderGeometry(0.68, 0.68, 0.45, 12);
  tireStackLower.translate(0, 0.23, 0);
  const tireStackUpper = new THREE.CylinderGeometry(0.68, 0.68, 0.45, 12);
  tireStackUpper.translate(0, 0.70, 0);
  const mergedTireStackGeo = mergeSimpleGeometries([tireStackLower, tireStackUpper]);
  const tireWallMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.75 });

  const tirePlacements: { x: number; z: number; color: THREE.Color }[] = [];
  for (let i = 0; i < N; i += 6) {
    if (cornerSpeedCaps[i] < 175 && samples[i].elevation < 0.05) {
      const s = samples[i];
      const tPos = s.position.clone().addScaledVector(s.right, outfieldSign * 7.8);
      if (isClearOfAllTrack(tPos.x, tPos.z, 6.8)) {
        const isBlue = (i / 6) % 2 === 0;
        tirePlacements.push({
          x: tPos.x,
          z: tPos.z,
          color: new THREE.Color(isBlue ? 0x1d4ed8 : 0xf8fafc),
        });
      }
    }
  }

  if (tirePlacements.length > 0) {
    const tireInstanced = new THREE.InstancedMesh(mergedTireStackGeo, tireWallMat, tirePlacements.length);
    tirePlacements.forEach((tp, idx) => {
      dummyObj.position.set(tp.x, 0, tp.z);
      dummyObj.rotation.set(0, 0, 0);
      dummyObj.scale.setScalar(1);
      dummyObj.updateMatrix();
      tireInstanced.setMatrixAt(idx, dummyObj.matrix);
      tireInstanced.setColorAt(idx, tp.color);
    });
    tireInstanced.instanceMatrix.needsUpdate = true;
    if (tireInstanced.instanceColor) tireInstanced.instanceColor.needsUpdate = true;
    tireInstanced.computeBoundingSphere();
    sceneryGroup.add(tireInstanced);
  }

  // 2) Japanese Nobori Festival Racing Flags along the Track Perimeter
  const flagBannerGeo = new THREE.BoxGeometry(0.85, 3.2, 0.08);
  flagBannerGeo.translate(0.45, 2.5, 0);
  const flagPoleInstGeo = new THREE.CylinderGeometry(0.06, 0.07, 4.2, 6);
  flagPoleInstGeo.translate(0, 2.1, 0);
  const flagMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55 });

  const noboriPlacements: { x: number; z: number; rotY: number; color: THREE.Color }[] = [];
  const noboriColors = [0xef4444, 0xf59e0b, 0x06b6d4, 0x10b981, 0xec4899, 0x3b82f6];
  for (let i = 0; i < N; i += 16) {
    const s = samples[i];
    if (s.elevation > 0.1) continue;
    for (const side of [-1, 1]) {
      const fPos = s.position.clone().addScaledVector(s.right, side * 9.6);
      if (!isClearOfAllTrack(fPos.x, fPos.z, 8.6)) continue;
      noboriPlacements.push({
        x: fPos.x,
        z: fPos.z,
        rotY: Math.atan2(s.tangent.x, s.tangent.z),
        color: new THREE.Color(noboriColors[(i + (side > 0 ? 1 : 0)) % noboriColors.length]),
      });
    }
  }

  if (noboriPlacements.length > 0) {
    const poleInst = new THREE.InstancedMesh(flagPoleInstGeo, steelMat, noboriPlacements.length);
    const clothInst = new THREE.InstancedMesh(flagBannerGeo, flagMat, noboriPlacements.length);
    noboriPlacements.forEach((np, idx) => {
      dummyObj.position.set(np.x, 0, np.z);
      dummyObj.rotation.set(0, np.rotY, 0);
      dummyObj.scale.setScalar(1);
      dummyObj.updateMatrix();
      poleInst.setMatrixAt(idx, dummyObj.matrix);
      clothInst.setMatrixAt(idx, dummyObj.matrix);
      clothInst.setColorAt(idx, np.color);
    });
    poleInst.instanceMatrix.needsUpdate = true;
    clothInst.instanceMatrix.needsUpdate = true;
    if (clothInst.instanceColor) clothInst.instanceColor.needsUpdate = true;
    poleInst.computeBoundingSphere();
    clothInst.computeBoundingSphere();
    sceneryGroup.add(poleInst);
    sceneryGroup.add(clothInst);
  }

  // 3) Tall Stadium Floodlight Towers (InstancedMesh)
  const floodPoleGeo = new THREE.CylinderGeometry(0.24, 0.38, 18.0, 8);
  floodPoleGeo.translate(0, 9.0, 0);
  const floodHeadGeo = new THREE.BoxGeometry(3.6, 1.4, 0.9);
  floodHeadGeo.translate(0, 18.2, 0.4);
  const floodGlowMat = new THREE.MeshStandardMaterial({
    color: theme.floodGlowHex,
    emissive: theme.floodGlowHex,
    emissiveIntensity: theme.floodEmissiveIntensity,
    roughness: 0.2,
  });

  const floodPlacements: { x: number; z: number; rotY: number }[] = [];
  for (let i = 45; i < N; i += 85) {
    const s = samples[i];
    if (s.elevation > 0.2) continue;
    const fPos = s.position.clone().addScaledVector(s.right, outfieldSign * 14.5);
    if (!isClearOfAllTrack(fPos.x, fPos.z, 12.5)) continue;
    let nearStand = false;
    for (const ez of exclusionZones) {
      const dx = fPos.x - ez.x;
      const dz = fPos.z - ez.z;
      if (dx * dx + dz * dz < (ez.r + 4) * (ez.r + 4)) {
        nearStand = true;
        break;
      }
    }
    if (nearStand) continue;
    floodPlacements.push({
      x: fPos.x,
      z: fPos.z,
      rotY: Math.atan2(-s.right.x * outfieldSign, -s.right.z * outfieldSign),
    });
  }

  if (floodPlacements.length > 0) {
    const floodPoleInst = new THREE.InstancedMesh(floodPoleGeo, steelMat, floodPlacements.length);
    const floodHeadInst = new THREE.InstancedMesh(floodHeadGeo, floodGlowMat, floodPlacements.length);
    floodPlacements.forEach((fp, idx) => {
      dummyObj.position.set(fp.x, 0, fp.z);
      dummyObj.rotation.set(0, fp.rotY, 0);
      dummyObj.scale.setScalar(1);
      dummyObj.updateMatrix();
      floodPoleInst.setMatrixAt(idx, dummyObj.matrix);
      floodHeadInst.setMatrixAt(idx, dummyObj.matrix);
    });
    floodPoleInst.instanceMatrix.needsUpdate = true;
    floodHeadInst.instanceMatrix.needsUpdate = true;
    floodPoleInst.computeBoundingSphere();
    floodHeadInst.computeBoundingSphere();
    sceneryGroup.add(floodPoleInst);
    sceneryGroup.add(floodHeadInst);
  }

  // J. Lush Multi-Tiered InstancedMesh Forest / Desert Cacti & Rock Outcrops (520+ items in 4 GPU draw calls!)
  const isDesertBiome = theme.id === 'DESERT';
  const treeTrunkGeo = new THREE.CylinderGeometry(0.32, 0.5, 3.4, 6);
  treeTrunkGeo.translate(0, 1.7, 0);
  const trunkMat = new THREE.MeshStandardMaterial({
    color: isDesertBiome ? 0x784c24 : 0x4a2e18,
    roughness: 0.9,
  });

  // 1) Pine slot: Multi-tiered Japanese Pine OR 3D Desert Saguaro Cactus
  let pineCanopyGeo: THREE.BufferGeometry;
  if (isDesertBiome) {
    // Sculpted 3D Saguaro Cactus (central trunk + left & right elbow arms, grounded at y=0)
    const sagMain = new THREE.CylinderGeometry(0.52, 0.66, 6.8, 9);
    sagMain.translate(0, 3.4, 0);
    const sagTop = new THREE.SphereGeometry(0.52, 8, 6);
    sagTop.translate(0, 6.8, 0);

    const sagArmLHoriz = new THREE.CylinderGeometry(0.34, 0.38, 1.6, 8);
    sagArmLHoriz.rotateZ(Math.PI / 2);
    sagArmLHoriz.translate(-0.95, 3.2, 0);
    const sagArmLVert = new THREE.CylinderGeometry(0.32, 0.35, 2.5, 8);
    sagArmLVert.translate(-1.65, 4.35, 0);
    const sagArmLTop = new THREE.SphereGeometry(0.32, 7, 5);
    sagArmLTop.translate(-1.65, 5.6, 0);

    const sagArmRHoriz = new THREE.CylinderGeometry(0.32, 0.36, 1.45, 8);
    sagArmRHoriz.rotateZ(-Math.PI / 2);
    sagArmRHoriz.translate(0.88, 4.1, 0);
    const sagArmRVert = new THREE.CylinderGeometry(0.30, 0.33, 2.2, 8);
    sagArmRVert.translate(1.5, 5.1, 0);
    const sagArmRTop = new THREE.SphereGeometry(0.30, 7, 5);
    sagArmRTop.translate(1.5, 6.2, 0);

    pineCanopyGeo = mergeSimpleGeometries(
      [sagMain, sagTop, sagArmLHoriz, sagArmLVert, sagArmLTop, sagArmRHoriz, sagArmRVert, sagArmRTop],
      {
        minY: 0.0,
        maxY: 7.4,
        bottomShade: 0.62,
        topBoost: 1.08,
      }
    );
  } else {
    const pineTier1 = new THREE.ConeGeometry(3.2, 3.8, 9);
    pineTier1.translate(0, 3.8, 0);
    const pineTier2 = new THREE.ConeGeometry(2.5, 3.4, 9);
    pineTier2.translate(0, 5.8, 0);
    const pineTier3 = new THREE.ConeGeometry(1.7, 2.8, 9);
    pineTier3.translate(0, 7.6, 0);
    pineCanopyGeo = mergeSimpleGeometries([pineTier1, pineTier2, pineTier3], {
      minY: 1.9,
      maxY: 9.0,
      bottomShade: 0.62,
      topBoost: 1.08,
    });
  }
  const pineMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.84,
  });

  // 2) Cedar slot: Lush Japanese Cedar OR 3D Red-Rock Sandstone Boulders / Hoodoo Outcrop
  let cedarCanopyGeo: THREE.BufferGeometry;
  if (isDesertBiome) {
    // 3D Red-Rock Sandstone Boulder & Hoodoo Outcrop grounded directly on desert sand (y=0)
    const rockMain = new THREE.DodecahedronGeometry(2.9, 1);
    rockMain.scale(1.25, 0.85, 1.1);
    rockMain.translate(0, 2.1, 0);
    const rockSpire = new THREE.DodecahedronGeometry(2.1, 1);
    rockSpire.scale(0.85, 1.45, 0.85);
    rockSpire.translate(1.2, 3.2, 0.5);
    const rockSide = new THREE.DodecahedronGeometry(1.8, 1);
    rockSide.scale(1.15, 0.72, 1.05);
    rockSide.translate(-1.6, 1.2, -0.4);
    cedarCanopyGeo = mergeSimpleGeometries([rockMain, rockSpire, rockSide], {
      minY: 0.0,
      maxY: 6.2,
      bottomShade: 0.58,
      topBoost: 1.08,
    });
  } else {
    const cedarTier1 = new THREE.IcosahedronGeometry(3.1, 2);
    cedarTier1.scale(1.05, 0.82, 1.05);
    cedarTier1.translate(0, 4.3, 0);
    const cedarTier2 = new THREE.IcosahedronGeometry(2.4, 2);
    cedarTier2.scale(1.0, 0.85, 1.0);
    cedarTier2.translate(0.5, 6.2, 0.3);
    const cedarTier3 = new THREE.IcosahedronGeometry(1.9, 2);
    cedarTier3.translate(-0.4, 7.5, -0.3);
    cedarCanopyGeo = mergeSimpleGeometries([cedarTier1, cedarTier2, cedarTier3], {
      minY: 2.2,
      maxY: 9.2,
      bottomShade: 0.64,
      topBoost: 1.06,
    });
  }
  const cedarMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: isDesertBiome ? 0.92 : 0.85,
  });

  // 3) Sakura slot: Multi-puff Sakura Cherry Blossom Tree OR Desert Oasis Fan-Palm Crown
  const sakPuff1 = new THREE.IcosahedronGeometry(2.8, 2);
  sakPuff1.scale(isDesertBiome ? 1.35 : 1.12, isDesertBiome ? 0.48 : 0.78, isDesertBiome ? 1.35 : 1.12);
  sakPuff1.translate(0, 4.3, 0);
  const sakPuff2 = new THREE.IcosahedronGeometry(2.2, 2);
  sakPuff2.scale(isDesertBiome ? 1.25 : 1.08, isDesertBiome ? 0.45 : 0.8, isDesertBiome ? 1.25 : 1.08);
  sakPuff2.translate(1.45, 5.1, 0.65);
  const sakPuff3 = new THREE.IcosahedronGeometry(2.1, 2);
  sakPuff3.scale(isDesertBiome ? 1.25 : 1.08, isDesertBiome ? 0.45 : 0.8, isDesertBiome ? 1.25 : 1.08);
  sakPuff3.translate(-1.35, 4.9, -0.7);
  const sakPuff4 = new THREE.IcosahedronGeometry(1.85, 2);
  sakPuff4.scale(1.1, isDesertBiome ? 0.55 : 0.78, 1.1);
  sakPuff4.translate(0.1, 6.1, -0.2);
  const sakuraCanopyGeo = mergeSimpleGeometries([sakPuff1, sakPuff2, sakPuff3, sakPuff4], {
    minY: 2.4,
    maxY: 7.6,
    bottomShade: 0.66,
    topBoost: 1.04,
  });
  const sakuraMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.82,
  });

  function isClearOfAllSceneryAndTrack(x: number, z: number, minTrackDist: number): boolean {
    if (!isClearOfAllTrack(x, z, minTrackDist)) return false;
    for (const ez of exclusionZones) {
      const dx = x - ez.x;
      const dz = z - ez.z;
      if (dx * dx + dz * dz < ez.r * ez.r) return false;
    }
    return true;
  }

  let rngSeed = 133742;
  function nextRng(): number {
    rngSeed = (rngSeed * 1664525 + 1013904223) >>> 0;
    return rngSeed / 4294967296;
  }

  // Continuous 360-degree circuit coverage (0.00 to 1.00) with both near-track and forest belts!
  const treeClusters = [
    // Main Straight & First Curve framing groves (behind Pit Complex & Grandstands + Turn 1)
    { start: 0.94, end: 1.00, count: 42, type: 'sakura', minOffset: 14, maxOffset: 58 },
    { start: 0.00, end: 0.12, count: 68, type: 'sakura', minOffset: 14, maxOffset: 65 },
    // S-Curves & Dunlop Curve dense groves
    { start: 0.12, end: 0.34, count: 95, type: 'pine', minOffset: 13.5, maxOffset: 68 },
    // Degner Curves
    { start: 0.34, end: 0.44, count: 58, type: 'cedar', minOffset: 13.5, maxOffset: 62 },
    // Hairpin & 200R Sakura Avenue
    { start: 0.44, end: 0.58, count: 82, type: 'sakura', minOffset: 13.5, maxOffset: 64 },
    // Spoon Curve Cedar Forest
    { start: 0.58, end: 0.74, count: 88, type: 'cedar', minOffset: 13.5, maxOffset: 70 },
    // Back Straight & 130R Pine Forest
    { start: 0.74, end: 0.94, count: 92, type: 'pine', minOffset: 14, maxOffset: 68 },
  ];

  interface TreePlacement {
    x: number;
    z: number;
    scale: number;
    rotY: number;
    type: string;
    tint: THREE.Color;
  }
  const placements: TreePlacement[] = [];

  for (const tc of treeClusters) {
    let placed = 0;
    let attempts = 0;
    while (placed < tc.count && attempts < tc.count * 14) {
      attempts++;
      const f = (tc.start + nextRng() * (tc.end - tc.start)) % 1.0;
      const s = samples[Math.floor(f * N)];
      const side = nextRng() > 0.5 ? 1 : -1;
      const lat = side * (tc.minOffset + nextRng() * (tc.maxOffset - tc.minOffset));

      const tx = s.position.x + s.right.x * lat;
      const tz = s.position.z + s.right.z * lat;

      if (!isClearOfAllSceneryAndTrack(tx, tz, 13.0)) continue;

      const scale = 0.85 + nextRng() * 0.48;
      const rotY = nextRng() * Math.PI * 2;
      const fRange =
        tc.type === 'sakura'
          ? theme.treeFoliage.sakura
          : tc.type === 'cedar'
          ? theme.treeFoliage.cedar
          : theme.treeFoliage.pine;
      const tint = new THREE.Color().setHSL(
        (fRange.hMin + nextRng() * fRange.hRange) % 1.0,
        fRange.sMin + nextRng() * fRange.sRange,
        fRange.lMin + nextRng() * fRange.lRange
      );

      placements.push({ x: tx, z: tz, scale, rotY, type: tc.type, tint });
      exclusionZones.push({ x: tx, z: tz, r: 4.2 });
      placed++;
    }
  }

  const pinePlacements = placements.filter((p) => p.type === 'pine');
  const cedarPlacements = placements.filter((p) => p.type === 'cedar');
  const sakuraPlacements = placements.filter((p) => p.type === 'sakura');
  // In Desert biome, Saguaro cacti ('pine') and Red-Rock Boulders ('cedar') sit directly on the ground without wooden tree trunks
  const trunkPlacements = isDesertBiome ? sakuraPlacements : placements;

  if (trunkPlacements.length > 0) {
    const trunkInstanced = new THREE.InstancedMesh(treeTrunkGeo, trunkMat, trunkPlacements.length);
    trunkPlacements.forEach((p, idx) => {
      dummyObj.position.set(p.x, 0, p.z);
      dummyObj.rotation.set(0, p.rotY, 0);
      dummyObj.scale.setScalar(p.scale);
      dummyObj.updateMatrix();
      trunkInstanced.setMatrixAt(idx, dummyObj.matrix);
    });
    trunkInstanced.instanceMatrix.needsUpdate = true;
    trunkInstanced.computeBoundingSphere();
    sceneryGroup.add(trunkInstanced);
  }

  const buildCanopyInstanced = (geo: THREE.BufferGeometry, mat: THREE.Material, list: TreePlacement[]) => {
    if (list.length === 0) return;
    const inst = new THREE.InstancedMesh(geo, mat, list.length);
    list.forEach((p, idx) => {
      dummyObj.position.set(p.x, 0, p.z);
      dummyObj.rotation.set(0, p.rotY, 0);
      dummyObj.scale.setScalar(p.scale);
      dummyObj.updateMatrix();
      inst.setMatrixAt(idx, dummyObj.matrix);
      inst.setColorAt(idx, p.tint);
    });
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    inst.computeBoundingSphere();
    inst.castShadow = true;
    sceneryGroup.add(inst);
  };

  buildCanopyInstanced(pineCanopyGeo, pineMat, pinePlacements);
  buildCanopyInstanced(cedarCanopyGeo, cedarMat, cedarPlacements);
  buildCanopyInstanced(sakuraCanopyGeo, sakuraMat, sakuraPlacements);

  root.add(sceneryGroup);

  // -------------------------------------------------------------------------
  // 6. Grounded Suzuka Manicured Landscape Turf (Y = -0.10m)
  // -------------------------------------------------------------------------
  const grassTex = createTurfTexture(theme);

  const grassMat = new THREE.MeshStandardMaterial({
    map: grassTex,
    color: 0xffffff,
    roughness: 0.88,
    metalness: 0.02,
  });
  const grassMesh = new THREE.Mesh(new THREE.CircleGeometry(860, 64), grassMat);
  grassMesh.rotation.x = -Math.PI / 2;
  grassMesh.position.set(0, -0.1, 0);
  grassMesh.receiveShadow = true;
  root.add(grassMesh);

  // Zero-allocation circular pool for spline evaluation
  const EVAL_POOL_SIZE = 32;
  const _evalPool: SuzukaSampleResult[] = Array.from({ length: EVAL_POOL_SIZE }, () => ({
    position: new THREE.Vector3(),
    tangent: new THREE.Vector3(),
    normal: new THREE.Vector3(),
    right: new THREE.Vector3(),
    quaternion: new THREE.Quaternion(),
    sector: SUZUKA_SECTORS[0],
  }));
  let _evalPoolIndex = 0;
  const _evalLeft = new THREE.Vector3();
  const _evalRotMat = new THREE.Matrix4();

  function evaluate(progress: number, laneOffset: number = 0): SuzukaSampleResult {
    const rawPos = (((progress % 1.0) + 1.0) % 1.0) * N;
    const idx0 = Math.floor(rawPos) % N;
    const t = rawPos - Math.floor(rawPos);
    const idx1 = (idx0 + 1) % N;

    const s0 = samples[idx0];
    const s1 = samples[idx1];

    const res = _evalPool[_evalPoolIndex];
    _evalPoolIndex = (_evalPoolIndex + 1) % EVAL_POOL_SIZE;

    res.position.lerpVectors(s0.position, s1.position, t);
    res.tangent.lerpVectors(s0.tangent, s1.tangent, t).normalize();
    res.right.lerpVectors(s0.right, s1.right, t).normalize();
    res.normal.lerpVectors(s0.normal, s1.normal, t).normalize();

    if (laneOffset !== 0) {
      res.position.addScaledVector(res.right, laneOffset);
    }

    _evalLeft.crossVectors(res.normal, res.tangent).normalize();
    _evalRotMat.makeBasis(_evalLeft, res.normal, res.tangent);
    res.quaternion.setFromRotationMatrix(_evalRotMat);
    res.sector = s0.sector;

    return res;
  }

  let sceneryClock = 0;
  function updateScenery(dt: number) {
    sceneryClock += dt;
    crowdUniforms.uTime.value = sceneryClock;
    if (ferrisWheelRotating) {
      ferrisWheelRotating.rotation.x += dt * 0.08;
    }
    if (cloudInstanced) {
      cloudInstanced.rotation.y += dt * 0.0045;
    }
    for (const b of hotAirBalloons) {
      b.group.position.y = b.baseY + Math.sin(sceneryClock * 0.7 + b.phase) * 2.2;
      b.group.rotation.y += dt * 0.05;
    }
  }

  function applyAtmosphere(atmo: EvaluatedSuzukaAtmosphere) {
    roadMat.roughness = atmo.roadRoughness;
    roadMat.metalness = atmo.roadMetalness;
    roadMat.emissiveIntensity = atmo.roadEmissiveIntensity;
    redRoadMat.roughness = Math.min(0.95, atmo.roadRoughness + 0.03);
    redRoadMat.metalness = atmo.roadMetalness * 0.6;
    redRoadMat.emissiveIntensity = atmo.redRoadEmissiveIntensity;

    floodGlowMat.emissiveIntensity = atmo.floodEmissiveIntensity;
    ferrisRimMat.emissiveIntensity = atmo.ferrisEmissiveIntensity;
    if (ferrisGondolaMat.userData.uVColEmissive) {
      ferrisGondolaMat.userData.uVColEmissive.value = atmo.ferrisEmissiveIntensity * 0.65;
    }
    towerWinMat.emissiveIntensity = atmo.towerWindowEmissiveIntensity;
    glassMat.emissiveIntensity = atmo.glassEmissiveIntensity;
    if (balloonVertexMat.userData.uVColEmissive) {
      balloonVertexMat.userData.uVColEmissive.value = atmo.balloonEmissiveIntensity;
    }

    for (let i = 0; i < signMaterials.length; i++) {
      signMaterials[i].emissiveIntensity = atmo.signEmissiveIntensity;
    }

    cloudMat.color.setHex(atmo.cloudMeshHex);
    cloudMat.emissive.setHex(atmo.cloudMeshHex);
    cloudMat.emissiveIntensity = atmo.nightLightFactor * 0.12;
    cloudInstanced.visible = atmo.cloudCoverage > 0.16;

    crowdUniforms.uCrowdBrightness.value = atmo.crowdBrightness;
  }

  return {
    root,
    roadMesh,
    leftKerbMesh,
    rightKerbMesh,
    bridgeGroup,
    gantryGroup,
    sceneryGroup,
    updateScenery,
    setStartLights,
    applyAtmosphere,
    samples,
    totalLengthMeters,
    evaluate,
  };
}
