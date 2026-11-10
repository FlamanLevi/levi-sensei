const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const ffmpeg = require('@ffmpeg-installer/ffmpeg');

const ffmpegPath = ffmpeg.path;
if (!fs.existsSync(ffmpegPath)) {
  console.error('❌ FFmpeg executable not found at:', ffmpegPath);
  process.exit(1);
}

const targetDir = path.resolve(__dirname, '..', 'public', 'media', 'bgm');
if (!fs.existsSync(targetDir)) {
  console.error('❌ Target directory not found:', targetDir);
  process.exit(1);
}

function getMp3Files(dir) {
  let files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(getMp3Files(full));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.mp3')) {
      files.push(full);
    }
  }
  return files;
}

const mp3Files = getMp3Files(targetDir);
console.log(`🎵 Found ${mp3Files.length} MP3 files in ${targetDir}`);
console.log(`🚀 Starting batch compression to 96 kbps...`);

let totalBeforeBytes = 0;
let totalAfterBytes = 0;
let successCount = 0;
let failCount = 0;

const startTime = Date.now();

for (let i = 0; i < mp3Files.length; i++) {
  const filePath = mp3Files[i];
  const relPath = path.relative(targetDir, filePath);
  const tempPath = filePath + '.tmp.mp3';

  const beforeStat = fs.statSync(filePath);
  const beforeSize = beforeStat.size;
  totalBeforeBytes += beforeSize;

  // FFmpeg command: re-encode audio to 96k CBR MP3, 44.1kHz, keep ID3 metadata
  const result = spawnSync(ffmpegPath, [
    '-i', filePath,
    '-codec:a', 'libmp3lame',
    '-b:a', '96k',
    '-ar', '44100',
    '-map_metadata', '0',
    '-id3v2_version', '3',
    '-y',
    tempPath
  ], { stdio: 'pipe' });

  if (result.status === 0 && fs.existsSync(tempPath) && fs.statSync(tempPath).size > 0) {
    const afterSize = fs.statSync(tempPath).size;
    fs.copyFileSync(tempPath, filePath);
    fs.unlinkSync(tempPath);
    totalAfterBytes += afterSize;
    successCount++;

    const beforeMB = (beforeSize / (1024 * 1024)).toFixed(2);
    const afterMB = (afterSize / (1024 * 1024)).toFixed(2);
    const savedPct = (((beforeSize - afterSize) / beforeSize) * 100).toFixed(1);

    console.log(`[${i + 1}/${mp3Files.length}] ✅ ${relPath}: ${beforeMB} MB ➔ ${afterMB} MB (-${savedPct}%)`);
  } else {
    failCount++;
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    console.error(`[${i + 1}/${mp3Files.length}] ❌ FAILED: ${relPath}`);
    if (result.stderr) {
      console.error(result.stderr.toString().slice(-300));
    }
    totalAfterBytes += beforeSize;
  }
}

const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
const beforeTotalMB = (totalBeforeBytes / (1024 * 1024)).toFixed(2);
const afterTotalMB = (totalAfterBytes / (1024 * 1024)).toFixed(2);
const savedTotalMB = ((totalBeforeBytes - totalAfterBytes) / (1024 * 1024)).toFixed(2);
const savedTotalPct = (((totalBeforeBytes - totalAfterBytes) / totalBeforeBytes) * 100).toFixed(1);

console.log(`\n========================================`);
console.log(`🎉 Compression Complete in ${elapsedSec}s!`);
console.log(`📦 Processed: ${successCount} succeeded, ${failCount} failed`);
console.log(`📊 Before:  ${beforeTotalMB} MB`);
console.log(`📉 After:   ${afterTotalMB} MB`);
console.log(`💰 Saved:   ${savedTotalMB} MB (-${savedTotalPct}%)`);
console.log(`========================================\n`);
