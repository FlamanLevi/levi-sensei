/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ============================================================================
 * 3D Undokai Tamaire — Director TV HUD & Suspenseful Counting Ceremony Overlays
 * ============================================================================
 */

import React from 'react';
import { formatTamaireCountCallout, TamaireSuspenseFrame } from '../../core/quizEngine';
import type { VolleyballAnswerEvent } from '../Tamaire3DStage';
import { computeAdaptiveBasketFillRatio } from './tamaireArenaBuilder';

export type DirectorCamPreset = 'WIDE' | 'ORBIT' | 'BASKETS';

interface TamaireDirectorOverlaysProps {
  redScore: number;
  whiteScore: number;
  countedRed: number;
  countedWhite: number;
  matchEnded: boolean;
  hideScoreUntilEnd: boolean;
  timeRemainingSeconds?: number;
  ceremonySfxEnabled: boolean;
  onToggleCeremonySfx: () => void;
  directorCamPreset: DirectorCamPreset;
  onSelectDirectorCamPreset: (preset: DirectorCamPreset) => void;
  latestThrowBanner: VolleyballAnswerEvent | null;
  countingActive: boolean;
  ceremonyComplete: boolean;
  activeSuspenseFrame: TamaireSuspenseFrame | null;
  onReplayCeremony: () => void;
}

export const TamaireDirectorOverlays: React.FC<TamaireDirectorOverlaysProps> = ({
  redScore,
  whiteScore,
  countedRed,
  countedWhite,
  matchEnded,
  hideScoreUntilEnd,
  timeRemainingSeconds,
  ceremonySfxEnabled,
  onToggleCeremonySfx,
  directorCamPreset,
  onSelectDirectorCamPreset,
  latestThrowBanner,
  countingActive,
  ceremonyComplete,
  activeSuspenseFrame,
  onReplayCeremony,
}) => {
  const currentStage = activeSuspenseFrame?.stage || (ceremonyComplete ? 'VICTORY_FANFARE' : null);
  const currentCallout =
    activeSuspenseFrame?.callout ||
    (Math.max(countedRed, countedWhite) > 0
      ? formatTamaireCountCallout(Math.max(countedRed, countedWhite))
      : null);
  const minScore = Math.min(redScore, whiteScore);
  const isCliffhanger = currentStage === 'CLIFFHANGER_RATTLE';
  const isClimax = currentStage === 'CLIMAX_REVEAL';

  return (
    <>
      {/* Top Undokai Basket Scoreboard Overlay (Director TV View Only) */}
      <div className="pointer-events-none absolute inset-x-0 top-3 px-4 flex items-start justify-between gap-3 z-20">
        {/* Red Team Basket Counter */}
        <div
          className={`bg-rose-950/90 border-2 rounded-2xl px-3.5 py-2 shadow-xl flex items-center gap-3 backdrop-blur-sm min-w-[205px] transition-all duration-300 ${
            isCliffhanger
              ? 'border-amber-400 ring-4 ring-amber-400/40 scale-105'
              : isClimax && redScore > whiteScore
                ? 'border-amber-300 ring-4 ring-rose-500/50 scale-105'
                : 'border-rose-500'
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center font-black text-lg border border-rose-300 shrink-0">
            赤
          </div>
          <div className="flex-1">
            <div className="text-[11px] font-black uppercase tracking-wider text-rose-200 flex items-center justify-between gap-2">
              <span>
                <ruby>
                  赤組<rt>あかぐみ</rt>
                </ruby>{' '}
                カゴ (RED)
              </span>
              {isCliffhanger && (
                <span className="px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 text-[9px] font-black">
                  TIED!
                </span>
              )}
              {isClimax && redScore <= whiteScore && (
                <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[9px] font-black">
                  空っぽ (EMPTY)
                </span>
              )}
              {isClimax && redScore > whiteScore && (
                <span className="px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 text-[9px] font-black">
                  +{countedRed - minScore} 勝ち越し!
                </span>
              )}
            </div>
            <div
              data-testid="tamaire-red-count"
              className="text-2xl sm:text-3xl font-black text-white tabular-nums leading-none mt-0.5"
            >
              {matchEnded
                ? `${countedRed} 個`
                : hideScoreUntilEnd
                  ? '??? 個'
                  : `${redScore} 個`}
            </div>
            <div className="mt-1.5 w-full h-2 rounded-full bg-rose-900/80 overflow-hidden border border-rose-700/60">
              <div
                className="h-full bg-gradient-to-r from-rose-500 via-rose-400 to-amber-300 transition-all duration-300"
                style={{
                  width: `${Math.round(
                    computeAdaptiveBasketFillRatio(
                      matchEnded
                        ? activeSuspenseFrame?.remainingRedVisual ?? 0
                        : redScore,
                      20
                    ) * 100
                  )}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Center Match Countdown Clock, Camera Switcher & Mystery Mode Pill */}
        <div className="flex flex-col items-center gap-1.5 pointer-events-auto min-w-0">
          <div className="flex items-center gap-1.5 flex-nowrap shrink-0">
            {typeof timeRemainingSeconds === 'number' && !matchEnded && (
              <div
                data-testid="tamaire-host-timer"
                className={`px-3 py-1 rounded-full font-mono text-xs font-black border shadow-lg transition-all whitespace-nowrap ${
                  timeRemainingSeconds <= 10
                    ? 'bg-rose-600 text-white border-amber-300 animate-pulse scale-105'
                    : 'bg-slate-950/90 text-amber-300 border-slate-700'
                }`}
              >
                ⏱️ 残り {timeRemainingSeconds}秒
              </div>
            )}
            {matchEnded && (
              <div className="px-3 py-1 rounded-full bg-amber-400 text-slate-950 font-black text-xs shadow-lg border border-white whitespace-nowrap">
                📢 試合終了・玉かぞえ中！ (TALLYING BAGS)
              </div>
            )}
            <button
              type="button"
              onClick={onToggleCeremonySfx}
              className="px-2.5 py-1 rounded-full bg-slate-950/85 hover:bg-slate-900 text-slate-200 border border-slate-700 text-[10px] font-bold cursor-pointer transition whitespace-nowrap"
            >
              {ceremonySfxEnabled ? '🔊 太鼓・笛 ON' : '🔇 効果音 OFF'}
            </button>
          </div>

          {!matchEnded && (
            <div className="flex items-center gap-1 bg-slate-950/85 border border-slate-700/80 rounded-full p-0.5 shadow">
              {(
                [
                  { id: 'WIDE', label: '🎥 全体TV' },
                  { id: 'BASKETS', label: '🎥 カゴ拡大' },
                  { id: 'ORBIT', label: '🎥 ドローン' },
                ] as const
              ).map((cam) => (
                <button
                  key={cam.id}
                  type="button"
                  onClick={() => onSelectDirectorCamPreset(cam.id)}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black transition cursor-pointer whitespace-nowrap ${
                    directorCamPreset === cam.id
                      ? 'bg-amber-400 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {cam.label}
                </button>
              ))}
            </div>
          )}

          {!matchEnded && hideScoreUntilEnd && (
            <div className="hidden xl:block px-2.5 py-0.5 rounded-full bg-slate-950/85 border border-amber-400/50 text-amber-300 text-[10px] font-black whitespace-nowrap">
              🔒 玉かぞえまで個数ヒミツ！
            </div>
          )}
        </div>

        {/* White Team Basket Counter */}
        <div
          className={`bg-slate-900/90 border-2 rounded-2xl px-3.5 py-2 shadow-xl flex items-center gap-3 backdrop-blur-sm min-w-[205px] transition-all duration-300 ${
            isCliffhanger
              ? 'border-amber-400 ring-4 ring-amber-400/40 scale-105'
              : isClimax && whiteScore > redScore
                ? 'border-amber-300 ring-4 ring-sky-400/50 scale-105'
                : 'border-slate-200'
          }`}
        >
          <div className="text-right flex-1">
            <div className="text-[11px] font-black uppercase tracking-wider text-slate-300 flex items-center justify-end gap-2">
              {isCliffhanger && (
                <span className="px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 text-[9px] font-black">
                  TIED!
                </span>
              )}
              {isClimax && whiteScore <= redScore && (
                <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[9px] font-black">
                  空っぽ (EMPTY)
                </span>
              )}
              {isClimax && whiteScore > redScore && (
                <span className="px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 text-[9px] font-black">
                  +{countedWhite - minScore} 勝ち越し!
                </span>
              )}
              <span>
                <ruby>
                  白組<rt>しろぐみ</rt>
                </ruby>{' '}
                カゴ (WHITE)
              </span>
            </div>
            <div
              data-testid="tamaire-white-count"
              className="text-2xl sm:text-3xl font-black text-white tabular-nums leading-none mt-0.5"
            >
              {matchEnded
                ? `${countedWhite} 個`
                : hideScoreUntilEnd
                  ? '??? 個'
                  : `${whiteScore} 個`}
            </div>
            <div className="mt-1.5 w-full h-2 rounded-full bg-slate-800 overflow-hidden border border-slate-600/60 flex justify-end">
              <div
                className="h-full bg-gradient-to-l from-white via-sky-200 to-amber-300 transition-all duration-300"
                style={{
                  width: `${Math.round(
                    computeAdaptiveBasketFillRatio(
                      matchEnded
                        ? activeSuspenseFrame?.remainingWhiteVisual ?? 0
                        : whiteScore,
                      20
                    ) * 100
                  )}%`,
                }}
              />
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white text-slate-900 flex items-center justify-center font-black text-lg border border-slate-300 shrink-0">
            白
          </div>
        </div>
      </div>

      {/* Live Student Throw Feed Pill on Main Screen during Active Play */}
      {!matchEnded && latestThrowBanner && (
        <div
          key={latestThrowBanner.id}
          data-testid="tamaire-live-throw-ticker"
          className="pointer-events-none absolute bottom-3 inset-x-0 flex justify-center z-20 px-4"
        >
          <div
            className={`px-4 py-1.5 rounded-full font-black text-xs shadow-xl border-2 flex items-center gap-2 backdrop-blur-md ${
              latestThrowBanner.isMiss
                ? 'bg-rose-950/90 text-rose-200 border-rose-400'
                : latestThrowBanner.isGoldenDouble
                  ? 'bg-amber-400 text-slate-950 border-white'
                  : latestThrowBanner.stepAction === 'SCOOP' || latestThrowBanner.stepAction === 'AIM'
                    ? 'bg-indigo-950/90 text-amber-200 border-amber-400/60'
                    : latestThrowBanner.team === 'red'
                      ? 'bg-rose-600/95 text-white border-rose-200'
                      : 'bg-slate-900/95 text-white border-slate-200'
            }`}
          >
            <span>
              {latestThrowBanner.team === 'red' ? '🔴 赤組' : '⚪ 白組'} • {latestThrowBanner.playerName}
            </span>
            <span className="opacity-60">|</span>
            <span>
              {latestThrowBanner.stepAction === 'SCOOP'
                ? '✋ ① お手玉を拾った！ (Step 1/3: Scooped Bag!)'
                : latestThrowBanner.stepAction === 'AIM'
                  ? '🎯 ② カゴに照準ロックオン！ (Step 2/3: Locked On Net!)'
                  : latestThrowBanner.stepAction === 'FUMBLED_SAND'
                    ? '💦 砂で手が滑った！ (Fumbled in Sand!)'
                    : latestThrowBanner.stepAction === 'DROPPED_BAG'
                      ? '💦 あっ！お手玉を落とした！ (Dropped Bag -> Back to Step 1!)'
                      : latestThrowBanner.isMiss
                        ? '💥 ガンッ！カゴのフチに弾かれた！ (RIM DOINK!)'
                        : latestThrowBanner.isGoldenDouble
                          ? '🔥 金のお手玉 2個スウィッシュ！！ (+2 BAGS!)'
                          : '🎯 ③ スポッ！ナイスイン！ (+1 BAG SWISH!)'}
            </span>
          </div>
        </div>
      )}

      {/* Post-Whistle Multi-Stage Suspenseful Counting Ceremony Banner */}
      {matchEnded && (countingActive || ceremonyComplete) && (
        <div
          data-testid="tamaire-ceremony-banner"
          className="pointer-events-none absolute inset-x-0 bottom-3 flex flex-col items-center justify-center z-30 px-4"
        >
          {/* 4-Step Ceremony Progress Stepper */}
          <div className="mb-1.5 flex items-center gap-1.5 bg-slate-950/90 border border-slate-700/80 px-3 py-1 rounded-full shadow-lg">
            {[
              { id: 'WHISTLE_EYES_UP', label: '① 笛・体育座りで注目 (Sit & Look Up)' },
              { id: 'RHYTHMIC_CHANT', label: '② 玉かぞえ (Count Out Loud)' },
              { id: 'CLIFFHANGER_RATTLE', label: '③ 同点ドラムロール (Suspense!)' },
              { id: 'VICTORY_FANFARE', label: '④ 決着！(Winner!)' },
            ].map((st) => {
              const active =
                currentStage === st.id ||
                (st.id === 'RHYTHMIC_CHANT' && currentStage === 'TENSION_SLOWDOWN') ||
                (st.id === 'VICTORY_FANFARE' && currentStage === 'CLIMAX_REVEAL');
              return (
                <span
                  key={st.id}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black transition-all ${
                    active ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-400'
                  }`}
                >
                  {st.label}
                </span>
              );
            })}
          </div>

          {/* Visual Bean Bag Tally Rack */}
          {(countedRed > 0 || countedWhite > 0) && (
            <div
              data-testid="tamaire-visual-tally-rack"
              className="mb-1.5 w-full max-w-xl bg-slate-950/90 border border-slate-700 rounded-2xl px-3.5 py-1.5 shadow-xl grid grid-cols-2 gap-3"
            >
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center justify-between text-[10px] font-black text-rose-300">
                  <span>🔴 赤組 カウント済み</span>
                  <span className="font-mono text-xs text-white">{countedRed}個</span>
                </div>
                <div className="flex flex-wrap gap-0.5 min-h-[16px] items-center">
                  {Array.from({ length: Math.min(25, countedRed) }).map((_, idx) => (
                    <span
                      key={idx}
                      className={`inline-block w-2.5 h-2 rounded-full border ${
                        idx >= minScore
                          ? 'bg-amber-400 border-white animate-bounce'
                          : 'bg-rose-500 border-rose-200'
                      }`}
                    />
                  ))}
                  {countedRed > 25 && (
                    <span className="text-[9px] font-black text-amber-300 ml-1">
                      +{countedRed - 25}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-0.5">
                <div className="flex items-center justify-between text-[10px] font-black text-slate-200">
                  <span>⚪ 白組 カウント済み</span>
                  <span className="font-mono text-xs text-white">{countedWhite}個</span>
                </div>
                <div className="flex flex-wrap gap-0.5 min-h-[16px] items-center">
                  {Array.from({ length: Math.min(25, countedWhite) }).map((_, idx) => (
                    <span
                      key={idx}
                      className={`inline-block w-2.5 h-2 rounded-full border ${
                        idx >= minScore
                          ? 'bg-amber-400 border-white animate-bounce'
                          : 'bg-white border-slate-400'
                      }`}
                    />
                  ))}
                  {countedWhite > 25 && (
                    <span className="text-[9px] font-black text-amber-300 ml-1">
                      +{countedWhite - 25}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {currentStage === 'WHISTLE_EYES_UP' ? (
            <div className="bg-slate-950/95 border-4 border-amber-400 rounded-3xl px-6 py-2.5 text-center shadow-2xl max-w-2xl">
              <span className="text-[11px] font-black uppercase tracking-widest text-amber-300 block">
                👀 STOP THROWING! EVERYONE SIT &amp; LOOK UP AT THE BASKETS!
              </span>
              <div className="text-xl sm:text-2xl font-black text-white tracking-tight">
                📢 ピーッ！<ruby>終了<rt>しゅうりょう</rt></ruby>！カゴからお手玉を<ruby>出<rt>だ</rt></ruby>して「玉かぞえ」スタート！！
              </div>
              <p className="text-[11px] font-bold text-slate-300 mt-0.5">
                <ruby>生徒<rt>せいと</rt></ruby>たちが<ruby>線<rt>せん</rt></ruby>の<ruby>外<rt>そと</rt></ruby>に<ruby>体育座<rt>たいいくずわ</rt></ruby>りして、カゴから<ruby>飛<rt>と</rt></ruby>び<ruby>出<rt>だ</rt></ruby>すお手玉を1つずつ<ruby>数<rt>かぞ</rt></ruby>えます！
              </p>
            </div>
          ) : currentStage === 'CLIFFHANGER_RATTLE' ? (
            <div className="bg-amber-950/95 border-4 border-amber-400 rounded-3xl px-6 py-2.5 text-center shadow-2xl max-w-2xl ring-4 ring-amber-400/30">
              <span className="text-[11px] font-black uppercase tracking-widest text-amber-300 block">
                🥁 TAIKO DRUMROLL CLIFFHANGER • TIED AT {minScore} BAGS EACH!!
              </span>
              <div className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {activeSuspenseFrame?.headlineJa}
              </div>
              <div className="mt-1 flex items-center justify-center gap-5 text-xs font-black">
                <span className="text-rose-300">🔴 赤組: {countedRed}個 (同点!)</span>
                <span className="text-amber-300">⚡ カゴの底を揺らして確認中…！</span>
                <span className="text-sky-200">⚪ 白組: {countedWhite}個 (同点!)</span>
              </div>
            </div>
          ) : countingActive && currentCallout ? (
            <div
              className={`bg-slate-950/95 border-4 rounded-3xl px-7 py-2 text-center shadow-2xl max-w-2xl transition-all ${
                currentStage === 'CLIMAX_REVEAL'
                  ? 'border-rose-400 ring-4 ring-amber-400/50'
                  : currentStage === 'TENSION_SLOWDOWN'
                    ? 'border-amber-300 ring-2 ring-amber-400/30'
                    : 'border-amber-400'
              }`}
            >
              <span className="text-[11px] font-black uppercase tracking-widest text-amber-300 block">
                {activeSuspenseFrame?.headlineJa || '📢 玉かぞえセレモニー • COUNTING CEREMONY!'}
              </span>
              <div className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                「{currentCallout.reading}」 ({currentCallout.romaji})
              </div>
              <div className="mt-0.5 flex items-center justify-center gap-6 text-xs font-black">
                <span className="text-rose-400">
                  🔴 赤組: {countedRed}個{' '}
                  {currentStage === 'CLIMAX_REVEAL' && redScore > whiteScore && '🔥 まだ入ってた!!'}
                </span>
                <span className="text-slate-200">
                  ⚪ 白組: {countedWhite}個{' '}
                  {currentStage === 'CLIMAX_REVEAL' && whiteScore > redScore && '🔥 まだ入ってた!!'}
                </span>
              </div>
            </div>
          ) : (
            <div className="pointer-events-auto bg-slate-950/95 border-4 border-amber-400 rounded-3xl px-6 py-2 text-center shadow-2xl flex flex-col sm:flex-row items-center gap-4">
              <div className="text-left">
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-300 block">
                  🏆 玉入れ合戦 結果発表 • FINAL TAMAIRE COUNT
                </span>
                <div className="text-xl sm:text-2xl lg:text-3xl font-black text-white whitespace-nowrap">
                  {redScore > whiteScore
                    ? `🔴 赤組の勝利！ (${redScore} 対 ${whiteScore})`
                    : whiteScore > redScore
                      ? `⚪ 白組の勝利！ (${whiteScore} 対 ${redScore})`
                      : `🤝 引き分け！ (${redScore} 対 ${whiteScore})`}
                </div>
              </div>
              <button
                type="button"
                onClick={onReplayCeremony}
                className="px-3.5 py-2 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-md transition cursor-pointer shrink-0"
              >
                🔁 玉かぞえリプレイ (Replay Count)
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
};
