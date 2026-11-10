import React, { useState, useMemo } from 'react';
import { VocabularyItem, GradeLevel } from '@data/types';
import { resolveCardImage, shuffleArray } from '@/utils/cardUtils';
import { useLanguage } from '@/context/LanguageContext';
import { useClassroom } from '@/context/ClassroomContext';
import { Printer, X, ExternalLink, ChevronLeft, ChevronRight, Sliders, Check, Sun, Moon } from 'lucide-react';

interface BingoPrintModalProps {
  words: VocabularyItem[];
  grade?: GradeLevel;
  unitName?: string;
  onClose: () => void;
}

export const BingoPrintModal: React.FC<BingoPrintModalProps> = ({
  words,
  grade,
  unitName,
  onClose,
}) => {
  const { t, language } = useLanguage();
  const { theme, toggleTheme } = useClassroom();
  const [cardCount, setCardCount] = useState<number>(40);
  const [includeFreeCenter, setIncludeFreeCenter] = useState<boolean>(true);
  const [displayMode, setDisplayMode] = useState<'picture_word' | 'picture_only'>('picture_word');
  const [previewPageIdx, setPreviewPageIdx] = useState<number>(0);

  // Filter only words that actually have valid illustration assets!
  const wordsWithImages = useMemo(() => {
    return words.filter((w) => {
      const img = resolveCardImage(w, 'picture_only', grade);
      return Boolean(img && img.trim() !== '');
    });
  }, [words, grade]);

  // Generate unique randomized cards
  const generatedCards = useMemo(() => {
    if (wordsWithImages.length < 4) return [];

    const neededItemsPerCard = includeFreeCenter ? 8 : 9;
    const cards: VocabularyItem[][] = [];

    for (let i = 0; i < cardCount; i++) {
      const shuffled = shuffleArray(wordsWithImages);
      const selected: VocabularyItem[] = [];
      let poolIdx = 0;
      while (selected.length < neededItemsPerCard) {
        selected.push(shuffled[poolIdx % shuffled.length]);
        poolIdx++;
      }
      cards.push(selected);
    }
    return cards;
  }, [wordsWithImages, cardCount, includeFreeCenter]);

  const totalPages = Math.ceil(generatedCards.length / 2);

  // Construct self-contained standalone printable HTML
  const buildPrintHTML = () => {
    let pagesHTML = '';

    for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
      const card1 = generatedCards[pageIdx * 2];
      const card2 = generatedCards[pageIdx * 2 + 1];

      const renderCard = (card: VocabularyItem[] | undefined, cardNum: number) => {
        if (!card) return '';
        let cellsHTML = '';

        for (let gridIdx = 0; gridIdx < 9; gridIdx++) {
          const isCenter = includeFreeCenter && gridIdx === 4;
          const wordIdx = includeFreeCenter
            ? (gridIdx > 4 ? gridIdx - 1 : gridIdx)
            : gridIdx;
          const item = card[wordIdx];

          if (isCenter) {
            cellsHTML += `
              <div class="cell free">
                <span class="star">⭐</span>
                <span class="free-text">FREE</span>
              </div>
            `;
          } else if (item) {
            const imgUrl = resolveCardImage(
              item,
              'picture_only',
              grade
            ) || '';

            const imgTag = imgUrl
              ? `<img src="${imgUrl}" alt="${item.english}" />`
              : `<div class="no-img">🖼️</div>`;

            const labelTag = displayMode !== 'picture_only'
              ? `<div class="label">${item.english}</div>`
              : '';

            cellsHTML += `
              <div class="cell">
                <div class="img-wrapper">${imgTag}</div>
                ${labelTag}
              </div>
            `;
          } else {
            cellsHTML += `<div class="cell"></div>`;
          }
        }

        return `
          <div class="card">
            <div class="card-header">
              <span class="title">★ LEVI-SENSEI ENGLISH BINGO ★ (${unitName || 'Classroom'})</span>
              <span class="meta">Card #${cardNum} &nbsp;|&nbsp; Name: ____________________</span>
            </div>
            <div class="grid">${cellsHTML}</div>
          </div>
        `;
      };

      const card1HTML = renderCard(card1, pageIdx * 2 + 1);
      const card2HTML = renderCard(card2, pageIdx * 2 + 2);

      pagesHTML += `
        <div class="page">
          ${card1HTML}
          <div class="cut-guide">
            <span>✂️</span>
            <div class="cut-line"></div>
            <span>CUT HERE / きりとりせん</span>
            <div class="cut-line"></div>
            <span>✂️</span>
          </div>
          ${card2HTML}
        </div>
      `;
    }

    return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <title>Levi-Sensei Bingo Cards (${cardCount} Sheets)</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 8mm 10mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #000000;
      font-family: 'UD Digi Kyokasho NP-R', 'UD Digi Kyokasho NK-R', 'BIZ UDPGothic', 'Zen Maru Gothic', -apple-system, BlinkMacSystemFont, sans-serif;
    }
    .page {
      width: 100%;
      height: 280mm;
      max-height: 280mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      page-break-after: always;
      break-after: page;
      overflow: hidden;
      padding: 2mm 0;
    }
    .page:last-child {
      page-break-after: auto;
      break-after: auto;
    }
    .card {
      height: 133mm;
      max-height: 133mm;
      border: 3.5px solid #000000;
      border-radius: 12px;
      padding: 6px 10px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      background: #ffffff;
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #000000;
      padding-bottom: 4px;
      margin-bottom: 5px;
    }
    .card-header .title {
      font-size: 13px;
      font-weight: 900;
      letter-spacing: 0.5px;
    }
    .card-header .meta {
      font-size: 12px;
      font-weight: 700;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      grid-template-rows: repeat(3, 1fr);
      gap: 6px;
      flex: 1;
      min-height: 0;
    }
    .cell {
      border: 2px solid #000000;
      border-radius: 8px;
      background: #fbfbfb;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2px;
      overflow: hidden;
      text-align: center;
    }
    .cell.free {
      background: #fef3c7;
    }
    .cell .star {
      font-size: 26px;
      line-height: 1;
    }
    .cell .free-text {
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 1px;
      margin-top: 2px;
    }
    .cell .img-wrapper {
      flex: 1;
      width: 100%;
      min-height: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .cell img {
      max-height: ${displayMode === 'picture_only' ? '30mm' : '23mm'};
      max-width: 95%;
      object-fit: contain;
    }
    .cell .label {
      font-size: 11px;
      font-weight: 900;
      color: #000000;
      line-height: 1.1;
      margin-top: 1px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 95%;
    }
    .cut-guide {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      font-size: 11px;
      font-family: monospace;
      color: #4b5563;
      margin: 2mm 0;
    }
    .cut-line {
      flex: 1;
      border-top: 2px dashed #9ca3af;
    }
  </style>
</head>
<body>
  ${pagesHTML}
</body>
</html>`;
  };

  // 1. Bulletproof Print Trigger via Isolated Hidden Iframe
  const handlePrint = () => {
    const html = buildPrintHTML();

    // Create a hidden iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      document.body.removeChild(iframe);
      return;
    }

    doc.open();
    doc.write(html);
    doc.close();

    // Wait slightly for images to decode, then print
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.error('Print error:', err);
      } finally {
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 1500);
      }
    }, 400);
  };

  // 2. Open in New Tab (lets teacher inspect all 20 pages or save manually)
  const handleOpenInNewTab = () => {
    const html = buildPrintHTML();
    const newTab = window.open('', '_blank');
    if (newTab) {
      newTab.document.open();
      newTab.document.write(html);
      newTab.document.close();
    }
  };

  // Preview cards for currently selected preview page
  const previewCard1 = generatedCards[previewPageIdx * 2];
  const previewCard2 = generatedCards[previewPageIdx * 2 + 1];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-300 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500 text-slate-950 font-black">
              <Printer size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                {t('Classroom Bingo Card Generator', 'ビンゴカード印刷')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {unitName || t('Current Unit', '選択中単元')} • {words.length} {t('Vocabulary Words', '単語')} • {cardCount} {t(`Unique Cards (${totalPages} A4 Pages)`, `枚のカード (${totalPages}枚のA4用紙)`)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} className="text-indigo-400" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Options Toolbar */}
        <div className="px-6 py-3 bg-slate-100 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Card Count */}
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-600 dark:text-slate-300">{t('Sheets:', '印刷枚数:')}</span>
            <div className="flex bg-white dark:bg-slate-800 rounded-xl p-0.5 border border-slate-300 dark:border-slate-700">
              {[10, 20, 35, 40].map((num) => (
                <button
                  key={num}
                  onClick={() => {
                    setCardCount(num);
                    setPreviewPageIdx(0);
                  }}
                  className={`px-3 py-1 font-black rounded-lg transition ${
                    cardCount === num
                      ? 'bg-amber-500 text-slate-950 shadow'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {num}{t(' sheets', '枚')}
                </button>
              ))}
            </div>
          </div>

          {/* Mode */}
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-600 dark:text-slate-300">{t('Mode:', '表示形式:')}</span>
            <div className="flex bg-white dark:bg-slate-800 rounded-xl p-0.5 border border-slate-300 dark:border-slate-700">
              <button
                onClick={() => setDisplayMode('picture_word')}
                className={`px-2.5 py-1 font-bold rounded-lg transition ${
                  displayMode === 'picture_word'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {t('Picture + English', 'イラスト＋英語')}
              </button>
              <button
                onClick={() => setDisplayMode('picture_only')}
                className={`px-2.5 py-1 font-bold rounded-lg transition ${
                  displayMode === 'picture_only'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {t('Picture Only (Lower Grades)', 'イラストのみ（低学年向）')}
              </button>
            </div>
          </div>

          {/* Center Free Space */}
          <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={includeFreeCenter}
              onChange={(e) => setIncludeFreeCenter(e.target.checked)}
              className="rounded border-slate-300 text-amber-500 focus:ring-amber-400 w-4 h-4"
            />
            {t('Center FREE Star ⭐', '中央をFREE星にする ⭐')}
          </label>
        </div>

        {/* Live Preview Area with Page Paging */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-200 dark:bg-slate-950/60">
          <div className="mb-3 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 font-bold">
            <div className="flex items-center gap-2">
              <span>PREVIEW: A4 Page {previewPageIdx + 1} of {totalPages} (Cards #{previewPageIdx * 2 + 1} & #{previewPageIdx * 2 + 2})</span>
            </div>
            {/* Paging controls */}
            <div className="flex items-center gap-1 bg-white dark:bg-slate-800 rounded-xl p-1 border border-slate-300 dark:border-slate-700">
              <button
                onClick={() => setPreviewPageIdx((p) => Math.max(0, p - 1))}
                disabled={previewPageIdx === 0}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="px-2 text-xs font-mono font-bold">
                {previewPageIdx + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPreviewPageIdx((p) => Math.min(totalPages - 1, p + 1))}
                disabled={previewPageIdx >= totalPages - 1}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Interactive Page Preview (Shows 2 cards with cut line) */}
          <div className="w-full max-w-lg mx-auto bg-white text-slate-900 border-4 border-slate-900 rounded-2xl p-4 shadow-2xl space-y-4">
            {/* Card 1 */}
            {previewCard1 && (
              <div className="border-2 border-slate-800 rounded-xl p-3 bg-white">
                <div className="flex items-center justify-between border-b-2 border-slate-900 pb-1.5 mb-2">
                  <span className="font-black text-xs tracking-wider">
                    ★ LEVI-SENSEI BINGO ★ ({unitName || 'Eigo'})
                  </span>
                  <span className="text-xs font-bold font-mono">
                    Card #{previewPageIdx * 2 + 1} | Name: __________
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1.5 aspect-square">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((gridIdx) => {
                    const isCenter = includeFreeCenter && gridIdx === 4;
                    const wordIdx = includeFreeCenter
                      ? (gridIdx > 4 ? gridIdx - 1 : gridIdx)
                      : gridIdx;
                    const item = previewCard1[wordIdx];

                    if (isCenter) {
                      return (
                        <div
                          key={gridIdx}
                          className="border border-slate-900 rounded-lg bg-amber-100 flex flex-col items-center justify-center p-1 text-center font-black"
                        >
                          <span className="text-2xl">⭐</span>
                          <span className="text-[10px] tracking-wider">FREE</span>
                        </div>
                      );
                    }

                    if (!item) return <div key={gridIdx} className="border border-slate-900 rounded-lg" />;

                    const imgUrl = resolveCardImage(
                      item,
                      'picture_only',
                      grade
                    );

                    return (
                      <div
                        key={gridIdx}
                        className="border border-slate-900 rounded-lg bg-slate-50 flex flex-col items-center justify-center p-1 text-center overflow-hidden"
                      >
                        <div className="flex-1 w-full flex items-center justify-center min-h-0">
                          {imgUrl && (
                            <img
                              src={imgUrl}
                              alt={item.english}
                              className="max-h-full max-w-full object-contain"
                            />
                          )}
                        </div>
                        {displayMode !== 'picture_only' && (
                          <span className="text-[10px] font-black text-slate-900 truncate w-full mt-0.5">
                            {item.english}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Cut line */}
            <div className="w-full flex items-center justify-center gap-2 text-slate-400 text-[10px] font-mono py-1">
              <span>✂️</span>
              <span className="border-t-2 border-dashed border-slate-300 flex-1"></span>
              <span>CUT HERE / きりとりせん</span>
              <span className="border-t-2 border-dashed border-slate-300 flex-1"></span>
              <span>✂️</span>
            </div>

            {/* Card 2 */}
            {previewCard2 && (
              <div className="border-2 border-slate-800 rounded-xl p-3 bg-white">
                <div className="flex items-center justify-between border-b-2 border-slate-900 pb-1.5 mb-2">
                  <span className="font-black text-xs tracking-wider">
                    ★ LEVI-SENSEI BINGO ★ ({unitName || 'Eigo'})
                  </span>
                  <span className="text-xs font-bold font-mono">
                    Card #{previewPageIdx * 2 + 2} | Name: __________
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1.5 aspect-square">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((gridIdx) => {
                    const isCenter = includeFreeCenter && gridIdx === 4;
                    const wordIdx = includeFreeCenter
                      ? (gridIdx > 4 ? gridIdx - 1 : gridIdx)
                      : gridIdx;
                    const item = previewCard2[wordIdx];

                    if (isCenter) {
                      return (
                        <div
                          key={gridIdx}
                          className="border border-slate-900 rounded-lg bg-amber-100 flex flex-col items-center justify-center p-1 text-center font-black"
                        >
                          <span className="text-2xl">⭐</span>
                          <span className="text-[10px] tracking-wider">FREE</span>
                        </div>
                      );
                    }

                    if (!item) return <div key={gridIdx} className="border border-slate-900 rounded-lg" />;

                    const imgUrl = resolveCardImage(
                      item,
                      'picture_only',
                      grade
                    );

                    return (
                      <div
                        key={gridIdx}
                        className="border border-slate-900 rounded-lg bg-slate-50 flex flex-col items-center justify-center p-1 text-center overflow-hidden"
                      >
                        <div className="flex-1 w-full flex items-center justify-center min-h-0">
                          {imgUrl && (
                            <img
                              src={imgUrl}
                              alt={item.english}
                              className="max-h-full max-w-full object-contain"
                            />
                          )}
                        </div>
                        {displayMode !== 'picture_only' && (
                          <span className="text-[10px] font-black text-slate-900 truncate w-full mt-0.5">
                            {item.english}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenInNewTab}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition"
              title={t('Open full document in a new tab', '全ページを別ウィンドウで開く')}
            >
              <ExternalLink size={14} />
              {t('Open in New Tab', '別タブで開く')}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              {t('Close', '閉じる')}
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm shadow-lg hover:shadow-xl transition transform active:scale-95"
            >
              <Printer size={18} />
              {t(`Print ${cardCount} Cards (${totalPages} A4 Pages)`, `${cardCount}枚のカードを印刷 (${totalPages}ページ)`)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
