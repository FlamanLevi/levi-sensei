import React, { useState, useMemo, useCallback } from 'react';
import { TownMap, PlacedBuilding } from './townGenerator';
import { 
  computeManhattanRoadPath, 
  buildMextStepByStepScript, 
  NavigationStep, 
  Point2D 
} from './navigationLogic';
import { 
  Volume2, 
  Send, 
  CheckCircle2, 
  Radio, 
  Eye, 
  Compass, 
  ArrowUp, 
  ArrowLeft, 
  ArrowRight, 
  Sparkles,
  MapPin,
  Building2,
  AlertCircle
} from 'lucide-react';
import { soundEffects } from '@/services/soundEffects';

function getShortMapLabel(nameEn: string): string {
  const map: Record<string, string> = {
    'Amusement Park': 'Amusement',
    'Swimming Pool': 'Pool',
    'Supermarket': 'Market',
    'Department Store': 'Dept.',
    'Junior High School': 'J.High',
    'Fire Station': 'Fire',
    'Police Station': 'Police',
    'City Hall': 'City Hall',
    'Convenience Store': 'Konbini',
    'Post Office': 'Post',
    'Bookstore': 'Books',
    'Flower Shop': 'Flowers',
    'Restaurant': 'Diner',
    'Bus Stop': 'Bus',
  };
  return map[nameEn] || nameEn.split(' ')[0];
}

export interface DispatcherProps {
  townMap: TownMap;
  playerPos: { x: number; z: number; heading: number };
  targetBuilding: PlacedBuilding | null;
  activeSchool?: string;
  onSendInstruction?: (instruction: { textEn: string; textJa: string; stepIndex: number }) => void;
  onSwitchTo3D?: () => void;
}

export const TownNavigatorDispatcher: React.FC<DispatcherProps> = ({
  townMap,
  playerPos,
  targetBuilding,
  activeSchool = 'futakotamagawa',
  onSendInstruction,
  onSwitchTo3D,
}) => {
  // Current active step index in the turn-by-turn flow (1-based)
  const [activeStepIndex, setActiveStepIndex] = useState<number>(1);
  const [sentSteps, setSentSteps] = useState<number[]>([]);
  const [lastDispatchedText, setLastDispatchedText] = useState<string | null>(null);

  // Student's interactive word-chip selections
  const [selectedAction, setSelectedAction] = useState<'straight' | 'turn_left' | 'turn_right'>('straight');
  const [selectedBlocks, setSelectedBlocks] = useState<1 | 2>(1);
  const [selectedLandmark, setSelectedLandmark] = useState<'corner' | 'traffic_light'>('corner');
  const [selectedSide, setSelectedSide] = useState<'left' | 'right'>('right');

  // Compute optimal ground-truth road path from player position to target
  const roadPath: Point2D[] = useMemo(() => {
    if (!targetBuilding) return [];
    return computeManhattanRoadPath(playerPos.x, playerPos.z, targetBuilding);
  }, [playerPos.x, playerPos.z, targetBuilding]);

  // Compute ground-truth MEXT step-by-step instructions
  const scriptData = useMemo(() => {
    if (!targetBuilding || roadPath.length === 0) return null;
    return buildMextStepByStepScript(roadPath, playerPos.heading, targetBuilding);
  }, [roadPath, playerPos.heading, targetBuilding]);

  const targetSteps = scriptData?.stepsDetailed || [];
  const currentTargetStep: NavigationStep | undefined = targetSteps.find(s => s.stepIndex === activeStepIndex);

  // Dynamically assemble the sentence from current chip selections
  const constructedSentence = useMemo(() => {
    if (currentTargetStep?.type === 'ARRIVE') {
      const sideJa = selectedSide === 'left' ? '左' : '右';
      return {
        en: `You can see it on your ${selectedSide}.`,
        ja: `${sideJa}側に見えてくるよ。`,
      };
    }

    if (selectedAction === 'straight') {
      const bEn = selectedBlocks === 2 ? 'two blocks' : 'one block';
      const bJa = selectedBlocks === 2 ? '2ブロック' : '1ブロック';
      return {
        en: `Go straight for ${bEn}.`,
        ja: `${bJa}まっすぐ進もう。`,
      };
    }

    const tEn = selectedAction === 'turn_left' ? 'left' : 'right';
    const tJa = selectedAction === 'turn_left' ? '左' : '右';
    const lmEn = selectedLandmark === 'traffic_light' ? 'the traffic light' : 'the corner';
    const lmJa = selectedLandmark === 'traffic_light' ? '信号' : '角';
    return {
      en: `Turn ${tEn} at ${lmEn}.`,
      ja: `${lmJa}を${tJa}に曲がろう。`,
    };
  }, [selectedAction, selectedBlocks, selectedLandmark, selectedSide, currentTargetStep]);

  // Audio pronunciation preview via SpeechSynthesis
  const speakText = useCallback((text: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.88;
      utterance.pitch = 1.05;
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  // Handle Dispatch / Send to Partner
  const handleSendDirection = () => {
    soundEffects.playCorrect();
    speakText(constructedSentence.en);

    setLastDispatchedText(constructedSentence.en);
    if (!sentSteps.includes(activeStepIndex)) {
      setSentSteps(prev => [...prev, activeStepIndex]);
    }

    if (onSendInstruction) {
      onSendInstruction({
        textEn: constructedSentence.en,
        textJa: constructedSentence.ja,
        stepIndex: activeStepIndex,
      });
    }

    // Advance to next step if more steps remain
    if (activeStepIndex < targetSteps.length) {
      setActiveStepIndex(prev => prev + 1);
      // Pre-seed chips for the next step based on ground truth
      const nextStep = targetSteps.find(s => s.stepIndex === activeStepIndex + 1);
      if (nextStep) {
        if (nextStep.type === 'ARRIVE') {
          setSelectedSide(nextStep.side || 'right');
        } else if (nextStep.type === 'TURN') {
          setSelectedAction(nextStep.action || 'turn_left');
        } else {
          setSelectedAction('straight');
          setSelectedBlocks(nextStep.blocks || 1);
        }
      }
    }
  };

  // Match evaluation with ground truth for subtle teacher feedback
  const isOptimalChoice = useMemo(() => {
    if (!currentTargetStep) return true;
    if (currentTargetStep.type === 'ARRIVE') {
      return selectedSide === currentTargetStep.side;
    }
    if (currentTargetStep.type === 'TURN') {
      return selectedAction === currentTargetStep.action;
    }
    return selectedAction === 'straight';
  }, [currentTargetStep, selectedSide, selectedAction]);

  const schoolDisplayName = activeSchool === 'toyogaoka' ? '豊ヶ丘 (Toyogaoka)' : '二子玉川 (Futako-Tamagawa)';

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-slate-950 text-white flex flex-col select-none font-sans z-50">
      {/* 1. DISPATCHER HEADER */}
      <header className="flex items-center justify-between px-4 sm:px-6 py-2.5 bg-slate-900/90 border-b border-slate-800 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-400">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-black text-sm sm:text-base tracking-wide text-white">
                MISSION CONTROL <span className="text-sky-400 font-medium text-xs sm:text-sm">街の案内係 (ディスパッチャー)</span>
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /> LIVE GPS SYNC
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Active Area: <span className="font-semibold text-slate-200">{schoolDisplayName}</span>
            </p>
          </div>
        </div>

        {/* Right header actions */}
        <div className="flex items-center gap-2">
          {onSwitchTo3D && (
            <button
              onClick={onSwitchTo3D}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 text-xs sm:text-sm font-bold border border-slate-700 transition cursor-pointer"
            >
              <Eye className="w-4 h-4 text-amber-400" />
              <span>3D Street View</span>
            </button>
          )}
        </div>
      </header>

      {/* 2. MAIN SPLIT STAGE: 2D Radar Map (Left) + Instruction Builder (Right) */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
        {/* LEFT: 2D ARCHITECTURAL MAP */}
        <div className="flex-1 min-h-0 bg-slate-950 relative flex items-center justify-center p-2 sm:p-4 border-b lg:border-b-0 lg:border-r border-slate-800">
          <div className="relative w-full h-full max-w-[620px] max-h-[620px] aspect-square rounded-2xl bg-slate-900 border-2 border-slate-800 shadow-2xl overflow-hidden">
            {/* SVG Town Blueprint */}
            <svg className="w-full h-full" viewBox="-78 -78 156 156">
              {/* Outer boundary asphalt ground */}
              <rect x="-78" y="-78" width="156" height="156" fill="#0b0f19" />

              {/* Side Streets Network (Rows & Cols at -63m, -33m, +33m, +63m) */}
              {[-63, -33, 33, 63].map(coord => (
                <g key={`road_${coord}`}>
                  {/* Horizontal Road (Along X) */}
                  <rect x="-72" y={coord - 3.0} width="144" height="6.0" fill="#1e293b" />
                  <line x1="-72" y1={coord} x2="72" y2={coord} stroke="#f8fafc" strokeWidth="0.3" strokeDasharray="2.5,2.0" opacity="0.6" />

                  {/* Vertical Road (Along Z) */}
                  <rect x={coord - 3.0} y="-72" width="6.0" height="144" fill="#1e293b" />
                  <line x1={coord} y1="-72" x2={coord} y2="72" stroke="#f8fafc" strokeWidth="0.3" strokeDasharray="2.5,2.0" opacity="0.6" />
                </g>
              ))}

              {/* 12m Grand Central Boulevard (along X and Z at 0) */}
              <g key="boulevard_center">
                {/* Horizontal Boulevard */}
                <rect x="-72" y={-6.0} width="144" height="12.0" fill="#1e293b" />
                <line x1="-72" y1={-3.0} x2="72" y2={-3.0} stroke="#f8fafc" strokeWidth="0.25" strokeDasharray="2.5,2.0" opacity="0.4" />
                <line x1="-72" y1={3.0} x2="72" y2={3.0} stroke="#f8fafc" strokeWidth="0.25" strokeDasharray="2.5,2.0" opacity="0.4" />
                <rect x="-72" y={-1.0} width="144" height="2.0" fill="#15803d" />

                {/* Vertical Boulevard */}
                <rect x={-6.0} y="-72" width="12.0" height="144" fill="#1e293b" />
                <line x1={-3.0} y1="-72" x2={-3.0} y2="72" stroke="#f8fafc" strokeWidth="0.25" strokeDasharray="2.5,2.0" opacity="0.4" />
                <line x1={3.0} y1="-72" x2={3.0} y2="72" stroke="#f8fafc" strokeWidth="0.25" strokeDasharray="2.5,2.0" opacity="0.4" />
                <rect x={-1.0} y="-72" width="2.0" height="144" fill="#15803d" />
              </g>

              {/* 25 Crossroads Intersections */}
              {[-63, -33, 0, 33, 63].map(rx =>
                [-63, -33, 0, 33, 63].map(rz => {
                  const w = rx === 0 ? 12.0 : 6.0;
                  const h = rz === 0 ? 12.0 : 6.0;
                  return (
                    <rect
                      key={`inter_${rx}_${rz}`}
                      x={rx - w / 2}
                      y={rz - h / 2}
                      width={w}
                      height={h}
                      fill="#243044"
                    />
                  );
                })
              )}

              {/* Guided Road Route Line */}
              {roadPath.length >= 2 && (
                <polyline
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="2.2"
                  strokeDasharray="3.0,1.8"
                  points={roadPath.map(p => `${p.x},${p.z}`).join(' ')}
                />
              )}

              {/* Building parcels */}
              {townMap.buildingsList.map((b, idx) => {
                const isRot90 = Math.abs(Math.sin(b.rotationY)) > 0.5;
                const bw = isRot90 ? b.depthMeters : b.widthMeters;
                const bd = isRot90 ? b.widthMeters : b.depthMeters;
                const isPassive = b.tier === 0;
                const isTarget = targetBuilding?.id === b.id;

                const color = isTarget
                  ? '#f59e0b'
                  : isPassive
                  ? b.id === 'EMPTY_LOT' ? '#166534' : '#334155'
                  : b.tier === 3
                  ? '#d97706'
                  : b.tier === 2
                  ? '#0284c7'
                  : '#059669';

                return (
                  <g key={idx}>
                    <rect
                      x={b.worldPos[0] - bw / 2 + 0.3}
                      y={b.worldPos[2] - bd / 2 + 0.3}
                      width={bw - 0.6}
                      height={bd - 0.6}
                      fill={color}
                      opacity={isTarget ? 0.95 : isPassive ? 0.5 : 0.8}
                      stroke={isTarget ? '#fef08a' : '#1e293b'}
                      strokeWidth={isTarget ? 1.0 : 0.3}
                      rx="0.5"
                    />

                    {/* Facility label for non-passive buildings */}
                    {!isPassive && (
                      <text
                        x={b.worldPos[0]}
                        y={b.worldPos[2]}
                        fill="#ffffff"
                        fontSize={b.tier === 3 ? '2.1' : b.tier === 2 ? '1.55' : '1.12'}
                        fontWeight="bold"
                        textAnchor="middle"
                        dominantBaseline="central"
                        opacity={isTarget ? 1.0 : 0.9}
                      >
                        {getShortMapLabel(b.nameEn)}
                      </text>
                    )}

                    {/* Target Destination Beacon Marker */}
                    {isTarget && (
                      <g transform={`translate(${b.entrancePos[0]}, ${b.entrancePos[2]})`}>
                        <circle r="3.2" fill="#ef4444" opacity="0.35" className="animate-ping" />
                        <circle r="2.0" fill="#ef4444" stroke="#ffffff" strokeWidth="0.6" />
                        <text y="0.8" fill="#ffffff" fontSize="1.8" textAnchor="middle" fontWeight="black">★</text>
                      </g>
                    )}
                  </g>
                );
              })}

              {/* Live Traveler Avatar Token with Heading Arrow */}
              <g transform={`translate(${playerPos.x}, ${playerPos.z}) rotate(${(-playerPos.heading * 180) / Math.PI})`}>
                <circle r="4.2" fill="#38bdf8" opacity="0.25" className="animate-ping" />
                <circle r="2.4" fill="#0284c7" stroke="#ffffff" strokeWidth="0.8" />
                <polygon points="0,4.2 -1.8,1.4 1.8,1.4" fill="#38bdf8" />
              </g>

              {/* Compass Rose Header Marker */}
              <g transform="translate(68, -68)">
                <circle r="5.5" fill="#0f172a" stroke="#334155" strokeWidth="0.8" />
                <text y="-0.6" fill="#f43f5e" fontSize="3.6" fontWeight="black" textAnchor="middle">N</text>
                <polygon points="0,-4.5 -1.5,-0.6 1.5,-0.6" fill="#f43f5e" />
              </g>
            </svg>

            {/* Map Legend Overlay */}
            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between px-3 py-1.5 bg-slate-900/80 backdrop-blur-md rounded-xl text-[10px] text-slate-300 border border-slate-800">
              <span className="flex items-center gap-1.5 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block animate-pulse" />
                Traveler: ({Math.round(playerPos.x)}m, {Math.round(playerPos.z)}m)
              </span>
              {targetBuilding && (
                <span className="flex items-center gap-1.5 font-bold text-amber-300">
                  <MapPin className="w-3.5 h-3.5 text-rose-400" />
                  Target: {targetBuilding.nameEn}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: TURN-BY-TURN GUIDED BUILDER CONSOLE */}
        <div className="w-full lg:w-[480px] shrink-0 bg-slate-900/70 p-4 sm:p-6 flex flex-col justify-between overflow-y-auto">
          <div>
            {/* Mission Target Header */}
            {targetBuilding ? (
              <div className="bg-slate-800/80 border border-amber-500/40 rounded-2xl p-4 mb-4 shadow-lg">
                <div className="flex items-center justify-between text-xs text-amber-400 font-black mb-1 uppercase tracking-wider">
                  <span>Current Mission Target</span>
                  <span>Step {activeStepIndex} of {targetSteps.length || 3}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-black text-white truncate">{targetBuilding.nameEn}</h2>
                    <p className="text-xs text-slate-300">{targetBuilding.nameJa}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-4 mb-4 text-center text-slate-400 text-sm">
                Waiting for target destination...
              </div>
            )}

            {/* Turn-by-Turn Step Navigation Pills */}
            <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
              {targetSteps.map((s, idx) => {
                const isCurrent = s.stepIndex === activeStepIndex;
                const isSent = sentSteps.includes(s.stepIndex);
                return (
                  <button
                    key={idx}
                    onClick={() => setActiveStepIndex(s.stepIndex)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                      isCurrent
                        ? 'bg-sky-500 text-white shadow-md'
                        : isSent
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {isSent ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <span>Step {s.stepIndex}</span>}
                    <span>{s.type === 'ARRIVE' ? 'Arrival' : s.type === 'TURN' ? 'Turn' : 'Leg 1'}</span>
                  </button>
                );
              })}
            </div>

            {/* Guided Word-Chip Interactive Selector */}
            <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-4 mb-4">
              <h3 className="text-xs font-bold text-slate-300 mb-3 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                Build Direction Phrase (案内フレーズ作成)
              </h3>

              {currentTargetStep?.type === 'ARRIVE' ? (
                /* Arrival Side Choice */
                <div>
                  <p className="text-xs text-slate-400 mb-2">Which side is the building on?</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setSelectedSide('left')}
                      className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm transition cursor-pointer ${
                        selectedSide === 'left'
                          ? 'bg-sky-500 text-white shadow-md'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>On your left (左側)</span>
                    </button>
                    <button
                      onClick={() => setSelectedSide('right')}
                      className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm transition cursor-pointer ${
                        selectedSide === 'right'
                          ? 'bg-sky-500 text-white shadow-md'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      <span>On your right (右側)</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                /* Direction & Distance Choice */
                <div className="space-y-3">
                  {/* Action choice: Straight vs Turn Left vs Turn Right */}
                  <div>
                    <p className="text-xs text-slate-400 mb-1.5">1. Movement (どう進む？)</p>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => setSelectedAction('straight')}
                        className={`flex flex-col items-center justify-center gap-0.5 py-2 px-2 rounded-xl font-bold text-xs transition cursor-pointer whitespace-nowrap ${
                          selectedAction === 'straight'
                            ? 'bg-sky-500 text-white shadow-md'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        <span className="flex items-center gap-1">
                          <ArrowUp className="w-3.5 h-3.5" />
                          <span>Straight</span>
                        </span>
                        <span className="text-[10px] opacity-90">まっすぐ</span>
                      </button>
                      <button
                        onClick={() => setSelectedAction('turn_left')}
                        className={`flex flex-col items-center justify-center gap-0.5 py-2 px-2 rounded-xl font-bold text-xs transition cursor-pointer whitespace-nowrap ${
                          selectedAction === 'turn_left'
                            ? 'bg-sky-500 text-white shadow-md'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        <span className="flex items-center gap-1">
                          <ArrowLeft className="w-3.5 h-3.5" />
                          <span>Turn left</span>
                        </span>
                        <span className="text-[10px] opacity-90">左へ曲がる</span>
                      </button>
                      <button
                        onClick={() => setSelectedAction('turn_right')}
                        className={`flex flex-col items-center justify-center gap-0.5 py-2 px-2 rounded-xl font-bold text-xs transition cursor-pointer whitespace-nowrap ${
                          selectedAction === 'turn_right'
                            ? 'bg-sky-500 text-white shadow-md'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        <span className="flex items-center gap-1">
                          <ArrowRight className="w-3.5 h-3.5" />
                          <span>Turn right</span>
                        </span>
                        <span className="text-[10px] opacity-90">右へ曲がる</span>
                      </button>
                    </div>
                  </div>

                  {/* Quantity / Distance choice */}
                  {selectedAction === 'straight' ? (
                    <div>
                      <p className="text-xs text-slate-400 mb-1.5">2. Distance (何ブロック進む？)</p>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setSelectedBlocks(1)}
                          className={`py-2 px-3 rounded-xl font-bold text-xs sm:text-sm transition cursor-pointer ${
                            selectedBlocks === 1
                              ? 'bg-indigo-600 text-white shadow-md'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          1 block (1ブロック)
                        </button>
                        <button
                          onClick={() => setSelectedBlocks(2)}
                          className={`py-2 px-3 rounded-xl font-bold text-xs sm:text-sm transition cursor-pointer ${
                            selectedBlocks === 2
                              ? 'bg-indigo-600 text-white shadow-md'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          2 blocks (2ブロック)
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs text-slate-400 mb-1.5">2. At where? (どこで曲がる？)</p>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setSelectedLandmark('corner')}
                          className={`py-2 px-3 rounded-xl font-bold text-xs sm:text-sm transition cursor-pointer ${
                            selectedLandmark === 'corner'
                              ? 'bg-indigo-600 text-white shadow-md'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          At the corner (角で)
                        </button>
                        <button
                          onClick={() => setSelectedLandmark('traffic_light')}
                          className={`py-2 px-3 rounded-xl font-bold text-xs sm:text-sm transition cursor-pointer ${
                            selectedLandmark === 'traffic_light'
                              ? 'bg-indigo-600 text-white shadow-md'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          At the traffic light (信号で)
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Assembled Sentence Preview Card */}
            <div className="bg-slate-950/80 border border-sky-500/40 rounded-2xl p-4 shadow-inner mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-sky-400 uppercase tracking-wider">
                  Direction Speech Preview
                </span>
                <button
                  onClick={() => speakText(constructedSentence.en)}
                  className="p-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/30 active:scale-95 transition cursor-pointer"
                  title="Listen to pronunciation"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>
              <p className="text-lg font-black text-white leading-snug">
                "{constructedSentence.en}"
              </p>
              <p className="text-xs text-slate-400 mt-1">
                「{constructedSentence.ja}」
              </p>

              {!isOptimalChoice && (
                <div className="flex items-center gap-1.5 mt-2 text-[11px] text-amber-300 font-semibold bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-lg">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Check the map route! Partner might need a different turn.</span>
                </div>
              )}
            </div>
          </div>

          {/* 3. DISPATCH BUTTON & LAST SENT STATUS */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            {lastDispatchedText && (
              <div className="text-[11px] text-emerald-400 font-medium flex items-center justify-between px-1">
                <span className="truncate">Last sent: "{lastDispatchedText}"</span>
                <span className="text-slate-400 shrink-0">Delivered ✅</span>
              </div>
            )}

            <button
              onClick={handleSendDirection}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-black text-base shadow-xl active:scale-95 transition cursor-pointer"
            >
              <Send className="w-5 h-5" />
              <span>SEND DIRECTION TO PARTNER / 案内を送信する</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
