# Levi-Sensei English Platform: Workspace Guidelines & Invariants

## 1. Stack, Source of Truth & Performance
- **Stack**: React 19, Vite 8, TypeScript 7, Tailwind CSS v4 (`@tailwindcss/vite` + `@config "../tailwind.config.js"` in `src/index.css`), Firebase Auth/RTDB, Three.js.
- **Vocabulary Source of Truth**: Edit `master_vocabulary_data/master_vocabulary.json`—never edit `public/data/master_vocabulary.json` or `public/data/vocabulary_clues.json` directly (they are regenerated and overwritten by `scripts/build_vocabulary_pipeline.cjs` during `npm run build`). Validate edits with `npm run vocab:check`.
- **Large Assets & exFAT / Vite Hygiene**:
  - Never synchronously `import` JSON files >500 KB into Vite bundles; place them in `public/data/` and load asynchronously with `fetch()`.
  - Keep large media/data folders (`manabi_assets`, `letstry1`, `letstry2`, `sound_suite`, `trimmed_assets`, `new_assets`, `master_vocabulary_data`) excluded in `vite.config.ts` `server.watch.ignored` and streamed via the dev middleware.
  - Keep `build.emptyOutDir: false` in `vite.config.ts` so `scripts/copy_assets.cjs` incremental assets are preserved.
- **Monolith Protection**: Never read massive files (e.g., `arcade.html`, `resume_project_summary.md`, or multi-MB JSONs) whole into context; use targeted searches and line ranges.

## 2. Textbook Assets & Pedagogical Invariants
- **Let's Try 1 & 2 (G3–G4)**: Use `*_1_c.png` (full-color, no text) for game cards, quizzes, and dictionary; `*_1_ce.png` (with English label) for full flashcards. Never use monochrome line art (`*_1.png` / `*_1_e.png`) on screen unless generating printable coloring worksheets.
- **Here We Go 5 & 6 (G5–G6)**: Use `cards/illustration/*_illust.png` (artwork without lines) and `cards/full/*_full.png` (4-line notebook flashcards).
- **Unified Single-Entry & Cross-Grade Fallback**: Each word has one entry in `master_vocabulary.json` with `media_by_grade`. Prefer the active student's grade artwork, and seamlessly fall back across grades when missing—never return blank cards when valid artwork exists in another grade. Keep unit filters strict; allow categories, search, and review modes to draw cumulatively.
- **Handwriting Guide Scoping**: Show 4-line notebook guidelines ONLY for upper elementary (G5–G6). Keep G3–G4 illustration-focused (preserving official single-baseline guides on A–Z / a–z alphabet cards).
- **Quiz Integrity & Pacing**:
  - In `EN_TO_JA` (English prompt -> Japanese choices), student iPad cards must omit target illustrations (`!isEnPrompt`) to prevent picture cheating.
  - Speed quizzes (e.g., F1 Sprint) require correct answers to advance and apply lockout penalties (e.g., 2.5s Pit Stop) to prevent spam guessing.
  - Standard MCQ supports 3 distractor-elimination modes (`OFF`, `HALFWAY`, `GRADUAL`) and keeps shape badges (`▲◆●■`) in corners/headers so illustrations remain unobstructed.

## 3. MEXT Typography, Classroom UX & Layout Rules
- **MEXT Font Stack & Furigana**: Preserve the MEXT textbook stack (`UD Digi Kyokasho` -> `BIZ UDPGothic` -> `Zen Maru Gothic`). Wrap elementary-facing Japanese kanji in `<ruby>漢字<rt>よみがな</rt></ruby>`, relying on global `ruby`/`rt` rules in `src/index.css` (`0.58em`, high-contrast inherit) rather than `text-[7px] text-slate-400` inline overrides that wash out on projectors. Omit ruby on micro-badges, numbers, and English target words.
- **Respectful Localization**: Never use `"kids"` in user-facing UI or stats—use `"students"` / `"replies"` (`人` / `人回答`). Keep `EN` natural English and `日` natural Japanese (target English vocabulary inside Japanese instructions is encouraged).
- **Landscape-First Multi-Column Layouts (No Tall Single-Column Stacks)**:
  - Primary classroom devices are **landscape iPads in kickstand folios** and **16:9 TVs/projectors**. Never build pages, lobbies, join/game-over screens, setups, or multi-section modals as tall, centered single-column vertical stacks (`max-w-md flex-col`).
  - Default to **2- or 3-column horizontal layouts** (`md:grid-cols-2`, `lg:grid-cols-3`, twin-wing panels, or sidebar + stage) sized to fit cleanly inside a single viewport (`100dvh`) with minimal or zero scrolling on landscape iPads, collapsing to 1 column only on narrow portrait screens. Keep only tiny confirmation/PIN dialogs compact.
- **Zero-Shift Bilingual Headers & Toolbars**: Toggling `EN` ↔ `日` must never wrap controls or alter container heights. Use `min-w-0 flex-1 truncate` for titles, `flex items-center gap-1.5 shrink-0 flex-nowrap` for right action clusters, and fixed rows or equal-width grids (`grid-cols-N`) for multi-mode toolbars.
- **Synchronized Dark Mode & Back-Row Contrast**: Support Light and Dark (`darkMode: 'class'`, `slate-950` / `slate-900`—never invent invalid classes like `slate-850`). Toggle themes via `.no-theme-transition` + forced synchronous reflow (`document.documentElement.offsetHeight`). Keep Stream A front-TV prompts/artwork clear from 8 meters away.

## 4. Routing, Teacher Lock & Roster Isolation
- **Student-First Root**: `/` (plus `/s`, `/student`, `/join`) defaults to the Student Portal; teacher views live at `/teacher` / `/admin`.
- **Teacher PIN Child Lock**: Gate teacher access and any "Join as Levi-Sensei / Tester" triggers behind the 6-digit `TEACHER_PIN` (`051683` in `ClassroomContext`). Never add bypasses or visible PIN hints in student UI.
- **Seat `00` Isolation & Escape Hatch**: Teacher/tester mode binds to attendance `0` (`isTeacher: true`) and must NEVER write to student seats `1–35`. Locked `?class=` screens must provide an escape action to switch school/class.
- **Roster Ergonomics**: Keep 1–35 attendance seats visible at a glance in a wide landscape grid (e.g., 6 columns) with comfortable iPad tap targets and `maxLength={10}` nicknames.

## 5. RTDB, Audio & 3D WebGL Hardware Budgets
- **RTDB Safety & Hygiene**: Route reads/writes/listeners through `src/services/rtdbSafe.ts` (`safeSet`, `safeUpdate`, `safeGet`, `safeRemove`, `safeOnValue`, `safeOnDisconnect`, `getServerTime()`) rather than raw `set`/`update` or `Date.now()`, and rely on `ensureAnonymousAuth()` for authenticated writes. Detach listeners on unmount, configure `onDisconnect()` for active rooms/seats, and throttle high-frequency multiplayer pushes to **5–10 Hz** (100–200ms).
- **iOS Safari Audio Resilience**: Defensively catch playback rejections (`audio.play().catch(() => {})`), strictly respect global mute (`useClassroom().isMuted` / `soundEffects`), and prevent overlapping BGM instances.
- **Classroom 3D WebGL Budget (Intel Dynabooks, 40 iPads, Desktop)**:
  - Always create renderers via `createClassroomRenderer` (`src/utils/classroom3d.ts`).
  - Disable dynamic shadows on Tier 1/2 (`renderer.shadowMap.enabled = false`); use pre-baked contact shadow quads. On Tier 3 desktops, cap shadows at `1024×1024` with `THREE.PCFShadowMap` (never `PCFSoftShadowMap`).
  - Cap DPR (`1.0` low-power, `≤1.25` otherwise) with Adaptive DRS; keep CPU `getImageData`/`putImageData` loops `≤256×256` (use `RepeatWrapping` tiles for larger surfaces); stay under **60 draw calls**; pool dynamic meshes; use `performance.now()` (never `THREE.Clock`).

## 6. Cross-Device Git, CI & Hosting Deployments
- **Cross-Device Sync (`origin/main`)**: Work alternates between Local Laptop (has gitignored media) and Remote Cloud VMs. Run `git fetch origin main && git status -sb` (and `git pull --rebase origin main` if behind) before editing, and commit/push completed milestones to `origin/main`.
- **CI Auto-Deploy & Immutable Media Caching**: Pushing to `origin/main` triggers `.github/workflows/deploy-firebase.yml` (`npm run build` + media-preserving hosting deploy). Never push broken builds to `main`. Because `firebase.json` serves `/cards/**`, `/media/**`, and `/assets/**` with `immutable` 1-year caching, use a new filename when replacing existing media.
- **Media-Preserving Remote Deploys**: Never run raw `firebase deploy` from a bare clone lacking `manabi_assets/` / `letstry1/` / `letstry2/`. Always use `npm run deploy:remote` (`scripts/deploy_remote_preserving_media.mjs`) to preserve all ~10,000 existing `/cards/**` and `/media/**` hashes (and auto-persist attached `*firebase-adminsdk*.json` keys to `~/.gemini/firebase-service-account.json`).
- **Local-First & Session Hygiene**: Verify edits via local Vite HMR (`npm run dev`), batch `npm run build` / deploys, keep terminal output concise, audit visual/geometric sets holistically in one pass, and start fresh sessions after completing milestones.
