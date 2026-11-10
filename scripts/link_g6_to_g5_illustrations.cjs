const fs = require('fs');
const path = require('path');

// 1. Load G5 manifest
const g5Script = fs.readFileSync(path.join(__dirname, 'new_g5_pipeline.cjs'), 'utf8');
const g5Code = g5Script.substring(
  g5Script.indexOf('const G5_SHEETS ='),
  g5Script.indexOf('async function createWhitePatch')
);
const G5_SHEETS = (new Function(g5Code + '; return G5_SHEETS;'))();

// 2. Load G6 manifest
const g6Script = fs.readFileSync(path.join(__dirname, 'new_g6_pipeline.cjs'), 'utf8');
const g6Code = g6Script.substring(
  g6Script.indexOf('const G6_SHEETS ='),
  g6Script.indexOf('async function createWhitePatch')
);
const G6_SHEETS = (new Function(g6Code + '; return G6_SHEETS;'))();

const illustDir = path.join(__dirname, '../trimmed_assets/cards/illustration');

// Build G5 Lookup Map
const g5Map = new Map();
G5_SHEETS.forEach(sheet => {
  sheet.rows.forEach(r => {
    r.items.forEach(it => {
      if (it && it.en) {
        const file = `cards/illustration/hwg5_${sheet.unit}_${it.slot}_${it.en}_illust.png`;
        const key = it.en.toLowerCase().replace(/_/g, ' ').trim();
        g5Map.set(key, { unit: sheet.unit, slot: it.slot, en: it.en, file });
      }
    });
  });
});

// Explicit aliases for gerunds/activities
const EXPLICIT_ALIAS_MAP = {
  'singing': 'sing well',
  'cooking': 'cook',
  'swimming': 'swim',
  'running': 'run fast',
  'dancing': 'dance',
  'kendama': 'do kendama',
  'jumping rope': 'jump rope',
  'riding a unicycle': 'ride a unicycle',
  'drawing pictures': 'draw pictures',
  'playing the piano': 'play the piano',
  'playing the recorder': 'play the recorder',
  'playing the guitar': 'play the guitar'
};

// Build verified link map (excluding false positives like wristwatch vs watch TV)
const verifiedLinks = [];

G6_SHEETS.forEach(sheet => {
  const items = [];
  if (sheet.rows) {
    sheet.rows.forEach(r => r.items.forEach(it => { if (it && it.en) items.push(it); }));
  } else if (sheet.items) {
    sheet.items.forEach(it => { if (it && it.en) items.push(it); });
  }

  items.forEach(it => {
    const rawKey = it.en.toLowerCase().replace(/_/g, ' ').trim();
    if (sheet.unit === 'u06' && rawKey === 'watch') return; // Skip wristwatch vs watch TV

    let targetG5Key = rawKey;
    if (EXPLICIT_ALIAS_MAP[rawKey]) {
      targetG5Key = EXPLICIT_ALIAS_MAP[rawKey];
    }

    if (g5Map.has(targetG5Key)) {
      const g5 = g5Map.get(targetG5Key);
      const g6RelFile = `cards/illustration/hwg6_${sheet.unit}_${it.slot}_${it.en}_illust.png`;
      verifiedLinks.push({
        g6Unit: sheet.unit,
        g6Slot: it.slot,
        g6Word: it.en,
        g6RelFile,
        g5Unit: g5.unit,
        g5Slot: g5.slot,
        g5Word: g5.en,
        g5RelFile: g5.file
      });
    }
  });
});

console.log(`Verified duplicate links to apply: ${verifiedLinks.length}`);

// 3. Update public/data/master_vocabulary.json (Option A)
const mvPath = path.join(__dirname, '../public/data/master_vocabulary.json');
const mv = JSON.parse(fs.readFileSync(mvPath, 'utf8'));

let jsonUpdatedCount = 0;
let diskCopiedCount = 0;

verifiedLinks.forEach(link => {
  const g5FullPath = path.join(__dirname, '../trimmed_assets', link.g5RelFile);
  const g6FullPath = path.join(__dirname, '../trimmed_assets', link.g6RelFile);

  // 1. Mirror high-res file on disk for fallback safety
  if (fs.existsSync(g5FullPath)) {
    fs.copyFileSync(g5FullPath, g6FullPath);
    diskCopiedCount++;
  }


  // 2. Link in master_vocabulary.json
  // Find matching vocab items: check by id or english or hwg_card_illust matching g6RelFile
  const matchedItems = mv.filter(w => {
    const m = w.media_by_grade || {};
    if (m.ES_G6 && m.ES_G6.card_image === link.g6RelFile) return true;
    if (w.hwg_card_illust === link.g6RelFile) return true;
    if (w.english && w.english.toLowerCase().replace(/_/g, ' ') === link.g6Word.toLowerCase().replace(/_/g, ' ')) {
      if (m.ES_G6) return true;
    }
    return false;
  });

  matchedItems.forEach(w => {
    if (w.media_by_grade && w.media_by_grade.ES_G6) {
      w.media_by_grade.ES_G6.card_image = link.g5RelFile;
      jsonUpdatedCount++;
    }
  });
});

fs.writeFileSync(mvPath, JSON.stringify(mv, null, 2), 'utf8');

console.log(`\n===================================================================`);
console.log(`🎉 SUCCESS: GRADE 6 ➔ GRADE 5 ILLUSTRATION LINKING COMPLETE`);
console.log(`===================================================================`);
console.log(`• Total Verified Duplicates: ${verifiedLinks.length} cards`);
console.log(`• master_vocabulary.json ES_G6 links redirected: ${jsonUpdatedCount}`);
console.log(`• High-res files mirrored on disk: ${diskCopiedCount}`);
console.log(`• Grade 6 Colab Workload Tomorrow: Reduced from 373 down to ${373 - verifiedLinks.length} cards!`);
