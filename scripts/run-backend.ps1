# Run backend development server
$ErrorActionPreference = "Stop"

Push-Location "$PSScriptRoot\..\backend"

if (-not (Test-Path ".venv")) {
    Write-Error "Virtual environment not found. Please run .\scripts\setup.ps1 first."
}

Write-Host "Starting Django development server at http://127.0.0.1:8000/..." -ForegroundColor Green
& .\.venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000

Pop-Location
