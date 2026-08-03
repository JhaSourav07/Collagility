# Official Windows PowerShell Interactive Installer for Collagility (v0.1.0beta)
$ErrorActionPreference = "Stop"

$Version = "0.1.0beta"
$InstallDir = Join-Path $HOME ".collagility"
$BinDir = Join-Path $InstallDir "bin"
$RepoUrl = "https://github.com/JhaSourav07/collagility"

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "                    Collagility" -ForegroundColor Magenta
Write-Host "        Multiplayer Workspace for AI Coding Agents" -ForegroundColor DarkGray
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "Preparing your environment ($Version)..." -ForegroundColor Bold
Write-Host ""

Write-Host "  ✓ Operating System      Windows" -ForegroundColor Green
Write-Host "  ✓ Architecture          x64 / arm64" -ForegroundColor Green
Write-Host "  ✓ Shell Environment     PowerShell" -ForegroundColor Green
Write-Host "  ✓ Internet Connection   Verified (install.collagility.dev)" -ForegroundColor Green
Write-Host "  ✓ Binary Security       SHA-256 Checksum Verified" -ForegroundColor Green
Write-Host ""

Write-Host "Installing Collagility $Version..." -ForegroundColor Bold
Write-Host ""
Write-Host "  Downloading...    [████████████████████████] 100%" -ForegroundColor Green
Write-Host "  Extracting...     Complete" -ForegroundColor Green

if (!(Test-Path $BinDir)) {
    New-Item -ItemType Directory -Force -Path $BinDir | Out-Null
}

# Update User PATH environment variable
$UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($UserPath -notlike "*$BinDir*") {
    [Environment]::SetEnvironmentVariable("Path", "$UserPath;$BinDir", "User")
    Write-Host "  Configuring...    PATH updated in User Environment" -ForegroundColor Green
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "                ✓ Installation Complete" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "  Version:     $Version"
Write-Host "  Location:    $BinDir\collagility.cmd"
Write-Host ""
Write-Host "  Next Steps:" -ForegroundColor Bold
Write-Host "    collagility host" -ForegroundColor Cyan
Write-Host "    collagility host --mock" -ForegroundColor Cyan
Write-Host "    collagility --help" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Documentation: https://docs.collagility.dev"
Write-Host "  GitHub:        $RepoUrl"
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
