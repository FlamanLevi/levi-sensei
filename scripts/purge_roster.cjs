#!/usr/bin/env node
/**
 * Roster Purge Utility for Levi-Sensei English Platform
 * 
 * Quickly inspects or clears registered student numbers from Firebase Realtime Database.
 * 
 * Usage:
 *   node scripts/purge_roster.cjs --list
 *   node scripts/purge_roster.cjs futakotamagawa 6-4
 *   node scripts/purge_roster.cjs futakotamagawa 6-4 7   # Release only student #7
 */

const { initializeApp } = require('firebase/app');
const { getAuth, signInAnonymously } = require('firebase/auth');
const { getDatabase, ref, get, remove } = require('firebase/database');
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
const isList = args.includes('--list');
const schoolArg = args[0] && !args[0].startsWith('--') ? args[0] : 'futakotamagawa';
const classArg = args[1] && !args[1].startsWith('--') ? args[1] : null;
const numArg = args[2] && !args[2].startsWith('--') ? args[2] : null;

async function run() {
  await signInAnonymously(auth);
  
  if (isList || !classArg) {
    console.log('📋 Checking registered rosters across Futakotamagawa Grade 6:');
    for (const c of ['6-1', '6-2', '6-3', '6-4']) {
      const snap = await get(ref(rtdb, `schools/futakotamagawa/classes/${c}/students`));
      if (snap.exists()) {
        const val = snap.val();
        const students = Object.entries(val).map(([num, s]) => `#${num} (${s.nickname || 'Unnamed'})`).join(', ');
        console.log(`  [${c}]: ${Object.keys(val).length} registered -> ${students}`);
      } else {
        console.log(`  [${c}]: 0 registered (clean)`);
      }
    }
    process.exit(0);
  }

  if (numArg) {
    const targetPath = `schools/${schoolArg}/classes/${classArg}/students/${numArg}`;
    await remove(ref(rtdb, targetPath));
    console.log(`✅ Cleared attendance #${numArg} in ${schoolArg} ${classArg}`);
  } else {
    const targetPath = `schools/${schoolArg}/classes/${classArg}/students`;
    await remove(ref(rtdb, targetPath));
    console.log(`✅ Cleared all students in ${schoolArg} ${classArg}`);
  }

  process.exit(0);
}

run().catch(err => {
  console.error('Error running purge_roster:', err);
  process.exit(1);
});
