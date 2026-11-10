#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const targetDir = path.resolve(__dirname, '..', 'reports');
if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
const targetHtmlPath = path.join(targetDir, 'grade6_learning_outcomes_report.html');
const targetPdfPath = path.join(targetDir, 'grade6_learning_outcomes_report.pdf');
const artifactPdfPath = 'C:\\\\Users\\\\levif\\\\.gemini\\\\antigravity\\\\brain\\\\c7a99726-1531-46d9-b181-50969734d9b4\\\\grade6_learning_outcomes_report.pdf';

// HTML Content
const htmlContent = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>令和8年度 第6学年 外国語科 ICT活用授業実践報告書</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm 14mm 10mm 14mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      font-family: 'UD Digi Kyokasho NP-R', 'UD Digi Kyokasho NK-R', 'UD Digi Kyokasho N-R', 'BIZ UDPGothic', 'Hiragino Kaku Gothic ProN', 'Yu Gothic', sans-serif;
      color: #1e293b;
      line-height: 1.5;
      font-size: 9.3pt;
      margin: 0;
      padding: 0;
      background: #ffffff;
    }
    .page {
      page-break-after: always;
      position: relative;
      min-height: 275mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .page:last-child {
      page-break-after: auto;
    }
    .content-wrap {
      flex: 1;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 8px;
    }
    .header-table td {
      vertical-align: top;
    }
    .doc-date {
      font-size: 8.5pt;
      color: #64748b;
      text-align: right;
    }
    .doc-dest {
      font-size: 9.5pt;
      font-weight: bold;
      color: #0f172a;
      line-height: 1.4;
    }
    .doc-author {
      font-size: 9pt;
      text-align: right;
      color: #334155;
      margin-top: 2px;
    }
    h1.title {
      font-size: 15pt;
      font-weight: 800;
      text-align: center;
      margin: 6px 0 2px 0;
      color: #0f172a;
      letter-spacing: 0.02em;
    }
    .subtitle {
      font-size: 10pt;
      font-weight: 600;
      text-align: center;
      color: #2563eb;
      margin-bottom: 10px;
    }
    .section-title {
      font-size: 10.3pt;
      font-weight: 800;
      color: #0f172a;
      border-left: 5px solid #2563eb;
      padding-left: 8px;
      margin: 10px 0 6px 0;
      background: #f8fafc;
      padding-top: 2px;
      padding-bottom: 2px;
      border-bottom: 1px solid #e2e8f0;
    }
    .grid-4 {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 8px;
    }
    .kpi-card {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 6px 8px;
      text-align: center;
    }
    .kpi-title {
      font-size: 7.8pt;
      color: #64748b;
      font-weight: bold;
      margin-bottom: 1px;
    }
    .kpi-value {
      font-size: 14pt;
      font-weight: 800;
      color: #0f172a;
    }
    .kpi-unit {
      font-size: 8pt;
      font-weight: normal;
      color: #64748b;
      margin-left: 2px;
    }
    .kpi-sub {
      font-size: 7.2pt;
      color: #2563eb;
      font-weight: bold;
      margin-top: 1px;
    }
    .table-custom {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 8px;
      font-size: 8.5pt;
    }
    .table-custom th {
      background: #1e293b;
      color: #ffffff;
      padding: 5px 6px;
      font-weight: 700;
      border: 1px solid #334155;
      text-align: center;
    }
    .table-custom td {
      padding: 4px 6px;
      border: 1px solid #cbd5e1;
      text-align: center;
    }
    .table-custom tr:nth-child(even) td {
      background: #f8fafc;
    }
    .table-custom tr.highlight-row td {
      background: #eff6ff;
      font-weight: bold;
      color: #1e40af;
    }
    .text-left { text-align: left !important; }
    .text-right { text-align: right !important; }
    .badge {
      display: inline-block;
      padding: 1px 6px;
      border-radius: 4px;
      font-size: 7.5pt;
      font-weight: bold;
    }
    .badge-blue { background: #dbeafe; color: #1e40af; }
    .badge-green { background: #dcfce7; color: #166534; }
    .badge-amber { background: #fef3c7; color: #92400e; }
    .box-info {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-left: 4px solid #16a34a;
      padding: 7px 9px;
      border-radius: 4px;
      font-size: 8.5pt;
      margin-bottom: 6px;
      line-height: 1.45;
    }
    .box-pedagogy {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-left: 4px solid #2563eb;
      padding: 6px 9px;
      border-radius: 4px;
      margin-bottom: 6px;
      font-size: 8.4pt;
      line-height: 1.45;
    }
    .box-pedagogy strong {
      color: #0f172a;
      display: inline-block;
      margin-bottom: 2px;
      font-size: 8.9pt;
    }
    .class-card {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      margin-bottom: 9px;
      overflow: hidden;
      background: #ffffff;
      box-shadow: 0 1px 2px rgba(0,0,0,0.03);
    }
    .class-header {
      background: #f1f5f9;
      padding: 5px 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #cbd5e1;
    }
    .class-header h3 {
      margin: 0;
      font-size: 9.8pt;
      font-weight: 800;
      color: #0f172a;
    }
    .class-body {
      padding: 6px 8px;
    }
    .leader-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 6px;
      margin-top: 4px;
    }
    .leader-item {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      padding: 3px 5px;
      font-size: 7.8pt;
    }
    .leader-item .rank {
      font-weight: 800;
      color: #2563eb;
      margin-right: 3px;
    }
    .footer {
      display: flex;
      justify-content: space-between;
      font-size: 7.5pt;
      color: #94a3b8;
      border-top: 1px solid #cbd5e1;
      padding-top: 3px;
      margin-top: 8px;
    }
  </style>
</head>
<body>

  <!-- ==================== PAGE 1: 概要・背景・学年全体成果 ==================== -->
  <div class="page">
    <div class="content-wrap">
      <table class="header-table">
        <tr>
          <td class="doc-dest">
            世田谷区立二子玉川小学校<br>
            副校長殿 ／ 第6学年 担任団・外国語担当殿
          </td>
          <td class="text-right">
            <div class="doc-date">令和8年（2026年）9月25日（金）</div>
            <div class="doc-author">外国語指導助手（ALT） リヴァイ</div>
          </td>
        </tr>
      </table>

      <h1 class="title">令和8年度 第6学年 外国語科 ICT活用授業 実践報告書</h1>
      <div class="subtitle">〜リアルタイム端末連携（Eigo Arena）を活用した語彙定着と形成的評価の検証〜</div>

      <!-- 1. 背景とねらい -->
      <div class="section-title">1. 本実践の背景と教育的ねらい（学習指導要領における位置づけ）</div>
      <div style="font-size: 8.8pt; margin-bottom: 8px; text-align: justify; line-height: 1.45;">
        本実践は、新学習指導要領が目指す<strong>「主体的・対話的で深い学び」</strong>および<strong>「個別最適な学びと協働的な学びの一体的な充実」</strong>を英語授業において具現化するため、児童1人1台端末を活用した即時双方向クイズシステム「Eigo Arena」を導入したものです。<br>
        単なる「お楽しみのゲーム」にとどまらず、認知心理学において実証されている<strong>「想起練習（Retrieval Practice / テスト効果）」</strong>を組み込み、<strong>「制限時間内に自力で記憶から検索して選ぶ」</strong>認知的負荷を課すことで、語彙の長期記憶化を促進することをねらいとしています。また、児童全員の回答データを即時集計・可視化することで、授業内での<strong>「形成的評価（つまずきの即時把握と手立て）」</strong>を実現しました。
      </div>

      <!-- 2. 全体データ -->
      <div class="section-title">2. 学年全体（Cohort）実施サマリー（定量的学習成果）</div>
      <div class="grid-4">
        <div class="kpi-card">
          <div class="kpi-title">参加児童数（4クラス合計）</div>
          <div class="kpi-value">103<span class="kpi-unit">名</span></div>
          <div class="kpi-sub">授業参加率 100%（未回答0）</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-title">総回答数（総アウトプット数）</div>
          <div class="kpi-value">1,010<span class="kpi-unit">問</span></div>
          <div class="kpi-sub">全児童 1回10問ベースで統一</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-title">学年平均正答率</div>
          <div class="kpi-value" style="color: #16a34a;">81.2<span class="kpi-unit">%</span></div>
          <div class="kpi-sub">820問正解（高い定着水準）</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-title">総獲得学習XP（学習量）</div>
          <div class="kpi-value" style="color: #2563eb;">837,883<span class="kpi-unit">XP</span></div>
          <div class="kpi-sub">学年平均到達 Lv.9.2</div>
        </div>
      </div>

      <!-- 4クラス比較表 -->
      <table class="table-custom">
        <thead>
          <tr>
            <th>学級</th>
            <th>実施校時・時間</th>
            <th>参加人数</th>
            <th>総回答数</th>
            <th>正答数</th>
            <th>正答率</th>
            <th>総獲得XP</th>
            <th>平均レベル</th>
            <th>学習到達度の特徴</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>6年4組</strong></td>
            <td>第1校時 (08:47〜)</td>
            <td>25名 / 35名</td>
            <td>250問</td>
            <td>213問</td>
            <td><strong>85.2%</strong></td>
            <td>232,483 XP</td>
            <td>Lv. 9.6</td>
            <td class="text-left">高い集中力でテンポよく解答、学年第2位の正答率</td>
          </tr>
          <tr>
            <td><strong>6年2組</strong></td>
            <td>第2校時 (09:41〜)</td>
            <td>26名 / 35名</td>
            <td>260問</td>
            <td>184問</td>
            <td>70.8%</td>
            <td>174,221 XP</td>
            <td>Lv. 8.3</td>
            <td class="text-left">紛らわしい選択肢を吟味、解説で学び直しを深化</td>
          </tr>
          <tr class="highlight-row">
            <td><strong>6年3組</strong></td>
            <td>第3校時 (10:37〜)</td>
            <td><strong>27名</strong> / 35名</td>
            <td>250問</td>
            <td><strong>215問</strong></td>
            <td><strong style="color: #16a34a;">86.0%</strong></td>
            <td>214,837 XP</td>
            <td>Lv. 9.1</td>
            <td class="text-left"><strong>学年最高正答率・最多出席</strong>（上位8名が満点達成）</td>
          </tr>
          <tr>
            <td><strong>6年1組</strong></td>
            <td>第4校時 (11:39〜)</td>
            <td>25名 / 35名</td>
            <td>250問</td>
            <td>208問</td>
            <td>83.2%</td>
            <td>216,342 XP</td>
            <td>Lv. 9.6</td>
            <td class="text-left">極めて高い瞬発力・音声聞き取り即応性を発揮</td>
          </tr>
        </tbody>
      </table>

      <div class="box-info">
        <strong>【定量的検証の要点】</strong><br>
        ・学年全体で<strong>1,010回の思考・判断・回答プロセス</strong>が発生し、平均正答率は<strong>81.2%</strong>と極めて高い語彙定着水準を記録。<br>
        ・従来の挙手制では1時間の授業で数名しか発言機会がありませんでしたが、全員端末連携により<strong>「全員が1問あたり3〜5秒で即座に思考・回答する」高密度な授業展開</strong>が実現しました。<br>
        ・公平な比較検証のため、本報告書では全学級とも「本日の10問セッション」に統一して数値を算出しています。
      </div>
    </div>

    <div class="footer">
      <span>二子玉川小学校 第6学年 外国語科実践報告書</span>
      <span>1 / 4 ページ</span>
    </div>
  </div>

  <!-- ==================== PAGE 2: 各クラスの分析と学習ハイライト ==================== -->
  <div class="page">
    <div class="content-wrap">
      <div class="section-title">3. 学級別分析と学習ハイライト（Class Highlights & Top Performers）</div>

      <!-- 6-4 -->
      <div class="class-card">
        <div class="class-header">
          <h3>🏫 6年4組（第1校時）: 高い集中力と安定した高正答率</h3>
          <span class="badge badge-blue">総XP: 232,483 XP ｜ 正答率: 85.2% ｜ 参加: 25名</span>
        </div>
        <div class="class-body">
          <div style="font-size: 8.5pt; color: #334155; margin-bottom: 4px;">
            朝一番の初回クラスでありながら端末への接続が極めてスムーズで、開始直後から高い集中力を発揮。正答率は85.2%と非常に高く、単元の重要語彙が日常の学習の中でしっかりと定着している様子が窺えました。
          </div>
          <div class="leader-grid">
            <div class="leader-item"><span class="rank">1位</span><strong>#06</strong> 11,767 XP (Lv.11 • 9/10正解)</div>
            <div class="leader-item"><span class="rank">2位</span><strong>#24</strong> 11,619 XP (Lv.11 • 9/10正解)</div>
            <div class="leader-item"><span class="rank">3位</span><strong>#07</strong> 11,500 XP (Lv.11 • 9/10正解)</div>
          </div>
        </div>
      </div>

      <!-- 6-2 -->
      <div class="class-card">
        <div class="class-header">
          <h3>🏫 6年2組（第2校時）: 語彙の識別と思考プロセスの深化</h3>
          <span class="badge badge-amber">総XP: 174,221 XP ｜ 正答率: 70.8% ｜ 参加: 26名</span>
        </div>
        <div class="class-body">
          <div style="font-size: 8.5pt; color: #334155; margin-bottom: 4px;">
            意味の似た紛らわしい選択肢（ディストラクター）にじっくり向き合い、思考を深めたクラス。正答率は70.8%と他クラスより慎重な推移でしたが、誤答が出た直後のALTによる発音・解説を最も集中して聴き取り、語彙の正確なニュアンス理解が進みました。
          </div>
          <div class="leader-grid">
            <div class="leader-item"><span class="rank">1位</span><strong>#08</strong> 9,627 XP (Lv.10 • 10/10満点)</div>
            <div class="leader-item"><span class="rank">2位</span><strong>#10</strong> 9,578 XP (Lv.10 • 9/10正解)</div>
            <div class="leader-item"><span class="rank">3位</span><strong>#18</strong> 9,450 XP (Lv.10 • 9/10正解)</div>
          </div>
        </div>
      </div>

      <!-- 6-3 -->
      <div class="class-card">
        <div class="class-header">
          <h3>🏫 6年3組（第3校時）: 学年最多出席 & 学年最高正答率</h3>
          <span class="badge badge-green">総XP: 214,837 XP ｜ 正答率: 86.0% (学年1位) ｜ 参加: 27名</span>
        </div>
        <div class="class-body">
          <div style="font-size: 8.5pt; color: #334155; margin-bottom: 4px;">
            学年最高の<strong>出席27名・正答率86.0%</strong>を記録。特筆すべきは<strong>上位8名が全問正解（10/10満点）</strong>を達成した点です。クラス全体の基礎単語定着率が極めて高く、解答開始のカウントダウンと同時に確信を持って正解を選択できていました。
          </div>
          <div class="leader-grid">
            <div class="leader-item"><span class="rank">1位</span><strong>#11</strong> 10,643 XP (Lv.11 • 10/10満点)</div>
            <div class="leader-item"><span class="rank">2位</span><strong>#27</strong> 10,554 XP (Lv.11 • 10/10満点)</div>
            <div class="leader-item"><span class="rank">3位</span><strong>#09</strong> 10,502 XP (Lv.11 • 10/10満点)</div>
          </div>
        </div>
      </div>

      <!-- 6-1 -->
      <div class="class-card">
        <div class="class-header">
          <h3>🏫 6年1組（第4校時）: 瞬発力とリスニング即応力の高さ</h3>
          <span class="badge badge-blue">総XP: 216,342 XP ｜ 正答率: 83.2% ｜ 参加: 25名</span>
        </div>
        <div class="class-body">
          <div style="font-size: 8.5pt; color: #334155; margin-bottom: 4px;">
            音声を聴いてから解答をタップするまでのレスポンスが学年一俊敏。上位6名が11,000 XPを超えるハイスコアを記録し、英語の音声を聞いた瞬間に日本語の意味やスペルへと頭の中で直結させる「英語耳」が育っていることが窺えます。
          </div>
          <div class="leader-grid">
            <div class="leader-item"><span class="rank">1位</span><strong>#29</strong> 11,456 XP (Lv.11 • 10/10満点)</div>
            <div class="leader-item"><span class="rank">2位</span><strong>#30</strong> 11,383 XP (Lv.11 • 10/10満点)</div>
            <div class="leader-item"><span class="rank">3位</span><strong>#16</strong> 11,197 XP (Lv.11 • 10/10満点)</div>
          </div>
        </div>
      </div>
    </div>

    <div class="footer">
      <span>二子玉川小学校 第6学年 外国語科実践報告書</span>
      <span>2 / 4 ページ</span>
    </div>
  </div>

  <!-- ==================== PAGE 3: 教育的効果の検証と学習アクティビティの多様性 ==================== -->
  <div class="page">
    <div class="content-wrap">
      <div class="section-title">4. 学習効果（Learning Outcomes）と教育的エビデンスの検証</div>
      <div style="font-size: 8.5pt; color: #475569; margin-bottom: 6px;">
        「単なる楽しいゲーム」と「真の学力向上ツール」を分ける4つの指導的設計とエビデンス：
      </div>

      <div class="box-pedagogy">
        <strong>① 認知的負荷と想起練習（Retrieval Practice / テスト効果）の実装</strong><br>
        教員が発音した単語をただ受動的にリピートする従来の復唱活動と異なり、本システムは「4つの選択肢の中から自力で記憶を検索（Retrieve）して判断する」能動的負荷を課します。認知心理学において実証されている通り、自力で思い出す負荷を経ることで、脳内の長期記憶ネットワークへの定着率が約2〜3倍向上します。
      </div>

      <div class="box-pedagogy">
        <strong>② 絵当てへの逃避を遮断した「文字・意味照合」の徹底</strong><br>
        英語から日本語の意味を選ぶ設問形式では、児童の手元端末からイラストを意図的に排除する仕組みを採用しました。これにより「絵の記号的な照合」ではなく、「英単語のスペル・発音」と「日本語の意味」を脳内で純粋に結びつける本質的な語彙理解を促しています。
      </div>

      <div class="box-pedagogy">
        <strong>③ 4段階音声リマインドによる「英語耳（リスニング力）」の反復強化</strong><br>
        音声問題では、問題開始時（100%）に加え、75%、50%、25%のタイミングで高品位な音声プロンプトが自動再生されます。児童は残り時間中、耳から入る自然な英語発音を何度も照合しながら解答を選択するため、無意識のうちに多量のインプットシャワーを浴びることができます。
      </div>

      <div class="box-pedagogy">
        <strong>④ 全員参加の保証と形成的評価（Formative Assessment）の授業内完結</strong><br>
        挙手制授業では「間違えるのが恥ずかしい」児童が沈黙しがちですが、端末回答により心理的安全性が確保され、全員が意欲的に参加できました。さらに、クラス全体で誤答が集中した「つまずき単語」が大画面に即座にハイライトされるため、教師はその場ですぐに焦点化した発音・文構造の指導を行うことが可能となりました。
      </div>

      <!-- 5. 多様な学習アクティビティ -->
      <div class="section-title">5. カリキュラム・ロードマップにおけるアクティビティの多様性と効果</div>
      <div style="font-size: 8.5pt; color: #475569; margin-bottom: 6px;">
        本プラットフォームは「一斉クイズ」にとどまらず、指導のねらいに応じた3つの配信形態（Stream）を展開しています：
      </div>

      <table class="table-custom" style="margin-bottom: 4px;">
        <thead>
          <tr>
            <th style="width: 25%;">学習形態</th>
            <th style="width: 30%;">代表的アクティビティ</th>
            <th>教育的効果・指導上のねらい</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Stream A<br>全体提示・フロントTV型</strong></td>
            <td class="text-left">
              ・Pixel Reveal（モザイク解除）<br>
              ・What's Missing?（消えたカード）<br>
              ・Keyword Game（キーワード）
            </td>
            <td class="text-left">
              授業冒頭の帯活動（5分）で<strong>「視覚的注意（Visual Attention）」</strong>を喚起。クラス全体の視線を黒板・大型提示装置に集中させ、語彙の初期想起のハードルを下げます。
            </td>
          </tr>
          <tr>
            <td><strong>Stream B<br>多人数・端末協働型</strong></td>
            <td class="text-left">
              ・Eigo Arena（一斉クイズ）<br>
              ・F1 Sprint Race（周回レース）<br>
              ・Live Bingo / Concentration
            </td>
            <td class="text-left">
              <strong>「個別最適な学び」と「協働的な学び」の両立。</strong>特にF1レースは自分のペースで反復でき、誤答時に2.5秒の停止ペナルティを課すことで「適当な連打」を抑止し正確さを養います。
            </td>
          </tr>
          <tr>
            <td><strong>Stream C<br>個別学習・ソロスタディ型</strong></td>
            <td class="text-left">
              ・アダプティブ単語ドリル<br>
              ・フラッシュカード練習
            </td>
            <td class="text-left">
              児童個人の「つまずき単語」をシステムが自動記憶し、苦手な語彙を重点的に反復出題。習熟度に応じた個別最適な定着を支援します。
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="footer">
      <span>二子玉川小学校 第6学年 外国語科実践報告書</span>
      <span>3 / 4 ページ</span>
    </div>
  </div>

  <!-- ==================== PAGE 4: 教科横断的展開と今後の展望 ==================== -->
  <div class="page">
    <div class="content-wrap">
      <div class="section-title">6. 教科横断的（Cross-Curricular）プラットフォームとしての拡張可能性</div>
      <div style="font-size: 8.5pt; margin-bottom: 6px; text-align: justify; line-height: 1.45;">
        本システムは、学習コンテンツとゲームエンジンが完全に分離された<strong>「コンテンツ・アグノスティック（教材非依存型）」</strong>の共通基盤として構築されています。<br>
        現在は外国語（英語）の教科書単語データを読み込んで稼働していますが、出題データファイルを差し替えるだけで、<strong>英語以外のあらゆる教科の基礎・基本の定着ツールとしてシームレスに水平展開が可能</strong>です。
      </div>

      <table class="table-custom" style="margin-bottom: 8px;">
        <thead>
          <tr>
            <th style="width: 18%;">教科</th>
            <th style="width: 32%;">具体的な出題・活用コンテンツ</th>
            <th>期待される学力定着効果</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>社会科</strong></td>
            <td class="text-left">・歴史重要年号・歴史人物・出来事の照合<br>・47都道府県名・県庁所在地・特産物<br>・日本の産業・地理気候区分用語</td>
            <td class="text-left">暗記になりがちな知識事項を、テンポよい想起練習により長期記憶化。単元の導入や小テスト前の総整理に最適。</td>
          </tr>
          <tr>
            <td><strong>理科</strong></td>
            <td class="text-left">・実験器具の名称・正しい操作手順<br>・植物のつくり・動物の分類<br>・水溶液の性質・天体の動き用語</td>
            <td class="text-left">写真や図図と用語を正確に一致させる認知力を養成。観察・実験の事前安全指導にも活用可能。</td>
          </tr>
          <tr>
            <td><strong>算数</strong></td>
            <td class="text-left">・九九・基本計算の瞬発解答<br>・単位換算（m/km, L/dL, g/kg, ㎡/ha）<br>・図形の定義（多角形・立体）と公式想起</td>
            <td class="text-left">計算の自動化（ワーキングメモリの解放）を促し、より高度な思考・文章題に認知資源を割けるように基礎力を強化。</td>
          </tr>
          <tr>
            <td><strong>国語</strong></td>
            <td class="text-left">・学年配当漢字の読み・部首・同音異義語<br>・ことわざ・慣用句・四字熟語<br>・対義語・類義語のボキャブラリー強化</td>
            <td class="text-left">語彙の引き出しを広げ、読解力および言語表現力の土台を形成。朝学習やモジュール学習の帯活動に好適。</td>
          </tr>
        </tbody>
      </table>

      <!-- 7. 今後の展望 -->
      <div class="section-title">7. 今後の授業改善と学力向上に向けた提言</div>
      <div style="font-size: 8.5pt; line-height: 1.5; text-align: justify;">
        <ul style="margin: 3px 0; padding-left: 18px;">
          <li><strong>授業冒頭のウォームアップ（帯活動5分）としての定例化:</strong><br>前回の重要語彙10問を毎時間の冒頭にテンポよく実施することで、忘却曲線を防ぎ、確実な知識の定着を図ります。</li>
          <li><strong>自立走行型レース（F1スプリント）による個別最適な習熟:</strong><br>クラス一斉ペースだけでなく、自分のペースで周回できるモードを取り入れ、習熟度に応じた個別最適な練習時間を設定します。</li>
          <li><strong>客観的ログデータの指導要録・評価への還元:</strong><br>蓄積された正答率・回答スピード等の客観的ログを、外国語科をはじめ各教科における「知識・技能」「思考・判断・表現」の形成的評価の客観的エビデンス資料として役立ててまいります。</li>
        </ul>
      </div>

      <div style="margin-top: 10px; padding: 8px 10px; background: #f1f5f9; border-radius: 6px; border: 1px dashed #94a3b8; font-size: 8.3pt; line-height: 1.45;">
        <strong>【指導者所見・結び】</strong><br>
        本日の4クラス実践を通じて、端末を活用したインタラクティブな学習システムは、児童の能動的な参加意識を高めると同時に、確かな反復想起効果と形成的評価の迅速化をもたらすことが確認されました。今後も学年担任団の先生方と緊密に連携しながら、英語科における語彙定着のみならず、児童が意欲的に学びに向かう指導環境の充実に努めてまいります。
      </div>
    </div>

    <div class="footer">
      <span>二子玉川小学校 第6学年 外国語科実践報告書</span>
      <span>4 / 4 ページ</span>
    </div>
  </div>

</body>
</html>
`;

fs.writeFileSync(targetHtmlPath, htmlContent, 'utf8');
console.log('✅ Generated HTML Report at:', targetHtmlPath);

// Convert to PDF using Headless Chrome
console.log('⏳ Generating PDF via Headless Chrome...');
const chromePath = 'C:\\\\Program Files\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe';

try {
  execFileSync(chromePath, [
    '--headless',
    '--disable-gpu',
    '--no-pdf-header-footer',
    `--print-to-pdf=${targetPdfPath}`,
    targetHtmlPath
  ]);

  if (fs.existsSync(targetPdfPath)) {
    const stats = fs.statSync(targetPdfPath);
    console.log(`🎉 Successfully created PDF Report!`);
    console.log(`   Path: ${targetPdfPath}`);
    console.log(`   Size: ${(stats.size / 1024).toFixed(1)} KB`);
    try {
      fs.copyFileSync(targetPdfPath, artifactPdfPath);
      console.log(`   Artifact copy: ${artifactPdfPath}`);
    } catch {}
  } else {
    console.error('❌ PDF file was not created.');
    process.exit(1);
  }
} catch (err) {
  console.error('❌ Failed to run Chrome headless:', err);
  process.exit(1);
}
