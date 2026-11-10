const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

/**
 * =============================================================================
 * LEVI-SENSEI HERE WE GO GRADE 6 BATCH SHEET SLICER & 3X ULTRA-DPI ENGINE v4.2
 * =============================================================================
 * Slices directly from pristine master textbook sheets:
 * Source: manabi_assets/Grade 6 Manabi (new)/
 *
 * Operations:
 * 1. Computes row and column partitions per sheet.
 * 2. Dynamically detects paw watermark presence (orange or purple) per card cell.
 * 3. Applies micro-targeted paw wiping (36x48) precisely over the badge without
 *    cutting into card artwork or rounded corners.
 * 4. Custom side-by-side handling for Unit 8 (Daily Routines) separating the left
 *    illustration from handwriting lines.
 * 5. Extracts pure illustration artwork (top 58% of card cell) avoiding any
 *    overlap or heads/hair from adjacent rows below.
 * 6. Auto-trims excess whitespace borders with Sharp and adds 10px uniform framing.
 * 7. Super-samples at 3x Ultra-DPI using Lanczos3 kernel.
 * 8. Applies line-art sharpening (sigma: 1.4, m1: 0.7, m2: 2.4).
 * 9. Outputs directly to:
 *    - trimmed_assets/cards/illustration/
 *    - trimmed_assets/cards/full/
 * =============================================================================
 */

const MASTER_DIR = path.join(__dirname, '../manabi_assets/Grade 6 Manabi (new)');
const OUT_ILLUST_DIR = path.join(__dirname, '../trimmed_assets/cards/illustration');
const OUT_FULL_DIR = path.join(__dirname, '../trimmed_assets/cards/full');

[OUT_ILLUST_DIR, OUT_FULL_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const SCALE = 3;

// Load pre-sorted card list for Grade 6 (Units 1 through 19)
const cardsData = JSON.parse(fs.readFileSync(path.join(__dirname, 'g6_cards_manifest.json'), 'utf8'));

// Sheet layout definitions (rows, cols per sheet)
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

  // Unit 8: Daily Routines (21 cards, 2 columns, side-by-side layout)
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
      width: Math.max(1, w),
      height: Math.max(1, h),
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  }).png().toBuffer();
}

async function runSlicer() {
  console.log('\n======================================================');
  console.log(`✂️  HERE WE GO GRADE 6 DIRECT SHEET SLICER v4.2`);
  console.log(`🚀 ${SCALE}x Ultra-DPI Lanczos3 Super-Sampling (Direct Master Cuts)`);
  console.log('======================================================\n');

  let totalProcessed = 0;
  let pawWipedCount = 0;

  for (const sheet of SHEET_LAYOUTS) {
    const sheetPath = path.join(MASTER_DIR, sheet.file);
    if (!fs.existsSync(sheetPath)) {
      console.warn(`  ⚠️ Sheet file not found: ${sheet.file}`);
      continue;
    }

    const meta = await sharp(sheetPath).metadata();
    const { width, height } = meta;

    const rowH = height / sheet.rows;
    const colW = sheet.colWOverride || (width / sheet.cols);
    const borderInsetX = sheet.borderInsetX || 14;
    const insetTop = 10;
    const insetBottom = 10;

    const cellW = Math.max(30, Math.round(colW - (borderInsetX * 2)));
    const cellH = Math.max(30, Math.round(rowH - insetTop - insetBottom));

    // Load raw pixel buffer for fast paw badge scanning
    const { data: sheetRaw, info: sheetInfo } = await sharp(sheetPath).raw().toBuffer({ resolveWithObject: true });

    const unitCards = cardsData[sheet.unit] || [];

    for (let i = 0; i < sheet.count; i++) {
      const cardIdx = sheet.startIdx + i;
      const card = unitCards[cardIdx];
      if (!card) continue;

      const r = Math.floor(i / sheet.cols);
      const c = i % sheet.cols;

      const left = Math.min(width - 30, Math.round(c * colW + borderInsetX));
      const top = Math.min(height - 30, Math.round(r * rowH + insetTop));

      if (sheet.isSideBySide) {
        // ---------------------------------------------------------------------
        // SIDE-BY-SIDE CARDS (Unit 8 Daily Routines)
        // Illustration is on the left (~145px wide), text is on the right.
        // ---------------------------------------------------------------------
        const illustLeft = left + 14;
        const illustTop = top + 8;
        const illustW = 145;
        const illustH = Math.max(30, cellH - 16);

        // Scan for paw badge in top-right of the illustration area
        let hasPaw = false;
        for (let y = illustTop; y < illustTop + 45; y++) {
          for (let x = illustLeft + illustW - 40; x < illustLeft + illustW; x++) {
            if (x >= sheetInfo.width || y >= sheetInfo.height) continue;
            const idx = (y * sheetInfo.width + x) * sheetInfo.channels;
            const red = sheetRaw[idx], green = sheetRaw[idx+1], blue = sheetRaw[idx+2];
            const isOrange = (red > 200 && green > 110 && green < 195 && blue < 70);
            const isPurple = (blue > 160 && red > 130 && red < 210 && green < 185);
            if (isOrange || isPurple) { hasPaw = true; break; }
          }
          if (hasPaw) break;
        }

        const illustFileName = `hwg6_${sheet.unit}_${card.slot}_${card.en}_illust.png`;
        const outIllustPath = path.join(OUT_ILLUST_DIR, illustFileName);

        try {
          let illustPipeline = sharp(sheetPath).extract({ left: illustLeft, top: illustTop, width: illustW, height: illustH });
          if (hasPaw) {
            const patchBuf = await createWhitePatch(34, 34);
            illustPipeline = illustPipeline.composite([{ input: patchBuf, left: illustW - 34, top: 0 }]);
            pawWipedCount++;
          }
          const rawIllustBuf = await illustPipeline.png().toBuffer();

          const trimmedIllust = await sharp(rawIllustBuf)
            .trim({ background: '#ffffff', threshold: 18 })
            .extend({ top: 10, bottom: 10, left: 12, right: 12, background: { r: 255, g: 255, b: 255, alpha: 1 } })
            .png()
            .toBuffer();

          const tm = await sharp(trimmedIllust).metadata();
          await sharp(trimmedIllust)
            .resize({ width: tm.width * SCALE, kernel: sharp.kernel.lanczos3 })
            .sharpen({ sigma: 1.4, m1: 0.7, m2: 2.4 })
            .png({ quality: 95 })
            .toFile(outIllustPath);
        } catch (err) {
          console.warn(`    ⚠️ Error slicing side-by-side illust for ${card.en}:`, err.message);
        }

        // Full card for Unit 8
        const fullFileName = `hwg6_${sheet.unit}_${card.slot}_${card.en}_full.png`;
        const outFullPath = path.join(OUT_FULL_DIR, fullFileName);
        try {
          const rawFullBuf = await sharp(sheetPath)
            .extract({ left, top, width: cellW, height: cellH })
            .png()
            .toBuffer();

          await sharp(rawFullBuf)
            .resize({ width: cellW * SCALE, kernel: sharp.kernel.lanczos3 })
            .sharpen({ sigma: 1.2, m1: 0.8, m2: 2.2 })
            .png({ quality: 95 })
            .toFile(outFullPath);
        } catch (err) {
          console.warn(`    ⚠️ Error slicing full for ${card.en}:`, err.message);
        }

      } else {
        // ---------------------------------------------------------------------
        // STANDARD STACKED CARDS (4-Column & 3-Column Units)
        // Illustration is top 58%, 4-line notebook guide is bottom.
        // ---------------------------------------------------------------------
        const illustRatio = (sheet.unit === 'u05') ? 0.55 : 0.58;
        const illustH = Math.round(cellH * illustRatio);

        // Scan for paw badge in top-right of cell
        let hasPaw = false;
        for (let y = top; y < top + 52; y++) {
          for (let x = left + cellW - 50; x < left + cellW; x++) {
            if (x >= sheetInfo.width || y >= sheetInfo.height) continue;
            const idx = (y * sheetInfo.width + x) * sheetInfo.channels;
            const red = sheetRaw[idx], green = sheetRaw[idx+1], blue = sheetRaw[idx+2];
            const isOrange = (red > 200 && green > 110 && green < 195 && blue < 70);
            const isPurple = (blue > 160 && red > 130 && red < 210 && green < 185);
            if (isOrange || isPurple) { hasPaw = true; break; }
          }
          if (hasPaw) break;
        }

        const patchW = 36;
        const patchH = 50;

        // 1. Process Pure Illustration Card
        const illustFileName = `hwg6_${sheet.unit}_${card.slot}_${card.en}_illust.png`;
        const outIllustPath = path.join(OUT_ILLUST_DIR, illustFileName);

        try {
          let illustPipeline = sharp(sheetPath).extract({ left, top, width: cellW, height: illustH });
          if (hasPaw) {
            const patchBuf = await createWhitePatch(patchW, patchH);
            illustPipeline = illustPipeline.composite([{ input: patchBuf, left: cellW - patchW, top: 0 }]);
            pawWipedCount++;
          }
          const rawIllustBuf = await illustPipeline.png().toBuffer();

          const trimmedIllust = await sharp(rawIllustBuf)
            .trim({ background: '#ffffff', threshold: 18 })
            .extend({ top: 10, bottom: 10, left: 12, right: 12, background: { r: 255, g: 255, b: 255, alpha: 1 } })
            .png()
            .toBuffer();

          const tm = await sharp(trimmedIllust).metadata();
          await sharp(trimmedIllust)
            .resize({ width: tm.width * SCALE, kernel: sharp.kernel.lanczos3 })
            .sharpen({ sigma: 1.4, m1: 0.7, m2: 2.4 })
            .png({ quality: 95 })
            .toFile(outIllustPath);
        } catch (err) {
          console.warn(`    ⚠️ Error slicing illust for ${card.en}:`, err.message);
        }

        // 2. Process Full Card
        const fullFileName = `hwg6_${sheet.unit}_${card.slot}_${card.en}_full.png`;
        const outFullPath = path.join(OUT_FULL_DIR, fullFileName);

        try {
          let fullPipeline = sharp(sheetPath).extract({ left, top, width: cellW, height: cellH });
          if (hasPaw) {
            const patchBuf = await createWhitePatch(patchW, patchH);
            fullPipeline = fullPipeline.composite([{ input: patchBuf, left: cellW - patchW, top: 0 }]);
          }
          const rawFullBuf = await fullPipeline.png().toBuffer();

          await sharp(rawFullBuf)
            .resize({ width: cellW * SCALE, kernel: sharp.kernel.lanczos3 })
            .sharpen({ sigma: 1.2, m1: 0.8, m2: 2.2 })
            .png({ quality: 95 })
            .toFile(outFullPath);
        } catch (err) {
          console.warn(`    ⚠️ Error slicing full for ${card.en}:`, err.message);
        }
      }

      totalProcessed++;
    }

    console.log(`  ✓ Sliced [${sheet.unit}] ${sheet.file} (${sheet.count} cards)`);
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
      console.log(`  ✓ Created high-res alias for ${a.dest}`);
    }
  }

  console.log('\n======================================================');
  console.log(`🎉 BATCH COMPLETE! Total cards processed: ${totalProcessed}`);
  console.log(`🐾 Total paw watermarks cleanly wiped: ${pawWipedCount}`);
  console.log(`📁 Outputs saved to trimmed_assets/cards/`);
  console.log('======================================================\n');
}

runSlicer();
