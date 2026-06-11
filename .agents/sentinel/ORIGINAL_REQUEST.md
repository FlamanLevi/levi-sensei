# Original User Request

## Initial Request — 2026-06-12T06:18:18+09:00

# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Craft prompt → get user approval → delegate to teamwork_preview

A simulated load test of the Levi-Sensei V1.5 quiz game using 4 concurrent simulated players to answer 5 questions and verify the stability of the new Firebase Cloud Functions.

Working directory: c:/Users/levif/Documents/Borderlink/Github/levi-sensei
Integrity mode: development

## Requirements

### R1. 4-Player Simulation (Database Spoofer)
Write a Node.js script (e.g. `loadTest.js`) that uses the Firebase Admin SDK or Firebase JS SDK to connect directly to the Realtime Database and simulate 4 unique players joining the lobby of a live Room PIN.

### R2. Automated Answer Submission
The script should listen to the `trivia/gameState/status`. As soon as a question goes "LIVE", all 4 simulated players must immediately write an answer (with a `timeTaken` value) to `trivia/responses/{playerId}`. They must do this for 5 consecutive questions.

## Acceptance Criteria

### Execution
- [ ] 4 simulated players successfully appear in the database lobby.
- [ ] All 4 players successfully write answers for 5 consecutive questions.
- [ ] The game cleanly progresses to the `GAME_OVER` phase.
- [ ] The `onGameComplete` Cloud Function successfully triggers at the end of the game and issues rewards without errors.

## Follow-up � 2026-06-11T21:19:54Z

The user has started the game and provided the Room PIN for the load test. The Room PIN is: 6939. Use this in your script when running the load test.
