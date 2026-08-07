# Collagility

> **The Real-Time Agentic Terminal for Collaborative AI Pair Programming**

[![Release](https://img.shields.io/badge/version-0.1.6-cyan.svg)](https://github.com/JhaSourav07/Collagility/releases/tag/v0.1.6)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)]()

Collagility is an open-source multiplayer terminal workspace that turns local AI coding agents into real-time collaborative pair programming sessions. Connect your local CLI tools (**`agy`** / Antigravity and **`gemini`** live; `claude`, `aider`, `goose`, `codex` planned stubs) with remote collaborators, stream multi-step AI execution output token-by-token across every participant's terminal simultaneously, and manage security permissions with a built-in risk evaluation engine.

> [!NOTE]
> **Supported AI CLI Adapters**: Currently **`agy`** (Google Antigravity AI CLI) and **`gemini`** (Google Gemini CLI) are fully supported and functional for live sessions. Adapters for `claude`, `aider`, `goose`, and `codex` exist as experimental stubs and will be enabled in a future release. Selecting `--cli claude` (etc.) will exit with an informative status message.

📖 **New here?** This README is the quick pitch — [`docs/GUIDE.md`](docs/GUIDE.md) is the full manual: every command, every flag, security modes, LAN setup, and troubleshooting.

---

## ⚡ System Requirements

- **tmux**: Collagility orchestrates native `tmux` binary split sessions.
  - **Linux**: Install via your package manager (e.g., `sudo apt install tmux`).
  - **macOS**: Install via Homebrew (`brew install tmux`).
  - **Windows**: Collagility must be run inside **WSL (Windows Subsystem for Linux)**. Native Windows (`cmd.exe` / PowerShell) is not supported for multi-pane session hosting. Refer to [Microsoft's WSL Installation Guide](https://learn.microsoft.com/en-us/windows/wsl/install).

---

## ⚡ Quick Installation

### Option 1: macOS / Linux (`curl | bash`)
```bash
curl -fsSL https://raw.githubusercontent.com/JhaSourav07/Collagility/main/install.sh | bash
```

### Option 2: Windows PowerShell (`iwr`)
```powershell
iwr -useb https://raw.githubusercontent.com/JhaSourav07/Collagility/main/install.ps1 | iex
```

### Option 3: Global NPM or NPX
```bash
# Global Install
npm install -g collagility

# Run without installing
npx collagility start
```

---

## 🏗️ System Architecture

Collagility is structured as a TypeScript monorepo powered by `pnpm` workspaces and `turbo`:

```text
Collagility Monorepo Architecture
├── apps/
│   ├── cli/             # React Ink Terminal User Interface (TUI) application
│   ├── server/          # Fastify & WebSocket session gateway & event broadcaster
│   └── web/             # Next.js web application for browser participants
└── packages/
    ├── adapters/        # AI Adapter Registry, Antigravity/Gemini adapters & Security Risk Engine
    ├── renderer/        # Virtual screen diffing, terminal AST parser, ANSI formatter
    ├── stream/          # Zero-latency stream buffer, chunking, and sequence assembler
    ├── protocol/        # Versioned Zod validation schemas & WebSocket packet definitions
    ├── sdk/             # Client SDK for programmatic session embedding
    └── types/           # Core domain entity types & interfaces
```

---

## 🛡️ Security & Permissions

Collagility provides granular control over AI command execution through 4 **Security Modes**:

| Mode | Short Name | Description |
| :--- | :--- | :--- |
| `manual` | `manual` | Prompts for manual user confirmation before executing **any** tool or command. |
| `accept-edits` | `accept` | Automatically accepts safe read/write file edits, prompting only for shell commands. |
| `plan-only` | `plan` | Restricts AI execution strictly to read-only research and implementation plan generation. |
| `auto` | `auto` | Automatically approves `LOW` and `MEDIUM` risk actions; prompts host only for `HIGH` risk actions. |

### Command Risk Classification (`evaluateRisk`)
The Security Engine automatically categorizes tool calls and terminal commands into risk levels:
- `LOW`: Safe read-only operations (`ls`, `cat`, `grep`, `git status`, `view_file`, `search_web`).
- `MEDIUM`: Standard project modifications (`write_to_file`, `mkdir`, `npm install`, `git commit`).
- `HIGH`: Destructive or sensitive system actions (`rm -rf`, `sudo`, `chmod`, `kill`, path traversal `../`, piping remote scripts to shell).

> [!IMPORTANT]
> **Security Notice**: Risk classification is best-effort text pattern matching and does not act as an isolated sandbox or execution guarantee. Command obfuscation, shell substitution, or multi-step execution can bypass pattern heuristics. Users should not treat `auto` security mode as a hard security boundary for untrusted prompts.

---

## ⌨️ Slash Commands & Keyboard Shortcuts

### Slash Commands

| Slash Command | Description |
| :--- | :--- |
| `/config` or `/settings` | Open interactive session configuration overlay. |
| `/permissions` | Open Security Mode configuration overlay. |
| `/agents` | Toggle the Subagent Monitoring Drawer overlay. |
| `/mcp` | Open connected Model Context Protocol (MCP) servers overview. |
| `/rewind [steps]` or `/undo` | Step back conversation history by `N` turns and revert file diffs. |
| `/fork` | Branch current session into a fresh workspace state with preserved history. |
| `/resume [sessionId]` | List and restore previous saved session checkpoints from disk. |
| `/clear` | Clear the terminal timeline screen (`Ctrl+L`). |
| `/help` | Print interactive command help and keyboard shortcut reference. |
| `/leave` | Leave active collaboration session gracefully. |

### Keyboard Shortcuts

- `Ctrl + K`: Toggle Subagent Monitoring Drawer.
- `Shift + Tab`: Cycle through Security Modes (`manual` ➔ `accept-edits` ➔ `plan-only` ➔ `auto`).
- `Esc Esc`: Clear active prompt text input.
- `Ctrl + L`: Clear terminal timeline.
- `Ctrl + D`: Leave active session.
- `y` / `n` / `e`: Approve, Deny, or Edit permission prompt card actions.

---

## 🚀 Quick Start (Local Development)

Ensure you have Node.js >=22 and pnpm >=9 installed (`corepack enable` will get you the right pnpm automatically).

```bash
# 1. Clone repository
git clone https://github.com/JhaSourav07/Collagility.git
cd Collagility

# 2. Install dependencies & build packages
pnpm install
pnpm build

# 3. Start local WebSocket server
pnpm --filter @collagility/server start

# 4. Host a new AI pair programming session (in another terminal)
npx collagility start
# 'host' also works as an alias: npx collagility host

# No AI CLI installed yet? Try it with a simulated driver:
npx collagility start --mock
```

## 🌐 User-Friendly Multi-Device LAN Setup

### 1. Composite Join Target (`session@host`)
To join a session hosted on another machine, Person B can simply specify `session@host` without typing long `--server` flags:

```bash
# Join session on IP 192.168.1.50
collagility join swift-falcon-5588@192.168.1.50
```

### 2. Persistent Default Server (`collagility config`)
Set your team's local server IP once so you never have to type it again:

```bash
# Save default server IP
collagility config set server 192.168.1.50

# Now run start or join cleanly without any flags!
collagility start
collagility join swift-falcon-5588
```

### 3. Smart Server URL Normalization
Collagility automatically normalizes any casual input format:
- `192.168.1.50` ➔ `ws://192.168.1.50:8080/ws`
- `192.168.1.50:9000` ➔ `ws://192.168.1.50:9000/ws`
- `http://192.168.1.50:8080` ➔ `ws://192.168.1.50:8080/ws`

---

## 📄 License

Distributed under the MIT License. See [LICENSE](LICENSE) for details.
