# Run frontend development server
$ErrorActionPreference = "Stop"

Push-Location "$PSScriptRoot\..\frontend"

if (-not (Test-Path "node_modules")) {
    Write-Error "node_modules not found. Please run .\scripts\setup.ps1 first."
}

Write-Host "Starting Next.js development server at http://localhost:3000/..." -ForegroundColor Green
npm run dev

Pop-Location
