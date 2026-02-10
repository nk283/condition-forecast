# 体調予報システム 毎日自動実行スクリプト
# 管理者権限で実行してください

param(
    [string]$ProjectPath = "c:\Users\user\claude\Projects\Condition_Forecast"
)

# プロジェクトディレクトリに移動
Set-Location $ProjectPath

# npm start を実行してデータを保存
Write-Host "体調予報システムを実行しています..." -ForegroundColor Cyan
npm start

# 実行ログを記録
$logPath = Join-Path $ProjectPath "logs"
if (-not (Test-Path $logPath)) {
    New-Item -ItemType Directory -Path $logPath | Out-Null
}

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$logFile = Join-Path $logPath "forecast_log.txt"
Add-Content -Path $logFile -Value "[$timestamp] 体調予報を実行しました"

Write-Host "実行完了！" -ForegroundColor Green
Write-Host "ダッシュボード: $(Join-Path $ProjectPath 'dashboard.html')" -ForegroundColor Yellow
