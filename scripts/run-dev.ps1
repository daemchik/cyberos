# Запуск API + Vite одной командой (из корня репозитория).
# Требуется: npm install в папке cyberos (в т.ч. concurrently).
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

Write-Host "API: http://127.0.0.1:8000  |  Web: http://127.0.0.1:5173" -ForegroundColor Cyan
Set-Location (Join-Path $Root "cyberos")
npm run dev:all
