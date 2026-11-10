import React, { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useClassroom } from '@/context/ClassroomContext';
import { Printer, X, ExternalLink, BookOpen, Sparkles, CheckCircle2, Users, Keyboard, Heart, Sun, Moon } from 'lucide-react';

interface TimebombManualModalProps {
  onClose: () => void;
}

export const TimebombManualModal: React.FC<TimebombManualModalProps> = ({ onClose }) => {
  const { t, language } = useLanguage();
  const { theme, toggleTheme } = useClassroom();
  const [manualLang, setManualLang] = useState<'bilingual' | 'ja' | 'en'>('bilingual');

  // Build clean, standalone printable A4 HTML handout
  const buildPrintHTML = () => {
    return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <title>Hot Potato & Pop Relay - Teacher Instruction Handout (指導案・ルール説明書)</title>
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
      color: #1e293b;
      font-family: 'UD Digi Kyokasho NP-R', 'UD Digi Kyokasho NK-R', 'BIZ UDPGothic', 'Zen Maru Gothic', -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 11pt;
      line-height: 1.45;
    }
    .sheet {
      width: 100%;
      max-width: 190mm;
      margin: 0 auto;
      padding: 4mm 0;
    }
    .header {
      border-bottom: 2.5px solid #0f172a;
      padding-bottom: 3mm;
      margin-bottom: 4mm;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .header-titles {
      flex: 1;
    }
    .badge {
      display: inline-block;
      font-size: 8.5pt;
      font-weight: 900;
      background: #0284c7;
      color: #ffffff;
      padding: 1.5mm 3.5mm;
      border-radius: 3mm;
      margin-bottom: 1.5mm;
      letter-spacing: 0.5px;
    }
    .title-ja {
      font-size: 16pt;
      font-weight: 900;
      color: #0f172a;
      margin: 0;
      line-height: 1.2;
    }
    .title-en {
      font-size: 10.5pt;
      font-weight: 700;
      color: #64748b;
      margin-top: 1mm;
    }
    .header-meta {
      text-align: right;
      font-size: 8.5pt;
      color: #475569;
      line-height: 1.4;
      border-left: 1.5px solid #cbd5e1;
      padding-left: 4mm;
      margin-left: 4mm;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 3.5mm;
      margin-bottom: 3.5mm;
    }
    .box {
      border: 1.5px solid #cbd5e1;
      border-radius: 3mm;
      padding: 3mm 3.5mm;
      background: #f8fafc;
    }
    .box-highlight {
      border: 2px solid #0284c7;
      background: #f0f9ff;
    }
    .box-amber {
      border: 2px solid #d97706;
      background: #fffbeb;
    }
    .box-title {
      font-size: 10pt;
      font-weight: 900;
      color: #0f172a;
      margin-bottom: 2mm;
      display: flex;
      align-items: center;
      gap: 1.5mm;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 1.5mm;
    }
    .box-title .icon {
      font-size: 12pt;
    }
    .step-list {
      margin: 0;
      padding-left: 0;
      list-style: none;
      counter-reset: step-counter;
    }
    .step-item {
      position: relative;
      padding-left: 6.5mm;
      margin-bottom: 2mm;
      font-size: 9pt;
      line-height: 1.35;
    }
    .step-item::before {
      counter-increment: step-counter;
      content: counter(step-counter);
      position: absolute;
      left: 0;
      top: 0.2mm;
      width: 4.5mm;
      height: 4.5mm;
      background: #0f172a;
      color: #ffffff;
      border-radius: 50%;
      font-size: 7.5pt;
      font-weight: 900;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      line-height: 4.5mm;
    }
    .step-item strong {
      color: #0f172a;
      display: block;
      font-size: 9.5pt;
    }
    .tips-list {
      margin: 0;
      padding-left: 4.5mm;
      font-size: 8.5pt;
      line-height: 1.4;
    }
    .tips-list li {
      margin-bottom: 1.5mm;
    }
    .tips-list strong {
      color: #0f172a;
    }
    .keys-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8.5pt;
      margin-top: 1mm;
    }
    .keys-table td {
      padding: 1.2mm 2mm;
      border-bottom: 1px solid #e2e8f0;
    }
    .keys-table td:first-child {
      font-weight: 900;
      font-family: monospace;
      color: #0284c7;
      width: 32%;
    }
    .footer {
      border-top: 1px dashed #cbd5e1;
      padding-top: 2mm;
      margin-top: 3mm;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 8pt;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="sheet">
    <!-- Header -->
    <div class="header">
      <div class="header-titles">
        <span class="badge">小学校 外国語活動（小1〜小6対応）• 担任・ALT用 指導案</span>
        <h1 class="title-ja">ホットポテト＆ポップ・リレー（指導案・あそび方ガイド）</h1>
        <div class="title-en">Hot Potato & Pop Relay: Classroom Teacher Activity Handout</div>
      </div>
      <div class="header-meta">
        <div><strong>作成:</strong> Levi-Sensei English</div>
        <div><strong>安心設計:</strong> 暴力・武器表現ゼロ</div>
        <div><strong>準備物:</strong> 柔らかいボール1個</div>
      </div>
    </div>

    <!-- Row 1: Overview & Preparation -->
    <div class="grid-2">
      <div class="box box-highlight">
        <div class="box-title">
          <span class="icon">🎯</span>
          <span>活動のねらいと教育的効果 (Goal & Overview)</span>
        </div>
        <p style="font-size: 9pt; margin: 0 0 2mm 0; line-height: 1.4;">
          <strong>「間違えても大丈夫！みんなで楽しく声に出そう！」</strong><br/>
          大画面に映し出された英語のイラストや数字を見ながら、柔らかいボールやぬいぐるみを隣の児童へ手渡していくリズムリレーゲームです。
        </p>
        <ul class="tips-list">
          <li><strong>自然な発話意欲:</strong> ボールを持った緊張感の中で、思わず声が出るリズム設計。</li>
          <li><strong>周りの児童の参加:</strong> 全員でエコーリピートし、待機児童も飽きずに声を出します。</li>
          <li><strong>安心・安全:</strong> 罰ゲームではなく「拍手と笑顔が生まれるミニミッション」を採用。</li>
        </ul>
      </div>

      <div class="box">
        <div class="box-title">
          <span class="icon">📦</span>
          <span>準備物・クラスの隊形 (Preparation & Formation)</span>
        </div>
        <p style="font-size: 9pt; margin: 0 0 2mm 0;">
          <strong>【必要なもの】</strong><br/>
          • 柔らかいボール、お手玉、またはぬいぐるみ 1個<br/>
          • 前面TV / プロジェクター（本システム画面）
        </p>
        <p style="font-size: 9pt; margin: 0; line-height: 1.4;">
          <strong>【隊形（おすすめ順）】</strong><br/>
          ① <strong>コの字型 または サークル:</strong> 児童同士の顔が見えやすく、低学年に最適。<br/>
          ② <strong>自席ジグザグ（S字パス）:</strong> 席替え不要。1列目➔2列目➔3列目と列ごとに往復。<br/>
          ③ <strong>4チーム対抗:</strong> 班ごとにボールを回す（4チーム集計モード対応）。
        </p>
      </div>
    </div>

    <!-- Row 2: Step-by-Step Game Flow -->
    <div class="box" style="margin-bottom: 3.5mm;">
      <div class="box-title">
        <span class="icon">🔄</span>
        <span>ゲームの進め方 4ステップ (Step-by-Step Flow)</span>
      </div>
      <ul class="step-list">
        <li class="step-item">
          <strong>① スタート（Start）:</strong>
          Levi-senseiが「スタート」を押すと、BGMと共に第1問のカードが画面に大きく表示され、ネイティブ音声が流れます。
        </li>
        <li class="step-item">
          <strong>② 単語を言ってパス！（Say & Pass）:</strong>
          ボールを持った児童が単語（例:「Red!」「Blue!」）を言い、周りの児童も「Red!」とリピート。言えたら隣の友達へパス！Levi-senseiがSpaceキー（パスボタン）を押すと次の単語に切り替わります。
        </li>
        <li class="step-item">
          <strong>③ シークレットタイマーでポップ！（Freeze / Pop）:</strong>
          ランダムな秒数（12〜38秒）で突然「ジュージュー！🔥」「パチン！🎈」「ポンッ！🍿」と鳴ってタイマー停止！ボールを持っていた児童が「ラッキーな本日のスター」です。
        </li>
        <li class="step-item">
          <strong>④ 楽しいミニミッションに挑戦（Fun Mini-Mission）:</strong>
          画面に安全で楽しいミッション（例:「鼻をさわりながらジャンプ」「動物の鳴きまね」）が出現。児童がクリアしたら、クラス全員で「Good job!」と大拍手！
        </li>
      </ul>
    </div>

    <!-- Row 3: HRT Collaboration & Controls -->
    <div class="grid-2">
      <div class="box box-amber">
        <div class="box-title">
          <span class="icon">🤝</span>
          <span>担任の先生へのお願い・サポートのコツ</span>
        </div>
        <ul class="tips-list">
          <li><strong>パスの誘導（低学年）:</strong> 1年生は誰に渡せば良いか迷うことがあります。通路に立って「次は〇〇さんだよ」とジェスチャーで誘導していただけると非常に助かります。</li>
          <li><strong>周りの児童のリピート支援:</strong> ボールを持っていない児童も一緒に声を出せるよう、「せーの、〇〇！」と合図を出していただけると教室全体が活気づきます。</li>
          <li><strong>ミッションの一緒の盛り上げ:</strong> 恥ずかしがり屋のお子さんの場合、担任の先生やLevi-senseiが一緒にミッションを行うことで、安心して笑顔になれます。</li>
        </ul>
      </div>

      <div class="box">
        <div class="box-title">
          <span class="icon">⌨️</span>
          <span>操作方法・ショートカットキー</span>
        </div>
        <table class="keys-table">
          <tr>
            <td>Space / Enter</td>
            <td><strong>パス！ / 次のラウンド</strong>（PCキーボードで瞬時に操作）</td>
          </tr>
          <tr>
            <td>P キー</td>
            <td><strong>一時停止 / 再開</strong>（児童がつまずいた時のフォロー用）</td>
          </tr>
          <tr>
            <td>R キー</td>
            <td><strong>リセット</strong>（第1ラウンドに戻す）</td>
          </tr>
          <tr>
            <td>音声ボタン 🔊</td>
            <td>単語の横のスピーカーを押すと、いつでもネイティブ発音を再確認</td>
          </tr>
        </table>
        <div style="margin-top: 2mm; font-size: 8pt; color: #475569; background: #e2e8f0; padding: 1.5mm 2mm; border-radius: 1.5mm;">
          💡 <strong>テーマ切替:</strong> 🥔 ホットポテト / 🎈 風船ポップ / 🍿 ポップコーンの3種から好みに応じて選べます。
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <div>Levi-Sensei Elementary English Platform • Hot Potato & Pop Relay</div>
      <div>Page 1 of 1 (A4 Printable Teacher Handout)</div>
    </div>
  </div>
</body>
</html>`;
  };

  // 1. Silent iFrame Printing (Standard across platform)
  const handlePrint = () => {
    const html = buildPrintHTML();
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(html);
    doc.close();

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

  // 2. Open in New Tab for inspection/saving as PDF
  const handleOpenInNewTab = () => {
    const html = buildPrintHTML();
    const newTab = window.open('', '_blank');
    if (newTab) {
      newTab.document.open();
      newTab.document.write(html);
      newTab.document.close();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-300 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] select-none">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500 text-slate-950 font-black">
              <BookOpen size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>{t('Teacher Guide & Activity Rules', '指導案・あそび方説明書')}</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white">
                  A4 Print Ready
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('Hot Potato & Pop Relay • Handout for Homeroom Teacher (HRT)', 'ホットポテト＆ポップ・リレー • 担任の先生用配布資料')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Language view toggles for modal */}
            <div className="flex bg-slate-200 dark:bg-slate-800 rounded-xl p-0.5 text-xs font-bold">
              <button
                onClick={() => setManualLang('bilingual')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  manualLang === 'bilingual' ? 'bg-amber-500 text-slate-950 font-black shadow' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                🌐 日英併記
              </button>
              <button
                onClick={() => setManualLang('ja')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  manualLang === 'ja' ? 'bg-amber-500 text-slate-950 font-black shadow' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                🇯🇵 日本語
              </button>
              <button
                onClick={() => setManualLang('en')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  manualLang === 'en' ? 'bg-amber-500 text-slate-950 font-black shadow' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                🇺🇸 English
              </button>
            </div>

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

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-100 dark:bg-slate-950/70 text-slate-900 dark:text-slate-100 text-sm">
          {/* Card 1: Overview & Goal */}
          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-base font-black text-amber-500 flex items-center gap-2 mb-2">
              <Sparkles size={18} />
              <span>{t('1. Overview & Learning Goals', '1. 活動の概要とねらい')}</span>
            </h3>
            {(manualLang === 'bilingual' || manualLang === 'ja') && (
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-2 font-medium">
                <strong>「間違えても大丈夫！みんなで楽しく声に出そう！」</strong><br/>
                画面に表示された英語のイラストや数字を見ながら、柔らかいボールやぬいぐるみを隣の児童へ手渡していくリズムリレーゲームです。
                単語を発話することで次の児童へパスできるため、自然な発話意欲と積極性を育みます。
              </p>
            )}
            {(manualLang === 'bilingual' || manualLang === 'en') && (
              <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed italic">
                A lively, low-anxiety speaking relay where students pass an object (soft ball, plush, beanbag) while repeating or producing the vocabulary on screen. Forward progress requires speaking, promoting oral confidence and active listening.
              </p>
            )}
          </div>

          {/* Card 2: Step-by-Step Flow */}
          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-base font-black text-indigo-400 flex items-center gap-2 mb-3">
              <CheckCircle2 size={18} />
              <span>{t('2. How to Play (4 Steps)', '2. ゲームの進め方（4つのステップ）')}</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                <div className="font-black text-indigo-600 dark:text-indigo-400 mb-1 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold">1</span>
                  <span>{t('Start & Formation', 'スタート・隊形')}</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {t(
                    'Students form a circle or sit at desks in a snake/zigzag pattern. Teacher presses Start, and the first word card appears with native audio.',
                    '自席の列順（ジグザグ）またはサークル隊形を作ります。Levi-senseiがスタートを押すと、画面に第1問のカードが表示されネイティブ音声が流れます。'
                  )}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                <div className="font-black text-indigo-600 dark:text-indigo-400 mb-1 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold">2</span>
                  <span>{t('Say & Pass!', '単語を言ってパス！')}</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {t(
                    'The student with the ball says the word (e.g. "Red!"). Class choruses together. Student passes the ball to neighbor, and teacher presses Space/Pass for the next word.',
                    'ボールを持った児童が単語（例:「Red!」）を言い、クラス全員で「Red!」とエコー。言えたら隣の友達へパス！先生がSpaceキーを押すと次の単語が出ます。'
                  )}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                <div className="font-black text-amber-500 mb-1 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 text-xs flex items-center justify-center font-bold">3</span>
                  <span>{t('Mystery Pop! (Freeze)', 'シークレットタイマーでポップ！')}</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {t(
                    'At a secret randomized time (12–38s), the music sizzles and the potato gets TOO HOT / balloon POPS! The student holding the ball is the "Star of the Round"!',
                    'ランダムな秒数（12〜38秒）で突然タイマーが停止し、「アツアツ！🔥」や「パチン！🎈」と爆発！ボールを持っていた児童が「ラッキーな本日の主役」です。'
                  )}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                <div className="font-black text-emerald-500 mb-1 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-xs flex items-center justify-center font-bold">4</span>
                  <span>{t('Fun Mini-Mission', '楽しいミニミッション')}</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {t(
                    'A safe, energetic mini-mission appears (e.g. "Touch your nose and jump!", "High-five neighbor!"). The whole class cheers and applauds!',
                    '画面に安全で楽しいミニミッション（鼻をさわってジャンプ、動物の鳴きまね等）が出現。クリアしたらクラス全員で「Good job!」と大拍手！'
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Card 3: Homeroom Teacher (HRT) Collaboration Tips */}
          <div className="p-4 bg-amber-500/10 dark:bg-amber-950/30 rounded-2xl border-2 border-amber-400/50 shadow-sm">
            <h3 className="text-base font-black text-amber-600 dark:text-amber-400 flex items-center gap-2 mb-2">
              <Users size={18} />
              <span>{t('3. Homeroom Teacher Support Tips', '3. 担任の先生へのお願い・サポートのポイント')}</span>
            </h3>
            <ul className="space-y-2 text-xs sm:text-sm text-slate-700 dark:text-slate-200">
              <li className="flex items-start gap-2">
                <span className="font-black text-amber-500 shrink-0">•</span>
                <div>
                  <strong>{t('Passing Order Guidance (Grade 1):', 'パスの方向・順番の誘導（特に小1）:')}</strong>{' '}
                  {t(
                    '1st graders sometimes hesitate who to pass to next. Standing near the aisles and gesturing to the next child keeps the relay flowing smoothly.',
                    '1年生は誰に渡せば良いか迷ってしまうことがあります。通路に立って「次は〇〇さんだよ」とジェスチャーで誘導していただけると、ボールがスムーズに回ります。'
                  )}
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-black text-amber-500 shrink-0">•</span>
                <div>
                  <strong>{t('Choral Repetition:', '周りの児童のリピート支援:')}</strong>{' '}
                  {t(
                    'Encourage waiting students to echo the word so everyone stays engaged and practicing simultaneously.',
                    'ボールを持っていない児童も一緒に声を出せるよう、「せーの、〇〇！」と合図を出していただけると、教室全体の一体感と発話量がグンとアップします。'
                  )}
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-black text-amber-500 shrink-0">•</span>
                <div>
                  <strong>{t('Mission Cheerleading:', 'ミッションの一緒の盛り上げ:')}</strong>{' '}
                  {t(
                    'If a child is shy, joining in and doing the mini-mission together with Levi-sensei makes it super fun and 100% anxiety-free.',
                    'ちょっぴり恥ずかしがり屋のお子さんの場合、担任の先生やLevi-senseiが一緒にミッションを行うことで、安心して笑顔でチャレンジできます。'
                  )}
                </div>
              </li>
            </ul>
          </div>

          {/* Card 4: Keyboard Shortcuts & Controls */}
          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-base font-black text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-2">
              <Keyboard size={18} />
              <span>{t('4. Teacher Controls & Keyboard Shortcuts', '4. 画面操作・キーボード操作')}</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="font-black font-mono text-indigo-500 block text-sm">Space / Enter</span>
                <span className="text-slate-600 dark:text-slate-400 font-bold">{t('Pass / Next Round', 'パス！ / 次のラウンド')}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="font-black font-mono text-indigo-500 block text-sm">P Key</span>
                <span className="text-slate-600 dark:text-slate-400 font-bold">{t('Pause / Resume', '一時停止 / 再開')}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="font-black font-mono text-indigo-500 block text-sm">R Key</span>
                <span className="text-slate-600 dark:text-slate-400 font-bold">{t('Reset to Round 1', 'リセット')}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="font-black text-amber-500 block text-sm">🔊 Speaker</span>
                <span className="text-slate-600 dark:text-slate-400 font-bold">{t('Replay Native Audio', '発音の再確認')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenInNewTab}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition"
              title={t('Open full printable sheet in new tab', '別ウィンドウで開く')}
            >
              <ExternalLink size={14} />
              <span>{t('Open in New Tab', '別タブで開く')}</span>
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
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm shadow-lg hover:shadow-xl transition transform active:scale-95 border-2 border-amber-300"
            >
              <Printer size={18} />
              <span>{t('🖨️ Print 1-Page A4 Handout', '🖨️ A4指導案・説明書を印刷')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
