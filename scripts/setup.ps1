# Department Digital Hub — One-command setup script
# Run from the repo root: .\scripts\setup.ps1
# Requirements: Python 3.11+ (or 3.14), Node.js 18+, npm 9+

$ErrorActionPreference = "Stop"

Write-Host "=== Department Digital Hub Setup ===" -ForegroundColor Cyan
Write-Host "Setting up backend..."

# --- Backend ---
Push-Location backend

# Create virtual environment if it doesn't exist
if (-not (Test-Path ".venv")) {
    Write-Host "Creating Python virtual environment..."
    python -m venv .venv
}

# Install dependencies
Write-Host "Installing Python dependencies..."
.venv\Scripts\pip.exe install -r requirements.txt -q

# Copy .env if not exists
if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "Copied .env.example to .env (edit it to add secrets)" -ForegroundColor Yellow
}

# Run migrations
Write-Host "Running database migrations..."
.venv\Scripts\python.exe manage.py migrate --run-syncdb

# Seed demo data
Write-Host "Seeding demo data..."
.venv\Scripts\python.exe manage.py seed_demo

Pop-Location

# --- Frontend ---
Write-Host ""
Write-Host "Setting up frontend..."
Push-Location frontend

Write-Host "Installing Node dependencies..."
npm install --silent

# Copy .env.local if not exists
if (-not (Test-Path ".env.local")) {
    Copy-Item ".env.example" ".env.local"
    Write-Host "Copied .env.example to .env.local" -ForegroundColor Yellow
}

Pop-Location

Write-Host ""
Write-Host "=== Setup complete! ===" -ForegroundColor Green
Write-Host ""
Write-Host "Department Logins (password: Demo@12345):" -ForegroundColor Cyan
Write-Host "  HOD:         hodcse@tkietwarana.ac.in  (Dr. Ramgouda B. Patil)"
Write-Host "  Faculty:     amol_patil@tkietwarana.ac.in (Prof. Amol G. Patil)"
Write-Host "  Coordinator: asphalle@tkietwarana.ac.in (Prof. Anil S. Phalle)"
Write-Host "  Principal:   principal@demo.local (Dr. D. N. Mudgal)"
Write-Host "  Student:     student01@demo.local (Roll: 23CSE001)"
Write-Host ""
Write-Host "To start the app:"
Write-Host "  Backend:  .\scripts\run-backend.ps1"
Write-Host "  Frontend: .\scripts\run-frontend.ps1"
