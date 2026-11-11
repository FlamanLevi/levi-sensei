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
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { TeamId } from '../types';
import {
  formatTamaireCountCallout,
  buildTamaireSuspenseSchedule,
  TamaireSuspenseFrame,
} from '../core/quizEngine';
import { detectClassroomGpuProfile } from '@/utils/classroom3d';
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

// ----------------------------------------------------------------------------
function afterDraw(cb: FrameRequestCallback): number {
  return requestAnimationFrame(cb);
}

// ----------------------------------------------------------------------------
// 2. Nintendo Wii Sports Satin Rim-Lighting & Hemisphere Boost Shader
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

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(6, 6);

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
 * Generates vertical celebration banners (懸垂幕) hanging on the school building facade.
 */
function createVerticalSchoolBannerTexture(text: string, bg: string, fg: string): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

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

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Generates the woven cotton & white-stitched texture for Japanese Otedama (お手玉) bean bags.
 */
function createStitchedBeanBagTexture(baseHex: string, stitchHex: string, isGold = false): THREE.CanvasTexture | null {
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
  return tex;
}

// ----------------------------------------------------------------------------
// 4. Composite 3D Builders: Basket Poles, Articulated Mii Throwers, Tents & School
// ----------------------------------------------------------------------------
interface BasketAssembly {
  root: THREE.Group;
  swayPivot: THREE.Group; // Pivots from base for realistic spring bending!
  rimCenterWorld: THREE.Vector3;
  innerBagsGroup: THREE.Group;
  innerBagMeshes: THREE.Mesh[];
  moundMesh: THREE.Mesh; // Sculpted inner bean-bag mound core so fullness reads clearly from 30ft away
  rimPulseRing: THREE.Mesh; // Glowing shockwave ring on the metal hoop when a bag scores
  levelRings: THREE.Mesh[]; // 25%, 50%, 75%, 90% fullness gauge rings around the net cone
  netMesh: THREE.Mesh;
  linerMesh: THREE.Mesh;
  hoopMesh: THREE.Mesh;
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

interface ThrowerAvatar {
  id: string;
  nickname: string;
  root: THREE.Group;
  bodyPivot: THREE.Group;
  headGroup: THREE.Group;
  hairTailGroup: THREE.Group | null;
  armL: THREE.Group;
  armR: THREE.Group;
  legL: THREE.Group;
  legR: THREE.Group;
  heldBag: THREE.Mesh;
  shadow: THREE.Mesh;
  calloutSprite: THREE.Sprite;
  missCalloutSprite: THREE.Sprite;
  calloutTimer: number;
  team: 'red' | 'white';
  ringTier: 0 | 1; // 0 = inner chalk ring, 1 = outer ring (for 9..20 players per team)
  baseAngle: number;
  radius: number;
  centerX: number;
  throwTimer: number;
  pickupPhase: number;
  heightScale: number;
}

/**
 * Generates a high-contrast Japanese PE Zekken (ゼッケン) chest/back bib texture with team kanji & 2-digit number.
 */
function createZekkenBibTexture(team: 'red' | 'white', num: number): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

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
  const numStr = String((num % 40) + 1).padStart(2, '0');
  ctx.fillText(numStr, 64, 78);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Generates an expressive Nintendo Mii / Chibi-Anime face texture mapped onto the front of the head sphere.
 */
const cachedFaceTextures: Record<string, THREE.CanvasTexture> = {};
function createExpressiveMiiFaceTexture(skinHex: number, exprVariant: number): THREE.CanvasTexture | null {
  const key = `${skinHex.toString(16)}_${exprVariant}`;
  if (cachedFaceTextures[key]) return cachedFaceTextures[key];
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const hexStr = `#${skinHex.toString(16).padStart(6, '0')}`;
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

  // Large Shiny Anime / Mii Eyes (or happy curved eyes on variant 3)
  if (exprVariant % 5 === 4) {
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
      // White sclera outer rim
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(ex, ey, 17, 21, 0, 0, Math.PI * 2);
      ctx.fill();

      // Dark espresso iris
      ctx.fillStyle = '#1c1917';
      ctx.beginPath();
      ctx.ellipse(ex, ey + 1, 13, 17, 0, 0, Math.PI * 2);
      ctx.fill();

      // Large top-left catchlight sparkle
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex - 5, ey - 6, 5.5, 0, Math.PI * 2);
      ctx.fill();

      // Secondary bottom-right catchlight
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

  // Energetic Open Smile ("いくぞー！" / Cheering mouth)
  ctx.fillStyle = '#9f1239';
  ctx.beginPath();
  ctx.arc(128, 164, 20, 0.08, Math.PI - 0.08, false);
  ctx.closePath();
  ctx.fill();

  // Pink tongue highlight inside mouth
  ctx.fillStyle = '#fb7185';
  ctx.beginPath();
  ctx.arc(128, 174, 11, Math.PI, Math.PI * 2);
  ctx.fill();

  // Upper teeth line
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(113, 164, 30, 5);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  cachedFaceTextures[key] = tex;
  return tex;
}

/**
 * Generates a floating 3D callout badge above a student's head when they throw a bean bag!
 */
function createStudentCalloutSprite(
  nickname: string,
  team: 'red' | 'white',
  isGold = false,
  isMiss = false
): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 420;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  if (ctx) {
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
    const shortName = nickname.length > 10 ? `${nickname.slice(0, 9)}…` : nickname;
    const label = isMiss
      ? `💥 ${shortName} DOINK!`
      : `${shortName} ${isGold ? '🔥+2!' : '🎯+1!'}`;
    ctx.fillText(label, 210, 48);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(1.65, 0.39, 1);
  sprite.position.set(0, 1.58, 0);
  sprite.visible = false;
  sprite.renderOrder = 25;
  return sprite;
}

/**
 * Builds an expressive Chibi-Mii Japanese Elementary Student Thrower with:
 * - 5 distinct hairstyles (Twin Pigtails, High Ponytail, Spiky Shonen, Bob Cut, Sporty Crop)
 * - Authentic Japanese Undokai Kohaku-bo (紅白帽 reversible PE cap) or knotted Hachimaki headband
 * - Canvas-mapped expressive Mii face (shiny eyes, eyebrows, rosy cheeks, open smile) + 3D ears
 * - Tapered Taisofuku gym shirt with numbered Zekken (ゼッケン) bibs on chest & back
 * - Articulated arms, legs, knee-high socks, Uwabaki sneakers, and floating name callout sprite!
 */
function buildArticulatedThrower(
  team: 'red' | 'white',
  index: number,
  studentId: string,
  nickname: string,
  centerX: number,
  radius: number,
  angle: number,
  ringTier: 0 | 1,
  redBagMat: THREE.Material,
  whiteBagMat: THREE.Material,
  shadowTex: THREE.Texture | null
): ThrowerAvatar {
  const root = new THREE.Group();
  const x = centerX + Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;
  root.position.set(x, 0, z);

  // Slight natural height variation among elementary school classmates
  const heightScale = 0.92 + ((index * 17) % 10) * 0.018;
  root.scale.setScalar(heightScale);

  // Double-ring contact shadow on the sand
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTex || undefined,
    color: shadowTex ? 0xffffff : 0x261a0e,
    transparent: true,
    opacity: shadowTex ? 0.85 : 0.35,
    depthWrite: false
  });
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(0.92, 0.92), shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.015;
  root.add(shadow);

  const bodyPivot = new THREE.Group();
  // Camera-aware 3/4 facing: blend angle toward basket with angle toward front TV camera (+Z)
  // so foreground students never turn their backs 100% to the classroom TV!
  const angleToBasket = Math.atan2(centerX - x, 0 - z);
  const sinCam = Math.sin(angleToBasket);
  const cosCam = Math.cos(angleToBasket) * 0.45 + 0.55; // Bias forward (+Z) so faces are visible!
  bodyPivot.rotation.y = Math.atan2(sinCam, cosCam);
  root.add(bodyPivot);

  const skinTones = [0xffe9d6, 0xffdfc4, 0xf6cfa9, 0xfff1e0, 0xf3c69f];
  const hairColors = [0x18130f, 0x2c1b10, 0x0f172a, 0x422614, 0x231912];
  const skinHex = skinTones[index % skinTones.length];
  const hairHex = hairColors[(index * 3) % hairColors.length];

  const skinMat = injectWiiSatinRimShader(
    new THREE.MeshStandardMaterial({ color: skinHex, roughness: 0.42 })
  );
  const hairMat = injectWiiSatinRimShader(
    new THREE.MeshStandardMaterial({ color: hairHex, roughness: 0.58 })
  );
  const shirtMat = injectWiiSatinRimShader(
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.48 })
  );
  const collarTrimMat = injectWiiSatinRimShader(
    new THREE.MeshStandardMaterial({ color: team === 'red' ? 0xe11d48 : 0x2563eb, roughness: 0.45 })
  );
  const shortsMat = injectWiiSatinRimShader(
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 })
  );
  const shoeMat = injectWiiSatinRimShader(
    new THREE.MeshStandardMaterial({ color: team === 'red' ? 0xe11d48 : 0x2563eb, roughness: 0.42 })
  );
  const soleMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.7 });

  // 1. Articulated Legs + Rounded Knees + High White Socks + Uwabaki Sneakers
  const buildLeg = (lx: number) => {
    const legGroup = new THREE.Group();
    legGroup.position.set(lx, 0.38, 0);

    const shortsLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.086, 0.16, 12), shortsMat);
    shortsLeg.position.y = -0.06;
    legGroup.add(shortsLeg);

    const knee = new THREE.Mesh(new THREE.SphereGeometry(0.064, 10, 8), skinMat);
    knee.position.y = -0.15;
    legGroup.add(knee);

    const sock = new THREE.Mesh(new THREE.CylinderGeometry(0.066, 0.058, 0.14, 10), shirtMat);
    sock.position.y = -0.24;
    legGroup.add(sock);

    // Sock team stripe
    const sockStripe = new THREE.Mesh(new THREE.TorusGeometry(0.064, 0.01, 6, 14), collarTrimMat);
    sockStripe.rotation.x = Math.PI / 2;
    sockStripe.position.y = -0.19;
    legGroup.add(sockStripe);

    // Rounded sneaker body + white rubber sole
    const shoeUpper = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), shoeMat);
    shoeUpper.scale.set(0.95, 0.65, 1.45);
    shoeUpper.position.set(0, -0.32, 0.03);
    shoeUpper.castShadow = true;
    legGroup.add(shoeUpper);

    const shoeSole = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.075, 0.032, 10), soleMat);
    shoeSole.scale.set(0.95, 1, 1.45);
    shoeSole.position.set(0, -0.35, 0.03);
    legGroup.add(shoeSole);

    return legGroup;
  };
  const legL = buildLeg(-0.115);
  const legR = buildLeg(0.115);
  bodyPivot.add(legL, legR);

  // 2. Sculpted Tapered Torso (Taisofuku Gym Shirt + Shorts Hip Pelvis + Numbered Zekken Bibs)
  const pelvis = new THREE.Mesh(new THREE.SphereGeometry(0.21, 12, 10), shortsMat);
  pelvis.scale.set(1.02, 0.62, 0.88);
  pelvis.position.y = 0.37;
  bodyPivot.add(pelvis);

  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.185, 0.215, 0.44, 16), shirtMat);
  torso.scale.set(1.06, 1, 0.86);
  torso.position.y = 0.58;
  torso.castShadow = true;
  bodyPivot.add(torso);

  // Puffed shoulder caps
  [-0.21, 0.21].forEach((sx) => {
    const sh = new THREE.Mesh(new THREE.SphereGeometry(0.088, 10, 8), shirtMat);
    sh.position.set(sx, 0.74, 0);
    bodyPivot.add(sh);
  });

  // Red/Navy Ringer Collar
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.138, 0.03, 8, 18), collarTrimMat);
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 0.79;
  bodyPivot.add(collar);

  // Numbered Zekken Bibs on BOTH Front and Back so student numbers read from every angle!
  const bibTex = createZekkenBibTexture(team, index);
  const bibMat = new THREE.MeshStandardMaterial({
    map: bibTex || undefined,
    color: 0xffffff,
    roughness: 0.55
  });
  const frontBib = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.24), bibMat);
  frontBib.position.set(0, 0.58, 0.188);
  bodyPivot.add(frontBib);

  const backBib = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.24), bibMat);
  backBib.rotation.y = Math.PI;
  backBib.position.set(0, 0.58, -0.188);
  bodyPivot.add(backBib);

  // 3. Expressive Chibi-Mii Head Group + 5 Hairstyles + Kohaku-bo Cap / Hachimaki
  const headGroup = new THREE.Group();
  headGroup.position.y = 1.03;
  bodyPivot.add(headGroup);

  const faceTex = createExpressiveMiiFaceTexture(skinHex, index);
  const headMat = injectWiiSatinRimShader(
    new THREE.MeshStandardMaterial({
      map: faceTex || undefined,
      color: faceTex ? 0xffffff : skinHex,
      roughness: 0.4
    })
  );
  // Rotate sphere -90 deg on Y so UV center (u=0.5) faces +Z forward!
  const headGeo = new THREE.SphereGeometry(0.245, 22, 18);
  headGeo.rotateY(-Math.PI / 2);
  const head = new THREE.Mesh(headGeo, headMat);
  head.scale.set(1.04, 0.98, 1.0);
  head.castShadow = true;
  headGroup.add(head);

  // Cute 3D Side Ears (耳)
  [-0.245, 0.245].forEach((ex) => {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.052, 8, 8), skinMat);
    ear.scale.set(0.55, 1.0, 0.75);
    ear.position.set(ex, -0.01, 0);
    headGroup.add(ear);
  });

  // Base Hair Back-Cap & Sculpted Front Bangs (前髪)
  const hairBack = new THREE.Mesh(
    new THREE.SphereGeometry(0.256, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.56),
    hairMat
  );
  hairBack.rotation.x = -0.28;
  headGroup.add(hairBack);

  // Sculpted Anime Front Fringe Bangs across forehead
  for (let b = -2; b <= 2; b++) {
    const bang = new THREE.Mesh(new THREE.ConeGeometry(0.048, 0.13, 6), hairMat);
    bang.position.set(b * 0.058, 0.13, 0.215 - Math.abs(b) * 0.018);
    bang.rotation.x = Math.PI - 0.35;
    bang.rotation.z = b * -0.12;
    headGroup.add(bang);
  }

  // 5 Distinct Student Hairstyles (Twin Pigtails, Ponytail, Spiky Shonen, Bob Cut, Sporty Crop)
  let hairTailGroup: THREE.Group | null = null;
  const hairStyle = index % 5;
  const hairTieMat = new THREE.MeshStandardMaterial({
    color: team === 'red' ? 0xf43f5e : 0x38bdf8,
    roughness: 0.35
  });

  if (hairStyle === 0) {
    // Style 0: Twin Pigtails (ツインテール) with hair-tie beads!
    hairTailGroup = new THREE.Group();
    headGroup.add(hairTailGroup);
    [-1, 1].forEach((side) => {
      const tie = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), hairTieMat);
      tie.position.set(side * 0.25, 0.05, -0.06);
      hairTailGroup!.add(tie);

      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.28, 10), hairMat);
      tail.position.set(side * 0.32, -0.05, -0.08);
      tail.rotation.z = side * 2.45;
      tail.rotation.x = 0.2;
      hairTailGroup!.add(tail);
    });
  } else if (hairStyle === 1) {
    // Style 1: Energetic High Ponytail (ポニーテール)
    hairTailGroup = new THREE.Group();
    hairTailGroup.position.set(0, 0.12, -0.24);
    headGroup.add(hairTailGroup);

    const tie = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.018, 6, 12), hairTieMat);
    hairTailGroup.add(tie);

    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.095, 0.32, 10), hairMat);
    tail.position.set(0, -0.06, -0.12);
    tail.rotation.x = -2.1;
    hairTailGroup.add(tail);
  } else if (hairStyle === 2) {
    // Style 2: Spiky Shonen Hair Tufts (ツンツン髪)
    [
      [-0.14, 0.22, -0.08, 0.45],
      [0.14, 0.22, -0.08, -0.45],
      [0, 0.26, -0.14, 0]
    ].forEach(([sx, sy, sz, rz]) => {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.16, 6), hairMat);
      spike.position.set(sx, sy, sz);
      spike.rotation.z = rz;
      spike.rotation.x = -0.35;
      headGroup.add(spike);
    });
  } else if (hairStyle === 3) {
    // Style 3: Classic Japanese Elementary Bob-Cut Side Locks (おかっぱ)
    [-0.22, 0.22].forEach((bx) => {
      const sideLock = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.065, 0.22, 8), hairMat);
      sideLock.position.set(bx, -0.03, 0.04);
      sideLock.rotation.z = bx > 0 ? -0.15 : 0.15;
      headGroup.add(sideLock);
    });
  }

  // Headgear: Alternate between iconic Japanese PE Kohaku-bo Cap (紅白帽) & Hachimaki Headband (鉢巻)
  const capMat = injectWiiSatinRimShader(
    new THREE.MeshStandardMaterial({
      color: team === 'red' ? 0xe11d48 : 0xf8fafc,
      roughness: 0.42
    })
  );

  if (index % 2 === 0) {
    // Authentic Japanese Elementary Kohaku-bo PE Cap (紅白帽) with front visor brim & white chin strap!
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(0.258, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.48),
      capMat
    );
    dome.position.y = 0.02;
    dome.rotation.x = -0.12;
    headGroup.add(dome);

    const visor = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.024, 16, 1, false, -0.9, 1.8), capMat);
    visor.position.set(0, 0.11, 0.12);
    visor.rotation.x = 0.22;
    headGroup.add(visor);
  } else {
    // Traditional Undokai Hachimaki Headband (鉢巻) with back knot & fluttering tails!
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.246, 0.035, 10, 24), capMat);
    band.rotation.x = Math.PI / 2 - 0.12;
    band.position.y = 0.08;
    headGroup.add(band);

    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.052, 8, 8), capMat);
    knot.position.set(0, 0.1, -0.25);
    headGroup.add(knot);

    const tailL = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.18, 0.016), capMat);
    tailL.position.set(-0.045, 0.02, -0.27);
    tailL.rotation.z = 0.28;
    const tailR = tailL.clone();
    tailR.position.x = 0.045;
    tailR.rotation.z = -0.28;
    headGroup.add(tailL, tailR);
  }

  // 4. Articulated Arms + Puffed Sleeves + Held Bean Bag in Right Hand
  const buildArm = (ax: number) => {
    const armGroup = new THREE.Group();
    armGroup.position.set(ax, 0.74, 0);

    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.074, 0.068, 0.15, 10), shirtMat);
    sleeve.position.y = -0.05;
    armGroup.add(sleeve);

    const sleeveTrim = new THREE.Mesh(new THREE.TorusGeometry(0.068, 0.012, 6, 14), collarTrimMat);
    sleeveTrim.rotation.x = Math.PI / 2;
    sleeveTrim.position.y = -0.12;
    armGroup.add(sleeveTrim);

    const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.048, 0.21, 10), skinMat);
    forearm.position.y = -0.19;
    armGroup.add(forearm);

    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.064, 10, 10), skinMat);
    hand.position.y = -0.31;
    armGroup.add(hand);

    return armGroup;
  };
  const armL = buildArm(-0.25);
  const armR = buildArm(0.25);
  bodyPivot.add(armL, armR);

  // Bean bag held in right hand ready to toss
  const heldBagGeo = new THREE.SphereGeometry(0.115, 10, 8);
  heldBagGeo.scale(1.22, 0.75, 1.0);
  const heldBag = new THREE.Mesh(heldBagGeo, team === 'red' ? redBagMat : whiteBagMat);
  heldBag.position.set(0, -0.35, 0.06);
  armR.add(heldBag);

  // Floating 3D Student Name Callout Sprites (Score Swish vs. Rim Doink!)
  const calloutSprite = createStudentCalloutSprite(nickname, team, false, false);
  const missCalloutSprite = createStudentCalloutSprite(nickname, team, false, true);
  root.add(calloutSprite, missCalloutSprite);

  return {
    id: studentId,
    nickname,
    root,
    bodyPivot,
    headGroup,
    hairTailGroup,
    armL,
    armR,
    legL,
    legR,
    heldBag,
    shadow,
    calloutSprite,
    missCalloutSprite,
    calloutTimer: 0,
    team,
    ringTier,
    baseAngle: angle,
    radius,
    centerX,
    throwTimer: 0,
    pickupPhase: index * 1.15,
    heightScale
  };
}

interface FlyingBeanBag {
  mesh: THREE.Mesh;
  trailMesh: THREE.Mesh;
  active: boolean;
  team: 'red' | 'white';
  isGolden: boolean;
  isNearMiss: boolean; // True if this bag clanks off the rim & bounces onto the sand!
  hasBounced: boolean;
  startPos: THREE.Vector3;
  midPos: THREE.Vector3;
  targetPos: THREE.Vector3;
  bounceVel: THREE.Vector3;
  progress: number;
  duration: number;
  spinAxis: THREE.Vector3;
}

interface BurstParticle {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  isDust: boolean;
}

/**
 * Builds an 8+ part tall Japanese Tamaire Basket Pole (玉入れカゴ) with a spring-hinged pole,
 * woven diamond net, red-white spiral pole wrap, weighted steel legs, and 45 inner stackable bags.
 */
function buildTamaireBasketPole(
  team: 'red' | 'white',
  xPos: number,
  redBagMat: THREE.Material,
  whiteBagMat: THREE.Material
): BasketAssembly {
  const root = new THREE.Group();
  root.position.set(xPos, 0, 0);

  // 1. Heavy Weighted Base Plate & 4 Stabilizer Feet (does not sway)
  const basePlate = new THREE.Mesh(
    new THREE.CylinderGeometry(0.68, 0.78, 0.12, 24),
    injectWiiSatinRimShader(new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.42, metalness: 0.65 }))
  );
  basePlate.position.y = 0.06;
  basePlate.castShadow = true;
  basePlate.receiveShadow = true;
  root.add(basePlate);

  const strutMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.4, metalness: 0.7 });
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2 + Math.PI / 4;
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.08, 0.1), strutMat);
    leg.position.set(Math.cos(angle) * 0.42, 0.08, Math.sin(angle) * 0.42);
    leg.rotation.y = -angle;
    leg.castShadow = true;
    root.add(leg);
  }

  // 2. Sway Pivot Group (hinged at y=0.12 so the entire 4.3m pole bends with spring physics!)
  const swayPivot = new THREE.Group();
  swayPivot.position.y = 0.12;
  root.add(swayPivot);

  const poleHeight = 4.25;
  const stripeCount = 9;
  const segH = poleHeight / stripeCount;
  const redPoleMat = injectWiiSatinRimShader(new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.35 }));
  const whitePoleMat = injectWiiSatinRimShader(new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35 }));
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.25, metalness: 0.82 });

  for (let i = 0; i < stripeCount; i++) {
    const seg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.068, 0.078, segH, 16),
      i % 2 === 0 ? whitePoleMat : redPoleMat
    );
    seg.position.y = segH * i + segH * 0.5;
    seg.castShadow = true;
    swayPivot.add(seg);
  }

  // Brass collar joints
  [1.4, 2.8, poleHeight - 0.1].forEach((cy) => {
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.082, 0.02, 10, 20), brassMat);
    collar.rotation.x = Math.PI / 2;
    collar.position.y = cy;
    swayPivot.add(collar);
  });

  // 3. Top Metal Rim Hoop (玉入れリング)
  const rimY = poleHeight + 0.12;
  const hoopMat = injectWiiSatinRimShader(
    new THREE.MeshStandardMaterial({
      color: team === 'red' ? 0xf43f5e : 0xf8fafc,
      roughness: 0.25,
      metalness: 0.45
    })
  );
  const hoopMesh = new THREE.Mesh(new THREE.TorusGeometry(0.74, 0.052, 16, 36), hoopMat);
  hoopMesh.rotation.x = Math.PI / 2;
  hoopMesh.position.y = rimY;
  hoopMesh.castShadow = true;
  swayPivot.add(hoopMesh);

  // 4. Support Spokes under the Basket Rim
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2;
    const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.85, 8), brassMat);
    spoke.position.set(Math.cos(angle) * 0.36, rimY - 0.38, Math.sin(angle) * 0.36);
    spoke.rotation.z = Math.cos(angle) * -0.78;
    spoke.rotation.x = Math.sin(angle) * 0.78;
    swayPivot.add(spoke);
  }

  // 5. Woven Mesh Net Cone (網カゴ) + Translucent Liner + 4 Fullness Gauge Rings
  const netHeight = 0.98;
  const netTopRadius = 0.72;
  const netBottomRadius = 0.34;
  const netCenterY = rimY - netHeight * 0.5;

  const netGeo = new THREE.CylinderGeometry(netTopRadius, netBottomRadius, netHeight, 22, 8, true);
  const netMat = new THREE.MeshStandardMaterial({
    color: team === 'red' ? 0xffedd5 : 0xe2e8f0,
    roughness: 0.7,
    wireframe: true,
    side: THREE.DoubleSide
  });
  const netMesh = new THREE.Mesh(netGeo, netMat);
  netMesh.position.y = netCenterY;
  swayPivot.add(netMesh);

  // Subtle translucent inner liner so stacked bags read clearly from across the classroom
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

  // 4 Horizontal Fullness Gauge Rings woven around the net (25%, 50%, 75%, 90%)
  // Lights up progressively as the basket fills so students see exact progress even in Mystery Mode!
  const levelRings: THREE.Mesh[] = [];
  const ringThresholds = [0.22, 0.46, 0.7, 0.88];
  ringThresholds.forEach((t) => {
    const rAtHeight = netBottomRadius + (netTopRadius - netBottomRadius) * t;
    const yAtHeight = rimY - netHeight + t * netHeight;
    const lRing = new THREE.Mesh(
      new THREE.TorusGeometry(rAtHeight + 0.012, 0.014, 8, 28),
      new THREE.MeshBasicMaterial({
        color: team === 'red' ? 0xfda4af : 0x93c5fd,
        transparent: true,
        opacity: 0.22
      })
    );
    lRing.rotation.x = Math.PI / 2;
    lRing.position.y = yAtHeight;
    swayPivot.add(lRing);
    levelRings.push(lRing);
  });

  // Glowing Rim Shockwave Ring (flashes & expands whenever a bean bag lands in the basket!)
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
  swayPivot.add(rimPulseRing);

  // Net Bottom Gather Ring & Tassel
  const bottomDisc = new THREE.Mesh(
    new THREE.CylinderGeometry(netBottomRadius, 0.26, 0.08, 16),
    new THREE.MeshStandardMaterial({ color: team === 'red' ? 0xe11d48 : 0x475569, roughness: 0.6 })
  );
  bottomDisc.position.y = rimY - netHeight;
  swayPivot.add(bottomDisc);

  // 6. Adaptive Non-Overflowing Inner Bean Bag Volume (Compacted Mound Core + 64 Surface Bean Bags)
  const innerBagsGroup = new THREE.Group();
  // Anchored at the bottom of the net cone (rimY - netHeight + 0.04)
  const netFloorY = rimY - netHeight + 0.05;
  innerBagsGroup.position.y = netFloorY;
  swayPivot.add(innerBagsGroup);

  const bagMat = team === 'red' ? redBagMat : whiteBagMat;

  // 6a. Sculpted Inner Mound Core (fills the frustum interior smoothly as fillRatio rises 0 -> 0.92)
  const moundGeo = new THREE.CylinderGeometry(0.58, netBottomRadius * 0.85, 0.78, 18, 4);
  // Dome the top vertices of the mound so it looks like a natural heap of bean bags
  const mPos = moundGeo.attributes.position;
  for (let i = 0; i < mPos.count; i++) {
    const vy = mPos.getY(i);
    const vx = mPos.getX(i);
    const vz = mPos.getZ(i);
    if (vy > 0.3) {
      const distFromCenter = Math.hypot(vx, vz);
      const domeOffset = Math.max(0, 0.58 - distFromCenter) * 0.22;
      mPos.setY(i, vy + domeOffset);
    }
  }
  moundGeo.computeVertexNormals();
  // Shift geometry so its bottom sits at y = 0 inside innerBagsGroup
  moundGeo.translate(0, 0.39, 0);

  const moundMesh = new THREE.Mesh(moundGeo, bagMat);
  moundMesh.visible = false;
  moundMesh.scale.set(0.6, 0.01, 0.6);
  innerBagsGroup.add(moundMesh);

  // 6b. 64 Individual Stitched Bean Bags arranged in 8 frustum-fitted tiers inside the net
  // Strictly bounded below rimY (max height = 0.84m inside the 0.98m net) so it NEVER overflows!
  const innerBagMeshes: THREE.Mesh[] = [];
  const bagGeo = new THREE.SphereGeometry(0.132, 12, 10);
  bagGeo.scale(1.24, 0.76, 1.06);

  const totalSlots = 64;
  const bagsPerLayer = 8;
  for (let i = 0; i < totalSlots; i++) {
    const layer = Math.floor(i / bagsPerLayer); // 0..7
    const idxInLayer = i % bagsPerLayer;
    const layerNorm = layer / 7; // 0.0 at bottom -> 1.0 at 88% of net height (never crosses rim!)
    const maxRadiusAtLayer = netBottomRadius * 0.72 + (netTopRadius * 0.78 - netBottomRadius * 0.72) * layerNorm;

    const ringRadius = idxInLayer === 0 ? 0 : maxRadiusAtLayer * (idxInLayer % 2 === 0 ? 0.92 : 0.62);
    const angle = (idxInLayer / (bagsPerLayer - 1)) * Math.PI * 2 + layer * 0.78;
    const yPos = 0.06 + layerNorm * 0.74 + (idxInLayer === 0 ? 0.04 : 0);

    const bMesh = new THREE.Mesh(bagGeo, bagMat);
    bMesh.position.set(Math.cos(angle) * ringRadius, yPos, Math.sin(angle) * ringRadius);
    bMesh.rotation.set(Math.sin(i * 1.7) * 0.45, i * 1.1, Math.cos(i * 1.3) * 0.4);
    bMesh.visible = false;
    innerBagsGroup.add(bMesh);
    innerBagMeshes.push(bMesh);
  }

  return {
    root,
    swayPivot,
    rimCenterWorld: new THREE.Vector3(xPos, rimY + 0.12, 0),
    innerBagsGroup,
    innerBagMeshes,
    moundMesh,
    rimPulseRing,
    levelRings,
    netMesh,
    linerMesh,
    hoopMesh,
    springAngleX: 0,
    springAngleZ: 0,
    springVelX: 0,
    springVelZ: 0,
    hitSquash: 0,
    displayFillRatio: 0
  };
}

/**
 * Builds the 3-Story Japanese Elementary School Building (校舎) with clock tower,
 * entrance portico (昇降口), rooftop fence, and celebratory Undokai vertical banners.
 */
function buildJapaneseSchoolBuilding(schoolName: string): THREE.Group {
  const group = new THREE.Group();
  group.position.set(0, 0, -22);

  const facadeTex = createSchoolFacadeTexture();
  const wallMat = new THREE.MeshStandardMaterial({
    map: facadeTex || undefined,
    color: 0xffffff,
    roughness: 0.75
  });
  const concreteMat = new THREE.MeshStandardMaterial({ color: 0xe5dec9, roughness: 0.8 });
  const roofTrimMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.3 });

  // Main 3-story classroom block
  const mainBlock = new THREE.Mesh(new THREE.BoxGeometry(30, 8.8, 5.5), wallMat);
  mainBlock.position.y = 4.4;
  mainBlock.receiveShadow = true;
  mainBlock.castShadow = true;
  group.add(mainBlock);

  // Rooftop overhang & safety parapet
  const roofSlab = new THREE.Mesh(new THREE.BoxGeometry(30.8, 0.45, 6.2), concreteMat);
  roofSlab.position.y = 9.0;
  group.add(roofSlab);

  // Rooftop wire safety fence (屋上フェンス)
  const fenceGeo = new THREE.BoxGeometry(30.2, 1.1, 0.08);
  const fenceMat = new THREE.MeshBasicMaterial({ color: 0x64748b, wireframe: true });
  const roofFence = new THREE.Mesh(fenceGeo, fenceMat);
  roofFence.position.set(0, 9.75, 2.75);
  group.add(roofFence);

  // Central Clock Tower Penthouse (時計台)
  const tower = new THREE.Mesh(new THREE.BoxGeometry(4.6, 3.2, 4.2), concreteMat);
  tower.position.set(0, 10.2, 0.4);
  group.add(tower);

  const towerRoof = new THREE.Mesh(new THREE.ConeGeometry(3.6, 1.4, 4), roofTrimMat);
  towerRoof.rotation.y = Math.PI / 4;
  towerRoof.position.set(0, 12.5, 0.4);
  group.add(towerRoof);

  // School Clock Face (学校の時計)
  const clockRim = new THREE.Mesh(
    new THREE.CylinderGeometry(1.05, 1.05, 0.18, 24),
    new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.7, roughness: 0.25 })
  );
  clockRim.rotation.x = Math.PI / 2;
  clockRim.position.set(0, 10.35, 2.52);
  group.add(clockRim);

  const clockFace = new THREE.Mesh(
    new THREE.CylinderGeometry(0.92, 0.92, 0.2, 24),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  clockFace.rotation.x = Math.PI / 2;
  clockFace.position.set(0, 10.35, 2.54);
  group.add(clockFace);

  // Clock hands (10:10 sunny morning Undokai!)
  const handMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
  const hourHand = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.52, 0.05), handMat);
  hourHand.position.set(-0.16, 10.5, 2.66);
  hourHand.rotation.z = 0.65;
  const minHand = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.74, 0.05), handMat);
  minHand.position.set(0.22, 10.55, 2.66);
  minHand.rotation.z = -0.65;
  group.add(hourHand, minHand);

  // Ground Floor Entrance Portico (昇降口)
  const portico = new THREE.Mesh(new THREE.BoxGeometry(5.6, 2.8, 2.4), concreteMat);
  portico.position.set(0, 1.4, 3.6);
  group.add(portico);

  // Vertical Celebratory Banners (懸垂幕: "祝 大運動会" & "全力投球 赤白")
  const leftBannerTex = createVerticalSchoolBannerTexture('祝大運動会', '#e11d48', '#ffffff');
  if (leftBannerTex) {
    const leftBanner = new THREE.Mesh(
      new THREE.PlaneGeometry(1.35, 6.2),
      new THREE.MeshBasicMaterial({ map: leftBannerTex })
    );
    leftBanner.position.set(-3.2, 5.2, 2.82);
    group.add(leftBanner);
  }

  const rightBannerTex = createVerticalSchoolBannerTexture('一致団結！', '#1e3a8a', '#fef08a');
  if (rightBannerTex) {
    const rightBanner = new THREE.Mesh(
      new THREE.PlaneGeometry(1.35, 6.2),
      new THREE.MeshBasicMaterial({ map: rightBannerTex })
    );
    rightBanner.position.set(3.2, 5.2, 2.82);
    group.add(rightBanner);
  }

  return group;
}

/**
 * Builds a pitched Japanese Undokai White Campaign Tent (運動会テント / 本部テント)
 * with steel legs, Kohaku-maku red/white striped curtains, tables, and cheering student spectators.
 */
function buildUndokaiTent(
  xPos: number,
  zPos: number,
  rotY: number,
  teamTheme: 'red' | 'white' | 'honbu',
  kohakuTex: THREE.Texture | null
): { group: THREE.Group; spectators: THREE.Group[] } {
  const group = new THREE.Group();
  group.position.set(xPos, 0, zPos);
  group.rotation.y = rotY;

  const canvasMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.65,
    side: THREE.DoubleSide
  });
  const legMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.6, roughness: 0.35 });

  // Peaked 4-sided canvas roof
  const roof = new THREE.Mesh(new THREE.ConeGeometry(3.4, 1.35, 4), canvasMat);
  roof.rotation.y = Math.PI / 4;
  roof.scale.set(1.35, 1, 0.85);
  roof.position.y = 3.25;
  roof.castShadow = true;
  group.add(roof);

  // Colored roof valance trim
  const trimColor = teamTheme === 'red' ? 0xe11d48 : teamTheme === 'white' ? 0x3b82f6 : 0xf59e0b;
  const valance = new THREE.Mesh(
    new THREE.BoxGeometry(6.4, 0.24, 4.1),
    new THREE.MeshStandardMaterial({ color: trimColor, roughness: 0.5 })
  );
  valance.position.y = 2.52;
  group.add(valance);

  // 4 Steel Pipe Corner Legs
  [
    [-2.9, -1.85],
    [2.9, -1.85],
    [-2.9, 1.85],
    [2.9, 1.85]
  ].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.5, 8), legMat);
    leg.position.set(lx, 1.25, lz);
    group.add(leg);
  });

  // Back Kohaku-maku (紅白幕) curtain
  if (kohakuTex) {
    const curtain = new THREE.Mesh(
      new THREE.PlaneGeometry(5.8, 1.6),
      new THREE.MeshStandardMaterial({ map: kohakuTex, side: THREE.DoubleSide, roughness: 0.7 })
    );
    curtain.position.set(0, 1.1, -1.82);
    group.add(curtain);
  }

  // If Honbu tent, add judge's table with Kohaku-maku & Gold Winners Cup!
  if (teamTheme === 'honbu') {
    const table = new THREE.Mesh(
      new THREE.BoxGeometry(3.4, 0.78, 1.1),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 })
    );
    table.position.set(0, 0.39, 0.4);
    group.add(table);

    if (kohakuTex) {
      const frontSkirt = new THREE.Mesh(
        new THREE.PlaneGeometry(3.42, 0.76),
        new THREE.MeshStandardMaterial({ map: kohakuTex })
      );
      frontSkirt.position.set(0, 0.39, 0.96);
      group.add(frontSkirt);
    }

    // Gold Trophy Cup (優勝カップ)
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.85, roughness: 0.2 });
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.1, 0.48, 12), goldMat);
    cup.position.set(0, 1.02, 0.4);
    group.add(cup);
  }

  // Cheering Spectator Children waving Red/White Pom-Poms under the tent!
  const spectators: THREE.Group[] = [];
  const count = teamTheme === 'honbu' ? 3 : 6;
  for (let i = 0; i < count; i++) {
    const spec = new THREE.Group();
    const sx = -2.1 + (i / Math.max(1, count - 1)) * 4.2;
    const sz = teamTheme === 'honbu' ? -0.45 : 0.2 + (i % 2) * 0.55;
    spec.position.set(sx, 0, sz);

    const torso = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.18, 0.52, 8),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 })
    );
    torso.position.y = 0.42;
    spec.add(torso);

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.17, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0xffdfc4, roughness: 0.5 })
    );
    head.position.y = 0.82;
    spec.add(head);

    const capColor =
      teamTheme === 'red' ? 0xe11d48 : teamTheme === 'white' ? 0xf8fafc : i % 2 === 0 ? 0xe11d48 : 0x3b82f6;
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55),
      new THREE.MeshStandardMaterial({ color: capColor, roughness: 0.5 })
    );
    cap.position.y = 0.84;
    spec.add(cap);

    // Pom-poms held high!
    const pomMat = new THREE.MeshStandardMaterial({
      color: teamTheme === 'red' ? 0xf43f5e : teamTheme === 'white' ? 0xfef08a : 0xf59e0b,
      roughness: 0.4
    });
    const pomL = new THREE.Mesh(new THREE.DodecahedronGeometry(0.11, 0), pomMat);
    pomL.position.set(-0.24, 0.95, 0.1);
    const pomR = pomL.clone();
    pomR.position.x = 0.24;
    spec.add(pomL, pomR);

    group.add(spec);
    spectators.push(spec);
  }

  return { group, spectators };
}

/**
 * Builds stylized Japanese Cherry Blossom (桜) & Zelkova (ケヤキ) perimeter trees.
 */
function buildSchoolyardTree(x: number, z: number, scale: number, isSakura: boolean): THREE.Group {
  const tree = new THREE.Group();
  tree.position.set(x, 0, z);
  tree.scale.setScalar(scale);

  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.88 });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.36, 2.2, 10), trunkMat);
  trunk.position.y = 1.1;
  trunk.castShadow = true;
  tree.add(trunk);

  const leafColors = isSakura ? [0xfbcfe8, 0xf9a8d4, 0xfce7f3] : [0x22c55e, 0x16a34a, 0x4ade80];

  const puffs = [
    [0, 2.8, 0, 1.35],
    [-0.85, 2.35, 0.4, 1.05],
    [0.85, 2.4, -0.3, 1.1],
    [0.2, 2.5, 0.8, 0.98],
    [-0.3, 2.55, -0.75, 1.0]
  ];
  puffs.forEach(([px, py, pz, pr], idx) => {
    const mat = injectWiiSatinRimShader(
      new THREE.MeshStandardMaterial({
        color: leafColors[idx % leafColors.length],
        roughness: 0.72
      }),
      0.22,
      0.15
    );
    const puff = new THREE.Mesh(new THREE.DodecahedronGeometry(pr, 1), mat);
    puff.position.set(px, py, pz);
    puff.castShadow = true;
    puff.receiveShadow = true;
    tree.add(puff);
  });

  return tree;
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

  const ceremonyFrameRef = useRef<TamaireSuspenseFrame | null>(null);
  const countBeatPulseRef = useRef<number>(0);
  const ceremonySfxEnabledRef = useRef<boolean>(!isStudentChase);
  ceremonySfxEnabledRef.current = ceremonySfxEnabled && !isStudentChase;
  const directorCamPresetRef = useRef<'WIDE' | 'ORBIT' | 'BASKETS'>('WIDE');
  directorCamPresetRef.current = directorCamPreset;

  const stateRef = useRef({
    redScore,
    whiteScore,
    matchEnded,
    winner,
    redThrowRate,
    whiteThrowRate,
    redPlayersCount,
    whitePlayersCount,
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
  }, [
    redScore,
    whiteScore,
    matchEnded,
    winner,
    redThrowRate,
    whiteThrowRate,
    redPlayersCount,
    whitePlayersCount,
    answerEvents,
    schoolName,
    hideScoreUntilEnd,
    cameraMode,
    focusPlayer
  ]);

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

  // Three.js Scene Initialization & Render Loop
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let width = container.clientWidth || 960;
    let height = container.clientHeight || 540;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x38bdf8);
    scene.fog = new THREE.FogExp2(0xbae6fd, 0.0045);

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 260);
    camera.position.set(0, 4.4, 12.2);
    camera.lookAt(0, 2.25, -0.5);

    const isStudentView = cameraMode === 'STUDENT_CHASE';
    const renderer = new THREE.WebGLRenderer({
      antialias: !isStudentView,
      alpha: false,
      powerPreference: isStudentView ? 'low-power' : 'high-performance'
    });
    const gpu = detectClassroomGpuProfile(renderer.getContext(), isStudentView);
    renderer.setPixelRatio(gpu.targetPixelRatio);
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = gpu.enableDynamicShadows;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.92;
    container.appendChild(renderer.domElement);

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
    sunLight.castShadow = gpu.enableDynamicShadows;
    if (gpu.enableDynamicShadows) {
      sunLight.shadow.mapSize.set(gpu.shadowMapRes, gpu.shadowMapRes);
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
    // B. Realistic Multi-Layered Playfield: Masado Sand, Track & Grass Berm
    // ------------------------------------------------------------------------
    const sandMaps = createSchoolyardSandMaps();
    const shadowTex = createDoubleRingShadowTexture();
    const kohakuTex = createKohakuMakuTexture();

    // 1. Sculpted Masado Sand Field (真砂土グラウンド) with micro-undulations & bump relief
    const sandGeo = new THREE.PlaneGeometry(24, 16, 56, 40);
    sandGeo.rotateX(-Math.PI / 2);
    const posAttr = sandGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vz = posAttr.getZ(i);
      // Natural schoolyard crown & foot-traffic trenches around the two poles
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

    const sandMat = new THREE.MeshStandardMaterial({
      map: sandMaps?.diffuseMap,
      bumpMap: sandMaps?.bumpMap,
      bumpScale: 0.085,
      color: 0xffffff,
      roughness: 0.95,
      metalness: 0.01
    });
    const sandMesh = new THREE.Mesh(sandGeo, sandMat);
    sandMesh.receiveShadow = true;
    scene.add(sandMesh);

    // Scatter 3D micro-pebbles & dirt clods on the sand for authentic ground relief
    const pebbleGeo = new THREE.DodecahedronGeometry(0.038, 0);
    const pebbleDarkMat = new THREE.MeshStandardMaterial({ color: 0x785532, roughness: 0.95 });
    const pebbleLightMat = new THREE.MeshStandardMaterial({ color: 0xd6b588, roughness: 0.9 });
    for (let i = 0; i < 64; i++) {
      const px = (((i * 73) % 100) / 100 - 0.5) * 16;
      const pz = (((i * 41) % 100) / 100 - 0.5) * 9;
      const peb = new THREE.Mesh(pebbleGeo, i % 2 === 0 ? pebbleDarkMat : pebbleLightMat);
      peb.position.set(px, 0.015, pz);
      peb.scale.set(1.2, 0.45, 0.9);
      peb.rotation.y = i * 1.1;
      scene.add(peb);
    }

    // 2. Surrounding Terracotta 4-Lane Running Track (陸上トラック) behind & around the sand
    const trackGroup = new THREE.Group();
    scene.add(trackGroup);

    const trackMat = new THREE.MeshStandardMaterial({
      color: 0xc2593f, // Authentic terracotta urethane/cinder track
      roughness: 0.82,
      bumpMap: sandMaps?.bumpMap,
      bumpScale: 0.02
    });
    const backTrack = new THREE.Mesh(new THREE.PlaneGeometry(56, 6.5), trackMat);
    backTrack.rotation.x = -Math.PI / 2;
    backTrack.position.set(0, 0.01, -9.2);
    backTrack.receiveShadow = true;
    trackGroup.add(backTrack);

    // Crisp White Running Track Lane Markings (4 lanes)
    const laneLineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.82 });
    for (let lane = 0; lane <= 4; lane++) {
      const lz = -6.3 - lane * 1.35;
      const line = new THREE.Mesh(new THREE.PlaneGeometry(56, 0.07), laneLineMat);
      line.rotation.x = -Math.PI / 2;
      line.position.set(0, 0.018, lz);
      trackGroup.add(line);
    }

    // Stepped Concrete Field Curb (校庭の縁石) separating sand & track from outer grass
    const curbMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.75 });
    const backCurb = new THREE.Mesh(new THREE.BoxGeometry(56, 0.16, 0.28), curbMat);
    backCurb.position.set(0, 0.08, -12.4);
    backCurb.receiveShadow = true;
    scene.add(backCurb);

    // 3. Outer Lush Grass Berm (芝生エリア)
    const grassTex = createLushGrassTexture();
    const grassMat = new THREE.MeshStandardMaterial({
      map: grassTex || undefined,
      color: 0xffffff,
      roughness: 0.88
    });
    const outerGrass = new THREE.Mesh(new THREE.PlaneGeometry(140, 120), grassMat);
    outerGrass.rotation.x = -Math.PI / 2;
    outerGrass.position.set(0, -0.02, -18);
    outerGrass.receiveShadow = true;
    scene.add(outerGrass);

    // 4. Lime-Chalk (石灰ライン) Throwing Circles & Center Division Line
    const chalkMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.88
    });

    const centerChalk = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 14), chalkMat);
    centerChalk.rotation.x = -Math.PI / 2;
    centerChalk.position.set(0, 0.025, 0);
    scene.add(centerChalk);

    const createThrowingCircleMarkings = (cx: number, teamColorHex: number) => {
      // Outer throwing line ring
      const outerRing = new THREE.Mesh(new THREE.RingGeometry(2.15, 2.28, 48), chalkMat);
      outerRing.rotation.x = -Math.PI / 2;
      outerRing.position.set(cx, 0.028, 0);
      scene.add(outerRing);

      // Inner pole safety circle
      const innerRing = new THREE.Mesh(new THREE.RingGeometry(0.95, 1.04, 36), chalkMat);
      innerRing.rotation.x = -Math.PI / 2;
      innerRing.position.set(cx, 0.028, 0);
      scene.add(innerRing);

      // Subtle team-tinted compacted clay zone inside the circle
      const zoneDisc = new THREE.Mesh(
        new THREE.CircleGeometry(2.15, 40),
        new THREE.MeshBasicMaterial({
          color: teamColorHex,
          transparent: true,
          opacity: 0.08,
          depthWrite: false
        })
      );
      zoneDisc.rotation.x = -Math.PI / 2;
      zoneDisc.position.set(cx, 0.022, 0);
      scene.add(zoneDisc);
    };
    createThrowingCircleMarkings(-3.1, 0xe11d48);
    createThrowingCircleMarkings(3.1, 0x3b82f6);

    // ------------------------------------------------------------------------
    // C. Authentic Japanese Schoolyard Surroundings (校舎・本部テント・桜並木・万国旗)
    // ------------------------------------------------------------------------
    const schoolBuilding = buildJapaneseSchoolBuilding(stateRef.current.schoolName);
    scene.add(schoolBuilding);

    const wallGroup = new THREE.Group();
    wallGroup.position.set(0, 0, -6.2);
    scene.add(wallGroup);

    const bannerTex = createUndokaiBannerTexture(stateRef.current.schoolName);
    if (bannerTex) {
      const boardFrame = new THREE.Mesh(
        new THREE.BoxGeometry(5.6, 1.55, 0.18),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 })
      );
      boardFrame.position.set(0, 1.55, 0);
      boardFrame.castShadow = true;
      wallGroup.add(boardFrame);

      const bannerMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(5.4, 1.35),
        new THREE.MeshBasicMaterial({ map: bannerTex })
      );
      bannerMesh.position.set(0, 1.55, 0.1);
      wallGroup.add(bannerMesh);

      [-2.4, 2.4].forEach((lx) => {
        const post = new THREE.Mesh(
          new THREE.CylinderGeometry(0.06, 0.06, 2.4, 10),
          new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 })
        );
        post.position.set(lx, 1.2, -0.05);
        post.castShadow = true;
        wallGroup.add(post);
      });
    }

    // PA Megaphone Speaker Poles (校庭の放送スピーカー)
    [-6.8, 6.8].forEach((px) => {
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.07, 5.2, 10),
        new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.6, roughness: 0.35 })
      );
      pole.position.set(px, 2.6, -7.2);
      pole.castShadow = true;
      scene.add(pole);

      [-1, 1].forEach((dir) => {
        const horn = new THREE.Mesh(
          new THREE.ConeGeometry(0.24, 0.42, 12, 1, true),
          new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3, side: THREE.DoubleSide })
        );
        horn.rotation.z = dir * (Math.PI / 2 - 0.25);
        horn.position.set(px + dir * 0.22, 5.0, -7.2);
        scene.add(horn);
      });
    });

    // 3. Pitched White Campaign Tents (本部テント & 赤組/白組 応援テント) + Animated Spectators
    const allSpectators: THREE.Group[] = [];
    const leftRedTent = buildUndokaiTent(-8.8, -4.2, 0.32, 'red', kohakuTex);
    const rightWhiteTent = buildUndokaiTent(8.8, -4.2, -0.32, 'white', kohakuTex);
    const centerHonbuTent = buildUndokaiTent(0, -10.2, 0, 'honbu', kohakuTex);
    scene.add(leftRedTent.group, rightWhiteTent.group, centerHonbuTent.group);
    allSpectators.push(...leftRedTent.spectators, ...rightWhiteTent.spectators, ...centerHonbuTent.spectators);

    // 4. Perimeter Sakura (Cherry Blossom) & Zelkova Trees + Distant Mountain Ridges
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
    treePlacements.forEach(([tx, tz, ts, isSakura]) => {
      scene.add(buildSchoolyardTree(tx, tz, ts, isSakura));
    });

    const mountainMat = new THREE.MeshStandardMaterial({ color: 0x3b7a57, roughness: 0.95 });
    for (let i = 0; i < 9; i++) {
      const mx = -48 + i * 12;
      const mh = 12 + (i % 3) * 5;
      const mtn = new THREE.Mesh(new THREE.ConeGeometry(14, mh, 7), mountainMat);
      mtn.position.set(mx, mh * 0.45 - 1, -48 - (i % 2) * 6);
      mtn.scale.set(1.6, 1, 0.7);
      scene.add(mtn);
    }

    const cloudsGroup = new THREE.Group();
    scene.add(cloudsGroup);
    const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
    for (let i = 0; i < 12; i++) {
      const cluster = new THREE.Group();
      const angle = (i / 12) * Math.PI * 1.4 - Math.PI * 0.7;
      cluster.position.set(Math.sin(angle) * 42, 13 + (i % 3) * 2.5, -Math.cos(angle) * 34 - 8);
      for (let j = 0; j < 3; j++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(2.4 - j * 0.4, 12, 10), cloudMat);
        puff.position.set((j - 1) * 1.9, (j % 2) * 0.5, 0);
        puff.scale.set(1.4, 0.85, 0.9);
        cluster.add(puff);
      }
      cloudsGroup.add(cluster);
    }

    // 5. Overhead Bankokuki (万国旗 — Festive Undokai Bunting Flag Strings)
    const buntingGroup = new THREE.Group();
    scene.add(buntingGroup);
    const flagPalette = [0xe11d48, 0xf8fafc, 0xf59e0b, 0x3b82f6, 0x10b981, 0xa855f7];
    const buildBuntingLine = (zStart: number, zEnd: number, yPeak: number) => {
      const count = 26;
      for (let i = 0; i < count; i++) {
        const t = i / (count - 1);
        const x = -11.5 + t * 23;
        const z = zStart + t * (zEnd - zStart);
        const sag = Math.sin(t * Math.PI) * 0.72;
        const y = yPeak - sag;

        const flagGeo = new THREE.ConeGeometry(0.19, 0.38, 3);
        flagGeo.rotateX(Math.PI);
        const flagMesh = new THREE.Mesh(
          flagGeo,
          new THREE.MeshStandardMaterial({
            color: flagPalette[i % flagPalette.length],
            roughness: 0.5,
            side: THREE.DoubleSide
          })
        );
        flagMesh.position.set(x, y, z);
        buntingGroup.add(flagMesh);
      }
    };
    buildBuntingLine(-4.5, -4.5, 5.25);
    buildBuntingLine(-2.2, 1.2, 5.45);
    buildBuntingLine(1.2, -2.2, 5.45);

    // ------------------------------------------------------------------------
    // D. Textured Bean Bag Materials, Basket Poles & Scattered Ground Bags
    // ------------------------------------------------------------------------
    const redBagTex = createStitchedBeanBagTexture('#e11d48', '#fecdd3', false);
    const whiteBagTex = createStitchedBeanBagTexture('#f8fafc', '#94a3b8', false);
    const goldBagTex = createStitchedBeanBagTexture('#f59e0b', '#fef08a', true);

    const redBagMat = injectWiiSatinRimShader(
      new THREE.MeshStandardMaterial({ map: redBagTex || undefined, color: 0xffffff, roughness: 0.65 })
    );
    const whiteBagMat = injectWiiSatinRimShader(
      new THREE.MeshStandardMaterial({ map: whiteBagTex || undefined, color: 0xffffff, roughness: 0.55 })
    );
    const goldBagMat = new THREE.MeshStandardMaterial({
      map: goldBagTex || undefined,
      color: 0xfbbf24,
      emissive: 0xd97706,
      emissiveIntensity: 0.35,
      roughness: 0.25,
      metalness: 0.75
    });

    const redBasket = buildTamaireBasketPole('red', -3.1, redBagMat, whiteBagMat);
    const whiteBasket = buildTamaireBasketPole('white', 3.1, redBagMat, whiteBagMat);
    scene.add(redBasket.root, whiteBasket.root);

    // Litter the sand around both poles with 36 realistic fallen bean bags (落ちたお手玉)!
    const groundBagGeo = new THREE.SphereGeometry(0.115, 10, 8);
    groundBagGeo.scale(1.25, 0.68, 1.05);
    const groundBags: THREE.Mesh[] = [];
    for (let i = 0; i < 36; i++) {
      const isRed = i < 18;
      const cx = isRed ? -3.1 : 3.1;
      const angle = (i * 1.93) % (Math.PI * 2);
      const dist = 0.75 + ((i * 0.41) % 1.65);
      const gb = new THREE.Mesh(groundBagGeo, isRed ? redBagMat : whiteBagMat);
      gb.position.set(cx + Math.cos(angle) * dist, 0.055, Math.sin(angle) * dist);
      gb.rotation.set(0.15, angle, 0.1);
      gb.castShadow = true;
      scene.add(gb);
      groundBags.push(gb);
    }

    // ------------------------------------------------------------------------
    // E. Dynamic 1-to-40 Student Thrower Roster (Concentric Inner & Outer Rings!)
    // ------------------------------------------------------------------------
    const throwersGroup = new THREE.Group();
    scene.add(throwersGroup);
    let throwers: ThrowerAvatar[] = [];

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

    const sharedMaterials = new Set<THREE.Material>([redBagMat, whiteBagMat, goldBagMat]);
    const sharedTextures = new Set<THREE.Texture | null>([
      shadowTex,
      redBagTex,
      whiteBagTex,
      goldBagTex,
    ]);

    const disposeAvatarTree = (obj: THREE.Object3D) => {
      const faceTexSet = new Set<THREE.Texture>(Object.values(cachedFaceTextures));
      obj.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (mesh.geometry) {
          mesh.geometry.dispose();
        }
        if (mesh.material) {
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          mats.forEach((m: any) => {
            if (!m || sharedMaterials.has(m)) return;
            if (m.map && !sharedTextures.has(m.map) && !faceTexSet.has(m.map)) {
              m.map.dispose();
            }
            m.dispose();
          });
        }
      });
    };

    const rebuildThrowerAvatars = () => {
      // Clear previous avatars and release their GPU textures/geometries cleanly
      while (throwersGroup.children.length > 0) {
        const child = throwersGroup.children[0];
        throwersGroup.remove(child);
        disposeAvatarTree(child);
      }
      throwers = [];

      const redList: TamaireStudentRosterItem[] = [];
      const whiteList: TamaireStudentRosterItem[] = [];

      if (studentRoster && studentRoster.length > 0) {
        studentRoster.forEach((s) => {
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

      // Ensure the focused student is placed at index 0 (#01 Zekken bib) on their team!
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
            // Place the student's own 3D avatar at the south-center front of their team's chalk circle (angle = +PI/2, z = +1.85)
            // directly in front of the 3rd-person Chase Camera looking north (-Z) up at the 4.3m basket pole!
            angle = Math.PI * 0.5;
            radius = 1.85;
          } else if (isFocusedTeamInChase) {
            // Spread all other teammates (inner and outer rings) around the left, back, and right flanks (0.82*PI .. 2.18*PI)
            // so nobody ever stands between the Chase Camera and the student's own #01 avatar!
            const peerIdx = isOuter ? idxInTier : idxInTier - 1;
            const peerCount = Math.max(1, isOuter ? countInTier : countInTier - 1);
            const arcSpan = Math.PI * 1.36;
            const startAng = Math.PI * 0.82 + (isOuter ? 0.08 : 0);
            angle = startAng + (peerIdx / Math.max(1, peerCount - 1)) * arcSpan;
          } else {
            const tierAngleOffset = isOuter ? Math.PI / Math.max(4, countInTier) + 0.28 : 0.22;
            angle = (idxInTier / Math.max(1, countInTier)) * Math.PI * 2 + tierAngleOffset;
          }

          const avatar = buildArticulatedThrower(
            team,
            idx === 0 && isFocusedTeamInChase ? 0 : idx + offsetIdx,
            student.id,
            student.nickname,
            centerX,
            radius,
            angle,
            ringTier,
            redBagMat,
            whiteBagMat,
            shadowTex
          );
          throwersGroup.add(avatar.root);
          throwers.push(avatar);
        });
      };

      spawnTeamRing(redList, 'red', -3.1, 0);
      spawnTeamRing(whiteList, 'white', 3.1, 20);
    };

    rebuildRosterRef.current = rebuildThrowerAvatars;
    rebuildThrowerAvatars();

    // ------------------------------------------------------------------------
    // E2. 3D Parabolic Aiming Guide Arc, Target Sand Bean Bag (Step 1 Scoop) & 3D Counted Tally Piles
    // ------------------------------------------------------------------------
    const aimArcGroup = new THREE.Group();
    scene.add(aimArcGroup);
    const aimDotGeo = new THREE.SphereGeometry(0.052, 10, 8);
    const aimDots: THREE.Mesh[] = [];
    for (let i = 0; i < 14; i++) {
      const dotMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.75 - (i / 14) * 0.45
      });
      const dot = new THREE.Mesh(aimDotGeo, dotMat);
      aimArcGroup.add(dot);
      aimDots.push(dot);
    }

    // 3D Target Sand Bean Bag with Pulsing Pickup Ring for Step 1 (① 玉を拾う • SCOOP BAG FROM SAND)
    const targetSandBagGroup = new THREE.Group();
    targetSandBagGroup.visible = false;
    scene.add(targetSandBagGroup);
    const targetSandBagGeo = new THREE.SphereGeometry(0.145, 12, 10);
    targetSandBagGeo.scale(1.26, 0.72, 1.06);
    const targetSandBagMesh = new THREE.Mesh(targetSandBagGeo, redBagMat);
    targetSandBagMesh.position.y = 0.06;
    targetSandBagMesh.castShadow = true;
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

    // Neat 3D Counted Bean Bag Tally Stacks in front of each pole (z = +0.95..+1.55) during the Counting Ceremony!
    const buildCountedTallyPile = (cx: number, mat: THREE.Material) => {
      const group = new THREE.Group();
      scene.add(group);
      const meshes: THREE.Mesh[] = [];
      const tallyBagGeo = new THREE.SphereGeometry(0.125, 10, 8);
      tallyBagGeo.scale(1.24, 0.72, 1.05);
      for (let i = 0; i < 60; i++) {
        const col = i % 5; // rows of 5 bags across
        const row = Math.floor(i / 5) % 3;
        const layer = Math.floor(i / 15);
        const m = new THREE.Mesh(tallyBagGeo, mat);
        m.position.set(
          cx + (col - 2) * 0.28 + (layer % 2) * 0.06,
          0.08 + layer * 0.14,
          1.05 + row * 0.26
        );
        m.rotation.set(0.1, i * 0.7, 0.08);
        m.castShadow = true;
        m.visible = false;
        group.add(m);
        meshes.push(m);
      }
      return meshes;
    };
    const redCountedPileMeshes = buildCountedTallyPile(-3.1, redBagMat);
    const whiteCountedPileMeshes = buildCountedTallyPile(3.1, whiteBagMat);

    // ------------------------------------------------------------------------
    // F. Pooled Parabolic Flying Bean Bags (with Trails & Rim-Bounce Near-Misses!)
    // ------------------------------------------------------------------------
    const flyingBags: FlyingBeanBag[] = [];
    const flyingBagGeo = new THREE.SphereGeometry(0.135, 12, 10);
    flyingBagGeo.scale(1.22, 0.75, 1.02);

    const trailGeo = new THREE.ConeGeometry(0.085, 0.65, 8);
    trailGeo.rotateX(Math.PI / 2);

    for (let i = 0; i < 36; i++) {
      const mesh = new THREE.Mesh(flyingBagGeo, redBagMat);
      mesh.castShadow = true;
      mesh.visible = false;
      scene.add(mesh);

      const trailMesh = new THREE.Mesh(
        trailGeo,
        new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.38,
          depthWrite: false
        })
      );
      trailMesh.visible = false;
      scene.add(trailMesh);

      flyingBags.push({
        mesh,
        trailMesh,
        active: false,
        team: 'red',
        isGolden: false,
        isNearMiss: false,
        hasBounced: false,
        startPos: new THREE.Vector3(),
        midPos: new THREE.Vector3(),
        targetPos: new THREE.Vector3(),
        bounceVel: new THREE.Vector3(),
        progress: 0,
        duration: 0.72,
        spinAxis: new THREE.Vector3(1, 1, 0).normalize()
      });
    }

    // Star Burst + Sand Dust Puff Particles (砂煙 & スターエフェクト)
    const particles: BurstParticle[] = [];
    const starGeo = new THREE.OctahedronGeometry(0.085, 0);
    const dustGeo = new THREE.SphereGeometry(0.11, 8, 8);
    const starGoldMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
    const starRedMat = new THREE.MeshBasicMaterial({ color: 0xfb7185 });
    const starWhiteMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const sandDustMat = new THREE.MeshBasicMaterial({
      color: 0xe7d3b0,
      transparent: true,
      opacity: 0.65
    });

    const spawnParticles = (origin: THREE.Vector3, team: 'red' | 'white', isGolden: boolean, isDust: boolean) => {
      const count = isDust ? 4 : isGolden ? 10 : 6;
      for (let i = 0; i < count; i++) {
        let p = particles.find((item) => item.life <= 0);
        const mat = isDust
          ? sandDustMat
          : isGolden
          ? starGoldMat
          : team === 'red'
          ? starRedMat
          : starWhiteMat;
        if (!p) {
          const mesh = new THREE.Mesh(isDust ? dustGeo : starGeo, mat);
          scene.add(mesh);
          p = { mesh, vel: new THREE.Vector3(), life: 0, maxLife: 0.55, isDust };
          particles.push(p);
        }
        p.isDust = isDust;
        p.mesh.geometry = isDust ? dustGeo : starGeo;
        p.mesh.material = mat;
        p.mesh.position.copy(origin);
        const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
        const speed = isDust ? 0.6 + Math.random() * 0.8 : 1.5 + Math.random() * 1.9;
        p.vel.set(
          Math.cos(angle) * speed,
          isDust ? 0.7 + Math.random() * 0.8 : 1.8 + Math.random() * 2.2,
          Math.sin(angle) * speed
        );
        p.maxLife = isDust ? 0.42 : 0.58;
        p.life = p.maxLife;
        p.mesh.visible = true;
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
          actor.calloutTimer = 1.05;
          actor.calloutSprite.visible = !isFumble;
          actor.missCalloutSprite.visible = isFumble;
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

      // When a specific student throws in STUDENT_CHASE mode (or when isMissThrow is true),
      // spawn the exact requested bag(s) without an extra random decoy from their own hand!
      const totalToSpawn =
        ended || isMissThrow || (isChaseMode && Boolean(playerId)) ? count : count + 1;

      for (let c = 0; c < totalToSpawn; c++) {
        const isNearMiss =
          !ended && (isMissThrow || (c === totalToSpawn - 1 && totalToSpawn > count));
        const slot = flyingBags.find((b) => !b.active);
        if (!slot) break;

        // Match specific student if playerId provided, otherwise pick an active teammate
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
            thrower.calloutTimer = 1.25;
            thrower.calloutSprite.visible = false;
            thrower.missCalloutSprite.visible = true;
          } else if (!isNearMiss && c === 0) {
            thrower.calloutTimer = 1.15;
            thrower.missCalloutSprite.visible = false;
            thrower.calloutSprite.visible = true;
          }
          // Kick up sand dust puff at the thrower's sneakers!
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
        slot.duration = ended ? 0.52 : isMissThrow ? 0.52 : 0.64 + (c * 0.08);

        slot.mesh.material = slot.isGolden ? goldBagMat : team === 'red' ? redBagMat : whiteBagMat;
        const scaleMult = ended ? 1.32 : slot.isGolden ? 1.38 : 1.08;
        slot.mesh.scale.set(1.22 * scaleMult, 0.75 * scaleMult, 1.02 * scaleMult);

        const trailMat = slot.trailMesh.material as THREE.MeshBasicMaterial;
        trailMat.color.setHex(
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
          // Post-Whistle Counting Ceremony: Counted bean bag pops out of the front of the 3D basket
          // (y = 4.35 -> yPeak = 4.92) and lands on the front tally stack on the sand!
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
          // Rim-Doink throw aims directly at the front-left metal hoop lip to clank and ricochet off!
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
          // Clean Swish parabolic arc straight into the 3D basket mouth!
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

        slot.mesh.position.copy(slot.startPos);
        slot.mesh.visible = true;
        slot.trailMesh.position.copy(slot.startPos);
        slot.trailMesh.visible = true;
      }
    };

    enqueueThrowsRef.current = spawnThrow;

    // ------------------------------------------------------------------------
    // G. Main Animation Tick (Spring Physics, Thrower Rigging, Dynamic Camera)
    // ------------------------------------------------------------------------
    let animId = 0;
    let prevTime = performance.now();
    let ambientThrowAccumulator = 0;
    const prevPos = new THREE.Vector3();

    const tick = (now: number) => {
      animId = afterDraw(tick);
      const dt = Math.min(0.05, Math.max(0.001, (now - prevTime) / 1000));
      prevTime = now;
      const elapsed = now * 0.001;

      const {
        redScore: rScore,
        whiteScore: wScore,
        matchEnded: ended,
        winner: win,
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

      // Update 3D Target Sand Bean Bag (Step 0: Scoop) & 3D Dotted Parabolic Aiming Guide Arc (Step 1/2)
      if (camMode === 'STUDENT_CHASE' && !ended) {
        const fCenterX = focusTeam === 'white' ? 3.1 : -3.1;
        const avatarX = focusAvatar ? focusAvatar.root.position.x : fCenterX;
        const avatarZ = focusAvatar ? focusAvatar.root.position.z : 1.85;

        if (actionStep === 0) {
          // Step 0 (① 玉を拾う • SCOOP): Highlight the bean bag on the sand right in front of the student's feet!
          targetSandBagGroup.visible = true;
          targetSandBagGroup.position.set(avatarX + 0.16, 0, avatarZ - 0.36);
          targetSandBagMesh.material = focusTeam === 'red' ? redBagMat : whiteBagMat;
          const ringPulse = 1 + Math.sin(elapsed * 7.5) * 0.14;
          targetSandRingMesh.scale.set(ringPulse, ringPulse, 1);
          targetSandRingMat.opacity = 0.65 + Math.sin(elapsed * 7.5) * 0.25;
          aimArcGroup.visible = false;
        } else {
          // Step 1 (② カゴを狙う • AIM) shows a 6-dot low preview arc; Step 2 (③ 投げる • THROW!) locks all 14 dots into the rim!
          targetSandBagGroup.visible = false;
          aimArcGroup.visible = true;
          const handX = avatarX + 0.22;
          const handY = actionStep === 2 ? 1.18 : 1.02;
          const handZ = avatarZ;
          const rimX = fCenterX;
          const rimY = 4.32;
          const rimZ = 0;
          const midX = (handX + rimX) * 0.5;
          const midY = 5.42;
          const midZ = (handZ + rimZ) * 0.5;
          const visibleDotCount = actionStep === 2 ? aimDots.length : 6;

          for (let i = 0; i < aimDots.length; i++) {
            const dot = aimDots[i];
            dot.visible = i < visibleDotCount;
            if (!dot.visible) continue;
            const t = ((i + (elapsed * 3.2) % 1) / aimDots.length);
            const invT = 1 - t;
            dot.position.set(
              invT * invT * handX + 2 * invT * t * midX + t * t * rimX,
              invT * invT * handY + 2 * invT * t * midY + t * t * rimY,
              invT * invT * handZ + 2 * invT * t * midZ + t * t * rimZ
            );
            const dotMat = dot.material as THREE.MeshBasicMaterial;
            dotMat.color.setHex(goldenNext ? 0xfbbf24 : focusTeam === 'red' ? 0xfda4af : 0xbae6fd);
            dotMat.opacity =
              Math.sin(t * Math.PI) * (actionStep === 2 ? (goldenNext ? 0.94 : 0.72) : 0.38);
            const s = (goldenNext ? 1.28 : actionStep === 2 ? 0.96 : 0.72) * (0.7 + Math.sin(t * Math.PI) * 0.45);
            dot.scale.setScalar(s);
          }
        }
      } else {
        targetSandBagGroup.visible = false;
        aimArcGroup.visible = false;
      }

      // Update 3D Counted Bean Bag Tally Piles in front of each pole during the Counting Ceremony
      const showRedCounted = ended && cFrame ? Math.min(60, cFrame.countedRed) : 0;
      const showWhiteCounted = ended && cFrame ? Math.min(60, cFrame.countedWhite) : 0;
      for (let i = 0; i < 60; i++) {
        redCountedPileMeshes[i].visible = ended && i < showRedCounted;
        whiteCountedPileMeshes[i].visible = ended && i < showWhiteCounted;
      }

      // 1. Dynamic Camera Choreography:
      //    - STUDENT_CHASE (iPad 3rd-Person Over-the-Shoulder or 1st-Person POV — kept BOTH during active play AND during the Bean Bag Tallying ceremony!)
      //    - DIRECTOR (Main Screen TV Broadcast Camera)
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
          // Active 3-Step Gameplay on Student iPad:
          // Smoothly adjusts look height across Step 0 (Scoop from sand) -> Step 1 (Aim up) -> Step 2 (Shot ready!)
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
          // Post-Whistle Bean Bag Tallying (玉かぞえ) on Student iPad:
          // Keep the student's personal 3rd-Person (behind their sitting #01 avatar in Taiiku-zuwari)
          // or 1st-Person (seated ground-level POV) looking up at their own team's 3D basket draining
          // and the 3D counted bean bags stacking up on the sand right in front of them!
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
        // Main Screen TV Broadcast Camera during Post-Whistle Counting Ceremony:
        // Wide framing of BOTH 3D wire-mesh baskets, the 3D counted tally piles on the sand,
        // AND both teams sitting in Taiiku-zuwari (体育座り)!
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

      // 3. Update Adaptive Non-Overflowing Basket Fill, Net Squash-and-Stretch & Cliffhanger Rattle
      const updateBasketState = (basket: BasketAssembly, score: number, phase: number, isRed: boolean) => {
        const isCliffhanger = ended && cFrame?.stage === 'CLIFFHANGER_RATTLE';
        // During the counting ceremony, visually drain the basket bag-by-bag so students watch it empty!
        const visualBagCount =
          ended && cFrame
            ? isRed
              ? cFrame.remainingRedVisual
              : cFrame.remainingWhiteVisual
            : score;

        // Compute adaptive fill ratio in [0, 0.92] so the basket fills steadily and NEVER overflows!
        const targetFill = computeAdaptiveBasketFillRatio(visualBagCount, 20);
        basket.displayFillRatio += (targetFill - basket.displayFillRatio) * Math.min(1, dt * 6.5);
        const fillRatio = basket.displayFillRatio;

        // During CLIFFHANGER_RATTLE, violently jiggle the net & pole as both baskets are checked!
        if (isCliffhanger) {
          basket.hitSquash = 0.55 + Math.sin(elapsed * 38 + phase) * 0.35;
          basket.springVelX += Math.sin(elapsed * 44 + phase) * 1.45 * dt * 15;
          basket.springVelZ += Math.cos(elapsed * 39 + phase) * 1.45 * dt * 15;
        } else {
          // Decay the per-hit squash-and-stretch impulse
          basket.hitSquash = Math.max(0, basket.hitSquash - dt * 3.8);
        }
        const squashWave = Math.sin(basket.hitSquash * Math.PI);

        // 3a. Update Sculpted Inner Mound Core (rises smoothly inside the net cone, capped below rim!)
        if (visualBagCount <= 0 && fillRatio < 0.01) {
          basket.moundMesh.visible = false;
        } else {
          basket.moundMesh.visible = true;
          const radialFit = 0.58 + fillRatio * 0.44 + squashWave * 0.08;
          const heightFit = Math.max(0.06, fillRatio * 0.95 - squashWave * 0.06);
          basket.moundMesh.scale.set(radialFit, heightFit, radialFit);
        }

        // 3b. Reveal & Jostle Individual Stitched Surface Bean Bags proportionally to fillRatio
        const visibleBags =
          visualBagCount <= 12
            ? visualBagCount
            : Math.min(
                basket.innerBagMeshes.length,
                Math.round(12 + ((fillRatio - computeAdaptiveBasketFillRatio(12, 20)) / 0.7) * 52)
              );

        for (let i = 0; i < basket.innerBagMeshes.length; i++) {
          const bMesh = basket.innerBagMeshes[i];
          bMesh.visible = i < visibleBags;
          if (bMesh.visible && squashWave > 0.01) {
            // Top bags jostle when a new bag lands or pops out of the basket!
            bMesh.rotation.z = Math.cos(i * 1.3 + elapsed * 18) * (0.35 + squashWave * 0.25);
          }
        }

        // 3c. Net Belly Bulge + Hit Squash-and-Stretch Gulp
        const bellyBulge = 1 + fillRatio * 0.22 + squashWave * 0.14;
        const netSagY = 1 + fillRatio * 0.08 - squashWave * 0.09;
        basket.netMesh.scale.set(bellyBulge, netSagY, bellyBulge);
        basket.linerMesh.scale.set(bellyBulge * 0.98, netSagY, bellyBulge * 0.98);

        // 3d. Illuminate the 4 Fullness Gauge Rings (25%, 50%, 75%, 90%) as fillRatio climbs
        const ringThresholds = [0.2, 0.42, 0.65, 0.82];
        for (let r = 0; r < basket.levelRings.length; r++) {
          const ringMat = basket.levelRings[r].material as THREE.MeshBasicMaterial;
          const reached = fillRatio >= ringThresholds[r] || isCliffhanger;
          ringMat.opacity = reached ? 0.85 : 0.16;
          if (reached) {
            ringMat.color.setHex(
              isCliffhanger ? 0xfbbf24 : r === 3 ? 0xfbbf24 : isRed ? 0xf43f5e : 0x38bdf8
            );
          }
        }

        // 3e. Rim Shockwave Ring Expansion & Fade on Score / Ejection
        const pulseMat = basket.rimPulseRing.material as THREE.MeshBasicMaterial;
        if (basket.hitSquash > 0.01) {
          const pScale = 1 + (1 - basket.hitSquash) * 0.48;
          basket.rimPulseRing.scale.set(pScale, pScale, 1);
          pulseMat.opacity = basket.hitSquash * 0.9;
        } else {
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

      // 4. Update Flying Bean Bags (Quadratic Bezier + Rim-Bounce Physics + Motion Trails)
      for (let i = 0; i < flyingBags.length; i++) {
        const bag = flyingBags[i];
        if (!bag.active) continue;

        prevPos.copy(bag.mesh.position);

        if (bag.hasBounced) {
          // Free-fall bounce after clanking off the metal rim!
          bag.bounceVel.y -= 9.8 * dt;
          bag.mesh.position.addScaledVector(bag.bounceVel, dt);
          bag.mesh.rotateOnAxis(bag.spinAxis, dt * 14);
          bag.trailMesh.visible = false;

          if (bag.mesh.position.y <= 0.08) {
            bag.active = false;
            bag.mesh.visible = false;
            spawnParticles(bag.mesh.position, bag.team, false, true); // Sand puff on landing!
          }
          continue;
        }

        bag.progress += dt / bag.duration;
        if (bag.progress >= 1) {
          const basket = bag.team === 'red' ? redBasket : whiteBasket;
          if (bag.isNearMiss && !ended) {
            // Clanked off the metal hoop! Impart spring impulse to pole and bounce off!
            bag.hasBounced = true;
            basket.springVelX += (Math.random() - 0.5) * 0.55;
            basket.springVelZ += (Math.random() - 0.5) * 0.55;
            spawnParticles(bag.targetPos, bag.team, false, false);
            continue;
          }

          // Scored inside the basket (or landed on the front tally stack during ceremony)!
          bag.active = false;
          bag.mesh.visible = false;
          bag.trailMesh.visible = false;
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
            // During post-whistle counting ejection, pulse the net & burst stars when counted bags pop!
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

        const t = bag.progress;
        const invT = 1 - t;
        bag.mesh.position.x =
          invT * invT * bag.startPos.x + 2 * invT * t * bag.midPos.x + t * t * bag.targetPos.x;
        bag.mesh.position.y =
          invT * invT * bag.startPos.y + 2 * invT * t * bag.midPos.y + t * t * bag.targetPos.y;
        bag.mesh.position.z =
          invT * invT * bag.startPos.z + 2 * invT * t * bag.midPos.z + t * t * bag.targetPos.z;

        bag.mesh.rotateOnAxis(bag.spinAxis, dt * 11);

        // Orient motion ribbon trail behind the flying bag
        bag.trailMesh.position.lerpVectors(prevPos, bag.mesh.position, 0.3);
        bag.trailMesh.lookAt(prevPos);
      }

      // 5. Update Star & Sand Dust Particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (p.life <= 0) continue;
        p.life -= dt;
        if (p.life <= 0) {
          p.mesh.visible = false;
          continue;
        }
        p.vel.y -= (p.isDust ? 1.8 : 5.2) * dt;
        p.mesh.position.addScaledVector(p.vel, dt);
        const s = (p.life / p.maxLife) * (p.isDust ? 1.35 : 1.0);
        p.mesh.scale.setScalar(s);
        p.mesh.rotation.y += dt * 7;
      }

      // 6. Animate Articulated Student Throwers (Scooping, Jumping, Taiiku-Zuwari Sitting/Clapping Count, & Climax)
      for (let i = 0; i < throwers.length; i++) {
        const avatar = throwers[i];

        // Animate floating student name callout badge when they score or rim-doink
        if (avatar.calloutTimer > 0) {
          avatar.calloutTimer = Math.max(0, avatar.calloutTimer - dt);
          const liftY = 1.55 + (1.2 - avatar.calloutTimer) * 0.32;
          avatar.calloutSprite.position.y = liftY;
          avatar.missCalloutSprite.position.y = liftY;
          if (avatar.calloutTimer <= 0) {
            avatar.calloutSprite.visible = false;
            avatar.missCalloutSprite.visible = false;
          }
        }

        const isFocusedHero = camMode === 'STUDENT_CHASE' && focusAvatar === avatar;
        avatar.headGroup.visible = !(isFocusedHero && viewPerspective === 'FIRST_PERSON');

        if (ended) {
          avatar.heldBag.visible = false;
          avatar.calloutSprite.visible = false;
          avatar.missCalloutSprite.visible = false;
          const stage = cFrame?.stage || 'VICTORY_FANFARE';

          // Move students neatly onto the outer chalk circle looking up at the basket during the ceremony
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
            // Authentic Japanese Undokai Taiiku-Zuwari (体育座り / Sitting Attention Circle) + Synchronized Clapping!
            // Makes it 100% visually unmistakable that throwing has ended and the class is counting the bags!
            const clapBounce = countBeatWave * 0.06;
            avatar.bodyPivot.position.y = -0.22 + clapBounce;
            avatar.bodyPivot.rotation.x = -0.08;
            avatar.headGroup.rotation.x = -0.38 - countBeatWave * 0.12;
            // Knees bent in sitting posture
            avatar.legL.rotation.x = -1.25;
            avatar.legR.rotation.x = -1.25;
            // Hands clap together in front of chest on each count beat!
            avatar.armL.rotation.x = -1.15 - countBeatWave * 0.35;
            avatar.armR.rotation.x = -1.15 - countBeatWave * 0.35;
            avatar.armL.rotation.z = 0.25 - countBeatWave * 0.22;
            avatar.armR.rotation.z = -0.25 + countBeatWave * 0.22;
          } else if (stage === 'CLIFFHANGER_RATTLE') {
            // Drumroll freeze! Students lean forward from their sitting circle, hands clasped in suspense!
            const tremble = Math.sin(elapsed * 32 + i) * 0.025;
            avatar.bodyPivot.position.y = -0.18 + Math.abs(tremble);
            avatar.bodyPivot.rotation.x = 0.12;
            avatar.headGroup.rotation.x = -0.45;
            avatar.legL.rotation.x = -1.15;
            avatar.legR.rotation.x = -1.15;
            avatar.armL.rotation.x = -1.55 + tremble * 2;
            avatar.armR.rotation.x = -1.55 - tremble * 2;
          } else {
            // CLIMAX_REVEAL & VICTORY_FANFARE: Winning team leaps up from the circle in glory!
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
              avatar.bodyPivot.rotation.x = 0.22; // Sitting & clapping for the winners
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

        // Active Undokai Tamaire Scurrying & Throwing Cycle
        const patrolSpan = isFocusedHero ? 0.035 : avatar.ringTier === 1 ? 0.16 : 0.22;
        const patrolAngle = avatar.baseAngle + Math.sin(elapsed * 1.45 + avatar.pickupPhase) * patrolSpan;
        const px = avatar.centerX + Math.cos(patrolAngle) * avatar.radius;
        const pz = Math.sin(patrolAngle) * avatar.radius;
        avatar.root.position.set(px, 0, pz);

        if (isFocusedHero) {
          // In STUDENT_CHASE mode, orient the student's own 3D avatar toward their team's 3D basket (-Z)
          // with a slight over-the-shoulder angle so their #01 back Zekken bib and right throwing arm read clearly!
          avatar.bodyPivot.rotation.y = Math.PI - 0.18;
        } else {
          // Camera-aware 3/4 yaw: blend facing the basket pole with facing the front TV (+Z)
          const angleToBasket = Math.atan2(avatar.centerX - px, 0 - pz);
          const sinCam = Math.sin(angleToBasket);
          const cosCam = Math.cos(angleToBasket) * 0.45 + 0.55;
          avatar.bodyPivot.rotation.y = Math.atan2(sinCam, cosCam);
        }

        if (avatar.throwTimer > 0) {
          // Jumping overhead throw motion!
          avatar.throwTimer = Math.max(0, avatar.throwTimer - dt);
          const prog = 1 - avatar.throwTimer / 0.48;
          const jumpArc = Math.sin(prog * Math.PI);
          avatar.bodyPivot.position.y = jumpArc * 0.34;
          avatar.bodyPivot.rotation.x = -0.18 * jumpArc;
          avatar.armL.rotation.x = -2.6 * jumpArc;
          avatar.armR.rotation.x = -2.85 * jumpArc;
          avatar.heldBag.visible = prog < 0.35;
          avatar.headGroup.rotation.x = -0.35;
          if (avatar.hairTailGroup) {
            avatar.hairTailGroup.rotation.x = -jumpArc * 0.55;
          }
        } else if (isFocusedHero) {
          // 3-Step Physical Throw Cycle Posture for the Student's Own 3D Avatar (#01):
          const bob = Math.abs(Math.sin(elapsed * 4.5)) * 0.04;
          if (actionStep === 0) {
            // Step 0 (① 玉を拾う • SCOOP): Crouched low reaching down toward the glowing bean bag on the sand!
            const reach = Math.sin(elapsed * 5.2) * 0.06;
            avatar.bodyPivot.position.y = -0.15;
            avatar.bodyPivot.rotation.x = 0.46;
            avatar.armL.rotation.x = -0.75;
            avatar.armR.rotation.x = -1.15 - reach * 2;
            avatar.legL.rotation.x = -0.55;
            avatar.legR.rotation.x = -0.55;
            avatar.heldBag.visible = false;
            avatar.headGroup.rotation.x = 0.24;
          } else if (actionStep === 1) {
            // Step 1 (② カゴを狙う • AIM): Standing upright holding the bean bag in hand, looking up to lock onto the net!
            avatar.bodyPivot.position.y = bob;
            avatar.bodyPivot.rotation.x = -0.03;
            avatar.armL.rotation.x = -0.65 - bob;
            avatar.armR.rotation.x = -1.22 - bob * 1.2;
            avatar.legL.rotation.x = 0;
            avatar.legR.rotation.x = 0;
            avatar.heldBag.visible = true;
            avatar.headGroup.rotation.x = -0.24;
          } else {
            // Step 2 (③ カゴへ投げる • SINK THE SHOT!): Coiled in overhead throwing stance with glowing 3D trajectory arc!
            avatar.bodyPivot.position.y = bob * 1.3;
            avatar.bodyPivot.rotation.x = -0.09;
            avatar.armL.rotation.x = -1.35 - bob * 1.5;
            avatar.armR.rotation.x = -1.85 - bob * 1.8;
            avatar.legL.rotation.x = 0;
            avatar.legR.rotation.x = 0;
            avatar.heldBag.visible = true;
            avatar.headGroup.rotation.x = -0.34;
          }
        } else {
          // Alternating between crouching down to scoop a bean bag from the sand & aiming up!
          const cycle = Math.sin(elapsed * 4.2 + avatar.pickupPhase);
          if (cycle < -0.35) {
            // Squatting down to pick up a fallen bean bag from the sand
            const crouch = (-cycle - 0.35) / 0.65;
            avatar.bodyPivot.position.y = -crouch * 0.14;
            avatar.bodyPivot.rotation.x = crouch * 0.45;
            avatar.armL.rotation.x = -crouch * 0.9;
            avatar.armR.rotation.x = -crouch * 1.1;
            avatar.legL.rotation.x = -crouch * 0.5;
            avatar.legR.rotation.x = -crouch * 0.5;
            avatar.heldBag.visible = true;
            avatar.headGroup.rotation.x = 0.18;
          } else {
            // Looking up at the basket aiming the bean bag
            const bob = Math.abs(Math.sin(elapsed * 6.5 + avatar.pickupPhase)) * 0.06;
            avatar.bodyPivot.position.y = bob;
            avatar.bodyPivot.rotation.x = -0.06;
            avatar.armL.rotation.x = -1.15 - bob * 2;
            avatar.armR.rotation.x = -1.45 - bob * 2;
            avatar.legL.rotation.x = Math.sin(elapsed * 6.5 + i) * 0.22;
            avatar.legR.rotation.x = -Math.sin(elapsed * 6.5 + i) * 0.22;
            avatar.heldBag.visible = true;
            avatar.headGroup.rotation.x = -0.26;
            if (avatar.hairTailGroup) {
              avatar.hairTailGroup.rotation.x = Math.sin(elapsed * 6.5 + i) * 0.18;
            }
          }
        }
      }

      // 7. Animate Cheering Tent Spectators & Clouds
      for (let i = 0; i < allSpectators.length; i++) {
        allSpectators[i].position.y = Math.abs(Math.sin(elapsed * 6.8 + i * 0.7)) * 0.14;
        allSpectators[i].rotation.y = Math.sin(elapsed * 3.2 + i) * 0.2;
      }
      cloudsGroup.rotation.y = Math.sin(elapsed * 0.04) * 0.06;

      renderer.render(scene, camera);
    };

    animId = afterDraw(tick);

    const handleResize = () => {
      if (!container) return;
      width = container.clientWidth || 960;
      height = container.clientHeight || 540;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);
    const resizeObserver =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(handleResize) : null;
    resizeObserver?.observe(container);

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver?.disconnect();
      cancelAnimationFrame(animId);
      enqueueThrowsRef.current = null;
      renderer.dispose();
      if (renderer.domElement && renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

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
                  赤組<rt className="text-[9px]">あかぐみ</rt>
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
                  白組<rt className="text-[9px]">しろぐみ</rt>
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

