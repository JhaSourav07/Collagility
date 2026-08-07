# Collagility — Complete User Guide

> The Real-Time Agentic Terminal for Collaborative AI Pair Programming

This is the single, complete reference for installing, running, and using Collagility. The [README](../README.md) is the quick-start pitch; this guide is the full manual — every command, every flag, every mode, and the troubleshooting you'll actually need.

**Table of Contents**

1. [What Collagility Is](#1-what-collagility-is)
2. [Requirements](#2-requirements)
3. [Installing Collagility](#3-installing-collagility)
4. [Quick Start](#4-quick-start)
5. [How a Session Actually Works](#5-how-a-session-actually-works)
6. [Command Reference](#6-command-reference)
7. [Security Modes & the Permission Engine](#7-security-modes--the-permission-engine)
8. [Keyboard Shortcuts & Slash Commands](#8-keyboard-shortcuts--slash-commands)
9. [Multi-Device / LAN / Remote Setup](#9-multi-device--lan--remote-setup)
10. [Configuration](#10-configuration)
11. [Troubleshooting & Known Issues](#11-troubleshooting--known-issues)
12. [FAQ](#12-faq)
13. [Architecture Overview](#13-architecture-overview)
14. [Contributing](#14-contributing)
15. [Further Reading](#15-further-reading)

---

## 1. What Collagility Is

Collagility turns a local AI coding CLI (`agy`, `gemini`, `claude`, `aider`, and others) into a **multiplayer** session: you and your collaborators watch the same AI agent work in real time, from your own terminals, on your own machines.

The important design choice, if you've used similar tools before: Collagility does **not** re-parse and re-render the AI CLI's output into its own custom UI. The AI CLI runs completely raw, in its own real terminal pane, driven by [`tmux`](https://github.com/tmux/tmux). What you see on the right is exactly what you'd see if you'd run the tool yourself — same colors, same native prompts, same interactive UI — because it *is* that tool, unmodified. Collagility's own interface (the left pane) is only for chatting with collaborators and sending prompts; it never tries to reconstruct the AI's screen.

**What you get:**
- A **left pane** — chat with collaborators, type prompts, see session/security-mode status.
- A **right pane** — the actual AI CLI, running live and unmodified, driven by tmux.
- A structured event feed (parsed from the AI CLI's output) broadcast to remote collaborators over WebSocket, so people without local tmux access still see what's happening and can approve/deny risky actions.
- A built-in **risk evaluation engine** that classifies every tool call or shell command as `LOW` / `MEDIUM` / `HIGH` risk and gates it according to your chosen security mode.

---

## 2. Requirements

| Requirement | Version | Notes |
| :--- | :--- | :--- |
| **Node.js** | `>= 22.0.0` | Enforced by `engines` in `package.json`. Older Node versions will not run the CLI correctly. |
| **pnpm** | `>= 9` (repo pinned to `9.15.4`) | `corepack enable` is the easiest way to get the right version automatically. |
| **tmux** | Any recent version | Required — Collagility orchestrates real tmux split sessions to host the AI CLI. See platform notes below. |
| **An AI CLI** | — | At least one of: `agy` (Google Antigravity CLI), `gemini`, `claude` (Claude Code), `aider`, or run with `--mock` to try Collagility without any AI CLI installed. |

### Platform notes for tmux

- **Linux**: `sudo apt install tmux` (Debian/Ubuntu) or `sudo dnf install tmux` (Fedora/RHEL).
- **macOS**: `brew install tmux`.
- **Windows**: tmux does not run natively on Windows. Collagility **must** be run inside **WSL** (Windows Subsystem for Linux) — native `cmd.exe` / PowerShell is not supported for hosting or joining sessions. Install WSL from [Microsoft's official guide](https://learn.microsoft.com/en-us/windows/wsl/install), then install tmux inside your WSL distro exactly as you would on Linux (`sudo apt install tmux`).

If tmux isn't available, Collagility will detect this at startup and print exactly what's missing rather than failing with a raw error.

---

## 3. Installing Collagility

### Option 1 — Install script (macOS / Linux / WSL)
```bash
curl -fsSL https://raw.githubusercontent.com/JhaSourav07/Collagility/main/install.sh | bash
```

### Option 2 — PowerShell (for setting up WSL itself, on Windows)
```powershell
iwr -useb https://raw.githubusercontent.com/JhaSourav07/Collagility/main/install.ps1 | iex
```
Remember: the installer can prepare your environment from PowerShell, but *running* Collagility still needs to happen inside WSL, since that's where tmux lives.

### Option 3 — npm / npx
```bash
# Install globally
npm install -g collagility

# Or run without installing
npx collagility start
```

### Option 4 — From source (for development or contributing)
```bash
git clone https://github.com/JhaSourav07/Collagility.git
cd Collagility
pnpm install
pnpm build
node apps/cli/dist/index.js --help
```

### Uninstalling
```bash
curl -fsSL https://raw.githubusercontent.com/JhaSourav07/Collagility/main/uninstall.sh | bash
```

### Upgrading
Re-run the install script — it overwrites the existing global install:
```bash
curl -fsSL https://raw.githubusercontent.com/JhaSourav07/Collagility/main/install.sh | bash
```

---

## 4. Quick Start

### Try it instantly, no AI CLI required
```bash
collagility start --mock
```
This spins up a session using a simulated AI driver instead of a real CLI — good for confirming your install works and seeing the two-pane layout before wiring up a real agent.

### Host a real session
```bash
# Uses whatever AI CLI you have configured / on PATH
collagility start

# Or explicitly pick one
collagility start --cli agy
collagility start --cli gemini
```
On startup, Collagility prints your session ID and — if it detects you're on a LAN — the exact command your collaborators need to join, including your local IP:

Session created: swift-river-7012
Share with your team: collagility join swift-river-7012@192.168.1.50

### Join someone else's session
```bash
collagility join swift-river-7012@192.168.1.50
```
The `session@host` shorthand means you never have to type a separate `--server` flag.

### Running from source instead of a global install
```bash
# Terminal 1 — start the realtime server
pnpm --filter @collagility/server start

# Terminal 2 — host a session
pnpm --filter @collagility/cli start --cli agy

# Terminal 3 (another machine, or another terminal) — join
pnpm --filter @collagility/cli join <sessionId>
```

---

## 5. How a Session Actually Works

Understanding this will save you confusion later, especially around who can type where.

1. When you run `collagility start`, Collagility checks tmux is available (see [§2](#2-requirements)), then creates a dedicated tmux session (`collagility-<sessionId>`) with **two panes**:
   - **Left pane**: Collagility re-invokes itself in chat-only mode — this is the Ink-based UI you interact with directly.
   - **Right pane**: the actual configured AI CLI (`agy`, `gemini`, etc.), spawned completely raw with no wrapping.
2. **Only the left pane accepts direct input.** When you type a prompt into the chat input and hit enter, Collagility forwards that text into the right pane on your behalf — as if you'd typed it there yourself — and you watch the AI CLI answer live in its own pane. You (and remote collaborators) never type directly into the right pane.
3. A copy of the right pane's raw output is also piped (via `tmux pipe-pane`) into Collagility's existing adapter/parser pipeline, which turns it into structured events — this is what powers the activity feed, the risk-evaluation engine, and what remote collaborators (who don't have local tmux access) see and can act on.
4. Remote collaborators get a **read-only live view** of the right pane's output (streamed to them, zero token cost) plus Collagility's own structured permission prompts when their input is needed — they never get raw shell access to your machine. This is a deliberate security boundary, not an oversight: unmonitored shared shell access to remote participants was explicitly considered and rejected during the project's design (see [RFC-0007](RFC-0007-SECURITY-ARCHITECTURE-SPECIFICATION.md)).
5. Because it's a real tmux session, you can detach (`Ctrl+B` then `D`) and reattach later without losing anything — the AI CLI keeps running in the background.

One honest limitation: since you're a real local user attached to a real tmux session, nothing stops you from manually switching tmux panes yourself (tmux's own prefix + arrow-key navigation) and typing into the right pane directly if you deliberately choose to. Collagility discourages this by keeping focus on the left pane and disabling mouse-driven pane switching, but it's a UX nudge, not a hard lock — there's no tmux mechanism that fully prevents a user with real attach access to their own session from doing this.

---

## 6. Command Reference

All commands below are exactly what `collagility --help` will show you — this table won't drift from the code.

| Command | Aliases | Description |
| :--- | :--- | :--- |
| `collagility start` | `collagility host` | Create and host a new session. |
| `collagility join <session>` | — | Join an existing session by ID (or `session@host`). |
| `collagility leave` | — | Leave the currently active session gracefully. |
| `collagility server [action]` | — | Manage/inspect the local WebSocket server process. |
| `collagility sessions` | — | List known/active sessions. |
| `collagility config get [key]` | — | Read a persisted config value (or all values). |
| `collagility config set <key> <value>` | — | Persist a config value to `~/.collagility/config.json`. |
| `collagility version` | — | Print the installed Collagility version. |
| `collagility upgrade` | `collagility update` | Upgrade Collagility CLI to the latest published version. |

### Flags for `start` / `host`

| Flag | Description |
| :--- | :--- |
| `-s, --server <url>` | WebSocket server URL (global flag, also works on `join`). |
| `-v, --verbose` | Enable verbose debug logging. |
| `--no-reconnect` | Disable automatic WebSocket reconnection. |
| `-c, --cli <binary>` | Specify which AI CLI to spawn (e.g. `agy`, `gemini`). Overrides auto-detection. |
| `--cli-version <ver>` | Override the detected AI CLI version. |
| `-r, --resume <session>` | Resume a previous session from its disk checkpoint. |
| `-m, --mock` | Run with a simulated AI driver — no real CLI process spawned. |

> `--pane <type>` and `--session-name <name>` also exist on `start` and `join`, but they're **internal** — Collagility uses them itself when it re-invokes the CLI inside a tmux pane. You generally don't need to pass these by hand.

---

## 7. Security Modes & the Permission Engine

Every tool call or shell command the AI CLI attempts is classified by `evaluateRisk()` before it's allowed through, based on your active security mode.

| Mode | Behavior |
| :--- | :--- |
| `manual` | Prompts for confirmation before **any** tool or command executes. Safest, most interruptive. |
| `accept-edits` | Automatically accepts safe read/write file edits; still prompts before shell commands. |
| `plan-only` | Restricts the AI to read-only research and plan generation — nothing gets executed. |
| `auto` | Automatically approves `LOW` and `MEDIUM` risk actions; only prompts for `HIGH` risk actions. |

Cycle between modes with `Shift+Tab` (order: `manual` → `accept-edits` → `plan-only` → `auto`), or set one explicitly via `/permissions`.

### Risk classification

| Risk | Examples |
| :--- | :--- |
| `LOW` | `ls`, `cat`, `grep`, `git status`, reading files, web search |
| `MEDIUM` | Writing files, `mkdir`, `npm install`, `git commit` |
| `HIGH` | `rm -rf`, `sudo`, `chmod`, `kill`, path traversal (`../`), piping remote scripts into a shell |

When your local mode allows a `HIGH`-risk action to auto-proceed only under explicit approval, Collagility shows a permission card you can answer with `y` (approve) / `n` (deny) / `e` (edit before approving). If a remote collaborator's turn requires approval, their answer is relayed back to your local session and Collagility injects the corresponding keystroke into the right pane on their behalf — they still never touch the pane directly. Full technical detail: [RFC-0009](RFC-0009-SECURITY-AND-PERMISSION-ENGINE.md).

---

## 8. Keyboard Shortcuts & Slash Commands

### Keyboard shortcuts (left pane)

| Shortcut | Action |
| :--- | :--- |
| `Ctrl+K` | Toggle the subagent monitoring drawer. |
| `Shift+Tab` | Cycle security modes. |
| `Esc Esc` | Clear the current prompt input. |
| `Ctrl+L` | Clear the chat timeline (doesn't affect the AI pane). |
| `Ctrl+D` | Leave the current session (your local tmux session and the AI CLI keep running). |
| `Ctrl+C` | Fully exit — disconnects the WebSocket, terminates the tmux session (including the AI CLI), and quits cleanly. |
| `y` / `n` / `e` | Approve / deny / edit a permission prompt. |

> `Ctrl+D` vs `Ctrl+C`: `Ctrl+D` steps *you* out while leaving the session alive for others; `Ctrl+C` tears the whole session down. If you're not sure which you want, `Ctrl+D` is the safer default.

### Slash commands

| Command | Description |
| :--- | :--- |
| `/config` or `/settings` | Open session configuration. |
| `/permissions` | Open security mode configuration. |
| `/agents` | Toggle the subagent monitoring drawer. |
| `/mcp` | View connected Model Context Protocol servers. |
| `/rewind [steps]` or `/undo` | Step back `N` turns and revert file diffs. |
| `/fork` | Branch the session into a new workspace state, keeping history. |
| `/resume [sessionId]` | List and restore saved session checkpoints. |
| `/clear` | Clear the chat timeline (same as `Ctrl+L`). |
| `/help` | Show command and shortcut help. |
| `/leave` | Leave the session gracefully (same as `Ctrl+D`). |

---

## 9. Multi-Device / LAN / Remote Setup

By default, the Collagility server binds to **`0.0.0.0:8080`** — it's already reachable on your LAN out of the box, no extra flag needed. What you do need is a firewall rule allowing the port through:

### Linux (`ufw` — Ubuntu/Debian)
```bash
sudo ufw allow 8080/tcp comment 'Collagility Realtime Server'
```

### Linux (`firewalld` — Fedora/RHEL/CentOS)
```bash
sudo firewall-cmd --zone=public --add-port=8080/tcp --permanent
sudo firewall-cmd --reload
```

### Windows Firewall (inside WSL's host, PowerShell as Administrator)
```powershell
New-NetFirewallRule -DisplayName "Collagility Server" -Direction Inbound -LocalPort 8080 -Protocol TCP -Action Allow
```

### Overriding the bind address or port
```bash
HOST=0.0.0.0 PORT=9000 pnpm --filter @collagility/server start
```

### Connecting collaborators

**Option A — composite target (no flags needed):**
```bash
collagility join <sessionId>@192.168.1.50
```

**Option B — save the server IP once:**
```bash
collagility config set server 192.168.1.50
collagility join <sessionId>
```

Collagility normalizes casual input automatically — you can hand people any of these and they'll all resolve the same way:
- `192.168.1.50` → `ws://192.168.1.50:8080/ws`
- `192.168.1.50:9000` → `ws://192.168.1.50:9000/ws`
- `http://192.168.1.50:8080` → `ws://192.168.1.50:8080/ws`

---

## 10. Configuration

Collagility persists user config to `~/.collagility/config.json`.

```bash
# View all saved config
collagility config get

# View a single key
collagility config get server

# Set a value
collagility config set server 192.168.1.50
```

Currently supported keys include `server` (default WebSocket host used by `start`/`join` when no explicit target is given). Session checkpoints for `/resume` and `--resume` are stored separately under `.collagility/sessions/<sessionId>.json` in your project directory.

---

## 11. Troubleshooting & Known Issues

**`collagility` / `collagility host` not found after installing**
Reload your shell so the newly-modified `PATH` takes effect: `source ~/.zshrc` or `source ~/.bashrc` (or open a new terminal).

**`Failed to start tmux session: open terminal failed: not a terminal`**
This means a tmux command that needs a real terminal (attaching to a session) was run without one — for example through a piped/non-interactive shell. Run `collagility start` directly in a real terminal window, not through another process that captures its output.

**Native Windows error about tmux**
Expected — tmux isn't supported outside WSL. Open a WSL terminal and run Collagility from there instead (see [§2](#2-requirements)).

**Non-TTY environments**
Collagility falls back to a line-log mode automatically when it detects no TTY. To force the full TUI anyway, set `FORCE_TUI=1 collagility start`.

**Garbled/washed-out colors on Windows**
Legacy `conhost.exe` doesn't support the terminal colors Collagility uses. Use **Windows Terminal** or the **VS Code integrated terminal** instead.

**Node version errors during install/build**
Collagility requires Node.js `>= 22`. Check with `node -v`; install a matching version via [nodejs.org](https://nodejs.org) or `nvm install 22`.

**tmux not found**
Install it for your platform (see [§2](#2-requirements)) — Collagility will tell you exactly this at startup rather than failing silently.

---

## 12. FAQ

**Do I need an account or a hosted server to use Collagility?**
No. Everything runs locally — you host your own WebSocket server (`@collagility/server`) and your own tmux session. There's no central Collagility service you sign into.

**Can remote collaborators run arbitrary shell commands on my machine?**
No. Remote participants only ever interact through Collagility's structured protocol — they see a live view of the AI pane and can approve/deny actions, but they never get raw shell/tmux access to your machine. See [§5](#5-how-a-session-actually-works) and [RFC-0007](RFC-0007-SECURITY-ARCHITECTURE-SPECIFICATION.md).

**Does the AI CLI's own permission UI still show up, or does Collagility replace it?**
Both exist side by side by design. The AI CLI's native UI (including its own prompts) renders normally in the right pane. Collagility's risk-evaluation engine watches a copy of that output and can either auto-approve safe actions (based on your security mode) by injecting the AI CLI's expected keystroke, or surface its own permission card for you (or a remote collaborator) to answer manually.

**Which AI CLIs are supported?**
`agy` (Google Antigravity CLI), `gemini`, `claude` (Claude Code), `aider`, and `codex`/`goose` in progress — check [RFC-0005](RFC-0005-AI-ADAPTER-ARCHITECTURE.md) for the current adapter list and how to add a new one.

**Can I try it without installing an AI CLI at all?**
Yes — `collagility start --mock` uses a simulated driver.

---

## 13. Architecture Overview

Collagility is a TypeScript monorepo (`pnpm` workspaces + `turbo`):

```text
Collagility Monorepo
├── apps/
│   ├── cli/       # React Ink terminal UI + tmux orchestration
│   ├── server/    # Fastify + WebSocket session gateway/broadcaster
│   └── web/       # Next.js web app for browser participants
└── packages/
    ├── adapters/  # AI adapter registry, per-CLI parsers, risk-evaluation engine
    ├── renderer/  # Virtual screen diffing, ANSI formatting, layout engine
    ├── stream/    # Low-latency stream buffering/chunking
    ├── protocol/  # Zod-validated WebSocket packet schemas
    ├── sdk/       # Client SDK for embedding sessions programmatically
    └── types/     # Shared domain types
```

For the full design rationale, see the RFCs in [§15](#15-further-reading) — in particular [RFC-0002](RFC-0002-HIGH-LEVEL-ARCHITECTURE.md) for the system-wide architecture and [RFC-0006](RFC-0006-MONOREPO-ARCHITECTURE-SPECIFICATION.md) for why the repo is structured this way.

---

## 14. Contributing

Short version — see [CONTRIBUTING.md](../CONTRIBUTING.md) for the full workflow:

```bash
git clone https://github.com/JhaSourav07/Collagility.git
cd Collagility
pnpm install
pnpm build
pnpm test
pnpm lint
```

Before working on anything touching session orchestration or permissions, skim [docs/manual-qa.md](manual-qa.md) — it's the checklist real changes in this area get tested against, and a good map of the behaviors you shouldn't accidentally break.

Found a security issue? **Do not open a public GitHub issue.** Use GitHub's private vulnerability reporting (repository → **Security** tab → **Report a vulnerability**) — see [SECURITY.md](../SECURITY.md).

---

## 15. Further Reading

The `docs/` folder contains the full design history as a series of RFCs and ADRs. This guide is the practical "how to use it"; these are the "why it's built this way":

| Document | Covers |
| :--- | :--- |
| [RFC-0001](RFC-0001-VISION-AND-REQUIREMENTS.md) | Vision and requirements |
| [RFC-0002](RFC-0002-HIGH-LEVEL-ARCHITECTURE.md) | High-level system architecture |
| [RFC-0003](RFC-0003-WEBSOCKET-PROTOCOL-SPECIFICATION.md) | WebSocket protocol specification |
| [RFC-0004](RFC-0004-SESSION-LIFECYCLE-SPECIFICATION.md) | Session lifecycle & state machine |
| [RFC-0005](RFC-0005-AI-ADAPTER-ARCHITECTURE.md) | AI adapter architecture |
| [RFC-0006](RFC-0006-MONOREPO-ARCHITECTURE-SPECIFICATION.md) | Monorepo & package strategy |
| [RFC-0007](RFC-0007-SECURITY-ARCHITECTURE-SPECIFICATION.md) | Security architecture & threat model |
| [RFC-0008](RFC-0008-EVOLUTION-AND-ROADMAP-SPECIFICATION.md) | Platform evolution & roadmap |
| [RFC-0009](RFC-0009-SECURITY-AND-PERMISSION-ENGINE.md) | Risk evaluation & permission engine |
| [adr.md](adr.md) | Architecture decision records |
| [ENGINEERING-ROADMAP.md](ENGINEERING-ROADMAP.md) | Execution roadmap to MVP |
| [manual-qa.md](manual-qa.md) | Manual QA checklist for tmux orchestration |
| [../CHANGELOG.md](../CHANGELOG.md) | Version history |
| [../RELEASE_NOTES.md](../RELEASE_NOTES.md) | Human-readable release highlights |

---

*This guide reflects the actual current CLI command surface (`apps/cli/src/main.ts`) and server defaults (`apps/server/src/index.ts`) as of this writing, not just what earlier docs claimed — if you find something here that no longer matches the code, that's a doc bug worth an issue or PR.*
