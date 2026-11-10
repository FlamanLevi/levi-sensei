/**
 * ============================================================================
 * Levi-Sensei Context Bundler for Gemini Web App & Google AI Studio
 * ============================================================================
 * Automatically scans the repository and generates modular, token-optimized
 * Markdown (.md) bundles in context_bundles/ with built-in AI architecture
 * prompts and strict GEMINI.md invariants.
 *
 * Usage:
 *   npm run bundle
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT_DIR, 'context_bundles');
const GAMES_OUT_DIR = path.join(OUT_DIR, 'games');

// Ignore rules for scanning
const IGNORED_DIRS = new Set([
  'node_modules',
  'dist',
  'dist-ssr',
  '.git',
  '.firebase',
  'context_bundles',
  'letstry1',
  'letstry2',
  'manabi_assets',
  'trimmed_assets',
  'sound_suite',
  'extracted_lesson_plans',
  'Next Week Web Lesson Plans',
  'Argon Improvements',
  'AI Studio',
  'scratch',
  'public/data'
]);

const IGNORED_FILES = new Set([
  'package-lock.json',
  'levi-sensei-codebase.txt',
  'levi-sensei-src.txt',
  'arcade.html',
  'master_vocabulary.json',
  'master_vocabulary.backup_20261002_0940.json'
]);

const ALLOWED_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.css',
  '.json',
  '.html',
  '.md'
]);

/**
 * Read GEMINI.md invariants if available
 */
function getGeminiInvariants() {
  const geminiPath = path.join(ROOT_DIR, 'GEMINI.md');
  if (fs.existsSync(geminiPath)) {
    return fs.readFileSync(geminiPath, 'utf8');
  }
  return '';
}

/**
 * Format a single file into a Markdown code block
 */
function formatFileAsMarkdown(relPath) {
  const fullPath = path.join(ROOT_DIR, relPath);
  if (!fs.existsSync(fullPath)) return '';

  const ext = path.extname(relPath).toLowerCase();
  let lang = 'typescript';
  if (ext === '.tsx') lang = 'tsx';
  else if (ext === '.ts') lang = 'typescript';
  else if (ext === '.jsx') lang = 'jsx';
  else if (ext === '.js' || ext === '.cjs' || ext === '.mjs') lang = 'javascript';
  else if (ext === '.css') lang = 'css';
  else if (ext === '.json') lang = 'json';
  else if (ext === '.html') lang = 'html';
  else if (ext === '.md') lang = 'markdown';

  try {
    const content = fs.readFileSync(fullPath, 'utf8');
    return `\n## File: \`${relPath.replace(/\\/g, '/')}\`\n\n\`\`\`${lang}\n${content.trimEnd()}\n\`\`\`\n\n---\n`;
  } catch (err) {
    return `\n## File: \`${relPath.replace(/\\/g, '/')}\` (Error reading: ${err.message})\n\n---\n`;
  }
}

/**
 * Recursively scan directory for files matching criteria
 */
function scanFiles(dir, baseDir = ROOT_DIR) {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(baseDir, fullPath);

    if (entry.isDirectory()) {
      const normalized = relPath.replace(/\\/g, '/');
      if (IGNORED_DIRS.has(entry.name) || IGNORED_DIRS.has(normalized)) {
        continue;
      }
      results = results.concat(scanFiles(fullPath, baseDir));
    } else if (entry.isFile()) {
      if (IGNORED_FILES.has(entry.name) || entry.name.endsWith('.backup.json')) {
        continue;
      }
      const ext = path.extname(entry.name).toLowerCase();
      if (ALLOWED_EXTENSIONS.has(ext)) {
        results.push(relPath.replace(/\\/g, '/'));
      }
    }
  }

  return results;
}

/**
 * Generate AI System Prompt Header
 */
function createHeader(bundleTitle, scopeDescription, fileList) {
  return `# ${bundleTitle}
> **Levi-Sensei English Platform** — Elementary ESL Gamified Learning Suite (Japan MEXT Curriculum)
> **Bundle Scope**: ${scopeDescription}
> **Target Audience**: Google AI Studio & Gemini Web App
> **Generated At**: ${new Date().toISOString()}

---

## 🛠️ Workspace Architecture & Invariants (Mandatory)
When reviewing, refactoring, or generating code from this bundle, you MUST strictly adhere to the following invariants:
1. **MEXT Japanese Typography & Furigana**:
   - All user-facing Japanese kanji MUST include semantic HTML \`<ruby>漢字<rt>よみがな</rt></ruby>\` tags.
   - Font family stack: \`font-family: 'UD Digi Kyokasho NP-R', 'UD Digi Kyokasho NK-R', 'BIZ UDPGothic', 'Zen Maru Gothic', sans-serif;\`.
2. **1920×1080 @ 150% DPI Scaling Invariant**:
   - The classroom laptop runs at 1920×1080 with 150% Windows scaling, giving a **logical viewport of 1280×720 px** (~600 px height in windowed browsers).
   - Layouts and cards MUST fit fluidly without overflowing or hiding bottom buttons.
   - Stage containers must use \`min-h-0 flex-1 overflow-hidden\` and allow smooth scrolling on narrow/short screens.
3. **Independent Dual-Language Architecture**:
   - Every activity exposes independent text language (\`textLang: 'en' | 'ja'\`) and voice language (\`voiceLang: 'en' | 'ja' | 'off'\`) controls.
   - Switching language must cause **zero layout shift** (buttons cannot wrap, heights remain pinned).
4. **CinemaStageLayout Standards**:
   - Stream A (Front TV) activities use a 20%–33% left control tower and a 66%–80% main cinema stage with frameless, high-contrast cards visible from 8 meters away.
5. **Code Output Style**:
   - Provide complete drop-in replacement components or clean unified diffs. Preserve all comments and MEXT ruby tags.

---

## 📂 Included Files in this Bundle (${fileList.length} files)
${fileList.map(f => `- \`${f}\``).join('\n')}

---

# 📜 Source Code

`;
}

/**
 * Main bundling routine
 */
function main() {
  console.log('🚀 Starting Levi-Sensei Context Bundler...');

  // Ensure directories exist
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  if (!fs.existsSync(GAMES_OUT_DIR)) fs.mkdirSync(GAMES_OUT_DIR, { recursive: true });

  // 1. Gather all files in src/ and root configs
  const allSrcFiles = scanFiles(path.join(ROOT_DIR, 'src'));
  const rootConfigFiles = [
    'GEMINI.md',
    'package.json',
    'vite.config.ts',
    'tailwind.config.js',
    'tsconfig.json',
    'index.html'
  ].filter(f => fs.existsSync(path.join(ROOT_DIR, f)));

  // 2. Discover all games dynamically in src/games/
  const gamesDir = path.join(ROOT_DIR, 'src', 'games');
  const gameEntries = fs.readdirSync(gamesDir, { withFileTypes: true })
    .filter(e => e.isDirectory() && e.name !== 'common');
  const gameNames = gameEntries.map(e => e.name);

  console.log(`🎮 Discovered ${gameNames.length} games: ${gameNames.join(', ')}`);

  // Shared contracts included in micro-bundles for context
  const sharedContracts = [
    'GEMINI.md',
    'src/types/index.ts',
    'src/context/VocabularyContext.tsx',
    'src/context/ClassroomContext.tsx',
    'src/context/LanguageContext.tsx',
    'src/components/common/CinemaStageLayout.tsx',
    'src/components/common/GameContainer.tsx',
    'src/utils/cardUtils.ts'
  ].filter(f => fs.existsSync(path.join(ROOT_DIR, f)));

  const bundlesToGenerate = [];

  // ==========================================================================
  // BUNDLE 00: CORE PLATFORM, UI/UX, SHELL & PORTALS
  // ==========================================================================
  const coreFiles = [
    ...rootConfigFiles,
    'src/main.tsx',
    'src/App.tsx',
    'src/index.css',
    ...allSrcFiles.filter(f =>
      f.startsWith('src/types/') ||
      f.startsWith('src/context/') ||
      f.startsWith('src/hooks/') ||
      f.startsWith('src/utils/') ||
      f.startsWith('src/services/') ||
      f.startsWith('src/components/common/') ||
      f.startsWith('src/components/shell/') ||
      f.startsWith('src/components/student/') ||
      f.startsWith('src/components/teacher/') ||
      f.startsWith('src/components/dictionary/') ||
      f.startsWith('src/components/mascot/')
    )
  ];
  bundlesToGenerate.push({
    file: path.join(OUT_DIR, '00_CORE_PLATFORM_UI_UX.md'),
    title: '00 - Core Platform, Shell, UI/UX & Portals',
    scope: 'Base site shell, routing, student portal, teacher gate, shared modals, audio/theme/language context, and design foundations.',
    files: Array.from(new Set(coreFiles)),
    destHint: 'Gemini Web App or AI Studio'
  });

  // ==========================================================================
  // BUNDLE 01: ALL CLASSROOM TV GAMES (Stream A)
  // ==========================================================================
  const classroomGameFiles = [
    'GEMINI.md',
    'src/games/registry.ts',
    'src/components/common/CinemaStageLayout.tsx',
    'src/components/common/GameContainer.tsx',
    'src/utils/cardUtils.ts',
    ...allSrcFiles.filter(f =>
      f.startsWith('src/games/') &&
      !f.startsWith('src/games/quiz/') &&
      !f.startsWith('src/games/common/')
    )
  ];
  bundlesToGenerate.push({
    file: path.join(OUT_DIR, '01_ALL_CLASSROOM_TV_GAMES.md'),
    title: '01 - All Stream A Classroom TV Games (14 Activities)',
    scope: 'All front-of-class interactive games (Bingo, Hot Potato, What\'s Missing, Concentration, Keyword Snatch, Speed Flash, Pixel Reveal, 3-Hints, Clock Master, Criss Cross, Typhoon, Katakana Breaker, 60s Challenge, etc.) + Registry.',
    files: Array.from(new Set(classroomGameFiles)),
    destHint: 'Google AI Studio (1M window)'
  });

  // ==========================================================================
  // BUNDLE 02: EIGO ARENA MULTIPLAYER (Stream B)
  // ==========================================================================
  const eigoArenaFiles = [
    'GEMINI.md',
    'src/context/ClassroomContext.tsx',
    'src/context/VocabularyContext.tsx',
    ...allSrcFiles.filter(f =>
      f.startsWith('src/games/quiz/') ||
      f.startsWith('src/games/common/multiplayer/')
    )
  ];
  bundlesToGenerate.push({
    file: path.join(OUT_DIR, '02_EIGO_ARENA_MULTIPLAYER.md'),
    title: '02 - Eigo Arena Multi-iPad Quiz & Arcade Engine',
    scope: 'Realtime Database room engine, quiz host stage, student iPad controllers, F1 Sprint circuit, Volleyball 3D, Tug of War, and question generator.',
    files: Array.from(new Set(eigoArenaFiles)),
    destHint: 'Google AI Studio (1M window)'
  });

  // ==========================================================================
  // BUNDLE 99: MASTER FULL CODEBASE
  // ==========================================================================
  const masterFiles = [
    ...rootConfigFiles,
    ...allSrcFiles
  ];
  bundlesToGenerate.push({
    file: path.join(OUT_DIR, '99_MASTER_FULL_CODEBASE.md'),
    title: '99 - Master Full Codebase Bundle',
    scope: 'Complete source tree, configurations, and components for Levi-Sensei English platform.',
    files: Array.from(new Set(masterFiles)),
    destHint: 'Google AI Studio (2M window)'
  });

  // ==========================================================================
  // PER-GAME MICRO-BUNDLES (Auto-Discovered for every game in src/games/*)
  // ==========================================================================
  for (const game of gameNames) {
    const specificGameFiles = allSrcFiles.filter(f => f.startsWith(`src/games/${game}/`));
    const microBundleFiles = Array.from(new Set([...sharedContracts, ...specificGameFiles]));

    bundlesToGenerate.push({
      file: path.join(GAMES_OUT_DIR, `${game}.md`),
      title: `Game Micro-Bundle: ${game.toUpperCase()}`,
      scope: `Self-contained source for src/games/${game}/ with shared contracts and GEMINI.md invariants. Ideal for rapid iteration on Gemini Web App.`,
      files: microBundleFiles,
      destHint: 'Gemini Web App (Ultra Fast / Low Token)'
    });
  }

  // Generate each bundle
  const stats = [];

  for (const bundle of bundlesToGenerate) {
    const header = createHeader(bundle.title, bundle.scope, bundle.files);
    let body = '';

    for (const file of bundle.files) {
      body += formatFileAsMarkdown(file);
    }

    const fullContent = header + body;
    fs.writeFileSync(bundle.file, fullContent, 'utf8');

    const sizeBytes = Buffer.byteLength(fullContent, 'utf8');
    const sizeKB = Math.round(sizeBytes / 1024);
    const estTokens = Math.round(fullContent.length / 4);

    stats.push({
      Name: path.relative(OUT_DIR, bundle.file).replace(/\\/g, '/'),
      Files: bundle.files.length,
      'Size (KB)': `${sizeKB} KB`,
      'Est Tokens': `~${(estTokens / 1000).toFixed(1)}k`,
      'Best For': bundle.destHint
    });
  }

  console.log('\n✅ Context bundles generated successfully in ./context_bundles/\n');
  console.table(stats);
}

main();
