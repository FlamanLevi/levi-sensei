import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { detectClassroomGpuProfile } from '@/utils/classroom3d';
import { TeamId } from '../types';
import { MiiEmotionFX } from './vfx';

interface TugOfWar3DStageProps {
  displacement: number; // -100 to +100 (negative = red pull/left, positive = white pull/right)
  matchEnded: boolean;
  winner: TeamId | 'draw' | null;
  redPullRate?: number;
  whitePullRate?: number;
  redPlayersCount?: number;
  whitePlayersCount?: number;
  schoolName?: string;
}

// Shader injection for authentic Wii Sports Satin Rim-Lighting & Hemisphere Top-Light Boost
function injectWiiSatinRimShader(material: THREE.Material, rimStrength = 0.28, topBoost = 0.1) {
  if (!material || (material.userData && material.userData.wiiRimInjected)) return material;
  material.userData = material.userData || {};
  material.userData.wiiRimInjected = true;

  const key = `wii_mii_satin_rim_${rimStrength.toFixed(2)}_${topBoost.toFixed(2)}`;
  (material as any).customProgramCacheKey = () => key;

  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <opaque_fragment>',
      `
      // Nintendo Wii Sports Rim-Lighting + Hemisphere Top-Light Boost
      vec3 wiiViewDir = normalize( vViewPosition );
      vec3 wiiNormal = normalize( vNormal );
      float wiiRim = pow( 1.0 - max( dot( wiiNormal, wiiViewDir ), 0.0 ), 2.6 ) * ${rimStrength.toFixed(3)};
      float wiiHemiTop = clamp( wiiNormal.y * 0.5 + 0.5, 0.0, 1.0 ) * ${topBoost.toFixed(3)};
      vec3 wiiRimTint = vec3( 1.0, 0.985, 0.94 );
      outgoingLight += wiiRimTint * wiiRim + diffuseColor.rgb * wiiHemiTop;
      #include <opaque_fragment>
      `
    );
  };
  material.needsUpdate = true;
  return material;
}

// Double-ring contact shadow texture (as engineered in Argon)
let cachedShadowTexture: THREE.CanvasTexture | null = null;
function createDoubleRingShadowTexture(): THREE.CanvasTexture | null {
  if (cachedShadowTexture) return cachedShadowTexture;
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const cx = 128;
  const cy = 128;
  const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, 118);
  grad.addColorStop(0, 'rgba(8, 22, 6, 0.85)');
  grad.addColorStop(0.38, 'rgba(10, 26, 8, 0.62)');
  grad.addColorStop(0.68, 'rgba(12, 30, 10, 0.26)');
  grad.addColorStop(0.84, 'rgba(14, 34, 12, 0.12)');
  grad.addColorStop(1.0, 'rgba(14, 34, 12, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, 92, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(8, 24, 6, 0.18)';
  ctx.lineWidth = 8;
  ctx.stroke();
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  cachedShadowTexture = tex;
  return tex;
}

// Authentic Japanese Undokai Stadium Wall Banner Texture
function createSchoolBannerTexture(schoolName = '二子玉川小'): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.width = 1536;
  canvas.height = 384;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // 1. Stadium Board Background: Deep hunter green
  ctx.fillStyle = '#0a2e16';
  ctx.fillRect(0, 0, 1536, 384);

  // 2. Beveled Gold / Wood Borders
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 14;
  ctx.strokeRect(7, 7, 1522, 370);

  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 4;
  ctx.strokeRect(22, 22, 1492, 340);

  // Corner Gold Rivet Studs
  const drawCornerStud = (x: number, y: number) => {
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(x, y, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
  };
  drawCornerStud(34, 34);
  drawCornerStud(1502, 34);
  drawCornerStud(34, 350);
  drawCornerStud(1502, 350);

  // 3. Left Red Team Rosette Badge (赤組)
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

  // 4. Right White Team Rosette Badge (白組)
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(1386, 192, 68, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 6;
  ctx.stroke();

  ctx.fillStyle = '#0f172a';
  ctx.font = '900 48px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('白組', 1386, 192);

  // 5. Central Headers
  // Top subtitle
  ctx.fillStyle = '#fbbf24';
  ctx.font = '900 32px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('令和八年度 • ANNUAL SPORTS DAY', 768, 75);

  // Main Banner Title: e.g. "二子玉川小 運動会" or "豊ヶ丘小 運動会"
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 92px "UD Digi Kyokasho NP-R", "BIZ UDPGothic", "Zen Maru Gothic", sans-serif';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 4;
  ctx.fillText(`${schoolName} 運動会`, 768, 185);

  // Reset shadow
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  // Bottom Subtext: "綱引きの部 • TUG OF WAR BATTLE"
  ctx.fillStyle = '#cbd5e1';
  ctx.font = '800 34px sans-serif';
  ctx.fillText('綱引きの部 • TUG OF WAR BATTLE', 768, 290);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

// Puller actor interface
interface PullerActor {
  root: THREE.Group;
  charGroup: THREE.Group; // Group containing Torso, Head, Foot_L, Foot_R that pitches backward as a unified athlete
  head: THREE.Object3D | null;
  torso: THREE.Object3D | null;
  footL: THREE.Object3D | null;
  footR: THREE.Object3D | null;
  handLead: THREE.Object3D | null; // Lead hand (reaches forward along rope)
  handRear: THREE.Object3D | null; // Rear hand (reaches slightly back along rope)
  shadow: THREE.Mesh;
  team: 'red' | 'white';
  index: number;
  baseX: number;
  baseZ: number;
  faceDirection: number; // +1 for Red (faces +X), -1 for White (faces -X)
}

export const TugOfWar3DStage: React.FC<TugOfWar3DStageProps> = ({
  displacement,
  matchEnded,
  winner,
  redPullRate = 0,
  whitePullRate = 0,
  redPlayersCount = 0,
  whitePlayersCount = 0,
  schoolName = '二子玉川小'
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);

  // References for live animation loop
  const stateRef = useRef({
    displacement,
    matchEnded,
    winner,
    redPullRate,
    whitePullRate,
    redPlayersCount,
    whitePlayersCount,
    schoolName
  });

  useEffect(() => {
    stateRef.current = {
      displacement,
      matchEnded,
      winner,
      redPullRate,
      whitePullRate,
      redPlayersCount,
      whitePlayersCount,
      schoolName
    };
  }, [displacement, matchEnded, winner, redPullRate, whitePullRate, redPlayersCount, whitePlayersCount, schoolName]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let width = container.clientWidth || 1024;
    let height = container.clientHeight || 600;

    // 1. Scene & Camera Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb); // Daytime blue sky fallback

    // Procedural Facial Rig & Emotion VFX Manager (from Argon Tennis)
    const emotionFX = new MiiEmotionFX(scene);

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 400);
    // Elevated 3/4 broadcast sideline view
    camera.position.set(0, 4.8, 12.0);
    camera.lookAt(0, 1.15, 0);

    // 2. Renderer & GPU Profiler (Zero shadow pass on iPads & Dynabook laptops)
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
      precision: 'highp'
    });
    const gpu = detectClassroomGpuProfile(renderer.getContext());
    const isTabletOrMobile = gpu.isMobileOrTablet;

    renderer.setPixelRatio(gpu.targetPixelRatio);
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = gpu.enableDynamicShadows;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);

    // 3. Lighting (Hemisphere + Sun with calibrated shadow bias)
    const hemiLight = new THREE.HemisphereLight(0xa6dcff, 0x55a224, 1.25);
    hemiLight.position.set(0, 40, 0);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfff7ec, 2.55);
    sunLight.position.set(14.5, 25, 15);
    sunLight.castShadow = gpu.enableDynamicShadows;
    if (gpu.enableDynamicShadows) {
      sunLight.shadow.mapSize.width = gpu.shadowMapRes;
      sunLight.shadow.mapSize.height = gpu.shadowMapRes;
      sunLight.shadow.camera.near = 2;
      sunLight.shadow.camera.far = 75;
      const shadowOrtho = 22;
      sunLight.shadow.camera.left = -shadowOrtho;
      sunLight.shadow.camera.right = shadowOrtho;
      sunLight.shadow.camera.top = shadowOrtho;
      sunLight.shadow.camera.bottom = -shadowOrtho;
      sunLight.shadow.bias = -0.0004;
    }
    scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight(0xcbe4ff, 0.72);
    fillLight.position.set(-15, 16, -12);
    scene.add(fillLight);

    // 4. Environment & Sky Textures (Dome, Clouds, Horizon)
    const texLoader = new THREE.TextureLoader();

    // Sky Dome
    const skyGeo = new THREE.SphereGeometry(185, 36, 20);
    const skyMat = new THREE.MeshBasicMaterial({ side: THREE.BackSide, depthWrite: false, fog: false });
    const skyDome = new THREE.Mesh(skyGeo, skyMat);
    scene.add(skyDome);
    texLoader.load('/assets/textures/court/tns_sky_a.png', (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.repeat.set(8, 1);
      skyMat.map = tex;
      skyMat.needsUpdate = true;
    });

    // Cloud Rings
    const createCloudRing = (radius: number, height: number, y: number, url: string, renderOrder: number) => {
      const geo = new THREE.CylinderGeometry(radius, radius, height, 48, 1, true);
      const mat = new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0.92,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = y;
      mesh.renderOrder = renderOrder;
      mesh.visible = false;
      scene.add(mesh);
      texLoader.load(url, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        tex.repeat.set(8, 1);
        mat.map = tex;
        mat.needsUpdate = true;
        mesh.visible = true;
      });
      return mesh;
    };
    const cloudRing2 = createCloudRing(152, 54, 24, '/assets/textures/court/cloud02.png', -2);
    const cloudRing1 = createCloudRing(138, 46, 19, '/assets/textures/court/cloud01.png', -1);

    // Horizon Ring (lush mountain & tree backdrop)
    const horizonGeo = new THREE.CylinderGeometry(96, 96, 15.5, 64, 1, true);
    const horizonMat = new THREE.MeshBasicMaterial({
      transparent: true,
      alphaTest: 0.15,
      side: THREE.BackSide,
      depthWrite: false
    });
    const horizonRing = new THREE.Mesh(horizonGeo, horizonMat);
    horizonRing.position.y = 7.2;
    horizonRing.visible = false;
    scene.add(horizonRing);
    texLoader.load('/assets/textures/court/tns_BG_c1.png', (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.repeat.set(8, 1);
      horizonMat.map = tex;
      horizonMat.needsUpdate = true;
      horizonRing.visible = true;
    });

    // 5. Undokai Field Markings & Boundary Flags on Turf
    const fieldMarkingsGroup = new THREE.Group();
    scene.add(fieldMarkingsGroup);

    // Center 0m Chalk Line across Z (-6 to +6)
    const centerChalkGeo = new THREE.PlaneGeometry(0.12, 12);
    centerChalkGeo.rotateX(-Math.PI / 2);
    const chalkMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.85,
      depthWrite: false
    });
    const centerChalk = new THREE.Mesh(centerChalkGeo, chalkMat);
    centerChalk.position.set(0, 0.012, 0);
    fieldMarkingsGroup.add(centerChalk);

    // Center 0m Chalk Circle
    const circleChalkGeo = new THREE.RingGeometry(0.85, 0.95, 36);
    circleChalkGeo.rotateX(-Math.PI / 2);
    const circleChalk = new THREE.Mesh(circleChalkGeo, chalkMat);
    circleChalk.position.set(0, 0.012, 0);
    fieldMarkingsGroup.add(circleChalk);

    // Win Limit Boundary Lines (at -3.5m Red Win, +3.5m White Win)
    const createWinLine = (x: number, color: number) => {
      const lineGeo = new THREE.PlaneGeometry(0.18, 10);
      lineGeo.rotateX(-Math.PI / 2);
      const lineMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.9,
        depthWrite: false
      });
      const lineMesh = new THREE.Mesh(lineGeo, lineMat);
      lineMesh.position.set(x, 0.013, 0);
      fieldMarkingsGroup.add(lineMesh);

      // Boundary Flag Pole & Pennant
      const poleGeo = new THREE.CylinderGeometry(0.025, 0.025, 2.2, 12);
      const poleMat = new THREE.MeshStandardMaterial({ color: 0xcd853f, roughness: 0.7 });
      const poleMesh = new THREE.Mesh(poleGeo, poleMat);
      poleMesh.position.set(x, 1.1, -4.8);
      poleMesh.castShadow = true;
      fieldMarkingsGroup.add(poleMesh);

      // Flag pennant
      const flagShape = new THREE.Shape();
      flagShape.moveTo(0, 0);
      flagShape.lineTo(x < 0 ? -0.55 : 0.55, 0.22);
      flagShape.lineTo(0, 0.44);
      flagShape.closePath();
      const flagGeo = new THREE.ShapeGeometry(flagShape);
      const flagMat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
      const flagMesh = new THREE.Mesh(flagGeo, flagMat);
      flagMesh.position.set(x, 1.85, -4.8);
      fieldMarkingsGroup.add(flagMesh);
    };
    createWinLine(-3.5, 0xe11d48); // Red Goal Flag
    createWinLine(3.5, 0xffffff);  // White Goal Flag

    // 6. Dynamic 3D Rope & Center Ribbon
    // Chunky 5.2cm Japanese Undokai Hemp Rope
    const ropeSegments = 64;
    const ropeCurvePoints: THREE.Vector3[] = [];
    for (let i = 0; i <= 14; i++) {
      ropeCurvePoints.push(new THREE.Vector3(0, 0.85, 0));
    }
    const initialCurve = new THREE.CatmullRomCurve3(ropeCurvePoints);
    const ropeGeo = new THREE.TubeGeometry(initialCurve, ropeSegments, 0.052, 10, false);
    const ropeMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.88,
      metalness: 0.04
    });
    const ropeMesh = new THREE.Mesh(ropeGeo, ropeMat);
    ropeMesh.castShadow = true;
    ropeMesh.receiveShadow = true;
    scene.add(ropeMesh);

    // Center Ribbon Marker (Undokai Japanese Red-and-White Flag / Streamer)
    const ribbonGroup = new THREE.Group();
    scene.add(ribbonGroup);

    // Red streamer ribbon
    const redRibbonGeo = new THREE.PlaneGeometry(0.14, 0.58);
    const redRibbonMat = new THREE.MeshStandardMaterial({
      color: 0xe11d48,
      roughness: 0.4,
      side: THREE.DoubleSide
    });
    const redRibbonMesh = new THREE.Mesh(redRibbonGeo, redRibbonMat);
    redRibbonMesh.position.set(-0.07, -0.29, 0);
    ribbonGroup.add(redRibbonMesh);

    // White streamer ribbon
    const whiteRibbonGeo = new THREE.PlaneGeometry(0.14, 0.58);
    const whiteRibbonMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.4,
      side: THREE.DoubleSide
    });
    const whiteRibbonMesh = new THREE.Mesh(whiteRibbonGeo, whiteRibbonMat);
    whiteRibbonMesh.position.set(0.07, -0.29, 0);
    ribbonGroup.add(whiteRibbonMesh);

    // Golden cinch knot ring
    const cinchGeo = new THREE.TorusGeometry(0.065, 0.024, 12, 24);
    const cinchMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.8, roughness: 0.2 });
    const cinchMesh = new THREE.Mesh(cinchGeo, cinchMat);
    ribbonGroup.add(cinchMesh);

    // World group to hold hands firmly on the rope
    const handsWorldGroup = new THREE.Group();
    scene.add(handsWorldGroup);

    // 7. GLTF Assets Loading (Stadium Court, Bleachers Crowd, Mii Pullers)
    const gltfLoader = new GLTFLoader();
    let crowdScene: THREE.Group | null = null;
    const pullerActors: PullerActor[] = [];

    // Contact shadow texture
    const shadowTex = createDoubleRingShadowTexture();
    const shadowGeo = new THREE.PlaneGeometry(1.2, 1.2);
    shadowGeo.rotateX(-Math.PI / 2);

    const skinTones = [0xffeed9, 0xffdfc4, 0xf5cba7, 0xfff4e8];
    const hairColors = [0x2a1708, 0x111625, 0x3e2210, 0x5c3d1e];

    Promise.all([
      gltfLoader.loadAsync('/assets/models/stadium_court.glb'),
      gltfLoader.loadAsync('/assets/models/mii_crowd.glb'),
      gltfLoader.loadAsync('/assets/models/mii_player.glb')
    ]).then(([stadiumGltf, crowdGltf, miiGltf]) => {
      // A. Prepare Stadium Court & Completely Hide the "Argon Tennis" Banner
      const stadium = stadiumGltf.scene;
      const maxAniso = renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 8;

      stadium.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh;
          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          materials.forEach((m) => {
            if (!m) return;
            const mat = m as any;
            if (mat.map) {
              mat.map.anisotropy = maxAniso;
              mat.map.wrapS = THREE.RepeatWrapping;
              mat.map.wrapT = THREE.RepeatWrapping;
              mat.map.needsUpdate = true;
            }
            if (/LogoArgonBanner/i.test(mat.name || mesh.name)) {
              // Completely hide the tennis banner so the pristine green stadium wall is revealed
              mat.transparent = true;
              mat.opacity = 0;
              mat.visible = false;
              mat.needsUpdate = true;
            } else if (/TreeSprite/i.test(mat.name || mesh.name)) {
              mat.alphaTest = 0.35;
              mat.transparent = true;
              mat.side = THREE.DoubleSide;
              mat.depthWrite = true;
            } else if (/Shadow/i.test(mat.name || mesh.name)) {
              mat.transparent = true;
              mat.depthWrite = false;
              mat.polygonOffset = true;
              mat.polygonOffsetFactor = -2;
              mat.polygonOffsetUnits = -2;
            }
          });

          if (/Shadow/i.test(mesh.name)) {
            mesh.castShadow = false;
            mesh.receiveShadow = false;
            mesh.renderOrder = 1;
          } else if (/Tree/i.test(mesh.name)) {
            mesh.castShadow = true;
            mesh.receiveShadow = true;
          } else {
            mesh.receiveShadow = true;
            if (/Wall|Bleacher|Canopy|Pillar|Umpire|Bench|Clubhouse|StadiumCourt/i.test(mesh.name)) {
              mesh.castShadow = true;
            }
          }
        }
      });
      scene.add(stadium);

      // Mount authentic Japanese Undokai Stadium Wall Banner with dynamic school name
      const bannerTex = createSchoolBannerTexture(stateRef.current.schoolName);
      if (bannerTex) {
        const bannerGeo = new THREE.PlaneGeometry(4.8, 1.22);
        const bannerMat = new THREE.MeshBasicMaterial({
          map: bannerTex,
          side: THREE.FrontSide,
          transparent: true
        });
        const bannerMesh = new THREE.Mesh(bannerGeo, bannerMat);
        bannerMesh.position.set(0, 1.25, -0.46);
        scene.add(bannerMesh);
      }

      // B. Prepare Cheering Crowd Bleachers
      const crowd = crowdGltf.scene;
      crowd.position.set(0, 0, 0);
      crowd.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          obj.castShadow = false;
          obj.receiveShadow = true;
        }
      });
      crowdScene = crowd;
      scene.add(crowd);

      // C. Build 4 Red Pullers (🔴 赤組) and 4 White Pullers (⚪ 白組)
      const baseMii = miiGltf.scene;

      const buildPuller = (team: 'red' | 'white', index: number): PullerActor => {
        const root = new THREE.Group();

        // charGroup: Euler order YXZ.
        // Y-axis faces towards the opponent (+X for Red, -X for White), angled 14° towards the front TV so faces are clear.
        // X-axis performs TRUE BACKWARD LEAN from the heels along the spine!
        // Feet (Foot_L, Foot_R), Torso, and Head are all inside charGroup so they are 100% attached at all times!
        const charGroup = new THREE.Group();
        charGroup.rotation.order = 'YXZ';
        root.add(charGroup);

        const clone = baseMii.clone(true);

        let headMesh: THREE.Object3D | null = null;
        let torsoMesh: THREE.Object3D | null = null;
        let handLeadMesh: THREE.Object3D | null = null;
        let handRearMesh: THREE.Object3D | null = null;
        let footLMesh: THREE.Object3D | null = null;
        let footRMesh: THREE.Object3D | null = null;

        // Extract nodes from clone
        clone.children.slice().forEach((child) => {
          const name = (child.name || '').toLowerCase();
          if (name.includes('torso')) {
            torsoMesh = child;
            child.position.set(0, 0.55, 0);
            charGroup.add(child);
          } else if (name.includes('head')) {
            headMesh = child;
            child.position.set(0, 1.22, 0);
            charGroup.add(child);
          } else if (name.includes('hand_l')) {
            // Left hand (lead hand for Red, rear hand for White)
            handLeadMesh = child;
            handsWorldGroup.add(child);
          } else if (name.includes('hand_r')) {
            // Right hand (rear hand for Red, lead hand for White)
            handRearMesh = child;
            handsWorldGroup.add(child);
          } else if (name.includes('foot_l')) {
            // Foot_L stays firmly connected to bottom of shorts in charGroup
            footLMesh = child;
            child.position.set(-0.105, 0.13, 0.01);
            charGroup.add(child);
          } else if (name.includes('foot_r')) {
            // Foot_R stays firmly connected to bottom of shorts in charGroup
            footRMesh = child;
            child.position.set(0.105, 0.13, 0.01);
            charGroup.add(child);
          } else {
            charGroup.add(child);
          }
        });

        // Customize Mii Materials & Inject Wii Satin Rim Shaders
        root.traverse((obj) => {
          if ((obj as THREE.Mesh).isMesh) {
            const mesh = obj as THREE.Mesh;
            mesh.castShadow = true;
            mesh.receiveShadow = true;

            // Clone materials so each puller has independent colors
            if (Array.isArray(mesh.material)) {
              mesh.material = mesh.material.map((m) => m.clone());
            } else if (mesh.material) {
              mesh.material = mesh.material.clone();
            }

            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            mats.forEach((mat) => {
              const name = mat.name || '';
              if (/Player_Shirt/i.test(name)) {
                // Team color
                (mat as THREE.MeshStandardMaterial).color.set(team === 'red' ? 0xe11d48 : 0xf8fafc);
                (mat as THREE.MeshStandardMaterial).roughness = 0.42;
                (mat as THREE.MeshStandardMaterial).metalness = 0.04;
                injectWiiSatinRimShader(mat, 0.28, 0.11);
              } else if (/Player_VisorTrim/i.test(name)) {
                // Sports day headband (ハチマキ)
                (mat as THREE.MeshStandardMaterial).color.set(team === 'red' ? 0xdc2626 : 0xffffff);
                (mat as THREE.MeshStandardMaterial).roughness = 0.32;
                injectWiiSatinRimShader(mat, 0.28, 0.1);
              } else if (/Player_Shorts/i.test(name)) {
                // Elementary PE navy gym shorts (半ズボン)
                (mat as THREE.MeshStandardMaterial).color.set(0x0f172a);
                (mat as THREE.MeshStandardMaterial).roughness = 0.42;
                injectWiiSatinRimShader(mat, 0.28, 0.11);
              } else if (/Player_Skin/i.test(name)) {
                // Diverse natural skin tone
                (mat as THREE.MeshStandardMaterial).color.set(skinTones[index % skinTones.length]);
                (mat as THREE.MeshStandardMaterial).roughness = 0.36;
                (mat as THREE.MeshStandardMaterial).metalness = 0.02;
                injectWiiSatinRimShader(mat, 0.34, 0.28);
              } else if (/Player_Hair/i.test(name)) {
                // Diverse hair color
                (mat as THREE.MeshStandardMaterial).color.set(hairColors[index % hairColors.length]);
                (mat as THREE.MeshStandardMaterial).roughness = 0.38;
                injectWiiSatinRimShader(mat, 0.28, 0.09);
              } else {
                injectWiiSatinRimShader(mat, 0.26, 0.1);
              }
            });
          }
        });

        // Contact Shadow Blob
        const shadowMat = new THREE.MeshBasicMaterial({
          map: shadowTex,
          transparent: true,
          opacity: 0.82,
          depthWrite: false
        });
        const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
        shadowMesh.position.y = 0.015;
        shadowMesh.renderOrder = 2;
        scene.add(shadowMesh);

        // Positioning:
        // All pullers stand just behind the rope (Z = -0.30)
        // Red team on left (-X), White team on right (+X)
        const faceDir = team === 'red' ? 1 : -1;
        const baseX = team === 'red' ? -1.6 - index * 1.35 : 1.6 + index * 1.35;
        const baseZ = -0.30;

        root.position.set(baseX, 0, baseZ);

        scene.add(root);

        if (headMesh) {
          emotionFX.attachFaceRig(`${team}_${index}`, headMesh, hairColors[index % hairColors.length]);
        }

        return {
          root,
          charGroup,
          head: headMesh,
          torso: torsoMesh,
          footL: footLMesh,
          footR: footRMesh,
          handLead: handLeadMesh,
          handRear: handRearMesh,
          shadow: shadowMesh,
          team,
          index,
          baseX,
          baseZ,
          faceDirection: faceDir
        };
      };

      // Create 4 Red Pullers & 4 White Pullers
      for (let i = 0; i < 4; i++) {
        pullerActors.push(buildPuller('red', i));
      }
      for (let i = 0; i < 4; i++) {
        pullerActors.push(buildPuller('white', i));
      }

      setLoaded(true);
    });

    // 8. Animation & Render Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();
    let cheerEnergy = 0.25;
    let prevLead: 'red' | 'white' | 'even' = 'even';
    let prevDisp = 0;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.08);
      const elapsedTime = clock.getElapsedTime();

      const { displacement: disp, matchEnded: ended, winner: win, redPullRate: rRate = 0, whitePullRate: wRate = 0 } = stateRef.current;

      const dispDelta = disp - prevDisp;
      const dispVelocity = delta > 0 ? dispDelta / delta : 0;
      prevDisp = disp;

      // Update Procedural Facial Emotion FX & Particle Reactions
      if (ended) {
        const winningTeam = win === 'team_red' ? 'red' : win === 'team_white' ? 'white' : null;
        const losingTeam = winningTeam === 'red' ? 'white' : winningTeam === 'white' ? 'red' : null;
        if (winningTeam) {
          emotionFX.setTeamExpression(winningTeam, 'happy_grin', 1.0);
          // Occasional celebratory emote burst (stars and music notes)
          if (Math.random() < delta * 2.5) {
            const winPullers = pullerActors.filter((a) => a.team === winningTeam);
            const randomWinner = winPullers[Math.floor(Math.random() * winPullers.length)];
            if (randomWinner) emotionFX.triggerEmoteBurst(randomWinner.root.position, 3);
          }
        }
        if (losingTeam) {
          emotionFX.setTeamExpression(losingTeam, 'shocked_loss', 1.0);
        }
      } else {
        // Active pull exertion & strain shouts
        if (rRate > 1.8) {
          emotionFX.setTeamExpression('red', 'effort_shout', 0.4);
        }
        if (wRate > 1.8) {
          emotionFX.setTeamExpression('white', 'effort_shout', 0.4);
        }

        // Losing ground triggers wide-eyed panic and 3D sweat drop bursts
        if (dispVelocity > 3.0) {
          // Moving towards White (+X), Red is losing ground!
          emotionFX.setTeamExpression('red', 'wide_eyed_panic', 0.5);
          if (Math.random() < delta * 3.5) {
            pullerActors.filter((a) => a.team === 'red').forEach((a) => {
              emotionFX.spawnSweatDrops(a.root.position, 1);
            });
          }
        } else if (dispVelocity < -3.0) {
          // Moving towards Red (-X), White is losing ground!
          emotionFX.setTeamExpression('white', 'wide_eyed_panic', 0.5);
          if (Math.random() < delta * 3.5) {
            pullerActors.filter((a) => a.team === 'white').forEach((a) => {
              emotionFX.spawnSweatDrops(a.root.position, 1);
            });
          }
        }
      }

      // Displacement scaling: -100 to +100 translates to -3.5m to +3.5m along X
      const ribbonX = (disp / 100) * 3.5;

      // Detect lead changes to trigger crowd cheer spikes
      const currentLead = disp < -8 ? 'red' : disp > 8 ? 'white' : 'even';
      if (currentLead !== prevLead) {
        if (currentLead !== 'even') {
          cheerEnergy = 1.0;
        }
        prevLead = currentLead;
      }
      cheerEnergy = Math.max(0.2, cheerEnergy - delta * 0.35);

      // Rotate Clouds gently
      cloudRing1.rotation.y += delta * 0.003;
      cloudRing2.rotation.y += delta * 0.0018;

      // Animate Cheering Bleachers Crowd
      if (crowdScene) {
        const crowdFreq = 5.5 + cheerEnergy * 5.0;
        const crowdAmp = 0.02 + cheerEnergy * 0.06;
        crowdScene.position.y = Math.abs(Math.sin(elapsedTime * crowdFreq)) * crowdAmp;
      }

      // Dynamic Rope CatmullRom Curve through all Pullers & Ribbon
      const rAnchorX = -1.6 - 3 * 1.35 + ribbonX * 0.35;
      const wAnchorX = 1.6 + 3 * 1.35 + ribbonX * 0.35;

      // Rope control points at Y = 0.85, Z = 0:
      ropeCurvePoints[0].set(rAnchorX - 1.2, 0.05, 0.1);
      ropeCurvePoints[1].set(rAnchorX - 0.5, 0.45, 0);

      // Red Pullers hand positions on rope
      for (let i = 3; i >= 0; i--) {
        const actor = pullerActors[i];
        const px = actor ? actor.root.position.x : -1.6 - i * 1.35 + ribbonX * 0.35;
        ropeCurvePoints[2 + (3 - i)].set(px, 0.85, 0);
      }

      // Center Ribbon
      const tensionShudder = ended ? 0 : Math.sin(elapsedTime * 35) * 0.004;
      ropeCurvePoints[6].set(ribbonX * 0.5, 0.85 + tensionShudder, 0);
      ropeCurvePoints[7].set(ribbonX, 0.85 + tensionShudder, 0);
      ropeCurvePoints[8].set(ribbonX * 0.5 + 0.8, 0.85 + tensionShudder, 0);

      // White Pullers hand positions on rope
      for (let i = 0; i < 4; i++) {
        const actor = pullerActors[4 + i];
        const px = actor ? actor.root.position.x : 1.6 + i * 1.35 + ribbonX * 0.35;
        ropeCurvePoints[9 + i].set(px, 0.85, 0);
      }

      ropeCurvePoints[13].set(wAnchorX + 0.5, 0.45, 0);
      ropeCurvePoints[14].set(wAnchorX + 1.2, 0.05, -0.1);

      // Rebuild rope tube geometry smoothly
      const dynamicRopeCurve = new THREE.CatmullRomCurve3(ropeCurvePoints);
      ropeMesh.geometry.dispose();
      ropeMesh.geometry = new THREE.TubeGeometry(dynamicRopeCurve, ropeSegments, 0.052, 10, false);

      // Center Ribbon Marker flutter & position
      ribbonGroup.position.set(ribbonX, 0.85 + tensionShudder, 0);
      const flutterAngle = Math.sin(elapsedTime * 8) * 0.12 + (disp / 100) * 0.25;
      ribbonGroup.rotation.z = flutterAngle;

      // Animate Mii Pullers
      // Japanese Undokai Stance: True Backward Lean, Attached Feet with Dug-In Heels, and Firm Hands Clamping the Rope
      const redCadence = 3.8 + Math.min(3.0, (rRate / 60) * 1.8);
      const whiteCadence = 3.8 + Math.min(3.0, (wRate / 60) * 1.8);

      pullerActors.forEach((actor) => {
        const isRed = actor.team === 'red';
        const cadence = isRed ? redCadence : whiteCadence;
        const phaseOffset = isRed ? 0 : 0.45;
        const heaveCycle = Math.sin(elapsedTime * cadence + phaseOffset + actor.index * 0.15);

        // Base X follows the rope displacement
        const shiftX = ribbonX * 0.35;
        actor.root.position.x = actor.baseX + shiftX;
        actor.root.position.z = actor.baseZ;

        // Shadow follows player center of gravity
        actor.shadow.position.x = actor.root.position.x - 0.28 * actor.faceDirection;
        actor.shadow.position.z = actor.root.position.z;

        if (ended) {
          // VICTORY / DEFEAT DYNAMICS
          const isWinner = (win === 'team_red' && isRed) || (win === 'team_white' && !isRed);
          if (isWinner) {
            // Winning team celebrates! Stands upright, throws hands in the air, jumps with joy!
            actor.charGroup.rotation.x = 0;
            actor.charGroup.rotation.y = (Math.PI * 0.5 - 0.18) * actor.faceDirection;
            actor.charGroup.position.set(0, 0, 0);

            const jumpY = Math.abs(Math.sin(elapsedTime * 8 + actor.index * 0.8)) * 0.28;
            actor.root.position.y = jumpY;

            // Both hands held high in victory waving to the stadium crowd!
            if (actor.handLead) {
              actor.handLead.position.set(actor.root.position.x + 0.22 * actor.faceDirection, 1.48 + jumpY * 0.15, actor.baseZ + 0.1);
              actor.handLead.rotation.set(-0.2, 0, -0.3 * actor.faceDirection);
            }
            if (actor.handRear) {
              actor.handRear.position.set(actor.root.position.x - 0.22 * actor.faceDirection, 1.48 + jumpY * 0.15, actor.baseZ + 0.1);
              actor.handRear.rotation.set(-0.2, 0, 0.3 * actor.faceDirection);
            }
            if (actor.head) actor.head.rotation.x = -0.25;
          } else {
            // Losing team slumps forward in comical good-humored defeat
            actor.root.position.y = 0;
            actor.charGroup.rotation.x = 0.22; // Slump forward towards center
            actor.charGroup.rotation.y = (Math.PI * 0.5 - 0.18) * actor.faceDirection;
            actor.charGroup.position.set(0.12 * actor.faceDirection, 0, 0);

            // Hands drop down in exhaustion
            if (actor.handLead) {
              actor.handLead.position.set(actor.root.position.x + 0.12 * actor.faceDirection, 0.52, actor.baseZ + 0.15);
              actor.handLead.rotation.set(0.4, 0, 0);
            }
            if (actor.handRear) {
              actor.handRear.position.set(actor.root.position.x - 0.12 * actor.faceDirection, 0.52, actor.baseZ + 0.15);
              actor.handRear.rotation.set(0.4, 0, 0);
            }
            if (actor.head) actor.head.rotation.x = 0.38;
          }
        } else {
          // ACTIVE TUG OF WAR STRAIN
          actor.root.position.y = 0;

          // 1. TRUE BACKWARD LEAN FROM THE HEELS (36° to 45° Lean)
          // Facing: faces opponent (+X for Red, -X for White), angled 14° towards the front TV
          actor.charGroup.rotation.y = (Math.PI * 0.5 - 0.18) * actor.faceDirection;

          // Pitch backward along spine:
          // Negative rotation around local X leans the chest and head BACKWARDS away from the opponent!
          const baseLean = 0.65; // ~37.2°
          const heaveExtra = Math.max(0, heaveCycle) * 0.14; // up to ~45.2° during heave peak!
          actor.charGroup.rotation.x = -(baseLean + heaveExtra);
          actor.charGroup.rotation.z = 0; // Pure spine pitch, ZERO sideways tilt!

          // Heave surge: pull body backward by up to 0.10m
          const pullSurge = -Math.max(0, heaveCycle) * 0.09 * actor.faceDirection;
          actor.charGroup.position.set(pullSurge, 0, 0);

          // Head throws back in exertion
          if (actor.head) {
            actor.head.rotation.x = -0.16 - Math.max(0, heaveCycle) * 0.22;
          }

          // 2. ATTACHED FEET WITH HEELS DUG IN
          // Foot_L and Foot_R are children of charGroup directly under the pants, so they NEVER detach!
          // When charGroup pitches backward from the ground, the heels dig into the turf and soles angle upward naturally.

          // 3. HANDS FIRMLY REACHING FORWARD AND CLAMPING THE ROPE AT Y = 0.85m, Z = 0m
          const handBaseX = actor.root.position.x + pullSurge;
          const ropeY = 0.85;
          const ropeZ = 0;

          // Lead Hand: reaches forward along rope, wrist pointing back towards chest
          if (actor.handLead) {
            actor.handLead.position.set(handBaseX + 0.14 * actor.faceDirection, ropeY, ropeZ);
            actor.handLead.rotation.order = 'YXZ';
            actor.handLead.rotation.x = -Math.PI * 0.38;
            actor.handLead.rotation.y = (Math.PI * 0.5) * actor.faceDirection;
            actor.handLead.rotation.z = -0.2 * actor.faceDirection;
          }

          // Rear Hand: reaches slightly back along rope, fingers wrapping firmly around the rope
          if (actor.handRear) {
            actor.handRear.position.set(handBaseX - 0.14 * actor.faceDirection, ropeY, ropeZ);
            actor.handRear.rotation.order = 'YXZ';
            actor.handRear.rotation.x = -Math.PI * 0.38;
            actor.handRear.rotation.y = (Math.PI * 0.5) * actor.faceDirection;
            actor.handRear.rotation.z = 0.2 * actor.faceDirection;
          }
        }
      });

      // 9. Elevated 3/4 Diagonal Broadcast Camera Movement
      // Camera smoothly tracks the center ribbon and zooms in slightly on drama
      const targetCamX = ribbonX * 0.38;
      camera.position.x += (targetCamX - camera.position.x) * delta * 2.8;
      const targetLookX = ribbonX * 0.45;
      camera.lookAt(targetLookX, 1.15, 0);

      // Update Procedural Emotion Face Rigs, Sweat Drops & Emote Particles
      emotionFX.update(delta);

      renderer.render(scene, camera);
    };

    animationFrameId = requestAnimationFrame(animate);

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 1024;
      const h = container.clientHeight || 600;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // Cleanup on unmount
    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      emotionFX.dispose();
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      renderer.dispose();
      scene.clear();
    };
  }, []);

  return (
    <div className="relative w-full h-full min-h-[400px] overflow-hidden select-none bg-slate-950">
      <div ref={mountRef} className="w-full h-full" />

      {/* Sleek Loading Overlay while 3D Stadium & Mii Meshes buffer */}
      {!loaded && (
        <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center gap-3 z-20">
          <div className="w-12 h-12 rounded-full border-4 border-amber-400 border-t-transparent animate-spin" />
          <span className="text-sm font-black text-amber-400 tracking-wider">
            綱引きスタジアム 準備中... (Loading 3D Arena)
          </span>
        </div>
      )}
    </div>
  );
};
