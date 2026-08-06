# @collagility/stream

> Zero-Latency Stream Buffer, Chunking, and Sequence Assembler Engine

`@collagility/stream` manages high-frequency streaming token buffers, chunking boundaries, and sequence number ordering for real-time multiplayer terminal streaming.

---

## ⚡ Exported APIs & Features

- **`StreamManager`**: Manages stream lifecycle states (`IDLE`, `ACTIVE`, `PAUSED`, `COMPLETED`, `CANCELLED`).
- **`ChunkBuffer`**: Aggregates incoming stdout/stderr byte chunks into clean UTF-8 text deltas.
- **`SequenceTracker`**: Validates monotonic packet sequence ordering to prevent out-of-order rendering.

---

## 🧪 Testing

```bash
pnpm --filter @collagility/stream test
```
