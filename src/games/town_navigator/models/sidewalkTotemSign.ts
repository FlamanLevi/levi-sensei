import * as THREE from 'three';
import { ActiveModel } from '../TownModelInspector';

export interface TotemSignOptions {
  id: ActiveModel;
  nameEn: string;
  nameJa: string;
  tier: 0 | 1 | 2 | 3;
}

const EMOJI_MAP: Record<string, string> = {
  HOUSE: '🏠',
  EMPTY_LOT: '🌸',
  POLICE_BOX: '🚨',
  BUS_STOP: '🚏',
  CONVENIENCE_STORE: '🏪',
  POST_OFFICE: '📮',
  POLICE_STATION: '👮',
  BOOKSTORE: '📖',
  FLOWER_SHOP: '💐',
  RESTAURANT: '🍽️',
  SCHOOL: '🏫',
  JUNIOR_HIGH_SCHOOL: '🎒',
  DEPARTMENT_STORE: '🛍️',
  SWIMMING_POOL: '🏊',
  APARTMENT: '🏢',
  HOSPITAL: '🏥',
  FIRE_STATION: '🚒',
  CITY_HALL: '🏢',
  STATION: '🚆',
  LIBRARY: '📚',
  SUPERMARKET: '🛒',
  GYM: '🏋️',
  MUSEUM: '🏛️',
  TEMPLE: '🔔',
  SHRINE: '⛩️',
  PARK: '🌳',
  GARDEN: '🌺',
  STADIUM: '⚽',
  ZOO: '🦁',
  AQUARIUM: '🐬',
  CASTLE: '🏯',
  AMUSEMENT_PARK: '🎡',
};

const textureCache = new Map<string, THREE.CanvasTexture>();

function getTotemTexture(id: string, nameEn: string, nameJa: string, tier: number, emoji: string): THREE.CanvasTexture {
  const cacheKey = `${id}_${tier}`;
  const cached = textureCache.get(cacheKey);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 768;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    const fallback = new THREE.CanvasTexture(canvas);
    fallback.colorSpace = THREE.SRGBColorSpace;
    return fallback;
  }

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 512, 768);

  const tierColor = tier === 3 ? '#f59e0b' : tier === 2 ? '#38bdf8' : tier === 1 ? '#10b981' : '#a855f7';
  ctx.strokeStyle = tierColor;
  ctx.lineWidth = 16;
  ctx.strokeRect(8, 8, 496, 752);

  // Inner brass hairline border
  ctx.strokeStyle = 'rgba(250, 204, 21, 0.35)';
  ctx.lineWidth = 3;
  ctx.strokeRect(22, 22, 468, 724);

  // Top Header Ribbon
  ctx.fillStyle = tierColor;
  ctx.fillRect(20, 20, 472, 76);

  ctx.fillStyle = '#0f172a';
  ctx.font = '900 32px "UD Digi Kyokasho NP-R", "BIZ UDPGothic", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const tierLabel = tier === 3 ? '★ CITY LANDMARK ★' : tier === 2 ? '◆ CIVIC FACILITY ◆' : tier === 1 ? '● TOWN SHOP ●' : '● POCKET PARK ●';
  ctx.fillText(tierLabel, 256, 58);

  // Subtle circular medallion halo behind emoji
  ctx.beginPath();
  ctx.arc(256, 225, 86, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(30, 41, 59, 0.85)';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = tierColor;
  ctx.stroke();

  // Large Central Emoji Icon
  ctx.font = '122px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
  ctx.fillText(emoji, 256, 232);

  // Bold English Title
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const cleanEn = id === 'EMPTY_LOT' ? 'POCKET PARK' : nameEn.toUpperCase();
  const words = cleanEn.split(' ');

  if (words.length === 1 && cleanEn.length <= 10) {
    ctx.font = '900 62px "UD Digi Kyokasho NP-R", "BIZ UDPGothic", sans-serif';
    ctx.fillText(cleanEn, 256, 415, 460);
  } else if (words.length <= 2) {
    ctx.font = '900 54px "UD Digi Kyokasho NP-R", "BIZ UDPGothic", sans-serif';
    if (words.length === 2) {
      ctx.fillText(words[0], 256, 385, 460);
      ctx.fillText(words[1], 256, 450, 460);
    } else {
      ctx.fillText(cleanEn, 256, 415, 460);
    }
  } else {
    ctx.font = '900 46px "UD Digi Kyokasho NP-R", "BIZ UDPGothic", sans-serif';
    const mid = Math.ceil(words.length / 2);
    ctx.fillText(words.slice(0, mid).join(' '), 256, 385, 460);
    ctx.fillText(words.slice(mid).join(' '), 256, 445, 460);
  }

  // Japanese Subtitle
  const plainJa = nameJa.replace(/<[^>]*>/g, '');
  ctx.fillStyle = '#fde047';
  ctx.font = 'bold 42px "UD Digi Kyokasho NP-R", "BIZ UDPGothic", sans-serif';
  ctx.fillText(plainJa, 256, 565, 460);

  // Bottom Entrance Indicator Pill
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(56, 640, 400, 72);
  ctx.strokeStyle = tierColor;
  ctx.lineWidth = 4;
  ctx.strokeRect(56, 640, 400, 72);

  ctx.fillStyle = tierColor;
  ctx.font = 'bold 30px "UD Digi Kyokasho NP-R", "BIZ UDPGothic", sans-serif';
  ctx.fillText('▼ ENTRANCE / 入口 ▼', 256, 676);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  textureCache.set(cacheKey, texture);
  return texture;
}

const granitePlinthMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.75 });
const metalMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.7 });
const goldFinialMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.3, metalness: 0.8 });
const beaconMat = new THREE.MeshStandardMaterial({
  color: 0xfef08a,
  emissive: 0xfef08a,
  emissiveIntensity: 0.95,
  roughness: 0.2,
});

/**
 * Builds an authentic 4-sided illuminated Japanese street directory totem (*Machi-no-Annai-tō*).
 */
export function buildSidewalkTotemSign(options: TotemSignOptions): THREE.Group {
  const group = new THREE.Group();
  group.name = `TotemSign_${options.id}`;

  const emoji = EMOJI_MAP[options.id] || '📍';
  const texture = getTotemTexture(options.id, options.nameEn, options.nameJa, options.tier, emoji);

  const faceMat = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.35,
    emissive: 0xffffff,
    emissiveMap: texture,
    emissiveIntensity: 0.55,
  });

  // 1. Stepped Granite & Dark Bronze Pedestal Base on Sidewalk
  const lowerPlinth = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.08, 0.68), granitePlinthMat);
  lowerPlinth.position.set(0, 0.22, 0);
  const upperBase = new THREE.Mesh(new THREE.BoxGeometry(0.60, 0.08, 0.60), metalMat);
  upperBase.position.set(0, 0.30, 0);
  group.add(lowerPlinth, upperBase);

  // 2. 4-Sided Illuminated Sign Pillar (Centered at Y = 0.94m — right at 5th-grader eye level!)
  const pillarGeo = new THREE.BoxGeometry(0.54, 1.20, 0.54);
  const materials = [
    faceMat,  // +X
    faceMat,  // -X
    metalMat, // +Y
    metalMat, // -Y
    faceMat,  // +Z
    faceMat,  // -Z
  ];
  const pillar = new THREE.Mesh(pillarGeo, materials);
  pillar.position.set(0, 0.94, 0);
  pillar.castShadow = true;
  group.add(pillar);

  // 3. Pitched Hip-Roof Eaves Cap, Warm Lantern Crown & Golden Finial
  const capGeo = new THREE.BoxGeometry(0.64, 0.05, 0.64);
  const cap = new THREE.Mesh(capGeo, metalMat);
  cap.position.set(0, 1.565, 0);

  const lanternGeo = new THREE.BoxGeometry(0.40, 0.10, 0.40);
  const lantern = new THREE.Mesh(lanternGeo, beaconMat);
  lantern.position.set(0, 1.64, 0);

  const roofPyramidGeo = new THREE.ConeGeometry(0.50 * Math.SQRT1_2, 0.16, 4);
  roofPyramidGeo.rotateY(Math.PI / 4);
  const roofPyramid = new THREE.Mesh(roofPyramidGeo, metalMat);
  roofPyramid.position.set(0, 1.77, 0);

  const finialBall = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), goldFinialMat);
  finialBall.position.set(0, 1.87, 0);

  group.add(cap, lantern, roofPyramid, finialBall);

  return group;
}
