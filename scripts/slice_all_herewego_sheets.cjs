const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const MASTER_ASSETS_DIR = path.join(__dirname, '../manabi_assets/Grade 5 Manabi (new)');
const OUT_ILLUST_DIR = path.join(__dirname, '../trimmed_assets/cards/illustration');
const OUT_FULL_DIR = path.join(__dirname, '../trimmed_assets/cards/full');

[OUT_ILLUST_DIR, OUT_FULL_DIR].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

const SCALE = 3; // 3x Ultra-DPI Super-Sampling

// =============================================================================
// UNITS 1 THROUGH 10 ROW-PARTITIONED MANIFEST
// =============================================================================
const MANIFEST = [
  // ---------------------------------------------------------------------------
  // UNIT 1: Feelings (u11_p1.png) - 3 rows x 4 cols (12 cards)
  // ---------------------------------------------------------------------------
  {
    unit: 'u01',
    sheetFile: 'u11_p1.png',
    rows: [
      { cols: 4, items: [{ slot: '00', en: 'fine' }, { slot: '01', en: 'happy' }, { slot: '02', en: 'good' }, { slot: '03', en: 'great' }] },
      { cols: 4, items: [{ slot: '04', en: 'sleepy' }, { slot: '05', en: 'tired' }, { slot: '06', en: 'hungry' }, { slot: '07', en: 'thirsty' }] },
      { cols: 4, insetTop: 6, items: [{ slot: '08', en: 'sad' }, { slot: '09', en: 'angry' }, { slot: '10', en: 'excited' }, { slot: '11', en: 'nervous' }] }
    ]
  },

  // ---------------------------------------------------------------------------
  // UNIT 2: Weather (u11_p2.png) - 2 rows x 4 cols (8 cards)
  // ---------------------------------------------------------------------------
  {
    unit: 'u02',
    sheetFile: 'u11_p2.png',
    rows: [
      { cols: 4, items: [{ slot: '00', en: 'sunny' }, { slot: '01', en: 'rainy' }, { slot: '02', en: 'cloudy' }, { slot: '03', en: 'snowy' }] },
      { cols: 4, insetTop: 8, items: [{ slot: '04', en: 'hot' }, { slot: '05', en: 'cold' }, { slot: '06', en: 'warm' }, { slot: '07', en: 'cool' }] }
    ]
  },

  // ---------------------------------------------------------------------------
  // UNIT 3 Part 1: Colors (u11_p3_1.png) - 3 rows x 4 cols (11 cards)
  // ---------------------------------------------------------------------------
  {
    unit: 'u03',
    sheetFile: 'u11_p3_1.png',
    rows: [
      { cols: 4, items: [{ slot: '00', en: 'red' }, { slot: '01', en: 'blue' }, { slot: '02', en: 'green' }, { slot: '03', en: 'yellow' }] },
      { cols: 4, items: [{ slot: '04', en: 'pink' }, { slot: '05', en: 'white' }, { slot: '06', en: 'orange' }, { slot: '07', en: 'purple' }] },
      { cols: 4, items: [{ slot: '08', en: 'black' }, { slot: '09', en: 'brown' }, { slot: '10', en: 'gray' }] }
    ]
  },

  // ---------------------------------------------------------------------------
  // UNIT 3 Part 2: Shapes (u11_p3_2.png) - 2 rows x 4 cols (8 cards)
  // ---------------------------------------------------------------------------
  {
    unit: 'u03',
    sheetFile: 'u11_p3_2.png',
    rows: [
      { cols: 4, items: [{ slot: '11', en: 'circle' }, { slot: '12', en: 'triangle' }, { slot: '13', en: 'cross' }, { slot: '14', en: 'heart' }] },
      { cols: 4, items: [{ slot: '15', en: 'square' }, { slot: '16', en: 'rectangle' }, { slot: '17', en: 'star' }, { slot: '18', en: 'diamond' }] }
    ]
  },

  // ---------------------------------------------------------------------------
  // UNIT 4: Sports (u11_p4.png) - 4 rows x 3 cols (11 cards)
  // ---------------------------------------------------------------------------
  {
    unit: 'u04',
    sheetFile: 'u11_p4.png',
    rows: [
      { cols: 3, items: [{ slot: '00', en: 'baseball' }, { slot: '01', en: 'basketball' }, { slot: '02', en: 'dodgeball' }] },
      { cols: 3, items: [{ slot: '03', en: 'volleyball' }, { slot: '04', en: 'soccer' }, { slot: '05', en: 'swimming' }] },
      { cols: 3, items: [{ slot: '06', en: 'table_tennis' }, { slot: '07', en: 'tennis' }, { slot: '08', en: 'badminton' }] },
      { cols: 3, items: [{ slot: '09', en: 'dancing' }, { slot: '10', en: 'skiing' }] }
    ]
  },

  // ---------------------------------------------------------------------------
  // UNIT 5: Animals (u11_p5.png) - 2 rows x 4 cols (7 cards)
  // ---------------------------------------------------------------------------
  {
    unit: 'u05',
    sheetFile: 'u11_p5.png',
    rows: [
      { cols: 4, items: [{ slot: '00', en: 'cat' }, { slot: '01', en: 'dog' }, { slot: '02', en: 'rabbit' }, { slot: '03', en: 'hamster' }] },
      { cols: 4, items: [{ slot: '04', en: 'tiger' }, { slot: '05', en: 'bear' }, { slot: '06', en: 'horse' }] }
    ]
  },

  // ---------------------------------------------------------------------------
  // UNIT 6 Part 1: Fruits (u11_p6_1.png) - 3 rows x 4 cols (11 cards)
  // ---------------------------------------------------------------------------
  {
    unit: 'u06',
    sheetFile: 'u11_p6_1.png',
    rows: [
      { cols: 4, items: [{ slot: '00', en: 'apple' }, { slot: '01', en: 'banana' }, { slot: '02', en: 'strawberry' }, { slot: '03', en: 'grapes' }] },
      { cols: 4, items: [{ slot: '04', en: 'peach' }, { slot: '05', en: 'melon' }, { slot: '06', en: 'pineapple' }, { slot: '07', en: 'persimmon' }] },
      { cols: 4, items: [{ slot: '08', en: 'watermelon' }, { slot: '09', en: 'orange' }, { slot: '10', en: 'japanese_pear' }] }
    ]
  },

  // ---------------------------------------------------------------------------
  // UNIT 6 Part 2: Vegetables (u11_p6_2.png) - 3 rows x 4 cols (11 cards)
  // ---------------------------------------------------------------------------
  {
    unit: 'u06',
    sheetFile: 'u11_p6_2.png',
    rows: [
      { cols: 4, items: [{ slot: '11', en: 'potato' }, { slot: '12', en: 'carrot' }, { slot: '13', en: 'onion' }, { slot: '14', en: 'cabbage' }] },
      { cols: 4, items: [{ slot: '15', en: 'tomato' }, { slot: '16', en: 'mushroom' }, { slot: '17', en: 'green_pepper' }, { slot: '18', en: 'cucumber' }] },
      { cols: 4, items: [{ slot: '19', en: 'corn' }, { slot: '20', en: 'spinach' }, { slot: '21', en: 'eggplant' }] }
    ]
  },

  // ---------------------------------------------------------------------------
  // UNIT 7: Meat & Seafood (u11_p7.png) - 3 rows x 4 cols (12 cards)
  // ---------------------------------------------------------------------------
  {
    unit: 'u07',
    sheetFile: 'u11_p7.png',
    rows: [
      { cols: 4, items: [{ slot: '00', en: 'beef' }, { slot: '01', en: 'pork' }, { slot: '02', en: 'chicken' }, { slot: '03', en: 'egg' }] },
      { cols: 4, items: [{ slot: '04', en: 'cheese' }, { slot: '05', en: 'bacon' }, { slot: '06', en: 'octopus' }, { slot: '07', en: 'crab' }] },
      { cols: 4, items: [{ slot: '08', en: 'squid' }, { slot: '09', en: 'seaweed' }, { slot: '10', en: 'shrimp' }, { slot: '11', en: 'salmon' }] }
    ]
  },

  // ---------------------------------------------------------------------------
  // UNIT 8 Part 1: Food & Dishes (u11_p8_1.png) - 3 rows x 4 cols (12 cards)
  // ---------------------------------------------------------------------------
  {
    unit: 'u08',
    sheetFile: 'u11_p8_1.png',
    rows: [
      { cols: 4, items: [{ slot: '00', en: 'pizza' }, { slot: '01', en: 'steak' }, { slot: '02', en: 'hamburger' }, { slot: '03', en: 'spaghetti' }] },
      { cols: 4, items: [{ slot: '04', en: 'sandwich' }, { slot: '05', en: 'french_fries' }, { slot: '06', en: 'omelet' }, { slot: '07', en: 'rice' }] },
      { cols: 4, items: [{ slot: '08', en: 'rice_ball' }, { slot: '09', en: 'curry_and_rice' }, { slot: '10', en: 'rice_cake' }, { slot: '11', en: 'fried_rice' }] }
    ]
  },

  // ---------------------------------------------------------------------------
  // UNIT 8 Part 2: Dishes 2 (u11_p8_2.png) - 3 rows x 4 cols (10 cards)
  // ---------------------------------------------------------------------------
  {
    unit: 'u08',
    sheetFile: 'u11_p8_2.png',
    rows: [
      { cols: 4, items: [{ slot: '12', en: 'fried_chicken' }, { slot: '13', en: 'grilled_fish' }, { slot: '14', en: 'miso_soup' }, { slot: '15', en: 'noodles' }] },
      { cols: 4, items: [{ slot: '16', en: 'soup' }, { slot: '17', en: 'salad' }, { slot: '18', en: 'bread' }, { slot: '19', en: 'sausage' }] },
      { cols: 4, items: [{ slot: '20', en: 'ramen' }, { slot: '21', en: 'hot_pot' }] }
    ]
  },

  // ---------------------------------------------------------------------------
  // UNIT 9: Drinks & Desserts (u11_p9.png) - 3 rows x 4 cols (11 cards)
  // ---------------------------------------------------------------------------
  {
    unit: 'u09',
    sheetFile: 'u11_p9.png',
    rows: [
      { cols: 4, items: [{ slot: '00', en: 'milk' }, { slot: '01', en: 'orange_juice' }, { slot: '02', en: 'soda' }, { slot: '03', en: 'tea' }] },
      { cols: 4, items: [{ slot: '04', en: 'green_tea' }, { slot: '05', en: 'coffee' }, { slot: '06', en: 'water' }, { slot: '07', en: 'cake' }] },
      { cols: 4, items: [{ slot: '08', en: 'ice_cream' }, { slot: '09', en: 'pudding' }, { slot: '10', en: 'yogurt' }] }
    ]
  },

  // ---------------------------------------------------------------------------
  // UNIT 10: Taste Adjectives (u11_p10.png) - 2 rows x 4 cols (8 cards)
  // ---------------------------------------------------------------------------
  {
    unit: 'u10',
    sheetFile: 'u11_p10.png',
    rows: [
      { cols: 4, items: [{ slot: '00', en: 'delicious' }, { slot: '01', en: 'sweet' }, { slot: '02', en: 'bitter' }, { slot: '03', en: 'sour' }] },
      { cols: 4, items: [{ slot: '04', en: 'salty' }, { slot: '05', en: 'spicy' }, { slot: '06', en: 'soft' }, { slot: '07', en: 'hard' }] }
    ]
  }
];

// =============================================================================
// BATCH SLICING ENGINE
// =============================================================================
async function runBatch() {
  console.log('\n======================================================');
  console.log(`🚀 MASTER SLICER: Units 1-10 (${SCALE}x Ultra-DPI Engine)`);
  console.log('======================================================\n');

  let totalCards = 0;

  for (const sheetDef of MANIFEST) {
    const inputPath = path.join(MASTER_ASSETS_DIR, sheetDef.sheetFile);
    if (!fs.existsSync(inputPath)) {
      console.warn(`⚠️  Skipping missing sheet: ${sheetDef.sheetFile}`);
      continue;
    }

    console.log(`\n📄 Processing [${sheetDef.unit}] ${sheetDef.sheetFile}...`);
    const meta = await sharp(inputPath).metadata();
    const { width, height } = meta;

    const numRows = sheetDef.rows.length;
    const rawRowH = height / numRows;
    const BORDER_INSET_X = 14;

    for (let r = 0; r < numRows; r++) {
      const rowDef = sheetDef.rows[r];
      const insetTop = rowDef.insetTop !== undefined ? rowDef.insetTop : 12;
      const insetBottom = 12;

      const top = Math.min(height - 30, Math.round(r * rawRowH) + insetTop);
      const cellH = Math.max(30, Math.round(rawRowH - insetTop - insetBottom));

      // Calculate column widths based on colWeights or equal cols
      const weights = rowDef.colWeights || Array(rowDef.cols).fill(1);
      const totalWeight = weights.reduce((sum, w) => sum + w, 0);

      let currentX = 0;
      for (let c = 0; c < rowDef.items.length; c++) {
        const item = rowDef.items[c];
        const colW = (weights[c] / totalWeight) * width;

        const left = Math.min(width - 30, Math.round(currentX) + BORDER_INSET_X);
        const cellW = Math.max(30, Math.round(colW - (BORDER_INSET_X * 2)));

        currentX += colW;

        if (!item || !item.en) continue;

        // Paw patch dimensions (at native scan resolution)
        const pawPatchW = 46;
        const pawPatchH = 46;
        const pawPatchLeft = cellW - pawPatchW;

        const whitePatchBuffer = await sharp({
          create: {
            width: pawPatchW,
            height: pawPatchH,
            channels: 4,
            background: { r: 255, g: 255, b: 255, alpha: 1 }
          }
        }).png().toBuffer();

        // ---------------------------------------------------------------------
        // 1. FULL CARD (Illustration + 4-Line English Notebook Rules)
        // ---------------------------------------------------------------------
        const fullFileName = `hwg5_${sheetDef.unit}_${item.slot}_${item.en}_full.png`;
        const fullOutputPath = path.join(OUT_FULL_DIR, fullFileName);

        // Stage A: Native extract & paw wipe
        const cleanedFullBuffer = await sharp(inputPath)
          .extract({ left, top, width: cellW, height: cellH })
          .composite([{ input: whitePatchBuffer, left: pawPatchLeft, top: 0 }])
          .png()
          .toBuffer();

        // Stage B: 3x Super-Sample & Edge-Sharpen
        await sharp(cleanedFullBuffer)
          .resize({ width: cellW * SCALE, kernel: sharp.kernel.lanczos3 })
          .sharpen({ sigma: 1.2, m1: 0.8, m2: 2.2 })
          .png({ quality: 95 })
          .toFile(fullOutputPath);

        // ---------------------------------------------------------------------
        // 2. PURE ILLUSTRATION (Top 58%, Trimmed Canvas, Centered)
        // ---------------------------------------------------------------------
        const illustH = Math.round(cellH * 0.58);
        const illustFileName = `hwg5_${sheetDef.unit}_${item.slot}_${item.en}_illust.png`;
        const illustOutputPath = path.join(OUT_ILLUST_DIR, illustFileName);

        try {
          // Stage A: Native illust extract & paw wipe
          const cleanedIllustBuffer = await sharp(inputPath)
            .extract({ left, top, width: cellW, height: illustH })
            .composite([{ input: whitePatchBuffer, left: pawPatchLeft, top: 0 }])
            .png()
            .toBuffer();

          // Stage B: Trim whitespace & add frame padding
          const trimmedBuffer = await sharp(cleanedIllustBuffer)
            .trim({ background: '#ffffff', threshold: 18 })
            .extend({
              top: 10,
              bottom: 10,
              left: 12,
              right: 12,
              background: { r: 255, g: 255, b: 255, alpha: 1 }
            })
            .png()
            .toBuffer();

          // Stage C: 3x Super-Sample & Line-Art Sharpen
          const trimmedMeta = await sharp(trimmedBuffer).metadata();
          await sharp(trimmedBuffer)
            .resize({ width: trimmedMeta.width * SCALE, kernel: sharp.kernel.lanczos3 })
            .sharpen({ sigma: 1.4, m1: 0.7, m2: 2.4 })
            .png({ quality: 95 })
            .toFile(illustOutputPath);

        } catch (err) {
          console.warn(`    ⚠️ Fallback on illust for ${item.en}:`, err.message);
          await sharp(inputPath)
            .extract({ left, top, width: cellW, height: illustH })
            .resize({ width: cellW * SCALE, kernel: sharp.kernel.lanczos3 })
            .png({ quality: 95 })
            .toFile(illustOutputPath);
        }

        totalCards++;
        console.log(`  ✓ Sliced [${item.slot}] ${item.en.padEnd(16)} (Full & Illust 3x)`);
      }
    }
  }

  console.log('\n======================================================');
  console.log(`🎉 BATCH COMPLETE: ${totalCards} cards generated at 3x Ultra-DPI!`);
  console.log('======================================================\n');
}

runBatch();