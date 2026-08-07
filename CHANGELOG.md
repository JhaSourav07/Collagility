# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] - 0.1.7

### Fixed
- **Host-side Terminal Broadcast Double-Processing**: Resolved duplicate `'pty.data'` listener bindings on `targetAdapter` stdout stream in `apps/cli/src/commands/start.ts`. Prevents stateful `AntigravityOutputParser` desync and eliminates stray `}}` fragment leaks in broadcast streams.

### Added
- **Byte-Accurate Raw PTY Terminal Mirror (Opt-in)**: Introduced an opt-in terminal mirror engine gated via `COLLAGILITY_TERMINAL_MIRROR=pty` (or `--pty` / `COLLAGILITY_EXPERIMENTAL_PTY=1`).
- **Versioned Raw PTY Frame Protocol Schema**: Added `terminal.pty.frame` schema (`TerminalPtyFramePayloadSchema`), TypeScript interface, envelope validators, and event creators in `@collagility/protocol`.
- **Host-Side PTY Streamer**: Added `PtyTerminalHost` and `ThrottledPtyStreamer` with 16ms flush intervals and 16 KB max chunk payload bounds for zero-latency cross-platform streaming.
- **Client-Side Headless Terminal Emulator**: Integrated `@xterm/headless` into `apps/cli` via `PtyScreenBuffer` to parse raw ANSI escape sequences, carriage return line redraws (`\r`), and cursor repositioning.
- **Joiner UI Integration**: Updated `SessionClientStreamHandler` and `RemotePane.tsx` to render faithful remote terminal screen grids.
- **Deterministic End-to-End Parity Tests**: Added `terminal-mirror-e2e-parity.test.ts` verifying 1:1 character-for-character screen grid parity between host and joiner screens using an independent headless terminal oracle.
