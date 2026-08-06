# @collagility/protocol

> Versioned WebSocket Event Packet Envelopes and Zod Validation Schemas

`@collagility/protocol` defines standard Zod schemas, envelope types, and packet constructors for real-time WebSocket communication across Collagility clients and servers.

---

## ⚡ Exported Schemas & Events

- **Session Envelopes**: `SESSION_CREATE`, `SESSION_JOIN`, `SESSION_LEAVE`, `SESSION_STATE`.
- **Security Permissions**: `SESSION_PERMISSION_REQUEST`, `SESSION_PERMISSION_RESPONSE`.
- **Subagent Events**: `SUBAGENT_SPAWNED`, `SUBAGENT_PROGRESS`, `SUBAGENT_COMPLETED`.
- **AI Streaming Packets**: `AI_STARTED`, `AI_READY`, `AI_PROMPT`, `AI_STREAM_CHUNK`, `AI_COMPLETED`, `AI_FAILED`.

---

## 🧪 Testing

```bash
pnpm --filter @collagility/protocol test
```
