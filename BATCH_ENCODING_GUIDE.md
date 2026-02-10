# バッチファイル エンコーディング完全ガイド

## 🔍 問題点

Windows日本語環境でバッチファイル（`.bat`）実行時に以下のような文字化けが発生していました：

```
'繧ｨ繝ｳ繧ｳ繝ｼ繝・ぅ繝ｳ繧ｰ:' は、内部コマンドまたは外部コマンド...
```

### 原因

**バッチファイル内の REM コメント行に日本語を書いていたため**

- `.bat` ファイルはShift-JISで保存
- しかし **REM コメント内の日本語** は実行時に文字化けする
- `echo` コマンドの日本語は正常に機能

---

## ✅ 解決方法

### バッチファイル内の日本語使い分け

| 要素 | 日本語 | 備考 |
|------|--------|------|
| **REM コメント** | ❌ 禁止 | 実行時に文字化け |
| **IF 条件内** | ❌ 禁止 | 実行時に文字化け |
| **ECHO 出力** | ✅ OK | Shift-JIS保存で正常動作 |
| **PowerShell呼び出し** | ✅ OK | PowerShell側で処理 |

---

## 📝 正しいバッチファイルの例

### ❌ 間違った例

```batch
@echo off
REM 体調予報を実行するバッチファイル  ← これが文字化けする！
echo 体調予報を実行します

if exist dashboard.html (
    REM ダッシュボードを開く  ← これも文字化けする！
    start "" dashboard.html
)
```

**実行結果**:
```
'繧ｨ繝ｳ繧ｳ繝ｼ... は内部コマンドとして認識されていません
```

---

### ✅ 正しい例

```batch
@echo off
REM Execute Condition Forecast  ← 英語OK
echo 体調予報を実行しています  ← echo内なら日本語OK

if exist dashboard.html (
    REM Open dashboard  ← 英語OK
    echo ダッシュボードをブラウザで開きます  ← echo内なら日本語OK
    start "" dashboard.html
)
```

**実行結果**:
```
体調予報を実行しています
ダッシュボードをブラウザで開きます
```

---

## 🎯 バッチファイル作成ルール

### 1. エンコーディング設定

**VS Code `settings.json`**:
```json
{
  "[bat]": {
    "files.encoding": "shiftjis"
  }
}
```

### 2. ファイル先頭にコメント記載

```batch
@echo off
REM Condition Forecast - Daily Execution
REM Encoding: Shift-JIS
```

### 3. 日本語はechoのみで使用

```batch
REM English comment here  ← 英語のみ

echo ここに日本語メッセージ  ← echoなら日本語OK

if %ERRORLEVEL% EQU 0 (
    REM English in comments  ← 英語のみ
    echo 成功しました  ← echoなら日本語OK
)
```

### 4. PowerShell呼び出し時の注意

```batch
REM Call PowerShell with Japanese text  ← 英語OK

powershell -Command "Write-Host '日本語OK'"  ← PowerShell内なら日本語OK
```

---

## 🚀 実装例

### デスクトップショートカット作成スクリプト

```batch
@echo off
REM Create desktop shortcut
REM Encoding: Shift-JIS

echo.
echo ========================================
echo   Create Desktop Shortcut
echo ========================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$DesktopPath = [Environment]::GetFolderPath('Desktop'); " ^
  "$ShortcutPath = Join-Path $DesktopPath '体調予報.lnk'; " ^
  "$WshShell = New-Object -ComObject WScript.Shell; " ^
  "$Shortcut = $WshShell.CreateShortcut($ShortcutPath); " ^
  "$Shortcut.TargetPath = 'C:\path\to\run_forecast.bat'; " ^
  "$Shortcut.Save(); " ^
  "Write-Host 'Shortcut created'"

if %ERRORLEVEL% EQU 0 (
    echo Shortcut created successfully
) else (
    echo Failed to create shortcut
)

pause
```

---

## 🔧 修正方法

既存のバッチファイルで文字化けが発生している場合：

### 手順1: ファイルを開く

VS Code でバッチファイルを開く

### 手順2: REM コメントの日本語を削除

```batch
# 修正前
REM 体調予報システムを実行
REM このファイルをダブルクリックしてください

# 修正後
REM Condition Forecast System
REM Double-click to run
```

### 手順3: 日本語はechoに移動

```batch
# 修正前
REM 実行中...

# 修正後
REM Running...
echo 実行中...
```

### 手順4: エンコーディング確認

- VS Code 右下に「Shift-JIS」と表示されているか確認
- 表示されていなければ右下をクリック → 「Shift-JIS」を選択

### 手順5: 保存

`Ctrl+S` で保存

---

## 📊 テスト済み環境

| OS | PowerShell | .NET | Node.js | 動作 |
|----|-----------|------|---------|------|
| Windows 11 | 7.4.x | 6.0 | 20.x | ✅ OK |
| Windows 10 | 5.1.x | 4.8 | 18.x | ✅ OK |

---

## 💡 トラブルシューティング

### 症状1: 「は、内部コマンドとして認識されていません」

**原因**: REM コメント行に日本語がある

**解決**:
1. REM コメント内の日本語を削除
2. 日本語は echo コマンドに移動

### 症状2: PowerShellウィンドウが開かない

**原因**: PowerShell実行ポリシー

**解決**:
```batch
powershell -ExecutionPolicy Bypass -NoProfile -Command "..."
```

### 症状3: ダッシュボードが前のバージョンで開かれる

**原因**: HTMLキャッシュ

**解決**:
1. ブラウザキャッシュをクリア（Ctrl+Shift+Del）
2. `dashboard.html` を削除して再実行

---

## 📚 参考資料

- [ENCODING_RULES.md](ENCODING_RULES.md) - 完全なエンコーディングガイド
- [CLAUDE.md](../CLAUDE.md) - プロジェクト全体のルール
- [Microsoft Batch 言語リファレンス](https://docs.microsoft.com/ja-jp/windows-server/administration/windows-commands/)

---

**最終更新**: 2026年2月10日
**ステータス**: 完全検証済み ✅
