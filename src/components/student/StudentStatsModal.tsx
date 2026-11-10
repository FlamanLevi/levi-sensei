import React, { useState } from 'react';
import { StudentProfile } from '@/types/roster';
import { 
  BADGE_CATALOG, 
  calculateBadgeLevel, 
  getBadgeTierStyle, 
  BadgeDefinition 
} from '@/services/badgeEngine';
import { speechService } from '@/services/speechService';
import { useLanguage } from '@/context/LanguageContext';
import { useAudio } from '@/context/AudioContext';
import { 
  Trophy, 
  Award, 
  Zap, 
  Target, 
  Flame, 
  Clock, 
  CheckCircle2, 
  Volume2, 
  X, 
  Sparkles, 
  BookOpen, 
  TrendingUp, 
  ShieldCheck, 
  Lock 
} from 'lucide-react';

interface StudentStatsModalProps {
  profile: StudentProfile;
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'badges' | 'performance' | 'troubleWords';
type BadgeFilter = 'all' | 'earned' | 'locked';

export const StudentStatsModal: React.FC<StudentStatsModalProps> = ({
  profile,
  isOpen,
  onClose
}) => {
  const { t, language } = useLanguage();
  const { playPop } = useAudio();
  const [activeTab, setActiveTab] = useState<TabType>('badges');
  const [badgeFilter, setBadgeFilter] = useState<BadgeFilter>('all');
  const [speakingWord, setSpeakingWord] = useState<string | null>(null);

  if (!isOpen) return null;

  const stats = profile.stats || {
    gamesPlayed: 0,
    correctAnswers: 0,
    totalAnswers: 0
  };

  const badgesRecord = stats.badges || {};
  const troubleWordsMap = stats.troubleWords || {};
  const troubleWordsList = Object.values(troubleWordsMap).sort(
    (a, b) => b.missCount - a.missCount || a.correctCount - b.correctCount
  );

  // Performance calculations
  const totalAnswers = stats.totalAnswers || 0;
  const correctAnswers = stats.correctAnswers || 0;
  const accuracyPct = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0;

  const totalCorrectTime = stats.totalCorrectTimeMs || 0;
  const avgSpeedSec = correctAnswers > 0 && totalCorrectTime > 0
    ? (totalCorrectTime / correctAnswers / 1000).toFixed(1)
    : '-';

  const fastestSpeedSec = stats.allTimeFastestMs && stats.allTimeFastestMs < 999999
    ? (stats.allTimeFastestMs / 1000).toFixed(1)
    : '-';

  // Badge list and filter
  const allBadges = Object.values(BADGE_CATALOG);
  const filteredBadges = allBadges.filter((b) => {
    const studentBadge = badgesRecord[b.id];
    const isEarned = (studentBadge?.totalCount || 0) > 0;
    if (badgeFilter === 'earned') return isEarned;
    if (badgeFilter === 'locked') return !isEarned;
    return true;
  });

  const earnedBadgeCount = allBadges.filter(
    (b) => (badgesRecord[b.id]?.totalCount || 0) > 0
  ).length;

  const handleSpeak = (word: string) => {
    setSpeakingWord(word);
    speechService.speak(word, {
      onEnd: () => setSpeakingWord(null)
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-white dark:bg-slate-900 border-3 border-amber-400 dark:border-amber-500 shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100"
        style={{ fontFamily: "'UD Digi Kyokasho NP-R', 'UD Digi Kyokasho NK-R', 'BIZ UDPGothic', 'Zen Maru Gothic', sans-serif" }}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-6 bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3.5 min-w-0">
            <span className="text-3xl sm:text-4xl p-2 rounded-2xl bg-white/20 backdrop-blur-md shrink-0 shadow-inner">
              {profile.avatar || '🐼'}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-950/40 border border-emerald-300/40 text-emerald-200">
                  {profile.classId} #{profile.attendanceNumber}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-yellow-300/30 text-yellow-200 border border-yellow-300/40">
                  ⭐️ Lv. {profile.level} ({profile.xp.toLocaleString()} XP)
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-400/30 text-amber-200 border border-amber-300/40">
                  🪙 {profile.gold} Gold
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight truncate mt-1">
                {profile.nickname}
                <span className="text-xs sm:text-sm font-bold text-emerald-200 ml-2">
                  {t("'s English Passport", "の学習カルテ")}
                </span>
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              playPop();
              onClose();
            }}
            className="w-10 h-10 rounded-2xl bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors active:scale-95 cursor-pointer shrink-0 ml-2"
          >
            <X size={22} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 px-4 pt-2 shrink-0">
          <div className="flex items-center gap-2 overflow-x-auto">
            <button
              type="button"
              onClick={() => {
                playPop();
                setActiveTab('badges');
              }}
              className={`px-4 py-3 font-black text-xs sm:text-sm rounded-t-2xl flex items-center gap-2 border-b-3 transition-all cursor-pointer ${
                activeTab === 'badges'
                  ? 'border-amber-500 text-amber-600 dark:text-amber-400 bg-white dark:bg-slate-900 shadow-xs'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Trophy size={16} />
              <span>{t('Trophy Case', 'トロフィーケース')}</span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                {earnedBadgeCount}/{allBadges.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                playPop();
                setActiveTab('performance');
              }}
              className={`px-4 py-3 font-black text-xs sm:text-sm rounded-t-2xl flex items-center gap-2 border-b-3 transition-all cursor-pointer ${
                activeTab === 'performance'
                  ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-900 shadow-xs'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <TrendingUp size={16} />
              <span>{t('My Stats', 'じぶんカルテ')}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playPop();
                setActiveTab('troubleWords');
              }}
              className={`px-4 py-3 font-black text-xs sm:text-sm rounded-t-2xl flex items-center gap-2 border-b-3 transition-all cursor-pointer ${
                activeTab === 'troubleWords'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900 shadow-xs'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <BookOpen size={16} />
              <span>{t('Weak Words Review', 'にがて単語クリニック')}</span>
              {troubleWordsList.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">
                  {troubleWordsList.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* TAB 1: TROPHY CASE (Untappd-style Badges) */}
          {activeTab === 'badges' && (
            <div className="space-y-4">
              {/* Filter pills & Untappd Explainer */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-amber-50 dark:bg-amber-950/30 p-3 sm:p-4 rounded-2xl border border-amber-200 dark:border-amber-800/60">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🎖️</span>
                  <div>
                    <h4 className="font-black text-xs sm:text-sm text-amber-950 dark:text-amber-200">
                      {t('Untappd-Style Leveling Badges', '回数をかさねてバッジをレベルアップ！')}
                    </h4>
                    <p className="text-[11px] font-bold text-amber-800 dark:text-amber-300">
                      {t(
                        'Each level requires 1 more award than the last! Reach Level 6 by April!',
                        '賞をとるたびにカウントアップ！ 1回 ➔ 3回 ➔ 6回 ➔ 10回 でどんどんランクアップ！'
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 p-1 rounded-xl border border-amber-300 dark:border-amber-700">
                  {(['all', 'earned', 'locked'] as BadgeFilter[]).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => {
                        playPop();
                        setBadgeFilter(f);
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                        badgeFilter === f
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      {f === 'all' && t('All', 'すべて')}
                      {f === 'earned' && t('Earned', '獲得済み')}
                      {f === 'locked' && t('Locked', '未獲得')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Badges Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredBadges.map((badge) => {
                  const record = badgesRecord[badge.id];
                  const totalCount = record?.totalCount || 0;
                  const levelInfo = calculateBadgeLevel(totalCount);
                  const isEarned = totalCount > 0;
                  const tierStyle = getBadgeTierStyle(levelInfo.tierName);

                  return (
                    <div
                      key={badge.id}
                      className={`relative p-4 rounded-2xl border-2 transition-all duration-200 flex flex-col justify-between ${
                        isEarned
                          ? 'bg-white dark:bg-slate-800/90 border-slate-300 dark:border-slate-700 shadow-md hover:border-amber-400'
                          : 'bg-slate-100/60 dark:bg-slate-900/50 border-dashed border-slate-300 dark:border-slate-800 opacity-60'
                      }`}
                    >
                      <div>
                        {/* Top: Icon + Title + Level Badge */}
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex items-center gap-3">
                            <span className="text-3xl sm:text-4xl p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-inner">
                              {badge.emoji}
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white leading-tight">
                                  {language === 'ja' ? badge.jaTitle : badge.title}
                                </h3>
                              </div>
                              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                {badge.title}
                              </span>
                            </div>
                          </div>

                          {/* Level Badge Pill */}
                          {isEarned ? (
                            <span className={`px-2.5 py-1 rounded-xl text-xs font-black shadow-xs shrink-0 ${tierStyle.badgeBg}`}>
                              Lv. {levelInfo.level} {language === 'ja' ? tierStyle.labelJa : tierStyle.labelEn}
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center gap-1 shrink-0">
                              <Lock size={12} />
                              <span>{t('Locked', '未獲得')}</span>
                            </span>
                          )}
                        </div>

                        {/* Description */}
                        <p className="text-xs font-bold text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                          {language === 'ja' ? badge.jaDescription : badge.description}
                        </p>
                      </div>

                      {/* Untappd Progress Bar */}
                      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-center justify-between text-[11px] font-black mb-1">
                          <span className="text-slate-600 dark:text-slate-400">
                            {t(`Times Won: ${totalCount}`, `獲得回数: ${totalCount}回`)}
                          </span>
                          <span className="text-amber-600 dark:text-amber-400">
                            {levelInfo.isMaxLevel
                              ? '🏆 MAX LEVEL'
                              : t(
                                  `${levelInfo.countInLevel}/${levelInfo.neededForNextLevel} to Lv.${levelInfo.level + 1}`,
                                  `あと ${levelInfo.neededForNextLevel - levelInfo.countInLevel}回で Lv.${levelInfo.level + 1}！`
                                )}
                          </span>
                        </div>

                        {/* Progress meter */}
                        <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 transition-all duration-500 rounded-full"
                            style={{ width: `${Math.round(levelInfo.progressRatio * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: PERFORMANCE & RECORDS */}
          {activeTab === 'performance' && (
            <div className="space-y-6">
              {/* Stat Highlights Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                {/* 1. Accuracy */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-100">{t('Accuracy', '生涯正解率')}</span>
                    <Target size={18} className="text-blue-200" />
                  </div>
                  <div className="my-2">
                    <span className="text-3xl sm:text-4xl font-black">{accuracyPct}%</span>
                  </div>
                  <span className="text-[11px] text-blue-100 font-bold">
                    {t(`${correctAnswers}/${totalAnswers} answers`, `${correctAnswers}問正解 / 全${totalAnswers}問`)}
                  </span>
                </div>

                {/* 2. Speed */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-100">{t('Avg Speed', '平均回答速度')}</span>
                    <Zap size={18} className="text-amber-200" />
                  </div>
                  <div className="my-2">
                    <span className="text-3xl sm:text-4xl font-black">{avgSpeedSec}{avgSpeedSec !== '-' ? 's' : ''}</span>
                  </div>
                  <span className="text-[11px] text-amber-100 font-bold">
                    {t(`Fastest: ${fastestSpeedSec}s`, `最速: ${fastestSpeedSec}秒`)}
                  </span>
                </div>

                {/* 3. Streak */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-lg flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-100">{t('Best Streak', '最長連続正解')}</span>
                    <Flame size={18} className="text-rose-200" />
                  </div>
                  <div className="my-2">
                    <span className="text-3xl sm:text-4xl font-black">{stats.bestStreak || 0}</span>
                  </div>
                  <span className="text-[11px] text-rose-100 font-bold">
                    {t('Consecutive answers', '問連続正解')}
                  </span>
                </div>

                {/* 4. Podiums */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-100">{t('Championships', '優勝・表彰台')}</span>
                    <Trophy size={18} className="text-emerald-200" />
                  </div>
                  <div className="my-2">
                    <span className="text-3xl sm:text-4xl font-black">{stats.championshipWins || 0}</span>
                  </div>
                  <span className="text-[11px] text-emerald-100 font-bold">
                    {t(`Podiums: ${stats.podiumFinishes || 0}`, `表彰台: ${stats.podiumFinishes || 0}回`)}
                  </span>
                </div>
              </div>

              {/* Classroom Record Summary Table */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                <h4 className="font-black text-sm text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                  <span>{t('All-Time Classroom Records', '通算学習レコード')}</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-bold">
                  <div className="flex justify-between p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400">{t('Games Played', '対戦ゲーム参加数')}</span>
                    <span className="text-slate-900 dark:text-white font-black">{stats.gamesPlayed} {t('matches', '試合')}</span>
                  </div>
                  <div className="flex justify-between p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400">{t('Total Badges Earned', '獲得バッジ総数')}</span>
                    <span className="text-slate-900 dark:text-white font-black">{earnedBadgeCount} {t('badges', '種類')}</span>
                  </div>
                  <div className="flex justify-between p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400">{t('All-Time Fastest Buzzer', '電光石火・最速早押し記録')}</span>
                    <span className="text-amber-600 dark:text-amber-400 font-black">{fastestSpeedSec}{fastestSpeedSec !== '-' ? '秒' : ''}</span>
                  </div>
                  <div className="flex justify-between p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400">{t('Last Game Played', 'さいごにプレイした日')}</span>
                    <span className="text-slate-900 dark:text-white font-black">
                      {profile.lastPlayedAt ? new Date(profile.lastPlayedAt).toLocaleDateString() : '-'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: WEAK WORDS CLINIC */}
          {activeTab === 'troubleWords' && (
            <div className="space-y-4">
              <div className="p-3 sm:p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🩺</span>
                  <div>
                    <h4 className="font-black text-xs sm:text-sm text-blue-950 dark:text-blue-200">
                      {t('Personal Trouble Words Doctor', 'じぶんのにがて単語クリニック')}
                    </h4>
                    <p className="text-[11px] font-bold text-blue-800 dark:text-blue-300">
                      {t(
                        'Review words you missed in past games! Tap the speaker to hear Levi Sensei pronounce them!',
                        '過去のクイズで間違えた単語をふりかえろう！スピーカーを押して発音をチェック！'
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {troubleWordsList.length === 0 ? (
                <div className="p-8 rounded-3xl bg-emerald-50 dark:bg-emerald-950/20 border-2 border-dashed border-emerald-300 dark:border-emerald-800 text-center space-y-2">
                  <span className="text-4xl">🎉</span>
                  <h3 className="font-black text-base text-emerald-800 dark:text-emerald-200">
                    {t('No Trouble Words! Perfect Mastery!', 'にがてな単語はありません！')}
                  </h3>
                  <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 max-w-md mx-auto">
                    {t(
                      'All questions have been answered with great accuracy. Keep up the amazing work in English class!',
                      'すべての問題にバッチリ正解できています。この調子でこれからも英語の授業をたのしもう！'
                    )}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {troubleWordsList.map((item) => (
                    <div
                      key={item.wordId}
                      className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between gap-3 hover:border-blue-400 transition-all"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-wide truncate">
                            {item.english}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {item.japanese}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 text-[10px] font-black">
                          <span className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300">
                            {t(`Missed: ${item.missCount}`, `ミス: ${item.missCount}回`)}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
                            {t(`Correct: ${item.correctCount}`, `正解: ${item.correctCount}回`)}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSpeak(item.english)}
                        disabled={speakingWord === item.english}
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-sm active:scale-90 ${
                          speakingWord === item.english
                            ? 'bg-blue-600 text-white animate-pulse'
                            : 'bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 hover:bg-blue-200'
                        }`}
                        title={t('Listen to native pronunciation', '発音を聞く')}
                      >
                        <Volume2 size={20} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950/70 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={() => {
              playPop();
              onClose();
            }}
            className="px-6 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-black text-xs sm:text-sm shadow-md transition-all active:scale-95 cursor-pointer"
          >
            {t('Close', 'とじる')}
          </button>
        </div>
      </div>
    </div>
  );
};
