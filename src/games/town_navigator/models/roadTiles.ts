import * as THREE from 'three';
import {
  getAsphaltRoadTexture,
  getBoulevardPaverTexture,
  getTactilePavingTexture,
} from './wallTextures';

export type RoadTileType = 
  | 'STRAIGHT_Z' 
  | 'STRAIGHT_X' 
  | 'INTERSECTION_4WAY' 
  | 'T_JUNCTION_NORTH' 
  | 'T_JUNCTION_SOUTH' 
  | 'T_JUNCTION_EAST' 
  | 'T_JUNCTION_WEST' 
  | 'CORNER_NE' 
  | 'CORNER_NW' 
  | 'CORNER_SE' 
  | 'CORNER_SW' 
  | 'BOULEVARD_Z_WEST' 
  | 'BOULEVARD_Z_EAST' 
  | 'BOULEVARD_X_NORTH' 
  | 'BOULEVARD_X_SOUTH' 
  | 'BOULEVARD_CENTER_4WAY' 
  | 'BOULEVARD_JUNCTION_Z' 
  | 'BOULEVARD_JUNCTION_X';

// ============================================================================
// PROCEDURAL STREETSCAPE TEXTURES (Lazy Cached Singletons for Static Batching)
// ============================================================================

let cachedRoadSidewalkTex: THREE.CanvasTexture | null = null;
let cachedManholeTex: THREE.CanvasTexture | null = null;
let cachedStreetBannerTex: THREE.CanvasTexture | null = null;
let cachedPushButtonTex: THREE.CanvasTexture | null = null;
let cachedRoadStencilTex: THREE.CanvasTexture | null = null;

function getRoadStencilAtlasTexture(): THREE.CanvasTexture | null {
  if (cachedRoadStencilTex) return cachedRoadStencilTex;
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.clearRect(0, 0, 512, 256);

  // Q1 (0,0)-(256,128): Straight Lane Arrow (↑)
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.moveTo(128, 16);
  ctx.lineTo(174, 64);
  ctx.lineTo(146, 64);
  ctx.lineTo(146, 114);
  ctx.lineTo(110, 114);
  ctx.lineTo(110, 64);
  ctx.lineTo(82, 64);
  ctx.closePath();
  ctx.fill();

  // Q2 (256,0)-(512,128): Japanese "止まれ" (STOP) road stencil
  ctx.fillStyle = '#f8fafc';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 54px "BIZ UDPGothic", "UD Digi Kyokasho NP-R", sans-serif';
  ctx.fillText('止まれ', 384, 66);

  // Q3 (0,128)-(256,256): Authentic Japanese Jitensha Navi-Māku (自転車ナビマーク)
  // Painted directly onto asphalt (transparent background, no border box):
  // Top: 2 upward chevrons + solid upward arrow; Bottom: front-facing cyclist silhouette
  const naviBlue = '#0ea5e9';
  ctx.fillStyle = naviBlue;
  ctx.strokeStyle = naviBlue;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Top chevron 1 (y = 134..156)
  ctx.beginPath();
  ctx.moveTo(128, 132);
  ctx.lineTo(156, 150);
  ctx.lineTo(156, 160);
  ctx.lineTo(128, 142);
  ctx.lineTo(100, 160);
  ctx.lineTo(100, 150);
  ctx.closePath();
  ctx.fill();

  // Middle chevron 2 (y = 152..176)
  ctx.beginPath();
  ctx.moveTo(128, 151);
  ctx.lineTo(156, 169);
  ctx.lineTo(156, 179);
  ctx.lineTo(128, 161);
  ctx.lineTo(100, 179);
  ctx.lineTo(100, 169);
  ctx.closePath();
  ctx.fill();

  // Solid upward arrow (y = 170..199)
  ctx.beginPath();
  ctx.moveTo(128, 169);
  ctx.lineTo(156, 189);
  ctx.lineTo(140, 189);
  ctx.lineTo(140, 200);
  ctx.lineTo(116, 200);
  ctx.lineTo(116, 189);
  ctx.lineTo(100, 189);
  ctx.closePath();
  ctx.fill();

  // Front-view cyclist silhouette (y = 205..252)
  // Head
  ctx.beginPath();
  ctx.arc(128, 211, 5.5, 0, Math.PI * 2);
  ctx.fill();
  // Torso
  ctx.beginPath();
  ctx.moveTo(118, 219);
  ctx.lineTo(138, 219);
  ctx.lineTo(134, 231);
  ctx.lineTo(122, 231);
  ctx.closePath();
  ctx.fill();
  // Arms & wide handlebars
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.moveTo(117, 221);
  ctx.lineTo(107, 231);
  ctx.moveTo(139, 221);
  ctx.lineTo(149, 231);
  ctx.stroke();
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(102, 230);
  ctx.lineTo(128, 235);
  ctx.lineTo(154, 230);
  ctx.stroke();
  // Front vertical tire & fork
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.moveTo(128, 234);
  ctx.lineTo(128, 253);
  ctx.stroke();
  // Left & right legs/pedals
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(120, 235);
  ctx.lineTo(120, 246);
  ctx.moveTo(136, 235);
  ctx.lineTo(136, 249);
  ctx.stroke();

  // Q4 (256,128)-(512,256): "30" Zone Speed Stencil
  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(384, 192, 46, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#f8fafc';
  ctx.font = '900 48px sans-serif';
  ctx.fillText('30', 384, 194);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.userData.isSharedResource = true;
  tex.userData.isArchitecturalTex = true;
  cachedRoadStencilTex = tex;
  return tex;
}

function getRoadSidewalkPaverTexture(): THREE.CanvasTexture | null {
  if (cachedRoadSidewalkTex) return cachedRoadSidewalkTex;
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(0, 0, 256, 256);

  const rows = 8;
  const cols = 8;
  const rw = 256 / cols;
  const rh = 256 / rows;

  ctx.strokeStyle = 'rgba(100, 116, 139, 0.38)';
  ctx.lineWidth = 2;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const shade = 224 + ((r * 7 + c * 13) % 14);
      const hex = shade.toString(16);
      ctx.fillStyle = `#${hex}${hex}${hex}`;
      ctx.fillRect(c * rw + 1, r * rh + 1, rw - 2, rh - 2);
      ctx.strokeRect(c * rw, r * rh, rw, rh);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.userData.isSharedResource = true;
  tex.userData.isArchitecturalTex = true;
  cachedRoadSidewalkTex = tex;
  return tex;
}

function getManholeTexture(): THREE.CanvasTexture | null {
  if (cachedManholeTex) return cachedManholeTex;
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.clearRect(0, 0, 128, 128);

  // Outer Cast-Iron Ring
  ctx.beginPath();
  ctx.arc(64, 64, 60, 0, Math.PI * 2);
  ctx.fillStyle = '#1e293b';
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#475569';
  ctx.stroke();

  // Inner Pattern Ring
  ctx.beginPath();
  ctx.arc(64, 64, 46, 0, Math.PI * 2);
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Radial Gripper Ribs
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6;
    ctx.beginPath();
    ctx.moveTo(64 + Math.cos(a) * 24, 64 + Math.sin(a) * 24);
    ctx.lineTo(64 + Math.cos(a) * 56, 64 + Math.sin(a) * 56);
    ctx.stroke();
  }

  // Center Town Sakura Crest
  ctx.beginPath();
  ctx.arc(64, 64, 18, 0, Math.PI * 2);
  ctx.fillStyle = '#334155';
  ctx.fill();
  ctx.strokeStyle = '#94a3b8';
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.userData.isSharedResource = true;
  cachedManholeTex = tex;
  return tex;
}

function getStreetBannerTexture(): THREE.CanvasTexture | null {
  if (cachedStreetBannerTex) return cachedStreetBannerTex;
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#0284c7');
  grad.addColorStop(0.65, '#10b981');
  grad.addColorStop(1, '#059669');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 256);

  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 6;
  ctx.strokeRect(6, 6, 116, 244);

  ctx.fillStyle = '#fef08a';
  ctx.beginPath();
  ctx.arc(64, 52, 24, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#0f172a';
  ctx.font = '900 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('緑', 64, 52);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 20px sans-serif';
  ctx.fillText('MIDORI', 64, 112);
  ctx.fillText('TOWN', 64, 138);

  ctx.fillStyle = '#fef08a';
  ctx.font = 'bold 18px "BIZ UDPGothic", sans-serif';
  ctx.fillText('みどり町', 64, 188);
  ctx.fillText('すずらん通り', 64, 216);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.userData.isSharedResource = true;
  cachedStreetBannerTex = tex;
  return tex;
}

export interface IntersectionInfo {
  jaName: string;
  enName: string;
}

export function createIntersectionNameplateTexture(
  jaText: string = 'みどり町中央',
  enText: string = 'Midori-machi Central'
): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 256, 64);
  ctx.strokeStyle = '#1d4ed8';
  ctx.lineWidth = 5;
  ctx.strokeRect(3, 3, 250, 58);

  // Japanese Kanji / Katakana title in MEXT textbook font
  ctx.fillStyle = '#1e3a8a';
  ctx.textAlign = 'center';
  ctx.font = '900 20px "BIZ UDPGothic", "UD Digi Kyokasho NP-R", sans-serif';
  ctx.fillText(jaText, 128, 27);

  // English translation / Romaji line with adaptive auto-fitting
  ctx.fillStyle = '#2563eb';
  let enFontSize = 13;
  ctx.font = `bold ${enFontSize}px sans-serif`;
  while (ctx.measureText(enText).width > 232 && enFontSize > 9) {
    enFontSize -= 1;
    ctx.font = `bold ${enFontSize}px sans-serif`;
  }
  ctx.fillText(enText, 128, 49);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.userData.isSharedResource = true;
  return tex;
}

const plateMatCache = new Map<string, THREE.MeshStandardMaterial>();

export function getIntersectionPlateMaterial(
  jaText: string = 'みどり町中央',
  enText: string = 'Midori-machi Central'
): THREE.MeshStandardMaterial {
  const key = `${jaText}_${enText}`;
  if (plateMatCache.has(key)) {
    return plateMatCache.get(key)!;
  }
  const texture = createIntersectionNameplateTexture(jaText, enText);
  const mat = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.35,
  });
  mat.userData.isSharedResource = true;
  plateMatCache.set(key, mat);
  return mat;
}

function getPushButtonBoxTexture(): THREE.CanvasTexture | null {
  if (cachedPushButtonTex) return cachedPushButtonTex;
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#facc15';
  ctx.fillRect(0, 0, 128, 256);
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 6;
  ctx.strokeRect(4, 4, 120, 248);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(12, 14, 104, 52);
  ctx.fillStyle = '#0f172a';
  ctx.textAlign = 'center';
  ctx.font = '900 22px "BIZ UDPGothic", sans-serif';
  ctx.fillText('押ボタン', 64, 38);
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('PUSH BUTTON', 64, 56);

  // Red "Wait" LED window
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(16, 82, 96, 36);
  ctx.fillStyle = '#ef4444';
  ctx.font = 'bold 14px "BIZ UDPGothic", sans-serif';
  ctx.fillText('おまちください', 64, 105);

  // Round tactile push button in center
  ctx.beginPath();
  ctx.arc(64, 178, 28, 0, Math.PI * 2);
  ctx.fillStyle = '#1e293b';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(64, 178, 18, 0, Math.PI * 2);
  ctx.fillStyle = '#e2e8f0';
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.userData.isSharedResource = true;
  cachedPushButtonTex = tex;
  return tex;
}

// Lazily initialized shared road materials (zero import-time canvas/GPU work)
let roadResourcesReady = false;
let asphaltMat!: THREE.MeshStandardMaterial;
let curbMat!: THREE.MeshStandardMaterial;
let sidewalkMat!: THREE.MeshStandardMaterial;
let boulevardSidewalkMat!: THREE.MeshStandardMaterial;
let whiteStripeMat!: THREE.MeshStandardMaterial;
let tactileYellowMat!: THREE.MeshStandardMaterial;
let roadStencilMat!: THREE.MeshStandardMaterial;
let grateDarkMat!: THREE.MeshStandardMaterial;
let manholeMat!: THREE.MeshStandardMaterial;
let medianTurfMat!: THREE.MeshStandardMaterial;
let medianHedgeMat!: THREE.MeshStandardMaterial;
let medianFlowerPinkMat!: THREE.MeshStandardMaterial;
let medianFlowerGoldMat!: THREE.MeshStandardMaterial;
let medianTreeTrunkMat!: THREE.MeshStandardMaterial;
let medianTreeLeafMat!: THREE.MeshStandardMaterial;
let medianGinkgoMat!: THREE.MeshStandardMaterial;
let medianSakuraMat!: THREE.MeshStandardMaterial;
let hazardYellowMat!: THREE.MeshStandardMaterial;
let backplateWhiteMat!: THREE.MeshStandardMaterial;
let bronzePoleMat!: THREE.MeshStandardMaterial;

// Streetlight & Traffic Signal materials
let poleMat!: THREE.MeshStandardMaterial;
let castIronMat!: THREE.MeshStandardMaterial;
let controllerBoxMat!: THREE.MeshStandardMaterial;
let housingMat!: THREE.MeshStandardMaterial;
let speakerWhiteMat!: THREE.MeshStandardMaterial;
let yellowBoxMat!: THREE.MeshStandardMaterial;
let pushButtonFaceMat!: THREE.MeshStandardMaterial;
let intersectionPlateMat!: THREE.MeshStandardMaterial;
let streetBannerMat!: THREE.MeshStandardMaterial;
let lampGlowMat!: THREE.MeshStandardMaterial;
let lightPoolMat!: THREE.MeshBasicMaterial;

// Luminous traffic light lenses (driven by updateTrafficSignals())
let nsVehGreenMat!: THREE.MeshStandardMaterial;
let nsVehYellowMat!: THREE.MeshStandardMaterial;
let nsVehRedMat!: THREE.MeshStandardMaterial;
let ewVehGreenMat!: THREE.MeshStandardMaterial;
let ewVehYellowMat!: THREE.MeshStandardMaterial;
let ewVehRedMat!: THREE.MeshStandardMaterial;

function drawRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  if (typeof (ctx as any).roundRect === 'function') {
    ctx.beginPath();
    (ctx as any).roundRect(x, y, w, h, r);
  } else {
    ctx.beginPath();
    ctx.rect(x, y, w, h);
  }
}

/**
 * Draws the iconic Japanese pedestrian silhouette (standing or walking)
 */
function drawSilhouette(
  ctx: CanvasRenderingContext2D,
  type: 'STAND' | 'WALK',
  color: string,
  baseX: number,
  baseY: number
) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (type === 'STAND') {
    ctx.beginPath();
    ctx.arc(baseX, baseY - 28, 8.5, 0, Math.PI * 2);
    ctx.fill();

    drawRoundRect(ctx, baseX - 11, baseY - 17, 22, 28, 4);
    ctx.fill();

    ctx.lineWidth = 6.5;
    ctx.beginPath();
    ctx.moveTo(baseX - 11, baseY - 14);
    ctx.lineTo(baseX - 16, baseY + 12);
    ctx.moveTo(baseX + 11, baseY - 14);
    ctx.lineTo(baseX + 16, baseY + 12);
    ctx.stroke();

    ctx.lineWidth = 7.5;
    ctx.beginPath();
    ctx.moveTo(baseX - 6, baseY + 10);
    ctx.lineTo(baseX - 6, baseY + 36);
    ctx.moveTo(baseX + 6, baseY + 10);
    ctx.lineTo(baseX + 6, baseY + 36);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(baseX + 4, baseY - 28, 8.5, 0, Math.PI * 2);
    ctx.fill();

    drawRoundRect(ctx, baseX - 7, baseY - 17, 18, 26, 4);
    ctx.fill();

    ctx.lineWidth = 6.5;
    ctx.beginPath();
    ctx.moveTo(baseX - 2, baseY - 14);
    ctx.lineTo(baseX - 18, baseY + 2);
    ctx.moveTo(baseX + 7, baseY - 14);
    ctx.lineTo(baseX + 20, baseY + 2);
    ctx.stroke();

    ctx.lineWidth = 7.5;
    ctx.beginPath();
    ctx.moveTo(baseX - 2, baseY + 8);
    ctx.lineTo(baseX - 18, baseY + 36);
    ctx.moveTo(baseX + 4, baseY + 8);
    ctx.lineTo(baseX + 18, baseY + 34);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Draws the vertical countdown LED bars flanking the pedestrian silhouette
 */
function drawCountdownBars(
  ctx: CanvasRenderingContext2D,
  baseY: number,
  activeCount: number,
  activeColor: string
) {
  const totalBars = 7;
  const barW = 11;
  const barH = 5;
  const gap = 4.5;
  const startBottomY = baseY + 30;

  ctx.save();
  for (let i = 0; i < totalBars; i++) {
    const y = startBottomY - i * (barH + gap);
    const isActive = i < activeCount;
    ctx.fillStyle = isActive ? activeColor : 'rgba(30, 41, 59, 0.45)';

    drawRoundRect(ctx, 13, y, barW, barH, 1.5);
    ctx.fill();

    drawRoundRect(ctx, 128 - 13 - barW, y, barW, barH, 1.5);
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Japanese Elapsed Time Countdown Display Engine (*Keika Jikan Hyōji-tsuki Hokōsha-yō Shingō*)
 * Matches modern Japanese flat-type surface-emitting LED pedestrian signals (薄型フラット面発光).
 */
class PedestrianCountdownDisplay {
  public texture: THREE.CanvasTexture | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private lastKey: number = -1;

  constructor() {
    if (typeof document !== 'undefined') {
      this.canvas = document.createElement('canvas');
      this.canvas.width = 128;
      this.canvas.height = 256;
      this.ctx = this.canvas.getContext('2d');
      if (this.canvas) {
        this.texture = new THREE.CanvasTexture(this.canvas);
        this.texture.colorSpace = THREE.SRGBColorSpace;
        this.texture.anisotropy = 4;
        this.texture.userData.isSharedResource = true;
      }
    }
    this.renderState(false, false, false, 0, 7);
  }

  public renderState(
    isWalk: boolean,
    isFlashing: boolean,
    flashOn: boolean,
    greenBars: number,
    redBars: number
  ) {
    const phaseCode = isWalk ? 2 : isFlashing ? 1 : 0;
    const bars = isWalk ? greenBars : !isFlashing ? redBars : 0;
    const key = (phaseCode << 5) | ((bars & 0x0f) << 1) | (flashOn ? 1 : 0);
    if (key === this.lastKey) return;
    this.lastKey = key;

    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;

    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, 128, 256);

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 3;
    ctx.fillStyle = '#030712';
    drawRoundRect(ctx, 6, 6, 116, 116, 14);
    ctx.fill();
    ctx.stroke();

    drawRoundRect(ctx, 6, 134, 116, 116, 14);
    ctx.fill();
    ctx.stroke();

    const UNLIT_COLOR = '#1e293b';
    const RED_COLOR = '#ef4444';
    const GREEN_COLOR = '#00ee99'; // Authentic Japanese cyan-green (ao-shingō)

    if (isWalk || isFlashing) {
      drawSilhouette(ctx, 'STAND', UNLIT_COLOR, 64, 64);
      drawCountdownBars(ctx, 64, 0, RED_COLOR);
    } else {
      drawSilhouette(ctx, 'STAND', RED_COLOR, 64, 64);
      drawCountdownBars(ctx, 64, redBars, RED_COLOR);
    }

    if (isWalk) {
      drawSilhouette(ctx, 'WALK', GREEN_COLOR, 64, 192);
      drawCountdownBars(ctx, 192, greenBars, GREEN_COLOR);
    } else if (isFlashing) {
      drawSilhouette(ctx, 'WALK', flashOn ? GREEN_COLOR : UNLIT_COLOR, 64, 192);
      drawCountdownBars(ctx, 192, 0, GREEN_COLOR);
    } else {
      drawSilhouette(ctx, 'WALK', UNLIT_COLOR, 64, 192);
      drawCountdownBars(ctx, 192, 0, GREEN_COLOR);
    }

    if (this.texture) {
      this.texture.needsUpdate = true;
    }
  }
}

let nsPedestrianDisplay!: PedestrianCountdownDisplay;
let ewPedestrianDisplay!: PedestrianCountdownDisplay;
let nsPedestrianMat!: THREE.MeshStandardMaterial;
let ewPedestrianMat!: THREE.MeshStandardMaterial;

function ensureRoadResources(): void {
  if (roadResourcesReady) return;
  roadResourcesReady = true;

  asphaltMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    map: getAsphaltRoadTexture(),
    roughness: 0.86,
  });
  asphaltMat.userData.batchUnique = true;
  asphaltMat.userData.noVertexColorBake = true;

  curbMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.8 });
  sidewalkMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: getRoadSidewalkPaverTexture(),
    roughness: 0.78,
  });
  boulevardSidewalkMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: getBoulevardPaverTexture(),
    roughness: 0.76,
  });
  whiteStripeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
  tactileYellowMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: getTactilePavingTexture(),
    roughness: 0.55,
  });
  roadStencilMat = new THREE.MeshStandardMaterial({
    map: getRoadStencilAtlasTexture(),
    alphaTest: 0.5,
    transparent: false,
    roughness: 0.65,
  });
  grateDarkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7, roughness: 0.4 });
  manholeMat = new THREE.MeshStandardMaterial({
    map: getManholeTexture(),
    alphaTest: 0.5,
    transparent: false,
    roughness: 0.5,
    metalness: 0.6,
  });
  medianTurfMat = new THREE.MeshStandardMaterial({ color: 0x4d7c0f, roughness: 0.88 });
  medianHedgeMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.9 });
  medianFlowerPinkMat = new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.75 });
  medianFlowerGoldMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.75 });
  medianTreeTrunkMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.9 });
  medianTreeLeafMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.85 });
  medianGinkgoMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.8 });
  medianSakuraMat = new THREE.MeshStandardMaterial({ color: 0xf9a8d4, roughness: 0.78 });
  hazardYellowMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.45 });
  backplateWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.45 });
  bronzePoleMat = new THREE.MeshStandardMaterial({ color: 0x292524, roughness: 0.42, metalness: 0.62 });

  poleMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.45, metalness: 0.65 });
  castIronMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5, metalness: 0.5 });
  controllerBoxMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.5, metalness: 0.4 });
  housingMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.65 });
  speakerWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.5 });
  yellowBoxMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.5 });
  pushButtonFaceMat = new THREE.MeshStandardMaterial({
    map: getPushButtonBoxTexture(),
    roughness: 0.4,
  });
  intersectionPlateMat = getIntersectionPlateMaterial('みどり町中央', 'Midori-machi Central');
  streetBannerMat = new THREE.MeshStandardMaterial({
    map: getStreetBannerTexture(),
    roughness: 0.5,
    side: THREE.DoubleSide,
  });
  lampGlowMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xfde047,
    emissiveIntensity: 1.8,
    roughness: 0.15,
  });
  lightPoolMat = new THREE.MeshBasicMaterial({
    color: 0xfef08a,
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
  });

  nsVehGreenMat = new THREE.MeshStandardMaterial({
    color: 0x10b981,
    emissive: 0x10b981,
    emissiveIntensity: 1.8,
    roughness: 0.2,
  });
  nsVehYellowMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    emissive: 0xfacc15,
    emissiveIntensity: 0.4,
    roughness: 0.2,
  });
  nsVehRedMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xef4444,
    emissiveIntensity: 1.6,
    roughness: 0.2,
  });

  ewVehGreenMat = nsVehGreenMat.clone();
  ewVehYellowMat = nsVehYellowMat.clone();
  ewVehRedMat = nsVehRedMat.clone();

  nsPedestrianDisplay = new PedestrianCountdownDisplay();
  ewPedestrianDisplay = new PedestrianCountdownDisplay();

  nsPedestrianMat = new THREE.MeshStandardMaterial({
    map: nsPedestrianDisplay.texture,
    emissive: 0xffffff,
    emissiveMap: nsPedestrianDisplay.texture,
    emissiveIntensity: 1.6,
    roughness: 0.15,
  });
  ewPedestrianMat = new THREE.MeshStandardMaterial({
    map: ewPedestrianDisplay.texture,
    emissive: 0xffffff,
    emissiveMap: ewPedestrianDisplay.texture,
    emissiveIntensity: 1.6,
    roughness: 0.15,
  });

  // Protect all module-level shared road materials from disposal on town regeneration
  const allSharedRoadMats: THREE.Material[] = [
    asphaltMat, curbMat, sidewalkMat, boulevardSidewalkMat, whiteStripeMat, tactileYellowMat, roadStencilMat,
    grateDarkMat, manholeMat, medianTurfMat, medianHedgeMat, medianFlowerPinkMat, medianFlowerGoldMat,
    medianTreeTrunkMat, medianTreeLeafMat, medianGinkgoMat, medianSakuraMat,
    hazardYellowMat, backplateWhiteMat, bronzePoleMat,
    poleMat, castIronMat, controllerBoxMat, housingMat, speakerWhiteMat,
    yellowBoxMat, pushButtonFaceMat, intersectionPlateMat, streetBannerMat,
    lampGlowMat, lightPoolMat,
    nsVehGreenMat, nsVehYellowMat, nsVehRedMat,
    ewVehGreenMat, ewVehYellowMat, ewVehRedMat,
    nsPedestrianMat, ewPedestrianMat,
  ];
  allSharedRoadMats.forEach((m) => {
    m.userData.isSharedResource = true;
  });

  // Animated materials must never be value-merged with static building materials
  [
    lampGlowMat, lightPoolMat,
    nsVehGreenMat, nsVehYellowMat, nsVehRedMat,
    ewVehGreenMat, ewVehYellowMat, ewVehRedMat,
    nsPedestrianMat, ewPedestrianMat,
  ].forEach((m) => {
    m.userData.batchUnique = true;
  });
  lightPoolMat.userData.batchGlobal = true;
  manholeMat.userData.batchGlobal = true;
  roadStencilMat.userData.batchGlobal = true;

  updateTrafficSignals(0);
}

const SIGNAL_COLORS = {
  red: new THREE.Color(0xef4444),
  yellow: new THREE.Color(0xfacc15),
  green: new THREE.Color(0x10b981),
};

function setLens(mat: THREE.MeshStandardMaterial, base: THREE.Color, on: boolean, onIntensity: number) {
  mat.color.copy(base).multiplyScalar(on ? 1.0 : 0.22);
  mat.emissive.copy(base);
  mat.emissiveIntensity = on ? onIntensity : 0.0;
}

/**
 * Cycles every traffic signal in town with realistic two-phase Japanese intersection sequencing
 */
export function updateTrafficSignals(elapsedSeconds: number): void {
  ensureRoadResources();
  const cycleTime = 24;
  const t = elapsedSeconds % cycleTime;

  const nsGreen = t < 8.5;
  const nsYellow = t >= 8.5 && t < 10.5;
  const nsRed = t >= 10.5;

  setLens(nsVehGreenMat, SIGNAL_COLORS.green, nsGreen, 1.8);
  setLens(nsVehYellowMat, SIGNAL_COLORS.yellow, nsYellow, 1.4);
  setLens(nsVehRedMat, SIGNAL_COLORS.red, nsRed, 1.6);

  const nsPedWalk = t >= 0.5 && t < 7.0;
  const nsPedFlash = t >= 7.0 && t < 9.0;
  const nsFlashOn = Math.floor(t * 4) % 2 === 0;

  let nsGreenBars = 0;
  if (nsPedWalk) {
    const remRatio = Math.max(0, 1 - (t - 0.5) / 6.5);
    nsGreenBars = Math.ceil(remRatio * 7);
  }

  let nsRedBars = 0;
  if (!nsPedWalk && !nsPedFlash) {
    const waitRemain = t < 0.5 ? (0.5 - t) : (24.5 - t);
    const remRatio = Math.max(0, waitRemain / 15.5);
    nsRedBars = Math.ceil(remRatio * 7);
  }

  nsPedestrianDisplay.renderState(nsPedWalk, nsPedFlash, nsFlashOn, nsGreenBars, nsRedBars);

  const ewGreen = t >= 12 && t < 20.5;
  const ewYellow = t >= 20.5 && t < 22.5;
  const ewRed = t < 12 || t >= 22.5;

  setLens(ewVehGreenMat, SIGNAL_COLORS.green, ewGreen, 1.8);
  setLens(ewVehYellowMat, SIGNAL_COLORS.yellow, ewYellow, 1.4);
  setLens(ewVehRedMat, SIGNAL_COLORS.red, ewRed, 1.6);

  const ewPedWalk = t >= 12.5 && t < 19.0;
  const ewPedFlash = t >= 19.0 && t < 21.0;
  const ewFlashOn = Math.floor(t * 4) % 2 === 0;

  let ewGreenBars = 0;
  if (ewPedWalk) {
    const remRatio = Math.max(0, 1 - (t - 12.5) / 6.5);
    ewGreenBars = Math.ceil(remRatio * 7);
  }

  let ewRedBars = 0;
  if (!ewPedWalk && !ewPedFlash) {
    const waitRemain = t < 12.5 ? (12.5 - t) : (36.5 - t);
    const remRatio = Math.max(0, waitRemain / 15.5);
    ewRedBars = Math.ceil(remRatio * 7);
  }

  ewPedestrianDisplay.renderState(ewPedWalk, ewPedFlash, ewFlashOn, ewGreenBars, ewRedBars);
}

export interface TrafficSignalSnapshot {
  nsVehicle: 'GREEN' | 'YELLOW' | 'RED';
  ewVehicle: 'GREEN' | 'YELLOW' | 'RED';
  nsPedWalk: boolean;
  ewPedWalk: boolean;
}

/**
 * Pure readout of the current traffic signal phase matching updateTrafficSignals().
 */
export function getTrafficSignalSnapshot(elapsedSeconds: number): TrafficSignalSnapshot {
  const cycleTime = 24;
  const t = ((elapsedSeconds % cycleTime) + cycleTime) % cycleTime;

  const nsVehicle: 'GREEN' | 'YELLOW' | 'RED' =
    t < 8.5 ? 'GREEN' : t < 10.5 ? 'YELLOW' : 'RED';
  const ewVehicle: 'GREEN' | 'YELLOW' | 'RED' =
    t >= 12 && t < 20.5 ? 'GREEN' : t >= 20.5 && t < 22.5 ? 'YELLOW' : 'RED';

  const nsPedWalk = t >= 0.5 && t < 7.0;
  const ewPedWalk = t >= 12.5 && t < 19.0;

  return { nsVehicle, ewVehicle, nsPedWalk, ewPedWalk };
}

/**
 * Streetlights switch on at dusk and off by day
 */
export function setStreetlightLevel(level: number): void {
  ensureRoadResources();
  const l = THREE.MathUtils.clamp(level, 0, 1);
  lampGlowMat.emissiveIntensity = 0.15 + 1.65 * l;
  lightPoolMat.opacity = 0.18 * l;
  lightPoolMat.visible = l > 0.01;
}

function createRoadStencilDecal(
  slot: 'ARROW' | 'TOMARE' | 'BIKE' | 'SPEED30',
  w: number,
  h: number
): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(w, h);
  const uv = geo.attributes.uv;
  let u0 = 0;
  let u1 = 0.5;
  let v0 = 0.5;
  let v1 = 1.0;
  if (slot === 'TOMARE') {
    u0 = 0.5; u1 = 1.0; v0 = 0.5; v1 = 1.0;
  } else if (slot === 'BIKE') {
    u0 = 0.0; u1 = 0.5; v0 = 0.0; v1 = 0.5;
  } else if (slot === 'SPEED30') {
    u0 = 0.5; u1 = 1.0; v0 = 0.0; v1 = 0.5;
  }
  for (let i = 0; i < uv.count; i++) {
    const u = uv.getX(i);
    const v = uv.getY(i);
    uv.setXY(i, u0 + u * (u1 - u0), v0 + v * (v1 - v0));
  }
  uv.needsUpdate = true;
  const mesh = new THREE.Mesh(geo, roadStencilMat);
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

/**
 * Builds an authentic Japanese Streetlight (*Gaitō*)
 * - 'BOULEVARD': Ornate dark-bronze twin-arm Avenue Lamppost with globe lanterns, dual banners, and optional flower baskets.
 * - 'SIDE_STREET': Clean galvanized silver municipal LED cobra-head streetlight.
 */
function buildStreetlight(
  facingDirection: 'EAST' | 'WEST' | 'NORTH' | 'SOUTH' = 'EAST',
  variant: 'SIDE_STREET' | 'BOULEVARD' = 'SIDE_STREET',
  lowPower = false
): THREE.Group {
  const lightGroup = new THREE.Group();
  lightGroup.name = 'Streetlight';

  if (variant === 'BOULEVARD') {
    // Stepped Fluted Dark-Bronze Base Plinth & Collar
    const basePlinth = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.23, 0.38, 10), bronzePoleMat);
    basePlinth.position.y = 0.19;
    const baseCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.15, 0.26, 10), bronzePoleMat);
    baseCollar.position.y = 0.48;
    lightGroup.add(basePlinth, baseCollar);

    // Tapered Bronze Pole (4.5m)
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.09, 4.4, 10), bronzePoleMat);
    pole.position.y = 2.4;
    lightGroup.add(pole);

    // Mid-Pole Ring + Dual Seasonal Town Avenue Banner Flags (*Gaitō Furaggu*)
    const midRing = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.09, 10), castIronMat);
    midRing.position.y = 3.25;
    lightGroup.add(midRing);

    [-1, 1].forEach((side) => {
      const bTop = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.36, 6), bronzePoleMat);
      bTop.rotation.z = Math.PI / 2;
      bTop.position.set(side * 0.21, 3.15, 0);
      const bBot = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.36, 6), bronzePoleMat);
      bBot.rotation.z = Math.PI / 2;
      bBot.position.set(side * 0.21, 2.45, 0);
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.30, 0.66), streetBannerMat);
      flag.position.set(side * 0.23, 2.80, 0);
      lightGroup.add(bTop, bBot, flag);
    });

    // Symmetrical Twin Swan-Neck Arms (projecting over road and sidewalk)
    [-1, 1].forEach((side) => {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.05, 0.05), bronzePoleMat);
      arm.position.set(side * 0.34, 4.52, 0);
      arm.rotation.z = side * -0.14;
      const brace = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.03, 0.03), castIronMat);
      brace.position.set(side * 0.19, 4.26, 0);
      brace.rotation.z = side * 0.58;

      // Frosted Globe Lantern with Dark Cap Hood
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.20, 0.12, 10), bronzePoleMat);
      cap.position.set(side * 0.68, 4.55, 0);
      const globe = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), lampGlowMat);
      globe.position.set(side * 0.68, 4.38, 0);
      lightGroup.add(arm, brace, cap, globe);
    });

    // Optional Hanging Flower Basket on Road Side
    if (!lowPower) {
      const basketPot = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.09, 0.14, 8), bronzePoleMat);
      basketPot.position.set(0.32, 3.65, 0);
      const basketFlowers = new THREE.Mesh(new THREE.DodecahedronGeometry(0.16, 0), medianFlowerPinkMat);
      basketFlowers.scale.set(1.1, 0.65, 1.1);
      basketFlowers.position.set(0.32, 3.74, 0);
      lightGroup.add(basketPot, basketFlowers);
    }

    // Top Finial Cap
    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), castIronMat);
    finial.position.y = 4.65;
    lightGroup.add(finial);
  } else {
    // SIDE_STREET: Galvanized Municipal LED Cobra-Head Streetlight
    const flange = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.17, 0.16, 10), castIronMat);
    flange.position.y = 0.08;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.082, 4.1, 10), poleMat);
    pole.position.y = 2.13;
    const hatch = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 0.03), housingMat);
    hatch.position.set(0, 0.72, 0.07);
    lightGroup.add(flange, pole, hatch);

    // Angled Cantilever Arm + Gusset Strut
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.05, 0.05), poleMat);
    arm.position.set(0.38, 4.22, 0);
    arm.rotation.z = 0.10;
    const strut = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.03, 0.03), poleMat);
    strut.position.set(0.20, 3.98, 0);
    strut.rotation.z = 0.56;
    lightGroup.add(arm, strut);

    // Sleek Cobra-Head LED Fixture & Diffused Lens
    const fixture = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.10, 0.24), housingMat);
    fixture.position.set(0.76, 4.28, 0);
    const lens = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.045, 0.18), lampGlowMat);
    lens.position.set(0.76, 4.21, 0);
    lightGroup.add(fixture, lens);
  }

  // Warm Ground Light Pool on Pavement (Zero GPU light-loop cost!)
  const poolGeo = new THREE.CircleGeometry(variant === 'BOULEVARD' ? 2.4 : 2.0, 14);
  const pool = new THREE.Mesh(poolGeo, lightPoolMat);
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(0.85, -0.08, 0);
  lightGroup.add(pool);

  if (facingDirection === 'WEST') {
    lightGroup.rotation.y = Math.PI;
  } else if (facingDirection === 'NORTH') {
    lightGroup.rotation.y = Math.PI / 2;
  } else if (facingDirection === 'SOUTH') {
    lightGroup.rotation.y = -Math.PI / 2;
  }

  return lightGroup;
}

/**
 * Helper to construct a Japanese 3-aspect vehicular horizontal signal head (*Sharyō-yō Shingōki*)
 * Fixes the rear lens leak so lenses only shine out the front (+Z) and adds top sun-visor hoods (*Hisashi*).
 */
function createVehicularHead(
  greenMat: THREE.Material,
  yellowMat: THREE.Material,
  redMat: THREE.Material,
  plateMat: THREE.Material = intersectionPlateMat,
  includeRightArrow = false
): THREE.Group {
  const head = new THREE.Group();

  // Reflective White-Bordered Backplate for crisp sky/daytime contrast
  const backplate = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.42, 0.03), backplateWhiteMat);
  backplate.position.set(0, 0, -0.07);
  head.add(backplate);

  const housingGeo = new THREE.BoxGeometry(0.92, 0.34, 0.16);
  const housing = new THREE.Mesh(housingGeo, housingMat);
  head.add(housing);

  const lensRadius = 0.098;
  // Cylinder thickness 0.08m shifted forward to z = +0.055 so it never pokes out the back (-Z) of the housing!
  const lensGeo = new THREE.CylinderGeometry(lensRadius, lensRadius, 0.08, 12);
  lensGeo.rotateX(Math.PI / 2);

  // Curved top sun visor hood (*Hisashi*) over each lens
  const hoodGeo = new THREE.CylinderGeometry(
    lensRadius + 0.015,
    lensRadius + 0.015,
    0.14,
    10,
    1,
    true,
    -Math.PI / 2,
    Math.PI
  );
  hoodGeo.rotateX(Math.PI / 2);

  const offsets = [
    { x: -0.28, mat: greenMat },
    { x: 0.0, mat: yellowMat },
    { x: 0.28, mat: redMat },
  ];

  offsets.forEach(({ x, mat }) => {
    const lens = new THREE.Mesh(lensGeo, mat);
    lens.position.set(x, 0, 0.055);
    const hood = new THREE.Mesh(hoodGeo, housingMat);
    hood.position.set(x, 0.01, 0.13);
    head.add(lens, hood);
  });

  // 4th Auxiliary Right-Turn / Straight Arrow Signal Housing (Central Boulevard Crossroads)
  if (includeRightArrow) {
    const auxBox = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.26, 0.15), housingMat);
    auxBox.position.set(0.28, -0.32, 0);
    const auxLens = new THREE.Mesh(lensGeo, greenMat);
    auxLens.scale.set(0.85, 0.85, 1);
    auxLens.position.set(0.28, -0.32, 0.055);
    const auxHood = new THREE.Mesh(hoodGeo, housingMat);
    auxHood.scale.set(0.85, 0.85, 1);
    auxHood.position.set(0.28, -0.31, 0.125);
    head.add(auxBox, auxLens, auxHood);
  }

  // Bilingual Intersection Nameplate (*Kōsaten Meishō-ban*) with brushed aluminum rear housing
  const nameplate = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.20, 0.04), [
    housingMat, housingMat, housingMat, housingMat, plateMat, controllerBoxMat,
  ]);
  nameplate.position.set(0, 0.29, 0.02);
  const bracketL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.10, 0.04), poleMat);
  bracketL.position.set(-0.24, 0.19, 0);
  const bracketR = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.10, 0.04), poleMat);
  bracketR.position.set(0.24, 0.19, 0);
  head.add(nameplate, bracketL, bracketR);

  return head;
}

/**
 * Helper to construct an authentic Japanese pedestrian signal box (*Hokōsha-yō Shingōki*)
 * Features dual hooded sun visors, countdown display, acoustic bird-chirp speaker, and push-button unit.
 */
function createPedestrianBox(displayMat: THREE.Material): THREE.Group {
  const pedGroup = new THREE.Group();

  const pedHousingGeo = new THREE.BoxGeometry(0.28, 0.58, 0.14);
  const pedHousing = new THREE.Mesh(pedHousingGeo, housingMat);
  pedGroup.add(pedHousing);

  const visorGeo = new THREE.BoxGeometry(0.26, 0.04, 0.09);
  const topVisor = new THREE.Mesh(visorGeo, housingMat);
  topVisor.position.set(0, 0.26, 0.085);
  topVisor.rotation.x = 0.25;

  const botVisor = new THREE.Mesh(visorGeo, housingMat);
  botVisor.position.set(0, -0.02, 0.085);
  botVisor.rotation.x = 0.25;

  pedGroup.add(topVisor, botVisor);

  // Luminous Display Face with Japanese Pictograms + Countdown Bars
  const faceGeo = new THREE.PlaneGeometry(0.22, 0.48);
  const faceMesh = new THREE.Mesh(faceGeo, displayMat);
  faceMesh.position.set(0, 0.01, 0.072);
  pedGroup.add(faceMesh);

  // Acoustic Bird-Chirp Speaker Unit (*Onkyō-shiki*) mounted below signal head
  const speakerBox = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.10, 0.11), speakerWhiteMat);
  speakerBox.position.set(0, -0.35, 0.01);
  pedGroup.add(speakerBox);

  // Yellow Push-Button Box (*Oshibotan-bako*) with textured "押ボタン" faceplate
  const buttonBoxGeo = new THREE.BoxGeometry(0.14, 0.26, 0.10);
  const buttonBox = new THREE.Mesh(buttonBoxGeo, [
    yellowBoxMat, yellowBoxMat, yellowBoxMat, yellowBoxMat, pushButtonFaceMat, yellowBoxMat,
  ]);
  buttonBox.position.set(0, -0.58, 0.02);
  pedGroup.add(buttonBox);

  return pedGroup;
}

/**
 * Builds an authentic Japanese Traffic Signal Post (*Kōtsū Shingōki*) tailored for each corner.
 * Pole and signals lowered to eye level for immersive first-person walking experience.
 */
function buildCornerTrafficSignal(
  corner: 'NW' | 'NE' | 'SE' | 'SW',
  plateMat: THREE.Material = intersectionPlateMat,
  isBoulevardCenter = false
): THREE.Group {
  const group = new THREE.Group();
  group.name = `TrafficSignal_${corner}`;

  const baseGeo = new THREE.CylinderGeometry(0.16, 0.21, 0.22, 10);
  const base = new THREE.Mesh(baseGeo, castIronMat);
  base.position.y = 0.11;
  group.add(base);

  // Shorter pole (3.7m tall instead of 4.5m)
  const poleGeo = new THREE.CylinderGeometry(0.075, 0.095, 3.7, 10);
  const pole = new THREE.Mesh(poleGeo, poleMat);
  pole.position.y = 1.85;
  pole.castShadow = false;
  group.add(pole);

  // Yellow-Black Reflective Hazard Bands on lower pole (y = 0.90m - 1.38m)
  [0.92, 1.12, 1.32].forEach((hy, idx) => {
    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(0.098, 0.098, 0.10, 10),
      idx % 2 === 0 ? hazardYellowMat : housingMat
    );
    band.position.y = hy;
    group.add(band);
  });

  // Grey Traffic Signal Controller Box (*Seigyoki*) with concrete plinth & louver ribs
  const ctrlPlinth = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 0.20), curbMat);
  ctrlPlinth.position.set(0, 0.22, -0.12);
  const ctrlBox = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.48, 0.16), controllerBoxMat);
  ctrlBox.position.set(0, 0.50, -0.12);
  const ctrlLouver = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.10, 0.02), housingMat);
  ctrlLouver.position.set(0, 0.36, -0.205);
  group.add(ctrlPlinth, ctrlBox, ctrlLouver);

  const addArmAndHead = (
    dx: number,
    dz: number,
    facingAngleY: number,
    gMat: THREE.Material,
    yMat: THREE.Material,
    rMat: THREE.Material
  ) => {
    const armLen = isBoulevardCenter ? 1.32 : 1.18;
    const isX = Math.abs(dx) > 0.5;
    const armGeo = isX ? new THREE.BoxGeometry(armLen, 0.055, 0.055) : new THREE.BoxGeometry(0.055, 0.055, armLen);
    const arm = new THREE.Mesh(armGeo, poleMat);
    // Vehicular signal mast lowered from y = 4.20m to y = 3.35m (world y = 3.50m)
    arm.position.set(dx * (armLen / 2), 3.35, dz * (armLen / 2));

    // Mast-Arm Clamp Collar + Upper support tie-bar bracket
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.10, 10), castIronMat);
    collar.position.set(0, 3.35, 0);
    const braceGeo = isX ? new THREE.BoxGeometry(armLen * 0.65, 0.035, 0.035) : new THREE.BoxGeometry(0.035, 0.035, armLen * 0.65);
    const brace = new THREE.Mesh(braceGeo, poleMat);
    brace.position.set(dx * (armLen * 0.32), 3.50, dz * (armLen * 0.32));
    group.add(arm, collar, brace);

    const head = createVehicularHead(gMat, yMat, rMat, plateMat, isBoulevardCenter);
    head.position.set(dx * armLen, 3.35, dz * armLen);
    head.rotation.y = facingAngleY;
    group.add(head);
  };

  const addPedBox = (
    offX: number,
    offZ: number,
    facingAngleY: number,
    displayMat: THREE.Material
  ) => {
    const box = createPedestrianBox(displayMat);
    // Lowered from y = 2.35m to y = 1.20m (world y = 1.35m, matching avatar eye level in first-person mode)
    box.position.set(offX, 1.20, offZ);
    box.rotation.y = facingAngleY;

    // Horizontal mounting bracket connecting pole (0, 1.20, 0) to ped box (offX, 1.20, offZ)
    const bracketLen = Math.hypot(offX, offZ);
    if (bracketLen > 0.05) {
      const bracketGeo = new THREE.CylinderGeometry(0.018, 0.018, bracketLen, 8);
      const bracket = new THREE.Mesh(bracketGeo, poleMat);
      bracket.position.set(offX * 0.5, 1.20, offZ * 0.5);
      bracket.rotation.z = Math.PI / 2;
      bracket.rotation.y = Math.atan2(offX, offZ);
      group.add(bracket);
    }

    group.add(box);
  };

  if (corner === 'NW') {
    addArmAndHead(1, 0, Math.PI, nsVehGreenMat, nsVehYellowMat, nsVehRedMat);
    addArmAndHead(0, 1, -Math.PI / 2, ewVehGreenMat, ewVehYellowMat, ewVehRedMat);
    addPedBox(0.16, 0, Math.PI / 2, ewPedestrianMat);
    addPedBox(0, 0.16, 0, nsPedestrianMat);
  } else if (corner === 'NE') {
    addArmAndHead(-1, 0, Math.PI, nsVehGreenMat, nsVehYellowMat, nsVehRedMat);
    addArmAndHead(0, 1, Math.PI / 2, ewVehGreenMat, ewVehYellowMat, ewVehRedMat);
    addPedBox(-0.16, 0, -Math.PI / 2, ewPedestrianMat);
    addPedBox(0, 0.16, 0, nsPedestrianMat);
  } else if (corner === 'SE') {
    addArmAndHead(-1, 0, 0, nsVehGreenMat, nsVehYellowMat, nsVehRedMat);
    addArmAndHead(0, -1, Math.PI / 2, ewVehGreenMat, ewVehYellowMat, ewVehRedMat);
    addPedBox(-0.16, 0, -Math.PI / 2, ewPedestrianMat);
    addPedBox(0, -0.16, Math.PI, nsPedestrianMat);
  } else if (corner === 'SW') {
    addArmAndHead(1, 0, 0, nsVehGreenMat, nsVehYellowMat, nsVehRedMat);
    addArmAndHead(0, -1, -Math.PI / 2, ewVehGreenMat, ewVehYellowMat, ewVehRedMat);
    addPedBox(0.16, 0, Math.PI / 2, ewPedestrianMat);
    addPedBox(0, -0.16, Math.PI, nsPedestrianMat);
  }

  return group;
}

/**
 * Helper to build the iconic Japanese White Road Diamond (`◇` — Dia-māku) warning of an upcoming crosswalk
 */
function buildRoadDiamondMarking(): THREE.Group {
  const diamond = new THREE.Group();
  const barLen = 0.85;
  const barW = 0.11;
  const barGeo = new THREE.BoxGeometry(barW, 0.01, barLen);

  const offsets = [
    { x: -0.26, z: -0.26, rotY: -0.52 },
    { x: 0.26, z: -0.26, rotY: 0.52 },
    { x: -0.26, z: 0.26, rotY: 0.52 },
    { x: 0.26, z: 0.26, rotY: -0.52 },
  ];

  offsets.forEach(({ x, z, rotY }) => {
    const seg = new THREE.Mesh(barGeo, whiteStripeMat);
    seg.position.set(x, 0, z);
    seg.rotation.y = rotY;
    diamond.add(seg);
  });

  return diamond;
}

export interface RoadTileOptions {
  intersectionInfo?: IntersectionInfo;
  /** Quadrant/side inside a 12m Grand Boulevard junction */
  boulevardPart?: 'NW' | 'NE' | 'SW' | 'SE' | 'W' | 'E' | 'N' | 'S';
  /** Add boulevard median shade tree on alternating straight boulevard tiles */
  includeMedianTree?: boolean;
  /** True when an intersection lies immediately at the negative axis edge (-Z for Z roads, -X for X roads) */
  nearIntersectionNeg?: boolean;
  /** True when an intersection lies immediately at the positive axis edge (+Z for Z roads, +X for X roads) */
  nearIntersectionPos?: boolean;
  /** Add bike navi-mark on boulevard curb edge (alternating tiles) */
  includeBikeMark?: boolean;
  /** Add manhole cover on straight road tile */
  includeManhole?: boolean;
  /** Low-power hardware mode to skip optional micro-decorations */
  lowPower?: boolean;
}

function buildBoulevardMedianTree(
  species: 'GINKGO' | 'SAKURA' | 'ZELKOVA' = 'ZELKOVA',
  lowPower = false
): THREE.Group {
  const tree = new THREE.Group();
  // Cast-iron square tree grate at planter bed level
  const grate = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.02, 0.56), castIronMat);
  grate.position.y = 0.205;
  tree.add(grate);

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.13, 2.35, 7), medianTreeTrunkMat);
  trunk.position.y = 1.32;
  tree.add(trunk);

  // Two angled structural limbs
  const limbA = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.055, 0.9, 6), medianTreeTrunkMat);
  limbA.position.set(0.24, 2.45, 0.12);
  limbA.rotation.z = -0.58;
  limbA.rotation.x = 0.25;
  const limbB = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.055, 0.85, 6), medianTreeTrunkMat);
  limbB.position.set(-0.22, 2.55, -0.14);
  limbB.rotation.z = 0.55;
  limbB.rotation.x = -0.22;
  tree.add(limbA, limbB);

  const leafMat =
    species === 'GINKGO'
      ? medianGinkgoMat
      : species === 'SAKURA'
        ? medianSakuraMat
        : medianTreeLeafMat;

  const crownMain = new THREE.Mesh(new THREE.DodecahedronGeometry(0.84, 1), leafMat);
  crownMain.position.set(0, 2.95, 0);
  crownMain.scale.set(1.05, 1.12, 1.05);
  const crownTop = new THREE.Mesh(new THREE.DodecahedronGeometry(0.60, 1), leafMat);
  crownTop.position.set(0.18, 3.65, -0.10);
  const crownLeft = new THREE.Mesh(new THREE.DodecahedronGeometry(0.54, 0), leafMat);
  crownLeft.position.set(-0.42, 2.82, -0.22);
  tree.add(crownMain, crownTop, crownLeft);

  if (!lowPower) {
    const crownRight = new THREE.Mesh(new THREE.DodecahedronGeometry(0.52, 0), leafMat);
    crownRight.position.set(0.45, 2.75, 0.22);
    const crownFront = new THREE.Mesh(new THREE.DodecahedronGeometry(0.44, 0), leafMat);
    crownFront.position.set(-0.10, 3.25, 0.40);
    tree.add(crownRight, crownFront);
  }
  return tree;
}

/**
 * Builds a standard 6.0m x 6.0m (1U x 1U) road tile with curbs, textured sidewalks, lane markings,
 * Japanese road diamonds (◇), manhole covers, storm grates, streetlights, and 4-way traffic signals.
 */
export function buildRoadTile(
  type: RoadTileType,
  intersectionOrOptions?: IntersectionInfo | RoadTileOptions
): THREE.Group {
  ensureRoadResources();
  const opts: RoadTileOptions = intersectionOrOptions
    ? ('jaName' in intersectionOrOptions
        ? { intersectionInfo: intersectionOrOptions }
        : intersectionOrOptions)
    : {};
  const {
    intersectionInfo,
    boulevardPart,
    includeMedianTree,
    nearIntersectionNeg = false,
    nearIntersectionPos = false,
    includeBikeMark = true,
    includeManhole = true,
    lowPower = false,
  } = opts;
  const tile = new THREE.Group();
  tile.name = `RoadTile_${type}`;

  const tileSize = 6.0;

  // Helper: Curb-cut pedestrian ramp wedge bridging sidewalk (y=0.15) to asphalt (y=0.05)
  const addCurbRamp = (rx: number, rz: number, w: number, d: number, rotZ = 0, rotX = 0) => {
    const ramp = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, d), sidewalkMat);
    ramp.position.set(rx, 0.09, rz);
    ramp.rotation.set(rotX, 0, rotZ);
    tile.add(ramp);
  };

  // Base Textured Asphalt Slab (6m x 6m x 0.05m)
  const asphaltGeo = new THREE.BoxGeometry(tileSize, 0.05, tileSize);
  const asphalt = new THREE.Mesh(asphaltGeo, asphaltMat);
  asphalt.position.y = 0.025;
  asphalt.receiveShadow = true;
  tile.add(asphalt);

  if (type === 'STRAIGHT_Z') {
    // Road runs North-South (along Z). Sidewalks on West (X=-2.625) and East (X=+2.625)
    [-2.625, +2.625].forEach((sx) => {
      const swGeo = new THREE.BoxGeometry(0.75, 0.15, tileSize);
      const sw = new THREE.Mesh(swGeo, sidewalkMat);
      sw.position.set(sx, 0.1, 0);
      sw.receiveShadow = true;

      const curbX = sx < 0 ? sx + 0.375 : sx - 0.375;
      const curbGeo = new THREE.BoxGeometry(0.12, 0.18, tileSize);
      const curb = new THREE.Mesh(curbGeo, curbMat);
      curb.position.set(curbX, 0.115, 0);

      // Concrete Storm-Drain Gutter Apron (*Sokukō*) + Slotted Grate
      const gutter = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.015, tileSize), curbMat);
      gutter.position.set(sx < 0 ? curbX + 0.19 : curbX - 0.19, 0.048, 0);
      const grate = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.014, 0.55), grateDarkMat);
      grate.position.set(sx < 0 ? curbX + 0.19 : curbX - 0.19, 0.056, 1.5);

      tile.add(sw, curb, gutter, grate);
    });

    // Dashed White Center Line along Z
    for (let z = -2.0; z <= 2.0; z += 2.0) {
      const stripeGeo = new THREE.BoxGeometry(0.14, 0.01, 1.2);
      const stripe = new THREE.Mesh(stripeGeo, whiteStripeMat);
      stripe.position.set(0, 0.056, z);
      tile.add(stripe);
    }

    // Intersection-scoped markings (Left-hand traffic: West x=-1.15 goes North -Z, East x=+1.15 goes South +Z)
    if (nearIntersectionNeg) {
      // Approaching North intersection (-Z): diamond in West lane, "30" exiting in East lane
      const diamond = buildRoadDiamondMarking();
      diamond.position.set(-1.15, 0.056, 0.4);
      const speed30 = createRoadStencilDecal('SPEED30', 1.05, 1.05);
      speed30.rotation.z = Math.PI;
      speed30.position.set(1.15, 0.057, 0.4);
      tile.add(diamond, speed30);
    }
    if (nearIntersectionPos) {
      // Approaching South intersection (+Z): diamond in East lane, "30" exiting in West lane
      const diamond = buildRoadDiamondMarking();
      diamond.position.set(1.15, 0.056, -0.4);
      const speed30 = createRoadStencilDecal('SPEED30', 1.05, 1.05);
      speed30.position.set(-1.15, 0.057, -0.4);
      tile.add(diamond, speed30);
    }

    if (includeManhole) {
      const manhole = new THREE.Mesh(new THREE.CircleGeometry(0.34, 14), manholeMat);
      manhole.rotation.x = -Math.PI / 2;
      manhole.position.set(1.15, 0.056, -1.6);
      tile.add(manhole);
    }

    // Curbside Municipal LED Streetlight on West Sidewalk (X = -2.72m, Z = 0)
    const streetLight = buildStreetlight('EAST', 'SIDE_STREET', lowPower);
    streetLight.position.set(-2.72, 0.15, 0);
    tile.add(streetLight);

  } else if (type === 'STRAIGHT_X') {
    // Road runs East-West (along X). Sidewalks on North (Z=-2.625) and South (Z=+2.625)
    [-2.625, +2.625].forEach((sz) => {
      const swGeo = new THREE.BoxGeometry(tileSize, 0.15, 0.75);
      const sw = new THREE.Mesh(swGeo, sidewalkMat);
      sw.position.set(0, 0.1, sz);
      sw.receiveShadow = true;

      const curbZ = sz < 0 ? sz + 0.375 : sz - 0.375;
      const curbGeo = new THREE.BoxGeometry(tileSize, 0.18, 0.12);
      const curb = new THREE.Mesh(curbGeo, curbMat);
      curb.position.set(0, 0.115, curbZ);

      const gutter = new THREE.Mesh(new THREE.BoxGeometry(tileSize, 0.015, 0.26), curbMat);
      gutter.position.set(0, 0.048, sz < 0 ? curbZ + 0.19 : curbZ - 0.19);
      const grate = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.014, 0.22), grateDarkMat);
      grate.position.set(1.5, 0.056, sz < 0 ? curbZ + 0.19 : curbZ - 0.19);

      tile.add(sw, curb, gutter, grate);
    });

    // Dashed White Center Line along X
    for (let x = -2.0; x <= 2.0; x += 2.0) {
      const stripeGeo = new THREE.BoxGeometry(1.2, 0.01, 0.14);
      const stripe = new THREE.Mesh(stripeGeo, whiteStripeMat);
      stripe.position.set(x, 0.056, 0);
      tile.add(stripe);
    }

    // Intersection-scoped markings (Left-hand traffic: North z=-1.15 goes East +X, South z=+1.15 goes West -X)
    if (nearIntersectionPos) {
      // Approaching East intersection (+X): diamond in North lane, "30" exiting in South lane
      const diamond = buildRoadDiamondMarking();
      diamond.rotation.y = Math.PI / 2;
      diamond.position.set(-0.4, 0.056, -1.15);
      const speed30 = createRoadStencilDecal('SPEED30', 1.05, 1.05);
      speed30.rotation.z = Math.PI / 2;
      speed30.position.set(-0.4, 0.057, 1.15);
      tile.add(diamond, speed30);
    }
    if (nearIntersectionNeg) {
      // Approaching West intersection (-X): diamond in South lane, "30" exiting in North lane
      const diamond = buildRoadDiamondMarking();
      diamond.rotation.y = Math.PI / 2;
      diamond.position.set(0.4, 0.056, 1.15);
      const speed30 = createRoadStencilDecal('SPEED30', 1.05, 1.05);
      speed30.rotation.z = -Math.PI / 2;
      speed30.position.set(0.4, 0.057, -1.15);
      tile.add(diamond, speed30);
    }

    if (includeManhole) {
      const manhole = new THREE.Mesh(new THREE.CircleGeometry(0.34, 14), manholeMat);
      manhole.rotation.x = -Math.PI / 2;
      manhole.position.set(-1.6, 0.056, -1.15);
      tile.add(manhole);
    }

    // Curbside Municipal LED Streetlight on North Sidewalk (X = 0, Z = -2.72m)
    const streetLight = buildStreetlight('SOUTH', 'SIDE_STREET', lowPower);
    streetLight.position.set(0, 0.15, -2.72);
    tile.add(streetLight);

  } else if (type === 'INTERSECTION_4WAY') {
    const plateMat = intersectionInfo
      ? getIntersectionPlateMaterial(intersectionInfo.jaName, intersectionInfo.enName)
      : intersectionPlateMat;

    const cornerDefs: Array<{ corner: 'NW' | 'NE' | 'SE' | 'SW'; cx: number; cz: number }> = [
      { corner: 'NW', cx: -2.625, cz: -2.625 },
      { corner: 'NE', cx: +2.625, cz: -2.625 },
      { corner: 'SE', cx: +2.625, cz: +2.625 },
      { corner: 'SW', cx: -2.625, cz: +2.625 },
    ];

    cornerDefs.forEach(({ corner, cx, cz }) => {
      const cornerGeo = new THREE.BoxGeometry(0.75, 0.15, 0.75);
      const cornerMesh = new THREE.Mesh(cornerGeo, sidewalkMat);
      cornerMesh.position.set(cx, 0.1, cz);
      cornerMesh.receiveShadow = true;

      // Corner Curb Edge Trim & Flush Yellow Tactile Crosswalk Warning Pads (*Tenji-Burokku*)
      const innerX = cx < 0 ? cx + 0.34 : cx - 0.34;
      const innerZ = cz < 0 ? cz + 0.34 : cz - 0.34;
      const tacX = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.01, 0.45), tactileYellowMat);
      tacX.position.set(innerX, 0.178, cz);
      const tacZ = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.01, 0.16), tactileYellowMat);
      tacZ.position.set(cx, 0.178, innerZ);

      // Curb-cut pedestrian ramps toward crosswalks
      addCurbRamp(cx < 0 ? -2.20 : 2.20, cz, 0.22, 0.44, cx < 0 ? -0.28 : 0.28, 0);
      addCurbRamp(cx, cz < 0 ? -2.20 : 2.20, 0.44, 0.22, 0, cz < 0 ? 0.28 : -0.28);

      tile.add(cornerMesh, tacX, tacZ);

      // Complete 4-Way Traffic Signal Post on EVERY corner with dynamic bilingual intersection nameplate
      const signal = buildCornerTrafficSignal(corner, plateMat, false);
      signal.position.set(cx, 0.15, cz);
      tile.add(signal);
    });

    // Center Intersection Manhole Cover
    const centerManhole = new THREE.Mesh(new THREE.CircleGeometry(0.38, 14), manholeMat);
    centerManhole.rotation.x = -Math.PI / 2;
    centerManhole.position.set(0, 0.056, 0);
    tile.add(centerManhole);

    // Zebra Pedestrian Crossings (横断歩道) + White Stop Lines (停止線) + "止まれ" stencils
    [-2.1, +2.1].forEach((cz) => {
      for (let s = -1.6; s <= 1.6; s += 0.8) {
        const zebraGeo = new THREE.BoxGeometry(0.45, 0.01, 0.68);
        const zebra = new THREE.Mesh(zebraGeo, whiteStripeMat);
        zebra.position.set(s, 0.056, cz);
        tile.add(zebra);
      }
      // Stop line before crosswalk for left-hand traffic
      const stopLine = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.01, 0.26), whiteStripeMat);
      stopLine.position.set(cz < 0 ? 1.1 : -1.1, 0.056, cz < 0 ? -2.78 : 2.78);
      tile.add(stopLine);
    });

    [-2.1, +2.1].forEach((cx) => {
      for (let s = -1.6; s <= 1.6; s += 0.8) {
        const zebraGeo = new THREE.BoxGeometry(0.68, 0.01, 0.45);
        const zebra = new THREE.Mesh(zebraGeo, whiteStripeMat);
        zebra.position.set(cx, 0.056, s);
        tile.add(zebra);
      }
      const stopLine = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.01, 1.75), whiteStripeMat);
      stopLine.position.set(cx < 0 ? -2.78 : 2.78, 0.056, cx < 0 ? -1.1 : 1.1);
      tile.add(stopLine);
    });
  } else if (type === 'BOULEVARD_Z_WEST') {
    // 12m Grand Boulevard - West Half (North-South, 2 Southbound lanes)
    const swGeo = new THREE.BoxGeometry(0.75, 0.15, tileSize);
    const sw = new THREE.Mesh(swGeo, boulevardSidewalkMat);
    sw.position.set(-2.625, 0.1, 0);
    sw.receiveShadow = true;

    const tacStrip = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.008, tileSize), tactileYellowMat);
    tacStrip.position.set(-2.48, 0.178, 0);

    const curbGeo = new THREE.BoxGeometry(0.12, 0.18, tileSize);
    const curb = new THREE.Mesh(curbGeo, curbMat);
    curb.position.set(-2.25, 0.115, 0);

    const gutter = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.015, tileSize), curbMat);
    gutter.position.set(-2.06, 0.048, 0);
    const grate = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.014, 0.55), grateDarkMat);
    grate.position.set(-2.06, 0.056, 1.5);
    tile.add(sw, tacStrip, curb, gutter, grate);

    const streetLight = buildStreetlight('EAST', 'BOULEVARD', lowPower);
    streetLight.position.set(-2.72, 0.15, 0);
    tile.add(streetLight);

    // Inner East Raised Median Strip (flush against X = +3.0)
    const medCurb = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.18, tileSize), curbMat);
    medCurb.position.set(2.79, 0.115, 0);
    const medTurf = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, tileSize), medianTurfMat);
    medTurf.position.set(2.79, 0.12, 0);
    [-1.8, 0, 1.8].forEach((hz, idx) => {
      const hedge = new THREE.Mesh(new THREE.DodecahedronGeometry(0.26, 0), medianHedgeMat);
      hedge.scale.set(0.85, 0.9, 1.6);
      hedge.position.set(2.80, 0.28, hz);
      tile.add(hedge);
      if (!lowPower) {
        const flower = new THREE.Mesh(
          new THREE.BoxGeometry(0.16, 0.10, 0.48),
          idx % 2 === 0 ? medianFlowerPinkMat : medianFlowerGoldMat
        );
        flower.position.set(2.74, 0.24, hz + 0.85);
        tile.add(flower);
      }
    });
    if (includeMedianTree) {
      const tree = buildBoulevardMedianTree('GINKGO', lowPower);
      tree.position.set(3.0, 0, 0);
      tile.add(tree);
    }
    tile.add(medCurb, medTurf);

    // Dashed White Lane Divider + 2 Northbound (-Z) Left-Hand Traffic Lanes
    for (let z = -2.0; z <= 2.0; z += 2.0) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.01, 1.2), whiteStripeMat);
      stripe.position.set(0.3, 0.056, z);
      tile.add(stripe);
    }
    if (nearIntersectionNeg) {
      // Both lanes point North (-Z) approaching the intersection
      const nbInnerArrow = createRoadStencilDecal('ARROW', 0.95, 1.25);
      nbInnerArrow.position.set(1.45, 0.057, 1.0);
      const nbOuterArrow = createRoadStencilDecal('ARROW', 0.95, 1.25);
      nbOuterArrow.position.set(-0.75, 0.057, 1.0);
      const diamond = buildRoadDiamondMarking();
      diamond.position.set(0.3, 0.056, -1.35);
      tile.add(nbInnerArrow, nbOuterArrow, diamond);
    }
    if (includeBikeMark) {
      const nbBike = createRoadStencilDecal('BIKE', 0.68, 1.65);
      nbBike.position.set(-1.62, 0.057, 0);
      tile.add(nbBike);
    }

  } else if (type === 'BOULEVARD_Z_EAST') {
    // 12m Grand Boulevard - East Half (North-South, 2 Southbound +Z lanes in Left-Hand Traffic)
    const medCurb = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.18, tileSize), curbMat);
    medCurb.position.set(-2.79, 0.115, 0);
    const medTurf = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, tileSize), medianTurfMat);
    medTurf.position.set(-2.79, 0.12, 0);
    [-1.8, 0, 1.8].forEach((hz, idx) => {
      const hedge = new THREE.Mesh(new THREE.DodecahedronGeometry(0.26, 0), medianHedgeMat);
      hedge.scale.set(0.85, 0.9, 1.6);
      hedge.position.set(-2.80, 0.28, hz);
      tile.add(hedge);
      if (!lowPower) {
        const flower = new THREE.Mesh(
          new THREE.BoxGeometry(0.16, 0.10, 0.48),
          idx % 2 === 0 ? medianFlowerGoldMat : medianFlowerPinkMat
        );
        flower.position.set(-2.74, 0.24, hz - 0.85);
        tile.add(flower);
      }
    });
    tile.add(medCurb, medTurf);

    const swGeo = new THREE.BoxGeometry(0.75, 0.15, tileSize);
    const sw = new THREE.Mesh(swGeo, boulevardSidewalkMat);
    sw.position.set(2.625, 0.1, 0);
    sw.receiveShadow = true;

    const tacStrip = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.008, tileSize), tactileYellowMat);
    tacStrip.position.set(2.48, 0.178, 0);

    const curbGeo = new THREE.BoxGeometry(0.12, 0.18, tileSize);
    const curb = new THREE.Mesh(curbGeo, curbMat);
    curb.position.set(2.25, 0.115, 0);

    const gutter = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.015, tileSize), curbMat);
    gutter.position.set(2.06, 0.048, 0);
    const grate = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.014, 0.55), grateDarkMat);
    grate.position.set(2.06, 0.056, 1.5);
    tile.add(sw, tacStrip, curb, gutter, grate);

    const streetLight = buildStreetlight('WEST', 'BOULEVARD', lowPower);
    streetLight.position.set(2.72, 0.15, 0);
    tile.add(streetLight);

    for (let z = -2.0; z <= 2.0; z += 2.0) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.01, 1.2), whiteStripeMat);
      stripe.position.set(-0.3, 0.056, z);
      tile.add(stripe);
    }
    if (nearIntersectionPos) {
      // Both lanes point South (+Z) approaching the intersection
      const sbInnerArrow = createRoadStencilDecal('ARROW', 0.95, 1.25);
      sbInnerArrow.rotation.z = Math.PI;
      sbInnerArrow.position.set(-1.45, 0.057, -1.0);
      const sbOuterArrow = createRoadStencilDecal('ARROW', 0.95, 1.25);
      sbOuterArrow.rotation.z = Math.PI;
      sbOuterArrow.position.set(0.75, 0.057, -1.0);
      const diamond = buildRoadDiamondMarking();
      diamond.position.set(-0.3, 0.056, 1.35);
      tile.add(sbInnerArrow, sbOuterArrow, diamond);
    }
    if (includeBikeMark) {
      const sbBike = createRoadStencilDecal('BIKE', 0.68, 1.65);
      sbBike.rotation.z = Math.PI;
      sbBike.position.set(1.62, 0.057, 0);
      tile.add(sbBike);
    }

  } else if (type === 'BOULEVARD_X_NORTH') {
    // 12m Grand Boulevard - North Half (East-West, 2 Eastbound +X lanes in Left-Hand Traffic)
    const swGeo = new THREE.BoxGeometry(tileSize, 0.15, 0.75);
    const sw = new THREE.Mesh(swGeo, boulevardSidewalkMat);
    sw.position.set(0, 0.1, -2.625);
    sw.receiveShadow = true;

    const tacStrip = new THREE.Mesh(new THREE.BoxGeometry(tileSize, 0.008, 0.22), tactileYellowMat);
    tacStrip.position.set(0, 0.178, -2.48);

    const curb = new THREE.Mesh(new THREE.BoxGeometry(tileSize, 0.18, 0.12), curbMat);
    curb.position.set(0, 0.115, -2.25);

    const gutter = new THREE.Mesh(new THREE.BoxGeometry(tileSize, 0.015, 0.26), curbMat);
    gutter.position.set(0, 0.048, -2.06);
    const grate = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.014, 0.22), grateDarkMat);
    grate.position.set(1.5, 0.056, -2.06);
    tile.add(sw, tacStrip, curb, gutter, grate);

    const streetLight = buildStreetlight('SOUTH', 'BOULEVARD', lowPower);
    streetLight.position.set(0, 0.15, -2.72);
    tile.add(streetLight);

    // Inner South Raised Median Strip (flush against Z = +3.0)
    const medCurb = new THREE.Mesh(new THREE.BoxGeometry(tileSize, 0.18, 0.42), curbMat);
    medCurb.position.set(0, 0.115, 2.79);
    const medTurf = new THREE.Mesh(new THREE.BoxGeometry(tileSize, 0.16, 0.32), medianTurfMat);
    medTurf.position.set(0, 0.12, 2.79);
    [-1.8, 0, 1.8].forEach((hx, idx) => {
      const hedge = new THREE.Mesh(new THREE.DodecahedronGeometry(0.26, 0), medianHedgeMat);
      hedge.scale.set(1.6, 0.9, 0.85);
      hedge.position.set(hx, 0.28, 2.80);
      tile.add(hedge);
      if (!lowPower) {
        const flower = new THREE.Mesh(
          new THREE.BoxGeometry(0.48, 0.10, 0.16),
          idx % 2 === 0 ? medianFlowerPinkMat : medianFlowerGoldMat
        );
        flower.position.set(hx + 0.85, 0.24, 2.74);
        tile.add(flower);
      }
    });
    if (includeMedianTree) {
      const tree = buildBoulevardMedianTree('SAKURA', lowPower);
      tree.position.set(0, 0, 3.0);
      tile.add(tree);
    }
    tile.add(medCurb, medTurf);

    for (let x = -2.0; x <= 2.0; x += 2.0) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.01, 0.12), whiteStripeMat);
      stripe.position.set(x, 0.056, 0.3);
      tile.add(stripe);
    }
    if (nearIntersectionPos) {
      // Both lanes point East (+X) approaching the intersection
      const ebInnerArrow = createRoadStencilDecal('ARROW', 0.95, 1.25);
      ebInnerArrow.rotation.z = -Math.PI / 2;
      ebInnerArrow.position.set(-1.0, 0.057, 1.45);
      const ebOuterArrow = createRoadStencilDecal('ARROW', 0.95, 1.25);
      ebOuterArrow.rotation.z = -Math.PI / 2;
      ebOuterArrow.position.set(-1.0, 0.057, -0.75);
      const diamond = buildRoadDiamondMarking();
      diamond.rotation.y = Math.PI / 2;
      diamond.position.set(1.35, 0.056, 0.3);
      tile.add(ebInnerArrow, ebOuterArrow, diamond);
    }
    if (includeBikeMark) {
      const ebBike = createRoadStencilDecal('BIKE', 0.68, 1.65);
      ebBike.rotation.z = -Math.PI / 2;
      ebBike.position.set(0, 0.057, -1.62);
      tile.add(ebBike);
    }

  } else if (type === 'BOULEVARD_X_SOUTH') {
    // 12m Grand Boulevard - South Half (East-West, 2 Westbound -X lanes in Left-Hand Traffic)
    const medCurb = new THREE.Mesh(new THREE.BoxGeometry(tileSize, 0.18, 0.42), curbMat);
    medCurb.position.set(0, 0.115, -2.79);
    const medTurf = new THREE.Mesh(new THREE.BoxGeometry(tileSize, 0.16, 0.32), medianTurfMat);
    medTurf.position.set(0, 0.12, -2.79);
    [-1.8, 0, 1.8].forEach((hx, idx) => {
      const hedge = new THREE.Mesh(new THREE.DodecahedronGeometry(0.26, 0), medianHedgeMat);
      hedge.scale.set(1.6, 0.9, 0.85);
      hedge.position.set(hx, 0.28, -2.80);
      tile.add(hedge);
      if (!lowPower) {
        const flower = new THREE.Mesh(
          new THREE.BoxGeometry(0.48, 0.10, 0.16),
          idx % 2 === 0 ? medianFlowerGoldMat : medianFlowerPinkMat
        );
        flower.position.set(hx - 0.85, 0.24, -2.74);
        tile.add(flower);
      }
    });
    tile.add(medCurb, medTurf);

    const swGeo = new THREE.BoxGeometry(tileSize, 0.15, 0.75);
    const sw = new THREE.Mesh(swGeo, boulevardSidewalkMat);
    sw.position.set(0, 0.1, 2.625);
    sw.receiveShadow = true;

    const tacStrip = new THREE.Mesh(new THREE.BoxGeometry(tileSize, 0.008, 0.22), tactileYellowMat);
    tacStrip.position.set(0, 0.178, 2.48);

    const curb = new THREE.Mesh(new THREE.BoxGeometry(tileSize, 0.18, 0.12), curbMat);
    curb.position.set(0, 0.115, 2.25);

    const gutter = new THREE.Mesh(new THREE.BoxGeometry(tileSize, 0.015, 0.26), curbMat);
    gutter.position.set(0, 0.048, 2.06);
    const grate = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.014, 0.22), grateDarkMat);
    grate.position.set(1.5, 0.056, 2.06);
    tile.add(sw, tacStrip, curb, gutter, grate);

    const streetLight = buildStreetlight('NORTH', 'BOULEVARD', lowPower);
    streetLight.position.set(0, 0.15, 2.72);
    tile.add(streetLight);

    for (let x = -2.0; x <= 2.0; x += 2.0) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.01, 0.12), whiteStripeMat);
      stripe.position.set(x, 0.056, -0.3);
      tile.add(stripe);
    }
    if (nearIntersectionNeg) {
      // Both lanes point West (-X) approaching the intersection
      const wbInnerArrow = createRoadStencilDecal('ARROW', 0.95, 1.25);
      wbInnerArrow.rotation.z = Math.PI / 2;
      wbInnerArrow.position.set(1.0, 0.057, -1.45);
      const wbOuterArrow = createRoadStencilDecal('ARROW', 0.95, 1.25);
      wbOuterArrow.rotation.z = Math.PI / 2;
      wbOuterArrow.position.set(1.0, 0.057, 0.75);
      const diamond = buildRoadDiamondMarking();
      diamond.rotation.y = Math.PI / 2;
      diamond.position.set(-1.35, 0.056, -0.3);
      tile.add(wbInnerArrow, wbOuterArrow, diamond);
    }
    if (includeBikeMark) {
      const wbBike = createRoadStencilDecal('BIKE', 0.68, 1.65);
      wbBike.rotation.z = Math.PI / 2;
      wbBike.position.set(0, 0.057, 1.62);
      tile.add(wbBike);
    }

  } else if (type === 'BOULEVARD_CENTER_4WAY' || type === 'BOULEVARD_JUNCTION_Z' || type === 'BOULEVARD_JUNCTION_X') {
    const plateMat = intersectionInfo
      ? getIntersectionPlateMaterial(intersectionInfo.jaName, intersectionInfo.enName)
      : intersectionPlateMat;

    const cornerCoordMap: Record<'NW' | 'NE' | 'SE' | 'SW', { cx: number; cz: number }> = {
      NW: { cx: -2.625, cz: -2.625 },
      NE: { cx: +2.625, cz: -2.625 },
      SE: { cx: +2.625, cz: +2.625 },
      SW: { cx: -2.625, cz: +2.625 },
    };

    const isCenter4Way = type === 'BOULEVARD_CENTER_4WAY';

    const addBoulevardCorner = (corner: 'NW' | 'NE' | 'SE' | 'SW') => {
      const { cx, cz } = cornerCoordMap[corner];
      const cornerMesh = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.15, 0.75), boulevardSidewalkMat);
      cornerMesh.position.set(cx, 0.1, cz);
      cornerMesh.receiveShadow = true;

      const innerX = cx < 0 ? cx + 0.34 : cx - 0.34;
      const innerZ = cz < 0 ? cz + 0.34 : cz - 0.34;
      const tacX = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.01, 0.45), tactileYellowMat);
      tacX.position.set(innerX, 0.178, cz);
      const tacZ = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.01, 0.16), tactileYellowMat);
      tacZ.position.set(cx, 0.178, innerZ);

      addCurbRamp(cx < 0 ? -2.20 : 2.20, cz, 0.22, 0.44, cx < 0 ? -0.28 : 0.28, 0);
      addCurbRamp(cx, cz < 0 ? -2.20 : 2.20, 0.44, 0.22, 0, cz < 0 ? 0.28 : -0.28);

      const signal = buildCornerTrafficSignal(corner, plateMat, isCenter4Way);
      signal.position.set(cx, 0.15, cz);
      tile.add(cornerMesh, tacX, tacZ, signal);
    };

    const addMedianBollard = (bx: number, bz: number) => {
      const bollard = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.075, 0.72, 8), bronzePoleMat);
      bollard.position.set(bx, 0.36, bz);
      const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.12, 8), hazardYellowMat);
      collar.position.set(bx, 0.56, bz);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.062, 0.06, 8), lampGlowMat);
      cap.position.set(bx, 0.68, bz);
      tile.add(bollard, collar, cap);
    };

    if (type === 'BOULEVARD_CENTER_4WAY') {
      const part: 'NW' | 'NE' | 'SW' | 'SE' =
        boulevardPart === 'NE' || boulevardPart === 'SW' || boulevardPart === 'SE'
          ? boulevardPart
          : 'NW';
      addBoulevardCorner(part);

      // Outer North or South crosswalk stripes (stopping before central median)
      const isNorth = part === 'NW' || part === 'NE';
      const isWest = part === 'NW' || part === 'SW';
      const cz = isNorth ? -2.1 : +2.1;
      const startX = isWest ? -1.6 : -2.4;
      const endX = isWest ? +2.4 : +1.6;
      for (let s = startX; s <= endX + 0.01; s += 0.8) {
        const zebra = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.01, 0.68), whiteStripeMat);
        zebra.position.set(s, 0.056, cz);
        tile.add(zebra);
      }

      // Outer West or East crosswalk stripes (stopping before central median)
      const cx = isWest ? -2.1 : +2.1;
      const startZ = isNorth ? -1.6 : -2.4;
      const endZ = isNorth ? +2.4 : +1.6;
      for (let s = startZ; s <= endZ + 0.01; s += 0.8) {
        const zebra = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.01, 0.45), whiteStripeMat);
        zebra.position.set(cx, 0.056, s);
        tile.add(zebra);
      }

      // Reflective Median-Nose Bollard Lamps at outer edges of central crossing
      addMedianBollard(isWest ? 2.75 : -2.75, isNorth ? -2.85 : 2.85);

      // Left-hand approach stop line (1 per outer quadrant approach)
      if (part === 'NW') {
        const stopLine = new THREE.Mesh(new THREE.BoxGeometry(4.1, 0.01, 0.28), whiteStripeMat);
        stopLine.position.set(0.25, 0.056, -2.78);
        tile.add(stopLine);
      } else if (part === 'SE') {
        const stopLine = new THREE.Mesh(new THREE.BoxGeometry(4.1, 0.01, 0.28), whiteStripeMat);
        stopLine.position.set(-0.25, 0.056, 2.78);
        tile.add(stopLine);
      } else if (part === 'NE') {
        const stopLine = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.01, 4.1), whiteStripeMat);
        stopLine.position.set(2.78, 0.056, 0.25);
        tile.add(stopLine);
      } else if (part === 'SW') {
        const stopLine = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.01, 4.1), whiteStripeMat);
        stopLine.position.set(-2.78, 0.056, -0.25);
        tile.add(stopLine);
      }
    } else if (type === 'BOULEVARD_JUNCTION_Z') {
      const part: 'W' | 'E' = boulevardPart === 'E' ? 'E' : 'W';
      if (part === 'W') {
        addBoulevardCorner('NW');
        addBoulevardCorner('SW');
        for (let s = -1.6; s <= 1.61; s += 0.8) {
          const zebra = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.01, 0.45), whiteStripeMat);
          zebra.position.set(-2.1, 0.056, s);
          tile.add(zebra);
        }
        [-2.1, +2.1].forEach((cz) => {
          for (let s = -1.6; s <= 2.41; s += 0.8) {
            const zebra = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.01, 0.68), whiteStripeMat);
            zebra.position.set(s, 0.056, cz);
            tile.add(zebra);
          }
        });
        addMedianBollard(2.75, -2.85);
        addMedianBollard(2.75, 2.85);
        const sbStop = new THREE.Mesh(new THREE.BoxGeometry(4.1, 0.01, 0.26), whiteStripeMat);
        sbStop.position.set(0.25, 0.056, -2.78);
        const ebStop = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.01, 1.75), whiteStripeMat);
        ebStop.position.set(-2.78, 0.056, 1.1);
        const tomare = createRoadStencilDecal('TOMARE', 1.15, 0.75);
        tomare.rotation.z = -Math.PI / 2;
        tomare.position.set(-2.35, 0.057, 1.1);
        tile.add(sbStop, ebStop, tomare);
      } else {
        addBoulevardCorner('NE');
        addBoulevardCorner('SE');
        for (let s = -1.6; s <= 1.61; s += 0.8) {
          const zebra = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.01, 0.45), whiteStripeMat);
          zebra.position.set(2.1, 0.056, s);
          tile.add(zebra);
        }
        [-2.1, +2.1].forEach((cz) => {
          for (let s = -2.4; s <= 1.61; s += 0.8) {
            const zebra = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.01, 0.68), whiteStripeMat);
            zebra.position.set(s, 0.056, cz);
            tile.add(zebra);
          }
        });
        addMedianBollard(-2.75, -2.85);
        addMedianBollard(-2.75, 2.85);
        const nbStop = new THREE.Mesh(new THREE.BoxGeometry(4.1, 0.01, 0.26), whiteStripeMat);
        nbStop.position.set(-0.25, 0.056, 2.78);
        const wbStop = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.01, 1.75), whiteStripeMat);
        wbStop.position.set(2.78, 0.056, -1.1);
        const tomare = createRoadStencilDecal('TOMARE', 1.15, 0.75);
        tomare.rotation.z = Math.PI / 2;
        tomare.position.set(2.35, 0.057, -1.1);
        tile.add(nbStop, wbStop, tomare);
      }
    } else {
      // BOULEVARD_JUNCTION_X
      const part: 'N' | 'S' = boulevardPart === 'S' ? 'S' : 'N';
      if (part === 'N') {
        addBoulevardCorner('NW');
        addBoulevardCorner('NE');
        for (let s = -1.6; s <= 1.61; s += 0.8) {
          const zebra = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.01, 0.68), whiteStripeMat);
          zebra.position.set(s, 0.056, -2.1);
          tile.add(zebra);
        }
        [-2.1, +2.1].forEach((cx) => {
          for (let s = -1.6; s <= 2.41; s += 0.8) {
            const zebra = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.01, 0.45), whiteStripeMat);
            zebra.position.set(cx, 0.056, s);
            tile.add(zebra);
          }
        });
        addMedianBollard(-2.85, 2.75);
        addMedianBollard(2.85, 2.75);
        const wbStop = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.01, 4.1), whiteStripeMat);
        wbStop.position.set(2.78, 0.056, 0.25);
        const sbStop = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.01, 0.26), whiteStripeMat);
        sbStop.position.set(1.1, 0.056, -2.78);
        const tomare = createRoadStencilDecal('TOMARE', 1.15, 0.75);
        tomare.rotation.z = Math.PI;
        tomare.position.set(1.1, 0.057, -2.35);
        tile.add(wbStop, sbStop, tomare);
      } else {
        addBoulevardCorner('SW');
        addBoulevardCorner('SE');
        for (let s = -1.6; s <= 1.61; s += 0.8) {
          const zebra = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.01, 0.68), whiteStripeMat);
          zebra.position.set(s, 0.056, 2.1);
          tile.add(zebra);
        }
        [-2.1, +2.1].forEach((cx) => {
          for (let s = -2.4; s <= 1.61; s += 0.8) {
            const zebra = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.01, 0.45), whiteStripeMat);
            zebra.position.set(cx, 0.056, s);
            tile.add(zebra);
          }
        });
        addMedianBollard(-2.85, -2.75);
        addMedianBollard(2.85, -2.75);
        const ebStop = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.01, 4.1), whiteStripeMat);
        ebStop.position.set(-2.78, 0.056, -0.25);
        const nbStop = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.01, 0.26), whiteStripeMat);
        nbStop.position.set(-1.1, 0.056, 2.78);
        const tomare = createRoadStencilDecal('TOMARE', 1.15, 0.75);
        tomare.position.set(-1.1, 0.057, 2.35);
        tile.add(ebStop, nbStop, tomare);
      }
    }
  }

  return tile;
}
