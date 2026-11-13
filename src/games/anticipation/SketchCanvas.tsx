import React, { useEffect, useRef, useState } from 'react';
import { Volume2, Sparkles, PenTool } from 'lucide-react';
import { useClassroom } from '@/context/ClassroomContext';
import { useLanguage } from '@/context/LanguageContext';
import { RubyText } from '@/components/common/RubyText';
import { getServerTime } from '@/services/rtdbSafe';
import { generateSketchVector, SketchVectorData } from './sketchVectorizer';
import { AnticipationRevealedCard } from './types';

interface SketchCanvasProps {
  wordId: string;
  wordHintEnglish: string; // Used ONLY internally as vector fallback seed; NEVER rendered until isRevealed!
  categoryKey: string;
  categoryNameEn: string;
  categoryNameJa: string;
  imageUrl?: string | null;
  drawStyle: 'INK_SKETCH' | 'CONNECT_DOTS';
  roundStartTime: number;
  drawDurationMs: number;
  isRevealed: boolean;
  revealedCard?: AnticipationRevealedCard;
  compact?: boolean;
  wordMask?: string;
  englishLength?: number;
  isFeatureDots?: boolean;
  onPlayAudio?: (soundFile?: string, fallbackText?: string) => void;
  paused?: boolean;
  progressOverride?: number;
  useLocalClock?: boolean;
}

export const SketchCanvas: React.FC<SketchCanvasProps> = ({
  wordId,
  wordHintEnglish,
  categoryKey,
  categoryNameEn,
  categoryNameJa,
  imageUrl,
  drawStyle,
  roundStartTime,
  drawDurationMs,
  isRevealed,
  revealedCard,
  compact = false,
  wordMask,
  englishLength,
  isFeatureDots = false,
  onPlayAudio,
  paused = false,
  progressOverride,
  useLocalClock = false,
}) => {
  const { theme } = useClassroom();
  const { t, language } = useLanguage();
  const isDark = theme === 'dark';

  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const vectorRef = useRef<SketchVectorData | null>(null);
  const [vectorVersion, setVectorVersion] = useState(0);
  const [progressPct, setProgressPct] = useState(0);
  const [imgFailed, setImgFailed] = useState(false);

  // Load vector sketch geometry whenever the round/image changes
  useEffect(() => {
    let active = true;
    setImgFailed(false);
    vectorRef.current = null;
    generateSketchVector(
      { id: wordId, english: wordHintEnglish, category: categoryKey as any },
      imageUrl
    ).then((vec) => {
      if (!active) return;
      vectorRef.current = vec;
      setVectorVersion((v) => v + 1);
    });
    return () => {
      active = false;
    };
  }, [wordId, wordHintEnglish, categoryKey, imageUrl]);

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

  // Main animation loop for progressive Ink Sketch / Connect-the-Dots rendering
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
              Math.min(1, (nowMs - (roundStartTime || nowMs)) / Math.max(2000, drawDurationMs))
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

        // 1. Background sketchbook / cyanotype blueprint paper
        ctx.fillStyle = isDark ? '#0c1526' : '#fcfaf2';
        ctx.fillRect(0, 0, w, h);

        // Subtle grid pattern
        ctx.strokeStyle = isDark ? 'rgba(56, 189, 248, 0.08)' : 'rgba(148, 163, 184, 0.18)';
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

        if (vec) {
          const pad = compact ? 16 : 24;
          const drawSize = Math.min(w - pad * 2, h - pad * 2);
          const offX = (w - drawSize) / 2;
          const offY = (h - drawSize) / 2;
          const toX = (nx: number) => offX + nx * drawSize;
          const toY = (ny: number) => offY + ny * drawSize;

          let nibPos: { x: number; y: number } | null = null;

          if (drawStyle === 'CONNECT_DOTS' && vec.dots.length >= 3) {
            const dots = vec.dots;
            const segCount = dots.length - 1;
            const linePhase = Math.min(1, rawProgress / 0.85);
            const targetSegFloat = linePhase * segCount;
            const fullSegs = Math.floor(targetSegFloat);
            const partialT = targetSegFloat - fullSegs;

            // Connect completed dot-to-dot segments
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.strokeStyle = isDark ? '#38bdf8' : '#1e293b';
            ctx.lineWidth = compact ? 2.6 : 3.8;
            ctx.beginPath();
            if (dots.length > 0) {
              ctx.moveTo(toX(dots[0].x), toY(dots[0].y));
              for (let i = 1; i <= Math.min(fullSegs, segCount); i++) {
                ctx.lineTo(toX(dots[i].x), toY(dots[i].y));
              }
              if (fullSegs < segCount && partialT > 0.01) {
                const a = dots[fullSegs];
                const b = dots[fullSegs + 1];
                const px = toX(a.x + (b.x - a.x) * partialT);
                const py = toY(a.y + (b.y - a.y) * partialT);
                ctx.lineTo(px, py);
                nibPos = { x: px, y: py };
              } else if (fullSegs <= segCount) {
                nibPos = { x: toX(dots[fullSegs].x), y: toY(dots[fullSegs].y) };
              }
            }
            ctx.stroke();

            // After 82% progress, layer in underlying fine contour strokes cleanly
            if (rawProgress > 0.82) {
              const detailAlpha = Math.min(0.65, ((rawProgress - 0.82) / 0.18) * 0.65);
              ctx.strokeStyle = isDark
                ? `rgba(251, 191, 36, ${detailAlpha})`
                : `rgba(79, 70, 229, ${detailAlpha})`;
              ctx.lineWidth = compact ? 1.5 : 2.2;
              for (const s of vec.strokes) {
                if (s.length < 2) continue;
                ctx.beginPath();
                ctx.moveTo(toX(s[0].x), toY(s[0].y));
                for (let k = 1; k < s.length; k++) {
                  ctx.lineTo(toX(s[k].x), toY(s[k].y));
                }
                ctx.stroke();
              }
            }

            // Draw numbered dots 1..N (only show as many dots as make clear sense; show all up front by 15% progress)
            const visibleDotCount = Math.min(
              dots.length,
              Math.max(3, Math.ceil(dots.length * Math.min(1, 0.25 + rawProgress * 1.1)))
            );
            for (let i = 0; i < visibleDotCount; i++) {
              const pt = dots[i];
              const dx = toX(pt.x);
              const dy = toY(pt.y);
              const reached = i <= fullSegs;
              const isActiveDot = i === Math.min(dots.length - 1, fullSegs + 1);

              ctx.beginPath();
              ctx.arc(dx, dy, compact ? 7 : 10, 0, Math.PI * 2);
              ctx.fillStyle = reached
                ? isDark
                  ? '#f59e0b'
                  : '#4f46e5'
                : isActiveDot
                ? '#f43f5e'
                : isDark
                ? '#1e293b'
                : '#ffffff';
              ctx.fill();
              ctx.lineWidth = 1.8;
              ctx.strokeStyle = reached
                ? isDark
                  ? '#fef3c7'
                  : '#312e81'
                : isDark
                ? '#38bdf8'
                : '#64748b';
              ctx.stroke();

              if (!compact || i % 2 === 0 || isActiveDot || reached) {
                ctx.fillStyle = reached || isActiveDot ? '#ffffff' : isDark ? '#e2e8f0' : '#0f172a';
                ctx.font = `900 ${compact ? 8 : 10}px ui-monospace, SFMono-Regular, monospace`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(String(i + 1), dx, dy + 0.5);
              }
            }
          } else {
            // INK_SKETCH progressive cumulative arc-length reveal
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

            let budget = totalLen * rawProgress;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.lineWidth = compact ? 2.6 : 3.8;
            ctx.strokeStyle = isDark ? '#f8fafc' : '#0f172a';

            for (let si = 0; si < vec.strokes.length; si++) {
              if (budget <= 0) break;
              const s = vec.strokes[si];
              if (s.length < 2) continue;

              const slen = lengths[si];
              ctx.beginPath();
              ctx.moveTo(toX(s[0].x), toY(s[0].y));

              if (budget >= slen) {
                for (let k = 1; k < s.length; k++) {
                  ctx.lineTo(toX(s[k].x), toY(s[k].y));
                }
                nibPos = { x: toX(s[s.length - 1].x), y: toY(s[s.length - 1].y) };
                budget -= slen;
              } else {
                let rem = budget;
                for (let k = 1; k < s.length; k++) {
                  const segLen = Math.hypot(s[k].x - s[k - 1].x, s[k].y - s[k - 1].y);
                  if (rem >= segLen) {
                    ctx.lineTo(toX(s[k].x), toY(s[k].y));
                    rem -= segLen;
                    nibPos = { x: toX(s[k].x), y: toY(s[k].y) };
                  } else {
                    const frac = segLen > 1e-6 ? rem / segLen : 0;
                    const px = toX(s[k - 1].x + (s[k].x - s[k - 1].x) * frac);
                    const py = toY(s[k - 1].y + (s[k].y - s[k - 1].y) * frac);
                    ctx.lineTo(px, py);
                    nibPos = { x: px, y: py };
                    break;
                  }
                }
                budget = 0;
              }
              ctx.stroke();
            }
          }

          // Animated drawing pen nib while drawing is active
          if (!isRevealed && rawProgress < 0.995 && nibPos) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(nibPos.x, nibPos.y, compact ? 4.5 : 6, 0, Math.PI * 2);
            ctx.fillStyle = '#f59e0b';
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = isDark ? '#ffffff' : '#0f172a';
            ctx.stroke();

            // Pen body angle silhouette
            ctx.beginPath();
            ctx.moveTo(nibPos.x + 2, nibPos.y - 2);
            ctx.lineTo(nibPos.x + (compact ? 14 : 22), nibPos.y - (compact ? 18 : 26));
            ctx.lineWidth = compact ? 4 : 6;
            ctx.lineCap = 'round';
            ctx.strokeStyle = isDark ? '#38bdf8' : '#4f46e5';
            ctx.stroke();
            ctx.restore();
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
  }, [drawStyle, roundStartTime, drawDurationMs, isRevealed, paused, progressOverride, useLocalClock, isDark, compact, vectorVersion]);

  const showHintChips = !compact && !isRevealed;
  const revealUrl = revealedCard?.imageUrl || imageUrl;

  return (
    <div
      className={`relative w-full h-full flex flex-col rounded-3xl overflow-hidden border-4 shadow-xl transition-colors ${
        isDark
          ? 'bg-slate-900 border-slate-700'
          : 'bg-[#fcfaf2] border-amber-200'
      }`}
    >
      {/* Top Sketchboard Bar */}
      <div
        className={`flex items-center justify-between gap-2 px-3 py-1.5 border-b shrink-0 flex-nowrap ${
          isDark ? 'bg-slate-900/95 border-slate-800 text-slate-200' : 'bg-amber-50/90 border-amber-200/80 text-slate-800'
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className={`px-2 py-0.5 rounded-lg text-[11px] font-black flex items-center gap-1 whitespace-nowrap shrink-0 ${
              drawStyle === 'CONNECT_DOTS'
                ? 'bg-indigo-600 text-white'
                : 'bg-amber-500 text-slate-950'
            }`}
          >
            {drawStyle === 'CONNECT_DOTS' ? (
              <>
                <Sparkles size={11} />
                <span>{t('Connect Dots', 'てんつなぎ')}</span>
              </>
            ) : (
              <>
                <PenTool size={11} />
                <span>{t('Ink Sketch', 'スケッチ')}</span>
              </>
            )}
          </span>
          {isFeatureDots && (
            <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-rose-500 text-white whitespace-nowrap shrink-0">
              ★ BONUS
            </span>
          )}
          <span className="text-xs font-black truncate opacity-85">
            {language === 'ja' ? categoryNameJa : categoryNameEn}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-nowrap">
          <span className="font-mono text-xs font-black px-2 py-0.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
            {isRevealed ? '100%' : `${progressPct}%`}
          </span>
        </div>
      </div>

      {/* Main Canvas Stage */}
      <div ref={containerRef} className="relative flex-1 min-h-0 w-full">
        <canvas ref={canvasRef} className="w-full h-full block" />

        {/* Reveal Full-Color Flashcard Overlay */}
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
                      <RubyText ruby={revealedCard.ruby!} kanji={revealedCard.ja_kanji} hiragana={revealedCard.ja_hiragana} />
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

      {/* Dedicated Bottom Word-Length Mask Bar (keeps top category badge clean & untruncated) */}
      {showHintChips && wordMask && (
        <div
          className={`px-3 py-1.5 border-t flex items-center justify-center gap-2 shrink-0 ${
            isDark
              ? 'bg-slate-900/95 border-slate-800 text-slate-200'
              : 'bg-amber-50/90 border-amber-200/80 text-slate-800'
          }`}
        >
          <span className="font-mono text-xs sm:text-sm font-black tracking-widest truncate">
            {wordMask}
          </span>
          <span className="px-2 py-0.5 rounded-md bg-slate-900/10 dark:bg-white/10 font-mono text-[11px] font-black shrink-0">
            {englishLength || wordHintEnglish.length}
          </span>
        </div>
      )}
    </div>
  );
};
