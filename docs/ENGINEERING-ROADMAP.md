# Engineering Execution Roadmap: Path to MVP & 10k GitHub Stars

**Author:** Engineering Manager & Principal Architect  
**Status:** Approved for Execution  
**Target Goal:** Production MVP Release (v0.1.0) $\rightarrow$ Star-Velocity Open Source Launch (v1.0.0)  
**Target Stack:** TypeScript, pnpm Workspaces, TurboRepo, Fastify, WebSockets, Commander.js, Ink TUI, Docker  

---

## Executive Overview

This document provides the step-by-step engineering execution roadmap for building **Collagility**. Designed for high velocity, software quality, and viral developer adoption, the roadmap spans 10 distinct, sequential milestones.

Each milestone defines actionable tasks, folder structures, GitHub issue breakdowns, pull request boundaries, acceptance criteria, risk profiles, code review checklists, and release notes to guide the engineering team seamlessly from initial monorepo scaffolding to a high-impact open-source release on GitHub.

---

## Milestone 1: Project Setup & Monorepo Infrastructure

### Goal
Establish a production-grade TypeScript pnpm monorepo with TurboRepo build caching, strict ESLint/Prettier configs, containerized development environments, and CI GitHub Actions automation.

* **Features:** Monorepo workspace orchestration, root TypeScript configuration, Docker Compose dev environment, GitHub Actions CI workflow.
* **Tasks:**
  1. Initialize `pnpm` workspace with `pnpm-workspace.yaml`.
  2. Configure root `tsconfig.json` with Project References.
  3. Set up TurboRepo pipeline (`turbo.json`) for `build`, `lint`, `typecheck`, and `test`.
  4. Create `packages/core` and `packages/protocol` stub packages.
  5. Configure Docker Compose file with Fastify & Redis services.
  6. Set up `.github/workflows/ci.yml` for automated PR checking.
* **Dependencies:** None.
* **Estimated Time:** 1 Week (20 Engineering Hours).
* **Difficulty:** Easy / Intermediate.
* **Testing Strategy:** Verify build pipeline caching with `turbo run build`; run CI workflow on draft PRs.
* **Deliverables:** Operational monorepo skeleton capable of building linked workspace packages.
* **Recommended GitHub Issues:**
  * `#1`: Scaffold pnpm workspace and TurboRepo configuration.
  * `#2`: Set up base TypeScript Project References and ESLint.
  * `#3`: Configure Docker Compose and GitHub Actions CI pipeline.
* **Recommended Pull Requests:**
  * `PR #1`: `feat(infra): monorepo setup with pnpm, turborepo, and tsconfig`
  * `PR #2`: `ci(github): add PR lint, typecheck, and test workflow`
* **Recommended Folder Structure:**
  ```
  collagility/
  ├── apps/
  ├── packages/
  │   ├── core/
  │   └── protocol/
  ├── tools/
  │   └── eslint-config/
  ├── pnpm-workspace.yaml
  ├── turbo.json
  └── docker-compose.yml
  ```
* **Acceptance Criteria:**
  * `pnpm install` installs all workspace dependencies cleanly.
  * `pnpm build` completes without TypeScript errors across packages.
  * GitHub Action CI passes on fresh branch pushes.
* **Engineering Risks:** Incorrect TypeScript reference paths causing stale build artifacts.
* **Code Review Checklist:**
  * [ ] Are pnpm workspace wildcard filters correctly specified?
  * [ ] Is strict type-checking enabled in root `tsconfig.json`?
* **Developer Notes:** Use `pnpm --filter <package>` during local testing to isolate builds.
* **Release Notes:** Scaffolded initial project repository and automated CI pipeline.

---

## Milestone 2: Stateless WebSocket Relay Server

### Goal
Build a high-performance, stateless Fastify WebSocket server supporting connection handshakes, room creation, event frame validation, and Redis Pub/Sub message fanout.

* **Features:** WebSocket HTTP upgrade route, JSON-RPC event frame validation, in-memory/Redis room manager, pub/sub event router.
* **Tasks:**
  1. Create `@collagility/server` package inside `apps/server`.
  2. Implement Fastify server bootstrap with `@fastify/websocket`.
  3. Integrate JSON Schema validator for envelope headers (`version`, `session_id`, `event`).
  4. Implement `RoomManager` using Redis Pub/Sub for room event broadcasts.
  5. Add heartbeat ping/pong monitor with auto-disconnection after 45s of silence.
* **Dependencies:** Milestone 1 (`@collagility/protocol`).
* **Estimated Time:** 1.5 Weeks (40 Engineering Hours).
* **Difficulty:** Intermediate / Advanced.
* **Testing Strategy:** Unit test room manager logic with Vitest; run WebSocket integration tests using mock WS clients.
* **Deliverables:** Executable Fastify server binary capable of relaying 10,000 msg/sec over WebSockets.
* **Recommended GitHub Issues:**
  * `#4`: Create Fastify server entrypoint and WebSocket route handler.
  * `#5`: Implement JSON-RPC event frame validation guard.
  * `#6`: Implement Redis Pub/Sub room event dispatcher.
* **Recommended Pull Requests:**
  * `PR #3`: `feat(server): fastify websocket gateway & protocol validator`
  * `PR #4`: `feat(server): redis pub/sub room manager & heartbeat listener`
* **Recommended Folder Structure:**
  ```
  apps/server/
  ├── src/
  │   ├── gateway/
  │   │   ├── websocket.ts
  │   │   └── heartbeat.ts
  │   ├── rooms/
  │   │   ├── RoomManager.ts
  │   │   └── RedisDispatcher.ts
  │   └── index.ts
  └── package.json
  ```
* **Acceptance Criteria:**
  * Multiple WebSocket clients connecting to the same room receive broadcast events with sub-20ms latency.
  * Invalid JSON frames receive `error.protocol_violation` frames without server crashes.
* **Engineering Risks:** Memory leaks from un-cleared WebSocket socket references upon sudden client drops.
* **Code Review Checklist:**
  * [ ] Are socket listeners properly removed in `onClose` handlers?
  * [ ] Are Redis connection pools re-used across Fastify requests?
* **Developer Notes:** Spin up Redis locally using `docker-compose up -d redis`.
* **Release Notes:** Delivered stateless Fastify WebSocket server with Redis Pub/Sub room fanout.

---

## Milestone 3: Terminal CLI Application & Ink TUI Scaffold

### Goal
Build the `@collagility/cli` application using Commander.js and React/Ink, delivering the `collagility host` and `collagility join` command interfaces.

* **Features:** CLI argument parsing, interactive Ink TUI layout, connection controller, ASCII branding banner.
* **Tasks:**
  1. Create `@collagility/cli` package in `apps/cli`.
  2. Implement Commander.js CLI flags (`collagility host --agent gemini`, `collagility join <id>`).
  3. Scaffold React/Ink terminal user interface components (Header presence bar, main view pane, input prompt field).
  4. Integrate `@collagility/client-sdk` WebSocket connection manager into TUI state.
* **Dependencies:** Milestone 2 (`@collagility/server`).
* **Estimated Time:** 1.5 Weeks (40 Engineering Hours).
* **Difficulty:** Intermediate.
* **Testing Strategy:** Ink testing library component tests; CLI execution tests verifying ANSI terminal output.
* **Deliverables:** Runnable `collagility` CLI binary executable in standard Linux/macOS terminals.
* **Recommended GitHub Issues:**
  * `#7`: Implement Commander.js entrypoint and command flags.
  * `#8`: Build React/Ink TUI layout components.
  * `#9`: Connect TUI state to WebSocket client lifecycle.
* **Recommended Pull Requests:**
  * `PR #5`: `feat(cli): commander entrypoint and ink TUI dashboard`
  * `PR #6`: `feat(cli): websocket state integration and ANSI rendering`
* **Recommended Folder Structure:**
  ```
  apps/cli/
  ├── src/
  │   ├── commands/
  │   │   ├── host.ts
  │   │   └── join.ts
  │   ├── ui/
  │   │   ├── App.tsx
  │   │   ├── Header.tsx
  │   │   └── MainPane.tsx
  │   └── index.ts
  └── package.json
  ```
* **Acceptance Criteria:**
  * Running `collagility host` opens interactive TUI displaying generated Session ID.
  * Running `collagility join <id>` connects peer terminal and renders active status bar.
* **Engineering Risks:** ANSI layout degradation on narrow or non-TrueColor terminal emulators.
* **Code Review Checklist:**
  * [ ] Is Ink stdout cleanly separated from child process logs?
  * [ ] Are terminal resize events handled dynamically?
* **Developer Notes:** Test TUI layouts across Alacritty, iTerm2, and VS Code integrated terminal.
* **Release Notes:** Launched initial `@collagility/cli` binary with interactive Ink TUI dashboard.

---

## Milestone 4: Side-Channel Chat & Real-Time Presence

### Goal
Implement out-of-band participant side-chat and real-time presence indicators directly within the CLI TUI without polluting the AI prompt context window.

* **Features:** TUI chat panel, user presence bar, active file focus indicator, typing status indicators.
* **Tasks:**
  1. Add `chat.message.send` and `chat.message.broadcast` protocol handlers.
  2. Create Ink `ChatPanel` component with auto-scroll and message input toggle.
  3. Add `presence.update` interval tracking participant focus file and cursor activity.
  4. Render active participant list in Ink `PresenceBar` header.
* **Dependencies:** Milestone 3 (`@collagility/cli`).
* **Estimated Time:** 1 Week (30 Engineering Hours).
* **Difficulty:** Easy / Intermediate.
* **Testing Strategy:** Multi-client integration test validating that chat messages dispatched by User A render instantly on User B's TUI.
* **Deliverables:** Synchronized side-chat and presence bar across multiple connected terminals.
* **Recommended GitHub Issues:**
  * `#10`: Implement WebSocket protocol schemas for chat and presence.
  * `#11`: Build Ink ChatPanel component and TUI focus keybindings.
  * `#12`: Wire presence updates to Redis state.
* **Recommended Pull Requests:**
  * `PR #7`: `feat(protocol): chat and presence event payload schemas`
  * `PR #8`: `feat(cli): ink chat panel and participant presence status bar`
* **Recommended Folder Structure:**
  ```
  apps/cli/src/ui/
  ├── components/
  │   ├── ChatPanel.tsx
  │   ├── PresenceBar.tsx
  │   └── UserBadge.tsx
  ```
* **Acceptance Criteria:**
  * Typing `/chat Hello team` sends out-of-band message to all connected room participants.
  * Participant presence status (Active/Idle) updates in real-time within 2 seconds.
* **Engineering Risks:** Excessive presence updates flooding WebSocket channels during rapid typing.
* **Code Review Checklist:**
  * [ ] Are presence updates debounced by at least 500ms?
  * [ ] Is chat history bounded to max 100 messages in memory?
* **Developer Notes:** Press `Tab` in the TUI to toggle focus between AI stream view and Chat panel.
* **Release Notes:** Added out-of-band side-chat panel and real-time team presence tracking.

---

## Milestone 5: Gemini CLI Driver Integration & Stdio Interception

### Goal
Implement the production-grade `GeminiCLIAdapter` wrapper to spawn local Gemini CLI subprocesses, intercept stdio streams, and handle prompt injection safely.

* **Features:** Gemini CLI process spawner, stdio pipe parser, prompt injection wrapper, local process lifecycle manager.
* **Tasks:**
  1. Create `@collagility/driver-gemini` package implementing `IAgentDriver`.
  2. Implement process spawner using Node.js `child_process.spawn` targeting local `gemini` executable.
  3. Parse raw Gemini CLI stdout/stderr into structured `AgentEventFrame` objects.
  4. Build prompt submission queue supporting context file injection.
* **Dependencies:** Milestone 3 (`@collagility/cli`), Milestone 1 (`packages/drivers`).
* **Estimated Time:** 2 Weeks (50 Engineering Hours).
* **Difficulty:** Advanced.
* **Testing Strategy:** Mock stdio stream unit tests simulating Gemini CLI response outputs; local CLI integration tests with active Gemini API keys.
* **Deliverables:** Fully functional `GeminiCLIAdapter` driving local Gemini CLI binaries.
* **Recommended GitHub Issues:**
  * `#13`: Implement `IAgentDriver` interface in `@collagility/drivers`.
  * `#14`: Build Gemini CLI process spawner and stdio stream interceptor.
  * `#15`: Create stdout parser translating ANSI text into structured event chunks.
* **Recommended Pull Requests:**
  * `PR #9`: `feat(drivers): IAgentDriver interface and process spawner`
  * `PR #10`: `feat(driver-gemini): gemini CLI stdio adapter and streaming parser`
* **Recommended Folder Structure:**
  ```
  plugins/driver-gemini/
  ├── src/
  │   ├── GeminiAdapter.ts
  │   ├── StdioParser.ts
  │   └── GeminiProcessManager.ts
  └── package.json
  ```
* **Acceptance Criteria:**
  * Host CLI successfully spawns local `gemini` subprocess upon session launch.
  * Prompts entered in host CLI are passed to Gemini CLI stdin; responses are captured cleanly.
* **Engineering Risks:** Process unhandled exception crashes on Host machine if Gemini CLI binary exits unexpectedly.
* **Code Review Checklist:**
  * [ ] Are `SIGINT` and `SIGTERM` signals forwarded gracefully to the Gemini subprocess?
  * [ ] Is `stderr` output isolated from standard AI response tokens?
* **Developer Notes:** Ensure `gemini` binary is installed and authenticated in local PATH before testing.
* **Release Notes:** Integrated Gemini CLI local agent driver adapter.

---

## Milestone 6: Real-Time AI Response Token Streaming

### Goal
Multiplex live AI response tokens, reasoning steps, and tool execution statuses from the host machine to all connected participant terminals in real time.

* **Features:** Sub-50ms token chunk streaming, syntax-highlighted diff rendering, reasoning step indicator, stream completion status.
* **Tasks:**
  1. Implement `ai.stream.chunk` and `ai.stream.end` WebSocket event handlers on Server and CLI.
  2. Wire `GeminiCLIAdapter` token emission to Host CLI WebSocket emitter.
  3. Build Ink `StreamView` component with syntax-highlighted markdown and diff rendering.
  4. Implement client stream delta buffer and sequence ordering logic.
* **Dependencies:** Milestone 5 (`GeminiCLIAdapter`), Milestone 2 (`Fastify Server`).
* **Estimated Time:** 1.5 Weeks (40 Engineering Hours).
* **Difficulty:** Advanced.
* **Testing Strategy:** Multi-terminal streaming test verifying live token output rendering across 5 participant clients simultaneously.
* **Deliverables:** End-to-end token streaming pipeline rendering live AI output across all session terminals.
* **Recommended GitHub Issues:**
  * `#16`: Implement streaming event schemas and delta chunk encoders.
  * `#17`: Build live Ink markdown/diff renderer component.
  * `#18`: Wire host stdout stream to WebSocket fanout pipeline.
* **Recommended Pull Requests:**
  * `PR #11`: `feat(protocol): stream chunk schemas and sequence ordering`
  * `PR #12`: `feat(cli): live TUI stream view with syntax-highlighted diffs`
* **Recommended Folder Structure:**
  ```
  apps/cli/src/ui/components/
  ├── StreamView.tsx
  ├── MarkdownRenderer.tsx
  └── DiffViewer.tsx
  ```
* **Acceptance Criteria:**
  * Token stream generated on Host renders on Participant terminal within 50ms.
  * Code diffs generated by Gemini render with green/red syntax highlighting across all terminals.
* **Engineering Risks:** High-frequency token streaming overloading React/Ink render loop.
* **Code Review Checklist:**
  * [ ] Are TUI render updates throttled to max 30 FPS to prevent terminal flickering?
  * [ ] Is string delta concatenation memory-efficient?
* **Developer Notes:** Use `ai.stream.chunk` delta encoding rather than full string payload buffers.
* **Release Notes:** Enabled real-time token streaming and live diff rendering across all connected terminals.

---

## 7. Milestone 7: Role-Based Permissions & Co-Prompting Workflow

### Goal
Implement granular host-governed permission controls (Co-Driver vs. Observer) and interactive co-prompting suggestion workflows.

* **Features:** Role permission guard, co-prompt submission, host TUI prompt approval modal, driver handoff mechanism.
* **Tasks:**
  1. Implement server-side ReBAC role checks blocking Observers from emitting prompt requests.
  2. Create `ai.request.suggest_prompt` protocol flow.
  3. Build Ink `PromptApprovalModal` component on Host TUI to accept/reject peer prompts.
  4. Implement `collaboration.driver.yield` driver privilege handoff.
* **Dependencies:** Milestone 6 (Streaming), Milestone 4 (Presence).
* **Estimated Time:** 1.5 Weeks (40 Engineering Hours).
* **Difficulty:** Advanced.
* **Testing Strategy:** Role permission unit tests verifying Observer block; E2E co-prompt submission and host approval loop.
* **Deliverables:** Role-enforced multiplayer session control with host approval gates.
* **Recommended GitHub Issues:**
  * `#19`: Implement server role guards for Co-Driver vs Observer.
  * `#20`: Build Host TUI interactive prompt approval modal.
  * `#21`: Implement driver handoff protocol events.
* **Recommended Pull Requests:**
  * `PR #13`: `feat(server): RBAC role enforcement guards`
  * `PR #14`: `feat(cli): prompt suggestion approval modal & driver handoff`
* **Recommended Folder Structure:**
  ```
  apps/cli/src/ui/modals/
  ├── PromptApprovalModal.tsx
  └── RoleManagementModal.tsx
  ```
* **Acceptance Criteria:**
  * Observers attempting to send prompts receive `error.permission_denied`.
  * Co-Driver prompt suggestions appear as interactive modal on Host TUI; Host approval triggers local AI execution.
* **Engineering Risks:** Deadlocks if Host leaves approval modal hanging indefinitely.
* **Code Review Checklist:**
  * [ ] Do prompt suggestions time out after 60 seconds of Host inactivity?
  * [ ] Does the Host retain single-button override power to cancel any peer action?
* **Developer Notes:** Test role transitions dynamically during live streaming.
* **Release Notes:** Introduced Co-Driver prompt suggestions, Host approval modals, and role-based permissions.

---

## Milestone 8: Robustness, Offline Recovery & Polish

### Goal
Harden platform resilience against transient network drops, implement sequence buffer replay, optimize TUI ergonomics, and eliminate memory leaks.

* **Features:** Exponential backoff auto-reconnect, missing frame sequence replay buffer, graceful session degradation, session link clipboard copy.
* **Tasks:**
  1. Implement client-side auto-reconnection with 30s grace window (`auth.reconnect`).
  2. Implement circular replay ring-buffer in server `RoomManager` for gap-fill recovery (`lastSeq`).
  3. Add systemic keyboard shortcuts (`Ctrl+C` graceful exit, `Ctrl+L` clear buffer, `Tab` pane switch).
  4. Conduct memory profile audit across 8-hour continuous streaming sessions.
* **Dependencies:** Milestone 7 (Permissions), Milestone 2 (Server).
* **Estimated Time:** 1.5 Weeks (40 Engineering Hours).
* **Difficulty:** Advanced.
* **Testing Strategy:** Network drop simulation tests (killing client Wi-Fi mid-stream and verifying recovery); leak checks with Node.js `--inspect`.
* **Deliverables:** Rock-solid, fault-tolerant CLI and server ecosystem ready for public demonstration.
* **Recommended GitHub Issues:**
  * `#22`: Implement auto-reconnection and event sequence gap-fill recovery.
  * `#23`: Add TUI keyboard shortcut helpers and clipboard utilities.
  * `#24`: Conduct memory profiling and fix socket leak paths.
* **Recommended Pull Requests:**
  * `PR #15`: `fix(client): exponential backoff auto-reconnect & sequence replay`
  * `PR #16`: `ux(cli): ergonomic keybindings, screen clearing, and clipboard support`
* **Recommended Folder Structure:**
  ```
  packages/client-sdk/src/
  ├── ReconnectController.ts
  └── ReplayBuffer.ts
  ```
* **Acceptance Criteria:**
  * Reconnecting a dropped client within 30s recovers all missed stream frames without manual refresh.
  * Zero memory growth observed across 10,000 consecutive simulated stream events.
* **Engineering Risks:** Split-brain state if host and server disconnect simultaneously.
* **Code Review Checklist:**
  * [ ] Is sequence replay capped to maximum 500 frames?
  * [ ] Are terminal raw mode listeners detached cleanly on CLI exit?
* **Developer Notes:** Use `kill -9` on test client processes to verify server-side heartbeat recovery.
* **Release Notes:** Hardened network resilience, added auto-reconnection, and polished TUI ergonomics.

---

## Milestone 9: Open-Source Release & Star-Velocity Launch

### Goal
Prepare public GitHub repository, author comprehensive documentation, produce viral demo media, publish npm packages, and execute launch marketing.

* **Features:** Comprehensive `README.md`, animated GIF/video demos, GitHub issue templates, contributing guidelines, npm package release.
* **Tasks:**
  1. Write high-impact `README.md` with clear architectural diagrams, tagline, quickstart guide, and feature comparison matrix.
  2. Generate high-quality terminal recording GIFs (vhs / asciinema) demonstrating host-join flow.
  3. Author `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, and GitHub issue/PR templates.
  4. Publish `@collagility/cli` to npm registry.
  5. Post launch announcements to Hacker News, Reddit (`r/programming`, `r/node`), Twitter/X, and AI developer Discord communities.
* **Dependencies:** Milestone 8 (Polish).
* **Estimated Time:** 1 Week (30 Engineering Hours).
* **Difficulty:** Intermediate (Focus on Developer Advocacy & Presentation).
* **Testing Strategy:** Perform clean-machine installation tests (`npm install -g @collagility/cli` on fresh macOS, Ubuntu, and Windows WSL environments).
* **Deliverables:** Public GitHub repository (`collagility/collagility`) configured for maximum community engagement.
* **Recommended GitHub Issues:**
  * `#25`: Draft README.md, architecture diagrams, and quickstart documentation.
  * `#26`: Record terminal GIFs using VHS and optimize media assets.
  * `#27`: Configure npm publishing workflow via Changesets.
* **Recommended Pull Requests:**
  * `PR #17`: `docs(repo): add comprehensive README, media assets, and contributing guides`
  * `PR #18`: `release(npm): configure publish pipeline for @collagility/cli`
* **Recommended Folder Structure:**
  ```
  .github/
  ├── ISSUE_TEMPLATE/
  │   ├── bug_report.md
  │   └── feature_request.md
  ├── PULL_REQUEST_TEMPLATE.md
  └── workflows/
      └── release.yml
  ```
* **Acceptance Criteria:**
  * Running `npx @collagility/cli host` on a fresh machine launches session in under 3 seconds.
  * GitHub repository reaches 1,000+ stars within 48 hours of Hacker News launch.
* **Engineering Risks:** Server infrastructure overwhelmed by unexpected launch traffic spike.
* **Code Review Checklist:**
  * [ ] Are all API endpoints and WebSocket URIs production-ready TLS (`wss://`)?
  * [ ] Are repository security contacts cleanly listed?
* **Developer Notes:** Monitor server metrics via Grafana dashboard during launch hours.
* **Release Notes:** Official open-source launch of Collagility v0.1.0 on GitHub!

---

## Milestone 10: v1.0 Production Launch & Multi-Agent Ecosystem

### Goal
Expand AI provider driver ecosystem (Claude Code, OpenAI Codex), release self-hosted Docker deployment templates, achieve SOC 2 readiness, and publish v1.0.0.

* **Features:** Claude Code driver adapter, OpenAI Codex CLI adapter, one-click self-hosted Docker Compose deployment, SOC 2 audit logs, v1.0 release tag.
* **Tasks:**
  1. Implement `@collagility/driver-claude` and `@collagility/driver-codex` plugins.
  2. Author production Docker Compose and Helm Chart deployment templates for self-hosters.
  3. Implement tamper-evident WORM audit logging for enterprise compliance.
  4. Cut official v1.0.0 release tag and npm release.
* **Dependencies:** Milestone 9 (Open Source Release).
* **Estimated Time:** 3 Weeks (80 Engineering Hours).
* **Difficulty:** Advanced.
* **Testing Strategy:** Multi-agent matrix integration testing verifying seamless switching between Gemini CLI, Claude Code, and Codex.
* **Deliverables:** Production-ready Collagility v1.0.0 platform with multi-agent support.
* **Recommended GitHub Issues:**
  * `#28`: Implement `@collagility/driver-claude` adapter.
  * `#29`: Implement `@collagility/driver-codex` adapter.
  * `#30`: Author production Kubernetes Helm Charts and Docker Compose setups.
* **Recommended Pull Requests:**
  * `PR #19`: `feat(drivers): add Claude Code and OpenAI Codex CLI driver plugins`
  * `PR #20`: `deploy(k8s): add production Helm chart and self-host Docker templates`
* **Recommended Folder Structure:**
  ```
  plugins/
  ├── driver-claude/
  ├── driver-codex/
  deploy/
  ├── docker-compose.prod.yml
  └── helm/collagility/
  ```
* **Acceptance Criteria:**
  * Users can host collaborative sessions targeting Gemini CLI, Claude Code, or Codex via simple flag (`--agent claude`).
  * Self-hosters can deploy relay server infrastructure in under 2 minutes using single `docker-compose up`.
* **Engineering Risks:** Protocol breaking changes when supporting differing agent tool-call event models.
* **Code Review Checklist:**
  * [ ] Do all driver adapters adhere strictly to `IAgentDriver` contract?
  * [ ] Are backward compatibility guarantees enforced across protocol schemas?
* **Developer Notes:** Benchmark WebSocket server node throughput under 20,000 active concurrent connections.
* **Release Notes:** Announced Collagility v1.0.0 General Availability with multi-agent support and production self-hosting templates.

---
