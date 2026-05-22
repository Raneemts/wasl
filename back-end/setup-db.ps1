# Load db.sql without PowerShell pipe encoding issues (Arabic ENUM values).
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$sqlPath = (Resolve-Path ".\db.sql").Path -replace '\\', '/'
Write-Host "Loading: $sqlPath"
Write-Host "Enter MySQL root password when prompted."

& mysql -u root -p --default-character-set=utf8mb4 -e "SOURCE $sqlPath;"
if ($LASTEXITCODE -eq 0) {
    Write-Host "Done. Database wasl_db is ready."
} else {
    Write-Host "Failed. Check password and that MySQL is running."
    exit $LASTEXITCODE
}
