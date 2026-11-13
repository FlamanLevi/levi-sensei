import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import {
  HelpCircle,
  Settings,
  Camera,
  RotateCcw,
  Volume2,
  VolumeX,
  Sparkles,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Tag,
  Eye,
  EyeOff,
  RefreshCw,
  Sun,
  Moon,
  CheckCircle2,
  X
} from 'lucide-react';
import { useClassroom } from '@/context/ClassroomContext';
import { useAudio } from '@/context/AudioContext';
import { soundEffects } from '@/services/soundEffects';
import {
  TownGameMode,
  ArchitectRole,
  NavigatorRole,
  TownTilesData,
  MissingBlueprintTarget
} from './engine/types';
import {
  CURATED_TEXTBOOK_TILES,
  analyzeTownForPresentation
} from './engine/tileCatalog';
import {
  ANCHOR_LANDMARK_LABELS,
  NAVIGATOR_MISSIONS,
  createBlueprintPuzzleMap,
  createEmptyGrid
} from './engine/presetMaps';
import {
  TownCanvasRenderer,
  screenToWorld,
  worldToCell,
  getGridMetrics
} from './engine/isometricCanvas';
import { DreamTownInstructionsModal } from './DreamTownInstructionsModal';
import { DreamTownSettingsModal } from './DreamTownSettingsModal';

interface DreamTownContainerProps {
  onExit?: () => void;
}

export const DreamTownContainer: React.FC<DreamTownContainerProps> = ({ onExit }) => {
  const { theme, toggleTheme } = useClassroom();
  const { isMuted, toggleMute } = useAudio();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<TownCanvasRenderer | null>(null);

  // Loaded tiles database from public/data/isometric_tiles.json
  const [tilesData, setTilesData] = useState<TownTilesData | null>(null);
  const [loading, setLoading] = useState(true);

  // Game Mode & Roles
  const [mode, setMode] = useState<TownGameMode>('BLUEPRINT_INFO_GAP');
  const [role, setRole] = useState<ArchitectRole>('architect_a');
  const [blueprintRound, setBlueprintRound] = useState<1 | 2>(1);
  const [peekShieldActive, setPeekShieldActive] = useState(false);
  const [isPeeking, setIsPeeking] = useState(false);

  // Palette & Brush State (Mode 3)
  const [paletteScope, setPaletteScope] = useState<'curated' | 'all256'>('curated');
  const [activeBrush, setActiveBrush] = useState<string>('b06_bakery');
  const [activeCategory, setActiveCategory] = useState<string>('building');

  // UI & Audio Preferences
  const [isJa, setIsJa] = useState(true);
  const [voiceAssist, setVoiceAssist] = useState(true);
  const [showLandmarkLabels, setShowLandmarkLabels] = useState(true);

  // Modals
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Grid Map State (16x16)
  const initialBlueprint = useMemo(() => createBlueprintPuzzleMap(1), []);
  const [grid, setGrid] = useState<string[][]>(initialBlueprint.gridA);
  const [masterGrid, setMasterGrid] = useState<string[][]>(initialBlueprint.gridMaster);
  const [puzzleTargets, setPuzzleTargets] = useState<MissingBlueprintTarget[]>(initialBlueprint.targets);
  const [activePuzzleIndex, setActivePuzzleIndex] = useState(0);

  // Mode 2: Navigator State
  const [navigatorRole, setNavigatorRole] = useState<NavigatorRole>('traveler');
  const [hideGoalForTraveler, setHideGoalForTraveler] = useState(false);
  const [missionIndex, setMissionIndex] = useState(0);
  const activeMission = NAVIGATOR_MISSIONS[missionIndex] || NAVIGATOR_MISSIONS[0];
  const [traveler, setTraveler] = useState<{ row: number; col: number; dir: string }>({
    row: activeMission.startRow,
    col: activeMission.startCol,
    dir: 'E'
  });

  // Undo Stack
  const undoStackRef = useRef<string[][][]>([]);

  // Presentation Showcase & Rewards
  const [showPresentationCard, setShowPresentationCard] = useState(false);
  const [starsAwarded, setStarsAwarded] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const showToast = useCallback((msg: string, durationMs = 3000) => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    setToastMessage(msg);
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, durationMs);
  }, []);

  // 1. Asynchronously fetch 2.2 MB tiles database once on mount (Rule 2)
  useEffect(() => {
    let isCancelled = false;
    fetch('/data/isometric_tiles.json')
      .then(res => res.json())
      .then((data: TownTilesData) => {
        if (!isCancelled) {
          setTilesData(data);
          setLoading(false);
        }
      })
      .catch(err => {
        console.error('Failed to load isometric tiles database:', err);
        if (!isCancelled) setLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  // 2. Speak English audio assist using browser SpeechSynthesis
  const speakText = useCallback(
    (text: string) => {
      if (!voiceAssist || isMuted) return;
      try {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = 'en-US';
          utterance.rate = 0.88; // Clear elementary cadence
          window.speechSynthesis.speak(utterance);
        }
      } catch (err) {
        console.warn('Speech synthesis error:', err);
      }
    },
    [voiceAssist, isMuted]
  );

  // Load Blueprint Round (Round 1 or Round 2)
  const loadBlueprintRound = useCallback(
    (round: 1 | 2, nextRole?: ArchitectRole) => {
      const { gridA, gridMaster, targets } = createBlueprintPuzzleMap(round);
      setBlueprintRound(round);
      setGrid(gridA);
      setMasterGrid(gridMaster);
      setPuzzleTargets(targets);
      setActivePuzzleIndex(0);
      if (nextRole) setRole(nextRole);
      if (!isMuted) soundEffects.playCardFlip();
    },
    [isMuted]
  );

  // Swap Roles & Switch Round
  const handleSwapRolesAndRound = () => {
    const nextRound: 1 | 2 = blueprintRound === 1 ? 2 : 1;
    const nextRole: ArchitectRole = role === 'architect_a' ? 'architect_b' : 'architect_a';
    loadBlueprintRound(nextRound, nextRole);
    showToast(
      isJa
        ? `🔄 役割交代！第${nextRound}ラウンドの新しい設計図になったよ！`
        : `🔄 Roles Swapped! Loaded Round ${nextRound} Blueprint!`,
      3200
    );
  };

  // Select Navigator Mission
  const handleSelectMission = (idx: number) => {
    const mission = NAVIGATOR_MISSIONS[idx];
    if (!mission) return;
    if (!isMuted) soundEffects.playCardFlip();
    setMissionIndex(idx);
    setTraveler({
      row: mission.startRow,
      col: mission.startCol,
      dir: 'E'
    });
    speakText(`Let's go to the ${mission.nameEn}!`);
  };

  const activeTarget = puzzleTargets[activePuzzleIndex] || puzzleTargets.find(t => !t.placed) || puzzleTargets[0];

  // Live Render State Ref so the 60 FPS loop never destroys or re-instantiates TownCanvasRenderer!
  const renderStateRef = useRef({
    grid,
    masterGrid,
    mode,
    role,
    puzzleTargets,
    activeTargetId: activeTarget?.id,
    traveler,
    activeMission,
    navigatorRole,
    hideGoalForTraveler,
    activeBrush,
    showLandmarkLabels,
    isJa
  });

  useEffect(() => {
    renderStateRef.current = {
      grid,
      masterGrid,
      mode,
      role,
      puzzleTargets,
      activeTargetId: activeTarget?.id,
      traveler,
      activeMission,
      navigatorRole,
      hideGoalForTraveler,
      activeBrush,
      showLandmarkLabels,
      isJa
    };
  }, [
    grid,
    masterGrid,
    mode,
    role,
    puzzleTargets,
    activeTarget,
    traveler,
    activeMission,
    navigatorRole,
    hideGoalForTraveler,
    activeBrush,
    showLandmarkLabels,
    isJa
  ]);

  // 3. Initialize Canvas Renderer ONCE when tilesData arrives & run continuous 60 FPS loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !tilesData) return;

    const renderer = new TownCanvasRenderer(canvas, tilesData);
    rendererRef.current = renderer;
    renderer.centerView(16, 16);

    let animId: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      animId = requestAnimationFrame(loop);
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      renderer.animTime += dt;
      renderer.animFrame = Math.floor(renderer.animTime * 2.8) % 4;

      const st = renderStateRef.current;
      const isMaster = st.mode === 'BLUEPRINT_INFO_GAP' && st.role === 'architect_b';
      const displayGrid = isMaster ? st.masterGrid : st.grid;
      const displayTraveler = st.mode === 'TOWN_NAVIGATOR' ? st.traveler : null;
      const displayMission = st.mode === 'TOWN_NAVIGATOR' ? st.activeMission : null;
      const showGoal =
        st.mode === 'TOWN_NAVIGATOR' &&
        (st.navigatorRole === 'guide' || !st.hideGoalForTraveler);

      renderer.render({
        grid: displayGrid,
        puzzleTargets: st.mode === 'BLUEPRINT_INFO_GAP' ? st.puzzleTargets : [],
        activeTargetId: st.activeTargetId,
        isMasterView: isMaster,
        travelerPos: displayTraveler,
        navigatorMission: displayMission,
        showNavigatorGoal: showGoal,
        activeBrush: st.mode === 'FREE_COOP_BUILDER' ? st.activeBrush : null,
        landmarkLabels: ANCHOR_LANDMARK_LABELS,
        showLandmarkLabels: st.showLandmarkLabels,
        isJa: st.isJa
      });
    };

    animId = requestAnimationFrame(loop);

    const handleResize = () => {
      if (rendererRef.current) {
        rendererRef.current.centerView(16, 16);
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      rendererRef.current = null;
    };
  }, [tilesData]);

  // 4. Cell Click Handler per Game Mode
  const handleCellClick = useCallback(
    (row: number, col: number) => {
      const renderer = rendererRef.current;
      if (renderer) renderer.selectedCell = { row, col };

      // MODE 1: Information Gap Placement
      if (mode === 'BLUEPRINT_INFO_GAP') {
        if (role === 'architect_b') {
          const clickedTarget = puzzleTargets.find(t => t.row === row && t.col === col);
          if (clickedTarget) {
            const idx = puzzleTargets.indexOf(clickedTarget);
            setActivePuzzleIndex(idx);
            speakText(clickedTarget.clueEn);
          } else if (!isMuted) {
            soundEffects.playCardFlip();
          }
          return;
        }

        // Check if student clicked any unplaced puzzle target (either the active one or another matching plot)
        const currentTarget = puzzleTargets[activePuzzleIndex];
        if (!currentTarget) return;

        if (row === currentTarget.row && col === currentTarget.col && !currentTarget.placed) {
          if (!isMuted) soundEffects.playFanfare();
          setStarsAwarded(prev => prev + 100);

          const nextTargets = puzzleTargets.map((t, idx) =>
            idx === activePuzzleIndex ? { ...t, placed: true } : t
          );
          setPuzzleTargets(nextTargets);

          const nextGrid = grid.map(r => [...r]);
          nextGrid[row][col] = currentTarget.tileId;
          setGrid(nextGrid);

          const remainingIdx = nextTargets.findIndex(t => !t.placed);
          if (remainingIdx !== -1) {
            setActivePuzzleIndex(remainingIdx);
            const nextT = nextTargets[remainingIdx];
            showToast(
              isJa
                ? `✨ ナイス！ ${currentTarget.nameJa} (${currentTarget.nameEn}) が完成！次は ${nextT.icon} ${nextT.nameJa} を聞こう！`
                : `✨ Great job! Built the ${currentTarget.nameEn}! Next: Ask about the ${nextT.nameEn}!`,
              3200
            );
            speakText(`Great job! Where is the ${nextT.nameEn}?`);
          } else {
            showToast(
              isJa
                ? '🎉 4つの建物がすべて完成！パーフェクト・タウン！「🔄 役割交代」で交代しよう！ 👑'
                : '🎉 All 4 buildings complete! Tap "Swap Roles" for Round 2! 👑',
              4500
            );
            speakText('Congratulations! Your town is complete!');
          }
        } else {
          if (!isMuted) soundEffects.playVolleyballDig();
          showToast(
            isJa
              ? `🤔 ちがう場所だよ！もう一度ヒントを聞こう：「${currentTarget.clueJa}」`
              : `🤔 Not quite there! Listen to the clue: "${currentTarget.clueEn}"`,
            2800
          );
        }
        return;
      }

      // MODE 2: Navigator Mode (Clicking a road/landmark speaks its name)
      if (mode === 'TOWN_NAVIGATOR') {
        const lbl = ANCHOR_LANDMARK_LABELS.find(l => l.row === row && l.col === col);
        if (lbl) {
          speakText(lbl.en);
          showToast(`${lbl.icon} ${lbl.ja} (${lbl.en})`, 1800);
        }
        return;
      }

      // MODE 3: Free Co-Op Builder Paint
      if (mode === 'FREE_COOP_BUILDER') {
        if (grid[row][col] === activeBrush) return;
        if (!isMuted) soundEffects.playCardFlip();
        undoStackRef.current.push(grid.map(r => [...r]));
        if (undoStackRef.current.length > 25) undoStackRef.current.shift();

        const nextGrid = grid.map(r => [...r]);
        nextGrid[row][col] = activeBrush;
        setGrid(nextGrid);
      }
    },
    [mode, role, activeBrush, activePuzzleIndex, puzzleTargets, grid, isMuted, isJa, speakText, showToast]
  );

  const handleCellClickRef = useRef(handleCellClick);
  useEffect(() => {
    handleCellClickRef.current = handleCellClick;
  }, [handleCellClick]);

  // 5. Canvas Pointer, Wheel Zoom, Pinch-to-Zoom & Eyedropper Interactions
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let hasMoved = false;
    let lastPinchDist = 0;

    const handlePointerDown = (e: PointerEvent) => {
      if (e.button === 2) return; // Right-click handled by contextmenu eyedropper
      isDragging = true;
      hasMoved = false;
      startX = e.clientX;
      startY = e.clientY;
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch (_) {}
    };

    const handlePointerMove = (e: PointerEvent) => {
      const renderer = rendererRef.current;
      if (!renderer) return;

      if (isDragging) {
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        if (Math.hypot(dx, dy) > 5) {
          hasMoved = true;
          renderer.camera.x += dx;
          renderer.camera.y += dy;
          startX = e.clientX;
          startY = e.clientY;
        }
      }

      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const world = screenToWorld(sx, sy, renderer.camera);
      const metrics = getGridMetrics(16, 16);
      renderer.hoveredCell = worldToCell(world.x, world.y, metrics.originX, metrics.originY, 16, 16);
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (isDragging) {
        isDragging = false;
        try {
          canvas.releasePointerCapture(e.pointerId);
        } catch (_) {}
      }

      if (!hasMoved && e.button === 0) {
        const renderer = rendererRef.current;
        if (!renderer) return;
        const rect = canvas.getBoundingClientRect();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;
        const world = screenToWorld(sx, sy, renderer.camera);
        const metrics = getGridMetrics(16, 16);
        const cell = worldToCell(world.x, world.y, metrics.originX, metrics.originY, 16, 16);
        if (cell) {
          handleCellClickRef.current(cell.row, cell.col);
        }
      }
    };

    // Cursor-centered Wheel Zoom
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const renderer = rendererRef.current;
      if (!renderer) return;
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const zoomFactor = e.deltaY < 0 ? 1.14 : 0.88;
      renderer.zoomAroundPoint(renderer.camera.zoom * zoomFactor, mouseX, mouseY);
    };

    // Two-finger iPad Pinch-to-Zoom
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        hasMoved = true;
        isDragging = false;
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        lastPinchDist = Math.hypot(dx, dy);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && rendererRef.current) {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const t0 = e.touches[0];
        const t1 = e.touches[1];
        const midX = (t0.clientX + t1.clientX) / 2 - rect.left;
        const midY = (t0.clientY + t1.clientY) / 2 - rect.top;
        const dist = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
        if (lastPinchDist > 0 && dist > 0) {
          const scale = dist / lastPinchDist;
          rendererRef.current.zoomAroundPoint(rendererRef.current.camera.zoom * scale, midX, midY);
        }
        lastPinchDist = dist;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        lastPinchDist = 0;
      }
    };

    // Right-click Eyedropper in Free Build Mode
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      const renderer = rendererRef.current;
      const st = renderStateRef.current;
      if (!renderer || st.mode !== 'FREE_COOP_BUILDER') return;
      const rect = canvas.getBoundingClientRect();
      const world = screenToWorld(e.clientX - rect.left, e.clientY - rect.top, renderer.camera);
      const metrics = getGridMetrics(16, 16);
      const cell = worldToCell(world.x, world.y, metrics.originX, metrics.originY, 16, 16);
      if (cell) {
        const pickedTile = st.grid[cell.row][cell.col];
        setActiveBrush(pickedTile);
        showToast(isJa ? `🎨 スポイト：タイルを選択しました` : `🎨 Eyedropper: Picked tile`, 1500);
      }
    };

    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('touchstart', handleTouchStart, { passive: true });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);
    canvas.addEventListener('contextmenu', handleContextMenu);

    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [isJa, showToast]);

  // 6. Navigation Mode D-Pad Movement
  const moveTraveler = useCallback(
    (direction: 'N' | 'S' | 'E' | 'W', spokenPhrase?: string) => {
      if (!isMuted) soundEffects.playCardFlip();
      if (spokenPhrase) speakText(spokenPhrase);

      setTraveler(prev => {
        let nextR = prev.row;
        let nextC = prev.col;
        if (direction === 'N') nextR = Math.max(0, prev.row - 1);
        if (direction === 'S') nextR = Math.min(15, prev.row + 1);
        if (direction === 'E') nextC = Math.min(15, prev.col + 1);
        if (direction === 'W') nextC = Math.max(0, prev.col - 1);

        // Check if reached the active mission goal!
        if (nextR === activeMission.targetRow && nextC === activeMission.targetCol) {
          if (!isMuted) soundEffects.playFanfare();
          setStarsAwarded(s => s + 100);
          showToast(
            isJa
              ? `🎉 ゴール到着！ ${activeMission.icon} ${activeMission.nameJa} (${activeMission.nameEn}) を見つけたよ！ (+100⭐)`
              : `🎉 Goal Reached! You arrived at the ${activeMission.nameEn}! (+100⭐)`,
            3800
          );
          speakText(`Stop! Here it is! Welcome to the ${activeMission.nameEn}!`);
        }

        return { row: nextR, col: nextC, dir: direction };
      });
    },
    [activeMission, isMuted, isJa, showToast, speakText]
  );

  // Keyboard navigation for Navigator Mode & Ctrl+Z Undo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isInstructionsOpen || isSettingsOpen) return;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && mode === 'FREE_COOP_BUILDER') {
        e.preventDefault();
        if (undoStackRef.current.length > 0) {
          if (!isMuted) soundEffects.playCardFlip();
          const prevGrid = undoStackRef.current.pop();
          if (prevGrid) setGrid(prevGrid);
        }
        return;
      }

      if (mode !== 'TOWN_NAVIGATOR') return;
      if (['ArrowUp', 'KeyW'].includes(e.code)) {
        e.preventDefault();
        moveTraveler('N');
      } else if (['ArrowDown', 'KeyS'].includes(e.code)) {
        e.preventDefault();
        moveTraveler('S');
      } else if (['ArrowLeft', 'KeyA'].includes(e.code)) {
        e.preventDefault();
        moveTraveler('W');
      } else if (['ArrowRight', 'KeyD'].includes(e.code)) {
        e.preventDefault();
        moveTraveler('E');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, isMuted, isInstructionsOpen, isSettingsOpen, moveTraveler]);

  // 7. Full-Island Snapshot PNG Export
  const exportSnapshot = () => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    if (!isMuted) soundEffects.playCardFlip();

    try {
      const displayGrid = mode === 'BLUEPRINT_INFO_GAP' && role === 'architect_b' ? masterGrid : grid;
      const dataUrl = renderer.exportFullIslandPng(displayGrid);
      const link = document.createElement('a');
      link.download = `dream-town-${Date.now()}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast(isJa ? '📸 街全体の高画質PNG画像を保存しました！' : '📸 Saved full-island PNG snapshot!', 2500);
    } catch (err) {
      console.error('Snapshot failed:', err);
    }
  };

  // 8. Reset / Preset Loader
  const handleSelectPreset = (presetKey: string) => {
    if (!tilesData) return;
    undoStackRef.current.push(grid.map(r => [...r]));
    if (presetKey === 'blueprint') {
      loadBlueprintRound(blueprintRound);
      return;
    }
    if (presetKey === 'meadow') {
      setGrid(createEmptyGrid(16, 16));
      return;
    }
    const presetGrid = tilesData.presets[presetKey];
    if (presetGrid) {
      setGrid(JSON.parse(JSON.stringify(presetGrid)));
      if (rendererRef.current) rendererRef.current.centerView(16, 16);
    }
  };

  const handleUndo = () => {
    if (undoStackRef.current.length === 0) return;
    if (!isMuted) soundEffects.playCardFlip();
    const prevGrid = undoStackRef.current.pop();
    if (prevGrid) setGrid(prevGrid);
  };

  // Dynamic Presentation Analysis for Mode 3
  const presentationData = useMemo(
    () => analyzeTownForPresentation(grid, tilesData),
    [grid, tilesData]
  );

  const shouldBlurForPeekShield =
    mode === 'BLUEPRINT_INFO_GAP' && role === 'architect_b' && peekShieldActive && !isPeeking;

  return (
    <div className="relative w-full h-full min-h-[600px] bg-slate-950 overflow-hidden select-none flex flex-col">
      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-full border-4 border-emerald-400 border-t-transparent animate-spin" />
          <span className="text-sm font-black text-emerald-400 tracking-wider">
            ドリームタウン 256タイル 読込中... (Loading Isometric Studio)
          </span>
        </div>
      )}

      {/* 1. Header Toolbar (Rule 9 Compliant Non-Wrapping Layout) */}
      <header className="flex items-center justify-between px-3 sm:px-5 py-2 bg-slate-900 border-b border-slate-800 text-white min-h-[50px] shrink-0 z-30 shadow-md gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1 truncate">
          <span className="text-xl sm:text-2xl shrink-0">🏘️</span>
          <h1 className="font-black text-sm sm:text-base text-slate-100 truncate">
            {isJa ? 'ドリームタウン設計士' : 'Dream Town Architects'}
          </h1>

          {/* Quick 3-Mode Segmented Switcher */}
          <div className="hidden md:flex items-center p-0.5 rounded-xl bg-slate-950 border border-slate-800 shrink-0">
            <button
              type="button"
              onClick={() => setMode('BLUEPRINT_INFO_GAP')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                mode === 'BLUEPRINT_INFO_GAP'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {isJa ? '1. 情報ギャップ' : '1. Info-Gap'}
            </button>
            <button
              type="button"
              onClick={() => setMode('TOWN_NAVIGATOR')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                mode === 'TOWN_NAVIGATOR'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {isJa ? '2. 道案内' : '2. Navigator'}
            </button>
            <button
              type="button"
              onClick={() => setMode('FREE_COOP_BUILDER')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                mode === 'FREE_COOP_BUILDER'
                  ? 'bg-cyan-500 text-slate-950 shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {isJa ? '3. 自由制作' : '3. Free Build'}
            </button>
          </div>

          {/* Stars Pill */}
          {starsAwarded > 0 && (
            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-500 text-slate-950 shrink-0 shadow-xs">
              <span>⭐</span>
              <span>{starsAwarded}</span>
            </span>
          )}
        </div>

        {/* Right Controls (Rule 9: shrink-0 flex-nowrap) */}
        <div className="flex items-center gap-1.5 shrink-0 flex-nowrap">
          {/* Mode 3: Showcase Presentation Dialog Button */}
          {mode === 'FREE_COOP_BUILDER' && (
            <button
              type="button"
              onClick={() => setShowPresentationCard(true)}
              className="flex items-center gap-1 px-2.5 h-8 rounded-xl text-xs font-black bg-cyan-600 hover:bg-cyan-500 text-white shadow-xs active:scale-95 transition-all cursor-pointer"
            >
              <Sparkles size={14} />
              <span className="hidden sm:inline">{isJa ? '英語発表カード' : 'Present'}</span>
            </button>
          )}

          {/* Landmark Labels Toggle */}
          <button
            type="button"
            onClick={() => setShowLandmarkLabels(prev => !prev)}
            className={`flex items-center gap-1 px-2.5 h-8 rounded-xl text-xs font-black border transition-all cursor-pointer ${
              showLandmarkLabels
                ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
            }`}
            title={isJa ? '建物の名前ラベル表示' : 'Toggle Landmark Labels'}
          >
            <Tag size={13} />
            <span className="hidden lg:inline">{isJa ? '目印ラベル' : 'Labels'}</span>
          </button>

          {/* Snapshot PNG */}
          <button
            type="button"
            onClick={exportSnapshot}
            className="flex items-center gap-1 px-2.5 h-8 rounded-xl text-xs font-black bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 active:scale-95 transition-all cursor-pointer"
            title="Snapshot PNG"
          >
            <Camera size={14} />
            <span className="hidden xl:inline">{isJa ? '画像保存' : 'Save PNG'}</span>
          </button>

          {/* Undo */}
          {mode === 'FREE_COOP_BUILDER' && (
            <button
              type="button"
              onClick={handleUndo}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 active:scale-95 transition-all cursor-pointer"
              title="Undo (Ctrl+Z)"
            >
              <RotateCcw size={15} />
            </button>
          )}

          {/* Language Toggle */}
          <button
            type="button"
            onClick={() => setIsJa(prev => !prev)}
            className="px-2.5 h-8 rounded-xl text-xs font-black bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 active:scale-95 transition-all cursor-pointer"
            title="Switch Language"
          >
            {isJa ? 'EN' : '日'}
          </button>

          {/* Mute Toggle */}
          <button
            type="button"
            onClick={toggleMute}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 active:scale-95 transition-all cursor-pointer"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX size={15} className="text-rose-400" /> : <Volume2 size={15} />}
          </button>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 active:scale-95 transition-all cursor-pointer"
            title="Toggle Theme"
          >
            {theme === 'dark' ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} />}
          </button>

          {/* Tutorial Modal */}
          <button
            type="button"
            onClick={() => setIsInstructionsOpen(true)}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 active:scale-95 transition-all cursor-pointer"
            title="How to Play"
          >
            <HelpCircle size={15} />
          </button>

          {/* Settings Modal */}
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 active:scale-95 transition-all cursor-pointer"
            title="Settings"
          >
            <Settings size={15} />
          </button>

          {/* Exit */}
          {onExit && (
            <button
              type="button"
              onClick={onExit}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-rose-950 text-rose-300 border border-rose-800 hover:bg-rose-900 active:scale-95 transition-all cursor-pointer"
              title="Exit"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </header>

      {/* 2a. Mode 1: Blueprint Info-Gap Top Confidence Speech & Target Dock */}
      {mode === 'BLUEPRINT_INFO_GAP' && activeTarget && (
        <div className="px-3 sm:px-5 py-2 bg-slate-900/95 border-b border-slate-800 flex flex-col gap-2 text-xs sm:text-sm text-slate-200 z-20 shrink-0">
          {/* Top Row: Role Switcher + Target Building Pills + Swap Roles */}
          <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
            {/* Role A / B Instant Toggle */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => setRole('architect_a')}
                className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  role === 'architect_a'
                    ? 'bg-rose-500 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                📱 {isJa ? 'A: 質問して建てる' : 'A: Ask & Build'}
              </button>
              <button
                type="button"
                onClick={() => setRole('architect_b')}
                className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  role === 'architect_b'
                    ? 'bg-emerald-500 text-slate-950 shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🗺️ {isJa ? 'B: ヒントを教える' : 'B: Blueprint Guide'}
              </button>
            </div>

            {/* Selectable Target Building Pills */}
            <div className="flex items-center gap-1.5 shrink-0">
              {puzzleTargets.map((t, idx) => {
                const isCurrent = idx === activePuzzleIndex;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setActivePuzzleIndex(idx);
                      speakText(role === 'architect_a' ? `Where is the ${t.nameEn}?` : t.clueEn);
                    }}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                      t.placed
                        ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                        : isCurrent
                        ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-md scale-105'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    <span>{t.icon}</span>
                    <span>{isJa ? t.nameJa : t.nameEn}</span>
                    {t.placed ? (
                      <CheckCircle2 size={13} className="text-emerald-400" />
                    ) : (
                      <span className="text-[10px] opacity-80">?{idx + 1}</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Right: Peek-Shield (for B) & Swap Roles / Round 2 */}
            <div className="flex items-center gap-1.5 shrink-0">
              {role === 'architect_b' && (
                <button
                  type="button"
                  onClick={() => setPeekShieldActive(prev => !prev)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                    peekShieldActive
                      ? 'bg-indigo-600 border-indigo-400 text-white'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                  }`}
                  title={isJa ? '隣の人に見えないように設計図を隠すモード' : 'Privacy curtain so partner cannot peek'}
                >
                  {peekShieldActive ? <EyeOff size={13} /> : <Eye size={13} />}
                  <span>{isJa ? 'のぞき見防止' : 'Privacy Shield'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleSwapRolesAndRound}
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 active:scale-95 transition-all cursor-pointer"
                title={isJa ? 'AとBを交代して新しい問題セットにする' : 'Swap roles and load new blueprint targets'}
              >
                <RefreshCw size={13} />
                <span>{isJa ? `交代 (第${blueprintRound === 1 ? 2 : 1}問へ)` : 'Swap Roles'}</span>
              </button>
            </div>
          </div>

          {/* Bottom Row: Scaffolded English Dialogue Prompt + Audio Button */}
          <div className="flex items-center justify-between gap-3 bg-slate-950/90 px-3.5 py-2 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <span className="text-2xl shrink-0">{activeTarget.icon}</span>

              {role === 'architect_a' ? (
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-rose-400 font-black text-xs">
                      🗣️ {isJa ? 'パートナーに英語で質問しよう：' : 'Ask your partner:'}
                    </span>
                    <span className="text-white text-sm sm:text-base font-black">
                      &ldquo;Excuse me! Where is the {activeTarget.nameEn}?&rdquo;
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-bold truncate">
                    {isJa
                      ? `（？マークの土地から「${activeTarget.nameJa}」の正しい場所をタップしよう！）`
                      : `(Listen to your partner's clue and tap the matching ? plot on the map!)`}
                  </span>
                </div>
              ) : (
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-emerald-400 font-black text-xs">
                      🗣️ {isJa ? 'パートナーに英語でヒントを教えよう：' : 'Tell your partner:'}
                    </span>
                    <span className="text-white text-sm sm:text-base font-black">
                      &ldquo;{activeTarget.clueEn}&rdquo;
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-bold truncate">
                    （{activeTarget.clueJa}）
                  </span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() =>
                speakText(
                  role === 'architect_a'
                    ? `Excuse me! Where is the ${activeTarget.nameEn}?`
                    : activeTarget.clueEn
                )
              }
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shrink-0 shadow-md active:scale-95 transition-all cursor-pointer"
            >
              <Volume2 size={15} />
              <span>{isJa ? '発音を聞く' : 'Listen'}</span>
            </button>
          </div>
        </div>
      )}

      {/* 2b. Mode 2: Navigator Confidence Speech & Mission Dock */}
      {mode === 'TOWN_NAVIGATOR' && (
        <div className="px-3 sm:px-5 py-2 bg-slate-900/95 border-b border-slate-800 flex flex-col gap-2 text-xs sm:text-sm text-slate-200 z-20 shrink-0">
          {/* Top Row: Guide/Traveler Role + 5 Destination Missions */}
          <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => setNavigatorRole('traveler')}
                className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  navigatorRole === 'traveler'
                    ? 'bg-sky-500 text-slate-950 shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🚶 {isJa ? '探検家 (動かす人)' : 'Traveler'}
              </button>
              <button
                type="button"
                onClick={() => setNavigatorRole('guide')}
                className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  navigatorRole === 'guide'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🧭 {isJa ? 'ガイド (道案内する人)' : 'Guide'}
              </button>
            </div>

            {/* Destination Mission Pills */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[11px] font-black text-slate-400">
                {isJa ? '目的地：' : 'Goal:'}
              </span>
              {NAVIGATOR_MISSIONS.map((m, idx) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleSelectMission(idx)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                    idx === missionIndex
                      ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-md scale-105'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  <span>{m.icon}</span>
                  <span>{isJa ? m.nameJa : m.nameEn}</span>
                </button>
              ))}
            </div>

            {/* Mystery Goal Toggle for Traveler */}
            {navigatorRole === 'traveler' && (
              <button
                type="button"
                onClick={() => setHideGoalForTraveler(prev => !prev)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black border shrink-0 transition-all cursor-pointer ${
                  hideGoalForTraveler
                    ? 'bg-purple-600 border-purple-400 text-white'
                    : 'bg-slate-800 border-slate-700 text-slate-300'
                }`}
              >
                {hideGoalForTraveler ? <EyeOff size={13} /> : <Eye size={13} />}
                <span>{isJa ? 'GOALマーカーを隠す' : 'Hide Goal Pin'}</span>
              </button>
            )}
          </div>

          {/* Bottom Row: Spoken Direction Phrases */}
          <div className="flex items-center justify-between gap-2 bg-slate-950/90 px-3.5 py-1.5 rounded-2xl border border-slate-800 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xl shrink-0">{activeMission.icon}</span>
              <div className="flex flex-col min-w-0">
                <span className="text-amber-300 font-black text-xs sm:text-sm truncate">
                  {navigatorRole === 'guide'
                    ? `🗣️ "${activeMission.hintEn}"`
                    : `🗣️ "Where is the ${activeMission.nameEn}?"`}
                </span>
                <span className="text-[11px] text-slate-400 font-bold truncate">
                  {navigatorRole === 'guide'
                    ? `（${activeMission.hintJa}）`
                    : isJa
                    ? `（ガイドの英語を聞いて、${activeMission.icon} ${activeMission.nameJa} まで進もう！）`
                    : `(Follow your partner's English directions to reach the ${activeMission.nameEn}!)`}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => speakText('Go straight!')}
                className="px-2.5 py-1 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-black hover:bg-amber-500/30 transition-all cursor-pointer"
              >
                🔊 Go straight
              </button>
              <button
                type="button"
                onClick={() => speakText('Turn left!')}
                className="px-2.5 py-1 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-black hover:bg-amber-500/30 transition-all cursor-pointer"
              >
                🔊 Turn left
              </button>
              <button
                type="button"
                onClick={() => speakText('Turn right!')}
                className="px-2.5 py-1 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-black hover:bg-amber-500/30 transition-all cursor-pointer"
              >
                🔊 Turn right
              </button>
              <button
                type="button"
                onClick={() => speakText(`Stop! It's the ${activeMission.nameEn}!`)}
                className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-black hover:bg-emerald-500/30 transition-all cursor-pointer"
              >
                🔊 Stop!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-28 left-1/2 -translate-x-1/2 z-40 px-5 py-2.5 rounded-2xl bg-amber-500 text-slate-950 font-black text-xs sm:text-sm md:text-base shadow-2xl border-2 border-amber-200 animate-bounce max-w-[90vw] text-center pointer-events-none">
          {toastMessage}
        </div>
      )}

      {/* 3. Main Isometric Canvas Area */}
      <div className="relative flex-1 w-full h-full overflow-hidden">
        <canvas
          ref={canvasRef}
          className={`w-full h-full cursor-crosshair touch-none transition-all duration-200 ${
            shouldBlurForPeekShield ? 'blur-xl scale-105 brightness-50' : ''
          }`}
        />

        {/* Peek-Shield Hold Overlay for Architect B */}
        {mode === 'BLUEPRINT_INFO_GAP' && role === 'architect_b' && peekShieldActive && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center pointer-events-none">
            <button
              type="button"
              onPointerDown={() => setIsPeeking(true)}
              onPointerUp={() => setIsPeeking(false)}
              onPointerLeave={() => setIsPeeking(false)}
              className="pointer-events-auto px-6 py-4 rounded-3xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm sm:text-base shadow-2xl border-2 border-indigo-300 flex items-center gap-2.5 active:scale-95 transition-all cursor-pointer"
            >
              <Eye size={20} />
              <span>
                {isPeeking
                  ? isJa
                    ? '設計図を表示中...'
                    : 'Showing Master Blueprint...'
                  : isJa
                  ? '🫣 ここを押し続けて設計図を見る (Hold to Peek)'
                  : '🫣 Hold to Peek at Master Blueprint'}
              </span>
            </button>
          </div>
        )}

        {/* Navigator Mode D-Pad Controls */}
        {mode === 'TOWN_NAVIGATOR' && (
          <div className="absolute bottom-5 right-5 z-30 flex flex-col items-center gap-1.5 bg-slate-900/92 p-3 rounded-3xl border-2 border-amber-500/60 shadow-2xl backdrop-blur-md">
            <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider mb-0.5">
              {isJa ? '道案内コントローラー' : 'Direction Pad'}
            </span>
            <button
              type="button"
              onClick={() => moveTraveler('N', 'Go straight!')}
              className="w-12 h-12 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black flex flex-col items-center justify-center shadow-md active:scale-90 transition-all cursor-pointer"
              title="North (Up)"
            >
              <ArrowUp size={20} />
            </button>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => moveTraveler('W', 'Turn left!')}
                className="w-12 h-12 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black flex items-center justify-center shadow-md active:scale-90 transition-all cursor-pointer"
                title="West (Left)"
              >
                <ArrowLeft size={20} />
              </button>
              <button
                type="button"
                onClick={() => {
                  setTraveler({
                    row: activeMission.startRow,
                    col: activeMission.startCol,
                    dir: 'E'
                  });
                  speakText('Start!');
                }}
                className="w-12 h-12 rounded-2xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-[10px] font-black flex items-center justify-center shadow-inner active:scale-90 transition-all cursor-pointer"
                title="Reset to Start"
              >
                START
              </button>
              <button
                type="button"
                onClick={() => moveTraveler('E', 'Turn right!')}
                className="w-12 h-12 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black flex items-center justify-center shadow-md active:scale-90 transition-all cursor-pointer"
                title="East (Right)"
              >
                <ArrowRight size={20} />
              </button>
            </div>
            <button
              type="button"
              onClick={() => moveTraveler('S', 'Go straight!')}
              className="w-12 h-12 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black flex items-center justify-center shadow-md active:scale-90 transition-all cursor-pointer"
              title="South (Down)"
            >
              <ArrowDown size={20} />
            </button>
          </div>
        )}

        {/* Center Camera & Center-Locked Zoom Overlay */}
        <div className="absolute bottom-4 left-4 z-20 flex items-center gap-1.5 bg-slate-900/85 p-1.5 rounded-2xl border border-slate-700/60 shadow-lg backdrop-blur-sm">
          <button
            type="button"
            onClick={() => {
              if (rendererRef.current) {
                rendererRef.current.centerView(16, 16);
              }
            }}
            className="px-2.5 py-1 rounded-xl text-xs font-black text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
          >
            {isJa ? '視点リセット' : 'Center View'}
          </button>
          <button
            type="button"
            onClick={() => {
              const canvas = canvasRef.current;
              const renderer = rendererRef.current;
              if (canvas && renderer) {
                const rect = canvas.getBoundingClientRect();
                renderer.zoomAroundPoint(renderer.camera.zoom * 1.22, rect.width / 2, rect.height / 2);
              }
            }}
            className="w-7 h-7 rounded-xl text-sm font-black text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => {
              const canvas = canvasRef.current;
              const renderer = rendererRef.current;
              if (canvas && renderer) {
                const rect = canvas.getBoundingClientRect();
                renderer.zoomAroundPoint(renderer.camera.zoom * 0.82, rect.width / 2, rect.height / 2);
              }
            }}
            className="w-7 h-7 rounded-xl text-sm font-black text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            -
          </button>
        </div>
      </div>

      {/* 4. Bottom Palette Tray (Mode 3: Free Co-op Town Builder — Curated 36 + All 256 Studio Tiles!) */}
      {mode === 'FREE_COOP_BUILDER' && (
        <div className="bg-slate-900/95 border-t border-slate-800 p-2 sm:p-3 flex flex-col gap-2 z-20 shrink-0">
          {/* Palette Scope Switcher & Category Filter Chips */}
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-0.5 no-scrollbar">
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Toggle between Curated MEXT 36 Tiles and All 256 Studio Tiles */}
              <div className="flex items-center bg-slate-950 p-0.5 rounded-xl border border-slate-800 mr-1">
                <button
                  type="button"
                  onClick={() => {
                    setPaletteScope('curated');
                    setActiveCategory('building');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                    paletteScope === 'curated'
                      ? 'bg-emerald-500 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  📚 {isJa ? '教科書36タイル' : '36 Textbook Tiles'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPaletteScope('all256');
                    setActiveCategory('building');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                    paletteScope === 'all256'
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  ✨ {isJa ? '全256タイル' : 'All 256 Studio Tiles'}
                </button>
              </div>

              {paletteScope === 'curated' ? (
                <>
                  <button
                    type="button"
                    onClick={() => setActiveCategory('building')}
                    className={`px-3 py-1 rounded-xl text-xs font-black shrink-0 transition-all cursor-pointer ${
                      activeCategory === 'building'
                        ? 'bg-rose-500 text-white shadow-md'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    🏛️ {isJa ? '建物・施設' : 'Buildings'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveCategory('nature')}
                    className={`px-3 py-1 rounded-xl text-xs font-black shrink-0 transition-all cursor-pointer ${
                      activeCategory === 'nature'
                        ? 'bg-emerald-500 text-slate-950 shadow-md'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    🌳 {isJa ? '公園・自然' : 'Parks & Nature'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveCategory('landmark')}
                    className={`px-3 py-1 rounded-xl text-xs font-black shrink-0 transition-all cursor-pointer ${
                      activeCategory === 'landmark'
                        ? 'bg-amber-500 text-slate-950 shadow-md'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    ⛩️ {isJa ? '名所・動物' : 'Landmarks & Sea'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveCategory('road')}
                    className={`px-3 py-1 rounded-xl text-xs font-black shrink-0 transition-all cursor-pointer ${
                      activeCategory === 'road'
                        ? 'bg-cyan-500 text-slate-950 shadow-md'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    🛣️ {isJa ? '道路・橋' : 'Roads & Bridges'}
                  </button>
                </>
              ) : (
                <>
                  {[
                    { key: 'building', labelJa: '🏛️ 建築 (56)', labelEn: '🏛️ Buildings (56)' },
                    { key: 'road', labelJa: '🛣️ 道路・水路 (36)', labelEn: '🛣️ Roads & Canals (36)' },
                    { key: 'decoration', labelJa: '⛲ 広場・公園 (12)', labelEn: '⛲ Plazas (12)' },
                    { key: 'terrain', labelJa: '⛰️ 地形・坂 (44)', labelEn: '⛰️ Terrain (44)' },
                    { key: 'biome', labelJa: '🏝️ 海・自然 (58)', labelEn: '🏝️ Biomes & Sea (58)' },
                    { key: 'landmark', labelJa: '🌋 名所・動物 (50)', labelEn: '🌋 Landmarks (50)' }
                  ].map(cat => (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => setActiveCategory(cat.key)}
                      className={`px-3 py-1 rounded-xl text-xs font-black shrink-0 transition-all cursor-pointer ${
                        activeCategory === cat.key
                          ? 'bg-amber-500 text-slate-950 shadow-md'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      {isJa ? cat.labelJa : cat.labelEn}
                    </button>
                  ))}
                </>
              )}
            </div>

            {/* Quick Meadow Eraser Button */}
            <button
              type="button"
              onClick={() => {
                setActiveBrush('d12_meadow_wildflowers');
                if (!isMuted) soundEffects.playCardFlip();
              }}
              className={`px-3 py-1 rounded-xl text-xs font-black shrink-0 border transition-all cursor-pointer ${
                activeBrush === 'd12_meadow_wildflowers'
                  ? 'bg-emerald-500 text-slate-950 border-emerald-300 shadow-md'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              🌱 {isJa ? '草原に戻す (消しゴム)' : 'Meadow Eraser'}
            </button>
          </div>

          {/* Tile Items Horizontal Scroll Tray */}
          <div className="flex items-center gap-2 overflow-x-auto py-1 no-scrollbar min-h-[68px]">
            {paletteScope === 'curated'
              ? CURATED_TEXTBOOK_TILES.filter(
                  t => activeCategory === 'all' || t.category === activeCategory
                ).map(t => {
                  const spriteUri = tilesData?.sprites[t.id];
                  const isSelected = activeBrush === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        if (!isMuted) soundEffects.playCardFlip();
                        setActiveBrush(t.id);
                        speakText(t.en);
                      }}
                      className={`flex flex-col items-center justify-center p-1.5 rounded-2xl min-w-[78px] sm:min-w-[86px] h-[66px] border-2 transition-all shrink-0 cursor-pointer ${
                        isSelected
                          ? 'border-emerald-400 bg-emerald-950/60 ring-2 ring-emerald-400/40 scale-105 shadow-md'
                          : 'border-slate-800 bg-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      {spriteUri ? (
                        <img src={spriteUri} alt={t.en} className="w-9 h-9 object-contain" />
                      ) : (
                        <span className="text-xl">{t.icon}</span>
                      )}
                      <span className="text-[10px] font-black text-slate-200 truncate w-full text-center mt-0.5">
                        {isJa ? t.ja : t.en}
                      </span>
                    </button>
                  );
                })
              : (tilesData?.tiles || [])
                  .filter(t => t.category === activeCategory)
                  .map(t => {
                    const spriteUri = tilesData?.sprites[t.id];
                    const isSelected = activeBrush === t.id;
                    const shortLabel = t.label.replace(/\s*\(.*?\)\s*/g, '');
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          if (!isMuted) soundEffects.playCardFlip();
                          setActiveBrush(t.id);
                          speakText(shortLabel);
                        }}
                        className={`flex flex-col items-center justify-center p-1.5 rounded-2xl min-w-[82px] sm:min-w-[92px] h-[66px] border-2 transition-all shrink-0 cursor-pointer ${
                          isSelected
                            ? 'border-amber-400 bg-amber-950/60 ring-2 ring-amber-400/40 scale-105 shadow-md'
                            : 'border-slate-800 bg-slate-800/80 hover:border-slate-700'
                        }`}
                        title={t.doc || t.label}
                      >
                        {spriteUri && (
                          <img src={spriteUri} alt={t.label} className="w-9 h-9 object-contain" />
                        )}
                        <span className="text-[10px] font-black text-slate-200 truncate w-full text-center mt-0.5 px-1">
                          {shortLabel}
                        </span>
                      </button>
                    );
                  })}
          </div>
        </div>
      )}

      {/* 5. Mode 3: Dynamic Presentation Showcase Dialog Modal */}
      {showPresentationCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md md:max-w-4xl max-h-[92dvh] overflow-y-auto bg-slate-900 border-2 border-cyan-500 rounded-3xl p-5 sm:p-6 shadow-2xl text-white flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3 shrink-0">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Sparkles size={20} className="text-cyan-400 shrink-0" />
                <h3 className="font-black text-base sm:text-lg text-cyan-300 truncate">
                  {isJa ? 'ドリームタウン 英語発表シート（自動作成）' : 'Dream Town Presentation Script'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPresentationCard(false)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-400 font-bold">
              {isJa
                ? '✨ あなたが実際に配置した建物や名所から、発表用の英語スクリプトを自動で作りました！'
                : '✨ Automatically generated from the actual buildings and landmarks placed in your town!'}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 items-stretch">
              {/* Dynamic English Presentation Script Box */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-sm sm:text-base leading-relaxed flex flex-col gap-2 font-black text-emerald-300">
                <span className="text-[11px] uppercase tracking-wider text-emerald-400/80 font-black">
                  {isJa ? '英語スピーチ原稿' : 'English Script'}
                </span>
                {presentationData.linesEn.map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>

              {/* Japanese Translation Reference */}
              <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-800 text-xs sm:text-sm text-slate-200 flex flex-col gap-1.5 font-bold">
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-black">
                  {isJa ? '日本語訳・ガイド' : 'Japanese Translation'}
                </span>
                {presentationData.linesJa.map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 flex-nowrap overflow-x-auto no-scrollbar shrink-0">
              <button
                type="button"
                onClick={exportSnapshot}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-black text-xs border border-slate-700 active:scale-95 transition-all cursor-pointer whitespace-nowrap shrink-0"
              >
                <Camera size={15} className="shrink-0" />
                <span>{isJa ? '街の画像を保存' : 'Save Town PNG'}</span>
              </button>

              <div className="flex items-center gap-2 shrink-0 flex-nowrap">
                <button
                  type="button"
                  onClick={() => speakText(presentationData.speechText)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs active:scale-95 transition-all shadow-md cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Volume2 size={16} className="shrink-0" />
                  <span>{isJa ? 'お手本音声を聞く' : 'Listen to Model'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPresentationCard(false)}
                  className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-black text-xs transition-all cursor-pointer whitespace-nowrap shrink-0"
                >
                  {isJa ? '閉じる' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tutorial Modal */}
      <DreamTownInstructionsModal
        isOpen={isInstructionsOpen}
        onClose={() => setIsInstructionsOpen(false)}
      />

      {/* Settings Modal */}
      <DreamTownSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        activeMode={mode}
        onSelectMode={setMode}
        activeRole={role}
        onSelectRole={setRole}
        blueprintRound={blueprintRound}
        onSelectBlueprintRound={r => loadBlueprintRound(r)}
        showLandmarkLabels={showLandmarkLabels}
        onToggleLandmarkLabels={() => setShowLandmarkLabels(prev => !prev)}
        voiceAssistEnabled={voiceAssist}
        onToggleVoiceAssist={() => setVoiceAssist(prev => !prev)}
        onSelectPreset={handleSelectPreset}
        isJa={isJa}
      />
    </div>
  );
};
