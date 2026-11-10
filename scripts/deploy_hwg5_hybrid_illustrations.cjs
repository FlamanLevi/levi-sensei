const fs = require('fs');
const path = require('path');

// 1. Load authoritative manifest
const pipelinePath = path.join(__dirname, 'new_g5_pipeline.cjs');
const scriptContent = fs.readFileSync(pipelinePath, 'utf8');
const g5Code = scriptContent.substring(
  scriptContent.indexOf('const G5_SHEETS ='),
  scriptContent.indexOf('async function createWhitePatch')
);
const getSheets = new Function(g5Code + '; return G5_SHEETS;');
const G5_SHEETS = getSheets();

// 2. Directories
const ROOT_SUITE = 'E:/complete_6_engine_suite_verified';
const DIR_PHOTO = path.join(ROOT_SUITE, '3_RealESRGAN_General');
const DIR_ANIME = path.join(ROOT_SUITE, '4_RealESRGAN_Anime');
const OUT_DIR = path.join(__dirname, '../trimmed_assets/cards/illustration');

if (!fs.existsSync(ROOT_SUITE)) {
  console.error(`❌ Suite directory not found at: ${ROOT_SUITE}`);
  process.exit(1);
}

const SHEET_TO_DIR = {
  1: 'feelings',
  2: 'weather',
  3: 'colors',
  4: 'shapes',
  5: 'sports',
  6: 'animals',
  7: 'fruits',
  8: 'vegetables',
  9: 'ingredients',
  10: 'dishes',
  11: 'foods',
  12: 'drinks',
  13: 'tastes',
  14: 'months',
  15: 'days',
  16: 'objects',
  17: 'more objects',
  18: 'subjects',
  19: 'activities',
  20: 'more activities',
  21: 'people',
  22: 'jobs',
  23: 'more jobs',
  24: 'adjectives',
  25: 'places',
  26: 'more places',
  27: 'nature',
  28: 'more nature',
  29: 'directions',
  30: 'actions',
  31: 'more adjectives',
  32: 'even more adjectives'
};

const PHOTO_CATEGORIES = new Set(['jobs', 'more jobs', 'animals', 'objects', 'more objects']);

console.log('===================================================================');
console.log('🚀 DEPLOYING HERE WE GO GRADE 5 HYBRID AI-UPSCALED ILLUSTRATIONS');
console.log('===================================================================');

let totalProcessed = 0;
let upgradedPhoto = 0;
let upgradedAnime = 0;
let retainedExisting = 0;

const logItems = [];

G5_SHEETS.forEach((sheet, sIdx) => {
  const cat = SHEET_TO_DIR[sIdx + 1];
  const isPhoto = PHOTO_CATEGORIES.has(cat);
  const srcBase = isPhoto ? DIR_PHOTO : DIR_ANIME;
  const catDir = path.join(srcBase, cat);
  const filesOnE = fs.readdirSync(catDir);

  const flatItems = [];
  sheet.rows.forEach(r => r.items.forEach(it => { if (it && it.en) flatItems.push(it); }));

  flatItems.forEach((it, itemIdx) => {
    totalProcessed++;
    const destName = `hwg5_${sheet.unit}_${it.slot}_${it.en}_illust.png`;
    const destPath = path.join(OUT_DIR, destName);

    let matchFile = null;

    // Handle special swap in Sheet 31 (more adjectives)
    if (cat === 'more adjectives' && it.en === 'cute') {
      matchFile = filesOnE.find(f => f.includes('cute'));
    } else if (cat === 'more adjectives' && it.en === 'popular') {
      matchFile = filesOnE.find(f => f.includes('popular'));
    } else {
      // Standard 1-based index prefix match
      const prefix = String(itemIdx + 1).padStart(2, '0') + '_';
      matchFile = filesOnE.find(f => f.startsWith(prefix));
    }

    if (matchFile) {
      const srcFile = path.join(catDir, matchFile);
      fs.copyFileSync(srcFile, destPath);

      if (isPhoto) {
        upgradedPhoto++;
        logItems.push(`  📸 [Photo -> General] ${destName} <= ${cat}/${matchFile}`);
      } else {
        upgradedAnime++;
        logItems.push(`  🎨 [Cartoon -> Anime 6B] ${destName} <= ${cat}/${matchFile}`);
      }
    } else {
      // Must exist already
      if (fs.existsSync(destPath)) {
        retainedExisting++;
        logItems.push(`  🛡️ [Retained Existing] ${destName} (omitted from suite)`);
      } else {
        console.error(`❌ CRITICAL: ${destName} does not exist in destination!`);
        process.exit(1);
      }
    }
  });
});

console.log(`\nDeployment Complete!`);
console.log(`• Total Target Cards: ${totalProcessed}`);
console.log(`• Real Photos (RealESRGAN_General): ${upgradedPhoto}`);
console.log(`• 2D Cartoons (RealESRGAN_Anime 6B): ${upgradedAnime}`);
console.log(`• Retained High-Res Originals: ${retainedExisting}`);

// Audit destination folder
const allG5 = fs.readdirSync(OUT_DIR).filter(f => f.startsWith('hwg5_') && f.endsWith('_illust.png'));
console.log(`\nVerification on Disk:`);
console.log(`• Total hwg5_*_illust.png files: ${allG5.length} (Expected: 332)`);

let totalSize = 0;
allG5.forEach(f => {
  totalSize += fs.statSync(path.join(OUT_DIR, f)).size;
});
console.log(`• Total directory size: ${(totalSize / (1024 * 1024)).toFixed(2)} MB`);

if (allG5.length === 332) {
  console.log(`\n🎉 100% PERFECT DEPLOYMENT: All 332 Grade 5 cards active!`);
} else {
  console.error(`\n⚠️ Mismatch in file count: found ${allG5.length}, expected 332!`);
}
