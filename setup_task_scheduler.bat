@echo off
REM Windows Task Scheduler 自動実行設定バッチファイル
REM 注意: このファイルを『管理者として実行』してください

echo.
echo ========================================
echo   体調予報 Task Scheduler 自動実行設定
echo ========================================
echo.

REM 管理者権限確認
net session >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo エラー: このスクリプトには管理者権限が必要です
    echo.
    echo 実行方法:
    echo 1. このファイルを右クリック
    echo 2. 「管理者として実行」を選択
    echo.
    pause
    exit /b 1
)

echo タスクを登録しています...
echo.

REM 既存タスクを削除（存在する場合）
taskkill /FI "TASKNAME eq 体調予報システム_毎日実行" /T /F >nul 2>&1
schtasks /delete /tn "体調予報システム_毎日実行" /f >nul 2>&1

REM 新しいタスクを作成
schtasks /create /tn "体調予報システム_毎日実行" ^
    /tr "powershell.exe -ExecutionPolicy Bypass -File C:\Users\user\claude\Projects\Condition_Forecast\run_daily_forecast.ps1" ^
    /sc daily /st 08:00:00 /ru %USERNAME% >nul 2>&1

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✓ Task Scheduler に登録されました
    echo.
    echo タスク名: 体調予報システム_毎日実行
    echo 実行時間: 毎日 朝8時
    echo スクリプト: run_daily_forecast.ps1
    echo.
    echo 確認方法:
    echo 1. Windows キー + R を押す
    echo 2. 「taskschd.msc」と入力して Enter
    echo 3. 「タスク スケジューラー ライブラリ」で確認
    echo.
) else (
    echo.
    echo エラー: タスク登録に失敗しました
    echo エラーコード: %ERRORLEVEL%
    echo.
    echo 管理者権限が有効か確認してください
    echo.
)

pause
