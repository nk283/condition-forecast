# 🌟 体調予報システム（Condition Forecast）

天気予報のように、自分の体調を予測するシステムです。気象データ、カレンダー予定、気圧などを組み合わせて、総合的な体調スコアを計算し、詳細な分析と推奨事項を提供します。

## 📋 システムの概要

### 取得データ
- **気象データ**: 気温、湿度、気圧、日照時間、空気質
- **カレンダーデータ**: 予定内容（人との会合、外出、睡眠・食事の阻害）
- **現在位置**: 緯度・経度（気象データ取得用）

### 体調スコア計算
各要因を **0-100** の点数に変換し、加重平均で総合スコアを算出します：

| 要因 | 配重 | 説明 |
|------|------|------|
| 🌡️ 気温 | 20% | 最適範囲 5-10℃。寒冷・高温で減点 |
| 🌡️ 気温差 | 5% | 日中の気温変動。≤10℃が最適、10℃超過で減点 |
| 💧 湿度 | 15% | 高温時の高湿度は悪影響大 |
| ☀️ 日照 | 20% | 日中の光不足で思考力低下（雲量から計算） |
| 💨 空気質 | 15% | 屋外予定がある場合に影響 |
| 🎈 気圧 | 10% | 低気圧で頭がぼーっとする |
| 📅 スケジュール | 15% | 会合・外出・睡眠・食事の阻害 |

### 出力形式
- **スコア表示**: 0-100の数値
- **テキスト評価**: 「良好」「注意」「要注意」「警告」
- **詳細な要因分析**: 各要因がどの程度影響しているか
- **推奨事項**: スコアとリスクに基づいたアドバイス

## 🚀 セットアップ

### 1. 依存パッケージをインストール
```bash
npm install
```

### 2. 環境変数を設定
`.env` ファイルを編集して、以下を設定してください：

```env
# Google Calendar API（オプション）
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/callback

# OpenWeather API（必須）
OPENWEATHER_API_KEY=your_openweather_api_key
WEATHER_LAT=35.6762  # 東京の緯度
WEATHER_LON=139.6503 # 東京の経度

# アプリケーション設定
LOG_LEVEL=info
OUTPUT_FORMAT=json
```

### 3. API キーを取得

#### OpenWeather API キー
1. [OpenWeather](https://openweathermap.org/) にアクセス
2. アカウントを作成（無料プラン可）
3. API キーをコピーして `.env` に設定

#### Google Calendar API キー（オプション）
1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 新しいプロジェクトを作成
3. Google Calendar API を有効化
4. OAuth 2.0 認証情報を作成
5. 認証情報を `.env` に設定
6. 認証を完了: `npm run auth`

## 📖 使い方

### デモを実行（API キーなし）
```bash
node demo.js
```

### Google Calendar を連携する（初回のみ）
```bash
npm run auth
```
ブラウザで Google アカウントにログインし、認証コードをコンソールに入力します。

### カレンダーデータをテストする
```bash
npm run calendar
```
本日の予定を取得し、スケジュール分析結果を表示します。

### 実際のシステムを実行

#### 方法1: コマンドラインで実行
```bash
npm start
```
または
```bash
npm run forecast
```

#### 方法2: デスクトップショートカットから実行（推奨）
```bash
powershell -ExecutionPolicy Bypass -File create_desktop_shortcut.ps1
```
実行後、デスクトップに「体調予報」ショートカットが作成されます。
このショートカットをダブルクリックすると、体調予報が実行されます。

#### 方法3: 毎日自動実行を設定
```bash
powershell -ExecutionPolicy Bypass -File setup_task_scheduler.ps1
```
注意: 管理者権限が必要です（「管理者として実行」でPowerShellを開いてください）
実行後、毎日朝8時に自動で体調予報が実行されます。

## 🎯 実装済みの機能

✅ **気象データ取得**
- OpenWeather API から気温、湿度、気圧、日照データを取得
- 雲量データを使用した実天気の日照スコア計算

✅ **Google Calendar 連携**
- OAuth 2.0 認証フロー
- 予定の自動取得と分析
- 人との会合、外出、睡眠・食事の阻害を自動判定

✅ **体調スコア計算エンジン**
- 7つの要因を数値化：気温、気温差、湿度、日照、空気質、気圧、スケジュール
- 加重合計で総合スコアを算出
- 気温差：1日の気温変動を考慮（最適: ≤10℃）

✅ **スコア算出根拠の表示**
- 各スコアがなぜその値になったのかを詳細に表示
  - 例: 「気温: 10.71℃は快適範囲(5-20℃)内のため98点」
  - 例: 「雲量75%で曇天のため50点」

✅ **未来予報機能**
- OpenWeather 5日間予報から日別スコアを計算
- HTML ダッシュボードで過去データと予測データを可視化

✅ **詳細なリスク分析**
- 各要因がどのような悪影響をもたらすかを分析
- 具体的で実践的なアドバイスを提供

✅ **レポート生成**
- テキスト形式（見やすい日本語出力）
- JSON 形式（システム連携用）

✅ **自動実行・ワンクリック実行**
- デスクトップショートカットでワンクリック実行
- Windows Task Scheduler で毎日自動実行可能
- ログファイルに実行結果を記録

## 📅 今後の実装予定

### Phase 3
- [ ] より詳細な日照データ取得
- [ ] Air Quality API の本格統合

### Phase 3
- [ ] Web ダッシュボード（React）
- [ ] グラフ・チャートの可視化
- [ ] 過去データとの比較分析
- [ ] 予測精度の向上（機械学習）

### Phase 4
- [ ] スマートフォンアプリ化
- [ ] 定期的な予報生成とスケジューリング
- [ ] ユーザー個別のパラメータ調整機能

## 📝 ファイル構成

```
Condition_Forecast/
├── src/
│   ├── index.js                    # メインアプリケーション
│   ├── services/
│   │   ├── weatherService.js       # 気象データ取得
│   │   ├── calendarService.js      # カレンダーデータ取得
│   │   └── conditionScoreEngine.js # 体調スコア計算
│   └── utils/
│       └── reportGenerator.js      # レポート生成
├── demo.js                         # デモンストレーション
├── .env.example                    # 環境変数サンプル
├── package.json                    # 依存パッケージ設定
└── README.md                       # このファイル
```

## 🔧 カスタマイズ

### スコア計算の重みを変更
`src/services/conditionScoreEngine.js` の `this.weights` を編集：

```javascript
this.weights = {
  temperature: 0.25,  // 気温の重要度（例: 0.30 に変更）
  humidity: 0.15,
  illumination: 0.20,
  airQuality: 0.15,
  pressure: 0.10,
  schedule: 0.15
};
```

### 気温の最適範囲を変更
`calculateTemperatureScore()` メソッドで最適温度を調整：

```javascript
const optimalMin = 5;   // 最適温度の最小値
const optimalMax = 10;  // 最適温度の最大値
```

## 💡 用途例

### 毎朝の習慣
```bash
# 毎朝 6 時に自動実行するように cron に登録
0 6 * * * cd /path/to/Condition_Forecast && npm start
```

### 予定管理との連携
カレンダーの予定から「会合が多い日」「外出が多い日」を自動検出し、体調への影響を計算

### 個人の健康管理
各日の体調予報スコアと実際の体調を比較し、どの要因が自分に最も影響するかを分析

## 📞 サポート

問題が発生した場合：
1. `.env` の設定を確認
2. OpenWeather API キーが有効か確認
3. ネットワーク接続を確認
4. `node demo.js` でシステムが動作するか確認

## 📜 ライセンス
ISC License

## 🙏 謝辞
- OpenWeather API の天気データ提供
- Google Calendar API との連携

---

**最終更新**: 2026年2月10日
