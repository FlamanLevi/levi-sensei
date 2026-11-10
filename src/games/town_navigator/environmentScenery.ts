import * as THREE from 'three';
import { getLawnGrassTexture, getGrassBumpMap, getIshigakiStoneTexture } from './models/wallTextures';

export type SkyPreset = 'MORNING' | 'DAY' | 'SUNSET' | 'NIGHT' | 'SUNRISE' | 'NOON' | 'MIDNIGHT';

const cachedSkyTextures = new Map<string, THREE.CanvasTexture>();
let cachedSkyscraperDayTex: THREE.CanvasTexture | null = null;
let cachedSkyscraperNightTex: THREE.CanvasTexture | null = null;

function normalizePreset(preset: SkyPreset): 'MORNING' | 'DAY' | 'SUNSET' | 'NIGHT' {
  if (preset === 'SUNRISE') return 'MORNING';
  if (preset === 'NOON') return 'DAY';
  if (preset === 'MIDNIGHT') return 'NIGHT';
  return preset;
}

/**
 * Generates a high-resolution 2048x1024 equirectangular atmospheric skybox texture
 * with Rayleigh/Mie sky gradients, sun/moon disc & corona, multi-layered cumulus & cirrus clouds,
 * and nighttime starfields.
 */
export function getSkyDomeTexture(preset: SkyPreset): THREE.CanvasTexture {
  const key = normalizePreset(preset);
  if (cachedSkyTextures.has(key)) return cachedSkyTextures.get(key)!;

  if (typeof document === 'undefined') {
    return new THREE.Texture() as unknown as THREE.CanvasTexture;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // 1. Zenith-to-Nadir Atmospheric Sky Gradient (Equirectangular Y=0 is Zenith, Y=512 is Horizon)
  const skyGrad = ctx.createLinearGradient(0, 0, 0, 620);
  if (key === 'DAY') {
    skyGrad.addColorStop(0.0, '#0284c7'); // Deep azure zenith
    skyGrad.addColorStop(0.28, '#38bdf8'); // Vibrant sky blue
    skyGrad.addColorStop(0.62, '#7dd3fc'); // Mid-sky cyan-blue
    skyGrad.addColorStop(0.84, '#bae6fd'); // Soft horizon blue
    skyGrad.addColorStop(1.0, '#e0f2fe'); // Mist horizon
  } else if (key === 'MORNING') {
    skyGrad.addColorStop(0.0, '#1d4ed8');
    skyGrad.addColorStop(0.32, '#60a5fa');
    skyGrad.addColorStop(0.64, '#fed7aa');
    skyGrad.addColorStop(0.84, '#fdba74');
    skyGrad.addColorStop(1.0, '#ffedd5');
  } else if (key === 'SUNSET') {
    skyGrad.addColorStop(0.0, '#1e1b4b'); // Deep indigo zenith
    skyGrad.addColorStop(0.26, '#4c1d95'); // Twilight violet
    skyGrad.addColorStop(0.52, '#be185d'); // Crimson-magenta
    skyGrad.addColorStop(0.74, '#f97316'); // Fiery sunset orange
    skyGrad.addColorStop(0.88, '#fbbf24'); // Golden amber horizon
    skyGrad.addColorStop(1.0, '#fef08a');
  } else {
    // NIGHT / MIDNIGHT
    skyGrad.addColorStop(0.0, '#020617');
    skyGrad.addColorStop(0.35, '#0f172a');
    skyGrad.addColorStop(0.72, '#1e293b');
    skyGrad.addColorStop(0.90, '#1e3a5f');
    skyGrad.addColorStop(1.0, '#0f172a');
  }
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, 2048, 1024);

  // Deterministic PRNG for stars & clouds
  let seed = key === 'DAY' ? 101 : key === 'MORNING' ? 202 : key === 'SUNSET' ? 303 : 404;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  // 2. Nighttime Starfield & Milky Way Band
  if (key === 'NIGHT') {
    // Soft diagonal Milky Way nebula glow
    ctx.save();
    ctx.translate(1024, 240);
    ctx.rotate(-0.22);
    const mwGrad = ctx.createRadialGradient(0, 0, 20, 0, 0, 720);
    mwGrad.addColorStop(0, 'rgba(147, 197, 253, 0.16)');
    mwGrad.addColorStop(0.5, 'rgba(167, 139, 250, 0.08)');
    mwGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
    ctx.fillStyle = mwGrad;
    ctx.fillRect(-800, -180, 1600, 360);
    ctx.restore();

    // 700 twinkling stars above the horizon
    for (let i = 0; i < 700; i++) {
      const sx = rand() * 2048;
      const sy = rand() * 465;
      const r = 0.6 + rand() * 1.8;
      const alpha = 0.35 + rand() * 0.65;
      const tint = i % 7 === 0 ? `rgba(186, 230, 253, ${alpha})` : i % 11 === 0 ? `rgba(254, 240, 138, ${alpha})` : `rgba(255, 255, 255, ${alpha})`;
      ctx.fillStyle = tint;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();

      // Star cross-flare on brightest stars
      if (r > 2.0) {
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.6})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sx - 5, sy);
        ctx.lineTo(sx + 5, sy);
        ctx.moveTo(sx, sy - 5);
        ctx.lineTo(sx, sy + 5);
        ctx.stroke();
      }
    }
  }

  // 3. Sun Disc / Corona or Luminous Full Moon
  const celestialX = key === 'MORNING' ? 480 : key === 'DAY' ? 880 : key === 'SUNSET' ? 1480 : 1240;
  const celestialY = key === 'MORNING' ? 390 : key === 'DAY' ? 240 : key === 'SUNSET' ? 435 : 250;

  if (key === 'NIGHT') {
    // Outer lunar halo
    const halo = ctx.createRadialGradient(celestialX, celestialY, 8, celestialX, celestialY, 110);
    halo.addColorStop(0, 'rgba(224, 242, 254, 0.42)');
    halo.addColorStop(0.35, 'rgba(147, 197, 253, 0.14)');
    halo.addColorStop(1, 'rgba(15, 23, 42, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(celestialX, celestialY, 110, 0, Math.PI * 2);
    ctx.fill();

    // Moon disc
    ctx.fillStyle = '#fef9c3';
    ctx.beginPath();
    ctx.arc(celestialX, celestialY, 18, 0, Math.PI * 2);
    ctx.fill();

    // Subtle lunar maria craters
    ctx.fillStyle = 'rgba(148, 163, 184, 0.35)';
    ctx.beginPath();
    ctx.arc(celestialX - 5, celestialY - 4, 5, 0, Math.PI * 2);
    ctx.arc(celestialX + 6, celestialY + 4, 4, 0, Math.PI * 2);
    ctx.arc(celestialX - 2, celestialY + 7, 3, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Solar atmospheric corona
    const outerRadius = key === 'SUNSET' ? 185 : 145;
    const corona = ctx.createRadialGradient(celestialX, celestialY, 10, celestialX, celestialY, outerRadius);
    if (key === 'SUNSET') {
      corona.addColorStop(0.0, 'rgba(255, 255, 255, 0.95)');
      corona.addColorStop(0.15, 'rgba(254, 240, 138, 0.75)');
      corona.addColorStop(0.45, 'rgba(249, 115, 22, 0.32)');
      corona.addColorStop(1.0, 'rgba(249, 115, 22, 0)');
    } else if (key === 'MORNING') {
      corona.addColorStop(0.0, 'rgba(255, 255, 255, 0.94)');
      corona.addColorStop(0.18, 'rgba(254, 243, 199, 0.68)');
      corona.addColorStop(0.5, 'rgba(251, 146, 60, 0.24)');
      corona.addColorStop(1.0, 'rgba(251, 146, 60, 0)');
    } else {
      corona.addColorStop(0.0, 'rgba(255, 255, 255, 0.95)');
      corona.addColorStop(0.18, 'rgba(254, 249, 195, 0.65)');
      corona.addColorStop(0.5, 'rgba(186, 230, 253, 0.22)');
      corona.addColorStop(1.0, 'rgba(186, 230, 253, 0)');
    }
    ctx.fillStyle = corona;
    ctx.beginPath();
    ctx.arc(celestialX, celestialY, outerRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(celestialX, celestialY, key === 'SUNSET' ? 19 : 15, 0, Math.PI * 2);
    ctx.fill();
  }

  // 4. High-Altitude Wispy Cirrus Clouds
  const cirrusColor =
    key === 'DAY'
      ? 'rgba(255, 255, 255, 0.28)'
      : key === 'MORNING'
      ? 'rgba(255, 237, 213, 0.30)'
      : key === 'SUNSET'
      ? 'rgba(253, 186, 116, 0.28)'
      : 'rgba(148, 163, 184, 0.08)';

  ctx.strokeStyle = cirrusColor;
  for (let c = 0; c < 32; c++) {
    const cx = rand() * 2048;
    const cy = 140 + rand() * 160;
    const clen = 80 + rand() * 140;
    ctx.lineWidth = 3 + rand() * 5;
    ctx.lineCap = 'round';
    for (const wrapX of [0, -2048, 2048]) {
      ctx.beginPath();
      ctx.moveTo(cx + wrapX, cy);
      ctx.quadraticCurveTo(cx + wrapX + clen * 0.5, cy - 6, cx + wrapX + clen, cy + 3);
      ctx.stroke();
    }
  }

  // 5. Layered Stratocumulus & Cumulus Horizon Cloud Banks
  const cloudTopColor =
    key === 'DAY'
      ? 'rgba(255, 255, 255, 0.68)'
      : key === 'MORNING'
      ? 'rgba(255, 247, 237, 0.66)'
      : key === 'SUNSET'
      ? 'rgba(254, 215, 170, 0.62)'
      : 'rgba(51, 65, 85, 0.32)';

  const cloudBaseColor =
    key === 'DAY'
      ? 'rgba(186, 230, 253, 0.45)'
      : key === 'MORNING'
      ? 'rgba(254, 215, 170, 0.42)'
      : key === 'SUNSET'
      ? 'rgba(190, 24, 93, 0.32)'
      : 'rgba(15, 23, 42, 0.35)';

  const numCloudClusters = 26;
  for (let i = 0; i < numCloudClusters; i++) {
    const baseCx = (i / numCloudClusters) * 2048 + (rand() - 0.5) * 60;
    const baseCy = 290 + rand() * 140;
    const clusterScale = 0.40 + rand() * 0.34;

    for (const wrapX of [0, -2048, 2048]) {
      const cx = baseCx + wrapX;
      if (cx < -200 || cx > 2248) continue;

      ctx.save();
      ctx.translate(cx, baseCy);
      ctx.scale(1.65, 0.62); // Flattened natural stratocumulus profile

      // Cloud underside shadow
      ctx.fillStyle = cloudBaseColor;
      for (let p = -2; p <= 2; p++) {
        const px = p * 28 * clusterScale;
        const py = 8 * clusterScale + Math.abs(p) * 2;
        const pr = (26 - Math.abs(p) * 4) * clusterScale;
        ctx.beginPath();
        ctx.arc(px, py, pr, 0, Math.PI * 2);
        ctx.fill();
      }

      // Sunlit cumulus domes
      ctx.fillStyle = cloudTopColor;
      const puffs = [
        [-42, 3, 22],
        [-20, -9, 28],
        [3, -15, 32],
        [26, -8, 26],
        [44, 4, 20],
      ];
      for (const [ox, oy, or] of puffs) {
        ctx.beginPath();
        ctx.arc(ox * clusterScale, oy * clusterScale, or * clusterScale, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  cachedSkyTextures.set(key, tex);
  return tex;
}

/**
 * Builds a 360° Atmospheric Skybox Dome that ignores scene distance fog so the sky, clouds,
 * sun, moon, and stars remain crystal clear above the mountains and city skyline.
 */
export function buildAtmosphericSkybox(initialPreset: SkyPreset = 'DAY', radius: number = 285): THREE.Mesh {
  const geo = new THREE.SphereGeometry(radius, 48, 28);
  const mat = new THREE.MeshBasicMaterial({
    map: getSkyDomeTexture(initialPreset),
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'AtmosphericSkyboxDome';
  mesh.renderOrder = -10;
  return mesh;
}

/**
 * Updates an existing Skybox Dome's texture and optional weather tint when the Time of Day or Weather changes
 */
export function updateAtmosphericSkybox(
  skyboxMesh: THREE.Mesh | null,
  preset: SkyPreset,
  skyboxTintHex: number = 0xffffff
): void {
  if (!skyboxMesh) return;
  const mat = skyboxMesh.material as THREE.MeshBasicMaterial;
  if (!mat) return;
  mat.map = getSkyDomeTexture(preset);
  mat.color.setHex(skyboxTintHex);
  mat.needsUpdate = true;
}

/**
 * Builds a large, high-detail Textured Grass Meadow Ground Plane outside the town boundary
 */
export function buildTexturedGroundPlane(size: number = 520, repeatCount: number = 78, tintColor: number = 0x86efac): {
  mesh: THREE.Mesh;
  material: THREE.MeshStandardMaterial;
} {
  const baseGrass = getLawnGrassTexture();
  const grassTex = baseGrass.clone();
  grassTex.wrapS = THREE.RepeatWrapping;
  grassTex.wrapT = THREE.RepeatWrapping;
  grassTex.repeat.set(repeatCount, repeatCount);
  grassTex.needsUpdate = true;

  const baseBump = getGrassBumpMap();
  const bumpTex = baseBump.clone();
  bumpTex.wrapS = THREE.RepeatWrapping;
  bumpTex.wrapT = THREE.RepeatWrapping;
  bumpTex.repeat.set(repeatCount * 1.25, repeatCount * 1.25);
  bumpTex.needsUpdate = true;

  const material = new THREE.MeshStandardMaterial({
    color: tintColor,
    map: grassTex,
    bumpMap: bumpTex,
    bumpScale: 0.035,
    roughness: 0.88,
    metalness: 0.02,
  });

  const geo = new THREE.PlaneGeometry(size, size);
  const mesh = new THREE.Mesh(geo, material);
  mesh.name = 'TexturedOuterGrassGround';
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -0.015;
  mesh.receiveShadow = true;

  return { mesh, material };
}

/**
 * Procedural Skyscraper Curtain-Wall Window Grid Texture (Day & Night Emissive)
 */
function getSkyscraperTextures(): { dayMap: THREE.CanvasTexture; nightEmissiveMap: THREE.CanvasTexture } {
  if (cachedSkyscraperDayTex && cachedSkyscraperNightTex) {
    return { dayMap: cachedSkyscraperDayTex, nightEmissiveMap: cachedSkyscraperNightTex };
  }
  if (typeof document === 'undefined') {
    const dummy = new THREE.Texture() as unknown as THREE.CanvasTexture;
    return { dayMap: dummy, nightEmissiveMap: dummy };
  }

  // Day curtain-wall facade
  const dayCanvas = document.createElement('canvas');
  dayCanvas.width = 256;
  dayCanvas.height = 512;
  const dCtx = dayCanvas.getContext('2d')!;
  dCtx.fillStyle = '#334155';
  dCtx.fillRect(0, 0, 256, 512);

  // Night emissive window mask
  const nightCanvas = document.createElement('canvas');
  nightCanvas.width = 256;
  nightCanvas.height = 512;
  const nCtx = nightCanvas.getContext('2d')!;
  nCtx.fillStyle = '#000000';
  nCtx.fillRect(0, 0, 256, 512);

  const cols = 8;
  const rows = 24;
  const cw = 256 / cols;
  const rh = 512 / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * cw + 3;
      const y = r * rh + 3;
      const w = cw - 6;
      const h = rh - 6;

      const hash = (r * 31 + c * 17) % 19;
      // Reflective blue-slate window pane in daylight
      dCtx.fillStyle = hash % 3 === 0 ? '#64748b' : hash % 2 === 0 ? '#475569' : '#93c5fd';
      dCtx.fillRect(x, y, w, h);

      // ~60% of skyscraper offices stay lit at sunset/night
      if (hash < 11) {
        nCtx.fillStyle = hash % 4 === 0 ? '#fef08a' : hash % 3 === 0 ? '#bae6fd' : '#fde68a';
        nCtx.fillRect(x, y, w, h);
      }
    }
  }

  cachedSkyscraperDayTex = new THREE.CanvasTexture(dayCanvas);
  cachedSkyscraperDayTex.wrapS = THREE.RepeatWrapping;
  cachedSkyscraperDayTex.wrapT = THREE.RepeatWrapping;
  cachedSkyscraperDayTex.colorSpace = THREE.SRGBColorSpace;

  cachedSkyscraperNightTex = new THREE.CanvasTexture(nightCanvas);
  cachedSkyscraperNightTex.wrapS = THREE.RepeatWrapping;
  cachedSkyscraperNightTex.wrapT = THREE.RepeatWrapping;
  cachedSkyscraperNightTex.colorSpace = THREE.SRGBColorSpace;

  return { dayMap: cachedSkyscraperDayTex, nightEmissiveMap: cachedSkyscraperNightTex };
}

/**
 * Builds the 360° Perimeter Scenery outside the town/studio boundary:
 * - Outer Meadow Belt with fitted *Ishigaki* boundary wall, country fences, rolling grassy mounds & Sakura/Pine/Ginkgo tree groves
 * - Distant Metropolitan City Skyline on the East/North-East horizon with lit skyscrapers, Tokyo Tower observation spire & suspension bridge
 * - Layered Japanese Alps Mountain Ranges & Snow-Capped Mount Fuji (*Fujisan*) on the North-West, West & South horizons
 * - Floating 3D horizon clouds
 */
export function buildPerimeterScenery(options: {
  boundaryHalfSize?: number;
  includeBoundaryFence?: boolean;
} = {}): THREE.Group {
  const { boundaryHalfSize = 40.5, includeBoundaryFence = true } = options;

  const scenery = new THREE.Group();
  scenery.name = 'PerimeterVistaScenery';

  // Materials
  const stoneTex = getIshigakiStoneTexture();
  const boundaryStoneMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    map: stoneTex,
    roughness: 0.85,
  });
  const woodFenceMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.85 });
  const grassHillMat = new THREE.MeshStandardMaterial({
    color: 0x65a30d,
    map: getLawnGrassTexture(),
    bumpMap: getGrassBumpMap(),
    bumpScale: 0.025,
    roughness: 0.88,
  });

  const foothillMat = new THREE.MeshStandardMaterial({
    color: 0x14532d,
    roughness: 0.92,
    flatShading: true,
  });
  const foothillRidgeMat = new THREE.MeshStandardMaterial({
    color: 0x166534,
    roughness: 0.90,
    flatShading: true,
  });
  const midMountainMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.86,
    flatShading: true,
  });
  const fujiSlopeMat = new THREE.MeshStandardMaterial({
    color: 0x1e3a8a,
    roughness: 0.82,
    flatShading: true,
  });
  const snowCapMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.4,
    metalness: 0.05,
    flatShading: true,
  });
  const cloudMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.95,
    transparent: true,
    opacity: 0.72,
  });

  const { dayMap, nightEmissiveMap } = getSkyscraperTextures();
  const skyscraperMatA = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    map: dayMap,
    emissive: new THREE.Color(0xfef08a),
    emissiveMap: nightEmissiveMap,
    emissiveIntensity: 0.18,
    roughness: 0.3,
    metalness: 0.45,
  });
  const skyscraperMatB = new THREE.MeshStandardMaterial({
    color: 0xbae6fd,
    map: dayMap,
    emissive: new THREE.Color(0xfde68a),
    emissiveMap: nightEmissiveMap,
    emissiveIntensity: 0.18,
    roughness: 0.22,
    metalness: 0.55,
  });
  const towerRedMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0x991b1b,
    emissiveIntensity: 0.25,
    roughness: 0.4,
    metalness: 0.35,
  });
  const towerWhiteMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.35,
    metalness: 0.3,
  });
  const beaconMat = new THREE.MeshStandardMaterial({
    color: 0xff0000,
    emissive: 0xff2222,
    emissiveIntensity: 1.4,
  });

  // Store emissive materials on userData for instant day/night switching
  scenery.userData.skyscraperMats = [skyscraperMatA, skyscraperMatB];
  scenery.userData.beaconMat = beaconMat;
  scenery.userData.grassHillMat = grassHillMat;

  // ============================================================================
  // 1. TOWN BOUNDARY STONE EMBANKMENT CURB & WOODEN COUNTRY RAIL FENCE
  // ============================================================================
  if (includeBoundaryFence) {
    const B = boundaryHalfSize;
    const isExpanded = B > 50;
    // Road openings at perimeter (12m grand boulevard in center + 6m side streets)
    const wallSegments: Array<[number, number]> = isExpanded
      ? [
          [-B, -66.2],
          [-59.8, -36.2],
          [-29.8, -6.8],
          [6.8, 29.8],
          [36.2, 59.8],
          [66.2, B],
        ]
      : [
          [-B, -33.2],
          [-26.8, -3.2],
          [3.2, 26.8],
          [33.2, B],
        ];

    wallSegments.forEach(([s0, s1]) => {
      const segLen = s1 - s0;
      const mid = (s0 + s1) / 2;

      // North (-Z) & South (+Z) boundary embankment walls
      [-B, B].forEach((zPos) => {
        const curb = new THREE.Mesh(new THREE.BoxGeometry(segLen, 0.52, 0.55), boundaryStoneMat);
        curb.position.set(mid, 0.26, zPos);
        curb.castShadow = true;
        curb.receiveShadow = true;
        scenery.add(curb);

        const railTop = new THREE.Mesh(new THREE.BoxGeometry(segLen, 0.08, 0.10), woodFenceMat);
        railTop.position.set(mid, 0.82, zPos);
        scenery.add(railTop);
      });

      // West (-X) & East (+X) boundary embankment walls
      [-B, B].forEach((xPos) => {
        const curb = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.52, segLen), boundaryStoneMat);
        curb.position.set(xPos, 0.26, mid);
        curb.castShadow = true;
        curb.receiveShadow = true;
        scenery.add(curb);

        const railTop = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.08, segLen), woodFenceMat);
        railTop.position.set(xPos, 0.82, mid);
        scenery.add(railTop);
      });
    });
  }

  // ============================================================================
  // 2. OUTER MEADOW ROLLING HILLOCKS & COUNTRYSIDE TREE BELT
  // ============================================================================
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c2d0c, roughness: 0.9 });
  const pineDarkMat = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.85 });
  const pineBrightMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.85 });
  const sakuraLeafMat = new THREE.MeshStandardMaterial({ color: 0xf9a8d4, roughness: 0.75 });
  const ginkgoGoldMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.8 });

  // Rolling grassy meadow mounds outside the 4 sides of town
  const hillConfigs = [
    { x: -64, z: -62, rx: 18, ry: 2.2, rz: 14 },
    { x: 0, z: -68, rx: 24, ry: 2.4, rz: 13 },
    { x: 64, z: -62, rx: 16, ry: 2.0, rz: 14 },
    { x: -68, z: 0, rx: 14, ry: 2.4, rz: 22 },
    { x: -64, z: 62, rx: 18, ry: 2.3, rz: 16 },
    { x: 0, z: 68, rx: 22, ry: 2.1, rz: 13 },
    { x: 64, z: 62, rx: 17, ry: 2.0, rz: 15 },
    { x: 68, z: 12, rx: 12, ry: 1.8, rz: 18 },
  ];

  const moundGeo = new THREE.SphereGeometry(1, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5);
  for (const h of hillConfigs) {
    const mound = new THREE.Mesh(moundGeo, grassHillMat);
    mound.position.set(h.x, -0.05, h.z);
    mound.scale.set(h.rx, h.ry, h.rz);
    mound.receiveShadow = true;
    scenery.add(mound);
  }

  // Countryside Trees along the outer meadow belt (placed near the town perimeter so they never float in front of distant mountains)
  const numMeadowTrees = 48;
  const trunkGeo = new THREE.CylinderGeometry(0.22, 0.34, 2.4, 7);
  const coneGeo = new THREE.ConeGeometry(1.65, 3.2, 8);
  const crownGeo = new THREE.DodecahedronGeometry(1.75, 1);

  for (let i = 0; i < numMeadowTrees; i++) {
    const angle = (i / numMeadowTrees) * Math.PI * 2;
    const dist = includeBoundaryFence
      ? boundaryHalfSize + 4.8 + ((i * 11) % 13) // 45.3m..57.3m in TownNavigator
      : 54 + ((i * 9) % 10); // 54m..63m in ModelInspector
    const tx = Math.cos(angle) * dist;
    const tz = Math.sin(angle) * dist;

    // In ModelInspector, leave the central North-South sightline clear so the distant mountains & skyline are unobstructed
    if (!includeBoundaryFence && Math.abs(tx) < 26) continue;
    // Leave main road exits clear of trees
    if (includeBoundaryFence) {
      const isRoadExit = (v: number) => {
        const absV = Math.abs(v);
        return absV < 7.5 || Math.abs(absV - 30) < 4.5 || Math.abs(absV - 33) < 4.5 || Math.abs(absV - 63) < 4.5;
      };
      if (isRoadExit(tx) || isRoadExit(tz)) {
        continue;
      }
    }

    const scale = 0.82 + ((i * 13) % 6) * 0.12;

    const tree = new THREE.Group();
    tree.position.set(tx, 0, tz);
    tree.scale.setScalar(scale);

    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 1.2;
    trunk.castShadow = true;
    tree.add(trunk);

    if (i % 4 === 0) {
      // Flowering Sakura Cherry Tree
      const c1 = new THREE.Mesh(crownGeo, sakuraLeafMat);
      c1.position.set(0, 3.1, 0);
      c1.scale.set(1.2, 0.85, 1.2);
      const c2 = new THREE.Mesh(crownGeo, sakuraLeafMat);
      c2.position.set(0.7, 2.6, 0.4);
      c2.scale.setScalar(0.75);
      tree.add(c1, c2);
    } else if (i % 5 === 0) {
      // Golden Ginkgo Tree
      const g1 = new THREE.Mesh(coneGeo, ginkgoGoldMat);
      g1.position.set(0, 3.3, 0);
      tree.add(g1);
    } else {
      // Layered Japanese Cedar / Pine Tree
      const p1 = new THREE.Mesh(coneGeo, pineDarkMat);
      p1.position.set(0, 2.6, 0);
      const p2 = new THREE.Mesh(coneGeo, pineBrightMat);
      p2.position.set(0, 4.1, 0);
      p2.scale.setScalar(0.78);
      tree.add(p1, p2);
    }
    scenery.add(tree);
  }

  // ============================================================================
  // 3. DISTANT METROPOLITAN CITY SKYLINE, TOKYO TOWER & BAY BRIDGE (East Horizon)
  // ============================================================================
  const skylineGroup = new THREE.Group();
  skylineGroup.name = 'DistantCitySkyline';

  // Place 26 high-rise towers strictly in the East / South-East sector (angles -0.52 rad to +0.92 rad)
  const numSkyscrapers = 26;
  const trimRoofMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5, metalness: 0.5 });

  for (let i = 0; i < numSkyscrapers; i++) {
    const t = i / (numSkyscrapers - 1);
    const angle = -0.52 + t * 1.44; // Clean East horizon sector (+X)
    const tierOffset = (i % 3) * 14;
    const radius = 122 + tierOffset;
    const sx = Math.cos(angle) * radius;
    const sz = Math.sin(angle) * radius;

    const w = 6.0 + ((i * 7) % 6) * 1.1;
    const d = 6.0 + ((i * 11) % 5) * 1.1;
    const h = 18.0 + ((i * 17) % 11) * 3.4;

    const mat = i % 2 === 0 ? skyscraperMatA : skyscraperMatB;
    const tower = new THREE.Group();
    tower.position.set(sx, 0, sz);
    tower.rotation.y = -angle;

    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    body.position.y = h / 2;
    tower.add(body);

    // Architectural stepped crown / mechanical penthouse
    const crownW = w * 0.72;
    const crownD = d * 0.72;
    const crownH = 2.6 + (i % 3) * 1.2;
    const crown = new THREE.Mesh(new THREE.BoxGeometry(crownW, crownH, crownD), mat);
    crown.position.y = h + crownH / 2;
    const roofCap = new THREE.Mesh(new THREE.BoxGeometry(crownW + 0.4, 0.45, crownD + 0.4), trimRoofMat);
    roofCap.position.y = h + crownH + 0.22;
    tower.add(crown, roofCap);

    // Spire & red aircraft warning beacon on tall signature skyscrapers
    if (h >= 34) {
      const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.22, 6.5, 6), trimRoofMat);
      spire.position.y = h + crownH + 3.25;
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 8), beaconMat);
      beacon.position.y = h + crownH + 6.6;
      tower.add(spire, beacon);
    }

    skylineGroup.add(tower);
  }

  // Landmark Red-and-White Observation Tower (Tokyo Tower / Denpa-tō style) at East-North-East
  const obsTower = new THREE.Group();
  obsTower.name = 'LandmarkObservationTower';
  obsTower.position.set(118, 0, -28);

  const bands = [
    { y0: 0, h: 10, rBot: 6.6, rTop: 4.2, mat: towerRedMat },
    { y0: 10, h: 9, rBot: 4.2, rTop: 2.8, mat: towerWhiteMat },
    { y0: 19, h: 9, rBot: 2.8, rTop: 1.8, mat: towerRedMat },
    { y0: 28, h: 8, rBot: 1.8, rTop: 1.1, mat: towerWhiteMat },
    { y0: 36, h: 8, rBot: 1.1, rTop: 0.48, mat: towerRedMat },
    { y0: 44, h: 7, rBot: 0.38, rTop: 0.14, mat: towerWhiteMat },
  ];
  for (const b of bands) {
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(b.rTop, b.rBot, b.h, 4), b.mat);
    seg.rotation.y = Math.PI / 4;
    seg.position.y = b.y0 + b.h / 2;
    obsTower.add(seg);
  }
  // Main & Top Observation Decks
  const mainDeck = new THREE.Mesh(new THREE.BoxGeometry(7.6, 2.4, 7.6), skyscraperMatB);
  mainDeck.position.y = 15.5;
  const upperDeck = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 1.8, 12), skyscraperMatB);
  upperDeck.position.y = 31.5;
  const topBeacon = new THREE.Mesh(new THREE.SphereGeometry(0.6, 10, 10), beaconMat);
  topBeacon.position.y = 51.4;
  obsTower.add(mainDeck, upperDeck, topBeacon);
  skylineGroup.add(obsTower);

  // Cable-Stayed Bay Suspension Bridge on South-East Horizon
  const bridgeGroup = new THREE.Group();
  bridgeGroup.position.set(108, 0, 76);
  bridgeGroup.rotation.y = -0.55;

  const bridgeDeck = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.9, 68), towerWhiteMat);
  bridgeDeck.position.y = 7.5;
  bridgeGroup.add(bridgeDeck);

  [-16, 16].forEach((pz) => {
    const pylonL = new THREE.Mesh(new THREE.BoxGeometry(0.9, 24, 0.9), towerWhiteMat);
    pylonL.position.set(-1.6, 12, pz);
    pylonL.rotation.z = -0.05;
    const pylonR = new THREE.Mesh(new THREE.BoxGeometry(0.9, 24, 0.9), towerWhiteMat);
    pylonR.position.set(1.6, 12, pz);
    pylonR.rotation.z = 0.05;
    const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.8, 0.9), towerWhiteMat);
    crossBeam.position.set(0, 19.5, pz);
    bridgeGroup.add(pylonL, pylonR, crossBeam);

    // Stay cables
    for (const cz of [-10, -5, 5, 10]) {
      const cableLen = Math.hypot(cz, 14.5);
      const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, cableLen, 4), towerWhiteMat);
      cable.position.set(0, 14.8, pz + cz / 2);
      cable.rotation.x = Math.atan2(cz, 14.5);
      bridgeGroup.add(cable);
    }
  });
  skylineGroup.add(bridgeGroup);
  scenery.add(skylineGroup);

  // ============================================================================
  // 4. LAYERED JAPANESE ALPS MOUNTAINS & ICONIC MOUNT FUJI (North, West & South)
  // ============================================================================
  const mountainsGroup = new THREE.Group();
  mountainsGroup.name = 'PerimeterMountainsAndFuji';

  // Iconic Snow-Capped Mount Fuji (*Fujisan*) on the North-North-West Horizon
  const fujiGroup = new THREE.Group();
  fujiGroup.name = 'MountFujiLandmark';
  fujiGroup.position.set(-88, -0.5, -142);

  const fujiBase = new THREE.Mesh(new THREE.CylinderGeometry(12.5, 62, 44, 16), fujiSlopeMat);
  fujiBase.position.y = 22;
  const fujiUpper = new THREE.Mesh(new THREE.CylinderGeometry(7.2, 25.0, 23, 16), snowCapMat);
  fujiUpper.position.y = 45.2;

  // Jagged snow-streak ridges (*Yukizuri*) draping down the volcanic cone
  for (let s = 0; s < 12; s++) {
    const sa = (s / 12) * Math.PI * 2;
    const streak = new THREE.Mesh(new THREE.ConeGeometry(5.0, 19, 4), snowCapMat);
    streak.position.set(Math.cos(sa) * 20.5, 32.5, Math.sin(sa) * 20.5);
    streak.rotation.z = Math.cos(sa) * 0.52;
    streak.rotation.x = -Math.sin(sa) * 0.52;
    fujiGroup.add(streak);
  }
  fujiGroup.add(fujiBase, fujiUpper);
  mountainsGroup.add(fujiGroup);

  // Ring of Multi-Ridged Forested Foothills & Alpine Peaks around South, West, and North horizons (angles 1.28 rad to 5.16 rad)
  // Leaves a wide bay gap between 5.16 rad (-1.12 rad) and -0.52 rad so mountains and city skyline never overlap
  const numPeaks = 22;
  for (let i = 0; i < numPeaks; i++) {
    const t = i / (numPeaks - 1);
    const angle = 1.28 + t * 3.88; // Sweeps cleanly from South -> West -> North

    // Multi-ridged Forested Foothill Massif
    const footDist = 118 + ((i * 13) % 16);
    const footR = 19 + ((i * 7) % 9);
    const footH = 14 + ((i * 11) % 9);
    const fx = Math.cos(angle) * footDist;
    const fz = Math.sin(angle) * footDist;

    const foothill = new THREE.Mesh(new THREE.ConeGeometry(footR, footH, 7), i % 2 === 0 ? foothillMat : foothillRidgeMat);
    foothill.position.set(fx, footH / 2 - 0.5, fz);
    foothill.scale.set(1.25, 1.0, 0.9);
    foothill.rotation.y = -angle + i * 0.4;
    mountainsGroup.add(foothill);

    // Flanking shoulder ridge
    const shoulder = new THREE.Mesh(new THREE.ConeGeometry(footR * 0.75, footH * 0.72, 6), foothillRidgeMat);
    const shAngle = angle + 0.08;
    shoulder.position.set(Math.cos(shAngle) * (footDist + 4), (footH * 0.72) / 2 - 0.5, Math.sin(shAngle) * (footDist + 4));
    shoulder.rotation.y = i * 0.9;
    mountainsGroup.add(shoulder);

    // Outer Alpine Peak (skip directly in front of Mt. Fuji at angle ~4.16 rad so Fuji's silhouette is unobstructed)
    if (Math.abs(angle - 4.16) > 0.34) {
      const alpDist = 148 + ((i * 17) % 24);
      const alpR = 26 + ((i * 9) % 12);
      const alpH = 28 + ((i * 19) % 16);
      const ax = Math.cos(angle) * alpDist;
      const az = Math.sin(angle) * alpDist;

      const alpine = new THREE.Mesh(new THREE.ConeGeometry(alpR, alpH, 7), midMountainMat);
      alpine.position.set(ax, alpH / 2 - 0.5, az);
      alpine.rotation.y = i * 1.1;
      mountainsGroup.add(alpine);

      // Snow cap on tall alpine peaks
      if (alpH >= 34) {
        const capH = alpH * 0.35;
        const capR = alpR * 0.36;
        const cap = new THREE.Mesh(new THREE.ConeGeometry(capR, capH, 7), snowCapMat);
        cap.position.set(ax, alpH - capH / 2 - 0.3, az);
        cap.rotation.y = alpine.rotation.y;
        mountainsGroup.add(cap);
      }
    }
  }

  // 3D Floating Horizon Cloud Puffs high above the mountains & skyline
  const cloudPuffGeo = new THREE.DodecahedronGeometry(3.8, 1);
  for (let c = 0; c < 12; c++) {
    const ca = (c / 12) * Math.PI * 2;
    const cDist = 146 + (c % 3) * 14;
    const cy = 36 + (c % 4) * 5;
    const cloudCluster = new THREE.Group();
    cloudCluster.position.set(Math.cos(ca) * cDist, cy, Math.sin(ca) * cDist);
    cloudCluster.rotation.y = -ca + Math.PI / 2;

    const pMain = new THREE.Mesh(cloudPuffGeo, cloudMat);
    pMain.scale.set(2.4, 0.55, 0.9);
    const pLeft = new THREE.Mesh(cloudPuffGeo, cloudMat);
    pLeft.position.set(-4.2, -0.5, 0);
    pLeft.scale.set(1.5, 0.45, 0.8);
    const pRight = new THREE.Mesh(cloudPuffGeo, cloudMat);
    pRight.position.set(4.2, -0.4, 0);
    pRight.scale.set(1.6, 0.48, 0.8);

    cloudCluster.add(pMain, pLeft, pRight);
    mountainsGroup.add(cloudCluster);
  }

  scenery.add(mountainsGroup);
  return scenery;
}

/**
 * Updates the Perimeter Scenery's skyscraper window glow, warning beacons, and meadow tint
 * when switching between Morning/Sunrise, Day/Noon, Sunset, and Night/Midnight.
 */
export function updatePerimeterSceneryLighting(
  sceneryGroup: THREE.Group | null,
  streetlightLevel: number,
  groundColorHex?: number
): void {
  if (!sceneryGroup) return;

  const skyscraperMats = sceneryGroup.userData.skyscraperMats as THREE.MeshStandardMaterial[] | undefined;
  if (skyscraperMats) {
    const intensity = streetlightLevel > 0.05 ? 0.55 + streetlightLevel * 0.65 : 0.12;
    for (const mat of skyscraperMats) {
      mat.emissiveIntensity = intensity;
    }
  }

  const beaconMat = sceneryGroup.userData.beaconMat as THREE.MeshStandardMaterial | undefined;
  if (beaconMat) {
    beaconMat.emissiveIntensity = streetlightLevel > 0.05 ? 2.2 : 0.6;
  }

  const grassHillMat = sceneryGroup.userData.grassHillMat as THREE.MeshStandardMaterial | undefined;
  if (grassHillMat && groundColorHex !== undefined) {
    grassHillMat.color.setHex(groundColorHex);
  }
}
