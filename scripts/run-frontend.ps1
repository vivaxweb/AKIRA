# Run frontend server
param (
    [switch]$Dev
)

$ErrorActionPreference = "Stop"

Push-Location "$PSScriptRoot\..\frontend"

if (-not (Test-Path "node_modules")) {
    Write-Error "node_modules not found. Please run .\scripts\setup.ps1 first."
}

if ($Dev) {
    Write-Host "Starting Next.js development server at http://localhost:3000/..." -ForegroundColor Green
    npm run dev
} else {
    if (-not (Test-Path ".next\BUILD_ID")) {
        Write-Host "Production build not found. Building application..." -ForegroundColor Cyan
        npm run build
    }
    Write-Host "Starting Next.js production server at http://localhost:3000/..." -ForegroundColor Green
    npm run start -- -p 3000
}

Pop-Location

