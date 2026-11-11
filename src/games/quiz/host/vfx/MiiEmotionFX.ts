import * as THREE from 'three';

/**
 * MiiEmotionFX
 * Procedural facial expressions, 3D sweat drop bursts, and emote particles for Mii avatars.
 * Supports Volleyball (Dig, Set, Spike, Drop, Win) and Tug-of-War (Pull, Strain, Victory, Defeat).
 *
 * Derived from Gemini Argon Games (Argon Tennis mii_facial_fx engine).
 */

export type FacialState =
  | 'neutral'
  | 'focused_squint'
  | 'effort_shout'
  | 'wide_eyed_panic'
  | 'happy_grin'
  | 'shocked_loss';

export interface DynamicFaceRig {
  id: string;
  headNode: THREE.Object3D;
  faceGroup: THREE.Group;
  leftEye: {
    openNode: THREE.Group;
    pupilNode: THREE.Group;
    lidMesh: THREE.Mesh;
    blinkBarMesh: THREE.Mesh;
    happyArc: THREE.Group;
    shockX: THREE.Group;
  };
  rightEye: {
    openNode: THREE.Group;
    pupilNode: THREE.Group;
    lidMesh: THREE.Mesh;
    blinkBarMesh: THREE.Mesh;
    happyArc: THREE.Group;
    shockX: THREE.Group;
  };
  leftBrow: THREE.Group;
  rightBrow: THREE.Group;
  mouthNeutral: THREE.Object3D;
  mouthShout: THREE.Group;
  mouthGrin: THREE.Group;
  mouthWavy: THREE.Group;
  cheeks: THREE.MeshBasicMaterial;
  state: FacialState;
  stateTimer: number;
  blinkTimer: number;
  blinkActiveTimer: number;
}

export class MiiEmotionFX {
  private scene: THREE.Scene;
  private faceRigs: Map<string, DynamicFaceRig> = new Map();

  // 3D Sweat Drops Pool
  private sweatDrops: Array<{
    mesh: THREE.Group;
    vel: THREE.Vector3;
    age: number;
    maxAge: number;
    active: boolean;
  }> = [];

  // Emote Particles Pool (Stars, Notes, Exclamations)
  private emoteParticles: Array<{
    mesh: THREE.Group;
    vel: THREE.Vector3;
    rotVel: number;
    age: number;
    maxAge: number;
    active: boolean;
  }> = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.initSweatPool();
    this.initEmotePool();
  }

  // ---------------------------------------------------------------------------
  // Sweat & Emote Particle Pools
  // ---------------------------------------------------------------------------
  private initSweatPool() {
    for (let i = 0; i < 24; i++) {
      const dropGroup = new THREE.Group();
      const dropMat = new THREE.MeshStandardMaterial({
        color: 0x5eead4,
        emissive: 0x14b8a6,
        emissiveIntensity: 0.35,
        roughness: 0.15,
        metalness: 0.05,
        transparent: true,
        opacity: 0.92,
      });

      // Sphere base + cone tip (teardrop shape)
      const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), dropMat);
      sphere.position.y = -0.015;
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.042, 0.08, 10), dropMat);
      cone.position.y = 0.025;

      dropGroup.add(sphere, cone);
      dropGroup.visible = false;
      this.scene.add(dropGroup);

      this.sweatDrops.push({
        mesh: dropGroup,
        vel: new THREE.Vector3(),
        age: 0,
        maxAge: 0.55,
        active: false,
      });
    }
  }

  private initEmotePool() {
    for (let i = 0; i < 18; i++) {
      const group = new THREE.Group();
      const isStar = i % 2 === 0;

      if (isStar) {
        // Star Emote
        const starMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
        const starMesh1 = new THREE.Mesh(new THREE.OctahedronGeometry(0.08, 0), starMat);
        starMesh1.scale.set(1.2, 1.2, 0.4);
        const starMesh2 = starMesh1.clone();
        starMesh2.rotation.z = Math.PI / 4;
        group.add(starMesh1, starMesh2);
      } else {
        // Music Note Emote
        const noteMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
        const noteHead = new THREE.Mesh(new THREE.SphereGeometry(0.042, 8, 8), noteMat);
        noteHead.scale.set(1.3, 0.9, 0.6);
        noteHead.position.set(-0.02, -0.04, 0);
        noteHead.rotation.z = 0.35;

        const noteStem = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.11, 0.016), noteMat);
        noteStem.position.set(0.015, 0.015, 0);

        const noteFlag = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.02, 0.016), noteMat);
        noteFlag.position.set(0.035, 0.055, 0);
        noteFlag.rotation.z = -0.35;

        group.add(noteHead, noteStem, noteFlag);
      }

      group.visible = false;
      this.scene.add(group);

      this.emoteParticles.push({
        mesh: group,
        vel: new THREE.Vector3(),
        rotVel: (Math.random() - 0.5) * 6.0,
        age: 0,
        maxAge: 0.85,
        active: false,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Attach Dynamic Face Rig to Head Node (Argon Tennis Mii Overhaul Standard)
  // ---------------------------------------------------------------------------
  public attachFaceRig(id: string, headNode: THREE.Object3D, hairColor = 0x2a1708): DynamicFaceRig {
    if (this.faceRigs.has(id)) {
      return this.faceRigs.get(id)!;
    }

    let centerY = 0.18;
    let detectedSkinColor = 0xffeed9;
    let detectedHairColor = hairColor;

    // 1. Inspect head sub-meshes: detect skin center Y & hide static baked pupil/mouth/tongue
    headNode.traverse((c) => {
      if (!(c as THREE.Mesh).isMesh) return;
      const mesh = c as THREE.Mesh;
      const mat = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.MeshStandardMaterial | undefined;
      const matName = mat?.name || '';
      const meshName = mesh.name || '';

      if (/Skin/i.test(matName) && mesh.geometry) {
        mesh.geometry.computeBoundingBox();
        const box = mesh.geometry.boundingBox;
        if (box) {
          centerY = (box.min.y + box.max.y) * 0.5;
        }
        if (mat?.color) {
          detectedSkinColor = mat.color.getHex();
        }
      } else if (
        /EyeDark|Mouth|Tongue/i.test(matName) ||
        /EyePupil|Smile|Mouth|Tongue/i.test(meshName)
      ) {
        mesh.visible = false;
      }
    });

    // 2. Tuck static baked eyebrows (on Hair mesh) and static eye whites (on White mesh) inside skull
    headNode.traverse((c) => {
      if (!(c as THREE.Mesh).isMesh) return;
      const mesh = c as THREE.Mesh;
      const mat = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.MeshStandardMaterial | undefined;
      const matName = mat?.name || '';

      if (/Hair/i.test(matName)) {
        if (mat?.color) {
          detectedHairColor = mat.color.getHex();
        }
        if (mesh.geometry && !mesh.userData.staticBrowsTucked) {
          const clonedGeo = mesh.geometry.clone();
          const posAttr = clonedGeo.attributes.position;
          if (posAttr) {
            for (let g = 0; g < posAttr.count; g++) {
              const x = posAttr.getX(g);
              const y = posAttr.getY(g);
              const z = posAttr.getZ(g);
              if (
                Math.abs(x) > 0.024 &&
                Math.abs(x) < 0.156 &&
                y > centerY + 0.018 &&
                y < centerY + 0.092 &&
                z > 0.172
              ) {
                posAttr.setXYZ(g, 0, centerY, 0);
              }
            }
            posAttr.needsUpdate = true;
          }
          mesh.geometry = clonedGeo;
          mesh.userData.staticBrowsTucked = true;
        }
      } else if (/White/i.test(matName) && mesh.geometry && !mesh.userData.staticEyesTucked) {
        const clonedGeo = mesh.geometry.clone();
        const posAttr = clonedGeo.attributes.position;
        if (posAttr) {
          for (let g = 0; g < posAttr.count; g++) {
            const x = posAttr.getX(g);
            const y = posAttr.getY(g);
            const z = posAttr.getZ(g);
            if (z > 0.195 && y < centerY + 0.066 && Math.abs(x) < 0.145) {
              posAttr.setXYZ(g, 0, centerY, 0);
            }
          }
          posAttr.needsUpdate = true;
        }
        mesh.geometry = clonedGeo;
        mesh.userData.staticEyesTucked = true;
      }
    });

    const faceGroup = new THREE.Group();
    faceGroup.name = `MiiFace_${id}`;
    faceGroup.position.set(0, centerY, 0);
    headNode.add(faceGroup);

    const whiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x121318 });
    const browMat = new THREE.MeshStandardMaterial({ color: detectedHairColor, roughness: 0.45, metalness: 0.05 });
    const skinMat = new THREE.MeshStandardMaterial({ color: detectedSkinColor, roughness: 0.48, metalness: 0 });
    const blushMat = new THREE.MeshBasicMaterial({
      color: 0xff6b7b,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    });
    const mouthDarkMat = new THREE.MeshBasicMaterial({ color: 0x521128 });
    const tongueMat = new THREE.MeshBasicMaterial({ color: 0xff6e7a });

    // Eye Builder Helper
    const buildEye = (sideX: number) => {
      const eyeGroup = new THREE.Group();
      eyeGroup.position.set(sideX * 0.08, 0.032, 0.218);

      // Open Eye: White Sclera + Pupil + Dual Catchlights
      const openNode = new THREE.Group();
      const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.038, 18, 14), whiteMat);
      sclera.scale.set(1.06, 1.18, 0.42);

      const pupilNode = new THREE.Group();
      pupilNode.position.set(sideX * -0.003, 0, 0.011);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.026, 16, 12), pupilMat);
      pupil.scale.set(0.96, 1.12, 0.38);
      pupilNode.add(pupil);

      const highlightBig = new THREE.Mesh(new THREE.SphereGeometry(0.0095, 10, 8), whiteMat);
      highlightBig.position.set(-0.008, 0.011, 0.01);
      pupilNode.add(highlightBig);

      const highlightSmall = new THREE.Mesh(new THREE.SphereGeometry(0.005, 8, 6), whiteMat);
      highlightSmall.position.set(0.007, -0.009, 0.01);
      pupilNode.add(highlightSmall);

      // Eyelid for squinting
      const lidMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.04, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.52),
        skinMat
      );
      lidMesh.scale.set(1.08, 1.18, 0.46);
      lidMesh.visible = false;

      openNode.add(sclera, pupilNode, lidMesh);

      // Blink horizontal bar
      const blinkBarMesh = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.012, 0.016), pupilMat);
      blinkBarMesh.position.set(0, 0, 0.012);
      blinkBarMesh.visible = false;

      // Happy Curved Arc (^_^)
      const happyArc = new THREE.Group();
      happyArc.position.set(0, -0.004, 0.014);
      const arcMesh = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.0075, 8, 18, Math.PI * 0.85), pupilMat);
      arcMesh.rotation.z = Math.PI * 0.075;
      happyArc.add(arcMesh);
      happyArc.visible = false;

      // Shock X (><)
      const shockX = new THREE.Group();
      shockX.position.set(0, 0.002, 0.014);
      const bar1 = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.013, 0.014), pupilMat);
      bar1.rotation.z = 0.68;
      const bar2 = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.013, 0.014), pupilMat);
      bar2.rotation.z = -0.68;
      shockX.add(bar1, bar2);
      shockX.visible = false;

      eyeGroup.add(openNode, blinkBarMesh, happyArc, shockX);
      faceGroup.add(eyeGroup);

      return { openNode, pupilNode, lidMesh, blinkBarMesh, happyArc, shockX };
    };

    const leftEye = buildEye(-1);
    const rightEye = buildEye(1);

    // Brows
    const buildBrow = (sideX: number) => {
      const browGroup = new THREE.Group();
      browGroup.position.set(sideX * 0.082, 0.092, 0.219);
      const brow = new THREE.Mesh(new THREE.BoxGeometry(0.076, 0.018, 0.022), browMat);
      browGroup.add(brow);
      faceGroup.add(browGroup);
      return browGroup;
    };

    const leftBrow = buildBrow(-1);
    const rightBrow = buildBrow(1);

    // Mouth Varieties
    const mouthGroup = new THREE.Group();
    mouthGroup.position.set(0, -0.078, 0.233);
    faceGroup.add(mouthGroup);

    // 1. Neutral smile with upper teeth accent
    const mouthNeutral = new THREE.Group();
    const neutralLip = new THREE.Mesh(new THREE.BoxGeometry(0.086, 0.024, 0.016), mouthDarkMat);
    const neutralTeeth = new THREE.Mesh(new THREE.BoxGeometry(0.074, 0.011, 0.018), whiteMat);
    neutralTeeth.position.set(0, 0.005, 0.002);
    mouthNeutral.add(neutralLip, neutralTeeth);
    mouthGroup.add(mouthNeutral);

    // 2. Effort shout / O-mouth
    const mouthShout = new THREE.Group();
    const shoutBase = new THREE.Mesh(new THREE.SphereGeometry(0.042, 14, 10), mouthDarkMat);
    shoutBase.scale.set(1.1, 1.25, 0.35);
    const shoutTongue = new THREE.Mesh(new THREE.SphereGeometry(0.025, 10, 8), tongueMat);
    shoutTongue.position.set(0, -0.014, 0.005);
    mouthShout.add(shoutBase, shoutTongue);
    mouthShout.visible = false;
    mouthGroup.add(mouthShout);

    // 3. Wide Happy Grin
    const mouthGrin = new THREE.Group();
    const grinBase = new THREE.Mesh(
      new THREE.SphereGeometry(0.048, 16, 10, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5),
      mouthDarkMat
    );
    grinBase.scale.set(1.15, 0.9, 0.35);
    const grinTeeth = new THREE.Mesh(new THREE.BoxGeometry(0.082, 0.012, 0.014), whiteMat);
    grinTeeth.position.set(0, 0.002, 0.005);
    mouthGrin.add(grinBase, grinTeeth);
    mouthGrin.visible = false;
    mouthGroup.add(mouthGrin);

    // 4. Wavy Shock Mouth (~)
    const mouthWavy = new THREE.Group();
    for (let c = -1; c <= 1; c++) {
      const seg = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.012, 0.016), pupilMat);
      seg.position.set(c * 0.025, c === 0 ? 0.005 : -0.005, 0);
      seg.rotation.z = c === -1 ? 0.32 : c === 1 ? -0.32 : 0;
      mouthWavy.add(seg);
    }
    mouthWavy.visible = false;
    mouthGroup.add(mouthWavy);

    // Blushing Cheeks
    for (const c of [-1, 1]) {
      const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 8), blushMat);
      cheek.position.set(c * 0.128, -0.024, 0.205);
      cheek.scale.set(1.25, 0.75, 0.25);
      faceGroup.add(cheek);
    }

    const rig: DynamicFaceRig = {
      id,
      headNode,
      faceGroup,
      leftEye,
      rightEye,
      leftBrow,
      rightBrow,
      mouthNeutral,
      mouthShout,
      mouthGrin,
      mouthWavy,
      cheeks: blushMat,
      state: 'neutral',
      stateTimer: 0,
      blinkTimer: 2.5 + Math.random() * 2.0,
      blinkActiveTimer: 0,
    };

    this.faceRigs.set(id, rig);
    this.applyVisuals(rig);
    return rig;
  }

  // ---------------------------------------------------------------------------
  // Set Expression State
  // ---------------------------------------------------------------------------
  public setExpression(id: string, state: FacialState, durationSec = 1.2) {
    const rig = this.faceRigs.get(id);
    if (!rig) return;

    rig.state = state;
    rig.stateTimer = durationSec;
    this.applyVisuals(rig);
  }

  public setTeamExpression(team: 'red' | 'white', state: FacialState, durationSec = 1.5) {
    this.faceRigs.forEach((rig, id) => {
      if (id.includes(team)) {
        this.setExpression(id, state, durationSec);
      }
    });
  }

  public setAllExpression(state: FacialState, durationSec = 1.5) {
    this.faceRigs.forEach((rig, id) => {
      this.setExpression(id, state, durationSec);
    });
  }

  private applyVisuals(rig: DynamicFaceRig) {
    const s = rig.state;
    const isBlinking = rig.blinkActiveTimer > 0 && s === 'neutral';

    // Reset Eyes
    for (const eye of [rig.leftEye, rig.rightEye]) {
      eye.openNode.visible = s !== 'happy_grin' && s !== 'shocked_loss' && !isBlinking;
      eye.blinkBarMesh.visible = isBlinking;
      eye.happyArc.visible = s === 'happy_grin';
      eye.shockX.visible = s === 'shocked_loss';
      eye.lidMesh.visible = s === 'focused_squint';

      if (s === 'wide_eyed_panic') {
        eye.openNode.scale.set(1.25, 1.3, 1.0);
        eye.pupilNode.scale.set(0.48, 0.48, 1.0);
      } else {
        eye.openNode.scale.set(1.0, 1.0, 1.0);
        eye.pupilNode.scale.set(1.0, 1.0, 1.0);
      }
    }

    // Reset Mouths
    rig.mouthNeutral.visible = s === 'neutral' || s === 'focused_squint';
    rig.mouthShout.visible = s === 'effort_shout' || s === 'wide_eyed_panic';
    rig.mouthGrin.visible = s === 'happy_grin';
    rig.mouthWavy.visible = s === 'shocked_loss';

    // Brows
    if (s === 'effort_shout' || s === 'focused_squint') {
      rig.leftBrow.rotation.z = -0.35;
      rig.rightBrow.rotation.z = 0.35;
      rig.leftBrow.position.y = 0.085;
      rig.rightBrow.position.y = 0.085;
    } else if (s === 'wide_eyed_panic') {
      rig.leftBrow.rotation.z = 0.38;
      rig.rightBrow.rotation.z = -0.38;
      rig.leftBrow.position.y = 0.11;
      rig.rightBrow.position.y = 0.11;
    } else if (s === 'shocked_loss') {
      rig.leftBrow.rotation.z = 0.42;
      rig.rightBrow.rotation.z = -0.42;
      rig.leftBrow.position.y = 0.09;
      rig.rightBrow.position.y = 0.09;
    } else {
      rig.leftBrow.rotation.z = 0;
      rig.rightBrow.rotation.z = 0;
      rig.leftBrow.position.y = 0.095;
      rig.rightBrow.position.y = 0.095;
    }

    // Cheek Blush intensity
    rig.cheeks.opacity = s === 'happy_grin' ? 0.65 : s === 'effort_shout' ? 0.45 : 0.22;
  }

  // ---------------------------------------------------------------------------
  // Sweat Drops & Emote Particle Triggers
  // ---------------------------------------------------------------------------
  public spawnSweatDrops(position: THREE.Vector3, count = 4) {
    let spawned = 0;
    for (let i = 0; i < this.sweatDrops.length && spawned < count; i++) {
      const drop = this.sweatDrops[i];
      if (drop.active) continue;

      drop.active = true;
      drop.age = 0;
      drop.maxAge = 0.48 + Math.random() * 0.2;

      const side = (spawned % 2 === 0 ? 1 : -1) * (0.24 + Math.random() * 0.06);
      drop.mesh.position.set(
        position.x + side,
        position.y + 1.45 + Math.random() * 0.1,
        position.z + (Math.random() - 0.5) * 0.1
      );

      drop.vel.set(
        side * (1.8 + Math.random() * 0.8),
        1.8 + Math.random() * 1.2,
        (Math.random() - 0.5) * 0.8
      );

      drop.mesh.scale.setScalar(0.9 + Math.random() * 0.3);
      drop.mesh.visible = true;
      spawned++;
    }
  }

  public triggerEmoteBurst(position: THREE.Vector3, count = 5) {
    let spawned = 0;
    for (let i = 0; i < this.emoteParticles.length && spawned < count; i++) {
      const emote = this.emoteParticles[i];
      if (emote.active) continue;

      emote.active = true;
      emote.age = 0;
      emote.maxAge = 0.8 + Math.random() * 0.3;

      const angle = (spawned / count) * Math.PI * 2;
      const radius = 0.28 + Math.random() * 0.1;

      emote.mesh.position.set(
        position.x + Math.cos(angle) * radius,
        position.y + 1.85 + Math.random() * 0.15,
        position.z + Math.sin(angle) * radius
      );

      emote.vel.set(
        Math.cos(angle) * 0.3,
        0.8 + Math.random() * 0.4,
        Math.sin(angle) * 0.3
      );

      emote.mesh.scale.setScalar(1.0);
      emote.mesh.visible = true;
      spawned++;
    }
  }

  // ---------------------------------------------------------------------------
  // Frame Update Loop
  // ---------------------------------------------------------------------------
  public update(dt: number) {
    // 1. Update Rigs (State timer expiration & blinking)
    this.faceRigs.forEach((rig) => {
      if (rig.state !== 'neutral') {
        rig.stateTimer -= dt;
        if (rig.stateTimer <= 0) {
          rig.state = 'neutral';
          this.applyVisuals(rig);
        }
      } else {
        // Natural blink animation
        if (rig.blinkActiveTimer > 0) {
          rig.blinkActiveTimer -= dt;
          if (rig.blinkActiveTimer <= 0) {
            rig.blinkTimer = 2.5 + Math.random() * 2.5;
            this.applyVisuals(rig);
          }
        } else {
          rig.blinkTimer -= dt;
          if (rig.blinkTimer <= 0) {
            rig.blinkActiveTimer = 0.12;
            this.applyVisuals(rig);
          }
        }
      }
    });

    // 2. Update Sweat Drops
    for (const drop of this.sweatDrops) {
      if (!drop.active) continue;
      drop.age += dt;
      const u = drop.age / drop.maxAge;

      if (u >= 1) {
        drop.active = false;
        drop.mesh.visible = false;
      } else {
        drop.vel.y -= 9.8 * dt; // Gravity
        drop.mesh.position.addScaledVector(drop.vel, dt);
        const scale = u < 0.2 ? 0.6 + (u / 0.2) * 0.4 : 1.0 * (1 - (u - 0.2) * 0.85);
        drop.mesh.scale.setScalar(Math.max(0.1, scale));
      }
    }

    // 3. Update Emote Particles
    for (const emote of this.emoteParticles) {
      if (!emote.active) continue;
      emote.age += dt;
      const u = emote.age / emote.maxAge;

      if (u >= 1) {
        emote.active = false;
        emote.mesh.visible = false;
      } else {
        emote.mesh.position.addScaledVector(emote.vel, dt);
        emote.mesh.rotation.y += emote.rotVel * dt;
        const scale = u < 0.2 ? u / 0.2 : 1.0 - (u - 0.2) / 0.8;
        emote.mesh.scale.setScalar(Math.max(0.05, scale));
      }
    }
  }

  public dispose() {
    const disposeObject = (obj: THREE.Object3D) => {
      obj.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          if (mesh.geometry) mesh.geometry.dispose();
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          mats.forEach((m) => m && m.dispose());
        }
      });
    };

    this.sweatDrops.forEach((d) => {
      this.scene.remove(d.mesh);
      disposeObject(d.mesh);
    });
    this.emoteParticles.forEach((e) => {
      this.scene.remove(e.mesh);
      disposeObject(e.mesh);
    });
    this.faceRigs.forEach((rig) => {
      disposeObject(rig.root);
    });
    this.faceRigs.clear();
    this.sweatDrops = [];
    this.emoteParticles = [];
  }
}
