/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ============================================================================
 * FILE: src/games/quiz/host/Volleyball3DStage.tsx (aliased as Tamaire3DStage.tsx)
 * ============================================================================
 * [ANTIGRAVITY REFACTOR: REPLACE VOLLEYBALL WITH "SWING FOR THE FENCES" 3D UNDOKAI BEAN BAG TOSS (玉入れ)]
 *
 * WHY THIS CHANGED:
 * 1. Authentic Japanese Undokai (運動会) Setting:
 *    Replaced the plain ground and simple backdrop with a richly detailed, multi-layered
 *    Japanese Elementary School Sports Day ground (校庭グラウンド):
 *    - Realistic "Masado" (真砂土) Decomposed Granite Schoolyard Sand with procedural
 *      1024x1024 multi-octave grain texture, normal/bump relief, raked broom tracks (トンボ掛け),
 *      scuffed footprints around the throwing circles, and subtle 3D terrain micro-undulations.
 *    - 4-Lane Terracotta Running Track (陸上トラック) with crisp white lane lines & concrete curb.
 *    - 3-Story Japanese Elementary School Building (校舎) in the background with classroom windows,
 *      balconies, rooftop clock tower, entrance portico, and vertical Undokai celebration banners.
 *    - Pitched White Honbu & Team Tents (本部テント・応援テント) with red-and-white Kohaku-maku
 *      (紅白幕) curtains, judge's table, gold trophy, PA speaker poles (放送塔), and cheering
 *      student spectators waving red & white pom-poms.
 *    - Lush perimeter Cherry Blossom (桜) & Zelkova trees, drifting桜 petals, layered mountain
 *      horizon, and multi-tiered volumetric cloud rings.
 * 2. Wii Sports Satin Rim Shader & Articulated Mii-Style Throwers:
 *    - Brings over `injectWiiSatinRimShader` and double-ring contact shadows from `TugOfWar3DStage`.
 *    - 10 articulated student throwers (with expressive faces, fluttering hachimaki headbands,
 *      numbered chest bibs, articulated arms & legs) who crouch to scoop fallen bean bags from the
 *      sand, jump to throw, kick up 3D sand dust puffs (砂煙), and emit manga emotion FX.
 * 3. Chaotic Bean Bag Physics (Scores, Rim-Bounce Near-Misses, Golden Trails & Pole Spring Wobble):
 *    - Tall 4.3m bamboo/steel basket poles bend and wobble with damped harmonic spring physics
 *      whenever bags land or clank off the rim.
 *    - Spawns both scoring bags and chaotic near-miss bags that clank off the metal hoop and bounce
 *      onto the sand floor around the players' feet.
 *    - Dynamic 3-phase broadcast camera that orbits during live play and swoops into a dramatic
 *      low-angle hero shot during the post-whistle Japanese Counting Ceremony ("ひとーつ！ふたーつ！").
 * ============================================================================
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { TeamId } from '../types';
import {
  formatTamaireCountCallout,
  buildTamaireSuspenseSchedule,
  TamaireSuspenseFrame,
} from '../core/quizEngine';
import { createClassroomRenderer } from '@/utils/classroom3d';
import { soundEffects } from '@/services/soundEffects';

export interface VolleyballPhaseChangeEvent {
  phase: string;
  activeTeam?: string;
  servingTeam?: string;
  currentRally: number;
  highestRally?: number;
  redScore: number;
  whiteScore: number;
  lastHitterName?: string;
  lastHitType?: string;
  phaseDurationMs: number;
}

export interface VolleyballAnswerEvent {
  id: number;
  playerId: string;
  playerName: string;
  team: 'red' | 'white';
  timestamp: number;
  isGoldenDouble?: boolean;
  /** When true, launches an off-target 3D bean bag that clanks/doinks off the 3D metal rim and ricochets onto the sand! */
  isMiss?: boolean;
  /** Optional 3-step physical action stage for 3D avatar & particle feedback */
  stepAction?:
    | 'SCOOP'
    | 'AIM'
    | 'FUMBLED_SAND'
    | 'DROPPED_BAG'
    | 'SWISH'
    | 'GOLDEN_SWISH'
    | 'RIM_DOINK';
}

export interface TamaireStudentRosterItem {
  id: string;
  nickname: string;
  team: 'red' | 'white';
}

export interface Tamaire3DStageProps {
  onPhaseChange?: (event: VolleyballPhaseChangeEvent) => void;
  redScore: number;
  whiteScore: number;
  matchEnded: boolean;
  winner: TeamId | 'draw' | null;
  redThrowRate?: number;
  whiteThrowRate?: number;
  redPlayersCount?: number;
  whitePlayersCount?: number;
  /** Optional 1-to-1 live student roster (1 to 40 students) so every joined student gets their own 3D avatar on field */
  studentRoster?: TamaireStudentRosterItem[];
  schoolName?: string;
  hideScoreUntilEnd?: boolean;
  /**
   * 'DIRECTOR' (default): Wide front-of-classroom TV broadcast camera showing both teams and baskets.
   * 'STUDENT_CHASE': Personal 3rd-person over-the-shoulder (or 1st-person POV) 3D camera on a student's iPad following their own 3D avatar!
   */
  cameraMode?: 'DIRECTOR' | 'STUDENT_CHASE';
  /** Identifies which student's 3D avatar to follow when cameraMode === 'STUDENT_CHASE' */
  focusPlayer?: {
    id: string;
    nickname: string;
    team: 'red' | 'white';
  };
  /** Optional synchronized match countdown seconds to display in the Main Screen TV HUD */
  timeRemainingSeconds?: number;
  /** When true in STUDENT_CHASE mode, illuminates the 3D parabolic aiming arc in blazing gold for a 2x Golden Bag! */
  isGoldenNext?: boolean;
  /** Current step in the 3-step physical throw cycle: 0 = Scoop from sand, 1 = Face net & lock aim, 2 = Sink the shot! */
  studentActionStep?: 0 | 1 | 2;
  /** Allows the student iPad to toggle between 3rd-person over-the-shoulder and 1st-person eyes-up POV (both in active play & tallying!) */
  studentViewPerspective?: 'THIRD_PERSON' | 'FIRST_PERSON';
  /** Legacy Volleyball props kept optional so existing QuizHostVolleyball callers never break */
  servingTeam?: TeamId;
  ballPossession?: TeamId;
  rallyCount?: number;
  highestRally?: number;
  gameStyle?: string;
  answerEvents?: VolleyballAnswerEvent[];
  onBallHit?: (type: string, nextRally: number) => void;
  onPointScored?: (team: 'red' | 'white') => void;
}

const _tmpBakePos = new THREE.Vector3();
const _tmpBakeQuat = new THREE.Quaternion();
const _tmpBakeEuler = new THREE.Euler();
const _tmpBakeScale = new THREE.Vector3();
const _tmpBakeMat = new THREE.Matrix4();
const _tmpBakeColor = new THREE.Color();

interface BakePartOptions {
  color?: number;
  pos?: [number, number, number];
  rot?: [number, number, number];
  scale?: [number, number, number];
  keepUv?: boolean;
}

function bakePartGeo(sourceGeo: THREE.BufferGeometry, opts: BakePartOptions = {}): THREE.BufferGeometry {
  const g = sourceGeo.index ? sourceGeo.toNonIndexed() : sourceGeo.clone();
  sourceGeo.dispose();

  _tmpBakePos.set(...(opts.pos ?? [0, 0, 0]));
  _tmpBakeEuler.set(...(opts.rot ?? [0, 0, 0]), 'XYZ');
  _tmpBakeQuat.setFromEuler(_tmpBakeEuler);
  _tmpBakeScale.set(...(opts.scale ?? [1, 1, 1]));
  _tmpBakeMat.compose(_tmpBakePos, _tmpBakeQuat, _tmpBakeScale);
  g.applyMatrix4(_tmpBakeMat);

  if (!g.attributes.normal) {
    g.computeVertexNormals();
  }
  if (!opts.keepUv && g.attributes.uv) {
    g.deleteAttribute('uv');
  }
  if (opts.color !== undefined) {
    _tmpBakeColor.setHex(opts.color);
    const vCount = g.attributes.position.count;
    const cols = new Float32Array(vCount * 3);
    for (let i = 0; i < vCount; i++) {
      cols[i * 3] = _tmpBakeColor.r;
      cols[i * 3 + 1] = _tmpBakeColor.g;
      cols[i * 3 + 2] = _tmpBakeColor.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  }
  return g;
}

function mergeBakedGeos(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const merged = mergeGeometries(parts, false);
  parts.forEach((p) => p.dispose());
  return merged || new THREE.BufferGeometry();
}

// ----------------------------------------------------------------------------
// 2. Nintendo Wii Sports Satin Rim-Lighting & Hemisphere Boost Shader + Instanced Atlas
// ----------------------------------------------------------------------------
function injectWiiSatinRimShader(material: THREE.Material, rimStrength = 0.3, topBoost = 0.12) {
  if (!material || (material.userData && material.userData.wiiRimInjected)) return material;
  material.userData = material.userData || {};
  material.userData.wiiRimInjected = true;
  const key = `wii_tamaire_satin_rim_${rimStrength.toFixed(2)}_${topBoost.toFixed(2)}`;
  (material as any).customProgramCacheKey = () => key;

  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <opaque_fragment>',
      `
      vec3 wiiViewDir = normalize( vViewPosition );
      vec3 wiiNormal = normalize( vNormal );
      float wiiRim = pow( 1.0 - max( dot( wiiNormal, wiiViewDir ), 0.0 ), 2.5 ) * ${rimStrength.toFixed(3)};
      float wiiHemiTop = clamp( wiiNormal.y * 0.5 + 0.5, 0.0, 1.0 ) * ${topBoost.toFixed(3)};
      vec3 wiiRimTint = vec3( 1.0, 0.985, 0.93 );
      outgoingLight += wiiRimTint * wiiRim + diffuseColor.rgb * wiiHemiTop;
      #include <opaque_fragment>
      `
    );
  };
  material.needsUpdate = true;
  return material;
}

function applyInstancedAtlasMaterial(
  material: THREE.Material,
  useWiiRim = true,
  rimStrength = 0.3,
  topBoost = 0.12
) {
  material.userData = material.userData || {};
  material.userData.wiiRimInjected = useWiiRim;
  const key = `wii_tamaire_atlas_${useWiiRim ? `${rimStrength.toFixed(2)}_${topBoost.toFixed(2)}` : 'flat'}`;
  (material as any).customProgramCacheKey = () => key;

  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <uv_pars_vertex>', '#include <uv_pars_vertex>\nattribute vec4 aAtlasRect;')
      .replace(
        '#include <uv_vertex>',
        '#include <uv_vertex>\n#ifdef USE_MAP\n  vMapUv = aAtlasRect.xy + vMapUv * aAtlasRect.zw;\n#endif'
      );
    if (useWiiRim) {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <opaque_fragment>',
        `
        vec3 wiiViewDir = normalize( vViewPosition );
        vec3 wiiNormal = normalize( vNormal );
        float wiiRim = pow( 1.0 - max( dot( wiiNormal, wiiViewDir ), 0.0 ), 2.5 ) * ${rimStrength.toFixed(3)};
        float wiiHemiTop = clamp( wiiNormal.y * 0.5 + 0.5, 0.0, 1.0 ) * ${topBoost.toFixed(3)};
        vec3 wiiRimTint = vec3( 1.0, 0.985, 0.93 );
        outgoingLight += wiiRimTint * wiiRim + diffuseColor.rgb * wiiHemiTop;
        #include <opaque_fragment>
        `
      );
    }
  };
  material.needsUpdate = true;
  return material;
}

// ----------------------------------------------------------------------------
// 3. Procedural PBR Textures: Schoolyard Sand (真砂土), Track, Grass, School & Banners
// ----------------------------------------------------------------------------
let cachedShadowTex: THREE.CanvasTexture | null = null;
function createDoubleRingShadowTexture(): THREE.CanvasTexture | null {
  if (cachedShadowTex) return cachedShadowTex;
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const grad = ctx.createRadialGradient(128, 128, 12, 128, 128, 118);
  grad.addColorStop(0, 'rgba(38, 26, 14, 0.78)');
  grad.addColorStop(0.45, 'rgba(48, 34, 18, 0.48)');
  grad.addColorStop(0.75, 'rgba(58, 42, 22, 0.18)');
  grad.addColorStop(1.0, 'rgba(58, 42, 22, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  ctx.strokeStyle = 'rgba(32, 22, 10, 0.16)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(128, 128, 86, 0, Math.PI * 2);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.userData = { isSharedResource: true };
  cachedShadowTex = tex;
  return tex;
}

/**
 * Generates a realistic Japanese schoolyard "Masado" (真砂土 — decomposed granite sand/clay)
 * diffuse map + high-frequency bump map with raked grooming lines, pebble speckles,
 * compacted dark zones under the poles, and lime-chalk wear.
 */
let cachedSandMaps: {
  diffuseMap: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} | null = null;

function createSchoolyardSandMaps(): {
  diffuseMap: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} | null {
  if (cachedSandMaps) return cachedSandMaps;
  if (typeof document === 'undefined') return null;

  // Pseudo-random deterministic generator for crisp sand grains
  let seed = 1337;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  const size = 256;
  const diffCanvas = document.createElement('canvas');
  diffCanvas.width = size;
  diffCanvas.height = size;
  const dCtx = diffCanvas.getContext('2d');

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bCtx = bumpCanvas.getContext('2d');

  if (!dCtx || !bCtx) return null;

  // 1. Rich warm golden-ochre Masado clay-sand base (deepened so sunlight never washes it out)
  const baseGrad = dCtx.createRadialGradient(size * 0.5, size * 0.5, 20, size * 0.5, size * 0.5, size * 0.72);
  baseGrad.addColorStop(0, '#c69a68');
  baseGrad.addColorStop(0.55, '#b88b58');
  baseGrad.addColorStop(1, '#a37646');
  dCtx.fillStyle = baseGrad;
  dCtx.fillRect(0, 0, size, size);

  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, size, size);

  // 2. Crisp raked broom furrows (トンボ掛けの跡) across the schoolyard
  for (let y = 0; y < size; y += 4) {
    const wave = Math.sin(y * 0.18) * 0.5 + 0.5;
    dCtx.fillStyle = y % 8 === 0 ? `rgba(112, 78, 42, ${0.22 * wave})` : `rgba(232, 202, 162, ${0.16 * wave})`;
    dCtx.fillRect(0, y, size, 2);

    bCtx.fillStyle = y % 8 === 0 ? 'rgba(45, 45, 45, 0.45)' : 'rgba(210, 210, 210, 0.45)';
    bCtx.fillRect(0, y, size, 2);
  }

  // 3. Organic mottled soil patches (damp compacted clay vs sunlit coarse sand)
  for (let i = 0; i < 240; i++) {
    const px = rand() * size;
    const py = rand() * size;
    const pr = 10 + rand() * 46;
    const isDark = rand() > 0.42;
    const patchGrad = dCtx.createRadialGradient(px, py, 2, px, py, pr);
    if (isDark) {
      patchGrad.addColorStop(0, 'rgba(108, 74, 38, 0.26)');
      patchGrad.addColorStop(1, 'rgba(108, 74, 38, 0)');
    } else {
      patchGrad.addColorStop(0, 'rgba(235, 205, 165, 0.22)');
      patchGrad.addColorStop(1, 'rgba(235, 205, 165, 0)');
    }
    dCtx.fillStyle = patchGrad;
    dCtx.beginPath();
    dCtx.arc(px, py, pr, 0, Math.PI * 2);
    dCtx.fill();
  }

  // 4. High-density granite/quartz sand grains & tiny pebbles (真砂土の粒感)
  const dImg = dCtx.getImageData(0, 0, size, size);
  const bImg = bCtx.getImageData(0, 0, size, size);
  const dData = dImg.data;
  const bData = bImg.data;

  for (let i = 0; i < dData.length; i += 4) {
    const grain = (rand() - 0.5) * 38;
    const pebbleRoll = rand();
    let extra = 0;
    if (pebbleRoll > 0.975) extra = 42; // Crisp white quartz crystal fleck
    else if (pebbleRoll < 0.028) extra = -48; // Dark basalt/mica pebble

    dData[i] = Math.max(0, Math.min(255, dData[i] + grain + extra));
    dData[i + 1] = Math.max(0, Math.min(255, dData[i + 1] + grain * 0.9 + extra * 0.88));
    dData[i + 2] = Math.max(0, Math.min(255, dData[i + 2] + grain * 0.78 + extra * 0.75));

    const bVal = Math.max(0, Math.min(255, bData[i] + grain * 2.8 + extra * 1.8));
    bData[i] = bVal;
    bData[i + 1] = bVal;
    bData[i + 2] = bVal;
  }

  dCtx.putImageData(dImg, 0, 0);
  bCtx.putImageData(bImg, 0, 0);

  // 5. Scuffed shoe prints & heel divots across the sand
  for (let i = 0; i < 150; i++) {
    const fx = rand() * size;
    const fy = rand() * size;
    const angle = rand() * Math.PI * 2;
    dCtx.save();
    dCtx.translate(fx, fy);
    dCtx.rotate(angle);
    dCtx.fillStyle = 'rgba(92, 62, 32, 0.32)';
    dCtx.beginPath();
    dCtx.ellipse(0, 0, 6, 3, 0, 0, Math.PI * 2);
    dCtx.fill();
    dCtx.restore();

    bCtx.save();
    bCtx.translate(fx, fy);
    bCtx.rotate(angle);
    bCtx.fillStyle = 'rgba(35, 35, 35, 0.55)';
    bCtx.beginPath();
    bCtx.ellipse(0, 0, 6, 3, 0, 0, Math.PI * 2);
    bCtx.fill();
    bCtx.restore();
  }

  const diffuseMap = new THREE.CanvasTexture(diffCanvas);
  diffuseMap.colorSpace = THREE.SRGBColorSpace;
  diffuseMap.wrapS = THREE.RepeatWrapping;
  diffuseMap.wrapT = THREE.RepeatWrapping;
  diffuseMap.repeat.set(6, 6);
  diffuseMap.userData = { isSharedResource: true };

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(6, 6);
  bumpMap.userData = { isSharedResource: true };

  cachedSandMaps = { diffuseMap, bumpMap };
  return cachedSandMaps;
}

/**
 * Generates a realistic lush grass turf texture for the outer schoolyard berm.
 */
let cachedGrassTex: THREE.CanvasTexture | null = null;
function createLushGrassTexture(): THREE.CanvasTexture | null {
  if (cachedGrassTex) return cachedGrassTex;
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#4d9b36';
  ctx.fillRect(0, 0, 256, 256);

  // Mowed lawn stripes
  ctx.fillStyle = 'rgba(92, 178, 58, 0.35)';
  ctx.fillRect(0, 0, 128, 256);

  for (let i = 0; i < 2400; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(116, 198, 74, 0.35)' : 'rgba(42, 108, 24, 0.32)';
    ctx.fillRect(x, y, 2, 4);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(16, 16);
  tex.userData = { isSharedResource: true };
  cachedGrassTex = tex;
  return tex;
}

/**
 * Generates the Japanese Elementary School facade window grid texture (校舎の窓とベランダ).
 */
let cachedSchoolFacadeTex: THREE.CanvasTexture | null = null;
function createSchoolFacadeTexture(): THREE.CanvasTexture | null {
  if (cachedSchoolFacadeTex) return cachedSchoolFacadeTex;
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Warm cream architectural concrete wall
  ctx.fillStyle = '#f5efe6';
  ctx.fillRect(0, 0, 1024, 512);

  // Subtle horizontal concrete floor slabs (3 floors)
  const floors = [70, 220, 370];
  floors.forEach((fy) => {
    // Window row background
    for (let col = 0; col < 10; col++) {
      if (col === 4 || col === 5) continue; // Center clock/entrance column

      const wx = 36 + col * 96;
      // Classroom window frame (aluminum silver-slate)
      ctx.fillStyle = '#334155';
      ctx.fillRect(wx, fy, 78, 92);

      // Sky-reflective classroom glass panes (4 panes per window)
      const paneGrad = ctx.createLinearGradient(wx, fy, wx + 78, fy + 92);
      paneGrad.addColorStop(0, '#7dd3fc');
      paneGrad.addColorStop(0.5, '#38bdf8');
      paneGrad.addColorStop(1, '#1e3a8a');
      ctx.fillStyle = paneGrad;
      ctx.fillRect(wx + 4, fy + 4, 33, 40);
      ctx.fillRect(wx + 41, fy + 4, 33, 40);
      ctx.fillRect(wx + 4, fy + 48, 33, 40);
      ctx.fillRect(wx + 41, fy + 48, 33, 40);

      // Sun glint streak on glass
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.beginPath();
      ctx.moveTo(wx + 8, fy + 8);
      ctx.lineTo(wx + 24, fy + 8);
      ctx.lineTo(wx + 12, fy + 38);
      ctx.closePath();
      ctx.fill();
    }

    // Concrete balcony railing below each floor
    ctx.fillStyle = '#e2d9c8';
    ctx.fillRect(0, fy + 94, 1024, 28);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, fy + 94, 1024, 28);
  });

  // Vertical structural pillars
  ctx.fillStyle = '#e7dfd3';
  for (let col = 0; col <= 10; col++) {
    ctx.fillRect(col * 96 + 18, 0, 12, 512);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.userData = { isSharedResource: true };
  cachedSchoolFacadeTex = tex;
  return tex;
}

/**
 * Generates the Red-and-White striped ceremonial curtain (紅白幕 — Kohaku-maku) for Honbu tents.
 */
let cachedKohakuTex: THREE.CanvasTexture | null = null;
function createKohakuMakuTexture(): THREE.CanvasTexture | null {
  if (cachedKohakuTex) return cachedKohakuTex;
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const stripes = 16;
  const sw = 512 / stripes;
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#e11d48' : '#ffffff';
    ctx.fillRect(i * sw, 0, sw, 128);
  }
  // Gold braided top cord
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(0, 0, 512, 14);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.userData = { isSharedResource: true };
  cachedKohakuTex = tex;
  return tex;
}

/**
 * Generates the main Undokai Stadium Wall Banner texture.
 */
function createUndokaiBannerTexture(schoolName = '二子玉川小'): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 1536;
  canvas.height = 384;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#0a2e16';
  ctx.fillRect(0, 0, 1536, 384);

  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 14;
  ctx.strokeRect(7, 7, 1522, 370);
  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 4;
  ctx.strokeRect(22, 22, 1492, 340);

  // Red Team Rosette
  ctx.fillStyle = '#e11d48';
  ctx.beginPath();
  ctx.arc(150, 192, 68, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 48px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('赤組', 150, 192);

  // White Team Rosette
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(1386, 192, 68, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.fillStyle = '#0f172a';
  ctx.font = '900 48px sans-serif';
  ctx.fillText('白組', 1386, 192);

  // Headlines
  ctx.fillStyle = '#fef08a';
  ctx.font = '800 30px sans-serif';
  ctx.fillText('令和八年度 • UNDOKAI BEAN BAG TOSS CHAMPIONSHIP', 768, 72);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 90px sans-serif';
  ctx.fillText(`${schoolName} 大運動会`, 768, 188);

  ctx.fillStyle = '#38bdf8';
  ctx.font = '800 38px sans-serif';
  ctx.fillText('🔴 玉入れ合戦 • TAMAIRE SHOWDOWN ⚪', 768, 304);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Generates the woven cotton & white-stitched texture for Japanese Otedama (お手玉) bean bags.
 */
const cachedBeanBagTexs: Record<string, THREE.CanvasTexture> = {};
function createStitchedBeanBagTexture(baseHex: string, stitchHex: string, isGold = false): THREE.CanvasTexture | null {
  const key = `${baseHex}_${stitchHex}_${isGold ? 'g' : 's'}`;
  if (cachedBeanBagTexs[key]) return cachedBeanBagTexs[key];
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 128, 128);

  // Fabric weave crosshatch
  ctx.strokeStyle = isGold ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.08)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 128; i += 4) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 128);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(128, i);
    ctx.stroke();
  }

  // Traditional seam stitching around the equator
  ctx.strokeStyle = stitchHex;
  ctx.lineWidth = 3;
  ctx.setLineDash([6, 4]);
  ctx.strokeRect(8, 8, 112, 112);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.userData = { isSharedResource: true };
  cachedBeanBagTexs[key] = tex;
  return tex;
}

// ----------------------------------------------------------------------------
// 4. Pooled Texture Atlases, Callout Pool & Batched/Instanced 3D Builders
// ----------------------------------------------------------------------------
interface BasketAssembly {
  root: THREE.Group;
  swayPivot: THREE.Group; // Pivots from base for realistic spring bending!
  rimCenterWorld: THREE.Vector3;
  innerBagsGroup: THREE.Group;
  innerBagsInst: THREE.InstancedMesh;
  innerBagBaseTransforms: Array<{
    pos: [number, number, number];
    rot: [number, number, number];
    matrix: THREE.Matrix4;
  }>;
  innerBagsNeedReset: boolean;
  moundMesh: THREE.Mesh; // Sculpted inner bean-bag mound core so fullness reads clearly from 30ft away
  rimPulseRing: THREE.Mesh; // Glowing shockwave ring on the metal hoop when a bag scores
  levelRingsInst: THREE.InstancedMesh; // 4 fullness gauge rings around the net cone
  netMesh: THREE.Mesh;
  linerMesh: THREE.Mesh;
  hoopY: number;
  springAngleX: number;
  springAngleZ: number;
  springVelX: number;
  springVelZ: number;
  hitSquash: number; // Squash-and-stretch net gulp impulse when a bag lands inside
  displayFillRatio: number; // Smoothed 0.0 -> 0.92 fill ratio (never overflows rim!)
}

/**
 * Computes a smooth, non-overflowing basket fill ratio in [0, 0.92].
 * - Early bags (1..25) visibly fill the bottom & middle of the basket quickly.
 * - High classroom scores (50..350+) asymptotically compact and bulge the net
 *   up toward 92% of the rim height without EVER overflowing before time expires.
 */
export function computeAdaptiveBasketFillRatio(score: number, teamPlayersCount = 20): number {
  if (score <= 0) return 0;
  // Scale knee adapts to class size so both a 6-student group and a 40-student class see rich progress
  const knee = Math.max(28, Math.min(90, teamPlayersCount * 3.2));
  const raw = 1 - Math.exp(-score / knee);
  // Clamp strictly to 0.92 so bags crown right below the metal rim hoop without spilling over
  return Math.min(0.92, raw * 0.94);
}

const THROWER_SKIN_TONES = [0xffe9d6, 0xffdfc4, 0xf6cfa9, 0xfff1e0, 0xf3c69f] as const;
const THROWER_HAIR_COLORS = [0x18130f, 0x2c1b10, 0x0f172a, 0x422614, 0x231912] as const;

let cachedFaceAtlasTex: THREE.CanvasTexture | null = null;
function getFaceAtlasTexture(): THREE.CanvasTexture | null {
  if (cachedFaceAtlasTex) return cachedFaceAtlasTex;
  if (typeof document === 'undefined') return null;

  const cellPx = 128;
  const cols = 5;
  const rows = 5;
  const canvas = document.createElement('canvas');
  canvas.width = cellPx * cols;
  canvas.height = cellPx * rows;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const skinHex = THROWER_SKIN_TONES[col];
      const hexStr = `#${skinHex.toString(16).padStart(6, '0')}`;
      ctx.save();
      ctx.translate(col * cellPx, row * cellPx);
      ctx.scale(0.5, 0.5); // Reuse 256x256 facial geometry cleanly inside 128x128 cell

      ctx.fillStyle = hexStr;
      ctx.fillRect(0, 0, 256, 256);

      // Rosy Undokai cheeks
      ctx.fillStyle = 'rgba(251, 113, 133, 0.55)';
      ctx.beginPath();
      ctx.ellipse(76, 152, 22, 13, 0, 0, Math.PI * 2);
      ctx.ellipse(180, 152, 22, 13, 0, 0, Math.PI * 2);
      ctx.fill();

      // Expressive Eyebrows
      ctx.strokeStyle = '#1e1b18';
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(68, 92);
      ctx.quadraticCurveTo(88, 82, 104, 92);
      ctx.moveTo(152, 92);
      ctx.quadraticCurveTo(168, 82, 188, 92);
      ctx.stroke();

      if (row === 4) {
        // Joyful squinting > < arc eyes!
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(88, 122, 16, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(168, 122, 16, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();
      } else {
        const drawEye = (ex: number, ey: number) => {
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.ellipse(ex, ey, 17, 21, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#1c1917';
          ctx.beginPath();
          ctx.ellipse(ex, ey + 1, 13, 17, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(ex - 5, ey - 6, 5.5, 0, Math.PI * 2);
          ctx.fill();

          ctx.beginPath();
          ctx.arc(ex + 5, ey + 6, 2.8, 0, Math.PI * 2);
          ctx.fill();
        };
        drawEye(88, 120);
        drawEye(168, 120);
      }

      // Cute Nose button
      ctx.fillStyle = 'rgba(180, 110, 75, 0.45)';
      ctx.beginPath();
      ctx.arc(128, 142, 4.5, 0, Math.PI * 2);
      ctx.fill();

      // Energetic Open Smile
      ctx.fillStyle = '#9f1239';
      ctx.beginPath();
      ctx.arc(128, 164, 20, 0.08, Math.PI - 0.08, false);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#fb7185';
      ctx.beginPath();
      ctx.arc(128, 174, 11, Math.PI, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(113, 164, 30, 5);
      ctx.restore();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.userData = { isSharedResource: true };
  cachedFaceAtlasTex = tex;
  return tex;
}

function getFaceAtlasRect(skinIdx: number, exprIdx: number): [number, number, number, number] {
  const cell = 128;
  const pad = 3;
  const w = 640;
  const h = 640;
  const c = skinIdx % 5;
  const r = exprIdx % 5;
  return [
    (c * cell + pad) / w,
    1 - ((r + 1) * cell - pad) / h,
    (cell - 2 * pad) / w,
    (cell - 2 * pad) / h
  ];
}

let cachedBibAtlasTex: THREE.CanvasTexture | null = null;
function getZekkenBibAtlasTexture(): THREE.CanvasTexture | null {
  if (cachedBibAtlasTex) return cachedBibAtlasTex;
  if (typeof document === 'undefined') return null;

  const cellPx = 128;
  const cols = 8;
  const rows = 5;
  const canvas = document.createElement('canvas');
  canvas.width = cellPx * cols; // 1024
  canvas.height = cellPx * rows; // 640
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  for (let slot = 0; slot < 40; slot++) {
    const team: 'red' | 'white' = slot < 20 ? 'red' : 'white';
    const num = (slot % 20) + 1;
    const col = slot % cols;
    const row = Math.floor(slot / cols);
    ctx.save();
    ctx.translate(col * cellPx, row * cellPx);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 128, 128);

    ctx.strokeStyle = team === 'red' ? '#e11d48' : '#2563eb';
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, 118, 118);

    ctx.fillStyle = team === 'red' ? '#be123c' : '#1e3a8a';
    ctx.font = '900 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(team === 'red' ? '赤組' : '白組', 64, 14);

    ctx.fillStyle = '#0f172a';
    ctx.font = '900 58px sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(num).padStart(2, '0'), 64, 78);
    ctx.restore();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.userData = { isSharedResource: true };
  cachedBibAtlasTex = tex;
  return tex;
}

function getZekkenAtlasRect(team: 'red' | 'white', bibNumZeroBased: number): [number, number, number, number] {
  const cell = 128;
  const pad = 2;
  const w = 1024;
  const h = 640;
  const slot = (team === 'red' ? 0 : 20) + (bibNumZeroBased % 20);
  const col = slot % 8;
  const row = Math.floor(slot / 8);
  return [
    (col * cell + pad) / w,
    1 - ((row + 1) * cell - pad) / h,
    (cell - 2 * pad) / w,
    (cell - 2 * pad) / h
  ];
}

let cachedBeanBagAtlasTex: THREE.CanvasTexture | null = null;
function getBeanBagAtlasTexture(): THREE.CanvasTexture | null {
  if (cachedBeanBagAtlasTex) return cachedBeanBagAtlasTex;
  if (typeof document === 'undefined') return null;

  const cellPx = 128;
  const canvas = document.createElement('canvas');
  canvas.width = cellPx * 3; // 384: red | white | gold
  canvas.height = cellPx;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const variants: Array<{ baseHex: string; stitchHex: string; isGold: boolean }> = [
    { baseHex: '#e11d48', stitchHex: '#fecdd3', isGold: false },
    { baseHex: '#f8fafc', stitchHex: '#94a3b8', isGold: false },
    { baseHex: '#f59e0b', stitchHex: '#fef08a', isGold: true }
  ];

  variants.forEach((v, idx) => {
    ctx.save();
    ctx.translate(idx * cellPx, 0);
    ctx.fillStyle = v.baseHex;
    ctx.fillRect(0, 0, 128, 128);

    if (v.isGold) {
      const shine = ctx.createRadialGradient(54, 48, 8, 64, 64, 72);
      shine.addColorStop(0, 'rgba(254, 249, 195, 0.72)');
      shine.addColorStop(1, 'rgba(245, 158, 11, 0)');
      ctx.fillStyle = shine;
      ctx.fillRect(0, 0, 128, 128);
    }

    ctx.strokeStyle = v.isGold ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.08)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 128; i += 4) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 128);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(128, i);
      ctx.stroke();
    }

    ctx.strokeStyle = v.stitchHex;
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(8, 8, 112, 112);
    ctx.restore();
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.userData = { isSharedResource: true };
  cachedBeanBagAtlasTex = tex;
  return tex;
}

function getBeanBagAtlasRect(variant: 'red' | 'white' | 'gold'): [number, number, number, number] {
  const col = variant === 'red' ? 0 : variant === 'white' ? 1 : 2;
  const pad = 2;
  return [(col * 128 + pad) / 384, pad / 128, (128 - 2 * pad) / 384, (128 - 2 * pad) / 128];
}

let cachedDualVertBannerTex: THREE.CanvasTexture | null = null;
function createDualVerticalBannerTexture(): THREE.CanvasTexture | null {
  if (cachedDualVertBannerTex) return cachedDualVertBannerTex;
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const drawPanel = (ox: number, text: string, bg: string, fg: string) => {
    ctx.save();
    ctx.translate(ox, 0);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 128, 512);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, 120, 504);

    ctx.fillStyle = fg;
    ctx.font = '900 54px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const chars = text.split('');
    const step = 440 / Math.max(1, chars.length);
    chars.forEach((ch, idx) => {
      ctx.fillText(ch, 64, 52 + idx * step);
    });
    ctx.restore();
  };

  drawPanel(0, '祝大運動会', '#e11d48', '#ffffff');
  drawPanel(128, '一致団結！', '#1e3a8a', '#fef08a');

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.userData = { isSharedResource: true };
  cachedDualVertBannerTex = tex;
  return tex;
}

interface CalloutSlot {
  sprite: THREE.Sprite;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D | null;
  tex: THREE.CanvasTexture;
  mat: THREE.SpriteMaterial;
  ownerId: string | null;
  lastKey: string;
  timer: number;
}

function createCalloutSpritePool(scene: THREE.Scene, maxSlots = 4) {
  const slots: CalloutSlot[] = [];
  for (let i = 0; i < maxSlots; i++) {
    const canvas = document.createElement('canvas');
    canvas.width = 420;
    canvas.height = 96;
    const ctx = canvas.getContext('2d');
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(1.65, 0.39, 1);
    sprite.visible = false;
    sprite.renderOrder = 25;
    scene.add(sprite);
    slots.push({ sprite, canvas, ctx, tex, mat, ownerId: null, lastKey: '', timer: 0 });
  }

  const trigger = (
    ownerId: string,
    nickname: string,
    team: 'red' | 'white',
    duration: number,
    isGold = false,
    isMiss = false
  ) => {
    let slot =
      slots.find((s) => s.ownerId === ownerId) ||
      slots.find((s) => !s.sprite.visible || s.timer <= 0) ||
      slots.reduce((lowest, cur) => (cur.timer < lowest.timer ? cur : lowest), slots[0]);

    const shortName = nickname.length > 10 ? `${nickname.slice(0, 9)}…` : nickname;
    const key = `${shortName}|${team}|${isGold ? 1 : 0}|${isMiss ? 1 : 0}`;
    if (slot.lastKey !== key && slot.ctx) {
      const ctx = slot.ctx;
      ctx.clearRect(0, 0, 420, 96);
      ctx.fillStyle = isMiss
        ? '#be123c'
        : isGold
          ? '#f59e0b'
          : team === 'red'
            ? '#e11d48'
            : '#0f172a';
      ctx.beginPath();
      ctx.roundRect(12, 12, 396, 72, 36);
      ctx.fill();

      ctx.strokeStyle = isMiss ? '#fbbf24' : isGold ? '#fef08a' : '#ffffff';
      ctx.lineWidth = 6;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 32px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const label = isMiss
        ? `💥 ${shortName} DOINK!`
        : `${shortName} ${isGold ? '🔥+2!' : '🎯+1!'}`;
      ctx.fillText(label, 210, 48);
      slot.tex.needsUpdate = true;
      slot.lastKey = key;
    }

    slot.ownerId = ownerId;
    slot.timer = duration;
    slot.sprite.visible = true;
  };

  const hideAll = () => {
    for (const s of slots) {
      s.timer = 0;
      s.sprite.visible = false;
      s.ownerId = null;
    }
  };

  const update = (dt: number, getAvatarPos: (ownerId: string) => THREE.Vector3 | null) => {
    for (const s of slots) {
      if (s.timer <= 0 || !s.ownerId) {
        s.sprite.visible = false;
        continue;
      }
      s.timer = Math.max(0, s.timer - dt);
      if (s.timer <= 0) {
        s.sprite.visible = false;
        s.ownerId = null;
        continue;
      }
      const base = getAvatarPos(s.ownerId);
      if (!base) {
        s.sprite.visible = false;
        continue;
      }
      const liftY = 1.55 + Math.max(0, 1.2 - s.timer) * 0.32;
      s.sprite.position.set(base.x, base.y + liftY, base.z);
    }
  };

  const dispose = () => {
    for (const s of slots) {
      scene.remove(s.sprite);
      s.tex.dispose();
      s.mat.dispose();
    }
  };

  return { trigger, hideAll, update, dispose };
}

interface ThrowerAvatarRig {
  id: string;
  nickname: string;
  team: 'red' | 'white';
  root: THREE.Object3D;
  shadowAnchor: THREE.Object3D;
  bodyPivot: THREE.Object3D;
  headGroup: THREE.Object3D;
  hairTailGroup: THREE.Object3D | null;
  armL: THREE.Object3D;
  armR: THREE.Object3D;
  legL: THREE.Object3D;
  legR: THREE.Object3D;
  kneeLAnchor: THREE.Object3D;
  kneeRAnchor: THREE.Object3D;
  earLAnchor: THREE.Object3D;
  earRAnchor: THREE.Object3D;
  heldBagAnchor: THREE.Object3D;
  hairTuftAnchors: THREE.Object3D[];
  hairTieAnchors: THREE.Object3D[];
  heldBagVisible: boolean;
  bibIndex: number;
  skinIndex: number;
  exprIndex: number;
  hairColor: THREE.Color;
  skinColor: THREE.Color;
  hairStyle: number; // 0..4
  usesCap: boolean;
  capColor: THREE.Color;
  hairTieColor: THREE.Color;
  ringTier: 0 | 1;
  baseAngle: number;
  radius: number;
  centerX: number;
  throwTimer: number;
  pickupPhase: number;
  heightScale: number;
}

function createThrowerRig(
  team: 'red' | 'white',
  index: number,
  studentId: string,
  nickname: string,
  centerX: number,
  radius: number,
  angle: number,
  ringTier: 0 | 1,
  bibIndex: number
): ThrowerAvatarRig {
  const root = new THREE.Object3D();
  const x = centerX + Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;
  root.position.set(x, 0, z);
  const heightScale = 0.92 + ((index * 17) % 10) * 0.018;
  root.scale.setScalar(heightScale);

  const shadowAnchor = new THREE.Object3D();
  shadowAnchor.position.y = 0.015;
  shadowAnchor.rotation.x = -Math.PI / 2;
  root.add(shadowAnchor);

  const bodyPivot = new THREE.Object3D();
  const angleToBasket = Math.atan2(centerX - x, 0 - z);
  const sinCam = Math.sin(angleToBasket);
  const cosCam = Math.cos(angleToBasket) * 0.45 + 0.55;
  bodyPivot.rotation.y = Math.atan2(sinCam, cosCam);
  root.add(bodyPivot);

  const makeLegRig = (lx: number) => {
    const legGroup = new THREE.Object3D();
    legGroup.position.set(lx, 0.38, 0);
    const kneeAnchor = new THREE.Object3D();
    kneeAnchor.position.set(0, -0.15, 0);
    kneeAnchor.scale.setScalar(0.064);
    legGroup.add(kneeAnchor);
    return { legGroup, kneeAnchor };
  };
  const { legGroup: legL, kneeAnchor: kneeLAnchor } = makeLegRig(-0.115);
  const { legGroup: legR, kneeAnchor: kneeRAnchor } = makeLegRig(0.115);
  bodyPivot.add(legL, legR);

  const armL = new THREE.Object3D();
  armL.position.set(-0.25, 0.74, 0);
  const armR = new THREE.Object3D();
  armR.position.set(0.25, 0.74, 0);
  bodyPivot.add(armL, armR);

  const heldBagAnchor = new THREE.Object3D();
  heldBagAnchor.position.set(0, -0.35, 0.06);
  heldBagAnchor.scale.set(1.22, 0.75, 1.0);
  armR.add(heldBagAnchor);

  const headGroup = new THREE.Object3D();
  headGroup.position.y = 1.03;
  bodyPivot.add(headGroup);

  const earLAnchor = new THREE.Object3D();
  earLAnchor.position.set(-0.245, -0.01, 0);
  earLAnchor.scale.set(0.052 * 0.55, 0.052, 0.052 * 0.75);
  const earRAnchor = new THREE.Object3D();
  earRAnchor.position.set(0.245, -0.01, 0);
  earRAnchor.scale.set(0.052 * 0.55, 0.052, 0.052 * 0.75);
  headGroup.add(earLAnchor, earRAnchor);

  const hairStyle = index % 5;
  let hairTailGroup: THREE.Object3D | null = null;
  const hairTuftAnchors: THREE.Object3D[] = [];
  const hairTieAnchors: THREE.Object3D[] = [];

  if (hairStyle === 0) {
    hairTailGroup = new THREE.Object3D();
    headGroup.add(hairTailGroup);
    [-1, 1].forEach((side) => {
      const tie = new THREE.Object3D();
      tie.position.set(side * 0.25, 0.05, -0.06);
      tie.scale.setScalar(0.045);
      hairTailGroup!.add(tie);
      hairTieAnchors.push(tie);

      const tail = new THREE.Object3D();
      tail.position.set(side * 0.32, -0.05, -0.08);
      tail.rotation.set(0.2, 0, side * 2.45);
      tail.scale.set(0.085, 0.28, 0.085);
      hairTailGroup!.add(tail);
      hairTuftAnchors.push(tail);
    });
  } else if (hairStyle === 1) {
    hairTailGroup = new THREE.Object3D();
    hairTailGroup.position.set(0, 0.12, -0.24);
    headGroup.add(hairTailGroup);

    const tie = new THREE.Object3D();
    tie.scale.set(0.05, 0.05, 0.036);
    hairTailGroup.add(tie);
    hairTieAnchors.push(tie);

    const tail = new THREE.Object3D();
    tail.position.set(0, -0.06, -0.12);
    tail.rotation.x = -2.1;
    tail.scale.set(0.095, 0.32, 0.095);
    hairTailGroup.add(tail);
    hairTuftAnchors.push(tail);
  } else if (hairStyle === 2) {
    [
      [-0.14, 0.22, -0.08, 0.45],
      [0.14, 0.22, -0.08, -0.45],
      [0, 0.26, -0.14, 0]
    ].forEach(([sx, sy, sz, rz]) => {
      const spike = new THREE.Object3D();
      spike.position.set(sx, sy, sz);
      spike.rotation.set(-0.35, 0, rz);
      spike.scale.set(0.065, 0.16, 0.065);
      headGroup.add(spike);
      hairTuftAnchors.push(spike);
    });
  } else if (hairStyle === 3) {
    [-0.22, 0.22].forEach((bx) => {
      const lock = new THREE.Object3D();
      lock.position.set(bx, -0.03, 0.04);
      lock.rotation.z = bx > 0 ? -0.15 : 0.15;
      lock.scale.set(0.062, 0.22, 0.062);
      headGroup.add(lock);
      hairTuftAnchors.push(lock);
    });
  }

  const skinIndex = index % THROWER_SKIN_TONES.length;
  const hairHex = THROWER_HAIR_COLORS[(index * 3) % THROWER_HAIR_COLORS.length];

  return {
    id: studentId,
    nickname,
    team,
    root,
    shadowAnchor,
    bodyPivot,
    headGroup,
    hairTailGroup,
    armL,
    armR,
    legL,
    legR,
    kneeLAnchor,
    kneeRAnchor,
    earLAnchor,
    earRAnchor,
    heldBagAnchor,
    hairTuftAnchors,
    hairTieAnchors,
    heldBagVisible: true,
    bibIndex,
    skinIndex,
    exprIndex: index % 5,
    hairColor: new THREE.Color(hairHex),
    skinColor: new THREE.Color(THROWER_SKIN_TONES[skinIndex]),
    hairStyle,
    usesCap: index % 2 === 0,
    capColor: new THREE.Color(team === 'red' ? 0xe11d48 : 0xf8fafc),
    hairTieColor: new THREE.Color(team === 'red' ? 0xf43f5e : 0x38bdf8),
    ringTier,
    baseAngle: angle,
    radius,
    centerX,
    throwTimer: 0,
    pickupPhase: index * 1.15,
    heightScale
  };
}

function createThrowerBatchPool(
  scene: THREE.Scene,
  shadowTex: THREE.Texture | null,
  bagAtlasTex: THREE.Texture | null,
  enableShadows: boolean
) {
  const MAX_STUDENTS = 40;
  const MAX_TEAM = 40;
  const whiteColor = new THREE.Color(0xffffff);
  const ownedGeos: THREE.BufferGeometry[] = [];
  const ownedMats: THREE.Material[] = [];
  const ownedInsts: THREE.InstancedMesh[] = [];

  const registerInst = (inst: THREE.InstancedMesh, capacity: number, initColor = false) => {
    inst.frustumCulled = false;
    inst.count = 0;
    if (initColor) {
      for (let i = 0; i < capacity; i++) inst.setColorAt(i, whiteColor);
      if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    }
    scene.add(inst);
    ownedInsts.push(inst);
    return inst;
  };

  // 1. Contact shadows (40 max)
  const shadowGeo = new THREE.PlaneGeometry(0.92, 0.92);
  ownedGeos.push(shadowGeo);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTex || undefined,
    color: shadowTex ? 0xffffff : 0x261a0e,
    transparent: true,
    opacity: shadowTex ? 0.85 : 0.35,
    depthWrite: false
  });
  ownedMats.push(shadowMat);
  const shadowInst = registerInst(new THREE.InstancedMesh(shadowGeo, shadowMat, MAX_STUDENTS), MAX_STUDENTS);

  // 2. Red & White Torso (pelvis + gym shirt + shoulder caps + collar)
  const buildTorsoGeo = (teamColor: number) => {
    const g = mergeBakedGeos([
      bakePartGeo(new THREE.SphereGeometry(0.21, 12, 10), { color: 0x1e293b, pos: [0, 0.37, 0], scale: [1.02, 0.62, 0.88] }),
      bakePartGeo(new THREE.CylinderGeometry(0.185, 0.215, 0.44, 16), { color: 0xffffff, pos: [0, 0.58, 0], scale: [1.06, 1, 0.86] }),
      bakePartGeo(new THREE.SphereGeometry(0.088, 10, 8), { color: 0xffffff, pos: [-0.21, 0.74, 0] }),
      bakePartGeo(new THREE.SphereGeometry(0.088, 10, 8), { color: 0xffffff, pos: [0.21, 0.74, 0] }),
      bakePartGeo(new THREE.TorusGeometry(0.138, 0.03, 8, 18), { color: teamColor, pos: [0, 0.79, 0], rot: [Math.PI / 2, 0, 0] })
    ]);
    ownedGeos.push(g);
    return g;
  };
  const vertexRimMat = injectWiiSatinRimShader(
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.48 })
  );
  ownedMats.push(vertexRimMat);
  const torsoRedInst = registerInst(new THREE.InstancedMesh(buildTorsoGeo(0xe11d48), vertexRimMat, MAX_TEAM), MAX_TEAM);
  torsoRedInst.castShadow = enableShadows;
  const torsoWhiteInst = registerInst(new THREE.InstancedMesh(buildTorsoGeo(0x2563eb), vertexRimMat, MAX_TEAM), MAX_TEAM);
  torsoWhiteInst.castShadow = enableShadows;

  // 3. Zekken Bibs (Front + Back merged with atlas UV)
  const bibTex = getZekkenBibAtlasTexture();
  const bibGeo = mergeBakedGeos([
    bakePartGeo(new THREE.PlaneGeometry(0.24, 0.24), { pos: [0, 0.58, 0.188], keepUv: true }),
    bakePartGeo(new THREE.PlaneGeometry(0.24, 0.24), { pos: [0, 0.58, -0.188], rot: [0, Math.PI, 0], keepUv: true })
  ]);
  const bibAtlasData = new Float32Array(MAX_STUDENTS * 4);
  const bibAtlasAttr = new THREE.InstancedBufferAttribute(bibAtlasData, 4);
  bibGeo.setAttribute('aAtlasRect', bibAtlasAttr);
  ownedGeos.push(bibGeo);
  const bibMat = applyInstancedAtlasMaterial(
    new THREE.MeshStandardMaterial({ map: bibTex || undefined, color: 0xffffff, roughness: 0.55 }),
    false
  );
  ownedMats.push(bibMat);
  const bibInst = registerInst(new THREE.InstancedMesh(bibGeo, bibMat, MAX_STUDENTS), MAX_STUDENTS);

  // 4. Red & White Legs (shorts + sock + sock stripe + sneaker upper + sole) — 2 legs * 40
  const buildLegGeo = (teamColor: number) => {
    const g = mergeBakedGeos([
      bakePartGeo(new THREE.CylinderGeometry(0.095, 0.086, 0.16, 12), { color: 0x1e293b, pos: [0, -0.06, 0] }),
      bakePartGeo(new THREE.CylinderGeometry(0.066, 0.058, 0.14, 10), { color: 0xffffff, pos: [0, -0.24, 0] }),
      bakePartGeo(new THREE.TorusGeometry(0.064, 0.01, 6, 14), { color: teamColor, pos: [0, -0.19, 0], rot: [Math.PI / 2, 0, 0] }),
      bakePartGeo(new THREE.SphereGeometry(0.075, 10, 8), { color: teamColor, pos: [0, -0.32, 0.03], scale: [0.95, 0.65, 1.45] }),
      bakePartGeo(new THREE.CylinderGeometry(0.072, 0.075, 0.032, 10), { color: 0xf8fafc, pos: [0, -0.35, 0.03], scale: [0.95, 1, 1.45] })
    ]);
    ownedGeos.push(g);
    return g;
  };
  const legRedInst = registerInst(new THREE.InstancedMesh(buildLegGeo(0xe11d48), vertexRimMat, MAX_TEAM * 2), MAX_TEAM * 2);
  legRedInst.castShadow = enableShadows;
  const legWhiteInst = registerInst(new THREE.InstancedMesh(buildLegGeo(0x2563eb), vertexRimMat, MAX_TEAM * 2), MAX_TEAM * 2);
  legWhiteInst.castShadow = enableShadows;

  // 5. Shared Skin Spheres (80 knees + 80 ears = 160 max)
  const skinMat = injectWiiSatinRimShader(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.42 }));
  ownedMats.push(skinMat);
  const skinSphereGeo = new THREE.SphereGeometry(1, 8, 8);
  ownedGeos.push(skinSphereGeo);
  const skinSphereInst = registerInst(new THREE.InstancedMesh(skinSphereGeo, skinMat, MAX_STUDENTS * 4), MAX_STUDENTS * 4, true);

  // 6. Arm Sleeves (Red / White) + Forearm+Hand Skin
  const buildSleeveGeo = (teamColor: number) => {
    const g = mergeBakedGeos([
      bakePartGeo(new THREE.CylinderGeometry(0.074, 0.068, 0.15, 10), { color: 0xffffff, pos: [0, -0.05, 0] }),
      bakePartGeo(new THREE.TorusGeometry(0.068, 0.012, 6, 14), { color: teamColor, pos: [0, -0.12, 0], rot: [Math.PI / 2, 0, 0] })
    ]);
    ownedGeos.push(g);
    return g;
  };
  const sleeveRedInst = registerInst(new THREE.InstancedMesh(buildSleeveGeo(0xe11d48), vertexRimMat, MAX_TEAM * 2), MAX_TEAM * 2);
  const sleeveWhiteInst = registerInst(new THREE.InstancedMesh(buildSleeveGeo(0x2563eb), vertexRimMat, MAX_TEAM * 2), MAX_TEAM * 2);

  const armSkinGeo = mergeBakedGeos([
    bakePartGeo(new THREE.CylinderGeometry(0.052, 0.048, 0.21, 10), { pos: [0, -0.19, 0] }),
    bakePartGeo(new THREE.SphereGeometry(0.064, 10, 10), { pos: [0, -0.31, 0] })
  ]);
  ownedGeos.push(armSkinGeo);
  const armSkinInst = registerInst(new THREE.InstancedMesh(armSkinGeo, skinMat, MAX_STUDENTS * 2), MAX_STUDENTS * 2, true);

  // 7. Held Bean Bags (Red + White sharing bagAtlasTex)
  const heldBagGeo = new THREE.SphereGeometry(0.115, 10, 8);
  const heldBagAtlasData = new Float32Array(MAX_STUDENTS * 4);
  const heldBagAtlasAttr = new THREE.InstancedBufferAttribute(heldBagAtlasData, 4);
  heldBagGeo.setAttribute('aAtlasRect', heldBagAtlasAttr);
  ownedGeos.push(heldBagGeo);
  const bagAtlasMat = applyInstancedAtlasMaterial(
    new THREE.MeshStandardMaterial({ map: bagAtlasTex || undefined, color: 0xffffff, roughness: 0.6 }),
    true
  );
  ownedMats.push(bagAtlasMat);
  const heldBagInst = registerInst(new THREE.InstancedMesh(heldBagGeo, bagAtlasMat, MAX_STUDENTS), MAX_STUDENTS);

  // 8. Mii Heads (Face Atlas)
  const faceAtlasTex = getFaceAtlasTexture();
  const headGeo = new THREE.SphereGeometry(0.245, 22, 18);
  headGeo.rotateY(-Math.PI / 2);
  headGeo.scale(1.04, 0.98, 1.0);
  const headAtlasData = new Float32Array(MAX_STUDENTS * 4);
  const headAtlasAttr = new THREE.InstancedBufferAttribute(headAtlasData, 4);
  headGeo.setAttribute('aAtlasRect', headAtlasAttr);
  ownedGeos.push(headGeo);
  const headMat = applyInstancedAtlasMaterial(
    new THREE.MeshStandardMaterial({ map: faceAtlasTex || undefined, color: 0xffffff, roughness: 0.4 }),
    true
  );
  ownedMats.push(headMat);
  const headInst = registerInst(new THREE.InstancedMesh(headGeo, headMat, MAX_STUDENTS), MAX_STUDENTS);
  headInst.castShadow = enableShadows;

  // 9. Hair Base (Back cap + 5 fringe bangs)
  const hairBaseParts: THREE.BufferGeometry[] = [
    bakePartGeo(new THREE.SphereGeometry(0.256, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.56), { rot: [-0.28, 0, 0] })
  ];
  for (let b = -2; b <= 2; b++) {
    hairBaseParts.push(
      bakePartGeo(new THREE.ConeGeometry(0.048, 0.13, 6), {
        pos: [b * 0.058, 0.13, 0.215 - Math.abs(b) * 0.018],
        rot: [Math.PI - 0.35, 0, b * -0.12]
      })
    );
  }
  const hairBaseGeo = mergeBakedGeos(hairBaseParts);
  ownedGeos.push(hairBaseGeo);
  const hairMat = injectWiiSatinRimShader(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.58 }));
  ownedMats.push(hairMat);
  const hairBaseInst = registerInst(new THREE.InstancedMesh(hairBaseGeo, hairMat, MAX_STUDENTS), MAX_STUDENTS, true);

  // 10. Unified Hair Tufts (pigtails, ponytails, shonen spikes, bob locks — max 3 per student = 120)
  const hairTuftGeo = new THREE.ConeGeometry(1, 1, 8);
  ownedGeos.push(hairTuftGeo);
  const hairTuftInst = registerInst(new THREE.InstancedMesh(hairTuftGeo, hairMat, MAX_STUDENTS * 3), MAX_STUDENTS * 3, true);

  // 11. Hair Ties (max 2 per student = 80)
  const hairTieGeo = new THREE.SphereGeometry(1, 8, 8);
  ownedGeos.push(hairTieGeo);
  const hairTieMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35 });
  ownedMats.push(hairTieMat);
  const hairTieInst = registerInst(new THREE.InstancedMesh(hairTieGeo, hairTieMat, MAX_STUDENTS * 2), MAX_STUDENTS * 2, true);

  // 12. Headgear: Kohaku-bo Cap & Hachimaki Headband
  const capGeo = mergeBakedGeos([
    bakePartGeo(new THREE.SphereGeometry(0.258, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.48), { pos: [0, 0.02, 0], rot: [-0.12, 0, 0] }),
    bakePartGeo(new THREE.CylinderGeometry(0.24, 0.24, 0.024, 16, 1, false, -0.9, 1.8), { pos: [0, 0.11, 0.12], rot: [0.22, 0, 0] })
  ]);
  ownedGeos.push(capGeo);
  const capMat = injectWiiSatinRimShader(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.42 }));
  ownedMats.push(capMat);
  const capInst = registerInst(new THREE.InstancedMesh(capGeo, capMat, MAX_STUDENTS), MAX_STUDENTS, true);

  const hachimakiGeo = mergeBakedGeos([
    bakePartGeo(new THREE.TorusGeometry(0.246, 0.035, 10, 24), { pos: [0, 0.08, 0], rot: [Math.PI / 2 - 0.12, 0, 0] }),
    bakePartGeo(new THREE.SphereGeometry(0.052, 8, 8), { pos: [0, 0.1, -0.25] }),
    bakePartGeo(new THREE.BoxGeometry(0.044, 0.18, 0.016), { pos: [-0.045, 0.02, -0.27], rot: [0, 0, 0.28] }),
    bakePartGeo(new THREE.BoxGeometry(0.044, 0.18, 0.016), { pos: [0.045, 0.02, -0.27], rot: [0, 0, -0.28] })
  ]);
  ownedGeos.push(hachimakiGeo);
  const hachimakiInst = registerInst(new THREE.InstancedMesh(hachimakiGeo, capMat, MAX_STUDENTS), MAX_STUDENTS, true);

  const redBagRect = getBeanBagAtlasRect('red');
  const whiteBagRect = getBeanBagAtlasRect('white');
  const writeRect = (arr: Float32Array, idx: number, r: [number, number, number, number]) => {
    const o = idx * 4;
    arr[o] = r[0];
    arr[o + 1] = r[1];
    arr[o + 2] = r[2];
    arr[o + 3] = r[3];
  };

  let appearanceDirty = true;
  const markDirty = () => {
    appearanceDirty = true;
  };

  const sync = (
    rigs: ThrowerAvatarRig[],
    firstPersonHero: ThrowerAvatarRig | undefined
  ) => {
    const count = Math.min(MAX_STUDENTS, rigs.length);
    let redBodyC = 0;
    let whiteBodyC = 0;
    let redLegC = 0;
    let whiteLegC = 0;
    let skinSphereC = 0;
    let armSkinC = 0;
    let redSleeveC = 0;
    let whiteSleeveC = 0;
    let heldBagC = 0;
    let headC = 0;
    let hairBaseC = 0;
    let hairTuftC = 0;
    let hairTieC = 0;
    let capC = 0;
    let hachiC = 0;

    for (let i = 0; i < count; i++) {
      const rig = rigs[i];
      rig.root.updateMatrixWorld(true);
      const isFpsHero = firstPersonHero === rig;

      shadowInst.setMatrixAt(i, rig.shadowAnchor.matrixWorld);

      if (rig.team === 'red') {
        torsoRedInst.setMatrixAt(redBodyC++, rig.bodyPivot.matrixWorld);
        legRedInst.setMatrixAt(redLegC++, rig.legL.matrixWorld);
        legRedInst.setMatrixAt(redLegC++, rig.legR.matrixWorld);
        sleeveRedInst.setMatrixAt(redSleeveC++, rig.armL.matrixWorld);
        sleeveRedInst.setMatrixAt(redSleeveC++, rig.armR.matrixWorld);
      } else {
        torsoWhiteInst.setMatrixAt(whiteBodyC++, rig.bodyPivot.matrixWorld);
        legWhiteInst.setMatrixAt(whiteLegC++, rig.legL.matrixWorld);
        legWhiteInst.setMatrixAt(whiteLegC++, rig.legR.matrixWorld);
        sleeveWhiteInst.setMatrixAt(whiteSleeveC++, rig.armL.matrixWorld);
        sleeveWhiteInst.setMatrixAt(whiteSleeveC++, rig.armR.matrixWorld);
      }

      bibInst.setMatrixAt(i, rig.bodyPivot.matrixWorld);
      if (appearanceDirty) {
        writeRect(bibAtlasData, i, getZekkenAtlasRect(rig.team, rig.bibIndex));
      }

      skinSphereInst.setMatrixAt(skinSphereC, rig.kneeLAnchor.matrixWorld);
      skinSphereInst.setColorAt(skinSphereC, rig.skinColor);
      skinSphereC++;
      skinSphereInst.setMatrixAt(skinSphereC, rig.kneeRAnchor.matrixWorld);
      skinSphereInst.setColorAt(skinSphereC, rig.skinColor);
      skinSphereC++;

      armSkinInst.setMatrixAt(armSkinC, rig.armL.matrixWorld);
      if (appearanceDirty) armSkinInst.setColorAt(armSkinC, rig.skinColor);
      armSkinC++;
      armSkinInst.setMatrixAt(armSkinC, rig.armR.matrixWorld);
      if (appearanceDirty) armSkinInst.setColorAt(armSkinC, rig.skinColor);
      armSkinC++;

      if (rig.heldBagVisible) {
        heldBagInst.setMatrixAt(heldBagC, rig.heldBagAnchor.matrixWorld);
        writeRect(heldBagAtlasData, heldBagC, rig.team === 'red' ? redBagRect : whiteBagRect);
        heldBagC++;
      }

      if (!isFpsHero) {
        headInst.setMatrixAt(headC, rig.headGroup.matrixWorld);
        writeRect(headAtlasData, headC, getFaceAtlasRect(rig.skinIndex, rig.exprIndex));
        headC++;

        skinSphereInst.setMatrixAt(skinSphereC, rig.earLAnchor.matrixWorld);
        skinSphereInst.setColorAt(skinSphereC, rig.skinColor);
        skinSphereC++;
        skinSphereInst.setMatrixAt(skinSphereC, rig.earRAnchor.matrixWorld);
        skinSphereInst.setColorAt(skinSphereC, rig.skinColor);
        skinSphereC++;

        hairBaseInst.setMatrixAt(hairBaseC, rig.headGroup.matrixWorld);
        hairBaseInst.setColorAt(hairBaseC, rig.hairColor);
        hairBaseC++;

        for (let t = 0; t < rig.hairTuftAnchors.length; t++) {
          hairTuftInst.setMatrixAt(hairTuftC, rig.hairTuftAnchors[t].matrixWorld);
          hairTuftInst.setColorAt(hairTuftC, rig.hairColor);
          hairTuftC++;
        }
        for (let t = 0; t < rig.hairTieAnchors.length; t++) {
          hairTieInst.setMatrixAt(hairTieC, rig.hairTieAnchors[t].matrixWorld);
          hairTieInst.setColorAt(hairTieC, rig.hairTieColor);
          hairTieC++;
        }

        if (rig.usesCap) {
          capInst.setMatrixAt(capC, rig.headGroup.matrixWorld);
          capInst.setColorAt(capC, rig.capColor);
          capC++;
        } else {
          hachimakiInst.setMatrixAt(hachiC, rig.headGroup.matrixWorld);
          hachimakiInst.setColorAt(hachiC, rig.capColor);
          hachiC++;
        }
      }
    }

    shadowInst.count = count;
    shadowInst.instanceMatrix.needsUpdate = true;

    torsoRedInst.count = redBodyC;
    torsoRedInst.instanceMatrix.needsUpdate = true;
    torsoWhiteInst.count = whiteBodyC;
    torsoWhiteInst.instanceMatrix.needsUpdate = true;

    bibInst.count = count;
    bibInst.instanceMatrix.needsUpdate = true;
    if (appearanceDirty) bibAtlasAttr.needsUpdate = true;

    legRedInst.count = redLegC;
    legRedInst.instanceMatrix.needsUpdate = true;
    legWhiteInst.count = whiteLegC;
    legWhiteInst.instanceMatrix.needsUpdate = true;

    skinSphereInst.count = skinSphereC;
    skinSphereInst.instanceMatrix.needsUpdate = true;
    if (skinSphereInst.instanceColor) skinSphereInst.instanceColor.needsUpdate = true;

    sleeveRedInst.count = redSleeveC;
    sleeveRedInst.instanceMatrix.needsUpdate = true;
    sleeveWhiteInst.count = whiteSleeveC;
    sleeveWhiteInst.instanceMatrix.needsUpdate = true;

    armSkinInst.count = armSkinC;
    armSkinInst.instanceMatrix.needsUpdate = true;
    if (appearanceDirty && armSkinInst.instanceColor) armSkinInst.instanceColor.needsUpdate = true;

    heldBagInst.count = heldBagC;
    heldBagInst.visible = heldBagC > 0;
    heldBagInst.instanceMatrix.needsUpdate = true;
    heldBagAtlasAttr.needsUpdate = true;

    headInst.count = headC;
    headInst.instanceMatrix.needsUpdate = true;
    headAtlasAttr.needsUpdate = true;

    hairBaseInst.count = hairBaseC;
    hairBaseInst.instanceMatrix.needsUpdate = true;
    if (hairBaseInst.instanceColor) hairBaseInst.instanceColor.needsUpdate = true;

    hairTuftInst.count = hairTuftC;
    hairTuftInst.visible = hairTuftC > 0;
    hairTuftInst.instanceMatrix.needsUpdate = true;
    if (hairTuftInst.instanceColor) hairTuftInst.instanceColor.needsUpdate = true;

    hairTieInst.count = hairTieC;
    hairTieInst.visible = hairTieC > 0;
    hairTieInst.instanceMatrix.needsUpdate = true;
    if (hairTieInst.instanceColor) hairTieInst.instanceColor.needsUpdate = true;

    capInst.count = capC;
    capInst.visible = capC > 0;
    capInst.instanceMatrix.needsUpdate = true;
    if (capInst.instanceColor) capInst.instanceColor.needsUpdate = true;

    hachimakiInst.count = hachiC;
    hachimakiInst.visible = hachiC > 0;
    hachimakiInst.instanceMatrix.needsUpdate = true;
    if (hachimakiInst.instanceColor) hachimakiInst.instanceColor.needsUpdate = true;

    appearanceDirty = false;
  };

  const dispose = () => {
    ownedInsts.forEach((inst) => {
      scene.remove(inst);
      inst.dispose();
    });
    ownedGeos.forEach((g) => g.dispose());
    ownedMats.forEach((m) => m.dispose());
  };

  return { sync, markDirty, dispose, bagAtlasMat };
}

interface FlyingBeanBag {
  active: boolean;
  team: 'red' | 'white';
  isGolden: boolean;
  isNearMiss: boolean; // True if this bag clanks off the rim & bounces onto the sand!
  hasBounced: boolean;
  pos: THREE.Vector3;
  rot: THREE.Euler;
  scaleMult: number;
  trailPos: THREE.Vector3;
  trailTarget: THREE.Vector3;
  trailColor: THREE.Color;
  showTrail: boolean;
  startPos: THREE.Vector3;
  midPos: THREE.Vector3;
  targetPos: THREE.Vector3;
  bounceVel: THREE.Vector3;
  progress: number;
  duration: number;
  spinAxis: THREE.Vector3;
}

interface BurstParticle {
  pos: THREE.Vector3;
  scale: number;
  rotY: number;
  color: THREE.Color;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  isDust: boolean;
}

/**
 * Builds a tall Japanese Tamaire Basket Pole (玉入れカゴ) with a spring-hinged pole,
 * woven diamond net, red-white spiral pole wrap (merged into 1 hardware mesh),
 * 4 fullness gauge rings (1 InstancedMesh), and 64 inner stackable bags (1 InstancedMesh).
 */
function buildTamaireBasketPole(
  team: 'red' | 'white',
  xPos: number,
  bagMat: THREE.Material,
  bagAtlasMat: THREE.Material,
  enableShadows: boolean
): BasketAssembly {
  const root = new THREE.Group();
  root.position.set(xPos, 0, 0);

  // Sway Pivot Group (hinged at y=0.12 so the entire 4.3m pole bends with spring physics!)
  const swayPivot = new THREE.Group();
  swayPivot.position.y = 0.12;
  root.add(swayPivot);

  const poleHeight = 4.25;
  const stripeCount = 9;
  const segH = poleHeight / stripeCount;
  const rimY = poleHeight + 0.12;
  const netHeight = 0.98;
  const netTopRadius = 0.72;
  const netBottomRadius = 0.34;
  const netCenterY = rimY - netHeight * 0.5;

  // 1. Merge 9 pole stripes + 3 collars + top rim hoop + 4 spokes + net bottom disc into 1 draw call!
  const hwParts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < stripeCount; i++) {
    hwParts.push(
      bakePartGeo(new THREE.CylinderGeometry(0.068, 0.078, segH, 16), {
        color: i % 2 === 0 ? 0xf8fafc : 0xe11d48,
        pos: [0, segH * i + segH * 0.5, 0]
      })
    );
  }
  [1.4, 2.8, poleHeight - 0.1].forEach((cy) => {
    hwParts.push(
      bakePartGeo(new THREE.TorusGeometry(0.082, 0.02, 10, 20), {
        color: 0xf59e0b,
        pos: [0, cy, 0],
        rot: [Math.PI / 2, 0, 0]
      })
    );
  });
  hwParts.push(
    bakePartGeo(new THREE.TorusGeometry(0.74, 0.052, 16, 36), {
      color: team === 'red' ? 0xf43f5e : 0xf8fafc,
      pos: [0, rimY, 0],
      rot: [Math.PI / 2, 0, 0]
    })
  );
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2;
    hwParts.push(
      bakePartGeo(new THREE.CylinderGeometry(0.018, 0.018, 0.85, 8), {
        color: 0xf59e0b,
        pos: [Math.cos(angle) * 0.36, rimY - 0.38, Math.sin(angle) * 0.36],
        rot: [Math.sin(angle) * 0.78, 0, Math.cos(angle) * -0.78]
      })
    );
  }
  hwParts.push(
    bakePartGeo(new THREE.CylinderGeometry(netBottomRadius, 0.26, 0.08, 16), {
      color: team === 'red' ? 0xe11d48 : 0x475569,
      pos: [0, rimY - netHeight, 0]
    })
  );

  const hwMesh = new THREE.Mesh(
    mergeBakedGeos(hwParts),
    injectWiiSatinRimShader(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.22 }))
  );
  hwMesh.castShadow = enableShadows;
  swayPivot.add(hwMesh);

  // 2. Woven Mesh Net Cone & Translucent Liner
  const netMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(netTopRadius, netBottomRadius, netHeight, 22, 8, true),
    new THREE.MeshStandardMaterial({
      color: team === 'red' ? 0xffedd5 : 0xe2e8f0,
      roughness: 0.7,
      wireframe: true,
      side: THREE.DoubleSide
    })
  );
  netMesh.position.y = netCenterY;
  swayPivot.add(netMesh);

  const linerMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(netTopRadius - 0.02, netBottomRadius - 0.01, netHeight - 0.02, 22, 1, true),
    new THREE.MeshBasicMaterial({
      color: team === 'red' ? 0xffe4e6 : 0xf1f5f9,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
      depthWrite: false
    })
  );
  linerMesh.position.y = netCenterY;
  swayPivot.add(linerMesh);

  // 3. 4 Horizontal Fullness Gauge Rings merged into 1 InstancedMesh
  const ringGeo = new THREE.TorusGeometry(1.0, 0.022, 8, 28);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 });
  const levelRingsInst = new THREE.InstancedMesh(ringGeo, ringMat, 4);
  levelRingsInst.frustumCulled = false;
  const dummyRing = new THREE.Object3D();
  const baseRingColor = new THREE.Color(team === 'red' ? 0xfda4af : 0x93c5fd).multiplyScalar(0.35);
  [0.22, 0.46, 0.7, 0.88].forEach((t, r) => {
    const rAtHeight = netBottomRadius + (netTopRadius - netBottomRadius) * t + 0.012;
    const yAtHeight = rimY - netHeight + t * netHeight;
    dummyRing.position.set(0, yAtHeight, 0);
    dummyRing.rotation.set(Math.PI / 2, 0, 0);
    dummyRing.scale.set(rAtHeight, rAtHeight, 0.55);
    dummyRing.updateMatrix();
    levelRingsInst.setMatrixAt(r, dummyRing.matrix);
    levelRingsInst.setColorAt(r, baseRingColor);
  });
  levelRingsInst.instanceMatrix.needsUpdate = true;
  if (levelRingsInst.instanceColor) levelRingsInst.instanceColor.needsUpdate = true;
  swayPivot.add(levelRingsInst);

  // 4. Glowing Rim Shockwave Ring
  const rimPulseRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.76, 0.036, 12, 36),
    new THREE.MeshBasicMaterial({
      color: team === 'red' ? 0xfb7185 : 0x38bdf8,
      transparent: true,
      opacity: 0.0,
      depthWrite: false
    })
  );
  rimPulseRing.rotation.x = Math.PI / 2;
  rimPulseRing.position.y = rimY + 0.03;
  rimPulseRing.visible = false;
  swayPivot.add(rimPulseRing);

  // 5. Adaptive Non-Overflowing Inner Bean Bag Volume (Mound Core + 64 Surface Bags in 1 InstancedMesh)
  const innerBagsGroup = new THREE.Group();
  const netFloorY = rimY - netHeight + 0.05;
  innerBagsGroup.position.y = netFloorY;
  swayPivot.add(innerBagsGroup);

  const moundGeo = new THREE.CylinderGeometry(0.58, netBottomRadius * 0.85, 0.78, 18, 4);
  const mPos = moundGeo.attributes.position;
  for (let i = 0; i < mPos.count; i++) {
    const vy = mPos.getY(i);
    if (vy > 0.3) {
      const distFromCenter = Math.hypot(mPos.getX(i), mPos.getZ(i));
      mPos.setY(i, vy + Math.max(0, 0.58 - distFromCenter) * 0.22);
    }
  }
  moundGeo.computeVertexNormals();
  moundGeo.translate(0, 0.39, 0);
  const moundMesh = new THREE.Mesh(moundGeo, bagMat);
  moundMesh.visible = false;
  moundMesh.scale.set(0.6, 0.01, 0.6);
  innerBagsGroup.add(moundMesh);

  const totalSlots = 64;
  const bagsPerLayer = 8;
  const bagGeo = new THREE.SphereGeometry(0.132, 12, 10);
  bagGeo.scale(1.24, 0.76, 1.06);
  const innerRect = getBeanBagAtlasRect(team);
  const innerAtlasArr = new Float32Array(totalSlots * 4);
  for (let i = 0; i < totalSlots; i++) {
    innerAtlasArr[i * 4] = innerRect[0];
    innerAtlasArr[i * 4 + 1] = innerRect[1];
    innerAtlasArr[i * 4 + 2] = innerRect[2];
    innerAtlasArr[i * 4 + 3] = innerRect[3];
  }
  bagGeo.setAttribute('aAtlasRect', new THREE.InstancedBufferAttribute(innerAtlasArr, 4));
  const innerBagsInst = new THREE.InstancedMesh(bagGeo, bagAtlasMat, totalSlots);
  innerBagsInst.frustumCulled = false;
  innerBagsInst.count = 0;
  innerBagsInst.visible = false;

  const innerBagBaseTransforms: BasketAssembly['innerBagBaseTransforms'] = [];
  const dummyBag = new THREE.Object3D();
  for (let i = 0; i < totalSlots; i++) {
    const layer = Math.floor(i / bagsPerLayer);
    const idxInLayer = i % bagsPerLayer;
    const layerNorm = layer / 7;
    const maxRadiusAtLayer = netBottomRadius * 0.72 + (netTopRadius * 0.78 - netBottomRadius * 0.72) * layerNorm;
    const ringRadius = idxInLayer === 0 ? 0 : maxRadiusAtLayer * (idxInLayer % 2 === 0 ? 0.92 : 0.62);
    const angle = (idxInLayer / (bagsPerLayer - 1)) * Math.PI * 2 + layer * 0.78;
    const yPos = 0.06 + layerNorm * 0.74 + (idxInLayer === 0 ? 0.04 : 0);

    const pos: [number, number, number] = [Math.cos(angle) * ringRadius, yPos, Math.sin(angle) * ringRadius];
    const rot: [number, number, number] = [Math.sin(i * 1.7) * 0.45, i * 1.1, Math.cos(i * 1.3) * 0.4];
    dummyBag.position.set(...pos);
    dummyBag.rotation.set(...rot);
    dummyBag.scale.set(1, 1, 1);
    dummyBag.updateMatrix();
    const matrix = dummyBag.matrix.clone();
    innerBagsInst.setMatrixAt(i, matrix);
    innerBagBaseTransforms.push({ pos, rot, matrix });
  }
  innerBagsInst.instanceMatrix.needsUpdate = true;
  innerBagsGroup.add(innerBagsInst);

  return {
    root,
    swayPivot,
    rimCenterWorld: new THREE.Vector3(xPos, rimY + 0.12, 0),
    innerBagsGroup,
    innerBagsInst,
    innerBagBaseTransforms,
    innerBagsNeedReset: false,
    moundMesh,
    rimPulseRing,
    levelRingsInst,
    netMesh,
    linerMesh,
    hoopY: rimY,
    springAngleX: 0,
    springAngleZ: 0,
    springVelX: 0,
    springVelZ: 0,
    hitSquash: 0,
    displayFillRatio: 0
  };
}

interface SpectatorAnimData {
  baseX: number;
  baseY: number;
  baseZ: number;
  rotY: number;
  capColor: number;
  pomColor: number;
}

/**
 * Builds all static schoolyard arena scenery merged by material into minimal draw calls
 * (School building, banners, tents, spectator InstancedMeshes, trees, mountains, clouds, bunting,
 * pebbles, chalk lines, running track lanes, basket bases).
 */
function buildUndokaiArenaEnvironment(
  scene: THREE.Scene,
  schoolName: string,
  kohakuTex: THREE.Texture | null,
  enableShadows: boolean
) {
  const matteParts: THREE.BufferGeometry[] = [];
  const metalParts: THREE.BufferGeometry[] = [];
  const paintedParts: THREE.BufferGeometry[] = [];
  const kohakuParts: THREE.BufferGeometry[] = [];
  const trackChalkParts: THREE.BufferGeometry[] = [];
  const zoneDiscParts: THREE.BufferGeometry[] = [];

  // 1. Pebbles (64) & Back curb
  for (let i = 0; i < 64; i++) {
    const px = (((i * 73) % 100) / 100 - 0.5) * 16;
    const pz = (((i * 41) % 100) / 100 - 0.5) * 9;
    matteParts.push(
      bakePartGeo(new THREE.DodecahedronGeometry(0.038, 0), {
        color: i % 2 === 0 ? 0x785532 : 0xd6b588,
        pos: [px, 0.015, pz],
        rot: [0, i * 1.1, 0],
        scale: [1.2, 0.45, 0.9]
      })
    );
  }
  matteParts.push(
    bakePartGeo(new THREE.BoxGeometry(56, 0.16, 0.28), { color: 0xcbd5e1, pos: [0, 0.08, -12.4] })
  );

  // 2. Running Track Lines & Chalk Circles
  for (let lane = 0; lane <= 4; lane++) {
    trackChalkParts.push(
      bakePartGeo(new THREE.PlaneGeometry(56, 0.07), {
        pos: [0, 0.018, -6.3 - lane * 1.35],
        rot: [-Math.PI / 2, 0, 0],
        keepUv: true
      })
    );
  }
  trackChalkParts.push(
    bakePartGeo(new THREE.PlaneGeometry(0.11, 14), { pos: [0, 0.025, 0], rot: [-Math.PI / 2, 0, 0], keepUv: true })
  );
  [
    [-3.1, 0xe11d48],
    [3.1, 0x3b82f6]
  ].forEach(([cx, col]) => {
    trackChalkParts.push(
      bakePartGeo(new THREE.RingGeometry(2.15, 2.28, 48), { pos: [cx, 0.028, 0], rot: [-Math.PI / 2, 0, 0], keepUv: true }),
      bakePartGeo(new THREE.RingGeometry(0.95, 1.04, 36), { pos: [cx, 0.028, 0], rot: [-Math.PI / 2, 0, 0], keepUv: true })
    );
    zoneDiscParts.push(
      bakePartGeo(new THREE.CircleGeometry(2.15, 40), {
        color: col,
        pos: [cx, 0.022, 0],
        rot: [-Math.PI / 2, 0, 0]
      })
    );
  });

  // 3. School Building (z = -22)
  const sz = -22;
  const facadeTex = createSchoolFacadeTexture();
  const mainBlock = new THREE.Mesh(
    new THREE.BoxGeometry(30, 8.8, 5.5),
    new THREE.MeshStandardMaterial({ map: facadeTex || undefined, color: 0xffffff, roughness: 0.75 })
  );
  mainBlock.position.set(0, 4.4, sz);
  mainBlock.receiveShadow = enableShadows;
  mainBlock.castShadow = enableShadows;
  scene.add(mainBlock);

  matteParts.push(
    bakePartGeo(new THREE.BoxGeometry(30.8, 0.45, 6.2), { color: 0xe5dec9, pos: [0, 9.0, sz] }),
    bakePartGeo(new THREE.BoxGeometry(4.6, 3.2, 4.2), { color: 0xe5dec9, pos: [0, 10.2, sz + 0.4] }),
    bakePartGeo(new THREE.ConeGeometry(3.6, 1.4, 4), { color: 0x334155, pos: [0, 12.5, sz + 0.4], rot: [0, Math.PI / 4, 0] }),
    bakePartGeo(new THREE.BoxGeometry(5.6, 2.8, 2.4), { color: 0xe5dec9, pos: [0, 1.4, sz + 3.6] })
  );
  // Rooftop safety railing bars
  metalParts.push(bakePartGeo(new THREE.BoxGeometry(30.2, 0.08, 0.08), { color: 0x64748b, pos: [0, 10.25, sz + 2.75] }));
  for (let rx = -14.5; rx <= 14.5; rx += 2.9) {
    metalParts.push(bakePartGeo(new THREE.BoxGeometry(0.06, 1.0, 0.06), { color: 0x64748b, pos: [rx, 9.75, sz + 2.75] }));
  }
  metalParts.push(
    bakePartGeo(new THREE.CylinderGeometry(1.05, 1.05, 0.18, 24), { color: 0xf59e0b, pos: [0, 10.35, sz + 2.52], rot: [Math.PI / 2, 0, 0] })
  );

  // Clock face + hands merged with vertexColors
  const clockGeo = mergeBakedGeos([
    bakePartGeo(new THREE.CylinderGeometry(0.92, 0.92, 0.2, 24), { color: 0xffffff, pos: [0, 10.35, sz + 2.54], rot: [Math.PI / 2, 0, 0] }),
    bakePartGeo(new THREE.BoxGeometry(0.1, 0.52, 0.05), { color: 0x0f172a, pos: [-0.16, 10.5, sz + 2.66], rot: [0, 0, 0.65] }),
    bakePartGeo(new THREE.BoxGeometry(0.08, 0.74, 0.05), { color: 0x0f172a, pos: [0.22, 10.55, sz + 2.66], rot: [0, 0, -0.65] })
  ]);
  scene.add(new THREE.Mesh(clockGeo, new THREE.MeshBasicMaterial({ vertexColors: true })));

  // Dual vertical celebration banners merged into 1 draw call
  const dualVertTex = createDualVerticalBannerTexture();
  if (dualVertTex) {
    const remapPlaneHalf = (px: number, uStart: number, uEnd: number) => {
      const g = new THREE.PlaneGeometry(1.35, 6.2);
      const uv = g.attributes.uv as THREE.BufferAttribute;
      for (let i = 0; i < uv.count; i++) {
        uv.setX(i, uStart + uv.getX(i) * (uEnd - uStart));
      }
      return bakePartGeo(g, { pos: [px, 5.2, sz + 2.82], keepUv: true });
    };
    scene.add(
      new THREE.Mesh(
        mergeBakedGeos([remapPlaneHalf(-3.2, 0.02, 0.48), remapPlaneHalf(3.2, 0.52, 0.98)]),
        new THREE.MeshBasicMaterial({ map: dualVertTex })
      )
    );
  }

  // 4. Undokai Stadium Wall Banner & Frame (z = -6.2)
  const bannerTex = createUndokaiBannerTexture(schoolName);
  const undokaiBannerMat = new THREE.MeshBasicMaterial({ map: bannerTex || undefined });
  matteParts.push(
    bakePartGeo(new THREE.BoxGeometry(5.6, 1.55, 0.18), { color: 0x1e293b, pos: [0, 1.55, -6.2] }),
    bakePartGeo(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 10), { color: 0x78350f, pos: [-2.4, 1.2, -6.25] }),
    bakePartGeo(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 10), { color: 0x78350f, pos: [2.4, 1.2, -6.25] })
  );
  const undokaiBannerMesh = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 1.35), undokaiBannerMat);
  undokaiBannerMesh.position.set(0, 1.55, -6.1);
  scene.add(undokaiBannerMesh);

  // 5. PA Megaphone Speaker Poles
  [-6.8, 6.8].forEach((px) => {
    metalParts.push(bakePartGeo(new THREE.CylinderGeometry(0.05, 0.07, 5.2, 10), { color: 0x94a3b8, pos: [px, 2.6, -7.2] }));
    [-1, 1].forEach((dir) => {
      matteParts.push(
        bakePartGeo(new THREE.ConeGeometry(0.24, 0.42, 12, 1, true), {
          color: 0xf8fafc,
          pos: [px + dir * 0.22, 5.0, -7.2],
          rot: [0, 0, dir * (Math.PI / 2 - 0.25)]
        })
      );
    });
  });

  // 6. Both Weighted Basket Bases & Feet (merged into static metal)
  [-3.1, 3.1].forEach((bx) => {
    metalParts.push(bakePartGeo(new THREE.CylinderGeometry(0.68, 0.78, 0.12, 24), { color: 0x334155, pos: [bx, 0.06, 0] }));
    for (let i = 0; i < 4; i++) {
      const ang = (i * Math.PI) / 2 + Math.PI / 4;
      metalParts.push(
        bakePartGeo(new THREE.BoxGeometry(0.95, 0.08, 0.1), {
          color: 0x475569,
          pos: [bx + Math.cos(ang) * 0.42, 0.08, Math.sin(ang) * 0.42],
          rot: [0, -ang, 0]
        })
      );
    }
  });

  // 7. Undokai Tents + Spectators Data Collection
  const spectatorData: SpectatorAnimData[] = [];
  const addTentToBatches = (xPos: number, zPos: number, rotY: number, theme: 'red' | 'white' | 'honbu') => {
    const cosY = Math.cos(rotY);
    const sinY = Math.sin(rotY);
    const toWorld = (lx: number, ly: number, lz: number): [number, number, number] => [
      xPos + lx * cosY + lz * sinY,
      ly,
      zPos - lx * sinY + lz * cosY
    ];

    paintedParts.push(
      bakePartGeo(new THREE.ConeGeometry(3.4, 1.35, 4), {
        color: 0xf8fafc,
        pos: toWorld(0, 3.25, 0),
        rot: [0, rotY + Math.PI / 4, 0],
        scale: [1.35, 1, 0.85]
      }),
      bakePartGeo(new THREE.BoxGeometry(6.4, 0.24, 4.1), {
        color: theme === 'red' ? 0xe11d48 : theme === 'white' ? 0x3b82f6 : 0xf59e0b,
        pos: toWorld(0, 2.52, 0),
        rot: [0, rotY, 0]
      })
    );

    [
      [-2.9, -1.85],
      [2.9, -1.85],
      [-2.9, 1.85],
      [2.9, 1.85]
    ].forEach(([lx, lz]) => {
      metalParts.push(
        bakePartGeo(new THREE.CylinderGeometry(0.04, 0.04, 2.5, 8), {
          color: 0x94a3b8,
          pos: toWorld(lx, 1.25, lz)
        })
      );
    });

    if (kohakuTex) {
      kohakuParts.push(
        bakePartGeo(new THREE.PlaneGeometry(5.8, 1.6), {
          pos: toWorld(0, 1.1, -1.82),
          rot: [0, rotY, 0],
          keepUv: true
        })
      );
    }

    if (theme === 'honbu') {
      paintedParts.push(bakePartGeo(new THREE.BoxGeometry(3.4, 0.78, 1.1), { color: 0xffffff, pos: toWorld(0, 0.39, 0.4), rot: [0, rotY, 0] }));
      if (kohakuTex) {
        kohakuParts.push(bakePartGeo(new THREE.PlaneGeometry(3.42, 0.76), { pos: toWorld(0, 0.39, 0.96), rot: [0, rotY, 0], keepUv: true }));
      }
      metalParts.push(bakePartGeo(new THREE.CylinderGeometry(0.22, 0.1, 0.48, 12), { color: 0xfbbf24, pos: toWorld(0, 1.02, 0.4) }));
    }

    const count = theme === 'honbu' ? 3 : 6;
    for (let i = 0; i < count; i++) {
      const sx = -2.1 + (i / Math.max(1, count - 1)) * 4.2;
      const szLocal = theme === 'honbu' ? -0.45 : 0.2 + (i % 2) * 0.55;
      const [wx, , wz] = toWorld(sx, 0, szLocal);
      spectatorData.push({
        baseX: wx,
        baseY: 0,
        baseZ: wz,
        rotY,
        capColor: theme === 'red' ? 0xe11d48 : theme === 'white' ? 0xf8fafc : i % 2 === 0 ? 0xe11d48 : 0x3b82f6,
        pomColor: theme === 'red' ? 0xf43f5e : theme === 'white' ? 0xfef08a : 0xf59e0b
      });
    }
  };
  addTentToBatches(-8.8, -4.2, 0.32, 'red');
  addTentToBatches(8.8, -4.2, -0.32, 'white');
  addTentToBatches(0, -10.2, 0, 'honbu');

  // 8. Trees & Mountains
  const treePlacements: [number, number, number, boolean][] = [
    [-14.5, -9.5, 1.15, true],
    [-11.5, -13.5, 1.3, false],
    [-6.2, -14.8, 1.1, true],
    [6.2, -14.8, 1.15, true],
    [11.5, -13.5, 1.25, false],
    [14.5, -9.5, 1.1, true],
    [-16.5, -3.5, 1.2, false],
    [16.5, -3.5, 1.2, false]
  ];
  const puffs = [
    [0, 2.8, 0, 1.35],
    [-0.85, 2.35, 0.4, 1.05],
    [0.85, 2.4, -0.3, 1.1],
    [0.2, 2.5, 0.8, 0.98],
    [-0.3, 2.55, -0.75, 1.0]
  ];
  treePlacements.forEach(([tx, tz, ts, isSakura]) => {
    matteParts.push(
      bakePartGeo(new THREE.CylinderGeometry(0.22 * ts, 0.36 * ts, 2.2 * ts, 10), {
        color: 0x5c4033,
        pos: [tx, 1.1 * ts, tz]
      })
    );
    const leafColors = isSakura ? [0xfbcfe8, 0xf9a8d4, 0xfce7f3] : [0x22c55e, 0x16a34a, 0x4ade80];
    puffs.forEach(([px, py, pz, pr], idx) => {
      matteParts.push(
        bakePartGeo(new THREE.DodecahedronGeometry(pr * ts, 1), {
          color: leafColors[idx % leafColors.length],
          pos: [tx + px * ts, py * ts, tz + pz * ts]
        })
      );
    });
  });

  for (let i = 0; i < 9; i++) {
    const mx = -48 + i * 12;
    const mh = 12 + (i % 3) * 5;
    matteParts.push(
      bakePartGeo(new THREE.ConeGeometry(14, mh, 7), {
        color: 0x3b7a57,
        pos: [mx, mh * 0.45 - 1, -48 - (i % 2) * 6],
        scale: [1.6, 1, 0.7]
      })
    );
  }

  // 9. Bunting Flags (78)
  const flagPalette = [0xe11d48, 0xf8fafc, 0xf59e0b, 0x3b82f6, 0x10b981, 0xa855f7];
  const pushBunting = (zStart: number, zEnd: number, yPeak: number) => {
    const count = 26;
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      const x = -11.5 + t * 23;
      const z = zStart + t * (zEnd - zStart);
      const y = yPeak - Math.sin(t * Math.PI) * 0.72;
      paintedParts.push(
        bakePartGeo(new THREE.ConeGeometry(0.19, 0.38, 3), {
          color: flagPalette[i % flagPalette.length],
          pos: [x, y, z],
          rot: [Math.PI, 0, 0]
        })
      );
    }
  };
  pushBunting(-4.5, -4.5, 5.25);
  pushBunting(-2.2, 1.2, 5.45);
  pushBunting(1.2, -2.2, 5.45);

  // Add merged static scene meshes (only 6 draw calls total for all props!)
  const trackChalkMesh = new THREE.Mesh(
    mergeBakedGeos(trackChalkParts),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 })
  );
  scene.add(trackChalkMesh);

  const zoneDiscMesh = new THREE.Mesh(
    mergeBakedGeos(zoneDiscParts),
    new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.08, depthWrite: false })
  );
  scene.add(zoneDiscMesh);

  const matteMesh = new THREE.Mesh(
    mergeBakedGeos(matteParts),
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88 })
  );
  matteMesh.receiveShadow = enableShadows;
  scene.add(matteMesh);

  const metalMesh = new THREE.Mesh(
    mergeBakedGeos(metalParts),
    new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.62, roughness: 0.34 })
  );
  metalMesh.castShadow = enableShadows;
  metalMesh.receiveShadow = enableShadows;
  scene.add(metalMesh);

  const paintedMesh = new THREE.Mesh(
    mergeBakedGeos(paintedParts),
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, side: THREE.DoubleSide })
  );
  paintedMesh.castShadow = enableShadows;
  scene.add(paintedMesh);

  if (kohakuParts.length > 0 && kohakuTex) {
    scene.add(
      new THREE.Mesh(
        mergeBakedGeos(kohakuParts),
        new THREE.MeshStandardMaterial({ map: kohakuTex, side: THREE.DoubleSide, roughness: 0.7 })
      )
    );
  }

  // 10. Volumetric Cloud Puffs in 1 InstancedMesh (36 instances)
  const cloudsGroup = new THREE.Group();
  scene.add(cloudsGroup);
  const cloudsInst = new THREE.InstancedMesh(
    new THREE.SphereGeometry(1, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 }),
    36
  );
  const cDummy = new THREE.Object3D();
  let cIdx = 0;
  for (let i = 0; i < 12; i++) {
    const ang = (i / 12) * Math.PI * 1.4 - Math.PI * 0.7;
    const gx = Math.sin(ang) * 42;
    const gy = 13 + (i % 3) * 2.5;
    const gz = -Math.cos(ang) * 34 - 8;
    for (let j = 0; j < 3; j++) {
      const r = 2.4 - j * 0.4;
      cDummy.position.set(gx + (j - 1) * 1.9, gy + (j % 2) * 0.5, gz);
      cDummy.scale.set(1.4 * r, 0.85 * r, 0.9 * r);
      cDummy.updateMatrix();
      cloudsInst.setMatrixAt(cIdx++, cDummy.matrix);
    }
  }
  cloudsInst.instanceMatrix.needsUpdate = true;
  cloudsGroup.add(cloudsInst);

  // 11. 15 Cheering Tent Spectators in 3 InstancedMeshes (body+head, cap, poms)
  const specCount = spectatorData.length;
  const specBodyGeo = mergeBakedGeos([
    bakePartGeo(new THREE.CylinderGeometry(0.16, 0.18, 0.52, 8), { color: 0xffffff, pos: [0, 0.42, 0] }),
    bakePartGeo(new THREE.SphereGeometry(0.17, 10, 10), { color: 0xffdfc4, pos: [0, 0.82, 0] })
  ]);
  const specBodyInst = new THREE.InstancedMesh(
    specBodyGeo,
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.58 }),
    specCount
  );
  specBodyInst.frustumCulled = false;

  const specCapGeo = new THREE.SphereGeometry(0.18, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55);
  specCapGeo.translate(0, 0.84, 0);
  const specCapInst = new THREE.InstancedMesh(
    specCapGeo,
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }),
    specCount
  );
  specCapInst.frustumCulled = false;

  const specPomInst = new THREE.InstancedMesh(
    new THREE.DodecahedronGeometry(0.11, 0),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 }),
    specCount * 2
  );
  specPomInst.frustumCulled = false;

  const sDummy = new THREE.Object3D();
  const sColor = new THREE.Color();
  spectatorData.forEach((sp, i) => {
    sDummy.position.set(sp.baseX, sp.baseY, sp.baseZ);
    sDummy.rotation.set(0, sp.rotY, 0);
    sDummy.scale.set(1, 1, 1);
    sDummy.updateMatrix();
    specBodyInst.setMatrixAt(i, sDummy.matrix);
    specCapInst.setMatrixAt(i, sDummy.matrix);
    sColor.setHex(sp.capColor);
    specCapInst.setColorAt(i, sColor);

    const cosR = Math.cos(sp.rotY);
    const sinR = Math.sin(sp.rotY);
    sColor.setHex(sp.pomColor);
    [-0.24, 0.24].forEach((lx, pSide) => {
      sDummy.position.set(sp.baseX + lx * cosR + 0.1 * sinR, 0.95, sp.baseZ - lx * sinR + 0.1 * cosR);
      sDummy.updateMatrix();
      specPomInst.setMatrixAt(i * 2 + pSide, sDummy.matrix);
      specPomInst.setColorAt(i * 2 + pSide, sColor);
    });
  });
  specBodyInst.instanceMatrix.needsUpdate = true;
  specCapInst.instanceMatrix.needsUpdate = true;
  if (specCapInst.instanceColor) specCapInst.instanceColor.needsUpdate = true;
  specPomInst.instanceMatrix.needsUpdate = true;
  if (specPomInst.instanceColor) specPomInst.instanceColor.needsUpdate = true;
  scene.add(specBodyInst, specCapInst, specPomInst);

  const animateSpectators = (elapsed: number) => {
    const pomMatrix = new THREE.Matrix4();
    const pomPos = new THREE.Vector3();
    for (let i = 0; i < specCount; i++) {
      const sp = spectatorData[i];
      const hopY = Math.abs(Math.sin(elapsed * 6.8 + i * 0.7)) * 0.14;
      const yaw = sp.rotY + Math.sin(elapsed * 3.2 + i) * 0.2;
      sDummy.position.set(sp.baseX, hopY, sp.baseZ);
      sDummy.rotation.set(0, yaw, 0);
      sDummy.updateMatrix();
      specBodyInst.setMatrixAt(i, sDummy.matrix);
      specCapInst.setMatrixAt(i, sDummy.matrix);

      const cosY = Math.cos(yaw);
      const sinY = Math.sin(yaw);
      [-0.24, 0.24].forEach((lx, pSide) => {
        pomPos.set(sp.baseX + lx * cosY + 0.1 * sinY, 0.95 + hopY, sp.baseZ - lx * sinY + 0.1 * cosY);
        pomMatrix.makeTranslation(pomPos.x, pomPos.y, pomPos.z);
        specPomInst.setMatrixAt(i * 2 + pSide, pomMatrix);
      });
    }
    specBodyInst.instanceMatrix.needsUpdate = true;
    specCapInst.instanceMatrix.needsUpdate = true;
    specPomInst.instanceMatrix.needsUpdate = true;
  };

  return { cloudsGroup, cloudsInst, animateSpectators, undokaiBannerMat };
}


// ----------------------------------------------------------------------------
// 4B. Zero-Asset WebAudio Undōkai Suspense Sound Synthesizer (Taiko, Hyōshigi, Whistle)
// ----------------------------------------------------------------------------
let sharedAudioCtx: AudioContext | null = null;
function getCeremonyAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return null;
    if (!sharedAudioCtx) {
      sharedAudioCtx = new Ctx();
    }
    if (sharedAudioCtx.state === 'suspended') {
      void sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

function playTamaireCeremonySound(
  kind: 'WHISTLE' | 'COUNT_BEAT' | 'DRUMROLL' | 'CLIMAX_BAG' | 'VICTORY_FANFARE',
  pitchSemitones = 0,
  isSlowdown = false
) {
  if (soundEffects.isMuted()) return;
  const ctx = getCeremonyAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;

    if (kind === 'WHISTLE') {
      // Piercing referee pea-whistle + deep Taiko strike
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(2820, now);
      for (let i = 0; i < 12; i++) {
        osc.frequency.setValueAtTime(i % 2 === 0 ? 2960 : 2740, now + i * 0.045);
      }
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.16, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.62);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.65);
      return;
    }

    if (kind === 'COUNT_BEAT') {
      // 1. Ascending Xylophone / Hyoshigi wooden clapper chime ("ひとーつ！ふたーつ！")
      const freq = 440 * Math.pow(2, pitchSemitones / 12);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.02, now + 0.14);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.24);

      // 2. Deep Taiko / Heartbeat thump during neck-and-neck slowdown!
      const drum = ctx.createOscillator();
      const dGain = ctx.createGain();
      drum.type = 'sine';
      drum.frequency.setValueAtTime(isSlowdown ? 115 : 145, now);
      drum.frequency.exponentialRampToValueAtTime(48, now + 0.18);
      dGain.gain.setValueAtTime(isSlowdown ? 0.28 : 0.14, now);
      dGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      drum.connect(dGain);
      dGain.connect(ctx.destination);
      drum.start(now);
      drum.stop(now + 0.22);
      return;
    }

    if (kind === 'DRUMROLL') {
      // Rapid 1.2s Taiko Drumroll crescendo ("ドロロロロロ…！") while baskets shake!
      const hits = 14;
      for (let i = 0; i < hits; i++) {
        const t = now + i * 0.082;
        const progress = i / hits;
        const tom = ctx.createOscillator();
        const tGain = ctx.createGain();
        tom.type = 'sine';
        tom.frequency.setValueAtTime(130 + (i % 2) * 18 + progress * 35, t);
        tom.frequency.exponentialRampToValueAtTime(52, t + 0.075);
        tGain.gain.setValueAtTime(0.06 + progress * 0.18, t);
        tGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        tom.connect(tGain);
        tGain.connect(ctx.destination);
        tom.start(t);
        tom.stop(t + 0.085);
      }
      return;
    }

    if (kind === 'CLIMAX_BAG') {
      // Sparkling Golden Decisive Bag Eruption Chime!
      const baseFreq = 587.33 * Math.pow(2, (pitchSemitones - 10) / 12);
      [1, 1.25, 1.5].forEach((mult, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(baseFreq * mult, now + idx * 0.04);
        gain.gain.setValueAtTime(0.14, now + idx * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.34);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.04);
        osc.stop(now + idx * 0.04 + 0.36);
      });
      return;
    }

    if (kind === 'VICTORY_FANFARE') {
      // Triumphant Undokai Brass/Chime Victory Chord Progression (C5 - E5 - G5 - C6)
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((nFreq, idx) => {
        const startT = now + idx * 0.11;
        const dur = idx === notes.length - 1 ? 0.65 : 0.22;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(nFreq, startT);
        gain.gain.setValueAtTime(0.18, startT);
        gain.gain.exponentialRampToValueAtTime(0.001, startT + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startT);
        osc.stop(startT + dur + 0.02);
      });
    }
  } catch {
    // Ignore audio context autoplay restrictions in headless browsers
  }
}

// ----------------------------------------------------------------------------
// 5. Main Component: Tamaire3DStage (Exported also as Volleyball3DStage)
// ----------------------------------------------------------------------------
export const Tamaire3DStage: React.FC<Tamaire3DStageProps> = ({
  redScore = 0,
  whiteScore = 0,
  matchEnded = false,
  winner = null,
  redThrowRate = 0,
  whiteThrowRate = 0,
  redPlayersCount = 6,
  whitePlayersCount = 6,
  studentRoster,
  answerEvents,
  schoolName = '二子玉川小',
  hideScoreUntilEnd = false,
  cameraMode = 'DIRECTOR',
  focusPlayer,
  timeRemainingSeconds,
  isGoldenNext = false,
  studentActionStep = 2,
  studentViewPerspective = 'THIRD_PERSON'
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const isStudentChase = cameraMode === 'STUDENT_CHASE';

  const [countedRed, setCountedRed] = useState(0);
  const [countedWhite, setCountedWhite] = useState(0);
  const [countingActive, setCountingActive] = useState(false);
  const [ceremonyComplete, setCeremonyComplete] = useState(false);
  const [activeSuspenseFrame, setActiveSuspenseFrame] = useState<TamaireSuspenseFrame | null>(null);
  const [ceremonyReplayNonce, setCeremonyReplayNonce] = useState(0);
  const [ceremonySfxEnabled, setCeremonySfxEnabled] = useState(!isStudentChase);
  const [directorCamPreset, setDirectorCamPreset] = useState<'WIDE' | 'ORBIT' | 'BASKETS'>('WIDE');
  const [latestThrowBanner, setLatestThrowBanner] = useState<VolleyballAnswerEvent | null>(null);
  const [contextRestartKey, setContextRestartKey] = useState(0);

  const ceremonyFrameRef = useRef<TamaireSuspenseFrame | null>(null);
  const countBeatPulseRef = useRef<number>(0);
  const ceremonySfxEnabledRef = useRef<boolean>(!isStudentChase);
  ceremonySfxEnabledRef.current = ceremonySfxEnabled && !isStudentChase;
  const directorCamPresetRef = useRef<'WIDE' | 'ORBIT' | 'BASKETS'>('WIDE');
  directorCamPresetRef.current = directorCamPreset;
  const undokaiBannerMatRef = useRef<THREE.MeshBasicMaterial | null>(null);

  const stateRef = useRef({
    redScore,
    whiteScore,
    matchEnded,
    winner,
    redThrowRate,
    whiteThrowRate,
    redPlayersCount,
    whitePlayersCount,
    studentRoster,
    schoolName,
    hideScoreUntilEnd,
    cameraMode,
    focusPlayer,
    isGoldenNext,
    studentActionStep,
    studentViewPerspective
  });
  stateRef.current = {
    redScore,
    whiteScore,
    matchEnded,
    winner,
    redThrowRate,
    whiteThrowRate,
    redPlayersCount,
    whitePlayersCount,
    studentRoster,
    schoolName,
    hideScoreUntilEnd,
    cameraMode,
    focusPlayer,
    isGoldenNext,
    studentActionStep,
    studentViewPerspective
  };

  const enqueueThrowsRef = useRef<
    ((
      team: 'red' | 'white',
      count: number,
      isGolden: boolean,
      playerId?: string,
      isMissThrow?: boolean,
      stepAction?: VolleyballAnswerEvent['stepAction']
    ) => void) | null
  >(null);
  const rebuildRosterRef = useRef<(() => void) | null>(null);
  const prevScoresRef = useRef({ red: redScore, white: whiteScore });
  const lastAnswerEventIdRef = useRef<number>(-1);

  useEffect(() => {
    const prev = prevScoresRef.current;
    const redDelta = Math.max(0, redScore - prev.red);
    const whiteDelta = Math.max(0, whiteScore - prev.white);
    prevScoresRef.current = { red: redScore, white: whiteScore };

    // Never launch live-play throws once the post-whistle Counting Ceremony has started!
    if (matchEnded) return;

    // Identify which specific student answered (or missed!) if an answerEvent was passed!
    const latestEvt =
      answerEvents && answerEvents.length > 0 ? answerEvents[answerEvents.length - 1] : null;
    let scorerPlayerId: string | undefined;
    let handledByEvt = false;

    if (latestEvt && latestEvt.id !== lastAnswerEventIdRef.current) {
      lastAnswerEventIdRef.current = latestEvt.id;
      scorerPlayerId = latestEvt.playerId;
      setLatestThrowBanner(latestEvt);

      if (
        latestEvt.stepAction === 'SCOOP' ||
        latestEvt.stepAction === 'AIM' ||
        latestEvt.stepAction === 'FUMBLED_SAND' ||
        latestEvt.stepAction === 'DROPPED_BAG'
      ) {
        // Intermediate 3-step physical action (Scoop bag from sand, Lock aim on basket, or Fumble/Drop in sand)
        if (enqueueThrowsRef.current) {
          enqueueThrowsRef.current(
            latestEvt.team,
            0,
            false,
            latestEvt.playerId,
            Boolean(latestEvt.isMiss),
            latestEvt.stepAction
          );
        }
        handledByEvt = true;
      } else if (latestEvt.isMiss && enqueueThrowsRef.current) {
        // Wrong answer on Step 3! Launch a 3D Rim-Doink bean bag that clanks off the steel rim and bounces onto the sand!
        enqueueThrowsRef.current(latestEvt.team, 1, false, latestEvt.playerId, true, 'RIM_DOINK');
        handledByEvt = true;
      } else if (!latestEvt.isMiss && enqueueThrowsRef.current && redDelta === 0 && whiteDelta === 0) {
        // Direct student chase-cam swish event
        enqueueThrowsRef.current(
          latestEvt.team,
          latestEvt.isGoldenDouble ? 2 : 1,
          Boolean(latestEvt.isGoldenDouble),
          latestEvt.playerId,
          false,
          latestEvt.isGoldenDouble ? 'GOLDEN_SWISH' : 'SWISH'
        );
        handledByEvt = true;
      }
    }

    if (!handledByEvt) {
      if (redDelta > 0 && enqueueThrowsRef.current) {
        enqueueThrowsRef.current('red', Math.min(4, redDelta), redDelta >= 2, scorerPlayerId, false);
      }
      if (whiteDelta > 0 && enqueueThrowsRef.current) {
        enqueueThrowsRef.current('white', Math.min(4, whiteDelta), whiteDelta >= 2, scorerPlayerId, false);
      }
    }
  }, [redScore, whiteScore, matchEnded, answerEvents]);

  // Reactively refresh the Undokai Stadium Wall Banner if activeSchool switches after mount
  useEffect(() => {
    const mat = undokaiBannerMatRef.current;
    if (!mat) return;
    const nextTex = createUndokaiBannerTexture(schoolName);
    if (!nextTex) return;
    const prevTex = mat.map;
    mat.map = nextTex;
    mat.needsUpdate = true;
    if (prevTex && !prevTex.userData?.isSharedResource) {
      prevTex.dispose();
    }
  }, [schoolName]);

  // Dynamically rebuild the 3D student avatars only when structural roster identity, team counts, or focusPlayer change!
  const rosterKey = useMemo(
    () => (studentRoster || []).map((s) => `${s.id}:${s.nickname}:${s.team}`).join('|'),
    [studentRoster]
  );

  useEffect(() => {
    if (rebuildRosterRef.current) {
      rebuildRosterRef.current();
    }
  }, [rosterKey, redPlayersCount, whitePlayersCount, cameraMode, focusPlayer?.id, focusPlayer?.team]);

  // Post-Whistle Multi-Stage Suspenseful Counting Ceremony ("ひとーつ！ふたーつ！... 同点ドラムロール ... 決着！")
  // Snapshot scores at the moment matchEnded becomes true so the ceremony never resets mid-count!
  useEffect(() => {
    if (!matchEnded) {
      setCountingActive(false);
      setCeremonyComplete(false);
      setActiveSuspenseFrame(null);
      ceremonyFrameRef.current = null;
      setCountedRed(stateRef.current.redScore);
      setCountedWhite(stateRef.current.whiteScore);
      return;
    }

    const snapRed = stateRef.current.redScore;
    const snapWhite = stateRef.current.whiteScore;
    const schedule = buildTamaireSuspenseSchedule(snapRed, snapWhite);
    let cancelled = false;
    let timeoutId: number | null = null;

    const runFrame = (idx: number) => {
      if (cancelled || idx >= schedule.length) return;
      const frame = schedule[idx];
      ceremonyFrameRef.current = frame;
      setActiveSuspenseFrame(frame);
      setCountedRed(frame.countedRed);
      setCountedWhite(frame.countedWhite);

      const isFinal = frame.stage === 'VICTORY_FANFARE' || idx === schedule.length - 1;
      setCountingActive(!isFinal);
      setCeremonyComplete(isFinal);

      // Trigger 3D student synchronized cheer-clap pulse & 3D counted bag ejections
      if (frame.ejectRed || frame.ejectWhite) {
        countBeatPulseRef.current = 1.0;
        if (enqueueThrowsRef.current) {
          if (frame.ejectRed) enqueueThrowsRef.current('red', 1, frame.isGoldenClimax);
          if (frame.ejectWhite) enqueueThrowsRef.current('white', 1, frame.isGoldenClimax);
        }
      }

      // Trigger synthesized WebAudio suspense sound effects
      if (ceremonySfxEnabledRef.current) {
        if (frame.stage === 'WHISTLE_EYES_UP') {
          playTamaireCeremonySound('WHISTLE');
        } else if (frame.stage === 'RHYTHMIC_CHANT' || frame.stage === 'TENSION_SLOWDOWN') {
          playTamaireCeremonySound(
            'COUNT_BEAT',
            frame.pitchSemitones,
            frame.stage === 'TENSION_SLOWDOWN'
          );
        } else if (frame.stage === 'CLIFFHANGER_RATTLE') {
          playTamaireCeremonySound('DRUMROLL', frame.pitchSemitones);
        } else if (frame.stage === 'CLIMAX_REVEAL') {
          playTamaireCeremonySound('CLIMAX_BAG', frame.pitchSemitones);
        } else if (frame.stage === 'VICTORY_FANFARE') {
          playTamaireCeremonySound('VICTORY_FANFARE');
        }
      }

      if (!isFinal && frame.delayMs > 0) {
        timeoutId = window.setTimeout(() => runFrame(idx + 1), frame.delayMs);
      }
    };

    runFrame(0);

    return () => {
      cancelled = true;
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [matchEnded, ceremonyReplayNonce]);

  // Three.js Scene Initialization & Render Loop (Budgeted < 60 draw calls, classroom3d compliant)
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let isDisposed = false;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x38bdf8);
    scene.fog = new THREE.FogExp2(0xbae6fd, 0.0045);

    const isStudentView = stateRef.current.cameraMode === 'STUDENT_CHASE';
    const classroom3d = createClassroomRenderer(container, {
      fov: 40,
      near: 0.1,
      far: 260,
      isStudentView,
      cameraPosition: [0, 4.4, 12.2],
      cameraLookAt: [0, 2.25, -0.5],
      alpha: false
    });
    const { renderer, camera, gpuProfile, trackFrameRate, cleanup: cleanupRenderer } = classroom3d;
    renderer.toneMappingExposure = 0.92;

    const onContextLost = (e: Event) => {
      e.preventDefault();
      console.warn('[Tamaire3DStage] WebGL context lost; waiting for restoration.');
    };
    const onContextRestored = () => {
      setContextRestartKey((k) => k + 1);
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost, false);
    renderer.domElement.addEventListener('webglcontextrestored', onContextRestored, false);

    // Crisp Japanese Autumn Undokai Sky Dome (deep azure zenith -> warm horizon)
    const skyCanvas = document.createElement('canvas');
    skyCanvas.width = 64;
    skyCanvas.height = 256;
    const skyCtx = skyCanvas.getContext('2d');
    if (skyCtx) {
      const skyGrad = skyCtx.createLinearGradient(0, 0, 0, 256);
      skyGrad.addColorStop(0, '#0284c7');
      skyGrad.addColorStop(0.42, '#38bdf8');
      skyGrad.addColorStop(0.75, '#bae6fd');
      skyGrad.addColorStop(1, '#fef3c7');
      skyCtx.fillStyle = skyGrad;
      skyCtx.fillRect(0, 0, 64, 256);
      const skyTex = new THREE.CanvasTexture(skyCanvas);
      skyTex.colorSpace = THREE.SRGBColorSpace;
      const skyDome = new THREE.Mesh(
        new THREE.SphereGeometry(140, 24, 16),
        new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, depthWrite: false, fog: false })
      );
      scene.add(skyDome);
    }

    // ------------------------------------------------------------------------
    // A. Calibrated High-Contrast Outdoor Undokai Lighting Rig
    // ------------------------------------------------------------------------
    const hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x785532, 0.88);
    hemiLight.position.set(0, 40, 0);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfff7ed, 1.85);
    sunLight.position.set(14, 24, 15);
    sunLight.castShadow = gpuProfile.enableDynamicShadows;
    if (gpuProfile.enableDynamicShadows) {
      sunLight.shadow.mapSize.set(gpuProfile.shadowMapRes, gpuProfile.shadowMapRes);
      sunLight.shadow.camera.near = 2;
      sunLight.shadow.camera.far = 65;
      const d = 16;
      sunLight.shadow.camera.left = -d;
      sunLight.shadow.camera.right = d;
      sunLight.shadow.camera.top = d;
      sunLight.shadow.camera.bottom = -d;
      sunLight.shadow.bias = -0.0005;
    }
    scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight(0x60a5fa, 0.48);
    fillLight.position.set(-14, 12, -10);
    scene.add(fillLight);

    // ------------------------------------------------------------------------
    // B. Sculpted Masado Sand Field, Track, Grass & Merged Arena Environment
    // ------------------------------------------------------------------------
    const sandMaps = createSchoolyardSandMaps();
    const shadowTex = createDoubleRingShadowTexture();
    const kohakuTex = createKohakuMakuTexture();
    const grassTex = createLushGrassTexture();

    const sandGeo = new THREE.PlaneGeometry(24, 16, 56, 40);
    sandGeo.rotateX(-Math.PI / 2);
    const posAttr = sandGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vz = posAttr.getZ(i);
      const dRed = Math.hypot(vx + 3.1, vz);
      const dWhite = Math.hypot(vx - 3.1, vz);
      const ringRipple =
        (Math.exp(-Math.pow(dRed - 1.95, 2) * 1.8) + Math.exp(-Math.pow(dWhite - 1.95, 2) * 1.8)) * -0.042;
      const bermBump =
        (Math.exp(-Math.pow(dRed - 2.35, 2) * 2.5) + Math.exp(-Math.pow(dWhite - 2.35, 2) * 2.5)) * 0.032;
      const microNoise = Math.sin(vx * 2.1) * Math.cos(vz * 2.3) * 0.022;
      posAttr.setY(i, ringRipple + bermBump + microNoise);
    }
    sandGeo.computeVertexNormals();

    const sandMesh = new THREE.Mesh(
      sandGeo,
      new THREE.MeshStandardMaterial({
        map: sandMaps?.diffuseMap,
        bumpMap: sandMaps?.bumpMap,
        bumpScale: 0.085,
        color: 0xffffff,
        roughness: 0.95,
        metalness: 0.01
      })
    );
    sandMesh.receiveShadow = gpuProfile.enableDynamicShadows;
    scene.add(sandMesh);

    const backTrack = new THREE.Mesh(
      new THREE.PlaneGeometry(56, 6.5),
      new THREE.MeshStandardMaterial({
        color: 0xc2593f,
        roughness: 0.82,
        bumpMap: sandMaps?.bumpMap,
        bumpScale: 0.02
      })
    );
    backTrack.rotation.x = -Math.PI / 2;
    backTrack.position.set(0, 0.01, -9.2);
    backTrack.receiveShadow = gpuProfile.enableDynamicShadows;
    scene.add(backTrack);

    const outerGrass = new THREE.Mesh(
      new THREE.PlaneGeometry(140, 120),
      new THREE.MeshStandardMaterial({
        map: grassTex || undefined,
        color: 0xffffff,
        roughness: 0.88
      })
    );
    outerGrass.rotation.x = -Math.PI / 2;
    outerGrass.position.set(0, -0.02, -18);
    outerGrass.receiveShadow = gpuProfile.enableDynamicShadows;
    scene.add(outerGrass);

    // Merged Static Arena (School Building, Banners, Tents, Spectators, Trees, Mountains, Clouds, Bunting)
    const arenaEnv = buildUndokaiArenaEnvironment(
      scene,
      stateRef.current.schoolName,
      kohakuTex,
      gpuProfile.enableDynamicShadows
    );
    undokaiBannerMatRef.current = arenaEnv.undokaiBannerMat;

    // ------------------------------------------------------------------------
    // C. Instanced Thrower Pool, Callout Pool, Basket Poles & Ground Bags
    // ------------------------------------------------------------------------
    const bagAtlasTex = getBeanBagAtlasTexture();
    const throwerPool = createThrowerBatchPool(
      scene,
      shadowTex,
      bagAtlasTex,
      gpuProfile.enableDynamicShadows
    );
    const calloutPool = createCalloutSpritePool(scene, 4);

    const redBagTex = createStitchedBeanBagTexture('#e11d48', '#fecdd3', false);
    const whiteBagTex = createStitchedBeanBagTexture('#f8fafc', '#94a3b8', false);

    const redBagMat = injectWiiSatinRimShader(
      new THREE.MeshStandardMaterial({ map: redBagTex || undefined, color: 0xffffff, roughness: 0.65 })
    );
    const whiteBagMat = injectWiiSatinRimShader(
      new THREE.MeshStandardMaterial({ map: whiteBagTex || undefined, color: 0xffffff, roughness: 0.55 })
    );

    const redBasket = buildTamaireBasketPole(
      'red',
      -3.1,
      redBagMat,
      throwerPool.bagAtlasMat,
      gpuProfile.enableDynamicShadows
    );
    const whiteBasket = buildTamaireBasketPole(
      'white',
      3.1,
      whiteBagMat,
      throwerPool.bagAtlasMat,
      gpuProfile.enableDynamicShadows
    );
    scene.add(redBasket.root, whiteBasket.root);

    const redBagRect = getBeanBagAtlasRect('red');
    const whiteBagRect = getBeanBagAtlasRect('white');
    const goldBagRect = getBeanBagAtlasRect('gold');
    const writeAtlasRect = (arr: Float32Array, idx: number, r: [number, number, number, number]) => {
      const o = idx * 4;
      arr[o] = r[0];
      arr[o + 1] = r[1];
      arr[o + 2] = r[2];
      arr[o + 3] = r[3];
    };

    // 36 Littered Ground Bean Bags batched into 1 InstancedMesh!
    const groundBagGeo = new THREE.SphereGeometry(0.115, 10, 8);
    groundBagGeo.scale(1.25, 0.68, 1.05);
    const groundBagAtlasData = new Float32Array(36 * 4);
    for (let i = 0; i < 36; i++) {
      writeAtlasRect(groundBagAtlasData, i, i < 18 ? redBagRect : whiteBagRect);
    }
    groundBagGeo.setAttribute('aAtlasRect', new THREE.InstancedBufferAttribute(groundBagAtlasData, 4));
    const groundBagsInst = new THREE.InstancedMesh(groundBagGeo, throwerPool.bagAtlasMat, 36);
    groundBagsInst.frustumCulled = false;
    groundBagsInst.castShadow = gpuProfile.enableDynamicShadows;
    const _dummyMatObj = new THREE.Object3D();
    for (let i = 0; i < 36; i++) {
      const isRed = i < 18;
      const cx = isRed ? -3.1 : 3.1;
      const angle = (i * 1.93) % (Math.PI * 2);
      const dist = 0.75 + ((i * 0.41) % 1.65);
      _dummyMatObj.position.set(cx + Math.cos(angle) * dist, 0.055, Math.sin(angle) * dist);
      _dummyMatObj.rotation.set(0.15, angle, 0.1);
      _dummyMatObj.scale.set(1, 1, 1);
      _dummyMatObj.updateMatrix();
      groundBagsInst.setMatrixAt(i, _dummyMatObj.matrix);
    }
    groundBagsInst.instanceMatrix.needsUpdate = true;
    scene.add(groundBagsInst);

    // ------------------------------------------------------------------------
    // D. Dynamic 1-to-40 Student Thrower Roster (Zero-Allocation Rig State)
    // ------------------------------------------------------------------------
    let throwers: ThrowerAvatarRig[] = [];

    const defaultRedNames = [
      'Kenji 🐼', 'Hana 🐰', 'Ren 🐯', 'Yui 🐨', 'Sora 🦁',
      'Mio 🐬', 'Kaito 🦊', 'Aoi 🐧', 'Haru 🐸', 'Mei 🦋',
      'Riku 🦅', 'Koharu 🌸', 'Yuto ⚡', 'Hina 🍓', 'Taiga 🐉',
      'Saki 🌈', 'Asahi ☀️', 'Natsuki 🍉', 'Yamato 🗻', 'Rin 🔔'
    ];
    const defaultWhiteNames = [
      'Tsubasa 🕊️', 'Sakura 🌸', 'Hayato ⚡', 'Akari ⭐', 'Daiki 🐻',
      'Yuna 🌙', 'Kenta 🦖', 'Momoka 🍑', 'Sho 🚀', 'Emi 🎵',
      'Kazuki 🌊', 'Noa ❄️', 'Ryota 🏆', 'Misaki 💎', 'Kota 🦊',
      'Ayaka 🌻', 'Shun 🎯', 'Nana 🍀', 'Takumi 🛡️', 'Chihiro 🐚'
    ];

    const rebuildThrowerAvatars = () => {
      throwers = [];

      const redList: TamaireStudentRosterItem[] = [];
      const whiteList: TamaireStudentRosterItem[] = [];
      const currentRoster = stateRef.current.studentRoster;

      if (currentRoster && currentRoster.length > 0) {
        currentRoster.forEach((s) => {
          if (s.team === 'red' && redList.length < 20) redList.push(s);
          else if (s.team === 'white' && whiteList.length < 20) whiteList.push(s);
        });
      } else {
        const rCount = Math.max(1, Math.min(20, stateRef.current.redPlayersCount || 6));
        const wCount = Math.max(1, Math.min(20, stateRef.current.whitePlayersCount || 6));
        for (let i = 0; i < rCount; i++) {
          redList.push({
            id: `red_student_${i + 1}`,
            nickname: defaultRedNames[i % defaultRedNames.length],
            team: 'red'
          });
        }
        for (let i = 0; i < wCount; i++) {
          whiteList.push({
            id: `white_student_${i + 1}`,
            nickname: defaultWhiteNames[i % defaultWhiteNames.length],
            team: 'white'
          });
        }
      }

      const fPlayer = stateRef.current.focusPlayer;
      const isChaseMode = stateRef.current.cameraMode === 'STUDENT_CHASE';

      const ensureFocusFirst = (list: TamaireStudentRosterItem[], team: 'red' | 'white') => {
        if (!fPlayer || fPlayer.team !== team) return list;
        const existingIdx = list.findIndex(
          (s) => s.id === fPlayer.id || s.nickname === fPlayer.nickname
        );
        if (existingIdx > 0) {
          const [matched] = list.splice(existingIdx, 1);
          list.unshift(matched);
        } else if (existingIdx === -1) {
          if (list.length > 0) {
            list[0] = { id: fPlayer.id, nickname: fPlayer.nickname, team };
          } else {
            list.push({ id: fPlayer.id, nickname: fPlayer.nickname, team });
          }
        }
        return list;
      };

      ensureFocusFirst(redList, 'red');
      ensureFocusFirst(whiteList, 'white');

      const spawnTeamRing = (list: TamaireStudentRosterItem[], team: 'red' | 'white', centerX: number, offsetIdx: number) => {
        const total = list.length;
        const innerCap = Math.min(total, 8);
        const outerCap = Math.max(0, total - innerCap);
        const isFocusedTeamInChase = isChaseMode && fPlayer && fPlayer.team === team;

        list.forEach((student, idx) => {
          const isOuter = idx >= innerCap;
          const ringTier: 0 | 1 = isOuter ? 1 : 0;
          const countInTier = isOuter ? outerCap : innerCap;
          const idxInTier = isOuter ? idx - innerCap : idx;

          let angle: number;
          let radius = isOuter ? 2.48 : total <= 5 ? 1.92 : 1.84;

          if (isFocusedTeamInChase && idx === 0) {
            angle = Math.PI * 0.5;
            radius = 1.85;
          } else if (isFocusedTeamInChase) {
            const peerIdx = isOuter ? idxInTier : idxInTier - 1;
            const peerCount = Math.max(1, isOuter ? countInTier : countInTier - 1);
            const arcSpan = Math.PI * 1.36;
            const startAng = Math.PI * 0.82 + (isOuter ? 0.08 : 0);
            angle = startAng + (peerIdx / Math.max(1, peerCount - 1)) * arcSpan;
          } else {
            const tierAngleOffset = isOuter ? Math.PI / Math.max(4, countInTier) + 0.28 : 0.22;
            angle = (idxInTier / Math.max(1, countInTier)) * Math.PI * 2 + tierAngleOffset;
          }

          const avatar = createThrowerRig(
            team,
            idx === 0 && isFocusedTeamInChase ? 0 : idx + offsetIdx,
            student.id,
            student.nickname,
            centerX,
            radius,
            angle,
            ringTier,
            idx
          );
          throwers.push(avatar);
        });
      };

      spawnTeamRing(redList, 'red', -3.1, 0);
      spawnTeamRing(whiteList, 'white', 3.1, 20);
      throwerPool.markDirty();
    };

    rebuildRosterRef.current = rebuildThrowerAvatars;
    rebuildThrowerAvatars();

    // ------------------------------------------------------------------------
    // E. Instanced Aim Dots, Target Sand Bag & Instanced Tally Piles (120)
    // ------------------------------------------------------------------------
    const whiteColor = new THREE.Color(0xffffff);
    const aimDotGeo = new THREE.SphereGeometry(0.052, 10, 8);
    const aimDotMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.78
    });
    const aimDotsInst = new THREE.InstancedMesh(aimDotGeo, aimDotMat, 14);
    aimDotsInst.frustumCulled = false;
    aimDotsInst.visible = false;
    aimDotsInst.count = 0;
    for (let i = 0; i < 14; i++) aimDotsInst.setColorAt(i, whiteColor);
    if (aimDotsInst.instanceColor) aimDotsInst.instanceColor.needsUpdate = true;
    scene.add(aimDotsInst);

    const targetSandBagGroup = new THREE.Group();
    targetSandBagGroup.visible = false;
    scene.add(targetSandBagGroup);
    const targetSandBagGeo = new THREE.SphereGeometry(0.145, 12, 10);
    targetSandBagGeo.scale(1.26, 0.72, 1.06);
    const targetSandBagMesh = new THREE.Mesh(targetSandBagGeo, redBagMat);
    targetSandBagMesh.position.y = 0.06;
    targetSandBagMesh.castShadow = gpuProfile.enableDynamicShadows;
    targetSandBagGroup.add(targetSandBagMesh);

    const targetSandRingMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide
    });
    const targetSandRingMesh = new THREE.Mesh(
      new THREE.RingGeometry(0.22, 0.29, 28),
      targetSandRingMat
    );
    targetSandRingMesh.rotation.x = -Math.PI / 2;
    targetSandRingMesh.position.y = 0.025;
    targetSandBagGroup.add(targetSandRingMesh);

    // 120 Counted Tally Bags batched into 1 InstancedMesh (60 Red + 60 White)!
    const MAX_TALLY_TOTAL = 120;
    const tallyBagGeo = new THREE.SphereGeometry(0.125, 10, 8);
    tallyBagGeo.scale(1.24, 0.72, 1.05);
    const tallyAtlasData = new Float32Array(MAX_TALLY_TOTAL * 4);
    for (let i = 0; i < MAX_TALLY_TOTAL; i++) {
      writeAtlasRect(tallyAtlasData, i, redBagRect);
    }
    const tallyAtlasAttr = new THREE.InstancedBufferAttribute(tallyAtlasData, 4);
    tallyBagGeo.setAttribute('aAtlasRect', tallyAtlasAttr);
    const tallyBagsInst = new THREE.InstancedMesh(tallyBagGeo, throwerPool.bagAtlasMat, MAX_TALLY_TOTAL);
    tallyBagsInst.frustumCulled = false;
    tallyBagsInst.visible = false;
    tallyBagsInst.count = 0;
    tallyBagsInst.castShadow = gpuProfile.enableDynamicShadows;
    scene.add(tallyBagsInst);
    let prevTallyRed = -1;
    let prevTallyWhite = -1;

    // ------------------------------------------------------------------------
    // F. Instanced Flying Bean Bags (36), Trails (36), Stars (96) & Dust (64)
    // ------------------------------------------------------------------------
    const MAX_FLYING_BAGS = 36;
    const flyingBags: FlyingBeanBag[] = [];
    for (let i = 0; i < MAX_FLYING_BAGS; i++) {
      flyingBags.push({
        active: false,
        team: 'red',
        isGolden: false,
        isNearMiss: false,
        hasBounced: false,
        pos: new THREE.Vector3(),
        rot: new THREE.Euler(),
        scaleMult: 1,
        trailPos: new THREE.Vector3(),
        trailTarget: new THREE.Vector3(),
        trailColor: new THREE.Color(0xffffff),
        showTrail: false,
        startPos: new THREE.Vector3(),
        midPos: new THREE.Vector3(),
        targetPos: new THREE.Vector3(),
        bounceVel: new THREE.Vector3(),
        progress: 0,
        duration: 0.72,
        spinAxis: new THREE.Vector3(1, 1, 0).normalize()
      });
    }

    const flyingBagGeo = new THREE.SphereGeometry(0.135, 12, 10);
    flyingBagGeo.scale(1.22, 0.75, 1.02);
    const flyingBagAtlasData = new Float32Array(MAX_FLYING_BAGS * 4);
    for (let i = 0; i < MAX_FLYING_BAGS; i++) {
      writeAtlasRect(flyingBagAtlasData, i, redBagRect);
    }
    const flyingBagAtlasAttr = new THREE.InstancedBufferAttribute(flyingBagAtlasData, 4);
    flyingBagGeo.setAttribute('aAtlasRect', flyingBagAtlasAttr);
    const flyingBagsInst = new THREE.InstancedMesh(flyingBagGeo, throwerPool.bagAtlasMat, MAX_FLYING_BAGS);
    flyingBagsInst.frustumCulled = false;
    flyingBagsInst.visible = false;
    flyingBagsInst.count = 0;
    flyingBagsInst.castShadow = gpuProfile.enableDynamicShadows;
    scene.add(flyingBagsInst);

    const trailGeo = new THREE.ConeGeometry(0.085, 0.65, 8);
    trailGeo.rotateX(Math.PI / 2);
    const trailMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.38,
      depthWrite: false
    });
    const trailsInst = new THREE.InstancedMesh(trailGeo, trailMat, MAX_FLYING_BAGS);
    trailsInst.frustumCulled = false;
    trailsInst.visible = false;
    trailsInst.count = 0;
    for (let i = 0; i < MAX_FLYING_BAGS; i++) trailsInst.setColorAt(i, whiteColor);
    if (trailsInst.instanceColor) trailsInst.instanceColor.needsUpdate = true;
    scene.add(trailsInst);

    // Pre-allocated Star & Dust Particle InstancedMesh Pools
    const MAX_STARS = 96;
    const MAX_DUST = 64;
    const starParticles: BurstParticle[] = Array.from({ length: MAX_STARS }, () => ({
      pos: new THREE.Vector3(),
      scale: 1,
      rotY: 0,
      color: new THREE.Color(0xfbbf24),
      vel: new THREE.Vector3(),
      life: 0,
      maxLife: 0.58,
      isDust: false
    }));
    const dustParticles: BurstParticle[] = Array.from({ length: MAX_DUST }, () => ({
      pos: new THREE.Vector3(),
      scale: 1,
      rotY: 0,
      color: new THREE.Color(0xe7d3b0),
      vel: new THREE.Vector3(),
      life: 0,
      maxLife: 0.42,
      isDust: true
    }));

    const starGeo = new THREE.OctahedronGeometry(0.085, 0);
    const starMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const starInst = new THREE.InstancedMesh(starGeo, starMat, MAX_STARS);
    starInst.frustumCulled = false;
    starInst.visible = false;
    starInst.count = 0;
    for (let i = 0; i < MAX_STARS; i++) starInst.setColorAt(i, whiteColor);
    if (starInst.instanceColor) starInst.instanceColor.needsUpdate = true;
    scene.add(starInst);

    const dustGeo = new THREE.SphereGeometry(0.11, 8, 8);
    const dustMat = new THREE.MeshBasicMaterial({
      color: 0xe7d3b0,
      transparent: true,
      opacity: 0.65
    });
    const dustInst = new THREE.InstancedMesh(dustGeo, dustMat, MAX_DUST);
    dustInst.frustumCulled = false;
    dustInst.visible = false;
    dustInst.count = 0;
    scene.add(dustInst);

    const spawnParticles = (origin: THREE.Vector3, team: 'red' | 'white', isGolden: boolean, isDust: boolean) => {
      const count = isDust ? 4 : isGolden ? 10 : 6;
      const pool = isDust ? dustParticles : starParticles;
      const starHex = isGolden ? 0xfbbf24 : team === 'red' ? 0xfb7185 : 0x38bdf8;
      for (let i = 0; i < count; i++) {
        let slot = pool.find((item) => item.life <= 0);
        if (!slot) {
          slot = pool.reduce((oldest, cur) => (cur.life < oldest.life ? cur : oldest), pool[0]);
        }
        slot.isDust = isDust;
        slot.pos.copy(origin);
        slot.color.setHex(isDust ? 0xe7d3b0 : starHex);
        slot.rotY = Math.random() * Math.PI * 2;
        const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
        const speed = isDust ? 0.6 + Math.random() * 0.8 : 1.5 + Math.random() * 1.9;
        slot.vel.set(
          Math.cos(angle) * speed,
          isDust ? 0.7 + Math.random() * 0.8 : 1.8 + Math.random() * 2.2,
          Math.sin(angle) * speed
        );
        slot.maxLife = isDust ? 0.42 : 0.58;
        slot.life = slot.maxLife;
        slot.scale = isDust ? 1.35 : 1.0;
      }
    };

    const spawnThrow = (
      team: 'red' | 'white',
      count: number,
      isGolden: boolean,
      playerId?: string,
      isMissThrow = false,
      stepAction?: VolleyballAnswerEvent['stepAction']
    ) => {
      const teamThrowers = throwers.filter((t) => t.team === team);
      const basket = team === 'red' ? redBasket : whiteBasket;
      const ended = stateRef.current.matchEnded;
      const isChaseMode = stateRef.current.cameraMode === 'STUDENT_CHASE';

      // Handle intermediate 3-step physical actions (Scoop from sand, Lock aim, or Fumble/Drop in sand)
      if (
        !ended &&
        (stepAction === 'SCOOP' ||
          stepAction === 'AIM' ||
          stepAction === 'FUMBLED_SAND' ||
          stepAction === 'DROPPED_BAG')
      ) {
        const actor =
          teamThrowers.find(
            (t) => t.id === playerId || t.nickname === stateRef.current.focusPlayer?.nickname
          ) || teamThrowers[0];
        if (actor) {
          const isFumble = stepAction === 'FUMBLED_SAND' || stepAction === 'DROPPED_BAG';
          if (isFumble) {
            calloutPool.trigger(actor.id, actor.nickname, actor.team, 1.05, false, true);
          }
          spawnParticles(
            new THREE.Vector3(
              actor.root.position.x + 0.18,
              isFumble ? 0.12 : stepAction === 'SCOOP' ? 0.22 : 1.15,
              actor.root.position.z - 0.25
            ),
            team,
            stepAction === 'AIM',
            isFumble
          );
        }
        return;
      }

      const totalToSpawn =
        ended || isMissThrow || (isChaseMode && Boolean(playerId)) ? count : count + 1;

      for (let c = 0; c < totalToSpawn; c++) {
        const isNearMiss =
          !ended && (isMissThrow || (c === totalToSpawn - 1 && totalToSpawn > count));
        const slot = flyingBags.find((b) => !b.active);
        if (!slot) break;

        const matchedStudent =
          c === 0 && playerId
            ? teamThrowers.find(
                (t) => t.id === playerId || t.nickname === stateRef.current.focusPlayer?.nickname
              ) || teamThrowers[0]
            : undefined;
        const thrower =
          matchedStudent ||
          teamThrowers[Math.floor(Math.random() * Math.max(1, teamThrowers.length))];

        if (thrower && !ended) {
          thrower.throwTimer = 0.48;
          if (c === 0 && isMissThrow) {
            calloutPool.trigger(thrower.id, thrower.nickname, thrower.team, 1.25, false, true);
          } else if (!isNearMiss && c === 0) {
            calloutPool.trigger(
              thrower.id,
              thrower.nickname,
              thrower.team,
              1.15,
              isGolden,
              false
            );
          }
          spawnParticles(
            new THREE.Vector3(thrower.root.position.x, 0.08, thrower.root.position.z),
            team,
            false,
            true
          );
        }

        slot.active = true;
        slot.team = team;
        slot.isGolden = isGolden && !isNearMiss;
        slot.isNearMiss = isNearMiss;
        slot.hasBounced = false;
        slot.progress = 0;
        slot.duration = ended ? 0.52 : isMissThrow ? 0.52 : 0.64 + c * 0.08;
        slot.scaleMult = ended ? 1.32 : slot.isGolden ? 1.38 : 1.08;
        slot.rot.set(0, 0, 0);
        slot.showTrail = true;

        slot.trailColor.setHex(
          isMissThrow
            ? 0xfb7185
            : slot.isGolden
              ? 0xfbbf24
              : team === 'red'
                ? 0xfda4af
                : 0xe2e8f0
        );

        const handOffsetX = thrower && isChaseMode && matchedStudent ? 0.22 : 0;
        const startX = thrower ? thrower.root.position.x + handOffsetX : basket.rimCenterWorld.x;
        const startZ = thrower ? thrower.root.position.z : 1.85;

        if (ended) {
          const curStep = ceremonyFrameRef.current?.stepIndex || 0;
          const col = curStep % 5;
          const row = Math.floor(curStep / 5) % 3;
          slot.startPos.set(basket.rimCenterWorld.x, basket.rimCenterWorld.y - 0.1, 0.15);
          slot.targetPos.set(
            basket.rimCenterWorld.x + (col - 2) * 0.28,
            0.14,
            1.05 + row * 0.26
          );
          slot.midPos.set(
            (slot.startPos.x + slot.targetPos.x) * 0.5 + (team === 'red' ? 0.35 : -0.35),
            basket.rimCenterWorld.y + 0.58,
            0.68
          );
        } else if (isNearMiss) {
          slot.startPos.set(startX, 1.15, startZ);
          const rimAngle = isMissThrow ? Math.PI * 0.82 : Math.random() * Math.PI * 2;
          slot.targetPos.set(
            basket.rimCenterWorld.x + Math.cos(rimAngle) * 0.74,
            basket.rimCenterWorld.y,
            basket.rimCenterWorld.z + Math.sin(rimAngle) * 0.74
          );
          slot.midPos.set(
            (slot.startPos.x + slot.targetPos.x) * 0.5,
            basket.rimCenterWorld.y + (isMissThrow ? 1.05 : 1.45),
            (slot.startPos.z + slot.targetPos.z) * 0.5
          );
          slot.bounceVel.set(
            Math.cos(rimAngle) * 2.35,
            1.85 + Math.random() * 0.5,
            Math.sin(rimAngle) * 2.15
          );
        } else {
          slot.startPos.set(startX, 1.15, startZ);
          const spread = matchedStudent ? (c - (count - 1) * 0.5) * 0.22 : (Math.random() - 0.5) * 0.44;
          slot.targetPos.set(
            basket.rimCenterWorld.x + spread,
            basket.rimCenterWorld.y - 0.22,
            basket.rimCenterWorld.z + (matchedStudent ? 0 : (Math.random() - 0.5) * 0.44)
          );
          slot.midPos.set(
            (slot.startPos.x + slot.targetPos.x) * 0.5,
            basket.rimCenterWorld.y + (matchedStudent ? 1.42 : 1.7 + Math.random() * 0.5),
            (slot.startPos.z + slot.targetPos.z) * 0.5
          );
        }

        slot.pos.copy(slot.startPos);
        slot.trailPos.copy(slot.startPos);
        slot.trailTarget.copy(slot.startPos);
      }
    };

    enqueueThrowsRef.current = spawnThrow;

    // ------------------------------------------------------------------------
    // G. Main Animation Tick (Zero Per-Frame Allocations, DRS, Instanced Sync)
    // ------------------------------------------------------------------------
    let animId = 0;
    let prevTime = performance.now();
    let ambientThrowAccumulator = 0;
    const prevPos = new THREE.Vector3();
    const _tmpQuat = new THREE.Quaternion();
    const _tmpStepQuat = new THREE.Quaternion();
    const _tmpColor = new THREE.Color();
    const _tmpBagObj = new THREE.Object3D();
    const _tmpScaleVec = new THREE.Vector3();
    const _tmpMat4 = new THREE.Matrix4();
    const _redDimRingCol = new THREE.Color(0xfda4af).multiplyScalar(0.32);
    const _whiteDimRingCol = new THREE.Color(0x93c5fd).multiplyScalar(0.32);
    const _ringColorPalette = [
      new THREE.Color(0xf43f5e),
      new THREE.Color(0x38bdf8),
      new THREE.Color(0xfbbf24)
    ];

    const tick = (now: number) => {
      if (isDisposed) return;
      animId = requestAnimationFrame(tick);
      const dt = Math.min(0.05, Math.max(0.001, (now - prevTime) / 1000));
      prevTime = now;
      const elapsed = now * 0.001;

      const {
        redScore: rScore,
        whiteScore: wScore,
        matchEnded: ended,
        redThrowRate: rRate = 0,
        whiteThrowRate: wRate = 0,
        cameraMode: camMode = 'DIRECTOR',
        focusPlayer: fPlayer,
        isGoldenNext: goldenNext = false,
        studentActionStep: actionStep = 2,
        studentViewPerspective: viewPerspective = 'THIRD_PERSON'
      } = stateRef.current;

      const cFrame = ceremonyFrameRef.current;
      countBeatPulseRef.current = Math.max(0, countBeatPulseRef.current - dt * 3.6);
      const countBeatWave = Math.sin(countBeatPulseRef.current * Math.PI);

      // Identify the focused student avatar when in STUDENT_CHASE mode
      const focusTeam = fPlayer?.team || 'red';
      const focusAvatar =
        camMode === 'STUDENT_CHASE'
          ? throwers.find(
              (t) =>
                t.team === focusTeam &&
                (t.id === fPlayer?.id || t.nickname === fPlayer?.nickname)
            ) || throwers.find((t) => t.team === focusTeam)
          : undefined;

      // Update 3D Target Sand Bean Bag & Instanced Parabolic Aiming Guide Arc
      if (camMode === 'STUDENT_CHASE' && !ended) {
        const fCenterX = focusTeam === 'white' ? 3.1 : -3.1;
        const avatarX = focusAvatar ? focusAvatar.root.position.x : fCenterX;
        const avatarZ = focusAvatar ? focusAvatar.root.position.z : 1.85;

        if (actionStep === 0) {
          targetSandBagGroup.visible = true;
          targetSandBagGroup.position.set(avatarX + 0.16, 0, avatarZ - 0.36);
          targetSandBagMesh.material = focusTeam === 'red' ? redBagMat : whiteBagMat;
          const ringPulse = 1 + Math.sin(elapsed * 7.5) * 0.14;
          targetSandRingMesh.scale.set(ringPulse, ringPulse, 1);
          targetSandRingMat.opacity = 0.65 + Math.sin(elapsed * 7.5) * 0.25;
          aimDotsInst.visible = false;
        } else {
          targetSandBagGroup.visible = false;
          const visibleDotCount = actionStep === 2 ? 14 : 6;
          aimDotsInst.count = visibleDotCount;
          aimDotsInst.visible = true;

          const handX = avatarX + 0.22;
          const handY = actionStep === 2 ? 1.18 : 1.02;
          const handZ = avatarZ;
          const rimX = fCenterX;
          const rimY = focusTeam === 'white' ? whiteBasket.rimCenterWorld.y - 0.15 : redBasket.rimCenterWorld.y - 0.15;
          const rimZ = 0;
          const midX = (handX + rimX) * 0.5;
          const midY = 5.42;
          const midZ = (handZ + rimZ) * 0.5;
          _tmpColor.setHex(goldenNext ? 0xfbbf24 : focusTeam === 'red' ? 0xfda4af : 0xbae6fd);

          for (let i = 0; i < visibleDotCount; i++) {
            const t = (i + ((elapsed * 3.2) % 1)) / 14;
            const invT = 1 - t;
            const dotScale =
              (goldenNext ? 1.28 : actionStep === 2 ? 0.96 : 0.72) *
              (0.7 + Math.sin(t * Math.PI) * 0.45);
            _dummyMatObj.position.set(
              invT * invT * handX + 2 * invT * t * midX + t * t * rimX,
              invT * invT * handY + 2 * invT * t * midY + t * t * rimY,
              invT * invT * handZ + 2 * invT * t * midZ + t * t * rimZ
            );
            _dummyMatObj.rotation.set(0, 0, 0);
            _dummyMatObj.scale.setScalar(dotScale);
            _dummyMatObj.updateMatrix();
            aimDotsInst.setMatrixAt(i, _dummyMatObj.matrix);
            aimDotsInst.setColorAt(i, _tmpColor);
          }
          aimDotsInst.instanceMatrix.needsUpdate = true;
          if (aimDotsInst.instanceColor) aimDotsInst.instanceColor.needsUpdate = true;
        }
      } else {
        targetSandBagGroup.visible = false;
        aimDotsInst.visible = false;
      }

      // Update Instanced 3D Counted Bean Bag Tally Piles (only when counts change!)
      const showRedCounted = ended && cFrame ? Math.min(60, cFrame.countedRed) : 0;
      const showWhiteCounted = ended && cFrame ? Math.min(60, cFrame.countedWhite) : 0;
      if (showRedCounted !== prevTallyRed || showWhiteCounted !== prevTallyWhite) {
        prevTallyRed = showRedCounted;
        prevTallyWhite = showWhiteCounted;
        let tallyIdx = 0;

        for (let i = 0; i < showRedCounted; i++) {
          const col = i % 5;
          const row = Math.floor(i / 5) % 3;
          const layer = Math.floor(i / 15);
          _dummyMatObj.position.set(
            -3.1 + (col - 2) * 0.28 + (layer % 2) * 0.06,
            0.08 + layer * 0.14,
            1.05 + row * 0.26
          );
          _dummyMatObj.rotation.set(0.1, i * 0.7, 0.08);
          _dummyMatObj.scale.set(1, 1, 1);
          _dummyMatObj.updateMatrix();
          tallyBagsInst.setMatrixAt(tallyIdx, _dummyMatObj.matrix);
          writeAtlasRect(tallyAtlasData, tallyIdx, redBagRect);
          tallyIdx++;
        }

        for (let i = 0; i < showWhiteCounted; i++) {
          const col = i % 5;
          const row = Math.floor(i / 5) % 3;
          const layer = Math.floor(i / 15);
          _dummyMatObj.position.set(
            3.1 + (col - 2) * 0.28 + (layer % 2) * 0.06,
            0.08 + layer * 0.14,
            1.05 + row * 0.26
          );
          _dummyMatObj.rotation.set(0.1, i * 0.7, 0.08);
          _dummyMatObj.scale.set(1, 1, 1);
          _dummyMatObj.updateMatrix();
          tallyBagsInst.setMatrixAt(tallyIdx, _dummyMatObj.matrix);
          writeAtlasRect(tallyAtlasData, tallyIdx, whiteBagRect);
          tallyIdx++;
        }

        tallyBagsInst.count = tallyIdx;
        tallyBagsInst.visible = tallyIdx > 0;
        tallyBagsInst.instanceMatrix.needsUpdate = true;
        tallyAtlasAttr.needsUpdate = true;
      }

      // 1. Dynamic Camera Choreography
      if (camMode === 'STUDENT_CHASE') {
        const isFirstPerson = viewPerspective === 'FIRST_PERSON';
        const targetFov = isFirstPerson ? 68 : 65;
        if (camera.fov !== targetFov) {
          camera.fov = targetFov;
          camera.updateProjectionMatrix();
        }
        const fCenterX = focusTeam === 'white' ? 3.1 : -3.1;
        const avatarX = focusAvatar ? focusAvatar.root.position.x : fCenterX;
        const avatarZ = focusAvatar ? focusAvatar.root.position.z : ended ? 2.18 : 1.85;

        if (!ended) {
          const activeTeamBag = flyingBags.find((b) => b.active && b.team === focusTeam);
          const followPulse = activeTeamBag
            ? Math.sin(Math.min(1, activeTeamBag.progress) * Math.PI)
            : 0;

          const stepLookY = actionStep === 0 ? 1.92 : actionStep === 1 ? 2.34 : 2.58;
          const targetCamX = isFirstPerson ? avatarX : avatarX + 0.28 - followPulse * 0.12;
          const targetCamY = isFirstPerson
            ? (actionStep === 0 ? 0.72 : 0.96) + followPulse * 0.25
            : (actionStep === 0 ? 1.02 : 1.14) + followPulse * 0.38;
          const targetCamZ = isFirstPerson
            ? avatarZ - 0.18 - followPulse * 0.25
            : avatarZ + 2.12 - followPulse * 0.48;

          camera.position.x += (targetCamX - camera.position.x) * Math.min(1, dt * 8);
          camera.position.y += (targetCamY - camera.position.y) * Math.min(1, dt * 8);
          camera.position.z += (targetCamZ - camera.position.z) * Math.min(1, dt * 8);
          camera.lookAt(fCenterX, stepLookY + followPulse * 0.62, 0);
        } else {
          const isRattle = cFrame?.stage === 'CLIFFHANGER_RATTLE';
          const shakeX = isRattle ? Math.sin(elapsed * 34) * 0.035 : Math.sin(elapsed * 0.45) * 0.08;
          const shakeY = isRattle ? Math.cos(elapsed * 29) * 0.025 : 0;

          const targetCamX = (isFirstPerson ? avatarX : avatarX + 0.26) + shakeX;
          const targetCamY = (isFirstPerson ? 0.68 : 0.96) + shakeY;
          const targetCamZ = isFirstPerson ? avatarZ - 0.18 : avatarZ + 2.25;
          const lookY = isFirstPerson ? 2.32 : 2.02;

          camera.position.x += (targetCamX - camera.position.x) * Math.min(1, dt * 5.5);
          camera.position.y += (targetCamY - camera.position.y) * Math.min(1, dt * 5.5);
          camera.position.z += (targetCamZ - camera.position.z) * Math.min(1, dt * 5.5);
          camera.lookAt(fCenterX, lookY, 0);
        }
      } else if (ended && cFrame) {
        if (camera.fov !== 42) {
          camera.fov = 42;
          camera.updateProjectionMatrix();
        }
        let targetCamX = 0;
        let targetCamY = 3.85;
        let targetCamZ = 11.4;
        let lookX = 0;
        let lookY = 2.15;

        if (cFrame.stage === 'WHISTLE_EYES_UP') {
          targetCamX = Math.sin(elapsed * 0.5) * 0.35;
          targetCamY = 3.95;
          targetCamZ = 11.6;
          lookY = 2.12;
        } else if (cFrame.stage === 'RHYTHMIC_CHANT') {
          targetCamX = Math.sin(elapsed * 0.42) * 0.45;
          targetCamY = 3.85;
          targetCamZ = 11.2;
          lookY = 2.18;
        } else if (cFrame.stage === 'TENSION_SLOWDOWN') {
          targetCamX = Math.sin(elapsed * 0.3) * 0.22;
          targetCamY = 3.78;
          targetCamZ = 10.75;
          lookY = 2.25;
        } else if (cFrame.stage === 'CLIFFHANGER_RATTLE') {
          targetCamX = Math.sin(elapsed * 34) * 0.045;
          targetCamY = 3.75 + Math.cos(elapsed * 29) * 0.035;
          targetCamZ = 10.5;
          lookY = 2.28;
        } else if (cFrame.stage === 'CLIMAX_REVEAL') {
          const focusSide = rScore > wScore ? -0.55 : wScore > rScore ? 0.55 : 0;
          targetCamX = focusSide;
          targetCamY = 3.8;
          targetCamZ = 10.85;
          lookX = focusSide * 0.85;
          lookY = 2.22;
        } else {
          targetCamX = Math.sin(elapsed * 0.38) * 0.65;
          targetCamY = 3.85;
          targetCamZ = 11.5;
          lookY = 2.15;
        }

        camera.position.x += (targetCamX - camera.position.x) * dt * 3.8;
        camera.position.y += (targetCamY - camera.position.y) * dt * 3.8;
        camera.position.z += (targetCamZ - camera.position.z) * dt * 3.8;
        camera.lookAt(lookX, lookY, 0);
      } else if (ended) {
        const targetCamX = Math.sin(elapsed * 0.35) * 0.75;
        camera.position.x += (targetCamX - camera.position.x) * dt * 2.8;
        camera.position.y += (3.85 - camera.position.y) * dt * 2.8;
        camera.position.z += (11.4 - camera.position.z) * dt * 2.8;
        camera.lookAt(0, 2.18, 0);
      } else {
        if (camera.fov !== 40) {
          camera.fov = 40;
          camera.updateProjectionMatrix();
        }
        const preset = directorCamPresetRef.current;
        const excitement = Math.min(1, (rRate + wRate) / 40);
        let targetCamX = Math.sin(elapsed * 0.28) * 0.65;
        let targetCamY = 4.35 - excitement * 0.35 + Math.cos(elapsed * 0.4) * 0.08;
        let targetCamZ = 12.1 - excitement * 0.85;
        let lookY = 2.28;

        if (preset === 'ORBIT') {
          targetCamX = Math.sin(elapsed * 0.52) * 3.8;
          targetCamY = 3.6 + Math.cos(elapsed * 0.4) * 0.45;
          targetCamZ = 10.6 + Math.cos(elapsed * 0.52) * 1.2;
          lookY = 2.45;
        } else if (preset === 'BASKETS') {
          targetCamX = Math.sin(elapsed * 0.25) * 0.35;
          targetCamY = 3.85;
          targetCamZ = 9.2;
          lookY = 3.35;
        }

        camera.position.x += (targetCamX - camera.position.x) * dt * 2.5;
        camera.position.y += (targetCamY - camera.position.y) * dt * 2.5;
        camera.position.z += (targetCamZ - camera.position.z) * dt * 2.5;
        camera.lookAt(0, lookY, -0.4);
      }

      // 2. Ambient throws when team throw rate is active (strictly disabled once matchEnded is true!)
      if (!ended && (rRate > 0 || wRate > 0)) {
        ambientThrowAccumulator += dt * (0.45 + (rRate + wRate) * 0.045);
        if (ambientThrowAccumulator >= 1.0) {
          ambientThrowAccumulator = 0;
          if (rRate > 0 && Math.random() < 0.5) spawnThrow('red', 1, false);
          if (wRate > 0 && Math.random() < 0.5) spawnThrow('white', 1, false);
        }
      }

      // 3. Update Adaptive Non-Overflowing Basket Fill, Net Squash & Instanced Inner Bags/Gauge Rings
      const updateBasketState = (basket: BasketAssembly, score: number, phase: number, isRed: boolean) => {
        const isCliffhanger = ended && cFrame?.stage === 'CLIFFHANGER_RATTLE';
        const visualBagCount =
          ended && cFrame
            ? isRed
              ? cFrame.remainingRedVisual
              : cFrame.remainingWhiteVisual
            : score;

        const targetFill = computeAdaptiveBasketFillRatio(visualBagCount, 20);
        basket.displayFillRatio += (targetFill - basket.displayFillRatio) * Math.min(1, dt * 6.5);
        const fillRatio = basket.displayFillRatio;

        if (isCliffhanger) {
          basket.hitSquash = 0.55 + Math.sin(elapsed * 38 + phase) * 0.35;
          basket.springVelX += Math.sin(elapsed * 44 + phase) * 1.45 * dt * 15;
          basket.springVelZ += Math.cos(elapsed * 39 + phase) * 1.45 * dt * 15;
        } else {
          basket.hitSquash = Math.max(0, basket.hitSquash - dt * 3.8);
        }
        const squashWave = Math.sin(basket.hitSquash * Math.PI);

        // 3a. Mound Core
        if (visualBagCount <= 0 && fillRatio < 0.01) {
          basket.moundMesh.visible = false;
        } else {
          basket.moundMesh.visible = true;
          const radialFit = 0.58 + fillRatio * 0.44 + squashWave * 0.08;
          const heightFit = Math.max(0.06, fillRatio * 0.95 - squashWave * 0.06);
          basket.moundMesh.scale.set(radialFit, heightFit, radialFit);
        }

        // 3b. Reveal & Jostle Instanced Inner Bean Bags
        const visibleBags =
          visualBagCount <= 12
            ? visualBagCount
            : Math.min(
                basket.innerBagBaseTransforms.length,
                Math.round(12 + ((fillRatio - computeAdaptiveBasketFillRatio(12, 20)) / 0.7) * 52)
              );

        basket.innerBagsInst.count = visibleBags;
        basket.innerBagsInst.visible = visibleBags > 0;
        if (visibleBags > 0 && squashWave > 0.01) {
          for (let i = 0; i < visibleBags; i++) {
            const base = basket.innerBagBaseTransforms[i];
            _tmpBagObj.position.set(base.pos[0], base.pos[1], base.pos[2]);
            _tmpBagObj.rotation.set(
              base.rot[0],
              base.rot[1],
              Math.cos(i * 1.3 + elapsed * 18) * (0.35 + squashWave * 0.25)
            );
            _tmpBagObj.scale.set(1, 1, 1);
            _tmpBagObj.updateMatrix();
            basket.innerBagsInst.setMatrixAt(i, _tmpBagObj.matrix);
          }
          basket.innerBagsInst.instanceMatrix.needsUpdate = true;
          basket.innerBagsNeedReset = true;
        } else if (basket.innerBagsNeedReset) {
          for (let i = 0; i < basket.innerBagBaseTransforms.length; i++) {
            basket.innerBagsInst.setMatrixAt(i, basket.innerBagBaseTransforms[i].matrix);
          }
          basket.innerBagsInst.instanceMatrix.needsUpdate = true;
          basket.innerBagsNeedReset = false;
        }

        // 3c. Net Belly Bulge + Hit Squash-and-Stretch Gulp
        const bellyBulge = 1 + fillRatio * 0.22 + squashWave * 0.14;
        const netSagY = 1 + fillRatio * 0.08 - squashWave * 0.09;
        basket.netMesh.scale.set(bellyBulge, netSagY, bellyBulge);
        basket.linerMesh.scale.set(bellyBulge * 0.98, netSagY, bellyBulge * 0.98);

        // 3d. Illuminate the 4 Fullness Gauge Rings (InstancedMesh)
        const ringThresholds = [0.2, 0.42, 0.65, 0.82];
        const dimColor = isRed ? _redDimRingCol : _whiteDimRingCol;
        for (let r = 0; r < 4; r++) {
          const reached = fillRatio >= ringThresholds[r] || isCliffhanger;
          const col = reached
            ? isCliffhanger || r === 3
              ? _ringColorPalette[2]
              : isRed
                ? _ringColorPalette[0]
                : _ringColorPalette[1]
            : dimColor;
          basket.levelRingsInst.setColorAt(r, col);
        }
        if (basket.levelRingsInst.instanceColor) basket.levelRingsInst.instanceColor.needsUpdate = true;

        // 3e. Rim Shockwave Ring Expansion & Visibility
        const pulseMat = basket.rimPulseRing.material as THREE.MeshBasicMaterial;
        if (basket.hitSquash > 0.01) {
          basket.rimPulseRing.visible = true;
          const pScale = 1 + (1 - basket.hitSquash) * 0.48;
          basket.rimPulseRing.scale.set(pScale, pScale, 1);
          pulseMat.opacity = basket.hitSquash * 0.9;
        } else {
          basket.rimPulseRing.visible = false;
          pulseMat.opacity = 0;
        }

        // 3f. Damped harmonic spring physics on the 4.3m pole!
        const stiffness = 42.0;
        const damping = 5.2;
        const windX = Math.sin(elapsed * 2.1 + phase) * 0.008;
        const windZ = Math.cos(elapsed * 1.7 + phase) * 0.008;

        const accelX = -stiffness * (basket.springAngleX - windX) - damping * basket.springVelX;
        const accelZ = -stiffness * (basket.springAngleZ - windZ) - damping * basket.springVelZ;
        basket.springVelX += accelX * dt;
        basket.springVelZ += accelZ * dt;
        basket.springAngleX += basket.springVelX * dt;
        basket.springAngleZ += basket.springVelZ * dt;

        basket.swayPivot.rotation.x = basket.springAngleX;
        basket.swayPivot.rotation.z = basket.springAngleZ;
      };
      updateBasketState(redBasket, rScore, 0, true);
      updateBasketState(whiteBasket, wScore, 1.8, false);

      // 4. Update & Batch Flying Bean Bags (InstancedMesh)
      let activeFlyingC = 0;
      let activeTrailC = 0;
      for (let i = 0; i < flyingBags.length; i++) {
        const bag = flyingBags[i];
        if (!bag.active) continue;

        prevPos.copy(bag.pos);

        if (bag.hasBounced) {
          bag.bounceVel.y -= 9.8 * dt;
          bag.pos.addScaledVector(bag.bounceVel, dt);
          _tmpQuat.setFromEuler(bag.rot);
          _tmpStepQuat.setFromAxisAngle(bag.spinAxis, dt * 14);
          _tmpQuat.multiply(_tmpStepQuat);
          bag.rot.setFromQuaternion(_tmpQuat);
          bag.showTrail = false;

          if (bag.pos.y <= 0.08) {
            bag.active = false;
            spawnParticles(bag.pos, bag.team, false, true);
            continue;
          }
        } else {
          bag.progress += dt / bag.duration;
          if (bag.progress >= 1) {
            const basket = bag.team === 'red' ? redBasket : whiteBasket;
            if (bag.isNearMiss && !ended) {
              bag.hasBounced = true;
              basket.springVelX += (Math.random() - 0.5) * 0.55;
              basket.springVelZ += (Math.random() - 0.5) * 0.55;
              spawnParticles(bag.targetPos, bag.team, false, false);
            } else {
              bag.active = false;
              bag.showTrail = false;
              if (!ended) {
                const impulse = bag.isGolden ? 0.65 : 0.32;
                basket.springVelX += (Math.random() - 0.5) * impulse;
                basket.springVelZ += (Math.random() - 0.5) * impulse;
                basket.hitSquash = bag.isGolden ? 1.0 : 0.78;
                const pulseMat = basket.rimPulseRing.material as THREE.MeshBasicMaterial;
                pulseMat.color.setHex(
                  bag.isGolden ? 0xfbbf24 : bag.team === 'red' ? 0xfb7185 : 0x38bdf8
                );
                spawnParticles(bag.targetPos, bag.team, bag.isGolden, false);
              } else {
                basket.hitSquash = bag.isGolden ? 0.92 : 0.62;
                basket.springVelX += (Math.random() - 0.5) * (bag.isGolden ? 0.45 : 0.25);
                const pulseMat = basket.rimPulseRing.material as THREE.MeshBasicMaterial;
                pulseMat.color.setHex(
                  bag.isGolden ? 0xfbbf24 : bag.team === 'red' ? 0xfb7185 : 0x38bdf8
                );
                spawnParticles(bag.targetPos, bag.team, bag.isGolden, true);
                if (bag.isGolden) {
                  spawnParticles(basket.rimCenterWorld, bag.team, true, false);
                }
              }
              continue;
            }
          } else {
            const t = bag.progress;
            const invT = 1 - t;
            bag.pos.x = invT * invT * bag.startPos.x + 2 * invT * t * bag.midPos.x + t * t * bag.targetPos.x;
            bag.pos.y = invT * invT * bag.startPos.y + 2 * invT * t * bag.midPos.y + t * t * bag.targetPos.y;
            bag.pos.z = invT * invT * bag.startPos.z + 2 * invT * t * bag.midPos.z + t * t * bag.targetPos.z;

            _tmpQuat.setFromEuler(bag.rot);
            _tmpStepQuat.setFromAxisAngle(bag.spinAxis, dt * 11);
            _tmpQuat.multiply(_tmpStepQuat);
            bag.rot.setFromQuaternion(_tmpQuat);

            bag.trailPos.lerpVectors(prevPos, bag.pos, 0.3);
            bag.trailTarget.copy(prevPos);
          }
        }

        _tmpQuat.setFromEuler(bag.rot);
        _tmpScaleVec.set(1.22 * bag.scaleMult, 0.75 * bag.scaleMult, 1.02 * bag.scaleMult);
        _tmpMat4.compose(bag.pos, _tmpQuat, _tmpScaleVec);
        flyingBagsInst.setMatrixAt(activeFlyingC, _tmpMat4);
        writeAtlasRect(
          flyingBagAtlasData,
          activeFlyingC,
          bag.isGolden ? goldBagRect : bag.team === 'red' ? redBagRect : whiteBagRect
        );
        activeFlyingC++;

        if (bag.showTrail) {
          _dummyMatObj.position.copy(bag.trailPos);
          _dummyMatObj.scale.set(1, 1, 1);
          _dummyMatObj.lookAt(bag.trailTarget);
          _dummyMatObj.updateMatrix();
          trailsInst.setMatrixAt(activeTrailC, _dummyMatObj.matrix);
          trailsInst.setColorAt(activeTrailC, bag.trailColor);
          activeTrailC++;
        }
      }
      flyingBagsInst.count = activeFlyingC;
      flyingBagsInst.visible = activeFlyingC > 0;
      if (activeFlyingC > 0) {
        flyingBagsInst.instanceMatrix.needsUpdate = true;
        flyingBagAtlasAttr.needsUpdate = true;
      }
      trailsInst.count = activeTrailC;
      trailsInst.visible = activeTrailC > 0;
      if (activeTrailC > 0) {
        trailsInst.instanceMatrix.needsUpdate = true;
        if (trailsInst.instanceColor) trailsInst.instanceColor.needsUpdate = true;
      }

      // 5. Update Star & Sand Dust Instanced Particles
      let activeStarC = 0;
      for (let i = 0; i < MAX_STARS; i++) {
        const p = starParticles[i];
        if (p.life <= 0) continue;
        p.life -= dt;
        if (p.life <= 0) continue;
        p.vel.y -= 5.2 * dt;
        p.pos.addScaledVector(p.vel, dt);
        p.rotY += dt * 7;
        const s = (p.life / p.maxLife) * p.scale;
        _dummyMatObj.position.copy(p.pos);
        _dummyMatObj.rotation.set(0, p.rotY, 0);
        _dummyMatObj.scale.setScalar(s);
        _dummyMatObj.updateMatrix();
        starInst.setMatrixAt(activeStarC, _dummyMatObj.matrix);
        starInst.setColorAt(activeStarC, p.color);
        activeStarC++;
      }
      starInst.count = activeStarC;
      starInst.visible = activeStarC > 0;
      if (activeStarC > 0) {
        starInst.instanceMatrix.needsUpdate = true;
        if (starInst.instanceColor) starInst.instanceColor.needsUpdate = true;
      }

      let activeDustC = 0;
      for (let i = 0; i < MAX_DUST; i++) {
        const p = dustParticles[i];
        if (p.life <= 0) continue;
        p.life -= dt;
        if (p.life <= 0) continue;
        p.vel.y -= 1.8 * dt;
        p.pos.addScaledVector(p.vel, dt);
        p.rotY += dt * 7;
        const s = (p.life / p.maxLife) * p.scale;
        _dummyMatObj.position.copy(p.pos);
        _dummyMatObj.rotation.set(0, p.rotY, 0);
        _dummyMatObj.scale.setScalar(s);
        _dummyMatObj.updateMatrix();
        dustInst.setMatrixAt(activeDustC, _dummyMatObj.matrix);
        activeDustC++;
      }
      dustInst.count = activeDustC;
      dustInst.visible = activeDustC > 0;
      if (activeDustC > 0) {
        dustInst.instanceMatrix.needsUpdate = true;
      }

      // 6. Animate Articulated Student Thrower Rigs (Zero Object Creation)
      for (let i = 0; i < throwers.length; i++) {
        const avatar = throwers[i];
        const isFocusedHero = camMode === 'STUDENT_CHASE' && focusAvatar === avatar;

        if (ended) {
          avatar.heldBagVisible = false;
          const stage = cFrame?.stage || 'VICTORY_FANFARE';

          const sitRadius = avatar.ringTier === 1 ? 2.65 : 2.18;
          const sitAngle = isFocusedHero ? Math.PI * 0.5 : avatar.baseAngle;
          const sitX = avatar.centerX + Math.cos(sitAngle) * sitRadius;
          const sitZ = Math.sin(sitAngle) * sitRadius;
          avatar.root.position.x += (sitX - avatar.root.position.x) * Math.min(1, dt * 5);
          avatar.root.position.z += (sitZ - avatar.root.position.z) * Math.min(1, dt * 5);

          if (isFocusedHero) {
            avatar.bodyPivot.rotation.y = Math.PI - 0.16;
          } else {
            const angleToPole = Math.atan2(avatar.centerX - avatar.root.position.x, 0 - avatar.root.position.z);
            const sinCam = Math.sin(angleToPole);
            const cosCam = Math.cos(angleToPole) * 0.45 + 0.55;
            avatar.bodyPivot.rotation.y = Math.atan2(sinCam, cosCam);
          }

          if (stage === 'WHISTLE_EYES_UP' || stage === 'RHYTHMIC_CHANT' || stage === 'TENSION_SLOWDOWN') {
            const clapBounce = countBeatWave * 0.06;
            avatar.bodyPivot.position.y = -0.22 + clapBounce;
            avatar.bodyPivot.rotation.x = -0.08;
            avatar.headGroup.rotation.x = -0.38 - countBeatWave * 0.12;
            avatar.legL.rotation.x = -1.25;
            avatar.legR.rotation.x = -1.25;
            avatar.armL.rotation.x = -1.15 - countBeatWave * 0.35;
            avatar.armR.rotation.x = -1.15 - countBeatWave * 0.35;
            avatar.armL.rotation.z = 0.25 - countBeatWave * 0.22;
            avatar.armR.rotation.z = -0.25 + countBeatWave * 0.22;
          } else if (stage === 'CLIFFHANGER_RATTLE') {
            const tremble = Math.sin(elapsed * 32 + i) * 0.025;
            avatar.bodyPivot.position.y = -0.18 + Math.abs(tremble);
            avatar.bodyPivot.rotation.x = 0.12;
            avatar.headGroup.rotation.x = -0.45;
            avatar.legL.rotation.x = -1.15;
            avatar.legR.rotation.x = -1.15;
            avatar.armL.rotation.x = -1.55 + tremble * 2;
            avatar.armR.rotation.x = -1.55 - tremble * 2;
          } else {
            avatar.armL.rotation.z = 0;
            avatar.armR.rotation.z = 0;
            const isWin =
              (rScore > wScore && avatar.team === 'red') ||
              (wScore > rScore && avatar.team === 'white') ||
              rScore === wScore;
            avatar.bodyPivot.rotation.y = isFocusedHero
              ? Math.PI - 0.16 + Math.sin(elapsed * 3) * 0.18
              : Math.sin(elapsed * 2 + i) * 0.25;
            if (isWin) {
              const jump = Math.abs(Math.sin(elapsed * 7.8 + avatar.pickupPhase)) * 0.38;
              avatar.bodyPivot.position.y = jump;
              avatar.bodyPivot.rotation.x = 0;
              avatar.armL.rotation.x = -2.75 + Math.sin(elapsed * 12 + i) * 0.25;
              avatar.armR.rotation.x = -2.75 - Math.sin(elapsed * 12 + i) * 0.25;
              avatar.legL.rotation.x = -jump * 0.8;
              avatar.legR.rotation.x = jump * 0.8;
              if (avatar.hairTailGroup) {
                avatar.hairTailGroup.rotation.x = Math.sin(elapsed * 15 + i) * 0.35;
              }
            } else {
              avatar.bodyPivot.position.y = -0.18;
              avatar.bodyPivot.rotation.x = 0.22;
              avatar.legL.rotation.x = -1.2;
              avatar.legR.rotation.x = -1.2;
              avatar.armL.rotation.x = -0.95 + Math.sin(elapsed * 10 + i) * 0.2;
              avatar.armR.rotation.x = -0.95 - Math.sin(elapsed * 10 + i) * 0.2;
            }
          }
          continue;
        }

        avatar.armL.rotation.z = 0;
        avatar.armR.rotation.z = 0;

        const patrolSpan = isFocusedHero ? 0.035 : avatar.ringTier === 1 ? 0.16 : 0.22;
        const patrolAngle = avatar.baseAngle + Math.sin(elapsed * 1.45 + avatar.pickupPhase) * patrolSpan;
        const px = avatar.centerX + Math.cos(patrolAngle) * avatar.radius;
        const pz = Math.sin(patrolAngle) * avatar.radius;
        avatar.root.position.set(px, 0, pz);

        if (isFocusedHero) {
          avatar.bodyPivot.rotation.y = Math.PI - 0.18;
        } else {
          const angleToBasket = Math.atan2(avatar.centerX - px, 0 - pz);
          const sinCam = Math.sin(angleToBasket);
          const cosCam = Math.cos(angleToBasket) * 0.45 + 0.55;
          avatar.bodyPivot.rotation.y = Math.atan2(sinCam, cosCam);
        }

        if (avatar.throwTimer > 0) {
          avatar.throwTimer = Math.max(0, avatar.throwTimer - dt);
          const prog = 1 - avatar.throwTimer / 0.48;
          const jumpArc = Math.sin(prog * Math.PI);
          avatar.bodyPivot.position.y = jumpArc * 0.34;
          avatar.bodyPivot.rotation.x = -0.18 * jumpArc;
          avatar.armL.rotation.x = -2.6 * jumpArc;
          avatar.armR.rotation.x = -2.85 * jumpArc;
          avatar.heldBagVisible = prog < 0.35;
          avatar.headGroup.rotation.x = -0.35;
          if (avatar.hairTailGroup) {
            avatar.hairTailGroup.rotation.x = -jumpArc * 0.55;
          }
        } else if (isFocusedHero) {
          const bob = Math.abs(Math.sin(elapsed * 4.5)) * 0.04;
          if (actionStep === 0) {
            const reach = Math.sin(elapsed * 5.2) * 0.06;
            avatar.bodyPivot.position.y = -0.15;
            avatar.bodyPivot.rotation.x = 0.46;
            avatar.armL.rotation.x = -0.75;
            avatar.armR.rotation.x = -1.15 - reach * 2;
            avatar.legL.rotation.x = -0.55;
            avatar.legR.rotation.x = -0.55;
            avatar.heldBagVisible = false;
            avatar.headGroup.rotation.x = 0.24;
          } else if (actionStep === 1) {
            avatar.bodyPivot.position.y = bob;
            avatar.bodyPivot.rotation.x = -0.03;
            avatar.armL.rotation.x = -0.65 - bob;
            avatar.armR.rotation.x = -1.22 - bob * 1.2;
            avatar.legL.rotation.x = 0;
            avatar.legR.rotation.x = 0;
            avatar.heldBagVisible = true;
            avatar.headGroup.rotation.x = -0.24;
          } else {
            avatar.bodyPivot.position.y = bob * 1.3;
            avatar.bodyPivot.rotation.x = -0.09;
            avatar.armL.rotation.x = -1.35 - bob * 1.5;
            avatar.armR.rotation.x = -1.85 - bob * 1.8;
            avatar.legL.rotation.x = 0;
            avatar.legR.rotation.x = 0;
            avatar.heldBagVisible = true;
            avatar.headGroup.rotation.x = -0.34;
          }
        } else {
          const cycle = Math.sin(elapsed * 4.2 + avatar.pickupPhase);
          if (cycle < -0.35) {
            const crouch = (-cycle - 0.35) / 0.65;
            avatar.bodyPivot.position.y = -crouch * 0.14;
            avatar.bodyPivot.rotation.x = crouch * 0.45;
            avatar.armL.rotation.x = -crouch * 0.9;
            avatar.armR.rotation.x = -crouch * 1.1;
            avatar.legL.rotation.x = -crouch * 0.5;
            avatar.legR.rotation.x = -crouch * 0.5;
            avatar.heldBagVisible = true;
            avatar.headGroup.rotation.x = 0.18;
          } else {
            const bob = Math.abs(Math.sin(elapsed * 6.5 + avatar.pickupPhase)) * 0.06;
            avatar.bodyPivot.position.y = bob;
            avatar.bodyPivot.rotation.x = -0.06;
            avatar.armL.rotation.x = -1.15 - bob * 2;
            avatar.armR.rotation.x = -1.45 - bob * 2;
            avatar.legL.rotation.x = Math.sin(elapsed * 6.5 + i) * 0.22;
            avatar.legR.rotation.x = -Math.sin(elapsed * 6.5 + i) * 0.22;
            avatar.heldBagVisible = true;
            avatar.headGroup.rotation.x = -0.26;
            if (avatar.hairTailGroup) {
              avatar.hairTailGroup.rotation.x = Math.sin(elapsed * 6.5 + i) * 0.18;
            }
          }
        }
      }

      const firstPersonHero =
        camMode === 'STUDENT_CHASE' && viewPerspective === 'FIRST_PERSON' ? focusAvatar : undefined;
      throwerPool.sync(throwers, firstPersonHero);

      // Update floating callout sprites (hide during end-of-match counting ceremony)
      if (ended) {
        calloutPool.hideAll();
      } else {
        calloutPool.update(dt, (ownerId) => {
          const match = throwers.find((t) => t.id === ownerId);
          return match ? match.root.position : null;
        });
      }

      // 7. Animate Cheering Tent Spectators & Clouds + DRS Frame Tracking
      arenaEnv.animateSpectators(elapsed);
      arenaEnv.cloudsGroup.rotation.y = Math.sin(elapsed * 0.04) * 0.06;

      trackFrameRate(dt);
      renderer.render(scene, camera);
    };

    animId = requestAnimationFrame(tick);

    return () => {
      isDisposed = true;
      cancelAnimationFrame(animId);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);
      enqueueThrowsRef.current = null;
      rebuildRosterRef.current = null;
      undokaiBannerMatRef.current = null;

      calloutPool.dispose();
      throwerPool.dispose();

      scene.traverse((obj) => {
        if ((obj as THREE.InstancedMesh).isInstancedMesh) {
          (obj as THREE.InstancedMesh).dispose();
        }
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh;
          if (mesh.geometry) mesh.geometry.dispose();
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          mats.forEach((m) => {
            if (!m) return;
            const stdMat = m as THREE.MeshStandardMaterial;
            if (stdMat.map && !stdMat.map.userData?.isSharedResource) {
              stdMat.map.dispose();
            }
            if (stdMat.bumpMap && !stdMat.bumpMap.userData?.isSharedResource) {
              stdMat.bumpMap.dispose();
            }
            m.dispose();
          });
        }
      });

      scene.clear();
      cleanupRenderer();
    };
  }, [contextRestartKey]);

  const currentStage = activeSuspenseFrame?.stage || (ceremonyComplete ? 'VICTORY_FANFARE' : null);
  const currentCallout =
    activeSuspenseFrame?.callout ||
    (Math.max(countedRed, countedWhite) > 0
      ? formatTamaireCountCallout(Math.max(countedRed, countedWhite))
      : null);
  const minScore = Math.min(redScore, whiteScore);
  const isCliffhanger = currentStage === 'CLIFFHANGER_RATTLE';
  const isClimax = currentStage === 'CLIMAX_REVEAL';

  return (
    <div
      className={`relative w-full h-full overflow-hidden bg-sky-200 select-none ${
        isStudentChase
          ? 'min-h-[160px]'
          : 'min-h-[380px] rounded-2xl shadow-2xl border-2 border-slate-800'
      }`}
      data-testid={isStudentChase ? 'student-tamaire-3d-chase' : 'tamaire-3d-stage'}
      data-ceremony-stage={currentStage || 'LIVE_PLAY'}
    >
      {/* 3D WebGL Viewport */}
      <div
        ref={mountRef}
        className={`w-full h-full ${isStudentChase ? 'min-h-[160px]' : 'min-h-[380px]'}`}
      />

      {/* Top Undokai Basket Scoreboard Overlay (Director TV View Only) */}
      {!isStudentChase && (
      <div className="pointer-events-none absolute inset-x-0 top-3 px-4 flex items-start justify-between gap-3 z-20">
        {/* Red Team Basket Counter */}
        <div
          className={`bg-rose-950/90 border-2 rounded-2xl px-3.5 py-2 shadow-xl flex items-center gap-3 backdrop-blur-sm min-w-[205px] transition-all duration-300 ${
            isCliffhanger
              ? 'border-amber-400 ring-4 ring-amber-400/40 scale-105'
              : isClimax && redScore > whiteScore
                ? 'border-amber-300 ring-4 ring-rose-500/50 scale-105'
                : 'border-rose-500'
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center font-black text-lg border border-rose-300 shrink-0">
            赤
          </div>
          <div className="flex-1">
            <div className="text-[11px] font-black uppercase tracking-wider text-rose-200 flex items-center justify-between gap-2">
              <span>
                <ruby>
                  赤組<rt>あかぐみ</rt>
                </ruby>{' '}
                カゴ (RED)
              </span>
              {isCliffhanger && (
                <span className="px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 text-[9px] font-black">
                  TIED!
                </span>
              )}
              {isClimax && redScore <= whiteScore && (
                <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[9px] font-black">
                  空っぽ (EMPTY)
                </span>
              )}
              {isClimax && redScore > whiteScore && (
                <span className="px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 text-[9px] font-black">
                  +{countedRed - minScore} 勝ち越し!
                </span>
              )}
            </div>
            <div
              data-testid="tamaire-red-count"
              className="text-2xl sm:text-3xl font-black text-white tabular-nums leading-none mt-0.5"
            >
              {matchEnded
                ? `${countedRed} 個`
                : hideScoreUntilEnd
                  ? '??? 個'
                  : `${redScore} 個`}
            </div>
            {/* Non-Overflowing Basket Fill Gauge */}
            <div className="mt-1.5 w-full h-2 rounded-full bg-rose-900/80 overflow-hidden border border-rose-700/60">
              <div
                className="h-full bg-gradient-to-r from-rose-500 via-rose-400 to-amber-300 transition-all duration-300"
                style={{
                  width: `${Math.round(
                    computeAdaptiveBasketFillRatio(
                      matchEnded
                        ? activeSuspenseFrame?.remainingRedVisual ?? 0
                        : redScore,
                      20
                    ) * 100
                  )}%`
                }}
              />
            </div>
          </div>
        </div>

        {/* Center Match Countdown Clock, Camera Switcher & Mystery Mode Pill */}
        <div className="flex flex-col items-center gap-1.5 pointer-events-auto">
          <div className="flex items-center gap-1.5">
            {typeof timeRemainingSeconds === 'number' && !matchEnded && (
              <div
                data-testid="tamaire-host-timer"
                className={`px-3 py-1 rounded-full font-mono text-xs font-black border shadow-lg transition-all ${
                  timeRemainingSeconds <= 10
                    ? 'bg-rose-600 text-white border-amber-300 animate-pulse scale-105'
                    : 'bg-slate-950/90 text-amber-300 border-slate-700'
                }`}
              >
                ⏱️ 残り {timeRemainingSeconds}秒
              </div>
            )}
            {matchEnded && (
              <div className="px-3 py-1 rounded-full bg-amber-400 text-slate-950 font-black text-xs shadow-lg border border-white">
                📢 試合終了・玉かぞえ中！ (TALLYING BAGS)
              </div>
            )}
            <button
              type="button"
              onClick={() => setCeremonySfxEnabled((v) => !v)}
              className="px-2.5 py-1 rounded-full bg-slate-950/85 hover:bg-slate-900 text-slate-200 border border-slate-700 text-[10px] font-bold cursor-pointer transition"
            >
              {ceremonySfxEnabled ? '🔊 太鼓・笛 ON' : '🔇 効果音 OFF'}
            </button>
          </div>

          {!matchEnded && (
            <div className="flex items-center gap-1 bg-slate-950/85 border border-slate-700/80 rounded-full p-0.5 shadow">
              {(
                [
                  { id: 'WIDE', label: '🎥 全体TV' },
                  { id: 'BASKETS', label: '🎥 カゴ拡大' },
                  { id: 'ORBIT', label: '🎥 ドローン' }
                ] as const
              ).map((cam) => (
                <button
                  key={cam.id}
                  type="button"
                  onClick={() => setDirectorCamPreset(cam.id)}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black transition cursor-pointer ${
                    directorCamPreset === cam.id
                      ? 'bg-amber-400 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {cam.label}
                </button>
              ))}
            </div>
          )}

          {!matchEnded && hideScoreUntilEnd && (
            <div className="hidden xl:block px-2.5 py-0.5 rounded-full bg-slate-950/85 border border-amber-400/50 text-amber-300 text-[10px] font-black">
              🔒 玉かぞえまで個数ヒミツ！
            </div>
          )}
        </div>

        {/* White Team Basket Counter */}
        <div
          className={`bg-slate-900/90 border-2 rounded-2xl px-3.5 py-2 shadow-xl flex items-center gap-3 backdrop-blur-sm min-w-[205px] transition-all duration-300 ${
            isCliffhanger
              ? 'border-amber-400 ring-4 ring-amber-400/40 scale-105'
              : isClimax && whiteScore > redScore
                ? 'border-amber-300 ring-4 ring-sky-400/50 scale-105'
                : 'border-slate-200'
          }`}
        >
          <div className="text-right flex-1">
            <div className="text-[11px] font-black uppercase tracking-wider text-slate-300 flex items-center justify-end gap-2">
              {isCliffhanger && (
                <span className="px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 text-[9px] font-black">
                  TIED!
                </span>
              )}
              {isClimax && whiteScore <= redScore && (
                <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[9px] font-black">
                  空っぽ (EMPTY)
                </span>
              )}
              {isClimax && whiteScore > redScore && (
                <span className="px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 text-[9px] font-black">
                  +{countedWhite - minScore} 勝ち越し!
                </span>
              )}
              <span>
                <ruby>
                  白組<rt>しろぐみ</rt>
                </ruby>{' '}
                カゴ (WHITE)
              </span>
            </div>
            <div
              data-testid="tamaire-white-count"
              className="text-2xl sm:text-3xl font-black text-white tabular-nums leading-none mt-0.5"
            >
              {matchEnded
                ? `${countedWhite} 個`
                : hideScoreUntilEnd
                  ? '??? 個'
                  : `${whiteScore} 個`}
            </div>
            {/* Non-Overflowing Basket Fill Gauge */}
            <div className="mt-1.5 w-full h-2 rounded-full bg-slate-800 overflow-hidden border border-slate-600/60 flex justify-end">
              <div
                className="h-full bg-gradient-to-l from-white via-sky-200 to-amber-300 transition-all duration-300"
                style={{
                  width: `${Math.round(
                    computeAdaptiveBasketFillRatio(
                      matchEnded
                        ? activeSuspenseFrame?.remainingWhiteVisual ?? 0
                        : whiteScore,
                      20
                    ) * 100
                  )}%`
                }}
              />
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white text-slate-900 flex items-center justify-center font-black text-lg border border-slate-300 shrink-0">
            白
          </div>
        </div>
      </div>
      )}

      {/* Live Student Throw Feed Pill on Main Screen during Active Play */}
      {!isStudentChase && !matchEnded && latestThrowBanner && (
        <div
          key={latestThrowBanner.id}
          data-testid="tamaire-live-throw-ticker"
          className="pointer-events-none absolute bottom-3 inset-x-0 flex justify-center z-20 px-4"
        >
          <div
            className={`px-4 py-1.5 rounded-full font-black text-xs shadow-xl border-2 flex items-center gap-2 backdrop-blur-md ${
              latestThrowBanner.isMiss
                ? 'bg-rose-950/90 text-rose-200 border-rose-400'
                : latestThrowBanner.isGoldenDouble
                  ? 'bg-amber-400 text-slate-950 border-white'
                  : latestThrowBanner.stepAction === 'SCOOP' || latestThrowBanner.stepAction === 'AIM'
                    ? 'bg-indigo-950/90 text-amber-200 border-amber-400/60'
                    : latestThrowBanner.team === 'red'
                      ? 'bg-rose-600/95 text-white border-rose-200'
                      : 'bg-slate-900/95 text-white border-slate-200'
            }`}
          >
            <span>
              {latestThrowBanner.team === 'red' ? '🔴 赤組' : '⚪ 白組'} • {latestThrowBanner.playerName}
            </span>
            <span className="opacity-60">|</span>
            <span>
              {latestThrowBanner.stepAction === 'SCOOP'
                ? '✋ ① お手玉を拾った！ (Step 1/3: Scooped Bag!)'
                : latestThrowBanner.stepAction === 'AIM'
                  ? '🎯 ② カゴに照準ロックオン！ (Step 2/3: Locked On Net!)'
                  : latestThrowBanner.stepAction === 'FUMBLED_SAND'
                    ? '💦 砂で手が滑った！ (Fumbled in Sand!)'
                    : latestThrowBanner.stepAction === 'DROPPED_BAG'
                      ? '💦 あっ！お手玉を落とした！ (Dropped Bag -> Back to Step 1!)'
                      : latestThrowBanner.isMiss
                        ? '💥 ガンッ！カゴのフチに弾かれた！ (RIM DOINK!)'
                        : latestThrowBanner.isGoldenDouble
                          ? '🔥 金のお手玉 2個スウィッシュ！！ (+2 BAGS!)'
                          : '🎯 ③ スポッ！ナイスイン！ (+1 BAG SWISH!)'}
            </span>
          </div>
        </div>
      )}

      {/* Post-Whistle Multi-Stage Suspenseful Counting Ceremony Banner (Director TV View Only) */}
      {!isStudentChase && matchEnded && (countingActive || ceremonyComplete) && (
        <div
          data-testid="tamaire-ceremony-banner"
          className="pointer-events-none absolute inset-x-0 bottom-3 flex flex-col items-center justify-center z-30 px-4"
        >
          {/* 4-Step Ceremony Progress Stepper */}
          <div className="mb-1.5 flex items-center gap-1.5 bg-slate-950/90 border border-slate-700/80 px-3 py-1 rounded-full shadow-lg">
            {[
              { id: 'WHISTLE_EYES_UP', label: '① 笛・体育座りで注目 (Sit & Look Up)' },
              { id: 'RHYTHMIC_CHANT', label: '② 玉かぞえ (Count Out Loud)' },
              { id: 'CLIFFHANGER_RATTLE', label: '③ 同点ドラムロール (Suspense!)' },
              { id: 'VICTORY_FANFARE', label: '④ 決着！(Winner!)' },
            ].map((st) => {
              const active =
                currentStage === st.id ||
                (st.id === 'RHYTHMIC_CHANT' && currentStage === 'TENSION_SLOWDOWN') ||
                (st.id === 'VICTORY_FANFARE' && currentStage === 'CLIMAX_REVEAL');
              return (
                <span
                  key={st.id}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black transition-all ${
                    active
                      ? 'bg-amber-400 text-slate-950 shadow'
                      : 'text-slate-400'
                  }`}
                >
                  {st.label}
                </span>
              );
            })}
          </div>

          {/* Visual Bean Bag Tally Rack (玉かぞえビジュアルラック) — Shows bags lining up 1-by-1! */}
          {(countedRed > 0 || countedWhite > 0) && (
            <div
              data-testid="tamaire-visual-tally-rack"
              className="mb-1.5 w-full max-w-xl bg-slate-950/90 border border-slate-700 rounded-2xl px-3.5 py-1.5 shadow-xl grid grid-cols-2 gap-3"
            >
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center justify-between text-[10px] font-black text-rose-300">
                  <span>🔴 赤組 カウント済み</span>
                  <span className="font-mono text-xs text-white">{countedRed}個</span>
                </div>
                <div className="flex flex-wrap gap-0.5 min-h-[16px] items-center">
                  {Array.from({ length: Math.min(25, countedRed) }).map((_, idx) => (
                    <span
                      key={idx}
                      className={`inline-block w-2.5 h-2 rounded-full border ${
                        idx >= minScore
                          ? 'bg-amber-400 border-white animate-bounce'
                          : 'bg-rose-500 border-rose-200'
                      }`}
                    />
                  ))}
                  {countedRed > 25 && (
                    <span className="text-[9px] font-black text-amber-300 ml-1">
                      +{countedRed - 25}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-0.5">
                <div className="flex items-center justify-between text-[10px] font-black text-slate-200">
                  <span>⚪ 白組 カウント済み</span>
                  <span className="font-mono text-xs text-white">{countedWhite}個</span>
                </div>
                <div className="flex flex-wrap gap-0.5 min-h-[16px] items-center">
                  {Array.from({ length: Math.min(25, countedWhite) }).map((_, idx) => (
                    <span
                      key={idx}
                      className={`inline-block w-2.5 h-2 rounded-full border ${
                        idx >= minScore
                          ? 'bg-amber-400 border-white animate-bounce'
                          : 'bg-white border-slate-400'
                      }`}
                    />
                  ))}
                  {countedWhite > 25 && (
                    <span className="text-[9px] font-black text-amber-300 ml-1">
                      +{countedWhite - 25}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {currentStage === 'WHISTLE_EYES_UP' ? (
            <div className="bg-slate-950/95 border-4 border-amber-400 rounded-3xl px-6 py-2.5 text-center shadow-2xl max-w-2xl">
              <span className="text-[11px] font-black uppercase tracking-widest text-amber-300 block">
                👀 STOP THROWING! EVERYONE SIT &amp; LOOK UP AT THE BASKETS!
              </span>
              <div className="text-xl sm:text-2xl font-black text-white tracking-tight">
                📢 ピーッ！終了！カゴからお手玉を出して「玉かぞえ」スタート！！
              </div>
              <p className="text-[11px] font-bold text-slate-300 mt-0.5">
                生徒たちが線の外に体育座りして、カゴから飛び出すお手玉を1つずつ数えます！
              </p>
            </div>
          ) : currentStage === 'CLIFFHANGER_RATTLE' ? (
            <div className="bg-amber-950/95 border-4 border-amber-400 rounded-3xl px-6 py-2.5 text-center shadow-2xl max-w-2xl ring-4 ring-amber-400/30">
              <span className="text-[11px] font-black uppercase tracking-widest text-amber-300 block">
                🥁 TAIKO DRUMROLL CLIFFHANGER • TIED AT {minScore} BAGS EACH!!
              </span>
              <div className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {activeSuspenseFrame?.headlineJa}
              </div>
              <div className="mt-1 flex items-center justify-center gap-5 text-xs font-black">
                <span className="text-rose-300">🔴 赤組: {countedRed}個 (同点!)</span>
                <span className="text-amber-300">⚡ カゴの底を揺らして確認中…！</span>
                <span className="text-sky-200">⚪ 白組: {countedWhite}個 (同点!)</span>
              </div>
            </div>
          ) : countingActive && currentCallout ? (
            <div
              className={`bg-slate-950/95 border-4 rounded-3xl px-7 py-2 text-center shadow-2xl max-w-2xl transition-all ${
                currentStage === 'CLIMAX_REVEAL'
                  ? 'border-rose-400 ring-4 ring-amber-400/50'
                  : currentStage === 'TENSION_SLOWDOWN'
                    ? 'border-amber-300 ring-2 ring-amber-400/30'
                    : 'border-amber-400'
              }`}
            >
              <span className="text-[11px] font-black uppercase tracking-widest text-amber-300 block">
                {activeSuspenseFrame?.headlineJa || '📢 玉かぞえセレモニー • COUNTING CEREMONY!'}
              </span>
              <div className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                「{currentCallout.reading}」 ({currentCallout.romaji})
              </div>
              <div className="mt-0.5 flex items-center justify-center gap-6 text-xs font-black">
                <span className="text-rose-400">
                  🔴 赤組: {countedRed}個{' '}
                  {currentStage === 'CLIMAX_REVEAL' && redScore > whiteScore && '🔥 まだ入ってた!!'}
                </span>
                <span className="text-slate-200">
                  ⚪ 白組: {countedWhite}個{' '}
                  {currentStage === 'CLIMAX_REVEAL' && whiteScore > redScore && '🔥 まだ入ってた!!'}
                </span>
              </div>
            </div>
          ) : (
            <div className="pointer-events-auto bg-slate-950/95 border-4 border-amber-400 rounded-3xl px-6 py-2 text-center shadow-2xl flex flex-col sm:flex-row items-center gap-4">
              <div className="text-left">
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-300 block">
                  🏆 玉入れ合戦 結果発表 • FINAL TAMAIRE COUNT
                </span>
                <div className="text-xl sm:text-2xl lg:text-3xl font-black text-white whitespace-nowrap">
                  {redScore > whiteScore
                    ? `🔴 赤組の勝利！ (${redScore} 対 ${whiteScore})`
                    : whiteScore > redScore
                      ? `⚪ 白組の勝利！ (${whiteScore} 対 ${redScore})`
                      : `🤝 引き分け！ (${redScore} 対 ${whiteScore})`}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCeremonyReplayNonce((n) => n + 1)}
                className="px-3.5 py-2 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-md transition cursor-pointer shrink-0"
              >
                🔁 玉かぞえリプレイ (Replay Count)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Export Volleyball3DStage alias for 100% drop-in compatibility with existing Eigo Arena imports
export const Volleyball3DStage = Tamaire3DStage;
export default Tamaire3DStage;

