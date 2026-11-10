/**
 * Dream Town Architects (ドリームタウン・アーキテクト)
 * Core TypeScript definitions for the 2:1 isometric town building and pair-work engine.
 */

export type TownGameMode =
  | 'BLUEPRINT_INFO_GAP' // Mode 1: Preposition & building location pair-work ("Where is the bakery?")
  | 'TOWN_NAVIGATOR'     // Mode 2: Turn-by-turn navigation ("Go straight, turn left at the fountain")
  | 'FREE_COOP_BUILDER'; // Mode 3: Creative dream town building & showcase ("Welcome to our town!")

export type ArchitectRole =
  | 'architect_a'  // Asks questions, places buildings on incomplete map
  | 'architect_b'  // Holds master blueprint, speaks preposition/location clues
  | 'solo_builder'; // Free-play / whole-class single mode

export type NavigatorRole =
  | 'traveler' // Moves the cart following spoken English directions (goal hidden in challenge mode)
  | 'guide';   // Sees the glowing treasure destination and speaks directions aloud

export interface TileMeta {
  id: string;
  label: string;
  category: 'building' | 'road' | 'decoration' | 'terrain' | 'biome' | 'landmark';
  doc?: string;
  jaLabel?: string;
  jaFurigana?: string;
  icon?: string;
  isAnimated?: boolean;
}

export interface CuratedTile {
  id: string;
  en: string;
  ja: string;
  furigana: string;
  icon: string;
  category: 'building' | 'road' | 'nature' | 'landmark';
  defaultDoc: string;
}

export interface MissingBlueprintTarget {
  id: string;
  tileId: string;
  nameEn: string;
  nameJa: string;
  nameFurigana: string;
  icon: string;
  row: number;
  col: number;
  clueEn: string;
  clueJa: string;
  clueFurigana?: string;
  preposition: string;
  placed: boolean;
}

export interface LandmarkLabel {
  row: number;
  col: number;
  en: string;
  ja: string;
  icon: string;
}

export interface NavigatorMission {
  id: string;
  nameEn: string;
  nameJa: string;
  icon: string;
  startRow: number;
  startCol: number;
  targetRow: number;
  targetCol: number;
  hintEn: string;
  hintJa: string;
}

export interface TownTilesData {
  tiles: TileMeta[];
  presets: Record<string, string[][]>;
  sprites: Record<string, string>;
  animatedSprites: Record<string, string[]>;
  entitySprites: Record<string, [string, number, number, number, number]>;
}

export interface TravelerState {
  row: number;
  col: number;
  dir: 'N' | 'S' | 'E' | 'W';
  targetRow: number;
  targetCol: number;
  reached: boolean;
}
