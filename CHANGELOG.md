# Changelog

All notable changes to Collagility will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v0.1.0-alpha.2] - 2026-07-31

### Added (done)

- **Multi-Provider AI Adapters (done)**: Added full provider adapters for `claude`, `codex`, `aider`, and `goose` in `@collagility/adapters`.
- **Owner Execution Permission Guard (done)**: Owner-only verification for AI prompt execution requests in `@collagility/server`.
- **Binary Bundling Scripts (done)**: Added CLI bundling scripts (`bundle.js` & `package.js`) using `@yao-pkg/pkg` and `esbuild`.
- **GitHub Release CI Workflow (done)**: Automated matrix build workflow (`.github/workflows/release.yml`) for Linux (x64/arm64) and macOS (x64/arm64).
- **Automated Installer Script (done)**: `install.sh` shell script for single-command installation to `~/.local/bin/collagility`.

---

## [v0.1.0-alpha.1] - 2026-07-31

### Added (done)

- **Multiplayer Collaborative Sessions (done)**: Real-time multi-user terminal session creation (`collagility start`) and session joining (`collagility join <session-id>`).
- **Shared AI Streaming Engine (done)**: Token-by-token streaming of AI output across all connected session members simultaneously.
- **AI Adapter Architecture (done)**: Pluggable provider adapter framework in `@collagility/adapters` supporting `agy`, `antigravity`, `gemini`, `claude`, `codex`, `aider`, `goose`, and `mock`.
- **`agy` (Antigravity CLI) Integration (done)**: Non-interactive print mode execution (`-p`) with live status and thinking line streaming.
- **Session Management (done)**: Session store, owner validation, participant leave/join events, and auto-cleanup.
- **Terminal CLI Suite (done)**: Interactive chat prompt, command parser (`parseCLIInput`), and `TerminalStreamRenderer` with provider-specific typography.
- **Real-Time Event Protocol (done)**: Versioned JSON WebSocket frame protocol and Zod schemas in `@collagility/protocol`.
- **Workspace-Aware Execution (done)**: Session `workspacePath` tracking and local process launching directly inside the owner's project root directory.

### Known Limitations

- Early alpha release intended for initial developer testing.
- Initial release focuses primarily on terminal CLI workflows; IDE plugins (VS Code / Antigravity IDE) are planned for future milestones **(future)**.
