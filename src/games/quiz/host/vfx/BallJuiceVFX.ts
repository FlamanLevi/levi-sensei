import * as THREE from 'three';

/**
 * BallJuiceVFX
 * High-impact kinetic VFX for 3D sports (Volleyball, Tennis):
 * 1. Squash-and-Stretch elastic ball deformation along contact normal
 * 2. Hit-Stop freeze frame (35-48ms impact pause) for visceral weight
 * 3. Hardware-instanced 3D Cartoon Star particles & expanding shockwave rings (2 draw calls total)
 *
 * Derived from Gemini Argon Games (Argon Tennis swing_vfx engine).
 */

export interface BallDeformationState {
  active: boolean;
  age: number;
  duration: number;
  freq: number;
  damping: number;
  initialSquashY: number;
  initialExpandXZ: number;
  axis: THREE.Vector3;
  baseScale: number;
  isBounce: boolean;
}

export function createCartoonStarGeometry(outerRadius = 0.14, innerRadius = 0.06, depth = 0.04): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const points = 5;
  for (let i = 0; i < points * 2; i++) {
    const angle = (i * Math.PI) / points - Math.PI / 2;
    const r = i % 2 === 0 ? outerRadius : innerRadius;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();

  const geom = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.012,
    bevelThickness: 0.012,
  });
  geom.center();
  return geom;
}

const STAR_CAPACITY = 24;
const RING_CAPACITY = 8;
const STAR_COLOR_PALETTE = [0xfbbf24, 0xf43f5e, 0x38bdf8, 0xfacc15, 0xffffff] as const;

interface StarParticleState {
  pos: THREE.Vector3;
  rot: THREE.Euler;
  vel: THREE.Vector3;
  rotVel: THREE.Vector3;
  age: number;
  maxAge: number;
  baseScale: number;
  colorHex: number;
  active: boolean;
}

interface BounceRingState {
  x: number;
  z: number;
  age: number;
  duration: number;
  startScale: number;
  endScale: number;
  colorHex: number;
  active: boolean;
}

function applyInstancedOpacityMaterial(mat: THREE.MeshBasicMaterial, cacheKey: string): THREE.MeshBasicMaterial {
  (mat as unknown as { customProgramCacheKey: () => string }).customProgramCacheKey = () => cacheKey;
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aOpacity;\nvarying float vInstanceOpacity;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvInstanceOpacity = aOpacity;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vInstanceOpacity;')
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.a *= vInstanceOpacity;');
  };
  mat.needsUpdate = true;
  return mat;
}

export class BallJuiceVFX {
  private scene: THREE.Scene;
  private hitStopTimer: number = 0;
  private ballDeformation: BallDeformationState = {
    active: false,
    age: 0,
    duration: 0.18,
    freq: 42,
    damping: 14,
    initialSquashY: 0.65,
    initialExpandXZ: 1.35,
    axis: new THREE.Vector3(0, 1, 0),
    baseScale: 1.0,
    isBounce: false,
  };

  // Hoisted scratch objects (zero per-frame allocations)
  private tmpQuat = new THREE.Quaternion();
  private upVector = new THREE.Vector3(0, 1, 0);
  private tmpObj = new THREE.Object3D();
  private tmpMatrix = new THREE.Matrix4();
  private tmpColor = new THREE.Color();

  // Hardware-instanced Star Particles (24 slots -> 1 draw call)
  private starGeo!: THREE.BufferGeometry;
  private starMat!: THREE.MeshBasicMaterial;
  private starInst!: THREE.InstancedMesh;
  private starOpacityData!: Float32Array;
  private starOpacityAttr!: THREE.InstancedBufferAttribute;
  private starParticles: StarParticleState[] = [];

  // Hardware-instanced Shockwave Bounce Rings (8 slots -> 1 draw call)
  private ringGeo!: THREE.BufferGeometry;
  private ringMat!: THREE.MeshBasicMaterial;
  private ringInst!: THREE.InstancedMesh;
  private ringOpacityData!: Float32Array;
  private ringOpacityAttr!: THREE.InstancedBufferAttribute;
  private bounceRings: BounceRingState[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.initPools();
  }

  private initPools() {
    // 1. Star Particles InstancedMesh (Cartoon Extruded Stars in gold, rose, cyan, amber, white)
    this.starGeo = createCartoonStarGeometry(0.12, 0.05, 0.035);
    this.starOpacityData = new Float32Array(STAR_CAPACITY);
    this.starOpacityAttr = new THREE.InstancedBufferAttribute(this.starOpacityData, 1);
    this.starGeo.setAttribute('aOpacity', this.starOpacityAttr);

    this.starMat = applyInstancedOpacityMaterial(
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 1.0,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
      'ball_juice_instanced_star_v1'
    );

    this.starInst = new THREE.InstancedMesh(this.starGeo, this.starMat, STAR_CAPACITY);
    this.starInst.frustumCulled = false;
    this.starInst.count = 0;
    this.starInst.visible = false;

    for (let i = 0; i < STAR_CAPACITY; i++) {
      const colorHex = STAR_COLOR_PALETTE[i % STAR_COLOR_PALETTE.length];
      this.tmpColor.setHex(colorHex);
      this.starInst.setColorAt(i, this.tmpColor);
      this.starOpacityData[i] = 0;
      this.starParticles.push({
        pos: new THREE.Vector3(),
        rot: new THREE.Euler(),
        vel: new THREE.Vector3(),
        rotVel: new THREE.Vector3(),
        age: 0,
        maxAge: 0.45,
        baseScale: 1.0,
        colorHex,
        active: false,
      });
    }
    if (this.starInst.instanceColor) this.starInst.instanceColor.needsUpdate = true;
    this.scene.add(this.starInst);

    // 2. Shockwave Bounce Rings InstancedMesh
    this.ringGeo = new THREE.RingGeometry(0.15, 0.42, 32);
    this.ringGeo.rotateX(-Math.PI / 2);
    this.ringOpacityData = new Float32Array(RING_CAPACITY);
    this.ringOpacityAttr = new THREE.InstancedBufferAttribute(this.ringOpacityData, 1);
    this.ringGeo.setAttribute('aOpacity', this.ringOpacityAttr);

    this.ringMat = applyInstancedOpacityMaterial(
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 1.0,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
      'ball_juice_instanced_ring_v1'
    );

    this.ringInst = new THREE.InstancedMesh(this.ringGeo, this.ringMat, RING_CAPACITY);
    this.ringInst.frustumCulled = false;
    this.ringInst.count = 0;
    this.ringInst.visible = false;

    this.tmpColor.setHex(0xffffff);
    for (let i = 0; i < RING_CAPACITY; i++) {
      this.ringInst.setColorAt(i, this.tmpColor);
      this.ringOpacityData[i] = 0;
      this.bounceRings.push({
        x: 0,
        z: 0,
        age: 0,
        duration: 0.38,
        startScale: 0.6,
        endScale: 2.8,
        colorHex: 0xffffff,
        active: false,
      });
    }
    if (this.ringInst.instanceColor) this.ringInst.instanceColor.needsUpdate = true;
    this.scene.add(this.ringInst);
  }

  // ---------------------------------------------------------------------------
  // Hit-Stop Freeze Frame
  // ---------------------------------------------------------------------------
  public triggerHitStop(durationSec = 0.045) {
    this.hitStopTimer = Math.max(this.hitStopTimer, durationSec);
  }

  public isHitStopped(): boolean {
    return this.hitStopTimer > 0;
  }

  public consumeHitStop(dt: number): number {
    if (this.hitStopTimer > 0) {
      this.hitStopTimer = Math.max(0, this.hitStopTimer - dt);
      return 0; // Freeze motion this frame!
    }
    return dt;
  }

  // ---------------------------------------------------------------------------
  // Ball Squash & Stretch Deformation
  // ---------------------------------------------------------------------------
  public triggerBallDeformation(
    ballMesh: THREE.Mesh,
    type: 'hit' | 'bounce' = 'hit',
    normalVec?: THREE.Vector3,
    intensity = 1.0
  ) {
    if (!ballMesh) return;
    const isBounce = type === 'bounce';
    const def = this.ballDeformation;

    def.active = true;
    def.age = 0;
    def.duration = isBounce ? 0.22 : 0.18;
    def.freq = isBounce ? 36 : 44;
    def.damping = 13;
    def.isBounce = isBounce;
    def.baseScale = 1.0;

    const clampedIntensity = THREE.MathUtils.clamp(intensity, 0.75, 1.6);
    if (isBounce) {
      def.initialSquashY = 0.64;
      def.initialExpandXZ = 1.38;
      def.axis.set(0, 1, 0);
    } else {
      def.initialSquashY = THREE.MathUtils.clamp(1.0 - 0.38 * clampedIntensity, 0.52, 0.72);
      def.initialExpandXZ = THREE.MathUtils.clamp(1.0 + 0.44 * clampedIntensity, 1.28, 1.58);
      if (normalVec && normalVec.lengthSq() > 1e-4) {
        def.axis.copy(normalVec).normalize();
      } else {
        def.axis.set(0, 0, 1);
      }
    }

    if (!isBounce && def.axis.lengthSq() > 1e-4) {
      this.tmpQuat.setFromUnitVectors(this.upVector, def.axis);
      ballMesh.quaternion.copy(this.tmpQuat);
    }

    const squash = def.baseScale * def.initialSquashY;
    const expand = def.baseScale * def.initialExpandXZ;
    ballMesh.scale.set(expand, squash, expand);
  }

  public updateBallDeformation(ballMesh: THREE.Mesh, dt: number) {
    const def = this.ballDeformation;
    if (!def.active || !ballMesh) return;

    def.age += dt;
    if (def.age >= def.duration) {
      def.active = false;
      ballMesh.scale.set(def.baseScale, def.baseScale, def.baseScale);
      return;
    }

    const n = def.age;
    const env = Math.exp(-def.damping * n);
    const osc = Math.cos(def.freq * n);

    const deltaSquash = (1 - def.initialSquashY) * env * osc;
    const deltaExpand = (def.initialExpandXZ - 1) * env * osc;

    const currentY = def.baseScale * (1 - deltaSquash);
    const currentXZ = def.baseScale * (1 + deltaExpand);

    ballMesh.scale.set(currentXZ, currentY, currentXZ);
  }

  // ---------------------------------------------------------------------------
  // Particles: Cartoon Star Burst & Bounce Rings
  // ---------------------------------------------------------------------------
  public spawnStarBurst(origin: THREE.Vector3, count = 14, isPower = false) {
    let spawned = 0;
    const totalToSpawn = Math.min(count, this.starParticles.length);

    for (let i = 0; i < this.starParticles.length && spawned < totalToSpawn; i++) {
      const p = this.starParticles[i];
      if (p.active && i < this.starParticles.length - totalToSpawn) continue;

      p.active = true;
      p.age = 0;
      p.maxAge = (isPower ? 0.42 : 0.32) + Math.random() * 0.18;
      p.baseScale = (isPower ? 1.25 : 0.95) + Math.random() * 0.45;

      const angle = (spawned / totalToSpawn) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const speed = (isPower ? 4.8 : 3.2) + Math.random() * 2.5;

      p.vel.set(
        Math.cos(angle) * speed,
        Math.random() * 3.8 + (isPower ? 2.5 : 1.5),
        Math.sin(angle) * speed
      );

      p.rotVel.set(
        (Math.random() - 0.5) * 16,
        (Math.random() - 0.5) * 18,
        (Math.random() - 0.5) * 20
      );

      p.pos.copy(origin);
      p.rot.set(0, 0, 0);
      spawned++;
    }
  }

  public spawnBounceRing(x: number, z: number, colorHex = 0xffffff, scaleMultiplier = 1.0) {
    let ring: BounceRingState | undefined;
    for (let i = 0; i < this.bounceRings.length; i++) {
      if (!this.bounceRings[i].active) {
        ring = this.bounceRings[i];
        break;
      }
    }
    if (!ring) ring = this.bounceRings[0];
    if (!ring) return;

    ring.active = true;
    ring.age = 0;
    ring.x = x;
    ring.z = z;
    ring.startScale = 0.6 * scaleMultiplier;
    ring.endScale = 2.8 * scaleMultiplier;
    ring.colorHex = colorHex;
  }

  // ---------------------------------------------------------------------------
  // Frame Update Loop (Zero Per-Frame Allocations)
  // ---------------------------------------------------------------------------
  public update(dt: number, ballMesh?: THREE.Mesh) {
    if (ballMesh) {
      this.updateBallDeformation(ballMesh, dt);
    }

    // 1. Update & Compact Active Star Particles -> 1 InstancedMesh
    let activeStars = 0;
    for (let i = 0; i < this.starParticles.length; i++) {
      const p = this.starParticles[i];
      if (!p.active) continue;
      p.age += dt;
      const u = p.age / p.maxAge;

      if (u >= 1) {
        p.active = false;
        continue;
      }

      p.vel.y -= 9.8 * dt; // Gravity
      p.pos.addScaledVector(p.vel, dt);
      p.rot.x += p.rotVel.x * dt;
      p.rot.y += p.rotVel.y * dt;
      p.rot.z += p.rotVel.z * dt;

      const popScale = u < 0.15 ? 0.6 + (u / 0.15) * 0.45 : 1.05 * (1 - (u - 0.15) * 0.95);
      const s = Math.max(0.02, p.baseScale * popScale);

      this.tmpObj.position.copy(p.pos);
      this.tmpObj.rotation.copy(p.rot);
      this.tmpObj.scale.setScalar(s);
      this.tmpObj.updateMatrix();

      this.starInst.setMatrixAt(activeStars, this.tmpObj.matrix);
      this.tmpColor.setHex(p.colorHex);
      this.starInst.setColorAt(activeStars, this.tmpColor);
      this.starOpacityData[activeStars] = Math.max(0, 1.0 - Math.pow(u, 1.5));
      activeStars++;
    }
    this.starInst.count = activeStars;
    this.starInst.visible = activeStars > 0;
    if (activeStars > 0) {
      this.starInst.instanceMatrix.needsUpdate = true;
      if (this.starInst.instanceColor) this.starInst.instanceColor.needsUpdate = true;
      this.starOpacityAttr.needsUpdate = true;
    }

    // 2. Update & Compact Active Shockwave Rings -> 1 InstancedMesh
    let activeRings = 0;
    for (let i = 0; i < this.bounceRings.length; i++) {
      const r = this.bounceRings[i];
      if (!r.active) continue;
      r.age += dt;
      const u = r.age / r.duration;

      if (u >= 1) {
        r.active = false;
        continue;
      }

      const ease = 1 - Math.pow(1 - u, 2.2);
      const currentScale = THREE.MathUtils.lerp(r.startScale, r.endScale, ease);

      this.tmpMatrix.makeScale(currentScale, currentScale, currentScale);
      this.tmpMatrix.setPosition(r.x, 0.018, r.z);

      this.ringInst.setMatrixAt(activeRings, this.tmpMatrix);
      this.tmpColor.setHex(r.colorHex);
      this.ringInst.setColorAt(activeRings, this.tmpColor);
      this.ringOpacityData[activeRings] = (1 - u) * 0.92;
      activeRings++;
    }
    this.ringInst.count = activeRings;
    this.ringInst.visible = activeRings > 0;
    if (activeRings > 0) {
      this.ringInst.instanceMatrix.needsUpdate = true;
      if (this.ringInst.instanceColor) this.ringInst.instanceColor.needsUpdate = true;
      this.ringOpacityAttr.needsUpdate = true;
    }
  }

  public dispose() {
    this.scene.remove(this.starInst);
    this.scene.remove(this.ringInst);
    this.starInst.dispose();
    this.ringInst.dispose();
    this.starGeo.dispose();
    this.ringGeo.dispose();
    this.starMat.dispose();
    this.ringMat.dispose();
    this.starParticles = [];
    this.bounceRings = [];
  }
}
