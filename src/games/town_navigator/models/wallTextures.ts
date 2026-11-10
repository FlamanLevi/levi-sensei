import * as THREE from 'three';

/**
 * High-Detail Procedural Wall, Roof & Ground Texture Generator + Japanese Architectural Geometry Toolkit
 * Upgraded with 512px micro-relief textures, botanical lawn grass & paver textures, rain downspouts (Amadoi),
 * mullioned sash windows with interior Venetian blinds & awnings (Hisashi), overhanging eaves brackets,
 * Onigawara ridge tiles, rooftop HVAC chillers/penthouses, and automatic 3D building detail enhancement.
 */

let cachedSidingTexture: THREE.CanvasTexture | null = null;
let cachedBrickTexture: THREE.CanvasTexture | null = null;
let cachedConcreteTexture: THREE.CanvasTexture | null = null;
let cachedStuccoTexture: THREE.CanvasTexture | null = null;
let cachedKawaraTexture: THREE.CanvasTexture | null = null;
let cachedIshigakiTexture: THREE.CanvasTexture | null = null;
let cachedBumpTexture: THREE.CanvasTexture | null = null;
let cachedLawnGrassTexture: THREE.CanvasTexture | null = null;
let cachedGrassBumpTexture: THREE.CanvasTexture | null = null;
let cachedSidewalkPaverTexture: THREE.CanvasTexture | null = null;
let cachedAsphaltRoadTexture: THREE.CanvasTexture | null = null;
let cachedInteriorBlindTexture: THREE.CanvasTexture | null = null;

function createFallbackTexture(): THREE.CanvasTexture {
  const dummy = new THREE.Texture();
  return dummy as unknown as THREE.CanvasTexture;
}

/**
 * Shared procedural micro-relief bump map for masonry, concrete, and tile surfaces
 */
export function getArchitecturalBumpMap(): THREE.CanvasTexture {
  if (cachedBumpTexture) return cachedBumpTexture;
  if (typeof document === 'undefined') return createFallbackTexture();

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return createFallbackTexture();

  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 256, 256);

  const img = ctx.getImageData(0, 0, 256, 256);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const px = (i / 4) % 256;
    const py = Math.floor(i / 4 / 256);
    const wave = Math.sin(px * 0.35) * Math.cos(py * 0.35) * 18;
    const grain = ((px * 37 + py * 91) % 23) - 11;
    const v = Math.max(0, Math.min(255, 128 + wave + grain));
    d[i] = v;
    d[i + 1] = v;
    d[i + 2] = v;
  }
  ctx.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  cachedBumpTexture = tex;
  return tex;
}

/**
 * Seamless 512px Botanical Grass & Clover Texture for Lawns, Parks, and Outer Meadow Terrain
 * Replaces flat untextured green surfaces with lush multi-blade turf, clover patches, and wildflower specks.
 */
export function getLawnGrassTexture(): THREE.CanvasTexture {
  if (cachedLawnGrassTexture) return cachedLawnGrassTexture;
  if (typeof document === 'undefined') return createFallbackTexture();

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return createFallbackTexture();

  // Neutral-bright botanical base so material color tinting preserves vibrant greens
  ctx.fillStyle = '#cbe8a6';
  ctx.fillRect(0, 0, 512, 512);

  // Soft organic turf dapple patches (tileable via trigonometric waves)
  const img = ctx.getImageData(0, 0, 512, 512);
  const d = img.data;
  const twoPi = Math.PI * 2;
  for (let py = 0; py < 512; py++) {
    const ny = (py / 512) * twoPi;
    for (let px = 0; px < 512; px++) {
      const nx = (px / 512) * twoPi;
      const idx = (py * 512 + px) * 4;
      const patch =
        Math.sin(nx * 3 + ny * 2) * 9 +
        Math.cos(nx * 5 - ny * 4) * 7 +
        Math.sin(nx * 11 + ny * 9) * 5;
      const micro = (((px * 73 + py * 151) & 31) - 15) * 0.85;
      const delta = patch + micro;
      d[idx] = Math.max(0, Math.min(255, d[idx] + delta * 0.9));
      d[idx + 1] = Math.max(0, Math.min(255, d[idx + 1] + delta * 1.1));
      d[idx + 2] = Math.max(0, Math.min(255, d[idx + 2] + delta * 0.65));
    }
  }
  ctx.putImageData(img, 0, 0);

  // Draw 4,200 individual layered grass blades & clover tufts (wrapped across 512px edges for seamless tiling)
  const bladeColors = [
    'rgba(54, 83, 20, 0.34)',
    'rgba(77, 124, 15, 0.36)',
    'rgba(101, 163, 13, 0.32)',
    'rgba(163, 230, 53, 0.38)',
    'rgba(217, 249, 157, 0.35)',
  ];

  let s = 13579;
  const nextRand = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };

  ctx.lineCap = 'round';
  for (let i = 0; i < 4200; i++) {
    const bx = nextRand() * 512;
    const by = nextRand() * 512;
    const tilt = (nextRand() - 0.5) * 5.5;
    const len = 5 + nextRand() * 7;
    ctx.strokeStyle = bladeColors[i % bladeColors.length];
    ctx.lineWidth = 1.1 + (i % 3) * 0.45;

    // Draw wrapped at boundaries if near edge
    for (const ox of [0, -512, 512]) {
      for (const oy of [0, -512, 512]) {
        const x0 = bx + ox;
        const y0 = by + oy;
        if (x0 < -16 || x0 > 528 || y0 < -16 || y0 > 528) continue;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.quadraticCurveTo(x0 + tilt * 0.45, y0 - len * 0.55, x0 + tilt, y0 - len);
        ctx.stroke();
      }
    }
  }

  // Subtle white/yellow clover & daisy micro-blossoms
  for (let f = 0; f < 95; f++) {
    const fx = nextRand() * 512;
    const fy = nextRand() * 512;
    ctx.fillStyle = f % 3 === 0 ? 'rgba(254, 240, 138, 0.55)' : 'rgba(255, 255, 255, 0.48)';
    ctx.beginPath();
    ctx.arc(fx, fy, 1.3 + (f % 2) * 0.6, 0, twoPi);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  cachedLawnGrassTexture = tex;
  return tex;
}

/**
 * Organic turf bump map for grass lawns & outer meadow ground
 */
export function getGrassBumpMap(): THREE.CanvasTexture {
  if (cachedGrassBumpTexture) return cachedGrassBumpTexture;
  if (typeof document === 'undefined') return createFallbackTexture();

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return createFallbackTexture();

  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 256, 256);

  const img = ctx.getImageData(0, 0, 256, 256);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const px = (i / 4) % 256;
    const py = Math.floor(i / 4 / 256);
    const tuft = Math.sin(px * 0.65) * Math.cos(py * 0.65) * 22;
    const blade = ((px * 53 + py * 113) % 37) - 18;
    const v = Math.max(0, Math.min(255, 128 + tuft + blade));
    d[i] = v;
    d[i + 1] = v;
    d[i + 2] = v;
  }
  ctx.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  cachedGrassBumpTexture = tex;
  return tex;
}

/**
 * Seamless 512px Interlocking Stone & Concrete Sidewalk Paver Texture
 */
export function getSidewalkPaverTexture(): THREE.CanvasTexture {
  if (cachedSidewalkPaverTexture) return cachedSidewalkPaverTexture;
  if (typeof document === 'undefined') return createFallbackTexture();

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return createFallbackTexture();

  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(0, 0, 512, 512);

  const rows = 8;
  const cols = 8;
  const tileW = 512 / cols;
  const tileH = 512 / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * tileW;
      const y = r * tileH;
      const shade = 232 + ((r * 11 + c * 19) % 18);
      const hex = shade.toString(16);
      ctx.fillStyle = `#${hex}${hex}${hex}`;
      ctx.fillRect(x + 2, y + 2, tileW - 4, tileH - 4);

      // Subtle stone bevel highlight
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + 2, y + tileH - 2);
      ctx.lineTo(x + 2, y + 2);
      ctx.lineTo(x + tileW - 2, y + 2);
      ctx.stroke();

      // Mortar groove shadow
      ctx.strokeStyle = 'rgba(100, 116, 139, 0.45)';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, tileW - 2, tileH - 2);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  cachedSidewalkPaverTexture = tex;
  return tex;
}

/**
 * Seamless 512px Asphalt Road Aggregate Texture
 */
export function getAsphaltRoadTexture(): THREE.CanvasTexture {
  if (cachedAsphaltRoadTexture) return cachedAsphaltRoadTexture;
  if (typeof document === 'undefined') return createFallbackTexture();

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return createFallbackTexture();

  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(0, 0, 256, 256);

  const img = ctx.getImageData(0, 0, 256, 256);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const px = (i / 4) % 256;
    const py = Math.floor(i / 4 / 256);
    const pebble = ((px * 67 + py * 131) % 39) - 19;
    const v = Math.max(150, Math.min(245, 205 + pebble));
    d[i] = v;
    d[i + 1] = v;
    d[i + 2] = v;
  }
  ctx.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 2);
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  cachedAsphaltRoadTexture = tex;
  return tex;
}

/**
 * Procedural Architectural Multi-Pane Window Glass Texture
 * Combines deep azure sky reflection, upper Venetian blind slats, diagonal specular sheen, and sash dividers.
 */
export function getWindowPaneTexture(): THREE.CanvasTexture {
  if (cachedInteriorBlindTexture) return cachedInteriorBlindTexture;
  if (typeof document === 'undefined') return createFallbackTexture();

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return createFallbackTexture();

  // Deep reflective sky-blue & interior depth gradient
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0.0, '#1e3a8a');
  grad.addColorStop(0.36, '#2563eb');
  grad.addColorStop(0.72, '#38bdf8');
  grad.addColorStop(1.0, '#0f172a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  // Upper Venetian blind slats in top 32% of window pane
  for (let y = 10; y < 82; y += 9) {
    ctx.fillStyle = 'rgba(254, 249, 195, 0.52)';
    ctx.fillRect(10, y, 236, 5);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
    ctx.fillRect(10, y + 5, 236, 2);
  }

  // Diagonal specular sky reflection streaks
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 18;
  ctx.beginPath();
  ctx.moveTo(-20, 210);
  ctx.lineTo(210, -20);
  ctx.stroke();

  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(25, 245);
  ctx.lineTo(245, 25);
  ctx.stroke();
  ctx.restore();

  // Inner metallic sash frame & cross-mullion shadow lines
  ctx.strokeStyle = 'rgba(241, 245, 249, 0.72)';
  ctx.lineWidth = 6;
  ctx.strokeRect(5, 5, 246, 246);
  ctx.beginPath();
  ctx.moveTo(128, 4);
  ctx.lineTo(128, 252);
  ctx.moveTo(4, 128);
  ctx.lineTo(252, 128);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  cachedInteriorBlindTexture = tex;
  return tex;
}

/**
 * 1. Horizontal Siding Panels (*Yokobari Siding*) - Upgraded 512px with woodgrain & lap-joint shadows
 */
export function getHorizontalSidingTexture(): THREE.CanvasTexture {
  if (cachedSidingTexture) return cachedSidingTexture;
  if (typeof document === 'undefined') return createFallbackTexture();

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return createFallbackTexture();

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 512, 512);

  const numBoards = 14;
  const boardH = 512 / numBoards;

  for (let i = 0; i < numBoards; i++) {
    const yTop = i * boardH;
    const yBottom = (i + 1) * boardH;

    const grad = ctx.createLinearGradient(0, yTop, 0, yBottom);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.18, '#f8fafc');
    grad.addColorStop(0.84, '#f1f5f9');
    grad.addColorStop(1.0, '#cbd5e1');
    ctx.fillStyle = grad;
    ctx.fillRect(0, yTop, 512, boardH);

    // Subtle wood/ceramic fiber grain streaks
    ctx.fillStyle = 'rgba(100, 116, 139, 0.09)';
    for (let g = 0; g < 65; g++) {
      const rx = Math.floor((Math.sin(i * 17 + g * 43) * 0.5 + 0.5) * 512);
      const ry = yTop + Math.floor((Math.cos(g * 23 + i * 11) * 0.5 + 0.5) * (boardH - 3));
      const rw = 14 + (g % 7) * 6;
      ctx.fillRect(rx, ry, rw, 1.5);
    }

    // Specular top bevel highlight
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, yTop + 1);
    ctx.lineTo(512, yTop + 1);
    ctx.stroke();

    // Deep under-lap shadow line
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.72)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, yBottom - 1.2);
    ctx.lineTo(512, yBottom - 1.2);
    ctx.stroke();

    // Vertical caulk expansion seam & staggered board butt joints
    const jointX = ((i * 137) % 420) + 46;
    ctx.strokeStyle = 'rgba(100, 116, 139, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(jointX, yTop + 1);
    ctx.lineTo(jointX, yBottom - 1);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 1);
  texture.anisotropy = 8;
  texture.colorSpace = THREE.SRGBColorSpace;
  cachedSidingTexture = texture;
  return texture;
}

/**
 * 2. Running-Bond Exterior Ceramic Wall Tiles (*Gaiheki Tai-ru*) - Upgraded 512px with glazed bevels
 */
export function getBrickTileTexture(): THREE.CanvasTexture {
  if (cachedBrickTexture) return cachedBrickTexture;
  if (typeof document === 'undefined') return createFallbackTexture();

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return createFallbackTexture();

  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(0, 0, 512, 512);

  const numRows = 16;
  const rowH = 512 / numRows;
  const brickW = 64;
  const mortar = 2.5;

  for (let r = 0; r < numRows; r++) {
    const y = r * rowH;
    const offset = (r % 2) * (brickW / 2);
    const numCols = Math.ceil(512 / brickW) + 2;

    for (let c = -1; c < numCols; c++) {
      const x = c * brickW + offset;
      const seed = Math.sin(r * 41 + c * 17) * 0.5 + 0.5;
      const shade = Math.floor(236 + seed * 18);
      const hexShade = shade.toString(16);
      ctx.fillStyle = `#${hexShade}${hexShade}${hexShade}`;
      ctx.fillRect(x + mortar, y + mortar, brickW - mortar * 2, rowH - mortar * 2);

      // Glazed top/left highlight
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + mortar, y + rowH - mortar);
      ctx.lineTo(x + mortar, y + mortar);
      ctx.lineTo(x + brickW - mortar, y + mortar);
      ctx.stroke();

      // Bottom/right recessed mortar shadow
      ctx.strokeStyle = 'rgba(100, 116, 139, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + mortar, y + rowH - mortar);
      ctx.lineTo(x + brickW - mortar, y + rowH - mortar);
      ctx.lineTo(x + brickW - mortar, y + mortar);
      ctx.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  texture.anisotropy = 8;
  texture.colorSpace = THREE.SRGBColorSpace;
  cachedBrickTexture = texture;
  return texture;
}

/**
 * 3. Exposed Architectural Formwork Concrete (*Uchippanashi Konkuriito*)
 */
export function getConcretePanelTexture(): THREE.CanvasTexture {
  if (cachedConcreteTexture) return cachedConcreteTexture;
  if (typeof document === 'undefined') return createFallbackTexture();

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return createFallbackTexture();

  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(0, 0, 512, 512);

  const imgData = ctx.getImageData(0, 0, 512, 512);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const px = (i / 4) % 512;
    const py = Math.floor(i / 4 / 512);
    const wave = Math.sin(px * 0.08 + py * 0.05) * 5;
    const n = ((px * 19 + py * 47) % 15) - 7 + wave;
    data[i] = Math.min(255, Math.max(0, data[i] + n));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + n));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + n));
  }
  ctx.putImageData(imgData, 0, 0);

  // Formwork panel joints
  ctx.strokeStyle = 'rgba(71, 85, 105, 0.55)';
  ctx.lineWidth = 3;
  ctx.strokeRect(3, 3, 506, 506);
  ctx.beginPath();
  ctx.moveTo(256, 0);
  ctx.lineTo(256, 512);
  ctx.moveTo(0, 256);
  ctx.lineTo(512, 256);
  ctx.stroke();

  // Iconic Tadao Ando style P-Con tie-rod cone holes
  const pConPositions = [
    { x: 48, y: 48 }, { x: 208, y: 48 }, { x: 48, y: 208 }, { x: 208, y: 208 },
    { x: 304, y: 48 }, { x: 464, y: 48 }, { x: 304, y: 208 }, { x: 464, y: 208 },
    { x: 48, y: 304 }, { x: 208, y: 304 }, { x: 48, y: 464 }, { x: 208, y: 464 },
    { x: 304, y: 304 }, { x: 464, y: 304 }, { x: 304, y: 464 }, { x: 464, y: 464 },
  ];

  pConPositions.forEach((p) => {
    ctx.fillStyle = 'rgba(71, 85, 105, 0.55)';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(p.x + 1, p.y + 1, 7, Math.PI * 0.8, Math.PI * 1.8);
    ctx.stroke();
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 1);
  texture.anisotropy = 8;
  texture.colorSpace = THREE.SRGBColorSpace;
  cachedConcreteTexture = texture;
  return texture;
}

/**
 * 4. Troweled Stucco / Plaster (*Shikkui / Morutaru*)
 */
export function getStuccoWallTexture(): THREE.CanvasTexture {
  if (cachedStuccoTexture) return cachedStuccoTexture;
  if (typeof document === 'undefined') return createFallbackTexture();

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return createFallbackTexture();

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 512, 512);

  const imgData = ctx.getImageData(0, 0, 512, 512);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const x = (i / 4) % 512;
    const y = Math.floor(i / 4 / 512);
    const n1 = Math.sin(x * 0.16 + y * 0.12) * 5;
    const n2 = Math.cos(x * 0.38 - y * 0.28) * 4;
    const n3 = ((x * 29 + y * 53) % 13) - 6;
    const total = n1 + n2 + n3;

    data[i] = Math.min(255, Math.max(0, data[i] + total));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + total));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + total));
  }
  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  texture.anisotropy = 8;
  texture.colorSpace = THREE.SRGBColorSpace;
  cachedStuccoTexture = texture;
  return texture;
}

/**
 * 5. Traditional Japanese *Hongawara* Ceramic Roof Tiles (*Kawara*)
 */
export function getKawaraTileTexture(): THREE.CanvasTexture {
  if (cachedKawaraTexture) return cachedKawaraTexture;
  if (typeof document === 'undefined') return createFallbackTexture();

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return createFallbackTexture();

  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(0, 0, 512, 512);

  const cols = 16;
  const colW = 512 / cols;
  const rows = 10;
  const rowH = 512 / rows;

  for (let c = 0; c < cols; c++) {
    const x = c * colW;
    const grad = ctx.createLinearGradient(x, 0, x + colW, 0);
    grad.addColorStop(0.0, '#64748b');
    grad.addColorStop(0.22, '#e2e8f0');
    grad.addColorStop(0.62, '#cbd5e1');
    grad.addColorStop(0.82, '#ffffff');
    grad.addColorStop(1.0, '#475569');
    ctx.fillStyle = grad;
    ctx.fillRect(x, 0, colW, 512);
  }

  for (let r = 1; r <= rows; r++) {
    const y = r * rowH;
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.65)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, y - 3);
    ctx.lineTo(512, y - 3);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  texture.anisotropy = 8;
  texture.colorSpace = THREE.SRGBColorSpace;
  cachedKawaraTexture = texture;
  return texture;
}

/**
 * 6. Japanese Castle & Temple Fitted Stonework (*Ishigaki*)
 */
export function getIshigakiStoneTexture(): THREE.CanvasTexture {
  if (cachedIshigakiTexture) return cachedIshigakiTexture;
  if (typeof document === 'undefined') return createFallbackTexture();

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return createFallbackTexture();

  ctx.fillStyle = '#292524';
  ctx.fillRect(0, 0, 512, 512);

  const rows = 8;
  const rowH = 512 / rows;

  for (let r = 0; r < rows; r++) {
    const y = r * rowH;
    let x = -((r * 37) % 54);
    let col = 0;
    while (x < 512) {
      const w = 68 + ((r * 23 + col * 37) % 44);
      const h = rowH - 6;
      const shade = 175 + ((r * 17 + col * 31) % 60);
      const hex = shade.toString(16);

      const grad = ctx.createLinearGradient(x, y, x + w, y + h);
      grad.addColorStop(0, `#${hex}${hex}${hex}`);
      const darker = Math.max(120, shade - 28).toString(16);
      grad.addColorStop(1, `#${darker}${darker}${darker}`);
      ctx.fillStyle = grad;

      ctx.beginPath();
      ctx.roundRect(x + 3, y + 3, w - 6, h, 8);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();

      x += w;
      col++;
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  texture.anisotropy = 8;
  texture.colorSpace = THREE.SRGBColorSpace;
  cachedIshigakiTexture = texture;
  return texture;
}

/**
 * Builds an authentic rectangular Japanese *Irimoya* (Hip-and-Gable) Roof
 * with flared eaves, carved *Masugumi* timber brackets, corner bronze *Fūtaku* wind-bells,
 * diagonal hip ridges (*Kudari-mune*), and *Onigawara* ridge-end finials.
 */
export function buildJapaneseIrimoyaRoof(options: {
  width: number;
  depth: number;
  height: number;
  roofMat: THREE.Material;
  gableWallMat?: THREE.Material;
  trimMat?: THREE.Material;
  goldMat?: THREE.Material;
}): THREE.Group {
  const {
    width,
    depth,
    height,
    roofMat,
    gableWallMat = new THREE.MeshStandardMaterial({ color: 0xfafaf9, roughness: 0.5 }),
    trimMat = new THREE.MeshStandardMaterial({ color: 0x292524, roughness: 0.7 }),
    goldMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.75, roughness: 0.25 }),
  } = options;

  const roofGroup = new THREE.Group();

  // 1. Flared Lower Eaves Skirt (Bottom 42% of roof height)
  const skirtH = height * 0.42;
  const topWidthRatio = 0.72;
  const topDepthRatio = 0.68;

  const skirtGeo = new THREE.CylinderGeometry(Math.SQRT1_2 * topWidthRatio, Math.SQRT1_2, skirtH, 4);
  skirtGeo.rotateY(Math.PI / 4);
  const skirt = new THREE.Mesh(skirtGeo, roofMat);
  skirt.scale.set(width, 1.0, depth);
  skirt.position.set(0, skirtH / 2, 0);
  skirt.castShadow = true;
  skirt.receiveShadow = true;
  roofGroup.add(skirt);

  // Dark eaves fascia lip & under-eaves rafters (*Taruki*)
  const eavesRim = new THREE.Mesh(new THREE.BoxGeometry(width + 0.12, 0.12, depth + 0.12), trimMat);
  eavesRim.position.set(0, 0.06, 0);
  roofGroup.add(eavesRim);

  // Exposed wooden rafter tails (*Taruki*) along front and rear eaves
  const rafterCount = Math.min(14, Math.max(6, Math.floor(width * 1.4)));
  const rafterGeo = new THREE.BoxGeometry(0.06, 0.05, 0.26);
  for (let i = 0; i < rafterCount; i++) {
    const rx = -width * 0.44 + (i / (rafterCount - 1)) * (width * 0.88);
    const rFront = new THREE.Mesh(rafterGeo, trimMat);
    rFront.position.set(rx, 0.02, depth / 2 - 0.06);
    const rBack = new THREE.Mesh(rafterGeo, trimMat);
    rBack.position.set(rx, 0.02, -depth / 2 + 0.06);
    roofGroup.add(rFront, rBack);
  }

  // Corner Bronze Wind-Bells (*Fūtaku*) hanging under the 4 flared eaves corners
  const cornerX = width * 0.47;
  const cornerZ = depth * 0.47;
  [
    [-cornerX, -cornerZ],
    [cornerX, -cornerZ],
    [-cornerX, cornerZ],
    [cornerX, cornerZ],
  ].forEach(([cx, cz]) => {
    const bell = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.16, 8), goldMat);
    bell.position.set(cx, -0.08, cz);
    roofGroup.add(bell);
  });

  // 2. Upper Pitched Gable Section (Top 58% of roof height, running along X-axis)
  const gableW = width * topWidthRatio;
  const gableD = depth * topDepthRatio;
  const gableH = height * 0.58;
  const baseY = skirtH - 0.04;

  // White plaster triangular gable walls (East & West ends) + ornamental *Gegyo* bargeboard pendant
  const triShape = new THREE.Shape();
  triShape.moveTo(-gableD / 2, 0);
  triShape.lineTo(0, gableH);
  triShape.lineTo(gableD / 2, 0);
  triShape.closePath();

  const gableWallGeo = new THREE.ExtrudeGeometry(triShape, { depth: gableW, bevelEnabled: false });
  gableWallGeo.rotateY(Math.PI / 2);
  gableWallGeo.translate(-gableW / 2, baseY, 0);
  const gableWall = new THREE.Mesh(gableWallGeo, gableWallMat);
  gableWall.castShadow = true;
  roofGroup.add(gableWall);

  // Golden *Gegyo* gable apex ornaments on East & West gable faces
  [-gableW / 2 - 0.03, gableW / 2 + 0.03].forEach((gx) => {
    const gegyo = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0), goldMat);
    gegyo.position.set(gx, baseY + gableH * 0.68, 0);
    roofGroup.add(gegyo);
  });

  // Front & Rear Sloped Upper Roof Planes
  const overhang = 0.28;
  const slopeLen = Math.hypot(gableD / 2 + overhang, gableH);
  const slopeAngle = Math.atan2(gableH, gableD / 2);
  const slopeGeo = new THREE.BoxGeometry(gableW + 0.44, 0.14, slopeLen);

  const frontSlope = new THREE.Mesh(slopeGeo, roofMat);
  frontSlope.position.set(0, baseY + gableH / 2, gableD / 4 + overhang * 0.3);
  frontSlope.rotation.x = slopeAngle;
  frontSlope.castShadow = true;

  const backSlope = new THREE.Mesh(slopeGeo, roofMat);
  backSlope.position.set(0, baseY + gableH / 2, -(gableD / 4) - overhang * 0.3);
  backSlope.rotation.x = -slopeAngle;
  backSlope.castShadow = true;

  roofGroup.add(frontSlope, backSlope);

  // 3. Heavy Horizontal Ridge Beam (*Ō-mune*) & *Onigawara* End-Cap Finials
  const ridgeLen = gableW + 0.6;
  const ridgeBeam = new THREE.Mesh(new THREE.BoxGeometry(ridgeLen, 0.26, 0.28), trimMat);
  ridgeBeam.position.set(0, baseY + gableH + 0.09, 0);
  const goldCrestStrip = new THREE.Mesh(new THREE.BoxGeometry(ridgeLen - 0.2, 0.06, 0.30), goldMat);
  goldCrestStrip.position.set(0, baseY + gableH + 0.14, 0);
  roofGroup.add(ridgeBeam, goldCrestStrip);

  [-ridgeLen / 2, ridgeLen / 2].forEach((rx) => {
    const onigawara = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.38, 0.34), trimMat);
    onigawara.position.set(rx, baseY + gableH + 0.14, 0);
    const goldMedallion = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.20, 10), goldMat);
    goldMedallion.rotation.z = Math.PI / 2;
    goldMedallion.position.set(rx, baseY + gableH + 0.16, 0);
    roofGroup.add(onigawara, goldMedallion);
  });

  return roofGroup;
}

/**
 * Builds an open 4-sided perimeter safety railing with corner newel posts, top/mid rails,
 * rotary ventilation cowls, photovoltaic solar arrays, and louvered HVAC cooling chiller units.
 */
export function buildPerimeterRailing(
  width: number,
  depth: number,
  height: number,
  mat: THREE.Material,
  postSpacing: number = 1.6
): THREE.Group {
  const group = new THREE.Group();
  const halfW = width / 2;
  const halfD = depth / 2;
  const barThickness = 0.055;

  [height, height * 0.52].forEach((ry) => {
    const nsGeo = new THREE.BoxGeometry(width + 0.06, barThickness, barThickness);
    const north = new THREE.Mesh(nsGeo, mat);
    north.position.set(0, ry, -halfD);
    const south = new THREE.Mesh(nsGeo, mat);
    south.position.set(0, ry, halfD);

    const ewGeo = new THREE.BoxGeometry(barThickness, barThickness, depth + 0.06);
    const west = new THREE.Mesh(ewGeo, mat);
    west.position.set(-halfW, ry, 0);
    const east = new THREE.Mesh(ewGeo, mat);
    east.position.set(halfW, ry, 0);

    group.add(north, south, west, east);
  });

  const xCount = Math.max(2, Math.round(width / postSpacing));
  const postGeo = new THREE.BoxGeometry(barThickness * 1.15, height + 0.06, barThickness * 1.15);
  for (let i = 0; i <= xCount; i++) {
    const px = -halfW + (i / xCount) * width;
    const pNorth = new THREE.Mesh(postGeo, mat);
    pNorth.position.set(px, height / 2, -halfD);
    const pSouth = new THREE.Mesh(postGeo, mat);
    pSouth.position.set(px, height / 2, halfD);
    group.add(pNorth, pSouth);
  }

  const zCount = Math.max(2, Math.round(depth / postSpacing));
  for (let i = 1; i < zCount; i++) {
    const pz = -halfD + (i / zCount) * depth;
    const pWest = new THREE.Mesh(postGeo, mat);
    pWest.position.set(-halfW, height / 2, pz);
    const pEast = new THREE.Mesh(postGeo, mat);
    pEast.position.set(halfW, height / 2, pz);
    group.add(pWest, pEast);
  }

  // Corner Newel Finial Caps
  const capGeo = new THREE.BoxGeometry(barThickness * 1.8, 0.06, barThickness * 1.8);
  [
    [-halfW, -halfD],
    [halfW, -halfD],
    [-halfW, halfD],
    [halfW, halfD],
  ].forEach(([cx, cz]) => {
    const cap = new THREE.Mesh(capGeo, mat);
    cap.position.set(cx, height + 0.04, cz);
    group.add(cap);
  });

  // Rooftop MEP Equipment: Rotary Ventilation Cowls (*Benchirētā*), Solar Panel Array & HVAC Chiller
  if (width >= 4.0 && depth >= 2.6) {
    const steelMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.78, roughness: 0.25 });
    const darkGrilleMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.45, roughness: 0.6 });
    const solarMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.78, roughness: 0.18 });
    const chillerBodyMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.5, metalness: 0.25 });

    // Twin stainless steel rotary turbine vents near rear-right corner
    [-0.38, 0.38].forEach((offsetX) => {
      const ventStack = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 0.28, 10), steelMat);
      ventStack.position.set(halfW - 0.85 + offsetX, 0.14, -halfD + 0.65);
      const turbineHead = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), steelMat);
      turbineHead.scale.set(1.0, 0.75, 1.0);
      turbineHead.position.set(halfW - 0.85 + offsetX, 0.34, -halfD + 0.65);
      group.add(ventStack, turbineHead);
    });

    // Angled photovoltaic solar panel rack near rear-left corner
    const panelW = Math.min(2.2, width * 0.32);
    const panelD = Math.min(1.1, depth * 0.26);
    const solarPanel = new THREE.Mesh(new THREE.BoxGeometry(panelW, 0.045, panelD), solarMat);
    solarPanel.position.set(-halfW + panelW * 0.65 + 0.35, 0.22, -halfD + panelD * 0.6 + 0.35);
    solarPanel.rotation.x = 0.24;
    const solarFrame = new THREE.Mesh(new THREE.BoxGeometry(panelW + 0.06, 0.03, panelD + 0.06), steelMat);
    solarFrame.position.copy(solarPanel.position);
    solarFrame.rotation.x = 0.24;
    group.add(solarPanel, solarFrame);

    // Rooftop Louvered HVAC Chiller Unit & Ductwork on larger roofs
    if (width >= 5.2 && depth >= 3.2) {
      const chillerGroup = new THREE.Group();
      chillerGroup.position.set(0, 0, -halfD + 0.72);
      const cBox = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.52, 0.68), chillerBodyMat);
      cBox.position.y = 0.26;
      cBox.castShadow = true;
      chillerGroup.add(cBox);

      [-0.28, 0.28].forEach((fx) => {
        const shroud = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.23, 0.08, 12), darkGrilleMat);
        shroud.position.set(fx, 0.54, 0);
        chillerGroup.add(shroud);
      });
      group.add(chillerGroup);
    }
  }

  return group;
}

/**
 * Builds a detailed outdoor Japanese split-system air-conditioner compressor unit (*Shitsugaiki*)
 * complete with fan grille, rubber mounting feet, and refrigerant conduit pipe.
 */
export function buildOutdoorAcUnit(): THREE.Group {
  const ac = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.55 });
  const grilleMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 });
  const bracketMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.6, roughness: 0.4 });

  const casing = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.48, 0.68), bodyMat);
  casing.position.y = 0.28;
  casing.castShadow = true;

  const fanGrille = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.03, 12), grilleMat);
  fanGrille.rotation.z = Math.PI / 2;
  fanGrille.position.set(0.145, 0.28, -0.06);

  const foot1 = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.04, 0.08), bracketMat);
  foot1.position.set(0, 0.02, -0.22);
  const foot2 = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.04, 0.08), bracketMat);
  foot2.position.set(0, 0.02, 0.22);

  // Refrigerant insulated copper conduit pipe rising along the wall
  const conduit = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.65, 6), bracketMat);
  conduit.position.set(-0.08, 0.48, 0.26);

  ac.add(casing, fanGrille, foot1, foot2, conduit);
  return ac;
}

/**
 * Adds framed architectural windows with protruding sills, cross-mullion sash bars,
 * recessed interior Venetian blinds, 1st-floor window sun-awnings (*Hisashi*),
 * corner rain downspouts (*Amadoi*), electric utility meter boxes, and fire-escape ladders.
 */
export function addWrapAroundWindows(options: {
  targetGroup: THREE.Group;
  bW: number;
  bD: number;
  floorHeights: number[];
  winW: number;
  winH: number;
  sideCols: number;
  backCols: number;
  glassMat: THREE.Material;
  frameMat: THREE.Material;
}): void {
  const { targetGroup, bW, bD, floorHeights, winW, winH, sideCols, backCols, glassMat, frameMat } = options;

  const sillMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.55, metalness: 0.25 });
  const pipeMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.65, roughness: 0.35 });
  const hisashiMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    metalness: 0.55,
    roughness: 0.4,
  });

  const sideWinGeo = new THREE.BoxGeometry(0.025, winH, winW);
  const sideFrameGeo = new THREE.BoxGeometry(0.04, winH + 0.1, winW + 0.1);
  const sideSillGeo = new THREE.BoxGeometry(0.14, 0.06, winW + 0.18);
  const sideHeaderGeo = new THREE.BoxGeometry(0.12, 0.055, winW + 0.16);
  const sideMullionHGeo = new THREE.BoxGeometry(0.03, 0.04, winW);
  const sideMullionVGeo = new THREE.BoxGeometry(0.03, winH, 0.04);
  const sideHisashiGeo = new THREE.BoxGeometry(0.24, 0.04, winW + 0.22);

  const backWinGeo = new THREE.BoxGeometry(winW, winH, 0.025);
  const backFrameGeo = new THREE.BoxGeometry(winW + 0.1, winH + 0.1, 0.04);
  const backSillGeo = new THREE.BoxGeometry(winW + 0.18, 0.06, 0.14);
  const backHeaderGeo = new THREE.BoxGeometry(winW + 0.16, 0.055, 0.12);
  const backMullionHGeo = new THREE.BoxGeometry(winW, 0.04, 0.03);
  const backMullionVGeo = new THREE.BoxGeometry(0.04, winH, 0.03);

  floorHeights.forEach((wy, floorIdx) => {
    // West (-X) & East (+X) Side Windows with Sills, Lintels & Cross-Mullions
    for (let c = 0; c < sideCols; c++) {
      const wz = -((sideCols - 1) / 2 - c) * ((bD - 1.4) / Math.max(1, sideCols - 1));
      [-bW / 2, bW / 2].forEach((wx) => {
        const sign = wx < 0 ? -1 : 1;
        const frame = new THREE.Mesh(sideFrameGeo, frameMat);
        frame.position.set(wx + sign * 0.018, wy, wz);

        const glass = new THREE.Mesh(sideWinGeo, glassMat);
        glass.userData.skipWindowEnhance = true;
        glass.position.set(wx + sign * 0.038, wy, wz);

        const sill = new THREE.Mesh(sideSillGeo, sillMat);
        sill.position.set(wx + sign * 0.05, wy - winH / 2 - 0.03, wz);

        const header = new THREE.Mesh(sideHeaderGeo, sillMat);
        header.position.set(wx + sign * 0.045, wy + winH / 2 + 0.03, wz);

        const mullH = new THREE.Mesh(sideMullionHGeo, frameMat);
        mullH.position.set(wx + sign * 0.048, wy, wz);
        const mullV = new THREE.Mesh(sideMullionVGeo, frameMat);
        mullV.position.set(wx + sign * 0.048, wy, wz);

        targetGroup.add(frame, glass, sill, header, mullH, mullV);

        // Ground-floor window metal sun-visor canopy (*Hisashi*)
        if (floorIdx === 0) {
          const hisashi = new THREE.Mesh(sideHisashiGeo, hisashiMat);
          hisashi.position.set(wx + sign * 0.11, wy + winH / 2 + 0.09, wz);
          hisashi.rotation.z = sign > 0 ? -0.18 : 0.18;
          targetGroup.add(hisashi);
        }
      });
    }

    // North (-Z) Rear Windows with Sills, Lintels & Cross-Mullions
    for (let c = 0; c < backCols; c++) {
      const wx = -((backCols - 1) / 2 - c) * ((bW - 1.8) / Math.max(1, backCols - 1));
      const frame = new THREE.Mesh(backFrameGeo, frameMat);
      frame.position.set(wx, wy, -bD / 2 - 0.018);

      const glass = new THREE.Mesh(backWinGeo, glassMat);
      glass.userData.skipWindowEnhance = true;
      glass.position.set(wx, wy, -bD / 2 - 0.038);

      const sill = new THREE.Mesh(backSillGeo, sillMat);
      sill.position.set(wx, wy - winH / 2 - 0.03, -bD / 2 - 0.05);

      const header = new THREE.Mesh(backHeaderGeo, sillMat);
      header.position.set(wx, wy + winH / 2 + 0.03, -bD / 2 - 0.045);

      const mullH = new THREE.Mesh(backMullionHGeo, frameMat);
      mullH.position.set(wx, wy, -bD / 2 - 0.048);
      const mullV = new THREE.Mesh(backMullionVGeo, frameMat);
      mullV.position.set(wx, wy, -bD / 2 - 0.048);

      targetGroup.add(frame, glass, sill, header, mullH, mullV);
    }
  });

  // Add Vertical Rainwater Downspouts (*Amadoi*) with Mounting Straps at Rear Corners
  const maxFloorY = floorHeights.length > 0 ? Math.max(...floorHeights) + winH : 3.6;
  const pipeGeo = new THREE.CylinderGeometry(0.032, 0.032, maxFloorY, 8);
  const strapGeo = new THREE.BoxGeometry(0.10, 0.04, 0.09);
  [-bW / 2 + 0.14, bW / 2 - 0.14].forEach((px) => {
    const downspout = new THREE.Mesh(pipeGeo, pipeMat);
    downspout.position.set(px, maxFloorY / 2, -bD / 2 - 0.04);
    targetGroup.add(downspout);

    for (let sy = 0.8; sy < maxFloorY - 0.3; sy += 1.4) {
      const strap = new THREE.Mesh(strapGeo, pipeMat);
      strap.position.set(px, sy, -bD / 2 - 0.035);
      targetGroup.add(strap);
    }
  });

  // Wall-Mounted Electric & Gas Utility Meter Box (*Denki Mētā*) with Conduit Pipe on East Side Wall
  const meterBoxMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.5, roughness: 0.4 });
  const meterWindowMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8, roughness: 0.2 });
  const meterBox = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.42, 0.28), meterBoxMat);
  meterBox.position.set(bW / 2 + 0.045, 1.35, -bD * 0.28);
  const meterGauge = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.14, 0.18), meterWindowMat);
  meterGauge.position.set(bW / 2 + 0.048, 1.42, -bD * 0.28);
  const meterConduit = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.8, 6), pipeMat);
  meterConduit.position.set(bW / 2 + 0.035, 1.5, -bD * 0.28 - 0.18);
  targetGroup.add(meterBox, meterGauge, meterConduit);

  // Exterior Steel Emergency Fire-Escape Ladder on Multi-Story Civic/Commercial Buildings
  if (maxFloorY >= 4.2 && bW >= 5.5) {
    const ladderX = -bW / 2 + 0.72;
    const ladderH = maxFloorY - 0.4;
    const railGeo = new THREE.CylinderGeometry(0.018, 0.018, ladderH, 6);
    const railL = new THREE.Mesh(railGeo, pipeMat);
    railL.position.set(ladderX - 0.18, ladderH / 2 + 0.35, -bD / 2 - 0.09);
    const railR = new THREE.Mesh(railGeo, pipeMat);
    railR.position.set(ladderX + 0.18, ladderH / 2 + 0.35, -bD / 2 - 0.09);
    targetGroup.add(railL, railR);

    const rungGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.36, 6);
    rungGeo.rotateZ(Math.PI / 2);
    for (let ry = 0.65; ry <= ladderH + 0.2; ry += 0.34) {
      const rung = new THREE.Mesh(rungGeo, pipeMat);
      rung.position.set(ladderX, ry, -bD / 2 - 0.09);
      targetGroup.add(rung);
    }
  }

  // Ground-level Rear Outdoor AC Compressors (*Shitsugaiki*)
  [-bW * 0.25, bW * 0.25].forEach((acX) => {
    const ac = buildOutdoorAcUnit();
    ac.rotation.y = -Math.PI / 2;
    ac.position.set(acX, 0.02, -bD / 2 - 0.18);
    targetGroup.add(ac);
  });
}

/**
 * Post-processes any building model THREE.Group so that:
 * 1. Untextured green lawn/grass horizontal slabs get `getLawnGrassTexture()` + `getGrassBumpMap()`
 * 2. Untextured gray foundation/sidewalk/plaza horizontal slabs get `getSidewalkPaverTexture()` + `getArchitecturalBumpMap()`
 * 3. Untextured dark asphalt road slabs get `getAsphaltRoadTexture()`
 * 4. All textured masonry/siding/concrete/stucco/tile walls & roofs get `getArchitecturalBumpMap()`
 * 5. Building windows get multi-pane architectural sash textures + 3D sills, lintels & exterior cross-mullions
 */
export function enhanceBuildingGroup(group: THREE.Group): THREE.Group {
  if (group.userData.enhancedDetails) return group;
  group.userData.enhancedDetails = true;

  const grassTex = getLawnGrassTexture();
  const grassBump = getGrassBumpMap();
  const paverTex = getSidewalkPaverTexture();
  const asphaltTex = getAsphaltRoadTexture();
  const archBump = getArchitecturalBumpMap();
  const winPaneTex = getWindowPaneTexture();

  const lintelMat = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    roughness: 0.55,
    metalness: 0.25,
  });
  const mullionMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.45,
    metalness: 0.4,
  });

  const processedMaterials = new Set<THREE.Material>();
  const frontWindowsToEnhance: THREE.Mesh[] = [];

  group.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh || !mesh.material) return;

    const geomParams = (mesh.geometry as any)?.parameters;
    const meshWidth = geomParams?.width ?? 1.0;
    const meshHeight = geomParams?.height ?? 1.0;
    const meshDepth = geomParams?.depth ?? 1.0;
    const isFlatGroundSlab =
      mesh.geometry.type === 'PlaneGeometry' ||
      (mesh.geometry.type === 'BoxGeometry' && meshHeight <= 0.36 && mesh.position.y <= 0.38);

    // Detect front-facing building windows that need 3D sills, lintels & mullions
    if (
      !Array.isArray(mesh.material) &&
      mesh.geometry.type === 'BoxGeometry' &&
      meshDepth <= 0.065 &&
      meshWidth >= 0.48 &&
      meshWidth <= 2.15 &&
      meshHeight >= 0.48 &&
      meshHeight <= 1.65 &&
      mesh.position.z >= 0.6 &&
      mesh.position.y >= 0.85 &&
      !mesh.userData.skipWindowEnhance
    ) {
      const m = mesh.material as THREE.MeshStandardMaterial;
      if (m.isMeshStandardMaterial && m.transparent && m.opacity >= 0.58 && m.opacity <= 0.88) {
        frontWindowsToEnhance.push(mesh);
      }
    }

    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of materials) {
      const mat = m as THREE.MeshStandardMaterial;
      if (!mat || !mat.isMeshStandardMaterial || processedMaterials.has(mat)) continue;

      const c = mat.color;
      if (!c) continue;

      // 1. Textured Grass Upgrade: strictly on horizontal flat lawn/turf slabs (NEVER tree cones/foliage!)
      const isGreenTurf = c.g > 0.32 && c.g > c.r * 1.18 && c.g > c.b * 1.18 && !mat.transparent;
      if (!mat.map && isGreenTurf && isFlatGroundSlab) {
        mat.map = grassTex;
        mat.bumpMap = grassBump;
        mat.bumpScale = 0.025;
        mat.roughness = 0.88;
        mat.needsUpdate = true;
        processedMaterials.add(mat);
        continue;
      }

      // 2. Textured Sidewalk / Apron / Plaza Stone Pavers on horizontal slabs
      const isNeutralLightGray =
        Math.abs(c.r - c.g) < 0.08 &&
        Math.abs(c.g - c.b) < 0.10 &&
        c.r >= 0.65 &&
        c.r <= 0.96 &&
        !mat.transparent &&
        mat.metalness < 0.25;
      if (!mat.map && isFlatGroundSlab && isNeutralLightGray && meshHeight >= 0.04) {
        mat.map = paverTex;
        mat.bumpMap = archBump;
        mat.bumpScale = 0.012;
        mat.roughness = 0.78;
        mat.needsUpdate = true;
        processedMaterials.add(mat);
        continue;
      }

      // 3. Textured Asphalt Road Slab
      const isDarkAsphalt =
        Math.abs(c.r - c.g) < 0.08 &&
        Math.abs(c.g - c.b) < 0.10 &&
        c.r >= 0.10 &&
        c.r <= 0.32 &&
        !mat.transparent &&
        mat.roughness >= 0.8;
      if (!mat.map && isFlatGroundSlab && isDarkAsphalt && meshHeight <= 0.08) {
        mat.map = asphaltTex;
        mat.bumpMap = archBump;
        mat.bumpScale = 0.018;
        mat.needsUpdate = true;
        processedMaterials.add(mat);
        continue;
      }

      // 4. Add micro-relief bump mapping to all textured architectural walls & roofs
      if (mat.map && !mat.bumpMap && !mat.emissiveMap) {
        mat.bumpMap = archBump;
        mat.bumpScale = 0.018;
        mat.needsUpdate = true;
        processedMaterials.add(mat);
        continue;
      }

      // 5. Enhance transparent building window glass with multi-pane sash & Venetian blind texture
      if (mat.transparent && mat.opacity >= 0.58 && mat.opacity <= 0.74 && !mat.map) {
        mat.map = winPaneTex;
        mat.color.setHex(0xe0f2fe);
        mat.opacity = 0.84;
        mat.roughness = 0.12;
        mat.metalness = 0.22;
        mat.envMapIntensity = 1.35;
        mat.needsUpdate = true;
        processedMaterials.add(mat);
      }
    }
  });

  // Add 3D window sills, top lintels, and cross-mullion bars to front-facing building windows
  for (const winMesh of frontWindowsToEnhance) {
    winMesh.userData.skipWindowEnhance = true;
    const parent = winMesh.parent;
    if (!parent) continue;
    const params = (winMesh.geometry as any)?.parameters;
    const w = params?.width ?? 0.85;
    const h = params?.height ?? 0.85;
    const d = params?.depth ?? 0.03;

    // Ensure window glass sits cleanly in front of any frame box
    winMesh.position.z += 0.018;

    const frontZ = winMesh.position.z + d / 2 + 0.008;
    const sill = new THREE.Mesh(new THREE.BoxGeometry(w + 0.16, 0.055, 0.12), lintelMat);
    sill.position.set(winMesh.position.x, winMesh.position.y - h / 2 - 0.025, frontZ);
    sill.rotation.copy(winMesh.rotation);

    const lintel = new THREE.Mesh(new THREE.BoxGeometry(w + 0.14, 0.05, 0.10), lintelMat);
    lintel.position.set(winMesh.position.x, winMesh.position.y + h / 2 + 0.025, frontZ);
    lintel.rotation.copy(winMesh.rotation);

    const mullH = new THREE.Mesh(new THREE.BoxGeometry(w, 0.032, 0.025), mullionMat);
    mullH.position.set(winMesh.position.x, winMesh.position.y, frontZ);
    mullH.rotation.copy(winMesh.rotation);

    const mullV = new THREE.Mesh(new THREE.BoxGeometry(0.032, h, 0.025), mullionMat);
    mullV.position.set(winMesh.position.x, winMesh.position.y, frontZ);
    mullV.rotation.copy(winMesh.rotation);

    parent.add(sill, lintel, mullH, mullV);
  }

  return group;
}
