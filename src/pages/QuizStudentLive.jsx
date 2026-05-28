import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { db } from '../lib/firebase';
import { ref, onDisconnect, runTransaction, onValue } from 'firebase/database';
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

  // Derive answer state directly from Firebase to survive accidental page refreshes
  const myResponse = responses?.[playerId];
  const hasAnswered = !!myResponse;
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

  // Track connection status
  useEffect(() => {
    const connectedRef = ref(db, '.info/connected');
    const unsub = onValue(connectedRef, (snap) => {
      setIsConnected(snap.val() === true);
    });
    return () => unsub();
  }, []);


  const submitAnswer = async (optionId) => {
    if (hasAnswered) return;
    
    const timeBonus = me?.activeBuffs?.time_freeze ? 5000 : 0;
    const timeTaken = Math.max(0, Date.now() - gameState.startTime - timeBonus);
    
    await runTransaction(ref(db, `trivia/responses/${playerId}`), (currentData) => {
      if (currentData) {
        return; // Abort transaction if answer already exists
      }
      return {
        answer: optionId,
        timeTaken: timeTaken
      };
    });
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

  // Determine rank based on current scores across all players
  const sortedPlayerIds = Object.keys(players).sort((a, b) => (players[b].score || 0) - (players[a].score || 0));
  const myRank = sortedPlayerIds.indexOf(playerId) + 1;
  const totalPlayers = sortedPlayerIds.length;

  let pointsToNext = null;
  let pointsAheadOfPrev = null;
  if (myRank > 1) {
     const playerAheadId = sortedPlayerIds[myRank - 2];
     pointsToNext = (players[playerAheadId]?.score || 0) - (me.score || 0);
  }
  if (myRank < sortedPlayerIds.length) {
     const playerBehindId = sortedPlayerIds[myRank];
     pointsAheadOfPrev = (me.score || 0) - (players[playerBehindId]?.score || 0);
  }

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
