import { BodyPartDefinition, BodyPartId } from './types';

export const BODY_PARTS_DATA: Record<BodyPartId, BodyPartDefinition> = {
  eyes: {
    id: 'eyes',
    nameSingular: 'eye',
    namePlural: 'eyes',
    jaName: '目',
    jaCounter: 'つ',
    icon: '👁️',
    min: 1,
    max: 8,
    isCore: true
  },
  ears: {
    id: 'ears',
    nameSingular: 'ear',
    namePlural: 'ears',
    jaName: '耳',
    jaCounter: 'つ',
    icon: '👂',
    min: 1,
    max: 6,
    isCore: true
  },
  nose: {
    id: 'nose',
    nameSingular: 'nose',
    namePlural: 'noses',
    jaName: '鼻',
    jaCounter: 'つ',
    icon: '👃',
    min: 0,
    max: 2,
    isCore: true
  },
  mouth: {
    id: 'mouth',
    nameSingular: 'mouth',
    namePlural: 'mouths',
    jaName: '口',
    jaCounter: 'つ',
    icon: '👄',
    min: 1,
    max: 3,
    isCore: true
  },
  arms: {
    id: 'arms',
    nameSingular: 'arm',
    namePlural: 'arms',
    jaName: 'うで',
    jaCounter: 'ほん',
    icon: '💪',
    min: 2,
    max: 8,
    isCore: true,
    evenPreferred: true
  },
  legs: {
    id: 'legs',
    nameSingular: 'leg',
    namePlural: 'legs',
    jaName: '足',
    jaCounter: 'ほん',
    icon: '🦵',
    min: 2,
    max: 8,
    isCore: true,
    evenPreferred: true
  },
  horns: {
    id: 'horns',
    nameSingular: 'horn',
    namePlural: 'horns',
    jaName: 'つの',
    jaCounter: 'ほん',
    icon: '🦄',
    min: 0,
    max: 4,
    isCore: false
  },
  wings: {
    id: 'wings',
    nameSingular: 'wing',
    namePlural: 'wings',
    jaName: 'はね',
    jaCounter: 'まい',
    icon: '🪽',
    min: 0,
    max: 4,
    isCore: false,
    evenPreferred: true
  },
  tails: {
    id: 'tails',
    nameSingular: 'tail',
    namePlural: 'tails',
    jaName: 'しっぽ',
    jaCounter: 'ほん',
    icon: '🐉',
    min: 0,
    max: 3,
    isCore: false
  }
};

export const CORE_BODY_PART_IDS: BodyPartId[] = [
  'eyes',
  'ears',
  'nose',
  'mouth',
  'arms',
  'legs'
];

export const ALL_BODY_PART_IDS: BodyPartId[] = [
  'eyes',
  'ears',
  'nose',
  'mouth',
  'arms',
  'legs',
  'horns',
  'wings',
  'tails'
];
