import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { SchoolId, StudentProfile, SCHOOL_CONFIGS, getRandomAvatarEmoji } from '@/types/roster';
import { safeSubscribe, safeSet, safeGet } from '@/services/rtdbSafe';
import { claimAttendanceNumber, getSavedStudentProfile, unlinkStudentDevice } from '@/services/studentProfile';
import { soundEffects } from '@/services/soundEffects';
import { SetupRoomState, BoundSeatInfo } from './types';
import { Check, CheckCircle2, Sparkles, User, Smartphone, ArrowRight, ArrowLeft, RefreshCw, AlertCircle, X, Edit3 } from 'lucide-react';
import confetti from 'canvas-confetti';

const POPULAR_AVATARS = [
  '🐼', '🦁', '🐯', '🐰', '🦊', '🐨', '🐵', '🐶', '🐱', '🐻',
  '🏎️', '🚀', '🛸', '⚽', '🏀', '⚡', '🔥', '🌟', '👑', '🌈'
];

interface ProfileStudioStudentProps {
  code: string;
  onFinished: (profile: StudentProfile) => void;
  onCancel?: () => void;
}

export const ProfileStudioStudent: React.FC<ProfileStudioStudentProps> = ({
  code,
  onFinished,
  onCancel,
}) => {
  const { t, language } = useLanguage();
  const [roomState, setRoomState] = useState<SetupRoomState | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Selected seat state (for newly creating a seat)
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [selectedAvatar, setSelectedAvatar] = useState<string>('🐼');
  const [nicknameInput, setNicknameInput] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [linkedProfile, setLinkedProfile] = useState<StudentProfile | null>(null);

  // Reclaim confirmation for an already-registered seat in cloud roster
  const [reclaimTarget, setReclaimTarget] = useState<{ num: number; info: BoundSeatInfo } | null>(null);

  // Read saved local profile to enable 1-tap quick re-connection
  const [existingSavedProfile] = useState<StudentProfile | null>(() => getSavedStudentProfile());

  // 1. Subscribe to setup room state
  useEffect(() => {
    let isDisposed = false;

    const unsub = safeSubscribe<SetupRoomState>(`setupRooms/${code}`, (data) => {
      if (isDisposed) return;
      if (!data) {
        setError(t('Setup room not found. Please check the code or scan again.', 'セットアップルームが見つかりません。番号を確認するか再度スキャンしてください。'));
        setLoading(false);
        return;
      }
      if (data.status === 'FINISHED') {
        setError(t('The teacher has closed or switched this room. Please scan the new QR code on the screen.', '先生がクラスを変更したか、ルームを終了しました。黒板の新しいQRコードを読み取ってください。'));
        setLoading(false);
        return;
      }
      setRoomState(data);
      setLoading(false);
      setError(null);
    });

    return () => {
      isDisposed = true;
      unsub();
    };
  }, [code, t]);

  // When a seat is tapped:
  const handleSelectSeat = (seatNum: number) => {
    if (saving || linkedProfile) return;
    const boundSeats = roomState?.boundSeats || {};
    const existingBound = boundSeats[seatNum];

    if (existingBound) {
      // Seat already registered in cloud roster: prompt confirmation
      soundEffects.playReveal();
      setReclaimTarget({ num: seatNum, info: existingBound });
      setSelectedSeat(null);
      return;
    }

    // Unclaimed seat: open creation drawer
    soundEffects.playTick();
    setSelectedSeat(seatNum);
    setSelectedAvatar(getRandomAvatarEmoji(seatNum));
    setNicknameInput(language === 'ja' ? `${seatNum}番` : `#${seatNum}`);
  };

  // Confirm existing registered student on this iPad
  const handleConfirmExistingSeat = async (seatNum: number, existingInfo: BoundSeatInfo) => {
    if (!roomState || saving) return;
    setSaving(true);
    try {
      const profile = await claimAttendanceNumber(
        roomState.schoolId,
        roomState.classId,
        seatNum,
        existingInfo.nickname,
        0,
        0,
        existingInfo.avatar
      );

      // Refresh RTDB setup room seat
      await safeSet(`setupRooms/${code}/boundSeats/${seatNum}`, {
        ...existingInfo,
        boundAt: Date.now(),
      });

      soundEffects.playCorrect();
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.7 },
      });

      setReclaimTarget(null);
      setLinkedProfile(profile);
    } catch (err) {
      console.error('Error claiming existing seat:', err);
      setError(t('Failed to link iPad. Please try again.', 'ひも付けに失敗しました。もう一度お試しください。'));
    } finally {
      setSaving(false);
    }
  };

  // Submit and save newly-created profile
  const handleConfirmNewProfile = async () => {
    if (!selectedSeat || !roomState || saving) return;

    setSaving(true);
    try {
      const finalNickname = nicknameInput.trim() || (language === 'ja' ? `${selectedSeat}番` : `#${selectedSeat}`);
      
      // 1. Claim cloud student profile & write to iPad localStorage
      const profile = await claimAttendanceNumber(
        roomState.schoolId,
        roomState.classId,
        selectedSeat,
        finalNickname,
        0,
        0,
        selectedAvatar
      );

      // 2. Notify setup room in RTDB that this seat is claimed
      const seatInfo: BoundSeatInfo = {
        attendanceNumber: selectedSeat,
        nickname: finalNickname,
        avatar: selectedAvatar,
        boundAt: Date.now(),
      };
      await safeSet(`setupRooms/${code}/boundSeats/${selectedSeat}`, seatInfo);

      // 3. Play victory chime & confetti
      soundEffects.playCorrect();
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.7 },
      });

      setLinkedProfile(profile);
    } catch (err) {
      console.error('Error claiming seat:', err);
      setError(t('Failed to link iPad. Please try again.', 'ひも付けに失敗しました。もう一度お試しください。'));
    } finally {
      setSaving(false);
    }
  };

  const schoolConfig = roomState?.schoolId ? SCHOOL_CONFIGS[roomState.schoolId] : null;
  const boundSeats = roomState?.boundSeats || {};
  const MAX_SEATS = 36;
  const seatsArray = Array.from({ length: MAX_SEATS }, (_, i) => i + 1);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl border-2 border-slate-200 dark:border-slate-800 animate-pulse">
          <div className="text-4xl mb-3">🔄</div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white mb-1">
            {t('Connecting to Classroom...', '教室に接続中...')}
          </h2>
          <p className="text-xs font-bold text-slate-400">
            {t(`Classroom Setup PIN: ${code}`, `PINコード: ${code}`)}
          </p>
        </div>
      </div>
    );
  }

  if (error || !roomState) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl border-2 border-rose-300 dark:border-rose-900">
          <div className="text-4xl mb-3">⚠️</div>
          <h2 className="text-lg font-black text-rose-600 dark:text-rose-400 mb-2">
            {t('Connection Error', '接続エラー')}
          </h2>
          <p className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
            {error || t('Could not join setup room.', 'セットアップルームに接続できませんでした。')}
          </p>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="w-full py-3 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-black text-xs hover:bg-slate-200 cursor-pointer"
            >
              {t('Back to Home', 'ホームに戻る')}
            </button>
          )}
        </div>
      </div>
    );
  }

  // 3. Celebration Screen: When profile is successfully linked!
  if (linkedProfile) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col items-center justify-center p-4 select-none">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl border-4 border-emerald-400 dark:border-emerald-500 animate-in zoom-in-95 duration-200">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center mx-auto mb-4 text-4xl shadow-xl animate-bounce">
            {linkedProfile.avatar || selectedAvatar}
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-black text-xs mb-2">
            <CheckCircle2 size={14} />
            <span>{t('iPad Setup Complete!', 'iPadセットアップ完了！')}</span>
          </span>

          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-1">
            {linkedProfile.nickname}
          </h2>

          <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-6">
            {schoolConfig?.name || '小学校'} • {roomState.classId} #{linkedProfile.attendanceNumber}
          </p>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 mb-6 text-xs font-bold text-slate-600 dark:text-slate-300 leading-relaxed">
            {t(
              'Your iPad is now permanently linked to this seat. Look at the Front TV to see your desk light up!',
              <>このiPadの<ruby>設定<rt className="text-[7px]">せってい</rt></ruby>が<ruby>完了<rt className="text-[7px]">かんりょう</rt></ruby>しました！<ruby>前<rt className="text-[7px]">まえ</rt></ruby>のテレビで<ruby>席<rt className="text-[7px]">せき</rt></ruby>が<ruby>光<rt className="text-[7px]">ひか</rt></ruby>っているのを<ruby>確認<rt className="text-[7px]">かくにん</rt></ruby>しよう！</>
            )}
          </div>

          <button
            type="button"
            onClick={() => onFinished(linkedProfile)}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-base shadow-xl hover:brightness-105 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>{t('Go to Student Home', 'ホーム画面へすすむ')}</span>
            <ArrowRight size={18} />
          </button>

          <button
            type="button"
            onClick={async () => {
              soundEffects.playTick();
              await unlinkStudentDevice();
              setLinkedProfile(null);
              setSelectedSeat(null);
            }}
            className="w-full py-2.5 text-xs font-bold text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors cursor-pointer mt-1"
          >
            {t('Oops, wrong number? Pick again', '番号を間違えた？ 選び直す')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col p-4 sm:p-6 select-none">
      {/* Header Bar */}
      <div className="max-w-4xl mx-auto w-full flex items-center justify-between mb-4">
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 px-3 py-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <ArrowLeft size={16} />
            <span>{t('Cancel', 'もどる')}</span>
          </button>
        ) : (
          <div />
        )}

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 font-black text-xs shadow-xs">
            {schoolConfig?.shortKanji || schoolConfig?.name || '学校'} {roomState.classId}
          </span>
          <span className="font-mono text-xs font-black text-slate-400">
            PIN: {code}
          </span>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col">
        {/* Title & Instructions */}
        <div className="text-center mb-4 sm:mb-5">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white text-2xl font-black mb-2 shadow-md">
            📱
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">
            {t('Pick Your Attendance Number', <><ruby>自分<rt className="text-[8px] font-normal text-slate-400">じぶん</rt></ruby>の<ruby>出席番号<rt className="text-[8px] font-normal text-slate-400">しゅっせきばんごう</rt></ruby>をえらぼう！</>)}
          </h1>
          <p className="text-xs font-bold text-slate-400 mt-0.5">
            {t('Tap your desk number to link this iPad', '番号をタップしてこのiPadをつなぐ')}
          </p>
        </div>

        {/* Quick Re-Connect Banner if iPad already belongs to this class */}
        {existingSavedProfile && existingSavedProfile.classId === roomState.classId && existingSavedProfile.attendanceNumber > 0 && !linkedProfile && (
          <div className="mb-4 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-indigo-500/15 border-2 border-emerald-400 dark:border-emerald-600 shadow-md flex items-center justify-between gap-3 animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-2xl sm:text-3xl shrink-0">{existingSavedProfile.avatar || '🐼'}</span>
              <div className="min-w-0">
                <span className="text-xs sm:text-sm font-black text-emerald-800 dark:text-emerald-300 block truncate">
                  {t(`Welcome back, #${existingSavedProfile.attendanceNumber} ${existingSavedProfile.nickname}!`, `おかえり！ #${existingSavedProfile.attendanceNumber} ${existingSavedProfile.nickname}`)}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">
                  {t('Tap to connect this iPad immediately', '1タップでこの番号として接続する')}
                </span>
              </div>
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={() => handleConfirmExistingSeat(existingSavedProfile.attendanceNumber, {
                attendanceNumber: existingSavedProfile.attendanceNumber,
                nickname: existingSavedProfile.nickname,
                avatar: existingSavedProfile.avatar,
                boundAt: Date.now()
              })}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md active:scale-95 transition-all shrink-0 cursor-pointer"
            >
              {t('Connect Now', 'すぐ接続！')}
            </button>
          </div>
        )}

        {/* 6x6 Attendance Grid (36 seats, clean landscape layout) */}
        <div className="p-3 sm:p-5 bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-200 dark:border-slate-800 shadow-xl mb-6">
          <div className="grid grid-cols-6 gap-2 sm:gap-2.5">
            {seatsArray.map((seatNum) => {
              const seatData: BoundSeatInfo | undefined = boundSeats[seatNum];
              const isTaken = Boolean(seatData);
              const isSelected = selectedSeat === seatNum;

              return (
                <button
                  key={seatNum}
                  type="button"
                  disabled={saving}
                  onClick={() => handleSelectSeat(seatNum)}
                  className={`h-15 sm:h-18 rounded-2xl font-black transition-all flex flex-col items-center justify-between p-1.5 relative cursor-pointer active:scale-95 ${
                    isSelected
                      ? 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-xl ring-4 ring-purple-400 scale-105 z-10'
                      : isTaken
                      ? 'bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 border-2 border-emerald-400 dark:border-emerald-600 hover:border-emerald-500 shadow-2xs'
                      : 'bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 border-2 border-slate-200 dark:border-slate-700 hover:border-purple-400 shadow-xs'
                  }`}
                >
                  <div className="w-full flex items-center justify-between px-1">
                    <span className={`text-xs font-mono font-black ${isSelected ? 'text-white' : ''}`}>
                      #{seatNum}
                    </span>
                    {isTaken && (
                      <span className="text-[9px] px-1 rounded bg-emerald-600 text-white font-bold">
                        登録済
                      </span>
                    )}
                  </div>

                  {isTaken && seatData ? (
                    <div className="flex items-center gap-1 max-w-full px-0.5">
                      <span className="text-xs shrink-0">{seatData.avatar || '🐼'}</span>
                      <span className="text-[10px] sm:text-[11px] font-black truncate max-w-[70px]">
                        {seatData.nickname}
                      </span>
                    </div>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-400 opacity-60">
                      {language === 'ja' ? '空席' : 'Empty'}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* New Profile Confirmation Drawer (When an empty seat is tapped) */}
        {selectedSeat && (
          <div className="p-5 sm:p-6 bg-white dark:bg-slate-900 rounded-3xl border-3 border-purple-500 shadow-2xl animate-in slide-in-from-bottom-4 duration-200 mb-6">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-2xl bg-purple-600 text-white font-mono font-black text-lg flex items-center justify-center shadow-md">
                  #{selectedSeat}
                </span>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
                    {t(`Seat #${selectedSeat}`, `出席番号: ${selectedSeat}番`)}
                  </h3>
                  <span className="text-xs text-slate-400 font-bold">
                    {schoolConfig?.shortKanji || '学校'} {roomState.classId}
                  </span>
                </div>
              </div>

              <div className="text-3xl select-none">
                {selectedAvatar}
              </div>
            </div>

            {/* Avatar Selector Carousel */}
            <div className="mb-4">
              <label className="block text-xs font-black text-slate-500 dark:text-slate-400 mb-2">
                {t('Choose Avatar Emoji:', 'すきなアイコンをえらぼう:')}
              </label>
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                {POPULAR_AVATARS.map((av) => (
                  <button
                    key={av}
                    type="button"
                    onClick={() => {
                      soundEffects.playTick();
                      setSelectedAvatar(av);
                    }}
                    className={`w-11 h-11 shrink-0 rounded-2xl text-2xl flex items-center justify-center transition-all cursor-pointer ${
                      selectedAvatar === av
                        ? 'bg-purple-100 dark:bg-purple-950/80 border-2 border-purple-500 scale-110 shadow-md'
                        : 'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-purple-300'
                    }`}
                  >
                    {av}
                  </button>
                ))}
              </div>
            </div>

            {/* Nickname Input */}
            <div className="mb-5">
              <label className="block text-xs font-black text-slate-500 dark:text-slate-400 mb-1.5">
                {t('Name on Screen (Optional):', '表示する名前 (省略OK・そのままでもOK):')}
              </label>
              <input
                type="text"
                maxLength={12}
                value={nicknameInput}
                onChange={(e) => setNicknameInput(e.target.value)}
                placeholder={language === 'ja' ? `${selectedSeat}番 けんた` : `#${selectedSeat} Ken`}
                className="w-full py-3 px-4 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-black text-base focus:border-purple-500 focus:outline-none"
              />
            </div>

            {/* Confirm Button */}
            <button
              type="button"
              disabled={saving}
              onClick={handleConfirmNewProfile}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-emerald-600 text-white font-black text-base shadow-xl hover:brightness-105 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-purple-500/25"
            >
              {saving ? (
                <span>{t('Linking iPad...', 'iPadをひも付け中...')}</span>
              ) : (
                <>
                  <span>✨</span>
                  <span>{t('Link This iPad (Confirm)', 'この番号で決定！')}</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </div>
        )}

        {/* Existing Registered Seat Modal (When tapping a seat that's already in the roster) */}
        {reclaimTarget && (
          <div 
            className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
            onClick={() => setReclaimTarget(null)}
          >
            <div 
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl border-4 border-emerald-400 dark:border-emerald-600"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center mx-auto mb-3 text-3xl shadow-md">
                {reclaimTarget.info.avatar || '🐼'}
              </div>

              <span className="font-mono text-xs font-black px-2 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 mb-1 inline-block">
                #{reclaimTarget.num}
              </span>

              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-1">
                {reclaimTarget.info.nickname}
              </h3>

              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 font-bold leading-relaxed">
                {t(
                  `Log in to this iPad as #${reclaimTarget.num} ${reclaimTarget.info.nickname}?`,
                  `このiPadを「#${reclaimTarget.num} ${reclaimTarget.info.nickname}」としてログインしますか？`
                )}
              </p>

              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleConfirmExistingSeat(reclaimTarget.num, reclaimTarget.info)}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-sm shadow-md hover:brightness-105 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Check size={18} />
                  <span>{t('Yes, This is Me!', 'はい、この番号です！')}</span>
                </button>

                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    soundEffects.playTick();
                    setSelectedSeat(reclaimTarget.num);
                    setSelectedAvatar(reclaimTarget.info.avatar || '🐼');
                    setNicknameInput(reclaimTarget.info.nickname || '');
                    setReclaimTarget(null);
                  }}
                  className="w-full py-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 font-black text-xs hover:bg-purple-100 dark:hover:bg-purple-900/60 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Edit3 size={14} />
                  <span>{t('Edit Name or Avatar', '名前やアイコンを変更する')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setReclaimTarget(null)}
                  className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 cursor-pointer"
                >
                  {t('Cancel / Choose Different Seat', '別の番号をえらぶ')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
