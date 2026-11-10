import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import fs from 'fs';

const __dirname = import.meta.dirname;

function resolveMediaFile(cleanUrl: string): string {
  let targetFile = '';
  if (cleanUrl.startsWith('/cards/')) {
    const rel = cleanUrl.replace('/cards/', '');
    targetFile = path.join(__dirname, 'trimmed_assets/cards', rel);
    if (!fs.existsSync(targetFile)) {
      targetFile = path.join(__dirname, 'manabi_assets/cards', rel);
    }
  } else if (cleanUrl.startsWith('/media/sound_suite/') || cleanUrl.startsWith('/media/sound/') || cleanUrl.startsWith('/sound_suite/')) {
    const rel = cleanUrl.startsWith('/media/sound_suite/')
      ? cleanUrl.replace('/media/sound_suite/', '')
      : cleanUrl.startsWith('/media/sound/')
      ? cleanUrl.replace('/media/sound/', '')
      : cleanUrl.replace('/sound_suite/', '');

    // 1. Check root sound_suite directory (handles "sound_suite/..." or direct paths)
    const cleanRel = rel.replace(/^sound_suite[\\/]/, '');
    targetFile = path.join(__dirname, 'sound_suite', rel);
    if (!fs.existsSync(targetFile)) {
      targetFile = path.join(__dirname, 'sound_suite', cleanRel);
    }

    // 2. Fallbacks for original Let's Try textbook recordings
    if (!fs.existsSync(targetFile)) {
      targetFile = path.join(__dirname, 'letstry1/resources/app/app/__media/dictionary/dic_card_data_sound', rel);
      if (!fs.existsSync(targetFile)) {
        targetFile = path.join(__dirname, 'letstry2/resources/app/app/__media/dictionary/dic_card_data_sound', rel);
      }
    }
  } else if (cleanUrl.startsWith('/media/images/')) {
    const rel = cleanUrl.replace('/media/images/', '');
    const baseName = rel.replace(/\.[^.]+$/, '');

    // 1. Check new_assets/letstry_images first (super-sampled Lanczos 1080p + SVGs)
    targetFile = path.join(__dirname, 'new_assets/letstry_images', rel);
    if (!fs.existsSync(targetFile)) {
      for (const altExt of ['.webp', '.svg', '.png']) {
        const altPath = path.join(__dirname, 'new_assets/letstry_images', baseName + altExt);
        if (fs.existsSync(altPath)) {
          targetFile = altPath;
          break;
        }
      }
    }

    // 2. Fall back to trimmed_assets/letstry_images
    if (!fs.existsSync(targetFile)) {
      targetFile = path.join(__dirname, 'trimmed_assets/letstry_images', rel);
      if (!fs.existsSync(targetFile)) {
        for (const altExt of ['.webp', '.svg', '.png']) {
          const altPath = path.join(__dirname, 'trimmed_assets/letstry_images', baseName + altExt);
          if (fs.existsSync(altPath)) {
            targetFile = altPath;
            break;
          }
        }
      }
    }

    // 3. Fall back to original Let's Try CD-ROM extractions
    if (!fs.existsSync(targetFile)) {
      targetFile = path.join(__dirname, 'letstry1/resources/app/app/__media/dictionary/dic_card_data_image', rel);
      if (!fs.existsSync(targetFile)) {
        targetFile = path.join(__dirname, 'letstry2/resources/app/app/__media/dictionary/dic_card_data_image', rel);
      }
    }
  }
  return targetFile;
}

function handleMediaMiddleware(req: any, res: any, next: () => void) {
  if (!req.url) return next();
  const cleanUrl = req.url.split('?')[0];
  const targetFile = resolveMediaFile(cleanUrl);

  if (targetFile && fs.existsSync(targetFile)) {
    const ext = path.extname(targetFile).toLowerCase();
    const contentType = ext === '.png' ? 'image/png'
      : ext === '.webp' ? 'image/webp'
      : ext === '.svg' ? 'image/svg+xml'
      : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg'
      : ext === '.mp3' ? 'audio/mpeg'
      : 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'no-cache');
    return fs.createReadStream(targetFile).pipe(res);
  }
  next();
}

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    {
      name: 'serve-local-assets',
      configureServer(server) {
        server.middlewares.use(handleMediaMiddleware);
      },
      configurePreviewServer(server) {
        server.middlewares.use(handleMediaMiddleware);
      }
    }
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@data': path.resolve(__dirname, './master_vocabulary_data'),
      '@cards': path.resolve(__dirname, './manabi_assets/cards'),
      '@sound': path.resolve(__dirname, './letstry1/resources/app/app/__media/dictionary/dic_card_data_sound'),
      '@sound_suite': path.resolve(__dirname, './sound_suite')
    }
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
    watch: {
      ignored: [
        '**/sound_suite/**',
        '**/new_assets/**',
        '**/trimmed_assets/**',
        '**/manabi_assets/**',
        '**/letstry1/**',
        '**/letstry2/**',
        '**/letstry_data/**',
        '**/extracted_lesson_plans/**',
        '**/.git/**',
        '**/dist/**',
        '**/master_vocabulary_data/**'
      ]
    }
  },
  build: {
    emptyOutDir: false
  },
  preview: {
    port: 5173,
    host: '0.0.0.0'
  }
});