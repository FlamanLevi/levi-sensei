/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ============================================================================
 * 3D Undokai Tamaire — Instanced Mii Thrower Pool & Callout Sprite Pool
 * ============================================================================
 */

import * as THREE from 'three';
import {
  THROWER_SKIN_TONES,
  THROWER_HAIR_COLORS,
  injectWiiSatinRimShader,
  applyInstancedAtlasMaterial,
  getFaceAtlasTexture,
  writeFaceAtlasRect,
  getZekkenBibAtlasTexture,
  writeZekkenAtlasRect,
  getBeanBagAtlasRect,
} from './tamaireTextures';
import { bakePartGeo, mergeBakedGeos } from './tamaireArenaBuilder';

export interface CalloutSlot {
  sprite: THREE.Sprite;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D | null;
  tex: THREE.CanvasTexture;
  mat: THREE.SpriteMaterial;
  ownerId: string | null;
  lastKey: string;
  timer: number;
}

export function createCalloutSpritePool(scene: THREE.Scene, maxSlots = 4) {
  const slots: CalloutSlot[] = [];
  for (let i = 0; i < maxSlots; i++) {
    const canvas = document.createElement('canvas');
    canvas.width = 420;
    canvas.height = 96;
    const ctx = canvas.getContext('2d');
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.generateMipmaps = false;
    tex.minFilter = THREE.LinearFilter;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(1.65, 0.39, 1);
    sprite.visible = false;
    sprite.renderOrder = 25;
    scene.add(sprite);
    slots.push({ sprite, canvas, ctx, tex, mat, ownerId: null, lastKey: '', timer: 0 });
  }

  const trigger = (
    ownerId: string,
    nickname: string,
    team: 'red' | 'white',
    duration: number,
    isGold = false,
    isMiss = false
  ) => {
    let slot: CalloutSlot | null = null;
    let freeSlot: CalloutSlot | null = null;
    let lowestSlot = slots[0];
    for (let i = 0; i < slots.length; i++) {
      const s = slots[i];
      if (s.ownerId === ownerId) {
        slot = s;
        break;
      }
      if (!freeSlot && (!s.sprite.visible || s.timer <= 0)) {
        freeSlot = s;
      }
      if (s.timer < lowestSlot.timer) {
        lowestSlot = s;
      }
    }
    if (!slot) slot = freeSlot || lowestSlot;

    const shortName = nickname.length > 10 ? `${nickname.slice(0, 9)}…` : nickname;
    const key = `${shortName}|${team}|${isGold ? 1 : 0}|${isMiss ? 1 : 0}`;
    if (slot.lastKey !== key && slot.ctx) {
      const ctx = slot.ctx;
      ctx.clearRect(0, 0, 420, 96);
      ctx.fillStyle = isMiss
        ? '#be123c'
        : isGold
          ? '#f59e0b'
          : team === 'red'
            ? '#e11d48'
            : '#0f172a';
      ctx.beginPath();
      ctx.roundRect(12, 12, 396, 72, 36);
      ctx.fill();

      ctx.strokeStyle = isMiss ? '#fbbf24' : isGold ? '#fef08a' : '#ffffff';
      ctx.lineWidth = 6;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 32px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const label = isMiss
        ? `💥 ${shortName} DOINK!`
        : `${shortName} ${isGold ? '🔥+2!' : '🎯+1!'}`;
      ctx.fillText(label, 210, 48);
      slot.tex.needsUpdate = true;
      slot.lastKey = key;
    }

    slot.ownerId = ownerId;
    slot.timer = duration;
    slot.sprite.visible = true;
  };

  const hideAll = () => {
    for (const s of slots) {
      s.timer = 0;
      s.sprite.visible = false;
      s.ownerId = null;
    }
  };

  const update = (dt: number, getAvatarPos: (ownerId: string) => THREE.Vector3 | null) => {
    for (const s of slots) {
      if (s.timer <= 0 || !s.ownerId) {
        s.sprite.visible = false;
        continue;
      }
      s.timer = Math.max(0, s.timer - dt);
      if (s.timer <= 0) {
        s.sprite.visible = false;
        s.ownerId = null;
        continue;
      }
      const base = getAvatarPos(s.ownerId);
      if (!base) {
        s.sprite.visible = false;
        continue;
      }
      const liftY = 1.55 + Math.max(0, 1.2 - s.timer) * 0.32;
      s.sprite.position.set(base.x, base.y + liftY, base.z);
    }
  };

  const dispose = () => {
    for (const s of slots) {
      scene.remove(s.sprite);
      s.tex.dispose();
      s.mat.dispose();
    }
  };

  return { trigger, hideAll, update, dispose };
}

export interface ThrowerAvatarRig {
  id: string;
  nickname: string;
  team: 'red' | 'white';
  root: THREE.Object3D;
  shadowAnchor: THREE.Object3D;
  bodyPivot: THREE.Object3D;
  headGroup: THREE.Object3D;
  hairTailGroup: THREE.Object3D | null;
  armL: THREE.Object3D;
  armR: THREE.Object3D;
  legL: THREE.Object3D;
  legR: THREE.Object3D;
  kneeLAnchor: THREE.Object3D;
  kneeRAnchor: THREE.Object3D;
  earLAnchor: THREE.Object3D;
  earRAnchor: THREE.Object3D;
  heldBagAnchor: THREE.Object3D;
  hairTuftAnchors: THREE.Object3D[];
  hairTieAnchors: THREE.Object3D[];
  heldBagVisible: boolean;
  bibIndex: number;
  skinIndex: number;
  exprIndex: number;
  hairColor: THREE.Color;
  skinColor: THREE.Color;
  hairStyle: number;
  usesCap: boolean;
  capColor: THREE.Color;
  hairTieColor: THREE.Color;
  ringTier: 0 | 1;
  baseAngle: number;
  radius: number;
  centerX: number;
  throwTimer: number;
  pickupPhase: number;
  heightScale: number;
}

export function createThrowerRig(
  team: 'red' | 'white',
  index: number,
  studentId: string,
  nickname: string,
  centerX: number,
  radius: number,
  angle: number,
  ringTier: 0 | 1,
  bibIndex: number
): ThrowerAvatarRig {
  const root = new THREE.Object3D();
  const x = centerX + Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;
  root.position.set(x, 0, z);
  const heightScale = 0.92 + ((index * 17) % 10) * 0.018;
  root.scale.setScalar(heightScale);

  const shadowAnchor = new THREE.Object3D();
  shadowAnchor.position.y = 0.015;
  shadowAnchor.rotation.x = -Math.PI / 2;
  root.add(shadowAnchor);

  const bodyPivot = new THREE.Object3D();
  const angleToBasket = Math.atan2(centerX - x, 0 - z);
  const sinCam = Math.sin(angleToBasket);
  const cosCam = Math.cos(angleToBasket) * 0.45 + 0.55;
  bodyPivot.rotation.y = Math.atan2(sinCam, cosCam);
  root.add(bodyPivot);

  const makeLegRig = (lx: number) => {
    const legGroup = new THREE.Object3D();
    legGroup.position.set(lx, 0.38, 0);
    const kneeAnchor = new THREE.Object3D();
    kneeAnchor.position.set(0, -0.15, 0);
    kneeAnchor.scale.setScalar(0.064);
    legGroup.add(kneeAnchor);
    return { legGroup, kneeAnchor };
  };
  const { legGroup: legL, kneeAnchor: kneeLAnchor } = makeLegRig(-0.115);
  const { legGroup: legR, kneeAnchor: kneeRAnchor } = makeLegRig(0.115);
  bodyPivot.add(legL, legR);

  const armL = new THREE.Object3D();
  armL.position.set(-0.25, 0.74, 0);
  const armR = new THREE.Object3D();
  armR.position.set(0.25, 0.74, 0);
  bodyPivot.add(armL, armR);

  const heldBagAnchor = new THREE.Object3D();
  heldBagAnchor.position.set(0, -0.35, 0.06);
  heldBagAnchor.scale.set(1.22, 0.75, 1.0);
  armR.add(heldBagAnchor);

  const headGroup = new THREE.Object3D();
  headGroup.position.y = 1.03;
  bodyPivot.add(headGroup);

  const earLAnchor = new THREE.Object3D();
  earLAnchor.position.set(-0.245, -0.01, 0);
  earLAnchor.scale.set(0.052 * 0.55, 0.052, 0.052 * 0.75);
  const earRAnchor = new THREE.Object3D();
  earRAnchor.position.set(0.245, -0.01, 0);
  earRAnchor.scale.set(0.052 * 0.55, 0.052, 0.052 * 0.75);
  headGroup.add(earLAnchor, earRAnchor);

  const hairStyle = index % 5;
  let hairTailGroup: THREE.Object3D | null = null;
  const hairTuftAnchors: THREE.Object3D[] = [];
  const hairTieAnchors: THREE.Object3D[] = [];

  if (hairStyle === 0) {
    hairTailGroup = new THREE.Object3D();
    headGroup.add(hairTailGroup);
    [-1, 1].forEach((side) => {
      const tie = new THREE.Object3D();
      tie.position.set(side * 0.25, 0.05, -0.06);
      tie.scale.setScalar(0.045);
      hairTailGroup!.add(tie);
      hairTieAnchors.push(tie);

      const tail = new THREE.Object3D();
      tail.position.set(side * 0.32, -0.05, -0.08);
      tail.rotation.set(0.2, 0, side * 2.45);
      tail.scale.set(0.085, 0.28, 0.085);
      hairTailGroup!.add(tail);
      hairTuftAnchors.push(tail);
    });
  } else if (hairStyle === 1) {
    hairTailGroup = new THREE.Object3D();
    hairTailGroup.position.set(0, 0.12, -0.24);
    headGroup.add(hairTailGroup);

    const tie = new THREE.Object3D();
    tie.scale.set(0.05, 0.05, 0.036);
    hairTailGroup.add(tie);
    hairTieAnchors.push(tie);

    const tail = new THREE.Object3D();
    tail.position.set(0, -0.06, -0.12);
    tail.rotation.x = -2.1;
    tail.scale.set(0.095, 0.32, 0.095);
    hairTailGroup.add(tail);
    hairTuftAnchors.push(tail);
  } else if (hairStyle === 2) {
    [
      [-0.14, 0.22, -0.08, 0.45],
      [0.14, 0.22, -0.08, -0.45],
      [0, 0.26, -0.14, 0],
    ].forEach(([sx, sy, sz, rz]) => {
      const spike = new THREE.Object3D();
      spike.position.set(sx, sy, sz);
      spike.rotation.set(-0.35, 0, rz);
      spike.scale.set(0.065, 0.16, 0.065);
      headGroup.add(spike);
      hairTuftAnchors.push(spike);
    });
  } else if (hairStyle === 3) {
    [-0.22, 0.22].forEach((bx) => {
      const lock = new THREE.Object3D();
      lock.position.set(bx, -0.03, 0.04);
      lock.rotation.z = bx > 0 ? -0.15 : 0.15;
      lock.scale.set(0.062, 0.22, 0.062);
      headGroup.add(lock);
      hairTuftAnchors.push(lock);
    });
  }

  const skinIndex = index % THROWER_SKIN_TONES.length;
  const hairHex = THROWER_HAIR_COLORS[(index * 3) % THROWER_HAIR_COLORS.length];

  return {
    id: studentId,
    nickname,
    team,
    root,
    shadowAnchor,
    bodyPivot,
    headGroup,
    hairTailGroup,
    armL,
    armR,
    legL,
    legR,
    kneeLAnchor,
    kneeRAnchor,
    earLAnchor,
    earRAnchor,
    heldBagAnchor,
    hairTuftAnchors,
    hairTieAnchors,
    heldBagVisible: true,
    bibIndex,
    skinIndex,
    exprIndex: index % 5,
    hairColor: new THREE.Color(hairHex),
    skinColor: new THREE.Color(THROWER_SKIN_TONES[skinIndex]),
    hairStyle,
    usesCap: index % 2 === 0,
    capColor: new THREE.Color(team === 'red' ? 0xe11d48 : 0xf8fafc),
    hairTieColor: new THREE.Color(team === 'red' ? 0xf43f5e : 0x38bdf8),
    ringTier,
    baseAngle: angle,
    radius,
    centerX,
    throwTimer: 0,
    pickupPhase: index * 1.15,
    heightScale,
  };
}

export function createThrowerBatchPool(
  scene: THREE.Scene,
  shadowTex: THREE.Texture | null,
  bagAtlasTex: THREE.Texture | null,
  enableShadows: boolean
) {
  const MAX_TEAM = 20;
  const MAX_STUDENTS = MAX_TEAM * 2;
  const whiteColor = new THREE.Color(0xffffff);
  const redTeamColor = new THREE.Color(0xe11d48);
  const whiteTeamColor = new THREE.Color(0x2563eb);
  const ownedGeos: THREE.BufferGeometry[] = [];
  const ownedMats: THREE.Material[] = [];
  const ownedInsts: THREE.InstancedMesh[] = [];

  const registerInst = (inst: THREE.InstancedMesh, capacity: number, initColor = false) => {
    inst.frustumCulled = false;
    inst.count = 0;
    if (initColor) {
      for (let i = 0; i < capacity; i++) inst.setColorAt(i, whiteColor);
      if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    }
    scene.add(inst);
    ownedInsts.push(inst);
    return inst;
  };

  // Unified team-tinted Wii satin rim material: aTeamMask=0 uses fixed vertex color, aTeamMask=1 uses instanceColor
  const teamTintRimMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.48 });
  teamTintRimMat.userData = { wiiRimInjected: true };
  (teamTintRimMat as unknown as { customProgramCacheKey: () => string }).customProgramCacheKey = () =>
    'wii_tamaire_team_tint_rim_0.30_0.12';
  teamTintRimMat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <color_pars_vertex>', '#include <color_pars_vertex>\nattribute float aTeamMask;')
      .replace(
        '#include <color_vertex>',
        `#include <color_vertex>
#if defined( USE_COLOR ) && defined( USE_INSTANCING_COLOR )
  vColor.rgb = mix( color.rgb, instanceColor.rgb, aTeamMask );
#endif`
      );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <opaque_fragment>',
      `
      vec3 wiiViewDir = normalize( vViewPosition );
      vec3 wiiNormal = normalize( vNormal );
      float wiiRim = pow( 1.0 - max( dot( wiiNormal, wiiViewDir ), 0.0 ), 2.5 ) * 0.300;
      float wiiHemiTop = clamp( wiiNormal.y * 0.5 + 0.5, 0.0, 1.0 ) * 0.120;
      vec3 wiiRimTint = vec3( 1.0, 0.985, 0.93 );
      outgoingLight += wiiRimTint * wiiRim + diffuseColor.rgb * wiiHemiTop;
      #include <opaque_fragment>
      `
    );
  };
  teamTintRimMat.needsUpdate = true;
  ownedMats.push(teamTintRimMat);

  // 1. Contact shadows
  const shadowGeo = new THREE.PlaneGeometry(0.92, 0.92);
  ownedGeos.push(shadowGeo);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTex || undefined,
    color: shadowTex ? 0xffffff : 0x261a0e,
    transparent: true,
    opacity: shadowTex ? 0.85 : 0.35,
    depthWrite: false,
  });
  ownedMats.push(shadowMat);
  const shadowInst = registerInst(new THREE.InstancedMesh(shadowGeo, shadowMat, MAX_STUDENTS), MAX_STUDENTS);

  // 2. Unified Torso (both Red & White teams via aTeamMask + instanceColor)
  const torsoGeo = mergeBakedGeos([
    bakePartGeo(new THREE.SphereGeometry(0.21, 12, 10), {
      color: 0x1e293b,
      teamMask: 0,
      pos: [0, 0.37, 0],
      scale: [1.02, 0.62, 0.88],
    }),
    bakePartGeo(new THREE.CylinderGeometry(0.185, 0.215, 0.44, 16), {
      color: 0xffffff,
      teamMask: 0,
      pos: [0, 0.58, 0],
      scale: [1.06, 1, 0.86],
    }),
    bakePartGeo(new THREE.SphereGeometry(0.088, 10, 8), {
      color: 0xffffff,
      teamMask: 0,
      pos: [-0.21, 0.74, 0],
    }),
    bakePartGeo(new THREE.SphereGeometry(0.088, 10, 8), {
      color: 0xffffff,
      teamMask: 0,
      pos: [0.21, 0.74, 0],
    }),
    bakePartGeo(new THREE.TorusGeometry(0.138, 0.03, 8, 18), {
      color: 0xffffff,
      teamMask: 1,
      pos: [0, 0.79, 0],
      rot: [Math.PI / 2, 0, 0],
    }),
  ]);
  ownedGeos.push(torsoGeo);
  const torsoInst = registerInst(
    new THREE.InstancedMesh(torsoGeo, teamTintRimMat, MAX_STUDENTS),
    MAX_STUDENTS,
    true
  );
  torsoInst.castShadow = enableShadows;

  // 3. Zekken Bibs
  const bibTex = getZekkenBibAtlasTexture();
  const bibGeo = mergeBakedGeos([
    bakePartGeo(new THREE.PlaneGeometry(0.24, 0.24), { pos: [0, 0.58, 0.188], keepUv: true }),
    bakePartGeo(new THREE.PlaneGeometry(0.24, 0.24), {
      pos: [0, 0.58, -0.188],
      rot: [0, Math.PI, 0],
      keepUv: true,
    }),
  ]);
  const bibAtlasData = new Float32Array(MAX_STUDENTS * 4);
  const bibAtlasAttr = new THREE.InstancedBufferAttribute(bibAtlasData, 4);
  bibGeo.setAttribute('aAtlasRect', bibAtlasAttr);
  ownedGeos.push(bibGeo);
  const bibMat = applyInstancedAtlasMaterial(
    new THREE.MeshStandardMaterial({ map: bibTex || undefined, color: 0xffffff, roughness: 0.55 }),
    false
  );
  ownedMats.push(bibMat);
  const bibInst = registerInst(new THREE.InstancedMesh(bibGeo, bibMat, MAX_STUDENTS), MAX_STUDENTS);

  // 4. Unified Legs (both Red & White teams via aTeamMask + instanceColor)
  const legGeo = mergeBakedGeos([
    bakePartGeo(new THREE.CylinderGeometry(0.095, 0.086, 0.16, 12), {
      color: 0x1e293b,
      teamMask: 0,
      pos: [0, -0.06, 0],
    }),
    bakePartGeo(new THREE.CylinderGeometry(0.066, 0.058, 0.14, 10), {
      color: 0xffffff,
      teamMask: 0,
      pos: [0, -0.24, 0],
    }),
    bakePartGeo(new THREE.TorusGeometry(0.064, 0.01, 6, 14), {
      color: 0xffffff,
      teamMask: 1,
      pos: [0, -0.19, 0],
      rot: [Math.PI / 2, 0, 0],
    }),
    bakePartGeo(new THREE.SphereGeometry(0.075, 10, 8), {
      color: 0xffffff,
      teamMask: 1,
      pos: [0, -0.32, 0.03],
      scale: [0.95, 0.65, 1.45],
    }),
    bakePartGeo(new THREE.CylinderGeometry(0.072, 0.075, 0.032, 10), {
      color: 0xf8fafc,
      teamMask: 0,
      pos: [0, -0.35, 0.03],
      scale: [0.95, 1, 1.45],
    }),
  ]);
  ownedGeos.push(legGeo);
  const legInst = registerInst(
    new THREE.InstancedMesh(legGeo, teamTintRimMat, MAX_STUDENTS * 2),
    MAX_STUDENTS * 2,
    true
  );
  legInst.castShadow = enableShadows;

  // 5. Shared Skin Spheres (knees + ears)
  const skinMat = injectWiiSatinRimShader(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.42 }));
  ownedMats.push(skinMat);
  const skinSphereGeo = new THREE.SphereGeometry(1, 8, 8);
  ownedGeos.push(skinSphereGeo);
  const skinSphereInst = registerInst(
    new THREE.InstancedMesh(skinSphereGeo, skinMat, MAX_STUDENTS * 4),
    MAX_STUDENTS * 4,
    true
  );

  // 6. Unified Arm Sleeves + Forearm/Hand Skin
  const sleeveGeo = mergeBakedGeos([
    bakePartGeo(new THREE.CylinderGeometry(0.074, 0.068, 0.15, 10), {
      color: 0xffffff,
      teamMask: 0,
      pos: [0, -0.05, 0],
    }),
    bakePartGeo(new THREE.TorusGeometry(0.068, 0.012, 6, 14), {
      color: 0xffffff,
      teamMask: 1,
      pos: [0, -0.12, 0],
      rot: [Math.PI / 2, 0, 0],
    }),
  ]);
  ownedGeos.push(sleeveGeo);
  const sleeveInst = registerInst(
    new THREE.InstancedMesh(sleeveGeo, teamTintRimMat, MAX_STUDENTS * 2),
    MAX_STUDENTS * 2,
    true
  );

  const armSkinGeo = mergeBakedGeos([
    bakePartGeo(new THREE.CylinderGeometry(0.052, 0.048, 0.21, 10), { pos: [0, -0.19, 0] }),
    bakePartGeo(new THREE.SphereGeometry(0.064, 10, 10), { pos: [0, -0.31, 0] }),
  ]);
  ownedGeos.push(armSkinGeo);
  const armSkinInst = registerInst(
    new THREE.InstancedMesh(armSkinGeo, skinMat, MAX_STUDENTS * 2),
    MAX_STUDENTS * 2,
    true
  );

  // 7. Held Bean Bags
  const heldBagGeo = new THREE.SphereGeometry(0.115, 10, 8);
  const heldBagAtlasData = new Float32Array(MAX_STUDENTS * 4);
  const heldBagAtlasAttr = new THREE.InstancedBufferAttribute(heldBagAtlasData, 4);
  heldBagGeo.setAttribute('aAtlasRect', heldBagAtlasAttr);
  ownedGeos.push(heldBagGeo);
  const bagAtlasMat = applyInstancedAtlasMaterial(
    new THREE.MeshStandardMaterial({ map: bagAtlasTex || undefined, color: 0xffffff, roughness: 0.6 }),
    true
  );
  ownedMats.push(bagAtlasMat);
  const heldBagInst = registerInst(new THREE.InstancedMesh(heldBagGeo, bagAtlasMat, MAX_STUDENTS), MAX_STUDENTS);

  // 8. Mii Heads (Face Atlas)
  const faceAtlasTex = getFaceAtlasTexture();
  const headGeo = new THREE.SphereGeometry(0.245, 22, 18);
  headGeo.rotateY(-Math.PI / 2);
  headGeo.scale(1.04, 0.98, 1.0);
  const headAtlasData = new Float32Array(MAX_STUDENTS * 4);
  const headAtlasAttr = new THREE.InstancedBufferAttribute(headAtlasData, 4);
  headGeo.setAttribute('aAtlasRect', headAtlasAttr);
  ownedGeos.push(headGeo);
  const headMat = applyInstancedAtlasMaterial(
    new THREE.MeshStandardMaterial({ map: faceAtlasTex || undefined, color: 0xffffff, roughness: 0.4 }),
    true
  );
  ownedMats.push(headMat);
  const headInst = registerInst(new THREE.InstancedMesh(headGeo, headMat, MAX_STUDENTS), MAX_STUDENTS);
  headInst.castShadow = enableShadows;

  // 9. Hair Base
  const hairBaseParts: THREE.BufferGeometry[] = [
    bakePartGeo(new THREE.SphereGeometry(0.256, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.56), {
      rot: [-0.28, 0, 0],
    }),
  ];
  for (let b = -2; b <= 2; b++) {
    hairBaseParts.push(
      bakePartGeo(new THREE.ConeGeometry(0.048, 0.13, 6), {
        pos: [b * 0.058, 0.13, 0.215 - Math.abs(b) * 0.018],
        rot: [Math.PI - 0.35, 0, b * -0.12],
      })
    );
  }
  const hairBaseGeo = mergeBakedGeos(hairBaseParts);
  ownedGeos.push(hairBaseGeo);
  const hairMat = injectWiiSatinRimShader(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.58 }));
  ownedMats.push(hairMat);
  const hairBaseInst = registerInst(
    new THREE.InstancedMesh(hairBaseGeo, hairMat, MAX_STUDENTS),
    MAX_STUDENTS,
    true
  );

  // 10. Unified Hair Tufts
  const hairTuftGeo = new THREE.ConeGeometry(1, 1, 8);
  ownedGeos.push(hairTuftGeo);
  const hairTuftInst = registerInst(
    new THREE.InstancedMesh(hairTuftGeo, hairMat, MAX_STUDENTS * 3),
    MAX_STUDENTS * 3,
    true
  );

  // 11. Hair Ties
  const hairTieGeo = new THREE.SphereGeometry(1, 8, 8);
  ownedGeos.push(hairTieGeo);
  const hairTieMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35 });
  ownedMats.push(hairTieMat);
  const hairTieInst = registerInst(
    new THREE.InstancedMesh(hairTieGeo, hairTieMat, MAX_STUDENTS * 2),
    MAX_STUDENTS * 2,
    true
  );

  // 12. Headgear: Kohaku-bo Cap & Hachimaki Headband
  const capGeo = mergeBakedGeos([
    bakePartGeo(new THREE.SphereGeometry(0.258, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.48), {
      pos: [0, 0.02, 0],
      rot: [-0.12, 0, 0],
    }),
    bakePartGeo(new THREE.CylinderGeometry(0.24, 0.24, 0.024, 16, 1, false, -0.9, 1.8), {
      pos: [0, 0.11, 0.12],
      rot: [0.22, 0, 0],
    }),
  ]);
  ownedGeos.push(capGeo);
  const capMat = injectWiiSatinRimShader(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.42 }));
  ownedMats.push(capMat);
  const capInst = registerInst(new THREE.InstancedMesh(capGeo, capMat, MAX_STUDENTS), MAX_STUDENTS, true);

  const hachimakiGeo = mergeBakedGeos([
    bakePartGeo(new THREE.TorusGeometry(0.246, 0.035, 10, 24), {
      pos: [0, 0.08, 0],
      rot: [Math.PI / 2 - 0.12, 0, 0],
    }),
    bakePartGeo(new THREE.SphereGeometry(0.052, 8, 8), { pos: [0, 0.1, -0.25] }),
    bakePartGeo(new THREE.BoxGeometry(0.044, 0.18, 0.016), {
      pos: [-0.045, 0.02, -0.27],
      rot: [0, 0, 0.28],
    }),
    bakePartGeo(new THREE.BoxGeometry(0.044, 0.18, 0.016), {
      pos: [0.045, 0.02, -0.27],
      rot: [0, 0, -0.28],
    }),
  ]);
  ownedGeos.push(hachimakiGeo);
  const hachimakiInst = registerInst(
    new THREE.InstancedMesh(hachimakiGeo, capMat, MAX_STUDENTS),
    MAX_STUDENTS,
    true
  );

  const redBagRect = getBeanBagAtlasRect('red');
  const whiteBagRect = getBeanBagAtlasRect('white');
  const writeRectIfChanged = (
    arr: Float32Array,
    idx: number,
    r: [number, number, number, number]
  ): boolean => {
    const o = idx * 4;
    if (
      arr[o] === r[0] &&
      arr[o + 1] === r[1] &&
      arr[o + 2] === r[2] &&
      arr[o + 3] === r[3]
    ) {
      return false;
    }
    arr[o] = r[0];
    arr[o + 1] = r[1];
    arr[o + 2] = r[2];
    arr[o + 3] = r[3];
    return true;
  };

  let appearanceDirty = true;
  let prevFirstPersonHero: ThrowerAvatarRig | undefined = undefined;
  let prevHeldBagCount = -1;
  const markDirty = () => {
    appearanceDirty = true;
  };

  const sync = (rigs: ThrowerAvatarRig[], firstPersonHero: ThrowerAvatarRig | undefined) => {
    const count = Math.min(MAX_STUDENTS, rigs.length);
    const firstPersonChanged = firstPersonHero !== prevFirstPersonHero;
    const headOrColorDirty = appearanceDirty || firstPersonChanged;
    prevFirstPersonHero = firstPersonHero;

    let legC = 0;
    let skinSphereC = 0;
    let armSkinC = 0;
    let sleeveC = 0;
    let heldBagC = 0;
    let heldBagAtlasDirty = false;
    let headC = 0;
    let hairBaseC = 0;
    let hairTuftC = 0;
    let hairTieC = 0;
    let capC = 0;
    let hachiC = 0;

    for (let i = 0; i < count; i++) {
      const rig = rigs[i];
      rig.root.updateMatrixWorld(true);
      const isFpsHero = firstPersonHero === rig;
      const teamCol = rig.team === 'red' ? redTeamColor : whiteTeamColor;

      shadowInst.setMatrixAt(i, rig.shadowAnchor.matrixWorld);

      torsoInst.setMatrixAt(i, rig.bodyPivot.matrixWorld);
      if (appearanceDirty) torsoInst.setColorAt(i, teamCol);

      legInst.setMatrixAt(legC, rig.legL.matrixWorld);
      if (appearanceDirty) legInst.setColorAt(legC, teamCol);
      legC++;
      legInst.setMatrixAt(legC, rig.legR.matrixWorld);
      if (appearanceDirty) legInst.setColorAt(legC, teamCol);
      legC++;

      sleeveInst.setMatrixAt(sleeveC, rig.armL.matrixWorld);
      if (appearanceDirty) sleeveInst.setColorAt(sleeveC, teamCol);
      sleeveC++;
      sleeveInst.setMatrixAt(sleeveC, rig.armR.matrixWorld);
      if (appearanceDirty) sleeveInst.setColorAt(sleeveC, teamCol);
      sleeveC++;

      bibInst.setMatrixAt(i, rig.bodyPivot.matrixWorld);
      if (appearanceDirty) {
        writeZekkenAtlasRect(bibAtlasData, i * 4, rig.team, rig.bibIndex);
      }

      skinSphereInst.setMatrixAt(skinSphereC, rig.kneeLAnchor.matrixWorld);
      if (headOrColorDirty) skinSphereInst.setColorAt(skinSphereC, rig.skinColor);
      skinSphereC++;
      skinSphereInst.setMatrixAt(skinSphereC, rig.kneeRAnchor.matrixWorld);
      if (headOrColorDirty) skinSphereInst.setColorAt(skinSphereC, rig.skinColor);
      skinSphereC++;

      armSkinInst.setMatrixAt(armSkinC, rig.armL.matrixWorld);
      if (appearanceDirty) armSkinInst.setColorAt(armSkinC, rig.skinColor);
      armSkinC++;
      armSkinInst.setMatrixAt(armSkinC, rig.armR.matrixWorld);
      if (appearanceDirty) armSkinInst.setColorAt(armSkinC, rig.skinColor);
      armSkinC++;

      if (rig.heldBagVisible) {
        heldBagInst.setMatrixAt(heldBagC, rig.heldBagAnchor.matrixWorld);
        if (writeRectIfChanged(heldBagAtlasData, heldBagC, rig.team === 'red' ? redBagRect : whiteBagRect)) {
          heldBagAtlasDirty = true;
        }
        heldBagC++;
      }

      if (!isFpsHero) {
        headInst.setMatrixAt(headC, rig.headGroup.matrixWorld);
        if (headOrColorDirty) {
          writeFaceAtlasRect(headAtlasData, headC * 4, rig.skinIndex, rig.exprIndex);
        }
        headC++;

        skinSphereInst.setMatrixAt(skinSphereC, rig.earLAnchor.matrixWorld);
        if (headOrColorDirty) skinSphereInst.setColorAt(skinSphereC, rig.skinColor);
        skinSphereC++;
        skinSphereInst.setMatrixAt(skinSphereC, rig.earRAnchor.matrixWorld);
        if (headOrColorDirty) skinSphereInst.setColorAt(skinSphereC, rig.skinColor);
        skinSphereC++;

        hairBaseInst.setMatrixAt(hairBaseC, rig.headGroup.matrixWorld);
        if (headOrColorDirty) hairBaseInst.setColorAt(hairBaseC, rig.hairColor);
        hairBaseC++;

        for (let t = 0; t < rig.hairTuftAnchors.length; t++) {
          hairTuftInst.setMatrixAt(hairTuftC, rig.hairTuftAnchors[t].matrixWorld);
          if (headOrColorDirty) hairTuftInst.setColorAt(hairTuftC, rig.hairColor);
          hairTuftC++;
        }
        for (let t = 0; t < rig.hairTieAnchors.length; t++) {
          hairTieInst.setMatrixAt(hairTieC, rig.hairTieAnchors[t].matrixWorld);
          if (headOrColorDirty) hairTieInst.setColorAt(hairTieC, rig.hairTieColor);
          hairTieC++;
        }

        if (rig.usesCap) {
          capInst.setMatrixAt(capC, rig.headGroup.matrixWorld);
          if (headOrColorDirty) capInst.setColorAt(capC, rig.capColor);
          capC++;
        } else {
          hachimakiInst.setMatrixAt(hachiC, rig.headGroup.matrixWorld);
          if (headOrColorDirty) hachimakiInst.setColorAt(hachiC, rig.capColor);
          hachiC++;
        }
      }
    }

    shadowInst.count = count;
    shadowInst.instanceMatrix.needsUpdate = true;

    torsoInst.count = count;
    torsoInst.instanceMatrix.needsUpdate = true;
    if (appearanceDirty && torsoInst.instanceColor) torsoInst.instanceColor.needsUpdate = true;

    bibInst.count = count;
    bibInst.instanceMatrix.needsUpdate = true;
    if (appearanceDirty) bibAtlasAttr.needsUpdate = true;

    legInst.count = legC;
    legInst.instanceMatrix.needsUpdate = true;
    if (appearanceDirty && legInst.instanceColor) legInst.instanceColor.needsUpdate = true;

    skinSphereInst.count = skinSphereC;
    skinSphereInst.instanceMatrix.needsUpdate = true;
    if (headOrColorDirty && skinSphereInst.instanceColor) skinSphereInst.instanceColor.needsUpdate = true;

    sleeveInst.count = sleeveC;
    sleeveInst.instanceMatrix.needsUpdate = true;
    if (appearanceDirty && sleeveInst.instanceColor) sleeveInst.instanceColor.needsUpdate = true;

    armSkinInst.count = armSkinC;
    armSkinInst.instanceMatrix.needsUpdate = true;
    if (appearanceDirty && armSkinInst.instanceColor) armSkinInst.instanceColor.needsUpdate = true;

    heldBagInst.count = heldBagC;
    heldBagInst.visible = heldBagC > 0;
    if (heldBagC > 0) {
      heldBagInst.instanceMatrix.needsUpdate = true;
    }
    if (heldBagAtlasDirty || heldBagC !== prevHeldBagCount) {
      prevHeldBagCount = heldBagC;
      heldBagAtlasAttr.needsUpdate = true;
    }

    headInst.count = headC;
    headInst.instanceMatrix.needsUpdate = true;
    if (headOrColorDirty) headAtlasAttr.needsUpdate = true;

    hairBaseInst.count = hairBaseC;
    hairBaseInst.instanceMatrix.needsUpdate = true;
    if (headOrColorDirty && hairBaseInst.instanceColor) hairBaseInst.instanceColor.needsUpdate = true;

    hairTuftInst.count = hairTuftC;
    hairTuftInst.visible = hairTuftC > 0;
    if (hairTuftC > 0) hairTuftInst.instanceMatrix.needsUpdate = true;
    if (headOrColorDirty && hairTuftInst.instanceColor) hairTuftInst.instanceColor.needsUpdate = true;

    hairTieInst.count = hairTieC;
    hairTieInst.visible = hairTieC > 0;
    if (hairTieC > 0) hairTieInst.instanceMatrix.needsUpdate = true;
    if (headOrColorDirty && hairTieInst.instanceColor) hairTieInst.instanceColor.needsUpdate = true;

    capInst.count = capC;
    capInst.visible = capC > 0;
    if (capC > 0) capInst.instanceMatrix.needsUpdate = true;
    if (headOrColorDirty && capInst.instanceColor) capInst.instanceColor.needsUpdate = true;

    hachimakiInst.count = hachiC;
    hachimakiInst.visible = hachiC > 0;
    if (hachiC > 0) hachimakiInst.instanceMatrix.needsUpdate = true;
    if (headOrColorDirty && hachimakiInst.instanceColor) hachimakiInst.instanceColor.needsUpdate = true;

    appearanceDirty = false;
  };

  const dispose = () => {
    ownedInsts.forEach((inst) => {
      scene.remove(inst);
      inst.dispose();
    });
    ownedGeos.forEach((g) => g.dispose());
    ownedMats.forEach((m) => m.dispose());
  };

  return { sync, markDirty, dispose, bagAtlasMat };
}
