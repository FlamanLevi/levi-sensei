import React from 'react';
import { GameDefinition, SKILL_TRANSLATIONS, PLAYER_COUNT_TRANSLATIONS } from '../../games/registry';
import {
  Play,
  Sparkles,
  Zap,
  HelpCircle,
  Wind,
  Smartphone,
  Grid,
  Lock,
  Trophy,
  EyeOff,
  Layers,
  RotateCw,
  Award,
  Clock,
  Shuffle,
  Volume2,
  Search,
  Smile,
  Users,
  MapPin,
  Music,
  Timer,
  UserCheck,
  Crosshair,
  Bomb,
  Flame,
  Gift,
  Link2,
  Radio,
  Compass,
  Palette,
  Flag,
  Utensils,
  Heart,
  Backpack,
  Map,
  Calendar,
  CheckCircle2,
  Globe,
  BookOpen,
  Dices,
  Eye,
  Star,
  Building
} from 'lucide-react';
import { useClassroom } from '../../context/ClassroomContext';
import { useVocabulary } from '../../context/VocabularyContext';
import { useAudio } from '../../context/AudioContext';
import { useLanguage } from '../../context/LanguageContext';

interface GameLauncherCardProps {
  game: GameDefinition;
}

export const GameLauncherCard: React.FC<GameLauncherCardProps> = ({ game }) => {
  const { launchGame, pinnedGameIds, togglePinGame } = useClassroom();
  const { filteredWords, openWordFilterModal, excludedWordIds } = useVocabulary();
  const { playPop } = useAudio();
  const { t, language } = useLanguage();

  const isPinned = pinnedGameIds?.includes(game.id);

  const getIcon = () => {
    switch (game.icon) {
      case 'Trophy': return <Trophy size={28} className="text-white" />;
      case 'Sparkles': return <Sparkles size={28} className="text-white" />;
      case 'Zap': return <Zap size={28} className="text-white" />;
      case 'HelpCircle': return <HelpCircle size={28} className="text-white" />;
      case 'Wind': return <Wind size={28} className="text-white" />;
      case 'Smartphone': return <Smartphone size={28} className="text-white" />;
      case 'Grid': return <Grid size={28} className="text-white" />;
      case 'EyeOff': return <EyeOff size={28} className="text-white" />;
      case 'Layers': return <Layers size={28} className="text-white" />;
      case 'RotateCw': return <RotateCw size={28} className="text-white" />;
      case 'Award': return <Award size={28} className="text-white" />;
      case 'Clock': return <Clock size={28} className="text-white" />;
      case 'Shuffle': return <Shuffle size={28} className="text-white" />;
      case 'Volume2': return <Volume2 size={28} className="text-white" />;
      case 'Search': return <Search size={28} className="text-white" />;
      case 'Smile': return <Smile size={28} className="text-white" />;
      case 'Users': return <Users size={28} className="text-white" />;
      case 'MapPin': return <MapPin size={28} className="text-white" />;
      case 'Music': return <Music size={28} className="text-white" />;
      case 'Timer': return <Timer size={28} className="text-white" />;
      case 'UserCheck': return <UserCheck size={28} className="text-white" />;
      case 'Crosshair': return <Crosshair size={28} className="text-white" />;
      case 'Bomb': return <Bomb size={28} className="text-white" />;
      case 'Flame': return <Flame size={28} className="text-white" />;
      case 'Gift': return <Gift size={28} className="text-white" />;
      case 'Link2': return <Link2 size={28} className="text-white" />;
      case 'Radio': return <Radio size={28} className="text-white" />;
      case 'Compass': return <Compass size={28} className="text-white" />;
      case 'Palette': return <Palette size={28} className="text-white" />;
      case 'Flag': return <Flag size={28} className="text-white" />;
      case 'Utensils': return <Utensils size={28} className="text-white" />;
      case 'Heart': return <Heart size={28} className="text-white" />;
      case 'Backpack': return <Backpack size={28} className="text-white" />;
      case 'Map': return <Map size={28} className="text-white" />;
      case 'Calendar': return <Calendar size={28} className="text-white" />;
      case 'CheckCircle2': return <CheckCircle2 size={28} className="text-white" />;
      case 'Globe': return <Globe size={28} className="text-white" />;
      case 'BookOpen': return <BookOpen size={28} className="text-white" />;
      case 'Dices': return <Dices size={28} className="text-white" />;
      case 'Eye': return <Eye size={28} className="text-white" />;
      case 'Building': return <Building size={28} className="text-white" />;
      default: return <Sparkles size={28} className="text-white" />;
    }
  };

  const handleLaunch = () => {
    if (game.status === 'ready') {
      playPop();
      launchGame(game.id);
    }
  };

  const playerBadge = language === 'ja'
    ? (PLAYER_COUNT_TRANSLATIONS[game.minPlayers] || game.minPlayers)
    : game.minPlayers;

  const cardDescription = language === 'ja'
    ? (game.jaDescription || game.description)
    : game.description;

  const streamBadge = () => {
    switch (game.stream) {
      case 'STREAM_A':
        return (
          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 whitespace-nowrap">
            Stream 🅰️ {t("TV / Projector", <>テレビ<ruby>画面<rt>がめん</rt></ruby></>)}
          </span>
        );
      case 'STREAM_B':
        return (
          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 whitespace-nowrap">
            Stream 🅱️ {t("Student iPads", <>iPad<ruby>同期<rt>どうき</rt></ruby></>)}
          </span>
        );
      case 'STREAM_C':
        return (
          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 whitespace-nowrap">
            Stream 🅲 {t("Solo Study", <><ruby>個人<rt>こじん</rt></ruby><ruby>学習<rt>がくしゅう</rt></ruby></>)}
          </span>
        );
    }
  };

  const renderFuriganaJaTitle = (id: string, jaTitle: string): React.ReactNode => {
    if (id === 'whats_missing') {
      return <><ruby>何<rt>なに</rt></ruby>が<ruby>消<rt>き</rt></ruby>えた？</>;
    }
    if (id === 'concentration') {
      return <><ruby>神経衰弱<rt>しんけいすいじゃく</rt></ruby>・えあわせ</>;
    }
    if (id === 'eigo_arena') {
      return <>ライブ4<ruby>択<rt>たく</rt></ruby>バトル</>;
    }
    return jaTitle;
  };

  const statusBadge = () => {
    if (game.status === 'ready') {
      return (
        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500 text-white shadow-xs whitespace-nowrap">
          {t("PLAYABLE NOW", <><ruby>今<rt>いま</rt></ruby>すぐプレイ<ruby>可能<rt>かのう</rt></ruby></>)}
        </span>
      );
    }
    if (game.status === 'in_development') {
      return (
        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 whitespace-nowrap">
          {t("IN PROGRESS", <><ruby>開発<rt>かいはつ</rt></ruby><ruby>進行中<rt>しんこうちゅう</rt></ruby></>)}
        </span>
      );
    }
    return (
      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 whitespace-nowrap">
        {t("ROADMAP", <><ruby>開発<rt>かいはつ</rt></ruby><ruby>計画<rt>けいかく</rt></ruby></>)}
      </span>
    );
  };

  return (
    <div className={`relative bg-white dark:bg-slate-800/90 rounded-3xl p-5 border-2 transition-all flex flex-col justify-between shadow-xs hover:shadow-xl ${
      game.status === 'ready'
        ? 'border-slate-200 dark:border-slate-700 hover:-translate-y-1 hover:border-blue-400 dark:hover:border-blue-500'
        : 'border-slate-200/60 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
    }`}>
      {/* Top row: Icon + Badges */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="relative">
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-tr ${game.color} flex items-center justify-center shadow-md`}>
              {getIcon()}
            </div>
            {game.status === 'ready' && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  playPop();
                  togglePinGame(game.id);
                }}
                className={`absolute -top-1.5 -left-1.5 w-6 h-6 rounded-full flex items-center justify-center transition-all shadow-xs cursor-pointer ${
                  isPinned
                    ? 'bg-amber-400 text-slate-950 shadow-md scale-110 ring-2 ring-white dark:ring-slate-800'
                    : 'bg-white/90 dark:bg-slate-900/90 hover:bg-amber-100 text-slate-400 hover:text-amber-500 border border-slate-200 dark:border-slate-700'
                }`}
                title={isPinned ? t('Unpin from Today', '今日の予定から解除') : t('Pin for Today', '今日の予定にピン留め')}
              >
                <Star size={12} fill={isPinned ? 'currentColor' : 'none'} />
              </button>
            )}
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-1.5">
              {streamBadge()}
              {statusBadge()}
            </div>
            <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-700/80 text-slate-700 dark:text-slate-300">
              {playerBadge}
            </span>
          </div>
        </div>

        {/* Title & Japanese subtitle */}
        <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
          {language === 'ja' ? renderFuriganaJaTitle(game.id, game.jaTitle || game.title) : game.title}
        </h3>
        <p className="text-xs font-black text-blue-600 dark:text-blue-400 mb-2">
          {language === 'ja' ? game.title : renderFuriganaJaTitle(game.id, game.jaTitle)}
        </p>

        {/* Description */}
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-3 line-clamp-3">
          {cardDescription}
        </p>

        {/* Skill tags */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {game.skills.map(s => {
            const skillLabel = language === 'ja' ? (SKILL_TRANSLATIONS[s] || s) : s;
            return (
              <span key={s} className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700/80 text-slate-600 dark:text-slate-300">
                {skillLabel}
              </span>
            );
          })}
        </div>
      </div>

      {/* Action button */}
      <div>
        {game.status === 'ready' ? (
          <div className="flex items-center gap-2">
            <button
              onClick={handleLaunch}
              className={`flex-1 py-3 rounded-2xl font-black text-sm text-white shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 bg-gradient-to-r ${game.color} hover:brightness-105 active:scale-98 cursor-pointer`}
            >
              <Play size={18} fill="currentColor" />
              <span>{t("PLAY NOW", "今すぐプレイ")}</span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                playPop();
                openWordFilterModal();
              }}
              title={t("Inspect or filter target words for this lesson", "この単元の単語バスケットを取捨選択")}
              className={`h-11 px-3 rounded-2xl flex flex-col items-center justify-center transition-all border shrink-0 cursor-pointer active:scale-95 ${
                excludedWordIds.length > 0
                  ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 hover:bg-amber-100'
                  : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200/60 dark:border-slate-700/60'
              }`}
            >
              <span className="text-xs">🧺</span>
              <span className="text-[10px] font-black leading-none mt-0.5">{filteredWords.length}</span>
            </button>
          </div>
        ) : (
          <div className="w-full py-3 rounded-2xl font-bold text-xs bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center gap-1.5 cursor-not-allowed border border-slate-200/50 dark:border-slate-700/50">
            <Lock size={14} />
            <span>
              {game.status === 'in_development'
                ? t("In Development (Coming Soon)", "開発中（近日公開）")
                : t("Coming Next (Roadmap)", "ロードマップ（開発予定）")
              }
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
