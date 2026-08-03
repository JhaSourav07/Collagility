# Installing Collagility (`v0.1.0beta`)

Collagility is an open-source collaborative terminal workspace for AI coding agents.

---

## Quick Start (Official Installer)

### Linux & macOS
Run the interactive installer in your terminal:
```bash
curl -fsSL https://install.collagility.dev | sh
```
Or execute `install.sh` directly:
```bash
./install.sh
```

### Windows (PowerShell)
Run the PowerShell installer in Windows Terminal:
```powershell
iwr -useb https://install.collagility.dev/ps1 | iex
```
Or execute `install.ps1`:
```powershell
.\install.ps1
```

---

## Verifying Installation

Verify that `collagility` is installed and accessible in your `PATH`:
```bash
collagility version
```
Expected output:
```text
  Collagility v0.1.0beta
  Node.js v22.x
  Platform linux/x86_64
```

---

## Getting Started Commands

Start and host a multiplayer AI workspace session:
```bash
collagility start
# or using the host alias:
collagility host
```

Start instantly in mock mode (without external AI process dependency):
```bash
collagility start --mock
# or using the host alias:
collagility host --mock
```

Join an active session hosted by a team member:
```bash
collagility join <session-id>
```

---

## Uninstallation

To completely remove Collagility binaries and configurations:
```bash
curl -fsSL https://install.collagility.dev/uninstall | sh
```
Or execute `./uninstall.sh`.
