import React from 'react';
import { BodyPartId } from './types';

// Plain hiragana phrasing
export function getJapanesePartPhraseHiragana(partId: BodyPartId, count: number): string {
  switch (partId) {
    case 'eyes':
      return `めが ${count}つ`;
    case 'ears':
      return `みみが ${count}つ`;
    case 'nose':
      return `はなが ${count}つ`;
    case 'mouth':
      return `くちが ${count}つ`;
    case 'arms':
      if (count === 1) return `うでが 1ぽん`;
      if (count === 3) return `うでが 3ぼん`;
      if (count === 6 || count === 8 || count === 10) return `うでが ${count}ぽん`;
      return `うでが ${count}ほん`;
    case 'legs':
      if (count === 1) return `あしが 1ぽん`;
      if (count === 3) return `あしが 3ぼん`;
      if (count === 6 || count === 8 || count === 10) return `あしが ${count}ぽん`;
      return `あしが ${count}ほん`;
    case 'horns':
      if (count === 1) return `つなが 1ぽん`;
      if (count === 3) return `つなが 3ぼん`;
      if (count === 6 || count === 8) return `つなが ${count}ぽん`;
      return `つなが ${count}ほん`;
    case 'wings':
      return `はねが ${count}まい`;
    case 'tails':
      if (count === 1) return `しっぽが 1ぽん`;
      if (count === 3) return `しっぽが 3ぼん`;
      return `しっぽが ${count}ほん`;
    default:
      return `${count}こ`;
  }
}

// Japanese phrasing with MEXT-approved Ruby Furigana
export function getJapanesePartPhraseRuby(partId: BodyPartId, count: number): React.ReactNode {
  switch (partId) {
    case 'eyes':
      return (
        <>
          <ruby>目<rt className="text-[7.5px] font-normal text-slate-500">め</rt></ruby>が {count}つ
        </>
      );
    case 'ears':
      return (
        <>
          <ruby>耳<rt className="text-[7.5px] font-normal text-slate-500">みみ</rt></ruby>が {count}つ
        </>
      );
    case 'nose':
      return (
        <>
          <ruby>鼻<rt className="text-[7.5px] font-normal text-slate-500">はな</rt></ruby>が {count}つ
        </>
      );
    case 'mouth':
      return (
        <>
          <ruby>口<rt className="text-[7.5px] font-normal text-slate-500">くち</rt></ruby>が {count}つ
        </>
      );
    case 'arms':
      if (count === 1) return <>うでが 1ぽん</>;
      if (count === 3) return <>うでが 3ぼん</>;
      if (count === 6 || count === 8 || count === 10) return <>うでが {count}ぽん</>;
      return <>うでが {count}ほん</>;
    case 'legs': {
      const counter = count === 1 ? '1ぽん' : count === 3 ? '3ぼん' : count === 6 || count === 8 || count === 10 ? `${count}ぽん` : `${count}ほん`;
      return (
        <>
          <ruby>足<rt className="text-[7.5px] font-normal text-slate-500">あし</rt></ruby>が {counter}
        </>
      );
    }
    case 'horns':
      return <>つなが {count}ほん</>;
    case 'wings':
      return <>はねが {count}まい</>;
    case 'tails':
      return <>しっぽが {count}ほん</>;
    default:
      return <>{count}こ</>;
  }
}

// Blueprint badge Japanese label (with Ruby)
export function getBlueprintBadgeLabelRuby(partId: BodyPartId, count: number): React.ReactNode {
  switch (partId) {
    case 'eyes':
      return (
        <>
          <ruby>目<rt className="text-[7px] font-normal text-slate-500">め</rt></ruby> {count}つ
        </>
      );
    case 'ears':
      return (
        <>
          <ruby>耳<rt className="text-[7px] font-normal text-slate-500">みみ</rt></ruby> {count}つ
        </>
      );
    case 'nose':
      return (
        <>
          <ruby>鼻<rt className="text-[7px] font-normal text-slate-500">はな</rt></ruby> {count}つ
        </>
      );
    case 'mouth':
      return (
        <>
          <ruby>口<rt className="text-[7px] font-normal text-slate-500">くち</rt></ruby> {count}つ
        </>
      );
    case 'arms':
      if (count === 1) return <>うで 1ぽん</>;
      if (count === 3) return <>うで 3ぼん</>;
      if (count === 6 || count === 8 || count === 10) return <>うで {count}ぽん</>;
      return <>うで {count}ほん</>;
    case 'legs': {
      const counter = count === 1 ? '1ぽん' : count === 3 ? '3ぼん' : count === 6 || count === 8 || count === 10 ? `${count}ぽん` : `${count}ほん`;
      return (
        <>
          <ruby>足<rt className="text-[7px] font-normal text-slate-500">あし</rt></ruby> {counter}
        </>
      );
    }
    case 'horns':
      return <>つの {count}ほん</>;
    case 'wings':
      return <>はね {count}まい</>;
    case 'tails':
      return <>しっぽ {count}ほん</>;
    default:
      return <>{count}こ</>;
  }
}

// Formats a list of React nodes into "A、B、C あります。"
export function formatJapaneseSentenceWithRuby(nodes: React.ReactNode[]): React.ReactNode {
  if (nodes.length === 0) return null;
  if (nodes.length === 1) return <>{nodes[0]} あります。</>;
  if (nodes.length === 2) {
    return (
      <>
        {nodes[0]} と、{nodes[1]} あります。
      </>
    );
  }
  return (
    <>
      {nodes.map((node, i) => (
        <React.Fragment key={i}>
          {node}
          {i < nodes.length - 1 ? '、' : ' あります。'}
        </React.Fragment>
      ))}
    </>
  );
}

export function formatJapanesePartsSentence(phrases: string[]): string {
  if (phrases.length === 0) return '';
  if (phrases.length === 1) return `${phrases[0]} あります。`;
  if (phrases.length === 2) return `${phrases[0]} と、${phrases[1]} あります。`;
  return `${phrases.slice(0, -1).join('、')}、${phrases[phrases.length - 1]} あります。`;
}

export function getCounterUnit(partId: BodyPartId): string {
  switch (partId) {
    case 'eyes':
    case 'ears':
    case 'nose':
    case 'mouth':
      return 'つ';
    case 'arms':
    case 'legs':
    case 'horns':
    case 'tails':
      return 'ほん';
    case 'wings':
      return 'まい';
    default:
      return 'こ';
  }
}

export function formatEnglishList(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}
