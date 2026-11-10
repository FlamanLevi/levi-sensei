/**
 * Universal Number Badge Utility
 * Provides single source of truth for numeric vocabulary cards across Grades 3-6.
 * Powers dynamic vector rendering in Picture Dictionary, Lesson Deck Studio,
 * games (Speed Flash, Bingo, Katakana Breaker, etc.), and print exports.
 */

export const NUMBER_WORD_MAP: Record<string, string> = {
  zero: '0',
  '0': '0',
  one: '1',
  '1': '1',
  two: '2',
  '2': '2',
  three: '3',
  '3': '3',
  four: '4',
  '4': '4',
  five: '5',
  '5': '5',
  six: '6',
  '6': '6',
  seven: '7',
  '7': '7',
  eight: '8',
  '8': '8',
  nine: '9',
  '9': '9',
  ten: '10',
  '10': '10',
  eleven: '11',
  '11': '11',
  twelve: '12',
  '12': '12',
  thirteen: '13',
  '13': '13',
  fourteen: '14',
  '14': '14',
  fifteen: '15',
  '15': '15',
  sixteen: '16',
  '16': '16',
  seventeen: '17',
  '17': '17',
  eighteen: '18',
  '18': '18',
  nineteen: '19',
  '19': '19',
  twenty: '20',
  '20': '20',
  'twenty-one': '21',
  'twenty one': '21',
  '21': '21',
  'twenty-two': '22',
  'twenty two': '22',
  '22': '22',
  'twenty-three': '23',
  'twenty three': '23',
  '23': '23',
  'twenty-four': '24',
  'twenty four': '24',
  '24': '24',
  'twenty-five': '25',
  'twenty five': '25',
  '25': '25',
  'twenty-six': '26',
  'twenty six': '26',
  '26': '26',
  'twenty-seven': '27',
  'twenty seven': '27',
  '27': '27',
  'twenty-eight': '28',
  'twenty eight': '28',
  '28': '28',
  'twenty-nine': '29',
  'twenty nine': '29',
  '29': '29',
  thirty: '30',
  '30': '30',
  forty: '40',
  '40': '40',
  fifty: '50',
  '50': '50',
  sixty: '60',
  '60': '60',
  seventy: '70',
  '70': '70',
  eighty: '80',
  '80': '80',
  ninety: '90',
  '90': '90',
  hundred: '100',
  'one hundred': '100',
  'one-hundred': '100',
  '100': '100',
  'two hundred': '200',
  'two-hundred': '200',
  '200': '200',
};

export function getNumberValue(text?: string): string | null {
  if (!text) return null;
  const clean = text.toLowerCase().trim();
  if (NUMBER_WORD_MAP[clean]) {
    return NUMBER_WORD_MAP[clean];
  }
  if (/^\d+$/.test(clean)) {
    return clean;
  }
  return null;
}

export interface NumberTheme {
  bg: string;
  border: string;
  text: string;
  bgHex: string;
  borderHex: string;
  textHex: string;
}

export function getNumberTheme(val: string): NumberTheme {
  const n = parseInt(val.replace(/,/g, ''), 10);
  if (isNaN(n) || n < 10) {
    return {
      bg: 'bg-blue-50 dark:bg-blue-950/40',
      border: 'border-blue-200 dark:border-blue-800',
      text: 'text-blue-600 dark:text-blue-400',
      bgHex: '#eff6ff',
      borderHex: '#bfdbfe',
      textHex: '#2563eb',
    };
  }
  if (n < 20) {
    return {
      bg: 'bg-pink-50 dark:bg-pink-950/40',
      border: 'border-pink-200 dark:border-pink-800',
      text: 'text-pink-600 dark:text-pink-400',
      bgHex: '#fdf2f8',
      borderHex: '#fbcfe8',
      textHex: '#db2777',
    };
  }
  if (n < 30) {
    return {
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
      border: 'border-emerald-200 dark:border-emerald-800',
      text: 'text-emerald-600 dark:text-emerald-400',
      bgHex: '#ecfdf5',
      borderHex: '#a7f3d0',
      textHex: '#059669',
    };
  }
  if (n < 100) {
    return {
      bg: 'bg-purple-50 dark:bg-purple-950/40',
      border: 'border-purple-200 dark:border-purple-800',
      text: 'text-purple-600 dark:text-purple-400',
      bgHex: '#faf5ff',
      borderHex: '#e9d5ff',
      textHex: '#9333ea',
    };
  }
  return {
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    border: 'border-amber-200 dark:border-amber-800',
    text: 'text-amber-600 dark:text-amber-400',
    bgHex: '#fffbeb',
    borderHex: '#fde68a',
    textHex: '#d97706',
  };
}

export function generateNumberSvg(numStr: string, width = 400, height = 300): string {
  const theme = getNumberTheme(numStr);
  const fontSize = numStr.length >= 3 ? Math.round(height * 0.4) : numStr.length === 2 ? Math.round(height * 0.48) : Math.round(height * 0.56);
  const padX = Math.round(width * 0.06);
  const padY = Math.round(height * 0.07);
  const rectW = width - padX * 2;
  const rectH = height - padY * 2;
  const rx = Math.round(Math.min(rectW, rectH) * 0.14);
  const strokeW = Math.max(6, Math.round(Math.min(width, height) * 0.025));

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <rect x="${padX}" y="${padY}" width="${rectW}" height="${rectH}" rx="${rx}" fill="${theme.bgHex}" stroke="${theme.borderHex}" stroke-width="${strokeW}" stroke-linejoin="round"/>
  <text x="${width / 2}" y="${height / 2 + fontSize * 0.05}" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="${fontSize}" fill="${theme.textHex}" text-anchor="middle" dominant-baseline="central">${numStr}</text>
</svg>`;
}

export function getNumberSvgDataUri(numStr: string): string {
  const svg = generateNumberSvg(numStr, 400, 300);
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
