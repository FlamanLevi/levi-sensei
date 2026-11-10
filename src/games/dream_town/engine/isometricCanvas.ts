import { TownTilesData, MissingBlueprintTarget, LandmarkLabel, NavigatorMission } from './types';

export const HALF_W = 64;
export const QUARTER_W = 32;
export const PAD = 80;

export interface CameraState {
  x: number;
  y: number;
  zoom: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface CellCoord {
  row: number;
  col: number;
}

export interface RenderOptions {
  grid: string[][];
  puzzleTargets?: MissingBlueprintTarget[];
  activeTargetId?: string;
  isMasterView?: boolean;
  travelerPos?: { row: number; col: number; dir: string } | null;
  navigatorMission?: NavigatorMission | null;
  showNavigatorGoal?: boolean;
  activeBrush?: string | null;
  landmarkLabels?: LandmarkLabel[];
  showLandmarkLabels?: boolean;
  isJa?: boolean;
}

/**
 * Transforms screen coordinates to world coordinates.
 */
export function screenToWorld(sx: number, sy: number, camera: CameraState): Point {
  return {
    x: (sx - camera.x) / camera.zoom,
    y: (sy - camera.y) / camera.zoom
  };
}

/**
 * Transforms world coordinates into discrete isometric (row, col) cell indices.
 * Each 128x128 tile sprite has its ground diamond centered at (ox + 64, oy + 96).
 */
export function worldToCell(
  wx: number,
  wy: number,
  originX: number,
  originY: number,
  rows: number,
  cols: number
): CellCoord | null {
  const dx = wx - (originX + HALF_W);
  const dy = wy - (originY + 3 * QUARTER_W);
  const col = Math.round(dy / 64.0 + dx / 128.0);
  const row = Math.round(dy / 64.0 - dx / 128.0);
  if (row >= 0 && row < rows && col >= 0 && col < cols) {
    return { row, col };
  }
  return null;
}

/**
 * Calculates world bounds and center for an N x M grid.
 */
export function getGridMetrics(rows: number, cols: number) {
  const worldW = (rows + cols) * HALF_W + 2 * PAD;
  const worldH = HALF_W + (rows + cols) * QUARTER_W + 2 * PAD;
  const originX = (rows - 1) * HALF_W + PAD;
  const originY = PAD;
  const centerX = worldW / 2;
  const centerY = worldH / 2;
  return { worldW, worldH, originX, originY, centerX, centerY };
}

/**
 * Chimney smoke particle emitters for living town atmosphere.
 */
const CHIMNEY_LOCATIONS: Record<string, { dx: number; dy: number; color?: string; count?: number; maxH?: number }> = {
  'b06_bakery': { dx: 72, dy: 18, count: 4, maxH: 26 },
  'b01_cottage_red': { dx: 72, dy: 22, count: 3, maxH: 22 },
  'b02_tudor_inn': { dx: 68, dy: 16, count: 3, maxH: 22 },
  'b03_blacksmith_forge': { dx: 62, dy: 22, color: 'rgba(235, 120, 80,', count: 4, maxH: 24 },
  'b16_alchemist_workshop': { dx: 68, dy: 20, color: 'rgba(175, 230, 255,', count: 4, maxH: 24 },
  'l11_volcanic_caldera_island': { dx: 64, dy: 34, color: 'rgba(90, 80, 85,', count: 6, maxH: 36 }
};

/**
 * High-performance 2:1 Isometric Canvas Renderer
 */
export class TownCanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private tilesData: TownTilesData;
  private imageCache: Map<string, HTMLImageElement> = new Map();
  private animCache: Map<string, HTMLImageElement[]> = new Map();
  private entityImgCache: Map<string, { img: HTMLImageElement; w: number; h: number }> = new Map();

  public camera: CameraState = { x: 0, y: 0, zoom: 1.0 };
  public hoveredCell: CellCoord | null = null;
  public selectedCell: CellCoord | null = null;
  public animTime = 0;
  public animFrame = 0;

  constructor(canvas: HTMLCanvasElement, tilesData: TownTilesData) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D canvas context');
    this.ctx = ctx;
    this.tilesData = tilesData;
    this.preloadImages();
  }

  private preloadImages() {
    // 1. Static tile sprites
    for (const [tid, uri] of Object.entries(this.tilesData.sprites)) {
      const img = new Image();
      img.src = uri;
      this.imageCache.set(tid, img);
    }

    // 2. Animated tile frames
    for (const [tid, uris] of Object.entries(this.tilesData.animatedSprites)) {
      const frames = uris.map(uri => {
        const img = new Image();
        img.src = uri;
        return img;
      });
      this.animCache.set(tid, frames);
    }

    // 3. Entity sprites (Eagle, Cart, Boat, Swan)
    for (const [ename, sdata] of Object.entries(this.tilesData.entitySprites)) {
      const img = new Image();
      img.src = sdata[0];
      this.entityImgCache.set(ename, { img, w: sdata[1] || 32, h: sdata[2] || 24 });
    }
  }

  public centerView(rows: number, cols: number) {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const { worldW, worldH, centerX, centerY } = getGridMetrics(rows, cols);
    const fitZoom = Math.min(rect.width / worldW, rect.height / worldH) * 0.92;
    this.camera.zoom = Math.max(0.35, Math.min(fitZoom, 1.35));
    this.camera.x = rect.width / 2 - centerX * this.camera.zoom;
    this.camera.y = rect.height / 2 - centerY * this.camera.zoom;
  }

  public zoomAroundPoint(newZoom: number, screenX: number, screenY: number) {
    const clamped = Math.max(0.3, Math.min(newZoom, 2.4));
    this.camera.x = screenX - (screenX - this.camera.x) * (clamped / this.camera.zoom);
    this.camera.y = screenY - (screenY - this.camera.y) * (clamped / this.camera.zoom);
    this.camera.zoom = clamped;
  }

  public render(options: RenderOptions) {
    const {
      grid,
      puzzleTargets = [],
      activeTargetId,
      isMasterView = false,
      travelerPos = null,
      navigatorMission = null,
      showNavigatorGoal = true,
      activeBrush = null,
      landmarkLabels = [],
      showLandmarkLabels = false,
      isJa = true
    } = options;

    const rows = grid.length;
    const cols = grid[0].length;
    const { originX, originY, centerX, centerY } = getGridMetrics(rows, cols);
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Synchronize canvas buffer with display resolution
    const targetW = Math.max(1, Math.round(rect.width * dpr));
    const targetH = Math.max(1, Math.round(rect.height * dpr));
    if (this.canvas.width !== targetW || this.canvas.height !== targetH) {
      this.canvas.width = targetW;
      this.canvas.height = targetH;
    }

    const ctx = this.ctx;
    ctx.save();
    ctx.scale(dpr, dpr);

    // Deep slate background for high classroom projector contrast
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Apply Camera pan and zoom
    ctx.save();
    ctx.translate(this.camera.x, this.camera.y);
    ctx.scale(this.camera.zoom, this.camera.zoom);
    ctx.imageSmoothingEnabled = false; // Sharp pixel art

    // Isometric Grid Rendering using Depth-Sorted Painter's Algorithm
    for (let depth = 0; depth <= rows + cols - 2; depth++) {
      for (let r = 0; r < rows; r++) {
        const c = depth - r;
        if (c >= 0 && c < cols) {
          const tid = grid[r][c];
          const ox = originX + (c - r) * HALF_W;
          const oy = originY + (r + c) * QUARTER_W;
          // Ground diamond center of a 128x128 isometric tile is at (ox + 64, oy + 96)
          const groundCx = ox + HALF_W;
          const groundCy = oy + QUARTER_W * 3;

          // Resolve image: either animated frame or static sprite
          let img = this.imageCache.get(tid);
          const animFrames = this.animCache.get(tid);
          if (animFrames && animFrames.length > 0) {
            const isWindmill = tid.includes('windmill') || tid.includes('wind_');
            const phaseOffset = isWindmill ? Math.floor((c * 13 + r * 17 + (r + 1) * (c + 2)) / 3) : 0;
            const fIdx = (this.animFrame + phaseOffset) % animFrames.length;
            const aImg = animFrames[fIdx];
            if (aImg && aImg.complete) img = aImg;
          }

          if (img && img.complete) {
            ctx.drawImage(img, ox, oy);
          }

          // Render Blueprint Missing Plot Badge (?1, ?2) in Mode 1
          const targetIdx = puzzleTargets.findIndex(t => t.row === r && t.col === c && !t.placed);
          if (targetIdx !== -1) {
            const target = puzzleTargets[targetIdx];
            const isFocused = target.id === activeTargetId;
            this.drawMissingPlotMarker(ctx, groundCx, groundCy, target, targetIdx + 1, isMasterView, isFocused);
          }

          // Cell Selection & Hover Diamonds + Ghost Brush Preview
          if (this.selectedCell && this.selectedCell.row === r && this.selectedCell.col === c) {
            this.drawIsometricDiamond(ctx, groundCx, groundCy, 'rgba(245, 158, 11, 0.35)', 'rgba(251, 191, 36, 0.95)', 3);
          } else if (this.hoveredCell && this.hoveredCell.row === r && this.hoveredCell.col === c) {
            this.drawIsometricDiamond(ctx, groundCx, groundCy, 'rgba(56, 189, 248, 0.25)', 'rgba(56, 189, 248, 0.85)', 2.5);
            if (activeBrush && activeBrush !== tid) {
              const brushImg = this.imageCache.get(activeBrush);
              if (brushImg && brushImg.complete) {
                ctx.save();
                ctx.globalAlpha = 0.62;
                ctx.drawImage(brushImg, ox, oy);
                ctx.restore();
              }
            }
          }
        }
      }
    }

    // Living Diorama: Chimney Smoke Particles
    this.renderChimneySmokes(ctx, grid, originX, originY);

    // Landmark Name Badges (Optional Orientation Labels for Mode 1 & Mode 2)
    if (showLandmarkLabels && landmarkLabels.length > 0) {
      this.renderLandmarkLabels(ctx, landmarkLabels, originX, originY, isJa);
    }

    // Mode 2: Navigator Destination Goal Beacon
    if (navigatorMission && showNavigatorGoal) {
      const gx = originX + (navigatorMission.targetCol - navigatorMission.targetRow) * HALF_W + HALF_W;
      const gy = originY + (navigatorMission.targetRow + navigatorMission.targetCol) * QUARTER_W + QUARTER_W * 3;
      this.drawNavigatorGoalMarker(ctx, gx, gy, navigatorMission);
    }

    // Mode 2: Traveler Cart / Avatar
    if (travelerPos) {
      const tox = originX + (travelerPos.col - travelerPos.row) * HALF_W + HALF_W;
      const toy = originY + (travelerPos.row + travelerPos.col) * QUARTER_W + QUARTER_W * 3;
      this.drawTravelerAvatar(ctx, tox, toy, travelerPos.dir);
    }

    // Ambient Soaring Eagle
    this.renderSoaringEagle(ctx, centerX, centerY);

    ctx.restore();
    ctx.restore();
  }

  /**
   * Renders the entire 16x16 island onto a full-resolution offscreen canvas
   * so snapshots never get cropped by viewport pan/zoom.
   */
  public exportFullIslandPng(grid: string[][]): string {
    const rows = grid.length;
    const cols = grid[0].length;
    const { worldW, worldH, originX, originY, centerX, centerY } = getGridMetrics(rows, cols);

    const offCanvas = document.createElement('canvas');
    offCanvas.width = worldW;
    offCanvas.height = worldH;
    const offCtx = offCanvas.getContext('2d');
    if (!offCtx) return this.canvas.toDataURL('image/png');

    offCtx.imageSmoothingEnabled = false;
    offCtx.fillStyle = '#0f172a';
    offCtx.fillRect(0, 0, worldW, worldH);

    for (let depth = 0; depth <= rows + cols - 2; depth++) {
      for (let r = 0; r < rows; r++) {
        const c = depth - r;
        if (c >= 0 && c < cols) {
          const tid = grid[r][c];
          const ox = originX + (c - r) * HALF_W;
          const oy = originY + (r + c) * QUARTER_W;

          let img = this.imageCache.get(tid);
          const animFrames = this.animCache.get(tid);
          if (animFrames && animFrames.length > 0) {
            const isWindmill = tid.includes('windmill') || tid.includes('wind_');
            const phaseOffset = isWindmill ? Math.floor((c * 13 + r * 17 + (r + 1) * (c + 2)) / 3) : 0;
            const fIdx = (this.animFrame + phaseOffset) % animFrames.length;
            const aImg = animFrames[fIdx];
            if (aImg && aImg.complete) img = aImg;
          }
          if (img && img.complete) {
            offCtx.drawImage(img, ox, oy);
          }
        }
      }
    }

    this.renderChimneySmokes(offCtx, grid, originX, originY);
    this.renderSoaringEagle(offCtx, centerX, centerY);

    return offCanvas.toDataURL('image/png');
  }

  private drawIsometricDiamond(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    fillColor: string,
    strokeColor: string,
    lineWidth = 2
  ) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx, cy - QUARTER_W);
    ctx.lineTo(cx + HALF_W, cy);
    ctx.lineTo(cx, cy + QUARTER_W);
    ctx.lineTo(cx - HALF_W, cy);
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
    ctx.restore();
  }

  private drawMissingPlotMarker(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    target: MissingBlueprintTarget,
    indexNumber: number,
    isMasterView: boolean,
    isFocused: boolean
  ) {
    ctx.save();
    const pulse = 0.55 + Math.sin(this.animTime * 4.5) * 0.35;
    const stroke = isMasterView
      ? `rgba(34, 197, 94, ${pulse})`
      : isFocused
      ? `rgba(251, 191, 36, ${pulse})`
      : `rgba(244, 63, 94, ${pulse})`;
    const fill = isMasterView
      ? 'rgba(34, 197, 94, 0.24)'
      : isFocused
      ? 'rgba(251, 191, 36, 0.32)'
      : 'rgba(244, 63, 94, 0.22)';
    this.drawIsometricDiamond(ctx, cx, cy, fill, stroke, isFocused ? 3.5 : 2.5);

    const floatY = cy - 32 + Math.sin(this.animTime * 3.5 + indexNumber) * 4;
    const radius = isFocused ? 21 : 18;
    ctx.fillStyle = isMasterView ? '#15803d' : isFocused ? '#d97706' : '#be123c';
    ctx.beginPath();
    ctx.arc(cx, floatY, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = isFocused ? 3 : 2.2;
    ctx.stroke();

    ctx.font = 'bold 15px "UD Digi Kyokasho NP-R", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(isMasterView ? target.icon : `?${indexNumber}`, cx, floatY + 1);
    ctx.restore();
  }

  private renderLandmarkLabels(
    ctx: CanvasRenderingContext2D,
    labels: LandmarkLabel[],
    originX: number,
    originY: number,
    isJa: boolean
  ) {
    ctx.save();
    ctx.font = 'bold 11px "UD Digi Kyokasho NP-R", "BIZ UDPGothic", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const lbl of labels) {
      const cx = originX + (lbl.col - lbl.row) * HALF_W + HALF_W;
      const cy = originY + (lbl.row + lbl.col) * QUARTER_W + 18;
      const text = isJa ? `${lbl.icon} ${lbl.ja} (${lbl.en})` : `${lbl.icon} ${lbl.en}`;
      const metrics = ctx.measureText(text);
      const pillW = metrics.width + 14;
      const pillH = 20;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.beginPath();
      ctx.roundRect(cx - pillW / 2, cy - pillH / 2, pillW, pillH, 8);
      ctx.fill();
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.6)';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.fillStyle = '#f8fafc';
      ctx.fillText(text, cx, cy + 1);
    }
    ctx.restore();
  }

  private drawNavigatorGoalMarker(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    mission: NavigatorMission
  ) {
    ctx.save();
    const pulse = 0.55 + Math.sin(this.animTime * 5) * 0.35;
    this.drawIsometricDiamond(ctx, cx, cy, 'rgba(250, 204, 21, 0.28)', `rgba(250, 204, 21, ${pulse})`, 3);

    const floatY = cy - 42 + Math.sin(this.animTime * 4) * 5;
    ctx.fillStyle = '#eab308';
    ctx.beginPath();
    ctx.arc(cx, floatY, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(mission.icon || '💎', cx, floatY + 1);

    // GOAL pill above icon
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(cx - 24, floatY - 32, 48, 15, 6);
    ctx.fill();
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 9px sans-serif';
    ctx.fillText('GOAL!', cx, floatY - 24);
    ctx.restore();
  }

  private renderChimneySmokes(ctx: CanvasRenderingContext2D, grid: string[][], originX: number, originY: number) {
    const rows = grid.length;
    const cols = grid[0].length;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const tid = grid[r][c];
        const ch = CHIMNEY_LOCATIONS[tid];
        if (ch) {
          const ox = originX + (c - r) * HALF_W;
          const oy = originY + (r + c) * QUARTER_W;
          const cx = ox + ch.dx;
          const cy = oy + ch.dy;
          const maxH = ch.maxH || 24;
          const pCount = ch.count || 3;
          for (let p = 0; p < pCount; p++) {
            const prog = (this.animTime * 0.75 + (r * 3 + c * 7) * 0.2 + p / pCount) % 1.0;
            const px = cx + Math.sin(prog * 6.28) * 3.5 - prog * 5;
            const py = cy - prog * maxH;
            const rad = 1.4 + prog * 3.5;
            const alpha = (1.0 - prog) * 0.45;
            ctx.fillStyle = ch.color ? `${ch.color}${alpha})` : `rgba(241, 245, 249, ${alpha})`;
            ctx.beginPath();
            ctx.arc(px, py, rad, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }
  }

  private drawTravelerAvatar(ctx: CanvasRenderingContext2D, x: number, y: number, dir: string) {
    ctx.save();
    // Highlight current tile footprint
    this.drawIsometricDiamond(ctx, x, y, 'rgba(56, 189, 248, 0.28)', 'rgba(56, 189, 248, 0.9)', 2.5);

    // Shadow blob
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(x, y + 2, 16, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    const hop = Math.abs(Math.sin(this.animTime * 6)) * 4;

    // Render authentic pixel-art Merchant Cart sprite from isometric_tiles.json if loaded
    const cartKey = dir === 'W' || dir === 'S' ? 'cart_sw' : 'cart_se';
    const cartEntity = this.entityImgCache.get(cartKey);
    if (cartEntity && cartEntity.img.complete) {
      ctx.drawImage(cartEntity.img, x - cartEntity.w / 2, y - cartEntity.h - 4 - hop, cartEntity.w, cartEntity.h);
    }

    // Floating Traveler Badge above cart
    const pinY = y - 34 - hop;
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.arc(x, pinY, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.2;
    ctx.stroke();

    const dirArrow = dir === 'N' ? '⬆️' : dir === 'S' ? '⬇️' : dir === 'W' ? '⬅️' : '➡️';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(dirArrow, x, pinY + 1);
    ctx.restore();
  }

  private renderSoaringEagle(ctx: CanvasRenderingContext2D, centerX: number, centerY: number) {
    const eUp = this.entityImgCache.get('eagle_up');
    const eDown = this.entityImgCache.get('eagle_down');
    if (!eUp || !eDown || !eUp.img.complete || !eDown.img.complete) return;

    const eagleProg = this.animTime * 0.14;
    const ex = centerX + Math.cos(eagleProg) * 280;
    const ey = centerY - 140 + Math.sin(eagleProg) * 110;
    const isFlap = Math.sin(this.animTime * 4.5) > 0;
    const sprite = isFlap ? eDown : eUp;

    ctx.save();
    ctx.drawImage(sprite.img, ex - sprite.w / 2, ey - sprite.h / 2, sprite.w, sprite.h);
    ctx.restore();
  }
}
