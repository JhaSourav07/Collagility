# Changelog

All notable changes to **Collagility** are documented in this file.

## [0.1.0beta] - 2026-08-03

### Official First Public Beta Release (`0.1.0beta`)

#### Features & Terminal Renderer Architecture (`@collagility/renderer`)
- **13 Terminal Reusable Components**: Heading, Paragraph, CodeBlock, TaskList, Quote, Divider, Table, Callout (`NOTE`, `TIP`, `IMPORTANT`, `WARNING`, `CAUTION`), Badge (`[ OWNER ]`, `[ VISITOR ]`), Status (`● Connected`, `◐ Syncing`, `✖ Error`), File (`📄 code.ts` / `📖 README.md`), Link, Image.
- **AGY Style Tool Timeline**: Interactive tool action execution state machine (`● Read(file)`, `● Search()`, `● Edit()`, `● Write()`, `● Delete()`, `✓ Complete`) and reasoning header summaries (`▸ Thought for 1.4s`).
- **Incremental Stream Rendering**: Low-latency stream engine emitting minimal ANSI cell diffs without full-screen redraws (`\x1b[2J`).
- **Project File Detector**: Automatically detects project code vs documentation files with rich metadata (`clickable: true`).
- **AGY Fixed Terminal Layout Engine**: Fixed header top region, scrollable timeline center viewport, fixed input line prompt (**NEVER moves**), fixed status bar bottom, and top-right notification toast banner overlays.
- **Non-Blocking Micro-Animations**: Braille spinner (`⠋`, `⠙`, `⠹`, `⠸`, `⠼`, `⠴`, `⠦`, `⠧`, `⠇`, `⠏`), progress bar (`[━━━━━─────] 50%`), typewriter reveal, cursor pulse, and 0% idle CPU usage timer loop.

#### Official Installers & Tooling
- `install.sh`: POSIX interactive shell installer for Linux & macOS with Bun/Rustup-inspired ANSI box UI.
- `install.ps1`: Windows PowerShell interactive installer script.
- `uninstall.sh`: Clean uninstaller script.
- `scripts/test-installer.sh`: Automated installer test suite.
