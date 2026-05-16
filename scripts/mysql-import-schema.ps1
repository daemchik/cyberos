# Импорт backend/schema.sql в MySQL из PowerShell (оператор "<" в PS не работает для mysql).
# Запуск из корня репозитория:
#   .\scripts\mysql-import-schema.ps1
# или с путём к sql:
#   .\scripts\mysql-import-schema.ps1 -SqlPath "C:\path\to\schema.sql"

param(
    [string]$SqlPath = $(Join-Path $PSScriptRoot "..\backend\schema.sql")
)

$SqlPath = [System.IO.Path]::GetFullPath($SqlPath)

if (-not (Test-Path -LiteralPath $SqlPath)) {
    Write-Error "Файл не найден: $SqlPath"
    exit 1
}

Write-Host "Импорт в MySQL: $SqlPath"
Write-Host "Введите пароль root при запросе."
Get-Content -LiteralPath $SqlPath -Raw -Encoding UTF8 | & mysql -u root -p
if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}
Write-Host "Готово."
