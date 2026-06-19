import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { db } from '../lib/firebase';
import { ref, onDisconnect, set, onValue } from 'firebase/database';
import { useGameState } from '../hooks/useGameState';
import { OfflineBanner } from '../components/quiz/student/OfflineBanner';
import { StudentLobby } from '../components/quiz/student/StudentLobby';
import { StudentLive } from '../components/quiz/student/StudentLive';
import { StudentReveal } from '../components/quiz/student/StudentReveal';
import { StudentGameOver } from '../components/quiz/student/StudentGameOver';
import { StudentLeaderboard } from '../components/quiz/student/StudentLeaderboard';
import { executeItemAction } from '../lib/itemEngine';
import { push } from 'firebase/database';

function QuizStudentLive({ t, lang }) {
  const location = useLocation();
  const navigate = useNavigate();

  // Persist playerId in sessionStorage to handle accidental refreshes
  const [playerId] = useState(() => {
    const stateId = location.state?.playerId;
    if (stateId) {
      sessionStorage.setItem('current_quiz_player_id', stateId);
      return stateId;
    }
    return sessionStorage.getItem('current_quiz_player_id');
  });
  
  const { room, gameState, players, responses } = useGameState(playerId);
  const [isConnected, setIsConnected] = useState(true);
  const [timeOffset, setTimeOffset] = useState(0);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Derive answer state strictly tied to the current question number
  // This prevents race conditions where the UI updates to the next question before the previous response is wiped.
  const myResponse = responses?.[playerId];
  const hasAnswered = myResponse?.questionNumber === gameState?.questionNumber;
  const myAnswer = myResponse?.answer;

  const [isGameOver, setIsGameOver] = useState(false);

  useEffect(() => {
    if (gameState?.status === 'GAME_OVER') {
      setIsGameOver(true);
    }
  }, [gameState?.status]);

  // Kick out if no player ID or if room closes (unless they are viewing results)
  useEffect(() => {
    if (!playerId) {
      navigate('/play');
      return;
    }
    if (room?.status === 'CLOSED' && !isGameOver) {
      navigate('/play');
    }
  }, [playerId, room?.status, isGameOver, navigate]);

  // Clean up player object on disconnect
  useEffect(() => {
    if (playerId) {
      const playerRef = ref(db, `trivia/players/${playerId}`);
      if (room?.status === 'LIVE') {
        onDisconnect(playerRef).cancel();
      } else {
        onDisconnect(playerRef).remove();
      }
    }
  }, [playerId, room?.status]);

  // Track connection status and time offset
  useEffect(() => {
    const connectedRef = ref(db, '.info/connected');
    const offsetRef = ref(db, '.info/serverTimeOffset');
    const unsub1 = onValue(connectedRef, (snap) => setIsConnected(snap.val() === true));
    const unsub2 = onValue(offsetRef, (snap) => setTimeOffset(snap.val() || 0));
    return () => { unsub1(); unsub2(); };
  }, []);


  const [localQuestionStartTime, setLocalQuestionStartTime] = useState(Date.now());

  useEffect(() => {
    if (gameState?.status === 'LIVE') {
      setLocalQuestionStartTime(Date.now());
      setIsSubmitting(false); // Reset lock on new question
    }
  }, [gameState?.status, gameState?.questionNumber]);

  const submitAnswer = async (optionId) => {
    if (hasAnswered || isSubmitting) return;
    setIsSubmitting(true);
    
    // Calculate time taken strictly from when the question appeared on their screen, ignoring network latency.
    const timeBonus = me?.activeBuffs?.time_freeze ? 5000 : 0;
    const actualTimeTaken = Math.max(0, Date.now() - localQuestionStartTime);
    const timeTaken = Math.max(0, actualTimeTaken - timeBonus);
    const qNum = gameState?.questionNumber;
    
    // Read Delay Guard (20% of time limit, max 2.5s)
    const timeLimitMs = (gameState?.settings?.timeLimit || 15) * 1000;
    const readDelayMs = Math.min(timeLimitMs * 0.2, 2500);
    if (actualTimeTaken < readDelayMs) {
      setIsSubmitting(false);
      return;
    }
    
    try {
      await set(ref(db, `trivia/responses/${playerId}`), {
        answer: optionId,
        timeTaken: timeTaken,
        questionNumber: qNum
      });
    } catch (e) {
      console.error(e);
      setIsSubmitting(false); // Unlock if transaction throws network error
    }
  };

  const handleUseItem = async () => {
     if (!me?.item) return;
     await executeItemAction(db, playerId, me, push);
  };

  // Randomized feedback messages based on performance
  const feedbackMessage = useMemo(() => {
    if (!gameState || gameState.status !== 'REVEAL') return "";
    
    const isCorrect = myAnswer === gameState.correctAnswer;
    const sortedPlayerIds = Object.keys(players).sort((a, b) => (players[b].score || 0) - (players[a].score || 0));
    const myRank = sortedPlayerIds.indexOf(playerId) + 1;

    const topTier = [
      t("You're a superstar!", "きみはスーパースターだ！"),
      t("Unstoppable!", "だれもとめられない！"),
      t("Amazing effort!", "すごいね！"),
      t("On fire!", "ぜっこうちょう！"),
      t("Top tier work!", "さいこうのデキだね！")
    ];
    const keepGoing = [
      t("Nice! Keep it up!", "いいね！そのちょうし！"),
      t("Great job!", "よくやったね！"),
      t("You got this!", "きみならできるよ！"),
      t("Keep climbing!", "もっと上をめざそう！"),
      t("Great catch-up!", "ナイス追い上げ！")
    ];
    const nextTime = [
      t("So close! Next time!", "おしい！つぎはいけるよ！"),
      t("Don't give up!", "あきらめないで！"),
      t("You'll get it next time!", "つぎはきっとだいじょうぶ！"),
      t("Keep your head up!", "つぎのチャンスをねらおう！"),
      t("Shake it off!", "きにせず次へいこう！")
    ];

    if (isCorrect) {
      return myRank <= 5 ? topTier[Math.floor(Math.random() * topTier.length)] : keepGoing[Math.floor(Math.random() * keepGoing.length)];
    }
    return nextTime[Math.floor(Math.random() * nextTime.length)];
  }, [gameState?.status, gameState?.questionNumber, myAnswer]);

  if (!playerId || !room) return null;

  const me = players[playerId];
  if (!me) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-6rem)] animate-in fade-in duration-300 px-4">
        <div className="w-full max-w-md bg-[var(--surface-color)] p-8 rounded-2xl shadow-xl border-4 border-red-500 text-center">
          <div className="text-6xl mb-4">🔌</div>
          <h2 className="text-3xl font-black text-red-500 mb-4">{t("Disconnected", "せつだんされました")}</h2>
          <p className="text-[var(--text-muted)] font-bold mb-8">
            {t("You were removed from the game because your connection dropped.", "つうしんがきれたため、ゲームから外れました。")}
          </p>
          <button
            onClick={() => navigate('/play')}
            className="w-full py-4 bg-[var(--primary-color)] text-white text-2xl font-bold rounded-xl shadow-lg hover:brightness-110 active:scale-95 transition-all"
          >
            {t("Return to Join Page", "参加ページにもどる")}
          </button>
        </div>
      </div>
    );
  }

  // The host now calculates ranks and points to next/prev during calculateScoresAndLeaderboard
  // because the student device only downloads their own player object for bandwidth efficiency.
  const myRank = me?.rank || 1;
  const totalPlayers = gameState?.totalPlayers || 1;
  const pointsToNext = me?.pointsToNext;
  const pointsAheadOfPrev = me?.pointsAheadOfPrev;

  const renderPhase = () => {
    if (room.status === 'LOBBY' || !gameState) {
      return <StudentLobby me={me} t={t} />;
    }
    if (gameState.status === 'LIVE') {
      return <StudentLive gameState={gameState} hasAnswered={hasAnswered} submitAnswer={submitAnswer} me={me} handleUseItem={handleUseItem} t={t} />;
    }
    if (gameState.status === 'REVEAL') {
      return <StudentReveal gameState={gameState} myAnswer={myAnswer} me={me} myRank={myRank} pointsToNext={pointsToNext} pointsAheadOfPrev={pointsAheadOfPrev} feedbackMessage={feedbackMessage} t={t} />;
    }
    if (gameState.status === 'GAME_OVER') {
      return <StudentGameOver me={me} myRank={myRank} totalPlayers={totalPlayers} players={players} t={t} navigate={navigate} />;
    }
    return <StudentLeaderboard me={me} myRank={myRank} pointsToNext={pointsToNext} pointsAheadOfPrev={pointsAheadOfPrev} t={t} />;
  };

  return (
    <>
      <OfflineBanner isConnected={isConnected} t={t} />
      {renderPhase()}
    </>
  );
}

export default QuizStudentLive;
