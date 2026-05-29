import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import flatVocab from '../data/normalized_vocabulary.json';
import { isWordInUnit } from '../utils/vocabulary';
import { db } from '../lib/firebase';
import { ref, update, set, remove, onDisconnect, get, push, runTransaction } from 'firebase/database';
import { useGameState } from '../hooks/useGameState';
import { useBGM } from '../hooks/useBGM';
import { HostLobby } from '../components/quiz/host/HostLobby';
import { HostQuestion } from '../components/quiz/host/HostQuestion';
import { HostReveal } from '../components/quiz/host/HostReveal';
import { HostLeaderboard } from '../components/quiz/host/HostLeaderboard';
import { HostGameOver } from '../components/quiz/host/HostGameOver';
import Confetti from 'react-confetti';
import { RubyText } from '../components/RubyText';
import { rollForItem } from '../lib/itemEngine';

// Helper to shuffle arrays
const shuffle = (array) => [...array].sort(() => Math.random() - 0.5);

const COLORS = [
  'bg-red-500 border-red-700',
  'bg-blue-500 border-blue-700',
  'bg-yellow-400 border-yellow-600 text-black',
  'bg-green-500 border-green-700'
];

function QuizHostLive({ t, lang }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { roomCode, selectedUnits, settings } = location.state || {};
  
  const [questionQueue, setQuestionQueue] = useState([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [phase, setPhase] = useState('LOBBY'); // LOBBY, QUESTION, REVEAL, LEADERBOARD, GAME_OVER

  const trackToLoad = (!settings?.bgm || settings.bgm === 'none') ? null : settings.bgm;
  const isPlaying = phase !== 'LOBBY';

  const { isMuted, toggleMute } = useBGM(trackToLoad, isPlaying);
  
  const { room, gameState, players, teamScores, responses } = useGameState();

  const timerRef = useRef(null);
  const [answerStats, setAnswerStats] = useState({}); // To hold distribution
  const [troubleWords, setTroubleWords] = useState([]); // Track hard questions
  const [selectedAward, setSelectedAward] = useState(null); // 'streak', 'correct', 'fastest'
  const [timeOffset, setTimeOffset] = useState(0);

  useEffect(() => {
    const offsetRef = ref(db, '.info/serverTimeOffset');
    const unsub = onValue(offsetRef, (snap) => setTimeOffset(snap.val() || 0));
    return () => unsub();
  }, []);

  // Helper for End Game Awards
  const getTopTiers = (statKey, isAscending = false, requireAccuracy = false) => {
    const allValues = Object.values(players)
      .filter(p => requireAccuracy ? p.correctCount === p.questionsAnswered && p.questionsAnswered > 0 : true)
      .map(p => p[statKey] || 0)
      .filter(val => isAscending ? val < 999999 && val > 0 : val > 0);
    
    const uniqueValues = [...new Set(allValues)].sort((a, b) => isAscending ? a - b : b - a);
    const top3Values = uniqueValues.slice(0, 3);
    
    return top3Values.map(val => ({
        value: val,
        players: Object.values(players)
            .filter(p => requireAccuracy ? p.correctCount === p.questionsAnswered && p.questionsAnswered > 0 : true)
            .filter(p => (p[statKey] || 0) === val)
            .map(p => p.nickname)
    }));
  };

  const isTeamMode = settings && settings.gameMode !== 'individual';
  const TEAM_CONFIG = {
    team_0: { name: t("Red Team", "赤チーム"), bg: 'bg-red-50', border: 'border-red-400', text: 'text-red-600', emoji: '🔴' },
    team_1: { name: t("Blue Team", "青チーム"), bg: 'bg-blue-50', border: 'border-blue-400', text: 'text-blue-600', emoji: '🔵' },
    team_2: { name: t("Yellow Team", "黄チーム"), bg: 'bg-yellow-50', border: 'border-yellow-400', text: 'text-yellow-600', emoji: '🟡' },
    team_3: { name: t("Green Team", "緑チーム"), bg: 'bg-green-50', border: 'border-green-400', text: 'text-green-600', emoji: '🟢' }
  };

  const calculateScoresAndLeaderboard = useCallback(async (q) => {
    const isTeamMode = settings.gameMode !== 'individual';
    const snap = await get(ref(db, 'trivia/responses'));
    const responsesData = snap.val() || {};
    
    const pSnap = await get(ref(db, 'trivia/players'));
    const players = pSnap.val() || {};
    
    const tSnap = await get(ref(db, 'trivia/teamScores'));
    const teamScores = tSnap.val() || {};
    
    const updates = {};
    const teamRoundContributions = {};
    const teamPlayerCounts = {};
    
    const stats = {}; // For distribution chart
    q.options.forEach(opt => stats[opt.id] = 0);

    // Calculate current top score BEFORE this round's updates to use for Item catch-up mechanics
    let currentTopScore = 1;
    if (isTeamMode) {
       currentTopScore = Math.max(1, ...Object.values(teamScores).map(t => t.score || 0));
    } else {
       currentTopScore = Math.max(1, ...Object.values(players).map(p => p.score || 0));
    }

    Object.keys(players).forEach(id => {
      let pData = players[id];
      let score = pData.score || 0;
      let currentStreak = pData.currentStreak || 0;
      let maxStreak = pData.maxStreak || 0;
      let fastestTime = pData.fastestTime || 999999;
      let correctCount = pData.correctCount || 0;
      let comebackPoints = pData.comebackPoints || 0;
      let totalTimeTaken = pData.totalTimeTaken || 0;
      let questionsAnswered = pData.questionsAnswered || 0;
      let pointsEarned = 0;
      let idleCount = pData.idleCount || 0;
      let hasAnswered = false;

      if (responsesData[id] && responsesData[id].answer) {
         hasAnswered = true;
         if (stats[responsesData[id].answer] !== undefined) {
             stats[responsesData[id].answer] += 1;
         }
         questionsAnswered += 1;
         totalTimeTaken += responsesData[id].timeTaken;
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
        pointsEarned = 500 + Math.max(0, Math.floor(500 * (1 - (responsesData[id].timeTaken / settings.timeLimit))));
        
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
        if (currentStreak > maxStreak) maxStreak = currentStreak;
        if (responsesData[id].timeTaken < fastestTime) fastestTime = responsesData[id].timeTaken;

        if (isTeamMode && pData.teamId) {
          if (!teamRoundContributions[pData.teamId]) teamRoundContributions[pData.teamId] = 0;
          teamRoundContributions[pData.teamId] += pointsEarned;
        }

        if (!pData.item && settings.itemsMode && settings.itemsMode !== 'none') {
           const pScore = isTeamMode && pData.teamId ? (teamScores[pData.teamId]?.score || 0) : score;
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
            updates[`trivia/teamScores/${pData.teamId}/totalAnswered`] = teamScores[pData.teamId]?.totalAnswered || 0;
            updates[`trivia/teamScores/${pData.teamId}/totalCorrect`] = teamScores[pData.teamId]?.totalCorrect || 0;
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
      updates[`trivia/players/${id}/totalTimeTaken`] = totalTimeTaken;
      updates[`trivia/players/${id}/avgTime`] = questionsAnswered > 0 ? Math.floor(totalTimeTaken / questionsAnswered) : 0;
      updates[`trivia/players/${id}/idleCount`] = idleCount;
      updates[`trivia/players/${id}/lastRoundScore`] = pointsEarned;
    });

    // Track Trouble Words (if less than 50% got it right)
    const totalAnswers = Object.values(stats).reduce((a, b) => a + b, 0);
    const correctAnswers = stats[q.target.id] || 0;
    if (totalAnswers > 0) {
      const percentWrong = ((totalAnswers - correctAnswers) / totalAnswers) * 100;
      setTroubleWords(prev => [...prev, {
        word: q.target,
        percentWrong: Math.round(percentWrong)
      }].sort((a, b) => b.percentWrong - a.percentWrong));
    }

    const updatedTeamScores = {};
    if (isTeamMode) {
      Object.keys(teamPlayerCounts).forEach(teamId => {
        const totalPoints = teamRoundContributions[teamId] || 0;
        const memberCount = teamPlayerCounts[teamId];
        if (memberCount > 0) {
          const averageScore = Math.round(totalPoints / memberCount);
          if (averageScore > 0) {
            const currentTeamScore = teamScores[teamId]?.score || 0;
            updatedTeamScores[teamId] = currentTeamScore + averageScore;
            updates[`trivia/teamScores/${teamId}/score`] = updatedTeamScores[teamId];
          }
        }
      });
      
      // Determine who gets the comeback multiplier next round
      const allScores = [...Object.values(updatedTeamScores), ...Object.values(teamScores).map(t => t.score || 0)];
      const topTeamScore = Math.max(1, ...allScores);
      
      Object.keys(players).forEach(id => {
         const tId = players[id].teamId;
         const tScore = updatedTeamScores[tId] || teamScores[tId]?.score || 0;
         
         let multiplier = 1;
         if (topTeamScore > 1500) {
             if (tScore <= topTeamScore * 0.25) multiplier = 3;
             else if (tScore <= topTeamScore * 0.50) multiplier = 2;
             else if (tScore <= topTeamScore * 0.75) multiplier = 1.5;
         }
         updates[`trivia/players/${id}/comebackMultiplier`] = multiplier;
         updates[`trivia/players/${id}/hasMultiplier`] = null; // Clean up legacy
      });

    } else {
      // Individual mode multiplier
      let newTopScore = 1;
      Object.keys(players).forEach(id => {
        const s = updates[`trivia/players/${id}/score`] || players[id].score || 0;
        if (s > newTopScore) newTopScore = s;
      });

      Object.keys(players).forEach(id => {
         const s = updates[`trivia/players/${id}/score`] || players[id].score || 0;
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

    await update(ref(db), updates);
    setAnswerStats(stats);
    
    // The transition to LEADERBOARD is now handled by HostReveal.jsx's own timer/button
  }, [players, teamScores, settings]);

  const revealAnswer = useCallback(async (q) => {
    setPhase('REVEAL');
    clearInterval(timerRef.current);

    // Tell tablets to reveal
    await update(ref(db, 'trivia/gameState'), {
      status: "REVEAL",
      correctAnswer: q.target.id
    });

    // Wait a brief moment to ensure all late responses were written, then calculate score.
    // (In a production app, we'd use Firebase Cloud Functions for this to prevent tampering, 
    // but doing it client-side on the Host is identical to the legacy app's behavior).
    setTimeout(() => {
       calculateScoresAndLeaderboard(q);
    }, 1000);
  }, [calculateScoresAndLeaderboard]);

  const startNextQuestion = useCallback(async (index) => {
    setCurrentQIndex(index);
    const q = questionQueue[index];
    
    // Wipe responses and single-use buffs from previous question, 
    // AND push new question state to Firebase in a SINGLE ATOMIC UPDATE.
    const updates = {};
    updates['trivia/responses'] = null;
    Object.keys(players).forEach(id => {
       updates[`trivia/players/${id}/activeBuffs`] = null;
       updates[`trivia/players/${id}/hasShield`] = null;
       updates[`trivia/players/${id}/has2xItem`] = null;
    });
    
    updates['trivia/gameState/status'] = "LIVE";
    updates['trivia/gameState/questionNumber'] = index;
    updates['trivia/gameState/timeLimit'] = settings.timeLimit;
    updates['trivia/gameState/displayRules'] = settings.options;
    updates['trivia/gameState/options'] = q.options;
    updates['trivia/gameState/targetId'] = q.target.id;
    updates['trivia/gameState/totalQuestions'] = questionQueue.length;
    updates['trivia/gameState/startTime'] = Date.now() + timeOffset;

    await update(ref(db), updates);

    setPhase('QUESTION');
    setAnswerStats({});
    
    // Start local timer
    clearInterval(timerRef.current);
    let msLeft = settings.timeLimit;
    setTimeLeft(msLeft);
    
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        const newTime = prev - 100;
        
        if (newTime <= 0) {
          clearInterval(timerRef.current);
          revealAnswer(q);
          return 0;
        }
        return newTime;
      });
    }, 100);
  }, [questionQueue, settings, revealAnswer, timeOffset]);

  // 2. Game Flow Functions
  const startGame = async () => {
    // Lock the room so no new players can join mid-game
    await update(ref(db, 'trivia/room'), {
      status: "LIVE"
    });
    setPhase('QUESTION');
    startNextQuestion(0);
  };

  // 1. Build the Question Queue on mount using Smart Distractors
  useEffect(() => {
    const isReview = settings?.isReviewMode && location.state?.preselectedIds;
    if (!isReview && (!selectedUnits || selectedUnits.length === 0)) {
      navigate('/admin/games/quiz');
      return;
    }

    // A. Gather the pool of selected words
    let pool = [];
    let maxSelectedUnitIndex = -1;

    const updateMaxUnitIndex = (uid) => {
        const idx = flatVocab.units.findIndex(u => u.id === uid);
        if (idx > maxSelectedUnitIndex) maxSelectedUnitIndex = idx;
    };

    if (isReview) {
       pool = flatVocab.words.filter(w => location.state.preselectedIds.includes(w.id));
       pool.forEach(w => {
           if (w.target_curriculum) {
               Object.entries(w.target_curriculum).forEach(([gradeId, unitNums]) => {
                   unitNums.forEach(num => updateMaxUnitIndex(`${gradeId}_unit${num}`));
               });
           }
       });
    } else {
       pool = flatVocab.words.filter(w => selectedUnits.some(uid => isWordInUnit(w, uid)));
       selectedUnits.forEach(uid => updateMaxUnitIndex(uid));
    }

    if (pool.length < settings.optionCount) return;

    // Allowed Units for Fallback Distractors (Selected + Prior units)
    const allowedUnitIds = new Set();
    if (maxSelectedUnitIndex >= 0) {
        for (let i = 0; i <= maxSelectedUnitIndex; i++) {
            allowedUnitIds.add(flatVocab.units[i].id);
        }
    } else {
        flatVocab.units.forEach(u => allowedUnitIds.add(u.id));
    }
    const fallbackDistractorPool = flatVocab.words.filter(w => Array.from(allowedUnitIds).some(uid => isWordInUnit(w, uid)));

    // B. Generate Questions with Smart Distractors
    const generatedQueue = pool.map(targetWord => {
      // Prioritize distractors with the same tags or part_of_speech
      let candidates = pool.filter(w => w.id !== targetWord.id);
      
      // Try to find distractors that share at least one tag
      let tagMatches = candidates.filter(w => w.tags && targetWord.tags && w.tags.some(t => targetWord.tags.includes(t)));
      
      // If not enough tag matches, fall back to part_of_speech matches
      if (tagMatches.length < settings.optionCount - 1) {
        let posMatches = candidates.filter(w => w.part_of_speech === targetWord.part_of_speech && !tagMatches.includes(w));
        tagMatches = [...tagMatches, ...posMatches];
      }

      // If STILL not enough, just use random words from the selected pool
      if (tagMatches.length < settings.optionCount - 1) {
        let randoms = candidates.filter(w => !tagMatches.includes(w));
        tagMatches = [...tagMatches, ...randoms];
      }

      // NEW FALLBACK: If STILL not enough from the pool, use random words from prior learned units
      if (tagMatches.length < settings.optionCount - 1) {
        let globalCandidates = fallbackDistractorPool.filter(w => w.id !== targetWord.id && !tagMatches.some(t => t.id === w.id));
        let globalRandoms = shuffle(globalCandidates).slice(0, (settings.optionCount - 1) - tagMatches.length);
        tagMatches = [...tagMatches, ...globalRandoms];
      }

      const selectedDistractors = shuffle(tagMatches).slice(0, settings.optionCount - 1);
      const options = shuffle([targetWord, ...selectedDistractors]);

      return { target: targetWord, options };
    });

    // C. Trim to selected question count
    let finalQueue = shuffle(generatedQueue);
    if (settings.questionCount !== -1) {
      finalQueue = finalQueue.slice(0, settings.questionCount);
    }
    
    setQuestionQueue(finalQueue);

    // D. Setup disconnection cleanup
    const statusRef = ref(db, 'trivia/gameState/status');
    onDisconnect(statusRef).set("CLOSED");

  }, [selectedUnits, settings, navigate]);

  // Efficacy: Auto-skip the timer if everyone has already answered
  useEffect(() => {
    if (phase === 'QUESTION' && questionQueue.length > 0) {
      // Prevent reading stale responses from the previous question before Firebase syncs
      if (gameState?.questionNumber !== currentQIndex) return;

      const totalPlayers = Object.keys(players).length;
      const responsesData = responses || {};
      const responseCount = Object.keys(responsesData).length;

      // If we have players and everyone has submitted an answer
      if (totalPlayers > 0 && responseCount >= totalPlayers) {
        // We add a tiny 500ms delay so the last student sees their "Answer Sent" 
        // screen for a moment before the big screen reveals the answer.
        const timeout = setTimeout(() => revealAnswer(questionQueue[currentQIndex]), 500);
        return () => clearTimeout(timeout);
      }
    }
  }, [responses, gameState?.questionNumber, players, phase, currentQIndex, questionQueue, revealAnswer]);


  const nextPhase = useCallback(async () => {
    if (phase === 'LEADERBOARD') {
      if (currentQIndex + 1 >= questionQueue.length) {
        setPhase('GAME_OVER');
        update(ref(db, 'trivia/gameState'), { status: 'GAME_OVER' });
        
        // Log comprehensive game session to Analytics
        try {
          const sampleUnit = flatVocab.units.find(u => selectedUnits.includes(u.id));
          const gradeId = sampleUnit ? sampleUnit.grade_id : 'unknown';
          const schoolId = room?.schoolId || 'unknown';
          
          if (!settings?.isReviewMode) {
             const activePlayers = Object.values(players).filter(p => p.questionsAnswered > 0);
             const playerCount = activePlayers.length;
             let averageScore = 0;
             let averageAccuracy = 0;
             let averageResponseTime = 0;
             let fastestResponseTime = 999999;
             
             if (playerCount > 0) {
                 averageScore = Math.round(activePlayers.reduce((sum, p) => sum + (p.score || 0), 0) / playerCount);
                 averageAccuracy = Math.round(activePlayers.reduce((sum, p) => sum + ((p.correctCount / p.questionsAnswered) * 100 || 0), 0) / playerCount);
                 averageResponseTime = Math.round(activePlayers.reduce((sum, p) => sum + (p.avgTime || 0), 0) / playerCount);
                 fastestResponseTime = Math.min(...activePlayers.map(p => p.fastestTime || 999999));
             }

             await push(ref(db, `analytics/gameSessions/${schoolId}/${gradeId}`), {
                 timestamp: Date.now(),
                 roomCode,
                 playerCount,
                 averageScore,
                 averageAccuracy,
                 averageResponseTime,
                 fastestResponseTime: fastestResponseTime === 999999 ? 0 : fastestResponseTime,
                 gameMode: settings?.gameMode || 'individual',
                 questions: troubleWords // contains all tested words and their percentWrong
             });
          }
        } catch (e) {
          console.error("Failed to log analytics:", e);
        }

        // Award Coins to authenticated profiles
        const sortedPlayerIds = Object.keys(players).sort((a, b) => (players[b].score || 0) - (players[a].score || 0));
        
        Object.keys(players).forEach(uid => {
           // Firebase UIDs are alphanumeric. Fallbacks start with 'player_'
           if (!uid.startsWith('player_')) {
               const pData = players[uid];
               const earnedPoints = pData.score || 0;
               const finalRank = sortedPlayerIds.indexOf(uid) + 1;
               
               if (earnedPoints > 0) {
                   const profileRef = ref(db, `users/${uid}/profile/coins`);
                   runTransaction(profileRef, (currentCoins) => {
                       return (currentCoins || 0) + earnedPoints;
                   }).catch(e => console.error("Coin award failed for", uid, e));

                   const xpRef = ref(db, `users/${uid}/profile/xp`);
                   runTransaction(xpRef, (currentXp) => {
                       return (currentXp || 0) + earnedPoints;
                   }).catch(e => console.error("XP award failed for", uid, e));
                   
                   // Save Match History
                   push(ref(db, `users/${uid}/matchHistory`), {
                       timestamp: Date.now(),
                       score: earnedPoints,
                       rank: finalRank,
                       totalPlayers: sortedPlayerIds.length,
                       accuracy: pData.questionsAnswered > 0 ? Math.round((pData.correctCount / pData.questionsAnswered) * 100) : 0,
                       fastestTime: pData.fastestTime || 999999,
                       avgTime: pData.avgTime || 0,
                       coinsEarned: earnedPoints,
                       gameMode: settings?.gameMode || 'individual'
                   }).catch(e => console.error("Match History failed for", uid, e));
               }
           }
        });

      } else {
        startNextQuestion(currentQIndex + 1);
      }
    }
  }, [phase, currentQIndex, questionQueue.length, startNextQuestion, troubleWords, selectedUnits, roomCode, settings, players, db]);


  // Clean up timer on unmount
  useEffect(() => {
    return () => clearInterval(timerRef.current);
  }, []);

  const handlePlayAgainSame = async () => {
    if (!window.confirm(t("Are you sure you want to play again with the same settings?", "同じ設定でもう一度プレイしますか？"))) return;
    const updates = {};
    updates['trivia/gameState'] = null;
    updates['trivia/responses'] = null;
    updates['trivia/teamScores'] = null;
    updates['trivia/room/status'] = 'LOBBY';
    Object.keys(players || {}).forEach(pId => {
      updates[`trivia/players/${pId}/score`] = 0;
      updates[`trivia/players/${pId}/currentStreak`] = 0;
      updates[`trivia/players/${pId}/maxStreak`] = 0;
      updates[`trivia/players/${pId}/correctCount`] = 0;
      updates[`trivia/players/${pId}/questionsAnswered`] = 0;
      updates[`trivia/players/${pId}/fastestTime`] = 999999;
      updates[`trivia/players/${pId}/comebackPoints`] = 0;
      updates[`trivia/players/${pId}/totalTime`] = 0;
      updates[`trivia/players/${pId}/avgTime`] = 0;
      updates[`trivia/players/${pId}/idleCount`] = 0;
    });
    await update(ref(db), updates);
    setCurrentQIndex(0);
    setPhase('LOBBY');
  };

  const handlePlayAgainChange = async () => {
    if (!window.confirm(t("Are you sure you want to change settings? Students will stay in the lobby.", "設定を変更しますか？生徒はロビーに待機します。"))) return;
    const updates = {};
    updates['trivia/gameState'] = null;
    updates['trivia/responses'] = null;
    updates['trivia/teamScores'] = null;
    updates['trivia/room/status'] = 'LOBBY';
    Object.keys(players || {}).forEach(pId => {
      updates[`trivia/players/${pId}/score`] = 0;
      updates[`trivia/players/${pId}/currentStreak`] = 0;
      updates[`trivia/players/${pId}/maxStreak`] = 0;
      updates[`trivia/players/${pId}/correctCount`] = 0;
      updates[`trivia/players/${pId}/questionsAnswered`] = 0;
      updates[`trivia/players/${pId}/fastestTime`] = 999999;
      updates[`trivia/players/${pId}/comebackPoints`] = 0;
      updates[`trivia/players/${pId}/totalTime`] = 0;
      updates[`trivia/players/${pId}/avgTime`] = 0;
      updates[`trivia/players/${pId}/idleCount`] = 0;
    });
    await update(ref(db), updates);
    navigate('/admin/games/quiz/setup', { state: { retainRoom: true, roomCode } });
  };

  const handleEndGame = async () => {
    const updates = {};
    updates['trivia/room/status'] = 'CLOSED';
    updates['trivia/gameState/status'] = 'CLOSED';
    await update(ref(db), updates);
    navigate('/admin/games/quiz');
  };

  const kickPlayer = async (id) => {
    if (window.confirm(t("Kick this player?", "このプレイヤーをキックしますか？"))) {
      await remove(ref(db, `trivia/players/${id}`));
    }
  };

  useEffect(() => {
    if (!roomCode) {
      navigate('/admin/games/quiz');
    }
  }, [roomCode, navigate]);

  if (!roomCode) return null;

  return (
    <div className="flex flex-col h-[100dvh] animate-in fade-in duration-300">
      
      {/* Utility Header */}
      <div className="flex justify-between items-center bg-[var(--surface-color)] p-4 rounded-lg shadow-sm border-2 border-[var(--border-color)] mb-4 shrink-0 z-50 relative">
        <button onClick={handleEndGame} className="text-red-500 hover:underline font-bold">
          ✕ {phase === 'LOBBY' ? t("Cancel", "キャンセル") : t("End Game", "ゲームを終了")}
        </button>
        
        <div className="flex items-center gap-4">
          {phase === 'LOBBY' && (
            <button 
              onClick={startGame}
              disabled={Object.keys(players).length === 0}
              className="px-6 py-2 bg-green-500 text-white font-black rounded-xl shadow-md hover:bg-green-400 disabled:opacity-50 disabled:bg-gray-400 disabled:hover:bg-gray-400 transition-colors animate-in slide-in-from-right"
            >
              ▶ {t("Start Game", "ゲームスタート")}
            </button>
          )}

          {trackToLoad && phase !== 'LOBBY' && (
            <button 
              onClick={toggleMute} 
              className="flex items-center justify-center bg-[var(--border-color)] hover:bg-[var(--primary-color)] hover:text-white transition-colors px-4 py-2 rounded-full font-bold shadow-sm active:scale-95"
              title={isMuted ? "Unmute BGM" : "Mute BGM"}
            >
              {isMuted ? '🔇' : '🎵'}
            </button>
          )}
        </div>
      </div>

      {/* Main View Area */}
      <div className="flex-grow flex flex-col items-center justify-center bg-[var(--surface-color)] rounded-xl border-4 border-[var(--border-color)] overflow-hidden relative">
        
        {phase === 'LOBBY' && <HostLobby roomCode={roomCode} players={players} startGame={startGame} kickPlayer={kickPlayer} t={t} />}
        {phase === 'QUESTION' && <HostQuestion roomCode={roomCode} questionQueue={questionQueue} currentQIndex={currentQIndex} timeLeft={timeLeft} settings={settings} t={t} />}
        {phase === 'REVEAL' && <HostReveal questionQueue={questionQueue} currentQIndex={currentQIndex} answerStats={answerStats} settings={settings} t={t} nextPhase={() => { setPhase('LEADERBOARD'); update(ref(db, 'trivia/gameState'), { status: 'LEADERBOARD' }); }} />}
        {phase === 'LEADERBOARD' && <HostLeaderboard players={players} nextPhase={nextPhase} currentQIndex={currentQIndex} questionQueue={questionQueue} t={t} />}
        {phase === 'GAME_OVER' && <HostGameOver players={players} teamScores={teamScores} isTeamMode={isTeamMode} TEAM_CONFIG={TEAM_CONFIG} troubleWords={troubleWords} getTopTiers={getTopTiers} selectedAward={selectedAward} setSelectedAward={setSelectedAward} handlePlayAgainSame={handlePlayAgainSame} handlePlayAgainChange={handlePlayAgainChange} handleEndGame={handleEndGame} t={t} />}
      </div>
    </div>
  );
}

export default QuizHostLive;

