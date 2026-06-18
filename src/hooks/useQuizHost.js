import { useState, useCallback, useRef, useEffect } from 'react';
import { ref, update, serverTimestamp } from 'firebase/database';
import { db } from '../lib/firebase';
import { calculateScoresAndLeaderboard } from '../lib/quizEngine';

export const useQuizHost = (questionQueue, settings, players, teamScores) => {
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [phase, setPhase] = useState('LOBBY'); // LOBBY, QUESTION, REVEAL, LEADERBOARD, GAME_OVER
  const [answerStats, setAnswerStats] = useState({});
  const [troubleWords, setTroubleWords] = useState([]);

  const timerRef = useRef(null);
  const hasRevealedRef = useRef(false);

  // Clean up timer on unmount
  useEffect(() => {
    return () => clearInterval(timerRef.current);
  }, []);

  const revealAnswer = useCallback(async (q, overrideIndex) => {
    if (hasRevealedRef.current) return;
    hasRevealedRef.current = true;

    setPhase('REVEAL');
    clearInterval(timerRef.current);

    await update(ref(db, 'trivia/gameState'), {
      status: "REVEAL",
      correctAnswer: q.target.id
    });

    // Wait a brief moment to ensure all late responses were written, then calculate score.
    setTimeout(() => {
       calculateScoresAndLeaderboard({
           q,
           currentQIndex: overrideIndex !== undefined ? overrideIndex : currentQIndex,
           players,
           teamScores,
           settings,
           setAnswerStats,
           setTroubleWords
       });
    }, 1000);
  }, [currentQIndex, players, teamScores, settings]);

  const startNextQuestion = useCallback(async (index) => {
    setCurrentQIndex(index);
    const q = questionQueue[index];
    
    // Wipe responses and single-use buffs from previous question
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
    updates['trivia/gameState/displayRules'] = q.optionFormats;
    updates['trivia/gameState/promptFormats'] = q.promptFormats;
    updates['trivia/gameState/options'] = q.options;
    updates['trivia/gameState/targetId'] = q.target.id;
    updates['trivia/gameState/totalQuestions'] = questionQueue.length;
    updates['trivia/gameState/startTime'] = serverTimestamp();

    await update(ref(db), updates);

    hasRevealedRef.current = false;
    setPhase('QUESTION');
    setAnswerStats({});
    
    // Start local timer with absolute timestamp to prevent background throttling issues
    clearInterval(timerRef.current);
    const endTime = Date.now() + settings.timeLimit;
    setTimeLeft(settings.timeLimit);
    
    timerRef.current = setInterval(() => {
      const remaining = endTime - Date.now();
      if (remaining <= 0) {
        clearInterval(timerRef.current);
        setTimeLeft(0);
        revealAnswer(q, index);
      } else {
        setTimeLeft(remaining);
      }
    }, 100);
  }, [questionQueue, settings, players, revealAnswer]);

  const startGame = useCallback(async () => {
    await update(ref(db, 'trivia/room'), { status: "LIVE" });
    setPhase('QUESTION');
    startNextQuestion(0);
  }, [startNextQuestion]);

  return {
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
  };
};
