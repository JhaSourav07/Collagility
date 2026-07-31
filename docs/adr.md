# Architecture Decision Records (ADRs)

**Project:** Collagility  
**Tagline:** The Multiplayer Workspace for AI Coding Agents  
**Status:** Living Architectural Document  
**Maintained By:** Core Engineering & Architecture Team  

---

## Overview

This repository uses Architecture Decision Records (ADRs) to document significant architectural and engineering decisions made during the evolution of **Collagility**.

Each record captures the **Context**, **Problem**, **Decision**, **Alternatives Considered**, **Pros & Cons**, **Consequences**, **Future Considerations**, and explicit rationale (**Why this decision was selected**).

---

## Table of Contents

* [ADR-001: Self-Hosted First Instead of Cloud SaaS](#adr-001-self-hosted-first-instead-of-cloud-saas)
* [ADR-002: Real-Time WebSockets Instead of REST API](#adr-002-real-time-websockets-instead-of-rest-api)
* [ADR-003: Native WebSockets Instead of Socket.IO](#adr-003-native-websockets-instead-of-socketio)
* [ADR-004: TypeScript Stack Instead of Go or Rust](#adr-004-typescript-stack-instead-of-go-or-rust)
* [ADR-005: Fastify Server Framework Instead of Express](#adr-005-fastify-server-framework-instead-of-express)
* [ADR-006: pnpm Monorepo Workspaces Instead of Multi-Repo](#adr-006-pnpm-monorepo-workspaces-instead-of-multi-repo)
* [ADR-007: Event-Driven Architecture (EDA) for Session Sync](#adr-007-event-driven-architecture-eda-for-session-sync)
* [ADR-008: Server Never Communicates with External AI Providers](#adr-008-server-never-communicates-with-external-ai-providers)
* [ADR-009: AI Execution Isolated Exclusively to Host Machine](#adr-009-ai-execution-isolated-exclusively-to-host-machine)
* [ADR-010: Adapter Pattern for AI Agent Integrations](#adr-010-adapter-pattern-for-ai-agent-integrations)
* [ADR-011: Single Shared AI Session Instead of Per-User Agents](#adr-011-single-shared-ai-session-instead-of-per-user-agents)
* [ADR-012: No Database Dependency in MVP Server Architecture](#adr-012-no-database-dependency-in-mvp-server-architecture)
* [ADR-013: Browser Client Postponed to Post-MVP Milestones](#adr-013-browser-client-postponed-to-post-mvp-milestones)
* [ADR-014: Protocol-First Development Strategy](#adr-014-protocol-first-development-strategy)
* [ADR-015: Modular Plugin Architecture for AI Drivers](#adr-015-modular-plugin-architecture-for-ai-drivers)
* [ADR-016: Structured JSON Payload Messages Over WebSocket](#adr-016-structured-json-payload-messages-over-websocket)
* [ADR-017: Stateless Relay Server Nodes](#adr-017-stateless-relay-server-nodes)
* [ADR-018: Docker Container as Default Deployment Target](#adr-018-docker-container-as-default-deployment-target)
* [ADR-019: Open-Source First Release Model Before SaaS](#adr-019-open-source-first-release-model-before-saas)
* [ADR-020: Terminal-Native CLI-First User Interface](#adr-020-terminal-native-cli-first-user-interface)
* [Future ADRs](#future-adrs)
* [Engineering Principles](#engineering-principles)

---

## ADR-001: Self-Hosted First Instead of Cloud SaaS

* **ADR Number:** ADR-001
* **Title:** Self-Hosted First Deployment Model
* **Status:** Accepted
* **Context:** Developers and enterprise engineering teams are reluctant to route sensitive proprietary codebase context through third-party cloud intermediaries during early technology adoption.
* **Problem:** Building a centralized multi-tenant cloud SaaS for MVP increases operational complexity, compliance burdens (SOC 2, GDPR), hosting costs, and security friction for early adopters.
* **Decision:** Launch Collagility as a lightweight, zero-dependency self-hosted binary and Docker image that developers can deploy on local machines or private cloud VPCs in under 2 minutes.
* **Alternatives Considered:** 
  1. Cloud-only multi-tenant SaaS.
  2. Peer-to-peer WebRTC without any server.
* **Pros:** Zero hosting cost liability for the open-source project; immediate compliance approval for enterprise users; total data privacy.
* **Cons:** Users must manage their own server deployment or local network connectivity.
* **Consequences:** Relies on clean Docker templates and simple CLI flags for server invocation (`collagility-relay`).
* **Future Considerations:** Introduce a managed cloud SaaS platform once open-source traction and protocol stability are proven.
* **Why this decision was selected:** Self-hosting eliminates security barriers to entry for enterprise developers, ensuring rapid open-source adoption without incurring infrastructure operational costs.

---

## ADR-002: Real-Time WebSockets Instead of REST API

* **ADR Number:** ADR-002
* **Title:** WebSockets as Primary Communication Layer
* **Status:** Accepted
* **Context:** Collagility requires sub-50ms token streaming, real-time presence indicators, and bidirectional prompt suggestions.
* **Problem:** REST HTTP APIs require continuous polling (Short/Long Polling), creating extreme network overhead, high latency, and inefficient server resource usage during LLM token generation.
* **Decision:** Adopt persistent, bidirectional WebSockets (`wss://`) for all real-time session events, token streaming, chat, and presence.
* **Alternatives Considered:**
  1. REST HTTP Long-Polling.
  2. Server-Sent Events (SSE) + HTTP POST for upstream client actions.
  3. gRPC Web / HTTP/2.
* **Pros:** Low latency; minimal frame header overhead; native full-duplex communication over single TCP connection.
* **Cons:** State management across connection drops requires custom reconnection buffers.
* **Consequences:** Requires custom heartbeat pings and client sequence buffer management.
* **Future Considerations:** Evaluate WebRTC data channels for direct host-to-peer data transport in Phase 3.
* **Why this decision was selected:** WebSockets provide universal compatibility across terminals, browsers, and proxies while delivering the sub-50ms streaming latency required for multiplayer AI pairing.

---

## 3. ADR-003: Native WebSockets Instead of Socket.IO

* **ADR Number:** ADR-003
* **Title:** Native WebSocket Implementation Over Socket.IO
* **Status:** Accepted
* **Context:** Selecting a real-time messaging library for the CLI and Fastify backend.
* **Problem:** High-level abstractions like Socket.IO add heavy client bundle bloat, non-standard fallback overhead (HTTP polling fallback), custom handshake protocols, and complex cross-language SDK maintenance.
* **Decision:** Standardize on native WebSocket implementations (`ws` library for Node.js, standard W3C WebSocket API for clients).
* **Alternatives Considered:**
  1. Socket.IO.
  2. SignalR.
  3. Engine.IO.
* **Pros:** Minimal dependency footprint; zero custom protocol lock-in; lightweight memory consumption ($\le 15\text{ KB}$ per socket).
* **Cons:** Application layer must handle heartbeats, reconnection timers, and message sequence buffering explicitly.
* **Consequences:** We must implement lightweight sequence tracking and reconnection logic in `@collagility/protocol`.
* **Future Considerations:** Easily migrate to binary WebSocket payloads (Protobuf / FlatBuffers) without changing socket wrappers.
* **Why this decision was selected:** Native WebSockets keep dependencies lightweight, eliminate framework lock-in, and allow non-JavaScript clients (Go, Rust, IDE plugins) to implement the protocol easily.

---

## 4. ADR-004: TypeScript Stack Instead of Go or Rust

* **ADR Number:** ADR-004
* **Title:** Unified TypeScript Monorepo Tech Stack
* **Status:** Accepted
* **Context:** Selecting the primary programming language for the CLI application, shared core packages, and Fastify server.
* **Problem:** Using compiled languages like Rust or Go for the server while using Node.js for CLI TUI libraries (React/Ink) causes context-switching overhead, duplicate protocol type definitions, and slower feature iteration.
* **Decision:** Standardize on TypeScript across the entire monorepo (`apps/cli`, `apps/server`, `packages/core`, `packages/protocol`).
* **Alternatives Considered:**
  1. Rust (Tauri CLI + Actix-web server).
  2. Go (Bubbletea TUI + Gin server).
* **Pros:** Single programming language; 100% shared protocol types (`@collagility/protocol`); massive Node.js ecosystem for CLI tooling and terminal rendering (Ink).
* **Cons:** Garbage collection overhead compared to Rust/Go; larger binary distribution size for bundled CLI executable.
* **Consequences:** We bundle CLI binaries using `esbuild` / single-executable applications for rapid startup.
* **Future Considerations:** Rewrite critical high-throughput server relay routes in Rust or Go if Node.js reaches performance ceilings at $500,000+$ concurrent sockets.
* **Why this decision was selected:** TypeScript enables end-to-end type safety between client and server, eliminates protocol definition drift, and accelerates development speed.

---

## 5. ADR-005: Fastify Server Framework Instead of Express

* **ADR Number:** ADR-005
* **Title:** Fastify Framework for Server Gateway
* **Status:** Accepted
* **Context:** Choosing the HTTP/WebSocket backend web framework for `@collagility/server`.
* **Problem:** Express.js is legacy software with high routing overhead, poor async/await ergonomics, lacking native JSON schema validation, and stale WebSocket integration plugins.
* **Decision:** Standardize on **Fastify** using `@fastify/websocket` and Ajv JSON schema validation.
* **Alternatives Considered:**
  1. Express.js.
  2. NestJS.
  3. Koa.
* **Pros:** Benchmark performance up to $2\times$ faster than Express; built-in JSON schema validation; native TypeScript support; low overhead plugin architecture.
* **Cons:** Smaller plugin ecosystem compared to legacy Express.
* **Consequences:** Fastify plugins must be authored using standard encapsulation patterns (`fastify-plugin`).
* **Future Considerations:** Utilize Fastify schema compilation for high-throughput REST HTTP auth endpoints.
* **Why this decision was selected:** Fastify delivers industry-leading throughput, low latency, native TypeScript integration, and official high-performance WebSocket support.

---

## 6. ADR-006: pnpm Monorepo Workspaces Instead of Multi-Repo

* **ADR Number:** ADR-006
* **Title:** pnpm Workspaces & TurboRepo Monorepo Architecture
* **Status:** Accepted
* **Context:** Organizing multiple packages (`cli`, `server`, `core`, `protocol`, `drivers`) across the project codebase.
* **Problem:** Multi-repo setups cause version mismatch friction, complex local linking (`npm link`), delayed cross-package refactoring, and sluggish CI build loops.
* **Decision:** Adopt a unified **pnpm workspace** monorepo backed by **TurboRepo** for pipeline caching.
* **Alternatives Considered:**
  1. Separate independent Git repositories.
  2. npm / yarn workspaces.
  3. Lerna monorepo.
* **Pros:** Strict package boundary enforcement via `workspace:*` dependencies; fast install speeds via content-addressable storage; TurboRepo parallel build caching.
* **Cons:** Requires root-level tooling discipline to prevent unintended package coupling.
* **Consequences:** Developers use `pnpm --filter` to execute targeted package tasks.
* **Future Considerations:** Integrate TurboRepo remote caching for GitHub Actions CI acceleration.
* **Why this decision was selected:** pnpm workspaces combined with TurboRepo provide optimal disk efficiency, strict package isolation, and rapid monorepo build speeds.

---

## 7. ADR-007: Event-Driven Architecture (EDA) for Session Sync

* **ADR Number:** ADR-007
* **Title:** Event-Driven Architecture for Multiplayer State Synchronization
* **Status:** Accepted
* **Context:** Managing state synchronization between Host AI process stdio output and remote participant terminals.
* **Problem:** Request-Response RPC models cannot capture asynchronous token streams, unexpected process crashes, or out-of-band side-chat without complex blocking mechanisms.
* **Decision:** Architect the platform around an **Event-Driven Architecture (EDA)** where all actions are modeled as immutable `EventFrame` messages (`domain.entity.action`).
* **Alternatives Considered:**
  1. Synchronous Request-Response RPC.
  2. Operational Transformation (OT) / CRDT state sync.
* **Pros:** Highly decoupled components; effortless real-time stream broadcasting; deterministic sequence number audit logs.
* **Cons:** Requires client-side message ordering buffers to handle out-of-order packet delivery.
* **Consequences:** Every event frame MUST carry a monotonic sequence counter (`seq`).
* **Future Considerations:** Support event stream recording for offline session playback (`.cast` files).
* **Why this decision was selected:** Event-Driven Architecture naturally mirrors terminal stdio streams, AI reasoning events, and real-time chat interactions.

---

## 8. ADR-008: Server Never Communicates with External AI Providers

* **ADR Number:** ADR-008
* **Title:** Complete Server Isolation from AI API Endpoints
* **Status:** Accepted
* **Context:** Defining the security and network boundaries of the Collagility relay server.
* **Problem:** If the backend server proxies AI API calls, it becomes a high-risk security target for API key theft, incurs massive bandwidth costs, and triggers corporate compliance blocks.
* **Decision:** The server MUST NEVER store API keys, make HTTP requests to AI providers (Google AI, Anthropic, OpenAI), or handle raw model inferencing traffic.
* **Alternatives Considered:**
  1. Centralized AI API proxying server.
  2. Server-side API key vault with backend AI execution.
* **Pros:** Zero API key storage liability; zero server LLM billing costs; 100% compliance alignment for enterprise users.
* **Cons:** Host machine must maintain outbound network access to vendor AI APIs.
* **Consequences:** The server is purely a dumb relay event router.
* **Future Considerations:** Maintain this invariant permanently across both open-source and future SaaS cloud offerings.
* **Why this decision was selected:** Server isolation eliminates security liabilities, protects user API keys, and guarantees that server hosting costs remain minimal.

---

## 9. ADR-009: AI Execution Isolated Exclusively to Host Machine

* **ADR Number:** ADR-009
* **Title:** Local Host-Only AI Agent Execution
* **Status:** Accepted
* **Context:** Establishing execution privileges for AI model tool calls (file edits, shell execution).
* **Problem:** Running AI agents on central servers requires spinning up expensive, transient cloud sandboxes (microVMs/Firecracker) and uploading entire repository codebases to third-party infrastructure.
* **Decision:** Local AI agents (Gemini CLI, Claude Code) execute strictly on the session owner's local developer machine, utilizing local Git state, local toolchains, and local environment credentials.
* **Alternatives Considered:**
  1. Cloud-hosted container execution sandboxes.
  2. Remote execution on participant machines.
* **Pros:** Zero cloud compute cost; immediate access to local dev tooling and uncommitted Git branches; complete data privacy.
* **Cons:** Host machine must remain powered on and connected to the session.
* **Consequences:** The host CLI application acts as the driver engine wrapper for local AI binaries.
* **Future Considerations:** Allow host handoff between developer machines (e.g. laptop to desktop).
* **Why this decision was selected:** Local execution respects developer privacy, requires zero remote cloud sandboxes, and leverages existing developer environment setups.

---

## 10. ADR-010: Adapter Pattern for AI Agent Integrations

* **ADR Number:** ADR-010
* **Title:** Hexagonal Ports & Adapters Strategy for AI Agents
* **Status:** Accepted
* **Context:** Supporting multiple local AI coding binaries (Gemini CLI, Claude Code, Aider, Goose).
* **Problem:** Hardcoding CLI flags or stdout parsing for a single AI binary tightly couples core application logic to unversioned external CLI tool outputs.
* **Decision:** Define a generic `IAgentDriver` domain port interface (`packages/drivers`) and implement provider-specific adapters (`plugins/driver-gemini`).
* **Alternatives Considered:**
  1. Monolithic driver script with conditional statements.
  2. Generic ANSI terminal regex scraper.
* **Pros:** New AI tools can be integrated in hours without altering core session logic; driver code is cleanly isolated and unit-testable.
* **Cons:** Adapter logic must be maintained when underlying third-party CLI binaries update their stdio formats.
* **Consequences:** Each driver adapter lives in a dedicated monorepo plugin workspace.
* **Future Considerations:** Expose the `IAgentDriver` interface via a public SDK for community plugin development.
* **Why this decision was selected:** The Adapter Pattern ensures that Collagility remains AI-provider-agnostic and extensible to any future CLI coding agent.

---

## 11. ADR-011: Single Shared AI Session Instead of Per-User Agents

* **ADR Number:** ADR-011
* **Title:** Multiplayer Collaboration Over a Single Shared AI Agent State
* **Status:** Accepted
* **Context:** Defining the collaboration interaction model when multiple developers pair in a session.
* **Problem:** Giving every participant their own independent AI agent leads to fragmented context, duplicate file reads, conflicting code diff proposals, and token budget waste.
* **Decision:** All session participants interact with a **single, unified AI agent session** owned and driven by the Host machine.
* **Alternatives Considered:**
  1. Multi-agent mob where each user has an isolated AI instance.
  2. Peer-to-peer agent merging engine.
* **Pros:** Single source of truth for conversation history; synchronized diff viewing; shared token budget; cohesive team pairing experience.
* **Cons:** Non-host participants must wait for host prompt approval or active stream completion before initiating next steps.
* **Consequences:** Host CLI manages prompt suggestion queues from co-drivers.
* **Future Considerations:** Introduce agent branch forks for experimental prompt testing without polluting main session state.
* **Why this decision was selected:** A shared single AI session mirrors traditional human pair programming, keeping the team aligned on a single solution thread.

---

## 12. ADR-012: No Database Dependency in MVP Server Architecture

* **ADR Number:** ADR-012
* **Title:** In-Memory & Redis Ephemeral Room Storage for MVP
* **Status:** Accepted
* **Context:** Designing persistence requirements for the initial MVP open-source relay server (`apps/server`).
* **Problem:** Requiring PostgreSQL or MongoDB setup for early open-source users introduces heavy deployment friction, database migration complexity, and storage overhead.
* **Decision:** The MVP server operates with **Zero Database Dependencies**, managing active room state purely in ephemeral server memory or an optional Redis container.
* **Alternatives Considered:**
  1. Embedded SQLite database.
  2. PostgreSQL with Prisma ORM.
* **Pros:** Single-command server execution (`docker run`); instant local setup; zero database schema migration overhead.
* **Cons:** Server restart clears active room states (clients must reconnect and re-establish session tokens).
* **Consequences:** Session IDs and join tokens are verified using stateless cryptographic signatures (HMAC tokens).
* **Future Considerations:** Add PostgreSQL in Milestone 10 for enterprise user management and audit logging.
* **Why this decision was selected:** Removing database dependencies reduces open-source self-hosting setup time to under 10 seconds.

---

## 13. ADR-013: Browser Support Postponed to Post-MVP Milestones

* **ADR Number:** ADR-013
* **Title:** Postponing Web Browser Client Implementation
* **Status:** Accepted
* **Context:** Prioritizing client interface development resources for initial launch.
* **Problem:** Building a full web browser application (React SPA + WebAssembly + ANSI terminal renderer) simultaneously with the CLI doubles UI engineering scope and delays MVP launch.
* **Decision:** Postpone browser client development to Phase 3, focusing 100% of MVP resources on delivering a flawless **terminal CLI interface** (`@collagility/cli`).
* **Alternatives Considered:**
  1. Web-first React SPA with CLI secondary.
  2. Electron desktop wrapper for MVP.
* **Pros:** Halves UI development time; focuses engineering on the primary target persona (terminal-first developers); ensures terminal ergonomics are perfected.
* **Cons:** Non-terminal users cannot view sessions without installing the CLI.
* **Consequences:** The protocol envelope is designed to ensure seamless browser client adoption later without breaking protocol compatibility.
* **Future Considerations:** Release a read-only browser observer client in Milestone 3 using Xterm.js.
* **Why this decision was selected:** CLI-first development maximizes engineering velocity and targets the core developer demographic using CLI AI tools today.

---

## 14. ADR-014: Protocol-First Development Strategy

* **ADR Number:** ADR-014
* **Title:** Protocol-Driven Engineering Methodology
* **Status:** Accepted
* **Context:** Structuring communication contracts between server and client applications.
* **Problem:** Coupling client UI components directly to backend route handlers leads to brittle codebases, protocol fragmentation, and broken multi-client SDKs.
* **Decision:** Design, document, and test the **WebSocket Protocol Specification (`@collagility/protocol`)** BEFORE building application UI or backend server components.
* **Alternatives Considered:**
  1. Ad-hoc message formats defined during UI feature development.
  2. GraphQL subscriptions over WebSocket.
* **Pros:** Enables parallel development of CLI, server, and mock drivers; provides single source of truth for event types; guarantees multi-client compatibility.
* **Cons:** Upfront design time required to write formal RFC specifications (`RFC-0003`).
* **Consequences:** All event frames must adhere to schemas in `@collagility/protocol`.
* **Future Considerations:** Generate automated language bindings (Rust, Go, Python) from protocol JSON schemas.
* **Why this decision was selected:** Protocol-first development enforces rigorous API contracts, accelerates parallel team workflows, and prevents client-server synchronization bugs.

---

## 15. ADR-015: Modular Plugin Architecture for AI Drivers

* **ADR Number:** ADR-015
* **Title:** Modular Driver Plugin Architecture
* **Status:** Accepted
* **Context:** Structuring third-party AI provider driver integrations.
* **Problem:** Bundling every AI driver into the core CLI binary bloats package sizes, introduces conflicting third-party dependencies, and requires core team reviews for every new AI tool addition.
* **Decision:** Implement a **Modular Plugin Architecture** where AI drivers are decoupled into standalone packages (`@collagility/driver-gemini`, `@collagility/driver-claude`) loaded via dynamic imports.
* **Alternatives Considered:**
  1. Monolithic driver codebase inside core CLI package.
  2. External CLI process wrappers over stdio execution scripts.
* **Pros:** Tiny core CLI bundle size; independent package versioning; community developers can build custom AI drivers independently.
* **Cons:** Requires dynamic package loading and sandbox safety checks.
* **Consequences:** Core repository maintains clear separation between `packages/drivers` and `plugins/driver-*`.
* **Future Considerations:** Publish a Driver Plugin SDK and host a community plugin marketplace in Phase 4.
* **Why this decision was selected:** Modular plugins ensure long-term architectural scalability and empower the open-source community to contribute AI drivers freely.

---

## 16. ADR-016: JSON Messages Over WebSocket

* **ADR Number:** ADR-016
* **Title:** UTF-8 Encoded JSON Payload Frames Over WebSockets
* **Status:** Accepted
* **Context:** Selecting message wire serialization format for WebSocket communication.
* **Problem:** Binary formats (Protobuf, MessagePack, FlatBuffers) require complex build steps, schema compilation tooling, and reduce human readability during network packet debugging.
* **Decision:** Standardize on **UTF-8 encoded JSON text frames** for all WebSocket communication in MVP.
* **Alternatives Considered:**
  1. Protocol Buffers (Protobuf).
  2. MessagePack.
  3. Raw ANSI string streams.
* **Pros:** 100% human-readable over browser DevTools and Wireshark; native JavaScript/TypeScript serialization; seamless JSON schema validation.
* **Cons:** Slightly larger payload size compared to binary encodings (mitigated by streaming small delta string chunks).
* **Consequences:** Envelope carries explicit `version` and `event` string attributes.
* **Future Considerations:** Support binary Protobuf frames via WebSocket subprotocol negotiation (`collagility-v2-binary`) for high-throughput enterprise deployments.
* **Why this decision was selected:** JSON payloads maximize developer ergonomics, simplify debugging, and accelerate early MVP protocol iteration.

---

## 17. ADR-017: Stateless Relay Server Nodes

* **ADR Number:** ADR-017
* **Title:** Stateless Architecture for Fastify Relay Nodes
* **Status:** Accepted
* **Context:** Designing server scalability across multi-node compute clusters.
* **Problem:** Storing in-memory session history or sticky socket state on specific server nodes breaks horizontal scalability and causes catastrophic room drops during node failures.
* **Decision:** Relay server nodes MUST remain **100% Stateless**. Room event distribution and socket registration metadata are offloaded to Redis Pub/Sub.
* **Alternatives Considered:**
  1. Stateful server nodes with sticky load balancer sessions.
  2. Distributed Erlang/Elixir actor mesh.
* **Pros:** Infinite horizontal scalability; nodes can be added/removed without room data loss; zero local disk storage required.
* **Cons:** Dependable external message broker (Redis) required for multi-node deployments.
* **Consequences:** Sockets connecting to Node A receive events published by Node B via Redis channels.
* **Future Considerations:** Leverage AWS ElastiCache / Redis Cluster auto-sharding for enterprise scale.
* **Why this decision was selected:** Stateless server design guarantees effortless horizontal scale-out and fault-tolerant node replacement in cloud environments.

---

## 18. ADR-018: Docker Container as Default Deployment Target

* **ADR Number:** ADR-018
* **Title:** Docker & Docker Compose as Official Deployment Artifacts
* **Status:** Accepted
* **Context:** Standardizing server deployment for self-hosters and open-source contributors.
* **Problem:** Manual server setups requiring Node.js environment configuration, process managers (PM2), and manual Redis wiring lead to high support ticket volume and broken installations.
* **Decision:** Provide official, multi-stage **Docker containers** (`collagility/relay:latest`) and production-ready `docker-compose.yml` templates as the official deployment standard.
* **Alternatives Considered:**
  1. Bare-metal systemd service installation scripts.
  2. Kubernetes Helm charts only.
* **Pros:** Single-command startup (`docker-compose up`); deterministic environment execution; zero host OS dependency conflicts.
* **Cons:** Requires users to have Docker installed on their self-hosted server instance.
* **Consequences:** The monorepo includes automated Docker build actions in CI pipelines.
* **Future Considerations:** Publish official Helm Charts for enterprise Kubernetes deployments in Milestone 10.
* **Why this decision was selected:** Docker provides the simplest, most reproducible deployment experience for open-source self-hosters.

---

## 19. ADR-019: Open Source Before SaaS

* **ADR Number:** ADR-019
* **Title:** Open Source First Product Launch Strategy
* **Status:** Accepted
* **Context:** Strategy for building developer trust, community adoption, and product validation.
* **Problem:** Launching a closed-source SaaS product in the developer tooling space faces extreme skepticism, slow sales cycles, and high marketing acquisition costs.
* **Decision:** Launch Collagility as an **Apache 2.0 / MIT Open-Source Project** first, cultivating community adoption and contributor feedback before introducing managed cloud commercial offerings.
* **Alternatives Considered:**
  1. Closed-source commercial SaaS launch.
  2. Dual-license Open Core model from Day 1.
* **Pros:** Rapid organic developer adoption; community code contributions; immediate feedback loops; build developer trust.
* **Cons:** No immediate SaaS revenue on Day 1.
* **Consequences:** Codebase architecture must prioritize clear documentation, easy self-hosting, and simple contributor onboarding.
* **Future Considerations:** Launch Collagility Cloud (managed hosting, SSO, compliance audit logs) as a commercial enterprise tier post-v1.0.
* **Why this decision was selected:** An open-source-first strategy builds developer trust, establishes grassroots adoption, and creates a vibrant ecosystem.

---

## 20. ADR-020: Terminal-Native CLI-First User Interface

* **ADR Number:** ADR-020
* **Title:** Terminal-Native User Experience Driven by React/Ink
* **Status:** Accepted
* **Context:** Choosing the primary user interface framework for host and participant developers.
* **Problem:** Developers using CLI AI tools (Gemini CLI, Claude Code) dislike switching context to external browser windows or heavy GUI apps during active terminal sessions.
* **Decision:** Build a **Terminal-Native TUI Application** using React/Ink (`apps/cli`), keeping developers 100% inside their native terminal environment.
* **Alternatives Considered:**
  1. Electron desktop GUI app.
  2. Web browser dashboard.
  3. Raw ANSI terminal output scripts without TUI layout.
* **Pros:** Zero context switching for terminal developers; works seamlessly over SSH sessions; low system memory footprint.
* **Cons:** Restricted by ANSI grid layout constraints and terminal color support limits.
* **Consequences:** Component UI code is authored using React/Ink declarative primitives (`<Box>`, `<Text>`).
* **Future Considerations:** Add mouse navigation support and dynamic split-pane window resizing.
* **Why this decision was selected:** A terminal-native TUI provides the fastest, lowest-friction experience for developers already working within terminal workflows.

---

## Future ADRs

The following architectural decisions are deliberately postponed until post-v1.0 milestones to maintain team velocity and focus:

1. **ADR-021: Enterprise Authentication & SAML 2.0 Integration:** Postponed until managed enterprise cloud SaaS phase.
2. **ADR-022: Browser Client Architecture (Xterm.js + WebAssembly):** Postponed to Milestone 3 / Phase 3.
3. **ADR-023: VS Code Extension Architecture & Host IPC:** Postponed to Milestone 3 / Phase 3.
4. **ADR-024: Kubernetes Deployment Topology & Helm Chart Spec:** Postponed to Milestone 10.
5. **ADR-025: Distributed Redis Cluster Sharding Strategy:** Postponed to Phase 2 scale-out.
6. **ADR-026: PostgreSQL Relational Database Schema & Prisma ORM:** Postponed to Enterprise SaaS phase.
7. **ADR-027: Multi-Region Global Anycast Routing:** Postponed to Phase 4 Enterprise Cloud.
8. **ADR-028: Usage-Based Billing Engine & Stripe Integration:** Postponed to Commercial SaaS release.
9. **ADR-029: Driver Plugin Marketplace Registry & Verification Service:** Postponed to Phase 4.
10. **ADR-030: End-to-End Encryption (E2EE) Noise Protocol Payload Wrappers:** Postponed to Phase 4 Security release.

---

## Engineering Principles

Every contributor to Collagility MUST adhere to these core engineering principles:

1. **Keep the Server Dumb:** The relay server is a stateless event router. Never add AI model execution, context processing, or heavy business logic to the backend server.
2. **The Protocol is the Product:** All features must be specified and versioned in `@collagility/protocol` before UI implementation. Clean protocol contracts enable multi-client ecosystems.
3. **AI Providers Are Replaceable:** Never couple core domain logic to a single AI tool vendor. Abstract provider interactions behind the `IAgentDriver` port.
4. **Prefer Composition Over Coupling:** Design small, single-purpose packages in `packages/`. Avoid monolithic modules and circular workspace dependencies.
5. **Design for Extensibility:** Build plugin hooks and driver interfaces so the community can extend Collagility without touching core codebase files.
6. **Optimize for Developer Experience (DX):** Single-command startups (`collagility host`), instant terminal responsiveness, and intuitive keyboard shortcuts are non-negotiable.
7. **Minimize Dependencies:** Resist adding unnecessary npm packages. Evaluate bundle size, performance, and security audit history before introducing third-party code.
8. **Build Small, Iterate Fast:** Break features into small, testable Pull Requests. Ship incremental improvements continuously rather than giant monolithic releases.
9. **Keep the CLI Delightful:** Renders must be flicker-free, ANSI colors must degrade gracefully on legacy terminals, and application exits must leave the user terminal clean.
10. **Documentation is Part of the Product:** Code is incomplete without up-to-date inline docstrings, clear RFCs, and verified `README.md` instructions.

---
