import React, { useEffect, useRef, useState } from 'react';
import { Volume2, Sparkles, PenTool, CheckCircle2 } from 'lucide-react';
import { useClassroom } from '@/context/ClassroomContext';
import { useLanguage } from '@/context/LanguageContext';
import { RubyText } from '@/components/common/RubyText';
import { getServerTime } from '@/services/rtdbSafe';
import { generateSketchVector, SketchPoint, SketchVectorData } from './sketchVectorizer';
import {
  AnticipationCanvasStyle,
  AnticipationRevealedCard,
  AnticipationTimerMode,
} from './types';

interface SketchCanvasProps {
  roundIndex?: number;
  wordId: string;
  wordHintEnglish: string; // Used ONLY internally as fallback seed; NEVER displayed until isRevealed!
  categoryKey: string;
  categoryNameEn: string;
  categoryNameJa: string;
  imageUrl?: string | null;
  nesVector?: string | null;
  drawStyle: 'INK_SKETCH' | 'CONNECT_DOTS';
  canvasStyle?: AnticipationCanvasStyle;
  timerMode?: AnticipationTimerMode;
  roundStartTime: number;
  drawCompletionMs?: number;
  drawDurationMs: number;
  isRevealed: boolean;
  revealedCard?: AnticipationRevealedCard;
  compact?: boolean;
  wordMask?: string;
  englishLength?: number;
  firstLetterHint?: string;
  secondLetterHint?: string;
  isFeatureDots?: boolean;
  onPlayAudio?: (soundFile?: string, fallbackText?: string) => void;
  paused?: boolean;
  progressOverride?: number;
  useLocalClock?: boolean;
  remainingSecDisplay?: number | null;
}

// Iconic 1988 NES Anticipation rotating matte board palettes (olive, ochre, royal cobalt, plum)
const NES_BOARD_PALETTES = [
  { bg: '#6b7310', grid: 'rgba(255, 255, 255, 0.06)', name: 'olive' },
  { bg: '#7c6d08', grid: 'rgba(255, 255, 255, 0.06)', name: 'ochre' },
  { bg: '#052096', grid: 'rgba(180, 200, 255, 0.08)', name: 'cobalt' },
  { bg: '#37166b', grid: 'rgba(216, 180, 254, 0.07)', name: 'plum' },
];

const ALPHABET_STRIP = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function formatProgressiveMask(
  rawMask: string | undefined,
  firstHint: string | undefined,
  secondHint: string | undefined,
  elapsedRatio: number
): string {
  if (!rawMask) return '';
  let seenLetters = 0;
  return rawMask
    .split('')
    .map((ch) => {
      if (ch !== '-' && ch !== '_') return ch;
      seenLetters++;
      if (seenLetters === 1 && elapsedRatio >= 0.55 && firstHint) return firstHint;
      if (seenLetters === 2 && elapsedRatio >= 1.0 && secondHint) return secondHint;
      return '-';
    })
    .join('');
}

function drawNesPencilSprite(
  ctx: CanvasRenderingContext2D,
  nibX: number,
  nibY: number,
  compact: boolean
) {
  const s = compact ? 0.72 : 1.05;
  ctx.save();
  ctx.translate(nibX, nibY);
  // Subtle drop shadow under floating NES pencil
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(6 * s, 4 * s, 10 * s, 3.5 * s, -Math.PI / 6, 0, Math.PI * 2);
  ctx.fill();

  // Rotate diagonally up-right (-45 deg) matching image_2.png & image_3.png
  ctx.rotate(-Math.PI / 4);

  // 1. Sharp Graphite Nib + Cone Collar
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(7 * s, -3.5 * s);
  ctx.lineTo(7 * s, 3.5 * s);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#fde68a';
  ctx.beginPath();
  ctx.moveTo(6 * s, -3.2 * s);
  ctx.lineTo(13 * s, -6.5 * s);
  ctx.lineTo(13 * s, 6.5 * s);
  ctx.lineTo(6 * s, 3.2 * s);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // 2. Stubby Faceted Orange-Red Barrel
  // Upper bright facet
  ctx.fillStyle = '#fb7185';
  ctx.fillRect(13 * s, -6.5 * s, 17 * s, 4.5 * s);
  // Middle vibrant NES orange facet
  ctx.fillStyle = '#ea4318';
  ctx.fillRect(13 * s, -2 * s, 17 * s, 5 * s);
  // Lower dark orange shaded facet
  ctx.fillStyle = '#9a1e0a';
  ctx.fillRect(13 * s, 3 * s, 17 * s, 3.5 * s);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.6;
  ctx.strokeRect(13 * s, -6.5 * s, 17 * s, 13 * s);

  // 3. Chunky Hexagonal Black Cap / Eraser
  ctx.fillStyle = '#111827';
  ctx.fillRect(30 * s, -6.8 * s, 9 * s, 13.6 * s);
  ctx.fillStyle = '#4b5563';
  ctx.fillRect(30 * s, -6.8 * s, 9 * s, 4 * s);
  ctx.strokeStyle = '#000000';
  ctx.strokeRect(30 * s, -6.8 * s, 9 * s, 13.6 * s);

  ctx.restore();
}

export const SketchCanvas: React.FC<SketchCanvasProps> = ({
  roundIndex = 0,
  wordId,
  wordHintEnglish,
  categoryKey,
  categoryNameEn,
  categoryNameJa,
  imageUrl,
  nesVector,
  drawStyle,
  canvasStyle = 'NES_RETRO',
  timerMode = 'NO_CUTOFF',
  roundStartTime,
  drawCompletionMs,
  drawDurationMs,
  isRevealed,
  revealedCard,
  compact = false,
  wordMask,
  englishLength,
  firstLetterHint,
  secondLetterHint,
  isFeatureDots = false,
  onPlayAudio,
  paused = false,
  progressOverride,
  useLocalClock = false,
  remainingSecDisplay,
}) => {
  const { theme } = useClassroom();
  const { t, language } = useLanguage();
  const isDark = theme === 'dark';
  const isNesRetro = canvasStyle === 'NES_RETRO';

  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const vectorRef = useRef<SketchVectorData | null>(null);
  const [vectorVersion, setVectorVersion] = useState(0);
  const [progressPct, setProgressPct] = useState(0);
  const [imgFailed, setImgFailed] = useState(false);

  const nesPalette = NES_BOARD_PALETTES[Math.abs(roundIndex) % NES_BOARD_PALETTES.length];
  const effectiveCompletionMs = Math.max(
    3500,
    drawCompletionMs ?? Math.min(12000, drawDurationMs || 11000)
  );

  // Load vector sketch geometry whenever the round/image changes
  useEffect(() => {
    let active = true;
    setImgFailed(false);
    vectorRef.current = null;
    generateSketchVector(
      { id: wordId, english: wordHintEnglish, category: categoryKey as any },
      imageUrl,
      nesVector
    ).then((vec) => {
      if (!active) return;
      vectorRef.current = vec;
      setVectorVersion((v) => v + 1);
    });
    return () => {
      active = false;
    };
  }, [wordId, wordHintEnglish, categoryKey, imageUrl, nesVector]);

  // Size canvas responsively with ResizeObserver capped at DPR <= 1.5 (GEMINI.md hardware budget)
  const sizeRef = useRef<{ w: number; h: number; dpr: number }>({ w: 480, h: 360, dpr: 1 });
  useEffect(() => {
    const el = containerRef.current;
    const canvas = canvasRef.current;
    if (!el || !canvas) return;

    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      const w = Math.max(180, Math.round(rect.width));
      const h = Math.max(140, Math.round(rect.height));
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      sizeRef.current = { w, h, dpr };
      const targetW = Math.round(w * dpr);
      const targetH = Math.round(h * dpr);
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }
    };

    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Main progressive drawing animation loop (STRICTLY follows effectiveCompletionMs so sketch ALWAYS finishes 100%)
  useEffect(() => {
    let rafId = 0;
    let lastPct = -1;

    const renderFrame = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      const vec = vectorRef.current;
      const { w, h, dpr } = sizeRef.current;
      const nowMs = useLocalClock ? Date.now() : getServerTime();

      const rawProgress =
        typeof progressOverride === 'number'
          ? Math.max(0, Math.min(1, progressOverride))
          : isRevealed
          ? 1
          : Math.max(
              0,
              Math.min(1, (nowMs - (roundStartTime || nowMs)) / effectiveCompletionMs)
            );

      const pctInt = Math.round(rawProgress * 100);
      if (pctInt !== lastPct) {
        lastPct = pctInt;
        setProgressPct(pctInt);
      }

      if (ctx && canvas) {
        ctx.save();
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, w, h);

        // 1. Matte NES Stage Canvas vs Clean Paper
        if (isNesRetro) {
          ctx.fillStyle = nesPalette.bg;
          ctx.fillRect(0, 0, w, h);
        } else {
          ctx.fillStyle = isDark ? '#0c1526' : '#fcfaf2';
          ctx.fillRect(0, 0, w, h);

          ctx.strokeStyle = isDark ? 'rgba(56, 189, 248, 0.08)' : 'rgba(148, 163, 184, 0.16)';
          ctx.lineWidth = 1;
          const gridStep = compact ? 22 : 28;
          ctx.beginPath();
          for (let gx = gridStep; gx < w; gx += gridStep) {
            ctx.moveTo(gx, 0);
            ctx.lineTo(gx, h);
          }
          for (let gy = gridStep; gy < h; gy += gridStep) {
            ctx.moveTo(0, gy);
            ctx.lineTo(w, gy);
          }
          ctx.stroke();
        }

        if (vec && vec.strokes.length > 0) {
          const pad = compact ? 16 : 24;
          const drawSize = Math.min(w - pad * 2, h - pad * 2);
          const offX = (w - drawSize) / 2;
          const offY = (h - drawSize) / 2;
          const toX = (nx: number) => offX + nx * drawSize;
          const toY = (ny: number) => offY + ny * drawSize;

          // A. Pre-plotted gleaming 3D Pearl Guide Dots in CONNECT_DOTS mode (matches image.png & image_2.png!)
          if (drawStyle === 'CONNECT_DOTS' && vec.dots.length > 0) {
            const dots: SketchPoint[] = vec.dots;
            dots.forEach((pt, idx) => {
              const dx = toX(pt.x);
              const dy = toY(pt.y);
              const r = compact ? 3.2 : isFeatureDots ? 5.2 : 4.2;

              if (isNesRetro) {
                // Dark drop shadow under pearl dot
                ctx.beginPath();
                ctx.arc(dx + 1.5, dy + 1.5, r, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(0, 0, 0, 0.58)';
                ctx.fill();

                // Bright pearl bead
                ctx.beginPath();
                ctx.arc(dx, dy, r, 0, Math.PI * 2);
                ctx.fillStyle = isFeatureDots ? '#fde047' : '#e2e8f0';
                ctx.fill();

                // Sharp white highlight glint
                ctx.beginPath();
                ctx.arc(dx - r * 0.28, dy - r * 0.28, r * 0.38, 0, Math.PI * 2);
                ctx.fillStyle = '#ffffff';
                ctx.fill();
              } else {
                ctx.beginPath();
                ctx.arc(dx, dy, r + 1.5, 0, Math.PI * 2);
                ctx.fillStyle = isFeatureDots ? '#f59e0b' : isDark ? '#38bdf8' : '#6366f1';
                ctx.fill();
                ctx.beginPath();
                ctx.arc(dx, dy, r * 0.6, 0, Math.PI * 2);
                ctx.fillStyle = '#ffffff';
                ctx.fill();
              }

              // On ★ BONUS Connect-Dots, show crisp small dot numbers beside key dots
              if (isFeatureDots && !compact && (idx < 14 || idx % 2 === 0)) {
                ctx.font = '900 10px ui-monospace, SFMono-Regular, monospace';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'bottom';
                ctx.fillStyle = isNesRetro ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.8)';
                ctx.fillText(String(idx + 1), dx + r + 3, dy - 1);
                ctx.fillStyle = isNesRetro ? '#fef08a' : isDark ? '#fbbf24' : '#312e81';
                ctx.fillText(String(idx + 1), dx + r + 2, dy - 2);
              }
            });
          }

          // B. Compute arc lengths of clean strokes and draw sequentially at even speed
          const lengths: number[] = [];
          let totalLen = 0;
          for (const s of vec.strokes) {
            let slen = 0;
            for (let i = 1; i < s.length; i++) {
              slen += Math.hypot(s[i].x - s[i - 1].x, s[i].y - s[i - 1].y);
            }
            lengths.push(slen);
            totalLen += slen;
          }

          const budgetStart = totalLen * rawProgress;

          const renderStrokePass = (
            offsetPx: number,
            color: string,
            lw: number
          ): { x: number; y: number } | null => {
            let lastNib: { x: number; y: number } | null = null;
            let budget = budgetStart;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.lineWidth = lw;
            ctx.strokeStyle = color;

            for (let si = 0; si < vec.strokes.length; si++) {
              if (budget <= 0) break;
              const s = vec.strokes[si];
              if (s.length < 2) continue;

              const slen = lengths[si];
              ctx.beginPath();
              ctx.moveTo(toX(s[0].x) + offsetPx, toY(s[0].y) + offsetPx);

              if (budget >= slen) {
                for (let k = 1; k < s.length; k++) {
                  ctx.lineTo(toX(s[k].x) + offsetPx, toY(s[k].y) + offsetPx);
                }
                if (offsetPx === 0) {
                  lastNib = { x: toX(s[s.length - 1].x), y: toY(s[s.length - 1].y) };
                }
                budget -= slen;
              } else {
                let rem = budget;
                for (let k = 1; k < s.length; k++) {
                  const segLen = Math.hypot(s[k].x - s[k - 1].x, s[k].y - s[k - 1].y);
                  if (rem >= segLen) {
                    ctx.lineTo(toX(s[k].x) + offsetPx, toY(s[k].y) + offsetPx);
                    rem -= segLen;
                    if (offsetPx === 0) {
                      lastNib = { x: toX(s[k].x), y: toY(s[k].y) };
                    }
                  } else {
                    const frac = segLen > 1e-6 ? rem / segLen : 0;
                    const px = toX(s[k - 1].x + (s[k].x - s[k - 1].x) * frac);
                    const py = toY(s[k - 1].y + (s[k].y - s[k - 1].y) * frac);
                    ctx.lineTo(px + offsetPx, py + offsetPx);
                    if (offsetPx === 0) {
                      lastNib = { x: px, y: py };
                    }
                    break;
                  }
                }
                budget = 0;
              }
              ctx.stroke();
            }
            return lastNib;
          };

          const baseLw = compact ? 3.2 : 4.6;
          let nibPos: { x: number; y: number } | null = null;
          if (isNesRetro) {
            // Extruded dark pixel bevel shadow + crisp bright NES white lines
            renderStrokePass(compact ? 1.6 : 2.2, 'rgba(0, 0, 0, 0.58)', baseLw + 0.5);
            nibPos = renderStrokePass(0, '#ffffff', baseLw);
          } else {
            nibPos = renderStrokePass(0, isDark ? '#f8fafc' : '#0f172a', baseLw);
          }

          // C. Stubby Orange/Black NES Pencil while actively drawing (lifts cleanly at 100%)
          if (!isRevealed && rawProgress < 0.995 && nibPos) {
            drawNesPencilSprite(ctx, nibPos.x, nibPos.y, compact);
          }
        }

        ctx.restore();
      }

      if (!isRevealed && !paused && typeof progressOverride !== 'number' && rawProgress < 1) {
        rafId = window.requestAnimationFrame(renderFrame);
      }
    };

    rafId = window.requestAnimationFrame(renderFrame);
    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [
    drawStyle,
    roundStartTime,
    effectiveCompletionMs,
    isRevealed,
    paused,
    progressOverride,
    useLocalClock,
    isDark,
    isNesRetro,
    nesPalette.bg,
    isFeatureDots,
    compact,
    vectorVersion,
  ]);

  const showHintChips = !compact && !isRevealed;
  const revealUrl = revealedCard?.imageUrl || imageUrl;
  const formattedMask = formatProgressiveMask(
    wordMask,
    firstLetterHint,
    secondLetterHint,
    progressPct / 100
  );
  const categoryUpper = (language === 'ja' ? categoryNameJa : categoryNameEn).toUpperCase();
  const revealedUpperFirst = progressPct >= 55 ? (firstLetterHint || '').toUpperCase() : '';
  const revealedUpperSecond = progressPct >= 100 ? (secondLetterHint || '').toUpperCase() : '';

  return (
    <div
      className={`relative w-full h-full flex flex-col overflow-hidden transition-colors ${
        isNesRetro
          ? 'rounded-2xl border-4 border-[#9aa8ff] shadow-[0_10px_28px_rgba(0,0,0,0.45),inset_0_0_0_2px_#3f4899]'
          : `rounded-3xl border-4 shadow-xl ${
              isDark ? 'bg-slate-900 border-slate-700' : 'bg-[#fcfaf2] border-amber-200'
            }`
      }`}
      style={isNesRetro ? { backgroundColor: nesPalette.bg } : undefined}
    >
      {/* Top Category Header Bar (Classic NES centered uppercase label + mode tag) */}
      <div
        className={`flex items-center justify-between gap-2 px-3 py-1.5 border-b shrink-0 flex-nowrap ${
          isNesRetro
            ? 'border-white/20 bg-black/20 text-white'
            : isDark
            ? 'bg-slate-900/95 border-slate-800 text-slate-200'
            : 'bg-amber-50/90 border-amber-200/80 text-slate-800'
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0 shrink-0">
          <span
            className={`px-2 py-0.5 rounded-lg text-[10px] sm:text-[11px] font-black flex items-center gap-1 whitespace-nowrap shrink-0 ${
              isNesRetro
                ? drawStyle === 'CONNECT_DOTS'
                  ? 'bg-[#9aa8ff] text-slate-950'
                  : 'bg-amber-400 text-slate-950'
                : drawStyle === 'CONNECT_DOTS'
                ? 'bg-indigo-600 text-white'
                : 'bg-amber-500 text-slate-950'
            }`}
          >
            {drawStyle === 'CONNECT_DOTS' ? (
              <>
                <Sparkles size={11} />
                <span>{t('Dots', 'てんつなぎ')}</span>
              </>
            ) : (
              <>
                <PenTool size={11} />
                <span>{t('Lines', 'スケッチ')}</span>
              </>
            )}
          </span>
          {isFeatureDots && (
            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black bg-rose-500 text-white whitespace-nowrap shrink-0">
              ★ BONUS
            </span>
          )}
        </div>

        {/* Crisp Centered NES Category Header */}
        <span
          className={`font-mono font-black tracking-widest truncate text-center ${
            compact ? 'text-[11px]' : 'text-xs sm:text-sm'
          } ${isNesRetro ? 'text-white drop-shadow-[1px_1px_0_rgba(0,0,0,0.8)]' : 'opacity-90'}`}
        >
          {categoryUpper}
        </span>

        {/* Completion Badge */}
        <div className="flex items-center gap-1.5 shrink-0 flex-nowrap">
          {progressPct >= 100 && !isRevealed ? (
            <span
              className={`font-mono text-[11px] font-black px-2 py-0.5 rounded-lg flex items-center gap-1 whitespace-nowrap ${
                isNesRetro
                  ? 'bg-emerald-400 text-slate-950'
                  : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
              }`}
            >
              <CheckCircle2 size={11} />
              <span>100%</span>
            </span>
          ) : (
            <span
              className={`font-mono text-xs font-black px-2 py-0.5 rounded-lg ${
                isNesRetro
                  ? 'bg-black/35 text-white'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
              }`}
            >
              {isRevealed ? '100%' : `${progressPct}%`}
            </span>
          )}
        </div>
      </div>

      {/* Main Canvas Stage */}
      <div ref={containerRef} className="relative flex-1 min-h-0 w-full">
        <canvas ref={canvasRef} className="w-full h-full block" />

        {/* Reveal Full-Color Textbook Flashcard Overlay */}
        {isRevealed && revealedCard && (
          <div className="absolute inset-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm flex flex-col sm:flex-row items-center justify-center gap-4 p-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-36 h-36 sm:w-48 sm:h-48 rounded-3xl bg-slate-50 dark:bg-slate-800 border-3 border-emerald-400 shadow-xl flex items-center justify-center p-3 shrink-0 overflow-hidden">
              {revealUrl && !imgFailed ? (
                <img
                  src={revealUrl}
                  alt={revealedCard.english}
                  className="w-full h-full object-contain"
                  onError={() => setImgFailed(true)}
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-center gap-1 px-2">
                  <span className="text-4xl">🎨</span>
                  <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 leading-tight">
                    {revealedCard.english}
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-col items-center sm:items-start text-center sm:text-left min-w-0">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs font-black mb-1.5">
                ✓ {t('Answer Reveal', 'せいかい！')}
              </span>
              <h3 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                {revealedCard.english}
              </h3>
              {revealedCard.en_katakana && (
                <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                  {revealedCard.en_katakana}
                </span>
              )}
              {(() => {
                const jaDisplay = (revealedCard.ja_kanji || revealedCard.ja_hiragana || '').trim();
                const hasRuby = Boolean(revealedCard.ruby && revealedCard.ruby.length > 0);
                if (!jaDisplay && !hasRuby) return null;
                if (!hasRuby && jaDisplay === (revealedCard.en_katakana || '').trim()) return null;
                return (
                  <p className="text-base sm:text-lg font-bold text-slate-600 dark:text-slate-300 mt-1">
                    {hasRuby ? (
                      <RubyText
                        ruby={revealedCard.ruby!}
                        kanji={revealedCard.ja_kanji}
                        hiragana={revealedCard.ja_hiragana}
                      />
                    ) : (
                      jaDisplay
                    )}
                  </p>
                );
              })()}

              {onPlayAudio && (
                <button
                  type="button"
                  onClick={() => onPlayAudio(revealedCard.soundFile, revealedCard.english)}
                  className="mt-3 px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-md active:scale-95 transition-all cursor-pointer"
                >
                  <Volume2 size={16} />
                  <span>{t('Hear English Audio', '英語をきく')}</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Classic NES Bottom Prompt Bar (SAU---- + Timer/∞ + A..Z strip) */}
      {showHintChips && wordMask && (
        <div
          className={`px-3 py-1.5 border-t flex flex-col gap-1 shrink-0 ${
            isNesRetro
              ? 'border-white/40 bg-black/25 text-white'
              : isDark
              ? 'bg-slate-900/95 border-slate-800 text-slate-200'
              : 'bg-amber-50/90 border-amber-200/80 text-slate-800'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-xs sm:text-sm font-black tracking-[0.22em] truncate">
              {formattedMask || wordMask}
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              <span
                className={`px-1.5 py-0.5 rounded font-mono text-[11px] font-black ${
                  isNesRetro ? 'bg-black/35 text-white' : 'bg-slate-900/10 dark:bg-white/10'
                }`}
              >
                {englishLength || wordHintEnglish.length}
              </span>
              {timerMode === 'GENEROUS_TIMER' && typeof remainingSecDisplay === 'number' ? (
                <span className="font-mono text-xs sm:text-sm font-black px-1.5 py-0.5 rounded bg-black/30">
                  {remainingSecDisplay}
                </span>
              ) : (
                <span className="font-mono text-xs sm:text-sm font-black px-1.5 py-0.5 rounded bg-black/30">
                  ∞
                </span>
              )}
            </div>
          </div>

          {isNesRetro && (
            <div className="border-t border-white/35 pt-1 flex items-center justify-between font-mono text-[10px] sm:text-[11px] font-black tracking-tight overflow-hidden select-none">
              {ALPHABET_STRIP.split('').map((ch) => {
                const isHintHit = ch === revealedUpperFirst || ch === revealedUpperSecond;
                return (
                  <span
                    key={ch}
                    className={
                      isHintHit
                        ? 'text-yellow-300 scale-125 -translate-y-0.5 transition-transform drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]'
                        : 'text-white/75'
                    }
                  >
                    {ch}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
