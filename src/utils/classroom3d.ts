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
 * Enforces GEMINI.md §14 (Classroom 3D WebGL Performance Budget & Invariants).
 * ============================================================================
 */

import * as THREE from 'three';

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
}

export interface Classroom3DContext {
  renderer: THREE.WebGLRenderer;
  camera: THREE.PerspectiveCamera;
  gpuProfile: ClassroomGpuProfile;
  updateSize: () => void;
  /** Pass the frame delta (in seconds) to enable real-time 60 FPS Dynamic Resolution Scaling */
  trackFrameRate: (deltaSeconds: number) => void;
  cleanup: () => void;
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
    // Dynamic shadow passes are strictly disabled on iPads & low-power Dynabooks (GEMINI.md §14)
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
    return new THREE.CanvasTexture({} as HTMLCanvasElement);
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
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;

  container.appendChild(renderer.domElement);

  // Setup PerspectiveCamera
  const fov = options.fov ?? 40;
  const camera = new THREE.PerspectiveCamera(fov, width / height, options.near ?? 0.1, options.far ?? 300);
  const [posX, posY, posZ] = options.cameraPosition ?? [0, 4.4, 12.2];
  camera.position.set(posX, posY, posZ);
  const [lookX, lookY, lookZ] = options.cameraLookAt ?? [0, 2.0, 0];
  camera.lookAt(lookX, lookY, lookZ);

  // Resize Listener
  const handleResize = () => {
    if (!container) return;
    const w = container.clientWidth || 960;
    const h = container.clientHeight || 540;
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
