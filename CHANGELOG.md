# Changelog

All notable changes to the Collagility project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [v0.1.4] - 2026-08-07

### Fixed
- **NPM Package Publishing Fix**: Moved `@collagility/*` monorepo packages to `devDependencies` in `apps/cli/package.json` to prevent NPM `EUNSUPPORTEDPROTOCOL` errors on `workspace:*` dependencies during `npm install -g collagility`.
- **Session Type Safety**: Added missing `workspacePath` requirement to mock Session instances in server unit tests to ensure strict TypeScript type compliance.

---

## [v0.1.3] - 2026-08-07

### Fixed
- **Session Type Safety**: Added missing `workspacePath` requirement to mock Session instances in server unit tests to ensure strict TypeScript type compliance.

---

## [v0.1.2] - 2026-08-07

### Added
- **Comprehensive User Guide**: Added `docs/GUIDE.md` detailing architecture, configuration, installation, troubleshooting, CLI command & flag reference, security modes, and LAN collaboration setup.
- **Private Vulnerability Reporting**: Updated `SECURITY.md` to point security disclosures to GitHub Private Vulnerability Reporting.

### Changed
- **System Requirements**: Updated required Node.js version to `>=22.0.0` and pnpm to `>=9.0.0` across README, INSTALL guide, and User Guide.
- **Server Bind Defaults**: Documented default `0.0.0.0:8080` binding behavior for seamless local network (LAN) accessibility out-of-the-box.

---

## [v0.1.1] - 2026-08-07

### Added
- **1:1 Unbuffered AI Screenshare Streaming**: Real-time byte-by-byte terminal streaming from host right pane into joined visitors using `tail -f` screenshare logs with 0 token cost to visitors.
- **Real Host IP Join Guidance**: `collagility start` now automatically detects real LAN IPv4 address and displays `collagility join session@192.168.1.50` instructions.
- **Chronological Timeline Sorting**: Fixed activity logs and system notifications to sort chronologically by timestamp.
- **Short Collaborator IDs**: Truncated 36-char UUIDs to 8-char short IDs (`2138c10c`) to prevent text wrapping on narrow panes.
- **Graceful Ctrl+C Exit**: Restored `Ctrl+C` handling in Ink TUI to gracefully disconnect WebSocket sessions, terminate tmux split sessions, and exit cleanly.

---

## [0.1.1-beta.1] - 2026-08-06

### Added
- **Global Shell Installers**: Added cross-platform `install.sh` (`curl | bash` for macOS/Linux) and `install.ps1` (`iwr` for Windows PowerShell) for automated Node.js environment checks and global CLI installation.
- **NPM Beta Release Setup**: Configured package metadata (`collagility`), executable entrypoint (`bin: { "collagility": "./dist/main.js" }`), and `scripts/publish-beta.sh`.
- **Composite Join Tokens**: Added support for `collagility join session@192.168.1.50` targets without typing `--server` flags.
- **Smart Server URL Normalization**: Automatically normalizes bare IPs (`192.168.1.50`), host:port (`192.168.1.50:8080`), http, and ws URLs.
- **Persistent User Configuration**: Added `~/.collagility/config.json` storage and `collagility config set server <ip>` command.

---

## [0.1.0beta] - 2026-08-06

### Added
- **Google Antigravity CLI (`agy`) Adapter**: Integrated native `AntigravityAdapter` in `@collagility/adapters` supporting non-interactive `agy` process execution, stdout/stderr event parsing, thought streaming blocks, and subagent dispatcher events (`SUBAGENT_SPAWNED`, `SUBAGENT_PROGRESS`, `SUBAGENT_COMPLETED`).
- **Security Permission Engine & Ink Cards**: Added `evaluateRisk` command classifier in `risk-evaluator.ts` (`LOW`, `MEDIUM`, `HIGH`) and interactive Ink permission approval cards (`PermissionPromptCard.tsx`) with hotkeys (`y`/`n`/`e`).
- **Subagent Monitoring Drawer**: Created `SubagentDrawer.tsx` rendering active background worker threads, current tool name, and progress percentages, toggled via `Ctrl+K` or `/agents`.
- **Model Context Protocol (MCP) Loader**: Added `mcp-loader.ts` to discover local `.mcp.json` and global `~/.gemini/antigravity-cli/mcp.json` configs with interactive `/mcp` overlay.
- **Conversation Checkpointing & Session Resumption**: Implemented disk state persistence in `.collagility/sessions/<sessionId>.json`, `/rewind [steps]`, `/fork`, `/resume`, and `collagility start --resume <sessionId>`.
- **Real-Time Permission Synchronization**: Added WebSocket event schemas (`SESSION_PERMISSION_REQUEST`, `SESSION_PERMISSION_RESPONSE`) to synchronize permission prompts across session host and remote clients.

### Changed
- **React Ink TUI Redesign**: Redesigned UI layout in `apps/cli` to match Google Antigravity CLI styling, adding top workspace header banner, real-time connection badge, `@` path autocomplete popup box, double-escape (`Esc Esc`) input clearing, and `Shift+Tab` security mode cycling.

---

## [0.1.0alpha] - 2026-07-15

### Added
- Monorepo infrastructure setup with `pnpm` workspaces and TurboRepo build pipeline.
- Fastify & WebSocket session relay server in `apps/server`.
- Gemini CLI adapter stub and basic terminal streaming in `@collagility/stream`.
