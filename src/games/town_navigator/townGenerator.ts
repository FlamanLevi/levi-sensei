import React from 'react';
import * as THREE from 'three';
import { ActiveModel, TIER1_CATALOG, TIER2_CATALOG, TIER3_CATALOG, Tier1Model, Tier2Model, Tier3Model } from './TownModelInspector';

// Building model constructors
import { buildHouseMesh, HOUSE_PALETTES, generateTownHouseDeck, HouseDNA } from './models/house';
import { buildApartmentMesh, generateTownApartmentDeck, ApartmentDNA } from './models/apartment';
import { buildEmptyLotMesh, generateTownEmptyLotDeck, EmptyLotVariant } from './models/emptyLot';
import { buildBusStopMesh } from './models/busStop';
import { buildPostOfficeMesh } from './models/postOffice';
import { buildConvenienceStoreMesh } from './models/convenienceStore';
import { buildPoliceStationMesh, buildPoliceBoxMesh } from './models/policeStation';
import { buildBookstoreMesh } from './models/bookstore';
import { buildFlowerShopMesh } from './models/flowerShop';
import { buildRestaurantMesh } from './models/restaurant';

import { buildSchoolMesh } from './models/school';
import { buildJuniorHighSchoolMesh } from './models/juniorHighSchool';
import { buildDepartmentStoreMesh } from './models/departmentStore';
import { buildSwimmingPoolMesh } from './models/swimmingPool';
import { buildFireStationMesh } from './models/fireStation';
import { buildHospitalMesh } from './models/hospital';
import { buildCityHallMesh } from './models/cityHall';
import { buildStationMesh } from './models/station';
import { buildLibraryMesh } from './models/library';
import { buildSupermarketMesh } from './models/supermarket';
import { buildGymMesh } from './models/gym';
import { buildMuseumMesh } from './models/museum';
import { buildTempleMesh } from './models/temple';
import { buildShrineMesh } from './models/shrine';
import { buildParkMesh } from './models/park';
import { buildGardenMesh } from './models/garden';

import { buildStadiumMesh } from './models/stadium';
import { buildZooMesh } from './models/zoo';
import { buildAquariumMesh } from './models/aquarium';
import { buildCastleMesh } from './models/castle';
import { buildAmusementParkMesh } from './models/amusementPark';

import { buildRoadTile, RoadTileType, IntersectionInfo } from './models/roadTiles';
import { buildSidewalkTotemSign } from './models/sidewalkTotemSign';
import { enhanceBuildingGroup } from './models/wallTextures';
import { batchStaticMeshes } from './staticBatcher';

export interface GenerateTownOptions {
  schoolId?: string;
  townNameJa?: string;
  townNameEn?: string;
}

/**
 * Computes authentic Japanese Intersection Sign names (*Kōsaten Meishō*) for the 3x3 grid
 * based on the active school/neighborhood and cardinal compass direction.
 */
export function getIntersectionDirectionInfo(
  gx: number,
  gz: number,
  options?: GenerateTownOptions
): IntersectionInfo {
  let baseJa = 'みどり町';
  let baseEn = 'Midori-machi';

  const school = options?.schoolId;
  if (school === 'futakotamagawa') {
    baseJa = '二子玉川';
    baseEn = 'Futako-Tamagawa';
  } else if (school === 'toyogaoka') {
    baseJa = '豊ヶ丘';
    baseEn = 'Toyogaoka';
  } else if (options?.townNameJa && options?.townNameEn) {
    baseJa = options.townNameJa;
    baseEn = options.townNameEn;
  }

  // 5x5 Road Grid with 12m Grand Boulevard at gx ∈ {11, 12}, gz ∈ {11, 12}
  // Central Boulevard Crossroads
  if ((gx === 11 || gx === 12) && (gz === 11 || gz === 12)) {
    return {
      jaName: `${baseJa}中央大通り`,
      enName: `${baseEn} Grand Boulevard`,
    };
  }

  let suffixJa = '';
  let suffixEn = '';

  if (gx <= 6) {
    suffixJa += gx <= 1 ? '西外郭' : '中央西';
    suffixEn += gx <= 1 ? 'West Outer ' : 'Mid-West ';
  } else if (gx >= 17) {
    suffixJa += gx >= 22 ? '東外郭' : '中央東';
    suffixEn += gx >= 22 ? 'East Outer ' : 'Mid-East ';
  } else {
    suffixJa += '大通り';
    suffixEn += 'Boulevard ';
  }

  if (gz <= 6) {
    suffixJa += gz <= 1 ? '北' : '北中';
    suffixEn += gz <= 1 ? 'North' : 'Mid-North';
  } else if (gz >= 17) {
    suffixJa += gz >= 22 ? '南' : '南中';
    suffixEn += gz >= 22 ? 'South' : 'Mid-South';
  } else {
    suffixJa += '通り';
    suffixEn += 'Crossing';
  }

  return {
    jaName: `${baseJa}${suffixJa}`,
    enName: `${baseEn} ${suffixEn.trim()}`,
  };
}

export type Tier0Model = 'HOUSE' | 'EMPTY_LOT';

export interface PlacedBuilding {
  id: ActiveModel;
  nameEn: string;
  nameJa: string;
  rubyName: React.ReactNode;
  tier: 0 | 1 | 2 | 3;
  worldPos: [number, number, number];
  entrancePos: [number, number, number];
  rotationY: number;
  widthMeters: number;
  depthMeters: number;
  audioPath: string;
  features: string[];
  isOnCorner?: boolean;
  grade?: 5 | 6;
}

export interface TownMap {
  seed: number;
  gridSize: number; // 24 cells (144m x 144m)
  cellSize: number; // 6.0m
  roadsGroup: THREE.Group;
  buildingsGroup: THREE.Group;
  buildingsList: PlacedBuilding[];
  spawnPoint: [number, number, number];
  spawnHeading?: number;
  homeBuilding?: PlacedBuilding;
}

// TIER 1 UNIQUE FACILITIES: Each appears EXACTLY ONCE per town!
export const TIER1_UNIQUE_POOL: Array<Exclude<Tier1Model, 'AVENUE_8' | 'HOUSE' | 'EMPTY_LOT' | 'APARTMENT' | 'POLICE_BOX'>> = [
  'CONVENIENCE_STORE',
  'POST_OFFICE',
  'BOOKSTORE',
  'FLOWER_SHOP',
  'RESTAURANT',
  'BUS_STOP'
];

// TIER 2 GRADE 6 VOCABULARY (Mitsumura Here We Go 6 Unit 11 p.9): Guaranteed to spawn (1 each)
export const TIER2_GRADE6_POOL: Array<Extract<Tier2Model, 'JUNIOR_HIGH_SCHOOL' | 'DEPARTMENT_STORE' | 'SWIMMING_POOL'>> = [
  'JUNIOR_HIGH_SCHOOL',
  'DEPARTMENT_STORE',
  'SWIMMING_POOL'
];

// TIER 2 GRADE 5 CIVIC FACILITIES: Each appears AT MOST ONCE per town!
export const TIER2_GRADE5_POOL: Array<Exclude<Tier2Model, 'BOULEVARD_13' | 'JUNIOR_HIGH_SCHOOL' | 'DEPARTMENT_STORE' | 'SWIMMING_POOL'>> = [
  'SCHOOL', 'HOSPITAL', 'FIRE_STATION', 'POLICE_STATION', 'STATION', 'SUPERMARKET',
  'CITY_HALL', 'LIBRARY', 'PARK', 'GYM', 'MUSEUM', 'TEMPLE', 'SHRINE', 'GARDEN'
];

// TIER 3 LANDMARKS: Each appears AT MOST ONCE per town!
const TIER3_POOL: Array<Exclude<Tier3Model, 'ESPLANADE_5'>> = [
  'STADIUM', 'CASTLE', 'AMUSEMENT_PARK', 'AQUARIUM', 'ZOO'
];

export const HOUSE_PALETTE_LIST: string[] = Object.keys(HOUSE_PALETTES);

// Seeded pseudorandom generator
function createRng(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export interface InstantiateModelCustomOptions {
  palette?: string;
  houseDna?: HouseDNA;
  apartmentDna?: ApartmentDNA;
  parkVariant?: EmptyLotVariant;
}

/**
 * Builds the 3D model for any given ActiveModel
 */
export function instantiateModelMesh(
  id: ActiveModel,
  palette?: string,
  custom?: InstantiateModelCustomOptions
): THREE.Group {
  let group: THREE.Group;
  switch (id) {
    case 'HOUSE':
      group = buildHouseMesh({ includeRoad: false, palette, dna: custom?.houseDna });
      break;
    case 'APARTMENT':
      group = buildApartmentMesh({ includeRoad: false, palette, dna: custom?.apartmentDna });
      break;
    case 'EMPTY_LOT':
      group = buildEmptyLotMesh({ includeRoad: false, variant: custom?.parkVariant });
      break;
    case 'BUS_STOP': group = buildBusStopMesh({ includeRoad: false }); break;
    case 'POST_OFFICE': group = buildPostOfficeMesh({ includeRoad: false }); break;
    case 'CONVENIENCE_STORE': group = buildConvenienceStoreMesh({ includeRoad: false }); break;
    case 'POLICE_BOX': group = buildPoliceBoxMesh({ includeRoad: false }); break;
    case 'POLICE_STATION': group = buildPoliceStationMesh({ includeRoad: false }); break;
    case 'BOOKSTORE': group = buildBookstoreMesh({ includeRoad: false }); break;
    case 'FLOWER_SHOP': group = buildFlowerShopMesh({ includeRoad: false }); break;
    case 'RESTAURANT': group = buildRestaurantMesh({ includeRoad: false }); break;

    case 'SCHOOL': group = buildSchoolMesh({ includeRoad: false }); break;
    case 'JUNIOR_HIGH_SCHOOL': group = buildJuniorHighSchoolMesh({ includeRoad: false }); break;
    case 'DEPARTMENT_STORE': group = buildDepartmentStoreMesh({ includeRoad: false }); break;
    case 'SWIMMING_POOL': group = buildSwimmingPoolMesh({ includeRoad: false }); break;
    case 'FIRE_STATION': group = buildFireStationMesh({ includeRoad: false }); break;
    case 'HOSPITAL': group = buildHospitalMesh({ includeRoad: false }); break;
    case 'CITY_HALL': group = buildCityHallMesh({ includeRoad: false }); break;
    case 'STATION': group = buildStationMesh({ includeRoad: false }); break;
    case 'LIBRARY': group = buildLibraryMesh({ includeRoad: false }); break;
    case 'SUPERMARKET': group = buildSupermarketMesh({ includeRoad: false }); break;
    case 'GYM': group = buildGymMesh({ includeRoad: false }); break;
    case 'MUSEUM': group = buildMuseumMesh({ includeRoad: false }); break;
    case 'TEMPLE': group = buildTempleMesh({ includeRoad: false }); break;
    case 'SHRINE': group = buildShrineMesh({ includeRoad: false }); break;
    case 'PARK': group = buildParkMesh({ includeRoad: false }); break;
    case 'GARDEN': group = buildGardenMesh({ includeRoad: false }); break;

    case 'STADIUM': group = buildStadiumMesh({ includeRoad: false }); break;
    case 'ZOO': group = buildZooMesh({ includeRoad: false }); break;
    case 'AQUARIUM': group = buildAquariumMesh({ includeRoad: false }); break;
    case 'CASTLE': group = buildCastleMesh({ includeRoad: false }); break;
    case 'AMUSEMENT_PARK': group = buildAmusementParkMesh({ includeRoad: false }); break;

    default: group = buildHouseMesh({ includeRoad: false, palette }); break;
  }
  return enhanceBuildingGroup(group);
}

/**
 * Procedurally generates a living 13x13 grid town (78m x 78m) where:
 * - Every T1, T2, and T3 vocabulary facility appears at most once and directly fronts a road.
 * - Every House, Apartment, and Pocket Park is dealt from a shuffled non-repeating DNA deck so no two are alike!
 */
export function generateRandomTown(
  seed: number = Math.floor(Math.random() * 100000),
  options?: GenerateTownOptions
): TownMap {
  const rng = createRng(seed);

  const gridSize = 24;
  const cellSize = 6.0;
  const halfGrid = 11.5; // (gridSize - 1) / 2

  const roadsGroup = new THREE.Group();
  roadsGroup.name = 'Town_RoadNetwork';

  const buildingsGroup = new THREE.Group();
  buildingsGroup.name = 'Town_Buildings';

  const buildingsList: PlacedBuilding[] = [];

  const roadIndicesX = new Set([1, 6, 11, 12, 17, 22]);
  const roadIndicesZ = new Set([1, 6, 11, 12, 17, 22]);

  // 1. GENERATE ROAD NETWORK
  for (let gx = 0; gx < gridSize; gx++) {
    for (let gz = 0; gz < gridSize; gz++) {
      const isRoadX = roadIndicesX.has(gx);
      const isRoadZ = roadIndicesZ.has(gz);

      if (isRoadX || isRoadZ) {
        let type: RoadTileType;
        let intersectionInfo: IntersectionInfo | undefined;

        if (isRoadX && isRoadZ) {
          intersectionInfo = getIntersectionDirectionInfo(gx, gz, options);
          if ((gx === 11 || gx === 12) && (gz === 11 || gz === 12)) {
            type = 'BOULEVARD_CENTER_4WAY';
          } else if (gx === 11 || gx === 12) {
            type = 'BOULEVARD_JUNCTION_Z';
          } else if (gz === 11 || gz === 12) {
            type = 'BOULEVARD_JUNCTION_X';
          } else {
            type = 'INTERSECTION_4WAY';
          }
        } else if (isRoadX) {
          if (gx === 11) {
            type = 'BOULEVARD_Z_WEST';
          } else if (gx === 12) {
            type = 'BOULEVARD_Z_EAST';
          } else {
            type = 'STRAIGHT_Z';
          }
        } else {
          if (gz === 11) {
            type = 'BOULEVARD_X_NORTH';
          } else if (gz === 12) {
            type = 'BOULEVARD_X_SOUTH';
          } else {
            type = 'STRAIGHT_X';
          }
        }

        const tile = buildRoadTile(type, intersectionInfo);
        const wx = (gx - halfGrid) * cellSize;
        const wz = (gz - halfGrid) * cellSize;
        tile.position.set(wx, 0, wz);
        roadsGroup.add(tile);
      }
    }
  }

  // 2. OCCUPIED GRID MATRIX
  const occupied: boolean[][] = Array(gridSize).fill(false).map(() => Array(gridSize).fill(false));
  for (let gx = 0; gx < gridSize; gx++) {
    for (let gz = 0; gz < gridSize; gz++) {
      if (roadIndicesX.has(gx) || roadIndicesZ.has(gz)) {
        occupied[gx][gz] = true;
      }
    }
  }

  function getRoadFrontage(x0: number, z0: number, w: number, d: number) {
    const bordersSouth = (z0 + d < gridSize) && roadIndicesZ.has(z0 + d);
    const bordersNorth = (z0 - 1 >= 0) && roadIndicesZ.has(z0 - 1);
    const bordersEast = (x0 + w < gridSize) && roadIndicesX.has(x0 + w);
    const bordersWest = (x0 - 1 >= 0) && roadIndicesX.has(x0 - 1);

    const candidateRotations: number[] = [];
    if (bordersSouth) candidateRotations.push(0);
    if (bordersNorth) candidateRotations.push(Math.PI);
    if (bordersEast) candidateRotations.push(Math.PI / 2);
    if (bordersWest) candidateRotations.push(-Math.PI / 2);

    return {
      bordersRoad: candidateRotations.length > 0,
      bordersSouth,
      bordersNorth,
      bordersEast,
      bordersWest,
      candidateRotations,
    };
  }

  function shuffle<T>(arr: T[]): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  // Shuffled vocabulary pools + non-repeating Tier 0 DNA decks
  const shuffledTier3 = shuffle(TIER3_POOL);
  const shuffledGrade5Tier2 = shuffle(TIER2_GRADE5_POOL);
  const guaranteedTier2 = [...TIER2_GRADE6_POOL, ...shuffledGrade5Tier2.slice(0, 4)];
  const activeTier2List = shuffle(guaranteedTier2);
  const shuffledTier1 = shuffle(TIER1_UNIQUE_POOL);

  const apartmentDeck = generateTownApartmentDeck(rng);
  const houseDeck = generateTownHouseDeck(rng, 48);
  const parkDeck = generateTownEmptyLotDeck(rng, 24);

  let t3Idx = 0;
  let t2Idx = 0;
  let houseDeckIdx = 0;
  let parkDeckIdx = 0;

  function placeBuilding(
    id: ActiveModel,
    tier: 0 | 1 | 2 | 3,
    centerGx: number,
    centerGz: number,
    wCells: number,
    dCells: number,
    rotationY: number,
    palette?: string,
    custom?: InstantiateModelCustomOptions
  ) {
    const mesh = instantiateModelMesh(id, palette, custom);
    const widthMeters = wCells * cellSize;
    const depthMeters = dCells * cellSize;

    const wx = (centerGx - halfGrid) * cellSize;
    const wz = (centerGz - halfGrid) * cellSize;

    mesh.position.set(wx, 0, wz);
    mesh.rotation.y = rotationY;
    buildingsGroup.add(mesh);

    const startX = Math.round(centerGx - (wCells - 1) / 2);
    const startZ = Math.round(centerGz - (dCells - 1) / 2);
    for (let x = startX; x < startX + wCells; x++) {
      for (let z = startZ; z < startZ + dCells; z++) {
        if (x >= 0 && x < gridSize && z >= 0 && z < gridSize) {
          occupied[x][z] = true;
        }
      }
    }

    const bordersRoadZ = (startZ - 1 >= 0 && roadIndicesZ.has(startZ - 1)) || (startZ + dCells < gridSize && roadIndicesZ.has(startZ + dCells));
    const bordersRoadX = (startX - 1 >= 0 && roadIndicesX.has(startX - 1)) || (startX + wCells < gridSize && roadIndicesX.has(startX + wCells));
    const isOnCorner = bordersRoadX && bordersRoadZ;

    const fwdDist = depthMeters / 2 - 0.65;
    const ex = wx + Math.sin(rotationY) * fwdDist;
    const ez = wz + Math.cos(rotationY) * fwdDist;
    const entrancePos: [number, number, number] = [ex, 0.18, ez];

    const def = tier === 3
      ? TIER3_CATALOG[id as Exclude<Tier3Model, 'ESPLANADE_5'>]
      : tier === 2
      ? TIER2_CATALOG[id as Exclude<Tier2Model, 'BOULEVARD_13'>]
      : TIER1_CATALOG[id as Exclude<Tier1Model, 'AVENUE_8'>];

    const grade = (def as any)?.grade ?? 5;

    if (tier > 0) {
      const totem = buildSidewalkTotemSign({
        id,
        nameEn: def.nameEn,
        nameJa: def.nameJa,
        tier,
      });

      const signFwd = depthMeters / 2 - 0.52;
      const signSide = widthMeters / 2 - 0.65;
      const tangentX = Math.cos(rotationY);
      const tangentZ = -Math.sin(rotationY);

      totem.position.set(
        wx + Math.sin(rotationY) * signFwd + tangentX * signSide,
        0,
        wz + Math.cos(rotationY) * signFwd + tangentZ * signSide
      );
      totem.rotation.y = rotationY;
      buildingsGroup.add(totem);
    }

    const isApartment = id === 'APARTMENT';
    const modelWidthMeters = isApartment ? 6.0 : widthMeters;
    const modelDepthMeters = isApartment ? 12.0 : depthMeters;

    buildingsList.push({
      id,
      nameEn: def.nameEn,
      nameJa: def.nameJa,
      rubyName: def.rubyName,
      tier,
      worldPos: [wx, 0, wz],
      entrancePos,
      rotationY,
      widthMeters: modelWidthMeters,
      depthMeters: modelDepthMeters,
      audioPath: def.audioPath,
      features: def.features,
      isOnCorner,
      grade,
    });
  }

  // 3. THEMATIC DISTRICT SUPERBLOCK ALLOCATION (4x4 = 16 Superblocks of 4x4 cells)
  const colCoords = [2, 7, 13, 18];
  const rowCoords = [2, 7, 13, 18];

  const placeQuadInBlock = (bx: number, bz: number, buildings: Array<Exclude<Tier2Model, 'BOULEVARD_13'>>) => {
    const quads = [
      { cx: bx + 0.5, cz: bz + 0.5, rot: Math.PI },      // faces North road
      { cx: bx + 2.5, cz: bz + 0.5, rot: Math.PI / 2 },  // faces East road
      { cx: bx + 0.5, cz: bz + 2.5, rot: -Math.PI / 2 }, // faces West road
      { cx: bx + 2.5, cz: bz + 2.5, rot: 0 },            // faces South road
    ];
    // District-scoped shuffle: randomize building lots and street frontages within this quad
    const shuffledBuildings = shuffle(buildings);
    shuffledBuildings.forEach((bId, idx) => {
      if (idx < quads.length && bId) {
        placeBuilding(bId, 2, quads[idx].cx, quads[idx].cz, 2, 2, quads[idx].rot);
      }
    });
  };

  const placeLandmarkInBlock = (bx: number, bz: number, landmarkId: Exclude<Tier3Model, 'ESPLANADE_5'>) => {
    // 4 possible corner locations within the 4x4 block (0: NW, 1: NE, 2: SW, 3: SE)
    const corner = Math.floor(rng() * 4);
    let cx = bx + 1.0;
    let cz = bz + 1.0;
    let candidateRots: number[] = [];

    const isBoulevardEast = bx + 4 === 11;
    const isBoulevardWest = bx - 1 === 12;
    const isBoulevardSouth = bz + 4 === 11;
    const isBoulevardNorth = bz - 1 === 12;

    if (corner === 0) {
      // NW corner
      cx = bx + 1.0;
      cz = bz + 1.0;
      candidateRots = isBoulevardNorth ? [Math.PI, Math.PI, -Math.PI / 2] : isBoulevardWest ? [-Math.PI / 2, -Math.PI / 2, Math.PI] : [Math.PI, -Math.PI / 2];
    } else if (corner === 1) {
      // NE corner
      cx = bx + 2.0;
      cz = bz + 1.0;
      candidateRots = isBoulevardNorth ? [Math.PI, Math.PI, Math.PI / 2] : isBoulevardEast ? [Math.PI / 2, Math.PI / 2, Math.PI] : [Math.PI, Math.PI / 2];
    } else if (corner === 2) {
      // SW corner
      cx = bx + 1.0;
      cz = bz + 2.0;
      candidateRots = isBoulevardSouth ? [0, 0, -Math.PI / 2] : isBoulevardWest ? [-Math.PI / 2, -Math.PI / 2, 0] : [0, -Math.PI / 2];
    } else {
      // SE corner
      cx = bx + 2.0;
      cz = bz + 2.0;
      candidateRots = isBoulevardSouth ? [0, 0, Math.PI / 2] : isBoulevardEast ? [Math.PI / 2, Math.PI / 2, 0] : [0, Math.PI / 2];
    }

    const rot = candidateRots[Math.floor(rng() * candidateRots.length)];
    placeBuilding(landmarkId, 3, cx, cz, 3, 3, rot);
  };

  // Compile all 16 superblocks and shuffle them across the city!
  interface SuperblockInfo {
    colIdx: number;
    rowIdx: number;
    bx: number;
    bz: number;
  }
  const allSuperblocks: SuperblockInfo[] = [];
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      allSuperblocks.push({
        colIdx: c,
        rowIdx: r,
        bx: colCoords[c],
        bz: rowCoords[r],
      });
    }
  }
  const shuffledBlocks = shuffle(allSuperblocks);

  // 1) Place all 5 Tier 3 Mega-Landmarks across randomly selected superblocks:
  const shuffledLandmarks = shuffle(TIER3_POOL);
  for (let i = 0; i < 5; i++) {
    const block = shuffledBlocks[i];
    placeLandmarkInBlock(block.bx, block.bz, shuffledLandmarks[i]);
  }

  // 2) Place all 4 Civic District Quads (16 facilities) across randomly selected superblocks:
  const civicDistrictQuads: Array<Array<Exclude<Tier2Model, 'BOULEVARD_13'>>> = [
    // Downtown Civic Core
    ['STATION', 'CITY_HALL', 'DEPARTMENT_STORE', 'MUSEUM'],
    // Public Services & Market Hub
    ['LIBRARY', 'SUPERMARKET', 'HOSPITAL', 'FIRE_STATION'],
    // Education & Athletics District
    ['SCHOOL', 'JUNIOR_HIGH_SCHOOL', 'GYM', 'SWIMMING_POOL'],
    // Culture & Nature Sanctuary
    ['TEMPLE', 'SHRINE', 'GARDEN', 'PARK'],
  ];

  const shuffledQuads = shuffle(civicDistrictQuads);
  for (let i = 0; i < 4; i++) {
    const block = shuffledBlocks[5 + i];
    placeQuadInBlock(block.bx, block.bz, shuffledQuads[i]);
  }

  // 3) Place 1 District Police Station in a randomly selected neighborhood block:
  const policeBlock = shuffledBlocks[9];
  const policeQuads = [
    { cx: policeBlock.bx + 0.5, cz: policeBlock.bz + 0.5, rot: Math.PI },
    { cx: policeBlock.bx + 2.5, cz: policeBlock.bz + 0.5, rot: Math.PI / 2 },
    { cx: policeBlock.bx + 0.5, cz: policeBlock.bz + 2.5, rot: -Math.PI / 2 },
    { cx: policeBlock.bx + 2.5, cz: policeBlock.bz + 2.5, rot: 0 },
  ];
  const chosenPoliceQuad = policeQuads[Math.floor(rng() * policeQuads.length)];
  placeBuilding('POLICE_STATION', 2, chosenPoliceQuad.cx, chosenPoliceQuad.cz, 2, 2, chosenPoliceQuad.rot);

  // Note: Remaining 6 superblocks (shuffledBlocks[10..15]), plus the unoccupied 3 quads of the police block,
  // and the 7-cell surrounding parkland of each landmark block, form open suburban zones for
  // unique Tier 1 shops, low-rise apartments, houses, and pocket parks!

  // 4. PLACE TIER 1 UNIQUE SHOPS & FACILITIES
  const innerRoadsideCandidates: Array<{ gx: number; gz: number; rot: number }> = [];
  const outerRoadsideCandidates: Array<{ gx: number; gz: number; rot: number }> = [];

  for (let gx = 0; gx < gridSize; gx++) {
    for (let gz = 0; gz < gridSize; gz++) {
      if (!occupied[gx][gz]) {
        const frontage = getRoadFrontage(gx, gz, 1, 1);
        if (frontage.bordersRoad) {
          const rot = frontage.candidateRotations[Math.floor(rng() * frontage.candidateRotations.length)];
          if (gx >= 6 && gx <= 17 && gz >= 6 && gz <= 17) {
            innerRoadsideCandidates.push({ gx, gz, rot });
          } else {
            outerRoadsideCandidates.push({ gx, gz, rot });
          }
        }
      }
    }
  }

  const allRoadsideCandidates = [...shuffle(innerRoadsideCandidates), ...shuffle(outerRoadsideCandidates)];
  const chosenShopSlots: Array<{ gx: number; gz: number; rot: number }> = [];

  for (const shopId of shuffledTier1) {
    let selectedSlot = allRoadsideCandidates.find(
      c => !occupied[c.gx][c.gz] && chosenShopSlots.every(prev => Math.hypot(c.gx - prev.gx, c.gz - prev.gz) >= 2.0)
    );
    if (!selectedSlot) {
      selectedSlot = allRoadsideCandidates.find(c => !occupied[c.gx][c.gz]);
    }
    if (selectedSlot) {
      chosenShopSlots.push(selectedSlot);
      placeBuilding(shopId, 1, selectedSlot.gx, selectedSlot.gz, 1, 1, selectedSlot.rot);
    }
  }

  // Place 1 passive neighborhood Police Box (Kōban) on a roadside 1x1 slot
  const kobanSlot = allRoadsideCandidates.find(c => !occupied[c.gx][c.gz]);
  if (kobanSlot) {
    placeBuilding('POLICE_BOX', 0, kobanSlot.gx, kobanSlot.gz, 1, 1, kobanSlot.rot);
  }

  // 4.5. PLACE UNIQUE LOW-RISE APARTMENT BLOCKS (Up to 6 unique archetypes)
  const maxApartments = 6;
  let apartmentsPlaced = 0;

  for (let gx = 1; gx < gridSize - 1 && apartmentsPlaced < maxApartments; gx++) {
    for (let gz = 1; gz < gridSize - 1 && apartmentsPlaced < maxApartments; gz++) {
      if (
        gz + 1 < gridSize &&
        !occupied[gx][gz] &&
        !occupied[gx][gz + 1] &&
        !roadIndicesX.has(gx) &&
        !roadIndicesZ.has(gz) &&
        !roadIndicesZ.has(gz + 1)
      ) {
        const aptDna = apartmentDeck[apartmentsPlaced % apartmentDeck.length];
        const touchesNorth = gz - 1 >= 0 && roadIndicesZ.has(gz - 1);
        const touchesSouth = gz + 2 < gridSize && roadIndicesZ.has(gz + 2);
        const rotY = touchesNorth ? Math.PI : touchesSouth ? 0 : (rng() > 0.5 ? 0 : Math.PI);
        placeBuilding('APARTMENT', 0, gx, gz + 0.5, 1, 2, rotY, aptDna.palette, { apartmentDna: aptDna });
        apartmentsPlaced++;
      } else if (
        gx + 1 < gridSize &&
        !occupied[gx][gz] &&
        !occupied[gx + 1][gz] &&
        !roadIndicesZ.has(gz) &&
        !roadIndicesX.has(gx) &&
        !roadIndicesX.has(gx + 1) &&
        apartmentsPlaced < maxApartments
      ) {
        const aptDna = apartmentDeck[apartmentsPlaced % apartmentDeck.length];
        const touchesWest = gx - 1 >= 0 && roadIndicesX.has(gx - 1);
        const touchesEast = gx + 2 < gridSize && roadIndicesX.has(gx + 2);
        const rotY = touchesWest ? -Math.PI / 2 : touchesEast ? Math.PI / 2 : (rng() > 0.5 ? Math.PI / 2 : -Math.PI / 2);
        placeBuilding('APARTMENT', 0, gx + 0.5, gz, 2, 1, rotY, aptDna.palette, { apartmentDna: aptDna });
        apartmentsPlaced++;
      }
    }
  }

  // 5. FILL ALL REMAINING TILES WITH UNIQUE HOUSES & UNIQUE POCKET PARKS (ZERO DUPLICATES!)
  for (let gx = 0; gx < gridSize; gx++) {
    for (let gz = 0; gz < gridSize; gz++) {
      if (!occupied[gx][gz]) {
        const frontage = getRoadFrontage(gx, gz, 1, 1);

        let rot = 0;
        if (frontage.bordersRoad) {
          rot = frontage.candidateRotations[Math.floor(rng() * frontage.candidateRotations.length)];
        } else {
          rot = gz < halfGrid ? 0 : Math.PI;
        }

        const isHouse = rng() > 0.22;
        if (isHouse) {
          const dna = houseDeck[houseDeckIdx++ % houseDeck.length];
          placeBuilding('HOUSE', 0, gx, gz, 1, 1, rot, dna.palette, { houseDna: dna });
        } else {
          const parkVar = parkDeck[parkDeckIdx++ % parkDeck.length];
          placeBuilding('EMPTY_LOT', 0, gx, gz, 1, 1, rot, undefined, { parkVariant: parkVar });
        }
      }
    }
  }

  // 6. SELECT A ROAD-FRONTING RESIDENTIAL HOUSE AS THE PLAYER'S STARTING HOME
  const isRoadCoord = (v: number) => {
    const a = Math.round(Math.abs(v));
    return a === 0 || a === 3 || a === 33 || a === 63;
  };
  const residentialCandidates = buildingsList.filter((b) => {
    if (b.id !== 'HOUSE') return false;
    const rx = Math.round(b.worldPos[0] + Math.sin(b.rotationY) * 6.0);
    const rz = Math.round(b.worldPos[2] + Math.cos(b.rotationY) * 6.0);
    if (Math.abs(rx) > 63 || Math.abs(rz) > 63) return false;
    return Math.abs(Math.sin(b.rotationY)) > 0.5
      ? isRoadCoord(rx) && Math.abs(rz) <= 63
      : isRoadCoord(rz) && Math.abs(rx) <= 63;
  });
  const fallbackResidential = buildingsList.filter((b) => b.id === 'HOUSE');
  const pool = residentialCandidates.length > 0 ? residentialCandidates : fallbackResidential;
  const homeBuilding = pool.length > 0
    ? pool[Math.floor(rng() * pool.length)]
    : undefined;

  let spawnPoint: [number, number, number] = [0, 0.15, 33];
  let spawnHeading = 0;
  if (homeBuilding) {
    const rx = Math.round(homeBuilding.worldPos[0] + Math.sin(homeBuilding.rotationY) * 6.0);
    const rz = Math.round(homeBuilding.worldPos[2] + Math.cos(homeBuilding.rotationY) * 6.0);
    spawnPoint = [rx, 0.15, rz];
    if (Math.abs(Math.sin(homeBuilding.rotationY)) > 0.5) {
      spawnHeading = rz > 0 ? Math.PI : 0;
    } else {
      spawnHeading = rx > 0 ? -Math.PI / 2 : Math.PI / 2;
    }
  }

  batchStaticMeshes(roadsGroup);
  batchStaticMeshes(buildingsGroup, ['AmusementPark_WheelRotor', 'AmusementPark_CarouselRotor']);

  return {
    seed,
    gridSize,
    cellSize,
    roadsGroup,
    buildingsGroup,
    buildingsList,
    spawnPoint,
    spawnHeading,
    homeBuilding,
  };
}
