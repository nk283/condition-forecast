@echo off
REM 体調予報を実行するバッチファイル
REM このファイルをダブルクリックして実行してください
REM エンコーディング: Shift-JIS

cd /d "C:\Users\user\claude\Projects\Condition_Forecast"

echo.
echo ========================================
echo    体調予報システムを起動しています
echo ========================================
echo.

npm start

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo エラーが発生しました
    echo エラーコード: %ERRORLEVEL%
    echo.
)

echo.
echo 完了しました
echo.

if exist dashboard.html (
    echo ダッシュボードをブラウザで開きます...
    start "" dashboard.html
)

pause
