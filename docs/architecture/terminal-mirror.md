# Technical Architecture Plan: Byte-Accurate Terminal Mirror

## Executive Summary & Background

Collagility currently provides a multiplayer AI pair-programming terminal session by reconstructing a "chat-style summary pane" on remote session joiners. 

While effective for text summaries, the existing approach suffers from several key limitations:
1. **Loss of Terminal Fidelity**: The host process parses stdout as JSON (`--output-format stream-json`) and emits formatted markdown strings. Terminal control characters, ANSI escape sequences, colors, progress bars, spin indicators, cursor positioning, and interactive TUI layouts are stripped or lost.
2. **Parsing & Desync Risks**: Parsing stateful stdout streams across chunks can result in line-splitting artifacts and double-processing errors.
3. **Coexistence Requirements**: Interactive AI workflows (such as plan approval prompts, question prompts, and confirmation menus) currently key off structured events extracted from stdout. Any transition to a raw terminal mirror must preserve these interactive capabilities while delivering a pixel/byte-accurate terminal representation to session joiners.

This document presents a comprehensive, production-ready architectural design to replace (or enhance) the reconstructed chat summary with a real, byte-accurate terminal mirror.

---

## 1. Host-Side Terminal Capture Analysis

To capture the live terminal output on the host, two main architectural approaches were evaluated: **Approach A (`node-pty`)** and **Approach B (`tmux capture-pane`)**.

### Approach Comparison

| Technical Aspect | Approach A: `node-pty` Native PTY | Approach B: `tmux capture-pane` Polling |
| :--- | :--- | :--- |
| **Mechanism** | Spawns the CLI child process (`agy` / `gemini` / bash) under a real pseudoterminal slave (PTY) using Unix `openpty(3)` / Windows ConPTY bindings. Emits real-time data events (`onData`) as raw bytes arrive from the process. | Reuses existing `TmuxSession` (`apps/cli/src/terminal/tmux/tmux-session.ts`). Periodically executes `tmux capture-pane -p -e -t <session>.<pane>` to capture screen text with embedded ANSI color/style escape codes (`-e`). |
| **Tmux Dependency** | **Zero dependency on `tmux`**. Operates standalone in any environment. | **Hard dependency on `tmux`** binary installed on the host machine. Fails on systems without `tmux` or on standard Windows environments. |
| **Cross-Platform Support** | High support on **macOS**, **Linux**, and **Windows** (via ConPTY native bindings in `@lydell/node-pty` / `node-pty`). | Restricted to **Linux** and **macOS** (and WSL). Non-functional on native Windows. |
| **Output Latency & Push Model** | **Real-time Push (Event-driven)**. PTY data events fire immediately upon process write (~0ms capture delay). | **Polling Delay (Pull-driven)**. Capture interval (e.g. 50ms–100ms) introduces latency and sub-optimal CPU overhead under idle states. |
| **Terminal Fidelity & Resizing** | **100% Raw Byte-Accurate Stream**. Preserves exact ANSI escape sequences, cursor movements, screen clearing (`\x1b[2J`), alternate screen buffer, and color palettes. Relays terminal resize events (`pty.resize(cols, rows)`) natively. | **Snapshot Text Capture**. Captures current grid viewport with inline styling tags. Intermediary frame deltas, rapid animations, and sub-second cursor movements occurring between poll ticks are lost. |
| **CPU / IO Overhead** | Low CPU overhead. Event-driven streams process data only when the child process produces output. | Higher CPU/process spawning overhead. Spawning `tmux` subprocesses continuously (e.g., 20 times/sec) generates OS process creation churn. |

### Technical Recommendation: `node-pty` as Core PTY Layer with Tmux Fallback/Bridge

We recommend **Approach A (`node-pty`)** as the primary host-side capture engine for Collagility for the following reasons:
1. **Cross-Platform Reliability**: `node-pty` works seamlessly across macOS, Linux, and Windows without requiring end users to have `tmux` pre-installed.
2. **Zero Polling Latency**: Event-driven streaming delivers real-time terminal keystrokes, spinners, and progress bar updates with sub-millisecond host capture overhead.
3. **Exact Stream Fidelity**: Passing the raw PTY stdout buffer directly to the wire format guarantees that client-side terminal emulators receive identical byte sequences.

> **Integration with `COLLAGILITY_TMUX_SESSION`**:  
> When a user explicitly runs Collagility inside a tmux session (`COLLAGILITY_TMUX_SESSION` environment variable set), Collagility can operate in **Tmux Bridge Mode** using `tmux capture-pane -p -e` or `pipe-pane` to capture the pane stream. Otherwise, Collagility defaults to spawning `node-pty` natively for standalone terminal capture.

---

## 2. Wire Format & Protocol Specification

To transmit byte-accurate terminal streams without breaking backward compatibility, we define a dedicated, explicitly versioned protocol message in `@collagility/protocol`.

### Protocol Event Definition: `terminal.pty.frame`

The existing `terminal.screen.stream` message (which transfers lossy reconstructed text lines) will remain active for legacy clients. The new `terminal.pty.frame` message carries raw PTY byte streams and dimensions.

#### Schema Definition (`packages/protocol/src/schemas.ts`)
```typescript
import { z } from 'zod';

export const TerminalPtyFramePayloadSchema = z.object({
  sessionId: z.string(),
  paneId: z.string().default('main'),
  seq: z.number(),
  encoding: z.enum(['utf8', 'base64']).default('utf8'),
  data: z.string(),
  isSnapshot: z.boolean().default(false),
  cols: z.number().optional(),
  rows: z.number().optional(),
  timestamp: z.number(),
});

export type TerminalPtyFramePayload = z.infer<typeof TerminalPtyFramePayloadSchema>;
```

#### Event Type Constant (`packages/protocol/src/constants.ts`)
```typescript
export const EVENT_TYPES = {
  // ... existing types
  TERMINAL_PTY_FRAME: 'terminal.pty.frame',
} as const;
```

#### Event Factory Function (`packages/protocol/src/events.ts`)
```typescript
export function createTerminalPtyFrameEvent(
  payload: TerminalPtyFramePayload,
  sessionId?: string
): EventEnvelope<TerminalPtyFramePayload> {
  return createEnvelope(EVENT_TYPES.TERMINAL_PTY_FRAME, payload, {
    sessionId: sessionId || payload.sessionId,
    seq: payload.seq,
    sender: { id: payload.paneId, name: 'Host PTY' },
  });
}
```

### Architectural Tradeoff Analysis: Raw Byte Streaming vs. Periodic Full Snapshots

| Dimension | Option 1: Raw Byte Streaming + Virtual Emulator (Recommended) | Option 2: Periodic Screen Snapshots + Diffing |
| :--- | :--- | :--- |
| **Bandwidth Usage** | **Optimal**. Transmits only incremental diff bytes written by the process (a few bytes per chunk). | **High / Wasteful**. Sending complete 80x24 or 120x40 text grids (or grid diffs) repeatedly consumes significantly higher network bandwidth. |
| **Host Workload** | **Extremely Low**. Host simply pipes raw process stdout chunks to WebSockets. No screen parsing or DOM/VT calculation on host. | **Heavy**. Host must run a VT emulator, render screen buffer to 2D matrix, compute row/cell diffs, and serialize. |
| **State Synchronization** | Terminal emulator state on client (`@xterm/headless`) processes ANSI escape sequences incrementally and maintains exact cursor/buffer state. | Host must send a complete initial snapshot to late joiners, followed by frame diffs. |
| **Complex ANSI Support** | Natively handles cursor repositioning (`\x1b[H`), line erasing (`\x1b[2K`), scroll regions, and color changes. | Complex VT sequence state must be computed on host before sending grid snapshots. |

### Recommendation for v1: Raw Byte Streaming + Late-Joiner Snapshot Catchup
For v1, we stream **raw UTF-8 / Base64 bytes** directly over WebSockets. 

To support late-joining clients who connect mid-session:
1. The host (or server `SessionManager`) retains a **rolling raw PTY byte ring-buffer** (e.g. last 128KB).
2. When a late joiner connects, the server sends an initial `terminal.pty.frame` marked with `isSnapshot: true` containing either the accumulated PTY buffer or a serialized screen state, followed immediately by live raw byte frames (`isSnapshot: false`).

---

## 3. Client-Side Rendering Strategy (`@xterm/headless` + Ink)

### Replacing Naive Regex-Stripping in `RemotePane.tsx`

Currently, `RemotePane.tsx` splits raw string data on newlines, strips ANSI escape sequences via regular expressions (`replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')`), and feeds string rows into a custom `VirtualScreen` grid. This causes broken multi-line layouts, missing cursor positions, and loss of terminal formatting.

We propose replacing this with `@xterm/headless` (the official node/non-DOM terminal engine from Xterm.js).

```
                    ┌─────────────────────────┐
                    │ WebSocket Event Stream  │
                    │  (terminal.pty.frame)   │
                    └────────────┬────────────┘
                                 │ Raw Bytes
                                 ▼
                    ┌─────────────────────────┐
                    │   SessionClientStream   │
                    │         Handler         │
                    └────────────┬────────────┘
                                 │ write(chunk)
                                 ▼
                    ┌─────────────────────────┐
                    │   @xterm/headless       │
                    │   Terminal Instance     │
                    │ (Screen Buffer & State) │
                    └────────────┬────────────┘
                                 │ serialize() / activeBuffer rows
                                 ▼
                    ┌─────────────────────────┐
                    │  RemotePane.tsx (Ink)   │
                    │ <Text> Row Rendering    │
                    └─────────────────────────┘
```

### Technical Workflow

1. **Headless Terminal Initialization**:
   `SessionClientStreamHandler` (or `RemotePane`) instantiates a headless Xterm terminal:
   ```typescript
   import { Terminal } from '@xterm/headless';

   const terminal = new Terminal({
     cols: 80,
     rows: 24,
     allowProposedApi: true,
     scrollback: 1000,
   });
   ```

2. **Stream Processing**:
   As `terminal.pty.frame` WebSocket messages arrive from the server, raw bytes are written to the headless terminal instance:
   ```typescript
   terminal.write(frame.data);
   ```
   `@xterm/headless` automatically processes all ANSI sequence codes, updates internal cell arrays, manages cursor positioning, supports alternate screen buffers, and handles scrolling.

3. **Buffer Extraction & Ink Rendering**:
   `RemotePane.tsx` extracts visible buffer lines from `terminal.buffer.active` and maps cell text to Ink elements:
   ```tsx
   export function renderHeadlessBuffer(terminal: Terminal): string[] {
     const buffer = terminal.buffer.active;
     const lines: string[] = [];
     
     for (let i = 0; i < terminal.rows; i++) {
       const line = buffer.getLine(buffer.viewportY + i);
       lines.push(line ? line.translateToString(true) : '');
     }
     return lines;
   }
   ```

4. **Styling & Color Preservation (v1 vs. Stretch Goal)**:
   - **v1 Baseline**: Extract plain text lines from `@xterm/headless` buffer (`translateToString(true)`), preserving exact line structure, padding, cursor alignment, and multi-column formatting.
   - **Stretch Goal (Colors)**: Iterate cell-by-cell over `line.getCell(x)` to extract foreground/background color attributes and ANSI bold/dim/italic flags, mapping them directly to Ink `<Text color={fg} backgroundColor={bg} bold={isBold}>` props.

---

## 4. Throttling, Batching & Backpressure

Raw PTY byte streams produce a significantly higher event frequency during fast output generation (such as large file diffs, dependency installation logs, or progress spinners) than parsed high-level event summaries.

### Existing Streamer Analysis
The host currently uses `ThrottledTerminalStreamer` (`apps/cli/src/terminal/terminal-stream-renderer.ts`) configured with a **25ms batching interval**:
```typescript
const terminalStreamer = new ThrottledTerminalStreamer((batchedData) => {
  client.send('terminal.screen.stream', { ... });
}, 25);
```

### Parameter Recommendations for PTY Streams

To prevent WebSocket buffer bloat and excessive React/Ink re-render churn on joiner terminals while maintaining smooth 60 FPS animation responsiveness:

1. **Target Flush Window**: **16ms – 20ms** (approx. 50–60 flushes per second max).
2. **Payload Size Cap**: **16 KB per frame**. If buffered PTY data exceeds 16 KB within a single 16ms window, flush immediately to prevent large burst latency.
3. **High-Watermark Backpressure**:
   - If the WebSocket client `bufferedAmount` exceeds **512 KB**, pause PTY read stream (`ptyProcess.pause()`).
   - Resume PTY read stream (`ptyProcess.resume()`) once socket `bufferedAmount` drops below **64 KB**.

```typescript
export class ThrottledPtyStreamer {
  private buffer = '';
  private timer: NodeJS.Timeout | null = null;
  private readonly flushIntervalMs: number;
  private readonly maxChunkSizeBytes: number;

  constructor(
    private readonly onFlush: (data: string) => void,
    flushIntervalMs = 16,
    maxChunkSizeBytes = 16384
  ) {
    this.flushIntervalMs = flushIntervalMs;
    this.maxChunkSizeBytes = maxChunkSizeBytes;
  }

  public push(chunk: string): void {
    this.buffer += chunk;
    if (this.buffer.length >= this.maxChunkSizeBytes) {
      this.flush();
    } else if (!this.timer) {
      this.timer = setTimeout(() => this.flush(), this.flushIntervalMs);
    }
  }

  public flush(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.buffer.length > 0) {
      const dataToSend = this.buffer;
      this.buffer = '';
      this.onFlush(dataToSend);
    }
  }
}
```

---

## 5. Feature Flag & Coexistence Strategy

To ensure zero disruption to existing users, the byte-accurate PTY terminal mirror will ship behind an explicit opt-in configuration flag.

### Flag Definition
- **Environment Variable**: `COLLAGILITY_TERMINAL_MIRROR`
- **Supported Values**:
  - `legacy` (default when un-set): Emits lossy reconstructed summary stream (`terminal.screen.stream`) processed by `SessionHostBroadcaster`.
  - `pty`: Enables raw `node-pty` / `terminal.pty.frame` byte-accurate streaming.
  - `auto`: Automatically selects `pty` when supported native binary bindings exist; falls back to `legacy`.

### Coexistence Architecture

```
                             ┌──────────────────────────────┐
                             │ Host AI Process / PTY Stream │
                             └──────────────┬───────────────┘
                                            │
                     ┌──────────────────────┴──────────────────────┐
                     │                                             │
      COLLAGILITY_TERMINAL_MIRROR=legacy            COLLAGILITY_TERMINAL_MIRROR=pty
                     │                                             │
                     ▼                                             ▼
       ┌──────────────────────────┐                  ┌──────────────────────────┐
       │ AntigravityOutputParser  │                  │   ThrottledPtyStreamer   │
       │ (Parses Stream-JSON)     │                  │  (Raw ANSI Byte Stream)  │
       └─────────────┬────────────┘                  └─────────────┬────────────┘
                     │                                             │
                     ▼                                             ▼
       ┌──────────────────────────┐                  ┌──────────────────────────┐
       │  terminal.screen.stream  │                  │    terminal.pty.frame    │
       │  (Legacy Reconstructed)  │                  │  (Byte-Accurate Stream)  │
       └──────────────────────────┘                  └──────────────────────────┘
```

Both stream modes can run concurrently during the rollout phase. The host can publish `terminal.pty.frame` events alongside legacy `terminal.screen.stream` events, allowing upgraded joiners to render full PTY screens while older clients render the legacy summary pane.

---

## 6. Comprehensive Test & Verification Plan

### Test Strategy Matrix

| Component | Unit Test Scope | Verification Focus |
| :--- | :--- | :--- |
| **Protocol (`packages/protocol`)** | `schemas.test.ts` & `events.test.ts` | Validate `TerminalPtyFramePayloadSchema` parsing, serialization, and sequence numbering. |
| **Host Streamer (`apps/cli`)** | `throttled-pty-streamer.test.ts` | Verify batching under 16ms interval, instant flushes when exceeding 16KB max chunk limit, and clean teardown. |
| **Client Renderer (`apps/cli`)** | `RemotePane.test.tsx` & `headless-render.test.ts` | Verify `@xterm/headless` buffer instantiation, ANSI sequence handling, grid dimensions (80x24), and line extraction. |
| **Server Relay (`apps/server`)** | `message-handler.test.ts` & `broadcaster.test.ts` | Confirm server relays `terminal.pty.frame` to session members (excluding host sender) and maintains rolling late-joiner PTY buffer. |

### Deterministic End-to-End Parity Test

Because real `agy` CLI output is non-deterministic (dependent on network LLM responses), we will prove byte-for-byte visual parity using a **Deterministic Fixture Binary / Script**.

#### Deterministic Test Fixture (`test-pty-fixture.js`)
We will create a helper script that emits known ANSI control sequences:
```javascript
// Outputs deterministic ANSI colors, cursor movements, line clears, and progress bars
console.log('\x1b[2J\x1b[H'); // Clear screen & move cursor to top-left
console.log('\x1b[32m[COLLAGILITY TEST FIXTURE]\x1b[0m Starting verification...');
console.log('Line 1: Plain text line');
console.log('Line 2: \x1b[31mRed text\x1b[0m and \x1b[34mBlue text\x1b[0m');
console.log('\x1b[KLine 3: Overwritten content via carriage return\rLine 3: Clean overwritten line');
```

#### Parity Verification Procedure
1. **Host Side Execution**: Spawn `test-pty-fixture.js` under `node-pty` (or mock process) on the host. Pipe stdout through `ThrottledPtyStreamer` into a local `@xterm/headless` instance `HostTerminal`.
2. **Network Transmission**: Send `terminal.pty.frame` packets over the WebSocket loopback server.
3. **Client Side Execution**: Receive frames on `SessionClientStreamHandler` and write into client `@xterm/headless` instance `ClientTerminal`.
4. **Assertion**: Compare `HostTerminal.buffer.active` line-by-line against `ClientTerminal.buffer.active`:
   ```typescript
   for (let row = 0; row < 24; row++) {
     const hostLine = HostTerminal.buffer.active.getLine(row)?.translateToString(true).trimEnd();
     const clientLine = ClientTerminal.buffer.active.getLine(row)?.translateToString(true).trimEnd();
     expect(clientLine).toBe(hostLine);
   }
   ```
   *Requirement*: 100% string-grid parity across all 24 viewport rows (modulo trailing whitespace normalization).

---

## 7. Risk Register & Mitigation Strategies

| Risk Factor | Impact Level | Mitigation Strategy |
| :--- | :--- | :--- |
| **Interactive Prompts Breakage** | **HIGH** | Interactive prompts (Plan approvals, question selections, confirmation prompts) currently rely on `AntigravityOutputParser` detecting `[THOUGHT]`, `[TOOL_ANALYSIS]`, `ai.plan`, etc. **Mitigation**: The host will continue running `AntigravityOutputParser` on stdout in parallel with PTY byte streaming. Structured prompt events will continue to emit over `ai.plan` / `ai.question` WebSocket types while `terminal.pty.frame` handles visual screen mirroring. |
| **Native C++ Compilation Failures (`node-pty`)** | **MEDIUM** | `node-pty` uses native C++ bindings (`pty.node`) which require platform build tools or prebuilt binaries. **Mitigation**: Use `@lydell/node-pty` or bundle verified prebuilt binaries for macOS (x64/arm64) and Linux (x64). Fallback gracefully to `tmux capture-pane` or legacy mode if native PTY spawning fails. |
| **Windows OS Compatibility** | **LOW** | Legacy docs mention Linux/macOS primary support. Native Windows terminal PTY handles ConPTY differently. **Mitigation**: Ensure `node-pty` gracefully detects Windows ConPTY or falls back to legacy mode on Windows environments. |
| **High Frequency Buffer Memory Churn** | **LOW** | Streaming unfiltered raw terminal output during fast loops could accumulate memory in WebSocket client handlers. **Mitigation**: Enforce 128KB max rolling buffer limits in `SessionClientStreamHandler` and apply `@xterm/headless` line scrollback caps. |

---

## Next Steps for Phase 2 Implementation

Upon review and approval of this architectural specification (`docs/architecture/terminal-mirror.md`):
1. **Protocol Implementation**: Add `TerminalPtyFramePayloadSchema` and `createTerminalPtyFrameEvent` to `@collagility/protocol`.
2. **Host PTY Integration**: Create `PtyTerminalHost` wrapper using `node-pty` in `apps/cli`.
3. **Client Headless Renderer**: Integrate `@xterm/headless` into `RemotePane.tsx` and `SessionClientStreamHandler`.
4. **Automated Parity Suite**: Implement deterministic fixture parity test verifying 1:1 host/client screen parity.
