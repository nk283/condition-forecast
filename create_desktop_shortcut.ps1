# デスクトップショートカット作成スクリプト
# 実行方法: powershell -ExecutionPolicy Bypass -File create_desktop_shortcut.ps1

$DesktopPath = [Environment]::GetFolderPath('Desktop')
$ShortcutPath = Join-Path $DesktopPath "体調予報.lnk"
$TargetPath = "C:\Users\user\claude\Projects\Condition_Forecast\run_forecast.bat"

# COM オブジェクトを作成
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)

# ショートカットの設定
$Shortcut.TargetPath = $TargetPath
$Shortcut.WorkingDirectory = "C:\Users\user\claude\Projects\Condition_Forecast"
$Shortcut.Description = "体調予報システムを実行します"

# ショートカットを保存
$Shortcut.Save()

Write-Host "ショートカットを作成しました"
Write-Host "パス: $ShortcutPath"
Write-Host "ターゲット: $TargetPath"
