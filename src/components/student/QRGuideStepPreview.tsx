import React, { useState } from 'react';
import { QuizHostLobby } from '@/games/quiz/host/QuizHostLobby';
import { QuizStudentJoin } from '@/games/quiz/student/QuizStudentJoin';
import { QuizStudentQuestion } from '@/games/quiz/student/QuizStudentQuestion';
import { QuizStudentGameOver } from '@/games/quiz/student/QuizStudentGameOver';
import { EditProfileModal } from '@/components/student/EditProfileModal';
import { QuizQuestion } from '@/games/quiz/types';
import { StudentProfile } from '@/types/roster';

interface QRGuideStepPreviewProps {
  step: number;
}

export const QRGuideStepPreview: React.FC<QRGuideStepPreviewProps> = ({ step }) => {
  const [selectedNum, setSelectedNum] = useState<number>(14);

  // Step 1: Front TV Quiz Host Lobby
  if (step === 1) {
    return (
      <div className="w-full min-h-dvh bg-slate-950 text-white flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-5xl">
          <div className="mb-2 px-4 py-1.5 rounded-full bg-indigo-600/30 border border-indigo-400 text-indigo-300 text-xs font-black inline-flex items-center gap-2">
            <span>📺</span>
            <span>【教室の前テレビ画面】 先生がクイズの部屋を開いた状態</span>
          </div>
          <QuizHostLobby
            roomCode="2048"
            grade="ES_G2"
            unit="ALL"
            schoolId="futakotamagawa"
            classId="2-1"
            players={{}}
            onStart={() => {}}
            onKickPlayer={() => {}}
            onCancel={() => {}}
          />
        </div>
      </div>
    );
  }

  // Step 2: iPad Camera Scanner Viewfinder
  if (step === 2) {
    return (
      <div className="w-full min-h-dvh bg-slate-900 text-white flex flex-col items-center justify-between p-6 relative overflow-hidden select-none">
        {/* iOS iPad Camera Top Banner */}
        <div className="w-full max-w-lg z-30 pt-2 animate-in slide-in-from-top duration-300">
          <div className="bg-amber-400 text-slate-950 font-black px-4 py-3 rounded-2xl shadow-2xl flex items-center justify-between border-2 border-amber-300 cursor-pointer hover:bg-amber-300 transition-all">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white text-slate-900 flex items-center justify-center text-base shadow-sm">
                🧭
              </div>
              <div className="text-left">
                <span className="text-[10px] font-bold text-amber-900 block leading-tight">Safari で開く</span>
                <span className="text-sm font-black tracking-tight">levi-sensei.web.app (?pin=2048)</span>
              </div>
            </div>
            <span className="text-lg font-bold">›</span>
          </div>
        </div>

        {/* Viewfinder Center framing TV Screen */}
        <div className="relative z-10 w-full max-w-xl aspect-[4/3] rounded-3xl border-2 border-white/20 bg-slate-950/70 backdrop-blur-xs flex flex-col items-center justify-center p-8 my-auto shadow-2xl">
          {/* Target Reticles */}
          <div className="absolute top-6 left-6 w-10 h-10 border-t-4 border-l-4 border-amber-400 rounded-tl-xl" />
          <div className="absolute top-6 right-6 w-10 h-10 border-t-4 border-r-4 border-amber-400 rounded-tr-xl" />
          <div className="absolute bottom-6 left-6 w-10 h-10 border-b-4 border-l-4 border-amber-400 rounded-bl-xl" />
          <div className="absolute bottom-6 right-6 w-10 h-10 border-b-4 border-r-4 border-amber-400 rounded-br-xl" />

          {/* QR representation */}
          <div className="p-4 bg-white rounded-2xl shadow-xl flex flex-col items-center">
            <div className="w-48 h-48 bg-slate-900 rounded-xl p-3 flex flex-col items-center justify-center text-white">
              <span className="text-6xl mb-2">📱</span>
              <span className="text-xs font-mono font-black text-amber-400">PIN: 2048</span>
              <span className="text-[10px] text-slate-400">2年1組 英語クイズ</span>
            </div>
          </div>

          <p className="mt-4 text-xs font-bold text-slate-300 bg-black/60 px-4 py-1.5 rounded-full">
            前のテレビのQRコードをカメラの中に収めてね
          </p>
        </div>

        {/* iPad Camera Shutter Controls Bar */}
        <div className="w-full max-w-md flex items-center justify-between px-8 py-3 bg-black/40 rounded-full backdrop-blur-md z-20">
          <span className="text-xs font-bold text-slate-400">写真</span>
          <div className="w-14 h-14 rounded-full border-4 border-white flex items-center justify-center">
            <div className="w-11 h-11 rounded-full bg-white" />
          </div>
          <span className="text-xs font-bold text-slate-400">ビデオ</span>
        </div>
      </div>
    );
  }

  // Step 3: Quick Join Screen (PIN filled, Tab Highlighted)
  if (step === 3) {
    return (
      <div className="w-full min-h-dvh bg-slate-950 flex flex-col items-center justify-center p-4">
        <QuizStudentJoin
          initialPin="2048"
          onJoin={async () => {}}
          onCancel={() => {}}
          loading={false}
          error={null}
        />
      </div>
    );
  }

  // Step 4: Attendance Number Selected (14番)
  if (step === 4) {
    return (
      <div className="w-full min-h-dvh bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md mx-auto p-4 sm:p-6 select-none animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border-4 border-purple-200 dark:border-purple-950/80">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-purple-500 to-indigo-600 text-white flex items-center justify-center mx-auto mb-3 shadow-xl text-2xl font-black">
                🎮
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                クイズに参加しよう！
              </h2>
              <p className="text-xs font-bold text-slate-400 mt-1">
                2年1組の英語クイズルーム
              </p>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  1. へやのばんごう
                </label>
                <div className="w-full py-3 text-center font-mono font-black text-3xl tracking-widest rounded-2xl border-2 border-purple-500 bg-purple-50/50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-300">
                  2 0 4 8
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  2. なまえ・ニックネーム
                </label>

                {/* Tabs */}
                <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl mb-3">
                  <div className="py-1.5 text-xs font-black rounded-xl text-center text-slate-400">
                    にゅうりょく
                  </div>
                  <div className="py-1.5 text-xs font-black rounded-xl text-center bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs">
                    しゅっせき番号
                  </div>
                  <div className="py-1.5 text-xs font-black rounded-xl text-center text-slate-400">
                    おまかせ
                  </div>
                </div>

                {/* Grid */}
                <div className="max-h-40 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border-2 border-slate-200 dark:border-slate-700">
                  <div className="grid grid-cols-5 gap-1.5">
                    {Array.from({ length: 35 }, (_, i) => i + 1).map((num) => {
                      const isSelected = num === 14;
                      return (
                        <button
                          key={num}
                          type="button"
                          className={`py-2 rounded-xl text-xs font-black transition-all ${
                            isSelected
                              ? 'bg-purple-600 text-white shadow-md ring-2 ring-purple-400 scale-105'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {num}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Playing as */}
              <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-emerald-500">✓</span>
                <span>参加する名前:</span>
                <strong className="text-purple-600 dark:text-purple-400 text-sm">14番</strong>
              </div>

              {/* Purple Join Button */}
              <button
                type="button"
                className="w-full py-4 rounded-2xl font-black text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-xl shadow-purple-500/25 text-base flex items-center justify-center gap-2 cursor-pointer active:scale-98 transition-all"
              >
                <span>クイズに参加する！</span>
                <span>➔</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Step 5: Active Quiz Gameplay (4-Choice Cards)
  if (step === 5) {
    const sampleQuestion: QuizQuestion = {
      questionIndex: 0,
      totalQuestions: 5,
      targetWordId: 'w_apple',
      targetWordEnglish: 'apple',
      targetWordJa: 'りんご',
      promptType: 'JA_MEANING',
      promptText: 'りんご',
      startTime: Date.now(),
      timeLimitMs: 15000,
      options: [
        { id: 'opt_1', english: 'apple', symbol: 'triangle', color: 'red' },
        { id: 'opt_2', english: 'orange', symbol: 'diamond', color: 'blue' },
        { id: 'opt_3', english: 'banana', symbol: 'circle', color: 'yellow' },
        { id: 'opt_4', english: 'grape', symbol: 'square', color: 'green' }
      ]
    };

    return (
      <div className="w-full min-h-dvh bg-slate-950 flex flex-col items-center justify-center p-3 select-none">
        <div className="w-full max-w-4xl h-[750px] flex flex-col justify-between">
          {/* Top Status */}
          <div className="flex items-center justify-between px-4 py-2 bg-slate-900 rounded-2xl border border-slate-800">
            <span className="text-xs font-black text-amber-400">問題 1 / 5</span>
            <span className="text-xs font-bold text-slate-300">出席番号: 14番</span>
            <span className="text-xs font-black text-purple-400">のこり 12 秒</span>
          </div>

          <div className="my-auto">
            <QuizStudentQuestion
              question={sampleQuestion}
              ipadDisplayMode="MIRRORED"
              onAnswer={() => {}}
              answeredCount={18}
              totalStudents={28}
            />
          </div>
        </div>
      </div>
    );
  }

  // Step 6: Game Over Celebration & Attendance Number Seat Claim
  if (step === 6) {
    const mockPlayer = {
      id: 'p14',
      nickname: '14番',
      score: 1250,
      currentStreak: 5,
      maxStreak: 5,
      correctCount: 5,
      totalAnswered: 5,
      fastestTimeMs: 1200,
      finishRank: 1,
      joinedAt: Date.now(),
      answers: {}
    };

    return (
      <div className="w-full min-h-dvh bg-slate-950 flex flex-col items-center justify-center p-4">
        <QuizStudentGameOver
          player={mockPlayer}
          allPlayers={{ p14: mockPlayer }}
          totalQuestions={5}
          roomCode="2048"
          schoolId="futakotamagawa"
          classId="2-1"
          recordRoster={true}
          boundStudents={{}}
          onExit={() => {}}
        />
      </div>
    );
  }

  // Step 7: Edit Profile (Nickname, Avatar, Secret Charm)
  if (step === 7) {
    const sampleProfile: StudentProfile = {
      schoolId: 'futakotamagawa',
      classId: '2-1',
      attendanceNumber: 14,
      nickname: 'そうた',
      avatar: '🚀',
      secretCharm: '🎮',
      level: 2,
      xp: 220,
      gold: 35,
      boundAt: Date.now()
    };

    return (
      <div className="w-full min-h-dvh bg-slate-950 flex flex-col items-center justify-center p-4">
        <EditProfileModal
          isOpen={true}
          profile={sampleProfile}
          onClose={() => {}}
          onUpdated={() => {}}
          onResetSeat={() => {}}
        />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-slate-950 text-white flex items-center justify-center p-8">
      <p>Invalid step: {step}</p>
    </div>
  );
};
