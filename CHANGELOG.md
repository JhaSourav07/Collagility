# Changelog

All notable changes to Collagility will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v0.1.0-alpha.6] - 2026-08-01

### Added

- **Collapsible AI Thinking Steps**: AI thinking output (internal analysis steps) is now collapsed by default into a single compact summary line (`● Thinking... (N steps)`). Press `Ctrl+O` at any time to expand/collapse the full step-by-step reasoning in-place.
- **`Ctrl+O` Shortcut Hint**: The `Ctrl+O` toggle shortcut is now displayed in the CLI startup banner, so users see it immediately on session start.
- **Inline Code Badges**: Backtick-wrapped code references in AI responses now render with a dark slate highlight background for quick visual scanning (e.g. `` `pnpm` `` → styled badge).
- **Clickable Link Rendering**: Markdown hyperlinks in AI responses (e.g. `[Collagility](file://...)`) now render as underlined cyan text.
- **Rich Tool Call Formatting**: AI tool invocations (e.g. `ListDir(...)`, `ViewFile(...)`) now render with a green bullet `●`, bold yellow tool name, and dim argument text — matching the native Antigravity IDE style.
- **Tree Branch Results**: Tool sub-results (lines starting with `⎿` or `└`) render as dim tree branches (`└ result text`).

### Changed

- **Professional Badge Text**: All AI provider badges now use clean all-caps text without emojis — e.g. `[ANTIGRAVITY]`, `[GEMINI]`, `[CLAUDE]`, `[CODEX]`, `[AI]`.
- **No-Emoji Terminal UI**: Removed all emojis from interactive prompt banners (`[AI Question]`, `[TOOL APPROVAL REQUESTED]`, `[AI Confirmation Required]`), plan renderer, and system messages. The terminal is now clean, professional, and accessible in all environments.
- **Sentence-Boundary Line Breaking**: AI thinking output is now automatically split at sentence boundaries (`I'll...`, `Let's...`, `I see...`, `Now...`) so each thought renders on its own line instead of running together.

### Fixed

- **agy Banner Suppression**: `agy`'s own internal header lines (`🤖 AGY Stream Started: "..."`, `Prompt: "..."`) are now filtered out in the parser so they no longer appear as raw text in the terminal. Only Collagility's styled header renders.
- **Interactive Context Preserved Across Stream Completion**: When `agy` finishes streaming and `onStreamCompleted` fires, any active interactive context (plan approval, question response) is now retained until the user explicitly responds — typing `r`, `y`, or `n` no longer accidentally triggers a new AI prompt.
- **Plan File Path Extraction**: Plan artifact file paths (e.g. `[plan.md](file:///path/to/plan.md)`) are now correctly stripped of markdown link syntax before `fs.readFileSync` is called, fixing the `Plan file not found` error.

---

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
