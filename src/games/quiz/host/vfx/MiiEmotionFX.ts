import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * MiiEmotionFX
 * Hardware-instanced procedural facial expressions, 3D sweat drop bursts, and emote particles
 * for Mii avatars (4 InstancedMeshes total: 1 face overlay patch + 1 sweat + 1 stars + 1 notes).
 * Supports Volleyball (Dig, Set, Spike, Drop, Win) and Tug-of-War (Pull, Strain, Victory, Defeat).
 *
 * Derived from Gemini Argon Games (Argon Tennis mii_facial_fx engine).
 */

export type FacialState =
  | 'neutral'
  | 'pull_strain'
  | 'panic'
  | 'shout'
  | 'happy_cheer'
  | 'focused_squint'
  | 'defeat_dizzy'
  | 'surprised'
  // Backwards-compatible aliases
  | 'effort_shout'
  | 'wide_eyed_panic'
  | 'happy_grin'
  | 'shocked_loss';

export interface DynamicFaceRig {
  id: string;
  slotIndex: number;
  headNode: THREE.Object3D | null;
  state: FacialState;
  stateTimer: number;
  blinkTimer: number;
  blinkActiveTimer: number;
  activeAtlasSlot: number;
  hasExplicitMatrix: boolean;
}

const MAX_FACE_INSTANCES = 8;
const MAX_SWEAT_DROPS = 24;
const MAX_STAR_EMOTES = 9;
const MAX_NOTE_EMOTES = 9;

// 4x2 Expression Atlas Slot Mapping (512x256, 128x128 per cell):
// Row 0: 0=neutral, 1=pull_strain, 2=panic, 3=shout
// Row 1: 4=happy_cheer, 5=focused_squint, 6=defeat_dizzy, 7=surprised
const ATLAS_COLS = 4;
const ATLAS_ROWS = 2;
const ATLAS_CELL = 128;
const ATLAS_W = ATLAS_COLS * ATLAS_CELL; // 512
const ATLAS_H = ATLAS_ROWS * ATLAS_CELL; // 256
const ATLAS_PAD = 2;

function resolveAtlasSlot(state: FacialState, isBlinking: boolean): number {
  if (isBlinking && state === 'neutral') return 5; // focused_squint / closed blink
  switch (state) {
    case 'neutral':
      return 0;
    case 'pull_strain':
      return 1;
    case 'panic':
    case 'wide_eyed_panic':
      return 2;
    case 'shout':
    case 'effort_shout':
      return 3;
    case 'happy_cheer':
    case 'happy_grin':
      return 4;
    case 'focused_squint':
      return 5;
    case 'defeat_dizzy':
    case 'shocked_loss':
      return 6;
    case 'surprised':
      return 7;
    default:
      return 0;
  }
}

function writeExpressionAtlasRect(out: Float32Array, offset: number, slot: number): void {
  const col = slot % ATLAS_COLS;
  const row = (slot / ATLAS_COLS) | 0;
  out[offset] = (col * ATLAS_CELL + ATLAS_PAD) / ATLAS_W;
  out[offset + 1] = 1 - ((row + 1) * ATLAS_CELL - ATLAS_PAD) / ATLAS_H;
  out[offset + 2] = (ATLAS_CELL - ATLAS_PAD * 2) / ATLAS_W;
  out[offset + 3] = (ATLAS_CELL - ATLAS_PAD * 2) / ATLAS_H;
}

let sharedFaceAtlasTex: THREE.CanvasTexture | null = null;

function getSharedMiiFaceAtlasTexture(): THREE.CanvasTexture | null {
  if (sharedFaceAtlasTex) return sharedFaceAtlasTex;
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.width = ATLAS_W;
  canvas.height = ATLAS_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.clearRect(0, 0, ATLAS_W, ATLAS_H);

  const drawCheeks = (alpha: number) => {
    ctx.fillStyle = `rgba(255, 107, 123, ${alpha})`;
    ctx.beginPath();
    ctx.ellipse(24, 78, 12, 7.5, 0, 0, Math.PI * 2);
    ctx.ellipse(104, 78, 12, 7.5, 0, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawOpenEye = (ex: number, ey: number, rx: number, ry: number, pupilScale = 1.0) => {
    // White sclera
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(ex, ey, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#121318';
    ctx.lineWidth = 2.4;
    ctx.stroke();

    // Pupil
    const prx = rx * 0.66 * pupilScale;
    const pry = ry * 0.72 * pupilScale;
    ctx.fillStyle = '#121318';
    ctx.beginPath();
    ctx.ellipse(ex, ey + 0.5, prx, pry, 0, 0, Math.PI * 2);
    ctx.fill();

    // Dual catchlights
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ex - prx * 0.36, ey - pry * 0.35, Math.max(1.8, prx * 0.32), 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(ex + prx * 0.32, ey + pry * 0.34, Math.max(1.1, prx * 0.16), 0, Math.PI * 2);
    ctx.fill();
  };

  const drawBrows = (mode: 'relaxed' | 'fierce' | 'worried' | 'raised') => {
    ctx.strokeStyle = '#23140b';
    ctx.lineWidth = 6.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (mode === 'relaxed') {
      ctx.moveTo(22, 26);
      ctx.quadraticCurveTo(36, 20, 48, 25);
      ctx.moveTo(80, 25);
      ctx.quadraticCurveTo(92, 20, 106, 26);
    } else if (mode === 'fierce') {
      ctx.moveTo(22, 20);
      ctx.lineTo(50, 31);
      ctx.moveTo(106, 20);
      ctx.lineTo(78, 31);
    } else if (mode === 'worried') {
      ctx.moveTo(22, 30);
      ctx.lineTo(48, 18);
      ctx.moveTo(106, 30);
      ctx.lineTo(80, 18);
    } else {
      ctx.moveTo(22, 22);
      ctx.quadraticCurveTo(36, 12, 48, 20);
      ctx.moveTo(80, 20);
      ctx.quadraticCurveTo(92, 12, 106, 22);
    }
    ctx.stroke();
  };

  const drawCell = (slot: number, fn: () => void) => {
    const col = slot % ATLAS_COLS;
    const row = (slot / ATLAS_COLS) | 0;
    ctx.save();
    ctx.translate(col * ATLAS_CELL, row * ATLAS_CELL);
    fn();
    ctx.restore();
  };

  // 0: neutral
  drawCell(0, () => {
    drawCheeks(0.32);
    drawBrows('relaxed');
    drawOpenEye(36, 48, 12, 14, 1.0);
    drawOpenEye(92, 48, 12, 14, 1.0);
    // Warm neutral smile + teeth accent
    ctx.fillStyle = '#521128';
    ctx.beginPath();
    ctx.roundRect(47, 94, 34, 11, 5);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(51, 95.5, 26, 4);
  });

  // 1: pull_strain (tight >< eyes + fierce V-brows + gritting clenched teeth)
  drawCell(1, () => {
    drawCheeks(0.5);
    drawBrows('fierce');
    ctx.strokeStyle = '#121318';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // Left >
    ctx.beginPath();
    ctx.moveTo(24, 40);
    ctx.lineTo(46, 50);
    ctx.lineTo(24, 59);
    // Right <
    ctx.moveTo(104, 40);
    ctx.lineTo(82, 50);
    ctx.lineTo(104, 59);
    ctx.stroke();
    // Gritting teeth mouth
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#3b0d1e';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.roundRect(42, 92, 44, 16, 6);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(43, 100);
    ctx.lineTo(85, 100);
    ctx.moveTo(56, 92);
    ctx.lineTo(56, 108);
    ctx.moveTo(72, 92);
    ctx.lineTo(72, 108);
    ctx.stroke();
  });

  // 2: panic / wide_eyed_panic
  drawCell(2, () => {
    drawCheeks(0.24);
    drawBrows('worried');
    drawOpenEye(36, 48, 15.5, 18.5, 0.48);
    drawOpenEye(92, 48, 15.5, 18.5, 0.48);
    // Shaking open O-mouth
    ctx.fillStyle = '#521128';
    ctx.beginPath();
    ctx.ellipse(64, 100, 14, 17, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff6e7a';
    ctx.beginPath();
    ctx.ellipse(64, 109, 8.5, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  });

  // 3: shout / effort_shout
  drawCell(3, () => {
    drawCheeks(0.55);
    drawBrows('fierce');
    drawOpenEye(36, 49, 13, 13.5, 0.95);
    drawOpenEye(92, 49, 13, 13.5, 0.95);
    // Wide shouting mouth + tongue
    ctx.fillStyle = '#521128';
    ctx.beginPath();
    ctx.ellipse(64, 100, 17, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff6e7a';
    ctx.beginPath();
    ctx.ellipse(64, 108, 11, 6.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(52, 87, 24, 5);
  });

  // 4: happy_cheer / happy_grin
  drawCell(4, () => {
    drawCheeks(0.68);
    drawBrows('raised');
    // Happy curved ^_^ arcs
    ctx.strokeStyle = '#121318';
    ctx.lineWidth = 6.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(36, 54, 13, Math.PI * 1.12, Math.PI * 1.88);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(92, 54, 13, Math.PI * 1.12, Math.PI * 1.88);
    ctx.stroke();
    // Big wide happy D-grin
    ctx.fillStyle = '#521128';
    ctx.beginPath();
    ctx.arc(64, 92, 21, 0.06, Math.PI - 0.06, false);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ff6e7a';
    ctx.beginPath();
    ctx.arc(64, 106, 11, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(46, 92, 36, 5.5);
  });

  // 5: focused_squint (also doubles cleanly as a crisp neutral blink!)
  drawCell(5, () => {
    drawCheeks(0.28);
    drawBrows('relaxed');
    ctx.strokeStyle = '#121318';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(23, 50);
    ctx.lineTo(49, 50);
    ctx.moveTo(79, 50);
    ctx.lineTo(105, 50);
    ctx.stroke();
    // Calm smile
    ctx.fillStyle = '#521128';
    ctx.beginPath();
    ctx.roundRect(48, 95, 32, 9.5, 4.5);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(52, 96.5, 24, 3.5);
  });

  // 6: defeat_dizzy / shocked_loss
  drawCell(6, () => {
    drawCheeks(0.2);
    drawBrows('worried');
    // X_X eyes
    ctx.strokeStyle = '#121318';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    const drawX = (cx: number, cy: number) => {
      ctx.beginPath();
      ctx.moveTo(cx - 11, cy - 10);
      ctx.lineTo(cx + 11, cy + 10);
      ctx.moveTo(cx + 11, cy - 10);
      ctx.lineTo(cx - 11, cy + 10);
      ctx.stroke();
    };
    drawX(36, 49);
    drawX(92, 49);
    // Wavy ~ mouth
    ctx.beginPath();
    ctx.moveTo(42, 102);
    ctx.quadraticCurveTo(50, 92, 58, 101);
    ctx.quadraticCurveTo(64, 108, 70, 101);
    ctx.quadraticCurveTo(78, 92, 86, 102);
    ctx.stroke();
  });

  // 7: surprised
  drawCell(7, () => {
    drawCheeks(0.45);
    drawBrows('raised');
    drawOpenEye(36, 48, 14, 16, 0.85);
    drawOpenEye(92, 48, 14, 16, 0.85);
    // Cute small O-mouth
    ctx.fillStyle = '#521128';
    ctx.beginPath();
    ctx.ellipse(64, 100, 10, 12.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff6e7a';
    ctx.beginPath();
    ctx.ellipse(64, 106, 6, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.userData = { isSharedResource: true };
  sharedFaceAtlasTex = tex;
  return tex;
}

function normalizeAndMerge(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const normalized: THREE.BufferGeometry[] = [];
  for (let i = 0; i < parts.length; i++) {
    const src = parts[i];
    const g = src.index ? src.toNonIndexed() : src.clone();
    src.dispose();
    if (!g.attributes.normal) g.computeVertexNormals();
    if (g.attributes.uv) g.deleteAttribute('uv');
    normalized.push(g);
  }
  const merged = mergeGeometries(normalized, false);
  for (let i = 0; i < normalized.length; i++) normalized[i].dispose();
  return merged || new THREE.BufferGeometry();
}

interface SweatDropState {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  scale: number;
  age: number;
  maxAge: number;
  active: boolean;
}

interface EmoteParticleState {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  rotY: number;
  rotVel: number;
  age: number;
  maxAge: number;
  active: boolean;
}

export class MiiEmotionFX {
  private scene: THREE.Scene;
  private faceRigs: Map<string, DynamicFaceRig> = new Map();
  private rigList: DynamicFaceRig[] = [];

  // 1. Hardware-instanced Curved Face Overlay Patch (1 draw call for all 8 Miis)
  private faceGeo!: THREE.BufferGeometry;
  private faceMat!: THREE.MeshBasicMaterial;
  private faceInst!: THREE.InstancedMesh;
  private faceAtlasData!: Float32Array;
  private faceAtlasAttr!: THREE.InstancedBufferAttribute;
  private faceAtlasDirty = false;
  private faceMatricesDirty = false;

  // 2. Hardware-instanced 3D Sweat Drops (1 draw call, capacity 24)
  private sweatGeo!: THREE.BufferGeometry;
  private sweatMat!: THREE.MeshStandardMaterial;
  private sweatInst!: THREE.InstancedMesh;
  private sweatDrops: SweatDropState[] = [];

  // 3 & 4. Hardware-instanced Emote Particles (2 draw calls: 9 stars + 9 notes)
  private starGeo!: THREE.BufferGeometry;
  private starMat!: THREE.MeshBasicMaterial;
  private starInst!: THREE.InstancedMesh;
  private starEmotes: EmoteParticleState[] = [];

  private noteGeo!: THREE.BufferGeometry;
  private noteMat!: THREE.MeshBasicMaterial;
  private noteInst!: THREE.InstancedMesh;
  private noteEmotes: EmoteParticleState[] = [];

  // Hoisted scratch Object3D (zero per-frame allocations)
  private tmpObj = new THREE.Object3D();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.initFaceOverlayPool();
    this.initSweatPool();
    this.initEmotePools();
  }

  // ---------------------------------------------------------------------------
  // Curved Face Overlay InstancedMesh (1 Draw Call)
  // ---------------------------------------------------------------------------
  private initFaceOverlayPool() {
    // Spherical cap hugging the front of the Mii head skull (r = 0.245, centerY = 0.1775)
    // Placed at r = 0.252 so eyes/brows/cheeks/mouth clear skin cleanly while 3D nose pokes through center
    this.faceGeo = new THREE.SphereGeometry(
      0.252,
      14,
      10,
      Math.PI / 2 - 0.64,
      1.28,
      Math.PI / 2 - 0.54,
      1.08
    );
    this.faceGeo.translate(0, 0.1775, 0);

    this.faceAtlasData = new Float32Array(MAX_FACE_INSTANCES * 4);
    for (let i = 0; i < MAX_FACE_INSTANCES; i++) {
      writeExpressionAtlasRect(this.faceAtlasData, i * 4, 0);
    }
    this.faceAtlasAttr = new THREE.InstancedBufferAttribute(this.faceAtlasData, 4);
    this.faceGeo.setAttribute('aAtlasRect', this.faceAtlasAttr);

    const atlasTex = getSharedMiiFaceAtlasTexture();
    this.faceMat = new THREE.MeshBasicMaterial({
      map: atlasTex || undefined,
      transparent: true,
      alphaTest: 0.02,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    (this.faceMat as unknown as { customProgramCacheKey: () => string }).customProgramCacheKey = () =>
      'mii_emotion_face_atlas_v1';
    this.faceMat.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace('#include <uv_pars_vertex>', '#include <uv_pars_vertex>\nattribute vec4 aAtlasRect;')
        .replace(
          '#include <uv_vertex>',
          '#include <uv_vertex>\n#ifdef USE_MAP\n  vMapUv = aAtlasRect.xy + vMapUv * aAtlasRect.zw;\n#endif'
        );
    };
    this.faceMat.needsUpdate = true;

    this.faceInst = new THREE.InstancedMesh(this.faceGeo, this.faceMat, MAX_FACE_INSTANCES);
    this.faceInst.frustumCulled = false;
    this.faceInst.count = 0;
    this.faceInst.visible = false;
    this.faceInst.renderOrder = 3;
    this.scene.add(this.faceInst);
  }

  // ---------------------------------------------------------------------------
  // Sweat & Emote Instanced Pools (3 Draw Calls)
  // ---------------------------------------------------------------------------
  private initSweatPool() {
    const sphere = new THREE.SphereGeometry(0.045, 10, 8);
    sphere.translate(0, -0.015, 0);
    const cone = new THREE.ConeGeometry(0.042, 0.08, 10);
    cone.translate(0, 0.025, 0);
    this.sweatGeo = normalizeAndMerge([sphere, cone]);

    this.sweatMat = new THREE.MeshStandardMaterial({
      color: 0x5eead4,
      emissive: 0x14b8a6,
      emissiveIntensity: 0.35,
      roughness: 0.15,
      metalness: 0.05,
      transparent: true,
      opacity: 0.92,
    });

    this.sweatInst = new THREE.InstancedMesh(this.sweatGeo, this.sweatMat, MAX_SWEAT_DROPS);
    this.sweatInst.frustumCulled = false;
    this.sweatInst.count = 0;
    this.sweatInst.visible = false;
    this.scene.add(this.sweatInst);

    for (let i = 0; i < MAX_SWEAT_DROPS; i++) {
      this.sweatDrops.push({
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        scale: 1.0,
        age: 0,
        maxAge: 0.55,
        active: false,
      });
    }
  }

  private initEmotePools() {
    // Stars: merged pair of crossed flattened octahedra
    const starA = new THREE.OctahedronGeometry(0.08, 0);
    starA.scale(1.2, 1.2, 0.4);
    const starB = new THREE.OctahedronGeometry(0.08, 0);
    starB.scale(1.2, 1.2, 0.4);
    starB.rotateZ(Math.PI / 4);
    this.starGeo = normalizeAndMerge([starA, starB]);
    this.starMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });

    this.starInst = new THREE.InstancedMesh(this.starGeo, this.starMat, MAX_STAR_EMOTES);
    this.starInst.frustumCulled = false;
    this.starInst.count = 0;
    this.starInst.visible = false;
    this.scene.add(this.starInst);

    for (let i = 0; i < MAX_STAR_EMOTES; i++) {
      this.starEmotes.push({
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        rotY: 0,
        rotVel: (Math.random() - 0.5) * 6.0,
        age: 0,
        maxAge: 0.85,
        active: false,
      });
    }

    // Music Notes: merged head + stem + flag
    const noteHead = new THREE.SphereGeometry(0.042, 8, 8);
    noteHead.scale(1.3, 0.9, 0.6);
    noteHead.rotateZ(0.35);
    noteHead.translate(-0.02, -0.04, 0);

    const noteStem = new THREE.BoxGeometry(0.016, 0.11, 0.016);
    noteStem.translate(0.015, 0.015, 0);

    const noteFlag = new THREE.BoxGeometry(0.045, 0.02, 0.016);
    noteFlag.rotateZ(-0.35);
    noteFlag.translate(0.035, 0.055, 0);

    this.noteGeo = normalizeAndMerge([noteHead, noteStem, noteFlag]);
    this.noteMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

    this.noteInst = new THREE.InstancedMesh(this.noteGeo, this.noteMat, MAX_NOTE_EMOTES);
    this.noteInst.frustumCulled = false;
    this.noteInst.count = 0;
    this.noteInst.visible = false;
    this.scene.add(this.noteInst);

    for (let i = 0; i < MAX_NOTE_EMOTES; i++) {
      this.noteEmotes.push({
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        rotY: 0,
        rotVel: (Math.random() - 0.5) * 6.0,
        age: 0,
        maxAge: 0.85,
        active: false,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Register Instanced Face Overlay Slot for a Mii Head
  // ---------------------------------------------------------------------------
  public attachFaceRig(id: string, headNode: THREE.Object3D | null = null, _hairColor = 0x2a1708): DynamicFaceRig {
    const existing = this.faceRigs.get(id);
    if (existing) {
      if (headNode) existing.headNode = headNode;
      return existing;
    }

    const slotIndex = this.rigList.length;
    const rig: DynamicFaceRig = {
      id,
      slotIndex: Math.min(slotIndex, MAX_FACE_INSTANCES - 1),
      headNode,
      state: 'neutral',
      stateTimer: 0,
      blinkTimer: 2.5 + Math.random() * 2.0,
      blinkActiveTimer: 0,
      activeAtlasSlot: -1,
      hasExplicitMatrix: false,
    };

    if (slotIndex < MAX_FACE_INSTANCES) {
      this.faceRigs.set(id, rig);
      this.rigList.push(rig);
      this.faceInst.count = this.rigList.length;
      this.faceInst.visible = this.rigList.length > 0;
      this.syncRigAtlas(rig);
      if (headNode) {
        headNode.updateWorldMatrix(true, false);
        this.faceInst.setMatrixAt(rig.slotIndex, headNode.matrixWorld);
        this.faceMatricesDirty = true;
      }
    }

    return rig;
  }

  /**
   * Updates the world transform of a registered Mii's curved face-overlay patch directly.
   */
  public setHeadMatrix(id: string, worldMatrix: THREE.Matrix4): void {
    const rig = this.faceRigs.get(id);
    if (!rig) return;
    rig.hasExplicitMatrix = true;
    this.faceInst.setMatrixAt(rig.slotIndex, worldMatrix);
    this.faceMatricesDirty = true;
  }

  private syncRigAtlas(rig: DynamicFaceRig): void {
    const isBlinking = rig.blinkActiveTimer > 0 && rig.state === 'neutral';
    const nextSlot = resolveAtlasSlot(rig.state, isBlinking);
    if (nextSlot === rig.activeAtlasSlot) return;
    rig.activeAtlasSlot = nextSlot;
    writeExpressionAtlasRect(this.faceAtlasData, rig.slotIndex * 4, nextSlot);
    this.faceAtlasDirty = true;
  }

  // ---------------------------------------------------------------------------
  // Set Expression State (Early-return if unchanged)
  // ---------------------------------------------------------------------------
  public setExpression(id: string, state: FacialState, durationSec = 1.2): void {
    const rig = this.faceRigs.get(id);
    if (!rig) return;

    if (rig.state === state) {
      rig.stateTimer = durationSec;
      return;
    }

    rig.state = state;
    rig.stateTimer = durationSec;
    this.syncRigAtlas(rig);
  }

  public setTeamExpression(team: 'red' | 'white', state: FacialState, durationSec = 1.5): void {
    for (let i = 0; i < this.rigList.length; i++) {
      const rig = this.rigList[i];
      if (rig.id.includes(team)) {
        if (rig.state === state) {
          rig.stateTimer = durationSec;
        } else {
          rig.state = state;
          rig.stateTimer = durationSec;
          this.syncRigAtlas(rig);
        }
      }
    }
  }

  public setAllExpression(state: FacialState, durationSec = 1.5): void {
    for (let i = 0; i < this.rigList.length; i++) {
      const rig = this.rigList[i];
      if (rig.state === state) {
        rig.stateTimer = durationSec;
      } else {
        rig.state = state;
        rig.stateTimer = durationSec;
        this.syncRigAtlas(rig);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Sweat Drops & Emote Particle Triggers
  // ---------------------------------------------------------------------------
  public spawnSweatDrops(position: THREE.Vector3, count = 4): void {
    let spawned = 0;
    for (let i = 0; i < this.sweatDrops.length && spawned < count; i++) {
      const drop = this.sweatDrops[i];
      if (drop.active) continue;

      drop.active = true;
      drop.age = 0;
      drop.maxAge = 0.48 + Math.random() * 0.2;

      const side = (spawned % 2 === 0 ? 1 : -1) * (0.24 + Math.random() * 0.06);
      drop.pos.set(
        position.x + side,
        position.y + 1.45 + Math.random() * 0.1,
        position.z + (Math.random() - 0.5) * 0.1
      );
      drop.vel.set(
        side * (1.8 + Math.random() * 0.8),
        1.8 + Math.random() * 1.2,
        (Math.random() - 0.5) * 0.8
      );
      drop.scale = 0.9 + Math.random() * 0.3;
      spawned++;
    }
  }

  public triggerEmoteBurst(position: THREE.Vector3, count = 5): void {
    let spawned = 0;
    for (let k = 0; k < count; k++) {
      const pool = k % 2 === 0 ? this.starEmotes : this.noteEmotes;
      let chosen: EmoteParticleState | null = null;
      for (let i = 0; i < pool.length; i++) {
        if (!pool[i].active) {
          chosen = pool[i];
          break;
        }
      }
      if (!chosen) continue;

      chosen.active = true;
      chosen.age = 0;
      chosen.maxAge = 0.8 + Math.random() * 0.3;
      chosen.rotY = 0;

      const angle = (spawned / count) * Math.PI * 2;
      const radius = 0.28 + Math.random() * 0.1;

      chosen.pos.set(
        position.x + Math.cos(angle) * radius,
        position.y + 1.85 + Math.random() * 0.15,
        position.z + Math.sin(angle) * radius
      );
      chosen.vel.set(
        Math.cos(angle) * 0.3,
        0.8 + Math.random() * 0.4,
        Math.sin(angle) * 0.3
      );
      spawned++;
    }
  }

  // ---------------------------------------------------------------------------
  // Frame Update Loop (Zero Per-Frame Allocations)
  // ---------------------------------------------------------------------------
  public update(dt: number): void {
    // 1. Update Face Rigs (State expiration, blinking & head matrix sync)
    for (let i = 0; i < this.rigList.length; i++) {
      const rig = this.rigList[i];
      if (rig.state !== 'neutral') {
        rig.stateTimer -= dt;
        if (rig.stateTimer <= 0) {
          rig.state = 'neutral';
          this.syncRigAtlas(rig);
        }
      } else {
        if (rig.blinkActiveTimer > 0) {
          rig.blinkActiveTimer -= dt;
          if (rig.blinkActiveTimer <= 0) {
            rig.blinkTimer = 2.5 + Math.random() * 2.5;
            this.syncRigAtlas(rig);
          }
        } else {
          rig.blinkTimer -= dt;
          if (rig.blinkTimer <= 0) {
            rig.blinkActiveTimer = 0.12;
            this.syncRigAtlas(rig);
          }
        }
      }

      if (!rig.hasExplicitMatrix && rig.headNode) {
        this.faceInst.setMatrixAt(rig.slotIndex, rig.headNode.matrixWorld);
        this.faceMatricesDirty = true;
      }
    }

    if (this.faceAtlasDirty) {
      this.faceAtlasAttr.needsUpdate = true;
      this.faceAtlasDirty = false;
    }
    if (this.faceMatricesDirty) {
      this.faceInst.instanceMatrix.needsUpdate = true;
      this.faceMatricesDirty = false;
    }

    // 2. Update & Compact Sweat Drops -> 1 InstancedMesh
    let activeSweat = 0;
    for (let i = 0; i < this.sweatDrops.length; i++) {
      const drop = this.sweatDrops[i];
      if (!drop.active) continue;
      drop.age += dt;
      const u = drop.age / drop.maxAge;

      if (u >= 1) {
        drop.active = false;
        continue;
      }

      drop.vel.y -= 9.8 * dt;
      drop.pos.addScaledVector(drop.vel, dt);
      const scale = u < 0.2 ? 0.6 + (u / 0.2) * 0.4 : 1.0 * (1 - (u - 0.2) * 0.85);

      this.tmpObj.position.copy(drop.pos);
      this.tmpObj.rotation.set(0, 0, 0);
      this.tmpObj.scale.setScalar(Math.max(0.1, scale * drop.scale));
      this.tmpObj.updateMatrix();
      this.sweatInst.setMatrixAt(activeSweat++, this.tmpObj.matrix);
    }
    this.sweatInst.count = activeSweat;
    this.sweatInst.visible = activeSweat > 0;
    if (activeSweat > 0) {
      this.sweatInst.instanceMatrix.needsUpdate = true;
    }

    // 3. Update & Compact Star Emotes -> 1 InstancedMesh
    let activeStars = 0;
    for (let i = 0; i < this.starEmotes.length; i++) {
      const emote = this.starEmotes[i];
      if (!emote.active) continue;
      emote.age += dt;
      const u = emote.age / emote.maxAge;

      if (u >= 1) {
        emote.active = false;
        continue;
      }

      emote.pos.addScaledVector(emote.vel, dt);
      emote.rotY += emote.rotVel * dt;
      const scale = u < 0.2 ? u / 0.2 : 1.0 - (u - 0.2) / 0.8;

      this.tmpObj.position.copy(emote.pos);
      this.tmpObj.rotation.set(0, emote.rotY, 0);
      this.tmpObj.scale.setScalar(Math.max(0.05, scale));
      this.tmpObj.updateMatrix();
      this.starInst.setMatrixAt(activeStars++, this.tmpObj.matrix);
    }
    this.starInst.count = activeStars;
    this.starInst.visible = activeStars > 0;
    if (activeStars > 0) {
      this.starInst.instanceMatrix.needsUpdate = true;
    }

    // 4. Update & Compact Music Note Emotes -> 1 InstancedMesh
    let activeNotes = 0;
    for (let i = 0; i < this.noteEmotes.length; i++) {
      const emote = this.noteEmotes[i];
      if (!emote.active) continue;
      emote.age += dt;
      const u = emote.age / emote.maxAge;

      if (u >= 1) {
        emote.active = false;
        continue;
      }

      emote.pos.addScaledVector(emote.vel, dt);
      emote.rotY += emote.rotVel * dt;
      const scale = u < 0.2 ? u / 0.2 : 1.0 - (u - 0.2) / 0.8;

      this.tmpObj.position.copy(emote.pos);
      this.tmpObj.rotation.set(0, emote.rotY, 0);
      this.tmpObj.scale.setScalar(Math.max(0.05, scale));
      this.tmpObj.updateMatrix();
      this.noteInst.setMatrixAt(activeNotes++, this.tmpObj.matrix);
    }
    this.noteInst.count = activeNotes;
    this.noteInst.visible = activeNotes > 0;
    if (activeNotes > 0) {
      this.noteInst.instanceMatrix.needsUpdate = true;
    }
  }

  public dispose(): void {
    this.scene.remove(this.faceInst, this.sweatInst, this.starInst, this.noteInst);
    this.faceInst.dispose();
    this.sweatInst.dispose();
    this.starInst.dispose();
    this.noteInst.dispose();

    this.faceGeo.dispose();
    this.faceMat.dispose();
    this.sweatGeo.dispose();
    this.sweatMat.dispose();
    this.starGeo.dispose();
    this.starMat.dispose();
    this.noteGeo.dispose();
    this.noteMat.dispose();

    this.faceRigs.clear();
    this.rigList = [];
    this.sweatDrops = [];
    this.starEmotes = [];
    this.noteEmotes = [];
  }
}
