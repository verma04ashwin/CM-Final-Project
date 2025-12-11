# Stroke Risk Prediction System - Startup Script
# This script starts both the Flask model service and Node.js server

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "🏥 Stroke Risk Prediction System - Starting Services" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# Check if stroke_model.h5 exists
if (-not (Test-Path "stroke_model.h5")) {
    Write-Host "❌ Error: stroke_model.h5 not found!" -ForegroundColor Red
    Write-Host "   Please ensure your trained model is in the project directory." -ForegroundColor Yellow
    exit 1
}

Write-Host "`n✓ Found stroke_model.h5" -ForegroundColor Green

# Check Python dependencies
Write-Host "`n📦 Checking Python dependencies..." -ForegroundColor Yellow
$pipList = pip list 2>$null
if ($pipList -match "flask" -and $pipList -match "tensorflow") {
    Write-Host "✓ Python dependencies installed" -ForegroundColor Green
} else {
    Write-Host "⚠️  Installing Python dependencies..." -ForegroundColor Yellow
    pip install -r requirements.txt
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install Python dependencies" -ForegroundColor Red
        exit 1
    }
}

# Check Node.js dependencies
Write-Host "`n📦 Checking Node.js dependencies..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Write-Host "✓ Node.js dependencies installed" -ForegroundColor Green
} else {
    Write-Host "⚠️  Installing Node.js dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install Node.js dependencies" -ForegroundColor Red
        exit 1
    }
}

# Check if ports are available
Write-Host "`n🔍 Checking port availability..." -ForegroundColor Yellow

# Check port 5000 (Flask)
$port5000 = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue
if ($port5000) {
    Write-Host "⚠️  Port 5000 is in use. Stopping existing process..." -ForegroundColor Yellow
    $pid = $port5000.OwningProcess
    Stop-Process -Id $pid -Force
    Start-Sleep -Seconds 2
}

# Check port 3001 (Node.js)
$port3001 = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
if ($port3001) {
    Write-Host "⚠️  Port 3001 is in use. Stopping existing process..." -ForegroundColor Yellow
    $pid = $port3001.OwningProcess
    Stop-Process -Id $pid -Force
    Start-Sleep -Seconds 2
}

Write-Host "✓ Ports 5000 and 3001 are available" -ForegroundColor Green

# Start Flask model service in background
Write-Host "`n🚀 Starting Flask Model Service (Port 5000)..." -ForegroundColor Cyan
$flaskJob = Start-Process -FilePath "python" -ArgumentList "model_service.py" -PassThru -WindowStyle Normal
Start-Sleep -Seconds 5

# Check if Flask started successfully
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/health" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✓ Flask Model Service is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to start Flask Model Service" -ForegroundColor Red
    Write-Host "   Please check the Flask terminal for errors." -ForegroundColor Yellow
    exit 1
}

# Start Node.js server in background
Write-Host "`n🚀 Starting Node.js Server (Port 3001)..." -ForegroundColor Cyan
$nodeJob = Start-Process -FilePath "node" -ArgumentList "server.js" -PassThru -WindowStyle Normal
Start-Sleep -Seconds 3

# Check if Node.js started successfully
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✓ Node.js Server is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to start Node.js Server" -ForegroundColor Red
    Write-Host "   Please check the Node.js terminal for errors." -ForegroundColor Yellow
    Stop-Process -Id $flaskJob.Id -Force -ErrorAction SilentlyContinue
    exit 1
}

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "✅ SYSTEM READY!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "🌐 Web Interface:        http://localhost:3001" -ForegroundColor White
Write-Host "🔬 Model Service:        http://localhost:5000" -ForegroundColor White
Write-Host "📊 Model Health:         http://localhost:5000/health" -ForegroundColor White
Write-Host "📈 Model Info:           http://localhost:5000/model/info" -ForegroundColor White
Write-Host ""
Write-Host "📝 Process IDs:" -ForegroundColor Yellow
Write-Host "   Flask (Python):  PID $($flaskJob.Id)" -ForegroundColor White
Write-Host "   Node.js:         PID $($nodeJob.Id)" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  To stop both services, run: .\stop-services.ps1" -ForegroundColor Yellow
Write-Host "   Or press Ctrl+C in both terminal windows" -ForegroundColor Yellow
Write-Host ""
Write-Host "📚 Quick Start Guide: PREDICTION_QUICKSTART.md" -ForegroundColor Cyan
Write-Host "📖 Full Documentation: MODEL_INTEGRATION.md" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# Save PIDs for stop script
$flaskJob.Id, $nodeJob.Id | Out-File -FilePath ".service_pids.txt"

Write-Host "`n✨ Opening web browser..." -ForegroundColor Green
Start-Sleep -Seconds 2
Start-Process "http://localhost:3001"

Write-Host "`nPress any key to view the logs (services will keep running)..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
