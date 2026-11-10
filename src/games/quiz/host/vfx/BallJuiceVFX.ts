import * as THREE from 'three';

/**
 * BallJuiceVFX
 * High-impact kinetic VFX for 3D sports (Volleyball, Tennis):
 * 1. Squash-and-Stretch elastic ball deformation along contact normal
 * 2. Hit-Stop freeze frame (35-48ms impact pause) for visceral weight
 * 3. 3D Cartoon Star particles & expanding shockwave rings
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

  private tmpQuat = new THREE.Quaternion();
  private upVector = new THREE.Vector3(0, 1, 0);

  // Star Particles Pool
  private starParticles: Array<{
    mesh: THREE.Mesh;
    vel: THREE.Vector3;
    rotVel: THREE.Vector3;
    age: number;
    maxAge: number;
    baseScale: number;
    mat: THREE.MeshBasicMaterial;
    active: boolean;
  }> = [];

  // Shockwave Rings Pool
  private bounceRings: Array<{
    mesh: THREE.Mesh;
    age: number;
    duration: number;
    mat: THREE.MeshBasicMaterial;
    startScale: number;
    endScale: number;
    active: boolean;
  }> = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.initPools();
  }

  private initPools() {
    // 1. Star Particles (Cartoon Extruded Stars in gold, rose, cyan, and amber)
    const starGeo = createCartoonStarGeometry(0.12, 0.05, 0.035);
    const starColors = [0xfbbf24, 0xf43f5e, 0x38bdf8, 0xfacc15, 0xffffff];

    for (let i = 0; i < 24; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: starColors[i % starColors.length],
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(starGeo, mat);
      mesh.visible = false;
      this.scene.add(mesh);

      this.starParticles.push({
        mesh,
        vel: new THREE.Vector3(),
        rotVel: new THREE.Vector3(),
        age: 0,
        maxAge: 0.45,
        baseScale: 1.0,
        mat,
        active: false,
      });
    }

    // 2. Shockwave Bounce Rings
    const ringGeo = new THREE.RingGeometry(0.15, 0.42, 32);
    ringGeo.rotateX(-Math.PI / 2);

    for (let i = 0; i < 8; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(ringGeo, mat);
      mesh.position.y = 0.018;
      mesh.visible = false;
      this.scene.add(mesh);

      this.bounceRings.push({
        mesh,
        age: 0,
        duration: 0.38,
        mat,
        startScale: 0.6,
        endScale: 2.8,
        active: false,
      });
    }
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

      p.mesh.position.copy(origin);
      p.mesh.scale.setScalar(p.baseScale);
      p.mat.opacity = 1.0;
      p.mesh.visible = true;
      spawned++;
    }
  }

  public spawnBounceRing(x: number, z: number, colorHex = 0xffffff, scaleMultiplier = 1.0) {
    const ring = this.bounceRings.find((r) => !r.active) || this.bounceRings[0];
    if (!ring) return;

    ring.active = true;
    ring.age = 0;
    ring.mesh.position.set(x, 0.018, z);
    ring.mesh.scale.setScalar(ring.startScale * scaleMultiplier);
    ring.mat.color.setHex(colorHex);
    ring.mat.opacity = 0.95;
    ring.mesh.visible = true;
  }

  // ---------------------------------------------------------------------------
  // Frame Update Loop
  // ---------------------------------------------------------------------------
  public update(dt: number, ballMesh?: THREE.Mesh) {
    if (ballMesh) {
      this.updateBallDeformation(ballMesh, dt);
    }

    // Update Star Particles
    for (const p of this.starParticles) {
      if (!p.active) continue;
      p.age += dt;
      const u = p.age / p.maxAge;

      if (u >= 1) {
        p.active = false;
        p.mesh.visible = false;
      } else {
        p.vel.y -= 9.8 * dt; // Gravity
        p.mesh.position.addScaledVector(p.vel, dt);
        p.mesh.rotation.x += p.rotVel.x * dt;
        p.mesh.rotation.y += p.rotVel.y * dt;
        p.mesh.rotation.z += p.rotVel.z * dt;

        const popScale = u < 0.15 ? 0.6 + (u / 0.15) * 0.45 : 1.05 * (1 - (u - 0.15) * 0.95);
        p.mesh.scale.setScalar(Math.max(0.02, p.baseScale * popScale));
        p.mat.opacity = Math.max(0, 1.0 - Math.pow(u, 1.5));
      }
    }

    // Update Bounce Rings
    for (const r of this.bounceRings) {
      if (!r.active) continue;
      r.age += dt;
      const u = r.age / r.duration;

      if (u >= 1) {
        r.active = false;
        r.mesh.visible = false;
      } else {
        const ease = 1 - Math.pow(1 - u, 2.2);
        const currentScale = THREE.MathUtils.lerp(r.startScale, r.endScale, ease);
        r.mesh.scale.setScalar(currentScale);
        r.mat.opacity = (1 - u) * 0.92;
      }
    }
  }

  public dispose() {
    this.starParticles.forEach((p) => {
      p.mesh.geometry.dispose();
      p.mat.dispose();
      this.scene.remove(p.mesh);
    });
    this.bounceRings.forEach((r) => {
      r.mesh.geometry.dispose();
      r.mat.dispose();
      this.scene.remove(r.mesh);
    });
    this.starParticles = [];
    this.bounceRings = [];
  }
}
