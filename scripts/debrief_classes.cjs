#!/usr/bin/env node
const { initializeApp } = require('firebase/app');
const { getAuth, signInAnonymously } = require('firebase/auth');
const { getDatabase, ref, get } = require('firebase/database');
const fs = require('fs');
const path = require('path');

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

async function run() {
  await signInAnonymously(auth);

  console.log('====================================================');
  console.log('📊 LEVI-SENSEI POST-CLASS MULTIPLAYER DEBRIEF REPORT');
  console.log('====================================================\n');

  // 1. Analyze Auth Accounts
  const authPath = "C:\\Users\\levif\\.gemini\\antigravity\\brain\\c7a99726-1531-46d9-b181-50969734d9b4\\scratch\\auth_users.json";
  if (fs.existsSync(authPath)) {
    const authData = JSON.parse(fs.readFileSync(authPath, 'utf8'));
    const users = authData.users || [];
    console.log(`🔑 Total Firebase Auth Accounts: ${users.length}`);

    // Filter by creation / last login timestamp
    // 2026-09-25 midnight JST is 2026-09-24T15:00:00Z (timestamp: 1790262000000)
    const todayStartMs = new Date('2026-09-25T00:00:00+09:00').getTime();
    const todayUsers = users.filter(u => {
      const created = parseInt(u.createdAt, 10);
      const lastLogin = parseInt(u.lastLoginAt || u.lastSignedInAt || 0, 10);
      return created >= todayStartMs || lastLogin >= todayStartMs;
    });

    console.log(`📅 Active Accounts Today (2026-09-25 JST): ${todayUsers.length}`);

    // Hourly breakdown
    const hourly = {};
    todayUsers.forEach(u => {
      const ts = parseInt(u.lastLoginAt || u.createdAt, 10);
      const d = new Date(ts);
      const hourJst = d.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo', hour: '2-digit', hour12: false });
      hourly[hourJst] = (hourly[hourJst] || 0) + 1;
    });
    console.log('🕒 Hourly Active Users Breakdown (JST):', hourly);
    console.log('');
  }

  // 2. Analyze RTDB Rosters across 6-1, 6-2, 6-3, 6-4
  console.log('👥 CLASS ROSTERS & ATTENDANCE BREAKDOWN:');
  const classes = ['6-1', '6-2', '6-3', '6-4'];
  let totalRegisteredAllClasses = 0;

  for (const c of classes) {
    const snap = await get(ref(rtdb, `schools/futakotamagawa/classes/${c}/students`));
    if (snap.exists()) {
      const val = snap.val();
      const entries = Object.entries(val);
      totalRegisteredAllClasses += entries.length;
      console.log(`\n🏫 Class ${c} (${entries.length} / 35 Students Registered):`);

      // Sort by attendance number
      entries.sort((a, b) => parseInt(a[0], 10) - parseInt(b[0], 10));

      const registeredNumbers = [];
      const missingNumbers = [];
      for (let i = 1; i <= 35; i++) {
        if (val[String(i)]) {
          registeredNumbers.push(i);
        } else {
          missingNumbers.push(i);
        }
      }

      console.log(`   ✅ Present / Linked [${registeredNumbers.length}]: ${registeredNumbers.join(', ')}`);
      if (missingNumbers.length > 0) {
        console.log(`   ⬜ Unlinked / Absent [${missingNumbers.length}]: ${missingNumbers.join(', ')}`);
      }

      // Check if attendance 0 (tester/teacher) was used
      if (val['0']) {
        console.log(`   ⚠️ Attendance #0 (Teacher/Tester) registered:`, val['0']);
      }

      // Print student nicknames & device timestamps
      console.log('   Student Details:');
      entries.forEach(([num, s]) => {
        const lastSeenStr = s.updatedAt || s.lastSeenAt || s.registeredAt || s.createdAt
          ? new Date(s.updatedAt || s.lastSeenAt || s.registeredAt || s.createdAt).toLocaleTimeString('ja-JP', { timeZone: 'Asia/Tokyo' })
          : 'unknown';
        console.log(`     #${num.padStart(2, ' ')}: "${s.nickname || 'Unnamed'}" (Device: ${s.deviceId ? s.deviceId.substring(0, 10) + '...' : 'none'}, Last: ${lastSeenStr})`);
      });
    } else {
      console.log(`\n🏫 Class ${c}: 0 registered`);
    }
  }

  console.log(`\n🌟 Total Registered Grade 6 Students Across All Classes: ${totalRegisteredAllClasses}`);

  // 3. Analyze RTDB Game Rooms
  console.log('\n🕹️ GAME ROOMS IN REALTIME DATABASE:');
  const roomsSnap = await get(ref(rtdb, 'rooms'));
  if (roomsSnap.exists()) {
    const roomsVal = roomsSnap.val();
    const roomEntries = Object.entries(roomsVal);
    console.log(`Found ${roomEntries.length} room(s) in RTDB:`);

    roomEntries.forEach(([code, r]) => {
      const createdAtStr = r.createdAt ? new Date(r.createdAt).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }) : 'unknown';
      const playerCount = r.players ? Object.keys(r.players).length : 0;
      console.log(`\n  Room [${code}] (${r.status || 'unknown state'}):`);
      console.log(`    School: ${r.schoolId || 'none'} | Class: ${r.classId || 'none'} | Created: ${createdAtStr}`);
      console.log(`    Mode: ${r.mode || 'standard'} | Delivery: ${r.deliveryStream || 'unknown'} | PlayType: ${r.gamePlayType || 'CLASSIC_ARENA'}`);
      console.log(`    Questions: ${r.totalQuestions || (r.questions ? r.questions.length : 0)} | Question Index: ${r.currentQuestionIndex}`);
      console.log(`    Connected Players: ${playerCount}`);

      if (r.teamScores) {
        console.log(`    Team Scores:`, r.teamScores);
      }

      if (r.players) {
        const topPlayers = Object.values(r.players)
          .sort((a, b) => (b.score || 0) - (a.score || 0))
          .slice(0, 5);
        console.log(`    Top 5 Players:`, topPlayers.map(p => `${p.nickname || p.id} (#${p.attendanceNumber}): ${p.score || 0} pts`));
      }
    });
  } else {
    console.log('No active or cached rooms found under /rooms.');
  }

  process.exit(0);
}

run().catch(err => {
  console.error('Error running debrief script:', err);
  process.exit(1);
});
