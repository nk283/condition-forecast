# GitHub Actions デプロイメント設定ガイド

## 📋 目次
1. [GitHub リポジトリ設定](#github-リポジトリ設定)
2. [GitHub Secrets 登録](#github-secrets-登録)
3. [GitHub Pages 有効化](#github-pages-有効化)
4. [Slack 通知設定](#slack-通知設定)
5. [デプロイメント実行](#デプロイメント実行)
6. [トラブルシューティング](#トラブルシューティング)

---

## GitHub リポジトリ設定

### Step 1: リモートリポジトリを作成

1. GitHub にアクセス: https://github.com/new
2. リポジトリ名: `condition-forecast`
3. 説明（オプション）: `天気予報のような体調スコア予測システム`
4. **Visibility**: Public （個人情報なし）
5. "Create repository" をクリック

### Step 2: ローカルリポジトリをプッシュ

```bash
# リモートを追加
git remote add origin https://github.com/YOUR_USERNAME/condition-forecast.git

# main ブランチにリネーム（GitHub のデフォルト）
git branch -M main

# プッシュ
git push -u origin main
```

### Step 3: リポジトリ設定の確認

GitHub リポジトリ → **Settings**

- **General**:
  - Visibility: **Public** ✅
  - Default branch: **main** ✅

- **Actions**:
  - General → Actions permissions: **Allow all actions** ✅

---

## GitHub Secrets 登録

### Step 1: GitHub Secrets にアクセス

GitHub リポジトリ → **Settings** → **Secrets and variables** → **Actions**

### Step 2: 各シークレットを登録

以下の 7 つのシークレットを追加してください：

#### 1. OPENWEATHER_API_KEY
- **値**: OpenWeather API キー
- 取得方法: https://openweathermap.org/api
  - Sign Up → Free Plan を選択
  - API Key を取得

```
例: a1b2c3d4e5f6g7h8i9j0k1l2
```

#### 2. WEATHER_LAT
- **値**: 対象地域の緯度
```
例: 35.6895  （東京）
```

#### 3. WEATHER_LON
- **値**: 対象地域の経度
```
例: 139.6917  （東京）
```

#### 4. GOOGLE_CLIENT_ID
- **値**: Google Calendar API の Client ID
- 取得方法:
  1. https://console.cloud.google.com にアクセス
  2. 新規プロジェクトを作成
  3. Google Calendar API を有効化
  4. OAuth 2.0 認証情報を作成（ウェブアプリケーション）
  5. Client ID をコピー

```
例: 123456789012-a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6.apps.googleusercontent.com
```

#### 5. GOOGLE_CLIENT_SECRET
- **値**: Google Calendar API の Client Secret
- 同じ画面から取得

```
例: GOCSPX-a1b2c3d4e5f6g7h8i9j0k1l2
```

#### 6. GOOGLE_TOKEN
- **値**: Google Calendar 認証トークン
- 取得方法:
  1. ローカルで `npm run auth` を実行
  2. `token.json` が生成される
  3. 内容をすべてコピー

```bash
# ローカルで実行
cat token.json
```

結果を全てコピーして Secrets に貼り付け（改行なし）:
```
{"access_token":"ya29.a0AfH6SMBX...","refresh_token":"1//0gU6...","scope":"...","type":"Bearer"}
```

#### 7. SLACK_WEBHOOK_URL
- **値**: Slack Incoming Webhook URL
- 取得方法:
  1. Slack ワークスペースにアクセス
  2. https://api.slack.com/apps にアクセス
  3. "Create New App" → "From scratch"
  4. App Name: `Condition Forecast`
  5. Workspace を選択
  6. 左メニュー → "Incoming Webhooks"
  7. "Add New Webhook to Workspace"
  8. 投稿先チャネルを選択（例: #general）
  9. "Allow"
  10. **Webhook URL** をコピー

```
例: https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX
```

### Step 3: 登録確認

Settings → Secrets and variables → Actions で以下が表示されるか確認:

- ✅ OPENWEATHER_API_KEY
- ✅ WEATHER_LAT
- ✅ WEATHER_LON
- ✅ GOOGLE_CLIENT_ID
- ✅ GOOGLE_CLIENT_SECRET
- ✅ GOOGLE_TOKEN
- ✅ SLACK_WEBHOOK_URL

---

## GitHub Pages 有効化

### Step 1: GitHub Pages 設定

GitHub リポジトリ → **Settings** → **Pages**

### Step 2: ビルド設定

- **Source**: Deploy from a branch
- **Branch**: main, /(root)
- **Save** をクリック

### Step 3: デプロイ完了を待機

GitHub Pages がビルド・デプロイされるまで数分待機

### Step 4: ダッシュボード URL を確認

Settings → Pages に表示される URL:
```
https://YOUR_USERNAME.github.io/condition-forecast/
```

このURLが本番ダッシュボードの URL になります。

---

## Slack 通知設定

### Step 1: Slack チャネル作成（オプション）

通知を受け取るチャネルを作成（例: #condition-forecast）

### Step 2: Webhook の再設定

前述の Step を参照して、上記チャネルに Webhook を指定

### Step 3: テスト通知

後述の「手動実行テスト」で Slack に通知が到着するか確認

---

## デプロイメント実行

### 方法1: 手動実行（テスト用）

GitHub リポジトリ → **Actions**

1. **Daily Condition Forecast** をクリック
2. **Run workflow** ボタンをクリック
3. **Run workflow** を確認

### 方法2: 定時実行（本番）

自動実行は以下の時刻に開始:
- **6時** (JST)
- **14時** (JST)
- **22時** (JST)

実行は自動なので設定不要です。

---

## トラブルシューティング

### エラー: `API key not found`

**原因**: OPENWEATHER_API_KEY が未設定

**解決策**:
1. Settings → Secrets and variables → Actions を確認
2. OPENWEATHER_API_KEY が存在するか確認
3. 存在しない場合は登録

### エラー: `Cannot find token.json`

**原因**: GOOGLE_TOKEN が未設定

**解決策**:
1. ローカルで `npm run auth` を実行
2. `token.json` の内容をコピー
3. Settings → Secrets and variables → Actions → GOOGLE_TOKEN に貼り付け

### エラー: `Slack webhook failed`

**原因**: SLACK_WEBHOOK_URL が無効

**解決策**:
1. https://api.slack.com/apps にアクセス
2. アプリの Incoming Webhooks を確認
3. Webhook URL をコピーし直して再設定

### ワークフロー実行が時間超過

**原因**: 実行時間が 30 分を超えた

**対策**:
1. `.github/workflows/forecast.yml` の `timeout-minutes` を増やす
2. または API キーの取得方法を確認（応答が遅い可能性）

### ダッシュボード URL にアクセスできない

**原因**: GitHub Pages がまだビルド中

**対策**:
1. Settings → Pages で Build status を確認
2. "Your site is live at ..." が表示されるまで待機

---

## 実行結果の確認

### 1. GitHub Actions ログ

GitHub リポジトリ → **Actions** → **Daily Condition Forecast** → 実行番号をクリック

各ステップのログが表示されます。

### 2. Slack 通知

設定したチャネルに自動投稿されます：

**成功時**:
```
✅ 体調予報更新完了
実行ログを見る | 📊 ダッシュボード
```

**失敗時**:
```
❌ エラー発生
エラー内容: 体調予報の実行に失敗しました。ログを確認してください。
🔗 ログ確認
```

### 3. ダッシュボード確認

ブラウザで以下の URL にアクセス:

```
https://YOUR_USERNAME.github.io/condition-forecast/dashboard_72h.html
```

72 時間分の体調スコアグラフが表示されます。

---

## 定時実行が開始されるまで

初回設定後、定時実行が開始されるまでのタイムライン：

- **Day 1**: GitHub Actions 設定完了
- **Day 2-3**: 定時実行の初回実行を待機（最長24時間）
- **Day 4以降**: 毎日3回自動実行（6時, 14時, 22時）

---

## よくある質問

### Q: ダッシュボード URL を独自ドメインに変更できますか？

**A**: はい。Settings → Pages で Custom domain に設定可能です（DNS 設定が必要）

### Q: 実行時刻を変更できますか？

**A**: はい。`.github/workflows/forecast.yml` の cron 式を変更してコミット

例: 9時, 15時, 23時に変更
```yaml
- cron: '0 0,6,14 * * *'  # UTC
```

### Q: GitHub Pages をプライベート化できますか？

**A**: GitHub Pro 以上（有料）でアクセス制限可能

### Q: メール通知を追加できますか？

**A**: はい。将来の拡張で SendGrid API を使用した実装を予定

### Q: データはどこに保存されますか？

**A**: GitHub リポジトリの以下に自動保存:
- `dashboard_72h.html`: ダッシュボード HTML
- `data/hourly_scores.json`: 72 時間スコアデータ

---

## 次のステップ

1. ✅ このガイドに従って GitHub Actions を設定
2. ⏳ 最初の定時実行を待機（最長24時間）
3. 📊 ダッシュボード URL で結果を確認
4. 🔔 Slack に通知が到着するか確認
5. 📈 1週間運用を監視

---

**問題が発生した場合**: ログを確認して原因を特定してください（GitHub Actions → Logs）
