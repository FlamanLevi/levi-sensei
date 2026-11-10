const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const vocab = JSON.parse(fs.readFileSync(path.join(rootDir, 'public/data/master_vocabulary.json'), 'utf8'));

// Exact files in dist
const exactFiles = new Set();
const lowerFiles = new Map();

function scan(dir, prefix = '') {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      scan(path.join(dir, entry.name), rel);
    } else {
      const normal = rel.replace(/\\/g, '/');
      exactFiles.add(normal);
      lowerFiles.set(normal.toLowerCase(), normal);
    }
  }
}
scan(distDir);

function formatUrl(p) {
  if (!p) return null;
  if (p.startsWith('http') || p.startsWith('data:')) return p;
  const clean = p.replace(/^\/+/, '').replace(/\\/g, '/');
  return clean.startsWith('cards/') || clean.startsWith('manabi_assets/')
    ? clean
    : `media/images/${clean}`;
}

const numWords = new Set([
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty',
  'twenty-one', 'twenty-two', 'twenty-three', 'twenty-four', 'twenty-five', 'twenty-six', 'twenty-seven', 'twenty-eight', 'twenty-nine',
  'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety', 'hundred', 'one hundred', 'two hundred'
]);

const grades = ['ES_G3', 'ES_G4', 'ES_G5', 'ES_G6'];
const errors = [];

for (const g of grades) {
  for (const item of vocab) {
    if (!item.media_by_grade || !item.media_by_grade[g]) continue;
    const m = item.media_by_grade[g];

    const cleanWord = (item.english || '').toLowerCase().trim();
    if (numWords.has(cleanWord)) continue; // Dynamic SVG vector badge

    let imgPath = m.card_image || item.hwg_card_illust || item.card_image || item.primary_image;
    const formatted = formatUrl(imgPath);
    if (!formatted) {
      errors.push({ grade: g, word: item.english, type: 'NO_IMAGE_PATH', path: imgPath });
      continue;
    }

    if (!exactFiles.has(formatted)) {
      if (lowerFiles.has(formatted.toLowerCase())) {
        errors.push({
          grade: g,
          word: item.english,
          type: 'CASE_MISMATCH',
          requested: formatted,
          onDisk: lowerFiles.get(formatted.toLowerCase())
        });
      } else {
        errors.push({
          grade: g,
          word: item.english,
          type: 'NOT_FOUND_ON_DISK',
          requested: formatted
        });
      }
    }
  }
}

console.log('Total errors:', errors.length);
const byType = {};
for (const e of errors) {
  byType[e.type] = (byType[e.type] || 0) + 1;
}
console.log('Errors by type:', byType);

const caseMismatchList = errors.filter(e => e.type === 'CASE_MISMATCH');
console.log(`\n--- ALL CASE MISMATCHES (${caseMismatchList.length}) ---`);
caseMismatchList.forEach(e => console.log(`[${e.grade} - ${e.word}] requested: "${e.requested}" | onDisk: "${e.onDisk}"`));

const notFoundList = errors.filter(e => e.type === 'NOT_FOUND_ON_DISK');
console.log(`\n--- NOT FOUND ON DISK (${notFoundList.length}) ---`);
notFoundList.forEach(e => console.log(`[${e.grade} - ${e.word}] requested: "${e.requested}"`));

const noImageList = errors.filter(e => e.type === 'NO_IMAGE_PATH');
console.log(`\n--- NO IMAGE PATH (${noImageList.length}) ---`);
noImageList.forEach(e => console.log(`[${e.grade} - ${e.word}] path: "${e.path}"`));
