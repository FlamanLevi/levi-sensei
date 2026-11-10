import React from 'react';
import { GradeLevel } from '@data/types';

export type SpeedLevel = 'slow' | 'normal' | 'fast';
export type KeywordLengthMode = 'short' | 'medium' | 'long';
export type KeywordDisplayTier = 'PICTURE_ONLY' | 'PICTURE_WORD' | 'WORD_ONLY';
export type ScoreboardMode = 'OFF' | '2_TEAMS' | '4_TEAMS' | '6_TEAMS' | 'LIVE_DESKS';

export type KeywordGamePhase =
  | 'SELECTING'
  | 'READY'
  | 'CYCLING'
  | 'GRAB'
  | 'ROUND_SUMMARY';

export type PairSide = 'LEFT' | 'RIGHT';
export type PairOutcome = 'LEFT' | 'RIGHT' | 'FOUL_LEFT' | 'FOUL_RIGHT' | 'TIE' | null;

export type ReactionTier = 'GODLIKE' | 'LIGHTNING' | 'SUPER_FAST' | 'GREAT' | 'SAFE';

export type FoulPenaltyMode = 'AWARD_OPPONENT' | 'LOCKOUT_ONLY';

export interface AutopilotConfig {
  enabled: boolean;
  poseDelayMs: number; // Default 3000ms ("Hands on your heads!" preparation)
  autoNextRound: boolean; // Automatically advance to next keyword after GRAB celebration
  autoNextRoundDelayMs: number; // Default 5500ms
}

export interface ReactionTierInfo {
  tier: ReactionTier;
  maxMs: number;
  icon: string;
  labelEn: string;
  labelJa: string;
  labelJaRuby: React.ReactNode;
  badgeBg: string;
  badgeBorder: string;
  textColor: string;
}

export const REACTION_TIERS: Record<ReactionTier, ReactionTierInfo> = {
  GODLIKE: {
    tier: 'GODLIKE',
    maxMs: 160,
    icon: '⚡',
    labelEn: 'GODLIKE REFLEXES!',
    labelJa: '神速・かみわざ！',
    labelJaRuby: (
      <>
        <ruby>
          神速<rt className="text-[7px] font-normal">しんそく</rt>
        </ruby>
        ・かみわざ！
      </>
    ),
    badgeBg: 'bg-gradient-to-r from-fuchsia-600 via-amber-500 to-yellow-400',
    badgeBorder: 'border-white ring-2 ring-yellow-300',
    textColor: 'text-slate-950',
  },
  LIGHTNING: {
    tier: 'LIGHTNING',
    maxMs: 260,
    icon: '🏎️',
    labelEn: 'LIGHTNING SPEED!',
    labelJa: '電光石火！',
    labelJaRuby: (
      <>
        <ruby>
          電光石火<rt className="text-[7px] font-normal">でんこうせっか</rt>
        </ruby>
        ！
      </>
    ),
    badgeBg: 'bg-gradient-to-r from-amber-400 to-orange-500',
    badgeBorder: 'border-yellow-200',
    textColor: 'text-slate-950',
  },
  SUPER_FAST: {
    tier: 'SUPER_FAST',
    maxMs: 380,
    icon: '💨',
    labelEn: 'SUPER FAST!',
    labelJa: '超スピード！',
    labelJaRuby: (
      <>
        <ruby>
          超<rt className="text-[7px] font-normal">ちょう</rt>
        </ruby>
        スピード！
      </>
    ),
    badgeBg: 'bg-gradient-to-r from-sky-400 to-indigo-500',
    badgeBorder: 'border-sky-200',
    textColor: 'text-white',
  },
  GREAT: {
    tier: 'GREAT',
    maxMs: 520,
    icon: '👍',
    labelEn: 'GREAT CATCH!',
    labelJa: 'ナイスキャッチ！',
    labelJaRuby: <>ナイスキャッチ！</>,
    badgeBg: 'bg-emerald-500',
    badgeBorder: 'border-emerald-200',
    textColor: 'text-slate-950',
  },
  SAFE: {
    tier: 'SAFE',
    maxMs: Infinity,
    icon: '🐢',
    labelEn: 'SAFE CATCH!',
    labelJa: 'セーフ！',
    labelJaRuby: <>セーフ！</>,
    badgeBg: 'bg-slate-700',
    badgeBorder: 'border-slate-400',
    textColor: 'text-white',
  },
};

export function getReactionTier(reactionTimeMs: number): ReactionTierInfo {
  if (reactionTimeMs < 160) return REACTION_TIERS.GODLIKE;
  if (reactionTimeMs <= 260) return REACTION_TIERS.LIGHTNING;
  if (reactionTimeMs <= 380) return REACTION_TIERS.SUPER_FAST;
  if (reactionTimeMs <= 520) return REACTION_TIERS.GREAT;
  return REACTION_TIERS.SAFE;
}

export interface BodyPose {
  id: string;
  emoji: string;
  en: string;
  ja: string;
  jaRuby: React.ReactNode;
  actionEn: string;
  actionJa: React.ReactNode;
}

export interface KeywordRoomMeta {
  roomCode: string;
  schoolId: string;
  classId: string;
  grade: GradeLevel | string;
  unit: string;
  createdAt: number;
  hostActive: boolean;
}

export interface KeywordRoomState {
  phase: KeywordGamePhase;
  round: number;
  keywordId: string;
  keywordEnglish: string;
  keywordJa: string;
  currentPoseId: string;
  cycleIndex: number;
  currentCardId: string;
  currentCardEnglish: string;
  currentCardJa: string;
  displayTier: KeywordDisplayTier;
  speedMs: number;
  foulPenaltyMode?: FoulPenaltyMode;
  showReactionTiers?: boolean;
  keywordTriggerTimestamp: number | null;
  isKeywordActive: boolean;
  updatedAt: number;
}

export interface KeywordRoundResult {
  winner: PairOutcome;
  reactionTimeMs: number | null;
  reactionTier?: ReactionTier | null;
  deltaMs?: number | null;
  isTieBreaker?: boolean;
  foulWordEnglish?: string | null;
  round: number;
  timestamp: number;
}

export interface KeywordPairState {
  pairId: string; // e.g., "desk_01"
  deskNumber: number; // 1 to 18
  seatLeft: number; // e.g., 7
  nameLeft: string; // e.g., "Ken"
  avatarLeft?: string; // e.g., "🦁"
  scoreLeft: number;
  foulCountLeft: number;
  streakLeft: number;
  seatRight: number; // e.g., 23
  nameRight: string; // e.g., "Yui"
  avatarRight?: string; // e.g., "🐰"
  scoreRight: number;
  foulCountRight: number;
  streakRight: number;
  streakSide: PairSide | null;
  streakCount: number;
  bestReactionMs: number | null;
  lastResult: KeywordRoundResult | null;
  connected: boolean;
  updatedAt: number;
}

export interface TopReflexEntry {
  pairId: string;
  deskNumber: number;
  winnerSide: PairSide;
  playerName: string;
  playerAvatar?: string;
  partnerName?: string;
  partnerAvatar?: string;
  seatNumber: number;
  reactionTimeMs: number;
  reactionTier: ReactionTier;
  streakCount: number;
}

export interface KeywordSlapPayload {
  pairId: string;
  deskNumber: number;
  side: PairSide;
  reactionTimeMs: number;
  deltaMs?: number | null;
  round: number;
  timestamp: number;
}

export interface KeywordFoulPayload {
  pairId: string;
  deskNumber: number;
  side: PairSide;
  foulWordEnglish: string;
  round: number;
  timestamp: number;
}

export interface KeywordRoomData {
  meta: KeywordRoomMeta;
  state: KeywordRoomState;
  pairs?: Record<string, KeywordPairState>;
}

export const SPEED_MAP: Record<SpeedLevel, { labelEn: string; labelJa: string; ms: number }> = {
  slow: { labelEn: 'Slow', labelJa: 'ゆったり', ms: 2100 },
  normal: { labelEn: 'Normal', labelJa: 'ふつう', ms: 1450 },
  fast: { labelEn: 'Fast', labelJa: 'スピード', ms: 1050 },
};

export const BODY_POSES: BodyPose[] = [
  {
    id: 'head',
    emoji: '🙆',
    en: 'HEADS!',
    ja: 'あたま！',
    jaRuby: (
      <>
        <ruby>
          頭<rt className="text-[7px] font-normal">あたま</rt>
        </ruby>
        ！
      </>
    ),
    actionEn: 'Put your hands on your head!',
    actionJa: (
      <>
        <ruby>
          両手<rt className="text-[8px] font-normal">りょうて</rt>
        </ruby>
        を
        <ruby>
          頭<rt className="text-[8px] font-normal">あたま</rt>
        </ruby>
        にのせて！
      </>
    ),
  },
  {
    id: 'shoulders',
    emoji: '🤷',
    en: 'SHOULDERS!',
    ja: 'かた！',
    jaRuby: (
      <>
        <ruby>
          肩<rt className="text-[7px] font-normal">かた</rt>
        </ruby>
        ！
      </>
    ),
    actionEn: 'Put your hands on your shoulders!',
    actionJa: (
      <>
        <ruby>
          両手<rt className="text-[8px] font-normal">りょうて</rt>
        </ruby>
        を
        <ruby>
          肩<rt className="text-[8px] font-normal">かた</rt>
        </ruby>
        にのせて！
      </>
    ),
  },
  {
    id: 'knees',
    emoji: '🦵',
    en: 'KNEES!',
    ja: 'ひざ！',
    jaRuby: (
      <>
        <ruby>
          膝<rt className="text-[7px] font-normal">ひざ</rt>
        </ruby>
        ！
      </>
    ),
    actionEn: 'Put your hands on your knees!',
    actionJa: (
      <>
        <ruby>
          両手<rt className="text-[8px] font-normal">りょうて</rt>
        </ruby>
        を
        <ruby>
          膝<rt className="text-[8px] font-normal">ひざ</rt>
        </ruby>
        にのせて！
      </>
    ),
  },
  {
    id: 'tummy',
    emoji: '🫄',
    en: 'TUMMY!',
    ja: 'おなか！',
    jaRuby: (
      <>
        お
        <ruby>
          腹<rt className="text-[7px] font-normal">なか</rt>
        </ruby>
        ！
      </>
    ),
    actionEn: 'Put your hands on your tummy!',
    actionJa: (
      <>
        <ruby>
          両手<rt className="text-[8px] font-normal">りょうて</rt>
        </ruby>
        をお
        <ruby>
          腹<rt className="text-[8px] font-normal">なか</rt>
        </ruby>
        にのせて！
      </>
    ),
  },
  {
    id: 'ears',
    emoji: '👂',
    en: 'EARS!',
    ja: 'みみ！',
    jaRuby: (
      <>
        <ruby>
          耳<rt className="text-[7px] font-normal">みみ</rt>
        </ruby>
        ！
      </>
    ),
    actionEn: 'Put your hands on your ears!',
    actionJa: (
      <>
        <ruby>
          両手<rt className="text-[8px] font-normal">りょうて</rt>
        </ruby>
        を
        <ruby>
          耳<rt className="text-[8px] font-normal">みみ</rt>
        </ruby>
        にのせて！
      </>
    ),
  },
  {
    id: 'back',
    emoji: '🧘',
    en: 'BACK!',
    ja: 'せなか！',
    jaRuby: (
      <>
        <ruby>
          背中<rt className="text-[7px] font-normal">せなか</rt>
        </ruby>
        ！
      </>
    ),
    actionEn: 'Put your hands behind your back!',
    actionJa: (
      <>
        <ruby>
          両手<rt className="text-[8px] font-normal">りょうて</rt>
        </ruby>
        を
        <ruby>
          背中<rt className="text-[8px] font-normal">せなか</rt>
        </ruby>
        にまわして！
      </>
    ),
  },
];

export interface TeamDefinition {
  id: string;
  nameEn: string;
  nameJa: string;
  colorBg: string;
  colorBorder: string;
  colorText: string;
  btnBg: string;
  btnHover: string;
}

export const TEAMS_2: TeamDefinition[] = [
  {
    id: 'red',
    nameEn: 'RED 🔴',
    nameJa: '赤組 🔴',
    colorBg: 'bg-rose-50 dark:bg-rose-950/40',
    colorBorder: 'border-rose-400 dark:border-rose-700',
    colorText: 'text-rose-600 dark:text-rose-400',
    btnBg: 'bg-rose-500',
    btnHover: 'hover:bg-rose-600',
  },
  {
    id: 'white',
    nameEn: 'WHITE ⚪',
    nameJa: '白組 ⚪',
    colorBg: 'bg-slate-100 dark:bg-slate-800/80',
    colorBorder: 'border-slate-300 dark:border-slate-600',
    colorText: 'text-slate-800 dark:text-slate-200',
    btnBg: 'bg-slate-700 dark:bg-slate-600',
    btnHover: 'hover:bg-slate-800',
  },
];

export const TEAMS_4: TeamDefinition[] = [
  {
    id: 'red',
    nameEn: 'RED 🔴',
    nameJa: '赤 🔴',
    colorBg: 'bg-rose-50 dark:bg-rose-950/40',
    colorBorder: 'border-rose-300 dark:border-rose-800',
    colorText: 'text-rose-600 dark:text-rose-400',
    btnBg: 'bg-rose-500',
    btnHover: 'hover:bg-rose-600',
  },
  {
    id: 'blue',
    nameEn: 'BLUE 🔵',
    nameJa: '青 🔵',
    colorBg: 'bg-blue-50 dark:bg-blue-950/40',
    colorBorder: 'border-blue-300 dark:border-blue-800',
    colorText: 'text-blue-600 dark:text-blue-400',
    btnBg: 'bg-blue-500',
    btnHover: 'hover:bg-blue-600',
  },
  {
    id: 'yellow',
    nameEn: 'YELLOW 🟡',
    nameJa: '黄 🟡',
    colorBg: 'bg-amber-50 dark:bg-amber-950/40',
    colorBorder: 'border-amber-300 dark:border-amber-800',
    colorText: 'text-amber-600 dark:text-amber-400',
    btnBg: 'bg-amber-500',
    btnHover: 'hover:bg-amber-600',
  },
  {
    id: 'green',
    nameEn: 'GREEN 🟢',
    nameJa: '緑 🟢',
    colorBg: 'bg-emerald-50 dark:bg-emerald-950/40',
    colorBorder: 'border-emerald-300 dark:border-emerald-800',
    colorText: 'text-emerald-600 dark:text-emerald-400',
    btnBg: 'bg-emerald-500',
    btnHover: 'hover:bg-emerald-600',
  },
];

export const TEAMS_6: TeamDefinition[] = [
  {
    id: 'g1',
    nameEn: 'Team 1 🔴',
    nameJa: '1班 🔴',
    colorBg: 'bg-rose-50 dark:bg-rose-950/40',
    colorBorder: 'border-rose-300 dark:border-rose-800',
    colorText: 'text-rose-600 dark:text-rose-400',
    btnBg: 'bg-rose-500',
    btnHover: 'hover:bg-rose-600',
  },
  {
    id: 'g2',
    nameEn: 'Team 2 🔵',
    nameJa: '2班 🔵',
    colorBg: 'bg-blue-50 dark:bg-blue-950/40',
    colorBorder: 'border-blue-300 dark:border-blue-800',
    colorText: 'text-blue-600 dark:text-blue-400',
    btnBg: 'bg-blue-500',
    btnHover: 'hover:bg-blue-600',
  },
  {
    id: 'g3',
    nameEn: 'Team 3 🟡',
    nameJa: '3班 🟡',
    colorBg: 'bg-amber-50 dark:bg-amber-950/40',
    colorBorder: 'border-amber-300 dark:border-amber-800',
    colorText: 'text-amber-600 dark:text-amber-400',
    btnBg: 'bg-amber-500',
    btnHover: 'hover:bg-amber-600',
  },
  {
    id: 'g4',
    nameEn: 'Team 4 🟢',
    nameJa: '4班 🟢',
    colorBg: 'bg-emerald-50 dark:bg-emerald-950/40',
    colorBorder: 'border-emerald-300 dark:border-emerald-800',
    colorText: 'text-emerald-600 dark:text-emerald-400',
    btnBg: 'bg-emerald-500',
    btnHover: 'hover:bg-emerald-600',
  },
  {
    id: 'g5',
    nameEn: 'Team 5 🟣',
    nameJa: '5班 🟣',
    colorBg: 'bg-purple-50 dark:bg-purple-950/40',
    colorBorder: 'border-purple-300 dark:border-purple-800',
    colorText: 'text-purple-600 dark:text-purple-400',
    btnBg: 'bg-purple-500',
    btnHover: 'hover:bg-purple-600',
  },
  {
    id: 'g6',
    nameEn: 'Team 6 🟠',
    nameJa: '6班 🟠',
    colorBg: 'bg-orange-50 dark:bg-orange-950/40',
    colorBorder: 'border-orange-300 dark:border-orange-800',
    colorText: 'text-orange-600 dark:text-orange-400',
    btnBg: 'bg-orange-500',
    btnHover: 'hover:bg-orange-600',
  },
];