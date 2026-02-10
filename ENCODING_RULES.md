# エンコーディングルール

## 📌 概要

このプロジェクトではWindows日本語環境で開発しているため、ファイルタイプごとに異なるエンコーディングを使用します。これにより、文字化けやエラーを防いでいます。

---

## 📋 ファイルタイプ別エンコーディング

### 1. バッチファイル（`.bat`）

**エンコーディング**: **Shift-JIS**（日本語Windows用）

**理由**:
- Windows CMDはデフォルトで Shift-JIS を期待
- UTF-8 で保存すると日本語が文字化けする
- Shift-JIS なら確実に動作

**ファイル例**:
- `run_shortcut_setup.bat`
- `setup_task_scheduler.bat`
- `run_forecast.bat`

**VS Code での設定**:
```json
"[bat]": {
  "files.encoding": "shiftjis"
}
```

---

### 2. PowerShell スクリプト（`.ps1`）

**エンコーディング**: **UTF-8 with BOM** または **Shift-JIS**（推奨: Shift-JIS）

**理由**:
- PowerShell は UTF-8 with BOM を推奨
- ただし Shift-JIS でも正常に動作
- 日本語環境では Shift-JIS がより安定

**ファイル例**:
- `create_desktop_shortcut.ps1`
- `setup_task_scheduler.ps1`
- `run_daily_forecast.ps1`

**VS Code での設定**:
```json
"[powershell]": {
  "files.encoding": "shiftjis"
}
```

---

### 3. JavaScript（`.js`）

**エンコーディング**: **UTF-8**（エンコーディング指定なし）

**理由**:
- Node.js は UTF-8 を標準
- JSON 形式の設定ファイルも UTF-8
- Unicodeエスケープで対応可能

**ファイル例**:
- `src/index.js`
- `src/services/*.js`
- `src/utils/*.js`

**VS Code での設定**:
```json
"[javascript]": {
  "files.encoding": "utf8"
}
```

---

### 4. Markdown（`.md`）

**エンコーディング**: **UTF-8**

**理由**:
- Markdown は Unicode 対応が標準
- GitHub/GitLab も UTF-8 を期待
- 国際対応を考慮

**ファイル例**:
- `README.md`
- `ENCODING_RULES.md`
- `v1.4_RELEASE_NOTES.md`

**VS Code での設定**:
```json
"[markdown]": {
  "files.encoding": "utf8"
}
```

---

### 5. JSON（`.json`）

**エンコーディング**: **UTF-8**

**理由**:
- JSON 仕様は UTF-8 を要求
- Node.js も UTF-8 を期待

**ファイル例**:
- `package.json`
- `.env` 関連ファイル
- 設定ファイル全般

**VS Code での設定**:
```json
"[json]": {
  "files.encoding": "utf8"
}
```

---

## ⚙️ VS Code の設定方法

### 方法1: グローバル設定（全プロジェクト共通）

`%APPDATA%\Code\User\settings.json` に以下を追加：

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

### 方法2: ワークスペース設定（このプロジェクトのみ）

`.vscode/settings.json` を作成：

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

## 🔄 既存ファイルの変換方法

### VS Code で変換する

1. ファイルを開く
2. 右下の「UTF-8」または「Shift-JIS」をクリック
3. 目的のエンコーディングを選択
4. 「変更でファイルを保存」を確認

### コマンドラインで変換する（iconv使用）

```bash
# UTF-8 → Shift-JIS
iconv -f UTF-8 -t SHIFT-JIS input.bat > output.bat

# Shift-JIS → UTF-8
iconv -f SHIFT-JIS -t UTF-8 input.bat > output.bat
```

---

## ✅ 文字化け防止チェックリスト

新しいファイル作成時に確認：

- [ ] `.bat` ファイルは **Shift-JIS** で保存した
- [ ] `.ps1` ファイルは **Shift-JIS** で保存した
- [ ] `.js` ファイルは **UTF-8** で保存した
- [ ] `.md` ファイルは **UTF-8** で保存した
- [ ] `.json` ファイルは **UTF-8** で保存した
- [ ] VS Code の右下に正しいエンコーディングが表示されている

---

## 🚨 文字化けが発生した場合

### 症状
- バッチファイルで日本語が `'医ャ繝励...'` のように見える
- PowerShell で `$ご菴懈・...` のような文字が出る

### 対策
1. 該当ファイルをVS Codeで開く
2. 右下のエンコーディングを確認
3. ファイルの正しいエンコーディングに変更
4. `Ctrl+Shift+P` → "Reopen with Encoding" を実行
5. ファイルを保存

---

## 📚 参考資料

- [Windows での日本語エンコーディング](https://docs.microsoft.com/ja-jp/globalization/encoding/cp932)
- [VS Code エンコーディング設定](https://code.visualstudio.com/docs/editor/codebasics#_encoding-support)
- [PowerShell エンコーディング](https://docs.microsoft.com/ja-jp/powershell/module/microsoft.powershell.core/about/about_character_encoding)
- [Node.js Unicode サポート](https://nodejs.org/api/util.html#util_util_inspect_object_options)

---

## 🎯 今後のルール

**Claude が ファイルを作成する場合**:
1. 拡張子を確認
2. 上記の「ファイルタイプ別エンコーディング」に従う
3. コメントに「エンコーディング: Shift-JIS」など記載

**ユーザーが ファイルを作成する場合**:
1. このドキュメントを参照
2. VS Code の設定に従う
3. 文字化けが発生したら「対策」セクションを確認
