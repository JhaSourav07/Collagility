# RFC-0001: Vision and Requirements Document

**Title:** Collagility — The Multiplayer Workspace for AI Coding Agents  
**Author:** Principal Software Architect  
**Status:** Draft / Proposal  
**Created:** July 2026  
**Target Milestone:** MVP (v0.1.0)  

---

## 1. Executive Summary

Collagility is an open-source, terminal-native multiplayer platform designed to transform solitary CLI-based AI coding sessions into real-time collaborative workspaces. 

Modern AI coding agents (such as Gemini CLI, Claude Code, Aider, and Goose) operate in isolated local developer terminals. When teams need to collaborate on AI-driven architecture, refactoring, or debugging, they are forced into high-friction workarounds: screen sharing, copy-pasting prompts and contexts, or manually synchronizing code changes.

Collagility introduces a peer-collaborative session model where multiple developers join a unified AI coding session directly from their respective terminals. All participants share AI context, live stream responses, out-of-band chat, and presence indicators in real time. 

Critically, Collagility adheres to a zero-trust, local-first execution model: **the AI agent executes strictly on the host developer's machine**. The Collagility relay server acts solely as an event router—it never stores, processes, or communicates with external LLM API providers, nor does it require access to participants' API keys or cloud credentials.

This document outlines the product vision, architecture requirements, functional/non-functional specifications, risk profile, and engineering principles for Collagility from MVP through long-term evolution.

---

## 2. Product Vision

To establish the industry standard protocol and interface for collaborative, multi-developer interaction with local AI coding agents.

Collagility envisions a developer workflow where pair programming and technical mentorship are inherently AI-augmented and fluid. Whether pairing remotely on a complex algorithm, performing live incident response, or conducting interactive code walkthroughs, developers join a shared terminal session where AI acts as a transparent, interactive co-creator accessible to the entire team—without compromising local environment sovereignty or data privacy.

---

## 3. Problem Statement

1. **Isolation of CLI AI Tools:** Contemporary AI coding tools operate in single-tenant local terminal sessions. Only the local user can view prompt assembly, reasoning chains, dynamic file reads, tool executions, and generated outputs.
2. **High Friction in Team Collaboration:** When two or more engineers collaborate using AI, they must rely on passive screen-sharing (Zoom, Tuple, Slack) or manually copy-paste prompts, diffs, and context files across chat applications.
3. **Loss of Interactivity:** Viewers in screen-sharing sessions cannot directly suggest modifications to AI context, issue follow-up prompts, or interact with proposed changes without taking over full machine control.
4. **Security & Credential Sprawl:** Solutions that attempt cloud-hosted collaboration often require uploading repository source code and sharing LLM API keys to central servers, creating severe compliance and data governance risks.
5. **Context & Token Waste:** Multiple developers working on the same problem independently run separate AI sessions, duplicating context indexing and consuming redundant token budgets.

---

## 4. Existing Solutions

| Solution Category | Examples | Primary Mechanism |
| :--- | :--- | :--- |
| **Screen Sharing Tools** | Tuple, Zoom, Slack Huddles, macOS Screen Share | Video stream broadcast of host desktop/terminal. |
| **Terminal Multiplexers / Relays** | `tmate`, `tmux` over SSH, `upterm` | Raw terminal PTY session relay over SSH/WebSockets. |
| **Collaborative Cloud IDEs** | VS Code Live Share, Replit, CodeSandbox | Shared IDE extension/state with centralized/peer edit sync. |
| **Centralized Web AI Chatbots** | ChatGPT Team, Claude Team, Poe | Shared web chat threads with cloud-hosted file context uploads. |

---

## 5. Why Existing Solutions Are Not Enough

* **Screen Sharing is Non-Interactive and Bandwidth-Heavy:** Viewers have passive read-only access. Screen sharing cannot stream structured semantic events (e.g., specific file modifications, discrete AI tool calls, prompt buffers) and consumes significant video bandwidth.
* **Terminal Multiplexers present Severe Security & UX Risks:** `tmate` and shared SSH sessions grant raw shell access to the host machine. Every keystroke is mirrored indiscriminately, allowing remote users to run arbitrary bash commands or overwrite files outside the AI session context. Furthermore, they lack structured understanding of AI agent states, prompt streams, or side-channel communication.
* **Collaborative IDE Extensions are Heavy and GUI-Bound:** VS Code Live Share requires all participants to use full GUI IDE environments. It does not native-multiplex CLI-first workflows or lightweight terminal agents operating in Unix environments.
* **Web-Based AI Tools lack Local Dev Context:** Cloud web chat interfaces cannot access local Git state, uncommitted worktrees, local language servers, test runners, or custom CLI toolchains. They also require delegating proprietary data to cloud storage.

---

## 6. Product Goals

1. **Terminal-Native Multiplayer:** Provide a lightweight CLI tool (`collagility`) that allows developers to host or join shared AI agent sessions directly from any standard ANSI/VT100 terminal emulator.
2. **Zero-Trust AI Host Model:** Guarantee that LLM API calls, credentials, and local agent execution remain 100% on the host machine. The relay server must operate purely as a pub/sub event router.
3. **Real-Time Context & Response Streaming:** Multiplex AI inputs, reasoning steps, tool call invocations, diff proposals, and output streams to all session participants with sub-50ms latency.
4. **Interactive Co-Driver Protocol:** Enable non-host participants to submit prompts, annotate context, and participate in session discussions governed by granular host-controlled permission modes.
5. **Side-Channel Chat & Presence:** Integrated out-of-band participant chat and real-time presence (active users, cursor focus, typing state) directly inside the TUI without corrupting the AI prompt context window.
6. **First-Class Gemini CLI Support:** Deliver a production-grade adapter for Gemini CLI as the launch agent target, backed by an extensible architecture for future agent drivers.

---

## 7. Non Goals

* **Hosting AI Models or Proxying LLM Traffic:** Collagility will **not** host LLM infrastructure, store API keys, or proxy requests to Google AI, Anthropic, OpenAI, or any model vendor.
* **Building a Cloud IDE / Web Editor:** Collagility is not a full web-based code editor or CDE (Cloud Development Environment) replacement.
* **Raw Remote Shell Execution:** Collagility will **not** expose unmonitored host PTY root shells to remote participants. Interactivity is bounded by the AI agent driver protocol.
* **Proprietary SaaS Lock-in:** Collagility will **not** restrict deployment to a proprietary cloud service; the relay server and CLI client must remain 100% open-source and self-hostable.

---

## 8. Target Users

* **Software Engineering Pairs & Squads:** Engineers engaged in daily pair or mob programming using terminal-based AI tools.
* **Open-Source Maintainers & Contributors:** Project leads reviewing PRs or triage sessions collaboratively with community members.
* **Technical Leads & Mentors:** Senior engineers onboarding team members, demonstrating architectural patterns, or guiding junior developers through AI prompt engineering and code generation.
* **DevOps & Incident Response Teams:** SREs and system operators working together in crisis scenarios using AI-assisted diagnostic CLI tools.

---

## 9. User Personas

### Persona A: Sarah (Senior Staff Architect — Session Host / Driver)
* **Role:** Lead Architect on a core infrastructure service.
* **Workflow:** Terminal-first (Neovim/Tmux, Zsh), heavy user of Gemini CLI for rapid refactoring.
* **Needs:** Wants to invite a colleague to review an AI-assisted refactoring session in real time without giving up shell control or copying prompts into Slack.
* **Pain Point:** Frustrated by screen-sharing resolution issues and the inability of peers to contribute directly to the AI prompt stream.

### Persona B: Alex (Mid-Level Engineer — Session Participant / Co-Pilot)
* **Role:** Full-stack engineer pairing with Sarah.
* **Workflow:** Uses standard terminal or VS Code integrated terminal.
* **Needs:** Wants to join Sarah’s active AI coding session instantly via a terminal command (`collagility join <session-id>`), observe the AI’s reasoning chain, suggest prompt adjustments, and ask questions without polluting the Git history or AI context.
* **Pain Point:** Dislikes sitting passively on video calls watching someone else type into a terminal.

### Persona C: Elena (Open-Source Contributor — Session Observer)
* **Role:** Remote open-source contributor.
* **Workflow:** Works across varying time zones with constrained network bandwidth.
* **Needs:** Wants to join live maintainer office-hour sessions to learn codebase conventions by observing AI agent interactions.
* **Pain Point:** High-bandwidth video streams lag severely over low-speed connections.

---

## 10. Primary Use Cases

```
+-----------------------------------------------------------------------+
|                            HOST MACHINE                               |
|                                                                       |
|  +------------------+     +-------------------+    +---------------+  |
|  |   Gemini CLI     | <-> | Collagility Host  | <->| Host Terminal |  |
|  | (Local Agent/Key)|     |   Driver Engine   |    |     (TUI)     |  |
|  +------------------+     +---------+---------+    +---------------+  |
+-------------------------------------|---------------------------------+
                                      | (Event Stream over WS/gRPC)
                                      v
                        +---------------------------+
                        |  Collagility Relay Server |
                        |    (Stateless Router)     |
                        +-------------+-------------+
                                      |
             +------------------------+------------------------+
             | (WebSocket)                                     | (WebSocket)
             v                                                 v
+--------------------------+                      +--------------------------+
|   PARTICIPANT 1 MACHINE  |                      |   PARTICIPANT 2 MACHINE  |
| +----------------------+ |                      | +----------------------+ |
| | Collagility Client   | |                      | | Collagility Client   | |
| |   (Terminal TUI)     | |                      | |   (Terminal TUI)     | |
| +----------------------+ |                      | +----------------------+ |
+--------------------------+                      +--------------------------+
```

1. **Live AI Pair Programming:** Sarah starts a Gemini CLI session via Collagility (`collagility host --agent gemini`). She shares a secure session URI with Alex. Alex joins from his terminal. As Sarah prompts Gemini CLI, Alex watches the context assembly, model response, and code diff render in real time on his terminal.
2. **Co-Prompting & Collaborative Refinement:** Alex spots an edge case in the AI’s proposed plan. Using the participant prompt interface, Alex submits a refined instruction: *"Ensure we handle null pointer cases in the parser."* The host application validates and forwards the prompt to the local Gemini CLI instance running on Sarah's machine.
3. **Out-of-Band Session Chat:** While Gemini CLI is processing a large workspace analysis, Sarah and Alex discuss implementation trade-offs using Collagility's built-in TUI side-chat panel. This chat history remains isolated from the LLM prompt context window.
4. **Host-Governed Driver Handoff:** Sarah shifts to read-only observation mode and yields the prompt driver privilege to Alex, allowing Alex to drive the Gemini CLI session while execution remains grounded on Sarah’s machine.

---

## 11. Functional Requirements

### 11.1 Session Management & Security Protocol
* **FR-1.1 (Session Creation):** The host CLI must be able to spawn a new collaborative session bound to a local AI agent CLI process (initially Gemini CLI).
* **FR-1.2 (Session Join):** Participants must be able to join an active session using a unique, cryptographically random Session ID or connection link (`collagility join <session-id>`).
* **FR-1.3 (Role & Permission Control):** The host must be able to dynamically grant/revoke permissions per participant:
  * *Host / Owner:* Full control over AI execution, session lifecycle, driver privileges, and participant eviction.
  * *Co-Driver (Read/Write):* Permission to submit prompts and suggest context inputs.
  * *Observer (Read-Only):* Permission to view context, AI responses, presence, and chat, but blocked from issuing agent prompts.
* **FR-1.4 (Host Local Isolation):** All LLM API calls, key management, file system access, and command executions generated by the AI agent MUST execute solely on the host OS.

### 11.2 Real-Time Event Synchronization
* **FR-2.1 (Stream Multiplexing):** The system must stream AI agent stdout/stderr, token generation chunks, tool execution statuses, and context updates to all connected participants in real time.
* **FR-2.2 (Context Payload Transparency):** Participants must be able to toggle a view inspect window showing the exact system prompts, file snippets, and conversation history currently injected into the AI agent.
* **FR-2.3 (Diff & File Preview Sync):** Proposed code modifications, file diffs, and staging changes produced by the AI agent must be rendered as synchronized syntax-highlighted diffs across all client terminals.

### 11.3 Presence & Communication
* **FR-3.1 (Participant Presence):** Real-time status bar displaying connected participants, their roles, latency ping, and active focus state.
* **FR-3.2 (Out-of-Band Chat):** A dedicated side-panel TUI chat channel that allows human participants to communicate without altering or dirtying the AI session prompt buffer.
* **FR-3.3 (Typing & Action Indicators):** Visual cues when a participant is drafting a prompt or when the host machine is executing an AI-generated command.

### 11.4 Agent Driver Integration Layer
* **FR-4.1 (Gemini CLI Adapter):** A modular driver wrapper capable of interfacing with Gemini CLI sub-processes via standard I/O pipes and structured JSON/event streams.
* **FR-4.2 (Abstract Driver Interface):** Clean separation of the agent driver interface (`AgentDriver`) to allow rapid onboarding of future agent CLI binaries.

---

## 12. Non-Functional Requirements

### 12.1 Security & Privacy
* **NFR-1.1 (Zero-Knowledge Server):** The relay server must not log, persist, or inspect AI context payloads or prompt contents. Memory buffers must be flushed immediately after packet broadcast.
* **NFR-1.2 (No Server-Side API Keys):** The relay server must operate without requiring, accepting, or storing any vendor API keys (Google AI, Anthropic, OpenAI, etc.).
* **NFR-1.3 (Transport Layer Security):** All network communication between Host, Server, and Participants must be encrypted using TLS 1.3 (WSS / gRPC over TLS).
* **NFR-1.4 (Host Sovereignty):** The host CLI must explicitly enforce confirmation prompts before any local file system write or terminal command execution requested by the AI agent, regardless of participant input.

### 12.2 Performance & Latency
* **NFR-2.1 (Relay Latency):** Relay server event routing latency must be $\le 50\text{ ms}$ (P95) under standard cross-region network conditions.
* **NFR-2.2 (Low Bandwidth Footprint):** Token and diff updates must be streamed using lightweight delta encoding, ensuring seamless operation over mobile hot-spots or constrained connections ($\le 100\text{ KB/s}$ per active session).
* **NFR-2.3 (Resource Overhead):** The client/host CLI binary CPU usage must not exceed 5% of a single core, with a memory footprint $\le 50\text{ MB} \text{ RSS}$.

### 12.3 Reliability & Resilience
* **NFR-3.1 (Auto-Reconnection):** Clients experiencing transient network drops must automatically attempt exponential backoff reconnection and state synchronization within 30 seconds without dropping the session.
* **NFR-3.2 (Graceful Degradation):** If the relay server becomes unreachable, the host’s local AI session must continue running locally without interruption, reverting to a single-player CLI state.

### 12.4 Portability & Compatibility
* **NFR-4.1 (Cross-Platform CLI):** Host and client binaries must compile to static, zero-dependency binaries for Linux (x86_64, arm64), macOS (x86_64, Apple Silicon), and Windows (WSL2/Native PowerShell).
* **NFR-4.2 (Terminal Compatibility):** TUI interface must gracefully render on standard ANSI, VT100, xterm-256color, and TrueColor terminal emulators (Alacritty, iTerm2, Kitty, Windows Terminal, Tmux).

---

## 13. Constraints

* **C-1 (No Cloud Model Dependencies):** The core architecture must not depend on any cloud-side intelligence. If all external networks fail, a host running a local LLM via Gemini CLI / Ollama must be fully functional.
* **C-2 (Terminal Interface Bounds):** The user experience is strictly bounded by terminal user interface (TUI) capabilities. No graphical web browser window is required for host or participant operation in the core MVP.
* **C-3 (Agent Binary Availability):** The host machine must have the target CLI AI agent (e.g., `gemini`) pre-installed and authenticated in its local PATH.

---

## 14. Success Metrics

| Category | Metric | Target (MVP / 6 Months Post-Launch) |
| :--- | :--- | :--- |
| **Performance** | P95 Event Relay Latency | $< 50\text{ ms}$ |
| **Performance** | Time-to-Join Session | $< 2.0\text{ seconds}$ from command execution |
| **Reliability** | Session Disconnect Rate | $< 0.1\%$ per active collaboration hour |
| **Engagement** | Weekly Active Sessions (WAS) | $1,000+$ active multiplayer sessions |
| **Collaboration** | Average Participants / Session | $\ge 2.3$ developers per session |
| **Ecosystem** | Open-Source Contributions | $15+$ community-contributed agent drivers/plugins |

---

## 15. MVP Scope

The initial release (v0.1.0) focuses on establishing a rock-solid, secure, low-latency multiplayer foundation targeting Gemini CLI.

### Included in MVP:
* **Core CLI App (`collagility`):** Single binary supporting both `host` and `join` execution modes.
* **Gemini CLI Adapter Driver:** Native I/O interception, streaming parser, and command hook integration for Gemini CLI.
* **Open-Source Relay Server (`collagility-relay`):** Stateless WebSocket-based pub/sub server binary with Docker support.
* **TUI Multiplayer Interface:**
  * Main AI prompt/response streaming view.
  * Side-channel participant chat panel.
  * Participant presence and status indicator bar.
  * Context payload view modal.
* **Role Management:** Host-controlled permission toggles (Co-Driver vs. Observer).
* **Session Security:** Token-authenticated session URLs and TLS transport encryption.

---

## 16. Future Scope

Post-MVP releases will expand the agent driver ecosystem, security posture, and client options.

### Phase 2: Multi-Agent Driver Expansion
* **Claude Code Adapter:** Native driver integration for Anthropic's Claude Code CLI.
* **Codex CLI & Aider Adapters:** Full streaming sync support for Aider and OpenAI Codex CLI tools.
* **Goose Integration:** Deep hook integration with Block's Goose open-source agent framework.

### Phase 3: Zero-Trust Security & Web Access
* **End-to-End Encryption (E2EE):** Host-generated ephemeral keypair exchange (Noise protocol / WebRTC) ensuring the relay server cannot inspect stream bytes even if compromised.
* **Web Browser Observer Client:** Zero-install WebAssembly/Xterm.js viewer allowing stakeholders to observe sessions via standard web browsers.

### Phase 4: Session Analytics & Replay
* **Session Recording & Playback:** Deterministic event log recording (`.cast` or structured JSON format) for asynchronous code reviews, onboarding tutorials, and audit logs.
* **Multi-Host Workspace Syncing:** Peer-to-peer Git branch synchronization across participants.

---

## 17. Risks and Mitigations

### 17.1 Security: Unintended Remote Execution
* **Risk:** A co-driver submits a prompt that tricks the host's local AI agent into executing destructive terminal commands (`rm -rf`, network calls) on the host machine.
* **Mitigation:** Strict Host sovereignty. The local host binary enforces an interactive host approval step before any AI-generated shell command or file system write is committed locally. Remote participants cannot bypass host approval.

### 17.2 Technical: CLI Agent Protocol Instability
* **Risk:** Third-party CLI tools (Gemini CLI, Claude Code) update their stdout formats or internal flags without notice, breaking driver parsers.
* **Mitigation:** Architect an abstraction layer (`AgentDriver` specification) using structured event interfaces (JSON-lines / IPC hooks where available) rather than brittle regex scraping of raw terminal ANSI sequences.

### 17.3 UX: Terminal Size & Formatting Mismatch
* **Risk:** Participants with different terminal window sizes (e.g., 80x24 vs. 200x60) suffer broken ANSI layouts and text wrapping.
* **Mitigation:** Collagility streams semantic structured data (Markdown text, code diff objects, JSON tool logs) rather than raw PTY screen buffers. Each participant's TUI re-renders the semantic stream locally to fit their native terminal dimensions.

---

## 18. Assumptions

1. **Host Developer Capabilities:** Host developers have standard permissions to run local CLI binaries and establish outbound TLS WebSockets to the relay server.
2. **Network Egress:** Corporate networks permit outbound HTTPS/WSS traffic on port 443 to the Collagility relay or custom self-hosted endpoints.
3. **Local AI Authentication:** The host developer handles their own AI provider login (e.g., `gcloud auth` / `gemini login`) independently prior to launching Collagility.

---

## 19. Engineering Principles

1. **Host Machine Sovereignty:** The host machine is the sole source of truth for code execution, environment state, and AI interaction. Remote clients receive projected representations of this state.
2. **Dumb Server, Smart Clients:** The relay server must remain as simple and stateless as possible. All stream parsing, TUI rendering, state reconciliation, and permission logic belong in the CLI client/host binaries.
3. **Protocol Over Implementation:** Define strict, versioned JSON/gRPC event schemas for session messages, enabling alternative client implementations (TUIs, Web GUIs, IDE plugins) to interoperate seamlessly.
4. **Zero Key Exposure:** API keys, OAuth tokens, and sensitive cloud credentials never leave the host process memory. The network protocol does not contain fields for credentials.
5. **Deterministic Event Streaming:** All session events (prompts, stream chunks, chat messages, presence updates) are monotonically sequence-numbered, enabling auditability and deterministic replay.

---

## 20. Design Philosophy

* **Unapologetically Terminal-Native:** Collagility embraces Unix philosophy. It starts instantly, operates smoothly inside SSH sessions, uses standard keyboard shortcuts (Vim/Emacs navigation), and respects system theme colors.
* **Low-Friction Ergonomics:** Invoking a collaborative session should feel as effortless as running a git command (`collagility host`). Joining should take one copy-pasted line.
* **Transparent AI Operations:** Demystify AI coding by making context windows, file reads, token streaming, and reasoning chains visible to all team members in real time.
* **Respectful Co-Presence:** Participant presence should provide clear situational awareness (who is viewing, who is typing, who is co-driving) without creating visual noise or cluttering the primary code workspace.

---
