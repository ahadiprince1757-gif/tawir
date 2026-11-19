# ─────────────────────────────────────────────────────────────────────────────
# Tawi — Concurrent Dev Startup
# Starts the DRE backend (FastAPI) and React frontend in separate terminals.
#
# Usage:
#   Option A) Right-click this file → "Run with PowerShell"
#   Option B) In a terminal:  .\start-tawi.ps1
#   Option C) Double-click start-tawi.bat (same folder)
# ─────────────────────────────────────────────────────────────────────────────

$root      = Split-Path -Parent $MyInvocation.MyCommand.Definition
$drePath   = Join-Path $root "tawi-dre"
$reactPath = Join-Path $root "react-app"

Write-Host ""
Write-Host "  ████████╗ █████╗ ██╗    ██╗██╗" -ForegroundColor Cyan
Write-Host "     ██╔══╝██╔══██╗██║    ██║██║" -ForegroundColor Cyan
Write-Host "     ██║   ███████║██║ █╗ ██║██║" -ForegroundColor Cyan
Write-Host "     ██║   ██╔══██║██║███╗██║██║" -ForegroundColor Cyan
Write-Host "     ██║   ██║  ██║╚███╔███╔╝██║" -ForegroundColor Cyan
Write-Host "     ╚═╝   ╚═╝  ╚═╝ ╚══╝╚══╝ ╚═╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "  School Operating Memory  —  Dev Launcher" -ForegroundColor Green
Write-Host ""

# ── 1. Tawi DRE Backend (FastAPI/uvicorn on :8000) ───────────────────────────
Write-Host "  Starting DRE backend  (port 8000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", `
    "cd '$drePath'; `
     Write-Host ''; `
     Write-Host '  Tawi DRE Backend  ' -BackgroundColor DarkGreen -ForegroundColor White; `
     Write-Host '  http://localhost:8000  |  /docs for Swagger UI'; `
     Write-Host ''; `
     .\.venv\Scripts\Activate.ps1; `
     uvicorn app.main:app --reload --port 8000 --host 0.0.0.0"

Start-Sleep -Milliseconds 900

# ── 2. React Frontend (Vite dev server on :5173) ─────────────────────────────
Write-Host "  Starting React frontend (port 5173)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", `
    "cd '$reactPath'; `
     Write-Host ''; `
     Write-Host '  Tawi Frontend  ' -BackgroundColor DarkBlue -ForegroundColor White; `
     Write-Host '  http://localhost:5173'; `
     Write-Host ''; `
     npm run dev"

Start-Sleep -Milliseconds 1200

Write-Host ""
Write-Host "  Both services are starting in their own windows." -ForegroundColor Green
Write-Host ""
Write-Host "    DRE API   ->  http://localhost:8000" -ForegroundColor Cyan
Write-Host "    API Docs  ->  http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host "    Frontend  ->  http://localhost:5173" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Press any key to close this launcher..." -ForegroundColor DarkGray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
