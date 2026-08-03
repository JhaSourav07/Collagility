# Official Release Notes — Collagility `0.1.0beta`

**Tag:** `0.1.0beta`  
**Release Name:** Collagility `0.1.0beta` — First Public Beta  
**Repository:** https://github.com/JhaSourav07/Collagility  
**Release Page:** https://github.com/JhaSourav07/Collagility/releases/tag/0.1.0beta

---

## ⚡ Highlights

Collagility is an open-source collaborative terminal workspace for AI coding agents.

- **`collagility host` command** — Start a multiplayer AI session instantly (`host` alias for `start`).
- **AGY Style Tool Timeline** — `● Read(file)`, `● Search()`, `● Edit()`, `● Write()`, `● Delete()`, `✓ Complete`, `▸ Thought for 1.4s`.
- **AGY Fixed Terminal Layout** — Fixed header, scrollable timeline stream, fixed bottom input prompt (**NEVER moves**), fixed status bar, toast notification overlays.
- **Incremental Stream Rendering** — High-performance cell-diff engine with sub-1.2ms chunk latency, 0 full-screen redraws.
- **13 Component Terminal Suite** — `Heading`, `Paragraph`, `CodeBlock`, `TaskList`, `Quote`, `Divider`, `Table`, `Callout`, `Badge`, `Status`, `File`, `Link`.
- **Official Interactive Installer** — `curl -fsSL https://raw.githubusercontent.com/JhaSourav07/Collagility/main/install.sh | bash`.
- **28-Test Installer Suite** — Automated verification of integrity, PATH config, version consistency, and cleanup.

---

## 📦 Installation

### Linux & macOS
```bash
curl -fsSL https://raw.githubusercontent.com/JhaSourav07/Collagility/main/install.sh | bash
```

### Windows (PowerShell)
```powershell
iwr -useb https://raw.githubusercontent.com/JhaSourav07/Collagility/main/install.ps1 | iex
```

### Manual (from source)
```bash
git clone https://github.com/JhaSourav07/Collagility.git
cd Collagility
pnpm install
pnpm --filter @collagility/renderer build
pnpm --filter @collagility/cli build
node apps/cli/dist/index.js --help
```

---

## 🚀 Quick Start

```bash
# Start a hosted session
collagility host

# Demo mode — no AI binary required
collagility host --mock

# Join an active team session
collagility join <session-id>

# List all commands
collagility --help
```

---

## 🔄 Upgrade Guide

From an earlier preview, rerun the installer:
```bash
curl -fsSL https://raw.githubusercontent.com/JhaSourav07/Collagility/main/install.sh | bash
```

---

## 🗑️ Uninstall

```bash
curl -fsSL https://raw.githubusercontent.com/JhaSourav07/Collagility/main/uninstall.sh | bash
```

---

## 🐛 Known Issues

1. **`collagility host` not found after install** — Reload your shell: `source ~/.zshrc` or `source ~/.bashrc`.
2. **Non-TTY environments** — CLI auto-falls back to line log mode. Force TUI via `FORCE_TUI=1 collagility start`.
3. **Windows Legacy ConHost** — Use **Windows Terminal** or **VSCode Terminal** for optimal TrueColor rendering.
4. **Node.js < 22** — Collagility requires Node.js ≥ 22. Install via [nodejs.org](https://nodejs.org) or `nvm install 22`.

---

## 🗺️ Roadmap to `v0.2.0`

1. **`collagility upgrade` command** — In-place self-updater.
2. **WebAssembly Diffing Engine** — Zero-copy WASM cell matrix comparison for >1MB/s streaming.
3. **OSC 8 Hyperlink Protocol** — Native clickable file links in Ghostty, Warp, and iTerm2.
4. **Multi-Agent Relay Swarm** — Concurrent timeline for `agy`, `gemini`, `claude`, `codex` in one session.
5. **Web Dashboard** — Real-time session monitoring and agent control from the browser.
