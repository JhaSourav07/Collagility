# @collagility/server

> Fastify & WebSocket Session Gateway & Broadcaster Server

`@collagility/server` is the lightweight, zero-knowledge WebSocket relay server for Collagility collaboration sessions.

---

## ⚡ Core Responsibilities

- **Fastify & WebSocket Gateway**: Listens on port `8080` (or `$PORT`), handling HTTP health checks (`/health`) and WebSocket upgrades (`/ws`).
- **Session Management**: Manages session creation, membership joins/leaves, and local disk checkpointing (`.collagility/sessions/<sessionId>.json`).
- **Zero-Knowledge Broadcaster**: Routes generic event packets between host and peer clients without reading or storing AI prompts or API keys.

---

## 🚀 Running

```bash
# Start server locally
pnpm --filter @collagility/server start

# Run tests
pnpm --filter @collagility/server test
```
