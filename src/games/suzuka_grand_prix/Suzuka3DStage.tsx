import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createClassroomRenderer } from '@/utils/classroom3d';
import {
  buildSuzuka3DTrack,
  SuzukaTrackWorld,
  getSuzukaCornerSpeedLimit,
  SUZUKA_CIRCUIT_LENGTH_METERS,
} from './engine/Suzuka3DEngine';
import { buildMicroKart } from './engine/MicroKartBuilder.js';
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

export const LANE_DRIVING = -2.1; // Left lane (cruising / standard driving line)
export const LANE_PASSING = 2.1;  // Right lane (high-speed passing / overtaking line)

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
    { offset: [0, 32, -18], color: [1.0, 0.82, 0.22], phase: 0.0 },
    { offset: [-24, 38, 12], color: [1.0, 0.28, 0.68], phase: 0.55 },
    { offset: [22, 35, 16], color: [0.18, 0.92, 1.0], phase: 1.1 },
    { offset: [-14, 42, -28], color: [0.32, 1.0, 0.52], phase: 1.65 },
    { offset: [18, 40, -8], color: [1.0, 0.45, 0.15], phase: 2.2 },
  ];
  const sparksPerShell = 84;
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
      const speed = 10.5 + rand() * 8.5;

      positions[idx * 3 + 0] = cx;
      positions[idx * 3 + 1] = cy;
      positions[idx * 3 + 2] = cz;

      velocities[idx * 3 + 0] = Math.sin(phi) * Math.cos(theta) * speed;
      velocities[idx * 3 + 1] = Math.cos(phi) * speed;
      velocities[idx * 3 + 2] = Math.sin(phi) * Math.sin(theta) * speed;

      const cJitter = 0.88 + rand() * 0.24;
      colors[idx * 3 + 0] = Math.min(1, sh.color[0] * cJitter);
      colors[idx * 3 + 1] = Math.min(1, sh.color[1] * cJitter);
      colors[idx * 3 + 2] = Math.min(1, sh.color[2] * cJitter);

      phases[idx] = sh.phase + rand() * 0.08;
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
        float cycle = mod(uTime + aPhase, 2.75);
        float life = clamp(cycle / 1.95, 0.0, 1.0);
        vec3 burstPos = position + aVelocity * (cycle * (1.0 - 0.24 * life));
        burstPos.y -= 3.4 * cycle * cycle;
        vec4 mvPosition = modelViewMatrix * vec4(burstPos, 1.0);
        float dist = max(2.0, -mvPosition.z);
        gl_PointSize = clamp((240.0 * (1.0 - life * 0.55)) / dist, 3.0, 16.0);
        float fadeIn = smoothstep(0.0, 0.08, life);
        float fadeOut = 1.0 - smoothstep(0.55, 1.0, life);
        vAlpha = uActive * fadeIn * fadeOut * step(cycle, 1.95);
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
        float core = smoothstep(0.5, 0.05, d);
        gl_FragColor = vec4(mix(vColor, vec3(1.0), core * 0.45), core * vAlpha);
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

  const activeTheme = getTrackTheme(trackTheme);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let isDisposed = false;
    let frameId = 0;

    // Resolve biome/atmosphere theme configuration
    const theme = getTrackTheme(trackTheme);
    const activePrecip = precipitation ?? theme.defaultPrecipitation;

    // Hardware profile detection & adaptive renderer setup (zero redundant temp canvases)
    const isStudentView = performanceProfile === 'MOBILE' || mode === 'STUDENT_COCKPIT';

    // 1. Scene, Camera & Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(theme.sceneBackgroundHex);
    scene.fog = new THREE.FogExp2(theme.fogHex, theme.fogDensity);

    // Dynamic Skybox with dual-layer cloud animation & optional night starfield (1 draw call, <0.08ms GPU cost)
    const skyDome = createDynamicSkyDome(theme);
    scene.add(skyDome.mesh);

    // 1-Draw-Call Camera-Anchored GPU Precipitation System (Rain / Snow)
    const precipSystem = createPrecipitationSystem(activePrecip, isStudentView);
    if (precipSystem) {
      scene.add(precipSystem.mesh);
    }

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
    });
    const isSoftwareGl = gpuProfile.isSoftware;

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMappingExposure = theme.exposure;

    const domElement = renderer.domElement;
    domElement.style.display = 'block';
    domElement.style.backgroundColor = '#020617';

    const onContextLost = (e: Event) => {
      e.preventDefault();
      console.warn('[Suzuka3DStage] WebGL context lost; default prevented to allow GPU restoration.');
    };
    const onContextRestored = () => {
      console.info('[Suzuka3DStage] WebGL context restored; restarting 3D stage cleanly.');
      setContextRestartKey((k) => k + 1);
    };
    domElement.addEventListener('webglcontextlost', onContextLost, false);
    domElement.addEventListener('webglcontextrestored', onContextRestored, false);

    // Studio Environment Map (RoomEnvironment + PMREMGenerator) for metallic kart & visor reflections
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;
    scene.environmentIntensity = 1.0;
    pmremGenerator.dispose();

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

    // Karts Group
    interface KartInstance {
      kartObj: any;
      distanceMeters: number;
      speedKmh: number;
      laneOffset: number;
      targetLane: number;
      lastAuthoritativeDist?: number;
      catchUpSpeedMs?: number;
      lastColorHex?: number;
      lastHelmetHex?: number;
    }
    const kartMap = new Map<string, KartInstance>();
    const kartsRootGroup = new THREE.Group();
    kartsRootGroup.name = 'AllKartsGroup';
    scene.add(kartsRootGroup);

    const initialRacers = racersRef.current;
    initialRacers.forEach((racer, index) => {
      const isUser = racer.id === activeRacerIdRef.current;
      const kartObj = buildMicroKart({
        colorHex: racer.colorHex,
        stripeHex: racer.stripeHex,
        rimHex: racer.rimHex,
        suitHex: racer.suitHex,
        helmetHex: racer.helmetHex,
        visorHex: racer.visorHex,
        number: racer.number,
        isUser,
        labelText: isUser && mode === 'STUDENT_COCKPIT' ? '' : `#${racer.number} ${racer.name}`,
      });
      kartObj.kartRoot.scale.set(130, 130, 130);
      kartsRootGroup.add(kartObj.kartRoot);

      const gridOffset = -4.0 - index * 6.5;
      const gridLane = index % 2 === 0 ? LANE_DRIVING : LANE_PASSING;
      kartMap.set(racer.id, {
        kartObj,
        distanceMeters: gridOffset,
        speedKmh: 0,
        laneOffset: gridLane,
        targetLane: gridLane,
        lastAuthoritativeDist: racer.authoritativeDistanceMeters,
        catchUpSpeedMs: 0,
        lastColorHex: racer.colorHex,
        lastHelmetHex: racer.helmetHex,
      });
    });

    // Pre-allocated scratch vectors (0 GC inside animation loop)
    const currentCamPos = new THREE.Vector3(0, 35, 90);
    const targetCamPos = new THREE.Vector3();
    const currentCamLook = new THREE.Vector3(0, 0, 0);
    const targetCamLook = new THREE.Vector3();
    const _packCentroid = new THREE.Vector3();
    const _sortedTelemetry: RacerTelemetry[] = [];
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
      MAIN_STRAIGHT: { t: 0.02, label: '🏁 Main Straight & Grandstand', rightOffset: 22, upOffset: 11, backOffset: -20 },
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
      telemetryList: RacerTelemetry[]
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
      for (const r of telemetryList) {
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

    interface OvertakeBattle {
      ahead: RacerTelemetry;
      chaser: RacerTelemetry;
      rankAhead: number;
      gapMeters: number;
      score: number;
    }

    function findBestOvertakeBattle(sortedTelemetry: RacerTelemetry[]): OvertakeBattle | null {
      if (sortedTelemetry.length < 2) return null;
      let best: OvertakeBattle | null = null;

      for (let i = 0; i < sortedTelemetry.length - 1; i++) {
        const ahead = sortedTelemetry[i];
        const chaser = sortedTelemetry[i + 1];
        if (ahead.speedKmh <= 5 && chaser.speedKmh <= 5) continue;

        const gap = ahead.distanceMeters - chaser.distanceMeters;
        if (gap >= 0 && gap <= 32.0) {
          let score = (32.0 - gap) * 2.5;
          if (chaser.isPassingLane) score += 28;
          if (chaser.speedKmh > ahead.speedKmh) score += 20;
          if (i === 0) score += 30;
          else if (i === 1) score += 18;

          if (!best || score > best.score) {
            best = { ahead, chaser, rankAhead: i + 1, gapMeters: gap, score };
          }
        }
      }
      return best;
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

    const clockStartTime = performance.now();
    let clockLastTime = clockStartTime;
    let telemetryTimer = 0;
    let greenFlagStartSec: number | null = null;
    let smoothedLeMansProgress = 0;
    let currentNightFactor = 0;
    let currentWeatherSprayMode: 'NONE' | 'RAIN' | 'SNOW' = 'NONE';

    const applyEvaluatedAtmosphere = (leMansProgress01: number) => {
      const curPrecip = precipitationRef.current ?? theme.defaultPrecipitation;
      const atmo = evaluateSuzukaAtmosphere({
        biome: theme.id,
        timeOfDay: timeOfDayRef.current ?? 'NOON',
        cloudCover: cloudCoverRef.current ?? theme.defaultCloudCover,
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
            frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 80);
          }
        };
        frameId = window.setTimeout(poll, 5);
      } else {
        frameId = window.setTimeout(cb, 80);
      }
    }

    // -------------------------------------------------------------------------
    // 2. 60 FPS Physics Integration, Adaptive Resolution Governor & Steadicam
    // -------------------------------------------------------------------------
    function tick() {
      if (isDisposed) return;
      frameCount++;

      const nowMs = performance.now();
      const elapsedDeltaSec = (nowMs - clockLastTime) / 1000;
      const rawDelta = Math.min(0.2, elapsedDeltaSec);
      clockLastTime = nowMs;
      const dt = Math.min(0.05, Math.max(0.001, rawDelta));
      const elapsedTime = (nowMs - clockStartTime) / 1000;

      // Adaptive Dynamic Resolution Scaling via shared classroom3d governor
      trackFrameRate(elapsedDeltaSec);

      trackWorld.setStartLights(lightsCountRef.current);

      const currentRacers = racersRef.current;
      const isGreenFlag = lightsCountRef.current === 6;

      for (const [id, inst] of kartMap.entries()) {
        if (!currentRacers.some((r) => r.id === id)) {
          kartsRootGroup.remove(inst.kartObj.kartRoot);
          inst.kartObj.disposeKart?.();
          kartMap.delete(id);
        }
      }

      for (let racerIdx = 0; racerIdx < currentRacers.length; racerIdx++) {
        const racer = currentRacers[racerIdx];
        let instance = kartMap.get(racer.id);
        if (!instance) {
          const isUser = racer.id === activeRacerIdRef.current;
          const kartObj = buildMicroKart({
            colorHex: racer.colorHex,
            stripeHex: racer.stripeHex,
            rimHex: racer.rimHex,
            suitHex: racer.suitHex,
            helmetHex: racer.helmetHex,
            visorHex: racer.visorHex,
            number: racer.number,
            isUser,
            labelText: isUser && mode === 'STUDENT_COCKPIT' ? '' : `#${racer.number} ${racer.name}`,
          });
          kartObj.kartRoot.scale.set(130, 130, 130);
          kartsRootGroup.add(kartObj.kartRoot);

          const initialGridOffset = -4.0 - racerIdx * 6.5;
          const initialGridLane = racerIdx % 2 === 0 ? LANE_DRIVING : LANE_PASSING;

          instance = {
            kartObj,
            distanceMeters:
              racer.authoritativeDistanceMeters !== undefined
                ? racer.authoritativeDistanceMeters
                : initialGridOffset,
            speedKmh: 0,
            laneOffset: initialGridLane,
            targetLane: initialGridLane,
            lastAuthoritativeDist: racer.authoritativeDistanceMeters,
            catchUpSpeedMs: 0,
            lastColorHex: racer.colorHex,
            lastHelmetHex: racer.helmetHex,
          };
          kartMap.set(racer.id, instance);
        } else {
          if (!isGreenFlag && racer.authoritativeDistanceMeters === undefined) {
            const gridOffset = -4.0 - racerIdx * 6.5;
            const gridLane = racerIdx % 2 === 0 ? LANE_DRIVING : LANE_PASSING;
            instance.distanceMeters = gridOffset;
            instance.targetLane = gridLane;
            instance.laneOffset = gridLane;
            instance.speedKmh = 0;
          }
          if (
            instance.lastColorHex !== racer.colorHex ||
            instance.lastHelmetHex !== racer.helmetHex
          ) {
            instance.lastColorHex = racer.colorHex;
            instance.lastHelmetHex = racer.helmetHex;
            if (instance.kartObj.updateColors) {
              instance.kartObj.updateColors({
                colorHex: racer.colorHex,
                stripeHex: racer.stripeHex,
                rimHex: racer.rimHex,
                suitHex: racer.suitHex,
                helmetHex: racer.helmetHex,
                visorHex: racer.visorHex,
              });
            }
          }
        }

        const preProgress =
          (((instance.distanceMeters % totalCircuitLength) + totalCircuitLength) %
            totalCircuitLength) /
          totalCircuitLength;
        const cornerLimit = getSuzukaCornerSpeedLimit(preProgress);

        const rawTargetSpeed = isGreenFlag ? racer.speedKmh : 0;
        const targetSpeed = Math.min(rawTargetSpeed, cornerLimit);

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

        if (instance.catchUpSpeedMs !== undefined && Math.abs(instance.catchUpSpeedMs) > 0.01) {
          instance.catchUpSpeedMs += (0 - instance.catchUpSpeedMs) * Math.min(1.0, dt * 2.2);
        } else {
          instance.catchUpSpeedMs = 0;
        }

        const baseSpeedMs = instance.speedKmh / 3.6;
        const effectiveSpeedMs = Math.max(0, baseSpeedMs + (instance.catchUpSpeedMs || 0));
        instance.distanceMeters += effectiveSpeedMs * dt;

        const shouldEvaluateLane = racer.inPitStop || (frameCount + racerIdx) % 4 === 0;
        if (isGreenFlag && instance.distanceMeters > 0 && shouldEvaluateLane) {
          if (racer.inPitStop) {
            instance.targetLane = LANE_DRIVING;
          } else {
            const myEffectiveSpeedKmh = effectiveSpeedMs * 3.6;
            const currentTargetLane = instance.targetLane;
            const altLane = currentTargetLane === LANE_DRIVING ? LANE_PASSING : LANE_DRIVING;

            let blockedAheadInMyLane = false;
            let isClosingInFast = false;

            for (const otherRacer of currentRacers) {
              if (otherRacer.id === racer.id) continue;
              const other = kartMap.get(otherRacer.id);
              if (!other) continue;

              let distAhead = other.distanceMeters - instance.distanceMeters;
              if (distAhead < -totalCircuitLength * 0.5) distAhead += totalCircuitLength;
              if (distAhead > totalCircuitLength * 0.5) distAhead -= totalCircuitLength;

              const otherInMyLane =
                Math.abs(other.targetLane - currentTargetLane) < 1.0 ||
                Math.abs(other.laneOffset - currentTargetLane) < 1.4;

              if (otherInMyLane && distAhead > 0.3 && distAhead < 28.0) {
                blockedAheadInMyLane = true;
                const otherEffectiveSpeedKmh =
                  (other.speedKmh / 3.6 + (other.catchUpSpeedMs || 0)) * 3.6;

                if (
                  myEffectiveSpeedKmh >= otherEffectiveSpeedKmh - 2.0 ||
                  racer.isBoosting ||
                  racer.streak >= 1 ||
                  distAhead < 12.0
                ) {
                  isClosingInFast = true;
                }
              }
            }

            if (blockedAheadInMyLane && (isClosingInFast || racer.isBoosting)) {
              const isAltLaneClear = !currentRacers.some((oR) => {
                if (oR.id === racer.id) return false;
                const oInst = kartMap.get(oR.id);
                if (!oInst) return false;
                let d = oInst.distanceMeters - instance.distanceMeters;
                if (d < -totalCircuitLength * 0.5) d += totalCircuitLength;
                if (d > totalCircuitLength * 0.5) d -= totalCircuitLength;
                const oInAltLane =
                  Math.abs(oInst.targetLane - altLane) < 1.0 ||
                  Math.abs(oInst.laneOffset - altLane) < 1.4;
                return oInAltLane && d >= -5.0 && d <= 8.0;
              });

              if (isAltLaneClear && instance.targetLane !== altLane) {
                instance.targetLane = altLane;
              }
            } else if (instance.targetLane === LANE_PASSING && !racer.isBoosting) {
              const isDrivingLaneClear = !currentRacers.some((oR) => {
                if (oR.id === racer.id) return false;
                const oInst = kartMap.get(oR.id);
                if (!oInst) return false;
                let d = oInst.distanceMeters - instance.distanceMeters;
                if (d < -totalCircuitLength * 0.5) d += totalCircuitLength;
                if (d > totalCircuitLength * 0.5) d -= totalCircuitLength;
                const oInDrivingLane =
                  Math.abs(oInst.targetLane - LANE_DRIVING) < 1.0 ||
                  Math.abs(oInst.laneOffset - LANE_DRIVING) < 1.4;
                return oInDrivingLane && d >= -5.0 && d <= 32.0;
              });

              if (isDrivingLaneClear) {
                instance.targetLane = LANE_DRIVING;
              }
            }
          }

          for (const otherRacer of currentRacers) {
            if (otherRacer.id === racer.id) continue;
            const other = kartMap.get(otherRacer.id);
            if (!other) continue;

            let distAhead = other.distanceMeters - instance.distanceMeters;
            if (distAhead < -totalCircuitLength * 0.5) distAhead += totalCircuitLength;
            if (distAhead > totalCircuitLength * 0.5) distAhead -= totalCircuitLength;

            const isSameLane =
              Math.abs(instance.targetLane - other.targetLane) < 0.8 &&
              Math.abs(instance.laneOffset - other.laneOffset) < 1.2;

            if (isSameLane && distAhead > 0.1 && distAhead < 2.8) {
              instance.speedKmh = Math.min(instance.speedKmh, other.speedKmh * 0.98);
              if (instance.catchUpSpeedMs && instance.catchUpSpeedMs > 0) {
                instance.catchUpSpeedMs = Math.min(instance.catchUpSpeedMs, 0.5);
              }
            }

            if (Math.abs(distAhead) < 1.2 && Math.abs(instance.laneOffset - other.laneOffset) < 0.8) {
              if (instance.laneOffset >= other.laneOffset) {
                instance.targetLane = LANE_PASSING;
                instance.laneOffset = Math.min(LANE_PASSING, instance.laneOffset + 0.15);
              } else {
                instance.targetLane = LANE_DRIVING;
                instance.laneOffset = Math.max(LANE_DRIVING, instance.laneOffset - 0.15);
              }
            }
          }
        }

        const laneChangeSpeed = 3.2;
        instance.laneOffset +=
          (instance.targetLane - instance.laneOffset) * Math.min(1.0, dt * laneChangeSpeed);
      }

      // 2. Render Karts on Spline & Compile Telemetry
      const activeId =
        activeRacerIdRef.current || (currentRacers[0] ? currentRacers[0].id : undefined);
      const currentCamMode = cameraModeRef.current || (mode === 'STUDENT_COCKPIT' ? 'COCKPIT' : 'DIRECTOR');

      const telemetryList: RacerTelemetry[] = [];

      for (const racer of currentRacers) {
        const instance = kartMap.get(racer.id);
        if (!instance) continue;

        const normalizedProgress =
          (((instance.distanceMeters % totalCircuitLength) + totalCircuitLength) %
            totalCircuitLength) /
          totalCircuitLength;
        const currentLap = Math.max(1, Math.floor(instance.distanceMeters / totalCircuitLength) + 1);
        const continuousProgress = Math.max(0, instance.distanceMeters / totalCircuitLength);

        const evalRes = trackWorld.evaluate(normalizedProgress, instance.laneOffset);
        const root = instance.kartObj.kartRoot;

        // In pure bumper camera mode, hide the active player's own kart to ensure 100% unobstructed road view
        const isUser = racer.id === activeId;
        if (isUser && currentCamMode === 'FIRST_PERSON') {
          root.visible = false;
        } else {
          root.visible = true;
        }

        root.position.copy(evalRes.position);
        if (racer.inPitStop) {
          root.position.x += (Math.random() - 0.5) * 0.15;
          root.position.y += 0.25;
          root.position.z += (Math.random() - 0.5) * 0.15;
        } else {
          root.position.y += 0.25;
        }

        if (instance.kartObj.setLabelVisible) {
          const distToCam = camera.position.distanceTo(root.position);
          instance.kartObj.setLabelVisible(distToCam < 90.0);
        }

        root.quaternion.copy(evalRes.quaternion);

        const cornerLimit = getSuzukaCornerSpeedLimit(normalizedProgress);
        const isBoosting = !!racer.isBoosting || racer.streak >= 3;
        const isBraking =
          !!racer.inPitStop || (cornerLimit < 175 && instance.speedKmh > cornerLimit * 0.82);
        if (instance.kartObj.updateKartVisuals) {
          instance.kartObj.updateKartVisuals(dt, {
            speed: instance.speedKmh / 3.6,
            steerAngle: 0,
            boostActive: isBoosting ? 1 : 0,
            nightFactor: currentNightFactor,
            isBraking,
            weatherSprayMode: currentWeatherSprayMode,
            tangent: evalRes.tangent,
            normal: evalRes.normal,
            right: evalRes.right,
          });
        }

        telemetryList.push({
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
          isPassingLane: instance.targetLane === LANE_PASSING,
        });
      }

      // Throttled 2 Hz React telemetry sync (prevents main-thread choking)
      telemetryTimer += dt;
      if (telemetryTimer > 0.45) {
        telemetryTimer = 0;
        if (onTelemetryRef.current) {
          onTelemetryRef.current(telemetryList);
        }
      }

      // 3. Steadicam Camera Damping & Smart Overtake-Aware F1 Director
      const activeInstance = activeId ? kartMap.get(activeId) : undefined;

      _sortedTelemetry.length = 0;
      for (let i = 0; i < telemetryList.length; i++) {
        _sortedTelemetry.push(telemetryList[i]);
      }
      _sortedTelemetry.sort((a, b) => b.distanceMeters - a.distanceMeters);
      const sortedTelemetry = _sortedTelemetry;
      const leaderTelem = sortedTelemetry[0];

      let activeBattle: OvertakeBattle | null = null;

      if (battleLock) {
        const lock = battleLock;
        const aheadTelem = telemetryList.find((r) => r.id === lock.aheadId);
        const chaserTelem = telemetryList.find((r) => r.id === lock.chaserId);

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
          const aheadRank = sortedTelemetry.findIndex((r) => r.id === realAhead.id) + 1;

          if ((currentGap > 50.0 && timeLocked >= lock.minHoldSec) || timeLocked > lock.maxHoldSec) {
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
          battleLock = {
            aheadId: candidate.ahead.id,
            chaserId: candidate.chaser.id,
            lockedAtSec: elapsedTime,
            minHoldSec: 5.5,
            maxHoldSec: 12.0,
            angleIndex: Math.floor(Math.random() * 4),
            angleTimer: 0,
          };
          activeBattle = candidate;
        }
      }

      let nextBadgeText = '';

      const frameBattleCamera = (battle: OvertakeBattle, angleIdx: number = 0) => {
        const chaserEval = trackWorld.evaluate(battle.chaser.progress, battle.chaser.laneOffset);
        const aheadEval = trackWorld.evaluate(battle.ahead.progress, battle.ahead.laneOffset);
        const midProgress = ((battle.chaser.progress + battle.ahead.progress) / 2 + 1) % 1;
        const midLane = (battle.chaser.laneOffset + battle.ahead.laneOffset) / 2;
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
          targetCamPos
            .copy(aheadEval.position)
            .addScaledVector(aheadEval.tangent, 10.5)
            .addScaledVector(aheadEval.right, 1.8);
          targetCamPos.y += 3.2;
          targetCamLook.copy(chaserEval.position).addScaledVector(chaserEval.tangent, -5.0);
          targetCamLook.y += 1.0;
          angleLabel = 'HEAD-ON DEFENDER';
        } else {
          const backDist = 11.5 + Math.min(8.0, battle.gapMeters * 0.22);
          const heightOffset = 4.4 + Math.min(3.5, battle.gapMeters * 0.08);

          targetCamPos
            .copy(chaserEval.position)
            .addScaledVector(chaserEval.tangent, -backDist)
            .addScaledVector(chaserEval.right, 2.8);
          targetCamPos.y += heightOffset;

          targetCamLook.copy(aheadEval.position).addScaledVector(aheadEval.tangent, 12.0);
          targetCamLook.y += 1.3;
          angleLabel = 'REAR CHASE';
        }

        updateSectorDisplay(aheadEval.sector);
        return `⚔️ BATTLE CAM (${angleLabel}) · P${battle.rankAhead} #${battle.ahead.number} ${battle.ahead.name} vs P${battle.rankAhead + 1} #${battle.chaser.number} ${battle.chaser.name} (${Math.max(1, Math.round(battle.gapMeters))}m)`;
      };

      const frameLeaderCamera = () => {
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

      const framePackHelicopterCamera = () => {
        const topPack = sortedTelemetry.slice(0, Math.min(4, sortedTelemetry.length));
        if (topPack.length > 0) {
          _packCentroid.set(0, 0, 0);
          topPack.forEach((tItem) => {
            const ev = trackWorld.evaluate(tItem.progress, tItem.laneOffset);
            _packCentroid.add(ev.position);
          });
          _packCentroid.divideScalar(topPack.length);

          const orbitAngle = elapsedTime * 0.22;
          targetCamPos.set(
            _packCentroid.x + Math.cos(orbitAngle) * 68,
            _packCentroid.y + 44,
            _packCentroid.z + Math.sin(orbitAngle) * 68
          );
          targetCamLook.copy(_packCentroid);
          targetCamLook.y += 1.5;
          const leadEval = trackWorld.evaluate(topPack[0].progress, 0);
          updateSectorDisplay(leadEval.sector);
          return `🚁 HELICOPTER PACK CAM · Tracking Top ${topPack.length} Racers`;
        }
        targetCamPos.set(0, 320, 220);
        targetCamLook.set(0, 0, 0);
        return '🚁 HELICOPTER OVERVIEW';
      };

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
        nextBadgeText = framePackHelicopterCamera();
        currentCamPos.lerp(targetCamPos, 0.08);
        currentCamLook.lerp(targetCamLook, 0.08);
        camera.position.copy(currentCamPos);
        camera.lookAt(currentCamLook);
      } else if (currentCamMode === 'LEADER') {
        nextBadgeText = frameLeaderCamera();
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
          nextBadgeText = frameLeaderCamera();
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
        nextBadgeText = `📹 FIXED CAM: ${applyLandmarkCamera(lmId, telemetryList)}`;
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
          nextBadgeText = `🎬 AI DIRECTOR · ${applyLandmarkCamera('MAIN_STRAIGHT', telemetryList)}`;
        } else if (activeBattle && (directorPhaseIndex === 0 || directorPhaseIndex === 2)) {
          const angleIdx = battleLock ? battleLock.angleIndex : 0;
          nextBadgeText = `🎬 AI DIRECTOR · ${frameBattleCamera(activeBattle, angleIdx)}`;
        } else if (directorPhaseIndex === 1 && leaderTelem) {
          const focusProgress = activeBattle ? activeBattle.ahead.progress : leaderTelem.progress;
          const activeLandmark = findNearestLandmark(focusProgress);
          const lmDesc = applyLandmarkCamera(activeLandmark, telemetryList);
          const lmEval = trackWorld.evaluate(focusProgress, 0);
          updateSectorDisplay(lmEval.sector);
          nextBadgeText = `🎬 AI DIRECTOR · ${lmDesc}`;
        } else if (directorPhaseIndex === 3 && sortedTelemetry.length > 1) {
          nextBadgeText = `🎬 AI DIRECTOR · ${framePackHelicopterCamera()}`;
        } else {
          nextBadgeText = `🎬 AI DIRECTOR · ${frameLeaderCamera()}`;
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

      // Throttle full material/light atmosphere evaluation to every 2nd frame (~30Hz) or when not Le Mans
      if (frameCount % 2 === 1 || timeOfDayRef.current === 'LE_MANS_CYCLE') {
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

      if (precipSystem) {
        precipSystem.uniforms.uTime.value = elapsedTime;
        precipSystem.uniforms.uCameraPos.value.copy(camera.position);
      }

      // Celebration Fireworks over Main Straight when racers finish or during the 24h Le Mans finale
      const anyRacerFinished =
        currentRacers.some((r) => !!r.isFinished) ||
        (!!leaderTelem && leaderTelem.lap > Math.max(1, targetLapsRef.current || 2));
      const leMansFinale =
        timeOfDayRef.current === 'LE_MANS_CYCLE' && smoothedLeMansProgress > 0.88;
      const shouldShowFireworks = isGreenFlag && (anyRacerFinished || leMansFinale);
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
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    return () => {
      isDisposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      domElement.removeEventListener('webglcontextlost', onContextLost);
      domElement.removeEventListener('webglcontextrestored', onContextRestored);

      for (const inst of kartMap.values()) {
        inst.kartObj.disposeKart?.();
      }
      kartMap.clear();

      // Dispose all track geometries and non-shared materials/textures
      for (const group of [trackWorld.root, kartsRootGroup]) {
        group.traverse((obj) => {
          if ((obj as THREE.Mesh).isMesh || (obj as THREE.Sprite).isSprite) {
            const mesh = obj as THREE.Mesh;
            if (mesh.geometry && !mesh.geometry.userData?.isSharedResource) {
              mesh.geometry.dispose();
            }
            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            mats.forEach((m) => {
              if (!m || m.userData?.isSharedResource) return;
              if ((obj as THREE.Sprite).isSprite) {
                const spMap = (m as THREE.SpriteMaterial).map;
                if (spMap && !spMap.userData?.isSharedResource) {
                  spMap.dispose();
                }
              }
              m.dispose();
            });
          }
        });
      }

      precipSystem?.dispose();
      fireworksSystem.dispose();
      skyDome.geometry.dispose();
      skyDome.material.dispose();
      envTexture.dispose();
      scene.clear();
      cleanupClassroomRenderer();
    };
  }, [performanceProfile, mode, trackTheme, precipitation, contextRestartKey]);

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
          className="absolute bottom-3 right-3 max-w-[calc(100%-17.5rem)] z-10 pointer-events-none"
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
