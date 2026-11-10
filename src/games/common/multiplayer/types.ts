import { SchoolId } from '@/types/roster';

export type RoomStatus =
  | 'LOBBY'
  | 'IN_GAME'
  | 'ROUND_REVEAL'
  | 'LEADERBOARD'
  | 'GAME_OVER'
  | 'CLOSED';

export type TeamId = 'team_red' | 'team_blue' | 'team_yellow' | 'team_green';

export interface RoomMetadata {
  pin: string;
  hostId: string;
  activeGameId: string;
  title?: string;
  schoolId?: SchoolId;
  classId?: string;
  grade: string;
  unit: string;
  status: RoomStatus;
  round?: number;
  totalRounds?: number;
  createdAt: number;
  updatedAt?: number;
  settings?: Record<string, any>;
}

export interface ClassroomPlayer {
  id: string;
  nickname: string;
  avatar: string;
  teamId?: TeamId;
  attendanceNumber?: number;
  score: number;
  streak: number;
  connectedAt: number;
  lastSeen: number;
  isHost?: boolean;
  customData?: Record<string, any>;
}

export interface TeamState {
  id: TeamId;
  name: string;
  jaName: string;
  color: string;
  emoji: string;
  bg: string;
  border: string;
  text: string;
  score: number;
  memberCount: number;
  averageScore: number;
  mvpPlayerId?: string;
  mvpNickname?: string;
  mvpScore?: number;
}

export interface UniversalRoomState<TGameState = any, TPlayerAction = any> {
  metadata: RoomMetadata;
  status?: RoomStatus;
  players: Record<string, ClassroomPlayer>;
  teams: Record<TeamId, TeamState>;
  gameData: TGameState;
  playerActions: Record<string, TPlayerAction>;
  boundStudents?: Record<string | number, {
    playerId: string;
    nickname: string;
    score: number;
    claimedAt?: number;
  }>;
  lastEvent?: {
    type: string;
    timestamp: number;
    payload?: any;
  };
}

export const CLASSROOM_TEAMS: Record<TeamId, TeamState> = {
  team_red: {
    id: 'team_red',
    name: 'Red Team',
    jaName: '赤組',
    color: 'red',
    emoji: '🔴',
    bg: 'bg-rose-500',
    border: 'border-rose-600',
    text: 'text-rose-500',
    score: 0,
    memberCount: 0,
    averageScore: 0
  },
  team_blue: {
    id: 'team_blue',
    name: 'Blue Team',
    jaName: '青組',
    color: 'blue',
    emoji: '🔵',
    bg: 'bg-blue-500',
    border: 'border-blue-600',
    text: 'text-blue-500',
    score: 0,
    memberCount: 0,
    averageScore: 0
  },
  team_yellow: {
    id: 'team_yellow',
    name: 'Yellow Team',
    jaName: '黄組',
    color: 'yellow',
    emoji: '🟡',
    bg: 'bg-amber-400',
    border: 'border-amber-500',
    text: 'text-amber-500',
    score: 0,
    memberCount: 0,
    averageScore: 0
  },
  team_green: {
    id: 'team_green',
    name: 'Green Team',
    jaName: '緑組',
    color: 'green',
    emoji: '🟢',
    bg: 'bg-emerald-500',
    border: 'border-emerald-600',
    text: 'text-emerald-500',
    score: 0,
    memberCount: 0,
    averageScore: 0
  }
};

export const CLASSROOM_NICKNAMES = [
  'Cool Panda 🐼',
  'Fast Tiger 🐯',
  'Super Koala 🐨',
  'Happy Dolphin 🐬',
  'Star Lion 🦁',
  'Brave Eagle 🦅',
  'Smart Owl 🦉',
  'Rainbow Rabbit 🐰',
  'Speedy Cheetah 🐆',
  'Golden Fox 🦊',
  'Cosmic Penguin 🐧',
  'Lucky Bear 🐻',
  'Mighty Dragon 🐲',
  'Wonder Puppy 🐶',
  'Magic Kitten 🐱'
];

export const CLASSROOM_AVATARS = [
  '🐼', '🐯', '🐨', '🐬', '🦁', '🦅', '🦉', '🐰',
  '🐆', '🦊', '🐧', '🐻', '🐶', '🐱', '🐸', '🦄',
  '🚀', '⭐', '⚡', '🔥', '🍎', '⚽', '🎨', '🎸'
];
