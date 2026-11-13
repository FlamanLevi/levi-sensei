import React from 'react';
import { MonsterWorksheetData, WorksheetOrientation, JapaneseNotation, CountMode } from './types';
import { BODY_PARTS_DATA } from './bodyParts';
import {
  getJapanesePartPhraseHiragana,
  getJapanesePartPhraseRuby,
  getBlueprintBadgeLabelRuby,
  getCounterUnit
} from './japaneseHelpers';

interface WorksheetPageProps {
  sheet: MonsterWorksheetData;
  index: number;
  totalSheets: number;
  includeSpeechCard?: boolean;
  orientation?: WorksheetOrientation;
  japaneseNotation?: JapaneseNotation;
  countMode?: CountMode;
}

const CIRCLED_NUMBERS = [
  '①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩',
  '⑪', '⑫', '⑬', '⑭', '⑮', '⑯', '⑰', '⑱', '⑲', '⑳'
];

export const WorksheetPage: React.FC<WorksheetPageProps> = ({
  sheet,
  index,
  totalSheets,
  includeSpeechCard = true,
  orientation = 'landscape',
  japaneseNotation = 'ruby',
  countMode = 'studentChoice'
}) => {
  const { shape, parts, studentNumber, className } = sheet;
  const isLandscape = orientation === 'landscape';
  const useRuby = japaneseNotation === 'ruby';
  const isStudentChoice = countMode === 'studentChoice';

  // Build sequential speech steps: EACH body part gets its own punchy, repetitive sentence!
  const speechSteps: { step: string; en: React.ReactNode; ja: React.ReactNode }[] = [];

  // Step 1: Greeting
  speechSteps.push({
    step: CIRCLED_NUMBERS[speechSteps.length],
    en: '“Hello, everyone!”',
    ja: 'みなさん、こんにちは！'
  });

  // Step 2: Monster Name
  speechSteps.push({
    step: CIRCLED_NUMBERS[speechSteps.length],
    en: (
      <>
        “This is my monster. Its name is{' '}
        <span className="border-b-2 border-slate-700 px-2.5 inline-block font-black text-slate-900">
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
        </span>
        .”
      </>
    ),
    ja: useRuby ? (
      <>
        ぼく・わたしの モンスターです。<ruby>名前<rt className="font-normal">なまえ</rt></ruby>は ＿＿ です。
      </>
    ) : (
      'ぼく・わたしの モンスターです。なまえは ＿＿ です。'
    )
  });

  // Step 3: Body Shape
  speechSteps.push({
    step: CIRCLED_NUMBERS[speechSteps.length],
    en: (
      <>
        “It has {shape.article}{' '}
        <span className="font-black text-indigo-950 underline decoration-amber-400">
          {shape.nameEn.toLowerCase()}
        </span>{' '}
        body.”
      </>
    ),
    ja: useRuby ? (
      <>
        {shape.nameJa} の <ruby>体<rt className="font-normal">からだ</rt></ruby>です。
      </>
    ) : (
      `${shape.nameJa} の からだ です。`
    )
  });

  // Steps for each body part individually: "It has 7 eyes." or "It has [ ___ ] eyes."
  for (const p of parts) {
    if (!isStudentChoice && p.count <= 0) continue;

    let enText: React.ReactNode;
    let jaText: React.ReactNode;

    if (isStudentChoice) {
      const def = BODY_PARTS_DATA[p.partId];
      const singular = def?.nameSingular || p.partId;
      const plural = def?.namePlural || `${p.partId}s`;
      const counter = getCounterUnit(p.partId);
      enText = (
        <>
          “It has{' '}
          <span className="border-b-2 border-slate-700 px-2 inline-block font-black text-slate-900 min-w-[26px] text-center">
            &nbsp;&nbsp;&nbsp;&nbsp;
          </span>{' '}
          <span className="font-black text-indigo-950 underline decoration-amber-400 decoration-1 underline-offset-2">
            {singular} / {plural}
          </span>
          .”
        </>
      );
      jaText = useRuby ? (
        <>
          {p.partId === 'eyes' && <ruby>目<rt className="font-normal">め</rt></ruby>}
          {p.partId === 'ears' && <ruby>耳<rt className="font-normal">みみ</rt></ruby>}
          {p.partId === 'nose' && <ruby>鼻<rt className="font-normal">はな</rt></ruby>}
          {p.partId === 'mouth' && <ruby>口<rt className="font-normal">くち</rt></ruby>}
          {p.partId === 'arms' && 'うで'}
          {p.partId === 'legs' && <ruby>足<rt className="font-normal">あし</rt></ruby>}
          {p.partId === 'horns' && 'つの'}
          {p.partId === 'wings' && 'はね'}
          {p.partId === 'tails' && 'しっぽ'}
          が{' '}
          <span className="border-b border-slate-600 px-1 inline-block font-bold text-slate-900 min-w-[20px] text-center">
            &nbsp;&nbsp;
          </span>{' '}
          {counter} あります。
        </>
      ) : (
        <>
          {p.partId === 'eyes' && 'め'}
          {p.partId === 'ears' && 'みみ'}
          {p.partId === 'nose' && 'はな'}
          {p.partId === 'mouth' && 'くち'}
          {p.partId === 'arms' && 'うで'}
          {p.partId === 'legs' && 'あし'}
          {p.partId === 'horns' && 'つの'}
          {p.partId === 'wings' && 'はね'}
          {p.partId === 'tails' && 'しっぽ'}
          が{' '}
          <span className="border-b border-slate-600 px-1 inline-block font-bold text-slate-900 min-w-[20px] text-center">
            &nbsp;&nbsp;
          </span>{' '}
          {counter} あります。
        </>
      );
    } else {
      enText = `“It has ${p.labelEn}.”`;
      jaText = useRuby
        ? <>{getJapanesePartPhraseRuby(p.partId, p.count)} あります。</>
        : `${getJapanesePartPhraseHiragana(p.partId, p.count)} あります。`;
    }

    speechSteps.push({
      step: CIRCLED_NUMBERS[speechSteps.length] || `${speechSteps.length + 1}.`,
      en: enText,
      ja: jaText
    });
  }

  // Final Step: Closing Thank You
  speechSteps.push({
    step: CIRCLED_NUMBERS[speechSteps.length] || `${speechSteps.length + 1}.`,
    en: '“Thank you!”',
    ja: 'ありがとう ございました！'
  });

  // Helper for blueprint badge Japanese label (Ruby vs Hiragana)
  const getBadgeLabel = (partId: typeof parts[0]['partId'], count: number, labelJa: string) => {
    if (useRuby) {
      return getBlueprintBadgeLabelRuby(partId, count);
    }
    return labelJa
      .replace('目', 'め')
      .replace('耳', 'みみ')
      .replace('鼻', 'はな')
      .replace('口', 'くち')
      .replace('足', 'あし');
  };

  // Helper for badge display (Student Choice vs Pre-filled)
  const renderBadgeContent = (p: typeof parts[0]) => {
    if (isStudentChoice) {
      const def = BODY_PARTS_DATA[p.partId];
      const counter = getCounterUnit(p.partId);
      const capSingular = def?.nameSingular ? def.nameSingular.charAt(0).toUpperCase() + def.nameSingular.slice(1) : p.partId;
      const en = `${capSingular}(s): ___`;
      const ja = useRuby ? (
        <>
          {p.partId === 'eyes' && <ruby>目<rt className="font-normal">め</rt></ruby>}
          {p.partId === 'ears' && <ruby>耳<rt className="font-normal">みみ</rt></ruby>}
          {p.partId === 'nose' && <ruby>鼻<rt className="font-normal">はな</rt></ruby>}
          {p.partId === 'mouth' && <ruby>口<rt className="font-normal">くち</rt></ruby>}
          {p.partId === 'arms' && 'うで'}
          {p.partId === 'legs' && <ruby>足<rt className="font-normal">あし</rt></ruby>}
          {p.partId === 'horns' && 'つの'}
          {p.partId === 'wings' && 'はね'}
          {p.partId === 'tails' && 'しっぽ'}
          : ___ {counter}
        </>
      ) : (
        <>
          {p.partId === 'eyes' && 'め'}
          {p.partId === 'ears' && 'みみ'}
          {p.partId === 'nose' && 'はな'}
          {p.partId === 'mouth' && 'くち'}
          {p.partId === 'arms' && 'うで'}
          {p.partId === 'legs' && 'あし'}
          {p.partId === 'horns' && 'つの'}
          {p.partId === 'wings' && 'はね'}
          {p.partId === 'tails' && 'しっぽ'}
          : ___ {counter}
        </>
      );
      return { en, ja };
    }
    return {
      en: p.labelEn,
      ja: getBadgeLabel(p.partId, p.count, p.labelJa)
    };
  };

  // For portrait 2-column split of speech steps
  const halfSpeech = Math.ceil(speechSteps.length / 2);
  const portraitCol1 = speechSteps.slice(0, halfSpeech);
  const portraitCol2 = speechSteps.slice(halfSpeech);

  // =========================================================================
  // LANDSCAPE LAYOUT (A4 Horizontal: 297mm x 210mm)
  // Left 29%: Blueprint + Full Sequential Speech (1 sentence per part) | Right 71%: Giant Canvas
  // =========================================================================
  if (isLandscape) {
    return (
      <div
        className="worksheet-a4-page landscape bg-white text-slate-900 border-2 border-slate-300 print:border-none shadow-md print:shadow-none p-4 print:p-0 flex flex-col justify-between mx-auto box-border"
        style={{
          fontFamily:
            "'UD Digi Kyokasho NP-R', 'UD Digi Kyokasho NK-R', 'UD Digi Kyokasho N-R', 'BIZ UDPGothic', 'Zen Maru Gothic', sans-serif",
          width: '297mm',
          height: '210mm',
          maxHeight: '210mm',
          pageBreakAfter: 'always',
          breakAfter: 'page',
          breakInside: 'avoid'
        }}
      >
        {/* Landscape Header Bar (~15mm) */}
        <div className="border-b-2 border-slate-800 pb-1 flex items-start justify-between gap-4 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl print:text-lg">👾</span>
              <h1 className="text-lg sm:text-xl print:text-lg font-black tracking-tight text-slate-900 leading-tight">
                Monster Lab & Speech
              </h1>
            </div>
            <p className="text-[10px] sm:text-[11px] print:text-[10px] font-bold text-slate-700">
              {useRuby ? (
                <>
                  <ruby>自分<rt className="font-normal">じぶん</rt></ruby>だけの モンスターを <ruby>描<rt className="font-normal">か</rt></ruby>いて、<ruby>英語<rt className="font-normal">えいご</rt></ruby>で <ruby>発表<rt className="font-normal">はっぴょう</rt></ruby>しよう！
                </>
              ) : (
                'じぶんだけの モンスターを かいて、えいごで はっぴょうしよう！'
              )}
            </p>
          </div>

          {/* Student Info Table */}
          <div className="border-2 border-slate-800 rounded-lg p-1.5 text-xs font-black min-w-[240px] shrink-0 bg-slate-50 print:bg-transparent">
            <div className="grid grid-cols-2 gap-2 border-b border-slate-300 pb-0.5 mb-0.5">
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-slate-600 font-bold">くみ:</span>
                <span className="font-black text-slate-900 text-xs">
                  {className || '____ 年 ____ 組'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-slate-600 font-bold">ばんごう:</span>
                <span className="font-black text-slate-900 text-xs">
                  {studentNumber > 0 ? `${studentNumber} 番` : '_____ 番'}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1 flex-1">
                <span className="text-[10px] text-slate-600 font-bold">なまえ:</span>
                <div className="border-b border-dotted border-slate-700 flex-1 h-3.5"></div>
              </div>
              <div className="text-[9px] text-slate-400 font-normal shrink-0">
                #{index + 1}/{totalSheets}
              </div>
            </div>
          </div>
        </div>

        {/* Landscape Main Body Split: Left 29% (Blueprint + Speech), Right 71% (Giant Canvas) */}
        <div className="flex-1 flex gap-3 mt-1.5 min-h-0 overflow-hidden">
          {/* LEFT SIDEBAR (~29% width, ~82mm) */}
          <div className="w-[29%] flex flex-col justify-between gap-1 min-h-0">
            {/* 1. Blueprint Checklist (~48mm) */}
            <div className="border-2 border-slate-800 rounded-xl p-1.5 bg-slate-50/70 print:bg-transparent shrink-0">
              <div className="flex items-center justify-between border-b border-slate-300 pb-0.5 mb-1">
                <span className="text-xs font-black bg-slate-800 text-white px-1.5 py-0.2 rounded text-[9.5px] uppercase">
                  {isStudentChoice ? (
                    useRuby ? (
                      <>📋 <ruby>自分<rt className="font-normal">じぶん</rt></ruby>の <ruby>設計図<rt className="font-normal">せっけいず</rt></ruby></>
                    ) : (
                      '📋 じぶんの せっけいず'
                    )
                  ) : (
                    useRuby ? (
                      <>📋 <ruby>設計図<rt className="font-normal">せっけいず</rt></ruby></>
                    ) : (
                      '📋 せっけいず'
                    )
                  )}
                </span>
                <span className="bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.2 rounded font-black text-[10px]">
                  {shape.icon} {shape.nameEn} ({shape.nameJa})
                </span>
              </div>
              <div className="text-[9px] font-bold text-slate-700 italic mb-1 text-center truncate">
                🗣️ &ldquo;It has {shape.article} {shape.nameEn.toLowerCase()} body.&rdquo;
              </div>

              {/* 3 rows of 2 columns */}
              <div className="grid grid-cols-2 gap-1">
                {parts.map((p) => {
                  const badge = renderBadgeContent(p);
                  return (
                    <div
                      key={p.partId}
                      className="border border-slate-700 rounded-md p-1 flex items-center gap-1 bg-white shadow-xs print:shadow-none min-w-0"
                    >
                      <div className="w-3.5 h-3.5 border-2 border-slate-800 rounded-xs flex items-center justify-center shrink-0"></div>
                      <span className="text-xs leading-none shrink-0">{p.icon}</span>
                      <div className="min-w-0 leading-tight">
                        <div className="text-[9.5px] sm:text-[10px] font-black text-slate-900 truncate">
                          {badge.en}
                        </div>
                        <div className="text-[8px] text-slate-600 font-bold truncate">
                          {badge.ja}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. Monster Speech Studio (~115mm): Every body part is its own clean sentence! */}
            {includeSpeechCard && (
              <div className="flex-1 border-2 border-slate-800 rounded-xl p-1.5 bg-amber-50/40 print:bg-transparent flex flex-col justify-between shrink-0 min-h-0">
                <div className="flex items-center justify-between border-b border-amber-300 pb-0.5 mb-1 shrink-0">
                  <span className="text-[9.5px] font-black bg-amber-500 text-slate-950 px-1.5 py-0.2 rounded uppercase tracking-wide flex items-center gap-1">
                    🎙️ はっぴょう / SPEECH
                  </span>
                  <span className="text-[8px] text-slate-600 font-bold">
                    {isStudentChoice ? 'かずをかいて、ことばに〇をつけよう！' : 'えを みせて いおう！'}
                  </span>
                </div>

                {/* Vertical Stack of Individual Sentences - Zero Truncation! */}
                <div className="flex-1 flex flex-col justify-between gap-0.5 min-h-0 overflow-hidden">
                  {speechSteps.map((s) => (
                    <div
                      key={s.step}
                      className="bg-white/80 print:bg-transparent border border-amber-200/90 rounded-md px-1.5 py-0.5 flex items-start gap-1.5 shadow-xs print:shadow-none leading-tight min-h-0"
                    >
                      <span className="font-black text-amber-700 text-[10.5px] shrink-0 mt-0.5">
                        {s.step}
                      </span>
                      <div className="min-w-0 flex-1 leading-snug">
                        <div className="font-black text-slate-900 text-[10px] sm:text-[10.5px] print:text-[9.5px] break-words">
                          {s.en}
                        </div>
                        <div className="text-[8px] sm:text-[8.5px] print:text-[8px] font-bold text-slate-600 break-words">
                          {s.ja}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Self-Evaluation Rating Footer */}
                <div className="mt-1 pt-0.5 border-t border-amber-300/60 flex items-center justify-between text-[8px] font-bold text-slate-600 shrink-0">
                  <span>⭐ じこひょうか: □ おおきなこえ  □ えをみせた</span>
                  <span className="text-amber-500 font-normal">☆☆☆</span>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT CANVAS (~71% width, ~200mm): GIANT DRAWING CANVAS */}
          <div className="w-[71%] border-2 border-dashed border-slate-600 rounded-2xl flex flex-col items-center justify-between p-3 relative bg-white overflow-hidden min-h-0">
            <div className="w-full flex items-center justify-between text-[11px] font-bold text-slate-500 z-10 shrink-0">
              {useRuby ? (
                <span>👇 この<ruby>形<rt className="font-normal">かたち</rt></ruby>をからだにして、<ruby>目<rt className="font-normal">め</rt></ruby>・<ruby>口<rt className="font-normal">くち</rt></ruby>・うで・<ruby>足<rt className="font-normal">あし</rt></ruby>などを<ruby>描<rt className="font-normal">か</rt></ruby>こう！</span>
              ) : (
                <span>👇 この かたち を からだにして、め・くち・うで・あし などを かこう！</span>
              )}
              <span className="text-[10px] text-slate-400">
                {useRuby ? (
                  <>※ まわりや<ruby>中<rt className="font-normal">なか</rt></ruby>に<ruby>自由<rt className="font-normal">じゆう</rt></ruby>に<ruby>描<rt className="font-normal">か</rt></ruby>いてOK！</>
                ) : (
                  '※ まわりや なかに じゆうに かいてOK！'
                )}
              </span>
            </div>

            {/* Shape Outline with 50mm+ margin on all sides for limbs, wings, tails */}
            <div className="w-full flex-1 flex items-center justify-center p-2 relative min-h-0">
              {shape.renderSvg({
                className: 'w-full h-full max-h-[92mm] max-w-[102mm]',
                strokeWidth: 4,
                strokeColor: '#0f172a'
              })}
            </div>

            <div className="w-full text-center text-[10px] text-slate-400 font-medium z-10 shrink-0">
              {useRuby ? (
                <>★ <ruby>色鉛筆<rt className="font-normal">いろえんぴつ</rt></ruby>やクレヨンで<ruby>色<rt className="font-normal">いろ</rt></ruby>をぬって、かっこいいモンスターを<ruby>完成<rt className="font-normal">かんせい</rt></ruby>させよう！</>
              ) : (
                '★ いろえんぴつ や クレヨン で いろ を ぬって、かっこいい モンスター を かんせい させよう！'
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // PORTRAIT LAYOUT (A4 Vertical: 210mm x 297mm)
  // Higher blueprint, expanded drawing canvas (~145mm), 2-column speech box at bottom!
  // =========================================================================
  return (
    <div
      className="worksheet-a4-page portrait bg-white text-slate-900 border-2 border-slate-300 print:border-none shadow-md print:shadow-none p-4 sm:p-5 print:p-0 flex flex-col justify-between mx-auto box-border"
      style={{
        fontFamily:
          "'UD Digi Kyokasho NP-R', 'UD Digi Kyokasho NK-R', 'UD Digi Kyokasho N-R', 'BIZ UDPGothic', 'Zen Maru Gothic', sans-serif",
        width: '210mm',
        height: '297mm',
        maxHeight: '297mm',
        pageBreakAfter: 'always',
        breakAfter: 'page',
        breakInside: 'avoid'
      }}
    >
      {/* 1. Header Section (~18mm) */}
      <div className="border-b-2 border-slate-800 pb-1 flex items-start justify-between gap-4 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl print:text-lg">👾</span>
            <h1 className="text-lg sm:text-xl print:text-lg font-black tracking-tight text-slate-900 leading-tight">
              Monster Lab & Speech
            </h1>
          </div>
          <p className="text-[11px] sm:text-xs print:text-[10px] font-bold text-slate-700 mt-0.5">
            {useRuby ? (
              <>
                <ruby>自分<rt className="font-normal">じぶん</rt></ruby>だけの モンスターを <ruby>描<rt className="font-normal">か</rt></ruby>いて、<ruby>英語<rt className="font-normal">えいご</rt></ruby>で <ruby>発表<rt className="font-normal">はっぴょう</rt></ruby>しよう！
              </>
            ) : (
              'じぶんだけの モンスターを かいて、えいごで はっぴょうしよう！'
            )}
          </p>
        </div>

        {/* Student Name & Class Fill Box */}
        <div className="border-2 border-slate-800 rounded-lg p-1.5 text-xs font-black min-w-[210px] shrink-0 bg-slate-50 print:bg-transparent">
          <div className="grid grid-cols-2 gap-1.5 border-b border-slate-300 pb-0.5 mb-0.5">
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-slate-600 font-bold">くみ:</span>
              <span className="font-black text-slate-900 text-xs">
                {className || '____ 年 ____ 組'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-slate-600 font-bold">ばんごう:</span>
              <span className="font-black text-slate-900 text-xs">
                {studentNumber > 0 ? `${studentNumber} 番` : '_____ 番'}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 flex-1">
              <span className="text-[10px] text-slate-600 font-bold">なまえ:</span>
              <div className="border-b border-dotted border-slate-700 flex-1 h-3.5"></div>
            </div>
            <div className="text-[9px] text-slate-400 font-normal shrink-0">
              #{index + 1}/{totalSheets}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Blueprint Checklist Moved Up (~34mm) */}
      <div className="border-2 border-slate-800 rounded-xl p-1.5 sm:p-2 my-1 bg-slate-50/70 print:bg-transparent shrink-0">
        <div className="flex items-center justify-between border-b border-slate-300 pb-0.5 mb-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black bg-slate-800 text-white px-2 py-0.2 rounded text-[10px] uppercase">
              {isStudentChoice ? (
                useRuby ? (
                  <>📋 <ruby>自分<rt className="font-normal">じぶん</rt></ruby>の <ruby>設計図<rt className="font-normal">せっけいず</rt></ruby> / My Blueprint</>
                ) : (
                  '📋 じぶんの せっけいず / My Blueprint'
                )
              ) : (
                useRuby ? (
                  <>📋 <ruby>設計図<rt className="font-normal">せっけいず</rt></ruby> / Blueprint</>
                ) : (
                  '📋 せっけいず / Blueprint'
                )
              )}
            </span>
            <div className="flex items-center gap-1 text-[11px] font-black text-slate-800">
              <span>{useRuby ? <>からだの<ruby>形<rt className="font-normal">かたち</rt></ruby>:</> : 'からだの かたち:'}</span>
              <span className="bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.2 rounded font-black text-xs">
                {shape.icon} {shape.nameEn} ({shape.nameJa})
              </span>
            </div>
          </div>
          <div className="text-xs font-bold text-slate-700 italic">
            🗣️ &ldquo;It has {shape.article} {shape.nameEn.toLowerCase()} body.&rdquo;
          </div>
        </div>

        {/* 2 rows of 3 columns so NO truncation */}
        <div className="grid grid-cols-3 gap-1.5">
          {parts.map((p) => {
            const badge = renderBadgeContent(p);
            return (
              <div
                key={p.partId}
                className="border border-slate-700 rounded-md p-1 flex items-center gap-1.5 bg-white shadow-xs print:shadow-none min-w-0"
              >
                <div className="w-4 h-4 border-2 border-slate-800 rounded-xs flex items-center justify-center shrink-0"></div>
                <span className="text-base leading-none shrink-0">{p.icon}</span>
                <div className="min-w-0 leading-tight">
                  <div className="text-[11px] font-black text-slate-900 whitespace-nowrap">
                    {badge.en}
                  </div>
                  <div className="text-[9px] text-slate-600 font-bold whitespace-nowrap">
                    {badge.ja}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. EXPANDED Drawing Canvas (~145mm height) with Shrunk Shape for Ample Limb Room! */}
      <div className="border-2 border-dashed border-slate-600 rounded-2xl flex-1 min-h-[140mm] max-h-[148mm] flex flex-col items-center justify-between p-3 relative bg-white overflow-hidden my-1 shrink-0">
        <div className="w-full flex items-center justify-between text-[11px] font-bold text-slate-500 z-10 shrink-0">
          {useRuby ? (
            <span>👇 この<ruby>形<rt className="font-normal">かたち</rt></ruby>をからだにして、<ruby>目<rt className="font-normal">め</rt></ruby>・<ruby>口<rt className="font-normal">くち</rt></ruby>・うで・<ruby>足<rt className="font-normal">あし</rt></ruby>などを<ruby>描<rt className="font-normal">か</rt></ruby>こう！</span>
          ) : (
            <span>👇 この かたち を からだにして、め・くち・うで・あし などを かこう！</span>
          )}
          <span className="text-[10px] text-slate-400">
            {useRuby ? (
              <>※ まわりや<ruby>中<rt className="font-normal">なか</rt></ruby>に<ruby>自由<rt className="font-normal">じゆう</rt></ruby>に<ruby>描<rt className="font-normal">か</rt></ruby>いてOK！</>
            ) : (
              '※ まわりや なかに じゆうに かいてOK！'
            )}
          </span>
        </div>

        {/* Shrunk Shape to ~75mm height inside 145mm canvas leaves generous 35mm+ space for arms/legs */}
        <div className="w-full flex-1 flex items-center justify-center p-2 relative min-h-0">
          {shape.renderSvg({
            className: 'w-full h-full max-h-[75mm] max-w-[85mm]',
            strokeWidth: 4,
            strokeColor: '#0f172a'
          })}
        </div>

        <div className="w-full text-center text-[10px] text-slate-400 font-medium z-10 shrink-0">
          {useRuby ? (
            <>★ <ruby>色鉛筆<rt className="font-normal">いろえんぴつ</rt></ruby>やクレヨンで<ruby>色<rt className="font-normal">いろ</rt></ruby>をぬって、かっこいいモンスターを<ruby>完成<rt className="font-normal">かんせい</rt></ruby>させよう！</>
          ) : (
            '★ いろえんぴつ や クレヨン で いろ を ぬって、かっこいい モンスター を かんせい させよう！'
          )}
        </div>
      </div>

      {/* 4. Speech Presentation Box Across Bottom (~54mm) in 2 Balanced Columns */}
      {includeSpeechCard && (
        <div className="border-2 border-slate-800 rounded-xl p-2 sm:p-2.5 mt-1 bg-amber-50/40 print:bg-transparent shrink-0">
          <div className="flex items-center justify-between border-b border-amber-300 pb-1 mb-1.5 shrink-0">
            <span className="text-xs font-black bg-amber-500 text-slate-950 px-2 py-0.5 rounded text-[11px] uppercase tracking-wide flex items-center gap-1">
              🎙️ はっぴょうしよう！ / MONSTER SPEECH
            </span>
            <span className="text-[10px] text-slate-600 font-bold">
              {isStudentChoice ? (
                useRuby ? (
                  <><ruby>数<rt className="font-normal">かず</rt></ruby>を<ruby>書<rt className="font-normal">か</rt></ruby>いて、ことばに〇をつけよう！</>
                ) : (
                  'かずを かいて、ことばに 〇を つけよう！'
                )
              ) : (
                useRuby ? (
                  <><ruby>絵<rt className="font-normal">え</rt></ruby>を<ruby>見<rt className="font-normal">み</rt></ruby>せながら、<ruby>順番<rt className="font-normal">じゅんばん</rt></ruby>に<ruby>英語<rt className="font-normal">えいご</rt></ruby>で<ruby>言<rt className="font-normal">い</rt></ruby>ってみよう！</>
                ) : (
                  'えを みせながら、じゅんばんに えいごで いってみよう！'
                )
              )}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
            {/* Left Column */}
            <div className="space-y-1">
              {portraitCol1.map((s) => (
                <div key={s.step} className="flex items-start gap-1.5 min-w-0">
                  <span className="font-black text-amber-700 text-xs shrink-0 mt-0.5">
                    {s.step}
                  </span>
                  <div className="leading-snug min-w-0 flex-1">
                    <div className="font-black text-slate-900 text-xs sm:text-[12px] print:text-[10.5px] break-words">
                      {s.en}
                    </div>
                    <div className="text-[9px] sm:text-[10px] print:text-[9px] font-bold text-slate-600 mt-0.5 break-words">
                      {s.ja}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Right Column */}
            <div className="space-y-1">
              {portraitCol2.map((s) => (
                <div key={s.step} className="flex items-start gap-1.5 min-w-0">
                  <span className="font-black text-amber-700 text-xs shrink-0 mt-0.5">
                    {s.step}
                  </span>
                  <div className="leading-snug min-w-0 flex-1">
                    <div className="font-black text-slate-900 text-xs sm:text-[12px] print:text-[10.5px] break-words">
                      {s.en}
                    </div>
                    <div className="text-[9px] sm:text-[10px] print:text-[9px] font-bold text-slate-600 mt-0.5 break-words">
                      {s.ja}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
