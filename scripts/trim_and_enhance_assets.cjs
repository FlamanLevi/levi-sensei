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
async function findSmartBoundingBox(imagePath) {
  const { data, info } = await sharp(imagePath)
    .flatten({ background: '#ffffff' })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;

  function getPixelBrightness(x, y) {
    const idx = (y * width + x) * channels;
    return (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
  }

  // Sample top corners ONLY (avoids floor lines or ground bars at the bottom)
  const bgBrightness = (getPixelBrightness(8, 8) + getPixelBrightness(width - 8, 8)) / 2;
  const COLOR_DIFF_THRESHOLD = Math.max(220, bgBrightness - 16);

  // Require at least 6 content pixels to trigger boundary (ignores single-pixel guide lines or dust)
  const DENSITY_THRESHOLD = 6;

  // 1. Scan Rows (Top to Bottom, Bottom to Top)
  let top = 0;
  for (let y = 4; y < height - 4; y++) {
    let count = 0;
    for (let x = 4; x < width - 4; x++) {
      if (getPixelBrightness(x, y) < COLOR_DIFF_THRESHOLD) count++;
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
      if (getPixelBrightness(x, y) < COLOR_DIFF_THRESHOLD) count++;
      if (count >= DENSITY_THRESHOLD) break;
    }
    if (count >= DENSITY_THRESHOLD) {
      bottom = y;
      break;
    }
  }

  // 2. Scan Columns (Left to Right, Right to Left)
  let left = 0;
  for (let x = 4; x < width - 4; x++) {
    let count = 0;
    for (let y = top; y <= bottom; y++) {
      if (getPixelBrightness(x, y) < COLOR_DIFF_THRESHOLD) count++;
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
      if (getPixelBrightness(x, y) < COLOR_DIFF_THRESHOLD) count++;
      if (count >= DENSITY_THRESHOLD) break;
    }
    if (count >= DENSITY_THRESHOLD) {
      right = x;
      break;
    }
  }

  const boxWidth = right - left + 1;
  const boxHeight = bottom - top + 1;

  // If the image is tiny or invalid, skip
  if (boxWidth < 20 || boxHeight < 20) return null;

  // Full-scene illustration detection (e.g. Principal's Office, Classroom Lunch)
  // If drawing already covers >94% of both dimensions, keep the natural full frame!
  if (boxWidth > width * 0.94 && boxHeight > height * 0.94) {
    return { left: 0, top: 0, width, height, isFullScene: true };
  }

  return { left, top, width: boxWidth, height: boxHeight, isFullScene: false };
}

async function processAllImages() {
  console.log('\n======================================================');
  console.log('🖼️  2X SUPERSAMPLED AUTOCROP PIPELINE (*_1_c.png)');
  console.log('======================================================\n');

  let processedCount = 0;
  let fullSceneCount = 0;
  let skippedCount = 0;

  for (const srcDir of sourceDirs) {
    if (!fs.existsSync(srcDir)) continue;

    const files = fs.readdirSync(srcDir).filter(f => f.endsWith('_1_c.png'));

    for (const file of files) {
      const inputPath = path.join(srcDir, file);
      const outputPath = path.join(outputDir, file);

      try {
        const box = await findSmartBoundingBox(inputPath);

        if (!box) {
          // If no content found, just upscale 2x directly
          await sharp(inputPath)
            .resize({ width: 1000, withoutEnlargement: false, kernel: sharp.kernel.lanczos3 })
            .png({ compressionLevel: 9 })
            .toFile(outputPath);
          skippedCount++;
          continue;
        }

        if (box.isFullScene) {
          fullSceneCount++;
          // Full scene: upscale 2x with subtle line-art crisping
          await sharp(inputPath)
            .resize({
              width: Math.round(box.width * 2),
              height: Math.round(box.height * 2),
              kernel: sharp.kernel.lanczos3
            })
            .sharpen({ sigma: 1.0, m1: 0.5, m2: 2.0 })
            .png({ compressionLevel: 9, effort: 8 })
            .toFile(outputPath);

          processedCount++;
          continue;
        }

        // Object / Character crop: add 3.5% uniform breathing room
        const padX = Math.max(14, Math.round(box.width * 0.035));
        const padY = Math.max(14, Math.round(box.height * 0.035));

        // 1. Crop out empty letterboxing
        // 2. 2x Supersampling using Lanczos3
        // 3. Unsharp mask sharpening
        // 4. Clean solid white canvas padding
        await sharp(inputPath)
          .extract({
            left: box.left,
            top: box.top,
            width: box.width,
            height: box.height
          })
          .resize({
            width: Math.round(box.width * 2),
            height: Math.round(box.height * 2),
            kernel: sharp.kernel.lanczos3
          })
          .sharpen({
            sigma: 1.0,
            m1: 0.5,
            m2: 2.0
          })
          .extend({
            top: padY * 2,
            bottom: padY * 2,
            left: padX * 2,
            right: padX * 2,
            background: { r: 255, g: 255, b: 255, alpha: 1 }
          })
          .png({
            compressionLevel: 9,
            effort: 8
          })
          .toFile(outputPath);

        processedCount++;
        if (processedCount % 50 === 0) {
          console.log(`  ✓ Cropped & 2x upscaled ${processedCount} cards...`);
        }
      } catch (err) {
        console.error(`  ✕ Error on ${file}:`, err.message);
        fs.copyFileSync(inputPath, outputPath);
        skippedCount++;
      }
    }
  }

  console.log('\n======================================================');
  console.log(`🎉 COMPLETE!`);
  console.log(`   • Enhanced & 2x Upscaled: ${processedCount} cards`);
  console.log(`   • Full scenes preserved:  ${fullSceneCount} cards`);
  console.log(`   • Destination:            trimmed_assets/letstry_images/`);
  console.log('======================================================\n');
}

processAllImages();