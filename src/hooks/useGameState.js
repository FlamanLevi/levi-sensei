import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../lib/firebase';

export function useGameState(playerId = null) {
  const [room, setRoom] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [players, setPlayers] = useState({});
  const [teamScores, setTeamScores] = useState({});
  const [responses, setResponses] = useState({});

  useEffect(() => {
    const roomRef = ref(db, 'trivia/room');
    const stateRef = ref(db, 'trivia/gameState');
    const playersRef = playerId ? ref(db, `trivia/players/${playerId}`) : ref(db, 'trivia/players');
    const teamsRef = ref(db, 'trivia/teamScores');
    // Isolate responses from gameState to prevent O(N^2) broadcasting
    const responsesRef = playerId ? ref(db, `trivia/responses/${playerId}`) : ref(db, 'trivia/responses');

    const unsubRoom = onValue(roomRef, (snap) => setRoom(snap.val() || null));
    const unsubState = onValue(stateRef, (snap) => setGameState(snap.val() || null));
    const unsubPlayers = onValue(playersRef, (snap) => {
      if (playerId) {
        setPlayers(snap.exists() ? { [playerId]: snap.val() } : {});
      } else {
        setPlayers(snap.val() || {});
      }
    });
    
    const unsubResponses = onValue(responsesRef, (snap) => {
      if (playerId) {
        setResponses(snap.exists() ? { [playerId]: snap.val() } : {});
      } else {
        setResponses(snap.val() || {});
      }
    });

    let unsubTeams = () => {};
    if (!playerId) {
       unsubTeams = onValue(teamsRef, (snap) => setTeamScores(snap.val() || {}));
    } else {
       setTeamScores({});
    }

    return () => {
      unsubRoom();
      unsubState();
      unsubPlayers();
      unsubResponses();
      unsubTeams();
    };
  }, [playerId]);

  return { room, gameState, players, teamScores, responses };
}
