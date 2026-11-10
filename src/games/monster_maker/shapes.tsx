import React from 'react';
import { ShapeDefinition, ShapeId } from './types';

export const SHAPES_DATA: Record<ShapeId, ShapeDefinition> = {
  circle: {
    id: 'circle',
    nameEn: 'Circle',
    nameJa: 'まる',
    furigana: 'まる',
    article: 'a',
    icon: '⭕',
    renderSvg: ({ className = 'w-full h-full', strokeWidth = 4, strokeColor = '#0f172a' } = {}) => (
      <svg viewBox="0 0 400 320" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle
          cx="200"
          cy="160"
          r="125"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
      </svg>
    )
  },
  triangle: {
    id: 'triangle',
    nameEn: 'Triangle',
    nameJa: 'さんかく',
    furigana: 'さんかく',
    article: 'a',
    icon: '🔺',
    renderSvg: ({ className = 'w-full h-full', strokeWidth = 4, strokeColor = '#0f172a' } = {}) => (
      <svg viewBox="0 0 400 320" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <polygon
          points="200,32 345,285 55,285"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    )
  },
  square: {
    id: 'square',
    nameEn: 'Square',
    nameJa: 'しかく',
    furigana: 'しかく',
    article: 'a',
    icon: '⏹️',
    renderSvg: ({ className = 'w-full h-full', strokeWidth = 4, strokeColor = '#0f172a' } = {}) => (
      <svg viewBox="0 0 400 320" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect
          x="80"
          y="40"
          width="240"
          height="240"
          rx="18"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    )
  },
  rectangle: {
    id: 'rectangle',
    nameEn: 'Rectangle',
    nameJa: 'ながしかく',
    furigana: 'ながしかく',
    article: 'a',
    icon: '▭',
    renderSvg: ({ className = 'w-full h-full', strokeWidth = 4, strokeColor = '#0f172a' } = {}) => (
      <svg viewBox="0 0 400 320" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect
          x="45"
          y="65"
          width="310"
          height="190"
          rx="18"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    )
  },
  star: {
    id: 'star',
    nameEn: 'Star',
    nameJa: 'ほし',
    furigana: 'ほし',
    article: 'a',
    icon: '⭐',
    renderSvg: ({ className = 'w-full h-full', strokeWidth = 4, strokeColor = '#0f172a' } = {}) => (
      <svg viewBox="0 0 400 320" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <polygon
          points="200,25 238,122 342,125 260,188 290,290 200,230 110,290 140,188 58,125 162,122"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    )
  },
  heart: {
    id: 'heart',
    nameEn: 'Heart',
    nameJa: 'ハート',
    furigana: 'ハート',
    article: 'a',
    icon: '❤️',
    renderSvg: ({ className = 'w-full h-full', strokeWidth = 4, strokeColor = '#0f172a' } = {}) => (
      <svg viewBox="0 0 400 320" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M 200,285 C 130,225 60,165 60,105 C 60,55 100,25 145,25 C 175,25 195,45 200,55 C 205,45 225,25 255,25 C 300,25 340,55 340,105 C 340,165 270,225 200,285 Z"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    )
  },
  diamond: {
    id: 'diamond',
    nameEn: 'Diamond',
    nameJa: 'ダイヤ',
    furigana: 'ダイヤ',
    article: 'a',
    icon: '💎',
    renderSvg: ({ className = 'w-full h-full', strokeWidth = 4, strokeColor = '#0f172a' } = {}) => (
      <svg viewBox="0 0 400 320" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <polygon
          points="200,25 345,160 200,295 55,160"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    )
  },
  oval: {
    id: 'oval',
    nameEn: 'Oval',
    nameJa: 'たまごがた',
    furigana: 'たまごがた',
    article: 'an',
    icon: '🥚',
    renderSvg: ({ className = 'w-full h-full', strokeWidth = 4, strokeColor = '#0f172a' } = {}) => (
      <svg viewBox="0 0 400 320" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <ellipse
          cx="200"
          cy="160"
          rx="155"
          ry="110"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
      </svg>
    )
  }
};

export const ALL_SHAPE_IDS: ShapeId[] = [
  'circle',
  'triangle',
  'square',
  'rectangle',
  'star',
  'heart',
  'diamond',
  'oval'
];
