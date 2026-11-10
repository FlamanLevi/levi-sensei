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

async function compileAllToday() {
  await signInAnonymously(auth);

  console.log('========================================================================================');
  console.log('📊 COMPILING FULL END-OF-DAY ANALYTICS ACROSS ALL GRADE 6 CLASSES (2026-10-23)');
  console.log('========================================================================================\n');

  const classes = ['6-4', '6-2', '6-3', '6-1'];
  const allSessionsToday = [];
  const classSummaries = {};

  // Midnight JST today: 2026-10-23T00:00:00+09:00
  const todayStartMs = new Date('2026-10-23T00:00:00+09:00').getTime();

  for (const c of classes) {
    console.log(`--- Querying Class ${c} ---`);
    const sessionsSnap = await get(ref(rtdb, `schools/futakotamagawa/classes/${c}/sessions`));
    const cSessions = [];
    if (sessionsSnap.exists()) {
      const sessVal = sessionsSnap.val();
      for (const [sId, s] of Object.entries(sessVal)) {
        const ts = s.timestamp || s.createdAt || 0;
        if (ts >= todayStartMs) {
          cSessions.push({ id: sId, classId: c, ...s });
          allSessionsToday.push({ id: sId, classId: c, ...s });
        }
      }
    }
    cSessions.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

    // Students
    const studentsSnap = await get(ref(rtdb, `schools/futakotamagawa/classes/${c}/students`));
    let studentCount = 0;
    let activeTodayCount = 0;
    let totalCorrectAnswers = 0;
    let totalAllAnswers = 0;
    const studentList = [];

    if (studentsSnap.exists()) {
      const sVal = studentsSnap.val();
      const entries = Object.entries(sVal);
      studentCount = entries.length;

      entries.forEach(([seat, st]) => {
        const stats = st.stats || {};
        totalCorrectAnswers += stats.correctAnswers || 0;
        totalAllAnswers += stats.totalAnswers || 0;

        let activeToday = false;
        const rewards = st.rewardedSessions || {};
        for (const [rKey, rTs] of Object.entries(rewards)) {
          if (rTs >= todayStartMs) {
            activeToday = true;
            break;
          }
        }
        if (activeToday || (st.lastPlayedAt && st.lastPlayedAt >= todayStartMs)) {
          activeTodayCount++;
        }
        studentList.push({ seat, ...st });
      });
    }

    classSummaries[c] = {
      sessions: cSessions,
      studentCount,
      activeTodayCount,
      totalCorrectAnswers,
      totalAllAnswers,
      accuracy: totalAllAnswers > 0 ? ((totalCorrectAnswers / totalAllAnswers) * 100).toFixed(1) : '0.0',
      studentList
    };

    console.log(`  Class ${c}: ${cSessions.length} sessions today, ${activeTodayCount}/${studentCount} active students.`);
  }

  // Sort all sessions chronologically
  allSessionsToday.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

  console.log(`\n========================================================================================`);
  console.log(`🗓️ TOTAL SESSIONS TODAY ACROSS ALL CLASSES: ${allSessionsToday.length}`);
  console.log(`========================================================================================`);

  allSessionsToday.forEach((s, idx) => {
    const timeStr = s.timestamp ? new Date(s.timestamp).toLocaleTimeString('ja-JP', { timeZone: 'Asia/Tokyo' }) : 'N/A';
    console.log(`${idx + 1}. Class ${s.classId} | Room [${s.roomCode}] | ${s.gamePlayType || s.gameMode} at ${timeStr}`);
    console.log(`   Duration: ${s.durationSeconds || 'N/A'}s | Acc: ${s.overallAccuracy}% | Active: ${s.activeParticipants} | Touches: ${s.totalClassTouches} | PitStops: ${s.totalPitStops || 0}`);
  });

  // Save compiled data for HTML/PDF report generator
  const outPath = path.resolve(__dirname, '..', 'reports', 'compiled_today_analytics.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify({
    date: '2026-10-23',
    generatedAt: Date.now(),
    totalSessions: allSessionsToday.length,
    allSessions: allSessionsToday,
    classSummaries
  }, null, 2), 'utf8');

  console.log(`\nSaved compiled analytics data to: ${outPath}`);
  process.exit(0);
}

compileAllToday().catch(err => {
  console.error(err);
  process.exit(1);
});
