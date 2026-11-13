import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { X, Play, RotateCcw, Volume2, VolumeX, Sparkles, Check, Speech, Sun, Moon } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useClassroom } from '@/context/ClassroomContext';
import { useLanguage } from '@/context/LanguageContext';
import { useAudio } from '@/context/AudioContext';
import { soundEffects } from '@/services/soundEffects';
import { speechService } from '@/services/speechService';
import { getClassSize } from '@/types/roster';

type DrawMode = 'WHEEL' | 'SLOT' | 'STICKS';

const WHEEL_COLORS = [
  '#2563eb', // royal blue
  '#059669', // emerald
  '#d97706', // amber
  '#dc2626', // red
  '#7c3aed', // violet
  '#0891b2', // cyan
  '#ea580c', // orange
  '#db2777', // pink
  '#0d9488', // teal
  '#4f46e5', // indigo
];

// Fanned natural tilt angles for the 14 decorative sticks in the jar
const STICK_TILT_ANGLES = [-18, -15, -12, -9, -6, -3, 0, 3, 6, 9, 12, 15, 18, -10];

export const StudentDrawModal: React.FC = () => {
  const { isPickerModalOpen, closePickerModal, theme, toggleTheme, activeSchool, activeClassId, activeTeacherProfile } = useClassroom();
  const { language } = useLanguage();
  const { isMuted, toggleMute, playPop } = useAudio();

  // Independent Text & Spoken Voice Languages
  const [textLang, setTextLang] = useState<'en' | 'ja'>(language);
  const [voiceLang, setVoiceLang] = useState<'en' | 'ja'>('ja');
  const [isVoiceEnabled, setIsVoiceEnabled] = useState<boolean>(true);

  // Sync textLang when app language changes externally
  useEffect(() => {
    setTextLang(language);
  }, [language]);

  // Local bilingual helper supporting JSX nodes (e.g. ruby furigana)
  const t = useCallback((en: React.ReactNode, ja: React.ReactNode) => {
    return textLang === 'ja' ? ja : en;
  }, [textLang]);

  // Configuration - auto-bound to current class capacity
  const [mode, setMode] = useState<DrawMode>('WHEEL');
  const [maxStudents, setMaxStudents] = useState<number>(() => getClassSize(activeSchool, activeClassId));
  const [includeTeacher, setIncludeTeacher] = useState<boolean>(true);
  const [excludedNumbers, setExcludedNumbers] = useState<string[]>([]);

  // Sync maxStudents when class changes
  useEffect(() => {
    const size = getClassSize(activeSchool, activeClassId);
    if (size) setMaxStudents(size);
  }, [activeSchool, activeClassId]);

  // Animation States
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [selectedNumber, setSelectedNumber] = useState<string | null>(null);
  const [showResultBanner, setShowResultBanner] = useState<boolean>(false);

  // Wheel specific
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentRotationRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);
  const [pointerDeflect, setPointerDeflect] = useState<boolean>(false);

  // Slot specific
  const [slotDisplayIndex, setSlotDisplayIndex] = useState<number>(0);
  const [isLeverPulled, setIsLeverPulled] = useState<boolean>(false);

  // Sticks specific
  const [isStickRising, setIsStickRising] = useState<boolean>(false);
  const [rattleTick, setRattleTick] = useState<number>(0);

  // Active pool calculation (00 + 1..maxStudents, excluding already removed)
  const fullRoster = useMemo(() => {
    const list: string[] = [];
    if (includeTeacher) {
      list.push('00');
    }
    for (let i = 1; i <= maxStudents; i++) {
      list.push(String(i));
    }
    return list;
  }, [includeTeacher, maxStudents]);

  const activePool = useMemo(() => {
    return fullRoster.filter(num => !excludedNumbers.includes(num));
  }, [fullRoster, excludedNumbers]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isPickerModalOpen && !isSpinning) {
        closePickerModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPickerModalOpen, isSpinning, closePickerModal]);

  // Victory celebration & independent bilingual speech announcer
  const triggerVictory = useCallback((winner: string) => {
    if (winner === '00') {
      soundEffects.playFanfare();
      confetti({
        particleCount: 130,
        spread: 100,
        origin: { y: 0.55 },
        colors: ['#f59e0b', '#fbbf24', '#ef4444', '#3b82f6', '#10b981'],
        zIndex: 9999,
      });
    } else {
      soundEffects.playCorrect();
      confetti({
        particleCount: 85,
        spread: 80,
        origin: { y: 0.55 },
        zIndex: 9999,
      });
    }

    if (isVoiceEnabled && !isMuted) {
      let voiceText = '';
      if (voiceLang === 'ja') {
        if (winner === '00') {
          const tName = activeTeacherProfile?.jaName || '先生';
          voiceText = `まさかの00番！${tName}の番です！`;
        } else {
          voiceText = `出席番号 ${winner} 番！`;
        }
      } else {
        if (winner === '00') {
          const tName = activeTeacherProfile?.name || 'Teacher';
          voiceText = `Number 00! ${tName}'s turn!`;
        } else {
          voiceText = `Attendance number ${winner}!`;
        }
      }

      setTimeout(() => {
        speechService.speak(voiceText, {
          lang: voiceLang === 'ja' ? 'ja-JP' : 'en-US',
          rate: voiceLang === 'ja' ? 0.96 : 0.94,
          pitch: voiceLang === 'ja' ? 1.02 : 1.04,
        });
      }, 150);
    }
  }, [isVoiceEnabled, isMuted, voiceLang]);

  // 1. Draw High-Roller Casino Prize Wheel on Canvas
  const drawWheel = useCallback((rotationAngle: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 400;
    const height = 400;
    const centerX = 200;
    const centerY = 200;
    const outerRadius = 184;
    const rimWidth = 18;
    const sliceRadius = outerRadius - rimWidth;

    ctx.clearRect(0, 0, width, height);

    if (activePool.length === 0) {
      // Empty Pool Display
      ctx.beginPath();
      ctx.arc(centerX, centerY, sliceRadius, 0, 2 * Math.PI);
      ctx.fillStyle = '#1e293b';
      ctx.fill();
      ctx.fillStyle = '#94a3b8';
      ctx.font = "bold 16px 'UD Digi Kyokasho NP-R', 'BIZ UDPGothic', sans-serif";
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(textLang === 'ja' ? '候補がいません' : 'Pool Empty', centerX, centerY);
      return;
    }

    const sliceAngle = (2 * Math.PI) / activePool.length;

    // A. Draw Individual Slices with Radial Shading
    for (let i = 0; i < activePool.length; i++) {
      const num = activePool[i];
      const startAngle = rotationAngle + i * sliceAngle;
      const endAngle = startAngle + sliceAngle;

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, sliceRadius, startAngle, endAngle);
      ctx.closePath();

      if (num === '00') {
        // Teacher 00 Special Golden Foil Wedge
        const goldSliceGrad = ctx.createRadialGradient(centerX, centerY, 15, centerX, centerY, sliceRadius);
        goldSliceGrad.addColorStop(0, '#fef08a');
        goldSliceGrad.addColorStop(0.4, '#f59e0b');
        goldSliceGrad.addColorStop(1, '#92400e');
        ctx.fillStyle = goldSliceGrad;
      } else {
        const baseColor = WHEEL_COLORS[i % WHEEL_COLORS.length];
        const sliceGrad = ctx.createRadialGradient(centerX, centerY, 15, centerX, centerY, sliceRadius);
        sliceGrad.addColorStop(0, '#ffffff35');
        sliceGrad.addColorStop(0.3, baseColor);
        sliceGrad.addColorStop(1, baseColor);
        ctx.fillStyle = sliceGrad;
      }
      ctx.fill();

      // Delicate divider line between wedges
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.stroke();

      // Slice Numbers / Text
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(startAngle + sliceAngle / 2);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
      ctx.shadowBlur = 4;

      if (num === '00') {
        ctx.fillStyle = '#ffffff';
        ctx.font = "900 13px 'UD Digi Kyokasho NP-R', 'BIZ UDPGothic', sans-serif";
        ctx.fillText(`${activeTeacherProfile?.avatar || '👨‍🏫'} 00`, sliceRadius - 16, 0);
      } else {
        ctx.fillStyle = '#ffffff';
        const fontSize = activePool.length > 32 ? 11 : activePool.length > 24 ? 13 : 15;
        ctx.font = `900 ${fontSize}px 'UD Digi Kyokasho NP-R', 'BIZ UDPGothic', sans-serif`;
        ctx.fillText(num, sliceRadius - 18, 0);
      }
      ctx.restore();

      // Outer Chrome Peg Pin along slice perimeter
      const pegX = centerX + (sliceRadius - 2) * Math.cos(startAngle);
      const pegY = centerY + (sliceRadius - 2) * Math.sin(startAngle);
      ctx.beginPath();
      ctx.arc(pegX, pegY, 3, 0, 2 * Math.PI);
      ctx.fillStyle = '#f8fafc';
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#475569';
      ctx.stroke();
    }

    // B. Outer Metallic Gold Bezel Rim
    ctx.beginPath();
    ctx.arc(centerX, centerY, outerRadius, 0, 2 * Math.PI);
    ctx.lineWidth = rimWidth;
    const goldGrad = ctx.createLinearGradient(0, 0, width, height);
    goldGrad.addColorStop(0, '#78350f');
    goldGrad.addColorStop(0.2, '#fef08a');
    goldGrad.addColorStop(0.4, '#b45309');
    goldGrad.addColorStop(0.6, '#fde047');
    goldGrad.addColorStop(0.8, '#d97706');
    goldGrad.addColorStop(1, '#78350f');
    ctx.strokeStyle = goldGrad;
    ctx.stroke();

    // Dark trim borders for metallic depth
    ctx.beginPath();
    ctx.arc(centerX, centerY, outerRadius + rimWidth / 2, 0, 2 * Math.PI);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#451a03';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(centerX, centerY, sliceRadius, 0, 2 * Math.PI);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#451a03';
    ctx.stroke();

    // C. 24 LED Marquee Bulbs around the Outer Rim
    const bulbTrackRadius = outerRadius;
    const numBulbs = 24;
    for (let b = 0; b < numBulbs; b++) {
      const bAngle = (b / numBulbs) * 2 * Math.PI;
      const bx = centerX + bulbTrackRadius * Math.cos(bAngle);
      const by = centerY + bulbTrackRadius * Math.sin(bAngle);

      const isLit = (Math.floor(rotationAngle * 10) + b) % 2 === 0;

      ctx.save();
      ctx.beginPath();
      ctx.arc(bx, by, 3.8, 0, 2 * Math.PI);
      ctx.fillStyle = isLit ? '#fef08a' : '#b45309';
      if (isLit) {
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 8;
      }
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = isLit ? '#ffffff' : '#78350f';
      ctx.stroke();
      ctx.restore();
    }

    // D. 3D Center Hub with Metallic Screws & Amber Jewel Dome
    const hubOuter = 34;
    ctx.beginPath();
    ctx.arc(centerX, centerY, hubOuter, 0, 2 * Math.PI);
    const hubGrad = ctx.createLinearGradient(centerX - hubOuter, centerY - hubOuter, centerX + hubOuter, centerY + hubOuter);
    hubGrad.addColorStop(0, '#fef08a');
    hubGrad.addColorStop(0.4, '#b45309');
    hubGrad.addColorStop(1, '#78350f');
    ctx.fillStyle = hubGrad;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#451a03';
    ctx.stroke();

    // 6 Chrome Screw Rivets
    for (let s = 0; s < 6; s++) {
      const sAngle = (s / 6) * 2 * Math.PI;
      const sx = centerX + 28 * Math.cos(sAngle);
      const sy = centerY + 28 * Math.sin(sAngle);
      ctx.beginPath();
      ctx.arc(sx, sy, 2, 0, 2 * Math.PI);
      ctx.fillStyle = '#f1f5f9';
      ctx.fill();
    }

    // Inner 3D Glass Jewel Cabochon
    const gemRadius = 23;
    ctx.beginPath();
    ctx.arc(centerX, centerY, gemRadius, 0, 2 * Math.PI);
    const gemGrad = ctx.createRadialGradient(centerX - 5, centerY - 5, 2, centerX, centerY, gemRadius);
    gemGrad.addColorStop(0, '#fef08a');
    gemGrad.addColorStop(0.3, '#f59e0b');
    gemGrad.addColorStop(0.8, '#b45309');
    gemGrad.addColorStop(1, '#451a03');
    ctx.fillStyle = gemGrad;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#fef08a';
    ctx.stroke();

    // Specular Light Highlight Oval
    ctx.beginPath();
    ctx.ellipse(centerX - 6, centerY - 6, 7, 3.5, -Math.PI / 4, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.fill();

    // Center Gold Star
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 3;
    ctx.fillText('★', centerX, centerY + 1);
  }, [activePool, textLang]);

  // Redraw when modal opens or pool updates
  useEffect(() => {
    if (isPickerModalOpen && mode === 'WHEEL') {
      drawWheel(currentRotationRef.current);
    }
  }, [isPickerModalOpen, mode, drawWheel]);

  // Wheel Spin Execution
  const spinWheel = useCallback(() => {
    if (isSpinning || activePool.length === 0) return;

    setIsSpinning(true);
    setShowResultBanner(false);

    const winnerIndex = Math.floor(Math.random() * activePool.length);
    const winnerNumber = activePool[winnerIndex];

    const sliceAngle = (2 * Math.PI) / activePool.length;
    const pointerAngle = 1.5 * Math.PI; // 12 o'clock
    const winnerSliceCenter = winnerIndex * sliceAngle + sliceAngle / 2;

    const startAngle = currentRotationRef.current;
    const fullSpins = (5 + Math.floor(Math.random() * 2)) * 2 * Math.PI;
    const jitter = (Math.random() - 0.5) * (sliceAngle * 0.5);

    const targetDelta = pointerAngle - (startAngle % (2 * Math.PI)) - winnerSliceCenter + fullSpins + jitter;
    const endAngle = startAngle + targetDelta;

    const duration = 2700;
    const startTime = performance.now();
    let lastSliceIdx = -1;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const currentAngle = startAngle + (endAngle - startAngle) * easeProgress;
      currentRotationRef.current = currentAngle;

      drawWheel(currentAngle);

      // Sound click & pointer flapper deflection
      const normalizedAngle = (pointerAngle - (currentAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      const currentSliceIdx = Math.floor(normalizedAngle / sliceAngle) % activePool.length;

      if (currentSliceIdx !== lastSliceIdx) {
        lastSliceIdx = currentSliceIdx;
        const clickPitch = 600 + Math.floor((1 - progress) * 260);
        soundEffects.playWheelClick(clickPitch);
        setPointerDeflect(true);
        setTimeout(() => setPointerDeflect(false), 55);
      }

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        setIsSpinning(false);
        setSelectedNumber(winnerNumber);
        setShowResultBanner(true);
        triggerVictory(winnerNumber);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  }, [isSpinning, activePool, drawWheel, triggerVictory]);

  // Slot Reel Execution
  const spinSlot = useCallback(() => {
    if (isSpinning || activePool.length === 0) return;

    setIsSpinning(true);
    setShowResultBanner(false);
    setIsLeverPulled(true);
    setTimeout(() => setIsLeverPulled(false), 350);

    const winnerIndex = Math.floor(Math.random() * activePool.length);
    const winnerNumber = activePool[winnerIndex];

    const totalPoolCount = activePool.length;
    const totalSteps = 36 + ((winnerIndex - (slotDisplayIndex % totalPoolCount) + totalPoolCount) % totalPoolCount);
    const duration = 2600;
    const startTime = performance.now();
    let lastStep = -1;

    const animateSlot = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 4);
      const currentStep = Math.floor(totalSteps * easeProgress);

      if (currentStep !== lastStep) {
        lastStep = currentStep;
        setSlotDisplayIndex(prev => (prev + 1) % totalPoolCount);
        const pitch = 560 + Math.floor((1 - progress) * 300);
        soundEffects.playWheelClick(pitch);
      }

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animateSlot);
      } else {
        setSlotDisplayIndex(winnerIndex);
        setIsSpinning(false);
        setSelectedNumber(winnerNumber);
        setShowResultBanner(true);
        triggerVictory(winnerNumber);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animateSlot);
  }, [isSpinning, activePool, slotDisplayIndex, triggerVictory]);

  // Popsicle Sticks Execution
  const spinSticks = useCallback(() => {
    if (isSpinning || activePool.length === 0) return;

    setIsSpinning(true);
    setShowResultBanner(false);
    setIsStickRising(false);

    const winnerIndex = Math.floor(Math.random() * activePool.length);
    const winnerNumber = activePool[winnerIndex];

    soundEffects.playDiceRattle();

    // Rattle interval
    let tickCount = 0;
    const rattleInterval = setInterval(() => {
      tickCount++;
      setRattleTick(prev => (prev + 1) % 4);
      soundEffects.playTick();
      if (tickCount > 7) {
        clearInterval(rattleInterval);
        setIsStickRising(true);
        soundEffects.playWheelClick(850);
      }
    }, 120);

    // Conclude draw at 2100ms
    setTimeout(() => {
      setIsSpinning(false);
      setSelectedNumber(winnerNumber);
      setShowResultBanner(true);
      triggerVictory(winnerNumber);
    }, 2100);
  }, [isSpinning, activePool, triggerVictory]);

  // Master spin trigger
  const handleStartSpin = () => {
    playPop();
    if (mode === 'WHEEL') {
      spinWheel();
    } else if (mode === 'SLOT') {
      spinSlot();
    } else {
      spinSticks();
    }
  };

  // Post-spin Action 1: Remove picked number & immediately spin again
  const handleRemoveAndSpinAgain = () => {
    if (!selectedNumber) return;
    playPop();
    const nextExcluded = [...excludedNumbers, selectedNumber];
    setExcludedNumbers(nextExcluded);
    setSelectedNumber(null);
    setShowResultBanner(false);
    setIsStickRising(false);

    const nextPool = fullRoster.filter(num => !nextExcluded.includes(num));
    if (nextPool.length > 0) {
      setTimeout(() => {
        if (mode === 'WHEEL') spinWheel();
        else if (mode === 'SLOT') spinSlot();
        else spinSticks();
      }, 100);
    }
  };

  // Post-spin Action 2: Keep number in pool & spin again
  const handleKeepAndSpinAgain = () => {
    playPop();
    setSelectedNumber(null);
    setShowResultBanner(false);
    setIsStickRising(false);
    setTimeout(() => {
      if (mode === 'WHEEL') spinWheel();
      else if (mode === 'SLOT') spinSlot();
      else spinSticks();
    }, 100);
  };

  // Reset entire pool (restore everyone)
  const handleResetPool = () => {
    playPop();
    setExcludedNumbers([]);
    setSelectedNumber(null);
    setShowResultBanner(false);
    setIsStickRising(false);
  };

  // Clean up animation on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  if (!isPickerModalOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={() => {
        if (!isSpinning) closePickerModal();
      }}
    >
      <div
        className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl max-w-md md:max-w-4xl w-full p-3 sm:p-5 shadow-2xl flex flex-col relative select-none my-auto max-h-[95dvh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5 mb-3 min-h-[46px] gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0 flex-1 pr-1">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-400 to-orange-500 text-white flex items-center justify-center shadow-md shrink-0">
              <span className="text-xl">🎯</span>
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight leading-tight truncate">
                <span>
                  {t(
                    'Student Picker',
                    <>
                      <ruby>出席番号<rt>しゅっせきばんごう</rt></ruby>くじ
                    </>
                  )}
                </span>
              </h2>
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 leading-tight truncate hidden xs:block">
                {t(
                  'Random student number drawer (1–35 + Sensei 00)',
                  <>
                    ランダム<ruby>出席番号<rt>しゅっせきばんごう</rt></ruby>＆<ruby>先生<rt>せんせい</rt></ruby>00<ruby>番<rt>ばん</rt></ruby>チャレンジ
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 flex-nowrap">
            {/* 1. Independent Text Language Toggle */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200/80 dark:border-slate-700/80 text-[10px]">
              <span className="text-[10px] text-slate-400 px-1 font-bold select-none" title="Text Language (表示言語)">文</span>
              <button
                onClick={() => { playPop(); setTextLang('en'); }}
                className={`px-1.5 py-0.5 rounded-md font-black transition-all cursor-pointer ${
                  textLang === 'en'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                title="Text: English (表示: 英語)"
              >
                EN
              </button>
              <button
                onClick={() => { playPop(); setTextLang('ja'); }}
                className={`px-1.5 py-0.5 rounded-md font-black transition-all cursor-pointer ${
                  textLang === 'ja'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                title="Text: 日本語 (表示: 日本語)"
              >
                日
              </button>
            </div>

            {/* 2. Independent Voice Announcer Language & Power Toggle */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200/80 dark:border-slate-700/80 text-[10px]">
              <span className="text-slate-400 pl-1 pr-0.5 select-none" title="Spoken Voice Announcer (音声読み上げ)"><Speech size={11} /></span>
              <button
                onClick={() => { playPop(); setIsVoiceEnabled(true); setVoiceLang('en'); }}
                className={`px-1.5 py-0.5 rounded-md font-black transition-all cursor-pointer ${
                  isVoiceEnabled && voiceLang === 'en'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                title="Voice: English (音声: 英語)"
              >
                EN
              </button>
              <button
                onClick={() => { playPop(); setIsVoiceEnabled(true); setVoiceLang('ja'); }}
                className={`px-1.5 py-0.5 rounded-md font-black transition-all cursor-pointer ${
                  isVoiceEnabled && voiceLang === 'ja'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                title="Voice: 日本語 (音声: 日本語)"
              >
                日
              </button>
              <button
                onClick={() => { playPop(); setIsVoiceEnabled(false); }}
                className={`px-1 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                  !isVoiceEnabled
                    ? 'bg-slate-300 dark:bg-slate-600 text-slate-800 dark:text-slate-100 shadow-xs'
                    : 'text-slate-400 hover:text-rose-500'
                }`}
                title="Voice: Muted / OFF (音声オフ)"
              >
                OFF
              </button>
            </div>

            {/* 3. Theme Toggle: Sun / Moon */}
            <button
              onClick={() => { playPop(); toggleTheme(); }}
              className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center cursor-pointer transition-colors"
              title={theme === 'dark' ? 'Switch to Light Mode (ライトモード)' : 'Switch to Dark Mode (ダークモード)'}
            >
              {theme === 'dark' ? <Sun size={13} className="text-amber-400" /> : <Moon size={13} className="text-indigo-400" />}
            </button>

            {/* 4. Sound FX Mute Toggle */}
            <button
              onClick={toggleMute}
              className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center cursor-pointer"
              title={isMuted ? 'Unmute Sound Effects' : 'Mute Sound Effects'}
            >
              {isMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
            </button>

            {/* 5. Close Modal */}
            <button
              onClick={() => { playPop(); closePickerModal(); }}
              disabled={isSpinning}
              className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center disabled:opacity-50 cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Two-Column Landscape Body */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* LEFT WING: Visual Spinner / Slot / Sticks Stage */}
          <div className="md:col-span-7 h-[300px] sm:h-[340px] flex items-center justify-center relative overflow-hidden rounded-2xl bg-slate-50/70 dark:bg-slate-950/50 border border-slate-200/70 dark:border-slate-800/80">
            {mode === 'WHEEL' ? (
              /* Mode 1: High-Roller Casino Wheel */
              <div className="relative flex flex-col items-center justify-center scale-95 sm:scale-100">
                {/* 3D Flapper Pointer at 12 o'clock */}
                <div className="absolute -top-3.5 z-30 flex flex-col items-center filter drop-shadow-xl pointer-events-none">
                  <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-slate-400 via-slate-100 to-slate-400 border border-slate-600 shadow-md z-10 flex items-center justify-center">
                    <div className="w-2.5 h-0.5 bg-slate-600 rotate-45" />
                  </div>
                  <div
                    className={`-mt-2.5 transition-transform duration-75 origin-top ${
                      pointerDeflect ? '-rotate-12 scale-95' : 'rotate-0'
                    }`}
                  >
                    <div className="w-0 h-0 border-l-[13px] border-l-transparent border-r-[13px] border-r-transparent border-t-[30px] border-t-amber-400 filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" />
                    <div className="w-0 h-0 border-l-[9px] border-l-transparent border-r-[9px] border-r-transparent border-t-[22px] border-t-amber-200 -mt-[28px] mx-auto opacity-80" />
                  </div>
                </div>

                {/* Crisp Retina Canvas Wheel */}
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={400}
                  className="w-[280px] h-[280px] sm:w-[320px] sm:h-[320px] transition-transform"
                />
              </div>
            ) : mode === 'SLOT' ? (
              /* Mode 2: Vegas Arcade Slot Cabinet */
              <div className="w-full max-w-sm flex items-center justify-center gap-3 px-2">
                <div className="relative flex-1 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 rounded-3xl border-4 border-amber-400/90 shadow-[0_0_25px_rgba(245,158,11,0.25)] overflow-hidden">
                  {/* Vintage Marquee Header */}
                  <div className="h-7 bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-600 border-b-2 border-amber-300 flex items-center justify-between px-3 text-slate-950 font-black text-[10px] tracking-wider uppercase select-none shadow-sm">
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping" />
                      <span>LUCKY DRAW</span>
                    </span>
                    <span className="font-mono text-[11px] bg-slate-950 text-amber-400 px-1.5 py-0.5 rounded border border-amber-300">
                      777
                    </span>
                    <span className="flex items-center gap-1">
                      <span>ATTENDANCE</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping" />
                    </span>
                  </div>

                  {/* 3D Curved Cylindrical Reel Window */}
                  <div className="relative h-52 flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-slate-950 via-slate-950/85 to-transparent z-10 pointer-events-none" />
                    <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-950 via-slate-950/85 to-transparent z-10 pointer-events-none" />
                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-0.5 bg-gradient-to-r from-transparent via-white/20 to-transparent z-15 pointer-events-none" />

                    {/* Glowing Neon Center Payline Marker */}
                    <div className="absolute inset-x-2 h-18 border-y-2 border-amber-400 bg-amber-400/10 z-10 pointer-events-none flex items-center justify-between px-3 shadow-[0_0_15px_rgba(251,191,36,0.25)]">
                      <div className="flex items-center text-amber-400 text-sm font-black animate-pulse">
                        <span>▶</span>
                        <span className="-ml-1">▶</span>
                      </div>
                      <div className="flex items-center text-amber-400 text-sm font-black animate-pulse">
                        <span className="-mr-1">◀</span>
                        <span>◀</span>
                      </div>
                    </div>

                    {/* 5-Row Vertical Barrel Perspective */}
                    <div className="flex flex-col items-center justify-center">
                      {activePool.length > 0 ? (
                        (() => {
                          const count = activePool.length;
                          const p2 = (slotDisplayIndex - 2 + count) % count;
                          const p1 = (slotDisplayIndex - 1 + count) % count;
                          const cur = activePool[slotDisplayIndex];
                          const n1 = (slotDisplayIndex + 1) % count;
                          const n2 = (slotDisplayIndex + 2) % count;

                          return (
                            <div className="flex flex-col items-center justify-center gap-1.5">
                              <div className="opacity-20 scale-75 -translate-y-2 text-xl font-black text-slate-400 font-mono">
                                {activePool[p2] === '00' ? '👨‍🏫 00' : `#${activePool[p2]}`}
                              </div>
                              <div className="opacity-45 scale-90 text-2xl font-black text-slate-300 font-mono">
                                {activePool[p1] === '00' ? '👨‍🏫 00' : `#${activePool[p1]}`}
                              </div>
                              <div
                                className={`scale-105 font-black text-5xl sm:text-6xl font-mono py-0.5 flex items-center gap-2 ${
                                  cur === '00'
                                    ? 'text-amber-400 drop-shadow-[0_0_20px_rgba(245,158,11,0.9)]'
                                    : 'text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.6)]'
                                }`}
                              >
                                {cur === '00' ? (
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-3xl">👨‍🏫</span>
                                    <span>00</span>
                                  </div>
                                ) : (
                                  <span>#{cur}</span>
                                )}
                              </div>
                              <div className="opacity-45 scale-90 text-2xl font-black text-slate-300 font-mono">
                                {activePool[n1] === '00' ? '👨‍🏫 00' : `#${activePool[n1]}`}
                              </div>
                              <div className="opacity-20 scale-75 translate-y-2 text-xl font-black text-slate-400 font-mono">
                                {activePool[n2] === '00' ? '👨‍🏫 00' : `#${activePool[n2]}`}
                              </div>
                            </div>
                          );
                        })()
                      ) : (
                        <div className="text-slate-400 font-bold text-sm">Pool Empty</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Physical Chrome Pull Lever on Right */}
                <div className="flex flex-col items-center justify-center pt-6">
                  <button
                    onClick={!isSpinning ? handleStartSpin : undefined}
                    disabled={isSpinning || activePool.length === 0}
                    className={`group flex flex-col items-center cursor-pointer transition-transform duration-200 select-none ${
                      isLeverPulled ? 'translate-y-6 rotate-6' : 'hover:-translate-y-1'
                    }`}
                    title={textLang === 'ja' ? 'レバーを引いて回す！' : 'Pull Lever to Draw!'}
                  >
                    <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-rose-700 via-rose-500 to-rose-300 border-2 border-rose-900 shadow-xl group-hover:scale-110 transition-transform relative">
                      <div className="absolute top-1 left-1.5 w-2 h-2 rounded-full bg-white/70 blur-[0.5px]" />
                    </div>
                    <div className="w-2.5 h-16 bg-gradient-to-r from-slate-400 via-slate-100 to-slate-400 border-x border-slate-500 shadow-sm" />
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-b from-slate-700 to-slate-900 border border-slate-600 shadow-md flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-slate-400" />
                    </div>
                  </button>
                </div>
              </div>
            ) : (
              /* Mode 3: Traditional Classroom Popsicle Sticks */
              <div className="w-full max-w-sm flex flex-col items-center justify-center relative">
                {/* Risen Winning Stick Display */}
                {isStickRising && selectedNumber && (
                  <div className="absolute -top-6 z-30 flex flex-col items-center animate-in zoom-in-90 slide-in-from-bottom-14 duration-500">
                    <div className="w-20 sm:w-24 h-48 sm:h-52 rounded-t-3xl rounded-b-lg bg-gradient-to-r from-[#d4af7e] via-[#f7e6ce] to-[#c29b68] border-2 border-[#8c5822] shadow-2xl flex flex-col items-center justify-between p-2 relative overflow-hidden">
                      <div className="absolute inset-0 bg-amber-900/5 mix-blend-multiply pointer-events-none" />
                      
                      {selectedNumber === '00' ? (
                        <>
                          <div className="w-full py-1 px-1 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-[10px] text-center shadow-xs truncate">
                            ⭐ {activeTeacherProfile?.jaName || 'SENSEI'} ⭐
                          </div>
                          <div className="flex flex-col items-center my-auto">
                            <span className="text-4xl mb-0.5">{activeTeacherProfile?.avatar || '👨‍🏫'}</span>
                            <span className="text-4xl sm:text-5xl font-black font-mono text-amber-900 drop-shadow-sm">00</span>
                          </div>
                          <div className="text-[10px] font-black text-amber-950 truncate max-w-full">
                            {t(
                              `${activeTeacherProfile?.name || 'Teacher'}'s Turn`,
                              <>
                                <span className="mr-0.5">{activeTeacherProfile?.jaName || '先生'}</span>の<ruby>番<rt>ばん</rt></ruby>
                              </>
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-full py-0.5 rounded-full bg-amber-900/10 text-amber-950 font-black text-[10px] text-center">
                            🌸 {t('ATTENDANCE', <><ruby>出席番号<rt>しゅっせきばんごう</rt></ruby></>)} 🌸
                          </div>
                          <div className="flex flex-col items-center my-auto">
                            <span className="text-[10px] font-bold text-amber-900/80 uppercase">Student</span>
                            <span className="text-4xl sm:text-5xl font-black font-mono text-amber-950 drop-shadow-xs">
                              #{selectedNumber}
                            </span>
                          </div>
                          <div className="text-[10px] font-black text-amber-950">
                            {t(`No. ${selectedNumber}`, <>{selectedNumber} <ruby>番<rt>ばん</rt></ruby></>)}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* The Ceramic Classroom Stick Jar with Fanned Wooden Sticks */}
                <div
                  className={`relative flex flex-col items-center transition-transform ${
                    isSpinning && !isStickRising ? 'animate-bounce' : ''
                  }`}
                  style={{
                    transform: isSpinning && !isStickRising ? `rotate(${(rattleTick - 1.5) * 2}deg)` : 'none',
                  }}
                >
                  {/* Fanned Sticks inside Jar */}
                  <div className="relative w-44 h-32 flex items-end justify-center overflow-visible">
                    {STICK_TILT_ANGLES.map((angle, idx) => {
                      const isGoldTip = idx === 6 && includeTeacher;
                      return (
                        <div
                          key={idx}
                          className="absolute bottom-0 w-6 h-28 rounded-t-xl border border-[#96632c]/60 shadow-sm transition-transform duration-300 origin-bottom"
                          style={{
                            transform: `rotate(${angle}deg) translateY(${Math.abs(angle) * 0.4}px)`,
                            background: isGoldTip
                              ? 'linear-gradient(to top, #c29b68 70%, #fbbf24 70%)'
                              : 'linear-gradient(to right, #d4af7e, #f7e6ce, #c29b68)',
                          }}
                        >
                          {isGoldTip && (
                            <div className="text-[8px] text-center font-bold text-amber-900 pt-0.5">
                              ★
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Ceramic Jar Front */}
                  <div className="relative -mt-6 w-36 sm:w-40 h-28 bg-gradient-to-b from-[#8c502b] via-[#6e371a] to-[#4a220e] border-t-4 border-amber-500/80 rounded-b-3xl rounded-t-sm shadow-2xl flex flex-col items-center justify-center p-2 z-10">
                    <div className="w-full py-1.5 rounded-lg bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-700/80 text-amber-900 dark:text-amber-200 font-black text-xs text-center shadow-inner flex items-center justify-center gap-1">
                      <span>🌸</span>
                      <span className="font-serif tracking-wider">
                        {t('Attendance', <><ruby>出席番号<rt>しゅっせきばんごう</rt></ruby></>)}
                      </span>
                      <span>🌸</span>
                    </div>
                    <div className="text-[10px] font-bold text-amber-300/80 mt-1 font-mono">
                      {activePool.length} {t('sticks', <><ruby>本<rt>ほん</rt></ruby></>)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT WING: Mode Config, Result Banner & Actions */}
          <div className="md:col-span-5 flex flex-col justify-between gap-2.5 h-full">
            {/* Mode Toggle & Settings Bar */}
            <div className="bg-slate-100 dark:bg-slate-800/60 p-2 rounded-2xl space-y-2 text-xs">
              {/* Row 1: Mode Switcher (3 Equal-Width Tabs) */}
              <div className="h-8 grid grid-cols-3 gap-1 bg-slate-200/80 dark:bg-slate-800 p-0.5 rounded-lg">
                <button
                  onClick={() => { playPop(); setMode('WHEEL'); }}
                  disabled={isSpinning}
                  className={`h-7 rounded-md text-[11px] font-black flex items-center justify-center gap-1 transition-all cursor-pointer whitespace-nowrap ${
                    mode === 'WHEEL'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>🎡</span>
                  <span className="truncate">{t('Wheel', 'ルーレット')}</span>
                </button>
                <button
                  onClick={() => { playPop(); setMode('SLOT'); }}
                  disabled={isSpinning}
                  className={`h-7 rounded-md text-[11px] font-black flex items-center justify-center gap-1 transition-all cursor-pointer whitespace-nowrap ${
                    mode === 'SLOT'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>🎰</span>
                  <span className="truncate">{t('Slot Reel', 'スロット')}</span>
                </button>
                <button
                  onClick={() => { playPop(); setMode('STICKS'); }}
                  disabled={isSpinning}
                  className={`h-7 rounded-md text-[11px] font-black flex items-center justify-center gap-1 transition-all cursor-pointer whitespace-nowrap ${
                    mode === 'STICKS'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>🥢</span>
                  <span className="truncate">
                    {t(
                      'Sticks',
                      <>
                        くじ<ruby>引<rt>び</rt></ruby>き<ruby>棒<rt>ぼう</rt></ruby>
                      </>
                    )}
                  </span>
                </button>
              </div>

              {/* Row 2: Roster Config (Class Size + Teacher 00) */}
              <div className="h-8 flex items-center justify-between gap-1.5">
                <div className="flex items-center bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 px-2 h-7 gap-1.5 shadow-xs">
                  <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 select-none whitespace-nowrap">
                    {t(
                      'Class:',
                      <>
                        <ruby>人数<rt>にんずう</rt></ruby>:
                      </>
                    )}
                  </span>
                  <button
                    onClick={() => { playPop(); setMaxStudents(prev => Math.max(15, prev - 1)); }}
                    disabled={isSpinning || maxStudents <= 15}
                    className="w-4 h-4 rounded hover:bg-slate-200 dark:hover:bg-slate-700 font-bold flex items-center justify-center text-xs disabled:opacity-30 cursor-pointer"
                  >
                    -
                  </button>
                  <span className="font-mono font-black text-slate-900 dark:text-white text-xs min-w-4 text-center">
                    {maxStudents}
                  </span>
                  <button
                    onClick={() => { playPop(); setMaxStudents(prev => Math.min(40, prev + 1)); }}
                    disabled={isSpinning || maxStudents >= 40}
                    className="w-4 h-4 rounded hover:bg-slate-200 dark:hover:bg-slate-700 font-bold flex items-center justify-center text-xs disabled:opacity-30 cursor-pointer"
                  >
                    +
                  </button>
                </div>

                <button
                  onClick={() => { playPop(); setIncludeTeacher(prev => !prev); }}
                  disabled={isSpinning}
                  className={`h-7 px-2 rounded-lg text-[10px] font-black flex items-center gap-1 border transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                    includeTeacher
                      ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 shadow-xs'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-400'
                  }`}
                  title={textLang === 'ja' ? '先生（00番）をくじに含める' : 'Include Teacher (00) in drawing pool'}
                >
                  <span>👨‍🏫 00</span>
                  {includeTeacher && <Check size={11} className="text-amber-600 dark:text-amber-400 stroke-[3]" />}
                </button>
              </div>
            </div>

            {/* Winner Announcement Slot (Fixed min-height in landscape to prevent stage jitter) */}
            <div className="min-h-[116px] flex flex-col justify-center">
              {showResultBanner && selectedNumber ? (
                <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 border-2 border-amber-400 dark:border-amber-500 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
                  {selectedNumber === '00' ? (
                    <>
                      <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 text-xs font-black uppercase tracking-wider mb-0.5">
                        <Sparkles size={13} className="animate-spin" />
                        <span>
                          {t(
                            'SPECIAL DRAW!',
                            <>
                              まさかの<ruby>先生<rt>せんせい</rt></ruby><ruby>指名<rt>しめい</rt></ruby>！
                            </>
                          )}
                        </span>
                        <Sparkles size={13} className="animate-spin" />
                      </div>
                      <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>{activeTeacherProfile?.avatar || '👨‍🏫'}</span>
                        <span>
                          {t(
                            `${activeTeacherProfile?.name || 'Teacher'}'s Turn!`,
                            <>
                              <span className="text-amber-500 mr-1">{activeTeacherProfile?.jaName || '先生'}</span>の<ruby>番<rt>ばん</rt></ruby>です！
                            </>
                          )}
                        </span>
                        <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black">
                          00
                        </span>
                      </div>
                      <p className="text-[11px] font-bold text-amber-700 dark:text-amber-300 mt-0.5">
                        {t(
                          `${activeTeacherProfile?.name || 'Sensei'} was picked! It's Teacher's turn!`,
                          <>
                            <span className="font-black text-amber-800 dark:text-amber-200 mr-1">{activeTeacherProfile?.jaName || '先生'}</span>が<ruby>選<rt>えら</rt></ruby>ばれました！
                          </>
                        )}
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                        {t(
                          'Selected Student',
                          <>
                            <ruby>指名<rt>しめい</rt></ruby>された<ruby>児童<rt>じどう</rt></ruby>
                          </>
                        )}
                      </div>
                      <div className="text-3xl sm:text-4xl font-black text-blue-600 dark:text-blue-400 tracking-tight font-mono leading-none my-1">
                        #{selectedNumber}
                      </div>
                      <div className="text-xs font-black text-slate-700 dark:text-slate-300">
                        {t(
                          `Attendance Number ${selectedNumber}`,
                          <>
                            <ruby>出席番号<rt>しゅっせきばんごう</rt></ruby> {selectedNumber} <ruby>番<rt>ばん</rt></ruby>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="p-3 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 flex flex-col items-center justify-center text-center min-h-[116px]">
                  <span className="text-2xl mb-1">{isSpinning ? '✨' : '🎯'}</span>
                  <p className="text-xs font-black text-slate-500 dark:text-slate-400">
                    {isSpinning
                      ? t('Picking a lucky student...', 'だれが当たるかな...？')
                      : t('Press Draw to pick a student!', 'スタートを押して指名しよう！')}
                  </p>
                </div>
              )}
            </div>

            {/* Master Action Button Cluster */}
            <div className="space-y-1.5">
              {!showResultBanner ? (
                <button
                  onClick={handleStartSpin}
                  disabled={isSpinning || activePool.length === 0}
                  className="w-full h-11 sm:h-12 rounded-xl sm:rounded-2xl font-black text-sm sm:text-base text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 active:scale-98 transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Play size={17} className={isSpinning ? 'animate-spin shrink-0' : 'shrink-0'} />
                  <span className="truncate whitespace-nowrap">
                    {isSpinning
                      ? t('Drawing Number...', <><ruby>抽選中<rt>ちゅうせんちゅう</rt></ruby>...</>)
                      : mode === 'STICKS'
                      ? t('DRAW STICK! (Space)', <><ruby>棒<rt>ぼう</rt></ruby>を<ruby>引<rt>ひ</rt></ruby>く！[スペース]</>)
                      : t('SPIN! (Draw Number)', <>スタート！(くじを<ruby>引<rt>ひ</rt></ruby>く)</>)}
                  </span>
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleRemoveAndSpinAgain}
                    className="h-10 sm:h-11 px-3 rounded-xl font-black text-xs sm:text-sm text-white bg-rose-600 hover:bg-rose-500 active:scale-98 transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                    title={textLang === 'ja' ? 'この番号を除外してすぐに次を回す' : 'Exclude this number and draw the next person immediately'}
                  >
                    <span>🔴</span>
                    <span className="truncate">
                      {selectedNumber === '00'
                        ? t('Remove & Next', <><ruby>先生除外<rt>せんせいじょがい</rt></ruby>で<ruby>次<rt>つぎ</rt></ruby>へ</>)
                        : t(`Remove #${selectedNumber}`, <>{selectedNumber}<ruby>番除外<rt>ばんじょがい</rt></ruby>で<ruby>次<rt>つぎ</rt></ruby>へ</>)}
                    </span>
                  </button>

                  <button
                    onClick={handleKeepAndSpinAgain}
                    className="h-10 sm:h-11 px-3 rounded-xl font-black text-xs sm:text-sm text-white bg-emerald-600 hover:bg-emerald-500 active:scale-98 transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                    title={textLang === 'ja' ? '番号を残したまま次を回す' : 'Keep this number in the pool and draw again'}
                  >
                    <span>🟢</span>
                    <span className="truncate">{t('Keep & Draw Next', <>そのまま<ruby>次<rt>つぎ</rt></ruby>へ</>)}</span>
                  </button>
                </div>
              )}

              {/* Bottom Roster Status & Excluded Summary */}
              <div className="h-5 flex items-center justify-between text-[10px] sm:text-[11px] font-bold text-slate-600 dark:text-slate-300 px-1 overflow-hidden">
                <div className="flex items-center gap-1.5 min-w-0 truncate">
                  <span>{t('Pool:', <><ruby>候補<rt>こうほ</rt></ruby>:</>)}</span>
                  <span className="font-mono text-slate-900 dark:text-white font-black">
                    {activePool.length} / {fullRoster.length} {t('students', <><ruby>名<rt>めい</rt></ruby></>)}
                  </span>
                  {excludedNumbers.length > 0 && (
                    <span className="text-rose-500 font-bold truncate">
                      ({excludedNumbers.length} {t('removed', <><ruby>名除外<rt>めいじょがい</rt></ruby></>)})
                    </span>
                  )}
                </div>

                {excludedNumbers.length > 0 && (
                  <button
                    onClick={handleResetPool}
                    disabled={isSpinning}
                    className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1 font-bold text-[10px] transition-colors shrink-0 cursor-pointer whitespace-nowrap"
                    title={textLang === 'ja' ? '全員を復活させる' : 'Restore all numbers back to the pool'}
                  >
                    <RotateCcw size={10} />
                    <span>{t('Reset', <><ruby>全員復活<rt>ぜんいんふっかつ</rt></ruby></>)}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
