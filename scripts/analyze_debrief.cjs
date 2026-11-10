const fs = require('fs');
const path = require('path');

const scratchDir = "C:\\Users\\levif\\.gemini\\antigravity\\brain\\c7a99726-1531-46d9-b181-50969734d9b4\\scratch";

// 1. Read rooms
const roomFiles = ['room_2760.json', 'room_3003.json', 'room_6132.json'];
console.log('--- ROOM ANALYSIS ---');
roomFiles.forEach(rf => {
  const p = path.join(scratchDir, rf);
  if (fs.existsSync(p)) {
    const r = JSON.parse(fs.readFileSync(p, 'utf8'));
    console.log(`\nROOM FILE: ${rf}`);
    console.log(`Room Code: ${r.code || rf.replace(/\D/g, '')}`);
    console.log(`Status: ${r.status}`);
    console.log(`Class: ${r.classId}, School: ${r.schoolId}`);
    console.log(`Created: ${new Date(r.createdAt).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`);
    console.log(`Delivery: ${r.deliveryStream}, Mode: ${r.mode}, GamePlayType: ${r.gamePlayType}`);
    console.log(`Current Question Index: ${r.currentQuestionIndex}`);
    if (r.questions) {
      console.log(`Questions Count: ${r.questions.length}`);
      console.log('Question Words:', r.questions.map(q => q.targetWordEnglish).join(', '));
    }
    const players = r.players || {};
    const playerList = Object.values(players);
    console.log(`Connected Players (${playerList.length}):`);
    playerList.sort((a, b) => (b.score || 0) - (a.score || 0));
    playerList.forEach((pl, idx) => {
      console.log(`  ${idx + 1}. #${pl.attendanceNumber} "${pl.nickname || 'Unknown'}" - Score: ${pl.score || 0} pts, Streak: ${pl.currentStreak || 0} (Max: ${pl.maxStreak || 0}), Correct: ${pl.correctCount || 0}/${pl.totalAnswered || 0}`);
    });
    if (r.teamScores) {
      console.log('Team Scores:', r.teamScores);
    }
    if (r.boundStudents) {
      console.log('Bound Students count:', Object.keys(r.boundStudents).length);
    }
  }
});

// 2. Read Analytics
console.log('\n--- ANALYTICS ---');
const analyticsPath = path.join(scratchDir, 'analytics.json');
if (fs.existsSync(analyticsPath)) {
  const an = JSON.parse(fs.readFileSync(analyticsPath, 'utf8'));
  console.log('Analytics keys:', Object.keys(an));
  if (an.gameSessions) {
    const sessions = Object.values(an.gameSessions);
    console.log(`Total Logged Game Sessions: ${sessions.length}`);
    sessions.forEach(s => {
      console.log(`Session: ${s.classId || s.roomId} | Mode: ${s.mode || s.gameType} | Time: ${new Date(s.timestamp || s.createdAt).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })} | Players: ${s.playerCount || (s.players ? Object.keys(s.players).length : 'N/A')}`);
    });
  }
  if (an.troubleWords) {
    console.log('Trouble Words:', an.troubleWords);
  }
}

// 3. Read All Classes
console.log('\n--- CLASSES & STUDENTS SUMMARY ---');
const classesPath = path.join(scratchDir, 'all_classes.json');
if (fs.existsSync(classesPath)) {
  const classesData = JSON.parse(fs.readFileSync(classesPath, 'utf8'));
  Object.entries(classesData).forEach(([cls, cData]) => {
    const students = cData.students || {};
    const count = Object.keys(students).length;
    console.log(`\nClass ${cls}: ${count} students registered`);
    const studentArr = Object.entries(students).map(([num, s]) => ({ num: parseInt(num, 10), ...s }));
    studentArr.sort((a, b) => a.num - b.num);
    const xpTotal = studentArr.reduce((sum, s) => sum + (s.xp || 0), 0);
    console.log(`  Total XP Accumulated: ${xpTotal}`);
    const withXp = studentArr.filter(s => (s.xp || 0) > 0);
    if (withXp.length > 0) {
      console.log(`  Students with XP (${withXp.length}):`, withXp.map(s => `#${s.num} ${s.nickname}: ${s.xp}xp`).join(', '));
    }
  });
}
