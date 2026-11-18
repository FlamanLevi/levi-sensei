import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  createClassroomRenderer,
  disposeObject3D,
  getCappedAnisotropy,
  getSharedContactShadowTexture,
} from '@/utils/classroom3d';
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

/**
 * Unified Wii Sports Satin Rim-Lighting + Per-Instance Multi-Channel Tint Material
 * Uses vertex attribute `aTintMask` (x=shirt/headband, y=skin, z=hair, w=fixed vertex color)
 * combined with per-instance `aShirtColor`, `aSkinColor`, `aHairColor` so all 8 puller bodies,
 * 8 heads, and 16 hands share ONE shader program and ONE material across 3 InstancedMeshes.
 */
function createInstancedWiiMiiMaterial(rimStrength = 0.29, topBoost = 0.14): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.4,
    metalness: 0.03,
    side: THREE.DoubleSide,
  });
  (mat as unknown as { customProgramCacheKey: () => string }).customProgramCacheKey = () =>
    `wii_mii_instanced_tint_rim_${rimStrength.toFixed(2)}_${topBoost.toFixed(2)}_v1`;

  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <color_pars_vertex>',
        `#include <color_pars_vertex>
        attribute vec4 aTintMask;
        attribute vec3 aShirtColor;
        attribute vec3 aSkinColor;
        attribute vec3 aHairColor;`
      )
      .replace(
        '#include <color_vertex>',
        `#include <color_vertex>
        #ifdef USE_COLOR
          vColor.rgb = (aTintMask.x * aShirtColor + aTintMask.y * aSkinColor + aTintMask.z * aHairColor + vec3(aTintMask.w)) * color.rgb;
        #endif`
      );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <opaque_fragment>',
      `
      // Nintendo Wii Sports Rim-Lighting + Hemisphere Top-Light Boost
      vec3 wiiViewDir = normalize( vViewPosition );
      vec3 wiiNormal = normalize( vNormal ) * ( float( gl_FrontFacing ) * 2.0 - 1.0 );
      float wiiRim = pow( 1.0 - max( dot( wiiNormal, wiiViewDir ), 0.0 ), 2.6 ) * ${rimStrength.toFixed(3)};
      float wiiHemiTop = clamp( wiiNormal.y * 0.5 + 0.5, 0.0, 1.0 ) * ${topBoost.toFixed(3)};
      vec3 wiiRimTint = vec3( 1.0, 0.985, 0.94 );
      outgoingLight += wiiRimTint * wiiRim + diffuseColor.rgb * wiiHemiTop;
      #include <opaque_fragment>
      `
    );
  };
  mat.needsUpdate = true;
  return mat;
}

const _bakeTmpColor = new THREE.Color();

/**
 * Normalizes a primitive geometry to non-indexed (position, normal, color) for static merging,
 * baking linear RGB vertex colors and immediately disposing the source geometry.
 */
function bakeStaticColoredGeo(
  srcGeo: THREE.BufferGeometry,
  hexColor: number,
  translate?: [number, number, number]
): THREE.BufferGeometry {
  const g = srcGeo.index ? srcGeo.toNonIndexed() : srcGeo.clone();
  srcGeo.dispose();
  if (translate) {
    g.translate(translate[0], translate[1], translate[2]);
  }
  if (!g.attributes.normal) {
    g.computeVertexNormals();
  }
  for (const attrName of Object.keys(g.attributes)) {
    if (attrName !== 'position' && attrName !== 'normal') {
      g.deleteAttribute(attrName);
    }
  }
  g.clearGroups();
  _bakeTmpColor.setHex(hexColor);
  const vCount = g.attributes.position.count;
  const colors = new Float32Array(vCount * 3);
  const r = _bakeTmpColor.r;
  const gr = _bakeTmpColor.g;
  const b = _bakeTmpColor.b;
  for (let i = 0; i < vCount; i++) {
    const o = i * 3;
    colors[o] = r;
    colors[o + 1] = gr;
    colors[o + 2] = b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return g;
}

interface MiiNodeBakeInput {
  node: THREE.Object3D;
  offset: [number, number, number];
  isHead?: boolean;
}

/**
 * Bakes one or more GLTF Mii limb nodes into a single normalized BufferGeometry with
 * (position, normal, color, aTintMask) ready for multi-channel hardware instancing.
 */
function bakeMiiLimbGeometry(inputs: MiiNodeBakeInput[]): THREE.BufferGeometry | null {
  const parts: THREE.BufferGeometry[] = [];
  const invRoot = new THREE.Matrix4();
  const relMat = new THREE.Matrix4();
  const offsetMat = new THREE.Matrix4();
  const headCenterY = 0.1775;

  for (let idx = 0; idx < inputs.length; idx++) {
    const { node, offset, isHead } = inputs[idx];
    node.updateMatrixWorld(true);
    invRoot.copy(node.matrixWorld).invert();
    offsetMat.makeTranslation(offset[0], offset[1], offset[2]);

    node.traverse((obj) => {
      if (!(obj as THREE.Mesh).isMesh) return;
      const mesh = obj as THREE.Mesh;
      if (!mesh.geometry) return;

      const mat = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as
        | THREE.MeshStandardMaterial
        | undefined;
      const matName = mat?.name || '';

      // Exclude static baked eyes/mouth/tongue on Head so MiiEmotionFX curved overlay handles expressions
      if (isHead && /Player_EyeDark|Player_Mouth|Player_Tongue/i.test(matName)) {
        return;
      }

      const g = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
      relMat.copy(invRoot).multiply(mesh.matrixWorld);
      if (offset[0] !== 0 || offset[1] !== 0 || offset[2] !== 0) {
        relMat.premultiply(offsetMat);
      }
      g.applyMatrix4(relMat);

      // Tuck static baked eyebrows and eye whites cleanly inside the skull before merging
      if (isHead && (/Player_Hair/i.test(matName) || /Player_White/i.test(matName))) {
        const pos = g.attributes.position as THREE.BufferAttribute;
        const isHair = /Player_Hair/i.test(matName);
        for (let v = 0; v < pos.count; v++) {
          const vx = pos.getX(v);
          const vy = pos.getY(v);
          const vz = pos.getZ(v);
          if (isHair) {
            if (
              Math.abs(vx) > 0.024 &&
              Math.abs(vx) < 0.156 &&
              vy > headCenterY + 0.018 &&
              vy < headCenterY + 0.092 &&
              vz > 0.172
            ) {
              pos.setXYZ(v, 0, headCenterY, 0);
            }
          } else if (vz > 0.195 && vy < headCenterY + 0.066 && Math.abs(vx) < 0.145) {
            pos.setXYZ(v, 0, headCenterY, 0);
          }
        }
        pos.needsUpdate = true;
      }

      if (!g.attributes.normal) {
        g.computeVertexNormals();
      }
      for (const attrName of Object.keys(g.attributes)) {
        if (attrName !== 'position' && attrName !== 'normal') {
          g.deleteAttribute(attrName);
        }
      }
      g.clearGroups();

      let mx = 0;
      let my = 0;
      let mz = 0;
      let mw = 0;
      let cr = 1;
      let cg = 1;
      let cb = 1;

      if (/Player_Shirt|Player_VisorTrim/i.test(matName)) {
        mx = 1;
      } else if (/Player_Skin/i.test(matName)) {
        my = 1;
      } else if (/Player_Hair/i.test(matName)) {
        mz = 1;
      } else if (/Player_Shorts/i.test(matName)) {
        mw = 1;
        _bakeTmpColor.setHex(0x0f172a);
        cr = _bakeTmpColor.r;
        cg = _bakeTmpColor.g;
        cb = _bakeTmpColor.b;
      } else {
        mw = 1;
        if (mat && mat.color) {
          cr = mat.color.r;
          cg = mat.color.g;
          cb = mat.color.b;
        }
      }

      const vCount = g.attributes.position.count;
      const colors = new Float32Array(vCount * 3);
      const masks = new Float32Array(vCount * 4);
      for (let v = 0; v < vCount; v++) {
        const cOff = v * 3;
        colors[cOff] = cr;
        colors[cOff + 1] = cg;
        colors[cOff + 2] = cb;
        const mOff = v * 4;
        masks[mOff] = mx;
        masks[mOff + 1] = my;
        masks[mOff + 2] = mz;
        masks[mOff + 3] = mw;
      }
      g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      g.setAttribute('aTintMask', new THREE.BufferAttribute(masks, 4));
      parts.push(g);
    });
  }

  if (parts.length === 0) return null;
  const merged = mergeGeometries(parts, false);
  for (let i = 0; i < parts.length; i++) parts[i].dispose();
  return merged;
}

// Authentic Japanese Undokai Stadium Wall Banner Texture (1024x256 POT, crisp offset text shadow)
function createSchoolBannerTexture(schoolName = '二子玉川小'): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.save();
  ctx.scale(1024 / 1536, 256 / 384);

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
  ctx.fillStyle = '#fbbf24';
  ctx.font = '900 32px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('令和八年度 • ANNUAL SPORTS DAY', 768, 75);

  // Main Banner Title with crisp offset drop shadow (zero shadowBlur Gaussian overhead)
  ctx.font = '900 92px "UD Digi Kyokasho NP-R", "BIZ UDPGothic", "Zen Maru Gothic", sans-serif';
  ctx.fillStyle = 'rgba(0, 0, 0, 0.78)';
  ctx.fillText(`${schoolName} 運動会`, 772, 190);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`${schoolName} 運動会`, 768, 185);

  // Bottom Subtext: "綱引きの部 • TUG OF WAR BATTLE"
  ctx.fillStyle = '#cbd5e1';
  ctx.font = '800 34px sans-serif';
  ctx.fillText('綱引きの部 • TUG OF WAR BATTLE', 768, 290);

  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

// Lightweight transform-only Puller Actor (rendered via 4 hardware InstancedMeshes)
interface PullerActor {
  id: string;
  slotIndex: number;
  root: THREE.Group;
  charGroup: THREE.Group; // Rigid body + feet pitching backward along the spine
  head: THREE.Object3D; // Head node attached to charGroup at (0, 1.22, 0)
  handLead: THREE.Object3D; // World-space lead hand clamping the rope
  handRear: THREE.Object3D; // World-space rear hand clamping the rope
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
  const [contextRestartKey, setContextRestartKey] = useState(0);
  const bannerMatRef = useRef<THREE.MeshBasicMaterial | null>(null);

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

  // Reactively refresh the 3D stadium wall banner if activeSchool switches after mount
  useEffect(() => {
    const mat = bannerMatRef.current;
    if (!mat) return;
    const nextTex = createSchoolBannerTexture(schoolName);
    if (!nextTex) return;
    const prevTex = mat.map;
    mat.map = nextTex;
    mat.needsUpdate = true;
    if (prevTex) prevTex.dispose();
  }, [schoolName]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let isDisposed = false;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb); // Daytime blue sky fallback

    // Procedural Facial Rig & Emotion VFX Manager (from Argon Tennis)
    const emotionFX = new MiiEmotionFX(scene);

    // 2. Centralized Classroom Renderer & Camera (GEMINI.md §5 compliant)
    const classroom3d = createClassroomRenderer(container, {
      fov: 38,
      near: 0.1,
      far: 400,
      cameraPosition: [0, 4.8, 12.0],
      cameraLookAt: [0, 1.15, 0],
      alpha: false,
      toneMappingExposure: 1.15,
      onContextLost: () => {
        console.warn('[TugOfWar3DStage] WebGL context lost; waiting for restoration.');
      },
      onContextRestored: () => {
        setContextRestartKey((k) => k + 1);
      },
    });
    const { renderer, camera, gpuProfile: gpu, trackFrameRate, cleanup: cleanupRenderer } = classroom3d;

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
      if (isDisposed) {
        tex.dispose();
        return;
      }
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
        if (isDisposed) {
          tex.dispose();
          return;
        }
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
      if (isDisposed) {
        tex.dispose();
        return;
      }
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.repeat.set(8, 1);
      horizonMat.map = tex;
      horizonMat.needsUpdate = true;
      horizonRing.visible = true;
    });

    // 5. Merged Undokai Field Markings & Boundary Flags on Turf (12 -> 4 draw calls w/ rope & ribbon)
    const fieldMarkingsGroup = new THREE.Group();
    scene.add(fieldMarkingsGroup);

    // 5a. Chalk Lines + Red/White Win Lines -> 1 vertex-colored Mesh
    const centerChalkRaw = new THREE.PlaneGeometry(0.12, 12);
    centerChalkRaw.rotateX(-Math.PI / 2);
    const circleChalkRaw = new THREE.RingGeometry(0.85, 0.95, 36);
    circleChalkRaw.rotateX(-Math.PI / 2);
    const redWinRaw = new THREE.PlaneGeometry(0.18, 10);
    redWinRaw.rotateX(-Math.PI / 2);
    const whiteWinRaw = new THREE.PlaneGeometry(0.18, 10);
    whiteWinRaw.rotateX(-Math.PI / 2);

    const chalkParts = [
      bakeStaticColoredGeo(centerChalkRaw, 0xffffff, [0, 0.012, 0]),
      bakeStaticColoredGeo(circleChalkRaw, 0xffffff, [0, 0.012, 0]),
      bakeStaticColoredGeo(redWinRaw, 0xe11d48, [-3.5, 0.013, 0]),
      bakeStaticColoredGeo(whiteWinRaw, 0xffffff, [3.5, 0.013, 0]),
    ];
    const mergedChalkGeo = mergeGeometries(chalkParts, false);
    for (let i = 0; i < chalkParts.length; i++) chalkParts[i].dispose();
    if (mergedChalkGeo) {
      const chalkMesh = new THREE.Mesh(
        mergedChalkGeo,
        new THREE.MeshBasicMaterial({
          vertexColors: true,
          transparent: true,
          opacity: 0.88,
          depthWrite: false,
        })
      );
      fieldMarkingsGroup.add(chalkMesh);
    }

    // 5b. Boundary Flag Poles & Pennants -> 1 vertex-colored Mesh
    const makeFlagGeo = (dir: number) => {
      const flagShape = new THREE.Shape();
      flagShape.moveTo(0, 0);
      flagShape.lineTo(dir * 0.55, 0.22);
      flagShape.lineTo(0, 0.44);
      flagShape.closePath();
      return new THREE.ShapeGeometry(flagShape);
    };
    const flagParts = [
      bakeStaticColoredGeo(new THREE.CylinderGeometry(0.025, 0.025, 2.2, 12), 0xcd853f, [-3.5, 1.1, -4.8]),
      bakeStaticColoredGeo(new THREE.CylinderGeometry(0.025, 0.025, 2.2, 12), 0xcd853f, [3.5, 1.1, -4.8]),
      bakeStaticColoredGeo(makeFlagGeo(-1), 0xe11d48, [-3.5, 1.85, -4.8]),
      bakeStaticColoredGeo(makeFlagGeo(1), 0xffffff, [3.5, 1.85, -4.8]),
    ];
    const mergedFlagsGeo = mergeGeometries(flagParts, false);
    for (let i = 0; i < flagParts.length; i++) flagParts[i].dispose();
    if (mergedFlagsGeo) {
      const flagsMesh = new THREE.Mesh(
        mergedFlagsGeo,
        new THREE.MeshStandardMaterial({
          vertexColors: true,
          roughness: 0.6,
          side: THREE.DoubleSide,
        })
      );
      flagsMesh.castShadow = gpu.enableDynamicShadows;
      fieldMarkingsGroup.add(flagsMesh);
    }

    // 6. Dynamic 3D Rope (Zero-Alloc In-Place TubeGeometry Updates) & Merged Center Ribbon
    const ropeSegments = 64;
    const ropeRadialSegments = 10;
    const ropeRadius = 0.052;
    const ropeCurvePoints: THREE.Vector3[] = [];
    for (let i = 0; i <= 14; i++) {
      ropeCurvePoints.push(new THREE.Vector3(-7 + i, 0.85, 0));
    }
    const initialCurve = new THREE.CatmullRomCurve3(ropeCurvePoints);
    const ropeGeo = new THREE.TubeGeometry(initialCurve, ropeSegments, ropeRadius, ropeRadialSegments, false);
    const ropeMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.88,
      metalness: 0.04,
    });
    const ropeMesh = new THREE.Mesh(ropeGeo, ropeMat);
    ropeMesh.frustumCulled = false;
    ropeMesh.castShadow = gpu.enableDynamicShadows;
    ropeMesh.receiveShadow = gpu.enableDynamicShadows;
    scene.add(ropeMesh);

    // Pre-allocated scratch buffers for zero-GC in-place rope tube vertex/normal updates
    const ropeSamplePts: THREE.Vector3[] = Array.from(
      { length: ropeSegments + 1 },
      () => new THREE.Vector3()
    );
    const ropeCosTable = new Float32Array(ropeRadialSegments + 1);
    const ropeSinTable = new Float32Array(ropeRadialSegments + 1);
    for (let j = 0; j <= ropeRadialSegments; j++) {
      const v = (j / ropeRadialSegments) * Math.PI * 2;
      ropeCosTable[j] = -Math.cos(v);
      ropeSinTable[j] = Math.sin(v);
    }
    const _ropeT = new THREE.Vector3();
    const _ropeN = new THREE.Vector3();
    const _ropeB = new THREE.Vector3();
    const _ropeUp = new THREE.Vector3(0, 1, 0);
    const ropePosAttr = ropeGeo.attributes.position as THREE.BufferAttribute;
    const ropeNormAttr = ropeGeo.attributes.normal as THREE.BufferAttribute;
    const ropePosArr = ropePosAttr.array as Float32Array;
    const ropeNormArr = ropeNormAttr.array as Float32Array;

    const updateRopeTubeInPlace = () => {
      for (let i = 0; i <= ropeSegments; i++) {
        initialCurve.getPoint(i / ropeSegments, ropeSamplePts[i]);
      }
      for (let i = 0; i <= ropeSegments; i++) {
        const p = ropeSamplePts[i];
        if (i === 0) {
          _ropeT.subVectors(ropeSamplePts[1], p);
        } else if (i === ropeSegments) {
          _ropeT.subVectors(p, ropeSamplePts[ropeSegments - 1]);
        } else {
          _ropeT.subVectors(ropeSamplePts[i + 1], ropeSamplePts[i - 1]);
        }
        if (_ropeT.lengthSq() < 1e-10) {
          _ropeT.set(1, 0, 0);
        } else {
          _ropeT.normalize();
        }
        _ropeB.crossVectors(_ropeT, _ropeUp);
        if (_ropeB.lengthSq() < 1e-8) {
          _ropeB.set(0, 0, 1);
        } else {
          _ropeB.normalize();
        }
        _ropeN.crossVectors(_ropeB, _ropeT).normalize();

        const rowBase = i * (ropeRadialSegments + 1);
        for (let j = 0; j <= ropeRadialSegments; j++) {
          const c = ropeCosTable[j];
          const s = ropeSinTable[j];
          const nx = c * _ropeN.x + s * _ropeB.x;
          const ny = c * _ropeN.y + s * _ropeB.y;
          const nz = c * _ropeN.z + s * _ropeB.z;
          const vIdx = (rowBase + j) * 3;
          ropeNormArr[vIdx] = nx;
          ropeNormArr[vIdx + 1] = ny;
          ropeNormArr[vIdx + 2] = nz;
          ropePosArr[vIdx] = p.x + ropeRadius * nx;
          ropePosArr[vIdx + 1] = p.y + ropeRadius * ny;
          ropePosArr[vIdx + 2] = p.z + ropeRadius * nz;
        }
      }
      ropePosAttr.needsUpdate = true;
      ropeNormAttr.needsUpdate = true;
    };

    // Center Ribbon Marker (Red + White Streamers + Golden Cinch -> 1 merged Mesh)
    const ribbonGroup = new THREE.Group();
    scene.add(ribbonGroup);
    const ribbonParts = [
      bakeStaticColoredGeo(new THREE.PlaneGeometry(0.14, 0.58), 0xe11d48, [-0.07, -0.29, 0]),
      bakeStaticColoredGeo(new THREE.PlaneGeometry(0.14, 0.58), 0xf8fafc, [0.07, -0.29, 0]),
      bakeStaticColoredGeo(new THREE.TorusGeometry(0.065, 0.024, 12, 24), 0xf59e0b),
    ];
    const mergedRibbonGeo = mergeGeometries(ribbonParts, false);
    for (let i = 0; i < ribbonParts.length; i++) ribbonParts[i].dispose();
    if (mergedRibbonGeo) {
      const ribbonMesh = new THREE.Mesh(
        mergedRibbonGeo,
        new THREE.MeshStandardMaterial({
          vertexColors: true,
          roughness: 0.36,
          metalness: 0.22,
          side: THREE.DoubleSide,
        })
      );
      ribbonGroup.add(ribbonMesh);
    }

    // 7. GLTF Assets Loading (Stadium Court, Merged Crowd, Hardware-Instanced Mii Pullers)
    const gltfLoader = new GLTFLoader();
    let crowdScene: THREE.Group | null = null;
    const pullerActors: PullerActor[] = [];
    let bodyWithFeetInst: THREE.InstancedMesh | null = null;
    let headInst: THREE.InstancedMesh | null = null;
    let handInst: THREE.InstancedMesh | null = null;
    let shadowInst: THREE.InstancedMesh | null = null;

    const skinTones = [0xffeed9, 0xffdfc4, 0xf5cba7, 0xfff4e8];
    const hairColors = [0x2a1708, 0x111625, 0x3e2210, 0x5c3d1e];

    Promise.all([
      gltfLoader.loadAsync('/assets/models/stadium_court.glb'),
      gltfLoader.loadAsync('/assets/models/mii_crowd.glb'),
      gltfLoader.loadAsync('/assets/models/mii_player.glb'),
    ])
      .then(([stadiumGltf, crowdGltf, miiGltf]) => {
        if (isDisposed) {
          disposeObject3D(stadiumGltf.scene);
          disposeObject3D(crowdGltf.scene);
          disposeObject3D(miiGltf.scene);
          return;
        }

        // A. Prepare Stadium Court & Completely Hide the "Argon Tennis" Banner
        const stadium = stadiumGltf.scene;
        const maxAniso = getCappedAnisotropy(renderer, gpu);

        stadium.traverse((obj) => {
          if ((obj as THREE.Mesh).isMesh) {
            const mesh = obj as THREE.Mesh;
            const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            let hideBanner = false;
            materials.forEach((m) => {
              if (!m) return;
              const mat = m as unknown as Record<string, any>;
              if (mat.map) {
                mat.map.anisotropy = maxAniso;
                mat.map.wrapS = THREE.RepeatWrapping;
                mat.map.wrapT = THREE.RepeatWrapping;
                mat.map.needsUpdate = true;
              }
              if (/LogoArgonBanner/i.test(mat.name || mesh.name)) {
                mat.transparent = true;
                mat.opacity = 0;
                mat.visible = false;
                mat.needsUpdate = true;
                hideBanner = true;
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

            if (hideBanner) {
              mesh.visible = false;
            } else if (/Shadow/i.test(mesh.name)) {
              mesh.castShadow = false;
              mesh.receiveShadow = false;
              mesh.renderOrder = 1;
            } else if (/Tree/i.test(mesh.name)) {
              mesh.castShadow = gpu.enableDynamicShadows;
              mesh.receiveShadow = gpu.enableDynamicShadows;
            } else {
              mesh.receiveShadow = gpu.enableDynamicShadows;
              if (/Wall|Bleacher|Canopy|Pillar|Umpire|Bench|Clubhouse|StadiumCourt/i.test(mesh.name)) {
                mesh.castShadow = gpu.enableDynamicShadows;
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
            transparent: true,
          });
          bannerMatRef.current = bannerMat;
          const bannerMesh = new THREE.Mesh(bannerGeo, bannerMat);
          bannerMesh.position.set(0, 1.25, -0.46);
          scene.add(bannerMesh);
        }

        // B. Merge Cheering Bleachers Crowd (444 GLB meshes -> 1 vertex-colored Mesh)
        const crowdRoot = crowdGltf.scene;
        crowdRoot.updateMatrixWorld(true);
        const crowdGeos: THREE.BufferGeometry[] = [];
        const tmpColor = new THREE.Color();
        crowdRoot.traverse((obj) => {
          if (!(obj as THREE.Mesh).isMesh) return;
          const mesh = obj as THREE.Mesh;
          if (!mesh.geometry) return;
          const firstMat = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as
            | THREE.MeshStandardMaterial
            | undefined;
          if (firstMat && firstMat.color) {
            tmpColor.copy(firstMat.color);
          } else {
            tmpColor.setRGB(0.85, 0.85, 0.85);
          }
          const g = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
          g.applyMatrix4(mesh.matrixWorld);
          if (!g.attributes.normal) {
            g.computeVertexNormals();
          }
          for (const attrName of Object.keys(g.attributes)) {
            if (attrName !== 'position' && attrName !== 'normal') {
              g.deleteAttribute(attrName);
            }
          }
          g.clearGroups();
          const vCount = g.attributes.position.count;
          const colors = new Float32Array(vCount * 3);
          const r = tmpColor.r;
          const gr = tmpColor.g;
          const b = tmpColor.b;
          for (let v = 0; v < vCount; v++) {
            const o = v * 3;
            colors[o] = r;
            colors[o + 1] = gr;
            colors[o + 2] = b;
          }
          g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
          crowdGeos.push(g);
        });
        const mergedCrowdGeo = crowdGeos.length > 0 ? mergeGeometries(crowdGeos, false) : null;
        for (let i = 0; i < crowdGeos.length; i++) crowdGeos[i].dispose();
        disposeObject3D(crowdRoot);

        if (mergedCrowdGeo) {
          const crowdMat = new THREE.MeshStandardMaterial({
            vertexColors: true,
            roughness: 0.72,
            metalness: 0.04,
          });
          const crowdMesh = new THREE.Mesh(mergedCrowdGeo, crowdMat);
          crowdMesh.castShadow = false;
          crowdMesh.receiveShadow = gpu.enableDynamicShadows;
          const crowdGroup = new THREE.Group();
          crowdGroup.add(crowdMesh);
          crowdScene = crowdGroup;
          scene.add(crowdGroup);
        }

        // C. Merge & Hardware-Instance 8 Mii Pullers + 8 Contact Shadows (176 -> 4 draw calls)
        const baseMii = miiGltf.scene;
        let torsoNode: THREE.Object3D | null = null;
        let headNode: THREE.Object3D | null = null;
        let handLNode: THREE.Object3D | null = null;
        let footLNode: THREE.Object3D | null = null;
        let footRNode: THREE.Object3D | null = null;

        for (let i = 0; i < baseMii.children.length; i++) {
          const child = baseMii.children[i];
          const n = (child.name || '').toLowerCase();
          if (n.includes('torso')) torsoNode = child;
          else if (n.includes('head')) headNode = child;
          else if (n.includes('hand_l')) handLNode = child;
          else if (n.includes('foot_l')) footLNode = child;
          else if (n.includes('foot_r')) footRNode = child;
        }

        const bodyInputs: MiiNodeBakeInput[] = [];
        if (torsoNode) bodyInputs.push({ node: torsoNode, offset: [0, 0.55, 0] });
        if (footLNode) bodyInputs.push({ node: footLNode, offset: [-0.105, 0.13, 0.01] });
        if (footRNode) bodyInputs.push({ node: footRNode, offset: [0.105, 0.13, 0.01] });

        const bodyWithFeetGeo = bakeMiiLimbGeometry(bodyInputs);
        const headGeo = headNode
          ? bakeMiiLimbGeometry([{ node: headNode, offset: [0, 0, 0], isHead: true }])
          : null;
        const handGeo = handLNode
          ? bakeMiiLimbGeometry([{ node: handLNode, offset: [0, 0, 0] }])
          : null;

        // Immediately free all raw GLB Mii geometries & materials now that limbs are baked
        disposeObject3D(baseMii);

        const PULLER_COUNT = 8;
        const HAND_COUNT = 16;
        const shirtColors8 = new Float32Array(PULLER_COUNT * 3);
        const skinColors8 = new Float32Array(PULLER_COUNT * 3);
        const hairColors8 = new Float32Array(PULLER_COUNT * 3);
        const shirtColors16 = new Float32Array(HAND_COUNT * 3);
        const skinColors16 = new Float32Array(HAND_COUNT * 3);
        const hairColors16 = new Float32Array(HAND_COUNT * 3);

        const writeColor3 = (arr: Float32Array, slot: number, hex: number) => {
          tmpColor.setHex(hex);
          const o = slot * 3;
          arr[o] = tmpColor.r;
          arr[o + 1] = tmpColor.g;
          arr[o + 2] = tmpColor.b;
        };

        for (let slot = 0; slot < PULLER_COUNT; slot++) {
          const isRed = slot < 4;
          const idx = slot % 4;
          const shirtHex = isRed ? 0xe11d48 : 0xf8fafc;
          const skinHex = skinTones[idx % skinTones.length];
          const hairHex = hairColors[idx % hairColors.length];

          writeColor3(shirtColors8, slot, shirtHex);
          writeColor3(skinColors8, slot, skinHex);
          writeColor3(hairColors8, slot, hairHex);

          writeColor3(shirtColors16, slot * 2, shirtHex);
          writeColor3(skinColors16, slot * 2, skinHex);
          writeColor3(hairColors16, slot * 2, hairHex);
          writeColor3(shirtColors16, slot * 2 + 1, shirtHex);
          writeColor3(skinColors16, slot * 2 + 1, skinHex);
          writeColor3(hairColors16, slot * 2 + 1, hairHex);
        }

        const miiInstancedMat = createInstancedWiiMiiMaterial(0.29, 0.14);

        if (bodyWithFeetGeo) {
          bodyWithFeetGeo.setAttribute('aShirtColor', new THREE.InstancedBufferAttribute(shirtColors8, 3));
          bodyWithFeetGeo.setAttribute('aSkinColor', new THREE.InstancedBufferAttribute(skinColors8, 3));
          bodyWithFeetGeo.setAttribute('aHairColor', new THREE.InstancedBufferAttribute(hairColors8, 3));
          bodyWithFeetInst = new THREE.InstancedMesh(bodyWithFeetGeo, miiInstancedMat, PULLER_COUNT);
          bodyWithFeetInst.frustumCulled = false;
          bodyWithFeetInst.castShadow = gpu.enableDynamicShadows;
          bodyWithFeetInst.receiveShadow = gpu.enableDynamicShadows;
          scene.add(bodyWithFeetInst);
        }

        if (headGeo) {
          headGeo.setAttribute('aShirtColor', new THREE.InstancedBufferAttribute(shirtColors8, 3));
          headGeo.setAttribute('aSkinColor', new THREE.InstancedBufferAttribute(skinColors8, 3));
          headGeo.setAttribute('aHairColor', new THREE.InstancedBufferAttribute(hairColors8, 3));
          headInst = new THREE.InstancedMesh(headGeo, miiInstancedMat, PULLER_COUNT);
          headInst.frustumCulled = false;
          headInst.castShadow = gpu.enableDynamicShadows;
          headInst.receiveShadow = gpu.enableDynamicShadows;
          scene.add(headInst);
        }

        if (handGeo) {
          handGeo.setAttribute('aShirtColor', new THREE.InstancedBufferAttribute(shirtColors16, 3));
          handGeo.setAttribute('aSkinColor', new THREE.InstancedBufferAttribute(skinColors16, 3));
          handGeo.setAttribute('aHairColor', new THREE.InstancedBufferAttribute(hairColors16, 3));
          handInst = new THREE.InstancedMesh(handGeo, miiInstancedMat, HAND_COUNT);
          handInst.frustumCulled = false;
          handInst.castShadow = gpu.enableDynamicShadows;
          handInst.receiveShadow = gpu.enableDynamicShadows;
          scene.add(handInst);
        }

        // Contact Shadows -> 1 InstancedMesh (8 quads) using shared classroom3d shadow texture
        const shadowGeo = new THREE.PlaneGeometry(1.2, 1.2);
        shadowGeo.rotateX(-Math.PI / 2);
        const shadowMat = new THREE.MeshBasicMaterial({
          map: getSharedContactShadowTexture(),
          transparent: true,
          opacity: 0.82,
          depthWrite: false,
        });
        shadowInst = new THREE.InstancedMesh(shadowGeo, shadowMat, PULLER_COUNT);
        shadowInst.frustumCulled = false;
        shadowInst.renderOrder = 2;
        scene.add(shadowInst);

        // Create 8 lightweight transform-only puller actors (0..3 Red, 4..7 White)
        const buildPuller = (team: 'red' | 'white', index: number, slotIndex: number): PullerActor => {
          const id = `${team}_${index}`;
          const root = new THREE.Group();
          const charGroup = new THREE.Group();
          charGroup.rotation.order = 'YXZ';
          root.add(charGroup);

          const head = new THREE.Object3D();
          head.position.set(0, 1.22, 0);
          charGroup.add(head);

          const handLead = new THREE.Object3D();
          handLead.rotation.order = 'YXZ';
          const handRear = new THREE.Object3D();
          handRear.rotation.order = 'YXZ';

          const faceDir = team === 'red' ? 1 : -1;
          const baseX = team === 'red' ? -1.6 - index * 1.35 : 1.6 + index * 1.35;
          const baseZ = -0.3;
          root.position.set(baseX, 0, baseZ);
          root.updateMatrixWorld(true);

          emotionFX.attachFaceRig(id, head, hairColors[index % hairColors.length]);

          return {
            id,
            slotIndex,
            root,
            charGroup,
            head,
            handLead,
            handRear,
            team,
            index,
            baseX,
            baseZ,
            faceDirection: faceDir,
          };
        };

        for (let i = 0; i < 4; i++) {
          pullerActors.push(buildPuller('red', i, i));
        }
        for (let i = 0; i < 4; i++) {
          pullerActors.push(buildPuller('white', i, 4 + i));
        }

        setLoaded(true);
      })
      .catch((err) => {
        console.warn('[TugOfWar3DStage] Asset load error:', err);
        if (!isDisposed) {
          setLoaded(true);
        }
      });

    // 8. Animation & Render Loop (Zero Per-Frame Allocations)
    let animationFrameId = 0;
    let lastFrameTime = performance.now();
    const startTimeMs = lastFrameTime;
    let lastRopeUpdateMs = 0;
    let lastRenderedRibbonX = -999;
    let cheerEnergy = 0.25;
    let prevLead: 'red' | 'white' | 'even' = 'even';
    let prevDisp = 0;
    const _shadowMat4 = new THREE.Matrix4();

    const animate = () => {
      if (isDisposed) return;
      animationFrameId = requestAnimationFrame(animate);
      const nowMs = performance.now();
      const rawDt = (nowMs - lastFrameTime) / 1000;
      const delta = Math.min(Math.max(rawDt, 0.0001), 0.08);
      lastFrameTime = nowMs;
      const elapsedTime = (nowMs - startTimeMs) / 1000;

      const {
        displacement: disp,
        matchEnded: ended,
        winner: win,
        redPullRate: rRate = 0,
        whitePullRate: wRate = 0,
      } = stateRef.current;

      const dispDelta = disp - prevDisp;
      const dispVelocity = delta > 0 ? dispDelta / delta : 0;
      prevDisp = disp;

      // Update Procedural Facial Emotion FX & Particle Reactions (zero-alloc indexed access)
      if (ended) {
        const winningTeam = win === 'team_red' ? 'red' : win === 'team_white' ? 'white' : null;
        const losingTeam = winningTeam === 'red' ? 'white' : winningTeam === 'white' ? 'red' : null;
        if (winningTeam) {
          emotionFX.setTeamExpression(winningTeam, 'happy_grin', 1.0);
          if (pullerActors.length === 8 && Math.random() < delta * 2.5) {
            const teamOffset = winningTeam === 'red' ? 0 : 4;
            const randomWinner = pullerActors[teamOffset + Math.floor(Math.random() * 4)];
            if (randomWinner) emotionFX.triggerEmoteBurst(randomWinner.root.position, 3);
          }
        }
        if (losingTeam) {
          emotionFX.setTeamExpression(losingTeam, 'shocked_loss', 1.0);
        }
      } else {
        if (rRate > 1.8) {
          emotionFX.setTeamExpression('red', 'effort_shout', 0.4);
        }
        if (wRate > 1.8) {
          emotionFX.setTeamExpression('white', 'effort_shout', 0.4);
        }

        if (dispVelocity > 3.0) {
          emotionFX.setTeamExpression('red', 'wide_eyed_panic', 0.5);
          if (pullerActors.length === 8 && Math.random() < delta * 3.5) {
            for (let i = 0; i < 4; i++) {
              emotionFX.spawnSweatDrops(pullerActors[i].root.position, 1);
            }
          }
        } else if (dispVelocity < -3.0) {
          emotionFX.setTeamExpression('white', 'wide_eyed_panic', 0.5);
          if (pullerActors.length === 8 && Math.random() < delta * 3.5) {
            for (let i = 4; i < 8; i++) {
              emotionFX.spawnSweatDrops(pullerActors[i].root.position, 1);
            }
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

      // Animate Cheering Bleachers Crowd (single merged mesh bounce)
      if (crowdScene) {
        const crowdFreq = 5.5 + cheerEnergy * 5.0;
        const crowdAmp = 0.02 + cheerEnergy * 0.06;
        crowdScene.position.y = Math.abs(Math.sin(elapsedTime * crowdFreq)) * crowdAmp;
      }

      // Dynamic Rope CatmullRom Curve through all Pullers & Ribbon
      const rAnchorX = -1.6 - 3 * 1.35 + ribbonX * 0.35;
      const wAnchorX = 1.6 + 3 * 1.35 + ribbonX * 0.35;

      ropeCurvePoints[0].set(rAnchorX - 1.2, 0.05, 0.1);
      ropeCurvePoints[1].set(rAnchorX - 0.5, 0.45, 0);

      for (let i = 3; i >= 0; i--) {
        const actor = pullerActors[i];
        const px = actor ? actor.root.position.x : -1.6 - i * 1.35 + ribbonX * 0.35;
        ropeCurvePoints[2 + (3 - i)].set(px, 0.85, 0);
      }

      const tensionShudder = ended ? 0 : Math.sin(elapsedTime * 35) * 0.004;
      ropeCurvePoints[6].set(ribbonX * 0.5, 0.85 + tensionShudder, 0);
      ropeCurvePoints[7].set(ribbonX, 0.85 + tensionShudder, 0);
      ropeCurvePoints[8].set(ribbonX * 0.5 + 0.8, 0.85 + tensionShudder, 0);

      for (let i = 0; i < 4; i++) {
        const actor = pullerActors[4 + i];
        const px = actor ? actor.root.position.x : 1.6 + i * 1.35 + ribbonX * 0.35;
        ropeCurvePoints[9 + i].set(px, 0.85, 0);
      }

      ropeCurvePoints[13].set(wAnchorX + 0.5, 0.45, 0);
      ropeCurvePoints[14].set(wAnchorX + 1.2, 0.05, -0.1);

      // Update rope tube attributes in-place (zero TubeGeometry allocation / VBO churn)
      if (Math.abs(ribbonX - lastRenderedRibbonX) > 0.002 || (!ended && nowMs - lastRopeUpdateMs >= 33)) {
        lastRenderedRibbonX = ribbonX;
        lastRopeUpdateMs = nowMs;
        updateRopeTubeInPlace();
      }

      // Center Ribbon Marker flutter & position
      ribbonGroup.position.set(ribbonX, 0.85 + tensionShudder, 0);
      const flutterAngle = Math.sin(elapsedTime * 8) * 0.12 + (disp / 100) * 0.25;
      ribbonGroup.rotation.z = flutterAngle;

      // Animate Instanced Mii Pullers (Zero-Alloc Loop)
      const redCadence = 3.8 + Math.min(3.0, (rRate / 60) * 1.8);
      const whiteCadence = 3.8 + Math.min(3.0, (wRate / 60) * 1.8);
      const pullerLen = pullerActors.length;

      for (let i = 0; i < pullerLen; i++) {
        const actor = pullerActors[i];
        const isRed = actor.team === 'red';
        const cadence = isRed ? redCadence : whiteCadence;
        const phaseOffset = isRed ? 0 : 0.45;
        const heaveCycle = Math.sin(elapsedTime * cadence + phaseOffset + actor.index * 0.15);

        const shiftX = ribbonX * 0.35;
        actor.root.position.x = actor.baseX + shiftX;
        actor.root.position.z = actor.baseZ;

        if (ended) {
          const isWinner = (win === 'team_red' && isRed) || (win === 'team_white' && !isRed);
          if (isWinner) {
            actor.charGroup.rotation.x = 0;
            actor.charGroup.rotation.y = (Math.PI * 0.5 - 0.18) * actor.faceDirection;
            actor.charGroup.position.set(0, 0, 0);

            const jumpY = Math.abs(Math.sin(elapsedTime * 8 + actor.index * 0.8)) * 0.28;
            actor.root.position.y = jumpY;

            actor.handLead.position.set(
              actor.root.position.x + 0.22 * actor.faceDirection,
              1.48 + jumpY * 0.15,
              actor.baseZ + 0.1
            );
            actor.handLead.rotation.set(-0.2, 0, -0.3 * actor.faceDirection);
            actor.handRear.position.set(
              actor.root.position.x - 0.22 * actor.faceDirection,
              1.48 + jumpY * 0.15,
              actor.baseZ + 0.1
            );
            actor.handRear.rotation.set(-0.2, 0, 0.3 * actor.faceDirection);
            actor.head.rotation.x = -0.25;
          } else {
            actor.root.position.y = 0;
            actor.charGroup.rotation.x = 0.22;
            actor.charGroup.rotation.y = (Math.PI * 0.5 - 0.18) * actor.faceDirection;
            actor.charGroup.position.set(0.12 * actor.faceDirection, 0, 0);

            actor.handLead.position.set(
              actor.root.position.x + 0.12 * actor.faceDirection,
              0.52,
              actor.baseZ + 0.15
            );
            actor.handLead.rotation.set(0.4, 0, 0);
            actor.handRear.position.set(
              actor.root.position.x - 0.12 * actor.faceDirection,
              0.52,
              actor.baseZ + 0.15
            );
            actor.handRear.rotation.set(0.4, 0, 0);
            actor.head.rotation.x = 0.38;
          }
        } else {
          actor.root.position.y = 0;
          actor.charGroup.rotation.y = (Math.PI * 0.5 - 0.18) * actor.faceDirection;

          const baseLean = 0.65; // ~37.2°
          const heaveExtra = Math.max(0, heaveCycle) * 0.14; // up to ~45.2°
          actor.charGroup.rotation.x = -(baseLean + heaveExtra);
          actor.charGroup.rotation.z = 0;

          const pullSurge = -Math.max(0, heaveCycle) * 0.09 * actor.faceDirection;
          actor.charGroup.position.set(pullSurge, 0, 0);
          actor.head.rotation.x = -0.16 - Math.max(0, heaveCycle) * 0.22;

          const handBaseX = actor.root.position.x + pullSurge;
          const ropeY = 0.85;
          const ropeZ = 0;

          actor.handLead.position.set(handBaseX + 0.14 * actor.faceDirection, ropeY, ropeZ);
          actor.handLead.rotation.set(-Math.PI * 0.38, Math.PI * 0.5 * actor.faceDirection, -0.2 * actor.faceDirection);

          actor.handRear.position.set(handBaseX - 0.14 * actor.faceDirection, ropeY, ropeZ);
          actor.handRear.rotation.set(-Math.PI * 0.38, Math.PI * 0.5 * actor.faceDirection, 0.2 * actor.faceDirection);
        }

        // Sync hierarchy matrices -> 4 Hardware InstancedMeshes + Instanced Face Overlay
        actor.root.updateMatrixWorld(true);
        actor.handLead.updateMatrix();
        actor.handRear.updateMatrix();

        const slot = actor.slotIndex;
        if (bodyWithFeetInst) bodyWithFeetInst.setMatrixAt(slot, actor.charGroup.matrixWorld);
        if (headInst) headInst.setMatrixAt(slot, actor.head.matrixWorld);
        emotionFX.setHeadMatrix(actor.id, actor.head.matrixWorld);

        if (handInst) {
          handInst.setMatrixAt(slot * 2, actor.handLead.matrix);
          handInst.setMatrixAt(slot * 2 + 1, actor.handRear.matrix);
        }

        if (shadowInst) {
          _shadowMat4.makeTranslation(
            actor.root.position.x - 0.28 * actor.faceDirection,
            0.015,
            actor.root.position.z
          );
          shadowInst.setMatrixAt(slot, _shadowMat4);
        }
      }

      if (pullerLen > 0) {
        if (bodyWithFeetInst) bodyWithFeetInst.instanceMatrix.needsUpdate = true;
        if (headInst) headInst.instanceMatrix.needsUpdate = true;
        if (handInst) handInst.instanceMatrix.needsUpdate = true;
        if (shadowInst) shadowInst.instanceMatrix.needsUpdate = true;
      }

      // 9. Elevated 3/4 Diagonal Broadcast Camera Movement
      const targetCamX = ribbonX * 0.38;
      camera.position.x += (targetCamX - camera.position.x) * delta * 2.8;
      const targetLookX = ribbonX * 0.45;
      camera.lookAt(targetLookX, 1.15, 0);

      // Update Procedural Emotion Face Rigs, Sweat Drops & Emote Particles + DRS (unclamped rawDt)
      emotionFX.update(delta);
      trackFrameRate(rawDt);

      renderer.render(scene, camera);
    };

    animationFrameId = requestAnimationFrame(animate);

    // Cleanup on unmount (disposes all non-shared textures/emissiveMaps, shadow maps, geometries, materials)
    return () => {
      isDisposed = true;
      cancelAnimationFrame(animationFrameId);
      bannerMatRef.current = null;
      emotionFX.dispose();
      disposeObject3D(scene);
      scene.clear();
      cleanupRenderer();
    };
  }, [contextRestartKey]);

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
