const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const sourceDirs = [
  path.join(__dirname, '../letstry1/resources/app/app/__media/dictionary/dic_card_data_image'),
  path.join(__dirname, '../letstry2/resources/app/app/__media/dictionary/dic_card_data_image')
];

const outputDir = path.join(__dirname, '../trimmed_assets/letstry_images');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Robust Density-Based Bounding Box Scanner
async function findRobustBoundingBox(imagePath) {
  const { data, info } = await sharp(imagePath)
    .flatten({ background: '#ffffff' })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;

  // 1. Dynamically sample the true background color from the 4 corners
  function getSample(x, y) {
    const idx = (y * width + x) * channels;
    return (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
  }
  const bgBrightness = (getSample(8, 8) + getSample(width - 8, 8) + getSample(8, height - 8) + getSample(width - 8, height - 8)) / 4;
  
  // Anything darker than (background - 18) is considered actual drawing content
  const COLOR_DIFF_THRESHOLD = Math.max(220, bgBrightness - 18);
  const DENSITY_THRESHOLD = 8; // Ignore stray dust: row/col must have >= 8 content pixels

  // 2. Scan Rows (Top to Bottom, and Bottom to Top)
  let top = 0;
  for (let y = 4; y < height - 4; y++) {
    let count = 0;
    for (let x = 4; x < width - 4; x++) {
      const idx = (y * width + x) * channels;
      const b = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
      if (b < COLOR_DIFF_THRESHOLD) count++;
      if (count >= DENSITY_THRESHOLD) break;
    }
    if (count >= DENSITY_THRESHOLD) {
      top = y;
      break;
    }
  }

  let bottom = height - 1;
  for (let y = height - 5; y > top; y--) {
    let count = 0;
    for (let x = 4; x < width - 4; x++) {
      const idx = (y * width + x) * channels;
      const b = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
      if (b < COLOR_DIFF_THRESHOLD) count++;
      if (count >= DENSITY_THRESHOLD) break;
    }
    if (count >= DENSITY_THRESHOLD) {
      bottom = y;
      break;
    }
  }

  // 3. Scan Columns (Left to Right, and Right to Left)
  let left = 0;
  for (let x = 4; x < width - 4; x++) {
    let count = 0;
    for (let y = top; y <= bottom; y++) {
      const idx = (y * width + x) * channels;
      const b = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
      if (b < COLOR_DIFF_THRESHOLD) count++;
      if (count >= DENSITY_THRESHOLD) break;
    }
    if (count >= DENSITY_THRESHOLD) {
      left = x;
      break;
    }
  }

  let right = width - 1;
  for (let x = width - 5; x > left; x--) {
    let count = 0;
    for (let y = top; y <= bottom; y++) {
      const idx = (y * width + x) * channels;
      const b = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
      if (b < COLOR_DIFF_THRESHOLD) count++;
      if (count >= DENSITY_THRESHOLD) break;
    }
    if (count >= DENSITY_THRESHOLD) {
      right = x;
      break;
    }
  }

  const boxWidth = right - left + 1;
  const boxHeight = bottom - top + 1;

  if (boxWidth < 20 || boxHeight < 20) return null;

  return { left, top, width: boxWidth, height: boxHeight };
}

async function processAllImages() {
  console.log('\n======================================================');
  console.log('✂️  DENSITY-BASED ROBUST AUTOCROP (*_1_c.png)');
  console.log('======================================================\n');

  let processedCount = 0;
  let skippedCount = 0;

  for (const srcDir of sourceDirs) {
    if (!fs.existsSync(srcDir)) continue;

    const files = fs.readdirSync(srcDir).filter(f => f.endsWith('_1_c.png'));

    for (const file of files) {
      const inputPath = path.join(srcDir, file);
      const outputPath = path.join(outputDir, file);

      try {
        const box = await findRobustBoundingBox(inputPath);

        if (!box) {
          fs.copyFileSync(inputPath, outputPath);
          skippedCount++;
          continue;
        }

        const padX = Math.max(14, Math.round(box.width * 0.035));
        const padY = Math.max(14, Math.round(box.height * 0.035));

        await sharp(inputPath)
          .extract({
            left: box.left,
            top: box.top,
            width: box.width,
            height: box.height
          })
          .extend({
            top: padY,
            bottom: padY,
            left: padX,
            right: padX,
            background: { r: 255, g: 255, b: 255, alpha: 1 }
          })
          .png({ quality: 90, compressionLevel: 8 })
          .toFile(outputPath);

        processedCount++;
        if (processedCount % 50 === 0) {
          console.log(`  ✓ Cropped ${processedCount} cards...`);
        }
      } catch (err) {
        fs.copyFileSync(inputPath, outputPath);
        skippedCount++;
      }
    }
  }

  console.log('\n======================================================');
  console.log(`🎉 COMPLETE!`);
  console.log(`   • Successfully cropped: ${processedCount} cards`);
  console.log(`   • Destination:          trimmed_assets/letstry_images/`);
  console.log('======================================================\n');
}

processAllImages();