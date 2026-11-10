import React, { useState, useEffect } from 'react';
import { FUN_NICKNAMES, TeamId, TEAM_PRESETS, RAINBOW_TEAM_ORDER, QuizRoomState } from '../types';
import { getSavedStudentProfile } from '@/services/studentProfile';
import { safeSubscribe } from '@/services/rtdbSafe';
import { useLanguage } from '@/context/LanguageContext';
import { getClassSize, getRandomAvatarEmoji } from '@/types/roster';
import { requestMobileFullscreen } from '@/utils/mobileFullscreen';
import { Sparkles, Dices, ArrowLeft, ArrowRight, UserCheck, Hash, Check, Users } from 'lucide-react';

interface QuizStudentJoinProps {
  initialPin?: string;
  onJoin: (code: string, nickname: string, teamId?: TeamId, attendanceNumber?: number) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
  error: string | null;
}

export const QuizStudentJoin: React.FC<QuizStudentJoinProps> = ({
  initialPin = '',
  onJoin,
  onCancel,
  loading,
  error
}) => {
  const { t, language } = useLanguage();
  const [savedProfile] = useState(() => getSavedStudentProfile());
  const [showManualOverride, setShowManualOverride] = useState<boolean>(!savedProfile);
  const [pin, setPin] = useState(initialPin);
  const [selectedAttendanceNumber, setSelectedAttendanceNumber] = useState<number | undefined>(() => savedProfile?.attendanceNumber);
  const [customNameSuffix, setCustomNameSuffix] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'ATTENDANCE' | 'TYPE' | 'RANDOM'>('ATTENDANCE');
  const [nickname, setNickname] = useState(() => {
    if (savedProfile?.nickname) return savedProfile.nickname;
    if (savedProfile?.attendanceNumber) return language === 'ja' ? `${savedProfile.attendanceNumber}番` : `#${savedProfile.attendanceNumber}`;
    return '';
  });
  const [roomInfo, setRoomInfo] = useState<QuizRoomState | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<TeamId | 'RANDOM'>('RANDOM');
  const hasAutoJoinedRef = React.useRef<boolean>(false);

  const studentGradeNum = savedProfile?.classId ? parseInt(savedProfile.classId[0], 10) : undefined;
  const roomGradeNum = roomInfo?.grade?.startsWith('ES_G') ? parseInt(roomInfo.grade.replace('ES_G', ''), 10) : undefined;
  const isHigherGradeRoom = Boolean(studentGradeNum && roomGradeNum && studentGradeNum < roomGradeNum);

  // Auto-join immediately if initialPin (e.g. from QR scan) is present and device has a saved profile
  useEffect(() => {
    if (initialPin && initialPin.length === 4 && savedProfile?.nickname && !hasAutoJoinedRef.current && !loading && !error) {
      hasAutoJoinedRef.current = true;
      const timer = setTimeout(() => {
        onJoin(initialPin, savedProfile.nickname, selectedTeam === 'RANDOM' ? undefined : selectedTeam, savedProfile.attendanceNumber);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [initialPin, savedProfile, onJoin, loading, error, selectedTeam]);

  // Listen to room state when 4-digit PIN is entered
  useEffect(() => {
    if (pin.length === 4) {
      const unsub = safeSubscribe<QuizRoomState>(`rooms/${pin}`, (data) => {
        setRoomInfo(data);
      });
      return () => unsub();
    } else {
      setRoomInfo(null);
    }
  }, [pin]);

  // Generate random nickname from presets
  const handlePickRandomName = () => {
    const randomName = FUN_NICKNAMES[Math.floor(Math.random() * FUN_NICKNAMES.length)];
    if (selectedAttendanceNumber) {
      setNickname(`${selectedAttendanceNumber}番 ${randomName}`);
    } else {
      setNickname(randomName);
    }
  };

  const getLocalizedError = (err: string | null): string | null => {
    if (!err) return null;
    if (err === 'ROOM_NOT_FOUND' || err.includes('部屋が見つかりません') || err.includes('Room not found')) {
      return t('Room not found. Please check the 4-digit code.', '部屋が見つかりません。4桁の番号を確認してください。');
    }
    if (err === 'ROOM_CLOSED' || err.includes('すでに終了') || err.includes('already ended')) {
      return t('This quiz room has already ended.', 'このクイズルームはすでに終了しました。');
    }
    if (err === 'CONNECTION_ERROR' || err.includes('接続エラー') || err.includes('Connection error') || err.includes('Failed to sync')) {
      return t('A connection error occurred. Please check your connection.', '接続エラーが発生しました。通信環境を確認してください。');
    }
    if (err.includes('部屋に入れませんでした') || err.includes('Could not enter the room')) {
      return t('Could not enter the room. Please check the PIN.', '部屋に入れませんでした。PINコードを確認してください。');
    }
    if (err.includes('先生によって退室') || err.includes('removed by the teacher') || err.includes('removed by the host')) {
      return t('You were removed by the host. Please join again.', '先生・リーダーによって退室させられました。もう一度参加してください。');
    }
    return err;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    requestMobileFullscreen();
    if (pin.length !== 4 || !nickname.trim() || loading) return;
    const parsedNum = typeof selectedAttendanceNumber === 'number'
      ? selectedAttendanceNumber
      : typeof savedProfile?.attendanceNumber === 'number'
      ? savedProfile.attendanceNumber
      : (() => {
          const match = nickname.trim().match(/^(\d+)番/) || nickname.trim().match(/#(\d+)/);
          return match ? parseInt(match[1], 10) : undefined;
        })();
    await onJoin(pin, nickname.trim(), selectedTeam === 'RANDOM' ? undefined : selectedTeam, parsedNum);
  };

  return (
    <div className="w-full max-w-md mx-auto p-4 sm:p-6 select-none animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft size={16} />
          <span>{t('Back', 'もどる')}</span>
        </button>
        <span className="text-xs font-black px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
          {t('Student iPad', 'せいと用 iPad')}
        </span>
      </div>

      {/* Main Join Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border-4 border-purple-200 dark:border-purple-950/80">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-purple-500 to-indigo-600 text-white flex items-center justify-center mx-auto mb-3 shadow-xl text-2xl font-black">
            🎮
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {t('Join the Quiz!', 'クイズに参加しよう！')}
          </h2>
          <p className="text-xs font-bold text-slate-400 mt-1">
            {t('Join the Classroom Quiz Game', '教室のクイズゲームに参加')}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs font-bold text-center">
            {getLocalizedError(error)}
          </div>
        )}

        {isHigherGradeRoom && roomInfo && (
          <div className="mb-4 p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs text-left animate-in fade-in">
            <div className="flex items-center gap-2 font-black mb-1">
              <span>💡</span>
              <span>{t(`Grade ${roomGradeNum} Vocabulary Room`, `小学${roomGradeNum}年生の単語ルーム`)}</span>
            </div>
            <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300 font-medium">
              {t(
                `You are in Grade ${studentGradeNum}. This game uses Grade ${roomGradeNum} English, but cards include pictures to help you play!`,
                `あなたは小学${studentGradeNum}年生ですが、この部屋は${roomGradeNum}年生の単語です。カードのイラストを見て挑戦してみよう！`
              )}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Step 1: PIN Input */}
          <div>
            <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              {t('1. Room PIN', '1. へやのばんごう')}
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="1 2 3 4"
              className="w-full py-3.5 text-center font-mono font-black text-3xl tracking-widest rounded-2xl border-2 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-100 dark:focus:ring-purple-950/40"
              required
            />
          </div>

          {/* Step 2: Hybrid Nickname Selector */}
          <div>
            <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              {t('2. Name / Nickname', '2. なまえ・ニックネーム')}
            </label>

            {savedProfile && !showManualOverride ? (
              <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border-2 border-indigo-200 dark:border-indigo-800 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{savedProfile.avatar || getRandomAvatarEmoji(savedProfile.attendanceNumber)}</span>
                    <div className="text-left">
                      <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 block uppercase tracking-wider">
                        {t('Bound Profile on this iPad', 'このiPadの登録生徒')}
                      </span>
                      <strong className="text-base font-black text-slate-900 dark:text-white">
                        {savedProfile.nickname} ({savedProfile.classId} #{savedProfile.attendanceNumber})
                      </strong>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowManualOverride(true);
                      setActiveTab('TYPE');
                    }}
                    className="text-xs font-bold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-300 underline cursor-pointer"
                  >
                    {t('Change', '変更')}
                  </button>
                </div>
                {loading && (
                  <div className="flex items-center justify-center gap-2 py-1 text-indigo-600 dark:text-indigo-400 text-xs font-bold animate-pulse">
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
                    <span>{t('Entering room...', '部屋に入室しています...')}</span>
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Selector Tabs: Attendance Number is 1st & Recommended! */}
                <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl mb-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('ATTENDANCE')}
                    className={`py-1.5 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      activeTab === 'ATTENDANCE'
                        ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs ring-1 ring-purple-300 dark:ring-purple-700'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    <Hash size={13} />
                    <span>{t('Seat #', '出席番号')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('TYPE')}
                    className={`py-1.5 text-xs font-black rounded-xl transition-all cursor-pointer ${
                      activeTab === 'TYPE'
                        ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs ring-1 ring-purple-300 dark:ring-purple-700'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {t('Type Name', '名前入力')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('RANDOM');
                      handlePickRandomName();
                    }}
                    className={`py-1.5 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      activeTab === 'RANDOM'
                        ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs ring-1 ring-purple-300 dark:ring-purple-700'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    <Dices size={13} />
                    <span>{t('Random', 'おまかせ')}</span>
                  </button>
                </div>
              </>
            )}

            {/* Tab 1: Attendance Numbers 1-35 Quick Grid (Primary & Instant) */}
            {activeTab === 'ATTENDANCE' && (
              <div className="flex flex-col gap-2.5">
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border-2 border-slate-200 dark:border-slate-700">
                  <div className="text-[11px] font-black text-slate-500 dark:text-slate-400 mb-1.5 text-center">
                    {t('Tap your attendance number (1-35):', '自分の出席番号をタップしてください (1〜35):')}
                  </div>
                  <div className="grid grid-cols-6 sm:grid-cols-7 gap-1.5 max-h-48 overflow-y-auto p-0.5">
                    {Array.from({ length: Math.max(35, getClassSize(roomInfo?.schoolId || savedProfile?.schoolId, roomInfo?.classId || savedProfile?.classId)) }, (_, i) => i + 1).map((num) => {
                      const isSelected = selectedAttendanceNumber === num;
                      return (
                        <button
                          key={num}
                          type="button"
                          onClick={() => {
                            setSelectedAttendanceNumber(num);
                            const prefix = language === 'ja' ? `${num}番` : `#${num}`;
                            setNickname(customNameSuffix.trim() ? `${prefix} ${customNameSuffix.trim()}` : prefix);
                          }}
                          className={`h-11 sm:h-12 rounded-xl text-sm font-black transition-all flex items-center justify-center cursor-pointer ${
                            isSelected
                              ? 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-lg ring-3 ring-purple-400 scale-105'
                              : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-purple-400 active:scale-95'
                          }`}
                        >
                          {num}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Optional Custom Nickname Suffix (e.g. 27番 たろう) */}
                <div className="w-full">
                  <input
                    type="text"
                    maxLength={10}
                    value={customNameSuffix}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCustomNameSuffix(val);
                      if (selectedAttendanceNumber) {
                        const prefix = language === 'ja' ? `${selectedAttendanceNumber}番` : `#${selectedAttendanceNumber}`;
                        setNickname(val.trim() ? `${prefix} ${val.trim()}` : prefix);
                      } else if (val.trim()) {
                        setNickname(val.trim());
                      }
                    }}
                    placeholder={t('Add nickname (optional, e.g. Ken)', '名前を追加 (省略OK / 例: けんた)')}
                    className="w-full py-2 px-3 text-center font-bold text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* Tab 2: Custom Typing Input */}
            {activeTab === 'TYPE' && (
              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  maxLength={14}
                  value={nickname}
                  onChange={(e) => {
                    setNickname(e.target.value);
                    const match = e.target.value.match(/^(\d+)番/) || e.target.value.match(/#(\d+)/);
                    if (match) setSelectedAttendanceNumber(parseInt(match[1], 10));
                  }}
                  placeholder={t('Enter name (e.g. #27 Ken)', '名前を入力 (例: 27番 けんた)')}
                  className="w-full py-3 px-4 text-center font-black text-lg rounded-2xl border-2 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-100 dark:focus:ring-purple-950/40"
                />
              </div>
            )}

            {/* Tab 3: Random Kid-Friendly Nickname */}
            {activeTab === 'RANDOM' && (
              <div className="flex flex-col items-center gap-2.5">
                <div className="w-full py-3.5 px-4 text-center font-black text-xl bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-2 border-purple-200 dark:border-purple-800 rounded-2xl">
                  {nickname || t('Pick a name below!', '下のボタンを押して名前を決定！')}
                </div>
                <button
                  type="button"
                  onClick={handlePickRandomName}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-purple-100 dark:hover:bg-purple-950/80 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Dices size={14} className="text-purple-500" />
                  <span>{t('Change Name!', 'べつの名前にチェンジ！')}</span>
                </button>
              </div>
            )}
          </div>

          {/* Current selected preview */}
          {nickname ? (
            <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700">
              <UserCheck size={16} className="text-emerald-500" />
              <span>{t('Playing as:', '参加する名前:')}</span>
              {selectedAttendanceNumber && (
                <span className="px-2 py-0.5 rounded-lg bg-purple-600 text-white font-mono font-black text-xs shadow-xs">
                  #{selectedAttendanceNumber}
                </span>
              )}
              <strong className="text-purple-600 dark:text-purple-400 text-sm">{nickname}</strong>
            </div>
          ) : (
            <div className="text-center py-2 text-xs font-bold text-amber-500 dark:text-amber-400">
              {t('👆 Tap your attendance number above to proceed', '👆 上の番号をタップして出席番号を選んでください')}
            </div>
          )}

          {/* Step 3: Team Selection for Team Battle */}
          {roomInfo && roomInfo.mode === 'TEAM' && (
            <div>
              {roomInfo.teamAssignment === 'STUDENT_CHOICE' ? (
                <div className="pt-2 animate-in fade-in duration-200">
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    {t('3. Choose Team', '3. チームをえらぼう')}
                  </label>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    {(() => {
                      const isTug = roomInfo.gamePlayType === 'TUG_OF_WAR';
                      const isVolleyball = roomInfo.gamePlayType === 'VOLLEYBALL';
                      const activeTeams: TeamId[] = (isTug || isVolleyball)
                        ? ['team_red', 'team_white']
                        : (roomInfo.activeTeams || (roomInfo.teamCount === 2 ? ['team_red', 'team_white'] : RAINBOW_TEAM_ORDER.slice(0, roomInfo.teamCount || 2)));
                      const currentPlayers = Object.values(roomInfo.players || {});
                      const teamCounts: Partial<Record<TeamId, number>> = {};
                      activeTeams.forEach(id => {
                        teamCounts[id] = currentPlayers.filter(p => p.teamId === id).length;
                      });
                      const countValues = Object.values(teamCounts) as number[];
                      const minCount = countValues.length > 0 ? Math.min(...countValues) : 0;

                      return activeTeams.map((tId) => {
                        const preset = TEAM_PRESETS[tId];
                        const tCount = teamCounts[tId] || 0;
                        const isFull = tCount >= 10 || (tCount >= minCount + 2 && currentPlayers.length >= 8);
                        const isSelected = selectedTeam === tId;

                      return (
                        <button
                          key={tId}
                          type="button"
                          disabled={isFull}
                          onClick={() => setSelectedTeam(tId)}
                          className={`p-3 rounded-2xl border-2 text-left transition-all relative flex flex-col justify-between ${
                            isFull
                              ? 'opacity-50 border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/40 cursor-not-allowed'
                              : isSelected
                                ? 'border-purple-600 bg-purple-50/70 dark:bg-purple-950/40 ring-2 ring-purple-400 shadow-sm'
                                : 'border-slate-200 dark:border-slate-700 hover:border-purple-300 bg-white dark:bg-slate-800'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xl">{preset.emoji}</span>
                            {isFull ? (
                              <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                {t('Full', '満員')}
                              </span>
                            ) : (
                              <span className="text-[10px] font-black text-slate-400">
                                {teamCounts[tId]}{t(' players', '人')}
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-black mt-1 text-slate-900 dark:text-white">
                            {language === 'ja' ? preset.jaName : preset.name}
                          </span>
                          {isSelected && (
                            <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px] font-black">
                              ✓
                            </div>
                          )}
                        </button>
                      );
                    });
                  })()}
                </div>

                  <button
                    type="button"
                    onClick={() => setSelectedTeam('RANDOM')}
                    className={`w-full py-2 px-3 rounded-xl border text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                      selectedTeam === 'RANDOM'
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 ring-1 ring-purple-400'
                        : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    <Dices size={13} />
                    <span>{t('🎲 Surprise Me (Auto-Assign)', '🎲 おまかせ（空いているチームへ）')}</span>
                  </button>
                </div>
              ) : (
                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-black flex items-center gap-2">
                  <Users size={16} />
                  <span>{t('Team Battle (Teams will be auto-balanced)', 'チーム対抗戦（チームは自動でバランスよく決まります）')}</span>
                </div>
              )}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={pin.length !== 4 || !nickname.trim() || loading}
            className={`w-full py-4 rounded-2xl font-black text-base text-white shadow-xl flex items-center justify-center gap-2 transition-all ${
              pin.length === 4 && nickname.trim() && !loading
                ? 'bg-gradient-to-r from-purple-500 to-indigo-600 hover:brightness-105 active:scale-98 cursor-pointer shadow-purple-500/20'
                : 'bg-slate-300 dark:bg-slate-800 cursor-not-allowed text-slate-500 dark:text-slate-500'
            }`}
          >
            {loading ? (
              <span>{t('Joining...', '参加しています...')}</span>
            ) : (
              <>
                <span>🎮</span>
                <span>
                  {savedProfile && !showManualOverride
                    ? t(`Join as ${savedProfile.nickname}!`, `${savedProfile.nickname} として参加！`)
                    : t('JOIN GAME!', 'ゲームにはいる！')}
                </span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
