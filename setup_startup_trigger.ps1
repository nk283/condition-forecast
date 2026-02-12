# Windows Task Scheduler 起動時トリガー設定スクリプト
# 実行方法: powershell -ExecutionPolicy Bypass -File setup_startup_trigger.ps1
# 注意: 管理者権限が必要です

$TaskName = "体調予報システム_毎日実行"
$ScriptPath = "C:\Users\user\claude\Projects\Condition_Forecast\run_daily_forecast.ps1"
$ProjectPath = "C:\Users\user\claude\Projects\Condition_Forecast"

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

# タスクトリガー定義（パソコン起動時 = 休止状態復帰含む）
$Trigger = New-ScheduledTaskTrigger -AtStartup

# タスク設定（重複実行防止）
$Settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -StartWhenAvailable

# タスク登録
try {
    Register-ScheduledTask -TaskName $TaskName `
        -Action $Action `
        -Trigger $Trigger `
        -Settings $Settings `
        -Description "パソコン起動時に体調予報を実行（休止状態復帰含む）" `
        -Force | Out-Null

    Write-Host "✓ Task Scheduler に登録されました"
    Write-Host "  タスク名: $TaskName"
    Write-Host "  実行タイミング: パソコン起動時（休止状態復帰を含む）"
    Write-Host "  スクリプト: $ScriptPath"
    Write-Host ""
    Write-Host "📝 タスクの確認方法:"
    Write-Host "  1. Windows キー + R キーを押す"
    Write-Host "  2. 'taskschd.msc' と入力して Enter"
    Write-Host "  3. タスク スケジューラー ライブラリで '$TaskName' を検索"
    Write-Host "  4. トリガータブで『起動時』に設定されていることを確認"
    Write-Host ""
    Write-Host "✅ 設定仕様:"
    Write-Host "  - パソコン起動時: ✓ 実行"
    Write-Host "  - 休止状態から復帰: ✓ 実行"
    Write-Host "  - 重複実行防止: ✓ 有効（前回実行中なら無視）"

} catch {
    Write-Host "❌ タスク登録に失敗しました"
    Write-Host "エラー: $_"
    Write-Host ""
    Write-Host "💡 解決方法:"
    Write-Host "  1. PowerShell を『管理者として実行』"
    Write-Host "  2. 実行ポリシーを変更: Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope CurrentUser"
    Write-Host "  3. 再度このスクリプトを実行"
}
