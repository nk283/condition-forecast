@echo off
REM Setup Windows Task Scheduler for Daily Execution
REM Encoding: Shift-JIS
REM Note: Requires administrator rights

echo.
echo ========================================
echo   Setup Task Scheduler
echo ========================================
echo.

REM Check admin rights
net session >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Error: This script requires administrator rights
    echo.
    echo How to run:
    echo 1. Right-click this file
    echo 2. Select "Run as administrator"
    echo.
    pause
    exit /b 1
)

echo Registering task...
echo.

REM Delete existing task if present
taskkill /FI "TASKNAME eq 体調予報システム_毎日実行" /T /F >nul 2>&1
schtasks /delete /tn "体調予報システム_毎日実行" /f >nul 2>&1

REM Create new task
schtasks /create /tn "体調予報システム_毎日実行" ^
    /tr "powershell.exe -ExecutionPolicy Bypass -File C:\Users\user\claude\Projects\Condition_Forecast\run_daily_forecast.ps1" ^
    /sc daily /st 08:00:00 /ru %USERNAME% >nul 2>&1

if %ERRORLEVEL% EQU 0 (
    echo.
    echo Task registered successfully
    echo.
    echo Task name: 体調予報システム_毎日実行
    echo Run time: Daily at 08:00
    echo Script: run_daily_forecast.ps1
    echo.
) else (
    echo.
    echo Failed to register task
    echo Error code: %ERRORLEVEL%
    echo.
)

pause
