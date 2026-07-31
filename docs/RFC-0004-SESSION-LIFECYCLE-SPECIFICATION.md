# RFC-0004: Session Lifecycle & Distributed State Machine Specification

**Title:** Collagility Session Lifecycle Specification (v1.0.0-draft)  
**Author:** Staff Software Architect  
**Status:** Draft / Proposal  
**Created:** July 2026  
**Target Systems:** `@collagility/server`, `@collagility/cli`, Relay Infrastructure  

---

## 1. Executive Summary

This document specifies the authoritative distributed state machine and complete lifecycle management model for collaborative sessions in **Collagility**.

A Collagility session represents an active, synchronized multiplayer workspace where multiple developers interact with a local AI coding agent running on the session owner's machine. Because Collagility enforces a local-first, zero-trust architecture, session state is distributed across the local host CLI, stateless relay server nodes (`SessionStore` / `SessionManager`), and remote participant clients.

This specification defines all formal session states **(done)**, state transitions **(done)**, heartbeat mechanics **(done)**, disconnect/reconnect recovery policies **(done)**, local AI execution lifecycles **(done)**, ownership transfers **(done)**, edge case handling **(done)**, and cleanup protocols **(done)** required to ensure fault tolerance in unreliable network environments. Persistent database archival is reserved for future enterprise milestones **(future)**.

---

## 2. Session Lifecycle Overview

The session lifecycle spans six distinct macro-phases:

```
[Phase 1: Creation & Init] ──> [Phase 2: Active Multiplayer] ──> [Phase 3: Degraded / Recovery]
                                          │                                │
                                          ▼                                ▼
[Phase 6: Termination]     <── [Phase 5: Cleanup & Archival] <── [Phase 4: Expiration]
```

1. **Creation & Initialization:** Session record created, host authenticates, local AI driver process initializes, and room tokens are issued.
2. **Active Multiplayer:** Host and participants stream AI events, submit co-prompts, engage in side-chat, and synchronize presence state.
3. **Degraded / Recovery:** Transient network losses, host/participant disconnects, or local AI process crashes. Graceful timers allow reconnection and stream replay without session destruction.
4. **Expiration:** Inactive or abandoned rooms transition to expired state after strict grace period timeouts.
5. **Cleanup & Archival:** Redis room buffers and socket subscriptions are purged; audit metadata is persisted.
6. **Final Termination:** Session enters immutable terminal state; resources are fully released.

---

## 3. Session State Machine

### 3.1 Complete Session State Machine Diagram

```mermaid
stateDiagram-v2
    [*] --> CREATED: session.create
    CREATED --> ACTIVE_IDLE: host.connect (handshake complete)
    CREATED --> TERMINATED: init_timeout (60s)

    state ACTIVE {
        [*] --> ACTIVE_IDLE
        ACTIVE_IDLE --> ACTIVE_STREAMING: ai.stream.start
        ACTIVE_STREAMING --> ACTIVE_IDLE: ai.stream.end / ai.stream.error
        ACTIVE_IDLE --> DEGRADED_HOST_LOST: host.disconnect (transient)
        ACTIVE_STREAMING --> DEGRADED_HOST_LOST: host.disconnect (mid-stream)
    }

    state DEGRADED {
        DEGRADED_HOST_LOST --> ACTIVE_IDLE: host.reconnect (within 30s)
        DEGRADED_HOST_LOST --> PAUSED_OWNERLESS: reconnect_timeout (30s)
        PAUSED_OWNERLESS --> ACTIVE_IDLE: host.reconnect / ownership.transferred
        PAUSED_OWNERLESS --> EXPIRED: idle_grace_timeout (300s)
    }

    ACTIVE_IDLE --> CLOSING: host.close / session.terminate
    EXPIRED --> CLEANUP: cleanup.trigger
    CLOSING --> CLEANUP: cleanup.trigger
    CLEANUP --> TERMINATED: resources.purged
    TERMINATED --> [*]
```

---

## 4. Session States

| State Name | Category | Description | Allowed Inputs | Exit Triggers |
| :--- | :--- | :--- | :--- | :--- |
| `CREATED` | Transient | Room record initialized in DB/Redis; waiting for Host WebSocket. | `host.connect` | Host connects or 60s timeout. |
| `ACTIVE_IDLE` | Operational | Host and 0+ participants connected. AI agent idle. | `ai.stream.start`, `participant.join`, `host.disconnect` | Prompt execution or Host disconnect. |
| `ACTIVE_STREAMING` | Operational | Host's local AI process is actively streaming response tokens. | `ai.stream.chunk`, `ai.stream.end`, `host.disconnect` | Stream completion, error, or Host disconnect. |
| `DEGRADED_HOST_LOST` | Recovery | Host WebSocket dropped; 30s grace window active for Host reconnect. | `host.reconnect` | Host reconnects or 30s timer expires. |
| `PAUSED_OWNERLESS` | Recovery | Host failed to reconnect in 30s; session paused for participants. | `host.reconnect`, `ownership.transfer` | Host returns, transfer succeeds, or 300s timeout. |
| `EXPIRED` | Pre-Cleanup | Session timed out without Host recovery; read-only freeze. | `session.archive` | Automated background cleanup job. |
| `CLOSING` | Termination | Explicit shutdown sequence in progress; notifying clients. | `socket.close` | Sockets closed; flush complete. |
| `CLEANUP` | Internal | Purging Redis keys, closing channels, writing audit log. | `system.purge` | Memory cleared. |
| `TERMINATED` | Terminal | Immutable end state. Session ID retired. | None | N/A |

---

## 5. State Transition Rules

```mermaid
graph TD
    CREATED["CREATED"] -->|host.connect| ACTIVE_IDLE["ACTIVE_IDLE"]
    ACTIVE_IDLE -->|ai.stream.start| ACTIVE_STREAMING["ACTIVE_STREAMING"]
    ACTIVE_STREAMING -->|ai.stream.end| ACTIVE_IDLE
    ACTIVE_IDLE -->|host.disconnect| DEGRADED_HOST_LOST["DEGRADED_HOST_LOST"]
    ACTIVE_STREAMING -->|host.disconnect| DEGRADED_HOST_LOST
    DEGRADED_HOST_LOST -->|host.reconnect| ACTIVE_IDLE
    DEGRADED_HOST_LOST -->|timeout 30s| PAUSED_OWNERLESS["PAUSED_OWNERLESS"]
    PAUSED_OWNERLESS -->|host.reconnect| ACTIVE_IDLE
    PAUSED_OWNERLESS -->|timeout 300s| EXPIRED["EXPIRED"]
    EXPIRED -->|cleanup| TERMINATED["TERMINATED"]
    ACTIVE_IDLE -->|host.terminate| CLOSING["CLOSING"]
    CLOSING --> TERMINATED
```

---

## 6. Session Creation Flow

```mermaid
sequenceDiagram
    autonumber
    actor Host as Host CLI
    participant Server as WS Gateway
    participant Redis as Redis State
    participant DB as Postgres DB

    Host->>Server: HTTP POST /api/v1/sessions { workspace_id, agent_type }
    Server->>DB: Insert Session Record (State: CREATED)
    Server->>Redis: Set Key session:s_999:state = CREATED (TTL: 60s)
    Server-->>Host: HTTP 201 Created { session_id: "s_999", join_token: "t_123" }

    Host->>Server: WSS Upgrade /ws/v1/sessions/s_999
    Server->>Server: Validate Host Auth
    Server->>Redis: Update session:s_999:state = ACTIVE_IDLE
    Server-->>Host: auth.connected & session.state.synced
```

---

## 7. User Join Flow

```mermaid
sequenceDiagram
    autonumber
    actor Participant as Participant Client
    participant Server as WS Gateway
    participant Redis as Redis State
    actor Host as Host CLI

    Participant->>Server: WSS Upgrade /ws/v1/sessions/s_999 (Join Token)
    Server->>Redis: Get Session State & Validate Token
    alt State == ACTIVE_IDLE or ACTIVE_STREAMING
        Server->>Redis: SADD session:s_999:participants "usr_part1"
        Server-->>Participant: session.joined { role: "CO_DRIVER", last_seq: 1040 }
        Server-->>Host: presence.participant.joined { user_id: "usr_part1" }
    else State == PAUSED_OWNERLESS or EXPIRED
        Server-->>Participant: error.session_unavailable { code: 4004 }
    end
```

---

## 8. User Leave Flow

```mermaid
sequenceDiagram
    autonumber
    actor Participant as Participant Client
    participant Server as WS Gateway
    participant Redis as Redis State
    actor Host as Host CLI

    Participant->>Server: session.leave { session_id: "s_999" }
    Server->>Redis: SREM session:s_999:participants "usr_part1"
    Server-->>Participant: session.left { status: "SUCCESS" }
    Server-->>Host: presence.participant.left { user_id: "usr_part1" }
    Server->>Participant: WS Close 1000 (Normal Closure)
```

---

## 9. Owner Disconnect Flow

```mermaid
sequenceDiagram
    autonumber
    actor Host as Host CLI
    participant Server as WS Gateway
    participant Redis as Redis State
    actor Participant as Participant Client

    Note over Host,Server: Host Connection Drops (Network Failure)
    Server->>Server: Detect Socket Drop / Ping Timeout
    Server->>Redis: Set session:s_999:state = DEGRADED_HOST_LOST
    Server->>Redis: Set Key session:s_999:host_timer = 30s
    Server-->>Participant: session.degraded { reason: "HOST_DISCONNECTED", grace_sec: 30 }

    alt Host Reconnects within 30s
        Note over Host,Server: See Reconnect Flow
    else 30s Grace Timer Expires
        Server->>Redis: Set session:s_999:state = PAUSED_OWNERLESS
        Server-->>Participant: session.paused { reason: "OWNER_RECONNECT_TIMEOUT" }
    end
```

---

## 10. Participant Disconnect Flow

```mermaid
sequenceDiagram
    autonumber
    actor Participant as Participant Client
    participant Server as WS Gateway
    participant Redis as Redis State
    actor Host as Host CLI

    Note over Participant,Server: Participant Socket Drops
    Server->>Server: Detect Missing Heartbeat (45s)
    Server->>Redis: Set user:usr_part1:status = DISCONNECTED
    Server-->>Host: presence.participant.disconnected { user_id: "usr_part1", grace_sec: 60 }
    
    note over Server: If participant does not reconnect in 60s, emit participant.left
```

---

## 11. Reconnect Flow

```mermaid
sequenceDiagram
    autonumber
    actor Host as Host CLI
    participant Server as WS Gateway
    participant Redis as Redis State
    actor Participant as Participant Client

    Host->>Server: WSS Reconnect /ws/v1/sessions/s_999 { last_seq: 1042 }
    Server->>Redis: Verify Host Role & Session State
    Server->>Redis: Set session:s_999:state = ACTIVE_IDLE
    Server-->>Host: auth.reconnected { missed_events: [1043, 1044] }
    Server-->>Participant: session.resumed { status: "ACTIVE" }
```

---

## 12. AI Lifecycle

### 12.1 AI Lifecycle State Machine

```mermaid
stateDiagram-v2
    [*] --> UNINITIALIZED
    UNINITIALIZED --> READY: driver.initialize()
    READY --> EXECUTING: sendPrompt()
    
    state EXECUTING {
        [*] --> GENERATING_TOKENS
        GENERATING_TOKENS --> TOOL_CALL_PENDING: ai.tool.invoked
        TOOL_CALL_PENDING --> TOOL_EXECUTING: host.approve_tool
        TOOL_EXECUTING --> GENERATING_TOKENS: tool.result_returned
    }

    EXECUTING --> READY: stream.completed
    EXECUTING --> FAILED: process.crash / timeout
    FAILED --> READY: driver.restart()
    READY --> TERMINATED: driver.terminate()
    TERMINATED --> [*]
```

---

## 13. AI Failure Recovery

```mermaid
sequenceDiagram
    autonumber
    actor HostAI as Local Gemini CLI
    actor HostCLI as Host CLI Driver
    participant Server as WS Gateway
    actor Participant as Participant Client

    HostAI->>HostCLI: Process Crash (Exit Code 139 / SIGSEGV)
    HostCLI->>HostCLI: Capture stderr output
    HostCLI->>Server: ai.execution.failed { error: "Segmentation fault", can_restart: true }
    Server-->>Participant: ai.execution.failed { error: "Local AI process crashed" }
    
    HostCLI->>HostAI: Respawn Process (gemini --restart)
    HostAI-->>HostCLI: Process Ready
    HostCLI->>Server: ai.driver.ready { agent_type: "GEMINI_CLI" }
    Server-->>Participant: ai.driver.ready
```

---

## 14. Session Recovery Strategy

```mermaid
flowchart TD
    Start["Connection Loss Detected"] --> CheckWho{"Disconnect Target?"}
    
    CheckWho -- Participant --> PartTimer["Start 60s Reconnect Window"]
    PartTimer --> PartCheck{"Reconnected?"}
    PartCheck -- Yes --> PartSync["Replay Sequence Buffer & Resume"]
    PartCheck -- No --> PartPurge["Emit presence.participant.left & Purge"]

    CheckWho -- Host --> HostTimer["Start 30s Grace Timer (State: DEGRADED)"]
    HostTimer --> HostCheck{"Host Reconnected?"}
    HostCheck -- Yes --> HostSync["Resume Stream & Notify Room"]
    HostCheck -- No --> PauseRoom["Transition State to PAUSED_OWNERLESS"]
    
    PauseRoom --> TransferCheck{"Ownership Transfer Requested?"}
    TransferCheck -- Yes --> ExecuteTransfer["Assign New Host & Resume"]
    TransferCheck -- No --> ExpireTimer["Start 300s Expiration Countdown"]
    ExpireTimer --> ExpireCheck{"Host Returned in 300s?"}
    ExpireCheck -- Yes --> HostSync
    ExpireCheck -- No --> ExpireSession["Transition State to EXPIRED"]
```

---

## 15. Ownership Transfer

```mermaid
sequenceDiagram
    autonumber
    actor HostA as Original Host A
    actor HostB as Co-Driver Host B
    participant Server as WS Gateway

    HostA->>Server: ownership.transfer.request { target_user_id: "usr_B" }
    Server->>Server: Validate Host B Capabilities & Permission
    Server-->>HostB: ownership.transfer.offered { from: "usr_A" }
    HostB->>Server: ownership.transfer.accept
    Server->>Server: Update Room Metadata (Owner = Host B)
    Server-->>HostA: ownership.transfer.completed { new_role: "CO_DRIVER" }
    Server-->>HostB: ownership.transfer.completed { new_role: "HOST" }
```

---

## 16. Session Transfer

Session transfer occurs when a host transfers execution from machine A to machine B (e.g. desktop to laptop) while retaining ownership credentials.

```mermaid
sequenceDiagram
    autonumber
    actor DevMachine1 as Host Machine 1
    participant Server as WS Gateway
    actor DevMachine2 as Host Machine 2

    DevMachine2->>Server: session.transfer.claim { session_id: "s_999", owner_key: "k_sec" }
    Server-->>DevMachine1: session.transfer.evict { reason: "Claimed by another host instance" }
    DevMachine1->>Server: WS Close 1000
    Server-->>DevMachine2: session.transfer.granted { status: "ACTIVE" }
```

---

## 17. Session Expiration

```mermaid
sequenceDiagram
    autonumber
    participant Timer as Expiration Worker
    participant Server as WS Gateway
    participant Redis as Redis Store
    participant DB as Postgres DB

    Timer->>Redis: Scan Key session:*:state == PAUSED_OWNERLESS (TTL Expired)
    Redis-->>Timer: Match Found (session:s_999)
    Timer->>Server: Trigger Session Expiration (s_999)
    Server->>Redis: Set session:s_999:state = EXPIRED
    Server->>DB: Update Session Status = EXPIRED, ended_at = NOW()
    Server-->>Timer: Expiration Complete
```

---

## 18. Cleanup Strategy

```mermaid
flowchart TD
    Trigger["Session Expiration or Explicit Close"] --> MarkClosing["Set State = CLOSING"]
    MarkClosing --> BroadcastClose["Broadcast session.terminated to all clients"]
    BroadcastClose --> CloseSockets["Close all connected WebSockets (Code 1000)"]
    CloseSockets --> PurgeRedis["Delete Redis Room Keys & Presence Sets"]
    PurgeRedis --> PersistDB["Write Session Audit Record to PostgreSQL"]
    PersistDB --> MarkTerminated["Set State = TERMINATED"]
```

---

## 19. Failure Handling & Edge Cases

### 19.1 Detailed Edge Case Matrix

| Edge Case Scenario | Trigger Condition | System Behavior & Mitigation |
| :--- | :--- | :--- |
| **Last Participant Leaves** | All remote participants disconnect; Host remains. | Session remains `ACTIVE_IDLE`. Host can continue local AI pairing or await new joiners. |
| **Owner Disconnects Mid-AI Stream** | Host WebSocket drops while AI is emitting tokens. | Server buffers last token `seq`, pauses stream, notifies room (`session.degraded`), starts 30s host reconnect timer. |
| **AI Crashes During Streaming** | Local AI subprocess returns fatal error or segfault. | Host CLI captures `stderr`, transmits `ai.execution.failed` frame, and attempts local process respawn. |
| **Reconnect After Expiration** | Client attempts `auth.reconnect` on an `EXPIRED` session. | Server rejects connection with `error.session_expired` (Code 4010). Client UI prompts user to start a new session. |
| **Duplicate Reconnects** | Network split causes two host sockets with identical credentials. | Server evicts oldest socket connection (`session.evicted`), keeping only the newest authenticated socket. |
| **Simultaneous Transfer Requests** | Two users request ownership transfer concurrently. | Server uses Redis distributed lock (`SETNX lock:session:s_999`). First claim succeeds; second fails with 409 Conflict. |
| **Heartbeat Loss (Zombie Sockets)** | TCP socket silent drop without RST packet. | Server heartbeat monitor drops socket after 3 consecutive missed PING responses (45 seconds). |
| **Server Node Crash Mid-Session** | Relay server container instance is killed. | Clients auto-reconnect to another Fastify node via NLB. Redis Pub/Sub restores room broadcast state instantly. |

---

## 20. Operational & Scalability Considerations

1. **Stateless Node Reconnects:** Fastify nodes hold no session state in memory; any node can handle reconnect requests for any room by querying Redis.
2. **Key Expiration Timers:** Redis TTL keys drive `DEGRADED` and `PAUSED` timeouts automatically, preventing zombie room accumulation.

---

## 21. Security Considerations

1. **Host Isolation:** Remote participant actions in `PAUSED_OWNERLESS` or `DEGRADED` states are strictly rejected.
2. **Replay Buffer Protection:** Event replay buffers scrub sensitive environment headers before storing frames.

---

## 22. Future Extensions

* **Persistent Session Archival:** Uploading deterministic session replay logs to S3 for offline playback.
* **Distributed Multi-Host Pairing:** Allowing multiple hosts to connect different local AI agents into a single unified room.

---
