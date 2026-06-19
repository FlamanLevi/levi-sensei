import { ref, get, update, push, serverTimestamp } from 'firebase/database';
import { db } from './firebase';
import flatVocab from '../data/normalized_vocabulary.json';
import { rollForItem } from './itemEngine';

/**
 * Calculates the score for all players after a question round ends, updates streaks, determines comeback multipliers,
 * assigns items, calculates team scores, assigns student ranks, and pushes all updates atomically to Firebase.
 */
export const calculateScoresAndLeaderboard = async ({
    q, // The current question object { target: {...}, options: [...] }
    currentQIndex,
    players,
    teamScores,
    settings,
    setAnswerStats,
    setTroubleWords
}) => {
    const isTeamMode = settings.gameMode !== 'individual';
    
    // Fetch latest responses from Firebase
    const snap = await get(ref(db, 'trivia/responses'));
    const responsesData = snap.val() || {};
    
    // Fetch latest players/teams state just to be safe (though we have them in props, fetching ensures atomicity)
    const pSnap = await get(ref(db, 'trivia/players'));
    const currentPlayers = pSnap.val() || {};
    
    const tSnap = await get(ref(db, 'trivia/teamScores'));
    const currentTeamScores = tSnap.val() || {};
    
    // DEBUG LOGGING: Push snapshot to Firebase so we can diagnose the exact state
    await push(ref(db, 'trivia/debug_logs'), {
        timestamp: serverTimestamp(),
        currentQIndex,
        responsesData,
        currentPlayersCount: Object.keys(currentPlayers).length,
        optionsCount: q.options.length,
        isTeamMode
    });

    const updates = {};
    const teamRoundContributions = {};
    const teamPlayerCounts = {};
    
    const stats = {}; // For distribution chart
    q.options.forEach(opt => stats[opt.id] = 0);

    // Calculate current top score BEFORE this round's updates to use for Item catch-up mechanics
    let currentTopScore = 1;
    if (isTeamMode) {
       currentTopScore = Math.max(1, ...Object.values(currentTeamScores).map(t => t.score || 0));
    } else {
       currentTopScore = Math.max(1, ...Object.values(currentPlayers).map(p => p.score || 0));
    }

    Object.keys(currentPlayers).forEach(id => {
      let pData = currentPlayers[id];
      let score = pData.score || 0;
      let currentStreak = pData.currentStreak || 0;
      let maxStreak = pData.maxStreak || 0;
      let fastestTime = pData.fastestTime || 999999;
      let correctCount = pData.correctCount || 0;
      let comebackPoints = pData.comebackPoints || 0;
      let correctTimeTaken = pData.correctTimeTaken || 0;
      let questionsAnswered = pData.questionsAnswered || 0;
      let pointsEarned = 0;
      let idleCount = pData.idleCount || 0;
      let hasAnswered = false;

      // Ensure the response matches the current question to prevent race conditions
      if (responsesData[id] && responsesData[id].answer && responsesData[id].questionNumber === currentQIndex) {
         hasAnswered = true;
         if (stats[responsesData[id].answer] !== undefined) {
             stats[responsesData[id].answer] += 1;
         }
         questionsAnswered += 1;
      }

      if (hasAnswered) {
         idleCount = 0;
      } else {
         idleCount += 1;
      }

      if (idleCount >= 2) {
         updates[`trivia/players/${id}`] = null;
         return; // Auto-kick ghost player
      }

      if (hasAnswered && responsesData[id].answer === q.target.id) {
        // Cap timeTaken: floor at 300ms (absorbs network jitter), ceiling at timeLimit
        const rawTime = responsesData[id].timeTaken || settings.timeLimit;
        const cappedTime = Math.min(Math.max(rawTime, 300), settings.timeLimit);

        pointsEarned = 500 + Math.max(0, Math.floor(500 * (1 - (cappedTime / settings.timeLimit))));
        
        // Catch-up mechanic & 2x Item Buff
        let currentMultiplier = pData.comebackMultiplier || 1;
        if (pData.hasMultiplier) currentMultiplier = Math.max(currentMultiplier, 2); // Legacy fallback
        if (pData.has2xItem) currentMultiplier = Math.max(currentMultiplier, 2);

        if (currentMultiplier > 1) {
            pointsEarned = Math.floor(pointsEarned * currentMultiplier);
            comebackPoints += pointsEarned;
        }

        score += pointsEarned;
        currentStreak += 1;
        correctCount += 1;
        correctTimeTaken += cappedTime;
        if (currentStreak > maxStreak) maxStreak = currentStreak;
        if (cappedTime < fastestTime) fastestTime = cappedTime;

        if (isTeamMode && pData.teamId) {
          if (!teamRoundContributions[pData.teamId]) teamRoundContributions[pData.teamId] = 0;
          teamRoundContributions[pData.teamId] += pointsEarned;
        }

        if (!pData.item && settings.itemsMode && settings.itemsMode !== 'none') {
           const pScore = isTeamMode && pData.teamId ? (currentTeamScores[pData.teamId]?.score || 0) : score;
           const isFallingBehind = currentTopScore > 1000 && pScore <= (currentTopScore * 0.5);
           
           const newItem = rollForItem({
               isCorrect: true,
               currentStreak,
               isFallingBehind,
               itemsMode: settings.itemsMode
           });
           
           if (newItem) {
               updates[`trivia/players/${id}/item`] = newItem;
           }
        }
      } else {
        currentStreak = 0;
      }

      if (isTeamMode && pData.teamId) {
        teamPlayerCounts[pData.teamId] = (teamPlayerCounts[pData.teamId] || 0) + 1;
        if (!updates[`trivia/teamScores/${pData.teamId}/totalAnswered`]) {
            updates[`trivia/teamScores/${pData.teamId}/totalAnswered`] = currentTeamScores[pData.teamId]?.totalAnswered || 0;
            updates[`trivia/teamScores/${pData.teamId}/totalCorrect`] = currentTeamScores[pData.teamId]?.totalCorrect || 0;
        }
        if (responsesData[id] && responsesData[id].answer) {
            updates[`trivia/teamScores/${pData.teamId}/totalAnswered`] += 1;
            if (responsesData[id].answer === q.target.id) {
                updates[`trivia/teamScores/${pData.teamId}/totalCorrect`] += 1;
            }
        }
      }

      updates[`trivia/players/${id}/score`] = score;
      updates[`trivia/players/${id}/maxStreak`] = maxStreak;
      updates[`trivia/players/${id}/currentStreak`] = currentStreak;
      updates[`trivia/players/${id}/fastestTime`] = fastestTime;
      updates[`trivia/players/${id}/correctCount`] = correctCount;
      updates[`trivia/players/${id}/comebackPoints`] = comebackPoints;
      updates[`trivia/players/${id}/correctTimeTaken`] = correctTimeTaken;
      updates[`trivia/players/${id}/questionsAnswered`] = questionsAnswered;
      updates[`trivia/players/${id}/avgTime`] = correctCount > 0 ? Math.floor(correctTimeTaken / correctCount) : 999999;
      updates[`trivia/players/${id}/idleCount`] = idleCount;
      updates[`trivia/players/${id}/lastRoundScore`] = pointsEarned;
    });

    // Track Trouble Words (if less than 50% got it right)
    const totalAnswers = Object.values(stats).reduce((a, b) => a + b, 0);
    const correctAnswers = stats[q.target.id] || 0;
    if (totalAnswers > 0) {
      const percentWrong = ((totalAnswers - correctAnswers) / totalAnswers) * 100;
      setTroubleWords(prev => {
        const existing = [...prev];
        existing.push({
            word: q.target,
            percentWrong: Math.round(percentWrong)
        });
        return existing.sort((a, b) => b.percentWrong - a.percentWrong);
      });
    }

    const updatedTeamScores = {};
    if (isTeamMode) {
      Object.keys(teamPlayerCounts).forEach(teamId => {
        const totalPoints = teamRoundContributions[teamId] || 0;
        const currentScore = currentTeamScores[teamId]?.score || 0;
        updatedTeamScores[teamId] = currentScore + totalPoints;
        updates[`trivia/teamScores/${teamId}/score`] = updatedTeamScores[teamId];
      });
      
      const allScores = [...Object.values(updatedTeamScores), ...Object.values(currentTeamScores).map(t => t.score || 0)];
      const topTeamScore = Math.max(1, ...allScores);
      
      if (settings.catchupMode !== 'off') {
        Object.keys(currentPlayers).forEach(id => {
           if (updates[`trivia/players/${id}`] === null) return;
           const tId = currentPlayers[id].teamId;
           const tScore = updatedTeamScores[tId] || currentTeamScores[tId]?.score || 0;
           
           let multiplier = 1;
           if (topTeamScore > 1500) {
               if (tScore <= topTeamScore * 0.25) multiplier = 3;
               else if (tScore <= topTeamScore * 0.50) multiplier = 2;
               else if (tScore <= topTeamScore * 0.75) multiplier = 1.5;
           }
           updates[`trivia/players/${id}/comebackMultiplier`] = multiplier;
           updates[`trivia/players/${id}/hasMultiplier`] = null; // Clean up legacy
        });
      }

    } else {
      let newTopScore = 1;
      Object.keys(currentPlayers).forEach(id => {
        const s = updates[`trivia/players/${id}/score`] || currentPlayers[id].score || 0;
        if (s > newTopScore) newTopScore = s;
      });

      if (settings.catchupMode !== 'off') {
        Object.keys(currentPlayers).forEach(id => {
           if (updates[`trivia/players/${id}`] === null) return;
           const s = updates[`trivia/players/${id}/score`] || currentPlayers[id].score || 0;
           let multiplier = 1;
           if (newTopScore > 1500) {
               if (s <= newTopScore * 0.25) multiplier = 3;
               else if (s <= newTopScore * 0.50) multiplier = 2;
               else if (s <= newTopScore * 0.75) multiplier = 1.5;
           }
           updates[`trivia/players/${id}/comebackMultiplier`] = multiplier;
           updates[`trivia/players/${id}/hasMultiplier`] = null; // Clean up legacy
        });
      }
    }

    // Calculate Ranks for Student iPads
    const playerScores = Object.keys(currentPlayers)
      .filter(id => updates[`trivia/players/${id}`] !== null) // Exclude kicked idle ghosts
      .map(id => ({
        id,
        score: updates[`trivia/players/${id}/score`] || 0
      })).sort((a, b) => b.score - a.score);

    playerScores.forEach((ps, index) => {
      updates[`trivia/players/${ps.id}/rank`] = index + 1;
      updates[`trivia/players/${ps.id}/pointsToNext`] = index > 0 ? playerScores[index - 1].score - ps.score : null;
      updates[`trivia/players/${ps.id}/pointsAheadOfPrev`] = index < playerScores.length - 1 ? ps.score - playerScores[index + 1].score : null;
    });
    
    updates['trivia/gameState/totalPlayers'] = playerScores.length;

    await update(ref(db), updates);
    setAnswerStats(stats);
};
