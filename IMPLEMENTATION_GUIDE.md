# 体調予報システム 実装ガイド

## 🎯 プロジェクト目標

自分の体調変化を、天気予報のように予測・分析するシステムを構築する。気象、予定、気圧などの複数の要因を組み合わせて、総合的な体調スコア（0-100）を毎日算出する。

## 📊 体調スコア計算ロジック

### 1. 気温スコア計算（配重: 25%）

**最適温度**: 5℃～10℃
**快適温度**: 5℃～20℃

```
- 5℃ ≤ 気温 ≤ 10℃ → スコア 100
- 快適範囲内 → スコア 70-100（距離に応じて）
- 4℃以下 → スコア 10-70（寒冷ペナルティ）
- 20℃以上 → スコア 20-70（高温ペナルティ）
```

**実装場所**: `src/services/conditionScoreEngine.js:calculateTemperatureScore()`

---

### 2. 湿度スコア計算（配重: 15%）

**最適湿度**: 50%
**快適湿度**: 40%～60%
**注意**: 気温 ≥ 20℃ の時、高湿度は大きく体調を悪化させる

```
気温が 20℃以上の場合:
  - 湿度が高いほど、ペナルティが大きい
  - 気温 × 湿度の積が重要

気温が 20℃未満の場合:
  - 湿度の影響は相対的に小さい
```

**実装場所**: `src/services/conditionScoreEngine.js:calculateHumidityScore()`

---

### 3. 日照スコア計算（配重: 20%）

**対象時間**: 午前5時～午後9時（日中のみ）
**影響**: 日照時間が短い → 頭がぼーっとする

```
- 日照時間 ≥ 6時間 → スコア 100
- 4～6時間 → スコア 80
- 2～4時間 → スコア 60
- 2時間未満 → スコア 40
```

**実装場所**: `src/services/conditionScoreEngine.js:calculateIlluminationScore()`

**今後の改善**:
- `全天日射量（W/㎡）` を OpenWeather Pro API から取得
- より精密な計算に変更

---

### 4. 空気質スコア計算（配重: 15%）

**重要**: 屋外予定がある場合のみ適用

```
- AQI 0～50（良好） → スコア 100
- AQI 51～100（中程度） → スコア 80
- AQI 101～150（不健康） → スコア 50
- AQI 151～（非常に悪い） → スコア 20
```

**屋内のみの場合**: スコア 100（影響なし）

**実装場所**: `src/services/conditionScoreEngine.js:calculateAirQualityScore()`

**データ取得元**:
- World Air Quality Index（WAQI）API
- 今後: OpenWeather Air Quality API（有料版）

---

### 5. 気圧スコア計算（配重: 10%）

**標準気圧**: 1013 hPa
**最適気圧**: 1010～1015 hPa

```
- 1010～1015 hPa → スコア 100
- 990～1030 hPa → スコア 80（許容範囲）
- 990 hPa未満 → 低気圧ペナルティ
  - 990 - 気圧 × 2 = ペナルティ
- 1030 hPa以上 → 高気圧ペナルティ
```

**効果**: 低気圧 → 頭のぼーっと感、倦怠感

**実装場所**: `src/services/conditionScoreEngine.js:calculatePressureScore()`

---

### 6. スケジュールスコア計算（配重: 15%）

**ベーススコア**: 100
**減点ロジック**:

```
- 人との会合予定 → -15点
- 屋外出張・外出予定 → -10点
- 睡眠を阻害する予定 → -20点
- 食事を阻害する予定 → -10点
```

**最小スコア**: 10点（複数の悪条件が重なった場合）

**実装場所**: `src/services/conditionScoreEngine.js:calculateScheduleScore()`

**カレンダー判定ロジック**:
```javascript
const title = event.summary + event.description
if (title.includes('会') || title.includes('meeting')) → hasMeetings = true
if (title.includes('外出') || title.includes('outdoor')) → hasOutdoorActivities = true
// etc.
```

---

## 🔢 総合スコア計算

### 加重合計

```
総合スコア =
  気温スコア × 0.25 +
  湿度スコア × 0.15 +
  日照スコア × 0.20 +
  空気質スコア × 0.15 +
  気圧スコア × 0.10 +
  スケジュールスコア × 0.15
```

### スコアランク分類

| スコア | 評価 | 絵文字 | アドバイス |
|--------|------|--------|-----------|
| 80-100 | 良好 | 😊 | 通常通りの活動を継続してください |
| 60-79 | 注意 | 😐 | 無理のない活動をお勧めします |
| 40-59 | 要注意 | 😓 | 十分な睡眠と栄養を取りましょう |
| 0-39 | 警告 | 😰 | 休息を優先してください |

---

## 🔗 API 統合

### OpenWeather API

**対応データ**:
- 気温（temperature）
- 体感気温（feelsLike）
- 湿度（humidity）
- 気圧（pressure）
- 天気（description）
- 雲量（cloudiness）

**エンドポイント**:
```
https://api.openweathermap.org/data/2.5/weather
https://api.openweathermap.org/data/2.5/forecast
```

**実装ファイル**: `src/services/weatherService.js`

### Google Calendar API

**対応機能**:
- 指定期間のイベント取得
- イベントの詳細情報解析（タイトル、説明、時刻）

**認証方式**: OAuth 2.0

**実装ファイル**: `src/services/calendarService.js`

### World Air Quality Index（WAQI）API

**用途**: AQI データ取得

**エンドポイント**:
```
https://api.waqi.info/feed/geo:{lat};{lon}
```

**注**: OpenWeather Pro では Air Quality も提供予定

---

## 📋 実装チェックリスト

### 完了✅
- [x] 基本的なスコア計算エンジン
- [x] 気象データ取得（OpenWeather API）
- [x] カレンダーデータ取得（骨組み）
- [x] レポート生成（テキスト＆JSON）
- [x] デモプログラム
- [x] README ドキュメント

### 次のマイルストーン
- [ ] Google Calendar 認証フロー（実装）
- [ ] より詳細な日照データ取得
- [ ] Air Quality API 統合
- [ ] Web ダッシュボード
- [ ] グラフ・チャート可視化
- [ ] 過去データ管理・分析
- [ ] 機械学習による精度向上

---

## 🛠️ 今後のカスタマイズ・改善

### 1. パラメータの個人別調整

各ユーザーの体調パターンが異なるため、配重を調整可能にする：

```javascript
class ConditionScoreEngine {
  constructor(customWeights = null) {
    this.weights = customWeights || {
      temperature: 0.25,
      humidity: 0.15,
      // ...
    };
  }
}
```

### 2. 過去データとの比較

各日のスコアと実際の体調を記録し、傾向を分析：

```javascript
// 過去7日間と比較
const trend = getScoreTrend(7);
if (trend.isDecreasing) {
  console.log('体調が低下傾向です');
}
```

### 3. 予測機能

機械学習モデルで数日先の体調を予測：

```
今日のスコア: 75
明日の予測: 65（気圧が低下するため）
```

### 4. 通知機能

- スコアが一定以下になった時にアラート
- 推奨事項を定期メール送信

### 5. Web ダッシュボード

- 日次スコアのグラフ表示
- 各要因の時系列推移
- インタラクティブな予報画面

---

## 📚 参考資料

### API ドキュメント
- [OpenWeather API](https://openweathermap.org/api)
- [Google Calendar API](https://developers.google.com/calendar)
- [WAQI API](https://waqi.info/api/)

### 健康管理に関する参考
- [気象と体調の関係性](https://example.com)
- [気圧と頭痛の相関](https://example.com)

---

## 🤝 貢献ガイドライン

1. Feature branch で開発（`git checkout -b feature/new-feature`）
2. テストを作成・実行（`npm test`）
3. コミットメッセージは明確に（`feat:`, `fix:`, `docs:` など）
4. Pull Request を作成

---

**最終更新**: 2026年2月10日
