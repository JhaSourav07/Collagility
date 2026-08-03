# Official Release Notes - Collagility `0.1.0beta`

Tag: **`0.1.0beta`**  
Release Name: **Collagility `0.1.0beta` — First Public Beta Release**  
Repository: **https://github.com/JhaSourav07/collagility**

---

## ⚡ Highlights

Collagility is an open-source collaborative terminal workspace for AI coding agents.

- **AGY Style Tool Timeline**: `● Read(file)`, `● Search()`, `● Edit()`, `● Write()`, `● Delete()`, `✓ Complete`, `▸ Thought for 1.4s`.
- **AGY Fixed Terminal Layout**: Fixed header top, scrollable timeline stream, fixed bottom input prompt (**NEVER moves**), fixed status bar, and toast notification overlays.
- **Incremental Stream Rendering**: High-performance cell-diff engine emitting minimal ANSI escape updates with sub-1.2ms chunk latency and 0 full-screen redraws.
- **13 Component Terminal Suite**: High-resolution ANSI terminal component library (`Heading`, `Paragraph`, `CodeBlock`, `TaskList`, `Quote`, `Divider`, `Table`, `Callout`, `Badge`, `Status`, `File`, `Link`, `Image`).
- **Official Interactive Installer**: `curl -fsSL https://install.collagility.dev | sh` for Linux & macOS and `install.ps1` for Windows.

---

## 📦 Installation Instructions

### POSIX Shell (Linux & macOS)
```bash
curl -fsSL https://install.collagility.dev | sh
```

### Windows (PowerShell)
```powershell
iwr -useb https://install.collagility.dev/ps1 | iex
```

### Quick Run

Start & host a multiplayer AI workspace session:
```bash
collagility start
# or alias:
collagility host
```
Run instantly in mock mode:
```bash
collagility host --mock
```

---

## 🔄 Upgrade Guide

If upgrading from an earlier preview:
```bash
collagility upgrade
```
Or rerun the installer:
```bash
curl -fsSL https://install.collagility.dev | sh
```

---

## 🐛 Known Issues

1. **Non-TTY Environments**: In non-interactive subshell environments, the CLI automatically falls back to clean line log mode. Force TUI mode via `FORCE_TUI=1 collagility start`.
2. **Windows Legacy ConHost**: For optimal TrueColor experience on Windows, use **Windows Terminal** or **VSCode Terminal**.

---

## 🗺️ Roadmap to `v0.2.0`

1. **WebAssembly Diffing Engine**: Zero-copy WASM grid matrix comparison for > 1MB/s streaming payloads.
2. **OSC 8 Hyperlink Native Protocol**: Native click-to-open file hyperlinks in Ghostty, Warp, and iTerm2.
3. **Multi-Agent Relay Swarm**: Concurrent execution timeline for multiple AI agents (`agy`, `gemini`, `claude`, `codex`) in a unified session workspace.
