import * as THREE from 'three';
import { getWindowPaneTexture, getAsphaltRoadTexture } from './models/wallTextures';

export type TimeOfDay = 'MORNING' | 'DAY' | 'SUNSET' | 'NIGHT';
export type InspectorLightingMode = 'SUNRISE' | 'NOON' | 'SUNSET' | 'MIDNIGHT';

export type WeatherMode =
  | 'CLEAR'
  | 'LIGHT_RAIN'
  | 'HEAVY_RAIN'
  | 'LIGHT_SNOW'
  | 'HEAVY_SNOW'
  | 'SAKURA';

export interface TimeOfDayPreset {
  id: TimeOfDay;
  inspectorId: InspectorLightingMode;
  labelEn: string;
  labelJa: string;
  clockLabel: string;
  skyColor: number;
  horizonColor: number;
  groundColor: number;
  ambientColor: number;
  ambientIntensity: number;
  hemiSkyColor: number;
  hemiGroundColor: number;
  hemiIntensity: number;
  sunColor: number;
  sunIntensity: number;
  sunPosition: [number, number, number];
  fogDensity: number;
  toneMappingExposure: number;
  environmentIntensity: number;
  windowGlowColor: number;
  windowGlowIntensity: number;
  signageGlowIntensity: number;
  streetlightLevel: number;
  playerLampIntensity: number;
  playerHeadlightIntensity: number;
}

export interface WeatherPreset {
  id: WeatherMode;
  labelEn: string;
  labelJa: string;
  shortLabel: string;
  particleCount: number;
  splashCount: number;
  fallSpeedMin: number;
  fallSpeedMax: number;
  windX: number;
  windZ: number;
  swayAmp: number;
  swayFreq: number;
  streakLength: number;
  overcastFactor: number;
  fogMultiplier: number;
  wetness: number;
  snowCover: number;
  skyTintHex: number;
  skyTintStrength: number;
}

export interface CompositeAtmosphere {
  timeOfDay: TimeOfDay;
  weather: WeatherMode;
  skyColor: number;
  fogColor: number;
  fogDensity: number;
  groundColor: number;
  ambientColor: number;
  ambientIntensity: number;
  hemiSkyColor: number;
  hemiGroundColor: number;
  hemiIntensity: number;
  sunColor: number;
  sunIntensity: number;
  sunPosition: [number, number, number];
  toneMappingExposure: number;
  environmentIntensity: number;
  windowGlowColor: number;
  windowGlowIntensity: number;
  signageGlowIntensity: number;
  streetlightLevel: number;
  playerLampIntensity: number;
  playerHeadlightIntensity: number;
  roadRoughness: number;
  roadMetalness: number;
  roadColorHex: number;
  skyboxTintHex: number;
}

export const TIME_OF_DAY_ORDER: TimeOfDay[] = ['MORNING', 'DAY', 'SUNSET', 'NIGHT'];

export const WEATHER_MODE_ORDER: WeatherMode[] = [
  'CLEAR',
  'LIGHT_RAIN',
  'HEAVY_RAIN',
  'LIGHT_SNOW',
  'HEAVY_SNOW',
  'SAKURA',
];

export const TIME_OF_DAY_PRESETS: Record<TimeOfDay, TimeOfDayPreset> = {
  MORNING: {
    id: 'MORNING',
    inspectorId: 'SUNRISE',
    labelEn: 'Sunrise',
    labelJa: '朝焼け',
    clockLabel: '06:30',
    skyColor: 0xfed7aa,
    horizonColor: 0xffedd5,
    groundColor: 0x86efac,
    ambientColor: 0xffedd5,
    ambientIntensity: 0.72,
    hemiSkyColor: 0xfde68a,
    hemiGroundColor: 0x64748b,
    hemiIntensity: 0.62,
    sunColor: 0xfb923c,
    sunIntensity: 1.45,
    sunPosition: [-52, 26, 38],
    fogDensity: 0.0022,
    toneMappingExposure: 1.06,
    environmentIntensity: 0.38,
    windowGlowColor: 0xfef08a,
    windowGlowIntensity: 0.14,
    signageGlowIntensity: 0.2,
    streetlightLevel: 0.15,
    playerLampIntensity: 0.25,
    playerHeadlightIntensity: 0.3,
  },
  DAY: {
    id: 'DAY',
    inspectorId: 'NOON',
    labelEn: 'Daytime',
    labelJa: '昼下がり',
    clockLabel: '12:00',
    skyColor: 0xbae6fd,
    horizonColor: 0xe0f2fe,
    groundColor: 0x86efac,
    ambientColor: 0xffffff,
    ambientIntensity: 0.82,
    hemiSkyColor: 0xffffff,
    hemiGroundColor: 0x86efac,
    hemiIntensity: 0.65,
    sunColor: 0xfffbeb,
    sunIntensity: 1.65,
    sunPosition: [38, 68, 42],
    fogDensity: 0.0016,
    toneMappingExposure: 1.1,
    environmentIntensity: 0.45,
    windowGlowColor: 0xfef08a,
    windowGlowIntensity: 0.0,
    signageGlowIntensity: 0.0,
    streetlightLevel: 0.0,
    playerLampIntensity: 0.0,
    playerHeadlightIntensity: 0.0,
  },
  SUNSET: {
    id: 'SUNSET',
    inspectorId: 'SUNSET',
    labelEn: 'Sunset',
    labelJa: '夕暮れ',
    clockLabel: '17:45',
    skyColor: 0xfdba74,
    horizonColor: 0xfef08a,
    groundColor: 0xa3e635,
    ambientColor: 0xfed7aa,
    ambientIntensity: 0.58,
    hemiSkyColor: 0xf97316,
    hemiGroundColor: 0x334155,
    hemiIntensity: 0.58,
    sunColor: 0xea580c,
    sunIntensity: 1.95,
    sunPosition: [-58, 19, -36],
    fogDensity: 0.0024,
    toneMappingExposure: 1.04,
    environmentIntensity: 0.32,
    windowGlowColor: 0xfde047,
    windowGlowIntensity: 0.58,
    signageGlowIntensity: 0.65,
    streetlightLevel: 0.68,
    playerLampIntensity: 1.35,
    playerHeadlightIntensity: 1.6,
  },
  NIGHT: {
    id: 'NIGHT',
    inspectorId: 'MIDNIGHT',
    labelEn: 'Night',
    labelJa: '夜空',
    clockLabel: '22:15',
    skyColor: 0x0b1120,
    horizonColor: 0x1e293b,
    groundColor: 0x1e293b,
    ambientColor: 0x38bdf8,
    ambientIntensity: 0.36,
    hemiSkyColor: 0x1e293b,
    hemiGroundColor: 0x020617,
    hemiIntensity: 0.42,
    sunColor: 0x60a5fa,
    sunIntensity: 0.52,
    sunPosition: [-32, 48, -32],
    fogDensity: 0.0022,
    toneMappingExposure: 0.96,
    environmentIntensity: 0.16,
    windowGlowColor: 0xfef08a,
    windowGlowIntensity: 0.92,
    signageGlowIntensity: 1.0,
    streetlightLevel: 1.0,
    playerLampIntensity: 2.6,
    playerHeadlightIntensity: 3.2,
  },
};

export const WEATHER_PRESETS: Record<WeatherMode, WeatherPreset> = {
  CLEAR: {
    id: 'CLEAR',
    labelEn: 'Clear Sky',
    labelJa: '快晴',
    shortLabel: 'Clear',
    particleCount: 0,
    splashCount: 0,
    fallSpeedMin: 0,
    fallSpeedMax: 0,
    windX: 0,
    windZ: 0,
    swayAmp: 0,
    swayFreq: 0,
    streakLength: 0,
    overcastFactor: 0,
    fogMultiplier: 1.0,
    wetness: 0,
    snowCover: 0,
    skyTintHex: 0xffffff,
    skyTintStrength: 0,
  },
  LIGHT_RAIN: {
    id: 'LIGHT_RAIN',
    labelEn: 'Light Rain',
    labelJa: '小雨',
    shortLabel: 'Light Rain',
    particleCount: 650,
    splashCount: 55,
    fallSpeedMin: 14.5,
    fallSpeedMax: 18.5,
    windX: 1.4,
    windZ: 0.6,
    swayAmp: 0.05,
    swayFreq: 1.5,
    streakLength: 0.72,
    overcastFactor: 0.38,
    fogMultiplier: 1.45,
    wetness: 0.65,
    snowCover: 0,
    skyTintHex: 0x94a3b8,
    skyTintStrength: 0.35,
  },
  HEAVY_RAIN: {
    id: 'HEAVY_RAIN',
    labelEn: 'Heavy Rain',
    labelJa: '本降り・豪雨',
    shortLabel: 'Heavy Rain',
    particleCount: 1500,
    splashCount: 110,
    fallSpeedMin: 21.0,
    fallSpeedMax: 27.0,
    windX: 3.6,
    windZ: 1.5,
    swayAmp: 0.1,
    swayFreq: 2.4,
    streakLength: 1.15,
    overcastFactor: 0.72,
    fogMultiplier: 2.15,
    wetness: 1.0,
    snowCover: 0,
    skyTintHex: 0x64748b,
    skyTintStrength: 0.62,
  },
  LIGHT_SNOW: {
    id: 'LIGHT_SNOW',
    labelEn: 'Light Snow',
    labelJa: '小雪・粉雪',
    shortLabel: 'Light Snow',
    particleCount: 600,
    splashCount: 0,
    fallSpeedMin: 1.5,
    fallSpeedMax: 2.8,
    windX: 0.65,
    windZ: 0.35,
    swayAmp: 0.85,
    swayFreq: 1.6,
    streakLength: 0,
    overcastFactor: 0.32,
    fogMultiplier: 1.4,
    wetness: 0.15,
    snowCover: 0.55,
    skyTintHex: 0xe2e8f0,
    skyTintStrength: 0.38,
  },
  HEAVY_SNOW: {
    id: 'HEAVY_SNOW',
    labelEn: 'Heavy Snow',
    labelJa: '大雪・吹雪',
    shortLabel: 'Heavy Snow',
    particleCount: 1350,
    splashCount: 0,
    fallSpeedMin: 2.6,
    fallSpeedMax: 4.6,
    windX: 2.4,
    windZ: 1.2,
    swayAmp: 1.35,
    swayFreq: 2.3,
    streakLength: 0,
    overcastFactor: 0.68,
    fogMultiplier: 2.25,
    wetness: 0.2,
    snowCover: 0.92,
    skyTintHex: 0xcbd5e1,
    skyTintStrength: 0.65,
  },
  SAKURA: {
    id: 'SAKURA',
    labelEn: 'Sakura Petals',
    labelJa: '桜吹雪',
    shortLabel: 'Sakura',
    particleCount: 520,
    splashCount: 0,
    fallSpeedMin: 1.1,
    fallSpeedMax: 2.2,
    windX: 1.35,
    windZ: 0.75,
    swayAmp: 1.45,
    swayFreq: 1.85,
    streakLength: 0,
    overcastFactor: 0.0,
    fogMultiplier: 1.05,
    wetness: 0.0,
    snowCover: 0.0,
    skyTintHex: 0xfce7f3,
    skyTintStrength: 0.12,
  },
};

export function inspectorModeToTimeOfDay(mode: InspectorLightingMode): TimeOfDay {
  switch (mode) {
    case 'SUNRISE':
      return 'MORNING';
    case 'NOON':
      return 'DAY';
    case 'SUNSET':
      return 'SUNSET';
    case 'MIDNIGHT':
      return 'NIGHT';
  }
}

export function timeOfDayToInspectorMode(time: TimeOfDay): InspectorLightingMode {
  return TIME_OF_DAY_PRESETS[time].inspectorId;
}

/**
 * Pure RGB hex color linear interpolation
 */
export function lerpHexColor(hexA: number, hexB: number, t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  const rA = (hexA >> 16) & 0xff;
  const gA = (hexA >> 8) & 0xff;
  const bA = hexA & 0xff;

  const rB = (hexB >> 16) & 0xff;
  const gB = (hexB >> 8) & 0xff;
  const bB = hexB & 0xff;

  const r = Math.round(rA + (rB - rA) * clamped);
  const g = Math.round(gA + (gB - gA) * clamped);
  const b = Math.round(bA + (bB - bA) * clamped);

  return (r << 16) | (g << 8) | b;
}

/**
 * Computes the complete composite lighting, fog, exposure, road wetness, snow cover,
 * and window/streetlamp illumination state for any (TimeOfDay, WeatherMode) pair.
 */
export function getCompositeAtmosphere(
  timeOfDay: TimeOfDay,
  weather: WeatherMode
): CompositeAtmosphere {
  const tPreset = TIME_OF_DAY_PRESETS[timeOfDay];
  const wPreset = WEATHER_PRESETS[weather];

  // At night, keep overcast tint dark slate-blue rather than bright daytime grey
  const effectiveSkyTint =
    timeOfDay === 'NIGHT'
      ? lerpHexColor(0x0f172a, wPreset.skyTintHex, 0.18)
      : wPreset.skyTintHex;

  const skyColor = lerpHexColor(tPreset.skyColor, effectiveSkyTint, wPreset.skyTintStrength);
  const fogColor =
    weather === 'SAKURA' && timeOfDay !== 'NIGHT'
      ? lerpHexColor(skyColor, 0xfdf2f8, 0.22)
      : skyColor;

  const fogDensity = Number((tPreset.fogDensity * wPreset.fogMultiplier).toFixed(5));

  // Snow frosts the grass meadow & ground toward winter white/ice-blue; rain deepens foliage saturation
  let groundColor = tPreset.groundColor;
  if (wPreset.snowCover > 0) {
    const snowGroundTarget = timeOfDay === 'NIGHT' ? 0x475569 : 0xe2e8f0;
    groundColor = lerpHexColor(groundColor, snowGroundTarget, wPreset.snowCover * 0.78);
  } else if (wPreset.wetness > 0) {
    const wetGroundTarget = timeOfDay === 'NIGHT' ? 0x0f172a : 0x4ade80;
    groundColor = lerpHexColor(groundColor, wetGroundTarget, wPreset.wetness * 0.35);
  }

  // Sunlight softens under storm clouds while hemisphere/ambient fill balances shadows
  const sunAttenuation = 1.0 - wPreset.overcastFactor * (timeOfDay === 'NIGHT' ? 0.25 : 0.55);
  const sunIntensity = Number((tPreset.sunIntensity * sunAttenuation).toFixed(3));
  const sunColor =
    wPreset.overcastFactor > 0.2
      ? lerpHexColor(tPreset.sunColor, 0xe2e8f0, wPreset.overcastFactor * 0.45)
      : tPreset.sunColor;

  const ambientIntensity = Number(
    (tPreset.ambientIntensity * (1.0 + wPreset.overcastFactor * 0.12)).toFixed(3)
  );
  const hemiIntensity = Number(
    (tPreset.hemiIntensity * (1.0 - wPreset.overcastFactor * 0.15)).toFixed(3)
  );

  // Cozy interior windows and streetlamps turn on earlier during rain/snow storms!
  const weatherLampBoost =
    wPreset.overcastFactor >= 0.65 ? 0.45 : wPreset.overcastFactor >= 0.3 ? 0.25 : 0.0;
  const streetlightLevel = Math.min(1.0, Number((tPreset.streetlightLevel + weatherLampBoost).toFixed(2)));
  const windowGlowIntensity = Math.min(
    1.0,
    Number((tPreset.windowGlowIntensity + weatherLampBoost * 0.75).toFixed(2))
  );
  const signageGlowIntensity = Math.min(
    1.0,
    Number((tPreset.signageGlowIntensity + weatherLampBoost * 0.65).toFixed(2))
  );

  const playerLampIntensity = Number(
    Math.max(tPreset.playerLampIntensity, weatherLampBoost * 1.8).toFixed(2)
  );
  const playerHeadlightIntensity = Number(
    Math.max(tPreset.playerHeadlightIntensity, weatherLampBoost * 2.1).toFixed(2)
  );

  // Wet asphalt road reflection in rain vs frosted road in snow
  const baseRoadRoughness = 0.86;
  const roadRoughness = Number(
    Math.max(0.12, baseRoadRoughness - wPreset.wetness * 0.72 + wPreset.snowCover * 0.08).toFixed(2)
  );
  const roadMetalness = Number((0.05 + wPreset.wetness * 0.26).toFixed(2));
  let roadColorHex = 0x475569;
  if (wPreset.wetness > 0) {
    roadColorHex = lerpHexColor(0x475569, 0x1e293b, wPreset.wetness * 0.65);
  } else if (wPreset.snowCover > 0) {
    roadColorHex = lerpHexColor(0x475569, 0x94a3b8, wPreset.snowCover * 0.65);
  }

  const skyboxTintHex = lerpHexColor(0xffffff, effectiveSkyTint, wPreset.skyTintStrength * 0.85);

  const toneMappingExposure = Number(
    (tPreset.toneMappingExposure * (1.0 - wPreset.overcastFactor * 0.08)).toFixed(3)
  );
  const environmentIntensity = Number(
    (tPreset.environmentIntensity * (1.0 + wPreset.wetness * 0.25)).toFixed(3)
  );

  return {
    timeOfDay,
    weather,
    skyColor,
    fogColor,
    fogDensity,
    groundColor,
    ambientColor: tPreset.ambientColor,
    ambientIntensity,
    hemiSkyColor: skyColor,
    hemiGroundColor: groundColor,
    hemiIntensity,
    sunColor,
    sunIntensity,
    sunPosition: [...tPreset.sunPosition],
    toneMappingExposure,
    environmentIntensity,
    windowGlowColor: tPreset.windowGlowColor,
    windowGlowIntensity,
    signageGlowIntensity,
    streetlightLevel,
    playerLampIntensity,
    playerHeadlightIntensity,
    roadRoughness,
    roadMetalness,
    roadColorHex,
    skyboxTintHex,
  };
}

// ============================================================================
// PURE 3D WEATHER PARTICLE SIMULATION STATE & STEPPER (Unit-Testable)
// ============================================================================

export interface WeatherSimulationBuffer {
  maxParticles: number;
  maxSplashes: number;
  spanX: number;
  heightY: number;
  spanZ: number;
  positions: Float32Array; // 3 * maxParticles (x, y, z)
  velocities: Float32Array; // 3 * maxParticles (vx, vy, vz)
  phases: Float32Array; // maxParticles
  rotations: Float32Array; // 3 * maxParticles (rx, ry, rz) for 3D Sakura petals
  rotSpeeds: Float32Array; // 3 * maxParticles (vrx, vry, vrz)
  scales: Float32Array; // maxParticles
  splashPositions: Float32Array; // 3 * maxSplashes (x, y, z)
  splashProgress: Float32Array; // maxSplashes [0..1]
}

export function createWeatherSimulationBuffer(
  maxParticles = 1500,
  maxSplashes = 110,
  spanX = 46,
  heightY = 22,
  spanZ = 46
): WeatherSimulationBuffer {
  const positions = new Float32Array(maxParticles * 3);
  const velocities = new Float32Array(maxParticles * 3);
  const phases = new Float32Array(maxParticles);
  const rotations = new Float32Array(maxParticles * 3);
  const rotSpeeds = new Float32Array(maxParticles * 3);
  const scales = new Float32Array(maxParticles);
  const splashPositions = new Float32Array(maxSplashes * 3);
  const splashProgress = new Float32Array(maxSplashes);

  let seed = 13379;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let i = 0; i < maxParticles; i++) {
    const i3 = i * 3;
    positions[i3] = (rand() - 0.5) * spanX;
    positions[i3 + 1] = rand() * heightY;
    positions[i3 + 2] = (rand() - 0.5) * spanZ;

    velocities[i3] = (rand() - 0.5) * 0.4;
    velocities[i3 + 1] = -(1.0 + rand());
    velocities[i3 + 2] = (rand() - 0.5) * 0.4;

    phases[i] = rand() * Math.PI * 2;

    rotations[i3] = rand() * Math.PI * 2;
    rotations[i3 + 1] = rand() * Math.PI * 2;
    rotations[i3 + 2] = rand() * Math.PI * 2;

    rotSpeeds[i3] = (rand() - 0.5) * 3.2;
    rotSpeeds[i3 + 1] = (rand() - 0.5) * 3.2;
    rotSpeeds[i3 + 2] = (rand() - 0.5) * 3.2;

    scales[i] = 0.75 + rand() * 0.55;
  }

  for (let s = 0; s < maxSplashes; s++) {
    const s3 = s * 3;
    splashPositions[s3] = (rand() - 0.5) * (spanX * 0.7);
    splashPositions[s3 + 1] = 0.08;
    splashPositions[s3 + 2] = (rand() - 0.5) * (spanZ * 0.7);
    splashProgress[s] = rand();
  }

  return {
    maxParticles,
    maxSplashes,
    spanX,
    heightY,
    spanZ,
    positions,
    velocities,
    phases,
    rotations,
    rotSpeeds,
    scales,
    splashPositions,
    splashProgress,
  };
}

/**
 * Pure, zero-allocation particle stepper that wraps particles around (centerX, centerZ)
 * so weather always surrounds the player or camera seamlessly.
 */
export function stepWeatherSimulation(
  buf: WeatherSimulationBuffer,
  weather: WeatherMode,
  deltaSec: number,
  elapsedSec: number,
  centerX: number,
  centerZ: number
): void {
  const preset = WEATHER_PRESETS[weather];
  if (preset.particleCount <= 0) return;

  const dt = Math.max(0.001, Math.min(deltaSec, 0.1));
  const count = Math.min(buf.maxParticles, preset.particleCount);
  const halfX = buf.spanX * 0.5;
  const halfZ = buf.spanZ * 0.5;
  const speedSpan = preset.fallSpeedMax - preset.fallSpeedMin;

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const phase = buf.phases[i];
    const normSeed = (phase / (Math.PI * 2)) % 1;
    const fallSpeed = preset.fallSpeedMin + normSeed * speedSpan;

    // Horizontal breeze + sinusoidal flutter for snow & sakura
    const swayX = Math.sin(elapsedSec * preset.swayFreq + phase) * preset.swayAmp;
    const swayZ = Math.cos(elapsedSec * (preset.swayFreq * 0.85) + phase * 1.3) * preset.swayAmp;

    const vx = preset.windX + swayX;
    const vy = -fallSpeed;
    const vz = preset.windZ + swayZ;

    buf.velocities[i3] = vx;
    buf.velocities[i3 + 1] = vy;
    buf.velocities[i3 + 2] = vz;

    let px = buf.positions[i3] + vx * dt;
    let py = buf.positions[i3 + 1] + vy * dt;
    let pz = buf.positions[i3 + 2] + vz * dt;

    // Vertical wrap when hitting ground
    if (py < 0.05) {
      py = buf.heightY - (0.05 - py) % buf.heightY;
      // Re-distribute horizontally around current center
      const offsetSeedX = Math.sin(phase * 12.9898 + elapsedSec * 0.7) * 0.5;
      const offsetSeedZ = Math.cos(phase * 78.233 + elapsedSec * 0.5) * 0.5;
      px = centerX + offsetSeedX * buf.spanX;
      pz = centerZ + offsetSeedZ * buf.spanZ;
    } else if (py > buf.heightY) {
      py = py % buf.heightY;
    }

    // Horizontal toroidal wrap around (centerX, centerZ)
    const dx = px - centerX;
    if (dx < -halfX) {
      px += buf.spanX * Math.ceil((-halfX - dx) / buf.spanX);
    } else if (dx > halfX) {
      px -= buf.spanX * Math.ceil((dx - halfX) / buf.spanX);
    }

    const dz = pz - centerZ;
    if (dz < -halfZ) {
      pz += buf.spanZ * Math.ceil((-halfZ - dz) / buf.spanZ);
    } else if (dz > halfZ) {
      pz -= buf.spanZ * Math.ceil((dz - halfZ) / buf.spanZ);
    }

    buf.positions[i3] = px;
    buf.positions[i3 + 1] = py;
    buf.positions[i3 + 2] = pz;

    if (weather === 'SAKURA') {
      buf.rotations[i3] += buf.rotSpeeds[i3] * dt;
      buf.rotations[i3 + 1] += buf.rotSpeeds[i3 + 1] * dt;
      buf.rotations[i3 + 2] += buf.rotSpeeds[i3 + 2] * dt;
    }
  }

  // Step ground rain splash ripples
  const splashCount = Math.min(buf.maxSplashes, preset.splashCount);
  if (splashCount > 0) {
    const splashSpanX = buf.spanX * 0.65;
    const splashSpanZ = buf.spanZ * 0.65;
    const splashRate = weather === 'HEAVY_RAIN' ? 3.4 : 2.2;
    for (let s = 0; s < splashCount; s++) {
      const s3 = s * 3;
      let prog = buf.splashProgress[s] + dt * splashRate;
      if (prog >= 1.0) {
        prog = prog % 1.0;
        const angle = (s * 2.39996 + elapsedSec * 1.7) % (Math.PI * 2);
        const radX = ((Math.sin(s * 17.3 + elapsedSec) + 1) * 0.5) * splashSpanX * 0.5;
        const radZ = ((Math.cos(s * 31.7 + elapsedSec) + 1) * 0.5) * splashSpanZ * 0.5;
        buf.splashPositions[s3] = centerX + Math.cos(angle) * radX;
        buf.splashPositions[s3 + 1] = 0.08;
        buf.splashPositions[s3 + 2] = centerZ + Math.sin(angle) * radZ;
      }
      buf.splashProgress[s] = prog;
    }
  }
}

// ============================================================================
// THREE.JS 3D WEATHER PARTICLE CONTROLLER (Rain Streaks, Snowflakes, 3D Sakura)
// ============================================================================

let cachedSnowflakeTexture: THREE.CanvasTexture | null = null;
let cachedSplashRingTexture: THREE.CanvasTexture | null = null;

function getSnowflakeSpriteTexture(): THREE.CanvasTexture {
  if (cachedSnowflakeTexture) return cachedSnowflakeTexture;
  if (typeof document === 'undefined') return new THREE.Texture() as unknown as THREE.CanvasTexture;

  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
  grad.addColorStop(0.45, 'rgba(241, 245, 249, 0.88)');
  grad.addColorStop(0.78, 'rgba(226, 232, 240, 0.35)');
  grad.addColorStop(1.0, 'rgba(226, 232, 240, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);

  // Subtle 6-point crystalline star arms
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.lineWidth = 2;
  for (let a = 0; a < 3; a++) {
    const angle = (a * Math.PI) / 3;
    ctx.beginPath();
    ctx.moveTo(32 - Math.cos(angle) * 20, 32 - Math.sin(angle) * 20);
    ctx.lineTo(32 + Math.cos(angle) * 20, 32 + Math.sin(angle) * 20);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  cachedSnowflakeTexture = tex;
  return tex;
}

function getSplashRingTexture(): THREE.CanvasTexture {
  if (cachedSplashRingTexture) return cachedSplashRingTexture;
  if (typeof document === 'undefined') return new THREE.Texture() as unknown as THREE.CanvasTexture;

  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  ctx.strokeStyle = 'rgba(224, 242, 254, 0.85)';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(32, 32, 22, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(186, 230, 253, 0.42)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(32, 32, 13, 0, Math.PI * 2);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  cachedSplashRingTexture = tex;
  return tex;
}

/**
 * Builds an authentic notched Japanese Sakura (Cherry Blossom) 3D petal BufferGeometry
 */
function buildSakuraPetalGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, -0.09);
  shape.bezierCurveTo(0.085, -0.06, 0.11, 0.04, 0.045, 0.11);
  // Characteristic V-notch at the tip of a cherry blossom petal
  shape.lineTo(0.015, 0.08);
  shape.lineTo(0, 0.095);
  shape.lineTo(-0.015, 0.08);
  shape.lineTo(-0.045, 0.11);
  shape.bezierCurveTo(-0.11, 0.04, -0.085, -0.06, 0, -0.09);

  const geo = new THREE.ShapeGeometry(shape, 5);
  geo.scale(1.25, 1.25, 1.25);
  return geo;
}

export interface WeatherParticleController {
  group: THREE.Group;
  buffer: WeatherSimulationBuffer;
  setWeather: (weather: WeatherMode) => void;
  update: (deltaSec: number, elapsedSec: number, centerX: number, centerZ: number) => void;
  dispose: () => void;
}

export function createWeatherParticleController(
  spanX = 48,
  heightY = 22,
  spanZ = 48
): WeatherParticleController {
  const group = new THREE.Group();
  group.name = 'WeatherParticleSystemGroup';

  const maxParticles = 1500;
  const maxSplashes = 110;
  const buffer = createWeatherSimulationBuffer(maxParticles, maxSplashes, spanX, heightY, spanZ);

  let currentWeather: WeatherMode = 'CLEAR';

  // 1. RAIN STREAKS (THREE.LineSegments: 2 vertices per raindrop)
  const rainPositions = new Float32Array(maxParticles * 6);
  const rainGeo = new THREE.BufferGeometry();
  const rainPosAttr = new THREE.BufferAttribute(rainPositions, 3);
  rainPosAttr.setUsage(THREE.DynamicDrawUsage);
  rainGeo.setAttribute('position', rainPosAttr);

  const rainMat = new THREE.LineBasicMaterial({
    color: 0xdbeafe,
    transparent: true,
    opacity: 0.62,
    depthWrite: false,
  });
  const rainLines = new THREE.LineSegments(rainGeo, rainMat);
  rainLines.frustumCulled = false;
  rainLines.visible = false;
  group.add(rainLines);

  // 1b. GROUND RAIN SPLASH RIPPLES (InstancedMesh)
  const splashGeo = new THREE.PlaneGeometry(0.46, 0.46);
  splashGeo.rotateX(-Math.PI / 2);
  const splashMat = new THREE.MeshBasicMaterial({
    map: getSplashRingTexture(),
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const splashInstanced = new THREE.InstancedMesh(splashGeo, splashMat, maxSplashes);
  splashInstanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  splashInstanced.frustumCulled = false;
  splashInstanced.visible = false;
  group.add(splashInstanced);

  // 2. SNOWFLAKES (THREE.Points with radial crystal sprite)
  const snowPositions = new Float32Array(maxParticles * 3);
  const snowGeo = new THREE.BufferGeometry();
  const snowPosAttr = new THREE.BufferAttribute(snowPositions, 3);
  snowPosAttr.setUsage(THREE.DynamicDrawUsage);
  snowGeo.setAttribute('position', snowPosAttr);

  const snowMat = new THREE.PointsMaterial({
    map: getSnowflakeSpriteTexture(),
    color: 0xffffff,
    size: 0.42,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const snowPoints = new THREE.Points(snowGeo, snowMat);
  snowPoints.frustumCulled = false;
  snowPoints.visible = false;
  group.add(snowPoints);

  // 3. SAKURA CHERRY BLOSSOM PETALS (3D Tumbling InstancedMesh)
  const maxSakura = 520;
  const sakuraGeo = buildSakuraPetalGeometry();
  const sakuraMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xfbcfe8,
    emissiveIntensity: 0.28,
    roughness: 0.6,
    metalness: 0.0,
    side: THREE.DoubleSide,
  });
  const sakuraInstanced = new THREE.InstancedMesh(sakuraGeo, sakuraMat, maxSakura);
  sakuraInstanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  sakuraInstanced.frustumCulled = false;
  sakuraInstanced.visible = false;

  // Assign soft multi-tone Sakura petal colors (#fce7f3, #fbcfe8, #f9a8d4, #f472b6)
  const petalPalette = [
    new THREE.Color(0xfce7f3),
    new THREE.Color(0xfbcfe8),
    new THREE.Color(0xf9a8d4),
    new THREE.Color(0xffd1dc),
  ];
  for (let i = 0; i < maxSakura; i++) {
    sakuraInstanced.setColorAt(i, petalPalette[i % petalPalette.length]);
  }
  if (sakuraInstanced.instanceColor) {
    sakuraInstanced.instanceColor.needsUpdate = true;
  }
  group.add(sakuraInstanced);

  const dummyObj = new THREE.Object3D();

  const setWeather = (weather: WeatherMode) => {
    currentWeather = weather;
    const preset = WEATHER_PRESETS[weather];

    const isRain = weather === 'LIGHT_RAIN' || weather === 'HEAVY_RAIN';
    const isSnow = weather === 'LIGHT_SNOW' || weather === 'HEAVY_SNOW';
    const isSakura = weather === 'SAKURA';

    rainLines.visible = isRain;
    splashInstanced.visible = isRain;
    snowPoints.visible = isSnow;
    sakuraInstanced.visible = isSakura;

    if (isRain) {
      rainGeo.setDrawRange(0, preset.particleCount * 2);
      rainMat.opacity = weather === 'HEAVY_RAIN' ? 0.76 : 0.56;
      rainMat.color.setHex(weather === 'HEAVY_RAIN' ? 0xe0f2fe : 0xbae6fd);
      splashInstanced.count = preset.splashCount;
    } else if (isSnow) {
      snowGeo.setDrawRange(0, preset.particleCount);
      snowMat.size = weather === 'HEAVY_SNOW' ? 0.52 : 0.38;
      snowMat.opacity = weather === 'HEAVY_SNOW' ? 0.96 : 0.86;
    } else if (isSakura) {
      sakuraInstanced.count = Math.min(maxSakura, preset.particleCount);
    }
  };

  const update = (deltaSec: number, elapsedSec: number, centerX: number, centerZ: number) => {
    if (currentWeather === 'CLEAR') return;

    stepWeatherSimulation(buffer, currentWeather, deltaSec, elapsedSec, centerX, centerZ);
    const preset = WEATHER_PRESETS[currentWeather];
    const count = Math.min(buffer.maxParticles, preset.particleCount);

    if (currentWeather === 'LIGHT_RAIN' || currentWeather === 'HEAVY_RAIN') {
      const streakScale = preset.streakLength / preset.fallSpeedMax;
      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        const i6 = i * 6;
        const px = buffer.positions[i3];
        const py = buffer.positions[i3 + 1];
        const pz = buffer.positions[i3 + 2];

        const vx = buffer.velocities[i3];
        const vy = buffer.velocities[i3 + 1];
        const vz = buffer.velocities[i3 + 2];

        rainPositions[i6] = px;
        rainPositions[i6 + 1] = py;
        rainPositions[i6 + 2] = pz;

        rainPositions[i6 + 3] = px - vx * streakScale;
        rainPositions[i6 + 4] = py - vy * streakScale;
        rainPositions[i6 + 5] = pz - vz * streakScale;
      }
      rainPosAttr.needsUpdate = true;

      // Update ground rain splash rings
      const sCount = Math.min(buffer.maxSplashes, preset.splashCount);
      for (let s = 0; s < sCount; s++) {
        const s3 = s * 3;
        const prog = buffer.splashProgress[s];
        const ringScale = 0.25 + prog * 1.15;
        dummyObj.position.set(
          buffer.splashPositions[s3],
          buffer.splashPositions[s3 + 1],
          buffer.splashPositions[s3 + 2]
        );
        dummyObj.rotation.set(0, 0, 0);
        dummyObj.scale.set(ringScale, ringScale, ringScale);
        dummyObj.updateMatrix();
        splashInstanced.setMatrixAt(s, dummyObj.matrix);
      }
      splashInstanced.instanceMatrix.needsUpdate = true;
    } else if (currentWeather === 'LIGHT_SNOW' || currentWeather === 'HEAVY_SNOW') {
      for (let i = 0; i < count * 3; i++) {
        snowPositions[i] = buffer.positions[i];
      }
      snowPosAttr.needsUpdate = true;
    } else if (currentWeather === 'SAKURA') {
      const sCount = Math.min(maxSakura, count);
      for (let i = 0; i < sCount; i++) {
        const i3 = i * 3;
        dummyObj.position.set(
          buffer.positions[i3],
          buffer.positions[i3 + 1],
          buffer.positions[i3 + 2]
        );
        dummyObj.rotation.set(
          buffer.rotations[i3],
          buffer.rotations[i3 + 1],
          buffer.rotations[i3 + 2]
        );
        const sc = buffer.scales[i];
        dummyObj.scale.set(sc, sc, sc);
        dummyObj.updateMatrix();
        sakuraInstanced.setMatrixAt(i, dummyObj.matrix);
      }
      sakuraInstanced.instanceMatrix.needsUpdate = true;
    }
  };

  const dispose = () => {
    rainGeo.dispose();
    rainMat.dispose();
    splashGeo.dispose();
    splashMat.dispose();
    snowGeo.dispose();
    snowMat.dispose();
    sakuraGeo.dispose();
    sakuraMat.dispose();
  };

  return {
    group,
    buffer,
    setWeather,
    update,
    dispose,
  };
}

// ============================================================================
// SCENE MATERIAL COLLECTOR & TIME/WEATHER SURFACE ILLUMINATOR
// ============================================================================

export interface SceneMaterialBuckets {
  windowMaterials: THREE.MeshStandardMaterial[];
  signageMaterials: THREE.MeshStandardMaterial[];
  roadMaterials: THREE.MeshStandardMaterial[];
}

export function collectSceneWeatherMaterials(root: THREE.Object3D): SceneMaterialBuckets {
  const windowSet = new Set<THREE.MeshStandardMaterial>();
  const signageSet = new Set<THREE.MeshStandardMaterial>();
  const roadSet = new Set<THREE.MeshStandardMaterial>();

  const winPaneTex = getWindowPaneTexture();
  const roadTex = getAsphaltRoadTexture();

  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh || !mesh.material) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

    for (const m of mats) {
      const mat = m as THREE.MeshStandardMaterial;
      if (!mat || !mat.isMeshStandardMaterial) continue;

      const hex = mat.color ? mat.color.getHex() : 0xffffff;

      // 1. Building Windows (matches getGlassMaterial opacity 0.78, window pane texture, or architectural glass)
      const isPoolWater = !mat.map && (hex === 0x06b6d4 || hex === 0x0284c7 || hex === 0x0ea5e9);
      if (
        !isPoolWater &&
        (mat.map === winPaneTex ||
          (mat.transparent && mat.opacity >= 0.6 && mat.opacity <= 0.84 && mat.roughness <= 0.35))
      ) {
        windowSet.add(mat);
        continue;
      }

      // 2. Asphalt Road & Pavement Surfaces
      if (
        mat.map === roadTex ||
        ((hex === 0x334155 || hex === 0x475569 || hex === 0x1e293b) &&
          mat.roughness >= 0.75 &&
          !mat.transparent)
      ) {
        roadSet.add(mat);
        continue;
      }

      // 3. Illuminated Fascia Signboards & Lanterns (CanvasTexture signs that aren't walls/roofs/grass)
      if (
        mat.map &&
        mat.map !== winPaneTex &&
        mat.map !== roadTex &&
        !mat.bumpMap &&
        hex === 0xffffff &&
        mat.roughness <= 0.55
      ) {
        signageSet.add(mat);
      }
    }
  });

  return {
    windowMaterials: Array.from(windowSet),
    signageMaterials: Array.from(signageSet),
    roadMaterials: Array.from(roadSet),
  };
}

export function applyAtmosphereToMaterials(
  buckets: SceneMaterialBuckets,
  atmos: CompositeAtmosphere
): void {
  // 1. Building Windows: Warm interior golden glow at Sunset, Night, or Heavy Rain
  for (let i = 0; i < buckets.windowMaterials.length; i++) {
    const mat = buckets.windowMaterials[i];
    if (atmos.windowGlowIntensity > 0.02) {
      // Subtle warm variation between golden amber and soft ivory across material instances
      const warmHex = i % 3 === 0 ? 0xfde68a : i % 3 === 1 ? 0xfef08a : 0xffedd5;
      mat.emissive.setHex(warmHex);
      mat.emissiveIntensity = atmos.windowGlowIntensity * 0.78;
    } else {
      mat.emissive.setHex(0x000000);
      mat.emissiveIntensity = 0.0;
    }
  }

  // 2. Fascia Signboards: Backlit storefront glow at Sunset & Night
  for (let i = 0; i < buckets.signageMaterials.length; i++) {
    const mat = buckets.signageMaterials[i];
    if (atmos.signageGlowIntensity > 0.05) {
      mat.emissive.setHex(0xfffbeb);
      mat.emissiveMap = mat.map;
      mat.emissiveIntensity = atmos.signageGlowIntensity * 0.42;
      mat.needsUpdate = true;
    } else {
      mat.emissive.setHex(0x000000);
      mat.emissiveIntensity = 0.0;
    }
  }

  // 3. Asphalt Roads: Wet mirror sheen in rain or frosted tint in snow
  for (let i = 0; i < buckets.roadMaterials.length; i++) {
    const mat = buckets.roadMaterials[i];
    mat.roughness = atmos.roadRoughness;
    mat.metalness = atmos.roadMetalness;
    mat.color.setHex(atmos.roadColorHex);
  }
}
