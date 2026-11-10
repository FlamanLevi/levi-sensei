import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { detectClassroomGpuProfile } from '@/utils/classroom3d';
import { DieType } from './DiceModal';

export interface TrayDieState {
  id: string;
  type: DieType;
  value: number;
}

interface ThreeDiceStageProps {
  dice: TrayDieState[];
  isRolling: boolean;
  onDieClick?: (id: string) => void;
  onRollComplete?: () => void;
  onFlickRoll?: () => void;
}

// Visual themes for each die (Unified gemstone palette)
interface DieTheme {
  primary: string;
  secondary: string;
  border: string;
  text: string;
}

const DIE_THEMES: Record<DieType, DieTheme> = {
  d4: {
    primary: '#d97706',
    secondary: '#f59e0b',
    border: 'rgba(254, 240, 138, 0.9)',
    text: '#ffffff',
  },
  d6: {
    primary: '#1d4ed8', // Sapphire / Cobalt Blue with white numbers
    secondary: '#3b82f6',
    border: 'rgba(191, 219, 254, 0.9)',
    text: '#ffffff',
  },
  d8: {
    primary: '#047857',
    secondary: '#10b981',
    border: 'rgba(167, 243, 208, 0.9)',
    text: '#ffffff',
  },
  d10: {
    primary: '#6b21a8',
    secondary: '#a855f7',
    border: 'rgba(233, 213, 255, 0.9)',
    text: '#ffffff',
  },
  d12: {
    primary: '#0e7490',
    secondary: '#06b6d4',
    border: 'rgba(207, 250, 254, 0.9)',
    text: '#ffffff',
  },
  d20: {
    primary: '#be123c',
    secondary: '#f43f5e',
    border: 'rgba(254, 205, 211, 0.9)',
    text: '#ffffff',
  },
};

interface DieStyleConfig {
  lineWidth: number;
  innerLineWidth: number;
  fontSingle: number;
  fontDouble: number;
  yPos: number;
}

const DIE_STYLE_CONFIG: Record<DieType, DieStyleConfig> = {
  d4: {
    lineWidth: 5.0,
    innerLineWidth: 2.0,
    fontSingle: 68,
    fontDouble: 56,
    yPos: 154,
  },
  d6: {
    lineWidth: 7.0,
    innerLineWidth: 2.5,
    fontSingle: 104,
    fontDouble: 88,
    yPos: 128,
  },
  d8: {
    lineWidth: 5.5,
    innerLineWidth: 2.0,
    fontSingle: 80,
    fontDouble: 68,
    yPos: 154,
  },
  d10: {
    lineWidth: 4.2,
    innerLineWidth: 1.8,
    fontSingle: 64,
    fontDouble: 52,
    yPos: 132,
  },
  d12: {
    lineWidth: 6.0,
    innerLineWidth: 2.2,
    fontSingle: 90,
    fontDouble: 76,
    yPos: 128,
  },
  d20: {
    lineWidth: 7.0,
    innerLineWidth: 2.5,
    fontSingle: 100,
    fontDouble: 84,
    yPos: 154,
  },
};

// Texture Cache
const textureCache = new Map<string, THREE.CanvasTexture>();

function getFaceTexture(
  dieType: DieType,
  num: number,
  theme: DieTheme
): THREE.CanvasTexture {
  const cacheKey = `${dieType}-${num}-${theme.primary}`;
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey)!;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Solid base fill to prevent any transparent mipmap black borders along polygon edges
  ctx.fillStyle = theme.primary;
  ctx.fillRect(0, 0, 256, 256);

  // Background
  const grad = ctx.createRadialGradient(128, 120, 20, 128, 128, 130);
  grad.addColorStop(0, theme.secondary);
  grad.addColorStop(1, theme.primary);
  ctx.fillStyle = grad;

  ctx.beginPath();
  if (dieType === 'd4' || dieType === 'd8' || dieType === 'd20') {
    ctx.moveTo(128, 22);
    ctx.lineTo(242, 220);
    ctx.lineTo(14, 220);
  } else if (dieType === 'd6') {
    ctx.roundRect ? ctx.roundRect(14, 14, 228, 228, 18) : ctx.rect(14, 14, 228, 228);
  } else if (dieType === 'd10') {
    ctx.moveTo(128, 14);
    ctx.lineTo(200, 198);
    ctx.lineTo(128, 242);
    ctx.lineTo(56, 198);
  } else if (dieType === 'd12') {
    for (let i = 0; i < 5; i++) {
      const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
      const x = 128 + 115 * Math.cos(angle);
      const y = 128 + 115 * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
  }
  ctx.closePath();
  ctx.fill();

  const cfg = DIE_STYLE_CONFIG[dieType];

  // Edge border highlight (Calibrated to identical ~0.042 world units across all dice)
  ctx.lineWidth = cfg.lineWidth;
  ctx.strokeStyle = theme.border;
  ctx.stroke();

  // Inner subtle shadow line
  ctx.lineWidth = cfg.innerLineWidth;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.stroke();

  // Number Label
  const is6or9 = (dieType === 'd10' || dieType === 'd12' || dieType === 'd20') && (num === 6 || num === 9);
  const textStr = is6or9 ? `${num}.` : String(num);

  const fontSize = num >= 10 ? cfg.fontDouble : cfg.fontSingle;
  ctx.font = `900 ${fontSize}px "UD Digi Kyokasho NP-R", "BIZ UDPGothic", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Embossed Drop Shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 3;
  ctx.fillStyle = theme.text;
  ctx.fillText(textStr, 128, cfg.yPos);
  ctx.shadowColor = 'transparent';

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  textureCache.set(cacheKey, texture);
  return texture;
}

// --- Global Upright Camera & Landing Basis Vectors ---
const VIEW_DIR = new THREE.Vector3(0, 0.6, 0.8).normalize();
const WORLD_UP = new THREE.Vector3(0, 1, 0);
const targetUp = new THREE.Vector3()
  .copy(WORLD_UP)
  .sub(new THREE.Vector3().copy(VIEW_DIR).multiplyScalar(WORLD_UP.dot(VIEW_DIR)))
  .normalize();
const targetRight = new THREE.Vector3().crossVectors(targetUp, VIEW_DIR).normalize();

/**
 * Constructs an exact dual-constrained quaternion that orients a die so that:
 * 1. faceNormal points directly towards the camera (VIEW_DIR).
 * 2. faceUp points directly towards the screen's vertical up direction (targetUp).
 * This completely eliminates tilts, inversions, and roll drift.
 */
function getUprightLandingQuaternion(faceNormal: THREE.Vector3, faceUp: THREE.Vector3): THREE.Quaternion {
  const norm = faceNormal.clone().normalize();
  const up = faceUp.clone().normalize();
  up.sub(norm.clone().multiplyScalar(up.dot(norm))).normalize();
  const right = new THREE.Vector3().crossVectors(up, norm).normalize();

  const mLocal = new THREE.Matrix4().makeBasis(right, up, norm);
  const mTarget = new THREE.Matrix4().makeBasis(targetRight, targetUp, VIEW_DIR);
  const mResult = new THREE.Matrix4().multiplyMatrices(mTarget, mLocal.clone().transpose());
  return new THREE.Quaternion().setFromRotationMatrix(mResult);
}

export interface DieGeometryData {
  geom: THREE.BufferGeometry;
  normals: THREE.Vector3[];
  faceUps: THREE.Vector3[];
}

/**
 * General helper for triangular polyhedra (D4, D8, D20):
 * Projects each triangular face onto the 2D texture canvas with sub-pixel precision,
 * choosing the natural top apex per face aligned with reference up.
 */
function processTriangularPolyhedron(baseGeom: THREE.BufferGeometry): DieGeometryData {
  const geom = baseGeom.clone();
  const pos = geom.attributes.position;
  const numFaces = pos.count / 3;
  const uvs = new Float32Array(numFaces * 6);
  const normals: THREE.Vector3[] = [];
  const faceUps: THREE.Vector3[] = [];

  for (let f = 0; f < numFaces; f++) {
    const v = [
      new THREE.Vector3().fromBufferAttribute(pos, f * 3),
      new THREE.Vector3().fromBufferAttribute(pos, f * 3 + 1),
      new THREE.Vector3().fromBufferAttribute(pos, f * 3 + 2),
    ];
    const center = new THREE.Vector3().add(v[0]).add(v[1]).add(v[2]).divideScalar(3);
    const normal = new THREE.Vector3()
      .crossVectors(new THREE.Vector3().subVectors(v[1], v[0]), new THREE.Vector3().subVectors(v[2], v[0]))
      .normalize();

    let uRef = new THREE.Vector3(0, 1, 0);
    let uProj = new THREE.Vector3().copy(uRef).sub(new THREE.Vector3().copy(normal).multiplyScalar(uRef.dot(normal)));
    if (uProj.lengthSq() < 1e-4) {
      uRef = new THREE.Vector3(0, 0, -1);
      uProj = new THREE.Vector3().copy(uRef).sub(new THREE.Vector3().copy(normal).multiplyScalar(uRef.dot(normal)));
    }
    uProj.normalize();

    let bestIdx = 0;
    let maxDot = -Infinity;
    for (let k = 0; k < 3; k++) {
      const dir = new THREE.Vector3().subVectors(v[k], center).normalize();
      const dot = dir.dot(uProj);
      if (dot > maxDot) {
        maxDot = dot;
        bestIdx = k;
      }
    }

    const faceUp = new THREE.Vector3().subVectors(v[bestIdx], center).normalize();
    const faceRight = new THREE.Vector3().crossVectors(faceUp, normal).normalize();
    const R3D = v[bestIdx].distanceTo(center);
    const scale = (132 / 256) / R3D;

    for (let vi = 0; vi < 3; vi++) {
      const rel = new THREE.Vector3().subVectors(v[vi], center);
      const x = rel.dot(faceRight);
      const y = rel.dot(faceUp);
      const u = 0.5 + x * scale;
      const valV = (102 / 256) + y * scale;
      uvs[f * 6 + vi * 2] = u;
      uvs[f * 6 + vi * 2 + 1] = valV;
    }

    geom.addGroup(f * 3, 3, f);
    normals.push(normal);
    faceUps.push(faceUp);
  }

  geom.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geom.computeVertexNormals();

  return { geom, normals, faceUps };
}

// 1. D4 Geometry Data
function createD4Data(): DieGeometryData {
  return processTriangularPolyhedron(new THREE.TetrahedronGeometry(1.25, 0));
}

// 2. D6 Geometry Data
function createD6Data(): DieGeometryData {
  const geom = new THREE.BoxGeometry(1.5, 1.5, 1.5);
  const normals = [
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(-1, 0, 0),
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(0, -1, 0),
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(0, 0, -1),
  ];
  const faceUps = [
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(0, 0, -1),
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(0, 1, 0),
  ];
  return { geom, normals, faceUps };
}

// 3. D8 Geometry Data
function createD8Data(): DieGeometryData {
  return processTriangularPolyhedron(new THREE.OctahedronGeometry(1.25, 0));
}

// 4. D10 Geometry Data (Mathematically Exact Pentagonal Trapezohedron with 100% Planar Kites & Planar UVs)
function createD10Data(radius = 1.3): DieGeometryData {
  const geom = new THREE.BufferGeometry();
  const H = radius * 1.35;
  const R = radius * 0.95;
  const h = H * Math.pow(Math.tan(Math.PI / 10), 2); // Exact tan^2(18 deg) * H ensures 100.000% planar kites

  const top = new THREE.Vector3(0, H, 0);
  const bot = new THREE.Vector3(0, -H, 0);

  const U: THREE.Vector3[] = [];
  const D: THREE.Vector3[] = [];
  for (let i = 0; i < 5; i++) {
    const angleU = (i * 2 * Math.PI) / 5;
    U.push(new THREE.Vector3(R * Math.cos(angleU), h, R * Math.sin(angleU)));

    const angleD = ((i + 0.5) * 2 * Math.PI) / 5;
    D.push(new THREE.Vector3(R * Math.cos(angleD), -h, R * Math.sin(angleD)));
  }

  interface KiteFace {
    verts: [THREE.Vector3, THREE.Vector3, THREE.Vector3, THREE.Vector3];
    apexPole: THREE.Vector3;
    apexEquator: THREE.Vector3;
  }

  const kites: KiteFace[] = [];
  // Upper 5 kites (Faces 1-5):
  for (let i = 0; i < 5; i++) {
    const next = (i + 1) % 5;
    // Outward CCW: top -> U[next] -> D[i] -> U[i]
    kites.push({
      verts: [top, U[next], D[i], U[i]],
      apexPole: top,
      apexEquator: D[i],
    });
  }
  // Lower 5 kites (Faces 6-10):
  for (let i = 0; i < 5; i++) {
    const next = (i + 1) % 5;
    // Outward CCW: bot -> D[i] -> U[next] -> D[next]
    kites.push({
      verts: [bot, D[i], U[next], D[next]],
      apexPole: bot,
      apexEquator: U[next],
    });
  }

  const positions: number[] = [];
  const uvs: number[] = [];
  const normals: THREE.Vector3[] = [];
  const faceUps: THREE.Vector3[] = [];
  const scale = (114 / 1.1500) / 256;

  kites.forEach((kite, fIdx) => {
    const [v0, v1, v2, v3] = kite.verts;
    const normal = new THREE.Vector3()
      .crossVectors(new THREE.Vector3().subVectors(v1, v0), new THREE.Vector3().subVectors(v2, v0))
      .normalize();
    const axisY = new THREE.Vector3().subVectors(kite.apexPole, kite.apexEquator).normalize();
    const axisX = new THREE.Vector3().crossVectors(axisY, normal).normalize();
    const origin = new THREE.Vector3().addVectors(kite.apexPole, kite.apexEquator).multiplyScalar(0.5);

    const getUV = (v: THREE.Vector3) => {
      const rel = new THREE.Vector3().subVectors(v, origin);
      return [
        0.5 + rel.dot(axisX) * scale,
        0.5 + rel.dot(axisY) * scale,
      ];
    };

    // Tri 1: v0 -> v1 -> v2
    positions.push(v0.x, v0.y, v0.z, v1.x, v1.y, v1.z, v2.x, v2.y, v2.z);
    const uv0 = getUV(v0);
    const uv1 = getUV(v1);
    const uv2 = getUV(v2);
    uvs.push(uv0[0], uv0[1], uv1[0], uv1[1], uv2[0], uv2[1]);

    // Tri 2: v0 -> v2 -> v3
    positions.push(v0.x, v0.y, v0.z, v2.x, v2.y, v2.z, v3.x, v3.y, v3.z);
    const uv3 = getUV(v3);
    uvs.push(uv0[0], uv0[1], uv2[0], uv2[1], uv3[0], uv3[1]);

    geom.addGroup(fIdx * 6, 6, fIdx);
    normals.push(normal);
    faceUps.push(axisY);
  });

  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geom.computeVertexNormals();
  return { geom, normals, faceUps };
}

// 5. D12 Geometry Data (Watertight Dodecahedron with seamless 2D planar pentagon UVs)
const PHI = (1 + Math.sqrt(5)) / 2;
const INV_PHI = 1 / PHI;

function createD12Data(radius = 1.2): DieGeometryData {
  const rawVerts = [
    [-1, -1, -1], [-1, -1, 1], [-1, 1, -1], [-1, 1, 1],
    [1, -1, -1],  [1, -1, 1],  [1, 1, -1],  [1, 1, 1],
    [0, -INV_PHI, -PHI], [0, -INV_PHI, PHI], [0, INV_PHI, -PHI], [0, INV_PHI, PHI],
    [-INV_PHI, -PHI, 0], [-INV_PHI, PHI, 0], [INV_PHI, -PHI, 0], [INV_PHI, PHI, 0],
    [-PHI, 0, -INV_PHI], [-PHI, 0, INV_PHI], [PHI, 0, -INV_PHI], [PHI, 0, INV_PHI],
  ].map(v => new THREE.Vector3(...v).normalize().multiplyScalar(radius));

  const pentagonFaces = [
    [0, 8, 10, 2, 16],
    [0, 16, 17, 1, 12],
    [0, 12, 14, 4, 8],
    [8, 4, 18, 6, 10],
    [10, 6, 15, 13, 2],
    [2, 13, 3, 17, 16],
    [1, 9, 11, 3, 17],
    [1, 12, 14, 5, 9],
    [9, 5, 19, 7, 11],
    [11, 7, 15, 13, 3],
    [5, 14, 4, 18, 19],
    [7, 15, 6, 18, 19],
  ];

  const positions: number[] = [];
  const uvs: number[] = [];
  const normals: THREE.Vector3[] = [];
  const faceUps: THREE.Vector3[] = [];
  const geom = new THREE.BufferGeometry();
  const R_canvas = 115;

  pentagonFaces.forEach((face, fIdx) => {
    const center = new THREE.Vector3();
    face.forEach(vi => center.add(rawVerts[vi]));
    center.divideScalar(5);

    const v0 = rawVerts[face[0]];
    const v1 = rawVerts[face[1]];
    const v2 = rawVerts[face[2]];
    let normal = new THREE.Vector3()
      .crossVectors(new THREE.Vector3().subVectors(v1, v0), new THREE.Vector3().subVectors(v2, v0))
      .normalize();
    if (normal.dot(center) < 0) {
      face.reverse();
      normal.negate();
    }

    const faceUp = new THREE.Vector3().subVectors(rawVerts[face[0]], center).normalize();
    const faceRight = new THREE.Vector3().crossVectors(faceUp, normal).normalize();
    const R_3D = rawVerts[face[0]].distanceTo(center);
    const scale = (R_canvas / 256) / R_3D;

    const triIndices = [[0, 1, 2], [0, 2, 3], [0, 3, 4]];
    triIndices.forEach(tri => {
      tri.forEach(k => {
        const vert = rawVerts[face[k]];
        positions.push(vert.x, vert.y, vert.z);

        const rel = new THREE.Vector3().subVectors(vert, center);
        const u = 0.5 + rel.dot(faceRight) * scale;
        const v = 0.5 + rel.dot(faceUp) * scale;
        uvs.push(u, v);
      });
    });

    geom.addGroup(fIdx * 9, 9, fIdx);
    normals.push(normal);
    faceUps.push(faceUp);
  });

  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geom.computeVertexNormals();
  return { geom, normals, faceUps };
}

// 6. D20 Geometry Data
function createD20Data(): DieGeometryData {
  return processTriangularPolyhedron(new THREE.IcosahedronGeometry(1.3, 0));
}

interface Die3DInstance {
  id: string;
  type: DieType;
  value: number;
  mesh: THREE.Mesh;
  normals: THREE.Vector3[];
  faceUps: THREE.Vector3[];
  targetQuat: THREE.Quaternion;
  targetPos: THREE.Vector3;
  isRolling: boolean;
  rollStartTime: number;
  spinAxis: THREE.Vector3;
  spinSpeed: number;
}

export const ThreeDiceStage: React.FC<ThreeDiceStageProps> = ({
  dice,
  isRolling,
  onDieClick,
  onRollComplete,
  onFlickRoll,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const instancesRef = useRef<Die3DInstance[]>([]);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());

  // Initialize Scene
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth || 400;
    const height = mount.clientHeight || 260;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Steeper classroom camera calibrated for large expansive felt
    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 100);
    camera.position.set(0, 6.2, 7.6);
    camera.lookAt(0, -0.2, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    const gpu = detectClassroomGpuProfile(renderer.getContext());
    renderer.setClearColor(0x0f5132, 1);
    renderer.setSize(width, height);
    renderer.setPixelRatio(gpu.targetPixelRatio);
    renderer.shadowMap.enabled = gpu.enableDynamicShadows;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    rendererRef.current = renderer;
    mount.appendChild(renderer.domElement);

    // Studio Classroom Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
    dirLight.position.set(-6, 14, 8);
    dirLight.castShadow = gpu.enableDynamicShadows;
    if (gpu.enableDynamicShadows) {
      dirLight.shadow.mapSize.width = gpu.shadowMapRes;
      dirLight.shadow.mapSize.height = gpu.shadowMapRes;
    }
    scene.add(dirLight);

    // Warm specular glint light for crystalline dice facets
    const glintLight = new THREE.PointLight(0xfff5e6, 0.75, 35);
    glintLight.position.set(0, 10, 4);
    scene.add(glintLight);

    const rimLight = new THREE.DirectionalLight(0x93c5fd, 0.5);
    rimLight.position.set(6, 6, -5);
    scene.add(rimLight);

    // Real Casino Billiard Green Felt Mat Floor
    const floorGeo = new THREE.PlaneGeometry(80, 80);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x135c39, // Rich emerald casino craps felt green
      roughness: 0.85,  // Matte felt cloth
      metalness: 0.04,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.45;
    floor.receiveShadow = true;
    scene.add(floor);

    const handleResize = () => {
      if (!mount || !renderer || !camera) return;
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(mount);

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (renderer.domElement && mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
      renderer.dispose();
      textureCache.forEach(tex => tex.dispose());
      textureCache.clear();
    };
  }, []);

  // Update Dice Meshes & Layout
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    instancesRef.current.forEach(inst => {
      scene.remove(inst.mesh);
      inst.mesh.geometry.dispose();
      if (Array.isArray(inst.mesh.material)) {
        inst.mesh.material.forEach(m => m.dispose());
      } else {
        inst.mesh.material.dispose();
      }
    });

    const newInstances: Die3DInstance[] = [];
    const count = dice.length;
    if (count === 0) {
      instancesRef.current = [];
      return;
    }

    // Dynamic die scale: calibrated larger for high visibility on classroom projectors & iPad folios
    const dieScale = count === 1 ? 1.65 : count === 2 ? 1.5 : count <= 4 ? 1.38 : 1.25;

    // Staggered Non-Occluding Grid Layout
    const isSingleRow = count <= 4;
    const cols = isSingleRow ? count : Math.ceil(count / 2);
    const spacingX = count === 1 ? 0 : Math.min(3.4, 9.8 / Math.max(1, cols - 1));

    dice.forEach((die, idx) => {
      let row = 0;
      let col = idx;
      if (!isSingleRow) {
        row = idx < cols ? 0 : 1; // row 0 = back, row 1 = front
        col = idx < cols ? idx : idx - cols;
      }

      // Stagger back row by half a step so back dice peek through front dice gaps!
      const staggerOffset = !isSingleRow && row === 0 ? spacingX * 0.45 : 0;
      const xOffset = (col - (cols - 1) / 2) * spacingX + staggerOffset;
      const zOffset = isSingleRow ? 0 : row === 0 ? -1.65 : 1.45;
      const targetPos = new THREE.Vector3(xOffset, 0, zOffset);

      // Create Geometry & Normals with Upright Vectors
      let dieData: DieGeometryData;
      const numFaces = die.type === 'd4' ? 4 : die.type === 'd6' ? 6 : die.type === 'd8' ? 8 : die.type === 'd10' ? 10 : die.type === 'd12' ? 12 : 20;

      if (die.type === 'd4') {
        dieData = createD4Data();
      } else if (die.type === 'd6') {
        dieData = createD6Data();
      } else if (die.type === 'd8') {
        dieData = createD8Data();
      } else if (die.type === 'd10') {
        dieData = createD10Data();
      } else if (die.type === 'd12') {
        dieData = createD12Data();
      } else {
        dieData = createD20Data();
      }

      const { geom, normals, faceUps } = dieData;

      // Create Materials with Face Textures
      const theme = DIE_THEMES[die.type];
      const materials: THREE.MeshStandardMaterial[] = [];
      for (let f = 1; f <= numFaces; f++) {
        const tex = getFaceTexture(die.type, f, theme);
        materials.push(
          new THREE.MeshStandardMaterial({
            map: tex,
            roughness: 0.14,
            metalness: 0.08,
            flatShading: true,
          })
        );
      }

      const mesh = new THREE.Mesh(geom, materials);
      mesh.scale.set(dieScale, dieScale, dieScale);
      mesh.castShadow = true;
      mesh.receiveShadow = false;
      mesh.position.copy(targetPos);

      // Winning Face alignment quaternion (Dual-constrained: normal -> VIEW_DIR, faceUp -> targetUp)
      const targetQuat = new THREE.Quaternion();
      const faceIdx = Math.max(0, Math.min(numFaces - 1, die.value - 1));
      if (normals[faceIdx] && faceUps[faceIdx]) {
        targetQuat.copy(getUprightLandingQuaternion(normals[faceIdx], faceUps[faceIdx]));
      }
      mesh.quaternion.copy(targetQuat);

      scene.add(mesh);

      newInstances.push({
        id: die.id,
        type: die.type,
        value: die.value,
        mesh,
        normals,
        faceUps,
        targetQuat,
        targetPos,
        isRolling: false,
        rollStartTime: 0,
        spinAxis: new THREE.Vector3(Math.random() - 0.5, 1, Math.random() - 0.5).normalize(),
        spinSpeed: 18 + Math.random() * 8,
      });
    });

    instancesRef.current = newInstances;
  }, [dice]);

  // Handle Roll Trigger
  useEffect(() => {
    if (isRolling) {
      const now = performance.now();
      instancesRef.current.forEach(inst => {
        inst.isRolling = true;
        inst.rollStartTime = now;
        inst.spinAxis = new THREE.Vector3(
          (Math.random() - 0.5) * 2,
          1 + Math.random(),
          (Math.random() - 0.5) * 2
        ).normalize();
        inst.spinSpeed = 18 + Math.random() * 8;

        const faceIdx = Math.max(0, Math.min(inst.normals.length - 1, inst.value - 1));
        if (inst.normals[faceIdx] && inst.faceUps[faceIdx]) {
          inst.targetQuat.copy(getUprightLandingQuaternion(inst.normals[faceIdx], inst.faceUps[faceIdx]));
        }
      });
    }
  }, [isRolling, dice]);

  // Render Loop (Snappy 950ms Procedural Hop & 3D Tumble onto Felt)
  useEffect(() => {
    const rollDuration = 950; // ms

    const animate = (time: number) => {
      animFrameRef.current = requestAnimationFrame(animate);

      let anyStillRolling = false;

      instancesRef.current.forEach(inst => {
        if (inst.isRolling) {
          const elapsed = time - inst.rollStartTime;
          const progress = Math.min(1, elapsed / rollDuration);

          // Parabolic Hop + Damped Table Bounces
          let yOffset = 0;
          if (progress < 0.45) {
            const p = progress / 0.45;
            yOffset = Math.sin(p * Math.PI) * 3.2;
          } else if (progress < 0.75) {
            const p = (progress - 0.45) / 0.3;
            yOffset = Math.sin(p * Math.PI) * 1.1;
          } else if (progress < 0.92) {
            const p = (progress - 0.75) / 0.17;
            yOffset = Math.sin(p * Math.PI) * 0.35;
          }

          inst.mesh.position.set(inst.targetPos.x, inst.targetPos.y + yOffset, inst.targetPos.z);

          // 3D Tumbling Rotation
          if (progress < 0.85) {
            const deltaRot = new THREE.Quaternion().setFromAxisAngle(
              inst.spinAxis,
              (1 - progress * 0.6) * 0.28
            );
            inst.mesh.quaternion.multiply(deltaRot);
          } else {
            const snapProgress = (progress - 0.85) / 0.15;
            const ease = 1 - Math.pow(1 - snapProgress, 3);
            inst.mesh.quaternion.slerp(inst.targetQuat, ease);
          }

          if (progress < 1) {
            anyStillRolling = true;
          } else {
            inst.isRolling = false;
            inst.mesh.position.copy(inst.targetPos);
            inst.mesh.quaternion.copy(inst.targetQuat);
          }
        }
      });

      if (!anyStillRolling && isRolling && onRollComplete) {
        onRollComplete();
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isRolling, onRollComplete]);

  // Touch / Pointer Gesture Tracking for "Flick to Toss" vs Tap Die
  const pointerStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    pointerStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      time: performance.now(),
    };
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isRolling || !mountRef.current || !cameraRef.current) return;
    const start = pointerStartRef.current;
    pointerStartRef.current = null;
    if (!start) return;

    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    const dist = Math.hypot(dx, dy);

    // If swiped / flicked by more than 25px: launch full dice roll!
    if (dist > 25 && onFlickRoll) {
      onFlickRoll();
      return;
    }

    // Otherwise, treat as tap / click on individual die:
    if (dist < 15 && onDieClick) {
      const rect = mountRef.current.getBoundingClientRect();
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
      const meshes = instancesRef.current.map(i => i.mesh);
      const intersects = raycasterRef.current.intersectObjects(meshes);

      if (intersects.length > 0) {
        const hitMesh = intersects[0].object;
        const hitInst = instancesRef.current.find(i => i.mesh === hitMesh);
        if (hitInst) {
          onDieClick(hitInst.id);
        }
      }
    }
  };

  return (
    <div
      ref={mountRef}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      className="w-full h-full min-h-[220px] sm:min-h-[320px] md:min-h-[400px] relative cursor-grab active:cursor-grabbing select-none overflow-hidden touch-none"
      title="スワイプでダイスを振る / タップで個別に振り直し (Swipe to roll / Tap die to reroll)"
    />
  );
};
