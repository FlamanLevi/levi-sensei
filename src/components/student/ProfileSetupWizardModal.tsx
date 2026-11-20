import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  AVATAR_CATEGORIES,
  FLAG_REGIONS,
  SECRET_CHARMS,
  ALL_SECRET_CHARM_EMOJIS,
  getFlagMetadata,
  getRandomAvatarEmoji,
  pickCompletelyRandomAvatar,
  generateDefaultCallsign,
} from '@/types/roster';
import { AvatarDisplay } from '@/components/common/AvatarDisplay';
import { soundEffects } from '@/services/soundEffects';
import { useLanguage } from '@/context/LanguageContext';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  KeyRound,
  Lock,
  Sparkles,
  User,
  X,
  AlertTriangle,
} from 'lucide-react';

export interface ProfileWizardResult {
  nickname: string;
  avatar: string;
  secretCharm: string;
  callsign: string;
}

interface ProfileSetupWizardModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  seatNumber: number;
  classId: string;
  initialNickname?: string;
  initialAvatar?: string;
  initialSecretCharm?: string;
  initialCallsign?: string;
  frameId?: string;
  unlockedRareAvatars?: string[];
  submitting?: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onChangeSeat?: () => void;
  onResetSeat?: () => void;
  onSubmit: (result: ProfileWizardResult) => void | Promise<void>;
}

export const ProfileSetupWizardModal: React.FC<ProfileSetupWizardModalProps> = ({
  isOpen,
  mode,
  seatNumber,
  classId,
  initialNickname,
  initialAvatar,
  initialSecretCharm,
  initialCallsign,
  frameId,
  unlockedRareAvatars = [],
  submitting = false,
  errorMessage = null,
  onClose,
  onChangeSeat,
  onResetSeat,
  onSubmit,
}) => {
  const { t, language } = useLanguage();
  const isTeacherSeat = seatNumber === 0;
  const defaultSeatNick = isTeacherSeat
    ? (language === 'ja' ? '先生' : 'Teacher')
    : (language === 'ja' ? `${seatNumber}番` : `#${seatNumber}`);

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [nickname, setNickname] = useState<string>(initialNickname || defaultSeatNick);
  const [avatar, setAvatar] = useState<string>(
    initialAvatar || (isTeacherSeat ? '👨‍🏫' : getRandomAvatarEmoji(seatNumber))
  );
  // In 'create' mode, require the student to actively tap a secret charm (no silent pre-selection!)
  const [secretCharm, setSecretCharm] = useState<string>(
    mode === 'edit' ? (initialSecretCharm || '') : (initialSecretCharm || '')
  );
  const [activeAvatarTab, setActiveAvatarTab] = useState<string>('animals');
  const [activeFlagRegion, setActiveFlagRegion] = useState<string>('asia');
  const [isPeekingSecret, setIsPeekingSecret] = useState<boolean>(false);
  const [showConfirmReset, setShowConfirmReset] = useState<boolean>(false);

  // Sync state when modal opens for a new seat/profile
  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    setNickname(initialNickname || defaultSeatNick);
    setAvatar(initialAvatar || (isTeacherSeat ? '👨‍🏫' : getRandomAvatarEmoji(seatNumber)));
    setSecretCharm(mode === 'edit' ? (initialSecretCharm || '') : (initialSecretCharm || ''));
    setActiveAvatarTab('animals');
    setActiveFlagRegion('asia');
    setIsPeekingSecret(false);
    setShowConfirmReset(false);
  }, [isOpen, seatNumber, mode, initialNickname, initialAvatar, initialSecretCharm]);

  const allCategories = useMemo(() => {
    if (!unlockedRareAvatars || unlockedRareAvatars.length === 0) return AVATAR_CATEGORIES;
    return [
      ...AVATAR_CATEGORIES,
      {
        id: 'exclusive',
        name: 'Rare',
        jaName: '限定',
        icon: '🌟',
        emojis: unlockedRareAvatars,
      },
    ];
  }, [unlockedRareAvatars]);

  if (!isOpen) return null;

  const flagMeta = getFlagMetadata(avatar);
  const finalNickname = nickname.trim() || defaultSeatNick;
  const resolvedCallsign =
    initialCallsign ||
    (isTeacherSeat ? 'TEACH' : generateDefaultCallsign(finalNickname, seatNumber, classId));

  const secretCharmDef = SECRET_CHARMS.find((c) => c.emoji === secretCharm);

  const handlePickAvatar = (emoji: string) => {
    soundEffects.playTick();
    setAvatar(emoji);
    if (secretCharm && emoji === secretCharm) {
      const alt = ALL_SECRET_CHARM_EMOJIS.find((c) => c !== emoji) || '🔑';
      setSecretCharm(alt);
    }
  };

  const handleRollRandomAvatar = () => {
    soundEffects.playDiceRattle();
    const next = pickCompletelyRandomAvatar(avatar);
    setAvatar(next);
    if (secretCharm && next === secretCharm) {
      const alt = ALL_SECRET_CHARM_EMOJIS.find((c) => c !== next) || '🔑';
      setSecretCharm(alt);
    }
  };

  const handlePickSecretCharm = (emoji: string) => {
    if (emoji === avatar) return;
    soundEffects.playTick();
    setSecretCharm(emoji);
  };

  const canProceedFromStep3 = Boolean(secretCharm);

  const handleFinalSubmit = () => {
    if (submitting) return;
    if (!secretCharm) {
      setStep(3);
      return;
    }
    onSubmit({
      nickname: finalNickname,
      avatar,
      secretCharm,
      callsign: resolvedCallsign,
    });
  };

  const stepLabels = [
    { num: 1 as const, en: '1. Name', ja: '1. なまえ' },
    { num: 2 as const, en: '2. Icon', ja: '2. アイコン' },
    { num: 3 as const, en: '3. Secret', ja: '3. ひみつ' },
    { num: 4 as const, en: '4. Check', ja: '4. かくにん' },
  ];

  const activeCategoryObj = allCategories.find((c) => c.id === activeAvatarTab) || allCategories[0];
  const activeRegionObj = FLAG_REGIONS.find((r) => r.id === activeFlagRegion) || FLAG_REGIONS[0];

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/80 backdrop-blur-xs select-none animate-in fade-in duration-150"
      onClick={() => !submitting && onClose()}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-3xl sm:rounded-4xl w-[96vw] max-w-4xl h-[92dvh] max-h-[680px] p-4 sm:p-6 shadow-2xl border-4 border-emerald-400 dark:border-emerald-500 flex flex-col justify-between overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header + Step Progress Bar */}
        <div className="shrink-0 space-y-2.5 pb-3 border-b-2 border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              <span className="px-2.5 py-1 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-black text-xs sm:text-sm border border-emerald-200 dark:border-emerald-800 shrink-0">
                {classId} {isTeacherSeat ? (language === 'ja' ? '00番 先生' : '#00 Teacher') : `#${seatNumber}番`}
              </span>
              <h2 className="text-base sm:text-xl font-black text-slate-900 dark:text-white truncate">
                {mode === 'edit'
                  ? t('Edit Profile', <>プロフィールの<ruby>変更<rt>へんこう</rt></ruby></>)
                  : t('Create Your Profile', <>プロフィールを<ruby>作<rt>つく</rt></ruby>ろう！</>)}
              </h2>
              {onChangeSeat && mode === 'create' && (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={onChangeSeat}
                  className="text-xs font-bold text-slate-500 hover:text-emerald-600 dark:text-slate-400 underline cursor-pointer shrink-0"
                >
                  {t('Wrong seat?', '番号がちがう？')}
                </button>
              )}
            </div>

            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
              title={t('Close', 'とじる')}
            >
              <X size={22} className="stroke-[2.5]" />
            </button>
          </div>

          {/* 4-Step Tabs */}
          <div className="grid grid-cols-4 gap-1.5">
            {stepLabels.map((s) => {
              const isCurrent = step === s.num;
              const isDone = step > s.num;
              const canClick = mode === 'edit' || s.num < step || (s.num === 4 && canProceedFromStep3);
              return (
                <button
                  key={s.num}
                  type="button"
                  disabled={!canClick}
                  onClick={() => {
                    if (!canClick) return;
                    soundEffects.playTick();
                    setStep(s.num);
                  }}
                  className={`py-1.5 px-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-1 whitespace-nowrap ${
                    isCurrent
                      ? 'bg-emerald-500 text-white shadow-sm ring-2 ring-emerald-300 dark:ring-emerald-700'
                      : isDone
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 cursor-pointer'
                      : mode === 'edit'
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 cursor-pointer'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-default'
                  }`}
                >
                  {isDone && <Check size={13} className="stroke-[3]" />}
                  <span>{language === 'ja' ? s.ja : s.en}</span>
                </button>
              );
            })}
          </div>

          {errorMessage && (
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-300 text-xs font-black text-center">
              {errorMessage}
            </div>
          )}
        </div>

        {/* Main Step Stage (Landscape 2-Column) */}
        <div className="flex-1 min-h-0 py-3 overflow-y-auto overscroll-contain flex items-center">
          {/* STEP 1: NICKNAME */}
          {step === 1 && (
            <div className="w-full grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
              <div className="md:col-span-5 space-y-3 bg-slate-50 dark:bg-slate-800/60 p-4 sm:p-5 rounded-3xl border-2 border-slate-200 dark:border-slate-700">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md">
                  <User size={24} />
                </div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                  {t('Step 1: Your Nickname', <>ステップ1：ニックネームを<ruby>決<rt>き</rt></ruby>めよう</>)}
                </h3>
                <p className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 leading-relaxed">
                  {t(
                    'This name appears on the big TV, race leaderboards, and game lobbies. Use your first name, hiragana, romaji, or a fun nickname (up to 10 characters).',
                    <>このなまえは、まえのテレビやゲームの<ruby>順位表<rt>じゅんいひょう</rt></ruby>に<ruby>出<rt>で</rt></ruby>ます！ひらがな・ローマ<ruby>字<rt>じ</rt></ruby>・ニックネームなど、10<ruby>文字<rt>もじ</rt></ruby>まで<ruby>入力<rt>にゅうりょく</rt></ruby>できるよ。</>
                  )}
                </p>
              </div>

              <div className="md:col-span-7 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    {t('Nickname (Max 10 chars)', 'ニックネーム（10もじまで）')}
                  </label>
                  <span className="text-xs font-mono font-black px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {nickname.length} / 10
                  </span>
                </div>

                <input
                  type="text"
                  maxLength={10}
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder={language === 'ja' ? '例: たろう / Ken / さくら' : 'e.g. Ken / Sara'}
                  autoFocus
                  className="w-full h-16 px-5 font-black text-xl sm:text-2xl rounded-2xl border-3 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-hidden shadow-xs"
                />

                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      soundEffects.playTick();
                      setNickname(defaultSeatNick);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-black transition-colors cursor-pointer"
                  >
                    {t(`Just use "${defaultSeatNick}"`, `「${defaultSeatNick}」をそのままつかう`)}
                  </button>
                  <span className="text-[11px] font-bold text-slate-400">
                    {t('You can change this anytime in the lobby!', 'あとからいつでもへんこうできるよ！')}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: AVATAR & NESTED FLAGS */}
          {step === 2 && (
            <div className="w-full h-full grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch min-h-0">
              {/* Left Preview */}
              <div className="md:col-span-4 flex flex-col items-center justify-center gap-3 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-3xl border-2 border-slate-200 dark:border-slate-700 text-center">
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-white flex items-center justify-center shadow-lg">
                  <AvatarDisplay avatar={avatar} frameId={frameId} sizeClassName="w-16 h-16 text-5xl" />
                </div>

                <div>
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block">
                    {classId} {isTeacherSeat ? '00' : `#${seatNumber}`}
                  </span>
                  <strong className="text-lg font-black text-slate-900 dark:text-white block truncate max-w-[200px]">
                    {finalNickname}
                  </strong>
                  {flagMeta && (
                    <span className="mt-1 inline-block px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-200 text-xs font-black">
                      {language === 'ja' ? `${flagMeta.jaName} (${flagMeta.name})` : flagMeta.name}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleRollRandomAvatar}
                  className="w-full py-2.5 px-4 rounded-2xl bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/80 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-200 font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 border-2 border-emerald-300 dark:border-emerald-700 transition-all active:scale-95 cursor-pointer"
                >
                  <span>🎲</span>
                  <span>{t('Random Icon', 'ランダムでえらぶ')}</span>
                </button>
              </div>

              {/* Right Picker */}
              <div className="md:col-span-8 flex flex-col min-h-0 gap-2">
                {/* Category Tabs */}
                <div className="grid grid-cols-7 gap-1 shrink-0">
                  {allCategories.map((cat) => {
                    const isActive = activeAvatarTab === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          soundEffects.playTick();
                          setActiveAvatarTab(cat.id);
                        }}
                        className={`h-9 sm:h-10 px-1 rounded-xl font-black text-[11px] sm:text-xs transition-all flex items-center justify-center cursor-pointer whitespace-nowrap ${
                          isActive
                            ? 'bg-emerald-500 text-white shadow-sm ring-2 ring-emerald-300 dark:ring-emerald-700'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        <span>{language === 'ja' ? cat.jaName : cat.name}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Nested Region Row when Flags Tab is Active */}
                {activeAvatarTab === 'flags' && (
                  <div className="grid grid-cols-5 gap-1 shrink-0">
                    {FLAG_REGIONS.map((reg) => {
                      const isReg = activeFlagRegion === reg.id;
                      return (
                        <button
                          key={reg.id}
                          type="button"
                          onClick={() => {
                            soundEffects.playTick();
                            setActiveFlagRegion(reg.id);
                          }}
                          className={`py-1.5 px-1 rounded-xl font-black text-[10px] sm:text-xs transition-all flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap ${
                            isReg
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100'
                          }`}
                        >
                          <span>{reg.icon}</span>
                          <span className="truncate">{language === 'ja' ? reg.jaName : reg.name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Emoji / Flag Grid */}
                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-2 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border-2 border-slate-200 dark:border-slate-700">
                  {activeAvatarTab === 'flags' ? (
                    <div className="grid grid-cols-5 sm:grid-cols-6 gap-2">
                      {activeRegionObj.countries.map((c) => (
                        <button
                          key={c.code}
                          type="button"
                          onClick={() => handlePickAvatar(c.emoji)}
                          title={`${c.name} / ${c.jaName}`}
                          className={`py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                            avatar === c.emoji
                              ? 'bg-emerald-100 dark:bg-emerald-950/80 ring-2.5 ring-emerald-500 scale-105 shadow-xs'
                              : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95'
                          }`}
                        >
                          <AvatarDisplay avatar={c.emoji} sizeClassName="w-8 h-6" />
                          <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200 truncate w-full text-center leading-tight">
                            {language === 'ja' ? c.jaName : c.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-8 gap-1.5 sm:gap-2">
                      {activeCategoryObj.emojis.map((av, idx) => (
                        <button
                          key={`${av}-${idx}`}
                          type="button"
                          onClick={() => handlePickAvatar(av)}
                          className={`h-11 sm:h-12 rounded-xl text-2xl flex items-center justify-center transition-all cursor-pointer ${
                            avatar === av
                              ? 'bg-emerald-100 dark:bg-emerald-950/80 ring-2.5 ring-emerald-500 scale-105 shadow-xs'
                              : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95'
                          }`}
                        >
                          <AvatarDisplay avatar={av} sizeClassName="w-7 h-7" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: SECRET PASS-CHARM */}
          {step === 3 && (
            <div className="w-full grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              <div className="md:col-span-5 space-y-3 bg-amber-50 dark:bg-amber-950/40 p-4 sm:p-5 rounded-3xl border-2 border-amber-300 dark:border-amber-700">
                <div className="flex items-center gap-2.5">
                  <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shrink-0">
                    <KeyRound size={22} />
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-amber-950 dark:text-amber-100 leading-tight">
                    {t('Step 3: Secret Pass-Charm', <>ステップ3：ひみつのマーク</>)}
                  </h3>
                </div>

                <p className="text-xs sm:text-sm font-bold text-amber-900 dark:text-amber-200 leading-relaxed">
                  {t(
                    'This is your secret key! It keeps classmates or other grades from taking your seat, XP, and Gold.',
                    <>これは<ruby>大切<rt>たいせつ</rt></ruby>な「ひみつのカギ」だよ！ほかの<ruby>人<rt>ひと</rt></ruby>があなたの<ruby>席<rt>せき</rt></ruby>やXP・ゴールドをまちがえて<ruby>使<rt>つか</rt></ruby>えないように<ruby>守<rt>まも</rt></ruby>ってくれます。</>
                  )}
                </p>

                <div className="p-2.5 rounded-2xl bg-white/80 dark:bg-slate-900/70 border border-amber-300 dark:border-amber-700 text-xs font-black text-rose-600 dark:text-rose-300 flex items-start gap-2">
                  <span>🤫</span>
                  <span>
                    {t(
                      'Remember which mark you pick, and keep it secret from friends!',
                      <>えらんだマークは<ruby>忘<rt>わす</rt></ruby>れないでおぼえて、おともだちにはひみつにしてね！</>
                    )}
                  </span>
                </div>
              </div>

              <div className="md:col-span-7 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-black text-slate-700 dark:text-slate-200">
                    {secretCharm
                      ? t('Selected Secret Mark:', 'えらんだ ひみつのマーク:')
                      : t('Tap 1 mark you will remember:', 'おぼえやすいマークを1つタップしてね！')}
                  </span>
                  {secretCharm && secretCharmDef && (
                    <span className="px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 text-xs font-black border border-amber-300 dark:border-amber-700">
                      {secretCharm} {language === 'ja' ? secretCharmDef.jaName : secretCharmDef.name}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {SECRET_CHARMS.map((charm) => {
                    const isSelected = secretCharm === charm.emoji;
                    const isSameAsAvatar = avatar === charm.emoji;
                    return (
                      <button
                        key={charm.emoji}
                        type="button"
                        disabled={isSameAsAvatar}
                        onClick={() => handlePickSecretCharm(charm.emoji)}
                        className={`h-20 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all border-2 cursor-pointer ${
                          isSameAsAvatar
                            ? 'opacity-25 bg-slate-100 dark:bg-slate-800 border-dashed border-slate-300 cursor-not-allowed'
                            : isSelected
                            ? 'bg-amber-100 dark:bg-amber-950 border-amber-500 shadow-md ring-3 ring-amber-300 scale-105'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-amber-400 active:scale-95'
                        }`}
                      >
                        <span className="text-3xl leading-none">{charm.emoji}</span>
                        <span className="text-[11px] font-black text-slate-700 dark:text-slate-200 truncate w-full text-center px-1">
                          {language === 'ja' ? charm.jaName : charm.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: REVIEW & CONFIRM */}
          {step === 4 && (
            <div className="w-full grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
              {/* Finished Card */}
              <div className="md:col-span-6 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/50 dark:to-teal-950/40 p-5 rounded-3xl border-3 border-emerald-400 dark:border-emerald-600 flex items-center gap-4 shadow-md">
                <div className="w-20 h-20 rounded-3xl bg-white dark:bg-slate-900 border-2 border-emerald-300 dark:border-emerald-700 flex items-center justify-center shadow-md shrink-0">
                  <AvatarDisplay avatar={avatar} frameId={frameId} sizeClassName="w-14 h-14 text-4xl" />
                </div>
                <div className="min-w-0 text-left">
                  <span className="inline-block px-2.5 py-0.5 rounded-lg bg-emerald-600 text-white text-xs font-black mb-1">
                    {classId} {isTeacherSeat ? '00' : `#${seatNumber}番`}
                  </span>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white truncate">
                    {finalNickname}
                  </h3>
                  {flagMeta && (
                    <p className="text-xs font-bold text-indigo-700 dark:text-indigo-300 mt-0.5">
                      {language === 'ja' ? flagMeta.jaName : flagMeta.name}
                    </p>
                  )}
                </div>
              </div>

              {/* Secret Mark Tap-to-Peek + Save */}
              <div className="md:col-span-6 space-y-3">
                <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Lock size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
                    <span className="text-xs sm:text-sm font-black text-amber-950 dark:text-amber-100 truncate">
                      {t('Secret Mark:', 'ひみつのマーク:')}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPeekingSecret((p) => !p)}
                    className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 text-xs sm:text-sm font-black text-amber-900 dark:text-amber-200 flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs"
                  >
                    <Eye size={14} />
                    <span>
                      {isPeekingSecret
                        ? `${secretCharm} ${secretCharmDef ? (language === 'ja' ? secretCharmDef.jaName : secretCharmDef.name) : ''}`
                        : t('Tap to peek', 'タップして確認')}
                    </span>
                  </button>
                </div>

                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleFinalSubmit}
                  className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-105 text-white font-black text-lg shadow-xl active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles size={20} />
                  <span>
                    {submitting
                      ? t('Saving...', 'ほぞん中...')
                      : mode === 'edit'
                      ? t('Save Changes', '変更をほぞんする')
                      : t('Save & Start!', 'これで決定してスタート！')}
                  </span>
                </button>

                {mode === 'edit' && onResetSeat && !showConfirmReset && (
                  <button
                    type="button"
                    onClick={() => setShowConfirmReset(true)}
                    className="w-full py-1.5 text-xs font-bold text-slate-400 hover:text-rose-500 transition-colors cursor-pointer text-center"
                  >
                    {t('Need to switch attendance number? (Reset seat)', '出席番号を変更したい場合はこちら')}
                  </button>
                )}

                {mode === 'edit' && onResetSeat && showConfirmReset && (
                  <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border-2 border-rose-300 dark:border-rose-800 space-y-2 text-center">
                    <div className="flex items-center justify-center gap-1.5 text-xs font-black text-rose-700 dark:text-rose-300">
                      <AlertTriangle size={14} />
                      <span>{t('Release this seat on this iPad?', 'このiPadの席をリセットしますか？')}</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowConfirmReset(false)}
                        className="flex-1 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold cursor-pointer"
                      >
                        {t('Cancel', 'やめる')}
                      </button>
                      <button
                        type="button"
                        onClick={onResetSeat}
                        className="flex-1 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-black cursor-pointer"
                      >
                        {t('Yes, Reset', 'リセットする')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Navigation Footer */}
        <div className="shrink-0 pt-3 border-t-2 border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          {step > 1 ? (
            <button
              type="button"
              disabled={submitting}
              onClick={() => {
                soundEffects.playTick();
                setStep((s) => (s - 1) as 1 | 2 | 3 | 4);
              }}
              className="px-4 sm:px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-black text-sm flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft size={16} />
              <span>{t('Back', 'もどる')}</span>
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              type="button"
              disabled={step === 3 && !canProceedFromStep3}
              onClick={() => {
                if (step === 3 && !canProceedFromStep3) return;
                soundEffects.playTick();
                setStep((s) => (s + 1) as 1 | 2 | 3 | 4);
              }}
              className={`px-6 py-2.5 rounded-2xl font-black text-sm sm:text-base flex items-center gap-1.5 transition-all ${
                step === 3 && !canProceedFromStep3
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md active:scale-95 cursor-pointer'
              }`}
            >
              <span>{t('Next', 'つぎへ')}</span>
              <ArrowRight size={16} />
            </button>
          ) : (
            <div className="text-xs font-bold text-slate-400">
              {t('Step 4 of 4', '4 / 4 ステップ')}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
