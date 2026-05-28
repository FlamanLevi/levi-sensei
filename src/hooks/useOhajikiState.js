import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../lib/firebase';

export function useOhajikiState(playerId = null) {
  const [room, setRoom] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [players, setPlayers] = useState({});

  useEffect(() => {
    const roomRef = ref(db, 'ohajiki/room');
    const stateRef = ref(db, 'ohajiki/gameState');
    const playersRef = playerId ? ref(db, `ohajiki/players/${playerId}`) : ref(db, 'ohajiki/players');

    const unsubRoom = onValue(roomRef, (snap) => setRoom(snap.val() || null));
    const unsubState = onValue(stateRef, (snap) => setGameState(snap.val() || null));
    const unsubPlayers = onValue(playersRef, (snap) => {
      if (playerId) {
        setPlayers(snap.exists() ? { [playerId]: snap.val() } : {});
      } else {
        setPlayers(snap.val() || {});
      }
    });

    return () => {
      unsubRoom();
      unsubState();
      unsubPlayers();
    };
  }, [playerId]);

  return { room, gameState, players };
}
