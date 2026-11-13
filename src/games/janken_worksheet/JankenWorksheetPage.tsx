import React from 'react';
import {
  JankenCardData,
  JankenGeneratorOptions,
  JankenPageData,
  PrintInkTheme
} from './types';
import { DIALOGUE_PRESETS, renderRubySegments } from './presets';
import {
  PaperHandSvg,
  RockHandSvg,
  ScissorsHandSvg,
  StarburstRoundBadge
} from './handIcons';
import { getEffectiveRoundsPerCard } from './generator';

interface JankenWorksheetPageProps {
  page: JankenPageData;
  totalPages: number;
  totalCards: number;
  options: JankenGeneratorOptions;
  isLastPage: boolean;
}

const MEXT_FONT =
  "'UD Digi Kyokasho NP-R', 'UD Digi Kyokasho NK-R', 'UD Digi Kyokasho N-R', 'BIZ UDPGothic', 'Zen Maru Gothic', sans-serif";

const NUMBERS_1_TO_10 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

interface RoundGridProps {
  roundNumber: number;
  hiraganaOnly: boolean;
  inkTheme: PrintInkTheme;
  showTallyBox: boolean;
  showHowManyCue: boolean;
  compact?: boolean;
  sideTally?: boolean;
  badgeSizeClass?: string;
  cellTextClass?: string;
  gridMinHeightClass?: string;
}

const RoundGridBlock: React.FC<RoundGridProps> = ({
  roundNumber,
  hiraganaOnly,
  inkTheme,
  showTallyBox,
  showHowManyCue,
  compact = false,
  sideTally = false,
  badgeSizeClass = 'w-14 h-14',
  cellTextClass = 'text-sm',
  gridMinHeightClass = 'min-h-0'
}) => {
  const isBw = inkTheme === 'bw';
  const gridBorderColor = isBw ? 'border-slate-900' : 'border-sky-500';
  const cellDividerColor = isBw ? 'border-slate-800' : 'border-sky-400';

  const tallyItems = [
    {
      symbol: '◯',
      label: hiraganaOnly ? 'かった' : 'かった',
      en: 'Win',
      colorClass: isBw ? 'text-slate-900 border-slate-800 bg-white' : 'text-rose-600 border-rose-300 bg-rose-50/70 print:bg-rose-50/50'
    },
    {
      symbol: '△',
      label: 'あいこ',
      en: 'Tie',
      colorClass: isBw ? 'text-slate-900 border-slate-800 bg-white' : 'text-amber-600 border-amber-300 bg-amber-50/70 print:bg-amber-50/50'
    },
    {
      symbol: '×',
      label: 'まけた',
      en: 'Lose',
      colorClass: isBw ? 'text-slate-900 border-slate-800 bg-white' : 'text-sky-700 border-sky-300 bg-sky-50/70 print:bg-sky-50/50'
    }
  ];

  const renderGridTable = () => (
    <div
      className={`grid grid-cols-5 grid-rows-2 border-2 rounded-sm bg-white flex-1 h-full ${gridBorderColor} ${gridMinHeightClass}`}
    >
      {NUMBERS_1_TO_10.map((num, idx) => {
        const hasRight = idx % 5 !== 4;
        const hasBottom = idx < 5;
        return (
          <div
            key={num}
            className={`relative flex flex-col justify-between p-1 bg-white ${
              hasRight ? `border-r-[1.5px] ${cellDividerColor}` : ''
            } ${hasBottom ? `border-b-[1.5px] ${cellDividerColor}` : ''}`}
          >
            <span
              className={`font-black leading-none text-slate-900 select-none ${cellTextClass}`}
            >
              {num}
            </span>
          </div>
        );
      })}
    </div>
  );

  if (sideTally) {
    return (
      <div className="flex items-stretch gap-3 h-full min-h-0">
        {/* Left Starburst */}
        <div className="flex items-center justify-center shrink-0">
          <StarburstRoundBadge
            roundNumber={roundNumber}
            hiraganaOnly={hiraganaOnly}
            inkTheme={inkTheme}
            className={badgeSizeClass}
          />
        </div>

        {/* Center 5x2 Grid */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          {renderGridTable()}
        </div>

        {/* Right Side Tally Panel */}
        {showTallyBox && (
          <div
            className={`w-44 shrink-0 rounded-xl border-2 p-2 flex flex-col justify-between ${
              isBw ? 'border-slate-900 bg-white' : 'border-slate-300 bg-slate-50/80'
            }`}
          >
            <div className="text-[10px] font-black text-slate-700 flex items-center justify-between border-b border-slate-200 pb-0.5">
              <span>{hiraganaOnly ? 'けっか・かず' : <><ruby>結果<rt className="font-normal">けっか</rt></ruby>・<ruby>数<rt className="font-normal">かず</rt></ruby></>}</span>
              {showHowManyCue && (
                <span className="text-[9px] text-sky-700 font-black">How many?</span>
              )}
            </div>
            <div className="flex flex-col gap-1.5 flex-1 justify-center">
              {tallyItems.map((item) => (
                <div
                  key={item.symbol}
                  className={`flex items-center justify-between gap-1.5 px-2 py-1 rounded-lg border ${item.colorClass}`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-sm leading-none">{item.symbol}</span>
                    <span className="text-[10px] font-black text-slate-800">{item.label}</span>
                  </div>
                  <div className="w-10 h-6 rounded border-2 border-slate-400 bg-white" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 h-full min-h-0">
      <div className={`flex items-stretch ${compact ? 'gap-1.5' : 'gap-2.5'} flex-1 min-h-0`}>
        <div className="flex items-center justify-center shrink-0">
          <StarburstRoundBadge
            roundNumber={roundNumber}
            hiraganaOnly={hiraganaOnly}
            inkTheme={inkTheme}
            className={badgeSizeClass}
          />
        </div>
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          {renderGridTable()}
        </div>
      </div>

      {showTallyBox && (
        <div
          className={`flex items-center justify-between gap-1.5 shrink-0 ${
            compact ? 'pl-11' : 'pl-16'
          }`}
        >
          <div className="flex items-center gap-1.5 flex-1">
            {tallyItems.map((item) => (
              <div
                key={item.symbol}
                className={`flex-1 flex items-center justify-between gap-1 rounded-md border px-1.5 ${
                  compact ? 'py-0.5' : 'py-1'
                } ${item.colorClass}`}
              >
                <div className="flex items-center gap-1 min-w-0">
                  <span className={`font-black leading-none ${compact ? 'text-xs' : 'text-sm'}`}>
                    {item.symbol}
                  </span>
                  <span className={`font-black text-slate-800 truncate ${compact ? 'text-[9px]' : 'text-[10px]'}`}>
                    {item.label}
                  </span>
                </div>
                <div
                  className={`rounded border border-slate-500 bg-white shrink-0 ${
                    compact ? 'w-6 h-4' : 'w-8 h-5'
                  }`}
                />
              </div>
            ))}
          </div>
          {showHowManyCue && !compact && (
            <div className="text-[9.5px] font-black text-slate-700 bg-amber-50 border border-amber-300 rounded-md px-2 py-1 shrink-0 whitespace-nowrap">
              &ldquo;How many?&rdquo; → ____!
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const JankenWorksheetPage: React.FC<JankenWorksheetPageProps> = ({
  page,
  totalPages,
  totalCards,
  options,
  isLastPage
}) => {
  const {
    layoutMode,
    orientation,
    japaneseNotation,
    inkTheme,
    roundsPerCard,
    showTextbookBadge,
    showHandGuide,
    showTallyBox,
    showDialogueBox,
    showSelfCheck,
    dialoguePresetId,
    customLineA,
    customLineB,
    customHintJa
  } = options;

  const isLandscape = orientation === 'landscape';
  const hiraganaOnly = japaneseNotation === 'hiragana';
  const isBw = inkTheme === 'bw';
  const effectiveRounds = getEffectiveRoundsPerCard(layoutMode, roundsPerCard);
  const preset = DIALOGUE_PRESETS[dialoguePresetId] || DIALOGUE_PRESETS.how_many;

  const speakerAText =
    dialoguePresetId === 'custom'
      ? customLineA.trim() || '"Hello!"'
      : preset.speakerA;
  const speakerBText =
    dialoguePresetId === 'custom'
      ? customLineB.trim() || '"Rock, scissors, paper! 1, 2, 3!"'
      : preset.speakerB;
  const hintJaNode =
    dialoguePresetId === 'custom'
      ? customHintJa.trim() || (hiraganaOnly ? 'えいごで はなしてから じゃんけんしよう！' : '英語で話してからじゃんけんしよう！')
      : hiraganaOnly
        ? preset.hintJaHiragana
        : renderRubySegments(preset.hintJaRubySegments);

  const renderInstructionText = (compact = false) => {
    if (hiraganaOnly) {
      return (
        <span className={compact ? 'text-[9.5px] font-bold text-slate-800' : 'text-[11px] font-bold text-slate-800'}>
          じゃんけんをしよう。かったら◯、あいこなら△、まけたら×を ひょうに かこう。
        </span>
      );
    }
    return (
      <span className={compact ? 'text-[9.5px] font-bold text-slate-800' : 'text-[11px] font-bold text-slate-800'}>
        じゃんけんをしよう。かったら◯、あいこなら△、まけたら×を
        <ruby>表<rt className="font-normal">ひょう</rt></ruby>
        に
        <ruby>書<rt className="font-normal">か</rt></ruby>
        こう。
      </span>
    );
  };

  const renderStudentInfoBox = (card: JankenCardData, compact = false) => {
    const numLabel = card.studentNumber > 0 ? `${card.studentNumber} 番` : '_____ 番';
    if (compact) {
      return (
        <div
          className={`border-[1.5px] rounded-lg px-2 py-1 text-[10px] font-black shrink-0 ${
            isBw ? 'border-slate-900 bg-white' : 'border-slate-700 bg-slate-50 print:bg-transparent'
          }`}
        >
          <div className="flex items-center gap-2 border-b border-slate-300 pb-0.5 mb-0.5">
            <span>
              <span className="text-[9px] text-slate-500 font-bold">くみ: </span>
              {card.className || '___年___組'}
            </span>
            <span>
              <span className="text-[9px] text-slate-500 font-bold">ばんごう: </span>
              {numLabel}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-slate-500 font-bold shrink-0">なまえ:</span>
            <div className="border-b border-dotted border-slate-700 flex-1 h-3 min-w-[75px]" />
          </div>
        </div>
      );
    }

    return (
      <div
        className={`border-2 rounded-lg p-1.5 text-xs font-black min-w-[225px] shrink-0 ${
          isBw ? 'border-slate-900 bg-white' : 'border-slate-800 bg-slate-50 print:bg-transparent'
        }`}
      >
        <div className="grid grid-cols-2 gap-2 border-b border-slate-300 pb-0.5 mb-0.5">
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-600 font-bold">くみ:</span>
            <span className="font-black text-slate-900 text-xs">
              {card.className || '____ 年 ____ 組'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-600 font-bold">ばんごう:</span>
            <span className="font-black text-slate-900 text-xs">{numLabel}</span>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 flex-1">
            <span className="text-[10px] text-slate-600 font-bold">なまえ:</span>
            <div className="border-b border-dotted border-slate-700 flex-1 h-3.5" />
          </div>
          {totalCards > 1 && (
            <div className="text-[9px] text-slate-400 font-normal shrink-0">
              #{card.cardIndex}/{totalCards}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderHandGuideBox = (compact = false) => (
    <div
      className={`border-2 rounded-xl flex items-center justify-between gap-2 ${
        compact ? 'px-2 py-1' : 'px-3 py-1.5'
      } ${
        isBw
          ? 'border-slate-800 bg-white'
          : 'border-amber-300 bg-amber-50/60 print:bg-amber-50/30'
      }`}
    >
      <div className={`flex items-center ${compact ? 'gap-2' : 'gap-2.5'}`}>
        {[
          { label: 'Rock', ja: 'グー', Svg: RockHandSvg },
          { label: 'Scissors', ja: 'チョキ', Svg: ScissorsHandSvg },
          { label: 'Paper', ja: 'パー', Svg: PaperHandSvg }
        ].map(({ label, ja, Svg }) => (
          <div key={label} className="flex flex-col items-center leading-none">
            <Svg
              inkTheme={inkTheme}
              className={compact ? 'w-7 h-7' : 'w-9 h-9'}
            />
            <span className={`font-black text-slate-900 mt-0.5 ${compact ? 'text-[9px]' : 'text-[10.5px]'}`}>
              {label}
            </span>
            <span className="text-[8px] font-bold text-slate-500">{ja}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-col items-end text-right min-w-0">
        <span
          className={`font-black px-2 py-0.5 rounded-full ${
            isBw
              ? 'border border-slate-800 text-slate-900 bg-white'
              : 'bg-amber-400 text-slate-950'
          } ${compact ? 'text-[8.5px]' : 'text-[10px]'}`}
        >
          CHANT / かけごえ
        </span>
        <span className={`font-black text-slate-900 mt-0.5 ${compact ? 'text-[10px]' : 'text-xs'}`}>
          &ldquo;Rock, scissors, paper! 1, 2, 3!&rdquo;
        </span>
      </div>
    </div>
  );

  const renderDialogueBox = (compact = false) => (
    <div
      className={`border-2 rounded-xl flex flex-col justify-center ${
        compact ? 'px-2.5 py-1' : 'px-3 py-1.5'
      } ${
        isBw
          ? 'border-slate-800 bg-white'
          : 'border-sky-300 bg-sky-50/60 print:bg-sky-50/30'
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-0.5">
        <span
          className={`font-black px-1.5 py-0.2 rounded uppercase tracking-wide ${
            isBw
              ? 'border border-slate-800 text-slate-900'
              : 'bg-sky-600 text-white'
          } ${compact ? 'text-[8.5px]' : 'text-[9.5px]'}`}
        >
          ▶ {hiraganaOnly ? 'えいごで はなそう' : <><ruby>英語<rt className="font-normal">えいご</rt></ruby>で<ruby>話<rt className="font-normal">はな</rt></ruby>そう</>}
        </span>
        <span className={`font-bold text-slate-600 truncate ${compact ? 'text-[8.5px]' : 'text-[9.5px]'}`}>
          {hintJaNode}
        </span>
      </div>
      <div
        className={`grid gap-x-3 gap-y-0.5 ${
          compact ? 'grid-cols-1 text-[10px]' : 'grid-cols-2 text-[11px]'
        }`}
      >
        <div className="font-black text-slate-900 truncate">
          <span className={isBw ? 'text-slate-700 mr-1' : 'text-sky-700 mr-1'}>A:</span>
          {speakerAText}
        </div>
        <div className="font-black text-slate-900 truncate">
          <span className={isBw ? 'text-slate-700 mr-1' : 'text-emerald-700 mr-1'}>B:</span>
          {speakerBText}
        </div>
      </div>
    </div>
  );

  const renderTextbookHeader = (card: JankenCardData, compact = false) => (
    <div
      className={`border-b-2 pb-1.5 flex items-start justify-between gap-3 shrink-0 ${
        isBw ? 'border-slate-900' : 'border-slate-800'
      }`}
    >
      <div className="min-w-0 flex-1">
        {/* Textbook Let's Play ② + Instruction bar */}
        <div className="flex items-center gap-2 flex-wrap">
          {showTextbookBadge && (
            <div className="relative inline-flex items-center shrink-0">
              <span
                className={`px-2.5 py-0.5 rounded-lg font-black leading-tight border-2 ${
                  compact ? 'text-[10px]' : 'text-xs'
                } ${
                  isBw
                    ? 'bg-white text-slate-900 border-slate-900'
                    : 'bg-orange-500 text-white border-orange-600'
                }`}
              >
                Let&apos;s Play
              </span>
              <span
                className={`-ml-1.5 -mt-3 w-4 h-4 rounded-full text-[10px] font-black flex items-center justify-center border ${
                  isBw
                    ? 'bg-white text-slate-900 border-slate-900'
                    : 'bg-white text-orange-600 border-orange-500'
                }`}
              >
                2
              </span>
            </div>
          )}

          <h1
            className={`font-black tracking-tight text-slate-900 leading-tight ${
              compact ? 'text-base' : 'text-lg'
            }`}
          >
            {hiraganaOnly ? 'えいごで じゃんけん' : 'えい語でじゃんけん'}
            <span className={`ml-2 font-bold text-slate-500 ${compact ? 'text-[10px]' : 'text-xs'}`}>
              English Janken
            </span>
          </h1>
        </div>

        <div
          className={`mt-1 px-2 py-0.5 rounded-full border inline-block ${
            isBw ? 'border-slate-700 bg-white' : 'border-slate-300 bg-slate-50 print:bg-transparent'
          }`}
        >
          {renderInstructionText(compact)}
        </div>
      </div>

      {renderStudentInfoBox(card, compact)}
    </div>
  );

  // =========================================================================
  // 1. FULL A4 SHEET (1 Student per A4 Page — 1 to 4 Rounds + Grand Total)
  // =========================================================================
  const renderFullSheet = (card: JankenCardData) => {
    const rounds = Array.from({ length: effectiveRounds }, (_, i) => i + 1);
    const useSideTally = isLandscape && effectiveRounds === 2;
    const useTwoByTwo = isLandscape && effectiveRounds >= 3;

    return (
      <div className="w-full h-full flex flex-col justify-between gap-2 min-h-0">
        {renderTextbookHeader(card, false)}

        {/* Hand Guide + Dialogue Strip */}
        {(showHandGuide || showDialogueBox) && (
          <div
            className={`grid gap-2 shrink-0 ${
              showHandGuide && showDialogueBox ? 'grid-cols-2' : 'grid-cols-1'
            }`}
          >
            {showHandGuide && renderHandGuideBox(false)}
            {showDialogueBox && renderDialogueBox(false)}
          </div>
        )}

        {/* Main Rounds Grid */}
        <div className="flex-1 min-h-0 flex flex-col justify-center">
          {useTwoByTwo ? (
            <div className="grid grid-cols-2 grid-rows-2 gap-3.5 h-full min-h-0">
              {rounds.map((rNum) => (
                <div
                  key={rNum}
                  className={`rounded-2xl border-2 p-2.5 flex flex-col min-h-0 ${
                    isBw ? 'border-slate-800 bg-white' : 'border-slate-200 bg-slate-50/40 print:bg-transparent'
                  }`}
                >
                  <RoundGridBlock
                    roundNumber={rNum}
                    hiraganaOnly={hiraganaOnly}
                    inkTheme={inkTheme}
                    showTallyBox={showTallyBox}
                    showHowManyCue={dialoguePresetId === 'how_many'}
                    compact
                    badgeSizeClass="w-12 h-12"
                    cellTextClass="text-xs"
                  />
                </div>
              ))}

              {/* If 3 rounds, use 4th quadrant for Grand Total & Reflection */}
              {effectiveRounds === 3 && (
                <div
                  className={`rounded-2xl border-2 p-3 flex flex-col justify-between ${
                    isBw
                      ? 'border-slate-900 bg-white'
                      : 'border-amber-300 bg-amber-50/40 print:bg-amber-50/20'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-amber-300 pb-1">
                    <span className="text-xs font-black text-slate-900">
                      ★ {hiraganaOnly ? 'ごうけい / TOTAL' : <><ruby>合計<rt className="font-normal">ごうけい</rt></ruby> / TOTAL</>}
                    </span>
                    <span className="text-[10px] font-black text-slate-600">
                      &ldquo;How many?&rdquo;
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 my-auto">
                    {[
                      { s: '◯', l: 'かった' },
                      { s: '△', l: 'あいこ' },
                      { s: '×', l: 'まけた' }
                    ].map((x) => (
                      <div
                        key={x.s}
                        className="border-2 border-slate-700 rounded-xl bg-white p-1.5 flex flex-col items-center justify-center"
                      >
                        <span className="text-base font-black text-slate-900 leading-none">{x.s}</span>
                        <span className="text-[9px] font-bold text-slate-600 mt-0.5">{x.l}</span>
                        <div className="w-full h-7 border-t border-dashed border-slate-300 mt-1" />
                      </div>
                    ))}
                  </div>
                  <div className="text-[9.5px] font-bold text-slate-700 flex items-center justify-between border-t border-amber-200 pt-1">
                    <span>★ □ えいごで いえた！ □ たのしくできた！</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div
              className="grid gap-3 h-full min-h-0"
              style={{ gridTemplateRows: `repeat(${rounds.length}, minmax(0, 1fr))` }}
            >
              {rounds.map((rNum) => (
                <div
                  key={rNum}
                  className={`rounded-2xl border-2 p-2.5 flex flex-col min-h-0 ${
                    isBw ? 'border-slate-800 bg-white' : 'border-slate-200 bg-slate-50/40 print:bg-transparent'
                  }`}
                >
                  <RoundGridBlock
                    roundNumber={rNum}
                    hiraganaOnly={hiraganaOnly}
                    inkTheme={inkTheme}
                    showTallyBox={showTallyBox}
                    showHowManyCue={dialoguePresetId === 'how_many'}
                    sideTally={useSideTally}
                    compact={!isLandscape && effectiveRounds >= 4}
                    badgeSizeClass={
                      effectiveRounds === 1
                        ? 'w-20 h-20'
                        : effectiveRounds <= 2
                          ? 'w-16 h-16'
                          : 'w-12 h-12'
                    }
                    cellTextClass={effectiveRounds <= 2 ? 'text-base' : 'text-xs'}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom Grand Total / Self-Evaluation Bar (when not already shown in 3-round quadrant) */}
        {(showSelfCheck || (effectiveRounds >= 2 && effectiveRounds !== 3 && showTallyBox)) && (
          <div
            className={`border-2 rounded-xl px-3 py-1.5 flex items-center justify-between gap-3 shrink-0 ${
              isBw ? 'border-slate-900 bg-white' : 'border-slate-800 bg-slate-50 print:bg-transparent'
            }`}
          >
            {effectiveRounds >= 2 && showTallyBox ? (
              <div className="flex items-center gap-3 text-xs font-black text-slate-900">
                <span>
                  ★ {hiraganaOnly ? 'ぜんぶの ごうけい:' : <><ruby>全部<rt className="font-normal">ぜんぶ</rt></ruby>の <ruby>合計<rt className="font-normal">ごうけい</rt></ruby>:</>}
                </span>
                <span className="bg-white border border-slate-400 rounded-md px-2 py-0.5">◯ かった: ____</span>
                <span className="bg-white border border-slate-400 rounded-md px-2 py-0.5">△ あいこ: ____</span>
                <span className="bg-white border border-slate-400 rounded-md px-2 py-0.5">× まけた: ____</span>
              </div>
            ) : (
              <div className="text-xs font-black text-slate-800">
                ▶ &ldquo;How many wins did you get?&rdquo; → &ldquo;I got ____!&rdquo;
              </div>
            )}

            {showSelfCheck && (
              <div className="flex items-center gap-3 text-[10.5px] font-bold text-slate-700 shrink-0">
                <span>★ ふりかえり:</span>
                <span>□ えいごで じゃんけんできた！</span>
                <span>□ ともだちと たのしくできた！</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // =========================================================================
  // 2. HALF-SHEET SLIP (2 Cards per A4 Page with Cut Guide)
  // =========================================================================
  const renderHalfSlip = (card: JankenCardData | null) => {
    if (!card) {
      return (
        <div className="h-full w-full border-2 border-dashed border-slate-300 rounded-2xl flex items-center justify-center text-xs font-bold text-slate-400">
          余白 / Blank Slip
        </div>
      );
    }

    const rounds = Array.from({ length: Math.min(2, effectiveRounds) }, (_, i) => i + 1);
    const isNarrowVerticalSlip = isLandscape; // On landscape A4, left & right halves are narrower!

    return (
      <div
        className={`h-full w-full border-2 rounded-2xl p-2.5 flex flex-col justify-between gap-1.5 bg-white min-h-0 ${
          isBw ? 'border-slate-900' : 'border-slate-800'
        }`}
      >
        {renderTextbookHeader(card, true)}

        {(showHandGuide || showDialogueBox) && (
          <div
            className={`grid gap-1.5 shrink-0 ${
              !isNarrowVerticalSlip && showHandGuide && showDialogueBox
                ? 'grid-cols-2'
                : 'grid-cols-1'
            }`}
          >
            {showHandGuide && renderHandGuideBox(true)}
            {showDialogueBox && renderDialogueBox(true)}
          </div>
        )}

        <div
          className="flex-1 min-h-0 grid gap-1.5"
          style={{ gridTemplateRows: `repeat(${rounds.length}, minmax(0, 1fr))` }}
        >
          {rounds.map((rNum) => (
            <RoundGridBlock
              key={rNum}
              roundNumber={rNum}
              hiraganaOnly={hiraganaOnly}
              inkTheme={inkTheme}
              showTallyBox={showTallyBox}
              showHowManyCue={false}
              compact
              badgeSizeClass={rounds.length === 1 ? 'w-14 h-14' : 'w-11 h-11'}
              cellTextClass={rounds.length === 1 ? 'text-sm' : 'text-xs'}
            />
          ))}
        </div>
      </div>
    );
  };

  // =========================================================================
  // 3. QUARTER-CARD SLIP (4 Cards per A4 Page with 2x2 Cut Grid)
  // =========================================================================
  const renderQuarterSlip = (card: JankenCardData | null) => {
    if (!card) {
      return (
        <div className="h-full w-full border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center text-xs font-bold text-slate-400">
          余白 / Blank Card
        </div>
      );
    }

    const numLabel = card.studentNumber > 0 ? `#${card.studentNumber}` : '___番';

    return (
      <div
        className={`h-full w-full border-2 rounded-xl p-2 flex flex-col justify-between gap-1 bg-white min-h-0 ${
          isBw ? 'border-slate-900' : 'border-slate-800'
        }`}
      >
        {/* Compact Header */}
        <div className="flex items-center justify-between gap-1 border-b border-slate-800 pb-1 shrink-0">
          <div className="flex items-center gap-1 min-w-0">
            {showTextbookBadge && (
              <span
                className={`px-1 py-0.2 rounded text-[8.5px] font-black shrink-0 ${
                  isBw ? 'border border-slate-900 text-slate-900' : 'bg-orange-500 text-white'
                }`}
              >
                ②
              </span>
            )}
            <span className="text-[11px] font-black text-slate-900 truncate">
              {hiraganaOnly ? 'えいごで じゃんけん' : 'えい語でじゃんけん'}
            </span>
          </div>
          <div className="flex items-center gap-1 text-[9px] font-black text-slate-800 shrink-0">
            <span>{card.className || '___組'}</span>
            <span>{numLabel}</span>
            <span className="text-slate-500 font-bold">なまえ:</span>
            <span className="inline-block border-b border-dotted border-slate-700 w-12 h-2.5" />
          </div>
        </div>

        {/* Mini Rules + Optional Hands */}
        <div className="flex items-center justify-between gap-1.5 text-[8.5px] font-bold text-slate-700 shrink-0">
          <span>◯:かった △:あいこ ×:まけた</span>
          {showHandGuide && (
            <span className="inline-flex items-center gap-1.5 font-black text-slate-900 shrink-0">
              <span className="inline-flex items-center gap-0.5">
                <RockHandSvg inkTheme={inkTheme} className="w-3.5 h-3.5" />
                <span>Rock</span>
              </span>
              <span className="inline-flex items-center gap-0.5">
                <ScissorsHandSvg inkTheme={inkTheme} className="w-3.5 h-3.5" />
                <span>Scissors</span>
              </span>
              <span className="inline-flex items-center gap-0.5">
                <PaperHandSvg inkTheme={inkTheme} className="w-3.5 h-3.5" />
                <span>Paper</span>
              </span>
            </span>
          )}
        </div>

        {showDialogueBox && (
          <div
            className={`px-2 py-0.5 rounded-md border text-[8.5px] font-black text-slate-900 shrink-0 ${
              isBw ? 'border-slate-700 bg-white' : 'border-sky-300 bg-sky-50/70'
            } ${
              dialoguePresetId === 'janken_only'
                ? 'truncate'
                : isLandscape
                  ? 'grid grid-cols-2 gap-1.5'
                  : 'flex flex-col gap-0.5'
            }`}
          >
            <div className="truncate">
              <span className={isBw ? 'text-slate-700 mr-1' : 'text-sky-700 mr-1'}>A:</span>
              {speakerAText}
            </div>
            {dialoguePresetId !== 'janken_only' && (
              <div className="truncate">
                <span className={isBw ? 'text-slate-700 mr-1' : 'text-emerald-700 mr-1'}>B:</span>
                {speakerBText}
              </div>
            )}
          </div>
        )}

        {/* Single 1-10 Grid */}
        <div className="flex-1 min-h-0">
          <RoundGridBlock
            roundNumber={1}
            hiraganaOnly={hiraganaOnly}
            inkTheme={inkTheme}
            showTallyBox={showTallyBox}
            showHowManyCue={false}
            compact
            badgeSizeClass="w-10 h-10"
            cellTextClass="text-[11px]"
          />
        </div>
      </div>
    );
  };

  return (
    <div
      className={`janken-a4-page ${orientation} bg-white text-slate-900 border-2 border-slate-300 print:border-none shadow-md print:shadow-none px-[8mm] py-[6mm] print:p-0 flex flex-col justify-between mx-auto box-border overflow-hidden`}
      style={{
        fontFamily: MEXT_FONT,
        width: isLandscape ? '297mm' : '210mm',
        height: isLandscape ? '210mm' : '297mm',
        maxHeight: isLandscape ? '210mm' : '297mm',
        pageBreakAfter: isLastPage ? 'auto' : 'always',
        breakAfter: isLastPage ? 'auto' : 'page',
        breakInside: 'avoid'
      }}
    >
      {layoutMode === 'full' && page.cards[0] && renderFullSheet(page.cards[0])}

      {layoutMode === 'slips_2' && (
        <div
          className={`w-full h-full flex ${
            isLandscape ? 'flex-row' : 'flex-col'
          } justify-between gap-2 min-h-0`}
        >
          <div className="flex-1 min-h-0 min-w-0">{renderHalfSlip(page.cards[0])}</div>

          {/* Cut Guide */}
          <div
            className={`flex items-center justify-center gap-1.5 text-[10px] font-mono text-slate-500 shrink-0 ${
              isLandscape ? 'flex-col w-5' : 'flex-row h-5'
            }`}
          >
            <span>✂</span>
            <div
              className={`flex-1 border-dashed border-slate-400 ${
                isLandscape ? 'border-l-2 h-full w-0' : 'border-t-2 w-full h-0'
              }`}
            />
            <span className={`whitespace-nowrap ${isLandscape ? '[writing-mode:vertical-rl]' : ''}`}>
              CUT HERE / きりとりせん
            </span>
            <div
              className={`flex-1 border-dashed border-slate-400 ${
                isLandscape ? 'border-l-2 h-full w-0' : 'border-t-2 w-full h-0'
              }`}
            />
            <span>✂</span>
          </div>

          <div className="flex-1 min-h-0 min-w-0">{renderHalfSlip(page.cards[1])}</div>
        </div>
      )}

      {layoutMode === 'slips_4' && (
        <div className="w-full h-full grid grid-cols-[1fr_14px_1fr] grid-rows-[1fr_14px_1fr] min-h-0">
          {/* Top Left */}
          <div className="min-h-0 min-w-0">{renderQuarterSlip(page.cards[0])}</div>

          {/* Top Vertical Cut Line */}
          <div className="flex flex-col items-center justify-center text-[9px] text-slate-400">
            <span>✂</span>
            <div className="flex-1 border-l border-dashed border-slate-400" />
          </div>

          {/* Top Right */}
          <div className="min-h-0 min-w-0">{renderQuarterSlip(page.cards[1])}</div>

          {/* Middle Horizontal Cut Line (Spans 3 columns) */}
          <div className="col-span-3 flex items-center justify-center gap-2 text-[9px] font-mono text-slate-500">
            <span>✂</span>
            <div className="flex-1 border-t border-dashed border-slate-400" />
            <span>CUT HERE / きりとりせん</span>
            <div className="flex-1 border-t border-dashed border-slate-400" />
            <span>✂</span>
          </div>

          {/* Bottom Left */}
          <div className="min-h-0 min-w-0">{renderQuarterSlip(page.cards[2])}</div>

          {/* Bottom Vertical Cut Line */}
          <div className="flex flex-col items-center justify-center text-[9px] text-slate-400">
            <div className="flex-1 border-l border-dashed border-slate-400" />
            <span>✂</span>
          </div>

          {/* Bottom Right */}
          <div className="min-h-0 min-w-0">{renderQuarterSlip(page.cards[3])}</div>
        </div>
      )}

      {/* Subtle footer page index for multi-page decks */}
      {totalPages > 1 && layoutMode !== 'full' && (
        <div className="sr-only print:hidden">
          Page {page.pageIndex + 1} / {totalPages}
        </div>
      )}
    </div>
  );
};
