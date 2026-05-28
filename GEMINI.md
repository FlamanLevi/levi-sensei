# Project Context & AI Guidelines

## Project Overview
**Name:** Borderlink ESL Game Hub  
**Target Audience:** Japanese ESL students (Grades 3-6).  
**Deployment:** GitHub Pages (Static Site).  
**Primary Device:** iPads (Safari).  

## Tech Stack
*   **Framework:** React (via Vite)
*   **Styling:** Tailwind CSS (with some custom CSS properties in `index.css` for theme colors and patterns).
*   **Routing:** React Router (Hash Router required for GitHub Pages) - *To be implemented*.
*   **State Management:** React `useState` and `useEffect`.

## Current Progress
1.  **Foundation:** Initialized Vite + React + Tailwind project.
2.  **Home Screen:** Converted legacy Vanilla HTML/JS index page into a modern React Single Page Application (`App.jsx`). 
3.  **UI State:** Fully implemented Language (EN/JA), Theme (Light/Dark), Color Scheme, and Pattern toggles using React State linked to CSS custom properties on the `:root` element.

## Crucial AI Guidelines & Architecture Rules

### 1. Styling & Layouts
*   **Use Tailwind CSS exclusively** for layouts, spacing, sizing, and typography. Avoid writing custom CSS in separate files unless absolutely necessary for complex animations or global theme variables.
*   **Avoid standard `overflow: hidden` on the body.** To solve previous bugs, components like Leaderboards must be structurally designed to scroll correctly. Use `h-screen` or `h-[100dvh]` on outer wrappers and `overflow-y-auto` on the inner content lists to ensure scrolling works perfectly on iPads without breaking the fixed headers.
*   **iPad First:** All buttons and interactive elements must be large enough for child fingers. Hover states are fine for desktop, but always ensure `active:` states are clearly visible for iPad taps (e.g., `active:scale-95`).

### 2. State & DOM Manipulation
*   **Never manipulate the DOM directly** (e.g., `document.getElementById`). Always use React state and declarative rendering.

### 3. File Structure & Routing
*   This is a Single Page Application (SPA). We do not use separate `.html` files for different games.
*   Because this will be hosted on GitHub Pages, we must use `HashRouter` instead of `BrowserRouter` when we implement routing, otherwise hard refreshes will result in 404 errors.

### 4. Language & Localization
*   All strings must support English and Japanese. Use the `t(en, ja)` pattern or a robust context provider for text rendering based on the global language state.

## Recent Updates (Kahoot-style Quiz Game & Firebase)
*   **Realtime Backend:** Integrated Firebase Realtime Database for live game state synchronization. Created `useGameState` hook to manage subscriptions to `trivia/room`, `trivia/gameState`, `trivia/players`, and `trivia/teamScores`.
*   **Quiz Architecture:** Implemented Host/Teacher views (`QuizHostSetup`, `QuizHostLive`) for orchestration and Student views (`QuizStudentJoin`, `QuizStudentLive`) for participation via PIN.
*   **Routing & Access:** Added hidden double-tap access mechanism (5 taps in 2.5s) to the header title to access the `/admin` Teacher Portal. Wired up various Hubs (`GameCategoryHub`, `TabletGamesHub`, `ClassroomGamesHub`) in `App.jsx` router.
*   **Vocabulary & Flashcards:** Automated tagging of `vocabulary.json` with `part_of_speech`, categorical `tags`, and `audio_lang`. Added color-coded bars to flashcards. Created `ToolsHub.jsx` and updated pattern personalization.

## Next Up
*   Refine the live quiz gameplay loop, incorporating score calculation, timing, and integration with the newly structured tagging system for dynamic question generation.
