/**
 * Levi-Sensei English & STEM Platform
 * Elementary Mathematics (算数) Type Definitions & Curriculum Metadata
 * Based strictly on MEXT Course of Study for Elementary Mathematics (Grades 1-6)
 */

export type MathGrade = 'G1' | 'G2' | 'G3' | 'G4' | 'G5' | 'G6';

export type MathDomain = 
  | 'ALL'
  | 'NUMBERS_CALC'             // A: 数と計算 (Numbers and Calculations)
  | 'QUANTITIES_MEASUREMENT'   // B: 量と測定 (Quantities and Measurements)
  | 'GEOMETRIC_FIGURES'        // C: 図形 (Geometrical Figures)
  | 'MATHEMATICAL_RELATIONS';  // D: 数量関係 (Mathematical Relations)

export interface MathGradeMeta {
  grade: MathGrade;
  numericGrade: number;
  labelJa: string;
  labelEn: string;
  color: string;
  accentColor: string;
  badge: string;
  summaryJa: string;
  summaryEn: string;
}

export const MATH_GRADES: Record<MathGrade, MathGradeMeta> = {
  G1: {
    grade: 'G1',
    numericGrade: 1,
    labelJa: '小学1年生',
    labelEn: 'Grade 1',
    color: 'from-pink-500 to-rose-600',
    accentColor: 'rose',
    badge: '小1',
    summaryJa: 'くり上がり・くり下がりの計算、時計の読み方、かたちの名前',
    summaryEn: 'Addition/subtraction within 20, telling clock time, basic shapes'
  },
  G2: {
    grade: 'G2',
    numericGrade: 2,
    labelJa: '小学2年生',
    labelEn: 'Grade 2',
    color: 'from-amber-500 to-orange-600',
    accentColor: 'amber',
    badge: '小2',
    summaryJa: 'かけ算九九、2けたの筆算、長さ(m/cm/mm)と水のかさ(L/dL/mL)',
    summaryEn: 'Multiplication tables (Ku-ku), 2-digit column addition, metric units'
  },
  G3: {
    grade: 'G3',
    numericGrade: 3,
    labelJa: '小学3年生',
    labelEn: 'Grade 3',
    color: 'from-emerald-500 to-teal-600',
    accentColor: 'emerald',
    badge: '小3',
    summaryJa: 'わり算、あまりのあるわり算、小数・分数の初歩、重さ(g/kg/t)と円・球',
    summaryEn: 'Division with/without remainders, basic decimals/fractions, weight & circles'
  },
  G4: {
    grade: 'G4',
    numericGrade: 4,
    labelJa: '小学4年生',
    labelEn: 'Grade 4',
    color: 'from-sky-500 to-blue-600',
    accentColor: 'sky',
    badge: '小4',
    summaryJa: '2けたで割るわり算、四則計算の順序、四捨五入、長方形と正方形の面積',
    summaryEn: '2-digit division, order of operations, rounding, rectangle/square area'
  },
  G5: {
    grade: 'G5',
    numericGrade: 5,
    labelJa: '小学5年生',
    labelEn: 'Grade 5',
    color: 'from-indigo-500 to-violet-600',
    accentColor: 'indigo',
    badge: '小5',
    summaryJa: '倍数・約数、異分母の通分・加減、小数の乗除、三角形・台形の面積、円周率',
    summaryEn: 'LCM/GCD, fraction +/- with unlike denominators, polygon area, pi (3.14)'
  },
  G6: {
    grade: 'G6',
    numericGrade: 6,
    labelJa: '小学6年生',
    labelEn: 'Grade 6',
    color: 'from-purple-500 to-fuchsia-600',
    accentColor: 'purple',
    badge: '小6',
    summaryJa: '分数の乗除(逆数)、円の面積、速さ(距離・時間)、比と比例・反比例、対称性',
    summaryEn: 'Fraction */div, circle area, speed (km/h), ratio & proportion, symmetry'
  }
};

export interface MathDomainMeta {
  domain: MathDomain;
  mextLetter: string;
  nameJa: string;
  nameEn: string;
  descriptionJa: string;
  descriptionEn: string;
  iconName: string;
}

export const MATH_DOMAINS: Record<MathDomain, MathDomainMeta> = {
  ALL: {
    domain: 'ALL',
    mextLetter: '★',
    nameJa: '全領域ミックス',
    nameEn: 'All Domains Mixed',
    descriptionJa: '4領域すべてからバランスよく出題',
    descriptionEn: 'Balanced mix from all 4 curriculum domains',
    iconName: 'LayoutGrid'
  },
  NUMBERS_CALC: {
    domain: 'NUMBERS_CALC',
    mextLetter: 'A',
    nameJa: '数と計算',
    nameEn: 'Numbers & Calculations',
    descriptionJa: '整数の計算、小数、分数、四則計算のきまり',
    descriptionEn: 'Whole numbers, decimals, fractions, and calculation properties',
    iconName: 'Calculator'
  },
  QUANTITIES_MEASUREMENT: {
    domain: 'QUANTITIES_MEASUREMENT',
    mextLetter: 'B',
    nameJa: '量と測定',
    nameEn: 'Quantities & Measurements',
    descriptionJa: '単位換算、時間、面積、体積、速さ、メートル法',
    descriptionEn: 'Units, clock time, area, volume, speed, and metric system',
    iconName: 'Ruler'
  },
  GEOMETRIC_FIGURES: {
    domain: 'GEOMETRIC_FIGURES',
    mextLetter: 'C',
    nameJa: '図形',
    nameEn: 'Geometrical Figures',
    descriptionJa: '三角形・四角形、円、立体図形、合同、対称性',
    descriptionEn: 'Triangles, quadrilaterals, circles, 3D solids, congruence, symmetry',
    iconName: 'Shapes'
  },
  MATHEMATICAL_RELATIONS: {
    domain: 'MATHEMATICAL_RELATIONS',
    mextLetter: 'D',
    nameJa: '数量関係',
    nameEn: 'Mathematical Relations',
    descriptionJa: '文字や記号の式、比例・反比例、割合(%)、場合の数、平均',
    descriptionEn: 'Expressions with symbols/letters, proportion, percentages, combinations',
    iconName: 'TrendingUp'
  }
};

export interface MathGeneratorOptions {
  grade: MathGrade;
  domain?: MathDomain;
  topicId?: string;
  questionCount: number;
  timeLimitMs?: number;
}
