import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { db, auth } from '../lib/firebase';
import { ref, onValue, get } from 'firebase/database';
import { motion, AnimatePresence } from 'framer-motion';
import schoolsData from '../data/schools.json';

export default function ClassWars({ t, lang }) {
  const [activeSchoolId, setActiveSchoolId] = useState(null);
  const [classScores, setClassScores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Fetch Teacher's Active School
    const fetchTeacherSchool = async () => {
      if (auth.currentUser) {
        const snap = await get(ref(db, `users/${auth.currentUser.uid}/teacherProfile`));
        if (snap.exists() && snap.val().schoolId) {
          setActiveSchoolId(snap.val().schoolId);
        } else {
          setActiveSchoolId('unknown');
        }
      }
    };
    fetchTeacherSchool();
  }, []);

  useEffect(() => {
    if (!activeSchoolId || activeSchoolId === 'unknown') {
      setLoading(false);
      return;
    }

    // 2. Fetch all users and calculate scores
    const usersRef = ref(db, 'users');
    const unsub = onValue(usersRef, (snap) => {
      if (snap.exists()) {
        const users = snap.val();
        const classTotals = {};

        Object.keys(users).forEach(uid => {
          const profile = users[uid].profile;
          if (profile && profile.schoolId === activeSchoolId && profile.className) {
            if (!classTotals[profile.className]) {
              classTotals[profile.className] = 0;
            }
            // Use XP if available (lifetime points), otherwise fallback to coins
            classTotals[profile.className] += (profile.xp || profile.coins || 0);
          }
        });

        // 3. Map to Array and Sort
        const schoolClasses = schoolsData.classes[activeSchoolId] || [];
        
        const sorted = Object.keys(classTotals).map(classId => {
          const classInfo = schoolClasses.find(c => c.id === classId);
          return {
            id: classId,
            name: classInfo ? classInfo.name : classId,
            grade: classInfo ? classInfo.grade : 'unknown',
            score: classTotals[classId]
          };
        }).sort((a, b) => b.score - a.score);

        setClassScores(sorted);
      } else {
        setClassScores([]);
      }
      setLoading(false);
    });

    return () => unsub();
  }, [activeSchoolId]);

  const maxScore = useMemo(() => {
    return classScores.length > 0 ? classScores[0].score : 1;
  }, [classScores]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <span className="text-4xl animate-bounce">🏆</span>
      </div>
    );
  }

  if (activeSchoolId === 'unknown' || !activeSchoolId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
        <span className="text-6xl mb-4">🏫</span>
        <h2 className="text-3xl font-black text-red-500">
          {t("No School Selected", "学校が選択されていません")}
        </h2>
        <p className="text-[var(--text-muted)] font-bold text-lg max-w-md">
          {t("Please go to the Teacher Portal and select your active school to view its leaderboard.", "先生用ポータルに戻り、対象の学校を選択してください。")}
        </p>
        <Link to="/admin" className="mt-4 px-6 py-3 bg-[var(--primary-color)] text-white font-bold rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all">
          {t("Back to Portal", "ポータルに戻る")}
        </Link>
      </div>
    );
  }

  const schoolName = schoolsData.schools.find(s => s.id === activeSchoolId)?.name_en || activeSchoolId;

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-300 w-full max-w-6xl mx-auto px-4">
      
      {/* Header */}
      <div className="flex flex-col gap-2 border-b-2 border-[var(--border-color)] pb-6 relative overflow-hidden rounded-2xl bg-gradient-to-r from-yellow-400 to-orange-500 p-8 shadow-lg">
        <Link to="/admin/tools" className="text-yellow-900 hover:text-white hover:underline font-bold text-lg flex items-center gap-2 relative z-10 w-fit">
          ← {t("Back to Tools", "ツールに戻る")}
        </Link>
        <div className="relative z-10 mt-4">
          <h2 className="text-5xl font-black text-white drop-shadow-md">
            {t("Global Class Wars", "クラスウォーズ")}
          </h2>
          <p className="text-yellow-100 text-2xl font-bold mt-2 drop-shadow-sm flex items-center gap-2">
            <span>📍</span> {schoolName}
          </p>
        </div>
        <div className="absolute right-[-20px] top-[-20px] text-[150px] opacity-20 transform rotate-12">
          🏆
        </div>
      </div>

      {classScores.length === 0 ? (
        <div className="text-center py-20">
          <span className="text-6xl opacity-50 block mb-4">💤</span>
          <h3 className="text-2xl font-bold text-[var(--text-muted)]">
            {t("No points earned yet!", "まだポイントがありません！")}
          </h3>
          <p className="text-[var(--text-muted)] mt-2">
            {t("Host a game and let the battle begin.", "ゲームをホストしてバトルを始めよう。")}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          
          {/* Top 3 Podium (Left Column on Desktop) */}
          <div className="md:col-span-5 flex flex-col justify-end bg-[var(--surface-color)] p-6 rounded-3xl border-4 border-[var(--border-color)] shadow-sm min-h-[400px]">
             <h3 className="text-center font-black text-2xl text-[var(--text-color)] mb-auto uppercase tracking-widest text-[var(--text-muted)]">
               Top 3
             </h3>
             <div className="flex items-end justify-center gap-2 md:gap-4 h-[300px] mt-8">
               {/* 2nd Place */}
               {classScores[1] && (
                 <div className="flex flex-col items-center flex-1">
                   <div className="text-3xl mb-2 font-black text-gray-400">{classScores[1].name}</div>
                   <div className="text-sm font-bold text-[var(--text-muted)] mb-2">{classScores[1].score.toLocaleString()} XP</div>
                   <motion.div 
                     initial={{ height: 0 }} 
                     animate={{ height: "60%" }} 
                     transition={{ duration: 1, type: "spring" }}
                     className="w-full bg-gradient-to-t from-gray-300 to-gray-100 rounded-t-lg border-2 border-b-0 border-gray-400 relative flex justify-center shadow-inner"
                   >
                     <span className="absolute top-4 text-4xl">🥈</span>
                   </motion.div>
                 </div>
               )}
               
               {/* 1st Place */}
               {classScores[0] && (
                 <div className="flex flex-col items-center flex-1">
                   <div className="text-4xl mb-2 font-black text-yellow-500">{classScores[0].name}</div>
                   <div className="text-sm font-bold text-yellow-600 mb-2">{classScores[0].score.toLocaleString()} XP</div>
                   <motion.div 
                     initial={{ height: 0 }} 
                     animate={{ height: "100%" }} 
                     transition={{ duration: 1, type: "spring", delay: 0.2 }}
                     className="w-full bg-gradient-to-t from-yellow-300 to-yellow-100 rounded-t-lg border-2 border-b-0 border-yellow-400 relative flex justify-center shadow-inner z-10"
                   >
                     <span className="absolute top-4 text-5xl">👑</span>
                   </motion.div>
                 </div>
               )}

               {/* 3rd Place */}
               {classScores[2] && (
                 <div className="flex flex-col items-center flex-1">
                   <div className="text-2xl mb-2 font-black text-orange-400">{classScores[2].name}</div>
                   <div className="text-sm font-bold text-[var(--text-muted)] mb-2">{classScores[2].score.toLocaleString()} XP</div>
                   <motion.div 
                     initial={{ height: 0 }} 
                     animate={{ height: "40%" }} 
                     transition={{ duration: 1, type: "spring", delay: 0.1 }}
                     className="w-full bg-gradient-to-t from-orange-300 to-orange-100 rounded-t-lg border-2 border-b-0 border-orange-400 relative flex justify-center shadow-inner"
                   >
                     <span className="absolute top-4 text-3xl">🥉</span>
                   </motion.div>
                 </div>
               )}
             </div>
          </div>

          {/* Full Leaderboard List (Right Column on Desktop) */}
          <div className="md:col-span-7 flex flex-col gap-3">
             {classScores.map((c, index) => (
               <motion.div 
                 key={c.id}
                 initial={{ opacity: 0, x: 20 }}
                 animate={{ opacity: 1, x: 0 }}
                 transition={{ delay: index * 0.1 }}
                 className="flex items-center gap-4 bg-[var(--surface-color)] p-4 rounded-2xl border-2 border-[var(--border-color)] shadow-sm relative overflow-hidden"
               >
                 {/* Progress Bar Background */}
                 <div 
                   className="absolute left-0 top-0 bottom-0 bg-[var(--primary-color)] opacity-10 transition-all duration-1000"
                   style={{ width: `${Math.max(5, (c.score / maxScore) * 100)}%` }}
                 />
                 
                 <div className="w-10 h-10 rounded-full bg-[var(--border-color)] flex items-center justify-center font-black text-lg text-[var(--text-muted)] z-10 shrink-0">
                   {index + 1}
                 </div>
                 
                 <div className="flex-1 z-10">
                   <h3 className="text-2xl font-black text-[var(--text-color)]">{c.name}</h3>
                 </div>

                 <div className="flex items-center gap-2 z-10">
                   <span className="text-2xl font-black text-[var(--primary-color)]">{c.score.toLocaleString()}</span>
                   <span className="text-sm font-bold text-[var(--text-muted)] uppercase">XP</span>
                 </div>
               </motion.div>
             ))}
          </div>

        </div>
      )}
    </div>
  );
}
