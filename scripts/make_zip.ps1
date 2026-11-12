# Build submission ZIP for Department Digital Hub
# Excludes: node_modules, .venv, .next, .env, db.sqlite3, __pycache__, .git, etc.
$ErrorActionPreference = "Stop"

$rootDir = Resolve-Path "$PSScriptRoot\.."
$zipOutput = Join-Path $rootDir "submission.zip"

if (Test-Path $zipOutput) {
    Remove-Item $zipOutput -Force
    Write-Host "Removed existing submission.zip"
}

$tempDir = Join-Path ([System.IO.Path]::GetTempPath()) ("ddh_zip_" + [System.Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $tempDir | Out-Null

Write-Host "Copying project files to temporary staging directory..." -ForegroundColor Cyan

$excludeRegex = '(\\|\/)(node_modules|\.venv|venv|\.next|__pycache__|\.git|\.chroma|chroma_db|staticfiles|media)(\\|\/|$)|(\.env|\.env\.local|db\.sqlite3|submission\.zip)$'

Get-ChildItem -Path $rootDir -Recurse | ForEach-Object {
    $relative = $_.FullName.Substring($rootDir.Path.Length + 1)
    
    if ($relative -notmatch $excludeRegex) {
        $targetPath = Join-Path $tempDir $relative
        if ($_.PSIsContainer) {
            New-Item -ItemType Directory -Path $targetPath -Force | Out-Null
        } else {
            $parent = Split-Path -Path $targetPath -Parent
            if (-not (Test-Path $parent)) {
                New-Item -ItemType Directory -Path $parent -Force | Out-Null
            }
            Copy-Item -Path $_.FullName -Destination $targetPath -Force
        }
    }
}

Write-Host "Creating submission.zip..." -ForegroundColor Cyan
Compress-Archive -Path "$tempDir\*" -DestinationPath $zipOutput -CompressionLevel Optimal
Remove-Item -Path $tempDir -Recurse -Force

$zipSizeMB = [math]::Round(((Get-Item $zipOutput).Length / 1MB), 2)
Write-Host "Submission ZIP created successfully: $zipOutput ($zipSizeMB MB)" -ForegroundColor Green
