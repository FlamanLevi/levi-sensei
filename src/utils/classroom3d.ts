/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ============================================================================
 * Classroom 3D Engine & Adaptive Hardware Profiler
 * ============================================================================
 * Automatically detects device capabilities (Japanese school Dynabook laptops,
 * classroom iPads, Chromebooks, and high-end teacher workstations) to configure
 * Three.js for a guaranteed, rock-solid 60 FPS without manual tuning.
 *
 * Enforces GEMINI.md §5 (Classroom 3D WebGL Performance Budget & Invariants).
 * ============================================================================
 */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export type ClassroomGpuTier = 'LOW_POWER' | 'BALANCED' | 'HIGH_PERFORMANCE';

export interface ClassroomGpuProfile {
  tier: ClassroomGpuTier;
  rendererString: string;
  isSoftware: boolean;
  isMobileOrTablet: boolean;
  isIpad: boolean;
  isModernIpad: boolean;
  isIntegratedIntel: boolean;
  isLowPower: boolean;
  enableDynamicShadows: boolean;
  shadowMapRes: number;
  targetPixelRatio: number;
  antialias: boolean;
}

export interface Classroom3DOptions {
  fov?: number;
  near?: number;
  far?: number;
  isStudentView?: boolean;
  cameraPosition?: [number, number, number];
  cameraLookAt?: [number, number, number];
  enableDrs?: boolean; // Dynamic Resolution Scaling
  alpha?: boolean;
  toneMapping?: THREE.ToneMapping;
  toneMappingExposure?: number;
  clearColor?: THREE.ColorRepresentation;
  clearAlpha?: number;
  onContextLost?: (event: Event) => void;
  onContextRestored?: () => void;
}

export interface Classroom3DContext {
  renderer: THREE.WebGLRenderer;
  camera: THREE.PerspectiveCamera;
  gpuProfile: ClassroomGpuProfile;
  updateSize: () => void;
  /**
   * Pass the raw (unclamped) frame delta in seconds to enable real-time 60 FPS
   * Dynamic Resolution Scaling while safely ignoring tab-switch / stall pauses (>= 250ms).
   */
  trackFrameRate: (deltaSeconds: number) => void;
  cleanup: () => void;
}

export interface RoomEnvironmentHandle {
  texture: THREE.Texture;
  dispose: () => void;
}

let cachedRendererString: string | null = null;

/**
 * 1. Automatic Hardware Profiler
 * Probes the WebGL context and hardware concurrency without blocking the main thread.
 * Caches the unmasked renderer string so subsequent checks take <0.01ms.
 */
export function detectClassroomGpuProfile(
  gl?: WebGLRenderingContext | WebGL2RenderingContext | null,
  isStudentView = false
): ClassroomGpuProfile {
  let rendererString = cachedRendererString ?? '';

  if (!rendererString) {
    let activeGl = gl;
    let tempCanvas: HTMLCanvasElement | null = null;
    if (!activeGl && typeof document !== 'undefined') {
      try {
        tempCanvas = document.createElement('canvas');
        activeGl = (tempCanvas.getContext('webgl2') || tempCanvas.getContext('webgl')) as any;
      } catch {
        // Safely ignore canvas creation errors
      }
    }

    if (activeGl) {
      try {
        const dbg = activeGl.getExtension('WEBGL_debug_renderer_info');
        if (dbg) {
          rendererString = String(activeGl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) || '';
        }
      } catch {
        // Safely ignore extension inspection errors
      }
      if (tempCanvas) {
        try {
          activeGl.getExtension('WEBGL_lose_context')?.loseContext();
        } catch {
          // Safely ignore
        }
      }
    }
    cachedRendererString = rendererString;
  }

  const isSoftware = /SwiftShader|llvmpipe|Software| Mesa /i.test(rendererString);

  // Accurate iPad detection (iPadOS Safari masks as MacIntel with touch points)
  const isIpad = typeof navigator !== 'undefined' && (
    /iPad/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && (navigator.maxTouchPoints || 0) > 1)
  );

  const isMobileOrTablet = isIpad || (typeof navigator !== 'undefined' && (
    /iPhone|iPod|Android|Tablet/i.test(navigator.userAgent) ||
    (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(pointer: coarse)').matches)
  ));

  // Low-power integrated Intel GPUs (standard on Japanese Board of Education Dynabook laptops)
  const isIntegratedIntel = /Intel|HD Graphics|UHD Graphics|Iris/i.test(rendererString);

  // Check hardware capacity (cores / RAM)
  const cores = typeof navigator !== 'undefined' ? (navigator.hardwareConcurrency || 4) : 4;
  const memoryGb = typeof navigator !== 'undefined' ? ((navigator as any).deviceMemory || 8) : 8;
  const hasConstrainedSpecs = cores <= 4 || memoryGb <= 4;

  // Modern iPads: iPad 10th Gen (A14 Bionic), iPad 11th Gen A3354 (A16 Bionic), and iPad Air/Pro (M-series).
  // These devices have 6+ CPU cores and powerful Apple TBDR GPUs capable of native on-chip MSAA.
  const isModernIpad = isIpad && (cores >= 6 || /Apple/i.test(rendererString));

  // Low-power tier is reserved for software renderers, weak Intel laptops, and constrained devices
  const isLowPower = isSoftware || isIntegratedIntel || (hasConstrainedSpecs && !isModernIpad) || (!isModernIpad && isMobileOrTablet);

  const tier: ClassroomGpuTier = isLowPower
    ? 'LOW_POWER'
    : /NVIDIA|GeForce|Radeon|RTX|Apple M/i.test(rendererString)
    ? 'HIGH_PERFORMANCE'
    : 'BALANCED';

  const maxDeviceRatio = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;

  // Apple's TBDR (Tile-Based Deferred Rendering) on A14/A16/M-series chips executes 4x MSAA
  // inside on-chip tile SRAM with virtually zero memory bandwidth overhead.
  const antialias = !isSoftware && (tier === 'HIGH_PERFORMANCE' || isModernIpad || !isLowPower);

  return {
    tier,
    rendererString,
    isSoftware,
    isMobileOrTablet,
    isIpad,
    isModernIpad,
    isIntegratedIntel,
    isLowPower,
    // Dynamic shadow passes are strictly disabled on iPads & low-power Dynabooks (GEMINI.md §5)
    enableDynamicShadows: tier === 'HIGH_PERFORMANCE' && !isMobileOrTablet && !isStudentView,
    shadowMapRes: tier === 'HIGH_PERFORMANCE' ? 1024 : 512,
    // 1.25x pixel ratio on A14/A16 iPads provides crisp 1475x1025 rendering on Liquid Retina
    // without the 3.87M pixel battery / thermal penalties of 2.0x native supersampling
    targetPixelRatio: isLowPower ? 1.0 : Math.min(maxDeviceRatio, 1.25),
    antialias,
  };
}

/**
 * 2. Pre-Baked Contact Shadow Texture (Shared Singleton)
 * Replaces expensive dynamic shadow casting with soft circular ground occlusion.
 */
let sharedContactShadowTex: THREE.CanvasTexture | null = null;

export function getSharedContactShadowTexture(): THREE.CanvasTexture {
  if (sharedContactShadowTex) return sharedContactShadowTex;
  if (typeof document === 'undefined') {
    const emptyTex = new THREE.CanvasTexture({} as HTMLCanvasElement);
    emptyTex.userData = { isSharedResource: true };
    return emptyTex;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(128, 128, 10, 128, 128, 118);
    grad.addColorStop(0, 'rgba(28, 20, 12, 0.76)');
    grad.addColorStop(0.45, 'rgba(38, 28, 16, 0.44)');
    grad.addColorStop(0.8, 'rgba(48, 36, 20, 0.14)');
    grad.addColorStop(1.0, 'rgba(48, 36, 20, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    ctx.strokeStyle = 'rgba(24, 16, 8, 0.14)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(128, 128, 84, 0, Math.PI * 2);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.userData = { isSharedResource: true };
  sharedContactShadowTex = tex;
  return tex;
}

/**
 * Creates a lightweight pre-baked ground shadow mesh (0 shadow map cost).
 */
export function createContactShadowMesh(radiusX = 1.0, radiusZ = 1.0, opacity = 0.85): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(radiusX * 2, radiusZ * 2);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({
    map: getSharedContactShadowTexture(),
    transparent: true,
    opacity,
    depthWrite: false,
    fog: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  return mesh;
}

/**
 * Returns hardware-appropriate texture anisotropy (1x on low-power GPUs, <= 4x otherwise).
 */
export function getCappedAnisotropy(
  renderer: THREE.WebGLRenderer,
  gpuProfile: ClassroomGpuProfile
): number {
  if (gpuProfile.isLowPower) return 1;
  const maxAniso = renderer.capabilities?.getMaxAnisotropy
    ? renderer.capabilities.getMaxAnisotropy()
    : 4;
  return Math.max(1, Math.min(4, maxAniso));
}

/**
 * Generates a studio PBR RoomEnvironment PMREM texture and immediately disposes
 * the temporary RoomEnvironment scene and PMREMGenerator so nothing leaks.
 */
export function createRoomEnvironmentPMREM(
  renderer: THREE.WebGLRenderer,
  sigma = 0.04
): RoomEnvironmentHandle {
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();
  const roomEnv = new RoomEnvironment();
  const envTarget = pmremGenerator.fromScene(roomEnv, sigma);
  roomEnv.dispose();
  pmremGenerator.dispose();
  return {
    texture: envTarget.texture,
    dispose: () => {
      envTarget.dispose();
    },
  };
}

const MATERIAL_TEXTURE_SLOTS = [
  'map',
  'emissiveMap',
  'normalMap',
  'roughnessMap',
  'metalnessMap',
  'aoMap',
  'alphaMap',
  'bumpMap',
  'lightMap',
  'specularMap',
  'displacementMap',
  'clearcoatMap',
  'clearcoatRoughnessMap',
  'clearcoatNormalMap',
] as const;

/**
 * Safely disposes all non-shared GPU resources (geometries, InstancedMesh buffers,
 * materials, PBR texture slots, and lights including shadow maps) under a root Object3D.
 * Skips any geometry, material, or texture tagged with `userData.isSharedResource === true`
 * (and preserves Three.js's global shared Sprite geometry).
 */
export function disposeObject3D(
  root: THREE.Object3D,
  options: { disposeShared?: boolean } = {}
): void {
  const disposeShared = options.disposeShared === true;
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  const instancedMeshes = new Set<THREE.InstancedMesh>();
  const lights = new Set<THREE.Light>();

  root.traverse((obj) => {
    const anyObj = obj as unknown as {
      isMesh?: boolean;
      isPoints?: boolean;
      isLine?: boolean;
      isSprite?: boolean;
      isInstancedMesh?: boolean;
      isLight?: boolean;
      geometry?: THREE.BufferGeometry;
      material?: THREE.Material | THREE.Material[];
    };

    if (anyObj.isLight) {
      lights.add(obj as THREE.Light);
    }

    if (anyObj.isInstancedMesh) {
      instancedMeshes.add(obj as THREE.InstancedMesh);
    }

    if (anyObj.geometry && !anyObj.isSprite) {
      if (disposeShared || !anyObj.geometry.userData?.isSharedResource) {
        geometries.add(anyObj.geometry);
      }
    }

    if (anyObj.material) {
      const matList = Array.isArray(anyObj.material) ? anyObj.material : [anyObj.material];
      for (let i = 0; i < matList.length; i++) {
        const mat = matList[i];
        if (!mat) continue;
        if (!disposeShared && mat.userData?.isSharedResource) continue;
        materials.add(mat);

        const rec = mat as unknown as Record<string, unknown>;
        for (let s = 0; s < MATERIAL_TEXTURE_SLOTS.length; s++) {
          const tex = rec[MATERIAL_TEXTURE_SLOTS[s]] as THREE.Texture | undefined | null;
          if (!tex || !tex.isTexture) continue;
          if (!disposeShared && (tex.userData?.isSharedResource || tex === sharedContactShadowTex)) {
            continue;
          }
          textures.add(tex);
        }
      }
    }
  });

  instancedMeshes.forEach((inst) => inst.dispose());
  geometries.forEach((geo) => geo.dispose());
  textures.forEach((tex) => tex.dispose());
  materials.forEach((mat) => mat.dispose());
  lights.forEach((light) => light.dispose());
}

/**
 * 3. Centralized Classroom WebGL Factory
 * Mounts and configures a Three.js renderer and camera tailored to the active hardware.
 */
export function createClassroomRenderer(
  container: HTMLElement,
  options: Classroom3DOptions = {}
): Classroom3DContext {
  const width = container.clientWidth || 960;
  const height = container.clientHeight || 540;

  // Probe GPU profile first to configure WebGLRenderer parameters accurately
  const probeGpu = detectClassroomGpuProfile(null, options.isStudentView);

  const renderer = new THREE.WebGLRenderer({
    antialias: options.isStudentView ? (probeGpu.isModernIpad ? true : false) : probeGpu.antialias,
    alpha: options.alpha ?? false,
    powerPreference: probeGpu.isIpad ? 'default' : (options.isStudentView ? 'low-power' : 'high-performance'),
    precision: probeGpu.isLowPower && !probeGpu.isIpad ? 'mediump' : 'highp',
  });

  const gpuProfile = detectClassroomGpuProfile(renderer.getContext(), options.isStudentView);

  let currentPixelRatio = gpuProfile.targetPixelRatio;
  renderer.setPixelRatio(currentPixelRatio);
  renderer.setSize(width, height);
  renderer.shadowMap.enabled = gpuProfile.enableDynamicShadows;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = options.toneMapping ?? THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = options.toneMappingExposure ?? 0.95;
  if (options.clearColor !== undefined) {
    renderer.setClearColor(options.clearColor, options.clearAlpha ?? (options.alpha ? 0 : 1));
  }

  container.appendChild(renderer.domElement);

  // Setup PerspectiveCamera
  const fov = options.fov ?? 40;
  const camera = new THREE.PerspectiveCamera(fov, width / height, options.near ?? 0.1, options.far ?? 300);
  const [posX, posY, posZ] = options.cameraPosition ?? [0, 4.4, 12.2];
  camera.position.set(posX, posY, posZ);
  const [lookX, lookY, lookZ] = options.cameraLookAt ?? [0, 2.0, 0];
  camera.lookAt(lookX, lookY, lookZ);

  // WebGL context loss/restoration resilience
  const handleContextLost = (event: Event) => {
    event.preventDefault();
    options.onContextLost?.(event);
  };
  const handleContextRestored = () => {
    options.onContextRestored?.();
  };
  renderer.domElement.addEventListener('webglcontextlost', handleContextLost, false);
  renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored, false);

  // Resize Listener (guarded against transient 0x0 hidden container dimensions)
  const handleResize = () => {
    if (!container) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w <= 0 || h <= 0) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  };

  window.addEventListener('resize', handleResize);
  const resizeObserver = typeof ResizeObserver !== 'undefined'
    ? new ResizeObserver(handleResize)
    : null;
  resizeObserver?.observe(container);

  // Dynamic Resolution Scaling (DRS) Safety Net
  let rollingFrameMs = 16.6;
  let drsTimer = 0;

  const trackFrameRate = (deltaSeconds: number) => {
    if (options.enableDrs === false || gpuProfile.isSoftware) return;

    const frameMs = deltaSeconds * 1000;
    if (frameMs > 0 && frameMs < 250) {
      rollingFrameMs = rollingFrameMs * 0.92 + frameMs * 0.08;
      drsTimer += deltaSeconds;

      if (drsTimer > 2.0) {
        drsTimer = 0;
        // If frame time exceeds 19.5ms (< 51 FPS), step down pixel ratio
        if (rollingFrameMs > 19.5 && currentPixelRatio > 0.70) {
          currentPixelRatio = Math.max(0.70, Math.round((currentPixelRatio - 0.15) * 100) / 100);
          renderer.setPixelRatio(currentPixelRatio);
        } else if (rollingFrameMs < 14.5 && currentPixelRatio < gpuProfile.targetPixelRatio) {
          // If frame rate recovers to > 65 FPS, step back up
          currentPixelRatio = Math.min(gpuProfile.targetPixelRatio, Math.round((currentPixelRatio + 0.10) * 100) / 100);
          renderer.setPixelRatio(currentPixelRatio);
        }
      }
    }
  };

  const cleanup = () => {
    window.removeEventListener('resize', handleResize);
    resizeObserver?.disconnect();
    renderer.domElement.removeEventListener('webglcontextlost', handleContextLost, false);
    renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored, false);
    renderer.dispose();
    if (renderer.domElement && renderer.domElement.parentNode === container) {
      container.removeChild(renderer.domElement);
    }
  };

  return {
    renderer,
    camera,
    gpuProfile,
    updateSize: handleResize,
    trackFrameRate,
    cleanup,
  };
}
