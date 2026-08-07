# Manual QA Checklist — Tmux Orchestration & Realtime AI Collaboration

Use this checklist to manually verify Collagility's `tmux` multi-pane session orchestration and permission bridge on macOS, Linux, and WSL environments.

---

### 1. Tmux Split Session Creation
- [ ] Run `collagility start` (or `collagility host`).
- [ ] **Expected**: A new tmux session `collagility-<sessionId>` is created and attached automatically.
- [ ] **Expected**: Terminal is split into two panes:
  - **Left Pane (~38%)**: Collagility Ink React UI (Chat feed, active member badges, security mode, activity log).
  - **Right Pane (~62%)**: Raw AI CLI executable (`agy`, `gemini`, `claude`, etc.).

---

### 2. Native AI CLI Interface
- [ ] Inspect the right pane's interface.
- [ ] **Expected**: Displays full native colors, ANSI styling, and raw prompt UI completely unmodified.
- [ ] **Expected**: No wrapper artifacts, rendering lag, or missing interactive elements.

---

### 3. Native Keyboard Focus & Input Navigation
- [ ] Use `Ctrl+B Left` to focus the left Collagility chat pane and type a message or slash command (`/help`).
- [ ] **Expected**: Input is received by Collagility's Ink chat input bar.
- [ ] Use `Ctrl+B Right` (or `Ctrl+B o`) to switch focus to the right AI CLI pane.
- [ ] **Expected**: Direct keyboard inputs (typing, arrow keys, `Ctrl+C`, `Ctrl+D`) pass natively to the AI CLI without interference.

---

### 4. Session Detach & Re-attach
- [ ] Detach from the session using `Ctrl+B d`.
- [ ] **Expected**: Returns cleanly to your shell while the tmux session continues running in the background.
- [ ] Re-attach using `tmux attach-session -t collagility-<sessionId>`.
- [ ] **Expected**: Terminal re-attaches instantly with intact left chat and right AI CLI panes.

---

### 5. Child Process Termination & Clean Exit
- [ ] Exit or kill the process running in the right pane (e.g. exit the AI CLI).
- [ ] **Expected**: Collagility detects the exit, cleans up temporary log files, and exits gracefully without hanging the terminal.

---

### 6. Pipe-Pane Event & Broadcast Pipeline
- [ ] Execute an AI prompt in the session.
- [ ] **Expected**: `pipe-pane` streams stdout from the right pane into the adapter parser.
- [ ] **Expected**: Activity feed updates on the left pane, and remote WebSocket participants receive streamed updates token-by-token.

---

### 7. Remote Collaborator Approval Relay
- [ ] Join the session from a remote participant terminal (`collagility join <sessionId>`).
- [ ] Set security mode to `manual`.
- [ ] Trigger an action requiring approval.
- [ ] Have the remote participant click "Approve" (or type `y`) in their Collagility UI.
- [ ] **Expected**: Remote decision is relayed over WebSocket to the local host process.
- [ ] **Expected**: Local host process executes `sendKeys(sessionName, 1, 'y')`, forwarding the approval keystroke directly to the right tmux pane.

---

### 8. Native Windows WSL Enforcement
- [ ] Attempt to run `collagility start` on native Windows (`cmd.exe` or PowerShell outside WSL).
- [ ] **Expected**: Outputs a clear error message stating `tmux` requires WSL, displays the Microsoft WSL install doc link (`https://learn.microsoft.com/en-us/windows/wsl/install`), and exits non-zero cleanly without crashing.
