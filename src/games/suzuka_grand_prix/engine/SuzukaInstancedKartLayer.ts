/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ============================================================================
 * Suzuka Instanced Kart Fleet Layer (40-Kart Capacity in ~8–12 Draw Calls)
 * ============================================================================
 * Consolidates up to 40 classroom karts into shared GPU InstancedMesh batches
 * with zero per-frame allocations, matching MicroKartBuilder's 1:87 × 130
 * silhouette, steerable spinning slicks, articulated helmet, number plates
 * (shared 512x512 5×8 atlas), Mach-diamond boost plumes, night beams, brake
 * flares, and wet-weather tire spray.
 *
 * Inactive conditional effect layers (boost flames, night beams, brake glow,
 * rain/snow spray) set `count = 0` and `visible = false` for 0 draw calls.
 * ============================================================================
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { getSharedContactShadowTexture } from '@/utils/classroom3d';

const KART_WORLD_SCALE = 130;
const DEFAULT_CAPACITY = 40;

const NUMBER_ATLAS_SIZE = 512;
const NUMBER_ATLAS_COLS = 5;
const NUMBER_ATLAS_ROWS = 8;
const NUMBER_ATLAS_CELL_W = 102;
const NUMBER_ATLAS_CELL_H = 64;

export interface InstancedKartFrameState {
  visible: boolean;
  number: number;
  colorHex: number;
  rimHex: number;
  suitHex: number;
  helmetHex: number;
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  speedMs: number;
  steerInput: number;
  driftAngle: number;
  isBoosting: boolean;
  isBraking: boolean;
  // Persistent animation state mutated in-place by syncFrame (0 GC)
  wheelSpinRad: number;
  frontSteerRad: number;
  chassisYawRad: number;
  chassisRollRad: number;
}

interface BakePartSpec {
  geo: THREE.BufferGeometry;
  pos?: [number, number, number];
  rot?: [number, number, number];
  scale?: [number, number, number];
  colorHex?: number;
  lensGlow?: number;
}

function safeRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r);
  } else {
    const rad = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    ctx.moveTo(x + rad, y);
    ctx.lineTo(x + w - rad, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
    ctx.lineTo(x + w, y + h - rad);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
    ctx.lineTo(x + rad, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
    ctx.lineTo(x, y + rad);
    ctx.quadraticCurveTo(x, y, x + rad, y);
    ctx.closePath();
  }
}

// =========================================================================
// SHARED MODULE-LEVEL CANVAS TEXTURES (tagged isSharedResource = true)
// =========================================================================
let _sharedNumberAtlasTex: THREE.CanvasTexture | null = null;
function getSharedNumberPlateAtlasTexture(): THREE.CanvasTexture {
  if (_sharedNumberAtlasTex) return _sharedNumberAtlasTex;
  if (typeof document === 'undefined') {
    const fallback = new THREE.CanvasTexture({} as HTMLCanvasElement);
    fallback.userData = { isSharedResource: true };
    _sharedNumberAtlasTex = fallback;
    return fallback;
  }

  const canvas = document.createElement('canvas');
  canvas.width = NUMBER_ATLAS_SIZE;
  canvas.height = NUMBER_ATLAS_SIZE;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, NUMBER_ATLAS_SIZE, NUMBER_ATLAS_SIZE);

    for (let idx = 0; idx < NUMBER_ATLAS_COLS * NUMBER_ATLAS_ROWS; idx++) {
      const col = idx % NUMBER_ATLAS_COLS;
      const row = Math.floor(idx / NUMBER_ATLAS_COLS);
      const x0 = col * NUMBER_ATLAS_CELL_W;
      const y0 = row * NUMBER_ATLAS_CELL_H;
      const w = NUMBER_ATLAS_CELL_W;
      const h = NUMBER_ATLAS_CELL_H;
      const numStr = String(idx + 1);

      ctx.save();
      ctx.translate(x0, y0);

      // Gloss white plate base
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      safeRoundRect(ctx, 2, 2, w - 4, h - 4, 7);
      ctx.fill();

      // Top red racing header bar
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(6, 5, w - 12, 9);

      // Crisp black racing border
      ctx.strokeStyle = '#090d16';
      ctx.lineWidth = 4;
      ctx.beginPath();
      safeRoundRect(ctx, 3.5, 3.5, w - 7, h - 7, 5);
      ctx.stroke();

      // Bold racing numeral
      ctx.fillStyle = '#090d16';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const fontSize = numStr.length === 1 ? 42 : 36;
      ctx.font = `900 ${fontSize}px "Impact", "Arial Black", "Trebuchet MS", sans-serif`;
      ctx.fillText(numStr, w * 0.5, h * 0.59);

      ctx.restore();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.userData = { isSharedResource: true };
  _sharedNumberAtlasTex = tex;
  return tex;
}

let _sharedHeadlightGroundTex: THREE.CanvasTexture | null = null;
function getSharedHeadlightGroundTexture(): THREE.CanvasTexture {
  if (_sharedHeadlightGroundTex) return _sharedHeadlightGroundTex;
  if (typeof document === 'undefined') {
    const fallback = new THREE.CanvasTexture({} as HTMLCanvasElement);
    fallback.userData = { isSharedResource: true };
    _sharedHeadlightGroundTex = fallback;
    return fallback;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 256, 256);
    for (const [startX, endX] of [
      [106, 88],
      [150, 168],
    ]) {
      ctx.save();
      const cx = (startX + endX) * 0.5;
      ctx.translate(cx, 148);
      ctx.scale(0.55, 1.0);
      const grad = ctx.createRadialGradient(0, 72, 4, 0, 10, 128);
      grad.addColorStop(0.0, 'rgba(255, 252, 235, 0.92)');
      grad.addColorStop(0.24, 'rgba(255, 244, 200, 0.62)');
      grad.addColorStop(0.55, 'rgba(254, 232, 165, 0.24)');
      grad.addColorStop(0.82, 'rgba(253, 224, 140, 0.06)');
      grad.addColorStop(1.0, 'rgba(253, 224, 140, 0.0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, 130, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.translate(128, 136);
    ctx.scale(1.0, 1.05);
    const ovalMask = ctx.createRadialGradient(0, 0, 46, 0, 0, 114);
    ovalMask.addColorStop(0.0, 'rgba(0,0,0,0)');
    ovalMask.addColorStop(0.7, 'rgba(0,0,0,0.35)');
    ovalMask.addColorStop(1.0, 'rgba(0,0,0,1)');
    ctx.fillStyle = ovalMask;
    ctx.fillRect(-128, -140, 256, 280);
    ctx.restore();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.userData = { isSharedResource: true };
  _sharedHeadlightGroundTex = tex;
  return tex;
}

let _sharedTailGlowTex: THREE.CanvasTexture | null = null;
function getSharedTailGlowTexture(): THREE.CanvasTexture {
  if (_sharedTailGlowTex) return _sharedTailGlowTex;
  if (typeof document === 'undefined') {
    const fallback = new THREE.CanvasTexture({} as HTMLCanvasElement);
    fallback.userData = { isSharedResource: true };
    _sharedTailGlowTex = fallback;
    return fallback;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
    grad.addColorStop(0.0, 'rgba(255, 16, 40, 0.92)');
    grad.addColorStop(0.32, 'rgba(255, 0, 24, 0.60)');
    grad.addColorStop(0.68, 'rgba(220, 0, 18, 0.22)');
    grad.addColorStop(1.0, 'rgba(180, 0, 12, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.userData = { isSharedResource: true };
  _sharedTailGlowTex = tex;
  return tex;
}

// =========================================================================
// GEOMETRY BAKING HELPER (bakes 1:87 coordinates directly to 130x world m)
// =========================================================================
function mergeScaledParts(
  specs: BakePartSpec[],
  options: { keepUv?: boolean; vertexColors?: boolean; lensGlowAttr?: boolean } = {}
): THREE.BufferGeometry {
  const keepUv = options.keepUv === true;
  const useVCol = options.vertexColors === true;
  const useGlow = options.lensGlowAttr === true;

  const mat4 = new THREE.Matrix4();
  const pos = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const euler = new THREE.Euler();
  const scl = new THREE.Vector3();
  const col = new THREE.Color();

  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < specs.length; i++) {
    const spec = specs[i];
    const g = spec.geo.index ? spec.geo.toNonIndexed() : spec.geo.clone();

    if (spec.pos) {
      pos.set(spec.pos[0] * KART_WORLD_SCALE, spec.pos[1] * KART_WORLD_SCALE, spec.pos[2] * KART_WORLD_SCALE);
    } else {
      pos.set(0, 0, 0);
    }
    if (spec.rot) {
      euler.set(spec.rot[0], spec.rot[1], spec.rot[2], 'XYZ');
      quat.setFromEuler(euler);
    } else {
      quat.identity();
    }
    if (spec.scale) {
      scl.set(
        spec.scale[0] * KART_WORLD_SCALE,
        spec.scale[1] * KART_WORLD_SCALE,
        spec.scale[2] * KART_WORLD_SCALE
      );
    } else {
      scl.set(KART_WORLD_SCALE, KART_WORLD_SCALE, KART_WORLD_SCALE);
    }
    mat4.compose(pos, quat, scl);
    g.applyMatrix4(mat4);

    if (!g.attributes.normal) {
      g.computeVertexNormals();
    }
    if (!keepUv && g.attributes.uv) {
      g.deleteAttribute('uv');
    }

    const vCount = g.attributes.position.count;
    if (useVCol) {
      col.setHex(spec.colorHex ?? 0xffffff);
      const colors = new Float32Array(vCount * 3);
      for (let v = 0; v < vCount; v++) {
        colors[v * 3 + 0] = col.r;
        colors[v * 3 + 1] = col.g;
        colors[v * 3 + 2] = col.b;
      }
      g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    }
    if (useGlow) {
      const glowVal = spec.lensGlow ?? 0.0;
      const glows = new Float32Array(vCount);
      if (glowVal !== 0) glows.fill(glowVal);
      g.setAttribute('aLensGlow', new THREE.BufferAttribute(glows, 1));
    }
    parts.push(g);
  }

  const merged = mergeGeometries(parts, false);
  for (let i = 0; i < parts.length; i++) {
    parts[i].dispose();
  }
  if (!merged) {
    throw new Error('[SuzukaInstancedKartLayer] Failed to merge kart sub-geometries.');
  }
  return merged;
}

function getAtlasRectForNumber(racerNumber: number, outRect: Float32Array, offset: number): void {
  const safeNum = Number.isFinite(racerNumber) ? Math.round(racerNumber) : 1;
  const slot = safeNum <= 0 ? 0 : (safeNum - 1) % (NUMBER_ATLAS_COLS * NUMBER_ATLAS_ROWS);
  const col = slot % NUMBER_ATLAS_COLS;
  const row = Math.floor(slot / NUMBER_ATLAS_COLS);
  const pad = 2;

  const uOff = (col * NUMBER_ATLAS_CELL_W + pad) / NUMBER_ATLAS_SIZE;
  const uScale = (NUMBER_ATLAS_CELL_W - pad * 2) / NUMBER_ATLAS_SIZE;
  const vOff = 1.0 - ((row + 1) * NUMBER_ATLAS_CELL_H - pad) / NUMBER_ATLAS_SIZE;
  const vScale = (NUMBER_ATLAS_CELL_H - pad * 2) / NUMBER_ATLAS_SIZE;

  outRect[offset + 0] = uOff;
  outRect[offset + 1] = vOff;
  outRect[offset + 2] = uScale;
  outRect[offset + 3] = vScale;
}

// =========================================================================
// SUZUKA INSTANCED KART LAYER CLASS
// =========================================================================
export class SuzukaInstancedKartLayer {
  public readonly root: THREE.Group;
  public readonly capacity: number;

  // Core always-active kart layers (8 draw calls total for up to 40 karts)
  private readonly fairingInst: THREE.InstancedMesh;
  private readonly carbonInst: THREE.InstancedMesh;
  private readonly suitInst: THREE.InstancedMesh;
  private readonly helmetInst: THREE.InstancedMesh;
  private readonly chromeTrimInst: THREE.InstancedMesh;
  private readonly wheelsInst: THREE.InstancedMesh;
  private readonly contactShadowInst: THREE.InstancedMesh;
  private readonly numberPlateInst: THREE.InstancedMesh;

  // Conditional pooled FX layers (0 draw calls when count === 0 / visible === false)
  private readonly boostFlameInst: THREE.InstancedMesh;
  private readonly headlightBeamInst: THREE.InstancedMesh;
  private readonly taillightGlowInst: THREE.InstancedMesh;
  private readonly tireSprayInst: THREE.InstancedMesh;

  // Instanced attributes & shader uniforms
  private readonly plateRectAttr: THREE.InstancedBufferAttribute;
  private readonly flamePhaseAttr: THREE.InstancedBufferAttribute;
  private readonly flameIntensityAttr: THREE.InstancedBufferAttribute;
  private readonly sprayIntensityAttr: THREE.InstancedBufferAttribute;
  private readonly sprayPhaseAttr: THREE.InstancedBufferAttribute;

  private readonly boostUniforms: { uTime: { value: number } };
  private readonly sprayUniforms: { uTime: { value: number }; uIsSnow: { value: number } };
  private readonly headlightBeamMat: THREE.MeshBasicMaterial;
  private readonly contactShadowMat: THREE.MeshBasicMaterial;

  // Dirty-tracking caches for static per-slot livery & plate atlas indices
  private readonly lastFairingHex: Int32Array;
  private readonly lastSuitHex: Int32Array;
  private readonly lastHelmetHex: Int32Array;
  private readonly lastRimHex: Int32Array;
  private readonly lastPlateNum: Int32Array;

  // Hoisted zero-allocation scratch math objects
  private readonly _unitScale = new THREE.Vector3(1, 1, 1);
  private readonly _rearWheelScale = new THREE.Vector3(1.3333, 1.1842, 1.1842);
  private readonly _rootMat4 = new THREE.Matrix4();
  private readonly _chassisLocalMat4 = new THREE.Matrix4();
  private readonly _chassisWorldMat4 = new THREE.Matrix4();
  private readonly _subLocalMat4 = new THREE.Matrix4();
  private readonly _subWorldMat4 = new THREE.Matrix4();
  private readonly _scratchPos = new THREE.Vector3();
  private readonly _scratchScale = new THREE.Vector3();
  private readonly _scratchQuat = new THREE.Quaternion();
  private readonly _scratchQuat2 = new THREE.Quaternion();
  private readonly _scratchEuler = new THREE.Euler(0, 0, 0, 'YXZ');
  private readonly _scratchColor = new THREE.Color();
  private readonly _xAxis = new THREE.Vector3(1, 0, 0);
  private readonly _yAxis = new THREE.Vector3(0, 1, 0);

  private readonly _disposables: {
    geometries: THREE.BufferGeometry[];
    materials: THREE.Material[];
    meshes: THREE.InstancedMesh[];
  };

  constructor(capacity: number = DEFAULT_CAPACITY) {
    this.capacity = capacity;
    this.root = new THREE.Group();
    this.root.name = 'SuzukaInstancedKartFleet';

    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];
    const meshes: THREE.InstancedMesh[] = [];
    this._disposables = { geometries, materials, meshes };

    // -----------------------------------------------------------------------
    // 1. Fairing / Chassis Body (nose cone + side pods)
    // -----------------------------------------------------------------------
    const noseCone = new THREE.BoxGeometry(0.0086, 0.0021, 0.0044);
    const sidePod = new THREE.BoxGeometry(0.0024, 0.0024, 0.0076);
    const fairingGeo = mergeScaledParts([
      { geo: noseCone, pos: [0, 0.0023, 0.0068], rot: [0.22, 0, 0] },
      { geo: sidePod, pos: [-0.0044, 0.0024, -0.0004] },
      { geo: sidePod, pos: [0.0044, 0.0024, -0.0004] },
    ]);
    noseCone.dispose();
    sidePod.dispose();
    const fairingMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.22,
      metalness: 0.35,
    });
    this.fairingInst = this.makeInstanced(fairingGeo, fairingMat, capacity, true);

    // -----------------------------------------------------------------------
    // 2. Carbon Assembly (floor pan + rear wing + bucket seat + steering wheel)
    // -----------------------------------------------------------------------
    const floorPan = new THREE.BoxGeometry(0.0082, 0.0009, 0.0155);
    const rearWing = new THREE.BoxGeometry(0.0096, 0.0007, 0.0024);
    const seat = new THREE.BoxGeometry(0.0042, 0.0044, 0.0038);
    const steeringWheel = new THREE.TorusGeometry(0.0014, 0.00032, 8, 16);
    const carbonGeo = mergeScaledParts([
      { geo: floorPan, pos: [0, 0.0014, 0] },
      { geo: rearWing, pos: [0, 0.0068, -0.0076], rot: [-0.18, 0, 0] },
      { geo: seat, pos: [0, 0.0036, -0.0015], rot: [-0.22, 0, 0] },
      { geo: steeringWheel, pos: [0, 0.0054, 0.0028], rot: [-0.55, 0, 0] },
    ]);
    floorPan.dispose();
    rearWing.dispose();
    seat.dispose();
    steeringWheel.dispose();
    const carbonMat = new THREE.MeshStandardMaterial({
      color: 0x181b22,
      roughness: 0.42,
      metalness: 0.45,
    });
    this.carbonInst = this.makeInstanced(carbonGeo, carbonMat, capacity, false);

    // -----------------------------------------------------------------------
    // 3. Driver Suit Torso
    // -----------------------------------------------------------------------
    const torso = new THREE.BoxGeometry(0.0036, 0.0038, 0.0028);
    const suitGeo = mergeScaledParts([
      { geo: torso, pos: [0, 0.0048, -0.0008], rot: [0.14, 0, 0] },
    ]);
    torso.dispose();
    const suitMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.35,
      metalness: 0.08,
    });
    this.suitInst = this.makeInstanced(suitGeo, suitMat, capacity, true);

    // -----------------------------------------------------------------------
    // 4. Articulated Driver Helmet + Dark Glossy Visor (tilts into corners)
    // -----------------------------------------------------------------------
    const helmetShell = new THREE.SphereGeometry(0.0022, 16, 14);
    const visor = new THREE.SphereGeometry(0.00225, 14, 10, -0.9, 1.8, 1.05, 0.75);
    const helmetGeo = mergeScaledParts(
      [
        { geo: helmetShell, scale: [0.95, 1.0, 1.08], colorHex: 0xffffff },
        { geo: visor, rot: [0, Math.PI / 2, 0], colorHex: 0x121826 },
      ],
      { vertexColors: true }
    );
    helmetShell.dispose();
    visor.dispose();
    const helmetMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: true,
      roughness: 0.14,
      metalness: 0.25,
    });
    this.helmetInst = this.makeInstanced(helmetGeo, helmetMat, capacity, true);

    // -----------------------------------------------------------------------
    // 5. Chrome Engine/Exhaust + Emissive Headlight/Taillight Lenses (1 draw call)
    // -----------------------------------------------------------------------
    const engineBlock = new THREE.BoxGeometry(0.0034, 0.0036, 0.0042);
    const pipe = new THREE.CylinderGeometry(0.00056, 0.00062, 0.0032, 12);
    const headlightLens = new THREE.SphereGeometry(0.00065, 10, 8);
    const taillightLens = new THREE.BoxGeometry(0.002, 0.00072, 0.00048);
    const chromeTrimGeo = mergeScaledParts(
      [
        { geo: engineBlock, pos: [0.0022, 0.0036, -0.0048], colorHex: 0xdce4f0, lensGlow: 0.0 },
        { geo: pipe, pos: [-0.00108, 0.00215, -0.0076], rot: [Math.PI / 2 + 0.12, 0, 0], colorHex: 0xdce4f0, lensGlow: 0.0 },
        { geo: pipe, pos: [0.00108, 0.00215, -0.0076], rot: [Math.PI / 2 + 0.12, 0, 0], colorHex: 0xdce4f0, lensGlow: 0.0 },
        { geo: headlightLens, pos: [-0.0026, 0.00225, 0.00875], scale: [1.15, 0.78, 0.65], colorHex: 0xfff4d4, lensGlow: 1.5 },
        { geo: headlightLens, pos: [0.0026, 0.00225, 0.00875], scale: [1.15, 0.78, 0.65], colorHex: 0xfff4d4, lensGlow: 1.5 },
        { geo: taillightLens, pos: [-0.0032, 0.00275, -0.00875], colorHex: 0xff0a24, lensGlow: 1.4 },
        { geo: taillightLens, pos: [0.0032, 0.00275, -0.00875], colorHex: 0xff0a24, lensGlow: 1.4 },
      ],
      { vertexColors: true, lensGlowAttr: true }
    );
    engineBlock.dispose();
    pipe.dispose();
    headlightLens.dispose();
    taillightLens.dispose();

    const chromeTrimMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: true,
      roughness: 0.16,
      metalness: 0.78,
    });
    chromeTrimMat.customProgramCacheKey = () => 'suzuka-inst-kart-chrome-lenses';
    chromeTrimMat.onBeforeCompile = (shader) => {
      shader.vertexShader =
        `attribute float aLensGlow;\nvarying float vLensGlow;\n` +
        shader.vertexShader.replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>\nvLensGlow = aLensGlow;`
        );
      shader.fragmentShader =
        `varying float vLensGlow;\n` +
        shader.fragmentShader.replace(
          '#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * vLensGlow;`
        );
    };
    this.chromeTrimInst = this.makeInstanced(chromeTrimGeo, chromeTrimMat, capacity, false);

    // -----------------------------------------------------------------------
    // 6. All 4 Steerable & Spinning Slick Wheels (40 × 4 = 160 instances)
    // -----------------------------------------------------------------------
    const tireCyl = new THREE.CylinderGeometry(0.0019, 0.0019, 0.0018, 16);
    tireCyl.rotateZ(Math.PI / 2);
    const tireShoulder = new THREE.TorusGeometry(0.00148, 0.00042, 8, 16);
    tireShoulder.rotateY(Math.PI / 2);
    const rimCyl = new THREE.CylinderGeometry(0.0019 * 0.62, 0.0019 * 0.62, 0.0018 * 1.05, 12);
    rimCyl.rotateZ(Math.PI / 2);
    const hubCyl = new THREE.CylinderGeometry(0.00048, 0.00048, 0.0021, 8);
    hubCyl.rotateZ(Math.PI / 2);

    const wheelGeo = mergeScaledParts(
      [
        { geo: tireCyl, colorHex: 0x16181e },
        { geo: tireShoulder, pos: [-0.00065, 0, 0], colorHex: 0x16181e },
        { geo: tireShoulder, pos: [0.00065, 0, 0], colorHex: 0x16181e },
        { geo: rimCyl, colorHex: 0xffffff },
        { geo: hubCyl, colorHex: 0xc8d2e0 },
      ],
      { vertexColors: true }
    );
    tireCyl.dispose();
    tireShoulder.dispose();
    rimCyl.dispose();
    hubCyl.dispose();

    const wheelMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: true,
      roughness: 0.64,
      metalness: 0.3,
    });
    this.wheelsInst = this.makeInstanced(wheelGeo, wheelMat, capacity * 4, true);

    // -----------------------------------------------------------------------
    // 7. Ground Contact Shadows (using shared classroom3d contact shadow texture)
    // -----------------------------------------------------------------------
    const shadowQuad = new THREE.PlaneGeometry(0.0175, 0.024);
    const shadowGeo = mergeScaledParts(
      [{ geo: shadowQuad, pos: [0, -0.00163, -0.0002], rot: [-Math.PI / 2, 0, 0] }],
      { keepUv: true }
    );
    shadowQuad.dispose();
    this.contactShadowMat = new THREE.MeshBasicMaterial({
      map: getSharedContactShadowTexture(),
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -8,
      polygonOffsetUnits: -8,
    });
    this.contactShadowInst = this.makeInstanced(shadowGeo, this.contactShadowMat, capacity, false);

    // -----------------------------------------------------------------------
    // 8. Front + Rear Number Plates (1 shared 512×512 5×8 atlas via aAtlasRect)
    // -----------------------------------------------------------------------
    const frontPlate = new THREE.PlaneGeometry(0.0052, 0.0032);
    const rearPlate = new THREE.PlaneGeometry(0.0044, 0.0018);
    const numberPlateGeo = mergeScaledParts(
      [
        { geo: frontPlate, pos: [0, 0.00345, 0.0066], rot: [-Math.PI / 2 + 0.22, 0, 0] },
        { geo: rearPlate, pos: [0, 0.0068, -0.00885], rot: [0, Math.PI, 0] },
      ],
      { keepUv: true }
    );
    frontPlate.dispose();
    rearPlate.dispose();

    const plateRectArray = new Float32Array(capacity * 4);
    for (let i = 0; i < capacity; i++) {
      getAtlasRectForNumber(i + 1, plateRectArray, i * 4);
    }
    this.plateRectAttr = new THREE.InstancedBufferAttribute(plateRectArray, 4);
    this.plateRectAttr.setUsage(THREE.DynamicDrawUsage);
    numberPlateGeo.setAttribute('aAtlasRect', this.plateRectAttr);

    const numberPlateMat = new THREE.MeshStandardMaterial({
      map: getSharedNumberPlateAtlasTexture(),
      roughness: 0.22,
      metalness: 0.08,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    numberPlateMat.customProgramCacheKey = () => 'suzuka-inst-number-plate-atlas';
    numberPlateMat.onBeforeCompile = (shader) => {
      shader.vertexShader =
        `attribute vec4 aAtlasRect;\n` +
        shader.vertexShader.replace(
          '#include <uv_vertex>',
          `#include <uv_vertex>
          #ifdef USE_MAP
            vMapUv = aAtlasRect.xy + vMapUv * aAtlasRect.zw;
          #endif`
        );
    };
    this.numberPlateInst = this.makeInstanced(numberPlateGeo, numberPlateMat, capacity, false);

    // -----------------------------------------------------------------------
    // 9. Pooled Mach-Diamond Exhaust Boost Flames (0 draw calls when inactive)
    // -----------------------------------------------------------------------
    const outerCone = new THREE.CylinderGeometry(0.00072, 0.00022, 0.0052, 12, 6, true);
    outerCone.rotateX(Math.PI / 2);
    outerCone.translate(0, 0, -0.0026);
    const innerCore = new THREE.CylinderGeometry(0.00046, 0.00012, 0.004, 10, 4, true);
    innerCore.rotateX(Math.PI / 2);
    innerCore.translate(0, 0, -0.002);
    const finA = new THREE.PlaneGeometry(0.00145, 0.005, 1, 4);
    finA.rotateX(Math.PI / 2);
    finA.rotateZ(0.66);
    finA.translate(0, 0, -0.0025);
    const finB = new THREE.PlaneGeometry(0.00145, 0.005, 1, 4);
    finB.rotateX(Math.PI / 2);
    finB.rotateZ(-0.66);
    finB.translate(0, 0, -0.0025);
    const nozzleDisc = new THREE.CircleGeometry(0.00074, 12);
    nozzleDisc.rotateY(Math.PI);
    nozzleDisc.translate(0, 0, -0.00025);

    const boostFlameGeo = mergeScaledParts([
      { geo: outerCone },
      { geo: innerCore },
      { geo: finA },
      { geo: finB },
      { geo: nozzleDisc },
    ]);
    outerCone.dispose();
    innerCore.dispose();
    finA.dispose();
    finB.dispose();
    nozzleDisc.dispose();

    const maxFlames = capacity * 2;
    this.flamePhaseAttr = new THREE.InstancedBufferAttribute(new Float32Array(maxFlames), 1);
    this.flamePhaseAttr.setUsage(THREE.DynamicDrawUsage);
    this.flameIntensityAttr = new THREE.InstancedBufferAttribute(new Float32Array(maxFlames), 1);
    this.flameIntensityAttr.setUsage(THREE.DynamicDrawUsage);
    boostFlameGeo.setAttribute('aFlamePhase', this.flamePhaseAttr);
    boostFlameGeo.setAttribute('aFlameIntensity', this.flameIntensityAttr);

    this.boostUniforms = { uTime: { value: 0.0 } };
    const boostFlameMat = new THREE.ShaderMaterial({
      uniforms: this.boostUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      toneMapped: false,
      vertexShader: /* glsl */ `
        attribute float aFlamePhase;
        attribute float aFlameIntensity;
        uniform float uTime;
        varying float vPlumeU;
        varying float vRadialR;
        varying vec3 vLocalPos;
        varying vec3 vViewNormal;
        varying vec3 vViewPos;
        varying float vPhase;
        varying float vIntensity;

        void main() {
          float u = clamp(-position.z / 0.676, 0.0, 1.0);
          vPlumeU = u;
          vRadialR = clamp(length(position.xy) / 0.1014, 0.0, 1.0);
          vLocalPos = position;
          vPhase = aFlamePhase;
          vIntensity = aFlameIntensity;

          float flutter = u * u * 0.0286;
          vec3 displaced = position;
          displaced.x += sin(u * 18.0 - uTime * 48.0 + aFlamePhase) * flutter;
          displaced.y += cos(u * 15.0 - uTime * 42.0 + aFlamePhase * 1.7) * flutter * 0.85;

          vec4 mvPos = modelViewMatrix * instanceMatrix * vec4(displaced, 1.0);
          vViewPos = -mvPos.xyz;
          vViewNormal = normalize(normalMatrix * mat3(instanceMatrix) * normal);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        varying float vPlumeU;
        varying float vRadialR;
        varying vec3 vLocalPos;
        varying vec3 vViewNormal;
        varying vec3 vViewPos;
        varying float vPhase;
        varying float vIntensity;

        void main() {
          float u = clamp(vPlumeU, 0.0, 1.0);
          vec3 viewDir = normalize(vViewPos);
          float ndotv = abs(dot(normalize(vViewNormal), viewDir));
          float viewWeight = 0.58 + 0.42 * sqrt(clamp(ndotv, 0.0, 1.0));
          float radialCore = exp(-vRadialR * vRadialR * (2.1 + u * 2.4));
          float radialMask = radialCore * viewWeight;

          float angle = atan(vLocalPos.y, vLocalPos.x);
          float turb1 = sin(u * 22.0 - uTime * 56.0 + angle * 2.0 + vPhase);
          float turb2 = cos(u * 35.0 - uTime * 74.0 - angle * 3.0 + vPhase * 1.3);
          float turbulence = 0.82 + 0.18 * (turb1 * 0.6 + turb2 * 0.4);

          float machWave = max(0.0, cos(u * 15.5 - uTime * 34.0 + vPhase * 0.5));
          float machDiamond = pow(machWave, 3.2) * smoothstep(0.85, 0.04, u) * exp(-vRadialR * vRadialR * 3.6);

          float tipCut = clamp(1.0 - u + (turb1 * 0.11 + turb2 * 0.07) * u, 0.0, 1.0);
          float axialEnv = (0.35 + 0.65 * smoothstep(0.0, 0.08, u)) * pow(tipCut, 1.45);

          vec3 butaneBlue = vec3(0.32, 0.76, 1.35);
          vec3 whiteHot = vec3(1.55, 1.38, 0.96);
          vec3 goldenAmber = vec3(1.45, 0.68, 0.12);
          vec3 fieryCrimson = vec3(1.25, 0.22, 0.02);

          vec3 baseCol = mix(butaneBlue, goldenAmber, smoothstep(0.04, 0.34, u));
          baseCol = mix(baseCol, fieryCrimson, smoothstep(0.38, 0.86, u));
          float coreHotness = clamp(radialCore * (1.0 - u * 0.52) + machDiamond * 0.90, 0.0, 1.0);
          vec3 flameRgb = mix(baseCol, whiteHot, pow(coreHotness, 1.35));

          float alpha = clamp(axialEnv * radialMask * turbulence * vIntensity * 1.45, 0.0, 1.0);
          if (alpha < 0.01) discard;
          gl_FragColor = vec4(flameRgb * alpha * 1.35, alpha);
        }
      `,
    });
    this.boostFlameInst = this.makeInstanced(boostFlameGeo, boostFlameMat, maxFlames, false);
    this.boostFlameInst.count = 0;
    this.boostFlameInst.visible = false;

    // -----------------------------------------------------------------------
    // 10A. Night Headlight Ground Beams (0 draw calls in daylight)
    // -----------------------------------------------------------------------
    const headBeamQuad = new THREE.PlaneGeometry(0.024, 0.056);
    const headlightBeamGeo = mergeScaledParts(
      [{ geo: headBeamQuad, pos: [0, -0.00161, 0.036], rot: [-Math.PI / 2, 0, 0] }],
      { keepUv: true }
    );
    headBeamQuad.dispose();
    this.headlightBeamMat = new THREE.MeshBasicMaterial({
      map: getSharedHeadlightGroundTexture(),
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
      polygonOffset: true,
      polygonOffsetFactor: -5,
      polygonOffsetUnits: -5,
    });
    this.headlightBeamInst = this.makeInstanced(headlightBeamGeo, this.headlightBeamMat, capacity, false);
    this.headlightBeamInst.count = 0;
    this.headlightBeamInst.visible = false;

    // -----------------------------------------------------------------------
    // 10B. Taillight / Brake Glow Halos (0 draw calls when daylight & not braking)
    // -----------------------------------------------------------------------
    const tailQuad = new THREE.PlaneGeometry(0.0044, 0.0028);
    const taillightGlowGeo = mergeScaledParts(
      [
        { geo: tailQuad, pos: [-0.0032, 0.00275, -0.00908], rot: [0, Math.PI, 0] },
        { geo: tailQuad, pos: [0.0032, 0.00275, -0.00908], rot: [0, Math.PI, 0] },
      ],
      { keepUv: true }
    );
    tailQuad.dispose();
    const taillightGlowMat = new THREE.MeshBasicMaterial({
      map: getSharedTailGlowTexture(),
      color: 0xffffff,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
      side: THREE.DoubleSide,
    });
    this.taillightGlowInst = this.makeInstanced(taillightGlowGeo, taillightGlowMat, capacity, true);
    this.taillightGlowInst.count = 0;
    this.taillightGlowInst.visible = false;

    // -----------------------------------------------------------------------
    // 11. Pooled Wet-Weather Tire Spray Plumes (0 draw calls when dry)
    // -----------------------------------------------------------------------
    const sprayCone = new THREE.CylinderGeometry(0.0008, 0.0044, 0.022, 8, 4, true);
    sprayCone.translate(0, -0.011, 0);
    sprayCone.rotateX(Math.PI / 2);
    const tireSprayGeo = mergeScaledParts([{ geo: sprayCone }], { keepUv: true });
    sprayCone.dispose();

    const maxSprays = capacity * 2;
    this.sprayIntensityAttr = new THREE.InstancedBufferAttribute(new Float32Array(maxSprays), 1);
    this.sprayIntensityAttr.setUsage(THREE.DynamicDrawUsage);
    this.sprayPhaseAttr = new THREE.InstancedBufferAttribute(new Float32Array(maxSprays), 1);
    this.sprayPhaseAttr.setUsage(THREE.DynamicDrawUsage);
    tireSprayGeo.setAttribute('aSprayIntensity', this.sprayIntensityAttr);
    tireSprayGeo.setAttribute('aSprayPhase', this.sprayPhaseAttr);

    this.sprayUniforms = {
      uTime: { value: 0.0 },
      uIsSnow: { value: 0.0 },
    };
    const tireSprayMat = new THREE.ShaderMaterial({
      uniforms: this.sprayUniforms,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      vertexShader: /* glsl */ `
        attribute float aSprayIntensity;
        attribute float aSprayPhase;
        uniform float uTime;
        varying float vAlong;
        varying vec2 vUv;
        varying float vIntensity;
        varying float vPhase;

        void main() {
          vUv = uv;
          vIntensity = aSprayIntensity;
          vPhase = aSprayPhase;
          float u = clamp(-position.z / 2.86, 0.0, 1.0);
          vAlong = u;
          vec3 displaced = position;
          displaced.y += u * u * 0.676 + abs(sin(u * 10.0 - uTime * 22.0 + aSprayPhase)) * u * 0.156;
          displaced.x += sin(u * 14.0 - uTime * 26.0 + aSprayPhase) * u * 0.182;
          gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(displaced, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform float uIsSnow;
        varying float vAlong;
        varying vec2 vUv;
        varying float vIntensity;
        varying float vPhase;

        void main() {
          if (vIntensity <= 0.01) discard;
          float u = clamp(vAlong, 0.0, 1.0);
          float w1 = sin(u * 18.0 - uTime * 28.0 + vUv.x * 12.56 + vPhase);
          float w2 = cos(u * 29.0 - uTime * 36.0 - vUv.x * 18.84 - vPhase);
          float puff = 0.62 + 0.38 * (w1 * 0.6 + w2 * 0.4);
          float axialFade = smoothstep(0.0, 0.14, u) * pow(1.0 - u, 1.35);
          vec3 rainCol = vec3(0.82, 0.91, 1.0);
          vec3 snowCol = vec3(0.97, 0.99, 1.0);
          vec3 col = mix(rainCol, snowCol, uIsSnow);
          float alpha = clamp(axialFade * puff * vIntensity * mix(0.52, 0.78, uIsSnow), 0.0, 0.82);
          if (alpha < 0.015) discard;
          gl_FragColor = vec4(col, alpha);
        }
      `,
    });
    this.tireSprayInst = this.makeInstanced(tireSprayGeo, tireSprayMat, maxSprays, false);
    this.tireSprayInst.count = 0;
    this.tireSprayInst.visible = false;

    // Initialize dirty-tracking arrays with sentinel -1 so first frame populates colors/rects
    this.lastFairingHex = new Int32Array(capacity).fill(-1);
    this.lastSuitHex = new Int32Array(capacity).fill(-1);
    this.lastHelmetHex = new Int32Array(capacity).fill(-1);
    this.lastRimHex = new Int32Array(capacity).fill(-1);
    this.lastPlateNum = new Int32Array(capacity).fill(-1);
  }

  private makeInstanced(
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    count: number,
    initInstanceColor: boolean
  ): THREE.InstancedMesh {
    const inst = new THREE.InstancedMesh(geo, mat, count);
    inst.count = 0;
    inst.frustumCulled = false;
    inst.castShadow = false;
    inst.receiveShadow = false;
    inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    if (initInstanceColor) {
      this._scratchColor.setHex(0xffffff);
      for (let i = 0; i < count; i++) {
        inst.setColorAt(i, this._scratchColor);
      }
      if (inst.instanceColor) {
        inst.instanceColor.setUsage(THREE.DynamicDrawUsage);
        inst.instanceColor.needsUpdate = true;
      }
    }

    this._disposables.geometries.push(geo);
    this._disposables.materials.push(mat);
    this._disposables.meshes.push(inst);
    this.root.add(inst);
    return inst;
  }

  /**
   * Synchronizes all kart transforms, wheels, articulated helmets, number plates,
   * boost flames, night headlight/taillight glow, and wet tire spray in 0 allocations.
   */
  public syncFrame(
    karts: readonly InstancedKartFrameState[],
    dt: number,
    elapsedSec: number,
    isNight: boolean | number,
    isWet: boolean | 'NONE' | 'RAIN' | 'SNOW',
    activeCount?: number
  ): void {
    const total = Math.min(this.capacity, activeCount ?? karts.length);
    const nightFactor =
      typeof isNight === 'number'
        ? Math.max(0, Math.min(1, isNight))
        : isNight
        ? 1.0
        : 0.0;
    const lightsOn = nightFactor > 0.02;

    const sprayMode: 'NONE' | 'RAIN' | 'SNOW' =
      typeof isWet === 'string' ? isWet : isWet ? 'RAIN' : 'NONE';
    const wetActive = sprayMode !== 'NONE';

    let visibleKarts = 0;
    let wheelIdx = 0;
    let boostIdx = 0;
    let headBeamIdx = 0;
    let tailGlowIdx = 0;
    let sprayIdx = 0;

    let fairingColorsDirty = false;
    let suitColorsDirty = false;
    let helmetColorsDirty = false;
    let rimColorsDirty = false;
    let platesDirty = false;

    const plateRectArr = this.plateRectAttr.array as Float32Array;
    const flamePhaseArr = this.flamePhaseAttr.array as Float32Array;
    const flameIntArr = this.flameIntensityAttr.array as Float32Array;
    const sprayIntArr = this.sprayIntensityAttr.array as Float32Array;
    const sprayPhaseArr = this.sprayPhaseAttr.array as Float32Array;

    const lerp14 = Math.min(1, dt * 14);
    const lerp12 = Math.min(1, dt * 12);
    const lerp16 = Math.min(1, dt * 16);

    for (let i = 0; i < total; i++) {
      const k = karts[i];
      if (!k || !k.visible) continue;

      const slot = visibleKarts++;

      // 1. Persistent wheel spin, front steer & chassis suspension dynamics
      k.wheelSpinRad += (k.speedMs / 0.26) * dt;
      const targetSteerRad = THREE.MathUtils.clamp(
        -k.steerInput * 0.45 - k.driftAngle * 0.35,
        -0.52,
        0.52
      );
      k.frontSteerRad += (targetSteerRad - k.frontSteerRad) * lerp16;
      k.chassisYawRad += (k.driftAngle - k.chassisYawRad) * lerp14;
      k.chassisRollRad += (k.steerInput * 0.09 - k.chassisRollRad) * lerp12;

      // 2. Kart Root World Matrix (flat on tarmac — used by contact shadow & headlight ground beam)
      this._rootMat4.compose(k.position, k.quaternion, this._unitScale);
      this.contactShadowInst.setMatrixAt(slot, this._rootMat4);

      if (lightsOn) {
        this.headlightBeamInst.setMatrixAt(headBeamIdx++, this._rootMat4);
      }

      // 3. Chassis World Matrix (root * local drift yaw + suspension roll + idle bob)
      const idleBob = Math.abs(k.speedMs) > 0.2 ? Math.sin(elapsedSec * 60.0 + i * 1.7) * 0.023 : 0.0;
      this._scratchPos.set(0, idleBob, 0);
      this._scratchEuler.set(0, k.chassisYawRad, k.chassisRollRad, 'YXZ');
      this._scratchQuat.setFromEuler(this._scratchEuler);
      this._chassisLocalMat4.compose(this._scratchPos, this._scratchQuat, this._unitScale);
      this._chassisWorldMat4.multiplyMatrices(this._rootMat4, this._chassisLocalMat4);

      this.fairingInst.setMatrixAt(slot, this._chassisWorldMat4);
      this.carbonInst.setMatrixAt(slot, this._chassisWorldMat4);
      this.suitInst.setMatrixAt(slot, this._chassisWorldMat4);
      this.chromeTrimInst.setMatrixAt(slot, this._chassisWorldMat4);
      this.numberPlateInst.setMatrixAt(slot, this._chassisWorldMat4);

      // Dirty-checked per-slot livery colors & number plate atlas rect
      if (this.lastFairingHex[slot] !== k.colorHex) {
        this.lastFairingHex[slot] = k.colorHex;
        this.fairingInst.setColorAt(slot, this._scratchColor.setHex(k.colorHex));
        fairingColorsDirty = true;
      }
      if (this.lastSuitHex[slot] !== k.suitHex) {
        this.lastSuitHex[slot] = k.suitHex;
        this.suitInst.setColorAt(slot, this._scratchColor.setHex(k.suitHex));
        suitColorsDirty = true;
      }
      if (this.lastHelmetHex[slot] !== k.helmetHex) {
        this.lastHelmetHex[slot] = k.helmetHex;
        this.helmetInst.setColorAt(slot, this._scratchColor.setHex(k.helmetHex));
        helmetColorsDirty = true;
      }
      if (this.lastPlateNum[slot] !== k.number) {
        this.lastPlateNum[slot] = k.number;
        getAtlasRectForNumber(k.number, plateRectArr, slot * 4);
        platesDirty = true;
      }

      // 4. Articulated Driver Helmet (head pivot at [0, 0.0078*S, -0.0004*S], leans into turns)
      this._scratchPos.set(0, 0.0078 * KART_WORLD_SCALE, -0.0004 * KART_WORLD_SCALE);
      this._scratchEuler.set(0, targetSteerRad * 0.55, -targetSteerRad * 0.45, 'YXZ');
      this._scratchQuat.setFromEuler(this._scratchEuler);
      this._subLocalMat4.compose(this._scratchPos, this._scratchQuat, this._unitScale);
      this._subWorldMat4.multiplyMatrices(this._chassisWorldMat4, this._subLocalMat4);
      this.helmetInst.setMatrixAt(slot, this._subWorldMat4);

      // 5. Four Wheels (2 steerable front slicks + 2 wider rear drive slicks)
      const rimChanged = this.lastRimHex[slot] !== k.rimHex;
      if (rimChanged) {
        this.lastRimHex[slot] = k.rimHex;
        this._scratchColor.setHex(k.rimHex);
        rimColorsDirty = true;
      }

      // Spin quaternion (shared by all 4 wheels on this kart)
      this._scratchQuat2.setFromAxisAngle(this._xAxis, k.wheelSpinRad);

      // Front wheels: steer around Y, then spin around X
      this._scratchQuat.setFromAxisAngle(this._yAxis, k.frontSteerRad).multiply(this._scratchQuat2);

      // Front-Left
      this._scratchPos.set(-0.0056 * KART_WORLD_SCALE, 0.00185 * KART_WORLD_SCALE, 0.0054 * KART_WORLD_SCALE);
      this._subLocalMat4.compose(this._scratchPos, this._scratchQuat, this._unitScale);
      this._subWorldMat4.multiplyMatrices(this._chassisWorldMat4, this._subLocalMat4);
      this.wheelsInst.setMatrixAt(wheelIdx, this._subWorldMat4);
      if (rimChanged) this.wheelsInst.setColorAt(wheelIdx, this._scratchColor);
      wheelIdx++;

      // Front-Right
      this._scratchPos.set(0.0056 * KART_WORLD_SCALE, 0.00185 * KART_WORLD_SCALE, 0.0054 * KART_WORLD_SCALE);
      this._subLocalMat4.compose(this._scratchPos, this._scratchQuat, this._unitScale);
      this._subWorldMat4.multiplyMatrices(this._chassisWorldMat4, this._subLocalMat4);
      this.wheelsInst.setMatrixAt(wheelIdx, this._subWorldMat4);
      if (rimChanged) this.wheelsInst.setColorAt(wheelIdx, this._scratchColor);
      wheelIdx++;

      // Rear-Left (spin only, wider/taller slick scale)
      this._scratchPos.set(-0.0059 * KART_WORLD_SCALE, 0.00215 * KART_WORLD_SCALE, -0.0054 * KART_WORLD_SCALE);
      this._subLocalMat4.compose(this._scratchPos, this._scratchQuat2, this._rearWheelScale);
      this._subWorldMat4.multiplyMatrices(this._chassisWorldMat4, this._subLocalMat4);
      this.wheelsInst.setMatrixAt(wheelIdx, this._subWorldMat4);
      if (rimChanged) this.wheelsInst.setColorAt(wheelIdx, this._scratchColor);
      wheelIdx++;

      // Rear-Right
      this._scratchPos.set(0.0059 * KART_WORLD_SCALE, 0.00215 * KART_WORLD_SCALE, -0.0054 * KART_WORLD_SCALE);
      this._subLocalMat4.compose(this._scratchPos, this._scratchQuat2, this._rearWheelScale);
      this._subWorldMat4.multiplyMatrices(this._chassisWorldMat4, this._subLocalMat4);
      this.wheelsInst.setMatrixAt(wheelIdx, this._subWorldMat4);
      if (rimChanged) this.wheelsInst.setColorAt(wheelIdx, this._scratchColor);
      wheelIdx++;

      // 6. Conditional Boost Exhaust Flames (2 pipes per boosting kart)
      if (k.isBoosting) {
        this._scratchQuat.setFromAxisAngle(this._xAxis, 0.18);
        for (let p = 0; p < 2; p++) {
          const ex = p === 0 ? -0.00108 * KART_WORLD_SCALE : 0.00108 * KART_WORLD_SCALE;
          const phase = p * 2.15 + i * 1.13;
          const crackle =
            0.82 +
            0.18 * Math.sin(elapsedSec * 58.0 + phase) +
            0.12 * Math.cos(elapsedSec * 93.0 - phase * 1.4);
          const rScale = 0.96 + 0.08 * Math.sin(elapsedSec * 44.0 + phase);
          const zScale = Math.max(0.55, 0.88 + 0.28 * crackle);

          this._scratchPos.set(ex, 0.00208 * KART_WORLD_SCALE, -0.00895 * KART_WORLD_SCALE);
          this._scratchScale.set(rScale, rScale, zScale);
          this._subLocalMat4.compose(this._scratchPos, this._scratchQuat, this._scratchScale);
          this._subWorldMat4.multiplyMatrices(this._chassisWorldMat4, this._subLocalMat4);

          this.boostFlameInst.setMatrixAt(boostIdx, this._subWorldMat4);
          flamePhaseArr[boostIdx] = phase;
          flameIntArr[boostIdx] = Math.min(1.35, 0.92 * crackle);
          boostIdx++;
        }
      }

      // 7. Conditional Taillight Night / Brake Flare Glow
      if (lightsOn || k.isBraking) {
        this.taillightGlowInst.setMatrixAt(tailGlowIdx, this._chassisWorldMat4);
        const flare = k.isBraking ? 1.35 : Math.max(0.28, nightFactor * 0.78);
        this._scratchColor.setRGB(flare, flare, flare);
        this.taillightGlowInst.setColorAt(tailGlowIdx, this._scratchColor);
        tailGlowIdx++;
      }

      // 8. Conditional Wet-Weather Rear Tire Spray Plumes
      if (wetActive) {
        const speedRatio = Math.max(0, Math.min(1, k.speedMs / 38.0));
        if (speedRatio > 0.08) {
          const sLen = 0.55 + speedRatio * 0.85;
          const sWid = 0.65 + speedRatio * 0.55;
          this._scratchQuat.identity();
          this._scratchScale.set(sWid, sWid, sLen);

          for (let s = 0; s < 2; s++) {
            const sx = s === 0 ? -0.0059 * KART_WORLD_SCALE : 0.0059 * KART_WORLD_SCALE;
            this._scratchPos.set(sx, 0.0008 * KART_WORLD_SCALE, -0.0064 * KART_WORLD_SCALE);
            this._subLocalMat4.compose(this._scratchPos, this._scratchQuat, this._scratchScale);
            this._subWorldMat4.multiplyMatrices(this._chassisWorldMat4, this._subLocalMat4);

            this.tireSprayInst.setMatrixAt(sprayIdx, this._subWorldMat4);
            sprayIntArr[sprayIdx] = speedRatio;
            sprayPhaseArr[sprayIdx] = i * 1.9 + s * 3.1;
            sprayIdx++;
          }
        }
      }
    }

    // Commit core layers
    const hasKarts = visibleKarts > 0;
    this.fairingInst.count = visibleKarts;
    this.carbonInst.count = visibleKarts;
    this.suitInst.count = visibleKarts;
    this.helmetInst.count = visibleKarts;
    this.chromeTrimInst.count = visibleKarts;
    this.contactShadowInst.count = visibleKarts;
    this.numberPlateInst.count = visibleKarts;
    this.wheelsInst.count = wheelIdx;

    this.fairingInst.visible = hasKarts;
    this.carbonInst.visible = hasKarts;
    this.suitInst.visible = hasKarts;
    this.helmetInst.visible = hasKarts;
    this.chromeTrimInst.visible = hasKarts;
    this.contactShadowInst.visible = hasKarts;
    this.numberPlateInst.visible = hasKarts;
    this.wheelsInst.visible = wheelIdx > 0;

    if (hasKarts) {
      this.fairingInst.instanceMatrix.needsUpdate = true;
      this.carbonInst.instanceMatrix.needsUpdate = true;
      this.suitInst.instanceMatrix.needsUpdate = true;
      this.helmetInst.instanceMatrix.needsUpdate = true;
      this.chromeTrimInst.instanceMatrix.needsUpdate = true;
      this.contactShadowInst.instanceMatrix.needsUpdate = true;
      this.numberPlateInst.instanceMatrix.needsUpdate = true;
      this.wheelsInst.instanceMatrix.needsUpdate = true;

      if (fairingColorsDirty && this.fairingInst.instanceColor) {
        this.fairingInst.instanceColor.needsUpdate = true;
      }
      if (suitColorsDirty && this.suitInst.instanceColor) {
        this.suitInst.instanceColor.needsUpdate = true;
      }
      if (helmetColorsDirty && this.helmetInst.instanceColor) {
        this.helmetInst.instanceColor.needsUpdate = true;
      }
      if (rimColorsDirty && this.wheelsInst.instanceColor) {
        this.wheelsInst.instanceColor.needsUpdate = true;
      }
      if (platesDirty) {
        this.plateRectAttr.needsUpdate = true;
      }
    }

    // Soften contact shadow slightly at night so tarmac stays natural under floodlights
    this.contactShadowMat.opacity = 0.88 - nightFactor * 0.34;

    // Commit conditional boost flames (0 draw calls when inactive)
    this.boostFlameInst.count = boostIdx;
    this.boostFlameInst.visible = boostIdx > 0;
    if (boostIdx > 0) {
      this.boostUniforms.uTime.value = elapsedSec;
      this.boostFlameInst.instanceMatrix.needsUpdate = true;
      this.flamePhaseAttr.needsUpdate = true;
      this.flameIntensityAttr.needsUpdate = true;
    }

    // Commit conditional night headlight beams (0 draw calls in daylight)
    this.headlightBeamInst.count = headBeamIdx;
    this.headlightBeamInst.visible = headBeamIdx > 0;
    if (headBeamIdx > 0) {
      this.headlightBeamMat.opacity = nightFactor * 0.94;
      this.headlightBeamInst.instanceMatrix.needsUpdate = true;
    }

    // Commit conditional taillight night/brake glow (0 draw calls when daylight & no braking)
    this.taillightGlowInst.count = tailGlowIdx;
    this.taillightGlowInst.visible = tailGlowIdx > 0;
    if (tailGlowIdx > 0) {
      this.taillightGlowInst.instanceMatrix.needsUpdate = true;
      if (this.taillightGlowInst.instanceColor) {
        this.taillightGlowInst.instanceColor.needsUpdate = true;
      }
    }

    // Commit conditional rain/snow tire spray (0 draw calls when dry)
    this.tireSprayInst.count = sprayIdx;
    this.tireSprayInst.visible = sprayIdx > 0;
    if (sprayIdx > 0) {
      this.sprayUniforms.uTime.value = elapsedSec;
      this.sprayUniforms.uIsSnow.value = sprayMode === 'SNOW' ? 1.0 : 0.0;
      this.tireSprayInst.instanceMatrix.needsUpdate = true;
      this.sprayIntensityAttr.needsUpdate = true;
      this.sprayPhaseAttr.needsUpdate = true;
    }
  }

  /**
   * Disposes all per-instance InstancedMesh GPU buffers, geometries, and materials
   * while preserving shared module-level textures (`userData.isSharedResource = true`).
   */
  public dispose(): void {
    for (let i = 0; i < this._disposables.meshes.length; i++) {
      this._disposables.meshes[i].dispose();
    }
    for (let i = 0; i < this._disposables.geometries.length; i++) {
      this._disposables.geometries[i].dispose();
    }
    for (let i = 0; i < this._disposables.materials.length; i++) {
      this._disposables.materials[i].dispose();
    }
    this.root.clear();
  }
}
