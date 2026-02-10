@echo off
REM Create Desktop Shortcut for Condition Forecast
REM Encoding: Shift-JIS

echo.
echo ========================================
echo   Create Desktop Shortcut
echo ========================================
echo.

REM Launch PowerShell to create shortcut
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$DesktopPath = [Environment]::GetFolderPath('Desktop'); " ^
  "$ShortcutPath = Join-Path $DesktopPath '体調予報.lnk'; " ^
  "$TargetPath = 'C:\Users\user\claude\Projects\Condition_Forecast\run_forecast.bat'; " ^
  "$WshShell = New-Object -ComObject WScript.Shell; " ^
  "$Shortcut = $WshShell.CreateShortcut($ShortcutPath); " ^
  "$Shortcut.TargetPath = $TargetPath; " ^
  "$Shortcut.WorkingDirectory = 'C:\Users\user\claude\Projects\Condition_Forecast'; " ^
  "$Shortcut.Description = 'Body Condition Forecast'; " ^
  "$Shortcut.Save(); " ^
  "Write-Host 'Shortcut created'; " ^
  "Write-Host 'Path: ' $ShortcutPath; " ^
  "Write-Host 'Target: ' $TargetPath"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo Shortcut created successfully
    echo.
) else (
    echo.
    echo Failed to create shortcut
    echo Error code: %ERRORLEVEL%
    echo.
)

pause
