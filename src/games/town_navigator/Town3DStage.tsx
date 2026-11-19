import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { createClassroomRenderer } from '../../utils/classroom3d';
import { generateRandomTown, TownMap } from './townGenerator';
import { buildPlayerAvatar } from './models/playerAvatar';
import { ROAD_COORDS } from './navigationLogic';
import type { TownCameraMode, TownReplayRecording, TownReplayFrame } from './multiplayer/types';

export type Town3DStageMode = 'STUDENT_DRIVE' | 'HOST_BROADCAST' | 'HOST_REPLAY';

export interface LiveAvatarPose {
  playerId: string;
  x: number;
  z: number;
  yaw: number;
  color: string;
  podiumPlace?: 1 | 2 | 3;
}

export interface Town3DStageProps {
  mode: Town3DStageMode;
  townSeed: number;
  schoolId?: string;
  lowPower?: boolean;
  /** Spawn point & heading for STUDENT_DRIVE or MYSTERY_SKY camera */
  spawnPos?: [number, number];
  spawnHeading?: number;
  /** Lock movement during BRIEFING or lockout penalty */
  controlsLocked?: boolean;
  /** Virtual joystick input ref ({ x: -1..1, y: -1..1 }) for touch devices */
  joystickRef?: React.MutableRefObject<{ x: number; y: number }>;
  /** Callback invoked on animation frame (throttled internally by caller) with local avatar pose */
  onLocalPoseChange?: (x: number, z: number, yaw: number) => void;
  /** Live players ref for HOST_BROADCAST */
  livePlayersRef?: React.MutableRefObject<LiveAvatarPose[]>;
  /** Camera mode for HOST_BROADCAST */
  cameraMode?: TownCameraMode;
  /** Leader playerId for FOLLOW_LEADER camera */
  leaderPlayerId?: string;
  /** Revealed target world position [x, y, z] for HOST_REPLAY hover camera & beacon */
  revealedTargetPos?: [number, number, number];
  /** All-player replay recording for HOST_REPLAY */
  replayRecording?: TownReplayRecording | null;
  /** Increment to restart HOST_REPLAY from t=0 */
  replayTrigger?: number;
  /** Increment to teleport local student back to spawnPos & spawnHeading */
  respawnTrigger?: number;
  /** Split-screen camera layout for HOST_REPLAY ('1' | '2' | '4', default '2') */
  replayLayout?: '1' | '2' | '4';
  /** Called if WebGL context is lost or student iPad FPS drops critically */
  onRequest2DFallback?: () => void;
  className?: string;
}

const MAX_INSTANCED_PLAYERS = 48;
const MOVE_SPEED = 11.5; // m/s brisk classroom run speed
const TURN_SPEED = 2.6; // rad/s

/**
 * Clamps a world coordinate to stay within the town bounds and road/sidewalk corridors
 * so students cannot walk straight through solid building interiors.
 */
function clampToWalkableCorridor(x: number, z: number): [number, number] {
  const cx = Math.max(-69, Math.min(69, x));
  const cz = Math.max(-69, Math.min(69, z));

  // Find nearest road centerline in X and Z
  let nearestRx = ROAD_COORDS[0];
  let minDx = Infinity;
  for (const r of ROAD_COORDS) {
    const d = Math.abs(cx - r);
    if (d < minDx) {
      minDx = d;
      nearestRx = r;
    }
  }

  let nearestRz = ROAD_COORDS[0];
  let minDz = Infinity;
  for (const r of ROAD_COORDS) {
    const d = Math.abs(cz - r);
    if (d < minDz) {
      minDz = d;
      nearestRz = r;
    }
  }

  const corridorHalfX = nearestRx === 0 ? 7.2 : 4.2;
  const corridorHalfZ = nearestRz === 0 ? 7.2 : 4.2;

  if (minDx <= corridorHalfX || minDz <= corridorHalfZ) {
    return [cx, cz];
  }

  // Push back onto whichever road corridor is closer
  if (minDx < minDz) {
    const clampedX = nearestRx + Math.sign(cx - nearestRx) * corridorHalfX;
    return [clampedX, cz];
  } else {
    const clampedZ = nearestRz + Math.sign(cz - nearestRz) * corridorHalfZ;
    return [cx, clampedZ];
  }
}

/**
 * Interpolates a player's [x, z, yaw] at `elapsedMs` from their recorded frames.
 */
function sampleTrackAt(frames: TownReplayFrame[], elapsedMs: number): [number, number, number] {
  if (frames.length === 0) return [0, 0, 0];
  if (frames.length === 1 || elapsedMs <= frames[0][3]) {
    return [frames[0][0], frames[0][1], frames[0][2]];
  }
  const last = frames[frames.length - 1];
  if (elapsedMs >= last[3]) {
    return [last[0], last[1], last[2]];
  }

  // Binary search for surrounding frames
  let lo = 0;
  let hi = frames.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (frames[mid][3] <= elapsedMs) lo = mid;
    else hi = mid;
  }

  const a = frames[lo];
  const b = frames[hi];
  const span = Math.max(1, b[3] - a[3]);
  const t = Math.max(0, Math.min(1, (elapsedMs - a[3]) / span));
  const x = a[0] + (b[0] - a[0]) * t;
  const z = a[1] + (b[1] - a[1]) * t;

  let dYaw = b[2] - a[2];
  while (dYaw > Math.PI) dYaw -= Math.PI * 2;
  while (dYaw < -Math.PI) dYaw += Math.PI * 2;
  const yaw = a[2] + dYaw * t;

  return [x, z, yaw];
}

export const Town3DStage: React.FC<Town3DStageProps> = ({
  mode,
  townSeed,
  schoolId,
  lowPower = false,
  spawnPos = [0, 33],
  spawnHeading = 0,
  controlsLocked = false,
  joystickRef,
  onLocalPoseChange,
  livePlayersRef,
  cameraMode = 'OVERVIEW',
  leaderPlayerId,
  revealedTargetPos,
  replayRecording,
  replayTrigger = 0,
  respawnTrigger = 0,
  replayLayout = '2',
  onRequest2DFallback,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Keep dynamic props in refs so the WebGL scene never tears down on phase/camera changes
  const modeRef = useRef(mode);
  const controlsLockedRef = useRef(controlsLocked);
  const cameraModeRef = useRef(cameraMode);
  const leaderIdRef = useRef(leaderPlayerId);
  const revealedTargetRef = useRef(revealedTargetPos);
  const replayRecordingRef = useRef(replayRecording);
  const replayLayoutRef = useRef(replayLayout);
  const onLocalPoseRef = useRef(onLocalPoseChange);
  const onFallbackRef = useRef(onRequest2DFallback);

  modeRef.current = mode;
  controlsLockedRef.current = controlsLocked;
  cameraModeRef.current = cameraMode;
  leaderIdRef.current = leaderPlayerId;
  revealedTargetRef.current = revealedTargetPos;
  replayRecordingRef.current = replayRecording;
  replayLayoutRef.current = replayLayout;
  onLocalPoseRef.current = onLocalPoseChange;
  onFallbackRef.current = onRequest2DFallback;

  // Local student avatar state
  const localPoseRef = useRef({ x: spawnPos[0], z: spawnPos[1], yaw: spawnHeading });
  const replayClockMsRef = useRef(0);

  // Reset local avatar when spawn changes (new round!) or student taps "Back to Start"
  useEffect(() => {
    localPoseRef.current = { x: spawnPos[0], z: spawnPos[1], yaw: spawnHeading };
  }, [spawnPos[0], spawnPos[1], spawnHeading, respawnTrigger]);

  // Reset replay clock whenever replayTrigger or recording changes
  useEffect(() => {
    replayClockMsRef.current = 0;
  }, [replayTrigger, replayRecording]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const { renderer } = createClassroomRenderer(container, {
      isStudentView: lowPower,
      alpha: false,
    });

    const isLowPower = lowPower;
    renderer.shadowMap.enabled = false; // Zero dynamic shadows for smooth 60fps across 40 iPads + Intel Dynabooks
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isLowPower ? 1.0 : 1.25));
    renderer.setSize(container.clientWidth || 640, container.clientHeight || 360);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      onFallbackRef.current?.();
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost, false);

    // Scene & Lighting
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#bae6fd');
    scene.fog = new THREE.Fog('#bae6fd', 95, 230);

    const initAspect = (container.clientWidth || 640) / Math.max(1, container.clientHeight || 360);
    const camera = new THREE.PerspectiveCamera(52, initAspect, 0.5, 360);
    const birdCam = new THREE.PerspectiveCamera(50, initAspect, 1.0, 420);
    const finishCam = new THREE.PerspectiveCamera(54, initAspect, 0.5, 320);
    const actionCam = new THREE.PerspectiveCamera(58, initAspect, 0.4, 280);

    const hemi = new THREE.HemisphereLight('#ffffff', '#86efac', 1.15);
    scene.add(hemi);
    const dir = new THREE.DirectionalLight('#fff7ed', 1.1);
    dir.position.set(55, 85, 45);
    scene.add(dir);

    // Ground plane
    const groundGeo = new THREE.PlaneGeometry(340, 340);
    const groundMat = new THREE.MeshLambertMaterial({ color: '#86efac' });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.08;
    scene.add(ground);

    // Generate deterministic 3D town
    const town: TownMap = generateRandomTown(townSeed, {
      schoolId,
      enableDynamicShadows: false,
      lowPower: isLowPower,
    });
    scene.add(town.buildingsGroup);

    // Detailed articulated student avatar (used for local player in STUDENT_DRIVE & Gold winner in HOST_REPLAY)
    const detailedAvatar = buildPlayerAvatar();
    detailedAvatar.group.scale.set(1.25, 1.25, 1.25);
    scene.add(detailedAvatar.group);

    // Pooled InstancedMesh pair for all 30–40 multiplayer avatars (2 draw calls total!)
    const bodyGeo = new THREE.CylinderGeometry(0.36, 0.44, 1.15, 10);
    const headGeo = new THREE.SphereGeometry(0.38, 10, 10);
    const instBodyMat = new THREE.MeshLambertMaterial({ color: '#ffffff' });
    const instHeadMat = new THREE.MeshLambertMaterial({ color: '#ffdbac' });
    const instBodies = new THREE.InstancedMesh(bodyGeo, instBodyMat, MAX_INSTANCED_PLAYERS);
    const instHeads = new THREE.InstancedMesh(headGeo, instHeadMat, MAX_INSTANCED_PLAYERS);
    // Pre-initialize instanceColor buffer before first render so Three.js compiles USE_INSTANCING_COLOR
    const initColor = new THREE.Color('#3b82f6');
    for (let i = 0; i < MAX_INSTANCED_PLAYERS; i++) {
      instBodies.setColorAt(i, initColor);
    }
    if (instBodies.instanceColor) instBodies.instanceColor.needsUpdate = true;
    instBodies.count = 0;
    instHeads.count = 0;
    instBodies.frustumCulled = false;
    instHeads.frustumCulled = false;
    scene.add(instBodies, instHeads);

    // Gold winner highlight ring + Revealed Target golden beacon pillar
    const goldRing = new THREE.Mesh(
      new THREE.RingGeometry(0.9, 1.35, 24),
      new THREE.MeshBasicMaterial({ color: '#facc15', side: THREE.DoubleSide })
    );
    goldRing.rotation.x = -Math.PI / 2;
    goldRing.position.y = 0.12;
    goldRing.visible = false;
    scene.add(goldRing);

    const targetBeacon = new THREE.Mesh(
      new THREE.CylinderGeometry(1.1, 1.6, 18, 16, 1, true),
      new THREE.MeshBasicMaterial({
        color: '#facc15',
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
      })
    );
    targetBeacon.position.y = 9;
    targetBeacon.visible = false;
    scene.add(targetBeacon);

    // Keyboard state for STUDENT_DRIVE
    const keys = new Set<string>();
    const onKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) {
        keys.add(e.code);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => keys.delete(e.code);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // Resize observer
    const ro = new ResizeObserver(() => {
      if (!container) return;
      const w = container.clientWidth || 640;
      const h = container.clientHeight || 360;
      camera.aspect = w / Math.max(1, h);
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    ro.observe(container);

    // Scratch objects (zero GC in animation loop)
    const dummy = new THREE.Object3D();
    const colorScratch = new THREE.Color();
    const camTargetPos = new THREE.Vector3();
    const camLookTarget = new THREE.Vector3();

    let rafId = 0;
    let lastTime = performance.now();
    let lowFpsAccumMs = 0;
    let disposed = false;

    const animate = (now: number) => {
      if (disposed) return;
      rafId = requestAnimationFrame(animate);

      const dt = Math.min(0.1, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      // Student iPad FPS watchdog -> auto-fallback to 2D if struggling
      if (modeRef.current === 'STUDENT_DRIVE' && onFallbackRef.current) {
        if (dt > 1 / 17) {
          lowFpsAccumMs += dt * 1000;
          if (lowFpsAccumMs > 3200) {
            onFallbackRef.current();
            return;
          }
        } else {
          lowFpsAccumMs = Math.max(0, lowFpsAccumMs - dt * 500);
        }
      }

      const activeMode = modeRef.current;

      if (activeMode === 'STUDENT_DRIVE') {
        detailedAvatar.group.visible = true;
        instBodies.count = 0;
        instHeads.count = 0;
        goldRing.visible = false;
        targetBeacon.visible = false;

        const pose = localPoseRef.current;
        let isMoving = false;
        if (!controlsLockedRef.current) {
          let forward = 0;
          let turn = 0;
          if (keys.has('KeyW') || keys.has('ArrowUp')) forward += 1;
          if (keys.has('KeyS') || keys.has('ArrowDown')) forward -= 0.7;
          if (keys.has('KeyA') || keys.has('ArrowLeft')) turn += 1;
          if (keys.has('KeyD') || keys.has('ArrowRight')) turn -= 1;

          if (joystickRef?.current) {
            const jx = joystickRef.current.x;
            const jy = joystickRef.current.y;
            if (Math.abs(jx) > 0.08 || Math.abs(jy) > 0.08) {
              turn -= jx * 1.1;
              forward += jy;
            }
          }

          pose.yaw += turn * TURN_SPEED * dt;
          if (Math.abs(forward) > 0.01) {
            isMoving = true;
            const nextX = pose.x + Math.sin(pose.yaw) * forward * MOVE_SPEED * dt;
            const nextZ = pose.z + Math.cos(pose.yaw) * forward * MOVE_SPEED * dt;
            const [clampedX, clampedZ] = clampToWalkableCorridor(nextX, nextZ);
            pose.x = clampedX;
            pose.z = clampedZ;
          }
        }

        detailedAvatar.group.position.set(pose.x, 0, pose.z);
        detailedAvatar.group.rotation.y = pose.yaw;
        detailedAvatar.updateAnimation(isMoving, dt, 1.35, 'RUN');
        onLocalPoseRef.current?.(pose.x, pose.z, pose.yaw);

        // Smooth 3rd-person follow camera behind student
        const backDist = 7.8;
        const height = 4.6;
        camTargetPos.set(
          pose.x - Math.sin(pose.yaw) * backDist,
          height,
          pose.z - Math.cos(pose.yaw) * backDist
        );
        camera.position.lerp(camTargetPos, 1 - Math.exp(-8 * dt));
        camLookTarget.set(
          pose.x + Math.sin(pose.yaw) * 6.5,
          1.6,
          pose.z + Math.cos(pose.yaw) * 6.5
        );
        camera.lookAt(camLookTarget);
      } else if (activeMode === 'HOST_BROADCAST') {
        detailedAvatar.group.visible = false;
        goldRing.visible = false;
        targetBeacon.visible = false;

        const players = livePlayersRef?.current ?? [];
        const count = Math.min(MAX_INSTANCED_PLAYERS, players.length);
        instBodies.count = count;
        instHeads.count = count;

        let leaderPose: LiveAvatarPose | null = null;
        for (let i = 0; i < count; i++) {
          const p = players[i];
          if (p.playerId === leaderIdRef.current || (!leaderPose && i === 0)) {
            leaderPose = p;
          }
          dummy.position.set(p.x, 0.72, p.z);
          dummy.rotation.set(0, p.yaw, 0);
          dummy.scale.set(1.25, 1.25, 1.25);
          dummy.updateMatrix();
          instBodies.setMatrixAt(i, dummy.matrix);
          colorScratch.set(p.color || '#3b82f6');
          instBodies.setColorAt(i, colorScratch);

          dummy.position.set(p.x, 1.95, p.z);
          dummy.scale.set(1.25, 1.25, 1.25);
          dummy.updateMatrix();
          instHeads.setMatrixAt(i, dummy.matrix);
        }
        instBodies.instanceMatrix.needsUpdate = true;
        if (instBodies.instanceColor) instBodies.instanceColor.needsUpdate = true;
        instHeads.instanceMatrix.needsUpdate = true;

        const cMode = cameraModeRef.current;
        if (cMode === 'MYSTERY_SKY') {
          const angle = now * 0.00025;
          camTargetPos.set(
            spawnPos[0] + Math.cos(angle) * 28,
            24,
            spawnPos[1] + Math.sin(angle) * 28
          );
          camera.position.lerp(camTargetPos, 1 - Math.exp(-3 * dt));
          camera.lookAt(spawnPos[0], 1.5, spawnPos[1]);
        } else if (cMode === 'FOLLOW_LEADER' && leaderPose) {
          camTargetPos.set(leaderPose.x - 14, 18, leaderPose.z + 16);
          camera.position.lerp(camTargetPos, 1 - Math.exp(-4 * dt));
          camera.lookAt(leaderPose.x, 1.5, leaderPose.z);
        } else {
          // OVERVIEW: gentle wide aerial orbit of the full town
          const angle = now * 0.00008;
          camTargetPos.set(Math.sin(angle) * 85, 78, Math.cos(angle) * 85);
          camera.position.lerp(camTargetPos, 1 - Math.exp(-2.5 * dt));
          camera.lookAt(0, 0, 0);
        }
      } else if (activeMode === 'HOST_REPLAY') {
        const rec = replayRecordingRef.current;
        const targetPos = revealedTargetRef.current;

        if (targetPos) {
          targetBeacon.visible = true;
          targetBeacon.position.set(targetPos[0], 9, targetPos[2]);
          targetBeacon.rotation.y += dt * 1.4;
        } else {
          targetBeacon.visible = false;
        }

        if (rec && rec.tracks.length > 0) {
          // Conditional 0.5x photo-finish slow-motion ONLY when Silver is within 1.5s of Gold
          const inPhotoFinishWindow =
            rec.isPhotoFinish &&
            rec.goldFinishMs != null &&
            replayClockMsRef.current >= Math.max(0, rec.goldFinishMs - 2000) &&
            replayClockMsRef.current <= rec.goldFinishMs + 600;

          const speed = inPhotoFinishWindow ? 0.5 : 2.2;
          replayClockMsRef.current += dt * 1000 * speed;
          const totalDur = Math.max(2500, rec.durationMs + 1500);
          if (replayClockMsRef.current > totalDur) {
            replayClockMsRef.current = 0; // Loop smoothly
          }

          const trackedId = rec.goldPlayerId ?? rec.tracks[0].playerId;
          let goldX = targetPos ? targetPos[0] : 0;
          let goldZ = targetPos ? targetPos[2] : 0;
          let goldYaw = 0;
          let foundGold = false;
          let instIdx = 0;

          for (let i = 0; i < rec.tracks.length && instIdx < MAX_INSTANCED_PLAYERS; i++) {
            const track = rec.tracks[i];
            const [x, z, yaw] = sampleTrackAt(track.frames, replayClockMsRef.current);
            const isGold = track.playerId === trackedId;

            if (isGold) {
              goldX = x;
              goldZ = z;
              goldYaw = yaw;
              foundGold = true;
              continue; // Render Gold winner with the detailed articulated avatar!
            }

            const scale = 1.25;
            dummy.position.set(x, 0.72 * scale, z);
            dummy.rotation.set(0, yaw, 0);
            dummy.scale.set(scale, scale, scale);
            dummy.updateMatrix();
            instBodies.setMatrixAt(instIdx, dummy.matrix);
            colorScratch.set(track.color || '#3b82f6');
            instBodies.setColorAt(instIdx, colorScratch);

            dummy.position.set(x, 1.55 * scale, z);
            dummy.scale.set(scale, scale, scale);
            dummy.updateMatrix();
            instHeads.setMatrixAt(instIdx, dummy.matrix);
            instIdx++;
          }

          instBodies.count = instIdx;
          instHeads.count = instIdx;
          instBodies.instanceMatrix.needsUpdate = true;
          if (instBodies.instanceColor) instBodies.instanceColor.needsUpdate = true;
          instHeads.instanceMatrix.needsUpdate = true;

          if (foundGold) {
            detailedAvatar.group.visible = true;
            detailedAvatar.group.position.set(goldX, 0, goldZ);
            detailedAvatar.group.rotation.y = goldYaw;
            detailedAvatar.updateAnimation(true, dt * speed, 1.4, 'RUN');
            goldRing.visible = true;
            goldRing.position.set(goldX, 0.14, goldZ);
          } else {
            detailedAvatar.group.visible = false;
            goldRing.visible = false;
          }

          // 1. CHASE DRONE (Primary camera): steep ~60° isometric follow behind Gold (never blocked by buildings!)
          camTargetPos.set(goldX - 13, 24, goldZ + 14);
          camera.position.lerp(camTargetPos, 1 - Math.exp(-5 * dt));
          camLookTarget.set(goldX, 1.4, goldZ);
          camera.lookAt(camLookTarget);

          // 2. BIRD'S-EYE DRONE: auto-framed from Start (bottom) to Destination (top)
          if (targetPos) {
            const sx = spawnPos[0];
            const sz = spawnPos[1];
            const tx = targetPos[0];
            const tz = targetPos[2];
            const midX = (sx + tx) * 0.5;
            const midZ = (sz + tz) * 0.5;
            const dx = tx - sx;
            const dz = tz - sz;
            const span = Math.max(24, Math.hypot(dx, dz));
            const ux = span > 0.1 ? dx / span : 0;
            const uz = span > 0.1 ? dz / span : -1;
            const height = Math.min(135, Math.max(48, span * 1.25));

            birdCam.up.set(ux, 0, uz);
            birdCam.position.set(
              midX - ux * (span * 0.12),
              height,
              midZ - uz * (span * 0.12)
            );
            birdCam.lookAt(midX, 0, midZ);
          } else {
            birdCam.up.set(0, 1, 0);
            birdCam.position.set(0, 125, 18);
            birdCam.lookAt(0, 0, 0);
          }

          // 3. FINISH LINE CAM: street-level hover right in front of destination waiting for finishers
          if (targetPos) {
            finishCam.position.set(targetPos[0] + 10, 7.5, targetPos[2] + 11);
            finishCam.lookAt(targetPos[0], 1.8, targetPos[2]);
          }

          // 4. ACTION CAM: tight over-the-shoulder chase behind Gold
          actionCam.position.set(
            goldX - Math.sin(goldYaw) * 6.5,
            3.8,
            goldZ - Math.cos(goldYaw) * 6.5
          );
          actionCam.lookAt(
            goldX + Math.sin(goldYaw) * 8,
            1.6,
            goldZ + Math.cos(goldYaw) * 8
          );

          const w = container.clientWidth || 640;
          const h = container.clientHeight || 360;
          const layout = replayLayoutRef.current;

          if (layout === '2') {
            const halfW = Math.floor(w / 2);
            renderer.setScissorTest(true);

            // Left: Chase Drone (Gold)
            camera.aspect = halfW / Math.max(1, h);
            camera.updateProjectionMatrix();
            renderer.setViewport(0, 0, halfW, h);
            renderer.setScissor(0, 0, halfW, h);
            renderer.render(scene, camera);

            // Right: Full-Town Bird's-Eye
            birdCam.aspect = (w - halfW) / Math.max(1, h);
            birdCam.updateProjectionMatrix();
            renderer.setViewport(halfW, 0, w - halfW, h);
            renderer.setScissor(halfW, 0, w - halfW, h);
            renderer.render(scene, birdCam);

            renderer.setScissorTest(false);
            return;
          }

          if (layout === '4') {
            const halfW = Math.floor(w / 2);
            const halfH = Math.floor(h / 2);
            const qAspect = halfW / Math.max(1, halfH);
            renderer.setScissorTest(true);

            // Top-Left: Chase Drone (Gold)
            camera.aspect = qAspect;
            camera.updateProjectionMatrix();
            renderer.setViewport(0, halfH, halfW, h - halfH);
            renderer.setScissor(0, halfH, halfW, h - halfH);
            renderer.render(scene, camera);

            // Top-Right: Full-Town Bird's-Eye
            birdCam.aspect = qAspect;
            birdCam.updateProjectionMatrix();
            renderer.setViewport(halfW, halfH, w - halfW, h - halfH);
            renderer.setScissor(halfW, halfH, w - halfW, h - halfH);
            renderer.render(scene, birdCam);

            // Bottom-Left: Finish Line Street Cam
            finishCam.aspect = qAspect;
            finishCam.updateProjectionMatrix();
            renderer.setViewport(0, 0, halfW, halfH);
            renderer.setScissor(0, 0, halfW, halfH);
            renderer.render(scene, finishCam);

            // Bottom-Right: Over-the-Shoulder Action Cam (Gold)
            actionCam.aspect = qAspect;
            actionCam.updateProjectionMatrix();
            renderer.setViewport(halfW, 0, w - halfW, halfH);
            renderer.setScissor(halfW, 0, w - halfW, halfH);
            renderer.render(scene, actionCam);

            renderer.setScissorTest(false);
            return;
          }

          // '1' Single full-screen Chase Drone
          camera.aspect = w / Math.max(1, h);
          camera.updateProjectionMatrix();
          renderer.setScissorTest(false);
          renderer.setViewport(0, 0, w, h);
          renderer.render(scene, camera);
          return;
        } else {
          detailedAvatar.group.visible = false;
          instBodies.count = 0;
          instHeads.count = 0;
          goldRing.visible = false;
          if (targetPos) {
            camera.position.set(targetPos[0] + 18, 26, targetPos[2] + 22);
            camera.lookAt(targetPos[0], 2, targetPos[2]);
          }
        }
      }

      const fullW = container.clientWidth || 640;
      const fullH = container.clientHeight || 360;
      camera.aspect = fullW / Math.max(1, fullH);
      camera.updateProjectionMatrix();
      renderer.setScissorTest(false);
      renderer.setViewport(0, 0, fullW, fullH);
      renderer.render(scene, camera);
    };

    rafId = requestAnimationFrame(animate);

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      ro.disconnect();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      renderer.dispose();
    };
  }, [townSeed, schoolId, lowPower]);

  return (
    <div className={`w-full h-full relative overflow-hidden ${className}`}>
      <div ref={containerRef} className="w-full h-full" />

      {/* Broadcast Split-Screen Dividers & Camera Labels during HOST_REPLAY */}
      {mode === 'HOST_REPLAY' && replayLayout === '2' && (
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-y-0 left-1/2 w-0.5 bg-white/50 shadow" />
          <span className="absolute bottom-2.5 left-3 px-2.5 py-1 rounded-lg bg-slate-950/75 text-white text-[11px] font-black tracking-wide backdrop-blur">
            🚁 CHASE DRONE (🥇 1ST)
          </span>
          <span className="absolute bottom-2.5 left-[calc(50%+12px)] px-2.5 py-1 rounded-lg bg-slate-950/75 text-white text-[11px] font-black tracking-wide backdrop-blur">
            🦅 TOWN BIRD&apos;S-EYE
          </span>
        </div>
      )}

      {mode === 'HOST_REPLAY' && replayLayout === '4' && (
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-y-0 left-1/2 w-0.5 bg-white/50 shadow" />
          <div className="absolute inset-x-0 top-1/2 h-0.5 bg-white/50 shadow" />
          <span className="absolute bottom-[calc(50%+8px)] left-3 px-2 py-0.5 rounded-lg bg-slate-950/75 text-white text-[10px] font-black backdrop-blur">
            🚁 CHASE DRONE (🥇 1ST)
          </span>
          <span className="absolute bottom-[calc(50%+8px)] left-[calc(50%+10px)] px-2 py-0.5 rounded-lg bg-slate-950/75 text-white text-[10px] font-black backdrop-blur">
            🦅 TOWN BIRD&apos;S-EYE
          </span>
          <span className="absolute bottom-2 left-3 px-2 py-0.5 rounded-lg bg-slate-950/75 text-white text-[10px] font-black backdrop-blur">
            🏁 FINISH LINE CAM
          </span>
          <span className="absolute bottom-2 left-[calc(50%+10px)] px-2 py-0.5 rounded-lg bg-slate-950/75 text-white text-[10px] font-black backdrop-blur">
            🏃 ACTION CAM (🥇 1ST)
          </span>
        </div>
      )}
    </div>
  );
};
