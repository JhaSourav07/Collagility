# @collagility/adapters

> AI Adapter Registry, Provider Integrations, and Security Risk Evaluation Engine

`@collagility/adapters` provides host machine AI adapter drivers (`AntigravityAdapter`, `GeminiAdapter`, `ClaudeAdapter`) and security risk evaluation logic for Collagility.

---

## ⚡ Exported APIs & Features

- **`AntigravityAIAdapter`**: Adapter driver for Google's Antigravity CLI (`agy`). Manages non-interactive subprocess lifecycle, parses JSON/text stream lines, and tracks subagent thread state.
- **`AntigravityOutputParser`**: Stream chunk parser extracting thought streaming blocks, tool execution events, file edits, and subagent dispatcher events (`SUBAGENT_SPAWNED`, `SUBAGENT_PROGRESS`, `SUBAGENT_COMPLETED`).
- **`loadMCPServerConfigs()`**: Discovers local `.mcp.json` and global `~/.gemini/antigravity-cli/mcp.json` Model Context Protocol server definitions.
- **`evaluateRisk(command, toolName)`**: Evaluates tool calls and shell commands to classify security risk as `LOW`, `MEDIUM`, or `HIGH`.

---

## 🧪 Testing

```bash
pnpm --filter @collagility/adapters test
```
