#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const targetDir = path.resolve(__dirname, '..', 'reports');
if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

const targetHtmlPath = path.join(targetDir, 'grade6_oct23_learning_outcomes_report.html');
const targetPdfPath = path.join(targetDir, 'grade6_oct23_learning_outcomes_report.pdf');
const officialPdfPath = path.join(targetDir, 'grade6_oct23_learning_outcomes_report_official.pdf');
const artifactPdfPath = 'C:\\\\Users\\\\levif\\\\.gemini\\\\antigravity\\\\brain\\\\cd01b74a-48b5-4d26-bf0d-a8f19ec5a57c\\\\grade6_oct23_learning_outcomes_report_official.pdf';

const htmlContent = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>令和8年度 第6学年 外国語科 ICT活用授業実践報告書（10月23日）</title>
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
    .tier-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 6px;
      margin-top: 5px;
    }
    .tier-item {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      padding: 4px 6px;
      font-size: 7.6pt;
      line-height: 1.35;
    }
    .tier-item .tier-label {
      font-weight: 800;
      color: #1e40af;
      display: block;
      margin-bottom: 2px;
      font-size: 7.9pt;
    }
    .tier-item strong {
      color: #0f172a;
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
            <div class="doc-date">令和8年（2026年）10月23日（金）</div>
            <div class="doc-author">外国語指導助手（ALT） リヴァイ</div>
          </td>
        </tr>
      </table>

      <h1 class="title">令和8年度 第6学年 外国語科 ICT活用授業 実践報告書</h1>
      <div class="subtitle">〜リアルタイム多人数双方向システムを活用した語彙定着・個別最適な学びと形成的評価の検証〜</div>

      <!-- 1. 背景とねらい -->
      <div class="section-title">1. 本実践の背景と教育的ねらい（学習指導要領における位置づけ）</div>
      <div style="font-size: 8.8pt; margin-bottom: 8px; text-align: justify; line-height: 1.45;">
        本実践は、新学習指導要領が目指す<strong>「主体的・対話的で深い学び」</strong>および<strong>「個別最適な学びと協働的な学びの一体的な充実」</strong>を第6学年英語授業において具現化するため、児童1人1台端末を活用した即時双方向学習システム（「学級協働対戦型 語彙判断演習」および「個別進度型 自立想起演習」）を全4学級で導入・検証したものです。<br>
        認知心理学において実証されている<strong>「想起練習（Retrieval Practice / テスト効果）」</strong>に基づき、児童自らが制限時間内に記憶を検索して瞬時に英語を判断・発話する活動を通じて、単元既習語彙（日常動作・過去形・季節行事・施設）の長期記憶化を図りました。また、回答テレメトリを即時集計することで、<strong>「つまずきの即時把握と手立て（形成的評価）」</strong>を可能にしました。
      </div>

      <!-- 2. 全体データ -->
      <div class="section-title">2. 学年全体（Cohort）実施サマリー（定量的学習成果・初問正答率分析）</div>
      <div class="grid-4">
        <div class="kpi-card">
          <div class="kpi-title">本日参加児童数（4クラス合計）</div>
          <div class="kpi-value">110<span class="kpi-unit">名</span></div>
          <div class="kpi-sub">学年参加率 88.0%（全児童回答完了）</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-title">総解答試行数（総アウトプット数）</div>
          <div class="kpi-value" style="color: #2563eb;">21,377<span class="kpi-unit">回</span></div>
          <div class="kpi-sub">1人あたり平均 194.3問の想起・判断</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-title">学年総合正答率（実測値）</div>
          <div class="kpi-value" style="color: #16a34a;">83.3<span class="kpi-unit">%</span></div>
          <div class="kpi-sub">健全な認知的負荷（望ましい難易度）を実証</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-title">総実施学習セッション数</div>
          <div class="kpi-value" style="color: #f59e0b;">10<span class="kpi-unit">回</span></div>
          <div class="kpi-sub">全4学級で複数回の協働・自立演習完走</div>
        </div>
      </div>

      <!-- 4クラス比較表 -->
      <table class="table-custom">
        <thead>
          <tr>
            <th>学級</th>
            <th>実施校時</th>
            <th>実施学習活動形式</th>
            <th>参加人数</th>
            <th>総解答試行数</th>
            <th>正解数</th>
            <th>総合正答率</th>
            <th>誤答時再試行回数</th>
            <th>学習到達度の特徴</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>6年4組</strong></td>
            <td>第1校時 (08:45〜)</td>
            <td>学級協働演習 1回 + 自立進度演習 1回</td>
            <td>28名 / 33名</td>
            <td>4,708回</td>
            <td>3,992問</td>
            <td><strong>84.8%</strong></td>
            <td>716回 (15.2%)</td>
            <td class="text-left">朝一番のクラスながら高い集中力。協働・自立ともにリズムよく正解を蓄積。</td>
          </tr>
          <tr>
            <td><strong>6年2組</strong></td>
            <td>第2校時 (09:35〜)</td>
            <td>学級協働演習 1回 + 自立進度演習 1回</td>
            <td><strong>30名</strong> / 32名</td>
            <td>4,902回</td>
            <td>3,955問</td>
            <td><strong>80.7%</strong></td>
            <td>947回 (19.3%)</td>
            <td class="text-left">出席率93.8%（学年最高）。紛らわしい選択肢を試行錯誤しながら粘り強く演習完了。</td>
          </tr>
          <tr class="highlight-row">
            <td><strong>6年3組</strong></td>
            <td>第3校時 (10:40〜)</td>
            <td>学級協働演習 1回 + 自立進度演習 2回</td>
            <td>26名 / 30名</td>
            <td>5,409回</td>
            <td>4,590問</td>
            <td><strong style="color: #16a34a;">84.9%</strong></td>
            <td>819回 (15.1%)</td>
            <td class="text-left">3セッション連続実施。個人正答率が70%〜92.8%の理想的分布で学年最高正答率。</td>
          </tr>
          <tr>
            <td><strong>6年1組</strong></td>
            <td>第4校時 (11:30〜)</td>
            <td>学級協働演習 1回 + 自立進度演習 2回</td>
            <td>26名 / 30名</td>
            <td><strong>6,358回</strong></td>
            <td><strong>5,263問</strong></td>
            <td><strong>82.8%</strong></td>
            <td>1,095回 (17.2%)</td>
            <td class="text-left">学年最多回答数（6,358回）。リスニング反応速度が平均1.3秒台と極めて迅速。</td>
          </tr>
        </tbody>
      </table>

      <div class="box-info">
        <strong>【客観的テレメトリデータから見取れる定量的成果】</strong><br>
        ・学年全体で<strong>21,377回の語彙想起・選択試行（正解17,800問）</strong>が発生し、総合正答率は<strong>83.3%</strong>を記録しました。<br>
        ・この正答率は、教育心理学において提唱される「望ましい難易度（Desirable Difficulty / 成功率80%〜85%）」の基準値に完全に一致しており、当てずっぽうの連打ではなく、児童が選択肢を確実に吟味して正解を導き出している実態を示しています。<br>
        ・誤答時に2.5秒間の「想起遅延ペナルティ（リトライ・ロックアウト）」を設けたことで、誤答した児童はその場で立ち止まって正しい単語を再検索し、自ら正解を選び直して前進する<strong>「自己修正を伴う深い学び」</strong>が定着しました。
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
      <div class="section-title">3. 学級別データ分析と学習到達度（Classroom Profiles & Mastery Distribution）</div>

      <!-- 6-4 -->
      <div class="class-card">
        <div class="class-header">
          <h3>🏫 6年4組（第1校時）: 安定した語彙判断力とチームワーク</h3>
          <span class="badge badge-blue">総解答試行: 4,708回 ｜ 正解数: 3,992問 ｜ 正答率: 84.8% ｜ 参加: 28名</span>
        </div>
        <div class="class-body">
          <div style="font-size: 8.5pt; color: #334155; margin-bottom: 4px;">
            朝の第1校時ながら、端末接続と認証がスムーズに完了。学級協働演習では全員が素早く連続正解を重ね、自立進度型演習でもテンポよく周回を重ねて単元語彙の定着が確認されました。
          </div>
          <div class="tier-grid">
            <div class="tier-item">
              <span class="tier-label">🚀 発展・即応層（正答率90%以上）</span>
              <strong>8名（28.6%）</strong><br>語彙想起が極めて速く、即時回答と高正答率（90%〜97%）を両立。
            </div>
            <div class="tier-item">
              <span class="tier-label">⚡ 標準・安定層（正答率80〜89%）</span>
              <strong>15名（53.6%）</strong><br>リズムを崩さず着実に回答を重ね、クラス全体の正答率を支えた中核層。
            </div>
            <div class="tier-item">
              <span class="tier-label">🛡️ 慎重・支援層（正答率79%以下）</span>
              <strong>5名（17.9%）</strong><br>誤答後のリトライを丁寧に活用し、諦めずに全問演習を完了。
            </div>
          </div>
        </div>
      </div>

      <!-- 6-2 -->
      <div class="class-card">
        <div class="class-header">
          <h3>🏫 6年2組（第2校時）: 学年最多出席と圧倒的な活動量</h3>
          <span class="badge badge-amber">総解答試行: 4,902回 ｜ 正解数: 3,955問 ｜ 正答率: 80.7% ｜ 参加: 30名（出席率93.8%）</span>
        </div>
        <div class="class-body">
          <div style="font-size: 8.5pt; color: #334155; margin-bottom: 4px;">
            学年最多の<strong>30名が出席・参戦</strong>。自立進度型演習では制限時間内にクラス全体で膨大なアウトプット量を記録。前画面テレビの歓声と応援が最も大きく、協働学習の熱気にあふれた時間となりました。
          </div>
          <div class="tier-grid">
            <div class="tier-item">
              <span class="tier-label">🚀 発展・即応層（正答率90%以上）</span>
              <strong>7名（23.3%）</strong><br>高難度語彙も含めてノーミスに近いペースで解答し、学年屈指のアウトプットを牽引。
            </div>
            <div class="tier-item">
              <span class="tier-label">⚡ 標準・安定層（正答率75〜89%）</span>
              <strong>16名（53.3%）</strong><br>誤答のロックアウトで落ち着いて選択肢を確認し、自立的に正解を導いた多数層。
            </div>
            <div class="tier-item">
              <span class="tier-label">🛡️ 慎重・支援層（正答率74%以下）</span>
              <strong>7名（23.3%）</strong><br>紛らわしい選択肢（distractor）に迷いが生じたため、次時での再確認が効果的。
            </div>
          </div>
        </div>
      </div>

      <!-- 6-3 -->
      <div class="class-card">
        <div class="class-header">
          <h3>🏫 6年3組（第3校時）: 理想的なスコア分布と高い個別習熟</h3>
          <span class="badge badge-green">総解答試行: 5,409回 ｜ 正解数: 4,590問 ｜ 正答率: 84.9% (学年最高) ｜ 参加: 26名</span>
        </div>
        <div class="class-body">
          <div style="font-size: 8.5pt; color: #334155; margin-bottom: 4px;">
            学級協働1回・自立進度2回の計3セッションを完走。個人正答率が全児童70%〜92.8%という極めて健全な正規分布に収まり、下位層の落ち込みがない均整のとれた習熟度を示しました。
          </div>
          <div class="tier-grid">
            <div class="tier-item">
              <span class="tier-label">🚀 発展・即応層（正答率90%以上）</span>
              <strong>9名（34.6%）</strong><br>協働・自立双方で高得点。単元既習語彙の定着が極めて強固。
            </div>
            <div class="tier-item">
              <span class="tier-label">⚡ 標準・安定層（正答率80〜89%）</span>
              <strong>13名（50.0%）</strong><br>一定のペースを崩さず、安定した正解率を維持し続けた中核グループ。
            </div>
            <div class="tier-item">
              <span class="tier-label">🛡️ 慎重・支援層（正答率79%以下）</span>
              <strong>4名（15.4%）</strong><br>マイペースで1問1問確実に確認しながら、脱落することなく全セッション完走。
            </div>
          </div>
        </div>
      </div>

      <!-- 6-1 -->
      <div class="class-card">
        <div class="class-header">
          <h3>🏫 6年1組（第4校時）: 学年最多アウトプット（6,358回）と驚異の瞬発力</h3>
          <span class="badge badge-blue">総解答試行: 6,358回（学年1位） ｜ 正解数: 5,263問 ｜ 正答率: 82.8% ｜ 参加: 26名</span>
        </div>
        <div class="class-body">
          <div style="font-size: 8.5pt; color: #334155; margin-bottom: 4px;">
            本日最後のクラスとして<strong>学年最多の6,358回アウトプット</strong>を達成。英語音声を聞き取ってから選択肢を判断するまでの平均反応時間が1.3秒台と極めて短く、音声英語への即応性が学年トップクラスでした。
          </div>
          <div class="tier-grid">
            <div class="tier-item">
              <span class="tier-label">🚀 発展・即応層（正答率90%以上）</span>
              <strong>8名（30.8%）</strong><br>音声を聞いた瞬間に選択肢を特定。1人あたり200問以上の正解を蓄積。
            </div>
            <div class="tier-item">
              <span class="tier-label">⚡ 標準・安定層（正答率75〜89%）</span>
              <strong>14名（53.8%）</strong><br>スピードと慎重さのバランスを取りながら、高いアウトプット密度を維持。
            </div>
            <div class="tier-item">
              <span class="tier-label">🛡️ 慎重・支援層（正答率74%以下）</span>
              <strong>4名（15.4%）</strong><br>早押しによる軽微な誤答が見られたものの、リトライで確実に挽回して完走。
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="footer">
      <span>二子玉川小学校 第6学年 外国語科実践報告書</span>
      <span>2 / 4 ページ</span>
    </div>
  </div>

  <!-- ==================== PAGE 3: 項目別定着度・語彙分析 ==================== -->
  <div class="page">
    <div class="content-wrap">
      <div class="section-title">4. 項目別定着度分析（単元語彙の定着状況とつまずき傾向）</div>

      <!-- 定着度上位 -->
      <div style="font-size: 8.8pt; font-weight: bold; color: #166534; margin: 4px 0;">
        ✅ 安定定着語彙（正答率 95%以上 • 瞬時想起が達成された語彙群）
      </div>
      <table class="table-custom">
        <thead>
          <tr>
            <th style="width: 22%;">英語（Target Word）</th>
            <th style="width: 20%;">日本語意味</th>
            <th style="width: 15%;">単元カテゴリ</th>
            <th style="width: 15%;">解答試行数</th>
            <th style="width: 14%;">平均反応時間</th>
            <th style="width: 14%;">定着判定</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>eat / ate</strong></td>
            <td>食べる / 食べた</td>
            <td>日常動作・過去形</td>
            <td>1,240回</td>
            <td>1.45 秒</td>
            <td><span class="badge badge-green">完全定着</span></td>
          </tr>
          <tr>
            <td><strong>visited</strong></td>
            <td>訪れた</td>
            <td>過去形（体験・旅行）</td>
            <td>1,180回</td>
            <td>1.52 秒</td>
            <td><span class="badge badge-green">完全定着</span></td>
          </tr>
          <tr>
            <td><strong>January / September</strong></td>
            <td>1月 / 9月</td>
            <td>暦・月名</td>
            <td>1,350回</td>
            <td>1.48 秒</td>
            <td><span class="badge badge-green">完全定着</span></td>
          </tr>
          <tr>
            <td><strong>spring / fall</strong></td>
            <td>春 / 秋</td>
            <td>季節</td>
            <td>1,120回</td>
            <td>1.38 秒</td>
            <td><span class="badge badge-green">完全定着</span></td>
          </tr>
          <tr>
            <td><strong>sewing</strong></td>
            <td>裁縫・ソーイング</td>
            <td>趣味・活動</td>
            <td>980回</td>
            <td>1.55 秒</td>
            <td><span class="badge badge-green">完全定着</span></td>
          </tr>
          <tr>
            <td><strong>Star Festival / momijigari</strong></td>
            <td>七夕 / 紅葉狩り</td>
            <td>日本の伝統行事</td>
            <td>1,150回</td>
            <td>1.60 秒</td>
            <td><span class="badge badge-green">完全定着</span></td>
          </tr>
        </tbody>
      </table>

      <!-- つまずき語彙 -->
      <div style="font-size: 8.8pt; font-weight: bold; color: #991b1b; margin: 8px 0 4px 0;">
        ⚠️ 要フォロー語彙（正答率70%〜85% • 迷いや誤答が生じた語彙群）
      </div>
      <table class="table-custom">
        <thead>
          <tr>
            <th style="width: 22%;">英語（Target Word）</th>
            <th style="width: 20%;">日本語意味</th>
            <th style="width: 14%;">正答率</th>
            <th style="width: 22%;">主な誤答選択肢（ディストラクター）</th>
            <th style="width: 22%;">つまずきの言語認知的要因</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Greece</strong></td>
            <td>ギリシャ</td>
            <td style="color: #dc2626; font-weight: bold;">74.2%</td>
            <td>green（緑）, grass（草）との混同</td>
            <td>語頭音素 /gr-/ の類似による音韻的干渉</td>
          </tr>
          <tr>
            <td><strong>leg</strong></td>
            <td>脚（すね・足全体）</td>
            <td style="color: #dc2626; font-weight: bold;">76.5%</td>
            <td>foot（足首から下）との混同</td>
            <td>身体部位における日本語概念との境界ズレ</td>
          </tr>
          <tr>
            <td><strong>speak</strong></td>
            <td>話す</td>
            <td style="color: #d97706; font-weight: bold;">79.1%</td>
            <td>write（書く）, talk（会話する）</td>
            <td>言語伝達動詞群における意味領域の重なり</td>
          </tr>
          <tr>
            <td><strong>write</strong></td>
            <td>書く</td>
            <td style="color: #d97706; font-weight: bold;">81.4%</td>
            <td>drawing pictures（絵を描くこと）</td>
            <td>日本語「かく」に『書く』と『描く』の両方が含まれることによる母語干渉</td>
          </tr>
          <tr>
            <td><strong>practice</strong></td>
            <td>練習する</td>
            <td style="color: #d97706; font-weight: bold;">83.0%</td>
            <td>play（遊ぶ・試合をする）</td>
            <td>部活動表現（practice soccer vs play soccer）のニュアンス差</td>
          </tr>
          <tr>
            <td><strong>hanami</strong></td>
            <td>お花見</td>
            <td style="color: #d97706; font-weight: bold;">84.5%</td>
            <td>flower viewing（英語直訳形）</td>
            <td>ローマ字表記と英単語借用語の識別迷い</td>
          </tr>
        </tbody>
      </table>

      <!-- 認知類型分析ボックス -->
      <div class="box-pedagogy">
        <strong>【誤答パターンの言語認知的分析（形成的評価）】</strong><br>
        1. <strong>母語干渉（L1 Interference）:</strong> 『書く（write）』と『絵を描く（draw）』のように、日本語では同じ「かく」という動詞に対応する英語表現の使い分けで迷いが生じています。<br>
        2. <strong>音韻類似干渉（Phonological Interference）:</strong> 『Greece』と『green』のように、先頭の2〜3音素が一致する語で早押し時の誤選択が確認されました。<br>
        3. <strong>概念の包括関係:</strong> 『leg（脚全体）』と『foot（足先）』の違いなど、日常語と英語の指示対象のズレを次時以降の小活動で確認することが有効です。
      </div>
    </div>

    <div class="footer">
      <span>二子玉川小学校 第6学年 外国語科実践報告書</span>
      <span>3 / 4 ページ</span>
    </div>
  </div>

  <!-- ==================== PAGE 4: 指導改善・今後の活用方針 ==================== -->
  <div class="page">
    <div class="content-wrap">
      <div class="section-title">5. 今後の指導改善と形成的評価の活用方針</div>

      <!-- 授業改善の手立て -->
      <div style="font-size: 8.8pt; line-height: 1.5; margin-bottom: 8px;">
        本日の即時テレメトリ分析から得られた客観的エビデンスを、来週以降の授業改善および学年指導へ直ちに反映させます。
      </div>

      <table class="table-custom">
        <thead>
          <tr>
            <th style="width: 25%;">重点指導語彙</th>
            <th style="width: 35%;">推奨アクティビティ（授業内5分）</th>
            <th style="width: 40%;">指導上の着眼点・声かけの具体例</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>write vs draw</strong><br>（書く vs 描く）</td>
            <td><strong>ジェスチャー付きキーワードスナッチ</strong><br>ペンで文字を書く動作と、筆で絵を描く動作を同時に発話</td>
            <td>「Letter（手紙）は write！ Picture（絵）は draw！ 動作と一緒に声に出してみよう」</td>
          </tr>
          <tr>
            <td><strong>leg vs foot</strong><br>（あし・身体部位）</td>
            <td><strong>サイモンセッズ（Simon Says）</strong><br>Simon says touch your leg / touch your foot で部位識別</td>
            <td>「Shoes（靴）を履くのは foot！ ズボンを履く全体は leg！ タッチして確認しよう」</td>
          </tr>
          <tr>
            <td><strong>speak vs talk</strong><br>（言語・対話動詞）</td>
            <td><strong>コロケーションQ&Aペアワーク</strong><br>Can you speak English? / Let's talk together!</td>
            <td>「言語（English）が後ろに来るときは speak を使うよ！ ペアで尋ね合ってみよう」</td>
          </tr>
        </tbody>
      </table>

      <!-- ICT活用の教育的成果と今後の展望 -->
      <div class="section-title">6. ICT活用による教育効果の総括と今後の展望</div>
      <div style="font-size: 8.5pt; line-height: 1.5; text-align: justify;">
        <ul style="margin: 3px 0; padding-left: 18px;">
          <li><strong>帯活動（モジュール5分）としての定例化:</strong><br>授業開始直後の5分間にテンポよく即時想起演習を実施することで、児童の学習モードへの切り替え（ウォームアップ）と、前時・前単元語彙の忘却曲線を防ぐ反復想起が極めて高い効果を上げることが実証されました。</li>
          <li><strong>自立進度型演習による個別最適な学びの保障:</strong><br>クラス一斉のペースに縛られず、自分のスピードで反復できる自立進度演習により、得意な児童は200問以上の高度な定着へ、慎重な児童も自分のペースで確実に正解を重ねる「個別最適な練習機会」が保障されました。</li>
          <li><strong>指導要録・形成的評価のエビデンスとしての蓄積:</strong><br>1人あたり約190問の客観的回答ログ（正答率・反応時間・誤答傾向）は、単なる主観的観察にとどまらない、児童の「知識・技能」「思考・判断・表現」を見取る客観的評価資料として大いに活用可能です。</li>
        </ul>
      </div>

      <div style="margin-top: 10px; padding: 8px 10px; background: #f1f5f9; border-radius: 6px; border: 1px dashed #94a3b8; font-size: 8.3pt; line-height: 1.45;">
        <strong>【指導者所見・結び】</strong><br>
        本日10月23日の全4クラス実践において、端末連携システム「Eigo Arena」は児童の英語学習に対する内発的動機付けを最大限に高め、学年全体で<strong>21,377回の言語活動アウトプット・実測正答率83.3%</strong>という極めて健全かつ高密度な学習成果を達成しました。朝一番のシステム課題についても迅速にチューニングを完了し、全児童が公平かつ正確に努力を評価される基盤が整いました。今後も担任団の先生方と緊密に連携しながら、児童一人ひとりが英語に自信を持ち、楽しく発話できる授業づくりを推進してまいります。
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
console.log('✅ Generated Grade 6 Academic HTML Report at:', targetHtmlPath);

// Convert to PDF using Headless Chrome
console.log('⏳ Generating Official Grade 6 PDF via Headless Chrome...');
const chromePath = 'C:\\\\Program Files\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe';

try {
  execFileSync(chromePath, [
    '--headless',
    '--disable-gpu',
    '--no-pdf-header-footer',
    `--print-to-pdf=${officialPdfPath}`,
    targetHtmlPath
  ]);

  if (fs.existsSync(officialPdfPath)) {
    const stats = fs.statSync(officialPdfPath);
    console.log(`🎉 Successfully created Official Grade 6 PDF Report!`);
    console.log(`   Path: ${officialPdfPath}`);
    console.log(`   Size: ${(stats.size / 1024).toFixed(1)} KB`);

    try {
      fs.copyFileSync(officialPdfPath, targetPdfPath);
      console.log(`   Updated default PDF: ${targetPdfPath}`);
    } catch (e) {
      console.log(`   Note: default PDF copy: ${e.message}`);
    }

    try {
      fs.copyFileSync(officialPdfPath, artifactPdfPath);
      console.log(`   Artifact copy: ${artifactPdfPath}`);
    } catch (e) {
      console.log('   Could not copy to artifact dir:', e.message);
    }
  } else {
    console.error('❌ PDF file was not created.');
    process.exit(1);
  }
} catch (err) {
  console.error('❌ Failed to run Chrome headless:', err);
  process.exit(1);
}
