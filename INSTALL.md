# Installing Collagility (`0.1.0beta`)

**Collagility** is an open-source collaborative terminal workspace for AI coding agents.

---

## Quick Install

### Linux & macOS
```bash
curl -fsSL https://raw.githubusercontent.com/JhaSourav07/Collagility/main/install.sh | bash
```

Or run `install.sh` directly after cloning:
```bash
./install.sh
```

### Windows (PowerShell)
```powershell
iwr -useb https://raw.githubusercontent.com/JhaSourav07/Collagility/main/install.ps1 | iex
```

Or run `install.ps1` directly:
```powershell
.\install.ps1
```

---

## What the installer does

1. **Detects** your OS, architecture, and shell (`bash` / `zsh` / `fish`)
2. **Checks** Node.js (≥ 22 required), npm, git, and internet connectivity
3. **Installs** the `collagility` binary to `~/.collagility/bin/`
4. **Configures** your shell `PATH` automatically (`.zshrc`, `.bashrc`, `config.fish`)
5. **Prompts** optionally to install Tailscale for secure peer-to-peer connections
6. **Verifies** SHA-256 integrity of downloaded assets

---

## Requirements

| Dependency | Minimum Version | Required |
| :--- | :--- | :--- |
| Node.js | v22.0.0 | **Yes** |
| npm | v10.0.0 | **Yes** |
| Git | v2.x | Optional |
| Tailscale | Any | Optional |

---

## Verifying Installation

After installation, reload your shell:
```bash
# bash
source ~/.bashrc

# zsh
source ~/.zshrc

# fish
source ~/.config/fish/config.fish
```

Then verify:
```bash
collagility version
```

Expected output:
```text
  Collagility 0.1.0beta
  Node.js v22.x
  Platform linux/x86_64
```

---

## Getting Started Commands

| Task | Command |
| :--- | :--- |
| **Start a session** | `collagility start` or `collagility host` |
| **Demo mode** | `collagility host --mock` |
| **Join a session** | `collagility join <session-id>` |
| **Leave a session** | `collagility leave` |
| **Server status** | `collagility server status` |
| **List sessions** | `collagility sessions` |
| **Version info** | `collagility version` |
| **All commands** | `collagility --help` |

---

## Uninstallation

To completely remove Collagility:
```bash
./uninstall.sh
```

Or via curl:
```bash
curl -fsSL https://raw.githubusercontent.com/JhaSourav07/Collagility/main/uninstall.sh | bash
```

The uninstaller will:
- Remove `~/.collagility/` directory
- Clean PATH entries from `.bashrc`, `.zshrc`, `.bash_profile`, `.profile`, and `config.fish`

---

## Troubleshooting

### `collagility: command not found`
The binary is installed but your PATH hasn't been reloaded. Run:
```bash
source ~/.bashrc   # or ~/.zshrc
```
Or add manually:
```bash
export PATH="$HOME/.collagility/bin:$PATH"
```

### Node.js version too old
Collagility requires Node.js ≥ 22. Install via:
- **[nvm](https://github.com/nvm-sh/nvm)**: `nvm install 22 && nvm use 22`
- **[fnm](https://github.com/Schniz/fnm)**: `fnm install 22`
- **Official installer**: https://nodejs.org

### Permission denied
The installer writes to `~/.collagility` in your home directory — no `sudo` required.

### Installation fails with network error
Check your internet connection, then retry:
```bash
curl -fsSL https://install.collagility.dev | sh
```

---

## Manual Installation (from source)

```bash
git clone https://github.com/JhaSourav07/Collagility.git
cd Collagility
pnpm install
pnpm --filter @collagility/renderer build
pnpm --filter @collagility/cli build
node apps/cli/dist/index.js --help
```

---

## GitHub Repository

**https://github.com/JhaSourav07/Collagility**
