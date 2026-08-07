# Manual QA Checklist: PTY & Embedded AI Terminal Integration

This document outlines the step-by-step manual verification process for the PTY-driven embedded terminal UI and security permission bridging in Collagility.

---

## Prerequisites
- Monorepo built: `pnpm build`
- Installed dependencies: `node-pty` and `@xterm/headless`
- Operating System: Linux / macOS / Windows with terminal emulator (xterm-256color support)

---

## QA Test Scenarios

### Scenario 1: CLI Startup & Dual-Pane Rendering
- [ ] Launch Collagility CLI using `pnpm --filter collagility start` or `node apps/cli/dist/main.js start`.
- [ ] **Expected Result**:
  - The Ink app opens with a split layout when terminal width is $\ge$ 100 columns.
  - The **left pane** renders the `ChatPane` (human/system timeline) and bottom `InputBar`.
  - The **right pane** renders `AITerminalPane` containing the live `@xterm/headless` virtual screen buffer snapshot of the underlying CLI process.

---

### Scenario 2: Focused Keyboard Input Delivery
- [ ] Press **Tab** (or **Ctrl+T**) to focus the `AITerminalPane`.
- [ ] Verify visual focus indicator: `AITerminalPane` border turns **cyan** and the header displays `● live`.
- [ ] Type `help` or `gemini --help` into the terminal pane and press **Enter**.
- [ ] **Expected Result**: Keystrokes (`h-e-l-p\r`) are received directly by `AgentPtyProcess.write()`, and the CLI help output appears formatted in the right pane.

---

### Scenario 3: Terminal Resizing & CLI Output Reflow
- [ ] Resize your terminal emulator window (e.g. shrink from 140 columns down to 80 columns).
- [ ] **Expected Result**:
  - `App.tsx` calculates updated `cols` and `rows` and calls `AgentPtyProcess.resize(cols, rows)`.
  - The child process receives the `SIGWINCH` resize signal and reflows line text to match the new dimensions.
  - When window width drops below 100 columns, layout gracefully falls back to stacked view.

---

### Scenario 4: Focus Switching & Shortcut Isolation
- [ ] Focus the terminal pane (**Tab** / **Ctrl+T**).
- [ ] Press **Ctrl+K** or **Ctrl+L** or **Ctrl+D**.
- [ ] **Expected Result**:
  - Collagility global shortcuts (drawer/clear/exit) **do not fire**.
  - Raw control bytes (`\x0b`, `\x0c`, `\x04`) are passed directly to the child process.
- [ ] Press **Tab** again to return focus to `ChatPane`.
- [ ] **Expected Result**:
  - `AITerminalPane` border reverts to **gray** with `○ idle` status.
  - `InputBar` becomes active for chat commands, and **Ctrl+K** opens the subagent drawer as expected.

---

### Scenario 5: Process Failure & Error Resilience
- [ ] Trigger an unexpected process exit (e.g., execute `exit 1` or terminate the underlying CLI process).
- [ ] **Expected Result**:
  - The Ink app handles process termination gracefully without unmounting or crashing the CLI UI.
  - An exit event notification appears in the timeline (`✓ Process exited with code 1`).

---

### Scenario 6: Auto-Mode Permission Bridging vs Manual Mode
- [ ] Set security mode to `'auto'` (via `/mode auto` or footer toggle).
- [ ] Trigger a LOW-risk CLI operation that prompts for confirmation (e.g., `Proceed? [Y/n]`).
- [ ] **Expected Result**: `processPtyAutoApproval` detects the LOW-risk prompt and auto-writes `\r` to approve without requiring manual keystrokes.
- [ ] Switch security mode to `'manual'` (via `/mode manual`).
- [ ] Trigger the same CLI prompt.
- [ ] **Expected Result**: No auto-keystroke is sent; the system waits for the user to manually type into the focused pane.
