import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { StudentProfile } from '@/types/roster';
import { 
  SHOP_ITEMS, 
  ShopItem, 
  ShopItemCategory, 
  getAuraStyle,
  STARTER_KART_THEMES,
  LEVEL_TITLES 
} from '@/services/shopCatalog';
import { KART_THEMES, KartThemeId } from '@/games/suzuka_grand_prix/kartPresets';
import { 
  purchaseShopItem, 
  equipProfileItem, 
  spinLuckyGacha 
} from '@/services/studentProfile';
import { soundEffects } from '@/services/soundEffects';
import { useLanguage } from '@/context/LanguageContext';
import { useAudio } from '@/context/AudioContext';
import { AvatarDisplay } from '@/components/common/AvatarDisplay';
import { 
  ShoppingBag, 
  Sparkles, 
  Check, 
  Lock, 
  Coins, 
  X, 
  Award, 
  Zap, 
  Trophy,
  Flame,
  Palette
} from 'lucide-react';

interface EigoShopModalProps {
  isOpen: boolean;
  profile: StudentProfile;
  onClose: () => void;
  onProfileUpdated: (updated: StudentProfile) => void;
}

export const EigoShopModal: React.FC<EigoShopModalProps> = ({
  isOpen,
  profile,
  onClose,
  onProfileUpdated
}) => {
  const { t, language } = useLanguage();
  const { playPop } = useAudio();
  const [activeTab, setActiveTab] = useState<ShopItemCategory | 'gacha'>('aura');
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [gachaSpinning, setGachaSpinning] = useState<boolean>(false);
  const [gachaResult, setGachaResult] = useState<{ wonItem?: ShopItem; bonusXp?: number } | null>(null);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentGold = profile.gold || 0;
  const currentLevel = profile.level || 1;
  const inventory = profile.inventory || {};
  const equipped = profile.equipped || {};

  const ownedFrames = new Set(inventory.frames || []);
  const ownedAvatars = new Set(inventory.unlockedAvatars || []);
  const ownedKarts = new Set([...STARTER_KART_THEMES, ...(inventory.kartThemes || [])]);
  const ownedTitles = new Set(inventory.titles || []);

  const itemsInTab = SHOP_ITEMS.filter((i) => i.category === activeTab);

  const handlePurchase = async (item: ShopItem) => {
    if (currentGold < item.price || currentLevel < item.requiredLevel) {
      soundEffects.playIncorrect();
      return;
    }

    setPurchasingId(item.id);
    soundEffects.playTick();

    const res = await purchaseShopItem(
      profile.schoolId,
      profile.classId,
      profile.attendanceNumber,
      item.id
    );

    setPurchasingId(null);
    if (res.success && res.profile) {
      soundEffects.playFanfare();
      confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });
      onProfileUpdated(res.profile);
      setFeedbackNotice(
        language === 'ja'
          ? `🎉「${item.jaName}」を手に入れました！`
          : `🎉 Unlocked "${item.name}"!`
      );
      setTimeout(() => setFeedbackNotice(null), 3500);
    } else {
      soundEffects.playIncorrect();
    }
  };

  const handleEquip = async (slot: 'frame' | 'title' | 'kartTheme', itemId: string | null) => {
    soundEffects.playTick();
    const res = await equipProfileItem(
      profile.schoolId,
      profile.classId,
      profile.attendanceNumber,
      slot,
      itemId
    );

    if (res.success && res.profile) {
      onProfileUpdated(res.profile);
      setFeedbackNotice(
        language === 'ja'
          ? itemId ? 'そうびを変更しました！' : 'そうびを外しました'
          : itemId ? 'Equipped!' : 'Unequipped'
      );
      setTimeout(() => setFeedbackNotice(null), 2500);
    }
  };

  const handleGachaSpin = async () => {
    if (currentGold < 100 || gachaSpinning) {
      soundEffects.playIncorrect();
      return;
    }

    setGachaSpinning(true);
    setGachaResult(null);
    soundEffects.playWheelClick(650);

    // 1.2s suspense animation
    setTimeout(async () => {
      const res = await spinLuckyGacha(
        profile.schoolId,
        profile.classId,
        profile.attendanceNumber
      );
      setGachaSpinning(false);

      if (res.success && res.profile) {
        soundEffects.playFanfare();
        confetti({ particleCount: 90, spread: 90, origin: { y: 0.55 } });
        setGachaResult({ wonItem: res.wonItem, bonusXp: res.bonusXp });
        onProfileUpdated(res.profile);
      } else {
        soundEffects.playIncorrect();
      }
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-4xl max-h-[94vh] flex flex-col rounded-3xl bg-white dark:bg-slate-900 border-4 border-amber-400 dark:border-amber-500 shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100"
        style={{ fontFamily: "'UD Digi Kyokasho NP-R', 'UD Digi Kyokasho NK-R', 'BIZ UDPGothic', 'Zen Maru Gothic', sans-serif" }}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-6 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white flex items-center justify-between shrink-0 shadow-lg">
          <div className="flex items-center gap-3.5 min-w-0">
            {/* Live Equipped Avatar Preview */}
            <div className="p-2 rounded-2xl bg-white/20 backdrop-blur-md shrink-0 shadow-inner">
              <AvatarDisplay 
                avatar={profile.avatar || '🐼'} 
                frameId={equipped.frame}
                sizeClassName="w-10 h-10 sm:w-12 sm:h-12 text-3xl sm:text-4xl"
              />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-950/40 text-amber-200 border border-amber-300/40">
                  {profile.classId} #{profile.attendanceNumber}
                </span>
                <span className="px-3 py-0.5 rounded-full text-xs font-black bg-yellow-300 text-slate-950 shadow-xs flex items-center gap-1">
                  <Coins size={13} className="text-amber-800" />
                  <span>{currentGold.toLocaleString()} Gold</span>
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-white/20 text-white border border-white/30">
                  ⭐️ Lv. {currentLevel}
                </span>
              </div>

              <div className="flex items-center gap-2 mt-1">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight truncate">
                  {profile.nickname}
                </h2>
                {equipped.title && (
                  <span className="px-2.5 py-0.5 rounded-lg bg-white/25 text-white font-black text-xs shrink-0 border border-white/20">
                    {equipped.title}
                  </span>
                )}
              </div>
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

        {/* Feedback Notice Toast */}
        {feedbackNotice && (
          <div className="bg-emerald-600 text-white px-4 py-2 text-center text-xs sm:text-sm font-black animate-in fade-in slide-in-from-top-1">
            {feedbackNotice}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 px-3 sm:px-4 pt-2 shrink-0 overflow-x-auto">
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Tab 1: Auras */}
            <button
              type="button"
              onClick={() => {
                playPop();
                setActiveTab('aura');
              }}
              className={`px-3 sm:px-4 py-2.5 sm:py-3 font-black text-xs sm:text-sm rounded-t-2xl flex items-center gap-1.5 border-b-3 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'aura'
                  ? 'border-amber-500 text-amber-600 dark:text-amber-400 bg-white dark:bg-slate-900 shadow-xs'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Sparkles size={16} />
              <span>{t('Avatar Auras', 'オーラ・フレーム')}</span>
            </button>

            {/* Tab 2: Rare Avatars */}
            <button
              type="button"
              onClick={() => {
                playPop();
                setActiveTab('avatar');
              }}
              className={`px-3 sm:px-4 py-2.5 sm:py-3 font-black text-xs sm:text-sm rounded-t-2xl flex items-center gap-1.5 border-b-3 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'avatar'
                  ? 'border-amber-500 text-amber-600 dark:text-amber-400 bg-white dark:bg-slate-900 shadow-xs'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <span>🎭</span>
              <span>{t('Rare Avatars', 'ひみつアバター')}</span>
            </button>

            {/* Tab 3: Kart Liveries */}
            <button
              type="button"
              onClick={() => {
                playPop();
                setActiveTab('kart');
              }}
              className={`px-3 sm:px-4 py-2.5 sm:py-3 font-black text-xs sm:text-sm rounded-t-2xl flex items-center gap-1.5 border-b-3 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'kart'
                  ? 'border-amber-500 text-amber-600 dark:text-amber-400 bg-white dark:bg-slate-900 shadow-xs'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <span>🏎️</span>
              <span>{t('Grand Prix Karts', '鈴鹿カート')}</span>
            </button>

            {/* Tab 4: Titles */}
            <button
              type="button"
              onClick={() => {
                playPop();
                setActiveTab('title');
              }}
              className={`px-3 sm:px-4 py-2.5 sm:py-3 font-black text-xs sm:text-sm rounded-t-2xl flex items-center gap-1.5 border-b-3 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'title'
                  ? 'border-amber-500 text-amber-600 dark:text-amber-400 bg-white dark:bg-slate-900 shadow-xs'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <span>🏷️</span>
              <span>{t('Titles', '称号')}</span>
            </button>

            {/* Tab 5: Lucky Gacha */}
            <button
              type="button"
              onClick={() => {
                playPop();
                setActiveTab('gacha');
              }}
              className={`px-3 sm:px-4 py-2.5 sm:py-3 font-black text-xs sm:text-sm rounded-t-2xl flex items-center gap-1.5 border-b-3 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'gacha'
                  ? 'border-purple-500 text-purple-600 dark:text-purple-400 bg-white dark:bg-slate-900 shadow-xs'
                  : 'border-transparent text-purple-500 hover:text-purple-700 dark:hover:text-purple-300'
              }`}
            >
              <span>🎰</span>
              <span>{t('Lucky Gacha', 'ラッキーガチャ')}</span>
              <span className="px-1.5 py-0.2 rounded-md bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 text-[10px]">
                100🪙
              </span>
            </button>
          </div>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* TAB: GACHA MACHINE */}
          {activeTab === 'gacha' && (
            <div className="max-w-xl mx-auto p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-purple-500/10 via-indigo-500/10 to-purple-500/20 dark:from-purple-950/40 dark:to-indigo-950/40 border-3 border-purple-400 dark:border-purple-600 text-center space-y-5">
              <div className="flex justify-center">
                <div className={`text-6xl sm:text-7xl p-4 rounded-3xl bg-white dark:bg-slate-800 shadow-xl border-3 border-purple-300 transition-all ${
                  gachaSpinning ? 'animate-spin scale-110' : ''
                }`}>
                  🎰
                </div>
              </div>

              <div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  {t('Levi Sensei Lucky Capsule Gacha', 'リヴァイ先生のラッキーガチャ')}
                </h3>
                <p className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 mt-1">
                  {t(
                    'Spin for 100 Gold! Guarantees a brand new Aura, Rare Avatar, Kart, or Title!',
                    '1回 100 Gold！ まだ持っていないオーラ・アバター・カート・称号が必ず当たる！'
                  )}
                </p>
              </div>

              {/* Gacha Result Display */}
              {gachaResult && (
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border-2 border-purple-400 shadow-lg animate-in zoom-in-95 duration-200">
                  <span className="text-3xl block mb-1">🎉</span>
                  {gachaResult.wonItem ? (
                    <div>
                      <span className="text-xs font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest block">
                        {t('NEW UNLOCK!', '新アイテム獲得！')}
                      </span>
                      <strong className="text-lg font-black text-slate-900 dark:text-white block mt-0.5">
                        {gachaResult.wonItem.icon} {language === 'ja' ? gachaResult.wonItem.jaName : gachaResult.wonItem.name}
                      </strong>
                      <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">
                        {language === 'ja' ? gachaResult.wonItem.jaDescription : gachaResult.wonItem.description}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <span className="text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest block">
                        {t('CATALOG MASTER!', '全アイテムコンプリート！')}
                      </span>
                      <strong className="text-lg font-black text-slate-900 dark:text-white block mt-0.5">
                        ⭐️ +{gachaResult.bonusXp} Master XP!
                      </strong>
                    </div>
                  )}
                </div>
              )}

              {/* Action Button */}
              <button
                type="button"
                disabled={currentGold < 100 || gachaSpinning}
                onClick={handleGachaSpin}
                className={`w-full py-4 rounded-2xl font-black text-base sm:text-lg shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  currentGold >= 100
                    ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-500/25'
                    : 'bg-slate-300 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                }`}
              >
                <span>{gachaSpinning ? '🎰 ガチャ回転中...' : t('Spin Gacha (100 Gold)', 'ガチャを回す (100 Gold 🪙)')}</span>
              </button>
            </div>
          )}

          {/* TAB: ITEMS GRID (Auras, Avatars, Karts, Titles) */}
          {activeTab !== 'gacha' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {itemsInTab.map((item) => {
                let isOwned = false;
                let isEquipped = false;

                if (item.category === 'aura') {
                  isOwned = ownedFrames.has(item.id);
                  isEquipped = equipped.frame === item.id;
                } else if (item.category === 'avatar') {
                  const av = item.extraPayload || item.icon;
                  isOwned = ownedAvatars.has(av);
                  isEquipped = profile.avatar === av;
                } else if (item.category === 'kart') {
                  const kt = item.extraPayload || item.id;
                  isOwned = ownedKarts.has(kt);
                  isEquipped = equipped.kartTheme === kt;
                } else if (item.category === 'title') {
                  const tt = item.extraPayload || item.jaName;
                  isOwned = ownedTitles.has(tt);
                  isEquipped = equipped.title === tt;
                }

                const canAfford = currentGold >= item.price;
                const meetsLevel = currentLevel >= item.requiredLevel;

                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-2xl border-2 transition-all flex flex-col justify-between ${
                      isEquipped
                        ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-400 shadow-md ring-2 ring-amber-300/40'
                        : isOwned
                        ? 'bg-white dark:bg-slate-800/90 border-slate-300 dark:border-slate-700 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div>
                      {/* Top Row: Icon / Preview + Title + Price/Status */}
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-3">
                          {/* Item Icon / Aura Preview */}
                          <div className="shrink-0 p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center min-w-[52px] min-h-[52px]">
                            {item.category === 'aura' ? (
                              <AvatarDisplay 
                                avatar={profile.avatar || '🐼'} 
                                frameId={item.id}
                                sizeClassName="w-8 h-8 text-2xl"
                              />
                            ) : item.category === 'kart' ? (
                              (() => {
                                const theme = KART_THEMES[item.extraPayload as KartThemeId];
                                return (
                                  <div className="flex flex-col items-center">
                                    <span className="text-2xl leading-none">{item.icon}</span>
                                    {theme && (
                                      <div className="flex items-center gap-0.5 mt-1">
                                        <span className="w-2 h-2 rounded-full border border-black/30" style={{ backgroundColor: `#${theme.colorHex.toString(16).padStart(6, '0')}` }} />
                                        <span className="w-2 h-2 rounded-full border border-black/30" style={{ backgroundColor: `#${theme.helmetHex.toString(16).padStart(6, '0')}` }} />
                                        <span className="w-2 h-2 rounded-full border border-black/30" style={{ backgroundColor: `#${theme.rimHex.toString(16).padStart(6, '0')}` }} />
                                      </div>
                                    )}
                                  </div>
                                );
                              })()
                            ) : (
                              <span className="text-3xl select-none">{item.icon}</span>
                            )}
                          </div>

                          {/* Title & Level requirement */}
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white leading-tight">
                                {language === 'ja' ? item.jaName : item.name}
                              </h3>
                            </div>
                            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
                              {item.name}
                            </span>
                            {item.requiredLevel > 1 && (
                              <span className={`inline-block px-2 py-0.2 rounded-md text-[10px] font-black mt-1 ${
                                meetsLevel
                                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                  : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                              }`}>
                                {meetsLevel ? `✓ Lv.${item.requiredLevel}` : `🔒 Lv.${item.requiredLevel} 必要`}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Price Tag or Owned Badge */}
                        <div className="shrink-0 text-right">
                          {isEquipped ? (
                            <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-amber-400 text-amber-950 shadow-xs flex items-center gap-1">
                              <Check size={13} />
                              <span>{t('Equipped', 'そうび中')}</span>
                            </span>
                          ) : isOwned ? (
                            <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                              {t('Owned', '所持済み')}
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-yellow-300/80 text-slate-950 shadow-xs flex items-center gap-1">
                              <Coins size={13} className="text-amber-800" />
                              <span>{item.price} Gold</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                        {language === 'ja' ? item.jaDescription : item.description}
                      </p>
                    </div>

                    {/* Action Button Footer */}
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                      {isOwned ? (
                        isEquipped ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (item.category === 'aura') handleEquip('frame', null);
                              else if (item.category === 'kart') handleEquip('kartTheme', null);
                              else if (item.category === 'title') handleEquip('title', null);
                            }}
                            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-300 font-black text-xs transition-all cursor-pointer"
                          >
                            {t('Unequip', '外す')}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              if (item.category === 'aura') handleEquip('frame', item.id);
                              else if (item.category === 'avatar') {
                                // For avatar, update profile directly
                                const av = item.extraPayload || item.icon;
                                equipProfileItem(profile.schoolId, profile.classId, profile.attendanceNumber, 'frame', equipped.frame || null);
                                onProfileUpdated({ ...profile, avatar: av });
                                setFeedbackNotice(language === 'ja' ? 'アバターを変更しました！' : 'Avatar changed!');
                                setTimeout(() => setFeedbackNotice(null), 2500);
                              } else if (item.category === 'kart') {
                                handleEquip('kartTheme', item.extraPayload || item.id);
                              } else if (item.category === 'title') {
                                handleEquip('title', item.extraPayload || item.jaName);
                              }
                            }}
                            className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer"
                          >
                            {t('Equip', 'そうびする')}
                          </button>
                        )
                      ) : (
                        <button
                          type="button"
                          disabled={!canAfford || !meetsLevel || purchasingId === item.id}
                          onClick={() => handlePurchase(item)}
                          className={`px-5 py-2 rounded-xl font-black text-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                            canAfford && meetsLevel
                              ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-105 text-white shadow-md'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          <Coins size={13} />
                          <span>
                            {purchasingId === item.id 
                              ? t('Purchasing...', '購入中...')
                              : !meetsLevel
                              ? t(`Requires Lv.${item.requiredLevel}`, `Lv.${item.requiredLevel}で解放`)
                              : !canAfford
                              ? t('Not Enough Gold', 'Gold不足')
                              : t(`Buy for ${item.price} Gold`, `${item.price} Goldで購入`)}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-950/70 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-bold hidden sm:inline">
            {t(
              'Earn Gold by taking quizzes, maintaining streaks, and leveling up badges!',
              'クイズで正解したりバッジをレベルアップするとゴールドが貯まるよ！'
            )}
          </span>

          <button
            type="button"
            onClick={() => {
              playPop();
              onClose();
            }}
            className="px-6 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-black text-xs sm:text-sm shadow-md transition-all active:scale-95 cursor-pointer ml-auto"
          >
            {t('Close', 'とじる')}
          </button>
        </div>
      </div>
    </div>
  );
};
