# Collagility Installer for Windows PowerShell
# Target Release: 0.1.1-beta.1

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "  ⚡ Collagility 0.1.1-beta.1 Installer" -ForegroundColor Cyan
Write-Host "  The Realtime Agentic Terminal for Collaborative AI Pair Programming" -ForegroundColor Cyan
Write-Host ""

# 1. Check Node.js runtime
$nodeInstalled = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeInstalled) {
    Write-Host "✖ Error: Node.js is not installed." -ForegroundColor Red
    Write-Host "Please install Node.js (v18.0.0 or higher) from https://nodejs.org/ before running this installer."
    exit 1
}

$nodeVerString = node -v
$nodeMajor = [int]($nodeVerString -replace 'v', '').Split('.')[0]
if ($nodeMajor -lt 18) {
    Write-Host "✖ Error: Node.js version $nodeVerString is unsupported (>= v18 required)." -ForegroundColor Red
    Write-Host "Please upgrade Node.js from https://nodejs.org/ and try again."
    exit 1
}
Write-Host "✓ Node.js $nodeVerString detected" -ForegroundColor Green

# 2. Install collagility globally via NPM
Write-Host ""
Write-Host "Installing collagility@0.1.1-beta.1 globally via NPM..." -ForegroundColor Yellow
npm install -g collagility@0.1.1-beta.1

# 3. Verify installation
Write-Host ""
Write-Host "Verifying installation..." -ForegroundColor Cyan
collagility version

Write-Host ""
Write-Host "✓ Installation Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "To start a pair programming session, run:" -ForegroundColor White
Write-Host "  collagility start" -ForegroundColor Cyan
Write-Host ""
Write-Host "To join an existing session, run:" -ForegroundColor White
Write-Host "  collagility join <sessionId>@<host-ip>" -ForegroundColor Cyan
Write-Host ""
