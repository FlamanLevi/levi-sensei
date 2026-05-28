import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { db } from '../lib/firebase';
import { ref, get, set, runTransaction, onValue, update } from 'firebase/database';
import { useAuth } from '../hooks/useAuth';
import schoolsData from '../data/schools.json';

function StudentJoin({ t, lang }) {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialPin = searchParams.get('pin') || '';
  
  const [step, setStep] = useState(1); // 1: PIN, 2: Profile Setup
  const [pin, setPin] = useState(initialPin);
  
  // Setup fields
  const [setupName, setSetupName] = useState('');
  const [setupClass, setSetupClass] = useState('');

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [roomData, setRoomData] = useState(null);
  const [gameType, setGameType] = useState(null); // 'trivia' or 'ohajiki'
  const [isConnected, setIsConnected] = useState(true);

  // Pre-fill name if it exists on their profile
  useEffect(() => {
    if (profile?.name) {
      setSetupName(profile.name);
    }
  }, [profile]);

  useEffect(() => {
    const connectedRef = ref(db, '.info/connected');
    const unsub = onValue(connectedRef, (snap) => {
      setIsConnected(snap.val() === true);
    });
    return () => unsub();
  }, []);

  const joinGame = async (room, nameToUse, classNameToUse, type) => {
    try {
      const playerId = user?.uid || `player_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      
      const existingPlayerSnap = await get(ref(db, `${type}/players/${playerId}`));
      if (existingPlayerSnap.exists()) {
         // They are reconnecting! Just update their name/activity
         await update(ref(db, `${type}/players/${playerId}`), {
             nickname: nameToUse.trim(),
             lastActive: Date.now(),
             avatar: profile?.equippedAvatar || null,
             color: profile?.equippedColor || null
         });
      } else {
         // New join
         if (type === 'trivia') {
           let teamId = null;
           if (room.gameMode !== 'individual') {
             const counterRef = ref(db, 'trivia/room/teamCounter');
             const result = await runTransaction(counterRef, (currentCount) => {
               return (currentCount || 0) + 1;
             });
             
             const count = (result.snapshot.val() || 1) - 1;
             const numTeams = room.gameMode === 'team2' ? 2 : 4;
             teamId = `team_${count % numTeams}`;
           }

           await set(ref(db, `trivia/players/${playerId}`), {
             nickname: nameToUse.trim(),
             teamId,
             score: 0,
             currentStreak: 0,
             maxStreak: 0,
             fastestTime: 999999,
             correctCount: 0,
             lastActive: Date.now(),
             avatar: profile?.equippedAvatar || null,
             color: profile?.equippedColor || null
           });
         } else if (type === 'ohajiki') {
           await set(ref(db, `ohajiki/players/${playerId}`), {
             nickname: nameToUse.trim(),
             board: {},
             lastActive: Date.now(),
             avatar: profile?.equippedAvatar || null,
             color: profile?.equippedColor || null
           });
         }
      }

      // Also ensure their profile is updated/saved to this school
      if (user) {
         await update(ref(db, `users/${user.uid}/profile`), {
            name: nameToUse.trim(),
            className: classNameToUse,
            schoolId: room.schoolId || 'unknown',
            coins: profile?.coins || 0,
            createdAt: profile?.createdAt || Date.now()
         });
      }

      if (type === 'trivia') {
        sessionStorage.setItem('current_quiz_player_id', playerId);
        navigate('/play/trivia', { state: { playerId } });
      } else if (type === 'ohajiki') {
        sessionStorage.setItem('current_ohajiki_player_id', playerId);
        navigate('/play/ohajiki', { state: { playerId } });
      }
    } catch (err) {
      setError(t("Failed to join game", "ゲームへの参加に失敗しました"));
      setIsLoading(false);
    }
  };

  const handlePinSubmit = async (e) => {
    e.preventDefault();
    if (pin.length !== 4) {
      setError(t("PIN must be 4 digits", "PINは4桁の数字です"));
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Check both games
      const [triviaRoomSnap, ohajikiRoomSnap] = await Promise.all([
        get(ref(db, 'trivia/room')),
        get(ref(db, 'ohajiki/room'))
      ]);

      const triviaRoom = triviaRoomSnap.val();
      const ohajikiRoom = ohajikiRoomSnap.val();

      let targetRoom = null;
      let targetType = null;

      if (triviaRoom && triviaRoom.roomCode === pin && triviaRoom.status === 'LOBBY') {
        targetRoom = triviaRoom;
        targetType = 'trivia';
      } else if (ohajikiRoom && ohajikiRoom.roomCode === pin && ohajikiRoom.status === 'LOBBY') {
        targetRoom = ohajikiRoom;
        targetType = 'ohajiki';
      }

      if (targetRoom) {
        
        // Lazy Initialization Check
        const roomSchoolId = targetRoom.schoolId || 'unknown';
        const hasValidProfile = profile?.name && profile?.className && profile?.schoolId === roomSchoolId;

        if (hasValidProfile) {
          // Join instantly
          await joinGame(targetRoom, profile.name, profile.className, targetType);
        } else {
          // Needs profile setup for this school
          setRoomData(targetRoom);
          setGameType(targetType);
          setStep(2);
          
          if (!setupClass && roomSchoolId !== 'unknown' && schoolsData.classes[roomSchoolId]) {
             setSetupClass(schoolsData.classes[roomSchoolId][0].id);
          }
          
          setIsLoading(false);
        }
      } else {
        setError(t("Invalid PIN or game already started", "無効なPIN、または既にゲームが開始されています"));
        setIsLoading(false);
      }
    } catch (err) {
      setError(t("Connection error", "接続エラー"));
      setIsLoading(false);
    }
  };

  const handleSetupSubmit = async (e) => {
    e.preventDefault();
    if (!setupName.trim() || !setupClass) {
      setError(t("Please fill out all fields", "すべての項目に入力してください"));
      return;
    }

    setIsLoading(true);
    setError('');
    await joinGame(roomData, setupName, setupClass, gameType);
  };

  const availableClasses = roomData?.schoolId ? (schoolsData.classes[roomData.schoolId] || []) : [];

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-6rem)] animate-in fade-in duration-300 px-4">
      {!isConnected && (
        <div className="fixed top-0 left-0 right-0 bg-red-600 text-white font-bold text-center py-3 z-[100] animate-pulse text-xl shadow-lg border-b-4 border-red-700">
          {t("📶 Reconnecting to Wi-Fi...", "📶 ネットワークに再接続中...")}
        </div>
      )}
      
      <div className="w-full max-w-md bg-[var(--surface-color)] p-8 rounded-2xl shadow-xl border-4 border-[var(--border-color)]">
        <h1 className="text-4xl font-black text-center text-[var(--primary-color)] mb-8">
          {step === 1 ? t("Join Game", "ゲームに参加") : t("Profile Setup", "プロフィール設定")}
        </h1>

        {step === 1 ? (
          <form onSubmit={handlePinSubmit} className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-lg font-bold text-[var(--text-color)] text-center">
                {t("Game PIN", "ゲームPIN")}
              </label>
              <input
                type="number"
                value={pin}
                onChange={(e) => setPin(e.target.value.slice(0, 4))}
                placeholder="1234"
                className="w-full text-center text-5xl font-black py-4 rounded-xl border-4 border-[var(--border-color)] bg-transparent text-[var(--text-color)] focus:border-[var(--primary-color)] focus:outline-none transition-colors"
                autoFocus
              />
            </div>

            {error && <p className="text-red-500 font-bold text-center">{error}</p>}

            <button
              type="submit"
              disabled={isLoading || pin.length !== 4}
              className="w-full py-4 bg-[var(--primary-color)] text-white text-2xl font-bold rounded-xl shadow-lg hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 mt-4"
            >
              {isLoading ? t("Loading...", "読み込み中...") : t("Enter", "決定")}
            </button>
            
            <Link to="/" className="text-center text-[var(--text-muted)] hover:underline mt-4 font-bold">
              {t("Cancel", "キャンセル")}
            </Link>
          </form>
        ) : (
          <form onSubmit={handleSetupSubmit} className="flex flex-col gap-6 animate-in slide-in-from-right-4 duration-300">
            <div className="flex flex-col gap-2">
              <label className="text-lg font-bold text-[var(--text-color)] text-center">
                {t("What is your name?", "なまえをおしえてね")}
              </label>
              <input
                type="text"
                value={setupName}
                onChange={(e) => setSetupName(e.target.value)}
                placeholder="Levi"
                maxLength={15}
                className="w-full text-center text-3xl font-bold py-4 rounded-xl border-4 border-[var(--border-color)] bg-transparent text-[var(--text-color)] focus:border-[var(--primary-color)] focus:outline-none transition-colors"
                autoFocus
              />
            </div>

            {availableClasses.length > 0 && (
              <div className="flex flex-col gap-2 mt-2">
                <label className="text-lg font-bold text-[var(--text-color)] text-center">
                  {t("What is your class?", "クラスはどこですか？")}
                </label>
                <select
                  value={setupClass}
                  onChange={(e) => setSetupClass(e.target.value)}
                  className="w-full text-center text-2xl font-bold py-4 rounded-xl border-4 border-[var(--border-color)] bg-transparent text-[var(--text-color)] focus:border-[var(--primary-color)] focus:outline-none transition-colors appearance-none cursor-pointer"
                >
                  <option value="" disabled>{t("Select Class...", "クラスを選択...")}</option>
                  {availableClasses.map(c => (
                    <option key={c.id} value={c.id} className="bg-[var(--surface-color)] text-[var(--text-color)]">
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {error && <p className="text-red-500 font-bold text-center">{error}</p>}

            {!user && (
              <div className="bg-red-100 text-red-600 p-3 rounded-lg text-center font-bold text-sm">
                ⚠️ Error: Could not connect to Authentication.
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !setupName.trim() || (availableClasses.length > 0 && !setupClass) || !user}
              className="w-full py-4 bg-green-500 text-white text-2xl font-bold rounded-xl shadow-lg hover:bg-green-600 active:scale-95 transition-all disabled:opacity-50 mt-4"
            >
              {isLoading ? t("Joining...", "参加中...") : t("Save & Join!", "ほぞんして参加！")}
            </button>
            
            <button 
              type="button"
              onClick={() => { setStep(1); setPin(''); setError(''); }}
              className="text-center text-[var(--text-muted)] hover:underline mt-2 font-bold"
            >
              {t("Back", "戻る")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default StudentJoin;
