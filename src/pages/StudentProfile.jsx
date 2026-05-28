import { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { db } from '../lib/firebase';
import { ref, update, runTransaction } from 'firebase/database';
import schoolsData from '../data/schools.json';
import { shopData } from '../data/shop';
import { Avatar, PlayerCard } from '../components/Avatar';
import { motion } from 'framer-motion';

export default function StudentProfile({ t, lang }) {
  const { user, profile, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('avatars'); // 'avatars', 'colors', 'inventory', 'history'
  const [matchHistory, setMatchHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Load Match History on demand
  useEffect(() => {
     if (activeTab === 'history' && matchHistory.length === 0 && user?.uid) {
        setLoadingHistory(true);
        import('firebase/database').then(({ get, ref, query, orderByChild, limitToLast }) => {
           const historyRef = query(ref(db, `users/${user.uid}/matchHistory`), orderByChild('timestamp'), limitToLast(50));
           get(historyRef).then(snap => {
               const data = snap.val();
               if (data) {
                  const sorted = Object.values(data).sort((a, b) => b.timestamp - a.timestamp);
                  setMatchHistory(sorted);
               }
               setLoadingHistory(false);
           }).catch(e => {
               console.error(e);
               setLoadingHistory(false);
           });
        });
     }
  }, [activeTab, user?.uid, matchHistory.length]);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-12rem)] flex items-center justify-center">
        <div className="text-2xl font-bold text-[var(--primary-color)] animate-pulse">
          {t("Loading Profile...", "プロフィールを読み込み中...")}
        </div>
      </div>
    );
  }

  if (!profile || !profile.name) {
    return <Navigate to="/" replace />;
  }

  let displayClass = profile.className;
  if (profile.schoolId && schoolsData.classes[profile.schoolId]) {
    const classObj = schoolsData.classes[profile.schoolId].find(c => c.id === profile.className);
    if (classObj) {
      displayClass = classObj.name;
    }
  }

  const unlockedItems = Array.isArray(profile.unlockedItems) 
    ? profile.unlockedItems 
    : (profile.unlockedItems ? Object.values(profile.unlockedItems) : []);
  const coins = profile.coins || 0;

  const handleBuyItem = async (item, cost, type) => {
    if (unlockedItems.includes(item.id)) return;
    if (coins < cost) {
      alert(t("Not enough coins!", "コインが足りません！"));
      return;
    }
    
    if (!window.confirm(t(`Buy ${item.name} for ${cost} coins?`, `${item.name}を${cost}コインで買いますか？`))) return;

    setIsProcessing(true);
    try {
      await runTransaction(ref(db, `users/${user.uid}/profile`), (currProfile) => {
        if (!currProfile) return currProfile;
        currProfile.coins = (currProfile.coins || 0) - cost;
        if (!currProfile.unlockedItems) {
            currProfile.unlockedItems = [];
        } else if (!Array.isArray(currProfile.unlockedItems)) {
            currProfile.unlockedItems = Object.values(currProfile.unlockedItems);
        }
        currProfile.unlockedItems.push(item.id);
        
        // Auto-equip upon purchase!
        if (type === 'avatar') {
            currProfile.equippedAvatar = item.id;
        } else if (type === 'color') {
            currProfile.equippedColor = item.id;
        }

        return currProfile;
      });
    } catch(e) {
      console.error(e);
      alert(t("Transaction failed.", "エラーが発生しました。"));
    }
    setIsProcessing(false);
  };

  const handleEquip = async (type, id) => {
    try {
       const updates = {};
       if (type === 'avatar') {
           updates[`users/${user.uid}/profile/equippedAvatar`] = id === profile.equippedAvatar ? null : id;
       } else if (type === 'color') {
           updates[`users/${user.uid}/profile/equippedColor`] = id === profile.equippedColor ? null : id;
       }
       await update(ref(db), updates);
    } catch(e) {
       console.error(e);
    }
  };

  // Build full inventory
  const myAvatars = [];
  shopData.avatars.forEach(cat => {
      cat.items.forEach(item => {
          if (unlockedItems.includes(item.id)) {
              myAvatars.push({ ...item, poolColor: cat.color, poolName: cat.name });
          }
      });
  });

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-300 w-full max-w-4xl mx-auto px-4 mt-8 pb-32">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-[var(--border-color)] pb-4">
        <Link to="/" className="text-[var(--primary-color)] hover:underline font-bold text-lg flex items-center gap-2">
          ← {t("Back Home", "ホームにもどる")}
        </Link>
        <button onClick={() => {
            if(window.confirm(t("Are you sure you want to reset your profile?", "プロフィールをリセットしますか？"))) {
              update(ref(db, `users/${user.uid}/profile`), { name: null, className: null, schoolId: null });
            }
          }} 
          className="text-[var(--text-muted)] hover:text-red-500 font-bold text-sm transition-colors"
        >
          {t("Reset Profile", "プロフィールをリセット")}
        </button>
      </div>

      {/* ID Card Display */}
      <div className="bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded-3xl p-1 shadow-xl overflow-hidden relative group">
        <PlayerCard profile={profile} className="p-8 flex flex-col md:flex-row items-center gap-8 relative z-10 w-full min-h-[160px]">
          <Avatar profile={profile} className="w-32 h-32 text-6xl border-4 border-white dark:border-gray-800" />
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-5xl font-black tracking-tight mb-2">
              {profile.name}
            </h1>
            <div className="inline-flex items-center gap-2 bg-black/10 dark:bg-white/10 px-4 py-1.5 rounded-full font-bold">
              <span>🎓</span> {displayClass}
            </div>
          </div>
          
          <div className="bg-white/80 dark:bg-black/50 border-2 border-black/10 rounded-2xl p-6 flex flex-col items-center min-w-[160px] shadow-sm">
            <span className="opacity-80 font-black text-sm uppercase tracking-wider mb-1">
              {t("My Coins", "マイコイン")}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-3xl">🪙</span>
              <motion.span 
                key={coins}
                initial={{ scale: 1.5, color: '#eab308' }}
                animate={{ scale: 1, color: 'inherit' }}
                className="text-4xl font-black"
              >
                {coins}
              </motion.span>
            </div>
          </div>
        </PlayerCard>
      </div>

      {/* Shop & Inventory */}
      <div className="bg-[var(--surface-color)] rounded-3xl border-2 border-[var(--border-color)] shadow-sm overflow-hidden">
         {/* Tabs */}
         <div className="flex border-b-2 border-[var(--border-color)] bg-gray-50 dark:bg-gray-800/50">
            <button 
              onClick={() => setActiveTab('avatars')}
              className={`flex-1 py-4 font-black text-lg transition-colors ${activeTab === 'avatars' ? 'bg-[var(--primary-color)] text-white' : 'text-[var(--text-muted)] hover:bg-gray-200 dark:hover:bg-gray-700'}`}
            >
              🏪 {t("Avatars", "アバター")}
            </button>
            <button 
              onClick={() => setActiveTab('colors')}
              className={`flex-1 py-4 font-black text-lg transition-colors ${activeTab === 'colors' ? 'bg-[var(--primary-color)] text-white' : 'text-[var(--text-muted)] hover:bg-gray-200 dark:hover:bg-gray-700'}`}
            >
              🎨 {t("Colors", "色")}
            </button>
            <button 
              onClick={() => setActiveTab('inventory')}
              className={`flex-1 py-4 font-black text-sm md:text-lg transition-colors ${activeTab === 'inventory' ? 'bg-[var(--primary-color)] text-white' : 'text-[var(--text-muted)] hover:bg-gray-200 dark:hover:bg-gray-700'}`}
            >
              🎒 {t("My Items", "持ち物")}
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={`flex-1 py-4 font-black text-sm md:text-lg transition-colors ${activeTab === 'history' ? 'bg-[var(--primary-color)] text-white' : 'text-[var(--text-muted)] hover:bg-gray-200 dark:hover:bg-gray-700'}`}
            >
              📜 {t("History", "履歴")}
            </button>
         </div>

         {/* Content */}
         <div className="p-6 md:p-8 min-h-[400px]">
            {activeTab === 'avatars' && (
              <div className="flex flex-col gap-10">
                 <div>
                   <h2 className="text-3xl font-black text-[var(--text-color)] mb-2">{t("Avatar Shop", "アバターショップ")}</h2>
                   <p className="text-[var(--text-muted)] font-bold mb-8">
                     {t("Buy avatars directly with your coins! New tiers cost more coins.", "コインで好きなアバターを買おう！レアなアバターほど高いよ。")}
                   </p>
                 </div>
                 
                 {shopData.avatars.map((category) => (
                    <div key={category.id} className="border-t-2 border-[var(--border-color)] pt-6">
                       <div className="flex items-center justify-between mb-4">
                         <h3 className="text-xl font-black">{t(category.name, category.name)}</h3>
                         <span className="bg-yellow-100 text-yellow-800 font-bold px-3 py-1 rounded-full text-sm">
                           🪙 {category.cost}
                         </span>
                       </div>
                       
                       <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                          {category.items.map(item => {
                             const isUnlocked = unlockedItems.includes(item.id);
                             const isEquipped = profile.equippedAvatar === item.id;
                             
                             return (
                               <div key={item.id} className={`p-2 rounded-2xl border-4 flex flex-col items-center gap-2 ${category.color} ${isEquipped ? 'ring-4 ring-[var(--primary-color)] ring-offset-4 ring-offset-[var(--surface-color)] shadow-xl scale-105' : ''}`}>
                                  <div className="text-4xl my-2">{item.value}</div>
                                  
                                  {isUnlocked ? (
                                     <button 
                                       onClick={() => handleEquip('avatar', item.id)}
                                       className={`w-full py-1 rounded-xl text-sm font-bold transition-all ${isEquipped ? 'bg-black/20' : 'bg-white/50 hover:bg-white/80'} text-current`}
                                     >
                                       {isEquipped ? t("Equipped", "装備中") : t("Equip", "装備する")}
                                     </button>
                                  ) : (
                                     <button 
                                       onClick={() => handleBuyItem(item, category.cost, 'avatar')}
                                       disabled={isProcessing || coins < category.cost}
                                       className="w-full py-1 rounded-xl text-sm font-bold bg-white/80 hover:bg-white text-current transition-all disabled:opacity-50 flex justify-center items-center gap-1"
                                     >
                                       🪙 {category.cost}
                                     </button>
                                  )}
                               </div>
                             );
                          })}
                       </div>
                    </div>
                 ))}
              </div>
            )}

            {activeTab === 'colors' && (
              <div>
                 <h2 className="text-2xl font-black text-[var(--text-color)] mb-6">{t("Player Card Colors", "プレイヤーカードの色")}</h2>
                 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {shopData.colors.filter(c => c.cost > 0).map(color => {
                       const isUnlocked = unlockedItems.includes(color.id);
                       const isEquipped = profile.equippedColor === color.id;
                       
                       return (
                         <div key={color.id} className={`p-4 rounded-2xl border-4 flex flex-col gap-3 ${color.value}`}>
                            <div className="font-black text-xl text-center">{color.name}</div>
                            
                            {isUnlocked ? (
                               <button 
                                 onClick={() => handleEquip('color', color.id)}
                                 className={`w-full py-2 rounded-xl font-bold transition-all ${isEquipped ? 'bg-black/20' : 'bg-white/50 hover:bg-white/80'} text-current`}
                               >
                                 {isEquipped ? t("Equipped", "装備中") : t("Equip", "装備する")}
                               </button>
                            ) : (
                               <button 
                                 onClick={() => handleBuyItem(color, color.cost, 'color')}
                                 disabled={isProcessing || coins < color.cost}
                                 className="w-full py-2 rounded-xl font-bold bg-white/80 hover:bg-white text-current transition-all disabled:opacity-50 flex justify-center items-center gap-1"
                               >
                                 🪙 {color.cost}
                               </button>
                            )}
                         </div>
                       );
                    })}
                 </div>
              </div>
            )}

            {activeTab === 'inventory' && (
              <div>
                 <h2 className="text-2xl font-black text-[var(--text-color)] mb-6">{t("My Avatars", "マイアバター")}</h2>
                 {myAvatars.length === 0 ? (
                    <div className="text-center py-12 text-[var(--text-muted)] font-bold">
                       {t("You haven't unlocked any avatars yet. Head to the shop!", "まだアバターを持っていません。ショップへ行こう！")}
                    </div>
                 ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
                       {myAvatars.map(av => {
                          const isEquipped = profile.equippedAvatar === av.id;
                          return (
                            <button
                              key={av.id}
                              onClick={() => handleEquip('avatar', av.id)}
                              className={`aspect-square flex items-center justify-center text-4xl rounded-2xl border-4 transition-all hover:scale-105 ${av.poolColor} ${isEquipped ? 'ring-4 ring-[var(--primary-color)] ring-offset-4 ring-offset-[var(--surface-color)] shadow-xl scale-105' : 'opacity-80 hover:opacity-100'}`}
                            >
                              {av.value}
                            </button>
                          );
                       })}
                    </div>
                 )}

                 {/* Default Avatar */}
                 <div className="mt-8 pt-8 border-t-2 border-[var(--border-color)]">
                   <h3 className="text-lg font-bold text-[var(--text-color)] mb-4">{t("Default", "デフォルト")}</h3>
                   <div className="flex gap-4">
                      <button
                        onClick={() => handleEquip('avatar', null)}
                        className={`w-16 h-16 flex items-center justify-center text-2xl font-black rounded-full border-4 transition-all hover:scale-105 bg-[var(--border-color)] text-[var(--text-color)] border-white dark:border-gray-800 ${!profile.equippedAvatar ? 'ring-4 ring-[var(--primary-color)] ring-offset-4 ring-offset-[var(--surface-color)] shadow-xl' : 'opacity-80'}`}
                      >
                         {profile.name.charAt(0).toUpperCase()}
                      </button>
                      <button
                        onClick={() => handleEquip('color', null)}
                        className={`px-6 h-16 flex items-center justify-center font-bold rounded-2xl border-4 transition-all hover:scale-105 ${shopData.colors[0].value} ${!profile.equippedColor ? 'ring-4 ring-[var(--primary-color)] ring-offset-4 ring-offset-[var(--surface-color)] shadow-xl' : 'opacity-80'}`}
                      >
                         {t("Default Color", "デフォルトカラー")}
                      </button>
                   </div>
                 </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="flex flex-col gap-6">
                 <div>
                   <h2 className="text-3xl font-black text-[var(--text-color)] mb-2">{t("Match History", "試合履歴")}</h2>
                   <p className="text-[var(--text-muted)] font-bold mb-6">
                     {t("Review your past games and stats.", "過去の試合の成績を見よう。")}
                   </p>
                 </div>

                 {loadingHistory ? (
                    <div className="text-center py-12 text-[var(--text-muted)] font-bold animate-pulse">
                       {t("Loading history...", "読み込み中...")}
                    </div>
                 ) : matchHistory.length === 0 ? (
                    <div className="text-center py-12 text-[var(--text-muted)] font-bold">
                       {t("No matches played yet. Go play a game!", "まだ試合をしていません。ゲームをプレイしよう！")}
                    </div>
                 ) : (
                    <div className="flex flex-col gap-4">
                       {matchHistory.map((match, i) => (
                          <div key={i} className="bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-[var(--primary-color)] transition-colors">
                             <div className="flex items-center gap-4">
                                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black shrink-0 shadow-inner ${match.rank === 1 ? 'bg-yellow-400 text-yellow-900' : match.rank === 2 ? 'bg-gray-300 text-gray-800' : match.rank === 3 ? 'bg-orange-300 text-orange-900' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                                   #{match.rank}
                                </div>
                                <div className="flex flex-col">
                                   <span className="font-bold text-[var(--text-muted)] text-sm">
                                      {new Date(match.timestamp).toLocaleDateString()} {new Date(match.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                   </span>
                                   <span className="font-black text-xl">{match.score} pts</span>
                                </div>
                             </div>
                             
                             <div className="grid grid-cols-2 md:flex items-center gap-4 text-sm font-bold opacity-80">
                                <div className="flex items-center gap-1"><span className="text-lg">🎯</span> {match.accuracy}%</div>
                                <div className="flex items-center gap-1"><span className="text-lg">⚡</span> {match.fastestTime < 999999 ? (match.fastestTime / 1000).toFixed(1) + 's' : '-'}</div>
                                <div className="flex items-center gap-1"><span className="text-lg">⏱️</span> {match.avgTime ? (match.avgTime / 1000).toFixed(1) + 's' : '-'}</div>
                                {match.coinsEarned > 0 && <div className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400"><span className="text-lg">🪙</span> +{match.coinsEarned}</div>}
                             </div>
                          </div>
                       ))}
                    </div>
                 )}
              </div>
            )}
         </div>
      </div>
    </div>
  );
}
