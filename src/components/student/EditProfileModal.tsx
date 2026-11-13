import React, { useState, useMemo } from 'react';
import { 
  StudentProfile, 
  AVATAR_CATEGORIES, 
  SECRET_CHARMS, 
  getDefaultSecretCharm,
  generateDefaultCallsign 
} from '@/types/roster';
import { updateStudentProfileInfo } from '@/services/studentProfile';
import { soundEffects } from '@/services/soundEffects';
import { useLanguage } from '@/context/LanguageContext';
import { X, Check, RefreshCw, Sparkles, User, AlertTriangle, KeyRound } from 'lucide-react';
import confetti from 'canvas-confetti';
import { AvatarDisplay } from '@/components/common/AvatarDisplay';

interface EditProfileModalProps {
  isOpen: boolean;
  profile: StudentProfile;
  onClose: () => void;
  onUpdated: (newProfile: StudentProfile) => void;
  onResetSeat?: () => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  profile,
  onClose,
  onUpdated,
  onResetSeat
}) => {
  const { t, language } = useLanguage();
  const [nickname, setNickname] = useState(profile.nickname);
  const [callsign, setCallsign] = useState(profile.callsign || generateDefaultCallsign(profile.nickname, profile.attendanceNumber, profile.classId));
  const [avatar, setAvatar] = useState(profile.avatar || '🐼');
  const [secretCharm, setSecretCharm] = useState(profile.secretCharm || getDefaultSecretCharm(profile.attendanceNumber));
  const [activeAvatarTab, setActiveAvatarTab] = useState<string>('animals');
  const [saving, setSaving] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  const unlockedAvatars = profile.inventory?.unlockedAvatars || [];
  const allCategories = useMemo(() => {
    if (unlockedAvatars.length === 0) return AVATAR_CATEGORIES;
    return [
      ...AVATAR_CATEGORIES,
      {
        id: 'exclusive',
        name: 'Rare',
        jaName: '限定',
        icon: '🌟',
        emojis: unlockedAvatars
      }
    ];
  }, [unlockedAvatars]);

  if (!isOpen) return null;

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      soundEffects.playCorrect();
      const updated = await updateStudentProfileInfo(
        profile.schoolId,
        profile.classId,
        profile.attendanceNumber,
        {
          nickname: nickname.trim() || profile.nickname,
          callsign: callsign.trim().toUpperCase().replace(/[^A-Z0-9\-]/g, '').slice(0, 6),
          avatar,
          secretCharm
        }
      );
      if (updated) {
        confetti({
          particleCount: 25,
          spread: 60,
          origin: { y: 0.6 }
        });
        onUpdated(updated);
        onClose();
      }
    } catch (err) {
      console.error('Error updating profile:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-xs select-none animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-slate-900 rounded-3xl sm:rounded-4xl w-[96vw] max-w-5xl h-[94dvh] max-h-[820px] p-5 sm:p-7 md:p-8 shadow-2xl border-4 sm:border-6 border-emerald-400 dark:border-emerald-500 relative flex flex-col justify-between overflow-y-auto overscroll-contain animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b-2 border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
            <div className="w-14 h-14 sm:w-18 sm:h-18 rounded-2xl sm:rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-white flex items-center justify-center shadow-md shrink-0">
              <AvatarDisplay avatar={avatar} frameId={profile.equipped?.frame} sizeClassName="w-10 h-10 sm:w-13 sm:h-13" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="px-3 py-0.5 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-black text-xs sm:text-sm border border-indigo-200 dark:border-indigo-800">
                  {profile.classId} #{profile.attendanceNumber === 0 ? 'Teacher' : `${profile.attendanceNumber}番`}
                </span>
                <span className="text-xs font-bold text-slate-400">
                  {t('Seat remains locked', '出席番号は保持されます')}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 dark:text-white leading-tight truncate">
                {t('Edit Profile', 'プロフィールの変更')}
              </h2>
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="p-2.5 sm:p-3 rounded-2xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            title={t('Close', 'とじる')}
          >
            <X size={26} className="stroke-[2.5]" />
          </button>
        </div>

        <form onSubmit={handleSave} className="flex-1 flex flex-col justify-between min-h-0 pt-3 pb-2 overflow-y-auto overscroll-contain">
          {/* 2-Column Responsive Stage Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-7 flex-1 min-h-0">
            {/* Left Column: Names & Actions (lg:col-span-5) */}
            <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                {/* Nickname */}
                <div>
                  <label className="block text-sm sm:text-base font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1.5">
                    {t('Nickname', 'ニックネーム（なまえ）')}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      maxLength={10}
                      placeholder={t('Enter your nickname', 'なまえをにゅうりょく')}
                      className="w-full h-14 sm:h-16 px-4 font-black text-lg sm:text-xl rounded-2xl border-3 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-hidden transition-colors shadow-2xs"
                    />
                    {nickname && (
                      <button
                        type="button"
                        onClick={() => setNickname('')}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm font-black p-1 cursor-pointer"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* Short Display Tag (Max 6ch) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                      <span>🏎️</span>
                      <span>{t('Display Tag (Max 6ch)', 'TV・レース用 短縮タグ')}</span>
                    </label>
                    <span className="text-xs font-bold text-slate-400">
                      {t('Max 6 chars', '最大6文字')}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={callsign}
                    onChange={(e) => setCallsign(e.target.value.toUpperCase().replace(/[^A-Z0-9\-]/g, '').slice(0, 6))}
                    maxLength={6}
                    placeholder="3-1-1"
                    className="w-full h-14 sm:h-16 px-4 text-center uppercase tracking-widest font-mono font-black text-2xl sm:text-3xl rounded-2xl border-3 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-hidden transition-colors shadow-2xs"
                  />
                  <p className="text-xs font-bold text-slate-400 mt-1.5 leading-relaxed">
                    {t(
                      '※Shown on 3D game leaderboards and big TV screen (e.g. 3-1-1, 4-4-14, SARA, KEN)',
                      '※大画面TVや3Dレースの順位表に「3-1-1」「4-4-14」「SARA」などの短縮タグでカッコよく表示されます！'
                    )}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 space-y-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full h-16 sm:h-18 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-lg sm:text-xl shadow-xl hover:shadow-2xl transition-all flex items-center justify-center gap-2.5 active:scale-98 cursor-pointer disabled:opacity-50"
                >
                  <Check size={22} className="stroke-[3]" />
                  <span>{saving ? t('Saving...', '保存中...') : t('Save Changes', '変更を保存する')}</span>
                </button>

                {/* Reset Seat Escape Hatch */}
                {onResetSeat && (!showConfirmReset ? (
                  <button
                    type="button"
                    onClick={() => setShowConfirmReset(true)}
                    className="w-full py-2 text-xs sm:text-sm text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 font-bold transition-colors text-center cursor-pointer"
                  >
                    {t('Need to change attendance number? (Reset seat)', '別の出席番号に切り替える（席の再設定・解除）')}
                  </button>
                ) : (
                  <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-300 dark:border-rose-900 animate-in fade-in duration-150 text-center">
                    <p className="text-xs sm:text-sm font-black text-rose-600 dark:text-rose-400 mb-2.5 flex items-center justify-center gap-1.5">
                      <AlertTriangle size={16} />
                      <span>{t('Release this seat and re-link device?', 'この席の登録を解除して選び直しますか？')}</span>
                    </p>
                    <div className="flex gap-2.5 justify-center">
                      <button
                        type="button"
                        onClick={() => setShowConfirmReset(false)}
                        className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black text-xs sm:text-sm cursor-pointer"
                      >
                        {t('Cancel', 'やめる')}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onResetSeat();
                        }}
                        className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs sm:text-sm shadow-md cursor-pointer"
                      >
                        {t('Yes, change seat', 'はい、解除して選び直す')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Avatar & Secret Charm (lg:col-span-7) */}
            <div className="lg:col-span-7 flex flex-col justify-between space-y-4 min-h-0">
              {/* Categorized Avatar Selector */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    {t('Choose Avatar Icon', 'アイコンをえらぶ')}
                  </label>
                  <span className="text-xs sm:text-sm font-black px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5 border border-emerald-300 dark:border-emerald-800">
                    <AvatarDisplay avatar={avatar} sizeClassName="w-5 h-5" />
                    <span>{t('Selected', '選択中')}</span>
                  </span>
                </div>

                {/* Category Tab Pills */}
                <div className={`grid ${allCategories.length > 7 ? 'grid-cols-8' : 'grid-cols-7'} gap-1.5 mb-2`}>
                  {allCategories.map((cat) => {
                    const isActive = activeAvatarTab === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setActiveAvatarTab(cat.id)}
                        className={`h-10 sm:h-11 px-1 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm transition-all flex items-center justify-center cursor-pointer whitespace-nowrap text-center ${
                          isActive
                            ? 'bg-emerald-500 text-white shadow-md ring-2 ring-emerald-300 dark:ring-emerald-700 scale-102'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        <span>{language === 'ja' ? cat.jaName : cat.name}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Emoji Grid: Exactly 3 rows of 8 emojis with zero scrollbar */}
                <div className="grid grid-cols-8 gap-1.5 sm:gap-2 p-2 sm:p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl sm:rounded-3xl border-2 border-slate-200 dark:border-slate-700">
                  {(allCategories.find(c => c.id === activeAvatarTab)?.emojis || allCategories[0].emojis).map((av) => (
                    <button
                      key={av}
                      type="button"
                      onClick={() => {
                        soundEffects.playTick();
                        setAvatar(av);
                      }}
                      className={`h-10 sm:h-11 md:h-11 rounded-xl sm:rounded-2xl text-xl sm:text-2xl flex items-center justify-center transition-all cursor-pointer ${
                        avatar === av
                          ? 'bg-emerald-100 dark:bg-emerald-950/80 ring-2.5 ring-emerald-500 scale-105 shadow-xs'
                          : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 hover:scale-105 active:scale-95'
                      }`}
                    >
                      <AvatarDisplay avatar={av} sizeClassName="w-6 h-6 sm:w-7 sm:h-7" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Secret Pass-Charm Picker */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <KeyRound size={16} className="text-amber-500" />
                    <span>{t('Secret Pass-Charm', 'ひみつのマーク（合言葉）')}</span>
                  </label>
                  <span className="text-xs sm:text-sm font-black px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 flex items-center gap-1.5 border border-amber-300 dark:border-amber-800">
                    <span className="text-base">{secretCharm}</span>
                    <span>{t('Secret', '合言葉')}</span>
                  </span>
                </div>
                <p className="text-xs font-bold text-amber-700 dark:text-amber-400 mb-2 leading-relaxed">
                  {t(
                    '*Never shown to classmates. Used to unlock your seat if you switch iPads.',
                    '※このマークは他の人には見えません。別のiPadから入るときの「合言葉」になります。'
                  )}
                </p>

                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 sm:gap-2.5">
                  {SECRET_CHARMS.map((charm) => {
                    const isSelected = secretCharm === charm.emoji;
                    const isSameAsPublicAvatar = avatar === charm.emoji;
                    return (
                      <button
                        key={charm.emoji}
                        type="button"
                        disabled={isSameAsPublicAvatar}
                        onClick={() => {
                          soundEffects.playTick();
                          setSecretCharm(charm.emoji);
                        }}
                        title={
                          isSameAsPublicAvatar
                            ? (language === 'ja' ? '表のアイコンと同じものは選べません' : 'Cannot match public avatar')
                            : (language === 'ja' ? charm.jaName : charm.name)
                        }
                        className={`h-16 sm:h-18 rounded-2xl flex flex-col items-center justify-center gap-0.5 sm:gap-1 transition-all border-2 relative cursor-pointer ${
                          isSameAsPublicAvatar
                            ? 'opacity-25 bg-slate-100 dark:bg-slate-800 border-dashed border-slate-300 dark:border-slate-700 cursor-not-allowed'
                            : isSelected
                              ? 'bg-amber-100 dark:bg-amber-950 border-amber-500 shadow-md ring-3 ring-amber-300 scale-102'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-amber-300 hover:scale-102 active:scale-95'
                        }`}
                      >
                        <span className="text-2xl sm:text-3xl leading-none">{charm.emoji}</span>
                        <span className="text-xs font-black text-slate-700 dark:text-slate-300 truncate w-full text-center">
                          {language === 'ja' ? charm.jaName : charm.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
