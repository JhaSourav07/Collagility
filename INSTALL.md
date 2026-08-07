# Collagility Installation & Setup Guide

This guide provides instructions for installing, building, and configuring Collagility for local pair programming and multi-device LAN collaboration.

---

## 📋 Prerequisites

### Required Runtimes
- **Node.js**: `>=22.0.0`
- **pnpm**: `>=9.0.0` (`corepack enable` or `npm install -g pnpm`)

### Optional AI Agent Executables
Collagility includes a built-in mock mode (`--mock`), but for live AI pair programming you should have at least one AI CLI tool installed and accessible in your system `PATH`:
- **Google Antigravity CLI**: `agy` (v2.0+)
- **Google Gemini CLI**: `gemini`
- **Anthropic Claude Code**: `claude`
- **Aider**: `aider`

## ⚡ Quick Installation (Production / Global CLI)

### 1. macOS & Linux (`curl | bash`)
```bash
curl -fsSL https://raw.githubusercontent.com/JhaSourav07/Collagility/main/install.sh | bash
```

### 2. Windows PowerShell (`iwr`)
```powershell
iwr -useb https://raw.githubusercontent.com/JhaSourav07/Collagility/main/install.ps1 | iex
```

### 3. NPM Global Install / NPX
```bash
# Global install
npm install -g collagility@0.1.1

# Run without installing
npx collagility start
```

---

## 🛠️ Local Development & Building from Source

```bash
# 1. Clone the repository
git clone https://github.com/JhaSourav07/Collagility.git
cd Collagility

# 2. Install workspace dependencies
pnpm install

# 3. Build all workspace packages
pnpm build
```

---

## 💻 Running Local Sessions

### 1. Start the Realtime Collaboration Server
```bash
pnpm --filter @collagility/server start
```
By default, the server binds to `0.0.0.0:8080` — it's already reachable on your LAN out of the box (`ws://<your-ip>:8080/ws`, HTTP health check at `http://<your-ip>:8080/health`). The `HOST`/`PORT` env vars below are only needed if you want to change that, not to enable LAN access in the first place.

### 2. Host a Session (Session Owner)
In a new terminal window:
```bash
# Host using Google Antigravity CLI (agy)
pnpm --filter @collagility/cli start --cli agy

# Host using mock mode (for offline testing without real AI API keys)
pnpm --filter @collagility/cli start --mock
```

### 3. Join a Session (Collaborator)
From another terminal window or remote machine:
```bash
pnpm --filter @collagility/cli join <sessionId>
```

---

## 🌐 Network & Firewall Configuration (Multi-Device / LAN)

To allow team members on the same local Wi-Fi / LAN network to join your pair programming session, bind the server to `0.0.0.0` and configure firewall port forwarding for port `8080`.

### Server Binding
Set the `HOST` environment variable when launching `@collagility/server`:
```bash
HOST=0.0.0.0 PORT=8080 pnpm --filter @collagility/server start
```

### Firewall Rules

#### Linux (`ufw` - Ubuntu/Debian)
```bash
sudo ufw allow 8080/tcp comment 'Collagility Realtime Server'
```

#### Linux (`firewalld` - Fedora/RHEL/CentOS)
```bash
sudo firewall-cmd --zone=public --add-port=8080/tcp --permanent
sudo firewall-cmd --reload
```

#### Windows Firewall (PowerShell as Administrator)
```powershell
New-NetFirewallRule -DisplayName "Collagility Server" -Direction Inbound -LocalPort 8080 -Protocol TCP -Action Allow
```

#### Connecting Remote Participants
Option A: Use composite join target `session@host` (No `--server` flag needed!):
```bash
collagility join <sessionId>@192.168.1.50
```

Option B: Set default server IP once:
```bash
collagility config set server 192.168.1.50
collagility join <sessionId>
```
