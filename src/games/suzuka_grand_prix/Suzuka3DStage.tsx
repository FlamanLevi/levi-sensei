import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import {
  createClassroomRenderer,
  createRoomEnvironmentPMREM,
  disposeObject3D,
} from '@/utils/classroom3d';
import {
  buildSuzuka3DTrack,
  SuzukaTrackWorld,
  getSuzukaCornerSpeedLimit,
  getSuzukaSignedCurvature,
  SUZUKA_CIRCUIT_LENGTH_METERS,
} from './engine/Suzuka3DEngine';
import {
  selectBestPassingLane,
  computeLateralRepulsionVelocity,
  computeKartVisualSteering,
  findBestOvertakeBattleCandidate,
  SUZUKA_SAFE_LANE_LIMIT_M,
  type LanePlannerRacerSnapshot,
  type LaneDecisionResult,
  type KartVisualSteeringResult,
  type BattleCandidate,
} from './engine/suzukaPhysics';
import {
  SuzukaInstancedKartLayer,
  type InstancedKartFrameState,
} from './engine/SuzukaInstancedKartLayer';
import { SuzukaSector } from './engine/SuzukaPathData';
import {
  SuzukaTrackThemeId,
  SuzukaTrackThemeConfig,
  SuzukaTimeOfDayId,
  SuzukaCloudCoverId,
  SuzukaPrecipitationId,
  getTrackTheme,
  evaluateSuzukaAtmosphere,
  getLeMansPhaseBadge,
} from './trackThemes';

export const LANE_DRIVING = -2.1; // Legacy left lane export kept for caller compatibility
export const LANE_PASSING = 2.1;  // Legacy right lane export kept for caller compatibility
const GRID_LANES_3WIDE = [-2.5, 0.0, 2.5] as const;

export interface RacerState {
  id: string;
  name: string;
  number: number;
  teamId?: string;
  colorHex: number;
  stripeHex?: number;
  rimHex?: number;
  suitHex?: number;
  helmetHex?: number;
  visorHex?: number;
  speedKmh: number;
  targetSpeedKmh: number;
  streak: number;
  isFinished: boolean;
  inPitStop: boolean;
  laneOffset: number;
  isBoosting?: boolean;
  authoritativeDistanceMeters?: number;
}

export interface RacerTelemetry {
  id: string;
  name: string;
  number: number;
  colorHex: number;
  progress: number;
  speedKmh: number;
  cornerSpeedLimit?: number;
  lap: number;
  distanceMeters: number;
  laneOffset: number;
  isPassingLane: boolean;
}

export type CameraViewMode =
  | 'DIRECTOR'
  | 'BATTLE'
  | 'LEADER'
  | 'ISOMETRIC'
  | 'DRONE'
  | 'COCKPIT'
  | 'FIRST_PERSON'
  | 'ORBIT'
  | 'MAIN_STRAIGHT'
  | 'S_CURVES'
  | 'DEGNER'
  | 'HAIRPIN'
  | 'SPOON'
  | 'BRIDGE'
  | '130R'
  | 'CHICANE';

export interface Suzuka3DStageProps {
  mode: 'BROADCAST' | 'STUDENT_COCKPIT';
  cameraMode?: CameraViewMode;
  activeRacerId?: string;
  racers: RacerState[];
  lightsCount?: number; // 0 to 6
  trackTheme?: SuzukaTrackThemeId;
  timeOfDay?: SuzukaTimeOfDayId;
  cloudCover?: SuzukaCloudCoverId;
  precipitation?: SuzukaPrecipitationId;
  targetLaps?: number;
  timeTrialLimitSeconds?: number;
  performanceProfile?: 'MOBILE' | 'DESKTOP_HD';
  onTelemetryUpdate?: (telemetry: RacerTelemetry[]) => void;
  className?: string;
  hideSectorBadge?: boolean;
}

export type Desk3DStageProps = Suzuka3DStageProps;

// Pre-baked 256x256 seamless tileable cloud noise texture (generated once per session)
// Sampling a pre-baked tileable texture twice in the skybox fragment shader costs <0.08ms on iPad GPUs
// compared to expensive per-pixel procedural FBM loops.
let _sharedSkyCloudNoiseTex: THREE.CanvasTexture | null = null;
function getSharedSkyCloudNoiseTexture(): THREE.CanvasTexture {
  if (_sharedSkyCloudNoiseTex) return _sharedSkyCloudNoiseTex;

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const imgData = ctx.createImageData(size, size);
    const data = imgData.data;

    // Periodic hash on torus grid so texture wraps seamlessly in X and Y
    const hash2D = (ix: number, iy: number, period: number, seed: number): number => {
      const wx = ((ix % period) + period) % period;
      const wy = ((iy % period) + period) % period;
      const n = (wx * 374761393 + wy * 668265263 + seed * 1442695041) >>> 0;
      const m = ((n ^ (n >> 13)) * 1274126177) >>> 0;
      return ((m ^ (m >> 16)) >>> 0) / 4294967295;
    };

    const sampleSeamlessLayer = (u: number, v: number, freq: number, seed: number): number => {
      const fx = u * freq;
      const fy = v * freq;
      const x0 = Math.floor(fx);
      const y0 = Math.floor(fy);
      const tx = fx - x0;
      const ty = fy - y0;
      const sx = tx * tx * (3 - 2 * tx);
      const sy = ty * ty * (3 - 2 * ty);

      const n00 = hash2D(x0, y0, freq, seed);
      const n10 = hash2D(x0 + 1, y0, freq, seed);
      const n01 = hash2D(x0, y0 + 1, freq, seed);
      const n11 = hash2D(x0 + 1, y0 + 1, freq, seed);

      const nx0 = n00 + (n10 - n00) * sx;
      const nx1 = n01 + (n11 - n01) * sx;
      return nx0 + (nx1 - nx0) * sy;
    };

    for (let y = 0; y < size; y++) {
      const v = y / size;
      for (let x = 0; x < size; x++) {
        const u = x / size;
        // 4 seamless octaves with zero-mean contrast stretch so bilinear filtering preserves full [0..1] cloud billows
        const oct1 = (sampleSeamlessLayer(u, v, 3, 11) - 0.5) * 2.1;
        const oct2 = (sampleSeamlessLayer(u, v, 6, 23) - 0.5) * 2.0;
        const oct3 = (sampleSeamlessLayer(u, v, 12, 37) - 0.5) * 1.9;
        const oct4 = (sampleSeamlessLayer(u, v, 24, 53) - 0.5) * 1.8;
        const raw1 = 0.5 + oct1 * 0.52 + oct2 * 0.26 + oct3 * 0.14 + oct4 * 0.08;

        const w1 = (sampleSeamlessLayer(u, v, 4, 71) - 0.5) * 2.1;
        const w2 = (sampleSeamlessLayer(u, v, 8, 89) - 0.5) * 2.0;
        const w3 = (sampleSeamlessLayer(u, v, 16, 107) - 0.5) * 1.9;
        const w4 = (sampleSeamlessLayer(u, v, 32, 131) - 0.5) * 1.8;
        const raw2 = 0.5 + w1 * 0.50 + w2 * 0.28 + w3 * 0.14 + w4 * 0.08;

        const idx = (y * size + x) * 4;
        data[idx] = Math.min(255, Math.max(0, Math.round(raw1 * 255)));
        data[idx + 1] = Math.min(255, Math.max(0, Math.round(raw2 * 255)));
        data[idx + 2] = 255;
        data[idx + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.userData = { isSharedResource: true };
  _sharedSkyCloudNoiseTex = tex;
  return tex;
}

function createDynamicSkyDome(theme: SuzukaTrackThemeConfig) {
  const skyGeo = new THREE.SphereGeometry(2600, 32, 20);
  const skyUniforms = {
    uTime: { value: 0.0 },
    uCloudTex: { value: getSharedSkyCloudNoiseTexture() },
    uSunDir: { value: new THREE.Vector3(...theme.sunDir).normalize() },
    uZenithColor: { value: new THREE.Color(theme.zenithHex) },
    uMidSkyColor: { value: new THREE.Color(theme.midSkyHex) },
    uHorizonColor: { value: new THREE.Color(theme.horizonHex) },
    uSunColor: { value: new THREE.Color(theme.sunColorHex) },
    uCloudShadowColor: { value: new THREE.Color(theme.cloudShadowHex) },
    uCloudLitColor: { value: new THREE.Color(theme.cloudLitHex) },
    uStarIntensity: { value: theme.starIntensity },
    uCloudCoverage: { value: 0.52 },
  };

  const skyMat = new THREE.ShaderMaterial({
    uniforms: skyUniforms,
    side: THREE.BackSide,
    depthWrite: false,
    toneMapped: false,
    vertexShader: /* glsl */ `
      varying vec3 vWorldDir;
      void main() {
        vWorldDir = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform sampler2D uCloudTex;
      uniform vec3 uSunDir;
      uniform vec3 uZenithColor;
      uniform vec3 uMidSkyColor;
      uniform vec3 uHorizonColor;
      uniform vec3 uSunColor;
      uniform vec3 uCloudShadowColor;
      uniform vec3 uCloudLitColor;
      uniform float uStarIntensity;
      uniform float uCloudCoverage;
      varying vec3 vWorldDir;

      void main() {
        vec3 dir = normalize(vWorldDir);
        float elev = clamp(dir.y, 0.0, 1.0);

        // 1. Atmospheric Zenith -> Mid-Sky -> Horizon Gradient
        vec3 skyCol = mix(uHorizonColor, uMidSkyColor, smoothstep(0.0, 0.24, elev));
        skyCol = mix(skyCol, uZenithColor, smoothstep(0.20, 0.85, elev));

        // 2. Solar / Lunar Disc & Mie Atmospheric Glow
        float sunCos = max(dot(dir, uSunDir), 0.0);
        float sunVis = 1.0 - smoothstep(0.55, 0.92, uCloudCoverage) * 0.72;
        float sunHalo = pow(sunCos, 8.0) * 0.26 + pow(sunCos, 64.0) * 0.45;
        float sunDisc = smoothstep(0.9982, 0.9994, sunCos);
        skyCol += uSunColor * (sunHalo + sunDisc * 0.85) * sunVis;

        // 3. Lightweight Procedural Starfield & Cloud Layer (0 extra draw calls)
        float cloudOcclusion = 0.0;
        vec3 cloudLayerColor = vec3(0.0);
        float finalCloudAlpha = 0.0;

        if (elev > 0.005 && uCloudCoverage > 0.01) {
          // Spherical-dome UV mapping that stays crisp from low horizon (elev=0.02) to zenith
          vec2 domeUv = dir.xz / (elev + 0.32) * 0.55;

          vec2 uvLayer1 = domeUv + vec2(uTime * 0.0065, uTime * 0.0025);
          vec2 uvLayer2 = domeUv * 1.65 + vec2(-uTime * 0.0038, uTime * 0.0042);

          float c1 = texture2D(uCloudTex, uvLayer1).r;
          float c2 = texture2D(uCloudTex, uvLayer2).g;
          float cloudDensity = c1 * 0.64 + c2 * 0.36;

          // Dynamic cloud coverage threshold: CLEAR (0.08) -> PARTLY_CLOUDY (0.52) -> OVERCAST (0.88)
          float lowThresh = mix(0.66, 0.22, uCloudCoverage);
          float highThresh = mix(0.84, 0.50, uCloudCoverage);
          float cloudMask = smoothstep(lowThresh, highThresh, cloudDensity);
          // Smooth fade at the horizon line so clouds sit naturally behind mountain peaks
          float zenithOpenness = 0.35 * (1.0 - uCloudCoverage * 0.75);
          float horizonFade = smoothstep(0.008, 0.085, elev) * (1.0 - smoothstep(0.76, 0.96, elev) * zenithOpenness);
          finalCloudAlpha = cloudMask * horizonFade * mix(0.28, 0.96, uCloudCoverage);
          cloudOcclusion = finalCloudAlpha;

          // Sunlit highlight & atmospheric shadow cloud shading
          vec3 cloudLit = mix(uCloudLitColor, uSunColor, pow(sunCos, 3.0) * 0.52);
          float highlightFactor = smoothstep(0.48, 0.72, c1);
          cloudLayerColor = mix(uCloudShadowColor, cloudLit, highlightFactor);
        }

        if (uStarIntensity > 0.01 && elev > 0.015) {
          vec2 starGrid = floor((dir.xz / (elev + 0.45)) * 165.0);
          float starSeed = fract(sin(dot(starGrid, vec2(127.1, 311.7))) * 43758.5453);
          if (starSeed > 0.986) {
            vec2 starCellUv = fract((dir.xz / (elev + 0.45)) * 165.0) - 0.5;
            float distToCenter = length(starCellUv);
            float twinkle = 0.68 + 0.32 * sin(uTime * 2.4 + starSeed * 62.8);
            float starDot = smoothstep(0.32, 0.04, distToCenter) * twinkle;
            float elevFade = smoothstep(0.02, 0.16, elev);
            vec3 starTint = mix(vec3(0.85, 0.93, 1.0), vec3(1.0, 0.95, 0.82), fract(starSeed * 19.3));
            skyCol += starTint * starDot * uStarIntensity * elevFade * (1.0 - cloudOcclusion * 0.92);
          }
        }

        if (finalCloudAlpha > 0.001) {
          skyCol = mix(skyCol, cloudLayerColor, finalCloudAlpha);
        }

        gl_FragColor = vec4(skyCol, 1.0);
      }
    `,
  });

  const mesh = new THREE.Mesh(skyGeo, skyMat);
  mesh.name = 'SuzukaDynamicSkyDome';
  mesh.frustumCulled = false;
  mesh.renderOrder = -1000;
  return { mesh, uniforms: skyUniforms, geometry: skyGeo, material: skyMat };
}

interface PrecipitationSystem {
  mesh: THREE.Object3D;
  uniforms: {
    uTime: { value: number };
    uCameraPos: { value: THREE.Vector3 };
    uOpacity: { value: number };
  };
  dispose: () => void;
}

/**
 * 1-Draw-Call Camera-Anchored GPU Precipitation System (Rain Streaks or Snowflakes).
 * Wraps particles around `uCameraPos` inside the vertex shader (`mod(pos - uCameraPos, boxSize)`)
 * so 0 CPU particle updates occur per frame on classroom iPads and Intel Dynabooks.
 */
function createPrecipitationSystem(
  precipitation: SuzukaPrecipitationId | undefined,
  isStudentView: boolean
): PrecipitationSystem | null {
  if (!precipitation || precipitation === 'NONE') return null;

  const isRain = precipitation === 'LIGHT_RAIN' || precipitation === 'HEAVY_RAIN';
  const isHeavy = precipitation === 'HEAVY_RAIN' || precipitation === 'HEAVY_SNOW';
  const count = isStudentView
    ? isHeavy
      ? 1100
      : 550
    : isHeavy
    ? 1800
    : 850;

  const uniforms = {
    uTime: { value: 0.0 },
    uCameraPos: { value: new THREE.Vector3() },
    uOpacity: { value: isHeavy ? 0.82 : 0.56 },
  };

  let rng = 987654321;
  const nextRand = () => {
    rng = (rng * 1664525 + 1013904223) >>> 0;
    return rng / 4294967296;
  };

  if (isRain) {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 2 * 3);
    const offsets = new Float32Array(count * 2 * 3);
    const streakLen = isHeavy ? 1.85 : 1.35;

    for (let i = 0; i < count; i++) {
      const px = (nextRand() - 0.5) * 90.0;
      const py = (nextRand() - 0.5) * 38.0;
      const pz = (nextRand() - 0.5) * 90.0;
      const v0 = i * 6;
      positions[v0 + 0] = px;
      positions[v0 + 1] = py;
      positions[v0 + 2] = pz;
      positions[v0 + 3] = px;
      positions[v0 + 4] = py;
      positions[v0 + 5] = pz;

      offsets[v0 + 0] = 0;
      offsets[v0 + 1] = 0;
      offsets[v0 + 2] = 0;
      offsets[v0 + 3] = -0.18 * streakLen;
      offsets[v0 + 4] = -streakLen;
      offsets[v0 + 5] = -0.12 * streakLen;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aDropOffset', new THREE.BufferAttribute(offsets, 3));

    const mat = new THREE.ShaderMaterial({
      uniforms,
      transparent: true,
      depthWrite: false,
      vertexShader: /* glsl */ `
        attribute vec3 aDropOffset;
        uniform float uTime;
        uniform vec3 uCameraPos;
        varying float vAlpha;

        void main() {
          vec3 boxSize = vec3(90.0, 38.0, 90.0);
          vec3 halfBox = boxSize * 0.5;
          vec3 animOffset = vec3(-uTime * 3.4, -uTime * 29.0, -uTime * 2.2);
          vec3 rel = mod(position + animOffset - uCameraPos + halfBox, boxSize) - halfBox;
          vec3 worldPos = uCameraPos + rel + aDropOffset;
          float distXZ = length(rel.xz);
          float edgeFade = 1.0 - smoothstep(30.0, 44.0, distXZ);
          float tipAlpha = aDropOffset.y < -0.1 ? 0.92 : 0.18;
          vAlpha = edgeFade * tipAlpha;
          gl_Position = projectionMatrix * viewMatrix * vec4(worldPos, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uOpacity;
        varying float vAlpha;

        void main() {
          gl_FragColor = vec4(0.78, 0.88, 0.98, vAlpha * uOpacity);
        }
      `,
    });

    const lines = new THREE.LineSegments(geo, mat);
    lines.name = 'SuzukaRainPrecipitation';
    lines.frustumCulled = false;
    lines.renderOrder = 200;
    return {
      mesh: lines,
      uniforms,
      dispose: () => {
        geo.dispose();
        mat.dispose();
      },
    };
  } else {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const flakeMeta = new Float32Array(count * 2);

    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = (nextRand() - 0.5) * 90.0;
      positions[i * 3 + 1] = (nextRand() - 0.5) * 36.0;
      positions[i * 3 + 2] = (nextRand() - 0.5) * 90.0;

      flakeMeta[i * 2 + 0] = nextRand() * Math.PI * 2.0;
      flakeMeta[i * 2 + 1] = 0.65 + nextRand() * 0.75;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aFlakeMeta', new THREE.BufferAttribute(flakeMeta, 2));

    const mat = new THREE.ShaderMaterial({
      uniforms,
      transparent: true,
      depthWrite: false,
      vertexShader: /* glsl */ `
        attribute vec2 aFlakeMeta;
        uniform float uTime;
        uniform vec3 uCameraPos;
        varying float vAlpha;

        void main() {
          float phase = aFlakeMeta.x;
          float sizeScale = aFlakeMeta.y;
          vec3 boxSize = vec3(90.0, 36.0, 90.0);
          vec3 halfBox = boxSize * 0.5;
          vec3 fallOffset = vec3(
            sin(uTime * 1.35 + phase) * 2.4 - uTime * 1.2,
            -uTime * 4.8,
            cos(uTime * 1.15 + phase * 1.7) * 2.4 - uTime * 0.9
          );
          vec3 rel = mod(position + fallOffset - uCameraPos + halfBox, boxSize) - halfBox;
          vec3 worldPos = uCameraPos + rel;
          vec4 mvPosition = viewMatrix * vec4(worldPos, 1.0);
          float dist = max(1.5, -mvPosition.z);
          gl_PointSize = clamp((125.0 * sizeScale) / dist, 2.5, 11.5);
          float distXZ = length(rel.xz);
          vAlpha = 1.0 - smoothstep(30.0, 44.0, distXZ);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uOpacity;
        varying float vAlpha;

        void main() {
          vec2 uv = gl_PointCoord - vec2(0.5);
          float d = length(uv);
          if (d > 0.5) discard;
          float soft = smoothstep(0.5, 0.12, d);
          gl_FragColor = vec4(0.96, 0.98, 1.0, soft * vAlpha * uOpacity);
        }
      `,
    });

    const points = new THREE.Points(geo, mat);
    points.name = 'SuzukaSnowPrecipitation';
    points.frustumCulled = false;
    points.renderOrder = 200;
    return {
      mesh: points,
      uniforms,
      dispose: () => {
        geo.dispose();
        mat.dispose();
      },
    };
  }
}

/**
 * 1-Draw-Call GPU Celebration Fireworks System over the Main Straight & Ferris Wheel.
 * Zero per-frame CPU particle iteration; spherical burst physics + gravity run entirely in the vertex shader.
 */
function createFireworksSystem(anchorPos: THREE.Vector3) {
  const shells = [
    { offset: [0, 36, -24], color: [1.0, 0.85, 0.24], phase: 0.0 },
    { offset: [-38, 44, 18], color: [1.0, 0.24, 0.68], phase: 0.15 },
    { offset: [36, 42, 22], color: [0.15, 0.94, 1.0], phase: 0.30 },
    { offset: [-24, 54, -44], color: [0.28, 1.0, 0.52], phase: 0.45 },
    { offset: [30, 48, -14], color: [1.0, 0.42, 0.14], phase: 0.60 },
    { offset: [-58, 39, -10], color: [0.72, 0.36, 1.0], phase: 0.75 },
    { offset: [56, 46, -34], color: [1.0, 0.18, 0.32], phase: 0.90 },
    { offset: [-12, 60, 8], color: [1.0, 0.92, 0.45], phase: 1.05 },
    { offset: [48, 38, 42], color: [0.22, 0.82, 1.0], phase: 1.20 },
    { offset: [-48, 50, 38], color: [1.0, 0.55, 0.18], phase: 1.35 },
    { offset: [14, 56, -54], color: [0.95, 0.28, 0.88], phase: 1.50 },
    { offset: [-32, 34, -58], color: [0.35, 1.0, 0.75], phase: 1.65 },
    { offset: [24, 62, 20], color: [1.0, 0.78, 0.18], phase: 1.80 },
    { offset: [0, 46, 48], color: [1.0, 0.32, 0.52], phase: 1.95 },
  ];
  const sparksPerShell = 140;
  const totalSparks = shells.length * sparksPerShell;

  const positions = new Float32Array(totalSparks * 3);
  const velocities = new Float32Array(totalSparks * 3);
  const colors = new Float32Array(totalSparks * 3);
  const phases = new Float32Array(totalSparks);

  let seed = 7919;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  let idx = 0;
  for (const sh of shells) {
    const cx = anchorPos.x + sh.offset[0];
    const cy = anchorPos.y + sh.offset[1];
    const cz = anchorPos.z + sh.offset[2];
    for (let s = 0; s < sparksPerShell; s++) {
      const u = rand();
      const v = rand();
      const theta = u * Math.PI * 2;
      const phi = Math.acos(2 * v - 1);
      // Dual-layer chrysanthemum burst: outer high-velocity peony ring + bright inner pistil core
      const isInnerCore = s < 36;
      const speed = isInnerCore ? 6.5 + rand() * 5.5 : 13.5 + rand() * 10.5;

      positions[idx * 3 + 0] = cx;
      positions[idx * 3 + 1] = cy;
      positions[idx * 3 + 2] = cz;

      velocities[idx * 3 + 0] = Math.sin(phi) * Math.cos(theta) * speed;
      velocities[idx * 3 + 1] = Math.cos(phi) * speed;
      velocities[idx * 3 + 2] = Math.sin(phi) * Math.sin(theta) * speed;

      const cJitter = 0.9 + rand() * 0.25;
      if (isInnerCore) {
        // Hot golden-white inner pistil sparks
        colors[idx * 3 + 0] = Math.min(1, (sh.color[0] * 0.45 + 0.55) * cJitter);
        colors[idx * 3 + 1] = Math.min(1, (sh.color[1] * 0.45 + 0.52) * cJitter);
        colors[idx * 3 + 2] = Math.min(1, (sh.color[2] * 0.45 + 0.42) * cJitter);
      } else {
        colors[idx * 3 + 0] = Math.min(1, sh.color[0] * cJitter);
        colors[idx * 3 + 1] = Math.min(1, sh.color[1] * cJitter);
        colors[idx * 3 + 2] = Math.min(1, sh.color[2] * cJitter);
      }

      phases[idx] = sh.phase + rand() * 0.05;
      idx++;
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aVelocity', new THREE.BufferAttribute(velocities, 3));
  geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
  geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

  const uniforms = {
    uTime: { value: 0 },
    uActive: { value: 0 },
  };

  const mat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      attribute vec3 aVelocity;
      attribute vec3 aColor;
      attribute float aPhase;
      uniform float uTime;
      uniform float uActive;
      varying vec3 vColor;
      varying float vAlpha;

      void main() {
        vColor = aColor;
        float cycle = mod(uTime * 1.45 + aPhase, 2.1);
        float life = clamp(cycle / 1.75, 0.0, 1.0);
        vec3 burstPos = position + aVelocity * (cycle * (1.0 - 0.22 * life));
        burstPos.y -= 3.6 * cycle * cycle;
        vec4 mvPosition = modelViewMatrix * vec4(burstPos, 1.0);
        float dist = max(2.0, -mvPosition.z);
        float flash = smoothstep(0.22, 0.0, life) * 1.5;
        gl_PointSize = clamp(((340.0 + flash * 160.0) * (1.0 - life * 0.45)) / dist, 4.0, 24.0);
        float fadeIn = smoothstep(0.0, 0.05, life);
        float fadeOut = 1.0 - smoothstep(0.52, 1.0, life);
        vAlpha = uActive * fadeIn * fadeOut * step(cycle, 1.75);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      varying float vAlpha;

      void main() {
        if (vAlpha <= 0.01) discard;
        vec2 uv = gl_PointCoord - vec2(0.5);
        float d = length(uv);
        if (d > 0.5) discard;
        float core = smoothstep(0.5, 0.04, d);
        vec3 hotColor = mix(vColor * 1.45, vec3(1.0, 0.98, 0.92), core * 0.62);
        gl_FragColor = vec4(hotColor, core * min(1.0, vAlpha * 1.35));
      }
    `,
  });

  const points = new THREE.Points(geo, mat);
  points.name = 'SuzukaFinishFireworks';
  points.frustumCulled = false;
  points.visible = false;
  points.renderOrder = 195;

  return {
    mesh: points,
    uniforms,
    dispose: () => {
      geo.dispose();
      mat.dispose();
    },
  };
}

const Suzuka3DStageComponent: React.FC<Suzuka3DStageProps> = ({
  mode,
  cameraMode = 'DIRECTOR',
  activeRacerId,
  racers,
  lightsCount = 6,
  trackTheme,
  timeOfDay,
  cloudCover,
  precipitation,
  targetLaps = 2,
  timeTrialLimitSeconds,
  performanceProfile,
  onTelemetryUpdate,
  className = '',
  hideSectorBadge = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [contextRestartKey, setContextRestartKey] = useState<number>(0);

  // Direct DOM refs for 60Hz HUD updates (zero React re-renders, zero backdrop-blur)
  const sectorContainerRef = useRef<HTMLDivElement>(null);
  const sectorEmojiRef = useRef<HTMLSpanElement>(null);
  const sectorEnRef = useRef<HTMLSpanElement>(null);
  const sectorJaRef = useRef<HTMLSpanElement>(null);
  const sectorPhraseRef = useRef<HTMLSpanElement>(null);

  const directorBadgeContainerRef = useRef<HTMLDivElement>(null);
  const directorBadgeTextRef = useRef<HTMLSpanElement>(null);

  const racersRef = useRef<RacerState[]>(racers);
  racersRef.current = racers;

  const cameraModeRef = useRef<CameraViewMode>(cameraMode);
  cameraModeRef.current = cameraMode;

  const activeRacerIdRef = useRef<string | undefined>(activeRacerId);
  activeRacerIdRef.current = activeRacerId;

  const lightsCountRef = useRef<number>(lightsCount);
  lightsCountRef.current = lightsCount;

  const timeOfDayRef = useRef<SuzukaTimeOfDayId | undefined>(timeOfDay);
  timeOfDayRef.current = timeOfDay;

  const cloudCoverRef = useRef<SuzukaCloudCoverId | undefined>(cloudCover);
  cloudCoverRef.current = cloudCover;

  const precipitationRef = useRef<SuzukaPrecipitationId | undefined>(precipitation);
  precipitationRef.current = precipitation;

  const targetLapsRef = useRef<number>(targetLaps);
  targetLapsRef.current = targetLaps;

  const timeTrialLimitSecondsRef = useRef<number | undefined>(timeTrialLimitSeconds);
  timeTrialLimitSecondsRef.current = timeTrialLimitSeconds;

  const onTelemetryRef = useRef(onTelemetryUpdate);
  onTelemetryRef.current = onTelemetryUpdate;

  const sceneRef = useRef<THREE.Scene | null>(null);
  const precipSystemRef = useRef<PrecipitationSystem | null>(null);

  const activeTheme = getTrackTheme(trackTheme);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let isDisposed = false;
    let rafId = 0;
    let timeoutId = 0;

    // Resolve biome/atmosphere theme configuration
    const theme = getTrackTheme(trackTheme);

    // Hardware profile detection & adaptive renderer setup (zero redundant temp canvases)
    const isStudentView = performanceProfile === 'MOBILE' || mode === 'STUDENT_COCKPIT';

    // 1. Scene, Camera & Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(theme.sceneBackgroundHex);
    scene.fog = new THREE.FogExp2(theme.fogHex, theme.fogDensity);
    sceneRef.current = scene;

    // Dynamic Skybox with dual-layer cloud animation & optional night starfield (1 draw call, <0.08ms GPU cost)
    const skyDome = createDynamicSkyDome(theme);
    scene.add(skyDome.mesh);

    const {
      renderer,
      camera,
      gpuProfile,
      trackFrameRate,
      cleanup: cleanupClassroomRenderer,
    } = createClassroomRenderer(container, {
      fov: 54,
      near: 0.1,
      far: 3200.0,
      isStudentView,
      enableDrs: true,
      toneMappingExposure: theme.exposure,
      onContextLost: () => {
        console.warn('[Suzuka3DStage] WebGL context lost; default prevented to allow GPU restoration.');
      },
      onContextRestored: () => {
        console.info('[Suzuka3DStage] WebGL context restored; restarting 3D stage cleanly.');
        setContextRestartKey((k) => k + 1);
      },
    });
    const isSoftwareGl = gpuProfile.isSoftware;

    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const domElement = renderer.domElement;
    domElement.style.display = 'block';
    domElement.style.backgroundColor = '#020617';

    // Studio Environment Map via classroom3d helper (auto-disposes RoomEnvironment + PMREMGenerator)
    const envHandle = createRoomEnvironmentPMREM(renderer, 0.04);
    scene.environment = envHandle.texture;
    scene.environmentIntensity = 1.0;

    // Biome-tuned Sunlight / Moonlight & Sky Ambient Contrast
    const hemiLight = new THREE.HemisphereLight(theme.hemiSkyHex, theme.hemiGroundHex, theme.hemiIntensity);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(theme.dirColorHex, theme.dirIntensity);
    dirLight.position.set(theme.sunDir[0], theme.sunDir[1], theme.sunDir[2]);
    dirLight.castShadow = gpuProfile.enableDynamicShadows;
    if (gpuProfile.enableDynamicShadows) {
      dirLight.shadow.mapSize.width = gpuProfile.shadowMapRes;
      dirLight.shadow.mapSize.height = gpuProfile.shadowMapRes;
      dirLight.shadow.camera.near = 10;
      dirLight.shadow.camera.far = 1100;
      const d = 420;
      dirLight.shadow.camera.left = -d;
      dirLight.shadow.camera.right = d;
      dirLight.shadow.camera.top = d;
      dirLight.shadow.camera.bottom = -d;
      dirLight.shadow.bias = -0.0005;
      dirLight.shadow.normalBias = 0.02;
    }
    scene.add(dirLight);

    // Build Suzuka 3D Track
    const trackWorld: SuzukaTrackWorld = buildSuzuka3DTrack(theme.id);
    scene.add(trackWorld.root);
    const totalCircuitLength = trackWorld.totalLengthMeters || SUZUKA_CIRCUIT_LENGTH_METERS;

    // 1-Draw-Call GPU Celebration Fireworks over Main Straight / Start-Finish Gantry
    const finishAnchor = trackWorld.samples[0]?.position || new THREE.Vector3(0, 0, 0);
    const fireworksSystem = createFireworksSystem(finishAnchor);
    scene.add(fireworksSystem.mesh);

    // Unified 40-Kart Instanced Fleet (~8–12 draw calls total for all classroom karts!)
    const kartLayer = new SuzukaInstancedKartLayer(40);
    scene.add(kartLayer.root);

    interface KartInstance extends InstancedKartFrameState {
      distanceMeters: number;
      speedKmh: number;
      laneOffset: number;
      targetLane: number;
      laneLockTimer: number;
      isOvertaking: boolean;
      smoothedLatVel: number;
      smoothedSteerInput: number;
      boxedInCapKmh: number;
      lastAuthoritativeDist?: number;
      catchUpSpeedMs: number;
    }
    const kartMap = new Map<string, KartInstance>();
    const _activeRacerIdSet = new Set<string>();
    let lastSyncedRacers: RacerState[] | null = null;

    const createKartInstance = (racer: RacerState, index: number): KartInstance => {
      const gridOffset = -3.5 - index * 4.2;
      const gridLane = GRID_LANES_3WIDE[index % GRID_LANES_3WIDE.length];
      return {
        visible: true,
        number: racer.number,
        colorHex: racer.colorHex,
        stripeHex: racer.stripeHex ?? 0xffffff,
        rimHex: racer.rimHex ?? 0xffbb44,
        suitHex: racer.suitHex ?? 0xf0f4fa,
        helmetHex: racer.helmetHex ?? 0xffffff,
        visorHex: racer.visorHex ?? 0x1e6bff,
        position: new THREE.Vector3(),
        quaternion: new THREE.Quaternion(),
        speedMs: 0,
        steerInput: 0,
        driftAngle: 0,
        isBoosting: false,
        isBraking: false,
        wheelSpinRad: 0,
        frontSteerRad: 0,
        chassisYawRad: 0,
        chassisRollRad: 0,
        distanceMeters:
          racer.authoritativeDistanceMeters !== undefined
            ? racer.authoritativeDistanceMeters
            : gridOffset,
        speedKmh: 0,
        laneOffset: gridLane,
        targetLane: gridLane,
        laneLockTimer: 0,
        isOvertaking: false,
        smoothedLatVel: 0,
        smoothedSteerInput: 0,
        boxedInCapKmh: 999,
        lastAuthoritativeDist: racer.authoritativeDistanceMeters,
        catchUpSpeedMs: 0,
      };
    };

    const syncKartRoster = (currentRacers: RacerState[]) => {
      _activeRacerIdSet.clear();
      for (let i = 0; i < currentRacers.length; i++) {
        const racer = currentRacers[i];
        _activeRacerIdSet.add(racer.id);
        let inst = kartMap.get(racer.id);
        if (!inst) {
          inst = createKartInstance(racer, i);
          kartMap.set(racer.id, inst);
        } else {
          inst.number = racer.number;
          inst.colorHex = racer.colorHex;
          inst.stripeHex = racer.stripeHex ?? 0xffffff;
          inst.rimHex = racer.rimHex ?? 0xffbb44;
          inst.suitHex = racer.suitHex ?? 0xf0f4fa;
          inst.helmetHex = racer.helmetHex ?? 0xffffff;
          inst.visorHex = racer.visorHex ?? 0x1e6bff;
        }
      }
      for (const id of kartMap.keys()) {
        if (!_activeRacerIdSet.has(id)) {
          kartMap.delete(id);
        }
      }
      lastSyncedRacers = currentRacers;
    };

    syncKartRoster(racersRef.current);

    // Pre-allocated scratch objects (0 GC inside 60Hz animation loop)
    const currentCamPos = new THREE.Vector3(0, 35, 90);
    const targetCamPos = new THREE.Vector3();
    const currentCamLook = new THREE.Vector3(0, 0, 0);
    const targetCamLook = new THREE.Vector3();
    const _packCentroid = new THREE.Vector3();
    const _telemetryPool: RacerTelemetry[] = [];
    const _sortedTelemetry: RacerTelemetry[] = [];
    const _frameKarts: InstancedKartFrameState[] = [];
    const _plannerSnapshots: LanePlannerRacerSnapshot[] = [];
    const _plannerResult: LaneDecisionResult = {
      targetLane: 0,
      isActivelyOvertaking: false,
      isBoxedInAhead: false,
      blockingSpeedKmh: 180,
    };
    const _laneInput = {
      selfIndex: 0,
      racers: _plannerSnapshots,
      racerCount: 0,
      circuitLengthMeters: totalCircuitLength,
      signedCurvature: 0,
      laneLockRemainingSec: 0,
      outResult: _plannerResult,
    };
    const _repulsionInput = {
      selfIndex: 0,
      racers: _plannerSnapshots,
      racerCount: 0,
      circuitLengthMeters: totalCircuitLength,
    };
    const _steerResult: KartVisualSteeringResult = {
      laneYawRad: 0,
      steerInput: 0,
      driftAngle: 0,
    };
    const _steerInput = {
      speedKmh: 0,
      lateralVelMs: 0,
      signedCurvature: 0,
      outResult: _steerResult,
    };
    const _kartYawQuat = new THREE.Quaternion();
    const _kartUpAxis = new THREE.Vector3(0, 1, 0);
    const compareTelemetryDesc = (a: RacerTelemetry, b: RacerTelemetry): number =>
      b.distanceMeters - a.distanceMeters;
    camera.position.copy(currentCamPos);

    type LandmarkCamId =
      | 'MAIN_STRAIGHT'
      | 'S_CURVES'
      | 'DEGNER'
      | 'HAIRPIN'
      | 'SPOON'
      | 'BRIDGE'
      | '130R'
      | 'CHICANE';

    const LANDMARK_CAM_SPECS: Record<
      LandmarkCamId,
      { t: number; label: string; rightOffset: number; upOffset: number; backOffset: number }
    > = {
      MAIN_STRAIGHT: { t: 0.01, label: '🏁 Main Straight & Grandstand', rightOffset: -9, upOffset: 6.2, backOffset: -22 },
      S_CURVES:      { t: 0.21, label: '🐍 S-Curves (Esses)', rightOffset: -26, upOffset: 14, backOffset: -16 },
      DEGNER:        { t: 0.39, label: '🌉 Degner Underpass', rightOffset: 24, upOffset: 10, backOffset: -18 },
      HAIRPIN:       { t: 0.50, label: '🔄 180° Hairpin', rightOffset: 28, upOffset: 14, backOffset: -14 },
      SPOON:         { t: 0.65, label: '🥄 Spoon Curve', rightOffset: -26, upOffset: 14, backOffset: -16 },
      BRIDGE:        { t: 0.78, label: '🌉 Overpass Viaduct', rightOffset: 28, upOffset: 14, backOffset: -16 },
      '130R':        { t: 0.88, label: '💨 130R High-Speed', rightOffset: 22, upOffset: 10, backOffset: -20 },
      CHICANE:       { t: 0.95, label: '🎡 Casio Chicane & Ferris Wheel', rightOffset: -26, upOffset: 13, backOffset: -16 },
    };

    const LANDMARK_LIST = Object.entries(LANDMARK_CAM_SPECS) as [
      LandmarkCamId,
      (typeof LANDMARK_CAM_SPECS)[LandmarkCamId]
    ][];

    function circularFractionDiff(a: number, b: number): number {
      return ((a - b) % 1 + 1.5) % 1 - 0.5;
    }

    function findNearestLandmark(progressNorm: number): LandmarkCamId {
      let bestId: LandmarkCamId = 'MAIN_STRAIGHT';
      let bestDist = 999;
      for (const [id, spec] of LANDMARK_LIST) {
        const d = Math.abs(circularFractionDiff(progressNorm, spec.t));
        if (d < bestDist) {
          bestDist = d;
          bestId = id;
        }
      }
      return bestId;
    }

    function applyLandmarkCamera(
      landmarkId: LandmarkCamId,
      telemetryPool: RacerTelemetry[],
      telemetryCount: number
    ): string {
      const spec = LANDMARK_CAM_SPECS[landmarkId] || LANDMARK_CAM_SPECS.BRIDGE;
      const sampleIdx = Math.floor(spec.t * trackWorld.samples.length) % trackWorld.samples.length;
      const sample = trackWorld.samples[sampleIdx];

      targetCamPos
        .copy(sample.position)
        .addScaledVector(sample.right, spec.rightOffset)
        .addScaledVector(sample.tangent, spec.backOffset);
      targetCamPos.y += spec.upOffset;

      let closestRacer: RacerTelemetry | null = null;
      let minAbsDiff = 0.12;
      for (let i = 0; i < telemetryCount; i++) {
        const r = telemetryPool[i];
        const diff = Math.abs(circularFractionDiff(r.progress, spec.t));
        if (diff < minAbsDiff) {
          minAbsDiff = diff;
          closestRacer = r;
        }
      }

      if (closestRacer) {
        const racerSample = trackWorld.evaluate(closestRacer.progress, closestRacer.laneOffset);
        targetCamLook.copy(sample.position).lerp(racerSample.position, 0.72);
        targetCamLook.y += 1.2;
        return `${spec.label} · #${closestRacer.number} ${closestRacer.name}`;
      } else {
        targetCamLook.copy(sample.position).addScaledVector(sample.tangent, 10);
        targetCamLook.y += 1.0;
        return spec.label;
      }
    }

    type OvertakeBattle = BattleCandidate<RacerTelemetry>;

    function findBestOvertakeBattle(sortedTelemetry: RacerTelemetry[]): OvertakeBattle | null {
      return findBestOvertakeBattleCandidate(sortedTelemetry);
    }

    interface BattleLockState {
      aheadId: string;
      chaserId: string;
      lockedAtSec: number;
      minHoldSec: number;
      maxHoldSec: number;
      angleIndex: number;
      angleTimer: number;
    }
    let battleLock: BattleLockState | null = null;

    let directorTimer = 0;
    let directorPhaseIndex = 0;
    let victoryOrbitAngle = 0;
    let lastCamMode: CameraViewMode | null = null;
    let lastBadgeText = '';
    let lastSectorId: number | null = null;
    let lastLightsCount = -1;
    let frameCount = 0;

    const updateSectorDisplay = (sector: SuzukaSector | null) => {
      if (!sectorContainerRef.current) return;
      if (hideSectorBadge || !sector) {
        if (sectorContainerRef.current.style.display !== 'none') {
          sectorContainerRef.current.style.display = 'none';
        }
        lastSectorId = null;
        return;
      }
      if (sector.id !== lastSectorId) {
        lastSectorId = sector.id;
        if (sectorEmojiRef.current) sectorEmojiRef.current.textContent = sector.emoji;
        if (sectorEnRef.current) sectorEnRef.current.textContent = sector.nameEn;
        if (sectorJaRef.current) sectorJaRef.current.textContent = sector.nameJa;
        if (sectorPhraseRef.current) sectorPhraseRef.current.textContent = `“${sector.eslPhraseEn}”`;
        if (sectorContainerRef.current.style.display !== 'block') {
          sectorContainerRef.current.style.display = 'block';
        }
      }
    };

    const frameBattleCamera = (battle: OvertakeBattle, angleIdx: number = 0): string => {
      const chaserEval = trackWorld.evaluate(battle.chaser.progress, battle.chaser.laneOffset);
      const aheadEval = trackWorld.evaluate(battle.ahead.progress, battle.ahead.laneOffset);
      const midProgress =
        ((((battle.chaser.distanceMeters + battle.ahead.distanceMeters) * 0.5) /
          totalCircuitLength) %
          1 +
          1) %
        1;
      const midLane = (battle.chaser.laneOffset + battle.ahead.laneOffset) * 0.5;
      const midEval = trackWorld.evaluate(midProgress, midLane);

      let angleLabel = 'CHASE';

      if (angleIdx === 1) {
        targetCamPos
          .copy(midEval.position)
          .addScaledVector(midEval.right, -7.2)
          .addScaledVector(midEval.tangent, -2.2);
        targetCamPos.y += 2.3;
        targetCamLook.copy(midEval.position).addScaledVector(midEval.tangent, 3.5);
        targetCamLook.y += 1.1;
        angleLabel = 'SIDE PROFILE (L)';
      } else if (angleIdx === 2) {
        targetCamPos
          .copy(midEval.position)
          .addScaledVector(midEval.right, 7.2)
          .addScaledVector(midEval.tangent, -2.2);
        targetCamPos.y += 2.3;
        targetCamLook.copy(midEval.position).addScaledVector(midEval.tangent, 3.5);
        targetCamLook.y += 1.1;
        angleLabel = 'OUTSIDE CAM (R)';
      } else if (angleIdx === 3) {
        const headOnSide = battle.ahead.laneOffset > 0.8 ? -1.8 : 1.8;
        targetCamPos
          .copy(aheadEval.position)
          .addScaledVector(aheadEval.tangent, 10.5)
          .addScaledVector(aheadEval.right, headOnSide);
        targetCamPos.y += 3.2;
        targetCamLook.copy(chaserEval.position).addScaledVector(chaserEval.tangent, -5.0);
        targetCamLook.y += 1.0;
        angleLabel = 'HEAD-ON DEFENDER';
      } else {
        const backDist = 10.5 + Math.min(8.0, battle.gapMeters * 0.24);
        const heightOffset = 3.9 + Math.min(3.2, battle.gapMeters * 0.08);
        const safeSideOffset =
          midLane > 0.8 ? -2.0 : midLane < -0.8 ? 2.0 : battle.chaser.laneOffset >= 0 ? -1.8 : 1.8;

        targetCamPos
          .copy(chaserEval.position)
          .addScaledVector(chaserEval.tangent, -backDist)
          .addScaledVector(chaserEval.right, safeSideOffset);
        targetCamPos.y += heightOffset;

        targetCamLook
          .copy(aheadEval.position)
          .lerp(chaserEval.position, 0.25)
          .addScaledVector(aheadEval.tangent, 9.0);
        targetCamLook.y += 1.15;
        angleLabel = 'REAR CHASE';
      }

      updateSectorDisplay(aheadEval.sector);
      return `⚔️ BATTLE CAM (${angleLabel}) · P${battle.rankAhead} #${battle.ahead.number} ${battle.ahead.name} vs P${battle.rankAhead + 1} #${battle.chaser.number} ${battle.chaser.name} (${Math.max(1, Math.round(battle.gapMeters))}m)`;
    };

    const frameLeaderCamera = (
      leaderTelem: RacerTelemetry | undefined,
      sortedTelemetry: RacerTelemetry[]
    ): string => {
      const leaderInst = leaderTelem ? kartMap.get(leaderTelem.id) : undefined;
      if (leaderInst && leaderTelem) {
        const evalRes = trackWorld.evaluate(leaderTelem.progress, leaderInst.laneOffset);
        const p2 = sortedTelemetry[1];
        const gapToP2 = p2
          ? Math.max(1, Math.round(leaderTelem.distanceMeters - p2.distanceMeters))
          : null;

        targetCamPos
          .copy(evalRes.position)
          .addScaledVector(evalRes.tangent, 13.0)
          .addScaledVector(evalRes.right, 2.2);
        targetCamPos.y += 3.4;

        targetCamLook.copy(evalRes.position).addScaledVector(evalRes.tangent, -16.0);
        targetCamLook.y += 1.2;

        updateSectorDisplay(evalRes.sector);

        const gapText =
          gapToP2 !== null ? ` · +${gapToP2}m ahead of P2 #${p2.number} ${p2.name}` : '';
        return `🏎️ LEADER CAM · #${leaderTelem.number} ${leaderTelem.name} (${leaderTelem.speedKmh} km/h)${gapText}`;
      }
      return '🏎️ LEADER';
    };

    const framePackHelicopterCamera = (
      sortedTelemetry: RacerTelemetry[],
      elapsedTime: number
    ): string => {
      const packLen = Math.min(4, sortedTelemetry.length);
      if (packLen > 0) {
        _packCentroid.set(0, 0, 0);
        for (let i = 0; i < packLen; i++) {
          const tItem = sortedTelemetry[i];
          const ev = trackWorld.evaluate(tItem.progress, tItem.laneOffset);
          _packCentroid.add(ev.position);
        }
        _packCentroid.divideScalar(packLen);

        const orbitAngle = elapsedTime * 0.22;
        targetCamPos.set(
          _packCentroid.x + Math.cos(orbitAngle) * 68,
          _packCentroid.y + 44,
          _packCentroid.z + Math.sin(orbitAngle) * 68
        );
        targetCamLook.copy(_packCentroid);
        targetCamLook.y += 1.5;
        const leadEval = trackWorld.evaluate(sortedTelemetry[0].progress, 0);
        updateSectorDisplay(leadEval.sector);
        return `🚁 HELICOPTER PACK CAM · Tracking Top ${packLen} Racers`;
      }
      targetCamPos.set(0, 320, 220);
      targetCamLook.set(0, 0, 0);
      return '🚁 HELICOPTER OVERVIEW';
    };

    const clockStartTime = performance.now();
    let clockLastTime = clockStartTime;
    let telemetryTimer = 0;
    let atmoThrottleTimer = 0;
    let greenFlagStartSec: number | null = null;
    let smoothedLeMansProgress = 0;
    let currentNightFactor = 0;
    let currentWeatherSprayMode: 'NONE' | 'RAIN' | 'SNOW' = 'NONE';
    let lastAtmoTimeOfDay: SuzukaTimeOfDayId | undefined;
    let lastAtmoCloudCover: SuzukaCloudCoverId | undefined;
    let lastAtmoPrecip: SuzukaPrecipitationId | undefined;

    const applyEvaluatedAtmosphere = (leMansProgress01: number) => {
      const curTimeOfDay = timeOfDayRef.current;
      const curCloudCover = cloudCoverRef.current;
      const curPrecipProp = precipitationRef.current;
      lastAtmoTimeOfDay = curTimeOfDay;
      lastAtmoCloudCover = curCloudCover;
      lastAtmoPrecip = curPrecipProp;

      const curPrecip = curPrecipProp ?? theme.defaultPrecipitation;
      const atmo = evaluateSuzukaAtmosphere({
        biome: theme.id,
        timeOfDay: curTimeOfDay ?? 'NOON',
        cloudCover: curCloudCover ?? theme.defaultCloudCover,
        precipitation: curPrecip,
        leMansProgress: leMansProgress01,
      });

      currentNightFactor = atmo.nightLightFactor;
      if (curPrecip === 'LIGHT_RAIN' || curPrecip === 'HEAVY_RAIN') {
        currentWeatherSprayMode = 'RAIN';
      } else if (curPrecip === 'LIGHT_SNOW' || curPrecip === 'HEAVY_SNOW' || theme.id === 'SNOW') {
        currentWeatherSprayMode = 'SNOW';
      } else {
        currentWeatherSprayMode = 'NONE';
      }

      skyDome.uniforms.uSunDir.value.set(atmo.sunDir[0], atmo.sunDir[1], atmo.sunDir[2]).normalize();
      skyDome.uniforms.uZenithColor.value.setHex(atmo.zenithHex);
      skyDome.uniforms.uMidSkyColor.value.setHex(atmo.midSkyHex);
      skyDome.uniforms.uHorizonColor.value.setHex(atmo.horizonHex);
      skyDome.uniforms.uSunColor.value.setHex(atmo.sunColorHex);
      skyDome.uniforms.uCloudShadowColor.value.setHex(atmo.cloudShadowHex);
      skyDome.uniforms.uCloudLitColor.value.setHex(atmo.cloudLitHex);
      skyDome.uniforms.uStarIntensity.value = atmo.starIntensity;
      skyDome.uniforms.uCloudCoverage.value = atmo.cloudCoverage;

      (scene.background as THREE.Color).setHex(atmo.sceneBackgroundHex);
      const fog = scene.fog as THREE.FogExp2;
      if (fog) {
        fog.color.setHex(atmo.fogHex);
        fog.density = atmo.fogDensity;
      }

      hemiLight.color.setHex(atmo.hemiSkyHex);
      hemiLight.groundColor.setHex(atmo.hemiGroundHex);
      hemiLight.intensity = atmo.hemiIntensity;

      dirLight.color.setHex(atmo.dirColorHex);
      dirLight.intensity = atmo.dirIntensity;
      dirLight.position.set(atmo.sunDir[0], atmo.sunDir[1], atmo.sunDir[2]);

      renderer.toneMappingExposure = atmo.exposure;
      scene.environmentIntensity = atmo.envIntensity;

      trackWorld.applyAtmosphere?.(atmo);
    };

    applyEvaluatedAtmosphere(0);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }
    setIsLoading(false);

    // Software WebGL fence-sync pacer so headless Chromium screenshot commands never starve
    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (gl && typeof gl.fenceSync === 'function') {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (isDisposed) return;
          const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (state === gl.UNSIGNALED) {
            timeoutId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            timeoutId = window.setTimeout(cb, 80);
          }
        };
        timeoutId = window.setTimeout(poll, 5);
      } else {
        timeoutId = window.setTimeout(cb, 80);
      }
    }

    // -------------------------------------------------------------------------
    // 2. 60 FPS Physics Integration, Adaptive Resolution Governor & Steadicam
    // -------------------------------------------------------------------------
    function tick() {
      if (isDisposed) return;
      frameCount++;

      const nowMs = performance.now();
      const rawDt = (nowMs - clockLastTime) / 1000;
      clockLastTime = nowMs;
      const dt = Math.min(0.05, Math.max(0.001, Math.min(0.2, rawDt)));
      const elapsedTime = (nowMs - clockStartTime) / 1000;

      // Adaptive Dynamic Resolution Scaling via shared classroom3d governor (unclamped rawDt!)
      trackFrameRate(rawDt);

      const curLights = lightsCountRef.current;
      if (curLights !== lastLightsCount) {
        lastLightsCount = curLights;
        trackWorld.setStartLights(curLights);
      }

      const currentRacers = racersRef.current;
      const isGreenFlag = curLights === 6;

      // Sync active roster & livery colors only when the React racers array reference updates
      if (currentRacers !== lastSyncedRacers) {
        syncKartRoster(currentRacers);
      }

      const activeId =
        activeRacerIdRef.current || (currentRacers[0] ? currentRacers[0].id : undefined);

      // 1A. Pass 1: Advance Longitudinal Motion & Populate Zero-GC Planner Snapshots
      const racerCount = currentRacers.length;
      for (let racerIdx = 0; racerIdx < racerCount; racerIdx++) {
        const racer = currentRacers[racerIdx];
        const instance = kartMap.get(racer.id);
        if (!instance) continue;

        if (!isGreenFlag && racer.authoritativeDistanceMeters === undefined) {
          const gridOffset = -3.5 - racerIdx * 4.2;
          const gridLane = GRID_LANES_3WIDE[racerIdx % GRID_LANES_3WIDE.length];
          instance.distanceMeters = gridOffset;
          instance.targetLane = gridLane;
          instance.laneOffset = gridLane;
          instance.speedKmh = 0;
          instance.laneLockTimer = 0;
          instance.isOvertaking = false;
          instance.smoothedLatVel = 0;
          instance.smoothedSteerInput = 0;
          instance.boxedInCapKmh = 999;
        }

        const preProgress =
          (((instance.distanceMeters % totalCircuitLength) + totalCircuitLength) %
            totalCircuitLength) /
          totalCircuitLength;
        const cornerLimit = getSuzukaCornerSpeedLimit(preProgress);

        const rawTargetSpeed = isGreenFlag ? racer.speedKmh : 0;
        const targetSpeed = Math.min(rawTargetSpeed, cornerLimit, instance.boxedInCapKmh);

        const responseRate = 12.0;
        instance.speedKmh += (targetSpeed - instance.speedKmh) * Math.min(1.0, dt * responseRate);

        if (
          isGreenFlag &&
          racer.authoritativeDistanceMeters !== undefined &&
          (racer.speedKmh > 0 || racer.streak > 0 || racer.authoritativeDistanceMeters > -3.5)
        ) {
          const authDist = racer.authoritativeDistanceMeters;
          const isNewPacket =
            instance.lastAuthoritativeDist === undefined ||
            Math.abs(authDist - instance.lastAuthoritativeDist) > 0.05;

          if (isNewPacket) {
            instance.lastAuthoritativeDist = authDist;
            const drift = authDist - instance.distanceMeters;

            if (Math.abs(drift) > 60.0) {
              instance.distanceMeters = authDist;
              instance.catchUpSpeedMs = 0;
            } else {
              const targetCatchUp = drift / 0.75;
              instance.catchUpSpeedMs = Math.max(-6.0, Math.min(10.0, targetCatchUp));
            }
          }
        }

        if (Math.abs(instance.catchUpSpeedMs) > 0.01) {
          instance.catchUpSpeedMs += (0 - instance.catchUpSpeedMs) * Math.min(1.0, dt * 2.2);
        } else {
          instance.catchUpSpeedMs = 0;
        }

        const baseSpeedMs = instance.speedKmh / 3.6;
        const effectiveSpeedMs = Math.max(0, baseSpeedMs + instance.catchUpSpeedMs);
        instance.distanceMeters += effectiveSpeedMs * dt;
        instance.laneLockTimer = Math.max(0, instance.laneLockTimer - dt);

        let snap = _plannerSnapshots[racerIdx];
        if (!snap) {
          snap = {
            id: racer.id,
            distanceMeters: instance.distanceMeters,
            laneOffset: instance.laneOffset,
            targetLane: instance.targetLane,
            speedKmh: effectiveSpeedMs * 3.6,
            isBoosting: !!racer.isBoosting || racer.streak >= 3,
            inPitStop: !!racer.inPitStop,
          };
          _plannerSnapshots[racerIdx] = snap;
        } else {
          snap.id = racer.id;
          snap.distanceMeters = instance.distanceMeters;
          snap.laneOffset = instance.laneOffset;
          snap.targetLane = instance.targetLane;
          snap.speedKmh = effectiveSpeedMs * 3.6;
          snap.isBoosting = !!racer.isBoosting || racer.streak >= 3;
          snap.inPitStop = !!racer.inPitStop;
        }
      }

      // 1B. Pass 2: Staggered 15Hz Multi-Lane Gap Finder + 60Hz Smooth Anti-Clip Separation
      _laneInput.racerCount = racerCount;
      _repulsionInput.racerCount = racerCount;
      for (let racerIdx = 0; racerIdx < racerCount; racerIdx++) {
        const racer = currentRacers[racerIdx];
        const instance = kartMap.get(racer.id);
        if (!instance) continue;

        const snap = _plannerSnapshots[racerIdx];
        const normProgress =
          (((instance.distanceMeters % totalCircuitLength) + totalCircuitLength) %
            totalCircuitLength) /
          totalCircuitLength;
        const signedCurvature = getSuzukaSignedCurvature(normProgress);

        if (!isGreenFlag) {
          instance.isOvertaking = false;
          instance.boxedInCapKmh = 999;
          instance.smoothedLatVel += (0 - instance.smoothedLatVel) * Math.min(1.0, dt * 10.0);
        } else {
          const shouldEvaluateLane =
            racer.inPitStop || (frameCount + racerIdx) % 4 === 0;
          if (
            shouldEvaluateLane &&
            (instance.speedKmh > 6 || racer.inPitStop || instance.distanceMeters > 0)
          ) {
            _laneInput.selfIndex = racerIdx;
            _laneInput.signedCurvature = signedCurvature;
            _laneInput.laneLockRemainingSec = instance.laneLockTimer;
            selectBestPassingLane(_laneInput);

            if (Math.abs(_plannerResult.targetLane - instance.targetLane) > 0.35 && !racer.inPitStop) {
              instance.laneLockTimer = 0.45;
            }
            instance.targetLane = _plannerResult.targetLane;
            instance.isOvertaking = _plannerResult.isActivelyOvertaking;
            if (snap) {
              snap.targetLane = _plannerResult.targetLane;
            }

            // Quiz fairness guard: NEVER throttle active student or network-authoritative racers.
            // Gently trail simulation-only bots behind a solid traffic wall until an opening appears.
            instance.boxedInCapKmh =
              _plannerResult.isBoxedInAhead &&
              !racer.inPitStop &&
              !racer.isBoosting &&
              racer.streak < 3 &&
              racer.authoritativeDistanceMeters === undefined &&
              racer.id !== activeId
                ? Math.max(20, _plannerResult.blockingSpeedKmh * 0.96)
                : 999;
          }

          _repulsionInput.selfIndex = racerIdx;
          const repulsionVel = computeLateralRepulsionVelocity(_repulsionInput);

          const lateralRate = instance.isOvertaking || racer.isBoosting ? 4.1 : 2.9;
          const desiredLatVel = (instance.targetLane - instance.laneOffset) * lateralRate + repulsionVel;
          const clampedTargetLatVel = Math.max(-9.5, Math.min(9.5, desiredLatVel));
          instance.smoothedLatVel +=
            (clampedTargetLatVel - instance.smoothedLatVel) * Math.min(1.0, dt * 11.0);

          const nextLane = instance.laneOffset + instance.smoothedLatVel * dt;
          const clampedLane = Math.max(
            -SUZUKA_SAFE_LANE_LIMIT_M,
            Math.min(SUZUKA_SAFE_LANE_LIMIT_M, nextLane)
          );
          if (Math.abs(clampedLane - nextLane) > 0.001) {
            instance.smoothedLatVel *= 0.25;
          }
          instance.laneOffset = clampedLane;
        }
      }

      // 2. Evaluate Spline, Sync Unified Instanced Kart Layer & Populate Pooled Telemetry
      const currentCamMode = cameraModeRef.current || (mode === 'STUDENT_COCKPIT' ? 'COCKPIT' : 'DIRECTOR');

      let telemetryCount = 0;
      let frameKartCount = 0;

      for (let racerIdx = 0; racerIdx < racerCount; racerIdx++) {
        const racer = currentRacers[racerIdx];
        const instance = kartMap.get(racer.id);
        if (!instance) continue;

        const normalizedProgress =
          (((instance.distanceMeters % totalCircuitLength) + totalCircuitLength) %
            totalCircuitLength) /
          totalCircuitLength;
        const currentLap = Math.max(1, Math.floor(instance.distanceMeters / totalCircuitLength) + 1);
        const continuousProgress = Math.max(0, instance.distanceMeters / totalCircuitLength);

        const evalRes = trackWorld.evaluate(normalizedProgress, instance.laneOffset);

        // In pure bumper camera mode, hide the active player's own kart to ensure 100% unobstructed road view
        const isUser = racer.id === activeId;
        instance.visible = !(isUser && currentCamMode === 'FIRST_PERSON');

        instance.position.copy(evalRes.position);
        if (racer.inPitStop) {
          instance.position.x += (Math.random() - 0.5) * 0.15;
          instance.position.y += 0.25;
          instance.position.z += (Math.random() - 0.5) * 0.15;
        } else {
          instance.position.y += 0.25;
        }

        const signedCurvNow = getSuzukaSignedCurvature(normalizedProgress);
        _steerInput.speedKmh = instance.speedKmh;
        _steerInput.lateralVelMs = instance.smoothedLatVel;
        _steerInput.signedCurvature = signedCurvNow;
        computeKartVisualSteering(_steerInput);

        instance.smoothedSteerInput +=
          (_steerResult.steerInput - instance.smoothedSteerInput) * Math.min(1.0, dt * 12.0);

        _kartYawQuat.setFromAxisAngle(_kartUpAxis, _steerResult.laneYawRad);
        instance.quaternion.copy(evalRes.quaternion).multiply(_kartYawQuat);

        const cornerLimit = getSuzukaCornerSpeedLimit(normalizedProgress);
        instance.speedMs = instance.speedKmh / 3.6;
        instance.steerInput = instance.smoothedSteerInput;
        instance.driftAngle = _steerResult.driftAngle;
        instance.isBoosting = !!racer.isBoosting || racer.streak >= 3;
        instance.isBraking =
          !!racer.inPitStop || (cornerLimit < 175 && instance.speedKmh > cornerLimit * 0.82);

        _frameKarts[frameKartCount++] = instance;

        // Populate pooled telemetry object in-place (0 allocations at 60 Hz)
        const isPassing = instance.isOvertaking || Math.abs(instance.smoothedLatVel) > 0.75;
        let tObj = _telemetryPool[telemetryCount];
        if (!tObj) {
          tObj = {
            id: racer.id,
            name: racer.name,
            number: racer.number,
            colorHex: racer.colorHex,
            progress: continuousProgress,
            speedKmh: Math.round(instance.speedKmh),
            cornerSpeedLimit: cornerLimit,
            lap: currentLap,
            distanceMeters: instance.distanceMeters,
            laneOffset: instance.laneOffset,
            isPassingLane: isPassing,
          };
          _telemetryPool[telemetryCount] = tObj;
        } else {
          tObj.id = racer.id;
          tObj.name = racer.name;
          tObj.number = racer.number;
          tObj.colorHex = racer.colorHex;
          tObj.progress = continuousProgress;
          tObj.speedKmh = Math.round(instance.speedKmh);
          tObj.cornerSpeedLimit = cornerLimit;
          tObj.lap = currentLap;
          tObj.distanceMeters = instance.distanceMeters;
          tObj.laneOffset = instance.laneOffset;
          tObj.isPassingLane = isPassing;
        }
        telemetryCount++;
      }

      kartLayer.syncFrame(
        _frameKarts,
        dt,
        elapsedTime,
        currentNightFactor,
        currentWeatherSprayMode,
        frameKartCount
      );

      // Throttled ~2.2 Hz React telemetry sync (snapshots shallow copies only when callback is mounted)
      telemetryTimer += dt;
      if (telemetryTimer > 0.45) {
        telemetryTimer = 0;
        if (onTelemetryRef.current) {
          const snapshot: RacerTelemetry[] = new Array(telemetryCount);
          for (let i = 0; i < telemetryCount; i++) {
            snapshot[i] = { ..._telemetryPool[i] };
          }
          onTelemetryRef.current(snapshot);
        }
      }

      // 3. Steadicam Camera Damping & Smart Overtake-Aware F1 Director
      const activeInstance = activeId ? kartMap.get(activeId) : undefined;

      _sortedTelemetry.length = telemetryCount;
      for (let i = 0; i < telemetryCount; i++) {
        _sortedTelemetry[i] = _telemetryPool[i];
      }
      _sortedTelemetry.sort(compareTelemetryDesc);
      const sortedTelemetry = _sortedTelemetry;
      const leaderTelem = sortedTelemetry[0];

      let activeBattle: OvertakeBattle | null = null;

      if (battleLock) {
        const lock = battleLock;
        let aheadTelem: RacerTelemetry | undefined;
        let chaserTelem: RacerTelemetry | undefined;
        for (let i = 0; i < telemetryCount; i++) {
          const tItem = _telemetryPool[i];
          if (tItem.id === lock.aheadId) aheadTelem = tItem;
          else if (tItem.id === lock.chaserId) chaserTelem = tItem;
        }

        if (
          !aheadTelem ||
          !chaserTelem ||
          (aheadTelem.speedKmh <= 5 && chaserTelem.speedKmh <= 5)
        ) {
          battleLock = null;
        } else {
          const dAhead = aheadTelem.distanceMeters;
          const dChaser = chaserTelem.distanceMeters;
          const currentGap = Math.abs(dAhead - dChaser);
          const timeLocked = elapsedTime - lock.lockedAtSec;

          const isChaserAhead = dChaser > dAhead;
          const realAhead = isChaserAhead ? chaserTelem : aheadTelem;
          const realChaser = isChaserAhead ? aheadTelem : chaserTelem;
          let aheadRank = 1;
          for (let i = 0; i < sortedTelemetry.length; i++) {
            if (sortedTelemetry[i].id === realAhead.id) {
              aheadRank = i + 1;
              break;
            }
          }

          const isTightDuel =
            currentGap < 4.5 && realAhead.speedKmh > 25 && realChaser.speedKmh > 25;
          const effectiveMaxHold = isTightDuel ? lock.maxHoldSec + 2.5 : lock.maxHoldSec;
          const hottestElsewhere =
            timeLocked >= lock.minHoldSec && currentGap > 18.0
              ? findBestOvertakeBattle(sortedTelemetry)
              : null;
          const shouldSwitchToHotter =
            !!hottestElsewhere &&
            hottestElsewhere.score >= 120 &&
            hottestElsewhere.gapMeters < 7.0 &&
            !(
              (hottestElsewhere.ahead.id === lock.aheadId &&
                hottestElsewhere.chaser.id === lock.chaserId) ||
              (hottestElsewhere.ahead.id === lock.chaserId &&
                hottestElsewhere.chaser.id === lock.aheadId)
            );

          if (
            (currentGap > 50.0 && timeLocked >= lock.minHoldSec) ||
            timeLocked > effectiveMaxHold ||
            shouldSwitchToHotter
          ) {
            battleLock = null;
          } else {
            lock.angleTimer += dt;
            if (lock.angleTimer > 3.8) {
              lock.angleTimer = 0;
              lock.angleIndex = (lock.angleIndex + 1) % 4;
            }

            activeBattle = {
              ahead: realAhead,
              chaser: realChaser,
              rankAhead: aheadRank,
              gapMeters: currentGap,
              score: 100,
            };
          }
        }
      }

      if (!battleLock) {
        const candidate = findBestOvertakeBattle(sortedTelemetry);
        if (candidate) {
          const initialAngle =
            candidate.gapMeters <= 6.0
              ? Math.random() < 0.65
                ? 0
                : 1
              : Math.floor(Math.random() * 4);
          battleLock = {
            aheadId: candidate.ahead.id,
            chaserId: candidate.chaser.id,
            lockedAtSec: elapsedTime,
            minHoldSec: 5.5,
            maxHoldSec: 12.0,
            angleIndex: initialAngle,
            angleTimer: 0,
          };
          activeBattle = candidate;
        }
      }

      let nextBadgeText = '';

      if (currentCamMode === 'COCKPIT') {
        if (activeInstance) {
          const normP =
            (((activeInstance.distanceMeters % totalCircuitLength) + totalCircuitLength) %
              totalCircuitLength) /
            totalCircuitLength;
          const evalRes = trackWorld.evaluate(normP, activeInstance.laneOffset);

          const speedRatio = Math.min(1.0, Math.max(0, (activeInstance.speedKmh || 0) / 180));
          const speedT = Math.pow(speedRatio, 0.75);

          const chaseDist = THREE.MathUtils.lerp(7.2, 11.8, speedT);
          const chaseHeight = THREE.MathUtils.lerp(2.2, 4.2, speedT);
          const lookAheadDist = THREE.MathUtils.lerp(18.0, 23.0, speedT);
          const lookAheadHeight = THREE.MathUtils.lerp(1.05, 1.35, speedT);

          const targetFov = THREE.MathUtils.lerp(53, 60, speedT);
          if (Math.abs(camera.fov - targetFov) > 0.05) {
            camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, 0.08);
            camera.updateProjectionMatrix();
          }

          const cockpitYOffset = mode === 'STUDENT_COCKPIT' ? -0.85 : 0;

          targetCamPos.copy(evalRes.position).addScaledVector(evalRes.tangent, -chaseDist);
          targetCamPos.y += chaseHeight;

          targetCamLook.copy(evalRes.position).addScaledVector(evalRes.tangent, lookAheadDist);
          targetCamLook.y += lookAheadHeight + cockpitYOffset;

          updateSectorDisplay(evalRes.sector);

          const posDecay = Math.min(1.0, 1.0 - Math.exp(-6.5 * dt));
          const lookDecay = Math.min(1.0, 1.0 - Math.exp(-9.0 * dt));

          if (lastCamMode !== currentCamMode) {
            lastCamMode = currentCamMode;
            currentCamPos.copy(targetCamPos);
            currentCamLook.copy(targetCamLook);
          } else {
            currentCamPos.lerp(targetCamPos, posDecay);
            currentCamLook.lerp(targetCamLook, lookDecay);
          }

          camera.position.copy(currentCamPos);
          camera.lookAt(currentCamLook);
        }
      } else if (currentCamMode === 'FIRST_PERSON') {
        if (activeInstance) {
          const normP =
            (((activeInstance.distanceMeters % totalCircuitLength) + totalCircuitLength) %
              totalCircuitLength) /
            totalCircuitLength;
          const evalRes = trackWorld.evaluate(normP, activeInstance.laneOffset);

          // Pure Tarmac Bumper Cam: mounted at front bumper tip, 42cm off asphalt, 100% unobstructed
          const noseDist = 1.65;
          const noseHeight = 0.42;
          const lookAheadDist = 26.0;

          const targetFov = 72; // Wide FOV for exhilarating sense of asphalt velocity
          if (Math.abs(camera.fov - targetFov) > 0.05) {
            camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, 0.1);
            camera.updateProjectionMatrix();
          }

          targetCamPos.copy(evalRes.position).addScaledVector(evalRes.tangent, noseDist);
          targetCamPos.y += noseHeight;

          targetCamLook.copy(evalRes.position).addScaledVector(evalRes.tangent, lookAheadDist);
          targetCamLook.y += 0.55;

          updateSectorDisplay(evalRes.sector);

          const posDecay = Math.min(1.0, 1.0 - Math.exp(-12.0 * dt));
          const lookDecay = Math.min(1.0, 1.0 - Math.exp(-14.0 * dt));

          if (lastCamMode !== currentCamMode) {
            lastCamMode = currentCamMode;
            currentCamPos.copy(targetCamPos);
            currentCamLook.copy(targetCamLook);
          } else {
            currentCamPos.lerp(targetCamPos, posDecay);
            currentCamLook.lerp(targetCamLook, lookDecay);
          }

          camera.position.copy(currentCamPos);
          camera.lookAt(currentCamLook);
        }
      } else if (currentCamMode === 'ORBIT') {
        if (activeInstance) {
          const normP =
            (((activeInstance.distanceMeters % totalCircuitLength) + totalCircuitLength) %
              totalCircuitLength) /
            totalCircuitLength;
          const evalRes = trackWorld.evaluate(normP, activeInstance.laneOffset);

          victoryOrbitAngle += dt * 0.72; // Full revolution every ~8.7s

          const targetFov = 50;
          if (Math.abs(camera.fov - targetFov) > 0.05) {
            camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, 0.08);
            camera.updateProjectionMatrix();
          }

          const radius = 9.2;
          const height = 2.4 + Math.sin(victoryOrbitAngle * 1.5) * 0.6;

          // Track lateral normal (perpendicular to tangent in XZ plane)
          const normX = -evalRes.tangent.z;
          const normZ = evalRes.tangent.x;

          const cosA = Math.cos(victoryOrbitAngle);
          const sinA = Math.sin(victoryOrbitAngle);
          const offsetX = (cosA * normX - sinA * evalRes.tangent.x) * radius;
          const offsetZ = (cosA * normZ - sinA * evalRes.tangent.z) * radius;

          targetCamPos.set(
            evalRes.position.x + offsetX,
            evalRes.position.y + height,
            evalRes.position.z + offsetZ
          );

          targetCamLook.copy(evalRes.position);
          targetCamLook.y += 0.85;

          updateSectorDisplay(evalRes.sector);

          const posDecay = Math.min(1.0, 1.0 - Math.exp(-8.0 * dt));
          const lookDecay = Math.min(1.0, 1.0 - Math.exp(-10.0 * dt));

          if (lastCamMode !== currentCamMode) {
            lastCamMode = currentCamMode;
            currentCamPos.copy(targetCamPos);
            currentCamLook.copy(targetCamLook);
          } else {
            currentCamPos.lerp(targetCamPos, posDecay);
            currentCamLook.lerp(targetCamLook, lookDecay);
          }

          camera.position.copy(currentCamPos);
          camera.lookAt(currentCamLook);
        }
      } else if (currentCamMode === 'ISOMETRIC') {
        targetCamPos.set(0, 360, 260);
        targetCamLook.set(0, 0, 0);
        currentCamPos.lerp(targetCamPos, 0.06);
        currentCamLook.lerp(targetCamLook, 0.06);
        camera.position.copy(currentCamPos);
        camera.lookAt(currentCamLook);
        nextBadgeText = '🗺️ FULL CIRCUIT OVERHEAD';
      } else if (currentCamMode === 'DRONE') {
        nextBadgeText = framePackHelicopterCamera(sortedTelemetry, elapsedTime);
        currentCamPos.lerp(targetCamPos, 0.08);
        currentCamLook.lerp(targetCamLook, 0.08);
        camera.position.copy(currentCamPos);
        camera.lookAt(currentCamLook);
      } else if (currentCamMode === 'LEADER') {
        nextBadgeText = frameLeaderCamera(leaderTelem, sortedTelemetry);
        const posDecay = Math.min(1.0, 1.0 - Math.exp(-6.5 * dt));
        const lookDecay = Math.min(1.0, 1.0 - Math.exp(-9.0 * dt));
        if (currentCamPos.distanceTo(targetCamPos) > 35.0) {
          currentCamPos.copy(targetCamPos);
          currentCamLook.copy(targetCamLook);
        } else {
          currentCamPos.lerp(targetCamPos, posDecay);
          currentCamLook.lerp(targetCamLook, lookDecay);
        }
        camera.position.copy(currentCamPos);
        camera.lookAt(currentCamLook);
      } else if (currentCamMode === 'BATTLE') {
        const angleIdx = battleLock ? battleLock.angleIndex : 0;
        if (activeBattle) {
          nextBadgeText = frameBattleCamera(activeBattle, angleIdx);
        } else {
          nextBadgeText = frameLeaderCamera(leaderTelem, sortedTelemetry);
        }
        const posDecay = Math.min(1.0, 1.0 - Math.exp(-6.5 * dt));
        const lookDecay = Math.min(1.0, 1.0 - Math.exp(-9.0 * dt));
        if (currentCamPos.distanceTo(targetCamPos) > 35.0) {
          currentCamPos.copy(targetCamPos);
          currentCamLook.copy(targetCamLook);
        } else {
          currentCamPos.lerp(targetCamPos, posDecay);
          currentCamLook.lerp(targetCamLook, lookDecay);
        }
        camera.position.copy(currentCamPos);
        camera.lookAt(currentCamLook);
      } else if (currentCamMode in LANDMARK_CAM_SPECS) {
        const lmId = currentCamMode as LandmarkCamId;
        nextBadgeText = `📹 FIXED CAM: ${applyLandmarkCamera(lmId, _telemetryPool, telemetryCount)}`;
        const spec = LANDMARK_CAM_SPECS[lmId];
        const sample =
          trackWorld.samples[
            Math.floor(spec.t * trackWorld.samples.length) % trackWorld.samples.length
          ];
        updateSectorDisplay(sample.sector);
        currentCamPos.lerp(targetCamPos, 0.1);
        currentCamLook.lerp(targetCamLook, 0.12);
        camera.position.copy(currentCamPos);
        camera.lookAt(currentCamLook);
      } else {
        directorTimer += dt;
        if (directorTimer > 5.5) {
          directorTimer = 0;
          directorPhaseIndex = (directorPhaseIndex + 1) % 4;
        }

        if (!isGreenFlag) {
          const sStart = trackWorld.samples[0];
          const sweepRight = -2.5 + Math.sin(elapsedTime * 0.24) * 5.5;
          const sweepUp = 5.4 + Math.cos(elapsedTime * 0.18) * 0.7;
          targetCamPos
            .copy(sStart.position)
            .addScaledVector(sStart.right, sweepRight)
            .addScaledVector(sStart.tangent, -21);
          targetCamPos.y += sweepUp;

          targetCamLook
            .copy(sStart.position)
            .addScaledVector(sStart.right, 1.5)
            .addScaledVector(sStart.tangent, 22);
          targetCamLook.y += 2.1;

          nextBadgeText = '🎬 AI DIRECTOR · 🏁 Starting Grid & Main Grandstand';
        } else if (activeBattle && (directorPhaseIndex === 0 || directorPhaseIndex === 2)) {
          const angleIdx = battleLock ? battleLock.angleIndex : 0;
          nextBadgeText = `🎬 AI DIRECTOR · ${frameBattleCamera(activeBattle, angleIdx)}`;
        } else if (directorPhaseIndex === 1 && leaderTelem) {
          const focusProgress = activeBattle ? activeBattle.ahead.progress : leaderTelem.progress;
          const activeLandmark = findNearestLandmark(focusProgress);
          const lmDesc = applyLandmarkCamera(activeLandmark, _telemetryPool, telemetryCount);
          const lmEval = trackWorld.evaluate(focusProgress, 0);
          updateSectorDisplay(lmEval.sector);
          nextBadgeText = `🎬 AI DIRECTOR · ${lmDesc}`;
        } else if (directorPhaseIndex === 3 && sortedTelemetry.length > 1) {
          nextBadgeText = `🎬 AI DIRECTOR · ${framePackHelicopterCamera(sortedTelemetry, elapsedTime)}`;
        } else {
          nextBadgeText = `🎬 AI DIRECTOR · ${frameLeaderCamera(leaderTelem, sortedTelemetry)}`;
        }

        const posDecay = Math.min(1.0, 1.0 - Math.exp(-6.0 * dt));
        const lookDecay = Math.min(1.0, 1.0 - Math.exp(-8.5 * dt));
        if (currentCamPos.distanceTo(targetCamPos) > 35.0) {
          currentCamPos.copy(targetCamPos);
          currentCamLook.copy(targetCamLook);
        } else {
          currentCamPos.lerp(targetCamPos, posDecay);
          currentCamLook.lerp(targetCamLook, lookDecay);
        }
        camera.position.copy(currentCamPos);
        camera.lookAt(currentCamLook);
      }

      // 4. Dynamic 24 Hours of Le Mans Time-of-Day Progression & Atmosphere Update
      if (!isGreenFlag) {
        greenFlagStartSec = null;
        smoothedLeMansProgress += (0 - smoothedLeMansProgress) * Math.min(1.0, dt * 3.0);
      } else {
        if (greenFlagStartSec === null) {
          greenFlagStartSec = elapsedTime;
        }
        const raceElapsedSec = Math.max(0, elapsedTime - greenFlagStartSec);
        const maxLeaderDist = leaderTelem ? Math.max(0, leaderTelem.distanceMeters) : 0;
        const totalRaceDist = totalCircuitLength * Math.max(1, targetLapsRef.current || 2);
        const distProgress = Math.max(0, Math.min(1, maxLeaderDist / totalRaceDist));

        let targetLeMansProgress = distProgress;
        const timeLimit = timeTrialLimitSecondsRef.current;
        if (timeLimit && timeLimit > 0) {
          const timeProgress = Math.max(0, Math.min(1, raceElapsedSec / timeLimit));
          targetLeMansProgress = Math.max(timeProgress, distProgress * 0.5);
        } else {
          // Ensure smooth ambient progression even if leaders pause on a question
          const nominalRaceSec = Math.max(45, (targetLapsRef.current || 2) * 58);
          const timeFloor = Math.min(0.94, raceElapsedSec / nominalRaceSec);
          targetLeMansProgress = Math.max(distProgress, timeFloor);
        }
        smoothedLeMansProgress +=
          (targetLeMansProgress - smoothedLeMansProgress) * Math.min(1.0, dt * 1.8);
      }

      // Evaluate atmosphere only when props change in static modes, or at ~15 Hz during LE_MANS_CYCLE
      atmoThrottleTimer += dt;
      const atmoPropsDirty =
        timeOfDayRef.current !== lastAtmoTimeOfDay ||
        cloudCoverRef.current !== lastAtmoCloudCover ||
        precipitationRef.current !== lastAtmoPrecip;
      if (
        atmoPropsDirty ||
        (timeOfDayRef.current === 'LE_MANS_CYCLE' && atmoThrottleTimer >= 0.066)
      ) {
        atmoThrottleTimer = 0;
        applyEvaluatedAtmosphere(smoothedLeMansProgress);
      }

      if (timeOfDayRef.current === 'LE_MANS_CYCLE' && nextBadgeText) {
        const lmBadge = getLeMansPhaseBadge(smoothedLeMansProgress);
        nextBadgeText = `${lmBadge.emoji} ${lmBadge.labelEn} · ${nextBadgeText}`;
      }

      if (mode === 'BROADCAST' && directorBadgeContainerRef.current && directorBadgeTextRef.current) {
        if (nextBadgeText) {
          if (nextBadgeText !== lastBadgeText) {
            lastBadgeText = nextBadgeText;
            directorBadgeTextRef.current.textContent = nextBadgeText;
          }
          if (directorBadgeContainerRef.current.style.display !== 'block') {
            directorBadgeContainerRef.current.style.display = 'block';
          }
        } else {
          if (directorBadgeContainerRef.current.style.display !== 'none') {
            directorBadgeContainerRef.current.style.display = 'none';
          }
        }
      }

      if (trackWorld.updateScenery) {
        trackWorld.updateScenery(dt);
      }

      // Update dynamic skybox cloud animation time & center sky dome + precipitation on camera
      skyDome.uniforms.uTime.value = elapsedTime;
      skyDome.mesh.position.copy(camera.position);

      const activePrecip = precipSystemRef.current;
      if (activePrecip) {
        activePrecip.uniforms.uTime.value = elapsedTime;
        activePrecip.uniforms.uCameraPos.value.copy(camera.position);
      }

      // Celebration Fireworks over Main Straight on green flag launch, lap crossings, final lap & finish
      const targetLapCount = Math.max(1, targetLapsRef.current || 2);
      const anyRacerFinished =
        currentRacers.some((r) => !!r.isFinished) ||
        (!!leaderTelem && leaderTelem.lap > targetLapCount);
      const onFinalLap =
        !!leaderTelem &&
        leaderTelem.lap >= targetLapCount &&
        leaderTelem.progress > 0.65;
      let lapCrossingSalute = false;
      for (let i = 0; i < telemetryCount; i++) {
        const t = _telemetryPool[i];
        if (
          t.distanceMeters > totalCircuitLength * 0.92 &&
          (t.progress < 0.09 || t.progress > 0.92)
        ) {
          lapCrossingSalute = true;
          break;
        }
      }
      const greenFlagSalute =
        greenFlagStartSec !== null && elapsedTime - greenFlagStartSec < 5.5;
      const leMansFinale =
        timeOfDayRef.current === 'LE_MANS_CYCLE' && smoothedLeMansProgress > 0.78;
      const isDarkEnoughForFireworks = currentNightFactor > 0.15;
      const shouldShowFireworks =
        isGreenFlag &&
        isDarkEnoughForFireworks &&
        (anyRacerFinished || onFinalLap || lapCrossingSalute || greenFlagSalute || leMansFinale);
      fireworksSystem.mesh.visible = shouldShowFireworks;
      if (shouldShowFireworks) {
        fireworksSystem.uniforms.uTime.value = elapsedTime;
        fireworksSystem.uniforms.uActive.value = 1.0;
      } else {
        fireworksSystem.uniforms.uActive.value = 0.0;
      }

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        rafId = requestAnimationFrame(tick);
      }
    }

    tick();

    return () => {
      isDisposed = true;
      cancelAnimationFrame(rafId);
      clearTimeout(timeoutId);

      kartMap.clear();
      kartLayer.dispose();

      if (precipSystemRef.current) {
        scene.remove(precipSystemRef.current.mesh);
        precipSystemRef.current.dispose();
        precipSystemRef.current = null;
      }

      fireworksSystem.dispose();
      skyDome.geometry.dispose();
      skyDome.material.dispose();
      disposeObject3D(trackWorld.root);
      disposeObject3D(scene);
      envHandle.dispose();
      scene.clear();
      sceneRef.current = null;
      cleanupClassroomRenderer();
    };
  }, [performanceProfile, mode, trackTheme, contextRestartKey]);

  // Swap 1-draw-call rain/snow particle system without rebuilding the WebGLRenderer or track
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (precipSystemRef.current) {
      scene.remove(precipSystemRef.current.mesh);
      precipSystemRef.current.dispose();
      precipSystemRef.current = null;
    }

    const theme = getTrackTheme(trackTheme);
    const activePrecip = precipitation ?? theme.defaultPrecipitation;
    const isStudentView = performanceProfile === 'MOBILE' || mode === 'STUDENT_COCKPIT';
    const nextPrecip = createPrecipitationSystem(activePrecip, isStudentView);
    if (nextPrecip) {
      scene.add(nextPrecip.mesh);
      precipSystemRef.current = nextPrecip;
    }

    return () => {
      if (precipSystemRef.current) {
        scene.remove(precipSystemRef.current.mesh);
        precipSystemRef.current.dispose();
        precipSystemRef.current = null;
      }
    };
  }, [precipitation, trackTheme, performanceProfile, mode, contextRestartKey]);

  return (
    <div className={`relative w-full h-full overflow-hidden select-none bg-slate-950 ${className}`}>
      <div
        ref={containerRef}
        data-testid="suzuka-3d-canvas-container"
        className="w-full h-full cursor-grab active:cursor-grabbing bg-slate-950"
      />

      {isLoading && (
        <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center gap-3 z-20">
          <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-black text-amber-400 tracking-wider">
            {activeTheme.emoji} {activeTheme.shortEn.toUpperCase()} · SUZUKA 3D...
          </span>
        </div>
      )}

      {/* Sector & Diegetic ESL Phrase Indicator (Student Cockpit view) */}
      {!hideSectorBadge && mode === 'STUDENT_COCKPIT' && (
        <div
          ref={sectorContainerRef}
          style={{ display: 'none' }}
          className="absolute top-2.5 left-3 z-20 pointer-events-none"
        >
          <div className="px-3 py-1.5 rounded-xl bg-slate-950/92 border border-slate-700 text-white text-xs font-bold shadow-lg flex items-center gap-2">
            <span ref={sectorEmojiRef}></span>
            <span ref={sectorEnRef} className="text-amber-400 font-black"></span>
            <span className="text-slate-500">·</span>
            <span ref={sectorJaRef} className="text-slate-300 text-[11px]"></span>
            <span className="text-slate-500 hidden sm:inline">·</span>
            <span ref={sectorPhraseRef} className="text-cyan-300 font-black text-[11px] hidden sm:inline"></span>
          </div>
        </div>
      )}

      {/* Broadcast Director Badge (Constrained width so it never overlaps bottom-left Standings) */}
      {!hideSectorBadge && mode === 'BROADCAST' && (
        <div
          ref={directorBadgeContainerRef}
          style={{ display: 'none' }}
          className="absolute bottom-3 right-3 max-w-[calc(100%-21.5rem)] z-10 pointer-events-none"
        >
          <div className="px-3 py-1.5 rounded-xl bg-slate-950/92 border border-amber-500/40 text-amber-300 text-xs font-black shadow-xl flex items-center gap-2 truncate">
            <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
            <span ref={directorBadgeTextRef} className="truncate"></span>
          </div>
        </div>
      )}
    </div>
  );
};

export const Suzuka3DStage = React.memo(Suzuka3DStageComponent);
export const Desk3DStage = Suzuka3DStage;
