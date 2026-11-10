import React, { useMemo } from 'react';
import confetti from 'canvas-confetti';
import { useClassroom } from '@/context/ClassroomContext';
import { useLanguage } from '@/context/LanguageContext';
import { soundEffects } from '@/services/soundEffects';
import { useConcentrationTournament } from './useConcentrationTournament';
import {
  Trophy,
  Users,
  Wifi,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  Tv,
} from 'lucide-react';

interface ConcentrationTournamentHostProps {
  initialRoomCode?: string;
  onExit?: () => void;
}

export const ConcentrationTournamentHost: React.FC<ConcentrationTournamentHostProps> = ({
  initialRoomCode = '',
  onExit,
}) => {
  const { activeGrade, activeUnit } = useClassroom();
  const { t } = useLanguage();

  const {
    roomCode,
    desksMap,
    stats,
    isConnected,
    createTournamentRoom,
  } = useConcentrationTournament({
    roomCode: initialRoomCode,
    grade: activeGrade,
    unit: activeUnit,
  });

  const deskList = useMemo(() => {
    return Object.values(desksMap).sort((a, b) => a.deskNumber - b.deskNumber);
  }, [desksMap]);

  const allFinished = stats.completedDesksCount >= 18;

  React.useEffect(() => {
    if (allFinished) {
      soundEffects.playFanfare();
      confetti({
        particleCount: 200,
        spread: 100,
        origin: { y: 0.5 },
      });
    }
  }, [allFinished]);

  return (
    <div className="w-full h-full min-h-0 flex-1 flex flex-col justify-between bg-slate-950 text-white p-3 sm:p-5 select-none overflow-hidden font-['UD_Digi_Kyokasho_NP-R','UD_Digi_Kyokasho_NK-R','BIZ_UDPGothic','Zen_Maru_Gothic',sans-serif]">
      {/* Header Bar */}
      <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl px-5 py-3 flex items-center justify-between gap-3 shrink-0 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400 text-amber-300 flex items-center justify-center">
            <Trophy size={22} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <span>{t('Classroom Memory Tournament', <>クラス<ruby>神経衰弱<rt className="text-[7px]">しんけいすいじゃく</rt></ruby>大会</>)}</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-600 text-white">STREAM B SPECTATOR</span>
            </h1>
            <span className="text-xs text-slate-400">
              PIN: <strong className="font-mono text-amber-300">{roomCode || 'MM-LIVE'}</strong> • 18 Desk Pairs
            </span>
          </div>
        </div>

        {/* Classroom Total Progress */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-xs font-bold text-slate-400 block uppercase">
              {t('Class Total Matches', '全クラス成立ペア数')}
            </span>
            <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
              {stats.totalClassPairsMatched} / {stats.targetClassPairs}
            </span>
          </div>

          <div className="h-10 w-px bg-slate-800" />

          {onExit && (
            <button
              onClick={onExit}
              className="px-3.5 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
            >
              {t('Exit', '終了')}
            </button>
          )}
        </div>
      </div>

      {/* Live 18-Desk Classroom Tournament Matrix (3 Rows of 6 Desks) */}
      <div className="flex-1 min-h-0 grid grid-cols-3 sm:grid-cols-6 gap-2.5 sm:gap-3 my-3 overflow-y-auto">
        {deskList.map((desk) => {
          const pct = Math.round((desk.pairsCompleted / (desk.totalPairs || 6)) * 100);
          return (
            <div
              key={desk.deskId}
              className={`rounded-2xl p-3 border-2 flex flex-col justify-between transition-all ${
                desk.isFinished
                  ? 'bg-gradient-to-b from-emerald-950/80 to-slate-900 border-emerald-400 shadow-lg'
                  : 'bg-slate-900/90 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-black text-sm text-white">Desk #{desk.deskNumber}</span>
                {desk.isFinished ? (
                  <CheckCircle2 size={16} className="text-emerald-400" />
                ) : (
                  <span className="text-xs font-mono font-bold text-amber-400">{pct}%</span>
                )}
              </div>

              {/* Seats & Score */}
              <div className="my-1.5 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-rose-400 font-bold truncate">🔴 {desk.nameA}</span>
                  <span className="font-mono font-black text-white">{desk.scoreA}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-sky-400 font-bold truncate">🔵 {desk.nameB}</span>
                  <span className="font-mono font-black text-white">{desk.scoreB}</span>
                </div>
              </div>

              {/* Mini Progress Bar */}
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mt-1">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    desk.isFinished ? 'bg-emerald-400' : 'bg-amber-400'
                  }`}
                  style={{ width: `${Math.max(5, pct)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Banner */}
      <div className="bg-slate-900/80 rounded-2xl px-4 py-2 border border-slate-800 flex items-center justify-between text-xs font-bold text-slate-400 shrink-0">
        <span>👀 {t('Watch your desk on the big screen! Speak English clearly to your partner!', '手元のiPadでペアと対戦！英語で元気に発音しよう！')}</span>
        <span className="text-emerald-400 font-black">
          {stats.completedDesksCount} / 18 {t('Desks Completed', '机がクリア！')}
        </span>
      </div>
    </div>
  );
};