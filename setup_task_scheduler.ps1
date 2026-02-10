# Windows Task Scheduler 自動実行設定スクリプト
# 実行方法: powershell -ExecutionPolicy Bypass -File setup_task_scheduler.ps1
# 注意: 管理者権限が必要です

# 実行ポリシーの確認
if ((Get-ExecutionPolicy) -eq "Restricted") {
    Write-Host "⚠️  実行ポリシーが制限されています"
    Write-Host "以下のコマンドを実行してください:"
    Write-Host "powershell -ExecutionPolicy Bypass -File setup_task_scheduler.ps1"
    exit
}

$TaskName = "体調予報システム_毎日実行"
$ScriptPath = "C:\Users\user\claude\Projects\Condition_Forecast\run_daily_forecast.ps1"
$ProjectPath = "C:\Users\user\claude\Projects\Condition_Forecast"

# タスク実行時間（朝8時）
$Time = "08:00:00"

# 既存タスクを削除（存在する場合）
try {
    $existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    if ($existingTask) {
        Write-Host "既存のタスクを削除しています..."
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
        Start-Sleep -Seconds 2
    }
} catch {
    Write-Host "既存タスクの削除に失敗しました（初回実行の場合は無視可）"
}

# タスクアクション定義
$Action = New-ScheduledTaskAction -Execute "PowerShell.exe" `
    -Argument "-ExecutionPolicy Bypass -File `"$ScriptPath`"" `
    -WorkingDirectory $ProjectPath

# タスクトリガー定義（毎日8時に実行）
$Trigger = New-ScheduledTaskTrigger -Daily -At $Time

# タスク設定
$Settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -StartWhenAvailable

# タスク登録
try {
    Register-ScheduledTask -TaskName $TaskName `
        -Action $Action `
        -Trigger $Trigger `
        -Settings $Settings `
        -Description "毎日体調予報を実行してデータを蓄積します" `
        -Force | Out-Null

    Write-Host "✓ Task Scheduler に登録されました"
    Write-Host "  タスク名: $TaskName"
    Write-Host "  実行時間: 毎日 $Time"
    Write-Host "  スクリプト: $ScriptPath"
    Write-Host ""
    Write-Host "📝 タスクの確認方法:"
    Write-Host "  1. Windows キー + R キーを押す"
    Write-Host "  2. 'taskschd.msc' と入力して Enter"
    Write-Host "  3. タスク スケジューラー ライブラリで '$TaskName' を検索"
    Write-Host ""
    Write-Host "⚙️  実行時間を変更したい場合:"
    Write-Host "  # 新しい時間を指定して再度このスクリプトを実行してください"
    Write-Host "  # `$Time 変数の値を変更してください"

} catch {
    Write-Host "❌ タスク登録に失敗しました"
    Write-Host "エラー: $_"
    Write-Host ""
    Write-Host "💡 解決方法:"
    Write-Host "  1. PowerShell を『管理者として実行』"
    Write-Host "  2. 実行ポリシーを変更: Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope CurrentUser"
    Write-Host "  3. 再度このスクリプトを実行"
}
