# 文字化け修正サマリ

## 🐛 問題

Windows日本語環境で、バッチファイル実行時に以下のような文字化けが発生していました：

```
'医ャ繝励ｧ繧ｦ繧ｻ... は、内部コマンドまたは外部コマンド...
```

### 原因

バッチファイル（`.bat`）が **UTF-8** で保存されていたが、Windows CMDは **Shift-JIS** を期待していたため。

---

## ✅ 修正内容

### 1. バッチファイルのエンコーディング変更

| ファイル | 変更前 | 変更後 |
|---------|-------|-------|
| `run_shortcut_setup.bat` | UTF-8 | **Shift-JIS** |
| `setup_task_scheduler.bat` | UTF-8 | **Shift-JIS** |
| `run_forecast.bat` | UTF-8 | **Shift-JIS** |

### 2. プロジェクトルール確立

- **ENCODING_RULES.md**: 詳細なエンコーディングルール
- **README.md**: エンコーディングセクション追加
- **CLAUDE.md**: プロジェクトレベルのエンコーディング指定

### 3. VS Code 設定推奨

```json
{
  "[bat]": {
    "files.encoding": "shiftjis"
  },
  "[powershell]": {
    "files.encoding": "shiftjis"
  },
  "[javascript]": {
    "files.encoding": "utf8"
  },
  "[markdown]": {
    "files.encoding": "utf8"
  },
  "[json]": {
    "files.encoding": "utf8"
  }
}
```

---

## 📋 ファイルタイプ別エンコーディング

| 拡張子 | エンコーディング | 理由 |
|-------|---|---|
| `.bat` | **Shift-JIS** | Windows CMD用（UTF-8だと文字化け） |
| `.ps1` | **Shift-JIS** | PowerShell用（Shift-JIS推奨） |
| `.js` | **UTF-8** | Node.js 標準エンコーディング |
| `.md` | **UTF-8** | GitHub等 国際対応標準 |
| `.json` | **UTF-8** | JSON 仕様は UTF-8 を要求 |

---

## 🔍 修正確認

### テスト結果

✅ `run_shortcut_setup.bat` をダブルクリック実行
```
========================================
  体調予報 デスクトップショートカット作成
========================================

ショートカットを作成しました
パス: C:\Users\user\Desktop\体調予報.lnk
ターゲット: C:\Users\user\claude\Projects\Condition_Forecast\run_forecast.bat

ショートカット作成が完了しました
デスクトップに「体調予報.lnk」が表示されます
```

✅ デスクトップに「体調予報.lnk」が正常に作成されたことを確認

---

## 🚀 今後の対策

### Claude が ファイルを作成する際のルール

1. **ファイル拡張子を確認**
2. **上記の「ファイルタイプ別エンコーディング」テーブルに従う**
3. **ファイルコメントに「エンコーディング: Shift-JIS」など記載**

### ユーザーが ファイルを作成する際のルール

1. **ENCODING_RULES.md を参照**
2. **VS Code の settings.json を設定**
3. **ファイル作成後、右下にエンコーディングが表示されているか確認**

### 文字化けが発生した場合

1. VS Code で該当ファイルを開く
2. 右下のエンコーディング名をクリック
3. 正しいエンコーディングを選択
4. `Ctrl+Shift+P` → "Reopen with Encoding" を実行

---

## 📚 ドキュメント

### 詳細ガイド
- [ENCODING_RULES.md](ENCODING_RULES.md): 完全なエンコーディングガイド
- [README.md](README.md#🔤-ファイルエンコーディングルール): README のエンコーディングセクション
- [CLAUDE.md](../CLAUDE.md): プロジェクトレベルのルール

---

## ✨ 修正後の動作

### ショートカット作成

```bash
# バッチファイルをダブルクリック
run_shortcut_setup.bat
```

**結果**: デスクトップに「体調予報.lnk」が作成される ✅

### Task Scheduler 設定

```bash
# バッチファイルを右クリック → 「管理者として実行」
setup_task_scheduler.bat
```

**結果**: 毎日朝8時に自動実行されるタスクが登録される ✅

### 体調予報実行

```bash
# デスクトップの「体調予報」をダブルクリック
体調予報.lnk
```

**結果**: 体調予報が実行される ✅

---

**修正日**: 2026年2月10日
**関連コミット**: 3fc531c, 693ffda
**ステータス**: 完全修正 ✅
