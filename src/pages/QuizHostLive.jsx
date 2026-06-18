import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import flatVocab from '../data/normalized_vocabulary.json';
import { isWordInUnit } from '../utils/vocabulary';
import { db } from '../lib/firebase';
import { ref, update, set, remove, onDisconnect, get, push, runTransaction, onValue, serverTimestamp } from 'firebase/database';
import { useGameState } from '../hooks/useGameState';
import { useQuizHost } from '../hooks/useQuizHost';
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
  const [selectedAward, setSelectedAward] = useState(null); // 'streak', 'correct', 'fastest'
  
  const { room, gameState, players, teamScores, responses } = useGameState();

  const {
    currentQIndex,
    setCurrentQIndex,
    timeLeft,
    phase,
    setPhase,
    answerStats,
    setAnswerStats,
    troubleWords,
    setTroubleWords,
    revealAnswer,
    startNextQuestion,
    startGame
  } = useQuizHost(questionQueue, settings, players, teamScores);

  const totalQuestions = questionQueue.length > 0 ? questionQueue.length : 10;
  const timeLimitSecs = settings?.timeLimit ? settings.timeLimit / 1000 : 15;
  const estimatedGameTime = totalQuestions * (timeLimitSecs + 15); // Add 15s for Reveal & Leaderboard screens

  const trackToLoad = (!settings?.bgm || settings.bgm === 'none') ? null : settings.bgm;
  const isPlaying = phase !== 'LOBBY';
  const { isMuted, toggleMute } = useBGM(trackToLoad, isPlaying, estimatedGameTime);

  // Helper for End Game Awards
  const getTopTiers = (statKey, isAscending = false, requireAccuracy = false) => {
    const allValues = Object.values(players)
      .filter(p => requireAccuracy ? p.correctCount === p.questionsAnswered && p.questionsAnswered > 0 : true)
      .map(p => p[statKey] || 0)
      .filter(val => statKey === 'avgTime' || statKey === 'fastestTime' ? val > 0 && val < 999999 : val > 0);
    
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
    
    // D. Prevent consecutive same-index correct answers to defeat "button mashing"
    let lastCorrectIndex = -1;
    finalQueue.forEach(q => {
      let currentIndex = q.options.findIndex(opt => opt.id === q.target.id);
      if (currentIndex === lastCorrectIndex) {
        // Swap the correct answer with a randomly chosen distractor
        let newIndex = Math.floor(Math.random() * q.options.length);
        while (newIndex === lastCorrectIndex) {
          newIndex = Math.floor(Math.random() * q.options.length);
        }
        const temp = q.options[currentIndex];
        q.options[currentIndex] = q.options[newIndex];
        q.options[newIndex] = temp;
        
        lastCorrectIndex = newIndex;
      } else {
        lastCorrectIndex = currentIndex;
      }
    });

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
        const timeout = setTimeout(() => revealAnswer(questionQueue[currentQIndex], currentQIndex), 500);
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

        // The awarding of Coins, XP, and Match History is now handled securely by the onGameComplete Cloud Function.


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
            <>
              <button
                onClick={async () => {
                  if (window.confirm(t("Force all connected iPads to refresh their browsers instantly?", "すべての接続中のiPadのブラウザを強制的に更新しますか？"))) {
                    await update(ref(db), { 'app/settings/version': Date.now() });
                  }
                }}
                className="px-4 py-2 bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-500 hover:text-white dark:hover:bg-red-600 font-bold rounded-xl shadow-sm transition-all border border-red-200 dark:border-red-800 flex items-center gap-2"
                title={t("Force Refresh All iPads", "全iPadを強制更新")}
              >
                🔄 <span className="hidden sm:inline">{t("Refresh iPads", "iPadを更新")}</span>
              </button>
              
              <button 
                onClick={startGame}
                disabled={Object.keys(players).length === 0}
                className="px-6 py-2 bg-green-500 text-white font-black rounded-xl shadow-md hover:bg-green-400 disabled:opacity-50 disabled:bg-gray-400 disabled:hover:bg-gray-400 transition-colors animate-in slide-in-from-right"
              >
                ▶ {t("Start Game", "ゲームスタート")}
              </button>
            </>
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

