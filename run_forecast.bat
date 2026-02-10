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
echo Waiting for dashboard generation...
timeout /t 2 /nobreak

echo Opening dashboard in browser...
if exist dashboard_72h.html (
    start "" "dashboard_72h.html"
) else if exist dashboard.html (
    start "" "dashboard.html"
) else (
    echo Error: dashboard file not found
)

echo.
echo Complete
echo.

pause
