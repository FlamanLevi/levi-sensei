/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ============================================================================
 * 3D Undokai Tamaire — Procedural Canvas Textures, Atlases & Wii Rim Shaders
 * ============================================================================
 */

import * as THREE from 'three';

export const THROWER_SKIN_TONES = [0xffe9d6, 0xffdfc4, 0xf6cfa9, 0xfff1e0, 0xf3c69f] as const;
export const THROWER_HAIR_COLORS = [0x18130f, 0x2c1b10, 0x0f172a, 0x422614, 0x231912] as const;

// ----------------------------------------------------------------------------
// Nintendo Wii Sports Satin Rim-Lighting & Hemisphere Boost Shader + Instanced Atlas
// ----------------------------------------------------------------------------
export function injectWiiSatinRimShader(
  material: THREE.Material,
  rimStrength = 0.3,
  topBoost = 0.12
) {
  if (!material || (material.userData && material.userData.wiiRimInjected)) return material;
  material.userData = material.userData || {};
  material.userData.wiiRimInjected = true;
  const key = `wii_tamaire_satin_rim_${rimStrength.toFixed(2)}_${topBoost.toFixed(2)}`;
  (material as unknown as { customProgramCacheKey: () => string }).customProgramCacheKey = () => key;

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

export function applyInstancedAtlasMaterial(
  material: THREE.Material,
  useWiiRim = true,
  rimStrength = 0.3,
  topBoost = 0.12
) {
  material.userData = material.userData || {};
  material.userData.wiiRimInjected = useWiiRim;
  const key = `wii_tamaire_atlas_${useWiiRim ? `${rimStrength.toFixed(2)}_${topBoost.toFixed(2)}` : 'flat'}`;
  (material as unknown as { customProgramCacheKey: () => string }).customProgramCacheKey = () => key;

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
// Procedural PBR Textures: Schoolyard Sand (真砂土), Track, Grass, School & Banners
// ----------------------------------------------------------------------------
let cachedShadowTex: THREE.CanvasTexture | null = null;
export function createDoubleRingShadowTexture(): THREE.CanvasTexture | null {
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

export function createSchoolyardSandMaps(): {
  diffuseMap: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} | null {
  if (cachedSandMaps) return cachedSandMaps;
  if (typeof document === 'undefined') return null;

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

  // 1. Rich warm golden-ochre Masado clay-sand base
  const baseGrad = dCtx.createRadialGradient(
    size * 0.5,
    size * 0.5,
    20,
    size * 0.5,
    size * 0.5,
    size * 0.72
  );
  baseGrad.addColorStop(0, '#c69a68');
  baseGrad.addColorStop(0.55, '#b88b58');
  baseGrad.addColorStop(1, '#a37646');
  dCtx.fillStyle = baseGrad;
  dCtx.fillRect(0, 0, size, size);

  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, size, size);

  // 2. Crisp raked broom furrows (トンボ掛けの跡)
  for (let y = 0; y < size; y += 4) {
    const wave = Math.sin(y * 0.18) * 0.5 + 0.5;
    dCtx.fillStyle =
      y % 8 === 0
        ? `rgba(112, 78, 42, ${0.22 * wave})`
        : `rgba(232, 202, 162, ${0.16 * wave})`;
    dCtx.fillRect(0, y, size, 2);

    bCtx.fillStyle = y % 8 === 0 ? 'rgba(45, 45, 45, 0.45)' : 'rgba(210, 210, 210, 0.45)';
    bCtx.fillRect(0, y, size, 2);
  }

  // 3. Organic mottled soil patches
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

  // 4. High-density granite/quartz sand grains & tiny pebbles (256x256 per GEMINI.md budget)
  const dImg = dCtx.getImageData(0, 0, size, size);
  const bImg = bCtx.getImageData(0, 0, size, size);
  const dData = dImg.data;
  const bData = bImg.data;

  for (let i = 0; i < dData.length; i += 4) {
    const grain = (rand() - 0.5) * 38;
    const pebbleRoll = rand();
    let extra = 0;
    if (pebbleRoll > 0.975) extra = 42;
    else if (pebbleRoll < 0.028) extra = -48;

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

let cachedGrassTex: THREE.CanvasTexture | null = null;
export function createLushGrassTexture(): THREE.CanvasTexture | null {
  if (cachedGrassTex) return cachedGrassTex;
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#4d9b36';
  ctx.fillRect(0, 0, 256, 256);

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

let cachedSchoolFacadeTex: THREE.CanvasTexture | null = null;
export function createSchoolFacadeTexture(): THREE.CanvasTexture | null {
  if (cachedSchoolFacadeTex) return cachedSchoolFacadeTex;
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#f5efe6';
  ctx.fillRect(0, 0, 1024, 512);

  const floors = [70, 220, 370];
  floors.forEach((fy) => {
    for (let col = 0; col < 10; col++) {
      if (col === 4 || col === 5) continue;

      const wx = 36 + col * 96;
      ctx.fillStyle = '#334155';
      ctx.fillRect(wx, fy, 78, 92);

      const paneGrad = ctx.createLinearGradient(wx, fy, wx + 78, fy + 92);
      paneGrad.addColorStop(0, '#7dd3fc');
      paneGrad.addColorStop(0.5, '#38bdf8');
      paneGrad.addColorStop(1, '#1e3a8a');
      ctx.fillStyle = paneGrad;
      ctx.fillRect(wx + 4, fy + 4, 33, 40);
      ctx.fillRect(wx + 41, fy + 4, 33, 40);
      ctx.fillRect(wx + 4, fy + 48, 33, 40);
      ctx.fillRect(wx + 41, fy + 48, 33, 40);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.beginPath();
      ctx.moveTo(wx + 8, fy + 8);
      ctx.lineTo(wx + 24, fy + 8);
      ctx.lineTo(wx + 12, fy + 38);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = '#e2d9c8';
    ctx.fillRect(0, fy + 94, 1024, 28);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, fy + 94, 1024, 28);
  });

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

let cachedKohakuTex: THREE.CanvasTexture | null = null;
export function createKohakuMakuTexture(): THREE.CanvasTexture | null {
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

export function createUndokaiBannerTexture(schoolName = '二子玉川小'): THREE.CanvasTexture | null {
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

const cachedBeanBagTexs: Record<string, THREE.CanvasTexture> = {};
export function createStitchedBeanBagTexture(
  baseHex: string,
  stitchHex: string,
  isGold = false
): THREE.CanvasTexture | null {
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

let cachedFaceAtlasTex: THREE.CanvasTexture | null = null;
export function getFaceAtlasTexture(): THREE.CanvasTexture | null {
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
      ctx.scale(0.5, 0.5);

      ctx.fillStyle = hexStr;
      ctx.fillRect(0, 0, 256, 256);

      ctx.fillStyle = 'rgba(251, 113, 133, 0.55)';
      ctx.beginPath();
      ctx.ellipse(76, 152, 22, 13, 0, 0, Math.PI * 2);
      ctx.ellipse(180, 152, 22, 13, 0, 0, Math.PI * 2);
      ctx.fill();

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

      ctx.fillStyle = 'rgba(180, 110, 75, 0.45)';
      ctx.beginPath();
      ctx.arc(128, 142, 4.5, 0, Math.PI * 2);
      ctx.fill();

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

export function getFaceAtlasRect(
  skinIdx: number,
  exprIdx: number
): [number, number, number, number] {
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
    (cell - 2 * pad) / h,
  ];
}

let cachedBibAtlasTex: THREE.CanvasTexture | null = null;
export function getZekkenBibAtlasTexture(): THREE.CanvasTexture | null {
  if (cachedBibAtlasTex) return cachedBibAtlasTex;
  if (typeof document === 'undefined') return null;

  const cellPx = 128;
  const cols = 8;
  const rows = 5;
  const canvas = document.createElement('canvas');
  canvas.width = cellPx * cols;
  canvas.height = cellPx * rows;
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

export function getZekkenAtlasRect(
  team: 'red' | 'white',
  bibNumZeroBased: number
): [number, number, number, number] {
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
    (cell - 2 * pad) / h,
  ];
}

let cachedBeanBagAtlasTex: THREE.CanvasTexture | null = null;
export function getBeanBagAtlasTexture(): THREE.CanvasTexture | null {
  if (cachedBeanBagAtlasTex) return cachedBeanBagAtlasTex;
  if (typeof document === 'undefined') return null;

  const cellPx = 128;
  const canvas = document.createElement('canvas');
  canvas.width = cellPx * 3;
  canvas.height = cellPx;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const variants: Array<{ baseHex: string; stitchHex: string; isGold: boolean }> = [
    { baseHex: '#e11d48', stitchHex: '#fecdd3', isGold: false },
    { baseHex: '#f8fafc', stitchHex: '#94a3b8', isGold: false },
    { baseHex: '#f59e0b', stitchHex: '#fef08a', isGold: true },
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

export function getBeanBagAtlasRect(
  variant: 'red' | 'white' | 'gold'
): [number, number, number, number] {
  const col = variant === 'red' ? 0 : variant === 'white' ? 1 : 2;
  const pad = 2;
  return [(col * 128 + pad) / 384, pad / 128, (128 - 2 * pad) / 384, (128 - 2 * pad) / 128];
}

let cachedDualVertBannerTex: THREE.CanvasTexture | null = null;
export function createDualVerticalBannerTexture(): THREE.CanvasTexture | null {
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
