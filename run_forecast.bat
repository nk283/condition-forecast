@echo off
REM Condition Forecast - Body Condition Prediction System
REM Encoding: Shift-JIS

cd /d "C:\Users\user\claude\Projects\Condition_Forecast"

echo.
echo ========================================
echo    Condition Forecast - Running...
echo ========================================
echo.

npm start

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Error occurred
    echo Error code: %ERRORLEVEL%
    echo.
)

echo.
echo Complete
echo.

if exist dashboard.html (
    echo Opening dashboard in browser...
    start "" dashboard.html
)

pause
