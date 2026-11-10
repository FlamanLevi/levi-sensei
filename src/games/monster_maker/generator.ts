import { GeneratorOptions, MonsterWorksheetData, MonsterPartRequirement, ShapeId, BodyPartId } from './types';
import { SHAPES_DATA, ALL_SHAPE_IDS } from './shapes';
import { BODY_PARTS_DATA, CORE_BODY_PART_IDS } from './bodyParts';

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomEven(min: number, max: number): number {
  const evens: number[] = [];
  for (let i = min; i <= max; i++) {
    if (i % 2 === 0) evens.push(i);
  }
  if (evens.length === 0) return min;
  return evens[Math.floor(Math.random() * evens.length)];
}

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function generateMonsterRequirements(
  enabledBodyParts: BodyPartId[],
  evenArmsLegs: boolean
): MonsterPartRequirement[] {
  return enabledBodyParts.map((partId) => {
    const def = BODY_PARTS_DATA[partId] || BODY_PARTS_DATA.eyes;
    let count: number;

    if (evenArmsLegs && def.evenPreferred) {
      count = getRandomEven(def.min, def.max);
    } else {
      count = getRandomInt(def.min, def.max);
    }

    // Singular vs Plural English label
    const labelEn = count === 1 ? `1 ${def.nameSingular}` : `${count} ${def.namePlural}`;
    const labelJa = `${def.jaName} ${count}${def.jaCounter}`;

    return {
      partId,
      count,
      labelEn,
      labelJa,
      icon: def.icon
    };
  });
}

export function generateWorksheetDeck(options: GeneratorOptions): MonsterWorksheetData[] {
  const {
    studentCount = 30,
    className = '2年1組',
    autoNumberAttendance = true,
    startAttendanceNumber = 1,
    evenArmsLegs = true,
    enabledShapes = ALL_SHAPE_IDS,
    enabledBodyParts = CORE_BODY_PART_IDS
  } = options;

  const validShapes = enabledShapes.length > 0 ? enabledShapes : ALL_SHAPE_IDS;
  const validParts = enabledBodyParts.length > 0 ? enabledBodyParts : CORE_BODY_PART_IDS;

  // Build a distributed pool of shapes so all enabled shapes are evenly represented
  const shapePool: ShapeId[] = [];
  while (shapePool.length < studentCount) {
    const shuffled = shuffleArray(validShapes);
    shapePool.push(...shuffled);
  }
  // Trim to exact student count and shuffle one more time
  const assignedShapes = shuffleArray(shapePool.slice(0, studentCount));

  const sheets: MonsterWorksheetData[] = [];

  for (let i = 0; i < studentCount; i++) {
    const studentNumber = autoNumberAttendance ? startAttendanceNumber + i : 0;
    const shapeId = assignedShapes[i];
    const shape = SHAPES_DATA[shapeId] || SHAPES_DATA.circle;
    const parts = generateMonsterRequirements(validParts, evenArmsLegs);

    sheets.push({
      id: `monster-ws-${i + 1}-${Date.now().toString(36)}`,
      studentNumber,
      className,
      shape,
      parts
    });
  }

  return sheets;
}

export function generateSingleDemoMonster(
  enabledShapes: ShapeId[] = ALL_SHAPE_IDS,
  enabledBodyParts: BodyPartId[] = CORE_BODY_PART_IDS,
  evenArmsLegs: boolean = true
): MonsterWorksheetData {
  const validShapes = enabledShapes.length > 0 ? enabledShapes : ALL_SHAPE_IDS;
  const validParts = enabledBodyParts.length > 0 ? enabledBodyParts : CORE_BODY_PART_IDS;

  const shapeId = validShapes[Math.floor(Math.random() * validShapes.length)];
  const shape = SHAPES_DATA[shapeId] || SHAPES_DATA.circle;
  const parts = generateMonsterRequirements(validParts, evenArmsLegs);

  return {
    id: `demo-monster-${Date.now().toString(36)}`,
    studentNumber: 0,
    className: 'Demo',
    shape,
    parts
  };
}
