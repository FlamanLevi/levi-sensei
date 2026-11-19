import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import {
  createClassroomRenderer,
  createRoomEnvironmentPMREM,
  detectClassroomGpuProfile,
  disposeObject3D,
  ClassroomGpuProfile,
} from '@/utils/classroom3d';
import { generateRandomTown, TownMap, PlacedBuilding } from './townGenerator';
import { buildPlayerAvatar, PlayerAvatar } from './models/playerAvatar';
import { buildBicycleMesh } from './models/bicycle';
import { buildMicroKart } from '../suzuka_grand_prix/engine/MicroKartBuilder.js';
import { updateTrafficSignals, setStreetlightLevel } from './models/roadTiles';
import { townAudio, BUILDING_SOUND_LABELS } from './townAudio';
import { TownNavigatorHostContainer } from './TownNavigatorHostContainer';
import { soundEffects } from '@/services/soundEffects';
import { useAudio } from '@/context/AudioContext';
import { useClassroom } from '@/context/ClassroomContext';
import { 
  Compass, 
  Volume2, 
  Navigation, 
  RotateCw, 
  Sun, 
  Sunrise,
  Sunset, 
  Moon, 
  CloudRain,
  CloudSnow,
  Flower2,
  Camera, 
  Eye, 
  Sparkles, 
  ArrowLeft, 
  Target, 
  Bell, 
  Zap, 
  Layers, 
  Building2,
  Trophy,
  HelpCircle,
  MapPin,
  Radio,
  Bike
} from 'lucide-react';
import { 
  computeManhattanRoadPath, 
  buildMextStepByStepScript, 
  Point2D,
  getLeftHandLaneOffset,
} from './navigationLogic';
import { createLivingTownController, LivingTownController } from './livingTownSystem';
import { VirtualJoystickPad } from './VirtualJoystickPad';
import { TownNavigatorDispatcher } from './TownNavigatorDispatcher';
import {
  buildAtmosphericSkybox,
  updateAtmosphericSkybox,
  buildTexturedGroundPlane,
  buildPerimeterScenery,
  updatePerimeterSceneryLighting,
} from './environmentScenery';
import {
  TimeOfDay,
  WeatherMode,
  TIME_OF_DAY_ORDER,
  WEATHER_MODE_ORDER,
  TIME_OF_DAY_PRESETS,
  WEATHER_PRESETS,
  getCompositeAtmosphere,
  createWeatherParticleController,
  WeatherParticleController,
  collectSceneWeatherMaterials,
  SceneMaterialBuckets,
  applyAtmosphereToMaterials,
} from './weatherAndTimeSystem';

const MAX_ROUTE_CHEVRONS = 120;
const _camTarget = new THREE.Vector3();
const _camResolved = new THREE.Vector3();
const _chevronDummy = new THREE.Object3D();

function isInsideJunctionWindow(v: number): boolean {
  return Math.abs(v) < 6.4 || Math.abs(Math.abs(v) - 33) < 3.4 || Math.abs(Math.abs(v) - 63) < 3.4;
}

function shortestAngleDiff(from: number, to: number): number {
  let diff = ((to - from + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

function resolveCameraWallCollision(
  origin: THREE.Vector3,
  desired: THREE.Vector3,
  buildings: PlacedBuilding[],
  out: THREE.Vector3
): void {
  out.copy(desired);
  const dx = desired.x - origin.x;
  const dz = desired.z - origin.z;
  const fullDist = Math.hypot(dx, dz);
  if (fullDist < 0.1 || buildings.length === 0) return;

  let bestT = 1.0;

  for (let i = 0; i < buildings.length; i++) {
    const b = buildings[i];
    const bDx = b.worldPos[0] - origin.x;
    const bDz = b.worldPos[2] - origin.z;
    if (bDx * bDx + bDz * bDz > 25 * 25) continue;

    const isRot90 = Math.abs(Math.sin(b.rotationY)) > 0.5;
    const halfW = (isRot90 ? b.depthMeters : b.widthMeters) / 2 - 0.35;
    const halfD = (isRot90 ? b.widthMeters : b.depthMeters) / 2 - 0.35;
    const minX = b.worldPos[0] - halfW;
    const maxX = b.worldPos[0] + halfW;
    const minZ = b.worldPos[2] - halfD;
    const maxZ = b.worldPos[2] + halfD;

    let tmin = 0.0;
    let tmax = 1.0;

    if (Math.abs(dx) < 1e-6) {
      if (origin.x < minX || origin.x > maxX) continue;
    } else {
      const invDx = 1.0 / dx;
      let t1 = (minX - origin.x) * invDx;
      let t2 = (maxX - origin.x) * invDx;
      if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) continue;
    }

    if (Math.abs(dz) < 1e-6) {
      if (origin.z < minZ || origin.z > maxZ) continue;
    } else {
      const invDz = 1.0 / dz;
      let t1 = (minZ - origin.z) * invDz;
      let t2 = (maxZ - origin.z) * invDz;
      if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) continue;
    }

    if (tmin > 0.05 && tmin < bestT) {
      bestT = tmin;
    }
  }

  if (bestT < 1.0) {
    const clampedDist = Math.max(1.6, bestT * fullDist - 0.45);
    const scale = clampedDist / fullDist;
    out.x = origin.x + dx * scale;
    out.z = origin.z + dz * scale;
  }
}

interface TownNavigatorProps {
  onExit?: () => void;
  onSwitchToInspector?: () => void;
  initialTimeOfDay?: TimeOfDay;
  initialWeather?: WeatherMode;
  onWeatherChange?: (weather: WeatherMode) => void;
  onTimeOfDayChange?: (time: TimeOfDay) => void;
}

export type TravelMode = 'WALK' | 'RUN' | 'BIKE' | 'KART';

export const TRAVEL_SPEEDS: Record<TravelMode, number> = {
  WALK: 6.0,  // 1 cell/s (30m block = 5.0s)
  RUN: 12.0,  // 2 cells/s (30m block = 2.5s)
  BIKE: 18.0, // 3 cells/s (30m block = 1.67s)
  KART: 24.0, // 4 cells/s (30m block = 1.25s)
};

type CameraViewMode = 'CHASE' | 'FIRST_PERSON' | 'ISOMETRIC';
type QuestMode = 'GUIDED' | 'MYSTERY';

export const TownNavigator: React.FC<TownNavigatorProps> = ({
  onExit,
  onSwitchToInspector,
  initialTimeOfDay = 'DAY',
  initialWeather = 'CLEAR',
  onWeatherChange,
  onTimeOfDayChange,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const { activeGrade, activeClassId, activeSchool } = useClassroom();
  const gpuProfile = useMemo(() => detectClassroomGpuProfile(), []);
  const gpuProfileRef = useRef<ClassroomGpuProfile>(gpuProfile);

  const initialGrade: 5 | 6 = useMemo(() => {
    if (activeGrade === 'ES_G6' || (activeClassId && activeClassId.startsWith('6'))) {
      return 6;
    }
    return 5;
  }, [activeGrade, activeClassId]);

  // Game & Navigation state
  const [seed, setSeed] = useState<number>(() => Math.floor(Math.random() * 899999) + 100000);
  const [selectedGrade, setSelectedGrade] = useState<5 | 6>(initialGrade);
  const [questMode, setQuestMode] = useState<QuestMode>('GUIDED');
  const [showRoadArrows, setShowRoadArrows] = useState<boolean>(true);
  const [cameraMode, setCameraMode] = useState<CameraViewMode>('CHASE');
  const [timeOfDay, setTimeOfDayState] = useState<TimeOfDay>(initialTimeOfDay);
  const [weather, setWeatherState] = useState<WeatherMode>(initialWeather);
  const [travelMode, setTravelMode] = useState<TravelMode>('WALK');
  const [completedQuestCount, setCompletedQuestCount] = useState<number>(0);
  const [hostRaceMode, setHostRaceMode] = useState<boolean>(false);
  const { isMuted, toggleMute } = useAudio();

  const setTimeOfDay = useCallback((next: TimeOfDay) => {
    setTimeOfDayState(next);
    onTimeOfDayChange?.(next);
  }, [onTimeOfDayChange]);

  const setWeather = useCallback((next: WeatherMode) => {
    setWeatherState(next);
    onWeatherChange?.(next);
  }, [onWeatherChange]);

  const timeOfDayRef = useRef<TimeOfDay>(timeOfDay);
  useEffect(() => { timeOfDayRef.current = timeOfDay; }, [timeOfDay]);

  const weatherRef = useRef<WeatherMode>(weather);
  useEffect(() => { weatherRef.current = weather; }, [weather]);

  // Co-Op View Role (3D Street Traveler vs 2D Mission Control Dispatcher)
  const [viewRole, setViewRole] = useState<'TRAVELER_3D' | 'DISPATCHER_2D'>('TRAVELER_3D');
  const viewRoleRef = useRef<'TRAVELER_3D' | 'DISPATCHER_2D'>('TRAVELER_3D');
  useEffect(() => {
    viewRoleRef.current = viewRole;
  }, [viewRole]);
  const [partnerInstruction, setPartnerInstruction] = useState<{
    textEn: string;
    textJa: string;
    stepIndex: number;
  } | null>(null);

  // Town data state
  const [townMap, setTownMap] = useState<TownMap | null>(null);
  const [nearbyBuilding, setNearbyBuilding] = useState<PlacedBuilding | null>(null);
  const [nearbyDistance, setNearbyDistance] = useState<number>(0);

  // Mission / Quest mode state
  const [questTarget, setQuestTarget] = useState<PlacedBuilding | null>(null);
  const [questStartScript, setQuestStartScript] = useState<{ stepsEn: string[]; stepsJa: string[] } | null>(null);
  const [questScore, setQuestScore] = useState<number>(0);
  const [questCompletedToast, setQuestCompletedToast] = useState<string | null>(null);

  // Player position for HUD / Minimap (updated at 10Hz)
  const [playerHudState, setPlayerHudState] = useState<{ x: number; z: number; heading: number }>({
    x: 0,
    z: 0,
    heading: 0,
  });

  // Mutable refs for 60 FPS render loop
  const selectedGradeRef = useRef<5 | 6>(selectedGrade);
  useEffect(() => { selectedGradeRef.current = selectedGrade; }, [selectedGrade]);

  const questModeRef = useRef<QuestMode>(questMode);
  useEffect(() => { questModeRef.current = questMode; }, [questMode]);

  const cameraModeRef = useRef<CameraViewMode>(cameraMode);
  useEffect(() => { cameraModeRef.current = cameraMode; }, [cameraMode]);

  const travelModeRef = useRef<TravelMode>(travelMode);
  useEffect(() => { travelModeRef.current = travelMode; }, [travelMode]);

  const completedQuestCountRef = useRef<number>(completedQuestCount);
  useEffect(() => { completedQuestCountRef.current = completedQuestCount; }, [completedQuestCount]);

  const questTargetRef = useRef<PlacedBuilding | null>(questTarget);
  useEffect(() => { questTargetRef.current = questTarget; }, [questTarget]);

  const isMutedRef = useRef<boolean>(isMuted);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);

  // Progressive Quest Target Selector (Radius scaffolding from origin point)
  const getProgressiveQuestTarget = useCallback((
    map: TownMap,
    grade: 5 | 6,
    originX: number,
    originZ: number,
    questCount: number,
    excludeId?: string
  ): PlacedBuilding | null => {
    const eligible = map.buildingsList.filter(b => {
      if (b.tier === 0) return false;
      if (excludeId && b.id === excludeId) return false;
      if (grade === 5 && b.grade === 6) return false;
      return true;
    });

    if (eligible.length === 0) return null;

    const withDist = eligible.map(b => ({
      building: b,
      dist: Math.hypot(b.entrancePos[0] - originX, b.entrancePos[2] - originZ),
    }));

    // Stage 1 (Quests 0, 1 - on foot): 1-block radius (14m to 38m)
    if (questCount < 2) {
      const stage1 = withDist.filter(item => item.dist >= 14 && item.dist <= 38);
      if (stage1.length > 0) {
        const t1 = stage1.filter(item => item.building.tier === 1);
        const pool = t1.length > 0 ? t1 : stage1;
        return pool[Math.floor(Math.random() * pool.length)].building;
      }
    }

    // Stage 2 (Quests 2, 3 - bicycle cruise): 2-block radius (28m to 75m)
    if (questCount < 4) {
      const stage2 = withDist.filter(item => item.dist >= 28 && item.dist <= 75);
      if (stage2.length > 0) {
        const t2 = stage2.filter(item => item.building.tier === 2);
        const pool = t2.length > 0 ? t2 : stage2;
        return pool[Math.floor(Math.random() * pool.length)].building;
      }
    }

    // Stage 3 (Quests 4+ - kart open city): Full 144m city, prioritizing grand Tier 3 landmarks
    const stage3 = withDist.filter(item => item.dist >= 45);
    const t3 = stage3.filter(item => item.building.tier === 3);
    if (t3.length > 0) {
      return t3[Math.floor(Math.random() * t3.length)].building;
    }
    if (stage3.length > 0) {
      return stage3[Math.floor(Math.random() * stage3.length)].building;
    }

    // Fallback: Closest available
    withDist.sort((a, b) => a.dist - b.dist);
    return withDist[0].building;
  }, []);

  // Animation & Control references
  const keysPressed = useRef<Set<string>>(new Set());
  const touchForwardRef = useRef<number>(0);
  const touchTurnRef = useRef<number>(0);
  const velForwardRef = useRef<number>(0);
  const velTurnRef = useRef<number>(0);
  const snapTargetYawRef = useRef<number | null>(null);

  const triggerSnapTurn = useCallback((direction: 'LEFT' | 'RIGHT') => {
    const baseYaw = snapTargetYawRef.current ?? playerRotRef.current;
    const step = Math.PI / 2;
    const snapped = Math.round(baseYaw / step) * step;
    snapTargetYawRef.current = snapped + (direction === 'LEFT' ? step : -step);
  }, []);
  const triggerSnapTurnRef = useRef(triggerSnapTurn);
  useEffect(() => { triggerSnapTurnRef.current = triggerSnapTurn; }, [triggerSnapTurn]);

  const playerRef = useRef<PlayerAvatar | null>(null);
  const playerPosRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0.15, 0));
  const playerRotRef = useRef<number>(0); // 0 = facing South (+Z)
  const cameraPitchRef = useRef<number>(0.08);
  const isDraggingRef = useRef<boolean>(false);
  const dragPointerIdRef = useRef<number | null>(null);
  const lastPointerPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const routeInstancedRef = useRef<THREE.InstancedMesh | null>(null);
  const routeChevronPointsRef = useRef<Array<{ x: number; z: number; angle: number }>>([]);
  const materialBucketsRef = useRef<SceneMaterialBuckets | null>(null);
  const weatherControllerRef = useRef<WeatherParticleController | null>(null);

  // Decoupled town lifecycle & cached kinetic prop refs (zero getObjectByName per frame)
  const townMapRef = useRef<TownMap | null>(null);
  const mountedTownRef = useRef<TownMap | null>(null);
  const wheelRotorRef = useRef<THREE.Object3D | null>(null);
  const gondolasRef = useRef<THREE.Object3D[]>([]);
  const carouselRotorRef = useRef<THREE.Object3D | null>(null);
  const swingSeat0Ref = useRef<THREE.Object3D | null>(null);
  const swingSeat1Ref = useRef<THREE.Object3D | null>(null);
  const mantaRayRef = useRef<THREE.Object3D | null>(null);
  const livingTownRef = useRef<LivingTownController | null>(null);
  const streetlightLevelRef = useRef<number>(0);

  // Deduplicated HUD & proximity state trackers (zero idle React re-renders)
  const lastHudRef = useRef<{ x: number; z: number; heading: number }>({
    x: Number.NaN,
    z: Number.NaN,
    heading: Number.NaN,
  });
  const lastNearbyIdRef = useRef<string | null>(null);
  const lastNearbyDistRef = useRef<number>(-1);

  // Lights & Environment references
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
  const hemiLightRef = useRef<THREE.HemisphereLight | null>(null);
  const dirLightRef = useRef<THREE.DirectionalLight | null>(null);
  const playerLampRef = useRef<THREE.PointLight | null>(null);
  const playerHeadlightRef = useRef<THREE.SpotLight | null>(null);
  const groundMatRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const skyboxRef = useRef<THREE.Mesh | null>(null);
  const perimeterSceneryRef = useRef<THREE.Group | null>(null);
  const sunOffsetRef = useRef<THREE.Vector3>(new THREE.Vector3(...TIME_OF_DAY_PRESETS.DAY.sunPosition));

  // Helper to assign a new quest target and compute its initial route script from player's current position
  const assignNewQuest = useCallback((target: PlacedBuilding, startX: number, startZ: number, startHeading: number) => {
    questTargetRef.current = target;
    setQuestTarget(target);
    const path = computeManhattanRoadPath(startX, startZ, target);
    const script = buildMextStepByStepScript(path, startHeading, target);
    setQuestStartScript(script);
  }, []);

  const handleGradeChange = useCallback((newGrade: 5 | 6) => {
    setSelectedGrade(newGrade);
    if (!townMap) return;
    if (newGrade === 5 && questTargetRef.current?.grade === 6) {
      const next = getProgressiveQuestTarget(
        townMap,
        5,
        playerPosRef.current.x,
        playerPosRef.current.z,
        completedQuestCountRef.current,
        questTargetRef.current?.id
      );
      if (next) {
        assignNewQuest(next, playerPosRef.current.x, playerPosRef.current.z, playerRotRef.current);
      }
    }
  }, [townMap, getProgressiveQuestTarget, assignNewQuest]);

  // Auto kart engine audio sync
  useEffect(() => {
    if (travelMode === 'KART' && !isMuted) {
      townAudio.startKartEngine();
    } else {
      townAudio.stopKartEngine();
    }
    return () => {
      townAudio.stopKartEngine();
    };
  }, [travelMode, isMuted]);

  // Initialize Town Data & Progressive Quest Target when Seed changes
  useEffect(() => {
    let cancelled = false;

    const build = () => {
      if (cancelled) return;
      const activeGpu = gpuProfileRef.current ?? gpuProfile;
      const map = generateRandomTown(seed, {
        schoolId: activeSchool,
        enableDynamicShadows: activeGpu.enableDynamicShadows,
        lowPower: activeGpu.isLowPower,
      });
      setTownMap(map);
      setCompletedQuestCount(0);
      setTravelMode('WALK');

      const spawnX = map.spawnPoint[0];
      const spawnZ = map.spawnPoint[2];
      const spawnHeading = map.spawnHeading ?? 0;

      playerPosRef.current.set(spawnX, map.spawnPoint[1], spawnZ);
      playerRotRef.current = spawnHeading;

      const initialTarget = getProgressiveQuestTarget(
        map,
        selectedGradeRef.current,
        spawnX,
        spawnZ,
        0
      );
      if (initialTarget) {
        assignNewQuest(initialTarget, spawnX, spawnZ, spawnHeading);
      }
    };

    const fontSet = typeof document !== 'undefined' ? document.fonts : undefined;
    if (fontSet && typeof fontSet.load === 'function') {
      const fontsReady = Promise.all([
        fontSet.load('900 40px "BIZ UDPGothic"'),
        fontSet.load('bold 40px "BIZ UDPGothic"'),
      ]).catch(() => undefined);
      const timeout = new Promise(resolve => setTimeout(resolve, 1200));
      Promise.race([fontsReady, timeout]).then(build);
    } else {
      build();
    }

    return () => { cancelled = true; };
  }, [seed, activeSchool, gpuProfile, getProgressiveQuestTarget, assignNewQuest]);

  // Audio Pronunciation Helper
  const speakBuildingName = useCallback((building: PlacedBuilding) => {
    if (isMutedRef.current) return;

    const spokenText = building.id === 'EMPTY_LOT' ? 'Pocket Park' : building.nameEn;

    if (building.audioPath) {
      const audio = new Audio(building.audioPath);
      audio.play().catch(() => {
        if ('speechSynthesis' in window) {
          const u = new SpeechSynthesisUtterance(spokenText);
          u.lang = 'en-US';
          u.rate = 0.9;
          window.speechSynthesis.speak(u);
        }
      });
    } else if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(spokenText);
      u.lang = 'en-US';
      u.rate = 0.9;
      window.speechSynthesis.speak(u);
    }
  }, []);

  // Audio Speech for Direction Prompts
  const speakDirectionText = useCallback((text: string) => {
    if (isMutedRef.current) return;
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US';
      u.rate = 0.88;
      window.speechSynthesis.speak(u);
    }
  }, []);

  // Procedural Sound FX Helper (delegates to centralized townAudio dispatcher)
  const playFacilitySound = useCallback((building: PlacedBuilding) => {
    if (isMutedRef.current) return;
    townAudio.playForBuilding(building.id);
  }, []);

  const cycleCameraMode = useCallback(() => {
    setCameraMode(prev => {
      if (prev === 'CHASE') return 'FIRST_PERSON';
      if (prev === 'FIRST_PERSON') return 'ISOMETRIC';
      return 'CHASE';
    });
  }, []);

  // Keyboard & Pointer Drag Event Listeners
  useEffect(() => {
    const MOVEMENT_KEYS = ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'w', 'a', 's', 'd', 'r', 'f', 'enter'];

    const releaseAllInputs = () => {
      keysPressed.current.clear();
      touchForwardRef.current = 0;
      touchTurnRef.current = 0;
      isDraggingRef.current = false;
      dragPointerIdRef.current = null;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();

      const active = document.activeElement as HTMLElement | null;
      if (active && active.tagName === 'BUTTON' && MOVEMENT_KEYS.includes(key)) {
        active.blur();
      }

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      const isRepeat = e.repeat;
      keysPressed.current.add(key);

      if (isRepeat) return;

      // 1-4 Transport Mode selection (with progression check)
      if (e.key === '1') {
        setTravelMode('WALK');
      } else if (e.key === '2') {
        setTravelMode('RUN');
      } else if (e.key === '3') {
        if (completedQuestCountRef.current >= 2) {
          setTravelMode('BIKE');
          if (!isMutedRef.current) townAudio.playBicycleBell();
        }
      } else if (e.key === '4') {
        if (completedQuestCountRef.current >= 4) {
          setTravelMode('KART');
          soundEffects.playCorrect();
        }
      }

      if (e.key === 'Shift') {
        setTravelMode(prev => (prev === 'WALK' ? 'RUN' : 'WALK'));
      }

      if (key === 'c' || key === 'v') {
        cycleCameraMode();
      }

      if (e.key === ' ' || key === 'b') {
        if (!isMutedRef.current) townAudio.playBicycleBell();
      }

      if (key === 't') {
        cameraPitchRef.current = 0.08;
      }

      if (key === 'l') {
        const nextIdx = (TIME_OF_DAY_ORDER.indexOf(timeOfDayRef.current) + 1) % TIME_OF_DAY_ORDER.length;
        setTimeOfDay(TIME_OF_DAY_ORDER[nextIdx]);
      }

      if (key === 'k') {
        const nextIdx = (WEATHER_MODE_ORDER.indexOf(weatherRef.current) + 1) % WEATHER_MODE_ORDER.length;
        setWeather(WEATHER_MODE_ORDER[nextIdx]);
      }

      if (key === 'q') {
        triggerSnapTurnRef.current('LEFT');
      } else if (key === 'e') {
        triggerSnapTurnRef.current('RIGHT');
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.key.toLowerCase());
      keysPressed.current.delete(e.key);
    };

    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'CANVAS' && dragPointerIdRef.current === null) {
        isDraggingRef.current = true;
        dragPointerIdRef.current = e.pointerId;
        lastPointerPos.current = { x: e.clientX, y: e.clientY };
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDraggingRef.current || e.pointerId !== dragPointerIdRef.current) return;
      const dx = e.clientX - lastPointerPos.current.x;
      const dy = e.clientY - lastPointerPos.current.y;
      lastPointerPos.current = { x: e.clientX, y: e.clientY };

      playerRotRef.current -= dx * 0.005;
      cameraPitchRef.current -= dy * 0.005;
      cameraPitchRef.current = THREE.MathUtils.clamp(cameraPitchRef.current, -0.65, 0.75);
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (e.pointerId !== dragPointerIdRef.current) return;
      isDraggingRef.current = false;
      dragPointerIdRef.current = null;
    };

    const handleVisibility = () => {
      if (document.hidden) releaseAllInputs();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    window.addEventListener('blur', releaseAllInputs);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      window.removeEventListener('blur', releaseAllInputs);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [cycleCameraMode, setTimeOfDay, setWeather]);

  // Helper to attach/swap a generated TownMap inside the persistent Three.js scene without recreating WebGL
  const attachTownMapToScene = useCallback((nextMap: TownMap) => {
    const scene = sceneRef.current;
    if (!scene) return;
    if (mountedTownRef.current === nextMap) return;

    const prevMap = mountedTownRef.current;
    if (prevMap) {
      scene.remove(prevMap.roadsGroup);
      scene.remove(prevMap.buildingsGroup);
      disposeObject3D(prevMap.roadsGroup);
      disposeObject3D(prevMap.buildingsGroup);
    }

    scene.add(nextMap.roadsGroup);
    scene.add(nextMap.buildingsGroup);
    mountedTownRef.current = nextMap;

    // Cache kinetic Amusement Park props once per town (zero getObjectByName in RAF)
    const wheelRotor = nextMap.buildingsGroup.getObjectByName('AmusementPark_WheelRotor') ?? null;
    wheelRotorRef.current = wheelRotor;
    const gondolas: THREE.Object3D[] = [];
    if (wheelRotor) {
      for (let i = 0; i < 8; i++) {
        const g = wheelRotor.getObjectByName(`Gondola_${i}`);
        if (g) gondolas.push(g);
      }
    }
    gondolasRef.current = gondolas;
    carouselRotorRef.current = nextMap.buildingsGroup.getObjectByName('AmusementPark_CarouselRotor') ?? null;
    swingSeat0Ref.current = nextMap.buildingsGroup.getObjectByName('Park_SwingSeat_0') ?? null;
    swingSeat1Ref.current = nextMap.buildingsGroup.getObjectByName('Park_SwingSeat_1') ?? null;
    mantaRayRef.current = nextMap.buildingsGroup.getObjectByName('MantaRay') ?? null;

    // Mount Living Town Simulation (instanced traffic, pedestrians, 3D target beacon & confetti)
    if (livingTownRef.current) {
      scene.remove(livingTownRef.current.group);
      livingTownRef.current.dispose();
      livingTownRef.current = null;
    }
    const livingTown = createLivingTownController(nextMap.seed, {
      lowPower: gpuProfileRef.current?.isLowPower ?? false,
    });
    scene.add(livingTown.group);
    livingTownRef.current = livingTown;
    const currentTarget = questTargetRef.current;
    livingTown.setTargetBeacon(
      currentTarget?.entrancePos ?? null,
      questModeRef.current === 'GUIDED' && !!currentTarget
    );

    // Re-collect scene weather materials & immediately apply active atmosphere
    const atmos = getCompositeAtmosphere(timeOfDayRef.current, weatherRef.current);
    streetlightLevelRef.current = atmos.streetlightLevel;
    const buckets = collectSceneWeatherMaterials(scene);
    materialBucketsRef.current = buckets;
    applyAtmosphereToMaterials(buckets, atmos);

    // Snap player, lights, and camera to spawn so camera never lerps through buildings
    const [spawnX, spawnY, spawnZ] = nextMap.spawnPoint;
    const spawnHeading = nextMap.spawnHeading ?? 0;
    playerPosRef.current.set(spawnX, spawnY, spawnZ);
    playerRotRef.current = spawnHeading;

    if (playerRef.current) {
      playerRef.current.group.position.copy(playerPosRef.current);
      playerRef.current.group.rotation.y = spawnHeading;
      playerRef.current.resetAnimation();
    }

    if (cameraRef.current) {
      cameraRef.current.position.set(
        spawnX - Math.sin(spawnHeading) * 4.8,
        spawnY + 2.4,
        spawnZ - Math.cos(spawnHeading) * 4.8
      );
      cameraRef.current.lookAt(spawnX, spawnY + 1.3, spawnZ);
    }

    if (dirLightRef.current) {
      dirLightRef.current.target.position.copy(playerPosRef.current);
      dirLightRef.current.target.updateMatrixWorld();
      dirLightRef.current.position.set(
        spawnX + sunOffsetRef.current.x,
        sunOffsetRef.current.y,
        spawnZ + sunOffsetRef.current.z
      );
    }

    if (playerLampRef.current) {
      playerLampRef.current.position.set(spawnX, 5.2, spawnZ);
    }

    if (playerHeadlightRef.current) {
      playerHeadlightRef.current.position.set(spawnX, 1.15, spawnZ);
    }

    lastHudRef.current = { x: spawnX, z: spawnZ, heading: spawnHeading };
    lastNearbyIdRef.current = null;
    lastNearbyDistRef.current = -1;
    setNearbyBuilding(null);
    setPlayerHudState({ x: spawnX, z: spawnZ, heading: spawnHeading });
  }, []);

  // Stable refs for callbacks invoked inside the mount-once RAF loop
  const getProgressiveQuestTargetRef = useRef(getProgressiveQuestTarget);
  useEffect(() => { getProgressiveQuestTargetRef.current = getProgressiveQuestTarget; }, [getProgressiveQuestTarget]);
  const playFacilitySoundRef = useRef(playFacilitySound);
  useEffect(() => { playFacilitySoundRef.current = playFacilitySound; }, [playFacilitySound]);
  const assignNewQuestRef = useRef(assignNewQuest);
  useEffect(() => { assignNewQuestRef.current = assignNewQuest; }, [assignNewQuest]);
  const attachTownMapRef = useRef(attachTownMapToScene);
  useEffect(() => { attachTownMapRef.current = attachTownMapToScene; }, [attachTownMapToScene]);

  // Persistent Three.js Scene Setup & Render Loop (decoupled from townMap regeneration)
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const atmos = getCompositeAtmosphere(timeOfDayRef.current, weatherRef.current);

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(atmos.skyColor);
    scene.fog = new THREE.FogExp2(atmos.fogColor, atmos.fogDensity);

    // 1.5. 360° Atmospheric Skybox Dome (with clouds, sun/moon & stars)
    const skybox = buildAtmosphericSkybox(timeOfDayRef.current, 320);
    updateAtmosphericSkybox(skybox, timeOfDayRef.current, atmos.skyboxTintHex);
    skyboxRef.current = skybox;
    scene.add(skybox);

    // 2. Centralized Classroom WebGL Renderer, Camera & Adaptive DRS
    container.innerHTML = '';
    const ctx3d = createClassroomRenderer(container, {
      fov: 54,
      near: 0.2,
      far: 650,
      alpha: false,
      cameraPosition: [0, 4, -6],
      cameraLookAt: [0, 1.3, 0],
      toneMapping: THREE.ACESFilmicToneMapping,
      toneMappingExposure: atmos.toneMappingExposure,
      enableDrs: true,
    });
    const { renderer, camera, gpuProfile: gpu } = ctx3d;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    rendererRef.current = renderer;
    cameraRef.current = camera;
    gpuProfileRef.current = gpu;

    // 3. Studio PBR Environment Reflections (disposes temporary PMREM/RoomEnvironment immediately)
    const envHandle = createRoomEnvironmentPMREM(renderer);
    scene.environment = envHandle.texture;
    scene.environmentIntensity = atmos.environmentIntensity;

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(atmos.ambientColor, atmos.ambientIntensity);
    ambientLightRef.current = ambientLight;
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(atmos.hemiSkyColor, atmos.hemiGroundColor, atmos.hemiIntensity);
    hemiLightRef.current = hemiLight;
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(atmos.sunColor, atmos.sunIntensity);
    dirLightRef.current = dirLight;
    sunOffsetRef.current.set(...atmos.sunPosition);
    dirLight.position.set(
      playerPosRef.current.x + atmos.sunPosition[0],
      atmos.sunPosition[1],
      playerPosRef.current.z + atmos.sunPosition[2]
    );
    dirLight.castShadow = gpu.enableDynamicShadows;
    if (gpu.enableDynamicShadows) {
      dirLight.shadow.mapSize.width = gpu.shadowMapRes;
      dirLight.shadow.mapSize.height = gpu.shadowMapRes;
      dirLight.shadow.camera.near = 0.5;
      dirLight.shadow.camera.far = 180;
      const shadowDist = 55;
      dirLight.shadow.camera.left = -shadowDist;
      dirLight.shadow.camera.right = shadowDist;
      dirLight.shadow.camera.top = shadowDist;
      dirLight.shadow.camera.bottom = -shadowDist;
      dirLight.shadow.bias = -0.0005;
    }
    scene.add(dirLight);
    scene.add(dirLight.target);

    const playerLamp = new THREE.PointLight(0xfef08a, atmos.playerLampIntensity, 28.0, 1.2);
    playerLamp.visible = atmos.playerLampIntensity > 0;
    playerLampRef.current = playerLamp;
    playerLamp.position.set(playerPosRef.current.x, 5.0, playerPosRef.current.z);
    scene.add(playerLamp);

    // 4.2. Forward Headlight Beam for Sunset/Night/Stormy Weather
    const playerHeadlight = new THREE.SpotLight(0xfffbeb, atmos.playerHeadlightIntensity, 26.0, Math.PI / 5.2, 0.55, 1.2);
    playerHeadlight.visible = atmos.playerHeadlightIntensity > 0;
    playerHeadlightRef.current = playerHeadlight;
    playerHeadlight.position.set(playerPosRef.current.x, 1.15, playerPosRef.current.z);
    scene.add(playerHeadlight);
    scene.add(playerHeadlight.target);

    setStreetlightLevel(atmos.streetlightLevel);

    // 5. Surrounding Textured Botanical Grass Meadow & 360° Perimeter Vista Scenery
    const { mesh: ground, material: groundMat } = buildTexturedGroundPlane(560, 84, atmos.groundColor);
    groundMatRef.current = groundMat;
    scene.add(ground);

    const perimeterScenery = buildPerimeterScenery({
      boundaryHalfSize: 74.0,
      includeBoundaryFence: true,
      lowPower: gpuProfileRef.current?.isLowPower ?? false,
    });
    perimeterSceneryRef.current = perimeterScenery;
    updatePerimeterSceneryLighting(perimeterScenery, atmos.streetlightLevel, atmos.groundColor);
    scene.add(perimeterScenery);

    // 6.2. 3D Weather Particle System (Rain Streaks + Ground Splash Ripples, Snowflakes, 3D Sakura Petals)
    const weatherController = createWeatherParticleController(48, 22, 48);
    weatherController.setWeather(weatherRef.current);
    weatherControllerRef.current = weatherController;
    scene.add(weatherController.group);

    // 6.5. Pooled 3D Road Route Chevrons (1 InstancedMesh, 1 draw call, zero per-update leaks)
    const chevronGeo = new THREE.ConeGeometry(0.42, 0.95, 3);
    chevronGeo.rotateX(Math.PI / 2);
    const chevronMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });
    const routeInstanced = new THREE.InstancedMesh(chevronGeo, chevronMat, MAX_ROUTE_CHEVRONS);
    routeInstanced.name = 'RoadRouteChevrons';
    routeInstanced.count = 0;
    routeInstanced.visible = false;
    routeInstanced.frustumCulled = false;
    scene.add(routeInstanced);
    routeInstancedRef.current = routeInstanced;

    // 7. Add Player Avatar & Vehicles
    const player = buildPlayerAvatar();
    playerRef.current = player;
    player.group.position.copy(playerPosRef.current);
    player.group.rotation.y = playerRotRef.current;
    scene.add(player.group);

    // 7.1. 3D Mamachari City Bicycle (attaches to player group)
    const bike = buildBicycleMesh(0x0284c7);
    bike.group.position.set(0, 0, 0);
    bike.group.visible = false;
    player.group.add(bike.group);

    // 7.2. 3D Suzuka Micro-Kart (attaches to player group)
    const kart = buildMicroKart({
      colorHex: 0xef4444,
      stripeHex: 0xffffff,
      rimHex: 0xfbbf24,
      suitHex: 0x2563eb,
      helmetHex: 0xfacc15,
    });
    kart.kartRoot.scale.set(115, 115, 115);
    kart.kartRoot.position.set(0, 0, 0);
    kart.kartRoot.visible = false;
    player.group.add(kart.kartRoot);

    // Attach already-generated townMap if present on mount (e.g. StrictMode remount)
    if (townMapRef.current) {
      attachTownMapRef.current(townMapRef.current);
    }

    let lastHudUpdateTime = 0;

    // 11. Physics Collision Solver
    const solveCollisions = (pos: THREE.Vector3) => {
      pos.x = THREE.MathUtils.clamp(pos.x, -71.2, 71.2);
      pos.z = THREE.MathUtils.clamp(pos.z, -71.2, 71.2);

      const activeMap = townMapRef.current;
      if (!activeMap) return;

      const pRadius = 0.35;

      for (const b of activeMap.buildingsList) {
        const isRot90 = Math.abs(Math.sin(b.rotationY)) > 0.5;
        const lotW = isRot90 ? b.depthMeters : b.widthMeters;
        const lotD = isRot90 ? b.widthMeters : b.depthMeters;
        const halfW = lotW / 2;
        const halfD = lotD / 2;
        const bx = b.worldPos[0];
        const bz = b.worldPos[2];

        const isOpenPark = b.id === 'EMPTY_LOT' || b.id === 'PARK' || b.id === 'GARDEN';
        const frontInset = isOpenPark ? 2.2 : 1.55;
        const sideInset = 0.25;

        const fSin = Math.round(Math.sin(b.rotationY));
        const fCos = Math.round(Math.cos(b.rotationY));

        const minX = bx - halfW + (fSin === -1 ? frontInset : sideInset);
        const maxX = bx + halfW - (fSin === 1 ? frontInset : sideInset);
        const minZ = bz - halfD + (fCos === -1 ? frontInset : sideInset);
        const maxZ = bz + halfD - (fCos === 1 ? frontInset : sideInset);

        if (pos.x + pRadius > minX && pos.x - pRadius < maxX &&
            pos.z + pRadius > minZ && pos.z - pRadius < maxZ) {
          const leftPen = (pos.x + pRadius) - minX;
          const rightPen = maxX - (pos.x - pRadius);
          const topPen = (pos.z + pRadius) - minZ;
          const bottomPen = maxZ - (pos.z - pRadius);

          const minPen = Math.min(leftPen, rightPen, topPen, bottomPen);
          if (minPen === leftPen) {
            pos.x = minX - pRadius;
          } else if (minPen === rightPen) {
            pos.x = maxX + pRadius;
          } else if (minPen === topPen) {
            pos.z = minZ - pRadius;
          } else {
            pos.z = maxZ + pRadius;
          }
        }
      }

      // Grand Boulevard raised median curb collision (cross at zebra crosswalks)
      if (!isInsideJunctionWindow(pos.z) && Math.abs(pos.x) < 0.72) {
        pos.x = pos.x >= 0 ? 0.72 : -0.72;
      }
      if (!isInsideJunctionWindow(pos.x) && Math.abs(pos.z) < 0.72) {
        pos.z = pos.z >= 0 ? 0.72 : -0.72;
      }
    };

    let isDisposed = false;
    let rafId = 0;
    let timeoutId: number | null = null;
    let lastFrameTime = performance.now();
    const startTime = lastFrameTime;
    const gl = renderer.getContext() as WebGL2RenderingContext;

    const afterDraw = gpu.isSoftware
      ? (cb: () => void) => {
          const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
          gl.flush();
          if (!sync) {
            timeoutId = window.setTimeout(cb, 80);
            return;
          }
          const poll = () => {
            if (isDisposed) {
              gl.deleteSync(sync);
              return;
            }
            const state = gl.getSyncParameter(sync, gl.SYNC_STATUS);
            if (state === gl.UNSIGNALED) {
              timeoutId = window.setTimeout(poll, 5);
            } else {
              gl.deleteSync(sync);
              timeoutId = window.setTimeout(cb, 80);
            }
          };
          timeoutId = window.setTimeout(poll, 5);
        }
      : (cb: () => void) => {
          if (!isDisposed) rafId = requestAnimationFrame(cb);
        };

    // 12. Main 60 FPS Render & Player-Relative Movement Loop
    const animate = () => {
      if (isDisposed) return;

      const now = performance.now();
      const rawDt = (now - lastFrameTime) * 0.001;
      const delta = Math.min(rawDt, 0.1);
      lastFrameTime = now;
      const elapsed = (now - startTime) * 0.001;

      if (viewRoleRef.current === 'DISPATCHER_2D' || document.body.dataset.state === 'paused') {
        timeoutId = window.setTimeout(animate, 120);
        return;
      }

      ctx3d.trackFrameRate(rawDt);

      // Animate cached kinetic Amusement Park rotors (zero getObjectByName per frame)
      const wheelRotor = wheelRotorRef.current;
      if (wheelRotor) {
        wheelRotor.rotation.z -= delta * 0.22;
        const gondolas = gondolasRef.current;
        for (let i = 0; i < gondolas.length; i++) {
          gondolas[i].rotation.z = -wheelRotor.rotation.z;
        }
      }
      const carouselRotor = carouselRotorRef.current;
      if (carouselRotor) {
        carouselRotor.rotation.y += delta * 0.85;
      }
      if (swingSeat0Ref.current) {
        swingSeat0Ref.current.rotation.x = Math.sin(elapsed * 2.1) * 0.36;
      }
      if (swingSeat1Ref.current) {
        swingSeat1Ref.current.rotation.x = Math.sin(elapsed * 2.1 + 0.85) * 0.36;
      }
      const mantaRay = mantaRayRef.current;
      if (mantaRay) {
        mantaRay.position.x = 2.1 + Math.sin(elapsed * 0.55) * 0.95;
        mantaRay.position.y = 3.7 + Math.sin(elapsed * 1.1) * 0.22;
        mantaRay.position.z = -1.4 + Math.cos(elapsed * 0.55) * 0.25;
        mantaRay.rotation.z = Math.cos(elapsed * 0.55) * 0.16;
        mantaRay.rotation.y = -0.35 + Math.cos(elapsed * 0.55) * 0.25;
      }

      livingTownRef.current?.update(delta, elapsed, playerPosRef.current, streetlightLevelRef.current);

      // Pulse pooled 3D Road Route Chevrons in-place (1 draw call, zero allocations)
      const routeMesh = routeInstancedRef.current;
      const chevronPts = routeChevronPointsRef.current;
      if (routeMesh && routeMesh.visible && chevronPts.length > 0) {
        for (let i = 0; i < chevronPts.length; i++) {
          const pt = chevronPts[i];
          const wave = Math.sin(elapsed * 5.0 - i * 0.7) * 0.5 + 0.5;
          const s = 0.85 + wave * 0.3;
          _chevronDummy.position.set(pt.x, 0.12, pt.z);
          _chevronDummy.rotation.set(0, pt.angle, 0);
          _chevronDummy.scale.set(s, s * 0.22, s);
          _chevronDummy.updateMatrix();
          routeMesh.setMatrixAt(i, _chevronDummy.matrix);
        }
        routeMesh.instanceMatrix.needsUpdate = true;
      }

      updateTrafficSignals(elapsed);

      // 1. TURNING (SMOOTHED YAW ROTATION + 90-DEGREE SNAP-TURN TWEEN)
      let targetTurn = 0;
      if (keysPressed.current.has('a') || keysPressed.current.has('arrowleft')) targetTurn += 1;
      if (keysPressed.current.has('d') || keysPressed.current.has('arrowright')) targetTurn -= 1;
      if (touchTurnRef.current !== 0) targetTurn += touchTurnRef.current;

      if (Math.abs(targetTurn) > 0.25) {
        snapTargetYawRef.current = null;
      }

      velTurnRef.current += (targetTurn - velTurnRef.current) * Math.min(1, delta * 12.0);
      if (Math.abs(velTurnRef.current) < 0.002 && targetTurn === 0) velTurnRef.current = 0;

      const currentMode = travelModeRef.current;
      const turnSpeed = currentMode === 'KART' ? 3.3 : currentMode === 'BIKE' ? 3.0 : currentMode === 'RUN' ? 2.8 : 2.6;
      if (snapTargetYawRef.current !== null) {
        const diff = shortestAngleDiff(playerRotRef.current, snapTargetYawRef.current);
        if (Math.abs(diff) < 0.015) {
          playerRotRef.current = snapTargetYawRef.current;
          snapTargetYawRef.current = null;
        } else {
          playerRotRef.current += diff * Math.min(1, delta * 14.0);
        }
      } else if (velTurnRef.current !== 0) {
        playerRotRef.current += velTurnRef.current * turnSpeed * delta;
      }

      if (keysPressed.current.has('r') || keysPressed.current.has('pageup')) {
        cameraPitchRef.current += 1.8 * delta;
      }
      if (keysPressed.current.has('f') || keysPressed.current.has('pagedown')) {
        cameraPitchRef.current -= 1.8 * delta;
      }
      cameraPitchRef.current = THREE.MathUtils.clamp(cameraPitchRef.current, -0.65, 0.75);

      // 2. FORWARD / BACKWARD MOVEMENT (Smoothed acceleration & Grid-calibrated speeds: 6m, 12m, 18m, 24m)
      let targetForward = 0;
      if (keysPressed.current.has('w') || keysPressed.current.has('arrowup')) targetForward += 1;
      if (keysPressed.current.has('s') || keysPressed.current.has('arrowdown')) targetForward -= 0.6;
      if (touchForwardRef.current !== 0) targetForward += touchForwardRef.current;

      velForwardRef.current += (targetForward - velForwardRef.current) * Math.min(1, delta * 10.5);
      if (Math.abs(velForwardRef.current) < 0.002 && targetForward === 0) velForwardRef.current = 0;

      const isMoving =
        Math.abs(velForwardRef.current) > 0.05 ||
        Math.abs(velTurnRef.current) > 0.05 ||
        snapTargetYawRef.current !== null;
      const baseSpeed = TRAVEL_SPEEDS[currentMode];
      const speedRatio = currentMode === 'KART' ? 3.5 : currentMode === 'BIKE' ? 2.5 : currentMode === 'RUN' ? 2.0 : 1.0;

      if (Math.abs(velForwardRef.current) > 0.005) {
        const angle = playerRotRef.current;
        const moveStep = velForwardRef.current * baseSpeed * delta;
        playerPosRef.current.x += Math.sin(angle) * moveStep;
        playerPosRef.current.z += Math.cos(angle) * moveStep;

        solveCollisions(playerPosRef.current);
        player.group.position.copy(playerPosRef.current);
      }

      player.group.rotation.y = playerRotRef.current;
      player.group.rotation.z =
        -velTurnRef.current * (currentMode === 'BIKE' ? 0.14 : currentMode === 'KART' ? 0.06 : 0);

      // Update 3D Vehicle & Avatar attachment postures
      if (currentMode === 'KART') {
        bike.group.visible = false;
        kart.kartRoot.visible = true;
        player.body.position.set(0, 0.06, 0.05);
        player.leftLeg.visible = false;
        player.rightLeg.visible = false;
        const tod = timeOfDayRef.current;
        const nightFactor = tod === 'NIGHT' ? 1.0 : tod === 'SUNSET' ? 0.5 : 0.0;
        const wMode = weatherRef.current;
        const weatherSprayMode =
          wMode === 'LIGHT_RAIN' || wMode === 'HEAVY_RAIN'
            ? 'RAIN'
            : wMode === 'LIGHT_SNOW' || wMode === 'HEAVY_SNOW'
            ? 'SNOW'
            : 'NONE';
        const isBraking = velForwardRef.current < -0.05 || (targetForward <= 0 && Math.abs(velForwardRef.current) > 0.15);
        kart.updateKartVisuals(delta, {
          speed: velForwardRef.current * baseSpeed,
          steerInput: -velTurnRef.current,
          nightFactor,
          isBraking,
          weatherSprayMode,
          elapsedSec: elapsed,
        });
        townAudio.updateKartEngine(isMoving, speedRatio);
      } else if (currentMode === 'BIKE') {
        bike.group.visible = true;
        kart.kartRoot.visible = false;
        player.body.position.set(0, 0.18, -0.06);
        player.leftLeg.visible = true;
        player.rightLeg.visible = true;
        bike.updateAnimation(isMoving, delta, baseSpeed);
      } else {
        bike.group.visible = false;
        kart.kartRoot.visible = false;
        player.body.position.set(0, 0, 0);
        player.leftLeg.visible = true;
        player.rightLeg.visible = true;
      }

      player.updateAnimation(isMoving, delta, speedRatio, currentMode);
      if (playerLamp.visible) {
        playerLamp.position.set(playerPosRef.current.x, 5.2, playerPosRef.current.z);
      }

      // Update player forward headlight beam & 3D weather particles around the player
      if (playerHeadlightRef.current && playerHeadlightRef.current.visible) {
        const hl = playerHeadlightRef.current;
        const yaw = playerRotRef.current;
        hl.position.set(
          playerPosRef.current.x + Math.sin(yaw) * 0.4,
          1.1,
          playerPosRef.current.z + Math.cos(yaw) * 0.4
        );
        hl.target.position.set(
          playerPosRef.current.x + Math.sin(yaw) * 14.0,
          0.1,
          playerPosRef.current.z + Math.cos(yaw) * 14.0
        );
        hl.target.updateMatrixWorld();
      }

      if (weatherControllerRef.current) {
        weatherControllerRef.current.update(
          delta,
          elapsed,
          playerPosRef.current.x,
          playerPosRef.current.z
        );
      }

      // 3. DYNAMIC CAMERA TRACKING MODES (Auto-pulls back for high speeds + anti-clipping spring)
      const activeCamMode = cameraModeRef.current;
      if (activeCamMode === 'FIRST_PERSON') {
        player.group.visible = false;

        const eyeHeight = currentMode === 'KART' ? 0.85 : currentMode === 'BIKE' ? 1.45 : 1.25;
        camera.position.set(playerPosRef.current.x, playerPosRef.current.y + eyeHeight, playerPosRef.current.z);

        const lookDist = 20.0;
        const yaw = playerRotRef.current;
        const pitch = cameraPitchRef.current;

        const targetX = playerPosRef.current.x + Math.sin(yaw) * Math.cos(pitch) * lookDist;
        const targetY = playerPosRef.current.y + eyeHeight + Math.sin(pitch) * lookDist;
        const targetZ = playerPosRef.current.z + Math.cos(yaw) * Math.cos(pitch) * lookDist;
        camera.lookAt(targetX, targetY, targetZ);
      } else {
        player.group.visible = true;

        if (activeCamMode === 'CHASE') {
          // Dynamic chase distance & height calibrated to prevent high-speed tunnel vision
          const camDistance = currentMode === 'KART' ? 7.2 : currentMode === 'BIKE' ? 6.2 : currentMode === 'RUN' ? 5.2 : 4.8;
          const camHeight = currentMode === 'KART' ? 3.0 : currentMode === 'BIKE' ? 2.7 : currentMode === 'RUN' ? 2.5 : 2.4;
          const angle = playerRotRef.current;

          _camTarget.set(
            playerPosRef.current.x - Math.sin(angle) * camDistance,
            playerPosRef.current.y + camHeight,
            playerPosRef.current.z - Math.cos(angle) * camDistance
          );
          resolveCameraWallCollision(
            playerPosRef.current,
            _camTarget,
            townMapRef.current?.buildingsList ?? [],
            _camResolved
          );
          camera.position.lerp(_camResolved, 0.14);

          const pitch = cameraPitchRef.current;
          const lookTargetY = playerPosRef.current.y + 1.1 + Math.sin(pitch) * 2.5;
          camera.lookAt(playerPosRef.current.x, lookTargetY, playerPosRef.current.z);
        } else {
          const isoDistance = 22.0;
          const isoHeight = 26.0;

          _camTarget.set(
            playerPosRef.current.x,
            isoHeight,
            playerPosRef.current.z + isoDistance
          );
          camera.position.lerp(_camTarget, 0.10);
          camera.lookAt(playerPosRef.current.x, 0.4, playerPosRef.current.z);
        }
      }

      dirLight.target.position.copy(playerPosRef.current);
      dirLight.target.updateMatrixWorld();
      dirLight.position.set(
        playerPosRef.current.x + sunOffsetRef.current.x,
        sunOffsetRef.current.y,
        playerPosRef.current.z + sunOffsetRef.current.z
      );

      // 4. PROXIMITY DETECTION & MINIMAP (Throttled to <=10 Hz, deduplicated so idle = 0 React re-renders)
      const activeMap = townMapRef.current;
      if (activeMap && now - lastHudUpdateTime > 100) {
        lastHudUpdateTime = now;

        const px = playerPosRef.current.x;
        const pz = playerPosRef.current.z;
        const ph = playerRotRef.current;
        const prevHud = lastHudRef.current;

        if (
          Number.isNaN(prevHud.x) ||
          Math.abs(px - prevHud.x) > 0.05 ||
          Math.abs(pz - prevHud.z) > 0.05 ||
          Math.abs(ph - prevHud.heading) > 0.02
        ) {
          prevHud.x = px;
          prevHud.z = pz;
          prevHud.heading = ph;
          setPlayerHudState({ x: px, z: pz, heading: ph });
        }

        let closestB: PlacedBuilding | null = null;
        let minDist = Infinity;

        for (const b of activeMap.buildingsList) {
          if (b.tier === 0) continue;
          if (selectedGradeRef.current === 5 && b.grade === 6) continue;
          const dist = Math.hypot(
            px - b.entrancePos[0],
            pz - b.entrancePos[2]
          );
          if (dist < minDist) {
            minDist = dist;
            closestB = b;
          }
        }

        if (closestB) {
          const triggerDist = closestB.tier === 3 ? 11.5 : closestB.tier === 2 ? 8.5 : 6.0;
          if (minDist <= triggerDist) {
            const roundedDist = Math.round(minDist);
            if (lastNearbyIdRef.current !== closestB.id) {
              lastNearbyIdRef.current = closestB.id;
              setNearbyBuilding(closestB);
            }
            if (lastNearbyDistRef.current !== roundedDist) {
              lastNearbyDistRef.current = roundedDist;
              setNearbyDistance(roundedDist);
            }
          } else if (lastNearbyIdRef.current !== null) {
            lastNearbyIdRef.current = null;
            lastNearbyDistRef.current = -1;
            setNearbyBuilding(null);
          }
        } else if (lastNearbyIdRef.current !== null) {
          lastNearbyIdRef.current = null;
          lastNearbyDistRef.current = -1;
          setNearbyBuilding(null);
        }

        // Quest Target Reached Detection
        const currentQuest = questTargetRef.current;
        if (currentQuest) {
          const qDist = Math.hypot(
            px - currentQuest.entrancePos[0],
            pz - currentQuest.entrancePos[2]
          );
          const qTrigger = currentQuest.tier === 3 ? 10.5 : currentQuest.tier === 2 ? 8.0 : 5.8;
          if (qDist <= qTrigger) {
            livingTownRef.current?.triggerConfettiBurst(
              currentQuest.entrancePos[0],
              1.2,
              currentQuest.entrancePos[2]
            );
            const pts = questModeRef.current === 'MYSTERY' ? 2 : 1;
            const nextCount = completedQuestCountRef.current + 1;
            setCompletedQuestCount(nextCount);
            setQuestScore(s => s + pts);

            // Progressive transportation unlock celebrations
            if (nextCount === 2) {
              soundEffects.playFanfare();
              if (!isMutedRef.current) townAudio.playBicycleBell();
              setQuestCompletedToast(`🎉 Level Up! 🚲 Bicycle Unlocked (18 m/s)! Press 3 or tap 🚲`);
              setTravelMode('BIKE');
            } else if (nextCount === 4) {
              soundEffects.playFanfare();
              setQuestCompletedToast(`🏆 Grand Prix Unlocked! 🏎️ Suzuka Kart (24 m/s)! Press 4 or tap 🏎️`);
              setTravelMode('KART');
            } else {
              setQuestCompletedToast(
                questModeRef.current === 'MYSTERY'
                  ? `🎉 Mystery Solved! You found the ${currentQuest.nameEn} (+2★)!`
                  : `🎉 Arrived at the ${currentQuest.nameEn} entrance! Fantastic!`
              );
              if (!isMutedRef.current) playFacilitySoundRef.current(currentQuest);
            }

            // Next chained quest origin is the CURRENT destination entrance
            const nextTarget = getProgressiveQuestTargetRef.current(
              activeMap,
              selectedGradeRef.current,
              currentQuest.entrancePos[0],
              currentQuest.entrancePos[2],
              nextCount,
              currentQuest.id
            );

            if (nextTarget) {
              assignNewQuestRef.current(
                nextTarget,
                px,
                pz,
                ph
              );
            }
          }
        }
      }

      renderer.render(scene, camera);
      if (import.meta.env.DEV && (renderer.info.render.frame % 60 === 0)) {
        (window as unknown as Record<string, unknown>).__TOWN_DEBUG_BUDGET = {
          calls: renderer.info.render.calls,
          triangles: renderer.info.render.triangles,
          geometries: renderer.info.memory.geometries,
          textures: renderer.info.memory.textures,
        };
      }
      afterDraw(animate);
    };

    animate();

    return () => {
      isDisposed = true;
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      weatherController.dispose();
      envHandle.dispose();
      livingTownRef.current?.dispose();
      livingTownRef.current = null;
      disposeObject3D(scene);
      ctx3d.cleanup();
      mountedTownRef.current = null;
      wheelRotorRef.current = null;
      gondolasRef.current = [];
      carouselRotorRef.current = null;
      swingSeat0Ref.current = null;
      swingSeat1Ref.current = null;
      mantaRayRef.current = null;
      routeInstancedRef.current = null;
      weatherControllerRef.current = null;
      materialBucketsRef.current = null;
      playerRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;
    };
  }, []);

  // Swap town geometry inside the persistent scene whenever townMap regenerates
  useEffect(() => {
    townMapRef.current = townMap;
    if (!townMap) return;
    attachTownMapToScene(townMap);
  }, [townMap, attachTownMapToScene]);

  // Update Time of Day & Weather Atmosphere dynamically in 0ms
  useEffect(() => {
    if (!sceneRef.current || !ambientLightRef.current || !dirLightRef.current) return;
    const atmos = getCompositeAtmosphere(timeOfDay, weather);
    streetlightLevelRef.current = atmos.streetlightLevel;

    if (sceneRef.current.background instanceof THREE.Color) {
      sceneRef.current.background.setHex(atmos.skyColor);
    } else {
      sceneRef.current.background = new THREE.Color(atmos.skyColor);
    }
    if (sceneRef.current.fog instanceof THREE.FogExp2) {
      sceneRef.current.fog.color.setHex(atmos.fogColor);
      sceneRef.current.fog.density = atmos.fogDensity;
    } else {
      sceneRef.current.fog = new THREE.FogExp2(atmos.fogColor, atmos.fogDensity);
    }
    sceneRef.current.environmentIntensity = atmos.environmentIntensity;

    if (rendererRef.current) {
      rendererRef.current.toneMappingExposure = atmos.toneMappingExposure;
    }

    ambientLightRef.current.color.setHex(atmos.ambientColor);
    ambientLightRef.current.intensity = atmos.ambientIntensity;

    if (hemiLightRef.current) {
      hemiLightRef.current.color.setHex(atmos.hemiSkyColor);
      hemiLightRef.current.groundColor.setHex(atmos.hemiGroundColor);
      hemiLightRef.current.intensity = atmos.hemiIntensity;
    }

    dirLightRef.current.color.setHex(atmos.sunColor);
    dirLightRef.current.intensity = atmos.sunIntensity;
    sunOffsetRef.current.set(...atmos.sunPosition);
    dirLightRef.current.position.set(
      playerPosRef.current.x + sunOffsetRef.current.x,
      sunOffsetRef.current.y,
      playerPosRef.current.z + sunOffsetRef.current.z
    );

    if (playerLampRef.current) {
      playerLampRef.current.intensity = atmos.playerLampIntensity;
      playerLampRef.current.visible = atmos.playerLampIntensity > 0;
    }

    if (playerHeadlightRef.current) {
      playerHeadlightRef.current.intensity = atmos.playerHeadlightIntensity;
      playerHeadlightRef.current.visible = atmos.playerHeadlightIntensity > 0;
    }

    if (groundMatRef.current) {
      groundMatRef.current.color.setHex(atmos.groundColor);
    }

    updateAtmosphericSkybox(skyboxRef.current, timeOfDay, atmos.skyboxTintHex);
    updatePerimeterSceneryLighting(perimeterSceneryRef.current, atmos.streetlightLevel, atmos.groundColor);

    setStreetlightLevel(atmos.streetlightLevel);
    if (materialBucketsRef.current) {
      applyAtmosphereToMaterials(materialBucketsRef.current, atmos);
    }
    if (weatherControllerRef.current) {
      weatherControllerRef.current.setWeather(weather);
    }
  }, [timeOfDay, weather]);

  // Clear Quest Toast after 4 seconds
  useEffect(() => {
    if (questCompletedToast) {
      const t = setTimeout(() => setQuestCompletedToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [questCompletedToast]);

  // Touch Controller Handlers
  const setTouchForward = (val: number) => {
    touchForwardRef.current = val;
  };

  const setTouchTurn = (val: number) => {
    touchTurnRef.current = val;
  };

  const handleRegenerate = () => {
    lastNearbyIdRef.current = null;
    lastNearbyDistRef.current = -1;
    setSeed(Math.floor(Math.random() * 899999) + 100000);
    setNearbyBuilding(null);
  };

  // True Manhattan Road-Grid Path & Live Next-Turn Cue
  const questNavigationHint = useMemo(() => {
    if (!questTarget) return null;

    const path = computeManhattanRoadPath(playerHudState.x, playerHudState.z, questTarget);

    // Total Manhattan road distance along the path
    let roadDist = 0;
    for (let i = 0; i < path.length - 1; i++) {
      roadDist += Math.hypot(path[i + 1].x - path[i].x, path[i + 1].z - path[i].z);
    }
    const dist = Math.round(roadDist);

    // Pick the next road waypoint at least 3.5m ahead of the player so directions follow the street!
    let nextWaypoint = path[path.length - 1];
    let legLength = dist;
    for (let i = 1; i < path.length; i++) {
      const d = Math.hypot(path[i].x - playerHudState.x, path[i].z - playerHudState.z);
      if (d >= 3.5 || i === path.length - 1) {
        nextWaypoint = path[i];
        legLength = d;
        break;
      }
    }

    const dx = nextWaypoint.x - playerHudState.x;
    const dz = nextWaypoint.z - playerHudState.z;
    const targetAngle = Math.atan2(dx, dz);
    let relAngle = targetAngle - playerHudState.heading;
    while (relAngle > Math.PI) relAngle -= Math.PI * 2;
    while (relAngle < -Math.PI) relAngle += Math.PI * 2;

    // Also compute bearing to final entrance for "on your left/right" when close
    const entDx = questTarget.entrancePos[0] - playerHudState.x;
    const entDz = questTarget.entrancePos[2] - playerHudState.z;
    let entRelAngle = Math.atan2(entDx, entDz) - playerHudState.heading;
    while (entRelAngle > Math.PI) entRelAngle -= Math.PI * 2;
    while (entRelAngle < -Math.PI) entRelAngle += Math.PI * 2;

    const isLeft = entRelAngle > 0;
    const sideWordEn = isLeft ? 'left' : 'right';
    const sideWordJa = isLeft ? '左' : '右';
    const legBlocks = Math.min(4, Math.max(1, Math.round(legLength / 30)));
    const BLOCK_WORDS_EN: Record<number, string> = {
      1: 'one block',
      2: 'two blocks',
      3: 'three blocks',
      4: 'four blocks',
    };
    const blocksWordEn = BLOCK_WORDS_EN[legBlocks] || `${legBlocks} blocks`;
    const blocksWordJa = `${legBlocks}ブロック`;

    const targetLabelEn = questMode === 'MYSTERY' ? 'destination' : questTarget.nameEn;
    const targetLabelJa = questMode === 'MYSTERY' ? '目的地' : questTarget.nameJa;

    let directionCueEn = `Go straight for ${blocksWordEn}.`;
    let directionCueJa = `${blocksWordJa}まっすぐ進もう。`;

    if (dist <= 7) {
      directionCueEn = `You arrived! It's right here on your ${sideWordEn}!`;
      directionCueJa = `到着！すぐ${sideWordJa}側にあるよ！`;
    } else if (dist <= 16) {
      if (questTarget.isOnCorner) {
        directionCueEn = `The ${targetLabelEn} is on the corner, on your ${sideWordEn}.`;
        directionCueJa = `${targetLabelJa}は角の${sideWordJa}側にあるよ。`;
      } else {
        directionCueEn = `You can see the ${targetLabelEn} on your ${sideWordEn}.`;
        directionCueJa = `${sideWordJa}側に${targetLabelJa}が見えるよ。`;
      }
    } else if (Math.abs(relAngle) >= 2.35) {
      directionCueEn = `Turn around and go straight for ${blocksWordEn}.`;
      directionCueJa = `後ろを向いて、${blocksWordJa}まっすぐ進もう。`;
    } else if (relAngle > 0.55) {
      directionCueEn = `Turn left at the corner and go straight for ${blocksWordEn}.`;
      directionCueJa = `角を左に曲がって、${blocksWordJa}まっすぐ進もう。`;
    } else if (relAngle < -0.55) {
      directionCueEn = `Turn right at the corner and go straight for ${blocksWordEn}.`;
      directionCueJa = `角を右に曲がって、${blocksWordJa}まっすぐ進もう。`;
    } else {
      directionCueEn = `Go straight for ${blocksWordEn}.`;
      directionCueJa = `${blocksWordJa}まっすぐ進もう。`;
    }

    return { dist, directionCueEn, directionCueJa, sideWordEn, sideWordJa, path };
  }, [questTarget, playerHudState, questMode]);

  // Update pooled 3D Glowing Road Route Chevrons along the Manhattan path (1 InstancedMesh, 0 allocations/leaks)
  useEffect(() => {
    const routeMesh = routeInstancedRef.current;
    const pts = routeChevronPointsRef.current;
    pts.length = 0;

    const shouldShow = !!(showRoadArrows && questMode === 'GUIDED' && questNavigationHint?.path);
    if (!shouldShow || !questNavigationHint) {
      if (routeMesh) {
        routeMesh.count = 0;
        routeMesh.visible = false;
      }
      return;
    }

    const path = questNavigationHint.path;
    const spacing = 4.2;
    for (let i = 0; i < path.length - 1 && pts.length < MAX_ROUTE_CHEVRONS; i++) {
      const a = path[i];
      const b = path[i + 1];
      const segDx = b.x - a.x;
      const segDz = b.z - a.z;
      const segLen = Math.hypot(segDx, segDz);
      if (segLen < 1.5) continue;

      const isRoadSeg = i < path.length - 2 || Math.abs(segDx) < 0.5 || Math.abs(segDz) < 0.5;
      const laneOff = isRoadSeg ? getLeftHandLaneOffset(a, b) : { x: 0, z: 0 };

      const angle = Math.atan2(segDx, segDz);
      const steps = Math.max(1, Math.floor(segLen / spacing));
      for (let s = 0; s < steps && pts.length < MAX_ROUTE_CHEVRONS; s++) {
        const t = (s + 0.5) / steps;
        const cx = a.x + segDx * t + laneOff.x;
        const cz = a.z + segDz * t + laneOff.z;
        pts.push({ x: cx, z: cz, angle });
      }
    }

    if (routeMesh) {
      routeMesh.count = pts.length;
      routeMesh.visible = pts.length > 0;
      for (let i = 0; i < pts.length; i++) {
        const pt = pts[i];
        _chevronDummy.position.set(pt.x, 0.12, pt.z);
        _chevronDummy.rotation.set(0, pt.angle, 0);
        _chevronDummy.scale.set(1.0, 0.22, 1.0);
        _chevronDummy.updateMatrix();
        routeMesh.setMatrixAt(i, _chevronDummy.matrix);
      }
      routeMesh.instanceMatrix.needsUpdate = true;
    }
  }, [questNavigationHint, showRoadArrows, questMode]);

  // Sync 3D pulsing destination beacon with active quest target & mode
  useEffect(() => {
    livingTownRef.current?.setTargetBeacon(
      questTarget?.entrancePos ?? null,
      questMode === 'GUIDED' && !!questTarget
    );
  }, [questTarget, questMode]);

  return (
    <div className="fixed inset-0 w-screen h-dvh overflow-hidden bg-slate-900 select-none font-sans z-50">
      {viewRole === 'DISPATCHER_2D' && townMap && (
        <TownNavigatorDispatcher
          townMap={townMap}
          playerPos={playerHudState}
          targetBuilding={questTarget}
          activeSchool={activeSchool}
          onSendInstruction={(inst) => {
            setPartnerInstruction(inst);
            speakDirectionText(inst.textEn);
          }}
          onSwitchTo3D={() => setViewRole('TRAVELER_3D')}
        />
      )}
      {/* 3D WebGL Canvas Viewport */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />

      {/* TOP HEADER CONTROLS BAR */}
      <header className="absolute top-0 left-0 right-0 z-30 flex flex-nowrap overflow-x-auto no-scrollbar whitespace-nowrap items-center justify-between gap-2 px-3 sm:px-6 py-2 bg-slate-900/95 border-b border-slate-700/80 text-white min-h-[52px]">
        {/* Left: Exit & Mode Switching & Grade Selector */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {onExit && (
            <button
              onClick={onExit}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 text-xs sm:text-sm font-bold border border-slate-700 transition"
              title="Exit / ハブに戻る"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Exit</span>
            </button>
          )}

          {/* Mode Switcher Segmented Control */}
          <div className="flex items-center bg-slate-950/80 p-0.5 rounded-xl border border-slate-700/80">
            {onSwitchToInspector && (
              <button
                onClick={onSwitchToInspector}
                className="flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold text-slate-300 hover:text-white transition cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Model Inspector</span>
                <span className="md:hidden">Inspector</span>
              </button>
            )}
            <button
              onClick={() => setViewRole('TRAVELER_3D')}
              className={`flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewRole === 'TRAVELER_3D'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Town Navigator</span>
              <span className="md:hidden">Navigator</span>
            </button>
            <button
              onClick={() => setViewRole('DISPATCHER_2D')}
              className={`flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewRole === 'DISPATCHER_2D'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="2D Mission Control Dispatcher Console / 案内係モード"
            >
              <Radio className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden md:inline">Co-Op Dispatcher</span>
              <span className="md:hidden">Dispatcher</span>
            </button>
            <button
              onClick={() => setHostRaceMode(true)}
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-black bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition cursor-pointer"
              title="Host Multi-iPad Directions Race (Stream B) / クラス全員で3D道案内レース"
            >
              <span>🏁</span>
              <span className="hidden md:inline">Multi-iPad Race</span>
              <span className="md:hidden">Race</span>
            </button>
          </div>

          {hostRaceMode && (
            <div className="fixed inset-0 z-[100] bg-slate-950">
              <TownNavigatorHostContainer onExit={() => setHostRaceMode(false)} />
            </div>
          )}

          {/* Grade Selector Segmented Control (5th vs 6th Grade Curriculum) */}
          <div className="flex items-center bg-slate-950/80 p-0.5 rounded-xl border border-slate-700/80">
            <button
              onClick={() => handleGradeChange(5)}
              className={`flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-black transition ${
                selectedGrade === 5
                  ? 'bg-sky-500 text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="Grade 5 Curriculum (Here We Go 5: School, Hospital, Shops)"
            >
              <span>5th Grade</span>
              <span className="text-[10px] opacity-75">(小5)</span>
            </button>
            <button
              onClick={() => handleGradeChange(6)}
              className={`flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-black transition ${
                selectedGrade === 6
                  ? 'bg-indigo-500 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="Grade 6 Curriculum (Here We Go 6: Junior High School, Department Store, Swimming Pool)"
            >
              <span>6th Grade</span>
              <span className="text-[10px] opacity-75">(小6)</span>
            </button>
          </div>
        </div>

        {/* Center: Seed Indicator & Regenerate */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={handleRegenerate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs sm:text-sm font-black shadow-md active:scale-95 transition"
            title="Generate New Town / 新しい町をつくる"
          >
            <RotateCw className="w-4 h-4" />
            <span>🎲 New Town</span>
          </button>
          <span className="hidden lg:inline text-[11px] font-mono text-slate-400 bg-slate-950/60 px-2 py-1 rounded-md border border-slate-800">
            Seed: {seed}
          </span>
        </div>

        {/* Right: Camera (3-Way), Time of Day (4-Way), Weather (6-Way), Mute */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-nowrap">
          <button
            onClick={cycleCameraMode}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-xs font-bold border border-slate-700 text-sky-400 transition cursor-pointer"
            title="Toggle Camera: 3rd Person / 1st Person / Bird's Eye (C)"
          >
            {cameraMode === 'FIRST_PERSON' && <Eye className="w-4 h-4 text-emerald-400" />}
            {cameraMode === 'CHASE' && <Camera className="w-4 h-4 text-sky-400" />}
            {cameraMode === 'ISOMETRIC' && <Layers className="w-4 h-4 text-amber-400" />}
            <span className="hidden xl:inline">
              {cameraMode === 'FIRST_PERSON' ? '1st Person' : cameraMode === 'CHASE' ? '3rd Person' : "Bird's Eye"}
            </span>
          </button>

          {/* 4-Way Time of Day Segmented Bar */}
          <div
            className="flex items-center bg-slate-950/90 p-0.5 rounded-xl border border-slate-700/80"
            role="group"
            aria-label="Time of Day Selector"
          >
            {TIME_OF_DAY_ORDER.map((tMode) => {
              const tPreset = TIME_OF_DAY_PRESETS[tMode];
              const isActive = timeOfDay === tMode;
              return (
                <button
                  key={tMode}
                  onClick={() => setTimeOfDay(tMode)}
                  data-testid={`nav-time-${tMode.toLowerCase()}`}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                    isActive
                      ? tMode === 'MORNING'
                        ? 'bg-amber-400 text-slate-950 shadow-sm'
                        : tMode === 'DAY'
                        ? 'bg-sky-400 text-slate-950 shadow-sm'
                        : tMode === 'SUNSET'
                        ? 'bg-orange-500 text-white shadow-sm'
                        : 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title={`${tPreset.labelEn} (${tPreset.labelJa} · ${tPreset.clockLabel}) [Shortcut: L]`}
                >
                  {tMode === 'MORNING' && <Sunrise className="w-3.5 h-3.5" />}
                  {tMode === 'DAY' && <Sun className="w-3.5 h-3.5" />}
                  {tMode === 'SUNSET' && <Sunset className="w-3.5 h-3.5" />}
                  {tMode === 'NIGHT' && <Moon className="w-3.5 h-3.5" />}
                  <span className="hidden lg:inline">{tPreset.labelEn}</span>
                </button>
              );
            })}
          </div>

          {/* 6-Way Weather Toggle Segmented Bar */}
          <div
            className="flex items-center bg-slate-950/90 p-0.5 rounded-xl border border-slate-700/80"
            role="group"
            aria-label="Weather Selector"
          >
            {WEATHER_MODE_ORDER.map((wMode) => {
              const wPreset = WEATHER_PRESETS[wMode];
              const isActive = weather === wMode;
              return (
                <button
                  key={wMode}
                  onClick={() => setWeather(wMode)}
                  data-testid={`nav-weather-${wMode.toLowerCase()}`}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                    isActive
                      ? wMode === 'CLEAR'
                        ? 'bg-emerald-500 text-slate-950 shadow-sm'
                        : wMode === 'LIGHT_RAIN'
                        ? 'bg-sky-500 text-slate-950 shadow-sm'
                        : wMode === 'HEAVY_RAIN'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : wMode === 'LIGHT_SNOW'
                        ? 'bg-cyan-300 text-slate-950 shadow-sm'
                        : wMode === 'HEAVY_SNOW'
                        ? 'bg-slate-200 text-slate-950 shadow-sm'
                        : 'bg-pink-400 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title={`${wPreset.labelEn} (${wPreset.labelJa}) [Shortcut: K]`}
                >
                  {wMode === 'CLEAR' && <Sun className="w-3.5 h-3.5" />}
                  {(wMode === 'LIGHT_RAIN' || wMode === 'HEAVY_RAIN') && <CloudRain className="w-3.5 h-3.5" />}
                  {(wMode === 'LIGHT_SNOW' || wMode === 'HEAVY_SNOW') && <CloudSnow className="w-3.5 h-3.5" />}
                  {wMode === 'SAKURA' && <Flower2 className="w-3.5 h-3.5" />}
                  <span className="hidden xl:inline">{wPreset.shortLabel}</span>
                </button>
              );
            })}
          </div>

          <button
            onClick={toggleMute}
            className={`p-1.5 rounded-xl border transition cursor-pointer ${
              isMuted 
                ? 'bg-rose-900/60 border-rose-700 text-rose-300' 
                : 'bg-slate-800 border-slate-700 text-emerald-400'
            }`}
            title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
          >
            <Volume2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* QUEST / MISSION HUD BANNER (TOP-LEFT) WITH GUIDED vs. MYSTERY CHALLENGE MODE */}
      {questTarget && (
        <div className="absolute top-16 left-3 sm:left-6 z-20 max-w-[325px] sm:max-w-sm bg-slate-900/95 border-2 border-amber-400/80 rounded-2xl p-3 shadow-xl text-white">
          <div className="flex items-center justify-between gap-1.5 mb-2">
            {/* Guided vs. Mystery Listening Challenge Mode Toggle */}
            <div className="flex items-center bg-slate-950/90 p-0.5 rounded-lg border border-slate-700/80 text-[10px] font-black">
              <button
                onClick={() => setQuestMode('GUIDED')}
                className={`px-2 py-0.5 rounded-md transition ${
                  questMode === 'GUIDED'
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Guided Mode: Shows building name & road arrows"
              >
                🧭 Guided (練習)
              </button>
              <button
                onClick={() => setQuestMode('MYSTERY')}
                className={`px-2 py-0.5 rounded-md transition ${
                  questMode === 'MYSTERY'
                    ? 'bg-purple-500 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Mystery Mode: Hides building name — follow the English directions to find it! (+2★)"
              >
                🎧 Mystery (挑戦)
              </button>
            </div>

            <div className="flex items-center gap-1">
              {questTarget.grade === 6 && questMode === 'GUIDED' && (
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                  G6
                </span>
              )}
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                ★ {questScore}
              </span>
            </div>
          </div>

          {/* Progression Stage & Distance Radius Badge */}
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mb-2 px-0.5 border-b border-slate-800 pb-1.5">
            <span className="flex items-center gap-1.5 font-black">
              {completedQuestCount < 2 ? (
                <span className="text-emerald-400 flex items-center gap-1">
                  <span>🚶</span> Stage 1: Neighborhood (≤38m)
                </span>
              ) : completedQuestCount < 4 ? (
                <span className="text-sky-400 flex items-center gap-1">
                  <span>🚲</span> Stage 2: District Cruiser (≤75m)
                </span>
              ) : (
                <span className="text-rose-400 flex items-center gap-1">
                  <span>🏎️</span> Stage 3: Grand Prix City Tour
                </span>
              )}
            </span>
            <span className="text-slate-400 font-mono text-[9px] bg-slate-800/80 px-1.5 py-0.5 rounded">
              Goal #{completedQuestCount + 1}
            </span>
          </div>

          <div className="flex items-start justify-between gap-2.5">
            <div className="flex items-start gap-2.5 min-w-0">
              <div className={`p-2 rounded-xl border shrink-0 mt-0.5 ${
                questMode === 'MYSTERY'
                  ? 'bg-purple-500/15 border-purple-400/40 text-purple-300'
                  : 'bg-amber-500/10 border-amber-400/30 text-amber-400'
              }`}>
                {questMode === 'MYSTERY' ? <HelpCircle className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-black text-white leading-snug">
                  {questMode === 'MYSTERY'
                    ? 'Where am I going? ???'
                    : `Find the ${questTarget.nameEn}`}
                </div>
                <div className="text-xs text-amber-200/90 font-bold leading-normal mt-0.5">
                  {questMode === 'MYSTERY'
                    ? '英語の道案内を聞いて目的地を探そう！'
                    : questTarget.rubyName}
                </div>
              </div>
            </div>

            {questMode === 'GUIDED' && (
              <button
                type="button"
                onClick={() => setShowRoadArrows(!showRoadArrows)}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition shrink-0 ${
                  showRoadArrows
                    ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
                title="Toggle 3D glowing road guide arrows"
              >
                <MapPin className="w-3 h-3 inline mr-0.5" />
                Arrows
              </button>
            )}
          </div>

          {/* Step-by-Step Starting Route Script (Always shown in Mystery Mode, or collapsible reference) */}
          {questStartScript && questMode === 'MYSTERY' && (
            <div className="mt-2 p-2 rounded-xl bg-purple-950/50 border border-purple-500/30 text-[11px] space-y-1">
              <div className="flex items-center justify-between text-purple-300 font-black">
                <span>📜 Route from Start:</span>
                <button
                  type="button"
                  onClick={() => speakDirectionText(questStartScript.stepsEn.join(' '))}
                  className="flex items-center gap-1 px-2 py-0.5 rounded bg-purple-500/30 hover:bg-purple-500/50 text-white text-[10px]"
                >
                  <Volume2 className="w-3 h-3" /> Listen All
                </button>
              </div>
              {questStartScript.stepsEn.map((step, idx) => (
                <div key={idx} className="text-slate-200 font-semibold leading-tight">
                  <span className="text-purple-400 font-mono mr-1">{idx + 1}.</span>
                  {step}
                </div>
              ))}
            </div>
          )}

          {/* Live Co-Op Dispatcher Partner Direction Banner */}
          {partnerInstruction && (
            <div className="mt-2.5 pt-2 border-t border-sky-500/40 bg-sky-950/40 rounded-xl p-2.5 shadow-md">
              <div className="flex items-center justify-between gap-1.5 mb-1">
                <div className="flex items-center gap-1.5 text-xs font-black text-sky-300">
                  <Radio className="w-4 h-4 text-sky-400 shrink-0" />
                  <span>PARTNER DISPATCH (案内係より)</span>
                </div>
                <button
                  type="button"
                  onClick={() => speakDirectionText(partnerInstruction.textEn)}
                  className="p-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/30 active:scale-95 transition cursor-pointer"
                  title="Listen / 音声を聞く"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="text-sm font-black text-white pl-5 leading-snug">
                "{partnerInstruction.textEn}"
              </div>
              <div className="text-[11px] font-bold text-slate-300 mt-0.5 pl-5 leading-tight">
                「{partnerInstruction.textJa}」
              </div>
            </div>
          )}

          {/* MEXT Live Road-Grid Directions Prompt */}
          {questNavigationHint && (
            <div className="mt-2.5 pt-2 border-t border-slate-700/80">
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5 text-xs font-black text-amber-300 leading-snug">
                  <Navigation className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>{questNavigationHint.directionCueEn}</span>
                </div>
                <button
                  type="button"
                  onClick={() => speakDirectionText(questNavigationHint.directionCueEn)}
                  className="p-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 active:scale-95 transition shrink-0 cursor-pointer"
                  title="Listen to direction / 英語の道案内を聞く"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="text-[11px] font-bold text-slate-300 mt-0.5 pl-5 leading-tight">
                {questNavigationHint.directionCueJa}
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[10px] font-mono text-slate-400 pl-5">
                <span>{questNavigationHint.dist}m along road</span>
                {questTarget.isOnCorner && (
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold font-sans flex items-center gap-1">
                    <span>📍</span>
                    <span>On the corner (角)</span>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* QUEST COMPLETED CELEBRATORY TOAST */}
      {questCompletedToast && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-5 py-2.5 rounded-2xl shadow-2xl border-2 border-emerald-300 flex items-center gap-2 animate-bounce">
          <Trophy className="w-5 h-5 text-yellow-300" />
          <span className="text-sm sm:text-base font-black tracking-wide">{questCompletedToast}</span>
        </div>
      )}

      {/* MINIMAP RADAR (TOP-RIGHT) - 24x24 Grid (144m x 144m) */}
      {townMap && (
        <div className="absolute top-16 right-3 sm:right-6 z-20 bg-slate-950/95 border border-slate-700/80 rounded-2xl p-2.5 shadow-xl text-white">
          <div className="flex items-center justify-between text-[10px] font-black tracking-wider text-slate-400 mb-1 px-1">
            <span>TOWN MAP (144m)</span>
            <span className="text-rose-400 font-mono">N ▲</span>
          </div>
          <div className="relative w-32 h-32 sm:w-36 sm:h-36 bg-slate-900 rounded-xl overflow-hidden border border-slate-800">
            <svg className="w-full h-full" viewBox="-75 -75 150 150">
              {/* Side Streets (Rows & Cols at -63m, -33m, +33m, +63m) */}
              {[-63, -33, 33, 63].map(coord => (
                <g key={`side_${coord}`}>
                  <line x1="-72" y1={coord} x2="72" y2={coord} stroke="#334155" strokeWidth="4.5" />
                  <line x1={coord} y1="-72" x2={coord} y2="72" stroke="#334155" strokeWidth="4.5" />
                </g>
              ))}

              {/* 12m Grand Central Boulevard (along X and Z at 0) */}
              <line x1="-72" y1="0" x2="72" y2="0" stroke="#1e293b" strokeWidth="10.0" />
              <line x1="0" y1="-72" x2="0" y2="72" stroke="#1e293b" strokeWidth="10.0" />
              {/* Boulevard Center Median */}
              <line x1="-72" y1="0" x2="72" y2="0" stroke="#15803d" strokeWidth="1.8" />
              <line x1="0" y1="-72" x2="0" y2="72" stroke="#15803d" strokeWidth="1.8" />

              {/* Highlighted Road Path in Guided Mode */}
              {questMode === 'GUIDED' && questNavigationHint?.path && questNavigationHint.path.length >= 2 && (
                <polyline
                  fill="none"
                  stroke="#facc15"
                  strokeWidth="2.2"
                  strokeDasharray="3.5,2.0"
                  points={questNavigationHint.path.map(p => `${p.x},${p.z}`).join(' ')}
                />
              )}

              {/* Building parcels */}
              {townMap.buildingsList.map((b, idx) => {
                const isRot90 = Math.abs(Math.sin(b.rotationY)) > 0.5;
                const bw = isRot90 ? b.depthMeters : b.widthMeters;
                const bd = isRot90 ? b.widthMeters : b.depthMeters;
                const isPassive = b.tier === 0 || (selectedGrade === 5 && b.grade === 6);
                const color = isPassive
                  ? (b.id === 'EMPTY_LOT' ? '#22c55e' : b.id === 'APARTMENT' ? '#475569' : '#64748b')
                  : b.tier === 3 
                  ? '#f59e0b' 
                  : b.tier === 2 
                  ? '#38bdf8' 
                  : '#10b981';
                // In MYSTERY mode, hide the target highlight on the radar so students follow the English directions!
                const isTarget = questMode === 'GUIDED' && questTarget?.id === b.id;
                return (
                  <g key={idx}>
                    <rect
                      x={b.worldPos[0] - bw / 2 + 0.4}
                      y={b.worldPos[2] - bd / 2 + 0.4}
                      width={bw - 0.8}
                      height={bd - 0.8}
                      fill={isTarget ? '#fbbf24' : color}
                      opacity={isTarget ? 0.95 : isPassive ? 0.45 : 0.75}
                      stroke={isTarget ? '#ffffff' : '#1e293b'}
                      strokeWidth={isTarget ? 1.0 : 0.4}
                    />
                    {isTarget && (
                      <circle
                        cx={b.entrancePos[0]}
                        cy={b.entrancePos[2]}
                        r={1.8}
                        fill="#ef4444"
                        stroke="#ffffff"
                        strokeWidth={0.8}
                      />
                    )}
                  </g>
                );
              })}

              {/* Player Position Dot & Heading Pointer */}
              <g transform={`translate(${playerHudState.x}, ${playerHudState.z}) rotate(${(-playerHudState.heading * 180) / Math.PI})`}>
                <circle r="3.2" fill="#ef4444" stroke="#ffffff" strokeWidth="1.0" />
                <polygon points="0,5.5 -2.6,1.8 2.6,1.8" fill="#fca5a5" />
              </g>
            </svg>
          </div>
          <div className="flex items-center justify-around text-[9px] font-bold text-slate-400 mt-1.5 px-0.5">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-amber-400 inline-block" /> T3</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-sky-400 inline-block" /> T2</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-emerald-400 inline-block" /> T1</span>
          </div>
        </div>
      )}

      {/* PROXIMITY FACILITY BANNER (BOTTOM-CENTER) */}
      {nearbyBuilding && (
        <div className="absolute bottom-24 sm:bottom-6 left-1/2 -translate-x-1/2 z-30 w-[94vw] max-w-xl bg-slate-900/95 border-2 border-amber-400 rounded-3xl p-4 sm:p-5 shadow-2xl text-white animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  nearbyBuilding.tier === 3
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : nearbyBuilding.tier === 2
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                    : nearbyBuilding.tier === 1
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-slate-700/50 text-slate-300 border border-slate-600/60'
                }`}>
                  Tier {nearbyBuilding.tier} • {
                    nearbyBuilding.tier === 3 
                      ? 'City Landmark' 
                      : nearbyBuilding.tier === 2 
                      ? (nearbyBuilding.grade === 6 ? 'Grade 6 Facility' : 'Civic Facility')
                      : nearbyBuilding.tier === 1 
                      ? 'Neighborhood Shop' 
                      : (nearbyBuilding.id === 'EMPTY_LOT' ? 'Pocket Park' : 'Residential House')
                  }
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {nearbyDistance}m to entrance
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-amber-300 tracking-tight leading-snug break-words">
                {nearbyBuilding.nameEn}
              </h2>

              <div className="text-base sm:text-lg font-bold text-slate-200 mt-1.5 leading-normal">
                {nearbyBuilding.rubyName}
              </div>

              <div className="mt-2 text-xs sm:text-sm text-slate-300 bg-slate-800/80 rounded-xl px-3 py-2 border border-slate-700/60">
                <div className="text-amber-400 font-bold">
                  You are at the {nearbyBuilding.nameEn}!
                </div>
                {questNavigationHint && (
                  <div className="mt-1 text-slate-200 font-medium flex items-center justify-between gap-1.5">
                    <div>
                      <span className="text-sky-300 font-bold">Next: </span>
                      {questNavigationHint.directionCueEn}
                      <span className="text-slate-400 text-xs ml-1.5">({questNavigationHint.directionCueJa})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => speakDirectionText(questNavigationHint.directionCueEn)}
                      className="p-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 active:scale-95 transition shrink-0 cursor-pointer"
                      title="Listen to direction / 英語の道案内を聞く"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2 shrink-0">
              <button
                onClick={() => speakBuildingName(nearbyBuilding)}
                className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm shadow-md active:scale-95 transition"
                title="Hear English pronunciation / 発音を聞く"
              >
                <Volume2 className="w-4 h-4" />
                <span>Hear Word</span>
              </button>

              <button
                onClick={() => playFacilitySound(nearbyBuilding)}
                className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 active:scale-95 transition"
                title="Play environmental sound / 施設の音を再生"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>{BUILDING_SOUND_LABELS[nearbyBuilding.id] ?? 'Play Sound'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DUAL-HAND VIRTUAL JOYSTICK, SPEED PILL, BELL & 90° MEXT SNAP-TURN DECK */}
      <VirtualJoystickPad
        onMoveVector={(fwd, trn) => {
          touchForwardRef.current = fwd;
          touchTurnRef.current = trn;
        }}
        onSnapTurn={triggerSnapTurn}
        onRingBell={() => {
          if (!isMutedRef.current) townAudio.playBicycleBell();
        }}
        travelMode={travelMode}
        completedQuestCount={completedQuestCount}
        onSelectTravelMode={(mode) => {
          setTravelMode(mode);
          if (mode === 'BIKE' && !isMutedRef.current) townAudio.playBicycleBell();
          if (mode === 'KART') soundEffects.playCorrect();
        }}
        language="en"
      />

      {/* DESKTOP KEYBOARD HINTS PILL (ABOVE RIGHT-HAND SNAP-TURN DECK) */}
      <div className="hidden xl:flex flex-col gap-1 absolute bottom-36 right-5 z-20 bg-slate-950/95 px-3.5 py-2.5 rounded-2xl border border-slate-800 text-slate-400 text-[11px] font-medium shadow-lg">
        <div className="flex items-center gap-2">
          <span><kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700 font-mono text-[10px]">W/S</kbd> Move</span>
          <span>•</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700 font-mono text-[10px]">A/D</kbd> Turn</span>
          <span>•</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700 font-mono text-[10px]">Q/E</kbd> 90°</span>
          <span>•</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700 font-mono text-[10px]">1-4</kbd> Speed</span>
        </div>
        <div className="flex items-center gap-2">
          <span><kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700 font-mono text-[10px]">Drag / R/F</kbd> Look</span>
          <span>•</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700 font-mono text-[10px]">C</kbd> Camera</span>
          <span>•</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700 font-mono text-[10px]">Space / B</kbd> Bell</span>
        </div>
      </div>
    </div>
  );
};
