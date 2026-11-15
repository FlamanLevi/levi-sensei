#!/usr/bin/env node
/**
 * Measures integrated loudness (EBU R128 LUFS) for all BGM tracks under public/media/bgm/
 * and computes cache-safe runtime gain multipliers in both:
 *   - public/media/bgm/sound_packs.json
 *   - src/utils/soundPacks.ts
 *
 * Keeping /media/*.mp3 untouched preserves 1-year immutable CDN caching across classroom iPads.
 * Usage: node scripts/measure_bgm_loudness.cjs [--from-cache /path/to/scan.json]
 */

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const TARGET_LUFS = -10.0;
const MIN_GAIN = 0.55;
const MAX_GAIN = 1.42;

const ROOT = path.resolve(__dirname, '..');
const TS_PATH = path.join(ROOT, 'src', 'utils', 'soundPacks.ts');
const JSON_PATH = path.join(ROOT, 'public', 'media', 'bgm', 'sound_packs.json');

function resolveFfmpegPath() {
  try {
    return require('@ffmpeg-installer/ffmpeg').path;
  } catch {
    return 'ffmpeg';
  }
}

function computeNormalizedGain(lufs) {
  if (!Number.isFinite(lufs) || lufs <= -69) return 1.0;
  const raw = Math.pow(10, (TARGET_LUFS - lufs) / 20);
  const clamped = Math.max(MIN_GAIN, Math.min(MAX_GAIN, raw));
  return Number(clamped.toFixed(3));
}

function scanTrackLufs(ffmpegPath, url) {
  return new Promise((resolve, reject) => {
    const filePath = path.join(ROOT, 'public', url.replace(/^\/+/, ''));
    if (!fs.existsSync(filePath)) {
      reject(new Error(`Missing audio file: ${filePath}`));
      return;
    }
    execFile(
      ffmpegPath,
      ['-hide_banner', '-nostats', '-i', filePath, '-af', 'ebur128=peak=true', '-f', 'null', '-'],
      { maxBuffer: 10 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err) {
          reject(err);
          return;
        }
        const text = `${stderr || ''}\n${stdout || ''}`;
        const summaryIdx = text.lastIndexOf('Summary:');
        const tail = summaryIdx >= 0 ? text.slice(summaryIdx) : text;
        const iMatch = tail.match(/Integrated loudness:\s*I:\s*(-?[\d.]+)\s*LUFS/);
        const lufs = iMatch ? Number(parseFloat(iMatch[1]).toFixed(1)) : TARGET_LUFS;
        resolve({ url, lufs, gain: computeNormalizedGain(lufs) });
      }
    );
  });
}

async function main() {
  const fromCacheIdx = process.argv.indexOf('--from-cache');
  const cachePath = fromCacheIdx >= 0 ? process.argv[fromCacheIdx + 1] : null;

  const tsContent = fs.readFileSync(TS_PATH, 'utf8');
  const match = tsContent.match(
    /(export const SOUND_PACKS: Record<string, SoundPack> = )(\{[\s\S]*?\})(;\s*\n\s*export const SOUND_PACK_LIST)/
  );
  if (!match) {
    throw new Error('Could not parse SOUND_PACKS block in src/utils/soundPacks.ts');
  }

  const tsPacks = JSON.parse(match[2]);
  const jsonPacks = fs.existsSync(JSON_PATH) ? JSON.parse(fs.readFileSync(JSON_PATH, 'utf8')) : null;

  const uniqueUrls = new Set();
  for (const pack of Object.values(tsPacks)) {
    for (const track of pack.tracks || []) {
      if (track.url) uniqueUrls.add(track.url);
    }
  }

  const metricsByUrl = new Map();
  if (cachePath && fs.existsSync(cachePath)) {
    const cached = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    for (const entry of cached) {
      if (entry && entry.url && Number.isFinite(entry.lufs)) {
        metricsByUrl.set(entry.url, {
          url: entry.url,
          lufs: Number(entry.lufs.toFixed(1)),
          gain: computeNormalizedGain(entry.lufs),
        });
      }
    }
  }

  const urlsToScan = [...uniqueUrls].filter((url) => !metricsByUrl.has(url));
  if (urlsToScan.length > 0) {
    const ffmpegPath = resolveFfmpegPath();
    const concurrency = 8;
    for (let i = 0; i < urlsToScan.length; i += concurrency) {
      const batch = urlsToScan.slice(i, i + concurrency).map((u) => scanTrackLufs(ffmpegPath, u));
      const scanned = await Promise.all(batch);
      for (const item of scanned) {
        metricsByUrl.set(item.url, item);
      }
    }
  }

  const applyMetrics = (packsObj) => {
    for (const pack of Object.values(packsObj)) {
      if (!Array.isArray(pack.tracks)) continue;
      pack.tracks = pack.tracks.map((track) => {
        const metrics = metricsByUrl.get(track.url);
        if (!metrics) return track;
        return {
          ...track,
          lufs: metrics.lufs,
          gain: metrics.gain,
        };
      });
    }
  };

  applyMetrics(tsPacks);
  if (jsonPacks) {
    applyMetrics(jsonPacks);
    fs.writeFileSync(JSON_PATH, `${JSON.stringify(jsonPacks, null, 2)}\n`, 'utf8');
  }

  let nextTsContent = tsContent.replace(
    /(export const SOUND_PACKS: Record<string, SoundPack> = )(\{[\s\S]*?\})(;\s*\n\s*export const SOUND_PACK_LIST)/,
    `$1${JSON.stringify(tsPacks, null, 2)}$3`
  );
  if (!nextTsContent.includes('gain?: number;')) {
    nextTsContent = nextTsContent.replace(
      '  url: string;\n}',
      '  url: string;\n  lufs?: number;\n  gain?: number;\n}'
    );
  }
  fs.writeFileSync(TS_PATH, nextTsContent, 'utf8');

  const gains = [...metricsByUrl.values()].map((m) => m.gain);
  console.log(
    `Updated ${metricsByUrl.size} unique BGM tracks (target=${TARGET_LUFS} LUFS, gain range ${Math.min(...gains)}..${Math.max(...gains)})`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
