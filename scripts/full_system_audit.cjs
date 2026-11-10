const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Load vocabulary
const vocabPath = path.join(__dirname, '../public/data/master_vocabulary.json');
const vocab = JSON.parse(fs.readFileSync(vocabPath, 'utf8'));

// Number badge logic mirroring src/utils/numberBadge.ts
const NUMBER_WORD_MAP = {
  'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4,
  'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9,
  'ten': 10, 'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14,
  'fifteen': 15, 'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19,
  'twenty': 20, 'twenty-one': 21, 'twenty-two': 22, 'twenty-three': 23, 'twenty-four': 24,
  'twenty-five': 25, 'twenty-six': 26, 'twenty-seven': 27, 'twenty-eight': 28, 'twenty-nine': 29,
  'thirty': 30, 'thirty-one': 31, 'forty': 40, 'fifty': 50, 'sixty': 60,
  'seventy': 70, 'eighty': 80, 'ninety': 90, 'one hundred': 100, 'hundred': 100,
  'two hundred': 200, 'three hundred': 300, 'four hundred': 400, 'five hundred': 500,
  'six hundred': 600, 'seven hundred': 700, 'eight hundred': 800, 'nine hundred': 900,
  'one thousand': 1000, 'thousand': 1000
};

function getNumberValue(text) {
  if (!text) return null;
  const trimmed = text.trim();
  if (/^\d+$/.test(trimmed)) {
    const parsed = parseInt(trimmed, 10);
    if (!isNaN(parsed)) return parsed;
  }
  const lower = trimmed.toLowerCase();
  if (lower in NUMBER_WORD_MAP) {
    return NUMBER_WORD_MAP[lower];
  }
  return null;
}

function isLowerElementaryGrade(grade) {
  if (!grade) return false;
  const normalized = grade.toUpperCase();
  return normalized === 'ES_G1' || normalized === 'ES_G2' || normalized === 'ES_G3' || normalized === 'ES_G4' || normalized === '3' || normalized === '4';
}

function isUpperElementaryGrade(grade) {
  if (!grade) return false;
  const normalized = grade.toUpperCase();
  return normalized === 'ES_G5' || normalized === 'ES_G6' || normalized === '5' || normalized === '6';
}

function isHereWeGoAsset(p) {
  if (!p) return false;
  return p.includes('cards/') || p.includes('hwg') || p.includes('_illust.') || p.includes('_full.') || p.includes('_text.');
}

function isLetsTryAsset(p) {
  if (!p) return false;
  return p.includes('dic_3_') || p.includes('dic_4_') || p.includes('letstry1') || p.includes('letstry2');
}

function resolveCardImage(word, tier, grade) {
  const numVal = getNumberValue(word.english);
  if (numVal !== null) {
    return `data:image/svg+xml;utf8,<svg>number-${numVal}</svg>`;
  }

  const gradeKey = grade.startsWith('ES_G') ? grade : `ES_G${grade}`;
  const isLower = isLowerElementaryGrade(gradeKey);
  const isUpper = isUpperElementaryGrade(gradeKey);

  let rawPath = '';

  if (gradeKey && word.media_by_grade && word.media_by_grade[gradeKey]) {
    const gm = word.media_by_grade[gradeKey];
    const candidate = (tier === 'picture_word' && gm.card_full) ? gm.card_full : gm.card_image;
    if (candidate) {
      if (isLower && isHereWeGoAsset(candidate)) {
        // rejected
      } else if (isUpper && isLetsTryAsset(candidate)) {
        // rejected
      } else {
        rawPath = candidate;
      }
    }
  }

  if (!rawPath && tier === 'picture_word') {
    if (isLower) {
      if (word.card_image_bilingual && !isHereWeGoAsset(word.card_image_bilingual)) {
        rawPath = word.card_image_bilingual;
      } else if (word.primary_image && isLetsTryAsset(word.primary_image)) {
        rawPath = word.primary_image.replace(/_1_c\.(png|webp|svg)/, '_1_ce.$1');
      } else if (word.card_image && isLetsTryAsset(word.card_image)) {
        rawPath = word.card_image.replace(/_1_c\.(png|webp|svg)/, '_1_ce.$1');
      }
    } else if (isUpper) {
      if (word.hwg_card_full && !isLetsTryAsset(word.hwg_card_full)) {
        rawPath = word.hwg_card_full;
      } else if (word.primary_image && isHereWeGoAsset(word.primary_image)) {
        rawPath = word.primary_image;
      }
    }
  }

  if (!rawPath) {
    if (isLower) {
      if (word.card_image && isLetsTryAsset(word.card_image)) {
        rawPath = word.card_image;
      } else if (word.primary_image && isLetsTryAsset(word.primary_image)) {
        rawPath = word.primary_image;
      }
    } else if (isUpper) {
      if (word.hwg_card_illust && !isLetsTryAsset(word.hwg_card_illust)) {
        rawPath = word.hwg_card_illust;
      } else if (word.hwg_card_full && !isLetsTryAsset(word.hwg_card_full)) {
        rawPath = word.hwg_card_full;
      } else if (word.primary_image && isHereWeGoAsset(word.primary_image)) {
        rawPath = word.primary_image;
      } else if (word.card_image && isHereWeGoAsset(word.card_image)) {
        rawPath = word.card_image;
      }
    }
  }

  if (!rawPath) return null;
  if (isLower && isHereWeGoAsset(rawPath)) return null;
  if (isUpper && isLetsTryAsset(rawPath)) return null;

  if (tier === 'picture_only') {
    if (rawPath.includes('_1_ce.')) {
      rawPath = rawPath.replace(/_1_ce\.(png|webp|svg)/, '_1_c.$1');
    }
    if (rawPath.includes('/cards/full/')) {
      rawPath = rawPath.replace('/cards/full/', '/cards/illustration/');
    } else if (rawPath.includes('cards/full/')) {
      rawPath = rawPath.replace('cards/full/', 'cards/illustration/');
    }
    if (rawPath.includes('_full.')) {
      rawPath = rawPath.replace(/_full\.(png|webp)/, '_illust.$1');
    }
  }

  let resolved = rawPath;
  if (rawPath.startsWith('cards/')) {
    resolved = `/${rawPath}`;
  } else if (!rawPath.startsWith('http://') && !rawPath.startsWith('https://') && !rawPath.startsWith('/')) {
    resolved = `/media/images/${rawPath}`;
  }
  return resolved;
}

// Case sensitive check on disk
function checkCaseSensitiveExists(baseDir, relativeUrl) {
  // relativeUrl starts with /
  const cleanUrl = relativeUrl.split('?')[0].replace(/^\//, '');
  const parts = cleanUrl.split('/');
  
  let current = baseDir;
  for (const part of parts) {
    if (!fs.existsSync(current)) return { exists: false, reason: 'Dir not found' };
    const files = fs.readdirSync(current);
    if (!files.includes(part)) {
      const matchCI = files.find(f => f.toLowerCase() === part.toLowerCase());
      if (matchCI) {
        return { exists: false, reason: `Case mismatch: asked '${part}', disk has '${matchCI}'` };
      }
      return { exists: false, reason: `File not found in ${current}` };
    }
    current = path.join(current, part);
  }
  return { exists: true, fullPath: current };
}

async function audit() {
  const distDir = path.resolve(__dirname, '../dist');
  console.log('Auditing dist directory:', distDir);

  const grades = ['ES_G3', 'ES_G4', 'ES_G5', 'ES_G6'];

  for (const g of grades) {
    console.log(`\n======================================================`);
    console.log(`AUDITING GRADE: ${g}`);
    console.log(`======================================================`);

    const words = vocab.filter(w => w.media_by_grade && w.media_by_grade[g]);
    console.log(`Total words registered in ${g}: ${words.length}`);

    let vectorNumbers = 0;
    let missingResolutions = [];
    let brokenFiles = [];
    let lowRes = [];
    let weirdAspect = [];
    let validImages = 0;

    for (const w of words) {
      const resolved = resolveCardImage(w, 'picture_only', g);
      if (!resolved) {
        missingResolutions.push({
          english: w.english,
          japanese: w.japanese,
          unit: w.media_by_grade[g]?.unit,
          rawCardImg: w.media_by_grade[g]?.card_image,
          primaryImg: w.primary_image
        });
        continue;
      }

      if (resolved.startsWith('data:image/svg+xml')) {
        vectorNumbers++;
        continue;
      }

      // Check file in dist
      const check = checkCaseSensitiveExists(distDir, resolved);
      if (!check.exists) {
        brokenFiles.push({
          english: w.english,
          unit: w.media_by_grade[g]?.unit,
          url: resolved,
          reason: check.reason
        });
        continue;
      }

      // Read image metadata
      validImages++;
      try {
        const meta = await sharp(check.fullPath).metadata();
        const aspect = meta.width / meta.height;
        if (meta.width < 250 || meta.height < 250) {
          lowRes.push({ english: w.english, width: meta.width, height: meta.height, file: path.basename(check.fullPath) });
        }
        if (aspect > 2.8 || aspect < 0.35) {
          weirdAspect.push({ english: w.english, aspect: aspect.toFixed(2), width: meta.width, height: meta.height, file: path.basename(check.fullPath) });
        }
      } catch (err) {
        brokenFiles.push({
          english: w.english,
          unit: w.media_by_grade[g]?.unit,
          url: resolved,
          reason: `Corrupted image / sharp error: ${err.message}`
        });
      }
    }

    console.log(`- Vector numbers: ${vectorNumbers}`);
    console.log(`- Valid image files: ${validImages}`);
    console.log(`- Missing resolution (null): ${missingResolutions.length}`);
    console.log(`- Broken files / 404 / Case mismatches: ${brokenFiles.length}`);
    console.log(`- Low resolution (<250px): ${lowRes.length}`);
    console.log(`- Weird aspect ratio (>2.8 or <0.35): ${weirdAspect.length}`);

    if (missingResolutions.length > 0) {
      console.log(`\n  [MISSING RESOLUTION WORDS - ${missingResolutions.length}]`);
      missingResolutions.forEach(m => console.log(`    * "${m.english}" (JP: ${m.japanese}, Unit: ${m.unit}) -> rawCardImg: ${m.rawCardImg}`));
    }

    if (brokenFiles.length > 0) {
      console.log(`\n  [BROKEN FILES - ${brokenFiles.length}]`);
      brokenFiles.forEach(b => console.log(`    * "${b.english}" (Unit: ${b.unit}) -> URL: ${b.url} | Reason: ${b.reason}`));
    }

    if (lowRes.length > 0) {
      console.log(`\n  [LOW RESOLUTION - ${lowRes.length}]`);
      lowRes.slice(0, 15).forEach(lr => console.log(`    * "${lr.english}": ${lr.width}x${lr.height} (${lr.file})`));
    }

    if (weirdAspect.length > 0) {
      console.log(`\n  [WEIRD ASPECT RATIO - ${weirdAspect.length}]`);
      weirdAspect.forEach(wa => console.log(`    * "${wa.english}": aspect ${wa.aspect} (${wa.width}x${wa.height}) in ${wa.file}`));
    }
  }
}

audit().catch(console.error);
