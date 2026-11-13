import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { detectClassroomGpuProfile } from '@/utils/classroom3d';
import { generateRandomTown, TownMap, PlacedBuilding } from './townGenerator';
import { buildPlayerAvatar, PlayerAvatar } from './models/playerAvatar';
import { buildBicycleMesh } from './models/bicycle';
import { buildMicroKart } from '../suzuka_grand_prix/engine/MicroKartBuilder.js';
import { updateTrafficSignals, setStreetlightLevel } from './models/roadTiles';
import { townAudio } from './townAudio';
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
  Point2D 
} from './navigationLogic';
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
  const animFrameRef = useRef<number | null>(null);
  const keysPressed = useRef<Set<string>>(new Set());
  const touchForwardRef = useRef<number>(0);
  const touchTurnRef = useRef<number>(0);

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
  const routeMarkersGroupRef = useRef<THREE.Group | null>(null);
  const materialBucketsRef = useRef<SceneMaterialBuckets | null>(null);
  const weatherControllerRef = useRef<WeatherParticleController | null>(null);

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
      const map = generateRandomTown(seed, { schoolId: activeSchool });
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
  }, [seed, activeSchool, getProgressiveQuestTarget, assignNewQuest]);

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

  // Procedural Sound FX Helper
  const playFacilitySound = useCallback((building: PlacedBuilding) => {
    if (isMutedRef.current) return;

    switch (building.id) {
      case 'SCHOOL':
        townAudio.playSchoolBell();
        break;
      case 'JUNIOR_HIGH_SCHOOL':
        townAudio.playJuniorHighBell();
        break;
      case 'DEPARTMENT_STORE':
        townAudio.playDepartmentStoreChime();
        break;
      case 'SWIMMING_POOL':
        townAudio.playSwimmingPoolSound();
        break;
      case 'STATION':
        townAudio.playStationMelody();
        break;
      case 'STADIUM':
        townAudio.playStadiumCheer();
        break;
      case 'CONVENIENCE_STORE':
        townAudio.playConvenienceStoreChime();
        break;
      case 'POST_OFFICE':
        townAudio.playPostOfficeChime();
        break;
      case 'POLICE_STATION':
        townAudio.playPoliceWhistle();
        break;
      case 'HOSPITAL':
        townAudio.playHospitalChime();
        break;
      case 'FIRE_STATION':
        townAudio.playEmergencySiren();
        break;
      case 'SUPERMARKET':
        townAudio.playSupermarketChime();
        break;
      case 'RESTAURANT':
        townAudio.playRestaurantChime();
        break;
      case 'BOOKSTORE':
        townAudio.playBookstoreChime();
        break;
      case 'FLOWER_SHOP':
        townAudio.playFlowerShopChime();
        break;
      case 'BUS_STOP':
        townAudio.playBusStopChime();
        break;
      case 'CITY_HALL':
        townAudio.playCityHallChime();
        break;
      case 'LIBRARY':
        townAudio.playLibraryChime();
        break;
      case 'GYM':
        townAudio.playGymBuzzer();
        break;
      case 'MUSEUM':
        townAudio.playMuseumChime();
        break;
      case 'TEMPLE':
        townAudio.playTempleBell();
        break;
      case 'SHRINE':
        townAudio.playShrineChime();
        break;
      case 'PARK':
      case 'GARDEN':
        townAudio.playParkFountain();
        break;
      case 'CASTLE':
        townAudio.playCastleDrums();
        break;
      case 'AMUSEMENT_PARK':
        townAudio.playAmusementParkMusic();
        break;
      case 'AQUARIUM':
        townAudio.playAquariumSonar();
        break;
      case 'ZOO':
        townAudio.playZooCall();
        break;
      default:
        townAudio.playBicycleBell();
        break;
    }
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

  // Three.js Scene Setup & Render Loop
  useEffect(() => {
    if (!mountRef.current || !townMap) return;

    const container = mountRef.current;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const atmos = getCompositeAtmosphere(timeOfDayRef.current, weatherRef.current);
    scene.background = new THREE.Color(atmos.skyColor);
    scene.fog = new THREE.FogExp2(atmos.fogColor, atmos.fogDensity);

    // 1.5. 360° Atmospheric Skybox Dome (with clouds, sun/moon & stars)
    const skybox = buildAtmosphericSkybox(timeOfDayRef.current, 320);
    updateAtmosphericSkybox(skybox, timeOfDayRef.current, atmos.skyboxTintHex);
    skyboxRef.current = skybox;
    scene.add(skybox);

    // 2. Camera (Extended far plane so perimeter mountains, Mt. Fuji, and city skyline render cleanly)
    const camera = new THREE.PerspectiveCamera(54, width / height, 0.2, 650);
    cameraRef.current = camera;
    camera.position.set(0, 4, -6);

    // 3. Renderer & Classroom GPU Profile (Adaptive: 60 FPS on iPads & Dynabook laptops)
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
      precision: 'highp',
    });
    rendererRef.current = renderer;

    const gpu = detectClassroomGpuProfile(renderer.getContext());
    const isTabletOrMobile = gpu.isMobileOrTablet;

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setSize(width, height);
    renderer.setPixelRatio(gpu.targetPixelRatio);
    renderer.shadowMap.enabled = gpu.enableDynamicShadows;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = atmos.toneMappingExposure;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 3.5. Studio PBR Environment Reflections for glass, water, and metallic trim
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    const envTarget = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envTarget.texture;
    scene.environmentIntensity = atmos.environmentIntensity;
    pmremGenerator.dispose();

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
      townMap.spawnPoint[0] + atmos.sunPosition[0],
      atmos.sunPosition[1],
      townMap.spawnPoint[2] + atmos.sunPosition[2]
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

    const playerLamp = new THREE.PointLight(0xfef08a, atmos.playerLampIntensity, 28.0, 1.2);
    playerLampRef.current = playerLamp;
    playerLamp.position.set(townMap.spawnPoint[0], 5.0, townMap.spawnPoint[2]);
    scene.add(playerLamp);

    // 4.2. Forward Headlight Beam for Sunset/Night/Stormy Weather
    const playerHeadlight = new THREE.SpotLight(0xfffbeb, atmos.playerHeadlightIntensity, 26.0, Math.PI / 5.2, 0.55, 1.2);
    playerHeadlightRef.current = playerHeadlight;
    playerHeadlight.position.set(townMap.spawnPoint[0], 1.15, townMap.spawnPoint[2]);
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
    });
    perimeterSceneryRef.current = perimeterScenery;
    updatePerimeterSceneryLighting(perimeterScenery, atmos.streetlightLevel, atmos.groundColor);
    scene.add(perimeterScenery);

    // 6. Add Town Road Network & Buildings
    scene.add(townMap.roadsGroup);
    scene.add(townMap.buildingsGroup);

    // Collect building windows, backlit storefront signboards, and road asphalt materials
    const buckets = collectSceneWeatherMaterials(scene);
    materialBucketsRef.current = buckets;
    applyAtmosphereToMaterials(buckets, atmos);

    // 6.2. 3D Weather Particle System (Rain Streaks + Ground Splash Ripples, Snowflakes, 3D Sakura Petals)
    const weatherController = createWeatherParticleController(48, 22, 48);
    weatherController.setWeather(weatherRef.current);
    weatherControllerRef.current = weatherController;
    scene.add(weatherController.group);

    // 6.5. 3D Road Route Chevron Arrows Group
    const routeGroup = new THREE.Group();
    routeGroup.name = 'RoadRouteChevrons';
    scene.add(routeGroup);
    routeMarkersGroupRef.current = routeGroup;

    // 7. Add Player Avatar & Vehicles at Spawn Point
    const player = buildPlayerAvatar();
    playerRef.current = player;
    playerPosRef.current.set(townMap.spawnPoint[0], townMap.spawnPoint[1], townMap.spawnPoint[2]);
    playerRotRef.current = townMap.spawnHeading ?? 0;
    player.group.position.copy(playerPosRef.current);
    player.group.rotation.y = playerRotRef.current;
    scene.add(player.group);

    // Snap camera immediately behind player at spawn so it never lerps through buildings from (0, 4, -6)
    const initAngle = playerRotRef.current;
    camera.position.set(
      playerPosRef.current.x - Math.sin(initAngle) * 4.8,
      playerPosRef.current.y + 2.4,
      playerPosRef.current.z - Math.cos(initAngle) * 4.8
    );
    camera.lookAt(playerPosRef.current.x, playerPosRef.current.y + 1.3, playerPosRef.current.z);

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

    // 8. Kinetic Props Lookup
    const wheelRotor = townMap.buildingsGroup.getObjectByName('AmusementPark_WheelRotor');
    const carouselRotor = townMap.buildingsGroup.getObjectByName('AmusementPark_CarouselRotor');

    // 9. Resize Handler
    const handleResize = () => {
      if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;
      const nw = mountRef.current.clientWidth;
      const nh = mountRef.current.clientHeight;
      cameraRef.current.aspect = nw / nh;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(nw, nh);
    };
    window.addEventListener('resize', handleResize);

    let lastHudUpdateTime = 0;

    // 11. Physics Collision Solver
    const solveCollisions = (pos: THREE.Vector3) => {
      pos.x = THREE.MathUtils.clamp(pos.x, -38.0, 38.0);
      pos.z = THREE.MathUtils.clamp(pos.z, -38.0, 38.0);

      const pRadius = 0.35;

      for (const b of townMap.buildingsList) {
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
    };

    let isDisposed = false;
    let lastFrameTime = performance.now();
    const startTime = lastFrameTime;
    const gl = renderer.getContext() as WebGL2RenderingContext;

    const afterDraw = gpu.isSoftware
      ? (cb: () => void) => {
          const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
          gl.flush();
          if (!sync) {
            animFrameRef.current = window.setTimeout(cb, 80);
            return;
          }
          const poll = () => {
            if (isDisposed) {
              gl.deleteSync(sync);
              return;
            }
            const state = gl.getSyncParameter(sync, gl.SYNC_STATUS);
            if (state === gl.UNSIGNALED) {
              animFrameRef.current = window.setTimeout(poll, 5);
            } else {
              gl.deleteSync(sync);
              animFrameRef.current = window.setTimeout(cb, 80);
            }
          };
          animFrameRef.current = window.setTimeout(poll, 5);
        }
      : (cb: () => void) => {
          if (!isDisposed) animFrameRef.current = requestAnimationFrame(cb);
        };

    // 12. Main 60 FPS Render & Player-Relative Movement Loop
    const animate = () => {
      if (isDisposed) return;

      const now = performance.now();
      const delta = Math.min((now - lastFrameTime) * 0.001, 0.1);
      lastFrameTime = now;
      const elapsed = (now - startTime) * 0.001;

      if (viewRoleRef.current === 'DISPATCHER_2D' || document.body.dataset.state === 'paused') {
        animFrameRef.current = window.setTimeout(animate, 120);
        return;
      }

      if (wheelRotor) {
        wheelRotor.rotation.z -= delta * 0.22;
        for (let i = 0; i < 8; i++) {
          const gondola = wheelRotor.getObjectByName(`Gondola_${i}`);
          if (gondola) {
            gondola.rotation.z = -wheelRotor.rotation.z;
          }
        }
      }
      if (carouselRotor) {
        carouselRotor.rotation.y += delta * 0.85;
      }

      // Pulse 3D Road Route Chevrons in a wave toward the destination
      if (routeMarkersGroupRef.current && routeMarkersGroupRef.current.visible) {
        const children = routeMarkersGroupRef.current.children;
        for (let i = 0; i < children.length; i++) {
          const chevron = children[i] as THREE.Mesh;
          const wave = Math.sin(elapsed * 5.0 - i * 0.7) * 0.5 + 0.5;
          chevron.scale.setScalar(0.85 + wave * 0.3);
        }
      }

      updateTrafficSignals(elapsed);

      // 1. TURNING (YAW ROTATION)
      let turn = 0;
      if (keysPressed.current.has('a') || keysPressed.current.has('arrowleft')) turn += 1;
      if (keysPressed.current.has('d') || keysPressed.current.has('arrowright')) turn -= 1;
      if (touchTurnRef.current !== 0) turn += touchTurnRef.current;

      const currentMode = travelModeRef.current;
      const turnSpeed = currentMode === 'KART' ? 3.3 : currentMode === 'BIKE' ? 3.0 : currentMode === 'RUN' ? 2.8 : 2.6;
      if (turn !== 0) {
        playerRotRef.current += turn * turnSpeed * delta;
      }

      if (keysPressed.current.has('r') || keysPressed.current.has('pageup')) {
        cameraPitchRef.current += 1.8 * delta;
      }
      if (keysPressed.current.has('f') || keysPressed.current.has('pagedown')) {
        cameraPitchRef.current -= 1.8 * delta;
      }
      cameraPitchRef.current = THREE.MathUtils.clamp(cameraPitchRef.current, -0.65, 0.75);

      // 2. FORWARD / BACKWARD MOVEMENT (Grid-calibrated speeds: 6m, 12m, 18m, 24m)
      let forward = 0;
      if (keysPressed.current.has('w') || keysPressed.current.has('arrowup')) forward += 1;
      if (keysPressed.current.has('s') || keysPressed.current.has('arrowdown')) forward -= 0.6;
      if (touchForwardRef.current !== 0) forward += touchForwardRef.current;

      const isMoving = Math.abs(forward) > 0.05 || Math.abs(turn) > 0.05;
      const baseSpeed = TRAVEL_SPEEDS[currentMode];
      const speedRatio = currentMode === 'KART' ? 3.5 : currentMode === 'BIKE' ? 2.5 : currentMode === 'RUN' ? 2.0 : 1.0;

      if (forward !== 0) {
        const angle = playerRotRef.current;
        const moveStep = forward * baseSpeed * delta;
        playerPosRef.current.x += Math.sin(angle) * moveStep;
        playerPosRef.current.z += Math.cos(angle) * moveStep;

        solveCollisions(playerPosRef.current);
        player.group.position.copy(playerPosRef.current);
      }

      player.group.rotation.y = playerRotRef.current;

      // Update 3D Vehicle & Avatar attachment postures
      if (currentMode === 'KART') {
        bike.group.visible = false;
        kart.kartRoot.visible = true;
        player.body.position.set(0, 0.06, 0.05);
        player.leftLeg.visible = false;
        player.rightLeg.visible = false;
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

      player.updateAnimation(isMoving, delta, speedRatio);
      playerLamp.position.set(playerPosRef.current.x, 5.2, playerPosRef.current.z);

      // Update player forward headlight beam & 3D weather particles around the player
      if (playerHeadlightRef.current) {
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

      // 3. DYNAMIC CAMERA TRACKING MODES (Auto-pulls back for high speeds)
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

          const targetCamX = playerPosRef.current.x - Math.sin(angle) * camDistance;
          const targetCamY = playerPosRef.current.y + camHeight;
          const targetCamZ = playerPosRef.current.z - Math.cos(angle) * camDistance;

          camera.position.lerp(new THREE.Vector3(targetCamX, targetCamY, targetCamZ), 0.14);

          const pitch = cameraPitchRef.current;
          const lookTargetY = playerPosRef.current.y + 1.1 + Math.sin(pitch) * 2.5;
          camera.lookAt(playerPosRef.current.x, lookTargetY, playerPosRef.current.z);
        } else {
          const isoDistance = 22.0;
          const isoHeight = 26.0;

          const targetCamX = playerPosRef.current.x;
          const targetCamY = isoHeight;
          const targetCamZ = playerPosRef.current.z + isoDistance;

          camera.position.lerp(new THREE.Vector3(targetCamX, targetCamY, targetCamZ), 0.10);
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

      // 4. PROXIMITY DETECTION & MINIMAP (Throttled to 10 Hz)
      if (now - lastHudUpdateTime > 100) {
        lastHudUpdateTime = now;

        setPlayerHudState({
          x: playerPosRef.current.x,
          z: playerPosRef.current.z,
          heading: playerRotRef.current,
        });

        let closestB: PlacedBuilding | null = null;
        let minDist = Infinity;

        for (const b of townMap.buildingsList) {
          if (b.tier === 0) continue;
          if (selectedGradeRef.current === 5 && b.grade === 6) continue;
          const dist = Math.hypot(
            playerPosRef.current.x - b.entrancePos[0],
            playerPosRef.current.z - b.entrancePos[2]
          );
          if (dist < minDist) {
            minDist = dist;
            closestB = b;
          }
        }

        if (closestB) {
          const triggerDist = closestB.tier === 3 ? 11.5 : closestB.tier === 2 ? 8.5 : 6.0;
          if (minDist <= triggerDist) {
            setNearbyBuilding(closestB);
            setNearbyDistance(Math.round(minDist * 10) / 10);
          } else {
            setNearbyBuilding(null);
          }
        }

        // Quest Target Reached Detection
        const currentQuest = questTargetRef.current;
        if (currentQuest) {
          const qDist = Math.hypot(
            playerPosRef.current.x - currentQuest.entrancePos[0],
            playerPosRef.current.z - currentQuest.entrancePos[2]
          );
          const qTrigger = currentQuest.tier === 3 ? 10.5 : currentQuest.tier === 2 ? 8.0 : 5.8;
          if (qDist <= qTrigger) {
            const pts = questModeRef.current === 'MYSTERY' ? 2 : 1;
            const nextCount = completedQuestCountRef.current + 1;
            setCompletedQuestCount(nextCount);
            setQuestScore(s => s + pts);

            // Progressive transportation unlock celebrations
            if (nextCount === 2) {
              soundEffects.playFanfare();
              townAudio.playBicycleBell();
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
              if (!isMutedRef.current) playFacilitySound(currentQuest);
            }

            // Next chained quest origin is the CURRENT destination entrance
            const nextTarget = getProgressiveQuestTarget(
              townMap,
              selectedGradeRef.current,
              currentQuest.entrancePos[0],
              currentQuest.entrancePos[2],
              nextCount,
              currentQuest.id
            );

            if (nextTarget) {
              assignNewQuest(
                nextTarget,
                playerPosRef.current.x,
                playerPosRef.current.z,
                playerRotRef.current
              );
            }
          }
        }
      }

      renderer.render(scene, camera);
      afterDraw(animate);
    };

    animate();

    return () => {
      isDisposed = true;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        clearTimeout(animFrameRef.current);
      }
      window.removeEventListener('resize', handleResize);
      weatherController.dispose();
      envTarget.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [townMap, getProgressiveQuestTarget, playFacilitySound, assignNewQuest]);

  // Update Time of Day & Weather Atmosphere dynamically in 0ms
  useEffect(() => {
    if (!sceneRef.current || !ambientLightRef.current || !dirLightRef.current) return;
    const atmos = getCompositeAtmosphere(timeOfDay, weather);

    sceneRef.current.background = new THREE.Color(atmos.skyColor);
    sceneRef.current.fog = new THREE.FogExp2(atmos.fogColor, atmos.fogDensity);
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
    }

    if (playerHeadlightRef.current) {
      playerHeadlightRef.current.intensity = atmos.playerHeadlightIntensity;
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
    const blocksWordEn = legLength > 36 ? 'two blocks' : 'one block';
    const blocksWordJa = legLength > 36 ? '2ブロック' : '1ブロック';

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

  // Rebuild 3D Glowing Road Route Chevrons along the Manhattan path
  useEffect(() => {
    const group = routeMarkersGroupRef.current;
    if (!group) return;

    while (group.children.length > 0) {
      const child = group.children[0] as THREE.Mesh;
      group.remove(child);
      if (child.geometry) child.geometry.dispose();
    }

    const shouldShow = showRoadArrows && questMode === 'GUIDED' && questNavigationHint?.path;
    group.visible = !!shouldShow;
    if (!shouldShow || !questNavigationHint) return;

    const path = questNavigationHint.path;
    const chevronMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });

    const spacing = 4.2;
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i];
      const b = path[i + 1];
      const segDx = b.x - a.x;
      const segDz = b.z - a.z;
      const segLen = Math.hypot(segDx, segDz);
      if (segLen < 1.5) continue;

      const angle = Math.atan2(segDx, segDz);
      const steps = Math.max(1, Math.floor(segLen / spacing));
      for (let s = 0; s < steps; s++) {
        const t = (s + 0.5) / steps;
        const cx = a.x + segDx * t;
        const cz = a.z + segDz * t;

        const coneGeo = new THREE.ConeGeometry(0.42, 0.95, 3);
        coneGeo.rotateX(Math.PI / 2);
        const mesh = new THREE.Mesh(coneGeo, chevronMat);
        mesh.position.set(cx, 0.12, cz);
        mesh.rotation.y = angle;
        mesh.scale.set(1.0, 0.15, 1.0);
        group.add(mesh);
      }
    }
  }, [questNavigationHint, showRoadArrows, questMode]);

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
          </div>

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
                  <span>🚲</span> Stage 2: District Cruiser (≤68m)
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
                <span>Play Sound</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOUCH CONTROLLER D-PAD (BOTTOM-LEFT - RESPONSIVE FOR PHONES & TABLETS) */}
      <div className="absolute bottom-2 left-2 sm:bottom-5 sm:left-5 z-20 flex flex-col items-center select-none scale-75 sm:scale-90 md:scale-100 origin-bottom-left">
        <div className="relative w-36 h-36 bg-slate-950/90 rounded-full border-2 border-slate-700/80 shadow-2xl p-2 flex items-center justify-center">
          <button
            onTouchStart={() => setTouchForward(1)}
            onTouchEnd={() => setTouchForward(0)}
            onTouchCancel={() => setTouchForward(0)}
            onMouseDown={() => setTouchForward(1)}
            onMouseUp={() => setTouchForward(0)}
            onMouseLeave={() => setTouchForward(0)}
            className="absolute top-1.5 w-11 h-11 rounded-xl bg-slate-800/90 active:bg-amber-500 active:text-slate-950 text-slate-200 border border-slate-700 flex flex-col items-center justify-center font-black shadow-md transition"
            title="Move Forward (W)"
          >
            <span>▲</span>
            <span className="text-[8px] leading-none opacity-60">FWD</span>
          </button>

          <button
            onTouchStart={() => setTouchTurn(1)}
            onTouchEnd={() => setTouchTurn(0)}
            onTouchCancel={() => setTouchTurn(0)}
            onMouseDown={() => setTouchTurn(1)}
            onMouseUp={() => setTouchTurn(0)}
            onMouseLeave={() => setTouchTurn(0)}
            className="absolute left-1.5 w-11 h-11 rounded-xl bg-slate-800/90 active:bg-amber-500 active:text-slate-950 text-slate-200 border border-slate-700 flex flex-col items-center justify-center font-black shadow-md transition"
            title="Turn Left (A)"
          >
            <span>◀</span>
            <span className="text-[8px] leading-none opacity-60">LEFT</span>
          </button>

          <button
            onClick={() => { if (!isMuted) townAudio.playBicycleBell(); }}
            className="w-10 h-10 rounded-full bg-amber-500/80 active:bg-amber-400 text-slate-950 flex items-center justify-center shadow-lg transition"
            title="Ring Bicycle Bell / ベルを鳴らす"
          >
            <Bell className="w-4 h-4" />
          </button>

          <button
            onTouchStart={() => setTouchTurn(-1)}
            onTouchEnd={() => setTouchTurn(0)}
            onTouchCancel={() => setTouchTurn(0)}
            onMouseDown={() => setTouchTurn(-1)}
            onMouseUp={() => setTouchTurn(0)}
            onMouseLeave={() => setTouchTurn(0)}
            className="absolute right-1.5 w-11 h-11 rounded-xl bg-slate-800/90 active:bg-amber-500 active:text-slate-950 text-slate-200 border border-slate-700 flex flex-col items-center justify-center font-black shadow-md transition"
            title="Turn Right (D)"
          >
            <span>▶</span>
            <span className="text-[8px] leading-none opacity-60">RIGHT</span>
          </button>

          <button
            onTouchStart={() => setTouchForward(-0.6)}
            onTouchEnd={() => setTouchForward(0)}
            onTouchCancel={() => setTouchForward(0)}
            onMouseDown={() => setTouchForward(-0.6)}
            onMouseUp={() => setTouchForward(0)}
            onMouseLeave={() => setTouchForward(0)}
            className="absolute bottom-1.5 w-11 h-11 rounded-xl bg-slate-800/90 active:bg-amber-500 active:text-slate-950 text-slate-200 border border-slate-700 flex flex-col items-center justify-center font-black shadow-md transition"
            title="Move Backward (S)"
          >
            <span className="text-[8px] leading-none opacity-60">BACK</span>
            <span>▼</span>
          </button>
        </div>

        {/* PROGRESSIVE TRANSPORTATION SPEED SELECTOR (6m, 12m, 18m, 24m) */}
        <div className="mt-2.5 flex items-center gap-1 bg-slate-900/95 p-1 rounded-2xl border border-slate-700/80 shadow-md">
          {/* WALK (6 m/s) */}
          <button
            onClick={() => setTravelMode('WALK')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 transition ${
              travelMode === 'WALK'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
            title="Walk (6 m/s - 1 cell/sec)"
          >
            <span>🚶</span>
            <span className="text-[10px]">6m</span>
          </button>

          {/* RUN (12 m/s) */}
          <button
            onClick={() => setTravelMode('RUN')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 transition ${
              travelMode === 'RUN'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
            title="Run (12 m/s - 2 cells/sec)"
          >
            <span>🏃</span>
            <span className="text-[10px]">12m</span>
          </button>

          {/* BICYCLE (18 m/s - Unlocked at 2 destinations) */}
          <button
            onClick={() => {
              if (completedQuestCount >= 2) {
                setTravelMode('BIKE');
                if (!isMutedRef.current) townAudio.playBicycleBell();
              }
            }}
            disabled={completedQuestCount < 2}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 transition ${
              completedQuestCount < 2
                ? 'opacity-40 cursor-not-allowed text-slate-500'
                : travelMode === 'BIKE'
                ? 'bg-sky-400 text-slate-950 shadow-sm'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
            title={completedQuestCount < 2 ? '🔒 Reach 2 destinations to unlock City Bicycle!' : 'City Bicycle (18 m/s - 3 cells/sec)'}
          >
            <span>{completedQuestCount < 2 ? '🔒' : '🚲'}</span>
            <span className="text-[10px]">18m</span>
          </button>

          {/* SUZUKA KART (24 m/s - Unlocked at 4 destinations) */}
          <button
            onClick={() => {
              if (completedQuestCount >= 4) {
                setTravelMode('KART');
                soundEffects.playCorrect();
              }
            }}
            disabled={completedQuestCount < 4}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 transition ${
              completedQuestCount < 4
                ? 'opacity-40 cursor-not-allowed text-slate-500'
                : travelMode === 'KART'
                ? 'bg-rose-500 text-white shadow-sm'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
            title={completedQuestCount < 4 ? '🔒 Reach 4 destinations to unlock Suzuka Micro-Kart!' : 'Suzuka Micro-Kart (24 m/s - 4 cells/sec)'}
          >
            <span>{completedQuestCount < 4 ? '🔒' : '🏎️'}</span>
            <span className="text-[10px]">24m</span>
          </button>
        </div>
      </div>

      {/* DESKTOP KEYBOARD HINTS PILL (BOTTOM-RIGHT) */}
      <div className="hidden xl:flex flex-col gap-1 absolute bottom-5 right-5 z-20 bg-slate-950/95 px-3.5 py-2.5 rounded-2xl border border-slate-800 text-slate-400 text-[11px] font-medium shadow-lg">
        <div className="flex items-center gap-2">
          <span><kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700 font-mono text-[10px]">W/S</kbd> Move</span>
          <span>•</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700 font-mono text-[10px]">A/D</kbd> Turn</span>
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
