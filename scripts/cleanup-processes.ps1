# Windows PowerShell process cleanup script

Write-Host "🔍 Finding all Node.js processes..." -ForegroundColor Cyan

$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue

if ($null -eq $nodeProcesses) {
    Write-Host "✅ No Node.js processes found" -ForegroundColor Green
    exit 0
}

Write-Host "Found $($nodeProcesses.Count) Node.js process(es):" -ForegroundColor Yellow
$nodeProcesses | Format-Table Id, ProcessName, StartTime, CPU -AutoSize

Write-Host ""
$confirmation = Read-Host "Do you want to terminate these processes? (y/n)"

if ($confirmation -eq 'y') {
    foreach ($process in $nodeProcesses) {
        try {
            Write-Host "Terminating PID $($process.Id)..." -NoNewline
            Stop-Process -Id $process.Id -Force -ErrorAction Stop
            Write-Host " ✅" -ForegroundColor Green
        }
        catch {
            Write-Host " ❌ Failed: $_" -ForegroundColor Red
        }
    }

    # Check for processes on ports 3000-3010
    Write-Host ""
    Write-Host "🔍 Checking for processes on ports 3000-3010..." -ForegroundColor Cyan

    for ($port = 3000; $port -le 3010; $port++) {
        $connection = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        if ($connection) {
            $pid = $connection.OwningProcess
            Write-Host "Killing process on port ${port} (PID: ${pid})"
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
        }
    }

    Write-Host ""
    Write-Host "✅ Cleanup complete!" -ForegroundColor Green

    # Verify
    $remaining = Get-Process -Name "node" -ErrorAction SilentlyContinue
    if ($null -eq $remaining) {
        Write-Host "✅ All Node.js processes terminated successfully" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Warning: $($remaining.Count) process(es) may still be running" -ForegroundColor Yellow
    }
} else {
    Write-Host "Cleanup cancelled" -ForegroundColor Yellow
}