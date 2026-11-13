import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { detectClassroomGpuProfile } from '@/utils/classroom3d';
import { townAudio } from './townAudio';

// --- Tier 1 (6m × 6m × 6m) Model Builders ---
import { buildHouseMesh, HOUSE_PALETTES } from './models/house';
import { buildEmptyLotMesh, EMPTY_LOT_THEMES, EmptyLotVariant } from './models/emptyLot';
import { buildApartmentMesh } from './models/apartment';
import { buildBusStopMesh } from './models/busStop';
import { buildPostOfficeMesh } from './models/postOffice';
import { buildConvenienceStoreMesh } from './models/convenienceStore';
import { buildPoliceStationMesh, buildPoliceBoxMesh } from './models/policeStation';
import { buildBookstoreMesh } from './models/bookstore';
import { buildFlowerShopMesh } from './models/flowerShop';
import { buildRestaurantMesh } from './models/restaurant';

// --- Tier 2 (12m × 12m × 12m) Model Builders ---
import { buildSchoolMesh } from './models/school';
import { buildJuniorHighSchoolMesh } from './models/juniorHighSchool';
import { buildDepartmentStoreMesh } from './models/departmentStore';
import { buildSwimmingPoolMesh } from './models/swimmingPool';
import { buildFireStationMesh } from './models/fireStation';
import { buildHospitalMesh } from './models/hospital';
import { buildCityHallMesh } from './models/cityHall';
import { buildStationMesh } from './models/station';
import { buildLibraryMesh } from './models/library';
import { buildSupermarketMesh } from './models/supermarket';
import { buildGymMesh } from './models/gym';
import { buildMuseumMesh } from './models/museum';
import { buildTempleMesh } from './models/temple';
import { buildShrineMesh } from './models/shrine';
import { buildParkMesh } from './models/park';
import { buildGardenMesh } from './models/garden';

// --- Tier 3 (18m × 18m × 18m) Model Builders ---
import { buildStadiumMesh } from './models/stadium';
import { buildZooMesh } from './models/zoo';
import { buildAquariumMesh } from './models/aquarium';
import { buildCastleMesh } from './models/castle';
import { buildAmusementParkMesh } from './models/amusementPark';

import { 
  RotateCw, 
  Sunrise,
  Sun, 
  Sunset, 
  Moon, 
  Volume2, 
  Layers, 
  Sparkles,
  ArrowLeft,
  Palette,
  Home,
  Bus,
  Mail,
  ShoppingBag,
  Shield,
  BookOpen,
  Flower2,
  Utensils,
  Building2,
  User,
  GraduationCap,
  Flame,
  HeartPulse,
  Landmark,
  TrainFront,
  Library as LibraryIcon,
  ShoppingCart,
  Dumbbell,
  Bell,
  SunMedium,
  Trees,
  TreeDeciduous,
  Trophy,
  PawPrint,
  Fish,
  Crown,
  FerrisWheel,
  Waves,
  Compass,
  CloudRain,
  CloudSnow,
} from 'lucide-react';
import { TownNavigator } from './TownNavigator';
import { enhanceBuildingGroup } from './models/wallTextures';
import {
  buildAtmosphericSkybox,
  updateAtmosphericSkybox,
  buildTexturedGroundPlane,
  buildPerimeterScenery,
  updatePerimeterSceneryLighting,
} from './environmentScenery';
import {
  WeatherMode,
  WEATHER_MODE_ORDER,
  WEATHER_PRESETS,
  inspectorModeToTimeOfDay,
  timeOfDayToInspectorMode,
  getCompositeAtmosphere,
  createWeatherParticleController,
  WeatherParticleController,
  collectSceneWeatherMaterials,
  SceneMaterialBuckets,
  applyAtmosphereToMaterials,
} from './weatherAndTimeSystem';

interface TownModelInspectorProps {
  onExit?: () => void;
}

export type ActiveTier = 'TIER_1' | 'TIER_2' | 'TIER_3';

export type Tier1Model = 
  | 'AVENUE_8' 
  | 'HOUSE' 
  | 'EMPTY_LOT'
  | 'APARTMENT'
  | 'BUS_STOP' 
  | 'POST_OFFICE' 
  | 'CONVENIENCE_STORE' 
  | 'POLICE_BOX' 
  | 'BOOKSTORE' 
  | 'FLOWER_SHOP' 
  | 'RESTAURANT';

export type Tier2Model =
  | 'BOULEVARD_13'
  | 'SCHOOL'
  | 'JUNIOR_HIGH_SCHOOL'
  | 'DEPARTMENT_STORE'
  | 'SWIMMING_POOL'
  | 'FIRE_STATION'
  | 'POLICE_STATION'
  | 'HOSPITAL'
  | 'CITY_HALL'
  | 'STATION'
  | 'LIBRARY'
  | 'SUPERMARKET'
  | 'GYM'
  | 'MUSEUM'
  | 'TEMPLE'
  | 'SHRINE'
  | 'PARK'
  | 'GARDEN';

export type Tier3Model =
  | 'ESPLANADE_5'
  | 'STADIUM'
  | 'ZOO'
  | 'AQUARIUM'
  | 'CASTLE'
  | 'AMUSEMENT_PARK';

export type ActiveModel = Tier1Model | Tier2Model | Tier3Model;

type LightingMode = 'SUNRISE' | 'NOON' | 'SUNSET' | 'MIDNIGHT';
type CameraAngle = 'FRONT' | 'RACER' | 'ISOMETRIC' | 'DETAIL_1' | 'DETAIL_2';

export interface BuildingDef {
  id: ActiveModel;
  code: string;
  nameEn: string;
  nameJa: string;
  rubyName: React.ReactNode;
  audioPath: string;
  illustWebp: string;
  illustPng: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  accentColor: string;
  pillBg: string;
  grade?: 5 | 6;
  features: string[];
  detail1: {
    label: string;
    icon: string;
    pos: [number, number, number];
    target: [number, number, number];
  };
  detail2: {
    label: string;
    icon: string;
    pos: [number, number, number];
    target: [number, number, number];
  };
}

// =================================================================
// TIER 1 CATALOG (6m × 6m × 6m Neighborhood Facilities)
// =================================================================
export const TIER1_CATALOG: Record<Exclude<Tier1Model, 'AVENUE_8'>, BuildingDef> = {
  HOUSE: {
    id: 'HOUSE',
    code: 'hwg5_u19_00',
    nameEn: 'House',
    nameJa: '家',
    rubyName: <ruby>家<rt>いえ</rt></ruby>,
    audioPath: '/sound_suite/hwg/word_0641/hwg_word_0641_house_jenny.mp3',
    illustWebp: '/cards/illustration/hwg5_u19_00_house_illust.webp',
    illustPng: '/cards/illustration/hwg5_u19_00_house_illust.png',
    icon: Home,
    accentColor: 'from-amber-500 to-orange-500',
    pillBg: 'bg-amber-500',
    features: [
      '2-story Japanese suburban home with 4.45m eaves and 5.98m gable peak',
      'Cantilevered 2nd floor balcony (2.6m) with safety glass railing',
      'Natural flagstone walkway, wooden door stoop, and entrance porch',
      'Backyard perimeter fence and twin conical pine trees'
    ],
    detail1: {
      label: 'Balcony & Eaves',
      icon: '🏠',
      pos: [0.85, 3.2, 3.2],
      target: [0.85, 2.7, 0.8]
    },
    detail2: {
      label: 'Porch & Door',
      icon: '🚪',
      pos: [0.8, 1.4, 2.8],
      target: [0.85, 1.1, 0.7]
    }
  },
  EMPTY_LOT: {
    id: 'EMPTY_LOT',
    code: 'hwg5_u19_99',
    nameEn: 'Empty Lot / Pocket Park',
    nameJa: '空き地・広場',
    rubyName: (<><ruby>空<rt>あ</rt></ruby>き<ruby>地<rt>ち</rt></ruby>・<ruby>広<rt>ひろ</rt></ruby>ば</>),
    audioPath: '',
    illustWebp: '',
    illustPng: '',
    icon: Trees,
    accentColor: 'from-emerald-500 to-green-600',
    pillBg: 'bg-emerald-500',
    features: [
      'Lush green lawn with concrete perimeter curbs and low wooden rail fence',
      'Flowering Sakura cherry blossom tree with multi-tiered pink canopy',
      'Curved stepping stone garden pathway leading to a classic park bench',
      'Japanese neighborhood park drinking fountain and hydrangea bushes'
    ],
    detail1: {
      label: 'Sakura Tree',
      icon: '🌸',
      pos: [1.6, 2.5, 1.2],
      target: [1.6, 2.0, -1.2]
    },
    detail2: {
      label: 'Park Bench',
      icon: '🪑',
      pos: [-1.8, 1.2, 1.5],
      target: [-1.8, 0.4, -0.5]
    }
  },
  APARTMENT: {
    id: 'APARTMENT',
    code: 't0_apartment',
    nameEn: 'Apartment Block',
    nameJa: 'アパート (低層マンション)',
    rubyName: <ruby>集合住宅<rt>アパート</rt></ruby>,
    audioPath: '',
    illustWebp: '',
    illustPng: '',
    icon: Building2,
    accentColor: 'from-slate-600 to-zinc-700',
    pillBg: 'bg-slate-600',
    grade: 5,
    features: [
      '6m × 12m (1U × 2U) 2-story Japanese residential apartment block',
      'Exterior steel staircase & 2nd floor access walkway',
      '6 numbered private apartment units with door lights & mail slots',
      'Private rear balconies with individual air conditioner compressor units',
      'Ground-level covered bicycle parking shelter & resident garbage station'
    ],
    detail1: {
      label: 'Stairs & Walkway',
      icon: '🪜',
      pos: [-2.8, 3.2, 5.0],
      target: [-1.75, 2.5, 2.0]
    },
    detail2: {
      label: 'Rear Balconies',
      icon: '🏢',
      pos: [3.5, 3.0, 1.0],
      target: [1.5, 2.5, 0.0]
    }
  },
  BUS_STOP: {
    id: 'BUS_STOP',
    code: 'hwg5_u19_13',
    nameEn: 'Bus Stop',
    nameJa: 'バス停',
    rubyName: <ruby>バス<rt>ばす</rt>停<rt>てい</rt></ruby>,
    audioPath: '/sound_suite/hwg/word_0036/hwg_word_0036_bus_stop_jenny.mp3',
    illustWebp: '/cards/illustration/hwg5_u19_13_bus_stop_illust.webp',
    illustPng: '/cards/illustration/hwg5_u19_13_bus_stop_illust.png',
    icon: Bus,
    accentColor: 'from-sky-500 to-blue-600',
    pillBg: 'bg-blue-600',
    features: [
      '2.1m waiting shelter with slanted corrugated roof & 4 cyan scoop chairs',
      'Authentic COLD & HOT Japanese vending machine with illuminated display',
      'Dual-hole dome recycling bin (ペットボトル & あきカン)',
      '1.95m yellow circular signpost with timetable on clear transit pad'
    ],
    detail1: {
      label: 'Vending & Bin',
      icon: '🧃',
      pos: [-2.0, 1.35, 2.5],
      target: [-2.0, 1.05, 0.95]
    },
    detail2: {
      label: 'Shelter & Seats',
      icon: '🚏',
      pos: [0.85, 1.35, 2.5],
      target: [0.85, 0.95, 0.85]
    }
  },
  POST_OFFICE: {
    id: 'POST_OFFICE',
    code: 'hwg5_u19_05',
    nameEn: 'Post Office',
    nameJa: '郵便局',
    rubyName: <ruby>郵便局<rt>ゆうびんきょく</rt></ruby>,
    audioPath: '/sound_suite/hwg/word_0650/hwg_word_0650_post_office_jenny.mp3',
    illustWebp: '/cards/illustration/hwg5_u19_05_post_office_illust.webp',
    illustPng: '/cards/illustration/hwg5_u19_05_post_office_illust.png',
    icon: Mail,
    accentColor: 'from-red-500 to-rose-600',
    pillBg: 'bg-red-600',
    features: [
      'Prominent "POST OFFICE" fascia sign with Japan Post (〒) emblem',
      'Authentic twin-slot cast iron red mailbox (手紙・はがき / その他)',
      'Red Honda Super Cub delivery scooter with rear mail cargo box',
      'Double sliding glass entrance doors on paved storefront apron'
    ],
    detail1: {
      label: 'Twin-Slot Mailbox',
      icon: '📮',
      pos: [-1.8, 1.15, 2.6],
      target: [-1.8, 0.75, 1.25]
    },
    detail2: {
      label: 'Super Cub Scooter',
      icon: '🛵',
      pos: [1.85, 1.15, 2.6],
      target: [1.85, 0.7, 1.25]
    }
  },
  CONVENIENCE_STORE: {
    id: 'CONVENIENCE_STORE',
    code: 'hwg5_u19_24',
    nameEn: 'Convenience Store',
    nameJa: 'コンビニ',
    rubyName: <span>コンビニ</span>,
    audioPath: '/sound_suite/hwg/word_0626/hwg_word_0626_convenience_store_jenny.mp3',
    illustWebp: '/cards/illustration/hwg5_u19_24_convenience_store_illust.webp',
    illustPng: '/cards/illustration/hwg5_u19_24_convenience_store_illust.png',
    icon: ShoppingBag,
    accentColor: 'from-emerald-500 to-teal-600',
    pillBg: 'bg-emerald-600',
    features: [
      'Prominent "CONVENIENCE STORE" fascia sign with 3-color bands & "24" crest',
      'Full-height glass shopfront with interior illuminated snack shelves',
      'Outdoor 3-tier metal wire magazine stand (zasshi-kōner)',
      'Stainless steel bicycle parking rack (駐輪場) with commuter bicycle'
    ],
    detail1: {
      label: 'Magazine Rack',
      icon: '📰',
      pos: [-1.6, 1.15, 2.6],
      target: [-1.6, 0.7, 1.25]
    },
    detail2: {
      label: 'Bicycle Rack',
      icon: '🚲',
      pos: [1.4, 1.15, 2.6],
      target: [1.4, 0.65, 1.25]
    }
  },
  POLICE_BOX: {
    id: 'POLICE_BOX',
    code: 't0_police_box',
    nameEn: 'Police Box (Koban)',
    nameJa: '交番',
    rubyName: <ruby>交番<rt>こうばん</rt></ruby>,
    audioPath: '',
    illustWebp: '',
    illustPng: '',
    icon: Shield,
    accentColor: 'from-blue-600 to-indigo-700',
    pillBg: 'bg-blue-700',
    features: [
      'Neighborhood Police Box (交番 Kōban) with glowing red Kōban-tō lantern',
      'Prominent "POLICE BOX / 交番" sign & golden Asahi-shō crest',
      'White police patrol bicycle (shiro-chari) with front wire basket',
      'Community safety glass bulletin board (keijiban) on paved apron'
    ],
    detail1: {
      label: 'Patrol Bicycle',
      icon: '🚲',
      pos: [1.8, 1.15, 2.6],
      target: [1.8, 0.7, 1.25]
    },
    detail2: {
      label: 'Red Lantern & Badge',
      icon: '🚨',
      pos: [-0.3, 2.8, 3.0],
      target: [-0.3, 2.6, 0.8]
    }
  },
  BOOKSTORE: {
    id: 'BOOKSTORE',
    code: 'hwg5_u19_02',
    nameEn: 'Bookstore',
    nameJa: '本屋',
    rubyName: <ruby>本屋<rt>ほんや</rt></ruby>,
    audioPath: '/sound_suite/hwg/word_0621/hwg_word_0621_bookstore_jenny.mp3',
    illustWebp: '/cards/illustration/hwg5_u19_02_bookstore_illust.webp',
    illustPng: '/cards/illustration/hwg5_u19_02_bookstore_illust.png',
    icon: BookOpen,
    accentColor: 'from-emerald-600 to-green-700',
    pillBg: 'bg-green-700',
    features: [
      'Forest green scalloped fabric awning & prominent "BOOKSTORE" sign',
      'Display window showing colorful manga and novel book spines',
      'Outdoor 4-leg wooden wagon sale cart with discounted paperback stacks',
      'Unobstructed sidewalk with dedicated storefront terrace apron'
    ],
    detail1: {
      label: 'Wagon Book Cart',
      icon: '📚',
      pos: [-1.6, 1.15, 2.6],
      target: [-1.6, 0.75, 1.25]
    },
    detail2: {
      label: 'Showcase Window',
      icon: '📖',
      pos: [-0.85, 1.35, 2.6],
      target: [-0.85, 1.2, 0.8]
    }
  },
  FLOWER_SHOP: {
    id: 'FLOWER_SHOP',
    code: 'hwg5_u19_11',
    nameEn: 'Flower Shop',
    nameJa: '花屋',
    rubyName: <ruby>花屋<rt>はなや</rt></ruby>,
    audioPath: '/sound_suite/hwg/word_0637/hwg_word_0637_flower_shop_jenny.mp3',
    illustWebp: '/cards/illustration/hwg5_u19_11_flower_shop_illust.webp',
    illustPng: '/cards/illustration/hwg5_u19_11_flower_shop_illust.png',
    icon: Flower2,
    accentColor: 'from-pink-500 to-rose-500',
    pillBg: 'bg-pink-600',
    features: [
      'Blossom pink striped awning & prominent "FLOWER SHOP" sign',
      '3-tier stepped wooden sidewalk plant stand with potted tulips',
      'Galvanized zinc floor bucket displaying fresh cut sunflowers',
      'Stucco rose-cream facade with clear sidewalk corridor'
    ],
    detail1: {
      label: '3-Tier Plant Stand',
      icon: '🌷',
      pos: [-1.6, 1.15, 2.6],
      target: [-1.6, 0.75, 1.25]
    },
    detail2: {
      label: 'Sunflowers & Bucket',
      icon: '🌻',
      pos: [0.45, 1.15, 2.6],
      target: [0.45, 0.65, 1.25]
    }
  },
  RESTAURANT: {
    id: 'RESTAURANT',
    code: 'hwg5_u19_10',
    nameEn: 'Restaurant',
    nameJa: 'レストラン',
    rubyName: <span>レストラン</span>,
    audioPath: '/sound_suite/hwg/word_0652/hwg_word_0652_restaurant_jenny.mp3',
    illustWebp: '/cards/illustration/hwg5_u19_10_restaurant_illust.webp',
    illustPng: '/cards/illustration/hwg5_u19_10_restaurant_illust.png',
    icon: Utensils,
    accentColor: 'from-orange-500 to-amber-600',
    pillBg: 'bg-orange-600',
    features: [
      'Terracotta tiled gable roof & prominent "RESTAURANT" bistro crest',
      'Outdoor glass food sample vitrine (spaghetti & curry rice display)',
      'Handwritten blackboard A-frame easel menu ("TODAY\'S LUNCH")',
      'Paved entrance terrace with unobstructed pedestrian sidewalk'
    ],
    detail1: {
      label: 'Food Sample Case',
      icon: '🍝',
      pos: [-1.6, 1.15, 2.6],
      target: [-1.6, 0.75, 1.25]
    },
    detail2: {
      label: 'Blackboard Menu Stand',
      icon: '📋',
      pos: [0.45, 1.15, 2.6],
      target: [0.45, 0.65, 1.25]
    }
  }
};

// =================================================================
// TIER 2 CATALOG (12m × 12m × 12m Civic & Cultural Facilities)
// =================================================================
export const TIER2_CATALOG: Record<Exclude<Tier2Model, 'BOULEVARD_13'>, BuildingDef> = {
  SCHOOL: {
    id: 'SCHOOL',
    code: 'hwg5_u19_01',
    nameEn: 'School',
    nameJa: '学校',
    rubyName: <ruby>学校<rt>がっこう</rt></ruby>,
    audioPath: '/sound_suite/hwg/word_0281/hwg_word_0281_school_jenny.mp3',
    illustWebp: '/cards/illustration/hwg5_u19_01_school_illust.webp',
    illustPng: '/cards/illustration/hwg5_u19_01_school_illust.png',
    icon: GraduationCap,
    accentColor: 'from-sky-500 to-indigo-600',
    pillBg: 'bg-indigo-600',
    features: [
      '3-story Japanese elementary school (11.2m) with classroom ribbon windows',
      'Central clock tower with operational school chime dial & rooftop perimeter railing',
      'Ground floor entrance canopy & shoe-locker hall (昇降口 shōkōguchi)',
      'Dual granite school gateposts (校門) with official school plaque and flagpole'
    ],
    detail1: {
      label: 'Clock Tower & Roof',
      icon: '⏰',
      pos: [0, 11.5, 6.5],
      target: [0, 9.5, 0.5]
    },
    detail2: {
      label: 'Entrance & Gateposts',
      icon: '👞',
      pos: [0, 2.0, 5.5],
      target: [0, 1.2, 1.5]
    }
  },
  JUNIOR_HIGH_SCHOOL: {
    id: 'JUNIOR_HIGH_SCHOOL',
    code: 'hwg6_u09_20',
    nameEn: 'Junior High School',
    nameJa: '中学校',
    rubyName: <ruby>中学校<rt>ちゅうがっこう</rt></ruby>,
    audioPath: '',
    illustWebp: '/cards/illustration/hwg6_u09_20_junior_high_school_illust.png',
    illustPng: '/cards/illustration/hwg6_u09_20_junior_high_school_illust.png',
    icon: GraduationCap,
    accentColor: 'from-blue-600 to-indigo-700',
    pillBg: 'bg-blue-600',
    grade: 6,
    features: [
      '3-story modern Japanese middle school (9.6m) with ribbon windows',
      'Central clock tower showing 8:30 morning homeroom time',
      'Granite front gateposts with official plaque: 緑町中学校 (Junior High School)',
      'Front courtyard with covered bicycle parking racks & sports club banner'
    ],
    detail1: {
      label: 'Clock Tower',
      icon: '⏰',
      pos: [0, 11.5, 4.5],
      target: [0, 9.5, -1.5]
    },
    detail2: {
      label: 'School Gate & Plaque',
      icon: '🏫',
      pos: [-2.4, 2.5, 5.8],
      target: [-2.4, 1.4, 4.2]
    }
  },
  DEPARTMENT_STORE: {
    id: 'DEPARTMENT_STORE',
    code: 'hwg6_u09_21',
    nameEn: 'Department Store',
    nameJa: 'デパート (百貨店)',
    rubyName: <ruby>百貨店<rt>デパート</rt></ruby>,
    audioPath: '',
    illustWebp: '/cards/illustration/hwg6_u09_21_department_store_illust.png',
    illustPng: '/cards/illustration/hwg6_u09_21_department_store_illust.png',
    icon: ShoppingBag,
    accentColor: 'from-amber-600 to-rose-600',
    pillBg: 'bg-rose-600',
    grade: 6,
    features: [
      '4-story commercial department store tower with peach-cream facade and gold cornices',
      'Grand glass automatic entrance canopy with polished brass pillars & red carpet',
      'Show windows with fashion mannequins and festive red awnings',
      'Rooftop billboard and iconic floating advertising helium balloon (アドバルーン)'
    ],
    detail1: {
      label: 'Entrance Canopy',
      icon: '🛍️',
      pos: [0, 2.8, 4.8],
      target: [0, 1.8, 1.5]
    },
    detail2: {
      label: 'Ad-Balloon & Billboard',
      icon: '🎈',
      pos: [2.5, 14.5, 4.0],
      target: [1.0, 11.0, -1.6]
    }
  },
  SWIMMING_POOL: {
    id: 'SWIMMING_POOL',
    code: 'hwg6_u09_22',
    nameEn: 'Swimming Pool',
    nameJa: 'プール',
    rubyName: <ruby>水泳場<rt>プール</rt></ruby>,
    audioPath: '',
    illustWebp: '/cards/illustration/hwg6_u09_22_swimming_pool_illust.png',
    illustPng: '/cards/illustration/hwg6_u09_22_swimming_pool_illust.png',
    icon: Waves,
    accentColor: 'from-cyan-500 to-blue-600',
    pillBg: 'bg-cyan-500',
    grade: 6,
    features: [
      '25m sunken ceramic tile pool basin with shimmering aqua water',
      '5 swimming lanes with colored floating buoy divider lines',
      '5 numbered starting blocks at deep end',
      'Elevated lifeguard chair with sun umbrella and overhead pennant turn flags',
      'Poolside shower arch, rescue ring, and perimeter safety fence'
    ],
    detail1: {
      label: 'Starting Blocks & Lanes',
      icon: '🏊',
      pos: [0, 2.5, -4.5],
      target: [0, 0.4, -1.6]
    },
    detail2: {
      label: 'Lifeguard Station',
      icon: '🏖️',
      pos: [4.8, 3.2, 1.0],
      target: [3.8, 1.8, -1.6]
    }
  },
  FIRE_STATION: {
    id: 'FIRE_STATION',
    code: 'hwg5_u19_06',
    nameEn: 'Fire Station',
    nameJa: '消防署',
    rubyName: <ruby>消防署<rt>しょうぼうしょ</rt></ruby>,
    audioPath: '/sound_suite/hwg/word_0634/hwg_word_0634_fire_station_jenny.mp3',
    illustWebp: '/cards/illustration/hwg5_u19_06_fire_station_illust.webp',
    illustPng: '/cards/illustration/hwg5_u19_06_fire_station_illust.png',
    icon: Flame,
    accentColor: 'from-red-600 to-amber-600',
    pillBg: 'bg-red-600',
    features: [
      'Dual-bay emergency vehicle garage with hazard trim and red warning beacon',
      '11.6m hose-drying and lookout tower with 4-directional emergency siren horns',
      'Detailed Japanese Fire Engine (消防車) with ladder, hose reels, and roof flashers',
      'Paved deployment apron with completely clear pedestrian corridor'
    ],
    detail1: {
      label: 'Japanese Fire Engine',
      icon: '🚒',
      pos: [-2.2, 1.8, 6.0],
      target: [-2.2, 1.1, 2.0]
    },
    detail2: {
      label: 'Lookout Tower & Sirens',
      icon: '🚨',
      pos: [3.8, 11.8, 5.5],
      target: [3.8, 10.0, 0.5]
    }
  },
  POLICE_STATION: {
    id: 'POLICE_STATION',
    code: 'hwg5_u19_07',
    nameEn: 'Police Station',
    nameJa: '警察署',
    rubyName: <ruby>警察署<rt>けいさつしょ</rt></ruby>,
    audioPath: '/sound_suite/hwg/word_0648/hwg_word_0648_police_station_jenny.mp3',
    illustWebp: '/cards/illustration/hwg5_u19_07_police_station_illust.webp',
    illustPng: '/cards/illustration/hwg5_u19_07_police_station_illust.png',
    icon: Shield,
    accentColor: 'from-blue-600 to-indigo-800',
    pillBg: 'bg-blue-700',
    features: [
      '3-story Municipal Police Headquarters (警察署) with golden Asahi-shō emblem',
      '11.8m rooftop radio communications mast with microwave relay dishes',
      'Black-and-white Japanese Police Patrol Car (パトカー) with boomerang roof lightbar',
      'White Police Motorcycle (白バイ Shirobai) & covered deployment bay'
    ],
    detail1: {
      label: 'Patrol Car (Patokā)',
      icon: '🚓',
      pos: [-2.6, 1.8, 6.0],
      target: [-2.6, 1.0, 2.2]
    },
    detail2: {
      label: 'Shirobai & Radio Mast',
      icon: '🏍️',
      pos: [3.2, 2.2, 6.0],
      target: [3.2, 1.1, 3.5]
    }
  },
  HOSPITAL: {
    id: 'HOSPITAL',
    code: 'hwg5_u19_08',
    nameEn: 'Hospital',
    nameJa: '病院',
    rubyName: <ruby>病院<rt>びょういん</rt></ruby>,
    audioPath: '/sound_suite/hwg/word_0640/hwg_word_0640_hospital_jenny.mp3',
    illustWebp: '/cards/illustration/hwg5_u19_08_hospital_illust.webp',
    illustPng: '/cards/illustration/hwg5_u19_08_hospital_illust.png',
    icon: HeartPulse,
    accentColor: 'from-emerald-500 to-teal-600',
    pillBg: 'bg-teal-600',
    features: [
      '3-story clean healthcare facility (8.6m) with rooftop elevator penthouse (10.5m)',
      'Illuminated red cross insignia on rooftop and main entrance canopy',
      'Detailed Japanese Ambulance (救急車) with roof beacons and rear chevron stripes',
      'Emergency drop-off bay (救急車専用) with smooth sidewalk ramp'
    ],
    detail1: {
      label: 'Japanese Ambulance',
      icon: '🚑',
      pos: [3.0, 1.8, 6.0],
      target: [3.0, 1.0, 2.0]
    },
    detail2: {
      label: 'Rooftop Red Cross',
      icon: '🏥',
      pos: [-1.2, 10.5, 5.5],
      target: [-1.2, 9.2, 0.5]
    }
  },
  CITY_HALL: {
    id: 'CITY_HALL',
    code: 'hwg5_u19_09',
    nameEn: 'City Hall',
    nameJa: '市役所',
    rubyName: <ruby>市役所<rt>しやくしょ</rt></ruby>,
    audioPath: '/sound_suite/hwg/word_0056/hwg_word_0056_city_hall_jenny.mp3',
    illustWebp: '/cards/illustration/hwg5_u19_09_city_hall_illust.webp',
    illustPng: '/cards/illustration/hwg5_u19_09_city_hall_illust.png',
    icon: Landmark,
    accentColor: 'from-slate-600 to-zinc-700',
    pillBg: 'bg-zinc-700',
    features: [
      'Grand 3-story civic administrative building (8.2m) with polished granite facade',
      '11.8m central clock tower crowned with weathered green copper patina dome',
      'Classical portico with 4 stone columns, grand entrance stairs, and golden city seal',
      'Twin civic flagpoles and civic notice board on forecourt plaza'
    ],
    detail1: {
      label: 'Civic Dome & Clock',
      icon: '🏛️',
      pos: [0, 12.0, 5.5],
      target: [0, 9.8, 0.5]
    },
    detail2: {
      label: 'Portico Columns & Plaza',
      icon: '📜',
      pos: [0, 2.5, 6.2],
      target: [0, 1.5, 2.0]
    }
  },
  STATION: {
    id: 'STATION',
    code: 'hwg5_u19_03',
    nameEn: 'Station',
    nameJa: '駅',
    rubyName: <ruby>駅<rt>えき</rt></ruby>,
    audioPath: '/sound_suite/hwg/word_0656/hwg_word_0656_station_jenny.mp3',
    illustWebp: '/cards/illustration/hwg5_u19_03_station_illust.webp',
    illustPng: '/cards/illustration/hwg5_u19_03_station_illust.png',
    icon: TrainFront,
    accentColor: 'from-blue-600 to-cyan-600',
    pillBg: 'bg-blue-600',
    features: [
      'Elevated commuter train station (6.0m viaduct deck) with tracks and platform shelter',
      'Electric commuter train cab (電車) with illuminated headlights and line color stripe',
      'Ground floor concourse with IC card automatic ticket gates (改札口 kaisatsuguchi)',
      'Digital departure board and station entrance clock sign'
    ],
    detail1: {
      label: 'Commuter Train Cab',
      icon: '🚆',
      pos: [0, 7.5, 5.5],
      target: [0, 6.2, 0.5]
    },
    detail2: {
      label: 'Concourse & IC Gates',
      icon: '🎫',
      pos: [0, 2.0, 5.5],
      target: [0, 1.2, 2.0]
    }
  },
  LIBRARY: {
    id: 'LIBRARY',
    code: 'hwg5_u19_04',
    nameEn: 'Library',
    nameJa: '図書館',
    rubyName: <ruby>図書館<rt>としょかん</rt></ruby>,
    audioPath: '/sound_suite/hwg/word_0590/hwg_word_0590_library_jenny.mp3',
    illustWebp: '/cards/illustration/hwg5_u19_04_library_illust.webp',
    illustPng: '/cards/illustration/hwg5_u19_04_library_illust.png',
    icon: LibraryIcon,
    accentColor: 'from-amber-600 to-orange-700',
    pillBg: 'bg-amber-700',
    features: [
      '2-story reading atrium with full-height glass curtain wall and natural cedar louvers',
      'Interior 2-level illuminated bookshelves with colorful books visible from outside',
      '24-hour book return drop box (返却ポスト) for after-hours convenience',
      'Outdoor reading garden bench and landscaped stone perimeter garden'
    ],
    detail1: {
      label: 'Glass Atrium & Bookshelves',
      icon: '📚',
      pos: [0, 4.0, 5.5],
      target: [0, 2.5, 0.5]
    },
    detail2: {
      label: 'Book Return & Bench',
      icon: '📖',
      pos: [-3.2, 1.8, 5.5],
      target: [-3.2, 0.9, 2.8]
    }
  },
  SUPERMARKET: {
    id: 'SUPERMARKET',
    code: 'hwg5_u19_12',
    nameEn: 'Supermarket',
    nameJa: 'スーパー',
    rubyName: <span>スーパー</span>,
    audioPath: '/sound_suite/hwg/word_0658/hwg_word_0658_supermarket_jenny.mp3',
    illustWebp: '/cards/illustration/hwg5_u19_12_supermarket_illust.webp',
    illustPng: '/cards/illustration/hwg5_u19_12_supermarket_illust.png',
    icon: ShoppingCart,
    accentColor: 'from-orange-500 to-emerald-600',
    pillBg: 'bg-orange-600',
    features: [
      'Commercial grocery facade with vibrant orange/green header and 10.8m billboard tower',
      'Prominent bilingual signage: "SUPERMARKET" headline and "スーパー" subtitle',
      'Outdoor metal shopping cart corral (カート置場) with 4 nested shopping carts',
      'Outdoor wooden fruit and vegetable display crates (apples and citrus)'
    ],
    detail1: {
      label: 'Rooftop Billboard Tower',
      icon: '🛒',
      pos: [3.2, 11.0, 5.5],
      target: [3.2, 8.5, 0.5]
    },
    detail2: {
      label: 'Cart Bay & Crates',
      icon: '🍎',
      pos: [-3.2, 1.8, 5.5],
      target: [-3.2, 1.0, 2.5]
    }
  },
  GYM: {
    id: 'GYM',
    code: 'hwg5_u19_16',
    nameEn: 'Gym',
    nameJa: '体育館',
    rubyName: <ruby>体育館<rt>たいいくかん</rt></ruby>,
    audioPath: '/sound_suite/hwg/word_0586/hwg_word_0586_gym_jenny.mp3',
    illustWebp: '/cards/illustration/hwg5_u19_16_gym_illust.webp',
    illustPng: '/cards/illustration/hwg5_u19_16_gym_illust.png',
    icon: Dumbbell,
    accentColor: 'from-purple-600 to-indigo-700',
    pillBg: 'bg-purple-700',
    features: [
      'Iconic barrel-vault curved arched roof (9.4m) with high sports clerestory windows',
      'Interior polished maple hardwood basketball court with regulation painted court lines',
      'Twin regulation basketball hoops and backboards visible through wide glass foyer',
      'Outdoor stainless-steel multi-spout drinking fountain (水道場 suidōba)'
    ],
    detail1: {
      label: 'Hardwood Court & Hoops',
      icon: '🏀',
      pos: [0, 4.5, 5.5],
      target: [0, 2.0, 0.5]
    },
    detail2: {
      label: 'Drinking Fountain & Foyer',
      icon: '🚰',
      pos: [-3.0, 1.8, 5.5],
      target: [-3.0, 1.0, 2.8]
    }
  },
  MUSEUM: {
    id: 'MUSEUM',
    code: 'hwg5_u19_19',
    nameEn: 'Museum',
    nameJa: '博物館',
    rubyName: <ruby>博物館<rt>はくぶつかん</rt></ruby>,
    audioPath: '/sound_suite/hwg/word_0644/hwg_word_0644_museum_jenny.mp3',
    illustWebp: '/cards/illustration/hwg5_u19_19_museum_illust.webp',
    illustPng: '/cards/illustration/hwg5_u19_19_museum_illust.png',
    icon: Landmark,
    accentColor: 'from-stone-500 to-amber-700',
    pillBg: 'bg-stone-700',
    features: [
      'Neoclassical limestone museum hall with triangular pediment and classical frieze',
      '4 grand stone columns, wide entrance steps, and twin bronze exhibition doors',
      'Outdoor abstract bronze sculpture on polished black granite pedestal',
      'Official museum directory sign on landscaped stone forecourt'
    ],
    detail1: {
      label: 'Portico Pediment & Columns',
      icon: '🏛️',
      pos: [0, 7.5, 6.0],
      target: [0, 5.5, 1.0]
    },
    detail2: {
      label: 'Bronze Art Sculpture',
      icon: '🗿',
      pos: [-3.2, 1.8, 5.5],
      target: [-3.2, 1.2, 3.2]
    }
  },
  TEMPLE: {
    id: 'TEMPLE',
    code: 'hwg5_u19_20',
    nameEn: 'Temple',
    nameJa: '寺',
    rubyName: <ruby>寺<rt>てら</rt></ruby>,
    audioPath: '/sound_suite/hwg/word_0661/hwg_word_0661_temple_jenny.mp3',
    illustWebp: '/cards/illustration/hwg5_u19_20_temple_illust.webp',
    illustPng: '/cards/illustration/hwg5_u19_20_temple_illust.png',
    icon: Bell,
    accentColor: 'from-amber-700 to-yellow-800',
    pillBg: 'bg-amber-800',
    features: [
      'Buddhist main hall (本堂 Hondō) with traditional flared irimoya tile roof (8.6m)',
      'Polished wooden wrap-around veranda (縁側 engawa) with perimeter timber balustrade',
      'Wooden bell tower (鐘楼 shōrō) housing an authentic cast bronze temple bell (梵鐘)',
      'Forecourt bronze incense burner (常香炉 jōkōro) with rising aromatic incense smoke'
    ],
    detail1: {
      label: 'Curved Roof & Finials',
      icon: '🏯',
      pos: [0, 8.8, 6.0],
      target: [0, 6.5, 0.5]
    },
    detail2: {
      label: 'Bell Tower & Incense Burner',
      icon: '🔔',
      pos: [-3.6, 3.2, 5.5],
      target: [-3.6, 2.2, 2.0]
    }
  },
  SHRINE: {
    id: 'SHRINE',
    code: 'hwg5_u19_21',
    nameEn: 'Shrine',
    nameJa: '神社',
    rubyName: <ruby>神社<rt>じんじゃ</rt></ruby>,
    audioPath: '/sound_suite/hwg/word_0653/hwg_word_0653_shrine_jenny.mp3',
    illustWebp: '/cards/illustration/hwg5_u19_21_shrine_illust.webp',
    illustPng: '/cards/illustration/hwg5_u19_21_shrine_illust.png',
    icon: SunMedium,
    accentColor: 'from-red-500 to-rose-700',
    pillBg: 'bg-rose-700',
    features: [
      'Grand 4.8m vermilion Torii gate (鳥居) with black crossbeam and shrine plaque',
      'Shinto sanctuary (拝殿 Haiden) with green copper roof and crossed chigi finials',
      'Twin stone guardian lion-dogs (狛犬 komainu) flanking the sacred flagstone path',
      'Water purification pavilion (手水舎 temizuya) with stone basin and bamboo ladles'
    ],
    detail1: {
      label: 'Vermilion Torii Gate',
      icon: '⛩️',
      pos: [0, 3.5, 6.0],
      target: [0, 2.4, 2.5]
    },
    detail2: {
      label: 'Komainu & Temizuya Basin',
      icon: '💧',
      pos: [-2.5, 2.0, 5.5],
      target: [-2.5, 1.2, 2.5]
    }
  },
  PARK: {
    id: 'PARK',
    code: 'hwg5_u19_14',
    nameEn: 'Park',
    nameJa: '公園',
    rubyName: <ruby>公園<rt>こうえん</rt></ruby>,
    audioPath: '/sound_suite/hwg/word_0645/hwg_word_0645_park_jenny.mp3',
    illustWebp: '/cards/illustration/hwg5_u19_14_park_illust.webp',
    illustPng: '/cards/illustration/hwg5_u19_14_park_illust.png',
    icon: Trees,
    accentColor: 'from-emerald-500 to-green-600',
    pillBg: 'bg-emerald-600',
    features: [
      'Community playground park with bright yellow spiral slide and climbing ladder',
      'A-frame dual swing set with rubber strap seats and safety chains',
      'Circular children\'s sandbox (砂場) with red wooden border coping',
      'Shaded cherry blossom trees (桜 sakura), wooden park benches, and drinking fountain'
    ],
    detail1: {
      label: 'Slide & Swing Set',
      icon: '🛝',
      pos: [-2.5, 2.5, 5.5],
      target: [-2.5, 1.4, 1.5]
    },
    detail2: {
      label: 'Sandbox & Sakura Trees',
      icon: '🌸',
      pos: [2.5, 2.5, 5.5],
      target: [2.5, 1.5, 1.5]
    }
  },
  GARDEN: {
    id: 'GARDEN',
    code: 'hwg5_u19_23',
    nameEn: 'Garden',
    nameJa: '庭園',
    rubyName: <ruby>庭園<rt>ていえん</rt></ruby>,
    audioPath: '/sound_suite/hwg/word_0123/hwg_word_0123_garden_jenny.mp3',
    illustWebp: '/cards/illustration/hwg5_u19_23_garden_illust.webp',
    illustPng: '/cards/illustration/hwg5_u19_23_garden_illust.png',
    icon: TreeDeciduous,
    accentColor: 'from-teal-600 to-emerald-700',
    pillBg: 'bg-teal-700',
    features: [
      'Traditional Japanese stroll garden (日本庭園) with curved red arched drum bridge (太鼓橋)',
      'Reflective koi pond with natural stone rock borders and swimming golden koi fish',
      '4-tier carved stone pagoda lantern (石灯籠 ishi-dōrō) nestled among pine trees',
      'Bamboo water deer-scarer (鹿威し shishi-odoshi) pouring water into a stone basin'
    ],
    detail1: {
      label: 'Red Drum Bridge & Koi Pond',
      icon: '🌉',
      pos: [0, 2.5, 5.5],
      target: [0, 1.0, 1.0]
    },
    detail2: {
      label: 'Stone Pagoda & Shishi-odoshi',
      icon: '🎋',
      pos: [3.2, 2.5, 5.5],
      target: [3.2, 1.4, 1.5]
    }
  }
};

// =================================================================
// TIER 3 CATALOG (18m × 18m × 18m Landmark Mega-Facilities)
// =================================================================
export const TIER3_CATALOG: Record<Exclude<Tier3Model, 'ESPLANADE_5'>, BuildingDef> = {
  STADIUM: {
    id: 'STADIUM',
    code: 'hwg5_u19_15',
    nameEn: 'Stadium',
    nameJa: '競技場',
    rubyName: <ruby>競技場<rt>きょうぎじょう</rt></ruby>,
    audioPath: '/sound_suite/hwg/word_0322/hwg_word_0322_stadium_jenny.mp3',
    illustWebp: '/cards/illustration/hwg5_u19_15_stadium_illust.webp',
    illustPng: '/cards/illustration/hwg5_u19_15_stadium_illust.png',
    icon: Trophy,
    accentColor: 'from-blue-600 to-indigo-700',
    pillBg: 'bg-indigo-600',
    features: [
      'Open-air athletic arena bowl with regulation green soccer pitch and white field lines',
      '4 high-intensity LED floodlight towers (17.2m tall, strictly <= 18m ceiling)',
      '3-tier blue spectator bleachers wrapping around the pitch and goalposts',
      'Digital LED match scoreboard displaying "RED TEAM 2 - 1 BLUE TEAM"'
    ],
    detail1: {
      label: 'Sports Pitch & Goals',
      icon: '⚽',
      pos: [0, 6.0, 4.0],
      target: [0, 1.0, -1.0]
    },
    detail2: {
      label: 'Floodlight & Scoreboard',
      icon: '💡',
      pos: [-7.2, 16.5, 0],
      target: [-7.2, 14.5, -3.5]
    }
  },
  ZOO: {
    id: 'ZOO',
    code: 'hwg5_u19_17',
    nameEn: 'Zoo',
    nameJa: '動物園',
    rubyName: <ruby>動物園<rt>どうぶつえん</rt></ruby>,
    audioPath: '/sound_suite/hwg/word_0663/hwg_word_0663_zoo_jenny.mp3',
    illustWebp: '/cards/illustration/hwg5_u19_17_zoo_illust.webp',
    illustPng: '/cards/illustration/hwg5_u19_17_zoo_illust.png',
    icon: PawPrint,
    accentColor: 'from-emerald-600 to-amber-700',
    pillBg: 'bg-emerald-700',
    features: [
      'Grand cedar timber safari gateway (5.6m) with "SAFARI ZOO" headline banner',
      'African savannah biome with sprawling umbrella acacia tree and spotted giraffe',
      'Elephant clay sanctuary with mud bathing pool and rock border',
      'Penguin cove with turquoise water pool and trio of ice-rock penguins'
    ],
    detail1: {
      label: 'Savannah & Giraffe',
      icon: '🦒',
      pos: [-4.2, 5.0, 3.8],
      target: [-4.2, 2.5, 0.0]
    },
    detail2: {
      label: 'Penguin Cove Pool',
      icon: '🐧',
      pos: [4.2, 3.8, 5.5],
      target: [4.2, 1.2, 3.0]
    }
  },
  AQUARIUM: {
    id: 'AQUARIUM',
    code: 'hwg5_u19_18',
    nameEn: 'Aquarium',
    nameJa: '水族館',
    rubyName: <ruby>水族館<rt>すいぞくかん</rt></ruby>,
    audioPath: '/sound_suite/hwg/word_0616/hwg_word_0616_aquarium_jenny.mp3',
    illustWebp: '/cards/illustration/hwg5_u19_18_aquarium_illust.webp',
    illustPng: '/cards/illustration/hwg5_u19_18_aquarium_illust.png',
    icon: Fish,
    accentColor: 'from-sky-500 to-blue-700',
    pillBg: 'bg-sky-600',
    features: [
      'Modern oceanic architecture with sweeping deep-blue wave canopy (12.2m)',
      'Giant 2-story acrylic viewing window looking into an illuminated ocean tank',
      'Gliding giant manta ray, swimming dolphin pod, and colorful coral reef floor',
      'Forecourt circular turquoise fountain with leaping bronze dolphin sculpture'
    ],
    detail1: {
      label: 'Ocean Tank & Manta',
      icon: '🌊',
      pos: [0, 4.8, 5.5],
      target: [0, 3.2, 0.0]
    },
    detail2: {
      label: 'Dolphin Leap Fountain',
      icon: '🐬',
      pos: [-4.2, 2.8, 7.8],
      target: [-4.2, 1.4, 6.7]
    }
  },
  CASTLE: {
    id: 'CASTLE',
    code: 'hwg5_u19_22',
    nameEn: 'Castle',
    nameJa: '城',
    rubyName: <ruby>城<rt>しろ</rt></ruby>,
    audioPath: '/sound_suite/hwg/word_0624/hwg_word_0624_castle_jenny.mp3',
    illustWebp: '/cards/illustration/hwg5_u19_22_castle_illust.webp',
    illustPng: '/cards/illustration/hwg5_u19_22_castle_illust.png',
    icon: Crown,
    accentColor: 'from-amber-600 to-stone-700',
    pillBg: 'bg-stone-700',
    features: [
      'Historic 3-tier feudal keep (天守閣 Tenshukaku) rising to 17.6m (strictly <= 18m)',
      'Sloping granite rampart base (石垣 Ishigaki) with fortified timber gate (大手門)',
      'Reflective water moat (堀) with stone bridge and sculpted black pine trees',
      'Twin golden dragon-carp finials (金鯱 Kinshachi) crowning the top roof ridge'
    ],
    detail1: {
      label: 'Keep & Golden Shachihoko',
      icon: '🏯',
      pos: [0, 18.2, 6.0],
      target: [0, 15.5, -1.8]
    },
    detail2: {
      label: 'Moat & Stone Bridge',
      icon: '🌉',
      pos: [0, 3.5, 7.5],
      target: [0, 1.8, 4.8]
    }
  },
  AMUSEMENT_PARK: {
    id: 'AMUSEMENT_PARK',
    code: 'hwg5_u19_25',
    nameEn: 'Amusement Park',
    nameJa: '遊園地',
    rubyName: <ruby>遊園地<rt>ゆうえんち</rt></ruby>,
    audioPath: '/sound_suite/hwg/word_0615/hwg_word_0615_amusement_park_jenny.mp3',
    illustWebp: '/cards/illustration/hwg5_u19_25_amusement_park_illust.webp',
    illustPng: '/cards/illustration/hwg5_u19_25_amusement_park_illust.png',
    icon: FerrisWheel,
    accentColor: 'from-pink-500 to-purple-600',
    pillBg: 'bg-pink-600',
    features: [
      'Giant 11.0m Ferris Wheel (観覧車) reaching 17.5m height with 8 colorful gondolas',
      'Banked red tubular steel roller coaster track with a 3-car coaster train at crest',
      'Fairytale pastel castle entrance gate with conical purple spires and gold stars',
      'Festive forecourt plaza with candy-striped balloon cart and colorful balloons'
    ],
    detail1: {
      label: 'Giant Ferris Wheel',
      icon: '🎡',
      pos: [4.0, 12.5, 6.5],
      target: [4.0, 11.5, -1.5]
    },
    detail2: {
      label: 'Roller Coaster Track',
      icon: '🎢',
      pos: [-4.5, 8.5, 4.5],
      target: [-4.5, 6.5, -1.8]
    }
  }
};

// Complete map of ambient SFX labels for all models
const AMBIENT_SOUND_LABELS: Partial<Record<ActiveModel, string>> = {
  BUS_STOP: 'Air Brake & Chime 🚏',
  POST_OFFICE: 'Stamp & Bell 📮',
  CONVENIENCE_STORE: 'Store Chime 🏪',
  POLICE_BOX: 'Police Whistle 👮',
  POLICE_STATION: 'Police Whistle 👮',
  BOOKSTORE: 'Page & Chord 📖',
  FLOWER_SHOP: 'Wind Chime 🎐',
  RESTAURANT: 'Grill & Bell 🍽️',
  EMPTY_LOT: 'Water Fountain 💧',
  SCHOOL: 'School Chime 🔔',
  JUNIOR_HIGH_SCHOOL: 'Homeroom Bell 🏫',
  DEPARTMENT_STORE: 'Elevator Chime 🛍️',
  SWIMMING_POOL: 'Whistle & Splash 🏊',
  FIRE_STATION: 'Emergency Siren 🚨',
  HOSPITAL: 'Clinic Chime 🏥',
  CITY_HALL: '5 PM Chime 🏛️',
  STATION: 'Eki-Mero 🚆',
  LIBRARY: 'Library Celesta 📚',
  SUPERMARKET: 'Scanner Beep 🛒',
  GYM: 'Court Buzzer 🏀',
  MUSEUM: 'Hall Gong 🏛️',
  TEMPLE: 'Bonshō Bell 🔔',
  SHRINE: 'Clappers & Bell ⛩️',
  PARK: 'Bamboo Fountain 🎋',
  GARDEN: 'Shishi-odoshi 🎋',
  STADIUM: 'Match Cheer ⚽',
  ZOO: 'Safari Fanfare 🦁',
  AQUARIUM: 'Sonar & Bubbles 🐬',
  CASTLE: 'Taiko Drums 🏯',
  AMUSEMENT_PARK: 'Carousel Music 🎡',
};

/**
 * Safely disposes geometries on removed preview groups so switching tabs never leaks GPU buffers.
 */
function disposeModelGroup(group: THREE.Group) {
  group.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.isMesh && mesh.geometry) {
      mesh.geometry.dispose();
    }
  });
}

/**
 * Builds a 1.35m scale avatar (Japanese 5th grader with Randoseru backpack & safety cap)
 */
function buildScaleFigure(height: number = 1.35): THREE.Group {
  const group = new THREE.Group();
  group.name = 'ScaleFigure_5thGrader';

  const skinMat = new THREE.MeshStandardMaterial({ color: 0xfed7aa, roughness: 0.6 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.7 });
  const shortsMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.8 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
  const capMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.5 });
  const randoMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.4 });

  const scale = height / 1.35;

  // Shoes
  const shoeGeo = new THREE.BoxGeometry(0.09, 0.07, 0.16);
  const leftShoe = new THREE.Mesh(shoeGeo, shoeMat);
  leftShoe.position.set(-0.09, 0.035, 0.02);
  leftShoe.castShadow = true;
  const rightShoe = new THREE.Mesh(shoeGeo, shoeMat);
  rightShoe.position.set(0.09, 0.035, 0.02);
  rightShoe.castShadow = true;
  group.add(leftShoe, rightShoe);

  // Legs
  const legGeo = new THREE.CylinderGeometry(0.045, 0.04, 0.46, 8);
  const leftLeg = new THREE.Mesh(legGeo, skinMat);
  leftLeg.position.set(-0.09, 0.30, 0);
  leftLeg.castShadow = true;
  const rightLeg = new THREE.Mesh(legGeo, skinMat);
  rightLeg.position.set(0.09, 0.30, 0);
  rightLeg.castShadow = true;
  group.add(leftLeg, rightLeg);

  // Shorts
  const shortsGeo = new THREE.BoxGeometry(0.26, 0.18, 0.16);
  const shorts = new THREE.Mesh(shortsGeo, shortsMat);
  shorts.position.set(0, 0.54, 0);
  shorts.castShadow = true;
  group.add(shorts);

  // Torso / Polo Shirt
  const torsoGeo = new THREE.BoxGeometry(0.28, 0.42, 0.17);
  const torso = new THREE.Mesh(torsoGeo, shirtMat);
  torso.position.set(0, 0.83, 0);
  torso.castShadow = true;
  group.add(torso);

  // Randoseru Backpack on Back
  const randoGeo = new THREE.BoxGeometry(0.24, 0.32, 0.13);
  const rando = new THREE.Mesh(randoGeo, randoMat);
  rando.position.set(0, 0.85, -0.15);
  rando.castShadow = true;
  group.add(rando);

  // Head
  const headGeo = new THREE.SphereGeometry(0.11, 16, 12);
  const head = new THREE.Mesh(headGeo, skinMat);
  head.position.set(0, 1.16, 0);
  head.castShadow = true;
  group.add(head);

  // Yellow Safety Cap
  const capCrownGeo = new THREE.SphereGeometry(0.115, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  const cap = new THREE.Mesh(capCrownGeo, capMat);
  cap.position.set(0, 1.18, 0);
  cap.castShadow = true;
  const visorGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.015, 16, 1, false, 0, Math.PI);
  const visor = new THREE.Mesh(visorGeo, capMat);
  visor.position.set(0, 1.18, 0.05);
  group.add(cap, visor);

  if (scale !== 1.0) {
    group.scale.setScalar(scale);
  }
  return group;
}

export const TownModelInspector: React.FC<TownModelInspectorProps> = ({ onExit }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelGroupRef = useRef<THREE.Group | null>(null);

  // Lighting refs
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const hemiLightRef = useRef<THREE.HemisphereLight | null>(null);
  const nightPointLightRef = useRef<THREE.PointLight | null>(null);
  const skyboxRef = useRef<THREE.Mesh | null>(null);
  const groundMatRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const perimeterSceneryRef = useRef<THREE.Group | null>(null);
  const weatherControllerRef = useRef<WeatherParticleController | null>(null);
  const materialBucketsRef = useRef<SceneMaterialBuckets | null>(null);

  // UI States
  const [viewMode, setViewMode] = useState<'INSPECTOR' | 'NAVIGATOR'>('INSPECTOR');
  const [activeTier, setActiveTier] = useState<ActiveTier>('TIER_3');
  const [activeModel, setActiveModel] = useState<ActiveModel>('ESPLANADE_5');
  const [selectedHousePalette, setSelectedHousePalette] = useState<string>('terracotta_cream');
  const [selectedParkTheme, setSelectedParkTheme] = useState<EmptyLotVariant>('SAKURA_FOUNTAIN');
  const [autoRotate, setAutoRotate] = useState(false);
  const [lightingMode, setLightingMode] = useState<LightingMode>('NOON');
  const [weather, setWeather] = useState<WeatherMode>('CLEAR');
  const weatherRef = useRef<WeatherMode>('CLEAR');
  useEffect(() => { weatherRef.current = weather; }, [weather]);
  const lightingModeRef = useRef<LightingMode>(lightingMode);
  useEffect(() => { lightingModeRef.current = lightingMode; }, [lightingMode]);
  const [showWireframe, setShowWireframe] = useState(false);
  const [showScaleFigure, setShowScaleFigure] = useState(true);
  const [includeHedge, setIncludeHedge] = useState(true);
  const [includeRoad] = useState(true);
  const [activeAngle, setActiveAngle] = useState<CameraAngle>('FRONT');
  const [showCardOverlay, setShowCardOverlay] = useState(true);
  const [cardImgFailed, setCardImgFailed] = useState(false);
  const [isSceneReady, setIsSceneReady] = useState(false);

  // Reset image fallback state when active model changes
  useEffect(() => {
    setCardImgFailed(false);
  }, [activeModel, activeTier]);

  // Synchronize autoRotate dynamically to avoid stale closures in animation loop
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = autoRotate;
    }
  }, [autoRotate]);

  // Handle tier switching
  const handleTierSwitch = (tier: ActiveTier) => {
    setActiveTier(tier);
    if (tier === 'TIER_1') {
      setActiveModel('AVENUE_8');
    } else if (tier === 'TIER_2') {
      setActiveModel('BOULEVARD_13');
    } else {
      setActiveModel('ESPLANADE_5');
    }
  };

  // Play official voice recording
  const playVoice = useCallback(() => {
    if (activeModel === 'AVENUE_8') {
      const sentence = "Welcome to our town! Go straight and turn right at the corner.";
      if ('speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance(sentence);
        u.lang = 'en-US';
        u.rate = 0.9;
        window.speechSynthesis.speak(u);
      }
      return;
    }

    if (activeModel === 'BOULEVARD_13') {
      const sentence = "Welcome to our town! There is a school, a junior high school, a hospital, a fire station, and a city hall.";
      if ('speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance(sentence);
        u.lang = 'en-US';
        u.rate = 0.9;
        window.speechSynthesis.speak(u);
      }
      return;
    }

    if (activeModel === 'ESPLANADE_5') {
      const sentence = "Welcome to our town! Visit the stadium, the zoo, the aquarium, the castle, and the amusement park.";
      if ('speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance(sentence);
        u.lang = 'en-US';
        u.rate = 0.9;
        window.speechSynthesis.speak(u);
      }
      return;
    }

    const def = (activeTier === 'TIER_1' 
      ? TIER1_CATALOG[activeModel as Exclude<Tier1Model, 'AVENUE_8'>]
      : activeTier === 'TIER_2'
      ? TIER2_CATALOG[activeModel as Exclude<Tier2Model, 'BOULEVARD_13'>]
      : TIER3_CATALOG[activeModel as Exclude<Tier3Model, 'ESPLANADE_5'>]
    );
    if (!def) return;

    const speakFallback = () => {
      if ('speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance(def.nameEn);
        u.lang = 'en-US';
        u.rate = 0.9;
        window.speechSynthesis.speak(u);
      }
    };

    if (def.audioPath) {
      const audio = new Audio(def.audioPath);
      audio.play().catch(speakFallback);
    } else {
      speakFallback();
    }
  }, [activeModel, activeTier]);

  // Play all 28 authentic Japanese atmospheric sound effects
  const playAmbientSFX = useCallback(() => {
    switch (activeModel) {
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
      case 'POLICE_BOX':
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
      case 'EMPTY_LOT':
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
  }, [activeModel]);

  // Set camera angle smoothly
  const setCameraView = useCallback((angle: CameraAngle) => {
    setActiveAngle(angle);
    if (!cameraRef.current || !controlsRef.current) return;

    const camera = cameraRef.current;
    const controls = controlsRef.current;

    if (activeModel === 'AVENUE_8') {
      switch (angle) {
        case 'FRONT':
          camera.position.set(0, 6.0, 26.0);
          controls.target.set(0, 2.2, 1.0);
          break;
        case 'RACER':
          camera.position.set(-23.0, 1.0, 5.5);
          controls.target.set(0.0, 1.5, 3.5);
          break;
        case 'ISOMETRIC':
          camera.position.set(22.0, 18.0, 28.0);
          controls.target.set(0, 2.0, 1.0);
          break;
        case 'DETAIL_1':
          camera.position.set(-12.0, 4.0, 13.0);
          controls.target.set(-12.0, 2.0, 0.5);
          break;
        case 'DETAIL_2':
          camera.position.set(12.0, 4.0, 13.0);
          controls.target.set(12.0, 2.0, 0.5);
          break;
      }
    } else if (activeModel === 'BOULEVARD_13') {
      switch (angle) {
        case 'FRONT':
          camera.position.set(0, 12.0, 56.0);
          controls.target.set(0, 3.5, 2.0);
          break;
        case 'RACER':
          camera.position.set(-90.0, 1.4, 8.5);
          controls.target.set(0.0, 3.0, 6.0);
          break;
        case 'ISOMETRIC':
          camera.position.set(52.0, 42.0, 72.0);
          controls.target.set(0, 4.0, 0.0);
          break;
        case 'DETAIL_1':
          camera.position.set(-54.0, 8.0, 28.0);
          controls.target.set(-54.0, 3.5, 2.0);
          break;
        case 'DETAIL_2':
          camera.position.set(54.0, 8.0, 28.0);
          controls.target.set(54.0, 3.5, 2.0);
          break;
      }
    } else if (activeModel === 'ESPLANADE_5') {
      switch (angle) {
        case 'FRONT':
          camera.position.set(0, 14.0, 56.0);
          controls.target.set(0, 6.0, 2.0);
          break;
        case 'RACER':
          camera.position.set(-44.0, 1.5, 11.5);
          controls.target.set(0.0, 4.0, 8.0);
          break;
        case 'ISOMETRIC':
          camera.position.set(48.0, 42.0, 58.0);
          controls.target.set(0, 6.0, 0.0);
          break;
        case 'DETAIL_1': // Stadium & Zoo
          camera.position.set(-27.0, 12.0, 32.0);
          controls.target.set(-27.0, 6.0, 2.0);
          break;
        case 'DETAIL_2': // Castle & Amusement Park
          camera.position.set(27.0, 12.0, 32.0);
          controls.target.set(27.0, 6.0, 2.0);
          break;
      }
    } else if (activeTier === 'TIER_1') {
      const def = TIER1_CATALOG[activeModel as Exclude<Tier1Model, 'AVENUE_8'>];
      switch (angle) {
        case 'FRONT':
          camera.position.set(0, 2.8, 8.2);
          controls.target.set(0, 2.2, 0.5);
          break;
        case 'RACER':
          camera.position.set(-2.5, 0.9, 5.5);
          controls.target.set(0.4, 1.8, 0.5);
          break;
        case 'ISOMETRIC':
          camera.position.set(6.2, 6.0, 6.5);
          controls.target.set(0, 2.2, 0.5);
          break;
        case 'DETAIL_1':
          if (def) {
            camera.position.set(...def.detail1.pos);
            controls.target.set(...def.detail1.target);
          }
          break;
        case 'DETAIL_2':
          if (def) {
            camera.position.set(...def.detail2.pos);
            controls.target.set(...def.detail2.target);
          }
          break;
      }
    } else if (activeTier === 'TIER_2') {
      const def = TIER2_CATALOG[activeModel as Exclude<Tier2Model, 'BOULEVARD_13'>];
      switch (angle) {
        case 'FRONT':
          camera.position.set(0, 4.5, 17.0);
          controls.target.set(0, 4.0, 0.5);
          break;
        case 'RACER':
          camera.position.set(-6.5, 1.2, 8.2);
          controls.target.set(0.0, 2.5, 1.0);
          break;
        case 'ISOMETRIC':
          camera.position.set(13.5, 13.5, 15.0);
          controls.target.set(0, 3.5, 0.5);
          break;
        case 'DETAIL_1':
          if (def) {
            camera.position.set(...def.detail1.pos);
            controls.target.set(...def.detail1.target);
          }
          break;
        case 'DETAIL_2':
          if (def) {
            camera.position.set(...def.detail2.pos);
            controls.target.set(...def.detail2.target);
          }
          break;
      }
    } else {
      // Single Tier 3 Model (18m x 18m)
      const def = TIER3_CATALOG[activeModel as Exclude<Tier3Model, 'ESPLANADE_5'>];
      switch (angle) {
        case 'FRONT':
          camera.position.set(0, 7.0, 25.5);
          controls.target.set(0, 5.5, 1.0);
          break;
        case 'RACER':
          camera.position.set(-9.5, 1.4, 11.0);
          controls.target.set(0.0, 4.0, 2.0);
          break;
        case 'ISOMETRIC':
          camera.position.set(19.5, 19.5, 22.0);
          controls.target.set(0, 5.0, 0.5);
          break;
        case 'DETAIL_1':
          if (def) {
            camera.position.set(...def.detail1.pos);
            controls.target.set(...def.detail1.target);
          }
          break;
        case 'DETAIL_2':
          if (def) {
            camera.position.set(...def.detail2.pos);
            controls.target.set(...def.detail2.target);
          }
          break;
      }
    }
    controls.update();
  }, [activeModel, activeTier]);

  // Apply lighting preset
  useEffect(() => {
    if (!isSceneReady || !sunLightRef.current || !hemiLightRef.current || !sceneRef.current) return;

    const sun = sunLightRef.current;
    const hemi = hemiLightRef.current;
    const scene = sceneRef.current;
    const nightLight = nightPointLightRef.current;

    // Adjust shadow bounds dynamically
    if (activeModel === 'BOULEVARD_13') {
      sun.shadow.camera.left = -105;
      sun.shadow.camera.right = 105;
      sun.shadow.camera.top = 25;
      sun.shadow.camera.bottom = -25;
      sun.shadow.camera.far = 190;
    } else if (activeModel === 'ESPLANADE_5') {
      sun.shadow.camera.left = -55;
      sun.shadow.camera.right = 55;
      sun.shadow.camera.top = 25;
      sun.shadow.camera.bottom = -25;
      sun.shadow.camera.far = 140;
    } else if (activeModel === 'AVENUE_8') {
      sun.shadow.camera.left = -30;
      sun.shadow.camera.right = 30;
      sun.shadow.camera.top = 18;
      sun.shadow.camera.bottom = -18;
      sun.shadow.camera.far = 70;
    } else if (activeTier === 'TIER_3') {
      sun.shadow.camera.left = -18;
      sun.shadow.camera.right = 18;
      sun.shadow.camera.top = 20;
      sun.shadow.camera.bottom = -20;
      sun.shadow.camera.far = 60;
    } else {
      sun.shadow.camera.left = -12;
      sun.shadow.camera.right = 12;
      sun.shadow.camera.top = 14;
      sun.shadow.camera.bottom = -14;
      sun.shadow.camera.far = 50;
    }
    sun.shadow.camera.updateProjectionMatrix();

    const atmos = getCompositeAtmosphere(
      inspectorModeToTimeOfDay(lightingMode),
      weather
    );

    scene.background = new THREE.Color(atmos.skyColor);
    scene.fog = new THREE.FogExp2(atmos.skyColor, atmos.fogDensity);

    hemi.color.setHex(atmos.ambientColor);
    hemi.groundColor.setHex(atmos.groundColor);
    hemi.intensity = atmos.ambientIntensity;

    sun.color.setHex(atmos.sunColor);
    sun.intensity = atmos.sunIntensity;
    sun.position.set(...atmos.sunPosition);

    if (nightLight) {
      nightLight.intensity = atmos.playerLampIntensity;
      if (activeModel === 'POLICE_BOX' && lightingMode === 'MIDNIGHT') {
        nightLight.position.set(-0.5, 2.8, 2.0);
        nightLight.color.setHex(0xff4444);
      } else {
        nightLight.color.setHex(0xfef08a);
        nightLight.position.set(0, 5.0, 4.0);
      }
    }

    if (groundMatRef.current) {
      groundMatRef.current.color.setHex(atmos.groundColor);
    }

    if (skyboxRef.current) {
      updateAtmosphericSkybox(skyboxRef.current, lightingMode, atmos.skyboxTintHex);
    }
    if (perimeterSceneryRef.current) {
      updatePerimeterSceneryLighting(perimeterSceneryRef.current, atmos.streetlightLevel, atmos.groundColor);
    }

    if (materialBucketsRef.current) {
      applyAtmosphereToMaterials(materialBucketsRef.current, atmos);
    }
    if (weatherControllerRef.current) {
      weatherControllerRef.current.setWeather(weather);
    }
  }, [isSceneReady, lightingMode, weather, activeModel, activeTier]);

  // Rebuild model when activeModel, tier, palette, or options change
  useEffect(() => {
    if (!isSceneReady || !sceneRef.current) return;
    const scene = sceneRef.current;

    if (modelGroupRef.current) {
      scene.remove(modelGroupRef.current);
      disposeModelGroup(modelGroupRef.current);
    }

    let newModel: THREE.Group;

    if (activeModel === 'AVENUE_8') {
      // 48-Meter Avenue: All 8 Tier 1 Models
      const avenueGroup = new THREE.Group();
      avenueGroup.name = 'CompleteAvenue_8Buildings';

      const restaurant = buildRestaurantMesh({ includeRoad, includeLandscaping: includeHedge });
      restaurant.position.set(-21.0, 0, 0);
      avenueGroup.add(restaurant);

      const flowerShop = buildFlowerShopMesh({ includeRoad, includeLandscaping: includeHedge });
      flowerShop.position.set(-15.0, 0, 0);
      avenueGroup.add(flowerShop);

      const bookstore = buildBookstoreMesh({ includeRoad, includeLandscaping: includeHedge });
      bookstore.position.set(-9.0, 0, 0);
      avenueGroup.add(bookstore);

      const policeBox = buildPoliceBoxMesh({ includeRoad, includeLandscaping: includeHedge });
      policeBox.position.set(-3.0, 0, 0);
      avenueGroup.add(policeBox);

      const konbini = buildConvenienceStoreMesh({ includeRoad, includeLandscaping: includeHedge });
      konbini.position.set(3.0, 0, 0);
      avenueGroup.add(konbini);

      const postOffice = buildPostOfficeMesh({ includeRoad, includeTrees: includeHedge });
      postOffice.position.set(9.0, 0, 0);
      avenueGroup.add(postOffice);

      const busStop = buildBusStopMesh({ includeRoad, includeHedge });
      busStop.position.set(15.0, 0, 0);
      avenueGroup.add(busStop);

      const house = buildHouseMesh({
        palette: selectedHousePalette,
        includeRoad,
        includeTrees: includeHedge,
      });
      house.position.set(21.0, 0, 0);
      avenueGroup.add(house);

      if (showScaleFigure) {
        const s1 = buildScaleFigure(1.35);
        s1.position.set(-8.5, 0.15, 2.25);
        s1.rotation.y = 0.4;
        avenueGroup.add(s1);

        const s2 = buildScaleFigure(1.35);
        s2.position.set(2.4, 0.15, 2.25);
        s2.rotation.y = -0.3;
        avenueGroup.add(s2);

        const s3 = buildScaleFigure(1.35);
        s3.position.set(15.0, 0.15, 2.25);
        s3.rotation.y = 0.1;
        avenueGroup.add(s3);
      }

      newModel = avenueGroup;
    } else if (activeModel === 'BOULEVARD_13') {
      // 192-Meter Civic Boulevard: All 16 Tier 2 Models (Grade 5 + Grade 6)
      const bvdGroup = new THREE.Group();
      bvdGroup.name = 'CompleteBoulevard_16CivicBuildings';

      const builders: Array<() => THREE.Group> = [
        () => buildSchoolMesh({ includeRoad, includeLandscaping: includeHedge }),
        () => buildJuniorHighSchoolMesh({ includeRoad }),
        () => buildFireStationMesh({ includeRoad, includeLandscaping: includeHedge }),
        () => buildHospitalMesh({ includeRoad, includeLandscaping: includeHedge }),
        () => buildCityHallMesh({ includeRoad, includeLandscaping: includeHedge }),
        () => buildStationMesh({ includeRoad, includeLandscaping: includeHedge }),
        () => buildLibraryMesh({ includeRoad, includeLandscaping: includeHedge }),
        () => buildDepartmentStoreMesh({ includeRoad }),
        () => buildSupermarketMesh({ includeRoad, includeLandscaping: includeHedge }),
        () => buildGymMesh({ includeRoad, includeLandscaping: includeHedge }),
        () => buildSwimmingPoolMesh({ includeRoad }),
        () => buildMuseumMesh({ includeRoad, includeLandscaping: includeHedge }),
        () => buildTempleMesh({ includeRoad, includeLandscaping: includeHedge }),
        () => buildShrineMesh({ includeRoad, includeLandscaping: includeHedge }),
        () => buildParkMesh({ includeRoad, includeLandscaping: includeHedge }),
        () => buildGardenMesh({ includeRoad, includeLandscaping: includeHedge }),
      ];

      const totalCount = builders.length;
      builders.forEach((buildFn, idx) => {
        const mesh = buildFn();
        const xPos = (idx - (totalCount - 1) / 2) * 12.0;
        mesh.position.set(xPos, 0, 0);
        bvdGroup.add(mesh);
      });

      if (showScaleFigure) {
        [-72.0, -18.0, 18.0, 72.0].forEach((sx, idx) => {
          const s = buildScaleFigure(1.35);
          s.position.set(sx, 0.18, 5.25);
          s.rotation.y = idx % 2 === 0 ? 0.3 : -0.3;
          bvdGroup.add(s);
        });
      }

      newModel = bvdGroup;
    } else if (activeModel === 'ESPLANADE_5') {
      // 90-Meter Landmark Esplanade: All 5 Tier 3 Mega-Facilities
      const espGroup = new THREE.Group();
      espGroup.name = 'CompleteEsplanade_5LandmarkFacilities';

      const stadium = buildStadiumMesh({ includeRoad, includeLandscaping: includeHedge });
      stadium.position.set(-36.0, 0, 0);
      espGroup.add(stadium);

      const zoo = buildZooMesh({ includeRoad, includeLandscaping: includeHedge });
      zoo.position.set(-18.0, 0, 0);
      espGroup.add(zoo);

      const aquarium = buildAquariumMesh({ includeRoad, includeLandscaping: includeHedge });
      aquarium.position.set(0.0, 0, 0);
      espGroup.add(aquarium);

      const castle = buildCastleMesh({ includeRoad, includeLandscaping: includeHedge });
      castle.position.set(18.0, 0, 0);
      espGroup.add(castle);

      const amusementPark = buildAmusementParkMesh({ includeRoad, includeLandscaping: includeHedge });
      amusementPark.position.set(36.0, 0, 0);
      espGroup.add(amusementPark);

      if (showScaleFigure) {
        const s1 = buildScaleFigure(1.35);
        s1.position.set(-35.0, 0.18, 8.25);
        s1.rotation.y = 0.3;
        espGroup.add(s1);

        const s2 = buildScaleFigure(1.35);
        s2.position.set(0.0, 0.18, 8.25);
        s2.rotation.y = -0.15;
        espGroup.add(s2);

        const s3 = buildScaleFigure(1.35);
        s3.position.set(35.0, 0.18, 8.25);
        s3.rotation.y = -0.3;
        espGroup.add(s3);
      }

      newModel = espGroup;
    } else if (activeTier === 'TIER_1') {
      const lotGroup = new THREE.Group();
      let singleMesh: THREE.Group;

      switch (activeModel) {
        case 'HOUSE':
          singleMesh = buildHouseMesh({
            palette: selectedHousePalette,
            includeRoad,
            includeTrees: includeHedge,
          });
          break;
        case 'EMPTY_LOT':
          singleMesh = buildEmptyLotMesh({ includeRoad, variant: selectedParkTheme });
          break;
        case 'APARTMENT':
          singleMesh = buildApartmentMesh({
            includeRoad,
            palette: selectedHousePalette,
          });
          break;
        case 'BUS_STOP':
          singleMesh = buildBusStopMesh({ includeHedge, includeRoad });
          break;
        case 'POST_OFFICE':
          singleMesh = buildPostOfficeMesh({ includeRoad, includeTrees: includeHedge });
          break;
        case 'CONVENIENCE_STORE':
          singleMesh = buildConvenienceStoreMesh({ includeRoad, includeLandscaping: includeHedge });
          break;
        case 'POLICE_BOX':
          singleMesh = buildPoliceBoxMesh({ includeRoad, includeLandscaping: includeHedge });
          break;
        case 'BOOKSTORE':
          singleMesh = buildBookstoreMesh({ includeRoad, includeLandscaping: includeHedge });
          break;
        case 'FLOWER_SHOP':
          singleMesh = buildFlowerShopMesh({ includeRoad, includeLandscaping: includeHedge });
          break;
        case 'RESTAURANT':
        default:
          singleMesh = buildRestaurantMesh({ includeRoad, includeLandscaping: includeHedge });
          break;
      }

      lotGroup.add(singleMesh);

      if (showScaleFigure) {
        const student = buildScaleFigure(1.35);
        student.position.set(0.0, 0.15, 2.25);
        student.rotation.y = 0.15;
        lotGroup.add(student);
      }

      newModel = lotGroup;
    } else if (activeTier === 'TIER_2') {
      const lotGroup = new THREE.Group();
      let singleMesh: THREE.Group;

      switch (activeModel) {
        case 'SCHOOL':
          singleMesh = buildSchoolMesh({ includeRoad, includeLandscaping: includeHedge });
          break;
        case 'JUNIOR_HIGH_SCHOOL':
          singleMesh = buildJuniorHighSchoolMesh({ includeRoad });
          break;
        case 'DEPARTMENT_STORE':
          singleMesh = buildDepartmentStoreMesh({ includeRoad });
          break;
        case 'SWIMMING_POOL':
          singleMesh = buildSwimmingPoolMesh({ includeRoad });
          break;
        case 'FIRE_STATION':
          singleMesh = buildFireStationMesh({ includeRoad, includeLandscaping: includeHedge });
          break;
        case 'POLICE_STATION':
          singleMesh = buildPoliceStationMesh({ includeRoad, includeLandscaping: includeHedge });
          break;
        case 'HOSPITAL':
          singleMesh = buildHospitalMesh({ includeRoad, includeLandscaping: includeHedge });
          break;
        case 'CITY_HALL':
          singleMesh = buildCityHallMesh({ includeRoad, includeLandscaping: includeHedge });
          break;
        case 'STATION':
          singleMesh = buildStationMesh({ includeRoad, includeLandscaping: includeHedge });
          break;
        case 'LIBRARY':
          singleMesh = buildLibraryMesh({ includeRoad, includeLandscaping: includeHedge });
          break;
        case 'SUPERMARKET':
          singleMesh = buildSupermarketMesh({ includeRoad, includeLandscaping: includeHedge });
          break;
        case 'GYM':
          singleMesh = buildGymMesh({ includeRoad, includeLandscaping: includeHedge });
          break;
        case 'MUSEUM':
          singleMesh = buildMuseumMesh({ includeRoad, includeLandscaping: includeHedge });
          break;
        case 'TEMPLE':
          singleMesh = buildTempleMesh({ includeRoad, includeLandscaping: includeHedge });
          break;
        case 'SHRINE':
          singleMesh = buildShrineMesh({ includeRoad, includeLandscaping: includeHedge });
          break;
        case 'PARK':
          singleMesh = buildParkMesh({ includeRoad, includeLandscaping: includeHedge });
          break;
        case 'GARDEN':
        default:
          singleMesh = buildGardenMesh({ includeRoad, includeLandscaping: includeHedge });
          break;
      }

      lotGroup.add(singleMesh);

      if (showScaleFigure) {
        const student = buildScaleFigure(1.35);
        student.position.set(0.0, 0.18, 5.25);
        student.rotation.y = 0.15;
        lotGroup.add(student);
      }

      newModel = lotGroup;
    } else {
      const lotGroup = new THREE.Group();
      let singleMesh: THREE.Group;

      switch (activeModel) {
        case 'STADIUM':
          singleMesh = buildStadiumMesh({ includeRoad, includeLandscaping: includeHedge });
          break;
        case 'ZOO':
          singleMesh = buildZooMesh({ includeRoad, includeLandscaping: includeHedge });
          break;
        case 'AQUARIUM':
          singleMesh = buildAquariumMesh({ includeRoad, includeLandscaping: includeHedge });
          break;
        case 'CASTLE':
          singleMesh = buildCastleMesh({ includeRoad, includeLandscaping: includeHedge });
          break;
        case 'AMUSEMENT_PARK':
        default:
          singleMesh = buildAmusementParkMesh({ includeRoad, includeLandscaping: includeHedge });
          break;
      }

      lotGroup.add(singleMesh);

      if (showScaleFigure) {
        const student = buildScaleFigure(1.35);
        student.position.set(0.0, 0.18, 8.25);
        student.rotation.y = 0.15;
        lotGroup.add(student);
      }

      newModel = lotGroup;
    }

    enhanceBuildingGroup(newModel);

    if (showWireframe) {
      newModel.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const m = (child as THREE.Mesh).material;
          if (Array.isArray(m)) {
            m.forEach(mat => { (mat as THREE.MeshStandardMaterial).wireframe = true; });
          } else if (m) {
            (m as THREE.MeshStandardMaterial).wireframe = true;
          }
        }
      });
    }

    scene.add(newModel);
    modelGroupRef.current = newModel;

    const buckets = collectSceneWeatherMaterials(newModel);
    materialBucketsRef.current = buckets;
    const currentAtmos = getCompositeAtmosphere(
      inspectorModeToTimeOfDay(lightingModeRef.current),
      weatherRef.current
    );
    applyAtmosphereToMaterials(buckets, currentAtmos);

    setCameraView('FRONT');
  }, [isSceneReady, activeModel, activeTier, selectedHousePalette, selectedParkTheme, includeHedge, includeRoad, showWireframe, showScaleFigure, setCameraView]);

  // Three.js Mount & Animation Loop
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xbae6fd);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 260);
    camera.position.set(0, 14.0, 56.0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    const gpu = detectClassroomGpuProfile(renderer.getContext());
    renderer.setSize(width, height);
    renderer.setPixelRatio(gpu.targetPixelRatio);
    renderer.shadowMap.enabled = gpu.enableDynamicShadows;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    // 1. 360° Atmospheric Skybox Dome
    const skybox = buildAtmosphericSkybox('NOON', 320);
    skyboxRef.current = skybox;
    scene.add(skybox);

    // 2. Surrounding Textured Botanical Grass Meadow & 360° Mountains / City Skyline Scenery
    const { mesh: outerGround, material: outerGroundMat } = buildTexturedGroundPlane(560, 84, 0x86efac);
    groundMatRef.current = outerGroundMat;
    scene.add(outerGround);

    const perimeterScenery = buildPerimeterScenery({
      boundaryHalfSize: 64.0,
      includeBoundaryFence: false,
    });
    perimeterSceneryRef.current = perimeterScenery;
    scene.add(perimeterScenery);

    // Studio Environment Reflection (RoomEnvironment)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmremGenerator.dispose();

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI / 2 + 0.05;
    controls.minDistance = 1.0;
    controls.maxDistance = 180.0;
    controls.target.set(0, 6.0, 2.0);
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 1.0;
    controlsRef.current = controls;

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x94a3b8, 1.0);
    scene.add(hemiLight);
    hemiLightRef.current = hemiLight;

    const sunLight = new THREE.DirectionalLight(0xfffbeb, 1.8);
    sunLight.position.set(8, 20, 12);
    sunLight.castShadow = gpu.enableDynamicShadows;
    if (gpu.enableDynamicShadows) {
      sunLight.shadow.mapSize.width = gpu.shadowMapRes;
      sunLight.shadow.mapSize.height = gpu.shadowMapRes;
      sunLight.shadow.camera.near = 0.5;
      sunLight.shadow.camera.far = 180;
      sunLight.shadow.camera.left = -55;
      sunLight.shadow.camera.right = 55;
      sunLight.shadow.camera.top = 25;
      sunLight.shadow.camera.bottom = -25;
      sunLight.shadow.bias = -0.0005;
    }
    scene.add(sunLight);
    sunLightRef.current = sunLight;

    const nightPointLight = new THREE.PointLight(0xfef08a, 0, 45, 2);
    nightPointLight.position.set(0, 5.0, 4.0);
    scene.add(nightPointLight);
    nightPointLightRef.current = nightPointLight;

    // 3D Weather Particle Controller
    const weatherController = createWeatherParticleController(48, 24, 48);
    weatherController.setWeather(weatherRef.current);
    weatherControllerRef.current = weatherController;
    scene.add(weatherController.group);

    setIsSceneReady(true);

    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    let animId: number;
    const clockStartTime = performance.now();
    let clockLastTime = clockStartTime;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const nowMs = performance.now();
      const delta = Math.min(0.1, (nowMs - clockLastTime) / 1000);
      clockLastTime = nowMs;
      const elapsed = (nowMs - clockStartTime) / 1000;

      if (modelGroupRef.current) {
        const wheelRotor = modelGroupRef.current.getObjectByName('AmusementPark_WheelRotor');
        if (wheelRotor) {
          wheelRotor.rotation.z -= delta * 0.22;
          for (let i = 0; i < 8; i++) {
            const gondola = wheelRotor.getObjectByName(`Gondola_${i}`);
            if (gondola) {
              gondola.rotation.z = -wheelRotor.rotation.z;
            }
          }
        }

        const carouselRotor = modelGroupRef.current.getObjectByName('AmusementPark_CarouselRotor');
        if (carouselRotor) {
          carouselRotor.rotation.y += delta * 0.85;
        }

        const mantaRay = modelGroupRef.current.getObjectByName('MantaRay');
        if (mantaRay) {
          mantaRay.position.y = 3.8 + Math.sin(elapsed * 1.6) * 0.25;
          mantaRay.rotation.x = 0.2 + Math.cos(elapsed * 1.6) * 0.08;
        }
      }

      if (weatherControllerRef.current) {
        weatherControllerRef.current.update(delta, elapsed, 0, 0);
      }

      if (controlsRef.current) {
        controlsRef.current.update();
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      setIsSceneReady(false);
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      if (weatherControllerRef.current) {
        weatherControllerRef.current.dispose();
      }
      controls.dispose();
      renderer.dispose();
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  const currentDef = activeTier === 'TIER_1'
    ? (activeModel !== 'AVENUE_8' ? TIER1_CATALOG[activeModel as Exclude<Tier1Model, 'AVENUE_8'>] : null)
    : activeTier === 'TIER_2'
    ? (activeModel !== 'BOULEVARD_13' ? TIER2_CATALOG[activeModel as Exclude<Tier2Model, 'BOULEVARD_13'>] : null)
    : (activeModel !== 'ESPLANADE_5' ? TIER3_CATALOG[activeModel as Exclude<Tier3Model, 'ESPLANADE_5'>] : null);

  const ambientSoundLabel = AMBIENT_SOUND_LABELS[activeModel] ?? null;

  if (viewMode === 'NAVIGATOR') {
    return <TownNavigator onExit={onExit} onSwitchToInspector={() => setViewMode('INSPECTOR')} />;
  }

  const CurrentIcon = currentDef?.icon || Building2;

  return (
    <div className="fixed inset-0 w-screen h-dvh flex flex-col bg-slate-950 text-white font-sans overflow-hidden select-none z-50">
      {/* Top Header Bar */}
      <div className="absolute top-0 left-0 right-0 z-20 flex flex-nowrap items-center justify-between px-3 sm:px-6 py-2 bg-slate-900/85 backdrop-blur-md border-b border-slate-800 gap-2 overflow-x-auto no-scrollbar whitespace-nowrap">
        <div className="flex items-center gap-2 min-w-0 flex-1 flex-nowrap">
          {onExit && (
            <button
              onClick={onExit}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors shrink-0"
              title="Return to Hub"
            >
              <ArrowLeft size={18} />
            </button>
          )}

          {/* Mode Switcher: Inspector vs Navigator */}
          <div className="flex items-center bg-slate-950/80 p-0.5 rounded-xl border border-slate-700/80 shrink-0">
            <button
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-black bg-amber-500 text-slate-950 shadow-sm whitespace-nowrap shrink-0"
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Model Inspector</span>
            </button>
            <button
              onClick={() => setViewMode('NAVIGATOR')}
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-black text-slate-300 hover:text-white transition-all whitespace-nowrap shrink-0"
              title="Switch to 3D Town Navigator"
            >
              <Compass className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Town Navigator</span>
            </button>
          </div>

          {/* Tier 1 / Tier 2 / Tier 3 3-Way Segmented Switch */}
          <div className="flex items-center bg-slate-950/80 p-0.5 rounded-xl border border-slate-700/80 shrink-0">
            <button
              onClick={() => handleTierSwitch('TIER_1')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-black transition-all whitespace-nowrap shrink-0 ${
                activeTier === 'TIER_1'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              🏘️ Tier 1 (6m)
            </button>
            <button
              onClick={() => handleTierSwitch('TIER_2')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-black transition-all whitespace-nowrap shrink-0 ${
                activeTier === 'TIER_2'
                  ? 'bg-blue-500 text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              🏛️ Tier 2 (12m)
            </button>
            <button
              onClick={() => handleTierSwitch('TIER_3')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-black transition-all whitespace-nowrap shrink-0 ${
                activeTier === 'TIER_3'
                  ? 'bg-purple-500 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              🎡 Tier 3 (18m)
            </button>
          </div>

          {/* Building Selector Tabs (Scrollable) */}
          <div className="flex items-center bg-slate-800/90 p-1 rounded-2xl border border-slate-700 overflow-x-auto no-scrollbar gap-1 min-w-0 flex-1">
            {activeTier === 'TIER_1' ? (
              <button
                onClick={() => setActiveModel('AVENUE_8')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-xs transition-all whitespace-nowrap shrink-0 ${
                  activeModel === 'AVENUE_8'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md scale-105'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Building2 size={15} />
                <span>
                  <ruby>並<rt>なら</rt></ruby>べて比較 (8-Lot Avenue)
                </span>
              </button>
            ) : activeTier === 'TIER_2' ? (
              <button
                onClick={() => setActiveModel('BOULEVARD_13')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-xs transition-all whitespace-nowrap shrink-0 ${
                  activeModel === 'BOULEVARD_13'
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md scale-105'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Building2 size={15} />
                <span>
                  <ruby>並<rt>なら</rt></ruby>べて比較 (16-Lot Boulevard)
                </span>
              </button>
            ) : (
              <button
                onClick={() => setActiveModel('ESPLANADE_5')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-xs transition-all whitespace-nowrap shrink-0 ${
                  activeModel === 'ESPLANADE_5'
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md scale-105'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Building2 size={15} />
                <span>
                  <ruby>並<rt>なら</rt></ruby>べて比較 (5-Lot Esplanade)
                </span>
              </button>
            )}

            {/* Individual Building Tabs */}
            {activeTier === 'TIER_1' ? (
              (Object.keys(TIER1_CATALOG) as Array<Exclude<Tier1Model, 'AVENUE_8'>>).map((bKey) => {
                const def = TIER1_CATALOG[bKey];
                const Icon = def.icon;
                const isActive = activeModel === bKey;

                return (
                  <button
                    key={bKey}
                    onClick={() => setActiveModel(bKey)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl font-black text-xs transition-all whitespace-nowrap shrink-0 ${
                      isActive
                        ? `${def.pillBg} text-white shadow-md scale-105`
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <Icon size={14} />
                    <span>{def.rubyName} {def.nameEn}</span>
                  </button>
                );
              })
            ) : activeTier === 'TIER_2' ? (
              (Object.keys(TIER2_CATALOG) as Array<Exclude<Tier2Model, 'BOULEVARD_13'>>).map((bKey) => {
                const def = TIER2_CATALOG[bKey];
                const Icon = def.icon;
                const isActive = activeModel === bKey;

                return (
                  <button
                    key={bKey}
                    onClick={() => setActiveModel(bKey)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl font-black text-xs transition-all whitespace-nowrap shrink-0 ${
                      isActive
                        ? `${def.pillBg} text-white shadow-md scale-105`
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <Icon size={14} />
                    <span>{def.rubyName} {def.nameEn}</span>
                  </button>
                );
              })
            ) : (
              (Object.keys(TIER3_CATALOG) as Array<Exclude<Tier3Model, 'ESPLANADE_5'>>).map((bKey) => {
                const def = TIER3_CATALOG[bKey];
                const Icon = def.icon;
                const isActive = activeModel === bKey;

                return (
                  <button
                    key={bKey}
                    onClick={() => setActiveModel(bKey)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl font-black text-xs transition-all whitespace-nowrap shrink-0 ${
                      isActive
                        ? `${def.pillBg} text-white shadow-md scale-105`
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <Icon size={14} />
                    <span>{def.rubyName} {def.nameEn}</span>
                  </button>
                );
              })
            )}
          </div>

          <span className="hidden xl:inline-block text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 whitespace-nowrap shrink-0">
            {activeModel === 'AVENUE_8' 
              ? '48m Town Block (8U × 1U)' 
              : activeModel === 'BOULEVARD_13'
              ? '192m Civic Boulevard (16U × 2U)'
              : activeModel === 'ESPLANADE_5'
              ? '90m Landmark Esplanade (5U × 3U)'
              : currentDef 
              ? `${currentDef.code} • ${activeTier === 'TIER_1' ? '6m × 6m (1U)' : activeTier === 'TIER_2' ? '12m × 12m (2U)' : '18m × 18m (3U)'}` 
              : 'Inspector'}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 flex-nowrap whitespace-nowrap">
          {/* 1.35m Student Scale Figure Toggle */}
          <button
            onClick={() => setShowScaleFigure(!showScaleFigure)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all shrink-0 whitespace-nowrap ${
              showScaleFigure 
                ? 'bg-emerald-600 border-emerald-400 text-white shadow-md' 
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
            }`}
            title="Toggle 1.35m Elementary Student Scale Mannequin"
          >
            <User size={15} />
            <span className="hidden sm:inline">1.35m Student</span>
          </button>

          <button
            onClick={playVoice}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md transition-all active:scale-95 shrink-0 whitespace-nowrap"
            title="Listen to textbook native pronunciation"
          >
            <Volume2 size={16} />
            <span className="hidden sm:inline">
              {activeModel === 'AVENUE_8' 
                ? '"Welcome to our town!"' 
                : activeModel === 'BOULEVARD_13'
                ? '"Civic Boulevard"'
                : activeModel === 'ESPLANADE_5'
                ? '"Landmark Esplanade"'
                : `"${currentDef?.nameEn.toLowerCase()}"`}
            </span>
          </button>

          {/* Authentic Ambient Japanese Sound Effect */}
          {ambientSoundLabel && (
            <button
              onClick={playAmbientSFX}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs shadow-md transition-all active:scale-95 shrink-0 whitespace-nowrap"
              title="Play authentic Japanese atmospheric sound effect"
            >
              <Sparkles size={15} className="text-yellow-300" />
              <span className="hidden md:inline">{ambientSoundLabel}</span>
            </button>
          )}

          <button
            onClick={() => setShowCardOverlay(!showCardOverlay)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all shrink-0 whitespace-nowrap ${
              showCardOverlay 
                ? 'bg-blue-600 border-blue-400 text-white' 
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            <Layers size={15} />
            <span className="hidden sm:inline">Reference Card</span>
          </button>
        </div>
      </div>

      {/* Palette Swatch Bar (Visible when HOUSE or APARTMENT is active) */}
      {(activeModel === 'HOUSE' || activeModel === 'APARTMENT') && (
        <div className="absolute top-14 left-4 z-20 flex flex-nowrap items-center gap-1.5 p-1.5 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-slate-800 shadow-xl max-w-[92vw] overflow-x-auto no-scrollbar whitespace-nowrap">
          <span className="flex items-center gap-1 text-[11px] font-bold text-slate-300 px-2 shrink-0 whitespace-nowrap">
            <Palette size={13} className="text-amber-400" />
            <span className="hidden sm:inline">Exterior Palette:</span>
          </span>
          {Object.values(HOUSE_PALETTES).map((pal) => (
            <button
              key={pal.id}
              onClick={() => setSelectedHousePalette(pal.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border transition-all shrink-0 whitespace-nowrap ${
                selectedHousePalette === pal.id
                  ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md scale-105'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
              }`}
              title={pal.nameJa}
            >
              <span
                className="w-3 h-3 rounded-full border border-black/30 shadow-inner shrink-0"
                style={{ backgroundColor: '#' + pal.roofTile.toString(16).padStart(6, '0') }}
              />
              <span>{pal.nameEn}</span>
            </button>
          ))}
        </div>
      )}

      {/* Pocket Park 12-Theme Swatch Bar (Visible when EMPTY_LOT is active) */}
      {activeModel === 'EMPTY_LOT' && (
        <div className="absolute top-14 left-4 z-20 flex flex-nowrap items-center gap-1.5 p-1.5 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-slate-800 shadow-xl max-w-[92vw] overflow-x-auto no-scrollbar whitespace-nowrap">
          <span className="flex items-center gap-1 text-[11px] font-bold text-slate-300 px-2 shrink-0 whitespace-nowrap">
            <Trees size={13} className="text-emerald-400" />
            <span className="hidden sm:inline">Park Theme (12):</span>
          </span>
          {Object.values(EMPTY_LOT_THEMES).map((theme) => (
            <button
              key={theme.id}
              onClick={() => setSelectedParkTheme(theme.id as EmptyLotVariant)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border transition-all shrink-0 whitespace-nowrap ${
                selectedParkTheme === theme.id
                  ? 'bg-emerald-400 text-slate-950 border-emerald-300 shadow-md scale-105'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
              }`}
              title={theme.nameJa}
            >
              <span>{theme.icon}</span>
              <span>{theme.nameEn}</span>
            </button>
          ))}
        </div>
      )}

      {/* 3D WebGL Canvas Container */}
      <div ref={containerRef} className="w-full flex-1 touch-none cursor-grab active:cursor-grabbing" />

      {/* Floating Side-by-Side Textbook Reference Card */}
      {showCardOverlay && (
        <div className="absolute top-24 sm:top-20 right-4 z-20 w-64 sm:w-72 bg-slate-900/90 backdrop-blur-md rounded-2xl p-3 border-2 border-amber-400/50 shadow-2xl transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black text-amber-400 flex items-center gap-1">
              <Sparkles size={14} /> Official Textbook Reference
            </span>
            <button 
              onClick={() => setShowCardOverlay(false)}
              className="text-slate-400 hover:text-white text-xs px-1"
            >
              ✕
            </button>
          </div>
          <div className="w-full h-36 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center">
            {currentDef && currentDef.illustWebp && !cardImgFailed ? (
              <img
                src={currentDef.illustWebp}
                alt={currentDef.nameEn}
                className="w-full h-full object-contain p-1"
                onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  if (currentDef.illustPng && !img.src.endsWith(currentDef.illustPng)) {
                    img.src = currentDef.illustPng;
                  } else {
                    setCardImgFailed(true);
                  }
                }}
              />
            ) : currentDef ? (
              <div className={`w-full h-full flex flex-col items-center justify-center bg-gradient-to-br ${currentDef.accentColor} text-white p-3 text-center relative overflow-hidden`}>
                <div className="p-2.5 rounded-2xl bg-black/25 backdrop-blur-sm border border-white/20 mb-1.5 shadow-lg">
                  <CurrentIcon size={32} className="text-white" />
                </div>
                <span className="text-sm font-black tracking-tight leading-tight drop-shadow">{currentDef.nameEn}</span>
                <span className="text-xs font-bold text-white/90 mt-0.5">{currentDef.rubyName}</span>
                <span className="absolute top-2 right-2 text-[9px] font-mono bg-black/30 px-1.5 py-0.5 rounded text-white/80">
                  {currentDef.code}
                </span>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 text-white p-3 text-center">
                <Building2 size={32} className="text-amber-400 mb-1.5" />
                <span className="text-xs font-black">
                  {activeModel === 'AVENUE_8'
                    ? 'Tier 1 Neighborhood Avenue'
                    : activeModel === 'BOULEVARD_13'
                    ? 'Tier 2 Civic Boulevard'
                    : 'Tier 3 Landmark Esplanade'}
                </span>
                <span className="text-[10px] font-bold text-slate-400 mt-0.5">
                  Side-by-Side Architectural Lineup
                </span>
              </div>
            )}
          </div>
          <div className="mt-2 text-[11px] text-slate-300 space-y-0.5 leading-snug">
            {activeModel === 'AVENUE_8' ? (
              <>
                <p className="text-amber-300 font-bold">Grade 5 Unit 19 Town Avenue:</p>
                <p>✓ 8 connected 6m × 6m (1U) buildings</p>
                <p>✓ 48m seamless sidewalk & curb</p>
                <p>✓ Zero-gap lot boundaries & road lines</p>
                <p className="text-emerald-400">✓ 100% Procedural, 0 KB Network Cost</p>
              </>
            ) : activeModel === 'BOULEVARD_13' ? (
              <>
                <p className="text-sky-300 font-bold">Grade 5 & 6 Civic Boulevard:</p>
                <p>✓ 16 connected 12m × 12m (2U) civic facilities</p>
                <p>✓ 192m seamless municipal sidewalk & curb</p>
                <p>✓ Includes Grade 6 Junior High, Depāto & Pool</p>
                <p className="text-emerald-400">✓ 100% Procedural Three.js, 0 KB Download</p>
              </>
            ) : activeModel === 'ESPLANADE_5' ? (
              <>
                <p className="text-purple-300 font-bold">Grade 5 Unit 19 Landmark Esplanade:</p>
                <p>✓ 5 connected 18m × 18m (3U) mega-facilities</p>
                <p>✓ 90m grand landmark promenade & curb</p>
                <p>✓ Floodlights, Ferris Wheel, & Castle Keep</p>
                <p className="text-emerald-400">✓ 100% Procedural Three.js, 0 KB Download</p>
              </>
            ) : currentDef && (
              <>
                <div className="flex items-center justify-between text-amber-300 font-bold mb-1">
                  <span>{currentDef.nameEn} ({currentDef.nameJa})</span>
                  <span className="text-[10px] text-slate-400">{currentDef.code}</span>
                </div>
                {currentDef.features.map((feat, idx) => (
                  <p key={idx}>✓ {feat}</p>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {/* Bottom Floating Control Dock */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex flex-nowrap items-center justify-start sm:justify-center gap-2 px-3 sm:px-4 py-2 rounded-2xl bg-slate-900/85 backdrop-blur-md border border-slate-800 shadow-2xl max-w-[95vw] overflow-x-auto no-scrollbar whitespace-nowrap">
        {/* Camera View Angle Buttons */}
        <div className="flex items-center bg-slate-800/80 p-1 rounded-xl gap-1 shrink-0 flex-nowrap">
          <button
            onClick={() => setCameraView('FRONT')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 whitespace-nowrap ${
              activeAngle === 'FRONT' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'
            }`}
            title="Pedestrian Eye-Level View"
          >
            👁️ Front
          </button>
          <button
            onClick={() => setCameraView('RACER')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 whitespace-nowrap ${
              activeAngle === 'RACER' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'
            }`}
            title="Desk Grand Prix Kart View"
          >
            🏎️ Kart
          </button>
          <button
            onClick={() => setCameraView('ISOMETRIC')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 whitespace-nowrap ${
              activeAngle === 'ISOMETRIC' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'
            }`}
            title="45° Isometric Town View"
          >
            📐 45° Iso
          </button>
          <button
            onClick={() => setCameraView('DETAIL_1')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 whitespace-nowrap ${
              activeAngle === 'DETAIL_1' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'
            }`}
            title={
              activeModel === 'AVENUE_8' 
                ? 'West Block (Shopping & Food)' 
                : activeModel === 'BOULEVARD_13'
                ? 'Civic & Emergency Core'
                : activeModel === 'ESPLANADE_5'
                ? 'Stadium & Zoo'
                : currentDef?.detail1.label
            }
          >
            {activeModel === 'AVENUE_8' 
              ? '🛍️ West Block' 
              : activeModel === 'BOULEVARD_13'
              ? '🏛️ Civic Core'
              : activeModel === 'ESPLANADE_5'
              ? '🏟️ Sports & Zoo'
              : `${currentDef?.detail1.icon || '🔍'} ${currentDef?.detail1.label || 'Detail 1'}`}
          </button>
          <button
            onClick={() => setCameraView('DETAIL_2')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 whitespace-nowrap ${
              activeAngle === 'DETAIL_2' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'
            }`}
            title={
              activeModel === 'AVENUE_8' 
                ? 'East Block (Civic & Living)' 
                : activeModel === 'BOULEVARD_13'
                ? 'Culture & Nature'
                : activeModel === 'ESPLANADE_5'
                ? 'Castle & Theme Park'
                : currentDef?.detail2.label
            }
          >
            {activeModel === 'AVENUE_8' 
              ? '🏡 East Block' 
              : activeModel === 'BOULEVARD_13'
              ? '⛩️ Culture & Nature'
              : activeModel === 'ESPLANADE_5'
              ? '🎡 Castle & Park'
              : `${currentDef?.detail2.icon || '🔍'} ${currentDef?.detail2.label || 'Detail 2'}`}
          </button>
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-slate-700 hidden sm:block shrink-0" />

        {/* Lighting Mode Buttons (4 times of day) */}
        <div className="flex items-center bg-slate-800/80 p-1 rounded-xl gap-1 shrink-0 flex-nowrap">
          <button
            onClick={() => setLightingMode('SUNRISE')}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition-all shrink-0 whitespace-nowrap ${
              lightingMode === 'SUNRISE' ? 'bg-amber-400 text-slate-950 shadow-sm' : 'text-slate-300 hover:text-white'
            }`}
            title="Sunrise (Dawn)"
          >
            <Sunrise size={15} />
            <span className="hidden md:inline">Sunrise</span>
          </button>
          <button
            onClick={() => setLightingMode('NOON')}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition-all shrink-0 whitespace-nowrap ${
              lightingMode === 'NOON' ? 'bg-sky-400 text-slate-950 shadow-sm' : 'text-slate-300 hover:text-white'
            }`}
            title="Noon (Midday Sun)"
          >
            <Sun size={15} />
            <span className="hidden md:inline">Noon</span>
          </button>
          <button
            onClick={() => setLightingMode('SUNSET')}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition-all shrink-0 whitespace-nowrap ${
              lightingMode === 'SUNSET' ? 'bg-orange-500 text-white shadow-sm' : 'text-slate-300 hover:text-white'
            }`}
            title="Sunset (Golden Hour)"
          >
            <Sunset size={15} />
            <span className="hidden md:inline">Sunset</span>
          </button>
          <button
            onClick={() => setLightingMode('MIDNIGHT')}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition-all shrink-0 whitespace-nowrap ${
              lightingMode === 'MIDNIGHT' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
            }`}
            title="Midnight (Night Lanterns)"
          >
            <Moon size={15} />
            <span className="hidden md:inline">Midnight</span>
          </button>
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-slate-700 hidden sm:block shrink-0" />

        {/* Weather Mode Buttons (6 weather presets) */}
        <div className="flex items-center bg-slate-800/80 p-1 rounded-xl gap-1 shrink-0 flex-nowrap">
          {WEATHER_MODE_ORDER.map((wMode) => {
            const wPreset = WEATHER_PRESETS[wMode];
            const isActive = weather === wMode;
            return (
              <button
                key={wMode}
                onClick={() => setWeather(wMode)}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
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
                    : 'text-slate-300 hover:text-white'
                }`}
                title={`${wPreset.labelEn} (${wPreset.labelJa})`}
              >
                {wMode === 'CLEAR' && <Sun size={14} />}
                {(wMode === 'LIGHT_RAIN' || wMode === 'HEAVY_RAIN') && <CloudRain size={14} />}
                {(wMode === 'LIGHT_SNOW' || wMode === 'HEAVY_SNOW') && <CloudSnow size={14} />}
                {wMode === 'SAKURA' && <Flower2 size={14} />}
                <span className="hidden lg:inline">{wPreset.shortLabel}</span>
              </button>
            );
          })}
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-slate-700 hidden sm:block shrink-0" />

        {/* Feature Toggles */}
        <div className="flex items-center gap-1.5 shrink-0 flex-nowrap">
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all shrink-0 whitespace-nowrap ${
              autoRotate 
                ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300' 
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
            }`}
            title="Toggle smooth auto-rotation"
          >
            <RotateCw size={13} className={autoRotate ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Spin</span>
          </button>

          <button
            onClick={() => setShowWireframe(!showWireframe)}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all shrink-0 whitespace-nowrap ${
              showWireframe 
                ? 'bg-purple-600/30 border-purple-500 text-purple-300' 
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
            }`}
            title="Inspect polygon wireframe mesh"
          >
            Wireframe
          </button>

          <button
            onClick={() => setIncludeHedge(!includeHedge)}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all shrink-0 whitespace-nowrap ${
              includeHedge 
                ? 'bg-green-600/30 border-green-500 text-green-300' 
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
            }`}
            title="Toggle trees and greenery"
          >
            🌳 Trees
          </button>
        </div>
      </div>
    </div>
  );
};
