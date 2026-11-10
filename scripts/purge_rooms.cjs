#!/usr/bin/env node
/**
 * Room Purge Utility for Levi-Sensei English Platform
 * 
 * Quickly deletes stale or active game rooms from Firebase Realtime Database
 * using authenticated Firebase SDK.
 * 
 * Usage:
 *   npm run purge-rooms         # Purges all active rooms
 *   npm run purge-rooms 6222    # Purges only room 6222
 *   npm run purge-rooms --list  # Lists active rooms without deleting
 */

const { initializeApp } = require('firebase/app');
const { getAuth, signInAnonymously } = require('firebase/auth');
const { getDatabase, ref, get, remove, update } = require('firebase/database');
const fs = require('fs');
const path = require('path');

// Read Firebase Config
let apiKey = 'AIzaSyC7lrhVICmKOL3EhVkiaTkpEE1_VUDPS7k';
let databaseURL = 'https://levi-sensei-default-rtdb.asia-southeast1.firebasedatabase.app';
let projectId = 'levi-sensei';

try {
  const envPath = path.resolve(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const dbMatch = envContent.match(/VITE_FIREBASE_DATABASE_URL=(.+)/);
    if (dbMatch && dbMatch[1]) databaseURL = dbMatch[1].trim().replace(/^["']|["']$/g, '');
    const keyMatch = envContent.match(/VITE_FIREBASE_API_KEY=(.+)/);
    if (keyMatch && keyMatch[1]) apiKey = keyMatch[1].trim().replace(/^["']|["']$/g, '');
  }
} catch (e) {}

const app = initializeApp({ apiKey, databaseURL, projectId });
const auth = getAuth(app);
const rtdb = getDatabase(app);

const args = process.argv.slice(2);
const isListOnly = args.includes('--list');
const specificPin = args.find(arg => /^\d{4}$/.test(arg));

async function run() {
  const startTime = Date.now();
  console.log(`\x1b[36m⚡ Connecting to Firebase RTDB via Auth:\x1b[0m ${databaseURL}`);
  await signInAnonymously(auth);

  if (specificPin) {
    console.log(`\x1b[33m🎯 Targeting room [${specificPin}]...\x1b[0m`);
    const snap = await get(ref(rtdb, `rooms/${specificPin}`));
    if (!snap.exists()) {
      console.log(`\x1b[31m✕ Room [${specificPin}] does not exist in Firebase RTDB.\x1b[0m`);
      process.exit(0);
    }

    if (isListOnly) {
      console.log(`Room [${specificPin}] details:`, snap.val());
      process.exit(0);
    }

    await Promise.all([
      remove(ref(rtdb, `rooms/${specificPin}`)),
      remove(ref(rtdb, `roomPlayers/${specificPin}`)),
      remove(ref(rtdb, `roomResponses/${specificPin}`)),
      remove(ref(rtdb, `hostSessions/${specificPin}`))
    ]);
    const elapsed = Date.now() - startTime;
    console.log(`\x1b[32m✓ Successfully purged room [${specificPin}] and spoke nodes in ${elapsed}ms!\x1b[0m`);
    process.exit(0);
  }

  // Inspect all rooms
  const snap = await get(ref(rtdb, 'rooms'));
  if (!snap.exists()) {
    console.log(`\x1b[32m✨ No active rooms found in Firebase RTDB. Database is already clean!\x1b[0m`);
    process.exit(0);
  }

  const rooms = snap.val() || {};
  const roomKeys = Object.keys(rooms);
  if (roomKeys.length === 0) {
    console.log(`\x1b[32m✨ No active rooms found in Firebase RTDB. Database is already clean!\x1b[0m`);
    process.exit(0);
  }

  console.log(`\x1b[33mFound ${roomKeys.length} active room(s) in Firebase RTDB:\x1b[0m`);
  roomKeys.forEach(pin => {
    const r = rooms[pin] || {};
    const playersCount = r.players ? Object.keys(r.players).length : 0;
    const grade = r.grade || 'N/A';
    const status = r.status || 'UNKNOWN';
    const gameType = r.gamePlayType || r.mode || 'QUIZ';
    console.log(`  • Room [\x1b[1m\x1b[37m${pin}\x1b[0m] | Grade: ${grade} | Mode: ${gameType} | Status: \x1b[35m${status}\x1b[0m | Players: ${playersCount}`);
  });

  if (isListOnly) {
    console.log(`\n\x1b[36m(List-only mode: no rooms deleted. Run without --list to purge.)\x1b[0m`);
    process.exit(0);
  }

  console.log(`\n\x1b[31mPurging all ${roomKeys.length} rooms and spoke nodes...\x1b[0m`);
  
  await Promise.all(
    roomKeys.map(pin =>
      Promise.all([
        remove(ref(rtdb, `rooms/${pin}`)),
        remove(ref(rtdb, `roomPlayers/${pin}`)),
        remove(ref(rtdb, `roomResponses/${pin}`)),
        remove(ref(rtdb, `hostSessions/${pin}`))
      ])
    )
  );

  const elapsed = Date.now() - startTime;
  console.log(`\x1b[32m🔥 Successfully purged ${roomKeys.length} active room(s) and spoke nodes in ${elapsed}ms! Database is clean.\x1b[0m`);
  process.exit(0);
}

run().catch(err => {
  console.error('\x1b[31m✕ Error during room purge:\x1b[0m', err);
  process.exit(1);
});
