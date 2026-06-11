# Project: Levi-Sensei Load Test

## Architecture
- Firebase Realtime Database for game lobby and questions
- Firebase Cloud Functions for `onGameComplete` rewards

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Analyze Schema | Analyze DB structure for Room PIN, joining lobby, and answering questions | none | PLANNED |
| 2 | Create `loadTest.js` | Write a Node.js script using Firebase Admin SDK to simulate 4 players joining and answering 5 questions | M1 | PLANNED |
| 3 | Execute & Verify | Run `loadTest.js`, ensure players join, answer, game over, and `onGameComplete` triggers without errors | M2 | PLANNED |

## Interface Contracts
- `loadTest.js` connects to Realtime DB, creating players under lobby and responses under `trivia/responses/{playerId}`.
