import React from 'react';

export type ShapeId =
  | 'circle'
  | 'triangle'
  | 'square'
  | 'rectangle'
  | 'star'
  | 'heart'
  | 'diamond'
  | 'oval';

export type BodyPartId =
  | 'eyes'
  | 'ears'
  | 'nose'
  | 'mouth'
  | 'arms'
  | 'legs'
  | 'horns'
  | 'wings'
  | 'tails';

export interface ShapeDefinition {
  id: ShapeId;
  nameEn: string;
  nameJa: string;
  furigana: string;
  article: 'a' | 'an';
  icon: string;
  renderSvg: (props?: { className?: string; strokeWidth?: number; strokeColor?: string }) => React.ReactNode;
}

export interface BodyPartDefinition {
  id: BodyPartId;
  nameSingular: string;
  namePlural: string;
  jaName: string;
  jaCounter: string;
  icon: string;
  min: number;
  max: number;
  isCore: boolean;
  evenPreferred?: boolean;
}

export interface MonsterPartRequirement {
  partId: BodyPartId;
  count: number;
  labelEn: string;
  labelJa: string;
  icon: string;
}

export interface MonsterWorksheetData {
  id: string;
  studentNumber: number;
  className: string;
  shape: ShapeDefinition;
  parts: MonsterPartRequirement[];
  monsterName?: string;
}

export type WorksheetOrientation = 'portrait' | 'landscape';
export type JapaneseNotation = 'ruby' | 'hiragana';
export type CountMode = 'studentChoice' | 'random';

export interface GeneratorOptions {
  studentCount: number;
  className: string;
  autoNumberAttendance: boolean;
  startAttendanceNumber: number;
  evenArmsLegs: boolean;
  countMode?: CountMode;
  enabledShapes: ShapeId[];
  enabledBodyParts: BodyPartId[];
  includeSpeechCard: boolean;
  orientation?: WorksheetOrientation;
  japaneseNotation?: JapaneseNotation;
}
