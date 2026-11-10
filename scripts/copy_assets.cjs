const fs = require('fs');
const path = require('path');

/**
 * Patterns and directory names to strictly exclude from production builds
 * to prevent dead/legacy backup assets from inflating dist/ size and bandwidth.
 */
const EXCLUDED_PATTERNS = [
  'illustration_legacy_png',
  'illustration (1st)',
  'illustration (old)',
  'illustration (good)',
  'full (good)',
  'janakute (1st)',
  'janakute (2nd)',
  '.backups',
  '.DS_Store',
  'Thumbs.db'
];

function isExcluded(name, parentDir = '') {
  const lower = name.toLowerCase();
  
  // 1. Explicit folder/file patterns
  if (EXCLUDED_PATTERNS.some(p => lower === p.toLowerCase() || lower.includes('legacy') || lower.includes('(old)') || lower.includes('(1st)'))) {
    return true;
  }

  // 2. Windows copy artifacts like "image (1).png"
  if (/\(\d+\)/.test(lower)) {
    return true;
  }

  // 3. Textbook flip-card dead animation frames (_2_c, _3_c, _4_c, etc.)
  if (/_([2-9])(_[a-z0-9]+)?\.(png|webp|svg)$/i.test(lower)) {
    return true;
  }

  // 4. Monochrome print sheets (_1_e, _2_e, etc.)
  if (/_([1-9])_e\.(png|webp|svg)$/i.test(lower)) {
    return true;
  }

  // 5. Unused text cutout folder under cards
  if (lower === 'text' && (parentDir.endsWith('cards') || parentDir.endsWith('cards\\') || parentDir.endsWith('cards/'))) {
    return true;
  }

  return false;
}

/**
 * Incrementally copies files from srcDir to destDir.
 * If dest file exists with identical size, it skips copying to remain fast.
 */
function copyDirIncremental(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) return 0;
  fs.mkdirSync(destDir, { recursive: true });
  let count = 0;

  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    if (isExcluded(entry.name, srcDir)) {
      continue;
    }

    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);

    if (entry.isDirectory()) {
      count += copyDirIncremental(srcPath, destPath);
    } else {
      let shouldCopy = true;
      if (fs.existsSync(destPath)) {
        try {
          const srcStat = fs.statSync(srcPath);
          const destStat = fs.statSync(destPath);
          if (srcStat.size === destStat.size) {
            shouldCopy = false;
          }
        } catch {
          shouldCopy = true;
        }
      }
      if (shouldCopy) {
        fs.copyFileSync(srcPath, destPath);
        count++;
      }
    }
  }
  return count;
}

const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

if (!fs.existsSync(distDir)) {
  console.log('Dist directory does not exist, skipping asset copy.');
  process.exit(0);
}

console.log('📦 Syncing production media assets to dist/...');
const startTime = Date.now();

// 1. Cards (Manabi assets)
const cardsSrc = path.join(rootDir, 'manabi_assets', 'cards');
const cardsDest = path.join(distDir, 'cards');
const cardsCount = copyDirIncremental(cardsSrc, cardsDest);

// Overlay trimmed cards
const trimmedCardsSrc = path.join(rootDir, 'trimmed_assets', 'cards');
const trimmedCardsCount = copyDirIncremental(trimmedCardsSrc, cardsDest);

// 2. Sound (Let's Try 1 & 2 Textbook Recordings)
const soundDest = path.join(distDir, 'media', 'sound');
const lt1SoundSrc = path.join(rootDir, 'letstry1', 'resources', 'app', 'app', '__media', 'dictionary', 'dic_card_data_sound');
const lt2SoundSrc = path.join(rootDir, 'letstry2', 'resources', 'app', 'app', '__media', 'dictionary', 'dic_card_data_sound');
const s1Count = copyDirIncremental(lt1SoundSrc, soundDest);
const s2Count = copyDirIncremental(lt2SoundSrc, soundDest);

// 2b. Sound Suite (Synthesized Azure Voices: Jenny, Andrew, Ana, Nanami)
const soundSuiteSrc = path.join(rootDir, 'sound_suite');
const soundSuiteDest = path.join(distDir, 'media', 'sound', 'sound_suite');
const suiteCount = copyDirIncremental(soundSuiteSrc, soundSuiteDest);

// 3. Images (Let's Try 1 & 2)
const imageDest = path.join(distDir, 'media', 'images');
const lt1ImageSrc = path.join(rootDir, 'letstry1', 'resources', 'app', 'app', '__media', 'dictionary', 'dic_card_data_image');
const lt2ImageSrc = path.join(rootDir, 'letstry2', 'resources', 'app', 'app', '__media', 'dictionary', 'dic_card_data_image');
const i1Count = copyDirIncremental(lt1ImageSrc, imageDest);
const i2Count = copyDirIncremental(lt2ImageSrc, imageDest);

// Overlay trimmed Let's Try images
const trimmedLtImageSrc = path.join(rootDir, 'trimmed_assets', 'letstry_images');
const trimmedLtCount = copyDirIncremental(trimmedLtImageSrc, imageDest);

// Overlay new curated Let's Try assets (Lanczos 1080p + SVGs) - Top Priority
const newLtImageSrc = path.join(rootDir, 'new_assets', 'letstry_images');
const newLtCount = copyDirIncremental(newLtImageSrc, imageDest);

const elapsedMs = Date.now() - startTime;
console.log(`✅ Media sync complete in ${elapsedMs}ms! (Updated: ${cardsCount + trimmedCardsCount} cards, ${s1Count + s2Count + suiteCount} sounds, ${i1Count + i2Count + trimmedLtCount + newLtCount} images)`);
