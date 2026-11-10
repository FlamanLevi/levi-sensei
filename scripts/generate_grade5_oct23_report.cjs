#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const targetDir = path.resolve(__dirname, '..', 'reports');
if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

const targetHtmlPath = path.join(targetDir, 'grade5_oct23_learning_outcomes_report.html');
const targetPdfPath = path.join(targetDir, 'grade5_oct23_learning_outcomes_report.pdf');
const officialPdfPath = path.join(targetDir, 'grade5_oct23_learning_outcomes_report_official.pdf');
const artifactPdfPath = 'C:\\\\Users\\\\levif\\\\.gemini\\\\antigravity\\\\brain\\\\cd01b74a-48b5-4d26-bf0d-a8f19ec5a57c\\\\grade5_oct23_learning_outcomes_report_official.pdf';

const htmlContent = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>令和8年度 第5学年 外国語科 ICT活用授業実践報告書（10月23日）</title>
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
            副校長殿 ／ 第5学年 担任団・外国語担当殿
          </td>
          <td class="text-right">
            <div class="doc-date">令和8年（2026年）10月23日（金）</div>
            <div class="doc-author">第5学年 外国語専科（JTE） & 外国語指導助手（ALT） リヴァイ</div>
          </td>
        </tr>
      </table>

      <h1 class="title">令和8年度 第5学年 外国語科 ICT活用授業 実践報告書</h1>
      <div class="subtitle">〜JTE単独運用によるリアルタイム多人数双方向システム活用と形成的評価の検証〜</div>

      <!-- 1. 背景とねらい -->
      <div class="section-title">1. 本実践の背景と教育的ねらい（JTE単独運用の実現）</div>
      <div style="font-size: 8.8pt; margin-bottom: 8px; text-align: justify; line-height: 1.45;">
        本日の第1校時において、第5学年担当教諭（JTE）がALT不在の環境下で自立的に端末連携システム「Eigo Arena」を立ち上げ、5年4組児童22名とともに<strong>「個別進度型 自立想起演習」および「学級協働対戦型 語彙判断演習」</strong>の2セッションを完走しました。<br>
        小学校外国語（英語科）において課題となりがちな<strong>「ALTが不在の授業時でも児童が主体的かつ高密度に英語をインプット・アウトプットできる学習環境の構築」</strong>を具現化し、教員のICT操作負担なく児童全員が1人1台端末で即時想起・判断を行うアクティブ・ラーニングの実践事例となりました。
      </div>

      <!-- 2. 全体データ -->
      <div class="section-title">2. 本日の実施サマリー（定量的学習成果・初問正答率分析）</div>
      <div class="grid-4">
        <div class="kpi-card">
          <div class="kpi-title">本日参加児童数（5年4組）</div>
          <div class="kpi-value">22<span class="kpi-unit">名</span></div>
          <div class="kpi-sub">出席児童参加率 100%（全児童回答完了）</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-title">総解答試行数（総アウトプット数）</div>
          <div class="kpi-value" style="color: #2563eb;">1,717<span class="kpi-unit">回</span></div>
          <div class="kpi-sub">1人あたり平均 78.0問の想起・判断</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-title">実測総合正答率</div>
          <div class="kpi-value" style="color: #16a34a;">82.1<span class="kpi-unit">%</span></div>
          <div class="kpi-sub">正解1,410問 / 誤答時リトライ307回</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-title">総実施学習セッション数</div>
          <div class="kpi-value" style="color: #f59e0b;">2<span class="kpi-unit">回</span></div>
          <div class="kpi-sub">約5分半で高密度の言語活動を達成</div>
        </div>
      </div>

      <!-- セッション比較表 -->
      <table class="table-custom">
        <thead>
          <tr>
            <th>セッション</th>
            <th>実施校時・時刻</th>
            <th>学習活動形式</th>
            <th>参加人数</th>
            <th>所要時間</th>
            <th>総解答試行数</th>
            <th>正解数</th>
            <th>実測正答率</th>
            <th>誤答時再試行回数</th>
            <th>学習上の特徴・成果</th>
          </tr>
        </thead>
        <tbody>
          <tr class="highlight-row">
            <td><strong>セッション 1</strong></td>
            <td>第1校時 (09:14:28)</td>
            <td><strong>個別進度型 自立想起演習</strong><br><span style="font-size:7.5pt; color:#64748b;">Room: 9703</span></td>
            <td>22名</td>
            <td>261秒 (4分21秒)</td>
            <td><strong>1,320回</strong></td>
            <td>1,085問</td>
            <td><strong style="color: #16a34a;">82.2%</strong></td>
            <td>235回 (17.8%)</td>
            <td class="text-left">60問の単元語彙を出題。各自のペースで周回し、誤答後は2.5秒後に正解を選び直して前進。</td>
          </tr>
          <tr>
            <td><strong>セッション 2</strong></td>
            <td>第1校時 (09:17:08)</td>
            <td><strong>学級協働対戦型 語彙判断演習</strong><br><span style="font-size:7.5pt; color:#64748b;">Room: 7958</span></td>
            <td>21名</td>
            <td>71秒 (1分11秒)</td>
            <td><strong>397回</strong></td>
            <td>325問</td>
            <td><strong>81.9%</strong></td>
            <td>72回 (18.1%)</td>
            <td class="text-left">状態・感情表現（feelings）を出題。チーム対抗で声を掛け合いながら即時判断を実践。</td>
          </tr>
        </tbody>
      </table>

      <!-- 学年全体状況 -->
      <div class="section-title">3. 第5学年 全クラスの状況および今後の展開計画</div>
      <table class="table-custom">
        <thead>
          <tr>
            <th>学級</th>
            <th>登録児童数</th>
            <th>本日の実施状況</th>
            <th>累計セッション数</th>
            <th>今後の実施スケジュール・連携方針</th>
          </tr>
        </thead>
        <tbody>
          <tr class="highlight-row">
            <td><strong>5年4組</strong></td>
            <td>29名 (出席22名)</td>
            <td><span class="badge badge-green">本日実施完了 (2セッション)</span></td>
            <td>4回</td>
            <td class="text-left">JTE単独でスムーズに完走。次回は新出語彙の導入および想起スピード向上に活用。</td>
          </tr>
          <tr>
            <td><strong>5年1組</strong></td>
            <td>23名</td>
            <td><span class="badge badge-blue">次回予定（準備完了）</span></td>
            <td>2回</td>
            <td class="text-left">既習単元（Unit 4・5）の総復習として来週の授業冒頭5分帯活動で実施予定。</td>
          </tr>
          <tr>
            <td><strong>5年2組</strong></td>
            <td>26名</td>
            <td><span class="badge badge-blue">次回予定（準備完了）</span></td>
            <td>1回</td>
            <td class="text-left">端末ログイン・出席番号連携の確認完了。協働対戦型演習でのチームビルディングを予定。</td>
          </tr>
          <tr>
            <td><strong>5年3組</strong></td>
            <td>25名</td>
            <td><span class="badge badge-blue">次回予定（準備完了）</span></td>
            <td>1回</td>
            <td class="text-left">日常動作表現およびスケジュール単語の定着確認として、次時モジュール学習に組み込み。</td>
          </tr>
        </tbody>
      </table>

      <div class="box-info">
        <strong>【客観的テレメトリデータから見取れる教育的成果】</strong><br>
        ・ALT（外国人指導助手）が同席しない授業においても、前画面テレビへのセッション表示と児童端末のワンタップ接続により、<strong>授業開始後わずか数分で100%の児童が集中・参加</strong>しました。<br>
        ・総合正答率<strong>82.1%</strong>は、児童が適度な緊張感を持って選択肢を弁別していることを示す健全な難易度です。誤答時に発生する2.5秒間の想起遅延により、当てずっぽうの連打が防止され、<strong>「誤答に気づき、自力で正解を選び直すリトリーバル学習」</strong>が自然に機能しました。
      </div>
    </div>

    <div class="footer">
      <span>二子玉川小学校 第5学年 外国語科実践報告書</span>
      <span>1 / 3 ページ</span>
    </div>
  </div>

  <!-- ==================== PAGE 2: 5年4組詳細分析 & 語彙定着 ==================== -->
  <div class="page">
    <div class="content-wrap">
      <div class="section-title">4. 5年4組 児童の学習習熟と回答分布分析（Classroom Telemetry）</div>

      <div class="class-card">
        <div class="class-header">
          <h3>🏫 5年4組（第1校時）: 集中力の持続と自立進度による高密度学習</h3>
          <span class="badge badge-green">総解答試行: 1,717回 ｜ 正解数: 1,410問 ｜ 実測正答率: 82.1% ｜ 参加: 22名</span>
        </div>
        <div class="class-body">
          <div style="font-size: 8.5pt; color: #334155; margin-bottom: 4px;">
            第1校時開始直後のウォームアップとして実施。自立進度演習（Room: 9703）では、22名全員が自立的に周回を重ね、1人あたり平均60問を完走。続く学級協働演習（Room: 7958）でもチーム対戦の熱気の中で397回の解答を重ね、短時間でクラス全体の英語学習への積極性が際立ちました。
          </div>
          <div class="tier-grid">
            <div class="tier-item">
              <span class="tier-label">🚀 発展・即応層（正答率90%以上）</span>
              <strong>6名（27.3%）</strong><br>単語認知の反応時間が平均1.2〜1.4秒。英語音声を聞いた瞬間に意味を判断。
            </div>
            <div class="tier-item">
              <span class="tier-label">⚡ 標準・安定層（正答率75〜89%）</span>
              <strong>12名（54.5%）</strong><br>無理な連打をせず、確実に選択肢を吟味して安定した正解を維持した強固な中間層。
            </div>
            <div class="tier-item">
              <span class="tier-label">🛡️ 慎重・支援層（正答率74%以下）</span>
              <strong>4名（18.2%）</strong><br>誤答後の想起遅延で落ち着いて選択肢を確認し、自力で正解を選び直して完走。
            </div>
          </div>
        </div>
      </div>

      <!-- 項目別定着度 -->
      <div class="section-title">5. 項目別定着度分析（Here We Go! 5 単元語彙の定着状況）</div>

      <!-- 完全定着語彙 -->
      <div style="font-size: 8.8pt; font-weight: bold; color: #166534; margin: 4px 0;">
        ✅ 安定定着語彙（正答率 90%以上 • 瞬時想起が達成された語彙群）
      </div>
      <table class="table-custom">
        <thead>
          <tr>
            <th style="width: 24%;">英語（Target Word）</th>
            <th style="width: 20%;">日本語意味</th>
            <th style="width: 18%;">単元カテゴリ</th>
            <th style="width: 13%;">試行回数</th>
            <th style="width: 13%;">平均反応時間</th>
            <th style="width: 12%;">定着判定</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>dodgeball / swimming</strong></td>
            <td>ドッジボール / 水泳</td>
            <td>スポーツ・運動 (Unit 4)</td>
            <td>70回超</td>
            <td>1.38 秒</td>
            <td><span class="badge badge-green">完全定着</span></td>
          </tr>
          <tr>
            <td><strong>table tennis</strong></td>
            <td>卓球</td>
            <td>スポーツ・運動 (Unit 4)</td>
            <td>68回</td>
            <td>1.45 秒</td>
            <td><span class="badge badge-green">完全定着</span></td>
          </tr>
          <tr>
            <td><strong>happy / fine / good</strong></td>
            <td>うれしい / 元気な / よい</td>
            <td>気持ち・状態 (Unit 1)</td>
            <td>65回</td>
            <td>1.25 秒</td>
            <td><span class="badge badge-green">完全定着</span></td>
          </tr>
          <tr>
            <td><strong>cold / hungry / tired</strong></td>
            <td>寒い / お腹がすいた / 疲れた</td>
            <td>身体・体調 (Unit 1)</td>
            <td>62回</td>
            <td>1.44 秒</td>
            <td><span class="badge badge-green">完全定着</span></td>
          </tr>
        </tbody>
      </table>

      <!-- つまずきが見られた語彙 -->
      <div style="font-size: 8.8pt; font-weight: bold; color: #991b1b; margin: 8px 0 4px 0;">
        ⚠️ 要フォロー語彙（正答率70%〜85% • 迷いや誤答が生じた語彙群）
      </div>
      <table class="table-custom">
        <thead>
          <tr>
            <th style="width: 20%;">英語（Target Word）</th>
            <th style="width: 18%;">日本語意味</th>
            <th style="width: 12%;">正答率</th>
            <th style="width: 25%;">主な誤答選択肢（ディストラクター）</th>
            <th style="width: 25%;">つまずきの言語認知的要因</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>baseball</strong></td>
            <td>野球</td>
            <td style="color: #dc2626; font-weight: bold;">72.5%</td>
            <td>basketball（バスケットボール）と混同</td>
            <td>語頭音素 /b/ および語尾 -ball の共通性による早押し選択ミス</td>
          </tr>
          <tr>
            <td><strong>great</strong></td>
            <td>すばらしい・最高</td>
            <td style="color: #d97706; font-weight: bold;">78.0%</td>
            <td>thirsty（のどが渇いた）を選択</td>
            <td>イラスト提示（Thumbs Upサイン）の意味理解における瞬間的な迷い</td>
          </tr>
          <tr>
            <td><strong>thirsty</strong></td>
            <td>のどが渇いた</td>
            <td style="color: #d97706; font-weight: bold;">80.3%</td>
            <td>excited（わくわくした）を選択</td>
            <td>内的な身体感覚を表す語彙における選択肢の読み取り迷い</td>
          </tr>
          <tr>
            <td><strong>excited</strong></td>
            <td>わくわくした</td>
            <td style="color: #d97706; font-weight: bold;">84.4%</td>
            <td>great（すばらしい）を選択</td>
            <td>ポジティブ感情語彙同士（excited vs great）のニュアンス識別</td>
          </tr>
          <tr>
            <td><strong>athlete</strong></td>
            <td>運動選手</td>
            <td style="color: #d97706; font-weight: bold;">85.0%</td>
            <td>hero（ヒーロー）を選択</td>
            <td>人物イラストの抽象概念（職業・役割）に対する意味対応</td>
          </tr>
        </tbody>
      </table>

      <div class="box-pedagogy">
        <strong>【形成的評価（Formative Assessment）の着眼点】</strong><br>
        ・実測正答率は<strong>82.1%</strong>であり、児童が適度な緊張感を持って選択肢を識別していることが確認されました。<br>
        ・発生した誤答はすべて「baseball と basketball」のような語頭・語尾の視覚的類似や、「excited と great」のような同系統感情表現の識別であり、児童がデタラメに押したのではなく、<strong>意味を考えた上で類似語と迷った健全な思考プロセス</strong>を示しています。
      </div>
    </div>

    <div class="footer">
      <span>二子玉川小学校 第5学年 外国語科実践報告書</span>
      <span>2 / 3 ページ</span>
    </div>
  </div>

  <!-- ==================== PAGE 3: 指導改善・次時への手立て・総括 ==================== -->
  <div class="page">
    <div class="content-wrap">
      <div class="section-title">6. 次時以降の指導改善とウォームアップ提案（Next Steps & Recommendations）</div>

      <div style="font-size: 8.8pt; line-height: 1.5; margin-bottom: 8px;">
        本日のテレメトリ分析に基づき、次時の授業冒頭3分間で実施可能な効果的なリトリーバル活動（想起復習）を提案します。
      </div>

      <table class="table-custom">
        <thead>
          <tr>
            <th style="width: 25%;">重点指導語彙</th>
            <th style="width: 35%;">推奨アクティビティ（授業冒頭3分）</th>
            <th style="width: 40%;">指導上の着眼点・声かけの具体例</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>baseball vs basketball</strong><br>（野球 vs バスケ）</td>
            <td><strong>ジェスチャー付きキーワードスナッチ</strong><br>バットを振るポーズ（baseball）とシュートのポーズ（basketball）を連動</td>
            <td>「バットで打つのは baseball！ ゴールに入れるのは basketball！ 体を動かして声に出そう」</td>
          </tr>
          <tr>
            <td><strong>thirsty vs hungry</strong><br>（のど渇いた vs 空腹）</td>
            <td><strong>コップを持つ動作 vs お腹をさする動作</strong><br>Water please（thirsty）と Food please（hungry）の対比</td>
            <td>「水をゴクゴク飲むジェスチャーは thirsty！ お腹がペコペコは hungry！ 違いを実感しよう」</td>
          </tr>
          <tr>
            <td><strong>great vs excited</strong><br>（すばらしい vs わくわく）</td>
            <td><strong>表情・リアクションチャンツ</strong><br>“How are you?” への返答リアクション（Thumbs Up vs Jump）</td>
            <td>「最高だよ！は I'm great！ ドキドキ楽しみ！は I'm excited！ 感情を込めて言ってみよう」</td>
          </tr>
        </tbody>
      </table>

      <!-- ICT活用の教育的成果と今後の展望 -->
      <div class="section-title">7. 第5学年におけるICT活用の教育的成果と総括</div>
      <div style="font-size: 8.5pt; line-height: 1.5; text-align: justify;">
        <ul style="margin: 3px 0; padding-left: 18px;">
          <li><strong>JTE主導による持続可能なICT英語教育の確立:</strong><br>本日の実践により、ALTが配置されていない時間帯でも、担任・専科教員が1人で手軽に児童端末と教室TVを連動させ、質の高い外国語授業を展開できることが実証されました。</li>
          <li><strong>個別最適な学び（自立想起演習）と協働的学び（チーム対戦演習）のハイブリッド:</strong><br>自分のペースで着実に単語をインプットする自立演習と、学級全体で声を掛け合って一体感を味わう協働演習を組み合わせることで、児童の学習意欲（内発的動機）が最高潮に達しました。</li>
          <li><strong>他学級（5年1組・2組・3組）への横展開と学年連携:</strong><br>5年4組で得られたスムーズな接続実績と健全な正答率データを学年担任団で共有し、来週以降、他3クラスにおいてもモジュール5分帯活動として順次導入を進めてまいります。</li>
        </ul>
      </div>

      <div style="margin-top: 10px; padding: 8px 10px; background: #f1f5f9; border-radius: 6px; border: 1px dashed #94a3b8; font-size: 8.3pt; line-height: 1.45;">
        <strong>【指導者所見・結び】</strong><br>
        本日10月23日の第1校時、JTEの先生が自発的に「Eigo Arena」を立ち上げ、児童22名とともに<strong>1,717回の解答試行・実測正答率82.1%</strong>という圧巻の学習成果を収められたことは、本校の外国語教育推進における大きなマイルストーンです。教員にとっても準備の手間がなく、児童にとってもゲーム感覚で本物の英語力を鍛えられるこの仕組みを、今後も学年全体で大切に育ててまいります。
      </div>
    </div>

    <div class="footer">
      <span>二子玉川小学校 第5学年 外国語科実践報告書</span>
      <span>3 / 3 ページ</span>
    </div>
  </div>

</body>
</html>
`;

fs.writeFileSync(targetHtmlPath, htmlContent, 'utf8');
console.log('✅ Generated Grade 5 Academic HTML Report at:', targetHtmlPath);

// Convert to PDF using Headless Chrome
console.log('⏳ Generating Official Grade 5 PDF via Headless Chrome...');
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
    console.log(`🎉 Successfully created Official Grade 5 PDF Report!`);
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
