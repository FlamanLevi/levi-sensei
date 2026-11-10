const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const inputSheetPath = path.join(__dirname, '../manabi_assets/Grade 5 Manabi (new)/u11_p1.png');
const outIllustDir = path.join(__dirname, '../trimmed_assets/cards/illustration');
const outFullDir = path.join(__dirname, '../trimmed_assets/cards/full');

[outIllustDir, outFullDir].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

const P1_CELLS = [
  { slot: '00', en: 'fine',    row: 0, col: 0 },
  { slot: '01', en: 'happy',   row: 0, col: 1 },
  { slot: '02', en: 'good',    row: 0, col: 2 },
  { slot: '03', en: 'great',   row: 0, col: 3 },
  { slot: '04', en: 'sleepy',  row: 1, col: 0 },
  { slot: '05', en: 'tired',   row: 1, col: 1 },
  { slot: '06', en: 'hungry',  row: 1, col: 2 },
  { slot: '07', en: 'thirsty', row: 1, col: 3 },
  { slot: '08', en: 'sad',     row: 2, col: 0 },
  { slot: '09', en: 'angry',   row: 2, col: 1 },
  { slot: '10', en: 'excited', row: 2, col: 2 },
  { slot: '11', en: 'nervous', row: 2, col: 3 }
];

const SCALE = 3; // 3x Super-Sampling Factor

async function sliceSheetP1() {
  console.log('\n======================================================');
  console.log(`✂️  STUDIO SLICER v3.0: ${SCALE}x Ultra-DPI Lanczos3 Engine`);
  console.log('======================================================\n');

  if (!fs.existsSync(inputSheetPath)) {
    console.error(`❌ Source sheet not found: ${inputSheetPath}`);
    process.exit(1);
  }

  const image = sharp(inputSheetPath);
  const { width, height } = await image.metadata();

  const ROWS = 3;
  const COLS = 4;
  const rawCellW = width / COLS;
  const rawCellH = height / ROWS;

  const BORDER_INSET_X = 14;

  for (const item of P1_CELLS) {
    const rawLeft = Math.round(item.col * rawCellW);
    const rawTop = Math.round(item.row * rawCellH);

    // Calibrated top inset: Row 2 gets 5px to preserve hair headroom
    const insetTop = (item.row === 2) ? 5 : 14;
    const insetBottom = 14;

    const left = Math.min(width - 30, rawLeft + BORDER_INSET_X);
    const top = Math.min(height - 30, rawTop + insetTop);
    const cellW = Math.max(30, Math.round(rawCellW - (BORDER_INSET_X * 2)));
    const cellH = Math.max(30, Math.round(rawCellH - insetTop - insetBottom));

    // Erase 32x32 paw icon at native scale before supersampling
    const pawPatchW = 48;
    const pawPatchH = 48;
    const pawPatchLeft = cellW - pawPatchW;

    const whitePatchBuffer = await sharp({
      create: {
        width: pawPatchW,
        height: pawPatchH,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    }).png().toBuffer();

    // -------------------------------------------------------------------------
    // 1. FULL NOTEBOOK CARD (3x Ultra-DPI)
    // -------------------------------------------------------------------------
    const fullFileName = `hwg5_u01_${item.slot}_${item.en}_full.png`;
    const fullOutputPath = path.join(outFullDir, fullFileName);

    const cleanedFullBuffer = await sharp(inputSheetPath)
      .extract({ left, top, width: cellW, height: cellH })
      .composite([{ input: whitePatchBuffer, left: pawPatchLeft, top: 0 }])
      .png()
      .toBuffer();

    await sharp(cleanedFullBuffer)
      .resize({
        width: cellW * SCALE,
        kernel: sharp.kernel.lanczos3
      })
      .sharpen({ sigma: 1.2, m1: 0.8, m2: 2.2 })
      .png({ quality: 95 })
      .toFile(fullOutputPath);

    // -------------------------------------------------------------------------
    // 2. PURE ILLUSTRATION (Trimmed, 3x Ultra-DPI)
    // -------------------------------------------------------------------------
    const illustH = Math.round(cellH * 0.58);
    const illustFileName = `hwg5_u01_${item.slot}_${item.en}_illust.png`;
    const illustOutputPath = path.join(outIllustDir, illustFileName);

    try {
      const cleanedIllustBuffer = await sharp(inputSheetPath)
        .extract({ left, top, width: cellW, height: illustH })
        .composite([{ input: whitePatchBuffer, left: pawPatchLeft, top: 0 }])
        .png()
        .toBuffer();

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

      const trimmedMeta = await sharp(trimmedBuffer).metadata();
      await sharp(trimmedBuffer)
        .resize({
          width: trimmedMeta.width * SCALE,
          kernel: sharp.kernel.lanczos3
        })
        .sharpen({
          sigma: 1.4, // Calibrated for 3x ink line clarity
          m1: 0.7,   // Preserves smooth skin/clothing tones
          m2: 2.4    // Deepens line-art contrast
        })
        .png({ quality: 95 })
        .toFile(illustOutputPath);

    } catch (err) {
      console.warn(`  ⚠️ Fallback on ${item.en}:`, err.message);
      await sharp(inputSheetPath)
        .extract({ left, top, width: cellW, height: illustH })
        .resize({ width: cellW * SCALE, kernel: sharp.kernel.lanczos3 })
        .png({ quality: 95 })
        .toFile(illustOutputPath);
    }

    console.log(`  ✓ Sliced & 3x Super-Sampled [${item.slot}] ${item.en.padEnd(10)} ➔ Ultra-DPI`);
  }

  console.log('\n======================================================');
  console.log(`🎉 3x Super-Sampling Complete! Dimensions tripled.`);
  console.log('======================================================\n');
}

sliceSheetP1();