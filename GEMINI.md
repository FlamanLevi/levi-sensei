# Levi-Sensei English Platform: Workspace Guidelines & Invariants

## 1. Textbook Asset Conventions & Cumulative Vocabulary Access
- **Let's Try 1 & 2 (Grades 3 & 4)**:
  - `*_1_c.png`: Vibrant Full-Color Illustration (no text). Primary asset for game cards, guessing quizzes, and dictionary illustrations.
  - `*_1_ce.png`: Full-Color Card with English label. Used for full flashcard display.
  - `*_1.png` / `*_1_e.png`: Monochrome line art. DO NOT use for on-screen UI unless generating printable coloring worksheets.
- **Here We Go 5 & 6 (Grades 5 & 6)**:
  - `cards/illustration/*_illust.png`: Artwork without guidelines.
  - `cards/full/*_full.png`: Official 4-line notebook flashcard with handwriting guidelines.
- **Unified Single-Entry Architecture & Grade-Preference Asset Resolution**:
  - Each vocabulary word maintains a single unified entry in `master_vocabulary.json` with unified audio and a `media_by_grade` map pointing to grade-specific textbook artwork.
  - **Grade Preference Order**:
    - When a word exists in the active grade (e.g. `pencil` in G4 vs G5), resolve the illustration from the active student's textbook (`media_by_grade[activeGrade]`).
    - **Intelligent Cross-Grade Fallback (No Gatekeeping / No Blank Cards)**: If a younger student opts to play games using higher-grade vocabulary (e.g. `actor`), seamlessly show the upper-grade textbook illustration. If an older student reviews vocabulary from earlier grades that was not redrawn in upper textbooks (e.g. `arts and crafts room`), seamlessly fall back to the earlier grade illustration. Never wall off or return blank cards (`null`) when a valid illustration exists in another grade.
  - Keep lesson unit filters strict to the selected unit, but allow thematic categories, search, and review modes (Prior Review, Elementary Grand Slam) to draw cumulatively across grades.

## 2. Frontend Performance on exFAT / Removable Drives
- **Asynchronous Static Loading**: Never synchronously import JSON files larger than 500 KB into Vite bundles (`import data from './large.json'`). Place large static databases in `public/data/` and fetch them asynchronously using native browser `fetch()`.
- **File Watcher Exclusions**: Always exclude large static media directories (`manabi_assets`, `letstry1`, `letstry2`, `node_modules`) from Vite's `server.watch.ignored` in `vite.config.ts`.
- **Zero-Copy Streaming**: Never duplicate gigabytes of textbook media into `public/`. Use custom development middleware in `vite.config.ts` to stream files directly from disk paths.

## 3. Elementary MEXT Typography & Furigana Standards
- All user-facing UI text, cards, and ruby furigana must adhere to the MEXT-approved textbook font stack:
  ```css
  font-family: 'UD Digi Kyokasho NP-R', 'UD Digi Kyokasho NK-R', 'UD Digi Kyokasho N-R', 'BIZ UDPGothic', 'Zen Maru Gothic', sans-serif;
  ```
- Windows: Uses native Morisawa `UD Digital Kyokasho-tai`.
- iPads / Web: Falls back to Google Fonts `BIZ UDPGothic` and `Zen Maru Gothic` for correct stroke shapes, single-story lowercase `a` and `g`, and clean hiragana/katakana.
- **Furigana Ruby Standards**:
  - User-facing Japanese kanji across core titles, instructions, game cards, and main prompts must include MEXT-approved furigana using semantic HTML `<ruby>漢字<rt>よみがな</rt></ruby>` or reusable furigana helper components.
  - Furigana text (`<rt>`) must use compact styling (`text-[7px]` to `text-[9px]`, `font-normal`, `text-slate-400` or inherited tone) so it does not distort surrounding line heights or baseline alignment.
  - Younger elementary learners (Grades 1–4) must never be impeded by unread kanji.
  - Compact auxiliary badges, micro-pills, numbers, and target English words do not require ruby, ensuring flex containers and small buttons maintain clean vertical alignment.

## 4. Classroom UX, Routing & Teacher Security
- **Student-First Routing**: The root path (`https://levi-sensei.web.app`) is strictly the default **Student Portal** (with aliases `/s`, `/student`, `/join`). Students must never be required to type subpaths.
- **Teacher Mode Child Lock**: Teacher access is located at `/teacher` or `/admin` and must be locked behind the 6-digit teacher PIN (`TEACHER_PIN` in `ClassroomContext`, default `'051683'`).
  - Any "Join as Levi-Sensei / Tester" quick-access buttons on student-facing device linking modals MUST trigger a 6-digit PIN confirmation modal before unlocking test mode.
  - Never provide quick-bypass buttons or visible PIN hints in the student-facing UI.
- **Roster & Seat Isolation for Testers**: Teacher test mode must bind to attendance number `0` (or `isTeacher: true`) and NEVER write to student roster seats (1–35) in RTDB.
- **Device Linking Escape Hatch**: Any screen with locked class URL parameters (`?class=`) must provide a clear "別の学校・クラスをえらび直す (Choose different class)" action to clear pending state in case a student taps the wrong link.
- **Handwriting Guide Scoping**: Full 4-line notebook guidelines must ONLY appear for upper elementary (Grades 5 & 6, *Here We Go*). For lower elementary (Grades 3 & 4, *Let's Try*), cards remain illustration-focused, while official single-baseline guides on alphabet letter cards (A–Z uppercase and a–z lowercase) are intentionally preserved to match the authentic textbook.
- **Projector & TV Contrast**: Every component must support both Light and Dark themes (`darkMode: 'class'`). Dark mode must use deep slate backgrounds (`slate-950`) and high-contrast card borders for visibility on classroom ceiling projectors.

## 5. Classroom Multiplayer Network & RTDB Hygiene
- **Subscription Lifecycle & Leak Prevention**: All Firebase Realtime Database listeners (`onValue`, `onChildAdded`) must be cleanly detached in `useEffect` cleanup return functions. Never leave hanging listeners when students or hosts exit rooms.
- **High-Frequency Write Throttling**: In interactive multi-device game modes (such as Tug-of-War button tapping, F1 Sprint answers, or live buzzers), NEVER write raw 60 FPS state updates directly to RTDB. Throttle client state pushes to **5–10 Hz** (every 100–200ms) to conserve Firebase bandwidth and prevent latency spikes across 40 simultaneous iPad connections.
- **Disconnection Resilience**: Room hosts and connected student seats should configure `onDisconnect()` handlers where appropriate to ensure abandoned sessions or disconnected iPads clear their active status cleanly.

## 6. Classroom Audio & iPad Web Audio Resilience
- **Defensive Playback**: Audio playback on mobile and iOS Safari can reject promises if triggered outside an active user gesture or before user interaction. All audio triggers (`soundEffects.play*`, BGM playback) must defensively handle rejections:
  ```ts
  audio.play().catch(() => { /* safely ignore autoplay restrictions */ });
  ```
- **Global Mute Respect**: Every sound effect, voice announcement, and BGM track must strictly check and respect the classroom audio mute preference (`soundEffects` mute state or `useClassroom().isMuted`).
- **Single BGM Instance**: Never allow overlapping background music tracks. Switching BGM tracks must fade out or immediately halt the preceding audio instance before initiating the new stream.

## 7. Games Master Blueprint & Gameplay Balance Invariants
- **Authoritative Catalog**: Core games, activities, and roadmap entries primarily derive from `LEVI_SENSEI_GAMES_MASTER_BLUEPRINT.md` (the 88-activity curriculum across Stream 🅰️ Front TV, Stream 🅱️ Multi-iPad, and Stream 🅲 Solo Study). Approved extensions and innovative classroom formats are welcomed.
- **Anti-Spam & Progress Pacing**: In competitive speed quiz games (such as F1 Sprint), forward progress must strictly require correct answers, with incorrect choices incurring a lockout penalty (e.g. 2.5s Pit Stop) to prevent rapid guessing. Other game modes (e.g. Volleyball rallies, Tug-of-War, Co-op battles) should adopt pacing and scoring mechanics tailored to their specific gameplay.
- **Illustration-First Layout**: In multiple-choice cards, pin shape badges (▲◆●■) into corners or headers so illustrations retain unobstructed space (`96px+` height on desktop/TV) with high-contrast backing.
- **TV & Projector Back-Row Visibility**:
  - In Stream 🅰️ (Front TV) and whole-class quiz modes (Eigo Arena), the question prompt artwork container must be prominent: at least `h-52 sm:h-72 md:h-80 w-full max-w-2xl` with high-contrast borders.
  - Question prompt typography must scale up to `text-5xl sm:text-7xl md:text-8xl` with MEXT Japanese font stack so students in the back row of a 40-seat classroom can read effortlessly.
- **Cheating Prevention in Translation Modes**:
  - When questions are set to English prompt ➔ Japanese choices (`EN_TO_JA`), multiple-choice cards on student iPads (Mirrored mode and Sprint race) MUST omit target illustrations (`!isEnPrompt`). Students must demonstrate vocabulary comprehension by reading Japanese text without relying on picture clues.
- **Distractor Elimination**:
  - In standard multiple-choice quiz formats, distractor elimination hints support 3 configurable modes: OFF, Halfway 50/50 (at 50% time elapsed), and Gradual Elimination (1 distractor at 33%, 2nd distractor at 66%).
- **Classroom Terminology & Clean Localization**:
  - NEVER use the informal word "kids" in user-facing UI or statistics. Always use formal, respectful classroom terms: "students" or "replies" (`人` / `人回答`).
  - In Japanese mode (`ja`), headings, awards, and podium banners (`CHAMPION` ➔ `優勝`) should use natural Japanese phrasing.

## 8. Synchronized Dark Mode Switching
- Theme transitions must use the `.no-theme-transition` helper class combined with a forced synchronous reflow (`document.documentElement.offsetHeight`) when toggling `.dark`. Never put slow `transition-colors` or `transition-all` on outermost layout wrappers to avoid staggered color lag.
- **Stage & Container Theme Parity**: `GameContainer` and `<CinemaStageLayout />` headers must provide an instant Sun ☀️ / Moon 🌙 toggle that synchronizes with `document.documentElement` using `.no-theme-transition` and synchronous reflow (`root.offsetHeight`).
- **Modal & Tool Theme Integration**: Standalone tools and modals should inherit and synchronize with the active classroom theme via `useClassroom().toggleTheme()`. Utility modals should prioritize clean, uncrowded headers while full-stage activities expose visible toggles.

## 9. Bilingual UI Layout Stability & Dual-Language Architecture
- **Zero Layout Shift Invariant**: Toggling the user interface language between English (`EN`) and Japanese (`日`) must NEVER alter container dimensions, cause controls to wrap, or trigger vertical reflow of surrounding elements.
- **Header Control Invariance**:
  - Right-aligned control clusters (language toggles, voice controls, mute, close buttons) must strictly use `flex items-center gap-1.5 shrink-0 flex-nowrap`—NEVER `flex-wrap`.
  - Left-aligned title containers must use `min-w-0 flex-1 truncate` so that varying text lengths between English and Japanese never crowd or push control buttons onto secondary rows.
  - Modal headers must pin a consistent minimum height (`min-h-[44px]`).
- **Structured Fixed-Row Toolbars**:
  - When a toolbar contains buttons with disparate English and Japanese character counts (e.g., `Multiply` [8 chars] vs `積` [1 char]), NEVER place them in a single fluid `flex-wrap` container.
  - Structure the toolbar into dedicated, fixed-height rows (e.g. Row 1: Presets + Actions; Row 2: Mode Tabs).
  - Multi-option segmented mode toggles must use equal-width columns (`grid grid-cols-N` or `flex-1`), ensuring button widths and row heights remain 100% identical regardless of active language.
- **Pinned Heights for Font-Metric Discrepancy Prevention**:
  - Because MEXT textbook fonts (`UD Digi Kyokasho`, `BIZ UDPGothic`) have different ascender/descender metrics and baseline alignments than Latin sans-serif fonts, interactive pills, formula badges, roll buttons, and hint footers must declare explicit Tailwind heights (`h-8`, `h-11`, `h-5`) with `flex items-center justify-center leading-none truncate`.
- **Dual-Language Architecture & State Management**:
  - Components should consume language and voice preferences from shared classroom context (`useClassroom()` / `useLanguage()`) for consistent persistence across screens, while supporting local overrides when an activity specifically warrants independent controls.
  - Keep control clusters streamlined on compact viewports (iPads / mobile) to ensure titles remain visible and un-truncated.

## 10. CinemaStageLayout & Classroom Stage Ratios
- **20%–33% Left Tower / Teacher Stand (Landscape / TV)**:
  - On landscape desktop and TV displays, the left menu bar/sidebar occupies 20%–33% of screen width (`sidebarWidth="compact"` for ~220–260px or `sidebarWidth="standard"` for ~280–320px). It aligns with the teacher's physical standing position on the left side of the blackboard/TV.
- **66%–80% Main Cinema Stage**:
  - The remaining 66%–80% of screen width is the Main Stage, optimized for high-contrast visibility and projector viewing from the back row (8 meters away). Cards must use frameless, single-surface designs with giant illustrations and adaptive typography.
- **Responsive Mobile & Portrait Fallback**:
  - On narrow or portrait viewports (e.g. iPad in portrait mode or smartphones), the side tower must collapse gracefully into a sleek header drawer or bottom control bar so the main stage retains maximum vertical visibility.
- **Settings Modal Delegation**:
  - Secondary options (timers, speeds, speech toggles, print tools, team scoreboards) must NEVER be stacked directly as bloated pills inside the sidebar. Instead, delegate them to a sleek `SettingsModal` triggered by a ⚙️ Settings button in the sidebar header or footer. This keeps the left tower slim and completely prevents internal vertical scrollbars.
- **Stage Action Bar**:
  - Primary interaction buttons (e.g. DRAW, PASS, REVEAL, START) must be pinned at the bottom of the stage via `stageAction` with explicit keyboard shortcut indicators (`Space` / `Enter`).
- **Canonical Component**:
  - All Stream A (Front TV) and whole-class classroom activities (Hot Potato, Classroom Bingo, Keyword Snatch, Speed Flashcard Race, etc.) must standardize on `<CinemaStageLayout />` from `@/components/common/CinemaStageLayout`.

## 11. Classroom Game Instructions & Tutorial Modal Invariants
- **Full-Screen Stage Presentation**:
  - Tutorial modals must span the full display area: `w-[98vw] max-w-[1800px] h-[95vh] max-h-[980px]` with `border-4 sm:border-6 border-amber-400 dark:border-amber-500 rounded-3xl shadow-2xl overflow-hidden`.
  - Avoid constraining whole-class instructions modals to narrow dialog boxes (`max-w-4xl` / 66–75% screen width).
- **Hugging Illustration Box**:
  - The top illustration box must tightly frame its icons and label without vast lateral margins: `w-auto min-w-[200px] max-w-fit px-8 sm:px-12 py-2 sm:py-3 rounded-2xl sm:rounded-3xl border-3 shadow-inner`.
  - Display emoji icons on top (`text-3xl sm:text-4xl md:text-5xl`) with a single-language pill badge directly below (`text-xs sm:text-sm md:text-base font-black`).
- **Pedagogically Sound Bilingual Isolation**:
  - **Japanese Mode (`日`)**: Natural Japanese phrasing with MEXT furigana for kanji. **Target English vocabulary and phrases being taught (e.g. `「『apple』を聞き取ろう」`, `「『Hello!』と言って」`) are explicitly encouraged and welcomed.** Co-teaching bilingual title annotations (e.g. `合言葉 (Keyword)`) are permitted for Homeroom Teacher clarity.
  - **English Mode (`EN`)**: 100% natural English text.
- **Language-Calibrated Typography**:
  - Because English sentence lengths are often longer than Japanese, calibrate font size ranges responsively according to active language (e.g., Japanese headlines `text-2xl sm:text-4xl xl:text-5xl` vs English `text-xl sm:text-3xl xl:text-4xl`), using `text-balance` to prevent orphan words.
- **Theme Color Strictness**:
  - Always use valid Tailwind classes (`dark:bg-slate-900` or `dark:bg-slate-950`). Never invent non-existent Tailwind colors (e.g., `slate-850`) which break dark mode contrast.
- **Classroom Keyboard Navigation**:
  - Instructions modals must bind global keyboard shortcuts when open:
    - `ArrowLeft` / `ArrowUp`: Previous slide
    - `ArrowRight` / `ArrowDown` / `Space` / `Enter`: Next slide (or launch game on final slide)
    - `1` through `N`: Jump directly to step N
    - `Escape`: Close modal

## 12. Development Workflow, Batch Deployments & Quota Invariants
- **Local-First Development (Vite HMR)**: Default to local iterative development. Edits must be verified via the local Vite dev server (`npm run dev`), taking advantage of Hot Module Replacement (<50ms) in a single tool step. Never run `npm run build` or `firebase deploy` on individual minor edits.
- **Batch Deployments**: Only trigger full production builds (`npm run build`) and Firebase deployments (`firebase deploy`) in batches—either when multiple features are verified locally, when explicitly requested by the user, or when concluding a completed feature milestone.
- **Selective File Ingestion (Monolith Protection)**: Never view or read massive monolithic files (e.g. `arcade.html` at 277 KB / 5,000 lines) in their entirety into context. Always use targeted line ranges or specific regex/grep searches to extract only the needed function or component.
- **Direct Edits for Minor Tweaks**: For straightforward visual tweaks, CSS adjustments, typo fixes, or simple prop changes, execute the change directly in 1 step without entering Planning Mode or generating formal implementation plans.
- **Human Verification Over Subagents**: For routine UI checks, prioritize having the user verify the change locally on `localhost:5173` in seconds rather than spawning heavy autonomous browser subagents that burn background quota.
- **Quiet Terminal Execution**: Keep command execution concise (use quiet flags, error-only logs, and avoid verbose file dumps) to prevent bloated stdout from inflating future prompt context.
- **Holistic Visual & Geometric Auditing**: When diagnosing or refining visual, 3D, or geometry issues across a set of components (e.g. polyhedral dice shapes, flashcard types, or game token sets), NEVER iterate on them one by one across separate turns. Always audit and normalize the entire set simultaneously in a single turn using unified mathematical projection or shared configuration schemas.
- **Milestone-Driven Sessions**: Conclude chat sessions and start a fresh conversation whenever a major feature milestone is completed and deployed live. This resets context overhead from 100k+ tokens back to ~2k tokens with zero loss of project invariants.

## 13. Specialized Domain & Component Guidelines
- **Roster & Attendance Grids**:
  - The 1–35 attendance grid (e.g. on `StudentDeviceLinker`) uses a 6-column landscape layout (`grid-cols-6`) forming 6 rows (`1–6` through `31–35`) to match landscape kickstand folios, match the 6-column class selector grid, and provide maximum width for student nicknames without truncation.
  - Student nickname inputs enforce a clean 10-character maximum (`maxLength={10}`).
  - Buttons use a two-tiered layout with the attendance number flanked by the lock and avatar on the top row, and a full-width dedicated bottom row for the student's nickname.
  - Never constrain attendance numbers inside cramped inner scroll boxes. All numbers must be visible at a single glance with generous tap targets (`h-15 sm:h-16`) for iPad fingers.
  - Class URL query params (`?class=6-4`, `?c=6-4`) must normalize Japanese notation (`6年4組`), compact digits (`64`), and automatically detect active school presets.
- **3D WebGL & Canvas Assets**:
  - Derive face coordinate systems deterministically: calculate the face normal, compute tangent vector via cross product (`tangent = up × normal`), and bitangent (`bitangent = normal × tangent`). Project face vertices onto the 2D tangent plane for UV mapping.
  - Scale text and numerals on 3D face canvas textures dynamically based on inscribed radius or bounding area.
  - When rendering bevel wireframes or borders, use `THREE.EdgesGeometry` with an explicit threshold angle (15°–25°) for clean seams.

## 14. Elementary Classroom 3D WebGL Performance Budget & Invariants
- **Target Hardware Profiles**:
  - **Tier 1 (Front TV / Teacher Stand)**: Japanese School Dynabook laptops (Intel Core i3/i5 / Celeron, Intel UHD 620 / Iris Xe integrated graphics, 8GB RAM, 1080p @ 150% Windows DPI scaling).
  - **Tier 2 (Student Desks)**: 40 simultaneous student iPads (iPad 9th/10th Gen, A13/A14 Bionic, Safari/WebKit, Retina 2.0x DPI).
  - **Tier 3 (Teacher Workstation)**: High-spec dedicated desktop/laptop (Nvidia GeForce, AMD Radeon, Apple Silicon M-series).
- **Universal Setup Factory**:
  - Always standardize Three.js scene creation using `createClassroomRenderer` from `@/utils/classroom3d`. It automatically detects GPU vendor, iPad touch profiles, and memory limits, applying the exact right shadow, resolution, and power settings in <1ms.
- **The Shadow Invariant**:
  - **Never render dynamic shadow passes on Student iPads or Integrated Intel GPUs**: On Tier 1 and Tier 2, `renderer.shadowMap.enabled = false`.
  - **Pre-Baked Contact Quads**: Moving characters, karts, projectiles, and basket poles MUST use pre-baked circular shadow textures (`createContactShadowMesh` / `getSharedContactShadowTexture` / `_sharedShadowTex`) pinned beneath their base.
  - **Desktop Dedicated GPUs Only**: If dynamic shadows are enabled on high-end PCs, `shadow.mapSize` must be capped at `1024×1024` (never 2048), `renderer.shadowMap.type = THREE.PCFShadowMap` (never deprecated PCFSoftShadowMap), and cast shadows restricted to static landmarks.
- **The Pixel Ratio / Fillrate Cap**:
  - **Never blindly pass `window.devicePixelRatio`**: At 150% Windows scaling (Dynabook) or 2.0x Retina (iPad), rendering full resolution multiplies pixel shading by 2.25x to 4x.
  - Hard-cap pixel ratio: `renderer.setPixelRatio(isLowPower ? 1.0 : Math.min(window.devicePixelRatio, 1.25))`.
  - Implement Adaptive Dynamic Resolution Scaling (DRS): if frame times exceed 19.5ms (< 51 FPS) for > 2 seconds, step resolution down to `0.75x`.
- **Procedural Canvas Texture Limits**:
  - Never run CPU per-pixel loops (`getImageData` / `putImageData`) over canvases larger than `256×256` during component mounting.
  - For fine grain (like schoolyard sand, turf, or track lines), generate a `256×256` tileable canvas texture and set `texture.repeat.set(N, N)` with `THREE.RepeatWrapping`.
- **Mesh Pooling & Draw Call Budget**:
  - Total scene draw calls must remain under **60 calls**.
  - Any dynamic elements (flying bean bags, coins, sparks, dirt puffs) MUST use pre-allocated object pools (e.g. max 36 meshes with toggled `visible = false`), never instantiated on the fly inside event callbacks.
  - Avoid injecting custom GLSL `#include <opaque_fragment>` shaders with expensive math (`pow()`) on dozens of distinct materials.
- **Modern Three.js Standards**:
  - Always use `performance.now()` delta timing (never deprecated `THREE.Clock`).
  - Always use `THREE.PCFShadowMap` (never deprecated `THREE.PCFSoftShadowMap`).

## 15. Cross-Device Git Sync & Remote Cloud VM Deployment Invariants
- **Single Source of Truth (`origin/main`)**:
  - Development alternates between **Local Antigravity (Personal Laptop)** (which has local gitignored textbook media directories `manabi_assets/`, `letstry1/`, `letstry2/`, `sound_suite/`, `trimmed_assets/`, and `new_assets/`) and **Remote Antigravity Cloud VMs (Work Laptop)** (where local terminal commands are restricted by Group Policy).
  - **Session Start Sync**: At the start of any coding session (both Local and Remote), always run `git fetch origin main && git status -sb` (and `git pull --rebase origin main` if behind) before modifying files so both machines stay 100% synchronized.
  - **Session / Milestone Push**: Whenever a feature milestone or bugfix batch is completed, commit and `git push origin main` so work is never stranded on a single device.
- **Media-Preserving Firebase Deployments from Remote Cloud VMs (`npm run deploy:remote`)**:
  - Never run a standard `firebase deploy` from a bare git clone that lacks `manabi_assets/` and `letstry1/`/`2`, as that would overwrite `dist/` without the textbook `/cards/**` and `/media/**` files.
  - In Remote Antigravity VMs (or CI/CD), always deploy using `npm run deploy:remote` (`node scripts/deploy_remote_preserving_media.mjs`), which queries the live Firebase Hosting release manifest, carries forward all ~10,000 `/cards/**` and `/media/**` SHA-256 hashes on Google's servers, and uploads only the newly compiled `dist/` files.
  - If the user attaches a `*firebase-adminsdk*.json` service account key in a Remote Antigravity session, `scripts/deploy_remote_preserving_media.mjs` automatically persists it to `~/.gemini/firebase-service-account.json` (which persists across all future remote conversations) and deletes the temporary copy from `/home/antigravity/upload/`.
