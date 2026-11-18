import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// =========================================================================
// MODULE-LEVEL SINGLETON GEOMETRIES & TEXTURES (0ms kart instantiation!)
// =========================================================================
let _sharedShadowTex = null;
function getSharedShadowTexture() {
  if (!_sharedShadowTex) {
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 256;
    shadowCanvas.height = 256;
    const sCtx = shadowCanvas.getContext('2d');
    sCtx.clearRect(0, 0, 256, 256);

    sCtx.save();
    sCtx.translate(128, 128);
    sCtx.scale(0.86, 1.08);
    const penumbraGrad = sCtx.createRadialGradient(0, 0, 14, 0, 0, 112);
    penumbraGrad.addColorStop(0.0, 'rgba(2, 2, 5, 0.92)');
    penumbraGrad.addColorStop(0.48, 'rgba(3, 3, 7, 0.76)');
    penumbraGrad.addColorStop(0.76, 'rgba(5, 5, 10, 0.34)');
    penumbraGrad.addColorStop(1.0, 'rgba(6, 6, 12, 0.0)');
    sCtx.fillStyle = penumbraGrad;
    sCtx.beginPath();
    sCtx.arc(0, 0, 112, 0, Math.PI * 2);
    sCtx.fill();
    sCtx.restore();

    sCtx.save();
    sCtx.translate(128, 128);
    sCtx.scale(0.58, 0.92);
    const coreGrad = sCtx.createRadialGradient(0, 0, 10, 0, 0, 96);
    coreGrad.addColorStop(0.0, 'rgba(1, 1, 3, 0.96)');
    coreGrad.addColorStop(0.62, 'rgba(2, 2, 5, 0.88)');
    coreGrad.addColorStop(0.88, 'rgba(4, 4, 8, 0.38)');
    coreGrad.addColorStop(1.0, 'rgba(4, 4, 8, 0.0)');
    sCtx.fillStyle = coreGrad;
    sCtx.beginPath();
    sCtx.arc(0, 0, 96, 0, Math.PI * 2);
    sCtx.fill();
    sCtx.restore();

    for (const [wx, wz] of [
      [-0.28, -0.22],
      [+0.28, -0.22],
      [-0.28, +0.23],
      [+0.28, +0.23],
    ]) {
      const cx = 128 + wx * 256;
      const cy = 128 + wz * 256;
      sCtx.save();
      sCtx.translate(cx, cy);
      sCtx.scale(0.82, 1.28);
      const wGrad = sCtx.createRadialGradient(0, 0, 4, 0, 0, 34);
      wGrad.addColorStop(0.0, 'rgba(1, 1, 3, 0.95)');
      wGrad.addColorStop(0.55, 'rgba(2, 2, 5, 0.72)');
      wGrad.addColorStop(1.0, 'rgba(4, 4, 8, 0.0)');
      sCtx.fillStyle = wGrad;
      sCtx.beginPath();
      sCtx.arc(0, 0, 34, 0, Math.PI * 2);
      sCtx.fill();
      sCtx.restore();
    }
    _sharedShadowTex = new THREE.CanvasTexture(shadowCanvas);
    _sharedShadowTex.colorSpace = THREE.SRGBColorSpace;
    _sharedShadowTex.userData = { isSharedResource: true };
  }
  return _sharedShadowTex;
}

let _sharedTailGlowTex = null;
function getSharedTailGlowTexture() {
  if (!_sharedTailGlowTex) {
    const tailGlowCanvas = document.createElement('canvas');
    tailGlowCanvas.width = 128;
    tailGlowCanvas.height = 128;
    const tgCtx = tailGlowCanvas.getContext('2d');
    const tgGrad = tgCtx.createRadialGradient(64, 64, 4, 64, 64, 62);
    tgGrad.addColorStop(0.0, 'rgba(255, 10, 34, 0.88)');
    tgGrad.addColorStop(0.32, 'rgba(255, 0, 24, 0.56)');
    tgGrad.addColorStop(0.68, 'rgba(220, 0, 18, 0.20)');
    tgGrad.addColorStop(1.0, 'rgba(180, 0, 12, 0.0)');
    tgCtx.fillStyle = tgGrad;
    tgCtx.fillRect(0, 0, 128, 128);
    _sharedTailGlowTex = new THREE.CanvasTexture(tailGlowCanvas);
    _sharedTailGlowTex.colorSpace = THREE.SRGBColorSpace;
    _sharedTailGlowTex.userData = { isSharedResource: true };
  }
  return _sharedTailGlowTex;
}

let _sharedHeadlightBeamTex = null;
function getSharedHeadlightBeamTexture() {
  if (!_sharedHeadlightBeamTex) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 256, 256);

    // Soft oval twin-beam pool from bottom (y=236, near nose) fading cleanly before top/side edges
    for (const [startX, endX] of [
      [106, 88],
      [150, 168],
    ]) {
      ctx.save();
      const cx = (startX + endX) * 0.5;
      const cy = 148;
      ctx.translate(cx, cy);
      ctx.scale(0.55, 1.0);
      const grad = ctx.createRadialGradient(0, 72, 4, 0, 10, 128);
      grad.addColorStop(0.0, 'rgba(255, 252, 235, 0.92)');
      grad.addColorStop(0.24, 'rgba(255, 244, 200, 0.62)');
      grad.addColorStop(0.55, 'rgba(254, 232, 165, 0.24)');
      grad.addColorStop(0.82, 'rgba(253, 224, 140, 0.06)');
      grad.addColorStop(1.0, 'rgba(253, 224, 140, 0.0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, 130, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Elliptical edge fade mask so zero alpha is guaranteed around the entire perimeter
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.translate(128, 136);
    ctx.scale(1.0, 1.05);
    const ovalMask = ctx.createRadialGradient(0, 0, 46, 0, 0, 114);
    ovalMask.addColorStop(0.0, 'rgba(0,0,0,0)');
    ovalMask.addColorStop(0.7, 'rgba(0,0,0,0.35)');
    ovalMask.addColorStop(1.0, 'rgba(0,0,0,1)');
    ctx.fillStyle = ovalMask;
    ctx.fillRect(-128, -140, 256, 280);
    ctx.restore();
    ctx.globalCompositeOperation = 'source-over';

    _sharedHeadlightBeamTex = new THREE.CanvasTexture(canvas);
    _sharedHeadlightBeamTex.colorSpace = THREE.SRGBColorSpace;
    _sharedHeadlightBeamTex.userData = { isSharedResource: true };
  }
  return _sharedHeadlightBeamTex;
}

let _sharedTaillightBeamTex = null;
function getSharedTaillightBeamTexture() {
  if (!_sharedTaillightBeamTex) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 256, 256);

    // Compact ruby-red oval tail glow behind rear bumper, fading cleanly to 0 before any edge
    for (const startX of [98, 158]) {
      ctx.save();
      ctx.translate(startX, 118);
      ctx.scale(0.65, 1.0);
      const grad = ctx.createRadialGradient(0, -48, 3, 0, -10, 108);
      grad.addColorStop(0.0, 'rgba(255, 42, 72, 0.90)');
      grad.addColorStop(0.26, 'rgba(255, 16, 46, 0.56)');
      grad.addColorStop(0.58, 'rgba(225, 0, 28, 0.18)');
      grad.addColorStop(0.84, 'rgba(190, 0, 20, 0.04)');
      grad.addColorStop(1.0, 'rgba(160, 0, 15, 0.0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, 112, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Elliptical edge fade mask so no rectangular border is ever visible
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.translate(128, 118);
    ctx.scale(1.0, 0.95);
    const ovalMask = ctx.createRadialGradient(0, 0, 40, 0, 0, 108);
    ovalMask.addColorStop(0.0, 'rgba(0,0,0,0)');
    ovalMask.addColorStop(0.65, 'rgba(0,0,0,0.4)');
    ovalMask.addColorStop(1.0, 'rgba(0,0,0,1)');
    ctx.fillStyle = ovalMask;
    ctx.fillRect(-128, -128, 256, 256);
    ctx.restore();
    ctx.globalCompositeOperation = 'source-over';

    _sharedTaillightBeamTex = new THREE.CanvasTexture(canvas);
    _sharedTaillightBeamTex.colorSpace = THREE.SRGBColorSpace;
    _sharedTaillightBeamTex.userData = { isSharedResource: true };
  }
  return _sharedTaillightBeamTex;
}

const _numberPlateTextureCache = new Map();

function safeRoundRect(ctx, x, y, w, h, r) {
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r);
  } else {
    const rad = Math.min(typeof r === 'number' ? r : 0, Math.abs(w) / 2, Math.abs(h) / 2);
    ctx.moveTo(x + rad, y);
    ctx.lineTo(x + w - rad, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
    ctx.lineTo(x + w, y + h - rad);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
    ctx.lineTo(x + rad, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
    ctx.lineTo(x, y + rad);
    ctx.quadraticCurveTo(x, y, x + rad, y);
    ctx.closePath();
  }
}

export function getNumberPlateTexture(racerNumber = 87) {
  const num = typeof racerNumber === 'number'
    ? racerNumber
    : parseInt(String(racerNumber).replace(/\D/g, ''), 10) || 87;
  const numStr = String(num);
  if (_numberPlateTextureCache.has(numStr)) {
    return _numberPlateTextureCache.get(numStr);
  }

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');

  // 1. Gloss white plate base with smooth rounded corners
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  safeRoundRect(ctx, 4, 4, 248, 152, 18);
  ctx.fill();

  // Top racing header accent bar
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(14, 12, 228, 22);

  // 2. Bold black racing outer border
  ctx.strokeStyle = '#090d16';
  ctx.lineWidth = 12;
  ctx.beginPath();
  safeRoundRect(ctx, 8, 8, 240, 144, 14);
  ctx.stroke();

  // 3. Crisp inner accent pinstripe
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 3;
  ctx.beginPath();
  safeRoundRect(ctx, 17, 17, 222, 126, 8);
  ctx.stroke();

  // 4. Large bold racing numeral
  ctx.fillStyle = '#090d16';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const fontSize = numStr.length === 1 ? 114 : numStr.length === 2 ? 98 : 80;
  ctx.font = `900 ${fontSize}px "Impact", "Arial Black", "Trebuchet MS", sans-serif`;
  ctx.fillText(numStr, 128, 92);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.generateMipmaps = true;
  texture.userData = { isSharedResource: true };
  _numberPlateTextureCache.set(numStr, texture);
  return texture;
}

function mergeNormalizedGeos(entries, keepUv = false) {
  const parts = [];
  const mat4 = new THREE.Matrix4();
  const pos = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const euler = new THREE.Euler();
  const scl = new THREE.Vector3(1, 1, 1);

  for (const entry of entries) {
    const src = entry.geo;
    const g = src.index ? src.toNonIndexed() : src.clone();
    if (entry.pos || entry.rot || entry.scale) {
      if (entry.pos) pos.set(entry.pos[0], entry.pos[1], entry.pos[2]);
      else pos.set(0, 0, 0);
      if (entry.rot) {
        euler.set(entry.rot[0], entry.rot[1], entry.rot[2], 'XYZ');
        quat.setFromEuler(euler);
      } else {
        quat.identity();
      }
      if (entry.scale) scl.set(entry.scale[0], entry.scale[1], entry.scale[2]);
      else scl.set(1, 1, 1);
      mat4.compose(pos, quat, scl);
      g.applyMatrix4(mat4);
    }
    if (!g.attributes.normal) {
      g.computeVertexNormals();
    }
    if (!keepUv && g.attributes.uv) {
      g.deleteAttribute('uv');
    }
    parts.push(g);
  }

  const merged = mergeGeometries(parts, false);
  for (const p of parts) {
    p.dispose();
  }
  return merged;
}

let _sharedKartGeos = null;
function getSharedKartGeos() {
  if (!_sharedKartGeos) {
    // 1. Merged 5-part volumetric exhaust flame plume -> 1 draw call per pipe
    const outerCone = new THREE.CylinderGeometry(0.00072, 0.00022, 0.0052, 16, 8, true);
    outerCone.rotateX(Math.PI / 2);
    outerCone.translate(0, 0, -0.0026);

    const innerCore = new THREE.CylinderGeometry(0.00046, 0.00012, 0.0040, 14, 6, true);
    innerCore.rotateX(Math.PI / 2);
    innerCore.translate(0, 0, -0.0020);

    const finA = new THREE.PlaneGeometry(0.00145, 0.0050, 1, 6);
    finA.rotateX(Math.PI / 2);
    finA.rotateZ(0.66);
    finA.translate(0, 0, -0.0025);

    const finB = new THREE.PlaneGeometry(0.00145, 0.0050, 1, 6);
    finB.rotateX(Math.PI / 2);
    finB.rotateZ(-0.66);
    finB.translate(0, 0, -0.0025);

    const nozzleDisc = new THREE.CircleGeometry(0.00074, 16);
    nozzleDisc.rotateY(Math.PI);
    nozzleDisc.translate(0, 0, -0.00025);

    const mergedFlamePlume = mergeNormalizedGeos([
      { geo: outerCone },
      { geo: innerCore },
      { geo: finA },
      { geo: finB },
      { geo: nozzleDisc },
    ], false);
    outerCone.dispose();
    innerCore.dispose();
    finA.dispose();
    finB.dispose();
    nozzleDisc.dispose();

    // 2. Pro Racing Slick Tires (3 parts merged -> 1 geometry per wheel) + rims & hubcaps
    const frontTire = new THREE.CylinderGeometry(0.0019, 0.0019, 0.0018, 22);
    frontTire.rotateZ(Math.PI / 2);
    const frontTireShoulder = new THREE.TorusGeometry(0.00148, 0.00042, 10, 20);
    frontTireShoulder.rotateY(Math.PI / 2);
    const frontTireMerged = mergeNormalizedGeos([
      { geo: frontTire },
      { geo: frontTireShoulder, pos: [-0.00065, 0, 0] },
      { geo: frontTireShoulder, pos: [0.00065, 0, 0] },
    ], false);
    frontTire.dispose();
    frontTireShoulder.dispose();

    const frontRim = new THREE.CylinderGeometry(0.0019 * 0.62, 0.0019 * 0.62, 0.0018 * 1.05, 16);
    frontRim.rotateZ(Math.PI / 2);

    const wheelHubCap = new THREE.CylinderGeometry(0.00048, 0.00048, 0.0021, 10);
    wheelHubCap.rotateZ(Math.PI / 2);

    const rearTire = new THREE.CylinderGeometry(0.00225, 0.00225, 0.0024, 22);
    rearTire.rotateZ(Math.PI / 2);
    const rearTireShoulder = new THREE.TorusGeometry(0.00175, 0.0005, 10, 20);
    rearTireShoulder.rotateY(Math.PI / 2);
    const rearTireMerged = mergeNormalizedGeos([
      { geo: rearTire },
      { geo: rearTireShoulder, pos: [-0.00085, 0, 0] },
      { geo: rearTireShoulder, pos: [0.00085, 0, 0] },
    ], false);
    rearTire.dispose();
    rearTireShoulder.dispose();

    const rearRim = new THREE.CylinderGeometry(0.00225 * 0.62, 0.00225 * 0.62, 0.0024 * 1.05, 16);
    rearRim.rotateZ(Math.PI / 2);

    const rearHubCap = new THREE.CylinderGeometry(0.00056, 0.00056, 0.0027, 10);
    rearHubCap.rotateZ(Math.PI / 2);

    // 3. Static same-material body assemblies (carbon -> 1, fairing -> 1, chrome -> 1, plates -> 1)
    const floorPan = new THREE.BoxGeometry(0.0082, 0.0009, 0.0155);
    const rearWing = new THREE.BoxGeometry(0.0096, 0.0007, 0.0024);
    const seat = new THREE.BoxGeometry(0.0042, 0.0044, 0.0038);
    const carbonBodyMerged = mergeNormalizedGeos([
      { geo: floorPan, pos: [0, 0.0014, 0] },
      { geo: rearWing, pos: [0, 0.0068, -0.0076], rot: [-0.18, 0, 0] },
      { geo: seat, pos: [0, 0.0036, -0.0015], rot: [-0.22, 0, 0] },
    ], false);
    floorPan.dispose();
    rearWing.dispose();
    seat.dispose();

    const noseCone = new THREE.BoxGeometry(0.0086, 0.0021, 0.0044);
    const sidePod = new THREE.BoxGeometry(0.0024, 0.0024, 0.0076);
    const fairingBodyMerged = mergeNormalizedGeos([
      { geo: noseCone, pos: [0, 0.0023, 0.0068], rot: [0.22, 0, 0] },
      { geo: sidePod, pos: [-0.0044, 0.0024, -0.0004] },
      { geo: sidePod, pos: [0.0044, 0.0024, -0.0004] },
    ], false);
    noseCone.dispose();
    sidePod.dispose();

    const engineBlock = new THREE.BoxGeometry(0.0034, 0.0036, 0.0042);
    const pipe = new THREE.CylinderGeometry(0.00056, 0.00062, 0.0032, 16);
    const chromeBodyMerged = mergeNormalizedGeos([
      { geo: engineBlock, pos: [0.0022, 0.0036, -0.0048] },
      { geo: pipe, pos: [-0.00108, 0.00215, -0.0076], rot: [Math.PI / 2 + 0.12, 0, 0] },
      { geo: pipe, pos: [0.00108, 0.00215, -0.0076], rot: [Math.PI / 2 + 0.12, 0, 0] },
    ], false);
    engineBlock.dispose();
    pipe.dispose();

    const numberPlate = new THREE.PlaneGeometry(0.0052, 0.0032);
    const rearNumberPlate = new THREE.PlaneGeometry(0.0044, 0.0018);
    const numberPlatesMerged = mergeNormalizedGeos([
      { geo: numberPlate, pos: [0, 0.00345, 0.0066], rot: [-Math.PI / 2 + 0.22, 0, 0] },
      { geo: rearNumberPlate, pos: [0, 0.0068, -0.00885], rot: [0, Math.PI, 0] },
    ], true);
    numberPlate.dispose();
    rearNumberPlate.dispose();

    const torso = new THREE.BoxGeometry(0.0036, 0.0038, 0.0028);
    const helmetShell = new THREE.SphereGeometry(0.0022, 20, 18);
    const visor = new THREE.SphereGeometry(0.00225, 16, 12, -0.9, 1.8, 1.05, 0.75);
    const steeringWheel = new THREE.TorusGeometry(0.0014, 0.00032, 8, 18);
    const shadowQuad = new THREE.PlaneGeometry(0.0175, 0.0240);
    const tailGlow = new THREE.PlaneGeometry(0.0038, 0.0024);

    // 3D Headlight & Taillight Lenses (merged pairs) + Ground Projection Beams & Volumetric Light Cones
    const headlightLens = new THREE.SphereGeometry(0.00065, 10, 8);
    const headlightLensesMerged = mergeNormalizedGeos([
      { geo: headlightLens, pos: [-0.0026, 0.00225, 0.00875], scale: [1.15, 0.78, 0.65] },
      { geo: headlightLens, pos: [0.0026, 0.00225, 0.00875], scale: [1.15, 0.78, 0.65] },
    ], false);
    headlightLens.dispose();

    const taillightLens = new THREE.BoxGeometry(0.0020, 0.00072, 0.00048);
    const taillightLensesMerged = mergeNormalizedGeos([
      { geo: taillightLens, pos: [-0.00320, 0.00275, -0.00875] },
      { geo: taillightLens, pos: [0.00320, 0.00275, -0.00875] },
    ], false);
    taillightLens.dispose();

    const headlightGroundBeam = new THREE.PlaneGeometry(0.024, 0.056);
    const taillightGroundBeam = new THREE.PlaneGeometry(0.018, 0.028);

    // Volumetric 3D cone with vertex-alpha fade from apex (at lamp) to open base
    const buildVolumetricLightConeGeo = (radiusBottom, lengthZ, rCol, gCol, bCol, apexAlpha, baseAlpha) => {
      const cone = new THREE.CylinderGeometry(0.00045, radiusBottom, lengthZ, 12, 1, true);
      // Cylinder +Y is apex (at lamp, z=0), -Y is wide open base extending along +Z (after rotateX(-PI/2))
      cone.translate(0, -lengthZ * 0.5, 0);
      cone.rotateX(-Math.PI / 2);
      const posAttr = cone.getAttribute('position');
      const cols = new Float32Array(posAttr.count * 3);
      for (let i = 0; i < posAttr.count; i++) {
        const zNorm = Math.max(0, Math.min(1, posAttr.getZ(i) / lengthZ));
        const w = apexAlpha * (1.0 - zNorm) + baseAlpha * zNorm;
        cols[i * 3 + 0] = rCol * w;
        cols[i * 3 + 1] = gCol * w;
        cols[i * 3 + 2] = bCol * w;
      }
      cone.setAttribute('color', new THREE.BufferAttribute(cols, 3));
      return cone;
    };

    const headlightVolCone = buildVolumetricLightConeGeo(0.0046, 0.042, 1.0, 0.95, 0.78, 0.50, 0.0);
    const taillightVolCone = buildVolumetricLightConeGeo(0.0032, 0.020, 1.0, 0.08, 0.18, 0.52, 0.0);

    // Rear tire wet mist spray / snow rooster-tail plume cone
    const tireSprayCone = new THREE.CylinderGeometry(0.0008, 0.0044, 0.022, 10, 5, true);
    tireSprayCone.translate(0, -0.011, 0);
    tireSprayCone.rotateX(Math.PI / 2); // extends along -Z behind rear tire

    _sharedKartGeos = {
      mergedFlamePlume,
      frontTireMerged, frontRim, wheelHubCap,
      rearTireMerged, rearRim, rearHubCap,
      carbonBodyMerged, fairingBodyMerged, chromeBodyMerged, numberPlatesMerged,
      torso, helmetShell, visor, steeringWheel,
      shadowQuad, tailGlow,
      headlightLensesMerged, taillightLensesMerged,
      headlightGroundBeam, taillightGroundBeam,
      headlightVolCone, taillightVolCone,
      tireSprayCone,
    };
    Object.values(_sharedKartGeos).forEach((entry) => {
      if (entry && entry.isBufferGeometry) {
        entry.userData = { ...(entry.userData || {}), isSharedResource: true };
      }
    });
  }
  return _sharedKartGeos;
}

let _sharedCarbonMat = null;
let _sharedChromeMat = null;
let _sharedTireRubberMat = null;
let _sharedShadowMat = null;
let _sharedHeadlightLensMat = null;
let _sharedTaillightLensMat = null;

function getSharedMaterials() {
  if (!_sharedCarbonMat) {
    _sharedCarbonMat = new THREE.MeshStandardMaterial({
      color: 0x181b22,
      roughness: 0.42,
      metalness: 0.45,
    });
    _sharedCarbonMat.userData = { isSharedResource: true };
    _sharedChromeMat = new THREE.MeshStandardMaterial({
      color: 0xdce4f0,
      roughness: 0.15,
      metalness: 0.92,
    });
    _sharedChromeMat.userData = { isSharedResource: true };
    _sharedTireRubberMat = new THREE.MeshStandardMaterial({
      color: 0x121419,
      roughness: 0.82,
      metalness: 0.05,
    });
    _sharedTireRubberMat.userData = { isSharedResource: true };
    _sharedShadowMat = new THREE.MeshBasicMaterial({
      map: getSharedShadowTexture(),
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -8,
      polygonOffsetUnits: -8,
    });
    _sharedShadowMat.userData = { isSharedResource: true };
    _sharedHeadlightLensMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xfff4d4,
      emissiveIntensity: 1.6,
      roughness: 0.08,
      toneMapped: false,
    });
    _sharedHeadlightLensMat.userData = { isSharedResource: true };
    _sharedTaillightLensMat = new THREE.MeshStandardMaterial({
      color: 0xff0a24,
      emissive: 0xff0820,
      emissiveIntensity: 1.4,
      roughness: 0.1,
      toneMapped: false,
    });
    _sharedTaillightLensMat.userData = { isSharedResource: true };
  }
  return {
    carbonMat: _sharedCarbonMat,
    chromeMat: _sharedChromeMat,
    tireRubberMat: _sharedTireRubberMat,
    shadowMat: _sharedShadowMat,
    headlightLensMat: _sharedHeadlightLensMat,
    taillightLensMat: _sharedTaillightLensMat,
  };
}

export function prewarmMicroKartAssets() {
  getSharedShadowTexture();
  getSharedTailGlowTexture();
  getSharedHeadlightBeamTexture();
  getSharedTaillightBeamTexture();
  getSharedKartGeos();
  getSharedMaterials();
}

/**
 * Builds the 1:87 HO Micro-Coaster Racing Go-Kart (18mm x 12mm x 8mm)
 * with 4 steerable/spinning wheels, helmeted driver, steering wheel,
 * twin turbo exhaust flames, and optional dynamic lights / drift spark emitter.
 */
export function buildMicroKart(options = {}) {
  const sharedGeos = getSharedKartGeos();
  const sharedMats = getSharedMaterials();

  const enableFireLight = options.enableFireLight === true;
  const enableDynamicHeadlight = options.enableDynamicHeadlight === true;
  const enableSparks = options.enableSparks === true;

  const kartRoot = new THREE.Group();
  kartRoot.name = 'Kart1to87Root';

  const fairingColor = options.colorHex !== undefined ? options.colorHex : 0xff2b1e;
  const rimColor = options.rimHex !== undefined ? options.rimHex : 0xffbb44;
  const suitColor = options.suitHex !== undefined ? options.suitHex : 0xf0f4fa;
  const helmetColor = options.helmetHex !== undefined ? options.helmetHex : 0xffffff;
  const visorColor = options.visorHex !== undefined ? options.visorHex : 0x1e6bff;

  // Inner suspension/drift yaw-roll body group
  const chassisGroup = new THREE.Group();
  chassisGroup.name = 'KartChassisBody';
  kartRoot.add(chassisGroup);

  const redFairingMat = new THREE.MeshStandardMaterial({
    color: fairingColor,
    roughness: 0.22,
    metalness: 0.35,
  });

  const goldRimMat = new THREE.MeshStandardMaterial({
    color: rimColor,
    roughness: 0.25,
    metalness: 0.85,
  });

  const carbonMat = sharedMats.carbonMat;
  const chromeMat = sharedMats.chromeMat;
  const tireRubberMat = sharedMats.tireRubberMat;

  // Reusable contact shadow quad (single shared geometry and texture)
  const kartShadowQuad = new THREE.Mesh(sharedGeos.shadowQuad, sharedMats.shadowMat);
  kartShadowQuad.rotation.x = -Math.PI / 2;
  kartShadowQuad.position.set(0, 0.00072, -0.0002);
  kartShadowQuad.castShadow = false;
  kartShadowQuad.receiveShadow = false;
  kartRoot.add(kartShadowQuad);

  // -------------------------------------------------------------------------
  // 1. MERGED STATIC BODY ASSEMBLIES (18mm long x 12mm wide)
  //    Kart local forward is +Z (aligned with spline tangent)
  // -------------------------------------------------------------------------
  // Carbon assembly: floor pan + rear wing + bucket seat -> 1 draw call
  const carbonBody = new THREE.Mesh(sharedGeos.carbonBodyMerged, carbonMat);
  carbonBody.castShadow = false;
  chassisGroup.add(carbonBody);

  // Painted fairing assembly: nose cone + left/right side pods -> 1 draw call
  const fairingBody = new THREE.Mesh(sharedGeos.fairingBodyMerged, redFairingMat);
  fairingBody.castShadow = false;
  chassisGroup.add(fairingBody);

  // Chrome assembly: engine block + twin rear exhaust pipes -> 1 draw call
  const chromeBody = new THREE.Mesh(sharedGeos.chromeBodyMerged, chromeMat);
  chromeBody.castShadow = false;
  chassisGroup.add(chromeBody);

  // Dynamic Attendance/Racer Number Plates (front + rear merged -> 1 draw call)
  const racerNumber = options.number !== undefined ? options.number : 87;
  const numberPlateTex = getNumberPlateTexture(racerNumber);
  const numberPlateMat = new THREE.MeshStandardMaterial({
    map: numberPlateTex,
    roughness: 0.22,
    metalness: 0.08,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });

  const numberPlatesMesh = new THREE.Mesh(sharedGeos.numberPlatesMerged, numberPlateMat);
  numberPlatesMesh.castShadow = false;
  chassisGroup.add(numberPlatesMesh);

  // Twin Rear Exhaust Volumetric Mach-Diamond Afterburner Jet Plumes (1 merged mesh per pipe)
  function createExhaustFlameMaterial(pipePhase) {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: {value: 0.0},
        uIntensity: {value: 1.0},
        uPhase: {value: pipePhase},
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      toneMapped: false,
      vertexShader: /* glsl */ `
        uniform float uTime;
        uniform float uPhase;
        varying float vPlumeU;
        varying float vRadialR;
        varying vec3 vLocalPos;
        varying vec3 vViewNormal;
        varying vec3 vViewPos;
        void main() {
          // Local coordinates: nozzle exit is at z = 0, jet extends backward along -Z to z = -0.0052
          float u = clamp(-position.z / 0.0052, 0.0, 1.0);
          vPlumeU = u;
          vRadialR = clamp(length(position.xy) / 0.00078, 0.0, 1.0);
          vLocalPos = position;

          // High-frequency turbulent jet flutter along the tail (zero displacement at nozzle u=0)
          float flutter = u * u * 0.00022;
          vec3 displaced = position;
          displaced.x += sin(u * 18.0 - uTime * 48.0 + uPhase) * flutter;
          displaced.y += cos(u * 15.0 - uTime * 42.0 + uPhase * 1.7) * flutter * 0.85;

          vec4 mvPos = modelViewMatrix * vec4(displaced, 1.0);
          vViewPos = -mvPos.xyz;
          vViewNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform float uIntensity;
        uniform float uPhase;
        varying float vPlumeU;
        varying float vRadialR;
        varying vec3 vLocalPos;
        varying vec3 vViewNormal;
        varying vec3 vViewPos;
        void main() {
          float u = clamp(vPlumeU, 0.0, 1.0);

          vec3 viewDir = normalize(vViewPos);
          float ndotv = abs(dot(normalize(vViewNormal), viewDir));
          float viewWeight = 0.58 + 0.42 * sqrt(clamp(ndotv, 0.0, 1.0));
          float radialCore = exp(-vRadialR * vRadialR * (2.1 + u * 2.4));
          float radialMask = radialCore * viewWeight;

          float angle = atan(vLocalPos.y, vLocalPos.x);
          float turb1 = sin(u * 22.0 - uTime * 56.0 + angle * 2.0 + uPhase);
          float turb2 = cos(u * 35.0 - uTime * 74.0 - angle * 3.0 + uPhase * 1.3);
          float turbulence = 0.82 + 0.18 * (turb1 * 0.6 + turb2 * 0.4);

          float machWave = max(0.0, cos(u * 15.5 - uTime * 34.0 + uPhase * 0.5));
          float machDiamond = pow(machWave, 3.2) * smoothstep(0.85, 0.04, u) * exp(-vRadialR * vRadialR * 3.6);

          float tipCut = clamp(1.0 - u + (turb1 * 0.11 + turb2 * 0.07) * u, 0.0, 1.0);
          float axialEnv = (0.35 + 0.65 * smoothstep(0.0, 0.08, u)) * pow(tipCut, 1.45);

          vec3 butaneBlue = vec3(0.32, 0.76, 1.35);
          vec3 whiteHot = vec3(1.55, 1.38, 0.96);
          vec3 goldenAmber = vec3(1.45, 0.68, 0.12);
          vec3 fieryCrimson = vec3(1.25, 0.22, 0.02);

          vec3 baseCol = mix(butaneBlue, goldenAmber, smoothstep(0.04, 0.34, u));
          baseCol = mix(baseCol, fieryCrimson, smoothstep(0.38, 0.86, u));
          float coreHotness = clamp(radialCore * (1.0 - u * 0.52) + machDiamond * 0.90, 0.0, 1.0);
          vec3 flameRgb = mix(baseCol, whiteHot, pow(coreHotness, 1.35));

          float alpha = clamp(axialEnv * radialMask * turbulence * uIntensity * 1.45, 0.0, 1.0);
          if (alpha < 0.01) discard;
          gl_FragColor = vec4(flameRgb * alpha * 1.35, alpha);
        }
      `,
    });
  }

  const flameCones = [];
  for (let i = 0; i < 2; i++) {
    const ex = i === 0 ? -0.00108 : 0.00108;
    const plumeGroup = new THREE.Group();
    plumeGroup.position.set(ex, 0.00208, -0.00895);
    plumeGroup.rotation.x = 0.18;
    plumeGroup.visible = false;

    const jetMat = createExhaustFlameMaterial(i * 2.15);
    const mergedPlumeMesh = new THREE.Mesh(sharedGeos.mergedFlamePlume, jetMat);
    plumeGroup.add(mergedPlumeMesh);

    plumeGroup.userData.jetMat = jetMat;
    plumeGroup.userData.pipeIndex = i;
    chassisGroup.add(plumeGroup);
    flameCones.push(plumeGroup);
  }

  // Twin Rear 3D LED Taillight Lenses (merged -> 1 draw call) + per-kart brake glow halo planes
  const taillightLensesMesh = new THREE.Mesh(
    sharedGeos.taillightLensesMerged,
    sharedMats.taillightLensMat
  );
  taillightLensesMesh.castShadow = false;
  chassisGroup.add(taillightLensesMesh);

  const tailGlowMat = new THREE.MeshBasicMaterial({
    map: getSharedTailGlowTexture(),
    transparent: true,
    opacity: 0.72,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
    side: THREE.DoubleSide,
  });

  const tailLightGlowPlanes = [];
  for (const tx of [-0.00320, 0.00320]) {
    const tailGlowPlane = new THREE.Mesh(sharedGeos.tailGlow, tailGlowMat);
    tailGlowPlane.position.set(tx, 0.00275, -0.00906);
    tailGlowPlane.rotation.y = Math.PI;
    tailGlowPlane.castShadow = false;
    tailGlowPlane.receiveShadow = false;
    tailGlowPlane.visible = false;
    chassisGroup.add(tailGlowPlane);
    tailLightGlowPlanes.push(tailGlowPlane);
  }

  // Twin Front 3D LED Headlight Lenses on Nose Fairing (merged -> 1 draw call)
  const headlightLensesMesh = new THREE.Mesh(
    sharedGeos.headlightLensesMerged,
    sharedMats.headlightLensMat
  );
  headlightLensesMesh.castShadow = false;
  chassisGroup.add(headlightLensesMesh);

  // Per-Kart Forward Headlight Ground Beam & Twin 3D Volumetric Cones
  const headlightGroundMat = new THREE.MeshBasicMaterial({
    map: getSharedHeadlightBeamTexture(),
    transparent: true,
    opacity: 0.25,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
    polygonOffset: true,
    polygonOffsetFactor: -5,
    polygonOffsetUnits: -5,
  });
  const headlightGroundBeamMesh = new THREE.Mesh(sharedGeos.headlightGroundBeam, headlightGroundMat);
  headlightGroundBeamMesh.rotation.x = -Math.PI / 2;
  headlightGroundBeamMesh.position.set(0, -0.00162, 0.036);
  headlightGroundBeamMesh.visible = false;
  kartRoot.add(headlightGroundBeamMesh);

  const headlightConeMat = new THREE.MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.22,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  const headlightVolCones = [];
  for (const hx of [-0.0026, 0.0026]) {
    const hCone = new THREE.Mesh(sharedGeos.headlightVolCone, headlightConeMat);
    hCone.position.set(hx, 0.00225, 0.0089);
    hCone.rotation.x = 0.068;
    hCone.visible = false;
    chassisGroup.add(hCone);
    headlightVolCones.push(hCone);
  }

  // Per-Kart Rear Taillight Ruby Ground Beam & Twin 3D Volumetric Cones
  const taillightGroundMat = new THREE.MeshBasicMaterial({
    map: getSharedTaillightBeamTexture(),
    transparent: true,
    opacity: 0.35,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
    polygonOffset: true,
    polygonOffsetFactor: -5,
    polygonOffsetUnits: -5,
  });
  const taillightGroundBeamMesh = new THREE.Mesh(sharedGeos.taillightGroundBeam, taillightGroundMat);
  taillightGroundBeamMesh.rotation.x = -Math.PI / 2;
  taillightGroundBeamMesh.position.set(0, -0.00162, -0.022);
  taillightGroundBeamMesh.visible = false;
  kartRoot.add(taillightGroundBeamMesh);

  const taillightConeMat = new THREE.MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.28,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  const taillightVolCones = [];
  for (const tx of [-0.0032, 0.0032]) {
    const tCone = new THREE.Mesh(sharedGeos.taillightVolCone, taillightConeMat);
    tCone.position.set(tx, 0.00275, -0.0089);
    tCone.rotation.y = Math.PI;
    tCone.rotation.x = -0.085;
    tCone.visible = false;
    chassisGroup.add(tCone);
    taillightVolCones.push(tCone);
  }

  // Rear Tire Wet Mist Spray & Snow Powder Rooster-Tail Plumes (0 CPU particle loop overhead!)
  const tireSprayMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0.0 },
      uIntensity: { value: 0.0 },
      uIsSnow: { value: 0.0 },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uIntensity;
      varying float vAlong;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        float u = clamp(-position.z / 0.022, 0.0, 1.0);
        vAlong = u;
        vec3 displaced = position;
        // Billowing upward lift & turbulent wake behind spinning rear tire
        displaced.y += u * u * 0.0052 + abs(sin(u * 10.0 - uTime * 22.0)) * u * 0.0012;
        displaced.x += sin(u * 14.0 - uTime * 26.0) * u * 0.0014;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uIntensity;
      uniform float uIsSnow;
      varying float vAlong;
      varying vec2 vUv;
      void main() {
        if (uIntensity <= 0.01) discard;
        float u = clamp(vAlong, 0.0, 1.0);
        float w1 = sin(u * 18.0 - uTime * 28.0 + vUv.x * 12.56);
        float w2 = cos(u * 29.0 - uTime * 36.0 - vUv.x * 18.84);
        float puff = 0.62 + 0.38 * (w1 * 0.6 + w2 * 0.4);
        float axialFade = smoothstep(0.0, 0.14, u) * pow(1.0 - u, 1.35);
        vec3 rainCol = vec3(0.82, 0.91, 1.0);
        vec3 snowCol = vec3(0.97, 0.99, 1.0);
        vec3 col = mix(rainCol, snowCol, uIsSnow);
        float alpha = clamp(axialFade * puff * uIntensity * mix(0.52, 0.78, uIsSnow), 0.0, 0.82);
        if (alpha < 0.015) discard;
        gl_FragColor = vec4(col, alpha);
      }
    `,
  });

  const tireSprayCones = [];
  for (const sx of [-0.0059, 0.0059]) {
    const sprayMesh = new THREE.Mesh(sharedGeos.tireSprayCone, tireSprayMat);
    sprayMesh.position.set(sx, 0.0008, -0.0064);
    sprayMesh.visible = false;
    chassisGroup.add(sprayMesh);
    tireSprayCones.push(sprayMesh);
  }

  // Optional warm flickering fire light under rear exhaust/tires (gated behind options.enableFireLight === true)
  let sparkFireLight = null;
  if (enableFireLight) {
    sparkFireLight = new THREE.PointLight(0xff6818, 0.0, 0.045, 0.0);
    sparkFireLight.position.set(0, 0.0028, -0.009);
    chassisGroup.add(sparkFireLight);
  }

  let fireLightMultiplier = 0.12;
  let fireLightPreviewTimer = 0.0;
  function setFireLightMultiplier(val, triggerPreview = true) {
    fireLightMultiplier = Math.max(0.0, Number(val) || 0.0);
    if (triggerPreview) {
      fireLightPreviewTimer = 0.85;
    }
  }

  // -------------------------------------------------------------------------
  // 2. 1:87 HELMETED DRIVER + STEERING WHEEL
  // -------------------------------------------------------------------------
  const suitMat = new THREE.MeshStandardMaterial({
    color: suitColor,
    roughness: 0.35,
    metalness: 0.08,
  });
  const torso = new THREE.Mesh(sharedGeos.torso, suitMat);
  torso.position.set(0, 0.0048, -0.0008);
  torso.rotation.x = 0.14;
  torso.castShadow = false;
  chassisGroup.add(torso);

  // Articulated Driver Helmet Group (tilts into corners!)
  const driverHead = new THREE.Group();
  driverHead.position.set(0, 0.0078, -0.0004);

  const helmetShell = new THREE.Mesh(
    sharedGeos.helmetShell,
    new THREE.MeshStandardMaterial({
      color: helmetColor,
      roughness: 0.14,
      metalness: 0.25,
    })
  );
  helmetShell.scale.set(0.95, 1.0, 1.08);
  helmetShell.castShadow = false;
  driverHead.add(helmetShell);

  // Iridescent Visor
  const visor = new THREE.Mesh(
    sharedGeos.visor,
    new THREE.MeshStandardMaterial({
      color: visorColor,
      emissive: new THREE.Color(visorColor),
      emissiveIntensity: 0.65,
      roughness: 0.08,
      metalness: 0.9,
    })
  );
  visor.rotation.y = Math.PI / 2;
  driverHead.add(visor);
  chassisGroup.add(driverHead);

  // Steering Column & Rotating Steering Wheel
  const steeringWheel = new THREE.Mesh(sharedGeos.steeringWheel, carbonMat);
  steeringWheel.position.set(0, 0.0054, 0.0028);
  steeringWheel.rotation.x = -0.55;
  chassisGroup.add(steeringWheel);

  // -------------------------------------------------------------------------
  // 3. 4 RUBBER SLICK WHEELS (Front Steerable Pivots + All 4 Spinning)
  // -------------------------------------------------------------------------
  const frontPivots = [];
  const wheelMeshes = [];

  function createWheelMesh(isRear = false) {
    const wGroup = new THREE.Group();

    const tire = new THREE.Mesh(
      isRear ? sharedGeos.rearTireMerged : sharedGeos.frontTireMerged,
      tireRubberMat
    );
    tire.castShadow = false;
    wGroup.add(tire);

    const rim = new THREE.Mesh(
      isRear ? sharedGeos.rearRim : sharedGeos.frontRim,
      goldRimMat
    );
    wGroup.add(rim);

    const hubCap = new THREE.Mesh(
      isRear ? sharedGeos.rearHubCap : sharedGeos.wheelHubCap,
      chromeMat
    );
    wGroup.add(hubCap);

    return wGroup;
  }

  // Front Left & Front Right Steerable Wheels
  for (const sx of [-0.0056, 0.0056]) {
    const pivot = new THREE.Group();
    pivot.position.set(sx, 0.00185, 0.0054);
    const wheel = createWheelMesh(false);
    pivot.add(wheel);
    chassisGroup.add(pivot);
    frontPivots.push(pivot);
    wheelMeshes.push(wheel);
  }

  // Rear Left & Rear Right Drive Wheels
  for (const sx of [-0.0059, 0.0059]) {
    const wheel = createWheelMesh(true);
    wheel.position.set(sx, 0.00215, -0.0054);
    chassisGroup.add(wheel);
    wheelMeshes.push(wheel);
  }

  // -------------------------------------------------------------------------
  // 4. OPTIONAL MICRO-KART DYNAMIC SPOTLIGHT HEADLIGHT (gated behind options.enableDynamicHeadlight === true)
  // -------------------------------------------------------------------------
  let headlight = null;
  if (enableDynamicHeadlight) {
    const headlightTarget = new THREE.Object3D();
    headlightTarget.position.set(0, -0.008, 0.072);
    chassisGroup.add(headlightTarget);

    headlight = new THREE.SpotLight(0xfff4dc, 9.5, 0.22, Math.PI * 0.34, 0.78, 0.0);
    headlight.position.set(0, 0.016, 0.0085);
    headlight.target = headlightTarget;
    chassisGroup.add(headlight);
  }

  // -------------------------------------------------------------------------
  // 5. OPTIONAL GLOWING FIRE SPARKS EMITTER (gated behind options.enableSparks === true)
  // -------------------------------------------------------------------------
  const sparkCount = 160;
  let sparkPositions = null;
  let sparkColors = null;
  let sparkLifeAttr = null;
  let sparkSizes = null;
  let sparkVelocities = null;
  let sparkAges = null;
  let sparkMaxAges = null;
  let sparkGeo = null;
  let sparkMat = null;
  let sparkPoints = null;

  if (enableSparks) {
    sparkPositions = new Float32Array(sparkCount * 3);
    sparkColors = new Float32Array(sparkCount * 3);
    sparkLifeAttr = new Float32Array(sparkCount);
    sparkSizes = new Float32Array(sparkCount);
    sparkVelocities = [];
    sparkAges = new Float32Array(sparkCount);
    sparkMaxAges = new Float32Array(sparkCount);

    for (let i = 0; i < sparkCount; i++) {
      sparkPositions[i * 3 + 1] = -10;
      sparkVelocities.push(new THREE.Vector3());
      sparkAges[i] = 999;
      sparkMaxAges[i] = 0.30;
      sparkLifeAttr[i] = 0.0;
      sparkSizes[i] = 0.65 + Math.random() * 1.15;
      sparkColors[i * 3 + 0] = 1.0;
      sparkColors[i * 3 + 1] = 0.48;
      sparkColors[i * 3 + 2] = 0.08;
    }

    sparkGeo = new THREE.BufferGeometry();
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPositions, 3));
    sparkGeo.setAttribute('color', new THREE.BufferAttribute(sparkColors, 3));
    sparkGeo.setAttribute('aLife', new THREE.BufferAttribute(sparkLifeAttr, 1));
    sparkGeo.setAttribute('aSize', new THREE.BufferAttribute(sparkSizes, 1));

    sparkMat = new THREE.ShaderMaterial({
      uniforms: {
        uSparkScale: {value: 0.58},
        tSceneDepth: {value: null},
        uNearClip: {value: 0.0015},
        uFarClip: {value: 12.0},
        uFocus: {value: 0.12},
        uAperture: {value: 0.0},
        uMaxBlur: {value: 0.0},
        uResolution: {value: new THREE.Vector2(1440, 900)},
      },
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        uniform float uSparkScale;
        uniform float uFocus;
        uniform float uAperture;
        uniform float uMaxBlur;
        uniform vec2 uResolution;
        attribute vec3 color;
        attribute float aLife;
        attribute float aSize;
        varying vec3 vColor;
        varying float vLife;
        varying float vViewZ;
        varying float vDofFactor;
        void main() {
          vColor = color;
          vLife = aLife;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vViewZ = mvPosition.z;
          gl_Position = projectionMatrix * mvPosition;

          float lifeScale = smoothstep(0.0, 0.12, aLife) * (0.38 + 0.62 * pow(aLife, 0.7));
          float basePointSize = clamp((4.8 * uSparkScale * aSize * lifeScale) / max(0.05, -mvPosition.z), 0.0, 16.0);

          float rawFactor = uFocus + mvPosition.z;
          float deadzone = max(0.065, uFocus * 0.28);
          float absDiff = max(0.0, abs(rawFactor) - deadzone);
          float normScale = 1.0 / max(0.22, uFocus * 1.15);
          float cocUv = clamp(absDiff * (0.42 + 0.16 * normScale) * uAperture, 0.0, uMaxBlur);
          float cocPx = cocUv * uResolution.y * 0.50;
          vDofFactor = clamp(cocPx / max(1.0, basePointSize), 0.0, 4.0);

          gl_PointSize = aLife > 0.01 ? clamp(basePointSize + cocPx, 0.0, 26.0) : 0.0;
        }
      `,
      fragmentShader: /* glsl */ `
        #include <common>
        #include <packing>
        uniform sampler2D tSceneDepth;
        uniform float uNearClip;
        uniform float uFarClip;
        uniform vec2 uResolution;
        varying vec3 vColor;
        varying float vLife;
        varying float vViewZ;
        varying float vDofFactor;
        void main() {
          if (vLife <= 0.01) discard;
          vec2 uv = gl_PointCoord - vec2(0.5);
          float d = length(uv);
          if (d > 0.5) discard;

          vec2 screenUv = gl_FragCoord.xy / max(vec2(1.0), uResolution);
          float rawSceneDepth = texture2D(tSceneDepth, screenUv).x;
          float sceneViewZ = perspectiveDepthToViewZ(rawSceneDepth, uNearClip, uFarClip);
          if (sceneViewZ > vViewZ + 0.0015) discard;

          float blurLerp = clamp(vDofFactor * 0.35, 0.0, 1.0);
          float core = exp(-d * d * mix(34.0, 8.0, blurLerp));
          float midFire = exp(-d * d * mix(10.5, 4.5, blurLerp)) * smoothstep(0.5, 0.08, d);
          float outerHalo = pow(max(0.0, 1.0 - d * 2.0), mix(2.2, 1.3, blurLerp)) * 0.65;

          vec3 deepEmber = vec3(0.92, 0.16, 0.02);
          vec3 midFlame = mix(deepEmber, vColor, clamp(vLife * 1.25, 0.0, 1.0));
          vec3 hotCenter = vec3(1.0, 0.96, 0.82);

          vec3 emberColor = mix(midFlame, hotCenter, clamp(core * 1.2, 0.0, 1.0));
          float energyNorm = 1.0 / (1.0 + vDofFactor * 0.85);
          vec3 finalRgb = emberColor * (1.85 * core + 1.15 * midFire + 0.65 * outerHalo) * energyNorm;

          float alpha = clamp((core * 1.1 + midFire * 0.85 + outerHalo * 0.55) * vLife * energyNorm, 0.0, 1.0);
          if (alpha < 0.015) discard;
          gl_FragColor = vec4(finalRgb, alpha);
        }
      `,
    });

    sparkPoints = new THREE.Points(sparkGeo, sparkMat);
    sparkPoints.frustumCulled = false;
    sparkPoints.name = 'KartDriftSparks';
  }

  let nextSparkIdx = 0;
  let lastWheelUpdateTime = -1;
  let hadActiveSparks = false;
  const _worldPos = new THREE.Vector3();
  const _backDir = new THREE.Vector3();
  const _spawnPos = new THREE.Vector3();

  /**
   * Spins all 4 wheels proportional to forward velocity (`speed` in m/s)
   * and steers front wheel pivots to `steerAngle` (`+0.45` for Left `A`, `-0.45` for Right `D`).
   */
  function updateWheels(dt, speed, steerAngle = 0.0, elapsedSec = undefined) {
    const nowMs = elapsedSec !== undefined ? elapsedSec * 1000.0 : performance.now();
    if (Math.abs(nowMs - lastWheelUpdateTime) < 1e-4) {
      return;
    }
    lastWheelUpdateTime = nowMs;

    const wheelSpinDelta = (speed / 0.002) * dt;
    for (const w of wheelMeshes) {
      w.rotation.x += wheelSpinDelta;
    }

    const targetSteerRad = THREE.MathUtils.clamp(steerAngle, -0.52, 0.52);
    for (const p of frontPivots) {
      p.rotation.y = THREE.MathUtils.lerp(p.rotation.y, targetSteerRad, Math.min(1, dt * 16));
    }
    steeringWheel.rotation.z = targetSteerRad * 1.6;
    driverHead.rotation.z = -targetSteerRad * 0.45;
    driverHead.rotation.y = targetSteerRad * 0.55;
  }

  function updateKartVisuals(dt, state) {
    const tSec = state.elapsedSec !== undefined ? state.elapsedSec : performance.now() * 0.001;
    const steerAngle =
      state.steerAngle !== undefined
        ? state.steerAngle - (state.driftAngle || 0.0) * 0.35
        : -(state.steerInput || 0.0) * 0.45 - (state.driftAngle || 0.0) * 0.35;

    updateWheels(dt, state.speed, steerAngle, tSec);

    // 3. Apply drift slip-angle yaw + suspension roll/hop to chassisGroup
    chassisGroup.rotation.y = THREE.MathUtils.lerp(
      chassisGroup.rotation.y,
      state.driftAngle || 0.0,
      Math.min(1, dt * 14)
    );
    chassisGroup.rotation.z = THREE.MathUtils.lerp(
      chassisGroup.rotation.z,
      (state.steerInput || 0.0) * 0.09,
      Math.min(1, dt * 12)
    );
    const idleBob =
      Math.abs(state.speed) > 0.005 ? Math.sin(tSec * 60.0) * 0.00018 : 0.0;
    chassisGroup.position.y = (state.hopHeight || 0.0) + idleBob;

    // 4. Volumetric Mach-Diamond Exhaust Flames
    const isBoosting = state.boostActive > 0;

    // 4B. Dynamic Headlight & Taillight Beams + Per-Kart Brake Glow + Weather Spray
    // Shared lens materials stay immutable; brake/night flares are driven via per-kart glow planes.
    const nightFactor = Math.max(0.0, Math.min(1.0, state.nightFactor ?? 0.0));
    const isBraking = Boolean(state.isBraking);
    const lightsOn = nightFactor > 0.02;

    headlightGroundBeamMesh.visible = lightsOn;
    taillightGroundBeamMesh.visible = lightsOn;
    for (const hCone of headlightVolCones) {
      hCone.visible = lightsOn;
    }
    for (const tCone of taillightVolCones) {
      tCone.visible = lightsOn;
    }

    if (lightsOn) {
      headlightGroundMat.opacity = nightFactor * 0.96;
      headlightConeMat.opacity = nightFactor * 0.64;

      const brakeFlare = isBraking ? 0.32 : 0.0;
      taillightGroundMat.opacity = Math.min(1.0, nightFactor * 0.88 + brakeFlare);
      taillightConeMat.opacity = Math.min(0.95, nightFactor * 0.66 + brakeFlare * 0.8);
    }

    const showTailGlow = lightsOn || isBraking;
    if (showTailGlow) {
      tailGlowMat.opacity = isBraking
        ? Math.min(1.0, 0.85 + nightFactor * 0.15)
        : Math.max(0.25, nightFactor * 0.78);
    }
    for (const tPlane of tailLightGlowPlanes) {
      tPlane.visible = showTailGlow;
      if (showTailGlow) {
        const s = isBraking ? 1.42 : 0.85 + nightFactor * 0.4;
        tPlane.scale.set(s, s, 1.0);
      }
    }

    const sprayMode = state.weatherSprayMode || 'NONE';
    const speedRatio = Math.max(0.0, Math.min(1.0, (state.speed || 0) / 38.0));
    const showSpray = (sprayMode === 'RAIN' || sprayMode === 'SNOW') && speedRatio > 0.08;
    for (const sMesh of tireSprayCones) {
      sMesh.visible = showSpray;
      if (showSpray) {
        const sLen = 0.55 + speedRatio * 0.85;
        const sWid = 0.65 + speedRatio * 0.55;
        sMesh.scale.set(sWid, sWid, sLen);
      }
    }
    if (showSpray) {
      tireSprayMat.uniforms.uTime.value = tSec;
      tireSprayMat.uniforms.uIntensity.value = speedRatio;
      tireSprayMat.uniforms.uIsSnow.value = sprayMode === 'SNOW' ? 1.0 : 0.0;
    }

    for (const pGroup of flameCones) {
      pGroup.visible = isBoosting;
      if (!pGroup.visible) continue;
      const pIdx = pGroup.userData.pipeIndex || 0;
      const phase = pIdx * 1.85;
      const crackle = 0.82 + 0.18 * Math.sin(tSec * 58.0 + phase) +
          0.12 * Math.cos(tSec * 93.0 - phase * 1.4);
      const rScale = 0.96 + 0.08 * Math.sin(tSec * 44.0 + phase);
      const zScale = Math.max(0.55, 0.88 + 0.28 * crackle);
      pGroup.scale.set(rScale, rScale, zScale);
      if (pGroup.userData.jetMat) {
        pGroup.userData.jetMat.uniforms.uTime.value = tSec;
        pGroup.userData.jetMat.uniforms.uIntensity.value =
            Math.min(1.35, 0.92 * crackle);
      }
    }

    // 5. Optional dynamic fire light & CPU drift spark emitter
    if (sparkFireLight || sparkPoints) {
      const isEmitting =
        (state.isDrifting ||
          isBoosting ||
          state.curbRumble > 0.2 ||
          (!state.suppressSteerSparks && Math.abs(state.steerInput || 0) > 0.32)) &&
        Math.abs(state.speed) > 0.03;

      if (sparkFireLight) {
        if (fireLightPreviewTimer > 0) {
          fireLightPreviewTimer = Math.max(0.0, fireLightPreviewTimer - dt);
        }
        const showFireLight = isEmitting || fireLightPreviewTimer > 0;
        const baseFireIntensity = 0.35 + Math.random() * 0.20;
        sparkFireLight.intensity = showFireLight
          ? baseFireIntensity * fireLightMultiplier
          : THREE.MathUtils.lerp(sparkFireLight.intensity, 0.0, Math.min(1, dt * 12));
      }

      if (sparkPoints && sparkGeo && sparkMat) {
        const kScale = kartRoot.scale.x || 0.58;
        sparkMat.uniforms.uSparkScale.value = kScale;
        const emitCount = isEmitting ? 6 : 0;

        if (emitCount > 0) {
          kartRoot.getWorldPosition(_worldPos);
          _backDir.copy(state.tangent).multiplyScalar(-1);

          for (let e = 0; e < emitCount; e++) {
            const idx = nextSparkIdx % sparkCount;
            nextSparkIdx++;
            const sideSign = e % 2 === 0 ? -1 : 1;
            _spawnPos
              .copy(_worldPos)
              .addScaledVector(state.right, sideSign * (0.0044 + Math.random() * 0.0018) * kScale)
              .addScaledVector(_backDir, (0.0060 + Math.random() * 0.0028) * kScale)
              .addScaledVector(state.normal, (0.0009 + Math.random() * 0.0009) * kScale);

            sparkPositions[idx * 3 + 0] = _spawnPos.x;
            sparkPositions[idx * 3 + 1] = _spawnPos.y;
            sparkPositions[idx * 3 + 2] = _spawnPos.z;

            const vScale = 0.65 + 0.35 * kScale;
            sparkVelocities[idx]
              .copy(_backDir)
              .multiplyScalar((0.12 + Math.random() * 0.22) * vScale)
              .addScaledVector(state.normal, (0.045 + Math.random() * 0.11) * vScale)
              .addScaledVector(state.right, (Math.random() - 0.5) * 0.12 * vScale);

            sparkAges[idx] = 0.0;
            sparkMaxAges[idx] = 0.20 + Math.random() * 0.18;
            sparkLifeAttr[idx] = 1.0;
            sparkSizes[idx] = 0.65 + Math.random() * 1.15;

            sparkColors[idx * 3 + 0] = 1.0;
            sparkColors[idx * 3 + 1] = 0.36 + Math.random() * 0.46;
            sparkColors[idx * 3 + 2] = 0.04 + Math.random() * 0.14;
          }
        }

        let activeSparksNow = false;
        if (emitCount > 0 || hadActiveSparks) {
          for (let i = 0; i < sparkCount; i++) {
            const maxAge = sparkMaxAges[i] || 0.28;
            if (sparkAges[i] < maxAge) {
              activeSparksNow = true;
              sparkAges[i] += dt;
              sparkLifeAttr[i] = Math.max(0.0, 1.0 - sparkAges[i] / maxAge);

              sparkPositions[i * 3 + 0] += sparkVelocities[i].x * dt;
              sparkPositions[i * 3 + 1] += sparkVelocities[i].y * dt;
              sparkPositions[i * 3 + 2] += sparkVelocities[i].z * dt;
              sparkVelocities[i].multiplyScalar(Math.max(0.88, 1.0 - 2.4 * dt));
              sparkVelocities[i].y -= 0.36 * dt;
            } else {
              sparkLifeAttr[i] = 0.0;
              sparkPositions[i * 3 + 1] = -10.0;
            }
          }
          sparkGeo.attributes.position.needsUpdate = true;
          sparkGeo.attributes.color.needsUpdate = true;
          sparkGeo.attributes.aLife.needsUpdate = true;
          hadActiveSparks = activeSparksNow;
        }
      }
    }
  }

  // Group holding the procedural meshes so they can be hidden cleanly when kart_1to87.glb attaches
  const proceduralParts = [
    carbonBody,
    fairingBody,
    chromeBody,
    numberPlatesMesh,
    headlightLensesMesh,
    taillightLensesMesh,
    torso,
    driverHead,
    steeringWheel,
    ...frontPivots,
    wheelMeshes[2],
    wheelMeshes[3],
  ];

  let attachedGlbScene = null;
  let cockpitRoadOnly = false;

  function setCockpitRoadOnly(isRoadOnly) {
    cockpitRoadOnly = Boolean(isRoadOnly);
    kartShadowQuad.visible = !cockpitRoadOnly;
    if (attachedGlbScene) {
      attachedGlbScene.visible = !cockpitRoadOnly;
    } else {
      for (const part of proceduralParts) {
        if (part) part.visible = !cockpitRoadOnly;
      }
    }
    for (const plane of tailLightGlowPlanes) {
      if (plane) plane.visible = !cockpitRoadOnly;
    }
  }

  function attachGlbKart(glbScene) {
    attachedGlbScene = glbScene;
    glbScene.position.set(0, 0, 0);
    glbScene.rotation.set(0, 0, 0);
    glbScene.visible = !cockpitRoadOnly;
    kartShadowQuad.visible = !cockpitRoadOnly;

    for (const part of proceduralParts) {
      if (part) part.visible = false;
    }
    chassisGroup.traverse((c) => {
      if (
        c.isMesh &&
        !flameCones.includes(c) &&
        !flameCones.includes(c.parent) &&
        !tailLightGlowPlanes.includes(c)
      ) {
        c.visible = false;
      }
    });

    function attachKartReadabilityRimShader(mat, cacheKey, minFloorStrength, topFillStrength, rimStrength) {
      mat.customProgramCacheKey = () => cacheKey;
      mat.onBeforeCompile = (shader) => {
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <dithering_fragment>',
          `
          vec3 kViewDir = normalize( vViewPosition );
          float kNdotV = clamp( abs( dot( normal, kViewDir ) ), 0.0, 1.0 );
          float kGrazing = pow( 1.0 - kNdotV, 2.15 );
          float kTopFill = clamp( normal.y * 0.65 + normal.z * 0.35, 0.0, 1.0 );
          vec3 minFloorRgb = diffuseColor.rgb * (${minFloorStrength.toFixed(3)} + ${topFillStrength.toFixed(3)} * kTopFill);
          vec3 rimHighlightRgb = mix(diffuseColor.rgb, vec3(1.0, 0.97, 0.92), 0.48) * (kGrazing * ${rimStrength.toFixed(3)});
          gl_FragColor.rgb = max(gl_FragColor.rgb, minFloorRgb) + rimHighlightRgb * (0.45 + 0.55 * kTopFill);
          #include <dithering_fragment>
          `
        );
      };
    }

    const glbFrontWheels = [];
    const glbAllWheels = [];
    glbScene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = false;
        child.receiveShadow = false;
        if (child.geometry && !child.geometry.attributes.normal) {
          child.geometry.computeVertexNormals();
        }
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        for (const mat of mats) {
          if (!mat) continue;
          const mName = (mat.name || '').toLowerCase();
          if (mName.includes('visor')) {
            if (mat.color) mat.color.setHex(0x050608);
            mat.roughness = 0.14;
            mat.metalness = 0.08;
            mat.envMapIntensity = 0.22;
            if (mat.emissive) mat.emissive.setHex(0x000000);
            mat.emissiveIntensity = 0.0;
            mat.needsUpdate = true;
          } else if (mName.includes('helmet') || mName.includes('white')) {
            if (mat.color) mat.color.setHex(0xf4f6fa);
            mat.roughness = 0.20;
            mat.metalness = 0.08;
            mat.envMapIntensity = 0.95;
            if (mat.emissive) mat.emissive.setHex(0x181c24);
            mat.emissiveIntensity = 0.12;
            attachKartReadabilityRimShader(mat, 'kart_white_rim_v1', 0.22, 0.28, 0.18);
            mat.needsUpdate = true;
          } else if (mName.includes('crimson') || mName.includes('red')) {
            if (mat.color) mat.color.setHex(0xe01b24);
            mat.roughness = 0.20;
            mat.metalness = 0.48;
            mat.envMapIntensity = 1.35;
            attachKartReadabilityRimShader(mat, 'kart_crimson_rim_v1', 0.28, 0.34, 0.26);
            mat.needsUpdate = true;
          } else if (mName.includes('gold')) {
            if (mat.color) mat.color.setHex(0xf0be3c);
            mat.roughness = 0.24;
            mat.metalness = 0.78;
            mat.envMapIntensity = 1.15;
            attachKartReadabilityRimShader(mat, 'kart_gold_rim_v1', 0.24, 0.30, 0.24);
            mat.needsUpdate = true;
          } else if (mName.includes('gunmetal')) {
            if (mat.color) mat.color.setHex(0x3e4756);
            mat.roughness = 0.26;
            mat.metalness = 0.58;
            mat.envMapIntensity = 1.30;
            attachKartReadabilityRimShader(mat, 'kart_gunmetal_rim_v1', 0.28, 0.36, 0.30);
            mat.needsUpdate = true;
          } else if (mName.includes('suit')) {
            if (mat.color) mat.color.setHex(0x2a303c);
            mat.roughness = 0.50;
            mat.metalness = 0.12;
            mat.envMapIntensity = 0.85;
            attachKartReadabilityRimShader(mat, 'kart_suit_rim_v1', 0.20, 0.24, 0.16);
            mat.needsUpdate = true;
          } else if (mName.includes('tire') || mName.includes('rubber')) {
            if (mat.color) mat.color.setHex(0x16191e);
            mat.roughness = 0.72;
            mat.metalness = 0.06;
            mat.envMapIntensity = 0.65;
            attachKartReadabilityRimShader(mat, 'kart_tire_rim_v1', 0.14, 0.18, 0.14);
            mat.needsUpdate = true;
          } else if (mName.includes('headlight')) {
            if (mat.color) mat.color.setHex(0xffffff);
            if (mat.emissive) mat.emissive.setHex(0xfff4d8);
            mat.emissiveIntensity = 2.2;
            mat.roughness = 0.08;
            mat.needsUpdate = true;
          } else if (mName.includes('rainlight') || mName.includes('taillight')) {
            if (mat.color) mat.color.setHex(0xff0010);
            if (mat.emissive) mat.emissive.setHex(0xff0018);
            mat.emissiveIntensity = 1.35;
            mat.roughness = 0.08;
            mat.toneMapped = false;
            mat.customProgramCacheKey = () => 'tail_led_ruby_glow_v1';
            mat.onBeforeCompile = (shader) => {
              shader.vertexShader = shader.vertexShader.replace(
                '#include <common>',
                `#include <common>\nvarying vec3 vLedLocalPos;`
              );
              shader.vertexShader = shader.vertexShader.replace(
                '#include <begin_vertex>',
                `#include <begin_vertex>\nvLedLocalPos = position;`
              );
              shader.fragmentShader = shader.fragmentShader.replace(
                '#include <common>',
                `#include <common>\nvarying vec3 vLedLocalPos;`
              );
              shader.fragmentShader = shader.fragmentShader.replace(
                '#include <dithering_fragment>',
                `
                float ax = abs(vLedLocalPos.x);
                float uCluster = clamp((ax - 0.00218) / 0.00212, 0.0, 1.0);
                float segU = fract(uCluster * 3.0) - 0.5;
                float rowCenterY = vLedLocalPos.y > 0.00276 ? 0.00309 : 0.00244;
                float segV = clamp((vLedLocalPos.y - rowCenterY) / 0.00025, -1.0, 1.0);
                float edgeDist = max(abs(segU) * 2.0, abs(segV));
                float diodeCore = exp(- (segU * segU * 7.5 + segV * segV * 2.8));
                float rimShade = smoothstep(1.0, 0.25, edgeDist);
                vec3 deepCrimson = vec3(0.58, 0.0, 0.014);
                vec3 hotRubyCore = vec3(1.42, 0.0, 0.048);
                vec3 rubyLedRgb = mix(deepCrimson, hotRubyCore, clamp(diodeCore * 0.85 + rimShade * 0.25, 0.0, 1.0));
                gl_FragColor = vec4(rubyLedRgb, 1.0);
                #include <dithering_fragment>
                `
              );
            };
            mat.needsUpdate = true;
          } else if (mName.includes('chrome')) {
            if (mat.color) mat.color.setHex(0x7d8796);
            mat.roughness = 0.30;
            mat.metalness = 0.82;
            mat.envMapIntensity = 0.65;
            attachKartReadabilityRimShader(mat, 'kart_chrome_rim_v2', 0.14, 0.18, 0.12);
            mat.needsUpdate = true;
          }
        }
      }
      if (child.name === 'Wheel_FL' || child.name === 'Wheel_FR') {
        glbFrontWheels.push(child);
        glbAllWheels.push(child);
      } else if (child.name === 'Wheel_RL' || child.name === 'Wheel_RR') {
        glbAllWheels.push(child);
      }
    });

    chassisGroup.add(glbScene);
    if (glbAllWheels.length > 0) {
      wheelMeshes.push(...glbAllWheels);
    }
    if (glbFrontWheels.length > 0) {
      frontPivots.push(...glbFrontWheels);
    }
  }

  let labelSprite = null;
  function setLabel(text, colorHex = 0xffffff) {
    if (labelSprite) {
      kartRoot.remove(labelSprite);
      if (labelSprite.material.map) labelSprite.material.map.dispose();
      labelSprite.material.dispose();
      labelSprite = null;
    }
    if (!text) return;
    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.beginPath();
    safeRoundRect(ctx, 6, 6, 148, 52, 16);
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = typeof colorHex === 'number' ? `#${colorHex.toString(16).padStart(6, '0')}` : colorHex;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 80, 32);
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false });
    labelSprite = new THREE.Sprite(mat);
    labelSprite.scale.set(0.026, 0.0105, 1);
    labelSprite.position.set(0, 0.019, 0);
    kartRoot.add(labelSprite);
  }

  function setLabelVisible(visible) {
    if (labelSprite && labelSprite.visible !== visible) {
      labelSprite.visible = visible;
    }
  }

  function updateColors(theme = {}) {
    if (theme.colorHex !== undefined) redFairingMat.color.setHex(theme.colorHex);
    if (theme.rimHex !== undefined) goldRimMat.color.setHex(theme.rimHex);
    if (theme.suitHex !== undefined) suitMat.color.setHex(theme.suitHex);
    if (theme.helmetHex !== undefined) helmetShell.material.color.setHex(theme.helmetHex);
    if (theme.visorHex !== undefined) {
      visor.material.color.setHex(theme.visorHex);
      visor.material.emissive.setHex(theme.visorHex);
    }
  }

  function disposeKart() {
    redFairingMat.dispose();
    goldRimMat.dispose();
    suitMat.dispose();
    helmetShell.material.dispose();
    visor.material.dispose();
    numberPlateMat.dispose();
    tailGlowMat.dispose();
    headlightGroundMat.dispose();
    headlightConeMat.dispose();
    taillightGroundMat.dispose();
    taillightConeMat.dispose();
    tireSprayMat.dispose();
    for (const pGroup of flameCones) {
      if (pGroup.userData && pGroup.userData.jetMat) {
        pGroup.userData.jetMat.dispose();
      }
    }
    sparkGeo?.dispose();
    sparkMat?.dispose();
    sparkFireLight?.dispose();
    headlight?.dispose();
    if (labelSprite) {
      kartRoot.remove(labelSprite);
      if (labelSprite.material.map && !labelSprite.material.map.userData?.isSharedResource) {
        labelSprite.material.map.dispose();
      }
      labelSprite.material.dispose();
      labelSprite = null;
    }
    if (attachedGlbScene) {
      attachedGlbScene.traverse((child) => {
        if (child.isMesh) {
          if (child.geometry && !child.geometry.userData?.isSharedResource) {
            child.geometry.dispose();
          }
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          mats.forEach((m) => {
            if (!m || m.userData?.isSharedResource) return;
            if (m.map && !m.map.userData?.isSharedResource) m.map.dispose();
            m.dispose();
          });
        }
      });
      attachedGlbScene = null;
    }
  }

  return {
    kartRoot,
    chassisGroup,
    sparkPoints,
    sparkFireLight,
    setFireLightMultiplier,
    setCockpitRoadOnly,
    updateWheels,
    updateKartVisuals,
    attachGlbKart,
    setLabel,
    setLabelVisible,
    updateColors,
    disposeKart,
  };
}
