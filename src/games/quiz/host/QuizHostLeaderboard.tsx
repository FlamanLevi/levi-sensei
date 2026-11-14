import React, { useEffect, useState, useRef } from 'react';
import { QuizPlayer, GameMode, TeamId, TeamScoreData, TEAM_PRESETS } from '../types';
import { resolveRacerNumber } from '@/games/suzuka_grand_prix/kartPresets';
import { useLanguage } from '@/context/LanguageContext';
import { Trophy, Flame, ArrowRight, Award, Users, User, Star, Pause, Clock } from 'lucide-react';
import { useClassroomClicker } from '@/hooks/useClassroomClicker';
import { ClassroomBlackoutShutter } from '@/components/common/ClassroomBlackoutShutter';

interface QuizHostLeaderboardProps {
  players: Record<string, QuizPlayer>;
  gameMode?: GameMode;
  teamScores?: Partial<Record<TeamId, TeamScoreData>>;
  questionIndex: number;
  totalQuestions: number;
  onNext: () => void;
  onExit?: () => void;
}

export const QuizHostLeaderboard: React.FC<QuizHostLeaderboardProps> = ({
  players,
  gameMode = 'INDIVIDUAL',
  teamScores,
  questionIndex,
  totalQuestions,
  onNext,
  onExit
}) => {
  const { t, language } = useLanguage();
  const [viewTab, setViewTab] = useState<'TEAMS' | 'PLAYERS'>(gameMode === 'TEAM' ? 'TEAMS' : 'PLAYERS');
  const [countdown, setCountdown] = useState<number>(5);
  const [isPaused, setIsPaused] = useState(false);
  const [isBlackout, setIsBlackout] = useState(false);
  const isLastQuestion = questionIndex + 1 >= totalQuestions;

  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;
  const isBlackoutRef = useRef(isBlackout);
  isBlackoutRef.current = isBlackout;

  const onNextRef = useRef(onNext);
  onNextRef.current = onNext;
  const hasAdvancedRef = useRef<number>(-1);

  // Auto-advance countdown (5 seconds) on intermediate rounds (freezable on pause/blackout)
  useEffect(() => {
    if (isLastQuestion) return;

    hasAdvancedRef.current = -1;
    setCountdown(5);
    const interval = window.setInterval(() => {
      if (isPausedRef.current || isBlackoutRef.current) return;
      setCountdown(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [questionIndex, isLastQuestion]);

  useEffect(() => {
    if (!isLastQuestion && countdown === 0 && !isPaused && !isBlackout && hasAdvancedRef.current !== questionIndex) {
      hasAdvancedRef.current = questionIndex;
      onNextRef.current();
    }
  }, [countdown, isLastQuestion, isPaused, isBlackout, questionIndex]);

  // Universal Classroom Clicker (presenter remotes, arrow keys, P key pause, B key blackout)
  useClassroomClicker({
    onNext,
    onTogglePause: () => setIsPaused(p => !p),
    onBlankScreen: () => setIsBlackout(b => !b)
  });

  // Sort players by score descending
  const sortedPlayers = Object.values(players).sort((a, b) => b.score - a.score);
  const top5 = sortedPlayers.slice(0, 5);

  // Prepare sorted teams - show only active teams with actual participants
  const activeTeamIds = (Object.keys(TEAM_PRESETS) as TeamId[]).filter((tId) => {
    const hasPlayers = Object.values(players).some(p => p.teamId === tId);
    const memberCount = teamScores?.[tId]?.memberCount || 0;
    return hasPlayers || memberCount > 0;
  });
  const displayTeamIds = activeTeamIds.length > 0 ? activeTeamIds : (['team_red', 'team_white'] as TeamId[]);

  const teamList = displayTeamIds.map((tId) => {
    const data = teamScores?.[tId] || {
      name: TEAM_PRESETS[tId].name,
      jaName: TEAM_PRESETS[tId].jaName,
      score: 0,
      correctCount: 0,
      memberCount: 0,
      averageScore: 0,
      color: TEAM_PRESETS[tId].color,
      emoji: TEAM_PRESETS[tId].emoji
    };
    return {
      id: tId,
      preset: TEAM_PRESETS[tId],
      ...data
    };
  }).sort((a, b) => b.averageScore - a.averageScore || b.score - a.score);

  const maxAvgScore = Math.max(1, ...teamList.map(t => t.averageScore));

  return (
    <div className="flex flex-col h-full max-w-[92vw] max-h-[92dvh] mx-auto w-full p-2 sm:p-4 text-slate-900 dark:text-white select-none relative overflow-hidden">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800 shrink-0 flex-nowrap">
        <div className="flex items-center gap-3 min-w-0 flex-1 overflow-x-auto no-scrollbar flex-nowrap">
          <Trophy className="text-amber-400 shrink-0" size={26} />
          <h2 className="text-2xl font-black tracking-tight shrink-0 whitespace-nowrap">
            {t('Leaderboard', 'ランキング')}
          </h2>
          <span className="text-xs font-bold text-slate-600 dark:text-slate-400 shrink-0 whitespace-nowrap">
            {t(`Round ${questionIndex + 1} of ${totalQuestions}`, <><ruby>第<rt>だい</rt></ruby>{questionIndex + 1}<ruby>問<rt>もん</rt></ruby> / <ruby>全<rt>ぜん</rt></ruby>{totalQuestions}<ruby>問<rt>もん</rt></ruby></>)}
          </span>
          {/* 1-tap pause toggle button */}
          {!isLastQuestion && (
            <button
              type="button"
              onClick={() => setIsPaused(p => !p)}
              className={`flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full cursor-pointer transition-all shrink-0 whitespace-nowrap ${
                isPaused
                  ? 'bg-amber-400 text-slate-950 font-black animate-pulse shadow-xs ring-2 ring-amber-300'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
              title={t('Pause / Resume timer [P]', 'タイマー一時停止 / 再開 [P]')}
            >
              {isPaused ? <Pause size={12} className="fill-current" /> : <Clock size={12} />}
              <span className="font-mono">
                {isPaused ? t('PAUSED [P]', <><ruby>一時<rt>いちじ</rt></ruby><ruby>停止<rt>ていし</rt></ruby> [P]</>) : `${countdown}s`}
              </span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-nowrap">
          {onExit && (
            <button
              onClick={onExit}
              className="px-3 py-2 rounded-2xl font-black text-xs text-rose-500 hover:text-rose-600 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-900 active:scale-95 transition-all whitespace-nowrap cursor-pointer"
              title={t('End quiz and disband room', 'クイズを終了して解散')}
            >
              <span>{t('✕ End', <>✕ <ruby>終了<rt>しゅうりょう</rt></ruby></>)}</span>
            </button>
          )}

          <button
            onClick={onNext}
            className="px-6 py-2 rounded-2xl font-black text-sm text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-xl shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap"
          >
            <span>
              {isLastQuestion
                ? t('FINAL RESULTS', <><ruby>最終<rt>さいしゅう</rt></ruby><ruby>結果<rt>けっか</rt></ruby><ruby>発表<rt>はっぴょう</rt></ruby></>)
                : <>{t('NEXT QUESTION', <><ruby>次<rt>つぎ</rt></ruby>の<ruby>問題<rt>もんだい</rt></ruby>へ</>)} ({isPaused ? t('PAUSED', '一時停止') : `${countdown}s`})</>}
            </span>
            <ArrowRight size={16} />
            <span className="opacity-75 font-mono text-xs">[Space]</span>
          </button>
        </div>
      </div>

      {/* Team Mode Tabs (if in Team Mode) */}
      {gameMode === 'TEAM' && (
        <div className="flex items-center justify-center gap-2 pt-4 shrink-0 flex-nowrap">
          <button
            onClick={() => setViewTab('TEAMS')}
            className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 whitespace-nowrap ${
              viewTab === 'TEAMS'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300'
            }`}
          >
            <Users size={14} />
            <span>{t('Team Ranks', <>チーム<ruby>順位<rt>じゅんい</rt></ruby></>)}</span>
          </button>
          <button
            onClick={() => setViewTab('PLAYERS')}
            className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 whitespace-nowrap ${
              viewTab === 'PLAYERS'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300'
            }`}
          >
            <User size={14} />
            <span>{t('Individual MVPs', <><ruby>個人<rt>こじん</rt></ruby> Top 5</>)}</span>
          </button>
        </div>
      )}

      {/* View 1: Team Racing Bars */}
      {gameMode === 'TEAM' && viewTab === 'TEAMS' ? (
        <div className={`flex-1 min-h-0 overflow-y-auto flex flex-col justify-center my-auto ${
          teamList.length >= 4 ? 'space-y-2.5 py-2' : 'space-y-4 py-4'
        }`}>
          {teamList.map((tItem, idx) => {
            const rank = idx + 1;
            const pct = maxAvgScore > 0 ? Math.max(12, Math.round((tItem.averageScore / maxAvgScore) * 100)) : 12;

            let rankColor = 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200';
            let rankIcon = `#${rank}`;
            if (rank === 1) {
              rankColor = 'bg-amber-400 text-slate-950 font-black shadow-lg shadow-amber-400/30';
              rankIcon = '🥇 1st';
            } else if (rank === 2) {
              rankColor = 'bg-slate-300 text-slate-900 font-bold';
              rankIcon = '🥈 2nd';
            } else if (rank === 3) {
              rankColor = 'bg-amber-600 text-white font-bold';
              rankIcon = '🥉 3rd';
            }

            return (
              <div
                key={tItem.id}
                className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-lg animate-in fade-in slide-in-from-bottom-2"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                {/* Header: Rank + Team + Average Score */}
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-xl text-xs font-black shrink-0 ${rankColor}`}>
                      {rankIcon}
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{tItem.preset.emoji}</span>
                      <span>{language === 'ja' ? tItem.preset.jaName : tItem.preset.name}</span>
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400">({tItem.memberCount}{t(' students', <><ruby>人<rt>にん</rt></ruby></>)})</span>
                    </span>
                  </div>

                  <div className="text-right">
                    <div className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white font-mono">
                      {tItem.averageScore.toLocaleString()} <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{t('pts / person', <>pts / <ruby>人<rt>にん</rt></ruby></>)}</span>
                    </div>
                    <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                      {t('Team Total:', <>チーム<ruby>合計<rt>ごうけい</rt></ruby>:</>)} {tItem.score.toLocaleString()} pts
                    </div>
                  </div>
                </div>

                {/* Animated Racing Progress Bar */}
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-6 rounded-full overflow-hidden p-1 border border-slate-200 dark:border-slate-700 relative">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ease-out flex items-center justify-end pr-2 font-black text-[10px] ${
                      tItem.id === 'team_red' ? 'bg-gradient-to-r from-rose-500 to-red-600 text-white' :
                      tItem.id === 'team_white' ? 'bg-gradient-to-r from-slate-200 to-slate-400 text-slate-900 border border-slate-300' :
                      tItem.id === 'team_blue' ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white' :
                      tItem.id === 'team_green' ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white' :
                      tItem.id === 'team_yellow' ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950' :
                      tItem.id === 'team_orange' ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white' :
                      'bg-gradient-to-r from-purple-500 to-fuchsia-600 text-white'
                    }`}
                    style={{ width: `${pct}%` }}
                  >
                    <span>{tItem.averageScore.toLocaleString()} pts</span>
                  </div>
                </div>

                {/* Team MVP Spotlight */}
                {tItem.mvpNickname && (
                  <div className="mt-2.5 flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-xl">
                    <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-black">
                      <Star size={13} fill="currentColor" />
                      <span>{t('Team MVP:', 'チームMVP:')}</span>
                      <span className="text-slate-900 dark:text-white">{tItem.mvpNickname}</span>
                    </span>
                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                      {tItem.mvpScore?.toLocaleString()} pts
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* View 2: Top 5 Individual Players */
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col justify-center space-y-2.5 my-auto py-4">
          {top5.length === 0 ? (
            <div className="text-center text-slate-600 dark:text-slate-400 py-12 text-sm font-bold">
              {t('No student scores recorded yet.', <>まだスコアが<ruby>記録<rt>きろく</rt></ruby>されていません</>)}
            </div>
          ) : (
            top5.map((p, idx) => {
              const rank = idx + 1;
              let rankColor = 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200';
              let borderClass = 'border-slate-200 dark:border-slate-800';
              let rankIcon = `#${rank}`;

              if (rank === 1) {
                rankColor = 'bg-amber-400 text-slate-950 font-black shadow-lg shadow-amber-400/30';
                borderClass = 'border-amber-400/80 ring-2 ring-amber-400/30';
                rankIcon = '🥇 1st';
              } else if (rank === 2) {
                rankColor = 'bg-slate-300 text-slate-900 font-bold';
                borderClass = 'border-slate-300 dark:border-slate-600';
                rankIcon = '🥈 2nd';
              } else if (rank === 3) {
                rankColor = 'bg-amber-600 text-white font-bold';
                borderClass = 'border-amber-600/70';
                rankIcon = '🥉 3rd';
              }

              const pointsEarned = p.lastAnswer?.pointsEarned || 0;
              const playerTeam = p.teamId ? TEAM_PRESETS[p.teamId] : null;

              return (
                <div
                  key={p.id}
                  className={`flex items-center justify-between p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border-2 ${borderClass} shadow-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-2`}
                  style={{ animationDelay: `${idx * 80}ms` }}
                >
                  {/* Rank & Nickname */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className={`px-3 py-1 rounded-xl text-xs font-black shrink-0 ${rankColor}`}>
                      {rankIcon}
                    </div>
                    {(() => {
                      const num = (p.attendanceNumber !== undefined && p.attendanceNumber !== null)
                        ? p.attendanceNumber
                        : resolveRacerNumber(p, idx);
                      const nick = p.nickname || 'Student';
                      const hasNumInNick = nick.includes('番') || nick.startsWith('#');
                      return (
                        <div className="flex items-center gap-2 min-w-0">
                          {num >= 0 && !hasNumInNick && (
                            <span className="px-2.5 py-0.5 rounded-lg bg-indigo-600 text-white font-mono font-black text-sm shadow-xs shrink-0">
                              #{num === 0 ? '00' : num}
                            </span>
                          )}
                          <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-wide truncate">
                            {nick}
                          </span>
                        </div>
                      );
                    })()}
                    {playerTeam && (
                      <span className="text-xs font-black px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                        {playerTeam.emoji} {language === 'ja' ? playerTeam.jaName : playerTeam.name}
                      </span>
                    )}
                    {p.currentStreak >= 2 && (
                      <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 text-xs font-black animate-pulse">
                        <Flame size={14} fill="currentColor" />
                        <span>{p.currentStreak} {t('in a row!', <><ruby>問<rt>もん</rt></ruby><ruby>連続<rt>れんぞく</rt></ruby><ruby>正解<rt>せいかい</rt></ruby>！</>)}</span>
                      </div>
                    )}
                  </div>

                  {/* Score & Points Delta */}
                  <div className="flex items-center gap-3">
                    {pointsEarned > 0 && (
                      <span className="text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-300 dark:border-emerald-800 animate-bounce">
                        +{pointsEarned}
                      </span>
                    )}
                    <span className="font-mono text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                      {p.score.toLocaleString()} <span className="text-xs font-bold text-slate-600 dark:text-slate-400">pts</span>
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Bottom Hint */}
      <div className="text-center pb-2 text-xs font-bold text-slate-600 dark:text-slate-400 shrink-0">
        {t('Press Space or click button above to continue', <>Space キー または <ruby>上<rt>うえ</rt></ruby>のボタンをクリックして<ruby>進<rt>すす</rt></ruby>む</>)}
      </div>

      {/* Emergency Blackout Shutter (KeyB / period) */}
      <ClassroomBlackoutShutter isOpen={isBlackout} onToggle={() => setIsBlackout(b => !b)} />
    </div>
  );
};
