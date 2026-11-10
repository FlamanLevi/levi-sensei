const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

console.log('🧹 Starting Levi-Sensei Asset & Disk Cleanup...\n');
let totalBytesFreed = 0;
let totalFilesDeleted = 0;

function removePath(targetPath) {
  if (!fs.existsSync(targetPath)) return;
  try {
    const stat = fs.statSync(targetPath);
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(targetPath)) {
        removePath(path.join(targetPath, entry));
      }
      fs.rmdirSync(targetPath);
    } else {
      totalBytesFreed += stat.size;
      totalFilesDeleted++;
      fs.unlinkSync(targetPath);
    }
  } catch (err) {
    console.error(`⚠️ Error removing ${targetPath}:`, err.message);
  }
}

// 1. Delete trimmed_assets/.backups (~1.2 GB)
const backupsDir = path.join(rootDir, 'trimmed_assets', '.backups');
if (fs.existsSync(backupsDir)) {
  console.log('🗑️ Removing trimmed_assets/.backups...');
  removePath(backupsDir);
}

// 2. Delete trimmed_assets/letstry_images_legacy_png (~237 MB)
const legacyPngDir = path.join(rootDir, 'trimmed_assets', 'letstry_images_legacy_png');
if (fs.existsSync(legacyPngDir)) {
  console.log('🗑️ Removing trimmed_assets/letstry_images_legacy_png...');
  removePath(legacyPngDir);
}

// 3. Prune dead flip-card frames (_2_* to _5_* and _e) from Let's Try dictionary image folders
function pruneDeadFrames(dir) {
  if (!fs.existsSync(dir)) return;
  console.log(`🔍 Pruning dead flip-card frames in ${path.relative(rootDir, dir)}...`);
  let count = 0;
  for (const f of fs.readdirSync(dir)) {
    const lower = f.toLowerCase();
    const isDead = /\(\d+\)/.test(lower) ||
      /_([2-9])(_[a-z0-9]+)?\.(png|webp|svg)$/i.test(lower) ||
      /_([1-9])_e\.(png|webp|svg)$/i.test(lower);

    if (isDead) {
      removePath(path.join(dir, f));
      count++;
    }
  }
  console.log(`   ✅ Removed ${count} dead frame files.`);
}

pruneDeadFrames(path.join(rootDir, 'letstry1', 'resources', 'app', 'app', '__media', 'dictionary', 'dic_card_data_image'));
pruneDeadFrames(path.join(rootDir, 'letstry2', 'resources', 'app', 'app', '__media', 'dictionary', 'dic_card_data_image'));

// 4. Prune unused movie, pdf, sound, and Electron binaries from letstry1 and letstry2
function pruneLetstryBloat(baseFolder) {
  const dir = path.join(rootDir, baseFolder);
  if (!fs.existsSync(dir)) return;

  console.log(`🗑️ Pruning non-dictionary desktop bloat in ${baseFolder}...`);
  const mediaDir = path.join(dir, 'resources', 'app', 'app', '__media');
  
  // Unused media directories
  const unusedMedia = ['movie', 'pdf', 'sound', '3', '4', 'toolbox'];
  for (const sub of unusedMedia) {
    const subPath = path.join(mediaDir, sub);
    if (fs.existsSync(subPath)) {
      console.log(`   Removing ${baseFolder}/.../__media/${sub}...`);
      removePath(subPath);
    }
  }

  // Remove desktop Electron root binaries (.exe, .dll, .pak, .bin)
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'resources') continue; // KEEP resources/app/app/__media/dictionary!
    removePath(path.join(dir, entry.name));
  }
}

pruneLetstryBloat('letstry1');
pruneLetstryBloat('letstry2');

const freedMB = (totalBytesFreed / (1024 * 1024)).toFixed(1);
const freedGB = (totalBytesFreed / (1024 * 1024 * 1024)).toFixed(2);

console.log('\n========================================');
console.log(`🎉 Cleanup Complete!`);
console.log(`📦 Files deleted: ${totalFilesDeleted}`);
console.log(`💾 Hard drive space reclaimed: ${freedMB} MB (${freedGB} GB)`);
console.log('========================================\n');
