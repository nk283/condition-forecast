@echo off
REM デスクトップショートカット作成バッチファイル
REM このファイルをダブルクリックして実行してください

echo.
echo ========================================
echo   体調予報 デスクトップショートカット作成
echo ========================================
echo.

REM PowerShellで新しいプロセスを起動
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$DesktopPath = [Environment]::GetFolderPath('Desktop'); " ^
  "$ShortcutPath = Join-Path $DesktopPath '体調予報.lnk'; " ^
  "$TargetPath = 'C:\Users\user\claude\Projects\Condition_Forecast\run_forecast.bat'; " ^
  "$WshShell = New-Object -ComObject WScript.Shell; " ^
  "$Shortcut = $WshShell.CreateShortcut($ShortcutPath); " ^
  "$Shortcut.TargetPath = $TargetPath; " ^
  "$Shortcut.WorkingDirectory = 'C:\Users\user\claude\Projects\Condition_Forecast'; " ^
  "$Shortcut.Description = '体調予報システムを実行します'; " ^
  "$Shortcut.Save(); " ^
  "Write-Host '✓ ショートカットを作成しました'; " ^
  "Write-Host 'パス: ' $ShortcutPath; " ^
  "Write-Host 'ターゲット: ' $TargetPath"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✓ ショートカット作成が完了しました
    echo デスクトップに「体調予報.lnk」が表示されます
    echo.
) else (
    echo.
    echo ❌ ショートカット作成に失敗しました
    echo エラーコード: %ERRORLEVEL%
    echo.
)

pause
