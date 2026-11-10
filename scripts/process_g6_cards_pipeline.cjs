const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

/**
 * =============================================================================
 * LEVI-SENSEI HERE WE GO GRADE 6 MULTI-STAGE ASSET PIPELINE v5.0
 * =============================================================================
 * Breaks asset processing into 4 discrete, verifiable stages:
 *
 *   STAGE 1: Raw Cell Extraction
 *            Extracts each card within the colored sheet borders.
 *            Output: manabi_assets/Grade 6 Manabi (new)/_pipeline/step1_raw_cells/
 *
 *   STAGE 2: Paw Watermark Removal
 *            Detects orange/purple paw logos and erases them cleanly.
 *            Output: manabi_assets/Grade 6 Manabi (new)/_pipeline/step2_unwatermarked/
 *
 *   STAGE 3: Illustration Crop & Whitespace Trim
 *            Isolates pure illustration (excluding handwriting guides/text),
 *            auto-trims excess whitespace, and adds clean 10-12px frame padding.
 *            Output: manabi_assets/Grade 6 Manabi (new)/_pipeline/step3_trimmed_illust/
 *
 *   STAGE 4: 4x Super-Sampling & Production Asset Generation
 *            Upscales clean illustrations and full cards at 4x Ultra-DPI
 *            (Lanczos3 + line-art unsharp mask) for 300 DPI print & 4K Front TV.
 *            Output: trimmed_assets/cards/illustration/
 *                    trimmed_assets/cards/full/
 * =============================================================================
 */

const MASTER_DIR = path.join(__dirname, '../manabi_assets/Grade 6 Manabi (new)');
const PIPELINE_DIR = path.join(MASTER_DIR, '_pipeline');

const STAGE1_DIR = path.join(PIPELINE_DIR, 'step1_raw_cells');
const STAGE2_DIR = path.join(PIPELINE_DIR, 'step2_unwatermarked');
const STAGE3_DIR = path.join(PIPELINE_DIR, 'step3_trimmed_illust');
const STAGE4_DIR = path.join(PIPELINE_DIR, 'step4_supersampled_illust');

const OUT_ILLUST_DIR = path.join(__dirname, '../trimmed_assets/cards/illustration');
const OUT_FULL_DIR = path.join(__dirname, '../trimmed_assets/cards/full');

[STAGE1_DIR, STAGE2_DIR, STAGE3_DIR, STAGE4_DIR, OUT_ILLUST_DIR, OUT_FULL_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// 4x Ultra-DPI Super-Sampling (Target ~800-900px for 300 DPI print & 4K TV)
const SCALE = 4;

const cardsData = JSON.parse(fs.readFileSync(path.join(__dirname, 'g6_cards_manifest.json'), 'utf8'));

const SHEET_LAYOUTS = [
  // Unit 1: Countries (26 cards)
  { unit: 'u01', file: 'u11_p1_1.png', rows: 3, cols: 4, count: 12, startIdx: 0 },
  { unit: 'u01', file: 'u11_p1_2.png', rows: 4, cols: 4, count: 14, startIdx: 12 },

  // Unit 2: Activities & Hobbies (16 cards)
  { unit: 'u02', file: 'u11_p2_1.png', rows: 3, cols: 4, count: 12, startIdx: 0 },
  { unit: 'u02', file: 'u11_p2_2.png', rows: 1, cols: 4, count: 4, startIdx: 12 },

  // Unit 3: Seasons (4 cards)
  { unit: 'u03', file: 'u11_p3.png', rows: 1, cols: 4, count: 4, startIdx: 0 },

  // Unit 4: Months (12 cards)
  { unit: 'u04', file: 'u11_p4_1.png', rows: 2, cols: 4, count: 8, startIdx: 0 },
  { unit: 'u04', file: 'u11_p4_2.png', rows: 1, cols: 4, count: 4, startIdx: 8 },

  // Unit 5: Festivals (12 cards, 3 columns)
  { unit: 'u05', file: 'u11_p5_1.png', rows: 4, cols: 3, count: 12, startIdx: 0 },

  // Unit 6: Verbs & Actions (47 cards)
  { unit: 'u06', file: 'u11_p6_1.png', rows: 3, cols: 4, count: 12, startIdx: 0 },
  { unit: 'u06', file: 'u11_p6_2.png', rows: 3, cols: 4, count: 12, startIdx: 12 },
  { unit: 'u06', file: 'u11_p6_3.png', rows: 3, cols: 4, count: 12, startIdx: 24 },
  { unit: 'u06', file: 'u11_p6_4.png', rows: 3, cols: 4, count: 11, startIdx: 36 },

  // Unit 7: Times & Days (15 cards)
  { unit: 'u07', file: 'u11_p7_1.png', rows: 1, cols: 4, count: 4, startIdx: 0 },
  { unit: 'u07', file: 'u11_p7_2.png', rows: 2, cols: 4, count: 7, startIdx: 4 },
  { unit: 'u07', file: 'u11_p7_4.png', rows: 1, cols: 4, count: 4, startIdx: 11 },

  // Unit 8: Daily Routines (21 cards, 2 columns, side-by-side)
  { unit: 'u08', file: 'u11_p8_1.png', rows: 6, cols: 2, count: 12, startIdx: 0, colWOverride: 540, borderInsetX: 18, isSideBySide: true },
  { unit: 'u08', file: 'u11_p8_2.png', rows: 5, cols: 2, count: 9, startIdx: 12, colWOverride: 540, borderInsetX: 18, isSideBySide: true },

  // Unit 9: Places & Facilities (24 cards)
  { unit: 'u09', file: 'u11_p9_1.png', rows: 3, cols: 4, count: 12, startIdx: 0 },
  { unit: 'u09', file: 'u11_p9_2.png', rows: 3, cols: 4, count: 12, startIdx: 12 },

  // Unit 10: Nature & Habitats (24 cards)
  { unit: 'u10', file: 'u11_p10_1.png', rows: 3, cols: 4, count: 12, startIdx: 0 },
  { unit: 'u10', file: 'u11_p10_2.png', rows: 3, cols: 4, count: 12, startIdx: 12 },

  // Unit 11: Animals (39 cards)
  { unit: 'u11', file: 'u11_p11_1.png', rows: 4, cols: 4, count: 16, startIdx: 0 },
  { unit: 'u11', file: 'u11_p11_2.png', rows: 3, cols: 4, count: 12, startIdx: 16 },
  { unit: 'u11', file: 'u11_p11_3.png', rows: 3, cols: 4, count: 11, startIdx: 28 },

  // Unit 12: Body & Features (15 cards)
  { unit: 'u12', file: 'u11_p12.png', rows: 4, cols: 4, count: 15, startIdx: 0 },

  // Unit 13: Clubs & School Life (15 cards)
  { unit: 'u13', file: 'u11_p13.png', rows: 4, cols: 4, count: 15, startIdx: 0 },

  // Unit 14: School Subjects (11 cards)
  { unit: 'u14', file: 'u11_p14.png', rows: 3, cols: 4, count: 11, startIdx: 0 },

  // Unit 15: Occupations & Professions (23 cards)
  { unit: 'u15', file: 'u11_p15_1.png', rows: 3, cols: 4, count: 12, startIdx: 0 },
  { unit: 'u15', file: 'u11_p15_2.png', rows: 3, cols: 4, count: 11, startIdx: 12 },

  // Unit 16: Events & Ceremonies (11 cards)
  { unit: 'u16', file: 'u11_p16.png', rows: 3, cols: 4, count: 11, startIdx: 0 },

  // Unit 17: Adjectives (11 cards)
  { unit: 'u17', file: 'u11_p18.png', rows: 3, cols: 4, count: 11, startIdx: 0 },

  // Unit 18: Feelings & Impressions (7 cards)
  { unit: 'u18', file: 'u11_p19.png', rows: 2, cols: 4, count: 7, startIdx: 0 },

  // Unit 19: Numbers (40 cards)
  { unit: 'u19', file: 'u11_p20_1.png', rows: 5, cols: 4, count: 20, startIdx: 0 },
  { unit: 'u19', file: 'u11_p20_2.png', rows: 5, cols: 4, count: 20, startIdx: 20 }
];

async function createWhitePatch(w, h) {
  return await sharp({
    create: {
      width: Math.max(1, Math.round(w)),
      height: Math.max(1, Math.round(h)),
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  }).png().toBuffer();
}

/**
 * =============================================================================
 * STAGE 1: Extract Raw Card Cells from Master Sheets
 * =============================================================================
 */
async function runStage1() {
  console.log('\n--- STAGE 1: Extracting Raw Card Cells ---');
  let count = 0;

  for (const sheet of SHEET_LAYOUTS) {
    const sheetPath = path.join(MASTER_DIR, sheet.file);
    if (!fs.existsSync(sheetPath)) continue;

    const meta = await sharp(sheetPath).metadata();
    const rowH = meta.height / sheet.rows;
    const colW = sheet.colWOverride || (meta.width / sheet.cols);
    const borderInsetX = sheet.borderInsetX || 14;
    const insetTop = 10;
    const insetBottom = 10;

    const cellW = Math.max(30, Math.round(colW - (borderInsetX * 2)));
    const cellH = Math.max(30, Math.round(rowH - insetTop - insetBottom));

    const unitCards = cardsData[sheet.unit] || [];

    for (let i = 0; i < sheet.count; i++) {
      const card = unitCards[sheet.startIdx + i];
      if (!card) continue;

      const r = Math.floor(i / sheet.cols);
      const c = i % sheet.cols;

      const left = Math.min(meta.width - 30, Math.round(c * colW + borderInsetX));
      const top = Math.min(meta.height - 30, Math.round(r * rowH + insetTop));

      const outName = `hwg6_${sheet.unit}_${card.slot}_${card.en}_cell.png`;
      const outPath = path.join(STAGE1_DIR, outName);

      await sharp(sheetPath)
        .extract({ left, top, width: cellW, height: cellH })
        .png()
        .toFile(outPath);

      count++;
    }
    console.log(`  ✓ Stage 1 extracted [${sheet.unit}] ${sheet.file} (${sheet.count} cells)`);
  }
  console.log(`✅ Stage 1 Complete: ${count} raw card cells extracted.\n`);
}

/**
 * =============================================================================
 * STAGE 2: Detect and Eliminate Paw Watermark Badges
 * =============================================================================
 */
async function runStage2() {
  console.log('\n--- STAGE 2: Eliminating Paw Watermark Badges ---');
  let wipedCount = 0;
  let totalCount = 0;

  for (const sheet of SHEET_LAYOUTS) {
    const unitCards = cardsData[sheet.unit] || [];

    for (let i = 0; i < sheet.count; i++) {
      const card = unitCards[sheet.startIdx + i];
      if (!card) continue;

      const inName = `hwg6_${sheet.unit}_${card.slot}_${card.en}_cell.png`;
      const inPath = path.join(STAGE1_DIR, inName);
      if (!fs.existsSync(inPath)) continue;

      const outName = `hwg6_${sheet.unit}_${card.slot}_${card.en}_unwatermarked.png`;
      const outPath = path.join(STAGE2_DIR, outName);

      const { data, info } = await sharp(inPath).raw().toBuffer({ resolveWithObject: true });

      let hasPaw = false;
      let patchLeft = 0;
      let patchTop = 0;
      let patchW = 0;
      let patchH = 0;

      if (sheet.isSideBySide) {
        // Unit 8 Side-by-Side: Paw badge is located at X: 135..170, Y: 10..45
        let pawPixels = 0;
        for (let y = 10; y < 50; y++) {
          for (let x = 135; x < 175; x++) {
            if (x >= info.width || y >= info.height) continue;
            const idx = (y * info.width + x) * info.channels;
            const r = data[idx], g = data[idx+1], b = data[idx+2];
            // Purple paw badge
            if (b > 175 && b > r + 10 && b > g + 25 && r > 135) pawPixels++;
          }
        }
        if (pawPixels > 80) {
          hasPaw = true;
          patchLeft = 135;
          patchTop = 8;
          patchW = 38;
          patchH = 44;
        }
      } else {
        // Standard Stacked Cards: Paw badge in top-right corner of cell
        let pawPixels = 0;
        for (let y = 0; y < 50; y++) {
          for (let x = info.width - 48; x < info.width; x++) {
            if (x >= info.width || y >= info.height) continue;
            const idx = (y * info.width + x) * info.channels;
            const r = data[idx], g = data[idx+1], b = data[idx+2];
            const isOrange = (r > 200 && g > 110 && g < 195 && b < 70);
            const isPurple = (b > 175 && b > r + 10 && b > g + 25 && r > 135);
            if (isOrange || isPurple) pawPixels++;
          }
        }
        if (pawPixels > 50) {
          hasPaw = true;
          patchW = 36;
          patchH = 48;
          patchLeft = info.width - patchW;
          patchTop = 0;
        }
      }

      let pipeline = sharp(inPath);
      if (hasPaw) {
        const patchBuf = await createWhitePatch(patchW, patchH);
        pipeline = pipeline.composite([{ input: patchBuf, left: patchLeft, top: patchTop }]);
        wipedCount++;
      }

      await pipeline.png().toFile(outPath);
      totalCount++;
    }
  }
  console.log(`✅ Stage 2 Complete: ${totalCount} cards checked, ${wipedCount} paw watermarks cleanly erased.\n`);
}

/**
 * =============================================================================
 * STAGE 3: Crop Illustration Artwork & Whitespace Trim with Padding
 * =============================================================================
 */
async function runStage3() {
  console.log('\n--- STAGE 3: Cropping Illustration & Whitespace Trim ---');
  let count = 0;

  for (const sheet of SHEET_LAYOUTS) {
    const unitCards = cardsData[sheet.unit] || [];

    for (let i = 0; i < sheet.count; i++) {
      const card = unitCards[sheet.startIdx + i];
      if (!card) continue;

      const inName = `hwg6_${sheet.unit}_${card.slot}_${card.en}_unwatermarked.png`;
      const inPath = path.join(STAGE2_DIR, inName);
      if (!fs.existsSync(inPath)) continue;

      const outName = `hwg6_${sheet.unit}_${card.slot}_${card.en}_trimmed.png`;
      const outPath = path.join(STAGE3_DIR, outName);

      const meta = await sharp(inPath).metadata();

      let extractRegion;
      if (sheet.isSideBySide) {
        // Unit 8 Side-by-side: Illustration is isolated on the left
        extractRegion = {
          left: 18,
          top: 6,
          width: 145,
          height: Math.max(30, meta.height - 14)
        };
      } else {
        // Standard Stacked Cards: Top 58% contains illustration, bottom contains 4-line guide
        const ratio = (sheet.unit === 'u05') ? 0.55 : 0.58;
        extractRegion = {
          left: 0,
          top: 0,
          width: meta.width,
          height: Math.round(meta.height * ratio)
        };
      }

      const croppedBuf = await sharp(inPath)
        .extract(extractRegion)
        .png()
        .toBuffer();

      // Auto-trim outer whitespace borders and add clean 10px / 12px frame padding
      await sharp(croppedBuf)
        .trim({ background: '#ffffff', threshold: 18 })
        .extend({
          top: 10,
          bottom: 10,
          left: 12,
          right: 12,
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .png()
        .toFile(outPath);

      count++;
    }
  }
  console.log(`✅ Stage 3 Complete: ${count} illustrations trimmed with uniform padding.\n`);
}

/**
 * =============================================================================
 * STAGE 4: 4x Ultra-DPI Super-Sampling & Production Asset Deployment
 * =============================================================================
 */
async function runStage4() {
  console.log(`\n--- STAGE 4: ${SCALE}x Ultra-DPI Super-Sampling & Production Export ---`);
  let illustCount = 0;
  let fullCount = 0;

  for (const sheet of SHEET_LAYOUTS) {
    const unitCards = cardsData[sheet.unit] || [];

    for (let i = 0; i < sheet.count; i++) {
      const card = unitCards[sheet.startIdx + i];
      if (!card) continue;

      // 1. Process Production Illustration Card
      const trimmedName = `hwg6_${sheet.unit}_${card.slot}_${card.en}_trimmed.png`;
      const trimmedPath = path.join(STAGE3_DIR, trimmedName);

      if (fs.existsSync(trimmedPath)) {
        const prodIllustName = `hwg6_${sheet.unit}_${card.slot}_${card.en}_illust.png`;
        const prodIllustPath = path.join(OUT_ILLUST_DIR, prodIllustName);

        const tm = await sharp(trimmedPath).metadata();
        const buf4x = await sharp(trimmedPath)
          .resize({ width: tm.width * SCALE, kernel: sharp.kernel.lanczos3 })
          .sharpen({ sigma: 1.4, m1: 0.7, m2: 2.4 })
          .png({ quality: 95 })
          .toBuffer();

        fs.writeFileSync(prodIllustPath, buf4x);
        fs.writeFileSync(path.join(STAGE4_DIR, prodIllustName), buf4x);

        illustCount++;
      }

      // 2. Process Production Full Card (from Stage 2 clean cell)
      const cleanCellName = `hwg6_${sheet.unit}_${card.slot}_${card.en}_unwatermarked.png`;
      const cleanCellPath = path.join(STAGE2_DIR, cleanCellName);

      if (fs.existsSync(cleanCellPath)) {
        const prodFullName = `hwg6_${sheet.unit}_${card.slot}_${card.en}_full.png`;
        const prodFullPath = path.join(OUT_FULL_DIR, prodFullName);

        const cm = await sharp(cleanCellPath).metadata();
        await sharp(cleanCellPath)
          .resize({ width: cm.width * SCALE, kernel: sharp.kernel.lanczos3 })
          .sharpen({ sigma: 1.2, m1: 0.8, m2: 2.2 })
          .png({ quality: 95 })
          .toFile(prodFullPath);

        fullCount++;
      }
    }
  }

  // Cross-copy Hot Spring and Tree aliases to Grade 5
  const aliases = [
    { src: 'hwg6_u10_11_hot_spring_illust.png', dest: 'hwg5_u20_17_hot_spring_illust.png' },
    { src: 'hwg6_u10_15_tree_illust.png', dest: 'hwg5_u20_09_tree_illust.png' }
  ];
  for (const a of aliases) {
    const s = path.join(OUT_ILLUST_DIR, a.src);
    const d = path.join(OUT_ILLUST_DIR, a.dest);
    if (fs.existsSync(s)) {
      fs.copyFileSync(s, d);
      console.log(`  ✓ Updated high-res alias for ${a.dest}`);
    }
  }

  console.log(`✅ Stage 4 Complete: ${illustCount} illustration assets & ${fullCount} full card assets generated.`);
  console.log(`📁 Production files active at trimmed_assets/cards/`);
}

async function run() {
  const arg = process.argv[2];
  console.log('===================================================================');
  console.log('🚀 LEVI-SENSEI HERE WE GO GRADE 6 MULTI-STAGE ASSET PIPELINE');
  console.log(`   Scale: ${SCALE}x Super-Sampling (Target ~800-900px, 300 DPI Print / 4K TV)`);
  console.log('===================================================================');

  if (arg === '--step1') {
    await runStage1();
  } else if (arg === '--step2') {
    await runStage2();
  } else if (arg === '--step3') {
    await runStage3();
  } else if (arg === '--step4') {
    await runStage4();
  } else {
    // Run all stages sequentially
    await runStage1();
    await runStage2();
    await runStage3();
    await runStage4();
  }

  console.log('\n===================================================================');
  console.log('🎉 PIPELINE EXECUTION FINISHED SUCCESSFULLY!');
  console.log('===================================================================\n');
}

run();
