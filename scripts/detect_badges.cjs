const sharp = require('sharp');
const path = require('path');
const MASTER_DIR = path.join(__dirname, '../manabi_assets/Grade 6 Manabi (new)');

async function detectNumberBadges(file) {
  const sheetPath = path.join(MASTER_DIR, file);
  const { data, info } = await sharp(sheetPath).raw().toBuffer({ resolveWithObject: true });
  // Teal background color is roughly (195, 222, 215) or similar light teal.
  // The badges are orange (r > 200, g > 90, b < 40), or blue (b > 160, r < 50, g < 150), or green (g > 150, r < 100, b < 100).
  const badgePixels = [];
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const idx = (y * info.width + x) * info.channels;
      const r = data[idx], g = data[idx+1], b = data[idx+2];
      const isOrange = (r > 200 && g > 90 && g < 170 && b < 50);
      const isBlue = (b > 140 && r < 50 && g > 90);
      const isGreen = (g > 130 && r < 110 && b < 100);
      if (isOrange || isBlue || isGreen) {
        badgePixels.push({ x, y });
      }
    }
  }

  // Group into clusters of size ~30x30 to 50x50
  const clusters = [];
  for (const p of badgePixels) {
    let found = false;
    for (const c of clusters) {
      if (Math.abs(p.x - c.cx) < 25 && Math.abs(p.y - c.cy) < 25) {
        c.minX = Math.min(c.minX, p.x);
        c.maxX = Math.max(c.maxX, p.x);
        c.minY = Math.min(c.minY, p.y);
        c.maxY = Math.max(c.maxY, p.y);
        c.cx = (c.minX + c.maxX) / 2;
        c.cy = (c.minY + c.maxY) / 2;
        c.count++;
        found = true;
        break;
      }
    }
    if (!found) {
      clusters.push({ minX: p.x, maxX: p.x, minY: p.y, maxY: p.y, cx: p.x, cy: p.y, count: 1 });
    }
  }

  const valid = clusters
    .filter(c => c.count > 100 && (c.maxX - c.minX) > 15 && (c.maxY - c.minY) > 15)
    .sort((a,b) => {
      // sort by row then x
      if (Math.abs(a.cy - b.cy) < 40) return a.cx - b.cx;
      return a.cy - b.cy;
    });

  console.log(`Detected in ${file}: ${valid.length} badges`);
  valid.forEach((c, i) => {
    console.log(`Badge ${i}: left: ${c.minX}, top: ${c.minY}, w: ${c.maxX - c.minX + 1}, h: ${c.maxY - c.minY + 1}`);
  });
}

(async () => {
  await detectNumberBadges('u11_p20_1.png');
  await detectNumberBadges('u11_p20_2.png');
})();
