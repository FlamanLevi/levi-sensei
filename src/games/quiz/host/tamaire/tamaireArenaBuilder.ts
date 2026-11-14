/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ============================================================================
 * 3D Undokai Tamaire — Arena, Basket Poles & Geometry Merging Builders
 * ============================================================================
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  injectWiiSatinRimShader,
  getBeanBagAtlasRect,
  createSchoolFacadeTexture,
  createDualVerticalBannerTexture,
  createUndokaiBannerTexture,
} from './tamaireTextures';

const _tmpBakePos = new THREE.Vector3();
const _tmpBakeQuat = new THREE.Quaternion();
const _tmpBakeEuler = new THREE.Euler();
const _tmpBakeScale = new THREE.Vector3();
const _tmpBakeMat = new THREE.Matrix4();
const _tmpBakeColor = new THREE.Color();

export interface BakePartOptions {
  color?: number;
  pos?: [number, number, number];
  rot?: [number, number, number];
  scale?: [number, number, number];
  keepUv?: boolean;
}

export function bakePartGeo(
  sourceGeo: THREE.BufferGeometry,
  opts: BakePartOptions = {}
): THREE.BufferGeometry {
  const g = sourceGeo.index ? sourceGeo.toNonIndexed() : sourceGeo.clone();
  sourceGeo.dispose();

  _tmpBakePos.set(...(opts.pos ?? [0, 0, 0]));
  _tmpBakeEuler.set(...(opts.rot ?? [0, 0, 0]), 'XYZ');
  _tmpBakeQuat.setFromEuler(_tmpBakeEuler);
  _tmpBakeScale.set(...(opts.scale ?? [1, 1, 1]));
  _tmpBakeMat.compose(_tmpBakePos, _tmpBakeQuat, _tmpBakeScale);
  g.applyMatrix4(_tmpBakeMat);

  if (!g.attributes.normal) {
    g.computeVertexNormals();
  }
  if (!opts.keepUv && g.attributes.uv) {
    g.deleteAttribute('uv');
  }
  if (opts.color !== undefined) {
    _tmpBakeColor.setHex(opts.color);
    const vCount = g.attributes.position.count;
    const cols = new Float32Array(vCount * 3);
    for (let i = 0; i < vCount; i++) {
      cols[i * 3] = _tmpBakeColor.r;
      cols[i * 3 + 1] = _tmpBakeColor.g;
      cols[i * 3 + 2] = _tmpBakeColor.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  }
  return g;
}

export function mergeBakedGeos(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const merged = mergeGeometries(parts, false);
  parts.forEach((p) => p.dispose());
  return merged || new THREE.BufferGeometry();
}

export interface BasketAssembly {
  root: THREE.Group;
  swayPivot: THREE.Group;
  rimCenterWorld: THREE.Vector3;
  innerBagsGroup: THREE.Group;
  innerBagsInst: THREE.InstancedMesh;
  innerBagBaseTransforms: Array<{
    pos: [number, number, number];
    rot: [number, number, number];
    matrix: THREE.Matrix4;
  }>;
  innerBagsNeedReset: boolean;
  moundMesh: THREE.Mesh;
  rimPulseRing: THREE.Mesh;
  levelRingsInst: THREE.InstancedMesh;
  netMesh: THREE.Mesh;
  linerMesh: THREE.Mesh;
  hoopY: number;
  springAngleX: number;
  springAngleZ: number;
  springVelX: number;
  springVelZ: number;
  hitSquash: number;
  displayFillRatio: number;
}

/**
 * Computes a smooth, non-overflowing basket fill ratio in [0, 0.92].
 */
export function computeAdaptiveBasketFillRatio(score: number, teamPlayersCount = 20): number {
  if (score <= 0) return 0;
  const knee = Math.max(28, Math.min(90, teamPlayersCount * 3.2));
  const raw = 1 - Math.exp(-score / knee);
  return Math.min(0.92, raw * 0.94);
}

/**
 * Builds a tall Japanese Tamaire Basket Pole (玉入れカゴ) with a spring-hinged pole,
 * woven diamond net, red-white spiral pole wrap (merged into 1 hardware mesh),
 * 4 fullness gauge rings (1 InstancedMesh), and 64 inner stackable bags (1 InstancedMesh).
 */
export function buildTamaireBasketPole(
  team: 'red' | 'white',
  xPos: number,
  bagMat: THREE.Material,
  bagAtlasMat: THREE.Material,
  enableShadows: boolean
): BasketAssembly {
  const root = new THREE.Group();
  root.position.set(xPos, 0, 0);

  const swayPivot = new THREE.Group();
  swayPivot.position.y = 0.12;
  root.add(swayPivot);

  const poleHeight = 4.25;
  const stripeCount = 9;
  const segH = poleHeight / stripeCount;
  const rimY = poleHeight + 0.12;
  const netHeight = 0.98;
  const netTopRadius = 0.72;
  const netBottomRadius = 0.34;
  const netCenterY = rimY - netHeight * 0.5;

  // 1. Merge 9 pole stripes + 3 collars + top rim hoop + 4 spokes + net bottom disc into 1 draw call
  const hwParts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < stripeCount; i++) {
    hwParts.push(
      bakePartGeo(new THREE.CylinderGeometry(0.068, 0.078, segH, 16), {
        color: i % 2 === 0 ? 0xf8fafc : 0xe11d48,
        pos: [0, segH * i + segH * 0.5, 0],
      })
    );
  }
  [1.4, 2.8, poleHeight - 0.1].forEach((cy) => {
    hwParts.push(
      bakePartGeo(new THREE.TorusGeometry(0.082, 0.02, 10, 20), {
        color: 0xf59e0b,
        pos: [0, cy, 0],
        rot: [Math.PI / 2, 0, 0],
      })
    );
  });
  hwParts.push(
    bakePartGeo(new THREE.TorusGeometry(0.74, 0.052, 16, 36), {
      color: team === 'red' ? 0xf43f5e : 0xf8fafc,
      pos: [0, rimY, 0],
      rot: [Math.PI / 2, 0, 0],
    })
  );
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2;
    hwParts.push(
      bakePartGeo(new THREE.CylinderGeometry(0.018, 0.018, 0.85, 8), {
        color: 0xf59e0b,
        pos: [Math.cos(angle) * 0.36, rimY - 0.38, Math.sin(angle) * 0.36],
        rot: [Math.sin(angle) * 0.78, 0, Math.cos(angle) * -0.78],
      })
    );
  }
  hwParts.push(
    bakePartGeo(new THREE.CylinderGeometry(netBottomRadius, 0.26, 0.08, 16), {
      color: team === 'red' ? 0xe11d48 : 0x475569,
      pos: [0, rimY - netHeight, 0],
    })
  );

  const hwMesh = new THREE.Mesh(
    mergeBakedGeos(hwParts),
    injectWiiSatinRimShader(
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.22 })
    )
  );
  hwMesh.castShadow = enableShadows;
  swayPivot.add(hwMesh);

  // 2. Woven Mesh Net Cone & Translucent Liner
  const netMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(netTopRadius, netBottomRadius, netHeight, 22, 8, true),
    new THREE.MeshStandardMaterial({
      color: team === 'red' ? 0xffedd5 : 0xe2e8f0,
      roughness: 0.7,
      wireframe: true,
      side: THREE.DoubleSide,
    })
  );
  netMesh.position.y = netCenterY;
  swayPivot.add(netMesh);

  const linerMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(netTopRadius - 0.02, netBottomRadius - 0.01, netHeight - 0.02, 22, 1, true),
    new THREE.MeshBasicMaterial({
      color: team === 'red' ? 0xffe4e6 : 0xf1f5f9,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  linerMesh.position.y = netCenterY;
  swayPivot.add(linerMesh);

  // 3. 4 Horizontal Fullness Gauge Rings merged into 1 InstancedMesh
  const ringGeo = new THREE.TorusGeometry(1.0, 0.022, 8, 28);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 });
  const levelRingsInst = new THREE.InstancedMesh(ringGeo, ringMat, 4);
  levelRingsInst.frustumCulled = false;
  const dummyRing = new THREE.Object3D();
  const baseRingColor = new THREE.Color(team === 'red' ? 0xfda4af : 0x93c5fd).multiplyScalar(0.35);
  [0.22, 0.46, 0.7, 0.88].forEach((t, r) => {
    const rAtHeight = netBottomRadius + (netTopRadius - netBottomRadius) * t + 0.012;
    const yAtHeight = rimY - netHeight + t * netHeight;
    dummyRing.position.set(0, yAtHeight, 0);
    dummyRing.rotation.set(Math.PI / 2, 0, 0);
    dummyRing.scale.set(rAtHeight, rAtHeight, 0.55);
    dummyRing.updateMatrix();
    levelRingsInst.setMatrixAt(r, dummyRing.matrix);
    levelRingsInst.setColorAt(r, baseRingColor);
  });
  levelRingsInst.instanceMatrix.needsUpdate = true;
  if (levelRingsInst.instanceColor) levelRingsInst.instanceColor.needsUpdate = true;
  swayPivot.add(levelRingsInst);

  // 4. Glowing Rim Shockwave Ring
  const rimPulseRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.76, 0.036, 12, 36),
    new THREE.MeshBasicMaterial({
      color: team === 'red' ? 0xfb7185 : 0x38bdf8,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
    })
  );
  rimPulseRing.rotation.x = Math.PI / 2;
  rimPulseRing.position.y = rimY + 0.03;
  rimPulseRing.visible = false;
  swayPivot.add(rimPulseRing);

  // 5. Adaptive Non-Overflowing Inner Bean Bag Volume
  const innerBagsGroup = new THREE.Group();
  const netFloorY = rimY - netHeight + 0.05;
  innerBagsGroup.position.y = netFloorY;
  swayPivot.add(innerBagsGroup);

  const moundGeo = new THREE.CylinderGeometry(0.58, netBottomRadius * 0.85, 0.78, 18, 4);
  const mPos = moundGeo.attributes.position;
  for (let i = 0; i < mPos.count; i++) {
    const vy = mPos.getY(i);
    if (vy > 0.3) {
      const distFromCenter = Math.hypot(mPos.getX(i), mPos.getZ(i));
      mPos.setY(i, vy + Math.max(0, 0.58 - distFromCenter) * 0.22);
    }
  }
  moundGeo.computeVertexNormals();
  moundGeo.translate(0, 0.39, 0);
  const moundMesh = new THREE.Mesh(moundGeo, bagMat);
  moundMesh.visible = false;
  moundMesh.scale.set(0.6, 0.01, 0.6);
  innerBagsGroup.add(moundMesh);

  const totalSlots = 64;
  const bagsPerLayer = 8;
  const bagGeo = new THREE.SphereGeometry(0.132, 12, 10);
  bagGeo.scale(1.24, 0.76, 1.06);
  const innerRect = getBeanBagAtlasRect(team);
  const innerAtlasArr = new Float32Array(totalSlots * 4);
  for (let i = 0; i < totalSlots; i++) {
    innerAtlasArr[i * 4] = innerRect[0];
    innerAtlasArr[i * 4 + 1] = innerRect[1];
    innerAtlasArr[i * 4 + 2] = innerRect[2];
    innerAtlasArr[i * 4 + 3] = innerRect[3];
  }
  bagGeo.setAttribute('aAtlasRect', new THREE.InstancedBufferAttribute(innerAtlasArr, 4));
  const innerBagsInst = new THREE.InstancedMesh(bagGeo, bagAtlasMat, totalSlots);
  innerBagsInst.frustumCulled = false;
  innerBagsInst.count = 0;
  innerBagsInst.visible = false;

  const innerBagBaseTransforms: BasketAssembly['innerBagBaseTransforms'] = [];
  const dummyBag = new THREE.Object3D();
  for (let i = 0; i < totalSlots; i++) {
    const layer = Math.floor(i / bagsPerLayer);
    const idxInLayer = i % bagsPerLayer;
    const layerNorm = layer / 7;
    const maxRadiusAtLayer =
      netBottomRadius * 0.72 + (netTopRadius * 0.78 - netBottomRadius * 0.72) * layerNorm;
    const ringRadius = idxInLayer === 0 ? 0 : maxRadiusAtLayer * (idxInLayer % 2 === 0 ? 0.92 : 0.62);
    const angle = (idxInLayer / (bagsPerLayer - 1)) * Math.PI * 2 + layer * 0.78;
    const yPos = 0.06 + layerNorm * 0.74 + (idxInLayer === 0 ? 0.04 : 0);

    const pos: [number, number, number] = [
      Math.cos(angle) * ringRadius,
      yPos,
      Math.sin(angle) * ringRadius,
    ];
    const rot: [number, number, number] = [
      Math.sin(i * 1.7) * 0.45,
      i * 1.1,
      Math.cos(i * 1.3) * 0.4,
    ];
    dummyBag.position.set(...pos);
    dummyBag.rotation.set(...rot);
    dummyBag.scale.set(1, 1, 1);
    dummyBag.updateMatrix();
    const matrix = dummyBag.matrix.clone();
    innerBagsInst.setMatrixAt(i, matrix);
    innerBagBaseTransforms.push({ pos, rot, matrix });
  }
  innerBagsInst.instanceMatrix.needsUpdate = true;
  innerBagsGroup.add(innerBagsInst);

  return {
    root,
    swayPivot,
    rimCenterWorld: new THREE.Vector3(xPos, rimY + 0.12, 0),
    innerBagsGroup,
    innerBagsInst,
    innerBagBaseTransforms,
    innerBagsNeedReset: false,
    moundMesh,
    rimPulseRing,
    levelRingsInst,
    netMesh,
    linerMesh,
    hoopY: rimY,
    springAngleX: 0,
    springAngleZ: 0,
    springVelX: 0,
    springVelZ: 0,
    hitSquash: 0,
    displayFillRatio: 0,
  };
}

interface SpectatorAnimData {
  baseX: number;
  baseY: number;
  baseZ: number;
  rotY: number;
  capColor: number;
  pomColor: number;
}

/**
 * Builds all static schoolyard arena scenery merged by material into minimal draw calls.
 */
export function buildUndokaiArenaEnvironment(
  scene: THREE.Scene,
  schoolName: string,
  kohakuTex: THREE.Texture | null,
  enableShadows: boolean
) {
  const matteParts: THREE.BufferGeometry[] = [];
  const metalParts: THREE.BufferGeometry[] = [];
  const paintedParts: THREE.BufferGeometry[] = [];
  const kohakuParts: THREE.BufferGeometry[] = [];
  const trackChalkParts: THREE.BufferGeometry[] = [];
  const zoneDiscParts: THREE.BufferGeometry[] = [];

  // 1. Pebbles (64) & Back curb
  for (let i = 0; i < 64; i++) {
    const px = (((i * 73) % 100) / 100 - 0.5) * 16;
    const pz = (((i * 41) % 100) / 100 - 0.5) * 9;
    matteParts.push(
      bakePartGeo(new THREE.DodecahedronGeometry(0.038, 0), {
        color: i % 2 === 0 ? 0x785532 : 0xd6b588,
        pos: [px, 0.015, pz],
        rot: [0, i * 1.1, 0],
        scale: [1.2, 0.45, 0.9],
      })
    );
  }
  matteParts.push(
    bakePartGeo(new THREE.BoxGeometry(56, 0.16, 0.28), { color: 0xcbd5e1, pos: [0, 0.08, -12.4] })
  );

  // 2. Running Track Lines & Chalk Circles
  for (let lane = 0; lane <= 4; lane++) {
    trackChalkParts.push(
      bakePartGeo(new THREE.PlaneGeometry(56, 0.07), {
        pos: [0, 0.018, -6.3 - lane * 1.35],
        rot: [-Math.PI / 2, 0, 0],
        keepUv: true,
      })
    );
  }
  trackChalkParts.push(
    bakePartGeo(new THREE.PlaneGeometry(0.11, 14), {
      pos: [0, 0.025, 0],
      rot: [-Math.PI / 2, 0, 0],
      keepUv: true,
    })
  );
  [
    [-3.1, 0xe11d48],
    [3.1, 0x3b82f6],
  ].forEach(([cx, col]) => {
    trackChalkParts.push(
      bakePartGeo(new THREE.RingGeometry(2.15, 2.28, 48), {
        pos: [cx, 0.028, 0],
        rot: [-Math.PI / 2, 0, 0],
        keepUv: true,
      }),
      bakePartGeo(new THREE.RingGeometry(0.95, 1.04, 36), {
        pos: [cx, 0.028, 0],
        rot: [-Math.PI / 2, 0, 0],
        keepUv: true,
      })
    );
    zoneDiscParts.push(
      bakePartGeo(new THREE.CircleGeometry(2.15, 40), {
        color: col,
        pos: [cx, 0.022, 0],
        rot: [-Math.PI / 2, 0, 0],
      })
    );
  });

  // 3. School Building (z = -22)
  const sz = -22;
  const facadeTex = createSchoolFacadeTexture();
  const mainBlock = new THREE.Mesh(
    new THREE.BoxGeometry(30, 8.8, 5.5),
    new THREE.MeshStandardMaterial({ map: facadeTex || undefined, color: 0xffffff, roughness: 0.75 })
  );
  mainBlock.position.set(0, 4.4, sz);
  mainBlock.receiveShadow = enableShadows;
  mainBlock.castShadow = enableShadows;
  scene.add(mainBlock);

  matteParts.push(
    bakePartGeo(new THREE.BoxGeometry(30.8, 0.45, 6.2), { color: 0xe5dec9, pos: [0, 9.0, sz] }),
    bakePartGeo(new THREE.BoxGeometry(4.6, 3.2, 4.2), { color: 0xe5dec9, pos: [0, 10.2, sz + 0.4] }),
    bakePartGeo(new THREE.ConeGeometry(3.6, 1.4, 4), {
      color: 0x334155,
      pos: [0, 12.5, sz + 0.4],
      rot: [0, Math.PI / 4, 0],
    }),
    bakePartGeo(new THREE.BoxGeometry(5.6, 2.8, 2.4), { color: 0xe5dec9, pos: [0, 1.4, sz + 3.6] })
  );
  metalParts.push(
    bakePartGeo(new THREE.BoxGeometry(30.2, 0.08, 0.08), {
      color: 0x64748b,
      pos: [0, 10.25, sz + 2.75],
    })
  );
  for (let rx = -14.5; rx <= 14.5; rx += 2.9) {
    metalParts.push(
      bakePartGeo(new THREE.BoxGeometry(0.06, 1.0, 0.06), {
        color: 0x64748b,
        pos: [rx, 9.75, sz + 2.75],
      })
    );
  }
  metalParts.push(
    bakePartGeo(new THREE.CylinderGeometry(1.05, 1.05, 0.18, 24), {
      color: 0xf59e0b,
      pos: [0, 10.35, sz + 2.52],
      rot: [Math.PI / 2, 0, 0],
    })
  );

  const clockGeo = mergeBakedGeos([
    bakePartGeo(new THREE.CylinderGeometry(0.92, 0.92, 0.2, 24), {
      color: 0xffffff,
      pos: [0, 10.35, sz + 2.54],
      rot: [Math.PI / 2, 0, 0],
    }),
    bakePartGeo(new THREE.BoxGeometry(0.1, 0.52, 0.05), {
      color: 0x0f172a,
      pos: [-0.16, 10.5, sz + 2.66],
      rot: [0, 0, 0.65],
    }),
    bakePartGeo(new THREE.BoxGeometry(0.08, 0.74, 0.05), {
      color: 0x0f172a,
      pos: [0.22, 10.55, sz + 2.66],
      rot: [0, 0, -0.65],
    }),
  ]);
  scene.add(new THREE.Mesh(clockGeo, new THREE.MeshBasicMaterial({ vertexColors: true })));

  const dualVertTex = createDualVerticalBannerTexture();
  if (dualVertTex) {
    const remapPlaneHalf = (px: number, uStart: number, uEnd: number) => {
      const g = new THREE.PlaneGeometry(1.35, 6.2);
      const uv = g.attributes.uv as THREE.BufferAttribute;
      for (let i = 0; i < uv.count; i++) {
        uv.setX(i, uStart + uv.getX(i) * (uEnd - uStart));
      }
      return bakePartGeo(g, { pos: [px, 5.2, sz + 2.82], keepUv: true });
    };
    scene.add(
      new THREE.Mesh(
        mergeBakedGeos([remapPlaneHalf(-3.2, 0.02, 0.48), remapPlaneHalf(3.2, 0.52, 0.98)]),
        new THREE.MeshBasicMaterial({ map: dualVertTex })
      )
    );
  }

  // 4. Undokai Stadium Wall Banner & Frame (z = -6.2)
  const bannerTex = createUndokaiBannerTexture(schoolName);
  const undokaiBannerMat = new THREE.MeshBasicMaterial({ map: bannerTex || undefined });
  matteParts.push(
    bakePartGeo(new THREE.BoxGeometry(5.6, 1.55, 0.18), { color: 0x1e293b, pos: [0, 1.55, -6.2] }),
    bakePartGeo(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 10), {
      color: 0x78350f,
      pos: [-2.4, 1.2, -6.25],
    }),
    bakePartGeo(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 10), {
      color: 0x78350f,
      pos: [2.4, 1.2, -6.25],
    })
  );
  const undokaiBannerMesh = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 1.35), undokaiBannerMat);
  undokaiBannerMesh.position.set(0, 1.55, -6.1);
  scene.add(undokaiBannerMesh);

  // 5. PA Megaphone Speaker Poles
  [-6.8, 6.8].forEach((px) => {
    metalParts.push(
      bakePartGeo(new THREE.CylinderGeometry(0.05, 0.07, 5.2, 10), {
        color: 0x94a3b8,
        pos: [px, 2.6, -7.2],
      })
    );
    [-1, 1].forEach((dir) => {
      matteParts.push(
        bakePartGeo(new THREE.ConeGeometry(0.24, 0.42, 12, 1, true), {
          color: 0xf8fafc,
          pos: [px + dir * 0.22, 5.0, -7.2],
          rot: [0, 0, dir * (Math.PI / 2 - 0.25)],
        })
      );
    });
  });

  // 6. Both Weighted Basket Bases & Feet
  [-3.1, 3.1].forEach((bx) => {
    metalParts.push(
      bakePartGeo(new THREE.CylinderGeometry(0.68, 0.78, 0.12, 24), {
        color: 0x334155,
        pos: [bx, 0.06, 0],
      })
    );
    for (let i = 0; i < 4; i++) {
      const ang = (i * Math.PI) / 2 + Math.PI / 4;
      metalParts.push(
        bakePartGeo(new THREE.BoxGeometry(0.95, 0.08, 0.1), {
          color: 0x475569,
          pos: [bx + Math.cos(ang) * 0.42, 0.08, Math.sin(ang) * 0.42],
          rot: [0, -ang, 0],
        })
      );
    }
  });

  // 7. Undokai Tents + Spectators Data Collection
  const spectatorData: SpectatorAnimData[] = [];
  const addTentToBatches = (
    xPos: number,
    zPos: number,
    rotY: number,
    theme: 'red' | 'white' | 'honbu'
  ) => {
    const cosY = Math.cos(rotY);
    const sinY = Math.sin(rotY);
    const toWorld = (lx: number, ly: number, lz: number): [number, number, number] => [
      xPos + lx * cosY + lz * sinY,
      ly,
      zPos - lx * sinY + lz * cosY,
    ];

    paintedParts.push(
      bakePartGeo(new THREE.ConeGeometry(3.4, 1.35, 4), {
        color: 0xf8fafc,
        pos: toWorld(0, 3.25, 0),
        rot: [0, rotY + Math.PI / 4, 0],
        scale: [1.35, 1, 0.85],
      }),
      bakePartGeo(new THREE.BoxGeometry(6.4, 0.24, 4.1), {
        color: theme === 'red' ? 0xe11d48 : theme === 'white' ? 0x3b82f6 : 0xf59e0b,
        pos: toWorld(0, 2.52, 0),
        rot: [0, rotY, 0],
      })
    );

    [
      [-2.9, -1.85],
      [2.9, -1.85],
      [-2.9, 1.85],
      [2.9, 1.85],
    ].forEach(([lx, lz]) => {
      metalParts.push(
        bakePartGeo(new THREE.CylinderGeometry(0.04, 0.04, 2.5, 8), {
          color: 0x94a3b8,
          pos: toWorld(lx, 1.25, lz),
        })
      );
    });

    if (kohakuTex) {
      kohakuParts.push(
        bakePartGeo(new THREE.PlaneGeometry(5.8, 1.6), {
          pos: toWorld(0, 1.1, -1.82),
          rot: [0, rotY, 0],
          keepUv: true,
        })
      );
    }

    if (theme === 'honbu') {
      paintedParts.push(
        bakePartGeo(new THREE.BoxGeometry(3.4, 0.78, 1.1), {
          color: 0xffffff,
          pos: toWorld(0, 0.39, 0.4),
          rot: [0, rotY, 0],
        })
      );
      if (kohakuTex) {
        kohakuParts.push(
          bakePartGeo(new THREE.PlaneGeometry(3.42, 0.76), {
            pos: toWorld(0, 0.39, 0.96),
            rot: [0, rotY, 0],
            keepUv: true,
          })
        );
      }
      metalParts.push(
        bakePartGeo(new THREE.CylinderGeometry(0.22, 0.1, 0.48, 12), {
          color: 0xfbbf24,
          pos: toWorld(0, 1.02, 0.4),
        })
      );
    }

    const count = theme === 'honbu' ? 3 : 6;
    for (let i = 0; i < count; i++) {
      const sx = -2.1 + (i / Math.max(1, count - 1)) * 4.2;
      const szLocal = theme === 'honbu' ? -0.45 : 0.2 + (i % 2) * 0.55;
      const [wx, , wz] = toWorld(sx, 0, szLocal);
      spectatorData.push({
        baseX: wx,
        baseY: 0,
        baseZ: wz,
        rotY,
        capColor:
          theme === 'red' ? 0xe11d48 : theme === 'white' ? 0xf8fafc : i % 2 === 0 ? 0xe11d48 : 0x3b82f6,
        pomColor: theme === 'red' ? 0xf43f5e : theme === 'white' ? 0xfef08a : 0xf59e0b,
      });
    }
  };
  addTentToBatches(-8.8, -4.2, 0.32, 'red');
  addTentToBatches(8.8, -4.2, -0.32, 'white');
  addTentToBatches(0, -10.2, 0, 'honbu');

  // 8. Trees & Mountains
  const treePlacements: [number, number, number, boolean][] = [
    [-14.5, -9.5, 1.15, true],
    [-11.5, -13.5, 1.3, false],
    [-6.2, -14.8, 1.1, true],
    [6.2, -14.8, 1.15, true],
    [11.5, -13.5, 1.25, false],
    [14.5, -9.5, 1.1, true],
    [-16.5, -3.5, 1.2, false],
    [16.5, -3.5, 1.2, false],
  ];
  const puffs = [
    [0, 2.8, 0, 1.35],
    [-0.85, 2.35, 0.4, 1.05],
    [0.85, 2.4, -0.3, 1.1],
    [0.2, 2.5, 0.8, 0.98],
    [-0.3, 2.55, -0.75, 1.0],
  ];
  treePlacements.forEach(([tx, tz, ts, isSakura]) => {
    matteParts.push(
      bakePartGeo(new THREE.CylinderGeometry(0.22 * ts, 0.36 * ts, 2.2 * ts, 10), {
        color: 0x5c4033,
        pos: [tx, 1.1 * ts, tz],
      })
    );
    const leafColors = isSakura ? [0xfbcfe8, 0xf9a8d4, 0xfce7f3] : [0x22c55e, 0x16a34a, 0x4ade80];
    puffs.forEach(([px, py, pz, pr], idx) => {
      matteParts.push(
        bakePartGeo(new THREE.DodecahedronGeometry(pr * ts, 1), {
          color: leafColors[idx % leafColors.length],
          pos: [tx + px * ts, py * ts, tz + pz * ts],
        })
      );
    });
  });

  for (let i = 0; i < 9; i++) {
    const mx = -48 + i * 12;
    const mh = 12 + (i % 3) * 5;
    matteParts.push(
      bakePartGeo(new THREE.ConeGeometry(14, mh, 7), {
        color: 0x3b7a57,
        pos: [mx, mh * 0.45 - 1, -48 - (i % 2) * 6],
        scale: [1.6, 1, 0.7],
      })
    );
  }

  // 9. Bunting Flags (78)
  const flagPalette = [0xe11d48, 0xf8fafc, 0xf59e0b, 0x3b82f6, 0x10b981, 0xa855f7];
  const pushBunting = (zStart: number, zEnd: number, yPeak: number) => {
    const count = 26;
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      const x = -11.5 + t * 23;
      const z = zStart + t * (zEnd - zStart);
      const y = yPeak - Math.sin(t * Math.PI) * 0.72;
      paintedParts.push(
        bakePartGeo(new THREE.ConeGeometry(0.19, 0.38, 3), {
          color: flagPalette[i % flagPalette.length],
          pos: [x, y, z],
          rot: [Math.PI, 0, 0],
        })
      );
    }
  };
  pushBunting(-4.5, -4.5, 5.25);
  pushBunting(-2.2, 1.2, 5.45);
  pushBunting(1.2, -2.2, 5.45);

  const trackChalkMesh = new THREE.Mesh(
    mergeBakedGeos(trackChalkParts),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 })
  );
  scene.add(trackChalkMesh);

  const zoneDiscMesh = new THREE.Mesh(
    mergeBakedGeos(zoneDiscParts),
    new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.08,
      depthWrite: false,
    })
  );
  scene.add(zoneDiscMesh);

  const matteMesh = new THREE.Mesh(
    mergeBakedGeos(matteParts),
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88 })
  );
  matteMesh.receiveShadow = enableShadows;
  scene.add(matteMesh);

  const metalMesh = new THREE.Mesh(
    mergeBakedGeos(metalParts),
    new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.62, roughness: 0.34 })
  );
  metalMesh.castShadow = enableShadows;
  metalMesh.receiveShadow = enableShadows;
  scene.add(metalMesh);

  const paintedMesh = new THREE.Mesh(
    mergeBakedGeos(paintedParts),
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, side: THREE.DoubleSide })
  );
  paintedMesh.castShadow = enableShadows;
  scene.add(paintedMesh);

  if (kohakuParts.length > 0 && kohakuTex) {
    scene.add(
      new THREE.Mesh(
        mergeBakedGeos(kohakuParts),
        new THREE.MeshStandardMaterial({ map: kohakuTex, side: THREE.DoubleSide, roughness: 0.7 })
      )
    );
  }

  // 10. Volumetric Cloud Puffs in 1 InstancedMesh (36 instances)
  const cloudsGroup = new THREE.Group();
  scene.add(cloudsGroup);
  const cloudsInst = new THREE.InstancedMesh(
    new THREE.SphereGeometry(1, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 }),
    36
  );
  const cDummy = new THREE.Object3D();
  let cIdx = 0;
  for (let i = 0; i < 12; i++) {
    const ang = (i / 12) * Math.PI * 1.4 - Math.PI * 0.7;
    const gx = Math.sin(ang) * 42;
    const gy = 13 + (i % 3) * 2.5;
    const gz = -Math.cos(ang) * 34 - 8;
    for (let j = 0; j < 3; j++) {
      const r = 2.4 - j * 0.4;
      cDummy.position.set(gx + (j - 1) * 1.9, gy + (j % 2) * 0.5, gz);
      cDummy.scale.set(1.4 * r, 0.85 * r, 0.9 * r);
      cDummy.updateMatrix();
      cloudsInst.setMatrixAt(cIdx++, cDummy.matrix);
    }
  }
  cloudsInst.instanceMatrix.needsUpdate = true;
  cloudsGroup.add(cloudsInst);

  // 11. 15 Cheering Tent Spectators in 3 InstancedMeshes
  const specCount = spectatorData.length;
  const specBodyGeo = mergeBakedGeos([
    bakePartGeo(new THREE.CylinderGeometry(0.16, 0.18, 0.52, 8), {
      color: 0xffffff,
      pos: [0, 0.42, 0],
    }),
    bakePartGeo(new THREE.SphereGeometry(0.17, 10, 10), {
      color: 0xffdfc4,
      pos: [0, 0.82, 0],
    }),
  ]);
  const specBodyInst = new THREE.InstancedMesh(
    specBodyGeo,
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.58 }),
    specCount
  );
  specBodyInst.frustumCulled = false;

  const specCapGeo = new THREE.SphereGeometry(0.18, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55);
  specCapGeo.translate(0, 0.84, 0);
  const specCapInst = new THREE.InstancedMesh(
    specCapGeo,
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }),
    specCount
  );
  specCapInst.frustumCulled = false;

  const specPomInst = new THREE.InstancedMesh(
    new THREE.DodecahedronGeometry(0.11, 0),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 }),
    specCount * 2
  );
  specPomInst.frustumCulled = false;

  const sDummy = new THREE.Object3D();
  const sColor = new THREE.Color();
  spectatorData.forEach((sp, i) => {
    sDummy.position.set(sp.baseX, sp.baseY, sp.baseZ);
    sDummy.rotation.set(0, sp.rotY, 0);
    sDummy.scale.set(1, 1, 1);
    sDummy.updateMatrix();
    specBodyInst.setMatrixAt(i, sDummy.matrix);
    specCapInst.setMatrixAt(i, sDummy.matrix);
    sColor.setHex(sp.capColor);
    specCapInst.setColorAt(i, sColor);

    const cosR = Math.cos(sp.rotY);
    const sinR = Math.sin(sp.rotY);
    sColor.setHex(sp.pomColor);
    [-0.24, 0.24].forEach((lx, pSide) => {
      sDummy.position.set(
        sp.baseX + lx * cosR + 0.1 * sinR,
        0.95,
        sp.baseZ - lx * sinR + 0.1 * cosR
      );
      sDummy.updateMatrix();
      specPomInst.setMatrixAt(i * 2 + pSide, sDummy.matrix);
      specPomInst.setColorAt(i * 2 + pSide, sColor);
    });
  });
  specBodyInst.instanceMatrix.needsUpdate = true;
  specCapInst.instanceMatrix.needsUpdate = true;
  if (specCapInst.instanceColor) specCapInst.instanceColor.needsUpdate = true;
  specPomInst.instanceMatrix.needsUpdate = true;
  if (specPomInst.instanceColor) specPomInst.instanceColor.needsUpdate = true;
  scene.add(specBodyInst, specCapInst, specPomInst);

  // Hoisted scratch objects to guarantee 0 per-frame GC allocations
  const pomMatrix = new THREE.Matrix4();
  const pomPos = new THREE.Vector3();
  const animateSpectators = (elapsed: number) => {
    for (let i = 0; i < specCount; i++) {
      const sp = spectatorData[i];
      const hopY = Math.abs(Math.sin(elapsed * 6.8 + i * 0.7)) * 0.14;
      const yaw = sp.rotY + Math.sin(elapsed * 3.2 + i) * 0.2;
      sDummy.position.set(sp.baseX, hopY, sp.baseZ);
      sDummy.rotation.set(0, yaw, 0);
      sDummy.updateMatrix();
      specBodyInst.setMatrixAt(i, sDummy.matrix);
      specCapInst.setMatrixAt(i, sDummy.matrix);

      const cosY = Math.cos(yaw);
      const sinY = Math.sin(yaw);
      [-0.24, 0.24].forEach((lx, pSide) => {
        pomPos.set(
          sp.baseX + lx * cosY + 0.1 * sinY,
          0.95 + hopY,
          sp.baseZ - lx * sinY + 0.1 * cosY
        );
        pomMatrix.makeTranslation(pomPos.x, pomPos.y, pomPos.z);
        specPomInst.setMatrixAt(i * 2 + pSide, pomMatrix);
      });
    }
    specBodyInst.instanceMatrix.needsUpdate = true;
    specCapInst.instanceMatrix.needsUpdate = true;
    specPomInst.instanceMatrix.needsUpdate = true;
  };

  return { cloudsGroup, cloudsInst, animateSpectators, undokaiBannerMat };
}
