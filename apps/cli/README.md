# @collagility/cli

> React Ink Terminal User Interface (TUI) Application

`@collagility/cli` is the interactive command-line interface for Collagility, emulating the official Google Antigravity CLI layout and keybinding workflows.

---

## ⚡ Features & UI Layout

- **Header (`Header.tsx`)**: Displays workspace root, active AI driver model (`agy v2.0`), connection status badge, and subagent indicator.
- **Chat Timeline (`ChatPane.tsx`)**: Renders thought process blockquotes (`▸ Multi-Step Reasoning`), File Edit cards, and Tool Execution cards.
- **Security Permission Cards (`PermissionPromptCard.tsx`)**: Interactive permission approval cards with hotkey hints (`y`/`n`/`e`).
- **Input Bar (`InputBar.tsx`)**: Path autocomplete popup (`@`), slash command auto-completion (`Tab`), and double-escape prompt clearing (`Esc Esc`).
- **Overlays (`overlays/`)**: Subagent drawer (`/agents`, `Ctrl+K`), Security overlay (`/permissions`), MCP server loader (`/mcp`), and Session resume overlay (`/resume`).

---

## 🚀 Running

```bash
# Start CLI as session host
pnpm --filter @collagility/cli start --cli agy

# Join an existing session
pnpm --filter @collagility/cli join <sessionId>

# Run tests
pnpm --filter @collagility/cli test
```
