# Changelog

All notable changes to Collagility will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v0.1.0-alpha.1] - 2026-07-31

### Added

- **Multiplayer Collaborative Sessions**: Real-time multi-user terminal session creation (`collagility start`) and session joining (`collagility join <session-id>`).
- **Shared AI Streaming Engine**: Token-by-token streaming of AI output across all connected session members simultaneously.
- **AI Adapter Architecture**: Pluggable provider adapter framework in `@collagility/adapters` supporting `agy`, `antigravity`, `gemini`, `claude`, and `codex`.
- **`agy` (Antigravity CLI) Integration**: Non-interactive print mode execution (`-p`) with live status and thinking line streaming.
- **Session Management**: Session store, owner validation, participant leave/join events, and auto-cleanup.
- **Terminal CLI Suite**: Interactive chat prompt, command parser (`parseCLIInput`), and `TerminalStreamRenderer` with provider-specific typography.
- **Real-Time Event Protocol**: Versioned JSON WebSocket frame protocol and Zod schemas in `@collagility/protocol`.
- **Workspace-Aware Execution**: Session `workspacePath` tracking and local process launching directly inside the owner's project root directory.

### Known Limitations

- Early alpha release intended for initial developer testing.
- Breaking API and protocol changes may occur in minor versions.
- Initial release focuses primarily on `agy` / `gemini` adapters; additional provider backends are in active development.
