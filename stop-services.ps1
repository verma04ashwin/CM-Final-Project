# Stop all services script

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "🛑 Stopping Stroke Risk Prediction Services" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# Stop by PIDs if file exists
if (Test-Path ".service_pids.txt") {
    Write-Host "`n📝 Reading saved process IDs..." -ForegroundColor Yellow
    $pids = Get-Content ".service_pids.txt"
    foreach ($pid in $pids) {
        if ($pid) {
            try {
                Stop-Process -Id $pid -Force -ErrorAction Stop
                Write-Host "✓ Stopped process $pid" -ForegroundColor Green
            } catch {
                Write-Host "⚠️  Process $pid not found (may already be stopped)" -ForegroundColor Yellow
            }
        }
    }
    Remove-Item ".service_pids.txt" -ErrorAction SilentlyContinue
}

# Also check ports and stop any processes
Write-Host "`n🔍 Checking for processes on ports..." -ForegroundColor Yellow

# Port 5000 (Flask)
$port5000 = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue
if ($port5000) {
    $pid = $port5000.OwningProcess
    Stop-Process -Id $pid -Force
    Write-Host "✓ Stopped Flask service (PID $pid) on port 5000" -ForegroundColor Green
} else {
    Write-Host "✓ Port 5000 is free" -ForegroundColor Green
}

# Port 3001 (Node.js)
$port3001 = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
if ($port3001) {
    $pid = $port3001.OwningProcess
    Stop-Process -Id $pid -Force
    Write-Host "✓ Stopped Node.js service (PID $pid) on port 3001" -ForegroundColor Green
} else {
    Write-Host "✓ Port 3001 is free" -ForegroundColor Green
}

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "✅ All services stopped" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
