@echo off
REM 体調予報システム実行バッチファイル

echo.
echo 体調予報システムを起動しています...
echo.

cd /d "c:\Users\user\claude\Projects\Condition_Forecast"

REM npm start 実行
npm start

REM ダッシュボードをブラウザで開く
if exist dashboard.html (
    echo.
    echo ダッシュボードをブラウザで開いています...
    start "" dashboard.html
)

pause
