import * as THREE from 'three';

export type EmptyLotVariant =
  | 'SAKURA_FOUNTAIN'
  | 'COMMUNITY_VEGGIE_GARDEN'
  | 'BAMBOO_KARESANSUI'
  | 'JIZO_AUTUMN_MAPLE'
  | 'MINI_INARI_SHRINE'
  | 'RETRO_TIRE_PLAYGROUND'
  | 'VENDING_PERGOLA_REST'
  | 'BOSAI_DISASTER_PLAZA'
  | 'KOI_POND_TAIKOBASHI'
  | 'HEALTH_STRETCH_TRAIL'
  | 'NEKO_SUNNY_TERRACE'
  | 'SUMMER_MATSURI_YAGURA'
  // Legacy aliases for backward compatibility
  | 'POCKET_PARK'
  | 'COMMUNITY_GARDEN'
  | 'GREEN_VACANT';

export interface EmptyLotThemeDef {
  id: EmptyLotVariant;
  nameEn: string;
  nameJa: string;
  icon: string;
  dotColor: string;
}

export const EMPTY_LOT_THEMES: Record<string, EmptyLotThemeDef> = {
  SAKURA_FOUNTAIN: {
    id: 'SAKURA_FOUNTAIN',
    nameEn: 'Sakura Fountain',
    nameJa: '桜と水飲み場',
    icon: '🌸',
    dotColor: '#f472b6',
  },
  COMMUNITY_VEGGIE_GARDEN: {
    id: 'COMMUNITY_VEGGIE_GARDEN',
    nameEn: 'Veggie & Sunflower',
    nameJa: '市民農園・ひまわり畑',
    icon: '🌻',
    dotColor: '#facc15',
  },
  BAMBOO_KARESANSUI: {
    id: 'BAMBOO_KARESANSUI',
    nameEn: 'Zen Bamboo Rock',
    nameJa: '竹林と枯山水',
    icon: '🎋',
    dotColor: '#84cc16',
  },
  JIZO_AUTUMN_MAPLE: {
    id: 'JIZO_AUTUMN_MAPLE',
    nameEn: 'Jizō & Maple',
    nameJa: 'お地蔵様と紅葉',
    icon: '🍁',
    dotColor: '#ef4444',
  },
  MINI_INARI_SHRINE: {
    id: 'MINI_INARI_SHRINE',
    nameEn: 'Inari Torii Path',
    nameJa: 'お稲荷様と小鳥居',
    icon: '⛩️',
    dotColor: '#dc2626',
  },
  RETRO_TIRE_PLAYGROUND: {
    id: 'RETRO_TIRE_PLAYGROUND',
    nameEn: 'Tire Playground',
    nameJa: '昭和レトロ・タイヤ公園',
    icon: '🛞',
    dotColor: '#38bdf8',
  },
  VENDING_PERGOLA_REST: {
    id: 'VENDING_PERGOLA_REST',
    nameEn: 'Wisteria & Vending',
    nameJa: '藤棚と自販機の休憩所',
    icon: '🧃',
    dotColor: '#a855f7',
  },
  BOSAI_DISASTER_PLAZA: {
    id: 'BOSAI_DISASTER_PLAZA',
    nameEn: 'Bōsai Safety Plaza',
    nameJa: '防災広場・手押しポンプ',
    icon: '🚒',
    dotColor: '#f97316',
  },
  KOI_POND_TAIKOBASHI: {
    id: 'KOI_POND_TAIKOBASHI',
    nameEn: 'Koi Pond Bridge',
    nameJa: '錦鯉の池と太鼓橋',
    icon: '🌉',
    dotColor: '#06b6d4',
  },
  HEALTH_STRETCH_TRAIL: {
    id: 'HEALTH_STRETCH_TRAIL',
    nameEn: 'Fitness & Stretch',
    nameJa: '健康遊具・鉄棒コーナー',
    icon: '🤸',
    dotColor: '#10b981',
  },
  NEKO_SUNNY_TERRACE: {
    id: 'NEKO_SUNNY_TERRACE',
    nameEn: 'Sunny Cat Terrace',
    nameJa: '地域猫のひなたぼっこ広場',
    icon: '🐱',
    dotColor: '#fb923c',
  },
  SUMMER_MATSURI_YAGURA: {
    id: 'SUMMER_MATSURI_YAGURA',
    nameEn: 'Matsuri Lanterns',
    nameJa: '町内会・提灯やぐら広場',
    icon: '🏮',
    dotColor: '#f43f5e',
  },
};

export const EMPTY_LOT_VARIANTS: EmptyLotVariant[] = Object.keys(EMPTY_LOT_THEMES) as EmptyLotVariant[];

/**
 * Generates a shuffled, non-repeating deck of Pocket Park variants so no two pocket parks in a town are alike.
 */
export function generateTownEmptyLotDeck(rng: () => number, count: number = 24): EmptyLotVariant[] {
  const deck: EmptyLotVariant[] = [];
  while (deck.length < count) {
    const copy = [...EMPTY_LOT_VARIANTS];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    deck.push(...copy);
  }
  return deck.slice(0, count);
}

export interface EmptyLotOptions {
  includeRoad?: boolean;
  scale?: number;
  variant?: EmptyLotVariant;
}

/**
 * Helper to build a classic wooden park bench
 */
function buildWoodenBench(woodMat: THREE.Material, metalMat: THREE.Material): THREE.Group {
  const benchGroup = new THREE.Group();
  [-0.55, 0.55].forEach((bx) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.42, 0.40), metalMat);
    leg.position.set(bx, 0.21, 0);
    benchGroup.add(leg);
  });
  [-0.11, 0, 0.11].forEach((sz) => {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.035, 0.09), woodMat);
    slat.position.set(0, 0.43, sz);
    slat.castShadow = true;
    benchGroup.add(slat);
  });
  const backSlat = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.22, 0.035), woodMat);
  backSlat.position.set(0, 0.62, -0.17);
  backSlat.castShadow = true;
  benchGroup.add(backSlat);
  return benchGroup;
}

/**
 * Builds a charming 6m x 6m Japanese Pocket Park / Empty Lot (Tier 0) in 12 distinct themes.
 * Keeps front sidewalk Z in [+1.5, +3.0] completely clear to match all Tier 1/2/3 buildings!
 */
export function buildEmptyLotMesh(options: EmptyLotOptions = {}): THREE.Group {
  const { includeRoad = false, scale = 1.0, variant: rawVariant = 'SAKURA_FOUNTAIN' } = options;

  // Map legacy variant names seamlessly
  const variant: EmptyLotVariant =
    rawVariant === 'POCKET_PARK'
      ? 'SAKURA_FOUNTAIN'
      : rawVariant === 'COMMUNITY_GARDEN'
      ? 'COMMUNITY_VEGGIE_GARDEN'
      : rawVariant === 'GREEN_VACANT'
      ? 'BAMBOO_KARESANSUI'
      : rawVariant;

  const group = new THREE.Group();
  group.name = `EmptyLot_Model_${variant}`;

  const lotWidth = 6.0;

  // Shared Materials
  const grassMat = new THREE.MeshStandardMaterial({ color: 0x4ade80, roughness: 0.9 });
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.75 });
  const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.75 });
  const curbMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.6 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.8 });
  const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 });
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.9 });
  const vermilionMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.42 });
  const leafGreenMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.8 });
  const blossomMat = new THREE.MeshStandardMaterial({
    color: 0xf472b6,
    emissive: 0xf472b6,
    emissiveIntensity: 0.25,
    roughness: 0.65,
  });
  const lanternGlowMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xfde047,
    emissiveIntensity: 1.4,
    roughness: 0.2,
  });
  const flowerYellowMat = new THREE.MeshBasicMaterial({ color: 0xfde047 });
  const flowerWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

  // 1. Park Grass Lawn (Z in [-3.0, +1.5], depth 4.5m)
  const lawnGeo = new THREE.BoxGeometry(lotWidth, 0.16, 4.5);
  const lawn = new THREE.Mesh(lawnGeo, grassMat);
  lawn.position.set(0, 0.08, -0.75);
  lawn.receiveShadow = true;
  group.add(lawn);

  // Unobstructed Front Sidewalk (Z in [+1.5, +3.0], depth 1.5m)
  const swGeo = new THREE.BoxGeometry(lotWidth, 0.18, 1.5);
  const sw = new THREE.Mesh(swGeo, sidewalkMat);
  sw.position.set(0, 0.09, 2.25);
  sw.receiveShadow = true;
  group.add(sw);

  // Front Concrete Curb (Z = +3.0m)
  const frontCurbGeo = new THREE.BoxGeometry(lotWidth, 0.20, 0.15);
  const frontCurb = new THREE.Mesh(frontCurbGeo, curbMat);
  frontCurb.position.set(0, 0.10, 3.0);
  group.add(frontCurb);

  if (includeRoad) {
    const asphaltMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.85 });
    const roadGeo = new THREE.BoxGeometry(lotWidth, 0.02, 1.8);
    const road = new THREE.Mesh(roadGeo, asphaltMat);
    road.position.set(0, 0.01, 3.9);
    group.add(road);
  }

  // 2. Low Wooden Post-and-Rail Fence along Rear (Z = -2.85m)
  for (let fx = -2.6; fx <= 2.6; fx += 1.3) {
    const postGeo = new THREE.BoxGeometry(0.08, 0.65, 0.08);
    const post = new THREE.Mesh(postGeo, woodMat);
    post.position.set(fx, 0.45, -2.85);
    post.castShadow = true;
    group.add(post);
  }
  const railGeo = new THREE.BoxGeometry(5.4, 0.05, 0.04);
  const rail1 = new THREE.Mesh(railGeo, woodMat);
  rail1.position.set(0, 0.65, -2.85);
  const rail2 = new THREE.Mesh(railGeo, woodMat);
  rail2.position.set(0, 0.40, -2.85);
  group.add(rail1, rail2);

  // =========================================================================
  // THEME 2: COMMUNITY_VEGGIE_GARDEN (Raised Vegetable Beds & Sunflowers)
  // =========================================================================
  if (variant === 'COMMUNITY_VEGGIE_GARDEN') {
    const soilMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.95 });

    [-1.35, 1.35].forEach((bx, bedIdx) => {
      const bedGroup = new THREE.Group();
      bedGroup.position.set(bx, 0.16, -0.55);

      const frame = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.24, 2.8), woodMat);
      frame.position.y = 0.12;
      frame.castShadow = true;
      const soil = new THREE.Mesh(new THREE.BoxGeometry(1.74, 0.22, 2.64), soilMat);
      soil.position.y = 0.13;
      bedGroup.add(frame, soil);

      if (bedIdx === 0) {
        // Left Bed: Staked Red Tomato Vines
        for (let rz = -0.9; rz <= 0.9; rz += 0.6) {
          [-0.45, 0.45].forEach((rx) => {
            const stake = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.95, 6), woodMat);
            stake.position.set(rx, 0.6, rz);
            const vine = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22, 0), leafGreenMat);
            vine.position.set(rx, 0.52, rz);
            const tomato = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), vermilionMat);
            tomato.position.set(rx + 0.12, 0.56, rz + 0.08);
            bedGroup.add(stake, vine, tomato);
          });
        }
      } else {
        // Right Bed: Cabbages + Tall Blooming Sunflowers
        for (let rz = -0.1; rz <= 0.9; rz += 0.5) {
          [-0.45, 0.45].forEach((rx) => {
            const cabbage = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), leafGreenMat);
            cabbage.position.set(rx, 0.32, rz);
            bedGroup.add(cabbage);
          });
        }
        [-0.5, 0.0, 0.5].forEach((sx) => {
          const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 1.4, 6), leafGreenMat);
          stem.position.set(sx, 0.88, -0.95);
          const head = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.05, 12), flowerYellowMat);
          head.rotation.x = Math.PI / 2;
          head.position.set(sx, 1.52, -0.91);
          const center = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.06, 10), soilMat);
          center.rotation.x = Math.PI / 2;
          center.position.set(sx, 1.52, -0.90);
          bedGroup.add(stem, head, center);
        });
      }
      group.add(bedGroup);
    });

    const gravelWalk = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.02, 3.4), stoneMat);
    gravelWalk.position.set(0, 0.17, -0.4);
    group.add(gravelWalk);

    const shed = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.5, 0.85), woodMat);
    shed.position.set(0, 0.91, -2.25);
    shed.castShadow = true;
    const shedRoof = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.08, 1.05), darkMetalMat);
    shedRoof.position.set(0, 1.7, -2.25);
    shedRoof.rotation.x = 0.15;
    group.add(shed, shedRoof);
  }

  // =========================================================================
  // THEME 3: BAMBOO_KARESANSUI (Zen Bamboo Grove & Raked Gravel Sanctuary)
  // =========================================================================
  else if (variant === 'BAMBOO_KARESANSUI') {
    const bambooStalkMat = new THREE.MeshStandardMaterial({ color: 0x65a30d, roughness: 0.45 });
    const gravelWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.9 });

    const gravelBed = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.03, 2.6), gravelWhiteMat);
    gravelBed.position.set(-0.6, 0.17, -0.6);
    gravelBed.receiveShadow = true;
    group.add(gravelBed);

    [
      { x: -1.3, z: -0.8, r: 0.48 },
      { x: -0.7, z: -0.35, r: 0.34 },
      { x: 0.25, z: -0.9, r: 0.42 },
    ].forEach((b) => {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(b.r, 0), stoneMat);
      rock.position.set(b.x, 0.18 + b.r * 0.45, b.z);
      rock.scale.set(1.2, 0.75, 1.0);
      rock.castShadow = true;
      group.add(rock);
    });

    const stalkCoords = [
      [1.6, -1.8, 3.8], [1.9, -1.4, 4.4], [1.4, -1.1, 3.5],
      [2.1, -0.6, 4.1], [1.7, -0.2, 3.6], [0.8, -2.1, 3.9],
      [-0.4, -2.2, 3.4], [-1.6, -2.1, 3.7],
    ];
    stalkCoords.forEach(([bx, bz, bh]) => {
      const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, bh, 8), bambooStalkMat);
      stalk.position.set(bx, 0.16 + bh / 2, bz);
      stalk.castShadow = true;
      const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(0.45, 0), leafGreenMat);
      crown.position.set(bx, 0.16 + bh - 0.2, bz);
      group.add(stalk, crown);
    });

    const doroBase = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 0.85, 6), stoneMat);
    doroBase.position.set(1.1, 0.58, 0.55);
    const doroLight = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.28, 0.26), lanternGlowMat);
    doroLight.position.set(1.1, 1.12, 0.55);
    const doroCap = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.22, 6), stoneMat);
    doroCap.position.set(1.1, 1.36, 0.55);
    group.add(doroBase, doroLight, doroCap);

    const bench = buildWoodenBench(woodMat, darkMetalMat);
    bench.position.set(-1.3, 0.16, 0.85);
    group.add(bench);
  }

  // =========================================================================
  // THEME 4: JIZO_AUTUMN_MAPLE (Roadside O-Jizō-sama Shelter & Crimson Maple)
  // =========================================================================
  else if (variant === 'JIZO_AUTUMN_MAPLE') {
    const crimsonMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.7 });
    const amberMat = new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.7 });

    // Autumn Momiji Maple Tree at Left-Rear
    const mTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.24, 2.3, 8), trunkMat);
    mTrunk.position.set(-1.4, 1.3, -1.3);
    mTrunk.castShadow = true;
    const mCanopy1 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.3, 1), crimsonMat);
    mCanopy1.position.set(-1.4, 2.9, -1.3);
    mCanopy1.castShadow = true;
    const mCanopy2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.95, 1), amberMat);
    mCanopy2.position.set(-0.6, 2.5, -0.8);
    mCanopy2.castShadow = true;
    group.add(mTrunk, mCanopy1, mCanopy2);

    // Wooden Roadside Hokora Shelter for 3 O-Jizō-sama Statues on Right
    const hokoraGroup = new THREE.Group();
    hokoraGroup.position.set(1.25, 0.16, -0.5);

    const stoneBase = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.28, 0.85), stoneMat);
    stoneBase.position.y = 0.14;
    hokoraGroup.add(stoneBase);

    [-0.8, 0.8].forEach((px) => {
      [-0.32, 0.32].forEach((pz) => {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.35, 8), woodMat);
        post.position.set(px, 0.95, pz);
        hokoraGroup.add(post);
      });
    });

    const roof = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.12, 1.15), darkMetalMat);
    roof.position.set(0, 1.65, 0);
    roof.rotation.x = 0.12;
    roof.castShadow = true;
    hokoraGroup.add(roof);

    // 3 Smiling Stone Jizō Statues with Red Bibs & Red Caps
    [-0.5, 0, 0.5].forEach((jx) => {
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 0.46, 8), stoneMat);
      body.position.set(jx, 0.52, 0);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), stoneMat);
      head.position.set(jx, 0.84, 0);
      const bib = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.20, 8), vermilionMat);
      bib.rotation.x = Math.PI;
      bib.position.set(jx, 0.68, 0.06);
      const cap = new THREE.Mesh(
        new THREE.SphereGeometry(0.125, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2),
        vermilionMat
      );
      cap.position.set(jx, 0.87, 0);
      hokoraGroup.add(body, head, bib, cap);
    });
    group.add(hokoraGroup);

    // Flagstone Approach & Bench
    [-0.1, 0.4, 0.9].forEach((sz, idx) => {
      const step = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.34, 0.04, 8), stoneMat);
      step.position.set(1.25 - idx * 0.2, 0.17, sz);
      group.add(step);
    });

    const bench = buildWoodenBench(woodMat, darkMetalMat);
    bench.position.set(-1.35, 0.16, 0.65);
    bench.rotation.y = 0.3;
    group.add(bench);
  }

  // =========================================================================
  // THEME 5: MINI_INARI_SHRINE (Row of 5 Vermilion Torii Gates & Fox Statues)
  // =========================================================================
  else if (variant === 'MINI_INARI_SHRINE') {
    const whiteFoxMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.45 });

    // Flagstone Sando Path down the center
    const path = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.03, 3.6), stoneMat);
    path.position.set(0, 0.17, -0.4);
    group.add(path);

    // Tunnel of 5 Miniature Vermilion Torii Gates along Z
    [-1.4, -0.75, -0.1, 0.55, 1.2].forEach((tz) => {
      const tGroup = new THREE.Group();
      tGroup.position.set(0, 0.16, tz);

      [-0.58, 0.58].forEach((tx) => {
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.25, 8), darkMetalMat);
        base.position.set(tx, 0.125, 0);
        const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 1.75, 10), vermilionMat);
        pillar.position.set(tx, 0.88, 0);
        pillar.castShadow = true;
        tGroup.add(base, pillar);
      });

      const nuki = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.09, 0.09), vermilionMat);
      nuki.position.set(0, 1.48, 0);
      const kasagi = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.11, 0.14), vermilionMat);
      kasagi.position.set(0, 1.76, 0);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.04, 0.16), darkMetalMat);
      cap.position.set(0, 1.83, 0);
      tGroup.add(nuki, kasagi, cap);
      group.add(tGroup);
    });

    // Small Inari Shrine Sanctuary Box at Rear (Z = -2.2m)
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.45, 0.9), stoneMat);
    plinth.position.set(0, 0.38, -2.2);
    const honden = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.85, 0.7), woodMat);
    honden.position.set(0, 1.0, -2.2);
    const hRoof = new THREE.Mesh(new THREE.ConeGeometry(0.85, 0.55, 4), darkMetalMat);
    hRoof.rotation.y = Math.PI / 4;
    hRoof.position.set(0, 1.68, -2.2);
    group.add(plinth, honden, hRoof);

    // Pair of White Kitsune (Fox) Guardian Statues with Red Bibs
    [-0.95, 0.95].forEach((fx) => {
      const fPed = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.28, 0.36), stoneMat);
      fPed.position.set(fx, 0.30, -1.85);
      const fBody = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.45, 8), whiteFoxMat);
      fBody.position.set(fx, 0.65, -1.85);
      const fHead = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.24, 6), whiteFoxMat);
      fHead.rotation.x = Math.PI / 3;
      fHead.position.set(fx, 0.92, -1.78);
      const fBib = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 0.04), vermilionMat);
      fBib.position.set(fx, 0.72, -1.72);
      group.add(fPed, fBody, fHead, fBib);
    });

    // Glowing Stone Lanterns
    [-1.4, 1.4].forEach((lx) => {
      const lPost = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.75, 6), stoneMat);
      lPost.position.set(lx, 0.52, 0.85);
      const lBox = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.24, 0.22), lanternGlowMat);
      lBox.position.set(lx, 1.0, 0.85);
      group.add(lPost, lBox);
    });
  }

  // =========================================================================
  // THEME 6: RETRO_TIRE_PLAYGROUND (Rainbow Painted Tires & Wooden Seesaw)
  // =========================================================================
  else if (variant === 'RETRO_TIRE_PLAYGROUND') {
    const sandMat = new THREE.MeshStandardMaterial({ color: 0xfde68a, roughness: 0.9 });

    // Circular Sandbox on Left
    const sandRim = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.18, 20), woodMat);
    sandRim.position.set(-1.4, 0.25, -1.1);
    const sandFill = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 0.16, 20), sandMat);
    sandFill.position.set(-1.4, 0.26, -1.1);
    group.add(sandRim, sandFill);

    // Row of 5 Half-Buried Rainbow Painted Tires (*Taiya Yūgu*)
    const tireColors = [0xef4444, 0xfacc15, 0x3b82f6, 0x22c55e, 0xec4899];
    tireColors.forEach((col, idx) => {
      const tireGeo = new THREE.TorusGeometry(0.32, 0.11, 10, 18, Math.PI);
      const tireMat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.5 });
      const tire = new THREE.Mesh(tireGeo, tireMat);
      tire.position.set(0.4 + (idx % 3) * 0.75, 0.16, -1.6 + Math.floor(idx / 3) * 1.1);
      tire.rotation.y = 0.25;
      tire.castShadow = true;
      group.add(tire);
    });

    // 2-Seat Wooden Seesaw (*Shīsō*) in Front-Center
    const fulcrum = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.24, 0.36, 3),
      new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.4 })
    );
    fulcrum.position.set(0.2, 0.34, 0.65);
    const plank = new THREE.Mesh(
      new THREE.BoxGeometry(2.3, 0.06, 0.28),
      new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.5 })
    );
    plank.position.set(0.2, 0.52, 0.65);
    plank.rotation.z = 0.14;
    plank.castShadow = true;
    group.add(fulcrum, plank);
  }

  // =========================================================================
  // THEME 7: VENDING_PERGOLA_REST (Purple Wisteria Trellis & Twin Vending Machines)
  // =========================================================================
  else if (variant === 'VENDING_PERGOLA_REST') {
    const wisteriaMat = new THREE.MeshStandardMaterial({
      color: 0xa855f7,
      emissive: 0x9333ea,
      emissiveIntensity: 0.2,
      roughness: 0.65,
    });

    // Paved Rest Area Terrace
    const paver = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.03, 3.2), stoneMat);
    paver.position.set(0, 0.17, -0.4);
    paver.receiveShadow = true;
    group.add(paver);

    // Timber Wisteria Pergola (*Fujidana*) on Left Side
    const pergolaGroup = new THREE.Group();
    pergolaGroup.position.set(-1.0, 0.16, -0.4);

    [-1.1, 1.1].forEach((px) => {
      [-0.85, 0.85].forEach((pz) => {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.10, 2.25, 0.10), woodMat);
        post.position.set(px, 1.125, pz);
        post.castShadow = true;
        pergolaGroup.add(post);
      });
    });

    for (let rx = -1.2; rx <= 1.2; rx += 0.4) {
      const rafter = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 2.0), woodMat);
      rafter.position.set(rx, 2.28, 0);
      pergolaGroup.add(rafter);
    }

    // Hanging Purple Wisteria (*Fuji*) Flower Clusters
    for (let wx = -0.9; wx <= 0.9; wx += 0.45) {
      for (let wz = -0.6; wz <= 0.6; wz += 0.6) {
        const canopy = new THREE.Mesh(new THREE.DodecahedronGeometry(0.32, 0), leafGreenMat);
        canopy.position.set(wx, 2.38, wz);
        const cluster = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.42, 6), wisteriaMat);
        cluster.rotation.x = Math.PI;
        cluster.position.set(wx, 2.05, wz);
        pergolaGroup.add(canopy, cluster);
      }
    }

    const bench = buildWoodenBench(woodMat, darkMetalMat);
    bench.position.set(0, 0, -0.2);
    pergolaGroup.add(bench);
    group.add(pergolaGroup);

    // Twin Illuminated Japanese Drink Vending Machines on Right
    [
      { x: 1.2, col: 0xdc2626 },
      { x: 2.05, col: 0x0284c7 },
    ].forEach((vm) => {
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.76, 1.75, 0.58),
        new THREE.MeshStandardMaterial({ color: vm.col, roughness: 0.4 })
      );
      body.position.set(vm.x, 1.04, -0.7);
      body.castShadow = true;
      const display = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.85, 0.04), lanternGlowMat);
      display.position.set(vm.x, 1.28, -0.40);
      group.add(body, display);
    });
  }

  // =========================================================================
  // THEME 8: BOSAI_DISASTER_PLAZA (Emergency Solar Lamp, Fire Hose & Hand-Pump Well)
  // =========================================================================
  else if (variant === 'BOSAI_DISASTER_PLAZA') {
    const emeraldPumpMat = new THREE.MeshStandardMaterial({ color: 0x059669, roughness: 0.4, metalness: 0.4 });
    const brickMat = new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.8 });

    // Paved Emergency Assembly Apron
    const apron = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.03, 3.2), stoneMat);
    apron.position.set(0, 0.17, -0.4);
    group.add(apron);

    // 1. Tall Solar-Powered Emergency Streetlamp (*Bōsai Gaitō*)
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 3.8, 8), darkMetalMat);
    pole.position.set(-1.8, 2.05, -1.4);
    pole.castShadow = true;
    const solarPanel = new THREE.Mesh(
      new THREE.BoxGeometry(0.75, 0.04, 0.55),
      new THREE.MeshStandardMaterial({ color: 0x1e3a8a, metalness: 0.7, roughness: 0.2 })
    );
    solarPanel.position.set(-1.8, 4.0, -1.4);
    solarPanel.rotation.x = 0.35;
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.10, 0.22), lanternGlowMat);
    lamp.position.set(-1.5, 3.65, -1.4);
    group.add(pole, solarPanel, lamp);

    // 2. Red Municipal Fire-Hose Cabinet (*Shōkasen-bako*)
    const hoseBox = new THREE.Mesh(new THREE.BoxGeometry(0.75, 1.15, 0.32), vermilionMat);
    hoseBox.position.set(1.75, 0.74, -1.65);
    hoseBox.castShadow = true;
    const hoseBeacon = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xff0000, emissiveIntensity: 1.2 })
    );
    hoseBeacon.position.set(1.75, 1.4, -1.65);
    group.add(hoseBox, hoseBeacon);

    // 3. Green Cast-Iron Hand-Pump Emergency Water Well (*Teoshi Ponpu*)
    const wellPad = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.60, 0.14, 12), stoneMat);
    wellPad.position.set(0.2, 0.24, -0.8);
    const pumpStand = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.75, 10), emeraldPumpMat);
    pumpStand.position.set(0.2, 0.65, -0.8);
    const pumpHandle = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.04, 0.04), emeraldPumpMat);
    pumpHandle.position.set(0.42, 0.92, -0.8);
    pumpHandle.rotation.z = -0.35;
    group.add(wellPad, pumpStand, pumpHandle);

    // 4. Brick *Kamado* (Emergency Cooking Stove) Bench
    const kamadoBase = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.38, 0.45), brickMat);
    kamadoBase.position.set(-1.1, 0.35, 0.65);
    const kamadoSeat = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.06, 0.50), woodMat);
    kamadoSeat.position.set(-1.1, 0.57, 0.65);
    group.add(kamadoBase, kamadoSeat);
  }

  // =========================================================================
  // THEME 9: KOI_POND_TAIKOBASHI (Mini Koi Pond & Vermilion Arched Footbridge)
  // =========================================================================
  else if (variant === 'KOI_POND_TAIKOBASHI') {
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.15,
      metalness: 0.25,
      transparent: true,
      opacity: 0.85,
    });

    // Sunken Pond Water Basin
    const pond = new THREE.Mesh(new THREE.CylinderGeometry(1.85, 1.75, 0.06, 20), waterMat);
    pond.scale.set(1.25, 1.0, 0.85);
    pond.position.set(0, 0.16, -0.55);
    group.add(pond);

    // Natural River Stone Border around Pond
    for (let i = 0; i < 16; i++) {
      const a = (i * Math.PI * 2) / 16;
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22, 0), stoneMat);
      rock.position.set(Math.cos(a) * 2.25, 0.22, -0.55 + Math.sin(a) * 1.52);
      group.add(rock);
    }

    // Swimming Orange & White Koi Fish inside Pond
    [
      { x: -0.85, z: -0.45, col: 0xf97316, rot: 0.4 },
      { x: 0.75, z: -0.75, col: 0xef4444, rot: -1.2 },
      { x: 0.55, z: -0.25, col: 0xffffff, rot: 2.1 },
    ].forEach((koi) => {
      const kMesh = new THREE.Mesh(
        new THREE.ConeGeometry(0.06, 0.26, 6),
        new THREE.MeshStandardMaterial({ color: koi.col, roughness: 0.3 })
      );
      kMesh.rotation.x = Math.PI / 2;
      kMesh.rotation.z = koi.rot;
      kMesh.position.set(koi.x, 0.19, koi.z);
      group.add(kMesh);
    });

    // Vermilion Arched Wooden Footbridge (*Taiko-bashi*) spanning the Pond
    for (let s = -3; s <= 3; s++) {
      const t = s / 3;
      const by = 0.22 + (1 - t * t) * 0.32;
      const bz = -0.55 + t * 1.45;
      const plank = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.06, 0.38), vermilionMat);
      plank.position.set(0, by, bz);
      plank.rotation.x = -t * 0.28;
      plank.castShadow = true;
      group.add(plank);
    }
    [-0.45, 0.45].forEach((rx) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 3.1), vermilionMat);
      rail.position.set(rx, 0.75, -0.55);
      group.add(rail);
    });
  }

  // =========================================================================
  // THEME 10: HEALTH_STRETCH_TRAIL (3-Tier Pull-Up Bars, Stretch Bench & Ginkgo)
  // =========================================================================
  else if (variant === 'HEALTH_STRETCH_TRAIL') {
    const ginkgoMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.7 });

    // Golden Ginkgo Shade Tree at Rear-Left
    const gTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.22, 2.0, 8), trunkMat);
    gTrunk.position.set(-1.6, 1.15, -1.6);
    const gCanopy = new THREE.Mesh(new THREE.ConeGeometry(1.15, 2.8, 8), ginkgoMat);
    gCanopy.position.set(-1.6, 3.1, -1.6);
    gCanopy.castShadow = true;
    group.add(gTrunk, gCanopy);

    // 3-Height Horizontal Pull-Up Bars (*Tetsubō*) on Right
    const barColors = [0xef4444, 0xfacc15, 0x3b82f6];
    const barHeights = [0.85, 1.15, 1.45];
    barHeights.forEach((bh, idx) => {
      const bx = 0.2 + idx * 0.85;
      const postL = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, bh, 8), darkMetalMat);
      postL.position.set(bx - 0.42, 0.16 + bh / 2, -0.8);
      const postR = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, bh, 8), darkMetalMat);
      postR.position.set(bx + 0.42, 0.16 + bh / 2, -0.8);
      const bar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.025, 0.84, 8),
        new THREE.MeshStandardMaterial({ color: barColors[idx], roughness: 0.4 })
      );
      bar.rotation.z = Math.PI / 2;
      bar.position.set(bx, 0.16 + bh, -0.8);
      group.add(postL, postR, bar);
    });

    // Stepping-Log Balance Course in Front-Left
    [-1.6, -1.1, -0.6, -0.1].forEach((lx, idx) => {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.28 + (idx % 2) * 0.12, 8), woodMat);
      log.position.set(lx, 0.30, 0.65 + (idx % 2) * 0.22);
      log.castShadow = true;
      group.add(log);
    });
  }

  // =========================================================================
  // THEME 11: NEKO_SUNNY_TERRACE (Neighborhood Cats, Cat Shelter & Planters)
  // =========================================================================
  else if (variant === 'NEKO_SUNNY_TERRACE') {
    const potMat = new THREE.MeshStandardMaterial({ color: 0xc2410c, roughness: 0.7 });

    // Warm Flagstone Terrace
    const terrace = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.03, 2.8), stoneMat);
    terrace.position.set(0, 0.17, -0.4);
    terrace.receiveShadow = true;
    group.add(terrace);

    // Wooden Community Cat Shelter House at Rear-Left
    const catHouse = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.65, 0.75), woodMat);
    catHouse.position.set(-1.35, 0.48, -1.25);
    catHouse.castShadow = true;
    const chRoof = new THREE.Mesh(new THREE.ConeGeometry(0.72, 0.42, 4), vermilionMat);
    chRoof.rotation.y = Math.PI / 4;
    chRoof.position.set(-1.35, 1.0, -1.25);
    group.add(catHouse, chRoof);

    // Sunny Wooden Bench
    const bench = buildWoodenBench(woodMat, darkMetalMat);
    bench.position.set(0.85, 0.17, -0.6);
    group.add(bench);

    // 3 Stylized Low-Poly Neighborhood Cats (Orange Tabby on bench, Calico & Tuxedo on terrace)
    const buildCat = (x: number, y: number, z: number, rotY: number, coatHex: number) => {
      const cat = new THREE.Group();
      cat.position.set(x, y, z);
      cat.rotation.y = rotY;
      const cMat = new THREE.MeshStandardMaterial({ color: coatHex, roughness: 0.6 });
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 0.32), cMat);
      body.position.y = 0.12;
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.15, 0.16), cMat);
      head.position.set(0, 0.22, 0.14);
      [-0.05, 0.05].forEach((ex) => {
        const ear = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.07, 4), cMat);
        ear.position.set(ex, 0.32, 0.14);
        cat.add(ear);
      });
      const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.22, 6), cMat);
      tail.position.set(0, 0.22, -0.18);
      tail.rotation.x = -0.5;
      cat.add(body, head, tail);
      group.add(cat);
    };

    buildCat(0.85, 0.60, -0.6, 0.4, 0xf97316); // Orange tabby lounging on bench
    buildCat(-0.35, 0.18, 0.25, -0.6, 0xfef3c7); // Cream/calico cat on warm stones
    buildCat(-1.1, 0.18, -0.45, 0.9, 0x1e293b); // Tuxedo cat near shelter

    // Terracotta Flower Planters
    [-1.6, 1.6].forEach((px) => {
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.18, 0.32, 12), potMat);
      pot.position.set(px, 0.34, 0.85);
      const bush = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), blossomMat);
      bush.position.set(px, 0.56, 0.85);
      group.add(pot, bush);
    });
  }

  // =========================================================================
  // THEME 12: SUMMER_MATSURI_YAGURA (Festival Chōchin Lanterns & Taiko Stage)
  // =========================================================================
  else if (variant === 'SUMMER_MATSURI_YAGURA') {
    const chochinRedMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xdc2626,
      emissiveIntensity: 1.1,
      roughness: 0.3,
    });

    // Center Mini-Yagura Festival Platform & Taiko Drum
    const stage = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.45, 1.8), woodMat);
    stage.position.set(0, 0.38, -0.6);
    stage.castShadow = true;
    group.add(stage);

    const taiko = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.32, 0.48, 14),
      new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.5 })
    );
    taiko.rotation.x = Math.PI / 2;
    taiko.position.set(0, 0.95, -0.6);
    group.add(taiko);

    // 4 Corner Timber Festival Poles & Hanging Glowing Chōchin Paper Lanterns
    const corners = [
      [-2.1, -2.0],
      [2.1, -2.0],
      [-2.1, 0.8],
      [2.1, 0.8],
    ];
    corners.forEach(([cx, cz]) => {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 3.2, 8), woodMat);
      pole.position.set(cx, 1.75, cz);
      pole.castShadow = true;
      group.add(pole);
    });

    // Strings of Glowing Chōchin Lanterns radiating from center
    for (let i = -1.6; i <= 1.6; i += 0.8) {
      const l1 = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), i % 1.6 === 0 ? chochinRedMat : lanternGlowMat);
      l1.scale.set(1.0, 1.35, 1.0);
      l1.position.set(i, 2.85, 0.8);

      const l2 = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), i % 1.6 === 0 ? lanternGlowMat : chochinRedMat);
      l2.scale.set(1.0, 1.35, 1.0);
      l2.position.set(i, 2.85, -2.0);
      group.add(l1, l2);
    }
  }

  // =========================================================================
  // THEME 1 (DEFAULT): SAKURA_FOUNTAIN (Sakura Tree, Bench, Lantern & Fountain)
  // =========================================================================
  else {
    const treeGroup = new THREE.Group();
    treeGroup.position.set(1.5, 0.15, -1.4);

    const trunkGeo = new THREE.CylinderGeometry(0.14, 0.22, 2.4, 8);
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 1.2;
    trunk.castShadow = true;
    treeGroup.add(trunk);

    const b1Geo = new THREE.CylinderGeometry(0.08, 0.12, 1.2, 6);
    const b1 = new THREE.Mesh(b1Geo, trunkMat);
    b1.position.set(-0.3, 2.0, 0.2);
    b1.rotation.z = 0.5;
    treeGroup.add(b1);

    const canopy1 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.3, 1), blossomMat);
    canopy1.position.set(0, 2.9, 0);
    canopy1.castShadow = true;
    const canopy2 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.0, 1), blossomMat);
    canopy2.position.set(-0.7, 2.5, 0.4);
    canopy2.castShadow = true;
    const canopy3 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.9, 1), blossomMat);
    canopy3.position.set(0.6, 2.6, -0.4);
    canopy3.castShadow = true;
    treeGroup.add(canopy1, canopy2, canopy3);
    group.add(treeGroup);

    const lanternPost = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 1.1, 8), stoneMat);
    lanternPost.position.set(0.8, 0.7, 0.6);
    const lanternBox = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.28, 0.24), lanternGlowMat);
    lanternBox.position.set(0.8, 1.35, 0.6);
    const lanternRoof = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.16, 4), stoneMat);
    lanternRoof.position.set(0.8, 1.56, 0.6);
    lanternRoof.rotation.y = Math.PI / 4;
    group.add(lanternPost, lanternBox, lanternRoof);

    [
      { x: -0.1, z: 1.2, r: 0.28 },
      { x: -0.4, z: 0.6, r: 0.32 },
      { x: -0.8, z: 0.0, r: 0.30 },
      { x: -1.2, z: -0.6, r: 0.34 },
    ].forEach((p) => {
      const sMesh = new THREE.Mesh(new THREE.CylinderGeometry(p.r, p.r * 1.05, 0.04, 8), stoneMat);
      sMesh.position.set(p.x, 0.17, p.z);
      sMesh.receiveShadow = true;
      group.add(sMesh);
    });

    const bench = buildWoodenBench(woodMat, darkMetalMat);
    bench.position.set(-1.6, 0.16, -1.0);
    bench.rotation.y = 0.35;
    group.add(bench);

    [
      { x: -1.0, z: 0.8, mat: flowerYellowMat },
      { x: 1.6, z: 0.9, mat: flowerWhiteMat },
      { x: 0.3, z: -0.2, mat: flowerYellowMat },
      { x: 1.2, z: 0.2, mat: flowerWhiteMat },
      { x: -0.4, z: -1.8, mat: flowerWhiteMat },
      { x: 0.2, z: -2.2, mat: flowerYellowMat },
    ].forEach((f) => {
      const fMesh = new THREE.Mesh(new THREE.CircleGeometry(0.08, 6), f.mat);
      fMesh.rotation.x = -Math.PI / 2;
      fMesh.position.set(f.x, 0.17, f.z);
      group.add(fMesh);
    });

    const fountainGroup = new THREE.Group();
    fountainGroup.position.set(-1.9, 0.15, 1.05);

    const fountainMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.8 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.8, roughness: 0.2 });

    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.72, 0.36), fountainMat);
    pillar.position.set(0, 0.36, 0);
    pillar.castShadow = true;
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.13, 0.08, 12), stoneMat);
    basin.position.set(0, 0.76, 0);
    const faucetStem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.10, 8), chromeMat);
    faucetStem.position.set(0, 0.82, 0);
    const stepStone = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 0.28), fountainMat);
    stepStone.position.set(0, 0.08, 0.32);
    fountainGroup.add(pillar, basin, faucetStem, stepStone);

    [0x93c5fd, 0xc4b5fd, 0xfbcfe8].forEach((col, idx) => {
      const bush = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.24, 0),
        new THREE.MeshStandardMaterial({ color: col, roughness: 0.85 })
      );
      bush.position.set(-0.45 + idx * 0.25, 0.22, -0.35 + (idx % 2) * 0.15);
      bush.castShadow = true;
      fountainGroup.add(bush);
    });

    group.add(fountainGroup);
  }

  if (scale !== 1.0) {
    group.scale.setScalar(scale);
  }

  return group;
}
