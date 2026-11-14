/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ============================================================================
 * FILE: src/games/quiz/host/Tamaire3DStage.tsx (aliased by Volleyball3DStage.tsx)
 * ============================================================================
 * 3D Undokai Bean Bag Toss (玉入れ) stage orchestrating the Three.js scene,
 * harmonic basket spring physics, parabolic bean-bag flights, Mii throwers,
 * and post-whistle Japanese Counting Ceremony ("ひとーつ！ふたーつ！").
 *
 * Submodules under `./tamaire/`:
 * - `tamaireTextures.ts`: Procedural Masado sand, grass, school facade, kohaku & atlases
 * - `tamaireArenaBuilder.ts`: Merged stadium props, spectators & spring basket poles
 * - `tamaireThrowerPool.ts`: Hardware-instanced 40-student thrower rigs & callout sprites
 * - `tamaireCeremonyAudio.ts`: Zero-asset WebAudio referee whistle, taiko & chimes
 * - `TamaireDirectorOverlays.tsx`: Director TV HUD & counting ceremony overlays
 * ============================================================================
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { TeamId } from '../types';
import { buildTamaireSuspenseSchedule, TamaireSuspenseFrame } from '../core/quizEngine';
import { createClassroomRenderer } from '@/utils/classroom3d';
import {
  createDoubleRingShadowTexture,
  createSchoolyardSandMaps,
  createLushGrassTexture,
  createKohakuMakuTexture,
  createUndokaiBannerTexture,
  createStitchedBeanBagTexture,
  getBeanBagAtlasTexture,
  getBeanBagAtlasRect,
  injectWiiSatinRimShader,
} from './tamaire/tamaireTextures';
import {
  BasketAssembly,
  computeAdaptiveBasketFillRatio,
  buildTamaireBasketPole,
  buildUndokaiArenaEnvironment,
} from './tamaire/tamaireArenaBuilder';
import {
  ThrowerAvatarRig,
  createCalloutSpritePool,
  createThrowerRig,
  createThrowerBatchPool,
} from './tamaire/tamaireThrowerPool';
import { playTamaireCeremonySound } from './tamaire/tamaireCeremonyAudio';
import { DirectorCamPreset, TamaireDirectorOverlays } from './tamaire/TamaireDirectorOverlays';

export { computeAdaptiveBasketFillRatio };

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

// ----------------------------------------------------------------------------
// Main Component: Tamaire3DStage (Exported also as Volleyball3DStage)
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
  studentViewPerspective = 'THIRD_PERSON',
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
  const [directorCamPreset, setDirectorCamPreset] = useState<DirectorCamPreset>('WIDE');
  const [latestThrowBanner, setLatestThrowBanner] = useState<VolleyballAnswerEvent | null>(null);
  const [contextRestartKey, setContextRestartKey] = useState(0);

  const ceremonyFrameRef = useRef<TamaireSuspenseFrame | null>(null);
  const countBeatPulseRef = useRef<number>(0);
  const ceremonySfxEnabledRef = useRef<boolean>(!isStudentChase);
  ceremonySfxEnabledRef.current = ceremonySfxEnabled && !isStudentChase;
  const directorCamPresetRef = useRef<DirectorCamPreset>('WIDE');
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
    studentViewPerspective,
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
    studentViewPerspective,
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
      alpha: false,
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
        metalness: 0.01,
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
        bumpScale: 0.02,
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
        roughness: 0.88,
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
    const throwerById = new Map<string, ThrowerAvatarRig>();

    const defaultRedNames = [
      'Kenji 🐼', 'Hana 🐰', 'Ren 🐯', 'Yui 🐨', 'Sora 🦁',
      'Mio 🐬', 'Kaito 🦊', 'Aoi 🐧', 'Haru 🐸', 'Mei 🦋',
      'Riku 🦅', 'Koharu 🌸', 'Yuto ⚡', 'Hina 🍓', 'Taiga 🐉',
      'Saki 🌈', 'Asahi ☀️', 'Natsuki 🍉', 'Yamato 🗻', 'Rin 🔔',
    ];
    const defaultWhiteNames = [
      'Tsubasa 🕊️', 'Sakura 🌸', 'Hayato ⚡', 'Akari ⭐', 'Daiki 🐻',
      'Yuna 🌙', 'Kenta 🦖', 'Momoka 🍑', 'Sho 🚀', 'Emi 🎵',
      'Kazuki 🌊', 'Noa ❄️', 'Ryota 🏆', 'Misaki 💎', 'Kota 🦊',
      'Ayaka 🌻', 'Shun 🎯', 'Nana 🍀', 'Takumi 🛡️', 'Chihiro 🐚',
    ];

    const rebuildThrowerAvatars = () => {
      throwers = [];
      throwerById.clear();

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
            team: 'red',
          });
        }
        for (let i = 0; i < wCount; i++) {
          whiteList.push({
            id: `white_student_${i + 1}`,
            nickname: defaultWhiteNames[i % defaultWhiteNames.length],
            team: 'white',
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

      const spawnTeamRing = (
        list: TamaireStudentRosterItem[],
        team: 'red' | 'white',
        centerX: number,
        offsetIdx: number
      ) => {
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
          throwerById.set(avatar.id, avatar);
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
      opacity: 0.78,
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
      side: THREE.DoubleSide,
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
        spinAxis: new THREE.Vector3(1, 1, 0).normalize(),
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
      depthWrite: false,
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
      isDust: false,
    }));
    const dustParticles: BurstParticle[] = Array.from({ length: MAX_DUST }, () => ({
      pos: new THREE.Vector3(),
      scale: 1,
      rotY: 0,
      color: new THREE.Color(0xe7d3b0),
      vel: new THREE.Vector3(),
      life: 0,
      maxLife: 0.42,
      isDust: true,
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
      opacity: 0.65,
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

    const resolveTeamThrower = (team: 'red' | 'white', playerId?: string) => {
      const byId = playerId ? throwerById.get(playerId) : undefined;
      if (byId && byId.team === team) return byId;
      const focusNick = stateRef.current.focusPlayer?.nickname;
      return (
        throwers.find((t) => t.team === team && focusNick && t.nickname === focusNick) ||
        throwers.find((t) => t.team === team)
      );
    };

    const spawnThrow = (
      team: 'red' | 'white',
      count: number,
      isGolden: boolean,
      playerId?: string,
      isMissThrow = false,
      stepAction?: VolleyballAnswerEvent['stepAction']
    ) => {
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
        const actor = resolveTeamThrower(team, playerId);
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

      const teamThrowers = throwers.filter((t) => t.team === team);
      const totalToSpawn =
        ended || isMissThrow || (isChaseMode && Boolean(playerId)) ? count : count + 1;

      for (let c = 0; c < totalToSpawn; c++) {
        const isNearMiss =
          !ended && (isMissThrow || (c === totalToSpawn - 1 && totalToSpawn > count));
        const slot = flyingBags.find((b) => !b.active);
        if (!slot) break;

        const matchedStudent =
          c === 0 && playerId ? resolveTeamThrower(team, playerId) : undefined;
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
      new THREE.Color(0xfbbf24),
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
        studentViewPerspective: viewPerspective = 'THIRD_PERSON',
      } = stateRef.current;

      const cFrame = ceremonyFrameRef.current;
      countBeatPulseRef.current = Math.max(0, countBeatPulseRef.current - dt * 3.6);
      const countBeatWave = Math.sin(countBeatPulseRef.current * Math.PI);

      // Identify the focused student avatar in O(1) when in STUDENT_CHASE mode
      const focusTeam = fPlayer?.team || 'red';
      const byFocusId = camMode === 'STUDENT_CHASE' && fPlayer?.id ? throwerById.get(fPlayer.id) : undefined;
      const focusAvatar =
        camMode === 'STUDENT_CHASE'
          ? (byFocusId && byFocusId.team === focusTeam ? byFocusId : undefined) ||
            throwers.find((t) => t.team === focusTeam && t.nickname === fPlayer?.nickname) ||
            throwers.find((t) => t.team === focusTeam)
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
          const rimY =
            focusTeam === 'white'
              ? whiteBasket.rimCenterWorld.y - 0.15
              : redBasket.rimCenterWorld.y - 0.15;
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
      const updateBasketState = (
        basket: BasketAssembly,
        score: number,
        phase: number,
        isRed: boolean
      ) => {
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

      // Update floating callout sprites in O(1) (hide during end-of-match counting ceremony)
      if (ended) {
        calloutPool.hideAll();
      } else {
        calloutPool.update(dt, (ownerId) => throwerById.get(ownerId)?.root.position ?? null);
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

      {/* Director TV Broadcast Scoreboard, Live Feed Ticker & Post-Whistle Counting Ceremony */}
      {!isStudentChase && (
        <TamaireDirectorOverlays
          redScore={redScore}
          whiteScore={whiteScore}
          countedRed={countedRed}
          countedWhite={countedWhite}
          matchEnded={matchEnded}
          hideScoreUntilEnd={hideScoreUntilEnd}
          timeRemainingSeconds={timeRemainingSeconds}
          ceremonySfxEnabled={ceremonySfxEnabled}
          onToggleCeremonySfx={() => setCeremonySfxEnabled((v) => !v)}
          directorCamPreset={directorCamPreset}
          onSelectDirectorCamPreset={setDirectorCamPreset}
          latestThrowBanner={latestThrowBanner}
          countingActive={countingActive}
          ceremonyComplete={ceremonyComplete}
          activeSuspenseFrame={activeSuspenseFrame}
          onReplayCeremony={() => setCeremonyReplayNonce((n) => n + 1)}
        />
      )}
    </div>
  );
};

// Export Volleyball3DStage alias for 100% drop-in compatibility with existing Eigo Arena imports
export const Volleyball3DStage = Tamaire3DStage;
export default Tamaire3DStage;
