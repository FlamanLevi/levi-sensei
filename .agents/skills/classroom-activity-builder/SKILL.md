---
name: classroom-activity-builder
description: >-
  Step-by-step guide for creating, registering, and testing interactive classroom games
  and activities for the Levi-Sensei English platform across Stream A (TV), Stream B (Multi-iPad),
  and Stream C (Solo Student).
---

# Classroom Activity Builder

Use this skill when implementing, refactoring, or registering an activity or mini-game for the Levi-Sensei English platform.

## Architecture: The 3 Delivery Streams
Every game module must specify which stream it primarily targets:
1. **Stream 🅰️ (Front TV / Projector)**:
   - Fullscreen 16:9 layout readable from 8 meters away (back row of 40-seat classroom).
   - Designed for whole-class choral chanting, timer countdowns, and physical team games.
   - Standardizes on `<CinemaStageLayout />`.
2. **Stream 🅱️ (Multiplayer iPad Lobby)**:
   - Synchronized classroom play via Firebase Realtime Database (RTDB).
   - Host screen displayed on Front TV; student iPads connect with 4-digit room PIN or auto-SSO.
   - Examples: Eigo Arena (Kahoot-style), 3D Volleyball Rally, Undokai Tug-of-War, F1 Sprint.
3. **Stream 🅲 (Solo Student Practice)**:
   - Self-paced practice on 1:1 iPads with instant audio feedback.
   - Designed for independent study, home review, or differentiated learning rotations.

---

## Procedure for Adding a New Game

### 1. Register Game Metadata in `src/games/registry.ts`
All activities must be registered in `src/games/registry.ts` matching the `GameDefinition` schema:

```typescript
export interface GameDefinition {
  id: string;               // snake_case unique ID (e.g. 'volleyball_rally', 'timebomb')
  title: string;            // English display title
  jaTitle: string;          // Natural Japanese display title
  description: string;      // English summary
  jaDescription: string;    // Japanese summary
  stream: 'STREAM_A' | 'STREAM_B' | 'STREAM_C';
  targetGrades: string[];   // e.g. ['ES_G3', 'ES_G4', 'ES_G5', 'ES_G6']
  skills: string[];         // Pedagogical goals, e.g. ['Speed Recall', 'Listening', 'Choral Speaking']
  icon: string;             // Lucide icon name, e.g. 'Trophy', 'Sparkles', 'Flame', 'EyeOff'
  color: string;            // Tailwind gradient, e.g. 'from-indigo-600 via-blue-600 to-amber-500'
  minPlayers: string;       // e.g. 'Whole Class / iPads' or 'Whole Class / Teams'
  status: 'ready' | 'in_development' | 'planned';
}
```

Add your entry to `GAME_REGISTRY` in `src/games/registry.ts`.

---

### 2. Implement the Game Component in `src/games/<game_id>/`
All games reside in `src/games/<game_id>/` (NEVER in `src/components/games/`):

1. **Folder & Entry Point**:
   - `src/games/<game_id>/<GameName>.tsx` (Root game container)
   - `src/games/<game_id>/<GameName>SettingsModal.tsx` (Secondary settings & tools)
   - `src/games/<game_id>/<GameName>InstructionsModal.tsx` (How-to-play tutorial)
2. **Layout Standard**:
   - For **Stream 🅰️ (Front TV)** activities: Standardize on `<CinemaStageLayout />` from `@/components/common/CinemaStageLayout`.
   - For **Stream 🅱️ (Multiplayer)** host screens: Use dedicated host layouts with high-visibility question prompts and stage backdrops.
3. **Data & Audio Integration**:
   - **Target Vocabulary**: Connect to `useVocabulary()` from `@/context/VocabularyContext` to automatically load filtered vocabulary cards for the active grade and unit.
   - **Sound Effects & Audio**: Use `soundEffects` from `@/services/soundEffects`. Always handle audio defensively:
     ```typescript
     audio.play().catch(() => { /* safely ignore iOS autoplay restrictions */ });
     ```
   - **Classroom State**: Consume `useClassroom()` for active theme, mute state, active school, and roster information.

---

### 3. Bilingual UX, Theme & Accessibility Guidelines

#### 3a. Centralized Language & Theme Integration
- Connect components to `useClassroom()` / `useLanguage()` so student and teacher preferences persist across views.
- Components can support local overrides (`isJa` / `textLang`) when an activity specifically warrants independent switching.
- Header control clusters must remain streamlined on compact viewports (`min-w-0 flex-1 truncate` for titles; `flex items-center gap-1.5 shrink-0 flex-nowrap` for controls) so titles are never crowded out.

#### 3b. MEXT Typography & Furigana Standards
- All user-facing Japanese text must adhere to the MEXT textbook font stack:
  ```css
  font-family: 'UD Digi Kyokasho NP-R', 'UD Digi Kyokasho NK-R', 'UD Digi Kyokasho N-R', 'BIZ UDPGothic', 'Zen Maru Gothic', sans-serif;
  ```
- Kanji in core instructions, titles, and cards must include MEXT-approved furigana using `<ruby>漢字<rt className="text-[7px] sm:text-[9px]">よみがな</rt></ruby>` or furigana helper components.
- Compact auxiliary pills, micro-badges (`h-5`), numbers, and target English words do NOT require ruby, preventing baseline and vertical alignment distortions.

#### 3c. Classroom Contrast & Touch Targets
- Support both Light and Dark themes (`dark:bg-slate-900`, `dark:bg-slate-950`).
- Touch targets on interactive elements must be at least `48px` (`h-12` or `h-13`) for comfortable tapping on classroom iPads.

---

### 4. Layout Architecture: CinemaStageLayout & Settings Modals

For all Stream 🅰️ (Front TV) activities:

#### 4a. Standard Screen Ratios (Landscape / TV)
- **20%–33% Left Tower / Teacher Stand**: Aligns with the teacher's physical standing position on the left side of the blackboard/TV.
- **66%–80% Main Cinema Stage**: Frameless, single-surface design with giant illustrations and adaptive typography readable from 8 meters away.
- **Responsive Portrait / Mobile Fallback**: On narrow or portrait viewports (e.g. iPad in portrait), the left sidebar must collapse gracefully into a sleek header drawer or bottom bar.
- Implementation pattern:
  ```tsx
  <CinemaStageLayout
    sidebarWidth="compact" // 'compact' (~220-260px) | 'standard' (~280-320px) | 'wide' (~360-440px)
    onExit={onExit}
    title={isJa ? 'アクティビティ名' : 'Activity Title'}
    badge={<span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-slate-950">STREAM A</span>}
    onOpenSettings={() => setIsSettingsOpen(true)}
    sidebar={sidebarContent}
    stageAction={stageActionBar} // Primary action button pinned at stage bottom
  >
    {stageContent}
  </CinemaStageLayout>
  ```

#### 4b. Settings Modal Convention
- **No Cluttered Sidebars**: Never stack dozens of secondary configuration buttons (timers, speeds, print tools, team scoreboards) directly in the sidebar.
- Delegate them to a sleek `<GameNameSettingsModal isOpen={isOpen} onClose={...} />` triggered by a ⚙️ button in the sidebar. This keeps the sidebar slim with zero internal vertical scrollbars.

---

### 5. Full-Screen Instructions Modal Convention (`<GameNameInstructionsModal />`)

Every game should provide a tutorial modal so teachers and students can review how to play before starting.

* **Canonical Reference Implementations**:
  * `src/games/timebomb/TimeBombInstructionsModal.tsx`
  * `src/games/keyword/KeywordInstructionsModal.tsx`

#### 5a. Standard Structure
1. **File Location**: `src/games/<game_id>/<GameName>InstructionsModal.tsx`
2. **Props**: `{ isOpen: boolean; onClose: () => void; }`
3. **Controls**:
   - Header: Fullscreen toggle (`Maximize2`/`Minimize2`), Language toggle (`日`/`EN`), Theme toggle (`Sun`/`Moon`), Close button (`X`).
   - Footer: Back button (`←`), numeric step pills (`1` to `N`), Next / Play button (`→` / `Play`).
4. **Data Schema (`TutorialSlide`)**:
   ```typescript
   interface TutorialSlide {
     step: number;
     theme: {
       border: string;       // e.g. 'border-amber-400 dark:border-amber-500'
       pillBg: string;       // e.g. 'bg-amber-500 text-slate-950'
       graphicBg: string;    // e.g. 'bg-amber-50 dark:bg-amber-950/40 border-amber-200'
       accentText: string;   // e.g. 'text-amber-600 dark:text-amber-400'
     };
     graphicIcons: React.ReactNode;
     badgeJa: string;
     badgeEn: string;
     titleJa: React.ReactNode;      // Japanese title with furigana
     titleEn: string;
     instructionJa: React.ReactNode;// Japanese instruction with furigana
     instructionEn: string;
     tipJa: React.ReactNode;        // Helpful classroom advice
     tipEn: string;
   }
   ```
5. **Modal Layout Dimensions**:
   - Modal container: `w-[98vw] max-w-[1800px] h-[95vh] max-h-[980px] bg-white dark:bg-slate-900 border-4 sm:border-6 border-amber-400 dark:border-amber-500 rounded-3xl shadow-2xl overflow-hidden`.
   - Card surface: `w-full h-full rounded-2xl sm:rounded-3xl border-4 ${currentSlide.theme.border} bg-white dark:bg-slate-900 p-3 sm:p-5 md:p-6 shadow-xl flex flex-col items-center justify-between text-center overflow-y-auto`.
   - Top illustration anchor: `w-auto min-w-[200px] max-w-fit px-8 sm:px-12 py-2 sm:py-3 rounded-2xl sm:rounded-3xl border-3 ${currentSlide.theme.border} ${currentSlide.theme.graphicBg}`.

#### 5b. Pedagogically Sound Bilingual Isolation
- **Japanese Mode (`日`)**: Natural Japanese phrasing with MEXT furigana for kanji. **Target English vocabulary and phrases being taught (e.g. `「『apple』を聞き取ろう」`, `「『Hello!』と言って」`) are explicitly encouraged.** Co-teaching bilingual title annotations (e.g. `合言葉 (Keyword)`) are welcomed for Homeroom Teacher clarity.
- **English Mode (`EN`)**: 100% natural English text.
- **Calibrated Typography**: Apply responsive font sizing conditioned on language (Japanese `text-2xl sm:text-4xl xl:text-5xl` vs English `text-xl sm:text-3xl xl:text-4xl`) with `text-balance` to prevent orphan words.

#### 5c. Global Keyboard Navigation
Instructions modals must bind keyboard shortcuts when open:
- `ArrowLeft` / `ArrowUp`: Previous slide
- `ArrowRight` / `ArrowDown` / `Space` / `Enter`: Next slide (or launch game on final slide)
- `1` through `N`: Jump directly to slide N
- `Escape`: Close modal
