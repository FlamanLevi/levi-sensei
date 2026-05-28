import Confetti from 'react-confetti';
import { RubyText } from '../../../components/RubyText';
import { motion } from 'framer-motion';

export const HostGameOver = ({ players, teamScores, isTeamMode, TEAM_CONFIG, troubleWords, getTopTiers, selectedAward, setSelectedAward, handleEndGame, handlePlayAgainSame, handlePlayAgainChange, t }) => {
  return (
    <div className="w-full h-full flex flex-col items-center p-8 relative overflow-y-auto">
       <Confetti width={window.innerWidth} height={window.innerHeight} recycle={false} numberOfPieces={500} />
       
       <div className="w-full max-w-7xl flex flex-col xl:flex-row gap-8 justify-center z-10">
         
          {/* Left Column: Overall Leaderboard */}
          <div className="flex-1 flex flex-col items-center">
            <h2 className="text-5xl font-black text-[var(--text-color)] mb-8 drop-shadow-sm">{t("Final Results", "最終結果")}</h2>
            
            {isTeamMode ? (
              <>
                {/* Top Teams */}
                <div className="w-full flex flex-col gap-4 mb-8">
                  {Object.entries(teamScores || {})
                    .sort((a, b) => (b[1].score || 0) - (a[1].score || 0))
                    .slice(0, 3)
                    .map(([tId, tData], idx) => {
                      const config = TEAM_CONFIG[tId] || TEAM_CONFIG.team_0;
                      return (
                        <div key={tId} className={`flex justify-between items-center px-6 py-4 rounded-2xl shadow-md font-bold text-2xl ${config.bg} border-4 ${config.border} ${idx === 0 ? 'scale-105 z-10' : ''}`}>
                          <div className="flex items-center gap-4">
                            <span className="text-3xl">{idx === 0 ? '🏆' : idx === 1 ? '🥈' : '🥉'}</span>
                            <span className={config.text}>{config.emoji} {config.name}</span>
                          </div>
                          <span className={config.text}>{tData.score || 0} {t("pts", "点")}</span>
                        </div>
                      );
                  })}
                </div>

                {/* Top MVPs across all teams */}
                <h3 className="text-3xl font-black text-[var(--text-muted)] mb-4">{t("Top Individual MVPs", "個人MVP")}</h3>
                <div className="w-full flex flex-col gap-3">
                  {Object.values(players)
                    .sort((a, b) => (b.score || 0) - (a.score || 0))
                    .slice(0, 3)
                    .map((p, idx) => {
                      const tConfig = TEAM_CONFIG[p.teamId] || { text: 'text-[var(--text-muted)]' };
                      return (
                        <div key={idx} className={`flex justify-between items-center px-6 py-3 rounded-xl shadow-sm border-2 border-[var(--border-color)] bg-[var(--surface-color)]`}>
                          <div className="flex items-center gap-4 font-bold text-xl">
                            <span className="text-2xl">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</span>
                            <span className="text-[var(--text-color)]">{p.nickname}</span>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-[var(--primary-color)] font-bold text-xl">{p.score || 0} {t("pts", "点")}</span>
                            <span className={`text-xs font-bold uppercase ${tConfig.text}`}>{TEAM_CONFIG[p.teamId]?.name || ''}</span>
                          </div>
                        </div>
                      );
                  })}
                </div>
              </>
            ) : (
              /* Solo Mode Top 5 */
              <div className="w-full flex flex-col gap-4">
                {Object.entries(players)
                  .map(([id, p]) => ({ id, ...p }))
                  .sort((a, b) => (b.score || 0) - (a.score || 0))
                  .slice(0, 5)
                  .map((p, idx) => (
                  <motion.div 
                    key={p.id} 
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ type: "spring", stiffness: 350, damping: 25, delay: idx * 0.15 }}
                    className={`flex justify-between items-center px-6 py-4 rounded-2xl shadow-md font-bold text-2xl ${idx === 0 ? 'bg-yellow-100 border-4 border-yellow-400 scale-105 z-10 text-black' : idx === 1 ? 'bg-gray-100 border-4 border-gray-300 text-black' : idx === 2 ? 'bg-orange-50 border-4 border-orange-300 text-black' : 'bg-[var(--surface-color)] border-2 border-[var(--border-color)]'}`}
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-3xl">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`}</span>
                      <span className={idx < 3 ? 'text-black' : 'text-[var(--text-color)]'}>{p.nickname}</span>
                    </div>
                    <span className={idx < 3 ? 'text-black' : 'text-[var(--primary-color)]'}>{p.score || 0} {t("pts", "点")}</span>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Trouble Words */}
            {troubleWords.length > 0 && troubleWords[0].percentWrong > 0 && (
              <div className="bg-red-50 p-6 rounded-2xl border-4 border-red-200 shadow-md text-left flex flex-col w-full mt-8">
                <h3 className="text-xl font-bold text-red-600 mb-4">⚠️ {t("Trouble Words Review", "苦手な単語の復習")}</h3>
                <ul className="flex flex-col gap-3">
                  {troubleWords.slice(0, 3).filter(tw => tw.percentWrong > 0).map((tw, i) => (
                    <li key={i} className="flex justify-between items-center gap-4 font-bold text-lg">
                      <span className="text-[var(--text-color)]">{tw.word.en} <span className="text-sm text-[var(--text-muted)]">(<RubyText kanji={tw.word.ja_kanji} hiragana={tw.word.ja_hiragana} />)</span></span>
                      <span className="text-red-500 bg-red-100 px-3 py-1 rounded-full whitespace-nowrap">{tw.percentWrong}% {t("Wrong", "不正解")}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Right Column: Special Awards */}
          <div className="flex-1 flex flex-col items-center">
            <h2 className="text-5xl font-black text-blue-500 mb-8 drop-shadow-sm">{t("Special Awards", "特別賞")}</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full pb-8">
              
              {/* Common: Highest Streak */}
              <div onClick={() => setSelectedAward(selectedAward === 'streak' ? null : 'streak')} className="bg-orange-50 border-4 border-orange-300 p-6 rounded-2xl shadow-sm cursor-pointer hover:scale-[1.02] active:scale-95 transition-all flex flex-col justify-center relative">
                <div className="flex justify-between items-center w-full">
                  <div className="flex flex-col">
                    <h3 className="text-xl font-bold text-orange-600">🔥 {t("Highest Streak", "最大連続正解")}</h3>
                    <span className="text-xs font-bold text-orange-500/70">{t("Most consecutive correct answers", "最も多く連続で正解した人")}</span>
                  </div>
                  <span className="text-2xl font-black text-orange-600">{getTopTiers('maxStreak').length > 0 ? getTopTiers('maxStreak')[0].value : 0}</span>
                </div>
                {selectedAward === 'streak' && (
                  <div className="mt-4 pt-4 border-t-2 border-orange-200 animate-in slide-in-from-top-4">
                    {getTopTiers('maxStreak').map((tier, i) => (
                      <div key={i} className="mb-3">
                        <div className="font-bold text-orange-800 text-lg">{tier.value} {t("in a row", "連続")}</div>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {tier.players.map(name => <span key={name} className="bg-orange-200 text-orange-900 px-3 py-1 rounded-full text-sm font-bold">{name}</span>)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Common: Most Correct */}
              <div onClick={() => setSelectedAward(selectedAward === 'correct' ? null : 'correct')} className="bg-green-50 border-4 border-green-300 p-6 rounded-2xl shadow-sm cursor-pointer hover:scale-[1.02] active:scale-95 transition-all flex flex-col justify-center">
                <div className="flex justify-between items-center w-full">
                  <div className="flex flex-col">
                    <h3 className="text-xl font-bold text-green-600">🎯 {t("Most Correct", "最多正解数")}</h3>
                    <span className="text-xs font-bold text-green-500/70">{t("Answered the most questions correctly", "最も多く正解した人")}</span>
                  </div>
                  <span className="text-2xl font-black text-green-600">{getTopTiers('correctCount').length > 0 ? getTopTiers('correctCount')[0].value : 0}</span>
                </div>
                {selectedAward === 'correct' && (
                  <div className="mt-4 pt-4 border-t-2 border-green-200 animate-in slide-in-from-top-4">
                    {getTopTiers('correctCount').map((tier, i) => (
                      <div key={i} className="mb-3">
                        <div className="font-bold text-green-800 text-lg">{tier.value} {t("correct", "正解")}</div>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {tier.players.map(name => <span key={name} className="bg-green-200 text-green-900 px-3 py-1 rounded-full text-sm font-bold">{name}</span>)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Common: The Sprinter Award */}
              <div onClick={() => setSelectedAward(selectedAward === 'sprinter' ? null : 'sprinter')} className="bg-purple-50 border-4 border-purple-300 p-6 rounded-2xl shadow-sm cursor-pointer hover:scale-[1.02] active:scale-95 transition-all flex flex-col justify-center">
                <div className="flex justify-between items-center w-full">
                  <div className="flex flex-col">
                    <h3 className="text-xl font-bold text-purple-600">🏃 {t("The Sprinter", "スプリンター")}</h3>
                    <span className="text-xs font-bold text-purple-500/70">{t("Fastest average answer time", "平均解答時間が最も速い人")}</span>
                  </div>
                  <span className="text-2xl font-black text-purple-600">{getTopTiers('avgTime', true).length > 0 ? (getTopTiers('avgTime', true)[0].value / 1000).toFixed(2) + 's' : '-'}</span>
                </div>
                {selectedAward === 'sprinter' && (
                  <div className="mt-4 pt-4 border-t-2 border-purple-200 animate-in slide-in-from-top-4">
                    {getTopTiers('avgTime', true).map((tier, i) => (
                      <div key={i} className="mb-3">
                        <div className="font-bold text-purple-800 text-lg">{t("Avg", "平均")}: {(tier.value / 1000).toFixed(2)}s</div>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {tier.players.map(name => <span key={name} className="bg-purple-200 text-purple-900 px-3 py-1 rounded-full text-sm font-bold">{name}</span>)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Common: Slow & Steady Award */}
              <div onClick={() => setSelectedAward(selectedAward === 'slow' ? null : 'slow')} className="bg-blue-50 border-4 border-blue-300 p-6 rounded-2xl shadow-sm cursor-pointer hover:scale-[1.02] active:scale-95 transition-all flex flex-col justify-center">
                <div className="flex justify-between items-center w-full">
                  <div className="flex flex-col">
                    <h3 className="text-xl font-bold text-blue-600">🐢 {t("Slow & Steady", "マイペース")}</h3>
                    <span className="text-xs font-bold text-blue-500/70">{t("Slowest average answer time", "平均解答時間が最も遅い人")}</span>
                  </div>
                  <span className="text-2xl font-black text-blue-600">{getTopTiers('avgTime').length > 0 ? (getTopTiers('avgTime')[0].value / 1000).toFixed(2) + 's' : '-'}</span>
                </div>
                {selectedAward === 'slow' && (
                  <div className="mt-4 pt-4 border-t-2 border-blue-200 animate-in slide-in-from-top-4">
                    {getTopTiers('avgTime').map((tier, i) => (
                      <div key={i} className="mb-3">
                        <div className="font-bold text-blue-800 text-lg">{t("Avg", "平均")}: {(tier.value / 1000).toFixed(2)}s</div>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {tier.players.map(name => <span key={name} className="bg-blue-200 text-blue-900 px-3 py-1 rounded-full text-sm font-bold">{name}</span>)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {!isTeamMode && (
                <>
                  {/* Solo: Comeback Kid Award */}
                  <div onClick={() => setSelectedAward(selectedAward === 'comeback' ? null : 'comeback')} className="bg-yellow-50 border-4 border-yellow-300 p-6 rounded-2xl shadow-sm cursor-pointer hover:scale-[1.02] active:scale-95 transition-all flex flex-col justify-center">
                    <div className="flex justify-between items-center w-full">
                      <div className="flex flex-col">
                        <h3 className="text-xl font-bold text-yellow-600">🛡️ {t("Comeback Kid", "大逆転")}</h3>
                        <span className="text-xs font-bold text-yellow-500/70">{t("Most catch-up bonus points earned", "最も多く逆転ボーナスを獲得した人")}</span>
                      </div>
                      <span className="text-2xl font-black text-yellow-600">{getTopTiers('comebackPoints').length > 0 ? getTopTiers('comebackPoints')[0].value : 0}</span>
                    </div>
                    {selectedAward === 'comeback' && (
                      <div className="mt-4 pt-4 border-t-2 border-yellow-200 animate-in slide-in-from-top-4">
                        {getTopTiers('comebackPoints').map((tier, i) => (
                          <div key={i} className="mb-3">
                            <div className="font-bold text-yellow-800 text-lg">{tier.value} {t("bonus points", "ボーナス点")}</div>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {tier.players.map(name => <span key={name} className="bg-yellow-200 text-yellow-900 px-3 py-1 rounded-full text-sm font-bold">{name}</span>)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Solo: The Perfectionist */}
                  <div onClick={() => setSelectedAward(selectedAward === 'perfect' ? null : 'perfect')} className="bg-teal-50 border-4 border-teal-300 p-6 rounded-2xl shadow-sm cursor-pointer hover:scale-[1.02] active:scale-95 transition-all flex flex-col justify-center">
                    <div className="flex justify-between items-center w-full">
                      <div className="flex flex-col">
                        <h3 className="text-xl font-bold text-teal-600">⭐ {t("Perfectionist", "パーフェクト")}</h3>
                        <span className="text-xs font-bold text-teal-500/70">{t("100% accuracy, ranked by speed", "全問正解 (スピード順)")}</span>
                      </div>
                      <span className="text-2xl font-black text-teal-600">{getTopTiers('avgTime', true, true).length > 0 ? (getTopTiers('avgTime', true, true)[0].value / 1000).toFixed(2) + 's' : '-'}</span>
                    </div>
                    {selectedAward === 'perfect' && (
                      <div className="mt-4 pt-4 border-t-2 border-teal-200 animate-in slide-in-from-top-4">
                        <p className="text-sm font-bold text-teal-700 mb-2">{t("100% Accuracy Ranked by Speed", "正答率100% (スピード順)")}</p>
                        {getTopTiers('avgTime', true, true).map((tier, i) => (
                          <div key={i} className="mb-3">
                            <div className="font-bold text-teal-800 text-lg">{(tier.value / 1000).toFixed(2)}s</div>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {tier.players.map(name => <span key={name} className="bg-teal-200 text-teal-900 px-3 py-1 rounded-full text-sm font-bold">{name}</span>)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {isTeamMode && (
                <>
                  {/* Team: The Hive Mind */}
                  <div onClick={() => setSelectedAward(selectedAward === 'hive' ? null : 'hive')} className="bg-pink-50 border-4 border-pink-300 p-6 rounded-2xl shadow-sm cursor-pointer hover:scale-[1.02] active:scale-95 transition-all flex flex-col justify-center">
                    <div className="flex justify-between items-center w-full">
                      <div className="flex flex-col">
                        <h3 className="text-xl font-bold text-pink-600">🧠 {t("Hive Mind", "最高のチームワーク")}</h3>
                        <span className="text-xs font-bold text-pink-500/70">{t("Highest overall team accuracy", "チーム全体の正答率が最も高い")}</span>
                      </div>
                      <span className="text-2xl font-black text-pink-600">
                        {Object.values(teamScores || {}).length > 0 
                          ? Math.max(...Object.values(teamScores || {}).map(t => Math.round((t.totalCorrect / (t.totalAnswered || 1)) * 100))) + '%'
                          : '0%'}
                      </span>
                    </div>
                    {selectedAward === 'hive' && (
                      <div className="mt-4 pt-4 border-t-2 border-pink-200 animate-in slide-in-from-top-4">
                         <p className="text-sm font-bold text-pink-700 mb-2">{t("Highest Team Accuracy", "チーム正答率トップ")}</p>
                         {Object.entries(teamScores || {})
                           .map(([id, tData]) => ({ id, accuracy: Math.round((tData.totalCorrect / (tData.totalAnswered || 1)) * 100) }))
                           .sort((a, b) => b.accuracy - a.accuracy)
                           .slice(0, 3)
                           .map((team, i) => (
                             <div key={i} className="mb-3">
                               <div className="font-bold text-pink-800 text-lg">{team.accuracy}% {t("Accurate", "正解")}</div>
                               <div className="flex flex-wrap gap-2 mt-1">
                                  <span className={`px-3 py-1 rounded-full text-sm font-bold ${TEAM_CONFIG[team.id]?.bg} ${TEAM_CONFIG[team.id]?.text} border-2 ${TEAM_CONFIG[team.id]?.border}`}>
                                    {TEAM_CONFIG[team.id]?.emoji} {TEAM_CONFIG[team.id]?.name}
                                  </span>
                               </div>
                             </div>
                         ))}
                      </div>
                    )}
                  </div>

                  {/* Team: The Carry */}
                  <div onClick={() => setSelectedAward(selectedAward === 'carry' ? null : 'carry')} className="bg-indigo-50 border-4 border-indigo-300 p-6 rounded-2xl shadow-sm cursor-pointer hover:scale-[1.02] active:scale-95 transition-all flex flex-col justify-center">
                    <div className="flex justify-between items-center w-full">
                      <div className="flex flex-col">
                        <h3 className="text-xl font-bold text-indigo-600">🏋️ {t("The Carry", "大黒柱")}</h3>
                        <span className="text-xs font-bold text-indigo-500/70">{t("Highest individual score contribution", "個人スコアが最も高い人")}</span>
                      </div>
                      <span className="text-2xl font-black text-indigo-600">
                        {(() => {
                           let maxScore = 0;
                           Object.values(players).forEach(p => { if (p.score > maxScore) maxScore = p.score; });
                           return maxScore;
                        })()}
                      </span>
                    </div>
                    {selectedAward === 'carry' && (
                      <div className="mt-4 pt-4 border-t-2 border-indigo-200 animate-in slide-in-from-top-4">
                        <p className="text-sm font-bold text-indigo-700 mb-2">{t("Highest Contribution Score", "個人最高スコア貢献")}</p>
                        {Object.values(players)
                          .sort((a, b) => (b.score || 0) - (a.score || 0))
                          .slice(0, 3)
                          .map((p, i) => (
                            <div key={i} className="mb-3">
                              <div className="font-bold text-indigo-800 text-lg">{p.score || 0} {t("pts", "点")}</div>
                              <div className="flex flex-wrap gap-2 mt-1">
                                <span className="bg-indigo-200 text-indigo-900 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                                  {p.nickname} <span className="text-xs opacity-75">({TEAM_CONFIG[p.teamId]?.name})</span>
                                </span>
                              </div>
                            </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

            </div>
          </div>
       </div>

       <div className="mt-12 flex flex-col md:flex-row gap-4 items-center z-10">
          <button onClick={handlePlayAgainSame} className="px-8 py-4 bg-[var(--primary-color)] text-white text-xl font-bold rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-all">
            {t("Play Again (Same Settings)", "もう一度プレイ (設定維持)")}
          </button>
          <button onClick={handlePlayAgainChange} className="px-8 py-4 bg-[var(--surface-color)] text-[var(--primary-color)] border-4 border-[var(--primary-color)] text-xl font-bold rounded-2xl shadow-lg hover:bg-[var(--primary-color)] hover:text-white active:scale-95 transition-all">
            {t("Play Again (Change Settings)", "もう一度プレイ (設定変更)")}
          </button>
          <button onClick={handleEndGame} className="px-8 py-4 bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 border-4 border-transparent hover:border-red-600 dark:hover:border-red-400 text-xl font-bold rounded-2xl shadow-lg active:scale-95 transition-all">
            {t("End Game & Close Room", "終了してルームを閉じる")}
          </button>
       </div>
    </div>
  );
};
