import { 
  SessionAnalytics, 
  ItemDiagnostic, 
  DistractorStats, 
  LatencyQuadrants, 
  LapBucket, 
  QuietAchiever, 
  SupportNeedStudent, 
  WarmUpRecommendation, 
  ClassAnalyticsSummary,
  ErrorTypology 
} from '@/types/analytics';
import { QuizRoomState, QuizQuestion, QuizPlayer } from '@/games/quiz/types';
import { SchoolId, getClassSize } from '@/types/roster';
import { ensureAnonymousAuth } from '@/services/firebase';
import { safeSet, safeGet, safeUpdate } from '@/services/rtdbSafe';

/**
 * Determine error typology based on prompt type, response latency, and target/distractor relationship
 */
function determineErrorTypology(
  promptType: string,
  targetEn: string,
  topDistractorText: string,
  avgMissLatencyMs: number
): ErrorTypology {
  if (avgMissLatencyMs < 1500) {
    return 'RANDOM_GUESS';
  }
  if (promptType === 'AUDIO_ONLY') {
    return 'PHONEMIC';
  }
  if (targetEn && topDistractorText) {
    const tLower = targetEn.toLowerCase();
    const dLower = topDistractorText.toLowerCase();
    // Check orthographic similarity (shares prefix or similar length/letters)
    if (tLower[0] === dLower[0] || Math.abs(tLower.length - dLower.length) <= 1) {
      return 'ORTHOGRAPHIC';
    }
  }
  return 'SEMANTIC';
}

/**
 * Generate a tailored 3-minute classroom warm-up recommendation based on top missed items
 */
function generateWarmUpRecommendation(topMissed: ItemDiagnostic[]): WarmUpRecommendation {
  if (!topMissed || topMissed.length === 0) {
    return {
      focusTopic: 'General Fluency & Speed Reinforcement',
      jaFocusTopic: '全体的な流暢さと解答スピードの強化',
      activityType: 'Speed Choral Echo Drill',
      jaActivityType: 'スピード・コーラルリピート練習',
      instructionEn: 'Class achieved stellar mastery! Conduct a brisk 2-minute choral repetition to solidify instantaneous pronunciation and automaticity.',
      instructionJa: '素晴らしい定着率です！次回の授業開始時は2分間のテンポ良いリピート練習で、さらなる発音と即答力を強化しましょう。',
      targetWords: []
    };
  }

  const targetWords = topMissed.slice(0, 3).map(m => m.english);
  const wordsListEn = targetWords.join(', ');
  const wordsListJa = topMissed.slice(0, 3).map(m => m.ja).join('・');

  // Check if days of week
  const daysKeywords = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const hasDays = topMissed.some(m => daysKeywords.includes(m.english.toLowerCase()));

  // Check if phonics / audio difficulty
  const hasAudioPrompt = topMissed.some(m => m.promptType === 'AUDIO_ONLY');

  if (hasDays) {
    return {
      focusTopic: 'Days of the Week Distinction',
      jaFocusTopic: '曜日の聞き分けと発音の定着',
      activityType: 'Rhythm Chant & Gesture Jump',
      jaActivityType: 'リズムチャンツ & ジェスチャージャンプ',
      instructionEn: `Use a 3-minute rhythm chant focusing heavily on distinguishing tricky days (${wordsListEn}). Have students point left on Tuesday and right on Thursday.`,
      instructionJa: `混同しやすい曜日（${wordsListJa}）を中心に3分間のリズムチャンツを実施。「Tuesday」で左、「Thursday」で右を指差す身体動作（TPR）で定着を図ります。`,
      targetWords
    };
  }

  if (hasAudioPrompt) {
    return {
      focusTopic: 'Phonological Contrast & Minimal Pairs',
      jaFocusTopic: '音声の聞き分け（フォニックス・類似音の識別）',
      activityType: 'Choral Lip-Sync & Sound Snatch',
      jaActivityType: '口の形注目リピート & 音当てゲーム',
      instructionEn: `Focus on mouth-shape visual cues for (${wordsListEn}). ALT demonstrates exaggerated mouth shapes; students echo with clapping on the stressed syllable.`,
      instructionJa: `つまずきが多かった単語（${wordsListJa}）について、ALTの口元を大きく見せて発音。アクセント部分で手拍子を叩くコーラルリピートを行い、音の違いを身体で覚えます。`,
      targetWords
    };
  }

  return {
    focusTopic: 'Target Vocabulary Fluency & Visual Association',
    jaFocusTopic: '苦手単語の視覚・意味一致トレーニング',
    activityType: 'Three-Count Keyword Snatch / Flashcard Flip',
    jaActivityType: '3秒キーワードスナッチ & フラッシュカード復習',
    instructionEn: `Open the next lesson with a 3-minute rapid flashcard warm-up specifically targeting (${wordsListEn}). Display the image first, delay text by 2 seconds to encourage recall.`,
    instructionJa: `次回の授業冒頭3分間で、正解率の低かった（${wordsListJa}）のフラッシュカード復習を実施。絵を先に提示し、2秒後に英単語を表示して想起練習（リトリーバル）を促します。`,
    targetWords
  };
}

/**
 * Extract attendance number from student ID, nickname, or bound mapping
 */
function extractAttendanceNumber(
  playerId: string,
  player: QuizPlayer,
  boundStudents?: Record<number, { playerId: string; nickname: string; score: number }>
): number {
  if (player.attendanceNumber && player.attendanceNumber > 0) {
    return player.attendanceNumber;
  }
  const dynamicSeat = (player as any).boundStudent?.seatNumber;
  if (typeof dynamicSeat === 'number' && dynamicSeat > 0) {
    return dynamicSeat;
  }
  if (boundStudents) {
    for (const [seatStr, b] of Object.entries(boundStudents)) {
      if (b.playerId === playerId || b.nickname === player.nickname) {
        return parseInt(seatStr, 10);
      }
    }
  }
  // Try parsing from nickname like "Seat 12", "#12", "12番", "5-3 #12"
  const match = player.nickname?.match(/#?(\d{1,2})/);
  if (match) {
    const num = parseInt(match[1], 10);
    if (num >= 1 && num <= 45) return num;
  }
  return 0;
}

/**
 * Pure calculation engine to process room state and answer records into comprehensive psychometric analytics
 */
export function computeSessionAnalytics(
  room: QuizRoomState,
  questionsList: QuizQuestion[],
  durationSeconds: number
): SessionAnalytics {
  const schoolId: SchoolId = room.schoolId || 'futakotamagawa';
  const classId: string = room.classId || '5-1';
  const grade: string = room.grade || 'Grade 5';
  const unit: string = room.unit || 'All Units';
  const gamePlayType = room.gamePlayType || 'SPRINT_RACE';
  const gameMode = room.mode || 'INDIVIDUAL';
  const now = Date.now();
  const sessionId = `${classId}_${now}`;

  const players = Object.values(room.players || {});
  const activePlayers = players.filter(p => p.answers && Object.keys(p.answers).length > 0);
  const activeParticipants = activePlayers.length;
  const rosterSize = getClassSize(schoolId, classId) || Math.max(activeParticipants, 25);
  const participationRate = Math.min(100, Math.round((activeParticipants / rosterSize) * 100));

  let totalClassTouches = 0;
  let totalCorrect = 0;
  let totalLatencyMs = 0;
  let latencySampleCount = 0;

  const latencyQuadrants: LatencyQuadrants = {
    fastCorrect: 0,
    slowCorrect: 0,
    fastIncorrect: 0,
    slowIncorrect: 0
  };

  // Determine top 27% (Upper) and bottom 27% (Lower) groups for Item Discrimination Index (D-index)
  const sortedByScore = [...activePlayers].sort((a, b) => (b.score || 0) - (a.score || 0) || (b.correctCount || 0) - (a.correctCount || 0));
  const groupSize = Math.max(1, Math.round(activePlayers.length * 0.27));
  const upperGroup = new Set(sortedByScore.slice(0, groupSize).map(p => p.id));
  const lowerGroup = new Set(sortedByScore.slice(-groupSize).map(p => p.id));

  // Item Diagnostic Map
  const itemsMap: Record<string, ItemDiagnostic> = {};

  // Initialize questions
  questionsList.forEach(q => {
    const key = q.targetWordId || `q_${q.questionIndex}`;
    itemsMap[key] = {
      wordId: key,
      english: q.targetWordEnglish,
      ja: q.targetWordJa,
      promptType: q.promptType,
      totalAttempts: 0,
      correctAttempts: 0,
      incorrectAttempts: 0,
      accuracy: 0,
      difficultyIndex: 0,
      discriminationIndex: 0,
      averageLatencyMs: 0,
      distractorBreakdown: [],
      errorTypology: 'SEMANTIC'
    };
  });

  // Track raw answer attempts per question
  interface QuestionRawStats {
    total: number;
    correct: number;
    incorrect: number;
    upperCorrect: number;
    lowerCorrect: number;
    latencies: number[];
    missLatencies: number[];
    distractorCounts: Record<string, { text: string; count: number }>;
  }
  const rawStatsMap: Record<string, QuestionRawStats> = {};

  questionsList.forEach(q => {
    const key = q.targetWordId || `q_${q.questionIndex}`;
    rawStatsMap[key] = {
      total: 0,
      correct: 0,
      incorrect: 0,
      upperCorrect: 0,
      lowerCorrect: 0,
      latencies: [],
      missLatencies: [],
      distractorCounts: {}
    };
  });

  let totalPitStops = 0;

  // Aggregate student answers
  activePlayers.forEach(p => {
    const answers = p.answers || {};
    Object.entries(answers).forEach(([qIdxStr, ans]) => {
      const qIdx = parseInt(qIdxStr, 10);
      const q = questionsList[qIdx];
      if (!q) return;

      const key = q.targetWordId || `q_${q.questionIndex}`;
      const raw = rawStatsMap[key];
      if (!raw) return;

      totalClassTouches++;
      raw.total++;

      const timeTaken = ans.timeTakenMs || 2000;
      if (timeTaken > 0 && timeTaken < 60000) {
        totalLatencyMs += timeTaken;
        latencySampleCount++;
        raw.latencies.push(timeTaken);
      }

      if (ans.isCorrect) {
        totalCorrect++;
        raw.correct++;
        if (upperGroup.has(p.id)) raw.upperCorrect++;
        if (lowerGroup.has(p.id)) raw.lowerCorrect++;
        if (ans.incorrectAttempts && ans.incorrectAttempts > 0) {
          raw.incorrect += ans.incorrectAttempts;
          totalPitStops += ans.incorrectAttempts;
          raw.total += ans.incorrectAttempts;
          totalClassTouches += ans.incorrectAttempts;
        }

        if (timeTaken < 2500) {
          latencyQuadrants.fastCorrect++;
        } else {
          latencyQuadrants.slowCorrect++;
        }
      } else {
        raw.incorrect++;
        raw.missLatencies.push(timeTaken);
        if (ans.incorrectAttempts) {
          totalPitStops += ans.incorrectAttempts;
        } else {
          totalPitStops++;
        }

        if (timeTaken < 1500) {
          latencyQuadrants.fastIncorrect++;
        } else {
          latencyQuadrants.slowIncorrect++;
        }

        // Tally distractor choice
        if (ans.optionId) {
          const chosenOpt = q.options?.find(o => o.id === ans.optionId);
          const optText = chosenOpt ? chosenOpt.english : ans.optionId;
          if (!raw.distractorCounts[ans.optionId]) {
            raw.distractorCounts[ans.optionId] = { text: optText, count: 0 };
          }
          raw.distractorCounts[ans.optionId].count++;
        }
      }
    });
  });

  // Calculate psychometric indices per item
  questionsList.forEach(q => {
    const key = q.targetWordId || `q_${q.questionIndex}`;
    const raw = rawStatsMap[key];
    const item = itemsMap[key];
    if (!raw || !item) return;

    item.totalAttempts = raw.total;
    item.correctAttempts = raw.correct;
    item.incorrectAttempts = raw.incorrect;
    item.accuracy = raw.total > 0 ? Math.round((raw.correct / raw.total) * 100) : 0;
    item.difficultyIndex = raw.total > 0 ? parseFloat((raw.correct / raw.total).toFixed(2)) : 0;

    // Discrimination Index D = (UpperCorrect - LowerCorrect) / GroupSize
    if (groupSize > 0) {
      const d = (raw.upperCorrect - raw.lowerCorrect) / groupSize;
      item.discriminationIndex = parseFloat(d.toFixed(2));
    }

    item.averageLatencyMs = raw.latencies.length > 0
      ? Math.round(raw.latencies.reduce((a, b) => a + b, 0) / raw.latencies.length)
      : 0;

    // Format distractors
    const distractorList: DistractorStats[] = Object.entries(raw.distractorCounts).map(([optId, data]) => ({
      optionId: optId,
      text: data.text,
      count: data.count,
      percentage: raw.incorrect > 0 ? Math.round((data.count / raw.incorrect) * 100) : 0
    })).sort((a, b) => b.count - a.count);

    item.distractorBreakdown = distractorList;

    const topDistractor = distractorList[0]?.text || '';
    const avgMissLatency = raw.missLatencies.length > 0
      ? raw.missLatencies.reduce((a, b) => a + b, 0) / raw.missLatencies.length
      : 2000;

    item.errorTypology = determineErrorTypology(item.promptType, item.english, topDistractor, avgMissLatency);
  });

  // Top Missed Words (accuracy < 80% with at least 1 mistake, sorted by lowest accuracy)
  const allItems = Object.values(itemsMap).filter(i => i.totalAttempts > 0);
  const topMissedWords = allItems
    .filter(i => i.incorrectAttempts > 0)
    .sort((a, b) => a.accuracy - b.accuracy || b.incorrectAttempts - a.incorrectAttempts)
    .slice(0, 5);

  // Top Mastered Words (highest accuracy, fastest latency)
  const topMasteredWords = allItems
    .filter(i => i.accuracy >= 85)
    .sort((a, b) => b.accuracy - a.accuracy || a.averageLatencyMs - b.averageLatencyMs)
    .slice(0, 5);

  // Lap Buckets (for Sprint Fatigue Curve)
  let lapBuckets: LapBucket[] | undefined = undefined;
  if (gamePlayType === 'SPRINT_RACE' && questionsList.length > 0) {
    const bucketSize = 10;
    const totalBuckets = Math.ceil(questionsList.length / bucketSize);
    lapBuckets = [];

    for (let b = 0; b < totalBuckets; b++) {
      const startLap = b * bucketSize + 1;
      const endLap = Math.min((b + 1) * bucketSize, questionsList.length);
      const label = `Laps ${startLap}–${endLap}`;

      let bucketTotal = 0;
      let bucketCorrect = 0;
      let bucketLatencySum = 0;
      let bucketLatencyCount = 0;

      for (let l = startLap - 1; l < endLap; l++) {
        const q = questionsList[l];
        if (q) {
          const key = q.targetWordId || `q_${q.questionIndex}`;
          const raw = rawStatsMap[key];
          if (raw) {
            bucketTotal += raw.total;
            bucketCorrect += raw.correct;
            raw.latencies.forEach(lat => {
              bucketLatencySum += lat;
              bucketLatencyCount++;
            });
          }
        }
      }

      lapBuckets.push({
        lapRange: label,
        totalAttempts: bucketTotal,
        correctCount: bucketCorrect,
        accuracy: bucketTotal > 0 ? Math.round((bucketCorrect / bucketTotal) * 100) : 0,
        averageLatencyMs: bucketLatencyCount > 0 ? Math.round(bucketLatencySum / bucketLatencyCount) : 0
      });
    }
  }

  // Quiet Achievers: Students with high accuracy (>= 85%) and solid question volume (>= 15),
  // who might not shout or stand out in whole-class callouts
  const quietAchievers: QuietAchiever[] = activePlayers
    .filter(p => {
      const total = p.totalAnswered || 0;
      const correct = p.correctCount || 0;
      const acc = total > 0 ? (correct / total) * 100 : 0;
      return total >= 10 && acc >= 80;
    })
    .sort((a, b) => (b.correctCount / (b.totalAnswered || 1)) - (a.correctCount / (a.totalAnswered || 1)) || (b.maxStreak || 0) - (a.maxStreak || 0))
    .slice(0, 4)
    .map(p => {
      const total = p.totalAnswered || 1;
      const correct = p.correctCount || 0;
      const attNum = extractAttendanceNumber(p.id, p, room.boundStudents);
      return {
        attendanceNumber: attNum,
        nickname: p.nickname,
        accuracy: Math.round((correct / total) * 100),
        totalTouches: total,
        averageLatencyMs: p.fastestTimeMs || 2500,
        streak: p.maxStreak || 0,
        avatar: p.avatar
      };
    });

  // Support Need Students: Students with accuracy < 65% or >= 3 pit stops
  const supportStudents: SupportNeedStudent[] = activePlayers
    .filter(p => {
      const total = p.totalAnswered || 0;
      const correct = p.correctCount || 0;
      const acc = total > 0 ? (correct / total) * 100 : 100;
      return total >= 8 && acc < 70;
    })
    .sort((a, b) => (a.correctCount / (a.totalAnswered || 1)) - (b.correctCount / (b.totalAnswered || 1)))
    .slice(0, 5)
    .map(p => {
      const total = p.totalAnswered || 1;
      const correct = p.correctCount || 0;
      const attNum = extractAttendanceNumber(p.id, p, room.boundStudents);
      const acc = Math.round((correct / total) * 100);
      const misses = total - correct;

      return {
        attendanceNumber: attNum,
        nickname: p.nickname,
        accuracy: acc,
        pitStops: misses,
        troubleWordCount: misses,
        focusNeed: acc < 50 ? 'Pacing & Phonetic Scaffolding' : 'Distractor Differentiation',
        jaFocusNeed: acc < 50 ? '落ち着いた解答ペースと音読サポート' : '紛らわしい選択肢の識別練習',
        avatar: p.avatar
      };
    });

  const warmUpRecommendation = generateWarmUpRecommendation(topMissedWords);

  // Aggregate true cumulative student totals to avoid retry-overwrite skewing
  let playerTotalTouches = 0;
  let playerTotalCorrect = 0;
  let playerTotalIncorrect = 0;

  activePlayers.forEach(p => {
    const answered = p.totalAnswered || 0;
    const correct = p.correctCount || 0;
    playerTotalTouches += answered;
    playerTotalCorrect += correct;
    playerTotalIncorrect += Math.max(0, answered - correct);
  });

  const finalTotalClassTouches = playerTotalTouches > 0 ? playerTotalTouches : totalClassTouches;
  const finalTotalPitStops = playerTotalIncorrect > 0 ? playerTotalIncorrect : totalPitStops;
  const overallAccuracy = playerTotalTouches > 0
    ? Math.round((playerTotalCorrect / playerTotalTouches) * 1000) / 10
    : totalClassTouches > 0
    ? Math.round((totalCorrect / totalClassTouches) * 1000) / 10
    : 0;

  const averageTouchesPerStudent = activeParticipants > 0
    ? Math.round((finalTotalClassTouches / activeParticipants) * 10) / 10
    : 0;
  const averageLatencyMs = latencySampleCount > 0
    ? Math.round(totalLatencyMs / latencySampleCount)
    : 0;

  return {
    id: sessionId,
    roomCode: room.code || 'UNKNOWN',
    schoolId,
    classId,
    grade,
    unit,
    gamePlayType,
    gameMode,
    timestamp: now,
    durationSeconds: Math.max(1, durationSeconds),

    totalClassTouches: finalTotalClassTouches,
    activeParticipants,
    rosterSize,
    participationRate,
    overallAccuracy,
    averageTouchesPerStudent,
    averageLatencyMs,

    items: itemsMap,
    topMissedWords,
    topMasteredWords,

    latencyQuadrants,
    lapBuckets,
    totalPitStops: finalTotalPitStops,
    averagePitStopSec: activeParticipants > 0 ? parseFloat((finalTotalPitStops * 1.5 / activeParticipants).toFixed(1)) : 0,

    quietAchievers,
    supportStudents,
    warmUpRecommendation
  };
}

/**
 * Persist computed session analytics to Firebase RTDB and update the longitudinal class summary
 */
export async function persistSessionAnalytics(analytics: SessionAnalytics): Promise<void> {
  if (!analytics || !analytics.schoolId || !analytics.classId) return;

  try {
    await ensureAnonymousAuth();

    const isTestGame = 
      analytics.roomCode?.startsWith('9') || 
      analytics.classId === 'TEST' || 
      analytics.classId === 'test' ||
      analytics.classId === 'practice';

    const roomPath = `rooms/${analytics.roomCode}/analytics`;

    // 1. Always save to room path so GameOver / host podium can read it
    await safeSet(roomPath, analytics);

    // If it's a test game or practice game, do NOT save to class sessions or affect analyticsSummary
    if (isTestGame) {
      console.log(`[analyticsEngine] Skipped persisting to class sessions for test game (Room: ${analytics.roomCode}, Class: ${analytics.classId})`);
      return;
    }

    const sessionPath = `schools/${analytics.schoolId}/classes/${analytics.classId}/sessions/${analytics.id}`;
    await safeSet(sessionPath, analytics);

    // 2. Update rolling class summary
    const summaryPath = `schools/${analytics.schoolId}/classes/${analytics.classId}/analyticsSummary`;
    const existingSnap = await safeGet<ClassAnalyticsSummary>(summaryPath);
    const existing = existingSnap || {
      schoolId: analytics.schoolId,
      classId: analytics.classId,
      totalSessionsRecorded: 0,
      cumulativeClassTouches: 0,
      averageClassAccuracy: 0,
      lastSessionTimestamp: 0,
      historicalTroubleWords: {}
    };

    const newSessionsCount = existing.totalSessionsRecorded + 1;
    const newCumulativeTouches = existing.cumulativeClassTouches + analytics.totalClassTouches;
    const newAverageAccuracy = Math.round(
      ((existing.averageClassAccuracy * existing.totalSessionsRecorded) + analytics.overallAccuracy) / newSessionsCount * 10
    ) / 10;

    const updatedTroubleWords = { ...(existing.historicalTroubleWords || {}) };
    analytics.topMissedWords.forEach(m => {
      const prev = updatedTroubleWords[m.wordId] || {
        english: m.english,
        ja: m.ja,
        missCount: 0,
        totalEncountered: 0
      };
      updatedTroubleWords[m.wordId] = {
        english: m.english,
        ja: m.ja,
        missCount: prev.missCount + m.incorrectAttempts,
        totalEncountered: prev.totalEncountered + m.totalAttempts
      };
    });

    const updatedSummary: ClassAnalyticsSummary = {
      schoolId: analytics.schoolId,
      classId: analytics.classId,
      totalSessionsRecorded: newSessionsCount,
      cumulativeClassTouches: newCumulativeTouches,
      averageClassAccuracy: newAverageAccuracy,
      lastSessionTimestamp: analytics.timestamp,
      historicalTroubleWords: updatedTroubleWords
    };

    await safeSet(summaryPath, updatedSummary);
  } catch (err) {
    console.warn('[analyticsEngine] Error persisting session analytics to RTDB:', err);
  }
}

/**
 * Fetch past session analytics for a class
 */
export async function fetchClassSessions(
  schoolId: SchoolId,
  classId: string
): Promise<SessionAnalytics[]> {
  try {
    const sessionsPath = `schools/${schoolId}/classes/${classId}/sessions`;
    const snap = await safeGet<Record<string, SessionAnalytics>>(sessionsPath);
    if (!snap) return [];
    return Object.values(snap).sort((a, b) => b.timestamp - a.timestamp);
  } catch (err) {
    console.warn('[analyticsEngine] Error fetching class sessions:', err);
    return [];
  }
}

/**
 * Fetch class rolling analytics summary
 */
export async function fetchClassAnalyticsSummary(
  schoolId: SchoolId,
  classId: string
): Promise<ClassAnalyticsSummary | null> {
  try {
    const summaryPath = `schools/${schoolId}/classes/${classId}/analyticsSummary`;
    return await safeGet<ClassAnalyticsSummary>(summaryPath);
  } catch (err) {
    console.warn('[analyticsEngine] Error fetching class analytics summary:', err);
    return null;
  }
}
