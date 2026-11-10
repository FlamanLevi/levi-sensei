import * as THREE from 'three';

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
// PROCEDURAL STREETSCAPE TEXTURES (Cached Singletons for Static Batching)
// ============================================================================

function createAsphaltTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#334155';
  ctx.fillRect(0, 0, 256, 256);

  const img = ctx.getImageData(0, 0, 256, 256);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const grain = (Math.random() - 0.5) * 18;
    d[i] = Math.min(255, Math.max(0, d[i] + grain));
    d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + grain));
    d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + grain));
  }
  ctx.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createSidewalkPaverTexture(): THREE.CanvasTexture | null {
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
  return tex;
}

function createManholeTexture(): THREE.CanvasTexture | null {
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
  return tex;
}

function createStreetBannerTexture(): THREE.CanvasTexture | null {
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
  mat.userData.batchUnique = true;
  plateMatCache.set(key, mat);
  return mat;
}

function createPushButtonBoxTexture(): THREE.CanvasTexture | null {
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
  return tex;
}

// Reusable standard road materials
const asphaltMat = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  map: createAsphaltTexture(),
  roughness: 0.88,
});
const curbMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.8 });
const sidewalkMat = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  map: createSidewalkPaverTexture(),
  roughness: 0.78,
});
const whiteStripeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
const tactileYellowMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.55 });
const grateDarkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7, roughness: 0.4 });
const manholeMat = new THREE.MeshStandardMaterial({
  map: createManholeTexture(),
  transparent: true,
  roughness: 0.5,
  metalness: 0.6,
});
const medianTurfMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.85 });
const medianHedgeMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.9 });

// Streetlight & Traffic Signal materials
const poleMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.45, metalness: 0.65 });
const castIronMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5, metalness: 0.5 });
const controllerBoxMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.5, metalness: 0.4 });
const housingMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.65 });
const speakerWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.5 });
const yellowBoxMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.5 });
const pushButtonFaceMat = new THREE.MeshStandardMaterial({
  map: createPushButtonBoxTexture(),
  roughness: 0.4,
});
const intersectionPlateMat = getIntersectionPlateMaterial('みどり町中央', 'Midori-machi Central');
const streetBannerMat = new THREE.MeshStandardMaterial({
  map: createStreetBannerTexture(),
  roughness: 0.5,
  side: THREE.DoubleSide,
});
const lampGlowMat = new THREE.MeshStandardMaterial({ 
  color: 0xfef08a, 
  emissive: 0xfde047, 
  emissiveIntensity: 1.8, 
  roughness: 0.15 
});

// Zero-shader-cost warm ground light pool beneath streetlights
const lightPoolMat = new THREE.MeshBasicMaterial({
  color: 0xfef08a,
  transparent: true,
  opacity: 0.16,
  depthWrite: false,
});

// Luminous traffic light lenses (driven by updateTrafficSignals())
const nsVehGreenMat = new THREE.MeshStandardMaterial({ 
  color: 0x10b981, 
  emissive: 0x10b981, 
  emissiveIntensity: 1.8, 
  roughness: 0.2 
});
const nsVehYellowMat = new THREE.MeshStandardMaterial({ 
  color: 0xfacc15, 
  emissive: 0xfacc15, 
  emissiveIntensity: 0.4, 
  roughness: 0.2 
});
const nsVehRedMat = new THREE.MeshStandardMaterial({ 
  color: 0xef4444, 
  emissive: 0xef4444, 
  emissiveIntensity: 1.6, 
  roughness: 0.2 
});

const ewVehGreenMat = nsVehGreenMat.clone();
const ewVehYellowMat = nsVehYellowMat.clone();
const ewVehRedMat = nsVehRedMat.clone();

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
  private lastKey: string = '';

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
    const key = `${isWalk ? 1 : 0}_${isFlashing ? 1 : 0}_${flashOn ? 1 : 0}_${greenBars}_${redBars}`;
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

const nsPedestrianDisplay = new PedestrianCountdownDisplay();
const ewPedestrianDisplay = new PedestrianCountdownDisplay();

const nsPedestrianMat = new THREE.MeshStandardMaterial({
  map: nsPedestrianDisplay.texture,
  emissive: 0xffffff,
  emissiveMap: nsPedestrianDisplay.texture,
  emissiveIntensity: 1.6,
  roughness: 0.15,
});

const ewPedestrianMat = new THREE.MeshStandardMaterial({
  map: ewPedestrianDisplay.texture,
  emissive: 0xffffff,
  emissiveMap: ewPedestrianDisplay.texture,
  emissiveIntensity: 1.6,
  roughness: 0.15,
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

/**
 * Streetlights switch on at dusk and off by day
 */
export function setStreetlightLevel(level: number): void {
  const l = THREE.MathUtils.clamp(level, 0, 1);
  lampGlowMat.emissiveIntensity = 0.15 + 1.65 * l;
  lightPoolMat.opacity = 0.18 * l;
  lightPoolMat.visible = l > 0.01;
}

updateTrafficSignals(0);

/**
 * Builds an authentic Japanese Shopping-Avenue Curved Lamppost (*Gaitō*)
 * with fluted cast-iron base, arched neck, scroll brace, and vertical street banner (*Gaitō Furaggu*).
 */
function buildStreetlight(facingDirection: 'EAST' | 'WEST' | 'NORTH' | 'SOUTH' = 'EAST'): THREE.Group {
  const lightGroup = new THREE.Group();
  lightGroup.name = 'Streetlight';

  // Stepped Fluted Cast-Iron Base Plinth & Decorative Collar
  const basePlinth = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.22, 0.35, 10), castIronMat);
  basePlinth.position.y = 0.175;
  const baseCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 0.25, 10), castIronMat);
  baseCollar.position.y = 0.45;
  lightGroup.add(basePlinth, baseCollar);

  // Main Vertical Pole (4.2m)
  const poleGeo = new THREE.CylinderGeometry(0.055, 0.085, 4.1, 10);
  const pole = new THREE.Mesh(poleGeo, poleMat);
  pole.position.y = 2.25;
  pole.castShadow = true;
  lightGroup.add(pole);

  // Decorative Mid-Pole Ring & Vertical Town Avenue Banner Flag (*Gaitō Furaggu*)
  const midRing = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.08, 10), castIronMat);
  midRing.position.y = 3.15;
  const bannerArmTop = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.38, 6), castIronMat);
  bannerArmTop.rotation.z = Math.PI / 2;
  bannerArmTop.position.set(0.20, 3.05, 0);
  const bannerArmBot = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.38, 6), castIronMat);
  bannerArmBot.rotation.z = Math.PI / 2;
  bannerArmBot.position.set(0.20, 2.35, 0);
  const bannerFlag = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.68), streetBannerMat);
  bannerFlag.position.set(0.22, 2.70, 0);
  lightGroup.add(midRing, bannerArmTop, bannerArmBot, bannerFlag);

  // Arched Gooseneck Cantilever Arm + Diagonal Scroll Brace
  const armGeo = new THREE.BoxGeometry(0.88, 0.055, 0.055);
  const arm = new THREE.Mesh(armGeo, poleMat);
  arm.position.set(0.38, 4.28, 0);
  arm.rotation.z = -0.10;
  const scrollBrace = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.035, 0.035), castIronMat);
  scrollBrace.position.set(0.22, 4.02, 0);
  scrollBrace.rotation.z = 0.55;
  lightGroup.add(arm, scrollBrace);

  // Aerodynamic Lamp Luminaire Fixture Housing & Glowing Lens Globe
  const fixtureGeo = new THREE.BoxGeometry(0.58, 0.12, 0.28);
  const fixture = new THREE.Mesh(fixtureGeo, housingMat);
  fixture.position.set(0.76, 4.30, 0);
  lightGroup.add(fixture);

  const lensGeo = new THREE.BoxGeometry(0.50, 0.06, 0.22);
  const lens = new THREE.Mesh(lensGeo, lampGlowMat);
  lens.position.set(0.76, 4.22, 0);
  lightGroup.add(lens);

  // Warm Ground Light Pool on Pavement (Zero GPU light-loop cost!)
  const poolGeo = new THREE.CircleGeometry(2.1, 16);
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
  plateMat: THREE.Material = intersectionPlateMat
): THREE.Group {
  const head = new THREE.Group();
  const housingGeo = new THREE.BoxGeometry(0.92, 0.34, 0.16);
  const housing = new THREE.Mesh(housingGeo, housingMat);
  head.add(housing);

  const lensRadius = 0.098;
  // Cylinder thickness 0.08m shifted forward to z = +0.055 so it never pokes out the back (-Z) of the housing!
  const lensGeo = new THREE.CylinderGeometry(lensRadius, lensRadius, 0.08, 14);
  lensGeo.rotateX(Math.PI / 2);

  // Curved top sun visor hood (*Hisashi*) over each lens
  const hoodGeo = new THREE.CylinderGeometry(
    lensRadius + 0.015,
    lensRadius + 0.015,
    0.14,
    12,
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

  // Bilingual Intersection Nameplate (*Kōsaten Meishō-ban*) mounted above the signal head
  const nameplate = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.20, 0.04), [
    housingMat, housingMat, housingMat, housingMat, plateMat, housingMat,
  ]);
  nameplate.position.set(0, 0.29, 0.02);
  head.add(nameplate);

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
  plateMat: THREE.Material = intersectionPlateMat
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
  pole.castShadow = true;
  group.add(pole);

  // Grey Traffic Signal Controller Box (*Seigyoki*) lowered to base of pole (y = 0.50m)
  const ctrlBox = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.48, 0.16), controllerBoxMat);
  ctrlBox.position.set(0, 0.50, -0.12);
  group.add(ctrlBox);

  const addArmAndHead = (
    dx: number,
    dz: number,
    facingAngleY: number,
    gMat: THREE.Material,
    yMat: THREE.Material,
    rMat: THREE.Material
  ) => {
    const armLen = 1.18;
    const isX = Math.abs(dx) > 0.5;
    const armGeo = isX ? new THREE.BoxGeometry(armLen, 0.055, 0.055) : new THREE.BoxGeometry(0.055, 0.055, armLen);
    const arm = new THREE.Mesh(armGeo, poleMat);
    // Vehicular signal mast lowered from y = 4.20m to y = 3.35m (world y = 3.50m)
    arm.position.set(dx * (armLen / 2), 3.35, dz * (armLen / 2));

    // Upper support tie-bar bracket
    const braceGeo = isX ? new THREE.BoxGeometry(armLen * 0.65, 0.035, 0.035) : new THREE.BoxGeometry(0.035, 0.035, armLen * 0.65);
    const brace = new THREE.Mesh(braceGeo, poleMat);
    brace.position.set(dx * (armLen * 0.32), 3.50, dz * (armLen * 0.32));
    group.add(arm, brace);

    const head = createVehicularHead(gMat, yMat, rMat, plateMat);
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

/**
 * Builds a standard 6.0m x 6.0m (1U x 1U) road tile with curbs, textured sidewalks, lane markings,
 * Japanese road diamonds (◇), manhole covers, storm grates, streetlights, and 4-way traffic signals.
 */
export function buildRoadTile(
  type: RoadTileType,
  intersectionInfo?: IntersectionInfo
): THREE.Group {
  const tile = new THREE.Group();
  tile.name = `RoadTile_${type}`;

  const tileSize = 6.0;

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

      // Curbside Storm Drain Grate (*Usui-masu*)
      const grate = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.01, 0.55), grateDarkMat);
      grate.position.set(sx < 0 ? curbX + 0.20 : curbX - 0.20, 0.055, 1.5);

      tile.add(sw, curb, grate);
    });

    // Dashed White Center Line along Z
    for (let z = -2.0; z <= 2.0; z += 2.0) {
      const stripeGeo = new THREE.BoxGeometry(0.14, 0.01, 1.2);
      const stripe = new THREE.Mesh(stripeGeo, whiteStripeMat);
      stripe.position.set(0, 0.056, z);
      tile.add(stripe);
    }

    // Iconic Japanese White Road Diamond (◇) in lane + Cast-Iron Manhole Cover
    const diamond = buildRoadDiamondMarking();
    diamond.position.set(-1.15, 0.056, 0);
    tile.add(diamond);

    const manhole = new THREE.Mesh(new THREE.CircleGeometry(0.34, 16), manholeMat);
    manhole.rotation.x = -Math.PI / 2;
    manhole.position.set(1.15, 0.056, -1.2);
    tile.add(manhole);

    // Curbside Streetlight on West Sidewalk (X = -2.72m, Z = 0)
    const streetLight = buildStreetlight('EAST');
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

      const grate = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.01, 0.24), grateDarkMat);
      grate.position.set(1.5, 0.055, sz < 0 ? curbZ + 0.20 : curbZ - 0.20);

      tile.add(sw, curb, grate);
    });

    // Dashed White Center Line along X
    for (let x = -2.0; x <= 2.0; x += 2.0) {
      const stripeGeo = new THREE.BoxGeometry(1.2, 0.01, 0.14);
      const stripe = new THREE.Mesh(stripeGeo, whiteStripeMat);
      stripe.position.set(x, 0.056, 0);
      tile.add(stripe);
    }

    // Iconic Japanese White Road Diamond (◇) in lane + Cast-Iron Manhole Cover
    const diamond = buildRoadDiamondMarking();
    diamond.rotation.y = Math.PI / 2;
    diamond.position.set(0, 0.056, 1.15);
    tile.add(diamond);

    const manhole = new THREE.Mesh(new THREE.CircleGeometry(0.34, 16), manholeMat);
    manhole.rotation.x = -Math.PI / 2;
    manhole.position.set(-1.2, 0.056, -1.15);
    tile.add(manhole);

    // Curbside Streetlight on North Sidewalk (X = 0, Z = -2.72m)
    const streetLight = buildStreetlight('SOUTH');
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
      const tacX = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.01, 0.45), tactileYellowMat);
      tacX.position.set(innerX, 0.178, cz);
      const tacZ = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.01, 0.14), tactileYellowMat);
      tacZ.position.set(cx, 0.178, innerZ);

      tile.add(cornerMesh, tacX, tacZ);

      // Complete 4-Way Traffic Signal Post on EVERY corner with dynamic bilingual intersection nameplate
      const signal = buildCornerTrafficSignal(corner, plateMat);
      signal.position.set(cx, 0.15, cz);
      tile.add(signal);
    });

    // Center Intersection Manhole Cover
    const centerManhole = new THREE.Mesh(new THREE.CircleGeometry(0.38, 16), manholeMat);
    centerManhole.rotation.x = -Math.PI / 2;
    centerManhole.position.set(0, 0.056, 0);
    tile.add(centerManhole);

    // Zebra Pedestrian Crossings (横断歩道) + White Stop Lines (停止線) on all 4 branches
    [-2.1, +2.1].forEach((cz) => {
      for (let s = -1.6; s <= 1.6; s += 0.8) {
        const zebraGeo = new THREE.BoxGeometry(0.45, 0.01, 0.68);
        const zebra = new THREE.Mesh(zebraGeo, whiteStripeMat);
        zebra.position.set(s, 0.056, cz);
        tile.add(zebra);
      }
      // Stop line before crosswalk for left-hand traffic
      const stopLine = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.01, 0.22), whiteStripeMat);
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
      const stopLine = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.01, 1.75), whiteStripeMat);
      stopLine.position.set(cx < 0 ? -2.78 : 2.78, 0.056, cx < 0 ? -1.1 : 1.1);
      tile.add(stopLine);
    });
  } else if (type === 'BOULEVARD_Z_WEST') {
    // 12m Grand Boulevard - West Half (North-South, 2 Southbound lanes)
    // Outer West Sidewalk (X = -2.625)
    const swGeo = new THREE.BoxGeometry(0.75, 0.15, tileSize);
    const sw = new THREE.Mesh(swGeo, sidewalkMat);
    sw.position.set(-2.625, 0.1, 0);
    sw.receiveShadow = true;

    const curbGeo = new THREE.BoxGeometry(0.12, 0.18, tileSize);
    const curb = new THREE.Mesh(curbGeo, curbMat);
    curb.position.set(-2.25, 0.115, 0);

    const grate = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.01, 0.55), grateDarkMat);
    grate.position.set(-2.05, 0.055, 1.5);
    tile.add(sw, curb, grate);

    const streetLight = buildStreetlight('EAST');
    streetLight.position.set(-2.72, 0.15, 0);
    tile.add(streetLight);

    // Inner East Raised Median Strip (sitting flush against X = +3.0)
    const medCurb = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.18, tileSize), curbMat);
    medCurb.position.set(2.80, 0.115, 0);
    const medTurf = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, tileSize), medianTurfMat);
    medTurf.position.set(2.80, 0.12, 0);
    [-1.8, 0, 1.8].forEach((hz) => {
      const hedge = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.32, 1.0), medianHedgeMat);
      hedge.position.set(2.80, 0.28, hz);
      tile.add(hedge);
    });
    tile.add(medCurb, medTurf);

    // Dashed White Lane Divider between the 2 lanes
    for (let z = -2.0; z <= 2.0; z += 2.0) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.01, 1.2), whiteStripeMat);
      stripe.position.set(0.3, 0.056, z);
      tile.add(stripe);
    }

    const diamond = buildRoadDiamondMarking();
    diamond.position.set(-0.9, 0.056, 0);
    tile.add(diamond);

  } else if (type === 'BOULEVARD_Z_EAST') {
    // 12m Grand Boulevard - East Half (North-South, 2 Northbound lanes)
    // Inner West Raised Median Strip (sitting flush against X = -3.0)
    const medCurb = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.18, tileSize), curbMat);
    medCurb.position.set(-2.80, 0.115, 0);
    const medTurf = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, tileSize), medianTurfMat);
    medTurf.position.set(-2.80, 0.12, 0);
    [-1.8, 0, 1.8].forEach((hz) => {
      const hedge = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.32, 1.0), medianHedgeMat);
      hedge.position.set(-2.80, 0.28, hz);
      tile.add(hedge);
    });
    tile.add(medCurb, medTurf);

    // Outer East Sidewalk (X = +2.625)
    const swGeo = new THREE.BoxGeometry(0.75, 0.15, tileSize);
    const sw = new THREE.Mesh(swGeo, sidewalkMat);
    sw.position.set(2.625, 0.1, 0);
    sw.receiveShadow = true;

    const curbGeo = new THREE.BoxGeometry(0.12, 0.18, tileSize);
    const curb = new THREE.Mesh(curbGeo, curbMat);
    curb.position.set(2.25, 0.115, 0);

    const grate = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.01, 0.55), grateDarkMat);
    grate.position.set(2.05, 0.055, 1.5);
    tile.add(sw, curb, grate);

    const streetLight = buildStreetlight('WEST');
    streetLight.position.set(2.72, 0.15, 0);
    tile.add(streetLight);

    // Dashed White Lane Divider between the 2 lanes
    for (let z = -2.0; z <= 2.0; z += 2.0) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.01, 1.2), whiteStripeMat);
      stripe.position.set(-0.3, 0.056, z);
      tile.add(stripe);
    }

    const diamond = buildRoadDiamondMarking();
    diamond.position.set(0.9, 0.056, 0);
    tile.add(diamond);

  } else if (type === 'BOULEVARD_X_NORTH') {
    // 12m Grand Boulevard - North Half (East-West, 2 Westbound lanes)
    // Outer North Sidewalk (Z = -2.625)
    const swGeo = new THREE.BoxGeometry(tileSize, 0.15, 0.75);
    const sw = new THREE.Mesh(swGeo, sidewalkMat);
    sw.position.set(0, 0.1, -2.625);
    sw.receiveShadow = true;

    const curb = new THREE.Mesh(new THREE.BoxGeometry(tileSize, 0.18, 0.12), curbMat);
    curb.position.set(0, 0.115, -2.25);

    const grate = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.01, 0.24), grateDarkMat);
    grate.position.set(1.5, 0.055, -2.05);
    tile.add(sw, curb, grate);

    const streetLight = buildStreetlight('SOUTH');
    streetLight.position.set(0, 0.15, -2.72);
    tile.add(streetLight);

    // Inner South Raised Median Strip (flush against Z = +3.0)
    const medCurb = new THREE.Mesh(new THREE.BoxGeometry(tileSize, 0.18, 0.40), curbMat);
    medCurb.position.set(0, 0.115, 2.80);
    const medTurf = new THREE.Mesh(new THREE.BoxGeometry(tileSize, 0.16, 0.34), medianTurfMat);
    medTurf.position.set(0, 0.12, 2.80);
    [-1.8, 0, 1.8].forEach((hx) => {
      const hedge = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.32, 0.26), medianHedgeMat);
      hedge.position.set(hx, 0.28, 2.80);
      tile.add(hedge);
    });
    tile.add(medCurb, medTurf);

    for (let x = -2.0; x <= 2.0; x += 2.0) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.01, 0.12), whiteStripeMat);
      stripe.position.set(x, 0.056, 0.3);
      tile.add(stripe);
    }

  } else if (type === 'BOULEVARD_X_SOUTH') {
    // 12m Grand Boulevard - South Half (East-West, 2 Eastbound lanes)
    // Inner North Raised Median Strip (flush against Z = -3.0)
    const medCurb = new THREE.Mesh(new THREE.BoxGeometry(tileSize, 0.18, 0.40), curbMat);
    medCurb.position.set(0, 0.115, -2.80);
    const medTurf = new THREE.Mesh(new THREE.BoxGeometry(tileSize, 0.16, 0.34), medianTurfMat);
    medTurf.position.set(0, 0.12, -2.80);
    [-1.8, 0, 1.8].forEach((hx) => {
      const hedge = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.32, 0.26), medianHedgeMat);
      hedge.position.set(hx, 0.28, -2.80);
      tile.add(hedge);
    });
    tile.add(medCurb, medTurf);

    // Outer South Sidewalk (Z = +2.625)
    const swGeo = new THREE.BoxGeometry(tileSize, 0.15, 0.75);
    const sw = new THREE.Mesh(swGeo, sidewalkMat);
    sw.position.set(0, 0.1, 2.625);
    sw.receiveShadow = true;

    const curb = new THREE.Mesh(new THREE.BoxGeometry(tileSize, 0.18, 0.12), curbMat);
    curb.position.set(0, 0.115, 2.25);

    const grate = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.01, 0.24), grateDarkMat);
    grate.position.set(1.5, 0.055, 2.05);
    tile.add(sw, curb, grate);

    const streetLight = buildStreetlight('NORTH');
    streetLight.position.set(0, 0.15, 2.72);
    tile.add(streetLight);

    for (let x = -2.0; x <= 2.0; x += 2.0) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.01, 0.12), whiteStripeMat);
      stripe.position.set(x, 0.056, -0.3);
      tile.add(stripe);
    }

  } else if (type === 'BOULEVARD_CENTER_4WAY' || type === 'BOULEVARD_JUNCTION_Z' || type === 'BOULEVARD_JUNCTION_X') {
    // Grand Junction open asphalt with crosswalks and corner signals
    const centerManhole = new THREE.Mesh(new THREE.CircleGeometry(0.42, 16), manholeMat);
    centerManhole.rotation.x = -Math.PI / 2;
    centerManhole.position.set(0, 0.056, 0);
    tile.add(centerManhole);

    // Zebra Crosswalk stripes
    for (let s = -2.0; s <= 2.0; s += 0.8) {
      const zebraZ = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.01, 0.72), whiteStripeMat);
      zebraZ.position.set(s, 0.056, 2.2);
      tile.add(zebraZ);

      const zebraX = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.01, 0.45), whiteStripeMat);
      zebraX.position.set(2.2, 0.056, s);
      tile.add(zebraX);
    }
    for (let z = -2.0; z <= 2.0; z += 2.0) {
      const stripeGeo = new THREE.BoxGeometry(0.14, 0.01, 1.2);
      const stripe = new THREE.Mesh(stripeGeo, whiteStripeMat);
      stripe.position.set(0, 0.056, z);
      tile.add(stripe);
    }
  }

  return tile;
}
